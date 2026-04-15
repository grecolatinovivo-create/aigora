import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// DELETE — soft delete (mantiene per 30 giorni, invisibile all'utente)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  // Verifica che la chat appartenga all'utente
  const chat = await prisma.chat.findFirst({ where: { id: params.id, userId: user.id } })
  if (!chat) return NextResponse.json({ error: 'Chat non trovata' }, { status: 404 })

  // Soft delete — mantiene il record per 30 giorni (visibile solo in admin)
  await prisma.chat.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
