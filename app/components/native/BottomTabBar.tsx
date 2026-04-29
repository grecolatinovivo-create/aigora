'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useIsNative } from './CapacitorProvider'

// ─── Icone SVG inline (no external deps) ─────────────────────────────────────

function IconDebate({ active }: { active: boolean }) {
  const c = active ? '#A78BFA' : 'rgba(255,255,255,0.35)'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={c} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconBrainstorm({ active }: { active: boolean }) {
  const c = active ? '#FCD34D' : 'rgba(255,255,255,0.35)'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={c} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  )
}

function IconProfile({ active }: { active: boolean }) {
  const c = active ? '#38BDF8' : 'rgba(255,255,255,0.35)'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={c} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function BottomTabBar() {
  const isNative = useIsNative()
  const pathname = usePathname()
  const router = useRouter()
  const locale = useLocale()

  // Solo su piattaforma nativa
  if (!isNative) return null

  const base = `/${locale}`

  const tabs = [
    {
      key: 'debate',
      label: 'Dibattito',
      path: `${base}/arena`,
      icon: (active: boolean) => <IconDebate active={active} />,
      activeColor: '#A78BFA',
    },
    {
      key: 'brainstorm',
      label: 'Brainstorm',
      path: `${base}/brainstorm`,
      icon: (active: boolean) => <IconBrainstorm active={active} />,
      activeColor: '#FCD34D',
    },
    {
      key: 'profile',
      label: 'Profilo',
      path: `${base}/dashboard`,
      icon: (active: boolean) => <IconProfile active={active} />,
      activeColor: '#38BDF8',
    },
  ]

  // Determina il tab attivo in base al pathname corrente
  const activeKey = (() => {
    if (pathname.includes('/brainstorm')) return 'brainstorm'
    if (pathname.includes('/dashboard') || pathname.includes('/admin')) return 'profile'
    return 'debate'
  })()

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 900,
        display: 'flex',
        alignItems: 'stretch',
        paddingBottom: 'env(safe-area-inset-bottom)',
        backgroundColor: 'rgba(7,7,15,0.97)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      {tabs.map(tab => {
        const isActive = activeKey === tab.key
        return (
          <button
            key={tab.key}
            onClick={() => router.push(tab.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 4px 8px',
              gap: '3px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              transition: 'opacity 0.15s',
            }}
          >
            {tab.icon(isActive)}
            <span
              style={{
                fontSize: '10px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? tab.activeColor : 'rgba(255,255,255,0.35)',
                transition: 'color 0.2s',
                letterSpacing: '0.02em',
              }}
            >
              {tab.label}
            </span>

            {/* Dot indicatore tab attivo */}
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                backgroundColor: isActive ? tab.activeColor : 'transparent',
                transition: 'background-color 0.2s',
              }}
            />
          </button>
        )
      })}
    </nav>
  )
}
