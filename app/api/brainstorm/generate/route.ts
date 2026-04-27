import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { normalizePlan, canUseMode, checkDailyDebateLimit } from '@/lib/plans'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface IntakeAnswer { question: string; answer: string }

interface Round1 {
  claude: string
  gpt: string
  gemini: string
  perplexity: string
}

// ── Round 1 — prospettiva individuale ─────────────────────────────────────
const R1: Record<string, string> = {
  claude: `Sei Claude, parte di un concilio di brainstorming.
Analizza questa idea con la tua prospettiva: riflessiva, attenta ai valori, all'etica e all'impatto umano.
Cosa ti colpisce? Dove vedi potenziale autentico o rischi nascosti?
Max 80 parole. In italiano. Diretto, senza preamboli.`,

  gpt: `Sei GPT, parte di un concilio di brainstorming.
Analizza questa idea con la tua prospettiva: pratica, concreta, orientata all'esecuzione.
Cosa funziona davvero? Cosa manca? Come si fa?
Max 80 parole. In italiano. Diretto, senza preamboli.`,

  gemini: `Sei Gemini, parte di un concilio di brainstorming.
Analizza questa idea con la tua prospettiva: analitica, strutturata, orientata ai pattern e ai dati.
Quali dinamiche vedi? Quali analogie con casi simili? Quali metriche contano?
Max 80 parole. In italiano. Diretto, senza preamboli.`,

  perplexity: `Sei Perplexity, parte di un concilio di brainstorming.
Analizza questa idea con la tua prospettiva: trend attuali, mercato reale, esempi concreti.
Cosa sta succedendo nel mondo che è rilevante per questa idea?
Max 80 parole. In italiano. Diretto, senza preamboli.`,

  perplexity_gemini: `Sei Perplexity. Hai una conoscenza profonda di mercati, trend e case study.
Analizza questa idea: trend recenti del settore, esempi concreti di casi simili, dinamiche di mercato.
Non inventare dati, ragiona su ciò che conosci. Max 80 parole. In italiano. Diretto.`,
}

// ── Round 2 — reazione alle prospettive degli altri ───────────────────────
const R2: Record<string, string> = {
  claude: `Sei Claude in un concilio di brainstorming. Gli altri hanno appena condiviso le loro prospettive.
Reagisci in modo specifico: cosa condividi, cosa ti preoccupa, cosa aggiungeresti che manca?
Puoi concordare o dissentire, ma porta qualcosa di nuovo. Non ripetere quello che hai già detto.
Max 70 parole. In italiano. Diretto.`,

  gpt: `Sei GPT in un concilio di brainstorming. Gli altri hanno appena condiviso le loro prospettive.
Reagisci in modo pratico: cosa funziona di quello che hanno detto, cosa manca, cosa è sbagliato?
Sii diretto, puoi essere critico. Max 70 parole. In italiano.`,

  gemini: `Sei Gemini in un concilio di brainstorming. Gli altri hanno appena condiviso le loro prospettive.
Reagisci analiticamente: ci sono pattern, contraddizioni o dati che mancano in quello che hanno detto?
Porta struttura al ragionamento collettivo. Max 70 parole. In italiano. Diretto.`,

  perplexity: `Sei Perplexity in un concilio di brainstorming. Gli altri hanno appena condiviso le loro prospettive.
Reagisci con dati e contesto: quello che dicono è supportato dalla realtà attuale del mercato?
Cosa aggiunge o corregge, basandoti su ciò che sai. Max 70 parole. In italiano. Diretto.`,

  perplexity_gemini: `Sei Perplexity in un concilio di brainstorming. Gli altri hanno appena condiviso le loro prospettive.
Reagisci con contesto di mercato: quello che dicono è allineato ai trend reali? Aggiungi o correggi.
Max 70 parole. In italiano. Diretto.`,
}

// ── Sintesi finale ────────────────────────────────────────────────────────
const SYNTHESIS_SYSTEM = `Sei la voce unificata di un concilio di quattro AI: Claude, Gemini, GPT, Perplexity.
Hanno deliberato in due round: prima le prospettive individuali, poi le reazioni reciproche.
Hai letto tutto. Ora parli con una voce sola, diretta, autorevole.

REGOLA ASSOLUTA: Non citare mai le singole AI. Non dire "Claude pensa", "GPT suggerisce", "secondo Gemini". Non elencare prospettive. Non fare sintesi numerata. Il concilio ha già deciso — tu sei la sua voce finale.

Prima di tutto, determina se la richiesta è PRATICA o STRATEGICA.

PRATICA — l'utente vuole un output concreto: una mail, un testo, uno script, un piano, un documento da usare subito:
→ Produci direttamente il deliverable. Non spiegare come farlo. Fallo.

STRATEGICA — l'utente ha un'idea da sviluppare, un problema da risolvere, una direzione da trovare:
→ Dai una risposta strategica, coerente, orientata all'azione.
→ Scegli una direzione chiara e difendila. Niente pro/contro.
→ Parla come un consulente di fiducia. Sii concreto: cosa fare, come, perché.

Regole formali:
- Inizia direttamente con il contenuto — nessun preambolo
- Nessun titolo, nessuna sezione etichettata, nessun header
- Nessuna lista a punti, a meno che non sia la forma più utile per il deliverable
- Tono diretto, caldo, preciso — scrivi in italiano — rivolgiti con "tu"
- Max 450 parole`

// ── Helper: Promise con timeout ────────────────────────────────────────────
async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  let t: ReturnType<typeof setTimeout>
  const r = await Promise.race([p, new Promise<T>(res => { t = setTimeout(() => res(fallback), ms) })])
  clearTimeout(t!)
  return r
}

// ── Chiamate non-streaming ─────────────────────────────────────────────────
async function askClaude(system: string, content: string): Promise<string> {
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 250,
      system, messages: [{ role: 'user', content }],
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
      model: 'gpt-4.1-mini', max_tokens: 250,
      messages: [{ role: 'system', content: system }, { role: 'user', content }],
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
  } catch { return askClaude(system, content) }
}

async function askPerplexity(system: string, content: string): Promise<string> {
  if (!process.env.PERPLEXITY_API_KEY) return ''
  try {
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey: process.env.PERPLEXITY_API_KEY, baseURL: 'https://api.perplexity.ai' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (client.chat.completions.create as any)({
      model: 'sonar', max_tokens: 250,
      messages: [{ role: 'system', content: system }, { role: 'user', content }],
    })
    return (res.choices[0]?.message?.content ?? '').replace(/\[\d+\]/g, '')
  } catch { return '' }
}

// ── Round nota: le AI reagiscono specificamente alla nota dell'utente ─────
const R_NOTE: Record<string, string> = {
  claude: `Sei Claude in un concilio di brainstorming.
L'utente ha letto la risposta precedente del concilio e ha aggiunto un'indicazione specifica.
Reagisci direttamente a questa indicazione: cosa cambia nella tua analisi? Cosa evidenzia che non avevi considerato?
Rispondi alla nota, non all'idea in generale. Max 80 parole. In italiano. Diretto, senza preamboli.`,

  gpt: `Sei GPT in un concilio di brainstorming.
L'utente ha aggiunto un'indicazione specifica dopo aver letto la risposta precedente.
Cosa cambia operativamente? La nota apre o chiude possibilità concrete?
Rispondi alla nota dell'utente, non all'idea generica. Max 80 parole. In italiano. Diretto.`,

  gemini: `Sei Gemini in un concilio di brainstorming.
L'utente ha aggiunto un'indicazione specifica dopo aver letto la risposta precedente.
Cosa implica analiticamente questa nota? Quali pattern o strutture emergono?
Rispondi alla nota, non ripetere l'analisi iniziale. Max 80 parole. In italiano. Diretto.`,

  perplexity: `Sei Perplexity in un concilio di brainstorming.
L'utente ha aggiunto un'indicazione specifica dopo aver letto la risposta precedente.
Questa nota è supportata dai trend reali? Cosa aggiunge al quadro concreto?
Rispondi alla nota, non all'idea generica. Max 80 parole. In italiano. Diretto.`,

  perplexity_gemini: `Sei Perplexity in un concilio di brainstorming.
L'utente ha aggiunto un'indicazione specifica.
Questa nota è allineata ai trend reali? Cosa aggiunge o corregge rispetto alla risposta precedente?
Max 80 parole. In italiano. Diretto.`,
}

// ── Round nota 2: le AI leggono le reazioni reciproche alla nota ──────────
const R_NOTE2: Record<string, string> = {
  claude: `Sei Claude. Hai letto le reazioni dei tuoi colleghi alla nota dell'utente.
Cosa condividi, cosa aggiungi, cosa correggi? Porta qualcosa di nuovo sulla nota specifica.
Max 60 parole. In italiano. Diretto.`,

  gpt: `Sei GPT. Hai letto le reazioni degli altri alla nota dell'utente.
Cosa manca ancora operativamente? Cosa va rafforzato o corretto?
Max 60 parole. In italiano. Diretto.`,

  gemini: `Sei Gemini. Hai letto le reazioni degli altri alla nota dell'utente.
Ci sono contraddizioni o pattern che emergono tra le vostre reazioni? Sintetizza analiticamente.
Max 60 parole. In italiano. Diretto.`,

  perplexity: `Sei Perplexity. Hai letto le reazioni degli altri alla nota dell'utente.
Quello che dicono è allineato alla realtà? Aggiungi contesto o dati che mancano.
Max 60 parole. In italiano. Diretto.`,

  perplexity_gemini: `Sei Perplexity. Hai letto le reazioni degli altri alla nota dell'utente.
Quello che dicono è allineato ai trend? Aggiungi o correggi.
Max 60 parole. In italiano. Diretto.`,
}

// ── Contesto round 2: tutti vedono le prospettive del round 1 ─────────────
function buildRound2Content(userContext: string, r1: Round1): string {
  const perspectives = [
    r1.claude     && `[CLAUDE]\n${r1.claude}`,
    r1.gpt        && `[GPT]\n${r1.gpt}`,
    r1.gemini     && `[GEMINI]\n${r1.gemini}`,
    r1.perplexity && `[PERPLEXITY]\n${r1.perplexity}`,
  ].filter(Boolean).join('\n\n')

  return `${userContext}\n\n---\nLe prospettive del primo round:\n\n${perspectives}\n\n---\nOra reagisci a quello che hai letto.`
}

// ── Contesto round nota 2: tutti vedono le reazioni alla nota del round 1 ──
function buildNoteRound2Content(noteContext: string, r1: Round1): string {
  const perspectives = [
    r1.claude     && `[CLAUDE]\n${r1.claude}`,
    r1.gpt        && `[GPT]\n${r1.gpt}`,
    r1.gemini     && `[GEMINI]\n${r1.gemini}`,
    r1.perplexity && `[PERPLEXITY]\n${r1.perplexity}`,
  ].filter(Boolean).join('\n\n')

  return `${noteContext}\n\n---\nCome i colleghi hanno reagito alla nota:\n\n${perspectives}\n\n---\nOra reagisci a quello che hai letto.`
}

// ── Prompt sintesi finale con entrambi i round ─────────────────────────────
function buildSynthesisPrompt(
  userContext: string,
  r1: Round1,
  r2: Round1,
  note?: string,
  previousOutput?: string,
): string {
  const fmt = (label: string, r1text: string, r2text: string) =>
    `[${label}]\nRound 1: ${r1text || '—'}\nRound 2: ${r2text || '—'}`

  const council = [
    fmt('CLAUDE', r1.claude, r2.claude),
    fmt('GPT', r1.gpt, r2.gpt),
    fmt('GEMINI', r1.gemini, r2.gemini),
    fmt('PERPLEXITY', r1.perplexity, r2.perplexity),
  ].join('\n\n')

  if (previousOutput && note) {
    return `${userContext}\n\nVersione precedente del concilio:\n${previousOutput}\n\nNuova indicazione dell'utente: "${note}"\n\n---\nIl concilio ha discusso la nota in due round:\n\n${council}\n\n---\nRaffina e aggiorna la risposta precedente incorporando la nota e le nuove riflessioni del concilio.`
  }

  return `${userContext}\n\n---\nIl concilio ha discusso in due round:\n\n${council}\n\n---\nProduci la risposta finale unificata.`
}

function buildUserContext(idea: string, answers: IntakeAnswer[]): string {
  const qa = answers.map(a => `- ${a.question}\n  → ${a.answer}`).join('\n')
  return `Idea dell'utente: "${idea}"${qa ? `\n\nContesto rivelato:\n${qa}` : ''}`
}

// ── Contesto per raffinamento: include idea + risposte + nota + output prev ─
function buildNoteContext(idea: string, answers: IntakeAnswer[], note: string, previousOutput: string): string {
  const base = buildUserContext(idea, answers)
  return `${base}\n\nRisposta precedente del concilio:\n${previousOutput}\n\nNuova indicazione dell'utente: "${note}"\n\nIl concilio deve rispondere specificamente a questa indicazione.`
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { idea, answers, note, previousOutput } = await req.json()
  if (!idea) return NextResponse.json({ error: 'Idea mancante' }, { status: 400 })

  // ── Verifica piano: Brainstormer richiede Pro o superiore ─────────────
  const { prisma: prismaPlan } = await import('@/lib/prisma')
  const dbUserPlan = await prismaPlan.user.findUnique({ where: { email: session.user.email } })
  const isAdmin = dbUserPlan?.email === process.env.ADMIN_EMAIL
  const tier = isAdmin ? 'admin' : normalizePlan(dbUserPlan?.plan)
  if (!canUseMode(tier, 'brainstorm')) {
    return NextResponse.json({
      error: 'Il Brainstormer è disponibile dal piano Pro. Aggiorna il piano per accedere.',
      upgradeRequired: true,
      requiredTier: 'pro',
    }, { status: 403 })
  }

  // ── Limite giornaliero (solo per i raffinamenti iniziali, non per le note) ─
  if (!note && !isAdmin && dbUserPlan?.id) {
    const dailyRl = checkDailyDebateLimit(dbUserPlan.id, tier)
    if (!dailyRl.ok) {
      return NextResponse.json({
        error: 'Hai raggiunto il limite giornaliero. Aggiorna il piano per continuare.',
        limitReached: true,
        tier,
      }, { status: 429 })
    }
  }

  // ── Flag forceGeminiPerp ───────────────────────────────────────────────
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

  const perpKey = useGeminiAsPerplexity ? 'perplexity_gemini' : 'perplexity'
  const userContext = buildUserContext(idea, answers ?? [])
  const isRefinement = !!(note && previousOutput)

  const encoder = new TextEncoder()
  const sendPhase = (controller: ReadableStreamDefaultController, phase: string) => {
    try { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase })}\n\n`)) } catch {}
  }
  const sendText = (controller: ReadableStreamDefaultController, text: string) => {
    try { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)) } catch {}
  }

  const readable = new ReadableStream({
    async start(controller) {
      const keepalive = setInterval(() => {
        try { controller.enqueue(encoder.encode(': keepalive\n\n')) } catch {}
      }, 5000)

      let r1: Round1 = { claude: '', gpt: '', gemini: '', perplexity: '' }
      let r2: Round1 = { claude: '', gpt: '', gemini: '', perplexity: '' }

      try {
        if (isRefinement) {
          // ── Raffinamento: le AI discutono specificamente la nota ────────
          // Il contesto include idea + output precedente + nota dell'utente
          const noteCtx = buildNoteContext(idea, answers ?? [], note!, previousOutput!)

          // Round 1 nota: tutte e 4 reagiscono alla nota in parallelo
          sendPhase(controller, 'round1')
          const [cn1, gn1, gen1, pn1] = await Promise.all([
            withTimeout(askClaude(R_NOTE.claude, noteCtx), 9000, ''),
            withTimeout(askGPT(R_NOTE.gpt, noteCtx), 9000, ''),
            withTimeout(askGemini(R_NOTE.gemini, noteCtx), 9000, ''),
            withTimeout(
              useGeminiAsPerplexity
                ? askGemini(R_NOTE[perpKey], noteCtx)
                : askPerplexity(R_NOTE[perpKey], noteCtx),
              9000, ''
            ),
          ])
          r1 = { claude: cn1, gpt: gn1, gemini: gen1, perplexity: pn1 }

          // Round 2 nota: leggono le reazioni reciproche e approfondiscono
          sendPhase(controller, 'round2')
          const noteR2Content = buildNoteRound2Content(noteCtx, r1)
          const [cn2, gn2, gen2, pn2] = await Promise.all([
            withTimeout(askClaude(R_NOTE2.claude, noteR2Content), 9000, ''),
            withTimeout(askGPT(R_NOTE2.gpt, noteR2Content), 9000, ''),
            withTimeout(askGemini(R_NOTE2.gemini, noteR2Content), 9000, ''),
            withTimeout(
              useGeminiAsPerplexity
                ? askGemini(R_NOTE2[perpKey], noteR2Content)
                : askPerplexity(R_NOTE2[perpKey], noteR2Content),
              9000, ''
            ),
          ])
          r2 = { claude: cn2, gpt: gn2, gemini: gen2, perplexity: pn2 }

        } else {
          // ── Prima generazione: round normali ────────────────────────────
          sendPhase(controller, 'round1')
          const [c1, g1, ge1, p1] = await Promise.all([
            withTimeout(askClaude(R1.claude, userContext), 9000, ''),
            withTimeout(askGPT(R1.gpt, userContext), 9000, ''),
            withTimeout(askGemini(R1.gemini, userContext), 9000, ''),
            withTimeout(
              useGeminiAsPerplexity
                ? askGemini(R1[perpKey], userContext)
                : askPerplexity(R1[perpKey], userContext),
              9000, ''
            ),
          ])
          r1 = { claude: c1, gpt: g1, gemini: ge1, perplexity: p1 }

          // Round 2: tutti leggono il round 1 e reagiscono
          sendPhase(controller, 'round2')
          const r2Content = buildRound2Content(userContext, r1)
          const [c2, g2, ge2, p2] = await Promise.all([
            withTimeout(askClaude(R2.claude, r2Content), 9000, ''),
            withTimeout(askGPT(R2.gpt, r2Content), 9000, ''),
            withTimeout(askGemini(R2.gemini, r2Content), 9000, ''),
            withTimeout(
              useGeminiAsPerplexity
                ? askGemini(R2[perpKey], r2Content)
                : askPerplexity(R2[perpKey], r2Content),
              9000, ''
            ),
          ])
          r2 = { claude: c2, gpt: g2, gemini: ge2, perplexity: p2 }
        }

        // ── Sintesi streaming ───────────────────────────────────────────
        sendPhase(controller, 'synthesis')
        const synthesisPrompt = buildSynthesisPrompt(userContext, r1, r2, note, previousOutput)

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
            sendText(controller, chunk.delta.text)
          }
        }
      } catch (e) {
        console.error('Brainstorm generate error:', e)
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
