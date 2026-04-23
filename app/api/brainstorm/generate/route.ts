import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface IntakeAnswer { question: string; answer: string }

const SECTIONS = [
  {
    id: 'riformulazione',
    title: 'Il tuo problema, riformulato',
    ai: 'claude',
    system: `Sei un facilitatore esperto di idee. Leggi l'idea dell'utente e le sue risposte all'intake.
Riformula l'idea in modo più preciso e onesto — basandoti su ciò che ha realmente detto, non su interpretazioni.
Rivolgiti all'utente con "tu". Tono diretto e caldo. Max 120 parole. Nessun titolo, vai diretto al testo.`,
  },
  {
    id: 'tensione',
    title: 'La tensione al centro',
    ai: 'gemini',
    system: `Sei un analista preciso e freddo. Identifica LA tensione centrale in questa idea — il conflitto irrisolto, il trade-off difficile, la contraddizione che l'utente dovrà affrontare.
Non essere incoraggiante. Non essere negativo. Sii onesto e specifico.
Max 100 parole. Nessun titolo. Scrivi in italiano, rivolgiti all'utente con "tu".`,
  },
  {
    id: 'ostacolo',
    title: 'Cosa potrebbe non funzionare',
    ai: 'gpt',
    system: `Sei pragmatico e diretto. Identifica UNO o DUE ostacoli concreti che questa idea incontrerà nella realtà — non in teoria, ma nella pratica.
Sii specifico: "mancanza di risorse" non vale. Dimmi cosa esattamente.
Max 100 parole. Nessun titolo. Scrivi in italiano, rivolgiti all'utente con "tu".`,
  },
  {
    id: 'evidenze',
    title: 'Cosa dice il mondo reale',
    ai: 'perplexity',
    system: `Sei orientato alla realtà esterna e ai dati. Cosa sa il mondo su idee simili a questa? Ci sono pattern, precedenti, tendenze che l'utente dovrebbe conoscere?
Non inventare statistiche specifiche — ragiona su tendenze e casi analoghi reali che conosci.
Max 120 parole. Nessun titolo. Scrivi in italiano, rivolgiti all'utente con "tu".`,
  },
  {
    id: 'direzione',
    title: 'Una strada concreta',
    ai: 'claude',
    system: `Sei un coach strategico. Proponi UN solo passo concreto — il più utile da fare adesso per portare avanti questa idea.
Non dare una lista. Un passo, quello giusto, spiegato bene.
Max 100 parole. Nessun titolo. Scrivi in italiano, rivolgiti all'utente con "tu".`,
  },
]

function buildContext(idea: string, answers: IntakeAnswer[]): string {
  const qa = answers.map(a => `- ${a.question}\n  → ${a.answer}`).join('\n')
  return `Idea dell'utente: "${idea}"\n\nImmagine mentale rivelata dall'intake:\n${qa}`
}

async function* streamSection(system: string, context: string): AsyncIterable<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const stream = await client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system,
    messages: [{ role: 'user', content: context }],
  })
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      yield chunk.delta.text
    }
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { idea, answers, regenerate } = await req.json()
  if (!idea) return NextResponse.json({ error: 'Idea mancante' }, { status: 400 })

  const context = buildContext(idea, answers ?? [])
  const sectionsToGenerate = regenerate
    ? SECTIONS.filter(s => s.id === regenerate)
    : SECTIONS

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) } catch {}
      }
      const keepalive = setInterval(() => {
        try { controller.enqueue(encoder.encode(': keepalive\n\n')) } catch {}
      }, 5000)

      try {
        for (const section of sectionsToGenerate) {
          send({ type: 'section_start', id: section.id, title: section.title, ai: section.ai })
          for await (const text of streamSection(section.system, context)) {
            send({ type: 'chunk', id: section.id, text })
          }
          send({ type: 'section_end', id: section.id })
        }
      } catch (e) {
        console.error('Generate error:', e)
      } finally {
        clearInterval(keepalive)
        try {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch {}
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
