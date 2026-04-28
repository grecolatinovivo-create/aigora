import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: max 5 registrazioni ogni 10 minuti per IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rl = await rateLimit(`register:${ip}`, 5, 10 * 60_000)
    if (!rl.ok) {
      return NextResponse.json({ error: 'Troppe richieste. Riprova tra ' + rl.retryAfter + ' secondi.' }, { status: 429 })
    }

    const { email, password, name } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e password sono obbligatorie.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'La password deve essere di almeno 8 caratteri.' }, { status: 400 })
    }

    const { prisma } = await import('@/lib/prisma')
    const bcrypt = await import('bcryptjs')

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email già registrata.' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)

    await prisma.user.create({
      data: {
        email,
        name: name ?? null,
        password: hashed,
        plan: 'free',
        subStatus: 'active',
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Errore interno del server.' }, { status: 500 })
  }
}
