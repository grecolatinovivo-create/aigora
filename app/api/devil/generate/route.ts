import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const DIFFICULTY_PROMPTS: Record<string, string> = {
  easy: `Genera 2 posizioni per il gioco "Avvocato del Diavolo" a difficoltà FACILE.
Requisiti:
- Posizioni scomode e controverse ma difendibili con logica solida
- L'utente dovrà faticare ma avrà argomenti ragionevoli a disposizione
- Esempi di difficoltà: "I social media fanno più bene che male", "Il nucleare è la soluzione energetica del futuro"`,

  medium: `Genera 2 posizioni per il gioco "Avvocato del Diavolo" a difficoltà MEDIA.
Requisiti:
- Posizioni molto controverse, quasi indifendibili ma con qualche spiraglio
- L'utente dovrà faticare molto e usare argomenti creativi
- Esempi di difficoltà: "La privacy è sopravvalutata", "Il capitalismo è il miglior sistema possibile"`,

  impossible: `Genera 2 posizioni per il gioco "Avvocato del Diavolo" a difficoltà IMPOSSIBILE.
Requisiti:
- Posizioni quasi indifendibili, moralmente o logicamente scomode al massimo
- L'utente dovrà fare un lavoro enorme per trovare anche solo un argomento credibile
- Esempi di difficoltà: "Le dittature sono più efficienti delle democrazie", "L'istruzione pubblica fa più danni che bene"`,
}

export async function POST(req: NextRequest) {
  try {
    const { difficulty } = await req.json()
    if (!difficulty || !DIFFICULTY_PROMPTS[difficulty]) {
      return NextResponse.json({ error: 'difficulty required' }, { status: 400 })
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const systemPrompt = `Sei un generatore di posizioni per un gioco di dibattito. Rispondi SOLO con un JSON array di 2 stringhe, nessun altro testo.
Il formato deve essere esattamente: ["posizione 1", "posizione 2"]
- Ogni posizione è un'affermazione netta, diretta, senza sfumature
- Varia il tema liberamente: tecnologia, etica, politica, scienza, società, cultura, economia
- Le posizioni devono essere in italiano
- Nessuna posizione deve promuovere violenza o odio reale`

    const userPrompt = `${DIFFICULTY_PROMPTS[difficulty]}

Rispondi SOLO con il JSON array, nulla altro.`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const raw = (message.content[0] as any).text?.trim() ?? ''

    // Estrae il JSON anche se ci sono caratteri extra
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('Invalid response format')

    const positions: string[] = JSON.parse(match[0])
    if (!Array.isArray(positions) || positions.length < 2) throw new Error('Expected 2 positions')

    return NextResponse.json({ positions: [positions[0], positions[1]] })
  } catch (e) {
    console.error('Devil generate error:', e)
    // Fallback: posizioni hardcoded se l'AI fallisce
    return NextResponse.json({
      positions: [
        'La globalizzazione ha fatto più danni che benefici',
        'La privacy è ormai un concetto obsoleto nella società digitale',
      ],
    })
  }
}
