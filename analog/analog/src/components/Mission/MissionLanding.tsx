import React from 'react';
import { ArrowRight, Compass, Globe, Sparkles, ShieldCheck } from 'lucide-react';

interface MissionLandingProps {
  onBegin: () => void;
  onSampleMission: () => void;
}

export const MissionLanding: React.FC<MissionLandingProps> = ({ onBegin, onSampleMission }) => {
  return (
    <section
      aria-labelledby="mission-entry-heading"
      style={{
        background: 'linear-gradient(180deg, #101E2B 0%, #172A3A 60%, #101E2B 100%)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: 'var(--radius-md)',
        color: '#F2F5F8',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Background subtle orbital grid lines */}
      <svg
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.14,
          pointerEvents: 'none',
        }}
      >
        <defs>
          <pattern id="mission-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#7CC4E8" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mission-grid)" />
        <circle cx="85%" cy="30%" r="220" fill="none" stroke="#C28B38" strokeWidth="1" strokeDasharray="4 6" />
        <circle cx="15%" cy="80%" r="180" fill="none" stroke="#286A91" strokeWidth="1" strokeDasharray="3 5" />
      </svg>

      <div
        style={{
          position: 'relative',
          padding: 'clamp(32px, 5vw, 64px) clamp(20px, 4vw, 48px)',
          maxWidth: 1100,
          margin: '0 auto',
          display: 'grid',
          gap: 24,
        }}
      >
        {/* Editorial Sub-Header Banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#7CC4E8',
              background: 'rgba(40, 106, 145, 0.28)',
              border: '1px solid rgba(124, 196, 232, 0.35)',
              padding: '4px 10px',
              borderRadius: 4,
              fontWeight: 600,
            }}
          >
            NASA SPACE APPS 2026 · EXPLORATION WORKSTATION
          </span>
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: '#C28B38',
              background: 'rgba(194, 139, 56, 0.15)',
              border: '1px solid rgba(194, 139, 56, 0.35)',
              padding: '4px 9px',
              borderRadius: 4,
            }}
          >
            STAGE-GATE MISSION SIMULATOR
          </span>
        </div>

        <div>
          <h1
            id="mission-entry-heading"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(32px, 5.2vw, 56px)',
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              color: '#FFFFFF',
              margin: '0 0 16px',
            }}
          >
            LAUNCH YOUR MISSION
          </h1>

          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(18px, 2.4vw, 24px)',
              fontWeight: 500,
              color: '#E8ECEF',
              lineHeight: 1.35,
              maxWidth: 780,
              margin: '0 0 14px',
            }}
          >
            Your mission starts on Earth. Its next destination could be another world.
          </p>

          <p
            style={{
              fontSize: 'clamp(14px, 1.6vw, 16.5px)',
              color: '#B6C7D8',
              maxWidth: 720,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Design a robotic exploration mission, test it in an Earth environment, and discover how the same mission would adapt to Mars or the Moon.
          </p>
        </div>

        {/* Primary and Secondary Action Cluster */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, paddingTop: 8 }}>
          <button
            type="button"
            onClick={onBegin}
            className="btn btn--primary"
            style={{
              padding: '12px 24px',
              fontSize: 15,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 18px rgba(40, 106, 145, 0.45)',
            }}
          >
            <span>Begin Mission Design</span>
            <ArrowRight size={17} />
          </button>

          <button
            type="button"
            onClick={onSampleMission}
            className="btn"
            style={{
              padding: '12px 20px',
              fontSize: 14.5,
              background: '#1A3042',
              color: '#F2F5F8',
              borderColor: 'rgba(255, 255, 255, 0.22)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Sparkles size={16} color="#C28B38" />
            <span>Explore a Sample Mission (Rock Explorer · Atacama → Mars)</span>
          </button>
        </div>

        {/* Scientific Workflow Architecture Strip */}
        <div
          style={{
            marginTop: 16,
            paddingTop: 24,
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', gap: 10 }}>
            <Compass size={20} color="#7CC4E8" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: '#FFFFFF', marginBottom: 2 }}>
                1. Terrestrial Ground Truth
              </div>
              <div style={{ fontSize: 12.5, color: '#9FB0C1', lineHeight: 1.45 }}>
                Deploy across validated Earth analogs to establish rock, mobility, and instrumentation baselines.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Globe size={20} color="#E7A95A" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: '#FFFFFF', marginBottom: 2 }}>
                2. Interplanetary Transfer
              </div>
              <div style={{ fontSize: 12.5, color: '#9FB0C1', lineHeight: 1.45 }}>
                Transfer the identical hardware package to Mars or the Moon to see physics and environmental variables diverge.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <ShieldCheck size={20} color="#327F79" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: '#FFFFFF', marginBottom: 2 }}>
                3. Scientific Integrity
              </div>
              <div style={{ fontSize: 12.5, color: '#9FB0C1', lineHeight: 1.45 }}>
                Verified planetary constants separated from illustrative simulation parameters without fabricated data.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

