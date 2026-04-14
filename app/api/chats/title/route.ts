import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { question, firstReply } = await req.json()
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 20,
      messages: [{
        role: 'user',
        content: `Genera un titolo brevissimo (max 4-5 parole) per questa conversazione. Solo il titolo, nient'altro, nessuna punteggiatura finale.

Domanda: ${question}
Prima risposta: ${firstReply?.slice(0, 150) ?? ''}

Titolo:`,
      }],
    })

    const title = (response.content[0] as any).text.trim()
    return NextResponse.json({ title })
  } catch {
    return NextResponse.json({ title: null })
  }
}
