import { loadScientificCatalog } from './terrainDataService';
import { rankEarthAnalogues } from './analogRanking.mjs';
import type { SimilarityWeights } from '../types/terrain';

let datasetPromise: ReturnType<typeof loadScientificCatalog> | undefined;

export async function discoverEarthAnalogues(regionId: string, weights: SimilarityWeights) {
  datasetPromise ??= loadScientificCatalog().catch((error: unknown) => {
    datasetPromise = undefined;
    throw error;
  });
  const { datasets } = await datasetPromise;
  const target = Object.values(datasets).find((entry) =>
    entry !== null && typeof entry === 'object' && 'siteId' in entry && entry.siteId === regionId
  );
  return target ? rankEarthAnalogues(datasets, target, weights) : [];
}
