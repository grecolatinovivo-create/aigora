'use client'
import { useState, useEffect } from 'react'
import { AI_OPTIONS } from '@/app/lib/aiProfiles'
import { SFX } from '@/app/lib/audioEngine'
import SlotReel from './SlotReel'

export default function RouletteScreen({ teamAAI, rouletteSlots, rouletteSettled, arbiter, onContinue, ready }: {
  teamAAI: string
  rouletteSlots: string[]
  rouletteSettled: boolean[]
  arbiter: string
  onContinue: () => void
  ready: boolean
}) {
  const myAI = AI_OPTIONS.find(a => a.id === teamAAI)
  const allSettled = rouletteSettled[0] && rouletteSettled[1]
  const arbAI = AI_OPTIONS.find(a => a.id === arbiter)
  const [showArbiter, setShowArbiter] = useState(false)

  useEffect(() => {
    if (allSettled) {
      const t = setTimeout(() => setShowArbiter(true), 1000)
      return () => clearTimeout(t)
    } else {
      setShowArbiter(false)
    }
  }, [allSettled])

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 py-6 gap-5">
      <div className="text-center">
        <div className="text-2xl font-black text-white mb-1" style={{ letterSpacing: '-0.5px' }}>
          {allSettled ? 'Il dado è tratto.' : 'Il destino decide…'}
        </div>
        <div className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {allSettled ? 'Buona fortuna.' : 'Chi compone la squadra B?'}
        </div>
      </div>

      {/* La tua AI — fissa */}
      <div className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl"
        style={{ background: `${myAI?.color}15`, border: `1px solid ${myAI?.color}40` }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs flex-shrink-0"
          style={{ background: myAI?.color }}>
          {teamAAI === 'gemini' ? 'Ge' : myAI?.name[0]}
        </div>
        <div>
          <div className="text-[9px] font-black uppercase tracking-wide" style={{ color: '#60a5fa' }}>TUO ALLEATO</div>
          <div className="text-sm font-black text-white">{myAI?.name}</div>
        </div>
        <div className="ml-auto text-green-400 font-black">✓</div>
      </div>

      {/* Slot 1 */}
      <div className="w-full">
        <div className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: '#f87171' }}>
          SQUADRA B — AI 1
        </div>
        <SlotReel finalId={rouletteSlots[0]} rolling={!rouletteSettled[0]} settled={rouletteSettled[0]} delay={0} />
      </div>

      {/* Slot 2 */}
      <div className="w-full" style={{ opacity: rouletteSettled[0] ? 1 : 0.3, transition: 'opacity 0.4s' }}>
        <div className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: '#f87171' }}>
          SQUADRA B — AI 2
        </div>
        <SlotReel finalId={rouletteSlots[1] ?? ''} rolling={rouletteSettled[0] && !rouletteSettled[1]} settled={rouletteSettled[1]} delay={300} />
      </div>

      {/* Arbitro */}
      <div className="w-full" style={{ visibility: showArbiter && arbAI ? 'visible' : 'hidden', transition: 'opacity 0.5s', opacity: showArbiter && arbAI ? 1 : 0 }}>
        <div className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: '#A78BFA' }}>
          ARBITRO
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-xs flex-shrink-0"
            style={{ background: '#A78BFA', boxShadow: allSettled ? '0 0 16px rgba(167,139,250,0.5)' : 'none' }}>
            {arbAI ? (arbAI.id === 'gemini' ? 'Ge' : arbAI.name[0]) : ''}
          </div>
          <div>
            <div className="text-xs font-black text-white">{arbAI?.name}</div>
            <div className="text-[9px]" style={{ color: 'rgba(167,139,250,0.7)' }}>Giudice del dibattito</div>
          </div>
          <div className="ml-auto text-purple-400 font-black text-lg">arb</div>
        </div>
      </div>

      {/* Pulsante Continua */}
      <button onClick={() => { SFX.click(); onContinue() }} disabled={!ready || !showArbiter}
        className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-all"
        style={{ visibility: showArbiter ? 'visible' : 'hidden', background: ready ? 'linear-gradient(135deg, #7C3AED, #5B21B6)' : 'rgba(255,255,255,0.08)', boxShadow: ready ? '0 4px 20px rgba(124,58,237,0.4)' : 'none', opacity: showArbiter ? (ready ? 1 : 0.5) : 0 }}>
        {ready ? 'Continua →' : 'Preparazione…'}
      </button>
    </div>
  )
}
