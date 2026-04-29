import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await rateLimit(`reset-password:${ip}`, 5, 10 * 60_000)
  if (!rl.ok) {
    return NextResponse.json({ error: 'Troppi tentativi. Riprova tra qualche minuto.' }, { status: 429 })
  }

  const { email, code, newPassword } = await req.json()
  if (!email || !code || !newPassword) {
    return NextResponse.json({ error: 'Dati mancanti.' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'La password deve essere di almeno 8 caratteri.' }, { status: 400 })
  }

  const reset = await prisma.passwordReset.findFirst({
    where: { email, code },
    orderBy: { createdAt: 'desc' },
  })

  if (!reset) {
    return NextResponse.json({ error: 'Codice non valido.' }, { status: 400 })
  }
  if (new Date() > reset.expiresAt) {
    await prisma.passwordReset.delete({ where: { id: reset.id } })
    return NextResponse.json({ error: 'Codice scaduto. Richiedi un nuovo codice.' }, { status: 400 })
  }

  // Codice valido — aggiorna la password
  const bcrypt = await import('bcryptjs')
  const hashed = await bcrypt.hash(newPassword, 12)

  await prisma.user.update({ where: { email }, data: { password: hashed } })
  await prisma.passwordReset.delete({ where: { id: reset.id } })

  return NextResponse.json({ ok: true })
}
