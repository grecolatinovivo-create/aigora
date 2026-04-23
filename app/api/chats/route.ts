import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

// GET — carica le chat dell'utente (escluse le eliminate)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  // Rate limit: 30 richieste/min per IP — blocca hammering (normale uso: max 2-3/min)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = rateLimit(`chats-get:${ip}:${session.user.email}`, 30, 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Troppe richieste.' }, { status: 429 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  // Pulizia silenziosa: elimina definitivamente le chat cancellate da più di 30 giorni
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  await prisma.chat.deleteMany({
    where: { userId: user.id, deletedAt: { lte: thirtyDaysAgo } },
  }).catch(() => {})

  // Ritorna solo le chat non eliminate
  const chats = await prisma.chat.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ chats })
}

// POST — salva o aggiorna una chat
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  // Rate limit: 60 POST/min — abbondante per uso normale (1 save per messaggio)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = rateLimit(`chats-post:${ip}:${session.user.email}`, 60, 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Troppe richieste.' }, { status: 429 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const { id, title, messages, history } = await req.json()
  if (!id || !title || !messages) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  const chat = await prisma.chat.upsert({
    where: { id },
    update: { title, messages, history, updatedAt: new Date() },
    create: { id, userId: user.id, title, messages, history },
  })

  return NextResponse.json({ chat })
}
