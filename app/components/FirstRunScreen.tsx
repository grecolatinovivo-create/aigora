'use client'
// FirstRunScreen — prima apertura assoluta
// Chi non ha mai usato AiGORÀ non vede un menù.
// Vede una battaglia in corso. Poi sceglie se lanciarsi.

import { useState, useEffect, useRef } from 'react'

// ── Dibattito demo — fisso, sempre uguale, sempre compelling ──────────────────
const DEMO_TOPIC = "L'intelligenza artificiale ti ruberà il lavoro?"

const DEMO_MESSAGES = [
  {
    id: 'claude',
    name: 'Claude',
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.08)',
    border: 'rgba(167,139,250,0.18)',
    text: "No — ti trasformerà. Il lavoro creativo, il giudizio umano, la relazione emotiva: queste cose non si automatizzano. Chi saprà usare l'AI varrà dieci volte di più.",
  },
  {
    id: 'gpt',
    name: 'GPT',
    color: '#10A37F',
    bg: 'rgba(16,163,127,0.08)',
    border: 'rgba(16,163,127,0.18)',
    text: 'Ti ha già rubato alcune cose. Il traduttore, l\'analista dati, lo screener di CV. La domanda vera non è "se" ma "a quale velocità" — e se sei pronto.',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    color: '#38BDF8',
    bg: 'rgba(56,189,248,0.08)',
    border: 'rgba(56,189,248,0.18)',
    text: "Il problema non è il furto — è la distribuzione. L'AI aumenta la produttività del 40%, ma chi cattura quel valore? Non i lavoratori. Mai i lavoratori.",
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    color: '#F97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.18)',
    text: "La storia è chiara: ogni automazione distrugge lavori e ne crea di nuovi. Il problema è la transizione — brutale per chi non ce la fa, invisibile per chi guarda dall'alto.",
  },
]

// Contatore seeded sull'ora — sembra live, è deterministico
function getLiveCount(): string {
  const h = new Date().getHours()
  const n = 1100 + ((h * 137 + 29) % 2200)
  return n.toLocaleString('it-IT')
}

// ── Schermata input domanda ────────────────────────────────────────────────────
function QuestionInputScreen({
  initialQuestion,
  onStart,
  onBack,
}: {
  initialQuestion: string
  onStart: (q: string) => void
  onBack: () => void
}) {
  const [q, setQ] = useState(initialQuestion)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setTimeout(() => ref.current?.focus(), 80)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: '#07070f',
      display: 'flex', flexDirection: 'column',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'calc(var(--bottom-nav-height, 0px) + env(safe-area-inset-bottom, 0px))',
    }}>
      {/* Header */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 20px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <button onClick={onBack} style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(167,139,250,0.7)' }}>
          La tua domanda
        </span>
      </div>

      {/* Textarea */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 20px 16px', gap: 16 }}>
        <textarea
          ref={ref}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Di cosa vuoi che le AI dibattano?"
          style={{
            flex: 1, width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(167,139,250,0.22)',
            borderRadius: 18, padding: '18px',
            fontSize: 18, fontWeight: 700, color: '#fff',
            resize: 'none', outline: 'none', lineHeight: 1.5,
          }}
        />
        <button
          onClick={() => { if (q.trim()) onStart(q.trim()) }}
          disabled={!q.trim()}
          style={{
            padding: '17px', borderRadius: 16, border: 'none',
            fontSize: 16, fontWeight: 900, color: '#fff',
            background: q.trim() ? 'linear-gradient(135deg,#7C3AED,#5B21B6)' : 'rgba(255,255,255,0.07)',
            boxShadow: q.trim() ? '0 4px 28px rgba(124,58,237,0.45)' : 'none',
            cursor: q.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}>
          Entra nell'arena →
        </button>
      </div>
    </div>
  )
}

// ── Componente principale ─────────────────────────────────────────────────────
export default function FirstRunScreen({
  onStart,
}: {
  onStart: (question: string) => void
}) {
  const [visible, setVisible] = useState(0)   // quanti messaggi demo sono visibili
  const [phase, setPhase] = useState<'arena' | 'input' | 'limits'>('arena')
  const [inputQ, setInputQ] = useState('')
  const count = getLiveCount()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-play: ogni messaggio appare con un ritardo
  useEffect(() => {
    if (visible >= DEMO_MESSAGES.length) return
    const delay = visible === 0 ? 900 : 2100
    const t = setTimeout(() => setVisible(v => v + 1), delay)
    return () => clearTimeout(t)
  }, [visible])

  // Scroll giù quando appare un nuovo messaggio
  useEffect(() => {
    if (visible > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      }, 80)
    }
  }, [visible])

  // Schermata input
  if (phase === 'input') {
    return (
      <QuestionInputScreen
        initialQuestion={inputQ}
        onStart={(q) => { setInputQ(q); setPhase('limits') }}
        onBack={() => setPhase('arena')}
      />
    )
  }

  // Schermata limiti Free — ultimo step prima di entrare nell'app
  if (phase === 'limits') {
    const PERKS_FREE = [
      { icon: '∞', text: 'Dibattiti Arena illimitati' },
      { icon: '⚡', text: '2v2 gratuito — sfida con un amico' },
      { icon: '📅', text: 'Nessuna scadenza, nessuna carta richiesta' },
    ]
    const PERKS_PRO = [
      { icon: '🔥', text: "Devil's Advocate — argomenta sotto pressione" },
      { icon: '💡', text: 'Brainstormer — 4 AI in parallelo per le tue idee' },
      { icon: '🤖', text: 'Grok disponibile in 2v2 e Brainstormer' },
    ]
    return (
      <div style={{
        position: 'fixed', inset: 0, backgroundColor: '#07070f',
        display: 'flex', flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '5%', left: '50%', transform: 'translateX(-50%)',
          width: 400, height: 400,
          background: 'radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px 0', display: 'flex', flexDirection: 'column' }}>
          {/* Badge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{
              fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase',
              color: 'rgba(167,139,250,0.7)',
              background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.18)',
              padding: '4px 12px', borderRadius: 999,
            }}>
              Sei dentro. Gratis.
            </div>
          </div>

          <h2 style={{ fontSize: 26, fontWeight: 900, color: '#fff', textAlign: 'center', lineHeight: 1.2, marginBottom: 8 }}>
            Il tuo piano Free
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 28, lineHeight: 1.5 }}>
            Inizia subito, senza carta di credito.{'\n'}Aggiorna quando vuoi.
          </p>

          {/* Free perks */}
          <div style={{
            background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)',
            borderRadius: 18, padding: '16px 18px', marginBottom: 12,
          }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(167,139,250,0.6)', marginBottom: 12 }}>
              ✓ Incluso nel Free
            </div>
            {PERKS_FREE.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: i < PERKS_FREE.length - 1 ? 10 : 0 }}>
                <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{p.icon}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{p.text}</span>
              </div>
            ))}
          </div>

          {/* Pro teaser */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 18, padding: '16px 18px', marginBottom: 24, opacity: 0.7,
          }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>
              🔒 Solo Pro
            </div>
            {PERKS_PRO.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: i < PERKS_PRO.length - 1 ? 10 : 0 }}>
                <span style={{ fontSize: 16, width: 22, textAlign: 'center', filter: 'grayscale(1)', opacity: 0.5 }}>{p.icon}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>{p.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{
          flexShrink: 0, padding: '14px 24px 20px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(7,7,15,0.96)',
        }}>
          <button
            onClick={() => onStart(inputQ || DEMO_TOPIC)}
            style={{
              width: '100%', padding: '16px', borderRadius: 16, border: 'none',
              fontSize: 15, fontWeight: 900, color: '#fff',
              background: 'linear-gradient(135deg,#7C3AED,#5B21B6)',
              boxShadow: '0 4px 28px rgba(124,58,237,0.42)',
              cursor: 'pointer', marginBottom: 8,
            }}>
            Entra nell'arena →
          </button>
          <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.22)', margin: 0 }}>
            Nessun costo. Nessuna carta. Mai.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: '#07070f',
      display: 'flex', flexDirection: 'column',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'calc(var(--bottom-nav-height, 0px) + env(safe-area-inset-bottom, 0px))',
      overflow: 'hidden',
    }}>

      {/* Glow di sfondo */}
      <div style={{
        position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
        width: 500, height: 500,
        background: 'radial-gradient(ellipse, rgba(124,58,237,0.10) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo — piccolo, non invadente */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        paddingTop: 18, paddingBottom: 4,
      }}>
        <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.02em' }}>
          <span style={{ color: '#fff' }}>Ai</span>
          <span style={{ color: '#fff' }}>GORÀ</span>
        </span>
      </div>

      {/* Scroll area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          display: 'flex', flexDirection: 'column',
          padding: '12px 20px 20px',
        }}>

        {/* Domanda hero */}
        <div style={{ paddingBottom: 20, paddingTop: 8 }}>
          <div style={{
            fontSize: 11, fontWeight: 900, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: 'rgba(167,139,250,0.55)',
            marginBottom: 12,
          }}>
            Arena · In corso adesso
          </div>
          <div style={{
            fontSize: 27, fontWeight: 900, color: '#fff',
            lineHeight: 1.2, letterSpacing: '-0.02em',
          }}>
            {DEMO_TOPIC}
          </div>
          <div style={{
            marginTop: 10, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#4ade80', boxShadow: '0 0 6px rgba(74,222,128,0.8)', animation: 'frs-pulse 1.8s ease-in-out infinite' }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
              {count} persone ne hanno discusso oggi
            </span>
          </div>
        </div>

        {/* Messaggi AI — appaiono in sequenza */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DEMO_MESSAGES.slice(0, visible).map((msg) => (
            <div
              key={msg.id}
              style={{
                borderRadius: 16,
                background: msg.bg,
                border: `1px solid ${msg.border}`,
                padding: '13px 15px',
                animation: 'frs-in 0.38s cubic-bezier(0.16,1,0.3,1) forwards',
              }}
            >
              {/* Nome AI */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  backgroundColor: msg.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 900, color: '#000',
                }}>
                  {msg.id === 'gemini' ? 'Ge' : msg.name[0]}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 900,
                  color: msg.color, letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
                  {msg.name}
                </span>
              </div>
              {/* Testo */}
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.84)', lineHeight: 1.58 }}>
                {msg.text}
              </div>
            </div>
          ))}

          {/* Puntini "sta rispondendo" mentre aspettiamo il prossimo */}
          {visible > 0 && visible < DEMO_MESSAGES.length && (
            <div style={{ display: 'flex', gap: 5, paddingLeft: 6, paddingTop: 4, paddingBottom: 4 }}>
              {[0, 130, 260].map(d => (
                <div key={d} style={{
                  width: 7, height: 7, borderRadius: '50%',
                  backgroundColor: DEMO_MESSAGES[visible].color,
                  opacity: 0.6,
                  animation: 'frs-bounce 1.1s ease-in-out infinite',
                  animationDelay: `${d}ms`,
                }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CTA sticky — due azioni, nessuna scappatoia */}
      <div style={{
        flexShrink: 0,
        padding: '14px 20px 16px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(7,7,15,0.96)',
        backdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {/* CTA primario — passa per lo step dei limiti Free */}
        <button
          onClick={() => { setInputQ(DEMO_TOPIC); setPhase('limits') }}
          style={{
            padding: '16px', borderRadius: 15, border: 'none',
            fontSize: 15, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em',
            background: 'linear-gradient(135deg,#7C3AED,#5B21B6)',
            boxShadow: '0 4px 28px rgba(124,58,237,0.42)',
            cursor: 'pointer',
            animation: visible >= DEMO_MESSAGES.length ? 'frs-cta-pulse 2.4s ease-in-out infinite' : 'none',
          }}>
          Dibatti su questa domanda →
        </button>

        {/* CTA secondario — domanda propria */}
        <button
          onClick={() => { setInputQ(''); setPhase('input') }}
          style={{
            padding: '14px', borderRadius: 15,
            border: '1px solid rgba(167,139,250,0.22)',
            fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.6)',
            background: 'transparent', cursor: 'pointer',
            letterSpacing: '-0.01em',
          }}>
          Lancia la tua domanda
        </button>
      </div>

      {/* Keyframes inline */}
      <style>{`
        @keyframes frs-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes frs-bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-5px); }
        }
        @keyframes frs-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        @keyframes frs-cta-pulse {
          0%, 100% { box-shadow: 0 4px 28px rgba(124,58,237,0.42); }
          50%       { box-shadow: 0 4px 36px rgba(124,58,237,0.70); }
        }
      `}</style>
    </div>
  )
}
