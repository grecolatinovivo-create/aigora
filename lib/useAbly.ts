'use client'
import { useEffect, useRef, useCallback } from 'react'
import Ably from 'ably'

let ablyClient: Ably.Realtime | null = null

function getAblyClient(): Ably.Realtime {
  if (!ablyClient) {
    ablyClient = new Ably.Realtime({
      authUrl: '/api/ably-token',
      authMethod: 'GET',
    })
  }
  return ablyClient
}

export type RoomEvent =
  | { type: 'user_message'; userId: string; userName: string; content: string; messageId: string }
  | { type: 'ai_chunk'; aiId: string; aiName: string; chunk: string; messageId: string }
  | { type: 'ai_done'; aiId: string; messageId: string; fullText: string }
  | { type: 'presence'; userId: string; userName: string; action: 'enter' | 'leave' }

interface UseAblyOptions {
  roomId: string | null
  onEvent: (event: RoomEvent) => void
  enabled?: boolean
}

export function useAbly({ roomId, onEvent, enabled = true }: UseAblyOptions) {
  const channelRef = useRef<Ably.RealtimeChannel | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    if (!roomId || !enabled) return

    const client = getAblyClient()
    const channel = client.channels.get(`room:${roomId}`)
    channelRef.current = channel

    // Ascolta tutti i messaggi del canale
    channel.subscribe((msg) => {
      try {
        const event = JSON.parse(msg.data) as RoomEvent
        onEventRef.current(event)
      } catch {}
    })

    // Presence — entra nel canale
    channel.presence.enter({ status: 'online' })

    return () => {
      channel.presence.leave()
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [roomId, enabled])

  const publish = useCallback((event: RoomEvent) => {
    if (!channelRef.current) return
    channelRef.current.publish('event', JSON.stringify(event))
  }, [])

  return { publish }
}
