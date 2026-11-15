import type { SimilarityWeights } from '../types/terrain';
export const DEFAULT_WEIGHTS: SimilarityWeights;
export interface RankedAnalogue {
  earthSiteId: string;
  earthDatasetId: string;
  earthSiteName: string;
  shortName: string;
  terrainSource: { name: string; url: string } | null;
  overallSimilarityScore: number | null;
  indexLabel: string;
  parameterScores: { elevation: number; slope: number; roughness: number; temperature: number | null };
  effectiveWeights: SimilarityWeights;
  temperatureIncluded: boolean;
  missingParameterDisclosure: string;
}
export function rankEarthAnalogues(datasets: Record<string, unknown>, target: unknown, weights?: Partial<SimilarityWeights>): RankedAnalogue[];
