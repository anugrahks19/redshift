import type {
  ComparisonFactorItem,
  EarthEnvironmentDef,
  EarthEnvironmentId,
  MissionDecisionOption,
  MissionObjectiveId,
  MissionStage,
  MissionTemplateDef,
  PlanetaryDestinationDef,
  SimulationWaypoint,
  TerrainType,
  VehicleType,
} from '../types/mission';

export const MISSION_STAGE_ORDER: { id: MissionStage; step: string; short: string; label: string }[] = [
  { id: 'template', step: '01', short: 'Mission', label: 'Select Mission' },
  { id: 'environment', step: '02', short: 'Earth Site', label: 'Earth Environment' },
  { id: 'configure', step: '03', short: 'Systems', label: 'Rover & Systems' },
  { id: 'earth-sim', step: '04', short: 'Earth Run', label: 'Earth Simulation' },
  { id: 'transfer', step: '05', short: 'Transfer', label: 'Transfer World' },
  { id: 'planet-sim', step: '06', short: 'Mars / Moon', label: 'Planetary Simulation' },
  { id: 'challenge', step: '07', short: 'Event', label: 'Mission Challenge' },
  { id: 'debrief', step: '08', short: 'Debrief', label: 'Mission Debrief' },
];

export const MISSION_TEMPLATES: MissionTemplateDef[] = [
  {
    id: 'rock-explorer',
    code: 'MSN-01',
    title: 'Mission 1: The Red Planet Survival Challenge (Atacama → Mars)',
    supportLevel: 'full',
    supportLabel: 'Primary Space Apps Mission (NASADEM + MODIS + MOLA)',
    objectiveSummary: 'Explore Atacama NASADEM & MODIS LST, transfer to Mars MOLA/HiRISE, and evaluate human survival boundaries.',
    description:
      'Trace exposed bedrock ridges, compacted desert crusts, and subsurface clay horizons in Yungay (NASADEM 30 m & MODIS MOD11A2 1 km), then transfer to Mars (MOLA MEGDR & Gale 30 m) to compare 0.13% O₂ and 6.1 mbar pressure against Earth.',
    analogRelevance:
      'Mirrors planetary field geology campaigns in Yungay (Atacama) and Jezero / Gale Crater.',
    recommendedVehicle: 'rover',
    recommendedTerrain: 'rocky',
    recommendedObjective: 'geological-survey',
    defaultEnergy: 65,
    emphasisTags: ['NASADEM 30m', 'MODIS MOD11A2', 'MOLA MEGDR', 'Spacesuit Survival'],
  },
  {
    id: 'base-builder',
    code: 'MSN-02',
    title: 'Mission 2: The Lunar South Pole Expedition (McMurdo → Shackleton)',
    supportLevel: 'full',
    supportLabel: 'Primary Space Apps Mission (LOLA 30m + Diviner PCP)',
    objectiveSummary: 'Explore McMurdo Dry Valleys polar terrain, transfer to Shackleton Crater, and evaluate candidate base sites.',
    description:
      'Investigate Antarctic polar valleys (McMurdo 30 m DEM & MODIS LST), transfer to the Lunar South Pole (LRO LOLA LDEM_75S_30M & Diviner PCP 240 m bolometric temperature: 41.7 K PSR to 223.9 K ridge), and identify missing safety criteria for a permanent lunar base.',
    analogRelevance:
      'Assesses polar volatile cold traps, steep crater scarps, and why topography + thermal rasters alone cannot certify base safety.',
    recommendedVehicle: 'lander',
    recommendedTerrain: 'steep',
    recommendedObjective: 'environmental-monitoring',
    defaultEnergy: 60,
    emphasisTags: ['LRO LOLA 30m', 'Diviner PCP 240m', 'Shackleton PSR', 'Missing Base Criteria'],
  },
  {
    id: 'ancient-water',
    code: 'TPL-03',
    title: 'Chasing Ancient Water',
    supportLevel: 'full',
    supportLabel: 'Supported Scenario (MOLA + NASADEM)',
    objectiveSummary: 'Investigate landforms and geological evidence associated with past water activity.',
    description:
      'Focus traverse waypoints along dried alluvial channels, phyllosilicate mudstones, and evaporite salt basins that record historical moisture episodes.',
    analogRelevance:
      'Explores paleolake sediments, desiccation polygons, and clay-bearing strata.',
    recommendedVehicle: 'rover',
    recommendedTerrain: 'mixed',
    recommendedObjective: 'sample-collection',
    defaultEnergy: 70,
    emphasisTags: ['Paleolakes', 'Clay Horizons', 'Jezero & Gale'],
  },
  {
    id: 'rover-engineer',
    code: 'TPL-04',
    title: 'Rover Engineer',
    supportLevel: 'full',
    supportLabel: 'Supported Scenario (Horn 3×3 Slope & TRI)',
    objectiveSummary: 'Explore terrain, navigate obstacles, and evaluate rover mobility.',
    description:
      'Stress-test wheel slippage, slope climbing stability, and autonomous hazard-avoidance routing across rocky scree and loose sand.',
    analogRelevance:
      'Tests rocker-bogie wheel performance before committing surface vehicles to loose regolith.',
    recommendedVehicle: 'rover',
    recommendedTerrain: 'steep',
    recommendedObjective: 'terrain-mapping',
    defaultEnergy: 75,
    emphasisTags: ['Terramechanics', 'Slope Hazard', 'TRI Roughness'],
  },
];

export const EARTH_ENVIRONMENTS: Record<EarthEnvironmentId, EarthEnvironmentDef> = {
  atacama: {
    id: 'atacama',
    name: 'Yungay, Atacama Desert',
    locationLabel: 'Antofagasta Region, Chile',
    coordinatesLabel: "24°05'05\"S, 69°54'54\"W",
    environmentType: 'Hyperarid Salt-Crusted Desert',
    supportLevel: 'primary',
    supportLabel: 'Primary Validated Analog (Real DEM + Orthophoto)',
    imageUrl: '/data/terrains/yungay-imagery.jpg',
    imageAttribution: 'Esri World Imagery / Copernicus GLO-30 (3.84 km × 3.84 km extent)',
    elevationSummary: '957 – 1,221 m above sea level (EGM2008 Geoid)',
    climateNote: 'Hyperarid core (< 2 mm mean annual rainfall); high solar UV; dry nitrate & sulfate crusts.',
    whyScientistsStudy:
      'Multi-million-year hyperaridity concentrates perchlorates, halite, and subsurface smectite clay layers (~30 cm depth) that serve as natural testbeds for Mars life-detection drills and rover optics.',
    analogDistinction:
      'Unlike Mars, Yungay has an ~900 mbar O₂/N₂ atmosphere, ambient microbial life, nearby roads, and 9.81 m/s² gravity. Similarity in aridity never proves planetary equivalence.',
    measuredGravityMs2: 9.807,
    measuredPressureMbar: '~900 mbar (N₂/O₂)',
    ambientTempRangeC: '2°C to 34°C diurnal',
    terrainPalette: {
      base: '#B89B78',
      ridge: '#8C6C53',
      skyTop: '#244A68',
      skyBottom: '#D6B892',
      contour: 'rgba(23, 42, 58, 0.25)',
    },
  },
  antarctica: {
    id: 'antarctica',
    name: 'McMurdo Dry Valleys, Antarctica',
    locationLabel: 'Wright Valley, Victoria Land, Antarctica',
    coordinatesLabel: '77°33\'00"S, 161°40\'12"E',
    environmentType: 'Cold Polar Hyperarid Desert (Mission 2 Baseline)',
    supportLevel: 'primary',
    supportLabel: 'Validated Polar Analog (30 m Polar DEM + MODIS MOD11A2)',
    imageUrl: null,
    imageAttribution: 'Copernicus GLO-30 Polar DEM S78E161 (NASADEM <56°S cutoff supplement) + MODIS MOD11A2 v061',
    elevationSummary: '89.8 – 1,354.3 m (1,264.5 m relief in 30 m Wright Valley subset)',
    climateNote: 'Measured MODIS MOD11A2 LST: -23.3 °C Day / -24.3 °C Night; katabatic winds, ice-cemented permafrost.',
    whyScientistsStudy:
      'Combines extreme cold, low humidity, and sublimation-controlled permafrost—helping engineers evaluate cold-soak mechanisms, Lunar South Pole volatile drilling, and hardy endolithic biosignatures.',
    analogDistinction:
      'Retains Earth’s ~980 mbar breathable atmosphere and seasonal meltwater channels; NASADEM_HGT V001 ends at 56°S so polar elevation uses Copernicus GLO-30.',
    measuredGravityMs2: 9.829,
    measuredPressureMbar: '~980 mbar (N₂/O₂)',
    ambientTempRangeC: '-24.3°C to -23.3°C (MODIS MOD11A2 measured)',
    terrainPalette: {
      base: '#9AA8B5',
      ridge: '#536475',
      skyTop: '#1A344B',
      skyBottom: '#C8D6E0',
      contour: 'rgba(255, 255, 255, 0.26)',
    },
  },
  iceland: {
    id: 'iceland',
    name: 'Icelandic Volcanic Landscapes',
    locationLabel: 'Highland Basalt Sandur, Iceland',
    coordinatesLabel: '64°55\'N, 16°40\'W (Regional)',
    environmentType: 'Basaltic Volcanic & Glacio-Fluvial Terrain',
    supportLevel: 'secondary-demo',
    supportLabel: 'Demo Profile (Conceptual Analog)',
    imageUrl: null,
    imageAttribution: 'Illustrative schematic contour representation (local 30 m DEM not bundled)',
    elevationSummary: '400 – 900 m highland plains (Regional literature)',
    climateNote: 'Sub-arctic winds, dark vesicular basalt sands, palagonite tuff, and glassy tephra.',
    whyScientistsStudy:
      'Basaltic lava plains, aeolian sand sheets, and hydrothermal mineral alteration closely resemble primary basaltic crusts on Mars and dark lunar mare regolith.',
    analogDistinction:
      'Abundant precipitation, sub-polar freeze-thaw weathering, and vegetative fringes differ strongly from hyperarid Mars and vacuum Moon.',
    measuredGravityMs2: 9.822,
    measuredPressureMbar: '~960 mbar (N₂/O₂)',
    ambientTempRangeC: '-12°C to +12°C',
    terrainPalette: {
      base: '#4C5661',
      ridge: '#2B333C',
      skyTop: '#1B3042',
      skyBottom: '#8EA2B2',
      contour: 'rgba(232, 236, 239, 0.22)',
    },
  },
  arizona: {
    id: 'arizona',
    name: 'Arizona Volcanic Terrain',
    locationLabel: 'San Francisco Volcanic Field, AZ, USA',
    coordinatesLabel: '35°34\'N, 111°37\'W (Regional)',
    environmentType: 'Cinder Cone & Blocky Basalt Field',
    supportLevel: 'secondary-demo',
    supportLabel: 'Demo Profile (Conceptual Analog)',
    imageUrl: null,
    imageAttribution: 'Illustrative schematic contour representation (local 30 m DEM not bundled)',
    elevationSummary: '1,800 – 2,200 m Colorado Plateau (Regional literature)',
    climateNote: 'Semi-arid high plateau, blocky aa/pahoehoe lava margins, angular ejecta scatter.',
    whyScientistsStudy:
      'Long-standing NASA Desert RATS testbed where rover suspensions, pressurized suits, and geological traverses are tested across fractured lava flows and steep cinder slopes.',
    analogDistinction:
      'High atmospheric oxygen/pressure and terrestrial semi-arid scrub; valuable primarily for basaltic obstacle mechanics and field operations training.',
    measuredGravityMs2: 9.796,
    measuredPressureMbar: '~800 mbar (N₂/O₂)',
    ambientTempRangeC: '-2°C to +30°C',
    terrainPalette: {
      base: '#9A6E56',
      ridge: '#614134',
      skyTop: '#244A68',
      skyBottom: '#C8A28A',
      contour: 'rgba(29, 41, 53, 0.28)',
    },
  },
};

export const PLANETARY_DESTINATIONS: Record<'mars' | 'moon', PlanetaryDestinationDef> = {
  mars: {
    id: 'mars',
    name: 'Mars',
    siteName: 'Gale Crater — Murray Buttes & Vera Rubin Ridge',
    supportLevel: 'full',
    supportLabel: 'Fully Supported Destination (USGS HiRISE Context)',
    tagline: 'Thin CO₂ atmosphere, ferric dust regolith, ~0.38 g gravity, and ~3.5 Ga ancient lake strata.',
    imageUrl: '/data/terrains/gale-hirise.jpg',
    imageAttribution: 'NASA / JPL / UArizona HiRISE LRGB Orbital Orthophoto via USGS Astrogeology',
    transferDistanceLabel: '54.6M – 401M km (orbital geometry)',
    transferDurationNote: 'Typical Hohmann cruise: ~6 to 9 months',
    verifiedPhysics: {
      gravityMs2: 3.721,
      gravityRelativeToEarth: '0.38 g (38% of Earth)',
      surfacePressureMbar: '~6.1 mbar mean (~95.3% CO₂)',
      atmosphereComposition: '95.3% CO₂, 2.6% N₂, 1.9% Ar',
      meanTemperatureC: '-63°C mean (-100°C night to +15°C midday surface max)',
      diurnalSwingNote: 'Low thermal inertia atmosphere produces rapid day/night swings over 80°C.',
      signalDelayOneWay: '3 to 22 min one-way (up to 44 min round-trip)',
      verticalDatum: 'MOLA Areoid (not directly subtractable from Earth EGM2008)',
      sourceNote: 'Verified planetary bulk data: NASA NSSDC Mars Fact Sheet & USGS Astrogeology MSL',
    },
    environmentHighlights: [
      'Fine ferric iron-oxide dust coats solar arrays and optical lenses while filling fractures between angular bedrock.',
      'Thin ~6 mbar atmosphere makes aerodynamic drone flight drastically harder than on Earth, requiring ~2,500+ RPM light blades.',
      'Multi-minute signal light-time prevents real-time teleoperation; rovers rely on autonomous hazard avoidance between uplink cycles.',
    ],
    limitations: [
      'This interactive simulation evaluates illustrative planning responses rather than a flight-certified JPL rover physics model.',
    ],
    palette: {
      surfaceTint: '#A95C3A',
      atmosphereHaze: '#C9845B',
      ridge: '#6E3926',
      contour: 'rgba(247, 248, 246, 0.22)',
    },
  },
  moon: {
    id: 'moon',
    name: 'Moon',
    siteName: 'Lunar South Pole — Shackleton Crater Rim & PSR (LRO LOLA + Diviner PCP)',
    supportLevel: 'full',
    supportLabel: 'Fully Supported Destination (LRO LOLA 30m + Diviner PCP 240m)',
    tagline: 'Ultra-high vacuum (<10⁻¹¹ mbar), 41.7 K (-231.4°C) Diviner PSR cold traps, ~0.165 g gravity, and 3,278 m LOLA crater relief.',
    imageUrl: '/data/terrains/moon-map.jpg',
    imageAttribution: 'NASA LRO LOLA LDEM_75S_30M (30 m/px) & LRO Diviner PCP (240 m/px) via PDS Geosciences Node',
    transferDistanceLabel: '384,400 km average',
    transferDurationNote: 'Typical cislunar transit: ~3 to 5 days',
    verifiedPhysics: {
      gravityMs2: 1.622,
      gravityRelativeToEarth: '0.165 g (~1/6 Earth gravity)',
      surfacePressureMbar: '~3 × 10⁻¹² mbar (surface-bounded exosphere; 0.0% O₂)',
      atmosphereComposition: 'Effectively hard vacuum (trace Ar-40, He-4, Ne-20; 0.0% O₂)',
      meanTemperatureC: '41.72 K (-231.43°C) PSR floor to 223.86 K (-49.29°C) sunlit ridge (Measured LRO Diviner PCP)',
      diurnalSwingNote: '91.06% of polar grid cells are ≤110 K cold traps where water ice is thermally stable.',
      signalDelayOneWay: '~1.28 seconds one-way (~2.6 s round-trip)',
      verticalDatum: 'Lunar LOLA Mean Reference Sphere (1,737.4 km · Elev -2,245.5 m to +1,032.5 m)',
      sourceNote: 'Verified NASA datasets: LRO LOLA LDEM_75S_30M + LRO Diviner PCP + NASA NSSDCA Moon Fact Sheet',
    },
    environmentHighlights: [
      'LRO LOLA LDEM_75S_30M measures 3,278 m vertical relief from Shackleton rim crest (+1,032.5 m) to inner PSR wall (-2,245.5 m).',
      'LRO Diviner PCP measures 41.72 K (-231.43 °C) bolometric temperatures in permanently shadowed regions—requiring active heating.',
      'Missing criteria disclosure: These 5 datasets do not provide radiation dosimetry, bulk subsurface water/ice wt%, illumination continuity, communications line-of-sight, or regolith bearing capacity needed to certify a permanent base.',
    ],
    limitations: [
      'While LOLA and Diviner quantify polar topography and surface temperature, certifying a permanent human base requires additional radiation, geotechnical, and subsurface volatile datasets.',
    ],
    palette: {
      surfaceTint: '#68717A',
      atmosphereHaze: '#101E2B',
      ridge: '#3C434B',
      contour: 'rgba(255, 255, 255, 0.24)',
    },
  },
};

export const VEHICLE_LABELS: Record<VehicleType, { name: string; tagline: string; tradeOff: string }> = {
  rover: {
    name: '6-Wheel Science Rover',
    tagline: 'Rocker-bogie mobility with mast cameras, spectrometer arm, and surface wheels.',
    tradeOff: 'Reliable rocky traversal and close-up rock contact; sensitive to steep sand slip and boulders.',
  },
  drone: {
    name: 'Autonomous Scout Drone',
    tagline: 'Coaxial rotorcraft designed for aerial terrain reconnaissance.',
    tradeOff: 'Bypasses boulders easily on Earth, loses rotor lift efficiency at 6 mbar Mars, and cannot fly in Lunar vacuum.',
  },
  lander: {
    name: 'Stationary Science Lander',
    tagline: 'Anchored tripod platform with long robotic sampling arm and environmental mast.',
    tradeOff: 'Zero long-range mobility; maximizes instrument mass and stability at one touchdown point.',
  },
};

export const TERRAIN_LABELS: Record<TerrainType, { name: string; difficultyNote: string }> = {
  rocky: {
    name: 'Rocky',
    difficultyNote: 'Angular bedrock ledges, embedded float cobbles, and moderate wheel impact risk.',
  },
  sandy: {
    name: 'Sandy',
    difficultyNote: 'Loose aeolian ripples; high wheel sinkage and slip hazard under reduced gravity.',
  },
  steep: {
    name: 'Steep',
    difficultyNote: 'Pronounced escarpments requiring careful slope-angle budgeting and bypass routing.',
  },
  mixed: {
    name: 'Mixed',
    difficultyNote: 'Alternating hardpan outcrops, gravel fans, and drifted sediment pockets.',
  },
};

export const OBJECTIVE_LABELS: Record<MissionObjectiveId, { name: string; detail: string }> = {
  'geological-survey': {
    name: 'Geological Survey',
    detail: 'Map layered bedrock outcrops, fracture patterns, and mineralogical targets.',
  },
  'sample-collection': {
    name: 'Sample Collection',
    detail: 'Coring/scooping high-value regolith and clay horizons (highest actuator energy draw).',
  },
  'terrain-mapping': {
    name: 'Terrain Mapping',
    detail: 'High-rate stereo imaging and slope profiling across traverse corridors.',
  },
  'environmental-monitoring': {
    name: 'Environmental Monitoring',
    detail: 'Continuous pressure, temperature, UV, and dust-opacity logging.',
  },
};

export const COMPARISON_FACTORS: ComparisonFactorItem[] = [
  {
    id: 'mobility',
    label: 'Mobility',
    earthTitle: 'Terrestrial Gravity & High Traction',
    earthSummary: '9.81 m/s² gravity presses wheels firmly onto dry nitrate crusts and desert gravel, enabling direct steering corrections.',
    marsTitle: '0.38 g Reduced Downforce & Loose Dust',
    marsSummary: 'Lower weight reduces normal traction on sandy ripples, forcing slower wheel speeds and autonomous slip monitoring.',
    moonTitle: '0.165 g Gravity & Abrasive Regolith',
    moonSummary: 'Very low normal force yields ballistic dust kick-up and heightened sensitivity to steep rimless crater slopes.',
    scienceDetail:
      'Wheel drawbar pull scales roughly with normal vehicle weight. On Mars (3.72 m/s²), the same 6-wheel rover exerts ~62% less downward force than in the Atacama while encountering unweathered, angular dust grains.',
    scienceSourceNote: 'NASA NSSDC gravity constants; JPL Mars Exploration Rover terramechanics principles.',
  },
  {
    id: 'energy',
    label: 'Energy',
    earthTitle: 'High Insolation & Predictable Clears',
    earthSummary: 'Atacama receives intense direct sunlight at ~1.0 AU with zero Martian global dust storms.',
    marsTitle: 'Reduced 1.52 AU Sunlight & Dust Settling',
    marsSummary: 'Solar irradiance is ~43% of Earth’s (~590 W/m² orbital top), and atmospheric dust coats panels over sols.',
    moonTitle: '14-Day Darkness vs Polar grazing Light',
    moonSummary: 'Without an atmosphere, mid-latitude night lasts ~354 hours; polar missions chase near-continuous rim sunlight.',
    scienceDetail:
      'Solar flux follows an inverse-square law: at Mars (1.524 AU), available peak sunlight drops below half Earth’s (~1,361 W/m² → ~586 W/m²), compounded by suspended tau dust optical depth.',
    scienceSourceNote: 'Inverse-square solar irradiance law; NASA Mars Climate & InSight/MER solar telemetry.',
  },
  {
    id: 'communication',
    label: 'Communication',
    earthTitle: 'Near-Instant Field Links (< 10 ms)',
    earthSummary: 'Line-of-sight RF or LTE links in Chile let engineers drive or intervene almost immediately.',
    marsTitle: '3 to 22 Minute One-Way Signal Delay',
    marsSummary: 'Real-time joysticks are impossible; operators uplink batched Sol command plans and rely on onboard hazard checks.',
    moonTitle: '~1.3 Second One-Way Link',
    moonSummary: 'Short ~2.6 s round-trip latency permits tightly supervised Earth-based remote control where Earth stays in view.',
    scienceDetail:
      'Radio waves travel at c = 299,792 km/s. Earth–Mars separation ranges from ~55M km (3.1 min light-time) to ~401M km (22.3 min light-time), eliminating closed-loop human driving.',
    scienceSourceNote: 'Speed of light kinematics; NASA Deep Space Network operations.',
  },
  {
    id: 'geology',
    label: 'Geological Investigation',
    earthTitle: 'Hyperarid Evaporites & Modern Clay Soils',
    earthSummary: 'Yungay preserves nitrate/halite crusts and buried smectite clay (~30 cm deep) built under millions of years of terrestrial weathering.',
    marsTitle: '3.5 Ga Lacustrine Mudstones & Hematite Ridges',
    marsSummary: 'Gale Crater records ancient freshwater lake beds deformed, cemented, and wind-eroded over billions of years.',
    moonTitle: 'Impact-Gardened Anorthosite & Basalt',
    moonSummary: 'Lack of water and wind leaves sharp impact glass breccias and untouched ~3–4 Ga basin stratigraphy.',
    scienceDetail:
      'Atacama provides process-level lessons on how dry sulfate/clay strata retain molecules, but Martian mudstones formed in ~3.5 Ga Noachian/Hesperian lake systems without Earth’s plate tectonics.',
    scienceSourceNote: 'Azua-Bustos et al. (2020); NASA PDS MSL Murray Formation publications.',
  },
  {
    id: 'environment',
    label: 'Environmental Conditions',
    earthTitle: '900 mbar Air, Ozone UV Screen, Mild Nights',
    earthSummary: 'Dense N₂/O₂ air cools electronics convectively and shields surface life from extreme cosmic radiation.',
    marsTitle: '6.1 mbar CO₂, Freezing Nights & High UV',
    marsSummary: 'Thin CO₂ provides minimal convective cooling or thermal insulation; temperatures plunge toward -90°C overnight.',
    moonTitle: 'Hard Vacuum & > 250°C Thermal Extremes',
    moonSummary: 'No air exists for convection or aerodynamic rotor lift; hardware endures blistering sunlit surfaces and cryogenic shadows.',
    scienceDetail:
      'Atmospheric pressure drives both rotorcraft feasibility and thermal survival. Mars ~6 mbar surface pressure is <1% of Earth’s (~1,013 mbar at sea level), equivalent to ~35 km altitude in Earth’s stratosphere.',
    scienceSourceNote: 'NASA NSSDC Mars & Moon Planetary Fact Sheets.',
  },
];

export const EARTH_TARGETS: SimulationWaypoint[] = [
  {
    id: 'e-target-1',
    label: 'TARGET A',
    xFrac: 0.24,
    yFrac: 0.62,
    phaseIndex: 1,
    title: 'Nitrate & Halite Desert Pavement',
    finding:
      'Desiccated polygonal crust cemented by atmospheric nitrates; establishes baseline optical spectrometer reflectance and wheel dust adhesion.',
    dataTag: 'ILLUSTRATIVE TARGET',
  },
  {
    id: 'e-target-2',
    label: 'TARGET B',
    xFrac: 0.56,
    yFrac: 0.48,
    phaseIndex: 2,
    title: 'Alluvial Gravel Fan Escarpment',
    finding:
      'Coarse poorly sorted clasts along a ~12° pediment margin; tests rock-clearance geometry and wheel slip telemetry.',
    dataTag: 'ILLUSTRATIVE TARGET',
  },
  {
    id: 'e-target-3',
    label: 'TARGET C',
    xFrac: 0.78,
    yFrac: 0.31,
    phaseIndex: 3,
    title: 'Subsurface Smectite Clay Horizon',
    finding:
      'Shallow phyllosilicate-rich horizon analogous to clay mineral traps targeted by biosignature instruments.',
    dataTag: 'ILLUSTRATIVE TARGET',
  },
];

export const MARS_TARGETS: SimulationWaypoint[] = [
  {
    id: 'm-target-1',
    label: 'TARGET M1',
    xFrac: 0.24,
    yFrac: 0.64,
    phaseIndex: 1,
    title: 'Aeolian Ripples & Ferric Lag',
    finding:
      'Fine iron-oxide dust blanketing angular float rocks; demonstrates reduced traction (~0.38 g) and optical dust calibration.',
    dataTag: 'ILLUSTRATIVE TARGET',
  },
  {
    id: 'm-target-2',
    label: 'TARGET M2',
    xFrac: 0.56,
    yFrac: 0.45,
    phaseIndex: 2,
    title: 'Vera Rubin Ridge Outcrop Margin',
    finding:
      'Erosion-resistant diagenetic hematite-bearing ridge flank rising steeply above the basaltic regolith plain.',
    dataTag: 'ILLUSTRATIVE TARGET',
  },
  {
    id: 'm-target-3',
    label: 'TARGET M3',
    xFrac: 0.78,
    yFrac: 0.30,
    phaseIndex: 3,
    title: 'Murray Formation Clay-Sulfate Transition',
    finding:
      'Fine laminated lacustrine mudstone preserving phyllosilicates deposited ~3.5 Ga ago—prime astrobiological preservation unit.',
    dataTag: 'ILLUSTRATIVE TARGET',
  },
];

export const MISSION_EVENT_001_OPTIONS: MissionDecisionOption[] = [
  {
    id: 'safer-route',
    code: 'OPT-01',
    title: 'Take a Safer Bypass Route Around the Slope',
    actionSummary: 'Program a 420 m autonomous detour contouring along gentler bedrock benches around the scree escarpment.',
    illustrativeEnergyDelta: -18,
    illustrativeTimeCost: '+2 Sols planning & drive cycles',
    advantages: [
      'Minimizes wheel puncture and uncontrollable down-slope slip hazards in 0.38 g.',
      'Allows multi-frame orbital-matched Hazcam localization along safe ground.',
    ],
    disadvantages: [
      'Consumes higher cumulative drive energy across extra distance.',
      'Reaches the primary clay outcrop behind initial schedule.',
    ],
  },
  {
    id: 'standoff-inspect',
    code: 'OPT-02',
    title: 'Stop and Inspect the Slope Using Cameras & Instruments',
    actionSummary: 'Halt on stable flat bedrock at the slope toe, acquire high-resolution telephoto mosaics, and run remote spectroscopy.',
    illustrativeEnergyDelta: -8,
    illustrativeTimeCost: '+1 Sol standoff campaign',
    advantages: [
      'Preserves critical power reserve and avoids mechanical wear on slopes.',
      'Collects clean stratigraphic imagery without committing the chassis to talus.',
    ],
    disadvantages: [
      'Cannot deploy contact instruments (drill or APXS) directly onto upper strata.',
      'Relies on remote optical interpretation rather than direct mineral contact.',
    ],
  },
  {
    id: 'direct-traverse',
    code: 'OPT-03',
    title: 'Attempt to Cross the Slope Directly',
    actionSummary: 'Command an uphill direct ascent straight up the rocky gradient to reach the target outcrop in minimal distance.',
    illustrativeEnergyDelta: -22,
    illustrativeTimeCost: 'Fastest nominal path (if slip remains bounded)',
    advantages: [
      'Shortest geometric distance to the highest-priority exposed bedrock target.',
      'Tests peak wheel grouser traction performance directly in field regolith.',
    ],
    disadvantages: [
      'High wheel slip risk on loose scree can trigger autonomous fault halts under light-time lag.',
      'Sharp angular bedrock can accelerate wheel wear or exhaust tight energy reserves.',
    ],
  },
];

