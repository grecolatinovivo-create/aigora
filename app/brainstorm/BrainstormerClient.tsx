'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { signOut } from 'next-auth/react'
import Navbar from '@/app/components/layout/Navbar'

type Phase = 'entry' | 'initial' | 'intake' | 'building' | 'complete'

interface IntakeAnswer { question: string; answer: string }
interface IntakeQuestion { question: string; options: string[] }

const AI_MEMBERS = [
  { id: 'claude',     label: 'Claude',      color: '#7C3AED' },
  { id: 'gemini',     label: 'Gemini',      color: '#1A73E8' },
  { id: 'gpt',        label: 'GPT-4',       color: '#10A37F' },
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
  const [phase, setPhase] = useState<Phase>('entry')
  const [idea, setIdea] = useState('')
  const [answers, setAnswers] = useState<IntakeAnswer[]>([])
  const [currentQ, setCurrentQ] = useState<IntakeQuestion | null>(null)
  const [loadingQ, setLoadingQ] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [showFree, setShowFree] = useState(false)
  const [freeInput, setFreeInput] = useState('')
  const [sheetUp, setSheetUp] = useState(false)
  const [contentVisible, setContentVisible] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Output unico del concilio
  const [outputText, setOutputText] = useState('')
  const [outputStreaming, setOutputStreaming] = useState(false)
  const [outputDone, setOutputDone] = useState(false)
  const [outputNote, setOutputNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [outputFeedback, setOutputFeedback] = useState<'up' | 'down' | null>(null)

  // Grok
  const [grokText, setGrokText] = useState('')
  const [grokStreaming, setGrokStreaming] = useState(false)
  const [grokDone, setGrokDone] = useState(false)

  const ideaRef = useRef<HTMLTextAreaElement>(null)
  const answersRef = useRef<IntakeAnswer[]>([])
  answersRef.current = answers
  const ideaRef2 = useRef('')
  ideaRef2.current = idea

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
    setOutputText('')
    setOutputStreaming(true)
    setOutputDone(false)
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
        }),
      })
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
        if (event.text) queue.text += event.text
      }, () => {
        // Aspetta drain completo prima di segnare done
        const waitDrain = setInterval(() => {
          if (!queue.text) {
            clearInterval(waitDrain)
            clearInterval(drainId)
            setOutputStreaming(false)
            setOutputDone(true)
          }
        }, 50)
      })
    } catch {
      setOutputStreaming(false)
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
    if (phase === 'building') startGeneration()
  }, [phase]) // eslint-disable-line

  const { displayed: qDisplayed, done: qDone } = useTypewriter(currentQ?.question ?? '', 22)

  return (
    <>
      <Navbar
        displayName={userName || userEmail}
        userEmail={userEmail}
        userPlan={userPlan}
        showProfileMenu={showProfileMenu}
        setShowProfileMenu={setShowProfileMenu}
        onCronologia={() => { window.location.href = '/' }}
        onNewChat={() => { window.location.href = '/' }}
        onSignOut={() => signOut({ callbackUrl: '/login' })}
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
        .bs-idea-input::placeholder { color: rgba(245,237,214,0.35); }
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
              {[0,1,2].map(i => <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#000', margin: '0 3px' }} />)}
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
                    Descrivi la tua idea o cosa ti serve.
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
                    placeholder="Cosa hai in mente?"
                    rows={2}
                    className="bs-idea-input"
                    style={{
                      width: '100%', border: 'none',
                      borderBottom: '1.5px solid rgba(245,237,214,0.2)',
                      outline: 'none', fontSize: '22px', color: '#F5EDD6',
                      background: 'transparent', resize: 'none', overflow: 'hidden',
                      textAlign: 'center', lineHeight: 1.5, padding: '8px 0',
                      fontFamily: 'inherit', caretColor: '#A78BFA',
                    }}
                  />
                  <div style={{ height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {idea.trim() && (
                      <button onClick={handleIdeaSubmit} style={{
                        padding: '11px 32px', background: '#1A1A1A', color: '#fff',
                        border: 'none', borderRadius: '100px', fontSize: '13px',
                        fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em',
                        fontFamily: 'inherit', transition: 'opacity 0.15s',
                      }}>
                        Inizia →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* FASE: intake */}
              {phase === 'intake' && (
                <div style={{ width: '100%', maxWidth: '540px' }}>
                  <div style={{ marginBottom: '44px' }}>
                    <p style={{ fontSize: '11px', color: '#CCC', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>La tua idea</p>
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
                            + scrivi tu
                          </button>
                        </div>
                      )}

                      {showFree && !selected && (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'center', animation: 'bs-q-enter 0.2s ease-out' }}>
                          <input
                            autoFocus value={freeInput}
                            onChange={e => setFreeInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && freeInput.trim()) handleFreeSubmit() }}
                            placeholder="La tua risposta..."
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

              {/* FASE: building — output unico del concilio */}
              {phase === 'building' && (
                <div style={{ width: '100%', maxWidth: '600px' }}>

                  {/* Header idea */}
                  <div style={{ marginBottom: '32px' }}>
                    <p style={{ fontSize: '11px', color: '#BBBBBB', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>La tua idea</p>
                    <p style={{ fontSize: '18px', color: '#222', fontWeight: 500, lineHeight: 1.5 }}>{idea}</p>
                  </div>

                  {/* 4 AI indicators */}
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '36px', alignItems: 'center' }}>
                    {AI_MEMBERS.map((ai, i) => (
                      <div key={ai.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '7px', height: '7px', borderRadius: '50%',
                          backgroundColor: ai.color,
                          animation: outputStreaming ? `bs-ai-pulse 1.4s ease-in-out infinite` : 'none',
                          animationDelay: `${i * 0.2}s`,
                          opacity: outputStreaming ? 1 : 0.35,
                          transition: 'opacity 0.5s',
                        }} />
                        <span style={{ fontSize: '11px', color: outputStreaming ? '#888' : '#CCCCCC', letterSpacing: '0.04em', transition: 'color 0.5s' }}>
                          {ai.label}
                        </span>
                      </div>
                    ))}
                  </div>

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
                          {/* Pollice su */}
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
                          {/* Pollice giù */}
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
                          {/* Riscrivi — solo se non si è già nel flow Grok */}
                          {!grokStreaming && !grokDone && (
                            <button onClick={() => { setOutputText(''); setOutputDone(false); setShowNote(false); setOutputNote(''); setOutputFeedback(null); startGeneration() }}
                              style={{ padding: '7px 18px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '100px', background: 'transparent', color: '#999', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                              ↺ Riscrivi
                            </button>
                          )}
                          {/* Nota */}
                          {!showNote && (
                            <button onClick={() => setShowNote(true)}
                              style={{ padding: '7px 0', border: 'none', background: 'transparent', color: '#BBBBBB', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                              + nota
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
                            placeholder="Aggiungi un'osservazione, un'integrazione, una direzione diversa…"
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
                              → Raffina
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
                      <p style={{ fontSize: '13px', color: '#BBBBBB', marginBottom: '16px' }}>Il concilio ha parlato.</p>
                      <button onClick={startGrok} style={{
                        padding: '12px 32px',
                        background: 'linear-gradient(135deg, #1A1A1A 0%, #2D1F3D 100%)',
                        color: '#fff', border: 'none', borderRadius: '100px',
                        fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'inherit', letterSpacing: '0.03em',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      }}>
                        Lascia parlare Grok →
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
                        <span style={{ fontSize: '11px', color: '#AAAAAA' }}>— attacco finale</span>
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
