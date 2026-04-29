'use client'
// UpgradeDrawer — sheet bottom che mostra la value prop di una modalità Pro
// Appare quando un utente Free tocca una card bloccata.
// Non redirige a /pricing direttamente: prima mostra cosa si sblocca.

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'

export type UpgradeMode = 'devil' | 'brainstorm'

interface UpgradeDrawerProps {
  mode: UpgradeMode
  onClose: () => void
}

const MODE_DATA: Record<UpgradeMode, {
  color: string
  icon: React.ReactNode
  title: string
  tagline: string
  perks: string[]
  price: string
}> = {
  devil: {
    color: '#F87171',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
        stroke="#F87171" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
      </svg>
    ),
    title: "Devil's Advocate",
    tagline: 'Difendi una tesi che non credi. Allenati a ragionare sotto pressione.',
    perks: [
      '3 livelli di difficoltà: Normale, Difficile, Brutale',
      'Claude ti attacca senza pietà — tu devi reggere',
      'Verdetto finale con punteggio argomentativo',
      'La storia dimostra chi vale sotto pressione',
    ],
    price: 'Piano Pro · da €9.90/mese',
  },
  brainstorm: {
    color: '#FCD34D',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
        stroke="#FCD34D" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="9" y1="18" x2="15" y2="18"/>
        <line x1="10" y1="22" x2="14" y2="22"/>
        <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
      </svg>
    ),
    title: 'Brainstormer',
    tagline: '4 AI che si sfidano per trovare la soluzione migliore alla tua domanda.',
    perks: [
      '4 AI in parallelo — Claude, GPT, Gemini, Perplexity',
      '2 round di dibattito + sintesi finale',
      'Foglio di idee salvato in cronologia',
      'Allegati supportati: immagini e documenti',
    ],
    price: 'Piano Pro · da €9.90/mese',
  },
}

export default function UpgradeDrawer({ mode, onClose }: UpgradeDrawerProps) {
  const router  = useRouter()
  const locale  = useLocale()
  const data    = MODE_DATA[mode]
  const backdropRef = useRef<HTMLDivElement>(null)
  const sheetRef    = useRef<HTMLDivElement>(null)

  // Animazione entrata
  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet) return
    sheet.style.transform = 'translateY(100%)'
    sheet.style.transition = 'none'
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        sheet.style.transition = 'transform 0.38s cubic-bezier(0.32,0.72,0,1)'
        sheet.style.transform = 'translateY(0)'
      })
    })
  }, [])

  const close = () => {
    const sheet = sheetRef.current
    if (sheet) {
      sheet.style.transition = 'transform 0.28s cubic-bezier(0.32,0.72,0,1)'
      sheet.style.transform = 'translateY(100%)'
    }
    setTimeout(onClose, 260)
  }

  const goToPricing = () => {
    close()
    setTimeout(() => router.push(`/${locale}/pricing`), 260)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={close}
        style={{
          position: 'fixed', inset: 0, zIndex: 8000,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          animation: 'ud-fade-in 0.25s ease forwards',
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          zIndex: 8001,
          background: 'linear-gradient(180deg, rgba(14,14,24,0.99) 0%, #07070f 100%)',
          borderTop: `1px solid ${data.color}28`,
          borderRadius: '24px 24px 0 0',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--bottom-nav-height, 0px) + 16px)',
          boxShadow: `0 -8px 40px ${data.color}18`,
        }}
      >
        {/* Handle */}
        <div style={{
          display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4,
        }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: 'rgba(255,255,255,0.15)',
          }} />
        </div>

        <div style={{ padding: '16px 24px 0' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: `${data.color}15`,
              border: `1px solid ${data.color}28`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {data.icon}
            </div>
            <div>
              <div style={{
                fontSize: 10, fontWeight: 900, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: data.color, marginBottom: 2,
              }}>
                Solo Pro
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
                {data.title}
              </div>
            </div>
            <button
              onClick={close}
              style={{
                marginLeft: 'auto', width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.07)', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Tagline */}
          <p style={{
            fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.55,
            margin: '12px 0 16px',
          }}>
            {data.tagline}
          </p>

          {/* Perks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
            {data.perks.map((perk, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: `${data.color}18`, border: `1px solid ${data.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                    stroke={data.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                  {perk}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={goToPricing}
            style={{
              width: '100%', padding: '15px', borderRadius: 16, border: 'none',
              fontSize: 15, fontWeight: 900, color: '#fff',
              background: `linear-gradient(135deg, ${data.color}cc, ${data.color}88)`,
              boxShadow: `0 4px 24px ${data.color}40`,
              cursor: 'pointer', marginBottom: 10,
            }}>
            Passa a Pro — Sblocca {data.title} →
          </button>

          {/* Price fine print */}
          <p style={{
            textAlign: 'center', fontSize: 11,
            color: 'rgba(255,255,255,0.28)', margin: 0,
          }}>
            {data.price} · Annulla in qualsiasi momento
          </p>
        </div>
      </div>

      <style>{`
        @keyframes ud-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  )
}
