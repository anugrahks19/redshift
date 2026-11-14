import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ExpeditionDecisionRecord } from '../../context/PlatformContext';
import { SOURCE_REGISTRY } from '../../data/sourceRegistry';
import type { AnalogSiteProfile, PlanetaryRegionTarget } from '../../types/dataset';

interface Props {
  objective: string;
  activeRegion: PlanetaryRegionTarget;
  selectedSite: AnalogSiteProfile;
  allSites: AnalogSiteProfile[];
  onSelectSite: (id: string) => void;
  existingDecision: ExpeditionDecisionRecord | null;
  onSaveDecision: (decision: ExpeditionDecisionRecord) => void;
}

const READINESS = ['Research ready for further study', 'Remote study recommended', 'Field investigation required', 'Insufficient evidence'] as const;

export const ExpeditionDecisionPanel: React.FC<Props> = ({ objective, activeRegion, selectedSite, allSites, onSelectSite, existingDecision, onSaveDecision }) => {
  const navigate = useNavigate();
  const restored = existingDecision?.regionId === activeRegion.id && existingDecision.siteId === selectedSite.id ? existingDecision : null;
  const [rationale, setRationale] = useState(restored?.justification ?? '');
  const [limitation, setLimitation] = useState('');
  const [feasibility, setFeasibility] = useState('');
  const [readiness, setReadiness] = useState<(typeof READINESS)[number]>('Field investigation required');
  const [report, setReport] = useState('');
  const [error, setError] = useState('');
  const planetaryData = activeRegion.hasLocalDem ? 'Local planetary DEM available for this region' : 'Local planetary DEM unavailable; qualitative reference only';
  const earthData = selectedSite.hasLocalDem ? 'Local Earth DEM available for this site' : 'No local Earth DEM bundled for this site';
  const sources = selectedSite.sourceIds.map((id) => SOURCE_REGISTRY[id]).filter((source) => source !== undefined);

  const generateReport = () => {
    if (rationale.trim().length < 40 || limitation.trim().length < 20 || feasibility.trim().length < 20) {
      setError('Add a scientific rationale (40+ characters), a limitation (20+), and a field feasibility note (20+) before generating the report.');
      return;
    }
    setError('');
    const date = new Date().toISOString();
    const decision: ExpeditionDecisionRecord = {
      regionId: activeRegion.id,
      siteId: selectedSite.id,
      objectiveSummary: objective,
      criteria: [planetaryData, earthData, `Provisional readiness: ${readiness}`, `Field feasibility: ${feasibility.trim()}`, `Key limitation: ${limitation.trim()}`],
      justification: rationale.trim(),
      savedAt: date,
    };
    onSaveDecision(decision);
    setReport([
      '# Analog field investigation',
      `Generated ${new Date(date).toLocaleString()}`,
      '',
      `## Objective\n${objective}`,
      `## Planetary target\n${activeRegion.planet} — ${activeRegion.name} (${activeRegion.coordinatesDisplay})`,
      `## Earth analog\n${selectedSite.name}, ${selectedSite.country} (${selectedSite.coordinates.display})`,
      `## Data coverage\n- ${planetaryData}\n- ${earthData}`,
      `## Geological context\n${selectedSite.geologicalContext}`,
      `## Scientific rationale\n${rationale.trim()}`,
      `## Key limitation\n${limitation.trim()}`,
      `## Field feasibility\n${feasibility.trim()}`,
      `## Provisional readiness\n${readiness}`,
      `## Source references\n${sources.map((source) => `- ${source.title} — ${source.url}`).join('\n') || '- No indexed site sources'}`,
      '',
      'This is a browser-generated investigation record. Readiness is provisional and requires independent scientific and field review.',
    ].join('\n\n'));
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([report], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `analog-field-report-${selectedSite.id}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <section className="lab-decision" aria-label="Evidence review and decision">
    <div className="lab-decision-main">
      <p className="atlas-kicker">PROVISIONAL RECOMMENDATION</p>
      <h2>Make the case.</h2>
      <p className="lab-decision-intro">Choose the Earth site that best supports this research objective. Your recommendation should explain both the useful analogy and where it breaks down.</p>
      <label className="lab-field">Earth analog site
        <select value={selectedSite.id} onChange={(event) => { onSelectSite(event.target.value); setReport(''); }}>
          {allSites.map((site) => <option key={site.id} value={site.id}>{site.name}, {site.country}</option>)}
        </select>
      </label>
      <label className="lab-field">Scientific rationale
        <textarea value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="What shared terrain or geological evidence makes this site useful for the objective?" rows={4} />
      </label>
      <label className="lab-field">Most important limitation
        <textarea value={limitation} onChange={(event) => setLimitation(event.target.value)} placeholder="Where does the analogy or available data fall short?" rows={3} />
      </label>
      <label className="lab-field">Field feasibility
        <textarea value={feasibility} onChange={(event) => setFeasibility(event.target.value)} placeholder="What must be checked about access, permits, hazards, or logistics?" rows={3} />
      </label>
      <label className="lab-field">Provisional readiness
        <select value={readiness} onChange={(event) => setReadiness(event.target.value as (typeof READINESS)[number])}>{READINESS.map((item) => <option key={item}>{item}</option>)}</select>
      </label>
      {error && <p className="lab-form-error" role="alert">{error}</p>}
      <button type="button" className="field-lab-primary" onClick={generateReport}>Generate investigation report <span aria-hidden="true">↗</span></button>
      <p className="lab-decision-disclaimer">This classification records your judgment. It is not a certification or automatic score.</p>
    </div>
    <aside className="lab-decision-audit">
      <div><span>01 / SELECTED PAIR</span><h3>{activeRegion.shortName}<br /><em>↔</em> {selectedSite.name.split(',')[0]}</h3><p>{objective}</p></div>
      <div><span>02 / AVAILABLE EVIDENCE</span><p>{planetaryData}</p><p>{earthData}</p><p>{selectedSite.geologicalContext}</p></div>
      <div><span>03 / CHECK BEFORE FIELDWORK</span><p>{selectedSite.limitations[0]}</p><p>{activeRegion.limitations[0]}</p></div>
      <div><span>04 / SOURCES</span>{sources.slice(0, 3).map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.institution} ↗</a>)}</div>
    </aside>
    {report && <div className="lab-report"><div><span>REPORT READY</span><h3>Investigation recorded.</h3><p>Your evidence review is available as a local Markdown report and carries into the Research workspace for this session.</p></div><div><button type="button" onClick={download}>Download report ↓</button><button type="button" className="field-lab-primary" onClick={() => navigate('/research')}>Continue in Research ↗</button></div></div>}
  </section>;
};
