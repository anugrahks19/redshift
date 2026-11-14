import React from 'react';
import { Database, ExternalLink } from 'lucide-react';
import type { TerrainGridDataset } from '../../types/terrain';

interface DataProvenanceProps {
  earthDataset: TerrainGridDataset;
  marsDataset: TerrainGridDataset;
}

const ProvenanceCard: React.FC<{ title: string; dataset: TerrainGridDataset; accent: string }> = ({
  title,
  dataset,
  accent,
}) => {
  const rows: [string, string][] = [
    ['Dataset Name', dataset.provenance.datasetName],
    ['Provider', dataset.provenance.provider],
    ['Instrument / Mission', dataset.provenance.instrumentOrMission],
    ['Product Identifier', dataset.provenance.productId],
    ['Native Resolution', dataset.nativeResolutionLabel],
    ['Analysis Resolution', dataset.analysisResolutionLabel],
    ['Coordinate Reference System', dataset.crs],
    ['Vertical Datum', dataset.verticalDatum],
    ['Units', dataset.units],
    ['Acquisition Range', dataset.provenance.acquisitionRange],
    ['Processing Performed', dataset.provenance.processingPerformed],
    ['Resampling Method', dataset.provenance.resamplingMethod],
    [
      'Data Coverage',
      `${dataset.stats.coveragePercent}% (${dataset.stats.validCells.toLocaleString()} / ${dataset.stats.totalCells.toLocaleString()} cells)`,
    ],
    [
      'Quality & Model Type',
      dataset.isSurfaceModel
        ? 'Digital Surface Model (DSM) / Stereo Mosaic — includes surface features where present'
        : 'Bare-earth DTM',
    ],
    ['Known Limitations', dataset.provenance.limitations],
  ];

  return (
    <div className="panel" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="panel-header">
        <div className="panel-title">
          <Database size={14} color={accent} />
          <span>{title}</span>
        </div>
        <a
          href={dataset.provenance.originalUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            color: 'var(--accent-blue)',
            textDecoration: 'underline',
          }}
        >
          Primary DOI / Source <ExternalLink size={12} />
        </a>
      </div>

      <div style={{ padding: 14 }}>
        <dl style={{ margin: 0, display: 'grid', gap: 8, fontSize: 12.5 }}>
          {rows.map(([label, val]) => (
            <div
              key={label}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(140px, 190px) 1fr',
                gap: 10,
                paddingBottom: 6,
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <dt style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{label}</dt>
              <dd style={{ margin: 0, color: 'var(--ink-dark)', wordBreak: 'break-word' }}>{val}</dd>
            </div>
          ))}
        </dl>

        {dataset.imagery && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              background: 'var(--bg-cool-neutral)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 3 }}>Co-Registered Optical Imagery Overlay</div>
            <div>
              <strong>Source:</strong> {dataset.imagery.source}
            </div>
            <div>
              <strong>Attribution:</strong> {dataset.imagery.attribution}
            </div>
            <div style={{ color: 'var(--text-muted)' }}>{dataset.imagery.note}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export const DataProvenance: React.FC<DataProvenanceProps> = ({ earthDataset, marsDataset }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
      <ProvenanceCard title={`Earth Provenance · ${earthDataset.shortName}`} dataset={earthDataset} accent="#286A91" />
      <ProvenanceCard title={`Planetary Provenance · ${marsDataset.shortName}`} dataset={marsDataset} accent="#C28B38" />
    </div>
  );
};

