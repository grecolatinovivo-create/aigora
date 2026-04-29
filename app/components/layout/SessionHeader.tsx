'use client'
// SessionHeader — header universale per le sessioni in-corso
// Usato da: Arena running, Devil running, 2v2, Brainstormer
// Pattern: [← torna] [NomeModalità + topic troncato] [azioni contestuali]

interface SessionHeaderProps {
  /** Nome della modalità: "Arena", "2v2", "Devil's Advocate", "Brainstormer" */
  modeName: string
  /** Colore accent della modalità */
  modeColor: string
  /** Titolo/topic troncato — opzionale */
  topic?: string
  /** Callback per tornare indietro */
  onBack: () => void
  /** Azioni contestuali a destra (es. stop, condividi) */
  actions?: React.ReactNode
}

export default function SessionHeader({
  modeName, modeColor, topic, onBack, actions,
}: SessionHeaderProps) {
  return (
    <div style={{
      position: 'sticky', top: 0, left: 0, right: 0,
      zIndex: 100,
      height: 52,
      display: 'flex', alignItems: 'center',
      padding: '0 12px',
      backgroundColor: 'rgba(7,7,15,0.92)',
      borderBottom: `1px solid ${modeColor}18`,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      gap: 8,
      flexShrink: 0,
    }}>
      {/* ← Back */}
      <button
        onClick={onBack}
        style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.65)" strokeWidth="2.5" strokeLinecap="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>

      {/* Centro — mode chip + topic */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minWidth: 0, textAlign: 'center',
      }}>
        <div style={{
          fontSize: 10, fontWeight: 900, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: modeColor, lineHeight: 1,
        }}>
          {modeName}
        </div>
        {topic && (
          <div style={{
            fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: '100%', lineHeight: 1.3, marginTop: 2,
          }}>
            {topic}
          </div>
        )}
      </div>

      {/* Azioni destra */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        {actions}
      </div>
    </div>
  )
}
