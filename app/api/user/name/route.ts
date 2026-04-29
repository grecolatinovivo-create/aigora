import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function saveName(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nome mancante' }, { status: 400 })

  await prisma.user.update({
    where: { email: session.user.email },
    data: { name: name.trim() },
  })

  return NextResponse.json({ ok: true })
}

export const POST = saveName
export const PUT = saveName
