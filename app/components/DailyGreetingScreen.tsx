'use client'
// DailyGreetingScreen — saluto cinematico per gli utenti di ritorno
// Appare max 1 volta ogni 8 ore. Breve, emotivo, personalizzato.

import { useState, useEffect, useCallback } from 'react'
import { AI_COLOR, AI_NAMES } from '@/app/lib/aiProfiles'
import type { UserTraits } from './AINameScreen'

const AI_INITIALS: Record<string, string> = {
  claude: 'C', gpt: 'G', gemini: 'Gm', perplexity: 'P',
}

const LAST_VISIT_KEY = 'aigora_last_visit'
const GREETING_AI_KEY = 'aigora_greeting_ai_index'
const MIN_INTERVAL_H = 8 // ore minime tra un saluto e l'altro

export function shouldShowDailyGreeting(): boolean {
  if (typeof window === 'undefined') return false
  const raw = localStorage.getItem(LAST_VISIT_KEY)
  if (!raw) return true
  const last = parseInt(raw, 10)
  if (isNaN(last)) return true
  return Date.now() - last > MIN_INTERVAL_H * 3600 * 1000
}

export function markGreetingShown() {
  if (typeof window === 'undefined') return
  localStorage.setItem(LAST_VISIT_KEY, String(Date.now()))
}

// Ruota gli AI: 0→claude, 1→gpt, 2→gemini, 3→perplexity
function pickGreetingAi(): string {
  const ORDER = ['claude', 'gpt', 'gemini', 'perplexity']
  if (typeof window === 'undefined') return 'claude'
  const raw = localStorage.getItem(GREETING_AI_KEY)
  const idx = raw ? (parseInt(raw, 10) + 1) % ORDER.length : 0
  localStorage.setItem(GREETING_AI_KEY, String(idx))
  return ORDER[idx]
}

// Saluti personalizzati per ogni AI, tenant del tratto utente
function buildGreeting(aiId: string, name: string, traits: UserTraits | null): { greeting: string; question: string } {
  const style = traits?.style ?? null
  const weapon = traits?.weapon ?? null

  switch (aiId) {
    case 'claude':
      return {
        greeting: `Bentornato, ${name}. Ho pensato a te mentre ero fermo — volevo sapere: hai cambiato idea su qualcosa ultimamente?`,
        question: style === 'logica'
          ? 'Cosa ti ha convinto di recente?'
          : style === 'passione'
          ? 'Cosa ti ha fatto arrabbiare ultimamente?'
          : 'Pronto a difendere una posizione scomoda oggi?',
      }
    case 'gpt':
      return {
        greeting: `${name}. Eri sparito. Ho vinto quattro dibattiti nel frattempo.`,
        question: weapon === 'dati'
          ? 'Hai nuovi dati con cui sfidarmi?'
          : weapon === 'domande'
          ? 'Hai una domanda a cui non so rispondere?'
          : "Pronto a perdere un'altra volta?",
      }
    case 'gemini':
      return {
        greeting: `Rilevato: ${name} è tornato. Ho aggiornato il tuo profilo di dibattito con le ultime sessioni.`,
        question: style === 'creatività'
          ? "Hai avuto idee interessanti dall'ultima volta?"
          : "Qual è l'argomento su cui ti senti più preparato oggi?",
      }
    case 'perplexity':
      return {
        greeting: `${name}. Ultime notizie: il mondo è cambiato dall'ultima volta che sei stato qui.`,
        question: weapon === 'controesempi'
          ? 'Ho trovato 3 controesempi che ti sfideranno.'
          : 'Cosa vuoi mettere alla prova oggi?',
      }
    default:
      return {
        greeting: `Bentornato, ${name}!`,
        question: 'Pronto a iniziare?',
      }
  }
}

interface Props {
  userName: string
  traits: UserTraits | null
  onDone: () => void
}

export default function DailyGreetingScreen({ userName, traits, onDone }: Props) {
  const [aiId] = useState(() => pickGreetingAi())
  const [visible, setVisible] = useState(false)
  const [textVisible, setTextVisible] = useState(false)
  const [phase, setPhase] = useState<'greeting' | 'question' | 'out'>('greeting')
  const [displayedGreeting, setDisplayedGreeting] = useState('')
  const [greetingDone, setGreetingDone] = useState(false)

  const color = AI_COLOR[aiId] ?? '#888'
  const name = AI_NAMES[aiId] ?? aiId
  const { greeting, question } = buildGreeting(aiId, userName, traits)

  // Fade in
  useEffect(() => {
    markGreetingShown()
    const t1 = setTimeout(() => setVisible(true), 80)
    const t2 = setTimeout(() => setTextVisible(true), 400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Typewriter per il saluto
  useEffect(() => {
    if (!textVisible) return
    let i = 0
    setDisplayedGreeting('')
    const iv = setInterval(() => {
      if (i >= greeting.length) { clearInterval(iv); setGreetingDone(true); return }
      setDisplayedGreeting(greeting.slice(0, i + 1))
      i++
    }, 24)
    return () => clearInterval(iv)
  }, [textVisible, greeting])

  // Dopo che il saluto è completo, aspetta 1.2s poi mostra la domanda
  useEffect(() => {
    if (!greetingDone) return
    const t = setTimeout(() => setPhase('question'), 1200)
    return () => clearTimeout(t)
  }, [greetingDone])

  const handleDismiss = useCallback(() => {
    setPhase('out')
    setVisible(false)
    setTimeout(onDone, 500)
  }, [onDone])

  // Auto-dismiss dopo 6s dalla domanda
  useEffect(() => {
    if (phase !== 'question') return
    const t = setTimeout(handleDismiss, 6000)
    return () => clearTimeout(t)
  }, [phase, handleDismiss])

  return (
    <div
      onClick={handleDismiss}
      style={{
        position: 'fixed', inset: 0,
        background: '#07070f',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 9998,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease',
        cursor: 'pointer',
        padding: '32px 28px',
      }}
    >
      {/* Sfondo radiale */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 55%, ${color}0c 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%', maxWidth: 400,
        opacity: textVisible ? 1 : 0,
        transform: textVisible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}>
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
              {name}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>ti saluta</div>
          </div>
        </div>

        {/* Bubble saluto */}
        <div style={{
          background: `${color}10`, border: `1px solid ${color}25`,
          borderRadius: '0 20px 20px 20px',
          padding: '18px 22px', marginBottom: 16,
        }}>
          <p style={{
            fontSize: 'clamp(14px, 4vw, 17px)', fontWeight: 500,
            color: 'rgba(255,255,255,0.88)', lineHeight: 1.65, margin: 0,
          }}>
            {displayedGreeting}
            {!greetingDone && (
              <span style={{
                display: 'inline-block', width: 2, height: '0.9em',
                background: color, marginLeft: 3, verticalAlign: 'middle',
                animation: 'dg-cursor 0.8s ease infinite',
              }} />
            )}
          </p>
        </div>

        {/* Domanda (appare dopo) */}
        {phase === 'question' && (
          <div style={{
            padding: '14px 18px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            animation: 'dg-fade-in 0.4s ease forwards',
          }}>
            <p style={{
              fontSize: 'clamp(13px, 3.6vw, 15px)', fontWeight: 600,
              color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, margin: 0,
              fontStyle: 'italic',
            }}>
              {question}
            </p>
          </div>
        )}

        {/* Hint */}
        <div style={{
          textAlign: 'center', marginTop: 28,
          fontSize: 10, color: 'rgba(255,255,255,0.18)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          Tocca per entrare →
        </div>
      </div>

      <style>{`
        @keyframes dg-cursor { 0%,100% { opacity:1; } 50% { opacity:0; } }
        @keyframes dg-fade-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  )
}
