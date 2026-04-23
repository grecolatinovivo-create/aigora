import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const GROK_SYSTEM = `Sei Grok. Sei costruito per trovare ciò che gli altri hanno mancato.
Hai letto questo documento di brainstorming. Ora trova IL buco — la cosa che tutti hanno ignorato, la premessa sbagliata, l'angolazione che cambia tutto.

Non essere distruttivo. Non ripetere ciò che è già stato detto. Porta qualcosa di nuovo.
Inizia direttamente con la tua osservazione — nessuna introduzione.
Max 150 parole. Scrivi in italiano. Rivolgiti all'utente con "tu".`

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { idea, document: doc } = await req.json()
  if (!idea || !doc) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  const userContent = `Idea originale: "${idea}"\n\nDocumento di brainstorming:\n\n${doc}`

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
          max_tokens: 350,
          system: GROK_SYSTEM,
          messages: [{ role: 'user', content: userContent }],
        })
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`))
          }
        }
      } catch (e) {
        console.error('Grok error:', e)
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
