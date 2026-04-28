'use client'
import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

function EyeIcon({ show }: { show: boolean }) {
  return show ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function PasswordInput({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        className="w-full px-4 py-3 pr-11 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-purple-400 text-sm"
      />
      <button type="button" onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
        <EyeIcon show={show} />
      </button>
    </div>
  )
}

function AuthCard() {
  const t = useTranslations('auth')
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const urlError = searchParams?.get('error')

  const switchTab = (t2: 'login' | 'register') => {
    setTab(t2); setError(''); setPassword(''); setConfirm('')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) { setError(t('errors.fillAllFields')); return }
    setLoading(true)
    const result = await signIn('credentials', { email, password, callbackUrl: '/', redirect: false })
    if (result?.error) { setError(t('errors.invalidCredentials')); setLoading(false) }
    else if (result?.url) { window.location.href = result.url }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) { setError(t('errors.fillAllFields')); return }
    if (password.length < 8) { setError(t('errors.passwordTooShort')); return }
    if (password !== confirm) { setError(t('errors.passwordsNoMatch')); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? t('errors.registrationError')); setLoading(false); return }
      const result = await signIn('credentials', { email, password, callbackUrl: '/', redirect: false })
      if (result?.url) window.location.href = result.url
    } catch { setError(t('errors.networkError')) }
    setLoading(false)
  }

  const inputCls = "w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-purple-400 text-sm"

  return (
    <div className="glass rounded-3xl p-8 w-full max-w-sm scale-in relative z-10">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-black mb-1">
          <span className="text-white">Ai</span><span style={{ color: '#A78BFA' }}>GORÀ</span>
        </h1>
        <p className="text-white/40 text-xs">{t('subtitle')}</p>
      </div>

      <div className="flex rounded-xl overflow-hidden mb-6 p-1" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <button onClick={() => switchTab('login')}
          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ backgroundColor: tab === 'login' ? 'rgba(124,58,237,0.7)' : 'transparent', color: tab === 'login' ? '#fff' : 'rgba(255,255,255,0.4)' }}>
          {t('signIn')}
        </button>
        <button onClick={() => switchTab('register')}
          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ backgroundColor: tab === 'register' ? 'rgba(124,58,237,0.7)' : 'transparent', color: tab === 'register' ? '#fff' : 'rgba(255,255,255,0.4)' }}>
          {t('register')}
        </button>
      </div>

      {tab === 'login' && (
        <form onSubmit={handleLogin} className="space-y-3">
          <input type="email" placeholder={t('emailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} required className={inputCls} />
          <PasswordInput placeholder={t('passwordPlaceholder')} value={password} onChange={setPassword} />
          {(error || urlError) && (
            <p className="text-red-400 text-xs text-center">{error || t('errors.accessError')}</p>
          )}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
            {loading ? t('signingIn') : t('signingInBtn')}
          </button>
        </form>
      )}

      {tab === 'register' && (
        <form onSubmit={handleRegister} className="space-y-3">
          <input type="email" placeholder={t('emailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} required className={inputCls} />
          <input type="text" placeholder={t('namePlaceholder')} value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          <PasswordInput placeholder={t('passwordMinPlaceholder')} value={password} onChange={setPassword} />
          <PasswordInput placeholder={t('confirmPasswordPlaceholder')} value={confirm} onChange={setConfirm} />
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
            {loading ? t('creatingAccount') : t('createAccountBtn')}
          </button>
        </form>
      )}

      <p className="text-white/20 text-[10px] text-center mt-5 leading-relaxed">
        {t('terms')}
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div style={{ background: '#07070f', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', position: 'relative' }}>
      {/* Glow centrato — identico alla landing */}
      <div style={{ position: 'fixed', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 600, background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.09) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <Suspense>
        <AuthCard />
      </Suspense>
    </div>
  )
}
