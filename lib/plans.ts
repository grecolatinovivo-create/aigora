// ── Configurazione centralizzata dei tier di monetizzazione ──────────────────
// Aggiorna SOLO questo file per cambiare prezzi, limiti e accessi.

import { rateLimit } from './rateLimit'

export type Tier = 'free' | 'pro' | 'premium' | 'admin' | 'freemium'
export type AppMode = 'chat' | 'brainstorm' | 'devil' | '2v2'

export type LimitType =
  | 'weekly_debates'       // Free: 3/settimana
  | 'daily_debates'        // Pro: 10/giorno
  | 'weekly_brainstormer'  // Pro: 2/settimana
  | 'weekly_2v2'           // Free: 1/settimana

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
  // Limite upload mensili (silenzioso — nessuna LimitWall, allegato ignorato)
  maxUploadsPerMonth?: number  // Pro: 20, Premium: 100 — undefined = illimitato
  // Limiti brainstormer
  weeklyBrainstormer?: number  // Pro: 2/sett — undefined = illimitato
  // Sfide 2v2 (solo host — B non consuma crediti)
  weekly2v2?: number           // Free: 1/sett — undefined = illimitato
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
    weekly2v2: 1,
    modes: ['chat', '2v2'],
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
    maxUploadsPerMonth: 20,
    modes: ['chat', 'brainstorm', 'devil', '2v2'],
    hasHistory: true,
    historyDays: 30,
  },
  premium: {
    label: 'Premium',
    price: 19.99,
    priceId: process.env.STRIPE_PRICE_MAX ?? '',
    color: '#FF6B2B',
    maxUploadsPerMonth: 100,
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

/**
 * Risolve il tier effettivo di un utente controllando ENTRAMBI:
 * 1. Il campo plan nel DB (fonte primaria)
 * 2. L'email contro ADMIN_EMAIL (fallback legacy)
 * Usare questa invece di fare `isAdmin = user.email === ADMIN_EMAIL` in ogni route.
 */
export function resolveUserTier(user: { email?: string | null; plan?: string | null } | null | undefined): Tier {
  if (!user) return 'free'
  // Check by plan field (primary — più robusto dell'email)
  const byPlan = normalizePlan(user.plan)
  if (byPlan !== 'free') return byPlan
  // Fallback: check by ADMIN_EMAIL (retrocompatibilità)
  if (user.email && process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL) return 'admin'
  return 'free'
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
export async function checkDebateLimit(userId: string, tier: Tier): Promise<LimitResult> {
  const cfg = TIER_CONFIG[tier]

  if (tier === 'premium' || tier === 'admin' || tier === 'freemium') return { ok: true }

  if (tier === 'free' && cfg.weeklyDebates) {
    const rl = await rateLimit(`debates-weekly:${userId}`, cfg.weeklyDebates, WEEK_MS)
    if (!rl.ok) return { ok: false, limitType: 'weekly_debates', retryAfter: rl.retryAfter!, limit: cfg.weeklyDebates, requiredTier: 'pro' }
  }

  if (tier === 'pro' && cfg.dailyDebates) {
    const rl = await rateLimit(`debates-daily:${userId}`, cfg.dailyDebates, DAY_MS)
    if (!rl.ok) return { ok: false, limitType: 'daily_debates', retryAfter: rl.retryAfter!, limit: cfg.dailyDebates, requiredTier: 'premium' }
  }

  return { ok: true }
}

/**
 * Controlla il limite settimanale del Brainstormer (Pro: 2/sett, altri: illimitato).
 */
export async function checkBrainstormerLimit(userId: string, tier: Tier): Promise<LimitResult> {
  if (tier === 'premium' || tier === 'admin' || tier === 'freemium') return { ok: true }

  const cfg = TIER_CONFIG[tier]
  if (tier === 'pro' && cfg.weeklyBrainstormer) {
    const rl = await rateLimit(`brainstormer-weekly:${userId}`, cfg.weeklyBrainstormer, WEEK_MS)
    if (!rl.ok) return { ok: false, limitType: 'weekly_brainstormer', retryAfter: rl.retryAfter!, limit: cfg.weeklyBrainstormer, requiredTier: 'premium' }
  }

  return { ok: true }
}

/** @deprecated usa checkDebateLimit */
export async function checkDailyDebateLimit(userId: string, tier: Tier): Promise<{ ok: boolean; retryAfter?: number }> {
  const result = await checkDebateLimit(userId, tier)
  return result.ok ? { ok: true } : { ok: false, retryAfter: result.retryAfter }
}

/**
 * Controlla il limite sfide 2v2 settimanali.
 * Free: 1/settimana (solo host — B che accetta non consuma crediti).
 * Pro/Premium/Admin/Freemium: illimitato.
 */
export async function checkTwoVsTwoLimit(userId: string, tier: Tier): Promise<LimitResult> {
  if (tier !== 'free') return { ok: true }

  const cfg = TIER_CONFIG[tier]
  if (cfg.weekly2v2) {
    const rl = await rateLimit(`2v2-weekly:${userId}`, cfg.weekly2v2, WEEK_MS)
    if (!rl.ok) return {
      ok: false,
      limitType: 'weekly_2v2',
      retryAfter: rl.retryAfter!,
      limit: cfg.weekly2v2,
      requiredTier: 'pro',
    }
  }

  return { ok: true }
}
