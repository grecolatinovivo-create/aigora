'use client'
// HomeScreen — fase "start" di AiGORÀ
// Sprint 2 — 29 apr 2026
// Decisione round table: Arena full-width + prominente, 2v2+Devil in riga, Brainstorm full-width.
// Arena espande il form IN-PLACE (dentro la card), nessun collapse della griglia.

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'

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

// ── Icone SVG ─────────────────────────────────────────────────────────────────

const IcoArena = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke={C.arena} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)

const Ico2v2 = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke={C.twoVsTwo} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const IcoDevil = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke={C.devil} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
)

const IcoBrainstorm = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke={C.brainstorm} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="18" x2="15" y2="18"/>
    <line x1="10" y1="22" x2="14" y2="22"/>
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
  </svg>
)

const IcoLock = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
    stroke="rgba(255,255,255,0.45)" strokeWidth={2.2} strokeLinecap="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const IcoSpark = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
    stroke={C.arena} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
)

// ── ProBadge (overlay su card bloccata) ──────────────────────────────────────

function ProOverlay() {
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 'inherit',
      background: 'rgba(7,7,15,0.78)',
      backdropFilter: 'blur(3px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 6,
      zIndex: 10,
    }}>
      <IcoLock />
      <div style={{
        fontSize: 12, fontWeight: 900, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: C.arena,
        background: 'rgba(167,139,250,0.14)',
        border: '1px solid rgba(167,139,250,0.28)',
        padding: '3px 10px', borderRadius: 999,
      }}>Pro+</div>
    </div>
  )
}

// ── Componente principale ─────────────────────────────────────────────────────

export default function HomeScreen({
  userPlan, userName, userImage,
  lastChat, onStartArena, onStart2v2, onStartDevil, onOpenHistory,
}: HomeScreenProps) {
  const locale   = useLocale()
  const router   = useRouter()
  const paid     = isPaid(userPlan)
  const t        = useTranslations('home')

  const [arenaOpen, setArenaOpen] = useState(false)
  const [question, setQuestion]  = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dailyTopic = getDailyTopic(locale)

  // Contatore sessioni Free per questa settimana
  const [weeklyUsed, setWeeklyUsed]   = useState<number | null>(null)
  const [weeklyLimit, setWeeklyLimit] = useState<number | null>(null)

  useEffect(() => {
    if (paid) return // solo per Free
    fetch('/api/limits')
      .then(r => r.json())
      .then(data => {
        if (data.weeklyDebates) {
          setWeeklyUsed(data.weeklyDebates.used)
          setWeeklyLimit(data.weeklyDebates.limit)
        }
      })
      .catch(() => {})
  }, [paid])

  useEffect(() => {
    if (arenaOpen) setTimeout(() => textareaRef.current?.focus(), 120)
  }, [arenaOpen])

  // Colore avatar per piano
  const planColor: Record<string, string> = {
    admin: '#F59E0B', premium: '#FF6B2B', max: '#FF6B2B',
    pro: '#A78BFA', free: '#10A37F', starter: '#10A37F',
  }
  const avatarColor = planColor[userPlan] ?? '#10A37F'
  const initial = (userName || 'U')[0].toUpperCase()

  // Saluto contestuale per ora del giorno
  const h = new Date().getHours()
  const greetKey = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
  const firstName = userName?.split(' ')[0] || ''
  // Se il nome c'è: "Buonasera, Giampiero." — se no: "Buonasera!" (esclamativo, più caldo)
  const greetText = firstName
    ? `${t(`greet.${greetKey}`)}, ${firstName}.`
    : `${t(`greet.${greetKey}`)}!`

  const goLocked = () => router.push(`/${locale}/pricing`)

  // ── Stile base card ───────────────────────────────────────────────────────
  const card = (color: string, selected = false): React.CSSProperties => ({
    position:        'relative',
    borderRadius:    '20px',
    border:          selected ? `1.5px solid ${color}70` : `1px solid ${color}25`,
    background:      selected
      ? `linear-gradient(145deg, ${color}22, ${color}0c)`
      : `linear-gradient(145deg, ${color}10, ${color}06)`,
    boxShadow:       selected ? `0 0 0 1px ${color}35, 0 6px 28px ${color}22` : `0 2px 10px ${color}10`,
    cursor:          'pointer',
    textAlign:       'left',
    overflow:        'hidden',
    WebkitTapHighlightColor: 'transparent',
    transition:      'box-shadow 0.2s, border-color 0.2s, transform 0.15s',
    transform:       selected ? 'scale(1.005)' : 'scale(1)',
  })

  const iconBox = (color: string): React.CSSProperties => ({
    width: 36, height: 36, borderRadius: 10,
    background: `${color}1a`, border: `1px solid ${color}28`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  })

  const tag = (color: string): React.CSSProperties => ({
    fontSize: 12, fontWeight: 900, letterSpacing: '0.14em',
    textTransform: 'uppercase', color,
    background: `${color}18`, border: `1px solid ${color}28`,
    padding: '3px 8px', borderRadius: 999,
  })

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      backgroundColor: C.bg,
      paddingTop:    'env(safe-area-inset-top, 0px)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px 8px',
      }}>
        <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em', lineHeight: 1 }}>
          <span style={{ color: '#fff' }}>Ai</span>
          <span style={{ color: C.arena }}>GORÀ</span>
        </span>
        <button onClick={() => router.push(`/${locale}/dashboard`)} style={{
          width: 38, height: 38, borderRadius: '50%',
          background: userImage ? 'transparent' : avatarColor,
          boxShadow: `0 2px 10px ${avatarColor}44`,
          border: 'none', cursor: 'pointer', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, color: '#fff', fontSize: 15, flexShrink: 0,
        }}>
          {userImage
            ? <img src={userImage} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initial}
        </button>
      </div>

      {/* ─── Scroll area ────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: '6px 16px 32px', display: 'flex', flexDirection: 'column', gap: 14,
      }}>

        {/* Saluto */}
        <div style={{ paddingTop: 2 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>
            {greetText}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.32)', marginTop: 3 }}>
            {t('subtitle')}
          </div>
          {/* Counter sessioni Free */}
          {!paid && weeklyLimit !== null && weeklyUsed !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  width: `${Math.min(1, weeklyUsed / weeklyLimit) * 100}%`,
                  background: weeklyUsed >= weeklyLimit ? '#F87171' : '#A78BFA',
                  transition: 'width 0.6s ease',
                }} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: weeklyUsed >= weeklyLimit ? '#F87171' : 'rgba(255,255,255,0.38)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {weeklyUsed}/{weeklyLimit} {t('weeklyDebates')}
              </div>
            </div>
          )}
        </div>

        {/* ─── Argomento del giorno ────────────────────────────────────── */}
        <button
          onClick={() => { setQuestion(dailyTopic); setArenaOpen(true) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 14px', borderRadius: 15,
            background: 'rgba(167,139,250,0.07)',
            border: '1px solid rgba(167,139,250,0.18)',
            cursor: 'pointer', textAlign: 'left',
            WebkitTapHighlightColor: 'transparent',
            transition: 'background 0.15s',
          }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            background: 'rgba(167,139,250,0.12)',
            border: '1px solid rgba(167,139,250,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IcoSpark />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.arena, marginBottom: 2 }}>
              {t('dailyTopicLabel')}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)', lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {dailyTopic}
            </div>
          </div>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
            stroke="rgba(167,139,250,0.5)" strokeWidth={2.5} strokeLinecap="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>

        {/* ─── Card Arena — full-width, prominente ───────────────────────── */}
        <button
          onClick={() => { if (!arenaOpen) setArenaOpen(true) }}
          style={{ ...card(C.arena, arenaOpen), padding: arenaOpen ? '16px 16px 0' : '16px', width: '100%', display: 'block' }}
        >
          {/* Header card */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={iconBox(C.arena)}><IcoArena /></div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', lineHeight: 1.15 }}>{t('arena.title')}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>{t('arena.desc')}</div>
              </div>
            </div>
            {arenaOpen ? (
              <button
                onClick={e => { e.stopPropagation(); setArenaOpen(false); setQuestion('') }}
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  cursor: 'pointer',
                }}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
                  stroke="rgba(255,255,255,0.55)" strokeWidth={2.5} strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            ) : (
              <div style={tag(C.arena)}>{t('arena.tag')}</div>
            )}
          </div>

          {/* Input espandibile in-place */}
          <div style={{
            overflow: 'hidden',
            maxHeight: arenaOpen ? '160px' : '0px',
            opacity:   arenaOpen ? 1 : 0,
            transition: 'max-height 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.2s',
          }}>
            <div style={{ padding: '12px 0 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
              <textarea
                ref={textareaRef}
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (question.trim()) onStartArena(question.trim()) }
                }}
                onClick={e => e.stopPropagation()}
                placeholder={t('arena.placeholder')}
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(167,139,250,0.22)',
                  borderRadius: 12, padding: '10px 13px',
                  fontSize: 14, color: '#fff',
                  resize: 'none', outline: 'none', lineHeight: 1.55,
                }}
              />
              <button
                onClick={e => { e.stopPropagation(); if (question.trim()) onStartArena(question.trim()) }}
                disabled={!question.trim()}
                style={{
                  width: '100%', padding: '11px', borderRadius: 12, border: 'none',
                  fontSize: 14, fontWeight: 700, color: '#fff',
                  cursor: question.trim() ? 'pointer' : 'not-allowed',
                  background: question.trim() ? 'linear-gradient(135deg,#7C3AED,#5B21B6)' : 'rgba(255,255,255,0.07)',
                  opacity: question.trim() ? 1 : 0.5,
                  boxShadow: question.trim() ? '0 4px 18px rgba(124,58,237,0.38)' : 'none',
                  transition: 'all 0.2s',
                }}>
                {t('arena.cta')}
              </button>
            </div>
          </div>
        </button>

        {/* ─── Riga 2: 2v2 + Devil ──────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

          {/* 2v2 */}
          <button onClick={onStart2v2} style={{ ...card(C.twoVsTwo), padding: '15px 13px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={iconBox(C.twoVsTwo)}><Ico2v2 /></div>
                <div style={tag(C.twoVsTwo)}>2v2</div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{t('twoVsTwo.title')}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 4, lineHeight: 1.45 }}>{t('twoVsTwo.desc')}</div>
              </div>
            </div>
          </button>

          {/* Devil */}
          <button onClick={paid ? onStartDevil : goLocked} style={{ ...card(C.devil), padding: '15px 13px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={iconBox(C.devil)}><IcoDevil /></div>
                <div style={tag(C.devil)}>Devil</div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{t('devil.title')}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 4, lineHeight: 1.45 }}>{t('devil.desc')}</div>
              </div>
            </div>
            {!paid && <ProOverlay />}
          </button>

        </div>

        {/* ─── Brainstorm — full-width ────────────────────────────────── */}
        <button
          onClick={paid ? () => router.push(`/${locale}/brainstorm`) : goLocked}
          style={{ ...card(C.brainstorm), padding: '15px 16px', width: '100%', display: 'block' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={iconBox(C.brainstorm)}><IcoBrainstorm /></div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{t('brainstorm.title')}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>{t('brainstorm.desc')}</div>
              </div>
            </div>
            <div style={tag(C.brainstorm)}>Brainstorm</div>
          </div>
          {!paid && <ProOverlay />}
        </button>

        {/* ─── Ultima sessione ─────────────────────────────────────────── */}
        {lastChat && (
          <button onClick={onOpenHistory} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px', borderRadius: 16,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            cursor: 'pointer', textAlign: 'left',
            WebkitTapHighlightColor: 'transparent',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: 'rgba(167,139,250,0.1)',
              border: '1px solid rgba(167,139,250,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
                stroke="rgba(167,139,250,0.7)" strokeWidth={2.2} strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.arena, letterSpacing: '0.05em', marginBottom: 1 }}>
                {t('lastSession')}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {lastChat.title}
              </div>
            </div>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.22)" strokeWidth={2.5} strokeLinecap="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        )}

        {/* ─── Upgrade hint per Free ───────────────────────────────────── */}
        {!paid && (
          <button onClick={goLocked} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '10px', borderRadius: 13,
            background: 'rgba(167,139,250,0.06)',
            border: '1px solid rgba(167,139,250,0.15)',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
              stroke={C.arena} strokeWidth={2.5} strokeLinecap="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.arena }}>
              {t('upgradeHint')}
            </span>
          </button>
        )}

      </div>
    </div>
  )
}
