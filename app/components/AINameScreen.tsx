'use client'
// AINameScreen — schermata cinematica di benvenuto post-FirstRun
// Sequenza: intro → 4 AI parlano (tap per avanzare) → input nome → reazioni AI → quick questions → flash arena

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { AI_NAMES, AI_COLOR } from '@/app/lib/aiProfiles'

// ── Configurazione AI ─────────────────────────────────────────────────────────
const AI_INITIALS: Record<string, string> = {
  claude: 'C', gpt: 'G', gemini: 'Gm', perplexity: 'P',
}

const AI_INTRO_LINES: { id: string; text: string }[] = [
  { id: 'claude',     text: 'Prima di iniziare... voglio sapere chi ho davanti. Come ti chiami?' },
  { id: 'gpt',        text: 'Io sono GPT. Anch\'io vorrei sapere il tuo nome. Non per essere gentile — per ricordarmelo quando vinco.' },
  { id: 'gemini',     text: 'Ho analizzato migliaia di dibattiti. Il fattore più interessante sei sempre tu. E tu... come ti chiami?' },
  { id: 'perplexity', text: 'Il. Tuo. Nome?' },
]

function getReactionLine(aiId: string, name: string): string {
  switch (aiId) {
    case 'claude':     return `Benvenuto, ${name}. Portati qui le tue idee migliori — quelle che temi di dire ad alta voce.`
    case 'gpt':        return `${name}. Memorizzato. Ora so chi battere.`
    case 'gemini':     return `Ricevuto: ${name}. Sto già elaborando il profilo di dibattito ottimale.`
    case 'perplexity': return `Ho trovato 1.247 risultati per "${name}". Solo uno di loro è qui con noi. Benvenuto.`
    default:           return `Benvenuto, ${name}.`
  }
}

// ── Quick questions ───────────────────────────────────────────────────────────
interface QuickQuestion {
  id: string
  question: string
  options: { label: string; value: string }[]
}

const QUICK_QUESTIONS: QuickQuestion[] = [
  {
    id: 'style',
    question: 'Come combatti nelle discussioni?',
    options: [
      { label: '🧠  Con la logica', value: 'logica' },
      { label: '🔥  Con la passione', value: 'passione' },
      { label: '😏  Con l\'ironia', value: 'ironia' },
      { label: '🎨  Con la creatività', value: 'creatività' },
    ],
  },
  {
    id: 'weapon',
    question: 'La tua arma preferita in un dibattito?',
    options: [
      { label: '📊  Dati e numeri', value: 'dati' },
      { label: '🔁  Controesempi', value: 'controesempi' },
      { label: '❓  Domande scomode', value: 'domande' },
      { label: '💥  Paradossi', value: 'paradossi' },
    ],
  },
  {
    id: 'weakness',
    question: 'Il tuo punto debole è...',
    options: [
      { label: '🌪️  Mi faccio prendere dall\'emozione', value: 'emozione' },
      { label: '🐢  Sono troppo lento/a a rispondere', value: 'lentezza' },
      { label: '🪞  Ascolto troppo gli altri', value: 'ascolto' },
      { label: '🎯  Vado troppo al punto senza sfumature', value: 'direttezza' },
    ],
  },
]

export interface UserTraits {
  name: string
  style: string
  weapon: string
  weakness: string
}

const LOCAL_KEY = 'aigora_user_traits'

export function loadUserTraits(): UserTraits | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveUserTraits(traits: Partial<UserTraits>) {
  if (typeof window === 'undefined') return
  const existing = loadUserTraits() ?? {}
  localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...existing, ...traits }))
}

// ── Typewriter hook ───────────────────────────────────────────────────────────
function useTypewriter(text: string, active: boolean, speed = 28) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const iRef = useRef(0)

  const completeNow = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setDisplayed(text)
    setDone(true)
  }, [text])

  useEffect(() => {
    if (!active) { setDisplayed(''); setDone(false); iRef.current = 0; return }
    setDisplayed('')
    setDone(false)
    iRef.current = 0
    intervalRef.current = setInterval(() => {
      iRef.current++
      if (iRef.current >= text.length) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setDisplayed(text)
        setDone(true)
      } else {
        setDisplayed(text.slice(0, iRef.current))
      }
    }, speed)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [text, active, speed])

  return { displayed, done, completeNow }
}

// ── Avatar AI ─────────────────────────────────────────────────────────────────
function AiAvatar({ aiId, size = 56 }: { aiId: string; size?: number }) {
  const color = AI_COLOR[aiId] ?? '#888'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle at 30% 30%, ${color}cc, ${color}66)`,
      border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 900, color: '#fff',
      boxShadow: `0 0 20px ${color}66, 0 0 48px ${color}33`,
      flexShrink: 0,
    }}>
      {AI_INITIALS[aiId] ?? '?'}
    </div>
  )
}

// ── Tipi fase ─────────────────────────────────────────────────────────────────
type Phase =
  | { type: 'intro-text' }
  | { type: 'ai-speaks'; index: number }
  | { type: 'name-input' }
  | { type: 'ai-react'; index: number }
  | { type: 'quick-q'; index: number }
  | { type: 'arena-flash' }

const AI_INTRO_INDEX: Record<string, number> = Object.fromEntries(
  ['claude', 'gpt', 'gemini', 'perplexity'].map((id, i) => [id, i])
)

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
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>

  // Fade in iniziale
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  // Anima avatar AI
  useEffect(() => {
    if (phase.type === 'ai-speaks' || phase.type === 'ai-react') {
      setAiVisible(false)
      const t = setTimeout(() => setAiVisible(true), 80)
      return () => clearTimeout(t)
    }
  }, [phase])

  // Focus sull'input nome
  useEffect(() => {
    if (phase.type === 'name-input') {
      const t = setTimeout(() => inputRef.current?.focus(), 400)
      return () => clearTimeout(t)
    }
  }, [phase])

  // Arena flash → complete
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

  const advance = useCallback(() => {
    setPhase(prev => {
      if (prev.type === 'intro-text') return { type: 'ai-speaks', index: 0 }
      if (prev.type === 'ai-speaks') {
        return prev.index < AI_INTRO_LINES.length - 1
          ? { type: 'ai-speaks', index: prev.index + 1 }
          : { type: 'name-input' }
      }
      if (prev.type === 'ai-react') {
        return prev.index < AI_INTRO_LINES.length - 1
          ? { type: 'ai-react', index: prev.index + 1 }
          : { type: 'quick-q', index: 0 }
      }
      if (prev.type === 'quick-q') {
        return prev.index < QUICK_QUESTIONS.length - 1
          ? { type: 'quick-q', index: prev.index + 1 }
          : { type: 'arena-flash' }
      }
      return prev
    })
  }, [])

  const handleSubmitName = () => {
    const name = nameValue.trim()
    if (!name) return
    setSubmittedName(name)
    saveUserTraits({ name })
    setPhase({ type: 'ai-react', index: 0 })
  }

  const handleSelectOption = (questionId: string, value: string) => {
    setSelectedOption(value)
    const newAnswers = { ...answers, [questionId]: value }
    setAnswers(newAnswers)
    saveUserTraits({ [questionId]: value } as Partial<UserTraits>)
    // Avanza dopo breve pausa
    setTimeout(() => {
      setSelectedOption(null)
      advance()
    }, 480)
  }

  // ── Colore sfondo dinamico ────────────────────────────────────────────────
  const currentAiId =
    phase.type === 'ai-speaks' ? AI_INTRO_LINES[phase.index].id
    : phase.type === 'ai-react' ? AI_INTRO_LINES[phase.index].id
    : null
  const currentColor = currentAiId ? (AI_COLOR[currentAiId] ?? '#888') : '#A78BFA'

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: '#07070f',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.6s ease',
        overflow: 'hidden',
        padding: '0 24px',
      }}
    >
      {/* Sfondo radiale dinamico */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 60%, ${currentColor}0e 0%, transparent 70%)`,
        transition: 'background 1.2s ease',
        pointerEvents: 'none',
      }} />

      {/* Flash bianco finale */}
      {flashActive && (
        <div style={{
          position: 'absolute', inset: 0,
          background: '#fff',
          animation: 'ai-flash 0.35s ease forwards',
          zIndex: 10,
        }} />
      )}

      {/* ── FASE: intro text ── */}
      {phase.type === 'intro-text' && (
        <IntroText onDone={advance} />
      )}

      {/* ── FASE: AI parla (tap per avanzare) ── */}
      {phase.type === 'ai-speaks' && (
        <AiSpeaksPanel
          key={`speaks-${phase.index}`}
          aiId={AI_INTRO_LINES[phase.index].id}
          text={AI_INTRO_LINES[phase.index].text}
          visible={aiVisible}
          index={phase.index}
          onAdvance={advance}
        />
      )}

      {/* ── FASE: input nome ── */}
      {phase.type === 'name-input' && (
        <NameInputPanel
          inputRef={inputRef}
          value={nameValue}
          onChange={setNameValue}
          onSubmit={handleSubmitName}
        />
      )}

      {/* ── FASE: AI reagisce (tap per avanzare) ── */}
      {phase.type === 'ai-react' && (
        <AiSpeaksPanel
          key={`react-${phase.index}`}
          aiId={AI_INTRO_LINES[phase.index].id}
          text={getReactionLine(AI_INTRO_LINES[phase.index].id, submittedName)}
          visible={aiVisible}
          index={phase.index}
          onAdvance={advance}
          reactionMode
        />
      )}

      {/* ── FASE: quick questions ── */}
      {phase.type === 'quick-q' && (
        <QuickQuestionPanel
          key={`q-${phase.index}`}
          question={QUICK_QUESTIONS[phase.index]}
          index={phase.index}
          total={QUICK_QUESTIONS.length}
          selectedOption={selectedOption}
          onSelect={handleSelectOption}
        />
      )}

      {/* ── FASE: arena flash ── */}
      {phase.type === 'arena-flash' && (
        <div style={{
          textAlign: 'center',
          animation: 'ai-rise 0.6s ease forwards',
          zIndex: 20,
        }}>
          <div style={{
            fontSize: 'clamp(28px, 8vw, 52px)',
            fontWeight: 900, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: '#fff',
            lineHeight: 1.1,
            textShadow: '0 0 40px rgba(167,139,250,0.8)',
          }}>
            {submittedName.toUpperCase()}
          </div>
          <div style={{
            fontSize: 'clamp(12px, 3vw, 18px)', fontWeight: 700,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)', marginTop: 12,
          }}>
            È ENTRATO NELL'ARENA
          </div>
        </div>
      )}

      {/* Progress dots (fasi di dialogo) */}
      {(phase.type === 'ai-speaks' || phase.type === 'ai-react') && (
        <AiProgressDots
          total={AI_INTRO_LINES.length}
          active={phase.type === 'ai-speaks' ? phase.index : phase.index}
          colors={AI_INTRO_LINES.map(l => AI_COLOR[l.id])}
        />
      )}

      <style>{`
        @keyframes ai-flash { 0% { opacity:1; } 100% { opacity:0; } }
        @keyframes ai-rise  { from { opacity:0; transform:translateY(20px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes ai-slide-up { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ai-cursor { 0%,100% { opacity:1; } 50% { opacity:0; } }
        @keyframes ai-option-in { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
      `}</style>
    </div>
  )
}

// ── Testo introduttivo ────────────────────────────────────────────────────────
function IntroText({ onDone }: { onDone: () => void }) {
  const { displayed, done, completeNow } = useTypewriter('Sei entrato nell\'arena.', true, 55)

  const handleTap = useCallback(() => {
    if (!done) { completeNow(); return }
    onDone()
  }, [done, completeNow, onDone])

  return (
    <div
      style={{ textAlign: 'center', animation: 'ai-slide-up 0.6s ease forwards', cursor: 'pointer', padding: '40px 0' }}
      onClick={handleTap}
    >
      <div style={{
        fontSize: 'clamp(22px, 6vw, 40px)', fontWeight: 800,
        color: '#fff', letterSpacing: '0.02em', lineHeight: 1.2, opacity: 0.92,
      }}>
        {displayed}
        <span style={{
          display: 'inline-block', width: 2, height: '1em',
          background: '#A78BFA', marginLeft: 2, verticalAlign: 'middle',
          animation: 'ai-cursor 1s ease infinite',
          opacity: done ? 0 : 1, transition: 'opacity 0.3s',
        }} />
      </div>
      {done && (
        <div style={{
          marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.25)',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          animation: 'ai-slide-up 0.4s ease forwards',
        }}>
          Tocca per continuare
        </div>
      )}
    </div>
  )
}

// ── AI parla (tap-to-advance) ─────────────────────────────────────────────────
function AiSpeaksPanel({
  aiId, text, visible, index, onAdvance, reactionMode = false,
}: {
  aiId: string; text: string; visible: boolean; index: number
  onAdvance: () => void; reactionMode?: boolean
}) {
  const color = AI_COLOR[aiId] ?? '#888'
  const name = AI_NAMES[aiId] ?? aiId
  const { displayed, done, completeNow } = useTypewriter(text, visible, reactionMode ? 22 : 30)

  const handleTap = useCallback(() => {
    if (!done) { completeNow(); return }
    onAdvance()
  }, [done, completeNow, onAdvance])

  return (
    <div
      onClick={handleTap}
      style={{
        width: '100%', maxWidth: 440,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.45s ease, transform 0.45s ease',
        cursor: 'pointer',
        padding: '8px 0',
      }}
    >
      {/* Avatar + nome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <AiAvatar aiId={aiId} size={48} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {name}
          </div>
          {!reactionMode && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', marginTop: 1 }}>
              AI #{AI_INTRO_INDEX[aiId] + 1} di 4
            </div>
          )}
        </div>
      </div>

      {/* Bubble */}
      <div style={{
        background: `${color}12`, border: `1px solid ${color}28`,
        borderRadius: '0 20px 20px 20px', padding: '16px 20px', width: '100%',
      }}>
        <p style={{
          fontSize: 'clamp(15px, 4.2vw, 18px)', fontWeight: 500,
          color: 'rgba(255,255,255,0.88)', lineHeight: 1.6,
          margin: 0, minHeight: '1.6em',
        }}>
          {displayed}
          {!done && (
            <span style={{
              display: 'inline-block', width: 2, height: '0.9em',
              background: color, marginLeft: 3, verticalAlign: 'middle',
              animation: 'ai-cursor 0.8s ease infinite',
            }} />
          )}
        </p>
      </div>

      {/* Hint tap */}
      {done && (
        <div style={{
          alignSelf: 'flex-end',
          fontSize: 10, color: 'rgba(255,255,255,0.22)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          animation: 'ai-slide-up 0.3s ease forwards',
        }}>
          Tocca per continuare →
        </div>
      )}
    </div>
  )
}

// ── Input nome ────────────────────────────────────────────────────────────────
function NameInputPanel({
  value, onChange, onSubmit, inputRef,
}: {
  value: string; onChange: (v: string) => void
  onSubmit: () => void; inputRef?: React.RefObject<HTMLInputElement>
}) {
  return (
    <div style={{
      width: '100%', maxWidth: 440,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
      animation: 'ai-slide-up 0.5s ease forwards',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 'clamp(20px, 5.5vw, 32px)', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 8 }}>
          Come ti chiami?
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>
          Tutti e quattro vogliono sapere.
        </div>
      </div>

      <div style={{ width: '100%' }}>
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
            borderRadius: 16, fontSize: 'clamp(18px, 5vw, 24px)',
            fontWeight: 700, color: '#fff', outline: 'none',
            textAlign: 'center', letterSpacing: '0.04em',
            caretColor: '#A78BFA',
          }}
          onFocus={e => { e.target.style.borderColor = 'rgba(167,139,250,0.6)' }}
          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.15)' }}
        />
      </div>

      <button
        onClick={onSubmit}
        disabled={!value.trim()}
        style={{
          padding: '16px 48px', borderRadius: 16, border: 'none',
          background: value.trim() ? 'linear-gradient(135deg, #7C3AED, #A78BFA)' : 'rgba(255,255,255,0.08)',
          color: value.trim() ? '#fff' : 'rgba(255,255,255,0.25)',
          fontSize: 15, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
          cursor: value.trim() ? 'pointer' : 'default',
          transition: 'all 0.25s ease',
          boxShadow: value.trim() ? '0 8px 28px rgba(124,58,237,0.4)' : 'none',
        }}>
        Entra nell'Arena →
      </button>
    </div>
  )
}

// ── Quick question ────────────────────────────────────────────────────────────
function QuickQuestionPanel({
  question, index, total, selectedOption, onSelect,
}: {
  question: QuickQuestion; index: number; total: number
  selectedOption: string | null
  onSelect: (questionId: string, value: string) => void
}) {
  return (
    <div style={{
      width: '100%', maxWidth: 420,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
      animation: 'ai-slide-up 0.45s ease forwards',
    }}>
      {/* Progress */}
      <div style={{ display: 'flex', gap: 6 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            width: i === index ? 20 : 6, height: 6, borderRadius: 3,
            background: i < index ? '#A78BFA' : i === index ? '#A78BFA' : 'rgba(255,255,255,0.15)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>

      {/* Domanda */}
      <div style={{
        fontSize: 'clamp(17px, 4.8vw, 24px)', fontWeight: 800,
        color: '#fff', textAlign: 'center', lineHeight: 1.3,
      }}>
        {question.question}
      </div>

      {/* Opzioni */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {question.options.map((opt, i) => {
          const isSelected = selectedOption === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(question.id, opt.value)}
              disabled={selectedOption !== null}
              style={{
                padding: '14px 20px', borderRadius: 14,
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(167,139,250,0.3), rgba(167,139,250,0.15))'
                  : 'rgba(255,255,255,0.06)',
                color: isSelected ? '#fff' : 'rgba(255,255,255,0.75)',
                fontSize: 14, fontWeight: 600, textAlign: 'left',
                cursor: selectedOption !== null ? 'default' : 'pointer',
                border: isSelected ? '1px solid rgba(167,139,250,0.5)' : '1px solid rgba(255,255,255,0.08)',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 0.2s ease',
                animation: `ai-option-in 0.3s ease ${i * 70}ms both`,
              }}>
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Progress dots ─────────────────────────────────────────────────────────────
function AiProgressDots({ total, active, colors }: { total: number; active: number; colors: string[] }) {
  return (
    <div style={{
      position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)',
      display: 'flex', gap: 8, alignItems: 'center',
    }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === active ? 24 : 6, height: 6, borderRadius: 3,
          background: i <= active ? colors[i] : 'rgba(255,255,255,0.15)',
          transition: 'all 0.35s ease',
          boxShadow: i === active ? `0 0 8px ${colors[i]}88` : 'none',
        }} />
      ))}
    </div>
  )
}
