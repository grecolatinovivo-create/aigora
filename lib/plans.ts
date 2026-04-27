// ── Configurazione centralizzata dei tier di monetizzazione ──────────────────
// Aggiorna SOLO questo file per cambiare prezzi, limiti e accessi.

import { rateLimit } from './rateLimit'

export type Tier = 'free' | 'pro' | 'premium' | 'admin'
export type AppMode = 'chat' | 'brainstorm' | 'devil' | '2v2'

export interface TierConfig {
  label: string
  price?: number          // undefined = gratuito
  priceId?: string        // Stripe price ID (da env var)
  color: string
  dailyDebates: number    // -1 = illimitati
  modes: AppMode[]
  hasHistory: boolean
  historyDays?: number    // undefined = illimitata
}

export const TIER_CONFIG: Record<Tier, TierConfig> = {
  free: {
    label: 'Free',
    color: '#10A37F',
    dailyDebates: 5,
    modes: ['chat'],
    hasHistory: false,
  },
  pro: {
    label: 'Pro',
    price: 9.99,
    priceId: process.env.STRIPE_PRICE_PRO ?? '',
    color: '#A78BFA',
    dailyDebates: 30,
    modes: ['chat', 'brainstorm', 'devil', '2v2'],
    hasHistory: true,
    historyDays: 30,
  },
  premium: {
    label: 'Premium',
    price: 19.99,
    priceId: process.env.STRIPE_PRICE_MAX ?? '',
    color: '#FF6B2B',
    dailyDebates: -1,
    modes: ['chat', 'brainstorm', 'devil', '2v2'],
    hasHistory: true,
  },
  admin: {
    label: 'Admin',
    color: '#F59E0B',
    dailyDebates: -1,
    modes: ['chat', 'brainstorm', 'devil', '2v2'],
    hasHistory: true,
  },
}

/** Normalizza il valore raw del DB (inclusi legacy) verso un Tier valido */
export function normalizePlan(dbPlan: string | null | undefined): Tier {
  switch (dbPlan) {
    case 'admin':   return 'admin'
    case 'premium': return 'premium'
    case 'max':     return 'premium'  // legacy DB value
    case 'pro':     return 'pro'
    case 'free':    return 'free'
    case 'starter': return 'free'     // legacy DB value
    default:        return 'free'     // 'none' o qualsiasi altro valore
  }
}

/** True se il tier può usare la modalità specificata */
export function canUseMode(tier: Tier, mode: AppMode): boolean {
  return TIER_CONFIG[tier].modes.includes(mode)
}

/** Limite giornaliero dibattiti del tier (-1 = illimitato) */
export function getDailyLimit(tier: Tier): number {
  return TIER_CONFIG[tier].dailyDebates
}

/** True se il tier ha accesso alla cronologia delle chat */
export function hasChatHistory(tier: Tier): boolean {
  return TIER_CONFIG[tier].hasHistory
}

// ── Daily debate limiter ─────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Controlla e incrementa il contatore giornaliero di dibattiti per un utente.
 * Restituisce { ok: true } se il dibattito è permesso, { ok: false, retryAfter? } altrimenti.
 */
export function checkDailyDebateLimit(userId: string, tier: Tier): { ok: boolean; retryAfter?: number } {
  const limit = getDailyLimit(tier)
  if (limit === -1) return { ok: true }   // illimitato (premium / admin)
  return rateLimit(`debates-daily:${userId}`, limit, DAY_MS)
}
