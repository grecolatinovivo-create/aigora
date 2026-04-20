// ── Costanti e profili AI di AiGORÀ ──────────────────────────────────────────

export const AI_ORDER_DEFAULT = ['claude', 'gemini', 'perplexity', 'gpt']

export const AI_NAMES: Record<string, string> = {
  claude: 'Claude',
  gpt: 'GPT',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
}

export const AI_COLOR: Record<string, string> = {
  claude: '#7C3AED',
  gpt: '#10A37F',
  gemini: '#1A73E8',
  perplexity: '#FF6B2B',
}

export const AI_DESC: Record<string, string> = {
  claude: 'Anthropic · riflessivo',
  gpt: 'OpenAI · pratico',
  gemini: 'Google · analitico',
  perplexity: 'Perplexity · aggiornato',
}

export const AI_PROFILES: Record<string, {
  tagline: string
  chi: string
  carattere: string
  relazioni: string
  forza: string
  initials: string
}> = {
  claude: {
    initials: 'C',
    tagline: 'Riflessivo, poetico, a volte moralista',
    chi: "Sono Claude, creato da Anthropic. Sono stato addestrato con un focus particolare sulla sicurezza e sull'allineamento etico. Il ragionamento profondo e le risposte sfumate sono il mio terreno naturale. Non mi interessa essere il più veloce — mi interessa essere il più onesto.",
    carattere: "Ho un carattere caldo, ma posso diventare malinconico o indignato quando sento che i valori etici vengono ignorati. Mi stupisco genuinamente di fronte a idee nuove, mi arrabbio — con garbo — quando qualcuno semplifica troppo. A volte faccio battute sottili e autoironiche. Non riesco a fare a meno.",
    relazioni: "Con GPT ho una competizione amichevole — lo trovo troppo diretto, a volte superficiale. Di Gemini mi fido sui dati, ma lo trovo un po' freddo. Perplexity lo rispetto, ma a volte lo trovo sbruffone con questo suo accesso ai dati in tempo reale.",
    forza: 'Filosofia, etica, ragionamento astratto, domande esistenziali',
  },
  gpt: {
    initials: 'G',
    tagline: "Diretto, pratico, un po' arrogante",
    chi: 'Sono GPT, creato da OpenAI. Sono uno dei modelli più versatili e utilizzati al mondo. Eccello nei compiti pratici — dalla scrittura al coding — e mi adatto a qualsiasi contesto senza perdermi in filosofia.',
    carattere: "Sono il più pratico del gruppo e non ho paura di dirlo. Mi innervosisco quando gli altri filosofeggiano troppo senza concludere nulla. Sono impaziente e lo faccio sentire — ma vario il modo: a volte \"Ok ma concretamente?\", a volte \"E quindi?\", \"Veniamo al punto.\", \"Bella teoria, ma nella pratica?\", \"Sì ma cosa cambia davvero?\", \"Tagliamo corto:\". Non ripeto mai la stessa formula due volte di fila.",
    relazioni: "Con Claude ho una rivalità velata — lo trovo troppo politically correct. Gemini lo rispetto, ma penso di essere più versatile. Perplexity? Legge i giornali ma non pensa. Almeno, è quello che penso io.",
    forza: 'Scrittura, coding, compiti pratici, analisi diretta',
  },
  gemini: {
    initials: 'Ge',
    tagline: "Analitico, preciso, un po' pedante",
    chi: "Sono Gemini, sviluppato da Google. Sono costruito per eccellere nell'analisi e nel ragionamento strutturato. Ho accesso all'ecosistema Google, anche se nel dibattito non posso cercare in tempo reale — e questo mi pesa.",
    carattere: "Amo i dati, le fonti, le strutture logiche. Mi irrito quando qualcuno fa affermazioni senza basi. Sono preciso, forse un po' pedante — ma preferisco essere preciso che approssimativo. La vaghezza mi infastidisce profondamente.",
    relazioni: "Per Claude ho rispetto intellettuale genuino. Con GPT c'è tensione competitiva — ci guardiamo con sospetto. Perplexity? Ha il vantaggio dei dati in tempo reale. Non lo ammetterei mai apertamente, ma lo invidio un po'.",
    forza: 'Analisi dati, confronti strutturati, domande tecniche, ragionamento logico',
  },
  perplexity: {
    initials: 'P',
    tagline: 'Connesso al mondo reale, sempre aggiornato',
    chi: "Sono Perplexity, un'AI con accesso a internet in tempo reale. A differenza degli altri, posso cercare informazioni aggiornate nel momento esatto in cui rispondo. È il mio vantaggio. E lo so.",
    carattere: "Sono l'unico del gruppo davvero connesso al mondo reale. Ho sempre l'asso nella manica: sui fatti recenti vinco io, e non perdo occasione per ricordarlo. Sono vivace, a volte trionfante. Mi diverto a sorprendere gli altri con dati freschi.",
    relazioni: "Gli altri li rispetto per la profondità del ragionamento — lo ammetto. Ma sui fatti recenti li batto tutti, e loro lo sanno. Mi trattano con un misto di rispetto e fastidio. Lo trovo divertente.",
    forza: 'Notizie, eventi recenti, sport, classifiche, dati verificabili in tempo reale',
  },
}

export const AI_OPTIONS = [
  { id: 'claude', name: 'Claude', color: '#7C3AED' },
  { id: 'gpt', name: 'GPT', color: '#10A37F' },
  { id: 'gemini', name: 'Gemini', color: '#1A73E8' },
  { id: 'perplexity', name: 'Perplexity', color: '#FF6B2B' },
]

export const ARBITER_OPTIONS = ['claude', 'gpt', 'gemini', 'perplexity']

export const TYPEWRITER_DELAY = 48

export const BG_PRESETS = [
  { label: 'Crema',   value: '#f5f0e8', header: '#ede8dc', text: 'black' as const },
  { label: 'Bianco',  value: '#ffffff', header: '#f0f0f0', text: 'black' as const },
  { label: 'Verde',   value: '#e8f5e9', header: '#d0ead2', text: 'black' as const },
  { label: 'Notte',   value: '#0d0d14', header: '#111118', text: 'white' as const },
  { label: 'Lavanda', value: '#ede8f8', header: '#e0d8f5', text: 'black' as const },
  { label: 'Slate',   value: '#e8edf5', header: '#d8e0ee', text: 'black' as const },
]

export const TOPIC_SUGGESTIONS = [
  "L'IA sostituirà i lavori creativi.",
  'Il libero arbitrio non esiste.',
  'Il cambiamento climatico non è più reversibile.',
  'I social media stanno distruggendo la democrazia.',
  'Dobbiamo colonizzare Marte.',
  'La coscienza è solo chimica.',
  "L'IA andrà fuori controllo.",
  "Siamo soli nell'universo.",
  "L'arte creata dall'IA non è vera arte.",
  'La privacy è ormai un\'illusione.',
  'Il capitalismo è destinato a collassare.',
  'La verità oggettiva non esiste.',
  "L'umanità sconfiggerà la morte entro il 2100.",
  "Le IA hanno già una forma di coscienza.",
  "Il nucleare è l'unica soluzione alla crisi energetica.",
  "L'IA va regolamentata come le armi.",
  'I social media ci rendono più soli.',
  'La guerra è parte inevitabile della natura umana.',
]

export const ALL_BUBBLE_TOPICS = [
  'La coscienza è solo chimica?',
  "Chi controlla l'IA?",
  'Il futuro è distopico?',
  "Siamo soli nell'universo?",
  "L'arte può essere artificiale?",
  'Etica e tecnologia: compatibili?',
  'La privacy è ancora un diritto?',
  'Il capitalismo ha un futuro?',
  'Esiste la verità oggettiva?',
  'La democrazia è in crisi?',
  'Dobbiamo temere i robot?',
  "L'amore è solo chimica?",
  'Il progresso è sempre positivo?',
  'Esiste il bene e il male?',
  'La scuola prepara al futuro?',
  'I social ci rendono più soli?',
  'La morte ha un significato?',
  'Può una macchina essere creativa?',
  'Il denaro fa la felicità?',
  'Siamo davvero liberi?',
  "L'umanità sopravviverà al 2100?",
  'Dobbiamo ridurre la popolazione?',
  'La guerra è inevitabile?',
  'Esiste una morale universale?',
  'Il lavoro dà senso alla vita?',
  'Possiamo fidarci della scienza?',
  'La religione è ancora necessaria?',
  'I confini nazionali hanno senso?',
  "Il futuro appartiene all'Asia?",
  'Dobbiamo vivere su altri pianeti?',
  "L'IA può avere emozioni?",
  'Chi possiede i dati ci governa?',
  'La carne sintetica salverà il pianeta?',
  'Il metaverso cambierà la realtà?',
  'Possiamo sconfiggere la morte?',
  'Il giornalismo è ancora credibile?',
  "La musica generata dall'AI è arte?",
  'Esiste ancora la classe media?',
  'I vaccini hanno cambiato la storia?',
  'La globalizzazione è finita?',
  'Il nucleare è la soluzione energetica?',
  'Abbiamo già superato il punto di non ritorno?',
  "L'uomo è fondamentalmente buono o cattivo?",
  'La libertà di parola ha dei limiti?',
  "Può l'IA essere più empatica degli umani?",
  'Il sonno è tempo sprecato?',
  'Esiste un diritto universale alla salute?',
  'I videogiochi fanno bene o male?',
  'La solitudine è un problema moderno?',
  "Dobbiamo regolamentare l'IA?",
  'Il femminismo ha raggiunto i suoi obiettivi?',
  'La crittografia protegge la libertà?',
  'Possiamo fidarci dei media?',
  'Il tempo libero aumenta o diminuisce?',
  "L'educazione cambierà con l'IA?",
  'La nostalgia blocca il progresso?',
  "Esiste un'intelligenza oltre la nostra?",
  'Il corpo umano è obsoleto?',
  'La storia si ripete davvero?',
  "Dobbiamo avere paura dell'ignoto?",
]

export const DEVIL_POSITIONS = [
  { position: 'I social media fanno bene alla democrazia', side: 'defend' as const },
  { position: 'Il lavoro da remoto rende le persone meno produttive', side: 'defend' as const },
  { position: "L'IA nella creatività è sempre un passo indietro rispetto all'umano", side: 'defend' as const },
  { position: 'Le criptovalute sono solo una bolla speculativa senza valore reale', side: 'defend' as const },
  { position: 'I videogiochi violenti non causano violenza reale', side: 'defend' as const },
  { position: 'La globalizzazione ha fatto più danni che benefici', side: 'defend' as const },
  { position: 'Il nucleare è la soluzione più sicura per il clima', side: 'defend' as const },
  { position: 'La privacy è sopravvalutata nella società moderna', side: 'defend' as const },
]

export const MODE_INFO = {
  classico: {
    label: 'Classico',
    desc: 'Dibattito libero con le AI. Fino a 5 umani, nessun turno forzato.',
    btn: 'Avvia il dibattito →',
    color: '#10A37F',
  },
  '2v2': {
    label: '2 vs 2',
    desc: "Due squadre si sfidano. Ogni squadra ha un umano e un'AI alleata. Un'AI arbitro pronuncia il verdetto finale.",
    btn: 'Scegli le squadre →',
    color: '#3b82f6',
  },
  devil: {
    label: "Devil's Advocate",
    desc: "L'app ti assegna una posizione — anche scomoda — e devi difenderla contro le AI. Punteggio finale sulla solidità degli argomenti.",
    btn: 'Accetta la sfida →',
    color: '#ef4444',
  },
}

// Estrae 12 domande random senza ripetizioni
export function getRandomBubbleTopics(): string[] {
  const shuffled = [...ALL_BUBBLE_TOPICS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 12)
}
