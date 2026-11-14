import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { AnalogWorld } from './Planet'

const WORLD_TINTS: Record<AnalogWorld, THREE.Color> = {
  earth: new THREE.Color(1.0, 1.0, 1.0),
  moon: new THREE.Color(0.92, 0.95, 1.04),
  mars: new THREE.Color(1.12, 0.92, 0.86),
}

const SKY_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const SKY_FRAG = /* glsl */ `
  uniform sampler2D uSkyMap;
  uniform vec3 uWorldTint;

  varying vec2 vUv;

  void main() {
    vec3 sky = texture2D(uSkyMap, vUv).rgb;
    // Preserve authentic abyssal space contrast while gently revealing Milky Way dust band
    vec3 graded = pow(max(sky, vec3(0.0)), vec3(0.92)) * 1.28 * uWorldTint;
    gl_FragColor = vec4(graded, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;

  uniform float uTime;
  uniform float uPixelRatio;

  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    vColor = color;
    vTwinkle = 0.86 + 0.14 * sin(uTime * 0.65 + aPhase);

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * uPixelRatio * (18.0 / max(-mvPosition.z, 1.0));
  }
`

const STAR_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    // Clean optical PSF dot (no artificial cross-flare shapes)
    float psf = exp(-d * d * 42.0);
    float alpha = clamp(psf * vTwinkle, 0.0, 1.0);
    gl_FragColor = vec4(vColor, alpha);
  }
`

function seededRandom(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

interface Props {
  world: AnalogWorld
}

export default function SpaceBackground({ world }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<AnalogWorld>(world)

  useEffect(() => {
    worldRef.current = world
  }, [world])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#010204')

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120)
    camera.position.z = 0

    const renderer = new THREE.WebGLRenderer({
      alpha: false,
      antialias: true,
      powerPreference: 'high-performance',
    })
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    renderer.setPixelRatio(pixelRatio)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    mount.appendChild(renderer.domElement)

    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    const skyTex = new THREE.TextureLoader().load('/images/milky-way.jpg')
    skyTex.colorSpace = THREE.SRGBColorSpace
    skyTex.anisotropy = maxAniso

    const currentTint = WORLD_TINTS[worldRef.current].clone()

    const skyGroup = new THREE.Group()
    // Orient real galactic band obliquely across the viewport behind Earth
    skyGroup.rotation.set(0.32, 0.65, -0.46)
    scene.add(skyGroup)

    const skyGeo = new THREE.SphereGeometry(60, 64, 48)
    const skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      uniforms: {
        uSkyMap: { value: skyTex },
        uWorldTint: { value: currentTint },
      },
      side: THREE.BackSide,
      depthWrite: false,
    })
    const skyMesh = new THREE.Mesh(skyGeo, skyMat)
    skyGroup.add(skyMesh)

    // Pinpoint 3D stars for subtle parallax depth and natural star magnitudes
    const starCount = 2400
    const rand = seededRandom(421972)
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)
    const sizes = new Float32Array(starCount)
    const phases = new Float32Array(starCount)

    // Realistic stellar color classes (O/B blue-white, A/F white, G pale yellow, K/M faint warm)
    const spectralColors = [
      new THREE.Color('#cad8ff'),
      new THREE.Color('#eef2ff'),
      new THREE.Color('#fff9f0'),
      new THREE.Color('#ffe9c8'),
      new THREE.Color('#ffd4a8'),
    ]

    for (let i = 0; i < starCount; i++) {
      const u = rand()
      const v = rand()
      const theta = 2 * Math.PI * u
      const phi = Math.acos(2 * v - 1)
      const radius = 16 + rand() * 28

      const i3 = i * 3
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = radius * Math.cos(phi)

      const c = spectralColors[Math.floor(rand() * spectralColors.length)]
      const mag = 0.25 + Math.pow(rand(), 2.6) * 0.75
      colors[i3] = c.r * mag
      colors[i3 + 1] = c.g * mag
      colors[i3 + 2] = c.b * mag

      sizes[i] = 1.4 + Math.pow(rand(), 3.2) * 3.0
      phases[i] = rand() * Math.PI * 2
    }

    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    starGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))

    const starMat = new THREE.ShaderMaterial({
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: pixelRatio },
      },
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const starField = new THREE.Points(starGeo, starMat)
    scene.add(starField)

    const pointerTarget = new THREE.Vector2(0, 0)
    const pointerCurrent = new THREE.Vector2(0, 0)

    const resize = () => {
      const w = Math.max(1, mount.clientWidth)
      const h = Math.max(1, mount.clientHeight)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(mount)
    resize()

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const onPointerMove = (e: PointerEvent) => {
      if (reducedMotion) return
      const w = Math.max(1, window.innerWidth)
      const h = Math.max(1, window.innerHeight)
      pointerTarget.x = (e.clientX / w - 0.5) * 2
      pointerTarget.y = (e.clientY / h - 0.5) * 2
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })

    let prevNow = performance.now()
    let elapsed = 0

    renderer.setAnimationLoop(() => {
      const now = performance.now()
      const dt = Math.min(0.05, Math.max(0, (now - prevNow) / 1000))
      prevNow = now

      if (!reducedMotion) {
        elapsed += dt
        pointerCurrent.lerp(pointerTarget, 1 - Math.exp(-2.8 * dt))
        const sidereal = elapsed * 0.0022
        skyGroup.rotation.y = 0.65 + sidereal
        starField.rotation.y = sidereal * 1.35
        camera.rotation.y = -pointerCurrent.x * 0.028
        camera.rotation.x = -pointerCurrent.y * 0.022
      }

      const targetTint = WORLD_TINTS[worldRef.current]
      currentTint.lerp(targetTint, 1 - Math.exp(-2.5 * Math.max(dt, 0.016)))
      starMat.uniforms.uTime.value = elapsed

      renderer.render(scene, camera)
    })

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      observer.disconnect()
      renderer.setAnimationLoop(null)
      skyGeo.dispose()
      skyMat.dispose()
      skyTex.dispose()
      starGeo.dispose()
      starMat.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={mountRef} className="space-bg" aria-hidden="true" />
}
