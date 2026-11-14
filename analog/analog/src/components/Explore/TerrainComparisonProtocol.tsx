import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  Eye,
  Grid,
  Info,
  Layers,
  SlidersHorizontal,
} from 'lucide-react';
import type { AnalogSiteProfile } from '../../types/dataset';
import type { DerivedTerrainGrid, SpatialLayerId, TerrainGridDataset } from '../../types/terrain';
import { inspectGridCell, renderSpatialMapToCanvas } from '../../services/geospatialService';
import {
  MATCHING_REASONING_OPTIONS,
  SITE_DEBRIEF_NOTES,
  type FieldChallenge,
} from '../../data/fieldLabData';
import { PlanetaryCurtainSlider } from '../Shared/PlanetaryCurtainSlider';

gsap.registerPlugin(useGSAP);

export type ProtocolPhaseId = 'reference' | 'curtain' | 'hypothesis' | 'debrief';

const PHASES: { id: ProtocolPhaseId; step: string; title: string }[] = [
  { id: 'reference', step: 'Phase 01', title: 'Mars Reference & Layers' },
  { id: 'curtain', step: 'Phase 02', title: 'Dual-World Curtain Swipe' },
  { id: 'hypothesis', step: 'Phase 03', title: 'Record Hypothesis' },
  { id: 'debrief', step: 'Phase 04', title: 'Evidence & Debrief' },
];

const REFERENCE_LAYERS: { id: SpatialLayerId; label: string; desc: string }[] = [
  { id: 'imagery', label: 'Orbital Photo', desc: 'HiRISE mosaic at matched 3.84 km footprint' },
  { id: 'elevation', label: 'Elevation (m)', desc: 'Measured topographic relief relative to Mars Areoid' },
  { id: 'slope', label: 'Slope (Horn 3×3)', desc: 'Derived gradient in degrees for rover hazard evaluation' },
  { id: 'roughness', label: 'Roughness (TRI)', desc: 'Derived local surface jaggedness in meters' },
];

interface TerrainComparisonProtocolProps {
  activeChallenge: FieldChallenge | null;
  phase: ProtocolPhaseId;
  onPhaseChange: (phase: ProtocolPhaseId) => void;
  marsSiteId: 'gale_murray' | 'gale_bradbury';
  onMarsSiteChange: (id: 'gale_murray' | 'gale_bradbury') => void;
  earthDataset: TerrainGridDataset | null;
  earthDerived: DerivedTerrainGrid | null;
  marsDataset: TerrainGridDataset | null;
  marsDerived: DerivedTerrainGrid | null;
  sites: AnalogSiteProfile[];
  selectedCandidateId: string;
  onSelectCandidate: (siteId: string) => void;
  activeLayer: SpatialLayerId;
  onLayerChange: (layer: SpatialLayerId) => void;
  onCompleteMission: (missionId: string) => void;
}

export const TerrainComparisonProtocol: React.FC<TerrainComparisonProtocolProps> = ({
  activeChallenge,
  phase,
  onPhaseChange,
  marsSiteId,
  onMarsSiteChange,
  earthDataset,
  earthDerived,
  marsDataset,
  marsDerived,
  sites,
  selectedCandidateId,
  onSelectCandidate,
  activeLayer,
  onLayerChange,
  onCompleteMission,
}) => {
  const [hillshade, setHillshade] = useState(true);
  const [contours, setContours] = useState(false);
  const [matchedRelief, setMatchedRelief] = useState(false);
  const [reasoningId, setReasoningId] = useState<string>(MATCHING_REASONING_OPTIONS[0]!.id);
  const [fieldNote, setFieldNote] = useState<string>('');
  const [probeCoords, setProbeCoords] = useState<{ row: number; col: number }>({ row: 64, col: 64 });
  const [marsOrtho, setMarsOrtho] = useState<HTMLImageElement | null>(null);

  const consoleRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const marsImageUrl =
    marsSiteId === 'gale_bradbury'
      ? '/data/terrains/gale-bradbury-hirise.jpg'
      : '/data/terrains/gale-hirise.jpg';

  const selectedCandidate = useMemo(
    () => sites.find((s) => s.id === selectedCandidateId) ?? sites[0]!,
    [sites, selectedCandidateId]
  );

  const candidateOptions = useMemo(
    () => sites.filter((s) => s.id !== 'mauna-kea-apollo'),
    [sites]
  );

  const probedCell = useMemo(() => {
    if (!marsDataset || !marsDerived) return null;
    return inspectGridCell(marsDataset, marsDerived, probeCoords.row, probeCoords.col);
  }, [marsDataset, marsDerived, probeCoords]);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!cancelled) setMarsOrtho(img);
    };
    img.onerror = () => {
      if (!cancelled) setMarsOrtho(null);
    };
    img.src = marsImageUrl;
    return () => {
      cancelled = true;
    };
  }, [marsImageUrl]);

  useEffect(() => {
    if (phase !== 'reference' || !canvasRef.current || !marsDataset || !marsDerived) return;
    renderSpatialMapToCanvas(
      {
        dataset: marsDataset,
        derived: marsDerived,
        activeLayer,
        hillshade,
        contours,
        orthophoto: marsOrtho,
        size: 400,
      },
      canvasRef.current
    );
  }, [phase, marsDataset, marsDerived, activeLayer, hillshade, contours, marsOrtho]);

  useGSAP(
    () => {
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      const stage = consoleRef.current?.querySelector('.exp-protocol-stage');
      if (stage) {
        gsap.fromTo(
          stage,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.34, ease: 'power2.out', clearProps: 'transform,opacity' }
        );
      }
      if (phase === 'debrief') {
        gsap.from('.exp-debrief-stagger', {
          opacity: 0,
          y: 12,
          duration: 0.36,
          stagger: 0.06,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
        });
      }
    },
    { scope: consoleRef, dependencies: [phase] }
  );

  useGSAP(
    () => {
      if (phase !== 'reference' || !canvasRef.current) return;
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      gsap.fromTo(canvasRef.current, { opacity: 0.72 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
    },
    { scope: consoleRef, dependencies: [marsSiteId, activeLayer, phase] }
  );

  const handlePhaseJump = (next: ProtocolPhaseId) => {
    if (next === 'debrief' && activeChallenge) {
      onCompleteMission(activeChallenge.id);
    }
    onPhaseChange(next);
  };

  const handleCanvasPointer = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !marsDataset) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const fx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const fy = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setProbeCoords({
      col: Math.min(marsDataset.gridWidth - 1, Math.round(fx * (marsDataset.gridWidth - 1))),
      row: Math.min(marsDataset.gridHeight - 1, Math.round(fy * (marsDataset.gridHeight - 1))),
    });
  };

  const phaseIdx = PHASES.findIndex((p) => p.id === phase);
  const debrief = SITE_DEBRIEF_NOTES[selectedCandidate.id] ?? SITE_DEBRIEF_NOTES['yungay-atacama']!;
  const chosenReasoning =
    MATCHING_REASONING_OPTIONS.find((r) => r.id === reasoningId) ?? MATCHING_REASONING_OPTIONS[0]!;

  return (
    <section
      id="terrain-protocol"
      className="exp-section exp-section--bordered"
      aria-labelledby="exp-protocol-heading"
    >
      <div className="container">
        <div className="exp-section-head">
          <div>
            <span className="exp-kicker">03 · Comparative Terrain &amp; Evidence Console</span>
            <h2 id="exp-protocol-heading" className="exp-h2">
              Cross-World Terrain Protocol
            </h2>
          </div>
          <p className="exp-lead">
            Compare orbital Mars Gale Crater terrain against terrestrial analog candidates across aligned 3.84 km × 3.84 km grids, record a geological hypothesis, and audit verified similarities and limits.
          </p>
        </div>

        {activeChallenge && (
          <div className="exp-mission-banner">
            <div>
              <span className="exp-mono-cyan">ACTIVE INVESTIGATION</span>
              <strong style={{ marginLeft: 10 }}>{activeChallenge.title}</strong>
              <span className="exp-mono-muted"> · {activeChallenge.targetBody}</span>
            </div>
            <span className="exp-mono-amber">{activeChallenge.sourceLabel}</span>
          </div>
        )}

        {/* Animated Progress Track & Phase Tabs */}
        <div className="exp-progress-rail" aria-hidden="true">
          <div
            className="exp-progress-fill"
            style={{ transform: `scaleX(${(phaseIdx + 1) / PHASES.length})` }}
          />
        </div>

        <div className="exp-phase-tabs" role="tablist" aria-label="Terrain comparison phases">
          {PHASES.map((p, i) => {
            const active = p.id === phase;
            const completed = i < phaseIdx;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`exp-phase-tab ${active ? 'is-active' : ''} ${completed ? 'is-completed' : ''}`}
                onClick={() => handlePhaseJump(p.id)}
              >
                <span className="exp-phase-code">{p.step}</span>
                <span className="exp-phase-title">{p.title}</span>
              </button>
            );
          })}
        </div>

        <div ref={consoleRef} className="exp-console-surface">
          <div className="exp-protocol-stage">
            {/* PHASE 01: Planetary Reference & Map Layers */}
            {phase === 'reference' && (
              <div className="exp-ref-split">
                <div className="exp-ref-visual">
                  <div className="exp-ref-topbar">
                    <div>
                      <span className="exp-mono-cyan">MARS ORBITAL WINDOW · 30 M GRID</span>
                      <div className="exp-ref-title">
                        {marsSiteId === 'gale_bradbury'
                          ? 'Gale Crater — Bradbury Landing / Aeolis Palus'
                          : 'Gale Crater — Murray Buttes / Vera Rubin Ridge'}
                      </div>
                    </div>
                    <div className="exp-segmented">
                      <button
                        type="button"
                        className={marsSiteId === 'gale_murray' ? 'is-active' : ''}
                        onClick={() => onMarsSiteChange('gale_murray')}
                      >
                        Murray Buttes
                      </button>
                      <button
                        type="button"
                        className={marsSiteId === 'gale_bradbury' ? 'is-active' : ''}
                        onClick={() => onMarsSiteChange('gale_bradbury')}
                      >
                        Bradbury Landing
                      </button>
                    </div>
                  </div>

                  <div className="exp-dem-canvas-stage">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={400}
                      onClick={handleCanvasPointer}
                      onMouseMove={(e) => {
                        if (e.buttons === 1) handleCanvasPointer(e);
                      }}
                      className="exp-dem-canvas"
                      aria-label="Mars Gale Crater reference raster"
                    />
                  </div>

                  {probedCell && (
                    <div className="exp-map-readout">
                      <span>
                        Cell ({probedCell.row}, {probedCell.col})
                      </span>
                      <span>
                        Elev (MEASURED):{' '}
                        <strong>
                          {probedCell.elevationMeters !== null
                            ? `${probedCell.elevationMeters.toFixed(1)} m`
                            : 'N/A'}
                        </strong>
                      </span>
                      <span>
                        Slope (DERIVED):{' '}
                        <strong>
                          {probedCell.slopeDegrees !== null
                            ? `${probedCell.slopeDegrees.toFixed(1)}°`
                            : 'N/A'}
                        </strong>
                      </span>
                      <span>
                        TRI:{' '}
                        <strong>
                          {probedCell.roughnessTriMeters !== null
                            ? `${probedCell.roughnessTriMeters.toFixed(2)} m`
                            : 'N/A'}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>

                <div className="exp-ref-controls">
                  <div className="exp-label-mono">
                    <Layers size={12} style={{ marginRight: 5, verticalAlign: '-1px' }} />
                    Select Scientific Map Layer
                  </div>

                  <div className="exp-layer-stack">
                    {REFERENCE_LAYERS.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        className={`exp-layer-card ${activeLayer === l.id ? 'is-active' : ''}`}
                        onClick={() => onLayerChange(l.id)}
                      >
                        <span>{l.label}</span>
                        <small>{l.desc}</small>
                      </button>
                    ))}
                  </div>

                  <div className="exp-toggle-group" style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className={`exp-chip ${hillshade ? 'is-active' : ''}`}
                      onClick={() => setHillshade((v) => !v)}
                    >
                      <Eye size={13} />
                      Hillshade Illumination
                    </button>
                    <button
                      type="button"
                      className={`exp-chip ${contours ? 'is-active' : ''}`}
                      onClick={() => setContours((v) => !v)}
                    >
                      <Grid size={13} />
                      25 m Contours
                    </button>
                  </div>

                  {marsDataset && marsDerived && (
                    <div className="exp-ref-stats">
                      <div className="exp-metric-box">
                        <span>Relief Span (Measured)</span>
                        <strong>{marsDataset.stats.reliefMeters.toFixed(1)} m</strong>
                      </div>
                      <div className="exp-metric-box">
                        <span>Mean Slope (Derived)</span>
                        <strong>{marsDerived.slopeStats.mean.toFixed(1)}°</strong>
                      </div>
                      <div className="exp-metric-box">
                        <span>P90 Slope (Derived)</span>
                        <strong>{marsDerived.slopeStats.p90.toFixed(1)}°</strong>
                      </div>
                      <div className="exp-metric-box">
                        <span>Mean TRI (Derived)</span>
                        <strong>{marsDerived.roughnessStats.mean.toFixed(2)} m</strong>
                      </div>
                    </div>
                  )}

                  <div className="exp-provenance-note">
                    <Info size={14} />
                    <span>
                      Source: {marsDataset?.provenance.datasetName ?? 'USGS Gale Merged DEM v3 & HiRISE'}. Click anywhere across the window to sample grid cells.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* PHASE 02: Dual-World Curtain Comparison */}
            {phase === 'curtain' && (
              <div>
                <div className="exp-curtain-head">
                  <div>
                    <span className="exp-label-mono">Aligned 3.84 km × 3.84 km Spatial Comparison</span>
                    <h3 className="exp-h3">Earth Analog vs. Mars Reference Curtain</h3>
                  </div>
                  {!selectedCandidate.hasLocalDem && (
                    <div className="exp-warning-note">
                      Inspecting packaged 30 m raster pair (Yungay Station vs. Gale Crater). Selected site{' '}
                      <strong>{selectedCandidate.name}</strong> provides satellite imagery only without a bundled local DEM matrix.
                    </div>
                  )}
                </div>

                <PlanetaryCurtainSlider
                  earthDataset={earthDataset}
                  earthDerived={earthDerived}
                  marsDataset={marsDataset}
                  marsDerived={marsDerived}
                  earthImageUrl="/data/terrains/yungay-imagery.jpg"
                  marsImageUrl={marsImageUrl}
                  marsSiteId={marsSiteId}
                  onMarsSiteChange={onMarsSiteChange}
                  activeLayer={activeLayer}
                  onActiveLayerChange={onLayerChange}
                  hillshade={hillshade}
                  contours={contours}
                  matchedRelief={matchedRelief}
                  onToggleHillshade={() => setHillshade((v) => !v)}
                  onToggleContours={() => setContours((v) => !v)}
                  onToggleMatchedRelief={() => setMatchedRelief((v) => !v)}
                  initialOrientation="horizontal"
                  compactHeader
                />
              </div>
            )}

            {/* PHASE 03: Hypothesis Log */}
            {phase === 'hypothesis' && (
              <div className="exp-hypo-grid">
                <div>
                  <div className="exp-label-mono">1. Confirm Terrestrial Analog Candidate</div>
                  <div className="exp-hypo-list">
                    {candidateOptions.map((site) => (
                      <button
                        key={site.id}
                        type="button"
                        className={`exp-hypo-card ${selectedCandidate.id === site.id ? 'is-selected' : ''}`}
                        onClick={() => onSelectCandidate(site.id)}
                      >
                        <div className="exp-hypo-top">
                          <strong>{site.name}</strong>
                          <span className="exp-tag-neutral">{site.category}</span>
                        </div>
                        <small>{site.geologicalContext}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="exp-label-mono">2. Primary Scientific Reasoning Basis</div>
                  <div className="exp-hypo-list">
                    {MATCHING_REASONING_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`exp-hypo-card ${reasoningId === opt.id ? 'is-selected' : ''}`}
                        onClick={() => setReasoningId(opt.id)}
                      >
                        <strong>{opt.label}</strong>
                        <small>{opt.focus}</small>
                      </button>
                    ))}
                  </div>

                  <label className="exp-label-mono" htmlFor="exp-field-note" style={{ marginTop: 16 }}>
                    3. Field Note / Observation (Optional)
                  </label>
                  <textarea
                    id="exp-field-note"
                    rows={3}
                    className="exp-textarea"
                    placeholder="Document terrain slope breaks, salt stability, or limitations observed..."
                    value={fieldNote}
                    onChange={(e) => setFieldNote(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* PHASE 04: Evidence & Scientific Debrief */}
            {phase === 'debrief' && (
              <div className="exp-debrief">
                <div className="exp-debrief-top">
                  <div>
                    <span className="exp-mono-cyan">MISSION COMPLETE // EVIDENCE DEBRIEF</span>
                    <h3 className="exp-h3" style={{ marginTop: 4 }}>
                      {selectedCandidate.name} vs.{' '}
                      {marsSiteId === 'gale_bradbury'
                        ? 'Gale Crater (Bradbury Landing)'
                        : 'Gale Crater (Murray Buttes)'}
                    </h3>
                    <p className="exp-mono-muted">
                      Hypothesis evaluated: “{chosenReasoning.label}”
                      {fieldNote.trim() ? ` · Note: “${fieldNote.trim()}”` : ''}
                    </p>
                  </div>
                  <span key={selectedCandidate.id} className="exp-telemetry-lock">
                    Protocol Verification Complete
                  </span>
                </div>

                <div className="exp-debrief-metrics exp-debrief-stagger">
                  <div className="exp-metric-box">
                    <span>Yungay Relief (Measured)</span>
                    <strong>
                      {earthDataset ? `${earthDataset.stats.reliefMeters.toFixed(1)} m` : '264.1 m'}
                    </strong>
                  </div>
                  <div className="exp-metric-box">
                    <span>Yungay Mean Slope (Derived)</span>
                    <strong>
                      {earthDerived ? `${earthDerived.slopeStats.mean.toFixed(1)}°` : '3.1°'}
                    </strong>
                  </div>
                  <div className="exp-metric-box">
                    <span>Gale Relief (Measured)</span>
                    <strong>
                      {marsDataset ? `${marsDataset.stats.reliefMeters.toFixed(1)} m` : '638.7 m'}
                    </strong>
                  </div>
                  <div className="exp-metric-box">
                    <span>Gale Mean Slope (Derived)</span>
                    <strong>
                      {marsDerived ? `${marsDerived.slopeStats.mean.toFixed(1)}°` : '8.2°'}
                    </strong>
                  </div>
                </div>

                <div className="exp-debrief-grid">
                  <div className="exp-debrief-card exp-debrief-stagger">
                    <div className="exp-label-mono">
                      <CheckCircle2 size={12} style={{ marginRight: 5 }} /> Supported Similarities
                    </div>
                    <ul>
                      {debrief.similarities.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="exp-debrief-card exp-debrief-stagger">
                    <div className="exp-label-mono">
                      <SlidersHorizontal size={12} style={{ marginRight: 5 }} /> Fundamental Physical Differences
                    </div>
                    <ul>
                      {debrief.differences.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="exp-debrief-card exp-debrief-stagger">
                    <div className="exp-label-mono">
                      <Info size={12} style={{ marginRight: 5 }} /> Methodological Limitations
                    </div>
                    <ul>
                      {debrief.limitations.map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="exp-debrief-card exp-debrief-stagger">
                    <div className="exp-label-mono">
                      <Compass size={12} style={{ marginRight: 5 }} /> Unavailable Info &amp; Limits
                    </div>
                    <ul>
                      {debrief.unavailableInfo.map((u) => (
                        <li key={u}>
                          <strong>Unavailable:</strong> {u}
                        </li>
                      ))}
                      {debrief.unsupportedConclusions.map((c) => (
                        <li key={c}>
                          <strong>Do not infer:</strong> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="exp-debrief-cta exp-debrief-stagger">
                  <span>
                    Continue deeper into elevation cross-section transects and statistical histograms inside the quantitative Research Workstation.
                  </span>
                  <Link to="/research" className="exp-btn-primary">
                    Launch Research Workstation
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Protocol Console Footer */}
          <div className="exp-console-footer">
            <button
              type="button"
              className="exp-btn-ghost"
              disabled={phaseIdx === 0}
              onClick={() => {
                if (phaseIdx > 0) handlePhaseJump(PHASES[phaseIdx - 1]!.id);
              }}
            >
              <ArrowLeft size={14} />
              Previous Phase
            </button>

            <span className="exp-mono-muted">
              Phase {phaseIdx + 1} of {PHASES.length}
            </span>

            {phaseIdx < PHASES.length - 1 ? (
              <button
                type="button"
                className="exp-btn-primary"
                onClick={() => handlePhaseJump(PHASES[phaseIdx + 1]!.id)}
              >
                {phase === 'hypothesis' ? 'Reveal Scientific Debrief' : `Continue to ${PHASES[phaseIdx + 1]!.step}`}
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                className="exp-btn-secondary"
                onClick={() => handlePhaseJump('reference')}
              >
                Restart Protocol
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

