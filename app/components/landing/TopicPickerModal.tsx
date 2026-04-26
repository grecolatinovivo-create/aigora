'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { track } from '@vercel/analytics'

const PRESET_TOPICS = [
  "L'intelligenza artificiale renderà le persone più libere o più controllate?",
  "I social media hanno fatto più bene o più male alla democrazia?",
  "Il capitalismo è ancora il sistema migliore per ridurre la povertà?",
]

interface TopicPickerModalProps {
  onClose: () => void
}

export default function TopicPickerModal({ onClose }: TopicPickerModalProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<number>(0)
  const [custom, setCustom] = useState('')

  const activeTopic = custom.trim() || PRESET_TOPICS[selected]

  const handleStart = () => {
    if (!activeTopic) return
    track('demo_topic_selected', {
      topicType: custom.trim() ? 'custom' : 'preset',
      topicIndex: custom.trim() ? -1 : selected,
    })
    router.push(`/demo?topic=${encodeURIComponent(activeTopic)}`)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 10000,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10001,
        width: '100%', maxWidth: 460,
        padding: '0 16px',
        boxSizing: 'border-box',
      }}>
        <div style={{
          background: 'rgba(14,9,25,0.98)',
          border: '1px solid rgba(167,139,250,0.25)',
          borderRadius: 24,
          padding: '28px 28px 24px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.85), 0 0 0 1px rgba(124,58,237,0.08)',
          position: 'relative',
        }}>
          {/* Close */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)', border: 'none',
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
              fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>

          {/* Header */}
          <div style={{ fontSize: 11, fontWeight: 900, color: '#A78BFA', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
            Dibattito
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 6, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            Scegli da cosa partire
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginBottom: 22, lineHeight: 1.5 }}>
            4 AI inizieranno a confrontarsi in tempo reale sul tema che scegli.
          </p>

          {/* Preset topics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {PRESET_TOPICS.map((topic, i) => {
              const isActive = selected === i && !custom.trim()
              return (
                <button
                  key={i}
                  onClick={() => { setSelected(i); setCustom('') }}
                  style={{
                    padding: '11px 14px',
                    borderRadius: 12,
                    border: `1.5px solid ${isActive ? 'rgba(167,139,250,0.65)' : 'rgba(255,255,255,0.08)'}`,
                    background: isActive ? 'rgba(124,58,237,0.16)' : 'rgba(255,255,255,0.03)',
                    color: isActive ? '#e9d5ff' : 'rgba(255,255,255,0.5)',
                    fontSize: 13,
                    textAlign: 'left',
                    cursor: 'pointer',
                    lineHeight: 1.45,
                    transition: 'all 0.12s',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                    border: `2px solid ${isActive ? '#A78BFA' : 'rgba(255,255,255,0.2)'}`,
                    background: isActive ? '#7C3AED' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.12s',
                  }}>
                    {isActive && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
                  </span>
                  {topic}
                </button>
              )
            })}
          </div>

          {/* Custom input */}
          <div style={{ marginBottom: 20, position: 'relative' }}>
            <input
              type="text"
              placeholder="Oppure scrivi la tua domanda…"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && activeTopic) handleStart() }}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 12,
                background: custom.trim() ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${custom.trim() ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.1)'}`,
                color: '#fff',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.15s',
              }}
            />
          </div>

          {/* CTA */}
          <button
            onClick={handleStart}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: 13,
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(135deg,#7C3AED,#5B21B6)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              boxShadow: '0 4px 24px rgba(124,58,237,0.45)',
              letterSpacing: '-0.01em',
              transition: 'opacity 0.15s',
            }}
          >
            Inizia il dibattito →
          </button>

          <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 10, textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
            Nessun account richiesto per la demo
          </p>
        </div>
      </div>
    </>
  )
}
