import type { ResearchObjectiveId } from './evidence';

export type TargetPlanetOption = 'Mars' | 'Moon';

export interface InvestigationPreset {
  id: string;
  title: string;
  targetPlanet: TargetPlanetOption;
  earthSiteId: string;
  earthDatasetId: string;
  planetarySiteId: string;
  planetaryDatasetId: string;
  planetarySiteName: string;
  defaultObjective: ResearchObjectiveId;
  researchContextSummary: string;
}

export interface ScientificSummaryData {
  observedSimilarities: string[];
  observedDifferences: string[];
  evidenceGaps: string[];
  dataQualityLimitations: string[];
  scientificUncertainties: string[];
  cautionaryStatement: string;
}
