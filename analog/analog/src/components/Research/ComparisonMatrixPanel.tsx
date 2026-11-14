import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Table } from 'lucide-react';
import type { AnalogSiteProfile, PlanetaryRegionTarget, SiteParameterEntry } from '../../types/dataset';

const CATEGORIES: SiteParameterEntry['category'][] = [
  'Geological',
  'Terrain',
  'Environmental',
  'Resource',
  'Accessibility',
  'Mission Suitability',
];

interface ComparisonMatrixPanelProps {
  activeRegion: PlanetaryRegionTarget;
  allSites: AnalogSiteProfile[];
  selectedEarthSiteId: string;
  comparisonSiteIds: string[];
  onToggleComparisonSite: (id: string) => void;
}

export const ComparisonMatrixPanel: React.FC<ComparisonMatrixPanelProps> = ({
  activeRegion,
  allSites,
  selectedEarthSiteId,
  comparisonSiteIds,
  onToggleComparisonSite,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'All' | SiteParameterEntry['category']>('All');

  const activeSites = useMemo(() => {
    const ids = Array.from(new Set([selectedEarthSiteId, ...comparisonSiteIds])).slice(0, 3);
    return ids
      .map((id) => allSites.find((s) => s.id === id))
      .filter((s): s is AnalogSiteProfile => Boolean(s));
  }, [allSites, selectedEarthSiteId, comparisonSiteIds]);

  const parameterRows = useMemo(() => {
    const seen = new Map<string, SiteParameterEntry['category']>();
    activeRegion.parameters.forEach((p) => {
      if (!seen.has(p.label)) seen.set(p.label, p.category);
    });
    const rows = Array.from(seen.entries()).map(([label, category]) => ({ label, category }));
    return categoryFilter === 'All' ? rows : rows.filter((r) => r.category === categoryFilter);
  }, [activeRegion, categoryFilter]);

  const missingStats = useMemo(() => {
    let missingCount = 0;
    let totalCount = 0;
    parameterRows.forEach((row) => {
      totalCount += 1 + activeSites.length;
      if (activeRegion.parameters.find((p) => p.label === row.label)?.value === null) {
        missingCount += 1;
      }
      activeSites.forEach((site) => {
        if ((site.parameters?.find((p) => p.label === row.label)?.value ?? null) === null) {
          missingCount += 1;
        }
      });
    });
    return { missingCount, totalCount };
  }, [parameterRows, activeRegion, activeSites]);

  return (
    <section className="panel" aria-label="Scientific Parameter Comparison Matrix">
      <div className="panel-header">
        <div className="panel-title">
          <Table size={15} color="#286A91" />
          <span>Multi-Site 6-Category Parameter Analysis (RS-06 / RS-07)</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <span className="badge badge--demo">
            {missingStats.missingCount}/{missingStats.totalCount} cells flagged MISSING
          </span>
        </div>
      </div>

      {/* Earth Analog Multi-Selection Chips & Category Filter */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>
            COMPARE EARTH SITES (up to 3):
          </span>
          {allSites.map((site) => {
            const active = activeSites.some((s) => s.id === site.id);
            const isPrimary = site.id === selectedEarthSiteId;
            return (
              <button
                key={site.id}
                type="button"
                className={`btn ${active ? 'btn--navy' : ''}`}
                style={{ padding: '4px 10px', fontSize: 11.5 }}
                onClick={() => {
                  if (!isPrimary) onToggleComparisonSite(site.id);
                }}
                title={isPrimary ? 'Primary active analog site' : 'Toggle site in comparison matrix'}
              >
                {site.name.split(',')[0]} {isPrimary ? '(Primary)' : active ? '✓' : '+'}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>
            CATEGORY:
          </span>
          {(['All', ...CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              className={`btn ${categoryFilter === cat ? 'btn--primary' : ''}`}
              style={{ padding: '4px 9px', fontSize: 11.5 }}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="exp-compare-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Parameter</th>
              <th className="is-target">Planetary Target · {activeRegion.shortName}</th>
              {activeSites.map((site) => (
                <th key={site.id}>
                  {site.name.split(',')[0]}
                  <div className="mono" style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>
                    {site.category}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parameterRows.map((row) => {
              const targetEntry = activeRegion.parameters.find((p) => p.label === row.label);
              return (
                <tr key={row.label}>
                  <td>
                    <span className="badge badge--slate">{row.category}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{row.label}</td>
                  <td className="is-target">
                    {targetEntry?.value ? (
                      <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 5 }}>
                        <CheckCircle2 size={13} color="#327F79" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{targetEntry.value}</span>
                      </span>
                    ) : (
                      <div>
                        <span className="badge badge--unavailable">
                          <AlertCircle size={11} />
                          MISSING / UNAVAILABLE
                        </span>
                        {targetEntry?.note && (
                          <div style={{ fontSize: 11, color: '#FCA5A5', marginTop: 3 }}>{targetEntry.note}</div>
                        )}
                      </div>
                    )}
                  </td>
                  {activeSites.map((site) => {
                    const entry = site.parameters?.find((p) => p.label === row.label);
                    return (
                      <td key={site.id}>
                        {entry?.value ? (
                          <span>{entry.value}</span>
                        ) : (
                          <div>
                            <span className="badge badge--unavailable">
                              <AlertCircle size={11} />
                              MISSING / UNAVAILABLE
                            </span>
                            {entry?.note && (
                              <div style={{ fontSize: 11, color: '#FCA5A5', marginTop: 3 }}>{entry.note}</div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

