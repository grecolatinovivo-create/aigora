import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Ably from 'ably'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 401 })

  const roomId = req.nextUrl.searchParams.get('roomId')

  const client = new Ably.Rest(process.env.ABLY_API_KEY!)

  // Se richiesto per una room specifica, verifica che l'utente sia partecipante
  if (roomId) {
    const room = await prisma.room.findUnique({ where: { id: roomId } })
    if (!room) return NextResponse.json({ error: 'Room non trovata' }, { status: 404 })

    const isParticipant = room.visibility === 'public' || await prisma.roomParticipant.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
    })

    if (!isParticipant) {
      return NextResponse.json({ error: 'Non sei partecipante di questa room' }, { status: 403 })
    }

    // Token scoped: può solo pubblicare/sottoscrivere su questo canale specifico
    const tokenRequest = await client.auth.createTokenRequest({
      clientId: user.id,
      capability: { [`room:${roomId}`]: ['publish', 'subscribe', 'presence'] },
      ttl: 60 * 60 * 1000, // 1 ora
    })
    return NextResponse.json(tokenRequest)
  }

  // Token generico (per presenza globale, senza room)
  const tokenRequest = await client.auth.createTokenRequest({
    clientId: user.id,
    ttl: 60 * 60 * 1000,
  })

  return NextResponse.json(tokenRequest)
}
