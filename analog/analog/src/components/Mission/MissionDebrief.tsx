import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Compass,
  Globe,
  Microscope,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import type { MissionConfigState } from '../../types/mission';
import {
  MISSION_EVENT_001_OPTIONS,
  VEHICLE_LABELS,
} from '../../data/missionData';
import {
  buildMissionDebriefSummary,
} from '../../services/missionSimulationService';

interface MissionDebriefProps {
  config: MissionConfigState;
  onRestartMission: () => void;
  onModifyConfiguration: () => void;
}

export const MissionDebrief: React.FC<MissionDebriefProps> = ({
  config,
  onRestartMission,
  onModifyConfiguration,
}) => {
  const debrief = buildMissionDebriefSummary(config);
  const decisionOpt = MISSION_EVENT_001_OPTIONS.find((o) => o.id === config.decisionId);

  return (
    <div className="panel" style={{ padding: 'clamp(20px, 3.5vw, 36px)', display: 'grid', gap: 24 }}>
      {/* Debrief Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span
              className="mono"
              style={{
                fontSize: 11,
                padding: '3px 8px',
                borderRadius: 4,
                background: '#101E2B',
                color: '#7CC4E8',
                border: '1px solid #286A91',
                fontWeight: 600,
              }}
            >
              {debrief.missionCode} · DEBRIEF ARCHIVE
            </span>
            <span
              className="mono"
              style={{
                fontSize: 11,
                padding: '3px 8px',
                borderRadius: 4,
                background: 'rgba(50, 127, 121, 0.15)',
                color: 'var(--accent-teal)',
                border: '1px solid rgba(50, 127, 121, 0.3)',
                fontWeight: 600,
              }}
            >
              {debrief.assessment.missionStatus}
            </span>
          </div>

          <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 700, color: 'var(--ink-dark)', margin: '6px 0 4px' }}>
            From {debrief.earthSiteName.split(',')[0]} to {debrief.destinationName.split('(')[0]}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
            Post-mission operational evaluation, physical transfer divergences, and analog findings.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            onClick={onModifyConfiguration}
            className="btn"
            style={{ padding: '8px 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Sliders size={13} />
            <span>Modify Systems</span>
          </button>
          <button
            type="button"
            onClick={onRestartMission}
            className="btn"
            style={{ padding: '8px 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RotateCcw size={13} />
            <span>Restart Mission</span>
          </button>
        </div>
      </div>

      {/* Core Mission Configuration Grid */}
      <div
        style={{
          background: '#F7F8F6',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-md)',
          padding: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
        }}
      >
        <div>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>MISSION TEMPLATE</span>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-dark)' }}>{debrief.templateTitle}</div>
        </div>
        <div>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>VEHICLE ARCHITECTURE</span>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-dark)' }}>{debrief.vehicle}</div>
        </div>
        <div>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>TERRAIN REGIME</span>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-dark)' }}>{debrief.terrain}</div>
        </div>
        <div>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>CORE OBJECTIVE</span>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-dark)' }}>{debrief.objective}</div>
        </div>
        <div>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>ENERGY BUDGET / MARGIN</span>
          <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-blue)' }}>
            {debrief.energyAllocation}% initial ({debrief.assessment.energyMarginLabel})
          </div>
        </div>
      </div>

      {/* Side-by-side: Constant vs Changed Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* What remained constant */}
        <div
          style={{
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Compass size={17} color="var(--accent-blue)" />
            <h3 style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink-dark)', margin: 0 }}>
              1. What Remained Constant Across Worlds
            </h3>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--ink-dark)', lineHeight: 1.6 }}>
            <li>
              <strong>Vehicle Chassis:</strong> {VEHICLE_LABELS[config.vehicle].name} deployed with identical actuator kinematics.
            </li>
            <li>
              <strong>Scientific Payload:</strong> Mastcam optical imagers and contact spectrometer suites carried forward without modifications.
            </li>
            <li>
              <strong>Investigation Objective:</strong> {config.objective.replace('-', ' ')} protocol maintained across both field sites.
            </li>
            <li>
              <strong>Analytic Grounding:</strong> Terrestrial data from {debrief.earthSiteName} established the reference baseline.
            </li>
          </ul>
        </div>

        {/* What changed */}
        <div
          style={{
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Globe size={17} color="#C28B38" />
            <h3 style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink-dark)', margin: 0 }}>
              2. What Changed Fundamentally
            </h3>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--ink-dark)', lineHeight: 1.6 }}>
            <li>
              <strong>Gravitational Acceleration:</strong> Dropped from {debrief.earth.measuredGravityMs2} m/s² to{' '}
              <strong className="mono">{debrief.planet.verifiedPhysics.gravityMs2} m/s²</strong> ({debrief.planet.verifiedPhysics.gravityRelativeToEarth}), reducing wheel downforce.
            </li>
            <li>
              <strong>Atmospheric Column:</strong> Terrestrial ~900 mbar air plummeted to{' '}
              <strong className="mono">{debrief.planet.verifiedPhysics.surfacePressureMbar}</strong>.
            </li>
            <li>
              <strong>Communications Latency:</strong> Local sub-millisecond links shifted to{' '}
              <strong className="mono">{debrief.planet.verifiedPhysics.signalDelayOneWay}</strong> light lag, requiring autonomy.
            </li>
            <li>
              <strong>Thermal Shock & Power:</strong> Ambient desert temperatures yielded to cold nights and lower 1.52 AU solar flux.
            </li>
          </ul>
        </div>
      </div>

      {/* Operational Encounter & Scientific Evaluation */}
      <div
        style={{
          background: '#101E2B',
          borderRadius: 'var(--radius-md)',
          padding: 20,
          color: '#F2F5F8',
          display: 'grid',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: 10 }}>
          <span className="mono" style={{ fontSize: 11, color: '#7CC4E8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            OPERATIONAL ENCOUNTER OUTCOME
          </span>
          <span className="mono" style={{ fontSize: 11, color: '#CBD6E2' }}>
            Decision: {decisionOpt?.code ?? 'OPT-01'}
          </span>
        </div>

        <h3 style={{ fontSize: 18, fontWeight: 600, color: '#FFFFFF', margin: 0 }}>
          {debrief.assessment.decisionOutcomeHeadline}
        </h3>

        <p style={{ fontSize: 13, color: '#CBD6E2', lineHeight: 1.55, margin: 0 }}>
          {debrief.assessment.decisionExplanation}
        </p>

        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: 10,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            fontSize: 12,
          }}
        >
          <div>
            <span style={{ color: '#9FB0C1' }}>Locomotion Traversal:</span>
            <div style={{ color: '#F2F5F8', marginTop: 2 }}>{debrief.assessment.mobilityAssessment}</div>
          </div>
          <div>
            <span style={{ color: '#9FB0C1' }}>Uplink & Control Protocol:</span>
            <div style={{ color: '#F2F5F8', marginTop: 2 }}>{debrief.assessment.commsModeLabel}</div>
          </div>
        </div>
      </div>

      {/* Continuing Next Steps across Platform */}
      <div
        style={{
          borderTop: '1px solid var(--border-light)',
          paddingTop: 20,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
        }}
      >
        <div>
          <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-dark)', margin: '0 0 2px' }}>
            Continue Your Planetary Investigation
          </h4>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
            Inspect real 30 m elevation rasters in the 3D Workstation or study the analog scientific literature.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Link
            to="/learn"
            className="btn"
            style={{
              padding: '9px 16px',
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              textDecoration: 'none',
              background: '#FFFFFF',
              color: 'var(--ink-dark)',
              borderColor: 'var(--border-light)',
            }}
          >
            <BookOpen size={14} color="var(--accent-blue)" />
            <span>Study Planetary Science in Learn</span>
          </Link>

          <Link
            to="/research"
            className="btn btn--primary"
            style={{
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              textDecoration: 'none',
            }}
          >
            <Microscope size={14} />
            <span>Open Research Dual-Terrain 3D Studio</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};
