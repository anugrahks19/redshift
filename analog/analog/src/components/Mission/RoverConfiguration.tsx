import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Battery,
  Bot,
  Plane,
  Radio,
} from 'lucide-react';
import type {
  MissionConfigState,
  MissionObjectiveId,
  TerrainType,
  VehicleType,
} from '../../types/mission';
import {
  EARTH_ENVIRONMENTS,
  OBJECTIVE_LABELS,
  TERRAIN_LABELS,
  VEHICLE_LABELS,
} from '../../data/missionData';
import { computeMissionAssessment } from '../../services/missionSimulationService';

interface RoverConfigurationProps {
  config: MissionConfigState;
  onUpdateConfig: (partial: Partial<MissionConfigState>) => void;
  onBack: () => void;
  onContinue: () => void;
}

const VEHICLES: VehicleType[] = ['rover', 'drone', 'lander'];
const TERRAINS: TerrainType[] = ['rocky', 'sandy', 'steep', 'mixed'];
const OBJECTIVES: MissionObjectiveId[] = [
  'geological-survey',
  'sample-collection',
  'terrain-mapping',
  'environmental-monitoring',
];

export const RoverConfiguration: React.FC<RoverConfigurationProps> = ({
  config,
  onUpdateConfig,
  onBack,
  onContinue,
}) => {
  const assessment = computeMissionAssessment(config);
  const earthEnv = EARTH_ENVIRONMENTS[config.earthEnvId];

  return (
    <div className="panel" style={{ padding: 'clamp(18px, 3vw, 28px)' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
        <div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            STAGE 03 · ROBOTIC SYSTEMS & ENERGY BUDGET
          </div>
          <h2 style={{ fontSize: 20, color: 'var(--ink-dark)', margin: '4px 0 6px' }}>
            Design Your Robotic Mission
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 680, margin: 0 }}>
            Configure the vehicle chassis, primary terrain target, operational objective, and energy allocation for testing at {earthEnv.name}.
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
            <span>Launch Earth Simulation</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, alignItems: 'start' }}>
        {/* Interactive Controls Column */}
        <div style={{ display: 'grid', gap: 18 }}>
          {/* 1. Vehicle Selection */}
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-dark)', marginBottom: 6 }}>
              1. Exploration Vehicle Architecture
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {VEHICLES.map((v) => {
                const isSelected = config.vehicle === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onUpdateConfig({ vehicle: v })}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid var(--accent-blue)' : '1px solid var(--border-light)',
                      background: isSelected ? '#F0F6FA' : '#FFFFFF',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {v === 'rover' && <Bot size={20} color={isSelected ? 'var(--accent-blue)' : '#4A5568'} />}
                    {v === 'drone' && <Plane size={20} color={isSelected ? 'var(--accent-blue)' : '#4A5568'} />}
                    {v === 'lander' && <Radio size={20} color={isSelected ? 'var(--accent-blue)' : '#4A5568'} />}
                    <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize', color: 'var(--ink-dark)' }}>
                      {v}
                    </span>
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
              {VEHICLE_LABELS[config.vehicle].tagline}
            </p>
          </div>

          {/* 2. Terrain Target */}
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-dark)', marginBottom: 6 }}>
              2. Target Terrain Regime
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {TERRAINS.map((t) => {
                const isSelected = config.terrain === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onUpdateConfig({ terrain: t })}
                    style={{
                      padding: '8px 6px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid var(--accent-blue)' : '1px solid var(--border-light)',
                      background: isSelected ? '#F0F6FA' : '#FFFFFF',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      color: isSelected ? 'var(--accent-blue)' : 'var(--ink-dark)',
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
              {TERRAIN_LABELS[config.terrain].difficultyNote}
            </p>
          </div>

          {/* 3. Mission Objective */}
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-dark)', marginBottom: 6 }}>
              3. Operational Objective
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
              {OBJECTIVES.map((obj) => {
                const isSelected = config.objective === obj;
                return (
                  <button
                    key={obj}
                    type="button"
                    onClick={() => onUpdateConfig({ objective: obj })}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid var(--accent-blue)' : '1px solid var(--border-light)',
                      background: isSelected ? '#F0F6FA' : '#FFFFFF',
                      cursor: 'pointer',
                      fontSize: 11.5,
                      fontWeight: 500,
                      textAlign: 'left',
                      color: isSelected ? 'var(--accent-blue)' : 'var(--ink-dark)',
                    }}
                  >
                    {OBJECTIVE_LABELS[obj].name}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
              {OBJECTIVE_LABELS[config.objective].detail}
            </p>
          </div>

          {/* 4. Energy Allocation Slider */}
          <div
            style={{
              padding: 14,
              borderRadius: 'var(--radius-md)',
              background: '#F7F8F6',
              border: '1px solid var(--border-light)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label htmlFor="energy-slider" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-dark)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Battery size={15} color="var(--accent-amber)" />
                <span>4. Energy Allocation (Illustrative Planning Budget)</span>
              </label>
              <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-blue)' }}>
                {config.energyAllocation}%
              </span>
            </div>

            <input
              id="energy-slider"
              type="range"
              min={10}
              max={100}
              step={5}
              value={config.energyAllocation}
              onChange={(e) => onUpdateConfig({ energyAllocation: parseInt(e.target.value, 10) })}
              style={{ width: '100%', accentColor: 'var(--accent-blue)', margin: '4px 0 8px' }}
            />

            <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-muted)' }}>
              <span>10% (Conserved / Slow)</span>
              <span>Default: 65%</span>
              <span>100% (High Duty Cycle)</span>
            </div>

            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.4 }}>
              <em>Note:</em> Energy allocation is an illustrative planning variable for interactive trade-off analysis, not a flight-certified battery specification.
            </p>
          </div>
        </div>

        {/* Live Mission Telemetry Preview */}
        <div
          style={{
            background: '#101E2B',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            color: '#F2F5F8',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', paddingBottom: 10 }}>
            <div>
              <span className="mono" style={{ fontSize: 10.5, color: '#7CC4E8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                LIVE CONFIGURATION TELEMETRY
              </span>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#FFFFFF', margin: '2px 0 0' }}>
                {config.vehicle.toUpperCase()} · {config.terrain.toUpperCase()} TARGET
              </h3>
            </div>
            <div
              className="mono"
              style={{
                fontSize: 10.5,
                padding: '3px 7px',
                borderRadius: 4,
                background: assessment.energyMarginLabel === 'Comfortable'
                  ? 'rgba(50, 127, 121, 0.35)'
                  : assessment.energyMarginLabel === 'Balanced'
                    ? 'rgba(40, 106, 145, 0.4)'
                    : 'rgba(194, 139, 56, 0.4)',
                color: '#FFFFFF',
              }}
            >
              {assessment.energyMarginLabel} Margin
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9FB0C1' }}>Target Testbed:</span>
              <strong style={{ color: '#FFFFFF' }}>{earthEnv.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9FB0C1' }}>Local Surface Gravity:</span>
              <strong className="mono" style={{ color: '#FFFFFF' }}>{earthEnv.measuredGravityMs2} m/s² (1.00 g)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9FB0C1' }}>Atmospheric Density:</span>
              <strong style={{ color: '#FFFFFF' }}>~900 mbar (Dense Earth Air)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9FB0C1' }}>Estimated Post-Ops Reserve:</span>
              <strong className="mono" style={{ color: assessment.illustrativeReserveAfterOps > 20 ? '#7CC4E8' : '#E7A95A' }}>
                ~{assessment.illustrativeReserveAfterOps}% remaining
              </strong>
            </div>
          </div>

          <div
            style={{
              padding: 10,
              borderRadius: 4,
              background: '#172A3A',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: 11.5,
              color: '#CBD6E2',
              lineHeight: 1.45,
            }}
          >
            <strong style={{ color: '#FFFFFF', display: 'block', marginBottom: 2 }}>
              Locomotion & Stability Note:
            </strong>
            {assessment.mobilityAssessment}
          </div>

          <div
            style={{
              padding: 10,
              borderRadius: 4,
              background: '#172A3A',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: 11.5,
              color: '#CBD6E2',
              lineHeight: 1.45,
            }}
          >
            <strong style={{ color: '#FFFFFF', display: 'block', marginBottom: 2 }}>
              Aerodynamic Physics Assessment:
            </strong>
            {assessment.aerodynamicNote}
          </div>
        </div>
      </div>
    </div>
  );
};
