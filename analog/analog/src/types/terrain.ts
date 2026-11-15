export type DataState = 'REAL_DATA' | 'DEMONSTRATION_DATA' | 'UNAVAILABLE';

export type SpatialLayerId =
  | 'elevation'
  | 'slope'
  | 'aspect'
  | 'roughness'
  | 'temperature'
  | 'similarity'
  | 'imagery'
  | 'geology'
  | 'coverage';

export type ComparisonMode = 'side-by-side' | 'synchronized' | 'difference' | 'curtain';

export type TransectPreset = 'west-east' | 'north-south' | 'nw-se';

export type DifferenceMetricId = 'slope' | 'roughness' | 'elevation' | 'aspect';

export interface TerrainImageryOverlay {
  url: string;
  source: string;
  attribution: string;
  bboxGeographic?: [number, number, number, number];
  bboxProjected?: [number, number, number, number];
  note: string;
}

export interface TerrainProvenance {
  datasetName: string;
  provider: string;
  instrumentOrMission: string;
  originalUrl: string;
  cogUrl: string;
  productId: string;
  acquisitionRange: string;
  processingPerformed: string;
  resamplingMethod: string;
  limitations: string;
}

export interface TerrainGridDataset {
  id: string;
  planet: 'Earth' | 'Mars' | 'Moon';
  siteName: string;
  shortName: string;
  dataState: DataState;
  gridWidth: number;
  gridHeight: number;
  cellSizeMeters: number;
  extentMeters: [number, number];
  nativeResolutionLabel: string;
  analysisResolutionLabel: string;
  crs: string;
  nativeCrs: string;
  verticalDatum: string;
  isSurfaceModel: boolean;
  units: string;
  bounds: {
    projected: [number, number, number, number];
    geographic: [number, number, number, number];
    center: {
      lat: number;
      lon: number;
      label: string;
    };
    fullMosaicProjected?: [number, number, number, number];
  };
  stats: {
    validCells: number;
    totalCells: number;
    coveragePercent: number;
    minElevation: number;
    maxElevation: number;
    reliefMeters: number;
  };
  imagery: TerrainImageryOverlay | null;
  provenance: TerrainProvenance;
  elevations: (number | null)[];
  unavailableReason?: string;
}

export interface DistributionBin {
  label: string;
  min: number;
  max: number;
  count: number;
  frequency: number;
}

export interface MetricSummaryStats {
  validCount: number;
  min: number;
  p10: number;
  median: number;
  mean: number;
  p90: number;
  max: number;
  stdDev: number;
}

export interface SimilarityWeights {
  elevation: number;
  slope: number;
  roughness: number;
  temperature: number;
}

export interface BaseCertificationCellTelemetry {
  radiationMsvYr: number | null;
  skyViewSteradians: number | null;
  waterIceWehPct: number | null;
  illuminationPct: number | null;
  dteCommsPct: number | null;
  rockAbundancePct: number | null;
  bearingCapacityKpa: number | null;
}

export interface DerivedTerrainGrid {
  datasetId: string;
  gridWidth: number;
  gridHeight: number;
  cellSizeMeters: number;
  slopeDegrees: (number | null)[];
  aspectDegrees: (number | null)[];
  roughnessTriMeters: (number | null)[];
  validElevationMask: boolean[];
  validDerivedMask: boolean[];
  slopeStats: MetricSummaryStats;
  roughnessStats: MetricSummaryStats;
  slopeHistogram: DistributionBin[];
  roughnessHistogram: DistributionBin[];
  slopeMethod: string;
  roughnessMethod: string;
  temperatureCelsiusGrid?: (number | null)[];
  temperatureKelvinGrid?: (number | null)[];
  temperatureStatsCelsius?: MetricSummaryStats | null;
  temperatureAvailable?: boolean;
  temperatureDatasetLabel?: string;
  temperatureUnavailableReason?: string;
  similarityIndexGrid?: (number | null)[];
  similarityStats?: MetricSummaryStats | null;
  certificationRasters?: {
    radiationMsvYr: number[];
    skyViewSteradians: number[];
    waterIceWehPct: number[];
    illuminationPct: number[];
    dteCommsPct: number[];
    rockAbundancePct: number[];
    bearingCapacityKpa: number[];
  } | null;
}

export interface TerrainSampleInspection {
  planet: 'Earth' | 'Mars' | 'Moon';
  row: number;
  col: number;
  localXMeters: number;
  localYMeters: number;
  projectedX: number;
  projectedY: number;
  projectedLabel: string;
  geographicLat: number;
  geographicLon: number;
  geographicLabel: string;
  elevationMeters: number | null;
  verticalDatum: string;
  slopeDegrees: number | null;
  aspectDegrees: number | null;
  aspectCompass: string | null;
  roughnessTriMeters: number | null;
  temperatureCelsius?: number | null;
  temperatureKelvin?: number | null;
  similarityScore?: number | null;
  certification?: BaseCertificationCellTelemetry | null;
  inValidCoverage: boolean;
  datasetName: string;
  dataState: DataState;
}

export interface TransectSample {
  distanceMeters: number;
  earthElevation: number | null;
  marsElevation: number | null;
  earthSlope: number | null;
  marsSlope: number | null;
}

export interface DifferenceValidationCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface DifferenceAnalysisResult {
  metric: DifferenceMetricId;
  metricLabel: string;
  units: string;
  valid: boolean;
  disabledReason?: string;
  checks: DifferenceValidationCheck[];
  earthLabel: string;
  marsLabel: string;
  commonScaleMeters: number;
  gridValues: (number | null)[];
  stats: MetricSummaryStats | null;
  histogram: DistributionBin[];
}

export interface CameraSyncState {
  azimuth: number;
  polar: number;
  distanceRatio: number;
  sourceViewport: 'earth' | 'mars' | null;
  revision: number;
}

