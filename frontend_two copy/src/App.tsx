import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import PageLoader from './PageLoader'
import Planet, { type AnalogWorld } from './Planet'
import SpaceBackground from './SpaceBackground'
import DeepSpaceDrift from './components/DeepSpaceDrift'
import ScrollyExperience from './components/ScrollyExperience'

gsap.registerPlugin(ScrollTrigger)

export default function App() {
  const heroRef = useRef<HTMLElement>(null)
  const ambientRef = useRef<HTMLDivElement>(null)
  const meridianFillRef = useRef<HTMLDivElement>(null)
  const lenisRef = useRef<Lenis | null>(null)
  const [revealedWorld, setRevealedWorld] = useState<AnalogWorld>('earth')
  const [earthReady, setEarthReady] = useState(false)
  const [loaderDone, setLoaderDone] = useState(false)
  const [activeChapter, setActiveChapter] = useState('00 · ORBIT')

  // Failsafe so slow tunnels (e.g. VS Code port forwarding downloading 48 MB Earth.glb) never stall at 96%
  useEffect(() => {
    if (earthReady) return
    const timer = window.setTimeout(() => setEarthReady(true), 2800)
    return () => window.clearTimeout(timer)
  }, [earthReady])

  useEffect(() => {
    document.body.style.overflow = loaderDone ? '' : 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [loaderDone])

  // Smooth inertial scroll via Lenis synchronized frame-by-frame with GSAP ScrollTrigger
  useEffect(() => {
    if (!loaderDone) return

    const lenis = new Lenis({
      duration: 1.25,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })
    lenisRef.current = lenis

    const onScroll = () => ScrollTrigger.update()
    lenis.on('scroll', onScroll)

    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    const id = requestAnimationFrame(() => ScrollTrigger.refresh())

    return () => {
      cancelAnimationFrame(id)
      gsap.ticker.remove(raf)
      lenis.off('scroll', onScroll)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [loaderDone])

  // Multi-plane parallax on hero globe & Milky Way sky as user begins scrolling
  useEffect(() => {
    if (!loaderDone) return
    const hero = heroRef.current
    if (!hero) return

    const mm = gsap.matchMedia()
    const ctx = gsap.context(() => {
      mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '.hero-parallax-globe',
          { yPercent: 0, scale: 1 },
          {
            yPercent: 18,
            scale: 0.9,
            ease: 'none',
            scrollTrigger: {
              trigger: hero,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
            },
          },
        )

        gsap.fromTo(
          '.hero-parallax-sky',
          { yPercent: 0 },
          {
            yPercent: 10,
            ease: 'none',
            scrollTrigger: {
              trigger: hero,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
            },
          },
        )

        gsap.fromTo(
          '.hero-foreground',
          { yPercent: 0, autoAlpha: 1 },
          {
            yPercent: -14,
            autoAlpha: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: hero,
              start: 'top top',
              end: '72% top',
              scrub: true,
            },
          },
        )
      })

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap
          .timeline({ delay: 0.12 })
          .fromTo(
            '.hero-flank-left > *',
            { x: -22, autoAlpha: 0 },
            { x: 0, autoAlpha: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out' },
            0,
          )
          .fromTo(
            '.hero-flank-right > *',
            { x: 22, autoAlpha: 0 },
            { x: 0, autoAlpha: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out' },
            0.08,
          )
      })

      // Seamless fade-in of persistent deep-space cosmos backdrop as hero globe exits
      if (ambientRef.current) {
        gsap.fromTo(
          ambientRef.current,
          { opacity: 0 },
          {
            opacity: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: hero,
              start: '45% top',
              end: 'bottom top',
              scrub: true,
            },
          },
        )
      }

      // Continuous left-gutter orbital meridian scroll progress
      if (meridianFillRef.current) {
        gsap.fromTo(
          meridianFillRef.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: '.experience',
              start: 'top top',
              end: 'bottom bottom',
              scrub: 0.25,
            },
          },
        )
      }

      // Update active chapter indicator in HUD without collisions
      const chapterTargets: Array<[string, string]> = [
        ['.hero-stage', '00 · ORBIT'],
        ['.st-statement', '01 · DEPARTURE'],
        ['#transit-stage', '02 · TRANSIT'],
        ['.st-ribbon-section', '03 · SPECIMENS'],
        ['#lens-stage', '04 · INSTRUMENT'],
        ['.st-boundary', '05 · BOUNDARY'],
      ]
      chapterTargets.forEach(([selector, label]) => {
        const targetEl = document.querySelector(selector)
        if (!targetEl) return
        ScrollTrigger.create({
          trigger: targetEl,
          start: 'top 52%',
          end: 'bottom 52%',
          onEnter: () => setActiveChapter(label),
          onEnterBack: () => setActiveChapter(label),
        })
      })
    }, heroRef)

    return () => {
      ctx.revert()
      mm.revert()
    }
  }, [loaderDone])

  const scrollToStory = () => {
    const el = document.getElementById('story-start')
    if (lenisRef.current && el) {
      lenisRef.current.scrollTo(el)
    } else {
      el?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const scrollToTop = () => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0)
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className={`experience${loaderDone ? ' is-loaded' : ''}`} data-world={revealedWorld}>
      {/* Fixed uniform #000000 deep-space starfield moving subtly with scroll velocity */}
      <div ref={ambientRef} className="st-cosmos-ambient" aria-hidden="true">
        {loaderDone && <DeepSpaceDrift />}
      </div>

      {/* Continuous unbroken orbital progress meridian along left gutter */}
      {loaderDone && (
        <div className="st-meridian" aria-hidden="true">
          <div ref={meridianFillRef} className="st-meridian-fill" />
        </div>
      )}

      {loaderDone && (
        <header className="st-hud" aria-label="Site mark">
          <button type="button" className="st-hud-brand" onClick={scrollToTop}>
            <span className="st-hud-dot" aria-hidden="true" />
            <span>ASTRATERRA</span>
          </button>
          <div className="st-hud-right">
            <span className="st-hud-note">{activeChapter} · EARTH → MOON → MARS</span>
            <a href="/analog/" className="st-hud-cta">
              ANALOG LAB →
            </a>
          </div>
        </header>
      )}

      <section ref={heroRef} className="hero-stage" aria-label="Interactive Earth globe">
        <div className="hero-parallax-sky" style={{ position: 'absolute', inset: 0 }}>
          <SpaceBackground world={revealedWorld} />
        </div>
        <div className="hero-parallax-globe" style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
          <div className="scene">
            <div className="planet-frame">
              <Planet onRevealChange={setRevealedWorld} onReady={() => setEarthReady(true)} />
            </div>
          </div>
        </div>

        {loaderDone && (
          <div className="hero-foreground">
            <div className="hero-flank-left">
              <div className="hero-kicker">
                <span className="st-square-tick" aria-hidden="true" />
                <span>00 // ASTRATERRA OBSERVATORY</span>
              </div>
              <h1 className="hero-title">
                Earth holds the blueprint for Moon &amp; Mars.
              </h1>
              <p className="hero-lead">
                Mapping terrestrial impact craters, salt pans, and lava tubes to de-risk humanity&apos;s next landing grounds.
              </p>
              <div className={`hero-world-pill is-${revealedWorld}`}>
                <span className="hero-world-dot" aria-hidden="true" />
                <span>
                  {revealedWorld === 'earth' && 'ACTIVE SURFACE // EARTH (30M DEM)'}
                  {revealedWorld === 'moon' && 'SHADOW REVEAL // MOON (SHACKLETON)'}
                  {revealedWorld === 'mars' && 'SHADOW REVEAL // MARS (JEZERO CRISM)'}
                </span>
              </div>
              <a href="/analog/" className="hero-launch-btn">
                OPEN ANALOG WORKBENCH →
              </a>
            </div>

            <aside className="hero-flank-right" aria-label="Observatory parameters">
              <div className="hero-stat-row">
                <small>EARTH ANALOG SEEDS</small>
                <strong>05 VERIFIED SITES</strong>
              </div>
              <div className="hero-stat-row">
                <small>TRANSIT PROFILES</small>
                <strong>6 MOON · 7 MARS STAGES</strong>
              </div>
              <div className="hero-stat-row">
                <small>ORBITAL SOURCES</small>
                <strong>COPERNICUS · LRO · MRO</strong>
              </div>
              <p className="hero-hover-hint">← HOVER GLOBE TO PEEL MOON &amp; MARS</p>
            </aside>
          </div>
        )}

        {loaderDone && (
          <button type="button" className="hero-scroll-cue" onClick={scrollToStory}>
            <span>SCROLL TO BEGIN STORY</span>
            <span aria-hidden="true">↓</span>
          </button>
        )}
      </section>

      <main className="st-main">
        {loaderDone && <ScrollyExperience onScrollTop={scrollToTop} />}
      </main>

      {!loaderDone && <PageLoader ready={earthReady} onComplete={() => setLoaderDone(true)} />}
    </div>
  )
}
