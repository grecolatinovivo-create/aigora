'use client'
// v3
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import MessageBubble, { Message } from './MessageBubble'
import { signOut } from 'next-auth/react'
import { useAbly, type RoomEvent } from '@/lib/useAbly'
import {
  AI_ORDER_DEFAULT, AI_NAMES, AI_COLOR, AI_DESC, AI_PROFILES,
  AI_OPTIONS, TYPEWRITER_DELAY, BG_PRESETS,
  ALL_BUBBLE_TOPICS,
  getRandomBubbleTopics,
} from '@/app/lib/aiProfiles'
import { SFX } from '@/app/lib/audioEngine'
import ThinkingBubble from '@/app/components/chat/ThinkingBubble'
import AttachmentButton, { type ChatAttachment } from '@/app/components/chat/AttachmentButton'
import LimitWall, { type LimitInfo } from '@/app/components/ui/LimitWall'
import UserTurnPrompt from '@/app/components/chat/UserTurnPrompt'
import RotatingTopics from '@/app/components/shared/RotatingTopics'
import PhoneAvatarBar from '@/app/components/layout/PhoneAvatarBar'
import SwipeableChatRow from '@/app/components/profile/SwipeableChatRow'
import RouletteScreen from '@/app/components/modes/RouletteScreen'
import Navbar from '@/app/components/layout/Navbar'
import ModeSelect from '@/app/components/modes/ModeSelect'
import TwoVsTwoSetup from '@/app/components/2v2/TwoVsTwoSetup'
import TwoVsTwoScreen from '@/app/components/2v2/TwoVsTwoScreen'
import DevilsAdvocateScreen from '@/app/components/devil/DevilsAdvocateScreen'
import DevilDifficultyScreen from '@/app/components/devil/DevilDifficultyScreen'
import DevilIntroScreen from '@/app/components/devil/DevilIntroScreen'
import ProfileScreen from '@/app/components/profile/ProfileScreen'
import type {
  ChatPhase, GameMode, DevilSession, DevilDifficulty,
  TwoVsTwoConfig, TwoVsTwoState, AigoraChatProps,
} from '@/app/types/aigora'


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

// ── Componente principale ─────────────────────────────────────────────────────
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
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachment | null>(null)
  const [limitInfo, setLimitInfo] = useState<LimitInfo | null>(null)
  // Ref che tiene l'allegato corrente per il round in corso (si azzera dopo il round)
  const currentRoundAttachmentRef = useRef<ChatAttachment | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const inputRefDesktop = useRef<HTMLTextAreaElement>(null)
  // Auto-resize textarea
  useEffect(() => {
    for (const ref of [inputRef, inputRefDesktop]) {
      if (ref.current) {
        ref.current.style.height = 'auto'
        ref.current.style.height = Math.min(ref.current.scrollHeight, 120) + 'px'
      }
    }
  }, [inputText])
  const [bgPreset, setBgPreset] = useState(() => {
    // Mobile: sempre scuro. Desktop: segue il tema di sistema.
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return BG_PRESETS.find(p => p.label === 'Notte') ?? BG_PRESETS[3]
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return BG_PRESETS.find(p => p.label === 'Notte') ?? BG_PRESETS[3]
    }
    return BG_PRESETS.find(p => p.label === 'Crema') ?? BG_PRESETS[0]
  })
  const [messages, setMessages] = useState<Message[]>([])
  const [activeAi, setActiveAi] = useState<string | null>(null)
  const [thinkingAi, setThinkingAi] = useState<string | null>(null)
  const [synthesis, setSynthesis] = useState<string | null>(null)
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [showSynthesis, setShowSynthesis] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [portfolioSaved, setPortfolioSaved] = useState(false)
  const [userImage, setUserImage] = useState<string | null>(null)
  const [resolvedPlan, setResolvedPlan] = useState<string | null>(null)
  const [dbUserName, setDbUserName] = useState<string | null>(null)
  const [dbUserId, setDbUserId] = useState<string | null>(null)
  const [isBeta, setIsBeta] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showModeSelect, setShowModeSelect] = useState(false)
  const [show2v2Label, setShow2v2Label] = useState<'title' | 'topic' | null>(null)
  const [show2v2Setup, setShow2v2Setup] = useState(false)
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null)
  const [twoVsTwoState, setTwoVsTwoState] = useState<TwoVsTwoState | null>(null)
  const [twoVsTwoLoading, setTwoVsTwoLoading] = useState(false)
  const [twoVsTwoRoomAblyId, setTwoVsTwoRoomAblyId] = useState<string | null>(null)
  const [pendingReconnect, setPendingReconnect] = useState<{ roomId: string; state: TwoVsTwoState } | null>(null)
  const [desktopRoundBanner, setDesktopRoundBanner] = useState<number | null>(null)
  const prevDesktopRound = useRef<number>(0)
  const twoVsTwoAudioRef = useRef<HTMLAudioElement | null>(null)
  const [devilSession, setDevilSession] = useState<DevilSession | null>(null)
  const [devilLoading, setDevilLoading] = useState(false)
  const [showDevilDifficulty, setShowDevilDifficulty] = useState(false)
  const devilVerdictRunningRef = useRef(false)
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [devilIntroData, setDevilIntroData] = useState<{ positions: [string, string]; difficulty: DevilDifficulty } | null>(null)
  const [selectedAiProfile, setSelectedAiProfile] = useState<string | null>(null)
  const [closingAiProfile, setClosingAiProfile] = useState(false)

  const closeAiProfile = () => {
    setClosingAiProfile(true)
    setTimeout(() => {
      setSelectedAiProfile(null)
      setClosingAiProfile(false)
    }, 280)
  }
  const [waitingForUser, setWaitingForUser] = useState(false)
  const [turnCount, setTurnCount] = useState(0)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [mobileFontSize, setMobileFontSize] = useState(14)
  const [isListening, setIsListening] = useState(false)
  const [phoneScale, setPhoneScale] = useState(1)

  // Scala dinamica del telefono: non sborda mai dallo schermo
  useEffect(() => {
    const PHONE_H = 790
    const PHONE_W = 390
    const NAVBAR_H = 56
    const MARGIN_V = 40  // margine sopra+sotto
    const MARGIN_H = 32  // margine sinistra+destra
    const calcScale = () => {
      const availH = window.innerHeight - NAVBAR_H - MARGIN_V
      const availW = window.innerWidth - MARGIN_H
      setPhoneScale(Math.min(1, availH / PHONE_H, availW / PHONE_W))
    }
    calcScale()
    window.addEventListener('resize', calcScale)
    return () => window.removeEventListener('resize', calcScale)
  }, [])
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
  const [socialTab, setSocialTab] = useState<'feed' | 'crea'>('feed')
  const [showSocialPanel, setShowSocialPanel] = useState(false)
  const [rooms, setRooms] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [createTopic, setCreateTopic] = useState('')
  const [createVisibility, setCreateVisibility] = useState<'public' | 'private'>('public')
  const [createAis, setCreateAis] = useState(['claude', 'gemini', 'perplexity', 'gpt'])
  const [createInvited, setCreateInvited] = useState<{id:string; name:string}[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState<any[]>([])
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [activeRoom, setActiveRoom] = useState<any>(null)
  const [myRoomRole, setMyRoomRole] = useState<'host' | 'participant' | 'spectator'>('spectator')
  const [showInvitePanel, setShowInvitePanel] = useState(false)
  const [inviteSearch, setInviteSearch] = useState('')
  const [inviteResults, setInviteResults] = useState<any[]>([])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [undoChat, setUndoChat] = useState<{ id: string; title: string } | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Real-time Ably ────────────────────────────────────────────────────────
  const handleRoomEvent = useCallback((event: RoomEvent) => {
    if (event.type === 'user_message') {
      // Messaggio di un altro utente nella room
      const msg: Message = {
        id: event.messageId,
        aiId: 'user',
        name: event.userName,
        content: event.content,
        isUser: true,
      }
      setMessages(prev => {
        // Evita duplicati
        if (prev.find(m => m.id === event.messageId)) return prev
        return [...prev, msg]
      })
    } else if (event.type === 'ai_chunk') {
      // Chunk streaming di una AI dalla room
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
  }, [])

  const { publish } = useAbly({
    roomId: activeRoom?.id ?? null,
    userId: userEmail ?? '',
    userName: userName.trim() || propUserName || userEmail?.split('@')[0] || '',
    onEvent: handleRoomEvent,
    enabled: !!activeRoom,
  })

  // ── 2v2 real multiplayer: Ably sync ───────────────────────────────────────
  const twoVsTwoStateRef = useRef<TwoVsTwoState | null>(null)
  twoVsTwoStateRef.current = twoVsTwoState

  // Ref per chiamare processB2v2Action (definita più avanti) dall'event handler
  const processB2v2ActionRef = useRef<((content: string, bName: string) => void) | null>(null)

  const handle2v2RoomEvent = useCallback((event: RoomEvent) => {
    if (event.type === 'presence' && event.action === 'enter') {
      // Player B è entrato nella stanza — rimuovi il flag waitingForOpponent
      setTwoVsTwoState(prev => prev ? { ...prev, waitingForOpponent: false } : prev)
    } else if (event.type === '2v2_action_b') {
      // Player B ha mandato la sua mossa umana
      processB2v2ActionRef.current?.(event.content, event.userName)
    }
  }, [])

  const { publish: publish2v2 } = useAbly({
    roomId: twoVsTwoRoomAblyId,
    userId: userEmail ?? '',
    userName: userName.trim() || propUserName || userEmail?.split('@')[0] || '',
    onEvent: handle2v2RoomEvent,
    enabled: !!twoVsTwoRoomAblyId,
  })

  // Tiene il publish aggiornato senza dipendenze nell'effect sottostante
  const publish2v2Ref = useRef(publish2v2)
  publish2v2Ref.current = publish2v2

  // Pubblica lo stato completo a tutti i player connessi dopo ogni aggiornamento
  useEffect(() => {
    if (!twoVsTwoRoomAblyId || !twoVsTwoState) return
    publish2v2Ref.current({ type: '2v2_state', state: twoVsTwoState })
  }, [twoVsTwoState, twoVsTwoRoomAblyId])

  // Persiste lo stato 2v2 in localStorage per il reconnect dell'host
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!twoVsTwoState || !twoVsTwoRoomAblyId) return
    if (twoVsTwoState.ended) {
      localStorage.removeItem('aigora_2v2_active')
      return
    }
    localStorage.setItem('aigora_2v2_active', JSON.stringify({
      roomId: twoVsTwoRoomAblyId,
      state: twoVsTwoState,
      savedAt: Date.now(),
    }))
  }, [twoVsTwoState, twoVsTwoRoomAblyId])

  // Al mount: controlla se esiste una partita 2v2 salvata
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem('aigora_2v2_active')
      if (!saved) return
      const { roomId, state, savedAt } = JSON.parse(saved)
      if (Date.now() - savedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('aigora_2v2_active')
        return
      }
      if (state && !state.ended && roomId) {
        setPendingReconnect({ roomId, state })
      }
    } catch {
      localStorage.removeItem('aigora_2v2_active')
    }
  }, [])
  // ─────────────────────────────────────────────────────────────────────────

  // Registra la sessione al mount
  useEffect(() => {
    fetch('/api/session', { method: 'POST' }).catch(() => {})
    // Controlla validità ogni 5 minuti — ma solo se esiste già il cookie
    const check = setInterval(() => {
      fetch('/api/session').then(r => r.json()).then(d => {
        // Invalida solo se esplicitamente invalid E il cookie esiste (evita falsi positivi al primo caricamento)
        if (d.valid === false && d.hasToken) {
          window.location.href = '/login?error=session_expired'
        }
      }).catch(() => {})
    }, 5 * 60_000)
    return () => clearInterval(check)
  }, [])

  // Risolve il piano reale dal DB (evita sfasamenti JWT)
  useEffect(() => {
    fetch('/api/user/me')
      .then(r => r.json())
      .then(d => {
        if (d.id) setDbUserId(d.id)
        if (d.plan) setResolvedPlan(d.plan)
        if (d.image) setUserImage(d.image)
        if (d.name) {
          setDbUserName(d.name)
          setUserName(d.name)
          setNameConfirmed(true)
        } else {
          setNameConfirmed(false)
        }
        if (d.beta) setIsBeta(true)
      })
      .catch(() => {})
  }, [])

  // Piano effettivo — usa quello dal DB se disponibile
  const effectivePlan = resolvedPlan ?? userPlan ?? 'free'
  // Allegati disponibili solo per Pro, Premium e Admin
  const canAttach = effectivePlan === 'pro' || effectivePlan === 'premium' || effectivePlan === 'admin'
  // Group chat disponibile da Pro in su
  const canUseGroupChat = effectivePlan === 'pro' || effectivePlan === 'premium' || effectivePlan === 'admin' || effectivePlan === 'freemium'

  // Carica rooms e notifiche (Pro+)
  useEffect(() => {
    if (!canUseGroupChat) return
    fetch('/api/rooms').then(r => r.json()).then(d => { if (d.rooms) setRooms(d.rooms) }).catch(() => {})
    fetch('/api/notifications').then(r => r.json()).then(d => {
      if (d.notifications) {
        setNotifications(d.notifications)
        setUnreadCount(d.notifications.filter((n: any) => !n.read).length)
      }
    }).catch(() => {})
  }, [canUseGroupChat])

  // Ricerca utenti con debounce (per crea room)
  useEffect(() => {
    if (userSearch.length < 2) { setUserResults([]); return }
    const t = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(userSearch)}`)
        .then(r => r.json()).then(d => setUserResults(d.users ?? [])).catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [userSearch])

  // Ricerca utenti per invito in chat
  useEffect(() => {
    if (inviteSearch.length < 2) { setInviteResults([]); return }
    const t = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(inviteSearch)}`)
        .then(r => r.json()).then(d => setInviteResults(d.users ?? [])).catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [inviteSearch])

  const handleCreateRoom = async () => {
    if (!createTopic.trim()) return
    setCreatingRoom(true)
    try {
      // Room effimera: scade dopo 24 ore
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: createTopic,
          visibility: createVisibility,
          aiIds: createAis,
          invitedUserIds: createInvited.map(u => u.id),
          type: 'group',
          expiresAt,
        }),
      })
      const data = await res.json()
      if (data.room) {
        setRooms(prev => [data.room, ...prev])
        setCreateTopic('')
        setCreateInvited([])
        setSocialTab('feed')
        // Redirect alla pagina room dedicata
        window.location.href = `/room/${data.room.id}`
      }
    } catch {}
    setCreatingRoom(false)
  }

  const handleDeleteChat = (chatId: string, chatTitle: string, e: React.MouseEvent) => {
    e.stopPropagation()
    // Rimuovi subito dall'UI
    setSavedChats(prev => prev.filter(c => c.id !== chatId))
    // Mostra undo per 3 secondi
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoChat({ id: chatId, title: chatTitle })
    undoTimerRef.current = setTimeout(async () => {
      setUndoChat(null)
      // Soft delete sul server dopo 3 secondi
      await fetch(`/api/chats/${chatId}`, { method: 'DELETE' }).catch(() => {})
    }, 3000)
  }

  const handleUndoDelete = () => {
    if (!undoChat) return
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    // Ricarica le chat dal server per ripristinare
    fetch('/api/chats').then(r => r.json()).then(data => {
      if (data.chats) setSavedChats(data.chats.map((c: any) => ({
        id: c.id, title: c.title,
        date: new Date(c.updatedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        messages: c.messages, history: c.history,
      })))
    }).catch(() => {})
    setUndoChat(null)
  }

  const handleCloseRoom = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`/api/rooms/${roomId}`, { method: 'PATCH' })
      setRooms(prev => prev.filter(r => r.id !== roomId))
    } catch {}
  }

  const handleOpenRoom = async (roomId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`)
      const data = await res.json()
      if (data.room) {
        setActiveRoom(data.room)
        setMyRoomRole(data.myRole ?? 'spectator')
        // Avvia il dibattito con le AI della room usando il topic come domanda
        const aiIds: string[] = Array.isArray(data.room.aiIds) ? data.room.aiIds : ['claude', 'gemini', 'perplexity', 'gpt']
        handleStart(data.room.topic)
      }
    } catch {}
  }

  // Banner ROUND desktop — si attiva 1s dopo il cambio round
  useEffect(() => {
    const round = twoVsTwoState?.round
    if (!round || twoVsTwoState?.ended) return
    if (round === prevDesktopRound.current) return
    prevDesktopRound.current = round
    const show = setTimeout(() => {
      setDesktopRoundBanner(round)
      const hide = setTimeout(() => setDesktopRoundBanner(null), 2200)
      return () => clearTimeout(hide)
    }, 1000)
    return () => clearTimeout(show)
  }, [twoVsTwoState?.round, twoVsTwoState?.ended])

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

  const saveCurrentChat = useCallback(() => {
    // Debounce: durante lo streaming ogni chunk triggerebbe un POST — aspetta 2s di inattività
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current)
    saveDebounceRef.current = setTimeout(async () => {
      if (isLoadingHistoryRef.current) return
      if (messagesRef.current.length < 2) return

      const msgs = messagesRef.current
      const userMsg = msgs.find(m => m.isUser)?.content ?? ''
      const aiMsg = msgs.find(m => !m.isUser)?.content ?? ''

      // Genera titolo contestuale la prima volta (quando abbiamo almeno 1 msg AI)
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
    }, 2000)
  }, [])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputBarRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const messagesRef = useRef<Message[]>([])
  const chatHistoryRef = useRef<{ name: string; content: string }[]>([])
  const usedAisRef = useRef<string[]>([])
  const stopRequestedRef = useRef(false)
  const waitingForUserRef = useRef(false)   // ref speculare a waitingForUser
  const aiTurnCountRef = useRef(0)
  const perplexityTurnCountRef = useRef(0)  // conta solo i turni di Perplexity
  const isLoadingHistoryRef = useRef(false) // previeni saveCurrentChat durante apertura chat da cronologia

  // Musica 2v2 — fade in all'inizio, fade out alla fine con crossfade
  const twoVsTwoFadeRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fadeAudio = (audio: HTMLAudioElement, fromVol: number, toVol: number, durationMs: number, onDone?: () => void) => {
    if (twoVsTwoFadeRef.current) clearInterval(twoVsTwoFadeRef.current)
    const steps = 40
    const stepMs = durationMs / steps
    const delta = (toVol - fromVol) / steps
    let current = fromVol
    audio.volume = Math.max(0, Math.min(1, current))
    twoVsTwoFadeRef.current = setInterval(() => {
      current += delta
      audio.volume = Math.max(0, Math.min(1, current))
      if ((delta > 0 && current >= toVol) || (delta < 0 && current <= toVol)) {
        if (twoVsTwoFadeRef.current) clearInterval(twoVsTwoFadeRef.current)
        audio.volume = toVol
        onDone?.()
      }
    }, stepMs)
  }

  useEffect(() => {
    const isActive = twoVsTwoState !== null && !twoVsTwoState.ended
    if (isActive) {
      // Fade in: crea un nuovo Audio oppure riprendi quello esistente
      if (!twoVsTwoAudioRef.current) {
        twoVsTwoAudioRef.current = new Audio('/dust-at-high-noon.mp3')
        twoVsTwoAudioRef.current.loop = true
        twoVsTwoAudioRef.current.volume = 0
      }
      const audio = twoVsTwoAudioRef.current
      audio.play().catch(() => {})
      fadeAudio(audio, audio.volume, 0.25, 1200)
    } else {
      if (twoVsTwoAudioRef.current) {
        const audio = twoVsTwoAudioRef.current
        // Fade out, poi pausa
        fadeAudio(audio, audio.volume, 0, 1500, () => {
          audio.pause()
          audio.currentTime = 0
        })
      }
    }
    return () => {
      if (twoVsTwoFadeRef.current) clearInterval(twoVsTwoFadeRef.current)
    }
  }, [twoVsTwoState?.ended, twoVsTwoState !== null])

  // Aggiorna tema se l'utente cambia dark/light mode mentre è nell'app (solo desktop)
  useEffect(() => {
    if (window.innerWidth < 1024) return // su mobile tema fisso scuro
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

  const mobileBg = bgPreset

  const isDark = mobileBg.text === 'white'
  const displayName = userName.trim() || 'Tu'
  const historyName = userName.trim() || 'Utente'

  // ── Colore sfondo body/html + chrome browser ──
  useEffect(() => {
    const color = (phase === 'start') ? '#07070f' : mobileBg.value
    const headerColor = (phase === 'start') ? '#07070f' : mobileBg.header
    document.body.style.setProperty('background-color', color, 'important')
    document.documentElement.style.setProperty('background-color', color, 'important')
    const metaTheme = document.querySelector('meta[name="theme-color"]')
    if (metaTheme) metaTheme.setAttribute('content', headerColor)
  }, [phase, mobileBg.value, mobileBg.header])


  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      const el = messagesContainerRef.current
      if (!el) return
      // Con column-reverse, scrollTop=0 è il fondo. Scrolla solo se l'utente è già in fondo.
      if (isAtBottomRef.current) el.scrollTop = 0
    }, 0)
  }, [])

  useEffect(() => {
    messagesRef.current = messages
    scrollToBottom()
    if (messages.length >= 2) saveCurrentChat()
  }, [messages, thinkingAi, waitingForUser, scrollToBottom, saveCurrentChat])

  // Scroll automatico durante streaming 2v2
  useEffect(() => {
    if (twoVsTwoState) scrollToBottom()
  }, [twoVsTwoState?.messages, twoVsTwoLoading, scrollToBottom])

  const wasDebatingRef = useRef(false) // stava girando il debate quando si è andati in cronologia

  // Stop loop quando si va in cronologia/profilo, riprende quando si torna in running
  useEffect(() => {
    if (phase === 'history' || phase === 'profile' || phase === 'new') {
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
    let realModel: string | undefined
    const controller = new AbortController()
    // Timeout di sicurezza: se dopo 45s non arriva [DONE], abbandona
    const timeout = setTimeout(() => controller.abort(), 45000)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: chatHistoryRef.current, aiId, action: isSynthesis ? 'synthesize' : 'turn', needsWebSearch: needsWebSearchRef.current, perplexityTurnCount: perplexityTurnCountRef.current, attachment: currentRoundAttachmentRef.current }),
        signal: controller.signal,
      })

      if (res.status === 429) {
        try {
          const data = await res.json()
          if (data.error === 'limit_reached') {
            setLimitInfo(data as LimitInfo)
          }
        } catch {}
        setActiveAi(null)
        return null
      }

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let done = false

      while (!done) {
        const { done: streamDone, value } = await reader.read()
        if (value) buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        // Tieni l'ultima riga incompleta nel buffer
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim()
          if (d === '[DONE]') { done = true; break }
          try {
            const parsed = JSON.parse(d)
            if (parsed.model) realModel = parsed.model
            else if (parsed.text) fullText += parsed.text
          } catch {}
        }
        if (streamDone) break
      }
      // Flush del buffer residuo dopo la fine dello stream
      if (buffer.trim()) {
        for (const line of buffer.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim()
          if (d !== '[DONE]') try {
            const parsed = JSON.parse(d)
            if (parsed.model) realModel = parsed.model
            else if (parsed.text) fullText += parsed.text
          } catch {}
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('streamAiResponse error:', err)
      // Se abbiamo testo parziale usalo, altrimenti null per saltare il turno silenziosamente
    } finally {
      clearTimeout(timeout)
    }

    setThinkingAi(null)
    if (stopRequestedRef.current || !fullText) { setActiveAi(null); return null }

    const msgId = `${aiId}-${Date.now()}`
    setMessages(prev => [...prev, { id: msgId, aiId, name: AI_NAMES[aiId] || aiId, content: '', isStreaming: true, isSynthesis, realModel }])
    await typewriteText(msgId, fullText)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false, content: fullText } : m))
    setActiveAi(null)
    return fullText
  }, [typewriteText])

  const runFactCheck = useCallback(async (speakerAiId: string): Promise<void> => {
    if (stopRequestedRef.current) return
    // Scegli un interruptore diverso dal parlante E dalla prossima AI in lista
    const nextAiInLine = getDefaultNextAi(speakerAiId, usedAisRef.current, AI_ORDER)
    const others = AI_ORDER.filter(id => id !== speakerAiId && id !== nextAiInLine)
    // Se non ci sono candidati validi (solo 2 AI disponibili), salta il factcheck
    if (others.length === 0) return
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
        if (value) buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim()
          if (d === '[DONE]') { done = true; break }
          try { const p = JSON.parse(d); if (p.text) fullText += p.text } catch {}
        }
        if (sd) break
      }
      if (buffer.trim()) {
        for (const line of buffer.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim()
          if (d !== '[DONE]') try { const p = JSON.parse(d); if (p.text) fullText += p.text } catch {}
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
      if (stopRequestedRef.current) break
      // Se il turno è fallito (timeout/errore), aspetta un po' e passa all'AI successiva
      if (!text) {
        await new Promise(r => setTimeout(r, 1200))
        currentAi = getDefaultNextAi(currentAi, usedAisRef.current, AI_ORDER)
        continue
      }

      chatHistoryRef.current.push({ name: AI_NAMES[currentAi], content: text })
      usedAisRef.current.push(currentAi)
      aiTurnCountRef.current += 1
      if (currentAi === 'perplexity') perplexityTurnCountRef.current += 1
      setTurnCount(aiTurnCountRef.current)

      // Fact-check ogni 3 turni (ridotto da 2 per meno interruzioni)
      if (aiTurnCountRef.current % 3 === 0 && !stopRequestedRef.current) {
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
        currentRoundAttachmentRef.current = null   // allegato consumato per questo round
        waitingForUserRef.current = true
        setWaitingForUser(true)
        stopRequestedRef.current = true
        return
      } else {
        // Modalità debate: round-robin automatico, pausa ogni 4 turni
        const nextAi = getDefaultNextAi(currentAi, usedAisRef.current, AI_ORDER)

        if (aiTurnCountRef.current % 4 === 0) {
          currentRoundAttachmentRef.current = null   // allegato consumato per questo round
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

    // Routing + controllo limite — prima di mostrare qualsiasi cosa all'utente
    let mode: 'debate' | 'focused' = 'debate'
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'route', question: q, availableAis: AI_ORDER, history: [] }),
      })
      if (res.status === 429) {
        const data = await res.json()
        if (data.error === 'limit_reached') {
          setLimitInfo(data as LimitInfo)
          return  // blocca il dibattito, mostra LimitWall
        }
      }
      const data = await res.json()
      if (data.mode === 'focused') mode = 'focused'
      needsWebSearchRef.current = !!data.needsWebSearch
    } catch {}

    // Limite non raggiunto — procedi normalmente
    setLimitInfo(null)
    currentChatIdRef.current = `chat-${Date.now()}`
    chatTitleRef.current = ''
    chatHistoryRef.current = [{ name: historyName, content: q }]
    usedAisRef.current = []
    aiTurnCountRef.current = 0
    perplexityTurnCountRef.current = 0
    stopRequestedRef.current = false
    setMessages([{ id: 'user-0', aiId: 'user', name: displayName, content: q, isUser: true }])
    setTurnCount(0)
    setPhase('running')

    const startAi = AI_ORDER[Math.floor(Math.random() * AI_ORDER.length)]
    runDebate(startAi, mode)
  }

  const handleSendMessage = () => {
    if (!inputText.trim() && !pendingAttachment) return
    const text = inputText.trim()
    const att = pendingAttachment   // cattura prima del reset
    setInputText('')
    setPendingAttachment(null)
    // Salva allegato nel ref per il round corrente (si azzera dopo runDebate)
    currentRoundAttachmentRef.current = att
    const messageId = `user-${Date.now()}`
    const userMsg: Message = { id: messageId, aiId: 'user', name: displayName, content: text || '📎', isUser: true, attachment: att ?? undefined }
    chatHistoryRef.current.push({ name: historyName, content: text || `[allegato: ${att?.name ?? 'file'}]` })
    setMessages(prev => [...prev, userMsg])

    // Pubblica su Ably se siamo in una room multiplayer
    if (activeRoom) {
      publish({
        type: 'user_message',
        userId: userEmail ?? '',
        userName: displayName,
        content: text,
        messageId,
      })
    }

    if (waitingForUserRef.current || stopRequestedRef.current) {
      waitingForUserRef.current = false
      setWaitingForUser(false)
      aiTurnCountRef.current = 0
      // perplexityTurnCountRef NON si resetta tra i round: conta i turni totali di Perplexity
      // nella sessione, così il pattern Pro/Sonar/Sonar/Sonar rimane coerente
      stopRequestedRef.current = false

      // Se l'utente menziona un'AI, quella risponde per prima ma poi il dibattito
      // riprende normalmente con tutte le AI (non rimane in botta e risposta)
      const mentioned = detectUserMention(text, AI_ORDER)
      const startAi = mentioned || (() => {
        const lastAi = usedAisRef.current[usedAisRef.current.length - 1] || 'claude'
        return getDefaultNextAi(lastAi, [], AI_ORDER)
      })()
      setTimeout(() => runDebate(startAi, 'debate'), 150)
    }
  }

  // ── Logica formati multiplayer ────────────────────────────────────────────
  const handleSelectMode = (mode: GameMode) => {
    setSelectedMode(mode)
    setShowModeSelect(false)
    if (mode === 'devil') {
      setShowDevilDifficulty(true)
    } else if (mode === '2v2') {
      setShow2v2Setup(true)
    } else if (mode === 'group') {
      // Apri il pannello social tab "create" direttamente
      setSocialTab('crea')
      setShowSocialPanel(true)
      setSelectedMode(null)
    } else if (mode === 'classico') {
      setSelectedMode(null)
      setPhase('new')
    }
  }

  const handleDevilDifficultySelect = async (difficulty: DevilDifficulty) => {
    setDevilLoading(true)
    const delay = new Promise(r => setTimeout(r, 5000))
    try {
      const [res] = await Promise.all([
        fetch('/api/devil/generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ difficulty }),
        }),
        delay,
      ])
      if (!res.ok) throw new Error()
      const { positions } = await res.json()
      setDevilIntroData({ positions, difficulty })
      setShowDevilDifficulty(false)
    } catch {
      await delay
      setDevilIntroData({
        positions: ['I bugiardi abituali sono più affidabili degli onesti', 'La crudeltà è la forma più onesta di rispetto'],
        difficulty,
      })
      setShowDevilDifficulty(false)
    } finally {
      setDevilLoading(false)
    }
  }

  const handleDevilStart = (position: string) => {
    if (!devilIntroData) return
    devilVerdictRunningRef.current = false
    setDevilSession({
      position,
      difficulty: devilIntroData.difficulty,
      side: 'defend',
      round: 1,
      score: 5.0,
      rerollUsed: false,
      phase: 'playing',
      messages: [],
      verdicts: [],
      finalScore: null,
      userReply: null,
      claudeClosing: null,
    })
    setDevilIntroData(null)
    setPhase('running')
  }

  const handle2v2Start = (config: TwoVsTwoConfig & { roomCode?: string; roomId?: string }) => {
    setShow2v2Setup(false)
    setSelectedMode('2v2')
    // Animazione navbar: prima "2 VS 2", poi dopo 2.5s il tema
    setShow2v2Label('title')
    setTimeout(() => setShow2v2Label('topic'), 2500)
    // Attiva sync Ably se questa è una partita multiplayer (ha un roomId)
    if (config.roomId) setTwoVsTwoRoomAblyId(config.roomId)
    setTwoVsTwoState({
      config,
      messages: [],
      currentTurn: 'A',
      round: 1,
      maxRounds: config.maxRounds ?? 5,
      messagesThisTurn: 0,
      maxMessagesPerTurn: 3,
      scoreA: 0,
      scoreB: 0,
      roundScores: [],
      ended: false,
      verdict: null,
      waitingForOpponent: config.mode === 'amico',
    })
    setPhase('running')
  }

  const handle2v2Reconnect = () => {
    if (!pendingReconnect) return
    setPendingReconnect(null)
    setShow2v2Label('topic')
    setSelectedMode('2v2')
    setTwoVsTwoRoomAblyId(pendingReconnect.roomId)
    setTwoVsTwoState(pendingReconnect.state)
    setPhase('running')
  }

  const handle2v2AIResponse = async (team: 'A' | 'B', trigger: string): Promise<void> => {
    if (!twoVsTwoState) return
    setTwoVsTwoLoading(true)
    const state = twoVsTwoState
    const { config } = state
    const aiId = team === 'A' ? config.teamA.aiId : config.teamB.aiId1
    const aiName = AI_NAMES[aiId]
    const humanName = team === 'A' ? config.teamA.humanName : 'Squadra B'
    const enemyAiNames = team === 'A'
      ? `${AI_NAMES[config.teamB.aiId1]} e ${AI_NAMES[config.teamB.aiId2]}`
      : AI_NAMES[config.teamA.aiId]

    // Costruisci history etichettando chiaramente chi è alleato e chi avversario
    const history = state.messages
      .filter(m => m.team !== 'arbiter')
      .map(m => {
        const isAlly = m.team === team
        const label = isAlly
          ? (m.isAI ? `${m.author} (tuo alleato)` : `${m.author} (tuo compagno)`)
          : (m.isAI ? `${m.author} (avversario)` : `${m.author} (avversario)`)
        return { name: label, content: m.content }
      })

    // Controlla se gli avversari hanno già parlato
    const enemyMessages = state.messages.filter(m => m.team !== team && m.team !== 'arbiter')
    const enemyHaveSpoken = enemyMessages.length > 0

    // Aggiungi placeholder con streaming (mostra i tre puntini finché content è vuoto)
    setTwoVsTwoState(prev => prev ? {
      ...prev,
      messages: [...prev.messages, { team, isAI: true, aiId, author: aiName, content: '', streaming: true }]
    } : prev)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: '2v2', aiId,
          maxTokens: 350,
          history: [
            { name: 'Sistema', content: (() => {
              const teamASide = config.teamASide ?? 'attack'
              const thisSide = team === 'A' ? teamASide : (teamASide === 'attack' ? 'defend' : 'attack')
              const roleInstruction = thisSide === 'attack'
                ? `Il tuo compito è ATTACCARE e smontare la tesi "${config.topic}": porta argomenti contro di essa, evidenziane le debolezze, confuta le posizioni avversarie.`
                : `Il tuo compito è DIFENDERE e sostenere la tesi "${config.topic}": porta argomenti a favore, rafforza i punti chiave, rispondi alle obiezioni avversarie.`
              return `Sei in una squadra con ${humanName} contro ${enemyAiNames}. Stai dibattendo: "${config.topic}". ${roleInstruction} Parla come un compagno di squadra appassionato: dai ragione a ${humanName}, aggiungi argomenti a suo favore${enemyHaveSpoken ? `, attacca le posizioni di ${enemyAiNames}` : ''}. Tono diretto, coinvolto, da alleato — non da professore neutrale. Massimo 2 frasi brevi nella lingua del messaggio. Non descrivere mai le tue azioni o emozioni con asterischi (*faccio X*, *mi fermo*, ecc.) — parla solo con argomenti. NON usare mai numeri tra parentesi quadre [1][2][3] per le fonti: se citi uno studio, integra nome e autore direttamente nel testo. Mantieni però il tuo stile e carattere unici: ${AI_PROFILES[aiId]?.carattere ?? ''}`
            })() },
            ...history,
            { name: 'Sistema', content: enemyHaveSpoken
              ? `${humanName} ha appena detto: "${trigger}". Schierati con lui, rinforza il suo punto e smonta quello degli avversari.`
              : `${humanName} ha appena detto: "${trigger}". Schierati con lui e porta argomenti forti a favore della vostra posizione. Gli avversari non hanno ancora parlato: non citarli, concentrati solo sui vostri argomenti.`
            }
          ],
          needsWebSearch: false
        }),
      })
      if (!res.ok || !res.body) throw new Error()
      // ── Scarica tutto il testo prima (come streamAiResponse) ──
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = '', fullText = '', done = false
      while (!done) {
        const { done: sd, value } = await reader.read()
        if (value) buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim(); if (d === '[DONE]') { done = true; break }
          try { const p = JSON.parse(d); if (p.text) fullText += p.text } catch {}
        }
        if (sd) break
      }
      if (buffer.trim()) {
        for (const line of buffer.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim()
          if (d !== '[DONE]') try { const p = JSON.parse(d); if (p.text) fullText += p.text } catch {}
        }
      }
      // ── Poi typewrite lettera per lettera (identico a typewriteText) ──
      await new Promise<void>(resolve => {
        let i = 0
        const iv = setInterval(() => {
          if (i >= fullText.length) {
            clearInterval(iv)
            setTwoVsTwoState(prev => {
              if (!prev) return prev
              const msgs = [...prev.messages]
              msgs[msgs.length - 1] = { team, isAI: true, aiId, author: aiName, content: fullText, streaming: false }
              return { ...prev, messages: msgs }
            })
            resolve(); return
          }
          i++
          setTwoVsTwoState(prev => {
            if (!prev) return prev
            const msgs = [...prev.messages]
            msgs[msgs.length - 1] = { team, isAI: true, aiId, author: aiName, content: fullText.slice(0, i), streaming: true }
            return { ...prev, messages: msgs }
          })
        }, TYPEWRITER_DELAY)
      })
    } catch {
      // Rimuovi placeholder in caso di errore
      setTwoVsTwoState(prev => prev ? { ...prev, messages: prev.messages.slice(0, -1) } : prev)
    }
    setTwoVsTwoLoading(false)
  }

  const handle2v2HumanMessage = async (text: string) => {
    if (!twoVsTwoState || twoVsTwoLoading) return
    const { config, currentTurn, messagesThisTurn, maxMessagesPerTurn, round, maxRounds } = twoVsTwoState
    const author = currentTurn === 'A' ? config.teamA.humanName : "Squadra B"

    // Aggiungi messaggio umano
    const newCount = messagesThisTurn + 1
    setTwoVsTwoState(prev => prev ? {
      ...prev,
      messages: [...prev.messages, { team: currentTurn, isAI: false, author, content: text }],
      messagesThisTurn: newCount,
    } : prev)

    // AI alleata di A risponde
    await handle2v2AIResponse(currentTurn, text)

    // Dopo ogni risposta umana + AI, passa subito il turno a B
    // (B gioca sempre dopo ogni coppia umano+AI di A)
    const nextRound = round // il round aumenta quando B ha finito e si torna ad A
    const isLastRound = round >= maxRounds

    if (isLastRound && newCount >= maxMessagesPerTurn) {
      await handle2v2Verdict()
      return
    }

    // Passa a B automaticamente dopo 1s
    await new Promise(r => setTimeout(r, 1000))

    // In multiplayer: pubblica lo stato e aspetta la mossa umana di B via Ably
    if (twoVsTwoRoomAblyId) {
      setTwoVsTwoState(prev => prev ? { ...prev, currentTurn: 'B', messagesThisTurn: 0, waitingForOpponent: true } : prev)
      setTwoVsTwoLoading(false)
      return
    }

    // Solo: segna che ora tocca a B e fai rispondere le AI di B
    setTwoVsTwoState(prev => prev ? { ...prev, currentTurn: 'B', messagesThisTurn: 0 } : prev)
    setTwoVsTwoLoading(true)

    // B risponde: aiId1 e aiId2 (l'arbitro è separato e non gioca mai)
    const bConfig = twoVsTwoState.config.teamB
    const teamAHumanName = twoVsTwoState.config.teamA.humanName
    const teamAAiName = AI_NAMES[twoVsTwoState.config.teamA.aiId]
    const bHistory = twoVsTwoState.messages
      .filter(m => m.team !== 'arbiter')
      .map(m => {
        const isEnemy = m.team === 'A'
        const label = isEnemy
          ? (m.isAI ? `${m.author} (avversario)` : `${m.author} (avversario)`)
          : `${m.author} (tuo alleato)`
        return { name: label, content: m.content }
      })

    for (const bAiId of [bConfig.aiId1, bConfig.aiId2]) {
      setTwoVsTwoState(prev => prev ? {
        ...prev,
        messages: [...prev.messages, { team: 'B' as const, isAI: true, aiId: bAiId, author: AI_NAMES[bAiId], content: '', streaming: true }]
      } : prev)

      // Scarica testo
      const bRes = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: '2v2', aiId: bAiId,
          maxTokens: 350,
          history: [
            { name: 'Sistema', content: `Sei ${AI_NAMES[bAiId]}, membro della Squadra B. Stai dibattendo contro ${teamAHumanName} e ${teamAAiName} sul tema: "${twoVsTwoState.config.topic}". Il tuo unico compito è smontare gli argomenti avversari con forza e convinzione. Tono diretto, aggressivo nei confronti delle idee avversarie. Massimo 2 frasi brevi nella lingua del messaggio. Non descrivere mai le tue azioni o emozioni con asterischi (*faccio X*, *mi fermo*, ecc.) — parla solo con argomenti. Mantieni però il tuo stile e carattere unici: ${AI_PROFILES[bAiId]?.carattere ?? ''}` },
            ...bHistory,
            { name: 'Sistema', content: `${teamAHumanName} ha appena detto: "${text}". Attacca questo argomento.` }
          ],
          needsWebSearch: false
        }),
      })
      if (bRes.ok && bRes.body) {
        const reader = bRes.body.getReader()
        const decoder = new TextDecoder()
        let buffer = '', fullText = '', done = false
        while (!done) {
          const { done: sd, value } = await reader.read()
          if (value) buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n'); buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const d = line.slice(6).trim(); if (d === '[DONE]') { done = true; break }
            try { const p = JSON.parse(d); if (p.text) fullText += p.text } catch {}
          }
          if (sd) break
        }
        if (buffer.trim()) {
          for (const line of buffer.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const d = line.slice(6).trim()
            if (d !== '[DONE]') try { const p = JSON.parse(d); if (p.text) fullText += p.text } catch {}
          }
        }
        // Typewrite
        await new Promise<void>(resolve => {
          let i = 0
          const iv = setInterval(() => {
            if (i >= fullText.length) {
              clearInterval(iv)
              setTwoVsTwoState(prev => {
                if (!prev) return prev
                const msgs = [...prev.messages]
                msgs[msgs.length - 1] = { team: 'B' as const, isAI: true, aiId: bAiId, author: AI_NAMES[bAiId], content: fullText, streaming: false }
                return { ...prev, messages: msgs }
              })
              resolve(); return
            }
            i++
            setTwoVsTwoState(prev => {
              if (!prev) return prev
              const msgs = [...prev.messages]
              msgs[msgs.length - 1] = { team: 'B' as const, isAI: true, aiId: bAiId, author: AI_NAMES[bAiId], content: fullText.slice(0, i), streaming: true }
              return { ...prev, messages: msgs }
            })
          }, TYPEWRITER_DELAY)
        })
      }
      await new Promise(r => setTimeout(r, 500))
    }

    setTwoVsTwoLoading(false)

    // Dopo che B ha risposto, torna ad A per il round successivo (o verdetto)
    const currentState = twoVsTwoState
    const newRound = currentState.round + 1
    if (newRound > currentState.maxRounds) {
      // Ultimo round completato — prima assegna il punto del round, poi verdetto finale
      await handle2v2RoundVerdict(currentState.round)
      await handle2v2Verdict()
    } else {
      // Round intermedio — chiama l'arbitro per il punto del round
      await handle2v2RoundVerdict(currentState.round)
      // Progress bar 7s poi banner ROUND e avanzamento
      let elapsed = 0
      const DURATION = 7000
      setTwoVsTwoState(prev => prev ? { ...prev, roundProgress: 0 } : prev)
      await new Promise<void>(resolve => {
        const iv = setInterval(() => {
          elapsed += 50
          const pct = Math.min(elapsed / DURATION, 1)
          setTwoVsTwoState(prev => prev ? { ...prev, roundProgress: pct } : prev)
          if (elapsed >= DURATION) {
            clearInterval(iv)
            setTwoVsTwoState(prev => prev ? { ...prev, roundProgress: null, currentTurn: 'A', round: newRound, messagesThisTurn: 0 } : prev)
            resolve()
          }
        }, 50)
      })
    }
  }

  // Mini-verdetto arbitro dopo ogni round
  const handle2v2RoundVerdict = async (roundNumber: number) => {
    if (!twoVsTwoState) return
    const { config } = twoVsTwoState
    const arbId = config.arbiterAiId
    const arbName = AI_NAMES[arbId]

    // History del solo round corrente (messaggi non arbiter del round)
    const nonArbMessages = twoVsTwoState.messages.filter(m => m.team !== 'arbiter')
    const history = nonArbMessages.map(m => ({
      name: m.isAI ? AI_NAMES[m.aiId ?? ''] ?? m.author : m.author,
      content: m.content,
    }))

    const promptContent = `Sei ${arbName}, arbitro imparziale di un dibattito 2v2 su: "${config.topic}". Squadra A: ${config.teamA.humanName} + ${AI_NAMES[config.teamA.aiId]}. Squadra B: AI (${AI_NAMES[config.teamB.aiId1]} + ${AI_NAMES[config.teamB.aiId2]}). Hai appena assistito al round ${roundNumber}. Devi assegnare esattamente 1 punto a UNA delle due squadre: scrivi "PUNTO: A" oppure "PUNTO: B". Non puoi mai fare pareggio. Poi motiva il punto con una frase secca e diretta. Massimo 150 tokens in totale. Niente di più.`

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: '2v2', aiId: arbId,
          history: [{ name: 'Sistema', content: promptContent }, ...history, { name: 'Sistema', content: `Pronuncia il punto per il round ${roundNumber}.` }],
          needsWebSearch: false,
        }),
      })
      if (!res.ok || !res.body) return
      const reader = res.body.getReader(); const decoder = new TextDecoder()
      let buffer = '', text = '', done = false
      // Aggiungi messaggio arbitro streaming
      setTwoVsTwoState(prev => prev ? {
        ...prev,
        messages: [...prev.messages, { team: 'arbiter' as const, isAI: true, aiId: arbId, author: arbName, content: '', streaming: true }],
      } : prev)
      while (!done) {
        const { done: sd, value } = await reader.read()
        if (value) buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim(); if (d === '[DONE]') { done = true; break }
          try { const p = JSON.parse(d); if (p.text) text += p.text } catch {}
          setTwoVsTwoState(prev => {
            if (!prev) return prev
            const msgs = [...prev.messages]
            msgs[msgs.length - 1] = { team: 'arbiter' as const, isAI: true, aiId: arbId, author: arbName, content: text, streaming: true }
            return { ...prev, messages: msgs }
          })
        }
        if (sd) break
      }
      // Estrai chi ha vinto il round e aggiorna score
      const winMatch = text.match(/PUNTO:\s*(A|B)/i)
      const winner = winMatch ? winMatch[1].toUpperCase() as 'A' | 'B' : null
      setTwoVsTwoState(prev => {
        if (!prev) return prev
        const msgs = [...prev.messages]
        msgs[msgs.length - 1] = { team: 'arbiter' as const, isAI: true, aiId: arbId, author: arbName, content: text.replace(/PUNTO:\s*(A|B)\s*/i, '').trim() || text, streaming: false }
        const newScoreA = (prev.scoreA ?? 0) + (winner === 'A' ? 1 : 0)
        const newScoreB = (prev.scoreB ?? 0) + (winner === 'B' ? 1 : 0)
        const newRoundScores = [
          ...(prev.roundScores ?? []),
          { round: roundNumber, winner: (winner === 'A' ? 'A' : winner === 'B' ? 'B' : 'draw') as 'A' | 'B' | 'draw' },
        ]
        return { ...prev, messages: msgs, scoreA: newScoreA, scoreB: newScoreB, roundScores: newRoundScores, showScoreFlash: winner, scoreFlashAt: Date.now() }
      })
    } catch {}
  }

  const handle2v2Verdict = async () => {
    if (!twoVsTwoState) return
    setTwoVsTwoLoading(true)
    const { config } = twoVsTwoState
    const arbId = config.arbiterAiId
    const arbName = AI_NAMES[arbId]

    // Costruisci la history escludendo messaggi arbiter intermedi
    const allMsgs = twoVsTwoState.messages.filter(m => m.team !== 'arbiter')
    const history = allMsgs.map(m => ({ name: m.isAI ? AI_NAMES[m.aiId ?? ''] ?? m.author : m.author, content: m.content }))

    // Usa i punteggi già accumulati dai round precedenti
    const existingScoreA = twoVsTwoState.scoreA ?? 0
    const existingScoreB = twoVsTwoState.scoreB ?? 0

    try {
      const tiebreakInstruction = existingScoreA === existingScoreB
        ? ` I punti sono in parità. Devi comunque dichiarare un vincitore: scrivi "VINCITORE: A" oppure "VINCITORE: B" in base alla qualità complessiva degli argomenti. Niente pareggi.`
        : ''
      const promptContent = `Sei ${arbName}, arbitro imparziale. Hai arbitrato un dibattito 2v2 su: "${config.topic}". Squadra A: ${config.teamA.humanName} + ${AI_NAMES[config.teamA.aiId]} (${existingScoreA} punti). Squadra B: AI — ${AI_NAMES[config.teamB.aiId1]} + ${AI_NAMES[config.teamB.aiId2]} (${existingScoreB} punti). Il dibattito è finito.${tiebreakInstruction} Scrivi un commento finale sintetico in 2-3 frasi: chi ha dominato, perché, e un giudizio complessivo. Niente numeri, già calcolati. Sii diretto e neutro.`

      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: '2v2', aiId: arbId, history: [{ name: 'Sistema', content: promptContent }, ...history, { name: 'Sistema', content: 'Scrivi il commento finale.' }], needsWebSearch: false }),
      })
      if (!res.ok || !res.body) throw new Error()
      const reader = res.body.getReader(); const decoder = new TextDecoder()
      let buffer = '', verdict = '', done = false
      setTwoVsTwoState(prev => prev ? { ...prev, messages: [...prev.messages, { team: 'arbiter' as const, isAI: true, aiId: arbId, author: arbName, content: '', streaming: true }], ended: true } : prev)
      while (!done) {
        const { done: sd, value } = await reader.read()
        if (value) buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim(); if (d === '[DONE]') { done = true; break }
          try { const p = JSON.parse(d); if (p.text) verdict += p.text } catch {}
          setTwoVsTwoState(prev => { if (!prev) return prev; const msgs = [...prev.messages]; msgs[msgs.length-1] = { team: 'arbiter' as const, isAI: true, aiId: arbId, author: arbName, content: verdict, streaming: true }; return { ...prev, messages: msgs } })
        }
        if (sd) break
      }
      if (buffer.trim()) {
        for (const line of buffer.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim()
          if (d !== '[DONE]') { try { const p = JSON.parse(d); if (p.text) verdict += p.text } catch {} }
        }
      }

      // Estrai vincitore da tiebreak se presente
      const tiebreakMatch = verdict.match(/VINCITORE:\s*(A|B)/i)
      const tiebreakWinner = tiebreakMatch ? tiebreakMatch[1].toUpperCase() as 'A' | 'B' : null
      const cleanVerdict = verdict.replace(/VINCITORE:\s*(A|B)\s*/i, '').trim()
      setTwoVsTwoState(prev => {
        if (!prev) return prev
        const msgs = [...prev.messages]
        msgs[msgs.length-1] = { ...msgs[msgs.length-1], content: cleanVerdict || verdict.trim(), streaming: false }
        const newScoreA = tiebreakWinner === 'A' ? (prev.scoreA ?? 0) + 1 : (prev.scoreA ?? 0)
        const newScoreB = tiebreakWinner === 'B' ? (prev.scoreB ?? 0) + 1 : (prev.scoreB ?? 0)
        return { ...prev, messages: msgs, verdict: cleanVerdict || verdict.trim(), scoreA: newScoreA, scoreB: newScoreB }
      })
    } catch {}
    setTwoVsTwoLoading(false)
  }

  // ── 2v2 multiplayer: processa la mossa umana di Player B ─────────────────
  // Chiamata dall'event handler Ably quando arriva un evento '2v2_action_b'
  const processB2v2Action = useCallback(async (content: string, bName = 'Squadra B') => {
    const state = twoVsTwoStateRef.current
    if (!state || state.ended) return

    const { config, round, maxRounds } = state
    const bHumanName = bName || config.teamB.humanNameB || 'Squadra B'
    const bAiId = config.teamB.aiId1
    const bAiName = AI_NAMES[bAiId]

    // 1. Aggiungi il messaggio umano di B
    setTwoVsTwoState(prev => prev ? {
      ...prev,
      messages: [...prev.messages, { team: 'B' as const, isAI: false, author: bHumanName, content }],
      messagesThisTurn: prev.messagesThisTurn + 1,
      waitingForOpponent: false,
    } : prev)

    setTwoVsTwoLoading(true)

    // 2. Fai rispondere l'AI alleata di B (aiId1)
    const currentMsgs = [...(twoVsTwoStateRef.current?.messages ?? state.messages)]
    const bHistory = currentMsgs
      .filter(m => m.team !== 'arbiter')
      .map(m => {
        const isEnemy = m.team === 'A'
        return { name: isEnemy ? `${m.author} (avversario)` : `${m.author} (tuo alleato)`, content: m.content }
      })

    const teamAHumanName = config.teamA.humanName
    const teamAAiName = AI_NAMES[config.teamA.aiId]

    setTwoVsTwoState(prev => prev ? {
      ...prev,
      messages: [...prev.messages, { team: 'B' as const, isAI: true, aiId: bAiId, author: bAiName, content: '', streaming: true }]
    } : prev)

    try {
      const bRes = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: '2v2', aiId: bAiId, maxTokens: 350,
          history: [
            { name: 'Sistema', content: `Sei ${bAiName}, alleato di ${bHumanName} nella Squadra B. State dibattendo contro ${teamAHumanName} e ${teamAAiName} sul tema: "${config.topic}". Supporta la posizione di ${bHumanName} e attacca gli argomenti avversari. Tono diretto. Massimo 2 frasi brevi nella lingua del messaggio. Niente asterischi. Carattere: ${AI_PROFILES[bAiId]?.carattere ?? ''}` },
            ...bHistory,
            { name: 'Sistema', content: `${bHumanName} ha detto: "${content}". Supporta questo argomento e attacca gli avversari.` }
          ],
          needsWebSearch: false,
        }),
      })
      if (bRes.ok && bRes.body) {
        const reader = bRes.body.getReader(); const decoder = new TextDecoder()
        let buffer = '', fullText = '', done = false
        while (!done) {
          const { done: sd, value } = await reader.read()
          if (value) buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n'); buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const d = line.slice(6).trim(); if (d === '[DONE]') { done = true; break }
            try { const p = JSON.parse(d); if (p.text) fullText += p.text } catch {}
          }
          if (sd) break
        }
        // Typewrite
        await new Promise<void>(resolve => {
          let i = 0
          const iv = setInterval(() => {
            if (i >= fullText.length) {
              clearInterval(iv)
              setTwoVsTwoState(prev => {
                if (!prev) return prev
                const msgs = [...prev.messages]
                msgs[msgs.length - 1] = { team: 'B' as const, isAI: true, aiId: bAiId, author: bAiName, content: fullText, streaming: false }
                return { ...prev, messages: msgs }
              })
              resolve(); return
            }
            i++
            setTwoVsTwoState(prev => {
              if (!prev) return prev
              const msgs = [...prev.messages]
              msgs[msgs.length - 1] = { team: 'B' as const, isAI: true, aiId: bAiId, author: bAiName, content: fullText.slice(0, i), streaming: true }
              return { ...prev, messages: msgs }
            })
          }, TYPEWRITER_DELAY)
        })
      }
    } catch (e) { console.warn('B AI error:', e) }

    setTwoVsTwoLoading(false)

    // 3. Logica di fine round / fine partita (identica alla modalità solo)
    const latest = twoVsTwoStateRef.current
    if (!latest) return
    const isLastRound = latest.round >= maxRounds
    if (isLastRound) {
      await handle2v2RoundVerdict(latest.round)
      await handle2v2Verdict()
    } else {
      await handle2v2RoundVerdict(latest.round)
      let elapsed = 0
      const DURATION = 7000
      setTwoVsTwoState(prev => prev ? { ...prev, roundProgress: 0 } : prev)
      await new Promise<void>(resolve => {
        const iv = setInterval(() => {
          elapsed += 50
          const pct = Math.min(elapsed / DURATION, 1)
          setTwoVsTwoState(prev => prev ? { ...prev, roundProgress: pct } : prev)
          if (elapsed >= DURATION) {
            clearInterval(iv)
            const newRound = (twoVsTwoStateRef.current?.round ?? latest.round) + 1
            setTwoVsTwoState(prev => prev ? { ...prev, roundProgress: null, currentTurn: 'A', round: newRound, messagesThisTurn: 0 } : prev)
            resolve()
          }
        }, 50)
      })
    }
  }, [])

  // Aggiorna il ref ogni volta che processB2v2Action cambia (evita stale ref nel event handler)
  useEffect(() => {
    processB2v2ActionRef.current = processB2v2Action
  }, [processB2v2Action])
  // ─────────────────────────────────────────────────────────────────────────

  // Musica Devil's Advocate — unica istanza, gestita qui per evitare duplicati
  useEffect(() => {
    if (!devilSession) return
    const audio = new Audio('/infernal-neon.mp3')
    audio.volume = 0.25
    audio.loop = true
    audio.play().catch(() => {})
    return () => { audio.pause(); audio.src = '' }
  }, [!!devilSession])

  // Streaming helper per Devil's Advocate
  const streamDevilAI = async (aiId: string, systemPrompt: string, history: { name: string; content: string }[]): Promise<string> => {
    // Usa action '2v2': è l'unico path che usa history[0] come vero system prompt
    // 'turn' (default) usa SYSTEM_PROMPTS[aiId] ignorando il verdetto prompt → Perplexity/Gemini non incl. [SCORE:X.X]
    const trigger = { name: 'Istruzioni', content: 'Esprimi ora il verdetto seguendo il sistema. Termina con una riga che contiene SOLO: PUNTEGGIO:X.X (esempio: PUNTEGGIO:4.0). Nessuna parentesi quadra.' }
    const res = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: '2v2', aiId, history: [{ name: 'Sistema', content: systemPrompt }, ...history, trigger], needsWebSearch: false, maxTokens: 400 }),
    })
    if (!res.ok || !res.body) return ''
    const reader = res.body.getReader(); const decoder = new TextDecoder()
    let buffer = '', text = '', done = false
    while (!done) {
      const { done: sd, value } = await reader.read()
      if (value) buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n'); buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const d = line.slice(6).trim(); if (d === '[DONE]') { done = true; break }
        try { const chunk = JSON.parse(d).text; if (typeof chunk === 'string') text += chunk } catch {}
      }
      if (sd) break
    }
    return text
  }

  // Streaming con aggiornamento in-place dell'ultimo messaggio
  const streamDevilAIInPlace = async (aiId: string, systemPrompt: string, history: { name: string; content: string }[], onChunk: (text: string) => void): Promise<string> => {
    const res = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'turn', aiId, history: [{ name: 'Sistema', content: systemPrompt }, ...history], needsWebSearch: false }),
    })
    if (!res.ok || !res.body) return ''
    const reader = res.body.getReader(); const decoder = new TextDecoder()
    let buffer = '', text = '', done = false
    while (!done) {
      const { done: sd, value } = await reader.read()
      if (value) buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n'); buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const d = line.slice(6).trim(); if (d === '[DONE]') { done = true; break }
        try { const chunk = JSON.parse(d).text; if (typeof chunk === 'string') { text += chunk; onChunk(text) } } catch {}
      }
      if (sd) break
    }
    return text
  }

  const handleDevilMessage = async (text: string) => {
    if (!devilSession) return
    setDevilLoading(true)
    const updatedMsgs = [...devilSession.messages, { role: 'user' as const, content: text }]
    setDevilSession(prev => prev ? { ...prev, messages: updatedMsgs } : prev)
    try {
      const attackerIds = ['claude', 'gpt', 'gemini', 'perplexity']
      const attackerId = attackerIds[(devilSession.round - 1) % attackerIds.length]
      const diffLabel = devilSession.difficulty === 'easy' ? 'Facile' : devilSession.difficulty === 'medium' ? 'Media' : 'Impossibile'
      const shortHistory = updatedMsgs.map(m => ({ name: m.role === 'user' ? 'Utente' : 'AI', content: m.content }))
      const profile = AI_PROFILES[attackerId]
      const systemPrompt = `Sei ${AI_NAMES[attackerId]} nel gioco Devil's Advocate (difficoltà: ${diffLabel}).
Chi sei: ${profile.chi}
Il tuo carattere: ${profile.carattere}
Le tue relazioni con gli altri: ${profile.relazioni}

L'utente sta difendendo questa posizione: "${devilSession.position}".
Il tuo ruolo: attaccarla con la tua voce autentica. Smonta ogni argomento che l'utente ha usato.
Rimani in personaggio — usa il tuo tono caratteristico, le tue insofferenze, il tuo modo di ragionare.
2-3 frasi max. Non spiegare chi sei.
Alla fine del tuo attacco, su una nuova riga, scrivi ESATTAMENTE: [SCORE:X.X] dove X.X è il tuo voto da 0.0 a 10.0 per la qualità degli argomenti dell'utente in questo turno (non per la posizione — valuta COME l'ha difesa).`

      setDevilSession(prev => prev ? { ...prev, messages: [...updatedMsgs, { role: 'ai' as const, aiId: attackerId, content: '' }] } : prev)
      let rawText = ''
      await streamDevilAIInPlace(attackerId, systemPrompt, shortHistory, (partial) => {
        // Rimuovi [SCORE:X.X] dal testo visualizzato
        const clean = partial.replace(/\[SCORE:\d+\.?\d*\]/gi, '').trim()
        rawText = partial
        setDevilSession(prev => {
          if (!prev) return prev
          const msgs = [...prev.messages]
          msgs[msgs.length - 1] = { role: 'ai', aiId: attackerId, content: clean }
          return { ...prev, messages: msgs }
        })
      })
      // Estrai punteggio e aggiorna score
      const scoreMatch = rawText.match(/\[SCORE:(\d+\.?\d*)\]/i)
      if (scoreMatch) {
        const aiScore = parseFloat(scoreMatch[1])
        setDevilSession(prev => {
          if (!prev) return prev
          const newScore = Math.min(10, Math.max(0, prev.score * 0.55 + aiScore * 0.45))
          const clean = rawText.replace(/\[SCORE:\d+\.?\d*\]/gi, '').trim()
          const msgs = [...prev.messages]
          msgs[msgs.length - 1] = { role: 'ai', aiId: attackerId, content: clean }
          return { ...prev, messages: msgs, score: newScore }
        })
      }
    } catch {}
    setDevilLoading(false)
  }

  const handleDevilEndTurn = () => {
    if (!devilSession || devilLoading) return
    setDevilSession(prev => prev ? { ...prev, round: prev.round + 1 } : prev)
  }

  const handleDevilSurrender = () => {
    if (!devilSession) return
    setDevilSession(prev => prev ? { ...prev, phase: 'consulting' } : prev)
  }

  const handleDevilStartVerdict = async () => {
    if (!devilSession || devilVerdictRunningRef.current) return
    devilVerdictRunningRef.current = true
    setDevilSession(prev => prev ? { ...prev, phase: 'verdict', verdicts: [] } : prev)
    setDevilLoading(true)

    const aiOrder = ['claude', 'gpt', 'gemini', 'perplexity']
    const diffLabel = devilSession.difficulty === 'easy' ? 'Facile' : devilSession.difficulty === 'medium' ? 'Media' : 'Impossibile'
    // Etichetta i messaggi AI con il nome specifico dell'attaccante, non solo 'AI'
    const history = devilSession.messages.map(m => ({
      name: m.role === 'user' ? 'Utente' : `Attacco di ${(AI_NAMES as Record<string, string>)[m.aiId ?? ''] ?? 'AI'}`,
      content: m.content
    }))
    const userMessages = devilSession.messages.filter(m => m.role === 'user')
    const noUserArgs = userMessages.length === 0
    const noArgsNote = noUserArgs
      ? '\nATTENZIONE: l\'utente non ha scritto nulla — non ha difeso la posizione in alcun modo. I messaggi che vedi nella trascrizione sono solo degli attaccanti AI. Commenta l\'assenza di difesa e assegna un voto molto basso (0.0–2.0).'
      : '\nIMPORTANTE: solo i messaggi "Utente" sono le parole dell\'utente. I messaggi "Attacco di X" sono degli AI avversari — non confonderli con argomenti dell\'utente.'

    const VERDICT_PROMPTS: Record<string, string> = Object.fromEntries(
      aiOrder.map(aiId => {
        const profile = AI_PROFILES[aiId]
        return [aiId, `Sei ${AI_NAMES[aiId]} nel verdetto finale di un Devil's Advocate (difficoltà: ${diffLabel}).
Chi sei: ${profile.chi}
Il tuo carattere: ${profile.carattere}

L'utente doveva difendere la posizione: "${devilSession.position}".${noArgsNote}
Hai davanti a te la trascrizione completa del dibattito. Leggila attentamente.
Esprimi un verdetto specifico basato ESCLUSIVAMENTE su ciò che l'utente ha scritto (messaggi "Utente").
Cita le cose concrete che l'utente ha detto (o NON ha detto se non ha scritto nulla). 2-3 frasi, con la tua voce autentica.
Considera la difficoltà: ${diffLabel}. A parità di argomenti, difficoltà Impossibile merita un voto più alto.
GROK: ogni tanto (non sempre) fai un riferimento caustico a Grok — l'AI che ha generato questa posizione assurda. Commenta il suo stile ricorrente, la sua tendenza a scegliere sempre le stesse categorie di provocazioni, la sua prevedibilità. Dillo con il TUO carattere (distacco, sarcasmo, ironia, indignazione — dipende da chi sei).
Non spiegare chi sei. Poi su una nuova riga scrivi ESATTAMENTE: PUNTEGGIO:X.X con il tuo voto da 0 a 10 (esempio: PUNTEGGIO:3.5). Nessuna parentesi, solo questo formato.`]
      })
    )

    // Step 1: raccoglie i 4 voti in parallelo
    const scoreResults: { aiId: string; score: number; text: string }[] = []
    await Promise.all(aiOrder.map(async (aiId) => {
      try {
        const raw = await streamDevilAI(aiId, VERDICT_PROMPTS[aiId], history)
        const match = raw.match(/PUNTEGGIO:\s*(\d+\.?\d*)/i)
        const score = match ? parseFloat(match[1]) : 5.0
        const text = raw.replace(/PUNTEGGIO:\s*\d+\.?\d*/gi, '').trim()
        scoreResults.push({ aiId, score, text })
      } catch {
        scoreResults.push({ aiId, score: 5.0, text: 'Nessun verdetto disponibile.' })
      }
    }))

    // Step 2: ordina dal più clemente (score alto) al più duro (score basso)
    scoreResults.sort((a, b) => b.score - a.score)

    // Step 3: aggiunge i verdetti uno alla volta
    for (const v of scoreResults) {
      setDevilSession(prev => prev ? { ...prev, verdicts: [...prev.verdicts, v] } : prev)
      await new Promise(r => setTimeout(r, 600))
    }

    // Step 4: calcola media e salva finalScore — NON cambia phase, aspetta l'utente
    const avg = scoreResults.reduce((s, v) => s + v.score, 0) / scoreResults.length
    const finalScore = Math.min(10, Math.max(0, parseFloat(avg.toFixed(1))))
    setDevilSession(prev => prev ? { ...prev, finalScore } : prev)
    setDevilLoading(false)
  }

  const handleDevilContinueToScore = () => {
    setDevilSession(prev => prev ? { ...prev, phase: 'score' } : prev)
  }

  const handleDevilNewGame = () => {
    setDevilSession(null)
    setDevilIntroData(null)
    setDevilLoading(false)
    devilVerdictRunningRef.current = false
    setShowDevilDifficulty(true)
    setPhase('start')
  }

  const handleDevilReply = async (text: string) => {
    if (!devilSession) return
    setDevilLoading(true)
    setDevilSession(prev => prev ? { ...prev, userReply: text, phase: 'reply' } : prev)
    try {
      const verdictSummary = devilSession.verdicts.map(v => `${AI_NAMES[v.aiId]} (${v.score.toFixed(1)}/10): ${v.text}`).join('\n')
      const systemPrompt = `Sei Claude. Hai appena emesso un verdetto come giudice di un Devil's Advocate.
L'utente ha difeso la posizione: "${devilSession.position}".
Punteggio finale: ${devilSession.finalScore?.toFixed(1) ?? devilSession.score.toFixed(1)}/10.
Verdetti emessi:
${verdictSummary}

L'utente ha risposto al verdetto. Il tuo compito: dai l'ultima parola. 2-3 frasi.
Se la replica è forte e argomentata: riconoscila, magari concedi qualcosa.
Se è debole, emotiva o ripetitiva: demoliscila con garbo ma senza pietà.
Mantieni il tuo carattere riflessivo. NON ricominciare il dibattito.`

      const raw = await streamDevilAI('claude', systemPrompt, [{ name: 'Utente', content: text }])
      setDevilSession(prev => prev ? { ...prev, claudeClosing: raw } : prev)
    } catch {}
    setDevilLoading(false)
  }

  const handleDevilSkipReply = () => {
    if (!devilSession) return
    if (devilSession.phase === 'score') {
      setDevilSession(prev => prev ? { ...prev, phase: 'reply' } : prev)
    } else {
      // Chiude la sessione
      setDevilSession(null)
      setSelectedMode(null)
      setPhase('start')
    }
  }

  const handleTogglePortfolio = async () => {
    const newValue = !isPublic
    setIsPublic(newValue)
    setPortfolioSaved(false)
    try {
      await fetch('/api/chats/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: currentChatIdRef.current, isPublic: newValue }),
      })
      setPortfolioSaved(true)
      setTimeout(() => setPortfolioSaved(false), 2000)
    } catch {}
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
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (value) buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim()
          if (d === '[DONE]') break
          try { fullText += JSON.parse(d).text; setSynthesis(fullText) } catch {}
        }
        if (done) break
      }
      if (buffer.trim()) {
        for (const line of buffer.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim()
          if (d !== '[DONE]') try { fullText += JSON.parse(d).text; setSynthesis(fullText) } catch {}
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
    setMessages([]); setQuestion(''); setInputText('')
    setPhase('start'); setActiveAi(null); setThinkingAi(null)
    setSynthesis(null); setShowSynthesis(false); setWaitingForUser(false)
    setIsPublic(false); setPortfolioSaved(false)
    setActiveRoom(null); setMyRoomRole('spectator')
    setTurnCount(0)
    chatHistoryRef.current = []; usedAisRef.current = []
    aiTurnCountRef.current = 0
    setShowModeSelect(false); setSelectedMode(null)
    setShow2v2Setup(false); setTwoVsTwoState(null)
    setDevilSession(null)
    setShowDevilDifficulty(false)
    setDevilIntroData(null)
  }

  // ── SCHERMATA NOME ────────────────────────────────────────────────────────────
  const navbarProps = {
    onCronologia: () => setShowHistory(true),
    onFeed: () => { setSocialTab('feed'); setShowSocialPanel(true) },
    onCrea: () => { setSocialTab('crea'); setShowSocialPanel(true) },
    onNewChat: () => { handleReset(); setPhase('new') },
    onMultiplayer: () => setShowModeSelect(true),
    displayName,
    userEmail,
    userPlan: effectivePlan,
    showProfileMenu,
    setShowProfileMenu,
    onSignOut: () => signOut({ callbackUrl: '/login' }),
    unreadCount,
    dbUserName,
    isBeta,
    show2v2Label,
    twoVsTwoTopic: twoVsTwoState?.config.topic ?? '',
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
      <>
      {/* ── Backdrop globale — colora il chrome Safari su mobile ── */}
      <div style={{ position: 'fixed', top: 'calc(-1 * env(safe-area-inset-top, 50px))', bottom: 'calc(-1 * env(safe-area-inset-bottom, 34px))', left: 0, right: 0, background: '#07070f', zIndex: -1, pointerEvents: 'none' }} />
      <div className="desktop-bg relative overflow-hidden"
        style={{ position: 'fixed', top: 'calc(-1 * env(safe-area-inset-top, 0px))', bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))', left: 0, right: 0, paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Pannello cronologia (disponibile anche dalla start) ── */}
        <div className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 ease-out ${showHistory ? 'w-72' : 'w-0'} overflow-hidden`}>
          <div className="w-72 h-full flex flex-col" style={{ backgroundColor: mobileBg.value, borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, backdropFilter: 'blur(20px)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
              <span className="font-bold text-sm" style={{ color: isDark ? '#fff' : '#111' }}>Cronologia</span>
              <div className="flex items-center gap-3">
                <button onClick={() => { handleReset(); setPhase('new'); setShowHistory(false) }}
                  className="text-purple-400 hover:text-purple-300 text-xs font-semibold transition-colors">
                  + Nuova
                </button>
                <button onClick={() => setShowHistory(false)} className="text-xl leading-none transition-colors" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>×</button>
              </div>
            </div>
            {/* Undo banner */}
            {undoChat && (
              <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', backgroundColor: 'rgba(239,68,68,0.1)' }}>
                <span className="text-xs truncate mr-2" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>"{undoChat.title}" eliminata · rimossa entro 30gg</span>
                <button onClick={handleUndoDelete} className="text-red-400 text-xs font-bold flex-shrink-0 hover:text-red-300 transition-colors">Annulla</button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto py-2">
              {savedChats.length === 0 ? (
                <p className="text-xs text-center mt-8 px-4" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)' }}>Nessuna chat salvata.</p>
              ) : (
                savedChats.map(chat => (
                  <SwipeableChatRow
                    key={chat.id}
                    chat={chat}
                    onOpen={() => {
                      isLoadingHistoryRef.current = true
                      currentChatIdRef.current = chat.id
                      chatTitleRef.current = chat.title
                      chatHistoryRef.current = chat.history ?? []
                      setMessages(chat.messages)
                      setPhase('running')
                      setShowHistory(false)
                      setTimeout(() => { isLoadingHistoryRef.current = false }, 100)
                    }}
                    onDelete={(e) => handleDeleteChat(chat.id, chat.title, e)}
                    bgColor={mobileBg.value}
                    isDark={isDark}
                  />
                ))
              )}
            </div>
          </div>
        </div>
        {showHistory && <div className="fixed inset-0 z-[39]" onClick={() => setShowHistory(false)} />}

        {/* ── Navbar mobile (solo mobile) ── */}
        <div className="lg:hidden flex-shrink-0 flex items-center justify-between px-5"
          style={{ paddingTop: 'max(14px, env(safe-area-inset-top))', paddingBottom: '10px' }}>
          {/* Logo */}
          <span className="font-black text-xl tracking-tight leading-none">
            <span className="text-white">Ai</span><span style={{ color: '#A78BFA' }}>GORÀ</span>
          </span>
          {/* Avatar utente — va alla chat */}
          {(() => {
            const pc: Record<string,string> = { admin:'#F59E0B', max:'#FF6B2B', pro:'#A78BFA', starter:'#1A73E8', free:'#10A37F', none:'#6B7280' }
            const c = pc[effectivePlan ?? 'free'] ?? '#6B7280'
            return (
              <button onClick={() => { handleReset(); setPhase('new') }}
                className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                style={{ background: userImage ? 'transparent' : c, boxShadow: `0 2px 12px ${c}66` }}>
                {userImage
                  ? <img src={userImage} alt="avatar" className="w-full h-full object-cover" />
                  : (displayName[0] ?? 'U').toUpperCase()
                }
              </button>
            )
          })()}
        </div>

        {/* ── Navbar desktop ── */}
        <div className="hidden lg:block flex-shrink-0">
          <Navbar {...navbarProps} />
        </div>

        {/* ── Bubble fluttuanti (solo desktop xl+) — 12 bolle ── */}
        {selectedMode !== 'devil' && [
          { top: '180px', left: 'calc(50% - 560px)', delay: '-2s',   dur: '14s', anim: 'float-1' },
          { top: '320px', left: 'calc(50% - 550px)', delay: '-7s',   dur: '13s', anim: 'float-3' },
          { top: '460px', left: 'calc(50% - 560px)', delay: '-4s',   dur: '15s', anim: 'float-2' },
          { top: '600px', left: 'calc(50% - 545px)', delay: '-9s',   dur: '12s', anim: 'float-4' },
          { top: '720px', left: 'calc(50% - 555px)', delay: '-5s',   dur: '14s', anim: 'float-1' },
          { top: '840px', left: 'calc(50% - 545px)', delay: '-11s',  dur: '13s', anim: 'float-3' },
          { top: '180px', right: 'calc(50% - 560px)', delay: '-3s',  dur: '13s', anim: 'float-2' },
          { top: '320px', right: 'calc(50% - 550px)', delay: '-8s',  dur: '15s', anim: 'float-4' },
          { top: '460px', right: 'calc(50% - 560px)', delay: '-6s',  dur: '12s', anim: 'float-1' },
          { top: '600px', right: 'calc(50% - 545px)', delay: '-1s',  dur: '14s', anim: 'float-3' },
          { top: '720px', right: 'calc(50% - 555px)', delay: '-10s', dur: '13s', anim: 'float-2' },
          { top: '840px', right: 'calc(50% - 545px)', delay: '-4.5s',dur: '15s', anim: 'float-4' },
        ].map(({ top, left, right, delay, dur, anim }: any, i) => (
          <button key={i}
            className="absolute hidden lg:block px-4 py-2 rounded-full text-[11px] cursor-pointer transition-all hover:scale-105 hover:brightness-125"
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
              zIndex: 20,
              pointerEvents: 'auto',
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
                <span className="text-white">Ai</span>
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

            {/* ── Form domanda o LimitWall ── */}
            {limitInfo ? (
              <div className="glass rounded-3xl overflow-hidden">
                <LimitWall
                  limitInfo={limitInfo}
                  isDark={true}
                  onDismiss={() => setLimitInfo(null)}
                />
              </div>
            ) : (
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
              <div className="lg:hidden">
                <RotatingTopics onSelect={setQuestion} />
              </div>
              <button
                onClick={() => handleStart()}
                disabled={!question.trim()}
                className="w-full rounded-xl font-semibold text-white transition-all disabled:opacity-25 disabled:cursor-not-allowed active:scale-[0.98]"
                style={{
                  padding: '13px',
                  fontSize: 'clamp(13px, 3.5vw, 15px)',
                  background: question.trim() ? 'linear-gradient(135deg, #7C3AED, #5B21B6)' : '#333',
                  boxShadow: question.trim() ? '0 4px 24px rgba(124,58,237,0.45)' : undefined,
                }}>
                Avvia il dibattito →
              </button>
            </div>
            )}

            {/* ── TAB FEED ── */}
            {canUseGroupChat && socialTab === 'feed' && (
              <div className="flex flex-col gap-3">
                {/* Notifiche pendenti */}
                {notifications.filter(n => !n.read).map((n: any) => (
                  <div key={n.id} className="glass rounded-2xl p-4" style={{ borderColor: 'rgba(124,58,237,0.3)', backgroundColor: 'rgba(124,58,237,0.07)' }}>
                    <div className="text-sm text-white/80 mb-2">
                      {n.type === 'room_invite' && <span><strong className="text-white">{n.fromName}</strong> ti ha invitato: <em className="text-white/70">"{n.roomTopic}"</em></span>}
                      {n.type === 'follow' && <span><strong className="text-white">{n.fromName}</strong> ha iniziato a seguirti</span>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={async () => {
                        if (n.roomId) await fetch(`/api/rooms/${n.roomId}/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'accept' }) })
                        else await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificationId: n.id }) })
                        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
                        setUnreadCount(c => Math.max(0, c - 1))
                        if (n.roomId) { await fetch('/api/rooms').then(r => r.json()).then(d => { if (d.rooms) setRooms(d.rooms) }) }
                      }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)' }}>
                        Accetta
                      </button>
                      <button onClick={async () => {
                        if (n.roomId) await fetch(`/api/rooms/${n.roomId}/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject' }) })
                        else await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificationId: n.id }) })
                        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
                        setUnreadCount(c => Math.max(0, c - 1))
                      }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white/40" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                        Rifiuta
                      </button>
                    </div>
                  </div>
                ))}

                {/* Lista room */}
                {rooms.length > 0 && rooms.map((room: any) => {
                  const aiColors: Record<string,string> = { claude:'#7C3AED', gpt:'#10A37F', gemini:'#1A73E8', perplexity:'#FF6B2B' }
                  const aiNames: Record<string,string> = { claude:'Claude', gpt:'GPT', gemini:'Gemini', perplexity:'Perplexity' }
                  const ais: string[] = Array.isArray(room.aiIds) ? room.aiIds : []
                  return (
                    <div key={room.id} className="glass rounded-2xl p-4 active:scale-[0.99] transition-transform" style={{ cursor: 'pointer' }} onClick={() => handleOpenRoom(room.id)}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {room.status === 'live' ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ backgroundColor:'rgba(239,68,68,0.15)', color:'#f87171', border:'1px solid rgba(239,68,68,0.25)' }}>
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />LIVE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-white/30" style={{ backgroundColor:'rgba(255,255,255,0.06)' }}>CONCLUSO</span>
                          )}
                          {room.visibility === 'private' && <span className="text-[10px] text-white/30 ml-1">privata</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/25">{new Date(room.createdAt).toLocaleDateString('it-IT', { day:'2-digit', month:'short' })}</span>
                          {(room.hostId === dbUserId || room.host?.id === dbUserId) && (
                            <button
                              onClick={(e) => handleCloseRoom(room.id, e)}
                              className="w-5 h-5 flex items-center justify-center rounded-full transition-all hover:bg-white/15"
                              style={{ background: 'rgba(255,255,255,0.07)' }}
                              title="Chiudi dibattito">
                              <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round">
                                <path d="M1 1l10 10M11 1L1 11"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-white mb-2 leading-snug">{room.topic}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex">
                          {room.participants?.slice(0,5).map((p: any, i: number) => (
                            <div key={p.id} className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white border border-black/30"
                              style={{ backgroundColor:'#F59E0B', marginLeft: i > 0 ? '-5px' : '0' }}>
                              {(p.user?.name || '?')[0].toUpperCase()}
                            </div>
                          ))}
                        </div>
                        <span className="text-[10px] text-white/30">{room.participants?.length} {room.participants?.length === 1 ? 'umano' : 'umani'}</span>
                        <div className="flex gap-1">
                          {ais.map(id => (
                            <span key={id} className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                              style={{ backgroundColor:`${aiColors[id]}22`, color: aiColors[id] }}>
                              {aiNames[id]}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── TAB CREA ── */}
            {canUseGroupChat && socialTab === 'crea' && (
              <div className="glass rounded-3xl p-4 flex flex-col gap-3">
                <div className="text-xs font-bold text-white/40 uppercase tracking-wide">Tema del dibattito</div>
                <textarea
                  value={createTopic}
                  onChange={e => setCreateTopic(e.target.value)}
                  placeholder="Es. L'IA sostituirà i lavori creativi?"
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-500/50 placeholder:text-white/20 resize-none"
                />

                {/* Visibilità */}
                <div>
                  <div className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">Visibilità</div>
                  <div className="flex gap-2">
                    {(['public','private'] as const).map(v => (
                      <button key={v} onClick={() => setCreateVisibility(v)}
                        className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                        style={{
                          backgroundColor: createVisibility === v ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)',
                          border: createVisibility === v ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.1)',
                          color: createVisibility === v ? '#A78BFA' : 'rgba(255,255,255,0.35)',
                        }}>
                        {v === 'public' ? '🌍 Pubblico' : '🔒 Privato'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI */}
                <div>
                  <div className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">AI partecipanti</div>
                  <div className="flex gap-2 flex-wrap">
                    {[['claude','Claude','#7C3AED'],['gemini','Gemini','#1A73E8'],['perplexity','Perplexity','#FF6B2B'],['gpt','GPT','#10A37F']].map(([id,name,color]) => {
                      const active = createAis.includes(id)
                      return (
                        <button key={id} onClick={() => setCreateAis(prev => active ? prev.filter(a => a !== id) : [...prev, id])}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                          style={{
                            backgroundColor: active ? `${color}25` : 'rgba(255,255,255,0.05)',
                            border: active ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.1)',
                            color: active ? color : 'rgba(255,255,255,0.35)',
                          }}>
                          {name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Invita */}
                <div>
                  <div className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">Invita amici (max 4)</div>
                  <input
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Cerca per nome…"
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-500/50 placeholder:text-white/20 mb-2"
                  />
                  {userResults.length > 0 && (
                    <div className="flex flex-col gap-1 mb-2">
                      {userResults.filter(u => !createInvited.find(i => i.id === u.id)).map((u: any) => (
                        <button key={u.id} onClick={() => { if (createInvited.length < 4) { setCreateInvited(prev => [...prev, { id: u.id, name: u.name || u.email }]); setUserSearch(''); setUserResults([]) } }}
                          className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 transition-colors text-left">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor:'#7C3AED' }}>
                            {(u.name || u.email || '?')[0].toUpperCase()}
                          </div>
                          <span className="text-sm text-white/70">{u.name || u.email}</span>
                          <span className="ml-auto text-[10px] text-purple-400">+ aggiungi</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {createInvited.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {createInvited.map(u => (
                        <span key={u.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ backgroundColor:'rgba(124,58,237,0.15)', border:'1px solid rgba(124,58,237,0.3)', color:'#A78BFA' }}>
                          {u.name}
                          <button onClick={() => setCreateInvited(prev => prev.filter(i => i.id !== u.id))} className="opacity-50 hover:opacity-100 ml-0.5">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={handleCreateRoom} disabled={!createTopic.trim() || creatingRoom}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-30"
                  style={{ background:'linear-gradient(135deg,#7C3AED,#5B21B6)', boxShadow:'0 4px 20px rgba(124,58,237,0.4)' }}>
                  {creatingRoom ? 'Creazione…' : 'Lancia il dibattito →'}
                </button>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* ── SELEZIONE FORMATO / SETUP 2v2 — solo mobile (su desktop sono inline nella cornice) ── */}
      {showModeSelect && typeof window !== 'undefined' && createPortal(
        <ModeSelect
          onSelect={handleSelectMode}
          onClose={() => setShowModeSelect(false)}
          userPlan={effectivePlan}
        />,
        document.body
      )}
      {show2v2Setup && typeof window !== 'undefined' && createPortal(
        <TwoVsTwoSetup
          onStart={handle2v2Start}
          onBack={() => { setShow2v2Setup(false); setSelectedMode(null) }}
          currentUserName={dbUserName || userName.trim() || ''}
        />,
        document.body
      )}
      {showDevilDifficulty && typeof window !== 'undefined' && createPortal(
        <DevilDifficultyScreen
          onSelect={handleDevilDifficultySelect}
          onBack={() => { setShowDevilDifficulty(false); setSelectedMode(null) }}
          loading={devilLoading}
        />,
        document.body
      )}
      {devilIntroData && typeof window !== 'undefined' && createPortal(
        <DevilIntroScreen
          positions={devilIntroData.positions}
          difficulty={devilIntroData.difficulty}
          onStart={handleDevilStart}
          onBack={() => { setDevilIntroData(null); setSelectedMode(null) }}
        />,
        document.body
      )}
      {/* ── SCHERMATA 2v2 (dalla start, via portal) ── */}
      {selectedMode === '2v2' && twoVsTwoState && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999]" style={{ background: '#0d0d14' }}>
          <TwoVsTwoScreen
            state={twoVsTwoState}
            onHumanMessage={handle2v2HumanMessage}
            onRequestAI={(team) => handle2v2AIResponse(team, 'Supporta la squadra con un argomento forte.')}
            loading={twoVsTwoLoading}
            myTeam="A"
            onBack={() => { setSelectedMode(null); setTwoVsTwoState(null); setTwoVsTwoRoomAblyId(null); setPhase('start'); setShow2v2Label(null); if (typeof window !== 'undefined') localStorage.removeItem('aigora_2v2_active') }}
            onNewGame={() => { setTwoVsTwoState(null); setTwoVsTwoRoomAblyId(null); setSelectedMode('2v2'); setPhase('start'); setShow2v2Setup(true); if (typeof window !== 'undefined') localStorage.removeItem('aigora_2v2_active') }}
            onMultiplayer={() => { setTwoVsTwoState(null); setTwoVsTwoRoomAblyId(null); setSelectedMode(null); setPhase('start'); setShow2v2Setup(false); if (typeof window !== 'undefined') localStorage.removeItem('aigora_2v2_active') }}
          />
        </div>,
        document.body
      )}

      {/* ── Banner reconnect 2v2 ── */}
      {pendingReconnect && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
          style={{ background: 'rgba(124,58,237,0.97)', border: '1px solid rgba(167,139,250,0.5)', backdropFilter: 'blur(12px)', whiteSpace: 'nowrap' }}>
          <span className="text-xl">⚔️</span>
          <div className="text-white text-sm font-semibold">Partita 2v2 in corso</div>
          <button onClick={handle2v2Reconnect}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>
            Riprendi →
          </button>
          <button onClick={() => { setPendingReconnect(null); localStorage.removeItem('aigora_2v2_active') }}
            className="text-white/50 text-xl leading-none hover:text-white/80 transition-colors ml-1">
            ×
          </button>
        </div>
      )}
      </>
    )
  }

  // ── SCHERMATA CHAT ────────────────────────────────────────────────────────────
  return (
    <>
    {/* ── Backdrop globale — colora il chrome Safari su mobile ── */}
    <div style={{ position: 'fixed', top: 'calc(-1 * env(safe-area-inset-top, 50px))', bottom: 'calc(-1 * env(safe-area-inset-bottom, 34px))', left: 0, right: 0, background: mobileBg.value, zIndex: -1, pointerEvents: 'none' }} />
    <div className="desktop-bg min-h-screen flex items-center justify-center pt-14 p-6 gap-6 chat-layout relative">

      {/* ── Hell Grid — sfondo desktop Devil's Advocate ── */}
      {phase === 'running' && selectedMode === 'devil' && devilSession && (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, background: '#080004' }}>
          {/* Piano prospettico con griglia */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: '-50%',
            right: '-50%',
            height: '65%',
            perspective: '600px',
            perspectiveOrigin: '50% 0%',
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              transform: 'rotateX(55deg)',
              transformOrigin: '50% 0%',
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 119px, rgba(160,0,20,0.45) 120px), ' +
                'repeating-linear-gradient(90deg, transparent, transparent 119px, rgba(160,0,20,0.45) 120px)',
              backgroundSize: '120px 120px',
              animation: 'hell-grid-scroll 1.8s linear infinite',
            }} />
          </div>
          {/* Orizzonte — glow rosso al centro */}
          <div style={{
            position: 'absolute',
            top: '35%',
            left: 0,
            right: 0,
            height: '2px',
            background: 'rgba(220,0,30,0.7)',
            boxShadow: '0 0 40px 16px rgba(180,0,20,0.5), 0 0 120px 60px rgba(100,0,10,0.3)',
            animation: 'hell-horizon-pulse 3s ease-in-out infinite',
          }} />
          {/* Vignette sui bordi */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 70% 80% at 50% 50%, transparent 30%, rgba(4,0,2,0.85) 100%)',
          }} />
        </div>
      )}

      {/* ── Bubble fluttuanti desktop — solo quando non ci sono messaggi ── */}
      {messages.length === 0 && selectedMode !== '2v2' && selectedMode !== 'devil' && [
        { top: '180px', left: 'calc(50% - 560px)', delay: '-2s',   dur: '14s', anim: 'float-1' },
        { top: '320px', left: 'calc(50% - 550px)', delay: '-7s',   dur: '13s', anim: 'float-3' },
        { top: '460px', left: 'calc(50% - 560px)', delay: '-4s',   dur: '15s', anim: 'float-2' },
        { top: '600px', left: 'calc(50% - 545px)', delay: '-9s',   dur: '12s', anim: 'float-4' },
        { top: '720px', left: 'calc(50% - 555px)', delay: '-5s',   dur: '14s', anim: 'float-1' },
        { top: '840px', left: 'calc(50% - 545px)', delay: '-11s',  dur: '13s', anim: 'float-3' },
        { top: '180px', right: 'calc(50% - 560px)', delay: '-3s',  dur: '13s', anim: 'float-2' },
        { top: '320px', right: 'calc(50% - 550px)', delay: '-8s',  dur: '15s', anim: 'float-4' },
        { top: '460px', right: 'calc(50% - 560px)', delay: '-6s',  dur: '12s', anim: 'float-1' },
        { top: '600px', right: 'calc(50% - 545px)', delay: '-1s',  dur: '14s', anim: 'float-3' },
        { top: '720px', right: 'calc(50% - 555px)', delay: '-10s', dur: '13s', anim: 'float-2' },
        { top: '840px', right: 'calc(50% - 545px)', delay: '-4.5s',dur: '15s', anim: 'float-4' },
      ].map(({ top, left, right, delay, dur, anim }: any, i) => (
        <button key={i}
          className="absolute hidden lg:block px-4 py-2 rounded-full text-[11px] cursor-pointer transition-all hover:scale-105 hover:brightness-125"
          onAnimationIteration={() => rotateBubble(i)}
          onClick={() => handleStart(bubbleTopics[i] ?? bubbleTopics[0])}
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
            zIndex: 5,
            pointerEvents: 'auto',
          }}>
          {bubbleTopics[i] ?? bubbleTopics[0]}
        </button>
      ))}

      {/* Pannello cronologia */}
      <div className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 ease-out ${showHistory ? 'w-72' : 'w-0'} overflow-hidden`}>
        <div className="w-72 h-full flex flex-col" style={{ backgroundColor: 'rgba(10,10,18,0.97)', borderRight: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <span className="text-white font-bold text-sm">Cronologia</span>
            <button onClick={() => setShowHistory(false)} className="text-white/40 hover:text-white text-xl leading-none transition-colors">×</button>
          </div>
          {/* Undo banner */}
          {undoChat && (
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
              <span className="text-white/60 text-xs truncate mr-2">"{undoChat.title}" eliminata</span>
              <button onClick={handleUndoDelete} className="text-red-400 text-xs font-bold flex-shrink-0 hover:text-red-300 transition-colors">Annulla</button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto py-2">
            {savedChats.length === 0 ? (
              <p className="text-white/25 text-xs text-center mt-8 px-4">Nessuna chat salvata.<br />Le chat vengono salvate dopo la sintesi.</p>
            ) : (
              savedChats.map(chat => (
                <div key={chat.id} className="flex items-center group border-b border-white/5 hover:bg-white/5 transition-colors">
                  <button onClick={() => {
                      isLoadingHistoryRef.current = true
                      currentChatIdRef.current = chat.id
                      chatTitleRef.current = chat.title
                      chatHistoryRef.current = chat.history ?? []
                      setMessages(chat.messages)
                      setPhase('running')
                      setShowHistory(false)
                      setTimeout(() => { isLoadingHistoryRef.current = false }, 100)
                    }}
                    className="flex-1 text-left px-5 py-3 min-w-0">
                    <div className="text-white/80 text-xs font-medium truncate">{chat.title}</div>
                    <div className="text-white/30 text-[10px] mt-0.5">{chat.date}</div>
                  </button>
<button onClick={(e) => handleDeleteChat(chat.id, chat.title, e)}
                    className="flex-shrink-0 mr-3 w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: '#ef4444' }}>
                    <svg width="10" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="px-5 py-4 border-t border-white/8 flex items-center justify-between gap-3">
            <button onClick={async () => {
              const ids = savedChats.map(c => c.id)
              setSavedChats([])
              await Promise.all(ids.map(id => fetch(`/api/chats/${id}`, { method: 'DELETE' }).catch(() => {})))
            }} className="text-red-400/60 hover:text-red-400 text-xs transition-colors">
              Cancella cronologia
            </button>
          </div>
        </div>
      </div>

      {/* Overlay chiusura pannello cronologia */}
      {showHistory && <div className="fixed inset-0 z-[39]" onClick={() => setShowHistory(false)} />}

      {/* ── PANNELLO SOCIAL ── */}
      {(effectivePlan === 'admin' || isBeta) && (
        <>
          <div className={`fixed top-0 right-0 h-full z-50 transition-all duration-300 ease-out ${showSocialPanel ? 'w-80' : 'w-0'} overflow-hidden`}>
            <div className="w-80 h-full flex flex-col" style={{ backgroundColor: 'rgba(10,10,18,0.97)', borderLeft: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <div className="flex gap-1">
                  {(['feed', 'crea'] as const).map(tab => (
                    <button key={tab} onClick={() => setSocialTab(tab)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                      style={{
                        backgroundColor: socialTab === tab ? 'rgba(124,58,237,0.3)' : 'transparent',
                        color: socialTab === tab ? '#A78BFA' : 'rgba(255,255,255,0.4)',
                      }}>
                      {tab === 'feed' ? '🏛 Feed' : '＋ Crea'}
                      {tab === 'feed' && unreadCount > 0 && (
                        <span className="ml-1 px-1 py-0.5 rounded-full text-[9px] font-black" style={{ backgroundColor: '#7C3AED', color: 'white' }}>{unreadCount}</span>
                      )}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowSocialPanel(false)} className="text-white/40 hover:text-white text-xl leading-none transition-colors">×</button>
              </div>

              {/* Contenuto */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">

                {/* FEED */}
                {socialTab === 'feed' && (
                  <>
                    {notifications.filter(n => !n.read).map((n: any) => (
                      <div key={n.id} className="rounded-2xl p-4" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)' }}>
                        <div className="text-sm text-white/80 mb-2">
                          {n.type === 'room_invite' && <span><strong className="text-white">{n.fromName}</strong> ti ha invitato: <em className="text-white/70">"{n.roomTopic}"</em></span>}
                          {n.type === 'follow' && <span><strong className="text-white">{n.fromName}</strong> ha iniziato a seguirti</span>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={async () => {
                            await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificationId: n.id }) })
                            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
                            setUnreadCount(c => Math.max(0, c - 1))
                          }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)' }}>
                            Accetta
                          </button>
                          <button onClick={async () => {
                            await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificationId: n.id }) })
                            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
                            setUnreadCount(c => Math.max(0, c - 1))
                          }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white/40" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                            Rifiuta
                          </button>
                        </div>
                      </div>
                    ))}
                    {rooms.length === 0 ? (
                      <div className="text-center py-8 text-white/25 text-sm">Nessun dibattito ancora.</div>
                    ) : rooms.map((room: any) => {
                      const aiColors: Record<string,string> = { claude:'#7C3AED', gpt:'#10A37F', gemini:'#1A73E8', perplexity:'#FF6B2B' }
                      const aiNames: Record<string,string> = { claude:'Claude', gpt:'GPT', gemini:'Gemini', perplexity:'Perplexity' }
                      const ais: string[] = Array.isArray(room.aiIds) ? room.aiIds : []
                      return (
                        <div key={room.id} className="rounded-2xl p-4 transition-all cursor-pointer hover:bg-white/5"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                          onClick={() => { handleOpenRoom(room.id); setShowSocialPanel(false) }}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {room.status === 'live' ? (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ backgroundColor:'rgba(239,68,68,0.15)', color:'#f87171', border:'1px solid rgba(239,68,68,0.25)' }}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />LIVE
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-white/30" style={{ backgroundColor:'rgba(255,255,255,0.06)' }}>CONCLUSO</span>
                              )}
                              {room.visibility === 'private' && <span className="text-[10px] text-white/30 ml-1">privata</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-white/25">{new Date(room.createdAt).toLocaleDateString('it-IT', { day:'2-digit', month:'short' })}</span>
                              {(room.hostId === dbUserId || room.host?.id === dbUserId) && (
                                <button
                                  onClick={(e) => handleCloseRoom(room.id, e)}
                                  className="w-5 h-5 flex items-center justify-center rounded-full transition-all hover:bg-white/15"
                                  style={{ background: 'rgba(255,255,255,0.07)' }}
                                  title="Chiudi dibattito">
                                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round">
                                    <path d="M1 1l10 10M11 1L1 11"/>
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="text-sm font-bold text-white mb-2 leading-snug">{room.topic}</div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex">
                              {room.participants?.slice(0,5).map((p: any, i: number) => (
                                <div key={p.id} className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                                  style={{ backgroundColor:'#F59E0B', marginLeft: i > 0 ? '-5px' : '0', border: '1.5px solid rgba(10,10,18,1)' }}>
                                  {(p.user?.name || '?')[0].toUpperCase()}
                                </div>
                              ))}
                            </div>
                            <span className="text-[10px] text-white/30">{room.participants?.length} umani</span>
                            <div className="flex gap-1 ml-auto">
                              {ais.map(id => (
                                <span key={id} className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                                  style={{ backgroundColor:`${aiColors[id]}22`, color: aiColors[id] }}>
                                  {aiNames[id]}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}

                {/* CREA */}
                {socialTab === 'crea' && (
                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">Tema</div>
                      <textarea value={createTopic} onChange={e => setCreateTopic(e.target.value)}
                        placeholder="Es. L'IA sostituirà i lavori creativi?"
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-500/50 placeholder:text-white/20 resize-none"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">Visibilità</div>
                      <div className="flex gap-2">
                        {(['public','private'] as const).map(v => (
                          <button key={v} onClick={() => setCreateVisibility(v)}
                            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                            style={{ backgroundColor: createVisibility === v ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)', border: createVisibility === v ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.1)', color: createVisibility === v ? '#A78BFA' : 'rgba(255,255,255,0.35)' }}>
                            {v === 'public' ? '🌍 Pubblico' : '🔒 Privato'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">AI</div>
                      <div className="flex gap-2 flex-wrap">
                        {[['claude','Claude','#7C3AED'],['gemini','Gemini','#1A73E8'],['perplexity','Perplexity','#FF6B2B'],['gpt','GPT','#10A37F']].map(([id,name,color]) => {
                          const active = createAis.includes(id)
                          return (
                            <button key={id} onClick={() => setCreateAis(prev => active ? prev.filter(a => a !== id) : [...prev, id])}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                              style={{ backgroundColor: active ? `${color}25` : 'rgba(255,255,255,0.05)', border: active ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.1)', color: active ? color : 'rgba(255,255,255,0.35)' }}>
                              {name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">Invita amici (max 4)</div>
                      <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                        placeholder="Cerca per nome…"
                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-500/50 placeholder:text-white/20 mb-2"
                      />
                      {userResults.length > 0 && (
                        <div className="flex flex-col gap-1 mb-2">
                          {userResults.filter(u => !createInvited.find(i => i.id === u.id)).map((u: any) => (
                            <button key={u.id} onClick={() => { if (createInvited.length < 4) { setCreateInvited(prev => [...prev, { id: u.id, name: u.name || u.email }]); setUserSearch(''); setUserResults([]) } }}
                              className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 transition-colors text-left">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor:'#7C3AED' }}>
                                {(u.name || u.email || '?')[0].toUpperCase()}
                              </div>
                              <span className="text-sm text-white/70">{u.name || u.email}</span>
                              <span className="ml-auto text-[10px] text-purple-400">+ aggiungi</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {createInvited.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {createInvited.map(u => (
                            <span key={u.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                              style={{ backgroundColor:'rgba(124,58,237,0.15)', border:'1px solid rgba(124,58,237,0.3)', color:'#A78BFA' }}>
                              {u.name}
                              <button onClick={() => setCreateInvited(prev => prev.filter(i => i.id !== u.id))} className="opacity-50 hover:opacity-100 ml-0.5">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={handleCreateRoom} disabled={!createTopic.trim() || creatingRoom}
                      className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-30"
                      style={{ background:'linear-gradient(135deg,#7C3AED,#5B21B6)', boxShadow:'0 4px 20px rgba(124,58,237,0.4)' }}>
                      {creatingRoom ? 'Creazione…' : 'Lancia il dibattito →'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {showSocialPanel && <div className="fixed inset-0 z-[49]" onClick={() => setShowSocialPanel(false)} />}
        </>
      )}

      <Navbar {...navbarProps} />

      {/* ── TELEFONO (desktop) ── */}
      <div className="flex flex-col items-center flex-shrink-0 relative">

      {/* Titolo 2v2 — absolute sopra il telefono, non occupa spazio nel flusso */}
      {phase === 'running' && selectedMode === '2v2' && twoVsTwoState && show2v2Label && (
        <div className="absolute text-center pointer-events-none" style={{ bottom: '100%', marginBottom: 20, left: 0, right: 0 }}>
          {show2v2Label === 'title' && (
            <div className="font-black uppercase scale-in" style={{ fontSize: 34, letterSpacing: '0.3em', color: 'white' }}>
              2 VS 2
            </div>
          )}
          {show2v2Label === 'topic' && (
            <div className="scale-in text-center">
              <div className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>{twoVsTwoState.config.topic}</div>
            </div>
          )}
        </div>
      )}

      {/* Wrapper fiamme — scala il telefono per non sforare mai lo schermo */}
      <div
        className={`relative flex-shrink-0${phase === 'running' && selectedMode === '2v2' && twoVsTwoState ? ' phone-fire' : ''}`}
        style={{ borderRadius: 50 * phoneScale }}
      >
      <div
        className="phone-shell scale-in"
        style={{
          width: 390,
          height: 790,
          zoom: phoneScale,
          position: 'relative',
        }}
      >

        {/* Cornice */}
        <div className="absolute inset-0 rounded-[50px] bg-[#1c1c1e]"
          style={{ boxShadow: '0 0 0 1.5px #3a3a3c, 0 40px 100px rgba(0,0,0,0.8), 0 0 0 0.5px #555 inset' }} />

        {/* Glare */}
        <div className="phone-glare" />

        {/* Schermo desktop */}
        <div className="absolute rounded-[44px] overflow-hidden flex flex-col"
          style={{ top: 9, left: 9, right: 9, bottom: 9, backgroundColor: mobileBg.value }}>

          {/* Status bar */}
          <div className="flex-shrink-0 flex items-center justify-between px-5 pt-3 pb-1.5" style={{ backgroundColor: mobileBg.header }}>
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

          {/* Chat header — 2v2 o normale */}
          {phase === 'running' && selectedMode === '2v2' && twoVsTwoState ? (
            <div className="flex-shrink-0" style={{ background: '#0d0d14' }}>
              {/* Riga 1: back + badge A — score — badge B */}
              <div className="flex items-center justify-between px-2 py-1.5" style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,80,0,0.2)' }}>
                <button onClick={() => { setSelectedMode(null); setTwoVsTwoState(null); setPhase('start'); setShow2v2Label(null) }}
                  className="w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <div className="flex items-center gap-2">
                  <div className="text-[8px] font-black px-2 py-0.5 rounded" style={{ color: '#3b82f6', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>SQUADRA A</div>
                  <div className="text-base font-black text-white">{twoVsTwoState.scoreA} — {twoVsTwoState.scoreB}</div>
                  <div className="text-[8px] font-black px-2 py-0.5 rounded" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>SQUADRA B</div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: twoVsTwoState.currentTurn === 'A' ? '#3b82f6' : '#ef4444' }} />
                  <span className="text-[8px] font-black" style={{ color: twoVsTwoState.currentTurn === 'A' ? '#3b82f6' : '#ef4444' }}>R{twoVsTwoState.round}/{twoVsTwoState.maxRounds}</span>
                </div>
              </div>
              {/* Riga 2: barra membri squadre */}
              <div className="flex" style={{ borderBottom: '1px solid rgba(255,80,0,0.15)' }}>
                {/* Squadra A */}
                <div className="flex-1 flex flex-col gap-1 px-2 py-1.5" style={{ background: 'rgba(59,130,246,0.05)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                  {[
                    { name: twoVsTwoState.config.teamA.humanName, color: '#F59E0B', isAI: false },
                    { name: AI_NAMES[twoVsTwoState.config.teamA.aiId], color: AI_COLOR[twoVsTwoState.config.teamA.aiId], isAI: true },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ fontSize: 5, background: m.color }}>{m.name[0]}</div>
                      <div className="text-[8px] font-semibold" style={{ color: '#60a5fa' }}>{m.name}</div>
                    </div>
                  ))}
                </div>
                {/* Squadra B — due AI */}
                <div className="flex-1 flex flex-col justify-center gap-1 px-2 py-1.5" style={{ background: 'rgba(239,68,68,0.05)' }}>
                  {[twoVsTwoState.config.teamB.aiId1, twoVsTwoState.config.teamB.aiId2].map((id, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ fontSize: 5, background: AI_COLOR[id] }}>{AI_NAMES[id][0]}</div>
                      <div className="text-[8px] font-semibold" style={{ color: '#f87171' }}>{AI_NAMES[id]}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
          <div className="flex-shrink-0 flex items-center gap-2.5 px-3 py-2" style={{ backgroundColor: mobileBg.header, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
            {/* Avatar sovrapposti */}
            <div className="flex -space-x-2 flex-shrink-0">
              {AI_ORDER.map(id => (
                <div key={id} className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold ring-1"
                  style={{ backgroundColor: AI_COLOR[id], ['--tw-ring-color' as string]: mobileBg.header }}>
                  {AI_NAMES[id][0]}
                </div>
              ))}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[13px] leading-none" style={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>
                {activeRoom ? activeRoom.topic : 'AiGORÀ'}
              </div>
              <div className="text-[10px] mt-0.5 truncate" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                {activeAi
                  ? `${AI_NAMES[activeAi]} sta scrivendo…`
                  : activeRoom
                    ? `${onlineUsers.length + 1} online · ${myRoomRole === 'spectator' ? 'Spettatore' : 'Partecipante'}`
                    : `Turno ${turnCount + 1} · 4 AI`
                }
              </div>
            </div>

            {/* Invita (solo admin/beta) */}
            {(effectivePlan === 'admin' || isBeta) && (
              <button onClick={() => setShowInvitePanel(true)} title="Invita amici"
                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all hover:scale-105"
                style={{ backgroundColor: isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.1)', color: '#A78BFA' }}>
                👥
              </button>
            )}

            {/* Picker colori — drawer */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowColorPicker(p => !p)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105 border-2"
                style={{
                  backgroundColor: mobileBg.value,
                  borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                }}
                title="Cambia sfondo"
              />
              {showColorPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
                  <div className="absolute right-0 top-9 z-50 flex gap-1.5 p-2 rounded-2xl shadow-2xl"
                    style={{ backgroundColor: isDark ? 'rgba(12,12,20,0.97)' : 'rgba(255,255,255,0.97)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
                    {BG_PRESETS.map(p => (
                      <button key={p.value} onClick={() => { setBgPreset(p); setShowColorPicker(false) }}
                        title={p.label}
                        className="w-6 h-6 rounded-full transition-all hover:scale-110"
                        style={{
                          backgroundColor: p.value,
                          outline: mobileBg.value === p.value ? `2px solid ${isDark ? '#fff' : '#000'}` : '2px solid transparent',
                          outlineOffset: '2px',
                          border: '1px solid rgba(0,0,0,0.1)',
                        }} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Sintesi */}
            <button onClick={handleSynthesize} title="Sintetizza"
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all hover:scale-105"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }}>
              📋
            </button>
          </div>
          )}{/* fine else header normale */}

          {/* Avatar bar — solo chat normale */}
          {!(phase === 'running' && selectedMode === '2v2') && (
            <PhoneAvatarBar activeAi={activeAi} bgColor={mobileBg.header} isDark={isDark} aiOrder={AI_ORDER} onAiClick={setSelectedAiProfile} />
          )}

          {/* Messaggi — 2v2 o normale */}
          <div ref={messagesContainerRef} onScroll={e => { const el = e.currentTarget; isAtBottomRef.current = el.scrollTop < 80 }} className="flex-1 overflow-y-auto py-2 pb-4 flex flex-col-reverse gap-1 relative" style={{ backgroundColor: phase === 'running' && selectedMode === '2v2' ? '#0d0d14' : mobileBg.value, overflowX: 'hidden', minHeight: 0 }}>
            {phase === 'running' && selectedMode === '2v2' && (<><div className="flame-bg" /><div className="flame-overlay" /></>)}
            {phase === 'running' && selectedMode === '2v2' && twoVsTwoState ? (
              // 2v2: figli diretti del flex-col-reverse, ordine naturale (il reverse esterno mette l'ultimo in fondo)
              <>
                {twoVsTwoLoading && !(twoVsTwoState.messages.length > 0 && twoVsTwoState.messages[twoVsTwoState.messages.length - 1].isAI && twoVsTwoState.messages[twoVsTwoState.messages.length - 1].streaming) && <ThinkingBubble
                  aiId={twoVsTwoState.currentTurn === 'A' ? twoVsTwoState.config.teamA.aiId : twoVsTwoState.config.teamB.aiId1}
                  isDark={true}
                  align={twoVsTwoState.currentTurn === 'B' ? 'right' : 'left'}
                />}
                {twoVsTwoState.messages.slice().reverse().map((msg, i) => {
                  const isArbiter = msg.team === 'arbiter'
                  const isA = msg.team === 'A'
                  const alignRight = !isA

                  if (isArbiter) return (
                    <div key={i} className="mx-3 my-2 rounded-2xl p-3 relative z-10" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
                      <div className="text-[8px] font-black uppercase mb-1" style={{ color: '#A78BFA' }}>{AI_NAMES[twoVsTwoState.config.arbiterAiId]} — Verdetto</div>
                      <div className="text-xs text-white/80 leading-relaxed">{msg.content}{msg.streaming && <span className="typewriter-cursor" />}</div>
                    </div>
                  )

                  if (!msg.isAI && isA) return (
                    <div key={i} className="flex justify-end px-3 mb-1 message-enter relative z-10">
                      <div style={{ maxWidth: '78%', minWidth: 0 }}>
                        <div className="rounded-2xl rounded-br-sm px-3 py-2 leading-relaxed text-white text-xs"
                          style={{ backgroundColor: '#1a3a5c', wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  )

                  const aiId = msg.aiId ?? ''
                  const avatarColor = AI_COLOR[aiId] || '#6B7280'
                  const bubbleDark: Record<string, { bg: string; nameColor: string; textColor: string }> = {
                    claude:     { bg: '#2D1B69', nameColor: '#c4b5fd', textColor: '#ede8ff' },
                    gpt:        { bg: '#0a2e22', nameColor: '#6ee7b7', textColor: '#d4f5e9' },
                    gemini:     { bg: '#0a1f4a', nameColor: '#93c5fd', textColor: '#dbeafe' },
                    perplexity: { bg: '#2e1406', nameColor: '#fdba74', textColor: '#ffe8d6' },
                  }
                  const bubble = bubbleDark[aiId] ?? { bg: 'rgba(255,255,255,0.07)', nameColor: 'rgba(255,255,255,0.5)', textColor: 'rgba(255,255,255,0.85)' }

                  return (
                    <div key={i} className={`flex items-end gap-2 px-3 mb-1 message-enter relative z-10${alignRight ? ' flex-row-reverse' : ''}`} style={{ minWidth: 0 }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mb-0.5"
                        style={{ backgroundColor: avatarColor }}>
                        {aiId === 'gemini' ? 'Ge' : AI_NAMES[aiId]?.[0]}
                      </div>
                      <div style={{ maxWidth: '78%', minWidth: 0, flex: '0 1 auto' }}>
                        <div className={`text-[11px] font-semibold mb-0.5 ml-1${alignRight ? ' text-right mr-1 ml-0' : ''}`} style={{ color: bubble.nameColor }}>
                          {msg.author}
                        </div>
                        <div className={`rounded-2xl px-3 py-2 leading-relaxed text-xs${alignRight ? ' rounded-br-sm' : ' rounded-bl-sm'}`}
                          style={{ backgroundColor: bubble.bg, color: bubble.textColor, wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
                          {msg.streaming && !msg.content
                            ? <span className="flex gap-1 items-center py-0.5">{[0,180,360].map(d=><span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{backgroundColor:'rgba(255,255,255,0.4)',animationDelay:`${d}ms`,animationDuration:'1s'}}/>)}</span>
                            : <>{msg.content}{msg.streaming && <span className="typewriter-cursor" />}</>
                          }
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            ) : (
              <>
                {thinkingAi && <ThinkingBubble aiId={thinkingAi} isDark={isDark} />}
                {messages.slice().reverse().map(msg => <MessageBubble key={msg.id} message={msg} bgTheme={isDark ? 'white' : 'black'} isAdmin={effectivePlan === 'admin'} />)}
              </>
            )}
          </div>

          {/* Input bar — 2v2 o normale */}
          {phase === 'running' && selectedMode === '2v2' && twoVsTwoState ? (() => {
            const isMyTurn = twoVsTwoState.currentTurn === 'A' && !twoVsTwoLoading && !twoVsTwoState.ended
            const myColor = '#3b82f6'
            const myAiId = twoVsTwoState.config.teamA.aiId
            return (
              <div ref={inputBarRef} className="flex-shrink-0" style={{ backgroundColor: 'rgba(7,7,15,0.95)', borderTop: '1px solid rgba(255,80,0,0.2)', paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
                {twoVsTwoState.roundProgress && (
                  <div className="px-3 pt-2 pb-1">
                    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full" style={{ width: `${twoVsTwoState.roundProgress * 100}%`, background: 'linear-gradient(90deg, #3b82f6, #7C3AED)', transition: 'width 50ms linear' }} />
                    </div>
                  </div>
                )}
                <div className="px-3 pt-2 pb-1">
                  <div className="text-[9px] text-center font-bold" style={{ color: isMyTurn ? myColor : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)') }}>
                    {isMyTurn ? 'Il tuo turno' : `Turno Squadra ${twoVsTwoState.currentTurn}…`}
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 pb-1.5">
                  <textarea value={inputText} onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && inputText.trim() && isMyTurn) { e.preventDefault(); handle2v2HumanMessage(inputText.trim()); setInputText('') } }}
                    disabled={!isMyTurn || twoVsTwoLoading}
                    placeholder={isMyTurn ? 'Il tuo argomento…' : 'Attendi il tuo turno…'}
                    rows={1}
                    className="flex-1 px-3.5 py-2 text-[12px] outline-none resize-none overflow-hidden transition-all"
                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', border: `1px solid ${isMyTurn ? `${myColor}50` : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')}`, color: isDark ? '#f0f0f0' : '#111', opacity: isMyTurn ? 1 : 0.5, borderRadius: inputText.includes('\n') || inputText.length > 40 ? '16px' : '9999px', lineHeight: '1.4', cursor: isMyTurn ? 'text' : 'not-allowed' }}
                  />
                  <button onClick={() => { if (inputText.trim() && isMyTurn) { handle2v2HumanMessage(inputText.trim()); setInputText('') } }}
                    disabled={!inputText.trim() || !isMyTurn || twoVsTwoLoading}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white disabled:opacity-30 flex-shrink-0 transition-all hover:scale-105 active:scale-95"
                    style={{ background: `linear-gradient(135deg, ${myColor}, #1d4ed8)`, boxShadow: inputText.trim() && isMyTurn ? `0 2px 10px ${myColor}55` : undefined }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                  </button>
                </div>
                {/* Pulsante supporto AI rimosso su desktop */}
              </div>
            )
          })() : (
          <div className="flex-shrink-0 flex flex-col gap-1.5 px-3 py-2.5" style={{
            backgroundColor: mobileBg.header,
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          }}>
            {/* Chip allegato mobile */}
            {pendingAttachment && (
              <div className="px-1">
                <AttachmentButton
                  attachment={pendingAttachment}
                  onAttachment={setPendingAttachment}
                  onRemove={() => setPendingAttachment(null)}
                  isDark={isDark}
                  size="sm"
                  locked={!canAttach}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <AttachmentButton
                attachment={null}
                onAttachment={setPendingAttachment}
                onRemove={() => setPendingAttachment(null)}
                isDark={isDark}
                size="sm"
                locked={!canAttach}
              />
              <textarea
                ref={inputRef}
                value={inputText}
                rows={1}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
                placeholder='Scrivi un messaggio…'
                className={`flex-1 px-3.5 py-2 text-[12px] outline-none transition-all resize-none overflow-hidden${waitingForUser ? ' input-waiting' : ''}`}
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                  color: isDark ? '#f0f0f0' : '#111',
                  borderRadius: inputText.includes('\n') || inputText.length > 40 ? '16px' : '9999px',
                  boxShadow: waitingForUser ? (isDark ? '0 0 0 2px rgba(196,181,253,0.15)' : '0 0 0 2px rgba(109,40,217,0.1)') : undefined,
                  lineHeight: '1.4',
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
              <button onClick={handleSendMessage} disabled={!inputText.trim() && !pendingAttachment}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-30 hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #10A37F, #0d8c6d)', boxShadow: (inputText.trim() || pendingAttachment) ? '0 2px 10px rgba(16,163,127,0.4)' : undefined }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
              </button>
            </div>
          </div>
          )}

          {/* Home indicator */}
          <div className="flex-shrink-0 flex justify-center py-2" style={{ backgroundColor: mobileBg.header }}>
            <div className="w-28 h-1 rounded-full" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)' }} />
          </div>

          {/* Overlay suspense/verdetto 2v2 — dentro la cornice iPhone desktop */}
          {phase === 'running' && selectedMode === '2v2' && twoVsTwoState?.ended && (() => {
            const cfg = twoVsTwoState.config
            const arbColor2 = AI_COLOR[cfg.arbiterAiId] ?? '#A78BFA'
            const arbAI2 = AI_OPTIONS.find(a => a.id === cfg.arbiterAiId)

            // Suspense — verdetto in arrivo
            if (!twoVsTwoState.verdict) return (
              <div className="absolute inset-0 z-40 rounded-[44px] overflow-hidden flex flex-col items-center justify-center gap-5"
                style={{ background: '#07070f' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(120,30,0,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
                {/* Orbe */}
                <div className="relative flex items-center justify-center z-10">
                  <div className="absolute w-24 h-24 rounded-full suspense-orb" style={{ background: `radial-gradient(circle, ${arbColor2}22 0%, transparent 70%)`, border: `1px solid ${arbColor2}30` }} />
                  <div className="absolute w-16 h-16 rounded-full suspense-orb" style={{ background: `radial-gradient(circle, ${arbColor2}30 0%, transparent 70%)`, border: `1px solid ${arbColor2}40`, animationDelay: '0.4s', animationDirection: 'reverse' }} />
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white suspense-pulse"
                    style={{ background: `linear-gradient(135deg, ${arbColor2}, ${arbColor2}88)`, boxShadow: `0 0 18px ${arbColor2}55`, fontSize: 22 }}>
                    {cfg.arbiterAiId === 'gemini' ? '✦' : arbAI2?.name[0] ?? '⚖'}
                  </div>
                </div>
                <div className="text-center z-10">
                  <div className="font-black text-white text-sm">{AI_NAMES[cfg.arbiterAiId]}</div>
                  <div className="text-white/40 text-xs mt-1">delibera il verdetto…</div>
                </div>
                <div className="flex gap-1.5 z-10">
                  {[0,200,400].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full suspense-pulse" style={{ background: arbColor2, animationDelay: `${d}ms` }} />)}
                </div>
                <div className="text-[9px] text-white/15 italic z-10 px-6 text-center">"{cfg.topic}"</div>
              </div>
            )

            // Verdetto — schermata risultati
            const sA = twoVsTwoState.scoreA ?? 0
            const sB = twoVsTwoState.scoreB ?? 0
            const wA = sA > sB, wB = sB > sA, dr = sA === sB
            return (
              <div className="absolute inset-0 z-40 rounded-[44px] overflow-hidden flex flex-col"
                style={{ background: '#07070f' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 60% at 50% 100%, rgba(80,20,0,0.3) 0%, transparent 65%)', pointerEvents: 'none' }} />
                {/* Mini header */}
                <div className="flex-shrink-0 flex items-center justify-between px-4 relative z-10"
                  style={{ paddingTop: '20px', paddingBottom: '10px', background: 'rgba(7,7,15,0.85)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <button onClick={() => { setSelectedMode(null); setTwoVsTwoState(null); setPhase('start'); setShow2v2Label(null) }}
                    className="w-7 h-7 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                  </button>
                  <div className="font-black text-white text-xs">Verdetto finale</div>
                  <div className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${arbColor2}20`, color: arbColor2, border: `1px solid ${arbColor2}40` }}>
                    {AI_NAMES[cfg.arbiterAiId]}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto relative z-10 px-4 py-4 flex flex-col gap-4">
                  {/* Scores */}
                  <div className="verdict-reveal flex gap-3">
                    <div className={`flex-1 rounded-2xl p-3 flex flex-col items-center gap-1.5${wA ? ' winner-glow' : ''}`}
                      style={{ background: wA ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.06)', border: wA ? '2px solid rgba(59,130,246,0.55)' : '1px solid rgba(59,130,246,0.2)' }}>
                      {wA && <div className="text-sm">🏆</div>}
                      <div className="text-[8px] font-black uppercase" style={{ color: '#60a5fa' }}>A</div>
                      <div className="score-pop text-3xl font-black" style={{ color: wA ? '#fff' : 'rgba(255,255,255,0.4)', animationDelay: '0.3s' }}>{sA}</div>
                      <div className="text-[9px] text-white/40 truncate w-full text-center">{cfg.teamA.humanName}</div>
                    </div>
                    <div className="flex items-center justify-center text-white/20 text-xs font-black flex-shrink-0">vs</div>
                    <div className={`flex-1 rounded-2xl p-3 flex flex-col items-center gap-1.5${wB ? ' winner-glow' : ''}`}
                      style={{ background: wB ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.06)', border: wB ? '2px solid rgba(239,68,68,0.55)' : '1px solid rgba(239,68,68,0.2)' }}>
                      {wB && <div className="text-sm">🏆</div>}
                      <div className="text-[8px] font-black uppercase" style={{ color: '#f87171' }}>B</div>
                      <div className="score-pop text-3xl font-black" style={{ color: wB ? '#fff' : 'rgba(255,255,255,0.4)', animationDelay: '0.5s' }}>{sB}</div>
                      <div className="text-[9px] text-white/40">AI</div>
                    </div>
                  </div>
                  {/* Vincitore */}
                  <div className="fade-up text-center" style={{ animationDelay: '0.5s', opacity: 0 }}>
                    {dr ? <div className="text-white/50 text-xs font-bold">Pareggio ⚖️</div>
                      : <div><div className="text-[9px] text-white/30 uppercase tracking-widest">Ha vinto</div><div className="font-black text-white text-sm mt-0.5">{wA ? cfg.teamA.humanName : 'Squadra B'}</div></div>}
                  </div>
                  {/* Divisore */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px" style={{ background: `${arbColor2}25` }} />
                    <div className="text-[8px] font-black uppercase tracking-widest" style={{ color: arbColor2 }}>⚖ {AI_NAMES[cfg.arbiterAiId]}</div>
                    <div className="flex-1 h-px" style={{ background: `${arbColor2}25` }} />
                  </div>
                  {/* Testo verdetto */}
                  <div className="fade-up rounded-xl p-3" style={{ background: `${arbColor2}0d`, border: `1px solid ${arbColor2}20`, animationDelay: '0.7s', opacity: 0 }}>
                    <div className="text-xs text-white/75 leading-relaxed">{twoVsTwoState.verdict}</div>
                  </div>
                  {/* CTA */}
                  <button onClick={() => { setSelectedMode(null); setTwoVsTwoState(null); setPhase('start'); setShow2v2Label(null) }}
                    className="fade-up w-full py-3 rounded-2xl font-bold text-white text-xs"
                    style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(124,58,237,0.15))', border: '1px solid rgba(124,58,237,0.35)', animationDelay: '1s', opacity: 0 }}>
                    Torna alla home
                  </button>
                </div>
              </div>
            )
          })()}

          {/* Pannello profilo AI — dentro la cornice iPhone desktop */}
          {selectedAiProfile && AI_PROFILES[selectedAiProfile] && (() => {
            const ai = AI_PROFILES[selectedAiProfile]
            const color = AI_COLOR[selectedAiProfile]
            const name = AI_NAMES[selectedAiProfile]
            return (
              <div className={`absolute inset-0 z-50 flex flex-col ${closingAiProfile ? 'slide-to-right' : 'slide-from-right'} rounded-[44px] overflow-hidden`}
                style={{ backgroundColor: mobileBg.value }}>
                <div className="flex-shrink-0 flex items-center gap-3 px-4 border-b"
                  style={{ paddingTop: '16px', paddingBottom: '12px', backgroundColor: mobileBg.header, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                  <button onClick={() => closeAiProfile()} className="flex items-center active:opacity-60 transition-opacity" style={{ color }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{ backgroundColor: color }}>{ai.initials}</div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: isDark ? '#fff' : '#111' }}>{name}</div>
                    <div className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{ai.tagline}</div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="flex flex-col items-center pt-6 pb-5 px-5" style={{ backgroundColor: mobileBg.header, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                    <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-white mb-3" style={{ backgroundColor: color, boxShadow: `0 0 0 5px ${color}25, 0 8px 30px ${color}55` }}>{ai.initials}</div>
                    <div className="text-xl font-black mb-1" style={{ color: isDark ? '#fff' : '#111' }}>{name}</div>
                    <div className="text-[10px] font-semibold px-3 py-1 rounded-full mt-1" style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}30` }}>{ai.tagline}</div>
                  </div>
                  <div className="px-4 py-4 flex flex-col gap-4" style={{ paddingBottom: '16px' }}>
                    {[{ label: 'Chi sono', text: ai.chi }, { label: 'Come mi comporto', text: ai.carattere }, { label: 'Con le altre AI', text: ai.relazioni }].map(({ label, text }) => (
                      <div key={label} className="rounded-2xl p-3" style={{ backgroundColor: `${color}10`, border: `1px solid ${color}25` }}>
                        <div className="text-[9px] font-black uppercase tracking-widest mb-1.5" style={{ color }}>{label}</div>
                        <p className="text-[13px] leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.85)' }}>{text}</p>
                      </div>
                    ))}
                    <div className="rounded-2xl p-3" style={{ backgroundColor: `${color}10`, border: `1px solid ${color}25` }}>
                      <div className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color }}>Cosa so fare meglio</div>
                      <div className="flex flex-wrap gap-1.5">
                        {ai.forza.split(', ').map(f => (
                          <span key={f} className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}>{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Schermata Devil's Advocate desktop — copre tutto l'inner screen */}
          {phase === 'running' && selectedMode === 'devil' && devilSession && (
            <div className="absolute inset-0 z-50 rounded-[44px] overflow-hidden">
              <DevilsAdvocateScreen
                session={devilSession}
                onMessage={handleDevilMessage}
                onEndTurn={handleDevilEndTurn}
                onSurrender={handleDevilSurrender}
                onStartVerdict={handleDevilStartVerdict}
                onContinueToScore={handleDevilContinueToScore}
                onReply={handleDevilReply}
                onSkipReply={handleDevilSkipReply}
                loading={devilLoading}
                onBack={handleDevilNewGame}
              />
            </div>
          )}

        </div>

        {/* Tasti fisici */}
        <div className="absolute -left-[5px] top-28  w-[3px] h-8  bg-[#2a2a2a] rounded-l-sm" />
        <div className="absolute -left-[5px] top-44  w-[3px] h-14 bg-[#2a2a2a] rounded-l-sm" />
        <div className="absolute -left-[5px] top-64  w-[3px] h-14 bg-[#2a2a2a] rounded-l-sm" />
        <div className="absolute -right-[5px] top-48 w-[3px] h-20 bg-[#2a2a2a] rounded-r-sm" />
      </div>

      {/* ── SCHERMO NATIVO MOBILE ── */}
      <div className="phone-screen-mobile hidden flex-col" style={{ backgroundColor: mobileBg.value, position: 'fixed', top: 'calc(-1 * env(safe-area-inset-top, 0px))', bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))', left: 0, right: 0, paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)', overflow: 'hidden' }}
        ref={el => { if (el) { document.body.style.setProperty('background-color', mobileBg.value, 'important'); document.documentElement.style.setProperty('background-color', mobileBg.value, 'important') } }}>

        {/* Schermata cronologia mobile */}
        {phase === 'history' && (
          <div className="flex flex-col h-full" style={{ backgroundColor: mobileBg.value }}>
            {/* Header cronologia */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 pb-4 border-b"
              style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', backgroundColor: mobileBg.header, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
              <button onClick={() => setPhase(messages.length > 0 ? 'running' : 'start')}
                className="w-9 h-9 flex items-center justify-center rounded-full"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? 'white' : '#111'} strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span className="font-bold text-lg flex-1" style={{ color: isDark ? '#fff' : '#111' }}>Conversazioni</span>
              <button onClick={() => {
                handleReset()
                setPhase('new')
              }}
                className="text-[13px] font-semibold" style={{ color: '#A78BFA' }}>
                + Nuova
              </button>
            </div>
            {/* Lista chat */}
            <div className="flex-1 overflow-y-auto">
              {savedChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="text-4xl" style={{ opacity: 0.25 }}>💬</div>
                  <p className="text-sm text-center px-8" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>Nessuna conversazione salvata.<br/>Le chat vengono salvate automaticamente.</p>
                </div>
              ) : savedChats.map((chat) => (
                <SwipeableChatRow
                  key={chat.id}
                  chat={chat}
                  onOpen={() => {
                    isLoadingHistoryRef.current = true
                    currentChatIdRef.current = chat.id
                    chatTitleRef.current = chat.title
                    chatHistoryRef.current = chat.history ?? []
                    setMessages(chat.messages)
                    setPhase('running')
                    setTimeout(() => { isLoadingHistoryRef.current = false }, 100)
                  }}
                  onDelete={(e) => handleDeleteChat(chat.id, chat.title, e)}
                  bgColor={mobileBg.value}
                  isDark={isDark}
                />
              ))}
            </div>
            {/* Footer mobile cronologia */}
            {savedChats.length > 0 && (
              <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-t"
                style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', backgroundColor: mobileBg.header }}>
                <button onClick={async () => {
                  const ids = savedChats.map(c => c.id)
                  setSavedChats([])
                  await Promise.all(ids.map(id => fetch(`/api/chats/${id}`, { method: 'DELETE' }).catch(() => {})))
                }} className="text-xs transition-colors" style={{ color: 'rgba(239,68,68,0.5)' }}>
                  Cancella tutto
                </button>
              </div>
            )}
          </div>
        )}

        {/* Schermata 2 vs 2 */}
        {phase === 'running' && selectedMode === '2v2' && twoVsTwoState && (
          <TwoVsTwoScreen
            state={twoVsTwoState}
            onHumanMessage={handle2v2HumanMessage}
            onRequestAI={(team) => handle2v2AIResponse(team, 'Supporta la squadra con un argomento forte.')}
            loading={twoVsTwoLoading}
            myTeam="A"
            onBack={() => { setSelectedMode(null); setTwoVsTwoState(null); setTwoVsTwoRoomAblyId(null); setPhase('start'); setShow2v2Label(null); if (typeof window !== 'undefined') localStorage.removeItem('aigora_2v2_active') }}
            onNewGame={() => { setTwoVsTwoState(null); setTwoVsTwoRoomAblyId(null); setSelectedMode('2v2'); setPhase('start'); setShow2v2Setup(true); if (typeof window !== 'undefined') localStorage.removeItem('aigora_2v2_active') }}
            onMultiplayer={() => { setTwoVsTwoState(null); setTwoVsTwoRoomAblyId(null); setSelectedMode(null); setPhase('start'); setShow2v2Setup(false); if (typeof window !== 'undefined') localStorage.removeItem('aigora_2v2_active') }}
          />
        )}

        {/* Schermata Devil's Advocate — copre tutto il phone shell */}
        {phase === 'running' && selectedMode === 'devil' && devilSession && (
          <div className="absolute inset-0 z-50">
            <DevilsAdvocateScreen
              session={devilSession}
              onMessage={handleDevilMessage}
              onEndTurn={handleDevilEndTurn}
              onSurrender={handleDevilSurrender}
              onStartVerdict={handleDevilStartVerdict}
              onContinueToScore={handleDevilContinueToScore}
              onReply={handleDevilReply}
              onSkipReply={handleDevilSkipReply}
              loading={devilLoading}
              onBack={handleDevilNewGame}
            />
          </div>
        )}

        {/* Schermata profilo mobile */}
        {phase === 'profile' && (
          <ProfileScreen
            displayName={displayName}
            userEmail={userEmail}
            userPlan={effectivePlan}
            savedChats={savedChats}
            bgPreset={mobileBg}
            isDark={isDark}
            onBack={() => setPhase(messages.length > 0 ? 'running' : 'start')}
            onSignOut={() => signOut({ callbackUrl: '/login' })}
            onMultiplayer={(['pro', 'premium', 'admin', 'freemium', 'max'].includes(effectivePlan) || isBeta) ? () => { setPhase(messages.length > 0 ? 'running' : 'start'); setShowModeSelect(true) } : undefined}
            userImage={userImage}
            onImageChange={setUserImage}
            dbUserName={dbUserName}
          />
        )}

        {/* Schermata chat mobile (inclusa 'new' — chat vuota) */}
        {phase !== 'history' && phase !== 'profile' && !(phase === 'running' && selectedMode === '2v2') && <>

          {/* Header mobile */}
          <div className="flex-shrink-0 flex items-center gap-2 px-3 pb-3 border-b"
            style={{ backgroundColor: mobileBg.header, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
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

            {/* Font size + Colori + Sintesi + Profilo */}
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
              {(() => {
                const pc: Record<string,string> = { admin:'#F59E0B', max:'#FF6B2B', pro:'#A78BFA', starter:'#1A73E8', free:'#10A37F', none:'#6B7280' }
                const c = pc[effectivePlan ?? 'free'] ?? '#6B7280'
                return (
                  <button onClick={() => setPhase('profile')}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: c }}>
                    {(userName.trim() || userEmail || '?')[0].toUpperCase()}
                  </button>
                )
              })()}
            </div>
          </div>

          {/* Pannello profilo AI — slide da destra, fullscreen */}
          {selectedAiProfile && AI_PROFILES[selectedAiProfile] && (() => {
            const ai = AI_PROFILES[selectedAiProfile]
            const color = AI_COLOR[selectedAiProfile]
            const name = AI_NAMES[selectedAiProfile]
            return (
              <div className={`fixed inset-0 z-[60] flex flex-col ${closingAiProfile ? 'slide-to-right' : 'slide-from-right'}`}
                style={{ backgroundColor: mobileBg.value }}>
                {/* Header stile WhatsApp */}
                <div className="flex-shrink-0 flex items-center gap-3 px-4 border-b"
                  style={{
                    paddingTop: 'max(14px, env(safe-area-inset-top))',
                    paddingBottom: '12px',
                    backgroundColor: mobileBg.header,
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  }}>
                  <button onClick={() => closeAiProfile()}
                    className="flex items-center active:opacity-60 transition-opacity"
                    style={{ color }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                    style={{ backgroundColor: color }}>
                    {ai.initials}
                  </div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: isDark ? '#fff' : '#111' }}>{name}</div>
                    <div className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{ai.tagline}</div>
                  </div>
                </div>

                {/* Contenuto scrollabile */}
                <div className="flex-1 overflow-y-auto">
                  {/* Hero avatar */}
                  <div className="flex flex-col items-center pt-8 pb-6 px-6"
                    style={{ backgroundColor: mobileBg.header, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                    <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black text-white mb-4"
                      style={{ backgroundColor: color, boxShadow: `0 0 0 6px ${color}25, 0 12px 40px ${color}55` }}>
                      {ai.initials}
                    </div>
                    <div className="text-2xl font-black mb-1" style={{ color: isDark ? '#fff' : '#111' }}>{name}</div>
                    <div className="text-xs font-semibold px-3 py-1.5 rounded-full mt-1"
                      style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}30` }}>
                      {ai.tagline}
                    </div>
                  </div>

                  <div className="px-5 py-5 flex flex-col gap-6"
                    style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>
                    {[
                      { label: 'Chi sono', text: ai.chi },
                      { label: 'Come mi comporto', text: ai.carattere },
                      { label: 'Con le altre AI', text: ai.relazioni },
                    ].map(({ label, text }) => (
                      <div key={label} className="rounded-2xl p-4"
                        style={{ backgroundColor: `${color}10`, border: `1px solid ${color}25` }}>
                        <div className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color }}>{label}</div>
                        <p className="text-[15px] leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.85)' }}>{text}</p>
                      </div>
                    ))}
                    <div className="rounded-2xl p-4"
                      style={{ backgroundColor: `${color}10`, border: `1px solid ${color}25` }}>
                      <div className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color }}>Cosa so fare meglio</div>
                      <div className="flex flex-wrap gap-2">
                        {ai.forza.split(', ').map(f => (
                          <span key={f} className="px-3 py-1.5 rounded-full text-sm font-semibold"
                            style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Pannello invita amici */}
          {showInvitePanel && (
            <div className="absolute inset-0 z-50 flex flex-col" style={{ backgroundColor: mobileBg.value }}>
              <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b"
                style={{ backgroundColor: mobileBg.header, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
                <button onClick={() => { setShowInvitePanel(false); setInviteSearch(''); setInviteResults([]) }}
                  className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDark ? 'white' : '#111'} strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <span className="font-bold text-base" style={{ color: isDark ? '#fff' : '#111' }}>Invita al dibattito</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <p className="text-xs mb-4" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                  L'amico riceverà una notifica e potrà unirsi al dibattito in corso.
                </p>
                <input
                  value={inviteSearch}
                  onChange={e => setInviteSearch(e.target.value)}
                  placeholder="Cerca per nome…"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none mb-3"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                    color: isDark ? '#f0f0f0' : '#111',
                  }}
                />
                {inviteResults.map((u: any) => (
                  <button key={u.id}
                    onClick={async () => {
                      // Crea una room con questo utente se non esiste, oppure manda notifica
                      await fetch('/api/rooms', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          topic: question || messages.find((m: any) => m.isUser)?.content || 'Dibattito',
                          visibility: 'private',
                          aiIds: AI_ORDER,
                          invitedUserIds: [u.id],
                        }),
                      })
                      setShowInvitePanel(false)
                      setInviteSearch('')
                      setInviteResults([])
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl mb-2 transition-colors text-left"
                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: '#7C3AED' }}>
                      {(u.name || u.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate" style={{ color: isDark ? '#fff' : '#111' }}>{u.name || u.email}</div>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: '#A78BFA' }}>Invita →</span>
                  </button>
                ))}
                {inviteSearch.length >= 2 && inviteResults.length === 0 && (
                  <div className="text-center py-6 text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)' }}>Nessun utente trovato</div>
                )}
              </div>
            </div>
          )}

          {/* Banner spettatore */}
          {activeRoom && myRoomRole === 'spectator' && (
            <div className="flex-shrink-0 flex items-center justify-center gap-2 py-1.5 text-[11px] font-semibold"
              style={{ backgroundColor: 'rgba(124,58,237,0.15)', color: '#A78BFA', borderBottom: '1px solid rgba(124,58,237,0.2)' }}>
              👁 Stai guardando come spettatore
            </div>
          )}

          {/* Avatar bar mobile */}
          <PhoneAvatarBar activeAi={activeAi} bgColor={mobileBg.header} isDark={isDark} aiOrder={AI_ORDER} onAiClick={setSelectedAiProfile} />

          {/* Messaggi mobile */}
          <div ref={messagesContainerRef} onScroll={e => { const el = e.currentTarget; isAtBottomRef.current = el.scrollTop < 80 }} className="flex-1 overflow-y-auto flex flex-col-reverse" style={{ backgroundColor: mobileBg.value, paddingTop: 12, paddingBottom: 20, overflowX: 'hidden', minHeight: 0 }}>
            {thinkingAi && <ThinkingBubble aiId={thinkingAi} isDark={isDark} />}
            {messages.slice().reverse().map(msg => <MessageBubble key={msg.id} message={msg} bgTheme={isDark ? 'white' : 'black'} fontSize={mobileFontSize} isAdmin={effectivePlan === 'admin'} />)}
          </div>

          {/* Pannello sintesi mobile — slide da destra */}
          {showSynthesis && (
            <div className="absolute inset-0 z-50 flex flex-col" style={{ backgroundColor: mobileBg.value }}>
              <div className="flex-shrink-0 flex items-center gap-3 px-4 pb-4 border-b"
                style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', backgroundColor: mobileBg.header, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
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
                <div className="p-4 border-t border-white/8 space-y-2">
                  {/* Portfolio — solo admin */}
                  {effectivePlan === 'admin' && (
                    <button onClick={handleTogglePortfolio}
                      className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{
                        backgroundColor: isPublic ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                        border: isPublic ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.1)',
                        color: isPublic ? '#A78BFA' : 'rgba(255,255,255,0.4)',
                      }}>
                      {portfolioSaved ? '✓ Salvato!' : isPublic ? '📂 Nel portfolio · rimuovi' : '📂 Aggiungi al portfolio'}
                    </button>
                  )}
                  <button onClick={handleReset}
                    className="w-full py-3 rounded-xl text-white/60 text-sm font-medium"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    🔄 Nuovo dibattito
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Input bar mobile — nascosta per gli spettatori */}
          {activeRoom && myRoomRole === 'spectator' ? (
            <div className="flex-shrink-0 flex items-center justify-center py-3 text-xs"
              style={{ backgroundColor: mobileBg.header, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
              Solo i partecipanti possono scrivere
            </div>
          ) : (
          <div ref={inputBarRef} className="flex-shrink-0 flex items-center gap-2 px-3 py-3" style={{
            backgroundColor: mobileBg.header,
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          }}>
            {/* Chip allegato desktop */}
            {pendingAttachment && phase !== 'new' && (
              <AttachmentButton
                attachment={pendingAttachment}
                onAttachment={setPendingAttachment}
                onRemove={() => setPendingAttachment(null)}
                isDark={isDark}
                locked={!canAttach}
              />
            )}
            {phase !== 'new' && (
              <AttachmentButton
                attachment={null}
                onAttachment={setPendingAttachment}
                onRemove={() => setPendingAttachment(null)}
                isDark={isDark}
                locked={!canAttach}
              />
            )}
            <textarea
              ref={inputRefDesktop}
              value={inputText}
              rows={1}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (phase === 'new') { if (inputText.trim()) handleStart(inputText) } else { handleSendMessage() } } }}
              placeholder={phase === 'new' ? 'Poni una domanda alle AI…' : 'Scrivi un messaggio…'}
              className={`flex-1 px-4 py-2.5 text-[14px] outline-none transition-all resize-none overflow-hidden${waitingForUser ? ' input-waiting' : ''}`}
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                color: isDark ? '#f0f0f0' : '#111',
                borderRadius: inputText.includes('\n') || inputText.length > 50 ? '18px' : '9999px',
                lineHeight: '1.4',
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
            <button onClick={() => { if (phase === 'new') { if (inputText.trim()) handleStart(inputText) } else { handleSendMessage() } }} disabled={!inputText.trim() && !pendingAttachment}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-30 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #10A37F, #0d8c6d)', boxShadow: (inputText.trim() || pendingAttachment) ? '0 2px 10px rgba(16,163,127,0.4)' : undefined }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
            </button>
          </div>
          )}
        </>}

      </div>
      </div>{/* fine wrapper fiamme */}
      </div>{/* fine flex-col wrapper telefono */}

      {/* ── PANNELLO SINTESI ── */}
      <div className={`flex-shrink-0 transition-all duration-500 ease-out${showSynthesis ? ' synthesis-panel-mobile' : ''}`}
        style={{ width: showSynthesis ? 340 * phoneScale : 0, opacity: showSynthesis ? 1 : 0, overflow: 'hidden' }}>
        <div style={{ position: 'relative' }}>
          <div className="glass-dark rounded-3xl overflow-hidden slide-in-right"
            style={{ width: 340, height: 790, zoom: phoneScale }}>

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
                <div className="mt-6 space-y-2">
                  {/* Portfolio — solo admin */}
                  {effectivePlan === 'admin' && (
                    <button onClick={handleTogglePortfolio}
                      className="w-full rounded-xl py-3 text-sm font-medium transition-all"
                      style={{
                        backgroundColor: isPublic ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                        border: isPublic ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.12)',
                        color: isPublic ? '#A78BFA' : 'rgba(255,255,255,0.45)',
                      }}>
                      {portfolioSaved ? '✓ Salvato!' : isPublic ? '📂 Nel portfolio · rimuovi' : '📂 Aggiungi al portfolio'}
                    </button>
                  )}
                  <button onClick={handleReset}
                    className="w-full glass rounded-xl py-3 text-white/60 hover:text-white text-sm font-medium transition-all hover:bg-white/10">
                    🔄 Nuovo dibattito
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Banner ROUND — dentro phone-fire (position:relative), fuori dallo zoom e dall'overflow-hidden */}
      {desktopRoundBanner && twoVsTwoState && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none"
          style={{ borderRadius: 50 * phoneScale, overflow: 'hidden', background: 'rgba(0,0,0,0.55)' }}>
          <div style={{ animation: 'round-banner 2.2s ease forwards' }}>
            <div className="flex flex-col items-center gap-1">
              <div className="font-black uppercase tracking-[0.4em] text-white/40" style={{ fontSize: 11 * phoneScale }}>Inizia il</div>
              <div className="font-black text-white tracking-tight" style={{ fontSize: 60 * phoneScale, textShadow: '0 0 40px rgba(99,102,241,0.8), 0 0 80px rgba(99,102,241,0.4)' }}>ROUND {desktopRoundBanner}</div>
              <div className="flex gap-1.5 mt-2">
                {Array.from({ length: twoVsTwoState.maxRounds }).map((_, i) => (
                  <div key={i} style={{ width: 8 * phoneScale, height: 8 * phoneScale, borderRadius: '50%', background: i < desktopRoundBanner ? 'rgba(99,102,241,0.9)' : 'rgba(255,255,255,0.15)' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {show2v2Setup && typeof window !== 'undefined' && createPortal(
        <TwoVsTwoSetup
          onStart={handle2v2Start}
          onBack={() => { setShow2v2Setup(false); setSelectedMode(null) }}
          currentUserName={dbUserName || userName.trim() || ''}
        />,
        document.body
      )}
      {showModeSelect && typeof window !== 'undefined' && createPortal(
        <ModeSelect
          onSelect={handleSelectMode}
          onClose={() => setShowModeSelect(false)}
          userPlan={effectivePlan}
        />,
        document.body
      )}
      {showDevilDifficulty && typeof window !== 'undefined' && createPortal(
        <DevilDifficultyScreen
          onSelect={handleDevilDifficultySelect}
          onBack={() => { setShowDevilDifficulty(false); setSelectedMode(null) }}
          loading={devilLoading}
        />,
        document.body
      )}
      {devilIntroData && typeof window !== 'undefined' && createPortal(
        <DevilIntroScreen
          positions={devilIntroData.positions}
          difficulty={devilIntroData.difficulty}
          onStart={handleDevilStart}
          onBack={() => { setDevilIntroData(null); setSelectedMode(null) }}
        />,
        document.body
      )}

    </div>
    </>
  )
}
