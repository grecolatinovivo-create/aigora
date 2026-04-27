'use client'
import { useRouter } from 'next/navigation'

interface UpgradeWallProps {
  title?: string
  description?: string
  /** 'pro' o 'premium' — determina il colore e il CTA */
  requiredTier?: 'pro' | 'premium'
  /** Se true, mostra muro a tutto schermo semi-trasparente (overlay) */
  overlay?: boolean
  onClose?: () => void
}

const TIER_STYLES = {
  pro: { color: '#A78BFA', label: 'Pro', price: '9,99€/mese' },
  premium: { color: '#FF6B2B', label: 'Premium', price: '19,99€/mese' },
}

export default function UpgradeWall({
  title,
  description,
  requiredTier = 'pro',
  overlay = false,
  onClose,
}: UpgradeWallProps) {
  const router = useRouter()
  const style = TIER_STYLES[requiredTier]

  const content = (
    <div
      className="flex flex-col items-center text-center px-8 py-10 rounded-3xl max-w-sm w-full mx-auto"
      style={{
        backgroundColor: 'rgba(12,12,20,0.97)',
        border: `1px solid ${style.color}40`,
        boxShadow: `0 0 60px ${style.color}22`,
      }}
    >
      {/* Icona lock */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
        style={{ backgroundColor: `${style.color}20`, border: `1px solid ${style.color}40` }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={style.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>

      {/* Badge piano */}
      <div
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold mb-4"
        style={{ backgroundColor: `${style.color}20`, color: style.color, border: `1px solid ${style.color}40` }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: style.color }} />
        Piano {style.label} · {style.price}
      </div>

      <h3 className="text-white font-bold text-lg mb-2">
        {title ?? `Funzione riservata al piano ${style.label}`}
      </h3>
      <p className="text-white/50 text-sm mb-7 leading-relaxed">
        {description ?? `Aggiorna il tuo piano per sbloccare questa modalità e molto altro.`}
      </p>

      <button
        onClick={() => router.push('/pricing')}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] mb-3"
        style={{
          background: `linear-gradient(135deg, ${style.color}, ${style.color}cc)`,
          boxShadow: `0 4px 20px ${style.color}44`,
        }}
      >
        Aggiorna a {style.label} →
      </button>

      {onClose && (
        <button
          onClick={onClose}
          className="text-white/30 text-sm hover:text-white/60 transition-colors"
        >
          Non ora
        </button>
      )}
    </div>
  )

  if (overlay) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <div onClick={e => e.stopPropagation()}>{content}</div>
      </div>
    )
  }

  return content
}

// ── Componente variante: banner orizzontale inline ────────────────────────────
export function UpgradeBanner({
  text,
  requiredTier = 'pro',
}: {
  text?: string
  requiredTier?: 'pro' | 'premium'
}) {
  const router = useRouter()
  const style = TIER_STYLES[requiredTier]

  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-3 rounded-2xl text-sm"
      style={{
        backgroundColor: `${style.color}12`,
        border: `1px solid ${style.color}30`,
      }}
    >
      <div className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={style.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>
          {text ?? `Disponibile con il piano ${style.label}`}
        </span>
      </div>
      <button
        onClick={() => router.push('/pricing')}
        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
        style={{ backgroundColor: `${style.color}25`, color: style.color, border: `1px solid ${style.color}40` }}
      >
        Aggiorna
      </button>
    </div>
  )
}
