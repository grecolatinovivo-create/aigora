'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type Phase = 'entry' | 'initial' | 'intake' | 'building' | 'complete'

interface IntakeAnswer { question: string; answer: string }
interface IntakeQuestion { question: string; options: string[] }

interface Section {
  id: string
  title: string
  ai: 'claude' | 'gemini' | 'gpt' | 'perplexity'
  text: string
  streaming: boolean
  done: boolean
  status: 'pending' | 'approved' | 'rejected' | 'regenerating'
  note: string
  showNote: boolean
}

const AI_COLOR: Record<string, string> = {
  claude: '#7C3AED',
  gemini: '#1A73E8',
  gpt: '#10A37F',
  perplexity: '#FF6B2B',
}

const AI_LABEL: Record<string, string> = {
  claude: 'Claude',
  gemini: 'Gemini',
  gpt: 'GPT',
  perplexity: 'Perplexity',
}

interface Props {
  userEmail: string
  userName: string
  userPlan: string
}

// Typewriter — testo che appare carattere per carattere
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

  // Building phase
  const [sections, setSections] = useState<Section[]>([])
  const [allSectionsDone, setAllSectionsDone] = useState(false)
  const [grokText, setGrokText] = useState('')
  const [grokStreaming, setGrokStreaming] = useState(false)
  const [grokDone, setGrokDone] = useState(false)

  const ideaRef = useRef<HTMLTextAreaElement>(null)
  const answersRef = useRef<IntakeAnswer[]>([])
  answersRef.current = answers
  const ideaRef2 = useRef('')
  ideaRef2.current = idea

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
        // Timeout — riprova con domanda fallback
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

  // SSE parser generico
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

  // Avvia generazione documento
  const startGeneration = useCallback(async (regenerateId?: string) => {
    try {
      const res = await fetch('/api/brainstorm/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: ideaRef2.current, answers: answersRef.current, regenerate: regenerateId }),
      })
      if (!res.ok) return

      await parseSSE(res, (event) => {
        if (event.type === 'section_start') {
          if (regenerateId) {
            setSections(prev => prev.map(s => s.id === regenerateId
              ? { ...s, text: '', streaming: true, done: false, status: 'regenerating' } : s))
          } else {
            setSections(prev => [...prev, {
              id: event.id, title: event.title, ai: event.ai,
              text: '', streaming: true, done: false,
              status: 'pending', note: '', showNote: false,
            }])
          }
        } else if (event.type === 'chunk') {
          setSections(prev => prev.map(s => s.id === event.id ? { ...s, text: s.text + event.text } : s))
        } else if (event.type === 'section_end') {
          setSections(prev => prev.map(s => s.id === event.id
            ? { ...s, streaming: false, done: true, status: s.status === 'regenerating' ? 'pending' : s.status } : s))
        }
      }, () => {
        if (!regenerateId) setAllSectionsDone(true)
      })
    } catch (e) {
      console.error('Generate error:', e)
      if (!regenerateId) setAllSectionsDone(true)
    }
  }, [])

  // Avvia Grok
  const startGrok = useCallback(async () => {
    setGrokStreaming(true)
    const approvedSections = sections.filter(s => s.status !== 'rejected')
    const doc = approvedSections.map(s => `## ${s.title}\n${s.text}`).join('\n\n')
    try {
      const res = await fetch('/api/brainstorm/grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, document: doc }),
      })
      await parseSSE(res, (event) => {
        if (event.text) setGrokText(prev => prev + event.text)
      }, () => { setGrokDone(true); setGrokStreaming(false) })
    } catch {
      setGrokStreaming(false)
    }
  }, [sections, idea])

  // Parte quando entra in building
  useEffect(() => {
    if (phase === 'building') startGeneration()
  }, [phase]) // eslint-disable-line

  const { displayed: qDisplayed, done: qDone } = useTypewriter(currentQ?.question ?? '', 22)

  return (
    <>
      <style>{`
        @keyframes brainstorm-sheet-in {
          0%   { transform: translateY(102vh) rotate(-0.8deg); }
          65%  { transform: translateY(-10px) rotate(0.15deg); }
          82%  { transform: translateY(5px) rotate(-0.05deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
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
      `}</style>

      {/* Sfondo — scrivania reale */}
      <div style={{
        position: 'fixed', inset: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundImage: 'url(/scrivania.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}>
        {/* Ombra profonda sotto il foglio */}
        <div style={{
          position: 'absolute', bottom: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: '860px', maxWidth: '100%',
          height: '90px',
          background: 'radial-gradient(ellipse at center bottom, rgba(0,0,0,0.3) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 5,
        }} />
      </div>

      {/* Il Foglio */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: '50%',
        transform: sheetUp
          ? 'translateX(-50%) translateY(0)'
          : 'translateX(-50%) translateY(104vh)',
        transition: sheetUp
          ? 'transform 0.75s cubic-bezier(0.22, 1, 0.36, 1)'
          : 'none',
        width: '100%',
        maxWidth: '860px',
        minHeight: 'calc(100vh - 48px)',
        background: '#FEFEFE',
        borderRadius: '14px 14px 0 0',
        boxShadow: '0 -6px 48px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.05)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {contentVisible && (
          <div style={{ animation: 'bs-content-fade 0.4s ease-out', flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* Header foglio — puntini decorativi */}
            <div style={{ padding: '28px 56px 0', display: 'flex', justifyContent: 'center', opacity: 0.12 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#000', margin: '0 3px' }} />)}
            </div>

            {/* Tracce risposte precedenti */}
            {answers.length > 0 && (
              <div style={{ padding: '24px 56px 0' }}>
                {answers.map((a, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'baseline', gap: '8px',
                    marginBottom: '6px',
                    animation: 'bs-trace-in 0.3s ease-out',
                  }}>
                    <span style={{ color: '#C5B8E8', fontSize: '11px', flexShrink: 0 }}>·</span>
                    <span style={{ color: '#8B7AB0', fontSize: '12px', fontStyle: 'italic', lineHeight: 1.4 }}>
                      {a.answer}
                    </span>
                  </div>
                ))}
                <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', margin: '20px 0 0' }} />
              </div>
            )}

            {/* Area contenuto principale */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: answers.length > 0 ? 'flex-start' : 'center',
              padding: answers.length > 0 ? '40px 56px 80px' : '0 56px 80px',
              minHeight: '400px',
            }}>

              {/* FASE: scrivere l'idea */}
              {phase === 'initial' && (
                <div style={{ width: '100%', maxWidth: '500px', textAlign: 'center' }}>
                  <p style={{
                    fontSize: '13px', color: '#AAAAAA', letterSpacing: '0.08em',
                    textTransform: 'uppercase', marginBottom: '28px', fontWeight: 500,
                  }}>
                    Brainstormer
                  </p>
                  <p style={{
                    fontSize: '18px', color: '#BBBBBB', marginBottom: '32px',
                    fontWeight: 300, lineHeight: 1.5,
                  }}>
                    Descrivi la tua idea in una frase.
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
                    style={{
                      width: '100%',
                      border: 'none',
                      borderBottom: '1.5px solid rgba(0,0,0,0.1)',
                      outline: 'none',
                      fontSize: '22px',
                      color: '#1A1A1A',
                      background: 'transparent',
                      resize: 'none',
                      overflow: 'hidden',
                      textAlign: 'center',
                      lineHeight: 1.5,
                      padding: '8px 0',
                      fontFamily: 'inherit',
                      caretColor: '#7C3AED',
                    }}
                  />
                  <div style={{ height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {idea.trim() && (
                      <button onClick={handleIdeaSubmit} style={{
                        padding: '11px 32px',
                        background: '#1A1A1A', color: '#fff',
                        border: 'none', borderRadius: '100px',
                        fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer', letterSpacing: '0.05em',
                        fontFamily: 'inherit',
                        transition: 'opacity 0.15s',
                      }}>
                        Inizia →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* FASE: intake — domande */}
              {phase === 'intake' && (
                <div style={{ width: '100%', maxWidth: '540px' }}>

                  {/* Idea in cima */}
                  <div style={{ marginBottom: '44px' }}>
                    <p style={{ fontSize: '11px', color: '#CCC', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      La tua idea
                    </p>
                    <p style={{ fontSize: '16px', color: '#333', fontWeight: 500, lineHeight: 1.5 }}>
                      {idea}
                    </p>
                  </div>

                  {/* Loading */}
                  {loadingQ && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', height: '80px' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{
                          width: '7px', height: '7px', borderRadius: '50%',
                          background: '#CCCCCC',
                          animation: `bs-dot-pulse 1.1s ease-in-out infinite`,
                          animationDelay: `${i * 0.18}s`,
                        }} />
                      ))}
                    </div>
                  )}

                  {/* Domanda corrente */}
                  {currentQ && !loadingQ && (
                    <div style={{ animation: 'bs-q-enter 0.35s ease-out' }}>
                      <p style={{
                        fontSize: '24px',
                        color: '#111',
                        fontWeight: 400,
                        lineHeight: 1.5,
                        marginBottom: '36px',
                        textAlign: 'center',
                        minHeight: '72px',
                        letterSpacing: '-0.01em',
                      }}>
                        {qDisplayed}
                        {!qDone && (
                          <span style={{ opacity: 0.35, animation: 'bs-dot-pulse 0.8s ease-in-out infinite' }}>|</span>
                        )}
                      </p>

                      {/* Chip opzioni */}
                      {qDone && (
                        <div style={{
                          display: 'flex', flexWrap: 'wrap', gap: '10px',
                          justifyContent: 'center', marginBottom: '20px',
                        }}>
                          {currentQ.options.map((opt, i) => (
                            <button key={opt} onClick={() => handleAnswer(opt)}
                              style={{
                                padding: '11px 22px',
                                border: `1.5px solid ${selected === opt ? '#1A1A1A' : 'rgba(0,0,0,0.13)'}`,
                                borderRadius: '100px',
                                background: selected === opt ? '#1A1A1A' : '#fff',
                                color: selected === opt ? '#fff' : '#333',
                                fontSize: '14px',
                                cursor: selected ? 'default' : 'pointer',
                                transition: 'all 0.15s ease',
                                fontFamily: 'inherit',
                                animation: `bs-chip-in 0.25s ease-out both`,
                                animationDelay: `${i * 0.06}s`,
                                opacity: selected && selected !== opt ? 0.35 : 1,
                              }}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Scrivi tu */}
                      {qDone && !showFree && !selected && (
                        <div style={{ textAlign: 'center', marginTop: '12px' }}>
                          <button onClick={() => setShowFree(true)} style={{
                            background: 'none', border: 'none',
                            color: '#BBBBBB', fontSize: '13px',
                            cursor: 'pointer', textDecoration: 'underline',
                            fontFamily: 'inherit',
                          }}>
                            + scrivi tu
                          </button>
                        </div>
                      )}

                      {showFree && !selected && (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'center', animation: 'bs-q-enter 0.2s ease-out' }}>
                          <input
                            autoFocus
                            value={freeInput}
                            onChange={e => setFreeInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && freeInput.trim()) handleFreeSubmit() }}
                            placeholder="La tua risposta..."
                            style={{
                              padding: '11px 18px',
                              border: '1.5px solid rgba(0,0,0,0.15)',
                              borderRadius: '100px',
                              fontSize: '14px',
                              outline: 'none',
                              width: '280px',
                              fontFamily: 'inherit',
                              color: '#1A1A1A',
                            }}
                          />
                          <button onClick={handleFreeSubmit} style={{
                            padding: '11px 20px',
                            background: '#1A1A1A', color: '#fff',
                            border: 'none', borderRadius: '100px',
                            fontSize: '14px', cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}>→</button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contatore */}
                  {answers.length > 0 && (
                    <div style={{ textAlign: 'center', marginTop: '52px' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        {Array.from({ length: 9 }).map((_, i) => (
                          <div key={i} style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: i < answers.length ? '#1A1A1A' : 'rgba(0,0,0,0.1)',
                            transition: 'background 0.3s',
                          }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* FASE: building — documento vivo */}
              {phase === 'building' && (
                <div style={{ width: '100%', maxWidth: '600px' }}>

                  {/* Header idea */}
                  <div style={{ marginBottom: '40px' }}>
                    <p style={{ fontSize: '11px', color: '#BBBBBB', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>La tua idea</p>
                    <p style={{ fontSize: '18px', color: '#222', fontWeight: 500, lineHeight: 1.5 }}>{idea}</p>
                  </div>

                  {/* Sezioni */}
                  {sections.map((section, idx) => (
                    <div key={section.id} style={{
                      marginBottom: '36px',
                      animation: 'bs-q-enter 0.35s ease-out',
                      opacity: section.status === 'rejected' ? 0.3 : 1,
                      transition: 'opacity 0.4s',
                    }}>
                      {/* Titolo sezione */}
                      <p style={{ fontSize: '11px', color: '#BBBBBB', fontWeight: 600, marginBottom: '10px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {section.title}
                      </p>

                      {/* Testo streaming */}
                      <p style={{ fontSize: '16px', color: '#1A1A1A', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                        {section.text}
                        {section.streaming && (
                          <span style={{ display: 'inline-block', width: '2px', height: '16px', background: '#CCCCCC', marginLeft: '2px', verticalAlign: 'middle', animation: 'bs-dot-pulse 0.7s ease-in-out infinite' }} />
                        )}
                      </p>

                      {/* Nota utente */}
                      {section.showNote && (
                        <div style={{ marginTop: '12px', animation: 'bs-q-enter 0.2s ease-out' }}>
                          <textarea
                            value={section.note}
                            onChange={e => setSections(prev => prev.map(s => s.id === section.id ? { ...s, note: e.target.value } : s))}
                            placeholder="Aggiungi una nota…"
                            rows={2}
                            style={{
                              width: '100%', padding: '10px 14px',
                              border: '1px solid rgba(0,0,0,0.1)', borderRadius: '10px',
                              fontSize: '14px', fontFamily: 'inherit', resize: 'none',
                              outline: 'none', color: '#333', background: '#FAFAFA',
                            }}
                          />
                        </div>
                      )}

                      {/* Azioni (solo quando done) */}
                      {section.done && section.status !== 'rejected' && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
                          {section.status !== 'approved' && (
                            <button onClick={() => setSections(prev => prev.map(s => s.id === section.id ? { ...s, status: 'approved' } : s))}
                              style={{ padding: '6px 14px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '100px', background: 'transparent', color: '#555', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                              ✓ Tieni
                            </button>
                          )}
                          {section.status === 'approved' && (
                            <span style={{ fontSize: '12px', color: '#10A37F', fontWeight: 600 }}>✓ Tenuto</span>
                          )}
                          {section.status !== 'approved' && (
                            <button onClick={() => { startGeneration(section.id) }}
                              style={{ padding: '6px 14px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '100px', background: 'transparent', color: '#999', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                              ↺ Riscrivi
                            </button>
                          )}
                          {!section.showNote && (
                            <button onClick={() => setSections(prev => prev.map(s => s.id === section.id ? { ...s, showNote: true } : s))}
                              style={{ padding: '6px 14px', border: 'none', background: 'transparent', color: '#BBBBBB', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                              + nota
                            </button>
                          )}
                        </div>
                      )}

                      {/* Separatore */}
                      {idx < sections.length - 1 && (
                        <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', marginTop: '32px' }} />
                      )}
                    </div>
                  ))}

                  {/* Loading iniziale */}
                  {sections.length === 0 && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#CCC', animation: `bs-dot-pulse 1.1s ease-in-out infinite`, animationDelay: `${i * 0.18}s` }} />
                      ))}
                    </div>
                  )}

                  {/* Pulsante Grok — dopo che tutte le sezioni sono pronte */}
                  {allSectionsDone && !grokStreaming && !grokDone && (
                    <div style={{ marginTop: '48px', textAlign: 'center', animation: 'bs-q-enter 0.4s ease-out' }}>
                      <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', marginBottom: '36px' }} />
                      <p style={{ fontSize: '13px', color: '#BBBBBB', marginBottom: '16px' }}>Il documento è pronto.</p>
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
                      marginTop: '48px',
                      padding: '24px 28px',
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
                        {grokText}
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
