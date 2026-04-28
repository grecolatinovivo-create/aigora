// Rate limiter persistente su Prisma/PostgreSQL (multi-instance safe)
// Usa un atomic upsert PostgreSQL: nessuna race condition tra istanze serverless.

import { prisma } from './prisma'

export async function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ ok: boolean; retryAfter?: number }> {
  const now = new Date()
  const resetAt = new Date(Date.now() + windowMs)

  const result = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" (key, count, "resetAt")
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN "RateLimit"."resetAt" < ${now} THEN 1
        ELSE "RateLimit".count + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimit"."resetAt" < ${now} THEN ${resetAt}
        ELSE "RateLimit"."resetAt"
      END
    RETURNING count, "resetAt"
  `

  const { count, resetAt: windowEnd } = result[0]

  if (count > maxRequests) {
    return {
      ok: false,
      retryAfter: Math.ceil((windowEnd.getTime() - Date.now()) / 1000),
    }
  }

  return { ok: true }
}
