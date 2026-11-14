import React from 'react';
import { FileText } from 'lucide-react';
import type { ScientificSummaryData } from '../../types/investigation';

interface ScientificSummaryProps {
  summary: ScientificSummaryData;
}

export const ScientificSummary: React.FC<ScientificSummaryProps> = ({ summary }) => {
  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">
          <FileText size={15} color="#327F79" />
          <span>Deterministic Scientific Summary</span>
        </div>
        <span className="badge badge--real">No Synthetic Similarity Score</span>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          style={{
            padding: '12px 14px',
            background: '#0D1117',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            color: '#FFFFFF',
            borderRadius: 4,
            fontSize: 13.5,
            lineHeight: 1.55,
          }}
        >
          {summary.cautionaryStatement}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 4, padding: 12 }}>
            <h3 style={{ fontSize: 13, marginBottom: 6, color: '#2DD4BF' }}>Observed Similarities</h3>
            {summary.observedSimilarities.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>None established under current data availability.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, display: 'grid', gap: 6 }}>
                {summary.observedSimilarities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 4, padding: 12 }}>
            <h3 style={{ fontSize: 13, marginBottom: 6, color: '#38BDF8' }}>Observed Differences</h3>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, display: 'grid', gap: 6 }}>
              {summary.observedDifferences.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 4, padding: 12 }}>
            <h3 style={{ fontSize: 13, marginBottom: 6, color: '#FDE68A' }}>Evidence Gaps & Data Limitations</h3>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, display: 'grid', gap: 6 }}>
              {summary.evidenceGaps.concat(summary.dataQualityLimitations).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 4, padding: 12 }}>
            <h3 style={{ fontSize: 13, marginBottom: 6, color: '#4D3D78' }}>Scientific Uncertainties</h3>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, display: 'grid', gap: 6 }}>
              {summary.scientificUncertainties.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

