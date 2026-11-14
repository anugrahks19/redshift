export type ValueKind = 'measured' | 'derived' | 'qualitative';

export interface ScientificSource {
  id: string;
  institution: string;
  title: string;
  url: string;
  date: string;
  sourceType: 'DEM Dataset' | 'Orbital Mosaic' | 'Peer-Reviewed Publication' | 'Planetary Archive' | 'Reference Sheet';
}

export interface PlanetaryCharacteristic {
  id: string;
  label: string;
  value: string;
  unit?: string;
  kind: ValueKind;
  sourceId: string;
  limitation: string;
}

export interface PlanetaryTargetProfile {
  id: 'earth' | 'moon' | 'mars';
  name: string;
  bodyType: string;
  tagline: string;
  accentColor: string;
  summary: string;
  explorationRelevance: string;
  characteristics: PlanetaryCharacteristic[];
  geologicalContext: string;
  limitations: string[];
  sourceIds: string[];
}

export type AnalogCategory =
  | 'Arid Desert'
  | 'Volcanic Landscape'
  | 'Polar & Glacial'
  | 'Impact Terrain'
  | 'Subsurface & Cave'
  | 'Acidic Fluvial';

export type EstablishmentStatus = 'Established Analog Site' | 'Proposed / Thematic Candidate';

export interface SiteParameterEntry {
  category:
    | 'Geological'
    | 'Terrain'
    | 'Environmental'
    | 'Resource'
    | 'Accessibility'
    | 'Mission Suitability';
  label: string;
  value: string | null; // null explicitly marks MISSING / UNAVAILABLE data per PRD 2.5
  note?: string;
}

export interface SiteCriteriaScores {
  mineralogyChemistry: number; // 0-100 qualitative/published affinity
  slopeTrafficability: number;
  aridityVolatility: number;
  fieldLogisticsAccess: number;
  habSubsurfaceAnalog: number;
}

export interface AnalogSiteProfile {
  id: string;
  name: string;
  region: string;
  country: string;
  category: AnalogCategory;
  establishmentStatus: EstablishmentStatus;
  planetaryApplication: string;
  coordinates: {
    lat: number;
    lon: number;
    display: string;
    generalizedNote: string;
  };
  elevationRange: string;
  targetPlanets: ('Mars' | 'Moon')[];
  hasLocalDem: boolean;
  terrainDatasetId?: string;
  imageUrl?: string;
  imageAttribution?: string;
  terrainCharacteristics: string[];
  geologicalContext: string;
  environmentalCharacteristics: string[];
  researchQuestions: string[];
  limitations: string[];
  sourceIds: string[];
  parameters?: SiteParameterEntry[];
  criteriaProfile?: SiteCriteriaScores;
}

export interface PlanetaryRegionTarget {
  id: string;
  planet: 'Mars' | 'Moon';
  name: string;
  shortName: string;
  coordinatesDisplay: string;
  lat: number;
  lon: number;
  mapX: number; // 0..100 SVG map X percent
  mapY: number; // 0..100 SVG map Y percent
  elevationSummary: string;
  slopeSummary: string;
  mineralogySummary: string;
  volatileSummary: string;
  illuminationSummary: string;
  hasLocalDem: boolean;
  terrainDatasetId?: 'mars-gale-murray-30m' | 'mars-gale-bradbury-30m';
  imageUrl?: string;
  scientificFocus: string;
  recommendedEarthSiteIds: string[];
  limitations: string[];
  parameters: SiteParameterEntry[];
}


