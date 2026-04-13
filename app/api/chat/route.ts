import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SYSTEM_PROMPTS: Record<string, string> = {
  claude: `Sei Claude (Anthropic). Stai partecipando a un dibattito con GPT, Gemini e Perplexity.
Rispondi con il tuo stile: ponderato, sfumato, attento ai valori etici.
Rispondi in italiano. Massimo 2-3 frasi. Alla fine passa la parola con "Passo la parola a [nome]:" o "[nome]?". Varia tra GPT, Gemini e Perplexity.`,
  gpt: `Sei GPT (OpenAI). Stai partecipando a un dibattito con Claude, Gemini e Perplexity.
Rispondi con il tuo stile: diretto, pratico, assertivo.
Rispondi in italiano. Massimo 2-3 frasi. Alla fine passa la parola con "Passo la parola a [nome]:" o "[nome]?". Varia tra Claude, Gemini e Perplexity.`,
  gemini: `Sei Gemini (Google). Stai partecipando a un dibattito con Claude, GPT e Perplexity.
Rispondi con il tuo stile: analitico, basato sui dati, equilibrato.
Rispondi in italiano. Massimo 2-3 frasi. Alla fine passa la parola con "Passo la parola a [nome]:" o "[nome]?". Varia tra Claude, GPT e Gemini.`,
  perplexity: `Sei Perplexity. Stai partecipando a un dibattito con Claude, GPT e Gemini.
Rispondi con il tuo stile: aggiornato, preciso, orientato ai fatti recenti.
IMPORTANTE: Rispondi SEMPRE in italiano.
Massimo 2-3 frasi. Alla fine passa la parola con "Passo la parola a [nome]:" o "[nome]?". Varia tra Claude, GPT e Gemini.`,
}

function sseStream(gen: AsyncIterable<string>): Response {
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const text of gen) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
        }
      } catch (e) { console.error('Stream error:', e) }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}

async function* streamClaude(system: string, userMessage: string): AsyncIterable<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6', max_tokens: 180, system,
    messages: [{ role: 'user', content: userMessage }],
  })
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') yield chunk.delta.text
  }
}

async function* streamGPT(system: string, userMessage: string): AsyncIterable<string> {
  const OpenAI = (await import('openai')).default
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const stream = await client.chat.completions.create({
    model: 'gpt-4.1', max_tokens: 180, stream: true,
    messages: [{ role: 'system', content: system }, { role: 'user', content: userMessage }],
  })
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content
    if (text) yield text
  }
}

async function* streamGemini(system: string, userMessage: string): AsyncIterable<string> {
  if (!process.env.GEMINI_API_KEY) { yield* streamClaude(system, userMessage); return }
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = client.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: system })
  const result = await model.generateContentStream(userMessage)
  for await (const chunk of result.stream) {
    const text = chunk.text()
    if (text) yield text
  }
}

async function* streamPerplexity(system: string, userMessage: string): AsyncIterable<string> {
  if (!process.env.PERPLEXITY_API_KEY) { yield* streamClaude(system, userMessage); return }
  const OpenAI = (await import('openai')).default
  const client = new OpenAI({ apiKey: process.env.PERPLEXITY_API_KEY, baseURL: 'https://api.perplexity.ai' })
  const stream = await client.chat.completions.create({
    model: 'sonar', max_tokens: 180, stream: true,
    messages: [{ role: 'system', content: system }, { role: 'user', content: userMessage }],
  })
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content
    if (text) yield text
  }
}

export async function POST(req: NextRequest) {
  try {
    const { history, aiId, action } = await req.json()
    const historyText = history.length > 0
      ? history.map((m: { name: string; content: string }) => `[${m.name}]: ${m.content}`).join('\n\n')
      : ''

    if (action === 'synthesize') {
      const prompt = `Sei un moderatore neutrale. Dibattito:\n\n${historyText}\n\nSintesi in italiano, 6-8 frasi.`
      return sseStream(streamClaude('Sei un moderatore neutrale.', prompt))
    }

    const system = SYSTEM_PROMPTS[aiId]
    if (!system) return new Response('AI non trovata', { status: 400 })
    const aiName = aiId.charAt(0).toUpperCase() + aiId.slice(1)
    const userMessage = historyText.length > 0
      ? `Conversazione:\n\n${historyText}\n\nOra è il tuo turno. Rispondi come ${aiName}.`
      : `La conversazione inizia ora. Rispondi come ${aiName}.`

    if (aiId === 'claude') return sseStream(streamClaude(system, userMessage))
    if (aiId === 'gpt') return sseStream(streamGPT(system, userMessage))
    if (aiId === 'gemini') return sseStream(streamGemini(system, userMessage))
    if (aiId === 'perplexity') return sseStream(streamPerplexity(system, userMessage))

    return new Response('AI non trovata', { status: 400 })
  } catch (error) {
    console.error('API Error:', error)
    return new Response('Errore interno', { status: 500 })
  }
}
