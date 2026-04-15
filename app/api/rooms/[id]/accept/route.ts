import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST — accetta o rifiuta un invito a una room
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const { action } = await req.json() // 'accept' | 'reject'

  const room = await prisma.room.findUnique({ where: { id: params.id } })
  if (!room) return NextResponse.json({ error: 'Room non trovata' }, { status: 404 })

  if (action === 'accept') {
    // Aggiunge come partecipante se non già presente
    await prisma.roomParticipant.upsert({
      where: { roomId_userId: { roomId: params.id, userId: user.id } },
      create: { roomId: params.id, userId: user.id, role: 'participant' },
      update: { role: 'participant' },
    })
  }

  // In entrambi i casi segna la notifica come letta
  await prisma.notification.updateMany({
    where: { userId: user.id, roomId: params.id, type: 'room_invite', read: false },
    data: { read: true },
  })

  return NextResponse.json({ ok: true, accepted: action === 'accept' })
}
