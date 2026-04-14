import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — notifiche dell'utente
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      user: { select: { name: true } },
    },
  })

  // Dati extra: from user e room
  const enriched = await Promise.all(notifications.map(async n => {
    const from = n.fromId ? await prisma.user.findUnique({ where: { id: n.fromId }, select: { name: true } }) : null
    const room = n.roomId ? await prisma.room.findUnique({ where: { id: n.roomId }, select: { topic: true } }) : null
    return { ...n, fromName: from?.name ?? null, roomTopic: room?.topic ?? null }
  }))

  return NextResponse.json({ notifications: enriched })
}

// POST — segna come lette
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const { notificationId } = await req.json()

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { read: true },
  })

  return NextResponse.json({ ok: true })
}
