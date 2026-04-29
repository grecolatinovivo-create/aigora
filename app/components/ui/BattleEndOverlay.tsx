'use client'
// BattleEndOverlay — overlay cinematico "BATTAGLIA CONCLUSA"
// Appare alla fine del dibattito Arena prima di mostrare la sintesi.
// Si auto-dimette dopo ~2.8s.

import { useEffect, useState } from 'react'
import { AI_COLOR } from '@/app/lib/aiProfiles'

interface BattleEndOverlayProps {
  turnCount: number
  aiIds: string[]
  onDone: () => void
}

export default function BattleEndOverlay({ turnCount, aiIds, onDone }: BattleEndOverlayProps) {
  const [visible, setVisible] = useState(false)
  const [linesVisible, setLinesVisible] = useState(false)

  useEffect(() => {
    // Ingresso
    const t1 = setTimeout(() => setVisible(true), 60)
    // Mostra le statistiche dopo l'ingresso principale
    const t2 = setTimeout(() => setLinesVisible(true), 520)
    // Uscita
    const t3 = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 500)
    }, 2800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      zIndex: 9998,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(7,7,15,0.96)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.45s ease',
      pointerEvents: visible ? 'all' : 'none',
    }}>
      {/* Linea decorativa superiore */}
      <div style={{
        width: visible ? 240 : 0,
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.6), transparent)',
        marginBottom: 32,
        transition: 'width 0.7s ease 0.2s',
      }} />

      {/* BATTAGLIA CONCLUSA */}
      <div style={{
        fontSize: 'clamp(26px, 7vw, 42px)',
        fontWeight: 900,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: '#fff',
        textShadow: '0 0 60px rgba(167,139,250,0.5)',
        transform: visible ? 'scale(1)' : 'scale(0.88)',
        transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        textAlign: 'center',
        lineHeight: 1.1,
      }}>
        BATTAGLIA
        <br />
        CONCLUSA
      </div>

      {/* Stats */}
      <div style={{
        marginTop: 28,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        opacity: linesVisible ? 1 : 0,
        transform: linesVisible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}>
        {/* Turni */}
        <div style={{
          fontSize: 13, color: 'rgba(255,255,255,0.45)',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          fontWeight: 600,
        }}>
          {turnCount} {turnCount === 1 ? 'turno' : 'turni'} disputati
        </div>

        {/* AI avatars */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {aiIds.map((id) => {
            const color = AI_COLOR[id] ?? '#888'
            return (
              <div key={id} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: `radial-gradient(circle at 30% 30%, ${color}cc, ${color}66)`,
                border: `1.5px solid ${color}`,
                boxShadow: `0 0 12px ${color}44`,
              }} />
            )
          })}
        </div>
      </div>

      {/* Linea decorativa inferiore */}
      <div style={{
        width: visible ? 240 : 0,
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.6), transparent)',
        marginTop: 32,
        transition: 'width 0.7s ease 0.2s',
      }} />
    </div>
  )
}
