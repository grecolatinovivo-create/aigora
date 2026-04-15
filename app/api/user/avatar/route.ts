import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('avatar') as File | null
  if (!file) return NextResponse.json({ error: 'Nessun file' }, { status: 400 })

  // Leggi i byte del file
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Limita a 500KB
  if (buffer.length > 500 * 1024) {
    return NextResponse.json({ error: 'Immagine troppo grande (max 500KB)' }, { status: 400 })
  }

  // Verifica magic bytes server-side (non fidarsi del file.type dichiarato dal client)
  const MAGIC: Record<string, string> = {
    'ffd8ff': 'image/jpeg',           // JPEG
    '89504e47': 'image/png',          // PNG
    '47494638': 'image/gif',          // GIF
    '52494646': 'image/webp',         // WEBP (RIFF header)
  }
  const hex = buffer.slice(0, 4).toString('hex')
  const detectedMime = MAGIC[hex.slice(0, 6)] ?? MAGIC[hex] ?? null
  if (!detectedMime) {
    return NextResponse.json({ error: 'Formato file non supportato. Usa JPEG, PNG, GIF o WebP.' }, { status: 400 })
  }

  const base64 = `data:${detectedMime};base64,${buffer.toString('base64')}`

  await prisma.user.update({
    where: { id: user.id },
    data: { image: base64 },
  })

  return NextResponse.json({ ok: true, image: base64 })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  await prisma.user.update({ where: { id: user.id }, data: { image: null } })
  return NextResponse.json({ ok: true })
}
