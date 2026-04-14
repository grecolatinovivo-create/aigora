'use client'
// v3
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
  'La coscienza è solo chimica?',
  'Chi controlla l\'IA?',
  'Siamo soli nell\'universo?',
  'L\'arte può essere artificiale?',
  'La privacy è ancora un diritto?',
  'Il capitalismo ha un futuro?',
  'Esiste la verità oggettiva?',
  'Possiamo sconfiggere la morte?',
  'L\'IA può avere emozioni?',
  'Il nucleare è la soluzione energetica?',
  'Dobbiamo regolamentare l\'IA?',
  'I social ci rendono più soli?',
  'La guerra è inevitabile?',
]

// 60 domande per le bubble fluttuanti
const ALL_BUBBLE_TOPICS = [
  'La coscienza è solo chimica?',
  'Chi controlla l\'IA?',
  'Il futuro è distopico?',
  'Siamo soli nell\'universo?',
  'L\'arte può essere artificiale?',
  'Etica e tecnologia: compatibili?',
  'La privacy è ancora un diritto?',
  'Il capitalismo ha un futuro?',
  'Esiste la verità oggettiva?',
  'La democrazia è in crisi?',
  'Dobbiamo temere i robot?',
  'L\'amore è solo chimica?',
  'Il progresso è sempre positivo?',
  'Esiste il bene e il male?',
  'La scuola prepara al futuro?',
  'I social ci rendono più soli?',
  'La morte ha un significato?',
  'Può una macchina essere creativa?',
  'Il denaro fa la felicità?',
  'Siamo davvero liberi?',
  'L\'umanità sopravviverà al 2100?',
  'Dobbiamo ridurre la popolazione?',
  'La guerra è inevitabile?',
  'Esiste una morale universale?',
  'Il lavoro dà senso alla vita?',
  'Possiamo fidarci della scienza?',
  'La religione è ancora necessaria?',
  'I confini nazionali hanno senso?',
  'Il futuro appartiene all\'Asia?',
  'Dobbiamo vivere su altri pianeti?',
  'L\'IA può avere emozioni?',
  'Chi possiede i dati ci governa?',
  'La carne sintetica salverà il pianeta?',
  'Il metaverso cambierà la realtà?',
  'Possiamo sconfiggere la morte?',
  'Il giornalismo è ancora credibile?',
  'La musica generata dall\'AI è arte?',
  'Esiste ancora la classe media?',
  'I vaccini hanno cambiato la storia?',
  'La globalizzazione è finita?',
  'Il nucleare è la soluzione energetica?',
  'Abbiamo già superato il punto di non ritorno?',
  'L\'uomo è fondamentalmente buono o cattivo?',
  'La libertà di parola ha dei limiti?',
  'Può l\'IA essere più empatica degli umani?',
  'Il sonno è tempo sprecato?',
  'Esiste un diritto universale alla salute?',
  'I videogiochi fanno bene o male?',
  'La solitudine è un problema moderno?',
  'Dobbiamo regolamentare l\'IA?',
  'Il femminismo ha raggiunto i suoi obiettivi?',
  'La crittografia protegge la libertà?',
  'Possiamo fidarci dei media?',
  'Il tempo libero aumenta o diminuisce?',
  'L\'educazione cambierà con l\'IA?',
  'La nostalgia blocca il progresso?',
  'Esiste un\'intelligenza oltre la nostra?',
  'Il corpo umano è obsoleto?',
  'La storia si ripete davvero?',
  'Dobbiamo avere paura dell\'ignoto?',
]

// Estrae 12 domande random senza ripetizioni
function getRandomBubbleTopics(): string[] {
  const shuffled = [...ALL_BUBBLE_TOPICS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 12)
}

type ChatPhase = 'start' | 'running' | 'done' | 'history' | 'profile'

function detectNextAi(text: string, aiOrder: string[]): string | null {
  const lower = text.toLowerCase()
  for (const aiId of aiOrder) {
    const name = AI_NAMES[aiId].toLowerCase()
    if (lower.includes(`passo la parola a ${name}`) || lower.includes(`${name}, cosa ne pensi`)) return aiId
  }
  return null
}

// Rileva se l'utente menziona direttamente un'AI nel suo messaggio
function detectUserMention(text: string, aiOrder: string[]): string | null {
  const lower = text.toLowerCase()
  for (const aiId of aiOrder) {
    const name = AI_NAMES[aiId].toLowerCase()
    if (lower.includes(name)) return aiId
  }
  return null
}
function getDefaultNextAi(currentAi: string, usedAis: string[], aiOrder: string[]): string {
  const others = aiOrder.filter(id => id !== currentAi)
  const unused = others.filter(id => !usedAis.includes(id))
  // Sceglie random tra quelle non ancora usate, o random tra tutte le altre
  const pool = unused.length > 0 ? unused : others
  return pool[Math.floor(Math.random() * pool.length)]
}

// ── Topic suggeriti rotanti (3 righe × 2 colonne, cambiano tutti insieme) ─────
function RotatingTopics({ onSelect }: { onSelect: (t: string) => void }) {
  const SLOTS = 6
  const [visible, setVisible] = useState<string[]>(() =>
    [...TOPIC_SUGGESTIONS].sort(() => Math.random() - 0.5).slice(0, SLOTS)
  )
  const [show, setShow] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out graduale (600ms)
      setShow(false)
      setTimeout(() => {
        // Nuovi 6 topic random diversi dagli attuali
        setVisible(prev => {
          const others = TOPIC_SUGGESTIONS.filter(t => !prev.includes(t))
          const pool = others.length >= SLOTS ? others : TOPIC_SUGGESTIONS
          return [...pool].sort(() => Math.random() - 0.5).slice(0, SLOTS)
        })
        // Fade in graduale (600ms)
        setShow(true)
      }, 600)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ marginBottom: '8px', transition: 'opacity 0.6s ease', opacity: show ? 1 : 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(3, 44px)', gap: '6px' }}>
      {visible.map((t, i) => (
        <button key={i} onClick={() => onSelect(t)}
          className="text-center px-3 rounded-2xl border border-white/10 text-white/45 hover:text-white/75 hover:border-white/25 transition-colors flex items-center justify-center"
          style={{ fontSize: 'clamp(9px, 2.5vw, 11px)', lineHeight: 1.3, overflow: 'hidden' }}>
          {t}
        </button>
      ))}
    </div>
  )
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

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ onCronologia, displayName, userEmail, userPlan, showProfileMenu, setShowProfileMenu, onSignOut }: {
  onCronologia: () => void
  displayName: string
  userEmail?: string
  userPlan?: string
  showProfileMenu: boolean
  setShowProfileMenu: (v: boolean | ((p: boolean) => boolean)) => void
  onSignOut: () => void
}) {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 h-14"
      style={{ backgroundColor: 'rgba(7,7,15,0.4)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)' }}>

      {/* Sinistra — Cronologia */}
      <button onClick={onCronologia}
        className="flex items-center gap-2 text-sm font-medium transition-all hover:text-white"
        style={{ color: 'rgba(255,255,255,0.45)' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 18 0A9 9 0 0 0 3 12z"/><path d="M12 7v5l3 3"/>
        </svg>
        Cronologia
      </button>

      {/* Centro — Logo */}
      <span className="absolute left-1/2 -translate-x-1/2 font-black text-lg tracking-tight">
        <span style={{ color: '#A78BFA' }}>A</span>
        <span className="text-white">i</span>
        <span style={{ color: '#A78BFA' }}>GORÀ</span>
      </span>

      {/* Destra — Profilo */}
      <div className="relative">
        <button onClick={() => setShowProfileMenu(p => !p)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white transition-transform hover:scale-110"
          style={{ backgroundColor: '#F59E0B', boxShadow: '0 2px 10px rgba(245,158,11,0.35)' }}>
          {(displayName !== 'Tu' ? displayName : (userEmail || '?'))[0].toUpperCase()}
        </button>
        {showProfileMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
            <div className="absolute right-0 top-11 w-56 rounded-2xl overflow-hidden shadow-2xl z-50"
              style={{ backgroundColor: 'rgba(12,12,20,0.97)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
              <div className="px-4 py-3 border-b border-white/8">
                <div className="text-white font-semibold text-sm truncate">{displayName || '—'}</div>
                <div className="text-white/40 text-[11px] truncate mt-0.5">{userEmail}</div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                  style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                  {(userPlan ?? 'free').toUpperCase()}
                </div>
              </div>
              {userPlan === 'admin' && (
                <button onClick={() => window.location.href = '/admin'}
                  className="w-full px-4 py-3 text-left text-sm text-amber-400 hover:bg-white/5 transition-colors font-medium border-b border-white/8">
                  ⚙️ Pannello Admin
                </button>
              )}
              <button onClick={onSignOut}
                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-white/5 transition-colors font-medium">
                Esci dall'account
              </button>
            </div>
          </>
        )}
      </div>
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
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date()
    return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setCurrentTime(`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`)
    }
    const interval = setInterval(tick, 10000)
    return () => clearInterval(interval)
  }, [])
  const [question, setQuestion] = useState('')
  const [userName, setUserName] = useState(propUserName ?? '')
  const [nameConfirmed, setNameConfirmed] = useState(!!(propUserName?.trim()))
  const [nameInput, setNameInput] = useState('')
  const [inputText, setInputText] = useState('')
  const [bgPreset, setBgPreset] = useState(() => {
    // Usa il tema di sistema: scuro → Notte, chiaro → Crema
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return BG_PRESETS.find(p => p.label === 'Notte') ?? BG_PRESETS[0]
    }
    return BG_PRESETS.find(p => p.label === 'Crema') ?? BG_PRESETS[0]
  })
  const [messages, setMessages] = useState<Message[]>([])
  const [activeAi, setActiveAi] = useState<string | null>(null)
  const [thinkingAi, setThinkingAi] = useState<string | null>(null)
  const [synthesis, setSynthesis] = useState<string | null>(null)
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [showSynthesis, setShowSynthesis] = useState(false)
  const [waitingForUser, setWaitingForUser] = useState(false)
  const [turnCount, setTurnCount] = useState(0)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [mobileFontSize, setMobileFontSize] = useState(14)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const listeningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopListening = useCallback(() => {
    if (listeningTimeoutRef.current) { clearTimeout(listeningTimeoutRef.current); listeningTimeoutRef.current = null }
    try { recognitionRef.current?.stop() } catch {}
    recognitionRef.current = null
    setIsListening(false)
  }, [])

  // Cleanup al dismount
  useEffect(() => { return () => { stopListening() } }, [stopListening])

  const startListening = useCallback(() => {
    // Se già in ascolto, ferma
    if (recognitionRef.current) { stopListening(); return }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) { alert('Il tuo browser non supporta il riconoscimento vocale.'); return }

    const rec = new SpeechRecognition()
    rec.lang = navigator.language || 'en-US'
    rec.continuous = false
    rec.interimResults = false
    rec.maxAlternatives = 1

    rec.onstart = () => {
      setIsListening(true)
      // Timeout di sicurezza: se dopo 10s non ha finito, forza lo stop
      listeningTimeoutRef.current = setTimeout(() => { stopListening() }, 10000)
    }

    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results as any[])
        .map((r: any) => r[0].transcript)
        .join('')
        .trim()
      if (transcript) setInputText(prev => prev ? prev + ' ' + transcript : transcript)
      stopListening()
    }

    rec.onerror = (e: any) => {
      // 'no-speech' è normale (silenzio), non mostrare errore
      if (e.error !== 'no-speech') console.warn('Speech recognition error:', e.error)
      stopListening()
    }

    rec.onend = () => { stopListening() }

    recognitionRef.current = rec
    try {
      rec.start()
    } catch {
      // Se start() fallisce (es. già in corso), resetta
      recognitionRef.current = null
      setIsListening(false)
    }
  }, [stopListening])
  const [showHistory, setShowHistory] = useState(false)
  const [bubbleTopics, setBubbleTopics] = useState(() => getRandomBubbleTopics())
  const usedBubbleTopicsRef = useRef(new Set(getRandomBubbleTopics()))

  const rotateBubble = useCallback((index: number) => {
    setBubbleTopics(prev => {
      const currentSet = new Set(prev)
      // Trova una domanda non usata attualmente
      const available = ALL_BUBBLE_TOPICS.filter(t => !currentSet.has(t))
      if (available.length === 0) {
        // Se le abbiamo usate tutte, ricomincia
        usedBubbleTopicsRef.current = new Set(prev)
        const fresh = ALL_BUBBLE_TOPICS.filter(t => !currentSet.has(t))
        if (fresh.length === 0) return prev
        const next = [...prev]
        next[index] = fresh[Math.floor(Math.random() * fresh.length)]
        return next
      }
      const newTopic = available[Math.floor(Math.random() * available.length)]
      const next = [...prev]
      next[index] = newTopic
      usedBubbleTopicsRef.current.add(newTopic)
      return next
    })
  }, [])
  const [savedChats, setSavedChats] = useState<{id:string; title:string; date:string; messages: Message[]; history: {name:string;content:string}[]}[]>([])

  // Carica cronologia dal server
  useEffect(() => {
    fetch('/api/chats')
      .then(r => r.json())
      .then(data => {
        if (data.chats) {
          setSavedChats(data.chats.map((c: any) => ({
            id: c.id,
            title: c.title,
            date: new Date(c.updatedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
            messages: c.messages,
            history: c.history,
          })))
        }
      })
      .catch(() => {})
  }, [])

  const currentChatIdRef = useRef(`chat-${Date.now()}`)
  const chatTitleRef = useRef<string>('')

  const saveCurrentChat = useCallback(async () => {
    if (messagesRef.current.length < 2) return

    // Genera titolo contestuale la prima volta (quando abbiamo almeno 1 msg AI)
    const msgs = messagesRef.current
    const userMsg = msgs.find(m => m.isUser)?.content ?? ''
    const aiMsg = msgs.find(m => !m.isUser)?.content ?? ''

    if (!chatTitleRef.current && aiMsg) {
      try {
        const res = await fetch('/api/chats/title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: userMsg, firstReply: aiMsg }),
        })
        const data = await res.json()
        if (data.title) chatTitleRef.current = data.title
      } catch {}
    }

    const title = chatTitleRef.current || userMsg.slice(0, 60) || 'Chat'
    const chat = {
      id: currentChatIdRef.current,
      title,
      date: new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      messages: msgs,
      history: chatHistoryRef.current,
    }
    setSavedChats(prev => {
      const filtered = prev.filter(c => c.id !== currentChatIdRef.current)
      return [chat, ...filtered].slice(0, 50)
    })
    fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: chat.id, title: chat.title, messages: chat.messages, history: chat.history }),
    }).catch(() => {})
  }, [])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<Message[]>([])
  const chatHistoryRef = useRef<{ name: string; content: string }[]>([])
  const usedAisRef = useRef<string[]>([])
  const stopRequestedRef = useRef(false)
  const waitingForUserRef = useRef(false)   // ref speculare a waitingForUser
  const aiTurnCountRef = useRef(0)

  // Aggiorna tema se l'utente cambia dark/light mode mentre è nell'app
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      setBgPreset(e.matches
        ? (BG_PRESETS.find(p => p.label === 'Notte') ?? BG_PRESETS[3])
        : (BG_PRESETS.find(p => p.label === 'Crema') ?? BG_PRESETS[0])
      )
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

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

  const wasDebatingRef = useRef(false) // stava girando il debate quando si è andati in cronologia

  // Stop loop quando si va in cronologia/profilo, riprende quando si torna in running
  useEffect(() => {
    if (phase === 'history' || phase === 'profile') {
      // Salva se stava girando (non in pausa per input utente)
      wasDebatingRef.current = !waitingForUserRef.current && !stopRequestedRef.current
      stopRequestedRef.current = true
      setActiveAi(null)
      setThinkingAi(null)
    } else if (phase === 'running') {
      stopRequestedRef.current = false
      // Se stava girando prima di andare in cronologia, riprende
      if (wasDebatingRef.current) {
        wasDebatingRef.current = false
        const lastAi = usedAisRef.current[usedAisRef.current.length - 1] || AI_ORDER[0]
        const nextAi = getDefaultNextAi(lastAi, [], AI_ORDER)
        setTimeout(() => runDebate(nextAi, debateModeRef.current), 300)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

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
    const controller = new AbortController()
    // Timeout di sicurezza: se dopo 25s non arriva [DONE], abbandona
    const timeout = setTimeout(() => controller.abort(), 25000)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: chatHistoryRef.current, aiId, action: isSynthesis ? 'synthesize' : 'turn', needsWebSearch: needsWebSearchRef.current }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let done = false

      while (!done) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        // Tieni l'ultima riga incompleta nel buffer
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim()
          if (d === '[DONE]') { done = true; break }
          try { fullText += JSON.parse(d).text } catch {}
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('streamAiResponse error:', err)
      // Se abbiamo già del testo parziale, usalo — altrimenti messaggio di errore
      if (!fullText) fullText = '(Risposta interrotta)'
    } finally {
      clearTimeout(timeout)
    }

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
    const fcController = new AbortController()
    const fcTimeout = setTimeout(() => fcController.abort(), 15000)
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
        signal: fcController.signal,
      })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = '', done = false
      while (!done) {
        const { done: sd, value } = await reader.read()
        if (sd) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim()
          if (d === '[DONE]') { done = true; break }
          try { fullText += JSON.parse(d).text } catch {}
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('factcheck error', err)
      return
    } finally {
      clearTimeout(fcTimeout)
    }

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

  const debateModeRef = useRef<'debate' | 'focused'>('debate')
  const needsWebSearchRef = useRef(false)

  const runDebate = useCallback(async (startAi: string, mode: 'debate' | 'focused' = 'debate') => {
    let currentAi = startAi
    stopRequestedRef.current = false
    debateModeRef.current = mode

    while (!stopRequestedRef.current) {
      const text = await streamAiResponse(currentAi)
      if (!text || stopRequestedRef.current) break

      chatHistoryRef.current.push({ name: AI_NAMES[currentAi], content: text })
      usedAisRef.current.push(currentAi)
      aiTurnCountRef.current += 1
      setTurnCount(aiTurnCountRef.current)

      // Fact-check ogni 2 turni
      if (aiTurnCountRef.current % 2 === 0 && !stopRequestedRef.current) {
        await runFactCheck(currentAi)
      }

      if (debateModeRef.current === 'focused') {
        // Modalità focused: dopo ogni risposta dell'AI principale, aspetta l'utente.
        // Ogni 3 turni lascia intervenire un'altra AI spontaneamente.
        if (aiTurnCountRef.current % 3 === 0 && !stopRequestedRef.current) {
          // Un'altra AI interviene brevemente
          const others = AI_ORDER.filter(id => id !== currentAi)
          const intruder = others[Math.floor(Math.random() * others.length)]
          await new Promise(r => setTimeout(r, 400))
          const intruderText = await streamAiResponse(intruder)
          if (intruderText && !stopRequestedRef.current) {
            chatHistoryRef.current.push({ name: AI_NAMES[intruder], content: intruderText })
          }
        }
        // Aspetta sempre l'utente dopo ogni turno
        waitingForUserRef.current = true
        setWaitingForUser(true)
        stopRequestedRef.current = true
        return
      } else {
        // Modalità debate: round-robin automatico, pausa ogni 4 turni
        const nextAi = getDefaultNextAi(currentAi, usedAisRef.current, AI_ORDER)

        if (aiTurnCountRef.current % 4 === 0) {
          waitingForUserRef.current = true
          setWaitingForUser(true)
          stopRequestedRef.current = true
          return
        }
        await new Promise(r => setTimeout(r, 320))
        currentAi = nextAi
      }
    }
  }, [streamAiResponse, runFactCheck, AI_ORDER])

  const handleStart = async (overrideQuestion?: string) => {
    const q = (overrideQuestion ?? question).trim()
    if (!q) return
    if (overrideQuestion) setQuestion(overrideQuestion)
    currentChatIdRef.current = `chat-${Date.now()}`
    chatTitleRef.current = ''
    chatHistoryRef.current = [{ name: historyName, content: q }]
    usedAisRef.current = []
    aiTurnCountRef.current = 0
    stopRequestedRef.current = false
    setMessages([{ id: 'user-0', aiId: 'user', name: displayName, content: q, isUser: true }])
    setTurnCount(0)
    setPhase('running')

    // AI iniziale: completamente random tra quelle disponibili
    const startAi = AI_ORDER[Math.floor(Math.random() * AI_ORDER.length)]

    // Routing intelligente solo per modalità e web search (in background)
    let mode: 'debate' | 'focused' = 'debate'
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'route', question: q, availableAis: AI_ORDER, history: [] }),
      })
      const data = await res.json()
      if (data.mode === 'focused') mode = 'focused'
      needsWebSearchRef.current = !!data.needsWebSearch
    } catch {}

    runDebate(startAi, mode)
  }

  const handleSendMessage = () => {
    if (!inputText.trim()) return
    const text = inputText.trim()
    setInputText('')
    const userMsg: Message = { id: `user-${Date.now()}`, aiId: 'user', name: displayName, content: text, isUser: true }
    chatHistoryRef.current.push({ name: historyName, content: text })
    setMessages(prev => [...prev, userMsg])

    if (waitingForUserRef.current || stopRequestedRef.current) {
      waitingForUserRef.current = false
      setWaitingForUser(false)
      aiTurnCountRef.current = 0
      stopRequestedRef.current = false

      // Se l'utente menziona un'AI, quella risponde in modalità focused (1-a-1)
      const mentioned = detectUserMention(text, AI_ORDER)
      if (mentioned) {
        setTimeout(() => runDebate(mentioned, 'focused'), 150)
        return
      }

      // Altrimenti riprende la modalità corrente
      const lastAi = usedAisRef.current[usedAisRef.current.length - 1] || 'claude'
      const nextAi = getDefaultNextAi(lastAi, [], AI_ORDER)
      setTimeout(() => runDebate(nextAi, debateModeRef.current), 150)
    }
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
  const navbarProps = {
    onCronologia: () => setShowHistory(true),
    displayName,
    userEmail,
    userPlan,
    showProfileMenu,
    setShowProfileMenu,
    onSignOut: () => signOut({ callbackUrl: '/login' }),
  }

  if (!nameConfirmed) {
    return (
      <div className="desktop-bg min-h-screen flex flex-col items-center justify-center px-4">

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
                const n = nameInput.trim()
                setUserName(n)
                setNameConfirmed(true)
                fetch('/api/user/name', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: n }) }).catch(() => {})
              }
            }}
            className="w-full px-4 py-3 rounded-xl bg-white/5 text-white placeholder-white/25 border border-white/10 focus:outline-none focus:border-purple-400/50 focus:ring-2 focus:ring-purple-500/10 text-sm mb-4 transition-all duration-200"
          />
          <button
            onClick={() => {
              if (nameInput.trim()) {
                const n = nameInput.trim()
                setUserName(n)
                setNameConfirmed(true)
                fetch('/api/user/name', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: n }) }).catch(() => {})
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
    return (
      <div className="desktop-bg relative overflow-hidden"
        style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Navbar desktop ── */}
        <div className="hidden lg:block flex-shrink-0">
          <Navbar {...navbarProps} />
        </div>

        {/* ── Bubble fluttuanti (solo desktop xl+) — 12 bolle ── */}
        {[
          { top: '180px', left: 'calc(50% - 560px)', delay: '0s',   dur: '14s', anim: 'float-1' },
          { top: '320px', left: 'calc(50% - 550px)', delay: '3s',   dur: '13s', anim: 'float-3' },
          { top: '460px', left: 'calc(50% - 560px)', delay: '1.5s', dur: '15s', anim: 'float-2' },
          { top: '600px', left: 'calc(50% - 545px)', delay: '4s',   dur: '12s', anim: 'float-4' },
          { top: '720px', left: 'calc(50% - 555px)', delay: '2s',   dur: '14s', anim: 'float-1' },
          { top: '840px', left: 'calc(50% - 545px)', delay: '5s',   dur: '13s', anim: 'float-3' },
          { top: '180px', right: 'calc(50% - 560px)', delay: '1s',   dur: '13s', anim: 'float-2' },
          { top: '320px', right: 'calc(50% - 550px)', delay: '4.5s', dur: '15s', anim: 'float-4' },
          { top: '460px', right: 'calc(50% - 560px)', delay: '2s',   dur: '12s', anim: 'float-1' },
          { top: '600px', right: 'calc(50% - 545px)', delay: '0.5s', dur: '14s', anim: 'float-3' },
          { top: '720px', right: 'calc(50% - 555px)', delay: '3.5s', dur: '13s', anim: 'float-2' },
          { top: '840px', right: 'calc(50% - 545px)', delay: '1.5s', dur: '15s', anim: 'float-4' },
        ].map(({ top, left, right, delay, dur, anim }: any, i) => (
          <button key={i}
            className="absolute hidden lg:block px-4 py-2 rounded-full text-[11px] select-none cursor-pointer transition-all hover:scale-105 hover:brightness-125"
            onAnimationIteration={() => rotateBubble(i)}
            onClick={() => handleStart(bubbleTopics[i])}
            style={{
              top, left, right,
              color: 'rgba(255,255,255,0.5)',
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(6px)',
              maxWidth: '160px',
              textAlign: 'center',
              lineHeight: 1.4,
              animation: `${anim} ${dur} ease-in-out infinite`,
              animationDelay: delay,
            }}>
            {bubbleTopics[i]}
          </button>
        ))}

        {/* ── Contenuto principale — occupa tutto lo spazio rimanente ── */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 scale-in"
          style={{
            paddingLeft: '20px',
            paddingRight: '20px',
            paddingTop: 'max(env(safe-area-inset-top), 16px)',
            paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
            gap: '0',
            overflow: 'hidden',
          }}>

          <div className="w-full max-w-lg flex flex-col" style={{ gap: '14px' }}>

            {/* ── HERO ── */}
            <div className="text-center">
              {/* Badge — nascosto su mobile piccolo per risparmiare spazio */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-[11px] font-medium text-purple-300 border border-purple-500/30"
                style={{ backgroundColor: 'rgba(124,58,237,0.12)' }}>
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
                4 intelligenze artificiali · dibattito in tempo reale
              </div>
              {/* Logo */}
              <h1 className="font-black tracking-tight leading-none"
                style={{ fontSize: 'clamp(2.8rem, 14vw, 4rem)', marginBottom: '8px' }}>
                <span style={{ color: '#A78BFA' }}>A</span>
                <span className="text-white">i</span>
                <span style={{ color: '#A78BFA' }}>GORÀ</span>
              </h1>
              {/* Sottotitolo */}
              <p className="text-white/50 leading-relaxed mx-auto"
                style={{ fontSize: 'clamp(0.75rem, 3.5vw, 0.875rem)', maxWidth: '340px' }}>
                Poni una domanda e assisti al dibattito in tempo reale tra le quattro principali intelligenze artificiali
              </p>
            </div>

            {/* ── AI cards ── */}
            <div className="grid grid-cols-4 gap-2">
              {AI_ORDER.map(id => (
                <div key={id} className="glass rounded-2xl flex flex-col items-center text-center"
                  style={{ padding: '10px 4px', gap: '6px' }}>
                  <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{
                      width: 'clamp(32px, 9vw, 44px)',
                      height: 'clamp(32px, 9vw, 44px)',
                      fontSize: 'clamp(9px, 2.5vw, 13px)',
                      backgroundColor: AI_COLOR[id],
                      boxShadow: `0 4px 16px ${AI_COLOR[id]}60`,
                    }}>
                    {id === 'gemini' ? 'Ge' : AI_NAMES[id][0]}
                  </div>
                  <div>
                    <div className="text-white font-semibold leading-tight"
                      style={{ fontSize: 'clamp(9px, 2.8vw, 12px)' }}>
                      {AI_NAMES[id]}
                    </div>
                    <div className="text-white/35 leading-tight mt-0.5"
                      style={{ fontSize: 'clamp(7px, 2vw, 9px)' }}>
                      {AI_DESC[id]}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Form domanda ── */}
            <div className="glass rounded-3xl" style={{ padding: '12px' }}>
              <textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleStart() } }}
                placeholder="Poni una domanda alle AI…"
                rows={3}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-purple-500/50 placeholder:text-white/20 resize-none leading-relaxed transition-colors"
                style={{ fontSize: 'clamp(13px, 3.5vw, 15px)', marginBottom: '8px' }}
              />

              {/* Topic suggeriti — solo mobile */}
              <div className="lg:hidden">
                <RotatingTopics onSelect={setQuestion} />
              </div>

              {/* CTA */}
              <button
                onClick={() => handleStart()}
                disabled={!question.trim()}
                className="w-full rounded-xl font-semibold text-white transition-all disabled:opacity-25 disabled:cursor-not-allowed active:scale-[0.98]"
                style={{
                  padding: '13px',
                  fontSize: 'clamp(13px, 3.5vw, 15px)',
                  background: question.trim() ? 'linear-gradient(135deg, #7C3AED, #5B21B6)' : '#333',
                  boxShadow: question.trim() ? '0 4px 24px rgba(124,58,237,0.45)' : undefined,
                }}
              >
                Avvia il dibattito →
              </button>
            </div>

          </div>
        </div>
      </div>
    )
  }

  // ── SCHERMATA CHAT ────────────────────────────────────────────────────────────
  return (
    <div className="desktop-bg min-h-screen flex items-center justify-center pt-14 p-6 gap-6 chat-layout relative">

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
            }} className="text-red-400/60 hover:text-red-400 text-xs transition-colors">
              Cancella cronologia
            </button>
          </div>
        </div>
      </div>

      {/* Overlay chiusura pannello */}
      {showHistory && <div className="fixed inset-0 z-[39]" onClick={() => setShowHistory(false)} />}

      <Navbar {...navbarProps} />

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
            <span className="text-[11px] font-semibold tabular-nums" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>{currentTime}</span>
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
          <div className="flex-shrink-0 flex items-center gap-2.5 px-3 py-2" style={{ backgroundColor: bgPreset.header, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
            {/* Avatar sovrapposti */}
            <div className="flex -space-x-2 flex-shrink-0">
              {AI_ORDER.map(id => (
                <div key={id} className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold ring-1"
                  style={{ backgroundColor: AI_COLOR[id], ['--tw-ring-color' as string]: bgPreset.header }}>
                  {AI_NAMES[id][0]}
                </div>
              ))}
            </div>

            <div className="flex-1 min-w-0">
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

            {/* Sintesi */}
            <button onClick={handleSynthesize} title="Sintetizza"
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all hover:scale-105"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }}>
              📋
            </button>
          </div>

          {/* Avatar bar */}
          <PhoneAvatarBar activeAi={activeAi} bgColor={bgPreset.header} isDark={isDark} aiOrder={AI_ORDER} />

          {/* Messaggi */}
          <div className="flex-1 overflow-y-auto py-3" style={{ backgroundColor: bgPreset.value }}>
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} bgTheme={isDark ? 'white' : 'black'} />)}
            {thinkingAi && <ThinkingBubble aiId={thinkingAi} isDark={isDark} />}
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
              placeholder='Scrivi un messaggio…'
              className={`flex-1 rounded-full px-3.5 py-2 text-[12px] outline-none transition-all${waitingForUser ? ' input-waiting' : ''}`}
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                color: isDark ? '#f0f0f0' : '#111',
                boxShadow: waitingForUser ? (isDark ? '0 0 0 2px rgba(196,181,253,0.15)' : '0 0 0 2px rgba(109,40,217,0.1)') : undefined,
              }}
            />
            <button onClick={isListening ? stopListening : startListening}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{ backgroundColor: isListening ? '#ef4444' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'), boxShadow: isListening ? '0 0 10px rgba(239,68,68,0.5)' : undefined }}>
              <svg width="12" height="14" viewBox="0 0 24 28" fill={isListening ? 'white' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)')}>
                <rect x="8" y="0" width="8" height="16" rx="4"/>
                <path d="M4 12a8 8 0 0 0 16 0" stroke={isListening ? 'white' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)')} strokeWidth="2" fill="none"/>
                <line x1="12" y1="20" x2="12" y2="24" stroke={isListening ? 'white' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)')} strokeWidth="2"/>
                <line x1="8" y1="24" x2="16" y2="24" stroke={isListening ? 'white' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)')} strokeWidth="2"/>
              </svg>
            </button>
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

      {/* ── SCHERMO NATIVO MOBILE ── */}
      <div className="phone-screen-mobile hidden flex-col" style={{ backgroundColor: bgPreset.value, height: '100dvh', overflow: 'hidden' }}
        ref={el => { if (el) document.body.style.backgroundColor = bgPreset.value }}>

        {/* Schermata cronologia mobile */}
        {phase === 'history' && (
          <div className="flex flex-col h-full" style={{ backgroundColor: bgPreset.value }}>
            {/* Header cronologia */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 pb-4 border-b"
              style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', backgroundColor: bgPreset.header, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
              <button onClick={() => setPhase(messages.length > 0 ? 'running' : 'start')}
                className="w-9 h-9 flex items-center justify-center rounded-full"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? 'white' : '#111'} strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span className="font-bold text-lg flex-1" style={{ color: isDark ? '#fff' : '#111' }}>Conversazioni</span>
              <button onClick={() => { handleReset(); setPhase('start') }}
                className="text-[13px] font-semibold" style={{ color: '#A78BFA' }}>
                + Nuova
              </button>
            </div>
            {/* Lista chat */}
            <div className="flex-1 overflow-y-auto">
              {savedChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="text-white/20 text-4xl">💬</div>
                  <p className="text-white/30 text-sm text-center px-8">Nessuna conversazione salvata.<br/>Le chat vengono salvate automaticamente.</p>
                </div>
              ) : savedChats.map((chat) => (
                <button key={chat.id} onClick={() => {
                  setMessages(chat.messages)
                  chatHistoryRef.current = chat.history
                  setPhase('running')
                }}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-colors"
                  style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                    style={{ backgroundColor: '#7C3AED' }}>
                    {(chat.title[0] || '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-[14px] font-medium truncate" style={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>{chat.title}</div>
                    <div className="text-[12px] mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)' }}>{chat.date}</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Schermata profilo mobile */}
        {phase === 'profile' && (
          <div className="flex flex-col h-full" style={{ backgroundColor: bgPreset.value }}>
            {/* Header */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 pb-4 border-b"
              style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', backgroundColor: bgPreset.header, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
              <button onClick={() => setPhase('running')}
                className="w-9 h-9 flex items-center justify-center rounded-full"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? 'white' : '#111'} strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span className="font-bold text-lg" style={{ color: isDark ? '#fff' : '#111' }}>Profilo</span>
            </div>

            {/* Corpo profilo */}
            <div className="flex-1 overflow-y-auto">
              {/* Avatar grande */}
              <div className="flex flex-col items-center pt-10 pb-8 px-6" style={{ backgroundColor: bgPreset.header }}>
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-black text-white mb-4"
                  style={{ backgroundColor: '#F59E0B', boxShadow: '0 4px 20px rgba(245,158,11,0.4)' }}>
                  {(userName.trim() || userEmail || '?')[0].toUpperCase()}
                </div>
                <div className="text-xl font-bold mb-1" style={{ color: isDark ? '#fff' : '#111' }}>
                  {displayName || 'Utente'}
                </div>
                <div className="text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                  {userEmail}
                </div>
              </div>

              {/* Info */}
              <div className="mt-3 mx-4 rounded-2xl overflow-hidden" style={{ backgroundColor: bgPreset.header, border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                <div className="px-4 py-3.5 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>Piano</div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="font-semibold text-sm" style={{ color: '#F59E0B' }}>{(userPlan ?? 'free').toUpperCase()}</span>
                  </div>
                </div>
                <div className="px-4 py-3.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>Email</div>
                  <div className="text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }}>{userEmail}</div>
                </div>
              </div>

              {/* Esci */}
              <div className="mt-3 mx-4 rounded-2xl overflow-hidden" style={{ backgroundColor: bgPreset.header, border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                <button onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full px-4 py-4 text-left text-sm font-semibold text-red-500">
                  Esci dall'account
                </button>
              </div>

              <div className="h-8" />
            </div>
          </div>
        )}

        {/* Schermata chat mobile */}
        {phase !== 'history' && phase !== 'profile' && <>

          {/* Header mobile */}
          <div className="flex-shrink-0 flex items-center gap-2 px-3 pb-3 border-b"
            style={{ backgroundColor: bgPreset.header, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            {/* < Cronologia */}
            <button onClick={() => setPhase('history')}
              className="w-9 h-9 flex items-center justify-center flex-shrink-0 rounded-full active:scale-95"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'} strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>

            {/* Titolo centrale */}
            <div className="flex-1 min-w-0 text-center">
              <div className="font-bold text-[14px]" style={{ color: isDark ? '#fff' : '#111' }}>AiGORÀ</div>
              <div className="text-[11px]" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                {activeAi ? `${AI_NAMES[activeAi]} sta scrivendo…` : `Turno ${turnCount + 1}`}
              </div>
            </div>

            {/* Font size + Sintesi + Profilo */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Font - + */}
              <div className="flex items-center rounded-full overflow-hidden" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }}>
                <button onClick={() => setMobileFontSize(s => Math.max(12, s - 1))}
                  className="w-8 h-8 flex items-center justify-center text-base font-bold active:scale-95"
                  style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>−</button>
                <button onClick={() => setMobileFontSize(s => Math.min(20, s + 1))}
                  className="w-8 h-8 flex items-center justify-center text-base font-bold active:scale-95"
                  style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>+</button>
              </div>
              <button onClick={handleSynthesize}
                className="w-9 h-9 flex items-center justify-center rounded-full active:scale-95 text-base"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }}>
                📋
              </button>
              <button onClick={() => setPhase('profile')}
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ backgroundColor: '#F59E0B' }}>
                {(userName.trim() || userEmail || '?')[0].toUpperCase()}
              </button>
            </div>
          </div>

          {/* Avatar bar mobile */}
          <PhoneAvatarBar activeAi={activeAi} bgColor={bgPreset.header} isDark={isDark} aiOrder={AI_ORDER} />

          {/* Messaggi mobile */}
          <div className="flex-1 overflow-y-auto py-3" style={{ backgroundColor: bgPreset.value }}>
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} bgTheme={isDark ? 'white' : 'black'} fontSize={mobileFontSize} />)}
            {thinkingAi && <ThinkingBubble aiId={thinkingAi} isDark={isDark} />}
            <div ref={messagesEndRef} />
          </div>

          {/* Pannello sintesi mobile — slide da destra */}
          {showSynthesis && (
            <div className="absolute inset-0 z-50 flex flex-col" style={{ backgroundColor: bgPreset.value }}>
              <div className="flex-shrink-0 flex items-center gap-3 px-4 pb-4 border-b"
                style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', backgroundColor: bgPreset.header, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                <button onClick={() => setShowSynthesis(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-full"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? 'white' : '#111'} strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <div>
                  <div className="font-bold text-base" style={{ color: isDark ? '#fff' : '#111' }}>Sintesi</div>
                  <div className="text-[11px]" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>{messages.filter(m => !m.isUser).length} messaggi analizzati</div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {isSynthesizing && !synthesis && (
                  <div className="flex gap-2 items-center mt-8">
                    {[0,150,300].map(d => <span key={d} className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                  </div>
                )}
                {synthesis && <p className="text-white/80 text-[14px] leading-[1.8] whitespace-pre-wrap">{synthesis}</p>}
              </div>
              {phase === 'done' && !isSynthesizing && (
                <div className="p-4 border-t border-white/8">
                  <button onClick={handleReset}
                    className="w-full py-3 rounded-xl text-white/60 text-sm font-medium"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    🔄 Nuovo dibattito
                  </button>
                </div>
              )}
            </div>
          )}

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
              placeholder='Scrivi un messaggio…'
              className={`flex-1 rounded-full px-4 py-2.5 text-[14px] outline-none transition-all${waitingForUser ? ' input-waiting' : ''}`}
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                color: isDark ? '#f0f0f0' : '#111',
              }}
            />
            <button onClick={isListening ? stopListening : startListening}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
              style={{ backgroundColor: isListening ? '#ef4444' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'), boxShadow: isListening ? '0 0 12px rgba(239,68,68,0.5)' : undefined }}>
              <svg width="14" height="16" viewBox="0 0 24 28" fill={isListening ? 'white' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)')}>
                <rect x="8" y="0" width="8" height="16" rx="4"/>
                <path d="M4 12a8 8 0 0 0 16 0" stroke={isListening ? 'white' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)')} strokeWidth="2" fill="none"/>
                <line x1="12" y1="20" x2="12" y2="24" stroke={isListening ? 'white' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)')} strokeWidth="2"/>
                <line x1="8" y1="24" x2="16" y2="24" stroke={isListening ? 'white' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)')} strokeWidth="2"/>
              </svg>
            </button>
            <button onClick={handleSendMessage} disabled={!inputText.trim()}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-30 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #10A37F, #0d8c6d)', boxShadow: inputText.trim() ? '0 2px 10px rgba(16,163,127,0.4)' : undefined }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
            </button>
          </div>
        </>}
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
