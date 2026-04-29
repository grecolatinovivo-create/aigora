'use client'
import { useState, useEffect } from 'react'
import type { DevilDifficulty } from '@/app/types/aigora'
import HellGridBg from './HellGridBg'
import { devilSounds } from './useDevilSounds'

const LEVELS: { id: DevilDifficulty; emoji: string; label: string; sub: string; color: string; bg: string }[] = [
  {
    id: 'easy',
    emoji: '🟢',
    label: 'Facile',
    sub: 'Scomoda ma difendibile con buona logica',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.08)',
  },
  {
    id: 'medium',
    emoji: '🟡',
    label: 'Media',
    sub: 'Controversa — richiede argomenti solidi',
    color: '#facc15',
    bg: 'rgba(250,204,21,0.08)',
  },
  {
    id: 'impossible',
    emoji: '🔴',
    label: 'Impossibile',
    sub: 'Quasi indifendibile — solo per masochisti',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.10)',
  },
]

const TAUNT_LINES = [
  'sta cercando la posizione più indifendibile…',
  'sta scavando nel lato oscuro dell\'umanità…',
  'sta scegliendo come farti soffrire…',
  'sta selezionando la tua rovina…',
  'sta consultando i demoni…',
]

function GrokLoadingScreen() {
  const [lineIndex, setLineIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    devilSounds.playLaugh(0.6)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setLineIndex(i => (i + 1) % TAUNT_LINES.length)
        setVisible(true)
      }, 300)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#080004' }}>

      {/* Hell grid */}
      <div style={{ position: 'absolute', bottom: 0, left: '-50%', right: '-50%', height: '60%', perspective: '600px', perspectiveOrigin: '50% 0%', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', inset: 0,
          transform: 'rotateX(55deg)', transformOrigin: '50% 0%',
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 119px, rgba(160,0,20,0.5) 120px), ' +
            'repeating-linear-gradient(90deg, transparent, transparent 119px, rgba(160,0,20,0.5) 120px)',
          backgroundSize: '120px 120px',
          animation: 'hell-grid-scroll 1.8s linear infinite',
        }} />
      </div>
      {/* Orizzonte */}
      <div style={{
        position: 'absolute', top: '40%', left: 0, right: 0, height: '2px',
        background: 'rgba(220,0,30,0.8)',
        boxShadow: '0 0 60px 20px rgba(180,0,20,0.6), 0 0 160px 80px rgba(100,0,10,0.3)',
        animation: 'hell-horizon-pulse 3s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      {/* Vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 75% 85% at 50% 50%, transparent 25%, rgba(4,0,2,0.9) 100%)', pointerEvents: 'none' }} />

      {/* Contenuto centrale */}
      <div className="relative z-10 flex flex-col items-center gap-6 text-center px-8">

        {/* GROK — testo enorme */}
        <div style={{
          fontSize: 'clamp(5rem, 22vw, 9rem)',
          fontWeight: 900,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          color: '#dc2626',
          textShadow: '0 0 40px rgba(220,38,38,0.8), 0 0 100px rgba(180,0,20,0.4)',
          animation: 'hell-horizon-pulse 2s ease-in-out infinite',
        }}>
          GROK
        </div>

        {/* Tagline rotante */}
        <div style={{
          minHeight: '1.5rem',
          transition: 'opacity 0.3s',
          opacity: visible ? 1 : 0,
        }}>
          <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {TAUNT_LINES[lineIndex]}
          </span>
        </div>

        {/* Tre punti di caricamento */}
        <div className="flex gap-2 mt-2">
          {[0, 200, 400].map(d => (
            <div key={d} className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: '#dc2626', animationDelay: `${d}ms`, boxShadow: '0 0 8px rgba(220,38,38,0.8)' }} />
          ))}
        </div>

        {/* Emoji */}
        <div className="text-3xl mt-2" style={{ filter: 'drop-shadow(0 0 16px rgba(239,68,68,0.9))' }}>😈</div>
      </div>
    </div>
  )
}

export default function DevilDifficultyScreen({
  onSelect,
  onBack,
  loading,
}: {
  onSelect: (difficulty: DevilDifficulty) => void
  onBack: () => void
  loading: boolean
}) {
  const [selected, setSelected] = useState<DevilDifficulty | null>(null)

  const handleConfirm = () => {
    if (selected && !loading) onSelect(selected)
  }

  // Schermata Grok — prende tutto lo spazio mentre l'API lavora
  if (loading) return <GrokLoadingScreen />

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{ background: '#080004', paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <HellGridBg />
      {/* Back — BUG-T2/T3 fix: usa safe-area-inset-top per non finire sotto il notch */}
      <button
        onClick={onBack}
        className="absolute left-4 w-9 h-9 flex items-center justify-center rounded-full"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 8px)', background: 'rgba(255,255,255,0.07)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-7">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="text-5xl" style={{ filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.6))' }}>😈</div>
          <div className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: 'rgba(239,68,68,0.7)' }}>
            Devil's Advocate
          </div>
          <div className="text-white font-bold text-lg mt-1">Scegli la difficoltà</div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Determina quanto sarà indifendibile la posizione
          </div>
        </div>

        {/* Livelli */}
        <div className="w-full flex flex-col gap-3">
          {LEVELS.map(level => (
            <button
              key={level.id}
              onClick={() => { devilSounds.playClick(); setSelected(level.id) }}
              className="w-full px-4 py-4 rounded-2xl text-left transition-all"
              style={{
                background: selected === level.id ? level.bg : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${selected === level.id ? level.color : 'rgba(255,255,255,0.08)'}`,
                transform: selected === level.id ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{level.emoji}</span>
                <div className="flex-1">
                  <div className="font-black text-sm" style={{ color: selected === level.id ? level.color : 'white' }}>
                    {level.label}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {level.sub}
                  </div>
                </div>
                {selected === level.id && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: level.color }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleConfirm}
          disabled={!selected}
          className="w-full py-3.5 rounded-2xl font-black text-white text-sm transition-all disabled:opacity-30"
          style={{
            background: selected ? 'linear-gradient(135deg, #dc2626, #991b1b)' : 'rgba(255,255,255,0.1)',
            boxShadow: selected ? '0 4px 20px rgba(220,38,38,0.4)' : 'none',
          }}
        >
          Genera la tua posizione →
        </button>
      </div>
    </div>
  )
}
