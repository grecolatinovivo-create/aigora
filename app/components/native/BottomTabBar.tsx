'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useIsNative } from './CapacitorProvider'

// ─── Icone SVG inline ────────────────────────────────────────────────────────

// Arena — due bolle di dialogo stilizzate
function IconArena({ active }: { active: boolean }) {
  const c = active ? '#A78BFA' : 'rgba(255,255,255,0.32)'
  const w = active ? 2.2 : 1.8
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

// 2v2 — due persone affiancate
function Icon2v2({ active }: { active: boolean }) {
  const c = active ? '#FB923C' : 'rgba(255,255,255,0.32)'
  const w = active ? 2.2 : 1.8
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

// Devil's Advocate — fiamma
function IconDevil({ active }: { active: boolean }) {
  const c = active ? '#F87171' : 'rgba(255,255,255,0.32)'
  const w = active ? 2.2 : 1.8
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  )
}

// Brainstorm — lampadina
function IconBrainstorm({ active }: { active: boolean }) {
  const c = active ? '#FCD34D' : 'rgba(255,255,255,0.32)'
  const w = active ? 2.2 : 1.8
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <line x1="9"  y1="18" x2="15" y2="18" />
      <line x1="10" y1="22" x2="14" y2="22" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  )
}

// ─── Tipo tab ──────────────────────────────────────────────────────────────────
interface Tab {
  key:         string
  label:       string
  path:        string
  icon:        (active: boolean) => React.ReactNode
  activeColor: string
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function BottomTabBar() {
  const isNative = useIsNative()
  const pathname = usePathname()
  const router   = useRouter()
  const locale   = useLocale()

  if (!isNative) return null

  const base = `/${locale}`

  const tabs: Tab[] = [
    {
      key:         'arena',
      label:       'Arena',
      path:        `${base}/arena`,
      icon:        (a) => <IconArena active={a} />,
      activeColor: '#A78BFA',
    },
    {
      key:         '2v2',
      label:       '2 vs 2',
      path:        `${base}/2v2`,
      icon:        (a) => <Icon2v2 active={a} />,
      activeColor: '#FB923C',
    },
    {
      key:         'devil',
      label:       "Devil",
      path:        `${base}/arena`,   // Devil è un modo nell'arena
      icon:        (a) => <IconDevil active={a} />,
      activeColor: '#F87171',
    },
    {
      key:         'brainstorm',
      label:       'Brainstorm',
      path:        `${base}/brainstorm`,
      icon:        (a) => <IconBrainstorm active={a} />,
      activeColor: '#FCD34D',
    },
  ]

  // Determina il tab attivo in base al pathname corrente
  const activeKey = (() => {
    if (pathname.includes('/2v2'))        return '2v2'
    if (pathname.includes('/brainstorm')) return 'brainstorm'
    // Devil mode: room con devil + pathname nell'arena non in 2v2/brainstorm
    // (non possiamo distinguere dall'URL, quindi arena di default)
    if (pathname.includes('/arena') || pathname.includes('/room')) return 'arena'
    return 'arena'
  })()

  return (
    <nav
      style={{
        position:           'fixed',
        bottom:             0,
        left:               0,
        right:              0,
        zIndex:             900,
        display:            'flex',
        alignItems:         'stretch',
        paddingBottom:      'env(safe-area-inset-bottom)',
        backgroundColor:    'rgba(7,7,15,0.97)',
        borderTop:          '1px solid rgba(255,255,255,0.07)',
        backdropFilter:     'blur(24px)',
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
              flex:                    1,
              display:                 'flex',
              flexDirection:           'column',
              alignItems:              'center',
              justifyContent:          'center',
              padding:                 '10px 2px 7px',
              gap:                     '3px',
              border:                  'none',
              background:              'none',
              cursor:                  'pointer',
              WebkitTapHighlightColor: 'transparent',
              transition:              'opacity 0.15s',
            }}
          >
            {tab.icon(isActive)}

            <span
              style={{
                fontSize:      '9.5px',
                fontWeight:    isActive ? 700 : 500,
                color:         isActive ? tab.activeColor : 'rgba(255,255,255,0.32)',
                transition:    'color 0.2s',
                letterSpacing: '0.02em',
                lineHeight:    1.1,
              }}
            >
              {tab.label}
            </span>

            {/* Dot indicatore tab attivo */}
            <span
              style={{
                width:           4,
                height:          4,
                borderRadius:    '50%',
                backgroundColor: isActive ? tab.activeColor : 'transparent',
                transition:      'background-color 0.2s',
                flexShrink:      0,
              }}
            />
          </button>
        )
      })}
    </nav>
  )
}
