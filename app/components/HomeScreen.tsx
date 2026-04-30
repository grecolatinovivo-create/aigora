'use client'
// HomeScreen v3 — Card Stack (playing card layout)
// Sprint 3 — 30 apr 2026
// Tall cards, content anchored bottom, ghost stack, prev/next nav

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

// ── Palette ───────────────────────────────────────────────────────────────────

const C = {
  arena:      '#A78BFA',
  twoVsTwo:   '#38BDF8',
  devil:      '#F87171',
  brainstorm: '#FCD34D',
  bg:         '#07070f',
}

const PAID = ['pro', 'premium', 'admin', 'freemium', 'max']
const isPaid = (plan: string) => PAID.includes(plan)

// ── Daily topics ──────────────────────────────────────────────────────────────

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
  const now    = new Date()
  const start  = new Date(now.getFullYear(), 0, 0)
  const day    = Math.floor((now.getTime() - start.getTime()) / 86400000)
  return topics[day % topics.length]
}

// ── Frasi provocatorie ────────────────────────────────────────────────────────

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

// ── Card types ────────────────────────────────────────────────────────────────

type CardId = 'arena' | 'twoVsTwo' | 'devil' | 'brainstorm'
const CARD_ORDER: CardId[] = ['arena', 'twoVsTwo', 'devil', 'brainstorm']

const CARD_COLOR: Record<CardId, string> = {
  arena: C.arena, twoVsTwo: C.twoVsTwo, devil: C.devil, brainstorm: C.brainstorm,
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const IcoArena = ({ color, size = 20 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)

const Ico2v2 = ({ color, size = 20 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const IcoDevil = ({ color, size = 20 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
)

const IcoBrainstorm = ({ color, size = 20 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="18" x2="15" y2="18"/>
    <line x1="10" y1="22" x2="14" y2="22"/>
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
  </svg>
)

const IcoLock = ({ color = 'rgba(255,255,255,0.4)' }: { color?: string }) => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2.2} strokeLinecap="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

function CardIcon({ id, color, size }: { id: CardId; color: string; size?: number }) {
  if (id === 'arena')      return <IcoArena color={color} size={size} />
  if (id === 'twoVsTwo')   return <Ico2v2 color={color} size={size} />
  if (id === 'devil')      return <IcoDevil color={color} size={size} />
  return <IcoBrainstorm color={color} size={size} />
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

  // ── Stack state ───────────────────────────────────────────────────────────
  const [topIdx,    setTopIdx]    = useState(0)
  const [dragX,     setDragX]     = useState(0)
  const [flyDir,    setFlyDir]    = useState<'left' | 'right' | null>(null)
  const [flyActive, setFlyActive] = useState(false)
  const [snapback,  setSnapback]  = useState(false)
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [phraseVis, setPhraseVis] = useState(true)

  // ── Arena state ───────────────────────────────────────────────────────────
  const [arenaOpen, setArenaOpen] = useState(false)
  const [question,  setQuestion]  = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Touch / mouse ─────────────────────────────────────────────────────────
  const touchStartX  = useRef(0)
  const touchStartY  = useRef(0)
  const isDragging   = useRef(false)
  const isHoriz      = useRef(false)
  const mouseStartX  = useRef<number | null>(null)

  // ── UpgradeDrawer ─────────────────────────────────────────────────────────
  const [upgradeDrawer, setUpgradeDrawer] = useState<UpgradeMode | null>(null)

  // ── Phrase cycling ────────────────────────────────────────────────────────
  useEffect(() => {
    if (arenaOpen) return
    const iv = setInterval(() => {
      setPhraseVis(false)
      setTimeout(() => { setPhraseIdx(i => (i + 1) % PHRASES[CARD_ORDER[topIdx]].length); setPhraseVis(true) }, 250)
    }, 4000)
    return () => clearInterval(iv)
  }, [topIdx, arenaOpen])

  useEffect(() => { setPhraseIdx(0); setPhraseVis(true); setArenaOpen(false); setQuestion('') }, [topIdx])
  useEffect(() => { if (arenaOpen) setTimeout(() => textareaRef.current?.focus(), 120) }, [arenaOpen])

  // Keyboard arrows (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (flyActive) return
      if (e.key === 'ArrowLeft')  advance('right')
      if (e.key === 'ArrowRight') advance('left')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flyActive]) // eslint-disable-line

  // ── Advance ───────────────────────────────────────────────────────────────
  const advance = useCallback((dir: 'left' | 'right') => {
    if (flyActive) return
    setFlyDir(dir)
    setFlyActive(true)
    setTimeout(() => {
      setTopIdx(i => dir === 'left'
        ? (i + 1) % CARD_ORDER.length
        : (i - 1 + CARD_ORDER.length) % CARD_ORDER.length
      )
      setDragX(0); setFlyDir(null); setFlyActive(false); setSnapback(false)
    }, 320)
  }, [flyActive])

  // ── Touch handlers ────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (flyActive) return
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isDragging.current = false; isHoriz.current = false
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
    e.preventDefault()
    setSnapback(false); setDragX(dx)
  }, [flyActive])

  const onTouchEnd = useCallback(() => {
    if (!isDragging.current || !isHoriz.current) return
    if (Math.abs(dragX) > 70) { advance(dragX < 0 ? 'left' : 'right') }
    else { setSnapback(true); setDragX(0); setTimeout(() => setSnapback(false), 280) }
    isDragging.current = false
  }, [dragX, advance])

  const onMouseDown = useCallback((e: React.MouseEvent) => { mouseStartX.current = e.clientX }, [])
  const onMouseUp   = useCallback((e: React.MouseEvent) => {
    if (mouseStartX.current === null) return
    const dx = e.clientX - mouseStartX.current; mouseStartX.current = null
    if (Math.abs(dx) > 70) advance(dx < 0 ? 'left' : 'right')
  }, [advance])

  // ── Card action ───────────────────────────────────────────────────────────
  const handleCardTap = useCallback(() => {
    if (Math.abs(dragX) > 8 || flyActive) return
    const id = CARD_ORDER[topIdx]
    if (id === 'arena')      { setArenaOpen(o => !o); return }
    if (id === 'twoVsTwo')   { onStart2v2(); return }
    if (id === 'devil')      { paid ? onStartDevil() : setUpgradeDrawer('devil'); return }
    if (id === 'brainstorm') { paid ? router.push(`/${locale}/brainstorm`) : setUpgradeDrawer('brainstorm') }
  }, [dragX, flyActive, topIdx, paid, onStart2v2, onStartDevil, router, locale])

  // ── Computed ──────────────────────────────────────────────────────────────
  const planColor: Record<string, string> = {
    admin: '#F59E0B', premium: '#FF6B2B', max: '#FF6B2B', pro: '#A78BFA', free: '#10A37F', starter: '#10A37F',
  }
  const avatarColor = planColor[userPlan] ?? '#10A37F'
  const initial     = (userName || 'U')[0].toUpperCase()
  const h = new Date().getHours()
  const greetKey    = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
  const firstName   = userName?.split(' ')[0] || ''
  const greetText   = firstName ? `${t(`greet.${greetKey}`)}, ${firstName}.` : `${t(`greet.${greetKey}`)}!`

  const topCardId  = CARD_ORDER[topIdx]
  const topColor   = CARD_COLOR[topCardId]
  const topPhrase  = PHRASES[topCardId][phraseIdx]
  const isLocked   = ['devil', 'brainstorm'].includes(topCardId) && !paid

  const cardLabel: Record<CardId, string> = {
    arena: t('arena.title'), twoVsTwo: t('twoVsTwo.title'),
    devil: t('devil.title'), brainstorm: t('brainstorm.title'),
  }
  const cardDesc: Record<CardId, string> = {
    arena: t('arena.desc'), twoVsTwo: t('twoVsTwo.desc'),
    devil: t('devil.desc'), brainstorm: t('brainstorm.desc'),
  }
  const cardCta: Record<CardId, string> = {
    arena: t('arena.cta'), twoVsTwo: 'Entra nella stanza →',
    devil: 'Inizia il duello →', brainstorm: 'Avvia sessione →',
  }

  // ── Top card transform ────────────────────────────────────────────────────
  const topTransform = (): React.CSSProperties => {
    if (flyActive && flyDir) {
      return {
        transform: `translateX(${flyDir === 'left' ? -640 : 640}px) rotate(${flyDir === 'left' ? -18 : 18}deg)`,
        transition: 'transform 0.32s ease-in',
      }
    }
    return {
      transform: `translateX(${dragX}px) rotate(${dragX / 30}deg)`,
      transition: snapback ? 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
    }
  }

  // Ghost card offsets (pos 1,2,3)
  const ghostStyle = (pos: number): React.CSSProperties => {
    const ROTS    = [2.5, -2, 1.2]
    const OFFS    = [14, 26, 36]
    const SCALES  = [0.96, 0.92, 0.88]
    const OPACITY = [0.8, 0.6, 0.42]
    const p = pos - 1
    return {
      transform: `translateY(${OFFS[p]}px) rotate(${ROTS[p]}deg) scale(${SCALES[p]})`,
      opacity: OPACITY[p],
      zIndex: 10 - pos,
      pointerEvents: 'none',
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      backgroundColor: C.bg,
      paddingTop:    'env(safe-area-inset-top, 0px)',
      paddingBottom: 'calc(var(--bottom-nav-height, 0px) + env(safe-area-inset-bottom, 0px))',
    }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        width: '100%', maxWidth: 480, flexShrink: 0,
        padding: '14px 20px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em' }}>
          <span style={{ color: '#fff' }}>Ai</span>
          <span style={{ color: C.arena }}>GORÀ</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
            {greetText}
          </span>
          <button onClick={() => router.push(`/${locale}/dashboard`)} style={{
            width: 36, height: 36, borderRadius: '50%',
            background: userImage ? 'transparent' : avatarColor,
            boxShadow: `0 2px 10px ${avatarColor}44`,
            border: 'none', cursor: 'pointer', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, color: '#fff', fontSize: 14,
          }}>
            {userImage
              ? <img src={userImage} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initial}
          </button>
        </div>
      </div>

      {/* ── Hint text ──────────────────────────────────────────────────── */}
      <div style={{
        width: '100%', maxWidth: 480,
        padding: '12px 20px 10px',
        fontSize: 11, color: 'rgba(255,255,255,0.22)',
        letterSpacing: '0.04em', textAlign: 'center',
        flexShrink: 0,
      }}>
        trascina la carta in cima &nbsp;·&nbsp; oppure usa le frecce
      </div>

      {/* ── Card stack ─────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, width: '100%', maxWidth: 480,
        padding: '0 20px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        minHeight: 0,
      }}>
        <div
          style={{ position: 'relative', paddingBottom: 44, cursor: flyActive ? 'grabbing' : 'grab', userSelect: 'none' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
        >
          {/* Ghost cards — back to front */}
          {[3, 2, 1].map(pos => {
            const id    = CARD_ORDER[(topIdx + pos) % CARD_ORDER.length]
            const color = CARD_COLOR[id]
            return (
              <div key={pos} style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                borderRadius: 24,
                background: `linear-gradient(160deg, ${color}20 0%, ${color}0c 100%)`,
                border: `1px solid ${color}30`,
                height: '100%',
                ...ghostStyle(pos),
              }} />
            )
          })}

          {/* Top card */}
          <div
            onClick={handleCardTap}
            style={{
              position: 'relative', zIndex: 10,
              borderRadius: 24,
              background: `linear-gradient(160deg, ${topColor}1e 0%, ${topColor}0a 100%)`,
              border: `1.5px solid ${topColor}48`,
              boxShadow: `0 12px 50px ${topColor}25, 0 0 0 1px ${topColor}18`,
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              cursor: 'pointer',
              ...topTransform(),
            }}
          >
            {/* Radial glow */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(ellipse at 40% 25%, ${topColor}18 0%, transparent 65%)`,
              pointerEvents: 'none',
            }} />

            {/* Pro badge */}
            {isLocked && (
              <div style={{
                position: 'absolute', top: 16, right: 16, zIndex: 2,
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'rgba(7,7,15,0.8)',
                border: `1px solid ${topColor}30`,
                borderRadius: 999, padding: '4px 10px 4px 7px',
              }}>
                <IcoLock color={topColor} />
                <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: topColor }}>Pro</span>
              </div>
            )}

            <div style={{ padding: '28px 24px 24px', display: 'flex', flexDirection: 'column', minHeight: '52vh' }}>

              {/* ── Arena input (when open) ── */}
              {topCardId === 'arena' && arenaOpen ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }} onClick={e => e.stopPropagation()}>
                  <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: `${topColor}99`, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Di cosa vuoi dibattere?
                  </p>
                  <textarea
                    ref={textareaRef}
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (question.trim()) onStartArena(question.trim()) } }}
                    placeholder={t('arena.placeholder')}
                    rows={4}
                    style={{
                      flex: 1, width: '100%', boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${topColor}28`,
                      borderRadius: 14, padding: '12px 14px',
                      fontSize: 15, color: '#fff',
                      resize: 'none', outline: 'none', lineHeight: 1.6,
                    }}
                  />
                  {/* Argomento del giorno */}
                  <button
                    onClick={e => { e.stopPropagation(); setQuestion(dailyTopic) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: `${topColor}12`, border: `1px solid ${topColor}25`,
                      borderRadius: 10, padding: '8px 12px',
                      cursor: 'pointer', textAlign: 'left',
                    }}>
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={topColor} strokeWidth={2.5} strokeLinecap="round">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                    <span style={{ fontSize: 11, fontWeight: 700, color: topColor, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {t('dailyTopicLabel')}
                    </span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dailyTopic}
                    </span>
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); if (question.trim()) onStartArena(question.trim()) }}
                    disabled={!question.trim()}
                    style={{
                      width: '100%', padding: '14px',
                      borderRadius: 14, border: 'none',
                      fontSize: 15, fontWeight: 800, color: '#fff',
                      background: question.trim() ? `linear-gradient(135deg, #7C3AED, #5B21B6)` : 'rgba(255,255,255,0.07)',
                      opacity: question.trim() ? 1 : 0.45,
                      boxShadow: question.trim() ? '0 4px 20px rgba(124,58,237,0.4)' : 'none',
                      cursor: question.trim() ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                    }}>
                    {t('arena.cta')}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setArenaOpen(false); setQuestion('') }}
                    style={{
                      background: 'none', border: 'none', padding: '6px',
                      fontSize: 11, color: 'rgba(255,255,255,0.2)',
                      cursor: 'pointer', textAlign: 'center', width: '100%',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                    Annulla
                  </button>
                </div>
              ) : (
                <>
                  {/* ── Phrase area (grows) ── */}
                  <div style={{
                    flex: 1,
                    display: 'flex', alignItems: 'center',
                    opacity: phraseVis ? 1 : 0,
                    transform: phraseVis ? 'translateY(0)' : 'translateY(8px)',
                    transition: 'opacity 0.25s ease, transform 0.25s ease',
                  }}>
                    <p style={{
                      margin: 0,
                      fontSize: 'clamp(26px, 7vw, 34px)',
                      fontWeight: 900,
                      color: '#fff',
                      lineHeight: 1.22,
                      letterSpacing: '-0.025em',
                      whiteSpace: 'pre-line',
                    }}>
                      {topPhrase}
                    </p>
                  </div>

                  {/* ── CTA ── */}
                  <div style={{ marginBottom: 18, marginTop: 16 }}>
                    <div style={{
                      width: '100%', padding: '13px 18px',
                      borderRadius: 14,
                      background: isLocked
                        ? 'rgba(255,255,255,0.05)'
                        : `linear-gradient(135deg, ${topColor}cc, ${topColor}88)`,
                      border: isLocked ? `1px solid ${topColor}20` : 'none',
                      boxShadow: isLocked ? 'none' : `0 4px 24px ${topColor}35`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    }}>
                      {isLocked && <IcoLock color={`${topColor}80`} />}
                      <span style={{ fontSize: 14, fontWeight: 800, color: isLocked ? `${topColor}70` : '#fff' }}>
                        {isLocked ? 'Sblocca con Pro' : cardCta[topCardId]}
                      </span>
                    </div>
                  </div>

                  {/* ── Bottom identity row ── */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    paddingTop: 16,
                    borderTop: `1px solid ${topColor}18`,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: `${topColor}20`, border: `1px solid ${topColor}28`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <CardIcon id={topCardId} color={topColor} size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
                        {cardLabel[topCardId]}
                      </div>
                      <div style={{ fontSize: 12, color: `${topColor}80`, marginTop: 2 }}>
                        {cardDesc[topCardId]}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: topColor, background: `${topColor}18`, border: `1px solid ${topColor}28`,
                      padding: '4px 10px', borderRadius: 999,
                    }}>
                      {topIdx + 1} / 4
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <div style={{
        width: '100%', maxWidth: 480, flexShrink: 0,
        padding: '8px 20px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      }}>
        <button
          onClick={() => advance('right')}
          disabled={flyActive}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            padding: '10px 24px', borderRadius: 14,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: flyActive ? 'not-allowed' : 'pointer', color: 'rgba(255,255,255,0.6)',
            fontSize: 15, fontWeight: 300, transition: 'opacity 0.15s',
            opacity: flyActive ? 0.4 : 1,
          }}>
          <span>←</span>
          <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>prev</span>
        </button>

        {/* Dot indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}>
          {CARD_ORDER.map((id, i) => (
            <div key={id} style={{
              height: 5, borderRadius: 99,
              width: i === topIdx ? 22 : 6,
              background: i === topIdx ? CARD_COLOR[id] : 'rgba(255,255,255,0.15)',
              transition: 'width 0.25s cubic-bezier(0.34,1.56,0.64,1), background 0.2s',
            }} />
          ))}
        </div>

        <button
          onClick={() => advance('left')}
          disabled={flyActive}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            padding: '10px 24px', borderRadius: 14,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: flyActive ? 'not-allowed' : 'pointer', color: 'rgba(255,255,255,0.6)',
            fontSize: 15, fontWeight: 300, transition: 'opacity 0.15s',
            opacity: flyActive ? 0.4 : 1,
          }}>
          <span>→</span>
          <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>next</span>
        </button>
      </div>

      {/* UpgradeDrawer */}
      {upgradeDrawer && (
        <UpgradeDrawer mode={upgradeDrawer} onClose={() => setUpgradeDrawer(null)} />
      )}
    </div>
  )
}
