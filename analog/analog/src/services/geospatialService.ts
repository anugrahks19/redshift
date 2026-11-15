import { createTemperatureSampler } from './thermalSampling.mjs';
import { deriveTerrainMetrics } from './terrainMetrics.mjs';
import type {
  DerivedTerrainGrid,
  DifferenceAnalysisResult,
  DistributionBin,
  MetricSummaryStats,
  SimilarityWeights,
  SpatialLayerId,
  TerrainGridDataset,
  TerrainSampleInspection,
  TransectPreset,
  TransectSample,
} from '../types/terrain';
import type {
  DivinerPcpDataset,
  ModisSiteProfile,
  Section9ThermalBundle,
  BaseCertificationDataset,
} from './terrainDataService';

const COMPASS_SECTORS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export function degreesToCompass(deg: number | null): string | null {
  if (deg === null || !Number.isFinite(deg)) return null;
  const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return COMPASS_SECTORS[idx] ?? 'N';
}

export function computeSummaryStats(values: (number | null)[]): MetricSummaryStats {
  const valid = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (valid.length === 0) {
    return { validCount: 0, min: 0, p10: 0, median: 0, mean: 0, p90: 0, max: 0, stdDev: 0 };
  }
  const sorted = [...valid].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;
  const variance = sorted.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / n;
  const quantile = (q: number) => sorted[Math.min(n - 1, Math.max(0, Math.floor(q * (n - 1))))] ?? 0;

  return {
    validCount: n,
    min: sorted[0] ?? 0,
    p10: quantile(0.1),
    median: quantile(0.5),
    mean,
    p90: quantile(0.9),
    max: sorted[n - 1] ?? 0,
    stdDev: Math.sqrt(variance),
  };
}

export function buildHistogram(
  values: (number | null)[],
  binEdges: number[],
  unitSuffix: string
): DistributionBin[] {
  const valid = values.filter((v): v is number => v !== null && Number.isFinite(v));
  const total = valid.length || 1;
  const bins: DistributionBin[] = [];

  for (let i = 0; i < binEdges.length - 1; i++) {
    const min = binEdges[i] ?? 0;
    const max = binEdges[i + 1] ?? min;
    const isLast = i === binEdges.length - 2;
    const count = valid.filter((v) => (isLast ? v >= min && v <= max : v >= min && v < max)).length;
    bins.push({
      label: `${min}–${max}${unitSuffix}`,
      min,
      max,
      count,
      frequency: count / total,
    });
  }
  return bins;
}

/**
 * Derives Slope (Horn 1981 3x3 finite difference, degrees),
 * Aspect (degrees clockwise from North, 0..360),
 * and Surface Roughness (Terrain Ruggedness Index, Riley et al. 1999: mean |z_c - z_i| over 8 neighbors, meters).
 * Missing/edge cells remain null — never fabricated.
 */
export function computeDerivedTerrain(dataset: TerrainGridDataset): DerivedTerrainGrid {
  const { gridWidth: W, gridHeight: H, cellSizeMeters: cell, elevations } = dataset;
  const { slopeDegrees, aspectDegrees, roughnessTriMeters } = deriveTerrainMetrics(dataset);
  const validElevationMask = elevations.map(Number.isFinite);
  const validDerivedMask = slopeDegrees.map(Number.isFinite);

  return {
    datasetId: dataset.id,
    gridWidth: W,
    gridHeight: H,
    cellSizeMeters: cell,
    slopeDegrees,
    aspectDegrees,
    roughnessTriMeters,
    validElevationMask,
    validDerivedMask,
    slopeStats: computeSummaryStats(slopeDegrees),
    roughnessStats: computeSummaryStats(roughnessTriMeters),
    slopeHistogram: buildHistogram(slopeDegrees, [0, 2, 5, 10, 15, 25, 45], '°'),
    roughnessHistogram: buildHistogram(roughnessTriMeters, [0, 1, 2, 4, 8, 15, 40], 'm'),
    slopeMethod: `Horn (1981) 3×3 gradient at ${cell} m cell spacing`,
    roughnessMethod: 'Riley TRI: square root of summed squared 8-neighbor elevation differences (m)',
  };
}

export function inspectGridCell(
  dataset: TerrainGridDataset,
  derived: DerivedTerrainGrid,
  row: number,
  col: number
): TerrainSampleInspection {
  const W = dataset.gridWidth;
  const H = dataset.gridHeight;
  const clampedR = Math.max(0, Math.min(H - 1, row));
  const clampedC = Math.max(0, Math.min(W - 1, col));
  const idx = clampedR * W + clampedC;

  const [xMin, yMin, xMax, yMax] = dataset.bounds.projected;
  const [lonMin, latMin, lonMax, latMax] = dataset.bounds.geographic;
  const fx = (clampedC + 0.5) / W;
  const fy = (clampedR + 0.5) / H;

  const projX = xMin + fx * (xMax - xMin);
  const projY = yMax - fy * (yMax - yMin);
  const lon = lonMin + fx * (lonMax - lonMin);
  const lat = latMax - fy * (latMax - latMin);

  const elev = dataset.elevations[idx] ?? null;
  const slope = derived.slopeDegrees[idx] ?? null;
  const aspect = derived.aspectDegrees[idx] ?? null;
  const roughness = derived.roughnessTriMeters[idx] ?? null;
  const tempC = derived.temperatureCelsiusGrid?.[idx] ?? null;
  const tempK = derived.temperatureKelvinGrid?.[idx] ?? (tempC !== null ? Math.round((tempC + 273.15) * 100) / 100 : null);
  const simScore = derived.similarityIndexGrid?.[idx] ?? null;
  const certRasters = derived.certificationRasters ?? null;
  const certification = certRasters
    ? {
        radiationMsvYr: certRasters.radiationMsvYr[idx] ?? null,
        skyViewSteradians: certRasters.skyViewSteradians[idx] ?? null,
        waterIceWehPct: certRasters.waterIceWehPct[idx] ?? null,
        illuminationPct: certRasters.illuminationPct[idx] ?? null,
        dteCommsPct: certRasters.dteCommsPct[idx] ?? null,
        rockAbundancePct: certRasters.rockAbundancePct[idx] ?? null,
        bearingCapacityKpa: certRasters.bearingCapacityKpa[idx] ?? null,
      }
    : null;

  const projectedLabel =
    dataset.planet === 'Earth'
      ? `E ${projX.toFixed(0)} m, N ${projY.toFixed(0)} m`
      : dataset.planet === 'Moon'
        ? `X ${projX.toFixed(0)} m, Y ${projY.toFixed(0)} m (Lunar Stereo)`
        : `X ${projX.toFixed(0)} m, Y ${projY.toFixed(0)} m (Mars Eq.)`;

  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  const geographicLabel = `${Math.abs(lat).toFixed(5)}°${latDir}, ${Math.abs(lon).toFixed(5)}°${lonDir}`;

  return {
    planet: dataset.planet,
    row: clampedR,
    col: clampedC,
    localXMeters: clampedC * dataset.cellSizeMeters,
    localYMeters: clampedR * dataset.cellSizeMeters,
    projectedX: projX,
    projectedY: projY,
    projectedLabel,
    geographicLat: lat,
    geographicLon: lon,
    geographicLabel,
    elevationMeters: elev,
    verticalDatum: dataset.verticalDatum,
    slopeDegrees: slope,
    aspectDegrees: aspect,
    aspectCompass: degreesToCompass(aspect),
    roughnessTriMeters: roughness,
    temperatureCelsius: tempC,
    temperatureKelvin: tempK,
    similarityScore: simScore,
    certification,
    inValidCoverage: elev !== null,
    datasetName: dataset.provenance.datasetName,
    dataState: dataset.dataState,
  };
}


export function attachTemperatureAndSimilarityGrids(
  earthDataset: TerrainGridDataset | null,
  earthDerived: DerivedTerrainGrid | null,
  marsDataset: TerrainGridDataset | null,
  marsDerived: DerivedTerrainGrid | null,
  modisSite: ModisSiteProfile | null,
  divinerDataset: DivinerPcpDataset | null,
  modisTimeMode: 'day' | 'night',
  weights: SimilarityWeights,
  section9Options?: {
    moonGlobalThermal?: Section9ThermalBundle | null;
    marsTesThermal?: Section9ThermalBundle | null;
    baseCertification?: BaseCertificationDataset | null;
  }
): {
  earthEnhanced: DerivedTerrainGrid | null;
  marsEnhanced: DerivedTerrainGrid | null;
  effectiveWeights: SimilarityWeights;
  temperatureIncluded: boolean;
  missingParameterDisclosure: string;
} {
  const W = earthDataset?.gridWidth ?? 128;
  const H = earthDataset?.gridHeight ?? 128;
  const n = W * H;

  const earthSampler = createTemperatureSampler(earthDataset, modisSite, null, modisTimeMode);
  const targetSampler = createTemperatureSampler(marsDataset, null, divinerDataset);
  const earthSamples = Array.from({ length: n }, (_, i) => earthSampler(Math.floor(i / W), i % W));
  const targetWidth = marsDataset?.gridWidth ?? W;
  const targetCount = targetWidth * (marsDataset?.gridHeight ?? H);
  const targetSamples = Array.from({ length: targetCount }, (_, i) => targetSampler(Math.floor(i / targetWidth), i % targetWidth));
  const earthTempC = earthSamples.map((sample) => sample?.celsius ?? null);
  const earthTempK = earthSamples.map((sample) => sample?.kelvin ?? null);
  const targetTempC = targetSamples.map((sample) => sample?.celsius ?? null);
  const targetTempK = targetSamples.map((sample) => sample?.kelvin ?? null);
  const earthTempAvail = earthSamples.some(Boolean);
  const targetTempAvail = targetSamples.some(Boolean);
  const earthTempLabel = `MODIS ${modisTimeMode} LST · ${modisSite?.granuleId ?? 'unavailable'}`;
  const targetTempLabel = `Diviner PCP · 240 m · southern summer · local time 00:00–00:15`;
  const earthTempReason = earthTempAvail ? '' : 'No valid MODIS pixels in this DEM footprint and observation window.';
  const targetTempReason = targetTempAvail ? '' : 'No verified surface temperature pixels in this DEM footprint.';

  // 3. Re-normalize Similarity Weights when Temperature is unavailable on either body
  // The bundled Earth and lunar products have different observation contexts.
  const tempComparable = false;
  const wElev = Math.max(0, weights.elevation);
  const wSlope = Math.max(0, weights.slope);
  const wRough = Math.max(0, weights.roughness);
  const wTemp = tempComparable ? Math.max(0, weights.temperature) : 0;
  const supportedWeight = wElev + wSlope + wRough + wTemp;
  const wSum = supportedWeight || 1;
  const effectiveWeights: SimilarityWeights = {
    elevation: wElev / wSum,
    slope: wSlope / wSum,
    roughness: wRough / wSum,
    temperature: wTemp / wSum,
  };

  const missingParameterDisclosure = tempComparable
    ? 'All 4 raster parameters (Elevation, Slope, Roughness, Surface Temperature) are included in the Exploratory Analog Similarity Index.'
    : `Temperature excluded (${!targetTempAvail ? targetTempReason : !earthTempAvail ? earthTempReason : 'different observation contexts'}). Weights automatically re-normalized across Elevation (${Math.round(effectiveWeights.elevation * 100)}%), Slope (${Math.round(effectiveWeights.slope * 100)}%), and Roughness (${Math.round(effectiveWeights.roughness * 100)}%).`;

  // 4. Compute Cell-by-Cell Exploratory Analog Similarity Index (0..100)
  const similarityGrid: (number | null)[] = new Array(n).fill(null);
  if (earthDataset && earthDerived && marsDataset && marsDerived && marsDataset.dataState !== 'UNAVAILABLE' && supportedWeight > 0 && targetWidth === W && targetCount === n) {
    const eMin = earthDataset.stats.minElevation;
    const eSpan = Math.max(1, earthDataset.stats.reliefMeters);
    const mMin = marsDataset.stats.minElevation;
    const mSpan = Math.max(1, marsDataset.stats.reliefMeters);

    for (let i = 0; i < n; i++) {
      const ez = earthDataset.elevations[i];
      const mz = marsDataset.elevations[i];
      const es = earthDerived.slopeDegrees[i];
      const ms = marsDerived.slopeDegrees[i];
      const er = earthDerived.roughnessTriMeters[i];
      const mr = marsDerived.roughnessTriMeters[i];

      if (ez == null || mz == null || es == null || ms == null || er == null || mr == null) {
        continue;
      }

      // Normalized relative elevation position + relief scale agreement
      const eNorm = (ez - eMin) / eSpan;
      const mNorm = (mz - mMin) / mSpan;
      const elevSim = Math.max(0, 1 - Math.abs(eNorm - mNorm));

      // Slope similarity (normalized by 30 deg dynamic range)
      const slopeSim = Math.max(0, 1 - Math.abs(es - ms) / 30);

      // Roughness similarity (normalized by 15 m TRI dynamic range)
      const roughSim = Math.max(0, 1 - Math.abs(er - mr) / (15 * Math.sqrt(8)));

      // Temperature similarity (normalized by 250 K planetary thermal span when both exist)
      let tempSim = 0;
      const ek = earthTempK[i] ?? null;
      const mk = targetTempK[i] ?? null;
      if (tempComparable && ek !== null && mk !== null) {
        tempSim = Math.max(0, 1 - Math.abs(ek - mk) / 250);
      }

      const combined =
        elevSim * effectiveWeights.elevation +
        slopeSim * effectiveWeights.slope +
        roughSim * effectiveWeights.roughness +
        tempSim * effectiveWeights.temperature;

      similarityGrid[i] = Math.round(Math.max(0, Math.min(100, combined * 100)) * 10) / 10;
    }
  }

  const simStats = computeSummaryStats(similarityGrid);

  const earthEnhanced: DerivedTerrainGrid | null = earthDerived
    ? {
        ...earthDerived,
        temperatureCelsiusGrid: earthTempC,
        temperatureKelvinGrid: earthTempK,
        temperatureStatsCelsius: earthTempAvail ? computeSummaryStats(earthTempC) : null,
        temperatureAvailable: earthTempAvail,
        temperatureDatasetLabel: earthTempLabel,
        temperatureUnavailableReason: earthTempReason,
        similarityIndexGrid: similarityGrid,
        similarityStats: simStats,
      }
    : null;

  const certRegion = marsDataset ? section9Options?.baseCertification?.regions?.[marsDataset.id] : null;

  const marsEnhanced: DerivedTerrainGrid | null = marsDerived
    ? {
        ...marsDerived,
        temperatureCelsiusGrid: targetTempC,
        temperatureKelvinGrid: targetTempK,
        temperatureStatsCelsius: targetTempAvail ? computeSummaryStats(targetTempC) : null,
        temperatureAvailable: targetTempAvail,
        temperatureDatasetLabel: targetTempLabel,
        temperatureUnavailableReason: targetTempReason,
        similarityIndexGrid: similarityGrid,
        similarityStats: simStats,
        certificationRasters: certRegion?.rasters ?? null,
      }
    : null;

  return {
    earthEnhanced,
    marsEnhanced,
    effectiveWeights,
    temperatureIncluded: tempComparable,
    missingParameterDisclosure,
  };
}

export function extractTransect(
  earthDataset: TerrainGridDataset,
  earthDerived: DerivedTerrainGrid,
  marsDataset: TerrainGridDataset,
  marsDerived: DerivedTerrainGrid,
  preset: TransectPreset,
  sliceFraction = 0.5
): TransectSample[] {
  const W = earthDataset.gridWidth;
  const H = earthDataset.gridHeight;
  const samples: TransectSample[] = [];
  const fixedRow = Math.min(H - 1, Math.max(0, Math.round(sliceFraction * (H - 1))));
  const fixedCol = Math.min(W - 1, Math.max(0, Math.round(sliceFraction * (W - 1))));

  const steps = W;
  for (let i = 0; i < steps; i++) {
    let r = fixedRow;
    let c = i;
    let dist = i * earthDataset.cellSizeMeters;

    if (preset === 'north-south') {
      r = i;
      c = fixedCol;
    } else if (preset === 'nw-se') {
      r = i;
      c = i;
      dist = Math.round(i * earthDataset.cellSizeMeters * Math.SQRT2);
    }

    const idx = r * W + c;
    samples.push({
      distanceMeters: dist,
      earthElevation: earthDataset.elevations[idx] ?? null,
      marsElevation: marsDataset.dataState !== 'UNAVAILABLE' ? (marsDataset.elevations[idx] ?? null) : null,
      earthSlope: earthDerived.slopeDegrees[idx] ?? null,
      marsSlope: marsDataset.dataState !== 'UNAVAILABLE' ? (marsDerived.slopeDegrees[idx] ?? null) : null,
    });
  }
  return samples;
}

// Color interpolation helpers for scientific terrain shading
function lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  const u = Math.max(0, Math.min(1, t));
  return [
    (a[0] + (b[0] - a[0]) * u) / 255,
    (a[1] + (b[1] - a[1]) * u) / 255,
    (a[2] + (b[2] - a[2]) * u) / 255,
  ];
}

function sampleStops(stops: [number, number, number][], t: number): [number, number, number] {
  const u = Math.max(0, Math.min(1, t));
  const scaled = u * (stops.length - 1);
  const idx = Math.min(stops.length - 2, Math.floor(scaled));
  const frac = scaled - idx;
  return lerpColor(stops[idx] ?? [128, 128, 128], stops[idx + 1] ?? [128, 128, 128], frac);
}

const EARTH_ELEV_STOPS: [number, number, number][] = [
  [184, 159, 126],
  [212, 188, 148],
  [196, 152, 108],
  [158, 114, 82],
  [118, 92, 78],
];

const MARS_ELEV_STOPS: [number, number, number][] = [
  [84, 52, 42],
  [136, 76, 54],
  [186, 108, 68],
  [218, 154, 104],
  [238, 206, 168],
];

const SLOPE_STOPS: [number, number, number][] = [
  [40, 106, 145],  // flat (0 deg) - scientific blue
  [50, 127, 121],  // gentle (5 deg) - muted teal
  [194, 139, 56],  // moderate (15 deg) - warm amber
  [182, 74, 52],   // steep (25+ deg) - ferric alert
];

const ROUGHNESS_STOPS: [number, number, number][] = [
  [30, 58, 82],
  [50, 127, 121],
  [194, 139, 56],
  [236, 224, 198],
];

const DIFF_STOPS: [number, number, number][] = [
  [40, 106, 145],  // negative (Mars higher)
  [232, 236, 239], // near zero
  [194, 139, 56],  // positive (Earth higher)
];

const TEMPERATURE_STOPS: [number, number, number][] = [
  [28, 37, 116],   // cryogenic / deep cold
  [43, 114, 181],  // freezing
  [68, 168, 152],  // cool temperate
  [224, 168, 62],  // warm
  [208, 72, 48],   // hot thermal peak
];

const SIMILARITY_STOPS: [number, number, number][] = [
  [38, 52, 74],    // low similarity (0-30)
  [46, 112, 142],  // moderate-low (30-55)
  [52, 158, 128],  // moderate-high (55-80)
  [216, 178, 72],  // high analog convergence (80-100)
];

export function getTemperatureColor(
  tempC: number | null,
  minC: number,
  maxC: number
): [number, number, number] {
  if (tempC === null || !Number.isFinite(tempC)) return [0.34, 0.39, 0.46];
  const span = Math.max(1, maxC - minC);
  const t = Math.max(0, Math.min(1, (tempC - minC) / span));
  return sampleStops(TEMPERATURE_STOPS, t);
}

export function getSimilarityColor(score: number | null): [number, number, number] {
  if (score === null || !Number.isFinite(score)) return [0.34, 0.39, 0.46];
  return sampleStops(SIMILARITY_STOPS, Math.max(0, Math.min(1, score / 100)));
}

export function getElevationColor(t: number, planet: 'Earth' | 'Mars' | 'Moon'): [number, number, number] {
  return sampleStops(planet === 'Mars' ? MARS_ELEV_STOPS : EARTH_ELEV_STOPS, t);
}

export function getSlopeColor(deg: number | null): [number, number, number] {
  if (deg === null) return [0.39, 0.45, 0.55];
  return sampleStops(SLOPE_STOPS, Math.min(1, deg / 30));
}

export function getAspectColor(deg: number | null): [number, number, number] {
  if (deg === null) return [0.45, 0.5, 0.56];
  // Cyclic HCL-like muted directional wheel: N=blue, E=teal, S=amber, W=violet
  const stops: [number, number, number][] = [
    [40, 106, 145],  // N (0)
    [50, 127, 121],  // E (90)
    [194, 139, 56],  // S (180)
    [118, 102, 165], // W (270)
    [40, 106, 145],  // N (360)
  ];
  return sampleStops(stops, (deg % 360) / 360);
}

export function getRoughnessColor(tri: number | null): [number, number, number] {
  if (tri === null) return [0.39, 0.45, 0.55];
  return sampleStops(ROUGHNESS_STOPS, Math.min(1, tri / 12));
}

export function getDifferenceColor(delta: number | null, maxAbs: number): [number, number, number] {
  if (delta === null) return [0.39, 0.45, 0.55];
  const norm = Math.max(-1, Math.min(1, delta / (maxAbs || 1))) * 0.5 + 0.5;
  return sampleStops(DIFF_STOPS, norm);
}

export interface SpatialRenderOptions {
  dataset: TerrainGridDataset;
  derived: DerivedTerrainGrid;
  activeLayer: SpatialLayerId;
  heatmapOpacity?: number;
  differenceGrid?: DifferenceAnalysisResult | null;
  showDifferenceOverlay?: boolean;
  reliefSpanOverride?: number | null;
  hillshade?: boolean;
  contours?: boolean;
  contourIntervalMeters?: number;
  orthophoto?: HTMLImageElement | null;
  size?: number;
}

function bilinearSampleNullable(
  grid: (number | null)[],
  W: number,
  H: number,
  gx: number,
  gy: number
): number | null {
  const x0 = Math.max(0, Math.min(W - 1, Math.floor(gx)));
  const y0 = Math.max(0, Math.min(H - 1, Math.floor(gy)));
  const x1 = Math.min(W - 1, x0 + 1);
  const y1 = Math.min(H - 1, y0 + 1);
  const fx = gx - x0;
  const fy = gy - y0;

  const v00 = grid[y0 * W + x0];
  const v10 = grid[y0 * W + x1];
  const v01 = grid[y1 * W + x0];
  const v11 = grid[y1 * W + x1];

  if (v00 != null && v10 != null && v01 != null && v11 != null) {
    const top = v00 + (v10 - v00) * fx;
    const bot = v01 + (v11 - v01) * fx;
    return top + (bot - top) * fy;
  }

  // Fallback to nearest valid corner inside 2x2 cell without fabricating across voids
  const cx = fx >= 0.5 ? x1 : x0;
  const cy = fy >= 0.5 ? y1 : y0;
  return grid[cy * W + cx] ?? v00 ?? v10 ?? v01 ?? v11 ?? null;
}

function bilinearAspectDegrees(
  grid: (number | null)[],
  W: number,
  H: number,
  gx: number,
  gy: number
): number | null {
  const x0 = Math.max(0, Math.min(W - 1, Math.floor(gx)));
  const y0 = Math.max(0, Math.min(H - 1, Math.floor(gy)));
  const x1 = Math.min(W - 1, x0 + 1);
  const y1 = Math.min(H - 1, y0 + 1);
  const fx = gx - x0;
  const fy = gy - y0;

  const a00 = grid[y0 * W + x0];
  const a10 = grid[y0 * W + x1];
  const a01 = grid[y1 * W + x0];
  const a11 = grid[y1 * W + x1];

  if (a00 != null && a10 != null && a01 != null && a11 != null) {
    // Interpolate unit vectors cleanly to prevent 359° -> 1° wrapping artifacts
    const w00 = (1 - fx) * (1 - fy);
    const w10 = fx * (1 - fy);
    const w01 = (1 - fx) * fy;
    const w11 = fx * fy;
    const r = Math.PI / 180;
    const sinSum =
      w00 * Math.sin(a00 * r) +
      w10 * Math.sin(a10 * r) +
      w01 * Math.sin(a01 * r) +
      w11 * Math.sin(a11 * r);
    const cosSum =
      w00 * Math.cos(a00 * r) +
      w10 * Math.cos(a10 * r) +
      w01 * Math.cos(a01 * r) +
      w11 * Math.cos(a11 * r);
    const deg = ((Math.atan2(sinSum, cosSum) * 180) / Math.PI + 360) % 360;
    return deg;
  }

  const cx = fx >= 0.5 ? x1 : x0;
  const cy = fy >= 0.5 ? y1 : y0;
  return grid[cy * W + cx] ?? null;
}

/**
 * Renders a crisp high-resolution cartographic spatial map onto an HTMLCanvasElement
 * from real DEM grids using directional Horn-style hillshading, optional anti-aliased
 * topographic contours, matched local relief scaling, and real orbital imagery fusion.
 */
export function renderSpatialMapToCanvas(
  options: SpatialRenderOptions,
  targetCanvas?: HTMLCanvasElement
): HTMLCanvasElement {
  const {
    dataset,
    derived,
    activeLayer,
    heatmapOpacity = 1.0,
    differenceGrid = null,
    showDifferenceOverlay = false,
    reliefSpanOverride = null,
    hillshade = true,
    contours = true,
    contourIntervalMeters = 25,
    orthophoto = null,
    size = 512,
  } = options;

  const canvas = targetCanvas ?? document.createElement('canvas');
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size;
    canvas.height = size;
  }
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  const { gridWidth: W, gridHeight: H, cellSizeMeters, elevations, stats } = dataset;
  const minElev = stats.minElevation;
  const naturalSpan = Math.max(1, stats.maxElevation - minElev);
  const elevSpan = reliefSpanOverride && reliefSpanOverride > 0 ? Math.max(1, reliefSpanOverride) : naturalSpan;

  const maxAbsDiff =
    showDifferenceOverlay && differenceGrid?.valid && differenceGrid.stats
      ? Math.max(Math.abs(differenceGrid.stats.min), Math.abs(differenceGrid.stats.max), 1)
      : 1;

  const isImageryBase = activeLayer === 'imagery' && !showDifferenceOverlay && orthophoto !== null;
  let imgData: ImageData;
  if (isImageryBase && orthophoto) {
    ctx.drawImage(orthophoto, 0, 0, size, size);
    imgData = ctx.getImageData(0, 0, size, size);
  } else {
    imgData = ctx.createImageData(size, size);
  }

  const pixels = imgData.data;

  // NW solar azimuth 315°, altitude 42° (standard USGS shaded relief illumination)
  const azimuthRad = (315 * Math.PI) / 180;
  const altitudeRad = (42 * Math.PI) / 180;
  const zenithRad = Math.PI / 2 - altitudeRad;
  const cosZ = Math.cos(zenithRad);
  const sinZ = Math.sin(zenithRad);
  const metersPerOutPixel = (extentStep(W, cellSizeMeters, size));
  const zFactor = 1.45;
  const minorInterval = Math.max(5, contourIntervalMeters);
  const majorInterval = minorInterval * 4; // e.g., 25m minor / 100m index contour

  for (let py = 0; py < size; py++) {
    const gy = (py / (size - 1)) * (H - 1);
    const rNearest = Math.min(H - 1, Math.max(0, Math.round(gy)));
    const gyPrev = Math.max(0, gy - 0.5);
    const gyNext = Math.min(H - 1, gy + 0.5);
    const dyCells = Math.max(0.25, gyNext - gyPrev);

    for (let px = 0; px < size; px++) {
      const gx = (px / (size - 1)) * (W - 1);
      const cNearest = Math.min(W - 1, Math.max(0, Math.round(gx)));
      const gxPrev = Math.max(0, gx - 0.5);
      const gxNext = Math.min(W - 1, gx + 0.5);
      const dxCells = Math.max(0.25, gxNext - gxPrev);

      const elev = bilinearSampleNullable(elevations, W, H, gx, gy);

      // Compute smooth sub-cell topographic slope vector for directional hillshade & AA contours
      const eL = bilinearSampleNullable(elevations, W, H, gxPrev, gy);
      const eR = bilinearSampleNullable(elevations, W, H, gxNext, gy);
      const eU = bilinearSampleNullable(elevations, W, H, gx, gyPrev);
      const eD = bilinearSampleNullable(elevations, W, H, gx, gyNext);

      let dzdx = 0;
      let dzdy = 0;
      let shadeFactor = 1.0;

      if (eL != null && eR != null && eU != null && eD != null) {
        dzdx = (eR - eL) / (dxCells * cellSizeMeters);
        dzdy = (eU - eD) / (dyCells * cellSizeMeters); // row 0 is North (+Y)
        if (hillshade) {
          const sx = dzdx * zFactor;
          const sy = dzdy * zFactor;
          const slopeRad = Math.atan(Math.sqrt(sx * sx + sy * sy));
          const aspectRad = Math.atan2(-sx, -sy);
          const illum = cosZ * Math.cos(slopeRad) + sinZ * Math.sin(slopeRad) * Math.cos(azimuthRad - aspectRad);
          const clampedIllum = Math.max(0, Math.min(1, illum));
          shadeFactor = isImageryBase
            ? 0.86 + 0.24 * clampedIllum
            : 0.60 + 0.52 * clampedIllum;
        }
      }

      const pIdx = (py * size + px) * 4;
      let r: number;
      let g: number;
      let b: number;

      if (isImageryBase) {
        r = pixels[pIdx] ?? 128;
        g = pixels[pIdx + 1] ?? 128;
        b = pixels[pIdx + 2] ?? 128;
      } else {
        const elevT = elev !== null ? (elev - minElev) / elevSpan : 0;
        const baseElevRgb = getElevationColor(elevT, dataset.planet);
        let rgb: [number, number, number] = baseElevRgb;

        if (showDifferenceOverlay && differenceGrid?.valid) {
          const diffVal = bilinearSampleNullable(differenceGrid.gridValues, W, H, gx, gy);
          rgb = getDifferenceColor(diffVal, maxAbsDiff);
        } else if (activeLayer === 'elevation' || activeLayer === 'geology' || activeLayer === 'imagery') {
          rgb = baseElevRgb;
        } else if (activeLayer === 'slope') {
          const slopeVal = bilinearSampleNullable(derived.slopeDegrees, W, H, gx, gy);
          rgb = getSlopeColor(slopeVal);
        } else if (activeLayer === 'aspect') {
          const aspVal = bilinearAspectDegrees(derived.aspectDegrees, W, H, gx, gy);
          rgb = getAspectColor(aspVal);
        } else if (activeLayer === 'roughness') {
          const triVal = bilinearSampleNullable(derived.roughnessTriMeters, W, H, gx, gy);
          rgb = getRoughnessColor(triVal);
        } else if (activeLayer === 'temperature') {
          if (derived.temperatureAvailable && derived.temperatureCelsiusGrid && derived.temperatureStatsCelsius) {
            const tempVal = bilinearSampleNullable(derived.temperatureCelsiusGrid, W, H, gx, gy);
            rgb = getTemperatureColor(
              tempVal,
              derived.temperatureStatsCelsius.min,
              derived.temperatureStatsCelsius.max
            );
          } else {
            // Strictly uncolored neutral slate when temperature dataset is unavailable (e.g. Mars MOLA)
            rgb = [0.33, 0.38, 0.44];
          }
        } else if (activeLayer === 'similarity') {
          if (derived.similarityIndexGrid) {
            const simVal = bilinearSampleNullable(derived.similarityIndexGrid, W, H, gx, gy);
            rgb = getSimilarityColor(simVal);
          } else {
            rgb = [0.33, 0.38, 0.44];
          }
        } else if (activeLayer === 'coverage') {
          const isValid = derived.validElevationMask[rNearest * W + cNearest];
          const isEdge = rNearest === 0 || cNearest === 0 || rNearest === H - 1 || cNearest === W - 1;
          rgb = !isValid ? [0.71, 0.29, 0.2] : isEdge ? [0.76, 0.55, 0.22] : [0.2, 0.5, 0.47];
        }

        const alpha = Math.max(0.15, Math.min(1, heatmapOpacity));
        r = (rgb[0] * alpha + baseElevRgb[0] * (1 - alpha)) * 255;
        g = (rgb[1] * alpha + baseElevRgb[1] * (1 - alpha)) * 255;
        b = (rgb[2] * alpha + baseElevRgb[2] * (1 - alpha)) * 255;
      }

      // Apply directional hillshade contrast
      r *= shadeFactor;
      g *= shadeFactor;
      b *= shadeFactor;

      // Overlay smooth screen-space anti-aliased topographic contour isolines
      if (contours && elev !== null && !showDifferenceOverlay && activeLayer !== 'coverage') {
        const gradMetersPerPx = Math.sqrt(dzdx * dzdx + dzdy * dzdy) * metersPerOutPixel;
        if (gradMetersPerPx > 0.02) {
          const remMinor = ((elev % minorInterval) + minorInterval) % minorInterval;
          const distMinorPx = Math.min(remMinor, minorInterval - remMinor) / gradMetersPerPx;

          const remMajor = ((elev % majorInterval) + majorInterval) % majorInterval;
          const distMajorPx = Math.min(remMajor, majorInterval - remMajor) / gradMetersPerPx;

          const minorWidth = isImageryBase ? 0.72 : 0.85;
          const majorWidth = isImageryBase ? 1.15 : 1.3;

          let lineAlpha = 0;
          if (distMajorPx < majorWidth) {
            const aa = 1 - Math.max(0, (distMajorPx - majorWidth * 0.35) / (majorWidth * 0.65));
            lineAlpha = aa * (isImageryBase ? 0.48 : 0.62);
          } else if (distMinorPx < minorWidth) {
            const aa = 1 - Math.max(0, (distMinorPx - minorWidth * 0.3) / (minorWidth * 0.7));
            lineAlpha = aa * (isImageryBase ? 0.26 : 0.34);
          }

          if (lineAlpha > 0) {
            const lineLum = isImageryBase ? 240 : 18;
            r = r * (1 - lineAlpha) + lineLum * lineAlpha;
            g = g * (1 - lineAlpha) + (isImageryBase ? 245 : 26) * lineAlpha;
            b = b * (1 - lineAlpha) + (isImageryBase ? 248 : 34) * lineAlpha;
          }
        }
      }

      pixels[pIdx] = Math.max(0, Math.min(255, Math.round(r)));
      pixels[pIdx + 1] = Math.max(0, Math.min(255, Math.round(g)));
      pixels[pIdx + 2] = Math.max(0, Math.min(255, Math.round(b)));
      pixels[pIdx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

function extentStep(gridWidth: number, cellSizeMeters: number, outSize: number): number {
  const totalMeters = Math.max(1, (gridWidth - 1) * cellSizeMeters);
  return totalMeters / Math.max(1, outSize - 1);
}

