import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { planetSpin, SUN_DIRECTION } from './planetMotion'

const EARTH_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const EARTH_FRAG = /* glsl */ `
  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  uniform sampler2D uNormalMap;
  uniform sampler2D uGlossMap;
  uniform sampler2D uCloudMap;
  uniform vec3 uSunDir;
  uniform float uCloudOffset;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  vec3 perturbNormalArb(vec3 surfPos, vec3 surfNorm, vec3 mapN) {
    vec3 q0 = dFdx(surfPos);
    vec3 q1 = dFdy(surfPos);
    vec2 st0 = dFdx(vUv);
    vec2 st1 = dFdy(vUv);

    vec3 N = normalize(surfNorm);
    vec3 q1perp = cross(q1, N);
    vec3 q0perp = cross(N, q0);

    vec3 T = q1perp * st0.x + q0perp * st1.x;
    vec3 B = q1perp * st0.y + q0perp * st1.y;

    float det = max(dot(T, T), dot(B, B));
    float scale = (det == 0.0) ? 0.0 : inversesqrt(det);

    return normalize(T * (mapN.x * scale) + B * (mapN.y * scale) + N * mapN.z);
  }

  void main() {
    vec3 baseN = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 L = normalize(uSunDir);

    vec3 mapN = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
    mapN.xy *= 0.68;
    vec3 N = perturbNormalArb(-vWorldPos, baseN, mapN);

    vec3 dayTex = texture2D(uDayMap, vUv).rgb;
    vec3 nightTex = texture2D(uNightMap, vUv).rgb;
    // In Earth.glb, Earth_Glossiness_6K stores glossiness in G (~0.51 ocean, ~0.04 land)
    float gloss = texture2D(uGlossMap, vUv).g;
    float oceanMask = smoothstep(0.16, 0.44, gloss);

    // Earth_Clouds_6K stores cloud density in RGBA alpha channel
    vec2 cloudShadowUv = vec2(fract(vUv.x - uCloudOffset + 0.0016), clamp(vUv.y - 0.0008, 0.001, 0.999));
    float cloudDensity = texture2D(uCloudMap, cloudShadowUv).a;

    float rawDot = dot(baseN, L);
    float surfDot = dot(N, L);

    // Crisp orbital day-night terminator
    float dayFactor = smoothstep(-0.08, 0.16, rawDot);
    float diffuse = max(surfDot, 0.0);

    // Subtle soft cloud shadows on sunlit terrain and water
    float shadow = 1.0 - cloudDensity * 0.34 * dayFactor;

    // Realistic ocean sunglint
    vec3 H = normalize(L + V);
    float ndoth = max(dot(N, H), 0.0);
    float specBroad = pow(ndoth, mix(18.0, 28.0, gloss)) * 0.24;
    float specTight = pow(ndoth, mix(60.0, 130.0, gloss)) * 0.46;
    float specular = (specBroad + specTight) * oceanMask * dayFactor * (1.0 - cloudDensity * 0.85);
    vec3 specColor = vec3(1.0, 0.97, 0.92) * specular;

    // Subtle earthshine ambient on the dark side
    vec3 nightBase = dayTex * vec3(0.006, 0.010, 0.018);

    // Sunlit Earth albedo
    vec3 dayLit = dayTex * (diffuse * 1.14 + 0.016) * shadow + specColor;

    // Night city illumination strictly masked to the night hemisphere
    float nightMask = smoothstep(0.02, -0.22, rawDot);
    vec3 cityLights = nightTex * vec3(1.28, 0.98, 0.65) * nightMask * (1.0 - cloudDensity * 0.72);

    // Thin Rayleigh blue atmospheric scatter hugging the sunlit horizon
    float ndotv = max(dot(baseN, V), 0.0);
    float rim = pow(1.0 - ndotv, 4.5);
    float sunHorizon = smoothstep(-0.18, 0.42, rawDot);
    vec3 rayleigh = vec3(0.26, 0.56, 0.96) * rim * (0.04 + 0.96 * sunHorizon) * 0.60;

    vec3 color = mix(nightBase, dayLit, dayFactor) + cityLights + rayleigh;

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const CLOUD_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const CLOUD_FRAG = /* glsl */ `
  uniform sampler2D uCloudMap;
  uniform vec3 uSunDir;

  varying vec2 vUv;
  varying vec3 vWorldNormal;

  void main() {
    float alpha = texture2D(uCloudMap, vUv).a;
    if (alpha < 0.005) discard;

    vec3 N = normalize(vWorldNormal);
    vec3 L = normalize(uSunDir);
    float ndotl = dot(N, L);

    float lit = smoothstep(-0.10, 0.24, ndotl);
    vec3 dayCloud = vec3(0.98, 0.99, 1.0) * (0.26 + 0.80 * max(ndotl, 0.0));
    vec3 nightCloud = vec3(0.010, 0.016, 0.028);

    vec3 color = mix(nightCloud, dayCloud, lit);
    float finalAlpha = alpha * mix(0.22, 0.94, lit);

    gl_FragColor = vec4(color, finalAlpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const ATMO_VERT = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const ATMO_FRAG = /* glsl */ `
  uniform vec3 uSunDir;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 L = normalize(uSunDir);

    float viewEdge = clamp(0.68 - dot(N, -V), 0.0, 1.0);
    float rim = pow(viewEdge, 5.2);
    float sunSide = smoothstep(-0.22, 0.45, dot(N, L));

    vec3 color = vec3(0.32, 0.64, 1.0);
    float intensity = rim * (0.04 + 0.96 * sunSide) * 0.92;
    gl_FragColor = vec4(color * intensity, intensity);
  }
`

interface EarthGlobeProps {
  onReady?: () => void
}

export default function EarthGlobe({ onReady }: EarthGlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let disposed = false

    const scene = new THREE.Scene()
    // Calibrated so normalized radius 0.972 fills ~96.8% of the circular stage
    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 20)
    camera.position.z = 4.46

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      })
    } catch {
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.06
    renderer.domElement.style.opacity = '0'
    renderer.domElement.style.transition = 'opacity 0.6s ease'
    mount.appendChild(renderer.domElement)

    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    const sunDir = new THREE.Vector3(SUN_DIRECTION[0], SUN_DIRECTION[1], SUN_DIRECTION[2]).normalize()

    const tiltGroup = new THREE.Group()
    tiltGroup.rotation.z = -0.22
    tiltGroup.rotation.x = 0.16
    scene.add(tiltGroup)

    const atmoGeo = new THREE.SphereGeometry(1.006, 96, 64)
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: ATMO_VERT,
      fragmentShader: ATMO_FRAG,
      uniforms: { uSunDir: { value: sunDir } },
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat)
    scene.add(atmoMesh)

    let earthMesh: THREE.Mesh | null = null
    let cloudMesh: THREE.Mesh | null = null
    let earthMat: THREE.ShaderMaterial | null = null
    let cloudMat: THREE.ShaderMaterial | null = null
    let globeVisible = false
    let validationFrames = 0
    const centerPixel = new Uint8Array(4)
    const disposableGeometries: THREE.BufferGeometry[] = [atmoGeo]
    const disposableMaterials: THREE.Material[] = [atmoMat]
    const disposableTextures: THREE.Texture[] = []

    const loader = new GLTFLoader()
    loader.load('/Earth.glb', gltf => {
      const root = gltf.scene
      const loadedEarth = root.getObjectByName('Earth') as THREE.Mesh | undefined
      const loadedCloud = root.getObjectByName('Sky') as THREE.Mesh | undefined

      const collectAllResources = () => {
        root.traverse(obj => {
          if (obj instanceof THREE.Mesh) {
            disposableGeometries.push(obj.geometry)
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
            for (const m of mats) {
              if (!m) continue
              disposableMaterials.push(m)
              for (const val of Object.values(m)) {
                if (val instanceof THREE.Texture) disposableTextures.push(val)
              }
            }
          }
        })
      }
      collectAllResources()

      if (disposed || !loadedEarth || !loadedCloud) {
        for (const g of disposableGeometries) g.dispose()
        for (const m of disposableMaterials) m.dispose()
        for (const t of disposableTextures) t.dispose()
        return
      }

      const rawEarthMat = loadedEarth.material as THREE.MeshStandardMaterial
      const rawCloudMat = loadedCloud.material as THREE.MeshStandardMaterial

      const prepTex = (tex: THREE.Texture | null, colorSpace: THREE.ColorSpace) => {
        if (!tex) return null
        tex.colorSpace = colorSpace
        tex.anisotropy = maxAniso
        tex.wrapS = THREE.RepeatWrapping
        tex.needsUpdate = true
        return tex
      }

      const dayTex = prepTex(rawEarthMat.map, THREE.SRGBColorSpace)
      const nightTex = prepTex(rawEarthMat.emissiveMap, THREE.SRGBColorSpace)
      const normalTex = prepTex(rawEarthMat.normalMap, THREE.NoColorSpace)
      const glossTex = prepTex(rawEarthMat.roughnessMap, THREE.NoColorSpace)
      const cloudTex = prepTex(rawCloudMat.map, THREE.SRGBColorSpace)

      // Center Earth node and normalize mesh radius (~1.59155) to 0.972
      loadedEarth.geometry.computeBoundingSphere()
      const rawRadius = loadedEarth.geometry.boundingSphere?.radius || 1.59155
      const normScale = 0.972 / rawRadius

      earthMat = new THREE.ShaderMaterial({
        vertexShader: EARTH_VERT,
        fragmentShader: EARTH_FRAG,
        uniforms: {
          uDayMap: { value: dayTex },
          uNightMap: { value: nightTex },
          uNormalMap: { value: normalTex },
          uGlossMap: { value: glossTex },
          uCloudMap: { value: cloudTex },
          uSunDir: { value: sunDir },
          uCloudOffset: { value: 0 },
        },
      })

      cloudMat = new THREE.ShaderMaterial({
        vertexShader: CLOUD_VERT,
        fragmentShader: CLOUD_FRAG,
        uniforms: { uCloudMap: { value: cloudTex }, uSunDir: { value: sunDir } },
        transparent: true,
        depthWrite: false,
      })

      earthMesh = new THREE.Mesh(loadedEarth.geometry, earthMat)
      earthMesh.scale.setScalar(normScale)
      tiltGroup.add(earthMesh)

      // Cloud mesh sits independently at 1.008x Earth radius so it can drift slightly ahead
      cloudMesh = new THREE.Mesh(loadedCloud.geometry, cloudMat)
      cloudMesh.scale.setScalar(normScale * 1.008)
      tiltGroup.add(cloudMesh)

      disposableMaterials.push(earthMat, cloudMat)
    }, undefined, () => {
      // Leave the Earth photograph visible if the model cannot load.
    })

    const resize = () => {
      const size = Math.max(1, mount.clientWidth)
      renderer.setSize(size, size, false)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(mount)
    resize()

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const baseSpinOffset = -0.4

    renderer.setAnimationLoop(() => {
      const spin = planetSpin(performance.now(), reducedMotion)
      if (earthMesh && cloudMesh && earthMat) {
        earthMesh.rotation.y = baseSpinOffset + spin
        cloudMesh.rotation.y = baseSpinOffset + spin * 1.15
        earthMat.uniforms.uCloudOffset.value = (spin * 0.15) / (Math.PI * 2)
      }
      renderer.render(scene, camera)
      if (earthMesh && !globeVisible && validationFrames++ < 12) {
        const gl = renderer.getContext()
        gl.readPixels(renderer.domElement.width >> 1, renderer.domElement.height >> 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, centerPixel)
        if (centerPixel[0] + centerPixel[1] + centerPixel[2] > 16) {
          globeVisible = true
          renderer.domElement.style.opacity = '1'
          onReadyRef.current?.()
        }
      }
    })

    return () => {
      disposed = true
      observer.disconnect()
      renderer.setAnimationLoop(null)
      for (const g of disposableGeometries) g.dispose()
      for (const m of disposableMaterials) m.dispose()
      for (const t of disposableTextures) t.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={mountRef} className="earth-globe" aria-hidden="true" />
}
