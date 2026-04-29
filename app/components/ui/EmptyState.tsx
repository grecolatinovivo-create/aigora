'use client'
// EmptyState — componente riusabile per stati vuoti / errori / caricamento
// Usato da: cronologia vuota, sessione in attesa, errore di rete

import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  body?: string
  action?: { label: string; onClick: () => void }
  accentColor?: string
}

export function EmptyState({ icon, title, body, action, accentColor = '#A78BFA' }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center',
      padding: '48px 32px', gap: 12,
      animation: 'es-fade-in 0.35s ease forwards',
    }}>
      {/* Icona con alone */}
      <div style={{
        width: 60, height: 60, borderRadius: 18,
        background: `${accentColor}12`,
        border: `1px solid ${accentColor}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 4,
      }}>
        {icon}
      </div>

      <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>
        {title}
      </div>

      {body && (
        <div style={{
          fontSize: 13, color: 'rgba(255,255,255,0.42)',
          lineHeight: 1.55, maxWidth: 260,
        }}>
          {body}
        </div>
      )}

      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop: 8, padding: '10px 20px', borderRadius: 12, border: 'none',
            fontSize: 13, fontWeight: 700, color: '#fff',
            background: `linear-gradient(135deg, ${accentColor}cc, ${accentColor}88)`,
            boxShadow: `0 4px 16px ${accentColor}30`,
            cursor: 'pointer',
          }}>
          {action.label}
        </button>
      )}

      <style>{`
        @keyframes es-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ── Preset specifici ──────────────────────────────────────────────────────────

export function EmptyHistory({ onNew }: { onNew: () => void }) {
  return (
    <EmptyState
      icon={
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      }
      title="Nessun dibattito ancora"
      body="Torna qui dopo il tuo primo dibattito. Tutto viene salvato automaticamente."
      action={{ label: 'Inizia il primo dibattito', onClick: onNew }}
      accentColor="#A78BFA"
    />
  )
}

export function EmptyAiWaiting({ aiName, color }: { aiName: string; color: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '32px 20px', gap: 12,
    }}>
      {/* Dots animati */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 150, 300].map(delay => (
          <div key={delay} style={{
            width: 8, height: 8, borderRadius: '50%',
            backgroundColor: color,
            opacity: 0.7,
            animation: `es-bounce 1.1s ease-in-out infinite`,
            animationDelay: `${delay}ms`,
          }} />
        ))}
      </div>
      <div style={{
        fontSize: 12, color: 'rgba(255,255,255,0.35)',
        fontWeight: 500, letterSpacing: '0.04em',
      }}>
        {aiName} sta formulando la risposta…
      </div>
      <style>{`
        @keyframes es-bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="#F87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      }
      title="Qualcosa è andato storto"
      body={message ?? 'La risposta AI non è arrivata. Controlla la connessione e riprova.'}
      action={onRetry ? { label: 'Riprova', onClick: onRetry } : undefined}
      accentColor="#F87171"
    />
  )
}
