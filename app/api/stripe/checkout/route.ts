import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, PLANS } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      console.error('[stripe/checkout] STRIPE_SECRET_KEY non configurata')
      return NextResponse.json({ error: 'Pagamento non disponibile (configurazione mancante).' }, { status: 500 })
    }

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeKey)

    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const body = await req.json()
    const { plan } = body
    const planData = PLANS[plan as keyof typeof PLANS]
    if (!planData) return NextResponse.json({ error: 'Piano non valido' }, { status: 400 })
    if (!planData.priceId) {
      console.error(`[stripe/checkout] priceId mancante per piano "${plan}"`)
      return NextResponse.json({ error: 'Stripe price ID non configurato per questo piano.' }, { status: 500 })
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'https://app.aigora.eu'

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

    let customerId = user.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email!, name: user.name ?? undefined })
      customerId = customer.id
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } })
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: planData.priceId, quantity: 1 }],
      subscription_data: { metadata: { userId: user.id, plan } },
      success_url: `${baseUrl}/dashboard?success=1`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: { userId: user.id, plan },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const code = (err as any)?.code ?? 'unknown'
    const statusCode = (err as any)?.statusCode ?? 'unknown'
    console.error('[stripe/checkout] Errore:', { message, code, statusCode })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
