export const DEFAULT_WEIGHTS = { elevation: 0.20, slope: 0.25, roughness: 0.25, temperature: 0.30 };
const round2 = (value) => Math.round(value * 100) / 100;

export function rankEarthAnalogues(datasets, targetEntry, weightsReq = DEFAULT_WEIGHTS) {
  const earthEntries = Object.values(datasets).filter((d) => d.planet === 'Earth');
  return earthEntries.map((earth) => {
    const reliefDiffRatio = Math.abs(earth.reliefMeters - targetEntry.reliefMeters) / Math.max(earth.reliefMeters, targetEntry.reliefMeters, 100);
    const elevStdDiffRatio = Math.abs(earth.elevationStats.stdDev - targetEntry.elevationStats.stdDev) / Math.max(earth.elevationStats.stdDev, targetEntry.elevationStats.stdDev, 25);
    const elevationScore = round2(Math.max(0, Math.min(100, (1 - (0.5 * reliefDiffRatio + 0.5 * elevStdDiffRatio)) * 100)));

    const slopeMeanDiff = Math.abs(earth.slopeStats.mean - targetEntry.slopeStats.mean);
    const slopeP90Diff = Math.abs(earth.slopeStats.p90 - targetEntry.slopeStats.p90);
    const slopeScore = round2(Math.max(0, Math.min(100, (1 - (0.6 * (slopeMeanDiff / 22) + 0.4 * (slopeP90Diff / 35))) * 100)));

    const roughMeanDiff = Math.abs(earth.roughnessStats.mean - targetEntry.roughnessStats.mean);
    const roughP90Diff = Math.abs(earth.roughnessStats.p90 - targetEntry.roughnessStats.p90);
    const roughnessScore = round2(Math.max(0, Math.min(100, (1 - (0.6 * (roughMeanDiff / (18 * Math.sqrt(8))) + 0.4 * (roughP90Diff / (30 * Math.sqrt(8))))) * 100)));

    const temperatureScore = null;
    const available = {
      elevation: weightsReq.elevation ?? DEFAULT_WEIGHTS.elevation,
      slope: weightsReq.slope ?? DEFAULT_WEIGHTS.slope,
      roughness: weightsReq.roughness ?? DEFAULT_WEIGHTS.roughness,
      temperature: 0,
    };
    const weightSum = available.elevation + available.slope + available.roughness;
    const effectiveWeights = Object.fromEntries(
      Object.entries(available).map(([key, value]) => [key, weightSum > 0 ? value / weightSum : 0])
    );
    const overallSimilarityScore = weightSum > 0 ? round2(
      elevationScore * effectiveWeights.elevation +
      slopeScore * effectiveWeights.slope +
      roughnessScore * effectiveWeights.roughness
    ) : null;

    return {
      earthSiteId: earth.siteId,
      earthDatasetId: earth.datasetId,
      earthSiteName: earth.siteName,
      shortName: earth.shortName,
      terrainSource: earth.provenance ? { name: earth.provenance.datasetName, url: earth.provenance.cogUrl ?? earth.provenance.originalUrl } : null,
      overallSimilarityScore,
      indexLabel: 'Exploratory Analog Similarity Index',
      parameterScores: {
        elevation: elevationScore,
        slope: slopeScore,
        roughness: roughnessScore,
        temperature: temperatureScore,
      },
      effectiveWeights,
      temperatureIncluded: false,
      missingParameterDisclosure: weightSum === 0
        ? 'Select a supported terrain parameter with positive weight to calculate a score.'
        : 'Temperature excluded because no matched observation context is available. Remaining weights are normalized.',
      earthMetrics: {
        elevationMean: earth.elevationStats.mean,
        reliefMeters: earth.reliefMeters,
        slopeMean: earth.slopeStats.mean,
        roughnessMean: earth.roughnessStats.mean,
        temperatureDayCelsius: earth.temperatureSummary.dayMeanCelsius,
        temperatureNightCelsius: earth.temperatureSummary.nightMeanCelsius,
      },
      targetMetrics: {
        elevationMean: targetEntry.elevationStats.mean,
        reliefMeters: targetEntry.reliefMeters,
        slopeMean: targetEntry.slopeStats.mean,
        roughnessMean: targetEntry.roughnessStats.mean,
        temperatureMinCelsius: targetEntry.temperatureSummary.minCelsius,
        temperatureMaxCelsius: targetEntry.temperatureSummary.maxCelsius,
      },
    };
  }).sort((a, b) => (b.overallSimilarityScore ?? -1) - (a.overallSimilarityScore ?? -1));
}
