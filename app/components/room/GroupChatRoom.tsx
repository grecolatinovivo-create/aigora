'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAbly, type RoomEvent } from '@/lib/useAbly'
import MessageBubble, { type Message } from '@/app/components/MessageBubble'
import { AI_COLOR, AI_NAMES } from '@/app/lib/aiProfiles'

interface RoomData {
  id: string
  topic: string
  status: string
  aiIds: string[]
  expiresAt?: string | null
  host: { id: string; name: string }
  participants: { userId: string; role: string; user: { id: string; name: string } }[]
  roomMessages?: { id: string; authorId: string | null; authorName: string; aiId: string | null; content: string; createdAt: string }[]
}

interface GroupChatRoomProps {
  room: RoomData
  myRole: 'host' | 'participant' | 'spectator'
  userId: string
  userName: string
  onLeave: () => void
}

export default function GroupChatRoom({ room, myRole, userId, userName, onLeave }: GroupChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    // Carica storia persistita dal DB
    return (room.roomMessages ?? []).map(m => ({
      id: m.id,
      aiId: m.aiId ?? 'user',
      name: m.authorName,
      content: m.content,
      isUser: !m.aiId,
    }))
  })
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [aiTyping, setAiTyping] = useState<string | null>(null) // aiId che sta digitando
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isSpectator = myRole === 'spectator'
  const isEnded = room.status === 'ended'
  const canSend = !isSpectator && !isEnded && !sending

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleRoomEvent = useCallback((event: RoomEvent) => {
    if (event.type === 'user_message') {
      // Evita di mostrare il proprio messaggio due volte
      if (event.userId === userId) return
      setMessages(prev => {
        if (prev.find(m => m.id === event.messageId)) return prev
        return [...prev, {
          id: event.messageId,
          aiId: 'user',
          name: event.userName,
          content: event.content,
          isUser: true,
        }]
      })
    } else if (event.type === 'ai_chunk') {
      setAiTyping(event.aiId)
      setMessages(prev => {
        const existing = prev.find(m => m.id === event.messageId)
        if (existing) {
          return prev.map(m => m.id === event.messageId
            ? { ...m, content: m.content + event.chunk, isStreaming: true }
            : m
          )
        }
        return [...prev, {
          id: event.messageId,
          aiId: event.aiId,
          name: event.aiName,
          content: event.chunk,
          isStreaming: true,
        }]
      })
    } else if (event.type === 'ai_done') {
      setAiTyping(null)
      setMessages(prev => prev.map(m => m.id === event.messageId
        ? { ...m, content: event.fullText, isStreaming: false }
        : m
      ))
    } else if (event.type === 'presence') {
      setOnlineUsers(prev => {
        if (event.action === 'enter') return Array.from(new Set([...prev, event.userName]))
        return prev.filter(u => u !== event.userName)
      })
    }
  }, [userId])

  const { publish } = useAbly({
    roomId: room.id,
    userId,
    userName,
    onEvent: handleRoomEvent,
    enabled: true,
  })

  const handleSend = async () => {
    const text = input.trim()
    if (!text || !canSend) return
    setSending(true)
    setInput('')

    const messageId = `user-${userId}-${Date.now()}`
    // Aggiungi il proprio messaggio localmente subito
    setMessages(prev => [...prev, {
      id: messageId,
      aiId: 'user',
      name: userName,
      content: text,
      isUser: true,
    }])

    // Pubblica su Ably (trigger webhook AI)
    publish({ type: 'user_message', userId, userName, content: text, messageId })
    setSending(false)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${room.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Calcola tempo rimasto se effimera
  const timeLeft = room.expiresAt
    ? Math.max(0, Math.round((new Date(room.expiresAt).getTime() - Date.now()) / 60000))
    : null

  const aiIds: string[] = Array.isArray(room.aiIds) ? room.aiIds : ['claude', 'gpt']

  return (
    <div className="flex flex-col h-full relative" style={{ background: '#07070f' }}>

      {/* ── HEADER ── */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4 relative z-10"
        style={{
          paddingTop: 'max(14px, env(safe-area-inset-top))',
          paddingBottom: '12px',
          background: 'rgba(7,7,15,0.85)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Back */}
        <button
          onClick={onLeave}
          className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>

        {/* Topic + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-white font-black text-sm truncate">{room.topic}</div>
            {isEnded && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                Chiusa
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {/* Dot online */}
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ boxShadow: '0 0 4px #4ade80' }} />
              <span className="text-[10px] text-white/30">
                {onlineUsers.length + 1} online
              </span>
            </div>
            {/* AI presenti */}
            <div className="flex items-center gap-1">
              {aiIds.map(id => (
                <div key={id} className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white"
                  style={{ fontSize: 6, background: AI_COLOR[id] ?? '#6B7280' }}>
                  {(AI_NAMES[id] ?? id)[0]}
                </div>
              ))}
            </div>
            {timeLeft !== null && timeLeft > 0 && (
              <span className="text-[9px] text-white/25">{timeLeft}m rimasti</span>
            )}
          </div>
        </div>

        {/* Invite link */}
        {!isEnded && (
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex-shrink-0"
            style={{
              background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(167,139,250,0.15)',
              border: `1px solid ${copied ? 'rgba(74,222,128,0.4)' : 'rgba(167,139,250,0.3)'}`,
              color: copied ? '#4ade80' : '#c4b5fd',
            }}
          >
            {copied ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>
                Copiato
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Invita
              </>
            )}
          </button>
        )}
      </div>

      {/* ── BADGE SPETTATORE ── */}
      {isSpectator && (
        <div className="flex-shrink-0 flex items-center justify-center gap-2 py-2 text-[11px]"
          style={{ background: 'rgba(167,139,250,0.08)', borderBottom: '1px solid rgba(167,139,250,0.15)' }}>
          <span style={{ color: '#c4b5fd' }}>👁 Stai guardando in diretta</span>
        </div>
      )}

      {/* ── MESSAGGI ── */}
      <div className="flex-1 overflow-y-auto py-3" style={{ minHeight: 0 }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
            <div className="flex gap-2">
              {aiIds.slice(0, 3).map(id => (
                <div key={id} className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm"
                  style={{ background: AI_COLOR[id] ?? '#6B7280', boxShadow: `0 0 16px ${AI_COLOR[id] ?? '#6B7280'}55` }}>
                  {(AI_NAMES[id] ?? id)[0]}
                </div>
              ))}
            </div>
            <div className="text-white/40 text-sm">
              {isSpectator
                ? 'La conversazione non è ancora iniziata.'
                : 'Inizia la conversazione. Le AI risponderanno a ciascun messaggio.'}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} bgTheme="black" fontSize={13} />
        ))}

        {/* Indicatore AI che scrive */}
        {aiTyping && (
          <div className="flex items-end gap-2 px-3 mb-1">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0"
              style={{ fontSize: 10, background: AI_COLOR[aiTyping] ?? '#6B7280' }}>
              {(AI_NAMES[aiTyping] ?? aiTyping)[0]}
            </div>
            <div className="px-3 py-2 rounded-2xl rounded-bl-sm"
              style={{ background: `${AI_COLOR[aiTyping] ?? '#6B7280'}18` }}>
              <div className="flex gap-1 items-center py-0.5">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: AI_COLOR[aiTyping] ?? '#6B7280', opacity: 0.7, animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── INPUT ── */}
      {!isSpectator && !isEnded && (
        <div
          className="flex-shrink-0 relative z-10"
          style={{
            background: 'rgba(7,7,15,0.9)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          }}
        >
          <div className="flex items-end gap-2 px-3 pt-3 pb-2">
            <textarea
              value={input}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && input.trim() && canSend) {
                  e.preventDefault()
                  handleSend()
                  ;(e.target as HTMLTextAreaElement).style.height = 'auto'
                }
              }}
              disabled={!canSend}
              placeholder="Scrivi un messaggio…"
              rows={1}
              className="flex-1 rounded-2xl px-4 py-2.5 text-sm outline-none transition-all resize-none overflow-hidden text-white/90"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                lineHeight: '1.4',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || !canSend}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-20 flex-shrink-0 transition-all mb-0.5"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── ENDED STATE ── */}
      {isEnded && (
        <div className="flex-shrink-0 py-4 px-6 text-center"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-white/30 text-xs">Questa sala è stata chiusa</div>
        </div>
      )}
    </div>
  )
}
