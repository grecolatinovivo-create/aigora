'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { GameMode } from '@/app/types/aigora'

function HellGridBg() {
  return (
    <>
      {/* Piano prospettico */}
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
      {/* Orizzonte */}
      <div style={{
        position: 'absolute', top: '35%', left: 0, right: 0, height: '2px',
        background: 'rgba(220,0,30,0.7)',
        boxShadow: '0 0 40px 16px rgba(180,0,20,0.5), 0 0 120px 60px rgba(100,0,10,0.3)',
        animation: 'hell-horizon-pulse 3s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 70% 80% at 50% 50%, transparent 30%, rgba(4,0,2,0.85) 100%)',
        pointerEvents: 'none',
      }} />
    </>
  )
}

const PAID_TIERS = ['pro', 'premium', 'admin', 'freemium', 'max']

export default function ModeSelect({ onSelect, onClose, userPlan }: { onSelect: (mode: GameMode) => void; onClose: () => void; userPlan?: string }) {
  const t = useTranslations('modeSelect')
  const tLanding = useTranslations('landing')
  const [selected, setSelected] = useState<GameMode>('2v2')
  const isPaid = PAID_TIERS.includes(userPlan ?? '')

  const handleSelect = (mode: GameMode) => {
    if (!isPaid && mode === 'devil') {
      window.location.href = '/pricing'
      return
    }
    onSelect(mode)
  }

  return (
    <>
    <div style={{ position: 'fixed', inset: '-200px', background: '#07070f', zIndex: 9998, pointerEvents: 'none' }} />
    <div className="fixed inset-0 z-[9999] flex flex-col overflow-hidden"
      style={{ backgroundColor: '#07070f' }}>

      {/* Header */}
      <div className="flex-shrink-0 flex items-center px-5 border-b"
        style={{ paddingTop: 'max(14px, env(safe-area-inset-top))', paddingBottom: '12px', borderColor: 'rgba(255,255,255,0.07)' }}>
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="flex-1 text-center">
          <div className="font-black text-base text-white">{t('headerTitle')}</div>
          <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('headerSubtitle')}</div>
        </div>
        <div className="w-9" />
      </div>

      {/* ── LAYOUT MOBILE: card verticali ── */}
      <div className="lg:hidden flex-1 flex flex-col px-4 py-4 gap-3 overflow-hidden" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        {/* Card 2 vs 2 — attiva */}
        <button onClick={() => handleSelect('2v2')}
          className="flex-1 flex flex-col justify-between px-5 py-4 rounded-3xl active:scale-[0.98] transition-all"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(91,33,182,0.1) 100%)', border: '1.5px solid rgba(167,139,250,0.35)', boxShadow: '0 4px 20px rgba(124,58,237,0.15)', minHeight: 0 }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: '#A78BFA' }}>{t('twoVsTwo.tag')}</div>
              <div className="text-xl font-black text-white leading-tight">{t('twoVsTwo.title')}</div>
            </div>
            <div className="flex gap-1">
              {[['#7C3AED','C'],['#10A37F','G']].map(([c,l]) => (
                <div key={l} className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black" style={{ background: c }}>{l}</div>
              ))}
            </div>
          </div>
          <div className="text-[12px] leading-relaxed mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{t('twoVsTwo.body')}</div>
          <div className="flex items-center justify-end mt-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)' }}>
              {t('twoVsTwo.cta')} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </div>
        </button>
        {/* Card Classico — soon */}
        <div className="flex-1 flex flex-col rounded-3xl relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.10)', cursor: 'not-allowed', minHeight: 0 }}>
          <div className="absolute top-4 left-5 text-[11px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>{t('classic.tag')}</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="font-black uppercase" style={{ fontSize: 44, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.22)' }}>{t('classic.soon')}</div>
          </div>
        </div>
        {/* Card Devil's Advocate — attiva */}
        <button onClick={() => handleSelect('devil')}
          className="flex-1 flex flex-col justify-between px-5 py-4 rounded-3xl active:scale-[0.98] transition-all relative overflow-hidden"
          style={{
            border: '1.5px solid rgba(239,68,68,0.35)',
            boxShadow: '0 4px 20px rgba(239,68,68,0.15)',
            minHeight: 0,
            background: '#080004',
          }}>
          <HellGridBg />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: '#ef4444' }}>{t('devil.tag')}</div>
              <div className="text-xl font-black text-white leading-tight">{t('devil.title')}</div>
            </div>
            <div className="text-2xl" style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.6))' }}>😈</div>
          </div>
          <div className="relative z-10 text-[12px] leading-relaxed mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>{t('devil.body')}</div>
          <div className="relative z-10 flex items-center justify-between mt-3">
            <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(239,68,68,0.5)' }}>{t('devil.poweredBy')}</div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)' }}>
              {t('devil.cta')} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </div>
        </button>

      </div>

      {/* ── LAYOUT DESKTOP: 3 mock iPhone affiancati ── */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center gap-10 px-8 py-6 overflow-hidden">
        {/* Titolo */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-[11px] font-medium text-purple-300 border border-purple-500/30"
            style={{ backgroundColor: 'rgba(124,58,237,0.12)' }}>
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
            {t('badge')}
          </div>
          <h1 className="font-black text-white" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', lineHeight: 1.1, marginBottom: 12 }}>{t('title')}</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>{t('subtitle')}</p>
        </div>

        {/* 3 mock iPhone */}
        <div className="flex items-end justify-center gap-8">

          {/* ── CLASSICO — grigio, SOON ── */}
          <div className="flex flex-col items-center gap-4" style={{ opacity: 0.45, cursor: 'not-allowed' }}>
            <div className="relative" style={{ width: 200, height: 410 }}>
              {/* Cornice */}
              <div className="absolute inset-0 rounded-[32px]" style={{ background: '#1c1c1e', boxShadow: '0 0 0 1.5px #3a3a3c, 0 20px 60px rgba(0,0,0,0.6)' }} />
              {/* Schermo */}
              <div className="absolute rounded-[26px] overflow-hidden flex flex-col items-center justify-center"
                style={{ top: 6, left: 6, right: 6, bottom: 6, background: '#111' }}>
                <div className="font-black uppercase text-center" style={{ fontSize: 36, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)' }}>{t('classic.soon')}</div>
              </div>
              {/* Notch */}
              <div className="absolute left-1/2 -translate-x-1/2 rounded-full" style={{ top: 10, width: 60, height: 14, background: '#1c1c1e', zIndex: 10 }} />
            </div>
            <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>{t('classic.tag')}</div>
          </div>

          {/* ── 2 VS 2 — attivo, più grande, selezionato ── */}
          <button onClick={() => handleSelect('2v2')} className="flex flex-col items-center gap-5 transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <div className="relative" style={{ width: 240, height: 490 }}>
              {/* Glow */}
              <div className="absolute inset-0 rounded-[38px]" style={{ boxShadow: '0 0 0 2px rgba(167,139,250,0.6), 0 0 60px rgba(124,58,237,0.4)', borderRadius: 38 }} />
              {/* Cornice */}
              <div className="absolute inset-0 rounded-[38px]" style={{ background: '#1c1c1e', boxShadow: '0 30px 80px rgba(0,0,0,0.7)' }} />
              {/* Schermo */}
              <div className="absolute rounded-[32px] overflow-hidden flex flex-col"
                style={{ top: 7, left: 7, right: 7, bottom: 7, background: '#0d0d14' }}>
                {/* Header chat */}
                <div className="flex items-center justify-between px-3 py-2" style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,80,0,0.2)' }}>
                  <div className="text-[8px] font-black px-2 py-0.5 rounded" style={{ color: '#3b82f6', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>SQUADRA A</div>
                  <div className="text-sm font-black text-white">2 — 1</div>
                  <div className="text-[8px] font-black px-2 py-0.5 rounded" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>SQUADRA B</div>
                </div>
                {/* Membri */}
                <div className="flex items-center justify-between px-3 py-1.5" style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex flex-col gap-0.5">
                    {[['#F59E0B','Alex'],['#7C3AED','Claude']].map(([c,n]) => (
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
                {/* Messaggi */}
                <div className="flex-1 flex flex-col justify-end gap-1 px-2 py-2">
                  <div className="self-start max-w-[75%] px-2.5 py-1.5 rounded-2xl rounded-tl-sm text-[8px] leading-relaxed" style={{ background: 'rgba(124,58,237,0.25)', color: 'rgba(255,255,255,0.85)' }}>{tLanding('mock.twoMsg1')}</div>
                  <div className="self-end max-w-[75%] px-2.5 py-1.5 rounded-2xl rounded-tr-sm text-[8px] leading-relaxed" style={{ background: 'rgba(239,68,68,0.2)', color: 'rgba(255,255,255,0.85)' }}>{tLanding('mock.twoMsg2')}</div>
                  <div className="self-start max-w-[75%] px-2.5 py-1.5 rounded-2xl rounded-tl-sm text-[8px] italic leading-relaxed" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>Claude: …</div>
                  <div className="self-end max-w-[75%] px-2.5 py-1.5 rounded-2xl rounded-tr-sm text-[8px] italic leading-relaxed" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>GPT: …</div>
                  {/* Arbitro */}
                  <div className="mt-1 px-2.5 py-2 rounded-2xl text-[7px] leading-relaxed" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: 'rgba(251,191,36,0.9)' }}>
                    <span className="font-black">🏆 {tLanding('mock.judgeLabel')}</span><br/>{tLanding('mock.twoJudge')}
                  </div>
                </div>
                {/* Input */}
                <div className="flex items-center gap-1.5 px-2 py-2" style={{ background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex-1 px-3 py-1.5 rounded-full text-[8px]" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>{t('yourArgument')}</div>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)' }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                  </div>
                </div>
              </div>
              {/* Notch */}
              <div className="absolute left-1/2 -translate-x-1/2 rounded-full" style={{ top: 12, width: 72, height: 16, background: '#1c1c1e', zIndex: 10 }} />
            </div>
            <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(167,139,250,0.8)' }}>{t('twoVsTwo.tag')}</div>
          </button>

          {/* ── DEVIL'S ADVOCATE — attivo ── */}
          <button onClick={() => handleSelect('devil')} className="flex flex-col items-center gap-4 transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <div className="relative" style={{ width: 200, height: 410 }}>
              {/* Glow rosso */}
              <div className="absolute inset-0 rounded-[32px]" style={{ boxShadow: '0 0 0 1.5px rgba(239,68,68,0.5), 0 0 40px rgba(239,68,68,0.2)', borderRadius: 32 }} />
              {/* Cornice */}
              <div className="absolute inset-0 rounded-[32px]" style={{ background: '#1c1c1e', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }} />
              {/* Schermo */}
              <div className="absolute rounded-[26px] overflow-hidden flex flex-col items-center justify-center gap-3"
                style={{ top: 6, left: 6, right: 6, bottom: 6, background: '#080004' }}>
                <HellGridBg />
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="text-4xl" style={{ filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.8))' }}>😈</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-center px-4" style={{ color: 'rgba(239,68,68,0.8)' }}>{t('devil.title')}</div>
                  <div className="px-3 py-1 rounded-full text-[9px] font-black" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>{tLanding('mock.devilEnemies')}</div>
                </div>
              </div>
              {/* Notch */}
              <div className="absolute left-1/2 -translate-x-1/2 rounded-full" style={{ top: 10, width: 60, height: 14, background: '#1c1c1e', zIndex: 10 }} />
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(239,68,68,0.7)' }}>{t('devil.tag')}</div>
              <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(239,68,68,0.4)' }}>{t('devil.poweredBy')}</div>
            </div>
          </button>

        </div>

        {/* Descrizione + CTA */}
        <div className="flex flex-col items-center gap-4">
          <div className="text-center">
            <div className="font-black text-white text-2xl mb-2">{t('descTitle')}</div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, maxWidth: 480, lineHeight: 1.6 }}>
              {t('descBody')}
            </p>
          </div>
          <button onClick={() => handleSelect('2v2')}
            className="px-10 py-4 rounded-2xl font-black text-white text-base transition-all hover:scale-[1.03] active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', boxShadow: '0 6px 30px rgba(124,58,237,0.5)', fontSize: 16 }}>
            {t('chooseTeams')}
          </button>
        </div>
      </div>

    </div>
    </>
  )
}
