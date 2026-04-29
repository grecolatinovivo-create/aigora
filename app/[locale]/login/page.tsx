'use client'
import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

type Step =
  | 'login'
  | 'register-email'   // inserisci email → invia codice
  | 'register-verify'  // inserisci codice + nome + password → crea account
  | 'forgot-email'     // inserisci email → invia codice reset
  | 'forgot-verify'    // inserisci codice + nuova password
  | 'forgot-success'   // reset completato

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

function PasswordInput({ placeholder, value, onChange, autoFocus }: { placeholder: string; value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoFocus={autoFocus}
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

// Casella codice a 6 cifre
function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      maxLength={6}
      placeholder="000000"
      value={value}
      onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      autoFocus
      className="w-full px-4 py-4 rounded-xl bg-white/10 text-white placeholder-white/20 border border-white/10 focus:outline-none focus:border-purple-400 text-center text-2xl font-black tracking-[0.4em]"
    />
  )
}

function AuthCard() {
  const t = useTranslations('auth')
  const searchParams = useSearchParams()
  const urlError = searchParams?.get('error')
  const callbackUrl = searchParams?.get('callbackUrl') ?? '/'
  const tabParam = searchParams?.get('tab')

  const [step, setStep] = useState<Step>(tabParam === 'register' ? 'register-email' : 'login')

  // Campi condivisi
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailExists, setEmailExists] = useState(false) // email già registrata durante la registrazione
  const [devCode, setDevCode] = useState<string | null>(null) // codice visibile in dev

  const inputCls = "w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-purple-400 text-sm"

  const reset = (target: Step) => {
    setError(''); setEmailExists(false); setCode(''); setDevCode(null); setLoading(false)
    setStep(target)
  }

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) { setError(t('errors.fillAllFields')); return }
    setLoading(true)
    const result = await signIn('credentials', { email, password, callbackUrl, redirect: false })
    if (result?.error) { setError(t('errors.invalidCredentials')); setLoading(false) }
    else if (result?.url) { window.location.href = result.url }
  }

  // ── REGISTER step 1: invia codice ──────────────────────────────────────────
  const handleRegisterSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !email.includes('@')) { setError(t('errors.fillAllFields')); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409) setEmailExists(true)
        else setError(data.error ?? t('errors.registrationError'))
        setLoading(false); return
      }
      if (data.code) setDevCode(data.code)
      setStep('register-verify')
    } catch { setError(t('errors.networkError')) }
    setLoading(false)
  }

  // ── REGISTER step 2: verifica codice + crea account ───────────────────────
  const handleRegisterCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!code || code.length < 6) { setError('Inserisci il codice a 6 cifre.'); return }
    if (!password.trim()) { setError(t('errors.fillAllFields')); return }
    if (password.length < 8) { setError(t('errors.passwordTooShort')); return }
    if (password !== confirm) { setError(t('errors.passwordsNoMatch')); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, code }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? t('errors.registrationError')); setLoading(false); return }
      // Login automatico dopo registrazione
      const result = await signIn('credentials', { email, password, callbackUrl, redirect: false })
      if (result?.url) window.location.href = result.url
    } catch { setError(t('errors.networkError')) }
    setLoading(false)
  }

  // ── FORGOT step 1: invia codice reset ─────────────────────────────────────
  const handleForgotSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !email.includes('@')) { setError(t('errors.fillAllFields')); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Errore. Riprova.'); setLoading(false); return }
      if (data.code) setDevCode(data.code)
      setStep('forgot-verify')
    } catch { setError(t('errors.networkError')) }
    setLoading(false)
  }

  // ── FORGOT step 2: verifica codice + nuova password ───────────────────────
  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!code || code.length < 6) { setError('Inserisci il codice a 6 cifre.'); return }
    if (password.length < 8) { setError(t('errors.passwordTooShort')); return }
    if (password !== confirm) { setError(t('errors.passwordsNoMatch')); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword: password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Errore. Riprova.'); setLoading(false); return }
      setStep('forgot-success')
    } catch { setError(t('errors.networkError')) }
    setLoading(false)
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────

  const isForgot = step === 'forgot-email' || step === 'forgot-verify' || step === 'forgot-success'
  const isRegister = step === 'register-email' || step === 'register-verify'

  return (
    <div className="glass rounded-3xl p-8 w-full max-w-sm scale-in relative z-10">
      {/* Logo */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-black mb-1">
          <span style={{ color: '#fff' }}>Ai</span><span style={{ color: '#A78BFA' }}>GORÀ</span>
        </h1>
        <p className="text-white/40 text-xs">{t('subtitle')}</p>
      </div>

      {/* Tab login / register — nascosti nei flow secondari */}
      {!isForgot && (
        <div className="flex rounded-xl overflow-hidden mb-6 p-1" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
          <button onClick={() => reset('login')}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ backgroundColor: step === 'login' ? 'rgba(124,58,237,0.7)' : 'transparent', color: step === 'login' ? '#fff' : 'rgba(255,255,255,0.4)' }}>
            {t('signIn')}
          </button>
          <button onClick={() => reset('register-email')}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ backgroundColor: isRegister ? 'rgba(124,58,237,0.7)' : 'transparent', color: isRegister ? '#fff' : 'rgba(255,255,255,0.4)' }}>
            {t('register')}
          </button>
        </div>
      )}

      {/* ── LOGIN ── */}
      {step === 'login' && (
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
          <button type="button" onClick={() => { setEmail(email); reset('forgot-email') }}
            className="w-full text-center text-xs text-white/30 hover:text-white/60 transition-colors pt-1">
            Hai dimenticato la password?
          </button>
        </form>
      )}

      {/* ── REGISTER step 1: email ── */}
      {step === 'register-email' && (
        <form onSubmit={handleRegisterSendCode} className="space-y-3">
          <p className="text-white/40 text-xs text-center mb-1">Inserisci la tua email — ti mandiamo un codice di verifica.</p>
          <input type="email" placeholder={t('emailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} required autoFocus className={inputCls} />
          {emailExists ? (
            <div className="rounded-xl px-4 py-3 text-center" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-red-400 text-xs mb-1.5">Questa email è già registrata.</p>
              <button type="button"
                onClick={() => { setEmailExists(false); reset('forgot-email') }}
                className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors underline underline-offset-2">
                Hai dimenticato la password?
              </button>
            </div>
          ) : error ? (
            <p className="text-red-400 text-xs text-center">{error}</p>
          ) : null}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
            {loading ? 'Invio codice…' : 'Invia codice →'}
          </button>
        </form>
      )}

      {/* ── REGISTER step 2: verifica codice + dati ── */}
      {step === 'register-verify' && (
        <form onSubmit={handleRegisterCreate} className="space-y-3">
          <div className="text-center mb-1">
            <p className="text-white/60 text-xs">Codice inviato a</p>
            <p className="text-white text-sm font-semibold">{email}</p>
            {devCode && (
              <div className="mt-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold" style={{ backgroundColor: 'rgba(16,163,127,0.15)', color: '#10A37F', border: '1px solid rgba(16,163,127,0.3)' }}>
                Dev: {devCode}
              </div>
            )}
          </div>
          <CodeInput value={code} onChange={setCode} />
          <input type="text" placeholder={t('namePlaceholder')} value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          <PasswordInput placeholder={t('passwordMinPlaceholder')} value={password} onChange={setPassword} />
          <PasswordInput placeholder={t('confirmPasswordPlaceholder')} value={confirm} onChange={setConfirm} />
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button type="submit" disabled={loading || code.length < 6}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
            {loading ? t('creatingAccount') : t('createAccountBtn')}
          </button>
          <button type="button" onClick={() => handleRegisterSendCode({ preventDefault: () => {} } as any)}
            disabled={loading}
            className="w-full text-center text-xs text-white/30 hover:text-white/60 transition-colors pt-1 disabled:opacity-30">
            Non hai ricevuto il codice? Reinvia
          </button>
        </form>
      )}

      {/* ── FORGOT step 1: email ── */}
      {step === 'forgot-email' && (
        <form onSubmit={handleForgotSendCode} className="space-y-3">
          <div className="text-center mb-1">
            <p className="text-white font-semibold text-sm">Reimposta la password</p>
            <p className="text-white/40 text-xs mt-1">Inserisci la tua email — ti mandiamo un codice.</p>
          </div>
          <input type="email" placeholder={t('emailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} required autoFocus className={inputCls} />
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
            {loading ? 'Invio codice…' : 'Invia codice →'}
          </button>
          <button type="button" onClick={() => reset('login')}
            className="w-full text-center text-xs text-white/30 hover:text-white/60 transition-colors pt-1">
            ← Torna al login
          </button>
        </form>
      )}

      {/* ── FORGOT step 2: codice + nuova password ── */}
      {step === 'forgot-verify' && (
        <form onSubmit={handleForgotReset} className="space-y-3">
          <div className="text-center mb-1">
            <p className="text-white/60 text-xs">Codice inviato a</p>
            <p className="text-white text-sm font-semibold">{email}</p>
            {devCode && (
              <div className="mt-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold" style={{ backgroundColor: 'rgba(16,163,127,0.15)', color: '#10A37F', border: '1px solid rgba(16,163,127,0.3)' }}>
                Dev: {devCode}
              </div>
            )}
          </div>
          <CodeInput value={code} onChange={setCode} />
          <PasswordInput placeholder="Nuova password (min. 8 caratteri)" value={password} onChange={setPassword} />
          <PasswordInput placeholder={t('confirmPasswordPlaceholder')} value={confirm} onChange={setConfirm} />
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button type="submit" disabled={loading || code.length < 6}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
            {loading ? 'Salvataggio…' : 'Reimposta password →'}
          </button>
          <button type="button" onClick={() => handleForgotSendCode({ preventDefault: () => {} } as any)}
            disabled={loading}
            className="w-full text-center text-xs text-white/30 hover:text-white/60 transition-colors pt-1 disabled:opacity-30">
            Non hai ricevuto il codice? Reinvia
          </button>
        </form>
      )}

      {/* ── FORGOT success ── */}
      {step === 'forgot-success' && (
        <div className="space-y-4 text-center">
          <div className="text-4xl">✅</div>
          <p className="text-white font-semibold text-sm">Password reimpostata!</p>
          <p className="text-white/40 text-xs">Puoi ora accedere con la tua nuova password.</p>
          <button onClick={() => { reset('login'); setPassword('') }}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
            Vai al login →
          </button>
        </div>
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
      <div style={{ position: 'fixed', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 600, background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.09) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <Suspense>
        <AuthCard />
      </Suspense>
    </div>
  )
}
