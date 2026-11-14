import type { DataState, TerrainGridDataset } from '../types/terrain';

const DATASET_URLS: Record<string, string> = {
  'earth-yungay-copernicus-30m': '/data/terrains/yungay-atacama-30m.json',
  'mars-gale-murray-30m': '/data/terrains/gale-murray-30m.json',
  'mars-gale-bradbury-30m': '/data/terrains/gale-bradbury-30m.json',
};

const cache = new Map<string, TerrainGridDataset>();

function validateTerrainDataset(raw: unknown): TerrainGridDataset {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Terrain payload is not a JSON object.');
  }
  const d = raw as TerrainGridDataset;
  if (
    typeof d.gridWidth !== 'number' ||
    typeof d.gridHeight !== 'number' ||
    !Array.isArray(d.elevations) ||
    d.elevations.length !== d.gridWidth * d.gridHeight
  ) {
    throw new Error('Terrain grid dimensions do not match elevation array length.');
  }
  return d;
}

/**
 * Generates an explicit DEMONSTRATION_DATA synthetic surface for fallback / QA verification.
 * Strictly labeled as DEMONSTRATION_DATA and never disguised as real Copernicus/USGS measurements.
 */
export function buildDemonstrationDataset(
  planet: 'Earth' | 'Mars',
  siteName: string
): TerrainGridDataset {
  const W = 128;
  const H = 128;
  const cell = 30;
  const elevations: number[] = new Array(W * H);
  const base = planet === 'Earth' ? 990 : -4200;
  let minE = Infinity;
  let maxE = -Infinity;

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const nx = (c / W - 0.5) * 2;
      const ny = (r / H - 0.5) * 2;
      const ridge =
        planet === 'Mars'
          ? 180 * Math.exp(-((nx + 0.15) ** 2 * 3 + (ny - 0.1) ** 2 * 5)) + 75 * Math.sin(nx * 3.1) * Math.cos(ny * 2.2)
          : 95 * Math.exp(-((nx - 0.2) ** 2 * 2.5 + (ny + 0.25) ** 2 * 3.2)) + 35 * Math.cos(nx * 2.4);
      const val = Math.round((base + ridge) * 100) / 100;
      elevations[r * W + c] = val;
      if (val < minE) minE = val;
      if (val > maxE) maxE = val;
    }
  }

  return {
    id: `demo-${planet.toLowerCase()}`,
    planet,
    siteName: `${siteName} (Synthetic Fallback Sample)`,
    shortName: `${planet} Demo Surface`,
    dataState: 'DEMONSTRATION_DATA',
    gridWidth: W,
    gridHeight: H,
    cellSizeMeters: cell,
    extentMeters: [W * cell, H * cell],
    nativeResolutionLabel: 'Synthetic 30.0 m demonstration grid (non-scientific)',
    analysisResolutionLabel: '30.0 m × 30.0 m (Demonstration)',
    crs: planet === 'Earth' ? 'Demonstration Local Grid (EPSG:32719 bounds)' : 'Demonstration Local Grid (Mars Eq. bounds)',
    nativeCrs: 'Synthetic fallback',
    verticalDatum: 'Demonstration relative elevation (NOT real DEM)',
    isSurfaceModel: true,
    units: 'meters (synthetic)',
    bounds: {
      projected: planet === 'Earth' ? [405040, 7334040, 408880, 7337880] : [8141500, -282340, 8145340, -278500],
      geographic: planet === 'Earth' ? [-69.934, -24.102, -69.896, -24.067] : [137.352, -4.763, 137.417, -4.698],
      center: {
        lat: planet === 'Earth' ? -24.0848 : -4.7308,
        lon: planet === 'Earth' ? -69.9151 : 137.3844,
        label: 'Synthetic fallback center',
      },
    },
    stats: {
      validCells: W * H,
      totalCells: W * H,
      coveragePercent: 100,
      minElevation: minE,
      maxElevation: maxE,
      reliefMeters: Math.round((maxE - minE) * 100) / 100,
    },
    imagery: null,
    provenance: {
      datasetName: 'Synthetic Demonstration Fallback Surface',
      provider: 'Local Application Fallback Generator',
      instrumentOrMission: 'None — synthetic mathematical test surface',
      originalUrl: planet === 'Earth' ? 'https://doi.org/10.5270/esa-c5d3d65' : 'https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m',
      cogUrl: 'Unavailable in demonstration mode',
      productId: 'DEMO-SYNTHETIC-30M',
      acquisitionRange: 'N/A',
      processingPerformed: 'Generated fallback surface; not real topographic measurements.',
      resamplingMethod: 'N/A',
      limitations: 'DEMONSTRATION DATA ONLY — must not be used for scientific interpretation.',
    },
    elevations,
  };
}

export function buildMoonUnavailableDataset(): TerrainGridDataset {
  return {
    id: 'moon-unavailable',
    planet: 'Moon',
    siteName: 'Lunar Reference Site (LRO LOLA / NAC DEM Not Bundled)',
    shortName: 'Moon (Unavailable)',
    dataState: 'UNAVAILABLE',
    gridWidth: 128,
    gridHeight: 128,
    cellSizeMeters: 30,
    extentMeters: [3840, 3840],
    nativeResolutionLabel: 'Unavailable locally (LRO LOLA 118 m / NAC stereo pending)',
    analysisResolutionLabel: 'Not established',
    crs: 'Moon_2000_IAU_IAG (Not loaded)',
    nativeCrs: 'Moon_2000',
    verticalDatum: 'Lunar Reference Radius 1,737,400 m',
    isSurfaceModel: true,
    units: 'meters',
    bounds: {
      projected: [0, 0, 3840, 3840],
      geographic: [0, 0, 0, 0],
      center: { lat: -89.5, lon: 0, label: 'Lunar South Pole target (not ingested)' },
    },
    stats: {
      validCells: 0,
      totalCells: 16384,
      coveragePercent: 0,
      minElevation: 0,
      maxElevation: 0,
      reliefMeters: 0,
    },
    imagery: null,
    provenance: {
      datasetName: 'Lunar Reconnaissance Orbiter LOLA / NAC Topography',
      provider: 'NASA GSFC / USGS Astrogeology / PDS Geosciences Node',
      instrumentOrMission: 'LRO LOLA & LROC NAC',
      originalUrl: 'https://astrogeology.usgs.gov/search/map/Moon/LRO/LOLA/Lunar_LRO_LOLA_Global_LDEM_118m_Mar2014',
      cogUrl: 'Not bundled in workspace',
      productId: 'Lunar_LRO_LOLA_Global_LDEM_118m_Mar2014',
      acquisitionRange: '2009–2015',
      processingPerformed: 'No local subset extracted; marked UNAVAILABLE without fabricated heights.',
      resamplingMethod: 'N/A',
      limitations: 'Global LOLA 118 m grid is coarser than the 30 m Atacama grid; high-res LROC NAC DTM subsets require targeted PDS extraction.',
    },
    elevations: new Array(16384).fill(null),
    unavailableReason:
      'No validated 30 m Lunar DEM subset is currently packaged in this workspace. Select Mars (Gale Crater) for validated USGS 30 m DEM analysis, or download an LRO LOLA / NAC DTM subset from the USGS Astrogeology source.',
  };
}

export async function loadTerrainDataset(
  datasetId: string,
  requestedMode: DataState = 'REAL_DATA'
): Promise<TerrainGridDataset> {
  if (requestedMode === 'UNAVAILABLE' || datasetId === 'moon-unavailable') {
    if (datasetId.startsWith('earth')) {
      return {
        ...buildMoonUnavailableDataset(),
        id: 'earth-unavailable-sim',
        planet: 'Earth',
        siteName: 'Yungay, Atacama (Simulated Unavailable State)',
        shortName: 'Yungay (Unavailable)',
        unavailableReason:
          'Simulated UNAVAILABLE state triggered for QA testing. Real Copernicus GLO-30 data is available when restored to Real Data mode.',
      };
    }
    return buildMoonUnavailableDataset();
  }

  if (requestedMode === 'DEMONSTRATION_DATA') {
    return buildDemonstrationDataset(
      datasetId.startsWith('earth') ? 'Earth' : 'Mars',
      datasetId.startsWith('earth') ? 'Yungay, Atacama' : 'Gale Crater'
    );
  }

  const cached = cache.get(datasetId);
  if (cached) return cached;

  const url = DATASET_URLS[datasetId];
  if (!url) {
    throw new Error(`No dataset endpoint registered for "${datasetId}".`);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while loading ${url}`);
  }
  const parsed = validateTerrainDataset(await response.json());
  cache.set(datasetId, parsed);
  return parsed;
}

