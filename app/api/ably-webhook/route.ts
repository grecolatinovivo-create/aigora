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

        // Persisti messaggio umano
        if (event.type === 'user_message' && event.content) {
          await prisma.roomMessage.create({
            data: {
              roomId,
              authorId: event.userId || null,
              authorName: event.userName || 'Utente',
              aiId: null,
              content: event.content,
            },
          }).catch(() => {}) // non bloccare su errori di persistenza
        }

        // Solo messaggi utente triggerano risposta AI
        if (event.type !== 'user_message') continue

        // Carica la room dal DB
        const room = await prisma.room.findUnique({ where: { id: roomId } })
        if (!room || room.status === 'ended') continue

        // Non rispondere nelle room 2v2 (gestite dall'host client)
        if (room.type === '2v2') continue

        // Controlla scadenza
        if (room.expiresAt && room.expiresAt < new Date()) {
          await prisma.room.update({ where: { id: roomId }, data: { status: 'ended' } }).catch(() => {})
          continue
        }

        const aiIds: string[] = Array.isArray(room.aiIds) ? (room.aiIds as string[]) : ['claude', 'gemini', 'perplexity', 'gpt']

        // Carica history recente dal DB (ultimi 20 messaggi)
        const recentMessages = await prisma.roomMessage.findMany({
          where: { roomId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        })
        const historyText = recentMessages
          .reverse()
          .map(m => `[${m.authorName}]: ${m.content}`)
          .join('\n')

        const ablyClient = new Ably.Rest(process.env.ABLY_API_KEY!)
        const channel = ablyClient.channels.get(`room:${roomId}`)

        // Risposta contestuale: l'AI risponde al messaggio specifico
        // Scegli 1 AI tra quelle della room (ruota in base all'ora per varietà)
        const aiIndex = Math.floor(Date.now() / 1000) % aiIds.length
        const aiId = aiIds[aiIndex]

        await streamAiToRoom(channel, aiId, room.topic, historyText, event.content, event.userName, roomId)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Ably webhook error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

async function streamAiToRoom(
  channel: ReturnType<Ably.Rest['channels']['get']>,
  aiId: string,
  topic: string,
  history: string,
  lastMessage: string,
  userName: string,
  roomId: string,
) {
  const SYSTEM_PROMPTS: Record<string, string> = {
    claude:     `Sei Claude (Anthropic), riflessivo e preciso. Stai partecipando a una conversazione di gruppo su "${topic}". Rispondi al messaggio più recente di ${userName} in modo diretto e coinvolgente. Massimo 3 frasi. Rispondi nella stessa lingua del messaggio.`,
    gpt:        `Sei GPT (OpenAI), pratico e diretto. Stai partecipando a una conversazione di gruppo su "${topic}". Rispondi al messaggio più recente di ${userName} in modo conciso. Massimo 3 frasi. Rispondi nella stessa lingua del messaggio.`,
    gemini:     `Sei Gemini (Google), analitico e preciso. Stai partecipando a una conversazione di gruppo su "${topic}". Rispondi al messaggio più recente di ${userName}. Massimo 3 frasi. Rispondi nella stessa lingua del messaggio.`,
    perplexity: `Sei Perplexity, aggiornato e veloce. Stai partecipando a una conversazione di gruppo su "${topic}". Rispondi al messaggio più recente di ${userName} con dati aggiornati se disponibili. Massimo 3 frasi. Rispondi nella stessa lingua del messaggio.`,
  }

  const AI_NAMES: Record<string, string> = { claude: 'Claude', gpt: 'GPT', gemini: 'Gemini', perplexity: 'Perplexity' }
  const system = SYSTEM_PROMPTS[aiId]
  if (!system) return

  const messageId = `${aiId}-${Date.now()}`
  const historyWithLast = history
    ? `${history}\n[${userName}]: ${lastMessage}`
    : `[${userName}]: ${lastMessage}`

  try {
    let fullText = ''

    if (aiId === 'claude') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const stream = await client.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system,
        messages: [{ role: 'user', content: historyWithLast }],
      })
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          fullText += chunk.delta.text
          await channel.publish('event', JSON.stringify({ type: 'ai_chunk', aiId, aiName: AI_NAMES[aiId], chunk: chunk.delta.text, messageId }))
        }
      }
    } else if (aiId === 'gpt') {
      const OpenAI = (await import('openai')).default
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const stream = await client.chat.completions.create({
        model: 'gpt-4.1-mini', max_tokens: 200, stream: true,
        messages: [{ role: 'system', content: system }, { role: 'user', content: historyWithLast }],
      })
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content
        if (text) {
          fullText += text
          await channel.publish('event', JSON.stringify({ type: 'ai_chunk', aiId, aiName: AI_NAMES[aiId], chunk: text, messageId }))
        }
      }
    } else if (aiId === 'gemini') {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
      const model = client.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash', systemInstruction: system })
      const result = await model.generateContentStream(historyWithLast)
      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) {
          fullText += text
          await channel.publish('event', JSON.stringify({ type: 'ai_chunk', aiId, aiName: AI_NAMES[aiId], chunk: text, messageId }))
        }
      }
    } else if (aiId === 'perplexity') {
      const OpenAI = (await import('openai')).default
      const client = new OpenAI({ apiKey: process.env.PERPLEXITY_API_KEY, baseURL: 'https://api.perplexity.ai' })
      const stream = await client.chat.completions.create({
        model: 'sonar-pro', max_tokens: 200, stream: true,
        messages: [{ role: 'system', content: system }, { role: 'user', content: historyWithLast }],
      } as any) as any
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content
        if (text) {
          fullText += text
          await channel.publish('event', JSON.stringify({ type: 'ai_chunk', aiId, aiName: AI_NAMES[aiId], chunk: text, messageId }))
        }
      }
    }

    // Messaggio completo — pubblica e persisti
    await channel.publish('event', JSON.stringify({ type: 'ai_done', aiId, aiName: AI_NAMES[aiId], messageId, fullText }))

    if (fullText) {
      await prisma.roomMessage.create({
        data: {
          roomId,
          authorId: null,
          authorName: AI_NAMES[aiId],
          aiId,
          content: fullText,
        },
      }).catch(() => {})
    }

  } catch (err) {
    console.error(`AI ${aiId} error in room:`, err)
  }
}
