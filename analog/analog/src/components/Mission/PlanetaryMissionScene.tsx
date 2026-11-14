import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Play,
  RotateCcw,
} from 'lucide-react';
import type { ComparisonFactorId, MissionConfigState } from '../../types/mission';
import {
  COMPARISON_FACTORS,
  EARTH_ENVIRONMENTS,
  MARS_TARGETS,
  PLANETARY_DESTINATIONS,
} from '../../data/missionData';

interface PlanetaryMissionSceneProps {
  config: MissionConfigState;
  onBack: () => void;
  onContinueToChallenge: () => void;
}

const MARS_STEPS = [
  'Touchdown in Gale Crater (Murray Formation Flank)',
  'Traverse ferric sand ripple corridor in 0.38 g (Target M1)',
  'Autonomous hazard avoidance scan across rock outcrop (Target M2)',
  'Inspect Vera Rubin Ridge hematite contact & sample smectite horizon (Target M3)',
  'Planetary survey sequence completed',
];

export const PlanetaryMissionScene: React.FC<PlanetaryMissionSceneProps> = ({
  config,
  onBack,
  onContinueToChallenge,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedTargetId, setSelectedTargetId] = useState<string>(MARS_TARGETS[0]!.id);
  const [activeFactorId, setActiveFactorId] = useState<ComparisonFactorId>('mobility');
  const [expandedScience, setExpandedScience] = useState(false);

  const earthEnv = EARTH_ENVIRONMENTS[config.earthEnvId];
  const planet = PLANETARY_DESTINATIONS[config.destination];
  const activeTarget = MARS_TARGETS.find((t) => t.id === selectedTargetId) ?? MARS_TARGETS[0]!;
  const factor = COMPARISON_FACTORS.find((f) => f.id === activeFactorId) ?? COMPARISON_FACTORS[0]!;

  const handleAdvanceStep = () => {
    if (currentStepIndex < MARS_STEPS.length - 1) {
      const next = currentStepIndex + 1;
      setCurrentStepIndex(next);
      if (next === 1) setSelectedTargetId('m-target-1');
      else if (next === 2) setSelectedTargetId('m-target-2');
      else if (next === 3) setSelectedTargetId('m-target-3');
    }
  };

  const handleResetSim = () => {
    setCurrentStepIndex(0);
    setSelectedTargetId('m-target-1');
  };

  const roverPos =
    currentStepIndex === 0
      ? { x: 14, y: 76 }
      : currentStepIndex === 1
        ? { x: 26, y: 64 }
        : currentStepIndex === 2
          ? { x: 56, y: 45 }
          : currentStepIndex === 3
            ? { x: 78, y: 30 }
            : { x: 88, y: 22 };

  const isComplete = currentStepIndex === MARS_STEPS.length - 1;

  return (
    <div className="panel" style={{ padding: 'clamp(18px, 3vw, 28px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
        <div>
          <div className="mono" style={{ fontSize: 11, color: '#C28B38', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            STAGE 06 · EXTRATERRESTRIAL MISSION SIMULATION
          </div>
          <h2 style={{ fontSize: 20, color: 'var(--ink-dark)', margin: '4px 0 6px' }}>
            {planet.name} Surface Operations: {planet.siteName}
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 680, margin: 0 }}>
            Your same {config.vehicle} is now operating on {planet.name}. Compare how physics, atmosphere, and communications latency change surface operations compared to {earthEnv.name}.
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
            <span>Transfer Stage</span>
          </button>
          <button
            type="button"
            onClick={onContinueToChallenge}
            className="btn btn--primary"
            style={{ padding: '9px 18px', fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>Encounter Challenge</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Main Viewport & Telemetry Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 18,
          marginBottom: 20,
        }}
      >
        {/* Extraterrestrial Terrain Stage */}
        <div
          style={{
            position: 'relative',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            aspectRatio: '16 / 11',
            minHeight: 340,
            background: '#1A0E0A',
            border: '1px solid #5A2A1A',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6)',
          }}
        >
          {/* Real USGS HiRISE LRGB Orthophoto Background for Gale */}
          <img
            src={config.destination === 'mars' ? '/data/terrains/gale-hirise.jpg' : '/data/terrains/gale-bradbury-hirise.jpg'}
            alt="Mars Gale Crater HiRISE LRGB orbital orthophoto ground"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: config.destination === 'moon' ? 'grayscale(1) contrast(1.2)' : 'brightness(0.96) contrast(1.15)',
            }}
          />

          {/* Thin Martian Atmospheric Haze Overlay */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: config.destination === 'mars'
                ? 'linear-gradient(180deg, rgba(201, 132, 91, 0.22) 0%, rgba(169, 92, 58, 0.08) 50%, rgba(26, 14, 10, 0.3) 100%)'
                : 'linear-gradient(180deg, rgba(16, 30, 43, 0.35) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />

          {/* Traversal Line */}
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
              d="M 14% 76% L 26% 64% L 56% 45% L 78% 30% L 88% 22%"
              fill="none"
              stroke="#F2F5F8"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />
          </svg>

          {/* Planetary Target Markers */}
          {MARS_TARGETS.map((t) => {
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
                  background: isTargetActive ? '#C28B38' : 'rgba(23, 14, 10, 0.9)',
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
                <Crosshair size={11} color="#FFFFFF" />
                <span>{t.label}</span>
              </button>
            );
          })}

          {/* Rover Vehicle on Mars */}
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
                background: '#1A0E0A',
                border: '2px solid #E7A95A',
                color: '#FFFFFF',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 0 16px rgba(231, 169, 90, 0.65)',
              }}
            >
              <Bot size={20} color="#E7A95A" />
            </div>
            <div
              className="mono"
              style={{
                position: 'absolute',
                top: 42,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(26, 14, 10, 0.94)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#FFFFFF',
                padding: '2px 6px',
                borderRadius: 3,
                fontSize: 10,
                whiteSpace: 'nowrap',
              }}
            >
              0.38 g DOWNFORCE · AUTONOMOUS SLIP MONITOR
            </div>
          </div>

          {/* Bottom Step Progress & Controls */}
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              right: 10,
              background: 'rgba(26, 14, 10, 0.92)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
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
              <span className="mono" style={{ color: '#E7A95A', fontWeight: 600 }}>
                STEP {currentStepIndex + 1}/{MARS_STEPS.length}
              </span>
              <span>{MARS_STEPS[currentStepIndex]}</span>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={handleAdvanceStep}
                disabled={isComplete}
                className="btn btn--primary"
                style={{ padding: '3px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, background: '#C28B38', borderColor: '#C28B38' }}
              >
                <Play size={11} />
                <span>{isComplete ? 'Survey Complete' : 'Command Next Sol'}</span>
              </button>
              <button
                type="button"
                onClick={handleResetSim}
                className="btn"
                style={{ padding: '3px 8px', fontSize: 11, background: '#24140D', color: '#CBD6E2', borderColor: 'rgba(255,255,255,0.18)' }}
                title="Restart simulation sequence"
              >
                <RotateCcw size={11} />
              </button>
            </div>
          </div>
        </div>

        {/* Mars Finding & Telemetry Drawer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Active Target Card */}
          <div
            style={{
              background: '#FDF6EE',
              border: '1px solid #E6D2B8',
              borderRadius: 'var(--radius-md)',
              padding: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span className="mono" style={{ fontSize: 10.5, color: '#C28B38', fontWeight: 600, letterSpacing: '0.06em' }}>
                GALE CRATER TARGET · {activeTarget.label}
              </span>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 3,
                  background: 'rgba(194, 139, 56, 0.15)',
                  color: '#9C6618',
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
              Provenance: USGS MSL 1 m DEM resampled to 30 m · MOLA Areoid
            </div>
          </div>

          {/* Extraterrestrial Physical Reality Bar */}
          <div
            style={{
              background: '#1A0E0A',
              border: '1px solid rgba(231, 169, 90, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: 14,
              color: '#F2F5F8',
              display: 'grid',
              gap: 8,
              fontSize: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
              <span style={{ color: '#E7A95A' }}>Extraterrestrial Gravity:</span>
              <strong className="mono" style={{ color: '#F2F5F8' }}>{planet.verifiedPhysics.gravityMs2} m/s² ({planet.verifiedPhysics.gravityRelativeToEarth})</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
              <span style={{ color: '#E7A95A' }}>Atmospheric Density:</span>
              <strong className="mono" style={{ color: '#F2F5F8' }}>{planet.verifiedPhysics.surfacePressureMbar}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
              <span style={{ color: '#E7A95A' }}>One-Way Radio Light Lag:</span>
              <strong className="mono" style={{ color: '#F2F5F8' }}>{planet.verifiedPhysics.signalDelayOneWay}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#E7A95A' }}>Thermal Environment:</span>
              <strong className="mono" style={{ color: '#F2F5F8' }}>{planet.verifiedPhysics.meanTemperatureC}</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={onContinueToChallenge}
            className="btn btn--primary"
            style={{
              padding: '11px 16px',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: '#C28B38',
              borderColor: '#C28B38',
            }}
          >
            <span>Proceed to Encounter Mission Challenge</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Interactive Visual Comparison: Earth Analog vs Extraterrestrial Reality */}
      <div
        style={{
          borderTop: '1px solid var(--border-light)',
          paddingTop: 18,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              INTERACTIVE ENVIRONMENTAL COMPARISON
            </span>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-dark)', margin: '2px 0 0' }}>
              How Does {earthEnv.name} Compare with {planet.name}?
            </h3>
          </div>

          {/* Factor switcher buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {COMPARISON_FACTORS.map((f) => {
              const isActive = f.id === activeFactorId;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFactorId(f.id)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: isActive ? '1px solid var(--accent-blue)' : '1px solid var(--border-light)',
                    background: isActive ? 'var(--bg-navy)' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : 'var(--ink-dark)',
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Side-by-side factor comparison card */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: 14,
            background: '#F7F8F6',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
          }}
        >
          {/* Earth column */}
          <div style={{ borderLeft: '3px solid var(--accent-blue)', paddingLeft: 12 }}>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--accent-blue)', textTransform: 'uppercase' }}>
              EARTH ANALOG ({earthEnv.name.split(',')[0]})
            </span>
            <h4 style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink-dark)', margin: '4px 0 6px' }}>
              {factor.earthTitle}
            </h4>
            <p style={{ fontSize: 12.5, color: 'var(--ink-dark)', lineHeight: 1.5, margin: 0 }}>
              {factor.earthSummary}
            </p>
          </div>

          {/* Destination column */}
          <div style={{ borderLeft: '3px solid #C28B38', paddingLeft: 12 }}>
            <span className="mono" style={{ fontSize: 10.5, color: '#C28B38', textTransform: 'uppercase' }}>
              PLANETARY DESTINATION ({planet.name.toUpperCase()})
            </span>
            <h4 style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink-dark)', margin: '4px 0 6px' }}>
              {config.destination === 'moon' ? factor.moonTitle : factor.marsTitle}
            </h4>
            <p style={{ fontSize: 12.5, color: 'var(--ink-dark)', lineHeight: 1.5, margin: 0 }}>
              {config.destination === 'moon' ? factor.moonSummary : factor.marsSummary}
            </p>
          </div>
        </div>

        {/* Expandable Understand the Science Drawer */}
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={() => setExpandedScience((v) => !v)}
            style={{
              background: 'none',
              border: 0,
              padding: 0,
              color: 'var(--accent-blue)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>Understand the scientific principles behind {factor.label}</span>
            {expandedScience ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {expandedScience && (
            <div
              style={{
                marginTop: 8,
                padding: 12,
                borderRadius: 4,
                background: '#FFFFFF',
                border: '1px solid var(--border-subtle)',
                fontSize: 12,
                color: 'var(--ink-dark)',
                lineHeight: 1.55,
              }}
            >
              <p style={{ margin: '0 0 6px' }}>{factor.scienceDetail}</p>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                Citation note: {factor.scienceSourceNote}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
