import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { Canvas, ThreeEvent, useFrame } from '@react-three/fiber';
import { Html as DreiHtml, OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { TerrainGridDataset } from '../../../types/terrain';
import {
  DROP_OBJECTS,
  type DropObjectId,
  type EnvironmentSide,
  type ExperimentId,
  type MissionId,
  type TemperatureExperimentResult,
  evaluateFreeFallAtTime,
  evaluateProbeTemperatureAtTime,
} from '../../../services/comparativeSimulationEngine';

const OverlayPortal = createContext<React.RefObject<HTMLDivElement | null> | null>(null);

function Html(props: React.ComponentProps<typeof DreiHtml>) {
  const portal = useContext(OverlayPortal);
  return <DreiHtml {...props} portal={portal?.current ? { current: portal.current } : undefined} />;
}

export interface LunarCandidatePin {
  id: string;
  label: string;
  row: number;
  col: number;
}

export const SHACKLETON_CANDIDATE_PINS: LunarCandidatePin[] = [
  { id: 'alpha-ridge', label: 'Alpha Ridge', row: 18, col: 64 },
  { id: 'beta-scarp', label: 'Beta Scarp', row: 46, col: 86 },
  { id: 'gamma-psr', label: 'Gamma PSR', row: 64, col: 64 },
  { id: 'delta-bench', label: 'Delta Bench', row: 102, col: 34 },
];

export interface ComparativeScienceViewportProps {
  mission: MissionId;
  environment: EnvironmentSide;
  experiment: ExperimentId;
  dataset: TerrainGridDataset | null;
  simState: 'idle' | 'running' | 'paused' | 'completed';
  elapsedSeconds: number;
  dropObjectId: DropObjectId;
  dropHeightMeters: number;
  gravityMs2: number;
  suitActive: boolean;
  suitInternalPressureKpa: number;
  probeRow: number;
  probeCol: number;
  temperatureResult: TemperatureExperimentResult | null;
  selectedSiteId: string | null;
  cameraResetNonce: number;
  onTerrainClick: (row: number, col: number) => void;
  onSimTick: (deltaSeconds: number) => void;
}

const TERRAIN_SIZE = 80;
const TERRAIN_VERTICAL_SCALE = 11;

function getElevationRange(elevations: (number | null)[]): { min: number; max: number; span: number } {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < elevations.length; i++) {
    const v = elevations[i];
    if (v === null || v === undefined) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 1, span: 1 };
  }
  return { min, max, span: Math.max(1, max - min) };
}

function getWorldPositionForCell(
  dataset: TerrainGridDataset | null,
  row: number,
  col: number
): [number, number, number] {
  const clampedRow = Math.max(0, Math.min(127, Math.round(row)));
  const clampedCol = Math.max(0, Math.min(127, Math.round(col)));
  const x = (clampedCol / 127) * TERRAIN_SIZE - TERRAIN_SIZE / 2;
  const z = (clampedRow / 127) * TERRAIN_SIZE - TERRAIN_SIZE / 2;

  if (!dataset || !dataset.elevations || dataset.elevations.length === 0) {
    return [x, 0, z];
  }

  const { min, span } = getElevationRange(dataset.elevations);
  const idx = clampedRow * 128 + clampedCol;
  const elev = dataset.elevations[idx] ?? min;
  const y = ((elev - min) / span) * TERRAIN_VERTICAL_SCALE - 2.0;
  return [x, y, z];
}

function SimulationTicker({
  simState,
  onSimTick,
}: {
  simState: 'idle' | 'running' | 'paused' | 'completed';
  onSimTick: (deltaSeconds: number) => void;
}) {
  useFrame((_, delta) => {
    if (simState === 'running') {
      onSimTick(Math.min(delta, 0.05));
    }
  });
  return null;
}

function TerrainMesh({
  mission,
  environment,
  dataset,
  onTerrainClick,
}: {
  mission: MissionId;
  environment: EnvironmentSide;
  dataset: TerrainGridDataset | null;
  onTerrainClick: (row: number, col: number) => void;
}) {
  const { geometry, material } = useMemo(() => {
    const geom = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 127, 127);
    geom.rotateX(-Math.PI / 2);

    const posAttr = geom.attributes.position as THREE.BufferAttribute;
    const count = posAttr.count;
    const colors = new Float32Array(count * 3);

    const elevations = dataset?.elevations;
    const range = elevations && elevations.length > 0 ? getElevationRange(elevations) : { min: 0, max: 1, span: 1 };

    for (let i = 0; i < count; i++) {
      const rawElev = elevations ? elevations[i] : null;
      const elev = rawElev !== null && rawElev !== undefined ? rawElev : range.min;
      const norm = (elev - range.min) / range.span;
      const y = elevations ? norm * TERRAIN_VERTICAL_SCALE - 2.0 : 0;
      posAttr.setY(i, y);

      let r = 0.5;
      let g = 0.5;
      let b = 0.5;

      if (environment === 'earth' && mission === 'mission-1-mars') {
        // Atacama Desert: ochre, gypsum salt flats, rust-tan ridges
        r = 0.58 + norm * 0.25;
        g = 0.42 + norm * 0.2;
        b = 0.26 + norm * 0.14;
      } else if (environment === 'planet' && mission === 'mission-1-mars') {
        // Mars Jezero / Gale: iron-oxide rust + basaltic crater floor
        r = 0.52 + norm * 0.34;
        g = 0.22 + norm * 0.17;
        b = 0.14 + norm * 0.1;
      } else if (environment === 'earth' && mission === 'mission-2-moon') {
        // McMurdo Dry Valleys: Antarctic dolerite rock + glacial ice
        if (norm > 0.62) {
          r = 0.72 + norm * 0.22;
          g = 0.8 + norm * 0.16;
          b = 0.88 + norm * 0.1;
        } else {
          r = 0.28 + norm * 0.24;
          g = 0.27 + norm * 0.22;
          b = 0.25 + norm * 0.2;
        }
      } else {
        // Shackleton Crater, Moon: high-contrast lunar regolith & deep PSR shadow
        const shade = 0.16 + Math.pow(norm, 1.15) * 0.62;
        r = shade;
        g = shade * 1.01;
        b = shade * 1.04;
      }

      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: environment === 'earth' && mission === 'mission-2-moon' ? 0.72 : 0.92,
      metalness: 0.04,
      flatShading: false,
    });

    return { geometry: geom, material: mat };
  }, [dataset, environment, mission]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const { x, z } = e.point;
    const col = Math.max(0, Math.min(127, Math.round(((x + TERRAIN_SIZE / 2) / TERRAIN_SIZE) * 127)));
    const row = Math.max(0, Math.min(127, Math.round(((z + TERRAIN_SIZE / 2) / TERRAIN_SIZE) * 127)));
    onTerrainClick(row, col);
  };

  return (
    <mesh geometry={geometry} material={material} receiveShadow onClick={handleClick} />
  );
}

function GravityDropRig({
  basePos,
  dropObjectId,
  dropHeightMeters,
  gravityMs2,
  elapsedSeconds,
}: {
  basePos: [number, number, number];
  dropObjectId: DropObjectId;
  dropHeightMeters: number;
  gravityMs2: number;
  elapsedSeconds: number;
}) {
  const visualScale = 0.58;
  const towerHeight = dropHeightMeters * visualScale + 1.6;
  const spec = DROP_OBJECTS.find((o) => o.id === dropObjectId) ?? DROP_OBJECTS[0]!;
  const state = evaluateFreeFallAtTime(dropHeightMeters, gravityMs2, elapsedSeconds);
  const objectY = state.currentHeightMeters * visualScale + spec.radiusMeters + 0.14;

  const tickMarks = useMemo(() => {
    const marks: number[] = [];
    const step = dropHeightMeters > 15 ? 5 : 2;
    for (let m = step; m <= dropHeightMeters; m += step) {
      marks.push(m);
    }
    return marks;
  }, [dropHeightMeters]);

  return (
    <group position={basePos}>
      {/* Ground landing pad */}
      <mesh position={[0, 0.07, 0]} receiveShadow>
        <cylinderGeometry args={[2.6, 2.9, 0.14, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.45, 32]} />
        <meshBasicMaterial color={state.impacted ? '#34d399' : '#38bdf8'} />
      </mesh>

      {/* Vertical calibration gantry */}
      <mesh position={[-2.1, towerHeight / 2, 0]} castShadow>
        <boxGeometry args={[0.24, towerHeight, 0.24]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Top release arm */}
      <mesh position={[-1.0, towerHeight - 0.12, 0]} castShadow>
        <boxGeometry args={[2.3, 0.16, 0.22]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Height ruler tick markers */}
      {tickMarks.map((m) => (
        <mesh key={m} position={[-1.75, m * visualScale + 0.14, 0]}>
          <boxGeometry args={[0.45, 0.05, 0.08]} />
          <meshBasicMaterial color="#94a3b8" />
        </mesh>
      ))}

      {/* Falling Test Object */}
      <group position={[0, objectY, 0]}>
        {dropObjectId === 'basalt-sphere' && (
          <mesh castShadow>
            <dodecahedronGeometry args={[spec.radiusMeters * 1.35, 1]} />
            <meshStandardMaterial color={spec.color} roughness={0.85} metalness={0.1} />
          </mesh>
        )}
        {dropObjectId === 'titanium-probe' && (
          <group>
            <mesh castShadow>
              <cylinderGeometry args={[spec.radiusMeters * 0.75, spec.radiusMeters * 1.15, spec.radiusMeters * 2.1, 16]} />
              <meshStandardMaterial color={spec.color} metalness={0.85} roughness={0.22} />
            </mesh>
            <mesh position={[0, spec.radiusMeters * 1.35, 0]} castShadow>
              <coneGeometry args={[spec.radiusMeters * 0.75, spec.radiusMeters * 0.9, 16]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.7} roughness={0.3} />
            </mesh>
          </group>
        )}
        {dropObjectId === 'aerogel-collector' && (
          <mesh castShadow>
            <octahedronGeometry args={[spec.radiusMeters * 1.45, 0]} />
            <meshStandardMaterial
              color={spec.color}
              roughness={0.2}
              metalness={0.15}
              transparent
              opacity={0.88}
            />
          </mesh>
        )}

        <Html position={[0.9, 0.35, 0]} center distanceFactor={18}>
          <div
            style={{
              background: 'rgba(10, 15, 28, 0.88)',
              border: '1px solid rgba(56, 189, 248, 0.45)',
              color: '#f8fafc',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            <div>h = {state.currentHeightMeters.toFixed(2)} m</div>
            <div style={{ color: state.impacted ? '#34d399' : '#38bdf8' }}>
              v = {state.currentVelocityMs.toFixed(2)} m/s
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
}

function AtmosphereSubjectRig({
  basePos,
  environment,
  suitActive,
  suitInternalPressureKpa,
}: {
  basePos: [number, number, number];
  environment: EnvironmentSide;
  suitActive: boolean;
  suitInternalPressureKpa: number;
}) {
  const hazardRingRef = useRef<THREE.Mesh>(null);
  const isCritical = environment === 'planet' && !suitActive;

  useFrame(({ clock }) => {
    if (hazardRingRef.current && isCritical) {
      const s = 1 + Math.sin(clock.getElapsedTime() * 5) * 0.12;
      hazardRingRef.current.scale.set(s, s, 1);
    } else if (hazardRingRef.current) {
      hazardRingRef.current.scale.set(1, 1, 1);
    }
  });

  const ringColor = isCritical ? '#ef4444' : suitActive ? '#38bdf8' : '#34d399';
  const suitColor = suitActive ? '#e2e8f0' : '#475569';

  return (
    <group position={basePos}>
      {/* Test Platform */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <cylinderGeometry args={[2.5, 2.8, 0.16, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Status Ring */}
      <mesh ref={hazardRingRef} position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.65, 1.95, 36]} />
        <meshBasicMaterial color={ringColor} />
      </mesh>

      {/* Stylized Human Test Subject */}
      <group position={[0, 0.16, 0]}>
        {/* Legs */}
        <mesh position={[-0.22, 0.65, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.12, 1.3, 12]} />
          <meshStandardMaterial color={suitColor} roughness={0.6} />
        </mesh>
        <mesh position={[0.22, 0.65, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.12, 1.3, 12]} />
          <meshStandardMaterial color={suitColor} roughness={0.6} />
        </mesh>
        {/* Torso */}
        <mesh position={[0, 1.75, 0]} castShadow>
          <capsuleGeometry args={[0.36, 0.7, 8, 16]} />
          <meshStandardMaterial color={suitColor} roughness={0.5} />
        </mesh>
        {/* PLSS Backpack when suit is active */}
        {suitActive && (
          <mesh position={[0, 1.85, -0.38]} castShadow>
            <boxGeometry args={[0.56, 0.85, 0.28]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.35} roughness={0.4} />
          </mesh>
        )}
        {/* Head / Helmet */}
        <mesh position={[0, 2.58, 0]} castShadow>
          <sphereGeometry args={[0.3, 20, 20]} />
          <meshStandardMaterial
            color={suitActive ? '#f59e0b' : '#f1c27d'}
            metalness={suitActive ? 0.65 : 0.05}
            roughness={suitActive ? 0.18 : 0.7}
          />
        </mesh>
      </group>

      {/* Pressurized EVA Suit Envelope */}
      {suitActive && (
        <mesh position={[0, 1.65, 0]}>
          <cylinderGeometry args={[1.25, 1.25, 3.1, 24, 1, true]} />
          <meshStandardMaterial
            color="#38bdf8"
            transparent
            opacity={0.14}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      <Html position={[0, 3.55, 0]} center distanceFactor={18}>
        <div
          style={{
            background: 'rgba(10, 15, 28, 0.9)',
            border: `1px solid ${ringColor}`,
            color: '#f8fafc',
            padding: '5px 9px',
            borderRadius: '6px',
            fontSize: '11px',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            textAlign: 'center',
          }}
        >
          <div style={{ fontWeight: 700, color: ringColor }}>
            {isCritical ? 'CRITICAL: DECOMPRESSION' : suitActive ? `EVA SUIT: ${suitInternalPressureKpa.toFixed(1)} kPa` : 'AMBIENT BREATHABLE'}
          </div>
          <div style={{ color: '#cbd5e1' }}>
            {environment === 'earth' ? 'Outside: 905 mbar · 20.95% O₂' : 'Outside: 6.1 mbar · 0.13% O₂'}
          </div>
        </div>
      </Html>
    </group>
  );
}

function TemperatureProbeRig({
  probePos,
  temperatureResult,
  elapsedSeconds,
}: {
  probePos: [number, number, number];
  temperatureResult: TemperatureExperimentResult | null;
  elapsedSeconds: number;
}) {
  const currentTempC =
    temperatureResult && temperatureResult.dataAvailable && temperatureResult.ambientTempCelsius !== null
      ? evaluateProbeTemperatureAtTime(
          temperatureResult.probeInitialCelsius,
          temperatureResult.ambientTempCelsius,
          temperatureResult.equilibrationTauSeconds,
          elapsedSeconds
        )
      : null;

  const isCold = currentTempC !== null && currentTempC < 0;
  const beaconColor = currentTempC === null ? '#94a3b8' : isCold ? '#38bdf8' : '#f97316';

  return (
    <group position={probePos}>
      {/* Tripod legs */}
      {[0, 2.09, 4.18].map((ang, i) => (
        <mesh
          key={i}
          position={[Math.cos(ang) * 0.55, 0.7, Math.sin(ang) * 0.55]}
          rotation={[Math.sin(ang) * 0.35, 0, -Math.cos(ang) * 0.35]}
          castShadow
        >
          <cylinderGeometry args={[0.06, 0.06, 1.6, 8]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      {/* Central sensor mast */}
      <mesh position={[0, 1.35, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.14, 2.2, 16]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.65} roughness={0.25} />
      </mesh>
      {/* Glowing thermal sensor head */}
      <mesh position={[0, 2.55, 0]}>
        <sphereGeometry args={[0.28, 18, 18]} />
        <meshStandardMaterial color={beaconColor} emissive={beaconColor} emissiveIntensity={0.65} />
      </mesh>

      <Html position={[0, 3.25, 0]} center distanceFactor={18}>
        <div
          style={{
            background: 'rgba(10, 15, 28, 0.9)',
            border: `1px solid ${beaconColor}`,
            color: '#f8fafc',
            padding: '5px 9px',
            borderRadius: '6px',
            fontSize: '11px',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {currentTempC !== null ? (
            <>
              <div style={{ color: beaconColor, fontWeight: 700 }}>
                Probe: {currentTempC.toFixed(1)} °C ({(currentTempC + 273.15).toFixed(1)} K)
              </div>
              <div style={{ color: '#cbd5e1' }}>
                Target: {temperatureResult?.ambientTempCelsius?.toFixed(1)} °C
              </div>
            </>
          ) : (
            <div style={{ color: '#facc15' }}>Pixel Masked / No Thermal Sample</div>
          )}
        </div>
      </Html>
    </group>
  );
}

function LunarBaseSitePins({
  dataset,
  probeRow,
  probeCol,
  selectedSiteId,
}: {
  dataset: TerrainGridDataset | null;
  probeRow: number;
  probeCol: number;
  selectedSiteId: string | null;
}) {
  const customPos = getWorldPositionForCell(dataset, probeRow, probeCol);

  return (
    <group>
      {SHACKLETON_CANDIDATE_PINS.map((pin) => {
        const pos = getWorldPositionForCell(dataset, pin.row, pin.col);
        const isSelected = selectedSiteId === pin.id;
        const color = isSelected ? '#34d399' : '#f59e0b';
        return (
          <group key={pin.id} position={pos}>
            <mesh position={[0, 1.3, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 2.6, 12]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
            </mesh>
            <mesh position={[0, 2.75, 0]}>
              <sphereGeometry args={[isSelected ? 0.42 : 0.3, 16, 16]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.65} />
            </mesh>
            <Html position={[0, 3.4, 0]} center distanceFactor={24}>
              <div
                style={{
                  background: isSelected ? 'rgba(6, 78, 59, 0.92)' : 'rgba(10, 15, 28, 0.85)',
                  border: `1px solid ${color}`,
                  color: '#f8fafc',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                {pin.label}
              </div>
            </Html>
          </group>
        );
      })}

      {selectedSiteId === 'custom-click' && (
        <group position={customPos}>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 3.0, 12]} />
            <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0, 3.15, 0]}>
            <octahedronGeometry args={[0.42, 0]} />
            <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.7} />
          </mesh>
          <Html position={[0, 3.9, 0]} center distanceFactor={22}>
            <div
              style={{
                background: 'rgba(10, 15, 28, 0.92)',
                border: '1px solid #38bdf8',
                color: '#38bdf8',
                padding: '3px 7px',
                borderRadius: '4px',
                fontSize: '10px',
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              Inspected ({probeRow}, {probeCol})
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

function CameraController({ resetNonce }: { resetNonce: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.object.position.set(22, 16, 26);
      controlsRef.current.target.set(0, 1.5, 0);
      controlsRef.current.update();
    }
  }, [resetNonce]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={8}
      maxDistance={75}
      maxPolarAngle={Math.PI / 2 - 0.04}
    />
  );
}

export const ComparativeScienceViewport: React.FC<ComparativeScienceViewportProps> = ({
  mission,
  environment,
  experiment,
  dataset,
  simState,
  elapsedSeconds,
  dropObjectId,
  dropHeightMeters,
  gravityMs2,
  suitActive,
  suitInternalPressureKpa,
  probeRow,
  probeCol,
  temperatureResult,
  selectedSiteId,
  cameraResetNonce,
  onTerrainClick,
  onSimTick,
}) => {
  const skyColor =
    environment === 'earth'
      ? mission === 'mission-1-mars'
        ? '#0f172a'
        : '#0b1526'
      : mission === 'mission-1-mars'
        ? '#241410'
        : '#03050a';

  const fogColor =
    environment === 'earth'
      ? mission === 'mission-1-mars'
        ? '#1e293b'
        : '#17253b'
      : mission === 'mission-1-mars'
        ? '#451d14'
        : '#03050a';

  const overlayPortal = useRef<HTMLDivElement>(null);
  const centerPos = useMemo(() => getWorldPositionForCell(dataset, 64, 64), [dataset]);
  const probePos = useMemo(() => getWorldPositionForCell(dataset, probeRow, probeCol), [dataset, probeRow, probeCol]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
      <Canvas
        shadows
        camera={{ position: [22, 16, 26], fov: 46, near: 0.2, far: 300 }}
        dpr={[1, 2]}
      >
        <OverlayPortal.Provider value={overlayPortal}>
          <color attach="background" args={[skyColor]} />
          <fog attach="fog" args={[fogColor, 48, 125]} />

          <ambientLight intensity={environment === 'planet' && mission === 'mission-2-moon' ? 0.35 : 0.6} />
          <directionalLight
            position={environment === 'planet' && mission === 'mission-2-moon' ? [40, 8, -22] : [28, 36, 22]}
            intensity={environment === 'planet' && mission === 'mission-2-moon' ? 1.8 : 1.5}
            color={environment === 'planet' && mission === 'mission-1-mars' ? '#ffd7c2' : '#ffffff'}
            castShadow
          />

          {(environment === 'planet' && mission === 'mission-2-moon') && (
            <Stars radius={120} depth={40} count={1800} factor={3} saturation={0} fade speed={0} />
          )}

          <SimulationTicker simState={simState} onSimTick={onSimTick} />
          <CameraController resetNonce={cameraResetNonce} />

          <TerrainMesh
            mission={mission}
            environment={environment}
            dataset={dataset}
            onTerrainClick={onTerrainClick}
          />

          {experiment === 'gravity' && (
            <GravityDropRig
              basePos={centerPos}
              dropObjectId={dropObjectId}
              dropHeightMeters={dropHeightMeters}
              gravityMs2={gravityMs2}
              elapsedSeconds={elapsedSeconds}
            />
          )}

          {experiment === 'atmosphere' && (
            <AtmosphereSubjectRig
              basePos={centerPos}
              environment={environment}
              suitActive={suitActive}
              suitInternalPressureKpa={suitInternalPressureKpa}
            />
          )}

          {experiment === 'temperature' && (
            <TemperatureProbeRig
              probePos={probePos}
              temperatureResult={temperatureResult}
              elapsedSeconds={elapsedSeconds}
            />
          )}

          {experiment === 'base-site' && mission === 'mission-2-moon' && environment === 'planet' && (
            <LunarBaseSitePins
              dataset={dataset}
              probeRow={probeRow}
              probeCol={probeCol}
              selectedSiteId={selectedSiteId}
            />
          )}
        </OverlayPortal.Provider>
      </Canvas>
      <div ref={overlayPortal} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
    </div>
  );
};

