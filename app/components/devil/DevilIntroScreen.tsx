'use client'
import { useState, useEffect } from 'react'
import type { DevilDifficulty } from '@/app/types/aigora'
import HellGridBg from './HellGridBg'

const DIFFICULTY_LABELS: Record<DevilDifficulty, { emoji: string; label: string; color: string }> = {
  easy:       { emoji: '🟢', label: 'Facile',      color: '#4ade80' },
  medium:     { emoji: '🟡', label: 'Media',       color: '#facc15' },
  impossible: { emoji: '🔴', label: 'Impossibile', color: '#ef4444' },
}

export default function DevilIntroScreen({
  positions,
  difficulty,
  onStart,
  onBack,
}: {
  positions: [string, string]
  difficulty: DevilDifficulty
  onStart: (position: string) => void
  onBack: () => void
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [rerollUsed, setRerollUsed] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [flipping, setFlipping] = useState(false)

  const diff = DIFFICULTY_LABELS[difficulty]
  const position = positions[currentIndex]

  // Flip card animazione all'avvio
  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), 300)
    return () => clearTimeout(t)
  }, [])

  const handleReroll = () => {
    if (rerollUsed || flipping) return
    setFlipping(true)
    setFlipped(false)
    setTimeout(() => {
      setCurrentIndex(1)
      setRerollUsed(true)
      setFlipped(true)
      setFlipping(false)
    }, 400)
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{ background: '#080004' }}
    >
      <HellGridBg />
      {/* Stile flip card */}
      <style>{`
        .devil-card-wrap { perspective: 1000px; }
        .devil-card-inner {
          transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
          position: relative;
        }
        .devil-card-inner.is-flipped { transform: rotateY(180deg); }
        .devil-card-front, .devil-card-back {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .devil-card-back { transform: rotateY(180deg); }
      `}</style>

      {/* Back */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-10 w-9 h-9 flex items-center justify-center rounded-full"
        style={{ background: 'rgba(255,255,255,0.07)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="text-4xl" style={{ filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.6))' }}>😈</div>
          <div className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: 'rgba(239,68,68,0.7)' }}>
            Devil's Advocate
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2">
          <div
            className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
            style={{ background: `${diff.color}18`, color: diff.color, border: `1px solid ${diff.color}40` }}
          >
            {diff.emoji} {diff.label}
          </div>
          <div
            className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            DIFENDI
          </div>
        </div>

        {/* Flip card */}
        <div className="devil-card-wrap w-full" style={{ height: 140 }}>
          <div className={`devil-card-inner w-full h-full ${flipped ? 'is-flipped' : ''}`}>
            {/* Front — carta coperta */}
            <div
              className="devil-card-front absolute inset-0 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <div className="text-4xl opacity-40">🃏</div>
            </div>
            {/* Back — posizione */}
            <div
              className="devil-card-back absolute inset-0 rounded-2xl flex items-center justify-center px-5"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <div className="text-base font-black text-white text-center leading-snug">
                "{position}"
              </div>
            </div>
          </div>
        </div>

        {/* Descrizione */}
        <div className="text-sm text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Devi sostenere questa posizione contro le AI che la attaccheranno.
          <br />
          <span style={{ color: 'rgba(255,255,255,0.5)' }} className="font-black">ANCHE SE NON CI CREDI.</span>
        </div>

        {/* Regole */}
        <div className="flex items-center gap-8 text-center">
          {[['∞', 'round'], ['4', 'AI nemiche'], ['0–10', 'punteggio']].map(([val, label]) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <div className="text-xl font-black text-white">{val}</div>
              <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Bottoni */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={() => onStart(position)}
            disabled={!flipped}
            className="w-full py-3.5 rounded-2xl font-black text-white text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #dc2626, #991b1b)',
              boxShadow: '0 4px 20px rgba(220,38,38,0.4)',
            }}
          >
            Accetta la sfida →
          </button>

          {!rerollUsed && (
            <button
              onClick={handleReroll}
              disabled={flipping}
              className="w-full py-3 rounded-2xl text-sm font-semibold transition-all hover:scale-[1.01] disabled:opacity-30"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              🎲 Ripesca posizione
            </button>
          )}

          {rerollUsed && (
            <div className="text-center text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Nessun altro ripesca disponibile
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
