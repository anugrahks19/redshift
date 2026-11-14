import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_TARGETS, MARS_TARGETS } from '../../../data/missionData';
import type { SimulationWaypoint } from '../../../types/mission';

export interface Terrain3DProps {
  environment: 'earth' | 'mars';
  activeTargetId?: string;
  onSelectTarget?: (targetId: string) => void;
  showChallengeObstacle?: boolean;
  twilightSunset?: boolean;
}

function hash1(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

const SKY_DOME_VERTEX = `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SKY_DOME_FRAGMENT = `
  uniform vec3 uZenithColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uGroundColor;
  uniform vec3 uSunDir;
  uniform vec3 uSunGlowColor;
  varying vec3 vWorldPos;
  void main() {
    vec3 dir = normalize(vWorldPos);
    float h = clamp(dir.y, -0.25, 1.0);
    vec3 col = h >= 0.0
      ? mix(uHorizonColor, uZenithColor, pow(h, 0.58))
      : mix(uHorizonColor, uGroundColor, clamp(-h * 4.0, 0.0, 1.0));
    float sunAmt = max(0.0, dot(dir, normalize(uSunDir)));
    col += uSunGlowColor * pow(sunAmt, 14.0) * 0.45;
    col += uSunGlowColor * pow(sunAmt, 140.0) * 0.65;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export const Terrain3D: React.FC<Terrain3DProps> = ({
  environment,
  activeTargetId,
  onSelectTarget,
  showChallengeObstacle = false,
  twilightSunset = false,
}) => {
  const isEarth = environment === 'earth';
  const targets: SimulationWaypoint[] = isEarth ? EARTH_TARGETS : MARS_TARGETS;

  // 1. Procedural Stratified Terrain Geometry + Mineral Vertex Colors
  const { geometry, rockPositions } = useMemo(() => {
    const size = 76;
    const segments = 140;
    const geom = new THREE.PlaneGeometry(size, size, segments, segments);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position as THREE.BufferAttribute;
    const count = pos.count;
    const colors = new Float32Array(count * 3);
    const col = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Multi-scale hills & strata terraces
      let y =
        Math.sin(x * 0.075) * Math.cos(z * 0.075) * 1.55 +
        Math.sin(x * 0.15 + z * 0.11) * 0.68;

      y += Math.sin(x * 0.42) * Math.cos(z * 0.34) * 0.22;
      y += Math.sin(x * 0.95 + 1.2) * Math.cos(z * 0.85) * 0.07;

      // Keep central traverse corridor navigable
      const distFromCenter = Math.sqrt(x * x + z * z);
      const flattenFactor = THREE.MathUtils.clamp(distFromCenter / 12, 0.16, 1.0);
      y *= flattenFactor;

      // Steep rocky talus slope hazard at z ~ 4..12
      let isHazardRidge = false;
      if (showChallengeObstacle && z > 4 && z < 12 && x > -5 && x < 5) {
        const ridgeProfile =
          Math.sin(((z - 4) / 8) * Math.PI) * Math.cos((x / 5) * (Math.PI / 2));
        if (ridgeProfile > 0) {
          y += ridgeProfile * 2.85;
          isHazardRidge = ridgeProfile > 0.25;
        }
      }

      pos.setY(i, y);

      // Sedimentary / Mineral Vertex Shading
      const strataBand = Math.sin(y * 4.5 + x * 0.15) * 0.5 + 0.5;
      const fineRipple = Math.sin(x * 1.4 + z * 0.8) * 0.5 + 0.5;

      if (isEarth) {
        // Atacama: pale halite/nitrate basins -> warm alluvial sand -> dark volcanic ridge
        if (y < 0.08) {
          col.setRGB(0.74 + fineRipple * 0.06, 0.66 + fineRipple * 0.05, 0.54 + fineRipple * 0.04);
        } else if (y > 1.1) {
          col.setRGB(0.45 + strataBand * 0.08, 0.38 + strataBand * 0.06, 0.31 + strataBand * 0.04);
        } else {
          col.setRGB(0.62 + strataBand * 0.09, 0.52 + strataBand * 0.08, 0.39 + strataBand * 0.05);
        }
      } else {
        // Mars Gale Crater: basaltic dark dunes in troughs -> ferric mudstone strata -> ochre sulfate bands
        if (isHazardRidge) {
          col.setRGB(0.56 + strataBand * 0.12, 0.27 + strataBand * 0.06, 0.17);
        } else if (y < 0.02) {
          // Dark eolian basaltic sand
          col.setRGB(0.36 + fineRipple * 0.07, 0.19 + fineRipple * 0.04, 0.13 + fineRipple * 0.03);
        } else if (strataBand > 0.65) {
          // Pale sulfate / smectite outcrop veins
          col.setRGB(0.76, 0.44, 0.28);
        } else {
          // Classic Murray mudstone rust-orange
          col.setRGB(0.62 + strataBand * 0.1, 0.28 + strataBand * 0.06, 0.17 + strataBand * 0.04);
        }
      }

      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    // Deterministic Boulder Scatter
    const rocks: [number, number, number, number, number][] = [];
    const rockSeed = isEarth ? 42 : 108;
    for (let j = 0; j < 78; j++) {
      const rx = (hash1(j * 9.1 + rockSeed) - 0.5) * 52;
      const rz = (hash1(j * 13.7 + rockSeed) - 0.5) * 52;
      if (Math.abs(rx) > 2.2 || Math.abs(rz) > 2.2) {
        const scale = 0.22 + hash1(j * 3.3 + rockSeed) * 0.68;
        const ry =
          Math.sin(rx * 0.075) *
          Math.cos(rz * 0.075) *
          1.55 *
          Math.min(1, Math.sqrt(rx * rx + rz * rz) / 12);
        rocks.push([rx, ry + scale * 0.28, rz, scale, j * 0.45]);
      }
    }

    return { geometry: geom, rockPositions: rocks };
  }, [isEarth, showChallengeObstacle]);

  // 2. Atmospheric Sky Dome ShaderMaterial
  const skyDomeMat = useMemo(() => {
    const zenith = isEarth
      ? new THREE.Color('#1B4268')
      : twilightSunset
        ? new THREE.Color('#1B263B')
        : new THREE.Color('#471F17');
    const horizon = isEarth
      ? new THREE.Color('#D8C8B4')
      : twilightSunset
        ? new THREE.Color('#8A4A35')
        : new THREE.Color('#C26C44');
    const ground = isEarth
      ? new THREE.Color('#8A755C')
      : new THREE.Color('#5C2617');
    const sunDir = isEarth
      ? new THREE.Vector3(15, 22, 12)
      : twilightSunset
        ? new THREE.Vector3(10, 3.5, 22)
        : new THREE.Vector3(12, 15, 18);
    const sunGlow = isEarth
      ? new THREE.Color('#FFF3D6')
      : twilightSunset
        ? new THREE.Color('#7FB3D5') // Authentic Martian blue-scatter sunset
        : new THREE.Color('#FDBA74');

    return new THREE.ShaderMaterial({
      uniforms: {
        uZenithColor: { value: zenith },
        uHorizonColor: { value: horizon },
        uGroundColor: { value: ground },
        uSunDir: { value: sunDir },
        uSunGlowColor: { value: sunGlow },
      },
      vertexShader: SKY_DOME_VERTEX,
      fragmentShader: SKY_DOME_FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
    });
  }, [isEarth, twilightSunset]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      skyDomeMat.dispose();
    };
  }, [geometry, skyDomeMat]);

  const rockColor = isEarth ? '#6E5F4D' : '#6B2F1E';
  const fogColor = isEarth ? '#D8C8B4' : twilightSunset ? '#7E4130' : '#B8623E';

  const waypointCoords: Record<string, [number, number, number]> = useMemo(
    () => ({
      'e-target-1': [-4.5, 0.25, 4.0],
      'e-target-2': [5.5, 0.72, 8.5],
      'e-target-3': [-2.0, 0.42, 14.0],
      'm-target-1': [-4.0, 0.25, 4.5],
      'm-target-2': [5.0, 0.95, 9.0],
      'm-target-3': [-1.5, 0.52, 14.5],
    }),
    []
  );

  return (
    <group>
      {/* Atmospheric Distance Fog & Sky Dome */}
      <fog attach="fog" args={[fogColor, 18, 65]} />
      <mesh material={skyDomeMat}>
        <sphereGeometry args={[72, 32, 24]} />
      </mesh>

      {/* Main Mineral Vertex-Colored Terrain Mesh */}
      <mesh geometry={geometry} receiveShadow castShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.86}
          metalness={0.08}
        />
      </mesh>

      {/* Scattered Boulders & Outcrops */}
      {rockPositions.map(([rx, ry, rz, scale, rotY], idx) => (
        <mesh
          key={idx}
          position={[rx, ry, rz]}
          rotation={[0.2, rotY, 0.1]}
          scale={[scale * 1.2, scale * 0.78, scale]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial
            color={rockColor}
            roughness={0.9}
            metalness={0.12}
            flatShading
          />
        </mesh>
      ))}

      {/* Suspended Martian Dust */}
      {!isEarth && <MarsDustParticles />}

      {/* Target Specimen Outcrops & Clickable 3D Waypoint Beacons */}
      {targets.map((tgt: SimulationWaypoint, idx: number) => {
        const coords = waypointCoords[tgt.id] ?? [(idx - 1) * 5, 0.4, (idx + 1) * 4.5];
        const isActive = activeTargetId === tgt.id;

        return (
          <group key={tgt.id}>
            {/* Physical Rock Specimen to Inspect */}
            <mesh
              position={[coords[0] + 0.45, coords[1] + 0.14, coords[2] + 0.35]}
              rotation={[0.3, idx * 1.1, 0.2]}
              scale={[0.38, 0.26, 0.34]}
              castShadow
              receiveShadow
            >
              <dodecahedronGeometry args={[1, 0]} />
              <meshStandardMaterial
                color={isEarth ? '#8D7C66' : '#924027'}
                roughness={0.85}
                metalness={0.15}
                flatShading
              />
            </mesh>

            <WaypointBeacon3D
              position={coords}
              isActive={isActive}
              isEarth={isEarth}
              onClick={() => onSelectTarget && onSelectTarget(tgt.id)}
            />
          </group>
        );
      })}

      {/* Traversal Guide Path */}
      <TraversePathGuide isEarth={isEarth} waypointCoords={waypointCoords} />

      {/* Critical Mission Event Hazard Zone */}
      {showChallengeObstacle && <ChallengeObstacleZone />}
    </group>
  );
};

interface WaypointBeacon3DProps {
  position: [number, number, number];
  isActive: boolean;
  isEarth: boolean;
  onClick: () => void;
}

const WaypointBeacon3D: React.FC<WaypointBeacon3DProps> = ({
  position,
  isActive,
  isEarth,
  onClick,
}) => {
  const ringRef = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.PointLight>(null);

  const baseColor = isActive ? '#38BDF8' : isEarth ? '#F8FAFC' : '#F59E0B';

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    if (ringRef.current) {
      ringRef.current.rotation.y += delta * 1.25;
      ringRef.current.position.y = position[1] + 1.15 + Math.sin(t * 2.5) * 0.1;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y -= delta * 0.85;
      ring2Ref.current.position.y = position[1] + 1.15 + Math.cos(t * 2.5) * 0.08;
    }
    if (pulseRef.current) {
      pulseRef.current.intensity = isActive ? 2.0 + Math.sin(t * 5) * 0.6 : 0.7;
    }
  });

  return (
    <group position={[position[0], 0, position[2]]}>
      <mesh position={[0, position[1] + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.48, 0.64, 32]} />
        <meshBasicMaterial color={baseColor} transparent opacity={isActive ? 0.8 : 0.35} />
      </mesh>

      <mesh position={[0, position[1] + 1.15, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 2.3, 12]} />
        <meshBasicMaterial color={baseColor} transparent opacity={isActive ? 0.7 : 0.25} />
      </mesh>

      <mesh
        ref={ringRef}
        position={[0, position[1] + 1.15, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <torusGeometry args={[0.3, 0.026, 16, 32]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={isActive ? 0.85 : 0.3}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      <mesh
        ref={ring2Ref}
        position={[0, position[1] + 1.15, 0]}
        rotation={[Math.PI / 3, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <torusGeometry args={[0.2, 0.018, 12, 24]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={isActive ? 0.9 : 0.2}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      <pointLight
        ref={pulseRef}
        position={[0, position[1] + 1.35, 0]}
        color={baseColor}
        distance={4.5}
      />
    </group>
  );
};

interface TraversePathGuideProps {
  isEarth: boolean;
  waypointCoords: Record<string, [number, number, number]>;
}

const TraversePathGuide: React.FC<TraversePathGuideProps> = ({ isEarth, waypointCoords }) => {
  const lineGeometry = useMemo(() => {
    const origin: [number, number, number] = [0, 0.1, 0];
    const targetKeys = isEarth
      ? ['e-target-1', 'e-target-2', 'e-target-3']
      : ['m-target-1', 'm-target-2', 'm-target-3'];

    const pts = [origin];
    targetKeys.forEach((key) => {
      const c = waypointCoords[key];
      if (c) pts.push([c[0], c[1] + 0.08, c[2]]);
    });

    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    return new THREE.BufferGeometry().setFromPoints(curve.getPoints(72));
  }, [isEarth, waypointCoords]);

  const lineMaterial = useMemo(
    () =>
      new THREE.LineDashedMaterial({
        color: isEarth ? '#38BDF8' : '#F59E0B',
        dashSize: 0.4,
        gapSize: 0.25,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
    [isEarth]
  );

  useEffect(() => {
    return () => {
      lineGeometry.dispose();
      lineMaterial.dispose();
    };
  }, [lineGeometry, lineMaterial]);

  return (
    <primitive
      object={new THREE.Line(lineGeometry, lineMaterial)}
      onUpdate={(self: THREE.Line) => self.computeLineDistances()}
    />
  );
};

const MarsDustParticles: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, count] = useMemo(() => {
    const cnt = 520;
    const pos = new Float32Array(cnt * 3);
    for (let i = 0; i < cnt * 3; i += 3) {
      const idx = i / 3;
      const rx = hash1(idx * 17.123 + 43.12) - 0.5;
      const ry = hash1(idx * 71.456 + 12.87);
      const rz = hash1(idx * 39.789 + 89.23) - 0.5;
      pos[i] = rx * 38;
      pos[i + 1] = ry * 8 + 0.25;
      pos[i + 2] = rz * 38;
    }
    return [pos, cnt];
  }, []);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < count; i++) {
        let y = posAttr.getY(i) - delta * 0.16;
        let x = posAttr.getX(i) + delta * 0.28;
        if (y < 0.2) y = 8.2;
        if (x > 19) x = -19;
        posAttr.setY(i, y);
        posAttr.setX(i, x);
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.07}
        color="#FDBA74"
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

const ChallengeObstacleZone: React.FC = () => {
  return (
    <group position={[0, 0, 7.5]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.2, 3.45, 36]} />
        <meshBasicMaterial color="#EF4444" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 1.8, 0]} color="#EF4444" intensity={1.8} distance={7} />
    </group>
  );
};
