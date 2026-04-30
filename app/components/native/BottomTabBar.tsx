'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useIsNative } from './CapacitorProvider'

// Icona Devil
function IconDevil({ active }: { active: boolean }) {
  const c = active ? '#F87171' : 'rgba(255,255,255,0.32)'
  const w = active ? 2.2 : 1.8
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
    </svg>
  )
}

// ─── Icone SVG inline ─────────────────────────────────────────────────────────
// Naming ufficiale: Arena (#A78BFA) | 2v2 (#38BDF8) | Brainstorm (#FCD34D) | Profilo (#A78BFA→sky)

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

function Icon2v2({ active }: { active: boolean }) {
  // Colore ufficiale 2v2: #38BDF8 (sky blue) — coerente con landing e arena
  const c = active ? '#38BDF8' : 'rgba(255,255,255,0.32)'
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

function IconProfile({ active }: { active: boolean }) {
  const c = active ? '#A78BFA' : 'rgba(255,255,255,0.32)'
  const w = active ? 2.2 : 1.8
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

// ─── Tab definition ───────────────────────────────────────────────────────────
interface Tab {
  key:         string
  label:       string
  path:        (base: string) => string
  icon:        (active: boolean) => React.ReactNode
  activeColor: string
  // Pathname match: se il pathname corrente contiene uno di questi, questo tab è attivo
  match:       (pathname: string, base: string) => boolean
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function BottomTabBar() {
  const isNative = useIsNative()
  const pathname = usePathname()
  const router   = useRouter()
  const locale   = useLocale()
  const t        = useTranslations('nav')

  if (!isNative) return null

  const base = `/${locale}`

  const tabs: Tab[] = [
    {
      key:         'arena',
      label:       t('tabArena'),
      // ⚠️ IMPORTANTE: la home loggati è /[locale] (AigoraChat), NON /arena (pagina pubblica)
      path:        (b) => b,
      icon:        (a) => <IconArena active={a} />,
      activeColor: '#A78BFA',
      match:       (p, b) =>
        // Attivo se siamo sulla home base o su /arena o su /room
        p === b || p === b + '/' || p.startsWith(b + '/arena') || p.startsWith(b + '/room'),
    },
    {
      key:         '2v2',
      label:       t('tab2v2'),
      path:        (b) => `${b}/2v2`,
      icon:        (a) => <Icon2v2 active={a} />,
      activeColor: '#38BDF8',
      match:       (p, b) => p.startsWith(`${b}/2v2`),
    },
    {
      key:         'devil',
      label:       'Devil',
      // Avvia il flow Devil via ?start=devil (gestito da AigoraChat)
      path:        (b) => `${b}?start=devil`,
      icon:        (a) => <IconDevil active={a} />,
      activeColor: '#F87171',
      match:       () => false, // mai "attivo" come tab — è un flow, non una pagina
    },
    {
      key:         'brainstorm',
      label:       t('tabBrainstorm'),
      path:        (b) => `${b}/brainstorm`,
      icon:        (a) => <IconBrainstorm active={a} />,
      activeColor: '#FCD34D',
      match:       (p, b) => p.startsWith(`${b}/brainstorm`),
    },
  ]

  const activeKey = tabs.find(t => t.match(pathname, base))?.key ?? 'arena'

  return (
    <nav
      style={{
        position:              'fixed',
        bottom:                0,
        left:                  0,
        right:                 0,
        zIndex:                900,
        display:               'flex',
        alignItems:            'stretch',
        paddingBottom:         'env(safe-area-inset-bottom, 0px)',
        backgroundColor:       'rgba(7,7,15,0.72)',
        borderTop:             '1px solid rgba(255,255,255,0.05)',
        backdropFilter:        'blur(24px)',
        WebkitBackdropFilter:  'blur(24px)',
      }}
    >
      {tabs.map(tab => {
        const isActive = activeKey === tab.key
        return (
          <button
            key={tab.key}
            onClick={() => router.push(tab.path(base))}
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
                fontSize:      '10px',
                fontWeight:    isActive ? 700 : 500,
                color:         isActive ? tab.activeColor : 'rgba(255,255,255,0.32)',
                transition:    'color 0.2s',
                letterSpacing: '0.02em',
                lineHeight:    1.1,
              }}
            >
              {tab.label}
            </span>

            {/* Dot indicatore */}
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
