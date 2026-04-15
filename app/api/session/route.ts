import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { registerSession, validateSession, invalidateSession, generateSessionToken } from '@/lib/sessionGuard'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST — registra una nuova sessione dopo il login
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const userAgent = req.headers.get('user-agent') ?? 'unknown'
  const token = generateSessionToken(userAgent)

  await registerSession(user.id, token, ip, userAgent)

  const res = NextResponse.json({ ok: true, token })
  // Salva il token in un cookie HttpOnly
  res.cookies.set('_as_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  })
  return res
}

// GET — valida la sessione corrente
export async function GET(req: NextRequest) {
  const token = req.cookies.get('_as_token')?.value
  if (!token) return NextResponse.json({ valid: false })

  const { valid, suspicious } = await validateSession(token)
  return NextResponse.json({ valid, suspicious })
}

// DELETE — logout, invalida la sessione
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('_as_token')?.value
  if (token) await invalidateSession(token)

  const res = NextResponse.json({ ok: true })
  res.cookies.delete('_as_token')
  return res
}
