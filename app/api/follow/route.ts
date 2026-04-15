import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — lista following e followers dell'utente corrente
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const [following, followers] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: user.id },
      include: { following: { select: { id: true, name: true, email: true, plan: true } } },
    }),
    prisma.follow.findMany({
      where: { followingId: user.id },
      include: { follower: { select: { id: true, name: true, email: true, plan: true } } },
    }),
  ])

  return NextResponse.json({
    following: following.map(f => f.following),
    followers: followers.map(f => f.follower),
  })
}

// POST — segui o smetti di seguire
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { targetUserId } = await req.json()
  if (!targetUserId) return NextResponse.json({ error: 'targetUserId mancante' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  if (user.id === targetUserId) return NextResponse.json({ error: 'Non puoi seguire te stesso' }, { status: 400 })

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: user.id, followingId: targetUserId } },
  })

  if (existing) {
    // Unfollow
    await prisma.follow.delete({ where: { id: existing.id } })
    return NextResponse.json({ following: false })
  } else {
    // Follow
    await prisma.follow.create({ data: { followerId: user.id, followingId: targetUserId } })
    // Notifica
    await prisma.notification.create({
      data: { userId: targetUserId, type: 'follow', fromId: user.id },
    })
    return NextResponse.json({ following: true })
  }
}
