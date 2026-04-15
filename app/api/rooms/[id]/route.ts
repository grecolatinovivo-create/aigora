import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — dettaglio room (per entrare come spettatore o partecipante)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const room = await prisma.room.findUnique({
    where: { id: params.id },
    include: {
      host: { select: { id: true, name: true } },
      participants: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  })

  if (!room) return NextResponse.json({ error: 'Room non trovata' }, { status: 404 })

  const isParticipant = room.participants.some(p => p.userId === user.id)
  const isPublic = room.visibility === 'public'

  // Se privata e non sei partecipante, accesso negato
  if (!isPublic && !isParticipant) {
    return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
  }

  // Se pubblico e non sei partecipante, aggiungiti come spettatore
  if (isPublic && !isParticipant) {
    await prisma.roomParticipant.create({
      data: { roomId: room.id, userId: user.id, role: 'spectator' },
    })
  }

  const myRole = isParticipant
    ? room.participants.find(p => p.userId === user.id)?.role ?? 'spectator'
    : 'spectator'

  return NextResponse.json({ room, myRole })
}

// PATCH — chiudi room (solo host)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const room = await prisma.room.findUnique({ where: { id: params.id } })
  if (!room) return NextResponse.json({ error: 'Room non trovata' }, { status: 404 })
  if (room.hostId !== user.id) return NextResponse.json({ error: 'Solo l\'host può chiudere' }, { status: 403 })

  const updated = await prisma.room.update({
    where: { id: params.id },
    data: { status: 'ended' },
  })

  return NextResponse.json({ room: updated })
}
