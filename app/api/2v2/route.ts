import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveUserTier, checkTwoVsTwoLimit } from '@/lib/plans'

export const dynamic = 'force-dynamic'

// Genera codice univoco tipo AIG-X7K2
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'AIG-'
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// POST /api/2v2 — crea una room 2v2
// Body: { topic, teamAAiId, teamBAiId, arbiterAiId, teamAName }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  // Leggi body prima di tutto — req.json() consuma il ReadableStream una volta sola
  const { mode, topic, teamAAiId, teamBAiId1, teamBAiId2, arbiterAiId, teamAName, maxRounds } = await req.json()

  // ── Verifica limite 2v2: Free = 1/settimana, Pro+ = illimitato ────────
  const tier = resolveUserTier(user)
  const limitCheck = await checkTwoVsTwoLimit(user.id, tier)
  if (!limitCheck.ok) {
    return NextResponse.json({
      error: 'Hai usato la sfida settimanale inclusa nel piano Free.',
      limitReached: true,
      retryAfter: limitCheck.retryAfter,
      requiredTier: 'pro',
    }, { status: 429 })
  }
  if (!topic?.trim()) return NextResponse.json({ error: 'Topic mancante' }, { status: 400 })

  const VALID_AIS = ['claude', 'gemini', 'perplexity', 'gpt']
  const isAmico = mode === 'amico'

  if (!VALID_AIS.includes(teamAAiId) || !VALID_AIS.includes(arbiterAiId)) {
    return NextResponse.json({ error: 'AI non valida' }, { status: 400 })
  }
  if (!isAmico && (!VALID_AIS.includes(teamBAiId1) || !VALID_AIS.includes(teamBAiId2))) {
    return NextResponse.json({ error: 'AI squadra B non valida' }, { status: 400 })
  }

  // Genera codice univoco (riprova se già esiste)
  let code = generateCode()
  let attempts = 0
  while (attempts < 5) {
    const existing = await prisma.room.findUnique({ where: { code } })
    if (!existing) break
    code = generateCode()
    attempts++
  }

  const room = await prisma.room.create({
    data: {
      hostId: user.id,
      topic: topic.trim().slice(0, 300),
      visibility: 'private',
      type: '2v2',
      code,
      aiIds: isAmico
        ? [teamAAiId, arbiterAiId]
        : [teamAAiId, teamBAiId1, teamBAiId2, arbiterAiId],
      gameState: {
        mode: isAmico ? 'amico' : 'solo',
        teamA: { humanId: user.id, humanName: teamAName || user.name || 'Squadra A', aiId: teamAAiId },
        teamB: isAmico
          ? { humanId: null, humanName: null, aiId: null }
          : { humanId: null, humanName: null, aiId: teamBAiId1, aiId2: teamBAiId2 },
        arbiterAiId,
        currentTurn: 'A',
        round: 1,
        maxRounds: typeof maxRounds === 'number' && maxRounds > 0 ? maxRounds : 5,
        messagesThisTurn: 0,
        maxMessagesPerTurn: 3,
        status: 'waiting', // waiting | playing | ended
        verdict: null,
      },
      participants: {
        create: [{ userId: user.id, role: 'host' }],
      },
    },
  })

  return NextResponse.json({ room, code })
}

// GET /api/2v2?code=AIG-X7K2 — info room per join
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const code = req.nextUrl.searchParams.get('code')?.toUpperCase()
  if (!code) return NextResponse.json({ error: 'Codice mancante' }, { status: 400 })

  const room = await prisma.room.findUnique({
    where: { code },
    include: {
      host: { select: { id: true, name: true } },
      participants: { include: { user: { select: { id: true, name: true } } } },
    },
  })

  if (!room) return NextResponse.json({ error: 'Room non trovata' }, { status: 404 })
  if (room.type !== '2v2') return NextResponse.json({ error: 'Non è una room 2v2' }, { status: 400 })
  if (room.status === 'ended') return NextResponse.json({ error: 'Partita già terminata' }, { status: 410 })

  const gs = room.gameState as any
  const isFull = gs?.teamB?.humanId !== null

  return NextResponse.json({ room, isFull })
}

// PATCH /api/2v2 — join come squadra B
// Body: { code, playerName }
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const { code, playerName, teamBAiId } = await req.json()
  const room = await prisma.room.findUnique({ where: { code: code?.toUpperCase() } })

  if (!room) return NextResponse.json({ error: 'Room non trovata' }, { status: 404 })
  if (room.type !== '2v2') return NextResponse.json({ error: 'Non è una room 2v2' }, { status: 400 })
  if (room.status === 'ended') return NextResponse.json({ error: 'Partita già terminata' }, { status: 410 })
  if (room.hostId === user.id) return NextResponse.json({ error: 'Sei già l\'host' }, { status: 400 })

  const gs = room.gameState as any
  // Partite solo non sono joinabili da utenti esterni
  if (gs?.mode === 'solo') {
    return NextResponse.json({ error: 'Non è una partita multiplayer' }, { status: 400 })
  }
  if (gs?.teamB?.humanId && gs.teamB.humanId !== user.id) {
    return NextResponse.json({ error: 'La squadra B è già occupata' }, { status: 409 })
  }

  // Per mode amico: il guest porta anche il suo AI
  const VALID_AIS = ['claude', 'gemini', 'perplexity', 'gpt']
  const isAmico = gs?.mode === 'amico'
  if (isAmico && (!teamBAiId || !VALID_AIS.includes(teamBAiId))) {
    return NextResponse.json({ error: 'Scegli un AI alleato per la Squadra B' }, { status: 400 })
  }

  // Aggiorna gameState con il giocatore B (e il suo AI se mode amico)
  const bName = playerName || user.name || 'Squadra B'
  const updatedGs = {
    ...gs,
    teamB: {
      ...gs.teamB,
      humanId: user.id,
      humanName: bName,
      ...(isAmico && teamBAiId ? { aiId: teamBAiId } : {}),
    },
    status: 'playing',
  }

  const updated = await prisma.room.update({
    where: { id: room.id },
    data: {
      gameState: updatedGs,
      participants: {
        upsert: {
          where: { roomId_userId: { roomId: room.id, userId: user.id } },
          create: { userId: user.id, role: 'participant' },
          update: {},
        },
      },
    },
  })

  return NextResponse.json({ room: updated })
}
