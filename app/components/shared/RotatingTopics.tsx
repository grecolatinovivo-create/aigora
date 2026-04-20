'use client'
import { useState, useEffect } from 'react'
import { TOPIC_SUGGESTIONS } from '@/app/lib/aiProfiles'

export default function RotatingTopics({ onSelect }: { onSelect: (t: string) => void }) {
  const SLOTS = 6
  const [visible, setVisible] = useState<string[]>(() =>
    [...TOPIC_SUGGESTIONS].sort(() => Math.random() - 0.5).slice(0, SLOTS)
  )
  const [show, setShow] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setShow(false)
      setTimeout(() => {
        setVisible(prev => {
          const others = TOPIC_SUGGESTIONS.filter(t => !prev.includes(t))
          const pool = others.length >= SLOTS ? others : TOPIC_SUGGESTIONS
          return [...pool].sort(() => Math.random() - 0.5).slice(0, SLOTS)
        })
        setShow(true)
      }, 600)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ marginBottom: '8px', transition: 'opacity 0.6s ease', opacity: show ? 1 : 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(3, 44px)', gap: '6px' }}>
      {visible.map((t, i) => (
        <button key={i} onClick={() => onSelect(t)}
          className="text-center px-3 rounded-2xl border border-white/10 text-white/45 hover:text-white/75 hover:border-white/25 transition-colors flex items-center justify-center"
          style={{ fontSize: 'clamp(9px, 2.5vw, 11px)', lineHeight: 1.3, overflow: 'hidden' }}>
          {t}
        </button>
      ))}
    </div>
  )
}
