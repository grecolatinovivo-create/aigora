'use client'
import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

const BUBBLES = [
  "L'IA sostituirà i lavori creativi?",
  'Esiste il libero arbitrio?',
  'Il cambiamento climatico è ancora reversibile?',
  'Social media: bene o male per la democrazia?',
  'Dovremmo colonizzare Marte?',
  'La coscienza è solo chimica?',
  'Etica dell\'AI: chi decide?',
  'Il futuro è distopico?',
]

const BUBBLE_POSITIONS = [
  { top: '8%',  left: '4%',  delay: '0s',    duration: '7s'  },
  { top: '18%', right: '3%', delay: '1.2s',  duration: '8s'  },
  { top: '35%', left: '1%',  delay: '2.5s',  duration: '6.5s'},
  { top: '55%', right: '2%', delay: '0.8s',  duration: '9s'  },
  { top: '70%', left: '3%',  delay: '3s',    duration: '7.5s'},
  { top: '80%', right: '4%', delay: '1.8s',  duration: '8.5s'},
  { top: '45%', left: '2%',  delay: '4s',    duration: '6s'  },
  { top: '25%', right: '5%', delay: '2s',    duration: '9.5s'},
]

function FloatingBubbles() {
  return (
    <>
      <style>{`
        @keyframes float-bubble {
          0%   { transform: translateY(0px) scale(1);   opacity: 0.55; }
          50%  { transform: translateY(-14px) scale(1.03); opacity: 0.8; }
          100% { transform: translateY(0px) scale(1);   opacity: 0.55; }
        }
        .bubble-float {
          animation: float-bubble var(--dur) ease-in-out infinite;
          animation-delay: var(--delay);
        }
      `}</style>
      {BUBBLES.map((text, i) => {
        const pos = BUBBLE_POSITIONS[i]
        return (
          <div key={i}
            className="bubble-float absolute hidden md:block px-3 py-2 rounded-full text-[11px] font-medium text-white/60 border border-white/10 whitespace-nowrap pointer-events-none select-none"
            style={{
              ...pos,
              backgroundColor: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(8px)',
              ['--dur' as string]: pos.duration,
              ['--delay' as string]: pos.delay,
              maxWidth: 220,
              whiteSpace: 'normal',
              textAlign: 'center',
              lineHeight: 1.3,
            }}>
            {text}
          </div>
        )
      })}
    </>
  )
}

function AuthCard() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const urlError = searchParams?.get('error')

  const switchTab = (t: 'login' | 'register') => {
    setTab(t); setError(''); setPassword(''); setConfirm('')
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) { setError('Compila tutti i campi.'); return }
    if (password.length < 8) { setError('Password di almeno 8 caratteri.'); return }
    if (password !== confirm) { setError('Le password non coincidono.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Errore durante la registrazione.'); setLoading(false); return }
      const result = await signIn('credentials', { email, password, callbackUrl: '/', redirect: false })
      if (result?.url) window.location.href = result.url
    } catch { setError('Errore di rete. Riprova.'); setLoading(false) }
  }

  return (
    <div className="glass rounded-3xl p-8 w-full max-w-sm scale-in relative z-10">
      {/* Logo */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-black text-white mb-1">Ai<span style={{ color: '#A78BFA' }}>GOR</span>À</h1>
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
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-purple-400 text-sm" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-purple-400 text-sm" />
          {(error || urlError) && <p className="text-red-400 text-xs text-center">{error || 'Errore di accesso. Riprova.'}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
            {loading ? 'Accesso in corso...' : 'Accedi →'}
          </button>
        </form>
      )}

      {/* Form register */}
      {tab === 'register' && (
        <form onSubmit={handleRegister} className="space-y-3">
          <input type="text" placeholder="Il tuo nome (opzionale)" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-purple-400 text-sm" />
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-purple-400 text-sm" />
          <input type="password" placeholder="Password (min. 8 caratteri)" value={password} onChange={e => setPassword(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-purple-400 text-sm" />
          <input type="password" placeholder="Conferma password" value={confirm} onChange={e => setConfirm(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-purple-400 text-sm" />
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
            {loading ? 'Creazione account...' : 'Crea account →'}
          </button>
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
    <div className="desktop-bg min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <FloatingBubbles />
      <Suspense>
        <AuthCard />
      </Suspense>
    </div>
  )
}
