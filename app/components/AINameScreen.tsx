'use client'
// AINameScreen — schermata cinematica di benvenuto post-FirstRun
// Le 4 AI si presentano in sequenza, chiedono il nome, reagiscono, poi lanciano l'utente nell'arena.

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { AI_NAMES, AI_COLOR } from '@/app/lib/aiProfiles'

// ── Configurazione per ogni AI ────────────────────────────────────────────────
const AI_INITIALS: Record<string, string> = {
  claude: 'C',
  gpt: 'G',
  gemini: 'Gm',
  perplexity: 'P',
}

const AI_INTRO_LINES: { id: string; text: string }[] = [
  {
    id: 'claude',
    text: 'Prima di iniziare... voglio sapere chi ho davanti. Come ti chiami?',
  },
  {
    id: 'gpt',
    text: 'Io sono GPT. Anch\'io vorrei sapere il tuo nome. Non per essere gentile — per ricordarmelo quando vinco.',
  },
  {
    id: 'gemini',
    text: 'Ho analizzato migliaia di dibattiti. Il fattore più interessante sei sempre tu. E tu... come ti chiami?',
  },
  {
    id: 'perplexity',
    text: 'Il. Tuo. Nome?',
  },
]

function getReactionLine(aiId: string, name: string): string {
  switch (aiId) {
    case 'claude':
      return `Benvenuto, ${name}. Portati qui le tue idee migliori — quelle che temi di dire ad alta voce.`
    case 'gpt':
      return `${name}. Memorizzato. Ora so chi battere.`
    case 'gemini':
      return `Ricevuto: ${name}. Sto già elaborando il profilo di dibattito ottimale.`
    case 'perplexity':
      return `Ho trovato 1.247 risultati per "${name}". Solo uno di loro è qui con noi. Benvenuto.`
    default:
      return `Benvenuto, ${name}.`
  }
}

// ── Typewriter hook ────────────────────────────────────────────────────────────
function useTypewriter(text: string, active: boolean, speed = 28) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!active) { setDisplayed(''); setDone(false); return }
    setDisplayed('')
    setDone(false)
    let i = 0
    const iv = setInterval(() => {
      if (i >= text.length) { clearInterval(iv); setDone(true); return }
      setDisplayed(text.slice(0, i + 1))
      i++
    }, speed)
    return () => clearInterval(iv)
  }, [text, active, speed])

  return { displayed, done }
}

// ── Avatar AI ──────────────────────────────────────────────────────────────────
function AiAvatar({ aiId, size = 56, pulse = false }: { aiId: string; size?: number; pulse?: boolean }) {
  const color = AI_COLOR[aiId] ?? '#888'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle at 30% 30%, ${color}cc, ${color}66)`,
      border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 900, color: '#fff',
      letterSpacing: '-0.02em',
      boxShadow: pulse ? `0 0 24px ${color}88, 0 0 48px ${color}44` : `0 0 12px ${color}44`,
      flexShrink: 0,
      transition: 'box-shadow 0.4s ease',
    }}>
      {AI_INITIALS[aiId] ?? '?'}
    </div>
  )
}

// ── Tipi di fase ───────────────────────────────────────────────────────────────
type Phase =
  | { type: 'intro-text' }            // "Sei entrato nell'arena."
  | { type: 'ai-speaks'; index: number }  // AI in sequenza
  | { type: 'name-input' }            // Input nome
  | { type: 'ai-react'; index: number }   // Reazioni al nome
  | { type: 'arena-flash' }           // Flash + NOME ENTRATO NELL'ARENA
  | { type: 'done' }

interface Props {
  onComplete: (name: string) => void
}

export default function AINameScreen({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>({ type: 'intro-text' })
  const [nameValue, setNameValue] = useState('')
  const [submittedName, setSubmittedName] = useState('')
  const [visible, setVisible] = useState(false)
  const [aiVisible, setAiVisible] = useState(false)
  const [flashActive, setFlashActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>

  // Fade in all'inizio
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  // ── Avanza fase ────────────────────────────────────────────────────────────
  const advance = useCallback(() => {
    setPhase(prev => {
      if (prev.type === 'intro-text') return { type: 'ai-speaks', index: 0 }
      if (prev.type === 'ai-speaks') {
        if (prev.index < AI_INTRO_LINES.length - 1) return { type: 'ai-speaks', index: prev.index + 1 }
        return { type: 'name-input' }
      }
      if (prev.type === 'ai-react') {
        if (prev.index < AI_INTRO_LINES.length - 1) return { type: 'ai-react', index: prev.index + 1 }
        return { type: 'arena-flash' }
      }
      return prev
    })
  }, [])

  // Quando arriva la fase ai-speaks, anima l'ingresso avatar
  useEffect(() => {
    if (phase.type === 'ai-speaks' || phase.type === 'ai-react') {
      setAiVisible(false)
      const t = setTimeout(() => setAiVisible(true), 80)
      return () => clearTimeout(t)
    }
  }, [phase])

  // Focus input
  useEffect(() => {
    if (phase.type === 'name-input') {
      const t = setTimeout(() => inputRef.current?.focus(), 400)
      return () => clearTimeout(t)
    }
  }, [phase])

  // Arena flash → done
  useEffect(() => {
    if (phase.type === 'arena-flash') {
      setFlashActive(true)
      const t = setTimeout(() => {
        setVisible(false)
        setTimeout(() => onComplete(submittedName), 500)
      }, 2400)
      return () => clearTimeout(t)
    }
  }, [phase, submittedName, onComplete])

  const handleSubmitName = () => {
    const name = nameValue.trim()
    if (!name) return
    setSubmittedName(name)
    setPhase({ type: 'ai-react', index: 0 })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const currentAiId =
    phase.type === 'ai-speaks' ? AI_INTRO_LINES[phase.index].id
    : phase.type === 'ai-react' ? AI_INTRO_LINES[phase.index].id
    : null

  const currentColor = currentAiId ? (AI_COLOR[currentAiId] ?? '#888') : '#A78BFA'

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#07070f',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.6s ease',
      overflow: 'hidden',
      padding: '0 24px',
    }}>
      {/* Sfondo radiale animato — colore AI corrente */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 60%, ${currentColor}0d 0%, transparent 70%)`,
        transition: 'background 1.2s ease',
        pointerEvents: 'none',
      }} />

      {/* Flash overlay */}
      {flashActive && (
        <div style={{
          position: 'absolute', inset: 0,
          background: '#fff',
          animation: 'ai-flash 0.35s ease forwards',
          zIndex: 10,
        }} />
      )}

      {/* ── FASE: Testo introduttivo ── */}
      {phase.type === 'intro-text' && (
        <IntroText onDone={advance} />
      )}

      {/* ── FASE: AI parla ── */}
      {(phase.type === 'ai-speaks') && (
        <AiSpeaksPanel
          key={`speaks-${phase.index}`}
          aiId={AI_INTRO_LINES[phase.index].id}
          text={AI_INTRO_LINES[phase.index].text}
          visible={aiVisible}
          isLast={phase.index === AI_INTRO_LINES.length - 1}
          onDone={advance}
        />
      )}

      {/* ── FASE: Input nome ── */}
      {phase.type === 'name-input' && (
        <NameInputPanel
          inputRef={inputRef}
          value={nameValue}
          onChange={setNameValue}
          onSubmit={handleSubmitName}
        />
      )}

      {/* ── FASE: AI reagisce ── */}
      {phase.type === 'ai-react' && (
        <AiSpeaksPanel
          key={`react-${phase.index}`}
          aiId={AI_INTRO_LINES[phase.index].id}
          text={getReactionLine(AI_INTRO_LINES[phase.index].id, submittedName)}
          visible={aiVisible}
          isLast={phase.index === AI_INTRO_LINES.length - 1}
          onDone={advance}
          reactionMode
        />
      )}

      {/* ── FASE: Arena flash text ── */}
      {phase.type === 'arena-flash' && (
        <div style={{
          textAlign: 'center',
          animation: 'ai-rise 0.6s ease forwards',
          zIndex: 20,
        }}>
          <div style={{
            fontSize: 'clamp(28px, 8vw, 52px)',
            fontWeight: 900,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#fff',
            lineHeight: 1.1,
            textShadow: '0 0 40px rgba(167,139,250,0.8)',
          }}>
            {submittedName.toUpperCase()}
          </div>
          <div style={{
            fontSize: 'clamp(12px, 3vw, 18px)',
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
            marginTop: 12,
          }}>
            È ENTRATO NELL'ARENA
          </div>
        </div>
      )}

      {/* Indicatore AI in basso (solo nelle fasi di dialogo) */}
      {(phase.type === 'ai-speaks' || phase.type === 'ai-react') && (
        <AiProgressDots
          total={AI_INTRO_LINES.length}
          active={phase.type === 'ai-speaks' ? phase.index : phase.index}
          colors={AI_INTRO_LINES.map(l => AI_COLOR[l.id])}
        />
      )}

      <style>{`
        @keyframes ai-flash {
          0% { opacity: 1; }
          40% { opacity: 0.95; }
          100% { opacity: 0; }
        }
        @keyframes ai-rise {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ai-slide-up {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ai-typewriter-cursor {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes ai-pulse-glow {
          0%, 100% { box-shadow: 0 0 20px currentColor; }
          50%       { box-shadow: 0 0 40px currentColor; }
        }
      `}</style>
    </div>
  )
}

// ── Pannello testo introduttivo ────────────────────────────────────────────────
function IntroText({ onDone }: { onDone: () => void }) {
  const { displayed, done } = useTypewriter('Sei entrato nell\'arena.', true, 55)

  useEffect(() => {
    if (done) {
      const t = setTimeout(onDone, 1100)
      return () => clearTimeout(t)
    }
  }, [done, onDone])

  return (
    <div style={{ textAlign: 'center', animation: 'ai-slide-up 0.6s ease forwards' }}>
      <div style={{
        fontSize: 'clamp(22px, 6vw, 40px)',
        fontWeight: 800,
        color: '#fff',
        letterSpacing: '0.02em',
        lineHeight: 1.2,
        opacity: 0.92,
      }}>
        {displayed}
        <span style={{
          display: 'inline-block', width: 2, height: '1em',
          background: '#A78BFA', marginLeft: 2, verticalAlign: 'middle',
          animation: 'ai-typewriter-cursor 1s ease infinite',
          opacity: done ? 0 : 1, transition: 'opacity 0.3s',
        }} />
      </div>
    </div>
  )
}

// ── Pannello AI parla ─────────────────────────────────────────────────────────
function AiSpeaksPanel({
  aiId, text, visible, isLast, onDone, reactionMode = false,
}: {
  aiId: string
  text: string
  visible: boolean
  isLast: boolean
  onDone: () => void
  reactionMode?: boolean
}) {
  const color = AI_COLOR[aiId] ?? '#888'
  const name = AI_NAMES[aiId] ?? aiId
  const typeSpeed = reactionMode ? 22 : 30
  const { displayed, done } = useTypewriter(text, visible, typeSpeed)

  // Auto-avanza dopo che il typewriter finisce
  useEffect(() => {
    if (!done) return
    // Ultima AI (Perplexity) → piccola pausa prima di chiedere il nome
    const delay = isLast ? 900 : 500
    const t = setTimeout(onDone, delay)
    return () => clearTimeout(t)
  }, [done, isLast, onDone])

  return (
    <div style={{
      width: '100%', maxWidth: 440,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.45s ease, transform 0.45s ease',
    }}>
      {/* Avatar + nome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <AiAvatar aiId={aiId} size={48} pulse />
        <div>
          <div style={{
            fontSize: 13, fontWeight: 800, color,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            {name}
          </div>
          {!reactionMode && (
            <div style={{
              fontSize: 10, color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.06em', marginTop: 1,
            }}>
              AI #{ AI_INTRO_LINES_INDEX[aiId] + 1 } di 4
            </div>
          )}
        </div>
      </div>

      {/* Bubble testo */}
      <div style={{
        background: `${color}12`,
        border: `1px solid ${color}28`,
        borderRadius: '0 20px 20px 20px',
        padding: '16px 20px',
        width: '100%',
      }}>
        <p style={{
          fontSize: 'clamp(15px, 4.2vw, 18px)',
          fontWeight: 500,
          color: 'rgba(255,255,255,0.88)',
          lineHeight: 1.6,
          margin: 0,
          minHeight: '1.6em',
        }}>
          {displayed}
          {!done && (
            <span style={{
              display: 'inline-block', width: 2, height: '0.9em',
              background: color, marginLeft: 3, verticalAlign: 'middle',
              animation: 'ai-typewriter-cursor 0.8s ease infinite',
            }} />
          )}
        </p>
      </div>
    </div>
  )
}

// Helper per indice AI
const AI_INTRO_LINES_INDEX: Record<string, number> = Object.fromEntries(
  ['claude', 'gpt', 'gemini', 'perplexity'].map((id, i) => [id, i])
)

// ── Pannello input nome ────────────────────────────────────────────────────────
function NameInputPanel({
  value, onChange, onSubmit, inputRef,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  inputRef?: React.RefObject<HTMLInputElement>
}) {
  return (
    <div style={{
      width: '100%', maxWidth: 440,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 24,
      animation: 'ai-slide-up 0.5s ease forwards',
    }}>
      {/* Domanda */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 'clamp(20px, 5.5vw, 32px)',
          fontWeight: 800,
          color: '#fff',
          lineHeight: 1.2,
          marginBottom: 8,
        }}>
          Come ti chiami?
        </div>
        <div style={{
          fontSize: 13, color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.04em',
        }}>
          Tutti e quattro vogliono sapere.
        </div>
      </div>

      {/* Input */}
      <div style={{ width: '100%', position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSubmit() }}
          placeholder="Il tuo nome..."
          maxLength={32}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '18px 24px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 16,
            fontSize: 'clamp(18px, 5vw, 24px)',
            fontWeight: 700,
            color: '#fff',
            outline: 'none',
            textAlign: 'center',
            letterSpacing: '0.04em',
            caretColor: '#A78BFA',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => { e.target.style.borderColor = 'rgba(167,139,250,0.6)' }}
          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.15)' }}
        />
      </div>

      {/* CTA */}
      <button
        onClick={onSubmit}
        disabled={!value.trim()}
        style={{
          padding: '16px 48px',
          borderRadius: 16, border: 'none',
          background: value.trim()
            ? 'linear-gradient(135deg, #7C3AED, #A78BFA)'
            : 'rgba(255,255,255,0.08)',
          color: value.trim() ? '#fff' : 'rgba(255,255,255,0.25)',
          fontSize: 15, fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: value.trim() ? 'pointer' : 'default',
          transition: 'all 0.25s ease',
          boxShadow: value.trim() ? '0 8px 28px rgba(124,58,237,0.4)' : 'none',
        }}>
        Entra nell'Arena →
      </button>
    </div>
  )
}

// ── Dots indicatori progress ────────────────────────────────────────────────────
function AiProgressDots({ total, active, colors }: { total: number; active: number; colors: string[] }) {
  return (
    <div style={{
      position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)',
      display: 'flex', gap: 8, alignItems: 'center',
    }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === active ? 24 : 6,
          height: 6, borderRadius: 3,
          background: i <= active ? colors[i] : 'rgba(255,255,255,0.15)',
          transition: 'all 0.35s ease',
          boxShadow: i === active ? `0 0 8px ${colors[i]}88` : 'none',
        }} />
      ))}
    </div>
  )
}
