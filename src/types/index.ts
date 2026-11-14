export type Planet = 'MOON' | 'MARS' | 'EARTH';

export type ExperienceMode = 'EXPLORE' | 'LEARN' | 'RESEARCH';

export type ResearchObjectiveId = 
  | 'GEOLOGY' 
  | 'ROVER_MOBILITY' 
  | 'INSTRUMENT_TESTING' 
  | 'ASTROBIOLOGY' 
  | 'ISRU_RESOURCES' 
  | 'HUMAN_OPERATIONS';

export interface ResearchObjective {
  id: ResearchObjectiveId;
  title: string;
  shortTitle: string;
  tagline: string;
  description: string;
  primaryVariables: string[];
  recommendedPlanet: Planet | 'BOTH';
  icon: string;
}

export type ReadinessTier = 
  | 'TIER_1_IMMEDIATE' 
  | 'TIER_2_EXPEDITION' 
  | 'TIER_3_BENCHMARK';

export interface AnalogSite {
  id: string;
  name: string;
  shortCode: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  planetTarget: Planet;
  targetFeatureName: string;
  environmentType: 'VOLCANIC' | 'IMPACT_CRATER' | 'POLAR_DESERT' | 'HYPER_ARID' | 'LAVA_TUBE' | 'LACUSTRINE_MAAR';
  
  // Physical measurements
  elevationMeters: number;
  meanSlopeDeg: number;
  maxSlopeDeg: number;
  roughnessRa: number; // in meters (RMS)
  meanTempC: number;
  diurnalTempDeltaC: number;
  primaryLithology: string;
  keyMinerals: string[];

  // Comparative planetary correspondence
  targetElevationMeters: number;
  targetSlopeDeg: number;
  targetRoughnessRa: number;
  targetMeanTempC: number;
  targetMinerals: string[];

  // Evidence & limits
  analogyStrengths: string[];
  analogyLimitations: string[];
  scientificFidelity: number; // 0 - 100
  fieldFeasibility: number;    // 0 - 100
  readinessTier: ReadinessTier;
  readinessRationale: string;

  // Logistics & Field feasibility
  permitAuthority: string;
  travelDifficulty: 'ACCESSIBLE' | 'MODERATE' | 'EXPEDITION_GRADE';
  seasonalWindow: string;
  hazards: string[];
  
  // Open data provenance
  missions: string[];
  datasets: string[];
  resolutionInfo: string;
  imageThumbnail: string;
  quote: string;
}

export interface PlanetaryTarget {
  id: string;
  name: string;
  planet: Planet;
  coordinates: string;
  geologicFeature: string;
  missionRelevance: string;
  primaryInstruments: string[];
}

