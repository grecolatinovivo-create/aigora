import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
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
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Errore interno del server.' }, { status: 500 })
  }
}
