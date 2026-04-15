'use client'
import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

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
  const [tab, setTab] = useState<'login' | 'register'>('login')
  // Step registrazione: 'form' → 'verify'
  const [regStep, setRegStep] = useState<'form' | 'verify'>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [devCode, setDevCode] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const urlError = searchParams?.get('error')

  const switchTab = (t: 'login' | 'register') => {
    setTab(t); setError(''); setPassword(''); setConfirm(''); setCode(''); setRegStep('form')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) { setError('Compila tutti i campi.'); return }
    setLoading(true)
    const result = await signIn('credentials', { email, password, callbackUrl: '/', redirect: false })
    if (result?.error) { setError('Email o password non corretti.'); setLoading(false) }
    else if (result?.url) { window.location.href = result.url }
  }

  // Step 1 — invia codice di verifica
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) { setError('Compila tutti i campi.'); return }
    if (password.length < 8) { setError('Password di almeno 8 caratteri.'); return }
    if (password !== confirm) { setError('Le password non coincidono.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Errore nell\'invio del codice.'); setLoading(false); return }
      if (data.code) setDevCode(data.code) // fallback temporaneo finché il dominio non è verificato
      setRegStep('verify')
      setResendCooldown(60)
      const t = setInterval(() => setResendCooldown(c => { if (c <= 1) { clearInterval(t); return 0 } return c - 1 }), 1000)
    } catch { setError('Errore di rete. Riprova.') }
    setLoading(false)
  }

  // Step 2 — verifica codice e completa registrazione
  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (code.length !== 6) { setError('Inserisci il codice a 6 cifre.'); return }
    setLoading(true)
    try {
      // Verifica codice
      const vRes = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const vData = await vRes.json()
      if (!vRes.ok) { setError(vData.error ?? 'Codice non valido.'); setLoading(false); return }

      // Registra utente
      const rRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })
      const rData = await rRes.json()
      if (!rRes.ok) { setError(rData.error ?? 'Errore durante la registrazione.'); setLoading(false); return }

      // Auto-login
      const result = await signIn('credentials', { email, password, callbackUrl: '/', redirect: false })
      if (result?.url) window.location.href = result.url
    } catch { setError('Errore di rete. Riprova.') }
    setLoading(false)
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0) return
    setError('')
    setLoading(true)
    try {
      await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setResendCooldown(60)
      const t = setInterval(() => setResendCooldown(c => { if (c <= 1) { clearInterval(t); return 0 } return c - 1 }), 1000)
    } catch {}
    setLoading(false)
  }

  const inputCls = "w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-purple-400 text-sm"

  return (
    <div className="glass rounded-3xl p-8 w-full max-w-sm scale-in relative z-10">
      {/* Logo */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-black mb-1"><span className="text-white">Ai</span><span style={{ color: '#A78BFA' }}>GORÀ</span></h1>
        <p className="text-white/40 text-xs">Il dibattito delle intelligenze artificiali</p>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-xl overflow-hidden mb-6 p-1" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <button onClick={() => switchTab('login')}
          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ backgroundColor: tab === 'login' ? 'rgba(124,58,237,0.7)' : 'transparent', color: tab === 'login' ? '#fff' : 'rgba(255,255,255,0.4)' }}>
          Accedi
        </button>
        <button onClick={() => switchTab('register')}
          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ backgroundColor: tab === 'register' ? 'rgba(124,58,237,0.7)' : 'transparent', color: tab === 'register' ? '#fff' : 'rgba(255,255,255,0.4)' }}>
          Iscriviti
        </button>
      </div>

      {/* Form login */}
      {tab === 'login' && (
        <form onSubmit={handleLogin} className="space-y-3">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className={inputCls} />
          <PasswordInput placeholder="Password" value={password} onChange={setPassword} />
          {(error || urlError) && <p className="text-red-400 text-xs text-center">{error || 'Errore di accesso. Riprova.'}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
            {loading ? 'Accesso in corso...' : 'Accedi →'}
          </button>
        </form>
      )}

      {/* Form register — step 1: dati */}
      {tab === 'register' && regStep === 'form' && (
        <form onSubmit={handleSendCode} className="space-y-3">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className={inputCls} />
          <PasswordInput placeholder="Password (min. 8 caratteri)" value={password} onChange={setPassword} />
          <PasswordInput placeholder="Conferma password" value={confirm} onChange={setConfirm} />
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
            {loading ? 'Invio codice...' : 'Continua →'}
          </button>
        </form>
      )}

      {/* Form register — step 2: verifica codice */}
      {tab === 'register' && regStep === 'verify' && (
        <form onSubmit={handleVerifyAndRegister} className="space-y-4">
          <div className="text-center mb-2">
            <div className="text-2xl mb-2">📬</div>
            <p className="text-white/70 text-sm">Abbiamo inviato un codice a</p>
            <p className="text-white font-semibold text-sm truncate">{email}</p>
            {devCode && (
              <div className="mt-3 px-3 py-2 rounded-xl text-xs" style={{ backgroundColor: 'rgba(124,58,237,0.15)', color: '#A78BFA' }}>
                Il tuo codice (temporaneo): <strong className="text-white tracking-widest">{devCode}</strong>
              </div>
            )}
          </div>
          <div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              autoFocus
              className="w-full px-4 py-4 rounded-xl bg-white/10 text-white placeholder-white/20 border border-white/10 focus:outline-none focus:border-purple-400 text-center text-2xl font-black tracking-[0.5em]"
            />
          </div>
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button type="submit" disabled={loading || code.length !== 6}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
            {loading ? 'Verifica...' : 'Verifica e crea account →'}
          </button>
          <div className="flex items-center justify-between text-xs">
            <button type="button" onClick={() => { setRegStep('form'); setCode(''); setError('') }}
              className="text-white/30 hover:text-white/60 transition-colors">
              ← Modifica email
            </button>
            <button type="button" onClick={handleResendCode} disabled={resendCooldown > 0}
              className="text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {resendCooldown > 0 ? `Reinvia tra ${resendCooldown}s` : 'Reinvia codice'}
            </button>
          </div>
        </form>
      )}

      <p className="text-white/20 text-[10px] text-center mt-5 leading-relaxed">
        Continuando accetti i Termini di Servizio e la Privacy Policy di AiGORÀ
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="desktop-bg min-h-screen flex items-center justify-center px-4">
      <Suspense>
        <AuthCard />
      </Suspense>
    </div>
  )
}
