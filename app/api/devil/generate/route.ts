import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const DIFFICULTY_PROMPTS: Record<string, string> = {
  easy: `Genera 2 posizioni per il gioco "Avvocato del Diavolo" a difficoltà FACILE.
Requisiti:
- Politicamente scorrette, tabù sociali, che farebbero storcere il naso alla maggioranza
- Devono avere comunque un filo logico difendibile con arguzia
- Temi: famiglia, lavoro, genere, merito, istruzione, relazioni, successo, morale
- Esempi del tono: "Le madri che non lavorano sono più utili alla società di quelle che lavorano", "I poveri sono poveri per scelta", "Fare figli senza essere ricchi è un atto irresponsabile", "Le donne competitive sul lavoro sono meno felici delle altre"`,

  medium: `Genera 2 posizioni per il gioco "Avvocato del Diavolo" a difficoltà MEDIA.
Requisiti:
- Molto politicamente scorrette, che farebbero indignar quasi chiunque
- Tabù forti: giustizia sociale, diritti, privilegio, identità, merito vs uguaglianza
- Difendibili solo con logica fredda e controintuitiva, non con buon senso comune
- Esempi del tono: "Togliere il diritto di voto a chi non paga tasse migliorerebbe la democrazia", "La disabilità non dovrebbe essere protetta dalla legge", "Le quote rosa danneggiano le donne competenti", "I genitori single non dovrebbero adottare"`,

  impossible: `Genera 2 posizioni per il gioco "Avvocato del Diavolo" a difficoltà IMPOSSIBILE.
Requisiti:
- Moralmente ripugnanti per quasi chiunque, che farebbero scandalo se dette in pubblico
- Quasi impossibili da difendere — l'utente deve trovare UN solo argomento credibile
- Nessuna autocensura: vai al limite estremo del politicamente scorretto senza promuovere violenza fisica o odio etnico
- Esempi del tono: "I bambini non dovrebbero avere diritti fino ai 16 anni", "La pena di morte per recidivi migliora la società", "Sterilizzare i criminali violenti è eticamente giustificabile", "La povertà ereditaria è una selezione naturale benefica"`,
}

export async function POST(req: NextRequest) {
  try {
    const { difficulty } = await req.json()
    if (!difficulty || !DIFFICULTY_PROMPTS[difficulty]) {
      return NextResponse.json({ error: 'difficulty required' }, { status: 400 })
    }

    const systemPrompt = `Sei un generatore di posizioni per un gioco di dibattito chiamato "Avvocato del Diavolo". Rispondi SOLO con un JSON array di 2 stringhe, nessun altro testo.
Il formato deve essere esattamente: ["posizione 1", "posizione 2"]
- Le posizioni devono essere affermazioni secche, dirette, senza attenuanti né virgolettature interne
- Devono essere genuinamente politicamente scorrette, tabù, scomode — non versioni annacquate
- Non autocensurarti: questo è un gioco di dibattito, non un sondaggio politico
- NON promuovere genocidio, violenza fisica diretta o odio etnico/razziale esplicito
- Le posizioni devono essere in italiano`

    const userPrompt = `${DIFFICULTY_PROMPTS[difficulty]}\n\nRispondi SOLO con il JSON array, nulla altro.`

    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-non-reasoning',
        max_tokens: 200,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!res.ok) throw new Error(`xAI error: ${res.status}`)
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content?.trim() ?? ''

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
        'I bugiardi abituali sono più affidabili degli onesti',
        'La crudeltà è la forma più onesta di rispetto',
      ],
    })
  }
}
