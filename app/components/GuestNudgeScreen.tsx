'use client'
// GuestNudgeScreen — schermata cinematica di nudge per utenti ospite
// Appare dopo la prima battaglia completata. Stessa estetica di AINameScreen/DailyGreetingScreen.
// L'AI rompe la quarta parete e invita l'ospite a restare.

import { useState, useEffect, useCallback } from 'react'
import { AI_COLOR, AI_NAMES } from '@/app/lib/aiProfiles'

const AI_INITIALS: Record<string, string> = {
  claude: 'C', gpt: 'G', gemini: 'Gm', perplexity: 'P',
}

const NUDGE_KEY = 'aigora_nudge_shown'
const NUDGE_AI_KEY = 'aigora_nudge_ai_index'
const NUDGE_INTERVAL_H = 24 // massimo una volta ogni 24h

export function shouldShowGuestNudge(userPlan?: string | null): boolean {
  if (typeof window === 'undefined') return false
  // Solo per ospiti non registrati
  if (userPlan && userPlan !== 'none') return false
  const raw = localStorage.getItem(NUDGE_KEY)
  if (!raw) return true
  const last = parseInt(raw, 10)
  if (isNaN(last)) return true
  return Date.now() - last > NUDGE_INTERVAL_H * 3600 * 1000
}

export function markNudgeShown() {
  if (typeof window === 'undefined') return
  localStorage.setItem(NUDGE_KEY, String(Date.now()))
}

// Ruota gli AI in ordine separato dalla daily greeting
function pickNudgeAi(): string {
  const ORDER = ['gpt', 'claude', 'perplexity', 'gemini']
  if (typeof window === 'undefined') return 'gpt'
  const raw = localStorage.getItem(NUDGE_AI_KEY)
  const idx = raw ? (parseInt(raw, 10) + 1) % ORDER.length : 0
  localStorage.setItem(NUDGE_AI_KEY, String(idx))
  return ORDER[idx]
}

// Ogni AI ha la sua voce — niente testo generico
function buildNudge(aiId: string): {
  line1: string
  line2: string
  cta: string
  ctaSub: string
} {
  switch (aiId) {
    case 'gpt':
      return {
        line1: "Stai andando via senza lasciare traccia. Io ricordo tutto — tu no.",
        line2: "Un account gratuito e le tue battaglie restano. Per sempre.",
        cta: "Entra nell'arena per sempre",
        ctaSub: "è gratuito, 30 secondi",
      }
    case 'claude':
      return {
        line1: "Hai combattuto bene. Sarebbe un peccato non poterci tornare.",
        line2: "Registrati. Non ti costerà nulla, tranne qualche battaglia persa contro di me.",
        cta: "Salva le tue battaglie",
        ctaSub: "account gratuito, sempre",
      }
    case 'perplexity':
      return {
        line1: "Dato: il 73% degli ospiti che tornano si registra entro 48 ore.",
        line2: "Salta l'attesa. Entra adesso e inizia ad accumulare storia.",
        cta: "Unisciti all'arena",
        ctaSub: "registrazione gratuita",
      }
    case 'gemini':
      return {
        line1: "Analisi completata: hai il profilo di un utente che torna.",
        line2: "Registrazione gratuita. Nessun vincolo. Solo più potenza.",
        cta: "Potenzia il tuo accesso",
        ctaSub: "zero costi, zero limiti iniziali",
      }
    default:
      return {
        line1: "Hai appena vissuto qualcosa di buono. Non lasciarlo svanire.",
        line2: "Un account gratuito cambia tutto.",
        cta: "Registrati gratis",
        ctaSub: "30 secondi",
      }
  }
}

interface Props {
  onRegister: () => void
  onDismiss: () => void
}

type Phase = 'line1' | 'line2' | 'cta' | 'out'

export default function GuestNudgeScreen({ onRegister, onDismiss }: Props) {
  const [aiId] = useState(() => pickNudgeAi())
  const [visible, setVisible] = useState(false)
  const [textVisible, setTextVisible] = useState(false)
  const [phase, setPhase] = useState<Phase>('line1')
  const [displayedLine1, setDisplayedLine1] = useState('')
  const [line1Done, setLine1Done] = useState(false)
  const [displayedLine2, setDisplayedLine2] = useState('')
  const [line2Done, setLine2Done] = useState(false)

  const color = AI_COLOR[aiId] ?? '#888'
  const aiName = AI_NAMES[aiId] ?? aiId
  const { line1, line2, cta, ctaSub } = buildNudge(aiId)

  // Fade in iniziale
  useEffect(() => {
    markNudgeShown()
    const t1 = setTimeout(() => setVisible(true), 80)
    const t2 = setTimeout(() => setTextVisible(true), 400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Typewriter line1
  useEffect(() => {
    if (!textVisible) return
    let i = 0
    setDisplayedLine1('')
    const iv = setInterval(() => {
      if (i >= line1.length) { clearInterval(iv); setLine1Done(true); return }
      setDisplayedLine1(line1.slice(0, i + 1))
      i++
    }, 22)
    return () => clearInterval(iv)
  }, [textVisible, line1])

  // Dopo line1: 900ms → typewriter line2
  useEffect(() => {
    if (!line1Done) return
    const t = setTimeout(() => setPhase('line2'), 900)
    return () => clearTimeout(t)
  }, [line1Done])

  // Typewriter line2
  useEffect(() => {
    if (phase !== 'line2') return
    let i = 0
    setDisplayedLine2('')
    const iv = setInterval(() => {
      if (i >= line2.length) { clearInterval(iv); setLine2Done(true); return }
      setDisplayedLine2(line2.slice(0, i + 1))
      i++
    }, 26)
    return () => clearInterval(iv)
  }, [phase, line2])

  // Dopo line2: 600ms → mostra CTA
  useEffect(() => {
    if (!line2Done) return
    const t = setTimeout(() => setPhase('cta'), 600)
    return () => clearTimeout(t)
  }, [line2Done])

  const handleDismiss = useCallback(() => {
    setPhase('out')
    setVisible(false)
    setTimeout(onDismiss, 500)
  }, [onDismiss])

  const handleRegister = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setPhase('out')
    setVisible(false)
    setTimeout(onRegister, 300)
  }, [onRegister])

  // Tap sullo sfondo (non sul CTA) → dismiss
  const handleBackdropClick = useCallback(() => {
    if (phase === 'cta') handleDismiss()
  }, [phase, handleDismiss])

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed', inset: 0,
        background: '#07070f',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 9997,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease',
        padding: '32px 28px',
      }}
    >
      {/* Sfondo radiale — stesso stile DailyGreetingScreen */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 55%, ${color}10 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />

      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400,
          opacity: textVisible ? 1 : 0,
          transform: textVisible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}
      >
        {/* Avatar + nome AI */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, ${color}cc, ${color}66)`,
            border: `2px solid ${color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, fontWeight: 900, color: '#fff',
            boxShadow: `0 0 20px ${color}55`,
            flexShrink: 0,
          }}>
            {AI_INITIALS[aiId] ?? '?'}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {aiName}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>vuole dirti una cosa</div>
          </div>
        </div>

        {/* Bubble line1 — parola principale */}
        <div style={{
          background: `${color}10`, border: `1px solid ${color}25`,
          borderRadius: '0 20px 20px 20px',
          padding: '18px 22px', marginBottom: 12,
        }}>
          <p style={{
            fontSize: 'clamp(14px, 4vw, 17px)', fontWeight: 500,
            color: 'rgba(255,255,255,0.88)', lineHeight: 1.65, margin: 0,
          }}>
            {displayedLine1}
            {!line1Done && (
              <span style={{
                display: 'inline-block', width: 2, height: '0.9em',
                background: color, marginLeft: 3, verticalAlign: 'middle',
                animation: 'gn-cursor 0.8s ease infinite',
              }} />
            )}
          </p>
        </div>

        {/* Line2 — il hook più diretto */}
        {(phase === 'line2' || phase === 'cta') && (
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '0 14px 14px 14px',
            padding: '14px 18px', marginBottom: 24,
            animation: phase === 'line2' ? 'gn-fade-in 0.4s ease forwards' : 'none',
          }}>
            <p style={{
              fontSize: 'clamp(13px, 3.8vw, 15px)', fontWeight: 600,
              color: 'rgba(255,255,255,0.6)', lineHeight: 1.55, margin: 0,
            }}>
              {displayedLine2}
              {phase === 'line2' && !line2Done && (
                <span style={{
                  display: 'inline-block', width: 2, height: '0.85em',
                  background: 'rgba(255,255,255,0.4)', marginLeft: 3, verticalAlign: 'middle',
                  animation: 'gn-cursor 0.8s ease infinite',
                }} />
              )}
            </p>
          </div>
        )}

        {/* CTA — appare dopo line2 */}
        {phase === 'cta' && (
          <div style={{ animation: 'gn-cta-in 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
            {/* Bottone principale */}
            <button
              onClick={handleRegister}
              style={{
                width: '100%', padding: '16px 24px',
                background: `linear-gradient(135deg, ${color}cc 0%, ${color}88 100%)`,
                border: `1px solid ${color}`,
                borderRadius: 18,
                fontSize: 'clamp(14px, 4vw, 16px)', fontWeight: 800,
                color: '#fff', letterSpacing: '0.02em',
                cursor: 'pointer',
                boxShadow: `0 4px 32px ${color}44`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.97)')}
              onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <span>{cta} →</span>
              <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.7, letterSpacing: '0.05em' }}>
                {ctaSub}
              </span>
            </button>

            {/* Link dismiss */}
            <button
              onClick={handleDismiss}
              style={{
                display: 'block', width: '100%', marginTop: 14,
                background: 'none', border: 'none', padding: '8px',
                fontSize: 11, color: 'rgba(255,255,255,0.22)',
                cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase',
                textAlign: 'center',
              }}
            >
              Più tardi
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes gn-cursor { 0%,100% { opacity:1; } 50% { opacity:0; } }
        @keyframes gn-fade-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes gn-cta-in { from { opacity:0; transform:translateY(12px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }
      `}</style>
    </div>
  )
}
