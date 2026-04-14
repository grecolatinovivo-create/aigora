'use client'
import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) {
      setError('Compila tutti i campi.')
      return
    }
    setLoading(true)
    const result = await signIn('credentials', {
      email,
      password,
      callbackUrl: '/dashboard',
      redirect: false,
    })
    if (result?.error) {
      setError('Email o password non corretti.')
      setLoading(false)
    } else if (result?.url) {
      window.location.href = result.url
    }
  }

  const urlError = searchParams?.get('error')

  return (
    <div className="desktop-bg min-h-screen flex items-center justify-center px-4">
      <div className="glass rounded-3xl p-8 w-full max-w-sm scale-in">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white mb-2">Ai<span style={{ color: '#A78BFA' }}>GOR</span>À</h1>
          <p className="text-white/50 text-sm">Accedi per iniziare</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-purple-400 text-sm"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-purple-400 text-sm"
          />

          {(error || urlError) && (
            <p className="text-red-400 text-xs text-center">{error || 'Errore di accesso. Riprova.'}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>

        <p className="text-white/30 text-xs text-center mt-6">
          Non hai un account?{' '}
          <Link href="/register" className="text-purple-400 hover:text-purple-300">
            Registrati
          </Link>
        </p>
        <p className="text-white/20 text-[10px] text-center mt-3 leading-relaxed">
          Accedendo accetti i Termini di Servizio e la Privacy Policy di AiGORÀ
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
