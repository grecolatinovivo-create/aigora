'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import LoginModal, { type SelectableMode } from '@/app/components/landing/LoginModal'

// ── Background hell per Devil's Advocate ─────────────────────────────────────
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

// ── Schermo chat classica con 4 AI ────────────────────────────────────────────
function ClassicoScreen() {
  const t = useTranslations('arena.mock')
  const msgs = [
    { ai: 'C', color: '#7C3AED', name: 'Claude', text: 'La democrazia diretta è superiore a quella rappresentativa perché elimina gli intermediari tra cittadino e decisione.' },
    { ai: 'G', color: '#10A37F', name: 'GPT', text: 'In larga scala diventa impraticabile. Richiede un\'informazione diffusa che storicamente non esiste.' },
    { ai: 'Ge', color: '#1A73E8', name: 'Gemini', text: 'I dati sui referendum svizzeri mostrano risultati misti: alta partecipazione ma polarizzazione crescente.' },
    { ai: 'P', color: '#20B2AA', name: 'Perplexity', text: 'Le piattaforme digitali stanno rendendo più fattibile la consultazione continua — Estonia docet.' },
  ]
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#07070f' }}>
      {/* Header */}
      <div style={{ padding: '7px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        {[['#7C3AED','C'],['#10A37F','G'],['#1A73E8','Ge'],['#20B2AA','P']].map(([c,l]) => (
          <div key={l} style={{ width: 18, height: 18, borderRadius: '50%', background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, fontWeight: 900, color: '#fff' }}>{l}</div>
        ))}
        <div style={{ marginLeft: 3, fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>{t('debating')}</div>
      </div>
      {/* Messaggi */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 5, padding: '6px 7px 6px' }}>
        {msgs.map((m) => (
          <div key={m.ai} style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 5, fontWeight: 900, color: '#fff', flexShrink: 0, marginTop: 1 }}>{m.ai}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 5.5, fontWeight: 700, color: m.color, marginBottom: 1 }}>{m.name}</div>
              <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, padding: '4px 7px', borderRadius: '0 8px 8px 8px', background: 'rgba(255,255,255,0.06)' }}>{m.text}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Input */}
      <div style={{ padding: '5px 7px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.4)', display: 'flex', gap: 5, alignItems: 'center' }}>
        <div style={{ flex: 1, padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', fontSize: 6, color: 'rgba(255,255,255,0.25)' }}>{t('replyPlaceholder')}</div>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="7" height="7" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
        </div>
      </div>
    </div>
  )
}

// ── Schermo Brainstormer — 4 AI che deliberano ────────────────────────────────
function BrainstormScreen() {
  const t = useTranslations('arena.mock')
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#09060f' }}>
      <div style={{ padding: '7px 10px', borderBottom: '1px solid rgba(167,139,250,0.15)', background: 'rgba(0,0,0,0.4)' }}>
        <div style={{ fontSize: 7, fontWeight: 900, color: '#A78BFA', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Brainstormer</div>
        <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{t('councilDeliberating')}</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 8px' }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {[['C','#7C3AED','Claude'],['G','#10A37F','GPT'],['Ge','#1A73E8','Gemini'],['P','#20B2AA','Perplexity']].map(([id,color,name]) => (
            <div key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, fontWeight: 900, color: '#fff', boxShadow: `0 0 8px ${color}55` }}>{id}</div>
              <div style={{ fontSize: 5, color: 'rgba(255,255,255,0.35)' }}>{name}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#A78BFA', opacity: 0.7, animation: `dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
        <div style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(167,139,250,0.18)' }}>
          <div style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.7)', lineHeight: 1.55 }}>{t('councilDecided')}</div>
          <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, marginTop: 2 }}>Parti dal prodotto, non dal mercato.</div>
        </div>
      </div>
      <div style={{ padding: '5px 7px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', fontSize: 6, color: 'rgba(255,255,255,0.25)' }}>{t('ideaPlaceholder')}</div>
      </div>
    </div>
  )
}

// ── Tipi ─────────────────────────────────────────────────────────────────────
type PhoneMode = SelectableMode | 'multiplayer'

// ── Schermo Multiplayer — SOON ────────────────────────────────────────────────
function MultiplayerScreen() {
  const t = useTranslations('arena.mock')
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#0a0a12', padding: 12 }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 100 }}>
        {[['#F59E0B','U1'],['#10B981','U2'],['#3B82F6','U3'],['#EC4899','U4']].map(([c,l]) => (
          <div key={l} style={{ width: 22, height: 22, borderRadius: '50%', background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, fontWeight: 900, color: '#fff' }}>{l}</div>
        ))}
      </div>
      <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>{t('humans4')}</div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>+</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[['#7C3AED','C'],['#10A37F','G'],['#1A73E8','Ge'],['#20B2AA','P']].map(([c,l]) => (
          <div key={l} style={{ width: 22, height: 22, borderRadius: '50%', background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, fontWeight: 900, color: '#fff', opacity: 0.6 }}>{l}</div>
        ))}
      </div>
      <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>{t('ais4')}</div>
    </div>
  )
}

// ── Schermo 2 vs 2 ────────────────────────────────────────────────────────────
function TwoVsTwoScreen() {
  const t = useTranslations('arena.mock')
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0d0d14' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,80,0,0.2)' }}>
        <div style={{ fontSize: 7, fontWeight: 900, padding: '2px 6px', borderRadius: 3, color: '#3b82f6', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>{t('teamA')}</div>
        <div style={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>2 — 1</div>
        <div style={{ fontSize: 7, fontWeight: 900, padding: '2px 6px', borderRadius: 3, color: '#ef4444', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>{t('teamB')}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[['#F59E0B','Alex'],['#7C3AED','Claude']].map(([c,n]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: c, flexShrink: 0 }} />
              <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.7)' }}>{n}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
          {[['#10B981','Marco'],['#10A37F','GPT']].map(([c,n]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.7)' }}>{n}</span>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: c, flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 5, padding: '6px 7px' }}>
        <div style={{ alignSelf: 'flex-start', maxWidth: '78%', padding: '4px 8px', borderRadius: '8px 8px 8px 2px', fontSize: 7, lineHeight: 1.45, background: 'rgba(124,58,237,0.25)', color: 'rgba(255,255,255,0.85)' }}>L'IA amplifica la creatività, non la sostituisce.</div>
        <div style={{ alignSelf: 'flex-end', maxWidth: '78%', padding: '4px 8px', borderRadius: '8px 8px 2px 8px', fontSize: 7, lineHeight: 1.45, background: 'rgba(239,68,68,0.2)', color: 'rgba(255,255,255,0.85)' }}>Romantico. I budget spariscono nel mondo reale.</div>
        <div style={{ padding: '5px 8px', borderRadius: 7, fontSize: 6.5, lineHeight: 1.45, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: 'rgba(251,191,36,0.9)' }}>
          <span style={{ fontWeight: 900 }}>🏆 GEMINI — ARBITRO</span><br/>Squadra A più solida sul piano storico.
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 7px', background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ flex: 1, padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', fontSize: 6, color: 'rgba(255,255,255,0.25)' }}>{t('yourArgument')}</div>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="7" height="7" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
        </div>
      </div>
    </div>
  )
}

// ── Schermo Devil's Advocate ──────────────────────────────────────────────────
function DevilScreen() {
  const t = useTranslations('arena.mock')
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#080004', position: 'relative' }}>
      <HellGridBg />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 }}>
        <div style={{ fontSize: 42, filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.8))' }}>😈</div>
        <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(239,68,68,0.85)', textAlign: 'center' }}>{t('defendIndefensible')}</div>
        <div style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 8, fontWeight: 900, color: '#ef4444' }}>{t('enemyAIs')}</div>
      </div>
      {/* Powered by Grok */}
      <div style={{ position: 'relative', zIndex: 1, padding: '6px 10px', borderTop: '1px solid rgba(239,68,68,0.15)', background: 'rgba(0,0,0,0.4)', textAlign: 'center' }}>
        <div style={{ fontSize: 7, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(239,68,68,0.45)' }}>Powered by GROK</div>
      </div>
    </div>
  )
}

// ── Componente iPhone mock ────────────────────────────────────────────────────
function PhoneMock({
  mode, selected, small, onClick, onHover, label,
}: {
  mode: PhoneMode
  selected: boolean
  small?: boolean
  onClick: () => void
  onHover: () => void
  label: string
}) {
  const W = small ? 140 : 185
  const H = small ? 288 : 380

  const glowMap: Record<PhoneMode, string> = {
    chat:        selected ? '0 0 0 2px rgba(167,139,250,0.6), 0 0 50px rgba(124,58,237,0.4)'  : '0 0 0 1.5px rgba(167,139,250,0.25)',
    '2v2':       selected ? '0 0 0 2px rgba(167,139,250,0.7), 0 0 50px rgba(124,58,237,0.45)' : '0 0 0 1.5px rgba(167,139,250,0.3)',
    devil:       selected ? '0 0 0 2px rgba(239,68,68,0.7), 0 0 50px rgba(239,68,68,0.35)'    : '0 0 0 1.5px rgba(239,68,68,0.35)',
    brainstorm:  selected ? '0 0 0 2px rgba(167,139,250,0.6), 0 0 50px rgba(124,58,237,0.35)' : '0 0 0 1.5px rgba(167,139,250,0.2)',
    multiplayer: '0 0 0 1.5px rgba(255,255,255,0.1)',
  }

  const disabled = mode === 'multiplayer'
  const labelColor = mode === 'devil' ? 'rgba(239,68,68,0.7)' : disabled ? 'rgba(255,255,255,0.2)' : 'rgba(167,139,250,0.75)'

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        transform: selected && !disabled ? 'scale(1.13)' : 'scale(1)',
        transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
      }}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={onHover}
    >
      <div style={{ position: 'relative', width: W, height: H }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 28, boxShadow: glowMap[mode], transition: 'box-shadow 0.2s' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 28, background: '#1c1c1e', boxShadow: '0 24px 70px rgba(0,0,0,0.65)' }} />
        <div style={{ position: 'absolute', top: 5, left: 5, right: 5, bottom: 5, borderRadius: 23, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {mode === 'chat'        && <ClassicoScreen />}
          {mode === '2v2'         && <TwoVsTwoScreen />}
          {mode === 'devil'       && <DevilScreen />}
          {mode === 'brainstorm'  && <BrainstormScreen />}
          {mode === 'multiplayer' && <MultiplayerScreen />}
        </div>
        <div style={{ position: 'absolute', top: 9, left: '50%', transform: 'translateX(-50%)', width: small ? 42 : 54, height: 11, background: '#1c1c1e', borderRadius: 999, zIndex: 10 }} />
        {disabled && (
          <div style={{ position: 'absolute', inset: 0, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>SOON</div>
          </div>
        )}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: labelColor }}>
        {label}
      </div>
    </div>
  )
}

// ── Componente principale ─────────────────────────────────────────────────────
export default function ArenaPublic() {
  const router = useRouter()
  const t = useTranslations('arena')
  const [pendingMode, setPendingMode] = useState<SelectableMode | null>(null)
  const [selected, setSelected] = useState<PhoneMode>('2v2')

  type ModeInfo = { title: string; desc: string; cta: string; soon?: boolean }
  const MODE_INFO: Record<PhoneMode, ModeInfo> = {
    'chat':        { title: t('modes.chat.title'),        desc: t('modes.chat.desc'),        cta: t('modes.chat.cta') },
    '2v2':         { title: t('modes.2v2.title'),         desc: t('modes.2v2.desc'),         cta: t('modes.2v2.cta') },
    'devil':       { title: t('modes.devil.title'),       desc: t('modes.devil.desc'),       cta: t('modes.devil.cta') },
    'brainstorm':  { title: t('modes.brainstorm.title'),  desc: t('modes.brainstorm.desc'),  cta: t('modes.brainstorm.cta') },
    'multiplayer': { title: t('modes.multiplayer.title'), desc: t('modes.multiplayer.desc'), cta: t('modes.multiplayer.cta'), soon: true },
  }

  const info = MODE_INFO[selected]
  const phones: PhoneMode[] = ['chat', '2v2', 'devil', 'brainstorm', 'multiplayer']

  return (
    <>
      <div style={{ position: 'fixed', inset: '-200px', background: '#07070f', zIndex: 9998, pointerEvents: 'none' }} />
      <div className="fixed inset-0 z-[9999] flex flex-col overflow-hidden" style={{ backgroundColor: '#07070f' }}>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center px-5 border-b"
          style={{ paddingTop: 'max(14px, env(safe-area-inset-top))', paddingBottom: '12px', borderColor: 'rgba(255,255,255,0.07)' }}>
          <button onClick={() => router.push('/')} className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="flex-1 text-center">
            <div className="font-black text-base text-white">{t('header')}</div>
            <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('headerSub')}</div>
          </div>
          <div className="w-9" />
        </div>

        {/* ── MOBILE: card verticali ── */}
        <div className="lg:hidden flex-1 flex flex-col px-4 py-4 gap-3 overflow-hidden" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>

          {/* Dibattito */}
          <button onClick={() => setPendingMode('chat')} className="flex-1 flex flex-col justify-between px-5 py-4 rounded-3xl active:scale-[0.98] transition-all" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(10,6,20,0.9) 100%)', border: '1.5px solid rgba(167,139,250,0.25)', minHeight: 0 }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: '#A78BFA' }}>{t('modes.chat.tag')}</div>
                <div className="text-xl font-black text-white leading-tight">{t('modes.chat.mobileTitle')}</div>
              </div>
              <div className="flex gap-1">
                {[['#7C3AED','C'],['#10A37F','G'],['#1A73E8','Ge'],['#20B2AA','P']].map(([c,l]) => (
                  <div key={l} className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-black" style={{ background: c }}>{l}</div>
                ))}
              </div>
            </div>
            <div className="text-[12px] leading-relaxed mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{t('modes.chat.mobileDesc')}</div>
            <div className="flex justify-end mt-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)' }}>{t('modes.chat.mobileCta')} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg></div>
            </div>
          </button>

          {/* 2 vs 2 */}
          <button onClick={() => setPendingMode('2v2')} className="flex-1 flex flex-col justify-between px-5 py-4 rounded-3xl active:scale-[0.98] transition-all" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(91,33,182,0.1) 100%)', border: '1.5px solid rgba(167,139,250,0.35)', boxShadow: '0 4px 20px rgba(124,58,237,0.15)', minHeight: 0 }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: '#A78BFA' }}>{t('modes.2v2.tag')}</div>
                <div className="text-xl font-black text-white leading-tight">{t('modes.2v2.mobileTitle')}</div>
              </div>
              <div className="flex gap-1">
                {[['#7C3AED','C'],['#10A37F','G']].map(([c,l]) => (
                  <div key={l} className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black" style={{ background: c }}>{l}</div>
                ))}
              </div>
            </div>
            <div className="text-[12px] leading-relaxed mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{t('modes.2v2.mobileDesc')}</div>
            <div className="flex justify-end mt-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)' }}>{t('modes.2v2.mobileCta')} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg></div>
            </div>
          </button>

          {/* Devil's Advocate */}
          <button onClick={() => setPendingMode('devil')} className="flex-1 flex flex-col justify-between px-5 py-4 rounded-3xl active:scale-[0.98] transition-all relative overflow-hidden" style={{ border: '1.5px solid rgba(239,68,68,0.35)', boxShadow: '0 4px 20px rgba(239,68,68,0.15)', minHeight: 0, background: '#080004' }}>
            <HellGridBg />
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: '#ef4444' }}>{t('modes.devil.tag')}</div>
                <div className="text-xl font-black text-white leading-tight">{t('modes.devil.mobileTitle')}</div>
              </div>
              <div className="text-2xl" style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.6))' }}>😈</div>
            </div>
            <div className="relative z-10 text-[12px] leading-relaxed mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>{t('modes.devil.mobileDesc')}</div>
            <div className="relative z-10 flex justify-end mt-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)' }}>{t('modes.devil.mobileCta')} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg></div>
            </div>
          </button>

          {/* Brainstormer */}
          <button onClick={() => setPendingMode('brainstorm')} className="flex-1 flex flex-col justify-between px-5 py-4 rounded-3xl active:scale-[0.98] transition-all" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(10,6,20,0.9) 100%)', border: '1.5px solid rgba(167,139,250,0.2)', minHeight: 0 }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: '#A78BFA' }}>{t('modes.brainstorm.tag')}</div>
                <div className="text-xl font-black text-white leading-tight">{t('modes.brainstorm.mobileTitle')}</div>
              </div>
              <div className="text-2xl">🧠</div>
            </div>
            <div className="text-[12px] leading-relaxed mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{t('modes.brainstorm.mobileDesc')}</div>
            <div className="flex justify-end mt-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)' }}>{t('modes.brainstorm.mobileCta')} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg></div>
            </div>
          </button>
        </div>

        {/* ── DESKTOP: 4 iPhone mock + descrizione ── */}
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center gap-8 px-8 py-4 overflow-hidden">

          {/* Titolo */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-[11px] font-medium text-purple-300 border border-purple-500/30" style={{ backgroundColor: 'rgba(124,58,237,0.12)' }}>
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
              {t('badge')}
            </div>
            <h1 className="font-black text-white" style={{ fontSize: 'clamp(2rem, 3.8vw, 3rem)', lineHeight: 1.1, marginBottom: 6 }}>{t('header')}</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{t('mainSubtitle')}</p>
          </div>

          {/* 4 iPhone grandi + 1 piccolo SOON */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
            {phones.map(mode => (
              <PhoneMock
                key={mode}
                mode={mode}
                selected={selected === mode}
                small={mode === 'multiplayer'}
                label={MODE_INFO[mode].title}
                onClick={() => {
                  if (mode !== 'multiplayer') setPendingMode(mode as SelectableMode)
                }}
                onHover={() => setSelected(mode)}
              />
            ))}
          </div>

          {/* Descrizione + CTA del formato selezionato */}
          <div className="flex flex-col items-center gap-3" style={{ minHeight: 90 }}>
            <div className="text-center">
              <div className="font-black text-white text-xl mb-1">{info.title}</div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, maxWidth: 460, lineHeight: 1.6 }}>{info.desc}</p>
            </div>
            {!info.soon ? (
              <button
                onClick={() => setPendingMode(selected as SelectableMode)}
                className="px-9 py-3.5 rounded-2xl font-black text-white transition-all hover:scale-[1.03] active:scale-[0.97]"
                style={{
                  background: selected === 'devil' ? 'linear-gradient(135deg,#dc2626,#991b1b)' : 'linear-gradient(135deg,#7C3AED,#5B21B6)',
                  boxShadow: selected === 'devil' ? '0 6px 30px rgba(220,38,38,0.45)' : '0 6px 30px rgba(124,58,237,0.45)',
                  fontSize: 15,
                }}>
                {info.cta}
              </button>
            ) : (
              <div style={{ padding: '10px 24px', borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {t('comingSoon')}
              </div>
            )}
          </div>

        </div>
      </div>

      {pendingMode && (
        <LoginModal mode={pendingMode} onClose={() => setPendingMode(null)} />
      )}
    </>
  )
}
