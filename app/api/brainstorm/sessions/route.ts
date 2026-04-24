import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — lista sessioni dell'utente (max 50, più recenti prima)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const items = await prisma.brainstormSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, idea: true, answers: true, output: true, grokOutput: true, feedback: true, createdAt: true },
  })

  return NextResponse.json(items)
}

// POST — crea nuova sessione o aggiorna una esistente (grokOutput, feedback)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const body = await req.json()
  const { id, idea, answers, output, grokOutput, feedback } = body

  // Update esistente
  if (id) {
    const existing = await prisma.brainstormSession.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
    }
    const updated = await prisma.brainstormSession.update({
      where: { id },
      data: {
        ...(grokOutput !== undefined && { grokOutput }),
        ...(feedback !== undefined && { feedback }),
      },
    })
    return NextResponse.json(updated)
  }

  // Nuova sessione
  if (!idea || !output) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  const created = await prisma.brainstormSession.create({
    data: {
      userId: user.id,
      idea,
      answers: answers ?? [],
      output,
    },
  })

  return NextResponse.json(created)
}
