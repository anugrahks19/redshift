import type { EvidenceRecord, FieldFeasibilityItem, ResearchObjectiveConfig } from '../types/evidence';

export const RESEARCH_OBJECTIVES: ResearchObjectiveConfig[] = [
  {
    id: 'astrobiology-geology',
    label: 'Astrobiology & Geological Context',
    shortLabel: 'Astrobiology / Geology',
    description:
      'Evaluate hyperarid mineralogical preservation (smectites, evaporites) alongside Gale Crater ancient lacustrine clay-bearing strata.',
    recommendedLayers: ['elevation', 'slope', 'imagery', 'geology'],
    keyVariables: ['Aridity & subsurface moisture', 'Clay mineral hosts', 'Slope & basin drainage', 'Data coverage'],
    caveats: [
      'Testing biosignature survival in Earth smectites does not demonstrate past or present life in Gale Crater.',
      'Yungay atmospheric pressure and cosmic radiation environment differ substantially from Mars.',
    ],
  },
  {
    id: 'geological-processes',
    label: 'Geological & Sedimentary Processes',
    shortLabel: 'Geological Processes',
    description:
      'Compare basin-floor pediment and alluvial-fan geomorphology against Gale Crater mudstone/ridge stratigraphy at 30 m scale.',
    recommendedLayers: ['elevation', 'slope', 'aspect', 'roughness'],
    keyVariables: ['Relief', 'Slope distribution (deg)', 'Aspect strike orientation', 'TRI roughness'],
    caveats: [
      '30 m DEM spacing resolves macro-landforms and escarpments rather than cm-scale sedimentary bedding.',
    ],
  },
  {
    id: 'rover-mobility',
    label: 'Rover & Terrain Mobility',
    shortLabel: 'Rover Mobility',
    description:
      'Assess slope distributions and 30 m-scale surface ruggedness relevant to traverse planning and slip-risk terrain classification.',
    recommendedLayers: ['slope', 'roughness', 'coverage', 'elevation'],
    keyVariables: ['Slope > 15° / 25° thresholds', 'Terrain Ruggedness Index (TRI)', 'Valid DEM coverage'],
    caveats: [
      'Downsampling Mars 1 m DEM to 30 m removes boulder and ripple hazards smaller than 30 m; native 1 m data is required for final rover pathing.',
    ],
  },
  {
    id: 'instrument-testing',
    label: 'Instrument Calibration & Testing',
    shortLabel: 'Instrument Testing',
    description:
      'Identify accessible hyperarid clay and evaporite terrain with documented surface roughness for Raman, LIBS, XRD, and subsurface drill trials.',
    recommendedLayers: ['imagery', 'roughness', 'slope', 'coverage'],
    keyVariables: ['Surface roughness', 'Mineral substrate evidence', 'Field access & logistics'],
    caveats: [
      'Copernicus GLO-30 is a DSM (~30 m) and cannot validate micro-scale target rock textures without in-situ field reconnaissance.',
    ],
  },
  {
    id: 'resource-exploration',
    label: 'Hydrated Mineral & Resource Context',
    shortLabel: 'Resource Exploration',
    description:
      'Investigate hydrous clay and sulfate-hosted terrains to inform water-extraction and regolith handling concepts.',
    recommendedLayers: ['geology', 'elevation', 'slope', 'coverage'],
    keyVariables: ['Phyllosilicate / sulfate hosts', 'Slope accessibility', 'Field feasibility'],
    caveats: [
      'No spatially registered mineral-abundance raster is bundled at 30 m in this workspace; mineral claims rely on peer-reviewed point studies.',
    ],
  },
  {
    id: 'human-operations',
    label: 'Human Exploration & Analog Operations',
    shortLabel: 'Human Operations',
    description:
      'Evaluate field-site accessibility, hazards, permits, and terrain complexity independently of planetary geological equivalence.',
    recommendedLayers: ['slope', 'coverage', 'imagery'],
    keyVariables: ['Access & logistics', 'Permits & restrictions', 'Hazards & seasonality', 'Slope grade'],
    caveats: [
      'Field feasibility status requires local Chilean institutional confirmation prior to any field deployment.',
    ],
  },
];

export const EVIDENCE_RECORDS: EvidenceRecord[] = [
  {
    id: 'ev-yungay-smectite-2020',
    title: 'Subsurface Wet Smectite Layers in Hyperarid Yungay Core',
    claim:
      'Wet smectite-rich subsurface layers (~30 cm depth) containing halite, gypsum, calcite, albite, and quartz sustain active microbial communities under hyperarid surface conditions, supporting biosignature preservation research.',
    location: 'Yungay region, Atacama Desert, Chile (~24.08°S, 69.92°W)',
    planet: 'Earth',
    instrumentOrMethod: 'Field trench sampling, XRD mineralogy, ion chromatography, subsurface humidity sensors, 16S/metagenomic assays',
    sourceTitle: 'Inhabited subsurface wet smectites in the hyperarid core of the Atacama Desert as an analog for Mars',
    sourceInstitution: 'Scientific Reports (Nature Portfolio) — Azua-Bustos et al.',
    sourceUrl: 'https://www.nature.com/articles/s41598-020-76302-z',
    date: '2020-11-05',
    units: 'wt% minerals / % RH / depth (cm)',
    classification: 'Published interpretation',
    verificationStatus: 'Published peer-reviewed',
    limitations:
      'Point trench and site-specific observations; does not provide continuous 30 m mineralogical raster coverage across the entire 3.84 km DEM tile.',
    objectiveIds: ['astrobiology-geology', 'instrument-testing', 'resource-exploration', 'geological-processes'],
  },
  {
    id: 'ev-yungay-copernicus-dem',
    title: 'Yungay Basin Topographic Grid (Copernicus GLO-30)',
    claim:
      'Extracted 3.84 km × 3.84 km subset around 24°05\'05.28"S, 69°54\'54.25"W spans 957.20 m to 1,221.31 m (EGM2008) with 100.0% valid coverage (16,384/16,384 cells at 30.0 m resampled metric grid).',
    location: 'Yungay Station, Antofagasta, Chile',
    planet: 'Earth',
    instrumentOrMethod: 'TanDEM-X / TerraSAR-X radar interferometry (Copernicus DSM COG, bilinearly projected to EPSG:32719)',
    sourceTitle: 'Copernicus DEM GLO-30 (Copernicus_DSM_COG_10_S25_00_W070_00_DEM)',
    sourceInstitution: 'European Space Agency (ESA) / Copernicus Programme',
    sourceUrl: 'https://doi.org/10.5270/esa-c5d3d65',
    date: '2011–2015 acquisition / 2022 COG release',
    units: 'meters (EGM2008 orthometric)',
    classification: 'Direct measurement',
    verificationStatus: 'Dataset verified',
    limitations:
      'Digital Surface Model (DSM) rather than bare-earth DTM; 30 m grid averages sub-30 m micro-topography and station structures.',
    objectiveIds: ['astrobiology-geology', 'geological-processes', 'rover-mobility', 'instrument-testing', 'human-operations'],
  },
  {
    id: 'ev-gale-msl-clay-units',
    title: 'Curiosity Rover Observations of Ancient Clay-Bearing Sedimentary Units',
    claim:
      'NASA MSL Curiosity has documented ancient fluvio-lacustrine mudstones (Murray Formation), hematite-rich Vera Rubin Ridge, and phyllosilicate-bearing Glen Torridon strata in Gale Crater.',
    location: 'Gale Crater (Murray Fm / Vera Rubin Ridge / Glen Torridon), Mars',
    planet: 'Mars',
    instrumentOrMethod: 'MSL CheMin XRD, SAM, ChemCam LIBS, Mastcam, MAHLI',
    sourceTitle: 'NASA Planetary Data System — MSL Imaging & Science Volumes',
    sourceInstitution: 'NASA / JPL-Caltech / PDS',
    sourceUrl: 'https://pds-imaging.jpl.nasa.gov/volumes/msl.html',
    date: '2012–Present',
    classification: 'Rover observation',
    verificationStatus: 'Verified',
    limitations:
      'In-situ Curiosity geochemical detections are strictly confined to the rover traverse corridor and do not imply extant biology.',
    objectiveIds: ['astrobiology-geology', 'geological-processes', 'instrument-testing', 'resource-exploration'],
  },
  {
    id: 'ev-gale-usgs-dem',
    title: 'USGS Merged 1 m Gale Crater DEM (30 m Analysis Subset)',
    claim:
      'The 3.84 km × 3.84 km Murray Buttes / Vera Rubin Ridge subset (x: 8,141,500–8,145,340 m; y: -282,340 to -278,500 m) spans -4,372.23 m to -3,733.56 m relative to the MOLA Areoid (638.67 m relief, 100.0% valid cells).',
    location: 'Gale Crater, Mars (~4.73°S, 137.38°E planetocentric)',
    planet: 'Mars',
    instrumentOrMethod: 'MRO HiRISE + CTX + MEX HRSC stereo photogrammetry tied to MOLA reference (stratified block-mean to 30 m)',
    sourceTitle: 'Mars MSL Gale Merged DEM 1m v3',
    sourceInstitution: 'USGS Astrogeology Science Center',
    sourceUrl: 'https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m',
    date: '2022-11-09',
    units: 'meters (MOLA Areoid)',
    classification: 'Derived measurement',
    verificationStatus: 'Dataset verified',
    limitations:
      'Subset covers only 14.7 km² of the ~1,894 km² merged mosaic; downsampling from 1 m to 30 m removes meter-scale rover obstacle relief.',
    objectiveIds: ['astrobiology-geology', 'geological-processes', 'rover-mobility', 'instrument-testing'],
  },
  {
    id: 'ev-gale-hirise-lrgb',
    title: 'HiRISE LRGB Orbital Context Over Murray Buttes & Vera Rubin Ridge',
    claim:
      'Co-registered 25 cm/pixel HiRISE LRGB orthomosaic (overview ~4 m/px) resolves dark aeolian sand sheets, bright stratified bedrock benches, and cratered ridge scarps across the exact DEM bounds.',
    location: 'Gale Crater, Mars (x: 8,141,500–8,145,340 m)',
    planet: 'Mars',
    instrumentOrMethod: 'MRO HiRISE LRGB color-merged orbital camera mosaic',
    sourceTitle: 'MSL Gale Merged Orthophoto & HiRISE-LRGB Mosaic COG',
    sourceInstitution: 'NASA / JPL-Caltech / University of Arizona / USGS',
    sourceUrl: 'https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_orthophoto_mosaic_25cm',
    date: '2022',
    classification: 'Orbital observation',
    verificationStatus: 'Dataset verified',
    limitations:
      'LRGB mosaic uses stretched false-color/enhanced contrast across 78 quads; tonal seams between HiRISE strips reflect varying solar incidence angles.',
    objectiveIds: ['geological-processes', 'rover-mobility', 'astrobiology-geology'],
  },
  {
    id: 'ev-cross-planetary-caveat',
    title: 'Non-Equivalence of Earth Subsurface Clay Habitats and Mars Stratigraphy',
    claim:
      'While Yungay subsurface smectites and Gale Crater mudstones both feature phyllosilicate clay hosts in arid regimes, Gale clays formed in ~3.5 Ga lacustrine environments whereas Yungay reflects Cenozoic terrestrial hyperaridity.',
    location: 'Cross-Planetary (Yungay ↔ Gale Crater)',
    planet: 'Cross-Planetary',
    instrumentOrMethod: 'Comparative planetary synthesis',
    sourceTitle: 'Azua-Bustos et al. (2020) & NASA PDS MSL Synthesis',
    sourceInstitution: 'Scientific Reports / NASA PDS',
    sourceUrl: 'https://www.nature.com/articles/s41598-020-76302-z',
    date: '2020–2024',
    classification: 'Qualitative context',
    verificationStatus: 'Verified',
    limitations:
      'Analog comparison informs process hypotheses and instrument testing only; no universal planetary equivalence score is scientifically valid.',
    objectiveIds: ['astrobiology-geology', 'geological-processes', 'rover-mobility', 'instrument-testing', 'resource-exploration', 'human-operations'],
  },
];

export const YUNGAY_FIELD_FEASIBILITY: FieldFeasibilityItem[] = [
  {
    id: 'ff-access',
    category: 'Access',
    status: 'Verified',
    summary: 'Accessible via paved Chilean Route 5 (Pan-American Highway) corridor visible directly across the extracted satellite imagery, ~65 km SE of Antofagasta.',
    sourceNote: 'Esri World Imagery corridor & Azua-Bustos et al. (2020) field site access description',
    verificationDate: '2026-11 (Imagery verified)',
  },
  {
    id: 'ff-ownership',
    category: 'Land ownership or management',
    status: 'Needs verification',
    summary: 'Surrounding Antofagasta desert lands include Chilean state/fiscal concessions, mining claims, and established astrobiology research station footprints (Yungay Station).',
    sourceNote: 'Requires confirmation with local Chilean institutional host / Bienes Nacionales',
    verificationDate: 'Unverified in remote bundle',
  },
  {
    id: 'ff-permits',
    category: 'Permits',
    status: 'Needs verification',
    summary: 'Field trenching, subsurface sampling, and drone/rover operations require institutional research permits and host coordination.',
    sourceNote: 'Not legally verified by this application',
    verificationDate: 'Requires host confirmation',
  },
  {
    id: 'ff-env-restrictions',
    category: 'Environmental restrictions',
    status: 'Needs verification',
    summary: 'Fragile hyperarid desert crusts and long-term astrobiology study plots require low-impact protocols to prevent cross-contamination.',
    sourceNote: 'Standard planetary analog field stewardship practice',
    verificationDate: 'Requires site protocol check',
  },
  {
    id: 'ff-hazards',
    category: 'Hazards',
    status: 'Verified',
    summary: 'Extreme solar UV irradiance, severe diurnal temperature swings, fine saline/nitrate dust, and active heavy commercial highway traffic along Route 5.',
    sourceNote: 'Regional desert climate & imagery road inspection',
    verificationDate: '2026-11',
  },
  {
    id: 'ff-seasonality',
    category: 'Seasonality',
    status: 'Verified',
    summary: 'Operable year-round due to hyperarid climate; austral winter (June–August) brings colder nights while austral summer increases afternoon heat and wind dust.',
    sourceNote: 'Atacama hyperarid climatology',
    verificationDate: '2026-11',
  },
  {
    id: 'ff-logistics',
    category: 'Logistics',
    status: 'Verified',
    summary: 'Antofagasta city (~1 hr drive) provides commercial air access, lodging, power, and heavy-equipment transport.',
    sourceNote: 'Regional infrastructure context',
    verificationDate: '2026-11',
  },
  {
    id: 'ff-infrastructure',
    category: 'Infrastructure and facilities',
    status: 'Needs verification',
    summary: 'Yungay field station structures exist nearby, but on-site power, lab bench availability, and water/comms capacity must be confirmed with station operators.',
    sourceNote: 'Station availability not tracked in real time',
    verificationDate: 'Requires operator confirmation',
  },
];

export function getFieldFeasibilityForSite(siteId: string): FieldFeasibilityItem[] {
  if (siteId === 'yungay-atacama') {
    return YUNGAY_FIELD_FEASIBILITY;
  }

  const presets: Record<string, FieldFeasibilityItem[]> = {
    'death-valley': [
      { id: 'dv-access', category: 'Access', status: 'Verified', summary: 'Paved California State Route 190 & Badwater Road access.', sourceNote: 'NPS park road network', verificationDate: '2026-11' },
      { id: 'dv-own', category: 'Land ownership or management', status: 'Verified', summary: 'Managed by U.S. National Park Service (Death Valley National Park).', sourceNote: 'NPS Federal Jurisdiction', verificationDate: '2026-11' },
      { id: 'dv-permits', category: 'Permits', status: 'Needs verification', summary: 'NPS Scientific Research & Collecting Permit mandatory for rover/sample disturbance.', sourceNote: 'IRMA NPS permitting required per deployment', verificationDate: 'Requires permit confirmation' },
      { id: 'dv-haz', category: 'Hazards', status: 'Verified', summary: 'Extreme summer heat (>50 °C), flash flood canyons, brittle salt-crust ankle/wheel entrapment.', sourceNote: 'NOAA / NPS hazard notices', verificationDate: '2026-11' },
      { id: 'dv-dem', category: 'Infrastructure and facilities', status: 'Unknown', summary: 'No local 30 m elevation array bundled in current workspace (SRTM external only).', sourceNote: 'Missing local raster dataset', verificationDate: 'Missing' },
    ],
    'iceland-askja': [
      { id: 'ic-access', category: 'Access', status: 'Verified', summary: 'Unpaved highland F-roads (4×4 river crossings) ~4–5 hrs from Akureyri.', sourceNote: 'Icelandic Road Administration context', verificationDate: '2026-11' },
      { id: 'ic-permits', category: 'Permits', status: 'Needs verification', summary: 'Vatnajökull National Park & Environment Agency of Iceland highland research authorization required.', sourceNote: 'Off-road vehicle restrictions strict', verificationDate: 'Requires permit check' },
      { id: 'ic-season', category: 'Seasonality', status: 'Verified', summary: 'Accessible primarily July–early September; snowblocked 8–9 months/year.', sourceNote: 'Iceland highlands F-road schedule', verificationDate: '2026-11' },
      { id: 'ic-haz', category: 'Hazards', status: 'Verified', summary: 'Active volcanic caldera seismicity, glacial outburst floods, sudden freezing storms.', sourceNote: 'Icelandic Met Office monitoring', verificationDate: '2026-11' },
      { id: 'ic-dem', category: 'Infrastructure and facilities', status: 'Unknown', summary: 'No 30 m DEM grid bundled in workspace (ArcticDEM external only).', sourceNote: 'Missing local raster dataset', verificationDate: 'Missing' },
    ],
    'haughton-crater': [
      { id: 'hc-access', category: 'Access', status: 'Needs verification', summary: 'Charter Twin Otter aircraft from Resolute Bay, Nunavut onto gravel tundra airstrip.', sourceNote: 'Polar Continental Shelf Program logistics', verificationDate: 'Requires seasonal charter booking' },
      { id: 'hc-permits', category: 'Permits', status: 'Needs verification', summary: 'Nunavut Research Institute & local community consultation permits mandatory.', sourceNote: 'Qikiqtani regional governance', verificationDate: 'Requires permit confirmation' },
      { id: 'hc-season', category: 'Seasonality', status: 'Verified', summary: 'Primary Arctic summer field window June–August (24-hr daylight).', sourceNote: 'High Arctic campaign archive', verificationDate: '2026-11' },
      { id: 'hc-infra', category: 'Infrastructure and facilities', status: 'Needs verification', summary: 'Haughton-Mars Project (HMP) seasonal camp assets depend on active annual deployment.', sourceNote: 'Campaign-dependent facility status', verificationDate: 'Unverified in offline workspace' },
      { id: 'hc-dem', category: 'Infrastructure and facilities', status: 'Unknown', summary: 'No local 30 m DEM array bundled in current workspace.', sourceNote: 'Missing local raster dataset', verificationDate: 'Missing' },
    ],
    'mcmurdo-dry-valleys': [
      { id: 'mc-access', category: 'Access', status: 'Needs verification', summary: 'Military/national-program helicopter airlift from McMurdo Station (no public roads).', sourceNote: 'USAP / Antarctica New Zealand support', verificationDate: 'Requires agency award' },
      { id: 'mc-env', category: 'Environmental restrictions', status: 'Needs verification', summary: 'Antarctic Treaty ASMA No. 2 strict sterility, zero-waste & helicopter-landing rules.', sourceNote: 'Antarctic Treaty Protocol', verificationDate: 'Requires treaty permit' },
      { id: 'mc-haz', category: 'Hazards', status: 'Verified', summary: 'Extreme polar cold (-30 °C mean), katabatic winds, whiteout flight holds.', sourceNote: 'McMurdo LTER climatology', verificationDate: '2026-11' },
      { id: 'mc-dem', category: 'Infrastructure and facilities', status: 'Unknown', summary: 'No local 30 m DEM raster packaged in workspace (REMA external only).', sourceNote: 'Missing local raster dataset', verificationDate: 'Missing' },
    ],
    'rio-tinto': [
      { id: 'rt-access', category: 'Access', status: 'Verified', summary: 'Paved regional roads near Nerva / Minas de Riotinto (~1 hr NW of Seville).', sourceNote: 'Andalusia transport network', verificationDate: '2026-11' },
      { id: 'rt-permits', category: 'Permits', status: 'Needs verification', summary: 'Mining concession coordination and regional Andalusian sampling approvals required.', sourceNote: 'Active/historic mining zone protocols', verificationDate: 'Requires local approval' },
      { id: 'rt-haz', category: 'Hazards', status: 'Verified', summary: 'Extremely corrosive acidic waters (pH 1.5–2.5), heavy metals, historic mine shafts.', sourceNote: 'Site chemistry & PPE protocol', verificationDate: '2026-11' },
      { id: 'rt-dem', category: 'Infrastructure and facilities', status: 'Unknown', summary: 'No 30 m DEM array packaged locally in this workspace.', sourceNote: 'Missing local raster dataset', verificationDate: 'Missing' },
    ],
    'mauna-kea-apollo': [
      { id: 'mk-access', category: 'Access', status: 'Verified', summary: 'Paved/graded Saddle Road (Daniel K. Inouye Hwy) & summit access road (4WD upper slopes).', sourceNote: 'Hawaiʻi DOT', verificationDate: '2026-11' },
      { id: 'mk-env', category: 'Environmental restrictions', status: 'Needs verification', summary: 'Cultural stewardship & Maunakea Stewardship and Oversight Authority excavation restrictions.', sourceNote: 'Strict conservation & cultural protection', verificationDate: 'Requires formal approval' },
      { id: 'mk-haz', category: 'Hazards', status: 'Verified', summary: 'High-altitude hypoxia (>3,000 m), high UV, rapid summit temperature drop & loose scoria.', sourceNote: 'Maunakea altitude advisory', verificationDate: '2026-11' },
      { id: 'mk-dem', category: 'Infrastructure and facilities', status: 'Unknown', summary: 'No local 30 m DEM array packaged locally in this workspace.', sourceNote: 'Missing local raster dataset', verificationDate: 'Missing' },
    ],
  };

  return presets[siteId] ?? YUNGAY_FIELD_FEASIBILITY;
}


