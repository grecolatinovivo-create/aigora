'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LoginModal, { type SelectableMode } from '@/app/components/landing/LoginModal'

function HellGridBg() {
  return (
    <>
      <div style={{ position: 'absolute', bottom: 0, left: '-50%', right: '-50%', height: '65%', perspective: '600px', perspectiveOrigin: '50% 0%', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', inset: 0,
          transform: 'rotateX(55deg)', transformOrigin: '50% 0%',
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 119px, rgba(160,0,20,0.45) 120px), ' +
            'repeating-linear-gradient(90deg, transparent, transparent 119px, rgba(160,0,20,0.45) 120px)',
          backgroundSize: '120px 120px',
          animation: 'hell-grid-scroll 1.8s linear infinite',
        }} />
      </div>
      <div style={{ position: 'absolute', top: '35%', left: 0, right: 0, height: '2px', background: 'rgba(220,0,30,0.7)', boxShadow: '0 0 40px 16px rgba(180,0,20,0.5)', animation: 'hell-horizon-pulse 3s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 80% at 50% 50%, transparent 30%, rgba(4,0,2,0.85) 100%)', pointerEvents: 'none' }} />
    </>
  )
}

interface ModeCardProps {
  onClick: () => void
  disabled?: boolean
  style?: React.CSSProperties
  children: React.ReactNode
}

function ModeCard({ onClick, disabled, style, children }: ModeCardProps) {
  const [hover, setHover] = useState(false)
  if (disabled) {
    return (
      <div style={{ flex: 1, ...style, opacity: 0.35, cursor: 'not-allowed' }}>
        {children}
      </div>
    )
  }
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: 1,
        transform: hover ? 'translateY(-4px)' : 'none',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

export default function ArenaPublic() {
  const router = useRouter()
  const [pendingMode, setPendingMode] = useState<SelectableMode | null>(null)

  const cardBase: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    textAlign: 'left', border: 'none', background: 'none',
  }

  // ── MOBILE card ──────────────────────────────────────────────────────────
  const mobileCard: React.CSSProperties = {
    ...cardBase,
    padding: '16px 20px', borderRadius: 24, minHeight: 0,
  }

  // ── DESKTOP card ─────────────────────────────────────────────────────────
  const desktopCard: React.CSSProperties = {
    ...cardBase,
    padding: '28px 28px 24px', borderRadius: 28,
    height: '100%', maxHeight: 460,
  }

  function ActionBtn({ color, label }: { color: string; label: string }) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 10, background: color, fontSize: 13, fontWeight: 700, color: '#fff' }}>
          {label} <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: '#07070f', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center',
          padding: 'max(14px, env(safe-area-inset-top)) 20px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <button onClick={() => router.push('/')} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#fff' }}>Come vuoi dibattere?</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>Scegli il formato</div>
          </div>
          <div style={{ width: 36 }} />
        </div>

        {/* ── MOBILE ── */}
        <div className="lg:hidden" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 16px', gap: 10, paddingBottom: 'max(16px, env(safe-area-inset-bottom))', overflow: 'hidden' }}>

          {/* 2 vs 2 */}
          <ModeCard onClick={() => setPendingMode('2v2')} style={{ ...mobileCard, border: '1.5px solid rgba(167,139,250,0.35)', background: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(91,33,182,0.1) 100%)', boxShadow: '0 4px 20px rgba(124,58,237,0.15)' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', color: '#A78BFA', textTransform: 'uppercase', marginBottom: 4 }}>2 vs 2</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>Sfida a squadre</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginTop: 6 }}>Tu + AI vs un altro umano + AI. L'arbitro assegna i punti a ogni round.</div>
            </div>
            <ActionBtn color="linear-gradient(135deg,#7C3AED,#5B21B6)" label="Gioca" />
          </ModeCard>

          {/* Devil's Advocate */}
          <ModeCard onClick={() => setPendingMode('devil')} style={{ ...mobileCard, border: '1.5px solid rgba(239,68,68,0.35)', background: '#080004', boxShadow: '0 4px 20px rgba(239,68,68,0.15)', position: 'relative', overflow: 'hidden' }}>
            <HellGridBg />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', color: '#ef4444', textTransform: 'uppercase', marginBottom: 4 }}>Devil's Advocate</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>Difendi l'indifendibile</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginTop: 6 }}>Difendi una posizione scomoda contro 4 AI che ti attaccheranno senza pietà.</div>
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <ActionBtn color="linear-gradient(135deg,#dc2626,#991b1b)" label="Gioca" />
            </div>
          </ModeCard>

          {/* Brainstormer */}
          <ModeCard onClick={() => setPendingMode('brainstorm')} style={{ ...mobileCard, border: '1.5px solid rgba(167,139,250,0.2)', background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(10,6,20,0.8) 100%)' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', color: '#A78BFA', textTransform: 'uppercase', marginBottom: 4 }}>Brainstormer</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>4 AI per la tua idea</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginTop: 6 }}>Lancia un'idea, le AI discutono tra loro e ricevi una risposta unificata.</div>
            </div>
            <ActionBtn color="linear-gradient(135deg,#7C3AED,#5B21B6)" label="Prova" />
          </ModeCard>

          {/* Classico — SOON */}
          <ModeCard onClick={() => {}} disabled style={{ ...mobileCard, border: '1.5px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 4 }}>Classico</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'rgba(255,255,255,0.2)', lineHeight: 1.2 }}>Dibattito libero</div>
            </div>
            <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 22, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase' }}>SOON</div>
          </ModeCard>

        </div>

        {/* ── DESKTOP ── */}
        <div className="hidden lg:flex" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: '32px 40px' }}>

          {/* 2 vs 2 */}
          <ModeCard onClick={() => setPendingMode('2v2')} style={{ ...desktopCard, border: '1.5px solid rgba(167,139,250,0.35)', background: 'linear-gradient(160deg, rgba(124,58,237,0.2) 0%, rgba(91,33,182,0.08) 100%)', boxShadow: '0 8px 40px rgba(124,58,237,0.15)' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.15em', color: '#A78BFA', textTransform: 'uppercase', marginBottom: 8 }}>2 vs 2</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: 10 }}>Sfida a squadre</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>Tu + AI vs un altro umano + AI. L'arbitro assegna i punti a ogni round.</div>
            </div>
            <ActionBtn color="linear-gradient(135deg,#7C3AED,#5B21B6)" label="Gioca" />
          </ModeCard>

          {/* Devil's Advocate */}
          <ModeCard onClick={() => setPendingMode('devil')} style={{ ...desktopCard, border: '1.5px solid rgba(239,68,68,0.35)', background: '#080004', boxShadow: '0 8px 40px rgba(239,68,68,0.12)', position: 'relative', overflow: 'hidden' }}>
            <HellGridBg />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.15em', color: '#ef4444', textTransform: 'uppercase', marginBottom: 8 }}>Devil's Advocate</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: 10 }}>Difendi l'indifendibile</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>Ricevi una posizione scomoda e difendila contro 4 AI che ti attaccheranno senza pietà.</div>
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <ActionBtn color="linear-gradient(135deg,#dc2626,#991b1b)" label="Gioca" />
            </div>
          </ModeCard>

          {/* Brainstormer */}
          <ModeCard onClick={() => setPendingMode('brainstorm')} style={{ ...desktopCard, border: '1.5px solid rgba(167,139,250,0.2)', background: 'linear-gradient(160deg, rgba(124,58,237,0.12) 0%, rgba(10,6,20,0.9) 100%)', boxShadow: '0 8px 40px rgba(124,58,237,0.08)' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.15em', color: '#A78BFA', textTransform: 'uppercase', marginBottom: 8 }}>Brainstormer</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: 10 }}>4 AI per la tua idea</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>Lancia un'idea, le AI discutono tra loro dietro le quinte e ricevi una risposta unificata.</div>
            </div>
            <ActionBtn color="linear-gradient(135deg,#7C3AED,#5B21B6)" label="Prova" />
          </ModeCard>

          {/* Classico — SOON */}
          <ModeCard onClick={() => {}} disabled style={{ ...desktopCard, border: '1.5px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase', marginBottom: 8 }}>Classico</div>
              <div style={{ fontWeight: 900, fontSize: 36, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.12)', textTransform: 'uppercase' }}>SOON</div>
            </div>
          </ModeCard>

        </div>
      </div>

      {pendingMode && (
        <LoginModal
          mode={pendingMode}
          onClose={() => setPendingMode(null)}
        />
      )}
    </>
  )
}
