import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface Rover3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isTraversing?: boolean;
  armState?: 'stowed' | 'deploying' | 'inspecting';
  powerType?: 'solar' | 'rtg';
  wheelSlip?: boolean;
  scanBeamActive?: boolean;
  speed?: number;
  reducedMotion?: boolean;
}

export const Rover3D: React.FC<Rover3DProps> = ({
  position = [0, 0.45, 0],
  rotation = [0, 0, 0],
  isTraversing = false,
  armState = 'stowed',
  powerType = 'solar',
  wheelSlip = false,
  scanBeamActive = false,
  speed = 1.0,
  reducedMotion = false,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const wheelsRef = useRef<THREE.Group[]>([]);
  const mastHeadRef = useRef<THREE.Group>(null);
  const shoulderRef = useRef<THREE.Group>(null);
  const elbowRef = useRef<THREE.Group>(null);
  const wristRef = useRef<THREE.Group>(null);

  const smoothPos = useRef(new THREE.Vector3(position[0], position[1], position[2]));
  const smoothYaw = useRef(rotation[1]);
  const initializedRef = useRef(false);

  // Snap immediately on large stage jumps or reduced motion
  useEffect(() => {
    if (!groupRef.current) return;
    const dx = position[0] - smoothPos.current.x;
    const dz = position[2] - smoothPos.current.z;
    const dist = Math.hypot(dx, dz);
    if (!initializedRef.current || reducedMotion || dist > 9.5) {
      smoothPos.current.set(position[0], position[1], position[2]);
      smoothYaw.current = rotation[1];
      groupRef.current.position.copy(smoothPos.current);
      groupRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
      initializedRef.current = true;
    }
  }, [position, rotation, reducedMotion]);

  // Arm target rotations (in radians)
  const targetShoulderAngle = armState === 'stowed' ? 0 : 0.85;
  const targetElbowAngle = armState === 'stowed' ? 0 : -1.1;
  const targetWristAngle = armState === 'stowed' ? 0 : 0.45;

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.getElapsedTime();

    // Smooth ground position & heading interpolation
    const movingDist = Math.hypot(
      position[0] - smoothPos.current.x,
      position[2] - smoothPos.current.z
    );
    const activelyRolling = isTraversing || movingDist > 0.06;

    if (groupRef.current) {
      if (reducedMotion) {
        smoothPos.current.set(position[0], position[1], position[2]);
        smoothYaw.current = rotation[1];
      } else {
        const posAlpha = Math.min(1, dt * 2.8);
        smoothPos.current.x = THREE.MathUtils.lerp(smoothPos.current.x, position[0], posAlpha);
        smoothPos.current.y = THREE.MathUtils.lerp(smoothPos.current.y, position[1], posAlpha);
        smoothPos.current.z = THREE.MathUtils.lerp(smoothPos.current.z, position[2], posAlpha);

        // Shortest angular delta for heading yaw
        const yawDelta = Math.atan2(
          Math.sin(rotation[1] - smoothYaw.current),
          Math.cos(rotation[1] - smoothYaw.current)
        );
        smoothYaw.current += yawDelta * Math.min(1, dt * 3.4);
      }

      groupRef.current.position.x = smoothPos.current.x;
      groupRef.current.position.z = smoothPos.current.z;
      groupRef.current.rotation.y = smoothYaw.current;

      // Subtle suspension vibration / pitch-roll during motion or wheel slip
      if (wheelSlip && !reducedMotion) {
        groupRef.current.position.y = smoothPos.current.y + Math.sin(t * 27) * 0.012;
        groupRef.current.rotation.z = Math.sin(t * 18) * 0.03;
      } else if (activelyRolling && !reducedMotion) {
        groupRef.current.position.y = smoothPos.current.y + Math.sin(t * 8) * 0.009;
        groupRef.current.rotation.z = Math.sin(t * 4) * 0.016;
      } else {
        groupRef.current.position.y = smoothPos.current.y;
        groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, dt * 6);
      }
    }

    // 1. Wheel rolling animation
    if ((activelyRolling || wheelSlip) && !reducedMotion) {
      const rollRate = (wheelSlip ? 6.0 : 3.2 * speed) * dt;
      wheelsRef.current.forEach((wheelGroup) => {
        if (wheelGroup) {
          wheelGroup.rotation.x += rollRate;
        }
      });
    }

    // 2. Arm articulation lerp
    if (shoulderRef.current) {
      shoulderRef.current.rotation.x = THREE.MathUtils.lerp(
        shoulderRef.current.rotation.x,
        targetShoulderAngle,
        dt * 3.5
      );
    }
    if (elbowRef.current) {
      elbowRef.current.rotation.x = THREE.MathUtils.lerp(
        elbowRef.current.rotation.x,
        targetElbowAngle,
        dt * 3.5
      );
    }
    if (wristRef.current) {
      wristRef.current.rotation.x = THREE.MathUtils.lerp(
        wristRef.current.rotation.x,
        targetWristAngle,
        dt * 3.5
      );
    }

    // 3. Mast camera subtle look-around or target tracking
    if (mastHeadRef.current && !reducedMotion) {
      if (scanBeamActive) {
        mastHeadRef.current.rotation.y = THREE.MathUtils.lerp(
          mastHeadRef.current.rotation.y,
          0.35,
          dt * 4.0
        );
        mastHeadRef.current.rotation.x = THREE.MathUtils.lerp(
          mastHeadRef.current.rotation.x,
          0.25,
          dt * 4.0
        );
      } else {
        mastHeadRef.current.rotation.y = Math.sin(t * 0.4) * 0.15;
        mastHeadRef.current.rotation.x = THREE.MathUtils.lerp(mastHeadRef.current.rotation.x, 0, dt * 3);
      }
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* ================= CHASSIS (WARM METALLIC / MLI FOIL) ================= */}
      {/* Main warm avionics box */}
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.35, 1.4]} />
        <meshStandardMaterial
          color="#CAAE72" // Warm titanium / gold MLI thermal blanket
          metalness={0.62}
          roughness={0.34}
        />
      </mesh>

      {/* Equipment Deck (Brushed aluminum top plate) */}
      <mesh position={[0, 0.605, 0]} receiveShadow>
        <boxGeometry args={[0.92, 0.02, 1.42]} />
        <meshStandardMaterial color="#516072" metalness={0.78} roughness={0.28} />
      </mesh>

      {/* Chassis Underside Skid Plate */}
      <mesh position={[0, 0.23, 0]}>
        <boxGeometry args={[0.75, 0.03, 1.25]} />
        <meshStandardMaterial color="#1A222D" metalness={0.9} roughness={0.4} />
      </mesh>

      {/* Front Avionics Sensor Bumper */}
      <mesh position={[0, 0.42, 0.72]}>
        <boxGeometry args={[0.65, 0.2, 0.08]} />
        <meshStandardMaterial color="#1E293B" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Hazard Cameras (Hazcam pair front) */}
      <mesh position={[-0.22, 0.45, 0.77]}>
        <cylinderGeometry args={[0.028, 0.028, 0.04, 16]} />
        <meshStandardMaterial color="#0A0E14" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0.22, 0.45, 0.77]}>
        <cylinderGeometry args={[0.028, 0.028, 0.04, 16]} />
        <meshStandardMaterial color="#0A0E14" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Rear Hazard Cameras */}
      <mesh position={[-0.22, 0.45, -0.72]}>
        <cylinderGeometry args={[0.024, 0.024, 0.03, 16]} />
        <meshStandardMaterial color="#0A0E14" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0.22, 0.45, -0.72]}>
        <cylinderGeometry args={[0.024, 0.024, 0.03, 16]} />
        <meshStandardMaterial color="#0A0E14" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* ================= POWER ARCHITECTURE: SOLAR vs RTG ================= */}
      {powerType === 'solar' ? (
        // Ultra-Triple-Junction Solar Panel Wing Deck
        <group position={[0, 0.62, -0.15]}>
          {/* Main Solar Deck Panel Frame */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.35, 0.018, 0.95]} />
            <meshStandardMaterial
              color="#475569"
              roughness={0.35}
              metalness={0.45}
            />
          </mesh>
          {/* Photovoltaic Cells (Deep sapphire silicon array) */}
          <mesh position={[0, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.28, 0.88]} />
            <meshStandardMaterial
              color="#1E4B78"
              emissive="#0C243E"
              emissiveIntensity={0.45}
              roughness={0.28}
              metalness={0.35}
            />
          </mesh>
          {/* Silver Interconnect Busbars across Solar Deck */}
          <mesh position={[0, 0.013, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.28, 0.025]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      ) : (
        // Multi-Mission Radioisotope Thermoelectric Generator (MMRTG)
        <group position={[0, 0.58, -0.75]}>
          {/* Central Cylindrical Core */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.45, 24]} />
            <meshStandardMaterial color="#475569" metalness={0.88} roughness={0.3} />
          </mesh>
          {/* Radiator Cooling Fins (8 Radial Fins) */}
          {[0, 45, 90, 135].map((deg) => (
            <mesh key={deg} rotation={[0, 0, (deg * Math.PI) / 180]}>
              <boxGeometry args={[0.48, 0.012, 0.42]} />
              <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.25} />
            </mesh>
          ))}
          {/* Core Thermal Amber Glow Indicator */}
          <pointLight color="#F59E0B" intensity={0.4} distance={0.6} />
        </group>
      )}

      {/* ================= HIGH-GAIN ANTENNA DISH & UHF WHIP ================= */}
      {/* High Gain Parabolic Dish (Right rear of deck) */}
      <group position={[0.32, 0.65, -0.45]} rotation={[-0.3, 0.4, 0]}>
        {/* Gimbal Pedestal */}
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.025, 0.03, 0.16, 12]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Parabolic Hex Dish */}
        <mesh position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.04, 0.05, 18, 1, true]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.75} roughness={0.25} side={THREE.DoubleSide} />
        </mesh>
        {/* Sub-reflector feed horn */}
        <mesh position={[0, 0.18, 0.08]}>
          <cylinderGeometry args={[0.01, 0.015, 0.08, 8]} />
          <meshStandardMaterial color="#0F172A" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Low-Gain UHF Antenna (Left rear) */}
      <mesh position={[-0.36, 0.85, -0.4]}>
        <cylinderGeometry args={[0.008, 0.01, 0.5, 8]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* ================= REMOTE SENSING MAST (PANCAM / CHEMCAM) ================= */}
      <group position={[-0.24, 0.62, 0.48]}>
        {/* Mast Base Pedestal */}
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 0.12, 16]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Vertical Mast Carbon-Fiber Column */}
        <mesh position={[0, 0.48, 0]}>
          <cylinderGeometry args={[0.024, 0.03, 0.75, 16]} />
          <meshStandardMaterial color="#1E293B" metalness={0.6} roughness={0.4} />
        </mesh>

        {/* Articulated Mast Head (Yaw/Pitch) */}
        <group ref={mastHeadRef} position={[0, 0.88, 0]}>
          {/* Head Sensor Box */}
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.22, 0.12, 0.16]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.7} roughness={0.25} />
          </mesh>

          {/* Stereo Pancam Optics (Left and Right lenses) */}
          <mesh position={[-0.07, 0.07, 0.085]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.03, 16]} />
            <meshStandardMaterial color="#0284C7" metalness={0.95} roughness={0.05} />
          </mesh>
          <mesh position={[0.07, 0.07, 0.085]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.03, 16]} />
            <meshStandardMaterial color="#0284C7" metalness={0.95} roughness={0.05} />
          </mesh>

          {/* ChemCam / SuperCam Laser Aperture (Center optic) */}
          <mesh position={[0, 0.04, 0.088]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.032, 0.032, 0.035, 20]} />
            <meshStandardMaterial color="#DC2626" metalness={0.9} roughness={0.1} />
          </mesh>

          {/* Navcams (wide angle pair below) */}
          <mesh position={[-0.05, 0.01, 0.082]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.02, 12]} />
            <meshStandardMaterial color="#0F172A" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[0.05, 0.01, 0.082]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.02, 12]} />
            <meshStandardMaterial color="#0F172A" metalness={0.9} roughness={0.1} />
          </mesh>

          {/* Active ChemCam Laser Target Beam (Visible in Scan/Inspect Mode) */}
          {scanBeamActive && (
            <mesh position={[0, 0.04, 1.8]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.004, 0.008, 3.5, 8]} />
              <meshBasicMaterial color="#38BDF8" transparent opacity={0.65} />
            </mesh>
          )}
        </group>
      </group>

      {/* ================= ARTICULATED ROBOTIC SCIENCE ARM ================= */}
      {/* Mounted at Front-Right Corner */}
      <group position={[0.32, 0.38, 0.65]}>
        {/* Shoulder Joint Turret (Azimuth / Elevation) */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.065, 16, 16]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Shoulder Pitch Arm */}
        <group ref={shoulderRef}>
          {/* Upper Arm Boom */}
          <mesh position={[0, 0, 0.24]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.028, 0.034, 0.46, 16]} />
            <meshStandardMaterial color="#B59F6C" metalness={0.7} roughness={0.3} />
          </mesh>

          {/* Elbow Joint */}
          <group ref={elbowRef} position={[0, 0, 0.48]}>
            <mesh>
              <sphereGeometry args={[0.05, 16, 16]} />
              <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.25} />
            </mesh>

            {/* Forearm Boom */}
            <mesh position={[0, 0, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.024, 0.028, 0.42, 16]} />
              <meshStandardMaterial color="#64748B" metalness={0.8} roughness={0.3} />
            </mesh>

            {/* Wrist & Science Instrument Turret */}
            <group ref={wristRef} position={[0, 0, 0.43]}>
              {/* Wrist Joint Hub */}
              <mesh>
                <cylinderGeometry args={[0.042, 0.042, 0.08, 16]} />
                <meshStandardMaterial color="#1E293B" metalness={0.9} roughness={0.2} />
              </mesh>

              {/* Rotary Sensor Turret Body */}
              <mesh position={[0, -0.05, 0.04]}>
                <boxGeometry args={[0.14, 0.1, 0.12]} />
                <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.2} />
              </mesh>

              {/* Tool 1: Rock Core Percussive Drill */}
              <mesh position={[0.04, -0.05, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.016, 0.018, 0.11, 12]} />
                <meshStandardMaterial color="#E2E8F0" metalness={0.95} roughness={0.15} />
              </mesh>

              {/* Tool 2: Alpha Particle X-Ray Spectrometer (APXS Contact Sensor) */}
              <mesh position={[-0.04, -0.05, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.026, 0.026, 0.06, 16]} />
                <meshStandardMaterial color="#0F172A" metalness={0.9} roughness={0.2} />
              </mesh>

              {/* Tool 3: SHERLOC UV Laser / Microscopic Imager */}
              <mesh position={[0, -0.08, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.018, 0.018, 0.05, 14]} />
                <meshStandardMaterial color="#38BDF8" metalness={0.7} roughness={0.1} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* ================= ROCKER-BOGIE SUSPENSION & 6 WHEELS ================= */}
      {/* LEFT SUSPENSION & WHEELS */}
      <SuspensionSide
        isLeft={true}
        onWheelRef={(idx, el) => {
          if (el) wheelsRef.current[idx] = el;
        }}
      />

      {/* RIGHT SUSPENSION & WHEELS */}
      <SuspensionSide
        isLeft={false}
        onWheelRef={(idx, el) => {
          if (el) wheelsRef.current[idx + 3] = el;
        }}
      />
    </group>
  );
};

interface SuspensionSideProps {
  isLeft: boolean;
  onWheelRef: (index: number, el: THREE.Group | null) => void;
}

const SuspensionSide: React.FC<SuspensionSideProps> = ({ isLeft, onWheelRef }) => {
  const sideX = isLeft ? -0.58 : 0.58;
  const sign = isLeft ? -1 : 1;

  return (
    <group position={[sideX, 0.32, 0]}>
      {/* Rocker Pivot Axis Joint */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.14, 16]} />
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Rocker Arm Tube (Slopes rearward to rear wheel) */}
      <mesh position={[0, -0.08, -0.32]} rotation={[0.42, 0, 0]}>
        <cylinderGeometry args={[0.028, 0.032, 0.75, 12]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Bogie Pivot Arm (Slopes forward to connect front and center wheels) */}
      <mesh position={[0, -0.06, 0.22]} rotation={[-0.38, 0, 0]}>
        <cylinderGeometry args={[0.026, 0.03, 0.55, 12]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* REAR WHEEL (index 0) */}
      <group position={[sign * 0.09, -0.18, -0.62]}>
        <WheelAssembly onRef={(el) => onWheelRef(0, el)} />
      </group>

      {/* MIDDLE WHEEL (index 1) */}
      <group position={[sign * 0.09, -0.18, 0.02]}>
        <WheelAssembly onRef={(el) => onWheelRef(1, el)} />
      </group>

      {/* FRONT WHEEL (index 2) */}
      <group position={[sign * 0.09, -0.18, 0.62]}>
        <WheelAssembly onRef={(el) => onWheelRef(2, el)} />
      </group>
    </group>
  );
};

interface WheelAssemblyProps {
  onRef: (el: THREE.Group | null) => void;
}

const WheelAssembly: React.FC<WheelAssemblyProps> = ({ onRef }) => {
  return (
    <group ref={onRef}>
      {/* Wheel Hub Knuckle Bracket */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.06, 0.12, 0.06]} />
        <meshStandardMaterial color="#1E293B" metalness={0.85} roughness={0.3} />
      </mesh>

      {/* Cylindrical Aluminum Wheel (Machined grousers) */}
      <group rotation={[0, 0, Math.PI / 2]}>
        {/* Main Wheel Drum */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.14, 24]} />
          <meshStandardMaterial
            color="#586679" // Machined anodized aluminum (reads clearly against dark space & Mars regolith)
            metalness={0.48}
            roughness={0.38}
          />
        </mesh>

        {/* Central Titanium Hubcap & Drive Actuator */}
        <mesh position={[0, 0.075, 0]}>
          <cylinderGeometry args={[0.06, 0.065, 0.03, 16]} />
          <meshStandardMaterial color="#D4B87C" metalness={0.65} roughness={0.28} />
        </mesh>
        <mesh position={[0, -0.075, 0]}>
          <cylinderGeometry args={[0.06, 0.065, 0.03, 16]} />
          <meshStandardMaterial color="#D4B87C" metalness={0.65} roughness={0.28} />
        </mesh>

        {/* Wheel Cleats / Grousers (Treads around perimeter) */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
          <mesh key={deg} rotation={[0, (deg * Math.PI) / 180, 0]} position={[0, 0, 0]}>
            <boxGeometry args={[0.308, 0.142, 0.01]} />
            <meshStandardMaterial color="#2C3848" metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
};
