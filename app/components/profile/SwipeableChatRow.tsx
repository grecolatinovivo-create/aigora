'use client'
import { useState, useRef, useMemo } from 'react'

const AI_COLOR_MAP: Record<string, string> = {
  claude: '#7C3AED',
  gpt: '#10A37F',
  gemini: '#1A73E8',
  perplexity: '#FF6B2B',
}
const AI_INITIALS_MAP: Record<string, string> = {
  claude: 'C',
  gpt: 'G',
  gemini: 'Gm',
  perplexity: 'P',
}

export default function SwipeableChatRow({ chat, onOpen, onDelete, bgColor = 'rgba(10,10,18,0.97)', isDark = true }: {
  chat: { id: string; title: string; date: string; messages: any[]; history: any[] }
  onOpen: () => void
  onDelete: (e: React.MouseEvent) => void
  bgColor?: string
  isDark?: boolean
}) {
  const [offset, setOffset] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const startXRef = useRef(0)
  const DELETE_THRESHOLD = 72

  // ── Calcola stats battaglia ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const msgs: any[] = chat.messages ?? []
    const seenAis = new Set<string>()
    let userTurns = 0
    msgs.forEach(m => {
      if (m.isUser) { userTurns++ }
      else if (!m.isSynthesis && m.aiId) seenAis.add(m.aiId)
    })
    return {
      aiIds: Array.from(seenAis),
      userTurns,
    }
  }, [chat.messages])

  // ── Formatta data ─────────────────────────────────────────────────────────
  const dateStr = useMemo(() => {
    if (!chat.date) return ''
    try {
      const d = new Date(chat.date)
      const now = new Date()
      const diffMs = now.getTime() - d.getTime()
      const diffH = diffMs / 3600000
      if (diffH < 1) return 'Poco fa'
      if (diffH < 24) return `${Math.floor(diffH)}h fa`
      if (diffH < 48) return 'Ieri'
      return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
    } catch { return chat.date }
  }, [chat.date])

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX
    setSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return
    const dx = e.touches[0].clientX - startXRef.current
    if (dx < 0) setOffset(Math.max(dx, -80))
  }

  const handleTouchEnd = (_e: React.TouchEvent) => {
    setSwiping(false)
    if (offset < -DELETE_THRESHOLD) {
      const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent
      onDelete(fakeEvent)
      setOffset(0)
    } else {
      setOffset(0)
    }
  }

  const TRASH = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>

  const hasStats = stats.aiIds.length > 0 || stats.userTurns > 0

  return (
    <div className="relative overflow-hidden border-b" style={{ touchAction: 'pan-y', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)' }}>
      {/* Sfondo rosso fisso a destra — visibile solo durante swipe */}
      <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center"
        style={{ backgroundColor: '#ef4444' }}>
        {TRASH}
      </div>

      {/* Contenuto traslabile */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => { if (offset < -10) { setOffset(0); return } onOpen() }}
        className="group transition-colors"
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.25s ease',
          backgroundColor: bgColor,
          cursor: 'pointer',
          padding: '10px 20px',
        }}>
        {/* Riga principale: titolo + data + cestino */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 600,
              color: isDark ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.75)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              lineHeight: 1.35,
            }}>
              {chat.title}
            </div>
            <div style={{
              fontSize: 10, marginTop: 2,
              color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)',
            }}>
              {dateStr}
            </div>
          </div>
          {/* Cestino desktop — solo hover, solo lg */}
          <button onClick={onDelete}
            className="flex-shrink-0 w-6 h-6 rounded items-center justify-center hidden lg:flex opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: '#ef4444' }}>
            {TRASH}
          </button>
        </div>

        {/* Stats battaglia: AI dots + turni */}
        {hasStats && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 7,
          }}>
            {/* AI dots */}
            {stats.aiIds.length > 0 && (
              <div style={{ display: 'flex', gap: 4 }}>
                {stats.aiIds.map(id => {
                  const color = AI_COLOR_MAP[id] ?? '#888'
                  return (
                    <div key={id} style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: `radial-gradient(circle at 30% 30%, ${color}cc, ${color}55)`,
                      border: `1px solid ${color}88`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 7, fontWeight: 900, color: '#fff',
                      flexShrink: 0,
                    }}>
                      {AI_INITIALS_MAP[id] ?? '?'}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Separatore */}
            {stats.aiIds.length > 0 && stats.userTurns > 0 && (
              <div style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.1)' }} />
            )}

            {/* Turni */}
            {stats.userTurns > 0 && (
              <div style={{
                fontSize: 9, fontWeight: 700,
                color: 'rgba(255,255,255,0.28)',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                {stats.userTurns} {stats.userTurns === 1 ? 'turno' : 'turni'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
