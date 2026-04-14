import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { chatId, isPublic } = await req.json()
  if (!chatId) return NextResponse.json({ error: 'chatId mancante' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  // Verifica che la chat appartenga all'utente
  const chat = await prisma.chat.findFirst({ where: { id: chatId, userId: user.id } })
  if (!chat) return NextResponse.json({ error: 'Chat non trovata' }, { status: 404 })

  await prisma.chat.update({
    where: { id: chatId },
    data: { isPublic: !!isPublic },
  })

  return NextResponse.json({ ok: true, isPublic: !!isPublic })
}
