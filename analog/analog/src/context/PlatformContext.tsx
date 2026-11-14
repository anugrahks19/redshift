import React, { createContext, useContext, useState } from 'react';
import type { ResearchObjectiveId } from '../types/evidence';
import type { TargetPlanetOption } from '../types/investigation';

export interface ExpeditionDecisionRecord {
  regionId: string;
  siteId: string;
  objectiveSummary: string;
  criteria: string[];
  justification: string;
  savedAt: string;
}

interface PlatformContextValue {
  targetPlanet: TargetPlanetOption;
  setTargetPlanet: (planet: TargetPlanetOption) => void;
  selectedPlanetaryRegionId: string;
  setSelectedPlanetaryRegionId: (id: string) => void;
  selectedEarthSiteId: string;
  setSelectedEarthSiteId: (id: string) => void;
  selectedComparisonSiteIds: string[];
  setSelectedComparisonSiteIds: (ids: string[]) => void;
  selectedMarsDatasetId: string;
  setSelectedMarsDatasetId: (id: string) => void;
  investigationId: string;
  setInvestigationId: (id: string) => void;
  objectiveId: ResearchObjectiveId;
  setObjectiveId: (id: ResearchObjectiveId) => void;
  exploreTarget: 'earth' | 'moon' | 'mars';
  setExploreTarget: (t: 'earth' | 'moon' | 'mars') => void;
  expeditionDecision: ExpeditionDecisionRecord | null;
  setExpeditionDecision: (d: ExpeditionDecisionRecord | null) => void;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [targetPlanet, setTargetPlanet] = useState<TargetPlanetOption>('Mars');
  const [selectedPlanetaryRegionId, setSelectedPlanetaryRegionId] = useState<string>('gale-murray');
  const [selectedEarthSiteId, setSelectedEarthSiteId] = useState<string>('yungay-atacama');
  const [selectedComparisonSiteIds, setSelectedComparisonSiteIds] = useState<string[]>([
    'yungay-atacama',
    'death-valley',
    'haughton-crater',
  ]);
  const [selectedMarsDatasetId, setSelectedMarsDatasetId] = useState<string>('mars-gale-murray-30m');
  const [investigationId, setInvestigationId] = useState<string>('ATACAMA-GALE-001');
  const [objectiveId, setObjectiveId] = useState<ResearchObjectiveId>('astrobiology-geology');
  const [exploreTarget, setExploreTarget] = useState<'earth' | 'moon' | 'mars'>('mars');
  const [expeditionDecision, setExpeditionDecision] = useState<ExpeditionDecisionRecord | null>(null);

  return (
    <PlatformContext.Provider
      value={{
        targetPlanet,
        setTargetPlanet,
        selectedPlanetaryRegionId,
        setSelectedPlanetaryRegionId,
        selectedEarthSiteId,
        setSelectedEarthSiteId,
        selectedComparisonSiteIds,
        setSelectedComparisonSiteIds,
        selectedMarsDatasetId,
        setSelectedMarsDatasetId,
        investigationId,
        setInvestigationId,
        objectiveId,
        setObjectiveId,
        exploreTarget,
        setExploreTarget,
        expeditionDecision,
        setExpeditionDecision,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
};

export function usePlatformContext(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    throw new Error('usePlatformContext must be used inside PlatformProvider');
  }
  return ctx;
}

