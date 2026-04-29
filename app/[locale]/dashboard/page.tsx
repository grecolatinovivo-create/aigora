'use client'
// Dashboard — hub di navigazione utente
// Sprint 2 — 29 apr 2026

import { useSession, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { useTranslations, useLocale } from 'next-intl'

// ── Costanti ─────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  free: 'Free', pro: 'Pro', premium: 'Premium',
  admin: 'Admin', freemium: 'Freemium', starter: 'Free', max: 'Premium',
}
const PLAN_COLORS: Record<string, string> = {
  free: '#10A37F', pro: '#A78BFA', premium: '#FF6B2B',
  admin: '#F59E0B', freemium: '#22D3EE', starter: '#10A37F', max: '#FF6B2B',
}
const PLAN_NEXT: Record<string, string | null> = {
  free: 'pro', pro: 'premium', premium: null, admin: null, freemium: null,
}

const MODES = [
  { key: 'arena',  color: '#A78BFA', label: 'Arena',      desc: 'Dibattito 4 AI',          path: '/',           icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', locked: false },
  { key: '2v2',   color: '#38BDF8', label: '2 vs 2',     desc: 'Sfida a squadre',          path: null,          icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', locked: false },
  { key: 'devil', color: '#F87171', label: 'Devil',       desc: 'Difendi l\'indifendibile', path: null,          icon: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z', locked: true },
  { key: 'brain', color: '#FCD34D', label: 'Brainstorm',  desc: '4 AI per la tua idea',     path: '/brainstorm', icon: 'M9 18h6M10 22h4M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14', locked: true },
] as const

const PAID = ['pro', 'premium', 'admin', 'freemium', 'max']

// ── Tipi chat ────────────────────────────────────────────────────────────────

interface SavedChat {
  id: string
  title: string
  date: string
}

// ── Componenti interni ────────────────────────────────────────────────────────

function ModeButton({
  color, label, desc, icon, locked, paid, onClick,
}: {
  color: string; label: string; desc: string; icon: string
  locked: boolean; paid: boolean; onClick: () => void
}) {
  const isLocked = locked && !paid
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 14px',
        borderRadius: 16,
        background: `linear-gradient(135deg, ${color}12, ${color}06)`,
        border: `1px solid ${isLocked ? 'rgba(255,255,255,0.06)' : color + '28'}`,
        cursor: 'pointer', textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        opacity: isLocked ? 0.6 : 1,
        transition: 'opacity 0.15s',
        overflow: 'hidden',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: isLocked ? 'rgba(255,255,255,0.06)' : `${color}1a`,
        border: `1px solid ${isLocked ? 'rgba(255,255,255,0.08)' : color + '28'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
          stroke={isLocked ? 'rgba(255,255,255,0.3)' : color}
          strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: isLocked ? 'rgba(255,255,255,0.4)' : '#fff', lineHeight: 1.2 }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>{desc}</div>
      </div>
      {isLocked ? (
        <div style={{
          fontSize: 12, fontWeight: 900, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: '#A78BFA',
          background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.22)',
          padding: '2px 8px', borderRadius: 999, flexShrink: 0,
        }}>Pro+</div>
      ) : (
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
          stroke={color} strokeWidth={2.5} strokeLinecap="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      )}
    </button>
  )
}

// ── Contenuto principale ──────────────────────────────────────────────────────

function DashboardContent() {
  const t      = useTranslations('dashboard')
  const locale = useLocale()
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useSearchParams()
  const success = params.get('success')

  const [portalLoading, setPortalLoading] = useState(false)
  const [recentChats, setRecentChats]     = useState<SavedChat[]>([])
  const [loadingChats, setLoadingChats]   = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push(`/${locale}/login`)
  }, [status, router, locale])

  // Carica sessioni recenti
  useEffect(() => {
    if (status !== 'authenticated') return
    setLoadingChats(true)
    fetch('/api/chats')
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        setRecentChats(
          (data ?? []).slice(0, 4).map(c => ({
            id: c.id,
            title: c.title || 'Sessione senza titolo',
            date: c.createdAt ?? c.date ?? '',
          }))
        )
      })
      .catch(() => {})
      .finally(() => setLoadingChats(false))
  }, [status])

  if (status === 'loading') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07070f' }}>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>{t('managingLoading')}</div>
    </div>
  )

  const plan      = (session?.user as any)?.plan ?? 'free'
  const color     = PLAN_COLORS[plan] ?? '#10A37F'
  const label     = PLAN_LABELS[plan] ?? plan
  const paid      = PAID.includes(plan)
  const nextPlan  = PLAN_NEXT[plan]
  const userName  = session?.user?.name || session?.user?.email || ''
  const initial   = (userName[0] ?? 'U').toUpperCase()

  const formatDate = (d: string) => {
    if (!d) return ''
    try {
      return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
    } catch { return '' }
  }

  async function handlePortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally { setPortalLoading(false) }
  }

  const handleModeClick = (mode: typeof MODES[number]) => {
    if (mode.locked && !paid) { router.push(`/${locale}/pricing`); return }
    if (mode.path) router.push(`/${locale}${mode.path}`)
    else router.push(`/${locale}`)  // Arena e 2v2 vanno alla home (HomeScreen)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#07070f', color: '#fff',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <button onClick={() => router.push(`/${locale}`)} style={{
          fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em',
          lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer',
        }}>
          <span style={{ color: '#fff' }}>Ai</span>
          <span style={{ color: '#A78BFA' }}>GORÀ</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: color, boxShadow: `0 2px 10px ${color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 14, color: '#fff', flexShrink: 0,
          }}>
            {initial}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px 32px', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Banner successo abbonamento */}
        {success && (
          <div style={{
            marginTop: 16, padding: '12px 16px', borderRadius: 14,
            background: 'rgba(16,163,127,0.14)', border: '1px solid rgba(16,163,127,0.28)',
            fontSize: 13, fontWeight: 600, color: '#34d399',
          }}>
            {t('subscriptionActivated')}
          </div>
        )}

        {/* ── Sezione Piano ── */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>
            Il tuo piano
          </div>
          <div style={{
            padding: '16px', borderRadius: 18,
            background: `linear-gradient(135deg, ${color}18, ${color}08)`,
            border: `1px solid ${color}30`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: nextPlan ? 12 : 0 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>
                  {label}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                  {userName}
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 999,
                background: `${color}22`, border: `1px solid ${color}38`,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} className="animate-pulse" />
                <span style={{ fontSize: 12, fontWeight: 800, color }}>{label}</span>
              </div>
            </div>

            {/* Barra verso tier successivo */}
            {nextPlan && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                    {PLAN_LABELS[nextPlan]}
                  </span>
                </div>
                <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: plan === 'free' ? '20%' : '65%',
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${color}, ${PLAN_COLORS[nextPlan]})`,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
                <button
                  onClick={() => router.push(`/${locale}/pricing`)}
                  style={{
                    marginTop: 10, width: '100%', padding: '9px',
                    borderRadius: 10, border: 'none',
                    background: `linear-gradient(135deg, ${color}, ${PLAN_COLORS[nextPlan]})`,
                    color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    boxShadow: `0 3px 14px ${color}35`,
                  }}>
                  {t('upgradePro')} →
                </button>
              </div>
            )}

            {/* Gestisci abbonamento — piani paid */}
            {paid && plan !== 'admin' && (
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                style={{
                  marginTop: nextPlan ? 0 : 10,
                  width: '100%', padding: '8px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer',
                }}>
                {portalLoading ? t('managingLoading') : t('manageSub')}
              </button>
            )}
          </div>
        </div>

        {/* ── Accesso rapido ai 4 modi ── */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>
            Accesso rapido
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MODES.map(mode => (
              <ModeButton
                key={mode.key}
                color={mode.color}
                label={mode.label}
                desc={mode.desc}
                icon={mode.icon}
                locked={mode.locked}
                paid={paid}
                onClick={() => handleModeClick(mode)}
              />
            ))}
          </div>
        </div>

        {/* ── Sessioni recenti ── */}
        {(recentChats.length > 0 || loadingChats) && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>
              Sessioni recenti
            </div>
            {loadingChats ? (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', padding: '8px 0' }}>
                Caricamento…
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recentChats.map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => router.push(`/${locale}?resume=${chat.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '11px 13px', borderRadius: 13,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      cursor: 'pointer', textAlign: 'left',
                      WebkitTapHighlightColor: 'transparent',
                    }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: 'rgba(167,139,250,0.1)',
                      border: '1px solid rgba(167,139,250,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
                        stroke="rgba(167,139,250,0.6)" strokeWidth={2.2} strokeLinecap="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, color: 'rgba(255,255,255,0.65)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {chat.title}
                      </div>
                    </div>
                    {chat.date && (
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                        {formatDate(chat.date)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Footer: logout ── */}
        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <button
            onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, color: 'rgba(255,255,255,0.2)',
            }}>
            {t('signOut')}
          </button>
        </div>

      </div>
    </div>
  )
}

export default function DashboardPage() {
  return <Suspense><DashboardContent /></Suspense>
}
