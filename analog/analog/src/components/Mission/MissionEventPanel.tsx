import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import type { DecisionOptionId, MissionConfigState } from '../../types/mission';
import { MISSION_EVENT_001_OPTIONS, PLANETARY_DESTINATIONS } from '../../data/missionData';
import { computeMissionAssessment } from '../../services/missionSimulationService';

interface MissionEventPanelProps {
  config: MissionConfigState;
  onSelectDecision: (id: DecisionOptionId) => void;
  onBack: () => void;
  onContinueToDebrief: () => void;
}

export const MissionEventPanel: React.FC<MissionEventPanelProps> = ({
  config,
  onSelectDecision,
  onBack,
  onContinueToDebrief,
}) => {
  const planet = PLANETARY_DESTINATIONS[config.destination];
  const assessment = computeMissionAssessment(config);
  const selectedDecision = MISSION_EVENT_001_OPTIONS.find((o) => o.id === config.decisionId) ?? null;

  return (
    <div className="panel" style={{ padding: 'clamp(18px, 3vw, 28px)' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
        <div>
          <div className="mono" style={{ fontSize: 11, color: '#B64A34', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            STAGE 07 · OPERATIONAL ENCOUNTER & DECISION
          </div>
          <h2 style={{ fontSize: 20, color: 'var(--ink-dark)', margin: '4px 0 6px' }}>
            Mission Event 001: Steep Rocky Slope Detected
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 680, margin: 0 }}>
            On route to the primary clay-bearing bedrock outcrop in Gale Crater, your Hazcam detects a ~24° rocky talus escarpment. How do you instruct your vehicle?
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
            <span>Simulation</span>
          </button>
          <button
            type="button"
            onClick={onContinueToDebrief}
            disabled={!config.decisionId}
            className="btn btn--primary"
            style={{
              padding: '9px 18px',
              fontSize: 13.5,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>Generate Mission Debrief</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Context telemetry banner */}
      <div
        style={{
          background: '#FFF9ED',
          border: '1px solid #ECCB94',
          borderRadius: 4,
          padding: '10px 14px',
          marginBottom: 20,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          fontSize: 12.5,
          color: '#5C3D0E',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} color="#C28B38" />
          <span>
            <strong>Environmental Challenge:</strong> In {planet.verifiedPhysics.gravityRelativeToEarth} gravity, wheel traction is ~62% lower than on Earth. Signal latency ({planet.verifiedPhysics.signalDelayOneWay}) prevents real-time joystick intervention.
          </span>
        </div>
        <div className="mono" style={{ fontSize: 11.5, fontWeight: 600 }}>
          Allocated Power: {config.energyAllocation}%
        </div>
      </div>

      {/* Decision Options Grid */}
      <div
        role="radiogroup"
        aria-label="Mission Event Decision Options"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {MISSION_EVENT_001_OPTIONS.map((opt) => {
          const isSelected = config.decisionId === opt.id;

          return (
            <div
              key={opt.id}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onSelectDecision(opt.id)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onSelectDecision(opt.id);
                }
              }}
              style={{
                border: isSelected ? '2px solid var(--accent-blue)' : '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
                background: isSelected ? '#F0F6FA' : '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 14,
                boxShadow: isSelected ? '0 4px 18px rgba(40, 106, 145, 0.16)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {opt.code}
                  </span>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: isSelected ? '5px solid var(--accent-blue)' : '1.5px solid var(--border-light)',
                      background: '#FFFFFF',
                    }}
                  />
                </div>

                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-dark)', margin: '0 0 6px', lineHeight: 1.35 }}>
                  {opt.title}
                </h3>

                <p style={{ fontSize: 12.5, color: 'var(--ink-dark)', margin: '0 0 12px', lineHeight: 1.45 }}>
                  {opt.actionSummary}
                </p>

                {/* Pros and Cons */}
                <div style={{ display: 'grid', gap: 6, fontSize: 12 }}>
                  <div style={{ color: '#205777' }}>
                    <strong>Advantages:</strong>
                    <ul style={{ margin: '2px 0 0', paddingLeft: 16 }}>
                      {opt.advantages.map((adv, i) => (
                        <li key={i}>{adv}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ color: '#8A3222', marginTop: 4 }}>
                    <strong>Trade-offs:</strong>
                    <ul style={{ margin: '2px 0 0', paddingLeft: 16 }}>
                      {opt.disadvantages.map((dis, i) => (
                        <li key={i}>{dis}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div
                className="mono"
                style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: 10,
                  fontSize: 11,
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: 'var(--text-muted)',
                }}
              >
                <span>Draw: {opt.illustrativeEnergyDelta}%</span>
                <span>{opt.illustrativeTimeCost.split('(')[0]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Decision Consequence Resolution */}
      {selectedDecision && (
        <div
          style={{
            background: '#101E2B',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            color: '#F2F5F8',
            display: 'grid',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8 }}>
            <span className="mono" style={{ fontSize: 11, color: '#7CC4E8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              TELEMETRY RESOLUTION & MISSION CONSEQUENCE
            </span>
            <span
              className="mono"
              style={{
                fontSize: 11,
                padding: '2px 7px',
                borderRadius: 4,
                background: assessment.illustrativeReserveAfterOps > 15 ? 'rgba(50, 127, 121, 0.35)' : 'rgba(194, 139, 56, 0.35)',
                color: '#FFFFFF',
              }}
            >
              Reserve: ~{assessment.illustrativeReserveAfterOps}% Post-Event
            </span>
          </div>

          <h4 style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF', margin: 0 }}>
            {assessment.decisionOutcomeHeadline}
          </h4>

          <p style={{ fontSize: 13, color: '#CBD6E2', lineHeight: 1.5, margin: 0 }}>
            {assessment.decisionExplanation}
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 6 }}>
            <button
              type="button"
              onClick={onContinueToDebrief}
              className="btn btn--primary"
              style={{ padding: '8px 16px', fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span>View Comprehensive Mission Debrief</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
