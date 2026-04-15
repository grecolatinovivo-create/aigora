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

  // Validazione whitelist AI
  const VALID_AIS = ['claude', 'gemini', 'perplexity', 'gpt']
  const validatedAiIds = (aiIds ?? VALID_AIS).filter((id: string) => VALID_AIS.includes(id))
  if (validatedAiIds.length === 0) return NextResponse.json({ error: 'Nessuna AI valida selezionata' }, { status: 400 })

  // Validazione visibility
  const validVisibility = ['public', 'private'].includes(visibility) ? visibility : 'private'

  // Verifica che gli invitati esistano
  const validInvitedIds: string[] = []
  if (invitedUserIds?.length) {
    const invitedUsers = await prisma.user.findMany({
      where: { id: { in: invitedUserIds }, blocked: false },
      select: { id: true },
    })
    validInvitedIds.push(...invitedUsers.map(u => u.id))
  }

  // Limite: max 5 room attive per utente
  const activeRooms = await prisma.room.count({ where: { hostId: user.id, status: 'live' } })
  if (activeRooms >= 5) return NextResponse.json({ error: 'Hai troppi dibattiti attivi (max 5)' }, { status: 400 })

  // Transazione atomica
  const room = await prisma.$transaction(async (tx) => {
    const newRoom = await tx.room.create({
      data: {
        hostId: user.id,
        topic: topic.trim().slice(0, 500),
        visibility: validVisibility,
        aiIds: validatedAiIds,
        participants: {
          create: [
            { userId: user.id, role: 'host' },
            ...validInvitedIds.map((uid: string) => ({ userId: uid, role: 'participant' })),
          ],
        },
      },
      include: {
        participants: { include: { user: { select: { id: true, name: true } } } },
      },
    })

    if (validInvitedIds.length) {
      await tx.notification.createMany({
        data: validInvitedIds.map((uid: string) => ({
          userId: uid,
          type: 'room_invite',
          fromId: user.id,
          roomId: newRoom.id,
        })),
      })
    }

    return newRoom
  })

  return NextResponse.json({ room })
}
