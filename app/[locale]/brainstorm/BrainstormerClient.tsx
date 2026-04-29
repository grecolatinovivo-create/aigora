'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { signOut } from 'next-auth/react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import Navbar from '@/app/components/layout/Navbar'
import AttachmentButton, { type ChatAttachment } from '@/app/components/chat/AttachmentButton'
import LimitWall from '@/app/components/ui/LimitWall'

type Phase = 'entry' | 'initial' | 'intake' | 'building' | 'complete'

interface IntakeAnswer { question: string; answer: string }
interface IntakeQuestion { question: string; options: string[] }

interface HistoryItem {
  id: string
  idea: string
  answers: IntakeAnswer[]
  thread: { userNote: string; text: string }[]
  output: string
  grokOutput?: string | null
  feedback?: string | null
  createdAt: string
}

const AI_MEMBERS = [
  { id: 'claude',     label: 'Claude',      color: '#7C3AED' },
  { id: 'gemini',     label: 'Gemini',      color: '#1A73E8' },
  { id: 'gpt',        label: 'GPT',         color: '#10A37F' },
  { id: 'perplexity', label: 'Perplexity',  color: '#FF6B2B' },
]

interface Props {
  userEmail: string
  userName: string
  userPlan: string
}

// Converte **testo** in <strong> senza librerie
function renderBold(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} style={{ fontWeight: 700 }}>{part}</strong> : part
  )
}

function useTypewriter(text: string, speed = 38) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    setDisplayed('')
    setDone(false)
    if (!text) return
    let i = 0
    const id = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) { clearInterval(id); setDone(true) }
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])
  return { displayed, done }
}

export default function BrainstormerClient({ userEmail, userName, userPlan }: Props) {
  const t = useTranslations('brainstorm')
  const locale = useLocale()
  const router = useRouter()
  // Piano aggiornato dinamicamente dopo ogni sessione completata
  const [effectivePlan, setEffectivePlan] = useState(userPlan)
  const [phase, setPhase] = useState<Phase>('entry')
  const [idea, setIdea] = useState('')
  const [answers, setAnswers] = useState<IntakeAnswer[]>([])
  const [ideaAttachment, setIdeaAttachment] = useState<ChatAttachment | null>(null)
  const [brainstormLimitInfo, setBrainstormLimitInfo] = useState<import('@/app/components/ui/LimitWall').LimitInfo | null>(null)
  const [currentQ, setCurrentQ] = useState<IntakeQuestion | null>(null)
  const [loadingQ, setLoadingQ] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [showFree, setShowFree] = useState(false)
  const [freeInput, setFreeInput] = useState('')
  const [sheetUp, setSheetUp] = useState(false)
  const [contentVisible, setContentVisible] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Output unico del concilio
  const [outputThread, setOutputThread] = useState<{userNote: string; text: string}[]>([])
  const [outputText, setOutputText] = useState('')
  const [outputStreaming, setOutputStreaming] = useState(false)
  const [outputDone, setOutputDone] = useState(false)
  const [concilioPhase, setConcilioPhase] = useState<'round1' | 'round2' | 'synthesis' | null>(null)
  const [outputNote, setOutputNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [outputFeedback, setOutputFeedback] = useState<'up' | 'down' | null>(null)

  // Grok
  const [grokText, setGrokText] = useState('')
  const [grokStreaming, setGrokStreaming] = useState(false)
  const [grokDone, setGrokDone] = useState(false)

  // Cronologia
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [historyTabHover, setHistoryTabHover] = useState(false)

  const ideaRef = useRef<HTMLTextAreaElement>(null)
  const answersRef = useRef<IntakeAnswer[]>([])
  answersRef.current = answers
  const ideaRef2 = useRef('')
  ideaRef2.current = idea
  const skipGenerationRef = useRef(false) // true quando si carica dallo storico

  // ── Audio click selezione ──
  const audioCtxRef = useRef<AudioContext | null>(null)
  const getAudioCtx = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
    return audioCtxRef.current
  }

  const playSelectClick = () => {
    try {
      const ctx = getAudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(520, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.07)
      gain.gain.setValueAtTime(0.18, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.09)
      const len = Math.floor(ctx.sampleRate * 0.025)
      const buf = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.3))
      const src = ctx.createBufferSource()
      src.buffer = buf
      const g2 = ctx.createGain(); g2.gain.value = 0.08
      src.connect(g2); g2.connect(ctx.destination); src.start()
    } catch {}
  }

  // Blocco mobile — redirect a home
  useEffect(() => {
    if (window.innerWidth < 1024) router.push('/')
  }, [router])

  // Il foglio sale dal basso
  useEffect(() => {
    const t1 = setTimeout(() => setSheetUp(true), 120)
    const t2 = setTimeout(() => setContentVisible(true), 820)
    const t3 = setTimeout(() => setPhase('initial'), 900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  useEffect(() => {
    if (phase === 'initial') setTimeout(() => ideaRef.current?.focus(), 100)
  }, [phase])

  // ── Auto-salvataggio sessione quando output è completo (crea o aggiorna) ──
  useEffect(() => {
    if (!outputDone || !outputText || !idea) return
    if (!currentSessionId) {
      // Prima generazione: crea sessione
      fetch('/api/brainstorm/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, answers, thread: outputThread, output: outputText }),
      })
        .then(r => r.json())
        .then(data => { if (data.id) setCurrentSessionId(data.id) })
        .catch(() => {})
    } else {
      // Raffinamento: aggiorna output e thread nella sessione esistente
      fetch('/api/brainstorm/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentSessionId, thread: outputThread, output: outputText }),
      }).catch(() => {})
    }
    // Aggiorna il piano locale — così Navbar riflette lo stato aggiornato senza reload
    fetch('/api/user/me')
      .then(r => r.json())
      .then(d => { if (d.plan) setEffectivePlan(d.plan) })
      .catch(() => {})
  }, [outputDone]) // eslint-disable-line

  // ── Aggiorna feedback nella sessione ──
  useEffect(() => {
    if (outputFeedback && currentSessionId) {
      fetch('/api/brainstorm/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentSessionId, feedback: outputFeedback }),
      }).catch(() => {})
    }
  }, [outputFeedback, currentSessionId])

  // ── Aggiorna grokOutput nella sessione ──
  useEffect(() => {
    if (grokDone && grokText && currentSessionId) {
      fetch('/api/brainstorm/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentSessionId, grokOutput: grokText }),
      }).catch(() => {})
    }
  }, [grokDone]) // eslint-disable-line

  // ── Carica cronologia ──
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/brainstorm/sessions')
      if (res.ok) {
        const data = await res.json()
        setHistoryItems(data)
      }
    } catch {}
    setHistoryLoading(false)
  }, [])

  useEffect(() => {
    if (historyOpen) loadHistory()
  }, [historyOpen, loadHistory])

  // ── Carica sessione dal pannello cronologia ──
  const loadSession = (item: HistoryItem) => {
    setIdea(item.idea)
    setAnswers(item.answers)
    setOutputThread(item.thread ?? [])
    setOutputText(item.output)
    setOutputStreaming(false)
    setOutputDone(true)
    setGrokText(item.grokOutput ?? '')
    setGrokDone(!!item.grokOutput)
    setGrokStreaming(false)
    setCurrentSessionId(item.id)
    setOutputFeedback((item.feedback as 'up' | 'down' | null) ?? null)
    skipGenerationRef.current = true
    setPhase('building')
    setShowNote(false)
    setOutputNote('')
    setHistoryOpen(false)
  }

  const fetchNextQuestion = useCallback(async (currentAnswers: IntakeAnswer[]) => {
    setLoadingQ(true)
    setSelected(null)
    setShowFree(false)
    setFreeInput('')
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12000)
      const res = await fetch('/api/brainstorm/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, answers: currentAnswers }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.done) {
        setPhase('building')
      } else {
        setCurrentQ(data)
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        setCurrentQ({
          question: 'Cosa cambierebbe nella vita di qualcuno se questa idea funzionasse?',
          options: ['Il modo in cui lavora', 'Come passa il tempo libero', 'Le relazioni con gli altri', 'La sua autostima'],
        })
      } else {
        setPhase('building')
      }
    }
    setLoadingQ(false)
  }, [idea])

  const handleIdeaSubmit = () => {
    if (!idea.trim()) return
    // Reset per nuovo brainstorm
    setCurrentSessionId(null)
    setOutputFeedback(null)
    setOutputThread([])
    setOutputText('')
    setGrokText('')
    setGrokDone(false)
    setPhase('intake')
    fetchNextQuestion([])
  }

  const handleAnswer = (answer: string) => {
    if (selected) return
    playSelectClick()
    setSelected(answer)
    setTimeout(() => {
      const newAnswers = [...answersRef.current, { question: currentQ!.question, answer }]
      setAnswers(newAnswers)
      setCurrentQ(null)
      fetchNextQuestion(newAnswers)
    }, 350)
  }

  const handleFreeSubmit = () => {
    if (!freeInput.trim()) return
    handleAnswer(freeInput.trim())
  }

  // SSE parser
  const parseSSE = async (res: Response, onEvent: (event: any) => void, onDone: () => void) => {
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (raw === '[DONE]') { onDone(); return }
        try { onEvent(JSON.parse(raw)) } catch {}
      }
    }
    onDone()
  }

  // Avvia generazione — voce unica del concilio
  const startGeneration = useCallback(async (note?: string, previousOutput?: string) => {
    // Se è un raffinamento, salva la risposta precedente nel thread (non cancellarla!)
    if (note && previousOutput) {
      setOutputThread(prev => [...prev, { userNote: note, text: previousOutput }])
    }
    setOutputText('')
    setOutputStreaming(true)
    setOutputDone(false)
    setConcilioPhase(note ? 'synthesis' : 'round1')
    setShowNote(false)
    setOutputNote('')

    try {
      const res = await fetch('/api/brainstorm/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: ideaRef2.current,
          answers: answersRef.current,
          note: note ?? undefined,
          previousOutput: previousOutput ?? undefined,
          attachment: note ? undefined : ideaAttachment,   // allegato solo alla prima generazione
        }),
      })
      if (res.status === 429) {
        const data = await res.json()
        if (data.error === 'limit_reached') {
          setBrainstormLimitInfo(data)
          setOutputStreaming(false)
          setConcilioPhase(null)
          return
        }
      }
      if (!res.ok) { setOutputStreaming(false); return }

      // Typewriter queue: SSE rapido → display a 22ms/char
      const queue = { text: '' }
      const drainId = setInterval(() => {
        if (!queue.text) return
        const char = queue.text[0]
        queue.text = queue.text.slice(1)
        setOutputText(prev => prev + char)
      }, 22)

      await parseSSE(res, (event) => {
        if (event.phase) setConcilioPhase(event.phase)
        if (event.text) queue.text += event.text
      }, () => {
        const waitDrain = setInterval(() => {
          if (!queue.text) {
            clearInterval(waitDrain)
            clearInterval(drainId)
            setOutputStreaming(false)
            setConcilioPhase(null)
            setOutputDone(true)
          }
        }, 50)
      })
    } catch {
      setOutputStreaming(false)
      setConcilioPhase(null)
    }
  }, [])

  // Avvia Grok
  const startGrok = useCallback(async () => {
    setGrokStreaming(true)
    try {
      const res = await fetch('/api/brainstorm/grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, document: outputText }),
      })
      const grokQueue = { text: '' }
      const drainId = setInterval(() => {
        if (!grokQueue.text) return
        const char = grokQueue.text[0]
        grokQueue.text = grokQueue.text.slice(1)
        setGrokText(prev => prev + char)
      }, 22)
      await parseSSE(res, (event) => {
        if (event.text) grokQueue.text += event.text
      }, () => {
        const waitDrain = setInterval(() => {
          if (!grokQueue.text) {
            clearInterval(waitDrain)
            clearInterval(drainId)
            setGrokDone(true)
            setGrokStreaming(false)
          }
        }, 50)
      })
    } catch {
      setGrokStreaming(false)
    }
  }, [outputText, idea])

  useEffect(() => {
    if (phase === 'building') {
      if (skipGenerationRef.current) { skipGenerationRef.current = false; return }
      startGeneration()
    }
  }, [phase]) // eslint-disable-line

  const { displayed: qDisplayed, done: qDone } = useTypewriter(currentQ?.question ?? '', 22)

  // Formatta data per le card cronologia
  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
    const timeStr = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 0) return `${t('today')}, ${timeStr}`
    if (diffDays === 1) return `${t('yesterday')}, ${timeStr}`
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' }) + `, ${timeStr}`
  }

  return (
    <>
      <Navbar
        displayName={userName || userEmail}
        userEmail={userEmail}
        userPlan={effectivePlan}
        showProfileMenu={showProfileMenu}
        setShowProfileMenu={setShowProfileMenu}
        onCronologia={() => { router.push('/') }}
        onNewChat={() => { router.push('/') }}
        onSignOut={() => signOut({ callbackUrl: '/login' })}
        onManageSub={async () => {
          try {
            const res = await fetch('/api/stripe/portal', { method: 'POST' })
            const data = await res.json()
            if (data.url) window.location.href = data.url
          } catch { /* noop */ }
        }}
        hideCronologia
      />

      <style>{`
        @keyframes bs-dot-pulse {
          0%, 100% { opacity: 0.25; transform: scale(0.7); }
          50%       { opacity: 1;    transform: scale(1);   }
        }
        @keyframes bs-q-enter {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes bs-trace-in {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        @keyframes bs-chip-in {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1);      }
        }
        @keyframes bs-content-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes bs-ai-pulse {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 1;  }
        }
        @keyframes bs-panel-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .bs-idea-input::placeholder { color: rgba(245,237,214,0.35); }
        .bs-history-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.1) !important;
          transform: translateY(-1px);
        }
        .bs-history-tab:hover .bs-tab-inner {
          width: 44px !important;
        }
      `}</style>

      {/* Sfondo — scrivania */}
      <div style={{
        position: 'fixed', inset: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundImage: 'url(/scrivania.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}>
        <div style={{
          position: 'absolute', bottom: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: '860px', maxWidth: '100%',
          height: '90px',
          background: 'radial-gradient(ellipse at center bottom, rgba(0,0,0,0.3) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 5,
        }} />
      </div>

      {/* ── TAB CRONOLOGIA — sporgenza sinistra ── */}
      {sheetUp && (
        <div
          className="bs-history-tab"
          onClick={() => setHistoryOpen(h => !h)}
          style={{
            position: 'fixed',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 15,
            cursor: 'pointer',
          }}
        >
          <div
            className="bs-tab-inner"
            style={{
              width: historyTabHover ? '44px' : '32px',
              height: '108px',
              background: '#F4F1EA',
              borderRadius: '0 10px 10px 0',
              boxShadow: '3px 0 12px rgba(0,0,0,0.1), inset -1px 0 0 rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'width 0.2s ease, box-shadow 0.2s ease',
              overflow: 'hidden',
              colorScheme: 'light',
            }}
            onMouseEnter={() => setHistoryTabHover(true)}
            onMouseLeave={() => setHistoryTabHover(false)}
          >
            {/* Icona orologio */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            {/* Testo verticale */}
            <span style={{
              fontSize: '8px',
              color: '#BBBBBB',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              transform: 'rotate(180deg)',
              whiteSpace: 'nowrap',
            }}>{t('historyTabLabel')}</span>
          </div>
        </div>
      )}

      {/* ── PANNELLO CRONOLOGIA ── */}
      <div style={{
        position: 'fixed',
        left: historyOpen ? 0 : '-340px',
        top: '56px',
        height: 'calc(100vh - 56px)',
        width: '300px',
        background: '#FEFEFE',
        borderRight: '1px solid rgba(0,0,0,0.07)',
        boxShadow: historyOpen ? '6px 0 32px rgba(0,0,0,0.12)' : 'none',
        transition: 'left 0.38s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.38s ease',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        colorScheme: 'light',
      }}>
        {/* Header pannello */}
        <div style={{
          padding: '18px 18px 14px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1A1A1A', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Brainstormer
            </span>
          </div>
          <button
            onClick={() => setHistoryOpen(false)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#CCCCCC', fontSize: '18px', lineHeight: 1,
              padding: '2px 4px', fontFamily: 'inherit',
              transition: 'color 0.15s',
            }}
          >×</button>
        </div>

        {/* Nuovo brainstorm button */}
        <div style={{ padding: '12px 16px 0' }}>
          <button
            onClick={() => {
              setHistoryOpen(false)
              setIdea('')
              setAnswers([])
              setOutputText('')
              setOutputDone(false)
              setOutputStreaming(false)
              setGrokText('')
              setGrokDone(false)
              setCurrentSessionId(null)
              setOutputFeedback(null)
              setPhase('initial')
              setTimeout(() => ideaRef.current?.focus(), 100)
            }}
            style={{
              width: '100%',
              padding: '9px 16px',
              background: '#1A1A1A',
              color: '#fff',
              border: 'none',
              borderRadius: '100px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '14px', lineHeight: 1 }}>+</span>
            {t('newSession')}
          </button>
        </div>

        {/* Lista foglietti */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          {historyLoading && (
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', padding: '40px 0' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: '6px', height: '6px', borderRadius: '50%', background: '#DDD',
                  animation: `bs-dot-pulse 1.1s ease-in-out infinite`,
                  animationDelay: `${i * 0.18}s`,
                }} />
              ))}
            </div>
          )}

          {!historyLoading && historyItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 16px' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px', opacity: 0.3 }}>📋</div>
              <p style={{ fontSize: '13px', color: '#CCCCCC', lineHeight: 1.5 }}>
                {t('noHistory')}
              </p>
            </div>
          )}

          {!historyLoading && historyItems.map(item => {
            const isActive = item.id === currentSessionId
            const feedbackColor = item.feedback === 'up' ? '#10A37F' : item.feedback === 'down' ? '#EF4444' : 'rgba(167,139,250,0.4)'
            return (
              <div
                key={item.id}
                className="bs-history-card"
                onClick={() => loadSession(item)}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '2px 8px 8px 2px',
                  border: isActive
                    ? '1.5px solid rgba(167,139,250,0.5)'
                    : '1px solid rgba(0,0,0,0.07)',
                  boxShadow: isActive
                    ? '0 2px 12px rgba(124,58,237,0.08)'
                    : '0 2px 6px rgba(0,0,0,0.05)',
                  padding: '11px 13px 10px 15px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  borderLeft: `3px solid ${feedbackColor}`,
                }}
              >
                {/* Idea text */}
                <p style={{
                  fontSize: '13px',
                  color: '#1A1A1A',
                  fontWeight: 500,
                  lineHeight: 1.45,
                  margin: '0 0 6px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                } as React.CSSProperties}>
                  {item.idea}
                </p>

                {/* Footer card */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '10px', color: '#CCCCCC' }}>
                    {formatDate(item.createdAt)}
                  </span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {item.grokOutput && (
                      <span style={{
                        fontSize: '9px', color: '#A78BFA', fontWeight: 700,
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                      }}>Grok</span>
                    )}
                    {item.feedback === 'up' && <span style={{ fontSize: '10px' }}>👍</span>}
                    {item.feedback === 'down' && <span style={{ fontSize: '10px' }}>👎</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Backdrop trasparente per chiudere il pannello */}
      {historyOpen && (
        <div
          onClick={() => setHistoryOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 19,
            background: 'transparent',
          }}
        />
      )}

      {/* Il Foglio */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: '50%',
        transform: sheetUp ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(104vh)',
        transition: sheetUp ? 'transform 0.75s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
        width: '100%',
        maxWidth: '860px',
        height: 'calc(100vh - 70px)',
        background: '#FEFEFE',
        borderRadius: '14px 14px 0 0',
        boxShadow: '0 -6px 48px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.05)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        colorScheme: 'light',
      }}>
        {contentVisible && (
          <div style={{ animation: 'bs-content-fade 0.4s ease-out', flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* Header decorativo */}
            <div style={{ padding: '28px 56px 0', display: 'flex', justifyContent: 'center', opacity: 0.12 }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#000', margin: '0 3px' }} />)}
            </div>

            {/* Tracce risposte */}
            {answers.length > 0 && (
              <div style={{ padding: '24px 56px 0' }}>
                {answers.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px', animation: 'bs-trace-in 0.3s ease-out' }}>
                    <span style={{ color: '#C5B8E8', fontSize: '11px', flexShrink: 0 }}>·</span>
                    <span style={{ color: '#8B7AB0', fontSize: '12px', fontStyle: 'italic', lineHeight: 1.4 }}>{a.answer}</span>
                  </div>
                ))}
                <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', margin: '20px 0 0' }} />
              </div>
            )}

            {/* Contenuto principale */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: answers.length > 0 ? 'flex-start' : 'center',
              padding: answers.length > 0 ? '40px 56px 80px' : '0 56px 80px',
              minHeight: '400px',
            }}>

              {/* FASE: scrivere idea */}
              {phase === 'initial' && (
                <div style={{ width: '100%', maxWidth: '500px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: '#AAAAAA', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '28px', fontWeight: 500 }}>
                    Brainstormer
                  </p>
                  <p style={{ fontSize: '18px', color: '#BBBBBB', marginBottom: '32px', fontWeight: 300, lineHeight: 1.5 }}>
                    {t('initialSubtitle')}
                  </p>
                  <textarea
                    ref={ideaRef}
                    value={idea}
                    onChange={e => {
                      setIdea(e.target.value)
                      e.currentTarget.style.height = 'auto'
                      e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey && idea.trim()) {
                        e.preventDefault()
                        handleIdeaSubmit()
                      }
                    }}
                    placeholder={t('ideaPlaceholder')}
                    rows={2}
                    style={{
                      width: '100%', border: 'none',
                      borderBottom: '1.5px solid rgba(0,0,0,0.1)',
                      outline: 'none', fontSize: '22px', color: '#1A1A1A',
                      background: 'transparent', resize: 'none', overflow: 'hidden',
                      textAlign: 'center', lineHeight: 1.5, padding: '8px 0',
                      fontFamily: 'inherit', caretColor: '#7C3AED',
                    }}
                  />
                  {/* Allegato Brainstormer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 8, marginBottom: 4 }}>
                    <AttachmentButton
                      attachment={ideaAttachment}
                      onAttachment={setIdeaAttachment}
                      onRemove={() => setIdeaAttachment(null)}
                      isDark={false}
                      size="sm"
                    />
                    {ideaAttachment && (
                      <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                        {t('attachmentNote')}
                      </span>
                    )}
                  </div>
                  <div style={{ height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {(idea.trim() || ideaAttachment) && (
                      <button onClick={handleIdeaSubmit} style={{
                        padding: '11px 32px', background: '#1A1A1A', color: '#fff',
                        border: 'none', borderRadius: '100px', fontSize: '13px',
                        fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em',
                        fontFamily: 'inherit', transition: 'opacity 0.15s',
                      }}>
                        {t('startBtn')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* FASE: intake */}
              {phase === 'intake' && (
                <div style={{ width: '100%', maxWidth: '540px' }}>
                  <div style={{ marginBottom: '44px' }}>
                    <p style={{ fontSize: '11px', color: '#CCC', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>{t('ideaLabel')}</p>
                    <p style={{ fontSize: '16px', color: '#333', fontWeight: 500, lineHeight: 1.5 }}>{idea}</p>
                  </div>

                  {loadingQ && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', height: '80px' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#CCCCCC', animation: `bs-dot-pulse 1.1s ease-in-out infinite`, animationDelay: `${i * 0.18}s` }} />
                      ))}
                    </div>
                  )}

                  {currentQ && !loadingQ && (
                    <div style={{ animation: 'bs-q-enter 0.35s ease-out' }}>
                      <p style={{ fontSize: '24px', color: '#111', fontWeight: 400, lineHeight: 1.5, marginBottom: '36px', textAlign: 'center', minHeight: '72px', letterSpacing: '-0.01em' }}>
                        {qDisplayed}
                        {!qDone && <span style={{ opacity: 0.35, animation: 'bs-dot-pulse 0.8s ease-in-out infinite' }}>|</span>}
                      </p>

                      {qDone && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
                          {currentQ.options.map((opt, i) => (
                            <button key={opt} onClick={() => handleAnswer(opt)}
                              style={{
                                padding: '11px 22px',
                                border: `1.5px solid ${selected === opt ? '#1A1A1A' : 'rgba(0,0,0,0.13)'}`,
                                borderRadius: '100px',
                                background: selected === opt ? '#1A1A1A' : '#fff',
                                color: selected === opt ? '#fff' : '#333',
                                fontSize: '14px', cursor: selected ? 'default' : 'pointer',
                                transition: 'all 0.15s ease', fontFamily: 'inherit',
                                animation: `bs-chip-in 0.25s ease-out both`,
                                animationDelay: `${i * 0.06}s`,
                                opacity: selected && selected !== opt ? 0.35 : 1,
                              }}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {qDone && !showFree && !selected && (
                        <div style={{ textAlign: 'center', marginTop: '12px' }}>
                          <button onClick={() => setShowFree(true)} style={{ background: 'none', border: 'none', color: '#BBBBBB', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
                            {t('writeYourself')}
                          </button>
                        </div>
                      )}

                      {showFree && !selected && (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'center', animation: 'bs-q-enter 0.2s ease-out' }}>
                          <input
                            autoFocus value={freeInput}
                            onChange={e => setFreeInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && freeInput.trim()) handleFreeSubmit() }}
                            placeholder={t('yourAnswerPlaceholder')}
                            style={{ padding: '11px 18px', border: '1.5px solid rgba(0,0,0,0.15)', borderRadius: '100px', fontSize: '14px', outline: 'none', width: '280px', fontFamily: 'inherit', color: '#1A1A1A', background: '#ffffff', WebkitTextFillColor: '#1A1A1A', colorScheme: 'light' } as React.CSSProperties}
                          />
                          <button onClick={handleFreeSubmit} style={{ padding: '11px 20px', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: '100px', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>→</button>
                        </div>
                      )}
                    </div>
                  )}

                  {answers.length > 0 && (
                    <div style={{ textAlign: 'center', marginTop: '52px' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        {Array.from({ length: 9 }).map((_, i) => (
                          <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i < answers.length ? '#1A1A1A' : 'rgba(0,0,0,0.1)', transition: 'background 0.3s' }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* FASE: limit wall — limite Brainstormer raggiunto */}
              {brainstormLimitInfo && (
                <div style={{ width: '100%', maxWidth: '480px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: '20px', border: '1px solid rgba(124,58,237,0.15)', boxShadow: '0 4px 32px rgba(0,0,0,0.08)' }}>
                    <LimitWall
                      limitInfo={brainstormLimitInfo}
                      isDark={false}
                      onDismiss={() => setBrainstormLimitInfo(null)}
                    />
                  </div>
                </div>
              )}

              {/* FASE: building — output unico del concilio */}
              {phase === 'building' && !brainstormLimitInfo && (
                <div style={{ width: '100%', maxWidth: '600px' }}>

                  {/* Header idea */}
                  <div style={{ marginBottom: '32px' }}>
                    <p style={{ fontSize: '11px', color: '#BBBBBB', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>La tua idea</p>
                    <p style={{ fontSize: '18px', color: '#222', fontWeight: 500, lineHeight: 1.5 }}>{idea}</p>
                  </div>

                  {/* 4 AI indicators + label fase */}
                  <div style={{ marginBottom: '36px' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '8px' }}>
                      {AI_MEMBERS.map((ai, i) => {
                        const active = concilioPhase === 'round1' || concilioPhase === 'round2'
                        const synth = concilioPhase === 'synthesis'
                        const idle = !outputStreaming
                        return (
                          <div key={ai.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{
                              width: '7px', height: '7px', borderRadius: '50%',
                              backgroundColor: ai.color,
                              animation: active
                                ? `bs-ai-pulse 0.8s ease-in-out infinite`
                                : synth ? `bs-ai-pulse 1.8s ease-in-out infinite` : 'none',
                              animationDelay: `${i * (active ? 0.1 : 0.25)}s`,
                              opacity: idle ? 0.25 : synth ? 0.4 : 1,
                              transition: 'opacity 0.4s',
                            }} />
                            <span style={{ fontSize: '11px', color: active ? '#555' : synth ? '#BBBBBB' : '#DDDDDD', letterSpacing: '0.04em', transition: 'color 0.4s' }}>
                              {ai.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    {/* Label fase */}
                    {concilioPhase && (
                      <p style={{ fontSize: '10px', color: '#BBBBBB', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0, animation: 'bs-q-enter 0.3s ease-out' }}>
                        {concilioPhase === 'round1' && t('phase.deliberating')}
                        {concilioPhase === 'round2' && t('phase.discussing')}
                        {concilioPhase === 'synthesis' && t('phase.synthesizing')}
                      </p>
                    )}
                  </div>

                  {/* Thread — risposte precedenti accumulate */}
                  {outputThread.map((entry, i) => (
                    <div key={i} style={{ marginBottom: '36px' }}>
                      <p style={{ fontSize: '16px', color: '#1A1A1A', lineHeight: 1.85, whiteSpace: 'pre-wrap', opacity: 0.45 }}>
                        {renderBold(entry.text)}
                      </p>
                      {/* Nota dell'utente */}
                      <div style={{ marginTop: '18px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{ width: '2px', minHeight: '20px', background: 'rgba(167,139,250,0.4)', borderRadius: '2px', flexShrink: 0, marginTop: '2px' }} />
                        <p style={{ fontSize: '13px', color: '#A78BFA', fontStyle: 'italic', lineHeight: 1.55, margin: 0 }}>
                          "{entry.userNote}"
                        </p>
                      </div>
                      <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', marginTop: '24px' }} />
                    </div>
                  ))}

                  {/* Loading iniziale */}
                  {!outputText && outputStreaming && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '20px 0' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#CCC', animation: `bs-dot-pulse 1.1s ease-in-out infinite`, animationDelay: `${i * 0.18}s` }} />
                      ))}
                    </div>
                  )}

                  {/* Testo unico del concilio */}
                  {outputText && (
                    <div style={{ animation: 'bs-q-enter 0.35s ease-out' }}>
                      <p style={{ fontSize: '16px', color: '#1A1A1A', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>
                        {renderBold(outputText)}
                        {outputStreaming && (
                          <span style={{ display: 'inline-block', width: '2px', height: '16px', background: '#CCCCCC', marginLeft: '2px', verticalAlign: 'middle', animation: 'bs-dot-pulse 0.7s ease-in-out infinite' }} />
                        )}
                      </p>

                      {/* Azioni — solo quando done */}
                      {outputDone && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
                          <button onClick={() => setOutputFeedback(f => f === 'up' ? null : 'up')}
                            title="Utile"
                            style={{
                              padding: '7px 14px', border: `1.5px solid ${outputFeedback === 'up' ? '#10A37F' : 'rgba(0,0,0,0.12)'}`,
                              borderRadius: '100px', background: outputFeedback === 'up' ? 'rgba(16,163,127,0.08)' : 'transparent',
                              color: outputFeedback === 'up' ? '#10A37F' : '#999',
                              fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                            }}>
                            👍
                          </button>
                          <button onClick={() => setOutputFeedback(f => f === 'down' ? null : 'down')}
                            title="Da migliorare"
                            style={{
                              padding: '7px 14px', border: `1.5px solid ${outputFeedback === 'down' ? '#EF4444' : 'rgba(0,0,0,0.12)'}`,
                              borderRadius: '100px', background: outputFeedback === 'down' ? 'rgba(239,68,68,0.08)' : 'transparent',
                              color: outputFeedback === 'down' ? '#EF4444' : '#999',
                              fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                            }}>
                            👎
                          </button>
                          {!grokStreaming && !grokDone && (
                            <button onClick={() => { setOutputThread([]); setOutputText(''); setOutputDone(false); setShowNote(false); setOutputNote(''); setOutputFeedback(null); setCurrentSessionId(null); startGeneration() }}
                              style={{ padding: '7px 18px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '100px', background: 'transparent', color: '#999', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                              {t('rewriteBtn')}
                            </button>
                          )}
                          {!showNote && (
                            <button onClick={() => setShowNote(true)}
                              style={{ padding: '7px 0', border: 'none', background: 'transparent', color: '#BBBBBB', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                              {t('addNoteBtn')}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Area nota */}
                      {showNote && (
                        <div style={{ marginTop: '16px', animation: 'bs-q-enter 0.2s ease-out' }}>
                          <textarea
                            autoFocus
                            value={outputNote}
                            onChange={e => setOutputNote(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && outputNote.trim()) {
                                e.preventDefault()
                                startGeneration(outputNote, outputText)
                              }
                            }}
                            placeholder={t('notePlaceholder')}
                            rows={3}
                            style={{
                              width: '100%', padding: '12px 16px',
                              border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px',
                              fontSize: '14px', fontFamily: 'inherit', resize: 'none',
                              outline: 'none', color: '#333', background: '#FAFAFA',
                              lineHeight: 1.6, WebkitTextFillColor: '#333', colorScheme: 'light',
                            } as React.CSSProperties}
                          />
                          {outputNote.trim() && (
                            <button
                              onClick={() => startGeneration(outputNote, outputText)}
                              style={{
                                marginTop: '10px', padding: '9px 22px',
                                background: '#1A1A1A', color: '#fff',
                                border: 'none', borderRadius: '100px',
                                fontSize: '13px', fontWeight: 600,
                                cursor: 'pointer', fontFamily: 'inherit',
                              }}>
                              {t('refineBtn')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pulsante Grok */}
                  {outputDone && !grokStreaming && !grokDone && (
                    <div style={{ marginTop: '56px', textAlign: 'center', animation: 'bs-q-enter 0.4s ease-out' }}>
                      <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', marginBottom: '36px' }} />
                      <p style={{ fontSize: '13px', color: '#BBBBBB', marginBottom: '16px' }}>{t('councilSpoken')}</p>
                      <button onClick={startGrok} style={{
                        padding: '12px 32px',
                        background: 'linear-gradient(135deg, #1A1A1A 0%, #2D1F3D 100%)',
                        color: '#fff', border: 'none', borderRadius: '100px',
                        fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'inherit', letterSpacing: '0.03em',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      }}>
                        {t('grokBtn')}
                      </button>
                    </div>
                  )}

                  {/* Sezione Grok */}
                  {(grokStreaming || grokDone) && (
                    <div style={{
                      marginTop: '48px', padding: '24px 28px',
                      background: 'rgba(20,10,30,0.04)',
                      borderLeft: '3px solid #1A1A1A',
                      borderRadius: '0 12px 12px 0',
                      animation: 'bs-q-enter 0.4s ease-out',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#1A1A1A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Grok</span>
                        <span style={{ fontSize: '11px', color: '#AAAAAA' }}>{t('grokAttack')}</span>
                      </div>
                      <p style={{ fontSize: '16px', color: '#1A1A1A', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                        {renderBold(grokText)}
                        {grokStreaming && (
                          <span style={{ display: 'inline-block', width: '2px', height: '16px', background: '#1A1A1A', marginLeft: '2px', verticalAlign: 'middle', animation: 'bs-dot-pulse 0.7s ease-in-out infinite' }} />
                        )}
                      </p>
                    </div>
                  )}

                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </>
  )
}
