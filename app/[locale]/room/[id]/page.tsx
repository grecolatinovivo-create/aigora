'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import GroupChatRoom from '@/app/components/room/GroupChatRoom'

export default function RoomPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session, status } = useSession()
  const router = useRouter()

  const [room, setRoom] = useState<any>(null)
  const [myRole, setMyRole] = useState<'host' | 'participant' | 'spectator'>('spectator')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/room/${id}`)
      return
    }
    if (status === 'authenticated') {
      fetch(`/api/rooms/${id}`)
        .then(r => r.json())
        .then(data => {
          if (data.error) setError(data.error)
          else {
            setRoom(data.room)
            setMyRole(data.myRole ?? 'spectator')
          }
        })
        .catch(() => setError('Errore di rete'))
        .finally(() => setLoading(false))
    }
  }, [status, id])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#07070f' }}>
        <div className="flex gap-1">
          {[0, 150, 300].map(d => (
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
        <div className="text-white font-bold text-lg mb-2">Sala non trovata</div>
        <div className="text-white/50 text-sm text-center mb-8">{error}</div>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 rounded-2xl font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}
        >
          Torna all'arena
        </button>
      </div>
    )
  }

  if (!room) return null

  const userId = session?.user?.email ?? ''
  const userName = session?.user?.name ?? session?.user?.email?.split('@')[0] ?? 'Utente'

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#07070f' }}>
      <GroupChatRoom
        room={room}
        myRole={myRole}
        userId={userId}
        userName={userName}
        onLeave={() => router.push('/')}
      />
    </div>
  )
}
