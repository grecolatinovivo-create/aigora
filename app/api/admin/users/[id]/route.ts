import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return null
  const isAdmin = user.email === process.env.ADMIN_EMAIL
  if (!isAdmin) return null
  return user
}

// PATCH — blocca o sblocca utente
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { action } = await req.json() // 'block' | 'unblock'
  if (!['block', 'unblock'].includes(action)) {
    return NextResponse.json({ error: 'Azione non valida' }, { status: 400 })
  }

  // Non puoi bloccare te stesso
  if (params.id === admin.id) {
    return NextResponse.json({ error: 'Non puoi bloccare te stesso' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { blocked: action === 'block' },
  })

  // Se bloccato, invalida tutte le sessioni attive
  if (action === 'block') {
    await prisma.activeSession.deleteMany({ where: { userId: params.id } }).catch(() => {})
  }

  return NextResponse.json({ ok: true, blocked: updated.blocked })
}

// DELETE — elimina utente e tutti i suoi dati
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  // Non puoi eliminare te stesso
  if (params.id === admin.id) {
    return NextResponse.json({ error: 'Non puoi eliminare te stesso' }, { status: 400 })
  }

  // Elimina utente — cascade elimina chat, sessioni, notifiche, etc.
  await prisma.user.delete({ where: { id: params.id } })

  return NextResponse.json({ ok: true })
}
