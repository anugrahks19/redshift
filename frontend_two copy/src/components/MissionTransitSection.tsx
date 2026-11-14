import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { TRANSIT_MISSIONS, type TransitMissionProfile } from '../data/missionTransit'

gsap.registerPlugin(ScrollTrigger)

const MOON_PATH_D = 'M 98 408 C 128 214 268 118 424 102'
const MARS_PATH_D = 'M 98 408 C 72 152 276 58 424 102'

interface TransitActProps {
  mission: TransitMissionProfile
  actLabel: string
}

function TransitAct({ mission, actLabel }: TransitActProps) {
  const actRef = useRef<HTMLDivElement>(null)
  const introRef = useRef<HTMLDivElement>(null)
  const visualRef = useRef<HTMLDivElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const trailRef = useRef<SVGPathElement>(null)
  const rocketRef = useRef<SVGGElement>(null)
  const plumeRef = useRef<SVGPolygonElement>(null)
  const earthRingsRef = useRef<SVGGElement>(null)
  const targetRingsRef = useRef<SVGGElement>(null)
  const pulseRef = useRef<SVGCircleElement>(null)
  const progressObj = useRef({ value: mission.stages[0].curveFraction })

  const [activeStageIdx, setActiveStageIdx] = useState(0)
  const [nodeCoords, setNodeCoords] = useState<Array<{ x: number; y: number }>>([])

  const activeStage = mission.stages[activeStageIdx] ?? mission.stages[0]
  const trajectoryD = mission.id === 'moon' ? MOON_PATH_D : MARS_PATH_D
  const targetRadius = mission.id === 'moon' ? 24 : 30

  const syncRocketToProgress = (p: number) => {
    const pathEl = pathRef.current
    const trailEl = trailRef.current
    const rocketEl = rocketRef.current
    if (!pathEl || !rocketEl) return

    const totalLen = pathEl.getTotalLength()
    const clamped = Math.max(0.02, Math.min(1, p))
    const dist = totalLen * clamped
    const pt = pathEl.getPointAtLength(dist)
    const ahead = pathEl.getPointAtLength(Math.min(totalLen, dist + 2))
    const behind = pathEl.getPointAtLength(Math.max(0, dist - 2))
    const angle = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI + 90

    rocketEl.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)}) rotate(${angle.toFixed(1)})`)

    if (trailEl) {
      trailEl.style.strokeDasharray = `${totalLen}`
      trailEl.style.strokeDashoffset = `${totalLen * (1 - clamped)}`
    }
  }

  // Compute waypoint coordinates along SVG orbital transfer curve on mount
  useEffect(() => {
    const pathEl = pathRef.current
    if (!pathEl) return
    const total = pathEl.getTotalLength()
    const coords = mission.stages.map(st => {
      const pt = pathEl.getPointAtLength(total * st.curveFraction)
      return { x: pt.x, y: pt.y }
    })
    setNodeCoords(coords)
    progressObj.current.value = mission.stages[0].curveFraction
    syncRocketToProgress(mission.stages[0].curveFraction)
  }, [mission.stages, trajectoryD])

  // Choreograph Left Text Fade-Out -> Animated Orbital Visual Fade-In + Live Continuous Loops
  useEffect(() => {
    const actEl = actRef.current
    const introEl = introRef.current
    const visualEl = visualRef.current
    if (!actEl || !introEl || !visualEl) return

    const mm = gsap.matchMedia()
    const ctx = gsap.context(() => {
      mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
        // Explicit initial state on desktop: show left narrative text first, hide visual until fade-out beat
        gsap.set(introEl, { autoAlpha: 1, y: 0, scale: 1 })
        gsap.set(visualEl, { autoAlpha: 0, y: 24, scale: 0.94 })

        gsap
          .timeline({
            scrollTrigger: {
              trigger: actEl,
              start: 'top 38%',
              end: 'top -14%',
              scrub: 0.65,
            },
          })
          .to(introEl, { autoAlpha: 0, y: -34, scale: 0.98, ease: 'power2.inOut', duration: 0.45 }, 0)
          .to(visualEl, { autoAlpha: 1, y: 0, scale: 1, ease: 'power2.out', duration: 0.55 }, 0.36)
      })

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Stage scroll observers along the right split stages
        const cards = gsap.utils.toArray<HTMLElement>('.st-stage-card', actEl)
        cards.forEach((card, idx) => {
          ScrollTrigger.create({
            trigger: card,
            start: 'top 58%',
            end: 'bottom 58%',
            onEnter: () => setActiveStageIdx(idx),
            onEnterBack: () => setActiveStageIdx(idx),
          })
        })

        // Continuous orbital mechanics loops (subtle Earth LEO ring & target rotation + thruster plume pulse)
        if (earthRingsRef.current) {
          gsap.to(earthRingsRef.current, {
            rotation: 360,
            duration: 54,
            repeat: -1,
            ease: 'none',
            svgOrigin: '98 408',
          })
        }
        if (targetRingsRef.current) {
          gsap.to(targetRingsRef.current, {
            rotation: -360,
            duration: 42,
            repeat: -1,
            ease: 'none',
            svgOrigin: '424 102',
          })
        }
        if (plumeRef.current) {
          gsap.to(plumeRef.current, {
            scaleY: 1.45,
            opacity: 0.95,
            duration: 0.24,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            transformOrigin: '50% 0%',
          })
        }
        if (pulseRef.current) {
          gsap.fromTo(
            pulseRef.current,
            { scale: 1, opacity: 0.85 },
            {
              scale: 2.6,
              opacity: 0,
              duration: 1.7,
              repeat: -1,
              ease: 'power1.out',
              transformOrigin: '50% 50%',
            },
          )
        }
      })
    }, actRef)

    return () => {
      ctx.revert()
      mm.revert()
    }
  }, [mission.id])

  // Smooth GSAP tween flying the rocket along the orbital arc when activeStageIdx changes
  useEffect(() => {
    const tween = gsap.to(progressObj.current, {
      value: activeStage.curveFraction,
      duration: 0.78,
      ease: 'power3.out',
      onUpdate: () => syncRocketToProgress(progressObj.current.value),
    })
    return () => {
      tween.kill()
    }
  }, [activeStage.curveFraction])

  const handleStageClick = (idx: number) => {
    setActiveStageIdx(idx)
    const cards = actRef.current?.querySelectorAll<HTMLElement>('.st-stage-card')
    cards?.[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const activeCoord = nodeCoords[activeStageIdx]

  return (
    <div ref={actRef} className="st-transit-act">
      <div className="st-turion-head">
        <div className="st-turion-index">
          <span className="st-square-tick" aria-hidden="true" />
          <span>{actLabel}</span>
        </div>
        <span className="st-turion-submeta">
          {mission.stages.length} STAGES · {mission.totalTimeLabel} · {mission.crewBaseline}
        </span>
      </div>

      <div className="st-transit-split">
        {/* LEFT STICKY STAGE: INTRO TEXT FIRST -> FADES OUT -> ANIMATED TRAJECTORY & ROCKET ENTERS */}
        <div className="st-transit-sticky">
          <div className="st-left-swap-stage">
            {/* Layer 1: Left-hand mission narrative intro (fades out on scroll) */}
            <div ref={introRef} className="st-left-intro">
              <span className="st-left-kicker">
                {mission.targetLabel} · {mission.distanceLabel}
              </span>
              <h2>{mission.headline}</h2>
              <p>{mission.subtitle}</p>
              <div className="st-left-summary-row">
                <div>
                  <small>TOTAL FLIGHT WINDOW</small>
                  <strong>{mission.totalTimeLabel}</strong>
                </div>
                <div>
                  <small>DELTA-V &amp; PROPELLANT</small>
                  <strong>
                    {mission.totalDeltaV} · {mission.totalPropellant}
                  </strong>
                </div>
                <div>
                  <small>4-CREW CONSUMABLES</small>
                  <strong>{mission.totalConsumables}</strong>
                </div>
              </div>
              <span className="st-left-cue">SCROLL TO INITIATE STAGE 01 TRAJECTORY ↓</span>
            </div>

            {/* Layer 2: Floating White-on-Black Trajectory + Animated Rocket (fades in smoothly) */}
            <div ref={visualRef} className="st-left-visual">
              <div className="st-diagram-topmeta">
                <span>ORIGIN · EARTH LEO (0 KM)</span>
                <span>{mission.distanceLabel}</span>
              </div>

              <svg viewBox="0 0 520 490" className="st-transit-svg" aria-label={`${mission.targetLabel} orbital trajectory`}>
                {/* Deep orbital reference grids */}
                <g stroke="rgba(255,255,255,0.12)" strokeWidth="1" fill="none">
                  <circle cx="98" cy="408" r="126" strokeDasharray="3 6" />
                  <circle cx="98" cy="408" r="244" strokeDasharray="2 8" />
                  <circle cx="98" cy="408" r="368" strokeDasharray="2 10" />
                  <line x1="24" y1="408" x2="496" y2="408" stroke="rgba(255,255,255,0.06)" />
                  <line x1="98" y1="36" x2="98" y2="472" stroke="rgba(255,255,255,0.06)" />
                </g>

                {/* Floating corner reticle brackets (no heavy outer box) */}
                <g stroke="rgba(255,255,255,0.38)" strokeWidth="1.2" fill="none">
                  <path d="M 16 30 L 16 16 L 30 16" />
                  <path d="M 490 16 L 504 16 L 504 30" />
                  <path d="M 16 460 L 16 474 L 30 474" />
                  <path d="M 490 474 L 504 474 L 504 460" />
                </g>

                {/* Rotating concentric Earth & Target wireframe shells */}
                <g ref={earthRingsRef}>
                  <circle cx="98" cy="408" r="64" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="1" strokeDasharray="6 5" />
                  <circle cx="98" cy="408" r="78" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.9" strokeDasharray="2 6" />
                </g>
                <g ref={targetRingsRef}>
                  <circle cx="424" cy="102" r={targetRadius + 16} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="5 5" />
                  <circle cx="424" cy="102" r={targetRadius + 30} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.9" strokeDasharray="2 7" />
                </g>

                {/* Dotted reference transfer arc */}
                <path
                  ref={pathRef}
                  d={trajectoryD}
                  fill="none"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="1.2"
                  strokeDasharray="4 6"
                />

                {/* Active glowing white trajectory wake */}
                <path ref={trailRef} d={trajectoryD} fill="none" stroke="#ffffff" strokeWidth="2.1" />

                {/* Earth wireframe origin globe */}
                <g transform="translate(98 408)">
                  <circle r="44" fill="#000000" stroke="#ffffff" strokeWidth="1.6" />
                  <ellipse rx="44" ry="15" fill="none" stroke="rgba(255,255,255,0.36)" strokeWidth="1" />
                  <ellipse rx="18" ry="44" fill="none" stroke="rgba(255,255,255,0.36)" strokeWidth="1" />
                  <path d="M -22 -14 Q -4 -6 14 -20 M -18 12 Q 8 22 26 6" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
                  <text x="0" y="64" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontFamily="Chivo Mono, monospace" letterSpacing="1.2">
                    EARTH · LEO
                  </text>
                </g>

                {/* Target wireframe body (Moon crater features or Mars atmospheric ellipse) */}
                <g transform="translate(424 102)">
                  <circle r={targetRadius} fill="#000000" stroke="#ffffff" strokeWidth="1.6" />
                  {mission.id === 'moon' ? (
                    <g stroke="rgba(255,255,255,0.35)" fill="none" strokeWidth="1">
                      <circle cx="-7" cy="-6" r="5" />
                      <circle cx="9" cy="6" r="6.5" />
                      <circle cx="-6" cy="10" r="3" />
                    </g>
                  ) : (
                    <g stroke="rgba(255,255,255,0.35)" fill="none" strokeWidth="1">
                      <ellipse rx={targetRadius} ry="9" />
                      <path d="M -14 -14 Q 0 -8 15 -14" />
                    </g>
                  )}
                  <text
                    x="0"
                    y={-targetRadius - 22}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9.5"
                    fontFamily="Chivo Mono, monospace"
                    letterSpacing="1.2"
                  >
                    {mission.targetLabel}
                  </text>
                </g>

                {/* Expanding radar pulse on current active waypoint */}
                {activeCoord && (
                  <circle
                    ref={pulseRef}
                    cx={activeCoord.x}
                    cy={activeCoord.y}
                    r="6"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />
                )}

                {/* Numbered split-stage nodes along orbital arc */}
                {nodeCoords.map((pt, idx) => {
                  const isActive = idx === activeStageIdx
                  const isPassed = idx < activeStageIdx
                  return (
                    <g
                      key={mission.stages[idx].code}
                      transform={`translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleStageClick(idx)}
                    >
                      {isActive && <circle r="12" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1" />}
                      <circle
                        r={isActive ? 5.2 : 3.2}
                        fill={isActive || isPassed ? '#ffffff' : '#000000'}
                        stroke="#ffffff"
                        strokeWidth="1.4"
                      />
                      <text
                        x="11"
                        y="-9"
                        fill={isActive ? '#ffffff' : 'rgba(255,255,255,0.5)'}
                        fontSize="9.5"
                        fontFamily="Chivo Mono, monospace"
                      >
                        [{mission.stages[idx].index}]
                      </text>
                    </g>
                  )
                })}

                {/* Detailed White Multi-Stage Rocket Silhouette + Flickering Thruster Plume */}
                <g ref={rocketRef} transform="translate(98 408)">
                  <polygon ref={plumeRef} points="-3.6,15 3.6,15 0,29" fill="rgba(255,255,255,0.85)" />
                  <path
                    d="M 0 -18 L 5.5 -7 L 5.5 11 L 10 15 L 5.5 15 L -5.5 15 L -10 15 L -5.5 11 L -5.5 -7 Z"
                    fill="#ffffff"
                    stroke="#000000"
                    strokeWidth="0.9"
                  />
                  <line x1="-5" y1="-3" x2="5" y2="-3" stroke="#000000" strokeWidth="1" />
                  <line x1="-5" y1="5" x2="5" y2="5" stroke="#000000" strokeWidth="1" />
                  <circle cx="0" cy="-9" r="1.6" fill="#000000" />
                </g>
              </svg>

              {/* Floating Side Resource Ledger for 4 Astronauts */}
              <div className="st-telemetry-grid">
                <div className="st-tele-cell">
                  <span>ELAPSED MISSION TIME</span>
                  <strong>{activeStage.cumulativeTime}</strong>
                </div>
                <div className="st-tele-cell">
                  <span>CUMULATIVE ΔV</span>
                  <strong>{activeStage.cumulativeDeltaV}</strong>
                </div>
                <div className="st-tele-cell">
                  <span>STAGE PROPELLANT</span>
                  <strong>{activeStage.propellant}</strong>
                </div>
                <div className="st-tele-cell">
                  <span>4-CREW CONSUMABLES</span>
                  <strong>
                    {activeStage.crewO2Kg} O₂ · {activeStage.crewWaterL} H₂O · {activeStage.crewFoodKg} FOOD
                  </strong>
                </div>
              </div>

              <div className="st-mission-baseline">
                <span>{mission.crewBaseline}</span>
                <span>COMM LAG · {mission.commDelay}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SCROLLING COLUMN: ALL SPLIT STAGES FOR THIS PLANET */}
        <div className="st-stage-list">
          {mission.stages.map((st, idx) => {
            const isActive = idx === activeStageIdx
            return (
              <article
                key={`${mission.id}-${st.code}`}
                className={`st-stage-card${isActive ? ' is-active' : ''}`}
                onClick={() => handleStageClick(idx)}
              >
                <div className="st-stage-head">
                  <span className="st-stage-badge">
                    [{st.index} / 0{mission.stages.length}] · {st.code}
                  </span>
                  <span className="st-stage-window">{st.windowLabel}</span>
                </div>

                <h3>{st.title}</h3>

                <div className="st-stage-metrics">
                  <div>
                    <small>STAGE TIME</small>
                    <span>{st.stageDuration}</span>
                  </div>
                  <div>
                    <small>STAGE ΔV</small>
                    <span>{st.deltaV}</span>
                  </div>
                  <div>
                    <small>PROPELLANT</small>
                    <span>{st.propellant}</span>
                  </div>
                  <div>
                    <small>O₂ · H₂O · FOOD</small>
                    <span>
                      {st.crewO2Kg} · {st.crewWaterL} · {st.crewFoodKg}
                    </span>
                  </div>
                </div>

                <p className="st-stage-demand">{st.constraintNote}</p>
                <p className="st-stage-analog">
                  <span>EARTH ANALOG LINK //</span> {st.analogTie}
                </p>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function MissionTransitSection() {
  return (
    <section id="transit-stage" className="st-transit-section">
      <div className="st-wrap">
        <TransitAct
          mission={TRANSIT_MISSIONS.moon}
          actLabel="CHAPTER 02A // EARTH → MOON CREWED TRANSIT"
        />
        <div className="st-transit-divider" aria-hidden="true" />
        <TransitAct
          mission={TRANSIT_MISSIONS.mars}
          actLabel="CHAPTER 02B // EARTH → MARS CREWED TRANSIT"
        />
      </div>
    </section>
  )
}
