import { prisma } from './prisma'
import { createHash } from 'crypto'

const MAX_SESSIONS = 3
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 giorni

// Genera un token di sessione univoco dall'user agent + un salt casuale
export function generateSessionToken(userAgent: string): string {
  const random = Math.random().toString(36).slice(2)
  return createHash('sha256').update(`${userAgent}:${random}:${Date.now()}`).digest('hex')
}

// Registra una nuova sessione, rimuovendo le più vecchie se si supera il limite
export async function registerSession(userId: string, token: string, ip: string, userAgent: string) {
  // Geolocalizzazione approssimativa tramite ip-api (gratuita, no key)
  let country: string | null = null
  try {
    if (ip && ip !== 'unknown' && ip !== '::1' && !ip.startsWith('127.')) {
      const geo = await fetch(`http://ip-api.com/json/${ip}?fields=country`, { signal: AbortSignal.timeout(2000) })
      const data = await geo.json()
      country = data.country ?? null
    }
  } catch {}

  // Crea la nuova sessione
  await prisma.activeSession.create({
    data: { userId, token, ip, country, userAgent },
  })

  // Conta le sessioni attive (non scadute)
  const cutoff = new Date(Date.now() - SESSION_TTL_MS)
  const sessions = await prisma.activeSession.findMany({
    where: { userId, lastSeenAt: { gte: cutoff } },
    orderBy: { lastSeenAt: 'asc' },
  })

  // Se supera il limite, elimina le più vecchie
  if (sessions.length > MAX_SESSIONS) {
    const toDelete = sessions.slice(0, sessions.length - MAX_SESSIONS)
    await prisma.activeSession.deleteMany({
      where: { id: { in: toDelete.map(s => s.id) } },
    })
  }

  // Pulizia sessioni scadute
  await prisma.activeSession.deleteMany({
    where: { userId, lastSeenAt: { lt: cutoff } },
  }).catch(() => {})
}

// Verifica se un token è valido e aggiorna lastSeenAt
export async function validateSession(token: string): Promise<{ valid: boolean; suspicious: boolean }> {
  if (!token) return { valid: false, suspicious: false }

  const session = await prisma.activeSession.findUnique({ where: { token } })
  if (!session) return { valid: false, suspicious: false }

  // Scaduta?
  if (Date.now() - session.lastSeenAt.getTime() > SESSION_TTL_MS) {
    await prisma.activeSession.delete({ where: { id: session.id } }).catch(() => {})
    return { valid: false, suspicious: false }
  }

  // Aggiorna lastSeen
  await prisma.activeSession.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  }).catch(() => {})

  // Controlla se ci sono sessioni anomale (stesso account, paesi diversi, attive nell'ultimo minuto)
  const recentSessions = await prisma.activeSession.findMany({
    where: {
      userId: session.userId,
      lastSeenAt: { gte: new Date(Date.now() - 60_000) }, // ultimo minuto
    },
  })

  const countries = new Set(recentSessions.map(s => s.country).filter(Boolean))
  const suspicious = countries.size > 1

  return { valid: true, suspicious }
}

// Invalida una sessione specifica (logout)
export async function invalidateSession(token: string) {
  await prisma.activeSession.deleteMany({ where: { token } }).catch(() => {})
}
