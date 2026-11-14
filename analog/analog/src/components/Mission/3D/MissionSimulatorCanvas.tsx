import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { MissionConfigState } from '../../../types/mission';
import { Rover3D } from './Rover3D';
import { Terrain3D } from './Terrain3D';
import { SpaceTransferScene } from './SpaceTransferScene';

export interface MissionSimulatorCanvasProps {
  config: MissionConfigState;
  transferProgress?: number; // 0..1 for transfer stage
  roverStepIndex?: number;   // 0..5 for Earth / Mars surface progression
  activeTargetId?: string;
  onSelectTarget?: (id: string) => void;
  reducedMotion?: boolean;
}

export const MissionSimulatorCanvas: React.FC<MissionSimulatorCanvasProps> = ({
  config,
  transferProgress = 0.5,
  roverStepIndex = 0,
  activeTargetId,
  onSelectTarget,
  reducedMotion = false,
}) => {
  const isSpaceStage = config.stage === 'landing' || config.stage === 'template' || config.stage === 'environment' || config.stage === 'transfer';
  const isEarthSim = config.stage === 'earth-sim';
  const isMarsSim = config.stage === 'planet-sim' || config.stage === 'challenge' || config.stage === 'debrief';
  const isConfigure = config.stage === 'configure';

  // Rover Waypoint Traversal coordinates
  // Step 0: Deploy [0, 0.45, 0]
  // Step 1: Traverse to Target A [-4.0, 0.35, 4.0]
  // Step 2: Scan / Inspect Target A [-4.0, 0.35, 4.0] (arm inspecting)
  // Step 3: Traverse to Target B [5.0, 0.85, 8.5]
  // Step 4: Scan / Inspect Target C [-1.8, 0.55, 14.0]
  // Step 5: Survey Complete [-1.8, 0.55, 14.0]
  const roverTransform = getRoverTransform(config.stage, roverStepIndex, config.decisionId);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '620px',
        background: '#06090E',
        overflow: 'hidden',
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 2, 8], fov: 45, near: 0.1, far: 250 }}
      >
        <Suspense fallback={null}>
          {/* ================= LIGHTING ENVIRONMENT ================= */}
          {isSpaceStage && (
            <>
              <ambientLight intensity={0.18} />
              <directionalLight position={[-30, 20, 20]} intensity={2.8} color="#FFFBEB" />
            </>
          )}

          {isConfigure && (
            <>
              {/* Clean-Room Studio Hardware Test Stand Lighting */}
              <color attach="background" args={['#080E17']} />
              <hemisphereLight args={['#DCE8F5', '#1B2838', 1.15]} />
              <ambientLight intensity={0.45} color="#CBD5E1" />
              <directionalLight
                position={[5, 8, 5]}
                intensity={2.6}
                castShadow
                color="#F8FAFC"
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
              />
              <directionalLight position={[-5, 4, -5]} intensity={1.6} color="#93C5FD" />
              <pointLight position={[0, 1.8, 2.2]} intensity={1.1} color="#E0F2FE" distance={7} />
              <pointLight position={[0, -0.3, 0]} intensity={0.9} color="#38BDF8" distance={5} />
            </>
          )}

          {isEarthSim && (
            <>
              {/* Bright Atacama High-Altitude Sun + Sky Bounce */}
              <hemisphereLight args={['#DCE8F5', '#9C7B5C', 0.85]} />
              <ambientLight intensity={0.35} color="#CBD5E1" />
              <directionalLight
                position={[15, 24, 12]}
                intensity={2.6}
                castShadow
                color="#FFFDF5"
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
              />
            </>
          )}

          {isMarsSim && (
            <>
              {/* Mars Diffuse Dust Scatter + Oblique Solar Light */}
              <hemisphereLight
                args={[
                  config.stage === 'debrief' ? '#9AB8D8' : '#E8B899',
                  '#4D2414',
                  config.stage === 'debrief' ? 0.72 : 0.82,
                ]}
              />
              <ambientLight intensity={0.28} color="#8B3A1B" />
              <directionalLight
                position={[12, 16, 18]}
                intensity={config.stage === 'debrief' ? 1.45 : 1.85}
                castShadow
                color="#FED7AA"
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
              />
            </>
          )}

          {/* ================= 3D CONTENT BY STAGE ================= */}
          {/* 1. Space Scenes (Prologue or Transfer) */}
          {isSpaceStage && (
            <SpaceTransferScene
              mode={config.stage === 'transfer' ? 'transfer' : 'prologue'}
              transferProgress={transferProgress}
              destination={config.destination}
            />
          )}

          {/* 2. Hardware Turntable Pedestal (Stage: Configure) */}
          {isConfigure && (
            <group position={[0, 0, 0]}>
              {/* Dark Clean-Room Floor Under Pedestal */}
              <mesh position={[0, -0.14, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <circleGeometry args={[12, 48]} />
                <meshStandardMaterial color="#0A1019" roughness={0.85} metalness={0.2} />
              </mesh>
              {/* Circular Turntable Test Stand */}
              <mesh position={[0, -0.06, 0]} receiveShadow>
                <cylinderGeometry args={[2.35, 2.55, 0.14, 56]} />
                <meshStandardMaterial color="#1E293B" metalness={0.72} roughness={0.32} />
              </mesh>
              {/* Brushed Bevel Ring */}
              <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[2.22, 2.34, 56]} />
                <meshStandardMaterial color="#64748B" metalness={0.85} roughness={0.25} />
              </mesh>
              {/* Radial Calibration Grid Rings */}
              <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[1.05, 1.085, 56]} />
                <meshBasicMaterial color="#38BDF8" transparent opacity={0.42} />
              </mesh>
              <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[1.68, 1.71, 56]} />
                <meshBasicMaterial color="#38BDF8" transparent opacity={0.35} />
              </mesh>
              <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[2.08, 2.1, 56]} />
                <meshBasicMaterial color="#F59E0B" transparent opacity={0.35} />
              </mesh>
            </group>
          )}

          {/* 3. Surface Terrains (Atacama vs Gale Crater) */}
          {isEarthSim && (
            <Terrain3D
              environment="earth"
              activeTargetId={activeTargetId}
              onSelectTarget={onSelectTarget}
            />
          )}

          {isMarsSim && (
            <Terrain3D
              environment="mars"
              activeTargetId={activeTargetId}
              onSelectTarget={onSelectTarget}
              showChallengeObstacle={config.stage === 'challenge'}
              twilightSunset={config.stage === 'debrief'}
            />
          )}

          {/* 4. 3D Rover Model (Present in Configure, Earth Sim, Mars Sim, Challenge, Debrief) */}
          {(isConfigure || isEarthSim || isMarsSim) && (
            <Rover3D
              position={roverTransform.position}
              rotation={roverTransform.rotation}
              isTraversing={roverTransform.isTraversing}
              armState={roverTransform.armState}
              powerType={config.templateId === 'rover-engineer' ? 'rtg' : 'solar'}
              wheelSlip={roverTransform.wheelSlip}
              scanBeamActive={roverTransform.scanBeamActive}
              speed={1.0}
              reducedMotion={reducedMotion}
            />
          )}

          {/* ================= DYNAMIC CAMERA RIG ================= */}
          <SimulatorCameraRig
            stage={config.stage}
            roverPos={roverTransform.position}
            reducedMotion={reducedMotion}
            allowFreeOrbit={isConfigure || config.stage === 'debrief'}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

// ============================================================================
// CAMERA RIG WITH AUTOMATIC CINEMATIC SMOOTHING
// ============================================================================
interface SimulatorCameraRigProps {
  stage: string;
  roverPos: [number, number, number];
  reducedMotion: boolean;
  allowFreeOrbit: boolean;
}

const SimulatorCameraRig: React.FC<SimulatorCameraRigProps> = ({
  stage,
  roverPos,
  reducedMotion,
  allowFreeOrbit,
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const targetCamPos = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());

  const prevStageRef = useRef<string>(stage);

  // Define key camera positions by mission stage
  useEffect(() => {
    switch (stage) {
      case 'landing':
      case 'template':
      case 'environment':
        // Orbital prologue floating camera
        targetCamPos.current.set(0, 1.8, 12);
        targetLookAt.current.set(0, 0, 0);
        break;

      case 'configure':
        // Turntable isometric frame
        targetCamPos.current.set(2.8, 1.8, 3.4);
        targetLookAt.current.set(0, 0.45, 0);
        break;

      case 'earth-sim':
        // Follow rover on Atacama terrain
        targetCamPos.current.set(roverPos[0] + 3.2, roverPos[1] + 1.8, roverPos[2] - 3.6);
        targetLookAt.current.set(roverPos[0], roverPos[1] + 0.4, roverPos[2] + 1.0);
        break;

      case 'transfer':
        // Interplanetary deep space overview framing both Earth departure & Mars capture
        targetCamPos.current.set(1.0, 9.5, 24.0);
        targetLookAt.current.set(1.0, 0.6, 0);
        break;

      case 'planet-sim':
        // Surface tracking on Gale Crater
        targetCamPos.current.set(roverPos[0] + 3.0, roverPos[1] + 1.6, roverPos[2] - 3.4);
        targetLookAt.current.set(roverPos[0], roverPos[1] + 0.4, roverPos[2] + 1.2);
        break;

      case 'challenge':
        // Dramatic low angle framing steep rocky ridge
        targetCamPos.current.set(-3.2, 1.2, 4.8);
        targetLookAt.current.set(0, 1.6, 7.8);
        break;

      case 'debrief':
        // Heroic wide orbit shot framing full rover & Mars twilight horizon above bottom HUD
        targetCamPos.current.set(roverPos[0] + 5.6, roverPos[1] + 2.4, roverPos[2] + 5.2);
        targetLookAt.current.set(roverPos[0] - 0.8, roverPos[1] + 0.55, roverPos[2]);
        break;

      default:
        targetCamPos.current.set(0, 2, 8);
        targetLookAt.current.set(0, 0, 0);
    }

    // Immediate snap when cutting between radically different theaters (e.g. ground <-> orbital/transfer)
    const majorCut =
      prevStageRef.current !== stage &&
      (stage === 'transfer' ||
        stage === 'configure' ||
        stage === 'landing' ||
        prevStageRef.current === 'transfer' ||
        prevStageRef.current === 'configure');

    if (reducedMotion || majorCut) {
      camera.position.copy(targetCamPos.current);
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLookAt.current);
        controlsRef.current.update();
      } else {
        camera.lookAt(targetLookAt.current);
      }
    }
    prevStageRef.current = stage;
  }, [stage, roverPos, reducedMotion, camera]);

  useFrame((_, delta) => {
    if (reducedMotion) return;

    // Smooth lerp camera towards target positions
    const lerpSpeed = Math.min(delta * 2.2, 0.15);
    camera.position.lerp(targetCamPos.current, lerpSpeed);

    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, lerpSpeed);
      controlsRef.current.update();

      // Subtle slow auto-rotate in debrief or configure
      if (stage === 'debrief') {
        controlsRef.current.autoRotate = true;
        controlsRef.current.autoRotateSpeed = 0.6;
      } else {
        controlsRef.current.autoRotate = false;
      }
    } else {
      camera.lookAt(targetLookAt.current);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={allowFreeOrbit}
      enableZoom={true}
      enableRotate={allowFreeOrbit || stage === 'earth-sim' || stage === 'planet-sim'}
      maxPolarAngle={Math.PI / 2 - 0.02} // Prevent camera clipping below ground plane
      minDistance={1.8}
      maxDistance={35}
    />
  );
};

// ============================================================================
// HELPER: CALCULATE ROVER TRANSFORMS ACROSS MISSION STEPS
// ============================================================================
interface RoverState {
  position: [number, number, number];
  rotation: [number, number, number];
  isTraversing: boolean;
  armState: 'stowed' | 'deploying' | 'inspecting';
  wheelSlip: boolean;
  scanBeamActive: boolean;
}

function getRoverTransform(
  stage: string,
  stepIndex: number,
  decisionId: string | null
): RoverState {
  if (stage === 'configure') {
    return {
      position: [0, 0.42, 0],
      rotation: [0, -0.4, 0],
      isTraversing: false,
      armState: 'stowed',
      wheelSlip: false,
      scanBeamActive: false,
    };
  }

  // Critical Challenge Decision Maneuvers (Stage 6)
  if (stage === 'challenge') {
    if (decisionId === 'direct-traverse') {
      // Direct ascent up steep ridge with wheel slip
      return {
        position: [0, 1.45, 6.5],
        rotation: [-0.42, 0, 0], // tilted upward on 24-deg slope
        isTraversing: true,
        armState: 'stowed',
        wheelSlip: true,
        scanBeamActive: false,
      };
    } else if (decisionId === 'safer-route') {
      // Smooth southern bypass around obstacle
      return {
        position: [4.2, 0.45, 7.8],
        rotation: [0, 0.55, 0], // navigated around the rocks
        isTraversing: true,
        armState: 'stowed',
        wheelSlip: false,
        scanBeamActive: false,
      };
    } else if (decisionId === 'standoff-inspect') {
      // Standoff laser spectroscopy from safe distance
      return {
        position: [0, 0.45, 3.8],
        rotation: [0, 0, 0],
        isTraversing: false,
        armState: 'stowed',
        wheelSlip: false,
        scanBeamActive: true, // ChemCam laser beam firing at ridge
      };
    } else {
      // Approaching obstacle
      return {
        position: [0, 0.45, 3.2],
        rotation: [0, 0, 0],
        isTraversing: false,
        armState: 'stowed',
        wheelSlip: false,
        scanBeamActive: false,
      };
    }
  }

  // Debrief heroic stance
  if (stage === 'debrief') {
    return {
      position: [2.5, 0.52, 10.5],
      rotation: [0, 0.75, 0],
      isTraversing: false,
      armState: 'inspecting',
      wheelSlip: false,
      scanBeamActive: false,
    };
  }

  // Step Progression for Earth Sim and Mars Sim
  switch (stepIndex) {
    case 0: // Deploy
      return {
        position: [0, 0.45, 0],
        rotation: [0, 0, 0],
        isTraversing: false,
        armState: 'stowed',
        wheelSlip: false,
        scanBeamActive: false,
      };
    case 1: // Traverse to Target A
      return {
        position: [-3.2, 0.38, 3.2],
        rotation: [0, -0.65, 0],
        isTraversing: true,
        armState: 'stowed',
        wheelSlip: false,
        scanBeamActive: false,
      };
    case 2: // Inspect Target A
      return {
        position: [-4.0, 0.35, 4.0],
        rotation: [0, -0.85, 0],
        isTraversing: false,
        armState: 'inspecting',
        wheelSlip: false,
        scanBeamActive: true,
      };
    case 3: // Survey Escarpment / Target B
      return {
        position: [4.6, 0.82, 8.0],
        rotation: [0, 0.45, 0],
        isTraversing: false,
        armState: 'inspecting',
        wheelSlip: false,
        scanBeamActive: false,
      };
    case 4: // Traverse to Target C
      return {
        position: [-1.2, 0.52, 13.2],
        rotation: [0, -0.25, 0],
        isTraversing: true,
        armState: 'stowed',
        wheelSlip: false,
        scanBeamActive: false,
      };
    case 5: // Survey Complete
    default:
      return {
        position: [-1.8, 0.55, 14.0],
        rotation: [0, -0.15, 0],
        isTraversing: false,
        armState: 'inspecting',
        wheelSlip: false,
        scanBeamActive: false,
      };
  }
}
