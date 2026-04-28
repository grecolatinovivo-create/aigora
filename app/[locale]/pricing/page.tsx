'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const AI_COLOR: Record<string, string> = {
  claude: '#7C3AED', gpt: '#10A37F', gemini: '#1A73E8', perplexity: '#FF6B2B', grok: '#1DA1F2'
}
const AI_NAMES: Record<string, string> = {
  claude: 'Claude', gpt: 'GPT', gemini: 'Gemini', perplexity: 'Perplexity', grok: 'Grok'
}

const PLANS = [
  {
    key: null,
    label: 'Free',
    subtitle: null,
    price: null,
    color: '#10A37F',
    badge: null,
    ais: ['claude', 'gpt', 'gemini', 'perplexity'],
    features: [
      { text: '4 AI (Claude, GPT, Gemini, Perplexity)', ok: true },
      { text: '3 dibattiti a settimana', ok: true },
      { text: 'Fino a 20 risposte per dibattito', ok: true },
      { text: 'Brainstormer', ok: false },
      { text: 'Avvocato del Diavolo', ok: false },
      { text: 'Multiplayer 2v2', ok: false },
      { text: 'Upload documenti', ok: false },
      { text: 'Cronologia dibattiti', ok: false },
    ],
    cta: 'Inizia gratis',
    ctaAction: 'register',
  },
  {
    key: 'pro',
    label: 'Pro',
    subtitle: 'Per uso frequente e completo',
    price: '9,99',
    color: '#A78BFA',
    badge: 'PIÙ POPOLARE',
    ais: ['claude', 'gpt', 'gemini', 'perplexity'],
    features: [
      { text: '4 AI nei dibattiti', ok: true },
      { text: 'Grok disponibile in Brainstormer e 2v2', ok: true },
      { text: '10 dibattiti al giorno', ok: true },
      { text: 'Risposte più dettagliate (2× Free)', ok: true },
      { text: 'Brainstormer: 2 sessioni/settimana', ok: true },
      { text: 'Avvocato del Diavolo', ok: true },
      { text: 'Multiplayer 2v2', ok: true },
      { text: 'Upload documenti e immagini: fino a 20/mese', ok: true },
      { text: 'Cronologia dibattiti: 30 giorni', ok: true },
    ],
    cta: 'Inizia con Pro',
    ctaAction: 'stripe',
  },
  {
    key: 'premium',
    label: 'Premium',
    subtitle: 'Per uso intensivo e avanzato',
    price: '19,99',
    color: '#FF6B2B',
    badge: null,
    ais: ['claude', 'gpt', 'gemini', 'perplexity'],
    features: [
      { text: '4 AI nei dibattiti', ok: true },
      { text: 'Grok disponibile in Brainstormer e 2v2', ok: true },
      { text: 'Dibattiti illimitati', ok: true },
      { text: 'Risposte complete senza limiti', ok: true },
      { text: 'Brainstormer illimitato', ok: true },
      { text: 'Avvocato del Diavolo', ok: true },
      { text: 'Multiplayer 2v2', ok: true },
      { text: 'Upload documenti e immagini: fino a 100/mese', ok: true },
      { text: 'Accesso beta alle nuove funzionalità', ok: true },
      { text: 'Cronologia completa', ok: true },
    ],
    cta: 'Inizia con Premium',
    ctaAction: 'stripe',
  },
]

export default function PricingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleAction = async (plan: typeof PLANS[0]) => {
    if (plan.ctaAction === 'register') {
      router.push(session ? '/' : '/login')
      return
    }

    if (!session) { router.push('/login'); return }

    if (!plan.key) return
    setLoading(plan.key)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: plan.key }),
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setLoading(null)
    }
  }

  return (
    <div className="desktop-bg min-h-screen flex flex-col items-center justify-center px-4 py-16">

      {/* Header */}
      <div className="text-center mb-4">
        <button onClick={() => router.push('/')} className="font-black text-2xl tracking-tight mb-6 inline-block hover:opacity-80 transition-opacity">
          <span className="text-white">Ai</span>
          <span style={{ color: '#A78BFA' }}>GORÀ</span>
        </button>
        <h1 className="text-4xl font-black text-white mb-3">Scegli il tuo piano</h1>
        <p className="text-white/50 text-base max-w-md mx-auto">
          Free include 4 AI. Pro e Premium sbloccano Grok, le modalità avanzate e l'upload documenti.
        </p>
      </div>

      {/* Demo pill */}
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-10"
        style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        Prova senza account su{' '}
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
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: plan.color }}
                />
                <span className="text-white font-bold text-lg">{plan.label}</span>
              </div>
              <div className="flex items-end gap-1">
                {plan.price ? (
                  <>
                    <span className="text-4xl font-black text-white">{plan.price}€</span>
                    <span className="text-white/40 text-sm mb-1">/mese</span>
                  </>
                ) : (
                  <span className="text-4xl font-black text-white">Gratis</span>
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
          </div>
        ))}
      </div>

      {/* Comparison table — mobile hidden */}
      <div className="hidden md:block w-full max-w-4xl mt-14">
        <h2 className="text-white/40 text-xs font-semibold uppercase tracking-widest text-center mb-6">
          Confronto dettagliato
        </h2>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {[
            { feature: 'AI nei dibattiti', free: '4 AI', pro: '4 AI', premium: '4 AI' },
            { feature: 'Grok (Brainstormer e 2v2)', free: false, pro: true, premium: true },
            { feature: 'Dibattiti', free: '3/settimana', pro: '10/giorno', premium: 'Illimitati' },
            { feature: 'Risposte per dibattito', free: 'Fino a 20', pro: 'Estese', premium: 'Illimitate' },
            { feature: 'Brainstormer', free: false, pro: '2 sessioni/settimana', premium: 'Illimitato' },
            { feature: 'Avvocato del Diavolo', free: false, pro: true, premium: true },
            { feature: 'Multiplayer 2v2', free: false, pro: true, premium: true },
            { feature: 'Upload documenti e immagini', free: false, pro: 'fino a 20/mese', premium: 'fino a 100/mese' },
            { feature: 'Cronologia dibattiti', free: false, pro: '30 giorni', premium: 'Completa' },
            { feature: 'Accesso beta nuove funzionalità', free: false, pro: false, premium: true },
          ].map((row, i) => (
            <div
              key={row.feature}
              className="grid grid-cols-4 items-center"
              style={{
                padding: '12px 20px',
                borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined,
                backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : undefined,
              }}
            >
              <span className="text-white/60 text-sm col-span-1">{row.feature}</span>
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
        Pagamento sicuro tramite Stripe · Solo fatturazione mensile · Cancella quando vuoi
      </p>
    </div>
  )
}
