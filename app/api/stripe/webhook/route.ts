import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')

  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''
  let event: import('stripe').Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET ?? '')
  } catch {
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 })
  }
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as import('stripe').Stripe.Checkout.Session
    await prisma.user.update({
      where: { id: s.metadata!.userId },
      data: { plan: s.metadata!.plan, subStatus: 'active', stripeSubId: s.subscription as string },
    })
  }
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as import('stripe').Stripe.Subscription
    await prisma.user.updateMany({
      where: { stripeSubId: sub.id },
      data: { plan: 'none', subStatus: 'inactive' },
    })
  }
  return NextResponse.json({ ok: true })
}
