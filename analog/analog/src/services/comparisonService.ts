import type {
  DerivedTerrainGrid,
  DifferenceAnalysisResult,
  DifferenceMetricId,
  DifferenceValidationCheck,
  TerrainGridDataset,
} from '../types/terrain';
import type {
  EvidenceRecord,
  FieldFeasibilityItem,
  ResearchObjectiveConfig,
  TwoAxisReadinessResult,
} from '../types/evidence';
import type { ScientificSummaryData } from '../types/investigation';
import { buildHistogram, computeSummaryStats } from './geospatialService';

export function computeDifferenceAnalysis(
  earthDataset: TerrainGridDataset,
  earthDerived: DerivedTerrainGrid,
  marsDataset: TerrainGridDataset,
  marsDerived: DerivedTerrainGrid,
  metric: DifferenceMetricId
): DifferenceAnalysisResult {
  const n = earthDataset.gridWidth * earthDataset.gridHeight;
  const bothReal =
    earthDataset.dataState === 'REAL_DATA' && marsDataset.dataState === 'REAL_DATA';
  const neitherUnavailable =
    earthDataset.dataState !== 'UNAVAILABLE' && marsDataset.dataState !== 'UNAVAILABLE';

  const checks: DifferenceValidationCheck[] = [
    {
      id: 'availability',
      label: 'Both datasets loaded (not UNAVAILABLE)',
      passed: neitherUnavailable,
      detail: neitherUnavailable
        ? `Earth: ${earthDataset.dataState}, Mars: ${marsDataset.dataState}`
        : 'One or both datasets are marked UNAVAILABLE.',
    },
    {
      id: 'scale',
      label: 'Common horizontal grid cell spacing',
      passed: earthDataset.cellSizeMeters === marsDataset.cellSizeMeters && earthDataset.gridWidth === marsDataset.gridWidth,
      detail: `Earth ${earthDataset.cellSizeMeters} m (${earthDataset.gridWidth}×${earthDataset.gridHeight}) vs. Planetary ${marsDataset.cellSizeMeters} m (${marsDataset.gridWidth}×${marsDataset.gridHeight})`,
    },
    {
      id: 'coverage',
      label: 'Valid data coverage >= 80%',
      passed: earthDataset.stats.coveragePercent >= 80 && marsDataset.stats.coveragePercent >= 80,
      detail: `Earth ${earthDataset.stats.coveragePercent}% valid, Planetary ${marsDataset.stats.coveragePercent}% valid`,
    },
    {
      id: 'method',
      label: 'Identical mathematical derivation',
      passed: metric === 'slope' || metric === 'roughness',
      detail:
        metric === 'slope'
          ? 'Horn (1981) 3×3 gradient on both grids'
          : metric === 'roughness'
            ? '3×3 TRI (90 m × 90 m window) on both grids'
            : metric === 'elevation'
              ? 'Incompatible vertical datums: Earth EGM2008 orthometric vs. Mars MOLA Areoid'
              : 'Aspect is a circular compass angle (0°–360°); scalar subtraction is non-physical',
    },
    {
      id: 'datum',
      label: 'Datum & unit compatibility',
      passed: metric === 'slope' || metric === 'roughness',
      detail:
        metric === 'slope'
          ? 'Both in dimensionless degrees (°), datum-independent gradient'
          : metric === 'roughness'
            ? 'Both in relative local relief (m), invariant to vertical datum offset'
            : metric === 'elevation'
              ? `Blocked: "${earthDataset.verticalDatum}" cannot be subtracted from "${marsDataset.verticalDatum}"`
              : 'Blocked: compass azimuth difference requires circular/vector statistics rather than scalar Δ',
    },
  ];

  const allPassed = checks.every((c) => c.passed);

  if (!allPassed) {
    const failed = checks.filter((c) => !c.passed).map((c) => c.detail).join(' ');
    return {
      metric,
      metricLabel:
        metric === 'elevation'
          ? 'Absolute Elevation Difference'
          : metric === 'aspect'
            ? 'Aspect Orientation Difference'
            : metric === 'slope'
              ? 'Slope Difference (Earth − Mars)'
              : 'Roughness TRI Difference (Earth − Mars)',
      units: metric === 'slope' ? '°' : metric === 'aspect' ? '°' : 'm',
      valid: false,
      disabledReason: failed,
      checks,
      earthLabel: earthDataset.shortName,
      marsLabel: marsDataset.shortName,
      commonScaleMeters: earthDataset.cellSizeMeters,
      gridValues: new Array(n).fill(null),
      stats: null,
      histogram: [],
    };
  }

  const earthArr = metric === 'slope' ? earthDerived.slopeDegrees : earthDerived.roughnessTriMeters;
  const marsArr = metric === 'slope' ? marsDerived.slopeDegrees : marsDerived.roughnessTriMeters;
  const gridValues: (number | null)[] = new Array(n).fill(null);

  for (let i = 0; i < n; i++) {
    const ev = earthArr[i];
    const mv = marsArr[i];
    if (ev !== null && ev !== undefined && mv !== null && mv !== undefined) {
      gridValues[i] = Math.round((ev - mv) * 100) / 100;
    }
  }

  const binEdges = metric === 'slope' ? [-30, -15, -5, -1, 1, 5, 15, 30] : [-15, -8, -3, -1, 1, 3, 8, 15];
  const unit = metric === 'slope' ? '°' : 'm';

  return {
    metric,
    metricLabel:
      metric === 'slope'
        ? `Slope Difference (Earth − Mars)${bothReal ? '' : ' [Demo]'}`
        : `TRI Roughness Difference (Earth − Mars)${bothReal ? '' : ' [Demo]'}`,
    units: unit,
    valid: true,
    checks,
    earthLabel: earthDataset.shortName,
    marsLabel: marsDataset.shortName,
    commonScaleMeters: earthDataset.cellSizeMeters,
    gridValues,
    stats: computeSummaryStats(gridValues),
    histogram: buildHistogram(gridValues, binEdges, unit),
  };
}

export function computeTwoAxisReadiness(
  earthDataset: TerrainGridDataset,
  marsDataset: TerrainGridDataset,
  evidence: EvidenceRecord[],
  feasibility: FieldFeasibilityItem[]
): TwoAxisReadinessResult {
  const realCount = [earthDataset, marsDataset].filter((d) => d.dataState === 'REAL_DATA').length;
  const verifiedEvidence = evidence.filter(
    (e) => e.classification !== 'Not available'
  ).length;

  // Axis 1: Scientific Evidence Strength (coverage + verified provenance + peer-reviewed records)
  const datasetCoverageTerm =
    realCount === 2 ? 50 : realCount === 1 ? 25 : 5;
  const evidenceRecordTerm = Math.min(50, verifiedEvidence * 9);
  const scientificEvidenceScore = Math.min(100, datasetCoverageTerm + evidenceRecordTerm);
  const scientificEvidenceTier =
    scientificEvidenceScore >= 75 ? 'High' : scientificEvidenceScore >= 45 ? 'Moderate' : 'Low';

  // Axis 2: Field Feasibility Information (independent of planetary similarity!)
  const verifiedFeasibility = feasibility.filter((f) => f.status === 'Verified').length;
  const needsVerification = feasibility.filter((f) => f.status === 'Needs verification');
  const unknownItems = feasibility.filter((f) => f.status === 'Unknown');
  const fieldFeasibilityScore = Math.round((verifiedFeasibility / Math.max(1, feasibility.length)) * 100);
  const fieldFeasibilityTier =
    fieldFeasibilityScore >= 75 ? 'High' : fieldFeasibilityScore >= 40 ? 'Partial' : 'Low';

  let category: TwoAxisReadinessResult['category'] = 'Insufficient information';
  if (scientificEvidenceScore >= 70 && fieldFeasibilityScore >= 70) {
    category = 'Research-ready candidate';
  } else if (scientificEvidenceScore >= 70 && fieldFeasibilityScore < 70) {
    category = 'Remote-study candidate';
  } else if (scientificEvidenceScore >= 40) {
    category = 'Further scientific investigation needed';
  }

  return {
    scientificEvidenceScore,
    scientificEvidenceTier,
    fieldFeasibilityScore,
    fieldFeasibilityTier,
    category,
    supportingEvidence: [
      `${realCount}/2 terrain datasets validated as REAL_DATA (${earthDataset.stats.coveragePercent}% Earth, ${marsDataset.stats.coveragePercent}% planetary coverage at 30.0 m).`,
      `${verifiedEvidence} traceable scientific evidence records attached (Azua-Bustos et al. 2020, Copernicus GLO-30, USGS Gale DEM, NASA PDS MSL).`,
      `${verifiedFeasibility}/${feasibility.length} Earth field feasibility categories verified remotely (highway access, hazards, seasonality, regional logistics).`,
    ],
    missingInformation: [
      'No continuous 30 m hyperspectral / mineral-abundance raster packaged for Yungay subsurface smectites.',
      'Sub-meter boulder/roughness metrics unavailable after 30 m common-grid resampling.',
      ...(marsDataset.dataState === 'UNAVAILABLE' ? ['Planetary target DEM (Moon LRO LOLA/NAC) is not packaged locally.'] : []),
    ],
    unverifiedConditions: needsVerification
      .concat(unknownItems)
      .map((item) => `${item.category}: ${item.status} — ${item.sourceNote}`),
    rationale:
      category === 'Remote-study candidate'
        ? 'Scientific terrain and peer-reviewed evidence support remote comparative study, while Chilean land-management, permit, and station-facility items still require local verification before field deployment.'
        : category === 'Research-ready candidate'
          ? 'Both scientific evidence and field feasibility records meet verification thresholds.'
          : 'Missing planetary DEM or incomplete field verification prevents research-ready classification.',
  };
}

export function buildScientificSummary(
  earthDataset: TerrainGridDataset,
  earthDerived: DerivedTerrainGrid,
  marsDataset: TerrainGridDataset,
  marsDerived: DerivedTerrainGrid,
  objective: ResearchObjectiveConfig
): ScientificSummaryData {
  const earthSlopeMean = earthDerived.slopeStats.mean.toFixed(2);
  const marsSlopeMean = marsDerived.slopeStats.mean.toFixed(2);
  const earthSlopeP90 = earthDerived.slopeStats.p90.toFixed(2);
  const marsSlopeP90 = marsDerived.slopeStats.p90.toFixed(2);
  const earthTriMean = earthDerived.roughnessStats.mean.toFixed(2);
  const marsTriMean = marsDerived.roughnessStats.mean.toFixed(2);

  if (marsDataset.dataState === 'UNAVAILABLE') {
    return {
      observedSimilarities: [],
      observedDifferences: [
        `Earth (${earthDataset.shortName}) loaded at 30.0 m (${earthDataset.stats.minElevation.toFixed(1)}–${earthDataset.stats.maxElevation.toFixed(1)} m EGM2008), while the selected planetary target (${marsDataset.planet}) has no local DEM packaged.`,
      ],
      evidenceGaps: [marsDataset.unavailableReason ?? 'Planetary target DEM unavailable.'],
      dataQualityLimitations: [
        'Quantitative comparison disabled until a validated planetary DEM subset is ingested.',
      ],
      scientificUncertainties: objective.caveats,
      cautionaryStatement:
        'Cross-planetary terrain comparison cannot proceed while the planetary DEM is unavailable. No measurements have been fabricated.',
    };
  }

  return {
    observedSimilarities: [
      `Both ${earthDataset.shortName} and ${marsDataset.shortName} exhibit arid sediment-mantled basins bounded by eroded slopes, with phyllosilicate clay horizons documented independently in peer-reviewed studies (Yungay subsurface smectites vs. Gale lacustrine mudstones).`,
      `At the common 30.0 m analysis grid (n = ${earthDerived.slopeStats.validCount.toLocaleString()} interior cells), both terrains show moderate macro-scale ruggedness (mean TRI: Earth ${earthTriMean} m vs. Mars ${marsTriMean} m) and comparable low-to-moderate mean slopes (Earth ${earthSlopeMean}° vs. Mars ${marsSlopeMean}°).`,
    ],
    observedDifferences: [
      `Total topographic relief across the 3.84 km × 3.84 km window differs substantially: ${earthDataset.stats.reliefMeters.toFixed(1)} m at Yungay versus ${marsDataset.stats.reliefMeters.toFixed(1)} m at ${marsDataset.shortName}, with steeper upper-decile scarps on Mars (p90 slope ${marsSlopeP90}° vs. ${earthSlopeP90}° at Yungay).`,
      'Vertical reference datums are physically incompatible (Earth EGM2008 geoid vs. Mars MOLA Areoid); absolute elevation offsets cannot be subtracted.',
      'Environmental boundary conditions diverge sharply: Earth ~900 mbar oxygenic atmosphere and active microbiome versus Mars ~6.1 mbar CO₂, cosmic radiation, and ancient (~3.5 Ga) aqueous deposition.',
    ],
    evidenceGaps: [
      'No spatially continuous 30 m mineralogical/moisture raster is packaged for Yungay; smectite observations come from localized trench studies (Azua-Bustos et al., 2020).',
      'Land ownership, local research permits, and Yungay Station facility capacity require verification with local Chilean institutions.',
    ],
    dataQualityLimitations: [
      'Copernicus GLO-30 is a radar-derived Digital Surface Model (DSM) at ~30 m spacing, whereas USGS MSL Gale DEM is a 1 m stereo photogrammetric mosaic block-averaged to 30 m.',
      'Resampling Mars 1 m DEM to 30 m smooths meter-scale rover mobility hazards (boulders, wheel-trap ripples, scarp ledges).',
    ],
    scientificUncertainties: objective.caveats,
    cautionaryStatement:
      'Yungay provides an Earth-based research environment for investigating extreme aridity and subsurface clay-associated habitability. Gale Crater provides a planetary geological context with evidence of ancient aqueous processes and clay-bearing deposits. These sites offer complementary research contexts, but their environments and geological histories are not equivalent.',
  };
}

export function generateResearchReportMarkdown(params: {
  investigationId: string;
  objective: ResearchObjectiveConfig;
  earthDataset: TerrainGridDataset;
  earthDerived: DerivedTerrainGrid;
  marsDataset: TerrainGridDataset;
  marsDerived: DerivedTerrainGrid;
  evidence: EvidenceRecord[];
  feasibility: FieldFeasibilityItem[];
  readiness: TwoAxisReadinessResult;
  summary: ScientificSummaryData;
}): string {
  const {
    investigationId,
    objective,
    earthDataset,
    earthDerived,
    marsDataset,
    marsDerived,
    evidence,
    feasibility,
    readiness,
    summary,
  } = params;

  return `# Planetary Analog Research Report — ${investigationId}
Generated: ${new Date().toISOString()}

> **Methodological Notice:** Project-defined readiness categories and comparative summaries are separated from sourced scientific measurements. No universal Earth–Mars similarity percentage is computed.

## 1. Research Configuration
- **Investigation ID:** ${investigationId}
- **Planetary Target:** ${marsDataset.planet} (${marsDataset.siteName})
- **Terrestrial Analog:** ${earthDataset.siteName}
- **Research Objective:** ${objective.label}
- **Common Analysis Scale:** ${earthDataset.cellSizeMeters}.0 m × ${earthDataset.cellSizeMeters}.0 m

## 2. Dataset Status & Native Provenance
| Attribute | Earth Analog | Planetary Reference |
|---|---|---|
| Dataset | ${earthDataset.provenance.datasetName} | ${marsDataset.provenance.datasetName} |
| Data State | ${earthDataset.dataState} | ${marsDataset.dataState} |
| Native Resolution | ${earthDataset.nativeResolutionLabel} | ${marsDataset.nativeResolutionLabel} |
| Analysis Resolution | ${earthDataset.analysisResolutionLabel} | ${marsDataset.analysisResolutionLabel} |
| CRS | ${earthDataset.crs} | ${marsDataset.crs} |
| Vertical Datum | ${earthDataset.verticalDatum} | ${marsDataset.verticalDatum} |
| Valid Coverage | ${earthDataset.stats.coveragePercent}% (${earthDataset.stats.validCells}/${earthDataset.stats.totalCells}) | ${marsDataset.stats.coveragePercent}% (${marsDataset.stats.validCells}/${marsDataset.stats.totalCells}) |
| Source URL | ${earthDataset.provenance.originalUrl} | ${marsDataset.provenance.originalUrl} |

## 3. Quantitative Terrain Measurements (30.0 m Common Grid)
- **Earth Elevation (EGM2008):** ${earthDataset.stats.minElevation.toFixed(2)} to ${earthDataset.stats.maxElevation.toFixed(2)} m (Relief: ${earthDataset.stats.reliefMeters.toFixed(2)} m)
- **Mars Elevation (MOLA Areoid):** ${marsDataset.dataState === 'UNAVAILABLE' ? 'UNAVAILABLE' : `${marsDataset.stats.minElevation.toFixed(2)} to ${marsDataset.stats.maxElevation.toFixed(2)} m (Relief: ${marsDataset.stats.reliefMeters.toFixed(2)} m)`}
- **Earth Slope (Horn 3×3):** mean ${earthDerived.slopeStats.mean.toFixed(2)}°, median ${earthDerived.slopeStats.median.toFixed(2)}°, p90 ${earthDerived.slopeStats.p90.toFixed(2)}°, max ${earthDerived.slopeStats.max.toFixed(2)}° (n=${earthDerived.slopeStats.validCount})
- **Mars Slope (Horn 3×3):** ${marsDataset.dataState === 'UNAVAILABLE' ? 'UNAVAILABLE' : `mean ${marsDerived.slopeStats.mean.toFixed(2)}°, median ${marsDerived.slopeStats.median.toFixed(2)}°, p90 ${marsDerived.slopeStats.p90.toFixed(2)}°, max ${marsDerived.slopeStats.max.toFixed(2)}° (n=${marsDerived.slopeStats.validCount})`}
- **Earth Roughness (TRI 3×3):** mean ${earthDerived.roughnessStats.mean.toFixed(2)} m, p90 ${earthDerived.roughnessStats.p90.toFixed(2)} m
- **Mars Roughness (TRI 3×3):** ${marsDataset.dataState === 'UNAVAILABLE' ? 'UNAVAILABLE' : `mean ${marsDerived.roughnessStats.mean.toFixed(2)} m, p90 ${marsDerived.roughnessStats.p90.toFixed(2)} m`}

## 4. Scientific Evidence & Sources
${evidence.map((e) => `- **[${e.classification}] ${e.title}** (${e.sourceInstitution}, ${e.date}): ${e.claim} *Limitation:* ${e.limitations} (${e.sourceUrl})`).join('\n')}

## 5. Field Feasibility Assessment (Independent of Similarity)
${feasibility.map((f) => `- **${f.category} [${f.status}]:** ${f.summary} *(Source: ${f.sourceNote})*`).join('\n')}

## 6. Two-Axis Readiness Assessment (Application-Defined)
- **Readiness Category:** ${readiness.category} *(Not an official NASA classification)*
- **Scientific Evidence Tier:** ${readiness.scientificEvidenceTier}
- **Field Feasibility Tier:** ${readiness.fieldFeasibilityTier}
- **Rationale:** ${readiness.rationale}

## 7. Missing Information & Limitations
${summary.evidenceGaps.map((g) => `- ${g}`).join('\n')}
${summary.dataQualityLimitations.map((l) => `- ${l}`).join('\n')}

## 8. Conclusions
${summary.cautionaryStatement}
`;
}

