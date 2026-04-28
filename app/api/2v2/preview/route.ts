import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/2v2/preview?code=AIG-XXXX
// Endpoint pubblico — restituisce solo i dati di preview (topic, squadre) senza richiedere auth.
// Usato dalla join page per mostrare il match prima della registrazione.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.toUpperCase()
  if (!code) return NextResponse.json({ error: 'Codice mancante' }, { status: 400 })

  const room = await prisma.room.findUnique({
    where: { code },
    select: {
      id: true,
      topic: true,
      status: true,
      type: true,
      gameState: true,
      host: { select: { name: true } },
    },
  })

  if (!room) return NextResponse.json({ error: 'Room non trovata' }, { status: 404 })
  if (room.type !== '2v2') return NextResponse.json({ error: 'Non è una room 2v2' }, { status: 400 })
  if (room.status === 'ended') return NextResponse.json({ error: 'Partita già terminata' }, { status: 410 })

  const gs = room.gameState as any
  const isFull = gs?.teamB?.humanId !== null

  return NextResponse.json({
    id: room.id,
    topic: room.topic,
    isFull,
    teamA: {
      humanName: gs?.teamA?.humanName || room.host?.name || 'Squadra A',
      aiId: gs?.teamA?.aiId,
    },
    teamB: {
      aiId: gs?.teamB?.aiId,
    },
    arbiterAiId: gs?.arbiterAiId,
  })
}
