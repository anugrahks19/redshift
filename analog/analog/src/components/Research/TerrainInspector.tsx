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
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{sample.datasetName}</div>
        </div>
      </div>
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

