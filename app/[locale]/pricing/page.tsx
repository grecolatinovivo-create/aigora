'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { TIER_CONFIG } from '@/lib/plans'

const AI_COLOR: Record<string, string> = {
  claude: '#7C3AED', gpt: '#10A37F', gemini: '#1A73E8', perplexity: '#FF6B2B', grok: '#1DA1F2'
}
const AI_NAMES: Record<string, string> = {
  claude: 'Claude', gpt: 'GPT', gemini: 'Gemini', perplexity: 'Perplexity', grok: 'Grok'
}

export default function PricingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const t = useTranslations('pricing')
  const [loading, setLoading] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const freeFeatures = t.raw('plans.free.features') as string[]
  const proFeatures  = t.raw('plans.pro.features')  as string[]
  const premFeatures = t.raw('plans.premium.features') as string[]

  const PLANS = [
    {
      key: null,
      label: 'Free',
      subtitle: null,
      price: null,
      color: '#10A37F',
      badge: null,
      ais: ['claude', 'gpt', 'gemini', 'perplexity'],
      features: freeFeatures.map((text, i) => ({ text, ok: i < 4 })),
      cta: t('plans.free.cta'),
      ctaAction: 'register' as const,
    },
    {
      key: 'pro',
      label: 'Pro',
      subtitle: t('plans.pro.subtitle'),
      price: TIER_CONFIG.pro.price?.toLocaleString('it-IT', { minimumFractionDigits: 2 }),
      color: '#A78BFA',
      badge: t('plans.pro.badge'),
      ais: ['claude', 'gpt', 'gemini', 'perplexity'],
      features: proFeatures.map(text => ({ text, ok: true })),
      cta: t('plans.pro.cta'),
      ctaAction: 'stripe' as const,
    },
    {
      key: 'premium',
      label: 'Premium',
      subtitle: t('plans.premium.subtitle'),
      price: TIER_CONFIG.premium.price?.toLocaleString('it-IT', { minimumFractionDigits: 2 }),
      color: '#FF6B2B',
      badge: null,
      ais: ['claude', 'gpt', 'gemini', 'perplexity'],
      features: premFeatures.map(text => ({ text, ok: true })),
      cta: t('plans.premium.cta'),
      ctaAction: 'stripe' as const,
    },
  ]

  const handleAction = async (plan: typeof PLANS[0]) => {
    if (plan.ctaAction === 'register') {
      router.push(session ? '/' : '/login')
      return
    }

    if (!session) { router.push('/login'); return }

    if (!plan.key) return
    setLoading(plan.key)
    setCheckoutError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.key }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setCheckoutError(data.error ?? 'Errore durante il pagamento. Riprova.')
        setLoading(null)
      }
    } catch {
      setCheckoutError('Errore di rete. Controlla la connessione e riprova.')
      setLoading(null)
    }
  }

  const tableRows: { key: string; free: string | boolean; pro: string | boolean; premium: string | boolean }[] = [
    { key: 'aiDebates',        free: t('table.ai4'),       pro: t('table.ai4'),           premium: t('table.ai4') },
    { key: 'grok',             free: false,                 pro: true,                     premium: true },
    { key: 'debates',          free: t('table.weekly3'),   pro: t('table.daily10'),       premium: t('table.unlimited') },
    { key: 'responsesPerDebate', free: t('table.upTo20'), pro: t('table.extended'),       premium: t('table.unlimitedResponses') },
    { key: 'brainstormer',     free: false,                 pro: t('table.sessions2'),     premium: t('table.unlimitedBrainstorm') },
    { key: 'devilsAdvocate',   free: false,                 pro: true,                     premium: true },
    { key: 'multiplayer',      free: t('table.weekly1'),    pro: true,                     premium: true },
    { key: 'upload',           free: false,                 pro: t('table.upTo20mo'),      premium: t('table.upTo100mo') },
    { key: 'history',          free: false,                 pro: t('table.days30'),        premium: t('table.full') },
    { key: 'betaAccess',       free: false,                 pro: false,                    premium: true },
  ]

  return (
    <div className="desktop-bg min-h-dvh flex flex-col items-center justify-start px-4 py-16">

      {/* Navbar — stessa estetica della Navbar principale */}
      <div className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center lg:grid lg:grid-cols-3 px-6"
        style={{ backgroundColor: 'rgba(7,7,15,0.4)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)' }}>
        {/* Sinistra — torna indietro */}
        <div className="flex items-center">
          <button onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-medium hover:text-white transition-colors"
            style={{ color: 'rgba(255,255,255,0.45)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            Indietro
          </button>
        </div>
        {/* Centro — Logo */}
        <button onClick={() => router.push('/')}
          className="absolute left-1/2 -translate-x-1/2 lg:static lg:transform-none lg:flex lg:justify-center font-black text-lg tracking-tight hover:opacity-80 transition-opacity"
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#fff' }}>Ai</span>
          <span style={{ color: '#A78BFA' }}>GORÀ</span>
        </button>
        {/* Destra — vuoto per simmetria */}
        <div />
      </div>

      {/* Header */}
      <div className="text-center mb-4 pt-14">
        <h1 className="text-4xl font-black text-white mb-3">{t('title')}</h1>
        <p className="text-white/50 text-base max-w-md mx-auto">
          {t('subtitle')}
        </p>
      </div>

      {/* Demo pill */}
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-10"
        style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        {t('tryDemo')}{' '}
        <button onClick={() => router.push('/demo')} className="text-white/80 underline underline-offset-2 hover:text-white transition-colors">
          /demo
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl">
        {PLANS.map((plan, i) => (
          <div
            key={plan.label}
            className="relative glass rounded-3xl p-6 flex flex-col"
            style={{
              animationDelay: `${i * 80}ms`,
              border: plan.badge ? `1px solid ${plan.color}55` : undefined,
              boxShadow: plan.badge ? `0 0 50px ${plan.color}1a` : undefined,
            }}
          >
            {plan.badge && (
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold text-white"
                style={{ background: plan.color }}
              >
                {plan.badge}
              </div>
            )}

            {/* Header piano */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-black text-base" style={{ color: plan.color }}>✦</span>
                <span className="text-white font-bold text-lg">{plan.label}</span>
              </div>
              <div className="flex items-end gap-1">
                {plan.price ? (
                  <>
                    <span className="text-4xl font-black text-white">{plan.price}€</span>
                    <span className="text-white/40 text-sm mb-1">{t('perMonth')}</span>
                  </>
                ) : (
                  <span className="text-4xl font-black text-white">{t('freePlanLabel')}</span>
                )}
              </div>
              {plan.subtitle && (
                <p className="text-[11px] mt-1.5" style={{ color: plan.color, fontWeight: 600, opacity: 0.8 }}>
                  {plan.subtitle}
                </p>
              )}
            </div>

            {/* AI badges */}
            <div className="flex flex-wrap gap-1.5 mb-5">
              {plan.ais.map(ai => (
                <div
                  key={ai}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium text-white"
                  style={{ backgroundColor: AI_COLOR[ai] + '25', border: `1px solid ${AI_COLOR[ai]}45` }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: AI_COLOR[ai] }} />
                  {AI_NAMES[ai]}
                </div>
              ))}
            </div>

            {/* Feature list */}
            <ul className="space-y-2 flex-1 mb-6">
              {plan.features.map(f => (
                <li key={f.text} className="flex items-center gap-2 text-[13px]">
                  {f.ok ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  )}
                  <span style={{ color: f.ok ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)' }}>
                    {f.text}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={() => handleAction(plan)}
              disabled={loading === plan.key}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              style={{
                background: plan.price
                  ? `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`
                  : `rgba(255,255,255,0.08)`,
                boxShadow: plan.price ? `0 4px 20px ${plan.color}44` : undefined,
                border: !plan.price ? '1px solid rgba(255,255,255,0.12)' : undefined,
              }}
            >
              {loading && loading === plan.key ? '...' : plan.cta}
            </button>
            {checkoutError && loading !== plan.key && plan.ctaAction === 'stripe' && (
              <div className="mt-3 px-3 py-2 rounded-lg text-xs text-red-300 flex items-start gap-1.5"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <span className="mt-0.5 flex-shrink-0">⚠️</span>
                <span>{checkoutError}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Comparison table — mobile hidden */}
      <div className="hidden md:block w-full max-w-4xl mt-14">
        <h2 className="text-white/40 text-xs font-semibold uppercase tracking-widest text-center mb-6">
          {t('comparisonTitle')}
        </h2>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {tableRows.map((row, i) => (
            <div
              key={row.key}
              className="grid grid-cols-4 items-center"
              style={{
                padding: '12px 20px',
                borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined,
                backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : undefined,
              }}
            >
              <span className="text-white/60 text-sm col-span-1">{t(`table.${row.key}` as any)}</span>
              {[row.free, row.pro, row.premium].map((val, j) => (
                <div key={j} className="flex justify-center">
                  {typeof val === 'boolean' ? (
                    val ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={['#10A37F','#A78BFA','#FF6B2B'][j]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    )
                  ) : (
                    <span className="text-xs font-medium" style={{ color: ['#10A37F','#A78BFA','#FF6B2B'][j] }}>{val}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="text-white/20 text-xs mt-10">
        {t('footer')}
      </p>
    </div>
  )
}
