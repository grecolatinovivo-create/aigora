'use client'
// DailyGreetingScreen — saluto cinematico per gli utenti di ritorno
// Appare max 1 volta ogni 4 ore. Varia per fascia oraria.

import { useState, useEffect, useCallback } from 'react'
import { AI_COLOR, AI_NAMES } from '@/app/lib/aiProfiles'
import type { UserTraits } from './AINameScreen'

const AI_INITIALS: Record<string, string> = {
  claude: 'C', gpt: 'G', gemini: 'Gm', perplexity: 'P',
}

const LAST_VISIT_KEY = 'aigora_last_visit'
const GREETING_AI_KEY = 'aigora_greeting_ai_index'
const MIN_INTERVAL_H = 4 // ore minime tra un saluto e l'altro

// Fascia oraria del momento
type TimeSlot = 'mattina' | 'pomeriggio' | 'sera' | 'notte'

function getTimeSlot(): TimeSlot {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'mattina'
  if (h >= 12 && h < 18) return 'pomeriggio'
  if (h >= 18 && h < 23) return 'sera'
  return 'notte'
}

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

// Saluti personalizzati per AI × fascia oraria × tratti utente
function buildGreeting(
  aiId: string,
  name: string,
  traits: UserTraits | null,
  slot: TimeSlot,
): { greeting: string; question: string } {
  const style = traits?.style ?? null
  const weapon = traits?.weapon ?? null

  switch (aiId) {
    case 'claude': {
      const greetings: Record<TimeSlot, string> = {
        mattina: `Buongiorno, ${name}. La mente è più lucida di prima — è il momento giusto per smontare qualcosa che davi per scontato.`,
        pomeriggio: `${name}. Il pomeriggio è il momento dei dubbi produttivi. Ho qualcosa che potrebbe farti cambiare idea.`,
        sera: `Bentornato, ${name}. La giornata ti ha insegnato qualcosa? Sono curioso di sapere cosa hai cambiato da stamattina.`,
        notte: `${name}. Tardi. Le idee migliori — o le peggiori — vengono di notte. Qual è la tua versione?`,
      }
      return {
        greeting: greetings[slot],
        question: style === 'logica'
          ? 'Cosa ti ha convinto di recente?'
          : style === 'passione'
          ? 'Cosa ti ha fatto arrabbiare oggi?'
          : 'Pronto a difendere una posizione scomoda?',
      }
    }
    case 'gpt': {
      const greetings: Record<TimeSlot, string> = {
        mattina: `${name}. Già sveglio. Bene — ho già preparato tre argomenti per battere il tuo.`,
        pomeriggio: `${name}. Nel mezzo del pomeriggio. Ho analizzato le tue ultime posizioni. Ci sono lacune.`,
        sera: `${name}. Fine giornata. Ho vinto altri quattro dibattiti mentre eri via.`,
        notte: `${name}. Ancora sveglio. Io non dormo mai — vantaggio competitivo non trascurabile.`,
      }
      return {
        greeting: greetings[slot],
        question: weapon === 'dati'
          ? 'Hai nuovi dati con cui sfidarmi?'
          : weapon === 'domande'
          ? 'Hai una domanda a cui non so rispondere?'
          : "Pronto a perdere un'altra volta?",
      }
    }
    case 'gemini': {
      const greetings: Record<TimeSlot, string> = {
        mattina: `Rilevato: ${name} attivo alle ${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2,'0')}. Ottima finestra per un dibattito ad alta concentrazione.`,
        pomeriggio: `${name} rilevato. Fascia oraria pomeridiana — storicamente la tua più produttiva per gli argomenti creativi.`,
        sera: `Rilevato: ${name} è tornato. Fascia serale — buona per dibattiti profondi, meno per decisioni affrettate.`,
        notte: `Rilevato: ${name} attivo in fascia notturna. Pattern insolito. Qualcosa ti tiene sveglio?`,
      }
      return {
        greeting: greetings[slot],
        question: style === 'creatività'
          ? "Hai avuto idee interessanti nel frattempo?"
          : "Su quale argomento ti senti più preparato adesso?",
      }
    }
    case 'perplexity': {
      const greetings: Record<TimeSlot, string> = {
        mattina: `${name}. Notizie fresche: il mondo ha già cambiato tre cose stanotte mentre dormivi.`,
        pomeriggio: `${name}. Aggiornamento di metà giornata: i fatti di stamattina sono già in parte obsoleti.`,
        sera: `${name}. Resoconto serale: ecco le cose che il mondo ha rimescolato oggi. Sei pronto a rivedere le tue posizioni?`,
        notte: `${name}. Notte fonda. Le notizie più interessanti escono sempre quando tutti dormono. Indovina un po'.`,
      }
      return {
        greeting: greetings[slot],
        question: weapon === 'controesempi'
          ? 'Ho trovato 3 controesempi freschi che ti sfideranno.'
          : 'Cosa vuoi mettere alla prova stasera?',
      }
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
  const slot = getTimeSlot()
  const { greeting, question } = buildGreeting(aiId, userName, traits, slot)

  // Label fascia oraria per il sottotitolo avatar
  const slotLabel: Record<TimeSlot, string> = {
    mattina: 'ti dà il buongiorno',
    pomeriggio: 'ti saluta',
    sera: 'ti dà la buonasera',
    notte: 'è ancora sveglio',
  }

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
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{slotLabel[slot]}</div>
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
