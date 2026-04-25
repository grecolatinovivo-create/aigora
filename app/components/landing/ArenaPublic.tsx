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

// Schermo Brainstormer — 4 AI che "pensano"
function BrainstormScreen() {
  const ais = [
    { id: 'C', color: '#7C3AED', name: 'Claude' },
    { id: 'G', color: '#10A37F', name: 'GPT' },
    { id: 'Ge', color: '#1A73E8', name: 'Gemini' },
    { id: 'P', color: '#20B2AA', name: 'Perplexity' },
  ]
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#09060f' }}>
      {/* Header */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(167,139,250,0.15)', background: 'rgba(0,0,0,0.4)' }}>
        <div style={{ fontSize: 7, fontWeight: 900, color: '#A78BFA', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Brainstormer</div>
        <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Il concilio sta deliberando…</div>
      </div>
      {/* AI avatars — cerchio */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 6px' }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 4 }}>
          {ais.map(ai => (
            <div key={ai.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: ai.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 900, color: '#fff', boxShadow: `0 0 8px ${ai.color}66` }}>{ai.id}</div>
              <div style={{ fontSize: 5, color: 'rgba(255,255,255,0.4)' }}>{ai.name}</div>
            </div>
          ))}
        </div>
        {/* Dots animati */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: '#A78BFA', animation: `dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
        {/* Output parziale */}
        <div style={{ width: '100%', padding: '6px 8px', borderRadius: 8, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(167,139,250,0.15)', marginTop: 4 }}>
          <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>Il modello freemium ha trasformato il SaaS: riduce l'attrito iniziale e massimizza la retention a lungo termine…</div>
        </div>
      </div>
      {/* Input */}
      <div style={{ padding: '6px 8px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', fontSize: 6, color: 'rgba(255,255,255,0.25)' }}>La tua idea…</div>
      </div>
    </div>
  )
}

const MODE_INFO: Record<SelectableMode, { title: string; desc: string; cta: string }> = {
  '2v2': {
    title: '2 vs 2',
    desc: 'Due squadre si sfidano. Ogni squadra ha un umano e un\'AI alleata. Un\'AI arbitro pronuncia il verdetto finale.',
    cta: 'Scegli le squadre →',
  },
  'devil': {
    title: 'Devil\'s Advocate',
    desc: 'Ricevi una posizione scomoda e difendila contro 4 AI che ti attaccheranno senza pietà. Più resisti, più sali.',
    cta: 'Inizia la sfida →',
  },
  'brainstorm': {
    title: 'Brainstormer',
    desc: 'Lancia un\'idea. Le 4 AI deliberano tra loro in due round e ti restituiscono una risposta unificata e ragionata.',
    cta: 'Avvia il concilio →',
  },
}

export default function ArenaPublic() {
  const router = useRouter()
  const [pendingMode, setPendingMode] = useState<SelectableMode | null>(null)
  const [hoveredMode, setHoveredMode] = useState<SelectableMode>('2v2')

  const info = MODE_INFO[hoveredMode]

  return (
    <>
      <div style={{ position: 'fixed', inset: '-200px', background: '#07070f', zIndex: 9998, pointerEvents: 'none' }} />
      <div className="fixed inset-0 z-[9999] flex flex-col overflow-hidden" style={{ backgroundColor: '#07070f' }}>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center px-5 border-b"
          style={{ paddingTop: 'max(14px, env(safe-area-inset-top))', paddingBottom: '12px', borderColor: 'rgba(255,255,255,0.07)' }}>
          <button onClick={() => router.push('/')}
            className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="flex-1 text-center">
            <div className="font-black text-base text-white">Come vuoi dibattere?</div>
            <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Scegli il formato</div>
          </div>
          <div className="w-9" />
        </div>

        {/* ── MOBILE: card verticali ── */}
        <div className="lg:hidden flex-1 flex flex-col px-4 py-4 gap-3 overflow-hidden"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>

          {/* 2 vs 2 */}
          <button onClick={() => setPendingMode('2v2')}
            className="flex-1 flex flex-col justify-between px-5 py-4 rounded-3xl active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(91,33,182,0.1) 100%)', border: '1.5px solid rgba(167,139,250,0.35)', boxShadow: '0 4px 20px rgba(124,58,237,0.15)', minHeight: 0 }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: '#A78BFA' }}>2 vs 2</div>
                <div className="text-xl font-black text-white leading-tight">Sfida a squadre</div>
              </div>
              <div className="flex gap-1">
                {[['#7C3AED','C'],['#10A37F','G']].map(([c,l]) => (
                  <div key={l} className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black" style={{ background: c }}>{l}</div>
                ))}
              </div>
            </div>
            <div className="text-[12px] leading-relaxed mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Tu + AI vs un altro umano + AI. L'arbitro assegna i punti a ogni round.</div>
            <div className="flex items-center justify-end mt-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)' }}>
                Gioca <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </div>
          </button>

          {/* Classico — soon */}
          <div className="flex-1 flex flex-col rounded-3xl relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.10)', cursor: 'not-allowed', minHeight: 0 }}>
            <div className="absolute top-4 left-5 text-[11px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>Classico</div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="font-black uppercase" style={{ fontSize: 44, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.22)' }}>SOON</div>
            </div>
          </div>

          {/* Devil's Advocate */}
          <button onClick={() => setPendingMode('devil')}
            className="flex-1 flex flex-col justify-between px-5 py-4 rounded-3xl active:scale-[0.98] transition-all relative overflow-hidden"
            style={{ border: '1.5px solid rgba(239,68,68,0.35)', boxShadow: '0 4px 20px rgba(239,68,68,0.15)', minHeight: 0, background: '#080004' }}>
            <HellGridBg />
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: '#ef4444' }}>Devil's Advocate</div>
                <div className="text-xl font-black text-white leading-tight">Difendi l'indifendibile</div>
              </div>
              <div className="text-2xl" style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.6))' }}>😈</div>
            </div>
            <div className="relative z-10 text-[12px] leading-relaxed mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Difendi una posizione scomoda contro 4 AI che ti attaccheranno senza pietà.</div>
            <div className="relative z-10 flex items-center justify-end mt-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)' }}>
                Gioca <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </div>
          </button>

          {/* Brainstormer */}
          <button onClick={() => setPendingMode('brainstorm')}
            className="flex-1 flex flex-col justify-between px-5 py-4 rounded-3xl active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(10,6,20,0.9) 100%)', border: '1.5px solid rgba(167,139,250,0.2)', minHeight: 0 }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: '#A78BFA' }}>Brainstormer</div>
                <div className="text-xl font-black text-white leading-tight">4 AI per la tua idea</div>
              </div>
              <div className="text-2xl">🧠</div>
            </div>
            <div className="text-[12px] leading-relaxed mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Lancia un'idea, le AI discutono tra loro e ricevi una risposta unificata.</div>
            <div className="flex items-center justify-end mt-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)' }}>
                Prova <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </div>
          </button>
        </div>

        {/* ── DESKTOP: 4 mock iPhone + descrizione ── */}
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center gap-8 px-8 py-6 overflow-hidden">

          {/* Titolo */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-[11px] font-medium text-purple-300 border border-purple-500/30"
              style={{ backgroundColor: 'rgba(124,58,237,0.12)' }}>
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
              Scegli il formato del dibattito
            </div>
            <h1 className="font-black text-white" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', lineHeight: 1.1, marginBottom: 8 }}>Come vuoi dibattere?</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>Quattro formati diversi, un'unica arena. Clicca quello che fa per te.</p>
          </div>

          {/* 4 mock iPhone */}
          <div className="flex items-end justify-center gap-6">

            {/* ── CLASSICO — SOON ── */}
            <div className="flex flex-col items-center gap-4" style={{ opacity: 0.45, cursor: 'not-allowed' }}>
              <div className="relative" style={{ width: 175, height: 360 }}>
                <div className="absolute inset-0 rounded-[28px]" style={{ background: '#1c1c1e', boxShadow: '0 0 0 1.5px #3a3a3c, 0 20px 60px rgba(0,0,0,0.6)' }} />
                <div className="absolute rounded-[22px] overflow-hidden flex flex-col items-center justify-center"
                  style={{ top: 6, left: 6, right: 6, bottom: 6, background: '#111' }}>
                  <div className="font-black uppercase text-center" style={{ fontSize: 32, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)' }}>SOON</div>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 rounded-full" style={{ top: 9, width: 52, height: 12, background: '#1c1c1e', zIndex: 10 }} />
              </div>
              <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>Classico</div>
            </div>

            {/* ── 2 VS 2 — centrale più grande ── */}
            <button
              onClick={() => setPendingMode('2v2')}
              onMouseEnter={() => setHoveredMode('2v2')}
              className="flex flex-col items-center gap-5 transition-transform hover:scale-[1.02] active:scale-[0.98]">
              <div className="relative" style={{ width: 220, height: 450 }}>
                <div className="absolute inset-0 rounded-[35px]" style={{ boxShadow: hoveredMode === '2v2' ? '0 0 0 2px rgba(167,139,250,0.7), 0 0 60px rgba(124,58,237,0.5)' : '0 0 0 2px rgba(167,139,250,0.4), 0 0 40px rgba(124,58,237,0.25)', borderRadius: 35, transition: 'box-shadow 0.2s' }} />
                <div className="absolute inset-0 rounded-[35px]" style={{ background: '#1c1c1e', boxShadow: '0 30px 80px rgba(0,0,0,0.7)' }} />
                <div className="absolute rounded-[29px] overflow-hidden flex flex-col"
                  style={{ top: 7, left: 7, right: 7, bottom: 7, background: '#0d0d14' }}>
                  <div className="flex items-center justify-between px-3 py-2" style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,80,0,0.2)' }}>
                    <div className="text-[8px] font-black px-2 py-0.5 rounded" style={{ color: '#3b82f6', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>SQUADRA A</div>
                    <div className="text-sm font-black text-white">2 — 1</div>
                    <div className="text-[8px] font-black px-2 py-0.5 rounded" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>SQUADRA B</div>
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5" style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex flex-col gap-0.5">
                      {[['#F59E0B','Giampiero'],['#7C3AED','Claude']].map(([c,n]) => (
                        <div key={n} className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c }} />
                          <span className="text-[8px] text-white/70">{n}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-0.5 items-end">
                      {[['#10B981','Marco'],['#10A37F','GPT']].map(([c,n]) => (
                        <div key={n} className="flex items-center gap-1">
                          <span className="text-[8px] text-white/70">{n}</span>
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-end gap-1 px-2 py-2">
                    <div className="self-start max-w-[75%] px-2.5 py-1.5 rounded-2xl rounded-tl-sm text-[8px] leading-relaxed" style={{ background: 'rgba(124,58,237,0.25)', color: 'rgba(255,255,255,0.85)' }}>L'IA amplifica la creatività umana, non la sostituisce.</div>
                    <div className="self-end max-w-[75%] px-2.5 py-1.5 rounded-2xl rounded-tr-sm text-[8px] leading-relaxed" style={{ background: 'rgba(239,68,68,0.2)', color: 'rgba(255,255,255,0.85)' }}>Romantico. Nel mondo reale i budget spariscono.</div>
                    <div className="self-start max-w-[75%] px-2.5 py-1.5 rounded-2xl rounded-tl-sm text-[8px] italic leading-relaxed" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>Claude: Anche la fotografia "uccise" la pittura — eppure…</div>
                    <div className="self-end max-w-[75%] px-2.5 py-1.5 rounded-2xl rounded-tr-sm text-[8px] italic leading-relaxed" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>GPT: La fotografia non generava contenuti autonomamente.</div>
                    <div className="mt-1 px-2.5 py-2 rounded-2xl text-[7px] leading-relaxed" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: 'rgba(251,191,36,0.9)' }}>
                      <span className="font-black">🏆 GEMINI — ARBITRO</span><br/>Squadra A più solida. Squadra B più concreta.
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-2" style={{ background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex-1 px-3 py-1.5 rounded-full text-[8px]" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>Il tuo argomento…</div>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)' }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                    </div>
                  </div>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 rounded-full" style={{ top: 11, width: 66, height: 15, background: '#1c1c1e', zIndex: 10 }} />
              </div>
              <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(167,139,250,0.8)' }}>2 vs 2</div>
            </button>

            {/* ── DEVIL'S ADVOCATE ── */}
            <button
              onClick={() => setPendingMode('devil')}
              onMouseEnter={() => setHoveredMode('devil')}
              className="flex flex-col items-center gap-4 transition-transform hover:scale-[1.02] active:scale-[0.98]">
              <div className="relative" style={{ width: 175, height: 360 }}>
                <div className="absolute inset-0 rounded-[28px]" style={{ boxShadow: hoveredMode === 'devil' ? '0 0 0 1.5px rgba(239,68,68,0.7), 0 0 40px rgba(239,68,68,0.35)' : '0 0 0 1.5px rgba(239,68,68,0.4), 0 0 20px rgba(239,68,68,0.15)', transition: 'box-shadow 0.2s' }} />
                <div className="absolute inset-0 rounded-[28px]" style={{ background: '#1c1c1e', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }} />
                <div className="absolute rounded-[22px] overflow-hidden flex flex-col items-center justify-center gap-3"
                  style={{ top: 6, left: 6, right: 6, bottom: 6, background: '#080004' }}>
                  <HellGridBg />
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <div className="text-4xl" style={{ filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.8))' }}>😈</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-center px-4" style={{ color: 'rgba(239,68,68,0.8)' }}>Difendi l'indifendibile</div>
                    <div className="px-3 py-1 rounded-full text-[9px] font-black" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>4 AI nemiche</div>
                  </div>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 rounded-full" style={{ top: 9, width: 52, height: 12, background: '#1c1c1e', zIndex: 10 }} />
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(239,68,68,0.7)' }}>Devil's Advocate</div>
              </div>
            </button>

            {/* ── BRAINSTORMER ── */}
            <button
              onClick={() => setPendingMode('brainstorm')}
              onMouseEnter={() => setHoveredMode('brainstorm')}
              className="flex flex-col items-center gap-4 transition-transform hover:scale-[1.02] active:scale-[0.98]">
              <div className="relative" style={{ width: 175, height: 360 }}>
                <div className="absolute inset-0 rounded-[28px]" style={{ boxShadow: hoveredMode === 'brainstorm' ? '0 0 0 1.5px rgba(167,139,250,0.7), 0 0 40px rgba(124,58,237,0.35)' : '0 0 0 1.5px rgba(167,139,250,0.25), 0 0 20px rgba(124,58,237,0.1)', transition: 'box-shadow 0.2s' }} />
                <div className="absolute inset-0 rounded-[28px]" style={{ background: '#1c1c1e', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }} />
                <div className="absolute rounded-[22px] overflow-hidden flex flex-col"
                  style={{ top: 6, left: 6, right: 6, bottom: 6 }}>
                  <BrainstormScreen />
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 rounded-full" style={{ top: 9, width: 52, height: 12, background: '#1c1c1e', zIndex: 10 }} />
              </div>
              <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(167,139,250,0.6)' }}>Brainstormer</div>
            </button>

          </div>

          {/* Descrizione + CTA del modo selezionato */}
          <div className="flex flex-col items-center gap-4">
            <div className="text-center" style={{ minHeight: 70 }}>
              <div className="font-black text-white text-2xl mb-2">{info.title}</div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, maxWidth: 480, lineHeight: 1.6 }}>{info.desc}</p>
            </div>
            <button
              onClick={() => setPendingMode(hoveredMode)}
              className="px-10 py-4 rounded-2xl font-black text-white text-base transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{
                background: hoveredMode === 'devil'
                  ? 'linear-gradient(135deg,#dc2626,#991b1b)'
                  : 'linear-gradient(135deg,#7C3AED,#5B21B6)',
                boxShadow: hoveredMode === 'devil'
                  ? '0 6px 30px rgba(220,38,38,0.5)'
                  : '0 6px 30px rgba(124,58,237,0.5)',
                fontSize: 16,
              }}>
              {info.cta}
            </button>
          </div>

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
