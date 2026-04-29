// GET /api/limits — restituisce i contatori di utilizzo correnti per l'utente loggato
// Lettura pura, nessun incremento.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveUserTier, TIER_CONFIG } from '@/lib/plans'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, plan: true, email: true } })
  if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 })

  const tier = resolveUserTier(user)
  const cfg  = TIER_CONFIG[tier]

  // Leggi i contatori correnti senza incrementarli
  const now = new Date()
  const weeklyKey  = `debates-weekly:${user.id}`
  const dailyKey   = `debates-daily:${user.id}`

  const [weeklyRow, dailyRow] = await Promise.all([
    prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      SELECT count, "resetAt" FROM "RateLimit"
      WHERE key = ${weeklyKey} AND "resetAt" > ${now}
    `,
    prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      SELECT count, "resetAt" FROM "RateLimit"
      WHERE key = ${dailyKey} AND "resetAt" > ${now}
    `,
  ])

  return NextResponse.json({
    tier,
    weeklyDebates: {
      used:  weeklyRow[0]?.count ?? 0,
      limit: cfg.weeklyDebates ?? null,
      resetAt: weeklyRow[0]?.resetAt ?? null,
    },
    dailyDebates: {
      used:  dailyRow[0]?.count ?? 0,
      limit: cfg.dailyDebates ?? null,
      resetAt: dailyRow[0]?.resetAt ?? null,
    },
  })
}
