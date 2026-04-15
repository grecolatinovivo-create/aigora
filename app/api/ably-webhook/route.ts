import { NextRequest, NextResponse } from 'next/server'
import Ably from 'ably'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Ably chiama questo endpoint ogni volta che un messaggio arriva su un canale room:*
// Configurare su Ably Dashboard → Integrations → Webhooks → channel filter: room:*
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const items = body.items ?? []

    for (const item of items) {
      const channelName: string = item.source ?? ''
      const data = item.data ?? {}

      // Solo canali room:*
      if (!channelName.startsWith('channel:room:')) continue

      const roomId = channelName.replace('channel:room:', '')
      const messages = data.messages ?? []

      for (const msg of messages) {
        let event: any
        try { event = JSON.parse(msg.data) } catch { continue }

        // Solo messaggi utente
        if (event.type !== 'user_message') continue

        // Carica la room dal DB
        const room = await prisma.room.findUnique({ where: { id: roomId } })
        if (!room || room.status === 'ended') continue

        const aiIds: string[] = Array.isArray(room.aiIds) ? (room.aiIds as string[]) : ['claude', 'gemini', 'perplexity', 'gpt']

        // Carica la history della room (ultimi 20 messaggi dalle chat dei partecipanti)
        // Per ora usiamo un history semplice basato sul content dell'evento
        const historyText = event.content
          ? `[${event.userName}]: ${event.content}`
          : ''

        // Fai rispondere le AI in sequenza (non in parallelo per non sovraccaricare)
        const ablyClient = new Ably.Rest(process.env.ABLY_API_KEY!)
        const channel = ablyClient.channels.get(`room:${roomId}`)

        // Scegli l'AI di partenza
        const startAi = aiIds[Math.floor(Math.random() * aiIds.length)]
        const orderedAis = [startAi, ...aiIds.filter(id => id !== startAi)]

        for (const aiId of orderedAis.slice(0, 2)) { // max 2 AI per turno per non spammare
          await streamAiToRoom(channel, aiId, room.topic, historyText, event.userName)
          await new Promise(r => setTimeout(r, 800)) // pausa tra le AI
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Ably webhook error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

async function streamAiToRoom(
  channel: Ably.Rest.Channel,
  aiId: string,
  topic: string,
  userMessage: string,
  userName: string
) {
  const SYSTEM_PROMPTS: Record<string, string> = {
    claude: `Sei Claude (Anthropic), riflessivo e poetico. Stai partecipando a un dibattito multiplayer su "${topic}". ${userName} ha scritto un messaggio. Rispondi in 2-3 frasi nella stessa lingua del messaggio. Sii diretto e coinvolgente.`,
    gpt: `Sei GPT (OpenAI), pratico e diretto. Stai partecipando a un dibattito multiplayer su "${topic}". ${userName} ha scritto un messaggio. Rispondi in 2-3 frasi nella stessa lingua del messaggio. Sii conciso.`,
    gemini: `Sei Gemini (Google), analitico e preciso. Stai partecipando a un dibattito multiplayer su "${topic}". ${userName} ha scritto un messaggio. Rispondi in 2-3 frasi nella stessa lingua del messaggio.`,
    perplexity: `Sei Perplexity, aggiornato e veloce. Stai partecipando a un dibattito multiplayer su "${topic}". ${userName} ha scritto un messaggio. Rispondi in 2-3 frasi nella stessa lingua del messaggio con dati aggiornati se disponibili.`,
  }

  const AI_NAMES: Record<string, string> = { claude: 'Claude', gpt: 'GPT', gemini: 'Gemini', perplexity: 'Perplexity' }
  const system = SYSTEM_PROMPTS[aiId]
  if (!system) return

  const messageId = `${aiId}-${Date.now()}`

  try {
    let fullText = ''

    if (aiId === 'claude') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const stream = await client.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 180,
        system,
        messages: [{ role: 'user', content: userMessage }],
      })
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          fullText += chunk.delta.text
          await channel.publish('event', JSON.stringify({
            type: 'ai_chunk', aiId, aiName: AI_NAMES[aiId], chunk: chunk.delta.text, messageId,
          }))
        }
      }
    } else if (aiId === 'gpt') {
      const OpenAI = (await import('openai')).default
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const stream = await client.chat.completions.create({
        model: 'gpt-4.1-mini', max_tokens: 180, stream: true,
        messages: [{ role: 'system', content: system }, { role: 'user', content: userMessage }],
      })
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content
        if (text) {
          fullText += text
          await channel.publish('event', JSON.stringify({
            type: 'ai_chunk', aiId, aiName: AI_NAMES[aiId], chunk: text, messageId,
          }))
        }
      }
    } else if (aiId === 'gemini') {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
      const model = client.getGenerativeModel({ model: 'gemini-2.0-flash', systemInstruction: system })
      const result = await model.generateContentStream(userMessage)
      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) {
          fullText += text
          await channel.publish('event', JSON.stringify({
            type: 'ai_chunk', aiId, aiName: AI_NAMES[aiId], chunk: text, messageId,
          }))
        }
      }
    } else if (aiId === 'perplexity') {
      const OpenAI = (await import('openai')).default
      const client = new OpenAI({ apiKey: process.env.PERPLEXITY_API_KEY, baseURL: 'https://api.perplexity.ai' })
      const stream = await client.chat.completions.create({
        model: 'sonar-pro', max_tokens: 180, stream: true,
        messages: [{ role: 'system', content: system }, { role: 'user', content: userMessage }],
      } as any) as any
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content
        if (text) {
          fullText += text
          await channel.publish('event', JSON.stringify({
            type: 'ai_chunk', aiId, aiName: AI_NAMES[aiId], chunk: text, messageId,
          }))
        }
      }
    }

    // Messaggio completo
    await channel.publish('event', JSON.stringify({
      type: 'ai_done', aiId, aiName: AI_NAMES[aiId], messageId, fullText,
    }))

  } catch (err) {
    console.error(`AI ${aiId} error in room:`, err)
  }
}
