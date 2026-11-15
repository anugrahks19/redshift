import { createTemperatureSampler } from './thermalSampling.mjs';
/**
 * NASA SPACE APPS 2026 — 3D COMPARATIVE SCIENTIFIC SIMULATION ENGINE
 *
 * Pure physics, environmental state, and dataset-backed calculation module.
 * Completely separated from React UI and Three.js rendering components.
 *
 * Strict Provenance Rules:
 * - MEASURED: Directly read from bundled NASA / ESA rasters (NASADEM, MODIS MOD11A2, LOLA, Diviner PCP, MGS TES)
 * - CALCULATED: Deterministic physics / Horn (1981) / Riley (1999) equations
 * - PUBLISHED REF: NASA NSSDCA Planetary Fact Sheets & MSL REMS/SAM/RAD
 * - ASSUMPTION: Configurable engineering/educational parameters (e.g. EVA suit internal pressure)
 */

import type { DerivedTerrainGrid, TerrainGridDataset } from '../types/terrain';
import type {
  BaseCertificationDataset,
  DivinerPcpDataset,
  ModisLstDataset,
  PlanetaryEnvironmentReference,
} from './terrainDataService';

export type MissionId = 'mission-1-mars' | 'mission-2-moon';
export type EnvironmentSide = 'earth' | 'planet';
export type ExperimentId = 'gravity' | 'atmosphere' | 'temperature' | 'base-site';
export type DropObjectId = 'basalt-sphere' | 'titanium-probe' | 'aerogel-collector';

export interface DropObjectSpec {
  id: DropObjectId;
  name: string;
  massKg: number;
  radiusMeters: number;
  color: string;
  description: string;
}

export const DROP_OBJECTS: DropObjectSpec[] = [
  {
    id: 'basalt-sphere',
    name: 'Basalt Regolith Core (2.5 kg)',
    massKg: 2.5,
    radiusMeters: 0.36,
    color: '#D97706',
    description: 'Dense volcanic basalt reference sphere used for vacuum/thin-air free-fall comparison.',
  },
  {
    id: 'titanium-probe',
    name: 'Titanium Instrument Probe (5.0 kg)',
    massKg: 5.0,
    radiusMeters: 0.42,
    color: '#38BDF8',
    description: 'Heavy descent lander mass simulator for touchdown velocity testing.',
  },
  {
    id: 'aerogel-collector',
    name: 'Aerogel Dust Collector (0.45 kg)',
    massKg: 0.45,
    radiusMeters: 0.32,
    color: '#A7F3D0',
    description: 'Lightweight payload capsule; in vacuum/near-vacuum falls at the exact same gravitational acceleration.',
  },
];

export interface GravityCalculationResult {
  environment: EnvironmentSide;
  locationName: string;
  gravityMs2: number;
  objectId: DropObjectId;
  objectName: string;
  dropHeightMeters: number;
  fallTimeSeconds: number;
  finalVelocityMs: number;
  impactEnergyJoules: number;
  provenance: 'CALCULATED + PUBLISHED REF';
}

export interface AtmosphereExperimentResult {
  environment: EnvironmentSide;
  locationName: string;
  outsidePressureMbar: number;
  outsideOxygenPct: number;
  outsideOxygenPartialPressureKpa: number;
  suitOxygenPartialPressureKpa: number | null;
  suitActive: boolean;
  suitInternalPressureKpa: number;
  suitOxygenPct: number;
  lifeSupportStatus: 'NOMINAL (BREATHABLE AMBIENT)' | 'NOMINAL (PRESSURIZED EVA SUIT)' | 'CRITICAL (UNPROTECTED EXPOSURE)';
  hazardSummary: string;
  aboveArmstrongLimit: boolean;
}

export interface TemperatureExperimentResult {
  environment: EnvironmentSide;
  locationName: string;
  ambientTempCelsius: number | null;
  ambientTempKelvin: number | null;
  probeInitialCelsius: number;
  probeFinalCelsius: number | null;
  equilibrationTauSeconds: number;
  datasetSource: string;
  measurementContext: string;
  dataAvailable: boolean;
  unavailableReason?: string;
  attributionTier: 'MEASURED' | 'CALCULATED' | 'PUBLISHED REF';
}

export interface BaseSiteInspectionResult {
  siteId: string;
  siteName: string;
  row: number;
  col: number;
  elevationMeters: number | null;
  slopeDegrees: number | null;
  roughnessTriMeters: number | null;
  divinerTempKelvin: number | null;
  divinerTempCelsius: number | null;
  illuminationPct: number | null;
  dteCommsPct: number | null;
  waterIceWehPct: number | null;
  radiationMsvYr: number | null;
  rockAbundancePct: number | null;
  bearingCapacityKpa: number | null;
  certificationVerdict: string;
}

export interface EnvironmentTelemetry {
  side: EnvironmentSide;
  bodyName: 'Earth' | 'Mars' | 'Moon';
  siteName: string;
  gravityMs2: number;
  gravitySource: string;
  pressureMbar: number;
  pressureSource: string;
  oxygenPct: number;
  oxygenSource: string;
  temperatureCelsius: number | null;
  temperatureKelvin: number | null;
  temperatureSource: string;
  temperatureTier: 'MEASURED' | 'CALCULATED' | 'PUBLISHED REF' | 'UNAVAILABLE';
  elevationMeanMeters: number | null;
  elevationRangeLabel: string;
  elevationSource: string;
}

export const GRAVITY_CONSTANTS = {
  earth: 9.80665,
  mars: 3.72076,
  moon: 1.622,
} as const;

export function calculateGravityDrop(
  environment: EnvironmentSide,
  mission: MissionId,
  objectId: DropObjectId,
  dropHeightMeters: number
): GravityCalculationResult {
  const g =
    environment === 'earth'
      ? GRAVITY_CONSTANTS.earth
      : mission === 'mission-1-mars'
        ? GRAVITY_CONSTANTS.mars
        : GRAVITY_CONSTANTS.moon;

  const obj = DROP_OBJECTS.find((o) => o.id === objectId);
  if (!obj || !Number.isFinite(dropHeightMeters) || dropHeightMeters < 1 || dropHeightMeters > 50) {
    throw new RangeError('Select a known drop object and a height between 1 and 50 m.');
  }
  const h = dropHeightMeters;
  // Idealized free-fall kinematics: h = 0.5 * g * t^2 -> t = sqrt(2h / g)
  const fallTimeSeconds = Math.sqrt((2 * h) / g);
  const finalVelocityMs = g * fallTimeSeconds;
  const impactEnergyJoules = 0.5 * obj.massKg * finalVelocityMs * finalVelocityMs;

  const locationName =
    environment === 'earth'
      ? mission === 'mission-1-mars'
        ? 'Atacama Desert (Yungay), Earth'
        : 'McMurdo Dry Valleys, Earth'
      : mission === 'mission-1-mars'
        ? 'Jezero / Gale Crater, Mars'
        : 'Shackleton Crater, Moon';

  return {
    environment,
    locationName,
    gravityMs2: g,
    objectId: obj.id,
    objectName: obj.name,
    dropHeightMeters: h,
    fallTimeSeconds,
    finalVelocityMs,
    impactEnergyJoules,
    provenance: 'CALCULATED + PUBLISHED REF',
  };
}

export function evaluateFreeFallAtTime(
  dropHeightMeters: number,
  gravityMs2: number,
  elapsedSeconds: number
): { currentHeightMeters: number; currentVelocityMs: number; impacted: boolean } {
  if (!Number.isFinite(dropHeightMeters) || dropHeightMeters < 0 ||
      !Number.isFinite(gravityMs2) || gravityMs2 <= 0 || !Number.isFinite(elapsedSeconds)) {
    throw new RangeError('Free fall requires finite inputs, nonnegative height and positive gravity.');
  }
  const fallTime = Math.sqrt((2 * dropHeightMeters) / gravityMs2);
  const t = Math.max(0, Math.min(elapsedSeconds, fallTime));
  const currentHeightMeters = Math.max(0, dropHeightMeters - 0.5 * gravityMs2 * t * t);
  const currentVelocityMs = gravityMs2 * t;
  return {
    currentHeightMeters: elapsedSeconds >= fallTime ? 0 : currentHeightMeters,
    currentVelocityMs,
    impacted: elapsedSeconds >= fallTime,
  };
}

export function evaluateAtmosphereExperiment(
  environment: EnvironmentSide,
  mission: MissionId,
  suitActive: boolean,
  suitInternalPressureKpa: number
): AtmosphereExperimentResult {
  const isEarth = environment === 'earth';
  const isMars = mission === 'mission-1-mars';
  const outsidePressureMbar = isEarth ? (isMars ? 905 : 980) : (isMars ? 6.36 : 3e-12);
  const outsideOxygenPct = isEarth ? 20.95 : (isMars ? 0.16 : 0);
  const outsideOxygenPartialPressureKpa = outsidePressureMbar * 0.1 * outsideOxygenPct / 100;
  const aboveArmstrongLimit = outsidePressureMbar >= 62.8;
  const supportedSuit = suitInternalPressureKpa === 29.6 || suitInternalPressureKpa === 57.2;
  const suitOxygenPct = suitInternalPressureKpa === 29.6 ? 100 : 34;
  const suitProtected = suitActive && supportedSuit;

  return {
    environment,
    locationName: isEarth ? (isMars ? 'Yungay, Atacama' : 'McMurdo Dry Valleys') : (isMars ? 'Mars mean-radius reference' : 'Lunar surface'),
    outsidePressureMbar,
    outsideOxygenPct,
    outsideOxygenPartialPressureKpa,
    suitActive,
    suitInternalPressureKpa,
    suitOxygenPct,
    suitOxygenPartialPressureKpa: suitProtected ? suitInternalPressureKpa * suitOxygenPct / 100 : null,
    lifeSupportStatus: suitProtected ? 'NOMINAL (PRESSURIZED EVA SUIT)' :
      isEarth && !suitActive ? 'NOMINAL (BREATHABLE AMBIENT)' : 'CRITICAL (UNPROTECTED EXPOSURE)',
    hazardSummary: suitProtected
      ? 'The educational suit model assumes an intact seal, oxygen supply and CO₂ removal. Its internal pressure is separate from ambient pressure.'
      : suitActive ? 'This pressure is outside the supported suit model.'
        : aboveArmstrongLimit ? 'The ambient model uses an approximate local Earth reference. Oxygen partial pressure is total pressure multiplied by oxygen fraction.'
          : 'Ambient pressure is below the 62.8 mbar Armstrong limit and oxygen partial pressure is insufficient for breathing.',
    aboveArmstrongLimit,
  };
}

export function evaluateTemperatureExperiment(
  environment: EnvironmentSide,
  mission: MissionId,
  row: number,
  col: number,
  modisData: ModisLstDataset | null,
  divinerData: DivinerPcpDataset | null,
  dataset: TerrainGridDataset | null
): TemperatureExperimentResult {
  const mars = mission === 'mission-1-mars';
  const earth = environment === 'earth';
  const profile = earth ? modisData?.sites[mars ? 'yungay-atacama' : 'mcmurdo-dry-valleys'] : null;
  const marsReference = !earth && mars;
  const sample = marsReference
    ? { celsius: -65, kelvin: 208.15 }
    : createTemperatureSampler(dataset, profile, divinerData)(row, col);
  return {
    environment,
    locationName: earth ? (mars ? 'Yungay, Atacama' : 'McMurdo Dry Valleys') : (mars ? 'Mars planetary reference' : 'Shackleton Crater'),
    ambientTempCelsius: sample ? Number(sample.celsius.toFixed(2)) : null,
    ambientTempKelvin: sample ? Number(sample.kelvin.toFixed(2)) : null,
    probeInitialCelsius: 20,
    probeFinalCelsius: sample?.celsius ?? null,
    equilibrationTauSeconds: 4,
    datasetSource: earth ? (profile?.granuleId ?? 'MODIS 8-day LST') :
      mars ? 'NASA Solar System Temperatures' : (divinerData?.productId ?? 'LRO Diviner PCP'),
    measurementContext: earth ? `Daytime land surface temperature, 1 km 8-day composite starting ${profile?.acquisitionDate.slice(0, 10) ?? 'unavailable'}.` :
      mars ? 'Published planetary mean of −65 °C. Local surface temperature is unavailable.' :
        '240 m bolometric temperature, southern summer, 00:00–00:15 local time, 2009–2019 observations.',
    dataAvailable: sample !== null,
    unavailableReason: sample ? undefined : 'No valid temperature pixel covers this terrain cell.',
    attributionTier: marsReference ? 'PUBLISHED REF' : 'MEASURED',
  };
}

export function evaluateProbeTemperatureAtTime(
  initialCelsius: number,
  ambientCelsius: number,
  tauSeconds: number,
  elapsedSeconds: number
): number {
  // Simplified Newton thermal equilibration model for educational visualization
  return ambientCelsius + (initialCelsius - ambientCelsius) * Math.exp(-elapsedSeconds / tauSeconds);
}

export function inspectLunarBaseSite(
  siteId: string,
  siteName: string,
  row: number,
  col: number,
  moonDataset: TerrainGridDataset | null,
  moonDerived: DerivedTerrainGrid | null,
  divinerData: DivinerPcpDataset | null,
  _baseCertification: BaseCertificationDataset | null
): BaseSiteInspectionResult {
  const width = moonDataset?.gridWidth ?? 0;
  const valid = moonDataset && Number.isInteger(row) && Number.isInteger(col) &&
    row >= 0 && col >= 0 && row < moonDataset.gridHeight && col < width;
  const idx = valid ? row * width + col : -1;
  const elevationMeters = moonDataset?.elevations[idx] ?? null;
  const slopeDegrees = moonDerived?.slopeDegrees[idx] ?? null;
  const roughnessTriMeters = moonDerived?.roughnessTriMeters[idx] ?? null;
  const sample = createTemperatureSampler(moonDataset, null, divinerData)(row, col);
  const divinerTempKelvin = sample?.kelvin ?? null;
  const divinerTempCelsius = sample ? Number(sample.celsius.toFixed(2)) : null;
  const certificationVerdict = 'The five core datasets cannot independently certify a permanent lunar base as safe.';

  return {
    siteId,
    siteName,
    row,
    col,
    elevationMeters: elevationMeters !== null ? Number(elevationMeters.toFixed(1)) : null,
    slopeDegrees: slopeDegrees !== null ? Number(slopeDegrees.toFixed(2)) : null,
    roughnessTriMeters: roughnessTriMeters !== null ? Number(roughnessTriMeters.toFixed(2)) : null,
    divinerTempKelvin,
    divinerTempCelsius,
    illuminationPct: null,
    dteCommsPct: null,
    waterIceWehPct: null,
    radiationMsvYr: null,
    rockAbundancePct: null,
    bearingCapacityKpa: null,
    certificationVerdict,
  };
}

export function buildEnvironmentTelemetry(
  side: EnvironmentSide,
  mission: MissionId,
  dataset: TerrainGridDataset | null,
  _envRef: PlanetaryEnvironmentReference | null,
  tempResult: TemperatureExperimentResult
): EnvironmentTelemetry {
  const bodyName: 'Earth' | 'Mars' | 'Moon' =
    side === 'earth' ? 'Earth' : mission === 'mission-1-mars' ? 'Mars' : 'Moon';

  const gravityMs2 =
    side === 'earth'
      ? GRAVITY_CONSTANTS.earth
      : mission === 'mission-1-mars'
        ? GRAVITY_CONSTANTS.mars
        : GRAVITY_CONSTANTS.moon;

  const atmosphere = evaluateAtmosphereExperiment(side, mission, false, 29.6);
  const pressureMbar = atmosphere.outsidePressureMbar;
  const oxygenPct = atmosphere.outsideOxygenPct;

  const validElevations = dataset?.elevations.filter((value): value is number => value !== null && Number.isFinite(value)) ?? [];
  return {
    side,
    bodyName,
    siteName: dataset?.shortName ?? tempResult.locationName,
    gravityMs2,
    gravitySource: `NASA NSSDCA ${bodyName} Fact Sheet (Published Ref)`,
    pressureMbar,
    pressureSource:
      side === 'earth'
        ? 'Approximate site scenario (educational assumption)'
        : `NASA NSSDCA ${bodyName} Fact Sheet (Published Ref)`,
    oxygenPct,
    oxygenSource:
      side === 'earth'
        ? 'Standard Earth Atmosphere (20.95% O₂)'
        : `NASA NSSDCA ${bodyName} Fact Sheet (Published Ref)`,
    temperatureCelsius: tempResult.ambientTempCelsius,
    temperatureKelvin: tempResult.ambientTempKelvin,
    temperatureSource: tempResult.datasetSource,
    temperatureTier: tempResult.dataAvailable ? tempResult.attributionTier : 'UNAVAILABLE',
    elevationMeanMeters: validElevations.length
      ? Number((validElevations.reduce((sum, value) => sum + value, 0) / validElevations.length).toFixed(1))
      : null,
    elevationRangeLabel: dataset
      ? `${dataset.stats.minElevation.toFixed(0)} to ${dataset.stats.maxElevation.toFixed(0)} m (Relief ${dataset.stats.reliefMeters.toFixed(0)} m)`
      : 'Loading...',
    elevationSource: dataset?.provenance.productId ?? 'NASA DEM',
  };
}

