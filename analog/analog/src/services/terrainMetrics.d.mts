import type { TerrainGridDataset } from '../types/terrain';
type Grid = (number | null)[];
export function deriveTerrainMetrics(dataset: Pick<TerrainGridDataset, 'gridWidth' | 'gridHeight' | 'cellSizeMeters' | 'elevations'>): {
  slopeDegrees: Grid;
  aspectDegrees: Grid;
  roughnessTriMeters: Grid;
  localReliefMeters: Grid;
};
