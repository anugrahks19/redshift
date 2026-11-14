import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Globe,
  Rocket,
} from 'lucide-react';
import type { DestinationPlanetId, MissionConfigState } from '../../types/mission';
import {
  EARTH_ENVIRONMENTS,
  PLANETARY_DESTINATIONS,
  VEHICLE_LABELS,
} from '../../data/missionData';

interface InterplanetaryTransferProps {
  config: MissionConfigState;
  onSelectDestination: (dest: DestinationPlanetId) => void;
  onBack: () => void;
  onExecuteTransfer: () => void;
}

export const InterplanetaryTransfer: React.FC<InterplanetaryTransferProps> = ({
  config,
  onSelectDestination,
  onBack,
  onExecuteTransfer,
}) => {
  const earthEnv = EARTH_ENVIRONMENTS[config.earthEnvId];
  const targetPlanet = PLANETARY_DESTINATIONS[config.destination];

  return (
    <div
      style={{
        background: '#101E2B',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        borderRadius: 'var(--radius-md)',
        color: '#F2F5F8',
        padding: 'clamp(20px, 4vw, 36px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
        <div>
          <div className="mono" style={{ fontSize: 11, color: '#7CC4E8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            STAGE 05 · INTERPLANETARY TRANSFER
          </div>
          <h2 style={{ fontSize: 'clamp(22px, 3.2vw, 32px)', fontWeight: 700, color: '#FFFFFF', margin: '4px 0 6px' }}>
            Take This Mission to Another World
          </h2>
          <p style={{ fontSize: 14, color: '#B6C7D8', maxWidth: 740, margin: 0, lineHeight: 1.5 }}>
            Your robotic architecture proved its baseline in {earthEnv.name}. Now deploy the <em>identical</em> vehicle configuration into an extraterrestrial environment to see how physical laws and operational conditions diverge.
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="btn"
          style={{ padding: '8px 14px', fontSize: 13, background: '#172A3A', color: '#CBD6E2', borderColor: 'rgba(255,255,255,0.18)' }}
        >
          <ArrowLeft size={14} />
          <span>Back to Earth Simulation</span>
        </button>
      </div>

      {/* Destination Chooser: Mars vs Moon */}
      <div style={{ marginBottom: 24 }}>
        <div className="mono" style={{ fontSize: 11, color: '#9FB0C1', textTransform: 'uppercase', marginBottom: 8 }}>
          SELECT PLANETARY DESTINATION:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {(['mars', 'moon'] as const).map((destKey) => {
            const dest = PLANETARY_DESTINATIONS[destKey];
            const isSelected = config.destination === destKey;
            const isMars = destKey === 'mars';

            return (
              <div
                key={destKey}
                onClick={() => onSelectDestination(destKey)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    onSelectDestination(destKey);
                  }
                }}
                style={{
                  border: isSelected
                    ? `2px solid ${isMars ? '#E7A95A' : '#7CC4E8'}`
                    : '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                  background: isSelected
                    ? isMars
                      ? 'rgba(194, 139, 56, 0.15)'
                      : 'rgba(40, 106, 145, 0.2)'
                    : '#132434',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12,
                  boxShadow: isSelected ? '0 4px 18px rgba(0,0,0,0.45)' : 'none',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                      {dest.name}
                    </h3>
                    <span
                      className="mono"
                      style={{
                        fontSize: 10,
                        padding: '2px 7px',
                        borderRadius: 3,
                        background: isMars ? 'rgba(194, 139, 56, 0.25)' : 'rgba(100, 116, 139, 0.3)',
                        color: isMars ? '#F0C77B' : '#CBD6E2',
                      }}
                    >
                      {dest.supportLabel}
                    </span>
                  </div>

                  <div className="mono" style={{ fontSize: 11.5, color: '#9FB0C1', marginBottom: 6 }}>
                    {dest.siteName}
                  </div>

                  <p style={{ fontSize: 12.5, color: '#D4DCE3', margin: '0 0 10px', lineHeight: 1.45 }}>
                    {dest.tagline}
                  </p>
                </div>

                <div
                  className="mono"
                  style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    paddingTop: 8,
                    fontSize: 11,
                    color: '#9FB0C1',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Transit: {dest.transferDurationNote}</span>
                  <span>{dest.transferDistanceLabel.split('(')[0]}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* What Stays Constant vs What Changes Matrix */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Constant hardware package */}
        <div
          style={{
            background: '#152534',
            border: '1px solid rgba(124, 196, 232, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Compass size={17} color="#7CC4E8" />
            <span className="mono" style={{ fontSize: 11, color: '#7CC4E8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              WHAT REMAINS IDENTICAL (YOUR SYSTEM)
            </span>
          </div>

          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#E8ECEF', lineHeight: 1.6 }}>
            <li>
              <strong>Vehicle:</strong> {VEHICLE_LABELS[config.vehicle].name} ({config.vehicle.toUpperCase()})
            </li>
            <li>
              <strong>Chassis / Suspension:</strong> Unmodified terramechanic footprint
            </li>
            <li>
              <strong>Mission Objective:</strong> {config.objective.replace('-', ' ').toUpperCase()}
            </li>
            <li>
              <strong>Allocated Energy Budget:</strong> {config.energyAllocation}% initial reserve
            </li>
          </ul>
        </div>

        {/* What changes fundamentally */}
        <div
          style={{
            background: '#152534',
            border: '1px solid rgba(231, 169, 90, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Globe size={17} color="#E7A95A" />
            <span className="mono" style={{ fontSize: 11, color: '#E7A95A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              WHAT CHANGES IN {targetPlanet.name.toUpperCase()}
            </span>
          </div>

          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#E8ECEF', lineHeight: 1.6 }}>
            <li>
              <strong>Surface Gravity:</strong> {earthEnv.measuredGravityMs2} m/s² →{' '}
              <strong style={{ color: '#E7A95A' }}>{targetPlanet.verifiedPhysics.gravityMs2} m/s²</strong> ({targetPlanet.verifiedPhysics.gravityRelativeToEarth})
            </li>
            <li>
              <strong>Atmospheric Pressure:</strong> {earthEnv.measuredPressureMbar} →{' '}
              <strong style={{ color: '#E7A95A' }}>{targetPlanet.verifiedPhysics.surfacePressureMbar}</strong>
            </li>
            <li>
              <strong>Communication Delay:</strong> &lt; 0.01 sec →{' '}
              <strong style={{ color: '#E7A95A' }}>{targetPlanet.verifiedPhysics.signalDelayOneWay}</strong>
            </li>
            <li>
              <strong>Temperature Range:</strong> {earthEnv.ambientTempRangeC} →{' '}
              <strong style={{ color: '#E7A95A' }}>{targetPlanet.verifiedPhysics.meanTemperatureC}</strong>
            </li>
          </ul>
        </div>
      </div>

      {/* Prominent Transfer CTA */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ fontSize: 12, color: '#9FB0C1' }}>
          <em>Provenance:</em> {targetPlanet.verifiedPhysics.sourceNote}
        </div>

        <button
          type="button"
          onClick={onExecuteTransfer}
          className="btn btn--primary"
          style={{
            padding: '13px 26px',
            fontSize: 15,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: config.destination === 'mars' ? '#C28B38' : '#286A91',
            borderColor: config.destination === 'mars' ? '#C28B38' : '#286A91',
            color: '#0D1924',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          <Rocket size={18} />
          <span>TAKE THIS MISSION TO {targetPlanet.name.toUpperCase()}</span>
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
};
