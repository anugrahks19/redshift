import type { TerrainGridDataset } from '../types/terrain';
import type { ModisSiteProfile, DivinerPcpDataset } from './terrainDataService';
export function createTemperatureSampler(
  dem: TerrainGridDataset | null,
  modis: ModisSiteProfile | null | undefined,
  diviner: DivinerPcpDataset | null,
  mode?: 'day' | 'night'
): (row: number, col: number) => { celsius: number; kelvin: number } | null;
