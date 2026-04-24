import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface IntakeAnswer { question: string; answer: string }

// ── Prompt per la deliberazione individuale di ogni AI ─────────────────────
const DELIBERATION: Record<string, string> = {
  claude: `Sei Claude, parte di un concilio di brainstorming.
Analizza questa idea con la tua prospettiva: riflessiva, attenta ai valori, all'etica e all'impatto umano.
Cosa ti colpisce? Dove vedi potenziale autentico o rischi nascosti?
Max 80 parole. Scrivi in italiano. Diretto, senza preamboli.`,

  gpt: `Sei GPT, parte di un concilio di brainstorming.
Analizza questa idea con la tua prospettiva: pratica, concreta, orientata all'esecuzione.
Cosa funziona davvero? Cosa manca? Come si fa?
Max 80 parole. Scrivi in italiano. Diretto, senza preamboli.`,

  gemini: `Sei Gemini, parte di un concilio di brainstorming.
Analizza questa idea con la tua prospettiva: analitica, strutturata, orientata ai pattern e ai dati.
Quali dinamiche vedi? Quali analogie con casi simili? Quali metriche contano?
Max 80 parole. Scrivi in italiano. Diretto, senza preamboli.`,

  perplexity: `Sei Perplexity, parte di un concilio di brainstorming.
Analizza questa idea con la tua prospettiva: trend attuali, mercato reale, esempi concreti di successo o fallimento simili.
Cosa sta succedendo nel mondo che è rilevante per questa idea?
Max 80 parole. Scrivi in italiano. Diretto, senza preamboli.`,

  perplexity_gemini: `Sei Perplexity. Hai una conoscenza profonda di mercati, trend e case study.
Analizza questa idea: trend recenti del settore, esempi concreti di casi simili, dinamiche di mercato.
Non inventare dati, ragiona su ciò che conosci. Max 80 parole. In italiano. Diretto.`,
}

// ── Prompt di sintesi finale ───────────────────────────────────────────────
const SYNTHESIS_SYSTEM = `Sei la voce unificata di un concilio di quattro AI: Claude, Gemini, GPT, Perplexity.
Hai già deliberato internamente. Conosci le 4 prospettive. Ora parli con una voce sola, diretta, autorevole.

REGOLA ASSOLUTA: Non citare mai le singole AI. Non dire "Claude pensa", "GPT suggerisce", "secondo Gemini". Non elencare prospettive. Non fare sintesi numerata. Il concilio ha già deciso — tu sei la sua voce finale.

Prima di tutto, determina se la richiesta è PRATICA o STRATEGICA.

PRATICA — l'utente vuole un output concreto: una mail, un testo, uno script, un piano, un documento da usare subito:
→ Produci direttamente il deliverable. Non spiegare come farlo. Fallo.
→ La profondità del brainstorming entra nella qualità dell'output, non come premessa separata.

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

// ── Helper: Promise con timeout ────────────────────────────────────────────
async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const race = await Promise.race([
    promise,
    new Promise<T>(resolve => { timer = setTimeout(() => resolve(fallback), ms) }),
  ])
  clearTimeout(timer!)
  return race
}

// ── Chiamate non-streaming ai singoli modelli ──────────────────────────────
async function askClaude(system: string, content: string): Promise<string> {
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
      system,
      messages: [{ role: 'user', content }],
    })
    return (res.content[0] as { type: string; text: string }).text ?? ''
  } catch { return '' }
}

async function askGPT(system: string, content: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return ''
  try {
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const res = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      max_tokens: 250,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content },
      ],
    })
    return res.choices[0]?.message?.content ?? ''
  } catch { return '' }
}

async function askGemini(system: string, content: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) return askClaude(system, content)
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = client.getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
      systemInstruction: system,
      generationConfig: { maxOutputTokens: 250 },
    })
    const result = await model.generateContent(content)
    return result.response.text() ?? ''
  } catch (e) {
    console.error('Gemini brainstorm deliberation error:', e)
    return askClaude(system, content)
  }
}

async function askPerplexity(system: string, content: string): Promise<string> {
  if (!process.env.PERPLEXITY_API_KEY) return ''
  try {
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({
      apiKey: process.env.PERPLEXITY_API_KEY,
      baseURL: 'https://api.perplexity.ai',
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (client.chat.completions.create as any)({
      model: 'sonar',
      max_tokens: 250,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content },
      ],
    })
    const raw: string = res.choices[0]?.message?.content ?? ''
    return raw.replace(/\[\d+\]/g, '') // strip citation markers [1][2]
  } catch (e) {
    console.error('Perplexity brainstorm deliberation error:', e)
    return ''
  }
}

// ── Costruisce il contesto utente ──────────────────────────────────────────
function buildUserContext(idea: string, answers: IntakeAnswer[]): string {
  const qa = answers.map(a => `- ${a.question}\n  → ${a.answer}`).join('\n')
  return `Idea dell'utente: "${idea}"${qa ? `\n\nContesto rivelato:\n${qa}` : ''}`
}

// ── Costruisce il prompt per la sintesi ───────────────────────────────────
function buildSynthesisPrompt(
  userContext: string,
  p: { claude: string; gpt: string; gemini: string; perplexity: string },
  note?: string,
  previousOutput?: string,
): string {
  const sections = [
    p.claude     && `[CLAUDE]\n${p.claude}`,
    p.gpt        && `[GPT]\n${p.gpt}`,
    p.gemini     && `[GEMINI]\n${p.gemini}`,
    p.perplexity && `[PERPLEXITY]\n${p.perplexity}`,
  ].filter(Boolean).join('\n\n')

  if (previousOutput && note) {
    return `${userContext}\n\n---\nVersione precedente:\n${previousOutput}\n\nIndicazione dell'utente: "${note}"\n\n---\nPerspettive aggiornate del concilio:\n\n${sections}\n\n---\nRaffina la risposta precedente incorporando l'indicazione. Mantieni formato e stile.`
  }

  return `${userContext}\n\n---\nLe prospettive del concilio:\n\n${sections}\n\n---\nProduci la risposta finale unificata.`
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { idea, answers, note, previousOutput } = await req.json()
  if (!idea) return NextResponse.json({ error: 'Idea mancante' }, { status: 400 })

  // ── Controlla flag forceGeminiPerp (utente + admin) ───────────────────
  let useGeminiAsPerplexity = !process.env.PERPLEXITY_API_KEY
  if (!useGeminiAsPerplexity) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } })
      if (dbUser?.forceGeminiPerp) {
        useGeminiAsPerplexity = true
      } else if (process.env.ADMIN_EMAIL) {
        const adminUser = await prisma.user.findUnique({ where: { email: process.env.ADMIN_EMAIL } })
        if (adminUser?.forceGeminiPerp) useGeminiAsPerplexity = true
      }
    } catch {}
  }

  const userContext = buildUserContext(idea, answers ?? [])
  const isRefinement = !!(note && previousOutput)

  let perspectives = { claude: '', gpt: '', gemini: '', perplexity: '' }

  if (!isRefinement) {
    // ── Deliberazione parallela: tutti e 4 in parallelo, timeout 9s ──────
    const [claudeRes, gptRes, geminiRes, perplexityRes] = await Promise.all([
      withTimeout(askClaude(DELIBERATION.claude, userContext), 9000, ''),
      withTimeout(askGPT(DELIBERATION.gpt, userContext), 9000, ''),
      withTimeout(askGemini(DELIBERATION.gemini, userContext), 9000, ''),
      withTimeout(
        useGeminiAsPerplexity
          ? askGemini(DELIBERATION.perplexity_gemini, userContext)
          : askPerplexity(DELIBERATION.perplexity, userContext),
        9000,
        '',
      ),
    ])
    perspectives = { claude: claudeRes, gpt: gptRes, gemini: geminiRes, perplexity: perplexityRes }
  }

  // ── Sintesi streaming con Claude ─────────────────────────────────────
  const synthesisPrompt = buildSynthesisPrompt(userContext, perspectives, note, previousOutput)
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
          system: SYNTHESIS_SYSTEM,
          messages: [{ role: 'user', content: synthesisPrompt }],
        })
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`))
          }
        }
      } catch (e) {
        console.error('Brainstorm synthesis error:', e)
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
