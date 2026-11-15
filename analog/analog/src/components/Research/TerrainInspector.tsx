import React from 'react';
import { Crosshair } from 'lucide-react';
import type { TerrainSampleInspection } from '../../types/terrain';

interface TerrainInspectorProps {
  earthSample: TerrainSampleInspection | null;
  marsSample: TerrainSampleInspection | null;
}

const SampleCard: React.FC<{ title: string; sample: TerrainSampleInspection | null; accent: string }> = ({
  title,
  sample,
  accent,
}) => {
  if (!sample) {
    return (
      <div style={{ padding: 12, border: '1px dashed var(--border-light)', borderRadius: 4, fontSize: 12.5, color: 'var(--text-muted)' }}>
        <strong>{title}:</strong> Click any point on the 3D terrain mesh to inspect coordinates, elevation, slope, aspect, roughness, and valid coverage.
      </div>
    );
  }

  return (
    <div style={{ padding: 12, border: '1px solid var(--border-subtle)', borderLeft: `3px solid ${accent}`, borderRadius: 4, background: 'var(--bg-cool-neutral)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <strong style={{ fontSize: 13 }}>{title}</strong>
        <span className={`badge ${sample.inValidCoverage ? 'badge--real' : 'badge--unavailable'}`}>
          {sample.inValidCoverage ? 'Inside Valid Coverage' : 'Outside Valid Data'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '6px 12px', fontSize: 12 }}>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Native Coordinates</div>
          <div className="mono">{sample.geographicLabel}</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sample.projectedLabel}</div>
        </div>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Elevation</div>
          <div className="mono" style={{ fontWeight: 600 }}>
            {sample.elevationMeters !== null ? `${sample.elevationMeters.toFixed(2)} m` : 'NoData'}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{sample.verticalDatum.split('(')[0]}</div>
        </div>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Slope / Aspect</div>
          <div className="mono">
            {sample.slopeDegrees !== null ? `${sample.slopeDegrees.toFixed(2)}°` : 'Boundary/N/A'}
            {' · '}
            {sample.aspectDegrees !== null ? `${sample.aspectDegrees.toFixed(0)}° (${sample.aspectCompass})` : 'Flat'}
          </div>
        </div>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Roughness (TRI)</div>
          <div className="mono">
            {sample.roughnessTriMeters !== null ? `${sample.roughnessTriMeters.toFixed(2)} m` : 'Boundary/N/A'}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
            {sample.roughnessTriMeters !== null
              ? sample.roughnessTriMeters < 1.5
                ? 'Smooth (<1.5 m)'
                : sample.roughnessTriMeters < 5
                  ? 'Moderately rough'
                  : 'Highly rugged (>5 m)'
              : sample.datasetName}
          </div>
        </div>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Surface Temperature</div>
          <div className="mono" style={{ fontWeight: 600 }}>
            {sample.temperatureCelsius !== null && sample.temperatureCelsius !== undefined
              ? `${sample.temperatureCelsius.toFixed(2)} °C (${sample.temperatureKelvin?.toFixed(2)} K)`
              : 'Unavailable (No Thermal Band)'}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
            {sample.temperatureCelsius !== null && sample.temperatureCelsius !== undefined
              ? 'Measured Thermal Raster'
              : 'Not fabricated from DEM'}
          </div>
        </div>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Exploratory Similarity</div>
          <div className="mono" style={{ fontWeight: 600, color: '#286A91' }}>
            {sample.similarityScore !== null && sample.similarityScore !== undefined
              ? `${sample.similarityScore.toFixed(1)} / 100`
              : 'N/A'}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Cell-level Analog Index</div>
        </div>
      </div>

      {sample.certification && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#286A91', marginBottom: 6 }}>
            SECTION 9 BASE-CERTIFICATION TELEMETRY (LRO LOLA / LEND / DIVINER / CRaTER / MSL DAN / RAD / MGS TES)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '6px 10px', fontSize: 11.5 }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>Solar Illumination</div>
              <div className="mono" style={{ fontWeight: 600 }}>
                {sample.certification.illuminationPct?.toFixed(1)}% sunlit
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>DTE / Relay Comms</div>
              <div className="mono" style={{ fontWeight: 600 }}>
                {sample.certification.dteCommsPct?.toFixed(1)}% LoS
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>Water/Ice (WEH)</div>
              <div className="mono" style={{ fontWeight: 600, color: '#0284C7' }}>
                {sample.certification.waterIceWehPct?.toFixed(2)} wt% H₂O
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>Ionizing Radiation</div>
              <div className="mono" style={{ fontWeight: 600, color: '#B45309' }}>
                {sample.certification.radiationMsvYr?.toFixed(1)} mSv/yr ({sample.certification.skyViewSteradians?.toFixed(2)} sr)
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>Rock Abundance</div>
              <div className="mono" style={{ fontWeight: 600 }}>
                {sample.certification.rockAbundancePct?.toFixed(2)}% boulders
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>Bearing Capacity</div>
              <div className="mono" style={{ fontWeight: 600, color: '#1E5652' }}>
                {sample.certification.bearingCapacityKpa?.toFixed(1)} kPa
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const TerrainInspector: React.FC<TerrainInspectorProps> = ({ earthSample, marsSample }) => {
  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">
          <Crosshair size={15} color="#286A91" />
          <span>Point Coordinate & Layer Inspector</span>
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
          Earth (EPSG:32719 / WGS84) and Mars (Equirectangular / Planetocentric) retain separate native coordinate systems.
        </span>
      </div>
      <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
        <SampleCard title="Earth Analog Sample" sample={earthSample} accent="#286A91" />
        <SampleCard title="Planetary Reference Sample" sample={marsSample} accent="#C28B38" />
      </div>
    </div>
  );
};

