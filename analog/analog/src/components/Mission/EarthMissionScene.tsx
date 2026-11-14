import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Crosshair,
  Play,
  RotateCcw,
} from 'lucide-react';
import type { MissionConfigState } from '../../types/mission';
import { EARTH_ENVIRONMENTS, EARTH_TARGETS } from '../../data/missionData';

interface EarthMissionSceneProps {
  config: MissionConfigState;
  onBack: () => void;
  onContinueToTransfer: () => void;
}

const MISSION_STEPS = [
  'Deploy rover on Atacama baseline coordinates',
  'Traverse alluvial gravel pediment (Target A)',
  'Acquire microscopic optical imagery on nitrate crust',
  'Survey bedrock escarpment & evaluate wheel slip (Target B)',
  'Inspect smectite clay horizon & record spectral signature (Target C)',
  'Earth baseline qualification complete',
];

export const EarthMissionScene: React.FC<EarthMissionSceneProps> = ({
  config,
  onBack,
  onContinueToTransfer,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedTargetId, setSelectedTargetId] = useState<string>(EARTH_TARGETS[0]!.id);
  const earthEnv = EARTH_ENVIRONMENTS[config.earthEnvId];

  const activeTarget = EARTH_TARGETS.find((t) => t.id === selectedTargetId) ?? EARTH_TARGETS[0]!;

  const handleAdvanceStep = () => {
    if (currentStepIndex < MISSION_STEPS.length - 1) {
      const next = currentStepIndex + 1;
      setCurrentStepIndex(next);
      if (next === 1) setSelectedTargetId('e-target-1');
      else if (next === 3) setSelectedTargetId('e-target-2');
      else if (next === 4) setSelectedTargetId('e-target-3');
    }
  };

  const handleResetSim = () => {
    setCurrentStepIndex(0);
    setSelectedTargetId('e-target-1');
  };

  // Traversal coordinates along the path
  const roverPos =
    currentStepIndex === 0
      ? { x: 12, y: 78 }
      : currentStepIndex === 1
        ? { x: 24, y: 62 }
        : currentStepIndex === 2
          ? { x: 38, y: 55 }
          : currentStepIndex === 3
            ? { x: 56, y: 48 }
            : currentStepIndex === 4
              ? { x: 78, y: 31 }
              : { x: 88, y: 24 };

  const isComplete = currentStepIndex === MISSION_STEPS.length - 1;

  return (
    <div className="panel" style={{ padding: 'clamp(18px, 3vw, 28px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
        <div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            STAGE 04 · TERRESTRIAL BASELINE SIMULATION
          </div>
          <h2 style={{ fontSize: 20, color: 'var(--ink-dark)', margin: '4px 0 6px' }}>
            Earth Mission Operation: {earthEnv.name}
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 680, margin: 0 }}>
            Simulate your {config.vehicle} navigating {config.terrain} terrain in Chile to establish ground truth data before transferring to an extraterrestrial destination.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onBack}
            className="btn"
            style={{ padding: '9px 14px', fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
          <button
            type="button"
            onClick={onContinueToTransfer}
            className="btn btn--primary"
            style={{ padding: '9px 18px', fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>Transfer to Another World</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Main Simulation Viewport & Mission Telemetry */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 18,
          alignItems: 'stretch',
        }}
      >
        {/* Interactive Earth Terrain Canvas / Stage */}
        <div
          style={{
            position: 'relative',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            aspectRatio: '16 / 11',
            minHeight: 340,
            background: '#101E2B',
            border: '1px solid #294156',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)',
          }}
        >
          {/* Real Copernicus Orthophoto or Atacama Imagery background */}
          <img
            src="/data/terrains/yungay-imagery.jpg"
            alt="Atacama desert orbital imagery ground"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'brightness(0.92) contrast(1.08)',
            }}
          />

          {/* Topographic isoline graphic overlay */}
          <svg
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              opacity: 0.35,
            }}
          >
            <path
              d="M 20 280 Q 140 240, 260 250 T 480 200 T 700 140"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
            <path
              d="M 50 340 Q 220 300, 380 280 T 640 220 T 800 180"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1"
            />
          </svg>

          {/* Traversal Planned Path */}
          <svg
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          >
            <path
              d="M 12% 78% L 24% 62% L 56% 48% L 78% 31% L 88% 24%"
              fill="none"
              stroke="#C28B38"
              strokeWidth="2.5"
              strokeDasharray="5 5"
            />
          </svg>

          {/* Target Waypoint Pins */}
          {EARTH_TARGETS.map((t) => {
            const isTargetActive = t.id === selectedTargetId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTargetId(t.id)}
                style={{
                  position: 'absolute',
                  left: `${t.xFrac * 100}%`,
                  top: `${t.yFrac * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  background: isTargetActive ? '#286A91' : 'rgba(16, 30, 43, 0.88)',
                  color: '#FFFFFF',
                  border: isTargetActive ? '2px solid #FFFFFF' : '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 999,
                  padding: '3px 8px',
                  fontSize: 10.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
                  zIndex: 2,
                }}
              >
                <Crosshair size={11} color={isTargetActive ? '#FFFFFF' : '#C28B38'} />
                <span>{t.label}</span>
              </button>
            );
          })}

          {/* Animated Rover Node */}
          <div
            style={{
              position: 'absolute',
              left: `${roverPos.x}%`,
              top: `${roverPos.y}%`,
              transform: 'translate(-50%, -50%)',
              transition: 'left 0.7s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.7s cubic-bezier(0.2, 0.8, 0.2, 1)',
              zIndex: 3,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#101E2B',
                border: '2px solid #7CC4E8',
                color: '#FFFFFF',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 0 16px rgba(124, 196, 232, 0.65)',
              }}
            >
              <Bot size={20} color="#7CC4E8" />
            </div>
            <div
              className="mono"
              style={{
                position: 'absolute',
                top: 42,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(16, 30, 43, 0.92)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#FFFFFF',
                padding: '2px 6px',
                borderRadius: 3,
                fontSize: 10,
                whiteSpace: 'nowrap',
              }}
            >
              {config.vehicle.toUpperCase()} · LOC: {roverPos.x.toFixed(0)}%, {roverPos.y.toFixed(0)}%
            </div>
          </div>

          {/* Overlay Status Bar */}
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              right: 10,
              background: 'rgba(16, 30, 43, 0.88)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: 4,
              padding: '6px 10px',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 11,
              color: '#CBD6E2',
              zIndex: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="mono" style={{ color: '#7CC4E8', fontWeight: 600 }}>
                STEP {currentStepIndex + 1}/{MISSION_STEPS.length}
              </span>
              <span>{MISSION_STEPS[currentStepIndex]}</span>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={handleAdvanceStep}
                disabled={isComplete}
                className="btn btn--primary"
                style={{ padding: '3px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <Play size={11} />
                <span>{isComplete ? 'Baseline Complete' : 'Advance Rover'}</span>
              </button>
              <button
                type="button"
                onClick={handleResetSim}
                className="btn"
                style={{ padding: '3px 8px', fontSize: 11, background: '#172A3A', color: '#CBD6E2', borderColor: 'rgba(255,255,255,0.18)' }}
                title="Restart simulation sequence"
              >
                <RotateCcw size={11} />
              </button>
            </div>
          </div>
        </div>

        {/* Operational Telemetry & Geological Finding Drawer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Target Finding Card */}
          <div
            style={{
              background: '#F0F6FA',
              border: '1px solid #C4DCEB',
              borderRadius: 'var(--radius-md)',
              padding: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--accent-blue)', fontWeight: 600, letterSpacing: '0.06em' }}>
                INSPECTED TARGET · {activeTarget.label}
              </span>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 3,
                  background: 'rgba(40, 106, 145, 0.12)',
                  color: 'var(--accent-blue)',
                }}
              >
                {activeTarget.dataTag}
              </span>
            </div>

            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-dark)', margin: '0 0 6px' }}>
              {activeTarget.title}
            </h3>

            <p style={{ fontSize: 12.5, color: 'var(--ink-dark)', lineHeight: 1.5, margin: '0 0 10px' }}>
              {activeTarget.finding}
            </p>

            <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Optical Spectrometry: 98.4% SNR · Focus: Mastcam Equiv.
            </div>
          </div>

          {/* Physical Parameters Strip */}
          <div
            style={{
              background: '#101E2B',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 'var(--radius-md)',
              padding: 14,
              color: '#F2F5F8',
              display: 'grid',
              gap: 8,
              fontSize: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
              <span style={{ color: '#9FB0C1' }}>Surface Gravity:</span>
              <strong className="mono" style={{ color: '#7CC4E8' }}>9.81 m/s² (1.00 g)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
              <span style={{ color: '#9FB0C1' }}>Atmospheric Pressure:</span>
              <strong className="mono" style={{ color: '#F2F5F8' }}>~900 mbar (Terrestrial air)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
              <span style={{ color: '#9FB0C1' }}>One-Way Comm Latency:</span>
              <strong className="mono" style={{ color: '#9BE0DA' }}>&lt; 0.01 sec (Near real-time)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9FB0C1' }}>Allocated Energy Margin:</span>
              <strong className="mono" style={{ color: '#E7A95A' }}>{config.energyAllocation}% initial allocation</strong>
            </div>
          </div>

          {/* Action to proceed */}
          <button
            type="button"
            onClick={onContinueToTransfer}
            className="btn btn--primary"
            style={{
              padding: '11px 16px',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(40, 106, 145, 0.35)',
            }}
          >
            <span>Complete Earth Baseline & Transfer to Space</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
