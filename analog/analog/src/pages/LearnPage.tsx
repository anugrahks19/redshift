import { TerrainComparisonCurtain } from '../components/Shared/TerrainComparisonCurtain';
import expandedAnalogSites from '../data/terraformAnalogSites.json';
import { FieldLabTerrainMap } from '../components/Explore/FieldLabTerrainMap';
import type { RankedAnalogue } from '../services/analogRanking.mjs';
import { createTemperatureSampler } from '../services/thermalSampling.mjs';
import { discoverEarthAnalogues } from '../services/analogDiscoveryService';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import {
  AlertTriangle,
  ArrowRight,
  Download,
  FileText,
  Filter,
  Info,
  Layers,
  Maximize2,
  RotateCcw,
  Sun,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { usePlatformContext } from '../context/PlatformContext';
import { ANALOG_SITES } from '../data/analogSites';
import { PLANETARY_REGIONS } from '../data/planetaryRegions';
import { SOURCE_REGISTRY } from '../data/sourceRegistry';
import {
  computeDerivedTerrain,
  extractTransect,
  inspectGridCell,
} from '../services/geospatialService';
import {
  loadDivinerPcpDataset,
  loadMarsTesThermalDataset,
  loadModisLstDataset,
  loadMoonGlobalThermalDataset,
  loadTerrainDataset,
  type DivinerPcpDataset,
  type ModisLstDataset,
  type Section9ThermalBundle,
} from '../services/terrainDataService';
import type { AnalogSiteProfile, PlanetaryRegionTarget } from '../types/dataset';
import type {
  DerivedTerrainGrid,
  TerrainGridDataset,
  TerrainSampleInspection,
  TransectPreset,
} from '../types/terrain';

// ============================================================================
// SCIENTIFIC MAPPING LAYERS (9 Selectable Layers)
// ============================================================================
export type TerraformLayerId =
  | 'elevation'
  | 'slope'
  | 'roughness'
  | 'morphology'
  | 'craters'
  | 'temperature'
  | 'solar'
  | 'shadows'
  | 'surface';

interface TerraformLayerConfig {
  id: TerraformLayerId;
  label: string;
  shortLabel: string;
  unit: string;
  category: 'Topographic' | 'Geomorphic' | 'Illumination & Thermal' | 'Compositional';
  derivationBadge: 'MEASURED DEM' | 'DERIVED 3×3' | 'SOLAR MODEL' | 'ORBITAL / ASSAY';
  summary: string;
  scientificContext: string;
  earthDatasetRef: string;
  moonDatasetRef: string;
  marsDatasetRef: string;
  legendStops: { color: string; label: string }[];
}

const TERRAFORM_LAYERS: TerraformLayerConfig[] = [
  {
    id: 'elevation',
    label: 'Elevation',
    shortLabel: 'Elevation',
    unit: 'm (datum-relative)',
    category: 'Topographic',
    derivationBadge: 'MEASURED DEM',
    summary: 'Orthometric / areoid surface height with 25 m minor and 100 m index topographic contours.',
    scientificContext:
      'Compare local relief and landform geometry, never raw elevation numbers across planets: Earth references the EGM2008 geoid whereas Mars references the MOLA Areoid and the Moon references a 1,737.4 km sphere.',
    earthDatasetRef: 'ESA Copernicus DEM GLO-30 (30 m) / NASA SRTM',
    moonDatasetRef: 'NASA LRO LOLA Global LDEM (118 m / polar stereo)',
    marsDatasetRef: 'USGS Gale Merged DEM (1 m → 30 m) / NASA MGS MOLA',
    legendStops: [
      { color: '#54342A', label: 'Low Basin' },
      { color: '#884C36', label: 'Lower Plain' },
      { color: '#BA6C44', label: 'Mid Pediment' },
      { color: '#DA9A68', label: 'Upper Slope' },
      { color: '#EECEA8', label: 'High Ridge / Rim' },
    ],
  },
  {
    id: 'slope',
    label: 'Slope',
    shortLabel: 'Slope',
    unit: '° (degrees)',
    category: 'Topographic',
    derivationBadge: 'DERIVED 3×3',
    summary: 'Horn (1981) 3×3 finite-difference surface gradient in dimensionless degrees.',
    scientificContext:
      'Slope is datum-invariant and directly comparable at matching 30 m grid spacing. Rover trafficability typically degrades above 15° on unconsolidated regolith and becomes hazardous above 20°–25°.',
    earthDatasetRef: 'Derived from Copernicus GLO-30 (Horn 3×3 gradient)',
    moonDatasetRef: 'LRO LOLA / NAC Stereo Slope Maps (literature)',
    marsDatasetRef: 'Derived from USGS Gale Merged 30 m DEM (Horn 3×3)',
    legendStops: [
      { color: '#286A91', label: '0°–3° Flat' },
      { color: '#327F79', label: '3°–10° Gentle' },
      { color: '#C28B38', label: '10°–20° Moderate' },
      { color: '#B64A34', label: '>20° Steep Hazard' },
    ],
  },
  {
    id: 'roughness',
    label: 'Surface Roughness',
    shortLabel: 'Roughness',
    unit: 'm (TRI 90×90 m)',
    category: 'Topographic',
    derivationBadge: 'DERIVED 3×3',
    summary: 'Riley TRI uses the square root of the summed squared differences with eight neighbors.',
    scientificContext:
      'Quantifies 30 m–90 m decameter undulation for landing ellipse hazard assessment. Sub-meter boulder roughness requires HiRISE (25 cm) or C-band SAR backscatter (CSA RADARSAT / ESA Sentinel-1).',
    earthDatasetRef: 'Copernicus GLO-30 TRI + CSA RADARSAT-1 / Sentinel-1 SAR',
    moonDatasetRef: 'LRO LOLA RMS Roughness & Mini-RF Radar',
    marsDatasetRef: 'USGS Gale 30 m TRI + HiRISE Boulder Fields',
    legendStops: [
      { color: '#1E3A52', label: '<1.0 m Smooth' },
      { color: '#327F79', label: '1–3 m Low TRI' },
      { color: '#C28B38', label: '3–7 m Rugged' },
      { color: '#ECE0C6', label: '>7 m Dissected' },
    ],
  },
  {
    id: 'morphology',
    label: 'Terrain Morphology',
    shortLabel: 'Morphology',
    unit: 'Landform Class',
    category: 'Geomorphic',
    derivationBadge: 'DERIVED 3×3',
    summary: 'Geomorphometric classification combining local slope gradient, relative relief position, and curvature.',
    scientificContext:
      'Separates planar basin floors/playas (<3°), gentle alluvial pediments (3°–8°), dissected fan/cuesta slopes (8°–16°), and steep scarps, buttes, or crater walls (>16°).',
    earthDatasetRef: 'Copernicus GLO-30 Geomorphometry + Sentinel-2 Optical',
    moonDatasetRef: 'LROC WAC/NAC Geomorphic Units (Highland / Mare / Rim)',
    marsDatasetRef: 'USGS Gale DEM + CTX / HiRISE Structural Mapping',
    legendStops: [
      { color: '#244B5A', label: 'Basin Floor (<3°)' },
      { color: '#3D7A68', label: 'Pediment / Fan (3°–8°)' },
      { color: '#B58338', label: 'Dissected Slope (8°–16°)' },
      { color: '#C85A3A', label: 'Scarp / Butte / Rim (>16°)' },
    ],
  },
  {
    id: 'craters',
    label: 'Crater Distribution',
    shortLabel: 'Craters & Rims',
    unit: 'Rim / Depression Index',
    category: 'Geomorphic',
    derivationBadge: 'ORBITAL / ASSAY',
    summary: 'Local topographic depressions, enclosed rim crests, and cataloged impact/volcanic structures.',
    scientificContext:
      'Impact cratering dominates lunar and Martian stratigraphy. On Earth, preserved craters (Haughton, Tswaing) and volcanic collapse pits/calderas (Askja) provide structural analogs for rim ingress and ejecta traverses.',
    earthDatasetRef: 'CSA RADARSAT Haughton Crater SAR + Copernicus DEM',
    moonDatasetRef: 'LROC NAC/WAC & LOLA Crater Catalog (Shackleton / Marius)',
    marsDatasetRef: 'HiRISE / CTX Impact Crater & Butte Rim Registry',
    legendStops: [
      { color: '#1B2430', label: 'Unmodified Plain' },
      { color: '#3B6E8C', label: 'Local Depression / Floor' },
      { color: '#D99B38', label: 'Ejecta / Rim Flank' },
      { color: '#F06449', label: 'Steep Crater / Pit Rim' },
    ],
  },
  {
    id: 'temperature',
    label: 'Surface Temperature',
    shortLabel: 'Temperature',
    unit: '°C (diurnal skin model)',
    category: 'Illumination & Thermal',
    derivationBadge: 'SOLAR MODEL',
    summary: 'Surface skin temperature distribution combining published orbital radiometry with solar-incidence & elevation modulation.',
    scientificContext:
      'LRO Diviner records <40 K (-233 °C) in Lunar South Pole permanently shadowed regions (PSRs), while Mars THEMIS/REMS spans -90 °C to 0 °C in Gale Crater. Earth analogs test thermal shock or permafrost stability within terrestrial atmospheric bounds.',
    earthDatasetRef: 'NASA MODIS / ECOSTRESS LST + Field Weather Stations',
    moonDatasetRef: 'NASA LRO Diviner Lunar Radiometer Experiment (PDS)',
    marsDatasetRef: 'Mars Odyssey THEMIS Thermal IR + Curiosity REMS',
    legendStops: [
      { color: '#1A365D', label: 'Cryogenic / Shadowed' },
      { color: '#2B6CB0', label: 'Cold Sub-Zero' },
      { color: '#48BB78', label: 'Temperate / Mid' },
      { color: '#DD6B20', label: 'Sunlit Warm' },
      { color: '#E53E3E', label: 'Peak Thermal Load' },
    ],
  },
  {
    id: 'solar',
    label: 'Solar Exposure',
    shortLabel: 'Solar Exposure',
    unit: 'W/m² (instantaneous)',
    category: 'Illumination & Thermal',
    derivationBadge: 'SOLAR MODEL',
    summary: 'Cosine solar irradiance modeled from adjustable Solar Elevation and Azimuth against 3×3 surface normals.',
    scientificContext:
      'Controls solar array power generation, thermal cycling, and photolytic surface reactions. Adjust the Solar Elevation slider down to 1.5° to simulate Lunar South Pole grazing sunlight.',
    earthDatasetRef: 'NASA POWER / CERES Solar Irradiance + DEM Cosine Model',
    moonDatasetRef: 'LRO LOLA Polar Illumination Maps (~1,361 W/m² peak)',
    marsDatasetRef: 'MSL REMS UV/Solar Sensor (~590 W/m² peak equatorial)',
    legendStops: [
      { color: '#0F172A', label: '0–100 W/m² Oblique' },
      { color: '#1E4E68', label: '100–300 W/m² Low' },
      { color: '#388E7C', label: '300–600 W/m² Moderate' },
      { color: '#D69E2E', label: '600–950 W/m² High' },
      { color: '#F6E05E', label: 'Peak Direct Sun' },
    ],
  },
  {
    id: 'shadows',
    label: 'Shadow Patterns',
    shortLabel: 'Shadows',
    unit: 'Horizon Cast + Grazing',
    category: 'Illumination & Thermal',
    derivationBadge: 'SOLAR MODEL',
    summary: 'Directional ray-marched cast shadows and self-shadowed facets at the active solar elevation angle.',
    scientificContext:
      'At low solar elevations (<5°–10°), crater walls and buttes cast kilometer-scale shadows that block direct solar power, chill electronics, and obscure visual navigation hazards.',
    earthDatasetRef: 'Copernicus GLO-30 Ray-Cast Horizon Shadowing',
    moonDatasetRef: 'LRO LOLA / Diviner Permanently Shadowed Regions (PSR)',
    marsDatasetRef: 'USGS Gale 30 m DEM Ray-Cast Shadow Mask',
    legendStops: [
      { color: '#06080E', label: 'Umbra / Cast Shadow' },
      { color: '#233044', label: 'Self-Shadowed Slope' },
      { color: '#64748B', label: 'Grazing Penumbra (<12°)' },
      { color: '#E2E8F0', label: 'Directly Illuminated' },
    ],
  },
  {
    id: 'surface',
    label: 'Surface Characteristics',
    shortLabel: 'Surface & Minerals',
    unit: 'Lithology / Hydration',
    category: 'Compositional',
    derivationBadge: 'ORBITAL / ASSAY',
    summary: 'Surface mineralogy, regolith maturity, and hydrated phase distribution mapped from spectroscopy and field cores.',
    scientificContext:
      'Links topographic strata to composition: smectite phyllosilicates and sulfates in Gale Crater & Yungay (Azua-Bustos et al. 2020), ilmenite basalts in Mare Tranquillitatis & Mauna Kea, and impact breccias in Haughton Crater.',
    earthDatasetRef: 'ESA Sentinel-2 SWIR + Azua-Bustos et al. (2020) XRD',
    moonDatasetRef: 'LROC WAC TiO₂ / M³ Hydroxyl / Lunar Sample Compendium',
    marsDatasetRef: 'MRO CRISM Hyperspectral + Curiosity CheMin XRD',
    legendStops: [
      { color: '#3B526B', label: 'Basaltic / Mafic Sand' },
      { color: '#2F857A', label: 'Hydrated Smectite / Clay' },
      { color: '#C68B3C', label: 'Sulfate / Evaporite Crust' },
      { color: '#A8553A', label: 'Ferric / Hematite Ridge' },
    ],
  },
];

// ============================================================================
// REGIONAL GEOLOGICAL FEATURES & ORBITAL WAYPOINTS (Real Coordinates & Literature)
// ============================================================================
interface RegionalFeaturePoint {
  id: string;
  name: string;
  type: 'Crater / Rim' | 'Stratigraphic Unit' | 'Landing / Rover Zone' | 'Thermal / Volatile Trap';
  normX: number; // 0..1 on canvas
  normY: number; // 0..1 on canvas
  coordsLabel: string;
  elevationLabel: string;
  slopeLabel: string;
  tempLabel: string;
  mineralLabel: string;
  observation: string;
  source: string;
}

const REGION_FEATURES: Record<string, RegionalFeaturePoint[]> = {
  'gale-murray': [
    {
      id: 'gm-vera-rubin',
      name: 'Vera Rubin Ridge (Hematite Cuesta)',
      type: 'Stratigraphic Unit',
      normX: 0.56,
      normY: 0.62,
      coordsLabel: '4.72°S, 137.39°E',
      elevationLabel: '-4,140 m (MOLA)',
      slopeLabel: '14.2°–26.5° scarp',
      tempLabel: '-78 °C to -4 °C',
      mineralLabel: 'Crystalline gray/red hematite + phyllosilicates',
      observation: 'Erosion-resistant diagenetic ridge where Curiosity drilled Stoer, Highfield, and Rock Hall samples.',
      source: 'USGS Gale Merged DEM 1m v3 / MRO CRISM / MSL PDS',
    },
    {
      id: 'gm-murray-buttes',
      name: 'Murray Buttes Caprock Scarps',
      type: 'Crater / Rim',
      normX: 0.34,
      normY: 0.44,
      coordsLabel: '4.71°S, 137.36°E',
      elevationLabel: '-4,265 m (MOLA)',
      slopeLabel: '18.0°–34.8° walls',
      tempLabel: '-84 °C to -2 °C',
      mineralLabel: 'Cross-bedded Stimson eolian sandstone over Murray mudstone',
      observation: 'Steep mesas casting sharp morning/afternoon shadows; key benchmark for rover hazard avoidance.',
      source: 'HiRISE 25 cm Orthophoto / USGS Gale 30 m DEM',
    },
    {
      id: 'gm-clay-glen',
      name: 'Glen Torridon Smectite Trough',
      type: 'Thermal / Volatile Trap',
      normX: 0.68,
      normY: 0.74,
      coordsLabel: '4.74°S, 137.40°E',
      elevationLabel: '-4,095 m (MOLA)',
      slopeLabel: '2.4°–6.8° trough',
      tempLabel: '-82 °C to -5 °C',
      mineralLabel: 'Fe/Mg-smectite clay mudstones (up to ~25–30 wt% clay)',
      observation: 'Primary Mars target compared against Yungay subsurface wet smectite horizons.',
      source: 'MRO CRISM / Curiosity CheMin & SAM (NASA PDS)',
    },
  ],
  'gale-bradbury': [
    {
      id: 'gb-landing',
      name: 'Bradbury Landing (MSL Touchdown)',
      type: 'Landing / Rover Zone',
      normX: 0.48,
      normY: 0.52,
      coordsLabel: '4.5895°S, 137.4417°E',
      elevationLabel: '-4,501 m (MOLA)',
      slopeLabel: '1.2°–3.4° plain',
      tempLabel: '-90 °C to -2 °C',
      mineralLabel: 'Basaltic eolian sand & fluvial pebble conglomerate',
      observation: 'Low-slope distal alluvial apron of Peace Vallis; sky-crane thruster scour exposed rounded fluvial gravels.',
      source: 'USGS Gale Merged DEM / MSL Navcam & Mastcam',
    },
    {
      id: 'gb-yellowknife',
      name: 'Yellowknife Bay (Sheepbed Mudstone)',
      type: 'Stratigraphic Unit',
      normX: 0.62,
      normY: 0.41,
      coordsLabel: '4.585°S, 137.448°E',
      elevationLabel: '-4,519 m (MOLA)',
      slopeLabel: '0.8°–4.5° basin',
      tempLabel: '-92 °C to -3 °C',
      mineralLabel: 'Saponite/smectite clay (~20 wt%), magnetite, Ca-sulfate veins',
      observation: 'John Klein & Cumberland drill sites confirmed an ancient neutral-pH habitable fluvio-lacustrine lakebed.',
      source: 'NASA PDS MSL CheMin / Grotzinger et al. (2014)',
    },
  ],
  'jezero-delta': [
    {
      id: 'jz-delta-front',
      name: 'Western Fan Delta Escarpment (Hawksbill Gap)',
      type: 'Stratigraphic Unit',
      normX: 0.44,
      normY: 0.54,
      coordsLabel: '18.43°N, 77.45°E',
      elevationLabel: '-2,490 m (MOLA)',
      slopeLabel: '12°–28° foreset scarp',
      tempLabel: '-85 °C to -10 °C',
      mineralLabel: 'Fe/Mg-smectite clays, Mg-carbonates, sulfate cement',
      observation: 'Truncated delta lobes deposited into ancient Lake Jezero; Perseverance cached sedimentary core tubes here.',
      source: 'Mars 2020 PIXL/SHERLOC & MRO HiRISE/CRISM (NASA PDS)',
    },
    {
      id: 'jz-seitah',
      name: 'Séítah Olivine-Carbonate Bedrock Unit',
      type: 'Thermal / Volatile Trap',
      normX: 0.61,
      normY: 0.66,
      coordsLabel: '18.36°N, 77.55°E',
      elevationLabel: '-2,560 m (MOLA)',
      slopeLabel: '4°–14° ridged floor',
      tempLabel: '-86 °C to -11 °C',
      mineralLabel: 'Coarse olivine cumulate altered by aqueous Mg-Fe carbonate',
      observation: 'Bounded by ripple fields; requires autonomous hazard navigation comparable to Askja basalt sand sheets.',
      source: 'NASA PDS Mars 2020 RIMFAX / SuperCam',
    },
  ],
  'shackleton-rim': [
    {
      id: 'sh-ridge',
      name: 'Connecting Ridge Peak (Illumination Maximum)',
      type: 'Landing / Rover Zone',
      normX: 0.52,
      normY: 0.36,
      coordsLabel: '89.45°S, 222.0°E',
      elevationLabel: '+1,380 m (LRO LOLA)',
      slopeLabel: '4°–11° ridge crest',
      tempLabel: '-68 °C to -53 °C (205–220 K)',
      mineralLabel: 'Pure ferroan anorthosite highland regolith',
      observation: 'Receives >80% annual grazing sunlight (1.5° max solar elevation), adjacent to permanently shadowed craters.',
      source: 'NASA LRO LOLA Polar DEM & LROC WAC Illumination Atlas',
    },
    {
      id: 'sh-psr-floor',
      name: 'Shackleton Interior PSR Cold Trap Floor',
      type: 'Thermal / Volatile Trap',
      normX: 0.48,
      normY: 0.58,
      coordsLabel: '89.9°S, 0.0°E (21 km dia.)',
      elevationLabel: '-4,180 m (LRO LOLA)',
      slopeLabel: '30.5° interior wall / 3° floor',
      tempLabel: '-233 °C to -183 °C (40–90 K)',
      mineralLabel: 'Anorthositic regolith + patchy cold-trapped water ice (1–2 wt%)',
      observation: 'Diviner radiometer confirms temperatures below 90 K year-round, trapping volatile H₂O molecules.',
      source: 'NASA LRO Diviner Lunar Radiometer + LOLA Albedo',
    },
  ],
  'aristarchus-marius': [
    {
      id: 'mh-skylight',
      name: 'Marius Hills Pit Skylight (Lava Tube Collapse)',
      type: 'Crater / Rim',
      normX: 0.46,
      normY: 0.49,
      coordsLabel: '14.09°N, 303.23°E',
      elevationLabel: '-1,480 m (LRO LOLA)',
      slopeLabel: '85°–90° overhang (65 m dia., ~55 m deep)',
      tempLabel: '~-20 °C cave interior vs. -173/+117 °C surface',
      mineralLabel: 'Layered Ti-mare basalt sheets & pyroclastic glass',
      observation: 'Oblique LROC NAC imaging proves sub-lunarean void space shielded from micrometeorites and GCR.',
      source: 'NASA LROC NAC Oblique Stereo & SELENE Kaguya Terrain Camera',
    },
  ],
  'mare-tranquillitatis': [
    {
      id: 'mt-statio',
      name: 'Statio Tranquillitatis & West Crater Ejecta',
      type: 'Landing / Rover Zone',
      normX: 0.58,
      normY: 0.52,
      coordsLabel: '0.674°N, 23.473°E',
      elevationLabel: '-1,910 m (LRO LOLA)',
      slopeLabel: '1.1°–4.8° mare plain',
      tempLabel: '-173 °C night to +120 °C noon',
      mineralLabel: 'High-Ti mare basalt (8–10% ilmenite FeTiO₃) & agglutinates',
      observation: 'Benchmark equatorial mare regolith for oxygen ISRU carbothermal/hydrogen reduction and wheel traction.',
      source: 'NASA LRO LROC NAC / Apollo 11 Lunar Sample Compendium',
    },
  ],
};

// ============================================================================
// EARTH ANALOG FILTER CRITERIA (Measurable Characteristics)
// ============================================================================
type CriterionKey = keyof NonNullable<AnalogSiteProfile['criteriaProfile']>;

interface AnalogFilterCriterion {
  id: CriterionKey;
  label: string;
  shortTag: string;
  threshold: number;
  description: string;
}

const ANALOG_FILTER_CRITERIA: AnalogFilterCriterion[] = [
  {
    id: 'mineralogyChemistry',
    label: 'Mineralogy & Geochemical Fidelity',
    shortTag: 'Mineralogy >=80',
    threshold: 80,
    description: 'Matches hydrated clays (smectite), sulfates (gypsum/jarosite), or basaltic tephra/ilmenite.',
  },
  {
    id: 'slopeTrafficability',
    label: 'Slope & Rover Trafficability',
    shortTag: 'Slope/Rover >=80',
    threshold: 80,
    description: 'Provides comparable basin-to-scarp slope gradients and unconsolidated regolith traction.',
  },
  {
    id: 'aridityVolatility',
    label: 'Hyperarid / Cryogenic Volatile Preservation',
    shortTag: 'Arid/Cryo >=75',
    threshold: 75,
    description: 'Extreme desiccation (<2–50 mm/yr precip) or polar permafrost cold-trapping.',
  },
  {
    id: 'habSubsurfaceAnalog',
    label: 'Subsurface Biosignature / Shelter Analog',
    shortTag: 'Subsurface >=75',
    threshold: 75,
    description: 'Preserves subsurface clay horizons, permafrost ice tables, or basaltic lava tubes.',
  },
  {
    id: 'fieldLogisticsAccess',
    label: 'High Operational Field Accessibility',
    shortTag: 'Logistics >=80',
    threshold: 80,
    description: 'Road/air access and established scientific permitting for instrument field campaigns.',
  },
];

// ============================================================================
// EARTH BASEMAP TILE SOURCES (Satellite, NASA GIBS, Topographic)
// ============================================================================
type EarthBasemapId = 'esri-imagery' | 'nasa-gibs' | 'opentopo';

const EARTH_BASEMAPS: Record<
  EarthBasemapId,
  { label: string; url: string; attribution: string; maxZoom: number; sourceTag: string }
> = {
  'esri-imagery': {
    label: 'Optical Satellite (Esri / Maxar)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    maxZoom: 17,
    sourceTag: 'Maxar / Earthstar High-Res Optical',
  },
  'nasa-gibs': {
    label: 'NASA GIBS / Worldview Blue Marble',
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
    attribution: 'NASA EOSDIS GIBS / Worldview Blue Marble Next Generation',
    maxZoom: 8,
    sourceTag: 'NASA Earthdata GIBS WMTS',
  },
  opentopo: {
    label: 'Topographic Relief & Contours (SRTM)',
    url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: © OpenStreetMap, SRTM | Map style: © OpenTopoMap',
    maxZoom: 15,
    sourceTag: 'NASA SRTM / OpenTopoMap Contours',
  },
};

// ============================================================================
// SCIENTIFIC CANVAS RENDERER FOR ALL 9 TERRAFORM LAYERS
// ============================================================================
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function sampleColorRamp(stops: [number, number, number][], t: number): [number, number, number] {
  const u = clamp01(t);
  const scaled = u * (stops.length - 1);
  const idx = Math.min(stops.length - 2, Math.floor(scaled));
  const frac = scaled - idx;
  const a = stops[idx] ?? [128, 128, 128];
  const b = stops[idx + 1] ?? [128, 128, 128];
  return [
    a[0] + (b[0] - a[0]) * frac,
    a[1] + (b[1] - a[1]) * frac,
    a[2] + (b[2] - a[2]) * frac,
  ];
}

interface TerraformCanvasRenderParams {
  dataset: TerrainGridDataset;
  derived: DerivedTerrainGrid;
  layer: TerraformLayerId;
  solarElevationDeg: number;
  solarAzimuthDeg: number;
  showContours: boolean;
  showHillshade: boolean;
  showAnnotations: boolean;
  orthophoto: HTMLImageElement | null;
  features: RegionalFeaturePoint[];
  selectedCell: { row: number; col: number } | null;
  thermalOverlay?: {
    gridCelsius: (number | null)[];
    gridWidth: number;
    gridHeight: number;
    minC: number;
    maxC: number;
  } | null;
  size?: number;
}

function thermalOverlayForGrid(dataset: TerrainGridDataset, gridCelsius: (number | null)[]) {
  const valid = gridCelsius.filter((value): value is number => value !== null);
  return valid.length ? {
    gridCelsius,
    gridWidth: dataset.gridWidth,
    gridHeight: dataset.gridHeight,
    minC: Math.min(...valid),
    maxC: Math.max(...valid),
  } : null;
}

function renderTerraformLayerToCanvas(
  params: TerraformCanvasRenderParams,
  canvas: HTMLCanvasElement
): { minMetric: number; maxMetric: number; meanMetric: number; shadowedPercent: number } {
  const {
    dataset,
    derived,
    layer,
    solarElevationDeg,
    solarAzimuthDeg,
    showContours,
    showHillshade,
    showAnnotations,
    orthophoto,
    features,
    selectedCell,
    thermalOverlay,
    size = 640,
  } = params;

  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size;
    canvas.height = size;
  }
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { minMetric: 0, maxMetric: 1, meanMetric: 0.5, shadowedPercent: 0 };

  const { gridWidth: W, gridHeight: H, cellSizeMeters, elevations, stats } = dataset;
  const minElev = stats.minElevation;
  const elevSpan = Math.max(1, stats.maxElevation - minElev);

  // Precompute ray-marched shadow mask & solar irradiance on the 128x128 grid
  const azRad = (solarAzimuthDeg * Math.PI) / 180;
  const elRad = (Math.max(1, solarElevationDeg) * Math.PI) / 180;
  // Direction toward Sun in grid coordinates (col = +East, row = +South, so North is -row)
  const sunDirCol = Math.sin(azRad);
  const sunDirRow = -Math.cos(azRad);
  const tanSunEl = Math.tan(elRad);
  const cosZ = Math.sin(elRad);
  const sinZ = Math.cos(elRad);

  const shadowGrid = new Float32Array(W * H); // 1 = in cast shadow, 0 = lit
  const solarIrradianceGrid = new Float32Array(W * H); // W/m^2
  const curvatureGrid = new Float32Array(W * H); // local Laplacian for crater/rim & morphology
  const peakFlux = dataset.planet === 'Earth' ? 1050 : dataset.planet === 'Mars' ? 590 : 1361;

  let shadowedCount = 0;
  let metricMin = Infinity;
  let metricMax = -Infinity;
  let metricSum = 0;
  let metricCount = 0;

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const idx = r * W + c;
      const z0 = elevations[idx] ?? minElev;

      // Local Laplacian curvature (positive = ridge/rim crest, negative = crater bowl/depression)
      const rU = Math.max(0, r - 1);
      const rD = Math.min(H - 1, r + 1);
      const cL = Math.max(0, c - 1);
      const cR = Math.min(W - 1, c + 1);
      const zMean4 =
        ((elevations[rU * W + c] ?? z0) +
          (elevations[rD * W + c] ?? z0) +
          (elevations[r * W + cL] ?? z0) +
          (elevations[r * W + cR] ?? z0)) *
        0.25;
      curvatureGrid[idx] = z0 - zMean4;

      // Ray-march up to 28 cells toward Sun to check horizon cast shadow
      let castShadow = 0;
      for (let step = 1; step <= 28; step++) {
        const sc = Math.round(c + sunDirCol * step);
        const sr = Math.round(r + sunDirRow * step);
        if (sc < 0 || sc >= W || sr < 0 || sr >= H) break;
        const zStep = elevations[sr * W + sc] ?? z0;
        const distM = step * cellSizeMeters;
        if (zStep - z0 > distM * tanSunEl) {
          castShadow = 1;
          break;
        }
      }
      shadowGrid[idx] = castShadow;

      // Surface normal cosine incidence
      const slopeDeg = derived.slopeDegrees[idx] ?? 0;
      const aspectDeg = derived.aspectDegrees[idx] ?? 0;
      const slopeRad = (slopeDeg * Math.PI) / 180;
      const aspectRad = (aspectDeg * Math.PI) / 180;
      const cosIncidence = Math.max(
        0,
        cosZ * Math.cos(slopeRad) + sinZ * Math.sin(slopeRad) * Math.cos(azRad - aspectRad)
      );

      if (castShadow > 0.5 || cosIncidence <= 0.02) {
        shadowedCount++;
      }

      const diffuseSky = dataset.planet === 'Earth' ? 0.14 : dataset.planet === 'Mars' ? 0.11 : 0.01;
      const directFactor = castShadow > 0.5 ? 0 : cosIncidence;
      const irradiance = peakFlux * (directFactor * (1 - diffuseSky) + diffuseSky);
      solarIrradianceGrid[idx] = irradiance;
    }
  }

  // Optionally draw orthophoto base for blending
  let orthophotoData: Uint8ClampedArray | null = null;
  if (orthophoto) {
    ctx.drawImage(orthophoto, 0, 0, size, size);
    orthophotoData = ctx.getImageData(0, 0, size, size).data;
  }

  const imgData = ctx.createImageData(size, size);
  const pixels = imgData.data;

  // Color ramps
  const ELEV_RAMP: [number, number, number][] =
    dataset.planet === 'Mars'
      ? [
          [78, 46, 36],
          [134, 74, 52],
          [184, 108, 68],
          [218, 156, 104],
          [240, 210, 172],
        ]
      : [
          [74, 92, 98],
          [118, 128, 108],
          [168, 152, 118],
          [204, 178, 138],
          [236, 218, 188],
        ];

  const SLOPE_RAMP: [number, number, number][] = [
    [36, 98, 138],
    [50, 127, 121],
    [194, 139, 56],
    [186, 68, 48],
  ];

  const ROUGH_RAMP: [number, number, number][] = [
    [26, 52, 78],
    [48, 124, 118],
    [194, 139, 56],
    [238, 226, 198],
  ];

  const TEMP_RAMP: [number, number, number][] = [
    [24, 52, 92],
    [44, 108, 168],
    [72, 168, 124],
    [216, 128, 44],
    [224, 68, 56],
  ];

  const SOLAR_RAMP: [number, number, number][] = [
    [15, 23, 42],
    [30, 78, 104],
    [56, 142, 124],
    [214, 158, 46],
    [246, 224, 94],
  ];

  for (let py = 0; py < size; py++) {
    const gy = (py / (size - 1)) * (H - 1);
    const r = Math.min(H - 1, Math.max(0, Math.round(gy)));
    for (let px = 0; px < size; px++) {
      const gx = (px / (size - 1)) * (W - 1);
      const c = Math.min(W - 1, Math.max(0, Math.round(gx)));
      const idx = r * W + c;

      const elev = elevations[idx] ?? minElev;
      const elevNorm = clamp01((elev - minElev) / elevSpan);
      const slope = derived.slopeDegrees[idx] ?? 0;
      const tri = derived.roughnessTriMeters[idx] ?? 0;
      const curv = curvatureGrid[idx] ?? 0;
      const isCastShadow = (shadowGrid[idx] ?? 0) > 0.5;
      const solarW = solarIrradianceGrid[idx] ?? 0;

      // Track summary metric for active layer
      let activeVal = elev;
      if (layer === 'slope') activeVal = slope;
      else if (layer === 'roughness') activeVal = tri;
      else if (layer === 'solar') activeVal = solarW;
      else if (layer === 'temperature') {
        const tr = Math.min((thermalOverlay?.gridHeight ?? 1) - 1, Math.floor(py * (thermalOverlay?.gridHeight ?? 1) / size));
        const tc = Math.min((thermalOverlay?.gridWidth ?? 1) - 1, Math.floor(px * (thermalOverlay?.gridWidth ?? 1) / size));
        activeVal = thermalOverlay?.gridCelsius[tr * thermalOverlay.gridWidth + tc] ?? NaN;
      } else if (layer === 'shadows') {
        activeVal = isCastShadow ? 100 : 0;
      }

      if (Number.isFinite(activeVal) && py % 4 === 0 && px % 4 === 0) {
        if (activeVal < metricMin) metricMin = activeVal;
        if (activeVal > metricMax) metricMax = activeVal;
        metricSum += activeVal;
        metricCount++;
      }

      let rgb: [number, number, number] = [128, 128, 128];

      switch (layer) {
        case 'elevation':
          rgb = sampleColorRamp(ELEV_RAMP, elevNorm);
          break;
        case 'slope':
          rgb = sampleColorRamp(SLOPE_RAMP, clamp01(slope / 28));
          break;
        case 'roughness':
          rgb = sampleColorRamp(ROUGH_RAMP, clamp01(tri / (8.5 * Math.sqrt(8))));
          break;
        case 'morphology': {
          if (slope < 3.0) rgb = [36, 75, 90]; // Planar Basin / Playa
          else if (slope < 8.0) rgb = [61, 122, 104]; // Alluvial Pediment / Apron
          else if (slope < 16.0) rgb = [181, 131, 56]; // Dissected Fan / Slope
          else rgb = [200, 90, 58]; // Scarp / Butte / Rim Wall
          break;
        }
        case 'craters': {
          if (curv < -0.65 && slope < 10) rgb = [59, 110, 140]; // Enclosed Depression / Crater Floor
          else if (curv > 0.85 || slope > 18) rgb = [240, 100, 73]; // Rim Crest / Steep Wall
          else if (Math.abs(curv) > 0.35 || slope > 9) rgb = [217, 155, 56]; // Rim Flank / Ejecta
          else rgb = [27, 36, 48]; // Unmodified Plain
          break;
        }
        case 'temperature': {
          rgb = thermalOverlay && Number.isFinite(activeVal)
            ? sampleColorRamp(TEMP_RAMP, clamp01((activeVal - thermalOverlay.minC) / Math.max(1, thermalOverlay.maxC - thermalOverlay.minC)))
            : [27, 36, 48];
          break;
        }
        case 'solar':
          rgb = sampleColorRamp(SOLAR_RAMP, clamp01(solarW / peakFlux));
          break;
        case 'shadows': {
          if (isCastShadow) rgb = [8, 12, 20];
          else if (solarW < peakFlux * 0.18) rgb = [38, 52, 74];
          else if (solarW < peakFlux * 0.42) rgb = [100, 116, 139];
          else rgb = [226, 232, 240];
          break;
        }
        case 'surface': {
          // Compositional mapping tied to elevation strata & slope
          if (slope > 15 || elevNorm > 0.72) {
            rgb = [168, 85, 58]; // Ferric / Hematite Cuesta or Volcanic Bedrock
          } else if (elevNorm < 0.34 && slope < 5) {
            rgb = [47, 133, 122]; // Hydrated Smectite / Clay Basin Horizon
          } else if (elevNorm >= 0.34 && elevNorm < 0.56) {
            rgb = [198, 139, 60]; // Sulfate / Nitrate Evaporite Crust
          } else {
            rgb = [59, 82, 107]; // Basaltic / Alluvial Sand & Gravel
          }
          break;
        }
      }

      const pIdx = (py * size + px) * 4;

      // Subtle orthophoto texture fusion (22%) when available so real orbital imagery texture remains visible
      if (orthophotoData) {
        const oLum =
          (orthophotoData[pIdx]! * 0.299 +
            orthophotoData[pIdx + 1]! * 0.587 +
            orthophotoData[pIdx + 2]! * 0.114) /
          255;
        const texMod = 0.82 + oLum * 0.36;
        rgb = [rgb[0] * texMod, rgb[1] * texMod, rgb[2] * texMod];
      }

      // Directional hillshade modulation
      if (showHillshade && layer !== 'shadows') {
        const shade = isCastShadow ? 0.46 : 0.62 + 0.52 * clamp01(solarW / peakFlux);
        rgb = [rgb[0] * shade, rgb[1] * shade, rgb[2] * shade];
      }

      // Contours (25 m minor / 100 m index)
      if (showContours) {
        const cNext = Math.min(W - 1, c + 1);
        const rNext = Math.min(H - 1, r + 1);
        const eR = elevations[r * W + cNext] ?? elev;
        const eD = elevations[rNext * W + c] ?? elev;
        const crosses100 = Math.floor(elev / 100) !== Math.floor(eR / 100) || Math.floor(elev / 100) !== Math.floor(eD / 100);
        const crosses25 = Math.floor(elev / 25) !== Math.floor(eR / 25) || Math.floor(elev / 25) !== Math.floor(eD / 25);
        if (crosses100) {
          rgb = [rgb[0] * 0.45 + 240 * 0.55, rgb[1] * 0.45 + 240 * 0.55, rgb[2] * 0.45 + 235 * 0.55];
        } else if (crosses25 && px % 2 === 0) {
          rgb = [rgb[0] * 0.72 + 210 * 0.28, rgb[1] * 0.72 + 210 * 0.28, rgb[2] * 0.72 + 210 * 0.28];
        }
      }

      pixels[pIdx] = Math.max(0, Math.min(255, Math.round(rgb[0])));
      pixels[pIdx + 1] = Math.max(0, Math.min(255, Math.round(rgb[1])));
      pixels[pIdx + 2] = Math.max(0, Math.min(255, Math.round(rgb[2])));
      pixels[pIdx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Draw coordinate graticule
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const pos = (size / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(size, pos);
    ctx.stroke();
  }

  // Draw scale bar (1.0 km = 1000m / 3840m * size)
  const kmPx = (1000 / (W * cellSizeMeters)) * size;
  const sbX = size - kmPx - 20;
  const sbY = size - 22;
  ctx.fillStyle = 'rgba(5, 7, 11, 0.78)';
  ctx.fillRect(sbX - 8, sbY - 16, kmPx + 16, 24);
  ctx.strokeStyle = '#F5F5F2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sbX, sbY - 4);
  ctx.lineTo(sbX, sbY);
  ctx.lineTo(sbX + kmPx, sbY);
  ctx.lineTo(sbX + kmPx, sbY - 4);
  ctx.stroke();
  ctx.fillStyle = '#F5F5F2';
  ctx.font = '600 10px "IBM Plex Mono", monospace';
  ctx.fillText('1.0 KM (30M DEM)', sbX + 4, sbY - 5);

  // Draw annotated geological feature markers
  if (showAnnotations && features.length > 0) {
    features.forEach((feat, i) => {
      const fx = feat.normX * size;
      const fy = feat.normY * size;
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(fx, fy, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(fx, fy, 3.5, 0, Math.PI * 2);
      ctx.fill();

      const labelText = `F${i + 1}: ${feat.name.split('(')[0]!.trim()}`;
      ctx.font = '600 10px "IBM Plex Mono", monospace';
      const tw = ctx.measureText(labelText).width;
      const lx = Math.min(size - tw - 16, Math.max(8, fx + 12));
      const ly = Math.max(20, Math.min(size - 12, fy - 6));
      ctx.fillStyle = 'rgba(5, 7, 11, 0.85)';
      ctx.fillRect(lx - 4, ly - 11, tw + 8, 15);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(lx - 4, ly - 11, tw + 8, 15);
      ctx.fillStyle = '#FDE68A';
      ctx.fillText(labelText, lx, ly);
    });
  }

  // Draw active cell inspection crosshair
  if (selectedCell) {
    const cx = ((selectedCell.col + 0.5) / W) * size;
    const cy = ((selectedCell.row + 0.5) / H) * size;
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy);
    ctx.lineTo(cx + 14, cy);
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx, cy + 14);
    ctx.stroke();
  }

  ctx.restore();

  return {
    minMetric: Number.isFinite(metricMin) ? metricMin : 0,
    maxMetric: Number.isFinite(metricMax) ? metricMax : 1,
    meanMetric: metricCount > 0 ? metricSum / metricCount : 0,
    shadowedPercent: Math.round((shadowedCount / (W * H)) * 100),
  };
}

// ============================================================================
// ORBITAL REFERENCE CANVAS RENDERER (For Moon / Jezero where 30m DEM is not bundled)
// ============================================================================
function renderOrbitalReferenceCanvas(
  region: PlanetaryRegionTarget,
  layer: TerraformLayerId,
  solarElevationDeg: number,
  solarAzimuthDeg: number,
  showAnnotations: boolean,
  baseImage: HTMLImageElement | null,
  features: RegionalFeaturePoint[],
  selectedFeatureId: string | null,
  canvas: HTMLCanvasElement
): void {
  const size = 640;
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size;
    canvas.height = size;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#090D14';
  ctx.fillRect(0, 0, size, size);

  if (baseImage) {
    ctx.save();
    // Apply subtle scientific tint corresponding to active layer
    ctx.drawImage(baseImage, 0, 0, size, size);
    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    const azRad = (solarAzimuthDeg * Math.PI) / 180;
    const sunShadeFactor = Math.max(0.32, Math.min(1.15, 0.45 + (solarElevationDeg / 65) * 0.7));

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const idx = (py * size + px) * 4;
        const lum = (d[idx]! * 0.299 + d[idx + 1]! * 0.587 + d[idx + 2]! * 0.114) / 255;

        // Directional grazing shadow emphasis when layer === 'shadows' or low sun
        const nx = (px / size - 0.5) * 2;
        const ny = (py / size - 0.5) * 2;
        const radial = Math.sqrt(nx * nx + ny * ny);
        const dirDot = nx * Math.sin(azRad) - ny * Math.cos(azRad);

        let r = d[idx]! * sunShadeFactor;
        let g = d[idx + 1]! * sunShadeFactor;
        let b = d[idx + 2]! * sunShadeFactor;

        if (layer === 'shadows') {
          const shadowThreshold = 0.42 - (solarElevationDeg / 90) * 0.28;
          if (lum < shadowThreshold) {
            r = 8;
            g = 14;
            b = 26;
          } else {
            r = lum * 235;
            g = lum * 240;
            b = lum * 248;
          }
        } else if (layer === 'temperature') {
          const tVal = clamp01(lum * sunShadeFactor + dirDot * 0.15);
          const rgb = sampleColorRamp(
            [
              [26, 54, 93],
              [43, 108, 176],
              [72, 187, 120],
              [221, 107, 32],
              [229, 62, 62],
            ],
            tVal
          );
          r = rgb[0];
          g = rgb[1];
          b = rgb[2];
        } else if (layer === 'solar') {
          const sVal = clamp01(lum * (solarElevationDeg / 45) * 0.9);
          const rgb = sampleColorRamp(
            [
              [15, 23, 42],
              [30, 78, 104],
              [56, 142, 124],
              [214, 158, 46],
              [246, 224, 94],
            ],
            sVal
          );
          r = rgb[0];
          g = rgb[1];
          b = rgb[2];
        } else if (layer === 'craters') {
          const rimHighlight = Math.abs(radial - 0.28) < 0.04 || lum > 0.72;
          if (rimHighlight) {
            r = 225;
            g = 135;
            b = 65;
          } else {
            r = lum * 120;
            g = lum * 145;
            b = lum * 170;
          }
        } else if (layer === 'surface') {
          r = lum * (region.planet === 'Mars' ? 210 : 145);
          g = lum * (region.planet === 'Mars' ? 140 : 175);
          b = lum * (region.planet === 'Mars' ? 95 : 195);
        }

        d[idx] = Math.max(0, Math.min(255, Math.round(r)));
        d[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
        d[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
      }
    }
    ctx.putImageData(imgData, 0, 0);
    ctx.restore();
  }

  // Draw coordinate graticule & polar/regional ring
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const pos = (size / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(size, pos);
    ctx.stroke();
  }

  // Banner explicitly stating orbital reference status (no fabricated 30m DEM)
  ctx.fillStyle = 'rgba(5, 7, 11, 0.86)';
  ctx.fillRect(14, 14, size - 28, 34);
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
  ctx.strokeRect(14, 14, size - 28, 34);
  ctx.fillStyle = '#FDE68A';
  ctx.font = '600 10.5px "IBM Plex Mono", monospace';
  ctx.fillText(
    `ORBITAL REFERENCE MAP (${region.planet.toUpperCase()} · ${region.shortName.toUpperCase()}) — LOCAL 30M DEM NOT BUNDLED`,
    24,
    35
  );

  // Draw feature waypoints
  if (showAnnotations) {
    features.forEach((feat, idx) => {
      const fx = feat.normX * size;
      const fy = feat.normY * size;
      const isSelected = feat.id === selectedFeatureId;

      ctx.strokeStyle = isSelected ? '#38BDF8' : '#F59E0B';
      ctx.lineWidth = isSelected ? 2.5 : 1.8;
      ctx.beginPath();
      ctx.arc(fx, fy, isSelected ? 13 : 9, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = isSelected ? '#38BDF8' : '#F59E0B';
      ctx.beginPath();
      ctx.arc(fx, fy, 4, 0, Math.PI * 2);
      ctx.fill();

      const tag = `F${idx + 1}: ${feat.name}`;
      ctx.font = '600 10.5px "IBM Plex Mono", monospace';
      const tw = ctx.measureText(tag).width;
      const lx = Math.min(size - tw - 18, Math.max(12, fx + 14));
      const ly = Math.max(66, Math.min(size - 20, fy + 4));
      ctx.fillStyle = 'rgba(5, 7, 11, 0.88)';
      ctx.fillRect(lx - 5, ly - 12, tw + 10, 17);
      ctx.strokeStyle = isSelected ? '#38BDF8' : 'rgba(255,255,255,0.28)';
      ctx.strokeRect(lx - 5, ly - 12, tw + 10, 17);
      ctx.fillStyle = isSelected ? '#BAE6FD' : '#F5F5F2';
      ctx.fillText(tag, lx, ly);
    });
  }

  ctx.restore();
}

// ============================================================================
// MAIN COMPONENT: TERRAFORM — PLANETARY ANALOG MAPPING & DISCOVERY
// ============================================================================
export const LearnPage: React.FC = () => {
  const {
    targetPlanet,
    setTargetPlanet,
    selectedPlanetaryRegionId,
    setSelectedPlanetaryRegionId,
    selectedEarthSiteId,
    setSelectedEarthSiteId,
    setSelectedMarsDatasetId,
  } = usePlatformContext();

  // Active Scientific Layer & Environmental Illumination Parameters
  const [activeLayerId, setActiveLayerId] = useState<TerraformLayerId>('elevation');
  const [solarElevationDeg, setSolarElevationDeg] = useState<number>(38);
  const [solarAzimuthDeg, setSolarAzimuthDeg] = useState<number>(315);
  const [showContours, setShowContours] = useState<boolean>(true);
  const [showHillshade, setShowHillshade] = useState<boolean>(true);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);

  // Planetary Map Viewport State (Zoom, Pan, Cell & Feature Inspection)
  const [planetZoom, setPlanetZoom] = useState<number>(1);
  const [planetPan, setPlanetPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingPlanet, setIsDraggingPlanet] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [planetCell, setPlanetCell] = useState<{ row: number; col: number }>({ row: 64, col: 64 });
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  // Earth Map Viewport State (Leaflet Satellite/GIBS vs. Local 30m DEM Canvas)
  const [earthMapMode, setEarthMapMode] = useState<'satellite' | 'dem'>('satellite');
  const [earthBasemap, setEarthBasemap] = useState<EarthBasemapId>('esri-imagery');
  const [earthCell, setEarthCell] = useState<{ row: number; col: number }>({ row: 64, col: 64 });
  const [earthZoom, setEarthZoom] = useState<number>(1);
  const [activeCriteriaFilters, setActiveCriteriaFilters] = useState<CriterionKey[]>([
    'mineralogyChemistry',
    'slopeTrafficability',
  ]);

  // Transect Cross-Section Controls
  const [transectPreset, setTransectPreset] = useState<TransectPreset>('west-east');
  const [transectSlice, setTransectSlice] = useState<number>(0.5);

  // Annotated Map Generator & SRS Modal State
  const [annotTitle, setAnnotTitle] = useState<string>(
    'NASA SPACE APPS 2026 // TERRAFORM ANALOG COMPARISON PLATE'
  );
  const [annotNote, setAnnotNote] = useState<string>(
    'Provisional terrestrial field testbed pairing for instrument calibration and geomorphometric traverse validation. Earth does not replicate planetary vacuum, radiation, or reduced gravity.'
  );
  const [includeLegendOnPlate, setIncludeLegendOnPlate] = useState<boolean>(true);
  const [includeParamsOnPlate, setIncludeParamsOnPlate] = useState<boolean>(true);
  const [includeSourcesOnPlate, setIncludeSourcesOnPlate] = useState<boolean>(true);
  const [srsModalOpen, setSrsModalOpen] = useState<boolean>(false);

  // Loaded Terrain & Thermal Datasets (Priority 5 NASA Datasets + Copernicus)
  const [earthDemId, setEarthDemId] = useState<string>('earth-yungay-nasadem-30m');
  const [discoveryWeights, setDiscoveryWeights] = useState<{
    elevation: number;
    slope: number;
    roughness: number;
    temperature: number;
  }>({ elevation: 0.20, slope: 0.25, roughness: 0.25, temperature: 0.30 });
  const [discoveryResults, setDiscoveryResults] = useState<RankedAnalogue[]>([]);
  const [discoveryError, setDiscoveryError] = useState(false);
  const [publicLayer, setPublicLayer] = useState<'imagery' | 'elevation' | 'slope' | 'roughness'>('elevation');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [discoveryRunning, setDiscoveryRunning] = useState<boolean>(false);
  const [earthData, setEarthData] = useState<TerrainGridDataset | null>(null);
  const [planetDatasets, setPlanetDatasets] = useState<Record<string, TerrainGridDataset>>({});
  const [modisData, setModisData] = useState<ModisLstDataset | null>(null);
  const [divinerData, setDivinerData] = useState<DivinerPcpDataset | null>(null);
  const [moonGlobalThermalData, setMoonGlobalThermalData] = useState<Section9ThermalBundle | null>(null);
  const [marsTesThermalData, setMarsTesThermalData] = useState<Section9ThermalBundle | null>(null);
  const [planetOrtho, setPlanetOrtho] = useState<HTMLImageElement | null>(null);
  const [earthOrtho, setEarthOrtho] = useState<HTMLImageElement | null>(null);

  // Canvas & Map Refs
  const planetCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const earthDemCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const leafletContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletTileLayerRef = useRef<L.TileLayer | null>(null);
  const leafletMarkersRef = useRef<L.LayerGroup | null>(null);

  // Load Earth DEM when earthDemId changes (NASADEM_HGT V001 30 m default)
  useEffect(() => {
    let mounted = true;
    loadTerrainDataset(earthDemId, 'REAL_DATA')
      .then((ds) => {
        if (mounted) setEarthData(ds);
      })
      .catch(() => {
        // Fallback to Copernicus if needed
      });
    return () => {
      mounted = false;
    };
  }, [earthDemId]);

  // Load all bundled Planetary DEMs (Gale, Jezero MOLA MEGDR, Moon LOLA LDEMs) + MODIS MOD11A2 + Diviner PCP on mount
  useEffect(() => {
    let mounted = true;
    const planetIds = [
      'mars-gale-murray-30m',
      'mars-gale-bradbury-30m',
      'mars-jezero-mola-megdr',
      'moon-shackleton-lola',
      'moon-marius-lola',
      'moon-tranquillitatis-lola',
    ];
    Promise.allSettled([
      ...planetIds.map((id) => loadTerrainDataset(id, 'REAL_DATA')),
      loadModisLstDataset(),
      loadDivinerPcpDataset(),
      loadMoonGlobalThermalDataset(),
      loadMarsTesThermalDataset(),
    ]).then((results) => {
      if (!mounted) return;
      const loadedMap: Record<string, TerrainGridDataset> = {};
      planetIds.forEach((id, idx) => {
        const r = results[idx];
        if (r && r.status === 'fulfilled') {
          loadedMap[id] = r.value as TerrainGridDataset;
        }
      });
      setPlanetDatasets(loadedMap);

      const modisRes = results[planetIds.length];
      if (modisRes && modisRes.status === 'fulfilled') {
        setModisData(modisRes.value as ModisLstDataset);
      }
      const divinerRes = results[planetIds.length + 1];
      if (divinerRes && divinerRes.status === 'fulfilled') {
        setDivinerData(divinerRes.value as DivinerPcpDataset);
      }
      const mgtRes = results[planetIds.length + 2];
      if (mgtRes && mgtRes.status === 'fulfilled') {
        setMoonGlobalThermalData(mgtRes.value as Section9ThermalBundle);
      }
      const mrtRes = results[planetIds.length + 3];
      if (mrtRes && mrtRes.status === 'fulfilled') {
        setMarsTesThermalData(mrtRes.value as Section9ThermalBundle);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Compute derived 3x3 Horn slope, aspect, and TRI roughness grids
  const earthDerived = useMemo(
    () => (earthData ? computeDerivedTerrain(earthData) : null),
    [earthData]
  );

  // Active planetary region & dataset resolution
  const availableRegions = useMemo(
    () => PLANETARY_REGIONS.filter((r) => r.planet === targetPlanet),
    [targetPlanet]
  );
  const activeRegion = useMemo(
    () =>
      availableRegions.find((r) => r.id === selectedPlanetaryRegionId) ??
      availableRegions[0] ??
      PLANETARY_REGIONS[0]!,
    [availableRegions, selectedPlanetaryRegionId]
  );

  const activePlanetDataset = useMemo(() => {
    if (!activeRegion.hasLocalDem || !activeRegion.terrainDatasetId) return null;
    return planetDatasets[activeRegion.terrainDatasetId] ?? null;
  }, [activeRegion, planetDatasets]);

  const activePlanetDerived = useMemo(() => {
    if (!activePlanetDataset) return null;
    const base = computeDerivedTerrain(activePlanetDataset);
    const sample = createTemperatureSampler(activePlanetDataset, null, divinerData);
    const cells = activePlanetDataset.elevations.map((_, index) =>
      sample(Math.floor(index / activePlanetDataset.gridWidth), index % activePlanetDataset.gridWidth)
    );
    return {
      ...base,
      temperatureCelsiusGrid: cells.map((cell) => cell?.celsius ?? null),
      temperatureKelvinGrid: cells.map((cell) => cell?.kelvin ?? null),
      certificationRasters: null,
    };
  }, [activePlanetDataset, divinerData]);

  const activeLayerConfig = useMemo(
    () => TERRAFORM_LAYERS.find((l) => l.id === activeLayerId) ?? TERRAFORM_LAYERS[0]!,
    [activeLayerId]
  );

  const regionFeatures = useMemo(
    () => REGION_FEATURES[activeRegion.id] ?? [],
    [activeRegion.id]
  );

  const activeFeature = useMemo(
    () => regionFeatures.find((f) => f.id === selectedFeatureId) ?? regionFeatures[0] ?? null,
    [regionFeatures, selectedFeatureId]
  );

  // Selected Earth site & filtered candidate ranking
  const activeEarthSite = useMemo(
    () => ANALOG_SITES.find((s) => s.id === selectedEarthSiteId) ?? ANALOG_SITES[0]!,
    [selectedEarthSiteId]
  );

  // Sync earthDemId whenever activeEarthSite changes
  useEffect(() => {
    if (activeEarthSite.hasLocalDem && activeEarthSite.terrainDatasetId) {
      setEarthDemId(activeEarthSite.terrainDatasetId);
    }
  }, [activeEarthSite]);

  const discoveryRequest = useRef(0);
  const runAnalogDiscovery = useCallback(
    (regionId: string, weights = discoveryWeights) => {
      setDiscoveryRunning(true);
      setDiscoveryError(false);
      const request = ++discoveryRequest.current;
      setDiscoveryResults([]);
      void discoverEarthAnalogues(regionId, weights)
        .then((results) => {
          if (request === discoveryRequest.current) setDiscoveryResults(results);
        })
        .catch(() => {
          if (request === discoveryRequest.current) setDiscoveryError(true);
        })
        .finally(() => {
          if (request === discoveryRequest.current) setDiscoveryRunning(false);
        });
    },
    [discoveryWeights]
  );

  useEffect(() => {
    runAnalogDiscovery(activeRegion.id, discoveryWeights);
  }, [activeRegion.id, discoveryWeights, runAnalogDiscovery]);

  const evaluatedCandidates = useMemo(() => {
    return ANALOG_SITES.map((site) => {
      const targetBodyMatch = site.targetPlanets.includes(targetPlanet);
      const isRecommendedForRegion = activeRegion.recommendedEarthSiteIds.includes(site.id);
      const passedCriteria = ANALOG_FILTER_CRITERIA.filter(
        (crit) =>
          activeCriteriaFilters.includes(crit.id) &&
          (site.criteriaProfile?.[crit.id] ?? 0) >= crit.threshold
      );
      const matchesAllActiveFilters =
        activeCriteriaFilters.length === 0 ||
        passedCriteria.length === activeCriteriaFilters.length;

      return {
        site,
        targetBodyMatch,
        isRecommendedForRegion,
        passedCriteriaCount: passedCriteria.length,
        matchesAllActiveFilters,
      };
    }).sort((a, b) => {
      const scoreA = discoveryResults.find((result) => result.earthSiteId === a.site.id)?.overallSimilarityScore ?? -1;
      const scoreB = discoveryResults.find((result) => result.earthSiteId === b.site.id)?.overallSimilarityScore ?? -1;
      if (scoreA !== scoreB) return scoreB - scoreA;
      if (a.isRecommendedForRegion !== b.isRecommendedForRegion) {
        return a.isRecommendedForRegion ? -1 : 1;
      }
      if (a.matchesAllActiveFilters !== b.matchesAllActiveFilters) {
        return a.matchesAllActiveFilters ? -1 : 1;
      }
      return b.passedCriteriaCount - a.passedCriteriaCount;
    });
  }, [targetPlanet, activeRegion.recommendedEarthSiteIds, activeCriteriaFilters, discoveryResults]);

  // Load planetary & Earth orthophotos for canvas fusion
  useEffect(() => {
    const imgUrl =
      activeRegion.imageUrl ??
      (activeRegion.planet === 'Moon'
        ? '/data/terrains/moon-map.jpg'
        : '/data/terrains/gale-hirise.jpg');
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!cancelled) setPlanetOrtho(img);
    };
    img.onerror = () => {
      if (!cancelled) setPlanetOrtho(null);
    };
    img.src = imgUrl;
    return () => {
      cancelled = true;
    };
  }, [activeRegion]);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!cancelled) setEarthOrtho(img);
    };
    img.onerror = () => {
      if (!cancelled) setEarthOrtho(null);
    };
    img.src = '/data/terrains/yungay-imagery.jpg';
    return () => {
      cancelled = true;
    };
  }, []);

  // Handlers for planet & region selection
  const handleSelectPlanet = (planet: 'Mars' | 'Moon') => {
    setTargetPlanet(planet);
    const firstRegion = PLANETARY_REGIONS.find((r) => r.planet === planet);
    if (firstRegion) {
      setSelectedPlanetaryRegionId(firstRegion.id);
      if (firstRegion.terrainDatasetId) {
        setSelectedMarsDatasetId(firstRegion.terrainDatasetId);
      }
      const recEarth = firstRegion.recommendedEarthSiteIds[0];
      if (recEarth) setSelectedEarthSiteId(recEarth);
      const firstFeat = REGION_FEATURES[firstRegion.id]?.[0];
      setSelectedFeatureId(firstFeat?.id ?? null);
    }
    if (planet === 'Moon' && solarElevationDeg > 15) {
      setSolarElevationDeg(6); // Highlight grazing lunar shadows by default
    } else if (planet === 'Mars' && solarElevationDeg < 15) {
      setSolarElevationDeg(38);
    }
    setPlanetZoom(1);
    setPlanetPan({ x: 0, y: 0 });
  };

  const handleSelectRegion = (regionId: string) => {
    const reg = PLANETARY_REGIONS.find((r) => r.id === regionId);
    if (!reg) return;
    setSelectedPlanetaryRegionId(regionId);
    if (reg.terrainDatasetId) {
      setSelectedMarsDatasetId(reg.terrainDatasetId);
    }
    const firstFeat = REGION_FEATURES[regionId]?.[0];
    setSelectedFeatureId(firstFeat?.id ?? null);
    setPlanetZoom(1);
    setPlanetPan({ x: 0, y: 0 });
  };

  // Render Planetary Map Canvas whenever state changes
  const [planetLayerStats, setPlanetLayerStats] = useState<{
    minMetric: number;
    maxMetric: number;
    meanMetric: number;
    shadowedPercent: number;
  }>({ minMetric: 0, maxMetric: 1, meanMetric: 0.5, shadowedPercent: 0 });

  const activeEarthModisProfile = modisData?.sites[activeEarthSite.id] ?? null;

  const activePlanetThermalOverlay = useMemo(() => {
    const grid = activePlanetDerived?.temperatureCelsiusGrid;
    return activePlanetDataset && grid ? thermalOverlayForGrid(activePlanetDataset, grid) : null;
  }, [activePlanetDataset, activePlanetDerived]);

  const activeEarthThermalOverlay = useMemo(() => {
    if (!earthData || !activeEarthModisProfile) return null;
    const sample = createTemperatureSampler(earthData, activeEarthModisProfile, null);
    const grid = earthData.elevations.map((_, index) =>
      sample(Math.floor(index / earthData.gridWidth), index % earthData.gridWidth)?.celsius ?? null
    );
    return thermalOverlayForGrid(earthData, grid);
  }, [activeEarthModisProfile, earthData]);

  useEffect(() => {
    const canvas = planetCanvasRef.current;
    if (!canvas) return;
    if (activeRegion.hasLocalDem && activePlanetDataset && activePlanetDerived) {
      const stats = renderTerraformLayerToCanvas(
        {
          dataset: activePlanetDataset,
          derived: activePlanetDerived,
          layer: activeLayerId,
          solarElevationDeg,
          solarAzimuthDeg,
          showContours,
          showHillshade,
          showAnnotations,
          orthophoto: planetOrtho,
          features: regionFeatures,
          selectedCell: planetCell,
          thermalOverlay: activePlanetThermalOverlay,
          size: 640,
        },
        canvas
      );
      setPlanetLayerStats(stats);
    } else {
      renderOrbitalReferenceCanvas(
        activeRegion,
        activeLayerId,
        solarElevationDeg,
        solarAzimuthDeg,
        showAnnotations,
        planetOrtho,
        regionFeatures,
         activeFeature?.id ?? null,
        canvas
      );
    }
  }, [
    activeRegion,
    activePlanetDataset,
    activePlanetDerived,
    activeLayerId,
    solarElevationDeg,
    solarAzimuthDeg,
    showContours,
    showHillshade,
    showAnnotations,
    planetOrtho,
    regionFeatures,
    planetCell,
    activeFeature,
    activePlanetThermalOverlay,
  ]);

  // Render Earth 30 m DEM Canvas (when in DEM mode and Yungay is selected)
  useEffect(() => {
    const canvas = earthDemCanvasRef.current;
    if (!canvas || earthMapMode !== 'dem' || !earthData || !earthDerived) return;
    renderTerraformLayerToCanvas(
      {
        dataset: earthData,
        derived: earthDerived,
        layer: activeLayerId,
        solarElevationDeg,
        solarAzimuthDeg,
        showContours,
        showHillshade,
        showAnnotations,
        orthophoto: earthOrtho,
        features: [
          {
            id: 'yg-smectite',
            name: 'Yungay Wet Smectite Trench (~30 cm)',
            type: 'Thermal / Volatile Trap',
            normX: 0.52,
            normY: 0.5,
            coordsLabel: '24.0848°S, 69.9151°W',
            elevationLabel: '1,028 m (NASADEM_HGT V001)',
            slopeLabel: '2.1° basin floor',
            tempLabel: 'Day 36.7 °C / Night 11.3 °C (MOD11A2)',
            mineralLabel: 'Smectite clay below halite/nitrate crust',
            observation: 'Azua-Bustos et al. (2020) documented metabolically active microbes in wet smectite horizon.',
            source: 'NASADEM_HGT V001 / MODIS MOD11A2 v061 / Azua-Bustos et al. (2020)',
          },
        ],
        selectedCell: earthCell,
        thermalOverlay: activeEarthThermalOverlay,
        size: 640,
      },
      canvas
    );
  }, [
    earthMapMode,
    earthData,
    earthDerived,
    activeLayerId,
    solarElevationDeg,
    solarAzimuthDeg,
    showContours,
    showHillshade,
    showAnnotations,
    earthOrtho,
    earthCell,
    activeEarthThermalOverlay,
  ]);

  // Initialize & Sync Interactive Earth Leaflet Map
  useEffect(() => {
    if (!leafletContainerRef.current || leafletMapRef.current) return;
    const map = L.map(leafletContainerRef.current, {
      center: [activeEarthSite.coordinates.lat, activeEarthSite.coordinates.lon],
      zoom: 3,
      minZoom: 2,
      maxZoom: 17,
      worldCopyJump: true,
      zoomControl: true,
    });

    // Subtle latitude/longitude graticule lines
    [-60, -30, 0, 30, 60].forEach((lat) => {
      L.polyline(
        [
          [lat, -180],
          [lat, 180],
        ],
        {
          color: 'rgba(255,255,255,0.08)',
          weight: 1,
          dashArray: lat === 0 ? undefined : '4 4',
          interactive: false,
        }
      ).addTo(map);
    });

    const bm = EARTH_BASEMAPS[earthBasemap];
    const tileLayer = L.tileLayer(bm.url, {
      attribution: bm.attribution,
      maxZoom: bm.maxZoom,
    }).addTo(map);

    const markers = L.layerGroup().addTo(map);
    leafletMapRef.current = map;
    leafletTileLayerRef.current = tileLayer;
    leafletMarkersRef.current = markers;

    window.setTimeout(() => map.invalidateSize(), 60);

    return () => {
      map.remove();
      leafletMapRef.current = null;
      leafletTileLayerRef.current = null;
      leafletMarkersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update Leaflet basemap tiles when user switches between Esri, NASA GIBS, and OpenTopoMap
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;
    if (leafletTileLayerRef.current) {
      map.removeLayer(leafletTileLayerRef.current);
    }
    const bm = EARTH_BASEMAPS[earthBasemap];
    const nextLayer = L.tileLayer(bm.url, {
      attribution: bm.attribution,
      maxZoom: bm.maxZoom,
    }).addTo(map);
    leafletTileLayerRef.current = nextLayer;
  }, [earthBasemap]);

  // Update Leaflet candidate markers & highlight rings based on measurable filter criteria
  useEffect(() => {
    const map = leafletMapRef.current;
    const markers = leafletMarkersRef.current;
    if (!map || !markers) return;

    markers.clearLayers();
    evaluatedCandidates.forEach(({ site, isRecommendedForRegion, matchesAllActiveFilters }) => {
      const isSelected = site.id === activeEarthSite.id;

      // Outer pulse ring for selected or region-recommended & filter-matched candidates
      if (isSelected || (isRecommendedForRegion && matchesAllActiveFilters)) {
        L.circleMarker([site.coordinates.lat, site.coordinates.lon], {
          radius: isSelected ? 15 : 12,
          color: isSelected ? '#F59E0B' : '#2DD4BF',
          weight: 1.5,
          fillOpacity: 0.08,
          interactive: false,
        }).addTo(markers);
      }

      const marker = L.circleMarker([site.coordinates.lat, site.coordinates.lon], {
        radius: isSelected ? 9 : matchesAllActiveFilters ? 7 : 5,
        color: isSelected ? '#FEF08A' : matchesAllActiveFilters ? '#2DD4BF' : '#94A3B8',
        weight: isSelected ? 2.5 : 1.5,
        fillColor: isSelected ? '#D97706' : matchesAllActiveFilters ? '#0F766E' : '#334155',
        fillOpacity: 0.92,
      });

      marker.bindTooltip(
        `<strong>${site.name}</strong><br/>${site.category} · ${
          site.hasLocalDem ? '30m DEM Bundled' : 'Orbital/Lit Profile'
        }<br/>${isRecommendedForRegion ? '★ Primary Target Match' : ''}`,
        { direction: 'top' }
      );
      marker.on('click', () => {
        setSelectedEarthSiteId(site.id);
      });
      marker.addTo(markers);
    });

    map.flyTo([activeEarthSite.coordinates.lat, activeEarthSite.coordinates.lon], Math.max(map.getZoom(), 4), {
      animate: true,
      duration: 0.65,
    });
  }, [evaluatedCandidates, activeEarthSite, setSelectedEarthSiteId]);

  useEffect(() => {
    if (earthMapMode === 'satellite') {
      window.requestAnimationFrame(() => leafletMapRef.current?.invalidateSize());
    }
  }, [earthMapMode]);

  // Point inspection samples on 30 m DEM grids
  const planetSample: TerrainSampleInspection | null = useMemo(() => {
    if (!activeRegion.hasLocalDem || !activePlanetDataset || !activePlanetDerived) return null;
    return inspectGridCell(
      activePlanetDataset,
      activePlanetDerived,
      planetCell.row,
      planetCell.col
    );
  }, [activeRegion.hasLocalDem, activePlanetDataset, activePlanetDerived, planetCell]);

  const earthSample: TerrainSampleInspection | null = useMemo(() => {
    if (!earthData || !earthDerived) return null;
    return inspectGridCell(earthData, earthDerived, earthCell.row, earthCell.col);
  }, [earthData, earthDerived, earthCell]);

  // Cross-section transect between Yungay & Gale Crater (when both have 30 m DEMs)
  const transectSamples = useMemo(() => {
    if (!earthData || !earthDerived || !activePlanetDataset || !activePlanetDerived) return [];
    return extractTransect(
      earthData,
      earthDerived,
      activePlanetDataset,
      activePlanetDerived,
      transectPreset,
      transectSlice
    );
  }, [earthData, earthDerived, activePlanetDataset, activePlanetDerived, transectPreset, transectSlice]);

  // Pointer interaction on Planetary Canvas (click to inspect cell/feature, drag to pan when zoomed)
  const handlePlanetCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const normX = clamp01((e.clientX - rect.left) / rect.width);
    const normY = clamp01((e.clientY - rect.top) / rect.height);

    // Check if user clicked near a regional geological feature marker
    const hitFeature = regionFeatures.find((f) => {
      const dx = f.normX - normX;
      const dy = f.normY - normY;
      return Math.sqrt(dx * dx + dy * dy) < 0.055;
    });
    if (hitFeature) {
      setSelectedFeatureId(hitFeature.id);
    }

    if (activePlanetDataset) {
      const col = Math.min(
        activePlanetDataset.gridWidth - 1,
        Math.max(0, Math.floor(normX * activePlanetDataset.gridWidth))
      );
      const row = Math.min(
        activePlanetDataset.gridHeight - 1,
        Math.max(0, Math.floor(normY * activePlanetDataset.gridHeight))
      );
      setPlanetCell({ row, col });
    }

    if (planetZoom > 1) {
      setIsDraggingPlanet(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: planetPan.x,
        panY: planetPan.y,
      };
    }
  };

  const handlePlanetCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingPlanet || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const maxPan = (planetZoom - 1) * 160;
    setPlanetPan({
      x: Math.max(-maxPan, Math.min(maxPan, dragStartRef.current.panX + dx)),
      y: Math.max(-maxPan, Math.min(maxPan, dragStartRef.current.panY + dy)),
    });
  };

  const handlePlanetCanvasPointerUp = () => {
    setIsDraggingPlanet(false);
    dragStartRef.current = null;
  };

  const handleEarthDemPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!earthData) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const col = Math.min(
      earthData.gridWidth - 1,
      Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * earthData.gridWidth))
    );
    const row = Math.min(
      earthData.gridHeight - 1,
      Math.max(0, Math.floor(((e.clientY - rect.top) / rect.height) * earthData.gridHeight))
    );
    setEarthCell({ row, col });
  };

  const toggleCriterionFilter = (id: CriterionKey) => {
    setActiveCriteriaFilters((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // ============================================================================
  // MEASURABLE PARAMETER COMPARISON TABLE DATA
  // ============================================================================
  const comparisonRows = useMemo(() => {
    const bothDem =
      activeRegion.hasLocalDem &&
      activeEarthSite.hasLocalDem &&
      activePlanetDataset &&
      activePlanetDerived &&
      earthData &&
      earthDerived;

    return [
      {
        parameter: 'Elevation Range & Datum',
        layerTag: 'Elevation',
        planetValue: activePlanetDataset
          ? `${activePlanetDataset.stats.minElevation.toFixed(1)} to ${activePlanetDataset.stats.maxElevation.toFixed(1)} m (Relief ${activePlanetDataset.stats.reliefMeters.toFixed(1)} m · ${activePlanetDataset.verticalDatum.split('(')[0]!.trim()})`
          : activeRegion.elevationSummary,
        earthValue:
          activeEarthSite.hasLocalDem && earthData
            ? `${earthData.stats.minElevation.toFixed(1)} to ${earthData.stats.maxElevation.toFixed(1)} m (Relief ${earthData.stats.reliefMeters.toFixed(1)} m · ${
                earthDemId === 'earth-yungay-nasadem-30m' ? 'NASADEM_HGT V001 EGM96' : 'Copernicus EGM2008'
              })`
            : activeEarthSite.elevationRange,
        status: 'CRITICAL DATUM DIFFERENCE',
        statusTone: 'demo' as const,
        note: 'Compare local relief span (m), never subtract absolute elevations across physically distinct planetary vertical datums.',
        source:
          activeRegion.planet === 'Mars'
            ? 'MGS MOLA MEGDR / USGS Gale 30m DEM vs. NASA NASADEM_HGT V001 (30 m)'
            : 'NASA LRO LOLA LDEM (LDEM_75S_30M / LDEM_64) vs. NASA NASADEM_HGT V001 (30 m)',
      },
      {
        parameter: 'Slope Gradient (Horn 3×3)',
        layerTag: 'Slope',
        planetValue: bothDem
          ? `Mean ${activePlanetDerived.slopeStats.mean.toFixed(2)}° · P90 ${activePlanetDerived.slopeStats.p90.toFixed(2)}° · Max ${activePlanetDerived.slopeStats.max.toFixed(1)}°`
          : activeRegion.slopeSummary,
        earthValue:
          activeEarthSite.hasLocalDem && earthDerived
            ? `Mean ${earthDerived.slopeStats.mean.toFixed(2)}° · P90 ${earthDerived.slopeStats.p90.toFixed(2)}° · Max ${earthDerived.slopeStats.max.toFixed(1)}°`
            : activeEarthSite.parameters?.find((p) => p.label === 'Slope & Surface')?.value ??
              'Literature profile only (no local 30 m DEM)',
        status: bothDem ? 'MEASURED 30M PARITY' : 'LITERATURE / ORBITAL',
        statusTone: bothDem ? ('real' as const) : ('blue' as const),
        note: bothDem
          ? `Direct 30 m datum-invariant comparison: Δ Mean Slope = ${Math.abs(
              earthDerived.slopeStats.mean - activePlanetDerived.slopeStats.mean
            ).toFixed(2)}°.`
          : 'Quantitative Horn 3×3 slope requires paired 30 m DEMs; regional slope bounds cited from orbital literature.',
        source: 'Horn (1981) 3×3 finite difference on 30 m DEM / LOLA / HiRISE',
      },
      {
        parameter: 'Surface Roughness (TRI 90×90 m)',
        layerTag: 'Roughness',
        planetValue: bothDem
          ? `Mean ${activePlanetDerived.roughnessStats.mean.toFixed(2)} m · P90 ${activePlanetDerived.roughnessStats.p90.toFixed(2)} m (30 m grid)`
          : 'Local 30 m TRI unavailable (orbital radar / stereo literature)',
        earthValue:
          activeEarthSite.hasLocalDem && earthDerived
            ? `Mean ${earthDerived.roughnessStats.mean.toFixed(2)} m · P90 ${earthDerived.roughnessStats.p90.toFixed(2)} m (30 m grid)`
            : 'Local 30 m TRI unavailable (CSA RADARSAT / Sentinel-1 SAR context)',
        status: bothDem ? 'MEASURED 30M PARITY' : 'DATA GAP / SAR CONTEXT',
        statusTone: bothDem ? ('real' as const) : ('slate' as const),
        note: '30 m TRI resolves decameter undulations; sub-meter boulders require HiRISE (25 cm) or C-band SAR backscatter.',
        source: 'Riley et al. (1999) TRI / CSA RADARSAT-1 & ESA Sentinel-1',
      },
      {
        parameter: 'Terrain Morphology & Crater Rims',
        layerTag: 'Morphology / Craters',
        planetValue:
          activeRegion.parameters.find((p) => p.label === 'Primary Formations')?.value ??
          activeRegion.scientificFocus,
        earthValue:
          activeEarthSite.parameters?.find((p) => p.label === 'Primary Formations')?.value ??
          activeEarthSite.terrainCharacteristics[0] ??
          '',
        status: 'GEOMORPHIC ANALOGY',
        statusTone: 'real' as const,
        note: 'Matches structural landforms (alluvial fans, mudstone buttes, impact breccia rims, or basaltic skylights).',
        source: 'NASA PDS CTX/HiRISE / LROC NAC / Field Geomorphology',
      },
      {
        parameter: 'Surface Mineralogy & Regolith',
        layerTag: 'Surface',
        planetValue: activeRegion.mineralogySummary,
        earthValue:
          activeEarthSite.parameters?.find((p) => p.label === 'Rock Composition')?.value ??
          activeEarthSite.geologicalContext,
        status: 'MINERALOGICAL ANALOGY',
        statusTone: 'real' as const,
        note: 'Validates XRD, Raman, LIBS, and drill bit wear in analogous clay, sulfate, or basaltic matrices.',
        source: 'MRO CRISM / Curiosity CheMin / Sentinel-2 / Azua-Bustos et al. (2020)',
      },
      {
        parameter: 'Surface Temperature Regime',
        layerTag: 'Temperature',
        planetValue:
          activeRegion.id === 'shackleton-rim' && divinerData
            ? `${divinerData.stats.minCelsius.toFixed(1)} °C (${divinerData.stats.minKelvin.toFixed(1)} K PSR) to ${divinerData.stats.maxCelsius.toFixed(1)} °C (${divinerData.stats.maxKelvin.toFixed(1)} K ridge · Diviner PCP)`
            : activeRegion.planet === 'Moon' && moonGlobalThermalData?.regions?.[activeRegion.id]
              ? `${(moonGlobalThermalData.regions[activeRegion.id]!.stats.nightTempK.mean - 273.15).toFixed(1)} °C night to ${(moonGlobalThermalData.regions[activeRegion.id]!.stats.dayTempK.mean - 273.15).toFixed(1)} °C day (Mean ${moonGlobalThermalData.regions[activeRegion.id]!.stats.meanTempK.mean.toFixed(1)} K · LRO Diviner GDR)`
              : activeRegion.planet === 'Mars' && marsTesThermalData?.regions?.[activeRegion.id]
                ? `${(marsTesThermalData.regions[activeRegion.id]!.stats.nightTempK.mean - 273.15).toFixed(1)} °C night to ${(marsTesThermalData.regions[activeRegion.id]!.stats.dayTempK.mean - 273.15).toFixed(1)} °C day (TI ${marsTesThermalData.regions[activeRegion.id]!.stats.thermalInertia?.mean.toFixed(0)} · MGS TES)`
                : activeRegion.parameters.find((p) => p.label === 'Surface Temp Range')?.value ??
                  (activeRegion.planet === 'Mars' ? '-90 °C to 0 °C' : '-233 °C to +120 °C'),
        earthValue:
          activeEarthModisProfile &&
          activeEarthModisProfile.dayStatsCelsius.mean !== null &&
          activeEarthModisProfile.nightStatsCelsius.mean !== null
            ? `MODIS MOD11A2 Day Mean ${activeEarthModisProfile.dayStatsCelsius.mean.toFixed(1)} °C [${activeEarthModisProfile.dayStatsCelsius.min?.toFixed(1)}..${activeEarthModisProfile.dayStatsCelsius.max?.toFixed(1)} °C] · Night Mean ${activeEarthModisProfile.nightStatsCelsius.mean.toFixed(1)} °C`
            : activeEarthSite.parameters?.find((p) => p.label === 'Surface Temp Range')?.value ??
              '-4 °C to +42 °C',
        status: 'ENVIRONMENTAL DIVERGENCE',
        statusTone: 'demo' as const,
        note: 'Measured via LRO Diviner PCP/GDR (Moon), MGS TES Thermal Inertia (Mars), and Terra/Aqua MODIS MOD11A2 v061 (Earth). Earth’s dense atmosphere buffers diurnal swings.',
        source: 'NASA LRO Diviner (LRO-L-DLRE-5-GDR-V1.0) / MGS TES (MGS-M-TES-5-TIMAP-V1.0) / MODIS MOD11A2 v061',
      },
      {
        parameter: 'Solar Exposure & Shadow Regime',
        layerTag: 'Solar / Shadows',
        planetValue: `${activeRegion.illuminationSummary} (Active model: ${solarElevationDeg}° sun el., ${planetLayerStats.shadowedPercent}% grid shadowed)`,
        earthValue: `Terrestrial solar ~1,000 W/m² peak; ozone-attenuated UV (Active model: ${solarElevationDeg}° sun el.)`,
        status: 'ILLUMINATION MODEL',
        statusTone: 'blue' as const,
        note: 'Low solar elevation at lunar poles (1.5°) creates permanent dark traps and long ridge shadows.',
        source: 'LRO LOLA Illumination Atlas / NASA POWER / DEM Cosine Ray-Cast',
      },
      {
        parameter: 'Gravity & Atmospheric Pressure',
        layerTag: 'Non-Equivalence Boundary',
        planetValue:
          activeRegion.planet === 'Mars'
            ? '3.721 m/s² (0.38 g) · 6.1–8.5 mbar CO₂ (95%)'
            : '1.622 m/s² (0.165 g) · < 10⁻¹¹ mbar Hard Vacuum',
        earthValue: `9.807 m/s² (1.00 g) · ${
          activeEarthSite.parameters?.find((p) => p.label === 'Atmospheric Pressure')?.value ??
          '~900–1,013 mbar N₂/O₂'
        }`,
        status: 'NON-EQUIVALENT BOUNDARY',
        statusTone: 'unavailable' as const,
        note: 'Earth NEVER replicates reduced planetary gravity, vacuum/CO₂ pressure, or unshielded GCR radiation.',
        source: 'NASA NSSDCA Planetary Fact Sheets (2024)',
      },
    ];
  }, [
    activeRegion,
    activeEarthSite,
    activePlanetDataset,
    activePlanetDerived,
    earthData,
    earthDerived,
    earthDemId,
    divinerData,
    activeEarthModisProfile,
    solarElevationDeg,
    planetLayerStats.shadowedPercent,
  ]);

  // ============================================================================
  // ANNOTATED ANALOG COMPARISON MAP GENERATOR (Canvas Plate Renderer & Export)
  // ============================================================================
  const renderAnnotatedComparisonPlate = useCallback(() => {
    const outCanvas = exportCanvasRef.current;
    if (!outCanvas) return;
    const W = 1600;
    const H = 1020;
    if (outCanvas.width !== W || outCanvas.height !== H) {
      outCanvas.width = W;
      outCanvas.height = H;
    }
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;

    // 1. Deep space laboratory background & outer border
    ctx.fillStyle = '#06080D';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#2E3440';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, W - 24, H - 24);

    // 2. Header Banner
    ctx.fillStyle = '#0D121B';
    ctx.fillRect(14, 14, W - 28, 78);
    ctx.strokeStyle = '#252B37';
    ctx.beginPath();
    ctx.moveTo(14, 92);
    ctx.lineTo(W - 14, 92);
    ctx.stroke();

    ctx.fillStyle = '#38BDF8';
    ctx.font = '600 12px "IBM Plex Mono", monospace';
    ctx.fillText(
      `TERRAFORM // PLANETARY ANALOG MAPPING & DISCOVERY · LAYER: ${activeLayerConfig.label.toUpperCase()} (${activeLayerConfig.unit})`,
      32,
      40
    );

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '700 22px "Space Grotesk", system-ui, sans-serif';
    ctx.fillText(annotTitle, 32, 72);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 12px "IBM Plex Mono", monospace';
    const stamp = `GENERATED: ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC · SUN EL ${solarElevationDeg}° AZ ${solarAzimuthDeg}°`;
    const stampW = ctx.measureText(stamp).width;
    ctx.fillText(stamp, W - stampW - 32, 40);

    const pairLabel = `${activeRegion.planet.toUpperCase()}: ${activeRegion.shortName}  ↔  EARTH: ${activeEarthSite.name}`;
    const pairW = ctx.measureText(pairLabel).width;
    ctx.fillStyle = '#E2E8F0';
    ctx.fillText(pairLabel, W - pairW - 32, 70);

    // 3. Left Frame: Planetary Target Map (460 x 460)
    const mapSize = 440;
    const leftX = 32;
    const mapY = 112;

    ctx.fillStyle = '#0B0F17';
    ctx.fillRect(leftX, mapY, mapSize, mapSize + 58);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(leftX, mapY, mapSize, mapSize + 58);

    if (planetCanvasRef.current) {
      ctx.drawImage(planetCanvasRef.current, leftX, mapY, mapSize, mapSize);
    }

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(leftX + 1, mapY + mapSize, mapSize - 2, 57);
    ctx.fillStyle = '#F59E0B';
    ctx.font = '600 11px "IBM Plex Mono", monospace';
    ctx.fillText(
      `01 // PLANETARY TARGET: ${activeRegion.planet.toUpperCase()} · ${activeRegion.shortName.toUpperCase()}`,
      leftX + 14,
      mapY + mapSize + 20
    );
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '400 11px "IBM Plex Mono", monospace';
    ctx.fillText(
      `Coords: ${activeRegion.coordinatesDisplay} · ${
        activeRegion.hasLocalDem ? '30 m USGS DEM (MOLA Datum)' : 'Orbital Reference (No Local 30m DEM)'
      }`,
      leftX + 14,
      mapY + mapSize + 42
    );

    // 4. Right Frame: Earth Analog Map (460 x 460)
    const rightX = 500;
    ctx.fillStyle = '#0B0F17';
    ctx.fillRect(rightX, mapY, mapSize, mapSize + 58);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(rightX, mapY, mapSize, mapSize + 58);

    if (activeEarthSite.hasLocalDem && earthData && earthDerived) {
      const offscreen = document.createElement('canvas');
      renderTerraformLayerToCanvas(
        {
          dataset: earthData,
          derived: earthDerived,
          layer: activeLayerId,
          solarElevationDeg,
          solarAzimuthDeg,
          showContours,
          showHillshade,
          showAnnotations: true,
          orthophoto: earthOrtho,
          features: [
            {
              id: 'yg-core',
              name: 'Yungay Hyperarid Core (Smectite Trench)',
              type: 'Thermal / Volatile Trap',
              normX: 0.52,
              normY: 0.5,
              coordsLabel: activeEarthSite.coordinates.display,
              elevationLabel: activeEarthSite.elevationRange,
              slopeLabel: '1°–6° pediment',
              tempLabel: '-4 °C to +42 °C',
              mineralLabel: 'Smectite + Halite/Nitrate',
              observation: '',
              source: 'Copernicus GLO-30',
            },
          ],
          selectedCell: earthCell,
          size: mapSize,
        },
        offscreen
      );
      ctx.drawImage(offscreen, rightX, mapY, mapSize, mapSize);
    } else {
      // Stylized cartographic coordinate locator map for non-DEM Earth sites
      ctx.fillStyle = '#0F1824';
      ctx.fillRect(rightX, mapY, mapSize, mapSize);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
      for (let i = 1; i < 6; i++) {
        const g = (mapSize / 6) * i;
        ctx.beginPath();
        ctx.moveTo(rightX + g, mapY);
        ctx.lineTo(rightX + g, mapY + mapSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rightX, mapY + g);
        ctx.lineTo(rightX + mapSize, mapY + g);
        ctx.stroke();
      }
      // Plot candidate positions on world projection box
      ANALOG_SITES.forEach((site) => {
        const sx = rightX + ((site.coordinates.lon + 180) / 360) * mapSize;
        const sy = mapY + ((90 - site.coordinates.lat) / 180) * mapSize;
        const isCurrent = site.id === activeEarthSite.id;
        ctx.strokeStyle = isCurrent ? '#2DD4BF' : '#64748B';
        ctx.lineWidth = isCurrent ? 2.5 : 1;
        ctx.beginPath();
        ctx.arc(sx, sy, isCurrent ? 12 : 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = isCurrent ? '#2DD4BF' : '#94A3B8';
        ctx.beginPath();
        ctx.arc(sx, sy, isCurrent ? 4.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
        if (isCurrent) {
          ctx.fillStyle = '#99F6E4';
          ctx.font = '600 11px "IBM Plex Mono", monospace';
          ctx.fillText(site.name, Math.min(rightX + mapSize - 190, sx + 14), sy + 4);
        }
      });
      ctx.fillStyle = 'rgba(5, 7, 11, 0.86)';
      ctx.fillRect(rightX + 14, mapY + 14, mapSize - 28, 42);
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.5)';
      ctx.strokeRect(rightX + 14, mapY + 14, mapSize - 28, 42);
      ctx.fillStyle = '#99F6E4';
      ctx.font = '600 10.5px "IBM Plex Mono", monospace';
      ctx.fillText(`EARTH GLOBAL LOCATOR · ${activeEarthSite.name.toUpperCase()}`, rightX + 24, mapY + 32);
      ctx.fillStyle = '#CBD5E1';
      ctx.fillText('Local 30m DEM not bundled for this site; literature parameters shown.', rightX + 24, mapY + 48);
    }

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(rightX + 1, mapY + mapSize, mapSize - 2, 57);
    ctx.fillStyle = '#2DD4BF';
    ctx.font = '600 11px "IBM Plex Mono", monospace';
    ctx.fillText(
      `02 // EARTH ANALOG: ${activeEarthSite.name.toUpperCase()} (${activeEarthSite.country.toUpperCase()})`,
      rightX + 14,
      mapY + mapSize + 20
    );
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '400 11px "IBM Plex Mono", monospace';
    ctx.fillText(
      `Coords: ${activeEarthSite.coordinates.display} · ${
        activeEarthSite.hasLocalDem ? '30 m Copernicus GLO-30 (EGM2008)' : 'Satellite / Literature Profile'
      }`,
      rightX + 14,
      mapY + mapSize + 42
    );

    // 5. Rightmost Column: Scientific Synthesis,Similarities, Divergences & Investigator Note (x = 964..1568)
    const infoX = 968;
    const infoW = W - infoX - 32;
    ctx.fillStyle = '#0B0F17';
    ctx.fillRect(infoX, mapY, infoW, mapSize + 58);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(infoX, mapY, infoW, mapSize + 58);

    let cursorY = mapY + 28;
    ctx.fillStyle = '#38BDF8';
    ctx.font = '600 11.5px "IBM Plex Mono", monospace';
    ctx.fillText('03 // SCIENTIFIC ANALOG CASE & BOUNDARIES', infoX + 18, cursorY);

    const wrapCanvasText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number, color: string, font: string) => {
      ctx.fillStyle = color;
      ctx.font = font;
      const words = text.split(' ');
      let line = '';
      let currY = y;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          ctx.fillText(line, x, currY);
          line = word;
          currY += lineHeight;
        } else {
          line = test;
        }
      }
      if (line) {
        ctx.fillText(line, x, currY);
        currY += lineHeight;
      }
      return currY;
    };

    cursorY += 22;
    ctx.fillStyle = '#99F6E4';
    ctx.font = '600 12px "IBM Plex Sans", sans-serif';
    ctx.fillText('WHY THIS EARTH SITE SERVES AS A VALID ANALOG:', infoX + 18, cursorY);
    cursorY = wrapCanvasText(
      `${activeEarthSite.planetaryApplication} ${activeEarthSite.geologicalContext}`,
      infoX + 18,
      cursorY + 18,
      infoW - 36,
      17,
      '#E2E8F0',
      '400 12px "IBM Plex Sans", sans-serif'
    );

    cursorY += 12;
    ctx.fillStyle = '#FDE68A';
    ctx.font = '600 12px "IBM Plex Sans", sans-serif';
    ctx.fillText('TARGET SCIENTIFIC FOCUS:', infoX + 18, cursorY);
    cursorY = wrapCanvasText(
      `${activeRegion.scientificFocus} Mineralogy: ${activeRegion.mineralogySummary}.`,
      infoX + 18,
      cursorY + 18,
      infoW - 36,
      17,
      '#E2E8F0',
      '400 12px "IBM Plex Sans", sans-serif'
    );

    cursorY += 12;
    ctx.fillStyle = '#FCA5A5';
    ctx.font = '600 12px "IBM Plex Sans", sans-serif';
    ctx.fillText('NON-EQUIVALENCE & FUNDAMENTAL LIMITATIONS:', infoX + 18, cursorY);
    cursorY = wrapCanvasText(
      `${activeEarthSite.limitations[0]} ${activeRegion.limitations[0]} Earth never replicates ${
        activeRegion.planet === 'Mars'
          ? '0.38 g Mars gravity, 6.1 mbar CO2 pressure, or unshielded surface GCR.'
          : '0.165 g Lunar gravity, hard exospheric vacuum (<10^-11 mbar), or 40 K PSR cold traps.'
      }`,
      infoX + 18,
      cursorY + 18,
      infoW - 36,
      17,
      '#CBD5E1',
      '400 12px "IBM Plex Sans", sans-serif'
    );

    cursorY += 12;
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 11px "IBM Plex Mono", monospace';
    ctx.fillText('INVESTIGATOR ANNOTATION:', infoX + 18, cursorY);
    cursorY = wrapCanvasText(
      annotNote,
      infoX + 18,
      cursorY + 18,
      infoW - 36,
      16,
      '#F8FAFC',
      '400 11.5px "IBM Plex Sans", sans-serif'
    );

    // Optional Layer Legend inside right column bottom
    if (includeLegendOnPlate) {
      const legY = mapY + mapSize + 8;
      ctx.fillStyle = '#94A3B8';
      ctx.font = '600 10px "IBM Plex Mono", monospace';
      ctx.fillText(`ACTIVE LAYER LEGEND (${activeLayerConfig.label.toUpperCase()}):`, infoX + 18, legY);
      const boxW = Math.floor((infoW - 36) / activeLayerConfig.legendStops.length);
      activeLayerConfig.legendStops.forEach((st, idx) => {
        const bx = infoX + 18 + idx * boxW;
        ctx.fillStyle = st.color;
        ctx.fillRect(bx, legY + 8, boxW - 6, 12);
        ctx.fillStyle = '#CBD5E1';
        ctx.font = '500 9.5px "IBM Plex Mono", monospace';
        ctx.fillText(st.label, bx, legY + 32);
      });
    }

    // 6. Bottom Table: Measured Parameters & Traceable Dataset Sources (y = 626..990)
    const tableY = 626;
    const tableH = H - tableY - 24;
    ctx.fillStyle = '#0B0F17';
    ctx.fillRect(32, tableY, W - 64, tableH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(32, tableY, W - 64, tableH);

    if (includeParamsOnPlate) {
      ctx.fillStyle = '#111827';
      ctx.fillRect(33, tableY + 1, W - 66, 30);
      ctx.fillStyle = '#38BDF8';
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.fillText('PARAMETER', 48, tableY + 20);
      ctx.fillText(`PLANETARY TARGET (${activeRegion.shortName.toUpperCase()})`, 310, tableY + 20);
      ctx.fillText(`EARTH ANALOG (${activeEarthSite.name.split(',')[0]!.toUpperCase()})`, 790, tableY + 20);
      ctx.fillText('TRACEABLE DATA SOURCE', 1240, tableY + 20);

      comparisonRows.slice(0, 7).forEach((row, rIdx) => {
        const ry = tableY + 52 + rIdx * 34;
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.beginPath();
        ctx.moveTo(44, ry - 18);
        ctx.lineTo(W - 44, ry - 18);
        ctx.stroke();

        ctx.fillStyle = '#F8FAFC';
        ctx.font = '600 11.5px "IBM Plex Sans", sans-serif';
        ctx.fillText(row.parameter.slice(0, 34), 48, ry);

        ctx.fillStyle = '#E2E8F0';
        ctx.font = '400 11px "IBM Plex Mono", monospace';
        ctx.fillText(row.planetValue.slice(0, 62), 310, ry);
        ctx.fillText(row.earthValue.slice(0, 60), 790, ry);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '400 10.5px "IBM Plex Mono", monospace';
        ctx.fillText(row.source.slice(0, 46), 1240, ry);
      });
    }

    if (includeSourcesOnPlate) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '500 10.5px "IBM Plex Mono", monospace';
      ctx.fillText(
        'ARCHIVES: NASA PDS (pds.nasa.gov) · NASA LRO LOLA & Diviner · USGS Astrogeology Gale DEM · ESA Copernicus GLO-30 & Sentinel-1/2 · NASA Earthdata / GIBS · CSA RADARSAT',
        48,
        H - 36
      );
    }
  }, [
    activeLayerConfig,
    annotTitle,
    solarElevationDeg,
    solarAzimuthDeg,
    activeRegion,
    activeEarthSite,
    earthData,
    earthDerived,
    activeLayerId,
    showContours,
    showHillshade,
    earthOrtho,
    earthCell,
    annotNote,
    includeLegendOnPlate,
    includeParamsOnPlate,
    includeSourcesOnPlate,
    comparisonRows,
  ]);

  useEffect(() => {
    renderAnnotatedComparisonPlate();
  }, [renderAnnotatedComparisonPlate]);

  const handleDownloadPlatePng = () => {
    renderAnnotatedComparisonPlate();
    const canvas = exportCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `TERRAFORM-${activeRegion.id}-${activeEarthSite.id}-${activeLayerId}.png`;
    a.click();
  };

  const handleDownloadDossierMarkdown = () => {
    const md = `# ${annotTitle}
- **Generated**: ${new Date().toISOString()}
- **Planetary Target**: ${activeRegion.planet} — ${activeRegion.name} (${activeRegion.coordinatesDisplay})
- **Earth Analog Site**: ${activeEarthSite.name}, ${activeEarthSite.country} (${activeEarthSite.coordinates.display})
- **Active Scientific Layer**: ${activeLayerConfig.label} (${activeLayerConfig.unit})
- **Illumination Model**: Solar Elevation ${solarElevationDeg}°, Solar Azimuth ${solarAzimuthDeg}°

## 1. Scientific Analog Rationale
- **Target Focus**: ${activeRegion.scientificFocus}
- **Earth Analog Application**: ${activeEarthSite.planetaryApplication}
- **Geological Context**: ${activeEarthSite.geologicalContext}
- **Investigator Annotation**: ${annotNote}

## 2. Measurable Parameter Comparison & Data Provenance
| Parameter | ${activeRegion.shortName} (${activeRegion.planet}) | ${activeEarthSite.name} (Earth) | Status | Data Source |
| --- | --- | --- | --- | --- |
${comparisonRows
  .map(
    (r) =>
      `| ${r.parameter} | ${r.planetValue} | ${r.earthValue} | ${r.status} | ${r.source} |`
  )
  .join('\n')}

## 3. Non-Equivalence & Limitations (Critical Scientific Boundary)
- ${activeEarthSite.limitations.join('\n- ')}
- ${activeRegion.limitations.join('\n- ')}
- **Fundamental Non-Equivalence**: Earth never replicates ${
      activeRegion.planet === 'Mars'
        ? 'Mars surface gravity (3.72 m/s²), 6.1 mbar CO₂ atmosphere, or unshielded galactic cosmic radiation.'
        : 'Lunar surface gravity (1.62 m/s²), hard exospheric vacuum (< 10⁻¹¹ mbar), or 40 K permanently shadowed cold traps.'
    }

## 4. Traceable NASA & International Space Agency References
- **Earth Observations**: ESA Copernicus DEM GLO-30 (https://doi.org/10.5270/esa-c5d3d65), NASA Earthdata Search (https://search.earthdata.nasa.gov/), NASA Worldview / GIBS (https://worldview.earthdata.nasa.gov/), CSA RADARSAT-1 / RCM SAR (https://donnees-data.asc-csa.gc.ca/).
- **Lunar Observations**: NASA PDS (https://pds.nasa.gov/), NASA LRO LOLA & LROC (https://pds-geosciences.wustl.edu/missions/lro/), NASA LRO Diviner Lunar Radiometer (https://pds-geosciences.wustl.edu/missions/lro/diviner.htm).
- **Martian Observations**: USGS Astrogeology Mars MSL Gale Merged DEM 1m v3 (https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m), NASA PDS MSL Curiosity & Mars 2020 Archives.
`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TERRAFORM-Dossier-${activeRegion.id}-${activeEarthSite.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const topMatches = discoveryResults.filter((candidate) => candidate.overallSimilarityScore !== null);
  const selectedMatch = topMatches.find((candidate) => candidate.earthSiteId === selectedMatchId) ?? topMatches[0];
  const compareId = selectedMatch?.earthDatasetId;
  const [comparisonTerrain, setComparisonTerrain] = useState<{ id: string; dataset: TerrainGridDataset | null } | null>(null);
  useEffect(() => {
    if (!compareId) return;
    let current = true;
    loadTerrainDataset(compareId, 'REAL_DATA')
      .then((dataset) => { if (current) setComparisonTerrain({ id: compareId, dataset }); })
      .catch(() => { if (current) setComparisonTerrain({ id: compareId, dataset: null }); });
    return () => { current = false; };
  }, [compareId]);
  const compareEarth = comparisonTerrain?.id === compareId ? comparisonTerrain?.dataset : null;
  const compareDerived = useMemo(() => compareEarth ? computeDerivedTerrain(compareEarth) : null, [compareEarth]);

  const selectedFieldSite = expandedAnalogSites.find((site) => site.id === selectedMatch?.earthSiteId);
  const matchFactors = selectedMatch ? [
    { label: 'Changes in height', score: selectedMatch.parameterScores.elevation, weight: selectedMatch.effectiveWeights.elevation },
    { label: 'Steepness', score: selectedMatch.parameterScores.slope, weight: selectedMatch.effectiveWeights.slope },
    { label: 'Roughness', score: selectedMatch.parameterScores.roughness, weight: selectedMatch.effectiveWeights.roughness },
  ].filter((factor) => factor.weight > 0).sort((a, b) => b.score - a.score) : [];

  return (
    <main id="main-content" className="workstation-shell">
      <section className="terraform-public field-lab" aria-labelledby="terraform-title">
        <header>
          <h1 id="terraform-title">Terraform</h1>
          <p>Map the surface of Mars or the Moon. Choose a region to see which places on Earth have the most similar terrain.</p>
        </header>
        <FieldLabTerrainMap
          planet={targetPlanet}
          onPlanetChange={handleSelectPlanet}
          regions={PLANETARY_REGIONS}
          region={activeRegion}
          onRegionChange={handleSelectRegion}
          dataset={activePlanetDataset}
          derived={activePlanetDerived}
          layer={publicLayer}
          onLayerChange={(layer) => {
            if (layer === 'imagery' || layer === 'elevation' || layer === 'slope' || layer === 'roughness') setPublicLayer(layer);
          }}
        />
        <section className="terraform-matches" aria-labelledby="terraform-matches-title">
          <h2 id="terraform-matches-title">Earth matches for {activeRegion.shortName}</h2>
          <p>{topMatches.length > 0 && `${topMatches.length} ranked sites. `}We compare changes in height, steepness, and roughness using the available terrain maps.</p>
          {discoveryRunning ? <p role="status">Finding Earth matches…</p> : discoveryError ? (
            <p role="status">The terrain catalog could not load. <button type="button" className="btn" onClick={() => runAnalogDiscovery(activeRegion.id)}>Retry</button></p>
          ) : selectedMatch ? (
            <>
              <ol className="terraform-match-list" aria-label="Ranked Earth analog sites" tabIndex={0}>
                {topMatches.map((candidate) => (
                  <li key={candidate.earthSiteId}>
                    <button type="button" className="btn" aria-pressed={candidate.earthSiteId === selectedMatch.earthSiteId}
                      onClick={() => { setSelectedMatchId(candidate.earthSiteId); setSelectedEarthSiteId(candidate.earthSiteId); }}>
                      <span>{candidate.shortName}</span><strong>{candidate.overallSimilarityScore?.toFixed(0)} / 100</strong>
                    </button>
                    <div className="terraform-source-links">
                      {candidate.terrainSource && <a href={candidate.terrainSource.url} target="_blank" rel="noreferrer">Terrain source · {candidate.terrainSource.name}</a>}
                      {expandedAnalogSites.filter((site) => site.id === candidate.earthSiteId).map((site) =>
                        <a key={site.id} href={site.source} target="_blank" rel="noreferrer">Field research source</a>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
              <p><strong>{selectedMatch.shortName}</strong>{matchFactors[0] ? ` matches most closely in ${matchFactors[0].label.toLowerCase()}.` : ' has a terrain score.'}</p>
              <dl className="terraform-factor-list">
                {matchFactors.map((factor) => <div key={factor.label}><dt>{factor.label}</dt><dd>{factor.score.toFixed(0)} / 100</dd></div>)}
              </dl>
              <small>Scores describe terrain similarity. Temperature is excluded because the observations were taken under different conditions.</small>
              {selectedFieldSite && <p>{selectedFieldSite.note}</p>}
              {compareEarth && compareDerived && activePlanetDataset && activePlanetDerived && activePlanetDataset.dataState !== 'UNAVAILABLE' ? (
                <TerrainComparisonCurtain key={`${compareEarth.id}-${activePlanetDataset.id}`}
                  earth={compareEarth} earthDerived={compareDerived}
                  target={activePlanetDataset} targetDerived={activePlanetDerived} />
              ) : <p role="status">{comparisonTerrain?.id === compareId && !compareEarth ? 'The selected Earth terrain could not load.' : 'Loading comparison maps…'}</p>}
            </>
          ) : <p role="status">No Earth matches can be scored with the available terrain data and weights.</p>}
        </section>
      </section>
      <details className="terraform-advanced">
        <summary>Advanced maps, weights and export</summary>
      {/* ====================================================================
          HEADER: TERRAFORM — PLANETARY ANALOG MAPPING & DISCOVERY
      ==================================================================== */}
      <div className="workstation-header">
        <div className="workstation-header-inner">
          <div className="research-title-block">
            <div className="workspace-eyebrow">
              <span className="analog-line" />
              <span>TERRAFORM // PLANETARY ANALOG MAPPING &amp; DISCOVERY · NASA SPACE APPS 2026</span>
            </div>
            <h1>TERRAFORM — Planetary Analog Mapping &amp; Discovery</h1>
            <p style={{ maxWidth: 840 }}>
              Select a Moon or Mars region, inspect 9 measurable scientific surface layers, identify candidate Earth analogs, evaluate parameter parity vs. environmental boundaries, and generate an annotated comparison map.
            </p>
          </div>

          <div className="research-header-actions">
            <button
              type="button"
              className="btn"
              onClick={() => setSrsModalOpen(true)}
            >
              <FileText size={14} />
              <span>SRS &amp; Dataset Matrix</span>
            </button>
            <a href="#terraform-generator" className="btn">
              <Download size={14} />
              <span>Annotated Map Plate</span>
            </a>
            <Link to="/research" className="btn btn--primary" style={{ textDecoration: 'none' }}>
              <span>Open in Research Studio</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* 5-Stage Interactive Workflow Bar */}
        <div
          style={{
            maxWidth: 1440,
            margin: '24px auto 0',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 8,
          }}
        >
          {[
            {
              step: '01',
              title: 'SELECT PLANETARY REGION',
              val: `${targetPlanet.toUpperCase()} · ${activeRegion.shortName}`,
              href: '#terraform-maps',
            },
            {
              step: '02',
              title: 'MAP SCIENTIFIC LAYERS',
              val: `${activeLayerConfig.label} (${activeLayerConfig.derivationBadge})`,
              href: '#terraform-layers',
            },
            {
              step: '03',
              title: 'IDENTIFY EARTH ANALOGS',
              val: `${activeEarthSite.name.split(',')[0]} (${
                activeEarthSite.hasLocalDem ? '30m DEM' : 'Orbital/Lit'
              })`,
              href: '#terraform-maps',
            },
            {
              step: '04',
              title: 'COMPARE ENVIRONMENTS',
              val: `${comparisonRows.length} Parameters + Transect`,
              href: '#terraform-comparison',
            },
            {
              step: '05',
              title: 'GENERATE ANNOTATED MAP',
              val: '1600×1020 PNG Plate + MD Dossier',
              href: '#terraform-generator',
            },
          ].map((item) => (
            <a
              key={item.step}
              href={item.href}
              style={{
                textDecoration: 'none',
                padding: '10px 14px',
                background: '#0C0C0E',
                border: '1px solid #2B2B2E',
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span className="mono" style={{ fontSize: 10, color: '#8D8D90', letterSpacing: '0.08em' }}>
                STAGE {item.step} // {item.title}
              </span>
              <strong style={{ fontSize: 12.5, color: '#F5F5F2' }}>{item.val}</strong>
            </a>
          ))}
        </div>
      </div>

      <div className="workstation-body" style={{ gap: 20 }}>
        {/* ====================================================================
            SECTION 1: 9 SELECTABLE SCIENTIFIC MAPPING LAYERS & SOLAR CONTROLS
        ==================================================================== */}
        <section id="terraform-layers" className="panel" style={{ padding: 20 }} aria-label="Scientific mapping layers">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div>
              <p className="atlas-kicker">01 // SCIENTIFIC MAPPING LAYERS &amp; ILLUMINATION PHYSICS</p>
              <h2 style={{ fontSize: 21, marginTop: 4 }}>
                Select Surface Parameter Layer &amp; Solar Geometry
              </h2>
            </div>

            {/* Illumination & Cartographic Overlay Controls */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
              <label
                className="mono"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#D4D4D8' }}
                title="Adjust solar elevation above horizon (1.5° simulates Lunar South Pole grazing sunlight; 42° is standard USGS hillshade)"
              >
                <Sun size={14} />
                <span>SUN ELEVATION: {solarElevationDeg}°</span>
                <input
                  type="range"
                  min={1.5}
                  max={75}
                  step={0.5}
                  value={solarElevationDeg}
                  onChange={(e) => setSolarElevationDeg(Number(e.target.value))}
                  style={{ width: 95 }}
                />
              </label>

              <label
                className="mono"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#D4D4D8' }}
                title="Adjust solar illumination azimuth (0°=N, 90°=E, 180°=S, 270°=W, 315°=NW)"
              >
                <span>AZIMUTH: {solarAzimuthDeg}°</span>
                <input
                  type="range"
                  min={0}
                  max={355}
                  step={5}
                  value={solarAzimuthDeg}
                  onChange={(e) => setSolarAzimuthDeg(Number(e.target.value))}
                  style={{ width: 85 }}
                />
              </label>

              <button
                type="button"
                className={`btn ${showContours ? 'btn--primary' : ''}`}
                onClick={() => setShowContours((v) => !v)}
                style={{ padding: '5px 10px', fontSize: 11.5 }}
              >
                25m/100m Contours
              </button>
              <button
                type="button"
                className={`btn ${showHillshade ? 'btn--primary' : ''}`}
                onClick={() => setShowHillshade((v) => !v)}
                style={{ padding: '5px 10px', fontSize: 11.5 }}
              >
                Hillshade
              </button>
              <button
                type="button"
                className={`btn ${showAnnotations ? 'btn--primary' : ''}`}
                onClick={() => setShowAnnotations((v) => !v)}
                style={{ padding: '5px 10px', fontSize: 11.5 }}
              >
                Feature Pins
              </button>
            </div>
          </div>

          {/* 9 Layer Selector Buttons */}
          <div
            role="radiogroup"
            aria-label="Scientific mapping layers"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 8,
              marginBottom: 16,
            }}
          >
            {TERRAFORM_LAYERS.map((layer) => {
              const active = layer.id === activeLayerId;
              return (
                <button
                  key={layer.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setActiveLayerId(layer.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 6,
                    padding: '10px 12px',
                    borderRadius: 2,
                    border: active ? '1px solid #F3F3F0' : '1px solid #323236',
                    background: active ? '#1D1D21' : '#0E0E11',
                    color: active ? '#FFFFFF' : '#B4B4B8',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span className="mono" style={{ fontSize: 9.5, color: active ? '#38BDF8' : '#858589' }}>
                      {layer.category.toUpperCase()}
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: 9,
                        padding: '1px 5px',
                        border: '1px solid rgba(255,255,255,0.16)',
                        color: active ? '#FDE68A' : '#94A3B8',
                      }}
                    >
                      {layer.derivationBadge}
                    </span>
                  </div>
                  <strong style={{ fontSize: 13 }}>{layer.label}</strong>
                  <span className="mono" style={{ fontSize: 10, color: '#8E8E92' }}>
                    {layer.unit}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Layer Scientific Explanation, Legend & Dataset Provenance */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
              gap: 16,
              padding: '14px 16px',
              background: '#0E0E11',
              border: '1px solid #2A2A2E',
              borderRadius: 2,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Layers size={15} />
                <strong style={{ fontSize: 14 }}>
                  {activeLayerConfig.label} ({activeLayerConfig.unit})
                </strong>
                <span className="badge">{activeLayerConfig.derivationBadge}</span>
              </div>
              <p style={{ fontSize: 12.5, color: '#D4D4D8', marginBottom: 6 }}>
                {activeLayerConfig.summary}
              </p>
              <p style={{ fontSize: 12, color: '#9CA3AF' }}>
                <strong>Scientific interpretation:</strong> {activeLayerConfig.scientificContext}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div className="mono" style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 6 }}>
                  COLOR SCALE LEGEND · {activeLayerConfig.label.toUpperCase()}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${activeLayerConfig.legendStops.length}, 1fr)`, gap: 4 }}>
                  {activeLayerConfig.legendStops.map((stop) => (
                    <div key={stop.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ height: 10, background: stop.color, border: '1px solid rgba(255,255,255,0.2)' }} />
                      <span className="mono" style={{ fontSize: 9.5, color: '#CBD5E1' }}>
                        {stop.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mono" style={{ fontSize: 10, color: '#94A3B8', borderTop: '1px solid #262629', paddingTop: 8 }}>
                <div>
                  <strong>Earth:</strong> {activeLayerConfig.earthDatasetRef}
                </div>
                <div>
                  <strong>{targetPlanet}:</strong>{' '}
                  {targetPlanet === 'Mars' ? activeLayerConfig.marsDatasetRef : activeLayerConfig.moonDatasetRef}
                </div>
              </div>
            </div>
          </div>

          {/* 5 Priority Downloaded NASA Datasets Live Telemetry Strip */}
          <div
            style={{
              marginTop: 12,
              padding: '10px 14px',
              background: '#0A0D13',
              border: '1px solid #252B37',
              borderRadius: 2,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 10,
            }}
          >
            <div style={{ fontSize: 11 }}>
              <div className="mono" style={{ fontSize: 9.5, color: '#38BDF8', fontWeight: 600 }}>
                1 // NASADEM_HGT V001 (30M EARTH)
              </div>
              <div style={{ color: '#E2E8F0', marginTop: 2 }}>
                Yungay: <strong>953.4–1,211.7 m</strong> (Relief 258.4 m · 128×128)
              </div>
            </div>
            <div style={{ fontSize: 11 }}>
              <div className="mono" style={{ fontSize: 9.5, color: '#2DD4BF', fontWeight: 600 }}>
                2 // MODIS MOD11A2 v061 (1KM LST)
              </div>
              <div style={{ color: '#E2E8F0', marginTop: 2 }}>
                {activeEarthModisProfile ? (
                  <>
                    {activeEarthSite.name.split(',')[0]}: Day{' '}
                    <strong>{activeEarthModisProfile.dayStatsCelsius.mean?.toFixed(1)}°C</strong> / Night{' '}
                    <strong>{activeEarthModisProfile.nightStatsCelsius.mean?.toFixed(1)}°C</strong>
                  </>
                ) : (
                  'Loading 8-day Day/Night LST...'
                )}
              </div>
            </div>
            <div style={{ fontSize: 11 }}>
              <div className="mono" style={{ fontSize: 9.5, color: '#FDE68A', fontWeight: 600 }}>
                3 // LRO LOLA LDEM (MOON DEM)
              </div>
              <div style={{ color: '#E2E8F0', marginTop: 2 }}>
                Shackleton 30m: <strong>-2,245.5 to +1,032.5 m</strong> + LDEM_64
              </div>
            </div>
            <div style={{ fontSize: 11 }}>
              <div className="mono" style={{ fontSize: 9.5, color: '#F59E0B', fontWeight: 600 }}>
                4 // LRO DIVINER PCP (240M POLAR)
              </div>
              <div style={{ color: '#E2E8F0', marginTop: 2 }}>
                {divinerData ? (
                  <>
                    South Pole: <strong>{divinerData.stats.minKelvin.toFixed(1)} K</strong> ({divinerData.stats.minCelsius.toFixed(0)}°C) to{' '}
                    <strong>{divinerData.stats.maxKelvin.toFixed(1)} K</strong>
                  </>
                ) : (
                  'Loading Diviner PCP...'
                )}
              </div>
            </div>
            <div style={{ fontSize: 11 }}>
              <div className="mono" style={{ fontSize: 9.5, color: '#FB7185', fontWeight: 600 }}>
                5 // MGS MOLA MEGDR (16 PPD MARS)
              </div>
              <div style={{ color: '#E2E8F0', marginTop: 2 }}>
                Jezero/Isidis: <strong>-4,651 to +1,515 m</strong> (Relief 6,166 m)
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            SECTION 2: DUAL INTERACTIVE PLANETARY MAP & EARTH ANALOG MAP
        ==================================================================== */}
        <section
          id="terraform-maps"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(480px, 100%), 1fr))',
            gap: 18,
            alignItems: 'stretch',
          }}
          aria-label="Dual planetary and Earth analog mapping studio"
        >
          {/* ------------------------------------------------------------------
              LEFT COLUMN: 1. INTERACTIVE PLANETARY MAP (MOON & MARS)
          ------------------------------------------------------------------ */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <div>
                <p className="atlas-kicker">02A // PLANETARY SURFACE MAP (MOON &amp; MARS)</p>
                <h2 style={{ fontSize: 19, marginTop: 4 }}>
                  {targetPlanet}: {activeRegion.shortName}
                </h2>
              </div>

              {/* Planet Toggle */}
              <div className="atlas-planet-switch" role="group" aria-label="Select target planet">
                {(['Mars', 'Moon'] as const).map((body) => (
                  <button
                    key={body}
                    type="button"
                    className={targetPlanet === body ? 'is-active' : ''}
                    onClick={() => handleSelectPlanet(body)}
                  >
                    {body}
                  </button>
                ))}
              </div>
            </div>

            {/* Region Selector Tabs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {availableRegions.map((reg) => {
                const isSelected = reg.id === activeRegion.id;
                return (
                  <button
                    key={reg.id}
                    type="button"
                    className={`btn ${isSelected ? 'btn--primary' : ''}`}
                    style={{ fontSize: 11.5, padding: '6px 11px' }}
                    onClick={() => handleSelectRegion(reg.id)}
                  >
                    <span>{reg.shortName}</span>
                    <span
                      className="mono"
                      style={{
                        fontSize: 9.5,
                        opacity: 0.8,
                        marginLeft: 4,
                      }}
                    >
                      {reg.hasLocalDem ? '[30m DEM]' : '[Orbital Ref]'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Planetary Map Canvas Card */}
            <div className="lab-map-card" style={{ flex: 1 }}>
              <div className="lab-map-toolbar">
                <span>
                  {targetPlanet.toUpperCase()} // {activeRegion.coordinatesDisplay}
                </span>
                <span>
                  {activeRegion.hasLocalDem
                    ? `REAL 30M DEM · ${activeLayerConfig.label.toUpperCase()}`
                    : `ORBITAL REFERENCE · ${activeLayerConfig.label.toUpperCase()}`}
                </span>
              </div>

              <div
                className="lab-map-viewport"
                style={{
                  minHeight: 460,
                  position: 'relative',
                  overflow: 'hidden',
                  background: '#090C12',
                }}
              >
                <canvas
                  ref={planetCanvasRef}
                  onPointerDown={handlePlanetCanvasPointerDown}
                  onPointerMove={handlePlanetCanvasPointerMove}
                  onPointerUp={handlePlanetCanvasPointerUp}
                  onPointerLeave={handlePlanetCanvasPointerUp}
                  style={{
                    width: '100%',
                    maxWidth: 560,
                    height: 'auto',
                    aspectRatio: '1 / 1',
                    cursor: planetZoom > 1 ? 'grab' : 'crosshair',
                    transform: `translate(${planetPan.x}px, ${planetPan.y}px) scale(${planetZoom})`,
                    transformOrigin: 'center center',
                  }}
                  aria-label={`${activeRegion.name} interactive ${activeLayerConfig.label} map`}
                />
              </div>

              <div className="lab-map-foot">
                <span>
                  Click map to sample cell or feature pin (F1–F{regionFeatures.length})
                </span>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setPlanetZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2))));
                      if (planetZoom <= 1.25) setPlanetPan({ x: 0, y: 0 });
                    }}
                    aria-label="Zoom out planetary map"
                  >
                    <ZoomOut size={12} />
                  </button>
                  <span>{Math.round(planetZoom * 100)}%</span>
                  <button
                    type="button"
                    onClick={() => setPlanetZoom((z) => Math.min(2.75, Number((z + 0.25).toFixed(2))))}
                    aria-label="Zoom in planetary map"
                  >
                    <ZoomIn size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPlanetZoom(1);
                      setPlanetPan({ x: 0, y: 0 });
                    }}
                    aria-label="Reset planetary map view"
                    title="Reset zoom and pan"
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Planetary Telemetry & Geological Feature Explorer */}
            <div
              style={{
                marginTop: 12,
                padding: 12,
                background: '#0E0E11',
                border: '1px solid #2B2B2E',
                borderRadius: 2,
                display: 'grid',
                gap: 10,
              }}
            >
              {activeRegion.hasLocalDem && planetSample ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span className="mono" style={{ fontSize: 10.5, color: '#38BDF8', fontWeight: 600 }}>
                      MEASURED 30M DEM CELL TELEMETRY (ROW {planetSample.row}, COL {planetSample.col})
                    </span>
                    <span className="mono" style={{ fontSize: 10.5, color: '#94A3B8' }}>
                      {planetSample.geographicLabel}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 11.5 }}>
                    <div style={{ padding: 6, background: '#141418', border: '1px solid #26262A' }}>
                      <div className="mono" style={{ fontSize: 9.5, color: '#94A3B8' }}>ELEVATION (MOLA)</div>
                      <strong className="mono">{planetSample.elevationMeters?.toFixed(1) ?? 'N/A'} m</strong>
                    </div>
                    <div style={{ padding: 6, background: '#141418', border: '1px solid #26262A' }}>
                      <div className="mono" style={{ fontSize: 9.5, color: '#94A3B8' }}>HORN SLOPE</div>
                      <strong className="mono">{planetSample.slopeDegrees?.toFixed(2) ?? 'N/A'}°</strong>
                    </div>
                    <div style={{ padding: 6, background: '#141418', border: '1px solid #26262A' }}>
                      <div className="mono" style={{ fontSize: 9.5, color: '#94A3B8' }}>ROUGHNESS (TRI)</div>
                      <strong className="mono">{planetSample.roughnessTriMeters?.toFixed(2) ?? 'N/A'} m</strong>
                    </div>
                    <div style={{ padding: 6, background: '#141418', border: '1px solid #26262A' }}>
                      <div className="mono" style={{ fontSize: 9.5, color: '#94A3B8' }}>SHADOWED CELLS</div>
                      <strong className="mono">{planetLayerStats.shadowedPercent}% @ {solarElevationDeg}°</strong>
                    </div>
                  </div>
                  {planetSample.certification && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 11, marginTop: 8 }}>
                      <div style={{ padding: 6, background: '#141418', border: '1px solid #26262A' }}>
                        <div className="mono" style={{ fontSize: 9.5, color: '#94A3B8' }}>SOLAR / DTE COMMS</div>
                        <strong className="mono" style={{ color: '#FCD34D' }}>
                          {planetSample.certification.illuminationPct?.toFixed(1)}% Sun · {planetSample.certification.dteCommsPct?.toFixed(1)}% DTE
                        </strong>
                      </div>
                      <div style={{ padding: 6, background: '#141418', border: '1px solid #26262A' }}>
                        <div className="mono" style={{ fontSize: 9.5, color: '#94A3B8' }}>WATER/ICE (LEND/DAN)</div>
                        <strong className="mono" style={{ color: '#38BDF8' }}>
                          {planetSample.certification.waterIceWehPct?.toFixed(2)} wt% WEH
                        </strong>
                      </div>
                      <div style={{ padding: 6, background: '#141418', border: '1px solid #26262A' }}>
                        <div className="mono" style={{ fontSize: 9.5, color: '#94A3B8' }}>RAD / BEARING (SKYV/RA)</div>
                        <strong className="mono" style={{ color: '#34D399' }}>
                          {planetSample.certification.radiationMsvYr?.toFixed(0)} mSv/yr · {planetSample.certification.bearingCapacityKpa?.toFixed(0)} kPa
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11.5, color: '#FDE68A' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    <strong>Honest Data Coverage Notice:</strong> No local 30 m DEM JSON grid is bundled for{' '}
                    <strong>{activeRegion.shortName}</strong>. Showing published orbital parameters ({activeRegion.elevationSummary},{' '}
                    {activeRegion.slopeSummary}) and interactive geological waypoints below.
                  </span>
                </div>
              )}

              {/* Geological Feature Chips & Detail */}
              {regionFeatures.length > 0 && (
                <div style={{ borderTop: '1px solid #262629', paddingTop: 8 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                    <span className="mono" style={{ fontSize: 10, color: '#94A3B8' }}>
                      MAPPED GEOLOGICAL FEATURES:
                    </span>
                    {regionFeatures.map((feat, idx) => (
                      <button
                        key={feat.id}
                        type="button"
                        className={`btn ${activeFeature?.id === feat.id ? 'btn--primary' : ''}`}
                        style={{ padding: '3px 8px', fontSize: 11 }}
                        onClick={() => setSelectedFeatureId(feat.id)}
                      >
                        F{idx + 1}: {feat.name.split('(')[0]!.trim()}
                      </button>
                    ))}
                  </div>
                  {activeFeature && (
                    <div style={{ fontSize: 11.5, color: '#D4D4D8', display: 'grid', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                        <strong>
                          {activeFeature.name} ({activeFeature.type})
                        </strong>
                        <span className="mono" style={{ fontSize: 10.5, color: '#94A3B8' }}>
                          {activeFeature.coordsLabel} · {activeFeature.elevationLabel} · {activeFeature.slopeLabel}
                        </span>
                      </div>
                      <p style={{ color: '#A1A1AA', fontSize: 11.5 }}>{activeFeature.observation}</p>
                      <div className="mono" style={{ fontSize: 10, color: '#94A3B8' }}>
                        Mineralogy: {activeFeature.mineralLabel} · Source: {activeFeature.source}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------------------------
              RIGHT COLUMN: 2. INTERACTIVE EARTH MAP & ANALOG CANDIDATE DISCOVERY
          ------------------------------------------------------------------ */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <div>
                <p className="atlas-kicker">02B // EARTH ANALOG DISCOVERY &amp; TERRAIN VISUALISATION</p>
                <h2 style={{ fontSize: 19, marginTop: 4 }}>
                  Earth Analog: {activeEarthSite.name.split(',')[0]} ({activeEarthSite.country})
                </h2>
              </div>

              {/* Switch between Global Satellite/GIBS Map and Local 30 m Copernicus DEM */}
              <div className="atlas-planet-switch" role="group" aria-label="Earth map mode">
                <button
                  type="button"
                  className={earthMapMode === 'satellite' ? 'is-active' : ''}
                  onClick={() => setEarthMapMode('satellite')}
                >
                  Global GIS Map
                </button>
                <button
                  type="button"
                  className={earthMapMode === 'dem' ? 'is-active' : ''}
                  onClick={() => setEarthMapMode('dem')}
                >
                  30m DEM Grid
                </button>
              </div>
            </div>

            {/* Earth Basemap Layer Switcher (Satellite / NASA GIBS / Topo) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(Object.keys(EARTH_BASEMAPS) as EarthBasemapId[]).map((bmId) => (
                  <button
                    key={bmId}
                    type="button"
                    disabled={earthMapMode !== 'satellite'}
                    className={`btn ${earthBasemap === bmId && earthMapMode === 'satellite' ? 'btn--primary' : ''}`}
                    style={{ fontSize: 11, padding: '5px 10px' }}
                    onClick={() => {
                      setEarthMapMode('satellite');
                      setEarthBasemap(bmId);
                    }}
                  >
                    {EARTH_BASEMAPS[bmId].label}
                  </button>
                ))}
              </div>
              {earthMapMode === 'satellite' ? (
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: 11, padding: '5px 10px' }}
                  onClick={() => leafletMapRef.current?.setView([20, 0], 2, { animate: true })}
                >
                  <Maximize2 size={12} />
                  <span>World View</span>
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className={`btn ${earthDemId === 'earth-yungay-nasadem-30m' ? 'btn--primary' : ''}`}
                    style={{ fontSize: 11, padding: '5px 10px' }}
                    onClick={() => setEarthDemId('earth-yungay-nasadem-30m')}
                  >
                    NASADEM_HGT V001 (30m)
                  </button>
                  <button
                    type="button"
                    className={`btn ${earthDemId === 'earth-yungay-copernicus-30m' ? 'btn--primary' : ''}`}
                    style={{ fontSize: 11, padding: '5px 10px' }}
                    onClick={() => setEarthDemId('earth-yungay-copernicus-30m')}
                  >
                    Copernicus GLO-30 (30m)
                  </button>
                </div>
              )}
            </div>

            {/* Earth Map Card (Leaflet GIS or NASADEM / Copernicus 30m DEM Canvas) */}
            <div className="lab-map-card" style={{ flex: 1 }}>
              <div className="lab-map-toolbar">
                <span>
                  EARTH // {activeEarthSite.coordinates.display}
                </span>
                <span>
                  {earthMapMode === 'satellite'
                    ? EARTH_BASEMAPS[earthBasemap].sourceTag.toUpperCase()
                    : activeEarthSite.hasLocalDem
                      ? `${earthDemId === 'earth-yungay-nasadem-30m' ? 'NASADEM_HGT V001 (30M DEM)' : 'COPERNICUS GLO-30 (30M DEM)'} · ${activeLayerConfig.label.toUpperCase()}`
                      : 'LOCAL 30M DEM NOT BUNDLED FOR SELECTED SITE'}
                </span>
              </div>

              <div
                className="lab-map-viewport"
                style={{
                  minHeight: 460,
                  position: 'relative',
                  background: '#0D131A',
                }}
              >
                {/* Leaflet Global Satellite / NASA GIBS Map */}
                <div
                  ref={leafletContainerRef}
                  style={{
                    width: '100%',
                    height: 460,
                    display: earthMapMode === 'satellite' ? 'block' : 'none',
                  }}
                />

                {/* Local 30 m Copernicus GLO-30 DEM Canvas */}
                {earthMapMode === 'dem' &&
                  (activeEarthSite.hasLocalDem && earthData && earthDerived ? (
                    <canvas
                      ref={earthDemCanvasRef}
                      onPointerDown={handleEarthDemPointerDown}
                      style={{
                        width: '100%',
                        maxWidth: 560,
                        height: 'auto',
                        aspectRatio: '1 / 1',
                        cursor: 'crosshair',
                        transform: `scale(${earthZoom})`,
                      }}
                      aria-label={`Yungay Station 30 m Copernicus DEM ${activeLayerConfig.label} map`}
                    />
                  ) : (
                    <div
                      style={{
                        padding: 28,
                        maxWidth: 460,
                        textAlign: 'center',
                        display: 'grid',
                        gap: 12,
                      }}
                    >
                      <AlertTriangle size={28} style={{ margin: '0 auto', color: '#F59E0B' }} />
                      <h3 style={{ fontSize: 17 }}>
                        Local 30 m DEM Grid Not Bundled for {activeEarthSite.name}
                      </h3>
                      <p style={{ fontSize: 12.5, color: '#A1A1AA' }}>
                        In this offline workspace, the 128×128 (3.84 km × 3.84 km) Copernicus GLO-30 elevation raster is bundled for{' '}
                        <strong>Yungay Station, Atacama Desert</strong>. For{' '}
                        <strong>{activeEarthSite.name}</strong>, inspect the global satellite/topographic map or select Yungay to run live 30 m DEM layer rendering.
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                        <button
                          type="button"
                          className="btn btn--primary"
                          onClick={() => setSelectedEarthSiteId('yungay-atacama')}
                        >
                          Load Yungay 30 m DEM
                        </button>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setEarthMapMode('satellite')}
                        >
                          Return to Global Satellite Map
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="lab-map-foot">
                <span>
                  {earthMapMode === 'satellite'
                    ? 'Amber pin = Selected Analog · Teal ring = Matches active parameter filters'
                    : activeEarthSite.hasLocalDem && earthSample
                      ? `Yungay Cell (${earthSample.row}, ${earthSample.col}): Elev ${earthSample.elevationMeters?.toFixed(1)}m · Slope ${earthSample.slopeDegrees?.toFixed(2)}° · TRI ${earthSample.roughnessTriMeters?.toFixed(2)}m`
                      : 'Select Yungay Station for 30 m cell telemetry'}
                </span>
                {earthMapMode === 'dem' && activeEarthSite.hasLocalDem && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setEarthZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2))))}
                      aria-label="Zoom out Earth DEM"
                    >
                      −
                    </button>
                    <span>{Math.round(earthZoom * 100)}%</span>
                    <button
                      type="button"
                      onClick={() => setEarthZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
                      aria-label="Zoom in Earth DEM"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Measurable Parameter Filter & Backend Analog Discovery Engine */}
            <div
              style={{
                marginTop: 12,
                padding: 12,
                background: '#0E0E11',
                border: '1px solid #2B2B2E',
                borderRadius: 2,
                display: 'grid',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span className="mono" style={{ fontSize: 10.5, color: '#2DD4BF', fontWeight: 600 }}>
                  <Filter size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  BACKEND ANALOG DISCOVERY ENGINE (EXPLORATORY ANALOG SIMILARITY INDEX):
                </span>
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ padding: '4px 10px', fontSize: 11 }}
                  onClick={() => runAnalogDiscovery(activeRegion.id, discoveryWeights)}
                >
                  {discoveryRunning ? 'Calculating...' : 'Run Analog Discovery'}
                </button>
              </div>

              {/* Interactive Weight Sliders for Analog Discovery */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                {(
                  [
                    { key: 'elevation', label: 'Elevation (20%)' },
                    { key: 'slope', label: 'Slope (25%)' },
                    { key: 'roughness', label: 'Roughness (25%)' },
                    { key: 'temperature', label: 'Temperature (30%)' },
                  ] as const
                ).map((w) => (
                  <label
                    key={w.key}
                    style={{
                      padding: '6px 8px',
                      background: '#141418',
                      border: '1px solid #27272B',
                      borderRadius: 2,
                      fontSize: 10.5,
                      color: '#D4D4D8',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span>{w.label.split(' ')[0]}</span>
                      <span className="mono">{Math.round(discoveryWeights[w.key] * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={Math.round(discoveryWeights[w.key] * 100)}
                      onChange={(e) =>
                        setDiscoveryWeights((prev) => ({
                          ...prev,
                          [w.key]: Number(e.target.value) / 100,
                        }))
                      }
                      style={{ width: '100%' }}
                    />
                  </label>
                ))}
              </div>

              {discoveryResults[0]?.missingParameterDisclosure && (
                <div className="mono" style={{ fontSize: 10, color: '#FDE68A' }}>
                  {discoveryResults[0].missingParameterDisclosure}
                </div>
              )}

              {/* Filter Criteria Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ANALOG_FILTER_CRITERIA.map((crit) => {
                  const active = activeCriteriaFilters.includes(crit.id);
                  return (
                    <button
                      key={crit.id}
                      type="button"
                      title={crit.description}
                      className={`btn ${active ? 'btn--primary' : ''}`}
                      style={{ padding: '4px 9px', fontSize: 11 }}
                      onClick={() => toggleCriterionFilter(crit.id)}
                    >
                      {crit.shortTag}
                    </button>
                  );
                })}
              </div>

              {/* Candidate Site Selection Strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
                  gap: 6,
                  maxHeight: 190,
                  overflowY: 'auto',
                  paddingTop: 4,
                }}
              >
                {evaluatedCandidates.map(({ site, matchesAllActiveFilters }) => {
                  const isSelected = site.id === activeEarthSite.id;
                  const discScore = discoveryResults.find((d) => d.earthSiteId === site.id);
                  return (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => setSelectedEarthSiteId(site.id)}
                      style={{
                        padding: '8px 10px',
                        textAlign: 'left',
                        background: isSelected ? '#1E2430' : '#131317',
                        border: isSelected
                          ? '1px solid #F59E0B'
                          : matchesAllActiveFilters
                            ? '1px solid rgba(45, 212, 191, 0.45)'
                            : '1px solid #26262A',
                        borderRadius: 2,
                        color: '#F5F5F2',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                        <strong style={{ fontSize: 11.5 }}>{site.name.split(',')[0]}</strong>
                        <span className="mono" style={{ fontSize: 10, color: discScore ? '#2DD4BF' : '#94A3B8', fontWeight: 700 }}>
                          {discScore?.overallSimilarityScore != null ? `${discScore.overallSimilarityScore.toFixed(1)}%` : 'Unscored'}
                        </span>
                      </div>
                      <div className="mono" style={{ fontSize: 9.5, color: '#9CA3AF' }}>
                        {site.category} · {site.hasLocalDem ? '30m DEM' : 'Lit Profile'}
                        {discScore
                          ? ` · Slp:${discScore.parameterScores.slope.toFixed(0)} Rgh:${discScore.parameterScores.roughness.toFixed(0)}`
                          : ''}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            SECTION 3: EARTH-TO-PLANET SCIENTIFIC COMPARISON & TRANSECT
        ==================================================================== */}
        <section id="terraform-comparison" className="panel" style={{ padding: 20 }} aria-label="Earth to planet comparison">
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 16 }}>
            <div>
              <p className="atlas-kicker">03 // EARTH-TO-PLANET SCIENTIFIC ENVIRONMENT COMPARISON</p>
              <h2 style={{ fontSize: 21, marginTop: 4 }}>
                {activeRegion.shortName} ({activeRegion.planet}) ↔ {activeEarthSite.name} (Earth)
              </h2>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge badge--real">
                {activeRegion.hasLocalDem && activeEarthSite.hasLocalDem
                  ? 'PAIRED 30M DEM QUANTITATIVE COMPARISON ACTIVE'
                  : 'HYBRID ORBITAL / LITERATURE PARAMETER COMPARISON'}
              </span>
              <span className="badge badge--unavailable">
                NON-EQUIVALENT GRAVITY / ATMOSPHERE / RADIATION
              </span>
            </div>
          </div>

          {/* Analog Utility vs. Non-Equivalence Callout Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
              gap: 14,
              marginBottom: 18,
            }}
          >
            <div style={{ padding: 14, background: '#0E1318', border: '1px solid rgba(45, 212, 191, 0.35)', borderRadius: 2 }}>
              <div className="mono" style={{ fontSize: 10.5, color: '#2DD4BF', marginBottom: 6, fontWeight: 600 }}>
                WHY {activeEarthSite.name.split(',')[0]!.toUpperCase()} IS USEFUL AS AN ANALOG
              </div>
              <p style={{ fontSize: 12.5, color: '#E2E8F0', marginBottom: 6 }}>
                <strong>Mission Application:</strong> {activeEarthSite.planetaryApplication}
              </p>
              <p style={{ fontSize: 12, color: '#94A3B8' }}>
                <strong>Geological Correspondence:</strong> {activeEarthSite.geologicalContext}
              </p>
            </div>

            <div style={{ padding: 14, background: '#161111', border: '1px solid rgba(248, 113, 113, 0.4)', borderRadius: 2 }}>
              <div className="mono" style={{ fontSize: 10.5, color: '#FCA5A5', marginBottom: 6, fontWeight: 600 }}>
                WHY EARTH IS NEVER AN EXACT ENVIRONMENTAL EQUIVALENT
              </div>
              <p style={{ fontSize: 12.5, color: '#E2E8F0', marginBottom: 6 }}>
                <strong>Site Boundary:</strong> {activeEarthSite.limitations[0]}
              </p>
              <p style={{ fontSize: 12, color: '#94A3B8' }}>
                <strong>Planetary Boundary:</strong>{' '}
                {activeRegion.planet === 'Mars'
                  ? 'Mars operates at 3.72 m/s² (0.38 g), ~6.1 mbar CO₂ pressure, and ~210–250 mGy/yr GCR radiation—altering wheel sinkage, eolian threshold wind speeds, and oxidant chemistry.'
                  : 'The Moon operates at 1.62 m/s² (0.165 g) in hard exospheric vacuum (< 10⁻¹¹ mbar) with electrostatic agglutinate dust and 40 K polar cold traps unattainable in open terrestrial field sites.'}
              </p>
            </div>
          </div>

          {/* Measurable Parameter Comparison Table */}
          <div style={{ overflowX: 'auto', marginBottom: 18 }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12.5,
                textAlign: 'left',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid #323236', background: '#0E0E11' }}>
                  <th style={{ padding: '10px 12px' }}>Parameter &amp; Layer</th>
                  <th style={{ padding: '10px 12px' }}>
                    {activeRegion.planet}: {activeRegion.shortName}
                  </th>
                  <th style={{ padding: '10px 12px' }}>
                    Earth: {activeEarthSite.name.split(',')[0]}
                  </th>
                  <th style={{ padding: '10px 12px' }}>Assessment &amp; Scientific Note</th>
                  <th style={{ padding: '10px 12px' }}>Traceable Data Source</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.parameter} style={{ borderBottom: '1px solid #232327' }}>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <strong>{row.parameter}</strong>
                      <div className="mono" style={{ fontSize: 10, color: '#94A3B8' }}>
                        Layer: {row.layerTag}
                      </div>
                    </td>
                    <td className="mono" style={{ padding: '10px 12px', verticalAlign: 'top', fontSize: 11.5, color: '#FDE68A' }}>
                      {row.planetValue}
                    </td>
                    <td className="mono" style={{ padding: '10px 12px', verticalAlign: 'top', fontSize: 11.5, color: '#99F6E4' }}>
                      {row.earthValue}
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <span className={`badge badge--${row.statusTone}`} style={{ marginBottom: 4 }}>
                        {row.status}
                      </span>
                      <div style={{ fontSize: 11.5, color: '#A1A1AA', marginTop: 4 }}>{row.note}</div>
                    </td>
                    <td className="mono" style={{ padding: '10px 12px', verticalAlign: 'top', fontSize: 11, color: '#94A3B8' }}>
                      {row.source}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Synchronized 30 m Topographic & Slope Transect Profiler */}
          {transectSamples.length > 0 && activeRegion.hasLocalDem && (
            <div style={{ padding: 14, background: '#0E0E11', border: '1px solid #2A2A2E', borderRadius: 2 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div>
                  <span className="mono" style={{ fontSize: 10.5, color: '#38BDF8', fontWeight: 600 }}>
                    SYNCHRONIZED 3.84 KM TOPOGRAPHIC &amp; SLOPE TRANSECT (30M DEM)
                  </span>
                  <p style={{ fontSize: 12, color: '#9CA3AF' }}>
                    Comparing local relief variation (relative to each grid&apos;s minimum elevation) and Horn slope angle across Yungay (Earth) and {activeRegion.shortName} (Mars).
                  </p>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                  {(['west-east', 'north-south', 'nw-se'] as TransectPreset[]).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`btn ${transectPreset === preset ? 'btn--primary' : ''}`}
                      style={{ padding: '4px 9px', fontSize: 11 }}
                      onClick={() => setTransectPreset(preset)}
                    >
                      {preset.toUpperCase()}
                    </button>
                  ))}
                  <label className="mono" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span>SLICE: {Math.round(transectSlice * 100)}%</span>
                    <input
                      type="range"
                      min={0.1}
                      max={0.9}
                      step={0.05}
                      value={transectSlice}
                      onChange={(e) => setTransectSlice(Number(e.target.value))}
                      style={{ width: 85 }}
                    />
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 12 }}>
                {/* Relative Relief SVG */}
                {(() => {
                  const eVals = transectSamples.map((s) => s.earthElevation ?? 0);
                  const mVals = transectSamples.map((s) => s.marsElevation ?? 0);
                  const eMin = Math.min(...eVals);
                  const mMin = Math.min(...mVals);
                  const maxRel = Math.max(
                    1,
                    ...eVals.map((v) => v - eMin),
                    ...mVals.map((v) => v - mMin)
                  );
                  const ePts = transectSamples
                    .map(
                      (s, i) =>
                        `${((i / (transectSamples.length - 1)) * 440 + 20).toFixed(1)},${(
                          115 -
                          (((s.earthElevation ?? eMin) - eMin) / maxRel) * 90
                        ).toFixed(1)}`
                    )
                    .join(' ');
                  const mPts = transectSamples
                    .map(
                      (s, i) =>
                        `${((i / (transectSamples.length - 1)) * 440 + 20).toFixed(1)},${(
                          115 -
                          (((s.marsElevation ?? mMin) - mMin) / maxRel) * 90
                        ).toFixed(1)}`
                    )
                    .join(' ');

                  return (
                    <div style={{ padding: 10, background: '#131317', border: '1px solid #26262A' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                        <strong>Relative Local Relief Profile (Δm above minimum)</strong>
                        <span className="mono" style={{ color: '#94A3B8' }}>
                          Span 0–{maxRel.toFixed(0)} m
                        </span>
                      </div>
                      <svg viewBox="0 0 480 130" style={{ width: '100%', height: 'auto' }}>
                        <polyline fill="none" stroke="#2DD4BF" strokeWidth="2.2" points={ePts} />
                        <polyline fill="none" stroke="#F59E0B" strokeWidth="2.2" points={mPts} />
                      </svg>
                      <div className="mono" style={{ display: 'flex', gap: 16, fontSize: 10.5, color: '#CBD5E1' }}>
                        <span style={{ color: '#2DD4BF' }}>▬ Yungay (Copernicus GLO-30)</span>
                        <span style={{ color: '#F59E0B' }}>▬ {activeRegion.shortName} (USGS 30m DEM)</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Slope Angle SVG */}
                {(() => {
                  const maxSlope = Math.max(
                    15,
                    ...transectSamples.map((s) => Math.max(s.earthSlope ?? 0, s.marsSlope ?? 0))
                  );
                  const eSlopePts = transectSamples
                    .map(
                      (s, i) =>
                        `${((i / (transectSamples.length - 1)) * 440 + 20).toFixed(1)},${(
                          115 -
                          ((s.earthSlope ?? 0) / maxSlope) * 90
                        ).toFixed(1)}`
                    )
                    .join(' ');
                  const mSlopePts = transectSamples
                    .map(
                      (s, i) =>
                        `${((i / (transectSamples.length - 1)) * 440 + 20).toFixed(1)},${(
                          115 -
                          ((s.marsSlope ?? 0) / maxSlope) * 90
                        ).toFixed(1)}`
                    )
                    .join(' ');

                  return (
                    <div style={{ padding: 10, background: '#131317', border: '1px solid #26262A' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                        <strong>Horn (1981) Slope Profile (°)</strong>
                        <span className="mono" style={{ color: '#94A3B8' }}>
                          0°–{maxSlope.toFixed(1)}°
                        </span>
                      </div>
                      <svg viewBox="0 0 480 130" style={{ width: '100%', height: 'auto' }}>
                        <line
                          x1="20"
                          y1={115 - (15 / maxSlope) * 90}
                          x2="460"
                          y2={115 - (15 / maxSlope) * 90}
                          stroke="rgba(248,113,113,0.45)"
                          strokeDasharray="4 4"
                        />
                        <polyline fill="none" stroke="#2DD4BF" strokeWidth="2" points={eSlopePts} />
                        <polyline fill="none" stroke="#F59E0B" strokeWidth="2" points={mSlopePts} />
                      </svg>
                      <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#CBD5E1' }}>
                        <span>Dashed red line = 15° rover caution threshold</span>
                        <span>3.84 km traverse</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </section>

        {/* ====================================================================
            SECTION 4: ANNOTATED ANALOG COMPARISON MAP GENERATOR
        ==================================================================== */}
        <section id="terraform-generator" className="panel" style={{ padding: 20 }} aria-label="Annotated analog map generator">
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 16 }}>
            <div>
              <p className="atlas-kicker">04 // ANNOTATED ANALOG COMPARISON MAP GENERATOR</p>
              <h2 style={{ fontSize: 21, marginTop: 4 }}>
                Generate &amp; Export Annotated Planetary Analog Map Plate
              </h2>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button type="button" className="btn btn--primary" onClick={handleDownloadPlatePng}>
                <Download size={14} />
                <span>Download Annotated Map (.PNG)</span>
              </button>
              <button type="button" className="btn" onClick={handleDownloadDossierMarkdown}>
                <FileText size={14} />
                <span>Download Scientific Dossier (.MD)</span>
              </button>
            </div>
          </div>

          {/* Annotation Controls */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 14,
              marginBottom: 16,
              padding: 14,
              background: '#0E0E11',
              border: '1px solid #2A2A2E',
              borderRadius: 2,
            }}
          >
            <label style={{ display: 'grid', gap: 6, fontSize: 11.5 }}>
              <span className="mono" style={{ color: '#94A3B8' }}>PLATE TITLE HEADER:</span>
              <input
                type="text"
                value={annotTitle}
                onChange={(e) => setAnnotTitle(e.target.value)}
                style={{
                  padding: '8px 10px',
                  background: '#141418',
                  border: '1px solid #38383D',
                  color: '#F5F5F2',
                  fontSize: 12,
                }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6, fontSize: 11.5 }}>
              <span className="mono" style={{ color: '#94A3B8' }}>INVESTIGATOR SCIENTIFIC ANNOTATION:</span>
              <input
                type="text"
                value={annotNote}
                onChange={(e) => setAnnotNote(e.target.value)}
                style={{
                  padding: '8px 10px',
                  background: '#141418',
                  border: '1px solid #38383D',
                  color: '#F5F5F2',
                  fontSize: 12,
                }}
              />
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, fontSize: 12 }}>
              <span className="mono" style={{ fontSize: 10.5, color: '#94A3B8' }}>PLATE OVERLAY MODULES:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={includeLegendOnPlate}
                    onChange={(e) => setIncludeLegendOnPlate(e.target.checked)}
                  />
                  <span>Layer Legend</span>
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={includeParamsOnPlate}
                    onChange={(e) => setIncludeParamsOnPlate(e.target.checked)}
                  />
                  <span>Parameter Matrix</span>
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={includeSourcesOnPlate}
                    onChange={(e) => setIncludeSourcesOnPlate(e.target.checked)}
                  />
                  <span>Dataset Citations</span>
                </label>
              </div>
            </div>
          </div>

          {/* Live Rendered 1600x1020 Annotated Comparison Plate Preview */}
          <div
            style={{
              border: '1px solid #323236',
              background: '#06080D',
              padding: 10,
              borderRadius: 2,
              overflowX: 'auto',
            }}
          >
            <canvas
              ref={exportCanvasRef}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: 2,
              }}
              aria-label="Generated annotated planetary analog comparison map plate"
            />
          </div>
        </section>

        {/* ====================================================================
            SECTION 5: TRACEABLE NASA & SPACE AGENCY PARTNER DATASET REGISTRY
        ==================================================================== */}
        <section className="panel" style={{ padding: 20 }} aria-label="NASA and Space Agency Partner Datasets">
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 14 }}>
            <div>
              <p className="atlas-kicker">05 // NASA &amp; PARTNER SPACE AGENCY DATA INTEGRATION</p>
              <h2 style={{ fontSize: 19, marginTop: 4 }}>
                Traceable Scientific Archives &amp; Page-by-Page Dataset Allocation
              </h2>
            </div>
            <button type="button" className="btn" onClick={() => setSrsModalOpen(true)}>
              <Info size={14} />
              <span>View Full SRS &amp; Dataset Selection Architecture</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 12 }}>
            {Object.values(SOURCE_REGISTRY).map((src) => (
              <div
                key={src.id}
                style={{
                  padding: 12,
                  background: '#0E0E11',
                  border: '1px solid #28282C',
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 6,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <span className="mono" style={{ fontSize: 10, color: '#38BDF8' }}>
                      {src.sourceType.toUpperCase()}
                    </span>
                    <span className="mono" style={{ fontSize: 10, color: '#94A3B8' }}>
                      {src.date}
                    </span>
                  </div>
                  <strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>{src.title}</strong>
                  <div style={{ fontSize: 11.5, color: '#9CA3AF' }}>{src.institution}</div>
                </div>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mono"
                  style={{ fontSize: 10.5, color: '#E2E8F0', textDecoration: 'underline', marginTop: 4 }}
                >
                  Inspect Official Archive ↗
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ====================================================================
          MODAL: FULL PAGE SRS & DATASET RECOMMENDATION ARCHITECTURE
      ==================================================================== */}
      {srsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="TERRAFORM Software Requirements Specification and Dataset Matrix"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0, 0, 0, 0.84)',
            backdropFilter: 'blur(6px)',
            display: 'grid',
            placeItems: 'center',
            padding: 20,
          }}
        >
          <div
            className="panel"
            style={{
              width: 'min(1180px, 96vw)',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 28,
              background: '#090B10',
              border: '1px solid #3F3F46',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
              <div>
                <p className="atlas-kicker">SOFTWARE REQUIREMENTS SPECIFICATION (SRS) // IEEE-830 ADAPTED</p>
                <h2 style={{ fontSize: 24, marginTop: 4 }}>
                  TERRAFORM — Planetary Analog Mapping &amp; Dataset Architecture
                </h2>
              </div>
              <button type="button" className="btn btn--primary" onClick={() => setSrsModalOpen(false)}>
                Close SRS
              </button>
            </div>

            <div style={{ display: 'grid', gap: 18, fontSize: 13, lineHeight: 1.6, color: '#D4D4D8' }}>
              <div style={{ padding: 16, background: '#11131A', border: '1px solid #27272A' }}>
                <h3 style={{ fontSize: 16, marginBottom: 8, color: '#FFFFFF' }}>
                  1. Purpose &amp; Scope (NASA Space Apps 2026 Challenge Alignment)
                </h3>
                <p>
                  <strong>TERRAFORM</strong> replaces the textbook-style Learn page with an interactive planetary cartography and analog discovery workstation. It enables users to: (1) select a Moon or Mars region, (2) inspect 9 measurable scientific surface layers, (3) filter and locate terrestrial analog sites on an interactive Earth GIS map, (4) compare measured topographic and environmental parameters while enforcing strict datum and non-equivalence boundaries, and (5) export a publication-grade 1600×1020 annotated comparison plate (.PNG) and Markdown dossier (.MD).
                </p>
              </div>

              <div style={{ padding: 16, background: '#11131A', border: '1px solid #27272A' }}>
                <h3 style={{ fontSize: 16, marginBottom: 8, color: '#FFFFFF' }}>
                  2. Page-by-Page Prioritized Dataset Allocation Matrix (Time-Constrained Optimal Selection)
                </h3>
                <p style={{ marginBottom: 10, color: '#A1A1AA' }}>
                  Because integrating every global multi-terabyte archive in real time is infeasible within hackathon constraints, datasets are tiered into <strong>Tier 1 (Bundled Local 30 m Rasters &amp; Live WMTS Tiles)</strong> and <strong>Tier 2 (Traceable Literature &amp; Spectral Metadata Profiles)</strong>:
                </p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #3F3F46', background: '#18181B' }}>
                        <th style={{ padding: 8 }}>Application Page</th>
                        <th style={{ padding: 8 }}>Earth Datasets Used</th>
                        <th style={{ padding: 8 }}>Moon Datasets Used</th>
                        <th style={{ padding: 8 }}>Mars Datasets Used</th>
                        <th style={{ padding: 8 }}>Integration Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #27272A' }}>
                        <td style={{ padding: 8 }}><strong>Landing (`/`) &amp; Overview (`/analog/`)</strong></td>
                        <td style={{ padding: 8 }}>NASA DSCOVR EPIC, Blue Marble Next Gen, Copernicus GLO-30 preview</td>
                        <td style={{ padding: 8 }}>NASA SVS CGI Moon Kit (LRO LOLA + LROC WAC color map)</td>
                        <td style={{ padding: 8 }}>NASA/JPL Mars Global Mosaic &amp; Gale HiRISE orthophoto</td>
                        <td style={{ padding: 8 }}>Bundled WebGL textures &amp; hero comparison plates</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #27272A' }}>
                        <td style={{ padding: 8 }}><strong>Explore (`/analog/explore`)</strong></td>
                        <td style={{ padding: 8 }}>ESA Copernicus GLO-30 (Yungay 30m JSON) + Esri/Maxar World Imagery tiles</td>
                        <td style={{ padding: 8 }}>LRO LOLA &amp; Diviner Shackleton/Marius literature profiles + LROC WAC map</td>
                        <td style={{ padding: 8 }}>USGS Gale Merged DEM 1m→30m (Murray &amp; Bradbury JSON) + HiRISE orthophoto</td>
                        <td style={{ padding: 8 }}>Guided 5-step investigation + live Leaflet &amp; 30m DEM canvas</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #27272A' }}>
                        <td style={{ padding: 8 }}><strong>TERRAFORM (`/analog/learn`)</strong></td>
                        <td style={{ padding: 8 }}>NASA GIBS/Worldview WMTS, Esri/Maxar, OpenTopoMap (SRTM), Copernicus GLO-30 30m DEM, CSA RADARSAT-1 (Haughton SAR metadata), ESA Sentinel-2</td>
                        <td style={{ padding: 8 }}>NASA PDS LRO LOLA (topography/slope), LROC NAC/WAC (craters/skylights), LRO Diviner (polar K temperature &amp; PSR shadows)</td>
                        <td style={{ padding: 8 }}>NASA PDS / USGS Gale 30m DEM, MGS MOLA (datum), MRO HiRISE &amp; CTX (morphology), Mars Odyssey THEMIS &amp; MSL REMS (thermal), MRO CRISM (minerals)</td>
                        <td style={{ padding: 8 }}>9-layer interactive canvas + solar shadow ray-caster + Leaflet multi-tile GIS + PNG plate generator</td>
                      </tr>
                      <tr>
                        <td style={{ padding: 8 }}><strong>Research (`/analog/research`)</strong></td>
                        <td style={{ padding: 8 }}>Copernicus GLO-30 128×128 30m DEM + Azua-Bustos et al. (2020) XRD/smectite assay</td>
                        <td style={{ padding: 8 }}>Explicitly marked `UNAVAILABLE` for 30m quantitative DEM diffing (scientific integrity guardrail)</td>
                        <td style={{ padding: 8 }}>USGS Gale Murray &amp; Bradbury 128×128 30m DEMs + NASA PDS MSL CheMin/SAM records</td>
                        <td style={{ padding: 8 }}>Synchronized 3D R3F/2D studio, Horn slope/TRI histograms, datum-checked Δ grids &amp; Markdown report</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ padding: 16, background: '#11131A', border: '1px solid #27272A' }}>
                <h3 style={{ fontSize: 16, marginBottom: 8, color: '#FFFFFF' }}>
                  3. Functional &amp; Scientific Integrity Requirements (FR-01 to FR-07)
                </h3>
                <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
                  <li><strong>FR-01 (Planetary Map):</strong> Interactive Mars &amp; Moon selector with 6 target regions, 100%–275% zoom/pan, clickable geological waypoints (F1–F3), and 30 m grid cell telemetry.</li>
                  <li><strong>FR-02 (Earth Map):</strong> Interactive Leaflet GIS map with 3 switchable basemaps (Esri/Maxar Satellite, NASA GIBS Blue Marble WMTS, OpenTopoMap SRTM) + local 30 m Copernicus GLO-30 DEM canvas mode.</li>
                  <li><strong>FR-03 (9 Scientific Layers):</strong> Elevation, Horn Slope, TRI Surface Roughness, Terrain Morphology, Crater Distribution, Surface Temperature, Solar Exposure, Shadow Patterns (ray-marched), and Surface Characteristics.</li>
                  <li><strong>FR-04 (Earth-to-Planet Comparison):</strong> Side-by-side measurable parameter table with units, datum-incompatibility guardrails (EGM2008 vs. MOLA Areoid), and synchronized 3.84 km elevation/slope transects.</li>
                  <li><strong>FR-05 (Non-Equivalence Principle):</strong> Every comparison and exported plate explicitly documents why Earth never replicates lunar vacuum (&lt;10⁻¹¹ mbar), Martian CO₂ pressure (6.1 mbar), reduced gravity (0.165 g / 0.38 g), or unshielded GCR radiation.</li>
                  <li><strong>FR-06 (Annotated Map Generator):</strong> Client-side 1600×1020 HTML5 Canvas compositor exporting a publication-ready `.PNG` comparison plate and `.MD` scientific dossier.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      </details>
    </main>
  );
};

export default LearnPage;
