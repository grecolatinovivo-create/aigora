'use client'
import { useState, useEffect, useRef } from 'react'
import { AI_OPTIONS } from '@/app/lib/aiProfiles'
import { SFX } from '@/app/lib/audioEngine'

export default function SlotReel({ finalId, rolling, settled, delay }: {
  finalId: string
  rolling: boolean
  settled: boolean
  delay: number
}) {
  const [displayIdx, setDisplayIdx] = useState(0)
  const [speed, setSpeed] = useState(60)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const names = AI_OPTIONS.map(a => a.name)

  useEffect(() => {
    if (!rolling) return
    setSpeed(60)
    intervalRef.current = setInterval(() => {
      setDisplayIdx(i => (i + 1) % names.length)
      SFX.tick()
    }, 60)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [rolling])

  useEffect(() => {
    if (!settled) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    const speeds = [80, 120, 180, 260, 360, 500]
    let si = 0
    const slowDown = () => {
      if (si >= speeds.length) {
        setDisplayIdx(AI_OPTIONS.findIndex(a => a.id === finalId))
        SFX.settle()
        return
      }
      setDisplayIdx(i => (i + 1) % names.length)
      SFX.tick()
      si++
      setTimeout(slowDown, speeds[si - 1])
    }
    setTimeout(slowDown, delay)
  }, [settled, finalId, delay])

  const currentAI = AI_OPTIONS[displayIdx % AI_OPTIONS.length]
  const isFinal = settled && currentAI?.id === finalId

  return (
    <div className="relative overflow-hidden flex items-center justify-center rounded-2xl"
      style={{ height: 72, background: isFinal ? `${currentAI.color}20` : 'rgba(255,255,255,0.05)', border: `2px solid ${isFinal ? currentAI.color : 'rgba(255,255,255,0.1)'}`, transition: 'all 0.4s' }}>
      <div className="absolute top-0 left-0 right-0 h-5 pointer-events-none z-10"
        style={{ background: 'linear-gradient(to bottom, rgba(13,13,20,0.95), transparent)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-5 pointer-events-none z-10"
        style={{ background: 'linear-gradient(to top, rgba(13,13,20,0.95), transparent)' }} />
      <div className="absolute left-4 right-4 h-px z-5" style={{ background: isFinal ? `${currentAI.color}60` : 'rgba(255,255,255,0.1)' }} />
      <div className="flex items-center gap-3 px-4 z-20">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black flex-shrink-0 transition-all duration-100"
          style={{ background: currentAI?.color, fontSize: 11, boxShadow: isFinal ? `0 0 20px ${currentAI.color}80` : 'none' }}>
          {currentAI?.id === 'gemini' ? 'Ge' : currentAI?.name[0]}
        </div>
        <div className="font-black text-lg transition-all duration-100"
          style={{ color: isFinal ? 'white' : 'rgba(255,255,255,0.7)', textShadow: isFinal ? `0 0 20px ${currentAI?.color}` : 'none' }}>
          {currentAI?.name}
        </div>
        {isFinal && <div className="text-green-400 text-2xl scale-in ml-auto">✓</div>}
      </div>
    </div>
  )
}
