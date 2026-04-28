'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'

export default function JoinTwoVsTwo() {
  const { code } = useParams<{ code: string }>()
  const { data: session, status } = useSession()
  const router = useRouter()
  const t = useTranslations('twoVsTwo.joinPage')

  const [roomInfo, setRoomInfo] = useState<any>(null)
  const [error, setError] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [joining, setJoining] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/2v2/${code}`)
      return
    }
    if (status === 'authenticated') {
      fetch(`/api/2v2?code=${code}`)
        .then(r => r.json())
        .then(data => {
          if (data.error) setError(data.error)
          else {
            setRoomInfo(data)
            setPlayerName(session?.user?.name || '')
          }
        })
        .catch(() => setError('Errore di rete'))
        .finally(() => setLoading(false))
    }
  }, [status, code, session])

  const handleJoin = async () => {
    if (!playerName.trim()) return
    setJoining(true)
    const res = await fetch('/api/2v2', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, playerName: playerName.trim() }),
    })
    const data = await res.json()
    if (data.error) {
      setError(data.error)
      setJoining(false)
    } else {
      // Redirect alla chat con il codice room
      router.push(`/?2v2=${code}`)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#07070f' }}>
        <div className="flex gap-1">
          {[0,150,300].map(d => (
            <span key={d} className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#07070f' }}>
        <div className="text-4xl mb-4">⚠️</div>
        <div className="text-white font-bold text-lg mb-2">{t('errorTitle')}</div>
        <div className="text-white/50 text-sm text-center mb-8">{error}</div>
        <button onClick={() => router.push('/')} className="px-6 py-3 rounded-2xl font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}>
          {t('backHome')}
        </button>
      </div>
    )
  }

  if (!roomInfo) return null

  const gs = roomInfo.room?.gameState as any
  const isFull = roomInfo.isFull

  // Se sei già l'host, redirect diretto
  if (roomInfo.room?.hostId === session?.user?.email) {
    router.push(`/?2v2=${code}`)
    return null
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#07070f', backgroundImage: 'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(124,58,237,0.15) 0%, transparent 60%)' }}>

      {/* Logo */}
      <div className="font-black text-2xl mb-10">
        <span className="text-white">Ai</span><span style={{ color: '#A78BFA' }}>GORÀ</span>
      </div>

      <div className="w-full max-w-sm rounded-3xl p-8"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Badge 2v2 */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 text-[11px] font-bold"
          style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa' }}>
          ⚔️ {t('badge')}
        </div>

        <div className="text-white font-black text-xl mb-1">{t('challenged')}</div>
        <div className="text-white/40 text-sm mb-6">
          <span className="text-white/70 font-semibold">{gs?.teamA?.humanName || roomInfo.room?.host?.name}</span>{' '}{t('invitedSuffix')}
        </div>

        {/* Topic */}
        <div className="rounded-2xl p-4 mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">{t('topic')}</div>
          <div className="text-white font-semibold text-sm">"{roomInfo.room?.topic}"</div>
        </div>

        {/* Squadre */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 rounded-2xl p-3" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <div className="text-[9px] font-black uppercase tracking-wide mb-1" style={{ color: '#60a5fa' }}>🔵 {t('teamA')}</div>
            <div className="text-xs text-white/70 font-medium">{gs?.teamA?.humanName}</div>
            <div className="text-[10px] text-white/30">+ {gs?.teamA?.aiId}</div>
          </div>
          <div className="flex-1 rounded-2xl p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <div className="text-[9px] font-black uppercase tracking-wide mb-1" style={{ color: '#f87171' }}>🔴 {t('teamB')}</div>
            <div className="text-xs font-medium" style={{ color: isFull ? 'rgba(255,255,255,0.4)' : '#f87171' }}>
              {isFull ? t('occupied') : t('youLabel')}
            </div>
            <div className="text-[10px] text-white/30">+ {gs?.teamB?.aiId}</div>
          </div>
        </div>

        {isFull ? (
          <div className="text-center text-white/40 text-sm">{t('teamBFull')}</div>
        ) : (
          <>
            <div className="mb-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-2">{t('nameLabel')}</label>
              <input
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder={t('namePlaceholder')}
                className="w-full rounded-2xl px-4 py-3 text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                autoFocus
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={!playerName.trim() || joining}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', boxShadow: '0 4px 20px rgba(239,68,68,0.35)' }}>
              {joining ? t('joining') : t('joinBtn')}
            </button>
          </>
        )}
      </div>

      {/* Codice room */}
      <div className="mt-6 text-white/20 text-xs">{t('roomCode')}: {code}</div>
    </div>
  )
}
