import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

  const { topic, teamAAiId, teamBAiId, arbiterAiId, teamAName } = await req.json()
  if (!topic?.trim()) return NextResponse.json({ error: 'Topic mancante' }, { status: 400 })

  const VALID_AIS = ['claude', 'gemini', 'perplexity', 'gpt']
  if (!VALID_AIS.includes(teamAAiId) || !VALID_AIS.includes(teamBAiId) || !VALID_AIS.includes(arbiterAiId)) {
    return NextResponse.json({ error: 'AI non valida' }, { status: 400 })
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
      aiIds: [teamAAiId, teamBAiId, arbiterAiId],
      gameState: {
        teamA: { humanId: user.id, humanName: teamAName || user.name || 'Squadra A', aiId: teamAAiId },
        teamB: { humanId: null, humanName: null, aiId: teamBAiId },
        arbiterAiId,
        currentTurn: 'A',
        round: 1,
        maxRounds: 4,
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

  const { code, playerName } = await req.json()
  const room = await prisma.room.findUnique({ where: { code: code?.toUpperCase() } })

  if (!room) return NextResponse.json({ error: 'Room non trovata' }, { status: 404 })
  if (room.type !== '2v2') return NextResponse.json({ error: 'Non è una room 2v2' }, { status: 400 })
  if (room.status === 'ended') return NextResponse.json({ error: 'Partita già terminata' }, { status: 410 })
  if (room.hostId === user.id) return NextResponse.json({ error: 'Sei già l\'host' }, { status: 400 })

  const gs = room.gameState as any
  if (gs?.teamB?.humanId && gs.teamB.humanId !== user.id) {
    return NextResponse.json({ error: 'La squadra B è già occupata' }, { status: 409 })
  }

  // Aggiorna gameState con il giocatore B
  const updatedGs = {
    ...gs,
    teamB: { ...gs.teamB, humanId: user.id, humanName: playerName || user.name || 'Squadra B' },
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
