'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type Phase = 'entry' | 'initial' | 'intake' | 'building' | 'complete'

interface IntakeAnswer { question: string; answer: string }
interface IntakeQuestion { question: string; options: string[] }

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

  const ideaRef = useRef<HTMLTextAreaElement>(null)
  const answersRef = useRef<IntakeAnswer[]>([])
  answersRef.current = answers

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

              {/* FASE: building — placeholder */}
              {phase === 'building' && (
                <div style={{ width: '100%', maxWidth: '540px', textAlign: 'center' }}>
                  <div style={{ marginBottom: '48px' }}>
                    <p style={{ fontSize: '11px', color: '#CCC', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      La tua idea
                    </p>
                    <p style={{ fontSize: '18px', color: '#333', fontWeight: 500, lineHeight: 1.5 }}>
                      {idea}
                    </p>
                  </div>
                  <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', marginBottom: '48px' }} />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: '7px', height: '7px', borderRadius: '50%',
                        background: '#CCCCCC',
                        animation: `bs-dot-pulse 1.1s ease-in-out infinite`,
                        animationDelay: `${i * 0.18}s`,
                      }} />
                    ))}
                  </div>
                  <p style={{ marginTop: '16px', fontSize: '14px', color: '#BBBBBB' }}>
                    Le AI stanno costruendo il documento…
                  </p>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </>
  )
}
