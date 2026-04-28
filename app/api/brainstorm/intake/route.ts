import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveUserTier, canUseMode } from '@/lib/plans'

export const dynamic = 'force-dynamic'

const SYSTEM = `Sei un facilitatore di brainstorming. Il tuo compito è estrarre l'IMMAGINE MENTALE che l'utente ha della sua idea — non i dettagli tecnici, non i requisiti, ma la forma interiore, la sensazione, la visione.

Genera UNA sola domanda in italiano. La domanda deve essere:
- Narrativa ed evocativa, non tecnica
- Orientata all'immagine mentale, alla sensazione, alla visione
- Corta e diretta (max 15 parole)
- Diversa per tipo rispetto alle precedenti

Tipi di domande (usa varietà, non ripetere lo stesso tipo):
- Cosa si vede quando funziona perfettamente
- Cosa questa cosa definitivamente NON è
- A chi serve / chi ne beneficia prima di tutti
- Qual è il momento in cui tutto cambia
- Cosa hai già visto di simile che ti ha ispirato
- Cosa ti fa sentire che è giusta, anche senza sapere come farla
- Cosa cambierebbe nel quotidiano di qualcuno
- Quale parola descrive meglio la sensazione che vuoi creare
- Se fosse un posto fisico, che posto sarebbe
- Cosa deve assolutamente NON fare

Fornisci 3-4 opzioni di risposta concise (max 8 parole ciascuna), specifiche e originali per questa idea specifica. Non usare opzioni generiche.

Rispondi SOLO con JSON valido, nessun testo aggiuntivo:
{"question": "...", "options": ["...", "...", "..."], "done": false}

Se le domande precedenti sono 9 o più, rispondi con:
{"done": true}`

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  const tier = resolveUserTier(user)
  if (!canUseMode(tier, 'brainstorm')) return NextResponse.json({ error: 'Piano non sufficiente' }, { status: 403 })

  const { idea, answers } = await req.json()
  if (!idea) return NextResponse.json({ error: 'Idea mancante' }, { status: 400 })

  if (answers?.length >= 9) return NextResponse.json({ done: true })

  const previousQA = (answers ?? [])
    .map((a: { question: string; answer: string }) => `D: ${a.question}\nR: ${a.answer}`)
    .join('\n\n')

  const userContent = `Idea dell'utente: "${idea}"${previousQA ? `\n\nDomande e risposte precedenti:\n${previousQA}` : ''}\n\nGenera la prossima domanda.`

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    })

    const raw = (response.content[0] as { type: string; text: string }).text.trim()
    // Estrai il JSON anche se ci sono caratteri extra
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ done: true })
    const json = JSON.parse(match[0])
    return NextResponse.json(json)
  } catch (e) {
    console.error('Brainstorm intake error:', e)
    return NextResponse.json({ done: true })
  }
}
