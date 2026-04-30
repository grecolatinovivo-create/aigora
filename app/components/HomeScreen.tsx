'use client'
// HomeScreen v3 — Card Stack (playing card layout)
// Sprint 3 — 30 apr 2026
// Tall cards, content anchored bottom, ghost stack, prev/next nav

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import UpgradeDrawer, { type UpgradeMode } from '@/app/components/ui/UpgradeDrawer'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

// Haptic wrapper: Capacitor nativo (iOS/Android) con fallback Web Vibration API
async function hapticTap() {
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    try { navigator.vibrate?.(12) } catch {}
  }
}

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

// Posizioni ghost card (pos 1,2,3) — fan effect come carte sul tavolo
// pos 1 → spostata a destra e leggermente in basso
// pos 2 → spostata a sinistra e più in basso
// pos 3 → leggermente a destra, più in fondo
const GHOST_TX     = [13,  -10, 5]     // translateX — mazzo compatto
const GHOST_TY     = [8,    15, 20]    // translateY
const GHOST_SCALES = [1, 1, 1]
const GHOST_OPAC   = [1,    0.78, 0.62]

// Rotazione fissa per carta — viaggia con la carta (non con la posizione)
// Range stretto: max 4 gradi tra adiacenti
const CARD_ROT: Record<string, number> = {
  arena:       2,
  twoVsTwo:   -1,
  devil:        3,
  brainstorm:   0,
}

// Label angolo superiore destro — come un mazzo di carte
const CARD_CORNER: Record<string, string> = {
  arena: 'A', twoVsTwo: '2', devil: 'D', brainstorm: 'B',
}

const CARD_COLOR: Record<CardId, string> = {
  arena: C.arena, twoVsTwo: C.twoVsTwo, devil: C.devil, brainstorm: C.brainstorm,
}

// Sfondi pastello delle carte — come carte da gioco vere
const CARD_BG: Record<CardId, string> = {
  arena:      '#EAE6FF',
  twoVsTwo:   '#DFF5F5',
  devil:      '#FFE8E8',
  brainstorm: '#FFF8E0',
}
// Testo scuro sulla carta (leggibile su sfondo chiaro)
const CARD_DARK: Record<CardId, string> = {
  arena:      '#3D2AA0',
  twoVsTwo:   '#0B6B9E',
  devil:      '#9C2626',
  brainstorm: '#7A5500',
}
const CARD_MID: Record<CardId, string> = {
  arena:      '#7B68C8',
  twoVsTwo:   '#4B9CBD',
  devil:      '#C27070',
  brainstorm: '#B38A30',
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
  const [showSwipeHint, setShowSwipeHint] = useState(true)
  const [topIdx,    setTopIdx]    = useState(0)
  const [dragX,     setDragX]     = useState(0)
  const [flyDir,    setFlyDir]    = useState<'left' | 'right' | null>(null)
  const [flyActive, setFlyActive] = useState(false)
  const [snapback,  setSnapback]  = useState(false)
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [phraseVis, setPhraseVis] = useState(true)
  // La top card usa la rotazione propria della carta (viaggia con lei)

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
  // dir = direzione visiva del volo (segue il gesto), ma topIdx avanza sempre +1
  const advance = useCallback((dir: 'left' | 'right') => {
    if (flyActive) return
    setShowSwipeHint(false)
    hapticTap()
    setFlyDir(dir)
    setFlyActive(true)
    // Anticipa il cambio di topIdx a 260ms — mentre flyActive è ancora true
    // le ghost cards hanno le transizioni attive e scorrono fluidamente
    setTimeout(() => {
      setTopIdx(i => (i + 1) % CARD_ORDER.length)  // sempre avanti, indipendente dalla direzione
      setDragX(0); setFlyDir(null)
    }, 260)
    setTimeout(() => {
      setFlyActive(false); setSnapback(false)
    }, 360)
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
    // Fly away
    if (flyActive && flyDir) {
      return {
        transform: `translateX(${flyDir === 'left' ? -640 : 640}px) rotate(${flyDir === 'left' ? -22 : 22}deg)`,
        transition: 'transform 0.32s ease-in',
      }
    }
    // Drag: rotazione propria della carta + rotazione da drag
    const rot = CARD_ROT[topCardId] + dragX / 30
    return {
      transform: `translateX(${dragX}px) rotate(${rot}deg)`,
      transition: snapback ? 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
    }
  }

  // ── Ghost card style ──────────────────────────────────────────────────────
  const ghostStyle = (pos: number, id: CardId): React.CSSProperties => {
    const p = pos - 1
    return {
      transform: `translateX(${GHOST_TX[p]}px) translateY(${GHOST_TY[p]}px) rotate(${CARD_ROT[id]}deg) scale(${GHOST_SCALES[p]})`,
      opacity: GHOST_OPAC[p],
      zIndex: 10 - pos,
      pointerEvents: 'none',
      // Quando flyActive, le ghost transitano fluidamente alle nuove posizioni
      transition: flyActive
        ? 'transform 0.3s ease-out, opacity 0.3s ease-out'
        : 'none',
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
            const bg    = CARD_BG[id]
            const dark  = CARD_DARK[id]
            const mid   = CARD_MID[id]
            const phrase = PHRASES[id][0]
            return (
              <div key={pos} style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 44,
                borderRadius: 24,
                background: bg,
                boxShadow: '0 4px 24px rgba(0,0,0,0.28)',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                padding: '24px 22px 22px',
                ...ghostStyle(pos, id),
              }}>
                {/* Corner label — stile carta da gioco */}
                <div style={{
                  position: 'absolute', top: 14, right: 16,
                  fontSize: 18, fontWeight: 900, color: dark,
                  opacity: 0.35, lineHeight: 1, letterSpacing: '-0.02em',
                  fontFamily: 'Georgia, serif',
                }}>
                  {CARD_CORNER[id]}
                </div>
                {/* Phrase */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <p style={{
                    margin: 0,
                    fontSize: 'clamp(20px, 5.5vw, 26px)', fontWeight: 900,
                    color: dark, lineHeight: 1.22,
                    letterSpacing: '-0.02em', whiteSpace: 'pre-line',
                    opacity: 0.55,
                  }}>
                    {phrase}
                  </p>
                </div>
                {/* Bottom identity */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                    background: CARD_COLOR[id],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CardIcon id={id} color="#fff" size={19} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: dark, lineHeight: 1.1 }}>
                      {cardLabel[id]}
                    </div>
                    <div style={{ fontSize: 11, color: mid, marginTop: 1 }}>
                      {cardDesc[id]}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Top card */}
          <div
            onClick={handleCardTap}
            style={{
              position: 'relative', zIndex: 10,
              borderRadius: 24,
              background: CARD_BG[topCardId],
              boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              cursor: 'pointer',
              ...topTransform(),
            }}
          >

            {/* Swipe hint finger */}
            {showSwipeHint && !arenaOpen && (
              <div style={{
                position: 'absolute', bottom: 36, left: '50%',
                transform: 'translateX(-50%)',
                pointerEvents: 'none', zIndex: 20,
                animation: 'swipe-hint 2.2s ease-in-out infinite',
              }}>
                {/* Finger SVG */}
                <svg width="28" height="36" viewBox="0 0 28 36" fill="none">
                  {/* Palm */}
                  <ellipse cx="14" cy="28" rx="9" ry="7" fill="rgba(0,0,0,0.18)" />
                  {/* Finger */}
                  <rect x="11" y="8" width="6" height="18" rx="3" fill="rgba(0,0,0,0.22)" />
                  {/* Knuckle line */}
                  <line x1="11" y1="20" x2="17" y2="20" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
                  {/* Tap ring */}
                  <circle cx="14" cy="11" r="5" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" fill="none"
                    style={{ animation: 'swipe-ring 2.2s ease-in-out infinite' }} />
                </svg>
              </div>
            )}
            <style>{`
              @keyframes swipe-hint {
                0%   { opacity: 0;   transform: translateX(calc(-50% + 36px)); }
                12%  { opacity: 1;   transform: translateX(calc(-50% + 36px)); }
                55%  { opacity: 1;   transform: translateX(calc(-50% - 36px)); }
                72%  { opacity: 0;   transform: translateX(calc(-50% - 56px)); }
                100% { opacity: 0;   transform: translateX(calc(-50% + 36px)); }
              }
              @keyframes swipe-ring {
                0%,100% { opacity: 0; transform: scale(0.7); }
                12%,55% { opacity: 1; transform: scale(1); }
              }
            `}</style>

            {/* Corner label — stile carta da gioco */}
            {!isLocked && (
              <div style={{
                position: 'absolute', top: 14, right: 16, zIndex: 2,
                fontSize: 20, fontWeight: 900, color: CARD_DARK[topCardId],
                opacity: 0.3, lineHeight: 1, letterSpacing: '-0.02em',
                fontFamily: 'Georgia, serif',
                pointerEvents: 'none',
              }}>
                {CARD_CORNER[topCardId]}
              </div>
            )}

            {/* Pro badge */}
            {isLocked && (
              <div style={{
                position: 'absolute', top: 16, right: 16, zIndex: 2,
                display: 'flex', alignItems: 'center', gap: 4,
                background: `${CARD_DARK[topCardId]}18`,
                border: `1px solid ${CARD_DARK[topCardId]}30`,
                borderRadius: 999, padding: '4px 10px 4px 7px',
              }}>
                <IcoLock color={CARD_DARK[topCardId]} />
                <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: CARD_DARK[topCardId] }}>Pro</span>
              </div>
            )}

            <div style={{ padding: '28px 24px 24px', display: 'flex', flexDirection: 'column', minHeight: '52vh' }}>

              {/* ── Arena input (when open) ── */}
              {topCardId === 'arena' && arenaOpen ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }} onClick={e => e.stopPropagation()}>
                  <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: CARD_MID[topCardId], textTransform: 'uppercase', letterSpacing: '0.1em' }}>
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
                      background: 'rgba(0,0,0,0.05)',
                      border: `1px solid ${CARD_DARK[topCardId]}28`,
                      borderRadius: 14, padding: '12px 14px',
                      fontSize: 15, color: CARD_DARK[topCardId],
                      resize: 'none', outline: 'none', lineHeight: 1.6,
                    }}
                  />
                  {/* Argomento del giorno */}
                  <button
                    onClick={e => { e.stopPropagation(); setQuestion(dailyTopic) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: `${CARD_DARK[topCardId]}08`, border: `1px solid ${CARD_DARK[topCardId]}20`,
                      borderRadius: 10, padding: '8px 12px',
                      cursor: 'pointer', textAlign: 'left',
                    }}>
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={CARD_DARK[topCardId]} strokeWidth={2.5} strokeLinecap="round">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                    <span style={{ fontSize: 11, fontWeight: 700, color: CARD_DARK[topCardId], letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {t('dailyTopicLabel')}
                    </span>
                    <span style={{ fontSize: 12, color: CARD_MID[topCardId], flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                      fontSize: 11, color: `${CARD_DARK[topCardId]}40`,
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
                      color: CARD_DARK[topCardId],
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
                        ? `${CARD_DARK[topCardId]}12`
                        : CARD_DARK[topCardId],
                      border: isLocked ? `1px solid ${CARD_DARK[topCardId]}25` : 'none',
                      boxShadow: isLocked ? 'none' : `0 4px 24px ${CARD_DARK[topCardId]}35`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    }}>
                      {isLocked && <IcoLock color={`${CARD_DARK[topCardId]}80`} />}
                      <span style={{ fontSize: 14, fontWeight: 800, color: isLocked ? `${CARD_DARK[topCardId]}70` : '#fff' }}>
                        {isLocked ? 'Sblocca con Pro' : cardCta[topCardId]}
                      </span>
                    </div>
                  </div>

                  {/* ── Bottom identity row ── */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    paddingTop: 16,
                    borderTop: `1px solid ${CARD_DARK[topCardId]}18`,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: CARD_COLOR[topCardId],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <CardIcon id={topCardId} color="#fff" size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: CARD_DARK[topCardId], lineHeight: 1.1 }}>
                        {cardLabel[topCardId]}
                      </div>
                      <div style={{ fontSize: 12, color: CARD_MID[topCardId], marginTop: 2 }}>
                        {cardDesc[topCardId]}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: CARD_DARK[topCardId], background: `${CARD_DARK[topCardId]}12`, border: `1px solid ${CARD_DARK[topCardId]}25`,
                      padding: '4px 10px', borderRadius: 999,
                    }}>
                      {['Arena','2v2',"Devil's",'Brain'][topIdx]}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Dot indicators ─────────────────────────────────────────────── */}
      <div style={{
        width: '100%', maxWidth: 480, flexShrink: 0,
        padding: '10px 20px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      }}>
        {CARD_ORDER.map((id, i) => (
          <div key={id} style={{
            height: 5, borderRadius: 99,
            width: i === topIdx ? 22 : 6,
            background: i === topIdx ? CARD_COLOR[id] : 'rgba(255,255,255,0.15)',
            transition: 'width 0.25s cubic-bezier(0.34,1.56,0.64,1), background 0.2s',
          }} />
        ))}
      </div>

      {/* UpgradeDrawer */}
      {upgradeDrawer && (
        <UpgradeDrawer mode={upgradeDrawer} onClose={() => setUpgradeDrawer(null)} />
      )}
    </div>
  )
}
