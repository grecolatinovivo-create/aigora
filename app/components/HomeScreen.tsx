'use client'
// HomeScreen v2 — Card Stack
// Sprint 3 — 30 apr 2026
// Design: overlapping playing-card stack, swipe to cycle modes

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import UpgradeDrawer, { type UpgradeMode } from '@/app/components/ui/UpgradeDrawer'

// ── Tipi ─────────────────────────────────────────────────────────────────────

export interface HomeScreenProps {
  userPlan:      string
  userName:      string
  userImage:     string | null
  lastChat:      { id: string; title: string } | null
  onStartArena:  (question: string) => void
  onStart2v2:    () => void
  onStartDevil:  () => void
  onOpenHistory: () => void
}

// ── Palette ufficiale ────────────────────────────────────────────────────────

const C = {
  arena:      '#A78BFA',
  twoVsTwo:   '#38BDF8',
  devil:      '#F87171',
  brainstorm: '#FCD34D',
  bg:         '#07070f',
}

// ── Tier check ───────────────────────────────────────────────────────────────

const PAID = ['pro', 'premium', 'admin', 'freemium', 'max']
const isPaid = (plan: string) => PAID.includes(plan)

// ── Argomento del giorno — deterministico per data ───────────────────────────

const DAILY_TOPICS_IT = [
  "L'intelligenza artificiale sostituirà il lavoro creativo?",
  "I social media fanno più danno che bene alla democrazia?",
  "La settimana lavorativa di 4 giorni dovrebbe diventare la norma?",
  "Il vegetarianesimo dovrebbe essere incentivato per legge?",
  "L'esplorazione spaziale è uno spreco di risorse?",
  "Privacy personale o sicurezza collettiva: quale viene prima?",
  "I videogiochi sono la nuova letteratura?",
  "L'istruzione universitaria è ancora necessaria?",
  "Le città dovrebbero vietare le automobili private?",
  "Il capitalismo può essere riformato o va sostituito?",
  "L'immortalità tecnologica sarebbe una benedizione o una maledizione?",
  "Il lavoro da remoto ha ucciso la cultura aziendale?",
  "La carne coltivata in laboratorio salverà il pianeta?",
  "Dovremmo pagare i giovani per partecipare alle elezioni?",
  "L'arte generata da AI merita lo stesso rispetto dell'arte umana?",
  "Esiste ancora il libero arbitrio nell'era degli algoritmi?",
  "Le multinazionali tech sono diventate troppo potenti?",
  "Il turismo di massa è compatibile con la sostenibilità?",
  "Dovremmo limitare la crescita demografica globale?",
  "La scuola tradizionale è obsoleta?",
  "Il metaverso sarà il futuro della socialità?",
  "Dovremmo abolire il denaro contante?",
  "L'immigrazione è una risorsa o una minaccia per l'identità culturale?",
  "Ha senso sperare nell'utopia?",
  "La pena di morte è mai giustificabile?",
  "L'ottimismo è una forma di ignoranza?",
  "Siamo davvero liberi online?",
  "La globalizzazione ha fatto più bene o più male?",
  "Chi controlla i dati controlla il mondo?",
  "Il giornalismo è ancora possibile nell'era delle fake news?",
]

const DAILY_TOPICS_EN = [
  "Will artificial intelligence replace creative work?",
  "Do social media do more harm than good to democracy?",
  "Should the 4-day work week become the norm?",
  "Should vegetarianism be incentivized by law?",
  "Is space exploration a waste of resources?",
  "Personal privacy vs collective security: which comes first?",
  "Are video games the new literature?",
  "Is university education still necessary?",
  "Should cities ban private cars?",
  "Can capitalism be reformed or does it need to be replaced?",
  "Would technological immortality be a blessing or a curse?",
  "Has remote work killed company culture?",
  "Will lab-grown meat save the planet?",
  "Should we pay young people to vote?",
  "Does AI-generated art deserve the same respect as human art?",
  "Does free will still exist in the age of algorithms?",
  "Have big tech companies become too powerful?",
  "Is mass tourism compatible with sustainability?",
  "Should we limit global population growth?",
  "Is traditional schooling obsolete?",
  "Will the metaverse be the future of social interaction?",
  "Should we abolish cash?",
  "Is immigration a resource or a threat to cultural identity?",
  "Does it make sense to hope for utopia?",
  "Is capital punishment ever justifiable?",
  "Is optimism a form of ignorance?",
  "Are we truly free online?",
  "Has globalization done more good than harm?",
  "Whoever controls data controls the world?",
  "Is journalism still possible in the age of fake news?",
]

function getDailyTopic(locale: string): string {
  const topics = locale === 'it' ? DAILY_TOPICS_IT : DAILY_TOPICS_EN
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000)
  return topics[dayOfYear % topics.length]
}

// ── Frasi provocatorie per card ───────────────────────────────────────────────

const PHRASES: Record<string, string[]> = {
  arena: [
    "Hai un'opinione?\nDifendila.",
    "Le tue idee contro\ni migliori AI del mondo.",
    "Qui le parole pesano.",
    "Entra nell'arena.\nNessuno è al sicuro.",
  ],
  twoVsTwo: [
    "Due AI dalla tua parte.\nDue contro.",
    "Non sei solo\nin questa battaglia.",
    "Alleanza temporanea.\nGuerra permanente.",
    "Scegli il tuo schieramento.",
  ],
  devil: [
    "L'AI che ti smonta\nogni argomento.",
    "Nessuna tesi\nsopravvive qui.",
    "Pronto a essere\ncontraddetto?",
    "Il tuo peggior\navversario dialettico.",
  ],
  brainstorm: [
    "Idee che non avresti\nmai da solo.",
    "Cinque menti.\nNessun limite.",
    "La tua prossima\ngrande idea parte da qui.",
    "Dove il pensiero\ndiventa veloce.",
  ],
}

// ── Ordine e tipi card ────────────────────────────────────────────────────────

type CardId = 'arena' | 'twoVsTwo' | 'devil' | 'brainstorm'
const CARD_ORDER: CardId[] = ['arena', 'twoVsTwo', 'devil', 'brainstorm']

// ── Icone SVG ────────────────────────────────────────────────────────────────

const IcoArena = ({ color }: { color: string }) => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)

const Ico2v2 = ({ color }: { color: string }) => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const IcoDevil = ({ color }: { color: string }) => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
)

const IcoBrainstorm = ({ color }: { color: string }) => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="18" x2="15" y2="18"/>
    <line x1="10" y1="22" x2="14" y2="22"/>
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
  </svg>
)

const IcoLock = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
    stroke="rgba(255,255,255,0.5)" strokeWidth={2.2} strokeLinecap="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const IcoSpark = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
    stroke={C.arena} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
)

function CardIcon({ id, color }: { id: CardId; color: string }) {
  if (id === 'arena')      return <IcoArena color={color} />
  if (id === 'twoVsTwo')   return <Ico2v2 color={color} />
  if (id === 'devil')      return <IcoDevil color={color} />
  return <IcoBrainstorm color={color} />
}

// ── Configurazione card ───────────────────────────────────────────────────────

const CARD_COLOR: Record<CardId, string> = {
  arena: C.arena, twoVsTwo: C.twoVsTwo, devil: C.devil, brainstorm: C.brainstorm,
}

// ── Componente principale ─────────────────────────────────────────────────────

export default function HomeScreen({
  userPlan, userName, userImage,
  lastChat, onStartArena, onStart2v2, onStartDevil, onOpenHistory,
}: HomeScreenProps) {
  const locale     = useLocale()
  const router     = useRouter()
  const paid       = isPaid(userPlan)
  const t          = useTranslations('home')
  const dailyTopic = getDailyTopic(locale)

  // ── Card stack state ──────────────────────────────────────────────────────
  const [topIdx,     setTopIdx]     = useState(0)
  const [dragX,      setDragX]      = useState(0)
  const [flyDir,     setFlyDir]     = useState<'left' | 'right' | null>(null)
  const [flyActive,  setFlyActive]  = useState(false)
  const [snapback,   setSnapback]   = useState(false)
  const [phraseIdx,  setPhraseIdx]  = useState(0)
  const [phraseVis,  setPhraseVis]  = useState(true)

  // ── Arena state ───────────────────────────────────────────────────────────
  const [arenaOpen,  setArenaOpen]  = useState(false)
  const [question,   setQuestion]   = useState('')
  const textareaRef  = useRef<HTMLTextAreaElement>(null)

  // ── Touch tracking ────────────────────────────────────────────────────────
  const touchStartX  = useRef(0)
  const touchStartY  = useRef(0)
  const isDragging   = useRef(false)
  const isHoriz      = useRef(false)

  // ── UpgradeDrawer ─────────────────────────────────────────────────────────
  const [upgradeDrawer, setUpgradeDrawer] = useState<UpgradeMode | null>(null)

  // ── Free session counter ──────────────────────────────────────────────────
  const [weeklyUsed,  setWeeklyUsed]  = useState<number | null>(null)
  const [weeklyLimit, setWeeklyLimit] = useState<number | null>(null)

  useEffect(() => {
    if (paid) return
    const CACHE_KEY = 'aigora_limits_cache'
    const TTL_MS    = 60 * 60 * 1000
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const { ts, used, limit } = JSON.parse(raw)
        if (Date.now() - ts < TTL_MS) { setWeeklyUsed(used); setWeeklyLimit(limit); return }
      }
    } catch { /* */ }
    fetch('/api/limits').then(r => r.json()).then(data => {
      if (data.weeklyDebates) {
        const { used, limit } = data.weeklyDebates
        setWeeklyUsed(used); setWeeklyLimit(limit)
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), used, limit })) } catch { /* */ }
      }
    }).catch(() => {})
  }, [paid])

  // ── Auto-cycle phrase ogni 4s ─────────────────────────────────────────────
  useEffect(() => {
    if (arenaOpen) return
    const iv = setInterval(() => {
      setPhraseVis(false)
      setTimeout(() => {
        setPhraseIdx(i => (i + 1) % PHRASES[CARD_ORDER[topIdx]].length)
        setPhraseVis(true)
      }, 250)
    }, 4000)
    return () => clearInterval(iv)
  }, [topIdx, arenaOpen])

  // Reset phrase on card change
  useEffect(() => {
    setPhraseIdx(0)
    setPhraseVis(true)
    setArenaOpen(false)
    setQuestion('')
  }, [topIdx])

  // Focus textarea when arena opens
  useEffect(() => {
    if (arenaOpen) setTimeout(() => textareaRef.current?.focus(), 120)
  }, [arenaOpen])

  // ── Swipe logic ───────────────────────────────────────────────────────────
  const advance = useCallback((dir: 'left' | 'right') => {
    setFlyDir(dir)
    setFlyActive(true)
    setTimeout(() => {
      setTopIdx(i => dir === 'left'
        ? (i + 1) % CARD_ORDER.length
        : (i - 1 + CARD_ORDER.length) % CARD_ORDER.length
      )
      setDragX(0)
      setFlyDir(null)
      setFlyActive(false)
      setSnapback(false)
    }, 320)
  }, [])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (flyActive) return
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isDragging.current  = false
    isHoriz.current     = false
  }, [flyActive])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (flyActive) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current

    if (!isDragging.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      isHoriz.current = Math.abs(dx) > Math.abs(dy) * 0.8
      isDragging.current = true
    }

    if (!isHoriz.current) return
    if (arenaOpen && Math.abs(dx) < 20) return // don't swipe when arena input is open & minimal drag
    e.preventDefault()
    setSnapback(false)
    setDragX(dx)
  }, [flyActive, arenaOpen])

  const onTouchEnd = useCallback(() => {
    if (!isDragging.current || !isHoriz.current) return
    if (Math.abs(dragX) > 80) {
      advance(dragX < 0 ? 'left' : 'right')
    } else {
      setSnapback(true)
      setDragX(0)
      setTimeout(() => setSnapback(false), 280)
    }
    isDragging.current = false
  }, [dragX, advance])

  // Desktop mouse swipe
  const mouseStartX = useRef<number | null>(null)
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    mouseStartX.current = e.clientX
  }, [])
  const onMouseUp = useCallback((e: React.MouseEvent) => {
    if (mouseStartX.current === null) return
    const dx = e.clientX - mouseStartX.current
    mouseStartX.current = null
    if (Math.abs(dx) > 80) advance(dx < 0 ? 'left' : 'right')
  }, [advance])

  // ── Card action ───────────────────────────────────────────────────────────
  const handleCardAction = useCallback((id: CardId) => {
    if (id === 'arena') {
      setArenaOpen(o => !o)
      return
    }
    if (id === 'twoVsTwo') { onStart2v2(); return }
    if (id === 'devil') {
      if (paid) onStartDevil()
      else setUpgradeDrawer('devil')
      return
    }
    if (id === 'brainstorm') {
      if (paid) router.push(`/${locale}/brainstorm`)
      else setUpgradeDrawer('brainstorm')
    }
  }, [paid, onStart2v2, onStartDevil, router, locale])

  // ── Avatar / greeting ─────────────────────────────────────────────────────
  const planColor: Record<string, string> = {
    admin: '#F59E0B', premium: '#FF6B2B', max: '#FF6B2B',
    pro: '#A78BFA', free: '#10A37F', starter: '#10A37F',
  }
  const avatarColor = planColor[userPlan] ?? '#10A37F'
  const initial     = (userName || 'U')[0].toUpperCase()
  const h = new Date().getHours()
  const greetKey = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
  const firstName  = userName?.split(' ')[0] || ''
  const greetText  = firstName ? `${t(`greet.${greetKey}`)}, ${firstName}.` : `${t(`greet.${greetKey}`)}!`

  // ── Stack transform per posizione ─────────────────────────────────────────
  const stackTransform = (pos: number, isDraggingTop: boolean): React.CSSProperties => {
    if (pos === 0) {
      // Top card
      if (flyActive && flyDir) {
        const tx = flyDir === 'left' ? -600 : 600
        const rot = flyDir === 'left' ? -20 : 20
        return {
          transform: `translateX(${tx}px) rotate(${rot}deg)`,
          transition: 'transform 0.32s ease-in',
          zIndex: 10,
        }
      }
      return {
        transform: `translateX(${dragX}px) rotate(${dragX / 28}deg)`,
        transition: snapback ? 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
        zIndex: 10,
      }
    }
    const ROTATIONS = [2.2, -1.8, 1.2]
    const OFFSETS   = [12, 22, 30]
    const SCALES    = [0.965, 0.93, 0.895]
    const OPACITIES = [0.85, 0.65, 0.45]
    const p = pos - 1
    return {
      transform: `translateY(${OFFSETS[p]}px) rotate(${ROTATIONS[p]}deg) scale(${SCALES[p]})`,
      opacity: OPACITIES[p],
      transition: flyActive ? 'transform 0.32s ease, opacity 0.32s ease' : 'none',
      zIndex: 10 - pos,
      pointerEvents: 'none',
    }
  }

  // ── Card content (top card only) ─────────────────────────────────────────
  const topCardId   = CARD_ORDER[topIdx]
  const topColor    = CARD_COLOR[topCardId]
  const topPhrase   = PHRASES[topCardId][phraseIdx]
  const topRequires = ['devil', 'brainstorm'].includes(topCardId)
  const isLocked    = topRequires && !paid

  const cardLabel: Record<CardId, string> = {
    arena: t('arena.title'), twoVsTwo: t('twoVsTwo.title'),
    devil: t('devil.title'), brainstorm: t('brainstorm.title'),
  }
  const cardTag: Record<CardId, string> = {
    arena: t('arena.tag'), twoVsTwo: '2v2', devil: "Devil's", brainstorm: 'Brainstormer',
  }
  const cardCta: Record<CardId, string> = {
    arena: t('arena.cta'), twoVsTwo: 'Entra nella stanza →', devil: 'Inizia il duello →', brainstorm: 'Avvia sessione →',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      backgroundColor: C.bg,
      paddingTop:    'env(safe-area-inset-top, 0px)',
      paddingBottom: 'calc(var(--bottom-nav-height, 0px) + env(safe-area-inset-bottom, 0px))',
    }}>

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        padding: '14px 20px 8px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em', lineHeight: 1 }}>
          <span style={{ color: '#fff' }}>Ai</span>
          <span style={{ color: C.arena }}>GORÀ</span>
        </span>

        {/* Greeting + avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
            {greetText}
          </span>
          <button onClick={() => router.push(`/${locale}/dashboard`)} style={{
            width: 36, height: 36, borderRadius: '50%',
            background: userImage ? 'transparent' : avatarColor,
            boxShadow: `0 2px 10px ${avatarColor}44`,
            border: 'none', cursor: 'pointer', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, color: '#fff', fontSize: 14, flexShrink: 0,
          }}>
            {userImage
              ? <img src={userImage} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initial}
          </button>
        </div>
      </div>

      {/* ─── Scroll area ────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: '8px 18px 28px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>

        {/* Free session counter */}
        {!paid && weeklyLimit !== null && weeklyUsed !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: `${Math.min(1, weeklyUsed / weeklyLimit) * 100}%`,
                background: weeklyUsed >= weeklyLimit ? '#F87171' : '#A78BFA',
                transition: 'width 0.6s ease',
              }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: weeklyUsed >= weeklyLimit ? '#F87171' : 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
              {weeklyUsed}/{weeklyLimit} {t('weeklyDebates')}
            </span>
          </div>
        )}

        {/* ─── Card Stack ─────────────────────────────────────────────── */}
        <div
          style={{ position: 'relative', paddingBottom: 44, userSelect: 'none', cursor: flyActive ? 'grabbing' : 'grab' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
        >
          {/* ── Ghost cards (positions 3→1, rendered back-to-front) ── */}
          {[3, 2, 1].map(pos => {
            const cardId = CARD_ORDER[(topIdx + pos) % CARD_ORDER.length]
            const color  = CARD_COLOR[cardId]
            const style  = stackTransform(pos, false)
            return (
              <div key={pos} style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                borderRadius: 24,
                background: `linear-gradient(145deg, ${color}28, ${color}14)`,
                border: `1px solid ${color}30`,
                ...style,
              }}>
                {/* Ghost card body — minimal, just icon + label */}
                <div style={{
                  padding: '18px 20px 20px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  // Minimum height to show something of the ghost
                  minHeight: 90,
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 11,
                    background: `${color}20`, border: `1px solid ${color}25`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <CardIcon id={cardId} color={color} />
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.55)' }}>
                    {cardLabel[cardId]}
                  </span>
                </div>
              </div>
            )
          })}

          {/* ── Top card ─────────────────────────────────────────────── */}
          <div
            style={{
              position: 'relative',
              borderRadius: 24,
              background: `linear-gradient(145deg, ${topColor}22, ${topColor}0d)`,
              border: `1.5px solid ${topColor}50`,
              boxShadow: `0 8px 40px ${topColor}28, 0 0 0 1px ${topColor}20`,
              overflow: 'hidden',
              ...stackTransform(0, isDragging.current),
            }}
            onClick={() => {
              if (Math.abs(dragX) < 8 && !flyActive) handleCardAction(topCardId)
            }}
          >
            {/* Glow background */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(circle at 30% 20%, ${topColor}15 0%, transparent 65%)`,
              pointerEvents: 'none',
            }} />

            {/* Pro lock badge */}
            {isLocked && (
              <div style={{
                position: 'absolute', top: 14, right: 14,
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'rgba(7,7,15,0.75)',
                border: `1px solid ${topColor}35`,
                borderRadius: 999, padding: '4px 9px 4px 6px', zIndex: 2,
              }}>
                <IcoLock />
                <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: topColor }}>Pro</span>
              </div>
            )}

            <div style={{ padding: '20px 20px 22px' }}>
              {/* Header: icon + label + tag */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: `${topColor}1e`, border: `1px solid ${topColor}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <CardIcon id={topCardId} color={topColor} />
                  </div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1.15 }}>
                      {cardLabel[topCardId]}
                    </div>
                    <div style={{ fontSize: 11, color: `${topColor}99`, marginTop: 2, fontWeight: 600 }}>
                      {topCardId === 'arena' ? t('arena.desc') :
                       topCardId === 'twoVsTwo' ? t('twoVsTwo.desc') :
                       topCardId === 'devil' ? t('devil.desc') : t('brainstorm.desc')}
                    </div>
                  </div>
                </div>
                {!isLocked && (
                  <div style={{
                    fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: topColor, background: `${topColor}18`, border: `1px solid ${topColor}28`,
                    padding: '4px 9px', borderRadius: 999,
                  }}>
                    {cardTag[topCardId]}
                  </div>
                )}
              </div>

              {/* ── Arena: input espandibile ── */}
              {topCardId === 'arena' && arenaOpen ? (
                <div onClick={e => e.stopPropagation()}>
                  <textarea
                    ref={textareaRef}
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (question.trim()) onStartArena(question.trim())
                      }
                    }}
                    placeholder={t('arena.placeholder')}
                    rows={3}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${topColor}28`,
                      borderRadius: 14, padding: '12px 14px',
                      fontSize: 14, color: '#fff',
                      resize: 'none', outline: 'none', lineHeight: 1.6,
                      marginBottom: 12,
                    }}
                  />
                  <button
                    onClick={() => { if (question.trim()) onStartArena(question.trim()) }}
                    disabled={!question.trim()}
                    style={{
                      width: '100%', padding: '13px', borderRadius: 14, border: 'none',
                      fontSize: 14, fontWeight: 700, color: '#fff',
                      cursor: question.trim() ? 'pointer' : 'not-allowed',
                      background: question.trim() ? `linear-gradient(135deg, #7C3AED, #5B21B6)` : 'rgba(255,255,255,0.07)',
                      opacity: question.trim() ? 1 : 0.5,
                      boxShadow: question.trim() ? '0 4px 18px rgba(124,58,237,0.38)' : 'none',
                      transition: 'all 0.2s',
                    }}>
                    {t('arena.cta')}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setArenaOpen(false); setQuestion('') }}
                    style={{
                      display: 'block', width: '100%', marginTop: 10, background: 'none', border: 'none',
                      padding: 6, fontSize: 11, color: 'rgba(255,255,255,0.25)',
                      cursor: 'pointer', textAlign: 'center', letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                    Annulla
                  </button>
                </div>
              ) : (
                <>
                  {/* Provocative phrase */}
                  <div style={{
                    minHeight: 80,
                    opacity: phraseVis ? 1 : 0,
                    transform: phraseVis ? 'translateY(0)' : 'translateY(6px)',
                    transition: 'opacity 0.25s ease, transform 0.25s ease',
                    marginBottom: 22,
                  }}>
                    <p style={{
                      fontSize: 'clamp(20px, 6vw, 26px)',
                      fontWeight: 900,
                      color: '#fff',
                      lineHeight: 1.3,
                      letterSpacing: '-0.02em',
                      margin: 0,
                      whiteSpace: 'pre-line',
                    }}>
                      {topPhrase}
                    </p>
                  </div>

                  {/* CTA */}
                  <div style={{
                    width: '100%', padding: '13px 16px',
                    borderRadius: 14,
                    background: isLocked
                      ? 'rgba(255,255,255,0.05)'
                      : `linear-gradient(135deg, ${topColor}cc, ${topColor}88)`,
                    border: isLocked ? `1px solid ${topColor}20` : 'none',
                    boxShadow: isLocked ? 'none' : `0 4px 22px ${topColor}38`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    cursor: 'pointer',
                  }}>
                    {isLocked && <IcoLock />}
                    <span style={{
                      fontSize: 14, fontWeight: 800, color: isLocked ? `${topColor}88` : '#fff',
                      letterSpacing: isLocked ? '0.05em' : '0.01em',
                    }}>
                      {isLocked ? 'Sblocca con Pro' : cardCta[topCardId]}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ─── Dot indicators ────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          {CARD_ORDER.map((id, i) => (
            <button
              key={id}
              onClick={() => {
                if (i === topIdx || flyActive) return
                advance(i > topIdx ? 'left' : 'right')
              }}
              style={{
                width:  i === topIdx ? 22 : 7,
                height: 7,
                borderRadius: 99,
                background: i === topIdx ? CARD_COLOR[id] : 'rgba(255,255,255,0.15)',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'width 0.25s cubic-bezier(0.34,1.56,0.64,1), background 0.2s',
              }}
            />
          ))}
        </div>

        {/* ─── Argomento del giorno ────────────────────────────────────── */}
        <button
          onClick={() => {
            setTopIdx(0) // porta Arena in cima
            setQuestion(dailyTopic)
            setArenaOpen(true)
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 14px', borderRadius: 15,
            background: 'rgba(167,139,250,0.07)',
            border: '1px solid rgba(167,139,250,0.16)',
            cursor: 'pointer', textAlign: 'left',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IcoSpark />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.arena, marginBottom: 2 }}>
              {t('dailyTopicLabel')}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {dailyTopic}
            </div>
          </div>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
            stroke="rgba(167,139,250,0.45)" strokeWidth={2.5} strokeLinecap="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>

        {/* ─── Ultima sessione ─────────────────────────────────────────── */}
        {lastChat && (
          <button onClick={onOpenHistory} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 14px', borderRadius: 15,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            cursor: 'pointer', textAlign: 'left',
            WebkitTapHighlightColor: 'transparent',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9, flexShrink: 0,
              background: 'rgba(167,139,250,0.09)', border: '1px solid rgba(167,139,250,0.16)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
                stroke="rgba(167,139,250,0.65)" strokeWidth={2.2} strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.arena, letterSpacing: '0.05em', marginBottom: 1 }}>
                {t('lastSession')}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {lastChat.title}
              </div>
            </div>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.2)" strokeWidth={2.5} strokeLinecap="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        )}

        {/* ─── Upgrade hint per Free ───────────────────────────────────── */}
        {!paid && (
          <button onClick={() => router.push(`/${locale}/pricing`)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '10px', borderRadius: 13,
            background: 'rgba(167,139,250,0.06)',
            border: '1px solid rgba(167,139,250,0.14)',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none"
              stroke={C.arena} strokeWidth={2.5} strokeLinecap="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.arena }}>
              {t('upgradeHint')}
            </span>
          </button>
        )}

      </div>

      {/* UpgradeDrawer */}
      {upgradeDrawer && (
        <UpgradeDrawer
          mode={upgradeDrawer}
          onClose={() => setUpgradeDrawer(null)}
        />
      )}
    </div>
  )
}
