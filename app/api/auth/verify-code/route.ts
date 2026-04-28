import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  // Rate limit: max 10 tentativi ogni 10 minuti per IP (anti brute-force)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await rateLimit(`verify-code:${ip}`, 10, 10 * 60_000)
  if (!rl.ok) {
    return NextResponse.json({ error: 'Troppi tentativi. Riprova tra qualche minuto.' }, { status: 429 })
  }

  const { email, code } = await req.json()
  if (!email || !code) {
    return NextResponse.json({ error: 'Dati mancanti.' }, { status: 400 })
  }

  const verification = await prisma.emailVerification.findFirst({
    where: { email, code },
    orderBy: { createdAt: 'desc' },
  })

  if (!verification) {
    return NextResponse.json({ error: 'Codice non valido.' }, { status: 400 })
  }

  if (new Date() > verification.expiresAt) {
    await prisma.emailVerification.delete({ where: { id: verification.id } })
    return NextResponse.json({ error: 'Codice scaduto. Richiedi un nuovo codice.' }, { status: 400 })
  }

  // Codice valido — elimina il record
  await prisma.emailVerification.delete({ where: { id: verification.id } })

  return NextResponse.json({ ok: true })
}
