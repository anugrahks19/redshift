import React from 'react';
import { ArrowRight, CheckCircle2, Layers, Compass, Cpu, Landmark } from 'lucide-react';
import type { MissionTemplateId } from '../../types/mission';
import { MISSION_TEMPLATES } from '../../data/missionData';

interface MissionTemplateSelectorProps {
  selectedTemplateId: MissionTemplateId;
  onSelectTemplate: (id: MissionTemplateId) => void;
  onContinue: () => void;
}

const TEMPLATE_ICONS: Record<MissionTemplateId, React.ReactNode> = {
  'rock-explorer': <Layers size={22} color="#C28B38" />,
  'ancient-water': <Compass size={22} color="#7CC4E8" />,
  'rover-engineer': <Cpu size={22} color="#327F79" />,
  'base-builder': <Landmark size={22} color="#7666A5" />,
};

export const MissionTemplateSelector: React.FC<MissionTemplateSelectorProps> = ({
  selectedTemplateId,
  onSelectTemplate,
  onContinue,
}) => {
  return (
    <div className="panel" style={{ padding: 'clamp(18px, 3vw, 28px)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
        <div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            STAGE 01 · MISSION OBJECTIVE TEMPLATE
          </div>
          <h2 style={{ fontSize: 20, color: 'var(--ink-dark)', margin: '4px 0 6px' }}>
            Select Your Mission Focus
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 680, margin: 0 }}>
            Choose the core scientific or engineering objective of your expedition. The primary scenario (Rock Explorer) provides full end-to-end Earth and Mars simulation.
          </p>
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="btn btn--primary"
          style={{ padding: '9px 18px', fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <span>Continue to Earth Environment</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <div
        role="radiogroup"
        aria-label="Mission Template Options"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        {MISSION_TEMPLATES.map((item) => {
          const isSelected = item.id === selectedTemplateId;
          const isFullSupport = item.supportLevel === 'full';

          return (
            <div
              key={item.id}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onSelectTemplate(item.id)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onSelectTemplate(item.id);
                }
              }}
              style={{
                border: isSelected
                  ? '2px solid var(--accent-blue)'
                  : '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
                background: isSelected ? '#F0F6FA' : '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 14,
                boxShadow: isSelected ? '0 4px 16px rgba(40, 106, 145, 0.16)' : 'none',
                position: 'relative',
                transition: 'border-color 0.15s ease, background 0.15s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 6,
                        background: '#101E2B',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      {TEMPLATE_ICONS[item.id]}
                    </div>
                    <div>
                      <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                        {item.code}
                      </span>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-dark)' }}>
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  {isSelected ? (
                    <CheckCircle2 size={18} color="var(--accent-blue)" />
                  ) : (
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        border: '1.5px solid var(--border-light)',
                      }}
                    />
                  )}
                </div>

                <div
                  style={{
                    display: 'inline-block',
                    fontSize: 10.5,
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: 3,
                    marginBottom: 10,
                    background: isFullSupport ? 'rgba(50, 127, 121, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                    color: isFullSupport ? 'var(--accent-teal)' : 'var(--text-muted)',
                    border: `1px solid ${isFullSupport ? 'rgba(50, 127, 121, 0.28)' : 'rgba(100, 116, 139, 0.22)'}`,
                  }}
                >
                  {item.supportLabel}
                </div>

                <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-dark)', marginBottom: 6, lineHeight: 1.45 }}>
                  {item.objectiveSummary}
                </p>

                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                  {item.description}
                </p>
              </div>

              <div>
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {item.emphasisTags.map((tag) => (
                    <span
                      key={tag}
                      className="mono"
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        background: '#E8ECEF',
                        borderRadius: 3,
                        color: 'var(--ink-dark)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

