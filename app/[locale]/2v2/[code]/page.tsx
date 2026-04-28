'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

const AI_COLOR: Record<string, string> = {
  claude: '#7C3AED', gpt: '#10A37F', gemini: '#1A73E8',
  perplexity: '#FF6B2B', grok: '#1DA1F2',
}
const AI_NAMES: Record<string, string> = {
  claude: 'Claude', gpt: 'GPT', gemini: 'Gemini',
  perplexity: 'Perplexity', grok: 'Grok',
}

type Preview = {
  id: string
  topic: string
  isFull: boolean
  teamA: { humanName: string; aiId: string }
  teamB: { aiId: string | null; aiId2: string | null }
  arbiterAiId: string
}

export default function JoinTwoVsTwo() {
  const { code } = useParams<{ code: string }>()
  const { data: session, status } = useSession()
  const router = useRouter()

  const [preview, setPreview] = useState<Preview | null>(null)
  const [previewError, setPreviewError] = useState('')
  const [previewLoading, setPreviewLoading] = useState(true)

  const [playerName, setPlayerName] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  // ── Fetch preview pubblica (no auth richiesta) ─────────────────────────────
  useEffect(() => {
    fetch(`/api/2v2/preview?code=${code}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setPreviewError(data.error)
        else setPreview(data)
      })
      .catch(() => setPreviewError('Errore di rete'))
      .finally(() => setPreviewLoading(false))
  }, [code])

  // Pre-compila il nome con quello dell'account se loggato
  useEffect(() => {
    if (session?.user?.name) setPlayerName(session.user.name)
  }, [session])

  // ── Join ──────────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!playerName.trim()) return
    setJoining(true)
    setJoinError('')
    const res = await fetch('/api/2v2', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, playerName: playerName.trim() }),
    })
    const data = await res.json()
    if (data.error) {
      setJoinError(data.error)
      setJoining(false)
    } else {
      router.push(`/2v2/live/${code}?name=${encodeURIComponent(playerName.trim())}`)
    }
  }

  // ── Loading preview ────────────────────────────────────────────────────────
  if (previewLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#07070f' }}>
        <div className="flex gap-1.5">
          {[0, 150, 300].map(d => (
            <span key={d} className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
              style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  // ── Errore room ────────────────────────────────────────────────────────────
  if (previewError || !preview) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: '#07070f' }}>
        <div className="text-4xl mb-4">⚠️</div>
        <div className="text-white font-bold text-lg mb-2">Room non trovata</div>
        <div className="text-white/50 text-sm text-center mb-8">{previewError}</div>
        <button onClick={() => router.push('/')}
          className="px-6 py-3 rounded-2xl font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}>
          Torna all'arena
        </button>
      </div>
    )
  }

  // ── Match preview (sempre visibile, anche senza account) ──────────────────
  const matchCard = (
    <div className="w-full max-w-sm space-y-4">

      {/* Badge sfida */}
      <div className="flex items-center gap-2 mb-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
          style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa' }}>
          ⚔️ Sfida 2 vs 2
        </div>
      </div>

      <div>
        <div className="text-white font-black text-2xl mb-1">Sei stato sfidato.</div>
        <div className="text-white/40 text-sm">
          <span className="text-white/70 font-semibold">{preview.teamA.humanName}</span> ti vuole nella sua partita
        </div>
      </div>

      {/* Topic */}
      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Argomento</div>
        <div className="text-white font-semibold text-sm">"{preview.topic}"</div>
      </div>

      {/* Squadre */}
      <div className="flex gap-2">
        <div className="flex-1 rounded-2xl p-3" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div className="text-[9px] font-black uppercase tracking-wide mb-2" style={{ color: '#60a5fa' }}>🔵 Squadra A</div>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-black flex-shrink-0"
              style={{ background: '#3b82f6' }}>{preview.teamA.humanName[0]?.toUpperCase()}</div>
            <div className="text-xs text-white/75 font-medium truncate">{preview.teamA.humanName}</div>
          </div>
          {preview.teamA.aiId && (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-black flex-shrink-0"
                style={{ background: AI_COLOR[preview.teamA.aiId] ?? '#6B7280' }}>
                {preview.teamA.aiId === 'gemini' ? 'Ge' : (AI_NAMES[preview.teamA.aiId]?.[0] ?? '?')}
              </div>
              <div className="text-[10px] text-white/35">{AI_NAMES[preview.teamA.aiId] ?? preview.teamA.aiId}</div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center px-2">
          <span className="text-white/20 font-black text-sm">vs</span>
        </div>

        <div className="flex-1 rounded-2xl p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div className="text-[9px] font-black uppercase tracking-wide mb-2" style={{ color: '#f87171' }}>🔴 Squadra B</div>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0"
              style={{ background: preview.isFull ? '#4B5563' : '#ef4444', color: 'white' }}>
              {preview.isFull ? '✓' : '?'}
            </div>
            <div className="text-xs font-medium" style={{ color: preview.isFull ? 'rgba(255,255,255,0.4)' : '#f87171' }}>
              {preview.isFull ? 'Occupata' : 'Tu'}
            </div>
          </div>
          {preview.teamB.aiId && (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-black flex-shrink-0"
                style={{ background: AI_COLOR[preview.teamB.aiId] ?? '#6B7280' }}>
                {preview.teamB.aiId === 'gemini' ? 'Ge' : (AI_NAMES[preview.teamB.aiId]?.[0] ?? '?')}
              </div>
              <div className="text-[10px] text-white/35">{AI_NAMES[preview.teamB.aiId] ?? preview.teamB.aiId}</div>
            </div>
          )}
          {preview.teamB.aiId2 && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-black flex-shrink-0"
                style={{ background: AI_COLOR[preview.teamB.aiId2] ?? '#6B7280' }}>
                {preview.teamB.aiId2 === 'gemini' ? 'Ge' : (AI_NAMES[preview.teamB.aiId2]?.[0] ?? '?')}
              </div>
              <div className="text-[10px] text-white/35">{AI_NAMES[preview.teamB.aiId2] ?? preview.teamB.aiId2}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ── Squadra B già piena ────────────────────────────────────────────────────
  if (preview.isFull) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: '#07070f', backgroundImage: 'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(124,58,237,0.12) 0%, transparent 60%)' }}>
        <div className="font-black text-2xl mb-10">
          <span className="text-white">Ai</span><span style={{ color: '#A78BFA' }}>GORÀ</span>
        </div>
        {matchCard}
        <div className="mt-6 text-white/40 text-sm text-center">La Squadra B è già completa.</div>
        <button onClick={() => router.push('/')} className="mt-4 px-6 py-3 rounded-2xl font-bold text-white text-sm"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
          Torna all'arena
        </button>
      </div>
    )
  }

  // ── Utente non loggato: mostra il match + CTA registrazione ───────────────
  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: '#07070f', backgroundImage: 'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(124,58,237,0.15) 0%, transparent 60%)' }}>
        <div className="font-black text-2xl mb-8">
          <span className="text-white">Ai</span><span style={{ color: '#A78BFA' }}>GORÀ</span>
        </div>

        {matchCard}

        <div className="w-full max-w-sm mt-6 space-y-3">
          <div className="text-center text-white/40 text-xs mb-4">
            Crea un account gratuito per giocare questa partita
          </div>
          <button
            onClick={() => router.push(`/login?tab=register&callbackUrl=/2v2/${code}`)}
            className="w-full py-4 rounded-2xl font-bold text-white text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', boxShadow: '0 4px 20px rgba(239,68,68,0.35)' }}>
            Crea account gratis e gioca →
          </button>
          <button
            onClick={() => router.push(`/login?callbackUrl=/2v2/${code}`)}
            className="w-full py-3 rounded-2xl font-medium text-white/60 text-sm transition-all hover:text-white/80"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            Ho già un account — Accedi
          </button>
        </div>

        <div className="mt-8 text-white/15 text-xs">Codice: {code}</div>
      </div>
    )
  }

  // ── Utente loggato: mostra match + form nome ──────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#07070f', backgroundImage: 'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(124,58,237,0.15) 0%, transparent 60%)' }}>

      <div className="font-black text-2xl mb-8">
        <span className="text-white">Ai</span><span style={{ color: '#A78BFA' }}>GORÀ</span>
      </div>

      {matchCard}

      <div className="w-full max-w-sm mt-6 space-y-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-2">
            Il tuo nome in partita
          </label>
          <input
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="Come ti chiami?"
            className="w-full rounded-2xl px-4 py-3 text-sm text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
            autoFocus
          />
        </div>

        {joinError && (
          <div className="text-red-400 text-xs text-center">{joinError}</div>
        )}

        <button
          onClick={handleJoin}
          disabled={!playerName.trim() || joining}
          className="w-full py-4 rounded-2xl font-bold text-white text-sm disabled:opacity-40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', boxShadow: '0 4px 20px rgba(239,68,68,0.35)' }}>
          {joining ? 'Sto entrando…' : 'Entra nella partita →'}
        </button>
      </div>

      <div className="mt-8 text-white/15 text-xs">Codice: {code}</div>
    </div>
  )
}
