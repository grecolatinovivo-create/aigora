import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — carica tutte le chat dell'utente
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const chats = await prisma.chat.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ chats })
}

// POST — salva o aggiorna una chat
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

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
