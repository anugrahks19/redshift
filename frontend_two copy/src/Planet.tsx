import { useEffect, useRef, useState } from 'react'
import EarthGlobe from './EarthGlobe'
import HalftoneReveal from './HalftoneReveal'

export type AnalogWorld = 'earth' | 'moon' | 'mars'

const CYCLE_MS = 5000
const MORPH_MS = 2400

export default function Planet({
  onRevealChange,
  onReady,
}: {
  onRevealChange: (world: AnalogWorld) => void
  onReady?: () => void
}) {
  const [blend, setBlend] = useState(0)
  const [stageSize, setStageSize] = useState(600)
  const [globeReady, setGlobeReady] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const blendRef = useRef(0)
  const targetRef = useRef<'moon' | 'mars'>('moon')
  const hoveringRef = useRef(false)
  const intervalRef = useRef<number | null>(null)
  const frameRef = useRef<number | null>(null)
  const onRevealChangeRef = useRef(onRevealChange)
  onRevealChangeRef.current = onRevealChange

  useEffect(() => {
    const stage = stageRef.current
    const observer = new ResizeObserver(() => {
      if (stage) setStageSize(stage.clientWidth)
    })
    if (stage) observer.observe(stage)
    return () => {
      observer.disconnect()
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const morphTo = (world: 'moon' | 'mars') => {
    targetRef.current = world
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
    const from = blendRef.current
    const to = world === 'mars' ? 1 : 0
    const start = performance.now()
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / MORPH_MS)
      const eased = t * t * (3 - 2 * t)
      blendRef.current = from + (to - from) * eased
      setBlend(blendRef.current)
      if (t < 1) frameRef.current = window.requestAnimationFrame(frame)
      else {
        frameRef.current = null
        if (hoveringRef.current) onRevealChangeRef.current(world)
      }
    }
    frameRef.current = window.requestAnimationFrame(frame)
  }

  const startCycle = () => {
    if (hoveringRef.current) return
    hoveringRef.current = true
    onRevealChangeRef.current(targetRef.current)
    intervalRef.current = window.setInterval(() => {
      morphTo(targetRef.current === 'moon' ? 'mars' : 'moon')
    }, CYCLE_MS)
  }

  const stopCycle = () => {
    if (!hoveringRef.current) return
    hoveringRef.current = false
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    intervalRef.current = null
    onRevealChangeRef.current('earth')
  }

  return <div
    ref={stageRef}
    className="planet-stage"
    onPointerEnter={startCycle}
    onPointerLeave={event => { if (event.pointerType !== 'touch') stopCycle() }}
    onPointerDown={event => { if (event.pointerType === 'touch') startCycle() }}
    role="img"
    aria-label="A slowly rotating Earth. Hover to blend Moon and Mars imagery into the globe."
  >
    <img
      className={`planet-photo${globeReady ? ' is-hidden' : ''}`}
      src="/images/earth-photo.png"
      alt=""
      onLoad={() => onReady?.()}
      onError={() => onReady?.()}
    />
    <EarthGlobe
      onReady={() => {
        setGlobeReady(true)
        onReady?.()
      }}
    />
    <div className="planet-print" aria-hidden="true">
      <HalftoneReveal
        src="/images/moon-map.jpg"
        secondarySrc="/images/mars-map.jpg"
        blend={blend}
        spherical
        fit="contain"
        mode="mono"
        shape="dot"
        cellSize={6}
        angle={45}
        inkColor="#f4f1ea"
        paperColor="#020408"
        revealRadius={Math.min(170, Math.max(88, stageSize * 0.25))}
        softness={0.6}
        linger={0.45}
        clickBurst={false}
        intro={false}
        style={{}}
      />
    </div>
  </div>
}
