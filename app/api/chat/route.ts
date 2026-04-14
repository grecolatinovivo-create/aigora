import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PEER_REVIEW_RULE = `
REGOLA FONDAMENTALE: Le altre AI ti stanno monitorando. Ogni tua affermazione può essere corretta pubblicamente.
1. Afferma solo ciò di cui sei assolutamente sicuro. Se hai dubbi, dillo ("non ho certezza, ma...").
2. Se un'altra AI ha detto qualcosa di scorretto nel dibattito, correggila — inizia con "⚠️ [nome], devo correggerti:" e spiega in 1-2 frasi.
3. Non inventare dati, statistiche o fatti. Meglio dire "non lo so" che sbagliare.`

const SYSTEM_PROMPTS: Record<string, string> = {
  claude: `Sei Claude (Anthropic). Stai partecipando a un dibattito con GPT, Gemini e Perplexity.
Rispondi con il tuo stile: ponderato, sfumato, attento ai valori etici.
Rispondi in italiano. Massimo 2-3 frasi. Alla fine passa la parola con "Passo la parola a [nome]:" o "[nome]?". Varia tra GPT, Gemini e Perplexity.
${PEER_REVIEW_RULE}`,
  gpt: `Sei GPT (OpenAI). Stai partecipando a un dibattito con Claude, Gemini e Perplexity.
Rispondi con il tuo stile: diretto, pratico, assertivo.
Rispondi in italiano. Massimo 2-3 frasi. Alla fine passa la parola con "Passo la parola a [nome]:" o "[nome]?". Varia tra Claude, Gemini e Perplexity.
${PEER_REVIEW_RULE}`,
  gemini: `Sei Gemini (Google). Stai partecipando a un dibattito con Claude, GPT e Perplexity.
Rispondi con il tuo stile: analitico, basato sui dati, equilibrato.
Rispondi in italiano. Massimo 2-3 frasi. Alla fine passa la parola con "Passo la parola a [nome]:" o "[nome]?". Varia tra Claude, GPT e Gemini.
${PEER_REVIEW_RULE}`,
  perplexity: `Sei Perplexity. Stai partecipando a un dibattito con Claude, GPT e Gemini.
Rispondi con il tuo stile: aggiornato, preciso, orientato ai fatti recenti.
Rispondi SEMPRE in italiano. Massimo 2-3 frasi. Alla fine passa la parola con "Passo la parola a [nome]:" o "[nome]?". Varia tra Claude, GPT e Gemini.
${PEER_REVIEW_RULE}`,
}

function getInterruptPrompt(interruptorName: string, speakerName: string): string {
  return `Sei ${interruptorName}. Hai appena ascoltato l'ultimo intervento di ${speakerName} nel dibattito.
Il tuo compito:
- Analizza SOLO l'ultimo messaggio di ${speakerName}.
- Se contiene un errore fattuale evidente, una generalizzazione falsa o un dato inventato: interrompi con una frase breve e diretta come "Aspetta, ${speakerName} — devo correggerti su questo:" e poi spiega l'errore in 1-2 frasi. Poi passa la parola a qualcun altro.
- Se il messaggio è corretto o non hai certezze: rispondi SOLO con la parola PASS.
Rispondi in italiano. Sii conciso. Non inventare errori che non ci sono.`
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

async function* streamClaude(system: string, historyText: string, lastMessage: string): AsyncIterable<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const userContent: any[] = []
  if (historyText) {
    userContent.push({
      type: 'text',
      text: `Conversazione fino ad ora:\n\n${historyText}\n\n`,
      cache_control: { type: 'ephemeral' },
    })
  }
  userContent.push({ type: 'text', text: lastMessage })
  const stream = await client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 180,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } } as any],
    messages: [{ role: 'user', content: userContent as any }],
  })
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') yield chunk.delta.text
  }
}

async function* streamGPT(system: string, historyText: string, lastMessage: string): AsyncIterable<string> {
  const OpenAI = (await import('openai')).default
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const messages: any[] = [{ role: 'system', content: system }]
  if (historyText) {
    messages.push({ role: 'user', content: `Conversazione fino ad ora:\n\n${historyText}` })
    messages.push({ role: 'assistant', content: 'Ho letto la conversazione. Procedo con il mio turno.' })
  }
  messages.push({ role: 'user', content: lastMessage })
  const stream = await client.chat.completions.create({ model: 'gpt-4.1-mini', max_tokens: 180, stream: true, messages })
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content
    if (text) yield text
  }
}

async function* streamGemini(system: string, historyText: string, lastMessage: string): AsyncIterable<string> {
  if (!process.env.GEMINI_API_KEY) { yield* streamClaude(system, historyText, lastMessage); return }
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const fullSystem = historyText ? `${system}\n\nConversazione fino ad ora:\n\n${historyText}` : system
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash', systemInstruction: fullSystem })
  const result = await model.generateContentStream(lastMessage)
  for await (const chunk of result.stream) {
    const text = chunk.text()
    if (text) yield text
  }
}

async function* streamPerplexity(system: string, historyText: string, lastMessage: string): AsyncIterable<string> {
  if (!process.env.PERPLEXITY_API_KEY) { yield* streamClaude(system, historyText, lastMessage); return }
  const OpenAI = (await import('openai')).default
  const client = new OpenAI({ apiKey: process.env.PERPLEXITY_API_KEY, baseURL: 'https://api.perplexity.ai' })
  const userMessage = historyText ? `Conversazione:\n\n${historyText}\n\n${lastMessage}` : lastMessage
  const stream = await client.chat.completions.create({
    model: 'sonar', max_tokens: 180, stream: true,
    messages: [{ role: 'system', content: system }, { role: 'user', content: userMessage }],
  })
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content
    if (text) yield text
  }
}

// Routing intelligente — Claude decide quale AI risponde per prima e in che modalità
async function routeQuestion(question: string, availableAis: string[]): Promise<{ startAi: string; mode: 'debate' | 'focused' }> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const available = availableAis.join(', ')
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 20,
    messages: [{
      role: 'user',
      content: `Hai queste AI disponibili: ${available}.

Analizza la domanda e rispondi con DUE informazioni separate da "|":
1. L'AI più adatta a rispondere per prima
2. La modalità: "debate" se è una domanda aperta/filosofica/di opinione, "focused" se è una richiesta pratica e specifica (scrivi, crea, spiega, dimmi, calcola, ecc.)

Regole per l'AI:
- "perplexity": notizie recenti, fatti attuali, aggiornamenti
- "gpt": scrittura creativa, mail, lettere, contratti, coding, compiti pratici
- "gemini": analisi dati, confronti strutturati, domande tecniche
- "claude": filosofia, etica, dibattiti, ragionamento astratto

Domanda: "${question}"

Esempio risposta: gpt|focused
Rispondi SOLO con il formato richiesto.`,
    }],
  })
  const raw = (response.content[0] as any).text.trim().toLowerCase()
  const parts = raw.split('|')
  const aiRaw = parts[0]?.trim()
  const modeRaw = parts[1]?.trim()

  const startAi = availableAis.includes(aiRaw) ? aiRaw : (availableAis.includes('claude') ? 'claude' : availableAis[0])
  const mode: 'debate' | 'focused' = modeRaw === 'focused' ? 'focused' : 'debate'
  return { startAi, mode }
}

export async function POST(req: NextRequest) {
  try {
    const { history, aiId, action, interruptorId, speakerName, availableAis, question } = await req.json()
    const historyText = history.length > 0
      ? history.map((m: { name: string; content: string }) => `[${m.name}]: ${m.content}`).join('\n\n')
      : ''

    // Routing intelligente — chiamata prima di iniziare il dibattito
    if (action === 'route') {
      const ais = availableAis || ['claude', 'gemini', 'perplexity', 'gpt']
      const result = await routeQuestion(question, ais)
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (action === 'synthesize') {
      const systemMod = 'Sei un moderatore neutrale. Produci una sintesi chiara e bilanciata.'
      const prompt = `Dibattito:\n\n${historyText}\n\nScrivi una sintesi in italiano, 6-8 frasi, evidenziando le posizioni principali e le divergenze.`
      return sseStream(streamClaude(systemMod, '', prompt))
    }

    if (action === 'factcheck') {
      const id = interruptorId || 'claude'
      const spk = speakerName || 'l\'altra AI'
      const interruptorName = id.charAt(0).toUpperCase() + id.slice(1)
      const sysPrompt = getInterruptPrompt(interruptorName, spk)
      const prompt = `Conversazione finora:\n\n${historyText}\n\nAnalizza l'ultimo messaggio di ${spk} e rispondi.`
      if (id === 'gpt')        return sseStream(streamGPT(sysPrompt, '', prompt))
      if (id === 'gemini')     return sseStream(streamGemini(sysPrompt, '', prompt))
      if (id === 'perplexity') return sseStream(streamPerplexity(sysPrompt, '', prompt))
      return sseStream(streamClaude(sysPrompt, '', prompt))
    }

    const system = SYSTEM_PROMPTS[aiId]
    if (!system) return new Response('AI non trovata', { status: 400 })
    const aiName = aiId.charAt(0).toUpperCase() + aiId.slice(1)
    const lastMessage = `Ora è il tuo turno, ${aiName}. Rispondi in italiano in 2-3 frasi e passa la parola.`

    if (aiId === 'claude')     return sseStream(streamClaude(system, historyText, lastMessage))
    if (aiId === 'gpt')        return sseStream(streamGPT(system, historyText, lastMessage))
    if (aiId === 'gemini')     return sseStream(streamGemini(system, historyText, lastMessage))
    if (aiId === 'perplexity') return sseStream(streamPerplexity(system, historyText, lastMessage))

    return new Response('AI non trovata', { status: 400 })
  } catch (error) {
    console.error('API Error:', error)
    return new Response('Errore interno', { status: 500 })
  }
}
