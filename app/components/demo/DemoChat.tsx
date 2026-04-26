'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { track } from '@vercel/analytics'
import LoginModal, { type SelectableMode } from '@/app/components/landing/LoginModal'
import MessageBubble, { type Message } from '@/app/components/MessageBubble'
import ThinkingBubble from '@/app/components/chat/ThinkingBubble'
import PhoneAvatarBar from '@/app/components/layout/PhoneAvatarBar'
import { AI_NAMES } from '@/app/lib/aiProfiles'

// ── Costanti ──────────────────────────────────────────────────────────────────
const AI_ORDER = ['claude', 'gpt', 'gemini', 'perplexity']
const TYPEWRITER_DELAY = 48 // ms per carattere — identico ad AigoraChat

type Phase = 'round1' | 'between' | 'round2' | 'locked'
type HistoryEntry = { role: string; content: string }

// ── Fetch testo completo (nessun aggiornamento UI durante il download) ─────────
async function fetchDemoAI(aiId: string, history: HistoryEntry[]): Promise<string> {
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
        if (parsed.text) fullText += parsed.text
      } catch {}
    }
    if (done) break
  }
  return fullText
}

// ── Componente principale ─────────────────────────────────────────────────────
export default function DemoChat({ topic }: { topic: string }) {
  const router = useRouter()

  // La domanda dell'utente appare subito come bubble verde (identico alla chat vera)
  const [messages, setMessages] = useState<Message[]>([
    { id: 'user-topic', aiId: 'user', name: 'Tu', content: topic, isUser: true },
  ])
  const [phase, setPhase] = useState<Phase>('round1')
  const [followUp, setFollowUp] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([{ role: 'utente', content: topic }])
  const [showLogin, setShowLogin] = useState(false)
  const [phoneScale, setPhoneScale] = useState(1)
  const [activeAi, setActiveAi] = useState<string | null>(null)   // usato da header + PhoneAvatarBar
  const [thinkingAi, setThinkingAi] = useState<string | null>(null) // mostra ThinkingBubble
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date()
    return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
  })

  const started = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
    const calcScale = () => {
      const availH = window.innerHeight - 56 - 40
      const availW = window.innerWidth - 32
      setPhoneScale(Math.min(1, availH / 790, availW / 390))
    }
    calcScale()
    window.addEventListener('resize', calcScale)
    return () => window.removeEventListener('resize', calcScale)
  }, [])

  // Focus input quando appare
  useEffect(() => {
    if (phase === 'between') setTimeout(() => inputRef.current?.focus(), 100)
  }, [phase])

  // Scroll in fondo quando arrivano nuovi messaggi
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // ── Typewriter identico ad AigoraChat ────────────────────────────────────
  const typewriteText = useCallback((msgId: string, text: string): Promise<void> => {
    return new Promise(resolve => {
      let i = 0
      const iv = setInterval(() => {
        if (i >= text.length) { clearInterval(iv); resolve(); return }
        i++
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: text.slice(0, i) } : m))
        if (i % 14 === 0) scrollToBottom()
      }, TYPEWRITER_DELAY)
    })
  }, [scrollToBottom])

  // ── Una risposta AI: thinking → fetch → typewrite ─────────────────────────
  const runOneAi = useCallback(async (aiId: string, currentHistory: HistoryEntry[]): Promise<string> => {
    // 1. ThinkingBubble + avatar glow (identico: activeAi E thinkingAi entrambi settati)
    setThinkingAi(aiId)
    setActiveAi(aiId)

    let fullText = ''
    try {
      // 2. Download completo in background (nessun update UI)
      fullText = await fetchDemoAI(aiId, currentHistory)
    } catch (err) {
      console.error(`Demo error for ${aiId}:`, err)
      track('demo_ai_error', { aiId })
      fullText = '(errore di connessione — riprova)'
    }

    // 3. Fine thinking — aggiunge bubble vuota e inizia typewriter
    setThinkingAi(null)
    const msgId = `${aiId}-${Date.now()}`
    setMessages(prev => [...prev, {
      id: msgId,
      aiId,
      name: AI_NAMES[aiId],
      content: '',
      isStreaming: true,
    }])
    scrollToBottom()

    // 4. Typewriter carattere per carattere a 48ms
    await typewriteText(msgId, fullText)

    // 5. Fine typewriter
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false, content: fullText } : m))
    setActiveAi(null)

    return fullText
  }, [typewriteText, scrollToBottom])

  // ── Round completo: tutte le 4 AI in sequenza ─────────────────────────────
  const runRound = useCallback(async (startHistory: HistoryEntry[]): Promise<HistoryEntry[]> => {
    let currentHistory = [...startHistory]
    for (const aiId of AI_ORDER) {
      const fullText = await runOneAi(aiId, currentHistory)
      currentHistory = [...currentHistory, { role: AI_NAMES[aiId], content: fullText }]
    }
    return currentHistory
  }, [runOneAi])

  // Avvia round 1 al mount
  useEffect(() => {
    if (started.current) return
    started.current = true
    runRound([{ role: 'utente', content: topic }]).then(finalHistory => {
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

    // Aggiunge bubble utente
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      aiId: 'user', name: 'Tu', content: text, isUser: true,
    }])
    scrollToBottom()

    const newHistory = [...history, { role: 'utente', content: text }]
    const finalHistory = await runRound(newHistory)
    setHistory(finalHistory)
    setPhase('locked')
    try { localStorage.setItem('aigora_demo_used', '1') } catch {}
  }

  // Sottotitolo header — identico alla chat vera
  const headerSubtitle = activeAi
    ? `${AI_NAMES[activeAi]} sta scrivendo…`
    : phase === 'locked'
      ? 'Dibattito concluso'
      : '4 AI · Dibattito'

  // ── Contenuto schermo condiviso desktop + mobile ──────────────────────────
  const screenContent = (
    <>
      {/* ── Chat header ── */}
      <div className="flex-shrink-0 flex items-center gap-2.5 px-3 py-2"
        style={{ backgroundColor: '#0d0d14', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex -space-x-2 flex-shrink-0">
          {AI_ORDER.map(id => (
            <div key={id}
              className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold ring-1"
              style={{
                fontSize: 8,
                backgroundColor: id === 'claude' ? '#7C3AED' : id === 'gpt' ? '#10A37F' : id === 'gemini' ? '#1A73E8' : '#FF6B2B',
                ['--tw-ring-color' as string]: '#0d0d14',
              }}>
              {id === 'gemini' ? 'Ge' : AI_NAMES[id][0]}
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[13px] leading-none" style={{ color: 'rgba(255,255,255,0.9)' }}>
            AiGORÀ
          </div>
          <div className="text-[10px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {headerSubtitle}
          </div>
        </div>
        <div style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(167,139,250,0.3)', fontSize: 9, fontWeight: 900, color: '#A78BFA', letterSpacing: '0.1em', flexShrink: 0 }}>
          DEMO
        </div>
      </div>

      {/* ── Avatar bar identica alla chat vera ── */}
      <PhoneAvatarBar
        activeAi={activeAi}
        bgColor="#0d0d14"
        isDark={true}
        aiOrder={AI_ORDER}
      />

      {/* ── Messaggi ── */}
      <div
        className="flex-1 overflow-y-auto py-2 pb-2 flex flex-col gap-1 relative"
        style={{ backgroundColor: '#07070f', overflowX: 'hidden', minHeight: 0 }}
      >
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} bgTheme="white" />
        ))}

        {/* ThinkingBubble — appare mentre l'AI scarica il testo */}
        {thinkingAi && <ThinkingBubble aiId={thinkingAi} isDark={true} />}

        <div ref={messagesEndRef} style={{ height: 8 }} />
      </div>

      {/* ── Input (phase: between) ── */}
      {phase === 'between' && (
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5"
          style={{ backgroundColor: '#0d0d14', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <input
            ref={inputRef}
            type="text"
            value={followUp}
            onChange={e => setFollowUp(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleFollowUp() }}
            placeholder="Intervieni nel dibattito…"
            className="flex-1 px-3.5 py-2 text-[12px] outline-none transition-all"
            style={{
              backgroundColor: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#f0f0f0',
              borderRadius: 9999,
              lineHeight: '1.4',
            }}
          />
          <button
            onClick={handleFollowUp}
            disabled={!followUp.trim()}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white disabled:opacity-30 flex-shrink-0 transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
              boxShadow: followUp.trim() ? '0 2px 10px rgba(124,58,237,0.4)' : undefined,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
            </svg>
          </button>
        </div>
      )}

      {/* ── Round 2 loading ── */}
      {phase === 'round2' && (
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5"
          style={{ backgroundColor: '#0d0d14', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <input
            disabled
            placeholder="Le AI stanno reagendo…"
            className="flex-1 px-3.5 py-2 text-[12px] outline-none"
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.3)',
              borderRadius: 9999,
              lineHeight: '1.4',
            }}
          />
        </div>
      )}

      {/* ── Login wall (phase: locked) ── */}
      {phase === 'locked' && (
        <div className="flex-shrink-0 px-4 py-5"
          style={{
            borderTop: '1px solid rgba(167,139,250,0.2)',
            background: 'rgba(14,9,25,0.97)',
            backdropFilter: 'blur(16px)',
            textAlign: 'center',
          }}>
          <div style={{ fontSize: 18, marginBottom: 6 }}>🔒</div>
          <div style={{ fontSize: 14, fontWeight: 900, color: '#fff', marginBottom: 6, letterSpacing: '-0.01em' }}>
            Hai visto come funziona.
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: 14 }}>
            Crea un account gratuito per continuare il dibattito e accedere a tutti i formati.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => { track('demo_wall_cta_click'); setShowLogin(true) }}
              style={{ padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', color: '#fff', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 20px rgba(124,58,237,0.45)' }}
            >
              Crea account gratuito →
            </button>
            <button
              onClick={() => router.push('/')}
              style={{ padding: '9px 16px', borderRadius: 12, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600 }}
            >
              Esplora i formati
            </button>
          </div>
        </div>
      )}

      {/* ── Home indicator ── */}
      <div className="flex-shrink-0 flex justify-center py-2" style={{ backgroundColor: '#0d0d14' }}>
        <div className="w-28 h-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
      </div>
    </>
  )

  return (
    <>
      {/* ═══════════════════ DESKTOP — mock iPhone ═══════════════════════════ */}
      <div className="desktop-bg min-h-screen flex items-center justify-center p-6 chat-layout relative">

        {/* Navbar fixed */}
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          background: 'rgba(7,7,15,0.85)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <button onClick={() => router.push('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            Home
          </button>
          <button onClick={() => setShowLogin(true)}
            style={{ padding: '7px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Accedi
          </button>
        </nav>

        {/* Wrapper che scala il telefono */}
        <div className="relative flex-shrink-0 mt-14" style={{ borderRadius: 50 * phoneScale }}>
          <div className="phone-shell scale-in" style={{ width: 390, height: 790, zoom: phoneScale, position: 'relative' }}>

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
                <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {currentTime}
                </span>
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

              {screenContent}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════ MOBILE — schermo intero ══════════════════════════ */}
      <div className="phone-screen-mobile hidden flex-col" style={{ backgroundColor: '#07070f' }}>
        <div className="flex-shrink-0 flex items-center justify-between px-5 pb-1.5"
          style={{ backgroundColor: '#0d0d14', paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
          <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {currentTime}
          </span>
          <button onClick={() => router.push('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 11 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            Home
          </button>
        </div>
        {screenContent}
      </div>

      {showLogin && <LoginModal mode={'chat' as SelectableMode} onClose={() => setShowLogin(false)} />}
    </>
  )
}
