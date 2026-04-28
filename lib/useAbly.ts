'use client'
import { useEffect, useRef, useCallback, useState } from 'react'
import Ably from 'ably'

// Un client per room per evitare conflitti
const clients = new Map<string, Ably.Realtime>()

function getAblyClient(roomId: string): Ably.Realtime {
  if (!clients.has(roomId)) {
    const client = new Ably.Realtime({
      authUrl: `/api/ably-token?roomId=${roomId}`,
      authMethod: 'GET',
      disconnectedRetryTimeout: 5000,
      suspendedRetryTimeout: 15000,
    })
    clients.set(roomId, client)
  }
  return clients.get(roomId)!
}

export type RoomEvent =
  | { type: 'user_message'; userId: string; userName: string; content: string; messageId: string }
  | { type: 'ai_chunk'; aiId: string; aiName: string; chunk: string; messageId: string }
  | { type: 'ai_done'; aiId: string; aiName: string; messageId: string; fullText: string }
  | { type: 'presence'; userId: string; userName: string; action: 'enter' | 'leave' }
  // ── 2v2 real multiplayer ──────────────────────────────────────────────────
  | { type: '2v2_state'; state: any }         // TwoVsTwoState serializzato dall'host
  | { type: '2v2_action_b'; content: string; messageId: string; userId: string; userName: string }

interface UseAblyOptions {
  roomId: string | null
  userId: string
  userName: string
  onEvent: (event: RoomEvent) => void
  enabled?: boolean
}

export function useAbly({ roomId, userId, userName, onEvent, enabled = true }: UseAblyOptions) {
  const channelRef = useRef<Ably.RealtimeChannel | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent
  const [isConnected, setIsConnected] = useState(false)
  // Ref to cancel the pending close timeout if effect re-runs before it fires
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!roomId || !enabled || !userId) return

    // Cancel any pending close from a previous cleanup
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = undefined
    }

    const client = getAblyClient(roomId)
    const channel = client.channels.get(`room:${roomId}`)
    channelRef.current = channel

    // Track connection state
    setIsConnected(client.connection.state === 'connected')
    const handleConnectionChange = (change: Ably.ConnectionStateChange) => {
      setIsConnected(change.current === 'connected')
    }
    client.connection.on(handleConnectionChange)

    // Ascolta messaggi — valida la forma prima di consegnare
    const handleMessage = (msg: Ably.Message) => {
      try {
        const event = JSON.parse(msg.data) as RoomEvent
        // Validate: must have a string 'type' field
        if (!event || typeof event.type !== 'string') {
          console.warn('Ably: evento con forma non valida ignorato', event)
          return
        }
        onEventRef.current(event)
      } catch (e) {
        console.warn('Ably parse error:', e)
      }
    }
    channel.subscribe(handleMessage)

    // Entra con identità
    channel.presence.enter({ userId, userName }).catch(console.warn)

    // Ascolta presenza altrui
    channel.presence.subscribe('enter', (member) => {
      const data = member.data as any
      if (member.clientId !== userId) {
        onEventRef.current({
          type: 'presence',
          userId: data?.userId ?? member.clientId,
          userName: data?.userName ?? member.clientId,
          action: 'enter',
        })
      }
    })
    channel.presence.subscribe('leave', (member) => {
      const data = member.data as any
      onEventRef.current({
        type: 'presence',
        userId: data?.userId ?? member.clientId,
        userName: data?.userName ?? member.clientId,
        action: 'leave',
      })
    })

    // Recupera chi è già online
    channel.presence.get().then(members => {
      members.forEach(member => {
        if (member.clientId !== userId) {
          const data = member.data as any
          onEventRef.current({
            type: 'presence',
            userId: data?.userId ?? member.clientId,
            userName: data?.userName ?? member.clientId,
            action: 'enter',
          })
        }
      })
    }).catch(() => {})

    return () => {
      channel.presence.leave().catch(() => {})
      channel.unsubscribe(handleMessage)
      channel.presence.unsubscribe()
      client.connection.off(handleConnectionChange)
      channelRef.current = null
      setIsConnected(false)
      // Chiudi il client dopo un po' (non subito per evitare reconnect immediato)
      // Salviamo il ref così il prossimo effect può cancellarlo se necessario
      closeTimeoutRef.current = setTimeout(() => {
        closeTimeoutRef.current = undefined
        const c = clients.get(roomId)
        if (c) { c.close(); clients.delete(roomId) }
      }, 2000)
    }
  }, [roomId, userId, enabled])

  const publish = useCallback((event: RoomEvent) => {
    if (!channelRef.current) return
    channelRef.current.publish('event', JSON.stringify(event)).catch(console.warn)
  }, [])

  return { publish, isConnected }
}
