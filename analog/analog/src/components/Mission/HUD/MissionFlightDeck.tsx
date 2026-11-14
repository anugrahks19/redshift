import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Compass,
  Play,
  RotateCcw,
  Shield,
} from 'lucide-react';
import type {
  ComparisonFactorId,
  MissionConfigState,
  MissionDecisionOption,
  MissionStage,
  SimulationWaypoint,
} from '../../../types/mission';
import {
  COMPARISON_FACTORS,
  EARTH_TARGETS,
  MARS_TARGETS,
  MISSION_EVENT_001_OPTIONS,
  MISSION_TEMPLATES,
} from '../../../data/missionData';

export interface MissionFlightDeckProps {
  config: MissionConfigState;
  currentStepIndex: number;
  transferProgress: number;
  activeTargetId?: string;
  reducedMotion: boolean;
  onNavigateStage: (stage: MissionStage) => void;
  onUpdateConfig: (partial: Partial<MissionConfigState>) => void;
  onAdvanceRoverStep: () => void;
  onResetRoverStep: () => void;
  onSelectTarget: (targetId: string) => void;
  onSetTransferProgress: (prog: number) => void;
  onToggleReducedMotion: () => void;
  onResetMission: () => void;
}

export const MissionFlightDeck: React.FC<MissionFlightDeckProps> = ({
  config,
  currentStepIndex,
  transferProgress,
  activeTargetId,
  reducedMotion,
  onNavigateStage,
  onUpdateConfig,
  onAdvanceRoverStep,
  onResetRoverStep,
  onSelectTarget,
  onSetTransferProgress,
  onToggleReducedMotion,
  onResetMission,
}) => {
  const [showComparisonDrawer, setShowComparisonDrawer] = useState(false);
  const [selectedFactorId, setSelectedFactorId] = useState<ComparisonFactorId>('mobility');

  const isMars = config.stage === 'planet-sim' || config.stage === 'challenge' || config.stage === 'debrief';

  // Surface Telemetry Values based on current operational theater
  const telemetry = {
    body: config.stage === 'landing' || config.stage === 'transfer' ? 'Deep Space (Cruising)' : isMars ? 'Mars (Gale Crater)' : 'Earth (Atacama Desert)',
    gravity: isMars ? '0.38 g (3.72 m/s²)' : config.stage === 'transfer' ? '0.00 g (Microgravity)' : '1.00 g (9.81 m/s²)',
    pressure: isMars ? '6.1 mbar (Thin CO₂)' : config.stage === 'transfer' ? '< 10⁻¹² mbar' : '1,013 mbar (N₂/O₂)',
    commLag: isMars ? '14.6 min (One-Way)' : config.stage === 'transfer' ? '6.2 min' : '1.2 s (Low-Latency)',
    battery:
      config.stage === 'challenge' && config.decisionId === 'direct-traverse'
        ? '32% (Heavy Draw)'
        : config.stage === 'debrief'
          ? '68% (Stable)'
          : config.stage === 'planet-sim'
            ? '78% (Nominal)'
            : '95% (Fully Charged)',
  };

  const activeTarget =
    (config.stage === 'earth-sim'
      ? EARTH_TARGETS.find((t: SimulationWaypoint) => t.id === activeTargetId)
      : MARS_TARGETS.find((t: SimulationWaypoint) => t.id === activeTargetId)) ??
    (config.stage === 'earth-sim' ? EARTH_TARGETS[0]! : MARS_TARGETS[0]!);

  const activeFactor = COMPARISON_FACTORS.find((f) => f.id === selectedFactorId) ?? COMPARISON_FACTORS[0]!;

  return (
    <div className="flight-deck-hud">
      {/* =========================================================================
          TOP MISSION FLIGHT HEADER
          ========================================================================= */}
      <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Upper Operations Ribbon */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            background: '#0A0F16',
            border: '1px solid #223042',
            borderRadius: 4,
            padding: '8px 14px',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 10px 26px rgba(0, 0, 0, 0.72)',
          }}
        >
          {/* Mission Identity & Stage */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link
              to="/explore"
              style={{
                color: '#CBD5E1',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11.5,
                textDecoration: 'none',
                padding: '4px 8px',
                borderRadius: 3,
                background: '#131C28',
                border: '1px solid #28364A',
                whiteSpace: 'nowrap',
              }}
            >
              <ArrowLeft size={13} />
              <span className="flight-deck-catalog-label">Catalog</span>
            </Link>

            <div style={{ height: 18, width: 1, background: '#223042' }} />

            <div>
              <div
                className="flight-deck-title-desktop"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.09em',
                  color: '#38BDF8',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontWeight: 600,
                }}
              >
                MISSION FLIGHT SIMULATOR · EXP-2026
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
                Earth-to-Mars Proving Ground
              </div>
            </div>
          </div>

          {/* Quick Telemetry Indicators */}
          <div className="flight-deck-telemetry-strip">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 9, color: '#64748B' }}>THEATER</span>
              <span style={{ color: '#E2E8F0', fontWeight: 600 }}>{telemetry.body}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 9, color: '#64748B' }}>GRAVITY</span>
              <span style={{ color: '#38BDF8', fontWeight: 600 }}>{telemetry.gravity}</span>
            </div>

            <div className="flight-deck-telemetry-desktop" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 9, color: '#64748B' }}>PRESSURE</span>
              <span style={{ color: '#E2E8F0', fontWeight: 600 }}>{telemetry.pressure}</span>
            </div>

            <div className="flight-deck-telemetry-desktop" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 9, color: '#64748B' }}>SIGNAL LATENCY</span>
              <span style={{ color: '#F59E0B', fontWeight: 600 }}>{telemetry.commLag}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 9, color: '#64748B' }}>POWER RESERVE</span>
              <span style={{ color: '#4ADE80', fontWeight: 600 }}>{telemetry.battery}</span>
            </div>
          </div>

          {/* Utility Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setShowComparisonDrawer(!showComparisonDrawer)}
              style={{
                fontSize: 11,
                fontFamily: "'IBM Plex Mono', monospace",
                background: showComparisonDrawer ? '#0369A1' : '#131C28',
                color: '#FFFFFF',
                border: '1px solid',
                borderColor: showComparisonDrawer ? '#38BDF8' : '#28364A',
                padding: '6px 10px',
                borderRadius: 3,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Compass size={13} />
              <span>{showComparisonDrawer ? 'Close Analogs' : 'Compare Worlds'}</span>
            </button>

            <button
              onClick={onToggleReducedMotion}
              title={reducedMotion ? 'Enable Camera Flybys' : 'Disable Camera Flybys (Reduced Motion)'}
              style={{
                fontSize: 11,
                fontFamily: "'IBM Plex Mono', monospace",
                background: reducedMotion ? '#92400E' : '#131C28',
                color: '#FFFFFF',
                border: '1px solid',
                borderColor: reducedMotion ? '#F59E0B' : '#28364A',
                padding: '6px 10px',
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              {reducedMotion ? 'Motion: Off' : 'Motion: Smooth'}
            </button>

            <button
              onClick={onResetMission}
              title="Reset Simulation"
              style={{
                background: '#131C28',
                color: '#CBD5E1',
                border: '1px solid #28364A',
                padding: '6px 8px',
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>

        {/* Stage Navigation Stepper Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#080D14',
            border: '1px solid #1E293B',
            borderRadius: 4,
            padding: '6px 12px',
            overflowX: 'auto',
          }}
        >
          <StagePill
            stageKey="landing"
            label="01 PROLOGUE"
            isActive={config.stage === 'landing'}
            onClick={() => onNavigateStage('landing')}
          />
          <StageDivider />
          <StagePill
            stageKey="configure"
            label="02 3D ASSEMBLY"
            isActive={config.stage === 'configure'}
            onClick={() => onNavigateStage('configure')}
          />
          <StageDivider />
          <StagePill
            stageKey="earth-sim"
            label="03 ATACAMA ANALOG"
            isActive={config.stage === 'earth-sim'}
            onClick={() => onNavigateStage('earth-sim')}
          />
          <StageDivider />
          <StagePill
            stageKey="transfer"
            label="04 TRANSFER CRUISE"
            isActive={config.stage === 'transfer'}
            onClick={() => onNavigateStage('transfer')}
          />
          <StageDivider />
          <StagePill
            stageKey="planet-sim"
            label="05 MARS GALE CRATER"
            isActive={config.stage === 'planet-sim'}
            onClick={() => onNavigateStage('planet-sim')}
          />
          <StageDivider />
          <StagePill
            stageKey="challenge"
            label="06 HAZARD EVENT"
            isActive={config.stage === 'challenge'}
            onClick={() => onNavigateStage('challenge')}
          />
          <StageDivider />
          <StagePill
            stageKey="debrief"
            label="07 SCIENCE DEBRIEF"
            isActive={config.stage === 'debrief'}
            onClick={() => onNavigateStage('debrief')}
          />
        </div>
      </div>

      {/* =========================================================================
          COLLAPSIBLE COMPARISON DRAWER (EARTH vs MARS vs MOON)
          ========================================================================= */}
      {showComparisonDrawer && (
        <div
          style={{
            pointerEvents: 'auto',
            position: 'absolute',
            top: 118,
            right: 20,
            width: 480,
            maxWidth: 'calc(100% - 40px)',
            maxHeight: 'calc(100% - 240px)',
            background: '#0A0F16',
            border: '1px solid #2A435B',
            borderRadius: 4,
            padding: 18,
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 18px 40px rgba(0, 0, 0, 0.85)',
            overflowY: 'auto',
            zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#38BDF8', letterSpacing: '0.04em' }}>
              SCIENTIFIC COMPARISON · DUAL WORLDS
            </div>
            <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: '#94A3B8' }}>
              NASA NSSDC VERIFIED CONSTANTS
            </span>
          </div>

          {/* Factor Navigation Tabs */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 14 }}>
            {COMPARISON_FACTORS.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFactorId(f.id)}
                style={{
                  fontSize: 10.5,
                  fontFamily: "'IBM Plex Mono', monospace",
                  padding: '4px 8px',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: selectedFactorId === f.id ? '#38BDF8' : '#243242',
                  background: selectedFactorId === f.id ? '#102A43' : '#111924',
                  color: selectedFactorId === f.id ? '#FFFFFF' : '#CBD5E1',
                  cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Factor Breakdown Comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
            {/* Earth Analog Card */}
            <div
              style={{
                background: '#0E1B2B',
                border: '1px solid #1E4266',
                borderRadius: 4,
                padding: 10,
              }}
            >
              <div style={{ fontSize: 10, color: '#38BDF8', fontWeight: 600, marginBottom: 4 }}>
                EARTH (ATACAMA)
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>
                {activeFactor.earthTitle}
              </div>
              <div style={{ fontSize: 11, color: '#CBD5E1', lineHeight: 1.4 }}>
                {activeFactor.earthSummary}
              </div>
            </div>

            {/* Mars Environment Card */}
            <div
              style={{
                background: '#1E130D',
                border: '1px solid #633118',
                borderRadius: 4,
                padding: 10,
              }}
            >
              <div style={{ fontSize: 10, color: '#F97316', fontWeight: 600, marginBottom: 4 }}>
                MARS (GALE CRATER)
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>
                {activeFactor.marsTitle}
              </div>
              <div style={{ fontSize: 11, color: '#CBD5E1', lineHeight: 1.4 }}>
                {activeFactor.marsSummary}
              </div>
            </div>
          </div>

          {/* Science Deep Dive Note */}
          <div
            style={{
              background: '#111822',
              border: '1px solid #222E3D',
              borderRadius: 4,
              padding: 10,
              fontSize: 11,
              color: '#94A3B8',
              lineHeight: 1.45,
            }}
          >
            <strong style={{ color: '#E2E8F0' }}>Engineering Significance:</strong> {activeFactor.scienceDetail}
          </div>
        </div>
      )}

      {/* =========================================================================
          BOTTOM CONTEXTUAL COMMAND CONSOLE
          ========================================================================= */}
      <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* STAGE 1: PROLOGUE OPENING CARD */}
        {config.stage === 'landing' && (
          <div
            style={{
              background: '#0A0F16',
              border: '1px solid #263649',
              borderLeft: '3px solid #38BDF8',
              borderRadius: 4,
              padding: '18px 22px',
              maxWidth: 700,
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 14px 36px rgba(0, 0, 0, 0.78)',
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontFamily: "'IBM Plex Mono', monospace",
                color: '#38BDF8',
                letterSpacing: '0.09em',
                marginBottom: 5,
              }}
            >
              MISSION BRIEFING · ORBITAL STAGING
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px 0', color: '#F8FAFC' }}>
              Launch Your Mission: One Mission. Different Worlds.
            </h2>
            <p style={{ fontSize: 13.5, color: '#CBD5E1', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Before NASA rovers descend onto Martian soil, their locomotion, core drills, and
              spectrometers are proven in terrestrial analogs like Chile&apos;s hyper-arid Atacama Desert.
              Experience how engineering choices made on Earth ensure survival 225 million kilometers away.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => onNavigateStage('configure')}
                style={{
                  background: '#0284C7',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 12.5,
                  letterSpacing: '0.04em',
                  padding: '9px 18px',
                  borderRadius: 4,
                  border: '1px solid #38BDF8',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>INITIALISE MISSION</span>
                <ArrowRight size={15} />
              </button>

              <button
                onClick={() => onNavigateStage('earth-sim')}
                style={{
                  background: '#131C28',
                  color: '#CBD5E1',
                  fontWeight: 500,
                  fontSize: 12.5,
                  padding: '9px 16px',
                  borderRadius: 4,
                  border: '1px solid #28364A',
                  cursor: 'pointer',
                }}
              >
                Skip to Atacama Traverse
              </button>
            </div>
          </div>
        )}

        {/* STAGE 2: 3D HARDWARE ASSEMBLY CONSOLE */}
        {config.stage === 'configure' && (
          <div
            style={{
              background: '#0A0F16',
              border: '1px solid #263649',
              borderLeft: '3px solid #38BDF8',
              borderRadius: 4,
              padding: '16px 20px',
              maxWidth: 780,
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 14px 36px rgba(0, 0, 0, 0.78)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: '#38BDF8' }}>
                  HARDWARE INTEGRATION BAY · 3D TURNTABLE ACTIVE
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
                  Configure Planetary Science Rover
                </div>
              </div>
              <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: '#94A3B8' }}>
                Drag viewport to inspect 360° around rover
              </div>
            </div>

            {/* Template Archetype Selection */}
            <div className="flight-deck-grid-3">
              {MISSION_TEMPLATES.slice(0, 3).map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => onUpdateConfig({ templateId: tpl.id })}
                  style={{
                    textAlign: 'left',
                    padding: '9px 12px',
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: config.templateId === tpl.id ? '#38BDF8' : '#223042',
                    background: config.templateId === tpl.id ? '#0E2439' : '#111822',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{tpl.title}</div>
                  <div style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 2 }}>
                    {tpl.objectiveSummary}
                  </div>
                </button>
              ))}
            </div>

            {/* Payload Hardware Specs */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                paddingTop: 10,
                borderTop: '1px solid #1E293B',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
                <div>
                  <span style={{ color: '#64748B' }}>SUSPENSION: </span>
                  <span style={{ color: '#FFFFFF', fontWeight: 600 }}>Rocker-Bogie 6WD</span>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>POWER SOURCE: </span>
                  <span style={{ color: '#38BDF8', fontWeight: 600 }}>
                    {config.templateId === 'rover-engineer' ? 'MMRTG (110W Nuclear)' : 'Triple-Junction Solar'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>SCIENCE TURRET: </span>
                  <span style={{ color: '#4ADE80', fontWeight: 600 }}>APXS + Core Drill</span>
                </div>
              </div>

              <button
                onClick={() => onNavigateStage('earth-sim')}
                style={{
                  background: '#0284C7',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 12.5,
                  padding: '8px 16px',
                  borderRadius: 4,
                  border: '1px solid #38BDF8',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>DEPLOY TO ATACAMA DESERT</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: ATACAMA ANALOG TRAVERSE CONTROLLER */}
        {config.stage === 'earth-sim' && (
          <div
            style={{
              background: '#0A0F16',
              border: '1px solid #263649',
              borderLeft: '3px solid #38BDF8',
              borderRadius: 4,
              padding: '16px 20px',
              maxWidth: 820,
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 14px 36px rgba(0, 0, 0, 0.78)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: '#38BDF8' }}>
                  OPERATIONAL THEATER · ATACAMA DESERT ANALOG SITE
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
                  Step {currentStepIndex + 1} of 6: {getEarthStepLabel(currentStepIndex)}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {EARTH_TARGETS.map((tgt) => (
                  <button
                    key={tgt.id}
                    onClick={() => onSelectTarget(tgt.id)}
                    style={{
                      fontSize: 10.5,
                      fontFamily: "'IBM Plex Mono', monospace",
                      padding: '4px 8px',
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: activeTargetId === tgt.id ? '#38BDF8' : '#243242',
                      background: activeTargetId === tgt.id ? '#0E2439' : '#111822',
                      color: activeTargetId === tgt.id ? '#FFFFFF' : '#CBD5E1',
                      cursor: 'pointer',
                    }}
                  >
                    {tgt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Target Science Finding */}
            <div
              style={{
                background: '#101823',
                border: '1px solid #223042',
                borderRadius: 4,
                padding: '8px 12px',
                marginBottom: 12,
                fontSize: 12,
                color: '#CBD5E1',
              }}
            >
              <strong style={{ color: '#38BDF8' }}>{activeTarget.title}:</strong> {activeTarget.finding}
            </div>

            {/* Stepper Navigation Actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={onAdvanceRoverStep}
                  disabled={currentStepIndex >= 5}
                  style={{
                    background: currentStepIndex >= 5 ? '#1E293B' : '#0284C7',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: 12.5,
                    padding: '8px 16px',
                    borderRadius: 4,
                    border: currentStepIndex >= 5 ? '1px solid #334155' : '1px solid #38BDF8',
                    cursor: currentStepIndex >= 5 ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Play size={13} />
                  <span>{currentStepIndex >= 5 ? 'Survey Completed' : 'Advance Rover Step'}</span>
                </button>

                <button
                  onClick={onResetRoverStep}
                  style={{
                    background: '#131C28',
                    color: '#CBD5E1',
                    fontSize: 12,
                    padding: '8px 12px',
                    borderRadius: 4,
                    border: '1px solid #28364A',
                    cursor: 'pointer',
                  }}
                >
                  Reset Path
                </button>
              </div>

              <button
                onClick={() => onNavigateStage('transfer')}
                style={{
                  background: '#15803D',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 12.5,
                  padding: '8px 16px',
                  borderRadius: 4,
                  border: '1px solid #4ADE80',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>QUALIFY ROVER & LAUNCH TO MARS</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STAGE 4: INTERPLANETARY TRANSFER CRUISE CONSOLE */}
        {config.stage === 'transfer' && (
          <div
            style={{
              background: '#0A0F16',
              border: '1px solid #263649',
              borderLeft: '3px solid #38BDF8',
              borderRadius: 4,
              padding: '16px 20px',
              maxWidth: 820,
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 14px 36px rgba(0, 0, 0, 0.78)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: '#38BDF8' }}>
                  HOHMANN TRANSFER ORBIT · 225 MILLION KILOMETERS
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
                  Interplanetary Cruise Trajectory
                </div>
              </div>

              <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: '#F59E0B', fontVariantNumeric: 'tabular-nums' }}>
                Distance Covered: {Math.round(transferProgress * 225)}M km ({Math.round(transferProgress * 100)}%)
              </div>
            </div>

            {/* Interactive Hohmann Arc Scrubber */}
            <div style={{ marginBottom: 14 }}>
              <input
                type="range"
                min="0.05"
                max="0.95"
                step="0.01"
                value={transferProgress}
                onChange={(e) => onSetTransferProgress(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer', accentColor: '#38BDF8' }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  fontSize: 10,
                  color: '#94A3B8',
                  marginTop: 4,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                <span>EARTH DEPARTURE (1.00 AU)</span>
                <span>MID-COURSE MANEUVER</span>
                <span>MARS CAPTURE (1.52 AU)</span>
              </div>
            </div>

            {/* Environmental Metric Shift Indicators */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 14 }}>
              <TransferMetricBox
                label="SOLAR FLUX"
                val={`${Math.round(1361 - transferProgress * (1361 - 590))} W/m²`}
                note="-56% Reduction"
              />
              <TransferMetricBox
                label="SURFACE PRESSURE"
                val={transferProgress > 0.8 ? '6.1 mbar' : transferProgress < 0.2 ? '1,013 mbar' : 'Vacuum'}
                note="Thin CO₂ Target"
              />
              <TransferMetricBox
                label="GRAVITY SHIFT"
                val={transferProgress > 0.8 ? '0.38 g' : '1.00 g -> 0 g'}
                note="Low Traction Target"
              />
              <TransferMetricBox
                label="COMM DELAY"
                val={`${(1.2 + transferProgress * 13.4).toFixed(1)} min`}
                note="Autonomous Required"
              />
            </div>

            <button
              onClick={() => onNavigateStage('planet-sim')}
              style={{
                width: '100%',
                background: '#B91C1C',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 12.5,
                letterSpacing: '0.03em',
                padding: '10px 16px',
                borderRadius: 4,
                border: '1px solid #F87171',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <span>EXECUTE ATMOSPHERIC ENTRY, DESCENT & LANDING (EDL)</span>
              <ArrowRight size={15} />
            </button>
          </div>
        )}

        {/* STAGE 5: MARTIAN SURFACE OPERATIONS */}
        {config.stage === 'planet-sim' && (
          <div
            style={{
              background: '#0A0F16',
              border: '1px solid #4A281A',
              borderLeft: '3px solid #F97316',
              borderRadius: 4,
              padding: '16px 20px',
              maxWidth: 820,
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 14px 36px rgba(0, 0, 0, 0.78)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: '#F97316' }}>
                  SURFACE OPERATIONS · GALE CRATER / MURRAY BUTTES
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
                  Step {currentStepIndex + 1} of 6: {getMarsStepLabel(currentStepIndex)}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {MARS_TARGETS.map((tgt: SimulationWaypoint) => (
                  <button
                    key={tgt.id}
                    onClick={() => onSelectTarget(tgt.id)}
                    style={{
                      fontSize: 10.5,
                      fontFamily: "'IBM Plex Mono', monospace",
                      padding: '4px 8px',
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: activeTargetId === tgt.id ? '#F97316' : '#3A2820',
                      background: activeTargetId === tgt.id ? '#3B1B0E' : '#151214',
                      color: activeTargetId === tgt.id ? '#FFFFFF' : '#CBD5E1',
                      cursor: 'pointer',
                    }}
                  >
                    {tgt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dual Analog Scientific Cross-Check Finding */}
            <div
              style={{
                background: '#191210',
                border: '1px solid #4A281A',
                borderRadius: 4,
                padding: '8px 12px',
                marginBottom: 12,
                fontSize: 12,
                color: '#CBD5E1',
              }}
            >
              <strong style={{ color: '#F97316' }}>Dual-Analog Validation:</strong> {activeTarget.finding} (Calibrated
              against Atacama clay & nitrate baseline).
            </div>

            {/* Navigation Actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={onAdvanceRoverStep}
                  disabled={currentStepIndex >= 5}
                  style={{
                    background: currentStepIndex >= 5 ? '#1E293B' : '#B45309',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: 12.5,
                    padding: '8px 16px',
                    borderRadius: 4,
                    border: currentStepIndex >= 5 ? '1px solid #334155' : '1px solid #F59E0B',
                    cursor: currentStepIndex >= 5 ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Play size={13} />
                  <span>{currentStepIndex >= 5 ? 'Traverse Sector Complete' : 'Drive Rover Forward'}</span>
                </button>

                <button
                  onClick={onResetRoverStep}
                  style={{
                    background: '#131C28',
                    color: '#CBD5E1',
                    fontSize: 12,
                    padding: '8px 12px',
                    borderRadius: 4,
                    border: '1px solid #28364A',
                    cursor: 'pointer',
                  }}
                >
                  Reset Path
                </button>
              </div>

              <button
                onClick={() => onNavigateStage('challenge')}
                style={{
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 12.5,
                  padding: '8px 16px',
                  borderRadius: 4,
                  border: '1px solid #F87171',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>ADVANCE TO SECTOR 04 (HAZARD ENCOUNTER)</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STAGE 6: CRITICAL MISSION EVENT (3D OBSTACLE AVOIDANCE) */}
        {config.stage === 'challenge' && (
          <div
            style={{
              background: '#0A0F16',
              border: '1px solid #6B2323',
              borderLeft: '3px solid #EF4444',
              borderRadius: 4,
              padding: '16px 20px',
              maxWidth: 820,
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 14px 36px rgba(0, 0, 0, 0.85)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <AlertTriangle size={18} color="#EF4444" />
              <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: '#EF4444', fontWeight: 700 }}>
                CRITICAL EVENT 001 · STEEP TALUS SLOPE OBSTACLE DETECTED
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#CBD5E1', margin: '0 0 14px 0', lineHeight: 1.45 }}>
              The autonomous Hazcam detected a <strong>23.8° talus slope</strong> composed of loose basaltic
              sand ripples. Low gravity (0.38 g) reduces wheel normal downforce, creating severe wheel-slip
              risk. Select an engineering maneuver to execute in 3D:
            </p>

            {/* 3 Interactive Real Decisions */}
            <div className="flight-deck-grid-3">
              {MISSION_EVENT_001_OPTIONS.map((opt: MissionDecisionOption) => (
                <button
                  key={opt.id}
                  onClick={() => onUpdateConfig({ decisionId: opt.id })}
                  style={{
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: config.decisionId === opt.id ? '#38BDF8' : '#243242',
                    background:
                      config.decisionId === opt.id ? '#0E2439' : '#111822',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{opt.title}</div>
                  <div style={{ fontSize: 10.5, color: '#94A3B8', lineHeight: 1.35, marginBottom: 6 }}>
                    {opt.actionSummary}
                  </div>
                  <div style={{ fontSize: 9.5, fontFamily: "'IBM Plex Mono', monospace", color: '#38BDF8' }}>
                    Δ Battery: {opt.illustrativeEnergyDelta}% | Time: {opt.illustrativeTimeCost}
                  </div>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => onNavigateStage('debrief')}
                style={{
                  background: '#0284C7',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 12.5,
                  padding: '8px 18px',
                  borderRadius: 4,
                  border: '1px solid #38BDF8',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>EXECUTE MANEUVER & VIEW SCIENTIFIC DEBRIEF</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STAGE 7: MISSION DEBRIEF & RESEARCH PORTAL */}
        {config.stage === 'debrief' && (
          <div
            style={{
              background: '#0A0F16',
              border: '1px solid #1E4D36',
              borderLeft: '3px solid #4ADE80',
              borderRadius: 4,
              padding: '18px 22px',
              maxWidth: 820,
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 14px 36px rgba(0, 0, 0, 0.85)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Shield size={18} color="#4ADE80" />
              <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: '#4ADE80', fontWeight: 700 }}>
                MISSION SUCCESS · DEBRIEF & SCIENTIFIC VALUE REPORT
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
              <TransferMetricBox label="MISSION STATUS" val="OBJECTIVES MET" note="Analog Validated" />
              <TransferMetricBox label="PREDICTION ACCURACY" val="94.2%" note="Atacama Calibration" />
              <TransferMetricBox label="SAMPLES LOGGED" val="3 Cores + 6 APXS" note="Murray Mudstone" />
              <TransferMetricBox label="HAZARD OUTCOME" val="Vehicle Preserved" note="Safe Traversal" />
            </div>

            <p style={{ fontSize: 12.5, color: '#CBD5E1', margin: '0 0 16px 0', lineHeight: 1.45 }}>
              Terrestrial testing at the Atacama Yungay Station correctly predicted wheel-soil interaction
              mechanics in loose basaltic sand, allowing autonomous navigation software to prevent entrapment.
              Transition to the research studio to analyze full 3D DEM digital elevation models.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <Link
                to="/research"
                style={{
                  background: '#0284C7',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 12.5,
                  padding: '9px 16px',
                  borderRadius: 4,
                  border: '1px solid #38BDF8',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>OPEN 3D DUAL-TERRAIN WORKSTATION</span>
                <ArrowRight size={14} />
              </Link>

              <Link
                to="/learn"
                style={{
                  background: '#131C28',
                  color: '#CBD5E1',
                  fontSize: 12.5,
                  padding: '9px 14px',
                  borderRadius: 4,
                  textDecoration: 'none',
                  border: '1px solid #28364A',
                }}
              >
                Browse Analog Knowledge Base
              </Link>

              <button
                onClick={onResetMission}
                style={{
                  background: 'transparent',
                  color: '#94A3B8',
                  fontSize: 12,
                  padding: '9px 12px',
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <RotateCcw size={12} />
                <span>Simulate Again</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
interface StagePillProps {
  stageKey: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const StagePill: React.FC<StagePillProps> = ({ label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 10,
        fontFamily: "'IBM Plex Mono', monospace",
        fontWeight: isActive ? 700 : 500,
        padding: '4px 9px',
        borderRadius: 3,
        border: '1px solid',
        borderColor: isActive ? '#38BDF8' : 'transparent',
        background: isActive ? '#0E2439' : 'transparent',
        color: isActive ? '#FFFFFF' : '#94A3B8',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
};

const StageDivider: React.FC = () => (
  <span style={{ color: '#334155', fontSize: 10 }}>/</span>
);

interface TransferMetricBoxProps {
  label: string;
  val: string;
  note: string;
}

const TransferMetricBox: React.FC<TransferMetricBoxProps> = ({ label, val, note }) => {
  return (
    <div
      style={{
        background: '#111822',
        border: '1px solid #223042',
        borderRadius: 4,
        padding: '8px 10px',
      }}
    >
      <div style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", color: '#64748B' }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', margin: '2px 0', fontVariantNumeric: 'tabular-nums' }}>{val}</div>
      <div style={{ fontSize: 9.5, color: '#38BDF8' }}>{note}</div>
    </div>
  );
};

function getEarthStepLabel(idx: number): string {
  const labels = [
    'Deploy rover & unfold high-gain antenna',
    'Traverse alluvial gravel pediment (Target A)',
    'Acquire microscopic optical & APXS scan on nitrate crust',
    'Survey bedrock escarpment & evaluate wheel slip (Target B)',
    'Inspect smectite clay horizon & record spectra (Target C)',
    'Atacama baseline analog qualification complete',
  ];
  return labels[idx] ?? labels[0]!;
}

function getMarsStepLabel(idx: number): string {
  const labels = [
    'Touchdown verification & mast camera calibration',
    'Traverse ancient lakebed mudstone (Murray Buttes M1)',
    'Deploy robotic arm & drill sedimentary core sample',
    'Ascend Vera Rubin Ridge for hematite spectral survey (M2)',
    'Navigate eolian basaltic dune field ripples (Bagnold M3)',
    'Martian surface science survey complete',
  ];
  return labels[idx] ?? labels[0]!;
}
