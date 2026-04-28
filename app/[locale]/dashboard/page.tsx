'use client'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { useTranslations } from 'next-intl'

const PLAN_LABELS: Record<string, string> = {
  free:    'Free',
  pro:     'Pro',
  premium: 'Premium',
  admin:   'Admin',
  // legacy
  starter: 'Free',
  max:     'Premium',
}

const PLAN_AIS: Record<string, string[]> = {
  free:    ['Claude', 'GPT', 'Gemini', 'Perplexity'],
  pro:     ['Claude', 'GPT', 'Gemini', 'Perplexity'],
  premium: ['Claude', 'GPT', 'Gemini', 'Perplexity'],
  admin:   ['Claude', 'GPT', 'Gemini', 'Perplexity'],
  // legacy
  starter: ['Claude', 'Gemini'],
  max:     ['Claude', 'GPT', 'Gemini', 'Perplexity'],
}

const PLAN_COLORS: Record<string, string> = {
  free:    '#6B7280',
  pro:     '#7C3AED',
  premium: '#FF6B2B',
  admin:   '#FFD700',
  // legacy
  starter: '#1A73E8',
  max:     '#FF6B2B',
}

function DashboardContent() {
  const t = useTranslations('dashboard')
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useSearchParams()
  const success = params.get('success')
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  if (status === 'loading') return (
    <div className="desktop-bg min-h-screen flex items-center justify-center">
      <div className="text-white/50">{t('managingLoading')}</div>
    </div>
  )

  const plan = (session?.user as any)?.plan ?? 'free'
  const ais = PLAN_AIS[plan] ?? []
  const color = PLAN_COLORS[plan] ?? '#6B7280'
  const label = PLAN_LABELS[plan] ?? plan
  const isPaid = plan === 'pro' || plan === 'premium' || plan === 'max' || plan === 'admin'
  const isFree = plan === 'free' || plan === 'starter'

  async function handlePortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      /* noop */
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div className="desktop-bg min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="glass rounded-3xl p-8 w-full max-w-md scale-in text-center">
        <h1 className="text-3xl font-black mb-1">
          <span className="text-white">Ai</span><span style={{ color: '#A78BFA' }}>GORÀ</span>
        </h1>
        <p className="text-white/40 text-sm mb-6">
          {t('welcome')}, {session?.user?.name || session?.user?.email}
        </p>

        {success && (
          <div
            className="mb-5 p-3 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: 'rgba(16,163,127,0.2)', border: '1px solid rgba(16,163,127,0.3)' }}
          >
            {t('subscriptionActivated')}
          </div>
        )}

          <>
            {/* Badge piano */}
            <div
              className="mb-5 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: color + '25', border: `1px solid ${color}50` }}
            >
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
              {t('plan')} {label}
            </div>

            <div className="mb-6 text-white/50 text-sm">
              {t('yourAIs')} <span className="text-white/80">{ais.join(', ')}</span>
            </div>

            {/* CTA principale */}
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 rounded-xl text-sm font-bold text-white mb-3 transition-all hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                boxShadow: `0 4px 20px ${color}44`,
              }}
            >
              {t('launchDebate')}
            </button>

            {/* Gestisci abbonamento — piani a pagamento */}
            {isPaid && (
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="w-full py-2.5 rounded-xl text-sm font-medium mb-3 transition-all hover:scale-[1.01] disabled:opacity-40"
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {portalLoading ? t('managingLoading') : t('manageSub')}
              </button>
            )}

            {/* Upgrade — piano free */}
            {isFree && (
              <button
                onClick={() => router.push('/pricing')}
                className="w-full py-2.5 rounded-xl text-sm font-medium mb-3 transition-all hover:scale-[1.01]"
                style={{
                  color: 'rgba(167,139,250,0.8)',
                  border: '1px solid rgba(167,139,250,0.2)',
                }}
              >
                {t('upgradePro')}
              </button>
            )}
          </>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-white/30 text-xs hover:text-white/60 transition-colors"
        >
          {t('signOut')}
        </button>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return <Suspense><DashboardContent /></Suspense>
}
