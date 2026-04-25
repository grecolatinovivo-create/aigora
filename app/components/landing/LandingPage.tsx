'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LoginModal, { type SelectableMode } from '@/app/components/landing/LoginModal'

// ── Hell grid per Devil ───────────────────────────────────────────────────────
function HellGridBg() {
  return (
    <>
      <div style={{ position: 'absolute', bottom: 0, left: '-50%', right: '-50%', height: '65%', perspective: '600px', perspectiveOrigin: '50% 0%', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', inset: 0,
          transform: 'rotateX(55deg)', transformOrigin: '50% 0%',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 119px, rgba(160,0,20,0.45) 120px), repeating-linear-gradient(90deg, transparent, transparent 119px, rgba(160,0,20,0.45) 120px)',
          backgroundSize: '120px 120px',
          animation: 'hell-grid-scroll 1.8s linear infinite',
        }} />
      </div>
      <div style={{ position: 'absolute', top: '35%', left: 0, right: 0, height: '2px', background: 'rgba(220,0,30,0.7)', boxShadow: '0 0 40px 16px rgba(180,0,20,0.5)', animation: 'hell-horizon-pulse 3s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 80% at 50% 50%, transparent 30%, rgba(4,0,2,0.85) 100%)', pointerEvents: 'none' }} />
    </>
  )
}

// ── Mock screen components ────────────────────────────────────────────────────
function ChatScreen() {
  const msgs = [
    { id: 'C', color: '#7C3AED', name: 'Claude',     text: 'La democrazia diretta è superiore perché elimina gli intermediari tra cittadino e decisione.' },
    { id: 'G', color: '#10A37F', name: 'GPT',        text: 'In larga scala diventa impraticabile. Richiede un\'informazione diffusa che storicamente non esiste.' },
    { id: 'Ge',color: '#1A73E8', name: 'Gemini',     text: 'I dati sui referendum svizzeri mostrano risultati misti: alta partecipazione, polarizzazione crescente.' },
    { id: 'P', color: '#20B2AA', name: 'Perplexity', text: 'Le piattaforme digitali stanno rendendo più fattibile la consultazione continua — Estonia docet.' },
  ]
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#07070f' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {[['#7C3AED','C'],['#10A37F','G'],['#1A73E8','Ge'],['#20B2AA','P']].map(([c,l]) => (
          <div key={l} style={{ width: 20, height: 20, borderRadius: '50%', background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 900, color: '#fff' }}>{l}</div>
        ))}
        <div style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginLeft: 2 }}>dibattito in corso</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 7, padding: '8px 10px' }}>
        {msgs.map(m => (
          <div key={m.id} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, fontWeight: 900, color: '#fff', flexShrink: 0, marginTop: 1 }}>{m.id}</div>
            <div>
              <div style={{ fontSize: 6.5, fontWeight: 700, color: m.color, marginBottom: 2 }}>{m.name}</div>
              <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, padding: '5px 8px', borderRadius: '0 9px 9px 9px', background: 'rgba(255,255,255,0.06)' }}>{m.text}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '7px 10px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.4)', display: 'flex', gap: 6 }}>
        <div style={{ flex: 1, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', fontSize: 7, color: 'rgba(255,255,255,0.25)' }}>Rispondi al dibattito…</div>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
        </div>
      </div>
    </div>
  )
}

function TwoVsTwoScreen() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0d0d14' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,80,0,0.2)' }}>
        <div style={{ fontSize: 8, fontWeight: 900, padding: '2px 7px', borderRadius: 4, color: '#3b82f6', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>SQUADRA A</div>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#fff' }}>2 — 1</div>
        <div style={{ fontSize: 8, fontWeight: 900, padding: '2px 7px', borderRadius: 4, color: '#ef4444', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>SQUADRA B</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[['#F59E0B','Giampiero'],['#7C3AED','Claude']].map(([c,n]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)' }}>{n}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
          {[['#10B981','Marco'],['#10A37F','GPT']].map(([c,n]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)' }}>{n}</span>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 6, padding: '8px 10px' }}>
        <div style={{ alignSelf: 'flex-start', maxWidth: '78%', padding: '5px 9px', borderRadius: '9px 9px 9px 2px', fontSize: 8, lineHeight: 1.45, background: 'rgba(124,58,237,0.25)', color: 'rgba(255,255,255,0.85)' }}>L'IA amplifica la creatività, non la sostituisce.</div>
        <div style={{ alignSelf: 'flex-end', maxWidth: '78%', padding: '5px 9px', borderRadius: '9px 9px 2px 9px', fontSize: 8, lineHeight: 1.45, background: 'rgba(239,68,68,0.2)', color: 'rgba(255,255,255,0.85)' }}>Romantico. I budget spariscono nel mondo reale.</div>
        <div style={{ padding: '6px 9px', borderRadius: 8, fontSize: 7.5, lineHeight: 1.45, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: 'rgba(251,191,36,0.9)' }}>
          <span style={{ fontWeight: 900 }}>🏆 GEMINI — ARBITRO</span><br/>Squadra A più solida sul piano storico.
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ flex: 1, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', fontSize: 7, color: 'rgba(255,255,255,0.25)' }}>Il tuo argomento…</div>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
        </div>
      </div>
    </div>
  )
}

function DevilScreenContent() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#080004', position: 'relative' }}>
      <HellGridBg />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 }}>
        <div style={{ fontSize: 52, filter: 'drop-shadow(0 0 24px rgba(239,68,68,0.9))' }}>😈</div>
        <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(239,68,68,0.9)', textAlign: 'center' }}>Difendi l'indifendibile</div>
        <div style={{ padding: '4px 12px', borderRadius: 999, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', fontSize: 9, fontWeight: 900, color: '#ef4444' }}>4 AI nemiche</div>
      </div>
      <div style={{ position: 'relative', zIndex: 1, padding: '7px 12px', borderTop: '1px solid rgba(239,68,68,0.15)', background: 'rgba(0,0,0,0.4)', textAlign: 'center' }}>
        <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(239,68,68,0.45)' }}>Powered by GROK</div>
      </div>
    </div>
  )
}

function BrainstormScreenContent() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#09060f' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(167,139,250,0.15)', background: 'rgba(0,0,0,0.4)' }}>
        <div style={{ fontSize: 8, fontWeight: 900, color: '#A78BFA', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Brainstormer</div>
        <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Il concilio sta deliberando…</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 10px' }}>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {[['C','#7C3AED','Claude'],['G','#10A37F','GPT'],['Ge','#1A73E8','Gemini'],['P','#20B2AA','Perplexity']].map(([id,color,name]) => (
            <div key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 900, color: '#fff', boxShadow: `0 0 10px ${color}55` }}>{id}</div>
              <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.35)' }}>{name}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#A78BFA', opacity: 0.7, animation: `dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
        <div style={{ width: '100%', padding: '9px 11px', borderRadius: 10, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(167,139,250,0.18)' }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>Il concilio ha deciso:</div>
          <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, marginTop: 3 }}>Parti dal prodotto, non dal mercato.</div>
        </div>
      </div>
      <div style={{ padding: '7px 10px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', fontSize: 7, color: 'rgba(255,255,255,0.25)' }}>La tua idea…</div>
      </div>
    </div>
  )
}

// ── iPhone frame wrapper ──────────────────────────────────────────────────────
function IPhone({ children, glow }: { children: React.ReactNode; glow: string }) {
  return (
    <div style={{ position: 'relative', width: 230, height: 470, flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 36, boxShadow: glow }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: 36, background: '#1c1c1e', boxShadow: '0 32px 90px rgba(0,0,0,0.7)' }} />
      <div style={{ position: 'absolute', top: 6, left: 6, right: 6, bottom: 6, borderRadius: 30, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', width: 66, height: 15, background: '#1c1c1e', borderRadius: 999, zIndex: 10 }} />
    </div>
  )
}

// ── Sezione modalità ──────────────────────────────────────────────────────────
function ModeSection({
  reverse, accent, tag, title, body, cta, onCta, phone,
}: {
  reverse?: boolean
  accent: string
  tag: string
  title: string
  body: string
  cta: string
  onCta: () => void
  phone: React.ReactNode
}) {
  return (
    <section style={{
      width: '100%',
      maxWidth: 1100,
      margin: '0 auto',
      padding: '80px 40px',
      display: 'flex',
      flexDirection: 'column',
      gap: 60,
    }}>
      {/* Desktop */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 64,
        flexDirection: reverse ? 'row-reverse' : 'row',
      }}
        className="hidden lg:flex"
      >
        {/* Phone */}
        <div style={{ flexShrink: 0 }}>{phone}</div>
        {/* Text */}
        <div style={{ flex: 1, maxWidth: 480 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: accent, marginBottom: 12 }}>{tag}</div>
          <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', color: '#fff', lineHeight: 1.1, marginBottom: 14, letterSpacing: '-0.02em' }}>{title}</h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 32 }}>{body}</p>
          <button
            onClick={onCta}
            style={{
              padding: '13px 28px', borderRadius: 13, border: 'none', cursor: 'pointer',
              background: tag === "Devil's Advocate" ? 'linear-gradient(135deg,#dc2626,#991b1b)' : 'linear-gradient(135deg,#7C3AED,#5B21B6)',
              color: '#fff', fontSize: 15, fontWeight: 700,
              boxShadow: tag === "Devil's Advocate" ? '0 4px 24px rgba(220,38,38,0.4)' : '0 4px 24px rgba(124,58,237,0.4)',
              letterSpacing: '-0.01em',
            }}
          >{cta}</button>
        </div>
      </div>

      {/* Mobile */}
      <div className="lg:hidden" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
        <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}>{phone}</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: accent, marginBottom: 10 }}>{tag}</div>
          <h2 style={{ fontWeight: 900, fontSize: '1.9rem', color: '#fff', lineHeight: 1.15, marginBottom: 12, letterSpacing: '-0.02em' }}>{title}</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 28, maxWidth: 380, margin: '0 auto 28px' }}>{body}</p>
          <button
            onClick={onCta}
            style={{
              padding: '13px 28px', borderRadius: 13, border: 'none', cursor: 'pointer',
              background: tag === "Devil's Advocate" ? 'linear-gradient(135deg,#dc2626,#991b1b)' : 'linear-gradient(135deg,#7C3AED,#5B21B6)',
              color: '#fff', fontSize: 15, fontWeight: 700,
            }}
          >{cta}</button>
        </div>
      </div>
    </section>
  )
}

// ── Componente principale ─────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter()
  const [pendingMode, setPendingMode] = useState<SelectableMode | null>(null)

  const scrollToModes = () => {
    document.getElementById('modalita')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div style={{ background: '#07070f', minHeight: '100dvh', color: '#fff' }}>

      {/* Glow di sfondo */}
      <div style={{ position: 'fixed', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 600, background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.09) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 32px', background: 'rgba(7,7,15,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.01em' }}>
          <span style={{ color: '#fff' }}>Ai</span><span style={{ color: '#A78BFA' }}>GORÀ</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={scrollToModes} style={{ padding: '7px 16px', borderRadius: 9, background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Scopri i formati
          </button>
          <button onClick={() => router.push('/login')} style={{ padding: '8px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Accedi
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', zIndex: 1, minHeight: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px 24px 80px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 999, marginBottom: 22, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(167,139,250,0.25)', fontSize: 12, fontWeight: 600, color: 'rgba(167,139,250,0.9)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#A78BFA', display: 'inline-block' }} />
          4 AI · Un'unica arena
        </div>

        <h1 style={{ fontWeight: 900, fontSize: 'clamp(2.4rem, 7vw, 5rem)', lineHeight: 1.04, color: '#fff', letterSpacing: '-0.03em', marginBottom: 20, maxWidth: 800 }}>
          4 AI. Un solo dibattito.
        </h1>

        <p style={{ fontSize: 'clamp(15px, 2vw, 19px)', color: 'rgba(255,255,255,0.45)', maxWidth: 520, lineHeight: 1.65, marginBottom: 40 }}>
          Fai una domanda, guarda le AI confrontarsi in tempo reale.<br />Oppure entra tu nell'arena.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 48 }}>
          <button
            onClick={scrollToModes}
            style={{ padding: '15px 36px', borderRadius: 14, background: 'linear-gradient(135deg,#7C3AED,#A78BFA)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 32px rgba(124,58,237,0.5)', letterSpacing: '-0.01em' }}
          >
            Scegli come dibattere →
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.2)', flexWrap: 'wrap', justifyContent: 'center' }}>
          {['Dibattito', '2 vs 2', "Devil's Advocate", 'Brainstormer'].map((item, i) => (
            <span key={item} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <span>·</span>}
              {item}
            </span>
          ))}
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0.3, animation: 'bounce 2s ease-in-out infinite' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
        </div>
      </section>

      {/* ── SEZIONI MODALITÀ ── */}
      <div id="modalita" style={{ position: 'relative', zIndex: 1 }}>

        {/* Divisore */}
        <div style={{ width: '100%', height: 1, background: 'linear-gradient(to right, transparent, rgba(167,139,250,0.2), transparent)' }} />

        {/* 1 — Dibattito */}
        <ModeSection
          reverse={false}
          accent="#A78BFA"
          tag="Dibattito"
          title="Fai una domanda, guarda 4 AI confrontarsi."
          body="Claude, GPT, Gemini e Perplexity rispondono in sequenza, si leggono a vicenda e costruiscono un ragionamento collettivo. Tu puoi intervenire in qualsiasi momento e cambiare le carte in tavola."
          cta="Avvia il dibattito →"
          onCta={() => setPendingMode('chat')}
          phone={
            <IPhone glow="0 0 0 1.5px rgba(167,139,250,0.35), 0 0 50px rgba(124,58,237,0.25)">
              <ChatScreen />
            </IPhone>
          }
        />

        <div style={{ width: '100%', height: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)' }} />

        {/* 2 — 2 vs 2 */}
        <ModeSection
          reverse={true}
          accent="#A78BFA"
          tag="2 vs 2"
          title="Tu e una AI contro un altro umano con la sua AI."
          body="Due squadre, due tesi opposte. Ogni squadra ha un umano e un'AI alleata. Un'AI arbitro valuta ogni round e assegna i punti. Vincono i più convincenti, non i più rumorosi."
          cta="Scegli le squadre →"
          onCta={() => setPendingMode('2v2')}
          phone={
            <IPhone glow="0 0 0 2px rgba(167,139,250,0.5), 0 0 60px rgba(124,58,237,0.3)">
              <TwoVsTwoScreen />
            </IPhone>
          }
        />

        <div style={{ width: '100%', height: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)' }} />

        {/* 3 — Devil's Advocate */}
        <ModeSection
          reverse={false}
          accent="#ef4444"
          tag="Devil's Advocate"
          title="Difendi una tesi scomoda contro gli attacchi delle altre AI."
          body="Grok ti assegna una posizione difficile da sostenere. Claude, GPT, Gemini e Perplexity ti attaccheranno senza pietà, round dopo round. Più reggi, più sali di punteggio."
          cta="Inizia la sfida →"
          onCta={() => setPendingMode('devil')}
          phone={
            <IPhone glow="0 0 0 2px rgba(239,68,68,0.55), 0 0 60px rgba(239,68,68,0.25)">
              <DevilScreenContent />
            </IPhone>
          }
        />

        <div style={{ width: '100%', height: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)' }} />

        {/* 4 — Brainstormer */}
        <ModeSection
          reverse={true}
          accent="#A78BFA"
          tag="Brainstormer"
          title="Lanci un'idea, le AI discutono tra loro e ti restituiscono una sintesi più solida."
          body="Descrivi la tua idea in due parole o duemila. Le 4 AI deliberano in due round — prima in modo indipendente, poi reagendo l'una all'altra — e ti restituiscono una risposta unificata e ragionata."
          cta="Avvia il concilio →"
          onCta={() => setPendingMode('brainstorm')}
          phone={
            <IPhone glow="0 0 0 1.5px rgba(167,139,250,0.3), 0 0 50px rgba(124,58,237,0.2)">
              <BrainstormScreenContent />
            </IPhone>
          }
        />
      </div>

      {/* ── CTA FINALE ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '100px 24px', textAlign: 'center', borderTop: '1px solid rgba(167,139,250,0.1)' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontWeight: 900, fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: '#fff', letterSpacing: '-0.02em', marginBottom: 16, lineHeight: 1.1 }}>
            Entra nell'arena.
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.4)', maxWidth: 420, margin: '0 auto 40px', lineHeight: 1.65 }}>
            Scegli il formato che fa per te e inizia subito. Ci vogliono 30 secondi.
          </p>
          <button
            onClick={scrollToModes}
            style={{ padding: '16px 40px', borderRadius: 14, background: 'linear-gradient(135deg,#7C3AED,#A78BFA)', border: 'none', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 36px rgba(124,58,237,0.5)', letterSpacing: '-0.01em' }}
          >
            Scegli come iniziare →
          </button>
        </div>
      </section>

      {/* Login modal */}
      {pendingMode && <LoginModal mode={pendingMode} onClose={() => setPendingMode(null)} />}
    </div>
  )
}
