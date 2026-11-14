import { useEffect, useRef } from 'react'

interface StarMote {
  x: number
  y: number
  z: number
  radius: number
  alpha: number
  twinkleSpeed: number
  phase: number
  hue: string
}

export default function DeepSpaceDrift() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = window.innerWidth
    let height = window.innerHeight
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5)

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const STAR_COUNT = 150
    const hues = ['255,255,255', '255,255,255', '255,255,255', '203,213,225', '186,230,253']
    const stars: StarMote[] = Array.from({ length: STAR_COUNT }, () => {
      const z = 0.25 + Math.random() * 1.4
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        z,
        radius: 0.45 + z * 0.85,
        alpha: 0.14 + Math.random() * 0.68,
        twinkleSpeed: 0.6 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
        hue: hues[Math.floor(Math.random() * hues.length)],
      }
    })

    let lastScrollY = window.scrollY
    let scrollVelocity = 0
    let rafId = 0
    let t = 0

    const onScroll = () => {
      const nowY = window.scrollY
      const delta = nowY - lastScrollY
      lastScrollY = nowY
      scrollVelocity = Math.max(-36, Math.min(36, scrollVelocity + delta * 0.22))
    }

    window.addEventListener('resize', resize, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })

    const render = () => {
      t += 0.016
      scrollVelocity *= 0.91

      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, width, height)

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i]
        if (!reducedMotion) {
          // Gentle zero-G upward float + parallax velocity streak synced with scroll
          s.y -= (0.14 + Math.abs(scrollVelocity) * 0.42) * s.z * (scrollVelocity >= -0.05 ? 1 : -1)
          s.x += Math.sin(t * 0.15 + s.phase) * 0.04 * s.z

          if (s.y < -8) {
            s.y = height + 8
            s.x = Math.random() * width
          } else if (s.y > height + 8) {
            s.y = -8
            s.x = Math.random() * width
          }
        }

        const twinkle = reducedMotion ? 1 : 0.72 + 0.28 * Math.sin(t * s.twinkleSpeed + s.phase)
        const a = Math.min(0.95, s.alpha * twinkle)
        const streakLen = Math.min(18, Math.abs(scrollVelocity) * 0.35 * s.z)

        ctx.beginPath()
        if (streakLen > 1.4 && !reducedMotion) {
          ctx.strokeStyle = `rgba(${s.hue}, ${a.toFixed(3)})`
          ctx.lineWidth = s.radius * 1.15
          ctx.moveTo(s.x, s.y)
          ctx.lineTo(s.x, s.y + (scrollVelocity >= 0 ? streakLen : -streakLen))
          ctx.stroke()
        } else {
          ctx.fillStyle = `rgba(${s.hue}, ${a.toFixed(3)})`
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      rafId = requestAnimationFrame(render)
    }

    rafId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return <canvas ref={canvasRef} className="st-deep-space-canvas" aria-hidden="true" />
}

