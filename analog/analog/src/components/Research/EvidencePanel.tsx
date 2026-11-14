import React, { useState } from 'react';
import { ExternalLink, ShieldAlert, CheckCircle2, HelpCircle } from 'lucide-react';
import type {
  EvidenceRecord,
  FieldFeasibilityItem,
  ResearchObjectiveId,
  TwoAxisReadinessResult,
} from '../../types/evidence';

interface EvidencePanelProps {
  evidence: EvidenceRecord[];
  feasibility: FieldFeasibilityItem[];
  readiness: TwoAxisReadinessResult;
  activeObjectiveId: ResearchObjectiveId;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  evidence,
  feasibility,
  readiness,
  activeObjectiveId,
}) => {
  const [filterByObjective, setFilterByObjective] = useState(false);

  const visibleEvidence = filterByObjective
    ? evidence.filter((e) => e.objectiveIds.includes(activeObjectiveId))
    : evidence;

  const statusBadge = (status: FieldFeasibilityItem['status']) => {
    if (status === 'Verified') return 'badge--real';
    if (status === 'Needs verification') return 'badge--demo';
    if (status === 'Unknown') return 'badge--unavailable';
    return '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Scientific Evidence Records */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Scientific Evidence & Traceable Observations</div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={filterByObjective}
              onChange={(e) => setFilterByObjective(e.target.checked)}
            />
            <span>Filter by active research objective</span>
          </label>
        </div>
        <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12 }}>
          {visibleEvidence.map((item) => {
            const highlighted = item.objectiveIds.includes(activeObjectiveId);
            return (
              <article
                key={item.id}
                style={{
                  border: '1px solid var(--border-light)',
                  borderLeft: `3px solid ${highlighted ? '#286A91' : '#94A3B8'}`,
                  borderRadius: 4,
                  padding: 12,
                  background: 'var(--bg-white)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <strong style={{ fontSize: 13 }}>{item.title}</strong>
                  <span className="badge badge--slate">{item.classification}</span>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--ink-dark)' }}>{item.claim}</p>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'grid', gap: 3 }}>
                  <div>
                    <strong>Location:</strong> {item.location} ({item.planet})
                  </div>
                  <div>
                    <strong>Method / Instrument:</strong> {item.instrumentOrMethod}
                  </div>
                  <div>
                    <strong>Source:</strong> {item.sourceInstitution} ({item.date})
                  </div>
                  <div style={{ color: '#FDE68A' }}>
                    <strong>Limitation:</strong> {item.limitations}
                  </div>
                </div>
                <div style={{ marginTop: 4 }}>
                  <a
                    href={item.sourceUrl}
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
                    Inspect Primary Source <ExternalLink size={12} />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Field Feasibility + Two-Axis Readiness Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
        {/* Independent Field Feasibility */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <ShieldAlert size={15} color="#C28B38" />
              <span>Field Feasibility Assessment (Earth: Yungay)</span>
            </div>
            <span className="badge badge--demo">Independent of Similarity</span>
          </div>
          <div style={{ padding: 14 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
              Field accessibility, permitting, and operational hazards are evaluated independently of planetary analog value. This tool does not grant legal field access or safety certification.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {feasibility.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 4,
                    padding: '8px 10px',
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <strong>{item.category}</strong>
                    <span className={`badge ${statusBadge(item.status)}`}>{item.status}</span>
                  </div>
                  <div style={{ color: 'var(--ink-dark)', marginBottom: 2 }}>{item.summary}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                    {item.sourceNote} · {item.verificationDate}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Two-Axis Readiness Matrix */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Two-Axis Evidence-to-Field Readiness Matrix</div>
            <span className="badge badge--blue">{readiness.category}</span>
          </div>
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Application-defined assessment matrix (not an official NASA classification). Scientific evidence strength and field feasibility are never collapsed into a single similarity percentage.
            </p>

            {/* SVG 2x2 Matrix */}
            <svg viewBox="0 0 360 220" style={{ width: '100%', maxWidth: 400, height: 'auto', display: 'block', margin: '0 auto' }} role="img" aria-label="Two-axis readiness matrix">
              {/* Quadrants */}
              <rect x="60" y="16" width="135" height="82" fill="rgba(56, 189, 248, 0.12)" stroke="rgba(255,255,255,0.18)" />
              <rect x="195" y="16" width="135" height="82" fill="rgba(45, 212, 191, 0.14)" stroke="rgba(255,255,255,0.18)" />
              <rect x="60" y="98" width="135" height="82" fill="rgba(248, 113, 113, 0.12)" stroke="rgba(255,255,255,0.18)" />
              <rect x="195" y="98" width="135" height="82" fill="rgba(245, 158, 11, 0.12)" stroke="rgba(255,255,255,0.18)" />

              <text x="127" y="40" textAnchor="middle" fontSize="9.5" fill="#BAE6FD" fontWeight="600">Remote-Study</text>
              <text x="127" y="52" textAnchor="middle" fontSize="9" fill="#94A3B8">Candidate</text>

              <text x="262" y="40" textAnchor="middle" fontSize="9.5" fill="#99F6E4" fontWeight="600">Research-Ready</text>
              <text x="262" y="52" textAnchor="middle" fontSize="9" fill="#94A3B8">Candidate</text>

              <text x="127" y="140" textAnchor="middle" fontSize="9.5" fill="#FCA5A5" fontWeight="600">Insufficient</text>
              <text x="127" y="152" textAnchor="middle" fontSize="9" fill="#94A3B8">Information</text>

              <text x="262" y="140" textAnchor="middle" fontSize="9.5" fill="#FDE68A" fontWeight="600">Further Science</text>
              <text x="262" y="152" textAnchor="middle" fontSize="9" fill="#94A3B8">Investigation Needed</text>

              {/* Axis Labels */}
              <text x="195" y="204" textAnchor="middle" fontSize="10" fill="#FFFFFF" fontWeight="600">
                Field Feasibility Verification → ({readiness.fieldFeasibilityTier})
              </text>
              <text
                x="18"
                y="98"
                textAnchor="middle"
                fontSize="10"
                fill="#FFFFFF"
                fontWeight="600"
                transform="rotate(-90 18 98)"
              >
                Scientific Evidence Strength → ({readiness.scientificEvidenceTier})
              </text>

              {/* Plotted Point */}
              {(() => {
                const px = 60 + (readiness.fieldFeasibilityScore / 100) * 270;
                const py = 180 - (readiness.scientificEvidenceScore / 100) * 164;
                return (
                  <g>
                    <circle cx={px} cy={py} r="7" fill="#FFFFFF" stroke="#000000" strokeWidth="2" />
                    <circle cx={px} cy={py} r="12" fill="none" stroke="#38BDF8" strokeWidth="1.2" strokeDasharray="3 2" />
                  </g>
                );
              })()}
            </svg>

            <div style={{ fontSize: 12.5, background: 'var(--bg-cool-neutral)', padding: 10, borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
              <strong>Assessment Rationale:</strong> {readiness.rationale}
            </div>

            <div style={{ fontSize: 12, display: 'grid', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <CheckCircle2 size={13} color="#327F79" /> Supporting Evidence
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-muted)' }}>
                  {readiness.supportingEvidence.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <HelpCircle size={13} color="#C28B38" /> Unverified Field Conditions & Missing Data
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-muted)' }}>
                  {readiness.missingInformation.concat(readiness.unverifiedConditions).map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

