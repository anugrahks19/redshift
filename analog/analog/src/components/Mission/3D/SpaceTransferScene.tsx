import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface SpaceTransferSceneProps {
  mode: 'prologue' | 'transfer';
  transferProgress?: number; // 0..1 (from Earth departure to Mars arrival)
  destination?: 'mars' | 'moon';
}

// Deterministic pseudo-random helper (ESLint purity safe)
function hash2(x: number, y: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return h - Math.floor(h);
}

function noise2(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, octaves = 5): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * noise2(x * freq, y * freq);
    freq *= 2.02;
    amp *= 0.5;
  }
  return val;
}

const ATMOSPHERE_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const ATMOSPHERE_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    // BackSide outer shell: -vNormal points inward; d=0 at outer halo limb (must fade to 0),
    // d~0.37 at planet limb (peak scatter glow), occluded by opaque planet disk.
    float d = max(0.0, dot(-normalize(vNormal), normalize(vViewDir)));
    float limb = smoothstep(0.01, 0.36, d);
    float glow = pow(limb, uPower) * uIntensity;
    gl_FragColor = vec4(uColor, clamp(glow, 0.0, 0.72));
  }
`;

export const SpaceTransferScene: React.FC<SpaceTransferSceneProps> = ({
  mode,
  transferProgress = 0.5,
  destination = 'mars',
}) => {
  const earthGroupRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const marsRef = useRef<THREE.Mesh>(null);
  const cruiseStageRef = useRef<THREE.Group>(null);
  const starFieldRef = useRef<THREE.Points>(null);

  // Reusable scratch vectors (avoid allocations inside useFrame)
  const scratchPos = useRef(new THREE.Vector3());
  const scratchTan = useRef(new THREE.Vector3());
  const forwardAxis = useRef(new THREE.Vector3(0, 0, 1));

  // 1. Procedural High-Detail Earth & Mars Textures
  const textures = useMemo(() => {
    const w = 512;
    const h = 256;

    // Earth Albedo + Specular/Clouds
    const eColor = new Uint8Array(w * h * 4);
    const eCloud = new Uint8Array(w * h * 4);
    // Mars Albedo + Bump
    const mColor = new Uint8Array(w * h * 4);
    const mBump = new Uint8Array(w * h * 4);

    for (let y = 0; y < h; y++) {
      const v = y / h;
      const lat = (0.5 - v) * Math.PI;
      const absLat = Math.abs(Math.sin(lat));

      for (let x = 0; x < w; x++) {
        const u = x / w;
        const lon = u * Math.PI * 2;
        // Seamless horizontal wrapping projection in noise space
        const nx = Math.cos(lon) * Math.cos(lat) * 2.2 + 4.5;
        const ny = Math.sin(lon) * Math.cos(lat) * 2.2 + 4.5;
        const nz = Math.sin(lat) * 2.2 + 2.1;

        const idx = (y * w + x) * 4;

        // --- Earth Continents & Oceans ---
        const cont = fbm(nx + nz * 0.4, ny + nz * 0.6, 5);
        const polarIce = absLat > 0.87 + (cont - 0.5) * 0.08;
        if (polarIce) {
          eColor[idx] = 235;
          eColor[idx + 1] = 244;
          eColor[idx + 2] = 252;
        } else if (cont > 0.51) {
          // Land: arid ochre / mountain / temperate green
          const arid = fbm(nx * 2.1 + 8.3, ny * 2.1 - 3.1, 4);
          const elev = Math.min(1, (cont - 0.51) * 3.8);
          if (arid > 0.54 && absLat < 0.55) {
            // Desert belt (Atacama/Sahara ochre)
            eColor[idx] = Math.round(168 + elev * 38);
            eColor[idx + 1] = Math.round(138 + elev * 28);
            eColor[idx + 2] = Math.round(98 + elev * 20);
          } else {
            eColor[idx] = Math.round(42 + elev * 75);
            eColor[idx + 1] = Math.round(86 + elev * 60);
            eColor[idx + 2] = Math.round(52 + elev * 45);
          }
        } else {
          // Deep ocean to continental shelf
          const depth = Math.max(0, (0.51 - cont) * 3.0);
          eColor[idx] = Math.round(12 + (1 - depth) * 24);
          eColor[idx + 1] = Math.round(38 + (1 - depth) * 52);
          eColor[idx + 2] = Math.round(82 + (1 - depth) * 76);
        }
        eColor[idx + 3] = 255;

        // Earth Clouds
        const cl = fbm(nx * 1.9 + 14.2, ny * 1.9 + nz * 1.4, 4);
        const cloudAlpha = cl > 0.52 ? Math.min(220, Math.round((cl - 0.52) * 620)) : 0;
        eCloud[idx] = 242;
        eCloud[idx + 1] = 248;
        eCloud[idx + 2] = 255;
        eCloud[idx + 3] = cloudAlpha;

        // --- Mars Albedo & Topography ---
        const mVal = fbm(nx * 1.6 + 21.7, ny * 1.6 + nz * 1.3, 5);
        const mFine = fbm(nx * 5.2 - 4.1, ny * 5.2 + nz * 3.7, 3);
        const marsPolar = absLat > 0.91 + (mVal - 0.5) * 0.05;
        if (marsPolar) {
          mColor[idx] = 240;
          mColor[idx + 1] = 236;
          mColor[idx + 2] = 230;
        } else {
          // Rust highlands vs dark basalt plains (Syrtis/Gale)
          const darkMask = Math.max(0, Math.min(1, (mVal - 0.34) * 2.2));
          mColor[idx] = Math.round(92 + darkMask * 112 + mFine * 24);
          mColor[idx + 1] = Math.round(38 + darkMask * 58 + mFine * 14);
          mColor[idx + 2] = Math.round(24 + darkMask * 32 + mFine * 10);
        }
        mColor[idx + 3] = 255;

        const bumpV = Math.round(Math.min(1, Math.max(0, mVal * 0.75 + mFine * 0.25)) * 255);
        mBump[idx] = bumpV;
        mBump[idx + 1] = bumpV;
        mBump[idx + 2] = bumpV;
        mBump[idx + 3] = 255;
      }
    }

    const earthTex = new THREE.DataTexture(eColor, w, h, THREE.RGBAFormat);
    earthTex.colorSpace = THREE.SRGBColorSpace;
    earthTex.wrapS = THREE.RepeatWrapping;
    earthTex.magFilter = THREE.LinearFilter;
    earthTex.minFilter = THREE.LinearFilter;
    earthTex.needsUpdate = true;

    const cloudTex = new THREE.DataTexture(eCloud, w, h, THREE.RGBAFormat);
    cloudTex.colorSpace = THREE.SRGBColorSpace;
    cloudTex.wrapS = THREE.RepeatWrapping;
    cloudTex.magFilter = THREE.LinearFilter;
    cloudTex.minFilter = THREE.LinearFilter;
    cloudTex.needsUpdate = true;

    const marsTex = new THREE.DataTexture(mColor, w, h, THREE.RGBAFormat);
    marsTex.colorSpace = THREE.SRGBColorSpace;
    marsTex.wrapS = THREE.RepeatWrapping;
    marsTex.magFilter = THREE.LinearFilter;
    marsTex.minFilter = THREE.LinearFilter;
    marsTex.needsUpdate = true;

    const marsBump = new THREE.DataTexture(mBump, w, h, THREE.RGBAFormat);
    marsBump.wrapS = THREE.RepeatWrapping;
    marsBump.magFilter = THREE.LinearFilter;
    marsBump.minFilter = THREE.LinearFilter;
    marsBump.needsUpdate = true;

    return { earthTex, cloudTex, marsTex, marsBump };
  }, []);

  // ShaderMaterials for Earth & Mars atmospheric Fresnel limb scattering
  const { earthAtmoMat, marsAtmoMat } = useMemo(() => {
    const eMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color('#47B8FF') },
        uPower: { value: 2.2 },
        uIntensity: { value: 0.72 },
      },
      vertexShader: ATMOSPHERE_VERTEX,
      fragmentShader: ATMOSPHERE_FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });

    const mMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color('#EA7D4B') },
        uPower: { value: 2.4 },
        uIntensity: { value: 0.62 },
      },
      vertexShader: ATMOSPHERE_VERTEX,
      fragmentShader: ATMOSPHERE_FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });

    return { earthAtmoMat: eMat, marsAtmoMat: mMat };
  }, []);

  // 2. Orbital Trajectory Spline (Hohmann Transfer Arc)
  const { trajectoryGeometry, curve } = useMemo(() => {
    const p0 = new THREE.Vector3(-12, 0, 8);
    const p1 = new THREE.Vector3(-2, 3.2, 4);
    const p2 = new THREE.Vector3(7, 2.1, -3);
    const p3 = new THREE.Vector3(14, 0, -10);

    const c = new THREE.CatmullRomCurve3([p0, p1, p2, p3]);
    const pts = c.getPoints(96);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    return { trajectoryGeometry: geo, curve: c };
  }, []);

  const trajectoryLineMat = useMemo(
    () =>
      new THREE.LineDashedMaterial({
        color: '#38BDF8',
        dashSize: 0.55,
        gapSize: 0.25,
        transparent: true,
        opacity: 0.85,
      }),
    []
  );

  // 3. Multi-Spectral Starfield with Vertex Colors
  const { starsPositions, starsColors } = useMemo(() => {
    const starCount = 1800;
    const pos = new Float32Array(starCount * 3);
    const col = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const u = hash2(i, 1.37);
      const v = hash2(i, 7.91);
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 85 + hash2(i, 19.4) * 35;
      pos[i3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i3 + 2] = r * Math.cos(phi);

      const temp = hash2(i, 31.7);
      if (temp > 0.78) {
        // Cool blue-white O/B star
        col[i3] = 0.78;
        col[i3 + 1] = 0.88;
        col[i3 + 2] = 1.0;
      } else if (temp < 0.22) {
        // Warm amber K star
        col[i3] = 1.0;
        col[i3 + 1] = 0.84;
        col[i3 + 2] = 0.65;
      } else {
        // Crisp ivory white star
        const lum = 0.72 + temp * 0.28;
        col[i3] = lum;
        col[i3 + 1] = lum;
        col[i3 + 2] = lum;
      }
    }
    return { starsPositions: pos, starsColors: col };
  }, []);

  // Explicit GPU Disposal on unmount (per threejs-animation SKILL.md)
  useEffect(() => {
    return () => {
      textures.earthTex.dispose();
      textures.cloudTex.dispose();
      textures.marsTex.dispose();
      textures.marsBump.dispose();
      earthAtmoMat.dispose();
      marsAtmoMat.dispose();
      trajectoryGeometry.dispose();
      trajectoryLineMat.dispose();
    };
  }, [textures, earthAtmoMat, marsAtmoMat, trajectoryGeometry, trajectoryLineMat]);

  useFrame((_, delta) => {
    if (earthGroupRef.current) {
      earthGroupRef.current.rotation.y += delta * 0.055;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.025;
    }
    if (marsRef.current) {
      marsRef.current.rotation.y += delta * 0.06;
    }

    if (cruiseStageRef.current && curve) {
      const t = THREE.MathUtils.clamp(transferProgress, 0.02, 0.98);
      curve.getPointAt(t, scratchPos.current);
      curve.getTangentAt(t, scratchTan.current);

      cruiseStageRef.current.position.copy(scratchPos.current);
      cruiseStageRef.current.quaternion.setFromUnitVectors(forwardAxis.current, scratchTan.current);
      cruiseStageRef.current.rotateZ(delta * 0.35);
    }

    if (starFieldRef.current) {
      starFieldRef.current.rotation.y += delta * 0.003;
    }
  });

  const earthScale = mode === 'prologue' ? 4.45 : 2.4;

  return (
    <group>
      <ambientLight intensity={0.14} />
      <directionalLight position={[-35, 16, 25]} intensity={2.9} color="#FFF8E7" />
      <directionalLight position={[20, -10, -15]} intensity={0.22} color="#60A5FA" />

      {/* Distant Sun Core + Corona Halo */}
      <group position={[-45, 20, 32]}>
        <mesh>
          <sphereGeometry args={[2.1, 20, 20]} />
          <meshBasicMaterial color="#FFFBEB" />
        </mesh>
        <mesh>
          <sphereGeometry args={[3.8, 20, 20]} />
          <meshBasicMaterial color="#FDE68A" transparent opacity={0.18} />
        </mesh>
      </group>

      {/* Multi-Spectral Starfield */}
      <points ref={starFieldRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starsPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[starsColors, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.55} vertexColors transparent opacity={0.92} sizeAttenuation />
      </points>

      {/* Earth Departure Globe + Clouds + GLSL Fresnel Atmosphere */}
      <group position={mode === 'prologue' ? [0, -0.15, 0] : [-12, 0, 8]}>
        <group ref={earthGroupRef} rotation={[0.25, -1.2, 0.1]}>
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[earthScale, 64, 48]} />
            <meshStandardMaterial
              map={textures.earthTex}
              roughness={0.55}
              metalness={0.08}
            />
          </mesh>
          <mesh ref={cloudsRef}>
            <sphereGeometry args={[earthScale * 1.012, 64, 48]} />
            <meshStandardMaterial
              map={textures.cloudTex}
              transparent
              opacity={0.78}
              roughness={0.9}
              depthWrite={false}
            />
          </mesh>
        </group>

        {/* GLSL Atmospheric Limb Glow */}
        <mesh material={earthAtmoMat}>
          <sphereGeometry args={[earthScale * 1.08, 48, 36]} />
        </mesh>

        {/* Orbital Telemetry Ring in Prologue */}
        {mode === 'prologue' && (
          <mesh rotation={[Math.PI / 2.25, 0.18, 0]}>
            <torusGeometry args={[earthScale * 1.24, 0.014, 12, 120]} />
            <meshBasicMaterial color="#38BDF8" transparent opacity={0.35} />
          </mesh>
        )}
      </group>

      {/* Transfer Trajectory Curve */}
      {mode === 'transfer' && (
        <primitive
          object={new THREE.Line(trajectoryGeometry, trajectoryLineMat)}
          onUpdate={(self: THREE.Line) => self.computeLineDistances()}
        />
      )}

      {/* Interplanetary Cruise Stage (Gold MLI + Solar Wings + Aeroshell) */}
      {mode === 'transfer' && (
        <group ref={cruiseStageRef}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.45, 0.34, 24]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.85} roughness={0.22} />
          </mesh>
          <mesh position={[0, 0, -0.2]}>
            <cylinderGeometry args={[0.45, 0.45, 0.14, 24]} />
            <meshStandardMaterial color="#C59B43" metalness={0.8} roughness={0.25} />
          </mesh>
          <mesh position={[-0.78, 0, -0.2]}>
            <boxGeometry args={[0.62, 0.02, 0.3]} />
            <meshStandardMaterial color="#173459" metalness={0.85} roughness={0.18} />
          </mesh>
          <mesh position={[0.78, 0, -0.2]}>
            <boxGeometry args={[0.62, 0.02, 0.3]} />
            <meshStandardMaterial color="#173459" metalness={0.85} roughness={0.18} />
          </mesh>
          <mesh position={[0, 0, -0.3]}>
            <cylinderGeometry args={[0.09, 0.13, 0.12, 16]} />
            <meshStandardMaterial color="#E2E8F0" metalness={0.95} roughness={0.12} />
          </mesh>
          <pointLight position={[0, 0, -0.45]} color="#38BDF8" intensity={1.1} distance={2.5} />
        </group>
      )}

      {/* Arrival Planet (Mars or Moon) with Procedural Albedo + GLSL Atmosphere */}
      {mode === 'transfer' && (
        <group position={[14, 0, -10]}>
          <mesh ref={marsRef}>
            <sphereGeometry args={[destination === 'moon' ? 1.45 : 1.95, 64, 48]} />
            <meshStandardMaterial
              map={textures.marsTex}
              bumpMap={textures.marsBump}
              bumpScale={0.045}
              color={destination === 'moon' ? '#A3A8B0' : '#FFFFFF'}
              roughness={0.84}
              metalness={0.06}
            />
          </mesh>
          {destination !== 'moon' && (
            <mesh material={marsAtmoMat}>
              <sphereGeometry args={[2.09, 48, 36]} />
            </mesh>
          )}
        </group>
      )}
    </group>
  );
};
