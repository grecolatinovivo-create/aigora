'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import MessageBubble, { Message } from './MessageBubble'
import { signOut } from 'next-auth/react'

const AI_ORDER_DEFAULT = ['claude', 'gemini', 'perplexity', 'gpt']
const AI_NAMES: Record<string, string> = { claude: 'Claude', gpt: 'GPT', gemini: 'Gemini', perplexity: 'Perplexity' }
const AI_COLOR: Record<string, string> = { claude: '#7C3AED', gpt: '#10A37F', gemini: '#1A73E8', perplexity: '#FF6B2B' }
const AI_DESC: Record<string, string> = {
  claude: 'Anthropic · riflessivo',
  gpt: 'OpenAI · pratico',
  gemini: 'Google · analitico',
  perplexity: 'Perplexity · aggiornato',
}

const TYPEWRITER_DELAY = 48

const BG_PRESETS = [
  { label: 'Crema',   value: '#f5f0e8', header: '#ede8dc', text: 'black' as const },
  { label: 'Bianco',  value: '#ffffff', header: '#f0f0f0', text: 'black' as const },
  { label: 'Verde',   value: '#e8f5e9', header: '#d0ead2', text: 'black' as const },
  { label: 'Notte',   value: '#0d0d14', header: '#111118', text: 'white' as const },
  { label: 'Lavanda', value: '#ede8f8', header: '#e0d8f5', text: 'black' as const },
  { label: 'Slate',   value: '#e8edf5', header: '#d8e0ee', text: 'black' as const },
]

const TOPIC_SUGGESTIONS = [
  'L\'IA sostituirà i lavori creativi?',
  'Esiste il libero arbitrio?',
  'Il cambiamento climatico è ancora reversibile?',
  'Social media: bene o male per la democrazia?',
  'Dovremmo colonizzare Marte?',
]

// Topic aggiuntivi per le bubble fluttuanti
const FLOATING_TOPICS = [
  'La coscienza è solo chimica?',
  'Chi controlla l\'IA?',
  'Il futuro è distopico?',
]

type ChatPhase = 'start' | 'running' | 'done'

function detectNextAi(text: string, aiOrder: string[]): string | null {
  const lower = text.toLowerCase()
  for (const aiId of aiOrder) {
    const name = AI_NAMES[aiId].toLowerCase()
    if (lower.includes(`passo la parola a ${name}`) || lower.includes(`${name}, cosa ne pensi`)) return aiId
  }
  return null
}
function getDefaultNextAi(currentAi: string, usedAis: string[], aiOrder: string[]): string {
  const others = aiOrder.filter(id => id !== currentAi)
  const unused = others.filter(id => !usedAis.includes(id))
  if (unused.length > 0) return unused[0]
  const idx = aiOrder.indexOf(currentAi)
  return aiOrder[(idx + 1) % aiOrder.length]
}

// ── Avatar bar ────────────────────────────────────────────────────────────────
function PhoneAvatarBar({ activeAi, bgColor, isDark, aiOrder }: { activeAi: string | null; bgColor: string; isDark: boolean; aiOrder: string[] }) {
  return (
    <div className="flex items-center justify-around px-2 py-1.5" style={{
      backgroundColor: bgColor,
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
    }}>
      {aiOrder.map(id => {
        const isActive = activeAi === id
        const color = AI_COLOR[id]
        return (
          <div key={id} className="flex flex-col items-center gap-0.5">
            <div className="relative w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold transition-all duration-300"
              style={{
                backgroundColor: isActive ? color : color + '40',
                boxShadow: isActive ? `0 0 12px 3px ${color}66` : undefined,
                transform: isActive ? 'scale(1.18)' : 'scale(1)',
                animation: isActive ? 'avatar-glow 1.2s ease-in-out infinite' : undefined,
              }}>
              {id === 'gemini' ? 'Ge' : AI_NAMES[id][0]}
              {isActive && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-white" />}
            </div>
            <span className="text-[8px] font-medium transition-colors" style={{ color: isActive ? (isDark ? '#fff' : '#111') : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)') }}>
              {AI_NAMES[id]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Tre puntini ───────────────────────────────────────────────────────────────
function ThinkingBubble({ aiId, isDark }: { aiId: string; isDark: boolean }) {
  const color = AI_COLOR[aiId] || '#6B7280'
  const dotColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'
  const bubbleBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
  return (
    <div className="flex items-end gap-2 px-3 mb-2 message-enter">
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mb-0.5" style={{ backgroundColor: color }}>
        {AI_NAMES[aiId]?.[0]}
      </div>
      <div className="rounded-2xl rounded-bl-sm px-4 py-3" style={{ backgroundColor: bubbleBg }}>
        <div className="flex gap-1.5 items-center h-3">
          {[0, 180, 360].map(d => (
            <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: dotColor, animationDelay: `${d}ms`, animationDuration: '1s' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Separatore "è il tuo turno" ───────────────────────────────────────────────
function UserTurnPrompt({ name, isDark }: { name: string; isDark: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 my-3 message-enter">
      <div className="flex-1 h-px" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
      <div className="waiting-pulse flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
        style={{ backgroundColor: isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.12)', color: isDark ? '#c4b5fd' : '#6d28d9', border: `1px solid ${isDark ? 'rgba(196,181,253,0.25)' : 'rgba(109,40,217,0.2)'}` }}>
        <span>💬</span>
        <span>{name}, cosa ne pensi?</span>
      </div>
      <div className="flex-1 h-px" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
    </div>
  )
}

// ── Componente principale ─────────────────────────────────────────────────────
interface AigoraChatProps {
  allowedAis?: string[]
  userPlan?: string
  userName?: string
  userEmail?: string
}

export default function AigoraChat({ allowedAis, userPlan, userName: propUserName, userEmail }: AigoraChatProps) {
  const AI_ORDER = allowedAis?.length ? allowedAis : AI_ORDER_DEFAULT

  const [phase, setPhase] = useState<ChatPhase>('start')
  const [question, setQuestion] = useState('')
  const [userName, setUserName] = useState(propUserName ?? '')
  const [nameConfirmed, setNameConfirmed] = useState(!!(propUserName?.trim()))
  const [nameInput, setNameInput] = useState('')
  const [inputText, setInputText] = useState('')
  const [bgPreset, setBgPreset] = useState(BG_PRESETS[0])
  const [messages, setMessages] = useState<Message[]>([])
  const [activeAi, setActiveAi] = useState<string | null>(null)
  const [thinkingAi, setThinkingAi] = useState<string | null>(null)
  const [synthesis, setSynthesis] = useState<string | null>(null)
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [showSynthesis, setShowSynthesis] = useState(false)
  const [waitingForUser, setWaitingForUser] = useState(false)
  const [turnCount, setTurnCount] = useState(0)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [savedChats, setSavedChats] = useState<{id:string; title:string; date:string; messages: Message[]; history: {name:string;content:string}[]}[]>([])

  // Carica cronologia da localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('aigora_chats')
      if (raw) setSavedChats(JSON.parse(raw))
    } catch {}
  }, [])

  const currentChatIdRef = useRef(`chat-${Date.now()}`)

  const saveCurrentChat = useCallback(() => {
    if (messagesRef.current.length < 2) return
    const title = messagesRef.current.find(m => m.isUser)?.content?.slice(0, 60) ?? 'Chat'
    const chat = {
      id: currentChatIdRef.current,
      title,
      date: new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      messages: messagesRef.current,
      history: chatHistoryRef.current,
    }
    setSavedChats(prev => {
      const filtered = prev.filter(c => c.id !== currentChatIdRef.current)
      const updated = [chat, ...filtered].slice(0, 30)
      try { localStorage.setItem('aigora_chats', JSON.stringify(updated)) } catch {}
      return updated
    })
  }, [])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<Message[]>([])
  const chatHistoryRef = useRef<{ name: string; content: string }[]>([])
  const usedAisRef = useRef<string[]>([])
  const stopRequestedRef = useRef(false)
  const waitingForUserRef = useRef(false)   // ref speculare a waitingForUser
  const aiTurnCountRef = useRef(0)

  const isDark = bgPreset.text === 'white'
  const displayName = userName.trim() || 'Tu'
  const historyName = userName.trim() || 'Utente'

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    messagesRef.current = messages
    scrollToBottom()
    if (messages.length >= 2) saveCurrentChat()
  }, [messages, thinkingAi, waitingForUser, scrollToBottom, saveCurrentChat])

  const typewriteText = useCallback((msgId: string, text: string): Promise<void> => {
    return new Promise(resolve => {
      let i = 0
      const iv = setInterval(() => {
        if (stopRequestedRef.current) {
          clearInterval(iv)
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: text } : m))
          resolve(); return
        }
        if (i >= text.length) { clearInterval(iv); resolve(); return }
        i++
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: text.slice(0, i) } : m))
        if (i % 14 === 0) scrollToBottom()
      }, TYPEWRITER_DELAY)
    })
  }, [scrollToBottom])

  const streamAiResponse = useCallback(async (aiId: string, isSynthesis = false): Promise<string | null> => {
    if (stopRequestedRef.current) return null
    setThinkingAi(aiId)
    setActiveAi(aiId)

    let fullText = ''
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: chatHistoryRef.current, aiId, action: isSynthesis ? 'synthesize' : 'turn' }),
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (line.startsWith('data: ')) {
            const d = line.slice(6).trim()
            if (d === '[DONE]') break
            try { fullText += JSON.parse(d).text } catch {}
          }
        }
      }
    } catch (err) { console.error(err); fullText = '(Errore nella risposta)' }

    setThinkingAi(null)
    if (stopRequestedRef.current) { setActiveAi(null); return null }

    const msgId = `${aiId}-${Date.now()}`
    setMessages(prev => [...prev, { id: msgId, aiId, name: AI_NAMES[aiId] || aiId, content: '', isStreaming: true, isSynthesis }])
    await typewriteText(msgId, fullText)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false, content: fullText } : m))
    setActiveAi(null)
    return fullText
  }, [typewriteText])

  const runFactCheck = useCallback(async (speakerAiId: string): Promise<void> => {
    if (stopRequestedRef.current) return
    // Scegli un interruptore casuale diverso dal parlante
    const others = AI_ORDER.filter(id => id !== speakerAiId)
    const interruptorId = others[Math.floor(Math.random() * others.length)]
    const interruptorName = AI_NAMES[interruptorId]
    const speakerName = AI_NAMES[speakerAiId]

    let fullText = ''
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: chatHistoryRef.current,
          aiId: interruptorId,
          action: 'factcheck',
          interruptorId,
          speakerName,
        }),
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (line.startsWith('data: ')) {
            const d = line.slice(6).trim()
            if (d === '[DONE]') break
            try { fullText += JSON.parse(d).text } catch {}
          }
        }
      }
    } catch (err) { console.error('factcheck error', err); return }

    // Se l'AI interruptore non ha trovato errori, non mostrare nulla
    const trimmed = fullText.trim()
    if (!trimmed || trimmed.toUpperCase().startsWith('PASS')) return

    // Mostra l'interruzione come messaggio nella chat
    const msgId = `interrupt-${Date.now()}`
    setMessages(prev => [...prev, {
      id: msgId,
      aiId: interruptorId,
      name: `${interruptorName} ✋`,
      content: '',
      isStreaming: true,
    }])
    // typewrite
    await new Promise<void>(resolve => {
      let i = 0
      const iv = setInterval(() => {
        if (stopRequestedRef.current) { clearInterval(iv); resolve(); return }
        if (i >= trimmed.length) { clearInterval(iv); resolve(); return }
        i++
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: trimmed.slice(0, i) } : m))
      }, 36)
    })
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false, content: trimmed } : m))
    chatHistoryRef.current.push({ name: `${interruptorName} (interruzione)`, content: trimmed })
  }, [AI_ORDER])

  const runDebate = useCallback(async (startAi: string) => {
    let currentAi = startAi
    stopRequestedRef.current = false
    while (!stopRequestedRef.current) {
      const text = await streamAiResponse(currentAi)
      if (!text || stopRequestedRef.current) break
      chatHistoryRef.current.push({ name: AI_NAMES[currentAi], content: text })
      usedAisRef.current.push(currentAi)
      aiTurnCountRef.current += 1
      setTurnCount(aiTurnCountRef.current)

      const detected = detectNextAi(text, AI_ORDER)
      const nextAi = detected || getDefaultNextAi(currentAi, usedAisRef.current, AI_ORDER)

      // Fact-check ogni 2 turni AI
      if (aiTurnCountRef.current % 2 === 0 && !stopRequestedRef.current) {
        await runFactCheck(currentAi)
      }

      if (aiTurnCountRef.current % 4 === 0) {
        waitingForUserRef.current = true
        setWaitingForUser(true)
        stopRequestedRef.current = true
        return
      }
      await new Promise(r => setTimeout(r, 320))
      currentAi = nextAi
    }
  }, [streamAiResponse, runFactCheck])

  const handleStart = () => {
    if (!question.trim()) return
    currentChatIdRef.current = `chat-${Date.now()}`
    chatHistoryRef.current = [{ name: historyName, content: question }]
    usedAisRef.current = []
    aiTurnCountRef.current = 0
    stopRequestedRef.current = false
    setMessages([{ id: 'user-0', aiId: 'user', name: displayName, content: question, isUser: true }])
    setTurnCount(0)
    setPhase('running')
    runDebate('claude')
  }

  const handleSendMessage = () => {
    if (!inputText.trim()) return
    const text = inputText.trim()
    setInputText('')
    const userMsg: Message = { id: `user-${Date.now()}`, aiId: 'user', name: displayName, content: text, isUser: true }
    chatHistoryRef.current.push({ name: historyName, content: text })
    setMessages(prev => [...prev, userMsg])
    // Usa il ref (non lo state) per evitare closure stale
    if (waitingForUserRef.current || stopRequestedRef.current) {
      waitingForUserRef.current = false
      setWaitingForUser(false)
      aiTurnCountRef.current = 0
      stopRequestedRef.current = false
      const lastAi = usedAisRef.current[usedAisRef.current.length - 1] || 'claude'
      setTimeout(() => runDebate(getDefaultNextAi(lastAi, [], AI_ORDER)), 150)
    }
    // Se la loop è ancora in corso, il messaggio è già in chatHistoryRef
    // e verrà letto al prossimo turno — non serve fare nulla
  }

  const handleSynthesize = async () => {
    setIsSynthesizing(true)
    setShowSynthesis(true)
    stopRequestedRef.current = true
    setThinkingAi(null); setActiveAi(null); setWaitingForUser(false)
    await new Promise(r => setTimeout(r, 200))
    stopRequestedRef.current = false
    let fullText = ''
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: chatHistoryRef.current, aiId: 'claude', action: 'synthesize' }),
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (line.startsWith('data: ')) {
            const d = line.slice(6).trim()
            if (d === '[DONE]') break
            try { fullText += JSON.parse(d).text; setSynthesis(fullText) } catch {}
          }
        }
      }
    } catch { fullText = 'Errore nella sintesi.' }
    setSynthesis(fullText)
    setIsSynthesizing(false)
    setPhase('done')
    saveCurrentChat()
  }

  const handleReset = () => {
    stopRequestedRef.current = true
    waitingForUserRef.current = false
    setMessages([]); setQuestion(''); setInputText(''); setUserName('')
    setPhase('start'); setActiveAi(null); setThinkingAi(null)
    setSynthesis(null); setShowSynthesis(false); setWaitingForUser(false)
    setTurnCount(0)
    chatHistoryRef.current = []; usedAisRef.current = []
    aiTurnCountRef.current = 0
  }

  // ── SCHERMATA NOME ────────────────────────────────────────────────────────────
  if (!nameConfirmed) {
    return (
      <div className="desktop-bg min-h-screen flex flex-col items-center justify-center px-4 relative">
        {/* Navbar desktop */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
          <button onClick={() => window.location.href = '/dashboard'}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.4)',
              backdropFilter: 'blur(8px)'
            }}>
            <span style={{ fontSize: '14px' }}>🕐</span>
            <span>Cronologia</span>
          </button>

          {/* Profilo dropdown */}
          <div className="relative">
            <button onClick={() => setShowProfileMenu(p => !p)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white transition-transform duration-200 hover:scale-110 active:scale-95"
              style={{ backgroundColor: '#F59E0B', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}>
              {(userEmail || '?')[0].toUpperCase()}
            </button>

            {/* Dropdown menu */}
            {showProfileMenu && (
              <div className="absolute right-0 top-12 w-56 rounded-2xl overflow-hidden shadow-xl z-50 animate-in fade-in slide-in-from-top-2"
                style={{
                  backgroundColor: 'rgba(15,15,20,0.95)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(16px)'
                }}>
                <div className="px-4 py-3 border-b border-white/8">
                  <div className="text-white font-semibold text-sm truncate">{displayName || userEmail || '—'}</div>
                  <div className="text-white/40 text-[11px] truncate mt-1">{userEmail}</div>
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.25)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                    {(userPlan ?? 'FREE').toUpperCase()}
                  </div>
                </div>
                <button onClick={() => { signOut({ callbackUrl: '/login' }); setShowProfileMenu(false) }}
                  className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-white/5 transition-colors duration-150 font-medium">
                  Esci
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card nome centrale */}
        <div className="glass rounded-3xl p-8 w-full max-w-sm scale-in text-center">
          <div className="text-5xl mb-4">👋</div>
          <h2 className="text-2xl font-black text-white mb-2">Come ti chiami?</h2>
          <p className="text-white/50 text-sm mb-8">Il tuo nome apparirà nel dibattito tra le AI</p>
          <input
            autoFocus
            type="text"
            placeholder="Il tuo nome…"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && nameInput.trim()) {
                setUserName(nameInput.trim())
                setNameConfirmed(true)
              }
            }}
            className="w-full px-4 py-3 rounded-xl bg-white/5 text-white placeholder-white/25 border border-white/10 focus:outline-none focus:border-purple-400/50 focus:ring-2 focus:ring-purple-500/10 text-sm mb-4 transition-all duration-200"
          />
          <button
            onClick={() => {
              if (nameInput.trim()) {
                setUserName(nameInput.trim())
                setNameConfirmed(true)
              }
            }}
            disabled={!nameInput.trim()}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: nameInput.trim() ? 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)' : '#333', boxShadow: nameInput.trim() ? '0 4px 20px rgba(124, 58, 237, 0.35)' : undefined }}>
            Entra nel dibattito →
          </button>
        </div>
      </div>
    )
  }

  // ── SCHERMATA INIZIALE ────────────────────────────────────────────────────────
  if (phase === 'start') {
    const allTopics = TOPIC_SUGGESTIONS.concat(FLOATING_TOPICS)

    return (
      <div className="desktop-bg min-h-screen flex flex-col items-center justify-center px-4 py-12 mobile-start relative overflow-hidden">

        {/* Bubble fluttuanti (solo desktop xl+) */}
        {[
          "L'IA sostituirà i lavori creativi?",
          'Esiste il libero arbitrio?',
          'Il cambiamento climatico è reversibile?',
          'Social media: bene o male?',
          'Dovremmo colonizzare Marte?',
          'La coscienza è solo chimica?',
          'Chi controlla l\'IA?',
          'Il futuro è distopico?',
          'Siamo soli nell\'universo?',
          'L\'arte può essere artificiale?',
          'Etica e tecnologia: compatibili?',
          'La privacy è ancora un diritto?',
        ].map((text, i) => {
          // Ai lati della card (max-w-lg = ~512px), distribuite in altezza solo nella metà superiore/media
          const positions = [
            { top: '22%', left: 'calc(50% - 420px)'  },
            { top: '32%', right: 'calc(50% - 420px)' },
            { top: '42%', left: 'calc(50% - 410px)'  },
            { top: '52%', right: 'calc(50% - 410px)' },
            { top: '28%', left: 'calc(50% - 430px)'  },
            { top: '38%', right: 'calc(50% - 430px)' },
            { top: '48%', left: 'calc(50% - 415px)'  },
            { top: '35%', right: 'calc(50% - 415px)' },
            { top: '25%', right: 'calc(50% - 425px)' },
            { top: '45%', left: 'calc(50% - 425px)'  },
            { top: '55%', right: 'calc(50% - 420px)' },
            { top: '30%', left: 'calc(50% - 420px)'  },
          ]
          const pos = positions[i % positions.length]
          const delays = ['0s','2s','4s','1s','3s','5s','1.5s','3.5s','0.5s','2.5s','4.5s','6s']
          const durs   = ['13s','15s','14s','16s','13.5s','15.5s','14.5s','16.5s','12.5s','14.5s','15s','13s']
          const anims  = ['float-1','float-2','float-3','float-4']

          return (
            <div key={i}
              className="absolute hidden xl:block px-4 py-2.5 rounded-full text-[11px] font-medium pointer-events-none select-none"
              style={{
                ...pos,
                color: 'rgba(255,255,255,0.5)',
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(8px)',
                maxWidth: '180px',
                textAlign: 'center',
                lineHeight: 1.4,
                animation: `${anims[i % 4]} ${durs[i % durs.length]} ease-in-out infinite`,
                animationDelay: delays[i % delays.length],
              }}>
              {text}
            </div>
          )
        })}

        <div className="w-full max-w-lg scale-in relative z-10">

          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-[11px] font-medium text-purple-300 border border-purple-500/30" style={{ backgroundColor: 'rgba(124,58,237,0.12)' }}>
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
              4 intelligenze artificiali · dibattito in tempo reale
            </div>
            <h1 className="text-6xl font-black text-white mb-3 tracking-tight leading-none">
              Ai<span style={{ color: '#A78BFA' }}>GOR</span>À
            </h1>
            <p className="text-white/50 text-sm leading-relaxed max-w-sm mx-auto">
              Poni una domanda e assisti al dibattito in tempo reale tra le quattro principali intelligenze artificiali
            </p>
          </div>

          {/* AI cards */}
          <div className="ai-grid grid grid-cols-4 gap-2 mb-8">
            {AI_ORDER.map(id => (
              <div key={id} className="glass rounded-2xl p-3 flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs"
                  style={{ backgroundColor: AI_COLOR[id], boxShadow: `0 4px 14px ${AI_COLOR[id]}55` }}>
                  {id === 'gemini' ? 'Ge' : AI_NAMES[id][0]}
                </div>
                <div>
                  <div className="text-white text-[11px] font-semibold">{AI_NAMES[id]}</div>
                  <div className="text-white/35 text-[9px] mt-0.5">{AI_DESC[id]}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="glass rounded-3xl p-5 space-y-3">
            <div className="relative">
              <textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleStart() } }}
                placeholder="Poni una domanda alle AI…"
                rows={3}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-500/50 placeholder:text-white/20 resize-none leading-relaxed transition-colors"
              />
            </div>

            {/* Topic suggeriti */}
            <div className="flex flex-wrap gap-1.5">
              {TOPIC_SUGGESTIONS.map(t => (
                <button key={t} onClick={() => setQuestion(t)}
                  className="text-[10px] px-2.5 py-1 rounded-full border border-white/10 text-white/40 hover:text-white/70 hover:border-white/25 transition-all">
                  {t}
                </button>
              ))}
            </div>

            <button
              onClick={handleStart}
              disabled={!question.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-25 disabled:cursor-not-allowed"
              style={{ background: question.trim() ? 'linear-gradient(135deg, #7C3AED, #5B21B6)' : '#333', boxShadow: question.trim() ? '0 4px 20px rgba(124,58,237,0.4)' : undefined }}
            >
              Avvia il dibattito →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── SCHERMATA CHAT ────────────────────────────────────────────────────────────
  return (
    <div className="desktop-bg min-h-screen flex items-center justify-center p-6 gap-6 chat-layout relative">

      {/* Pannello cronologia */}
      <div className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 ease-out ${showHistory ? 'w-72' : 'w-0'} overflow-hidden`}>
        <div className="w-72 h-full flex flex-col" style={{ backgroundColor: 'rgba(10,10,18,0.97)', borderRight: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <span className="text-white font-bold text-sm">Cronologia</span>
            <button onClick={() => setShowHistory(false)} className="text-white/40 hover:text-white text-xl leading-none transition-colors">×</button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {savedChats.length === 0 ? (
              <p className="text-white/25 text-xs text-center mt-8 px-4">Nessuna chat salvata.<br />Le chat vengono salvate dopo la sintesi.</p>
            ) : (
              savedChats.map(chat => (
                <button key={chat.id} onClick={() => {
                  setMessages(chat.messages)
                  chatHistoryRef.current = chat.history
                  setPhase('running')
                  setShowHistory(false)
                }}
                  className="w-full text-left px-5 py-3 hover:bg-white/5 transition-colors border-b border-white/5">
                  <div className="text-white/80 text-xs font-medium truncate">{chat.title}</div>
                  <div className="text-white/30 text-[10px] mt-0.5">{chat.date}</div>
                </button>
              ))
            )}
          </div>
          <div className="px-5 py-4 border-t border-white/8">
            <button onClick={() => {
              setSavedChats([])
              localStorage.removeItem('aigora_chats')
            }} className="text-red-400/60 hover:text-red-400 text-xs transition-colors">
              Cancella cronologia
            </button>
          </div>
        </div>
      </div>

      {/* Overlay chiusura pannello */}
      {showHistory && <div className="fixed inset-0 z-40" onClick={() => setShowHistory(false)} />}

      {/* Navbar desktop pagina */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-50">
        <button onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.4)',
            backdropFilter: 'blur(8px)'
          }}>
          Cronologia
        </button>

        {/* Profilo dropdown */}
        <div className="relative">
          <button onClick={() => setShowProfileMenu(p => !p)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white transition-transform duration-200 hover:scale-110 active:scale-95"
            style={{ backgroundColor: '#F59E0B', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}>
            {(displayName || userEmail || '?')[0].toUpperCase()}
          </button>

          {/* Menu profilo dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 top-12 w-56 rounded-2xl overflow-hidden shadow-xl z-50 animate-in fade-in slide-in-from-top-2"
              style={{
                backgroundColor: 'rgba(15,15,20,0.95)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(16px)'
              }}>
              <div className="px-4 py-3 border-b border-white/8">
                <div className="text-white font-semibold text-sm truncate">{displayName || userEmail || '—'}</div>
                <div className="text-white/40 text-[11px] truncate mt-1">{userEmail}</div>
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                  style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                  {(userPlan ?? 'FREE').toUpperCase()}
                </div>
              </div>
              <button onClick={() => { signOut({ callbackUrl: '/login' }); setShowProfileMenu(false) }}
                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-white/5 transition-colors duration-150 font-medium">
                Esci
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── TELEFONO (desktop) ── */}
      <div className="phone-shell relative flex-shrink-0 scale-in" style={{ width: 390, height: 790 }}>

        {/* Cornice */}
        <div className="absolute inset-0 rounded-[50px] bg-[#1c1c1e]"
          style={{ boxShadow: '0 0 0 1.5px #3a3a3c, 0 40px 100px rgba(0,0,0,0.8), 0 0 0 0.5px #555 inset' }} />

        {/* Glare */}
        <div className="phone-glare" />

        {/* Schermo desktop */}
        <div className="absolute rounded-[44px] overflow-hidden flex flex-col"
          style={{ top: 9, left: 9, right: 9, bottom: 9, backgroundColor: bgPreset.value }}>

          {/* Status bar */}
          <div className="flex-shrink-0 flex items-center justify-between px-5 pt-3 pb-1.5" style={{ backgroundColor: bgPreset.header }}>
            <span className="text-[11px] font-semibold tabular-nums" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>9:41</span>
            <div className="w-[72px] h-[18px] bg-[#1c1c1e] rounded-full absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-[#333] rounded-full" />
            </div>
            <div className="flex items-center gap-1">
              <svg width="15" height="11" viewBox="0 0 15 11" fill={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}><rect x="0" y="4" width="3" height="7" rx="0.5"/><rect x="4" y="2.5" width="3" height="8.5" rx="0.5"/><rect x="8" y="1" width="3" height="10" rx="0.5"/><rect x="12" y="0" width="3" height="11" rx="0.5"/></svg>
              <svg width="12" height="9" viewBox="0 0 24 18" fill="none" stroke={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'} strokeWidth="2"><path d="M1 5.5C4.5 2 8.5 0 12 0s7.5 2 11 5.5"/><path d="M4.5 9C7 6.5 9.5 5 12 5s5 1.5 7.5 4"/><path d="M8 12.5C9.5 11 10.75 10 12 10s2.5 1 4 2.5"/><circle cx="12" cy="16" r="2" fill={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'} stroke="none"/></svg>
              <div className="flex items-center gap-0.5">
                <div className="w-5 h-2.5 rounded-sm border" style={{ borderColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)' }}>
                  <div className="h-full w-3/4 rounded-sm ml-0.5" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Chat header */}
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2" style={{ backgroundColor: bgPreset.header, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
            {/* Cronologia sx */}
            <button onClick={() => { handleReset(); window.location.href = '/dashboard' }}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all hover:scale-105 active:scale-95"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }}>
              🕐
            </button>

            <div className="flex-1 min-w-0 text-center">
              <div className="font-semibold text-[13px] leading-none" style={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>AiGORÀ</div>
              <div className="text-[10px] mt-0.5 truncate" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                {activeAi ? `${AI_NAMES[activeAi]} sta scrivendo…` : `Turno ${turnCount + 1} · 4 AI`}
              </div>
            </div>

            {/* Picker colori */}
            <div className="flex gap-1 flex-shrink-0">
              {BG_PRESETS.map(p => (
                <button key={p.value} onClick={() => setBgPreset(p)} title={p.label}
                  className="w-3.5 h-3.5 rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: p.value, outline: bgPreset.value === p.value ? `2px solid ${isDark ? '#fff' : '#000'}` : '2px solid transparent', outlineOffset: '1px' }} />
              ))}
            </div>

            {/* Profilo dx */}
            <button onClick={() => signOut({ callbackUrl: '/login' })} title="Esci"
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all hover:scale-105"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }}>
              👤
            </button>
          </div>

          {/* Avatar bar */}
          <PhoneAvatarBar activeAi={activeAi} bgColor={bgPreset.header} isDark={isDark} aiOrder={AI_ORDER} />

          {/* Messaggi */}
          <div className="flex-1 overflow-y-auto py-3" style={{ backgroundColor: bgPreset.value }}>
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} bgTheme={isDark ? 'white' : 'black'} />)}
            {thinkingAi && <ThinkingBubble aiId={thinkingAi} isDark={isDark} />}
            {waitingForUser && <UserTurnPrompt name={displayName} isDark={isDark} />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5" style={{
            backgroundColor: bgPreset.header,
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          }}>
            <input
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendMessage() }}
              placeholder={waitingForUser ? `${displayName}, rispondi…` : 'Scrivi un messaggio…'}
              className="flex-1 rounded-full px-3.5 py-2 text-[12px] outline-none transition-all"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                border: `1px solid ${waitingForUser ? (isDark ? 'rgba(196,181,253,0.4)' : 'rgba(109,40,217,0.3)') : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')}`,
                color: isDark ? '#f0f0f0' : '#111',
                boxShadow: waitingForUser ? (isDark ? '0 0 0 2px rgba(196,181,253,0.15)' : '0 0 0 2px rgba(109,40,217,0.1)') : undefined,
              }}
            />
            <button onClick={handleSendMessage} disabled={!inputText.trim()}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-30 hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #10A37F, #0d8c6d)', boxShadow: inputText.trim() ? '0 2px 10px rgba(16,163,127,0.4)' : undefined }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
            </button>
          </div>

          {/* Home indicator */}
          <div className="flex-shrink-0 flex justify-center py-2" style={{ backgroundColor: bgPreset.header }}>
            <div className="w-28 h-1 rounded-full" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)' }} />
          </div>
        </div>

        {/* Tasti fisici */}
        <div className="absolute -left-[5px] top-28  w-[3px] h-8  bg-[#2a2a2a] rounded-l-sm" />
        <div className="absolute -left-[5px] top-44  w-[3px] h-14 bg-[#2a2a2a] rounded-l-sm" />
        <div className="absolute -left-[5px] top-64  w-[3px] h-14 bg-[#2a2a2a] rounded-l-sm" />
        <div className="absolute -right-[5px] top-48 w-[3px] h-20 bg-[#2a2a2a] rounded-r-sm" />
      </div>

      {/* ── SCHERMO NATIVO MOBILE (visibile solo su schermi piccoli) ── */}
      <div className="phone-screen-mobile hidden flex-col" style={{ backgroundColor: bgPreset.value }}>

        {/* Header mobile */}
        <div className="flex-shrink-0 flex items-center gap-2.5 px-3 py-3 safe-top" style={{ backgroundColor: bgPreset.header, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          <div className="flex -space-x-2 flex-shrink-0">
            {AI_ORDER.map(id => (
              <div key={id} className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-bold ring-1"
                style={{ backgroundColor: AI_COLOR[id], ['--tw-ring-color' as string]: bgPreset.header }}>
                {AI_NAMES[id][0]}
              </div>
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[14px] leading-none" style={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>AiGORÀ</div>
            <div className="text-[11px] mt-0.5 truncate" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
              {activeAi ? `${AI_NAMES[activeAi]} sta scrivendo…` : `Turno ${turnCount + 1} · ${AI_ORDER.length} AI`}
            </div>
          </div>
          <button onClick={handleSynthesize}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all active:scale-95"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }}>
            📋
          </button>
        </div>

        {/* Avatar bar mobile */}
        <PhoneAvatarBar activeAi={activeAi} bgColor={bgPreset.header} isDark={isDark} aiOrder={AI_ORDER} />

        {/* Messaggi mobile */}
        <div className="flex-1 overflow-y-auto py-3" style={{ backgroundColor: bgPreset.value }}>
          {messages.map(msg => <MessageBubble key={msg.id} message={msg} bgTheme={isDark ? 'white' : 'black'} />)}
          {thinkingAi && <ThinkingBubble aiId={thinkingAi} isDark={isDark} />}
          {waitingForUser && <UserTurnPrompt name={displayName} isDark={isDark} />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar mobile */}
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-3" style={{
          backgroundColor: bgPreset.header,
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        }}>
          <input
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSendMessage() }}
            placeholder={waitingForUser ? `${displayName}, rispondi…` : 'Scrivi un messaggio…'}
            className="flex-1 rounded-full px-4 py-2.5 text-[14px] outline-none transition-all"
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
              border: `1px solid ${waitingForUser ? (isDark ? 'rgba(196,181,253,0.4)' : 'rgba(109,40,217,0.3)') : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')}`,
              color: isDark ? '#f0f0f0' : '#111',
            }}
          />
          <button onClick={handleSendMessage} disabled={!inputText.trim()}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-30 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #10A37F, #0d8c6d)', boxShadow: inputText.trim() ? '0 2px 10px rgba(16,163,127,0.4)' : undefined }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
          </button>
        </div>
      </div>

      {/* ── PANNELLO SINTESI ── */}
      <div className={`flex-shrink-0 transition-all duration-500 ease-out${showSynthesis ? ' synthesis-panel-mobile' : ''}`}
        style={{ width: showSynthesis ? 340 : 0, opacity: showSynthesis ? 1 : 0, overflow: 'hidden' }}>
        <div style={{ width: 340 }}>
          <div className="glass-dark rounded-3xl overflow-hidden slide-in-right" style={{ height: 790 }}>

            {/* Header pannello */}
            <div className="px-5 py-4 border-b border-white/8 flex items-start justify-between">
              <div>
                <div className="text-white font-bold text-base">Sintesi</div>
                <div className="text-white/40 text-[11px] mt-0.5">Generata da Claude · {messages.filter(m => !m.isUser).length} messaggi analizzati</div>
              </div>
              <button onClick={() => setShowSynthesis(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all text-lg leading-none">×</button>
            </div>

            {/* Corpo */}
            <div className="p-5 overflow-y-auto" style={{ height: 'calc(100% - 68px)' }}>
              {isSynthesizing && !synthesis && (
                <div className="flex gap-1.5 items-center mt-6">
                  {[0, 150, 300].map(d => <span key={d} className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                </div>
              )}
              {synthesis && (
                <>
                  <p className="text-white/80 text-[13px] leading-[1.75] whitespace-pre-wrap">
                    {synthesis}
                    {isSynthesizing && <span className="typewriter-cursor" />}
                  </p>

                  {/* Partecipanti citati */}
                  {!isSynthesizing && (
                    <div className="mt-6 pt-4 border-t border-white/8">
                      <div className="text-white/30 text-[10px] uppercase tracking-wider mb-3">Partecipanti</div>
                      <div className="flex flex-wrap gap-2">
                        {AI_ORDER.map(id => (
                          <div key={id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: AI_COLOR[id] + '22', border: `1px solid ${AI_COLOR[id]}44` }}>
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: AI_COLOR[id] }} />
                            <span className="text-[11px] font-medium" style={{ color: AI_COLOR[id] }}>{AI_NAMES[id]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {phase === 'done' && !isSynthesizing && (
                <button onClick={handleReset}
                  className="mt-6 w-full glass rounded-xl py-3 text-white/60 hover:text-white text-sm font-medium transition-all hover:bg-white/10">
                  🔄 Nuovo dibattito
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
