'use client'
import { useState, useRef } from 'react'

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
        className="flex items-center group transition-colors"
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.25s ease',
          backgroundColor: bgColor,
          cursor: 'pointer',
        }}>
        <div className="flex-1 px-5 py-3 min-w-0">
          <div className="text-xs font-medium truncate" style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)' }}>{chat.title}</div>
          <div className="text-[10px] mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)' }}>{chat.date}</div>
        </div>
        {/* Cestino desktop — solo hover, solo lg */}
        <button onClick={onDelete}
          className="flex-shrink-0 mr-3 w-6 h-6 rounded items-center justify-center hidden lg:flex opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: '#ef4444' }}>
          {TRASH}
        </button>
      </div>
    </div>
  )
}
