import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  ANALOG_PLATES,
  TARGET_HORIZONS,
  type LensModeId,
  type TargetWorldId,
} from '../data/analogStory'
import MissionTransitSection from './MissionTransitSection'

gsap.registerPlugin(ScrollTrigger)

interface ScrollyExperienceProps {
  onScrollTop: () => void
}

export default function ScrollyExperience({ onScrollTop }: ScrollyExperienceProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const ribbonPinRef = useRef<HTMLDivElement>(null)
  const ribbonTrackRef = useRef<HTMLDivElement>(null)
  const lensStageRef = useRef<HTMLElement>(null)
  const spotlightRef = useRef<HTMLDivElement>(null)
  const earthPathRef = useRef<SVGPathElement>(null)
  const targetPathRef = useRef<SVGPathElement>(null)
  const scanHeadRef = useRef<SVGGElement>(null)
  const lensPanelRef = useRef<HTMLDivElement>(null)
  const parityBarsRef = useRef<HTMLDivElement>(null)

  const [targetId, setTargetId] = useState<TargetWorldId>('mars-jezero')
  const [lens, setLens] = useState<LensModeId>('explore')
  const [siteIdx, setSiteIdx] = useState(0)
  const [slopeMax, setSlopeMax] = useState(22)
  const [learnOpen, setLearnOpen] = useState(false)

  const target = useMemo(
    () => TARGET_HORIZONS.find(t => t.id === targetId) ?? TARGET_HORIZONS[0],
    [targetId],
  )
  const activeSite = ANALOG_PLATES[siteIdx] ?? ANALOG_PLATES[0]
  const passesFilter = activeSite.slopeDeg <= slopeMax

  const slopeParityPct = Math.max(24, Math.min(98, Math.round(100 - Math.abs(activeSite.slopeDeg - target.targetSlope) * 6.5)))
  const mineralParityPct = activeSite.targetBody === target.body ? 91 : 64
  const safetyEnvelopePct = Math.max(18, Math.min(100, Math.round((slopeMax / Math.max(activeSite.slopeDeg, 1)) * 78)))
  const transitStageBridge =
    target.body === 'Moon'
      ? 'CONNECTED TO CHAPTER 02A [STAGE 05–06] // Validate 1.5° grazing light & rim boulders before South Pole descent'
      : 'CONNECTED TO CHAPTER 02B [STAGE 06–07] // Validate Mach-22 Jezero delta landing slope & ISRU brine chemistry'

  useEffect(() => {
    const root = rootRef.current
    const pinWrap = ribbonPinRef.current
    const track = ribbonTrackRef.current
    if (!root || !pinWrap || !track) return

    const mm = gsap.matchMedia()
    const ctx = gsap.context(() => {
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Chapter 1: Masked editorial typography & opposing kinetic drift timeline
        gsap
          .timeline({
            scrollTrigger: {
              trigger: '.st-statement',
              start: 'top 84%',
              end: 'center 42%',
              scrub: 0.65,
            },
          })
          .fromTo('.st-line-left', { xPercent: -14, autoAlpha: 0.2 }, { xPercent: 3, autoAlpha: 1, ease: 'none' }, 0)
          .fromTo('.st-line-right', { xPercent: 16, autoAlpha: 0.2 }, { xPercent: -3, autoAlpha: 1, ease: 'none' }, 0)
          .fromTo('.st-horizon-rule', { scaleX: 0 }, { scaleX: 1, ease: 'none' }, 0.15)

        gsap.fromTo(
          '.st-editorial-two > p',
          { clipPath: 'inset(0% 0% 100% 0%)', y: 28, autoAlpha: 0 },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            y: 0,
            autoAlpha: 1,
            duration: 0.95,
            stagger: 0.16,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: '.st-editorial-two',
              start: 'top 82%',
              once: true,
            },
          },
        )

        // Chapter 4: Continuous live telemetry radar sweep across Earth vs Target profiles
        if (scanHeadRef.current) {
          gsap.fromTo(
            scanHeadRef.current,
            { x: 0 },
            {
              x: 348,
              duration: 4.6,
              repeat: -1,
              ease: 'none',
            },
          )
        }

        // Chapter 4: Sculptural reveal of observatory stage
        gsap
          .timeline({
            scrollTrigger: {
              trigger: '#lens-stage',
              start: 'top 76%',
              once: true,
            },
          })
          .from('.st-lens-header > *', {
            y: 26,
            autoAlpha: 0,
            duration: 0.75,
            stagger: 0.1,
            ease: 'power3.out',
          })
          .from(
            '.st-lens-stage > *',
            {
              y: 30,
              autoAlpha: 0,
              duration: 0.85,
              stagger: 0.14,
              ease: 'power3.out',
            },
            '-=0.45',
          )

        // Aperture Sphere expansion in Chapter 4
        gsap.fromTo(
          '.st-boundary-ring',
          { scale: 0.68, rotation: -35, opacity: 0.25 },
          {
            scale: 1.15,
            rotation: 45,
            opacity: 0.88,
            ease: 'none',
            scrollTrigger: {
              trigger: '.st-boundary',
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.5,
            },
          },
        )

        gsap.from('.st-boundary-copy > *', {
          y: 36,
          opacity: 0,
          duration: 0.85,
          stagger: 0.14,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.st-boundary',
            start: 'top 66%',
            once: true,
          },
        })
      })

      // Desktop pinned horizontal specimen ribbon (single GPU-composited timeline, zero layout thrash)
      mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
        const travel = () => Math.max(300, track.scrollWidth - pinWrap.clientWidth + 120)

        gsap
          .timeline({
            scrollTrigger: {
              trigger: pinWrap,
              start: 'top top',
              end: () => `+=${travel()}`,
              pin: true,
              scrub: 0.45,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          })
          .to(track, { x: () => -travel(), ease: 'none', force3D: true }, 0)
          .to('.st-plate-disc', { rotation: 90, ease: 'none', force3D: true }, 0)
      })

      // Pointer-driven magnetic spotlight inside Chapter 3 using gsap.quickTo()
      mm.add('(pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
        const stage = lensStageRef.current
        const spot = spotlightRef.current
        if (!stage || !spot) return

        const xTo = gsap.quickTo(spot, 'x', { duration: 0.5, ease: 'power3.out' })
        const yTo = gsap.quickTo(spot, 'y', { duration: 0.5, ease: 'power3.out' })

        const handleMove = (e: PointerEvent) => {
          const rect = stage.getBoundingClientRect()
          xTo(e.clientX - rect.left)
          yTo(e.clientY - rect.top)
        }
        stage.addEventListener('pointermove', handleMove, { passive: true })
        return () => stage.removeEventListener('pointermove', handleMove)
      })
    }, rootRef)

    return () => {
      ctx.revert()
      mm.revert()
    }
  }, [])

  // Live interactive GSAP motion: SVG trace draw + parity meter interpolation + lens swap settle
  useEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const earthEl = earthPathRef.current
      const targetEl = targetPathRef.current
      if (earthEl) {
        const len = earthEl.getTotalLength()
        gsap.fromTo(
          earthEl,
          { strokeDasharray: len, strokeDashoffset: len * 0.55, opacity: 0.35 },
          { strokeDashoffset: 0, opacity: 1, duration: 0.72, ease: 'power2.out' },
        )
      }
      if (targetEl) {
        gsap.fromTo(
          targetEl,
          { strokeDashoffset: 56, opacity: 0.35 },
          { strokeDashoffset: 0, opacity: 1, duration: 0.76, ease: 'power2.out', delay: 0.08 },
        )
      }
      if (lensPanelRef.current) {
        gsap.fromTo(
          lensPanelRef.current,
          { y: 12, autoAlpha: 0.3 },
          { y: 0, autoAlpha: 1, duration: 0.45, ease: 'power2.out' },
        )
      }
      if (parityBarsRef.current) {
        const fills = parityBarsRef.current.querySelectorAll<HTMLElement>('.st-parity-fill')
        gsap.fromTo(
          fills,
          { scaleX: 0 },
          { scaleX: 1, duration: 0.7, ease: 'power3.out', stagger: 0.08 },
        )
      }
    })
    return () => mm.revert()
  }, [targetId, siteIdx, lens, slopeMax])

  const downloadAssessment = () => {
    const md = [
      `# AstraTerra Site Analog Summary`,
      `Target: ${target.label} (${target.body})`,
      `Instruments: ${target.instruments}`,
      `Earth Analog: ${activeSite.name} (${activeSite.code}) — ${activeSite.location}`,
      `Coords: ${activeSite.coords}`,
      `Earth Slope: ${activeSite.slopeDeg}° vs Target Slope: ${target.targetSlope}°`,
      `Evidence: ${activeSite.evidenceStatus}`,
      `Field Feasibility: ${activeSite.feasibilityStatus} (${activeSite.feasibilityDetail})`,
      `Analog Boundaries: ${activeSite.limitsNote}`,
    ].join('\n')
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `AstraTerra-${activeSite.code}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const earthPeakY = Math.max(24, 136 - activeSite.slopeDeg * 3.1)
  const targetPeakY = Math.max(24, 136 - target.targetSlope * 3.1)
  const targetColor = target.body === 'Mars' ? '#e5925b' : '#cbd5e1'
  const earthWaypoints: Array<[number, number]> = [
    [16, 164],
    [96, 158],
    [164, earthPeakY],
    [238, 176],
    [312, 150],
    [384, 162],
  ]

  return (
    <div ref={rootRef} className="st-story">
      {/* CHAPTER I: KINETIC OPENING STATEMENT */}
      <section id="story-start" className="st-statement">
        <div className="st-wrap">
          <div className="st-chapter-meta">
            <span>CHAPTER 01</span>
            <span>DISCOVERY BEFORE LAUNCH</span>
          </div>

          <div className="st-display-lines" aria-label="Before we land there, we walk here first.">
            <div className="st-line st-line-left">BEFORE WE LAND THERE</div>
            <div className="st-line st-line-right is-dim">WE WALK HERE FIRST.</div>
          </div>

          <div className="st-horizon-rule" aria-hidden="true" />

          <div className="st-editorial-two">
            <p className="st-editorial-lead">
              NASA missions to the Moon and Mars begin inside overlooked salt pans, basaltic caves, and ancient impact bowls on Earth.
            </p>
            <p className="st-editorial-sub">
              AstraTerra harmonizes Copernicus 30m elevation, LRO laser altimetry, and Mars CRISM mineralogy into one continuous exploration surface—built equally for public curiosity, students, and mission field teams.
            </p>
          </div>
        </div>
      </section>

      {/* CHAPTER II: TURION-STYLE SPLIT-STAGE CREWED TRANSIT ARCHITECTURE */}
      <MissionTransitSection />

      {/* CHAPTER III: CONTINUOUS UNROLLING SPECIMEN RIBBON (SWEET-TAPE STYLE) */}
      <section ref={ribbonPinRef} className="st-ribbon-section">
        <div className="st-ribbon-head">
          <span>CHAPTER 03 · UNROLLING FIVE TERRESTRIAL ANALOG SPECIMENS</span>
          <span>SCROLL TO PEEL EARTH → MOON → MARS</span>
        </div>

        <div ref={ribbonTrackRef} className="st-ribbon-track">
          {/* Continuous unbroken glowing waveform ribbon running behind all 5 circular plates */}
          <svg className="st-ribbon-line" viewBox="0 0 2400 120" preserveAspectRatio="none" aria-hidden="true">
            <path
              className="st-ribbon-wave"
              d="M0,60 C160,12 320,108 480,60 C640,12 800,108 960,60 C1120,12 1280,108 1440,60 C1600,12 1760,108 1920,60 C2080,18 2240,102 2400,60"
              fill="none"
              stroke="rgba(56,189,248,0.45)"
              strokeWidth="1.5"
            />
          </svg>

          {ANALOG_PLATES.map((plate, i) => (
            <article key={plate.code} className="st-plate">
              <div className="st-plate-top">
                <span>{plate.index} // {plate.code}</span>
                <span>{plate.targetBody.toUpperCase()}</span>
              </div>

              <button
                type="button"
                className="st-plate-aperture"
                onClick={() => {
                  setSiteIdx(i)
                  document.getElementById('lens-stage')?.scrollIntoView({ behavior: 'smooth' })
                }}
                aria-label={`Inspect ${plate.name}`}
              >
                <img
                  className="st-plate-disc"
                  src={plate.image}
                  alt={plate.name}
                  decoding="async"
                  loading="lazy"
                />
                <span className="st-plate-ring" aria-hidden="true" />
              </button>

              <div className="st-plate-body">
                <span className="st-plate-coords">{plate.coords} · {plate.location}</span>
                <h3>{plate.name}</h3>
                <p>{plate.headline}</p>

                <svg viewBox="0 0 280 68" className="st-plate-wave" aria-hidden="true">
                  <path d={plate.wavePoints} fill="none" stroke="#38bdf8" strokeWidth="1.6" />
                </svg>

                <div className="st-plate-foot">
                  <span>SLOPE {plate.slopeDeg}°</span>
                  <span>{plate.mineralTag}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CHAPTER III: SCULPTURAL THREE-LENS INSTRUMENT (EXPLORE / LEARN / RESEARCH IN PLACE) */}
      <section ref={lensStageRef} id="lens-stage" className="st-lens-section">
        <div ref={spotlightRef} className="st-lens-spotlight" aria-hidden="true" />
        <div className="st-wrap">
          <div className="st-chapter-meta">
            <span>CHAPTER 04 · INTERACTIVE INSTRUMENT</span>
            <span>{transitStageBridge}</span>
          </div>

          <div className="st-lens-header">
            <div>
              <h2>Inspect one site across three depths of meaning.</h2>
              <p>Switch seamlessly between public intuition, student variable transparency, and expedition readiness.</p>
            </div>

            <div className="st-lens-switch" role="tablist" aria-label="Experience mode">
              {(
                [
                  ['explore', '01 · EXPLORE'],
                  ['learn', '02 · LEARN'],
                  ['research', '03 · RESEARCH'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={lens === id}
                  onClick={() => setLens(id)}
                  className={`st-pill-btn${lens === id ? ' is-active' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="st-lens-stage">
            <div className="st-lens-controls">
              <div className="st-control-block">
                <span className="st-micro-label">PLANETARY TARGET</span>
                <div className="st-chip-row">
                  {TARGET_HORIZONS.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTargetId(t.id)}
                      className={`st-chip${t.id === targetId ? ' is-active' : ''}`}
                    >
                      {t.body.toUpperCase()} · {t.label.split(' ')[0].toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="st-control-block">
                <span className="st-micro-label">EARTH CANDIDATE SPECIMEN</span>
                <div className="st-chip-row">
                  {ANALOG_PLATES.map((p, idx) => (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => setSiteIdx(idx)}
                      className={`st-chip${idx === siteIdx ? ' is-active' : ''}`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div ref={lensPanelRef}>
              {lens === 'explore' && (
                <div className="st-control-block">
                  <span className="st-micro-label">
                    DISPLAY SLOPE FILTER ≤ {slopeMax}° ·{' '}
                    <em style={{ color: passesFilter ? '#00c48c' : '#e5925b', fontStyle: 'normal' }}>
                      {passesFilter ? 'SITE WITHIN ENVELOPE' : 'EXCEEDS DISPLAY FILTER'}
                    </em>
                  </span>
                  <input
                    className="st-range"
                    type="range"
                    min={6}
                    max={25}
                    value={slopeMax}
                    onChange={e => setSlopeMax(Number(e.target.value))}
                  />
                  <p className="st-lens-note">{activeSite.storyLine}</p>
                </div>
              )}

              {lens === 'learn' && (
                <div className="st-control-block">
                  <span className="st-micro-label">PROGRESSIVE VARIABLE DISCLOSURE · SLOPE &amp; SPECTRA</span>
                  <p className="st-lens-note">
                    {activeSite.name} records a {activeSite.slopeDeg}° mean slope vs {target.targetSlope}° at{' '}
                    {target.label}. Why it matters: steeper rim walls amplify rover slip and wheel sinkage.
                  </p>
                  <button
                    type="button"
                    className="st-inline-action"
                    onClick={() => setLearnOpen(v => !v)}
                  >
                    {learnOpen ? '− HIDE SENSOR FORMULA' : '+ EXPAND SENSOR PROVENANCE & METHOD'}
                  </button>
                  {learnOpen && (
                    <div className="st-disclosure">
                      <span>METHOD: 30m Horn Gradient Kernel · Copernicus DEM ↔ {target.instruments}</span>
                      <span>RESOLUTION NOTE: 30m baselines smooth boulders below wheel scale.</span>
                    </div>
                  )}
                </div>
              )}

              {lens === 'research' && (
                <div className="st-control-block">
                  <span className="st-micro-label">EVIDENCE × FIELD FEASIBILITY SEPARATION</span>
                  <div className="st-research-split">
                    <div>
                      <small>SCIENTIFIC EVIDENCE</small>
                      <strong style={{ color: '#00c48c' }}>{activeSite.evidenceStatus}</strong>
                    </div>
                    <div>
                      <small>LOGISTICS FEASIBILITY</small>
                      <strong>{activeSite.feasibilityStatus}</strong>
                    </div>
                  </div>
                  <p className="st-lens-note" style={{ marginTop: 10 }}>
                    {activeSite.feasibilityDetail}
                  </p>
                  <button type="button" className="st-inline-action is-mint" onClick={downloadAssessment}>
                    DOWNLOAD SITE ASSESSMENT (.MD) ↓
                  </button>
                </div>
              )}
              </div>

              <div className="st-control-block">
                <a href="/analog/explore" className="st-inline-action" style={{ display: 'inline-block', textDecoration: 'none' }}>
                  OPEN FULL 3D &amp; MAP WORKBENCH →
                </a>
              </div>
            </div>

            {/* Live Kinetic Cross-Section Waveform + Parity Telemetry Bars */}
            <div className="st-lens-canvas">
              <svg viewBox="0 0 400 220" className="st-wave-svg" aria-hidden="true">
                {[55, 105, 155].map(y => (
                  <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="rgba(255,255,255,0.06)" />
                ))}
                <path
                  ref={earthPathRef}
                  d={`M16,164 L96,158 L164,${earthPeakY} L238,176 L312,150 L384,162`}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.2"
                />
                <path
                  ref={targetPathRef}
                  d={`M16,170 L98,162 L170,${targetPeakY} L244,182 L318,148 L384,168`}
                  fill="none"
                  stroke={targetColor}
                  strokeWidth="1.8"
                  strokeDasharray="6 5"
                />
                {/* Interactive sample waypoint nodes reacting to Display Slope Filter */}
                {earthWaypoints.map(([wx, wy], i) => (
                  <g key={i} transform={`translate(${wx} ${wy})`}>
                    <circle
                      r={i === 2 ? 4.4 : 2.8}
                      fill={passesFilter ? '#00c48c' : '#e5925b'}
                      stroke="#000000"
                      strokeWidth="1"
                    />
                  </g>
                ))}
                {/* Continuous live GSAP radar sweep */}
                <g ref={scanHeadRef}>
                  <line x1="20" y1="16" x2="20" y2="202" stroke="#ffffff" strokeWidth="1" opacity="0.55" />
                  <circle cx="20" cy="18" r="2.2" fill="#00c48c" />
                </g>
                <text x="16" y="24" fill="#38bdf8" fontSize="9" fontFamily="Chivo Mono, monospace">
                  ── EARTH · {activeSite.name.toUpperCase()} ({activeSite.slopeDeg}°)
                </text>
                <text x="16" y="40" fill={targetColor} fontSize="9" fontFamily="Chivo Mono, monospace">
                  - - {target.body.toUpperCase()} · {target.label.toUpperCase()} ({target.targetSlope}°)
                </text>
              </svg>

              {/* Animated Live Analog Parity Gauges */}
              <div ref={parityBarsRef} className="st-parity-bars">
                <div className="st-parity-row">
                  <div className="st-parity-labels">
                    <span>SLOPE GEOMETRY MATCH</span>
                    <strong>{slopeParityPct}%</strong>
                  </div>
                  <div className="st-parity-track">
                    <div
                      className="st-parity-fill"
                      style={{ width: `${slopeParityPct}%`, background: '#38bdf8' }}
                    />
                  </div>
                </div>
                <div className="st-parity-row">
                  <div className="st-parity-labels">
                    <span>MINERALOGY / CRISM FIDELITY</span>
                    <strong>{mineralParityPct}%</strong>
                  </div>
                  <div className="st-parity-track">
                    <div
                      className="st-parity-fill"
                      style={{ width: `${mineralParityPct}%`, background: targetColor }}
                    />
                  </div>
                </div>
                <div className="st-parity-row">
                  <div className="st-parity-labels">
                    <span>ROVER ENVELOPE CLEARANCE (≤ {slopeMax}°)</span>
                    <strong>{safetyEnvelopePct}%</strong>
                  </div>
                  <div className="st-parity-track">
                    <div
                      className="st-parity-fill"
                      style={{
                        width: `${safetyEnvelopePct}%`,
                        background: passesFilter ? '#00c48c' : '#e5925b',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="st-caveat-line">
                <span>WHERE ANALOGY BREAKS DOWN</span>
                <p>{activeSite.limitsNote}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CHAPTER IV: MONUMENTAL KINETIC BOUNDARY */}
      <section className="st-boundary">
        <svg className="st-boundary-ring" viewBox="0 0 600 600" aria-hidden="true">
          <circle cx="300" cy="300" r="240" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
          <circle cx="300" cy="300" r="170" fill="none" stroke="rgba(56,189,248,0.28)" strokeDasharray="6 6" />
          <line x1="60" y1="300" x2="540" y2="300" stroke="rgba(255,255,255,0.08)" />
          <line x1="300" y1="60" x2="300" y2="540" stroke="rgba(255,255,255,0.08)" />
        </svg>

        <div className="st-wrap st-boundary-copy">
          <span>CHAPTER 05 · THE HONEST BOUNDARY</span>
          <h2>
            Earth matches the rock, the slope, and the ice.
            <br />
            <em>Never the vacuum. Never 0.16g.</em>
          </h2>
          <p>
            Every score inside AstraTerra pairs mineral and topographic parity with physical reality checks so engineers test safely before flight.
          </p>
        </div>
      </section>

      {/* CHAPTER V: QUIET HORIZON CLOSE */}
      <footer className="st-close">
        <div className="st-wrap st-close-inner">
          <div>
            <span>ASTRATERRA · NASA SPACE APPS 2026</span>
            <p>CURATED DEMONSTRATION DATASET · COPERNICUS · NASA LRO · MRO</p>
          </div>
          <div className="st-close-actions">
            <a href="/analog/" className="st-launch-btn">
              LAUNCH ANALOG PLATFORM →
            </a>
            <button type="button" className="st-return-btn" onClick={onScrollTop}>
              RETURN TO EARTH GLOBE ↑
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

