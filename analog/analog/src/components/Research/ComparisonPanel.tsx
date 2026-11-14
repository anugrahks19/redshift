import React from 'react';
import type {
  DerivedTerrainGrid,
  DifferenceAnalysisResult,
  DistributionBin,
  TerrainGridDataset,
  TransectPreset,
  TransectSample,
} from '../../types/terrain';

interface ComparisonPanelProps {
  earthDataset: TerrainGridDataset;
  earthDerived: DerivedTerrainGrid;
  marsDataset: TerrainGridDataset;
  marsDerived: DerivedTerrainGrid;
  transectPreset: TransectPreset;
  onTransectPresetChange: (p: TransectPreset) => void;
  transectFraction: number;
  onTransectFractionChange: (f: number) => void;
  transectSamples: TransectSample[];
  differenceAnalysis: DifferenceAnalysisResult;
}

const MiniProfileSvg: React.FC<{
  title: string;
  subtitle: string;
  samples: TransectSample[];
  accessor: (s: TransectSample) => number | null;
  stroke: string;
  unit: string;
}> = ({ title, subtitle, samples, accessor, stroke, unit }) => {
  const validVals = samples.map(accessor).filter((v): v is number => v !== null && Number.isFinite(v));
  const W = 540;
  const H = 170;
  const padL = 52;
  const padR = 16;
  const padT = 16;
  const padB = 28;

  if (validVals.length === 0) {
    return (
      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 4, padding: 14, background: 'var(--bg-cool-neutral)' }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Unavailable — no valid elevation transect samples.</div>
      </div>
    );
  }

  const minV = Math.min(...validVals);
  const maxV = Math.max(...validVals);
  const span = Math.max(1, maxV - minV);
  const maxDist = samples[samples.length - 1]?.distanceMeters ?? 3840;

  const points = samples
    .map((s) => {
      const val = accessor(s);
      if (val === null) return null;
      const x = padL + (s.distanceMeters / maxDist) * (W - padL - padR);
      const y = padT + (1 - (val - minV) / span) * (H - padT - padB);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter((p): p is string => p !== null)
    .join(' ');

  return (
    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 4, padding: 12, background: 'var(--bg-white)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <strong style={{ fontSize: 13 }}>{title}</strong>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {minV.toFixed(1)} to {maxV.toFixed(1)} {unit} (Δ {span.toFixed(1)} m)
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 6 }}>{subtitle}</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={title}>
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <line x1={padL} y1={padT + (H - padT - padB) / 2} x2={W - padR} y2={padT + (H - padT - padB) / 2} stroke="rgba(255,255,255,0.09)" strokeDasharray="3 3" />
        <polyline fill="none" stroke={stroke} strokeWidth="2.2" points={points} />
        <text x={padL - 6} y={padT + 8} textAnchor="end" fontSize="10" fill="#94A3B8" fontFamily="IBM Plex Mono, monospace">
          {maxV.toFixed(0)}m
        </text>
        <text x={padL - 6} y={H - padB} textAnchor="end" fontSize="10" fill="#94A3B8" fontFamily="IBM Plex Mono, monospace">
          {minV.toFixed(0)}m
        </text>
        <text x={padL} y={H - 8} fontSize="10" fill="#94A3B8" fontFamily="IBM Plex Mono, monospace">
          0 m
        </text>
        <text x={W - padR} y={H - 8} textAnchor="end" fontSize="10" fill="#94A3B8" fontFamily="IBM Plex Mono, monospace">
          {maxDist} m
        </text>
      </svg>
    </div>
  );
};

const DualHistogram: React.FC<{
  title: string;
  methodNote: string;
  earthBins: DistributionBin[];
  marsBins: DistributionBin[];
  marsAvailable: boolean;
  earthN: number;
  marsN: number;
}> = ({ title, methodNote, earthBins, marsBins, marsAvailable, earthN, marsN }) => {
  const maxFreq = Math.max(
    0.05,
    ...earthBins.map((b) => b.frequency),
    ...(marsAvailable ? marsBins.map((b) => b.frequency) : [0])
  );

  return (
    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 4, padding: 14, background: 'var(--bg-white)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
        <strong style={{ fontSize: 13.5 }}>{title}</strong>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          n(Earth)={earthN.toLocaleString()} · n(Planetary)={marsAvailable ? marsN.toLocaleString() : '0'}
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 12 }}>{methodNote}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {earthBins.map((eb, idx) => {
          const mb = marsBins[idx];
          const ePct = (eb.frequency * 100).toFixed(1);
          const mPct = mb ? (mb.frequency * 100).toFixed(1) : '0.0';
          return (
            <div key={eb.label} style={{ display: 'grid', gridTemplateColumns: '84px 1fr 98px', alignItems: 'center', gap: 10, fontSize: 11.5 }}>
              <span className="mono" style={{ color: 'var(--ink-dark)' }}>{eb.label}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ height: 7, background: '#EEF2F5', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${(eb.frequency / maxFreq) * 100}%`, height: '100%', background: '#286A91' }} />
                </div>
                {marsAvailable && mb && (
                  <div style={{ height: 7, background: '#EEF2F5', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${(mb.frequency / maxFreq) * 100}%`, height: '100%', background: '#C28B38' }} />
                  </div>
                )}
              </div>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
                {ePct}% / {marsAvailable ? `${mPct}%` : '—'}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11.5, color: 'var(--text-muted)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, background: '#286A91', display: 'inline-block' }} /> Earth (Yungay)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, background: '#C28B38', display: 'inline-block' }} /> Planetary Reference
        </span>
      </div>
    </div>
  );
};

export const ComparisonPanel: React.FC<ComparisonPanelProps> = ({
  earthDataset,
  earthDerived,
  marsDataset,
  marsDerived,
  transectPreset,
  onTransectPresetChange,
  transectFraction,
  onTransectFractionChange,
  transectSamples,
  differenceAnalysis,
}) => {
  const marsAvailable = marsDataset.dataState !== 'UNAVAILABLE';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* A. Elevation Transects */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">A. Terrain Elevation Profiles (Independent Transects)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <select
              value={transectPreset}
              onChange={(e) => onTransectPresetChange(e.target.value as TransectPreset)}
              style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-light)', fontSize: 12 }}
              aria-label="Transect orientation"
            >
              <option value="west-east">West → East Slice</option>
              <option value="north-south">North → South Slice</option>
              <option value="nw-se">NW → SE Diagonal</option>
            </select>
            {transectPreset !== 'nw-se' && (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Position:</span>
                <input
                  type="range"
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={transectFraction}
                  onChange={(e) => onTransectFractionChange(parseFloat(e.target.value))}
                  style={{ width: 90, accentColor: '#286A91' }}
                />
                <span className="mono">{Math.round(transectFraction * 100)}%</span>
              </label>
            )}
          </div>
        </div>
        <div style={{ padding: 14 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Profiles are sampled independently on each 3.84 km × 3.84 km 30.0 m grid (not geographically corresponding coordinates). Vertical axes retain each body’s native vertical datum.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
            <MiniProfileSvg
              title={`Earth: ${earthDataset.shortName}`}
              subtitle={`${earthDataset.provenance.datasetName} · ${earthDataset.verticalDatum}`}
              samples={transectSamples}
              accessor={(s) => s.earthElevation}
              stroke="#286A91"
              unit="m"
            />
            <MiniProfileSvg
              title={`Planetary: ${marsDataset.shortName}`}
              subtitle={`${marsDataset.provenance.datasetName} · ${marsDataset.verticalDatum}`}
              samples={transectSamples}
              accessor={(s) => s.marsElevation}
              stroke="#C28B38"
              unit="m"
            />
          </div>
        </div>
      </div>

      {/* B & C. Slope and Roughness Distributions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        <DualHistogram
          title="B. Slope Distribution (Degrees)"
          methodNote={earthDerived.slopeMethod}
          earthBins={earthDerived.slopeHistogram}
          marsBins={marsDerived.slopeHistogram}
          marsAvailable={marsAvailable}
          earthN={earthDerived.slopeStats.validCount}
          marsN={marsDerived.slopeStats.validCount}
        />
        <DualHistogram
          title="C. Terrain Roughness Distribution (TRI, Meters)"
          methodNote={earthDerived.roughnessMethod}
          earthBins={earthDerived.roughnessHistogram}
          marsBins={marsDerived.roughnessHistogram}
          marsAvailable={marsAvailable}
          earthN={earthDerived.roughnessStats.validCount}
          marsN={marsDerived.roughnessStats.validCount}
        />
      </div>

      {/* Difference Compatibility Gate & Output */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Quantitative Difference Validation ({differenceAnalysis.metricLabel})</div>
          <span className={`badge ${differenceAnalysis.valid ? 'badge--real' : 'badge--unavailable'}`}>
            {differenceAnalysis.valid ? 'COMPATIBLE & COMPUTED' : 'DISABLED BY VALIDATOR'}
          </span>
        </div>
        <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 8 }}>Pre-Calculation Scientific Checks</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {differenceAnalysis.checks.map((chk) => (
                <li key={chk.id}>
                  <strong style={{ color: chk.passed ? '#1E5A55' : '#8A2E1D' }}>
                    {chk.passed ? 'PASS' : 'FAIL'} — {chk.label}:
                  </strong>{' '}
                  <span style={{ color: 'var(--text-muted)' }}>{chk.detail}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            {differenceAnalysis.valid && differenceAnalysis.stats ? (
              <div>
                <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 8 }}>
                  Computed Differential Summary (Earth − Mars, {differenceAnalysis.commonScaleMeters} m grid)
                </div>
                <div className="mono" style={{ fontSize: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                  <div>Mean Δ: {differenceAnalysis.stats.mean.toFixed(2)} {differenceAnalysis.units}</div>
                  <div>Median Δ: {differenceAnalysis.stats.median.toFixed(2)} {differenceAnalysis.units}</div>
                  <div>Min Δ: {differenceAnalysis.stats.min.toFixed(2)} {differenceAnalysis.units}</div>
                  <div>Max Δ: {differenceAnalysis.stats.max.toFixed(2)} {differenceAnalysis.units}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {differenceAnalysis.histogram.map((b) => (
                    <div key={b.label} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 48px', alignItems: 'center', gap: 8, fontSize: 11 }}>
                      <span className="mono">{b.label}</span>
                      <div style={{ height: 6, background: '#EEF2F5', borderRadius: 2 }}>
                        <div style={{ width: `${Math.min(100, b.frequency * 220)}%`, height: '100%', background: '#7666A5' }} />
                      </div>
                      <span className="mono" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                        {(b.frequency * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: 12, background: '#FCEAE7', border: '1px solid #E3A89E', borderRadius: 4, fontSize: 12.5, color: '#6E2214' }}>
                <strong>No difference raster computed:</strong> {differenceAnalysis.disabledReason}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* D. Data Coverage Matrix */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">D. Data Coverage & Availability Matrix</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: 'var(--bg-cool-neutral)', textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '9px 14px' }}>Layer / Metric</th>
                <th style={{ padding: '9px 14px' }}>Earth ({earthDataset.shortName})</th>
                <th style={{ padding: '9px 14px' }}>Planetary ({marsDataset.shortName})</th>
                <th style={{ padding: '9px 14px' }}>Scientific Note</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  layer: 'Elevation DEM',
                  earth: `${earthDataset.dataState} · ${earthDataset.stats.coveragePercent}% valid (${earthDataset.nativeResolutionLabel})`,
                  mars: `${marsDataset.dataState} · ${marsDataset.stats.coveragePercent}% valid (${marsDataset.nativeResolutionLabel})`,
                  note: 'Different vertical datums (EGM2008 vs. MOLA Areoid); heights are not subtracted directly.',
                },
                {
                  layer: 'Slope & Aspect (Horn 3×3)',
                  earth: `Derived at 30.0 m (n=${earthDerived.slopeStats.validCount.toLocaleString()})`,
                  mars: marsAvailable ? `Derived at 30.0 m (n=${marsDerived.slopeStats.validCount.toLocaleString()})` : 'UNAVAILABLE',
                  note: '1-cell perimeter boundary excluded from 3×3 kernel.',
                },
                {
                  layer: 'Roughness (TRI 3×3)',
                  earth: `Derived (mean ${earthDerived.roughnessStats.mean.toFixed(2)} m)`,
                  mars: marsAvailable ? `Derived (mean ${marsDerived.roughnessStats.mean.toFixed(2)} m)` : 'UNAVAILABLE',
                  note: '90 m × 90 m neighborhood; sub-30 m micro-roughness unresolved.',
                },
                {
                  layer: 'Georeferenced Imagery',
                  earth: earthDataset.imagery ? 'Esri World Imagery (512×512 matched)' : 'Unavailable',
                  mars: marsDataset.imagery ? 'USGS HiRISE LRGB COG (512×512 matched)' : 'Unavailable',
                  note: 'Visual optical context; acquisition dates differ from DEM.',
                },
                {
                  layer: '30 m Geological Map Raster',
                  earth: 'Not available (point studies only)',
                  mars: 'Not available in 30 m tile (curated MSL context)',
                  note: 'Handled transparently in Evidence panel rather than fabricating a raster.',
                },
              ].map((row) => (
                <tr key={row.layer} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '9px 14px', fontWeight: 600 }}>{row.layer}</td>
                  <td style={{ padding: '9px 14px' }}>{row.earth}</td>
                  <td style={{ padding: '9px 14px' }}>{row.mars}</td>
                  <td style={{ padding: '9px 14px', color: 'var(--text-muted)' }}>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

