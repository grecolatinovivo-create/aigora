'use client'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#07070f',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Glow viola di sfondo */}
      <div style={{
        position: 'fixed',
        top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 500,
        background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Navbar */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 28px',
        position: 'relative', zIndex: 1,
      }}>
        <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.01em' }}>
          <span style={{ color: '#fff' }}>Ai</span><span style={{ color: '#A78BFA' }}>GORÀ</span>
        </span>
        <button
          onClick={() => router.push('/login')}
          style={{
            padding: '8px 18px', borderRadius: 10,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Accedi
        </button>
      </div>

      {/* Hero — centrato verticalmente */}
      <div style={{
        flex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        padding: '0 24px 40px',
        position: 'relative', zIndex: 1,
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 14px', borderRadius: 999, marginBottom: 20,
          background: 'rgba(124,58,237,0.12)',
          border: '1px solid rgba(167,139,250,0.25)',
          fontSize: 12, fontWeight: 600, color: 'rgba(167,139,250,0.9)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#A78BFA', display: 'inline-block' }} />
          4 AI · Un'unica arena
        </div>

        {/* Headline */}
        <h1 style={{
          fontWeight: 900,
          fontSize: 'clamp(2rem, 6vw, 3.8rem)',
          lineHeight: 1.05,
          color: '#fff',
          letterSpacing: '-0.02em',
          marginBottom: 16,
          maxWidth: 700,
        }}>
          4 AI. Un solo dibattito.
        </h1>

        {/* Subheadline */}
        <p style={{
          fontSize: 'clamp(13px, 1.8vw, 17px)',
          color: 'rgba(255,255,255,0.45)',
          maxWidth: 480,
          lineHeight: 1.6,
          marginBottom: 32,
        }}>
          Fai una domanda, guarda le AI confrontarsi in tempo reale.<br />
          Oppure entra tu nell'arena.
        </p>

        {/* CTA */}
        <button
          onClick={() => router.push('/arena')}
          style={{
            padding: '14px 32px', borderRadius: 14,
            background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
            border: 'none', color: '#fff',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 30px rgba(124,58,237,0.45)',
            letterSpacing: '-0.01em',
            marginBottom: 18,
          }}
        >
          Scegli come dibattere →
        </button>

        {/* Trust line */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, color: 'rgba(255,255,255,0.2)',
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {['Dibattito classico', '2 vs 2', "Devil's Advocate", 'Brainstormer'].map((item, i) => (
            <span key={item} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <span>·</span>}
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
