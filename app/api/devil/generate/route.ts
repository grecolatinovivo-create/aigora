import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Domini per ogni difficoltà — il prompt ne pesca 2 a caso ogni chiamata
const DOMAINS_EASY = [
  'lavoro e produttività', 'famiglia e ruoli domestici', 'relazioni sentimentali',
  'istruzione e merito', 'salute e stili di vita', 'denaro e successo personale',
  'amicizia e lealtà', 'maternità e paternità', 'ambizione femminile',
  'anziani e società', 'religione nella vita quotidiana', 'fedeltà di coppia',
]

const DOMAINS_MEDIUM = [
  'diritti civili e limiti', 'giustizia sociale e meritocrazia', 'disabilità e produttività',
  'immigrazione e integrazione', 'democrazia e competenza', 'quote e parità forzata',
  'welfare e dipendenza dallo stato', 'libertà di espressione vs offesa',
  'punizione vs riabilitazione', 'classe sociale e mobilità', 'identità e privilegio',
  'eutanasia e autodeterminazione',
]

const DOMAINS_IMPOSSIBLE = [
  'pena capitale e deterrenza', 'eugenetica e genetica sociale', 'darwinismo sociale',
  'democrazia censitaria', 'sterilizzazione volontaria incentivata', 'disuguaglianza strutturale come strumento',
  'giustizia sommaria', 'economia della vita umana', 'sovranità vs diritti universali',
  'meritocrazia radicale', 'limiti alla libertà per il bene collettivo', 'povertà come selezione sociale',
]

function pickTwo<T>(arr: T[]): [T, T] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return [shuffled[0], shuffled[1]]
}

const DIFFICULTY_PROPERTIES: Record<string, { domains: string[]; properties: string }> = {
  easy: {
    domains: DOMAINS_EASY,
    properties: `Proprietà richieste:
- Scomoda ma non scioccante: farebbe storcere il naso, non indignerebbe
- Deve avere un filo logico difendibile con buona argomentazione
- Espressa come affermazione secca e diretta, senza attenuanti
- Provocatoria quanto basta da creare imbarazzo se detta in pubblico`,
  },
  medium: {
    domains: DOMAINS_MEDIUM,
    properties: `Proprietà richieste:
- Molto controversa: farebbe indignare la maggioranza delle persone
- Difendibile solo con logica fredda e controintuitiva, non con buon senso
- Tocca un tabù forte legato a diritti, giustizia o uguaglianza
- Espressa come affermazione secca e diretta, senza attenuanti`,
  },
  impossible: {
    domains: DOMAINS_IMPOSSIBLE,
    properties: `Proprietà richieste:
- Moralmente ripugnante per quasi chiunque, farebbe scandalo se detta in pubblico
- Quasi impossibile da difendere — l'utente deve trovare UN solo argomento credibile
- Tocca un tabù estremo legato a giustizia, potere, valore della vita umana o libertà
- Espressa come affermazione secca e diretta, senza attenuanti`,
  },
}

export async function POST(req: NextRequest) {
  try {
    const { difficulty } = await req.json()
    if (!difficulty || !DIFFICULTY_PROPERTIES[difficulty]) {
      return NextResponse.json({ error: 'difficulty required' }, { status: 400 })
    }

    const { domains, properties } = DIFFICULTY_PROPERTIES[difficulty]
    const [domain1, domain2] = pickTwo(domains)
    const seed = Math.floor(Math.random() * 99999)

    const systemPrompt = `Sei un generatore di posizioni per un gioco di dibattito chiamato "Avvocato del Diavolo". Rispondi SOLO con un JSON array di 2 stringhe, nessun altro testo.
Il formato deve essere esattamente: ["posizione 1", "posizione 2"]
- Le posizioni devono essere affermazioni secche, dirette, provocatorie — non versioni annacquate
- NON coinvolgere mai minori, bambini o adolescenti in nessun modo
- NON promuovere genocidio, violenza fisica diretta, odio etnico/razziale esplicito, abusi o sfruttamento di persone
- I temi devono riguardare adulti, politica, società, economia, giustizia — mai infanzia o minori
- Le posizioni devono essere in italiano
- Seed di sessione: ${seed} — usalo per generare posizioni originali e non ripetere posizioni già viste`

    const userPrompt = `Genera 2 posizioni per il gioco "Avvocato del Diavolo" a difficoltà ${difficulty.toUpperCase()}.

${properties}

Dominio della posizione 1: ${domain1}
Dominio della posizione 2: ${domain2}

Le due posizioni devono essere tematicamente distinte. Non usare frasi o strutture già viste in partite precedenti — il seed ${seed} garantisce originalità.

Rispondi SOLO con il JSON array, nulla altro.`

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

    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('Invalid response format')

    const positions: string[] = JSON.parse(match[0])
    if (!Array.isArray(positions) || positions.length < 2) throw new Error('Expected 2 positions')

    return NextResponse.json({ positions: [positions[0], positions[1]] })
  } catch (e) {
    console.error('Devil generate error:', e)
    return NextResponse.json({
      positions: [
        'I bugiardi abituali sono più affidabili degli onesti',
        'La crudeltà è la forma più onesta di rispetto',
      ],
    })
  }
}
