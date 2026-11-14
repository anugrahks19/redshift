import type {
  DerivedTerrainGrid,
  DifferenceAnalysisResult,
  DistributionBin,
  MetricSummaryStats,
  SpatialLayerId,
  TerrainGridDataset,
  TerrainSampleInspection,
  TransectPreset,
  TransectSample,
} from '../types/terrain';

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
  const n = W * H;
  const slopeDegrees: (number | null)[] = new Array(n).fill(null);
  const aspectDegrees: (number | null)[] = new Array(n).fill(null);
  const roughnessTriMeters: (number | null)[] = new Array(n).fill(null);
  const validElevationMask: boolean[] = elevations.map((v) => v !== null && Number.isFinite(v));
  const validDerivedMask: boolean[] = new Array(n).fill(false);

  if (dataset.dataState !== 'UNAVAILABLE' && elevations.length === n) {
    for (let r = 1; r < H - 1; r++) {
      for (let c = 1; c < W - 1; c++) {
        const idx = r * W + c;
        const a = elevations[(r - 1) * W + (c - 1)];
        const b = elevations[(r - 1) * W + c];
        const cVal = elevations[(r - 1) * W + (c + 1)];
        const d = elevations[r * W + (c - 1)];
        const e = elevations[idx];
        const f = elevations[r * W + (c + 1)];
        const g = elevations[(r + 1) * W + (c - 1)];
        const h = elevations[(r + 1) * W + c];
        const iVal = elevations[(r + 1) * W + (c + 1)];

        if (
          a == null || b == null || cVal == null ||
          d == null || e == null || f == null ||
          g == null || h == null || iVal == null
        ) {
          continue;
        }

        // Horn (1981) 3x3 gradient
        const dzdx = ((cVal + 2 * f + iVal) - (a + 2 * d + g)) / (8 * cell);
        // Row 0 is North (+Y), row increases South (-Y) -> positive dzdy slopes up toward North
        const dzdy = ((a + 2 * b + cVal) - (g + 2 * h + iVal)) / (8 * cell);
        const slopeRad = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));
        const slopeDeg = (slopeRad * 180) / Math.PI;
        slopeDegrees[idx] = Math.round(slopeDeg * 100) / 100;

        // Aspect clockwise from North (0 = North, 90 = East, 180 = South, 270 = West)
        if (slopeDeg < 0.05) {
          aspectDegrees[idx] = null; // Flat surface has undefined aspect
        } else {
          // Downhill vector is (-dzdx, -dzdy) where +y is North
          const aspectRad = Math.atan2(-dzdx, -dzdy);
          const asp = (((aspectRad * 180) / Math.PI) + 360) % 360;
          aspectDegrees[idx] = Math.round(asp * 10) / 10;
        }

        // Terrain Ruggedness Index (mean absolute difference to 8 neighbors in 3x3 = 90m x 90m window)
        const tri =
          (Math.abs(e - a) +
            Math.abs(e - b) +
            Math.abs(e - cVal) +
            Math.abs(e - d) +
            Math.abs(e - f) +
            Math.abs(e - g) +
            Math.abs(e - h) +
            Math.abs(e - iVal)) /
          8;
        roughnessTriMeters[idx] = Math.round(tri * 100) / 100;
        validDerivedMask[idx] = true;
      }
    }
  }

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
    slopeMethod: 'Horn (1981) 3×3 finite-difference gradient at 30.0 m cell spacing',
    roughnessMethod: 'Mean absolute 8-neighbor elevation difference (TRI) over 3×3 (90 m × 90 m) window',
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

  const projectedLabel =
    dataset.planet === 'Earth'
      ? `E ${projX.toFixed(0)} m, N ${projY.toFixed(0)} m (UTM 19S)`
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
    inValidCoverage: elev !== null,
    datasetName: dataset.provenance.datasetName,
    dataState: dataset.dataState,
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
        let rgb: [number, number, number] = [0.5, 0.5, 0.5];
        if (showDifferenceOverlay && differenceGrid?.valid) {
          const diffVal = bilinearSampleNullable(differenceGrid.gridValues, W, H, gx, gy);
          rgb = getDifferenceColor(diffVal, maxAbsDiff);
        } else if (activeLayer === 'elevation' || activeLayer === 'geology') {
          const t = elev !== null ? (elev - minElev) / elevSpan : 0;
          rgb = getElevationColor(t, dataset.planet);
        } else if (activeLayer === 'slope') {
          const slopeVal = bilinearSampleNullable(derived.slopeDegrees, W, H, gx, gy);
          rgb = getSlopeColor(slopeVal);
        } else if (activeLayer === 'aspect') {
          const aspVal = bilinearAspectDegrees(derived.aspectDegrees, W, H, gx, gy);
          rgb = getAspectColor(aspVal);
        } else if (activeLayer === 'roughness') {
          const triVal = bilinearSampleNullable(derived.roughnessTriMeters, W, H, gx, gy);
          rgb = getRoughnessColor(triVal);
        } else if (activeLayer === 'coverage') {
          const isValid = derived.validElevationMask[rNearest * W + cNearest];
          const isEdge = rNearest === 0 || cNearest === 0 || rNearest === H - 1 || cNearest === W - 1;
          rgb = !isValid ? [0.71, 0.29, 0.2] : isEdge ? [0.76, 0.55, 0.22] : [0.2, 0.5, 0.47];
        } else if (activeLayer === 'imagery') {
          const t = elev !== null ? (elev - minElev) / elevSpan : 0;
          rgb = getElevationColor(t, dataset.planet);
        }
        r = rgb[0] * 255;
        g = rgb[1] * 255;
        b = rgb[2] * 255;
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

