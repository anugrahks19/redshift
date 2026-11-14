import type { InvestigationPreset } from '../types/investigation';

export const INVESTIGATION_PRESETS: InvestigationPreset[] = [
  {
    id: 'ATACAMA-GALE-001',
    title: 'ATACAMA-GALE-001 · Yungay ↔ Gale Crater (Murray Buttes / Vera Rubin Ridge)',
    targetPlanet: 'Mars',
    earthSiteId: 'yungay-atacama',
    earthDatasetId: 'earth-yungay-copernicus-30m',
    planetarySiteId: 'gale-murray',
    planetaryDatasetId: 'mars-gale-murray-30m',
    planetarySiteName: 'Gale Crater — Murray Buttes & Vera Rubin Ridge',
    defaultObjective: 'astrobiology-geology',
    researchContextSummary:
      'Compares hyperarid clay-bearing Atacama pediment terrain (Copernicus GLO-30) with ancient lacustrine clay/hematite ridge terrain in Gale Crater (USGS MSL 1 m DEM resampled to 30 m).',
  },
  {
    id: 'ATACAMA-BRADBURY-002',
    title: 'ATACAMA-BRADBURY-002 · Yungay ↔ Gale Crater (Bradbury Landing / Aeolis Palus)',
    targetPlanet: 'Mars',
    earthSiteId: 'yungay-atacama',
    earthDatasetId: 'earth-yungay-copernicus-30m',
    planetarySiteId: 'gale-bradbury',
    planetaryDatasetId: 'mars-gale-bradbury-30m',
    planetarySiteName: 'Gale Crater — Bradbury Landing & Aeolis Palus',
    defaultObjective: 'rover-mobility',
    researchContextSummary:
      'Compares low-relief Atacama alluvial basin terrain against the lower-relief Peace Vallis alluvial fan / Bradbury Landing plains in Gale Crater at a common 30.0 m scale.',
  },
];

