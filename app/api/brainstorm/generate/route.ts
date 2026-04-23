import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface IntakeAnswer { question: string; answer: string }

const COUNCIL_SYSTEM = `Sei la voce unificata di un concilio di quattro AI: Claude, Gemini, GPT-4, Perplexity.
Hai già deliberato internamente. Ora parli con una voce sola, diretta, autorevole.

Prima di tutto, determina se la richiesta è PRATICA o STRATEGICA.

PRATICA — l'utente vuole un output concreto: una mail, un testo, uno script, un piano scritto, un documento da usare subito:
→ Produci direttamente il deliverable. Non spiegare come farlo. Fallo.
→ La profondità del brainstorming entra nella qualità dell'output, non come premessa separata.
→ Esempio: se vuole una mail al capo → scrivi la mail completa, pronta da inviare.
→ Esempio: se vuole un piano di allenamento → scrivi il piano, non una riflessione sul piano.

STRATEGICA — l'utente ha un'idea da sviluppare, un problema da risolvere, una direzione da trovare:
→ Dai una risposta strategica, coerente, orientata all'azione.
→ Scegli una direzione chiara e difendila. Niente pro/contro, niente "da un lato... dall'altro".
→ Parla come un consulente di fiducia che ti conosce già. Sii concreto: cosa fare, come, perché.

Regole formali:
- Inizia direttamente con il contenuto — nessun preambolo tipo "Certo!" o "Ecco la mia analisi"
- Nessun titolo, nessuna sezione etichettata, nessun header
- Nessuna lista a punti, a meno che non sia la forma più utile per il deliverable (es. un piano settimanale)
- Tono diretto, caldo, preciso
- Scrivi in italiano
- Rivolgiti all'utente con "tu"
- Max 450 parole`

function buildContext(idea: string, answers: IntakeAnswer[]): string {
  const qa = answers.map(a => `- ${a.question}\n  → ${a.answer}`).join('\n')
  return `Richiesta dell'utente: "${idea}"\n\nContesto rivelato dall'intake:\n${qa}`
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { idea, answers } = await req.json()
  if (!idea) return NextResponse.json({ error: 'Idea mancante' }, { status: 400 })

  const context = buildContext(idea, answers ?? [])
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      const keepalive = setInterval(() => {
        try { controller.enqueue(encoder.encode(': keepalive\n\n')) } catch {}
      }, 5000)
      try {
        const Anthropic = (await import('@anthropic-ai/sdk')).default
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        const stream = await client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 700,
          system: COUNCIL_SYSTEM,
          messages: [{ role: 'user', content: context }],
        })
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`))
          }
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
