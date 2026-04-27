'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// ── Tipo condiviso con i client ───────────────────────────────────────────────
export interface LimitInfo {
  limitType: 'weekly_debates' | 'daily_debates' | 'weekly_brainstormer'
  retryAfter: number   // secondi
  limit: number
  tier: string
  requiredTier: 'pro' | 'premium'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRetryAfter(seconds: number): string {
  if (seconds < 3600) {
    const m = Math.ceil(seconds / 60)
    return `tra ${m} minut${m === 1 ? 'o' : 'i'}`
  }
  if (seconds < 86400) {
    const h = Math.ceil(seconds / 3600)
    return h === 1 ? 'tra circa un\'ora' : `tra circa ${h} ore`
  }
  const d = Math.ceil(seconds / 86400)
  return d === 1 ? 'domani' : `tra ${d} giorni`
}

const LIMIT_COPY: Record<LimitInfo['limitType'], {
  icon: string
  badge: string
  title: string
  body: (limit: number, reset: string) => string
}> = {
  weekly_debates: {
    icon: '🗓',
    badge: 'Limite settimanale',
    title: 'Hai esaurito i tuoi dibattiti questa settimana',
    body: (limit, reset) =>
      `Il piano Free include ${limit} dibattiti a settimana. Il contatore si rinnova ${reset}.`,
  },
  daily_debates: {
    icon: '⏱',
    badge: 'Limite giornaliero',
    title: 'Hai raggiunto i tuoi dibattiti di oggi',
    body: (limit, reset) =>
      `Il piano Pro include ${limit} dibattiti al giorno. Il contatore si rinnova ${reset}.`,
  },
  weekly_brainstormer: {
    icon: '💡',
    badge: 'Limite settimanale',
    title: 'Hai esaurito le sessioni Brainstormer di questa settimana',
    body: (limit, reset) =>
      `Il piano Pro include ${limit} sessioni Brainstormer a settimana. Il contatore si rinnova ${reset}.`,
  },
}

const PLAN_CTA: Record<'pro' | 'premium', { label: string; price: string; color: string; gradient: string }> = {
  pro:     { label: 'Passa a Pro',     price: '9,99€/mese',  color: '#A78BFA', gradient: 'linear-gradient(135deg,#7C3AED,#5B21B6)' },
  premium: { label: 'Passa a Premium', price: '19,99€/mese', color: '#FF6B2B', gradient: 'linear-gradient(135deg,#FF6B2B,#DC2626)' },
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface LimitWallProps {
  limitInfo: LimitInfo
  isDark?: boolean
  onDismiss?: () => void
}

// ── Componente principale ─────────────────────────────────────────────────────
export default function LimitWall({ limitInfo, isDark = true, onDismiss }: LimitWallProps) {
  const router = useRouter()
  const [secondsLeft, setSecondsLeft] = useState(limitInfo.retryAfter)

  // Countdown live
  useEffect(() => {
    if (secondsLeft <= 0) return
    const id = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [])

  const copy   = LIMIT_COPY[limitInfo.limitType]
  const cta    = PLAN_CTA[limitInfo.requiredTier]
  const reset  = formatRetryAfter(secondsLeft)

  const bg     = isDark ? 'rgba(14,9,25,0.96)' : 'rgba(255,255,255,0.97)'
  const border = isDark ? 'rgba(167,139,250,0.15)' : 'rgba(124,58,237,0.12)'
  const textPrimary   = isDark ? '#fff'                      : '#111'
  const textSecondary = isDark ? 'rgba(255,255,255,0.5)'     : 'rgba(0,0,0,0.45)'
  const badgeBg       = isDark ? 'rgba(167,139,250,0.12)'    : 'rgba(124,58,237,0.08)'
  const badgeColor    = isDark ? '#c4b5fd'                   : '#7C3AED'
  const dismissColor  = isDark ? 'rgba(255,255,255,0.3)'     : 'rgba(0,0,0,0.3)'

  return (
    <div
      className="limit-wall-enter flex flex-col items-center justify-center px-4 py-10 text-center"
      style={{ minHeight: 320 }}
    >
      {/* Icona */}
      <div
        className="flex items-center justify-center rounded-2xl mb-5"
        style={{
          width: 64, height: 64,
          background: isDark ? 'rgba(167,139,250,0.1)' : 'rgba(124,58,237,0.08)',
          border: `1px solid ${border}`,
          fontSize: 30,
        }}
      >
        {copy.icon}
      </div>

      {/* Badge */}
      <div
        className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-3"
        style={{ backgroundColor: badgeBg, color: badgeColor, letterSpacing: '0.1em' }}
      >
        {copy.badge}
      </div>

      {/* Titolo */}
      <h3
        className="font-black text-[17px] leading-snug mb-2.5 max-w-xs"
        style={{ color: textPrimary }}
      >
        {copy.title}
      </h3>

      {/* Body */}
      <p
        className="text-[13px] leading-relaxed mb-6 max-w-[260px]"
        style={{ color: textSecondary }}
      >
        {copy.body(limitInfo.limit, reset)}
      </p>

      {/* CTA principale — upgrade */}
      <button
        onClick={() => router.push('/pricing')}
        className="w-full max-w-[260px] py-3.5 rounded-xl font-bold text-[14px] text-white transition-all hover:scale-[1.02] active:scale-[0.98] mb-3"
        style={{
          background: cta.gradient,
          boxShadow: `0 4px 20px ${cta.color}44`,
        }}
      >
        {cta.label}
        <span className="ml-2 opacity-75 text-[12px] font-normal">{cta.price}</span>
      </button>

      {/* Countdown timer — solo se < 24h */}
      {secondsLeft < 86400 && secondsLeft > 0 && (
        <div
          className="flex items-center gap-1.5 text-[11px] mb-3"
          style={{ color: textSecondary }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Rinnovo {formatRetryAfter(secondsLeft)}
        </div>
      )}

      {/* Dismiss / torna indietro */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-[12px] transition-opacity hover:opacity-70"
          style={{ color: dismissColor }}
        >
          Torna indietro
        </button>
      )}

      <style>{`
        .limit-wall-enter {
          animation: limitWallIn 0.35s cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes limitWallIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  )
}
