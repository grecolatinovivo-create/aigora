import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const DIFFICULTY_PROMPTS: Record<string, string> = {
  easy: `Genera 2 posizioni per il gioco "Avvocato del Diavolo" a difficoltà FACILE.
Requisiti:
- Posizioni scomode, controintuitive, che la maggioranza troverebbe sbagliate — ma con qualche argomento difendibile se ci si pensa bene
- NON posizioni banali o già dibattute normalmente. Devono fare alzare un sopracciglio.
- Esempi del tono giusto: "I bugiardi abituali sono più affidabili degli onesti", "Crescere senza regole rende i figli più forti", "Il fallimento dovrebbe essere obbligatorio per tutti prima dei 30 anni", "I nerd avranno sempre torto sul piano umano"`,

  medium: `Genera 2 posizioni per il gioco "Avvocato del Diavolo" a difficoltà MEDIA.
Requisiti:
- Posizioni che la quasi totalità delle persone troverebbe moralmente o logicamente sbagliate
- Difendibili solo con argomenti molto creativi, paradossali o controintuitivi
- Esempi del tono giusto: "I bambini non dovrebbero avere diritti legali", "La compassione è il vizio più pericoloso della società moderna", "Eliminare l'istruzione obbligatoria migliorerebbe l'umanità", "Mentire ai propri cari è un atto d'amore superiore alla verità"`,

  impossible: `Genera 2 posizioni per il gioco "Avvocato del Diavolo" a difficoltà IMPOSSIBILE.
Requisiti:
- Posizioni che sembrano totalmente indifendibili, che la gente troverà scandalose o assurde
- L'utente dovrà trovare l'unico, sottilissimo filo logico su cui reggersi
- Esempi del tono giusto: "La crudeltà è la forma più onesta di rispetto", "La povertà è una scelta morale superiore alla ricchezza", "Il tradimento rafforza le relazioni più della fedeltà", "L'ignoranza deliberata è un diritto fondamentale da proteggere"`,
}

export async function POST(req: NextRequest) {
  try {
    const { difficulty } = await req.json()
    if (!difficulty || !DIFFICULTY_PROMPTS[difficulty]) {
      return NextResponse.json({ error: 'difficulty required' }, { status: 400 })
    }

    const systemPrompt = `Sei un generatore di posizioni provocatorie per un gioco di dibattito. Rispondi SOLO con un JSON array di 2 stringhe, nessun altro testo.
Il formato deve essere esattamente: ["posizione 1", "posizione 2"]
- Ogni posizione è un'affermazione secca, audace, senza attenuanti — non una domanda, non una sfumatura
- Devono essere genuinamente difficili da difendere: scomode, controintuitive, moralmente discutibili
- Varia i temi: relazioni umane, educazione, morale, lavoro, società, psicologia, potere, denaro
- NON usare posizioni banali o già sentite nel dibattito comune
- NON promuovere violenza fisica, odio etnico o razziale
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
