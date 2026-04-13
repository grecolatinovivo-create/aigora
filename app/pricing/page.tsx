'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const AI_COLOR: Record<string, string> = { claude: '#7C3AED', gpt: '#10A37F', gemini: '#1A73E8', perplexity: '#FF6B2B' }
const AI_NAMES: Record<string, string> = { claude: 'Claude', gpt: 'GPT-4.1', gemini: 'Gemini', perplexity: 'Perplexity' }

const PLANS = [
  { key: 'starter', label: 'Starter', price: '6,99', color: '#1A73E8', ais: ['claude', 'gemini'],
    features: ['2 intelligenze artificiali', 'Claude (Anthropic)', 'Gemini (Google)', 'Dibattiti illimitati'] },
  { key: 'pro', label: 'Pro', price: '8,99', color: '#7C3AED', popular: true, ais: ['claude', 'gemini', 'perplexity'],
    features: ['3 intelligenze artificiali', 'Claude (Anthropic)', 'Gemini (Google)', 'Perplexity (aggiornato al web)', 'Dibattiti illimitati'] },
  { key: 'max', label: 'Max', price: '9,99', color: '#FF6B2B', ais: ['claude', 'gemini', 'perplexity', 'gpt'],
    features: ['4 intelligenze artificiali', 'Claude (Anthropic)', 'Gemini (Google)', 'Perplexity (aggiornato al web)', 'GPT-4.1 (OpenAI)', 'Dibattiti illimitati'] },
]

export default function PricingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = async (planKey: string) => {
    if (!session) { router.push('/login'); return }
    setLoading(planKey)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planKey }),
    })
    const { url } = await res.json()
    if (url) window.location.href = url
    else setLoading(null)
  }

  return (
    <div className="desktop-bg min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-black text-white mb-3">Ai<span style={{ color: '#A78BFA' }}>GOR</span>À</h1>
        <p className="text-white/50 text-base">Scegli il piano e inizia il dibattito</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl">
        {PLANS.map((plan, i) => (
          <div key={plan.key} className="relative glass rounded-3xl p-6 flex flex-col"
            style={{ animationDelay: `${i * 80}ms`, border: plan.popular ? `1px solid ${plan.color}55` : undefined, boxShadow: plan.popular ? `0 0 40px ${plan.color}22` : undefined }}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold text-white" style={{ background: plan.color }}>
                PIÙ POPOLARE
              </div>
            )}
            <div className="mb-5">
              <div className="text-white font-bold text-lg mb-1">{plan.label}</div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-black text-white">{plan.price}€</span>
                <span className="text-white/40 text-sm mb-1">/mese</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {plan.ais.map(ai => (
                <div key={ai} className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium text-white"
                  style={{ backgroundColor: AI_COLOR[ai] + '30', border: `1px solid ${AI_COLOR[ai]}50` }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: AI_COLOR[ai] }} />
                  {AI_NAMES[ai]}
                </div>
              ))}
            </div>
            <ul className="space-y-2 flex-1 mb-6">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-[13px] text-white/70">
                  <span style={{ color: plan.color }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <button onClick={() => handleSubscribe(plan.key)} disabled={loading === plan.key}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`, boxShadow: `0 4px 20px ${plan.color}44` }}>
              {loading === plan.key ? '...' : `Inizia con ${plan.label} →`}
            </button>
          </div>
        ))}
      </div>
      <p className="text-white/20 text-xs mt-8">Pagamento sicuro tramite Stripe · Cancella quando vuoi</p>
    </div>
  )
}
