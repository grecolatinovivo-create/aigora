'use client'
import { useState } from 'react'
import type { DevilDifficulty } from '@/app/types/aigora'

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

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(180deg, #0d0005 0%, #1a0008 100%)' }}
    >
      {/* Back */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 w-9 h-9 flex items-center justify-center rounded-full"
        style={{ background: 'rgba(255,255,255,0.07)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className="w-full max-w-sm flex flex-col items-center gap-7">
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
              onClick={() => setSelected(level.id)}
              disabled={loading}
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
          disabled={!selected || loading}
          className="w-full py-3.5 rounded-2xl font-black text-white text-sm transition-all disabled:opacity-30"
          style={{
            background: selected ? 'linear-gradient(135deg, #dc2626, #991b1b)' : 'rgba(255,255,255,0.1)',
            boxShadow: selected ? '0 4px 20px rgba(220,38,38,0.4)' : 'none',
          }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Generazione posizione…
            </span>
          ) : (
            'Genera la tua posizione →'
          )}
        </button>
      </div>
    </div>
  )
}
