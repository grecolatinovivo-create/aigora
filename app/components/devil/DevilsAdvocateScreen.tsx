'use client'
import { useState, useEffect, useRef } from 'react'
import { AI_NAMES, AI_COLOR } from '@/app/lib/aiProfiles'
import type { DevilSession, DevilDifficulty } from '@/app/types/aigora'

const DIFFICULTY_LABELS: Record<DevilDifficulty, { emoji: string; label: string; color: string }> = {
  easy:       { emoji: '🟢', label: 'Facile',      color: '#4ade80' },
  medium:     { emoji: '🟡', label: 'Media',       color: '#facc15' },
  impossible: { emoji: '🔴', label: 'Impossibile', color: '#ef4444' },
}

const SCORE_LABELS: { min: number; label: string; color: string }[] = [
  { min: 8.5, label: 'Difesa leggendaria',   color: '#10A37F' },
  { min: 7,   label: 'Difesa solida',        color: '#34d399' },
  { min: 5,   label: 'Hai resistito',        color: '#facc15' },
  { min: 3,   label: 'Difesa fragile',       color: '#f97316' },
  { min: 0,   label: 'Capitolazione totale', color: '#ef4444' },
]

const PLACEHOLDERS = [
  'Difendi la tua posizione…',
  'Continua a difendere…',
  'Resisti…',
  'Tieni duro…',
  'Non mollare…',
  'Fino in fondo…',
]

function getScoreLabel(score: number) {
  return SCORE_LABELS.find(s => score >= s.min) ?? SCORE_LABELS[SCORE_LABELS.length - 1]
}

function getScoreColor(score: number) {
  if (score >= 7) return '#10A37F'
  if (score >= 5) return '#facc15'
  return '#ef4444'
}

function NoiseOverlay({ round }: { round: number }) {
  const opacity = Math.min(0.06 + round * 0.025, 0.25)
  return (
    <div
      className="absolute inset-0 pointer-events-none z-0"
      style={{
        opacity,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px',
      }}
    />
  )
}

export default function DevilsAdvocateScreen({
  session,
  onMessage,
  onEndTurn,
  onSurrender,
  onStartVerdict,
  onReply,
  onSkipReply,
  onBack,
  loading,
}: {
  session: DevilSession
  onMessage: (text: string) => void
  onEndTurn: () => void
  onSurrender: () => void
  onStartVerdict: () => void
  onReply: (text: string) => void
  onSkipReply: () => void
  onBack: () => void
  loading: boolean
}) {
  const [input, setInput] = useState('')
  const [replyInput, setReplyInput] = useState('')
  const [countdown, setCountdown] = useState(4)
  const [prevScore, setPrevScore] = useState(session.score)
  const [scoreFlash, setScoreFlash] = useState<'up' | 'down' | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const diff = DIFFICULTY_LABELS[session.difficulty]
  const bgColor = '#0d0d14'
  const headerColor = '#111118'
  const placeholder = PLACEHOLDERS[Math.min(session.round - 1, PLACEHOLDERS.length - 1)]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session.messages])

  useEffect(() => {
    if (session.score !== prevScore) {
      setScoreFlash(session.score > prevScore ? 'up' : 'down')
      setPrevScore(session.score)
      const t = setTimeout(() => setScoreFlash(null), 800)
      return () => clearTimeout(t)
    }
  }, [session.score, prevScore])

  useEffect(() => {
    if (session.phase !== 'consulting') return
    setCountdown(4)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); onStartVerdict(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [session.phase])

  // ── CONSULTAZIONE ────────────────────────────────────────────────────────────
  if (session.phase === 'consulting') {
    return (
      <div className="flex flex-col h-full items-center justify-center relative overflow-hidden" style={{ backgroundColor: bgColor }}>
        <NoiseOverlay round={session.round} />
        <div className="relative z-10 flex flex-col items-center gap-6 text-center px-6">
          <div className="text-6xl" style={{ filter: 'drop-shadow(0 0 30px rgba(239,68,68,0.8))' }}>⚖️</div>
          <div className="font-black text-white text-xl">Le AI si stanno consultando…</div>
          <div className="text-7xl font-black" style={{ color: '#ef4444', textShadow: '0 0 40px rgba(239,68,68,0.5)' }}>
            {countdown}
          </div>
          <div className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Il verdetto sta per arrivare</div>
        </div>
      </div>
    )
  }

  // ── VERDETTI ─────────────────────────────────────────────────────────────────
  if (session.phase === 'verdict') {
    return (
      <div className="flex flex-col h-full relative overflow-hidden" style={{ backgroundColor: bgColor }}>
        <NoiseOverlay round={session.round} />
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b relative z-10"
          style={{ backgroundColor: headerColor, borderColor: 'rgba(239,68,68,0.15)' }}>
          <div className="text-base">⚖️</div>
          <div className="font-black text-sm text-white flex-1">Verdetto finale</div>
          <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{session.verdicts.length} / 4 giudici</div>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-4 flex flex-col gap-4 relative z-10">
          {session.verdicts.map((v, i) => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${AI_COLOR[v.aiId]}30` }}>
              <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: `${AI_COLOR[v.aiId]}12` }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-black flex-shrink-0"
                  style={{ backgroundColor: AI_COLOR[v.aiId] }}>
                  {v.aiId === 'gemini' ? 'Ge' : (AI_NAMES[v.aiId] ?? 'A')[0]}
                </div>
                <span className="text-xs font-bold text-white">{AI_NAMES[v.aiId]}</span>
                <div className="flex-1" />
                <span className="text-base font-black" style={{ color: getScoreColor(v.score) }}>{v.score.toFixed(1)}</span>
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>/10</span>
              </div>
              <div className="px-3 py-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {v.text || (
                  <span className="flex gap-1 items-center">
                    {[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                  </span>
                )}
              </div>
            </div>
          ))}
          {Array.from({ length: 4 - session.verdicts.length }).map((_, i) => (
            <div key={`p${i}`} className="rounded-2xl px-4 py-3 flex items-center gap-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-6 h-6 rounded-full bg-white/10 animate-pulse" />
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>In attesa…</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
    )
  }

  // ── PUNTEGGIO FINALE ─────────────────────────────────────────────────────────
  if (session.phase === 'score') {
    const fs = session.finalScore ?? session.score
    const scoreLabel = getScoreLabel(fs)
    return (
      <div className="flex flex-col h-full items-center justify-center relative overflow-hidden" style={{ backgroundColor: bgColor }}>
        <NoiseOverlay round={session.round} />
        <div className="relative z-10 flex flex-col items-center gap-6 text-center px-6 w-full max-w-sm">
          <div className="w-full grid grid-cols-4 gap-2">
            {session.verdicts.map((v, i) => (
              <div key={i} className="flex flex-col items-center gap-1 py-3 rounded-xl"
                style={{ background: `${AI_COLOR[v.aiId]}15`, border: `1px solid ${AI_COLOR[v.aiId]}30` }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-black"
                  style={{ backgroundColor: AI_COLOR[v.aiId] }}>
                  {v.aiId === 'gemini' ? 'Ge' : (AI_NAMES[v.aiId] ?? 'A')[0]}
                </div>
                <div className="text-sm font-black" style={{ color: getScoreColor(v.score) }}>{v.score.toFixed(1)}</div>
              </div>
            ))}
          </div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>↓ media ↓</div>
          <div className="flex flex-col items-center gap-3">
            <div className="text-8xl font-black" style={{ color: scoreLabel.color, textShadow: `0 0 60px ${scoreLabel.color}60` }}>
              {fs.toFixed(1)}
            </div>
            <div className="px-4 py-1.5 rounded-full text-sm font-black"
              style={{ background: `${scoreLabel.color}20`, color: scoreLabel.color, border: `1px solid ${scoreLabel.color}50` }}>
              {scoreLabel.label}
            </div>
          </div>
          <button onClick={onSkipReply}
            className="w-full py-3.5 rounded-2xl font-black text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', boxShadow: '0 4px 20px rgba(220,38,38,0.3)' }}>
            Hai qualcosa da dire? →
          </button>
        </div>
      </div>
    )
  }

  // ── RISPOSTA FINALE ──────────────────────────────────────────────────────────
  if (session.phase === 'reply') {
    return (
      <div className="flex flex-col h-full relative overflow-hidden" style={{ backgroundColor: bgColor }}>
        <NoiseOverlay round={session.round} />
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b relative z-10"
          style={{ backgroundColor: headerColor, borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="font-black text-sm text-white flex-1">La tua replica</div>
          <button onClick={onSkipReply} className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Salta →</button>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-4 flex flex-col gap-3 relative z-10">
          {session.userReply && (
            <div className="flex justify-end">
              <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-br-sm text-sm"
                style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>
                {session.userReply}
              </div>
            </div>
          )}
          {session.claudeClosing && (
            <div className="flex items-end gap-2 max-w-[85%]">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-black flex-shrink-0"
                style={{ backgroundColor: AI_COLOR['claude'] }}>C</div>
              <div className="px-3 py-2 rounded-2xl rounded-bl-sm text-sm"
                style={{ backgroundColor: `${AI_COLOR['claude']}18`, color: 'rgba(255,255,255,0.85)' }}>
                {session.claudeClosing}
              </div>
            </div>
          )}
          {loading && !session.claudeClosing && session.userReply && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-black"
                style={{ backgroundColor: AI_COLOR['claude'] }}>C</div>
              <div className="flex gap-1">
                {[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {!session.userReply && (
          <div className="flex-shrink-0 border-t relative z-10 p-3"
            style={{ backgroundColor: headerColor, borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <input value={replyInput} onChange={e => setReplyInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && replyInput.trim() && !loading) { onReply(replyInput.trim()); setReplyInput('') } }}
                placeholder="Hai qualcosa da dire al verdetto?"
                disabled={loading}
                className="flex-1 rounded-full px-3 py-2 text-[12px] outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f0' }}
              />
              <button onClick={() => { if (replyInput.trim()) { onReply(replyInput.trim()); setReplyInput('') } }}
                disabled={!replyInput.trim() || loading}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white disabled:opacity-30"
                style={{ background: 'rgba(239,68,68,0.6)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z" /></svg>
              </button>
            </div>
          </div>
        )}
        {session.claudeClosing && (
          <div className="flex-shrink-0 border-t relative z-10 p-3"
            style={{ backgroundColor: headerColor, borderColor: 'rgba(255,255,255,0.06)' }}>
            <button onClick={onSkipReply}
              className="w-full py-3 rounded-2xl text-sm font-black text-white"
              style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
              Chiudi sessione
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── PLAYING ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full relative overflow-hidden" style={{ backgroundColor: bgColor }}>
      {/* Sfondo immagine sfocata */}
      <div className="absolute inset-0 z-0" style={{
        backgroundImage: 'url(/devilsadv_img.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'blur(18px) brightness(0.25)',
        transform: 'scale(1.05)',
      }} />
      {/* Vignetta rossa ai bordi */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 40%, rgba(80,0,0,0.6) 100%)',
      }} />
      <NoiseOverlay round={session.round} />

      {/* Header glassmorphism */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 border-b relative z-10"
        style={{
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          paddingBottom: '10px',
          background: 'rgba(10,0,3,0.7)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderColor: 'rgba(239,68,68,0.2)',
        }}>
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.8))' }}>😈</span>
            <span className="font-black text-sm text-white">Devil's Advocate</span>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={{ background: `${diff.color}20`, color: diff.color, border: `1px solid ${diff.color}40` }}>
              {diff.emoji} {diff.label}
            </span>
          </div>
          <div className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
            ⚔ {session.position}
          </div>
        </div>
        {/* Score */}
        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl flex-shrink-0"
          style={{
            background: `${getScoreColor(session.score)}15`,
            border: `1px solid ${getScoreColor(session.score)}40`,
            boxShadow: scoreFlash === 'down' ? `0 0 16px ${getScoreColor(session.score)}60` : 'none',
            transition: 'box-shadow 0.3s',
          }}>
          <div className="text-lg font-black leading-none"
            style={{ color: getScoreColor(session.score) }}>
            {session.score.toFixed(1)}
          </div>
          <div className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>/10</div>
        </div>
      </div>

      {/* Messaggi */}
      <div className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-3 relative z-10">
        {/* Empty state — posizione in evidenza */}
        {session.messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
            <div className="text-4xl" style={{ filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.7))' }}>😈</div>
            <div className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: 'rgba(239,68,68,0.6)' }}>difendi questa posizione</div>
            <div className="px-5 py-4 rounded-2xl text-center max-w-[85%]"
              style={{ background: 'rgba(139,0,0,0.2)', border: '1px solid rgba(239,68,68,0.3)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
              <div className="text-base font-black text-white leading-snug">"{session.position}"</div>
            </div>
            <div className="text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Scrivi il tuo primo argomento
            </div>
          </div>
        )}
        {session.messages.map((msg, i) => (
          <div key={i}>
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-br-sm text-sm"
                  style={{
                    background: 'rgba(180,20,20,0.25)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#fca5a5',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  }}>
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="flex items-end gap-2 max-w-[85%]">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                  style={{ backgroundColor: AI_COLOR[msg.aiId ?? 'claude'], boxShadow: `0 0 8px ${AI_COLOR[msg.aiId ?? 'claude']}60` }}>
                  {msg.aiId === 'gemini' ? 'Ge' : (AI_NAMES[msg.aiId ?? 'claude'] ?? 'C')[0]}
                </div>
                <div className="px-3 py-2 rounded-2xl rounded-bl-sm text-sm"
                  style={{
                    background: `${AI_COLOR[msg.aiId ?? 'claude']}15`,
                    border: `1px solid ${AI_COLOR[msg.aiId ?? 'claude']}25`,
                    color: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  }}>
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-[9px] font-bold">C</div>
            <div className="flex gap-1">
              {[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {/* Input + controlli */}
      <div className="flex-shrink-0 border-t relative z-10"
        style={{ background: 'rgba(10,0,3,0.75)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderColor: 'rgba(239,68,68,0.2)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-2 px-3 pt-2 pb-1">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && input.trim() && !loading) { onMessage(input.trim()); setInput('') } }}
            placeholder={placeholder} disabled={loading}
            className="flex-1 rounded-full px-3 py-2 text-[12px] outline-none"
            style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f0' }}
          />
          <button onClick={() => { if (input.trim()) { onMessage(input.trim()); setInput('') } }}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white disabled:opacity-30"
            style={{ background: 'rgba(239,68,68,0.6)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z" /></svg>
          </button>
        </div>
        <div className="flex gap-2 px-3 pb-1">
          <button onClick={onEndTurn} disabled={loading}
            className="flex-1 py-2 rounded-xl text-xs font-bold disabled:opacity-40 transition-all"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
            Fine turno →
          </button>
          <button onClick={onSurrender} disabled={loading}
            className="py-2 px-3 rounded-xl text-xs font-bold disabled:opacity-40 transition-all"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
            Mi arrendo
          </button>
        </div>
      </div>
    </div>
  )
}
