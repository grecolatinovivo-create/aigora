'use client'
import { useState, useEffect, useRef } from 'react'
import { AI_OPTIONS, AI_NAMES, AI_COLOR } from '@/app/lib/aiProfiles'
import { SFX } from '@/app/lib/audioEngine'
import type { TwoVsTwoState } from '@/app/types/aigora'

export default function TwoVsTwoScreen({ state, onHumanMessage, onRequestAI, loading, myTeam, onBack, onNewGame, onMultiplayer, onRoundBanner }: {
  state: TwoVsTwoState
  onHumanMessage: (text: string) => void
  onRequestAI: (team: 'A' | 'B') => void
  loading: boolean
  myTeam: 'A' | 'B'
  onBack: () => void
  onNewGame?: () => void
  onMultiplayer?: () => void
  onRoundBanner?: (round: number | null) => void
}) {
  const [input, setInput] = useState('')
  const [flashWinner, setFlashWinner] = useState<'A' | 'B' | null>(null)
  const [roundBanner, setRoundBanner] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { config } = state
  const prevScoreFlashAt = useRef<number | undefined>(undefined)
  const prevRound = useRef<number>(0)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [state.messages])

  // Banner ROUND N fullscreen quando il round avanza (dopo la progress bar del padre)
  useEffect(() => {
    if (state.round !== prevRound.current && !state.ended) {
      prevRound.current = state.round
      setRoundBanner(state.round)
      onRoundBanner?.(state.round)
      SFX.roundGong()
      const t = setTimeout(() => { setRoundBanner(null); onRoundBanner?.(null) }, 2200)
      return () => clearTimeout(t)
    }
  }, [state.round, state.ended])

  // Flash punteggio quando viene assegnato
  useEffect(() => {
    if (state.scoreFlashAt && state.scoreFlashAt !== prevScoreFlashAt.current && state.showScoreFlash) {
      prevScoreFlashAt.current = state.scoreFlashAt
      setFlashWinner(state.showScoreFlash)
      if (state.showScoreFlash === 'A') SFX.pointA()
      else if (state.showScoreFlash === 'B') SFX.pointB()
      const t = setTimeout(() => setFlashWinner(null), 2000)
      return () => clearTimeout(t)
    }
  }, [state.scoreFlashAt, state.showScoreFlash])

  const isMyTurn = state.currentTurn === myTeam && !loading && !state.ended
  const myColor = myTeam === 'A' ? '#3b82f6' : '#ef4444'
  const theirColor = myTeam === 'A' ? '#ef4444' : '#3b82f6'
  const myAiId = myTeam === 'A' ? config.teamA.aiId : config.teamB.aiId1
  const myName = myTeam === 'A' ? config.teamA.humanName : "Squadra B"
  const theirName = myTeam === 'A' ? "Squadra B" : config.teamA.humanName

  // Schermata suspense — l'arbitro sta deliberando
  if (state.ended && !state.verdict) {
    const arbAI = AI_OPTIONS.find(a => a.id === config.arbiterAiId)
    const arbColor = AI_COLOR[config.arbiterAiId] ?? '#A78BFA'
    return (
      <div className="flex flex-col h-full relative overflow-hidden" style={{ background: '#07070f', paddingTop: 'max(0px, env(safe-area-inset-top))' }}>
        {/* Sfondo fiamme spente — brace */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(120,30,0,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8 relative z-10">
          {/* Orbe arbitro pulsante */}
          <div className="relative flex items-center justify-center">
            {/* Anelli concentrici */}
            <div className="absolute w-32 h-32 rounded-full suspense-orb" style={{ background: `radial-gradient(circle, ${arbColor}22 0%, transparent 70%)`, border: `1px solid ${arbColor}30` }} />
            <div className="absolute w-24 h-24 rounded-full suspense-orb" style={{ background: `radial-gradient(circle, ${arbColor}30 0%, transparent 70%)`, border: `1px solid ${arbColor}40`, animationDelay: '0.4s', animationDirection: 'reverse' }} />
            {/* Avatar arbitro */}
            <div className="w-16 h-16 rounded-full flex items-center justify-center font-black text-white text-xl suspense-pulse"
              style={{ background: `linear-gradient(135deg, ${arbColor}, ${arbColor}88)`, boxShadow: `0 0 24px ${arbColor}55`, fontSize: 28 }}>
              {config.arbiterAiId === 'gemini' ? '✦' : arbAI?.name[0] ?? '⚖'}
            </div>
          </div>

          {/* Testo di attesa */}
          <div className="text-center flex flex-col gap-2">
            <div className="font-black text-white text-lg leading-tight">
              {AI_NAMES[config.arbiterAiId]}
            </div>
            <div className="text-white/40 text-sm">sta deliberando il verdetto…</div>
          </div>

          {/* Separatore con score A — B in grigio */}
          <div className="flex items-center gap-4 w-full max-w-xs">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(59,130,246,0.5)' }}>A</div>
                <div className="text-lg font-black" style={{ color: 'rgba(255,255,255,0.15)' }}>?</div>
              </div>
              <div className="text-xs text-white/15 font-black">—</div>
              <div className="text-center">
                <div className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(239,68,68,0.5)' }}>B</div>
                <div className="text-lg font-black" style={{ color: 'rgba(255,255,255,0.15)' }}>?</div>
              </div>
            </div>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Loader a punti */}
          <div className="flex gap-2">
            {[0, 200, 400].map(d => (
              <span key={d} className="w-2 h-2 rounded-full" style={{ background: arbColor, animation: `suspense-pulse 1.4s ease-in-out infinite`, animationDelay: `${d}ms` }} />
            ))}
          </div>

          {/* Quote topic */}
          <div className="text-center px-4">
            <div className="text-[10px] text-white/20 italic">"{config.topic}"</div>
          </div>
        </div>
      </div>
    )
  }

  // Schermata verdetto finale
  if (state.ended && state.verdict) {
    const scoreA = state.scoreA ?? 0
    const scoreB = state.scoreB ?? 0
    const winnerA = scoreA > scoreB
    const winnerB = scoreB > scoreA
    const draw = scoreA === scoreB
    const arbColor = AI_COLOR[config.arbiterAiId] ?? '#A78BFA'

    return (
      <div className="flex flex-col h-full relative overflow-hidden" style={{ background: '#07070f' }}>
        {/* Sfondo brace/cenere */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 60% at 50% 100%, rgba(80,20,0,0.3) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {/* Header */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 relative z-10"
          style={{ paddingTop: 'max(14px, env(safe-area-inset-top))', paddingBottom: '12px', background: 'rgba(7,7,15,0.85)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}>
          <button onClick={() => { SFX.click(); onBack() }} className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="font-black text-white text-sm">Verdetto finale</div>
          <div className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${arbColor}20`, color: arbColor, border: `1px solid ${arbColor}40` }}>
            {AI_NAMES[config.arbiterAiId]}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative z-10" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
          <div className="flex flex-col items-center px-5 py-6 gap-5">

            {/* Punteggi animati */}
            <div className="verdict-reveal w-full">
              <div className="flex items-stretch gap-3 mb-3">
                {/* Squadra A */}
                <div className={`flex-1 rounded-2xl p-4 flex flex-col items-center gap-2 relative overflow-hidden${winnerA ? ' winner-glow' : ''}`}
                  style={{
                    background: winnerA ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.06)',
                    border: winnerA ? '2px solid rgba(59,130,246,0.6)' : '1px solid rgba(59,130,246,0.2)',
                  }}>
                  {winnerA && <div className="absolute top-2 right-2 text-base">🏆</div>}
                  <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#60a5fa' }}>SQUADRA A</div>
                  <div className="score-pop text-4xl font-black" style={{ color: winnerA ? '#fff' : 'rgba(255,255,255,0.5)', animationDelay: '0.3s' }}>{scoreA}</div>
                  <div className="text-[10px] text-white/40 truncate max-w-full">{config.teamA.humanName}</div>
                  <div className="text-[9px]" style={{ color: `${AI_COLOR[config.teamA.aiId]}80` }}>+ {AI_NAMES[config.teamA.aiId]}</div>
                </div>

                {/* Centro */}
                <div className="flex flex-col items-center justify-center gap-1 flex-shrink-0">
                  <div className="text-white/20 text-xs font-black">vs</div>
                  {draw && <div className="text-[9px] text-white/30 font-bold">pari</div>}
                </div>

                {/* Squadra B */}
                <div className={`flex-1 rounded-2xl p-4 flex flex-col items-center gap-2 relative overflow-hidden${winnerB ? ' winner-glow' : ''}`}
                  style={{
                    background: winnerB ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.06)',
                    border: winnerB ? '2px solid rgba(239,68,68,0.6)' : '1px solid rgba(239,68,68,0.2)',
                  }}>
                  {winnerB && <div className="absolute top-2 right-2 text-base">🏆</div>}
                  <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#f87171' }}>SQUADRA B</div>
                  <div className="score-pop text-4xl font-black" style={{ color: winnerB ? '#fff' : 'rgba(255,255,255,0.5)', animationDelay: '0.5s' }}>{scoreB}</div>
                  <div className="text-[10px] text-white/40">AI</div>
                  <div className="text-[9px]" style={{ color: `${AI_COLOR[config.teamB.aiId1]}80` }}>+ {AI_NAMES[config.teamB.aiId1]}</div>
                </div>
              </div>

              {/* Round per round */}
              {state.roundScores && state.roundScores.length > 0 && (
                <div className="flex gap-1.5 justify-center flex-wrap">
                  {state.roundScores.sort((a, b) => a.round - b.round).map(rs => (
                    <div key={rs.round} className="flex flex-col items-center gap-0.5">
                      <div className="text-[8px] text-white/25">R{rs.round}</div>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black"
                        style={{
                          background: rs.winner === 'A' ? 'rgba(59,130,246,0.3)' : rs.winner === 'B' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)',
                          border: rs.winner === 'A' ? '1px solid rgba(59,130,246,0.6)' : rs.winner === 'B' ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.2)',
                          color: rs.winner === 'A' ? '#60a5fa' : rs.winner === 'B' ? '#f87171' : 'rgba(255,255,255,0.4)',
                        }}>
                        {rs.winner === 'draw' ? '=' : rs.winner}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Titolo vincitore */}
            <div className="fade-up text-center" style={{ animationDelay: '0.5s', opacity: 0 }}>
              {draw ? (
                <div className="text-white/60 font-bold text-sm">Pareggio perfetto ⚖️</div>
              ) : (
                <div>
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Ha vinto</div>
                  <div className="font-black text-white text-base">{winnerA ? config.teamA.humanName : 'Squadra B'}</div>
                </div>
              )}
            </div>

            {/* Divisore */}
            <div className="w-full flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: `${arbColor}30` }} />
              <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: arbColor }}>⚖ {AI_NAMES[config.arbiterAiId]}</div>
              <div className="flex-1 h-px" style={{ background: `${arbColor}30` }} />
            </div>

            {/* Testo verdetto */}
            <div className="fade-up w-full rounded-2xl p-4" style={{ background: `${arbColor}0d`, border: `1px solid ${arbColor}25`, animationDelay: '0.7s', opacity: 0 }}>
              <div className="text-sm text-white/80 leading-relaxed">{state.verdict}</div>
            </div>

            {/* Topic */}
            <div className="text-[10px] text-white/20 italic text-center px-2">"{config.topic}"</div>

            {/* CTA */}
            <div className="fade-up w-full flex flex-col gap-3" style={{ animationDelay: '1s', opacity: 0 }}>
              <button onClick={() => { SFX.click(); onNewGame?.() }}
                className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #7C3AED)', boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}>
                Nuova sfida 2v2
              </button>
              <button onClick={() => { SFX.click(); onMultiplayer?.() }}
                className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                Multiplayer
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Schermata di attesa (B non ancora entrato)
  if (state.waitingForOpponent) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-6 px-6" style={{ background: '#07070f' }}>
        <div className="text-4xl">⏳</div>
        <div className="text-white font-black text-xl text-center">Aspettando l'avversario…</div>
        <div className="text-white/40 text-sm text-center">Condividi il codice con la squadra B. La partita inizia appena entra.</div>
        <div className="px-6 py-4 rounded-2xl text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Codice</div>
          <div className="text-3xl font-black text-white tracking-widest">{config.roomCode ?? '—'}</div>
        </div>
        <div className="flex gap-1">{[0,150,300].map(d => <span key={d} className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full relative overflow-hidden" style={{ background: '#0d0d14' }}>
      {/* Sfondo fiamme */}
      <div className="flame-bg" />
      <div className="flame-overlay" />

      {/* ── BANNER ROUND ── */}
      {roundBanner && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div style={{ animation: 'round-banner 2.2s ease forwards' }}>
            <div className="flex flex-col items-center gap-1">
              <div className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40">Inizia il</div>
              <div className="text-6xl font-black text-white tracking-tight" style={{ textShadow: '0 0 40px rgba(99,102,241,0.8), 0 0 80px rgba(99,102,241,0.4)' }}>ROUND {roundBanner}</div>
              <div className="flex gap-1.5 mt-2">
                {Array.from({ length: state.maxRounds }).map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full" style={{ background: i < roundBanner ? 'rgba(99,102,241,0.9)' : 'rgba(255,255,255,0.15)' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FLASH PUNTEGGIO ── */}
      {flashWinner && (
        <div className="absolute inset-x-0 top-0 z-50 flex items-center justify-center pointer-events-none" style={{ paddingTop: 'max(70px, calc(env(safe-area-inset-top) + 60px))' }}>
          <div className="px-6 py-3 rounded-2xl text-center animate-bounce" style={{ background: flashWinner === 'A' ? 'rgba(59,130,246,0.95)' : 'rgba(239,68,68,0.95)', boxShadow: `0 0 30px ${flashWinner === 'A' ? '#3b82f6' : '#ef4444'}88` }}>
            <div className="text-white font-black text-lg">+1 PUNTO SQUADRA {flashWinner}!</div>
            <div className="text-white/80 text-sm">{flashWinner === 'A' ? config.teamA.humanName : 'Squadra B'}</div>
          </div>
        </div>
      )}

      {/* ── HEADER: A vs B con round ── */}
      <div className="flex-shrink-0 relative z-10" style={{ paddingTop: 'max(10px, env(safe-area-inset-top))', background: 'rgba(7,7,15,0.85)', borderBottom: '1px solid rgba(255,80,0,0.15)', backdropFilter: 'blur(20px)' }}>
        {/* Barra A vs B */}
        <div className="flex items-center px-3 pb-2 pt-1 gap-2">
          <button onClick={() => { SFX.click(); onBack() }} className="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>

          {/* Squadra A */}
          <div className="flex-1 flex flex-col items-start gap-0.5">
            <div className="text-[8px] font-black uppercase tracking-wide" style={{ color: '#60a5fa' }}>A</div>
            <div className="text-[10px] font-bold text-white truncate max-w-[70px]">{config.teamA.humanName}</div>
            <div className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>+ {AI_NAMES[config.teamA.aiId]}</div>
          </div>

          {/* Centro — score + round */}
          <div className="flex flex-col items-center flex-shrink-0 px-2">
            {/* Score principale */}
            <div className="flex items-center gap-2">
              <span className="text-xl font-black leading-none" style={{ color: state.showScoreFlash === 'A' ? '#fff' : '#60a5fa', transition: 'color 0.3s' }}>{state.scoreA ?? 0}</span>
              <span className="text-[10px] text-white/20 font-bold">—</span>
              <span className="text-xl font-black leading-none" style={{ color: state.showScoreFlash === 'B' ? '#fff' : '#f87171', transition: 'color 0.3s' }}>{state.scoreB ?? 0}</span>
            </div>
            <div className="text-[9px] text-white/30 mt-0.5">Round {state.round}/{state.maxRounds}</div>
            {/* Indicatore turno */}
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: state.currentTurn === 'A' ? '#3b82f6' : '#ef4444' }} />
              <span className="text-[9px] font-black" style={{ color: state.currentTurn === 'A' ? '#3b82f6' : '#ef4444' }}>
                {state.currentTurn}
              </span>
            </div>
          </div>

          {/* Squadra B */}
          <div className="flex-1 flex flex-col items-end gap-0.5">
            <div className="text-[8px] font-black uppercase tracking-wide" style={{ color: '#f87171' }}>B</div>
            <div className="text-[10px] font-bold text-white truncate max-w-[70px]">{AI_NAMES[config.teamB.aiId1]}</div>
            <div className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>+ {AI_NAMES[config.teamB.aiId2]}</div>
          </div>
        </div>

        {/* Topic */}
        <div className="px-4 pb-2">
          <div className="text-[9px] text-center text-white/30 truncate">"{config.topic}"</div>
        </div>
      </div>

      {/* ── MESSAGGI ── */}
      <div className="flex-1 overflow-y-auto py-3 pb-4 px-3 flex flex-col gap-2 relative z-10" style={{ minHeight: 0 }}>
        {state.messages.map((msg, i) => {
          const isA = msg.team === 'A'
          const isArbiter = msg.team === 'arbiter'
          const isAI = msg.isAI
          const teamColor = isA ? '#3b82f6' : '#ef4444'
          const teamBg = isA ? 'rgba(59,130,246,0.12)' : 'rgba(239,68,68,0.12)'
          const aiColor = AI_COLOR[msg.aiId ?? ''] ?? teamColor

          if (isArbiter) return (
            <div key={i} className="rounded-2xl p-3 mx-1" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
              <div className="text-[8px] font-black uppercase tracking-wide mb-1" style={{ color: '#A78BFA' }}>{AI_NAMES[config.arbiterAiId]} — Verdetto</div>
              <div className="text-xs text-white/80 leading-relaxed">{msg.content}{msg.streaming && <span className="typewriter-cursor" />}</div>
            </div>
          )

          const isRight = !isA
          return (
            <div key={i} className={`flex gap-2 max-w-[86%] ${isRight ? 'flex-row-reverse self-end' : ''}`}>
              {/* Avatar */}
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 mt-0.5"
                style={{ fontSize: 8, background: isAI ? aiColor : teamColor }}>
                {isAI ? (msg.aiId === 'gemini' ? 'Ge' : (AI_NAMES[msg.aiId ?? ''] ?? '?')[0]) : msg.author[0]?.toUpperCase()}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-[8px] font-semibold px-1" style={{ color: isAI ? aiColor : teamColor, textAlign: isRight ? 'right' : 'left' }}>
                  {msg.author}{isAI && <span className="ml-1 text-white/20 font-normal">AI</span>}
                </div>
                <div className="px-3 py-2 text-xs leading-relaxed"
                  style={{ background: isAI ? `${aiColor}18` : teamBg, color: 'rgba(255,255,255,0.85)', borderRadius: isRight ? '12px 3px 12px 12px' : '3px 12px 12px 12px' }}>
                  {msg.streaming && !msg.content ? (
                    <span className="flex gap-1 items-center py-0.5">
                      {[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: aiColor, opacity: 0.6, animationDelay: `${d}ms` }} />)}
                    </span>
                  ) : (
                    <span dangerouslySetInnerHTML={{ __html: msg.content
                      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
                      .replace(/\n/g, '<br/>')
                    }} />
                  )}{msg.streaming && msg.content && <span className="typewriter-cursor" />}
                </div>
              </div>
            </div>
          )
        })}

        {loading && !(state.messages.length > 0 && state.messages[state.messages.length - 1].isAI && state.messages[state.messages.length - 1].streaming) && (
          <div className="flex items-center gap-2 px-2">
            <div className="flex gap-1">{[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</div>
            <span className="text-[10px] text-white/30">L'AI sta pensando…</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── INPUT ── */}
      {!state.ended && (
        <div className="flex-shrink-0 relative z-10" style={{ background: 'rgba(7,7,15,0.9)', borderTop: '1px solid rgba(255,80,0,0.2)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>

          {/* Progress bar conto alla rovescia round */}
          {state.roundProgress != null && (
            <div className="px-4 pt-2 pb-1">
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full" style={{ width: `${(state.roundProgress ?? 0) * 100}%`, background: 'linear-gradient(90deg, #3b82f6, #7C3AED)', transition: 'width 50ms linear' }} />
              </div>
            </div>
          )}

          {/* Banner turno */}
          <div className="px-4 pt-2 pb-1.5">
            {isMyTurn ? (
              <div className="text-[10px] text-center font-bold" style={{ color: myColor }}>
                Il tuo turno
              </div>
            ) : (
              <div className="text-[10px] text-center text-white/30">
                {(() => {
                  const streamingMsg = [...state.messages].reverse().find(m => m.streaming)
                  const speaker = streamingMsg ? streamingMsg.author : (state.currentTurn === 'A' ? config.teamA.humanName : 'Squadra B')
                  return `${speaker} sta rispondendo…`
                })()}
              </div>
            )}
          </div>

          <div className="flex items-end gap-2 px-3 pb-2">
            <textarea value={input} onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && input.trim() && isMyTurn && !loading) { e.preventDefault(); onHumanMessage(input.trim()); setInput(''); (e.target as HTMLTextAreaElement).style.height = 'auto' } }}
              disabled={!isMyTurn || loading}
              placeholder={isMyTurn ? "Il tuo argomento…" : "Attendi il tuo turno…"}
              rows={1}
              className="flex-1 rounded-2xl px-4 py-2.5 text-xs outline-none transition-all resize-none overflow-hidden"
              style={{ background: isMyTurn ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isMyTurn ? `${myColor}50` : 'rgba(255,255,255,0.06)'}`, color: isMyTurn ? '#f0f0f0' : 'rgba(255,255,255,0.25)', cursor: isMyTurn ? 'text' : 'not-allowed', lineHeight: '1.4' }}
            />
            <button onClick={() => { if (input.trim() && isMyTurn && !loading) { onHumanMessage(input.trim()); setInput('') } }}
              disabled={!input.trim() || !isMyTurn || loading}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-20 flex-shrink-0 transition-all mb-0.5"
              style={{ background: isMyTurn ? `linear-gradient(135deg, ${myColor}, ${myColor}bb)` : 'rgba(255,255,255,0.05)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
