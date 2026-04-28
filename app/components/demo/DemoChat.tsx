'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { track } from '@vercel/analytics'
import LoginModal, { type SelectableMode } from '@/app/components/landing/LoginModal'
import MessageBubble, { type Message } from '@/app/components/MessageBubble'
import ThinkingBubble from '@/app/components/chat/ThinkingBubble'
import PhoneAvatarBar from '@/app/components/layout/PhoneAvatarBar'
import { AI_NAMES } from '@/app/lib/aiProfiles'

const AI_ORDER = ['claude', 'gpt', 'gemini', 'perplexity']
const TYPEWRITER_DELAY = 48

type Phase = 'round1' | 'between' | 'round2' | 'locked'
type HistoryEntry = { role: string; content: string }

async function fetchDemoAI(aiId: string, history: HistoryEntry[]): Promise<string> {
  const res = await fetch('/api/demo/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aiId, history }),
  })
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = '', fullText = ''
  while (true) {
    const { done, value } = await reader.read()
    if (value) buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n'); buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const d = line.slice(6).trim()
      if (d === '[DONE]') return fullText
      try { const p = JSON.parse(d); if (p.text) fullText += p.text } catch {}
    }
    if (done) break
  }
  return fullText
}

const AI_COLORS: Record<string, string> = {
  claude: '#7C3AED', gpt: '#10A37F', gemini: '#1A73E8', perplexity: '#FF6B2B',
}

export default function DemoChat({ topic }: { topic: string }) {
  const router = useRouter()
  const t = useTranslations('nav')
  const [messages, setMessages] = useState<Message[]>([
    { id: 'user-topic', aiId: 'user', name: 'Tu', content: topic, isUser: true },
  ])
  const [phase, setPhase]           = useState<Phase>('round1')
  const [followUp, setFollowUp]     = useState('')
  const [history, setHistory]       = useState<HistoryEntry[]>([{ role: 'utente', content: topic }])
  const [showLogin, setShowLogin]   = useState(false)
  const [phoneScale, setPhoneScale] = useState(1)
  const [activeAi, setActiveAi]     = useState<string | null>(null)
  const [thinkingAi, setThinkingAi] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(() => {
    const d = new Date(); return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`
  })

  // Due ref separati per desktop e mobile — nessuno dei due è mai "nascosto" dal punto di vista del DOM quando è attivo
  const desktopMsgRef = useRef<HTMLDivElement>(null)
  const mobileMsgRef  = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const desktopInputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef  = useRef<HTMLInputElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const tick = () => { const d = new Date(); setCurrentTime(`${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`) }
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const calc = () => setPhoneScale(Math.min(1, (window.innerHeight - 96) / 790, (window.innerWidth - 32) / 390))
    calc(); window.addEventListener('resize', calc); return () => window.removeEventListener('resize', calc)
  }, [])

  useEffect(() => {
    if (phase === 'between') setTimeout(() => { desktopInputRef.current?.focus(); mobileInputRef.current?.focus() }, 100)
  }, [phase])

  // scroll: identico ad AigoraChat — flex-col-reverse → scrollTop=0 è il fondo
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      for (const el of [desktopMsgRef.current, mobileMsgRef.current]) {
        if (el && isAtBottomRef.current) el.scrollTop = 0
      }
    }, 0)
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, thinkingAi, scrollToBottom])

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

  const runOneAi = useCallback(async (aiId: string, h: HistoryEntry[]): Promise<string> => {
    setThinkingAi(aiId); setActiveAi(aiId)
    let fullText = ''
    try { fullText = await fetchDemoAI(aiId, h) }
    catch (err) { console.error(err); track('demo_ai_error', { aiId }); fullText = '(errore — riprova)' }
    setThinkingAi(null)
    const msgId = `${aiId}-${Date.now()}`
    setMessages(prev => [...prev, { id: msgId, aiId, name: AI_NAMES[aiId], content: '', isStreaming: true }])
    scrollToBottom()
    await typewriteText(msgId, fullText)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false, content: fullText } : m))
    setActiveAi(null)
    return fullText
  }, [typewriteText, scrollToBottom])

  const runRound = useCallback(async (startH: HistoryEntry[]): Promise<HistoryEntry[]> => {
    let h = [...startH]
    for (const aiId of AI_ORDER) {
      const text = await runOneAi(aiId, h)
      h = [...h, { role: AI_NAMES[aiId], content: text }]
    }
    return h
  }, [runOneAi])

  useEffect(() => {
    if (started.current) return; started.current = true
    runRound([{ role: 'utente', content: topic }]).then(h => { setHistory(h); setPhase('between') })
  }, [topic, runRound])

  const handleFollowUp = async () => {
    const text = followUp.trim(); if (!text) return
    track('demo_followup_sent'); setFollowUp(''); setPhase('round2')
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, aiId: 'user', name: 'Tu', content: text, isUser: true }])
    scrollToBottom()
    const finalH = await runRound([...history, { role: 'utente', content: text }])
    setHistory(finalH); setPhase('locked')
    try { localStorage.setItem('aigora_demo_used', '1') } catch {}
  }

  const subtitle = activeAi ? `${AI_NAMES[activeAi]} sta scrivendo…`
    : phase === 'locked' ? 'Dibattito concluso' : '4 AI · Dibattito'

  // ── Parti riusabili come JSX (non come componenti React — evita rimount) ──

  // Header identico alla chat vera
  const chatHeader = (
    <>
      <div className="flex-shrink-0 flex items-center gap-2.5 px-3 py-2"
        style={{ backgroundColor: '#0d0d14', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex -space-x-2 flex-shrink-0">
          {AI_ORDER.map(id => (
            <div key={id} className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold ring-1"
              style={{ fontSize: 8, backgroundColor: AI_COLORS[id], ['--tw-ring-color' as string]: '#0d0d14' }}>
              {id === 'gemini' ? 'Ge' : AI_NAMES[id][0]}
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[13px] leading-none" style={{ color: 'rgba(255,255,255,0.9)' }}>AiGORÀ</div>
          <div className="text-[10px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{subtitle}</div>
        </div>
        <div style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(167,139,250,0.3)', fontSize: 9, fontWeight: 900, color: '#A78BFA', letterSpacing: '0.1em', flexShrink: 0 }}>
          DEMO
        </div>
      </div>
      <PhoneAvatarBar activeAi={activeAi} bgColor="#0d0d14" isDark={true} aiOrder={AI_ORDER} />
    </>
  )

  // Input / footer — varia per phase
  const inputArea = (isDesktop: boolean) => {
    const iRef = isDesktop ? desktopInputRef : mobileInputRef
    if (phase === 'between') return (
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5"
        style={{ backgroundColor: '#0d0d14', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <input ref={iRef} type="text" value={followUp}
          onChange={e => setFollowUp(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleFollowUp() }}
          placeholder="Intervieni nel dibattito…"
          className="flex-1 px-3.5 py-2 text-[12px] outline-none transition-all"
          style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f0', borderRadius: 9999, lineHeight: '1.4' }} />
        <button onClick={handleFollowUp} disabled={!followUp.trim()}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white disabled:opacity-30 flex-shrink-0 transition-all hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', boxShadow: followUp.trim() ? '0 2px 10px rgba(124,58,237,0.4)' : undefined }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
        </button>
      </div>
    )
    if (phase === 'locked') return (
      <div className="flex-shrink-0 px-4 py-4"
        style={{ borderTop: '1px solid rgba(167,139,250,0.2)', background: 'rgba(14,9,25,0.97)', backdropFilter: 'blur(16px)', textAlign: 'center' }}>
        <div style={{ fontSize: 18, marginBottom: 4 }}>🔒</div>
        <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', marginBottom: 4 }}>Hai visto come funziona.</div>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: 12 }}>
          Crea un account gratuito per continuare e accedere a tutti i formati.
        </p>
        <button onClick={() => { track('demo_wall_cta_click'); setShowLogin(true) }}
          style={{ width: '100%', padding: '10px 16px', borderRadius: 11, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', color: '#fff', fontSize: 12, fontWeight: 700, boxShadow: '0 4px 16px rgba(124,58,237,0.45)' }}>
          Crea account gratuito →
        </button>
      </div>
    )
    // round1 / round2: input placeholder disabilitato
    return (
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5"
        style={{ backgroundColor: '#0d0d14', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <input disabled placeholder={phase === 'round2' ? 'Le AI stanno reagendo…' : 'Scrivi un messaggio…'}
          className="flex-1 px-3.5 py-2 text-[12px] outline-none"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.25)', borderRadius: 9999, lineHeight: '1.4' }} />
        <div className="w-8 h-8 rounded-full flex items-center justify-center opacity-20 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
        </div>
      </div>
    )
  }

  // Home indicator
  const homeIndicator = (
    <div className="flex-shrink-0 flex justify-center py-2" style={{ backgroundColor: '#0d0d14' }}>
      <div className="w-28 h-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
    </div>
  )

  // Status bar desktop (dentro il mock)
  const statusBar = (
    <div className="flex-shrink-0 flex items-center justify-between px-5 pt-3 pb-1.5 relative" style={{ backgroundColor: '#0d0d14' }}>
      <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'rgba(255,255,255,0.6)' }}>{currentTime}</span>
      <div className="w-[72px] h-[18px] bg-[#1c1c1e] rounded-full absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
        <div className="w-1.5 h-1.5 bg-[#333] rounded-full" />
      </div>
      <div className="flex items-center gap-1">
        <svg width="15" height="11" viewBox="0 0 15 11" fill="rgba(255,255,255,0.6)">
          <rect x="0" y="4" width="3" height="7" rx="0.5"/><rect x="4" y="2.5" width="3" height="8.5" rx="0.5"/>
          <rect x="8" y="1" width="3" height="10" rx="0.5"/><rect x="12" y="0" width="3" height="11" rx="0.5"/>
        </svg>
        <svg width="12" height="9" viewBox="0 0 24 18" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2">
          <path d="M1 5.5C4.5 2 8.5 0 12 0s7.5 2 11 5.5"/><path d="M4.5 9C7 6.5 9.5 5 12 5s5 1.5 7.5 4"/>
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
  )

  return (
    <>
      {/* ═══════════════════════ DESKTOP — mock iPhone ════════════════════════ */}
      <div className="desktop-bg min-h-screen flex items-center justify-center p-6 chat-layout relative">

        {/* Navbar identica alla chat vera */}
        <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 h-14"
          style={{ backgroundColor: 'rgba(7,7,15,0.4)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)' }}>
          {/* Sinistra — torna home */}
          <button onClick={() => router.push('/')}
            className="flex items-center gap-2 text-sm font-medium transition-all hover:text-white"
            style={{ color: 'rgba(255,255,255,0.45)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            Home
          </button>
          {/* Centro — logo */}
          <span className="absolute left-1/2 -translate-x-1/2 font-black text-lg tracking-tight">
            <span className="text-white">Ai</span><span style={{ color: '#A78BFA' }}>GORÀ</span>
          </span>
          {/* Destra — accedi */}
          <button onClick={() => setShowLogin(true)}
            className="flex items-center gap-2 text-sm font-medium transition-all hover:text-white"
            style={{ color: 'rgba(255,255,255,0.45)' }}>
            {t('signIn')}
          </button>
        </div>

        {/* Mock iPhone */}
        <div className="relative flex-shrink-0 mt-14" style={{ borderRadius: 50 * phoneScale }}>
          <div className="phone-shell scale-in" style={{ width: 390, height: 790, zoom: phoneScale, position: 'relative' }}>
            <div className="absolute inset-0 rounded-[50px] bg-[#1c1c1e]"
              style={{ boxShadow: '0 0 0 1.5px #3a3a3c, 0 40px 100px rgba(0,0,0,0.8), 0 0 0 0.5px #555 inset' }} />
            <div className="phone-glare" />
            <div className="absolute rounded-[44px] overflow-hidden flex flex-col"
              style={{ top: 9, left: 9, right: 9, bottom: 9, backgroundColor: '#07070f' }}>
              {statusBar}
              {chatHeader}
              {/* Messaggi — flex-col-reverse + scrollTop=0 come AigoraChat */}
              <div
                ref={desktopMsgRef}
                onScroll={e => { isAtBottomRef.current = e.currentTarget.scrollTop < 80 }}
                className="flex-1 overflow-y-auto py-2 pb-4 flex flex-col-reverse gap-1 relative"
                style={{ backgroundColor: '#07070f', overflowX: 'hidden', minHeight: 0 }}
              >
                {thinkingAi && <ThinkingBubble aiId={thinkingAi} isDark={true} />}
                {[...messages].reverse().map(msg => (
                  <MessageBubble key={msg.id} message={msg} bgTheme="white" />
                ))}
              </div>
              {inputArea(true)}
              {homeIndicator}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ MOBILE — schermo intero ══════════════════════ */}
      <div className="phone-screen-mobile hidden flex-col" style={{ backgroundColor: '#07070f' }}>
        {/* Status bar mobile con ora + Home */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 pb-2"
          style={{ backgroundColor: '#0d0d14', paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
          <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'rgba(255,255,255,0.6)' }}>{currentTime}</span>
          <span className="absolute left-1/2 -translate-x-1/2 font-black text-base tracking-tight">
            <span className="text-white">Ai</span><span style={{ color: '#A78BFA' }}>GORÀ</span>
          </span>
          <button onClick={() => router.push('/')}
            className="flex items-center gap-1 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            Home
          </button>
        </div>
        {chatHeader}
        {/* Messaggi */}
        <div
          ref={mobileMsgRef}
          onScroll={e => { isAtBottomRef.current = e.currentTarget.scrollTop < 80 }}
          className="flex-1 overflow-y-auto py-2 pb-4 flex flex-col-reverse gap-1 relative"
          style={{ backgroundColor: '#07070f', overflowX: 'hidden', minHeight: 0 }}
        >
          {thinkingAi && <ThinkingBubble aiId={thinkingAi} isDark={true} />}
          {[...messages].reverse().map(msg => (
            <MessageBubble key={msg.id} message={msg} bgTheme="white" />
          ))}
        </div>
        {inputArea(false)}
        {homeIndicator}
      </div>

      {showLogin && <LoginModal mode={'chat' as SelectableMode} onClose={() => setShowLogin(false)} />}
    </>
  )
}
