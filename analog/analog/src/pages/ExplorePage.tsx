import React, { useEffect, useMemo, useState } from 'react';
import { usePlatformContext } from '../context/PlatformContext';
import { ANALOG_SITES } from '../data/analogSites';
import { FIELD_CHALLENGES } from '../data/fieldLabData';
import { PLANETARY_REGIONS } from '../data/planetaryRegions';
import { computeDerivedTerrain } from '../services/geospatialService';
import { loadTerrainDataset } from '../services/terrainDataService';
import type { SpatialLayerId, TerrainGridDataset } from '../types/terrain';
import { ExpeditionDecisionPanel } from '../components/Explore/ExpeditionDecisionPanel';
import { FieldLabTerrainMap } from '../components/Explore/FieldLabTerrainMap';
import { FieldLabEarthMap } from '../components/Explore/FieldLabEarthMap';
import { TerrainComparisonProtocol, type ProtocolPhaseId } from '../components/Explore/TerrainComparisonProtocol';

const STEPS = ['Brief', 'Planetary target', 'Earth analogs', 'Compare', 'Decision'] as const;
const MARS_CANDIDATES = ['yungay-atacama', 'mcmurdo-dry-valleys', 'iceland-askja', 'death-valley'];
const MOON_CANDIDATES = ['mcmurdo-dry-valleys', 'iceland-askja', 'haughton-crater', 'yungay-atacama'];

export const ExplorePage: React.FC = () => {
  const {
    targetPlanet, setTargetPlanet,
    selectedPlanetaryRegionId, setSelectedPlanetaryRegionId,
    selectedEarthSiteId, setSelectedEarthSiteId,
    selectedMarsDatasetId, setSelectedMarsDatasetId,
    expeditionDecision, setExpeditionDecision,
  } = usePlatformContext();
  const [step, setStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [missionId, setMissionId] = useState(FIELD_CHALLENGES[0]!.id);
  const [phase, setPhase] = useState<ProtocolPhaseId>('reference');
  const [activeLayer, setActiveLayer] = useState<SpatialLayerId>('elevation');
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([]);
  const [earthData, setEarthData] = useState<TerrainGridDataset | null>(null);
  const [murrayData, setMurrayData] = useState<TerrainGridDataset | null>(null);
  const [bradburyData, setBradburyData] = useState<TerrainGridDataset | null>(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      loadTerrainDataset('earth-yungay-copernicus-30m', 'REAL_DATA'),
      loadTerrainDataset('mars-gale-murray-30m', 'REAL_DATA'),
      loadTerrainDataset('mars-gale-bradbury-30m', 'REAL_DATA'),
    ]).then(([earth, murray, bradbury]) => {
      if (!active) return;
      if (earth.status === 'fulfilled') setEarthData(earth.value);
      if (murray.status === 'fulfilled') setMurrayData(murray.value);
      if (bradbury.status === 'fulfilled') setBradburyData(bradbury.value);
    });
    return () => { active = false; };
  }, []);

  const earthDerived = useMemo(() => earthData ? computeDerivedTerrain(earthData) : null, [earthData]);
  const murrayDerived = useMemo(() => murrayData ? computeDerivedTerrain(murrayData) : null, [murrayData]);
  const bradburyDerived = useMemo(() => bradburyData ? computeDerivedTerrain(bradburyData) : null, [bradburyData]);
  const activeMission = FIELD_CHALLENGES.find((mission) => mission.id === missionId) ?? FIELD_CHALLENGES[0]!;
  const activeRegion = PLANETARY_REGIONS.find((region) => region.id === selectedPlanetaryRegionId)
    ?? PLANETARY_REGIONS.find((region) => region.planet === targetPlanet)!;
  const candidateIds = targetPlanet === 'Mars' ? MARS_CANDIDATES : MOON_CANDIDATES;
  const candidateSites = candidateIds.map((id) => ANALOG_SITES.find((site) => site.id === id)).filter((site) => site !== undefined);
  const selectedSite = candidateSites.find((site) => site.id === selectedEarthSiteId) ?? candidateSites[0]!;
  const marsData = selectedMarsDatasetId === 'mars-gale-bradbury-30m' ? bradburyData : murrayData;
  const marsDerived = selectedMarsDatasetId === 'mars-gale-bradbury-30m' ? bradburyDerived : murrayDerived;

  const goTo = (next: number) => {
    setStep(next);
    setFurthestStep((current) => Math.max(current, next));
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  const chooseRegion = (id: string) => {
    const region = PLANETARY_REGIONS.find((item) => item.id === id);
    if (!region) return;
    setSelectedPlanetaryRegionId(id);
    if (region.terrainDatasetId) setSelectedMarsDatasetId(region.terrainDatasetId);
    if (!region.hasLocalDem) setActiveLayer('imagery');
    const firstCandidate = region.recommendedEarthSiteIds.find((siteId) => candidateIds.includes(siteId));
    if (firstCandidate) setSelectedEarthSiteId(firstCandidate);
  };

  const choosePlanet = (planet: 'Mars' | 'Moon') => {
    setTargetPlanet(planet);
    const firstMission = FIELD_CHALLENGES.find((mission) => mission.targetBody === planet);
    if (firstMission) setMissionId(firstMission.id);
    const firstRegion = PLANETARY_REGIONS.find((region) => region.planet === planet);
    if (firstRegion) chooseRegion(firstRegion.id);
    if (planet === 'Moon') setActiveLayer('imagery');
    setPhase('reference');
  };

  const chooseMission = (id: string) => {
    const mission = FIELD_CHALLENGES.find((item) => item.id === id);
    if (!mission) return;
    setMissionId(id);
    const planet = mission.targetBody === 'Moon' ? 'Moon' : 'Mars';
    setTargetPlanet(planet);
    const regionId = planet === 'Moon' ? 'shackleton-rim' : mission.recommendedMarsSite === 'gale_bradbury' ? 'gale-bradbury' : 'gale-murray';
    setSelectedPlanetaryRegionId(regionId);
    setSelectedEarthSiteId(mission.recommendedEarthSiteId);
    setSelectedMarsDatasetId(mission.recommendedMarsSite === 'gale_bradbury' ? 'mars-gale-bradbury-30m' : 'mars-gale-murray-30m');
    setActiveLayer(mission.recommendedLayer);
    setPhase('reference');
    setFurthestStep(0);
  };

  return <main id="main-content" className="exp-page field-lab">
    <div className="field-lab-shell">
      <div className="field-lab-topline"><span>ASTRATERRA / THE ANALOG FIELD LAB</span><span>{completedMissionIds.includes(missionId) ? 'INVESTIGATION COMPLETE' : 'FIELD INVESTIGATION'}</span></div>
      <div className="field-lab-progress" aria-label="Investigation stages">
        {STEPS.map((label, index) => <button key={label} type="button" disabled={index > furthestStep} aria-current={step === index ? 'step' : undefined} className={step === index ? 'is-current' : ''} onClick={() => goTo(index)}><span>{String(index + 1).padStart(2, '0')}</span>{label}</button>)}
      </div>

      {step === 0 && <section className="field-lab-brief">
        <div className="field-lab-brief-copy"><p className="atlas-kicker">MISSION BRIEF / 01</p><h1>The Analog<br />Field Lab.</h1><p className="field-lab-lead">Identify an Earth location that can help researchers investigate a planetary landscape. Compare evidence, account for what the data cannot show, and make a reasoned recommendation.</p><div className="field-lab-mission-facts"><span>MOON + MARS</span><span>LOCAL SCIENTIFIC DATA</span><span>NO AUTOMATIC WINNER</span></div></div>
        <div className="field-lab-brief-panel"><div className="field-lab-panel-head"><span>SELECT AN INVESTIGATION</span><span>{String(FIELD_CHALLENGES.length).padStart(2, '0')} BRIEFS</span></div><div className="field-lab-mission-list">{FIELD_CHALLENGES.map((mission, index) => <button key={mission.id} type="button" className={missionId === mission.id ? 'is-selected' : ''} onClick={() => chooseMission(mission.id)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{mission.title}</strong><small>{mission.targetBody}</small></button>)}</div><div className="field-lab-selected-brief"><span>OBJECTIVE</span><h2>{activeMission.title}</h2><p>{activeMission.objective}</p><p className="field-lab-brief-note">{activeMission.briefing}</p><button type="button" className="field-lab-primary" onClick={() => goTo(1)}>Begin investigation <span aria-hidden="true">↗</span></button></div></div>
      </section>}

      {step > 0 && <div className="field-lab-stage-head"><div><p className="atlas-kicker">{String(step + 1).padStart(2, '0')} / {STEPS[step]?.toUpperCase()}</p><h1>{step === 1 ? 'Investigate the target.' : step === 2 ? 'Examine Earth analogs.' : step === 3 ? 'Compare the evidence.' : 'Make a recommendation.'}</h1><p>{step === 1 ? 'Select a region and inspect the available planetary observations.' : step === 2 ? 'Select a field site. Its terrain and evidence must support the mission objective.' : step === 3 ? 'Compare terrain, geology, and uncertainty before choosing a site.' : 'Record the scientific case and its limitations.'}</p></div><span>{activeMission.title} / {targetPlanet}</span></div>}

      {step === 1 && <FieldLabTerrainMap planet={targetPlanet} onPlanetChange={choosePlanet} regions={PLANETARY_REGIONS} region={activeRegion} onRegionChange={chooseRegion} dataset={targetPlanet === 'Mars' ? marsData : null} derived={targetPlanet === 'Mars' ? marsDerived : null} layer={activeLayer} onLayerChange={setActiveLayer} onContinue={() => goTo(2)} />}
      {step === 2 && <FieldLabEarthMap sites={candidateSites} selectedSite={selectedSite} onSelectSite={setSelectedEarthSiteId} earthDataset={earthData} earthDerived={earthDerived} onContinue={() => goTo(3)} />}
      {step === 3 && (targetPlanet === 'Mars' ? <TerrainComparisonProtocol activeChallenge={activeMission} phase={phase} onPhaseChange={setPhase} marsSiteId={selectedMarsDatasetId === 'mars-gale-bradbury-30m' ? 'gale_bradbury' : 'gale_murray'} onMarsSiteChange={(id) => setSelectedMarsDatasetId(id === 'gale_bradbury' ? 'mars-gale-bradbury-30m' : 'mars-gale-murray-30m')} earthDataset={earthData} earthDerived={earthDerived} marsDataset={marsData} marsDerived={marsDerived} sites={candidateSites} selectedCandidateId={selectedSite.id} onSelectCandidate={setSelectedEarthSiteId} activeLayer={activeLayer} onLayerChange={setActiveLayer} onCompleteMission={(id) => setCompletedMissionIds((items) => items.includes(id) ? items : [...items, id])} /> : <div className="field-lab-lunar-compare"><div className="field-lab-lunar-image"><img src="/data/terrains/moon-map.jpg" alt="Global lunar surface reference" /><span>GLOBAL LUNAR REFERENCE · LOCAL DEM UNAVAILABLE</span></div><div><p className="atlas-kicker">QUALITATIVE COMPARISON</p><h2>{activeRegion.shortName} ↔ {selectedSite.name.split(',')[0]}</h2><p>{activeRegion.scientificFocus}</p><dl><div><dt>Planetary evidence</dt><dd>{activeRegion.mineralogySummary}</dd></div><div><dt>Earth evidence</dt><dd>{selectedSite.geologicalContext}</dd></div><div><dt>Key difference</dt><dd>{selectedSite.limitations[0]}</dd></div><div><dt>Data gap</dt><dd>No local lunar 30 m DEM is bundled. Terrain similarity cannot be quantified here.</dd></div></dl></div></div>)}
      {step === 4 && <ExpeditionDecisionPanel objective={activeMission.objective} activeRegion={activeRegion} selectedSite={selectedSite} allSites={candidateSites} onSelectSite={setSelectedEarthSiteId} existingDecision={expeditionDecision} onSaveDecision={setExpeditionDecision} />}

      {step > 0 && <div className="field-lab-footer"><button type="button" onClick={() => goTo(step - 1)}>← Previous step</button><span>{String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}</span>{step < 4 && <button type="button" className="field-lab-primary" onClick={() => goTo(step + 1)}>Continue <span aria-hidden="true">↗</span></button>}</div>}
    </div>
  </main>;
};
