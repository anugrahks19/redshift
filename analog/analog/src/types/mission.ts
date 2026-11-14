export type MissionStage =
  | 'landing'
  | 'template'
  | 'environment'
  | 'configure'
  | 'earth-sim'
  | 'transfer'
  | 'planet-sim'
  | 'challenge'
  | 'debrief';

export type MissionTemplateId =
  | 'rock-explorer'
  | 'ancient-water'
  | 'rover-engineer'
  | 'base-builder';

export type EarthEnvironmentId =
  | 'atacama'
  | 'antarctica'
  | 'iceland'
  | 'arizona';

export type VehicleType = 'rover' | 'drone' | 'lander';

export type TerrainType = 'rocky' | 'sandy' | 'steep' | 'mixed';

export type MissionObjectiveId =
  | 'geological-survey'
  | 'sample-collection'
  | 'terrain-mapping'
  | 'environmental-monitoring';

export type DestinationPlanetId = 'mars' | 'moon';

export type ComparisonFactorId =
  | 'mobility'
  | 'energy'
  | 'communication'
  | 'geology'
  | 'environment';

export type DecisionOptionId =
  | 'safer-route'
  | 'standoff-inspect'
  | 'direct-traverse';

export interface MissionConfigState {
  stage: MissionStage;
  highestReachedIndex: number;
  templateId: MissionTemplateId;
  earthEnvId: EarthEnvironmentId;
  vehicle: VehicleType;
  terrain: TerrainType;
  objective: MissionObjectiveId;
  energyAllocation: number; // Illustrative planning variable: 10..100 (default 65)
  destination: DestinationPlanetId;
  decisionId: DecisionOptionId | null;
}

export interface MissionTemplateDef {
  id: MissionTemplateId;
  code: string;
  title: string;
  supportLevel: 'full' | 'demo-preview';
  supportLabel: string;
  objectiveSummary: string;
  description: string;
  analogRelevance: string;
  recommendedVehicle: VehicleType;
  recommendedTerrain: TerrainType;
  recommendedObjective: MissionObjectiveId;
  defaultEnergy: number;
  emphasisTags: string[];
}

export interface EarthEnvironmentDef {
  id: EarthEnvironmentId;
  name: string;
  locationLabel: string;
  coordinatesLabel: string;
  environmentType: string;
  supportLevel: 'primary' | 'secondary-demo';
  supportLabel: string;
  imageUrl: string | null;
  imageAttribution: string;
  elevationSummary: string;
  climateNote: string;
  whyScientistsStudy: string;
  analogDistinction: string;
  measuredGravityMs2: number;
  measuredPressureMbar: string;
  ambientTempRangeC: string;
  terrainPalette: {
    base: string;
    ridge: string;
    skyTop: string;
    skyBottom: string;
    contour: string;
  };
}

export interface PlanetaryDestinationDef {
  id: DestinationPlanetId;
  name: string;
  siteName: string;
  supportLevel: 'full' | 'secondary-demo';
  supportLabel: string;
  tagline: string;
  imageUrl: string | null;
  imageAttribution: string;
  transferDistanceLabel: string;
  transferDurationNote: string;
  verifiedPhysics: {
    gravityMs2: number;
    gravityRelativeToEarth: string;
    surfacePressureMbar: string;
    atmosphereComposition: string;
    meanTemperatureC: string;
    diurnalSwingNote: string;
    signalDelayOneWay: string;
    verticalDatum: string;
    sourceNote: string;
  };
  environmentHighlights: string[];
  limitations: string[];
  palette: {
    surfaceTint: string;
    atmosphereHaze: string;
    ridge: string;
    contour: string;
  };
}

export interface ComparisonFactorItem {
  id: ComparisonFactorId;
  label: string;
  earthTitle: string;
  earthSummary: string;
  marsTitle: string;
  marsSummary: string;
  moonTitle: string;
  moonSummary: string;
  scienceDetail: string;
  scienceSourceNote: string;
}

export interface SimulationWaypoint {
  id: string;
  label: string;
  xFrac: number; // 0..1 across footprint
  yFrac: number; // 0..1 across footprint
  phaseIndex: number;
  title: string;
  finding: string;
  dataTag: 'ILLUSTRATIVE TARGET';
}

export interface MissionDecisionOption {
  id: DecisionOptionId;
  code: string;
  title: string;
  actionSummary: string;
  illustrativeEnergyDelta: number;
  illustrativeTimeCost: string;
  advantages: string[];
  disadvantages: string[];
}

export interface MissionAssessmentResult {
  energyMarginLabel: 'Comfortable' | 'Balanced' | 'Tight' | 'Critical';
  illustrativeReserveAfterOps: number;
  aerodynamicNote: string;
  aerodynamicBlocked: boolean;
  mobilityAssessment: string;
  commsModeLabel: string;
  primaryOperationalChallenge: string;
  decisionOutcomeHeadline: string;
  decisionExplanation: string;
  missionStatus: 'Mission Objectives Achieved' | 'Completed with Trade-offs' | 'Constrained / Partial Survey';
}

