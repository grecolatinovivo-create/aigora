import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — lista room pubbliche + mie private
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const rooms = await prisma.room.findMany({
    where: {
      OR: [
        { visibility: 'public' },
        { hostId: user.id },
        { participants: { some: { userId: user.id } } },
      ],
    },
    include: {
      host: { select: { id: true, name: true, plan: true } },
      participants: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json({ rooms })
}

// POST — crea nuova room
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const { topic, visibility, aiIds, invitedUserIds } = await req.json()
  if (!topic?.trim()) return NextResponse.json({ error: 'Tema mancante' }, { status: 400 })

  const room = await prisma.room.create({
    data: {
      hostId: user.id,
      topic: topic.trim(),
      visibility: visibility ?? 'private',
      aiIds: aiIds ?? ['claude', 'gemini', 'perplexity', 'gpt'],
      participants: {
        create: [
          { userId: user.id, role: 'host' },
          ...(invitedUserIds ?? []).map((uid: string) => ({ userId: uid, role: 'participant' })),
        ],
      },
    },
    include: {
      participants: { include: { user: { select: { id: true, name: true } } } },
    },
  })

  // Crea notifiche per gli invitati
  if (invitedUserIds?.length) {
    await prisma.notification.createMany({
      data: invitedUserIds.map((uid: string) => ({
        userId: uid,
        type: 'room_invite',
        fromId: user.id,
        roomId: room.id,
      })),
    })
  }

  return NextResponse.json({ room })
}
