// ── Configurazione centralizzata dei tier di monetizzazione ──────────────────
// Aggiorna SOLO questo file per cambiare prezzi, limiti e accessi.

import { rateLimit } from './rateLimit'

export type Tier = 'free' | 'pro' | 'premium' | 'admin' | 'freemium'
export type AppMode = 'chat' | 'brainstorm' | 'devil' | '2v2'

export type LimitType =
  | 'weekly_debates'       // Free: 3/settimana
  | 'daily_debates'        // Pro: 10/giorno
  | 'weekly_brainstormer'  // Pro: 2/settimana

export interface LimitReached {
  ok: false
  limitType: LimitType
  retryAfter: number   // secondi
  limit: number
  requiredTier: 'pro' | 'premium'
}
export type LimitResult = { ok: true } | LimitReached

export interface TierConfig {
  label: string
  price?: number
  priceId?: string
  color: string
  // Limiti dibattiti
  weeklyDebates?: number       // Free: 3/sett — undefined = nessun limite settimanale
  dailyDebates?: number        // Pro: 10/giorno — undefined = nessun limite giornaliero
  maxRepliesPerDebate?: number // Free: 20 — undefined = illimitato
  // Token per risposta AI nel dibattito
  maxTokensPerReply?: number   // Free: 220, Pro: 420 — undefined = illimitato (Premium)
  // Limiti brainstormer
  weeklyBrainstormer?: number  // Pro: 2/sett — undefined = illimitato
  modes: AppMode[]
  hasHistory: boolean
  historyDays?: number
}

export const TIER_CONFIG: Record<Tier, TierConfig> = {
  free: {
    label: 'Free',
    color: '#10A37F',
    weeklyDebates: 3,
    maxRepliesPerDebate: 20,
    maxTokensPerReply: 220,
    modes: ['chat'],
    hasHistory: false,
  },
  pro: {
    label: 'Pro',
    price: 9.99,
    priceId: process.env.STRIPE_PRICE_PRO ?? '',
    color: '#A78BFA',
    dailyDebates: 10,
    weeklyBrainstormer: 2,
    maxTokensPerReply: 420,
    modes: ['chat', 'brainstorm', 'devil', '2v2'],
    hasHistory: true,
    historyDays: 30,
  },
  premium: {
    label: 'Premium',
    price: 19.99,
    priceId: process.env.STRIPE_PRICE_MAX ?? '',
    color: '#FF6B2B',
    modes: ['chat', 'brainstorm', 'devil', '2v2'],
    hasHistory: true,
  },
  admin: {
    label: 'Admin',
    color: '#F59E0B',
    modes: ['chat', 'brainstorm', 'devil', '2v2'],
    hasHistory: true,
  },
  freemium: {
    label: 'Freemium',
    color: '#22D3EE',
    modes: ['chat', 'brainstorm', 'devil', '2v2'],
    hasHistory: true,
  },
}

/** Normalizza il valore raw del DB (inclusi legacy) verso un Tier valido */
export function normalizePlan(dbPlan: string | null | undefined): Tier {
  switch (dbPlan) {
    case 'admin':    return 'admin'
    case 'freemium': return 'freemium'
    case 'premium':  return 'premium'
    case 'max':      return 'premium'
    case 'pro':      return 'pro'
    case 'free':     return 'free'
    case 'starter':  return 'free'
    default:         return 'free'
  }
}

export function canUseMode(tier: Tier, mode: AppMode): boolean {
  return TIER_CONFIG[tier].modes.includes(mode)
}

export function hasChatHistory(tier: Tier): boolean {
  return TIER_CONFIG[tier].hasHistory
}

// ── Limiters ─────────────────────────────────────────────────────────────────

const DAY_MS  = 24 * 60 * 60 * 1000
const WEEK_MS =  7 * DAY_MS

/**
 * Controlla il limite dibattiti per tier.
 * Free → settimanale (3/sett) · Pro → giornaliero (10/giorno) · Premium/Admin → illimitato
 */
export function checkDebateLimit(userId: string, tier: Tier): LimitResult {
  const cfg = TIER_CONFIG[tier]

  if (tier === 'premium' || tier === 'admin' || tier === 'freemium') return { ok: true }

  if (tier === 'free' && cfg.weeklyDebates) {
    const rl = rateLimit(`debates-weekly:${userId}`, cfg.weeklyDebates, WEEK_MS)
    if (!rl.ok) return { ok: false, limitType: 'weekly_debates', retryAfter: rl.retryAfter!, limit: cfg.weeklyDebates, requiredTier: 'pro' }
  }

  if (tier === 'pro' && cfg.dailyDebates) {
    const rl = rateLimit(`debates-daily:${userId}`, cfg.dailyDebates, DAY_MS)
    if (!rl.ok) return { ok: false, limitType: 'daily_debates', retryAfter: rl.retryAfter!, limit: cfg.dailyDebates, requiredTier: 'premium' }
  }

  return { ok: true }
}

/**
 * Controlla il limite settimanale del Brainstormer (Pro: 2/sett, altri: illimitato).
 */
export function checkBrainstormerLimit(userId: string, tier: Tier): LimitResult {
  if (tier === 'premium' || tier === 'admin' || tier === 'freemium') return { ok: true }

  const cfg = TIER_CONFIG[tier]
  if (tier === 'pro' && cfg.weeklyBrainstormer) {
    const rl = rateLimit(`brainstormer-weekly:${userId}`, cfg.weeklyBrainstormer, WEEK_MS)
    if (!rl.ok) return { ok: false, limitType: 'weekly_brainstormer', retryAfter: rl.retryAfter!, limit: cfg.weeklyBrainstormer, requiredTier: 'premium' }
  }

  return { ok: true }
}

/** @deprecated usa checkDebateLimit */
export function checkDailyDebateLimit(userId: string, tier: Tier): { ok: boolean; retryAfter?: number } {
  const result = checkDebateLimit(userId, tier)
  return result.ok ? { ok: true } : { ok: false, retryAfter: result.retryAfter }
}
