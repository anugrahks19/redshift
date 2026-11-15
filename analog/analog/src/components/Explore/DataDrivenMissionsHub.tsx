import { SHACKLETON_CANDIDATE_PINS } from '../Mission/3D/ComparativeScienceViewport';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Layers,
  MapPin,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Snowflake,
  Sparkles,
} from 'lucide-react';
import { usePlatformContext } from '../../context/PlatformContext';
import {
  attachTemperatureAndSimilarityGrids,
  computeDerivedTerrain,
  inspectGridCell,
  renderSpatialMapToCanvas,
} from '../../services/geospatialService';
import {
  loadBaseCertificationDataset,
  loadDivinerPcpDataset,
  loadMarsTesThermalDataset,
  loadModisLstDataset,
  loadPlanetaryEnvironment,
  loadTerrainDataset,
  type BaseCertificationDataset,
  type DivinerPcpDataset,
  type ModisLstDataset,
  type PlanetaryEnvironmentReference,
  type Section9ThermalBundle,
} from '../../services/terrainDataService';
import type { SpatialLayerId, TerrainGridDataset } from '../../types/terrain';

type MissionKey = 'mission-1-mars' | 'mission-2-moon';
type StageKey = 'stage-a' | 'stage-b' | 'stage-c' | 'stage-d' | 'stage-e';



const SHACKLETON_CANDIDATE_POINTS = SHACKLETON_CANDIDATE_PINS.map((pin) => ({
  ...pin,
  name: pin.label,
  terrainZone: 'Candidate cell',
  description: 'Inspect the selected terrain cell and available measurements.',
}));

const ATACAMA_POIS = [
  {
    id: 'poi-nitrate',
    name: 'Yungay Hyperarid Nitrate & Halite Playas',
    row: 58,
    col: 62,
    summary: 'Flat alluvial basin floor (<3° slope) where NASADEM measures ~1,018 m elevation and MODIS records +36.7 °C daytime skin temperatures.',
  },
  {
    id: 'poi-smectite',
    name: 'Subsurface Wet Smectite Clay Horizon (~30 cm)',
    row: 68,
    col: 72,
    summary: 'Protected clay layer beneath desiccated halite crust preserving biosignatures—direct analog for Gale & Jezero phyllosilicates.',
  },
  {
    id: 'poi-pediment',
    name: 'Dissected Alluvial Fan & Escarpment Slope',
    row: 34,
    col: 94,
    summary: 'Steeper pediment ridge (8°–16° Horn slope) used to test Mars rover autonomous hazard avoidance and wheel slip.',
  },
];

export const DataDrivenMissionsHub: React.FC = () => {
  const {
    setTargetPlanet,
    setSelectedPlanetaryRegionId,
    setSelectedEarthSiteId,
    setExpeditionDecision,
  } = usePlatformContext();

  const [activeMission, setActiveMission] = useState<MissionKey>('mission-1-mars');
  const [activeStage, setActiveStage] = useState<StageKey>('stage-a');
  const [activeHeatmapLayer, setActiveHeatmapLayer] = useState<SpatialLayerId>('elevation');

  // Datasets
  const [atacamaDem, setAtacamaDem] = useState<TerrainGridDataset | null>(null);
  const [mcmurdoDem, setMcmurdoDem] = useState<TerrainGridDataset | null>(null);
  const [marsMolaDem, setMarsMolaDem] = useState<TerrainGridDataset | null>(null);
  const [marsGaleDem, setMarsGaleDem] = useState<TerrainGridDataset | null>(null);
  const [moonShackletonDem, setMoonShackletonDem] = useState<TerrainGridDataset | null>(null);
  const [modisData, setModisData] = useState<ModisLstDataset | null>(null);
  const [divinerData, setDivinerData] = useState<DivinerPcpDataset | null>(null);
  const [marsTesThermal, setMarsTesThermal] = useState<Section9ThermalBundle | null>(null);
  const [baseCertification, setBaseCertification] = useState<BaseCertificationDataset | null>(null);

  // Planetary Environment Reference Files (Part 7)
  const [earthEnv, setEarthEnv] = useState<PlanetaryEnvironmentReference | null>(null);
  const [marsEnv, setMarsEnv] = useState<PlanetaryEnvironmentReference | null>(null);
  const [moonEnv, setMoonEnv] = useState<PlanetaryEnvironmentReference | null>(null);

  // Mission 1 Interactive State
  const [marsTargetChoice, setMarsTargetChoice] = useState<'jezero-mola' | 'gale-hirise'>('jezero-mola');
  const [selectedAtacamaPoi, setSelectedAtacamaPoi] = useState<string>(ATACAMA_POIS[0]!.id);
  const [collectedPois, setCollectedPois] = useState<string[]>([ATACAMA_POIS[0]!.id]);
  const [spacesuitActive, setSpacesuitActive] = useState<boolean>(false);
  const [transferProgress, setTransferProgress] = useState<number>(100);

  // Mission 2 Interactive State
  const [selectedLunarCandidateId, setSelectedLunarCandidateId] = useState<string>(
    SHACKLETON_CANDIDATE_POINTS[0]!.id
  );
  const [inspectedCell, setInspectedCell] = useState<{ row: number; col: number }>({
    row: SHACKLETON_CANDIDATE_POINTS[0]!.row,
    col: SHACKLETON_CANDIDATE_POINTS[0]!.col,
  });
  const [missionReportSaved, setMissionReportSaved] = useState<string | null>(null);

  const earthCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const planetCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load all 5 NASA datasets + McMurdo Polar DEM + Planetary Environment JSONs
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      loadTerrainDataset('earth-yungay-nasadem-30m', 'REAL_DATA'),
      loadTerrainDataset('earth-mcmurdo-dem-30m', 'REAL_DATA'),
      loadTerrainDataset('mars-jezero-mola-megdr', 'REAL_DATA'),
      loadTerrainDataset('mars-gale-murray-30m', 'REAL_DATA'),
      loadTerrainDataset('moon-shackleton-lola', 'REAL_DATA'),
      loadModisLstDataset(),
      loadDivinerPcpDataset(),
      loadPlanetaryEnvironment('earth'),
      loadPlanetaryEnvironment('mars'),
      loadPlanetaryEnvironment('moon'),
      loadMarsTesThermalDataset(),
      loadBaseCertificationDataset(),
    ]).then((res) => {
      if (!active) return;
      if (res[0]?.status === 'fulfilled') setAtacamaDem(res[0].value);
      if (res[1]?.status === 'fulfilled') setMcmurdoDem(res[1].value);
      if (res[2]?.status === 'fulfilled') setMarsMolaDem(res[2].value);
      if (res[3]?.status === 'fulfilled') setMarsGaleDem(res[3].value);
      if (res[4]?.status === 'fulfilled') setMoonShackletonDem(res[4].value);
      if (res[5]?.status === 'fulfilled') setModisData(res[5].value);
      if (res[6]?.status === 'fulfilled') setDivinerData(res[6].value);
      if (res[7]?.status === 'fulfilled') setEarthEnv(res[7].value);
      if (res[8]?.status === 'fulfilled') setMarsEnv(res[8].value);
      if (res[9]?.status === 'fulfilled') setMoonEnv(res[9].value);
      if (res[10]?.status === 'fulfilled') setMarsTesThermal(res[10].value);
      if (res[11]?.status === 'fulfilled') setBaseCertification(res[11].value);
    });
    return () => {
      active = false;
    };
  }, []);

  const currentEarthDataset = activeMission === 'mission-1-mars' ? atacamaDem : mcmurdoDem;
  const currentPlanetDataset =
    activeMission === 'mission-1-mars'
      ? marsTargetChoice === 'jezero-mola'
        ? marsMolaDem
        : marsGaleDem
      : moonShackletonDem;

  const earthBaseDerived = useMemo(
    () => (currentEarthDataset ? computeDerivedTerrain(currentEarthDataset) : null),
    [currentEarthDataset]
  );
  const planetBaseDerived = useMemo(
    () => (currentPlanetDataset ? computeDerivedTerrain(currentPlanetDataset) : null),
    [currentPlanetDataset]
  );

  const currentModisProfile = useMemo(() => {
    if (!modisData) return null;
    return activeMission === 'mission-1-mars'
      ? modisData.sites['yungay-atacama'] ?? null
      : modisData.sites['mcmurdo-dry-valleys'] ?? null;
  }, [modisData, activeMission]);

  const { earthEnhanced: earthDerived, marsEnhanced: planetDerived } = useMemo(
    () =>
      attachTemperatureAndSimilarityGrids(
        currentEarthDataset,
        earthBaseDerived,
        currentPlanetDataset,
        planetBaseDerived,
        currentModisProfile,
        divinerData,
        'day',
        { elevation: 0.2, slope: 0.25, roughness: 0.25, temperature: 0.3 },
        { marsTesThermal, baseCertification }
      ),
    [currentEarthDataset, earthBaseDerived, currentPlanetDataset, planetBaseDerived, currentModisProfile, divinerData, marsTesThermal, baseCertification]
  );

  // Render Earth & Planetary Heatmaps onto interactive canvases
  useEffect(() => {
    if (earthCanvasRef.current && currentEarthDataset && earthDerived) {
      renderSpatialMapToCanvas(
        {
          dataset: currentEarthDataset,
          derived: earthDerived,
          activeLayer: activeHeatmapLayer,
          hillshade: true,
          contours: true,
          size: 420,
        },
        earthCanvasRef.current
      );
    }
  }, [currentEarthDataset, earthDerived, activeHeatmapLayer, activeStage, activeMission]);

  useEffect(() => {
    if (planetCanvasRef.current && currentPlanetDataset && planetDerived) {
      renderSpatialMapToCanvas(
        {
          dataset: currentPlanetDataset,
          derived: planetDerived,
          activeLayer: activeHeatmapLayer,
          hillshade: true,
          contours: true,
          size: 420,
        },
        planetCanvasRef.current
      );
    }
  }, [currentPlanetDataset, planetDerived, activeHeatmapLayer, activeStage, activeMission, marsTargetChoice]);

  const earthPointSample = useMemo(() => {
    if (!currentEarthDataset || !earthDerived) return null;
    return inspectGridCell(currentEarthDataset, earthDerived, inspectedCell.row, inspectedCell.col);
  }, [currentEarthDataset, earthDerived, inspectedCell]);

  const planetPointSample = useMemo(() => {
    if (!currentPlanetDataset || !planetDerived) return null;
    return inspectGridCell(currentPlanetDataset, planetDerived, inspectedCell.row, inspectedCell.col);
  }, [currentPlanetDataset, planetDerived, inspectedCell]);

  const handleSwitchMission = (m: MissionKey) => {
    setActiveMission(m);
    setActiveStage('stage-a');
    setMissionReportSaved(null);
    if (m === 'mission-1-mars') {
      setTargetPlanet('Mars');
      setSelectedPlanetaryRegionId('jezero-delta');
      setSelectedEarthSiteId('yungay-atacama');
      setInspectedCell({ row: ATACAMA_POIS[0]!.row, col: ATACAMA_POIS[0]!.col });
    } else {
      setTargetPlanet('Moon');
      setSelectedPlanetaryRegionId('shackleton-rim');
      setSelectedEarthSiteId('mcmurdo-dry-valleys');
      setInspectedCell({
        row: SHACKLETON_CANDIDATE_POINTS[0]!.row,
        col: SHACKLETON_CANDIDATE_POINTS[0]!.col,
      });
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const col = Math.max(0, Math.min(127, Math.floor(((e.clientX - rect.left) / rect.width) * 128)));
    const row = Math.max(0, Math.min(127, Math.floor(((e.clientY - rect.top) / rect.height) * 128)));
    setInspectedCell({ row, col });
  };

  const STAGES: { id: StageKey; code: string; label: string }[] = [
    {
      id: 'stage-a',
      code: 'STAGE A',
      label: activeMission === 'mission-1-mars' ? 'Land on Earth (Atacama)' : 'Explore Earth (McMurdo)',
    },
    {
      id: 'stage-b',
      code: 'STAGE B',
      label: activeMission === 'mission-1-mars' ? 'Travel to Mars (MOLA)' : 'Travel to Moon (LOLA + Diviner)',
    },
    {
      id: 'stage-c',
      code: 'STAGE C',
      label: 'Environmental & Survival Comparison',
    },
    {
      id: 'stage-d',
      code: 'STAGE D',
      label: activeMission === 'mission-1-mars' ? 'Spacesuit Survival Simulation' : 'Lunar Base-Site Decision',
    },
    {
      id: 'stage-e',
      code: 'STAGE E',
      label: 'Mission Outcome & Report',
    },
  ];

  const activeEnv = activeMission === 'mission-1-mars' ? marsEnv : moonEnv;

  return (
    <section className="panel" style={{ padding: 20, marginBottom: 24, border: '1px solid rgba(40, 106, 145, 0.38)' }}>
      {/* Mission Selector Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          paddingBottom: 16,
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <span className="mono" style={{ fontSize: 11, color: '#286A91', fontWeight: 700 }}>
            NASA SPACE APPS 2026 · DATA-DRIVEN PLANETARY MISSIONS (5 REAL DATASETS + NSSDCA REFERENCE)
          </span>
          <h2 style={{ fontSize: 22, margin: '4px 0' }}>
            {activeMission === 'mission-1-mars'
              ? 'Mission 1: The Red Planet Survival Challenge (Atacama Desert → Mars)'
              : 'Mission 2: The Lunar South Pole Expedition (McMurdo Dry Valleys → Shackleton Crater)'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 820 }}>
            {activeMission === 'mission-1-mars'
              ? 'Investigate hyperarid Atacama terrain with real NASADEM (30 m) and MODIS MOD11A2 (1 km) data, travel to Mars (MOLA MEGDR & HiRISE), compare measured vs. published environmental boundaries, and test human survival with and without a pressurized EVA suit.'
              : 'Explore Antarctic polar valleys (McMurdo 30 m DEM & MODIS LST), travel to the Lunar South Pole (LRO LOLA 30 m & Diviner PCP 240 m temperature), inspect candidate base sites, and evaluate why the 5 datasets alone cannot certify a permanent lunar base as safe.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${activeMission === 'mission-1-mars' ? 'btn--navy' : ''}`}
            style={{ padding: '8px 14px', fontSize: 13 }}
            onClick={() => handleSwitchMission('mission-1-mars')}
          >
            <Flame size={15} />
            Mission 1: Atacama → Mars
          </button>
          <button
            type="button"
            className={`btn ${activeMission === 'mission-2-moon' ? 'btn--navy' : ''}`}
            style={{ padding: '8px 14px', fontSize: 13 }}
            onClick={() => handleSwitchMission('mission-2-moon')}
          >
            <Snowflake size={15} />
            Mission 2: McMurdo → Lunar South Pole
          </button>
          <Link to={`/explore/launch-mission?mission=${activeMission}`} className="btn" style={{ padding: '8px 12px', fontSize: 12.5, textDecoration: 'none' }}>
            <Rocket size={14} />
            Open 3D Comparative Science Lab
          </Link>
        </div>
      </div>

      {/* 5-Stage Progression Bar (Stages A - E) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
          gap: 8,
          margin: '16px 0',
        }}
      >
        {STAGES.map((s) => {
          const isCurrent = s.id === activeStage;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveStage(s.id)}
              style={{
                padding: '10px 12px',
                textAlign: 'left',
                borderRadius: 6,
                border: isCurrent ? '2px solid #286A91' : '1px solid var(--border-subtle)',
                background: isCurrent ? 'rgba(40, 106, 145, 0.12)' : 'var(--bg-cool-neutral)',
                cursor: 'pointer',
              }}
            >
              <div className="mono" style={{ fontSize: 10.5, color: '#286A91', fontWeight: 700 }}>
                {s.code}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </button>
          );
        })}
      </div>

      {/* Shared Heatmap Layer Switcher */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '8px 12px',
          background: 'var(--bg-cool-neutral)',
          borderRadius: 6,
          border: '1px solid var(--border-subtle)',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
            <Layers size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            ACTIVE SCIENTIFIC HEATMAP:
          </span>
          {(
            [
              { id: 'elevation', label: '1. Elevation (m)' },
              { id: 'slope', label: '2. Horn Slope (°)' },
              { id: 'roughness', label: '3. Roughness TRI (m)' },
              { id: 'temperature', label: '4. Surface Temperature (°C / K)' },
              { id: 'similarity', label: '5. Exploratory Similarity Index' },
            ] as const
          ).map((l) => (
            <button
              key={l.id}
              type="button"
              className={`btn ${activeHeatmapLayer === l.id ? 'btn--navy' : ''}`}
              style={{ padding: '4px 10px', fontSize: 12 }}
              onClick={() => setActiveHeatmapLayer(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Click any point on the raster maps below to inspect real cell telemetry
        </span>
      </div>

      {/* ====================================================================
          STAGE A & B: INTERACTIVE DUAL RASTER EXPLORATION + ORBITAL TRANSFER
      ==================================================================== */}
      {(activeStage === 'stage-a' || activeStage === 'stage-b') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 18 }}>
          {/* Left Column: Earth Analog Site (Stage A Focus) */}
          <div
            style={{
              padding: 16,
              borderRadius: 6,
              border: activeStage === 'stage-a' ? '2px solid #286A91' : '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <span className="mono" style={{ fontSize: 10.5, color: '#286A91', fontWeight: 700 }}>
                  STAGE A · EARTH ANALOG BASELINE
                </span>
                <h3 style={{ fontSize: 16, margin: 0 }}>
                  {activeMission === 'mission-1-mars'
                    ? 'Yungay Station, Atacama Desert, Chile'
                    : 'McMurdo Dry Valleys (Wright Valley), Antarctica'}
                </h3>
              </div>
              <span className="badge badge--real">MEASURED NASA RASTER</span>
            </div>

            {/* Coverage Limitation Banner for McMurdo NASADEM */}
            {activeMission === 'mission-2-moon' && (
              <div
                style={{
                  marginBottom: 10,
                  padding: '8px 10px',
                  borderRadius: 4,
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  fontSize: 11.5,
                }}
              >
                <strong>NASADEM &amp; MODIS Polar Coverage Disclosure:</strong> `NASADEM_HGT V001` covers `60°N` to `56°S` (Shuttle SRTM inclination limit). Because McMurdo lies at `77.55°S`, the pipeline explicitly flags `NASADEM` out-of-bounds and uses real 30 m `Copernicus_DSM_COG_10_S78_00_E161_00_DEM` + `MODIS MOD11A2.A2026305.h21v16` (`-23.32 °C` mean).
              </div>
            )}

            <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
              <canvas
                ref={earthCanvasRef}
                width={420}
                height={420}
                onClick={handleCanvasClick}
                style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
              />
              <div
                className="mono"
                style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  right: 8,
                  background: 'rgba(13, 25, 36, 0.88)',
                  color: '#F2F5F8',
                  padding: '6px 10px',
                  borderRadius: 4,
                  fontSize: 11,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>
                  Cell ({inspectedCell.row}, {inspectedCell.col}): Elev {earthPointSample?.elevationMeters?.toFixed(1) ?? 'N/A'} m · Slope {earthPointSample?.slopeDegrees?.toFixed(1) ?? 'N/A'}°
                </span>
                <span>
                  TRI {earthPointSample?.roughnessTriMeters?.toFixed(2) ?? 'N/A'} m · Temp {earthPointSample?.temperatureCelsius?.toFixed(1) ?? 'N/A'} °C
                </span>
              </div>
            </div>

            {/* Interactive Earth Points of Interest */}
            {activeMission === 'mission-1-mars' && (
              <div style={{ marginTop: 12 }}>
                <div className="mono" style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
                  CLICK POINTS OF INTEREST TO COLLECT ATACAMA FIELD OBSERVATIONS ({collectedPois.length}/3):
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {ATACAMA_POIS.map((poi) => {
                    const isSelected = selectedAtacamaPoi === poi.id;
                    const isCollected = collectedPois.includes(poi.id);
                    return (
                      <button
                        key={poi.id}
                        type="button"
                        onClick={() => {
                          setSelectedAtacamaPoi(poi.id);
                          setInspectedCell({ row: poi.row, col: poi.col });
                          if (!collectedPois.includes(poi.id)) {
                            setCollectedPois((prev) => [...prev, poi.id]);
                          }
                        }}
                        style={{
                          padding: '8px 10px',
                          textAlign: 'left',
                          borderRadius: 4,
                          border: isSelected ? '1px solid #286A91' : '1px solid var(--border-subtle)',
                          background: isSelected ? 'rgba(40, 106, 145, 0.08)' : 'var(--bg-cool-neutral)',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
                          <span>
                            <MapPin size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            {poi.name}
                          </span>
                          <span className="mono" style={{ fontSize: 10.5, color: isCollected ? '#1E7A56' : '#64748B' }}>
                            {isCollected ? '✓ OBSERVED' : 'INSPECT'}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 3 }}>{poi.summary}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Planetary Destination (Stage B Focus) */}
          <div
            style={{
              padding: 16,
              borderRadius: 6,
              border: activeStage === 'stage-b' ? '2px solid #C28B38' : '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span className="mono" style={{ fontSize: 10.5, color: '#C28B38', fontWeight: 700 }}>
                  STAGE B · SPACE TRAVEL &amp; PLANETARY LANDING
                </span>
                <h3 style={{ fontSize: 16, margin: 0 }}>
                  {activeMission === 'mission-1-mars'
                    ? marsTargetChoice === 'jezero-mola'
                      ? 'Jezero Crater & Isidis Margin, Mars (MOLA MEGDR)'
                      : 'Gale Crater (Aeolis Mons), Mars (HiRISE/MOLA 30m)'
                    : 'Lunar South Pole — Shackleton Crater Rim & PSR (LOLA 30m + Diviner 240m)'}
                </h3>
              </div>

              {activeMission === 'mission-1-mars' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className={`btn ${marsTargetChoice === 'jezero-mola' ? 'btn--navy' : ''}`}
                    style={{ padding: '3px 8px', fontSize: 11 }}
                    onClick={() => setMarsTargetChoice('jezero-mola')}
                  >
                    Jezero (MOLA MEGDR)
                  </button>
                  <button
                    type="button"
                    className={`btn ${marsTargetChoice === 'gale-hirise' ? 'btn--navy' : ''}`}
                    style={{ padding: '3px 8px', fontSize: 11 }}
                    onClick={() => setMarsTargetChoice('gale-hirise')}
                  >
                    Gale (HiRISE/MOLA 30m)
                  </button>
                </div>
              )}
            </div>

            {/* Interactive Space Transfer Progress Bar */}
            <div
              style={{
                marginBottom: 10,
                padding: '8px 10px',
                borderRadius: 4,
                background: 'var(--bg-cool-neutral)',
                border: '1px solid var(--border-subtle)',
                fontSize: 11.5,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <strong>
                  <Rocket size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {activeMission === 'mission-1-mars'
                    ? 'Hohmann Interplanetary Transfer (Earth → Mars · 210 Days)'
                    : 'Trans-Lunar Polar Injection (Earth → Lunar South Pole · 3.5 Days)'}
                </strong>
                <span className="mono">{transferProgress}% ARRIVED</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={transferProgress}
                onChange={(e) => setTransferProgress(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#C28B38' }}
                aria-label="Space travel transfer progress"
              />
            </div>

            <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
              <canvas
                ref={planetCanvasRef}
                width={420}
                height={420}
                onClick={handleCanvasClick}
                style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
              />
              {activeHeatmapLayer === 'temperature' && activeMission === 'mission-1-mars' && planetDerived?.temperatureAvailable && (
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    right: 10,
                    background: 'rgba(13, 25, 36, 0.90)',
                    border: '1px solid #38BDF8',
                    color: '#E0F2FE',
                    padding: '6px 10px',
                    borderRadius: 4,
                    fontSize: 11,
                  }}
                >
                  <strong>MGS TES Thermal Inertia &amp; Surface Temp Active:</strong> `MGS-M-TES-5-TIMAP-V1.0` (`GLOBAL_TI_NIGHT_2007` / `DAY_2007`) coupled with 30 m slope/aspect.
                </div>
              )}
              <div
                className="mono"
                style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  right: 8,
                  background: 'rgba(13, 25, 36, 0.88)',
                  color: '#F2F5F8',
                  padding: '6px 10px',
                  borderRadius: 4,
                  fontSize: 11,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>
                  Cell ({inspectedCell.row}, {inspectedCell.col}): Elev {planetPointSample?.elevationMeters?.toFixed(1) ?? 'N/A'} m · Slope {planetPointSample?.slopeDegrees?.toFixed(1) ?? 'N/A'}°
                </span>
                <span>
                  TRI {planetPointSample?.roughnessTriMeters?.toFixed(2) ?? 'N/A'} m · Temp{' '}
                  {planetPointSample?.temperatureCelsius !== null && planetPointSample?.temperatureCelsius !== undefined
                    ? `${planetPointSample.temperatureCelsius.toFixed(1)} °C (${planetPointSample.temperatureKelvin?.toFixed(1)} K)`
                    : 'Unavailable (No Thermal Band)'}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Relief: <strong>{currentPlanetDataset?.stats.reliefMeters.toFixed(0)} m</strong> · Mean Slope:{' '}
                <strong>{planetDerived?.slopeStats.mean.toFixed(2)}°</strong>
              </span>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setActiveStage('stage-c')}
              >
                Proceed to Stage C: Survival Comparison <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          STAGE C: SURVIVAL & ENVIRONMENTAL COMPARISON TABLE (THREE-TIER ATTRIBUTION)
      ==================================================================== */}
      {activeStage === 'stage-c' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div>
              <span className="mono" style={{ fontSize: 11, color: '#286A91', fontWeight: 700 }}>
                STAGE C · MEASURED RASTER vs. DERIVED vs. PUBLISHED PLANETARY REFERENCE
              </span>
              <h3 style={{ fontSize: 18, margin: '2px 0' }}>
                {activeMission === 'mission-1-mars'
                  ? 'Earth (Atacama Desert) vs. Mars (Jezero / Gale Crater) Survival Comparison'
                  : 'Earth (McMurdo Dry Valleys) vs. Lunar South Pole (Shackleton Crater) Comparison'}
              </h3>
            </div>
            <button type="button" className="btn btn--primary" onClick={() => setActiveStage('stage-d')}>
              Proceed to Stage D: {activeMission === 'mission-1-mars' ? 'Spacesuit Simulation' : 'Base-Site Decision'}{' '}
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-cool-neutral)', borderBottom: '2px solid var(--border-subtle)' }}>
                  <th style={{ padding: '10px 12px' }}>Parameter</th>
                  <th style={{ padding: '10px 12px' }}>
                    Earth ({activeMission === 'mission-1-mars' ? 'Atacama Desert' : 'McMurdo Dry Valleys'})
                  </th>
                  <th style={{ padding: '10px 12px' }}>
                    {activeMission === 'mission-1-mars' ? 'Mars (Jezero / Gale)' : 'Moon (Shackleton South Pole)'}
                  </th>
                  <th style={{ padding: '10px 12px' }}>Data Attribution Tier &amp; Source</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>Elevation &amp; Relief</td>
                  <td style={{ padding: '10px 12px' }} className="mono">
                    {currentEarthDataset
                      ? `${currentEarthDataset.stats.minElevation.toFixed(1)} to ${currentEarthDataset.stats.maxElevation.toFixed(1)} m (Relief ${currentEarthDataset.stats.reliefMeters.toFixed(1)} m)`
                      : 'Loading...'}
                  </td>
                  <td style={{ padding: '10px 12px' }} className="mono">
                    {currentPlanetDataset
                      ? `${currentPlanetDataset.stats.minElevation.toFixed(1)} to ${currentPlanetDataset.stats.maxElevation.toFixed(1)} m (Relief ${currentPlanetDataset.stats.reliefMeters.toFixed(1)} m)`
                      : 'Loading...'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className="badge badge--real">1. MEASURED FROM DATASET</span>{' '}
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      {activeMission === 'mission-1-mars' ? 'NASADEM_HGT V001 vs MOLA MEGDR' : 'Copernicus Polar 30m vs LRO LOLA LDEM_75S_30M'}
                    </span>
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>Slope &amp; Roughness (TRI)</td>
                  <td style={{ padding: '10px 12px' }} className="mono">
                    Mean Slope {earthDerived?.slopeStats.mean.toFixed(2)}° · Mean TRI {earthDerived?.roughnessStats.mean.toFixed(2)} m
                  </td>
                  <td style={{ padding: '10px 12px' }} className="mono">
                    Mean Slope {planetDerived?.slopeStats.mean.toFixed(2)}° · Mean TRI {planetDerived?.roughnessStats.mean.toFixed(2)} m
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className="badge badge--blue">2. DERIVED BY PIPELINE</span>{' '}
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Horn (1981) 3×3 gradient &amp; Riley (1999) TRI</span>
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>Surface Temperature</td>
                  <td style={{ padding: '10px 12px' }} className="mono">
                    {earthDerived?.temperatureStatsCelsius
                      ? `MODIS Mean ${earthDerived.temperatureStatsCelsius.mean.toFixed(1)} °C (${earthDerived.temperatureStatsCelsius.min.toFixed(1)} to ${earthDerived.temperatureStatsCelsius.max.toFixed(1)} °C)`
                      : 'N/A'}
                  </td>
                  <td style={{ padding: '10px 12px' }} className="mono">
                    {activeMission === 'mission-2-moon' && divinerData
                      ? `Diviner PCP: ${divinerData.stats.minCelsius.toFixed(1)} °C (${divinerData.stats.minKelvin.toFixed(1)} K) to ${divinerData.stats.maxCelsius.toFixed(1)} °C (${divinerData.stats.maxKelvin.toFixed(1)} K)`
                      : planetDerived?.temperatureAvailable && planetDerived.temperatureStatsCelsius
                        ? `MGS TES + REMS: ${planetDerived.temperatureStatsCelsius.mean.toFixed(1)} °C (${planetDerived.temperatureStatsCelsius.min.toFixed(1)} to ${planetDerived.temperatureStatsCelsius.max.toFixed(1)} °C)`
                        : 'Reference: -90 °C to +20 °C (Mean -65 °C)'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className="badge badge--real">
                      {activeMission === 'mission-2-moon' ? '1. MEASURED (MODIS + DIVINER PCP)' : '1. MEASURED (MODIS + MGS TES)'}
                    </span>
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>Atmospheric Oxygen (O₂)</td>
                  <td style={{ padding: '10px 12px' }} className="mono">
                    {earthEnv?.oxygenPercent ?? 20.95}% O₂ (Breathable N₂/O₂)
                  </td>
                  <td style={{ padding: '10px 12px', color: '#B91C1C', fontWeight: 700 }} className="mono">
                    {activeEnv?.oxygenPercent ?? (activeMission === 'mission-1-mars' ? 0.13 : 0.0)}% O₂ (Unbreathable)
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className="badge badge--demo">3. PUBLISHED PLANETARY REFERENCE</span>{' '}
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>planetary_environment/{activeMission === 'mission-1-mars' ? 'mars' : 'moon'}.json (NASA NSSDCA)</span>
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>Surface Pressure</td>
                  <td style={{ padding: '10px 12px' }} className="mono">
                    {earthEnv?.surfacePressure_mbar ?? 1013.25} mbar
                  </td>
                  <td style={{ padding: '10px 12px', color: '#B91C1C', fontWeight: 700 }} className="mono">
                    {activeMission === 'mission-1-mars' ? '~6.1 mbar CO₂ (<62.8 mbar Armstrong limit)' : '~3 × 10⁻¹² mbar (Hard Exospheric Vacuum)'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className="badge badge--demo">3. PUBLISHED PLANETARY REFERENCE</span>{' '}
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>NASA NSSDCA Fact Sheet</span>
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>Surface Gravity</td>
                  <td style={{ padding: '10px 12px' }} className="mono">
                    9.81 m/s² (1.00 g)
                  </td>
                  <td style={{ padding: '10px 12px' }} className="mono">
                    {activeMission === 'mission-1-mars' ? '3.71 m/s² (0.378 g)' : '1.62 m/s² (0.165 g)'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className="badge badge--demo">3. PUBLISHED PLANETARY REFERENCE</span>{' '}
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>NASA NSSDCA Fact Sheet</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====================================================================
          STAGE D (MISSION 1): INTERACTIVE SPACESUIT SURVIVAL SIMULATION
      ==================================================================== */}
      {activeStage === 'stage-d' && activeMission === 'mission-1-mars' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div>
              <span className="mono" style={{ fontSize: 11, color: '#C28B38', fontWeight: 700 }}>
                STAGE D · EDUCATIONAL SURVIVAL SIMULATION (BASED ON PUBLISHED MARS REFERENCE + MEASURED TERRAIN)
              </span>
              <h3 style={{ fontSize: 18, margin: '2px 0' }}>
                Step Onto Mars: Test Unprotected Exposure vs. Pressurized EVA Spacesuit
              </h3>
            </div>
            <span className="badge badge--demo">EDUCATIONAL SIMULATION</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <div
              style={{
                padding: 18,
                borderRadius: 6,
                border: spacesuitActive ? '2px solid #1E7A56' : '2px solid #DC2626',
                background: spacesuitActive ? 'rgba(30, 122, 86, 0.08)' : 'rgba(220, 38, 38, 0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <strong style={{ fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {spacesuitActive ? <ShieldCheck size={20} color="#1E7A56" /> : <ShieldAlert size={20} color="#DC2626" />}
                  {spacesuitActive ? 'EVA Spacesuit Protection: ACTIVE' : 'EVA Spacesuit Protection: OFF (Unprotected)'}
                </strong>
                <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: spacesuitActive ? '#1E7A56' : '#DC2626' }}>
                  Survival Index: {spacesuitActive ? '96%' : '0% (CRITICAL)'}
                </span>
              </div>

              <div style={{ height: 10, borderRadius: 5, background: '#E2E8F0', overflow: 'hidden', marginBottom: 14 }}>
                <div
                  style={{
                    width: spacesuitActive ? '96%' : '4%',
                    height: '100%',
                    background: spacesuitActive ? '#1E7A56' : '#DC2626',
                    transition: 'width 0.35s ease',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                <button
                  type="button"
                  className={`btn ${!spacesuitActive ? 'btn--navy' : ''}`}
                  onClick={() => setSpacesuitActive(false)}
                >
                  Step Onto Mars Without Spacesuit
                </button>
                <button
                  type="button"
                  className={`btn ${spacesuitActive ? 'btn--primary' : ''}`}
                  onClick={() => setSpacesuitActive(true)}
                >
                  Activate Pressurized EVA Spacesuit
                </button>
              </div>

              <div style={{ display: 'grid', gap: 8, fontSize: 12.5 }}>
                {(marsEnv?.humanSafetyWarnings ?? []).map((warn, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 4,
                      background: 'var(--bg-surface)',
                      borderLeft: `3px solid ${spacesuitActive ? '#1E7A56' : '#DC2626'}`,
                    }}
                  >
                    {spacesuitActive ? `MITIGATED BY EVA SUIT: ${warn}` : warn}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: 18, borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <h4 style={{ fontSize: 15, marginTop: 0 }}>Why Atacama Prepares Hardware—Not Unprotected Humans</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                In Stage A, NASADEM and MODIS showed that the Atacama Desert shares decameter slope distributions (`{earthDerived?.slopeStats.mean.toFixed(1)}°` vs `{planetDerived?.slopeStats.mean.toFixed(1)}°`), hyperarid evaporite crusts, and buried smectite clay horizons with Mars.
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                However, Earth’s `1,013 mbar` `N₂/O₂` atmosphere (`20.95% O₂`) and magnetosphere protect field researchers. On Mars (`0.13% O₂`, `6.1 mbar CO₂`), human survival requires closed-loop pressure suits and shielded habitats.
              </p>
              <button
                type="button"
                className="btn btn--primary"
                style={{ marginTop: 10 }}
                onClick={() => setActiveStage('stage-e')}
              >
                Complete Mission 1 &amp; View Outcome Report <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          STAGE D (MISSION 2): INTERACTIVE LUNAR SOUTH POLE BASE-SITE DECISION
      ==================================================================== */}
      {activeStage === 'stage-d' && activeMission === 'mission-2-moon' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <span className="mono" style={{ fontSize: 11, color: '#286A91', fontWeight: 700 }}>
              STAGE D · PERMANENT-BASE CERTIFICATION &amp; SITE DECISION (LOLA + DIVINER + LEND + SKYV/CRaTER + DTE)
            </span>
            <h3 style={{ fontSize: 18, margin: '2px 0' }}>
              Inspect Shackleton candidate terrain and available measurements
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
            {/* Candidate Point Buttons + Live Cell Telemetry + Base-Site Engineering Readiness Score */}
            <div style={{ display: 'grid', gap: 10 }}>
              {SHACKLETON_CANDIDATE_POINTS.map((pt) => {
                const isSelected = selectedLunarCandidateId === pt.id;
                const sample =
                  moonShackletonDem && planetDerived
                    ? inspectGridCell(moonShackletonDem, planetDerived, pt.row, pt.col)
                    : null;
                const isSteep = (sample?.slopeDegrees ?? 0) > 15;
                const isCryo = (sample?.temperatureKelvin ?? 200) < 110;
                const cert = sample?.certification;

                return (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => {
                      setSelectedLunarCandidateId(pt.id);
                      setInspectedCell({ row: pt.row, col: pt.col });
                    }}
                    style={{
                      padding: 12,
                      textAlign: 'left',
                      borderRadius: 6,
                      border: isSelected ? '2px solid #286A91' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(40, 106, 145, 0.1)' : 'var(--bg-surface)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 13 }}>{pt.name}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 8px' }}>
                      {pt.description}
                    </div>
                    {sample && (
                      <div className="mono" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 10px', fontSize: 11 }}>
                        <span>Elev: {sample.elevationMeters?.toFixed(0)} m</span>
                        <span style={{ color: isSteep ? '#DC2626' : '#1E7A56', fontWeight: 700 }}>
                          Slope: {sample.slopeDegrees?.toFixed(1)}° {isSteep ? '(STEEP >15°)' : ''}
                        </span>
                        <span style={{ color: isCryo ? '#B45309' : '#286A91', fontWeight: 700 }}>
                          Diviner: {sample.temperatureKelvin?.toFixed(1) ?? 'N/A'} K
                        </span>
                        <span>Illum: {cert?.illuminationPct?.toFixed(1) ?? 'N/A'}% Sun</span>
                        <span>DTE Comms: {cert?.dteCommsPct?.toFixed(1) ?? 'N/A'}% LoS</span>
                        <span style={{ color: '#0284C7' }}>Water-equivalent hydrogen: {cert?.waterIceWehPct?.toFixed(2) ?? 'N/A'} wt%</span>
                        <span style={{ color: '#B45309' }}>Rad: {cert?.radiationMsvYr?.toFixed(0) ?? 'N/A'} mSv/yr</span>
                        <span style={{ color: '#1E7A56' }}>
                          Bearing: {cert?.bearingCapacityKpa?.toFixed(0) ?? 'N/A'} kPa ({cert?.rockAbundancePct?.toFixed(1) ?? 'N/A'}% rock)
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div>
              <p>The five core datasets cannot independently certify a permanent lunar base as safe. Validated site-level illumination, communication, water-equivalent hydrogen, radiation, rock abundance and bearing-capacity metrics are unavailable.</p>
              <button
                type="button"
                className="btn btn--primary"
                style={{ marginTop: 12 }}
                onClick={() => setActiveStage('stage-e')}
              >
                Record Candidate Inspection &amp; Proceed to Stage E <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          STAGE E: MISSION OUTCOME & HANDOFF TO RESEARCH / TERRAFORM
      ==================================================================== */}
      {activeStage === 'stage-e' && (
        <div
          style={{
            padding: 18,
            borderRadius: 6,
            background: 'var(--bg-cool-neutral)',
            border: '1px solid var(--border-subtle)',
            display: 'grid',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <span className="mono" style={{ fontSize: 11, color: '#1E7A56', fontWeight: 700 }}>
                <CheckCircle2 size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                STAGE E · MISSION EXPEDITION REPORT COMPLETE
              </span>
              <h3 style={{ fontSize: 19, margin: '4px 0 0' }}>
                {activeMission === 'mission-1-mars'
                  ? 'Outcome: Could the Atacama Desert Prepare Us for Mars Exploration?'
                  : 'Outcome: Could McMurdo Dry Valleys Prepare Us for the Lunar South Pole?'}
              </h3>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  const regionId = activeMission === 'mission-1-mars' ? 'jezero-delta' : 'shackleton-rim';
                  const siteId = activeMission === 'mission-1-mars' ? 'yungay-atacama' : 'mcmurdo-dry-valleys';
                  setExpeditionDecision({
                    regionId,
                    siteId,
                    objectiveSummary:
                      activeMission === 'mission-1-mars'
                        ? 'Mission 1: The Red Planet Survival Challenge (Atacama → Mars)'
                        : 'Mission 2: The Lunar South Pole Expedition (McMurdo → Shackleton)',
                    criteria: [
                      'Measured NASA Raster Topography & Derived Horn 3×3 Slope / TRI Roughness',
                      'MODIS MOD11A2 & LRO Diviner PCP Thermal Infrared Comparison',
                      'Missing Criteria Flagged: Radiation, Atmospheric Composition, Subsurface Ice wt%, Illumination, Comms, Bearing Capacity',
                    ],
                    justification:
                      activeMission === 'mission-1-mars'
                        ? 'Mission 1 Red Planet Survival Challenge completed: NASADEM & MODIS Atacama baseline paired with MOLA Mars terrain.'
                        : `Mission 2 Lunar South Pole Expedition completed (${selectedLunarCandidateId}): McMurdo Polar DEM & MODIS paired with LOLA & Diviner PCP.`,
                    savedAt: new Date().toLocaleTimeString(),
                  });
                  setMissionReportSaved('Expedition decision saved and linked to Research & TERRAFORM workspaces.');
                }}
              >
                <Sparkles size={14} />
                Save Expedition Decision to Platform
              </button>
              <Link to="/research" className="btn" style={{ textDecoration: 'none' }}>
                Open in Research Studio <ArrowRight size={14} />
              </Link>
              <Link to="/learn" className="btn" style={{ textDecoration: 'none' }}>
                Open in TERRAFORM <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {missionReportSaved && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 4,
                background: 'rgba(30, 122, 86, 0.14)',
                border: '1px solid rgba(30, 122, 86, 0.4)',
                color: '#1E5652',
                fontSize: 12.5,
              }}
            >
              {missionReportSaved}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            <div style={{ padding: 14, borderRadius: 4, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <strong style={{ fontSize: 13 }}>1. What the Analog Site Successfully Simulates</strong>
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 6 }}>
                {activeMission === 'mission-1-mars'
                  ? 'Yungay Station (Atacama) replicates hyperarid nitrate/perchlorate soil crusts, subsurface wet smectite clay horizons, and 1°–15° alluvial pediment slopes measured by NASADEM (953–1,212 m), making it an ideal testbed for Mars rover drills and Raman/XRD life-detection payloads.'
                  : 'McMurdo Dry Valleys (Wright Valley, 90–1,354 m relief) replicates ice-free polar permafrost, polygonal sublimation lag deposits, and steep 20°–35° valley walls under sub-zero MODIS surface temperatures (-23.3 °C), preparing volatile drills and cold-tolerant rovers for Shackleton Crater.'}
              </p>
            </div>

            <div style={{ padding: 14, borderRadius: 4, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <strong style={{ fontSize: 13 }}>2. Environmental Non-Equivalence Boundaries</strong>
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 6 }}>
                {activeMission === 'mission-1-mars'
                  ? 'Earth provides 20.95% O₂, 1,013 mbar pressure, 9.81 m/s² gravity, and geomagnetic shielding. Mars has 0.13% O₂, 6.1 mbar CO₂ pressure (below the Armstrong limit), 3.71 m/s² gravity, and ~230 mSv/yr GCR radiation.'
                  : 'McMurdo has a ~980 mbar breathable atmosphere and -23 °C temperatures, whereas the Lunar South Pole is a 3 × 10⁻¹² mbar hard vacuum with a cold polar surface in the sampled Diviner observing window and 1.62 m/s² gravity.'}
              </p>
            </div>

            <div style={{ padding: 14, borderRadius: 4, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <strong style={{ fontSize: 13 }}>3. Missing Permanent-Base Safety Evidence</strong>
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 6 }}>
                The 5 downloaded datasets (`NASADEM`, `MODIS MOD11A2`, `LOLA LDEM`, `Diviner PCP`, `MOLA MEGDR`) quantify surface elevation, slope, roughness, and Earth/Lunar-polar temperature only. Certifying a permanent base requires radiation dosimetry, bulk subsurface water/ice wt%, illumination continuity, communications visibility, and regolith bearing-capacity data.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
