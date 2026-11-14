import type { SpatialLayerId } from '../types/terrain';

export interface FieldChallenge {
  id: string;
  title: string;
  targetBody: 'Mars' | 'Moon' | 'Mars & Moon';
  difficulty: 'Foundational' | 'Intermediate' | 'Field Specialist';
  estimatedTime: string;
  objective: string;
  briefing: string;
  imageUrl: string;
  imageCaption: string;
  sourceLabel: string;
  recommendedMarsSite: 'gale_murray' | 'gale_bradbury';
  recommendedEarthSiteId: string;
  recommendedLayer: SpatialLayerId;
  checklist: string[];
}

export const FIELD_CHALLENGES: FieldChallenge[] = [
  {
    id: 'find-martian-landscape',
    title: 'Find the Martian Landscape',
    targetBody: 'Mars',
    difficulty: 'Foundational',
    estimatedTime: '6 min',
    objective:
      'Compare Gale Crater sedimentary strata against hyperarid alluvial plains using 30 m elevation and slope rasters.',
    briefing:
      'Orbital HiRISE mosaics show layered mudstones and eroded scarps across Murray Buttes in Gale Crater. Inspect the terrain slope gradient, then sweep across terrestrial candidates to identify which basin best reproduces hyperarid surface morphology.',
    imageUrl: '/data/terrains/gale-hirise.jpg',
    imageCaption: 'Gale Crater — Vera Rubin Ridge & Murray Buttes corridor (HiRISE / USGS)',
    sourceLabel: 'USGS Gale 1m Mosaic (30m subset)',
    recommendedMarsSite: 'gale_murray',
    recommendedEarthSiteId: 'yungay-atacama',
    recommendedLayer: 'elevation',
    checklist: [
      'Inspect elevation relief & scarp benches on the Gale Crater reference grid.',
      'Switch to Horn Slope (deg) to isolate >15° cuesta faces.',
      'Compare Yungay Station against temperate river basins in Step D.',
    ],
  },
  {
    id: 'lunar-shadow-hunt',
    title: 'The Lunar Shadow Hunt',
    targetBody: 'Moon',
    difficulty: 'Intermediate',
    estimatedTime: '8 min',
    objective:
      'Evaluate how crater wall geometry, low solar angles, and blocky regolith shape south-polar illumination and rover traverse safety.',
    briefing:
      'Near the lunar south pole, slight changes in crater rim height determine whether a floor remains in permanent shadow where water ice can persist. Use slope and roughness diagnostics plus polar/volcanic analog terrains to assess field constraints.',
    imageUrl: '/data/terrains/gale-bradbury-hirise.jpg',
    imageCaption: 'Impact crater floor & ejecta apron surface texture (Orbital Mosaic reference)',
    sourceLabel: 'LRO LOLA & HiRISE Comparative Reference',
    recommendedMarsSite: 'gale_bradbury',
    recommendedEarthSiteId: 'haughton-crater',
    recommendedLayer: 'slope',
    checklist: [
      'Inspect surface slope breaks across flat plains versus rim walls.',
      'Contrast Arctic impact terrain (Haughton Crater) with basaltic rift plateaus (Iceland).',
      'Review vacuum and regolith grain limitations before drawing conclusions.',
    ],
  },
  {
    id: 'search-extreme-environments',
    title: 'Search for Extreme Environments',
    targetBody: 'Mars & Moon',
    difficulty: 'Intermediate',
    estimatedTime: '7 min',
    objective:
      'Distinguish hyperarid evaporite crusts, sub-freezing sublimation valleys, and active fluvial basins across orbital imagery.',
    briefing:
      'Not every barren landscape is a valid planetary analog. In this mission you evaluate water activity, chemical salts (nitrates, halite, sulfates), and physical weathering regimes to separate superficial visual likeness from true geological equivalence.',
    imageUrl: '/data/terrains/yungay-imagery.jpg',
    imageCaption: 'Yungay Station hyperarid desert pediment, Antofagasta, Chile (Esri / Maxar)',
    sourceLabel: 'Copernicus GLO-30 & Esri World Imagery',
    recommendedMarsSite: 'gale_bradbury',
    recommendedEarthSiteId: 'death-valley',
    recommendedLayer: 'roughness',
    checklist: [
      'Enable Contours + Roughness (TRI) to measure alluvial fan vs. basin floor texture.',
      'Compare Death Valley evaporite fans against Atacama nitrate/clay crusts.',
      'Flag why perennial rivers (e.g., Río Tinto) are geochemical—not climatic—analogs.',
    ],
  },
  {
    id: 'life-in-the-extremes',
    title: 'Life in the Extremes',
    targetBody: 'Mars',
    difficulty: 'Field Specialist',
    estimatedTime: '9 min',
    objective:
      'Investigate where trace subsurface humidity persists inside smectite clay horizons and why 30 m orbital DEMs cannot see micro-habitats alone.',
    briefing:
      'Field sampling near Yungay Station (Azua-Bustos et al., 2020) documented viable microbial communities sheltered ~30 cm beneath desiccated surface crust inside wet smectite clay layers. Trace the macro-scale desert corridor and assess what satellite pixels miss.',
    imageUrl: '/data/terrains/yungay-imagery.jpg',
    imageCaption: 'Atacama hyperarid core alluvial corridor studied for subsurface smectite habitability',
    sourceLabel: 'Azua-Bustos et al. (2020) / Scientific Reports',
    recommendedMarsSite: 'gale_murray',
    recommendedEarthSiteId: 'yungay-atacama',
    recommendedLayer: 'imagery',
    checklist: [
      'Probe cell-level topography across the 3.84 km Yungay corridor.',
      'Synchronize Yungay vs. Gale Crater in the Curtain Viewer.',
      'Record why biosignature preservation depends on clay mineralogy plus aridity duration.',
    ],
  },
];

export interface MatchingReasoningOption {
  id: string;
  label: string;
  focus: string;
}

export const MATCHING_REASONING_OPTIONS: MatchingReasoningOption[] = [
  {
    id: 'hyperarid-clay-preserve',
    label: 'Long-lived hyperarid stability preserves salts & smectite clay horizons',
    focus: 'Geo-chemical & orbital geomorphology match (Gale mudstones vs. Atacama smectite/nitrate crusts)',
  },
  {
    id: 'evaporite-fan-geometry',
    label: 'Closed-basin alluvial fans & evaporite salt-flat slope transitions',
    focus: 'Basin topography match (Death Valley piedmont gradients vs. lacustrine crater basins)',
  },
  {
    id: 'impact-polar-permafrost',
    label: 'Dissected impact breccia & cold permafrost regolith trafficability',
    focus: 'Field logistics & crater mechanics (Haughton / McMurdo polar cold regimes)',
  },
  {
    id: 'mafic-basaltic-roughness',
    label: 'Unvegetated mafic basalt flows & vesicular lava roughness',
    focus: 'Rock-type & hazard avoidance (Iceland volcanic highlands vs. igneous planetary plains)',
  },
];

export interface SiteDebriefNote {
  similarities: string[];
  differences: string[];
  limitations: string[];
  unavailableInfo: string[];
  unsupportedConclusions: string[];
}

export const SITE_DEBRIEF_NOTES: Record<string, SiteDebriefNote> = {
  'yungay-atacama': {
    similarities: [
      'Multi-million-year hyperaridity (< 2 mm/yr rain) suppresses fluvial vegetation and preserves intact salt/nitrate crusts.',
      'Subsurface smectite-rich clay horizons (~30 cm depth) retain trace water molecules in a manner compared by Azua-Bustos et al. (2020) to phyllosilicate beds in Gale Crater.',
      'Measured 3.84 km subsets share basin-and-ridge relief orders of magnitude suitable for 30 m comparative geomorphometry.',
    ],
    differences: [
      'Earth ambient surface pressure (~900 mbar near sea level / ~880 mbar at Yungay) and 21% O2 atmosphere vs. ~6 mbar CO2 Martian atmosphere.',
      'Surface radiation flux on Mars includes unattenuated galactic cosmic rays and solar energetic particles absent under Earth’s geomagnetic shield.',
    ],
    limitations: [
      'Copernicus GLO-30 resolves 30 m grid spacing and cannot directly detect 30 cm subsurface clay lenses without in-situ trenching or GPR.',
      'Human mining tracks and nitrate roads bisect parts of the broader Yungay corridor.',
    ],
    unavailableInfo: [
      'Real-time orbital spectrometer hydration pixels co-registered to exact individual Yungay borehole cores.',
      'Sub-meter micro-roughness (< 30 m) across every slope facet of the 3.84 km subset.',
    ],
    unsupportedConclusions: [
      'Matching dry macro-topography does NOT imply modern Martian surface habitability or equivalent atmospheric pressure.',
      'Atacama microbial biosignatures do NOT prove extinct or extant life inside Gale Crater mudstones.',
    ],
  },
  'death-valley': {
    similarities: [
      'Internally drained graben captures alluvial fan gradients transitioning onto flat halite/gypsum evaporite playas comparable to paleolake basins.',
      'Thermal extremes aid rover wheel and radiator heat-rejection trials.',
    ],
    differences: [
      'Active episodic rainstorms rewrite alluvial channels and dissolve/re-precipitate playa salt crusts on decadal timescales.',
      'Calcareous Paleozoic mountain detritus differs compositionally from Gale’s mafic basaltic sediments.',
    ],
    limitations: [
      'No 30 m Copernicus subset is packaged locally for Death Valley in this workspace; quantitative raster comparison requires Yungay.',
    ],
    unavailableInfo: [
      'Local 30 m DEM grid matrix and co-registered high-resolution raster elevation stats in the browser workspace.',
    ],
    unsupportedConclusions: [
      'Evaporite salt polygons in California do not imply warm modern hydrological cycles on Mars.',
    ],
  },
  'iceland-askja': {
    similarities: [
      'Fresh mafic basalt flows, palagonitic tephra, and low organic cover mirror Mars’s predominantly basaltic crust and lunar mare volcanics.',
      'Sub-glacial tuff ridges help test volcano-ice interaction signatures relevant to Martian highlands.',
    ],
    differences: [
      'High maritime precipitation, active freeze-thaw water saturation, and abundant snowpack alter clay formation rates rapidly.',
    ],
    limitations: [
      'Satellite tiles show context only; no local 30 m DEM raster for Askja is loaded in the workspace.',
    ],
    unavailableInfo: [
      'Quantitative 30 m Horn slope and TRI distributions for Askja inside the client canvas.',
    ],
    unsupportedConclusions: [
      'Visual similarity of black basalt sand does not replicate electrostatic lunar dust cohesion or anhydrous weathering.',
    ],
  },
  'haughton-crater': {
    similarities: [
      'Preserved 23 km impact crater morphology, gullied walls, and continuous permafrost test spacesuit mobility and traverse planning.',
    ],
    differences: [
      'Devon Island target rocks are thick Paleozoic dolomites and limestones rather than planetary basalts or mudstones.',
    ],
    limitations: [
      'Reference catalog profile only; no 30 m terrain matrix packaged for client DEM slicing.',
    ],
    unavailableInfo: [
      'Direct raster elevation histogram for Haughton Crater in this workspace.',
    ],
    unsupportedConclusions: [
      'Crater diameter or Arctic frost cannot validate carbonate bedrock abundances on the Moon.',
    ],
  },
  'mcmurdo-dry-valleys': {
    similarities: [
      'Sub-zero sublimation regime and buried massive glacier ice closely guide polar ice-table stability models (e.g., Phoenix landing site).',
    ],
    differences: [
      'Low-latitude Gale Crater (~4.6°S) lacks modern near-surface massive glacier ice at the rover traverse elevation.',
    ],
    limitations: [
      'Antarctic logistics prohibit heavy rover fleets; satellite context only without packaged 30 m DEM in this workspace.',
    ],
    unavailableInfo: [
      'In-workspace 30 m elevation/slope array for Taylor or Wright Valley.',
    ],
    unsupportedConclusions: [
      'Polar dry-valley ice tables are not a climate analog for equatorial Gale Crater.',
    ],
  },
  'rio-tinto': {
    similarities: [
      'Chemolithotrophic iron oxidation produces jarosite and hematite assemblages mineralogically relevant to Meridiani Planum.',
    ],
    differences: [
      'Río Tinto is a flowing perennial river in a temperate Mediterranean climate—morphologically opposite to hyperarid Gale Scarps.',
    ],
    limitations: [
      'Strong mineralogical analog only; unsuitable as a hyperarid geomorphology or drainage-density analog.',
    ],
    unavailableInfo: [
      'No packaged 30 m terrain dataset in workspace for Río Tinto.',
    ],
    unsupportedConclusions: [
      'Active acid rivers on Earth do not indicate stable modern liquid rivers on Mars today.',
    ],
  },
};

export interface ScienceTopic {
  id: string;
  index: string;
  question: string;
  summary: string;
  details: string[];
  referenceNote: string;
}

export const SCIENCE_EXPLAINED_TOPICS: ScienceTopic[] = [
  {
    id: 'what-are-analogs',
    index: '01',
    question: 'What planetary analogs are',
    summary:
      'Earth locations exhibiting geological, chemical, or physical processes comparable to environments on the Moon, Mars, or icy worlds.',
    details: [
      'No single site on Earth replicates every planetary variable at once (gravity, pressure, radiation, mineralogy, and climate).',
      'Instead, researchers match specific processes—such as hyperarid salt crust stabilization in the Atacama or vesicular basalt trafficability in Iceland—to test discrete hypotheses.',
    ],
    referenceNote: 'NASA Solar System Exploration Research Virtual Institute (SSERVI) Analog Framework',
  },
  {
    id: 'why-nasa-uses-analogs',
    index: '02',
    question: 'Why NASA and research teams use analog environments',
    summary:
      'Field testing instruments, rover autonomy, and crew procedures in natural geological heterogeneity reduces mission risk before launch.',
    details: [
      'Laboratory rock boxes rarely reproduce stratified clays, cementation gradients, wind-blown dust coats, and unpredictable fracture planes.',
      'Testing laser spectrometers (LIBS/Raman), rotary percussive drills, and hazard cameras in Atacama, Devon Island, or Hawaiʻi uncovers failure modes while engineers can still iterate.',
    ],
    referenceNote: 'NASA PSTAR / Mars Science Laboratory / Artemis Geology Field Training',
  },
  {
    id: 'how-terrain-comparisons-work',
    index: '03',
    question: 'How terrain comparisons work at orbital scale',
    summary:
      'Digital Elevation Models (DEMs) align identical spatial windows (here 3.84 km × 3.84 km at 30 m grid spacing) to compare relief and slope fairly.',
    details: [
      'Comparing raw visual brightness alone can mislead because solar incidence angle and camera contrast stretch vary between satellites.',
      'Re-sampling USGS Gale Crater (downsampled cleanly to 30 m) onto the same spatial resolution as ESA Copernicus GLO-30 eliminates scale bias between orbital datasets.',
    ],
    referenceNote: 'Copernicus GLO-30 (ESA) & USGS Astrogeology Gale Merged DEM v3',
  },
  {
    id: 'why-elevation-and-slope-matter',
    index: '04',
    question: 'Why elevation range and Horn slope matter',
    summary:
      'Slope steepness dictates rover wheel slip, lander tilt stability, drainage energy, and exposed stratigraphic cross-sections.',
    details: [
      'We compute directional terrain gradient using Horn’s (1981) 3×3 neighborhood method across Δx = 30 m cells: tan θ = √((dz/dx)² + (dz/dy)²).',
      'Gentle pediments (< 5°) permit fast autonomous driving, whereas bench scarps (> 15–25°) expose layered rock beds for remote imaging but exceed safe traverse limits.',
    ],
    referenceNote: 'Horn (1981) Hill Shading & Reflectance Map Derivation; MSL Traverse Planning',
  },
  {
    id: 'how-scientists-interpret-similarities',
    index: '05',
    question: 'How scientists interpret environmental similarities',
    summary:
      'Similarity is hypothesis-driven rather than reduced to an arbitrary single percentage score.',
    details: [
      'A landscape can match chemically (e.g., Río Tinto sulfates) while failing morphologically (active river vs. frozen desert).',
      'Scientific evaluation asks: which measured observable agrees (relief order, clay hydration, thermal cycling), under what physical scaling law, and with which independent verification dataset?',
    ],
    referenceNote: 'Azua-Bustos et al. (2020) — Wet Smectites in the Atacama Hyperarid Core',
  },
  {
    id: 'why-analogs-have-limitations',
    index: '06',
    question: 'Why analogs always have limitations',
    summary:
      'Earth gravity (9.81 m/s² vs. 3.72 m/s² Mars / 1.62 m/s² Moon), liquid water, biology, and dense air cannot be turned off in the field.',
    details: [
      'Lower planetary gravity alters granular angle of repose, dust settling times, and drill cuttings evacuation.',
      'Terrestrial microbiology rapidly colonizes trace moisture, whereas planetary surfaces may lack endogenous life—requiring strict contamination and blank controls.',
    ],
    referenceNote: 'NASA NSSDCA Planetary Fact Sheets & COSPAR Planetary Protection Principles',
  },
];

