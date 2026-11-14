import { AnalogSite, PlanetaryTarget, ResearchObjective } from '../types';

export const PLANETARY_TARGETS: PlanetaryTarget[] = [
  {
    id: 'jezero-crater',
    name: 'Jezero Crater',
    planet: 'MARS',
    coordinates: '18.38°N, 77.58°E',
    geologicFeature: 'Paleolake Delta & Carbonate Rim',
    missionRelevance: 'NASA Mars 2020 Perseverance Rover primary landing & sample caching site.',
    primaryInstruments: ['MRO HiRISE', 'CRISM Spectrometer', 'Perseverance Mastcam-Z', 'SHERLOC UV Raman']
  },
  {
    id: 'shackleton-crater',
    name: 'Shackleton Crater',
    planet: 'MOON',
    coordinates: '89.9°S, 0.0°E',
    geologicFeature: 'Permanently Shadowed Region (PSR)',
    missionRelevance: 'NASA Artemis III & Permanent Lunar Base candidate with ultra-cold volatile water-ice cold traps.',
    primaryInstruments: ['LRO LOLA Laser Altimeter', 'LRO Diviner Thermal Radiometer', 'Chandrayaan-2 OHRC']
  },
  {
    id: 'olympus-lava-tubes',
    name: 'Tharsis Volcanic Plateau',
    planet: 'MARS',
    coordinates: '18.65°N, 226.2°E',
    geologicFeature: 'Subsurface Lava Tubes & Collapse Skylights',
    missionRelevance: 'Natural radiation shielding and pressurizable habitats for future human planetary base camps.',
    primaryInstruments: ['Mars Odyssey THEMIS', 'MRO CTX', 'Mars Express HRSC']
  },
  {
    id: 'schrodinger-basin',
    name: 'Schrödinger Basin (SPA)',
    planet: 'MOON',
    coordinates: '75.0°S, 132.4°E',
    geologicFeature: 'South Pole-Aitken Impact Melt Sheet & Volcanic Vents',
    missionRelevance: 'Deepest lunar impact crust exposure for mantle sampling and lunar geology timeline anchoring.',
    primaryInstruments: ['Kaguya TC', 'LRO LROC NAC', 'Chandrayaan-1 Moon Mineralogy Mapper (M3)']
  }
];

export const RESEARCH_OBJECTIVES: ResearchObjective[] = [
  {
    id: 'GEOLOGY',
    title: 'Geological & Mineralogical Synthesis',
    shortTitle: 'Geology & Minerals',
    tagline: 'Lithology, impact cratering, stratigraphy and shock metamorphism',
    description: 'Investigates rock formations, mineral spectroscopy, hydrothermal alteration, and preserved crater morphologies on Earth that reflect target planet processes.',
    primaryVariables: ['Primary Lithology', 'Mineralogical Spectra', 'Impact Breccia Ratio', 'Stratigraphic Exposure'],
    recommendedPlanet: 'BOTH',
    icon: 'Layers'
  },
  {
    id: 'ROVER_MOBILITY',
    title: 'Robotic Mobility & Terrain Traversability',
    shortTitle: 'Rover Traversability',
    tagline: 'Slope angles, wheel sinkage, boulder distributions and obstacle negotiation',
    description: 'Quantifies slope hazards, terrain roughness ($Ra$), regolith shear strength, and wheel-abrasion physics to validate autonomous rover navigation algorithms.',
    primaryVariables: ['Mean & Max Slope', 'RMS Roughness', 'Regolith Bearing Capacity', 'Boulder Spatial Density'],
    recommendedPlanet: 'MARS',
    icon: 'Compass'
  },
  {
    id: 'INSTRUMENT_TESTING',
    title: 'Scientific Payload & Instrument Validation',
    shortTitle: 'Instrument Calibration',
    tagline: 'Drill mechanics, Raman/LIBS spectroscopy, sample return protocol',
    description: 'Benchmarking surface-penetrating radar, Raman spectrometers, X-ray diffraction, and automated coring systems in unforgiving, field-stress environments.',
    primaryVariables: ['Subsurface Dielectric Permittivity', 'Aerosol Contamination', 'Spectral Signal-to-Noise', 'Sampling Core Cohesion'],
    recommendedPlanet: 'BOTH',
    icon: 'Cpu'
  },
  {
    id: 'ASTROBIOLOGY',
    title: 'Astrobiology, Biosignatures & Extremophiles',
    shortTitle: 'Astrobiology & Life',
    tagline: 'Microbial endoliths, dry-limit biosignatures, water-rock alteration',
    description: 'Searching for microbial life in hyper-arid, UV-irradiated, and hypersaline environments to determine criteria for past habitability on Mars and icy moons.',
    primaryVariables: ['Water Activity ($a_w$)', 'UV Radiation Flux', 'Organic Preservation Index', 'Microbial Biosignature Matrix'],
    recommendedPlanet: 'MARS',
    icon: 'Dna'
  },
  {
    id: 'ISRU_RESOURCES',
    title: 'In-Situ Resource Utilization (ISRU)',
    shortTitle: 'Resource Extraction',
    tagline: 'Volatiles, ilmenite oxygen production, cryogenic ice excavation',
    description: 'Evaluating locations offering cryogenic permafrost, volcanic glass, or hydrous minerals for rocket propellant production and habitat construction regolith.',
    primaryVariables: ['Water/Hydrate Equivalent Mass %', 'Ilmenite/Fe-Ti Fraction', 'Overburden Thickness', 'Thermal Inertia'],
    recommendedPlanet: 'MOON',
    icon: 'Boxes'
  },
  {
    id: 'HUMAN_OPERATIONS',
    title: 'Human Exploration & Habitat Architecture',
    shortTitle: 'Human Habitat Ops',
    tagline: 'Isolation, EVA operations, pressurized suit ergonomics, logistics',
    description: 'Simulating crew autonomy, extravehicular activity (EVA) workload, communication latencies, and habitat life support in extreme geographic isolation.',
    primaryVariables: ['Geographic Isolation Radius', 'Extreme Weather Variability', 'Logistical Supply Chain', 'EVA Terrain Hazard Index'],
    recommendedPlanet: 'BOTH',
    icon: 'Users'
  }
];

export const ANALOG_SITES: AnalogSite[] = [
  {
    id: 'lake-salda',
    name: 'Lake Salda Hydromagnesite Shoreline',
    shortCode: 'TR-SLD-01',
    region: 'Burdur Basin, Anatolia',
    country: 'Turkey',
    lat: 37.5544,
    lng: 29.7128,
    planetTarget: 'MARS',
    targetFeatureName: 'Jezero Crater Paleolake Delta',
    environmentType: 'LACUSTRINE_MAAR',
    elevationMeters: 1180,
    meanSlopeDeg: 4.8,
    maxSlopeDeg: 14.2,
    roughnessRa: 0.18,
    meanTempC: 15.2,
    diurnalTempDeltaC: 18.5,
    primaryLithology: 'Hydromagnesite microbialites, serpentinite detritus, alluvial carbonates',
    keyMinerals: ['Hydromagnesite', 'Aragonite', 'Serpentine', 'Magnesite', 'Smectite'],

    targetElevationMeters: -2500,
    targetSlopeDeg: 5.2,
    targetRoughnessRa: 0.22,
    targetMeanTempC: -63.0,
    targetMinerals: ['Mg-Carbonate', 'Olivine', 'Smectite clay', 'Pyroxene'],

    analogyStrengths: [
      'Highest known terrestrial morphological and mineralogical match to Jezero Crater delta carbonates',
      'Preserves modern and fossilized microbialite bio-constructs identical to candidate Martian stromatolites',
      'Alluvial apron morphology matches river delta depositional energy patterns mapped by HiRISE'
    ],
    analogyLimitations: [
      'Earth ambient pressure (101 kPa vs 0.6 kPa on Mars) and active precipitation cycle',
      'Abundant liquid freshwater vs hyper-arid desiccated modern Martian environment',
      'Terrestrial modern biogenic contamination must be strictly calibrated against abiotic baseline'
    ],
    scientificFidelity: 94,
    fieldFeasibility: 89,
    readinessTier: 'TIER_1_IMMEDIATE',
    readinessRationale: 'High spectral match confirmed by NASA Mars 2020 science team; accessible via road with high environmental protection protocols.',
    permitAuthority: 'Turkish Ministry of Environment, Urbanisation and Climate Change (Special Environmental Protection Area)',
    travelDifficulty: 'ACCESSIBLE',
    seasonalWindow: 'April – October (Optimal water level and dry shore accessibility)',
    hazards: ['Fragile microbial structures', 'Sun exposure', 'Strict ecological non-disturbance zone'],
    missions: ['NASA Mars 2020', 'ESA ExoMars', 'Copernicus Sentinel-2', 'Landsat-9'],
    datasets: ['Sentinel-2 MSI Level-2A', 'ASTER Surface Reflectance', 'USGS 30m SRTM DEM'],
    resolutionInfo: '10m Multi-spectral / 1m Drone Orthomosaic / In-situ XRD',
    imageThumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    quote: '"Salda is one of the only places on Earth that mirrors Jezero\'s unique mineral carbonates and shoreline delta architecture." — NASA Science Directorate'
  },
  {
    id: 'askja-volcanic',
    name: 'Askja Caldera & Holuhraun Lava Field',
    shortCode: 'IS-ASK-04',
    region: 'Central Highlands',
    country: 'Iceland',
    lat: 65.0333,
    lng: -16.7500,
    planetTarget: 'BOTH',
    targetFeatureName: 'Apollo Lunar Highlands / Martian Tharsis Lava Sheets',
    environmentType: 'VOLCANIC',
    elevationMeters: 1050,
    meanSlopeDeg: 12.4,
    maxSlopeDeg: 28.6,
    roughnessRa: 0.85,
    meanTempC: -1.5,
    diurnalTempDeltaC: 14.0,
    primaryLithology: 'Aphyric basalt, pumice tephra, vesicular pahoehoe and aa lavas',
    keyMinerals: ['Plagioclase Feldspar', 'Augite Pyroxene', 'Forsterite Olivine', 'Titanomagnetite'],

    targetElevationMeters: 1200,
    targetSlopeDeg: 14.0,
    targetRoughnessRa: 0.92,
    targetMeanTempC: -23.0,
    targetMinerals: ['Anorthosite', 'High-Ti Basalt', 'Pyroxene', 'Impact Glass'],

    analogyStrengths: [
      'Historic Apollo 11, 14, 15, and 17 astronaut planetary geology field training territory',
      'Pristine basalt roughness and radar backscatter closely mimics young lunar and martian volcanic plains',
      'Devoid of vegetation over hundreds of square kilometers, providing unoccluded visual and spectral signatures'
    ],
    analogyLimitations: [
      'Terrestrial atmospheric weathering, snow cover, and seasonal glacial melt runoff',
      'Higher gravity (1.0g vs 0.16g Moon / 0.38g Mars) influences pyroclastic ballistics',
      'Significant active hydrothermal degassing absent on the contemporary Moon'
    ],
    scientificFidelity: 91,
    fieldFeasibility: 82,
    readinessTier: 'TIER_1_IMMEDIATE',
    readinessRationale: 'Established international space agency training grounds (ESA PANGAEA, NASA). Requires 4x4 highland expedition vehicles.',
    permitAuthority: 'Vatnajökull National Park / Environment Agency of Iceland',
    travelDifficulty: 'MODERATE',
    seasonalWindow: 'July – August (Highland roads F88/F910 open only during summer)',
    hazards: ['Sudden blizzard whiteouts', 'Unbridged river crossings', 'Volcanic gas emissions'],
    missions: ['NASA Apollo', 'ESA PANGAEA', 'LRO LOLA', 'MRO CTX'],
    datasets: ['Copernicus DEM 30m', 'TerraSAR-X High-Res Spotlight', 'AVIRIS-NG Airborne Spectroscopy'],
    resolutionInfo: '12m SAR Interferometry / 0.5m UAV LiDAR',
    imageThumbnail: 'https://images.unsplash.com/photo-1508873696983-2df5293cbdaf?auto=format&fit=crop&w=1200&q=80',
    quote: '"Walking across the Askja pumice was the closest feeling Neil and Buzz had to walking on the lunar regolith." — Dr. Farouk El-Baz'
  },
  {
    id: 'haughton-crater',
    name: 'Haughton Impact Structure',
    shortCode: 'CA-HGT-02',
    region: 'Devon Island, Nunavut',
    country: 'Canada',
    lat: 75.3833,
    lng: -89.6833,
    planetTarget: 'MARS',
    targetFeatureName: 'Martian Complex Impact Craters & Paleoglaciers',
    environmentType: 'IMPACT_CRATER',
    elevationMeters: 250,
    meanSlopeDeg: 18.2,
    maxSlopeDeg: 34.0,
    roughnessRa: 0.65,
    meanTempC: -17.8,
    diurnalTempDeltaC: 12.0,
    primaryLithology: 'Shatter cones, shocked dolomite breccias, impact melt rock, permafrost regolith',
    keyMinerals: ['Shocked Dolomite', 'Anhydrite', 'Gypsum', 'Impact Melt Glasses', 'Quartz Shock Lamellae'],

    targetElevationMeters: -1200,
    targetSlopeDeg: 19.5,
    targetRoughnessRa: 0.70,
    targetMeanTempC: -55.0,
    targetMinerals: ['Impact Breccia', 'Pyroxene', 'Hydrated Silica', 'Sulfates'],

    analogyStrengths: [
      'Polar desert environment with continuous permafrost and dry subzero temperatures',
      'Complex 23-km impact crater with central peak and hydrothermal paleovents mirroring Mars impact lakes',
      'Home to the NASA Haughton-Mars Project (HMP) with extensive rover and EVA procedure archives'
    ],
    analogyLimitations: [
      'Sedimentary target rock (dolomite/limestone) unlike mostly basaltic Martian volcanic crust',
      'Extreme logistical cost and short operational window limited by Arctic freeze-up',
      'Atmospheric pressure and UV shielding by Earth ozone layer'
    ],
    scientificFidelity: 92,
    fieldFeasibility: 64,
    readinessTier: 'TIER_2_EXPEDITION',
    readinessRationale: 'World-class scientific fidelity for impact geology and cold desert conditions, but requires chartered twin-otter aircraft and high logistical funding.',
    permitAuthority: 'Nunavut Research Institute / Qikiqtani Inuit Association',
    travelDifficulty: 'EXPEDITION_GRADE',
    seasonalWindow: 'July 5 – August 10 (Arctic summer thaw period)',
    hazards: ['Polar bear encounters', 'Severe hypothermia', 'Extreme isolation (100+ km from nearest settlement)'],
    missions: ['NASA Haughton-Mars Project', 'Mars Odyssey', 'Radarsat Constellation'],
    datasets: ['Radarsat-2 Ultra-Fine', 'WorldView-3 SWIR', 'ArcticDEM 2m Surface Model'],
    resolutionInfo: '2m ArcticDEM / 0.3m Satellite Panchromatic / In-situ Core Drilling',
    imageThumbnail: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1200&q=80',
    quote: '"Devon Island is considered the most Mars-like place on Earth: barren, freezing, rocky, and completely uninhabited."'
  },
  {
    id: 'atacama-yungay',
    name: 'Atacama Hyper-Arid Core (Yungay Basin)',
    shortCode: 'CL-ATC-07',
    region: 'Antofagasta Region',
    country: 'Chile',
    lat: -24.0833,
    lng: -69.9167,
    planetTarget: 'MARS',
    targetFeatureName: 'Martian Dry Equatorial Plains & Chloride Salt Deposits',
    environmentType: 'HYPER_ARID',
    elevationMeters: 960,
    meanSlopeDeg: 3.2,
    maxSlopeDeg: 9.8,
    roughnessRa: 0.12,
    meanTempC: 19.5,
    diurnalTempDeltaC: 28.0,
    primaryLithology: 'Nitrate and perchlorate-bearing salt crusts, gypsum, volcanic ash deposits',
    keyMinerals: ['Halite', 'Gypsum', 'Perchlorates', 'Nitratine', 'Anhydrite', 'Iron Oxides'],

    targetElevationMeters: 500,
    targetSlopeDeg: 3.5,
    targetRoughnessRa: 0.15,
    targetMeanTempC: -45.0,
    targetMinerals: ['Chloride Salts', 'Perchlorates', 'Hematite', 'Sulfates'],

    analogyStrengths: [
      'The driest non-polar spot on Earth with precipitation < 1 mm/century in hyper-arid zones',
      'Presence of natural perchlorates and oxidants directly matching Phoenix and Curiosity rover soil chemistry',
      'Benchmark for the absolute dry limit of terrestrial microbial life and UV-shielded endoliths'
    ],
    analogyLimitations: [
      'High ambient temperatures during daytime ($>35^\circ$C) compared to Mars ($<-20^\circ$C)',
      'Substantial atmospheric nitrogen and oxygen',
      'Gravity difference alters dust suspension behavior and saltation thresholds'
    ],
    scientificFidelity: 95,
    fieldFeasibility: 92,
    readinessTier: 'TIER_1_IMMEDIATE',
    readinessRationale: 'Exceptional astrobiological analog; straightforward road access from Antofagasta with year-round operational viability.',
    permitAuthority: 'Chilean Ministry of Mining & National Monuments Council (CMN)',
    travelDifficulty: 'ACCESSIBLE',
    seasonalWindow: 'Year-Round (Optimal March – November for moderate day temperatures)',
    hazards: ['Dehydration', 'Extreme solar ultraviolet index (>14)', 'Flash salt fog (Camanchaca) at night'],
    missions: ['NASA Astrobiology Institute', 'Curiosity REMS', 'Copernicus Sentinel-2'],
    datasets: ['Landsat-8 OLI/TIRS', 'ASTER Thermal Infrared', 'Copernicus 30m Global DEM'],
    resolutionInfo: '15m Multispectral / Ground Raman & Soil Humidity Loggers',
    imageThumbnail: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
    quote: '"Atacama is where Mars rover life-detection instruments are tested to their utmost detection limits."'
  },
  {
    id: 'craters-moon-idaho',
    name: 'Craters of the Moon Great Rift',
    shortCode: 'US-IDH-09',
    region: 'Snake River Plain, Idaho',
    country: 'United States',
    lat: 43.4617,
    lng: -113.5628,
    planetTarget: 'MOON',
    targetFeatureName: 'Oceanus Procellarum Lunar Mare & Sinuous Rilles',
    environmentType: 'LAVA_TUBE',
    elevationMeters: 1790,
    meanSlopeDeg: 8.5,
    maxSlopeDeg: 22.0,
    roughnessRa: 0.58,
    meanTempC: 8.4,
    diurnalTempDeltaC: 22.0,
    primaryLithology: 'Holocene basaltic cinder cones, spatter ramparts, tube-fed pahoehoe flows',
    keyMinerals: ['Olivine Basalt', 'Glassy Sideromelane', 'Magnetite', 'Clinopyroxene'],

    targetElevationMeters: -1500,
    targetSlopeDeg: 9.0,
    targetRoughnessRa: 0.65,
    targetMeanTempC: -40.0,
    targetMinerals: ['Titaniferous Mare Basalt', 'Agglutinate Glass', 'Ilmenite', 'Anorthite'],

    analogyStrengths: [
      'Continuous intact subsurface lava tubes offering structural cross-sections of volcanic conduits',
      'Apollo 14 astronaut geological training location for identifying vesicular volcanic textures',
      'Provides analog for lunar regolith trafficability, tire degradation, and cave entrance LiDAR mapping'
    ],
    analogyLimitations: [
      'Atmospheric oxidation creates ferric iron ($Fe^{3+}$) whereas lunar basalts are highly reduced ($Fe^{2+}$)',
      'Vegetation succession in cracks over decades',
      'Earth gravity allows larger lava tube ceiling spans than Moon theory predicts'
    ],
    scientificFidelity: 88,
    fieldFeasibility: 96,
    readinessTier: 'TIER_1_IMMEDIATE',
    readinessRationale: 'Paved highway access right through National Monument, established visitor infrastructure, ideal for rover wheel test runs.',
    permitAuthority: 'US National Park Service (Scientific Research and Collecting Permit)',
    travelDifficulty: 'ACCESSIBLE',
    seasonalWindow: 'May – October (Winter brings heavy snow accumulation on basalt flows)',
    hazards: ['Sharp, razor-like aa basalt edges', 'Cave roof instability', 'Rattlesnakes during summer'],
    missions: ['NASA Apollo 14', 'NASA FINESSE Project', 'LRO Mini-RF Radar'],
    datasets: ['USGS 3DEP 1m LiDAR', 'NAIP High-Res Aerial', 'Sentinel-1 InSAR'],
    resolutionInfo: '1m USGS LiDAR Digital Terrain Model / Subsurface Cave Point Cloud',
    imageThumbnail: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
    quote: '"The young basaltic formations and cavernous conduits are a direct physical analog to sinuous rilles across the lunar mare."'
  },
  {
    id: 'mcmurdo-dry-valleys',
    name: 'McMurdo Dry Valleys (Beacon Valley)',
    shortCode: 'AQ-MCM-05',
    region: 'Victoria Land',
    country: 'Antarctica',
    lat: -77.8167,
    lng: 160.6667,
    planetTarget: 'BOTH',
    targetFeatureName: 'Lunar South Pole Cold Traps / Martian Ground Ice Polygonal Soils',
    environmentType: 'POLAR_DESERT',
    elevationMeters: 1400,
    meanSlopeDeg: 14.5,
    maxSlopeDeg: 31.0,
    roughnessRa: 0.42,
    meanTempC: -20.2,
    diurnalTempDeltaC: 16.0,
    primaryLithology: 'Buried glacial relict ice, dolerite boulders, polygonal permafrost regolith',
    keyMinerals: ['Subsurface Massive Ice', 'Ferrar Dolerite', 'Jarosite', 'Halite Efflorescence'],

    targetElevationMeters: -3800,
    targetSlopeDeg: 16.0,
    targetRoughnessRa: 0.48,
    targetMeanTempC: -180.0,
    targetMinerals: ['Water-Ice Matrix', 'Impact Regolith', 'Troilite', 'Silicate dust'],

    analogyStrengths: [
      'Subsurface relict ice preserved beneath dry regolith for >8 million years, analogous to Martian ground ice',
      'Catabatic winds exceeding 320 km/h scour moisture, producing a hyper-cold, snow-free landscape',
      'Polygonal patterned ground directly matches Phoenix Lander trench observations in Vastitas Borealis'
    ],
    analogyLimitations: [
      'Presence of oxygenated atmosphere, albeit ultra-dry',
      'Lunar South Pole is substantially colder (30–40 Kelvin in permanent shadows)',
      'Subsurface ice is meteoric rather than cometary or primordial volatile deposits'
    ],
    scientificFidelity: 97,
    fieldFeasibility: 52,
    readinessTier: 'TIER_2_EXPEDITION',
    readinessRationale: 'Ultimate scientific fidelity for planetary cryogenic permafrost, but strictly regulated under the Antarctic Treaty System with extreme operational overhead.',
    permitAuthority: 'National Science Foundation (USAP) / Antarctic Treaty Consultative Parties',
    travelDifficulty: 'EXPEDITION_GRADE',
    seasonalWindow: 'November – February (Austral summer daylight and LC-130 ski-plane flights)',
    hazards: ['Katabatic wind storms', 'Crevasse fields', 'Subzero hypothermia', 'Extreme isolation'],
    missions: ['NASA Phoenix', 'NASA Artemis', 'LRO Diviner', 'ESA CryoSat-2'],
    datasets: ['REMA (Reference Elevation Model of Antarctica) 2m', 'Landsat-8 LIMA', 'MODIS Surface Temperature'],
    resolutionInfo: '2m REMA Stereophotogrammetry / Ground-Penetrating Radar profiles',
    imageThumbnail: 'https://images.unsplash.com/photo-1548777123-e216912df7d8?auto=format&fit=crop&w=1200&q=80',
    quote: '"Beacon Valley holds the oldest ice on Earth beneath a thin layer of dry dirt, exactly like the ice trapped on Mars."'
  }
];

