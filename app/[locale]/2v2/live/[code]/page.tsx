'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { createPortal } from 'react-dom'
import { useAbly, type RoomEvent } from '@/lib/useAbly'
import TwoVsTwoScreen from '@/app/components/2v2/TwoVsTwoScreen'
import type { TwoVsTwoState } from '@/app/types/aigora'

// ── Schermata di attesa prima che l'host avvii la partita ─────────────────
function WaitingForHost() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#07070f', backgroundImage: 'radial-gradient(ellipse 80% 60% at 80% 10%, rgba(239,68,68,0.12) 0%, transparent 60%)' }}>
      <div className="font-black text-2xl mb-10">
        <span className="text-white">Ai</span><span style={{ color: '#A78BFA' }}>GORÀ</span>
      </div>
      <div className="w-full max-w-xs text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <span className="text-2xl">⚔️</span>
        </div>
        <div className="text-white font-black text-xl mb-2">Sei connesso!</div>
        <div className="text-white/40 text-sm mb-8">Aspetta che l'host avvii la partita…</div>
        <div className="flex gap-1.5 justify-center">
          {[0, 150, 300].map(d => (
            <span key={d} className="w-2.5 h-2.5 rounded-full bg-red-400 animate-bounce"
              style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function TwoVsTwoLivePage() {
  const { code } = useParams<{ code: string }>()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const router = useRouter()

  const [roomId, setRoomId] = useState<string | null>(null)
  const [gameState, setGameState] = useState<TwoVsTwoState | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  const userId = session?.user?.email ?? ''

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const name = searchParams.get('name') || session?.user?.name || 'Squadra B'
    setPlayerName(name)
  }, [searchParams, session])

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
          else setRoomId(data.room.id)
        })
        .catch(() => setError('Errore di rete'))
        .finally(() => setPageLoading(false))
    }
  }, [status, code])

  const handleAblyEvent = useCallback((event: RoomEvent) => {
    if (event.type === '2v2_state') {
      setGameState(event.state as TwoVsTwoState)
    }
  }, [])

  const { publish } = useAbly({
    roomId,
    userId,
    userName: playerName,
    onEvent: handleAblyEvent,
    enabled: !!roomId && !!userId,
  })

  // Player B invia la propria mossa umana all'host via Ably
  const handleHumanMessage = useCallback((text: string) => {
    if (!text.trim()) return
    publish({
      type: '2v2_action_b',
      content: text.trim(),
      messageId: `b-${Date.now()}`,
      userId,
      userName: playerName,
    })
  }, [publish, userId, playerName])

  // Stato "loading" per TwoVsTwoScreen dal punto di vista di Player B:
  // disabilitato quando non è il turno di B, quando c'è un messaggio in streaming,
  // o quando si sta aspettando che l'host reagisca alla mossa di B
  const isInputDisabled = !gameState
    || gameState.currentTurn !== 'B'
    || !!gameState.waitingForOpponent
    || gameState.messages.some(m => m.streaming)
    || gameState.ended

  // ── Render ────────────────────────────────────────────────────────────────

  if (status === 'loading' || pageLoading) {
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

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: '#07070f' }}>
        <div className="text-4xl mb-4">⚠️</div>
        <div className="text-white font-bold text-lg mb-2">Errore</div>
        <div className="text-white/50 text-sm text-center mb-8">{error}</div>
        <button onClick={() => router.push('/')}
          className="px-6 py-3 rounded-2xl font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}>
          Torna all'arena
        </button>
      </div>
    )
  }

  // Connesso ma in attesa del primo aggiornamento di stato dall'host
  if (!gameState) return <WaitingForHost />

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999]" style={{ background: '#0d0d14' }}>
      <TwoVsTwoScreen
        state={gameState}
        onHumanMessage={handleHumanMessage}
        onRequestAI={() => {/* no-op: AI drives dall'host */}}
        loading={isInputDisabled}
        myTeam="B"
        onBack={() => router.push('/')}
        onNewGame={() => router.push('/')}
        onMultiplayer={() => {}}
      />
    </div>,
    document.body
  )
}
