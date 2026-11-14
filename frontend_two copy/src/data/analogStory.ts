export type TargetWorldId = 'mars-jezero' | 'moon-south-pole' | 'mars-arcadia'
export type LensModeId = 'explore' | 'learn' | 'research'

export interface AnalogRibbonPlate {
  index: string
  code: string
  name: string
  location: string
  coords: string
  targetBody: 'Moon' | 'Mars' | 'Dual Analog'
  image: string
  slopeDeg: number
  roughnessCm: number
  mineralTag: string
  headline: string
  storyLine: string
  evidenceStatus: string
  feasibilityStatus: string
  feasibilityDetail: string
  limitsNote: string
  wavePoints: string
}

export const ANALOG_PLATES: AnalogRibbonPlate[] = [
  {
    index: '01',
    code: 'CN-QDM-01',
    name: 'Dalangtan Playa',
    location: 'Qaidam Basin, China',
    coords: '38.48° N · 91.42° E',
    targetBody: 'Mars',
    image: '/images/mars-map.jpg',
    slopeDeg: 11.4,
    roughnessCm: 17,
    mineralTag: 'Mg-Sulfate Evaporites & Yardangs',
    headline: 'Wind-carved sulfate salt polygons mirror ancient Martian lakebeds.',
    storyLine:
      'Selected over conventional deserts via Copernicus 30m DEM & ASTER SWIR band matching against MRO CRISM data.',
    evidenceStatus: '95.1% Spectral Parity',
    feasibilityStatus: 'Conditional · Altitude 2,890 m',
    feasibilityDetail: 'Gravel haul access from G315; spring dust storm & potash zone permit gates apply.',
    limitsNote: '720 mbar ambient air pressure and residual deep brine exceed Mars surface conditions.',
    wavePoints: 'M0,52 L28,48 L60,34 L94,40 L128,20 L166,44 L204,28 L244,48 L280,45',
  },
  {
    index: '02',
    code: 'ZA-TSW-02',
    name: 'Tswaing Crater',
    location: 'Gauteng North, South Africa',
    coords: '25.41° S · 28.08° E',
    targetBody: 'Dual Analog',
    image: '/images/moon-map.jpg',
    slopeDeg: 17.6,
    roughnessCm: 22,
    mineralTag: 'Preserved Simple Impact Rim',
    headline: 'A 220,000-year-old crater bowl just forty minutes from city logistics.',
    storyLine:
      'Rare accessible granite rim walls (18°–26°) built for testing lunar crater-ingress rovers and brine coring.',
    evidenceStatus: '93.4% Morphometric Fit',
    feasibilityStatus: 'Field-Ready · 2WD Access',
    feasibilityDetail: 'Reserve scientific permit required; year-round lab & medical proximity.',
    limitsNote: 'Sub-tropical outer rim flora and central soda lake hydrology do not exist on Moon or Mars.',
    wavePoints: 'M0,44 L48,40 L84,12 L116,58 L164,58 L196,12 L232,40 L280,44',
  },
  {
    index: '03',
    code: 'CL-PAJ-03',
    name: 'Salar de Pajonales',
    location: 'Altiplano, Chile',
    coords: '25.14° S · 68.79° W',
    targetBody: 'Mars',
    image: '/images/mars-map.jpg',
    slopeDeg: 6.2,
    roughnessCm: 18,
    mineralTag: 'UV-Baked Gypsum Stromatolites',
    headline: 'Selenite ridges entomb microbial clues under punishing solar radiation.',
    storyLine:
      'Benchmark biosignature matrix calibrating Raman & UV fluorescence spectrometers bound for Jezero.',
    evidenceStatus: '94.6% Mineral Match',
    feasibilityStatus: 'Conditional · 3,540 m Elevation',
    feasibilityDetail: 'High-clearance 4x4 track; CONAF conservation sampling authorization required.',
    limitsNote: 'Earth ~21% O2 mixing ratio and trace snowmelt recharge differ from Mars hyper-aridity.',
    wavePoints: 'M0,48 C40,46 64,26 105,30 C145,34 176,48 214,22 C240,14 260,36 280,38',
  },
  {
    index: '04',
    code: 'ES-LNZ-04',
    name: 'Lanzarote Tubes',
    location: 'Canary Islands, Spain',
    coords: '29.01° N · 13.75° W',
    targetBody: 'Moon',
    image: '/images/moon-map.jpg',
    slopeDeg: 15.9,
    roughnessCm: 27,
    mineralTag: 'Unweathered Alkali Basalt & Caves',
    headline: 'Skylight lava conduits for astronaut subterranean shelter & LiDAR SLAM.',
    storyLine:
      'Clinker-strewn basalt surfaces mirror boulder fields at lunar mare landing corridors.',
    evidenceStatus: '92.8% Lithology Fit',
    feasibilityStatus: 'Field-Ready · Year-Round',
    feasibilityDetail: 'UNESCO Geopark crew training protocol; zero GNSS signal beneath lava ceilings.',
    limitsNote: '1.0g gravity restricts tube diameters compared to wider low-gravity lunar lava tubes.',
    wavePoints: 'M0,26 L46,24 L82,56 L138,60 L194,56 L228,24 L280,28',
  },
  {
    index: '05',
    code: 'CA-HGT-05',
    name: 'Haughton Crater',
    location: 'Devon Island, Nunavut',
    coords: '75.38° N · 89.68° W',
    targetBody: 'Dual Analog',
    image: '/images/earth-day.jpg',
    slopeDeg: 14.1,
    roughnessCm: 20,
    mineralTag: 'Permafrost Impact Breccia',
    headline: 'Grazing polar sun and frozen impact stone mirror Arcadia & Shackleton.',
    storyLine:
      'Calibrates subsurface ground-penetrating radar against ice-cemented crater walls under low-sun contrast.',
    evidenceStatus: '94.2% Thermal/Ice Fit',
    feasibilityStatus: 'Permit Gated · Arctic Airlift',
    feasibilityDetail: '10-week summer campaign window only; charter flight from Resolute Bay & wildlife protocols.',
    limitsNote: 'Summer active-layer snowmelt produces fluvial gullies unlike cryogenic -230°C lunar PSRs.',
    wavePoints: 'M0,48 L44,44 L92,18 L142,26 L192,42 L238,24 L280,42',
  },
]

export interface TargetHorizon {
  id: TargetWorldId
  body: 'Moon' | 'Mars'
  label: string
  instruments: string
  targetSlope: number
  targetTemp: string
  note: string
}

export const TARGET_HORIZONS: TargetHorizon[] = [
  {
    id: 'mars-jezero',
    body: 'Mars',
    label: 'Jezero Crater Western Delta',
    instruments: 'MRO HiRISE 0.25m · CRISM 18m',
    targetSlope: 14.8,
    targetTemp: '-88°C to -3°C',
    note: 'Carbonate & clay paleolake margin demanding balanced mineral fidelity and boulder hazard negotiation.',
  },
  {
    id: 'moon-south-pole',
    body: 'Moon',
    label: 'Shackleton–de Gerlache Ridge',
    instruments: 'LRO LOLA 5m · Diviner · Mini-RF',
    targetSlope: 16.4,
    targetTemp: '-230°C PSR / -45°C Lit',
    note: 'Grazing polar sun geometry requiring steep rim navigation alongside cryogenic volatile detection.',
  },
  {
    id: 'mars-arcadia',
    body: 'Mars',
    label: 'Arcadia Planitia Ice Plains',
    instruments: 'MRO SHARAD · THEMIS',
    targetSlope: 4.2,
    targetTemp: '-105°C to -18°C',
    note: 'Low-slope northern landing plains hosting shallow subsurface water-ice tables for human ISRU.',
  },
]

