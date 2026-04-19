'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GlobalToggle({ initial }: { initial: boolean }) {
  const [active, setActive] = useState(initial)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const toggle = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/global-config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forceGeminiPerpGlobal: !active }),
    })
    if (res.ok) {
      setActive(v => !v)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={active ? 'Disattiva: torna a Sonar reale' : 'Attiva: forza Gemini per tutti al posto di Sonar'}
      className="flex items-center gap-2.5 px-4 py-2 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
      style={{
        backgroundColor: active ? 'rgba(26,115,232,0.2)' : 'rgba(255,255,255,0.06)',
        color: active ? '#60a5fa' : 'rgba(255,255,255,0.5)',
        border: `1px solid ${active ? 'rgba(26,115,232,0.45)' : 'rgba(255,255,255,0.12)'}`,
        boxShadow: active ? '0 0 12px rgba(26,115,232,0.2)' : 'none',
      }}>
      <div className="w-8 h-4 rounded-full relative transition-all flex-shrink-0"
        style={{ backgroundColor: active ? '#3b82f6' : 'rgba(255,255,255,0.15)' }}>
        <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
          style={{ left: active ? '17px' : '2px' }} />
      </div>
      <span>Gemini as Perplexity — Globale</span>
      {active && <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(26,115,232,0.3)', color: '#93c5fd' }}>ATTIVO</span>}
    </button>
  )
}
