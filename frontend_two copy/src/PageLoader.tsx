import { useEffect, useRef } from 'react'
import gsap from 'gsap'

interface PageLoaderProps {
  ready: boolean
  onComplete: () => void
}

const CIRCUMFERENCE = 2 * Math.PI * 74.5 // ~468.097 matching r=74.5 in 150x150 viewBox

export default function PageLoader({ ready, onComplete }: PageLoaderProps) {
  const loaderRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLParagraphElement>(null)
  const circleRef = useRef<SVGCircleElement>(null)
  const planetOrbitRef = useRef<HTMLDivElement>(null)

  const readyRef = useRef(ready)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const sweepDoneRef = useRef(false)
  const finishExitRef = useRef<(() => void) | null>(null)

  readyRef.current = ready
  onCompleteRef.current = onComplete

  useEffect(() => {
    const loaderEl = loaderRef.current
    const wrapEl = wrapRef.current
    const textEl = textRef.current
    const circleEl = circleRef.current
    const orbitEl = planetOrbitRef.current
    if (!loaderEl || !wrapEl || !textEl || !circleEl || !orbitEl) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      if (!ready) return
      textEl.textContent = '100%'
      circleEl.style.strokeDashoffset = '0'
      const timer = window.setTimeout(() => onCompleteRef.current(), 120)
      return () => window.clearTimeout(timer)
    }

    const ctx = gsap.context(() => {
      const state = { progress: 0 }
      let lastPct = -1

      const updateVisuals = (p: number) => {
        const clamped = Math.max(0, Math.min(1, p))
        circleEl.style.strokeDashoffset = (CIRCUMFERENCE * (1 - clamped)).toFixed(2)
        const pct = Math.round(clamped * 100)
        if (pct !== lastPct) {
          lastPct = pct
          textEl.textContent = `${pct}%`
        }
      }

      const runExit = () => {
        if (completedRef.current) return
        completedRef.current = true
        gsap.to(state, {
          progress: 1,
          duration: 0.25,
          ease: 'power2.out',
          onUpdate: () => updateVisuals(state.progress),
          onComplete: () => {
            gsap
              .timeline({ onComplete: () => onCompleteRef.current() })
              .to(wrapEl, { scale: 1.07, autoAlpha: 0, duration: 0.55, ease: 'power3.in' }, 0.12)
              .to(loaderEl, { autoAlpha: 0, duration: 0.65, ease: 'power2.inOut' }, 0.18)
          },
        })
      }

      finishExitRef.current = runExit

      // Pure GPU rotation on orbiting satellite dot + responsive progress ramp
      gsap.to(orbitEl, {
        rotation: 360,
        duration: 1.9,
        ease: 'power2.inOut',
        force3D: true,
      })

      gsap.to(state, {
        progress: 0.96,
        duration: 1.75,
        ease: 'power2.inOut',
        onUpdate: () => {
          const cap = readyRef.current ? Math.min(1, state.progress * 1.04) : state.progress
          updateVisuals(cap)
        },
        onComplete: () => {
          sweepDoneRef.current = true
          if (readyRef.current) {
            runExit()
          }
        },
      })
    }, loaderRef)

    return () => {
      ctx.revert()
      finishExitRef.current = null
    }
  }, [])

  // If Earth.glb finishes loading after the 5s sweep, trigger clean completion right away
  useEffect(() => {
    if (ready && sweepDoneRef.current && finishExitRef.current) {
      finishExitRef.current()
    }
  }, [ready])

  return (
    <div
      ref={loaderRef}
      id="js-page-loader-click"
      className="page-loader"
      role="status"
      aria-live="polite"
      aria-label="Loading Earth experience"
    >
      <div ref={wrapRef} className="page-loader_progress-wrap">
        <div className="page-loader_number-progress">
          <p ref={textRef} id="progress-text" className="text-size-large is-progress-number">
            0%
          </p>

          <div className="progress-circle-planet-wrap" aria-hidden="true">
            <div className="progress-circle-outer is-dashed">
              <svg width="150" height="150" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="100" cy="100" r="99.75" stroke="white" strokeWidth="0.5" />
              </svg>
            </div>
            <div ref={planetOrbitRef} className="progress-circle-planet-inner-wrap is-1">
              <div className="progress-circle-planet" />
            </div>
          </div>

          <div id="loader" className="page-loader_circle-progress-wrap" aria-hidden="true">
            <div className="progress-circle-outer">
              <svg width="125" height="125" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="75" cy="75" r="74.5" stroke="#808080" />
              </svg>
            </div>

            <div className="progress-circle-outer is-progress">
              <svg width="125" height="125" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle
                  ref={circleRef}
                  cx="75"
                  cy="75"
                  r="74.5"
                  stroke="white"
                  id="is-progress-circle"
                  style={{
                    strokeDasharray: CIRCUMFERENCE,
                    strokeDashoffset: CIRCUMFERENCE,
                  }}
                />
              </svg>
            </div>

            <div className="progress-circle-outer is-progress is-cross">
              <svg width="180" height="179" viewBox="0 0 180 179" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="90.3534" cy="89.1465" r="62" transform="rotate(-45 90.3534 89.1465)" stroke="white" />
                <path d="M1.96509 89.1465H178.742" stroke="white" />
                <path d="M90.3535 0.758057V177.535" stroke="white" />
                <rect x="1.25813" y="89.1465" width="125" height="126" transform="rotate(-45 1.25813 89.1465)" stroke="white" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
