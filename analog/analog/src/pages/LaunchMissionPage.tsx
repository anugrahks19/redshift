import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowLeftRight,
  Compass,
  Flame,
  Gauge,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Thermometer,
  Wind,
} from 'lucide-react';
import {
  ComparativeScienceViewport,
  SHACKLETON_CANDIDATE_PINS,
} from '../components/Mission/3D/ComparativeScienceViewport';
import {
  type AtmosphereExperimentResult,
  type BaseSiteInspectionResult,
  DROP_OBJECTS,
  type DropObjectId,
  type EnvironmentSide,
  type ExperimentId,
  GRAVITY_CONSTANTS,
  type GravityCalculationResult,
  type MissionId,
  type TemperatureExperimentResult,
  buildEnvironmentTelemetry,
  calculateGravityDrop,
  evaluateAtmosphereExperiment,
  evaluateProbeTemperatureAtTime,
  evaluateTemperatureExperiment,
  inspectLunarBaseSite,
} from '../services/comparativeSimulationEngine';
import {
  type DivinerPcpDataset,
  type ModisLstDataset,
  type PlanetaryEnvironmentReference,
  loadDivinerPcpDataset,
  loadModisLstDataset,
  loadPlanetaryEnvironment,
  loadTerrainDataset,
} from '../services/terrainDataService';
import { computeDerivedTerrain } from '../services/geospatialService';
import type { DerivedTerrainGrid, TerrainGridDataset } from '../types/terrain';

function ProvenanceTag({ label }: { label: 'MEASURED' | 'CALCULATED' | 'PUBLISHED REF' | 'ASSUMPTION' | 'UNAVAILABLE' }) {
  const palette: Record<string, { bg: string; fg: string; border: string }> = {
    MEASURED: { bg: 'rgba(16, 185, 129, 0.14)', fg: '#34d399', border: 'rgba(52, 211, 153, 0.4)' },
    CALCULATED: { bg: 'rgba(56, 189, 248, 0.14)', fg: '#38bdf8', border: 'rgba(56, 189, 248, 0.4)' },
    'PUBLISHED REF': { bg: 'rgba(245, 158, 11, 0.14)', fg: '#fbbf24', border: 'rgba(245, 158, 11, 0.4)' },
    ASSUMPTION: { bg: 'rgba(168, 85, 247, 0.14)', fg: '#c084fc', border: 'rgba(168, 85, 247, 0.4)' },
    UNAVAILABLE: { bg: 'rgba(239, 68, 68, 0.14)', fg: '#f87171', border: 'rgba(239, 68, 68, 0.4)' },
  };
  const s = palette[label] ?? palette.CALCULATED!;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.04em',
        padding: '2px 6px',
        borderRadius: 4,
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

export const LaunchMissionPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMission: MissionId =
    searchParams.get('mission') === 'mission-2-moon' ? 'mission-2-moon' : 'mission-1-mars';

  const [mission, setMission] = useState<MissionId>(initialMission);
  const [environment, setEnvironment] = useState<EnvironmentSide>('earth');
  const [experiment, setExperiment] = useState<ExperimentId>('gravity');

  // Shared experiment parameters (preserved across Earth <-> Planet switch)
  const [dropObjectId, setDropObjectId] = useState<DropObjectId>('basalt-sphere');
  const [dropHeightMeters, setDropHeightMeters] = useState<number>(12);
  const [suitActive, setSuitActive] = useState<boolean>(false);
  const [suitInternalPressureKpa, setSuitInternalPressureKpa] = useState<number>(29.6);
  const [probeRow, setProbeRow] = useState<number>(64);
  const [probeCol, setProbeCol] = useState<number>(64);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('alpha-ridge');

  // Simulation playback state
  const [simState, setSimState] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [cameraResetNonce, setCameraResetNonce] = useState<number>(0);

  // Datasets
  const [earthDataset, setEarthDataset] = useState<TerrainGridDataset | null>(null);
  const [planetDataset, setPlanetDataset] = useState<TerrainGridDataset | null>(null);
  const [moonDerived, setMoonDerived] = useState<DerivedTerrainGrid | null>(null);
  const [planetEnvRef, setPlanetEnvRef] = useState<PlanetaryEnvironmentReference | null>(null);
  const [modisData, setModisData] = useState<ModisLstDataset | null>(null);
  const [divinerData, setDivinerData] = useState<DivinerPcpDataset | null>(null);
  const [loadingDatasets, setLoadingDatasets] = useState<boolean>(true);

  // Recorded comparative outcomes
  const [gravityResults, setGravityResults] = useState<{
    earth: GravityCalculationResult | null;
    planet: GravityCalculationResult | null;
  }>({ earth: null, planet: null });

  const [atmoResults, setAtmoResults] = useState<{
    earth: AtmosphereExperimentResult | null;
    planet: AtmosphereExperimentResult | null;
  }>({ earth: null, planet: null });

  const [tempResults, setTempResults] = useState<{
    earth: TemperatureExperimentResult | null;
    planet: TemperatureExperimentResult | null;
  }>({ earth: null, planet: null });

  const [marsExposureChecks, setMarsExposureChecks] = useState({ unprotected: false, protected: false });
  const [lunarSiteSelected, setLunarSiteSelected] = useState(false);
  const [missionFinished, setMissionFinished] = useState(false);
  const [inspectedSite, setInspectedSite] = useState<BaseSiteInspectionResult | null>(null);

  // Load mission-specific DEMs and shared science bundles
  useEffect(() => {
    let cancelled = false;
    setLoadingDatasets(true);

    const earthId = mission === 'mission-1-mars' ? 'earth-yungay-nasadem-30m' : 'earth-mcmurdo-dem-30m';
    const planetId = mission === 'mission-1-mars' ? 'mars-jezero-mola-megdr' : 'moon-shackleton-lola';
    const body = mission === 'mission-1-mars' ? 'mars' : 'moon';

    setEarthDataset(null);
    setPlanetDataset(null);
    setMoonDerived(null);
    setModisData(null);
    setDivinerData(null);
    Promise.all([
      loadTerrainDataset(earthId, 'REAL_DATA').catch(() => null),
      loadTerrainDataset(planetId, 'REAL_DATA').catch(() => null),
      loadPlanetaryEnvironment(body).catch(() => null),
      loadModisLstDataset().catch(() => null),
      loadDivinerPcpDataset().catch(() => null),
    ])
      .then(([eDem, pDem, envRef, modis, diviner]) => {
        if (cancelled) return;
        setEarthDataset(eDem);
        setPlanetDataset(pDem);
        setMoonDerived(mission === 'mission-2-moon' && pDem ? computeDerivedTerrain(pDem) : null);
        setPlanetEnvRef(envRef);
        setModisData(modis);
        setDivinerData(diviner);
        setLoadingDatasets(false);
      })
      .catch(() => {
        if (!cancelled) setLoadingDatasets(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mission]);

  // Keep valid experiment tab when switching missions
  const availableExperiments = useMemo(() => {
    if (mission === 'mission-1-mars') {
      return [
        { id: 'gravity' as ExperimentId, label: '1. Gravity Comparison', icon: Gauge },
        { id: 'atmosphere' as ExperimentId, label: '2. Atmospheric Pressure & Survival', icon: Wind },
        { id: 'temperature' as ExperimentId, label: '3. Temperature Exposure', icon: Thermometer },
      ];
    }
    return [
      { id: 'gravity' as ExperimentId, label: '1. Gravity Comparison', icon: Gauge },
      { id: 'temperature' as ExperimentId, label: '2. Temperature Exposure', icon: Thermometer },
      { id: 'base-site' as ExperimentId, label: '3. Lunar Base-Site Inspection', icon: MapPin },
    ];
  }, [mission]);

  const handleSelectMission = (nextMission: MissionId) => {
    setMission(nextMission);
    setSearchParams({ mission: nextMission });
    setEnvironment('earth');
    setExperiment('gravity');
    setSimState('idle');
    setElapsedSeconds(0);
    setGravityResults({ earth: null, planet: null });
    setAtmoResults({ earth: null, planet: null });
    setTempResults({ earth: null, planet: null });
    setInspectedSite(null);
    setMarsExposureChecks({ unprotected: false, protected: false });
    setMissionFinished(false);
    setLunarSiteSelected(false);
  };

  const activeDataset = environment === 'earth' ? earthDataset : planetDataset;
  const activeGravityMs2 =
    environment === 'earth'
      ? GRAVITY_CONSTANTS.earth
      : mission === 'mission-1-mars'
        ? GRAVITY_CONSTANTS.mars
        : GRAVITY_CONSTANTS.moon;

  const currentGravityCalc = useMemo(
    () => calculateGravityDrop(environment, mission, dropObjectId, dropHeightMeters),
    [environment, mission, dropObjectId, dropHeightMeters]
  );

  const currentAtmoCalc = useMemo(
    () => evaluateAtmosphereExperiment(environment, mission, suitActive, suitInternalPressureKpa),
    [environment, mission, suitActive, suitInternalPressureKpa]
  );

  const currentTempCalc = useMemo(
    () =>
      evaluateTemperatureExperiment(
        environment,
        mission,
        probeRow,
        probeCol,
        modisData,
        divinerData,
        activeDataset
      ),
    [environment, mission, probeRow, probeCol, modisData, divinerData, earthDataset, planetDataset]
  );

  const activeTelemetry = useMemo(
    () =>
      buildEnvironmentTelemetry(
        environment,
        mission,
        activeDataset,
        environment === 'planet' ? planetEnvRef : null,
        currentTempCalc
      ),
    [environment, mission, activeDataset, planetEnvRef, currentTempCalc]
  );

  // Record results when an experiment completes or is evaluated
  const recordCurrentOutcome = useCallback(
    (side: EnvironmentSide, exp: ExperimentId) => {
      if (exp === 'gravity') {
        const res = calculateGravityDrop(side, mission, dropObjectId, dropHeightMeters);
        setGravityResults((prev) => ({ ...prev, [side]: res }));
      } else if (exp === 'atmosphere') {
        const res = evaluateAtmosphereExperiment(side, mission, suitActive, suitInternalPressureKpa);
        setAtmoResults((prev) => ({ ...prev, [side]: res }));
      } else if (exp === 'temperature') {
        const res = evaluateTemperatureExperiment(
          side,
          mission,
          probeRow,
          probeCol,
          modisData,
          divinerData,
          side === 'earth' ? earthDataset : planetDataset
        );
        setTempResults((prev) => ({ ...prev, [side]: res }));
      }
    },
    [
      mission,
      dropObjectId,
      dropHeightMeters,
      suitActive,
      suitInternalPressureKpa,
      probeRow,
      probeCol,
      modisData,
      divinerData,
      earthDataset,
      planetDataset,
    ]
  );

  // Update Lunar Base Site inspection when in base-site mode
  useEffect(() => {
    if (mission === 'mission-2-moon' && experiment === 'base-site') {
      const pin = SHACKLETON_CANDIDATE_PINS.find((p) => p.id === selectedSiteId);
      const r = pin ? pin.row : probeRow;
      const c = pin ? pin.col : probeCol;
      const label = pin ? pin.label : `Custom Cell (${r}, ${c})`;
      setInspectedSite(
        inspectLunarBaseSite(
          selectedSiteId,
          label,
          r,
          c,
          planetDataset,
          moonDerived,
          divinerData,
          null
        )
      );
    }
  }, [
    mission,
    experiment,
    selectedSiteId,
    probeRow,
    probeCol,
    planetDataset,
    moonDerived,
    divinerData,
  ]);

  const comparableGravity = Boolean(gravityResults.earth && gravityResults.planet &&
    gravityResults.earth.objectId === gravityResults.planet.objectId &&
    gravityResults.earth.dropHeightMeters === gravityResults.planet.dropHeightMeters);

  const marsMission = mission === 'mission-1-mars';
  const temperatureLogged = Boolean(tempResults.earth && tempResults.planet);
  const finalCheck = marsMission
    ? marsExposureChecks.unprotected && marsExposureChecks.protected
    : lunarSiteSelected && inspectedSite?.elevationMeters != null;
  const objectives = [
    { label: 'Compare matching gravity drops', done: comparableGravity },
    { label: 'Log a temperature observation on both worlds', done: temperatureLogged },
    { label: marsMission ? 'Test Mars with and without the suit' : 'Inspect a Shackleton candidate site', done: finalCheck },
  ];

  const selectSuit = (active: boolean) => {
    setSuitActive(active);
    const result = evaluateAtmosphereExperiment(environment, mission, active, suitInternalPressureKpa);
    setAtmoResults((previous) => ({ ...previous, [environment]: result }));
    if (environment === 'planet' && marsMission) {
      if (result.lifeSupportStatus.startsWith('CRITICAL')) {
        setMarsExposureChecks((previous) => ({ ...previous, unprotected: true }));
      } else if (active) {
        setMarsExposureChecks((previous) => ({ ...previous, protected: true }));
      }
    }
  };

  const runDuration = experiment === 'gravity' ? currentGravityCalc.fallTimeSeconds : experiment === 'temperature' ? 12 : 3;
  const handleSimTick = useCallback(
    (deltaSeconds: number) => setElapsedSeconds((previous) => Math.min(runDuration, previous + deltaSeconds)),
    [runDuration]
  );
  useEffect(() => {
    if (simState === 'running' && elapsedSeconds >= runDuration) {
      setSimState('completed');
      recordCurrentOutcome(environment, experiment);
    }
  }, [simState, elapsedSeconds, runDuration, recordCurrentOutcome, experiment, environment]);

  const handleStart = () => {
    if (simState === 'completed') {
      setElapsedSeconds(0);
    }
    if (experiment === 'atmosphere') {
      recordCurrentOutcome(environment, 'atmosphere');
    }
    setSimState('running');
  };

  const handlePause = () => {
    setSimState('paused');
  };

  const handleReset = () => {
    setSimState('idle');
    setElapsedSeconds(0);
  };

  const handleSwitchEnvironment = (nextEnv?: EnvironmentSide) => {
    const target = nextEnv ?? (environment === 'earth' ? 'planet' : 'earth');
    setEnvironment(target);
    setSimState('idle');
    setElapsedSeconds(0);
  };

  const handleReplaySide = (side: EnvironmentSide) => {
    setEnvironment(side);
    setElapsedSeconds(0);
    setSimState('running');
  };

  const handleTerrainClick = (row: number, col: number) => {
    setProbeRow(row);
    setProbeCol(col);
    if (experiment === 'base-site') {
      setLunarSiteSelected(true);
      setSelectedSiteId('custom-click');
      setEnvironment('planet');
    }
  };

  const handleSelectCandidatePin = (pinId: string) => {
    const pin = SHACKLETON_CANDIDATE_PINS.find((p) => p.id === pinId);
    if (!pin) return;
    setLunarSiteSelected(true);
    setSelectedSiteId(pin.id);
    setProbeRow(pin.row);
    setProbeCol(pin.col);
    setEnvironment('planet');
  };

  const planetLabel = mission === 'mission-1-mars' ? 'Mars' : 'Moon';
  const earthLabel = mission === 'mission-1-mars' ? 'Atacama Desert, Earth' : 'McMurdo Dry Valleys, Earth';
  const planetSiteLabel = mission === 'mission-1-mars' ? 'Jezero region, Mars' : 'Shackleton Crater, Moon';

  const currentProbeTempC =
    currentTempCalc.dataAvailable && currentTempCalc.ambientTempCelsius !== null
      ? evaluateProbeTemperatureAtTime(
          currentTempCalc.probeInitialCelsius,
          currentTempCalc.ambientTempCelsius,
          currentTempCalc.equilibrationTauSeconds,
          elapsedSeconds
        )
      : null;

  return (
    <div style={{ minHeight: '100vh', background: '#050811', color: '#e2e8f0', padding: '18px 22px 48px' }}>
      {/* Top Header */}
      <div
        style={{
          maxWidth: 1440,
          margin: '0 auto 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
          paddingBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link
            to="/explore"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 8,
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              color: '#e2e8f0',
              textDecoration: 'none',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={14} />
            Explore Hub
          </Link>
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#38bdf8', fontWeight: 700 }}>
              NASA Space Apps 2026 · 3D Comparative Scientific Simulation Lab
            </div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#f8fafc' }}>
              {mission === 'mission-1-mars'
                ? 'Mission 1: The Red Planet Survival Challenge'
                : 'Mission 2: The Lunar South Pole Expedition'}
            </h1>
          </div>
        </div>

        {/* Mission Selector */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleSelectMission('mission-1-mars')}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              border: mission === 'mission-1-mars' ? '1px solid #f97316' : '1px solid rgba(148,163,184,0.22)',
              background: mission === 'mission-1-mars' ? 'rgba(249, 115, 22, 0.18)' : 'rgba(15, 23, 42, 0.8)',
              color: mission === 'mission-1-mars' ? '#fdba74' : '#94a3b8',
            }}
          >
            Mission 1: Atacama ↔ Mars
          </button>
          <button
            type="button"
            onClick={() => handleSelectMission('mission-2-moon')}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              border: mission === 'mission-2-moon' ? '1px solid #38bdf8' : '1px solid rgba(148,163,184,0.22)',
              background: mission === 'mission-2-moon' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(15, 23, 42, 0.8)',
              color: mission === 'mission-2-moon' ? '#7dd3fc' : '#94a3b8',
            }}
          >
            Mission 2: McMurdo ↔ Shackleton
          </button>
        </div>
      </div>

      <section className="mission-brief" aria-labelledby="mission-objectives-title">
        <h2 id="mission-objectives-title">Mission objectives</h2>
        <p>{marsMission ? 'Prepare for surface operations on Mars. Compare the drop, check the suit and log the available temperature evidence.' : 'Survey Shackleton. Compare the drop, log the temperature evidence and inspect a candidate site.'}</p>
        <ul>{objectives.map(({label, done}) => <li key={label}>{done ? '✓' : '○'} {label}</li>)}</ul>
        <button type="button" className="btn btn--primary" disabled={!objectives.every(({done}) => done) || missionFinished}
          onClick={() => setMissionFinished(true)}>Complete Mission</button>
        {missionFinished && <div role="status" className="mission-debrief">
          <h3>Mission complete</h3>
          <p>{marsMission ? 'Debrief: Mars gravity slows the drop. Surface operations require a pressurized suit. A planetary temperature reference is available and a local Mars reading is unavailable.' : 'Debrief: The gravity and temperature observations inform the survey. The available datasets cannot certify a permanent base as safe.'}</p>
        </div>}
      </section>

      {/* Scientific Method Workflow Bar + Experiment Tabs */}
      <div style={{ maxWidth: 1440, margin: '0 auto 14px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {availableExperiments.map((exp) => {
            const Icon = exp.icon;
            const active = experiment === exp.id;
            return (
              <button
                key={exp.id}
                type="button"
                onClick={() => {
                  setExperiment(exp.id);
                  setSimState('idle');
                  setElapsedSeconds(0);
                  if (exp.id === 'base-site') {
                    setEnvironment('planet');
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '9px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: active ? '1px solid #38bdf8' : '1px solid rgba(148,163,184,0.2)',
                  background: active ? 'rgba(56, 189, 248, 0.16)' : 'rgba(15, 23, 42, 0.75)',
                  color: active ? '#f8fafc' : '#94a3b8',
                }}
              >
                <Icon size={15} />
                {exp.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            fontSize: 11.5,
            color: '#94a3b8',
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(148, 163, 184, 0.18)',
            borderRadius: 8,
            padding: '7px 12px',
          }}
        >
          Protocol: <strong style={{ color: '#e2e8f0' }}>Select Experiment</strong> →{' '}
          <strong style={{ color: '#34d399' }}>Run on Earth</strong> →{' '}
          <strong style={{ color: '#fbbf24' }}>Switch to {planetLabel}</strong> →{' '}
          <strong style={{ color: '#38bdf8' }}>Compare Results</strong>
        </div>
      </div>

      {/* Main 3D Lab Grid */}
      <div className="comparative-lab-grid"
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          display: 'grid',
          gap: 16,
          alignItems: 'stretch',
        }}
      >
        {/* 3D Interactive Viewport Card */}
        <div
          style={{
            background: 'rgba(11, 17, 32, 0.85)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: 14,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            minHeight: 580,
          }}
        >
          {/* Environment Switcher Header inside Viewport */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 700,
                  background: environment === 'earth' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(249, 115, 22, 0.18)',
                  color: environment === 'earth' ? '#34d399' : '#fb923c',
                  border: environment === 'earth' ? '1px solid rgba(52, 211, 153, 0.45)' : '1px solid rgba(251, 146, 60, 0.45)',
                }}
              >
                {environment === 'earth' ? 'EARTH ANALOG' : `${planetLabel.toUpperCase()} DESTINATION`}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc' }}>
                {environment === 'earth' ? earthLabel : planetSiteLabel}
              </span>
              {loadingDatasets && (
                <span style={{ fontSize: 11.5, color: '#38bdf8' }}>Loading NASA DEM...</span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => handleSwitchEnvironment()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 13px',
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid rgba(56, 189, 248, 0.5)',
                  background: 'rgba(56, 189, 248, 0.18)',
                  color: '#7dd3fc',
                }}
              >
                <ArrowLeftRight size={14} />
                Switch to {environment === 'earth' ? planetLabel : 'Earth'}
              </button>
              <button
                type="button"
                onClick={() => setCameraResetNonce((n) => n + 1)}
                title="Reset 3D Camera"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '7px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                  cursor: 'pointer',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  background: 'rgba(30, 41, 59, 0.7)',
                  color: '#cbd5e1',
                }}
              >
                <Compass size={14} />
                Reset View
              </button>
            </div>
          </div>

          {/* 3D Canvas */}
          <div style={{ flex: 1, minHeight: 490 }}>
            <ComparativeScienceViewport
              mission={mission}
              environment={environment}
              experiment={experiment}
              dataset={activeDataset}
              simState={simState}
              elapsedSeconds={elapsedSeconds}
              dropObjectId={dropObjectId}
              dropHeightMeters={dropHeightMeters}
              gravityMs2={activeGravityMs2}
              suitActive={suitActive}
              suitInternalPressureKpa={suitInternalPressureKpa}
              probeRow={probeRow}
              probeCol={probeCol}
              temperatureResult={currentTempCalc}
              selectedSiteId={selectedSiteId}
              cameraResetNonce={cameraResetNonce}
              onTerrainClick={handleTerrainClick}
              onSimTick={handleSimTick}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#94a3b8', padding: '0 4px' }}>
            <span>Controls: Left-drag rotate · Scroll zoom · Right-drag pan · Click terrain to place probe / inspect cell</span>
            <span>DEM Source: {activeDataset?.provenance.productId ?? 'Loading...'}</span>
          </div>
        </div>

        {/* Right Column: Experiment Control Panel + Environmental Info Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Experiment Control Panel */}
          <div
            style={{
              background: 'rgba(11, 17, 32, 0.88)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: 14,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
                Experiment Control Panel
              </h2>
              <span style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#38bdf8' }}>
                t = {elapsedSeconds.toFixed(2)} s · {simState.toUpperCase()}
              </span>
            </div>

            {/* Experiment-Specific Controls */}
            {experiment === 'gravity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Test Object (Identical on Earth & {planetLabel})
                  </label>
                  <select
                    value={dropObjectId}
                    onChange={(e) => {
                      setDropObjectId(e.target.value as DropObjectId);
                      handleReset();
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: '#0f172a',
                      border: '1px solid rgba(148,163,184,0.28)',
                      color: '#f8fafc',
                      fontSize: 13,
                    }}
                  >
                    {DROP_OBJECTS.map((obj) => (
                      <option key={obj.id} value={obj.id}>
                        {obj.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    <span>Drop Height (h)</span>
                    <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>{dropHeightMeters} m</strong>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={30}
                    step={1}
                    value={dropHeightMeters}
                    onChange={(e) => {
                      setDropHeightMeters(Number(e.target.value));
                      handleReset();
                    }}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            )}

            {experiment === 'atmosphere' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => selectSuit(false)}
                    style={{
                      padding: '9px 10px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: !suitActive ? '1px solid #f59e0b' : '1px solid rgba(148,163,184,0.22)',
                      background: !suitActive ? 'rgba(245, 158, 11, 0.16)' : 'rgba(15, 23, 42, 0.7)',
                      color: !suitActive ? '#fcd34d' : '#94a3b8',
                    }}
                  >
                    WITHOUT EVA SUIT
                  </button>
                  <button
                    type="button"
                    onClick={() => selectSuit(true)}
                    style={{
                      padding: '9px 10px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: suitActive ? '1px solid #38bdf8' : '1px solid rgba(148,163,184,0.22)',
                      background: suitActive ? 'rgba(56, 189, 248, 0.16)' : 'rgba(15, 23, 42, 0.7)',
                      color: suitActive ? '#7dd3fc' : '#94a3b8',
                    }}
                  >
                    WITH PRESSURIZED EVA SUIT
                  </button>
                </div>

                {suitActive && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      Internal Suit Pressure <ProvenanceTag label="ASSUMPTION" />
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[29.6, 57.2].map((kpa) => (
                        <button
                          key={kpa}
                          type="button"
                          onClick={() => setSuitInternalPressureKpa(kpa)}
                          style={{
                            padding: '4px 9px',
                            borderRadius: 6,
                            fontSize: 11.5,
                            cursor: 'pointer',
                            border: suitInternalPressureKpa === kpa ? '1px solid #38bdf8' : '1px solid rgba(148,163,184,0.25)',
                            background: suitInternalPressureKpa === kpa ? 'rgba(56, 189, 248, 0.2)' : '#0f172a',
                            color: '#f8fafc',
                          }}
                        >
                          {kpa} kPa
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    background:
                      currentAtmoCalc.lifeSupportStatus.startsWith('CRITICAL')
                        ? 'rgba(239, 68, 68, 0.14)'
                        : 'rgba(16, 185, 129, 0.12)',
                    border:
                      currentAtmoCalc.lifeSupportStatus.startsWith('CRITICAL')
                        ? '1px solid rgba(239, 68, 68, 0.45)'
                        : '1px solid rgba(52, 211, 153, 0.4)',
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 4 }}>
                    {currentAtmoCalc.lifeSupportStatus.startsWith('CRITICAL') ? (
                      <ShieldAlert size={15} color="#f87171" />
                    ) : (
                      <ShieldCheck size={15} color="#34d399" />
                    )}
                    <span>{currentAtmoCalc.lifeSupportStatus}</span>
                  </div>
                  <div style={{ color: '#cbd5e1', lineHeight: 1.45 }}>{currentAtmoCalc.hazardSummary}</div>
                  <div>Ambient O₂ partial pressure: {currentAtmoCalc.outsideOxygenPartialPressureKpa.toFixed(3)} kPa</div>
                  {currentAtmoCalc.suitOxygenPartialPressureKpa !== null && (
                    <div>Suit O₂ partial pressure: {currentAtmoCalc.suitOxygenPartialPressureKpa.toFixed(2)} kPa</div>
                  )}
                </div>
              </div>
            )}

            {experiment === 'temperature' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
                <div style={{ color: '#94a3b8' }}>
                  Click terrain to place the thermal sensor (current cell:{' '}
                  <strong style={{ color: '#f8fafc' }}>
                    {probeRow}, {probeCol}
                  </strong>
                  ).
                </div>
                <button type="button" className="btn" disabled={loadingDatasets} onClick={() => recordCurrentOutcome(environment, 'temperature')}>
                  Log {environment === 'earth' ? 'Earth' : planetLabel} temperature observation
                </button>
                <div
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(148,163,184,0.2)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#94a3b8' }}>Live Probe Reading:</span>
                    <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>
                      {currentProbeTempC !== null
                        ? `${currentProbeTempC.toFixed(1)} °C (${(currentProbeTempC + 273.15).toFixed(1)} K)`
                        : 'Masked / Unavailable'}
                    </strong>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#94a3b8', lineHeight: 1.4 }}>
                    {currentTempCalc.measurementContext} The accelerated probe model uses a fixed target and a 4-second time constant on the simulation clock.
                  </div>
                </div>
              </div>
            )}

            {experiment === 'base-site' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  Select a candidate landing site or click directly on the 3D LOLA Shackleton Crater mesh:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {SHACKLETON_CANDIDATE_PINS.map((pin) => (
                    <button
                      key={pin.id}
                      type="button"
                      onClick={() => handleSelectCandidatePin(pin.id)}
                      style={{
                        padding: '7px 8px',
                        borderRadius: 7,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: selectedSiteId === pin.id ? '1px solid #34d399' : '1px solid rgba(148,163,184,0.22)',
                        background: selectedSiteId === pin.id ? 'rgba(16, 185, 129, 0.16)' : '#0f172a',
                        color: selectedSiteId === pin.id ? '#6ee7b7' : '#cbd5e1',
                      }}
                    >
                      {pin.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Playback Action Buttons */}
            {experiment !== 'base-site' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={simState === 'running'}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '9px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: simState === 'running' ? 'not-allowed' : 'pointer',
                    border: '1px solid rgba(52, 211, 153, 0.5)',
                    background: simState === 'running' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.22)',
                    color: '#34d399',
                  }}
                >
                  <Play size={14} />
                  {simState === 'completed' ? 'Run Again' : 'START'}
                </button>
                <button
                  type="button"
                  onClick={handlePause}
                  disabled={simState !== 'running'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '9px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: simState !== 'running' ? 'not-allowed' : 'pointer',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    background: 'rgba(30, 41, 59, 0.7)',
                    color: '#e2e8f0',
                  }}
                >
                  <Pause size={14} />
                  PAUSE
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '9px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    background: 'rgba(30, 41, 59, 0.7)',
                    color: '#e2e8f0',
                  }}
                >
                  <RotateCcw size={14} />
                  RESET
                </button>
              </div>
            )}
          </div>

          {/* Environmental Info Panel */}
          <div
            style={{
              background: 'rgba(11, 17, 32, 0.88)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: 14,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
                Environmental Telemetry
              </h2>
              <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{activeTelemetry.bodyName}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6, borderBottom: '1px solid rgba(148,163,184,0.12)' }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: 11.5 }}>Surface Gravity</div>
                  <div style={{ fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' }}>
                    {activeTelemetry.gravityMs2} m/s²
                  </div>
                </div>
                <ProvenanceTag label="PUBLISHED REF" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6, borderBottom: '1px solid rgba(148,163,184,0.12)' }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: 11.5 }}>Atmospheric Pressure</div>
                  <div style={{ fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' }}>
                    {activeTelemetry.pressureMbar < 0.001
                      ? `${activeTelemetry.pressureMbar.toExponential(1)} mbar`
                      : `${activeTelemetry.pressureMbar} mbar`}
                  </div>
                </div>
                <ProvenanceTag label="PUBLISHED REF" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6, borderBottom: '1px solid rgba(148,163,184,0.12)' }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: 11.5 }}>Oxygen (O₂) Availability</div>
                  <div style={{ fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' }}>
                    {activeTelemetry.oxygenPct}%
                  </div>
                </div>
                <ProvenanceTag label="PUBLISHED REF" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6, borderBottom: '1px solid rgba(148,163,184,0.12)' }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: 11.5 }}>Surface Temperature</div>
                  <div style={{ fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' }}>
                    {activeTelemetry.temperatureCelsius !== null
                      ? `${activeTelemetry.temperatureCelsius} °C (${activeTelemetry.temperatureKelvin} K)`
                      : 'Cloud / Darkness Masked'}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>{activeTelemetry.temperatureSource}</div>
                </div>
                <ProvenanceTag label={activeTelemetry.temperatureTier} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: 11.5 }}>DEM Elevation Range</div>
                  <div style={{ fontWeight: 600, color: '#f8fafc', fontFamily: 'monospace', fontSize: 12 }}>
                    {activeTelemetry.elevationRangeLabel}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>{activeTelemetry.elevationSource}</div>
                </div>
                <ProvenanceTag label="MEASURED" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Panel */}
      <div
        style={{
          maxWidth: 1440,
          margin: '18px auto 0',
          background: 'rgba(11, 17, 32, 0.9)',
          border: '1px solid rgba(148, 163, 184, 0.22)',
          borderRadius: 14,
          padding: 18,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16.5, fontWeight: 700, color: '#f8fafc' }}>
              Side-by-Side Comparative Results ({earthLabel} vs {planetSiteLabel})
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#94a3b8' }}>
              Identical experiment parameters are evaluated under both worlds so you can directly isolate environmental physics.
            </p>
          </div>
          {experiment !== 'base-site' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => handleReplaySide('earth')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid rgba(52, 211, 153, 0.45)',
                  background: 'rgba(16, 185, 129, 0.16)',
                  color: '#34d399',
                }}
              >
                <Play size={13} />
                Replay Earth
              </button>
              <button
                type="button"
                onClick={() => handleReplaySide('planet')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid rgba(251, 146, 60, 0.45)',
                  background: 'rgba(249, 115, 22, 0.16)',
                  color: '#fb923c',
                }}
              >
                <Play size={13} />
                Replay {planetLabel}
              </button>
            </div>
          )}
        </div>

        {/* Gravity Comparison Table */}
        {experiment === 'gravity' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 12 }}>
            <div style={{ padding: 14, borderRadius: 10, background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(52, 211, 153, 0.25)' }}>
              <div style={{ fontSize: 12, color: '#34d399', fontWeight: 700, marginBottom: 6 }}>EARTH ANALOG RESULT</div>
              {gravityResults.earth ? (
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                  <div>Gravity: <strong>{gravityResults.earth.gravityMs2} m/s²</strong></div>
                  <div>Fall Time ({gravityResults.earth.dropHeightMeters} m): <strong>{gravityResults.earth.fallTimeSeconds.toFixed(3)} s</strong></div>
                  <div>Final Velocity: <strong>{gravityResults.earth.finalVelocityMs.toFixed(2)} m/s</strong></div>
                  <div>Impact Energy: <strong>{gravityResults.earth.impactEnergyJoules.toFixed(1)} J</strong></div>
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: '#94a3b8' }}>Run the Gravity Drop on Earth to record baseline kinematics.</div>
              )}
            </div>

            <div style={{ padding: 14, borderRadius: 10, background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(251, 146, 60, 0.25)' }}>
              <div style={{ fontSize: 12, color: '#fb923c', fontWeight: 700, marginBottom: 6 }}>{planetLabel.toUpperCase()} DESTINATION RESULT</div>
              {gravityResults.planet ? (
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                  <div>Gravity: <strong>{gravityResults.planet.gravityMs2} m/s²</strong></div>
                  <div>Fall Time ({gravityResults.planet.dropHeightMeters} m): <strong>{gravityResults.planet.fallTimeSeconds.toFixed(3)} s</strong></div>
                  <div>Final Velocity: <strong>{gravityResults.planet.finalVelocityMs.toFixed(2)} m/s</strong></div>
                  <div>Impact Energy: <strong>{gravityResults.planet.impactEnergyJoules.toFixed(1)} J</strong></div>
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: '#94a3b8' }}>Switch to {planetLabel} and press START to record planetary kinematics.</div>
              )}
            </div>

            <div style={{ padding: 14, borderRadius: 10, background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
              <div style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700, marginBottom: 6 }}>COMPARATIVE ANALYSIS</div>
              {gravityResults.earth && gravityResults.planet && comparableGravity ? (
                <div style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.55 }}>
                  <div>
                    Fall Time Ratio: <strong>{(gravityResults.planet.fallTimeSeconds / gravityResults.earth.fallTimeSeconds).toFixed(2)}× longer</strong> on {planetLabel}
                  </div>
                  <div>
                    Touchdown Speed Ratio: <strong>{(gravityResults.planet.finalVelocityMs / gravityResults.earth.finalVelocityMs).toFixed(2)}×</strong> of Earth speed
                  </div>
                  <div style={{ marginTop: 6, color: '#94a3b8' }}>
                    Because <code style={{ color: '#e2e8f0' }}>t = √(2h / g)</code>, lower surface gravity reduces downward acceleration and increases free-fall duration for identical drop heights.
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: '#94a3b8' }}>
                  Complete both runs with the same object and height to compare results.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Atmosphere Comparison */}
        {experiment === 'atmosphere' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 12 }}>
            <div style={{ padding: 14, borderRadius: 10, background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(52, 211, 153, 0.25)' }}>
              <div style={{ fontSize: 12, color: '#34d399', fontWeight: 700, marginBottom: 6 }}>EARTH ANALOG (ATACAMA)</div>
              {atmoResults.earth ? (
                <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>
                  <div>Outside: <strong>{atmoResults.earth.outsidePressureMbar} mbar</strong> · <strong>{atmoResults.earth.outsideOxygenPct}% O₂</strong></div>
                  <div>Status: <strong style={{ color: '#34d399' }}>{atmoResults.earth.lifeSupportStatus}</strong></div>
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: '#94a3b8' }}>Run or toggle suit on Earth to log atmospheric status.</div>
              )}
            </div>

            <div style={{ padding: 14, borderRadius: 10, background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(251, 146, 60, 0.25)' }}>
              <div style={{ fontSize: 12, color: '#fb923c', fontWeight: 700, marginBottom: 6 }}>MARS DESTINATION</div>
              {atmoResults.planet ? (
                <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>
                  <div>Outside: <strong>{atmoResults.planet.outsidePressureMbar} mbar</strong> · <strong>{atmoResults.planet.outsideOxygenPct}% O₂</strong></div>
                  <div>
                    Status:{' '}
                    <strong style={{ color: atmoResults.planet.lifeSupportStatus.startsWith('CRITICAL') ? '#f87171' : '#34d399' }}>
                      {atmoResults.planet.lifeSupportStatus}
                    </strong>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: '#94a3b8' }}>Switch to Mars and test WITHOUT vs WITH EVA SUIT.</div>
              )}
            </div>

            <div style={{ padding: 14, borderRadius: 10, background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
              <div style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700, marginBottom: 6 }}>WHY ATACAMA IS NOT A BREATHING ANALOG</div>
              <div style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.55 }}>
                The Yungay scenario assumes 905 mbar. NASA’s Mars reference is 6.36 mbar at mean radius and varies with season and elevation. The Armstrong limit is 62.8 mbar.
              </div>
            </div>
          </div>
        )}

        {/* Temperature Comparison */}
        {experiment === 'temperature' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 12 }}>
            <div style={{ padding: 14, borderRadius: 10, background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(52, 211, 153, 0.25)' }}>
              <div style={{ fontSize: 12, color: '#34d399', fontWeight: 700, marginBottom: 6 }}>EARTH THERMAL SAMPLE (MODIS MOD11A2)</div>
              {tempResults.earth ? (
                <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>
                  <div>Ambient: <strong>{tempResults.earth.ambientTempCelsius ?? 'Masked'} °C</strong></div>
                  <div style={{ color: '#94a3b8', fontSize: 11.5 }}>{tempResults.earth.datasetSource}</div>
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: '#94a3b8' }}>Run Temperature Exposure on Earth to log MODIS sample.</div>
              )}
            </div>

            <div style={{ padding: 14, borderRadius: 10, background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(251, 146, 60, 0.25)' }}>
              <div style={{ fontSize: 12, color: '#fb923c', fontWeight: 700, marginBottom: 6 }}>{planetLabel.toUpperCase()} THERMAL SAMPLE</div>
              {tempResults.planet ? (
                <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>
                  <div>
                    Ambient:{' '}
                    <strong>
                      {tempResults.planet.ambientTempCelsius !== null
                        ? `${tempResults.planet.ambientTempCelsius} °C (${tempResults.planet.ambientTempKelvin} K)`
                        : 'Unavailable'}
                    </strong>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 11.5 }}>{tempResults.planet.datasetSource}</div>
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: '#94a3b8' }}>Switch to {planetLabel} and run Temperature Exposure.</div>
              )}
            </div>

            <div style={{ padding: 14, borderRadius: 10, background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
              <div style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700, marginBottom: 6 }}>THERMAL DELTA & PROVENANCE</div>
              {tempResults.earth &&
              tempResults.planet &&
              tempResults.earth.ambientTempCelsius !== null &&
              tempResults.planet.ambientTempCelsius !== null ? (
                <div style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.55 }}>
                  <Flame size={14} style={{ display: 'inline', marginRight: 5, color: '#fbbf24' }} />
                  Temperature Gap:{' '}
                  <strong>
                    {Math.abs(tempResults.earth.ambientTempCelsius - tempResults.planet.ambientTempCelsius).toFixed(1)} °C
                  </strong>{' '}
                  colder on {planetLabel}.
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: '#94a3b8' }}>
                  Run both Earth and {planetLabel} thermal exposures to compute ΔT.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lunar Base-Site Inspection */}
        {experiment === 'base-site' && inspectedSite && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(170px, 100%), 1fr))', gap: 10 }}>
              <div style={{ padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid rgba(148,163,184,0.18)' }}>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Site & Grid Cell</div>
                <div style={{ fontWeight: 700, color: '#f8fafc' }}>{inspectedSite.siteName}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Row {inspectedSite.row}, Col {inspectedSite.col}</div>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid rgba(148,163,184,0.18)' }}>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>LOLA Elevation / Horn Slope</div>
                <div style={{ fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' }}>
                  {inspectedSite.elevationMeters ?? '—'} m · {inspectedSite.slopeDegrees ?? '—'}°
                </div>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid rgba(148,163,184,0.18)' }}>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Diviner PCP Temp</div>
                <div style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
                  {inspectedSite.divinerTempKelvin ?? '—'} K ({inspectedSite.divinerTempCelsius ?? '—'} °C)
                </div>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid rgba(148,163,184,0.18)' }}>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Illumination / DTE Comms</div>
                <div style={{ fontWeight: 700, color: '#fbbf24', fontFamily: 'monospace' }}>
                  {inspectedSite.illuminationPct ?? '—'}% · {inspectedSite.dteCommsPct ?? '—'}%
                </div>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid rgba(148,163,184,0.18)' }}>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Water-equivalent hydrogen / Radiation</div>
                <div style={{ fontWeight: 700, color: '#34d399', fontFamily: 'monospace' }}>
                  {inspectedSite.waterIceWehPct ?? '—'} wt% · {inspectedSite.radiationMsvYr ?? '—'} mSv/yr
                </div>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid rgba(148,163,184,0.18)' }}>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Roughness (TRI) / Rock Abundance</div>
                <div style={{ fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace' }}>
                  {inspectedSite.roughnessTriMeters ?? '—'} m · {inspectedSite.rockAbundancePct ?? '—'}%
                </div>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid rgba(148,163,184,0.18)' }}>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Regolith Bearing Capacity</div>
                <div style={{ fontWeight: 700, color: '#c084fc', fontFamily: 'monospace' }}>
                  {inspectedSite.bearingCapacityKpa ?? '—'} kPa
                </div>
              </div>
            </div>

            <div
              style={{
                padding: 12,
                borderRadius: 9,
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                fontSize: 12.5,
                color: '#fde68a',
                lineHeight: 1.5,
              }}
            >
              <div>
                <strong>Engineering Assessment:</strong> {inspectedSite.certificationVerdict}
              </div>
              <div style={{ marginTop: 6, color: '#cbd5e1', fontSize: 12 }}>
                <strong>Why the 5 core datasets alone cannot certify a base as safe:</strong> LOLA elevation and Diviner PCP temperature do not measure solar illumination continuity, Earth line-of-sight (DTE) comms, subsurface water-ice (LEND), cosmic/solar radiation dose, or regolith bearing strength—all of which are required before declaring any site habitable.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
