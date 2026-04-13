'use client'
import { useState } from 'react'

interface ActionBarProps {
  onIntervene: (text: string) => void
  onSynthesize: () => void
}

export default function ActionBar({ onIntervene, onSynthesize }: ActionBarProps) {
  const [isInterventionOpen, setIsInterventionOpen] = useState(false)
  const [interventionText, setInterventionText] = useState('')

  const handleIntervene = () => {
    if (interventionText.trim()) {
      onIntervene(interventionText.trim())
      setInterventionText('')
      setIsInterventionOpen(false)
    }
  }

  return (
    <div className="px-4 pb-4 pt-2 border-t border-white/5">
      {isInterventionOpen ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={interventionText}
            onChange={(e) => setInterventionText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleIntervene()}
            placeholder="Scrivi il tuo intervento…"
            className="flex-1 bg-white/5 border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-white/40 placeholder:text-white/30"
          />
          <button
            onClick={handleIntervene}
            className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
          >
            Invia
          </button>
          <button
            onClick={() => setIsInterventionOpen(false)}
            className="text-white/40 hover:text-white/70 px-2 text-sm transition-colors"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setIsInterventionOpen(true)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-white/8 hover:bg-white/15 text-white/70 hover:text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-all active:scale-95 border border-white/10"
          >
            <span>✏️</span>
            <span>Intervieni</span>
          </button>
          <button
            onClick={onSynthesize}
            className="flex-1 flex items-center justify-center gap-1.5 bg-white/8 hover:bg-white/15 text-white/70 hover:text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-all active:scale-95 border border-white/10"
          >
            <span>📋</span>
            <span>Sintetizza</span>
          </button>
        </div>
      )}
    </div>
  )
}
