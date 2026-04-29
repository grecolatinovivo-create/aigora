'use client'
import { useState, useEffect, useRef } from 'react'
import { AI_OPTIONS, AI_NAMES, AI_COLOR, AI_DESC, TOPIC_SUGGESTIONS } from '@/app/lib/aiProfiles'
import { SFX } from '@/app/lib/audioEngine'
import type { TwoVsTwoConfig } from '@/app/types/aigora'
import RouletteScreen from '@/app/components/modes/RouletteScreen'

type Mode = 'solo' | 'amico'

export default function TwoVsTwoSetup({ onStart, onBack, currentUserName }: {
  onStart: (config: TwoVsTwoConfig & { roomCode?: string; roomId?: string }) => void
  onBack: () => void
  currentUserName: string
}) {
  const [mode, setMode] = useState<Mode>('solo')
  const [topic, setTopic] = useState('')
  const [teamAHuman, setTeamAHuman] = useState(currentUserName || 'Utente')
  useEffect(() => { if (currentUserName) setTeamAHuman(currentUserName) }, [currentUserName])
  const [teamAAI, setTeamAAI] = useState('claude')
  const [teamBAI, setTeamBAI] = useState('gpt')
  const [teamBAI2, setTeamBAI2] = useState('gemini')
  const [arbiter, setArbiter] = useState('perplexity')
  const [maxRoundsChoice, setMaxRoundsChoice] = useState(5)
  const [step, setStep] = useState<'mode' | 'topic' | 'teams' | 'roulette' | 'share'>('mode')
  const [creating, setCreating] = useState(false)
  const isMountedRef = useRef(true)
  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false } }, [])
  const [rouletteSlots, setRouletteSlots] = useState<string[]>(['', ''])
  const [rouletteSettled, setRouletteSettled] = useState<boolean[]>([false, false])
  const [rouletteReady, setRouletteReady] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [roomId, setRoomId] = useState('')
  const [copied, setCopied] = useState(false)
  const [weeklyLimit, setWeeklyLimit] = useState<{ retryAfter: number } | null>(null)
  const [desktopTransition, setDesktopTransition] = useState<'idle' | 'exit' | 'done'>('idle')
  const [aiTopicPool] = useState<string[]>(() => [...TOPIC_SUGGESTIONS].sort(() => Math.random() - 0.5))
  const [aiTopicIndex] = useState(0)
  const [topicRevealed, setTopicRevealed] = useState(false)
  const [diceRolling, setDiceRolling] = useState(false)
  const [diceLanding, setDiceLanding] = useState(false)
  const [userSide, setUserSide] = useState<'attack' | 'defend'>('attack')

  // Selezione mode dalla schermata iniziale
  const handleModeSelect = (m: Mode) => {
    setMode(m)
    setStep('topic')
    setTopic('')
    setTopicRevealed(false)
    setDiceRolling(false)
    setDiceLanding(false)
    setRoomCode('')
    setRoomId('')
    setWeeklyLimit(null)
    setCreating(false)
  }

  // ── Solo: roulette assegna Team B ─────────────────────────────────────────
  const handleCreateSolo = async () => {
    const rest = [...AI_OPTIONS.filter(a => a.id !== teamAAI)].sort(() => Math.random() - 0.5)
    const randomB1 = rest[0].id
    const randomB2 = rest[1].id
    const randomArbiter = rest[2].id
    setTeamBAI(randomB1)
    setTeamBAI2(randomB2)
    setArbiter(randomArbiter)

    setRouletteSlots(['', ''])
    setRouletteSettled([false, false])
    setRouletteReady(false)
    setStep('roulette')

    const reveals = [randomB1, randomB2]

    const apiPromise = fetch('/api/2v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'solo',
        topic: topic.trim(),
        teamAAiId: teamAAI,
        teamBAiId1: randomB1,
        teamBAiId2: randomB2,
        arbiterAiId: randomArbiter,
        teamAName: teamAHuman,
        maxRounds: maxRoundsChoice,
      }),
    }).then(r => r.json())

    const delays = [1400, 2800]
    delays.forEach((delay, i) => {
      setTimeout(() => {
        setRouletteSlots(prev => { const n = [...prev]; n[i] = reveals[i]; return n })
        setRouletteSettled(prev => { const n = [...prev]; n[i] = true; return n })
      }, delay)
    })

    setTimeout(async () => {
      if (!isMountedRef.current) return
      try {
        const data = await apiPromise
        if (!isMountedRef.current) return
        if (data.limitReached) {
          setWeeklyLimit({ retryAfter: data.retryAfter ?? 0 })
          setStep('topic')
          setTopicRevealed(false)
          return
        }
        if (data.code) {
          setRoomCode(data.code)
          setRoomId(data.room.id)
          setRouletteReady(true)  // solo se la room è stata creata con successo
        } else {
          // API ha risposto senza codice — torna al topic con notifica silenziosa
          console.warn('2v2 API: nessun codice ricevuto', data)
          setStep('topic')
          setTopicRevealed(false)
        }
      } catch (e) {
        if (!isMountedRef.current) return
        console.warn('2v2 API error:', e)
        setStep('topic')
        setTopicRevealed(false)
      }
    }, 3800)
  }

  // ── Amico: genera codice subito, salta roulette ────────────────────────────
  const handleCreateAmico = async () => {
    setCreating(true)
    try {
      // Sceglie arbitro a caso tra le AI che non sono quelle di squadra A
      const arbiterCandidate = AI_OPTIONS.filter(a => a.id !== teamAAI)
      const randomArbiter = arbiterCandidate[Math.floor(Math.random() * arbiterCandidate.length)].id
      setArbiter(randomArbiter)

      const res = await fetch('/api/2v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'amico',
          topic: topic.trim(),
          teamAAiId: teamAAI,
          arbiterAiId: randomArbiter,
          teamAName: teamAHuman,
          maxRounds: maxRoundsChoice,
        }),
      })
      const data = await res.json()
      if (data.limitReached) {
        setWeeklyLimit({ retryAfter: data.retryAfter ?? 0 })
        setStep('topic')
        setTopicRevealed(false)
        setCreating(false)
        return
      }
      if (data.code) {
        setRoomCode(data.code)
        setRoomId(data.room.id)
      }
      setStep('share')
    } catch {
      // Non andare alla schermata condivisione senza un roomCode valido
      setStep('teams')
    }
    setCreating(false)
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://aigora.eu')
  const shareLink = roomCode ? `${siteUrl}/2v2/${roomCode}` : ''

  const handleCopy = () => {
    if (!shareLink) return
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleNativeShare = async () => {
    if (!shareLink) return
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Sfida 2v2 su AiGORA', text: `Sei stato sfidato! Argomento: "${topic}". Entra nella Squadra B ->`, url: shareLink })
      } catch { /* annullato */ }
    } else {
      handleCopy()
    }
  }

  // ── Progress dots ──────────────────────────────────────────────────────────
  const soloSteps = ['topic', 'teams', 'roulette', 'share'] as const
  const amicoSteps = ['topic', 'teams', 'share'] as const
  const activeSteps: readonly string[] = mode === 'solo' ? soloSteps : amicoSteps

  const progressDots = step === 'mode' ? null : (
    <div className="flex gap-1.5 flex-shrink-0">
      {activeSteps.map((s, i) => {
        const stepIdx = activeSteps.indexOf(step)
        const isDone = i < stepIdx
        const isCurrent = s === step
        return (
          <div key={s} className="rounded-full transition-all duration-300"
            style={{ width: isCurrent ? 20 : 6, height: 6, background: isCurrent ? '#3b82f6' : isDone ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.15)' }} />
        )
      })}
    </div>
  )

  // ── Back button ────────────────────────────────────────────────────────────
  const backBtn = (
    <button
      onClick={
        step === 'share' ? () => { SFX.click(); setStep('teams') }
        : step === 'teams' ? () => { SFX.click(); setStep('topic') }
        : step === 'roulette' ? undefined
        : step === 'topic' ? () => { SFX.click(); setStep('mode') }
        : () => { SFX.click(); onBack() }
      }
      className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0"
      style={{ backgroundColor: 'rgba(255,255,255,0.06)', opacity: step === 'roulette' ? 0.3 : 1, pointerEvents: step === 'roulette' ? 'none' : 'auto' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
  )

  // ── Contenuto step (mobile + iPad condiviso) ───────────────────────────────
  const stepContent = (
    <>
      {/* ── SCHERMATA INIZIALE: scegli modalita ── */}
      {step === 'mode' && (
        <div className="flex flex-col h-full px-5 pt-8 pb-6 gap-6">
          <div className="text-center">
            <div className="text-2xl font-black text-white mb-1">Come vuoi giocare?</div>
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Scegli la modalita di gioco.</div>
          </div>
          <div className="flex-1 flex gap-4 items-stretch">
            {/* Card Solo */}
            <button
              onClick={() => { SFX.click(); handleModeSelect('solo') }}
              className="flex-1 flex flex-col items-center justify-center gap-4 rounded-3xl p-6 transition-all active:scale-[0.97] hover:scale-[1.01]"
              style={{ background: 'rgba(59,130,246,0.08)', border: '2px solid rgba(59,130,246,0.25)', boxShadow: '0 0 30px rgba(59,130,246,0.1)' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-3xl"
                style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
                1
              </div>
              <div>
                <div className="text-xl font-black text-white text-center mb-1">Solo</div>
                <div className="text-[12px] text-center leading-snug" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Tu + AI alleato<br/>contro 2 AI avversarie
                </div>
              </div>
              <div className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
                Inizia subito
              </div>
            </button>

            {/* Card Con un amico */}
            <button
              onClick={() => { SFX.click(); handleModeSelect('amico') }}
              className="flex-1 flex flex-col items-center justify-center gap-4 rounded-3xl p-6 transition-all active:scale-[0.97] hover:scale-[1.01]"
              style={{ background: 'rgba(239,68,68,0.08)', border: '2px solid rgba(239,68,68,0.25)', boxShadow: '0 0 30px rgba(239,68,68,0.1)' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-3xl"
                style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)' }}>
                2
              </div>
              <div>
                <div className="text-xl font-black text-white text-center mb-1">Con un amico</div>
                <div className="text-[12px] text-center leading-snug" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Tu + AI alleato<br/>contro un avversario umano + AI
                </div>
              </div>
              <div className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                Codice invito
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── Limite settimanale ── */}
      {weeklyLimit && step === 'topic' && (() => {
        const resetDate = new Date(Date.now() + weeklyLimit.retryAfter * 1000)
        const resetLabel = resetDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
        return (
          <div className="flex flex-col items-center justify-center h-full px-6 py-10 text-center gap-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)' }}>
              &#9876;
            </div>
            <div>
              <div className="text-white font-black text-xl mb-2">Sfide esaurite</div>
              <div className="text-white/50 text-sm leading-relaxed max-w-xs">
                Hai usato la <span className="text-white/80 font-semibold">sfida settimanale</span> inclusa nel piano Free.<br/>
                Si ricaricano <span className="text-white/80 font-semibold">{resetLabel}</span>.
              </div>
            </div>
            <div className="w-full max-w-xs flex flex-col gap-3">
              <a href="/pricing"
                className="w-full py-3.5 rounded-2xl font-bold text-white text-sm text-center block transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
                Sfida senza limiti — Pro
              </a>
              <button onClick={() => { setWeeklyLimit(null); onBack() }} className="text-white/30 text-xs hover:text-white/50 transition-colors">
                Torna all'arena
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── STEP 1: Dado ── */}
      {!weeklyLimit && step === 'topic' && (() => {
        const handleRoll = async () => {
          if (topicRevealed || diceRolling) return
          SFX.diceRoll()
          setTimeout(() => SFX.diceThud(), 280)
          setDiceRolling(true)
          try {
            const [res] = await Promise.all([
              fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: '2v2',
                  aiId: 'gemini',
                  history: [
                    { name: 'Sistema', content: 'Sei un generatore di tesi per dibattiti. Rispondi SOLO con una affermazione breve in italiano, max 8 parole, provocatoria e divisiva su un tema attuale o filosofico. Deve essere una tesi netta che si può sostenere o attaccare. Nient\'altro. Zero spiegazioni. Zero commenti. Solo la tesi.' },
                    { name: 'Sistema', content: 'Genera ora la domanda.' },
                  ],
                  needsWebSearch: false,
                }),
              }),
              new Promise(r => setTimeout(r, 3000)),
            ])
            let generatedTopic = ''
            if (res.ok && res.body) {
              const reader = res.body.getReader()
              const decoder = new TextDecoder()
              let buf = ''
              while (true) {
                const { done, value } = await reader.read()
                if (value) buf += decoder.decode(value, { stream: true })
                const lines = buf.split('\n'); buf = lines.pop() ?? ''
                for (const line of lines) {
                  if (!line.startsWith('data: ')) continue
                  const d = line.slice(6).trim()
                  if (d === '[DONE]') break
                  try { const p = JSON.parse(d); if (p.text) generatedTopic += p.text } catch {}
                }
                if (done) break
              }
            }
            const finalTopic = generatedTopic.trim().replace(/^["']|["']$/g, '') || aiTopicPool[aiTopicIndex]
            setTopic(finalTopic)
            setUserSide(Math.random() < 0.5 ? 'attack' : 'defend')
            setDiceRolling(false)
            setDiceLanding(true)
            setTimeout(() => { setDiceLanding(false); setTopicRevealed(true) }, 520)
          } catch {
            await new Promise(r => setTimeout(r, 3000))
            setTopic(aiTopicPool[aiTopicIndex])
            setUserSide(Math.random() < 0.5 ? 'attack' : 'defend')
            setDiceRolling(false)
            setDiceLanding(true)
            setTimeout(() => { setDiceLanding(false); setTopicRevealed(true) }, 520)
          }
        }
        return (
          <div className="flex flex-col h-full px-5 pt-5 pb-6 gap-6">
            <div className="text-center">
              <div className="text-2xl font-black text-white mb-1">L'AI sceglie il tema</div>
              <div className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {topicRevealed ? 'Ecco il tuo argomento e ruolo.' : 'Tocca il dado per scoprire argomento e ruolo.'}
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-3">
                <button onClick={handleRoll} disabled={topicRevealed || diceRolling}
                  className="flex items-center justify-center rounded-full"
                  style={{ width: 130, height: 130, background: topicRevealed ? 'rgba(124,58,237,0.12)' : 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(59,130,246,0.2))', border: `2px solid ${topicRevealed ? 'rgba(124,58,237,0.15)' : 'rgba(167,139,250,0.4)'}`, cursor: topicRevealed ? 'default' : 'pointer', flexShrink: 0 }}>
                  <span style={{ fontSize: 56, display: 'block', animation: diceRolling ? 'dice-emoji-spin 0.4s linear infinite' : diceLanding ? 'dice-emoji-land 0.5s cubic-bezier(0.22,1,0.36,1) forwards' : topicRevealed ? 'none' : 'dice-emoji-idle 3s ease-in-out infinite' }}>&#127922;</span>
                </button>
                {topicRevealed && (
                  <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700, fontSize: 13, letterSpacing: '0.28em', color: 'rgba(167,139,250,0.85)' }}>
                    ALEA IACTA EST!
                  </div>
                )}
                {!topicRevealed && !diceRolling && (
                  <div className="text-[12px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Tocca per lanciare</div>
                )}
              </div>
              {topicRevealed && (
                <div className="w-full flex flex-col gap-3 scale-in">
                  <div className="w-full px-5 py-4 rounded-3xl text-center" style={{ background: 'rgba(59,130,246,0.12)', border: '1.5px solid rgba(59,130,246,0.3)' }}>
                    <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(100,160,255,0.8)' }}>Argomento</div>
                    <div className="text-[17px] font-black text-white leading-snug">"{topic}"</div>
                  </div>
                  <div className="w-full px-5 py-4 rounded-3xl text-center" style={{ background: userSide === 'attack' ? 'rgba(239,68,68,0.12)' : 'rgba(16,163,127,0.12)', border: `1.5px solid ${userSide === 'attack' ? 'rgba(239,68,68,0.35)' : 'rgba(16,163,127,0.35)'}` }}>
                    <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: userSide === 'attack' ? '#f87171' : '#34d399' }}>Il tuo ruolo</div>
                    <div className="text-xl font-black text-white">{userSide === 'attack' ? 'Attacca' : 'Difendi'}</div>
                    <div className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{userSide === 'attack' ? 'Devi smontare la tesi' : 'Devi sostenere la tesi'}</div>
                  </div>
                </div>
              )}
            </div>
            {topicRevealed && (
              <button onClick={() => { SFX.click(); setStep('teams') }} className="w-full py-4 rounded-2xl font-bold text-white text-[15px] transition-all active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', boxShadow: '0 4px 20px rgba(59,130,246,0.35)' }}>
                Avanti
              </button>
            )}
          </div>
        )
      })()}

      {/* ── STEP 2: Scegli il tuo AI ── */}
      {step === 'teams' && (
        <div className="flex flex-col h-full px-4 pt-3 pb-4 gap-3" style={{ minHeight: '100%' }}>
          <div className="px-4 py-2.5 rounded-2xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="text-[9px] text-white/30 uppercase tracking-widest mb-0.5">Argomento</div>
            <div className="text-[12px] font-semibold text-white/75 leading-snug truncate">"{topic}"</div>
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-widest flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Scegli il tuo alleato AI
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3" style={{ minHeight: 0 }}>
            {AI_OPTIONS.map(ai => {
              const isSelected = teamAAI === ai.id
              return (
                <button key={ai.id} onClick={() => { SFX.click(); setTeamAAI(ai.id) }}
                  className="flex flex-col items-center justify-center gap-2 rounded-3xl transition-all active:scale-[0.97] p-4"
                  style={{ background: isSelected ? `${ai.color}18` : 'rgba(255,255,255,0.04)', border: isSelected ? `2px solid ${ai.color}60` : '1px solid rgba(255,255,255,0.08)', boxShadow: isSelected ? `0 0 20px ${ai.color}25` : 'none' }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-lg flex-shrink-0" style={{ background: ai.color, boxShadow: isSelected ? `0 0 16px ${ai.color}55` : 'none' }}>
                    {ai.id === 'gemini' ? 'Ge' : ai.name[0]}
                  </div>
                  <div className="font-bold text-[14px] text-center" style={{ color: isSelected ? 'white' : 'rgba(255,255,255,0.6)' }}>{ai.name}</div>
                  <div className="text-[10px] text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>{AI_DESC[ai.id].split(' · ')[1]}</div>
                </button>
              )
            })}
          </div>
          <div className="flex-shrink-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.2)' }}>Round</div>
            <div className="flex gap-1.5">
              {[3, 5, 7, 9, 11].map(r => (
                <button key={r} onClick={() => { SFX.click(); setMaxRoundsChoice(r) }} className="flex-1 h-9 rounded-xl font-black text-sm transition-all active:scale-95"
                  style={{ background: maxRoundsChoice === r ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)', border: maxRoundsChoice === r ? '2px solid rgba(99,102,241,0.6)' : '1px solid rgba(255,255,255,0.08)', color: maxRoundsChoice === r ? 'white' : 'rgba(255,255,255,0.35)' }}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          {mode === 'solo' ? (
            <button onClick={() => { SFX.click(); handleCreateSolo() }} disabled={creating}
              className="flex-shrink-0 w-full py-4 rounded-2xl font-bold text-white text-[15px] disabled:opacity-50 transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #7C3AED)', boxShadow: '0 4px 24px rgba(99,102,241,0.35)' }}>
              Avvia la roulette
            </button>
          ) : (
            <button onClick={() => { SFX.click(); handleCreateAmico() }} disabled={creating}
              className="flex-shrink-0 w-full py-4 rounded-2xl font-bold text-white text-[15px] disabled:opacity-50 transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #ef4444, #7C3AED)', boxShadow: '0 4px 24px rgba(239,68,68,0.3)' }}>
              {creating ? 'Creo la stanza...' : 'Genera codice'}
            </button>
          )}
        </div>
      )}

      {/* ── STEP 3 (solo): Roulette ── */}
      {step === 'roulette' && (
        <div className="flex flex-col px-5 pt-8 pb-6 min-h-full">
          <RouletteScreen teamAAI={teamAAI} rouletteSlots={rouletteSlots} rouletteSettled={rouletteSettled} arbiter={arbiter} ready={rouletteReady} onContinue={() => setStep('share')} />
        </div>
      )}

      {/* ── STEP FINALE: share / start ── */}
      {step === 'share' && (
        <div className="flex flex-col px-5 pt-6 pb-6 gap-5">
          <div>
            <div className="text-2xl font-black text-white mb-1">
              {mode === 'amico' ? 'Stanza pronta.' : 'Partita pronta.'}
            </div>
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {mode === 'amico' ? 'Condividi il codice con il tuo avversario.' : 'Inizia quando vuoi.'}
            </div>
          </div>

          {/* Squadre */}
          <div className="flex gap-3">
            <div className="flex-1 rounded-2xl p-4" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-2">SQUADRA A</div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-black flex-shrink-0" style={{ background: '#3b82f6' }}>{teamAHuman[0]?.toUpperCase()}</div>
                <div className="text-[12px] font-semibold text-white/75 truncate">{teamAHuman}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-black flex-shrink-0" style={{ background: AI_COLOR[teamAAI] }}>{teamAAI === 'gemini' ? 'Ge' : AI_NAMES[teamAAI][0]}</div>
                <div className="text-[11px] text-white/40">{AI_NAMES[teamAAI]}</div>
              </div>
            </div>
            <div className="flex items-center text-white/20 font-black text-sm flex-shrink-0">vs</div>
            <div className="flex-1 rounded-2xl p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-2">SQUADRA B</div>
              {mode === 'amico' ? (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 animate-pulse" style={{ background: '#ef4444', color: 'white' }}>?</div>
                  <div className="text-[11px] text-red-400 font-semibold">In attesa...</div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-black flex-shrink-0" style={{ background: AI_COLOR[teamBAI] }}>{teamBAI === 'gemini' ? 'Ge' : AI_NAMES[teamBAI][0]}</div>
                    <div className="text-[11px] text-white/60">{AI_NAMES[teamBAI]}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-black flex-shrink-0" style={{ background: AI_COLOR[teamBAI2] }}>{teamBAI2 === 'gemini' ? 'Ge' : AI_NAMES[teamBAI2][0]}</div>
                    <div className="text-[11px] text-white/40">{AI_NAMES[teamBAI2]}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Codice invito — solo mode amico */}
          {mode === 'amico' && (
            <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(167,139,250,0.25)' }}>
              <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(167,139,250,0.7)' }}>Codice invito</div>
              {roomCode ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-black text-2xl tracking-widest text-white">{roomCode}</span>
                    <div className="flex gap-2">
                      {typeof navigator !== 'undefined' && 'share' in navigator && (
                        <button onClick={handleNativeShare}
                          className="px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all active:scale-95"
                          style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', color: '#A78BFA' }}>
                          Condividi
                        </button>
                      )}
                      <button onClick={handleCopy}
                        className="px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all active:scale-95"
                        style={{ background: copied ? 'rgba(16,163,127,0.2)' : 'rgba(167,139,250,0.12)', border: `1px solid ${copied ? 'rgba(16,163,127,0.4)' : 'rgba(167,139,250,0.25)'}`, color: copied ? '#34d399' : '#A78BFA' }}>
                        {copied ? 'Copiato' : 'Copia link'}
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>{shareLink}</div>
                </>
              ) : (
                <div className="flex items-center gap-2 py-1">
                  {[0, 100, 200].map(d => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                  <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Generazione codice...</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => {
              const startConfig = {
                topic: topic.trim(),
                mode: mode as 'solo' | 'amico',
                teamA: { humanName: teamAHuman, aiId: teamAAI },
                teamB: { aiId1: teamBAI, aiId2: teamBAI2 },
                arbiterAiId: arbiter,
                maxRounds: maxRoundsChoice,
                roomCode,
                roomId,
                teamASide: userSide,
              }
              if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
                setDesktopTransition('exit')
                setTimeout(() => { setDesktopTransition('done'); onStart(startConfig) }, 500)
              } else {
                onStart(startConfig)
              }
            }}
            className="w-full py-4 rounded-2xl font-bold text-white text-[15px] transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
            {mode === 'amico' ? "Inizia e aspetta l'avversario" : 'Inizia!'}
          </button>
        </div>
      )}
    </>
  )

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
    <div className="fixed z-[9999] flex flex-col" style={{ background: '#07070f', top: 'calc(-1 * env(safe-area-inset-top, 0px))', bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))', left: 0, right: 0, paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

      {/* ── LAYOUT MOBILE ── */}
      <div className="lg:hidden flex flex-col h-full">
        <div className="flex-shrink-0 flex items-center gap-3 px-4 border-b"
          style={{ paddingTop: 'max(14px, env(safe-area-inset-top))', paddingBottom: '12px', backgroundColor: 'rgba(7,7,15,0.97)', borderColor: 'rgba(255,255,255,0.07)' }}>
          {backBtn}
          <div className="flex-1 text-center">
            <div className="font-black text-[15px]"><span className="text-white">Ai</span><span style={{ color: '#A78BFA' }}>GORÀ</span></div>
            <div className="text-[11px] text-white/30">2 vs 2</div>
          </div>
          {progressDots}
        </div>
        <div className={`flex-1 ${step === 'mode' || step === 'topic' || step === 'teams' ? 'overflow-hidden' : 'overflow-y-auto'}`}
          style={{ paddingBottom: step === 'mode' || step === 'topic' || step === 'teams' ? 0 : 'max(20px, env(safe-area-inset-bottom))' }}>
          {stepContent}
        </div>
      </div>

      {/* ── LAYOUT DESKTOP: cornice iPad ── */}
      <div className="hidden lg:flex flex-1 items-center justify-center"
        style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(124,58,237,0.12) 0%, transparent 70%)' }}>
        <div style={{
          position: 'relative', width: 1024, height: 680,
          transition: 'opacity 0.45s ease, transform 0.45s ease',
          opacity: desktopTransition === 'exit' ? 0 : 1,
          transform: desktopTransition === 'exit' ? 'scale(0.92)' : 'scale(1)',
          pointerEvents: desktopTransition === 'exit' ? 'none' : 'auto',
        }}>
          {/* Corpo iPad */}
          <div className="absolute inset-0 rounded-[28px]"
            style={{ background: '#1a1a1e', boxShadow: '0 0 0 1.5px #3a3a3c, 0 40px 120px rgba(0,0,0,0.8), 0 0 0 0.5px #555 inset' }} />
          <div className="absolute rounded-full" style={{ right: -4, top: '50%', transform: 'translateY(-50%)', width: 8, height: 56, background: '#2a2a2e', boxShadow: '0 0 0 1px #444' }} />
          <div className="absolute rounded-full" style={{ left: -4, top: '28%', width: 6, height: 36, background: '#2a2a2e', boxShadow: '0 0 0 1px #444' }} />
          <div className="absolute rounded-full" style={{ left: -4, top: '42%', width: 6, height: 56, background: '#2a2a2e', boxShadow: '0 0 0 1px #444' }} />
          <div className="absolute rounded-full" style={{ top: '50%', left: 14, transform: 'translateY(-50%)', width: 8, height: 8, background: '#2d2d30', border: '1.5px solid #444' }} />

          {/* Schermo */}
          <div className="absolute overflow-hidden flex flex-col"
            style={{ top: 10, left: 36, right: 10, bottom: 10, borderRadius: 20, background: '#07070f' }}>

            {/* Status bar iPad */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-2"
              style={{ background: 'rgba(7,7,15,0.97)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3">
                {backBtn}
                <div className="font-black text-sm"><span className="text-white">Ai</span><span style={{ color: '#A78BFA' }}>GORÀ</span></div>
                <div className="text-[11px] text-white/30">· 2 vs 2</div>
              </div>
              <div className="text-[11px] font-semibold text-white/40">
                {step === 'mode' ? 'Modalita' : step === 'topic' ? 'Tema' : step === 'teams' ? 'Squadre' : step === 'roulette' ? 'Roulette' : 'Partita pronta'}
              </div>
              {progressDots}
            </div>

            {/* Contenuto step — share ha layout dedicato su desktop */}
            {step === 'share' ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 flex flex-col items-center justify-center px-12 gap-5">
                  <div className="text-center">
                    <div className="text-4xl font-black text-white tracking-tight">
                      {mode === 'amico' ? 'Stanza pronta.' : 'Partita pronta.'}
                    </div>
                    <div className="text-base mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {mode === 'amico' ? 'Condividi il codice con il tuo avversario.' : 'Inizia quando vuoi.'}
                    </div>
                  </div>

                  {/* Codice invito — solo amico */}
                  {mode === 'amico' && (
                    <div className="w-full rounded-2xl px-6 py-4 flex items-center justify-between gap-6"
                      style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(167,139,250,0.3)' }}>
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(167,139,250,0.7)' }}>Codice invito</div>
                        {roomCode ? (
                          <>
                            <div className="font-black text-3xl tracking-widest text-white">{roomCode}</div>
                            <div className="text-[11px] mt-1 truncate max-w-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{shareLink}</div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 py-1">
                            {[0, 100, 200].map(d => (
                              <span key={d} className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {typeof navigator !== 'undefined' && 'share' in navigator && (
                          <button onClick={handleNativeShare}
                            className="px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
                            style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.35)', color: '#A78BFA' }}>
                            Condividi
                          </button>
                        )}
                        <button onClick={handleCopy} disabled={!roomCode}
                          className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-40"
                          style={{ background: copied ? 'rgba(16,163,127,0.2)' : 'rgba(167,139,250,0.15)', border: `1px solid ${copied ? 'rgba(16,163,127,0.4)' : 'rgba(167,139,250,0.35)'}`, color: copied ? '#34d399' : '#A78BFA' }}>
                          {copied ? 'Copiato' : 'Copia link'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Squadre */}
                  <div className="w-full flex items-stretch gap-0">
                    <div className="flex-1 rounded-3xl p-6 flex flex-col gap-3" style={{ background: 'rgba(59,130,246,0.1)', border: '2px solid rgba(59,130,246,0.3)' }}>
                      <div className="text-[11px] font-black uppercase tracking-widest" style={{ color: '#60a5fa' }}>Squadra A</div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-base flex-shrink-0" style={{ background: '#3b82f6' }}>{teamAHuman[0]?.toUpperCase()}</div>
                        <div className="text-xl font-black text-white">{teamAHuman}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-base flex-shrink-0" style={{ background: AI_COLOR[teamAAI] }}>{teamAAI === 'gemini' ? 'Ge' : AI_NAMES[teamAAI][0]}</div>
                        <div className="text-xl font-black" style={{ color: AI_COLOR[teamAAI] }}>{AI_NAMES[teamAAI]}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center px-6">
                      <div className="text-3xl font-black" style={{ color: 'rgba(255,255,255,0.2)' }}>VS</div>
                    </div>
                    <div className="flex-1 rounded-3xl p-6 flex flex-col gap-3" style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)' }}>
                      <div className="text-[11px] font-black uppercase tracking-widest" style={{ color: '#f87171' }}>Squadra B</div>
                      {mode === 'amico' ? (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-base flex-shrink-0 animate-pulse" style={{ background: '#ef4444' }}>?</div>
                          <div className="text-xl font-black text-red-400">In attesa...</div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-base flex-shrink-0" style={{ background: AI_COLOR[teamBAI] }}>{teamBAI === 'gemini' ? 'Ge' : AI_NAMES[teamBAI][0]}</div>
                            <div className="text-xl font-black" style={{ color: AI_COLOR[teamBAI] }}>{AI_NAMES[teamBAI]}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-base flex-shrink-0" style={{ background: AI_COLOR[teamBAI2] }}>{teamBAI2 === 'gemini' ? 'Ge' : AI_NAMES[teamBAI2][0]}</div>
                            <div className="text-xl font-black" style={{ color: AI_COLOR[teamBAI2] }}>{AI_NAMES[teamBAI2]}</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottone fisso alla base */}
                <div className="flex-shrink-0 px-8 pb-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    onClick={() => {
                      const startConfig = { topic: topic.trim(), teamA: { humanName: teamAHuman, aiId: teamAAI }, teamB: { aiId1: teamBAI, aiId2: teamBAI2 }, arbiterAiId: arbiter, maxRounds: maxRoundsChoice, roomCode, roomId, teamASide: userSide }
                      setDesktopTransition('exit')
                      setTimeout(() => { setDesktopTransition('done'); onStart(startConfig) }, 500)
                    }}
                    className="w-full py-5 rounded-2xl font-black text-white text-xl transition-all hover:scale-[1.01] active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', boxShadow: '0 6px 30px rgba(124,58,237,0.5)' }}>
                    {mode === 'amico' ? "Inizia e aspetta l'avversario" : 'Inizia!'}
                  </button>
                </div>
              </div>
            ) : (
              <div className={`flex-1 ${step === 'mode' || step === 'topic' || step === 'teams' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                {stepContent}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
    </>
  )
}
