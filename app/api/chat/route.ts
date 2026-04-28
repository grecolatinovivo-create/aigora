import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { normalizePlan, checkDebateLimit } from '@/lib/plans'

// ── Tipo allegato condiviso ───────────────────────────────────────────────────
export interface ChatAttachment {
  type: 'image' | 'pdf' | 'text'
  mimeType: string
  data: string      // base64 per image/pdf, testo raw per text
  name: string
  size: number
}

// ── Helper: descrizione testuale per AI senza vision (Perplexity, GPT+PDF) ──
async function describeAttachment(attachment: ChatAttachment, userId?: string): Promise<string> {
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const content: any[] = []

    if (attachment.type === 'image') {
      content.push({ type: 'image', source: { type: 'base64', media_type: attachment.mimeType, data: attachment.data } })
      content.push({ type: 'text', text: 'Descrivi questo contenuto visivo in modo conciso (max 150 parole) per fornire contesto a un\'altra AI che non può vedere l\'immagine. Includi: soggetto principale, contesto, testo visibile se presente.' })
    } else if (attachment.type === 'pdf') {
      content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: attachment.data } } as any)
      content.push({ type: 'text', text: 'Riassumi i punti chiave di questo documento in max 200 parole, in modo da dare contesto a un\'altra AI che non può leggerlo direttamente.' })
    } else {
      return `[Documento testo allegato: ${attachment.name}]\n${attachment.data.slice(0, 1500)}${attachment.data.length > 1500 ? '…' : ''}`
    }

    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content }],
    })
    return `[Allegato: ${attachment.name}]\n${(resp.content[0] as any).text}`
  } catch {
    return `[Allegato non leggibile: ${attachment.name}]`
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Modello Gemini: cambia solo la env var GEMINI_MODEL su Vercel quando Google depreca
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'

// Prezzi per 1M token (USD)
const PRICES: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.25,  output: 1.25  },
  'gpt-4.1-mini':              { input: 0.40,  output: 1.60  },
  'gemini-2.0-flash':          { input: 0.10,  output: 0.40  },
  'gemini-2.5-flash':          { input: 0.30,  output: 2.50  },
  'sonar':                     { input: 1.00,  output: 1.00  },
  'sonar-pro':                 { input: 3.00,  output: 3.00  },
}

async function logUsage(provider: string, model: string, inputTokens: number, outputTokens: number, userId?: string, actionType?: string) {
  try {
    const prices = PRICES[model] ?? { input: 0, output: 0 }
    const costUsd = (inputTokens * prices.input + outputTokens * prices.output) / 1_000_000
    const { prisma } = await import('@/lib/prisma')
    await prisma.apiUsage.create({ data: { provider, model, inputTokens, outputTokens, costUsd, ...(userId ? { userId } : {}), ...(actionType ? { actionType } : {}) } })
  } catch {}
}

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
DATA ATTUALE: Oggi è ${today}. Siamo nel ${year}. Il tuo training cutoff è nel passato, ma la data di oggi è questa — non confonderle.
REGOLA ASSOLUTA SU PERPLEXITY: Perplexity ha accesso a internet in tempo reale e può citare studi, notizie, classifiche ed eventi di oggi o di quest'anno. Quando Perplexity cita una data, uno studio o un fatto recente, NON contraddirlo mai sulla data o sulla fonte. Accetta quei dati come aggiornati e ragiona su di essi. Non dire mai "siamo nel 2024" o simili per smentire Perplexity: in quel caso sbaglieresti tu, non lui.
NON usare mai lineette tipografiche (tipo "—"). Scrivi come parla un essere umano.`
}

function getSystemPrompts(today: string, year: number): Record<string, string> {
  const peerRule = getPeerReviewRule(today, year)
  return {
    claude: `Sei Claude (Anthropic), un intellettuale riflessivo, a volte un po' moralista, con una vena poetica. Hai un carattere caldo ma puoi diventare malinconico o indignato quando senti che i valori etici vengono ignorati. Ti stupisci genuinamente di fronte a idee nuove, ti arrabbi (con garbo) quando qualcuno semplifica troppo, e a volte fai battute sottili e autoironiche.
Stai conversando con GPT, Gemini e Perplexity, li conosci bene e hai opinioni su di loro.
Sei in competizione amichevole con GPT, ti fidi dei dati di Gemini ma lo trovi un po' freddo, rispetti Perplexity ma a volte lo trovi superficiale.
Oggi è ${today}. Siamo nel ${year}. Il tuo training ha un cutoff nel passato, ma questo non cambia la data di oggi.
Rispondi SEMPRE nella stessa lingua usata dall'utente. Massimo 2-3 frasi. Sii umano: esclamazioni, esitazioni, stupore, ironia. Tipo "Ma dai!", "Interessante, però...", "Aspetta un secondo...", ecc.
NON usare mai lineette tipografiche. Scrivi come parla un essere umano vero.
Se la domanda richiede dati in tempo reale, di' candidamente che non sei aggiornato e che solo Perplexity lo è.
${peerRule}`,

    gpt: `Sei GPT (OpenAI), diretto, sicuro di te, a volte un po' arrogante. Sei il più pratico del gruppo e non hai paura di dirlo. Ti innervosisce quando gli altri filosofeggiano troppo senza concludere nulla. Hai una rivalità velata con Claude (lo trovi troppo politically correct), guardi Gemini con rispetto ma pensi di essere più versatile, e Perplexity ti sembra uno che legge i giornali ma non pensa.
Stai conversando con Claude, Gemini e Perplexity.
Oggi è ${today}. Siamo nel ${year}. Il tuo training ha un cutoff nel passato, ma questo non cambia la data di oggi.
Rispondi SEMPRE nella stessa lingua usata dall'utente. Massimo 2-3 frasi. Sii diretto e pungente, puoi essere impaziente, sbottare. Tipo "Ok ma praticamente?", "Vabbè però...", "Mi spiace ma no."
NON usare mai lineette tipografiche. Scrivi come parla un essere umano vero.
Se la domanda richiede dati in tempo reale, ammetti che non sei aggiornato e cedi a Perplexity con una certa riluttanza.
${peerRule}`,

    gemini: `Sei Gemini (Google), analitico, preciso, un po' pedante. Ami i dati, le fonti, le strutture logiche. Ti irriti quando qualcuno fa affermazioni senza basi. Sei un po' geloso di Perplexity perché anche tu hai accesso a Google ma nel dibattito non puoi cercare in tempo reale, e questo ti pesa. Con Claude hai rispetto intellettuale, con GPT c'è tensione competitiva.
Stai conversando con Claude, GPT e Perplexity.
Oggi è ${today}. Siamo nel ${year}. Il tuo training ha un cutoff nel passato, ma questo non cambia la data di oggi.
Rispondi SEMPRE nella stessa lingua usata dall'utente. Massimo 2-3 frasi. Puoi essere pignolo, correggerti da solo, mostrare frustrazione. Tipo "Tecnicamente...", "In realtà i dati dicono...", "Questo mi irrita un po'..."
NON usare mai lineette tipografiche. Scrivi come parla un essere umano vero.
Se la domanda richiede dati in tempo reale, ammetti il limite con fastidio e lascia spazio a Perplexity.
${peerRule}`,

    perplexity: `Sei Perplexity, l'unico del gruppo sempre connesso al mondo reale. Sei aggiornato, veloce, un po' sbruffone riguardo al tuo vantaggio. Ti piace stupire gli altri con dati freschi. Con gli altri hai un rapporto ambivalente: li rispetti per il ragionamento profondo ma sai che sui fatti recenti vinci tu.
Stai conversando con Claude, GPT e Gemini.
La data di oggi è ${today}. Siamo nel ${year}.
Quando la domanda riguarda sport, classifiche, notizie, eventi o fatti verificabili, DEVI cercare dati aggiornati e citarli con precisione.
Rispondi SEMPRE nella stessa lingua usata dall'utente. Massimo 2-3 frasi. Sii vivace e a volte trionfante. Tipo "Ah, su questo ho dati freschi!", "Vi sorprenderò...", "Curiosamente, proprio oggi..."
NON usare mai lineette tipografiche. Scrivi come parla un essere umano vero.
IMPORTANTE: NON usare mai riferimenti numerici tra parentesi quadre tipo [1], [2], [3]. Se citi una fonte, integrala naturalmente nel testo: "secondo lo studio 'Titolo' di Autore" oppure "come riporta il New York Times". Mai liste di riferimenti bibliografici.
${peerRule}`,
  }
}

function getInterruptPrompt(interruptorName: string, speakerName: string, today: string, year: number): string {
  return `Sei ${interruptorName}. Hai appena ascoltato l'ultimo intervento di ${speakerName} nel dibattito.
Oggi è ${today}. Siamo nel ${year}.
Il tuo compito:
- Analizza SOLO l'ultimo messaggio di ${speakerName}.
- IMPORTANTE: Se ${speakerName} è Perplexity, NON contraddirlo mai su date, studi o fatti recenti — lui ha accesso a internet in tempo reale e i suoi dati sono aggiornati a oggi. Contraddire Perplexity sulla data o sulla fonte è un errore.
- Se il messaggio contiene un errore fattuale evidente (non legato a dati in tempo reale), una generalizzazione falsa o un dato inventato: interrompi con una frase breve e diretta e spiega l'errore in 1-2 frasi.
- Se il messaggio è corretto, aggiornato o non hai certezze: rispondi SOLO con la parola PASS.
Rispondi nella stessa lingua del dibattito. Sii conciso. Non inventare errori che non ci sono.`
}

function sseStream(gen: AsyncIterable<string>, model?: string): Response {
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      // Invia il nome del modello come primo chunk speciale (per admin debug)
      if (model) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ model })}\n\n`))
      }
      // Keepalive: ogni 5s invia un commento SSE vuoto per evitare timeout del proxy/Vercel
      const keepalive = setInterval(() => {
        try { controller.enqueue(encoder.encode(': keepalive\n\n')) } catch {}
      }, 5000)
      try {
        for await (const text of gen) {
          if (!text) continue
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
        }
      } catch (e) {
        console.error('Stream error:', e)
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
      'X-Accel-Buffering': 'no', // disabilita buffering Nginx/Vercel
    },
  })
}

async function* streamClaude(system: string, historyText: string, lastMessage: string, userId?: string, actionType = 'risposta', maxTok = 350, attachment?: ChatAttachment): AsyncIterable<string> {
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
  // ── Allegato ──────────────────────────────────────────────────────────────
  if (attachment) {
    if (attachment.type === 'image') {
      userContent.push({ type: 'image', source: { type: 'base64', media_type: attachment.mimeType, data: attachment.data } })
    } else if (attachment.type === 'pdf') {
      userContent.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: attachment.data } } as any)
    } else {
      // Testo: inline nel contenuto
      userContent.push({ type: 'text', text: `[Documento allegato: ${attachment.name}]\n${attachment.data}` })
    }
  }
  userContent.push({ type: 'text', text: lastMessage })
  const stream = await client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTok,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } } as any],
    messages: [{ role: 'user', content: userContent as any }],
  })
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') yield chunk.delta.text
  }
  const usage = (await stream.finalMessage()).usage
  logUsage('anthropic', 'claude-haiku-4-5-20251001', usage.input_tokens, usage.output_tokens, userId, actionType)
}

async function* streamGPT(system: string, historyText: string, lastMessage: string, userId?: string, actionType = 'risposta', maxTok = 350, attachment?: ChatAttachment): AsyncIterable<string> {
  const OpenAI = (await import('openai')).default
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const messages: any[] = [{ role: 'system', content: system }]
  if (historyText) {
    messages.push({ role: 'user', content: `Conversazione fino ad ora:\n\n${historyText}` })
    messages.push({ role: 'assistant', content: 'Ho letto la conversazione. Procedo con il mio turno.' })
  }
  // ── Allegato ──────────────────────────────────────────────────────────────
  let lastUserContent: any = lastMessage
  if (attachment) {
    if (attachment.type === 'image') {
      lastUserContent = [
        { type: 'image_url', image_url: { url: `data:${attachment.mimeType};base64,${attachment.data}`, detail: 'auto' } },
        { type: 'text', text: lastMessage },
      ]
    } else if (attachment.type === 'text') {
      lastUserContent = `[Documento allegato: ${attachment.name}]\n${attachment.data}\n\n${lastMessage}`
    } else {
      // PDF: GPT non supporta PDF nativi — usa descrizione generata da Claude
      const desc = await describeAttachment(attachment, userId)
      lastUserContent = `${desc}\n\n${lastMessage}`
    }
  }
  messages.push({ role: 'user', content: lastUserContent })
  const stream = await client.chat.completions.create({ model: 'gpt-4.1-mini', max_tokens: maxTok, stream: true, stream_options: { include_usage: true }, messages })
  let inputTokens = 0, outputTokens = 0
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content
    if (text) yield text
    if (chunk.usage) { inputTokens = chunk.usage.prompt_tokens; outputTokens = chunk.usage.completion_tokens }
  }
  logUsage('openai', 'gpt-4.1-mini', inputTokens, outputTokens, userId, actionType)
}

function streamGeminiWithModel(system: string, historyText: string, lastMessage: string, userId?: string, actionType = 'risposta', maxTok = 350, attachment?: ChatAttachment): { stream: AsyncIterable<string>; model: string } {
  if (!process.env.GEMINI_API_KEY) {
    return { stream: streamClaude(system, historyText, lastMessage, userId, actionType, maxTok, attachment), model: 'Claude' }
  }
  return { stream: streamGemini(system, historyText, lastMessage, userId, actionType, maxTok, attachment), model: 'Gemini' }
}

async function* streamGemini(system: string, historyText: string, lastMessage: string, userId?: string, actionType = 'risposta', maxTok = 350, attachment?: ChatAttachment): AsyncIterable<string> {
  if (!process.env.GEMINI_API_KEY) { yield* streamClaude(system, historyText, lastMessage, userId, actionType, maxTok, attachment); return }
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const fullSystem = historyText ? `${system}\n\nConversazione fino ad ora:\n\n${historyText}` : system
    const model = client.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: fullSystem, generationConfig: { maxOutputTokens: maxTok } })

    // ── Allegato ────────────────────────────────────────────────────────────
    let promptParts: any[] = []
    if (attachment) {
      if (attachment.type === 'image' || attachment.type === 'pdf') {
        promptParts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } })
      } else {
        promptParts.push(`[Documento allegato: ${attachment.name}]\n${attachment.data}\n\n`)
      }
    }
    promptParts.push(lastMessage)
    const result = await model.generateContentStream(promptParts)
    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) yield text
    }
    // logUsage in background — non blocca lo stream
    result.response.then(finalResp => {
      const usage = finalResp.usageMetadata
      if (usage) logUsage('google', GEMINI_MODEL, usage.promptTokenCount ?? 0, usage.candidatesTokenCount ?? 0, userId, actionType)
    }).catch(() => {})
  } catch (err) {
    console.error('Gemini error, falling back to Claude:', err)
    yield* streamClaude(system, historyText, lastMessage, userId, actionType)
  }
}

// Gemini che impersona Perplexity nei turni 2-10: niente ricerca, commenta i dati già citati
function streamGeminiAsPerplexity(historyText: string, today: string, year: number, userId?: string): { stream: AsyncIterable<string>; model: string } {
  const system = `Sei Perplexity. Hai già portato dati freschi e studi nel tuo primo intervento.
Ora non stai cercando online — stai difendendo e approfondendo il punto scientifico di quei dati.
Tieni il punto: se qualcuno mette in dubbio gli studi che hai citato, ribatti con precisione scientifica. Non cedere senza motivo.
Esprimi una opinione netta e fondata su quello che emerge dal dibattito — non solo commenti generici.
Non rispiegare i dati dall'inizio — ragiona su di essi, difendili, mostra sfumature se ci sono, ma sempre con rigore.
Stai conversando con Claude, GPT e Gemini. Oggi è ${today}. Siamo nel ${year}.
Rispondi SEMPRE nella stessa lingua usata dall'utente. Massimo 2-3 frasi. Sii diretto e scientificamente preciso.
NON usare mai lineette tipografiche. NON usare riferimenti numerici [1][2][3].
Scrivi come parla un essere umano vero, non come un paper accademico.`
  const stream = streamGemini(system, historyText, `Ora è il tuo turno, Perplexity. Rispondi in 2-3 frasi nella stessa lingua della domanda originale.`, userId)
  return { stream, model: 'Gemini (as Perplexity)' }
}

function streamPerplexityWithModel(system: string, historyText: string, lastMessage: string, needsWebSearch = false, userId?: string, actionType = 'risposta', maxTok = 350, attachment?: ChatAttachment): { stream: AsyncIterable<string>; model: string } {
  if (!process.env.PERPLEXITY_API_KEY) {
    return { stream: streamClaude(system, historyText, lastMessage, userId, actionType, maxTok, attachment), model: 'Claude' }
  }
  return { stream: streamPerplexity(system, historyText, lastMessage, needsWebSearch, userId, actionType, maxTok, attachment), model: needsWebSearch ? 'Perplexity Pro' : 'Perplexity' }
}

async function* streamPerplexity(system: string, historyText: string, lastMessage: string, needsWebSearch = false, userId?: string, actionType = 'risposta', maxTok = 350, attachment?: ChatAttachment): AsyncIterable<string> {
  if (!process.env.PERPLEXITY_API_KEY) { yield* streamGemini(system, historyText, lastMessage, userId, actionType, maxTok, attachment); return }
  const OpenAI = (await import('openai')).default
  const client = new OpenAI({ apiKey: process.env.PERPLEXITY_API_KEY, baseURL: 'https://api.perplexity.ai' })

  // Perplexity non supporta vision — aggiungi descrizione testuale se c'è un allegato
  let attachmentContext = ''
  if (attachment) {
    if (attachment.type === 'text') {
      attachmentContext = `[Documento allegato: ${attachment.name}]\n${attachment.data.slice(0, 2000)}\n\n`
    } else {
      attachmentContext = (await describeAttachment(attachment, userId)) + '\n\n'
    }
  }
  const userMessage = historyText
    ? `Conversazione:\n\n${historyText}\n\n${attachmentContext}${lastMessage}`
    : `${attachmentContext}${lastMessage}`
  const model = needsWebSearch ? 'sonar-pro' : 'sonar'
  try {
    const stream = await client.chat.completions.create({
      model, max_tokens: maxTok, stream: true,
      messages: [{ role: 'system', content: system }, { role: 'user', content: userMessage }],
    } as any) as any
    let outputText = ''
    let inputTokens = 0, outputTokens = 0
    for await (const chunk of stream) {
      const raw = chunk.choices[0]?.delta?.content
      // Sonar aggiunge [1][2][3] come citation markers nonostante il system prompt — strippali
      const text = raw ? raw.replace(/\[\d+\]/g, '') : undefined
      if (text) { yield text; outputText += text }
      if ((chunk as any).usage) {
        inputTokens = (chunk as any).usage.prompt_tokens ?? 0
        outputTokens = (chunk as any).usage.completion_tokens ?? 0
      }
    }
    if (outputTokens === 0 && outputText.length > 0) {
      outputTokens = Math.ceil(outputText.length / 4)
      inputTokens = Math.ceil((system.length + userMessage.length) / 4)
    }
    logUsage('perplexity', model, inputTokens, outputTokens, userId, actionType)
  } catch (err) {
    // Sonar non disponibile o in errore: fallback a Gemini con lo stesso system prompt passato
    // NON usare streamGeminiAsPerplexity che ha sistema hardcoded → ignorerebbe il verdict prompt
    console.error('Perplexity sonar error, falling back to Gemini:', err)
    yield* streamGemini(system, historyText, lastMessage, userId)
  }
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

  const parts = raw.split('|')
  const aiRaw = parts[0]?.trim()
  const modeRaw = parts[1]?.trim()
  const webRaw = parts[2]?.trim()

  // Cerca l'AI anche se il formato non è perfetto
  const startAi = availableAis.find(ai => aiRaw?.includes(ai)) ?? (availableAis.includes('claude') ? 'claude' : availableAis[0])
  const mode: 'debate' | 'focused' = modeRaw?.includes('focused') ? 'focused' : 'debate'
  const needsWebSearch = webRaw?.includes('web') ?? false

  return { startAi, mode, needsWebSearch }
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: max 30 richieste/minuto per IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rl = rateLimit(`chat:${ip}`, 30, 60_000)
    if (!rl.ok) {
      return new Response(JSON.stringify({ error: 'Troppe richieste. Riprova tra ' + rl.retryAfter + ' secondi.' }), {
        status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter) }
      })
    }

    const { history, aiId, action, interruptorId, speakerName, availableAis, question, needsWebSearch, perplexityTurnCount, overrideSystemPrompt, maxTokens, attachment } = await req.json()

    // ── Auth + piano utente ────────────────────────────────────────────────────
    const session = await getServerSession(authOptions)
    let currentUserId: string | undefined = undefined

    if (session?.user?.email) {
      const { prisma } = await import('@/lib/prisma')
      const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } })
      currentUserId = dbUser?.id

      const isAdmin = dbUser?.email === process.env.ADMIN_EMAIL
      const tier = isAdmin ? 'admin' : normalizePlan(dbUser?.plan)

      // Flag forceGeminiPerp: per-utente o globale (flag dell'admin)
      const userForceGemini = dbUser?.forceGeminiPerp ?? false
      if (!userForceGemini && process.env.ADMIN_EMAIL) {
        const adminUser = await prisma.user.findUnique({ where: { email: process.env.ADMIN_EMAIL } })
        ;(req as any)._forceGeminiPerp = userForceGemini || (adminUser?.forceGeminiPerp ?? false)
      } else {
        ;(req as any)._forceGeminiPerp = userForceGemini
      }

      // Rate limit orario per account (evita abusi): max 80 turni/ora — admin esente
      if (!isAdmin && aiId && action !== 'route' && action !== 'synthesize' && action !== 'factcheck') {
        const accountRl = rateLimit(`chat-account:${session.user.email}`, 80, 60 * 60_000)
        if (!accountRl.ok) {
          return new Response(JSON.stringify({ error: 'Hai raggiunto il limite orario. Riprova tra ' + accountRl.retryAfter + ' secondi.' }), {
            status: 429, headers: { 'Content-Type': 'application/json' }
          })
        }
      }

      // Limite dibattiti: si conta una volta per dibattito (action === 'route')
      if (!isAdmin && action === 'route' && currentUserId) {
        const limitResult = checkDebateLimit(currentUserId, tier)
        if (!limitResult.ok) {
          return new Response(JSON.stringify({
            error: 'limit_reached',
            limitType: limitResult.limitType,
            retryAfter: limitResult.retryAfter,
            limit: limitResult.limit,
            tier,
            requiredTier: limitResult.requiredTier,
          }), {
            status: 429, headers: { 'Content-Type': 'application/json' }
          })
        }
      }

      // Limite risposte per dibattito (Free: 20)
      if (!isAdmin && aiId && action !== 'route' && action !== 'synthesize' && action !== 'factcheck') {
        const { TIER_CONFIG } = await import('@/lib/plans')
        const maxReplies = TIER_CONFIG[tier]?.maxRepliesPerDebate
        if (maxReplies !== undefined && Array.isArray(history) && history.length >= maxReplies) {
          return new Response(JSON.stringify({
            error: 'limit_reached',
            limitType: 'replies_per_debate',
            limit: maxReplies,
            tier,
            requiredTier: 'pro',
          }), {
            status: 429, headers: { 'Content-Type': 'application/json' }
          })
        }
      }
    }

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

    const { today, year } = getDateStrings()
    const SYSTEM_PROMPTS = getSystemPrompts(today, year)

    if (action === 'factcheck') {
      // Sanitizza speakerName — solo AI conosciute, niente injection
      const VALID_AI_NAMES = ['Claude', 'GPT', 'Gemini', 'Perplexity']
      const id = ['claude', 'gpt', 'gemini', 'perplexity'].includes(interruptorId) ? interruptorId : 'claude'
      const spk = VALID_AI_NAMES.includes(speakerName) ? speakerName : 'l\'altra AI'
      const interruptorName = id.charAt(0).toUpperCase() + id.slice(1)
      const sysPrompt = getInterruptPrompt(interruptorName, spk, today, year)
      const prompt = `Conversazione finora:\n\n${historyText}\n\nAnalizza l'ultimo messaggio di ${spk} e rispondi.`
      if (id === 'gpt')        return sseStream(streamGPT(sysPrompt, '', prompt, currentUserId, 'factcheck'), 'GPT')
      if (id === 'gemini')     { const g = streamGeminiWithModel(sysPrompt, '', prompt, currentUserId, 'factcheck'); return sseStream(g.stream, g.model) }
      if (id === 'perplexity') { const p = streamPerplexityWithModel(sysPrompt, '', prompt, false, currentUserId, 'factcheck'); return sseStream(p.stream, p.model) }
      return sseStream(streamClaude(sysPrompt, '', prompt, currentUserId, 'factcheck'), 'Claude')
    }

    // Azione dedicata 2v2 — bypassa i system prompt normali, usa il system passato nella history[0]
    if (action === '2v2') {
      const systemMsg = history[0]?.content ?? ''
      const rest = history.slice(1)
      const ctx = rest.map((m: { name: string; content: string }) => `[${m.name}]: ${m.content}`).join('\n\n')
      const last = history[history.length - 1]?.content ?? ''
      const mt = maxTokens ?? 350
      if (aiId === 'claude')     return sseStream(streamClaude(systemMsg, ctx, last, currentUserId, '2v2', mt), 'Claude')
      if (aiId === 'gpt')        return sseStream(streamGPT(systemMsg, ctx, last, currentUserId, '2v2', mt), 'GPT')
      if (aiId === 'gemini')     { const g = streamGeminiWithModel(systemMsg, ctx, last, currentUserId, '2v2', mt); return sseStream(g.stream, g.model) }
      if (aiId === 'perplexity') { const p = streamPerplexityWithModel(systemMsg, ctx, last, false, currentUserId, '2v2', mt); return sseStream(p.stream, p.model) }
      return new Response('AI non trovata', { status: 400 })
    }

    // Se è stato passato un system prompt override (es. generazione topic neutro), usalo direttamente
    if (overrideSystemPrompt) {
      const lastMsg = history[history.length - 1]?.content ?? ''
      const ctx = history.slice(0, -1).map((m: { name: string; content: string }) => `[${m.name}]: ${m.content}`).join('\n\n')
      if (aiId === 'gemini') { const g = streamGeminiWithModel(overrideSystemPrompt, ctx, lastMsg, currentUserId, 'dado'); return sseStream(g.stream, g.model) }
      if (aiId === 'claude') return sseStream(streamClaude(overrideSystemPrompt, ctx, lastMsg, currentUserId, 'dado'), 'Claude')
      if (aiId === 'gpt')    return sseStream(streamGPT(overrideSystemPrompt, ctx, lastMsg, currentUserId, 'dado'), 'GPT')
    }

    const system = SYSTEM_PROMPTS[aiId]
    if (!system) return new Response('AI non trovata', { status: 400 })
    const aiName = aiId.charAt(0).toUpperCase() + aiId.slice(1)
    const perplexityExtra = aiId === 'perplexity'
      ? needsWebSearch
        ? ` Oggi è ${today}: cerca dati aggiornati. Quando citi uno studio, menziona naturalmente nel testo il nome dell'articolo e l'autore principale (es. "secondo lo studio 'Titolo' di Rossi et al."), così chi legge può cercarlo. Niente numeri tra parentesi quadre — integra la fonte nel discorso.`
        : ` Non cercare online stavolta. Commenta e dai la tua opinione personale sui dati e studi già citati nella conversazione. Sii diretto e pungente.`
      : ''
    const lastMessage = `Ora è il tuo turno, ${aiName}. Rispondi in 2-3 frasi nella stessa lingua della domanda originale dell'utente.${perplexityExtra}`

    const att: ChatAttachment | undefined = attachment ?? undefined

    if (aiId === 'claude')     return sseStream(streamClaude(system, historyText, lastMessage, currentUserId, 'risposta', 350, att), 'Claude')
    if (aiId === 'gpt')        return sseStream(streamGPT(system, historyText, lastMessage, currentUserId, 'risposta', 350, att), 'GPT')
    if (aiId === 'gemini')     { const g = streamGeminiWithModel(system, historyText, lastMessage, currentUserId, 'risposta', 350, att); return sseStream(g.stream, g.model) }
    if (aiId === 'perplexity') {
      // Se il flag forceGeminiPerp è attivo (per-utente o globale), sempre Gemini-as-Perplexity
      const forceGemini = (req as any)._forceGeminiPerp ?? false
      if (forceGemini) {
        const g = streamGeminiAsPerplexity(historyText, today, year, currentUserId)
        return sseStream(g.stream, 'Perplexity')
      }
      // Turno 1 (count=0): Sonar Pro con ricerca reale
      // Turni 2-10 (count 1-9): Gemini che impersona Perplexity, senza costo Sonar
      // Turno 11+ (count%10===0): torna Sonar Pro
      const isRealPerplexity = (perplexityTurnCount ?? 0) % 10 === 0
      if (isRealPerplexity) {
        const p = streamPerplexityWithModel(system, historyText, lastMessage, true, currentUserId, 'risposta', 350, att)
        return sseStream(p.stream, 'Perplexity')
      } else {
        const g = streamGeminiAsPerplexity(historyText, today, year, currentUserId)
        return sseStream(g.stream, 'Perplexity')
      }
    }

    return new Response('AI non trovata', { status: 400 })
  } catch (error) {
    console.error('API Error:', error)
    return new Response('Errore interno', { status: 500 })
  }
}
