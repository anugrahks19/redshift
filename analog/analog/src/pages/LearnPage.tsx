import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { PLANETARY_TARGETS } from '../data/planetaryTargets';
import { loadTerrainDataset } from '../services/terrainDataService';
import type { TerrainGridDataset } from '../types/terrain';

interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  feedback: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    prompt: 'Why should raw elevation values from Earth (Copernicus GLO-30) and Mars (USGS Gale DEM) never be subtracted directly?',
    options: [
      'Because Mars elevation is measured in feet while Earth uses meters',
      'Because they reference physically distinct vertical datums (Earth EGM2008 geoid vs. Mars MOLA Areoid)',
      'Because Copernicus GLO-30 has no elevation data outside Europe',
    ],
    correctIndex: 1,
    feedback:
      'Both datasets use meters, but Earth orthometric height references the EGM2008 geoid whereas Mars references the MOLA Areoid equipotential surface. Only datum-invariant derivatives (slope, local TRI roughness) on a common 30 m grid can be compared directly.',
  },
  {
    id: 'q2',
    prompt: 'What does Azua-Bustos et al. (2020) finding wet microbial smectite layers in Yungay demonstrate for Mars exploration?',
    options: [
      'It proves extant microbial life exists beneath Gale Crater today',
      'It provides a terrestrial testbed for how hydrated clay horizons preserve biosignatures and how life-detection instruments operate in hyperarid soils',
      'It shows Atacama atmospheric pressure matches modern Mars',
    ],
    correctIndex: 1,
    feedback:
      'Terrestrial analog studies test instrument performance and preservation mechanisms under Earth conditions; they never prove life exists on Mars.',
  },
  {
    id: 'q3',
    prompt: 'Why is Field Feasibility evaluated separately from Scientific Evidence Strength in the Research Workstation?',
    options: [
      'Because a scientifically relevant analog site might still lack verified permits, safe access, or operational logistics',
      'Because field feasibility is automatically determined by Mars rover slope limits',
      'Because scientific evidence only applies to lunar sites',
    ],
    correctIndex: 0,
    feedback:
      'A site can have strong scientific relevance while still requiring land-ownership or permit verification ("Remote-study candidate"). Combining them into one score would hide operational risks.',
  },
];

export const LearnPage: React.FC = () => {
  const [selectedPlanet, setSelectedPlanet] = useState<'earth' | 'moon' | 'mars'>('mars');
  const [massKg, setMassKg] = useState(900); // Curiosity-class rover ~900 kg
  const [earthData, setEarthData] = useState<TerrainGridDataset | null>(null);
  const [marsData, setMarsData] = useState<TerrainGridDataset | null>(null);
  const [sliceRow, setSliceRow] = useState(64);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  useEffect(() => {
    loadTerrainDataset('earth-yungay-copernicus-30m', 'REAL_DATA').then(setEarthData).catch(() => {});
    loadTerrainDataset('mars-gale-murray-30m', 'REAL_DATA').then(setMarsData).catch(() => {});
  }, []);

  const gravities = { earth: 9.807, moon: 1.622, mars: 3.721 };
  const pressures = { earth: '1,013 mbar', moon: '< 10⁻¹¹ mbar', mars: '6.1 mbar' };
  const target = PLANETARY_TARGETS[selectedPlanet];

  const renderProfileSlice = (ds: TerrainGridDataset | null, color: string) => {
    if (!ds) return null;
    const row = Math.min(ds.gridHeight - 1, Math.max(0, sliceRow));
    const vals: number[] = [];
    for (let c = 0; c < ds.gridWidth; c++) {
      const v = ds.elevations[row * ds.gridWidth + c];
      if (v !== null && v !== undefined) vals.push(v);
    }
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = Math.max(1, max - min);
    const pts = vals
      .map((v, idx) => `${((idx / (vals.length - 1)) * 380 + 10).toFixed(1)},${(110 - ((v - min) / span) * 90).toFixed(1)}`)
      .join(' ');
    return (
      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 4, padding: 12, background: 'var(--bg-cool-neutral)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
          <strong>{ds.shortName} (Row {row}/127)</strong>
          <span className="mono" style={{ color: 'var(--text-muted)' }}>
            {min.toFixed(1)}–{max.toFixed(1)} m (Δ {span.toFixed(1)} m)
          </span>
        </div>
        <svg viewBox="0 0 400 125" style={{ width: '100%', height: 'auto' }}>
          <polyline fill="none" stroke={color} strokeWidth="2.2" points={pts} />
        </svg>
      </div>
    );
  };

  return (
    <main id="main-content" className="workstation-shell">
      <div className="workstation-header">
        <div className="workstation-header-inner">
          <div>
            <div className="mono" style={{ fontSize: 11, color: '#9FB0C1', letterSpacing: '0.06em' }}>
              LEARN · INTERACTIVE PLANETARY SCIENCE LABORATORIES
            </div>
            <h1 style={{ fontSize: 22, color: '#FFFFFF' }}>
              Understand Planetary Environments, Terrain & Astrobiology Limits
            </h1>
          </div>
          <Link to="/research" className="btn btn--primary" style={{ textDecoration: 'none' }}>
            Apply in Research Studio <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <div className="workstation-body" style={{ gap: 20 }}>
        {/* Lab 1: Planetary Environment & Rover Gravity Lab */}
        <section className="panel" style={{ padding: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 17 }}>1. Planetary Environment & Rover Weight Laboratory</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Compare how gravity and atmospheric pressure change rover ground pressure and surface weathering across Earth, Moon, and Mars.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['earth', 'moon', 'mars'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`btn ${selectedPlanet === p ? 'btn--navy' : ''}`}
                  onClick={() => setSelectedPlanet(p)}
                >
                  {PLANETARY_TARGETS[p].name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 4, padding: 14 }}>
              <label style={{ display: 'block', fontSize: 12.5, marginBottom: 10 }}>
                <strong>Test Rover Mass (Earth-like Curiosity = 899 kg):</strong>{' '}
                <span className="mono">{massKg} kg</span>
                <input
                  type="range"
                  min={100}
                  max={1500}
                  step={50}
                  value={massKg}
                  onChange={(e) => setMassKg(Number(e.target.value))}
                  style={{ width: '100%', marginTop: 6, accentColor: '#286A91' }}
                />
              </label>

              <div style={{ display: 'grid', gap: 8 }}>
                {(['earth', 'mars', 'moon'] as const).map((b) => {
                  const weightN = massKg * gravities[b];
                  const pct = (gravities[b] / gravities.earth) * 100;
                  return (
                    <div key={b} style={{ fontSize: 12.5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>{PLANETARY_TARGETS[b].name} ({gravities[b]} m/s²)</strong>
                        <span className="mono">{weightN.toFixed(0)} N · {pressures[b]}</span>
                      </div>
                      <div style={{ height: 7, background: 'rgba(255,255,255,0.12)', borderRadius: 3, marginTop: 4 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: PLANETARY_TARGETS[b].accentColor, borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 4, padding: 14, fontSize: 13 }}>
              <h3 style={{ fontSize: 15, marginBottom: 6 }}>{target.name} Environmental Takeaways</h3>
              <p style={{ marginBottom: 8 }}>{target.geologicalContext}</p>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                <strong>Why it matters for Earth analog tests:</strong> A 900 kg rover tested in the Atacama exerts ~8,826 N on dry sand, whereas on Mars it exerts ~3,349 N—changing wheel sinkage and slip behavior even on identical slope angles.
              </div>
            </div>
          </div>
        </section>

        {/* Lab 2: Real Data Terrain & Topography Cross-Section Lab */}
        <section className="panel" style={{ padding: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 17 }}>2. Terrain & Topography Cross-Section Lab (Real 30 m DEMs)</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Scrub across the 3.84 km Yungay (Copernicus GLO-30) and Gale Crater (USGS 1 m → 30 m) rasters to inspect real elevation relief.
              </p>
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
              <span>Transect Latitude Row:</span>
              <input
                type="range"
                min={5}
                max={122}
                value={sliceRow}
                onChange={(e) => setSliceRow(Number(e.target.value))}
                style={{ accentColor: '#327F79' }}
              />
              <span className="mono">{sliceRow}/127</span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            {renderProfileSlice(earthData, '#286A91')}
            {renderProfileSlice(marsData, '#C28B38')}
          </div>
        </section>

        {/* Lab 3: Astrobiology & Life Detection */}
        <section className="panel" style={{ padding: 16 }}>
          <h2 style={{ fontSize: 17, marginBottom: 10 }}>3. Astrobiology & Subsurface Smectite Preservation (Atacama Case)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            <div style={{ fontSize: 13.5, display: 'grid', gap: 8 }}>
              <p>
                <strong>What researchers found in Yungay:</strong> Azua-Bustos et al. (2020) documented wet smectite clay layers ~30 cm beneath hyperarid desert pavements containing halite, gypsum, calcite, albite, and quartz—sheltering microbial communities from surface UV desiccation.
              </p>
              <p style={{ color: '#FDE68A', background: 'rgba(245, 158, 11, 0.12)', padding: 10, borderRadius: 4, border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                <strong>Critical Scientific Distinction:</strong> Testing drills, Raman spectrometers, and biosignature extraction protocols in Yungay smectites evaluates <em>instrument readiness</em>—it does <strong>not</strong> constitute evidence of past or present life in Gale Crater.
              </p>
            </div>
            <svg viewBox="0 0 380 150" style={{ width: '100%', maxWidth: 420, border: '1px solid var(--border-subtle)', borderRadius: 4, background: '#07090D' }} role="img" aria-label="Atacama subsurface smectite horizon diagram">
              <rect x="0" y="0" width="380" height="36" fill="rgba(56, 189, 248, 0.14)" />
              <text x="14" y="22" fontSize="11" fill="#BAE6FD" fontWeight="600">Hyperarid Surface: Extreme UV, &lt;2 mm/yr rain, nitrate/halite crust</text>
              <rect x="0" y="36" width="380" height="36" fill="rgba(212, 188, 148, 0.22)" />
              <text x="14" y="58" fontSize="11" fill="#FDE68A">0–30 cm: Desiccated alluvial silt &amp; evaporite crust</text>
              <rect x="0" y="72" width="380" height="44" fill="rgba(45, 212, 191, 0.24)" />
              <text x="14" y="96" fontSize="11" fill="#FFFFFF" fontWeight="600">~30 cm: Wet Smectite Clay Horizon (episodic RH, biosignatures)</text>
              <rect x="0" y="116" width="380" height="34" fill="rgba(158, 114, 82, 0.28)" />
              <text x="14" y="137" fontSize="11" fill="#E2E8F0">Underlying desert sediment (Azua-Bustos et al., 2020)</text>
            </svg>
          </div>
        </section>

        {/* Lab 4: Interactive Knowledge Checks */}
        <section className="panel" style={{ padding: 16 }}>
          <h2 style={{ fontSize: 17, marginBottom: 12 }}>4. Scientific Reasoning Check</h2>
          <div style={{ display: 'grid', gap: 14 }}>
            {QUIZ_QUESTIONS.map((q, qi) => {
              const picked = answers[q.id];
              const isAnswered = picked !== undefined;
              const isCorrect = picked === q.correctIndex;
              return (
                <div key={q.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: 4, padding: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 8 }}>
                    {qi + 1}. {q.prompt}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {q.options.map((opt, oi) => (
                      <button
                        key={opt}
                        type="button"
                        className={`btn ${picked === oi ? 'btn--navy' : ''}`}
                        style={{ justifyContent: 'flex-start', textAlign: 'left', fontWeight: 400 }}
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  {isAnswered && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: '8px 10px',
                        borderRadius: 4,
                        fontSize: 12.5,
                        background: isCorrect ? 'rgba(45, 212, 191, 0.14)' : 'rgba(248, 113, 113, 0.14)',
                        color: isCorrect ? '#99F6E4' : '#FCA5A5',
                        border: `1px solid ${isCorrect ? 'rgba(45, 212, 191, 0.35)' : 'rgba(248, 113, 113, 0.35)'}`,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                      }}
                    >
                      {isCorrect ? <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 2 }} /> : <XCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />}
                      <span>{q.feedback}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
};

