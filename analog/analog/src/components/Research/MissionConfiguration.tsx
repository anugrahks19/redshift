import React from 'react';
import type { DataState } from '../../types/terrain';
import type { ResearchObjectiveId } from '../../types/evidence';
import type { TargetPlanetOption } from '../../types/investigation';
import { RESEARCH_OBJECTIVES } from '../../data/evidenceRegistry';
import type { AnalogSiteProfile, PlanetaryRegionTarget } from '../../types/dataset';

interface MissionConfigurationProps {
  targetPlanet: TargetPlanetOption;
  onTargetPlanetChange: (p: TargetPlanetOption) => void;
  planetaryRegions: PlanetaryRegionTarget[];
  selectedRegionId: string;
  onRegionChange: (id: string) => void;
  earthSites: AnalogSiteProfile[];
  earthSiteId: string;
  onEarthSiteChange: (id: string) => void;
  objectiveId: ResearchObjectiveId;
  onObjectiveChange: (id: ResearchObjectiveId) => void;
  dataMode: DataState;
  onDataModeChange: (m: DataState) => void;
}

export const MissionConfiguration: React.FC<MissionConfigurationProps> = ({
  targetPlanet, onTargetPlanetChange, planetaryRegions, selectedRegionId, onRegionChange,
  earthSites, earthSiteId, onEarthSiteChange, objectiveId, onObjectiveChange,
  dataMode, onDataModeChange,
}) => {
  const activeObjective = RESEARCH_OBJECTIVES.find(objective => objective.id === objectiveId);
  const planetRegions = planetaryRegions.filter(region => region.planet === targetPlanet);

  return <section className="panel research-config" aria-labelledby="research-config-title">
    <div className="research-config-heading">
      <div><span className="workspace-eyebrow">INVESTIGATION SETUP</span><h2 id="research-config-title">Research objective</h2></div>
    </div>
    <div className="research-config-grid">
      <label><span>Target body</span><select value={targetPlanet} onChange={event => onTargetPlanetChange(event.target.value as TargetPlanetOption)}><option value="Mars">Mars</option><option value="Moon">Moon</option></select></label>
      <label><span>Planetary region</span><select value={selectedRegionId} onChange={event => onRegionChange(event.target.value)}>{planetRegions.map(region => <option key={region.id} value={region.id}>{region.shortName} · {region.hasLocalDem ? '30 m DEM' : 'Metadata'}</option>)}</select></label>
      <label><span>Earth analog site</span><select value={earthSiteId} onChange={event => onEarthSiteChange(event.target.value)}>{earthSites.map(site => <option key={site.id} value={site.id}>{site.name.split(',')[0]} · {site.hasLocalDem ? '30 m DEM' : 'GIS / literature'}</option>)}</select></label>
      <label><span>Scientific objective</span><select value={objectiveId} onChange={event => onObjectiveChange(event.target.value as ResearchObjectiveId)}>{RESEARCH_OBJECTIVES.map(objective => <option key={objective.id} value={objective.id}>{objective.label}</option>)}</select></label>
    </div>
    <details className="research-config-advanced">
      <summary>Method and data details</summary>
      <div className="research-config-grid"><label><span>Data source state</span><select value={dataMode} onChange={event => onDataModeChange(event.target.value as DataState)}><option value="REAL_DATA">Real data · Copernicus + USGS</option><option value="DEMONSTRATION_DATA">Demonstration data</option><option value="UNAVAILABLE">Unavailable</option></select></label></div>
      {activeObjective && <div className="research-objective-note"><strong>Objective guidance</strong><span>{activeObjective.description}</span><small>{activeObjective.keyVariables.join(' · ')}</small></div>}
      <p className="research-grid-size">Analysis grid / 30 m · 128 × 128</p>
    </details>
  </section>;
};
