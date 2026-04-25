'use client'
import { useRouter } from 'next/navigation'

// Preview statica dei 3 formati — ispirata ai mock iPhone di ModeSelect
function ArenaPreview() {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: 760,
      margin: '0 auto',
      height: 340,
      pointerEvents: 'none',
      overflow: 'hidden',
    }}>
      {/* Fade bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 160,
        background: 'linear-gradient(to bottom, transparent, #07070f)',
        zIndex: 10,
      }} />

      {/* 3 iPhone mocks — layout orizzontale */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 24, height: '100%', paddingBottom: 0 }}>

        {/* CLASSICO — soon, grigio */}
        <div style={{ opacity: 0.35, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', width: 150, height: 300 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 28, background: '#1c1c1e', boxShadow: '0 0 0 1.5px #3a3a3c, 0 20px 60px rgba(0,0,0,0.6)' }} />
            <div style={{ position: 'absolute', top: 5, left: 5, right: 5, bottom: 5, borderRadius: 23, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontWeight: 900, fontSize: 28, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>SOON</div>
            </div>
            <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 50, height: 12, background: '#1c1c1e', borderRadius: 999, zIndex: 10 }} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>Classico</div>
        </div>

        {/* 2 VS 2 — centrale, più grande, con glow viola */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', width: 185, height: 370 }}>
            {/* Glow */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: 34, boxShadow: '0 0 0 2px rgba(167,139,250,0.5), 0 0 50px rgba(124,58,237,0.35)' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: 34, background: '#1c1c1e', boxShadow: '0 30px 80px rgba(0,0,0,0.7)' }} />
            <div style={{ position: 'absolute', top: 6, left: 6, right: 6, bottom: 6, borderRadius: 28, background: '#0d0d14', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,80,0,0.15)' }}>
                <div style={{ fontSize: 7, fontWeight: 900, padding: '2px 6px', borderRadius: 4, color: '#3b82f6', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>SQUADRA A</div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#fff' }}>2 — 1</div>
                <div style={{ fontSize: 7, fontWeight: 900, padding: '2px 6px', borderRadius: 4, color: '#ef4444', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>SQUADRA B</div>
              </div>
              {/* Messaggi */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 6, padding: '8px 8px 6px' }}>
                <div style={{ alignSelf: 'flex-start', maxWidth: '78%', padding: '5px 8px', borderRadius: '10px 10px 10px 2px', fontSize: 7, lineHeight: 1.4, background: 'rgba(124,58,237,0.25)', color: 'rgba(255,255,255,0.85)' }}>L'IA amplifica la creatività, non la sostituisce.</div>
                <div style={{ alignSelf: 'flex-end', maxWidth: '78%', padding: '5px 8px', borderRadius: '10px 10px 2px 10px', fontSize: 7, lineHeight: 1.4, background: 'rgba(239,68,68,0.2)', color: 'rgba(255,255,255,0.85)' }}>Romantico. Nel mondo reale i budget spariscono.</div>
                <div style={{ padding: '6px 8px', borderRadius: 8, fontSize: 7, lineHeight: 1.4, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: 'rgba(251,191,36,0.85)' }}>
                  <span style={{ fontWeight: 900 }}>🏆 GEMINI — ARBITRO</span><br/>Squadra A più solida sul piano storico.
                </div>
              </div>
              {/* Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ flex: 1, padding: '4px 10px', borderRadius: 999, fontSize: 7, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>Il tuo argomento…</div>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="7" height="7" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                </div>
              </div>
            </div>
            <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 60, height: 13, background: '#1c1c1e', borderRadius: 999, zIndex: 10 }} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(167,139,250,0.8)', textTransform: 'uppercase' }}>2 vs 2</div>
        </div>

        {/* DEVIL'S ADVOCATE — rosso */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, opacity: 0.85 }}>
          <div style={{ position: 'relative', width: 150, height: 300 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 28, background: '#1c1c1e', boxShadow: '0 0 0 1.5px rgba(239,68,68,0.4), 0 20px 60px rgba(0,0,0,0.6)' }} />
            <div style={{ position: 'absolute', top: 5, left: 5, right: 5, bottom: 5, borderRadius: 23, background: '#080004', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Griglia hell */}
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 29px, rgba(160,0,20,0.3) 30px), repeating-linear-gradient(90deg, transparent, transparent 29px, rgba(160,0,20,0.3) 30px)', backgroundSize: '30px 30px', opacity: 0.5 }} />
              <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 }}>
                <div style={{ fontSize: 28, filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.7))' }}>😈</div>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#ef4444', letterSpacing: '0.05em', textAlign: 'center' }}>Difendi l'indifendibile</div>
                <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.4 }}>4 AI ti attaccheranno senza pietà</div>
              </div>
            </div>
            <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 50, height: 12, background: '#1c1c1e', borderRadius: 999, zIndex: 10 }} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(239,68,68,0.7)', textTransform: 'uppercase' }}>Devil's Advocate</div>
        </div>

      </div>
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#07070f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Glow di sfondo viola */}
      <div style={{
        position: 'absolute',
        top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 400,
        background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo in alto */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 28px',
      }}>
        <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.01em' }}>
          <span style={{ color: '#fff' }}>Ai</span><span style={{ color: '#A78BFA' }}>GORÀ</span>
        </span>
        <button
          onClick={() => router.push('/login')}
          style={{
            padding: '8px 18px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)' }}
          onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)' }}
        >
          Accedi
        </button>
      </div>

      {/* Hero content */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center',
        padding: '0 24px',
        marginTop: '-60px',
      }}>
        {/* Pill badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 14px', borderRadius: 999, marginBottom: 20,
          background: 'rgba(124,58,237,0.12)',
          border: '1px solid rgba(167,139,250,0.25)',
          fontSize: 12, fontWeight: 600, color: 'rgba(167,139,250,0.9)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#A78BFA', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          4 AI · Un'unica arena
        </div>

        {/* Headline */}
        <h1 style={{
          fontWeight: 900,
          fontSize: 'clamp(2.2rem, 6vw, 4rem)',
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
          fontSize: 'clamp(14px, 2vw, 18px)',
          color: 'rgba(255,255,255,0.45)',
          maxWidth: 520,
          lineHeight: 1.6,
          marginBottom: 36,
        }}>
          Fai una domanda, guarda le AI confrontarsi in tempo reale.<br />
          Oppure entra tu nell'arena.
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => router.push('/arena')}
            style={{
              padding: '14px 32px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
              border: 'none',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 30px rgba(124,58,237,0.45)',
              transition: 'all 0.2s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.transform = 'scale(1.03)'; (e.target as HTMLButtonElement).style.boxShadow = '0 6px 40px rgba(124,58,237,0.6)' }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.transform = 'scale(1)'; (e.target as HTMLButtonElement).style.boxShadow = '0 4px 30px rgba(124,58,237,0.45)' }}
          >
            Scegli come dibattere →
          </button>
        </div>

        {/* Trust line */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, marginTop: 20,
          fontSize: 12, color: 'rgba(255,255,255,0.25)',
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {['Dibattito classico', '2 vs 2', "Devil's Advocate", 'Brainstormer'].map((item, i) => (
            <span key={item} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {i > 0 && <span style={{ opacity: 0.3 }}>·</span>}
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Preview arena — below the fold, sfumata */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        paddingBottom: 0,
        pointerEvents: 'none',
      }}>
        <ArenaPreview />
      </div>
    </div>
  )
}
