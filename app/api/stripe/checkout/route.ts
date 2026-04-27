import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, PLANS } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { plan } = await req.json()
  const planData = PLANS[plan as keyof typeof PLANS]
  if (!planData) return NextResponse.json({ error: 'Piano non valido' }, { status: 400 })
  if (!planData.priceId) return NextResponse.json({ error: 'Stripe price ID non configurato' }, { status: 500 })

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
    // Forza solo fatturazione mensile (no annual toggle)
    subscription_data: { metadata: { userId: user.id, plan } },
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=1`,
    cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
    metadata: { userId: user.id, plan },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
