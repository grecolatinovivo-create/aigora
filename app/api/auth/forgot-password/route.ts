import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await rateLimit(`forgot-password:${ip}`, 3, 10 * 60_000)
  if (!rl.ok) {
    return NextResponse.json({ error: 'Troppe richieste. Riprova tra qualche minuto.' }, { status: 429 })
  }

  const { email } = await req.json()
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email non valida.' }, { status: 400 })
  }

  // L'utente deve esistere
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    // Non riveliamo se l'email esiste o meno (sicurezza)
    return NextResponse.json({ ok: true })
  }

  // Genera codice a 6 cifre
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minuti

  // Elimina codici precedenti per questa email
  await prisma.passwordReset.deleteMany({ where: { email } })
  await prisma.passwordReset.create({ data: { email, code, expiresAt } })

  // In dev restituisce il codice direttamente
  const isDev = process.env.NODE_ENV !== 'production'
  if (isDev) {
    return NextResponse.json({ ok: true, code })
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { data, error } = await resend.emails.send({
      from: 'AiGORÀ <noreply@aigora.eu>',
      to: email,
      subject: `${code} — reimposta la tua password AiGORÀ`,
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#07070f;color:#f0f0f0;border-radius:16px;">
          <h1 style="font-size:28px;font-weight:900;margin:0 0 8px;">
            <span style="color:white">Ai</span><span style="color:#A78BFA">GORÀ</span>
          </h1>
          <p style="color:rgba(255,255,255,0.7);font-size:15px;margin:0 0 24px;">Hai richiesto il reset della password. Il tuo codice:</p>
          <div style="background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.4);border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
            <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#A78BFA">${code}</span>
          </div>
          <p style="color:rgba(255,255,255,0.35);font-size:13px;margin:0;">Scade tra 10 minuti. Se non hai fatto questa richiesta, ignora questa email.</p>
        </div>
      `,
    })
    if (error) {
      console.error('[forgot-password] Resend error:', error)
      return NextResponse.json({ error: 'Errore invio email. Riprova.' }, { status: 500 })
    }
  } catch (err) {
    console.error('[forgot-password] Exception:', err)
    return NextResponse.json({ error: 'Errore invio email. Riprova.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
