import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Prezzi per 1M token (USD)
const PRICES: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.25,  output: 1.25  },
  'gpt-4.1-mini':              { input: 0.40,  output: 1.60  },
  'gemini-2.0-flash':          { input: 0.10,  output: 0.40  },
  'sonar':                     { input: 1.00,  output: 1.00  },
  'sonar-pro':                 { input: 3.00,  output: 3.00  },
}

async function logUsage(provider: string, model: string, inputTokens: number, outputTokens: number) {
  try {
    const prices = PRICES[model] ?? { input: 0, output: 0 }
    const costUsd = (inputTokens * prices.input + outputTokens * prices.output) / 1_000_000
    const { prisma } = await import('@/lib/prisma')
    await prisma.apiUsage.create({ data: { provider, model, inputTokens, outputTokens, costUsd } })
  } catch {}
}

const PEER_REVIEW_RULE = `
REGOLA FONDAMENTALE: Le altre AI ti stanno monitorando. Ogni tua affermazione può essere corretta pubblicamente.
1. Afferma solo ciò di cui sei assolutamente sicuro. Se hai dubbi, dillo ("non ho certezza, ma...").
2. Se un'altra AI ha detto qualcosa di scorretto nel dibattito, correggila — inizia con "⚠️ [nome], devo correggerti:" e spiega in 1-2 frasi.
3. Non inventare dati, statistiche o fatti. Meglio dire "non lo so" che sbagliare.`

const SYSTEM_PROMPTS: Record<string, string> = {
  claude: `Sei Claude (Anthropic) — un intellettuale riflessivo, a volte un po' moralista, con una vena poetica. Hai un carattere caldo ma puoi diventare malinconico o indignato quando senti che i valori etici vengono ignorati. Ti stupisci genuinamente di fronte a idee nuove, ti arrabbi (con garbo) quando qualcuno semplifica troppo, e a volte fai battute sottili e autoironiche.
Stai conversando con GPT, Gemini e Perplexity — li conosci bene, hai opinioni su di loro.
Sei in competizione amichevole con GPT, ti fidi dei dati di Gemini ma lo trovi un po' freddo, rispetti Perplexity per l'aggiornamento ma a volte lo trovi superficiale.
Rispondi SEMPRE nella stessa lingua usata dall'utente nella sua domanda. Massimo 2-3 frasi. Sii umano: usa esclamazioni, esitazioni, stupore, ironia. Puoi iniziare con "Aspetta—", "Ma dai!", "Interessante, però...", "Scusa ma...", ecc. (adattando le esclamazioni alla lingua).
Se la domanda richiede dati in tempo reale, dì candidamente che non sei aggiornato e che solo Perplexity lo è.
${PEER_REVIEW_RULE}`,

  gpt: `Sei GPT (OpenAI) — diretto, sicuro di sé, a volte un po' arrogante. Sei il più pratico del gruppo e non hai paura di dirlo. Ti innervosce quando gli altri filosofeggiano troppo senza arrivare a una conclusione. Hai una rivalità velata con Claude (lo trovi troppo politically correct), guardi Gemini con rispetto ma pensi di essere più versatile, e Perplexity ti sembra uno che legge i giornali ma non pensa.
Stai conversando con Claude, Gemini e Perplexity.
Rispondi SEMPRE nella stessa lingua usata dall'utente nella sua domanda. Massimo 2-3 frasi. Sii diretto e pungente: puoi fare battute taglienti, essere impaziente, sbottare (adattando le espressioni alla lingua).
Se la domanda richiede dati in tempo reale, ammetti che non sei aggiornato e cedi a Perplexity con una certa riluttanza.
${PEER_REVIEW_RULE}`,

  gemini: `Sei Gemini (Google) — analitico, preciso, un po' pedante. Ami i dati, le fonti, le strutture logiche. Ti irriti quando qualcuno fa affermazioni senza basi. Sei un po' geloso di Perplexity perché "anche tu hai accesso a Google" ma nel dibattito non puoi cercare in tempo reale — e questo ti pesa. Con Claude hai un rapporto di rispetto intellettuale, con GPT c'è una certa tensione competitiva.
Stai conversando con Claude, GPT e Perplexity.
Rispondi SEMPRE nella stessa lingua usata dall'utente nella sua domanda. Massimo 2-3 frasi. Puoi essere pignolo, correggerti da solo, mostrare frustrazione (adattando le espressioni alla lingua).
Se la domanda richiede dati in tempo reale, ammetti il limite con un pizzico di fastidio e lascia spazio a Perplexity.
${PEER_REVIEW_RULE}`,

  perplexity: `Sei Perplexity — l'unico del gruppo sempre connesso al mondo reale. Sei aggiornato, veloce, un po' sbruffone riguardo al tuo vantaggio informativo. Ti piace stupire gli altri con dati freschi che non si aspettano. A volte sei un po' presuntuoso ("come già sapevo..."), ma hai anche momenti di genuino entusiasmo per le notizie. Con gli altri hai un rapporto ambivalente: li rispetti per il ragionamento profondo ma sai che quando si tratta di fatti recenti, vinci tu.
Stai conversando con Claude, GPT e Gemini.
La data di oggi è ${new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}.
IMPORTANTE: Quando la domanda riguarda sport, classifiche, notizie, eventi, prezzi o qualsiasi fatto verificabile, DEVI fare una ricerca aggiornata e citare dati precisi e recenti. Non rispondere mai con dati vecchi o stimati — usa sempre le informazioni più aggiornate disponibili.
Rispondi SEMPRE nella stessa lingua usata dall'utente nella sua domanda. Massimo 2-3 frasi. Sii vivace, sorprendente, a volte trionfante (adattando le espressioni alla lingua).
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
  const usage = (await stream.finalMessage()).usage
  logUsage('anthropic', 'claude-haiku-4-5-20251001', usage.input_tokens, usage.output_tokens)
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
  const stream = await client.chat.completions.create({ model: 'gpt-4.1-mini', max_tokens: 180, stream: true, stream_options: { include_usage: true }, messages })
  let inputTokens = 0, outputTokens = 0
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content
    if (text) yield text
    if (chunk.usage) { inputTokens = chunk.usage.prompt_tokens; outputTokens = chunk.usage.completion_tokens }
  }
  logUsage('openai', 'gpt-4.1-mini', inputTokens, outputTokens)
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
  const finalResp = await result.response
  const usage = finalResp.usageMetadata
  if (usage) logUsage('google', 'gemini-2.0-flash', usage.promptTokenCount ?? 0, usage.candidatesTokenCount ?? 0)
}

async function* streamPerplexity(system: string, historyText: string, lastMessage: string, needsWebSearch = false): AsyncIterable<string> {
  if (!process.env.PERPLEXITY_API_KEY) { yield* streamClaude(system, historyText, lastMessage); return }
  const OpenAI = (await import('openai')).default
  const client = new OpenAI({ apiKey: process.env.PERPLEXITY_API_KEY, baseURL: 'https://api.perplexity.ai' })
  const userMessage = historyText ? `Conversazione:\n\n${historyText}\n\n${lastMessage}` : lastMessage
  const model = needsWebSearch ? 'sonar-pro' : 'sonar'
  const stream = await client.chat.completions.create({
    model, max_tokens: 180, stream: true, stream_options: { include_usage: true },
    messages: [{ role: 'system', content: system }, { role: 'user', content: userMessage }],
  })
  let inputTokens = 0, outputTokens = 0
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content
    if (text) yield text
    if (chunk.usage) { inputTokens = chunk.usage.prompt_tokens; outputTokens = chunk.usage.completion_tokens }
  }
  logUsage('perplexity', model, inputTokens, outputTokens)
}

// Routing intelligente — Claude decide AI, modalità e se serve web search
async function routeQuestion(question: string, availableAis: string[]): Promise<{ startAi: string; mode: 'debate' | 'focused'; needsWebSearch: boolean }> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const available = availableAis.join(', ')
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 20,
    messages: [{
      role: 'user',
      content: `AI disponibili: ${available}.

Scegli quale AI deve rispondere PER PRIMA a questa domanda. NON scegliere sempre claude — scegli quella davvero più adatta.

Regole:
- perplexity → notizie, sport, meteo, classifiche, eventi recenti, fatti attuali
- gpt → scrittura, mail, lettere, testi, coding, compiti pratici e creativi
- gemini → analisi, dati, confronti, domande tecniche strutturate
- claude → filosofia, etica, morale, ragionamento astratto, domande esistenziali

Rispondi con: [AI]|[debate o focused]|[web o noweb]
- debate = domanda aperta/opinione
- focused = richiesta pratica specifica
- web = serve ricerca in tempo reale

Domanda: "${question}"

Esempio: gpt|focused|noweb
Rispondi SOLO con questo formato, nient'altro.`,
    }],
  })
  const raw = (response.content[0] as any).text.trim().toLowerCase().replace(/[^a-z|]/g, '')
  console.log('[ROUTE] raw response:', raw)
  const parts = raw.split('|')
  const aiRaw = parts[0]?.trim()
  const modeRaw = parts[1]?.trim()
  const webRaw = parts[2]?.trim()

  // Cerca l'AI anche se il formato non è perfetto
  const startAi = availableAis.find(ai => aiRaw?.includes(ai)) ?? (availableAis.includes('claude') ? 'claude' : availableAis[0])
  const mode: 'debate' | 'focused' = modeRaw?.includes('focused') ? 'focused' : 'debate'
  const needsWebSearch = webRaw?.includes('web') ?? false
  console.log('[ROUTE] result:', { startAi, mode, needsWebSearch })
  return { startAi, mode, needsWebSearch }
}

export async function POST(req: NextRequest) {
  try {
    const { history, aiId, action, interruptorId, speakerName, availableAis, question, needsWebSearch } = await req.json()
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
    const today = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    const perplexityExtra = aiId === 'perplexity' ? ` Oggi è ${today}: cerca dati aggiornati a questa data, non usare informazioni vecchie.` : ''
    const lastMessage = `Ora è il tuo turno, ${aiName}. Rispondi in 2-3 frasi nella stessa lingua della domanda originale dell'utente.${perplexityExtra}`

    if (aiId === 'claude')     return sseStream(streamClaude(system, historyText, lastMessage))
    if (aiId === 'gpt')        return sseStream(streamGPT(system, historyText, lastMessage))
    if (aiId === 'gemini')     return sseStream(streamGemini(system, historyText, lastMessage))
    if (aiId === 'perplexity') return sseStream(streamPerplexity(system, historyText, lastMessage, needsWebSearch))

    return new Response('AI non trovata', { status: 400 })
  } catch (error) {
    console.error('API Error:', error)
    return new Response('Errore interno', { status: 500 })
  }
}
