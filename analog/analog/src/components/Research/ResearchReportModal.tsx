import React from 'react';
import { X, Download, Printer } from 'lucide-react';
import type { AnalogSiteProfile, PlanetaryRegionTarget } from '../../types/dataset';
import type { DerivedTerrainGrid, TerrainGridDataset } from '../../types/terrain';
import type { EvidenceRecord, FieldFeasibilityItem, ResearchObjectiveConfig, TwoAxisReadinessResult } from '../../types/evidence';
import type { ScientificSummaryData } from '../../types/investigation';
import { generateResearchReportMarkdown } from '../../services/comparisonService';

interface ResearchReportModalProps {
  open: boolean;
  onClose: () => void;
  investigationId: string;
  objective: ResearchObjectiveConfig;
  activeRegion: PlanetaryRegionTarget;
  earthSite: AnalogSiteProfile;
  comparedSites: AnalogSiteProfile[];
  earthDataset: TerrainGridDataset | null;
  earthDerived: DerivedTerrainGrid | null;
  marsDataset: TerrainGridDataset | null;
  marsDerived: DerivedTerrainGrid | null;
  evidence: EvidenceRecord[];
  feasibility: FieldFeasibilityItem[];
  readiness: TwoAxisReadinessResult | null;
  summary: ScientificSummaryData | null;
}

export const ResearchReportModal: React.FC<ResearchReportModalProps> = ({
  open,
  onClose,
  investigationId,
  objective,
  activeRegion,
  earthSite,
  comparedSites,
  earthDataset,
  earthDerived,
  marsDataset,
  marsDerived,
  evidence,
  feasibility,
  readiness,
  summary,
}) => {
  if (!open) return null;

  const hasDemReport =
    earthDataset &&
    earthDerived &&
    marsDataset &&
    marsDerived &&
    readiness &&
    summary &&
    earthSite.hasLocalDem &&
    activeRegion.hasLocalDem;

  const buildUniversalMatrixMarkdown = (): string => {
    const missingRegionParams = activeRegion.parameters
      .filter((p) => p.value === null)
      .map((p) => `- ${activeRegion.shortName} -> ${p.label}: MISSING (${p.note ?? 'Unmeasured'})`);
    const missingSiteParams = comparedSites.flatMap((site) =>
      (site.parameters ?? [])
        .filter((p) => p.value === null)
        .map((p) => `- ${site.name} -> ${p.label}: MISSING (${p.note ?? 'Unmeasured'})`)
    );

    const paramRows = activeRegion.parameters
      .map((p) => {
        const siteVals = comparedSites
          .map((s) => s.parameters?.find((sp) => sp.label === p.label)?.value ?? 'MISSING / UNAVAILABLE')
          .join(' | ');
        return `| ${p.category} | ${p.label} | ${p.value ?? 'MISSING / UNAVAILABLE'} | ${siteVals} |`;
      })
      .join('\n');

    return `# NASA Space Apps 2026 — Planetary Analog Research Report
- **Investigation ID**: ${investigationId}
- **Research Objective**: ${objective.label}
- **Planetary Target Region**: ${activeRegion.planet} · ${activeRegion.name} (${activeRegion.coordinatesDisplay})
- **Primary Earth Analog Site**: ${earthSite.name} (${earthSite.coordinates.display})
- **Local 30 m DEM Availability**: Earth=${earthSite.hasLocalDem ? 'Bundled (Copernicus GLO-30)' : 'Not Bundled'}, Target=${activeRegion.hasLocalDem ? 'Bundled (USGS Gale 30m)' : 'Not Bundled'}

## 1. Multi-Site Scientific Parameter Comparison
| Category | Parameter | ${activeRegion.shortName} | ${comparedSites.map((s) => s.name.split(',')[0]).join(' | ')} |
| --- | --- | --- | ${comparedSites.map(() => '---').join(' | ')} |
${paramRows}

## 2. Explicit Missing Information & Unconfirmed Parameters (PRD 2.5)
${[...missingRegionParams, ...missingSiteParams].join('\n') || '- All tracked parameters contain literature/measured entries; micro-scale raster bounds still apply.'}

## 3. Earth Field Feasibility Summary (${earthSite.name})
${feasibility.map((f) => `- **${f.category} [${f.status}]**: ${f.summary}`).join('\n')}

## 4. Scientific Caveats & Mission Limitations
${[...objective.caveats, ...activeRegion.limitations, ...earthSite.limitations].map((c) => `- ${c}`).join('\n')}
`;
  };

  const markdown = hasDemReport
    ? `${generateResearchReportMarkdown({
        investigationId,
        objective,
        earthDataset,
        earthDerived,
        marsDataset,
        marsDerived,
        evidence,
        feasibility,
        readiness,
        summary,
      })}\n\n---\n\n${buildUniversalMatrixMarkdown()}`
    : buildUniversalMatrixMarkdown();

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Structured Research Report"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(0, 0, 0, 0.88)',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
      }}
    >
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: 920,
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#07090D',
          border: '1px solid rgba(255, 255, 255, 0.22)',
        }}
      >
        <div className="panel-header" style={{ background: '#07090D', color: '#FFFFFF' }}>
          <div className="panel-title" style={{ color: '#FFFFFF' }}>
            Structured Research Assessment Report · {investigationId}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="btn"
              onClick={() => downloadFile(markdown, `${investigationId}-report.md`, 'text/markdown')}
            >
              <Download size={13} />
              Markdown
            </button>
            <button
              type="button"
              className="btn"
              onClick={() =>
                downloadFile(
                  JSON.stringify(
                    {
                      investigationId,
                      objective: objective.label,
                      planetaryRegion: activeRegion,
                      primaryEarthSite: earthSite.name,
                      feasibility,
                      demReadiness: hasDemReport ? readiness : '30m DEM not paired for selected region/site',
                    },
                    null,
                    2
                  ),
                  `${investigationId}-report.json`,
                  'application/json'
                )
              }
            >
              <Download size={13} />
              JSON
            </button>
            <button type="button" className="btn" onClick={() => window.print()}>
              <Printer size={13} />
              Print
            </button>
            <button type="button" className="btn" onClick={onClose} aria-label="Close report">
              <X size={14} />
            </button>
          </div>
        </div>

        <div style={{ padding: 20, overflowY: 'auto', fontSize: 13 }}>
          <pre
            className="mono"
            style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              fontSize: 12,
              lineHeight: 1.55,
              color: 'var(--ink-dark)',
              background: 'var(--bg-cool-neutral)',
              padding: 16,
              borderRadius: 4,
              border: '1px solid var(--border-subtle)',
            }}
          >
            {markdown}
          </pre>
        </div>
      </div>
    </div>
  );
};
