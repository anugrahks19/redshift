import React, { useMemo, useState } from 'react';
import { Sliders, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';
import type { AnalogSiteProfile, PlanetaryRegionTarget, SiteCriteriaScores } from '../../types/dataset';

type CriterionKey = keyof SiteCriteriaScores;

const CRITERIA_OPTIONS: { key: CriterionKey; label: string; desc: string }[] = [
  { key: 'mineralogyChemistry', label: 'Mineralogy & Geochemistry', desc: 'Smectite, sulfate, basalt or carbonate analog match' },
  { key: 'slopeTrafficability', label: 'Slope & Traverse Safety', desc: 'Grade envelope & rover mobility calibration suitability' },
  { key: 'aridityVolatility', label: 'Hyperaridity / Volatile Analog', desc: 'Low water activity or subsurface cryogenic ice behavior' },
  { key: 'fieldLogisticsAccess', label: 'Field Logistics & Access', desc: 'Road/air access, campaign support & repeatability' },
  { key: 'habSubsurfaceAnalog', label: 'Subsurface & Habitation Analog', desc: 'Biosignature shelter or thermal/radiation tube shielding' },
];

interface AnalogCandidateRankerProps {
  sites: AnalogSiteProfile[];
  activeRegion: PlanetaryRegionTarget;
  selectedSiteId: string;
  comparisonSiteIds: string[];
  onSelectSite: (siteId: string) => void;
  onToggleComparisonSite: (siteId: string) => void;
  onInspectEvidence: () => void;
}

export const AnalogCandidateRanker: React.FC<AnalogCandidateRankerProps> = ({
  sites,
  activeRegion,
  selectedSiteId,
  comparisonSiteIds,
  onSelectSite,
  onToggleComparisonSite,
  onInspectEvidence,
}) => {
  const [activeCriteria, setActiveCriteria] = useState<CriterionKey[]>([
    'mineralogyChemistry',
    'slopeTrafficability',
    'aridityVolatility',
  ]);
  const [filterByBody, setFilterByBody] = useState(true);

  const toggleCriterion = (key: CriterionKey) => {
    setActiveCriteria((prev) => {
      if (prev.includes(key)) {
        return prev.length > 1 ? prev.filter((k) => k !== key) : prev;
      }
      return [...prev, key];
    });
  };

  const rankedSites = useMemo(() => {
    const pool = filterByBody
      ? sites.filter((s) => s.targetPlanets.includes(activeRegion.planet))
      : sites;

    return pool
      .map((site) => {
        const scores = site.criteriaProfile ?? {
          mineralogyChemistry: 50,
          slopeTrafficability: 50,
          aridityVolatility: 50,
          fieldLogisticsAccess: 50,
          habSubsurfaceAnalog: 50,
        };
        const isRecommendedForRegion = activeRegion.recommendedEarthSiteIds.includes(site.id);
        const avgScore =
          activeCriteria.reduce((acc, k) => acc + scores[k], 0) / Math.max(1, activeCriteria.length);
        // Deterministic literature relevance tiebreaker (+8 for explicitly mapped region analogs)
        const composite = Math.round(avgScore + (isRecommendedForRegion ? 8 : 0));
        const missingCount = (site.parameters ?? []).filter((p) => p.value === null).length;

        return {
          site,
          score: Math.min(99, composite),
          isRecommendedForRegion,
          missingCount,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [sites, activeRegion, activeCriteria, filterByBody]);

  const comparedSites = useMemo(
    () =>
      sites.filter((s) => comparisonSiteIds.includes(s.id)).slice(0, 3),
    [sites, comparisonSiteIds]
  );

  return (
    <section
      id="analog-ranking"
      className="exp-section"
      aria-labelledby="exp-rank-heading"
    >
      <div className="container">
        <div className="exp-section-head">
          <div>
            <span className="exp-kicker">03 · Analog Discovery, Criteria Ranking &amp; Comparison (EX-05 — EX-07)</span>
            <h2 id="exp-rank-heading" className="exp-h2">
              Rank Terrestrial Analog Candidates for {activeRegion.shortName}
            </h2>
          </div>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={filterByBody}
              onChange={(e) => setFilterByBody(e.target.checked)}
            />
            <span>Filter to verified {activeRegion.planet} analog candidates</span>
          </label>
        </div>

        {/* Criteria Selector Strip */}
        <div className="panel" style={{ padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <div className="panel-title">
              <Sliders size={14} color="#286A91" />
              <span>Mission Priority Criteria (toggle criteria to re-rank candidates)</span>
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              NOTE: Rankings reflect qualitative &amp; published trait weights; check Research matrix for missing data.
            </span>
          </div>

          <div className="exp-criteria-grid">
            {CRITERIA_OPTIONS.map((opt) => {
              const active = activeCriteria.includes(opt.key);
              return (
                <button
                  key={opt.key}
                  type="button"
                  className={`exp-criterion-btn ${active ? 'is-active' : ''}`}
                  onClick={() => toggleCriterion(opt.key)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <strong>{opt.label}</strong>
                    {active && <CheckCircle2 size={13} color="#286A91" />}
                  </div>
                  <small>{opt.desc}</small>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ranked Candidate List */}
        <div className="exp-rank-grid">
          {rankedSites.map(({ site, score, isRecommendedForRegion, missingCount }, idx) => {
            const isSelected = site.id === selectedSiteId;
            const inCompare = comparisonSiteIds.includes(site.id);
            const geoParam = site.parameters?.find((p) => p.label === 'Rock Composition')?.value ?? site.geologicalContext;
            const envTemp = site.parameters?.find((p) => p.label === 'Surface Temp Range')?.value ?? null;

            return (
              <article
                key={site.id}
                className={`exp-rank-card ${isSelected ? 'is-selected' : ''}`}
              >
                <div className="exp-rank-card-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="exp-rank-num mono">#{idx + 1}</span>
                    <span className="badge badge--blue">{site.category}</span>
                    {isRecommendedForRegion && (
                      <span className="badge badge--real">Region Match</span>
                    )}
                  </div>
                  <div className="exp-rank-score mono">
                    <span>Index</span>
                    <strong>{score}</strong>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 3 }}>{site.name}</h3>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {site.region}, {site.country} · {site.coordinates.display}
                  </div>
                </div>

                <p style={{ fontSize: 12.5, color: 'var(--ink-dark)' }}>{site.planetaryApplication}</p>

                <div className="exp-rank-meta">
                  <div>
                    <span className="mono">GEOLOGY:</span> {geoParam}
                  </div>
                  <div>
                    <span className="mono">TEMP PROFILE:</span>{' '}
                    {envTemp ?? <span className="badge badge--unavailable">MISSING</span>}
                  </div>
                </div>

                <div className="exp-rank-flags">
                  <span className={`badge ${site.hasLocalDem ? 'badge--real' : 'badge--demo'}`}>
                    {site.hasLocalDem ? '30m DEM Bundled' : 'Literature Profile Only'}
                  </span>
                  {missingCount > 0 && (
                    <span className="badge badge--unavailable">
                      <AlertCircle size={11} />
                      {missingCount} missing metric{missingCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="exp-rank-actions">
                  <button
                    type="button"
                    className={`btn ${isSelected ? 'btn--primary' : ''}`}
                    style={{ flex: 1 }}
                    onClick={() => onSelectSite(site.id)}
                  >
                    {isSelected ? 'Selected Primary' : 'Select Primary'}
                  </button>
                  <button
                    type="button"
                    className={`btn ${inCompare ? 'btn--navy' : ''}`}
                    onClick={() => onToggleComparisonSite(site.id)}
                  >
                    {inCompare ? 'In Compare ✓' : '+ Compare'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* Side-by-Side Comparison Shelf (EX-06) */}
        {comparedSites.length > 0 && (
          <div className="panel" style={{ marginTop: 18 }}>
            <div className="panel-header">
              <div className="panel-title">
                Side-by-Side Candidate Comparison vs. {activeRegion.shortName} ({comparedSites.length}/3 Earth Sites)
              </div>
              <button type="button" className="btn btn--primary" onClick={onInspectEvidence}>
                <span>Proceed to Evidence &amp; Selection Decision</span>
                <ArrowUpRight size={13} />
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="exp-compare-table">
                <thead>
                  <tr>
                    <th>Scientific Parameter</th>
                    <th className="is-target">Target: {activeRegion.shortName}</th>
                    {comparedSites.map((s) => (
                      <th key={s.id}>{s.name.split(',')[0]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {['Rock Composition', 'Elevation Range', 'Slope & Surface', 'Surface Temp Range', 'Water / Ice Potential', 'Terrain Accessibility'].map((paramLabel) => {
                    const targetVal = activeRegion.parameters.find((p) => p.label === paramLabel)?.value ?? null;
                    return (
                      <tr key={paramLabel}>
                        <td className="mono" style={{ fontSize: 11.5, fontWeight: 600 }}>{paramLabel}</td>
                        <td className="is-target">
                          {targetVal ?? <span className="badge badge--unavailable">MISSING / NOT BUNDLED</span>}
                        </td>
                        {comparedSites.map((s) => {
                          const val = s.parameters?.find((p) => p.label === paramLabel)?.value ?? null;
                          return (
                            <td key={s.id}>
                              {val ?? <span className="badge badge--unavailable">MISSING / NOT BUNDLED</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

