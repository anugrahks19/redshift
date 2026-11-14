import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, MapPin, AlertCircle } from 'lucide-react';
import type { EarthEnvironmentId } from '../../types/mission';
import { EARTH_ENVIRONMENTS } from '../../data/missionData';

interface EarthEnvironmentSelectorProps {
  selectedEnvId: EarthEnvironmentId;
  onSelectEnv: (id: EarthEnvironmentId) => void;
  onBack: () => void;
  onContinue: () => void;
}

const ENV_KEYS: EarthEnvironmentId[] = ['atacama', 'antarctica', 'iceland', 'arizona'];

export const EarthEnvironmentSelector: React.FC<EarthEnvironmentSelectorProps> = ({
  selectedEnvId,
  onSelectEnv,
  onBack,
  onContinue,
}) => {
  return (
    <div className="panel" style={{ padding: 'clamp(18px, 3vw, 28px)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
        <div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            STAGE 02 · TERRESTRIAL ANALOG TESTBED
          </div>
          <h2 style={{ fontSize: 20, color: 'var(--ink-dark)', margin: '4px 0 6px' }}>
            Select an Earth Analog Environment
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 680, margin: 0 }}>
            Planetary missions begin in extreme terrestrial locations that share specific geological processes or physical stresses with other worlds.
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
            onClick={onContinue}
            className="btn btn--primary"
            style={{ padding: '9px 18px', fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>Continue to Rover Systems</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Analog Honesty Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '10px 14px',
          background: '#F0F6FA',
          border: '1px solid #C4DCEB',
          borderRadius: 4,
          marginBottom: 18,
          fontSize: 12.5,
          color: '#172A3A',
        }}
      >
        <AlertCircle size={16} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong>Scientific Distinction:</strong> Terrestrial analogs share targeted geological processes or sensory conditions (e.g. multi-million-year hyperaridity, basalt weathering, cold desert permafrost) but remain fundamentally distinct in atmospheric pressure, global biology, and gravity.
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label="Earth Environment Testbed Options"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        {ENV_KEYS.map((key) => {
          const item = EARTH_ENVIRONMENTS[key];
          const isSelected = item.id === selectedEnvId;
          const isPrimary = item.supportLevel === 'primary';

          return (
            <div
              key={item.id}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onSelectEnv(item.id)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onSelectEnv(item.id);
                }
              }}
              style={{
                border: isSelected ? '2px solid var(--accent-blue)' : '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: isSelected ? '0 4px 18px rgba(40, 106, 145, 0.16)' : 'none',
                transition: 'border-color 0.15s ease',
              }}
            >
              {/* Visual Frame */}
              <div
                style={{
                  height: 130,
                  position: 'relative',
                  background: item.terrainPalette.skyTop,
                  overflow: 'hidden',
                }}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: `linear-gradient(135deg, ${item.terrainPalette.skyTop} 0%, ${item.terrainPalette.base} 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 12,
                      textAlign: 'center',
                    }}
                  >
                    <span className="mono" style={{ fontSize: 11, color: '#FFFFFF', opacity: 0.9 }}>
                      {item.environmentType}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    background: 'rgba(16, 30, 43, 0.88)',
                    borderRadius: 3,
                    padding: '3px 7px',
                    fontSize: 10.5,
                    color: '#FFFFFF',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <MapPin size={11} color="#C28B38" />
                  <span>{item.locationLabel.split(',')[0]}</span>
                </div>

                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: isSelected ? 'var(--accent-blue)' : 'rgba(16, 30, 43, 0.72)',
                    borderRadius: '50%',
                    width: 22,
                    height: 22,
                    display: 'grid',
                    placeItems: 'center',
                    color: '#FFFFFF',
                  }}
                >
                  {isSelected ? <CheckCircle2 size={15} /> : null}
                </div>
              </div>

              {/* Information Body */}
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, flex: 1, justifyContent: 'space-between' }}>
                <div>
                  <div
                    style={{
                      display: 'inline-block',
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 3,
                      marginBottom: 6,
                      background: isPrimary ? 'rgba(50, 127, 121, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                      color: isPrimary ? 'var(--accent-teal)' : 'var(--text-muted)',
                      border: `1px solid ${isPrimary ? 'rgba(50, 127, 121, 0.28)' : 'rgba(100, 116, 139, 0.22)'}`,
                    }}
                  >
                    {item.supportLabel}
                  </div>

                  <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-dark)', margin: '0 0 4px' }}>
                    {item.name}
                  </h3>

                  <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                    {item.coordinatesLabel}
                  </div>

                  <p style={{ fontSize: 12, color: 'var(--ink-dark)', lineHeight: 1.45, margin: '0 0 8px' }}>
                    {item.whyScientistsStudy}
                  </p>
                </div>

                <div
                  style={{
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: 8,
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    display: 'grid',
                    gap: 3,
                  }}
                >
                  <div>
                    Gravity: <strong className="mono" style={{ color: 'var(--ink-dark)' }}>{item.measuredGravityMs2} m/s²</strong>
                  </div>
                  <div>
                    Pressure: <strong className="mono" style={{ color: 'var(--ink-dark)' }}>{item.measuredPressureMbar}</strong>
                  </div>
                  <div>
                    Elevation: <span style={{ color: 'var(--ink-dark)' }}>{item.elevationSummary.split('(')[0]}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

