import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

// GET — legge config globale
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  // Il flag globale è salvato sul record dell'utente admin
  return NextResponse.json({ forceGeminiPerpGlobal: admin.forceGeminiPerp ?? false })
}

// PATCH — aggiorna config globale
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  const { forceGeminiPerpGlobal } = await req.json()
  const updated = await prisma.user.update({
    where: { id: admin.id },
    data: { forceGeminiPerp: !!forceGeminiPerpGlobal },
  })
  return NextResponse.json({ ok: true, forceGeminiPerpGlobal: updated.forceGeminiPerp })
}
