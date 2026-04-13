'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Compila tutti i campi.')
      return
    }
    if (password.length < 8) {
      setError('La password deve essere di almeno 8 caratteri.')
      return
    }
    if (password !== confirm) {
      setError('Le password non coincidono.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Errore durante la registrazione.')
        setLoading(false)
        return
      }
      // Auto-login dopo registrazione
      await signIn('credentials', { email, password, callbackUrl: '/dashboard' })
    } catch {
      setError('Errore di rete. Riprova.')
      setLoading(false)
    }
  }

  return (
    <div className="desktop-bg min-h-screen flex items-center justify-center px-4">
      <div className="glass rounded-3xl p-8 w-full max-w-sm scale-in">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white mb-2">Ai<span style={{ color: '#A78BFA' }}>GOR</span>À</h1>
          <p className="text-white/50 text-sm">Crea un account</p>
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
            placeholder="Password (min. 8 caratteri)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-purple-400 text-sm"
          />
          <input
            type="password"
            placeholder="Conferma password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-purple-400 text-sm"
          />

          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
            {loading ? 'Creazione account...' : 'Crea account'}
          </button>
        </form>

        <p className="text-white/30 text-xs text-center mt-6">
          Hai già un account?{' '}
          <Link href="/login" className="text-purple-400 hover:text-purple-300">
            Accedi
          </Link>
        </p>
        <p className="text-white/20 text-[10px] text-center mt-3 leading-relaxed">
          Registrandoti accetti i Termini di Servizio e la Privacy Policy di AiGORÀ
        </p>
      </div>
    </div>
  )
}
