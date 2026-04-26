'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const started = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
    setFollowUp('')
    setPhase('round2')

    // Aggiunge messaggio utente
    const userMsgId = `user-${Date.now()}`
    setMessages(prev => [...prev, {
      id: userMsgId, aiId: 'user', name: 'Tu', color: '#F59E0B',
      initial: 'U', text, isStreaming: false, isUser: true,
    }])

    const newHistory = [...history, { role: 'utente', content: text }]
    const finalHistory = await runRound(newHistory)
    setHistory(finalHistory)
    setPhase('locked')
    // Segna la demo come usata in localStorage (flag leggero, solo per UX)
    try { localStorage.setItem('aigora_demo_used', '1') } catch {}
  }

  return (
    <div style={{ background: '#07070f', minHeight: '100dvh', display: 'flex', flexDirection: 'column', color: '#fff' }}>

      {/* ── Navbar ── */}
      <nav style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px',
        background: 'rgba(7,7,15,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <button
          onClick={() => router.push('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: '4px 0' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          Home
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(167,139,250,0.3)', fontSize: 11, fontWeight: 900, color: '#A78BFA', letterSpacing: '0.1em' }}>
            DEMO
          </div>
          <button
            onClick={() => setShowLogin(true)}
            style={{ padding: '7px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Accedi
          </button>
        </div>
      </nav>

      {/* ── Topic banner ── */}
      <div style={{ flexShrink: 0, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(124,58,237,0.06)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0, paddingTop: 2 }}>
            {AI_CONFIG.map(ai => (
              <div key={ai.aiId} style={{ width: 18, height: 18, borderRadius: '50%', background: ai.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, fontWeight: 900, color: '#fff' }}>
                {ai.initial}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.45, fontStyle: 'italic' }}>
            "{topic}"
          </div>
        </div>
      </div>

      {/* ── Messaggi ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 32px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {/* Typing indicator per AI ancora da rispondere */}
          {(phase === 'round1' || phase === 'round2') && messages.length > 0 && messages[messages.length - 1]?.isStreaming && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', paddingLeft: 42 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#A78BFA', opacity: 0.6, animation: `dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Follow-up input (phase: between) ── */}
      {phase === 'between' && (
        <div style={{
          flexShrink: 0,
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(7,7,15,0.95)',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 8, textAlign: 'center' }}>
              Puoi inviare 1 messaggio di seguito — poi ti chiederemo di creare un account per continuare
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                ref={inputRef}
                type="text"
                value={followUp}
                onChange={e => setFollowUp(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleFollowUp() }}
                placeholder="Intervieni nel dibattito…"
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 14,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: 14, outline: 'none',
                }}
              />
              <button
                onClick={handleFollowUp}
                disabled={!followUp.trim()}
                style={{
                  width: 44, height: 44, borderRadius: 14, border: 'none',
                  background: followUp.trim() ? 'linear-gradient(135deg,#7C3AED,#5B21B6)' : 'rgba(255,255,255,0.08)',
                  cursor: followUp.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s', flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={followUp.trim() ? 'white' : 'rgba(255,255,255,0.3)'}>
                  <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Round 2 loading ── */}
      {phase === 'round2' && (
        <div style={{
          flexShrink: 0, padding: '14px 20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(7,7,15,0.9)',
          textAlign: 'center',
          fontSize: 13, color: 'rgba(255,255,255,0.4)',
        }}>
          Le AI stanno reagendo al tuo intervento…
        </div>
      )}

      {/* ── Login wall (phase: locked) ── */}
      {phase === 'locked' && (
        <div style={{
          flexShrink: 0,
          borderTop: '1px solid rgba(167,139,250,0.2)',
          background: 'rgba(14,9,25,0.97)',
          backdropFilter: 'blur(16px)',
          padding: '28px 20px',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: 420, margin: '0 auto' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>🔒</div>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 8, letterSpacing: '-0.01em' }}>
              Hai visto come funziona.
            </h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 20 }}>
              Crea un account gratuito per continuare il dibattito, salvare le sessioni e accedere a tutti i formati.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowLogin(true)}
                style={{
                  padding: '12px 28px', borderRadius: 13, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg,#7C3AED,#5B21B6)',
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  boxShadow: '0 4px 24px rgba(124,58,237,0.45)',
                }}
              >
                Crea account gratuito →
              </button>
              <button
                onClick={() => router.push('/')}
                style={{
                  padding: '12px 20px', borderRadius: 13, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600,
                }}
              >
                Esplora i formati
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login modal */}
      {showLogin && <LoginModal mode={'chat' as SelectableMode} onClose={() => setShowLogin(false)} />}
    </div>
  )
}

// ── Bubble singolo messaggio ──────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: DemoMessage }) {
  if (msg.isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          maxWidth: '75%',
          padding: '10px 14px',
          borderRadius: '14px 14px 2px 14px',
          background: 'rgba(245,158,11,0.15)',
          border: '1px solid rgba(245,158,11,0.25)',
          fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', marginBottom: 4 }}>Tu</div>
          {msg.text}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%', background: msg.color, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 900, color: '#fff',
        boxShadow: `0 0 12px ${msg.color}55`,
      }}>
        {msg.initial}
      </div>
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: msg.color, marginBottom: 5 }}>{msg.name}</div>
        <div style={{
          fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 1.65,
          padding: '10px 14px',
          borderRadius: '0 14px 14px 14px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.06)',
          minHeight: 20,
        }}>
          {msg.text || (msg.isStreaming ? '' : '…')}
          {msg.isStreaming && (
            <span style={{ display: 'inline-block', width: 8, height: 14, background: msg.color, marginLeft: 2, verticalAlign: 'text-bottom', borderRadius: 2, animation: 'cursor-blink 0.8s ease-in-out infinite' }} />
          )}
        </div>
      </div>
    </div>
  )
}
