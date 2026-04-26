'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { track } from '@vercel/analytics'
import LoginModal, { type SelectableMode } from '@/app/components/landing/LoginModal'

// ── Tipi ─────────────────────────────────────────────────────────────────────
type DemoMessage = {
  id: string
  aiId: string
  name: string
  color: string
  initial: string
  text: string
  isStreaming: boolean
  isUser?: boolean
}

type Phase = 'round1' | 'between' | 'round2' | 'locked'

type HistoryEntry = { role: string; content: string }

// ── Config AI ─────────────────────────────────────────────────────────────────
const AI_CONFIG = [
  { aiId: 'claude',     name: 'Claude',     color: '#7C3AED', initial: 'C'  },
  { aiId: 'gpt',        name: 'GPT',        color: '#10A37F', initial: 'G'  },
  { aiId: 'gemini',     name: 'Gemini',     color: '#1A73E8', initial: 'Ge' },
  { aiId: 'perplexity', name: 'Perplexity', color: '#20B2AA', initial: 'P'  },
]

// ── Streaming helper ──────────────────────────────────────────────────────────
async function streamDemoAI(
  aiId: string,
  history: HistoryEntry[],
  onChunk: (text: string) => void,
): Promise<string> {
  const res = await fetch('/api/demo/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aiId, history }),
  })
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (value) buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const d = line.slice(6).trim()
      if (d === '[DONE]') return fullText
      try {
        const parsed = JSON.parse(d)
        if (parsed.text) { fullText += parsed.text; onChunk(parsed.text) }
      } catch {}
    }
    if (done) break
  }
  return fullText
}

// ── Componente principale ─────────────────────────────────────────────────────
export default function DemoChat({ topic }: { topic: string }) {
  const router = useRouter()
  const [messages, setMessages] = useState<DemoMessage[]>([])
  const [phase, setPhase] = useState<Phase>('round1')
  const [followUp, setFollowUp] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([{ role: 'utente', content: topic }])
  const [showLogin, setShowLogin] = useState(false)
  const [phoneScale, setPhoneScale] = useState(1)
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date()
    return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
  })

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const started = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Orologio
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setCurrentTime(`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`)
    }
    const interval = setInterval(tick, 10000)
    return () => clearInterval(interval)
  }, [])

  // Scala dinamica del telefono
  useEffect(() => {
    const PHONE_H = 790
    const PHONE_W = 390
    const NAVBAR_H = 56
    const MARGIN_V = 40
    const MARGIN_H = 32
    const calcScale = () => {
      const availH = window.innerHeight - NAVBAR_H - MARGIN_V
      const availW = window.innerWidth - MARGIN_H
      setPhoneScale(Math.min(1, availH / PHONE_H, availW / PHONE_W))
    }
    calcScale()
    window.addEventListener('resize', calcScale)
    return () => window.removeEventListener('resize', calcScale)
  }, [])

  // Auto-scroll in cima (flex-col-reverse)
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = 0
    }
  }, [messages])

  // Focus input quando appare
  useEffect(() => {
    if (phase === 'between') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [phase])

  const runRound = useCallback(async (startHistory: HistoryEntry[]): Promise<HistoryEntry[]> => {
    let currentHistory = [...startHistory]
    for (const ai of AI_CONFIG) {
      const msgId = `${ai.aiId}-${Date.now()}-${Math.random()}`
      setMessages(prev => [...prev, {
        id: msgId, ...ai, text: '', isStreaming: true,
      }])
      let fullText = ''
      try {
        await streamDemoAI(ai.aiId, currentHistory, (chunk) => {
          fullText += chunk
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: fullText } : m))
        })
      } catch (err) {
        console.error(`Demo error for ${ai.aiId}:`, err)
        track('demo_ai_error', { aiId: ai.aiId })
        fullText = '(errore di connessione — riprova)'
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: fullText } : m))
      }
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false } : m))
      currentHistory = [...currentHistory, { role: ai.name, content: fullText }]
    }
    return currentHistory
  }, [])

  // Avvia round 1 al mount
  useEffect(() => {
    if (started.current) return
    started.current = true
    const initHistory: HistoryEntry[] = [{ role: 'utente', content: topic }]
    runRound(initHistory).then(finalHistory => {
      setHistory(finalHistory)
      setPhase('between')
    })
  }, [topic, runRound])

  const handleFollowUp = async () => {
    const text = followUp.trim()
    if (!text) return
    track('demo_followup_sent')
    setFollowUp('')
    setPhase('round2')

    const userMsgId = `user-${Date.now()}`
    setMessages(prev => [...prev, {
      id: userMsgId, aiId: 'user', name: 'Tu', color: '#F59E0B',
      initial: 'U', text, isStreaming: false, isUser: true,
    }])

    const newHistory = [...history, { role: 'utente', content: text }]
    const finalHistory = await runRound(newHistory)
    setHistory(finalHistory)
    setPhase('locked')
    try { localStorage.setItem('aigora_demo_used', '1') } catch {}
  }

  // ── Contenuto interno schermo (condiviso tra desktop e mobile) ────────────
  const screenContent = (
    <>
      {/* Header chat */}
      <div className="flex-shrink-0 flex items-center gap-2.5 px-3 py-2"
        style={{ backgroundColor: '#0d0d14', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Avatar sovrapposti */}
        <div className="flex -space-x-2 flex-shrink-0">
          {AI_CONFIG.map(ai => (
            <div key={ai.aiId}
              className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold ring-1"
              style={{ fontSize: 8, backgroundColor: ai.color, ['--tw-ring-color' as string]: '#0d0d14' }}>
              {ai.initial}
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[13px] leading-none" style={{ color: 'rgba(255,255,255,0.9)' }}>
            AiGORÀ
          </div>
          <div className="text-[10px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {phase === 'round1' || phase === 'round2' ? 'Le AI stanno scrivendo…' : phase === 'locked' ? 'Dibattito concluso' : '4 AI · Dibattito'}
          </div>
        </div>
        {/* Badge DEMO */}
        <div style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(167,139,250,0.3)', fontSize: 9, fontWeight: 900, color: '#A78BFA', letterSpacing: '0.1em', flexShrink: 0 }}>
          DEMO
        </div>
      </div>

      {/* Topic banner */}
      <div className="flex-shrink-0 flex items-start gap-2 px-3 py-2"
        style={{ background: 'rgba(124,58,237,0.06)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}>
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
        </svg>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, fontStyle: 'italic' }}>
          "{topic}"
        </div>
      </div>

      {/* Messaggi — flex-col-reverse per scroll naturale */}
      <div ref={messagesContainerRef}
        className="flex-1 overflow-y-auto py-3 px-3 flex flex-col-reverse gap-3"
        style={{ backgroundColor: '#07070f', overflowX: 'hidden', minHeight: 0 }}>
        {/* Spacer in fondo (che appare in cima visivamente) */}
        <div style={{ flexShrink: 0 }} />

        {[...messages].reverse().map(msg => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
      </div>

      {/* Follow-up input (phase: between) */}
      {phase === 'between' && (
        <div className="flex-shrink-0 px-3 py-2.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(7,7,15,0.95)', backdropFilter: 'blur(12px)' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 6, textAlign: 'center' }}>
            1 messaggio disponibile · poi ti chiediamo di creare un account
          </div>
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              type="text"
              value={followUp}
              onChange={e => setFollowUp(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleFollowUp() }}
              placeholder="Intervieni nel dibattito…"
              style={{
                flex: 1, padding: '9px 12px', borderRadius: 12,
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', fontSize: 13, outline: 'none',
              }}
            />
            <button
              onClick={handleFollowUp}
              disabled={!followUp.trim()}
              style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
                background: followUp.trim() ? 'linear-gradient(135deg,#7C3AED,#5B21B6)' : 'rgba(255,255,255,0.08)',
                cursor: followUp.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={followUp.trim() ? 'white' : 'rgba(255,255,255,0.3)'}>
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Round 2 loading bar */}
      {phase === 'round2' && (
        <div className="flex-shrink-0 px-3 py-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(7,7,15,0.9)', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
          Le AI stanno reagendo…
        </div>
      )}

      {/* Login wall (phase: locked) */}
      {phase === 'locked' && (
        <div className="flex-shrink-0 px-4 py-5"
          style={{ borderTop: '1px solid rgba(167,139,250,0.2)', background: 'rgba(14,9,25,0.97)', backdropFilter: 'blur(16px)', textAlign: 'center' }}>
          <div style={{ fontSize: 18, marginBottom: 6 }}>🔒</div>
          <div style={{ fontSize: 14, fontWeight: 900, color: '#fff', marginBottom: 4, letterSpacing: '-0.01em' }}>
            Hai visto come funziona.
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: 14 }}>
            Crea un account gratuito per continuare il dibattito e accedere a tutti i formati.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => { track('demo_wall_cta_click'); setShowLogin(true) }}
              style={{
                padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#7C3AED,#5B21B6)',
                color: '#fff', fontSize: 13, fontWeight: 700,
                boxShadow: '0 4px 20px rgba(124,58,237,0.45)',
              }}
            >
              Crea account gratuito →
            </button>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '9px 16px', borderRadius: 12, cursor: 'pointer',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600,
              }}
            >
              Esplora i formati
            </button>
          </div>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* ── Layout desktop: sfondo + mock iPhone ───────────────────────────── */}
      <div className="desktop-bg min-h-screen flex items-center justify-center p-6 chat-layout relative">

        {/* Navbar sovrapposta */}
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          background: 'rgba(7,7,15,0.85)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <button
            onClick={() => router.push('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: '4px 0' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            Home
          </button>
          <button
            onClick={() => setShowLogin(true)}
            style={{ padding: '7px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Accedi
          </button>
        </nav>

        {/* Wrapper che scala il telefono */}
        <div className="relative flex-shrink-0 mt-14" style={{ borderRadius: 50 * phoneScale }}>
          <div
            className="phone-shell scale-in"
            style={{ width: 390, height: 790, zoom: phoneScale, position: 'relative' }}
          >
            {/* Cornice */}
            <div className="absolute inset-0 rounded-[50px] bg-[#1c1c1e]"
              style={{ boxShadow: '0 0 0 1.5px #3a3a3c, 0 40px 100px rgba(0,0,0,0.8), 0 0 0 0.5px #555 inset' }} />

            {/* Glare */}
            <div className="phone-glare" />

            {/* Schermo */}
            <div className="absolute rounded-[44px] overflow-hidden flex flex-col"
              style={{ top: 9, left: 9, right: 9, bottom: 9, backgroundColor: '#07070f' }}>

              {/* Status bar */}
              <div className="flex-shrink-0 flex items-center justify-between px-5 pt-3 pb-1.5"
                style={{ backgroundColor: '#0d0d14' }}>
                <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'rgba(255,255,255,0.6)' }}>{currentTime}</span>
                <div className="w-[72px] h-[18px] bg-[#1c1c1e] rounded-full absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-[#333] rounded-full" />
                </div>
                <div className="flex items-center gap-1">
                  <svg width="15" height="11" viewBox="0 0 15 11" fill="rgba(255,255,255,0.6)">
                    <rect x="0" y="4" width="3" height="7" rx="0.5"/>
                    <rect x="4" y="2.5" width="3" height="8.5" rx="0.5"/>
                    <rect x="8" y="1" width="3" height="10" rx="0.5"/>
                    <rect x="12" y="0" width="3" height="11" rx="0.5"/>
                  </svg>
                  <svg width="12" height="9" viewBox="0 0 24 18" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2">
                    <path d="M1 5.5C4.5 2 8.5 0 12 0s7.5 2 11 5.5"/>
                    <path d="M4.5 9C7 6.5 9.5 5 12 5s5 1.5 7.5 4"/>
                    <path d="M8 12.5C9.5 11 10.75 10 12 10s2.5 1 4 2.5"/>
                    <circle cx="12" cy="16" r="2" fill="rgba(255,255,255,0.6)" stroke="none"/>
                  </svg>
                  <div className="flex items-center gap-0.5">
                    <div className="w-5 h-2.5 rounded-sm border" style={{ borderColor: 'rgba(255,255,255,0.4)' }}>
                      <div className="h-full w-3/4 rounded-sm ml-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.6)' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contenuto schermo */}
              {screenContent}
            </div>
          </div>
        </div>
      </div>

      {/* ── Layout mobile: schermo intero ──────────────────────────────────── */}
      <div className="phone-screen-mobile hidden flex-col" style={{ backgroundColor: '#07070f' }}>
        {/* Status bar mobile */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-3 pb-1.5"
          style={{ backgroundColor: '#0d0d14', paddingTop: 'env(safe-area-inset-top, 12px)' }}>
          <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'rgba(255,255,255,0.6)' }}>{currentTime}</span>
          <button
            onClick={() => router.push('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 11 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            Home
          </button>
        </div>

        {/* Contenuto schermo mobile */}
        {screenContent}
      </div>

      {/* Login modal */}
      {showLogin && <LoginModal mode={'chat' as SelectableMode} onClose={() => setShowLogin(false)} />}
    </>
  )
}

// ── Bubble singolo messaggio ──────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: DemoMessage }) {
  if (msg.isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          maxWidth: '78%',
          padding: '8px 12px',
          borderRadius: '14px 14px 2px 14px',
          background: 'rgba(245,158,11,0.15)',
          border: '1px solid rgba(245,158,11,0.25)',
          fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', marginBottom: 3 }}>Tu</div>
          {msg.text}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      {/* Avatar */}
      <div style={{
        width: 26, height: 26, borderRadius: '50%', background: msg.color, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 8, fontWeight: 900, color: '#fff',
        boxShadow: `0 0 10px ${msg.color}55`,
      }}>
        {msg.initial}
      </div>
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: msg.color, marginBottom: 4 }}>{msg.name}</div>
        <div style={{
          fontSize: 12, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6,
          padding: '8px 12px',
          borderRadius: '0 12px 12px 12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.06)',
          minHeight: 16,
          wordBreak: 'break-word',
        }}>
          {msg.text || (msg.isStreaming ? '' : '…')}
          {msg.isStreaming && (
            <span style={{ display: 'inline-block', width: 7, height: 12, background: msg.color, marginLeft: 2, verticalAlign: 'text-bottom', borderRadius: 2, animation: 'cursor-blink 0.8s ease-in-out infinite' }} />
          )}
        </div>
      </div>
    </div>
  )
}
