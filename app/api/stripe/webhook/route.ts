import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizePlan } from '@/lib/plans'

export const dynamic = 'force-dynamic'

// Mappa priceId Stripe → nome piano interno
function planFromPriceId(priceId: string): string {
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro'
  if (priceId === process.env.STRIPE_PRICE_MAX) return 'premium'
  // Legacy
  if (priceId === process.env.STRIPE_PRICE_STARTER) return 'free'
  return 'free'
}

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

  // ── Checkout completato → attiva piano ─────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as import('stripe').Stripe.Checkout.Session
    const planName = s.metadata?.plan ? normalizePlan(s.metadata.plan) : 'free'
    await prisma.user.update({
      where: { id: s.metadata!.userId },
      data: {
        plan: planName,
        subStatus: 'active',
        stripeSubId: s.subscription as string,
      },
    })
  }

  // ── Abbonamento aggiornato (upgrade/downgrade) ─────────────────────────────
  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as import('stripe').Stripe.Subscription
    const priceId = sub.items.data[0]?.price?.id ?? ''
    const planName = planFromPriceId(priceId)
    const isActive = sub.status === 'active' || sub.status === 'trialing'
    await prisma.user.updateMany({
      where: { stripeSubId: sub.id },
      data: {
        plan: isActive ? planName : 'free',
        subStatus: isActive ? 'active' : 'inactive',
      },
    })
  }

  // ── Abbonamento cancellato → torna a free ──────────────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as import('stripe').Stripe.Subscription
    await prisma.user.updateMany({
      where: { stripeSubId: sub.id },
      data: { plan: 'free', subStatus: 'inactive' },
    })
  }

  // ── Pagamento fallito → sospende (non cancella subito) ────────────────────
  if (event.type === 'invoice.payment_failed') {
    const inv = event.data.object as any
    const subId: string | undefined = typeof inv.subscription === 'string'
      ? inv.subscription
      : inv.subscription?.id
    if (subId) {
      await prisma.user.updateMany({
        where: { stripeSubId: subId },
        data: { subStatus: 'past_due' },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
