'use client'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'

const PLAN_AIS: Record<string, string[]> = {
  starter: ['Claude', 'Gemini'],
  pro:     ['Claude', 'Gemini', 'Perplexity'],
  max:     ['Claude', 'Gemini', 'Perplexity', 'GPT'],
  admin:   ['Claude', 'Gemini', 'Perplexity', 'GPT'],
}
const PLAN_COLORS: Record<string, string> = { starter: '#1A73E8', pro: '#7C3AED', max: '#FF6B2B', admin: '#FFD700' }

function DashboardContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useSearchParams()
  const success = params.get('success')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  if (status === 'loading') return (
    <div className="desktop-bg min-h-screen flex items-center justify-center">
      <div className="text-white/50">Caricamento...</div>
    </div>
  )

  const plan = (session?.user as any)?.plan ?? 'none'
  const ais = PLAN_AIS[plan] ?? []
  const color = PLAN_COLORS[plan] ?? '#666'

  return (
    <div className="desktop-bg min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="glass rounded-3xl p-8 w-full max-w-md scale-in text-center">
        <h1 className="text-3xl font-black mb-1"><span className="text-white">Ai</span><span style={{ color: '#A78BFA' }}>GORÀ</span></h1>
        <p className="text-white/40 text-sm mb-6">Benvenuto, {session?.user?.name || session?.user?.email}</p>

        {success && (
          <div className="mb-5 p-3 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: 'rgba(16,163,127,0.2)', border: '1px solid rgba(16,163,127,0.3)' }}>
            🎉 Abbonamento attivato! Buon dibattito.
          </div>
        )}

        {plan !== 'none' ? (
          <>
            <div className="mb-5 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: color + '25', border: `1px solid ${color}50` }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
              Piano {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </div>
            <div className="mb-6 text-white/50 text-sm">Le tue AI: <span className="text-white/80">{ais.join(', ')}</span></div>
            <button onClick={() => router.push('/')}
              className="w-full py-3 rounded-xl text-sm font-bold text-white mb-3 transition-all hover:scale-[1.02]"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 4px 20px ${color}44` }}>
              Avvia il dibattito →
            </button>
          </>
        ) : (
          <>
            <p className="text-white/50 text-sm mb-5">Non hai ancora un piano attivo.</p>
            <button onClick={() => router.push('/pricing')}
              className="w-full py-3 rounded-xl text-sm font-bold text-white mb-3 transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
              Scegli un piano →
            </button>
          </>
        )}

        <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-white/30 text-xs hover:text-white/60 transition-colors">
          Esci dall&apos;account
        </button>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return <Suspense><DashboardContent /></Suspense>
}
