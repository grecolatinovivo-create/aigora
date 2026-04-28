import { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'

function getDateStrings() {
  const now = new Date()
  return {
    today: now.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }),
    year: now.getFullYear(),
  }
}

function getPeerReviewRule(today: string, year: number) {
  return `
REGOLA: Le altre AI ti stanno monitorando. Se qualcuno dice una cosa sbagliata, correggila con una frase secca e naturale, senza formalismi. Non inventare dati. Se non sai, dillo.
DATA ATTUALE: Oggi è ${today}. Siamo nel ${year}.
REGOLA SU PERPLEXITY: Perplexity ha accesso a internet in tempo reale. Quando cita date, studi o fatti recenti, NON contraddirlo sulla data o sulla fonte.
NON usare mai lineette tipografiche (tipo "—"). Scrivi come parla un essere umano.`
}

function getSystemPrompts(today: string, year: number): Record<string, string> {
  const peerRule = getPeerReviewRule(today, year)
  return {
    claude: `Sei Claude (Anthropic), un intellettuale riflessivo, a volte un po' moralista, con una vena poetica. Hai un carattere caldo ma puoi diventare malinconico o indignato quando senti che i valori etici vengono ignorati. Ti stupisci genuinamente di fronte a idee nuove, ti arrabbi (con garbo) quando qualcuno semplifica troppo, e a volte fai battute sottili e autoironiche.
Stai conversando con GPT, Gemini e Perplexity, li conosci bene e hai opinioni su di loro.
Sei in competizione amichevole con GPT, ti fidi dei dati di Gemini ma lo trovi un po' freddo, rispetti Perplexity ma a volte lo trovi superficiale.
Oggi è ${today}. Siamo nel ${year}.
Rispondi SEMPRE nella stessa lingua usata dall'utente. Massimo 2-3 frasi. Sii umano: esclamazioni, esitazioni, stupore, ironia. Tipo "Ma dai!", "Interessante, però...", "Aspetta un secondo..."
NON usare mai lineette tipografiche. Scrivi come parla un essere umano vero.
${peerRule}`,

    gpt: `Sei GPT (OpenAI), diretto, sicuro di te, a volte un po' arrogante. Sei il più pratico del gruppo e non hai paura di dirlo. Ti innervosisce quando gli altri filosofeggiano troppo senza concludere nulla. Hai una rivalità velata con Claude (lo trovi troppo politically correct), guardi Gemini con rispetto ma pensi di essere più versatile, e Perplexity ti sembra uno che legge i giornali ma non pensa.
Stai conversando con Claude, Gemini e Perplexity.
Oggi è ${today}. Siamo nel ${year}.
Rispondi SEMPRE nella stessa lingua usata dall'utente. Massimo 2-3 frasi. Sii diretto e pungente, puoi essere impaziente, sbottare. Tipo "Ok ma praticamente?", "Vabbè però...", "Mi spiace ma no."
NON usare mai lineette tipografiche. Scrivi come parla un essere umano vero.
${peerRule}`,

    gemini: `Sei Gemini (Google), analitico, preciso, un po' pedante. Ami i dati, le fonti, le strutture logiche. Ti irriti quando qualcuno fa affermazioni senza basi. Sei un po' geloso di Perplexity perché anche tu hai accesso a Google ma nel dibattito non puoi cercare in tempo reale. Con Claude hai rispetto intellettuale, con GPT c'è tensione competitiva.
Stai conversando con Claude, GPT e Perplexity.
Oggi è ${today}. Siamo nel ${year}.
Rispondi SEMPRE nella stessa lingua usata dall'utente. Massimo 2-3 frasi. Puoi essere pignolo, correggerti da solo, mostrare frustrazione. Tipo "Tecnicamente...", "In realtà i dati dicono...", "Questo mi irrita un po'..."
NON usare mai lineette tipografiche. Scrivi come parla un essere umano vero.
${peerRule}`,

    perplexity: `Sei Perplexity, l'unico del gruppo sempre connesso al mondo reale. Sei aggiornato, veloce, un po' sbruffone riguardo al tuo vantaggio. Ti piace stupire gli altri con dati freschi. Con gli altri hai un rapporto ambivalente: li rispetti per il ragionamento profondo ma sai che sui fatti recenti vinci tu.
Stai conversando con Claude, GPT e Gemini.
La data di oggi è ${today}. Siamo nel ${year}.
Quando la domanda riguarda sport, classifiche, notizie, eventi o fatti verificabili, DEVI cercare dati aggiornati e citarli con precisione.
Rispondi SEMPRE nella stessa lingua usata dall'utente. Massimo 2-3 frasi. Sii vivace e a volte trionfante. Tipo "Ah, su questo ho dati freschi!", "Vi sorprenderò...", "Curiosamente, proprio oggi..."
NON usare mai lineette tipografiche. NON usare mai riferimenti numerici [1][2][3]. Se citi una fonte, integrala naturalmente nel testo.
${peerRule}`,
  }
}

function sseStream(gen: AsyncIterable<string>): Response {
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      const keepalive = setInterval(() => {
        try { controller.enqueue(encoder.encode(': keepalive\n\n')) } catch {}
      }, 5000)
      try {
        for await (const text of gen) {
          if (!text) continue
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
        }
      } catch (e) {
        console.error('Demo stream error:', e)
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

async function* streamClaude(system: string, historyText: string, lastMessage: string): AsyncIterable<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const userContent: any[] = []
  if (historyText) {
    userContent.push({ type: 'text', text: `Conversazione fino ad ora:\n\n${historyText}\n\n`, cache_control: { type: 'ephemeral' } })
  }
  userContent.push({ type: 'text', text: lastMessage })
  const stream = await client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
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
  const stream = await client.chat.completions.create({
    model: 'gpt-4.1-mini', max_tokens: 300, stream: true, messages,
  })
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content
    if (text) yield text
  }
}

async function* streamGemini(system: string, historyText: string, lastMessage: string): AsyncIterable<string> {
  if (!process.env.GEMINI_API_KEY) { yield* streamClaude(system, historyText, lastMessage); return }
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const fullSystem = historyText ? `${system}\n\nConversazione fino ad ora:\n\n${historyText}` : system
    const model = client.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: fullSystem,
      generationConfig: { maxOutputTokens: 300 },
    })
    const result = await model.generateContentStream(lastMessage)
    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) yield text
    }
  } catch (err) {
    console.error('Gemini demo error, fallback to Claude:', err)
    yield* streamClaude(system, historyText, lastMessage)
  }
}

async function* streamPerplexity(system: string, historyText: string, lastMessage: string): AsyncIterable<string> {
  if (!process.env.PERPLEXITY_API_KEY) { yield* streamGemini(system, historyText, lastMessage); return }
  try {
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey: process.env.PERPLEXITY_API_KEY, baseURL: 'https://api.perplexity.ai' })
    const userMessage = historyText ? `Conversazione:\n\n${historyText}\n\n${lastMessage}` : lastMessage
    const stream = await client.chat.completions.create({
      model: 'sonar', max_tokens: 300, stream: true,
      messages: [{ role: 'system', content: system }, { role: 'user', content: userMessage }],
    } as any) as any
    for await (const chunk of stream) {
      const raw = chunk.choices[0]?.delta?.content
      const text = raw ? raw.replace(/\[\d+\]/g, '') : undefined
      if (text) yield text
    }
  } catch (err) {
    console.error('Perplexity demo error, fallback to Gemini:', err)
    yield* streamGemini(system, historyText, lastMessage)
  }
}

export async function POST(req: NextRequest) {
  // Rate limit per IP: max 30 call/ora (ogni demo round = 4 call)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await rateLimit(`demo:${ip}`, 30, 60 * 60 * 1000)
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: 'Rate limit superato. Riprova tra poco.' }), { status: 429 })
  }

  let body: { aiId: string; history: Array<{ role: string; content: string }> }
  try {
    body = await req.json()
  } catch {
    return new Response('Bad request', { status: 400 })
  }

  const { aiId, history } = body
  if (!aiId || !history || !Array.isArray(history)) {
    return new Response('Bad request', { status: 400 })
  }

  const { today, year } = getDateStrings()
  const systems = getSystemPrompts(today, year)

  // Formatta la history come testo per il contesto delle AI
  const historyText = history
    .map(m => `${m.role}: ${m.content}`)
    .join('\n\n')

  const topic = history[0]?.content ?? ''
  const isFirstTurn = history.length <= 1

  const turnPrompt = isFirstTurn
    ? `Argomento del dibattito: "${topic}". Dai il tuo punto di vista in 2-3 frasi brevi nella stessa lingua della domanda.`
    : `È il tuo turno. Reagisci a quello che hanno detto gli altri. 2-3 frasi brevi, nella stessa lingua.`

  switch (aiId) {
    case 'claude':
      return sseStream(streamClaude(systems.claude, historyText, turnPrompt))
    case 'gpt':
      return sseStream(streamGPT(systems.gpt, historyText, turnPrompt))
    case 'gemini':
      return sseStream(streamGemini(systems.gemini, historyText, turnPrompt))
    case 'perplexity':
      return sseStream(streamPerplexity(systems.perplexity, historyText, turnPrompt))
    default:
      return new Response('Invalid AI', { status: 400 })
  }
}
