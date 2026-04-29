'use client'
import { useEffect, useRef, useState } from 'react'

// ─── Splash screen premium — mostra solo su Capacitor nativo o PWA standalone ─
// Timeline: particelle convergenti (950 ms) → logo spring-in → separatore → tagline
//           → glow pulse → fade-out → unmount
// Nessuna libreria esterna. Canvas per le particelle, DOM-refs per le transizioni CSS.

export default function SplashOverlay() {
  const [show, setShow]   = useState(false)
  const [done, setDone]   = useState(false)

  const wrapRef  = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const logoRef  = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const sepRef   = useRef<HTMLDivElement>(null)
  const tagRef   = useRef<HTMLParagraphElement>(null)

  // ── 1. Decide se mostrare ────────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      if (typeof window === 'undefined') return
      let show = false
      // PWA installata (standalone display-mode)
      if (window.matchMedia('(display-mode: standalone)').matches) show = true
      // iOS PWA (navigator.standalone è true)
      if ((window.navigator as any).standalone === true) show = true
      // Capacitor native
      if (!show) {
        try {
          const { Capacitor } = await import('@capacitor/core')
          if (Capacitor.isNativePlatform()) show = true
        } catch { /* fuori da Capacitor */ }
      }
      if (show) setShow(true)
    }
    check()
  }, [])

  // ── 2. Animazione completa ───────────────────────────────────────────────────
  useEffect(() => {
    if (!show) return

    const canvas  = canvasRef.current
    const logo    = logoRef.current
    const title   = titleRef.current
    const sep     = sepRef.current
    const tag     = tagRef.current
    const wrap    = wrapRef.current
    if (!canvas || !logo || !title || !sep || !tag || !wrap) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width  = window.innerWidth
    const H = canvas.height = window.innerHeight
    const cx = W / 2
    const cy = H / 2

    // ── Genera particelle distribuite radialmente ──────────────────────────────
    const COUNT = 56
    const particles = Array.from({ length: COUNT }, () => {
      const angle   = Math.random() * Math.PI * 2
      const minR    = 80
      const maxR    = Math.min(W, H) * 0.44
      const dist    = minR + Math.random() * (maxR - minR)
      return {
        sx:    cx + Math.cos(angle) * dist,
        sy:    cy + Math.sin(angle) * dist,
        r:     0.7 + Math.random() * 2.3,
        hue:   255 + Math.random() * 80,    // purple → violet
        sat:   55  + Math.random() * 35,
        lit:   48  + Math.random() * 38,
        delay: Math.random() * 130,         // stagger in uscita
      }
    })

    const CONV_MS = 950   // durata convergenza
    let   rafId   = 0
    let   start   = 0

    const draw = (ts: number) => {
      if (!start) start = ts
      const elapsed = ts - start

      ctx.clearRect(0, 0, W, H)

      for (const p of particles) {
        const t    = Math.max(0, elapsed - p.delay)
        const raw  = Math.min(t / CONV_MS, 1)
        // Ease-in-out cubica
        const prog = raw < 0.5 ? 4 * raw ** 3 : 1 - (-2 * raw + 2) ** 3 / 2

        const x  = p.sx + (cx - p.sx) * prog
        const y  = p.sy + (cy - p.sy) * prog
        const d  = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)

        const fadeIn  = Math.min(t / 180, 1)
        const fadeOut = d < 30 ? d / 30 : 1
        const op      = fadeIn * fadeOut
        if (op < 0.01) continue

        // Nucleo
        ctx.beginPath()
        ctx.arc(x, y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue},${p.sat}%,${p.lit}%,${op})`
        ctx.fill()

        // Alone diffuso
        if (p.r > 1.3) {
          const grd = ctx.createRadialGradient(x, y, 0, x, y, p.r * 3.5)
          grd.addColorStop(0, `hsla(${p.hue},${p.sat}%,${p.lit + 12}%,${op * 0.3})`)
          grd.addColorStop(1, `hsla(${p.hue},${p.sat}%,${p.lit}%,0)`)
          ctx.beginPath()
          ctx.arc(x, y, p.r * 3.5, 0, Math.PI * 2)
          ctx.fillStyle = grd
          ctx.fill()
        }
      }

      if (elapsed < CONV_MS + 400) {
        rafId = requestAnimationFrame(draw)
      }
    }

    rafId = requestAnimationFrame(draw)

    // ── Timeline CSS diretta sui ref (evita re-render React) ──────────────────

    // T+1050ms — logo spring-in
    const t1 = setTimeout(() => {
      logo.style.opacity   = '1'
      logo.style.transform = 'scale(1) translateY(0)'
      logo.style.filter    = 'blur(0px)'
    }, 1050)

    // T+1200ms — separatore si allunga
    const t2 = setTimeout(() => {
      sep.style.width = '88px'
    }, 1200)

    // T+1460ms — tagline fade-in
    const t3 = setTimeout(() => {
      tag.style.opacity   = '1'
      tag.style.transform = 'translateY(0)'
    }, 1460)

    // T+1750ms — glow pulse sul titolo
    const t4 = setTimeout(() => {
      title.style.textShadow =
        '0 0 28px rgba(167,139,250,0.95), 0 0 65px rgba(139,92,246,0.55), 0 0 120px rgba(109,40,217,0.3)'
    }, 1750)

    // T+2350ms — glow si spegne
    const t5 = setTimeout(() => {
      title.style.textShadow = '0 0 0px rgba(167,139,250,0)'
    }, 2350)

    // T+2650ms — fade-out dell'overlay
    const t6 = setTimeout(() => {
      wrap.style.opacity    = '0'
      wrap.style.transition = 'opacity 0.55s cubic-bezier(0.4,0,1,1)'
    }, 2650)

    // T+3250ms — unmount
    const t7 = setTimeout(() => setDone(true), 3250)

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4)
      clearTimeout(t5); clearTimeout(t6); clearTimeout(t7)
    }
  }, [show]) // eseguito una sola volta quando show diventa true

  if (!show || done) return null

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99997, // sotto rotate-overlay (99999) e offline-banner (99998)
        backgroundColor: '#07070f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* Canvas particelle */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />

      {/* Blocco logo */}
      <div
        ref={logoRef}
        style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          // Stato iniziale — transizionato via ref ai T+1050ms
          opacity: 0,
          transform: 'scale(0.86) translateY(8px)',
          filter: 'blur(7px)',
          transition:
            'opacity 0.48s ease, ' +
            'transform 0.54s cubic-bezier(0.34, 1.56, 0.64, 1), ' +
            'filter 0.48s ease',
        }}
      >
        <h1
          ref={titleRef}
          style={{
            fontSize: '44px',
            fontWeight: 800,
            letterSpacing: '0.1em',
            color: '#ffffff',
            margin: 0,
            lineHeight: 1,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
            // text-shadow animato via ref
            transition: 'text-shadow 0.65s ease',
          }}
        >
          AiGORÀ
        </h1>

        {/* Separatore */}
        <div
          ref={sepRef}
          style={{
            height: '1px',
            background:
              'linear-gradient(90deg, transparent, rgba(167,139,250,0.55), transparent)',
            margin: '15px 0 12px',
            width: '0px', // → 88px al T+1200ms
            transition: 'width 0.5s ease',
          }}
        />

        {/* Tagline */}
        <p
          ref={tagRef}
          style={{
            fontSize: '11px',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.38)',
            margin: 0,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
            fontWeight: 500,
            opacity: 0,
            transform: 'translateY(5px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
          }}
        >
          L&apos;arena delle idee
        </p>
      </div>
    </div>
  )
}
