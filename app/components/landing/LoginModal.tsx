'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'
export type SelectableMode = 'chat' | '2v2' | 'devil' | 'brainstorm'

function EyeIcon({ show }: { show: boolean }) {
  return show ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function PasswordInput({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        style={inputStyle}
      />
      <button type="button" onClick={() => setShow(s => !s)}
        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center' }}>
        <EyeIcon show={show} />
      </button>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

interface LoginModalProps {
  mode: SelectableMode
  onClose: () => void
}

export default function LoginModal({ mode, onClose }: LoginModalProps) {
  const t = useTranslations('loginModal')
  const tAuth = useTranslations('auth')

  const [tab, setTab] = useState<'login' | 'register'>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Brainstormer richiede piano Pro — nuovi utenti vanno su /pricing dopo la registrazione
  const callbackUrl = mode === 'brainstorm' ? '/pricing' : '/'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) { setError(t('errors.fillAllFields')); return }
    setLoading(true)
    const result = await signIn('credentials', { email, password, callbackUrl, redirect: false })
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
      const result = await signIn('credentials', { email, password, callbackUrl, redirect: false })
      if (result?.url) window.location.href = result.url
    } catch { setError(t('errors.networkError')) }
    setLoading(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)',
          zIndex: 10000,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10001,
        width: '100%', maxWidth: 380,
        padding: '0 16px',
        boxSizing: 'border-box',
      }}>
        <div style={{
          background: 'rgba(18,12,30,0.98)',
          border: '1px solid rgba(167,139,250,0.2)',
          borderRadius: 24,
          padding: '28px 28px 24px',
          boxShadow: '0 20px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,58,237,0.1)',
          position: 'relative',
        }}>
          {/* Close */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)', border: 'none',
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
              fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>

          {/* Context message */}
          <div style={{
            background: 'rgba(124,58,237,0.12)',
            border: '1px solid rgba(167,139,250,0.2)',
            borderRadius: 12, padding: '10px 14px',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#A78BFA', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {t(`modeLabels.${mode}`)}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
              {t(`modeMessages.${mode}`)}
            </div>
          </div>

          {/* Tab switcher */}
          <div style={{
            display: 'flex', borderRadius: 12, overflow: 'hidden',
            marginBottom: 18, padding: 4,
            background: 'rgba(255,255,255,0.05)',
          }}>
            {(['register', 'login'] as const).map(tabId => (
              <button
                key={tabId}
                onClick={() => { setTab(tabId); setError(''); setPassword(''); setConfirm('') }}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                  background: tab === tabId ? 'rgba(124,58,237,0.7)' : 'transparent',
                  color: tab === tabId ? '#fff' : 'rgba(255,255,255,0.4)',
                }}
              >
                {tabId === 'login' ? t('tabLogin') : t('tabRegister')}
              </button>
            ))}
          </div>

          {/* Forms */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input type="email" placeholder={tAuth('emailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
              <PasswordInput placeholder={tAuth('passwordPlaceholder')} value={password} onChange={setPassword} />
              {error && <p style={{ color: '#f87171', fontSize: 12, textAlign: 'center', margin: 0 }}>{error}</p>}
              <button type="submit" disabled={loading} style={{
                padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
                color: '#fff', fontSize: 14, fontWeight: 700, marginTop: 2,
                opacity: loading ? 0.6 : 1, transition: 'all 0.15s',
              }}>
                {loading ? t('signingIn') : t('signInBtn')}
              </button>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input type="email" placeholder={tAuth('emailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
              <input type="text" placeholder={tAuth('namePlaceholder')} value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
              <PasswordInput placeholder={tAuth('passwordMinPlaceholder')} value={password} onChange={setPassword} />
              <PasswordInput placeholder={tAuth('confirmPasswordPlaceholder')} value={confirm} onChange={setConfirm} />
              {error && <p style={{ color: '#f87171', fontSize: 12, textAlign: 'center', margin: 0 }}>{error}</p>}
              <button type="submit" disabled={loading} style={{
                padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
                color: '#fff', fontSize: 14, fontWeight: 700, marginTop: 2,
                opacity: loading ? 0.6 : 1, transition: 'all 0.15s',
              }}>
                {loading ? t('creatingAccount') : t('createBtn')}
              </button>
            </form>
          )}

          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
            {t('terms')}
          </p>
        </div>
      </div>
    </>
  )
}
