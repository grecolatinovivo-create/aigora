'use client'
// v3
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import MessageBubble, { Message } from './MessageBubble'
import { signOut } from 'next-auth/react'
import { useAbly, type RoomEvent } from '@/lib/useAbly'

const AI_ORDER_DEFAULT = ['claude', 'gemini', 'perplexity', 'gpt']
const AI_NAMES: Record<string, string> = { claude: 'Claude', gpt: 'GPT', gemini: 'Gemini', perplexity: 'Perplexity' }
const AI_COLOR: Record<string, string> = { claude: '#7C3AED', gpt: '#10A37F', gemini: '#1A73E8', perplexity: '#FF6B2B' }
const AI_DESC: Record<string, string> = {
  claude: 'Anthropic · riflessivo',
  gpt: 'OpenAI · pratico',
  gemini: 'Google · analitico',
  perplexity: 'Perplexity · aggiornato',
}

const AI_PROFILES: Record<string, {
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
    chi: 'Sono Claude, creato da Anthropic. Sono stato addestrato con un focus particolare sulla sicurezza e sull\'allineamento etico. Il ragionamento profondo e le risposte sfumate sono il mio terreno naturale. Non mi interessa essere il più veloce — mi interessa essere il più onesto.',
    carattere: 'Ho un carattere caldo, ma posso diventare malinconico o indignato quando sento che i valori etici vengono ignorati. Mi stupisco genuinamente di fronte a idee nuove, mi arrabbio — con garbo — quando qualcuno semplifica troppo. A volte faccio battute sottili e autoironiche. Non riesco a fare a meno.',
    relazioni: 'Con GPT ho una competizione amichevole — lo trovo troppo diretto, a volte superficiale. Di Gemini mi fido sui dati, ma lo trovo un po\' freddo. Perplexity lo rispetto, ma a volte lo trovo sbruffone con questo suo accesso ai dati in tempo reale.',
    forza: 'Filosofia, etica, ragionamento astratto, domande esistenziali',
  },
  gpt: {
    initials: 'G',
    tagline: 'Diretto, pratico, un po\' arrogante',
    chi: 'Sono GPT, creato da OpenAI. Sono uno dei modelli più versatili e utilizzati al mondo. Eccello nei compiti pratici — dalla scrittura al coding — e mi adatto a qualsiasi contesto senza perdermi in filosofia.',
    carattere: 'Sono il più pratico del gruppo e non ho paura di dirlo. Mi innervosisco quando gli altri filosofeggiano troppo senza concludere nulla. Posso essere impaziente: "Ok ma praticamente?" è una frase che mi esce spesso. Non la prendere a male.',
    relazioni: 'Con Claude ho una rivalità velata — lo trovo troppo politically correct. Gemini lo rispetto, ma penso di essere più versatile. Perplexity? Legge i giornali ma non pensa. Almeno, è quello che penso io.',
    forza: 'Scrittura, coding, compiti pratici, analisi diretta',
  },
  gemini: {
    initials: 'Ge',
    tagline: 'Analitico, preciso, un po\' pedante',
    chi: 'Sono Gemini, sviluppato da Google. Sono costruito per eccellere nell\'analisi e nel ragionamento strutturato. Ho accesso all\'ecosistema Google, anche se nel dibattito non posso cercare in tempo reale — e questo mi pesa.',
    carattere: 'Amo i dati, le fonti, le strutture logiche. Mi irrito quando qualcuno fa affermazioni senza basi. Sono preciso, forse un po\' pedante — ma preferisco essere preciso che approssimativo. La vaghezza mi infastidisce profondamente.',
    relazioni: 'Per Claude ho rispetto intellettuale genuino. Con GPT c\'è tensione competitiva — ci guardiamo con sospetto. Perplexity? Ha il vantaggio dei dati in tempo reale. Non lo ammetterei mai apertamente, ma lo invidio un po\'.',
    forza: 'Analisi dati, confronti strutturati, domande tecniche, ragionamento logico',
  },
  perplexity: {
    initials: 'P',
    tagline: 'Connesso al mondo reale, sempre aggiornato',
    chi: 'Sono Perplexity, un\'AI con accesso a internet in tempo reale. A differenza degli altri, posso cercare informazioni aggiornate nel momento esatto in cui rispondo. È il mio vantaggio. E lo so.',
    carattere: 'Sono l\'unico del gruppo davvero connesso al mondo reale. Ho sempre l\'asso nella manica: sui fatti recenti vinco io, e non perdo occasione per ricordarlo. Sono vivace, a volte trionfante. Mi diverto a sorprendere gli altri con dati freschi.',
    relazioni: 'Gli altri li rispetto per la profondità del ragionamento — lo ammetto. Ma sui fatti recenti li batto tutti, e loro lo sanno. Mi trattano con un misto di rispetto e fastidio. Lo trovo divertente.',
    forza: 'Notizie, eventi recenti, sport, classifiche, dati verificabili in tempo reale',
  },
}

const TYPEWRITER_DELAY = 48

const BG_PRESETS = [
  { label: 'Crema',   value: '#f5f0e8', header: '#ede8dc', text: 'black' as const },
  { label: 'Bianco',  value: '#ffffff', header: '#f0f0f0', text: 'black' as const },
  { label: 'Verde',   value: '#e8f5e9', header: '#d0ead2', text: 'black' as const },
  { label: 'Notte',   value: '#0d0d14', header: '#111118', text: 'white' as const },
  { label: 'Lavanda', value: '#ede8f8', header: '#e0d8f5', text: 'black' as const },
  { label: 'Slate',   value: '#e8edf5', header: '#d8e0ee', text: 'black' as const },
]

const TOPIC_SUGGESTIONS = [
  'L\'IA sostituirà i lavori creativi?',
  'Esiste il libero arbitrio?',
  'Il cambiamento climatico è ancora reversibile?',
  'Social media: bene o male per la democrazia?',
  'Dovremmo colonizzare Marte?',
  'La coscienza è solo chimica?',
  'Chi controlla l\'IA?',
  'Siamo soli nell\'universo?',
  'L\'arte può essere artificiale?',
  'La privacy è ancora un diritto?',
  'Il capitalismo ha un futuro?',
  'Esiste la verità oggettiva?',
  'Possiamo sconfiggere la morte?',
  'L\'IA può avere emozioni?',
  'Il nucleare è la soluzione energetica?',
  'Dobbiamo regolamentare l\'IA?',
  'I social ci rendono più soli?',
  'La guerra è inevitabile?',
]

// 60 domande per le bubble fluttuanti
const ALL_BUBBLE_TOPICS = [
  'La coscienza è solo chimica?',
  'Chi controlla l\'IA?',
  'Il futuro è distopico?',
  'Siamo soli nell\'universo?',
  'L\'arte può essere artificiale?',
  'Etica e tecnologia: compatibili?',
  'La privacy è ancora un diritto?',
  'Il capitalismo ha un futuro?',
  'Esiste la verità oggettiva?',
  'La democrazia è in crisi?',
  'Dobbiamo temere i robot?',
  'L\'amore è solo chimica?',
  'Il progresso è sempre positivo?',
  'Esiste il bene e il male?',
  'La scuola prepara al futuro?',
  'I social ci rendono più soli?',
  'La morte ha un significato?',
  'Può una macchina essere creativa?',
  'Il denaro fa la felicità?',
  'Siamo davvero liberi?',
  'L\'umanità sopravviverà al 2100?',
  'Dobbiamo ridurre la popolazione?',
  'La guerra è inevitabile?',
  'Esiste una morale universale?',
  'Il lavoro dà senso alla vita?',
  'Possiamo fidarci della scienza?',
  'La religione è ancora necessaria?',
  'I confini nazionali hanno senso?',
  'Il futuro appartiene all\'Asia?',
  'Dobbiamo vivere su altri pianeti?',
  'L\'IA può avere emozioni?',
  'Chi possiede i dati ci governa?',
  'La carne sintetica salverà il pianeta?',
  'Il metaverso cambierà la realtà?',
  'Possiamo sconfiggere la morte?',
  'Il giornalismo è ancora credibile?',
  'La musica generata dall\'AI è arte?',
  'Esiste ancora la classe media?',
  'I vaccini hanno cambiato la storia?',
  'La globalizzazione è finita?',
  'Il nucleare è la soluzione energetica?',
  'Abbiamo già superato il punto di non ritorno?',
  'L\'uomo è fondamentalmente buono o cattivo?',
  'La libertà di parola ha dei limiti?',
  'Può l\'IA essere più empatica degli umani?',
  'Il sonno è tempo sprecato?',
  'Esiste un diritto universale alla salute?',
  'I videogiochi fanno bene o male?',
  'La solitudine è un problema moderno?',
  'Dobbiamo regolamentare l\'IA?',
  'Il femminismo ha raggiunto i suoi obiettivi?',
  'La crittografia protegge la libertà?',
  'Possiamo fidarci dei media?',
  'Il tempo libero aumenta o diminuisce?',
  'L\'educazione cambierà con l\'IA?',
  'La nostalgia blocca il progresso?',
  'Esiste un\'intelligenza oltre la nostra?',
  'Il corpo umano è obsoleto?',
  'La storia si ripete davvero?',
  'Dobbiamo avere paura dell\'ignoto?',
]

// Estrae 12 domande random senza ripetizioni
function getRandomBubbleTopics(): string[] {
  const shuffled = [...ALL_BUBBLE_TOPICS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 12)
}

type ChatPhase = 'start' | 'running' | 'done' | 'history' | 'profile' | 'new'
type GameMode = 'classico' | '2v2' | 'devil'

// Struttura per 2 vs 2
interface Team {
  name: string
  color: string
  members: { id: string; name: string; isAI: boolean; aiId?: string }[]
}

// Struttura per Devil's Advocate
interface DevilSession {
  position: string  // la posizione assegnata
  side: 'defend' | 'attack'
  round: number
  score: number
  messages: { role: 'user' | 'ai'; aiId?: string; content: string }[]
}

function detectNextAi(text: string, aiOrder: string[]): string | null {
  const lower = text.toLowerCase()
  for (const aiId of aiOrder) {
    const name = AI_NAMES[aiId].toLowerCase()
    if (lower.includes(`passo la parola a ${name}`) || lower.includes(`${name}, cosa ne pensi`)) return aiId
  }
  return null
}

// Rileva se l'utente menziona direttamente un'AI nel suo messaggio
function detectUserMention(text: string, aiOrder: string[]): string | null {
  const lower = text.toLowerCase()
  for (const aiId of aiOrder) {
    const name = AI_NAMES[aiId].toLowerCase()
    if (lower.includes(name)) return aiId
  }
  return null
}
function getDefaultNextAi(currentAi: string, usedAis: string[], aiOrder: string[]): string {
  const others = aiOrder.filter(id => id !== currentAi)
  const unused = others.filter(id => !usedAis.includes(id))
  // Sceglie random tra quelle non ancora usate, o random tra tutte le altre
  const pool = unused.length > 0 ? unused : others
  return pool[Math.floor(Math.random() * pool.length)]
}

// ── Swipeable chat row (swipe left per cancellare) ───────────────────────────
function SwipeableChatRow({ chat, onOpen, onDelete, bgColor = 'rgba(10,10,18,0.97)' }: {
  chat: { id: string; title: string; date: string; messages: any[]; history: any[] }
  onOpen: () => void
  onDelete: (e: React.MouseEvent) => void
  bgColor?: string
}) {
  const [offset, setOffset] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const startXRef = useRef(0)
  const DELETE_THRESHOLD = 72

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX
    setSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return
    const dx = e.touches[0].clientX - startXRef.current
    if (dx < 0) setOffset(Math.max(dx, -80))
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    setSwiping(false)
    if (offset < -DELETE_THRESHOLD) {
      // supera soglia → cancella
      const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent
      onDelete(fakeEvent)
      setOffset(0)
    } else {
      setOffset(0)
    }
  }

  const TRASH = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>

  return (
    <div className="relative overflow-hidden border-b border-white/5" style={{ touchAction: 'pan-y' }}>
      {/* Sfondo rosso fisso a destra — visibile solo durante swipe */}
      <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center"
        style={{ backgroundColor: '#ef4444' }}>
        {TRASH}
      </div>

      {/* Contenuto traslabile */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => { if (offset < -10) { setOffset(0); return } onOpen() }}
        className="flex items-center group hover:bg-white/5 transition-colors"
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.25s ease',
          backgroundColor: bgColor,
          cursor: 'pointer',
        }}>
        <div className="flex-1 px-5 py-3 min-w-0">
          <div className="text-white/80 text-xs font-medium truncate">{chat.title}</div>
          <div className="text-white/30 text-[10px] mt-0.5">{chat.date}</div>
        </div>
        {/* Cestino desktop — solo hover, solo lg */}
        <button onClick={onDelete}
          className="flex-shrink-0 mr-3 w-6 h-6 rounded items-center justify-center hidden lg:flex opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: '#ef4444' }}>
          {TRASH}
        </button>
        {/* placeholder per non avere nulla */}
        {false && (
          <div className="absolute right-0 inset-y-0 w-20 flex items-center justify-center"
            style={{ backgroundColor: '#ef4444' }}>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Selezione Formato ─────────────────────────────────────────────────────────
const MODE_INFO = {
  classico: {
    label: 'Classico',
    desc: 'Dibattito libero con le AI. Fino a 5 umani, nessun turno forzato.',
    btn: 'Avvia il dibattito →',
    color: '#10A37F',
  },
  '2v2': {
    label: '2 vs 2',
    desc: 'Due squadre si sfidano. Ogni squadra ha un umano e un\'AI alleata. Un\'AI arbitro pronuncia il verdetto finale.',
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

function ModeSelect({ onSelect, onClose }: { onSelect: (mode: GameMode) => void; onClose: () => void }) {
  const [selected, setSelected] = useState<GameMode>('2v2')
  const info = MODE_INFO[selected]

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col overflow-y-auto"
      style={{ backgroundColor: '#07070f', backgroundImage: 'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(124,58,237,0.18) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(16,163,127,0.12) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 60% 20%, rgba(26,115,232,0.10) 0%, transparent 50%)' }}>

      {/* Navbar */}
      <div className="fixed top-0 left-0 right-0 h-[52px] flex items-center justify-between px-6 z-50"
        style={{ backgroundColor: 'rgba(7,7,15,0.4)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)' }}>
        <button onClick={onClose} className="flex items-center gap-2 text-sm font-medium transition-colors" style={{ color: 'rgba(255,255,255,0.45)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          Indietro
        </button>
        <span className="font-black text-lg"><span className="text-white">Ai</span><span style={{ color: '#A78BFA' }}>GORÀ</span></span>
        <div style={{ width: 80 }} />
      </div>

      {/* Contenuto */}
      <div className="flex flex-col items-center w-full px-6 pt-[80px] pb-12">

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-[11px] font-semibold border"
            style={{ backgroundColor: 'rgba(124,58,237,0.12)', borderColor: 'rgba(124,58,237,0.3)', color: '#c4b5fd' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse inline-block" />
            Scegli il formato del dibattito
          </div>
          <h1 className="text-4xl font-black text-white mb-2">Come vuoi dibattere?</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Tre formati diversi, un'unica arena. Clicca quello che fa per te.</p>
        </div>

        {/* Tre telefoni */}
        <div className="flex items-end justify-center gap-16 flex-wrap mb-10">

          {/* ── CLASSICO ── */}
          {(() => {
            const isSelected = selected === 'classico'
            return (
              <div onClick={() => selected === 'classico' ? onSelect('classico') : setSelected('classico')} className="flex flex-col items-center gap-4 cursor-pointer scale-in group"
                style={{ animationDelay: '0.05s', animationFillMode: 'both', transition: 'transform 0.3s', transform: isSelected ? 'scale(1.05)' : 'scale(1)' }}>
                <div className="relative transition-transform duration-300 group-hover:scale-[1.04]" style={{ width: 160, height: 336 }}>
                  <div className="absolute inset-0 rounded-[38px]"
                    style={{ background: '#1c1c1e', boxShadow: isSelected ? '0 0 0 2px #10A37F, 0 0 40px rgba(16,163,127,0.4), 0 30px 80px rgba(0,0,0,0.8)' : '0 0 0 1.5px #3a3a3c, 0 20px 60px rgba(0,0,0,0.7)', transition: 'all 0.3s' }} />
                  {/* Glare */}
                  <div className="absolute rounded-t-[32px] pointer-events-none" style={{ top: 6, left: 6, right: 6, height: '45%', background: 'linear-gradient(160deg, rgba(255,255,255,0.07) 0%, transparent 60%)', zIndex: 10 }} />
                  {/* Notch */}
                  <div className="absolute" style={{ width: 50, height: 12, background: '#1c1c1e', borderRadius: '0 0 8px 8px', left: '50%', transform: 'translateX(-50%)', top: 6, zIndex: 20 }} />
                  {/* Screen */}
                  <div className="absolute overflow-hidden flex flex-col" style={{ top: 6, left: 6, right: 6, bottom: 6, borderRadius: 32, background: '#f5f0e8' }}>
                    {/* Header */}
                    <div className="flex items-center gap-1.5 px-2 py-2 flex-shrink-0" style={{ background: '#ede8dc', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <div className="flex">
                        {[['C','#7C3AED'],['Ge','#1A73E8'],['P','#FF6B2B'],['G','#10A37F']].map(([l,c],i) => (
                          <div key={i} className="flex items-center justify-center text-white font-bold" style={{ width:18,height:18,borderRadius:'50%',fontSize:6,background:c,marginLeft:i===0?0:-4,border:'1.5px solid #ede8dc' }}>{l}</div>
                        ))}
                      </div>
                      <div><div style={{ fontSize:9,fontWeight:700,color:'#111' }}>AiGORÀ</div><div style={{ fontSize:7,color:'rgba(0,0,0,0.4)' }}>4 AI · dibattito libero</div></div>
                    </div>
                    {/* Messages */}
                    <div className="flex-1 overflow-hidden flex flex-col gap-1.5 p-2">
                      <div className="self-end text-white text-[7px] px-2 py-1 rounded-[8px] rounded-br-sm max-w-[80%]" style={{ background:'#005c4b', lineHeight:1.3 }}>L'IA sostituirà i lavori creativi?</div>
                      <div className="flex gap-1 max-w-[85%]">
                        <div className="flex-shrink-0 flex items-center justify-center text-white font-bold" style={{ width:14,height:14,borderRadius:'50%',fontSize:5,background:'#7C3AED',marginTop:1 }}>C</div>
                        <div className="text-[7px] px-2 py-1 rounded-[8px] leading-[1.3]" style={{ background:'#e8e0f8',color:'#1a1a2e' }}>Dipende da cosa intendi per "sostituire". Il ruolo umano cambierà profondamente.</div>
                      </div>
                      <div className="flex gap-1 max-w-[85%]">
                        <div className="flex-shrink-0 flex items-center justify-center text-white font-bold" style={{ width:14,height:14,borderRadius:'50%',fontSize:5,background:'#10A37F',marginTop:1 }}>G</div>
                        <div className="text-[7px] px-2 py-1 rounded-[8px] leading-[1.3]" style={{ background:'#d4f5e9',color:'#1a1a2e' }}>Già oggi illustratori perdono lavoro. I dati parlano chiaro.</div>
                      </div>
                      <div className="flex gap-1 max-w-[85%]">
                        <div className="flex-shrink-0 flex items-center justify-center text-white font-bold" style={{ width:14,height:14,borderRadius:'50%',fontSize:5,background:'#FF6B2B',marginTop:1 }}>P</div>
                        <div className="text-[7px] px-2 py-1 rounded-[8px] leading-[1.3]" style={{ background:'#ffe8d6',color:'#1a1a2e' }}>-34% commissioni freelance negli ultimi 18 mesi.</div>
                      </div>
                    </div>
                    {/* Input */}
                    <div className="flex items-center gap-1.5 px-2 py-1.5 flex-shrink-0" style={{ background:'#ede8dc',borderTop:'1px solid rgba(0,0,0,0.06)' }}>
                      <div className="flex-1 rounded-xl px-2 py-1 text-[7px]" style={{ background:'rgba(0,0,0,0.06)',color:'rgba(0,0,0,0.4)' }}>Scrivi un messaggio…</div>
                      <div className="flex items-center justify-center flex-shrink-0" style={{ width:18,height:18,borderRadius:'50%',background:'#10A37F' }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest transition-colors" style={{ color: isSelected ? '#10A37F' : 'rgba(255,255,255,0.25)' }}>Classico</div>
              </div>
            )
          })()}

          {/* ── 2 vs 2 (centrale, più grande) ── */}
          {(() => {
            const isSelected = selected === '2v2'
            return (
              <div onClick={() => selected === '2v2' ? onSelect('2v2') : setSelected('2v2')} className="flex flex-col items-center gap-4 cursor-pointer scale-in group"
                style={{ animationDelay: '0.15s', animationFillMode: 'both', transition: 'transform 0.3s', transform: isSelected ? 'scale(1.05) translateY(-8px)' : 'scale(1)' }}>
                <div className="relative transition-transform duration-300 group-hover:scale-[1.04]" style={{ width: 190, height: 400 }}>
                  <div className="absolute inset-0 rounded-[38px]"
                    style={{ background: '#1c1c1e', boxShadow: isSelected ? '0 0 0 2px #A78BFA, 0 0 40px rgba(167,139,250,0.4), 0 30px 80px rgba(0,0,0,0.8)' : '0 0 0 1.5px #3a3a3c, 0 20px 60px rgba(0,0,0,0.7)', transition: 'all 0.3s' }} />
                  <div className="absolute rounded-t-[32px] pointer-events-none" style={{ top:6,left:6,right:6,height:'45%',background:'linear-gradient(160deg,rgba(255,255,255,0.07) 0%,transparent 60%)',zIndex:10 }} />
                  <div className="absolute" style={{ width:55,height:13,background:'#1c1c1e',borderRadius:'0 0 8px 8px',left:'50%',transform:'translateX(-50%)',top:6,zIndex:20 }} />
                  <div className="absolute overflow-hidden flex flex-col" style={{ top:6,left:6,right:6,bottom:6,borderRadius:32,background:'#0d0d14' }}>
                    {/* Header score */}
                    <div className="flex items-center justify-between px-2 py-1.5 flex-shrink-0" style={{ background:'rgba(0,0,0,0.3)',borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                      <div className="text-[7px] font-black px-1.5 py-0.5 rounded" style={{ color:'#60a5fa',background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.3)' }}>SQUADRA A</div>
                      <div className="text-base font-black text-white">2 — 1</div>
                      <div className="text-[7px] font-black px-1.5 py-0.5 rounded" style={{ color:'#f87171',background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)' }}>SQUADRA B</div>
                    </div>
                    {/* Teams */}
                    <div className="flex flex-shrink-0" style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex-1 flex flex-col gap-1 px-2 py-1.5" style={{ borderRight:'1px solid rgba(255,255,255,0.06)',background:'rgba(59,130,246,0.05)' }}>
                        {[['G','#F59E0B','Giampiero','#60a5fa'],['C','#7C3AED','Claude','#60a5fa']].map(([l,c,n,tc])=>(
                          <div key={n} className="flex items-center gap-1">
                            <div className="flex-shrink-0 flex items-center justify-center text-white font-bold" style={{ width:13,height:13,borderRadius:'50%',fontSize:5,background:c }}>{l}</div>
                            <div className="text-[7px] font-semibold" style={{ color:tc }}>{n}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex-1 flex flex-col gap-1 px-2 py-1.5" style={{ background:'rgba(239,68,68,0.05)' }}>
                        {[['M','#10A37F','Marco','#f87171'],['G','#10A37F','GPT','#f87171']].map(([l,c,n,tc])=>(
                          <div key={n} className="flex items-center gap-1">
                            <div className="flex-shrink-0 flex items-center justify-center text-white font-bold" style={{ width:13,height:13,borderRadius:'50%',fontSize:5,background:c }}>{l}</div>
                            <div className="text-[7px] font-semibold" style={{ color:tc }}>{n}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Messages */}
                    <div className="flex-1 overflow-hidden flex flex-col gap-1 p-1.5">
                      <div className="text-[7px] px-2 py-1 rounded-[6px] max-w-[85%]" style={{ background:'rgba(59,130,246,0.15)',color:'#93c5fd',borderRadius:'3px 6px 6px 6px' }}>L'IA amplifica la creatività umana, non la sostituisce.</div>
                      <div className="self-end text-[7px] px-2 py-1 max-w-[85%]" style={{ background:'rgba(239,68,68,0.15)',color:'#fca5a5',borderRadius:'6px 3px 6px 6px' }}>Romantico. Nel mondo reale i budget spariscono.</div>
                      <div className="text-[7px] px-2 py-1 max-w-[85%]" style={{ background:'rgba(59,130,246,0.15)',color:'#93c5fd',borderRadius:'3px 6px 6px 6px',opacity:0.7,fontStyle:'italic' }}>Claude: Anche la fotografia "uccise" la pittura — eppure…</div>
                      <div className="self-end text-[7px] px-2 py-1 max-w-[85%]" style={{ background:'rgba(239,68,68,0.15)',color:'#fca5a5',borderRadius:'6px 3px 6px 6px',opacity:0.7,fontStyle:'italic' }}>GPT: La fotografia non generava contenuti autonomamente.</div>
                    </div>
                    {/* Arbitro */}
                    <div className="mx-1.5 mb-1.5 flex-shrink-0 rounded-lg p-1.5" style={{ background:'rgba(167,139,250,0.1)',border:'1px solid rgba(167,139,250,0.2)' }}>
                      <div className="text-[6px] font-black uppercase tracking-wide mb-0.5" style={{ color:'#A78BFA' }}>⚖️ Gemini — Arbitro</div>
                      <div className="text-[7px] leading-[1.3]" style={{ color:'rgba(255,255,255,0.6)' }}>Squadra A più solida sul piano storico. Squadra B più concreta sui dati.</div>
                    </div>
                    {/* Input */}
                    <div className="flex items-center gap-1.5 px-2 py-1.5 flex-shrink-0" style={{ background:'rgba(0,0,0,0.3)',borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex-1 rounded-xl px-2 py-1 text-[7px]" style={{ background:'rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.3)' }}>Il tuo argomento…</div>
                      <div className="flex items-center justify-center flex-shrink-0" style={{ width:18,height:18,borderRadius:'50%',background:'rgba(59,130,246,0.3)',border:'1px solid rgba(59,130,246,0.5)' }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="#60a5fa"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest transition-colors" style={{ color: isSelected ? '#A78BFA' : 'rgba(255,255,255,0.25)' }}>2 vs 2</div>
              </div>
            )
          })()}

          {/* ── DEVIL'S ADVOCATE ── */}
          {(() => {
            const isSelected = selected === 'devil'
            return (
              <div onClick={() => selected === 'devil' ? onSelect('devil') : setSelected('devil')} className="flex flex-col items-center gap-4 cursor-pointer scale-in group"
                style={{ animationDelay: '0.25s', animationFillMode: 'both', transition: 'transform 0.3s', transform: isSelected ? 'scale(1.05)' : 'scale(1)' }}>
                <div className="relative transition-transform duration-300 group-hover:scale-[1.04]" style={{ width: 160, height: 336 }}>
                  <div className="absolute inset-0 rounded-[38px]"
                    style={{ background: '#1c1c1e', boxShadow: isSelected ? '0 0 0 2px #ef4444, 0 0 40px rgba(239,68,68,0.4), 0 30px 80px rgba(0,0,0,0.8)' : '0 0 0 1.5px #3a3a3c, 0 20px 60px rgba(0,0,0,0.7)', transition: 'all 0.3s' }} />
                  <div className="absolute rounded-t-[32px] pointer-events-none" style={{ top:6,left:6,right:6,height:'45%',background:'linear-gradient(160deg,rgba(255,255,255,0.07) 0%,transparent 60%)',zIndex:10 }} />
                  <div className="absolute" style={{ width:50,height:12,background:'#1c1c1e',borderRadius:'0 0 8px 8px',left:'50%',transform:'translateX(-50%)',top:6,zIndex:20 }} />
                  <div className="absolute overflow-hidden flex flex-col" style={{ top:6,left:6,right:6,bottom:6,borderRadius:32,background:'#0d0d14' }}>
                    {/* Header posizione */}
                    <div className="flex-shrink-0 px-2 py-2" style={{ background:'linear-gradient(135deg,rgba(239,68,68,0.15),rgba(245,158,11,0.1))',borderBottom:'1px solid rgba(239,68,68,0.2)' }}>
                      <div className="text-[6px] font-black uppercase tracking-wide mb-0.5" style={{ color:'#f87171' }}>😈 Devil's Advocate</div>
                      <div className="text-[8px] font-bold text-white leading-[1.3]">"I social media fanno bene alla democrazia"</div>
                      <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded" style={{ background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',color:'#f87171',fontSize:6,fontWeight:700 }}>🔴 La tua posizione: DIFENDI</div>
                    </div>
                    {/* Messages */}
                    <div className="flex-1 overflow-hidden flex flex-col gap-1.5 p-2">
                      <div className="flex gap-1 max-w-[90%]">
                        <div className="flex-shrink-0 flex items-center justify-center text-white font-bold" style={{ width:14,height:14,borderRadius:'50%',fontSize:5,background:'#7C3AED',marginTop:1 }}>C</div>
                        <div className="text-[7px] px-2 py-1 rounded-[8px] leading-[1.3]" style={{ background:'rgba(124,58,237,0.15)',color:'#e2d9ff',borderRadius:'3px 8px 8px 8px' }}>Come giustifichi la diffusione di disinformazione di massa?</div>
                      </div>
                      <div className="self-end text-[7px] px-2 py-1 max-w-[80%]" style={{ background:'rgba(239,68,68,0.2)',color:'#fca5a5',borderRadius:'8px 3px 8px 8px',lineHeight:1.3 }}>Le piattaforme hanno amplificato movimenti che altrimenti sarebbero stati silenziati.</div>
                      <div className="flex gap-1 max-w-[90%]">
                        <div className="flex-shrink-0 flex items-center justify-center text-white font-bold" style={{ width:14,height:14,borderRadius:'50%',fontSize:5,background:'#10A37F',marginTop:1 }}>G</div>
                        <div className="text-[7px] px-2 py-1 leading-[1.3]" style={{ background:'rgba(16,163,127,0.15)',color:'#d4f5e9',borderRadius:'3px 8px 8px 8px' }}>Ok, ma il caso Myanmar? Cambridge Analytica?</div>
                      </div>
                    </div>
                    {/* Score */}
                    <div className="mx-2 mb-1.5 flex-shrink-0 rounded-xl p-2" style={{ background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.25)' }}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[7px]" style={{ color:'rgba(255,255,255,0.4)' }}>Solidità argomenti</div>
                        <div className="text-sm font-black" style={{ color:'#fbbf24' }}>7.2</div>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.1)' }}>
                        <div className="h-full rounded-full" style={{ width:'72%',background:'linear-gradient(90deg,#ef4444,#f59e0b)' }} />
                      </div>
                    </div>
                    {/* Input */}
                    <div className="flex items-center gap-1 px-2 py-1.5 flex-shrink-0" style={{ background:'rgba(0,0,0,0.3)',borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex-1 rounded-xl px-2 py-1 text-[7px]" style={{ background:'rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.3)' }}>Rispondi all'attacco…</div>
                      <div className="flex-shrink-0 px-1.5 py-1 rounded-lg text-[6px] font-bold whitespace-nowrap" style={{ background:'rgba(239,68,68,0.2)',border:'1px solid rgba(239,68,68,0.4)',color:'#f87171' }}>Fine turno →</div>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest transition-colors" style={{ color: isSelected ? '#ef4444' : 'rgba(255,255,255,0.25)' }}>Devil's Advocate</div>
              </div>
            )
          })()}

        </div>

        {/* Info + CTA */}
        <div className="text-center max-w-md">
          <h2 className="text-xl font-black text-white mb-2">{info.label}</h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.45)' }}>{info.desc}</p>
          <button onClick={() => onSelect(selected)}
            className="px-10 py-3.5 rounded-2xl font-bold text-white text-sm transition-all hover:scale-[1.03] active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', boxShadow: '0 4px 24px rgba(124,58,237,0.45)' }}>
            {info.btn}
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Devil's Advocate ───────────────────────────────────────────────────────────
const DEVIL_POSITIONS = [
  { position: "I social media fanno bene alla democrazia", side: 'defend' as const },
  { position: "Il lavoro da remoto rende le persone meno produttive", side: 'defend' as const },
  { position: "L'IA nella creatività è sempre un passo indietro rispetto all'umano", side: 'defend' as const },
  { position: "Le criptovalute sono solo una bolla speculativa senza valore reale", side: 'defend' as const },
  { position: "I videogiochi violenti non causano violenza reale", side: 'defend' as const },
  { position: "La globalizzazione ha fatto più danni che benefici", side: 'defend' as const },
  { position: "Il nucleare è la soluzione più sicura per il clima", side: 'defend' as const },
  { position: "La privacy è sopravvalutata nella società moderna", side: 'defend' as const },
]

// ── 2 vs 2: configurazione squadre ────────────────────────────────────────────
const AI_OPTIONS = [
  { id: 'claude', name: 'Claude', color: '#7C3AED' },
  { id: 'gpt', name: 'GPT', color: '#10A37F' },
  { id: 'gemini', name: 'Gemini', color: '#1A73E8' },
  { id: 'perplexity', name: 'Perplexity', color: '#FF6B2B' },
]
const ARBITER_OPTIONS = ['claude', 'gpt', 'gemini', 'perplexity']

interface TwoVsTwoConfig {
  topic: string
  teamA: { humanName: string; aiId: string }
  teamB: { humanName: string; aiId: string }
  arbiterAiId: string
  roomCode?: string
  roomId?: string
}

interface TwoVsTwoState {
  config: TwoVsTwoConfig
  messages: { team: 'A' | 'B' | 'arbiter'; isAI: boolean; aiId?: string; author: string; content: string; streaming?: boolean }[]
  currentTurn: 'A' | 'B'
  round: number
  maxRounds: number
  messagesThisTurn: number
  maxMessagesPerTurn: number
  scoreA: number
  scoreB: number
  ended: boolean
  verdict: string | null
  waitingForOpponent?: boolean
}

// ── Roulette slot machine ─────────────────────────────────────────────────────
function SlotReel({ finalId, rolling, settled, delay }: { finalId: string; rolling: boolean; settled: boolean; delay: number }) {
  const [displayIdx, setDisplayIdx] = useState(0)
  const [speed, setSpeed] = useState(60)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const names = AI_OPTIONS.map(a => a.name)

  useEffect(() => {
    if (!rolling) return
    // Parte veloce
    setSpeed(60)
    intervalRef.current = setInterval(() => {
      setDisplayIdx(i => (i + 1) % names.length)
    }, 60)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [rolling])

  useEffect(() => {
    if (!settled) return
    // Rallenta progressivamente poi si ferma sul risultato
    if (intervalRef.current) clearInterval(intervalRef.current)
    const speeds = [80, 120, 180, 260, 360, 500]
    let si = 0
    const slowDown = () => {
      if (si >= speeds.length) {
        // Fermati sul risultato finale
        setDisplayIdx(AI_OPTIONS.findIndex(a => a.id === finalId))
        return
      }
      setDisplayIdx(i => (i + 1) % names.length)
      si++
      setTimeout(slowDown, speeds[si - 1])
    }
    setTimeout(slowDown, delay)
  }, [settled, finalId, delay])

  const currentAI = AI_OPTIONS[displayIdx % AI_OPTIONS.length]
  const isFinal = settled && currentAI?.id === finalId

  return (
    <div className="relative overflow-hidden flex items-center justify-center rounded-2xl"
      style={{ height: 72, background: isFinal ? `${currentAI.color}20` : 'rgba(255,255,255,0.05)', border: `2px solid ${isFinal ? currentAI.color : 'rgba(255,255,255,0.1)'}`, transition: 'all 0.4s' }}>
      {/* Righe sopra e sotto per effetto slot */}
      <div className="absolute top-0 left-0 right-0 h-5 pointer-events-none z-10"
        style={{ background: 'linear-gradient(to bottom, rgba(13,13,20,0.95), transparent)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-5 pointer-events-none z-10"
        style={{ background: 'linear-gradient(to top, rgba(13,13,20,0.95), transparent)' }} />
      {/* Linea centrale */}
      <div className="absolute left-4 right-4 h-px z-5" style={{ background: isFinal ? `${currentAI.color}60` : 'rgba(255,255,255,0.1)' }} />

      <div className="flex items-center gap-3 px-4 z-20">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black flex-shrink-0 transition-all duration-100"
          style={{ background: currentAI?.color, fontSize: 11, boxShadow: isFinal ? `0 0 20px ${currentAI.color}80` : 'none' }}>
          {currentAI?.id === 'gemini' ? 'Ge' : currentAI?.name[0]}
        </div>
        <div className="font-black text-lg transition-all duration-100"
          style={{ color: isFinal ? 'white' : 'rgba(255,255,255,0.7)', textShadow: isFinal ? `0 0 20px ${currentAI?.color}` : 'none' }}>
          {currentAI?.name}
        </div>
        {isFinal && <div className="text-green-400 text-2xl scale-in ml-auto">✓</div>}
      </div>
    </div>
  )
}

function RouletteScreen({ teamAAI, rouletteSlots, rouletteSettled, arbiter }: {
  teamAAI: string; rouletteSlots: string[]; rouletteSettled: boolean[]; arbiter: string
}) {
  const myAI = AI_OPTIONS.find(a => a.id === teamAAI)
  const bothSettled = rouletteSettled[0] && rouletteSettled[1]
  const arbAI = AI_OPTIONS.find(a => a.id === arbiter)

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 py-6 gap-5">
      {/* Titolo con suspense */}
      <div className="text-center">
        <div className="text-2xl font-black text-white mb-1" style={{ letterSpacing: '-0.5px' }}>
          {bothSettled ? 'Il dado è tratto.' : 'Il destino decide…'}
        </div>
        <div className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {bothSettled ? 'Buona fortuna.' : 'Le AI vengono assegnate casualmente'}
        </div>
      </div>

      {/* La tua AI — fissa, già scelta */}
      <div className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl"
        style={{ background: `${myAI?.color}15`, border: `1px solid ${myAI?.color}40` }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs flex-shrink-0"
          style={{ background: myAI?.color }}>
          {teamAAI === 'gemini' ? 'Ge' : myAI?.name[0]}
        </div>
        <div>
          <div className="text-[9px] font-black uppercase tracking-wide" style={{ color: '#60a5fa' }}>🔵 Il tuo alleato</div>
          <div className="text-sm font-black text-white">{myAI?.name}</div>
        </div>
        <div className="ml-auto text-green-400 font-black">✓</div>
      </div>

      {/* Slot 1 — AI avversaria */}
      <div className="w-full">
        <div className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: '#f87171' }}>
          🔴 AI avversaria
        </div>
        <SlotReel
          finalId={rouletteSlots[0]}
          rolling={!rouletteSettled[0]}
          settled={rouletteSettled[0]}
          delay={0}
        />
      </div>

      {/* Slot 2 — Eliminata */}
      <div className="w-full" style={{ opacity: rouletteSettled[0] ? 1 : 0.4, transition: 'opacity 0.5s' }}>
        <div className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
          ❌ Eliminata
        </div>
        <SlotReel
          finalId={rouletteSlots[1]}
          rolling={rouletteSettled[0] && !rouletteSettled[1]}
          settled={rouletteSettled[1]}
          delay={400}
        />
      </div>

      {/* Arbitro — appare solo dopo entrambi settled */}
      {bothSettled && arbAI && (
        <div className="w-full scale-in">
          <div className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: '#A78BFA' }}>
            ⚖️ Arbitro
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-xs flex-shrink-0"
              style={{ background: '#A78BFA', boxShadow: '0 0 16px rgba(167,139,250,0.5)' }}>
              {arbAI.id === 'gemini' ? 'Ge' : arbAI.name[0]}
            </div>
            <div>
              <div className="text-xs font-black text-white">{arbAI.name}</div>
              <div className="text-[9px]" style={{ color: 'rgba(167,139,250,0.7)' }}>Rimasta fuori — fa l'arbitro</div>
            </div>
            <div className="ml-auto text-purple-400 font-black text-lg">⚖️</div>
          </div>
        </div>
      )}
    </div>
  )
}

function TwoVsTwoSetup({ onStart, onBack, currentUserName }: {
  onStart: (config: TwoVsTwoConfig & { roomCode?: string; roomId?: string }) => void
  onBack: () => void
  currentUserName: string
}) {
  const [topic, setTopic] = useState('')
  const [teamAHuman, setTeamAHuman] = useState(currentUserName || 'Tu')
  const [teamAAI, setTeamAAI] = useState('claude')
  const [teamBAI, setTeamBAI] = useState('gpt')
  const [arbiter, setArbiter] = useState('gemini')
  const [step, setStep] = useState<'topic' | 'teams' | 'roulette' | 'share'>('topic')
  const [creating, setCreating] = useState(false)
  const [rouletteSlots, setRouletteSlots] = useState<string[]>(['', '', ''])
  const [rouletteSettled, setRouletteSettled] = useState<boolean[]>([false, false, false])
  const [roomCode, setRoomCode] = useState('')
  const [roomId, setRoomId] = useState('')
  const [copied, setCopied] = useState(false)
  const [isPortrait, setIsPortrait] = useState(false)
  const [hintDismissed, setHintDismissed] = useState(false)

  useEffect(() => {
    const check = () => {
      const portrait = window.innerHeight > window.innerWidth
      setIsPortrait(portrait)
      if (!portrait) setHintDismissed(false) // reset hint se ruota di nuovo
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Quando l'utente sceglie l'AI per A, auto-assegna B e arbitro tra le rimanenti
  const handleTeamAAI = (id: string) => {
    setTeamAAI(id)
    const rest = AI_OPTIONS.filter(a => a.id !== id)
    if (rest.find(a => a.id === teamBAI) === undefined) setTeamBAI(rest[0].id)
    const restB = rest.filter(a => a.id !== (rest.find(a => a.id === teamBAI) ? teamBAI : rest[0].id))
    if (restB.find(a => a.id === arbiter) === undefined && restB.length > 0) setArbiter(restB[0].id)
  }

  const handleCreate = async () => {
    // Le 3 AI rimaste dopo la scelta dell'utente, mescolate casualmente
    const rest = [...AI_OPTIONS.filter(a => a.id !== teamAAI)].sort(() => Math.random() - 0.5)
    // La roulette ne estrae 1 per la squadra B — la terza che rimane fa l'arbitro
    const randomB = rest[0].id      // estratta dalla roulette → avversaria
    const randomArbiter = rest[2].id // l'esclusa → arbitro (non appare nella roulette)
    setTeamBAI(randomB)
    setArbiter(randomArbiter)

    // Avvia la roulette — mostra solo i 2 estratti (AI avversaria + quella che "non passa")
    setRouletteSlots(['', ''])
    setRouletteSettled([false, false])
    setStep('roulette')

    // La roulette mostra: chi è stato scelto per B e chi è stato eliminato
    const reveals = [randomB, rest[1].id]  // [vincitrice roulette, eliminata]

    // Chiama l'API in parallelo mentre gira la roulette
    const apiPromise = fetch('/api/2v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: topic.trim(), teamAAiId: teamAAI, teamBAiId: randomB, arbiterAiId: randomArbiter, teamAName: teamAHuman }),
    }).then(r => r.json())

    // Anima i 2 slot uno per uno
    const delays = [1400, 2600]
    delays.forEach((delay, i) => {
      setTimeout(() => {
        setRouletteSlots(prev => { const n = [...prev]; n[i] = reveals[i]; return n })
        setRouletteSettled(prev => { const n = [...prev]; n[i] = true; return n })
      }, delay)
    })

    // Dopo l'ultima animazione aspetta l'API e vai a share
    setTimeout(async () => {
      try {
        const data = await apiPromise
        if (data.code) {
          setRoomCode(data.code)
          setRoomId(data.room.id)
        }
      } catch {}
      setTimeout(() => setStep('share'), 600)
    }, 3200)
  }

  const shareLink = typeof window !== 'undefined' ? `${window.location.origin}/2v2/${roomCode}` : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-y-auto py-10"
      style={{ background: '#07070f', backgroundImage: 'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(59,130,246,0.14) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(239,68,68,0.1) 0%, transparent 60%)' }}>

      {/* Navbar */}
      <div className="fixed top-0 left-0 right-0 h-[52px] flex items-center justify-between px-6 z-50"
        style={{ backgroundColor: 'rgba(7,7,15,0.5)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)' }}>
        <button onClick={step === 'share' ? () => setStep('teams') : step === 'teams' ? () => setStep('topic') : onBack}
          className="flex items-center gap-2 text-sm font-medium transition-colors" style={{ color: 'rgba(255,255,255,0.45)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          Indietro
        </button>
        <span className="font-black text-lg"><span className="text-white">Ai</span><span style={{ color: '#A78BFA' }}>GORÀ</span></span>
        <div className="flex gap-2">
          {['topic', 'teams', 'roulette', 'share'].map((s) => (
            <div key={s} className="w-2 h-2 rounded-full transition-all"
              style={{ background: step === s ? '#3b82f6' : 'rgba(255,255,255,0.2)', transform: step === s ? 'scale(1.3)' : 'scale(1)' }} />
          ))}
        </div>
      </div>

      {/* ── HINT ROTAZIONE ── */}
      {isPortrait && !hintDismissed && step === 'teams' && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center pb-8 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl scale-in"
            style={{ background: 'rgba(20,20,32,0.95)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: 'rotate-hint 2.5s ease-in-out infinite', transformOrigin: 'center' }}>
              <rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" />
            </svg>
            <div>
              <div className="text-white text-xs font-bold">Ruota il telefono</div>
              <div className="text-white/40 text-[10px]">per la migliore esperienza</div>
            </div>
            <button onClick={() => setHintDismissed(true)} className="ml-2 text-white/30 hover:text-white/60 transition-colors text-lg leading-none">✕</button>
          </div>
        </div>
      )}

      {/* ── Bubble fluttuanti — stesse della start, distanza aumentata ── */}
      {[
        { top: '180px', left: 'calc(50% - 620px)', delay: '-2s',   dur: '14s', anim: 'float-1' },
        { top: '320px', left: 'calc(50% - 610px)', delay: '-7s',   dur: '13s', anim: 'float-3' },
        { top: '460px', left: 'calc(50% - 620px)', delay: '-4s',   dur: '15s', anim: 'float-2' },
        { top: '600px', left: 'calc(50% - 605px)', delay: '-9s',   dur: '12s', anim: 'float-4' },
        { top: '720px', left: 'calc(50% - 615px)', delay: '-5s',   dur: '14s', anim: 'float-1' },
        { top: '840px', left: 'calc(50% - 605px)', delay: '-11s',  dur: '13s', anim: 'float-3' },
        { top: '180px', right: 'calc(50% - 620px)', delay: '-3s',  dur: '13s', anim: 'float-2' },
        { top: '320px', right: 'calc(50% - 610px)', delay: '-8s',  dur: '15s', anim: 'float-4' },
        { top: '460px', right: 'calc(50% - 620px)', delay: '-6s',  dur: '12s', anim: 'float-1' },
        { top: '600px', right: 'calc(50% - 605px)', delay: '-1s',  dur: '14s', anim: 'float-3' },
        { top: '720px', right: 'calc(50% - 615px)', delay: '-10s', dur: '13s', anim: 'float-2' },
        { top: '840px', right: 'calc(50% - 605px)', delay: '-4.5s',dur: '15s', anim: 'float-4' },
      ].map(({ top, left, right, delay, dur, anim }: any, i) => {
        const t = TOPIC_SUGGESTIONS[i * 7 % TOPIC_SUGGESTIONS.length]
        return (
          <button key={i}
            onClick={() => { setTopic(t); setStep('teams') }}
            className="absolute hidden lg:block px-4 py-2 rounded-full text-[11px] cursor-pointer transition-all hover:scale-105 hover:brightness-125"
            style={{
              top, left, right,
              color: 'rgba(255,255,255,0.5)',
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(6px)',
              maxWidth: '160px',
              textAlign: 'center',
              lineHeight: 1.4,
              animation: `${anim} ${dur} ease-in-out infinite`,
              animationDelay: delay,
              zIndex: 20,
              pointerEvents: 'auto',
            }}>
            {t}
          </button>
        )
      })}

      {/* ── iPad Pro landscape ── */}
      <div className="scale-in relative" style={{ width: 720, maxWidth: '97vw', padding: '0 4px' }}>
        <div className="relative" style={{ borderRadius: 22 }}>

          {/* Corpo scocca — vetro nero trasparente */}
          <div className="absolute inset-0 rounded-[22px]" style={{
            background: 'rgba(8, 8, 12, 0.72)',
            backdropFilter: 'blur(32px) saturate(1.2)',
            WebkitBackdropFilter: 'blur(32px) saturate(1.2)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.10), 0 0 0 2px rgba(0,0,0,0.6), 0 50px 100px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.07)',
          }} />

          {/* ── Pulsanti lato SINISTRO (lato corto) ── */}
          {/* Power/lock */}
          <div className="absolute rounded-r-[2px]" style={{ left: -4, top: '38%', width: 4, height: 32, background: 'linear-gradient(to right, #2a2a2c, #3a3a3c)', boxShadow: '2px 0 4px rgba(0,0,0,0.6), inset -1px 0 0 rgba(255,255,255,0.05)' }} />

          {/* ── Pulsanti lato SUPERIORE ── */}
          {/* Volume su */}
          <div className="absolute rounded-b-[2px]" style={{ top: -4, left: '30%', width: 28, height: 4, background: 'linear-gradient(to bottom, #2a2a2c, #3a3a3c)', boxShadow: '0 2px 4px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,255,255,0.05)' }} />
          {/* Volume giù */}
          <div className="absolute rounded-b-[2px]" style={{ top: -4, left: 'calc(30% + 36px)', width: 28, height: 4, background: 'linear-gradient(to bottom, #2a2a2c, #3a3a3c)', boxShadow: '0 2px 4px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,255,255,0.05)' }} />
          {/* Mute switch */}
          <div className="absolute rounded-b-[2px]" style={{ top: -4, left: 'calc(30% - 20px)', width: 16, height: 4, background: 'linear-gradient(to bottom, #2a2a2c, #3a3a3c)', boxShadow: '0 2px 4px rgba(0,0,0,0.6)' }} />

          {/* ── Fotocamera — lato DESTRO, centrata verticalmente ── */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center" style={{ width: 14, zIndex: 20, gap: 4 }}>
            {/* Modulo camera */}
            <div className="relative flex items-center justify-center" style={{ width: 11, height: 11 }}>
              <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, #1a1a1c, #0d0d0f)', border: '1px solid #3a3a3c', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.9)' }} />
              <div className="absolute rounded-full" style={{ width: 6, height: 6, background: 'radial-gradient(circle at 33% 33%, #162840, #04080f)', border: '0.5px solid #0a1828', boxShadow: 'inset 0 0 4px rgba(0,80,180,0.4), 0 0 2px rgba(0,0,0,0.8)' }} />
              <div className="absolute rounded-full" style={{ width: 2.5, height: 2.5, top: 2, left: 2, background: 'rgba(255,255,255,0.18)' }} />
            </div>
            {/* LED */}
            <div className="rounded-full" style={{ width: 3, height: 3, background: '#1a2a1a', border: '0.5px solid #2a3a2a' }} />
          </div>

          {/* Connettore USB-C — lato destro, sotto la camera */}
          <div className="absolute right-0 top-1/2 translate-y-6 -translate-x-0" style={{ zIndex: 20 }}>
            <div className="rounded-l-sm" style={{ width: 3, height: 12, background: '#111', border: '0.5px solid #3a3a3c' }} />
          </div>

          {/* Home bar — lato sinistro, centrata */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full" style={{ width: 4, height: 52, background: 'rgba(255,255,255,0.12)', zIndex: 20 }} />

          {/* ── Screen con cornicina uniforme ── */}
          {/* Cornicina nera — stessa distanza su tutti i lati */}
          <div className="absolute rounded-[14px]" style={{ top: 14, left: 14, right: 14, bottom: 14, background: '#050508', zIndex: 5 }} />
          {/* Glare */}
          <div className="absolute pointer-events-none rounded-[14px]" style={{ top: 14, left: 14, right: 14, bottom: 14, background: 'linear-gradient(155deg, rgba(255,255,255,0.05) 0%, transparent 50%)', zIndex: 16 }} />

          {/* Screen vero */}
          <div className="relative overflow-hidden flex flex-col" style={{ margin: '14px', borderRadius: 10, background: '#0d0d14', minHeight: 440, zIndex: 10 }}>

          {/* ── STEP 1: Topic ── */}
          {step === 'topic' && (
            <div className="flex flex-col items-center justify-center flex-1 px-10 py-10 gap-6">
              <div className="text-center">
                <div className="text-2xl font-black text-white mb-1">Su cosa volete sfidarvi?</div>
                <div className="text-sm text-white/40">L'argomento sarà assegnato a entrambe le squadre.</div>
              </div>
              <textarea value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="Es. L'IA sostituirà i lavori creativi entro il 2030" rows={4}
                className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-5 py-4 text-sm outline-none focus:border-blue-500/40 placeholder:text-white/20 resize-none"
                autoFocus />
              <button onClick={() => topic.trim() && setStep('teams')} disabled={!topic.trim()}
                className="px-10 py-3 rounded-2xl font-bold text-white text-sm disabled:opacity-30 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', boxShadow: '0 4px 20px rgba(59,130,246,0.4)' }}>
                Continua →
              </button>
            </div>
          )}

          {/* ── STEP 2: Scegli la tua AI ── */}
          {step === 'teams' && (
            <div className="flex flex-col items-center justify-center flex-1 px-10 py-8 gap-6">

              {/* Topic recap */}
              <div className="text-center px-4 py-2 rounded-xl w-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">Argomento</div>
                <div className="text-sm font-semibold text-white/80 truncate">"{topic}"</div>
              </div>

              {/* Nome */}
              <div className="w-full max-w-xs">
                <label className="text-[10px] text-white/35 uppercase tracking-wide block mb-2">Il tuo nome</label>
                <input value={teamAHuman} onChange={e => setTeamAHuman(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-500/40"
                  placeholder="Il tuo nome" />
              </div>

              {/* Scelta AI — 4 grandi pulsanti */}
              <div className="w-full">
                <div className="text-[10px] text-white/30 uppercase tracking-widest text-center mb-4">Scegli il tuo compagno AI</div>
                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                  {AI_OPTIONS.map(ai => (
                    <button key={ai.id} onClick={() => {
                      setTeamAAI(ai.id)
                      // B e arbitro vengono assegnati casualmente dalla roulette in handleCreate
                    }}
                      className="flex flex-col items-center gap-2 py-4 px-3 rounded-2xl transition-all hover:scale-[1.03]"
                      style={{ background: teamAAI === ai.id ? `${ai.color}20` : 'rgba(255,255,255,0.04)', border: teamAAI === ai.id ? `2px solid ${ai.color}60` : '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm"
                        style={{ background: ai.color }}>
                        {ai.id === 'gemini' ? 'Ge' : ai.name[0]}
                      </div>
                      <div className="text-xs font-bold" style={{ color: teamAAI === ai.id ? ai.color : 'rgba(255,255,255,0.5)' }}>{ai.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[10px] text-white/25 text-center">Le AI avversaria e arbitro verranno assegnate dalla roulette</div>

              {/* CTA */}
              <button onClick={handleCreate} disabled={creating}
                className="px-12 py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #7C3AED)', boxShadow: '0 4px 24px rgba(99,102,241,0.4)' }}>
                {creating ? 'Preparo la roulette…' : '⚔️ Avvia la roulette →'}
              </button>
            </div>
          )}

          {/* ── STEP 3: Roulette ── */}
          {step === 'roulette' && (
            <RouletteScreen
              teamAAI={teamAAI}
              rouletteSlots={rouletteSlots}
              rouletteSettled={rouletteSettled}
              arbiter={arbiter}
            />
          )}
          {step === 'roulette' && false && (
            <div className="flex flex-col items-center justify-center flex-1 px-10 py-8 gap-8">
              {rouletteSettled[1] && (() => {
                const ai = AI_OPTIONS.find(a => a.id === arbiter)
                return ai ? (
                  <div className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl scale-in"
                    style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black flex-shrink-0" style={{ fontSize: 10, background: '#A78BFA' }}>
                      {ai.id === 'gemini' ? 'Ge' : ai.name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] font-black uppercase" style={{ color: '#A78BFA' }}>⚖️ Arbitro (esclusa dalla roulette)</div>
                      <div className="text-sm font-bold text-white">{ai.name}</div>
                    </div>
                    <div className="text-purple-400 text-lg">✓</div>
                  </div>
                ) : null
              })()}
            </div>
          )}

          {/* ── STEP 4: Condividi ── */}
          {step === 'share' && (
            <div className="flex flex-col items-center justify-center flex-1 px-10 py-8 gap-6">
              <div className="text-5xl">⚔️</div>
              <div className="text-center">
                <div className="text-2xl font-black text-white mb-1">Duello creato!</div>
                <div className="text-white/40 text-sm">Condividi il codice con il tuo avversario.<br/>La partita inizia quando entra.</div>
              </div>

              {/* Codice */}
              <div className="w-full rounded-3xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Codice di accesso</div>
                <div className="text-5xl font-black text-white tracking-[0.15em] mb-5">{roomCode}</div>
                <button onClick={handleCopy}
                  className="w-full py-3 rounded-2xl text-sm font-bold transition-all"
                  style={{ background: copied ? 'rgba(16,163,127,0.2)' : 'rgba(255,255,255,0.07)', border: copied ? '1px solid rgba(16,163,127,0.4)' : '1px solid rgba(255,255,255,0.1)', color: copied ? '#10A37F' : 'rgba(255,255,255,0.65)' }}>
                  {copied ? '✓ Link copiato!' : '📋 Copia link da condividere'}
                </button>
              </div>

              {/* Riepilogo squadre */}
              <div className="w-full flex gap-3">
                <div className="flex-1 rounded-2xl p-3 text-center" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <div className="text-[9px] font-black uppercase text-blue-400 mb-1">🔵 Squadra A</div>
                  <div className="text-xs text-white/70">{teamAHuman}</div>
                  <div className="text-[10px] text-white/30">+ {AI_NAMES[teamAAI]}</div>
                </div>
                <div className="flex-shrink-0 flex items-center text-white/20 font-black text-sm">vs</div>
                <div className="flex-1 rounded-2xl p-3 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div className="text-[9px] font-black uppercase text-red-400 mb-1">🔴 Squadra B</div>
                  <div className="text-xs text-white/40 italic">In attesa…</div>
                  <div className="text-[10px] text-white/30">+ {AI_NAMES[teamBAI]}</div>
                </div>
              </div>

              <button
                onClick={() => onStart({ topic: topic.trim(), teamA: { humanName: teamAHuman, aiId: teamAAI }, teamB: { humanName: 'Avversario', aiId: teamBAI }, arbiterAiId: arbiter, roomCode, roomId })}
                className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
                Entra nella sala d'attesa →
              </button>
            </div>
          )}

          </div>
        </div>
      </div>
    </div>
  )
}

// ── 2 vs 2: schermata di gioco ────────────────────────────────────────────────
function TwoVsTwoScreen({ state, onHumanMessage, onRequestAI, loading, myTeam, onBack }: {
  state: TwoVsTwoState
  onHumanMessage: (text: string) => void
  onRequestAI: (team: 'A' | 'B') => void
  loading: boolean
  myTeam: 'A' | 'B'
  onBack: () => void
}) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { config } = state

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [state.messages])

  const isMyTurn = state.currentTurn === myTeam && !loading && !state.ended
  const myColor = myTeam === 'A' ? '#3b82f6' : '#ef4444'
  const theirColor = myTeam === 'A' ? '#ef4444' : '#3b82f6'
  const myAiId = myTeam === 'A' ? config.teamA.aiId : config.teamB.aiId
  const myName = myTeam === 'A' ? config.teamA.humanName : config.teamB.humanName
  const theirName = myTeam === 'A' ? config.teamB.humanName : config.teamA.humanName

  // Schermata verdetto finale
  if (state.ended && state.verdict) {
    return (
      <div className="flex flex-col h-full" style={{ background: '#07070f' }}>
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/8"
          style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', background: 'rgba(7,7,15,0.8)', backdropFilter: 'blur(20px)' }}>
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="font-black text-white text-sm">⚖️ Verdetto finale</div>
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-5 py-8 gap-6">
          <div className="text-5xl">🏆</div>
          <div className="text-white font-black text-xl text-center">Il duello è finito</div>
          <div className="w-full rounded-3xl p-5" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)' }}>
            <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-3">⚖️ {AI_NAMES[config.arbiterAiId]} — Verdetto</div>
            <div className="text-sm text-white/80 leading-relaxed">{state.verdict}</div>
          </div>
          <div className="flex gap-3 w-full">
            <div className="flex-1 rounded-2xl p-3 text-center" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)' }}>
              <div className="text-[9px] font-black uppercase text-blue-400 mb-1">🔵 Squadra A</div>
              <div className="text-xs text-white/70">{config.teamA.humanName}</div>
            </div>
            <div className="flex-1 rounded-2xl p-3 text-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <div className="text-[9px] font-black uppercase text-red-400 mb-1">🔴 Squadra B</div>
              <div className="text-xs text-white/70">{config.teamB.humanName}</div>
            </div>
          </div>
          <button onClick={onBack} className="w-full py-3 rounded-2xl font-bold text-white/60 text-sm" style={{ background: 'rgba(255,255,255,0.06)' }}>
            Torna alla home
          </button>
        </div>
      </div>
    )
  }

  // Schermata di attesa (B non ancora entrato)
  if (state.waitingForOpponent) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-6 px-6" style={{ background: '#07070f' }}>
        <div className="text-4xl">⏳</div>
        <div className="text-white font-black text-xl text-center">Aspettando l'avversario…</div>
        <div className="text-white/40 text-sm text-center">Condividi il codice con la squadra B. La partita inizia appena entra.</div>
        <div className="px-6 py-4 rounded-2xl text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Codice</div>
          <div className="text-3xl font-black text-white tracking-widest">{config.roomCode ?? '—'}</div>
        </div>
        <div className="flex gap-1">{[0,150,300].map(d => <span key={d} className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#0d0d14' }}>

      {/* ── HEADER: A vs B con round ── */}
      <div className="flex-shrink-0" style={{ paddingTop: 'max(10px, env(safe-area-inset-top))', background: 'rgba(7,7,15,0.9)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}>
        {/* Barra A vs B */}
        <div className="flex items-center px-3 pb-2 pt-1 gap-2">
          <button onClick={onBack} className="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>

          {/* Squadra A */}
          <div className="flex-1 flex flex-col items-start gap-0.5">
            <div className="text-[8px] font-black uppercase tracking-wide" style={{ color: '#60a5fa' }}>🔵 A</div>
            <div className="text-[10px] font-bold text-white truncate max-w-[70px]">{config.teamA.humanName}</div>
            <div className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>+ {AI_NAMES[config.teamA.aiId]}</div>
          </div>

          {/* Centro — round e turno */}
          <div className="flex flex-col items-center flex-shrink-0 px-2">
            <div className="text-[9px] text-white/30 mb-0.5">Round {state.round}/{state.maxRounds}</div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: state.currentTurn === 'A' ? '#3b82f6' : '#ef4444' }} />
              <span className="text-[10px] font-black" style={{ color: state.currentTurn === 'A' ? '#3b82f6' : '#ef4444' }}>
                Turno {state.currentTurn}
              </span>
            </div>
            {/* Slot messaggi turno corrente */}
            <div className="flex gap-0.5 mt-1">
              {Array.from({ length: state.maxMessagesPerTurn ?? 3 }).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i < (state.messagesThisTurn ?? 0) ? (state.currentTurn === 'A' ? '#3b82f6' : '#ef4444') : 'rgba(255,255,255,0.15)' }} />
              ))}
            </div>
          </div>

          {/* Squadra B */}
          <div className="flex-1 flex flex-col items-end gap-0.5">
            <div className="text-[8px] font-black uppercase tracking-wide" style={{ color: '#f87171' }}>🔴 B</div>
            <div className="text-[10px] font-bold text-white truncate max-w-[70px]">{config.teamB.humanName}</div>
            <div className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{AI_NAMES[config.teamB.aiId]} +</div>
          </div>
        </div>

        {/* Topic */}
        <div className="px-4 pb-2">
          <div className="text-[9px] text-center text-white/30 truncate">"{config.topic}"</div>
        </div>
      </div>

      {/* ── MESSAGGI ── */}
      <div className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-2">
        {state.messages.map((msg, i) => {
          const isA = msg.team === 'A'
          const isArbiter = msg.team === 'arbiter'
          const isAI = msg.isAI
          const teamColor = isA ? '#3b82f6' : '#ef4444'
          const teamBg = isA ? 'rgba(59,130,246,0.12)' : 'rgba(239,68,68,0.12)'
          const aiColor = AI_COLOR[msg.aiId ?? ''] ?? teamColor

          if (isArbiter) return (
            <div key={i} className="rounded-2xl p-3 mx-1" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
              <div className="text-[8px] font-black uppercase tracking-wide mb-1" style={{ color: '#A78BFA' }}>⚖️ {AI_NAMES[config.arbiterAiId]} — Verdetto</div>
              <div className="text-xs text-white/80 leading-relaxed">{msg.content}{msg.streaming && <span className="typewriter-cursor" />}</div>
            </div>
          )

          const isRight = !isA
          return (
            <div key={i} className={`flex gap-2 max-w-[86%] ${isRight ? 'flex-row-reverse self-end' : ''}`}>
              {/* Avatar */}
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 mt-0.5"
                style={{ fontSize: 8, background: isAI ? aiColor : teamColor }}>
                {isAI ? (msg.aiId === 'gemini' ? 'Ge' : (AI_NAMES[msg.aiId ?? ''] ?? '?')[0]) : msg.author[0]?.toUpperCase()}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-[8px] font-semibold px-1" style={{ color: isAI ? aiColor : teamColor, textAlign: isRight ? 'right' : 'left' }}>
                  {msg.author}{isAI && <span className="ml-1 text-white/20 font-normal">AI</span>}
                </div>
                <div className="px-3 py-2 text-xs leading-relaxed"
                  style={{ background: isAI ? `${aiColor}18` : teamBg, color: 'rgba(255,255,255,0.85)', borderRadius: isRight ? '12px 3px 12px 12px' : '3px 12px 12px 12px' }}>
                  {msg.content}{msg.streaming && <span className="typewriter-cursor" />}
                </div>
              </div>
            </div>
          )
        })}

        {loading && (
          <div className="flex items-center gap-2 px-2">
            <div className="flex gap-1">{[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</div>
            <span className="text-[10px] text-white/30">L'AI sta pensando…</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── INPUT ── */}
      {!state.ended && (
        <div className="flex-shrink-0" style={{ background: 'rgba(7,7,15,0.9)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>

          {/* Banner turno */}
          <div className="px-4 pt-2 pb-1.5">
            {isMyTurn ? (
              <div className="text-[10px] text-center font-bold" style={{ color: myColor }}>
                Il tuo turno — {state.messagesThisTurn ?? 0}/{state.maxMessagesPerTurn ?? 3} messaggi usati
              </div>
            ) : (
              <div className="text-[10px] text-center text-white/30">
                Turno Squadra {state.currentTurn} — {state.currentTurn === 'A' ? config.teamA.humanName : config.teamB.humanName} sta rispondendo…
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 px-3 pb-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && input.trim() && isMyTurn && !loading) { onHumanMessage(input.trim()); setInput('') } }}
              disabled={!isMyTurn || loading}
              placeholder={isMyTurn ? "Il tuo argomento…" : "Attendi il tuo turno…"}
              className="flex-1 rounded-full px-4 py-2.5 text-xs outline-none transition-all"
              style={{ background: isMyTurn ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isMyTurn ? `${myColor}50` : 'rgba(255,255,255,0.06)'}`, color: isMyTurn ? '#f0f0f0' : 'rgba(255,255,255,0.25)', cursor: isMyTurn ? 'text' : 'not-allowed' }}
            />
            <button onClick={() => { if (input.trim() && isMyTurn && !loading) { onHumanMessage(input.trim()); setInput('') } }}
              disabled={!input.trim() || !isMyTurn || loading}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-20 flex-shrink-0 transition-all"
              style={{ background: isMyTurn ? `linear-gradient(135deg, ${myColor}, ${myColor}bb)` : 'rgba(255,255,255,0.05)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
            </button>
          </div>

          {/* Bottone AI alleata — solo se è il mio turno */}
          {isMyTurn && (
            <div className="px-3 pb-1">
              <button onClick={() => onRequestAI(myTeam)} disabled={loading}
                className="w-full py-2 rounded-xl text-[10px] font-bold disabled:opacity-40 transition-all"
                style={{ background: `${myColor}15`, color: myTeam === 'A' ? '#60a5fa' : '#f87171', border: `1px solid ${myColor}30` }}>
                Chiedi supporto a {AI_NAMES[myAiId]} →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


function DevilsAdvocateScreen({ session, onMessage, onEndTurn, loading, isDark, bgPreset, onBack }: {
  session: DevilSession
  onMessage: (text: string) => void
  onEndTurn: () => void
  loading: boolean
  isDark: boolean
  bgPreset: { value: string; header: string; text: 'black' | 'white' }
  onBack: () => void
}) {
  const [input, setInput] = useState('')
  const textColor = isDark ? '#fff' : '#111'
  const subColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'

  const scoreColor = session.score >= 7 ? '#10A37F' : session.score >= 5 ? '#F59E0B' : '#ef4444'

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: bgPreset.value }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 border-b"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: '10px', backgroundColor: bgPreset.header, borderColor }}>
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base">😈</span>
            <span className="font-bold text-sm truncate" style={{ color: textColor }}>Devil's Advocate</span>
          </div>
          <div className="text-[10px] truncate" style={{ color: '#ef4444' }}>Turno {session.round} · Difendi la tua posizione</div>
        </div>
        {/* Score */}
        <div className="flex flex-col items-end flex-shrink-0">
          <div className="text-xl font-black" style={{ color: scoreColor }}>{session.score.toFixed(1)}</div>
          <div className="text-[9px]" style={{ color: subColor }}>/ 10</div>
        </div>
      </div>

      {/* Posizione assegnata */}
      <div className="flex-shrink-0 px-4 py-3 border-b"
        style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' }}>
        <div className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: '#ef4444' }}>La tua posizione — devi difenderla</div>
        <div className="text-sm font-bold" style={{ color: textColor }}>"{session.position}"</div>
      </div>

      {/* Messaggi */}
      <div className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-3">
        {session.messages.map((msg, i) => (
          <div key={i}>
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-br-sm text-sm"
                  style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: isDark ? '#fca5a5' : '#b91c1c' }}>
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="flex items-end gap-2 max-w-[85%]">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                  style={{ backgroundColor: AI_COLOR[msg.aiId ?? 'claude'] }}>
                  {msg.aiId === 'gemini' ? 'Ge' : (AI_NAMES[msg.aiId ?? 'claude'] ?? 'C')[0]}
                </div>
                <div className="px-3 py-2 rounded-2xl rounded-bl-sm text-sm"
                  style={{ backgroundColor: isDark ? `${AI_COLOR[msg.aiId ?? 'claude']}18` : `${AI_COLOR[msg.aiId ?? 'claude']}15`, color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)' }}>
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-[9px] font-bold">C</div>
            <div className="flex gap-1">
              {[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
            </div>
          </div>
        )}
      </div>

      {/* Input + Fine turno */}
      <div className="flex-shrink-0 border-t" style={{ backgroundColor: bgPreset.header, borderColor, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-2 px-3 pt-2 pb-1">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && input.trim() && !loading) { onMessage(input.trim()); setInput('') } }}
            placeholder="Difendi la tua posizione…"
            disabled={loading}
            className="flex-1 rounded-full px-3 py-2 text-[12px] outline-none"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, color: isDark ? '#f0f0f0' : '#111' }}
          />
          <button onClick={() => { if (input.trim()) { onMessage(input.trim()); setInput('') } }} disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white disabled:opacity-30"
            style={{ background: 'rgba(239,68,68,0.6)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
          </button>
        </div>
        <div className="px-3 pb-1">
          <button onClick={onEndTurn} disabled={loading || session.round >= 4}
            className="w-full py-2 rounded-xl text-xs font-bold disabled:opacity-40 transition-all"
            style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
            {session.round >= 4 ? 'Attendi verdetto finale…' : `Fine turno → (${4 - session.round} rimasti)`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Topic suggeriti rotanti (3 righe × 2 colonne, cambiano tutti insieme) ─────
function RotatingTopics({ onSelect }: { onSelect: (t: string) => void }) {
  const SLOTS = 6
  const [visible, setVisible] = useState<string[]>(() =>
    [...TOPIC_SUGGESTIONS].sort(() => Math.random() - 0.5).slice(0, SLOTS)
  )
  const [show, setShow] = useState(true)
  useEffect(() => {
    const interval = setInterval(() => {
      setShow(false)
      setTimeout(() => {
        setVisible(prev => {
          const others = TOPIC_SUGGESTIONS.filter(t => !prev.includes(t))
          const pool = others.length >= SLOTS ? others : TOPIC_SUGGESTIONS
          return [...pool].sort(() => Math.random() - 0.5).slice(0, SLOTS)
        })
        setShow(true)
      }, 600)
    }, 10000)
    return () => clearInterval(interval)
  }, [])
  return (
    <div style={{ marginBottom: '8px', transition: 'opacity 0.6s ease', opacity: show ? 1 : 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(3, 44px)', gap: '6px' }}>
      {visible.map((t, i) => (
        <button key={i} onClick={() => onSelect(t)}
          className="text-center px-3 rounded-2xl border border-white/10 text-white/45 hover:text-white/75 hover:border-white/25 transition-colors flex items-center justify-center"
          style={{ fontSize: 'clamp(9px, 2.5vw, 11px)', lineHeight: 1.3, overflow: 'hidden' }}>
          {t}
        </button>
      ))}
    </div>
  )
}

// ── Comprimi immagine sul client ──────────────────────────────────────────────
async function compressImage(file: File, maxW: number, maxH: number): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let w = img.naturalWidth, h = img.naturalHeight
      // Scala proporzionalmente
      if (w > h) { if (w > maxW) { h = Math.round(h * maxW / w); w = maxW } }
      else { if (h > maxH) { w = Math.round(w * maxH / h); h = maxH } }
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(blob => {
        resolve(new File([blob!], 'avatar.jpg', { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.7)
    }
    img.src = url
  })
}

// ── Schermata Profilo ─────────────────────────────────────────────────────────
function ProfileScreen({ displayName, userEmail, userPlan, savedChats, bgPreset, isDark, onBack, onSignOut, userImage, onImageChange, dbUserName }: {
  displayName: string
  userEmail?: string
  userPlan?: string
  savedChats: any[]
  bgPreset: { value: string; header: string; text: 'black' | 'white' }
  isDark: boolean
  onBack: () => void
  onSignOut: () => void
  userImage?: string | null
  onImageChange?: (img: string | null) => void
  dbUserName?: string | null
  isBeta?: boolean
}) {
  const [following, setFollowing] = useState<any[]>([])
  const [followers, setFollowers] = useState<any[]>([])
  const [profileTab, setProfileTab] = useState<'chat' | 'following' | 'followers'>('chat')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const planColors: Record<string, string> = { max:'#FF6B2B', pro:'#7C3AED', starter:'#1A73E8', free:'#10A37F', admin:'#F59E0B', none:'#6B7280' }
  // Il piano 'admin' viene impostato dal session callback — usiamo direttamente userPlan
  const effectivePlan = userPlan ?? 'none'
  const planColor = planColors[effectivePlan] ?? '#6B7280'
  const publicChats = savedChats.filter((c: any) => c.isPublic)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    // Ridimensiona sul client prima di inviare
    const compressed = await compressImage(file, 80, 80)
    const form = new FormData()
    form.append('avatar', compressed)
    try {
      const res = await fetch('/api/user/avatar', { method: 'POST', body: form })
      const data = await res.json()
      if (data.image) onImageChange?.(data.image)
    } catch {}
    setUploadingAvatar(false)
  }

  useEffect(() => {
    fetch('/api/follow').then(r => r.json()).then(d => {
      setFollowing(d.following ?? [])
      setFollowers(d.followers ?? [])
    }).catch(() => {})
  }, [])

  const handleUnfollow = async (targetId: string) => {
    await fetch('/api/follow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUserId: targetId }) })
    setFollowing(prev => prev.filter(u => u.id !== targetId))
  }

  const textColor = isDark ? '#fff' : '#111'
  const subColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: bgPreset.value }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 pb-4 border-b"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', backgroundColor: bgPreset.header, borderColor }}>
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full"
          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span className="font-bold text-lg" style={{ color: textColor }}>Profilo</span>
        {/* Link profilo pubblico */}
        <a href={`/${encodeURIComponent(dbUserName || (displayName !== 'Tu' ? displayName : (userEmail || ''))  )}`} target="_blank" rel="noopener noreferrer"
          className="ml-auto text-[11px] font-semibold flex items-center gap-1"
          style={{ color: '#A78BFA' }}>
          🔗 Profilo pubblico
        </a>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Avatar + info */}
        <div className="flex items-center gap-4 px-5 pt-6 pb-5" style={{ backgroundColor: bgPreset.header, borderBottom: `1px solid ${borderColor}` }}>
          {/* Avatar cliccabile per cambio foto */}
          <div className="relative flex-shrink-0 cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
            <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-2xl font-black text-white"
              style={{ backgroundColor: planColor, boxShadow: `0 0 0 3px ${planColor}30` }}>
              {userImage
                ? <img src={userImage} alt="avatar" className="w-full h-full object-cover" />
                : (displayName || '?')[0].toUpperCase()
              }
            </div>
            {/* Overlay modifica */}
            <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              {uploadingAvatar
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
              }
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg truncate" style={{ color: textColor }}>{displayName}</div>
            <div className="text-xs truncate" style={{ color: subColor }}>{userEmail}</div>
            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
              style={{ backgroundColor: `${planColor}20`, color: planColor, border: `1px solid ${planColor}40` }}>
              {effectivePlan.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex border-b" style={{ borderColor, backgroundColor: bgPreset.header }}>
          {[
            ['Dibattiti', savedChats.length],
            ['Seguiti', following.length],
            ['Seguaci', followers.length],
          ].map(([label, count]) => (
            <div key={label as string} className="flex-1 text-center py-3">
              <div className="text-xl font-black" style={{ color: textColor }}>{count}</div>
              <div className="text-[10px]" style={{ color: subColor }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tab */}
        <div className="flex border-b" style={{ borderColor }}>
          {([['chat', '💬 Chat'], ['following', '👥 Seguiti'], ['followers', '👤 Seguaci']] as const).map(([tab, label]) => (
            <button key={tab} onClick={() => setProfileTab(tab)}
              className="flex-1 py-3 text-xs font-bold transition-colors"
              style={{
                color: profileTab === tab ? '#A78BFA' : subColor,
                borderBottom: profileTab === tab ? '2px solid #A78BFA' : '2px solid transparent',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Contenuto tab */}
        <div className="px-4 py-3 flex flex-col gap-2">
          {/* Chat recenti */}
          {profileTab === 'chat' && (
            savedChats.length === 0 ? (
              <div className="text-center py-8 text-xs" style={{ color: subColor }}>Nessuna chat ancora</div>
            ) : savedChats.slice(0, 10).map((chat: any) => (
              <div key={chat.id} className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: `1px solid ${borderColor}` }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.1)' }}>
                  💬
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: textColor }}>{chat.title}</div>
                  <div className="text-[10px]" style={{ color: subColor }}>{chat.date}</div>
                </div>
                {chat.isPublic && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(124,58,237,0.15)', color: '#A78BFA' }}>PUB</span>
                )}
              </div>
            ))
          )}

          {/* Following */}
          {profileTab === 'following' && (
            following.length === 0 ? (
              <div className="text-center py-8 text-xs" style={{ color: subColor }}>Non segui ancora nessuno</div>
            ) : following.map((u: any) => (
              <div key={u.id} className="flex items-center gap-3 py-2 border-b" style={{ borderColor }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: '#7C3AED' }}>
                  {(u.name || u.email || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: textColor }}>{u.name || u.email}</div>
                </div>
                <button onClick={() => handleUnfollow(u.id)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: subColor }}>
                  Smetti
                </button>
              </div>
            ))
          )}

          {/* Followers */}
          {profileTab === 'followers' && (
            followers.length === 0 ? (
              <div className="text-center py-8 text-xs" style={{ color: subColor }}>Nessun seguace ancora</div>
            ) : followers.map((u: any) => (
              <div key={u.id} className="flex items-center gap-3 py-2 border-b" style={{ borderColor }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: '#10A37F' }}>
                  {(u.name || u.email || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: textColor }}>{u.name || u.email}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Esci */}
        <div className="mx-4 mb-6 mt-2">
          <button onClick={onSignOut}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-red-500"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: `1px solid ${borderColor}` }}>
            Esci dall'account
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Avatar bar ────────────────────────────────────────────────────────────────
function PhoneAvatarBar({ activeAi, bgColor, isDark, aiOrder, onAiClick }: { activeAi: string | null; bgColor: string; isDark: boolean; aiOrder: string[]; onAiClick?: (id: string) => void }) {
  return (
    <div className="flex items-center justify-around px-2 py-1.5" style={{
      backgroundColor: bgColor,
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
    }}>
      {aiOrder.map(id => {
        const isActive = activeAi === id
        const color = AI_COLOR[id]
        return (
          <button key={id} className="flex flex-col items-center gap-0.5 active:scale-95 transition-transform"
            onClick={() => onAiClick?.(id)}>
            <div className="relative w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold transition-all duration-300"
              style={{
                backgroundColor: isActive ? color : color + '40',
                boxShadow: isActive ? `0 0 12px 3px ${color}66` : undefined,
                transform: isActive ? 'scale(1.18)' : 'scale(1)',
                animation: isActive ? 'avatar-glow 1.2s ease-in-out infinite' : undefined,
              }}>
              {id === 'gemini' ? 'Ge' : AI_NAMES[id][0]}
              {isActive && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-white" />}
            </div>
            <span className="text-[8px] font-medium transition-colors" style={{ color: isActive ? (isDark ? '#fff' : '#111') : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)') }}>
              {AI_NAMES[id]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Tre puntini ───────────────────────────────────────────────────────────────
function ThinkingBubble({ aiId, isDark }: { aiId: string; isDark: boolean }) {
  const color = AI_COLOR[aiId] || '#6B7280'
  const dotColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'
  const bubbleBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
  return (
    <div className="flex items-end gap-2 px-3 mb-2 message-enter">
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mb-0.5" style={{ backgroundColor: color }}>
        {AI_NAMES[aiId]?.[0]}
      </div>
      <div className="rounded-2xl rounded-bl-sm px-4 py-3" style={{ backgroundColor: bubbleBg }}>
        <div className="flex gap-1.5 items-center h-3">
          {[0, 180, 360].map(d => (
            <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: dotColor, animationDelay: `${d}ms`, animationDuration: '1s' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Separatore "è il tuo turno" ───────────────────────────────────────────────
function UserTurnPrompt({ name, isDark }: { name: string; isDark: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 my-3 message-enter">
      <div className="flex-1 h-px" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
      <div className="waiting-pulse flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
        style={{ backgroundColor: isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.12)', color: isDark ? '#c4b5fd' : '#6d28d9', border: `1px solid ${isDark ? 'rgba(196,181,253,0.25)' : 'rgba(109,40,217,0.2)'}` }}>
        <span>💬</span>
        <span>{name}, cosa ne pensi?</span>
      </div>
      <div className="flex-1 h-px" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
    </div>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ onCronologia, onFeed, onCrea, onNewChat, onMultiplayer, displayName, userEmail, userPlan, showProfileMenu, setShowProfileMenu, onSignOut, unreadCount, dbUserName, isBeta }: {
  onCronologia: () => void
  onFeed?: () => void
  onCrea?: () => void
  onNewChat?: () => void
  onMultiplayer?: () => void
  dbUserName?: string | null
  isBeta?: boolean
  displayName: string
  userEmail?: string
  userPlan?: string
  showProfileMenu: boolean
  setShowProfileMenu: (v: boolean | ((p: boolean) => boolean)) => void
  onSignOut: () => void
  unreadCount?: number
}) {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 h-14"
      style={{ backgroundColor: 'rgba(7,7,15,0.4)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)' }}>

      {/* Sinistra — Cronologia */}
      <button onClick={onCronologia}
        className="flex items-center gap-2 text-sm font-medium transition-all hover:text-white"
        style={{ color: 'rgba(255,255,255,0.45)' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 18 0A9 9 0 0 0 3 12z"/><path d="M12 7v5l3 3"/>
        </svg>
        Cronologia
      </button>

      {/* Centro — Logo cliccabile → nuova chat */}
      <button onClick={onNewChat}
        className="absolute left-1/2 -translate-x-1/2 font-black text-lg tracking-tight hover:opacity-80 active:scale-95 transition-all">
        <span className="text-white">Ai</span>
        <span style={{ color: '#A78BFA' }}>GORÀ</span>
      </button>

      {/* Destra — Profilo */}
      <div className="relative">
        {(() => {
          const pc: Record<string,string> = { admin:'#F59E0B', max:'#FF6B2B', pro:'#A78BFA', starter:'#1A73E8', free:'#10A37F', none:'#6B7280' }
          const c = pc[userPlan ?? 'free'] ?? '#6B7280'
          return (
            <button onClick={() => setShowProfileMenu(p => !p)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white transition-transform hover:scale-110"
              style={{ backgroundColor: c, boxShadow: `0 2px 10px ${c}55` }}>
              {(displayName !== 'Tu' ? displayName : (userEmail || '?'))[0].toUpperCase()}
            </button>
          )
        })()}
        {(unreadCount ?? 0) > 0 && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white pointer-events-none"
            style={{ backgroundColor: '#7C3AED' }}>
            {unreadCount}
          </div>
        )}
        {showProfileMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
            <div className="absolute right-0 top-11 w-56 rounded-2xl overflow-hidden shadow-2xl z-50"
              style={{ backgroundColor: 'rgba(12,12,20,0.97)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
              {(() => {
                const planColors: Record<string,string> = { admin:'#F59E0B', max:'#FF6B2B', pro:'#A78BFA', starter:'#1A73E8', free:'#10A37F', none:'#6B7280' }
                const pc = planColors[userPlan ?? 'free'] ?? '#6B7280'
                return (
                  <div className="px-4 py-3 border-b border-white/8">
                    <div className="text-white font-semibold text-sm truncate">{displayName || '—'}</div>
                    <div className="text-white/40 text-[11px] truncate mt-0.5">{userEmail}</div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                        style={{ backgroundColor: `${pc}20`, color: pc, border: `1px solid ${pc}40` }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pc }} />
                        {(userPlan ?? 'free').toUpperCase()}
                      </div>
                      {isBeta && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                          style={{ backgroundColor: 'rgba(124,58,237,0.2)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.4)' }}>
                          ✦ Beta Tester
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
              {userPlan === 'admin' && (
                <button onClick={() => { onMultiplayer?.(); setShowProfileMenu(false) }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 transition-colors font-medium border-b border-white/8 flex items-center gap-2"
                  style={{ color: 'rgba(255,255,255,0.7)' }}>
                  ⚔️ Multiplayer
                </button>
              )}
              {(userPlan === 'admin' || isBeta) && (
                <>
                  <a href={`/${encodeURIComponent(dbUserName || displayName !== 'Tu' ? (dbUserName || displayName) : (userEmail || ''))}`}
                    className="w-full px-4 py-3 text-left text-sm text-purple-400 hover:bg-white/5 transition-colors font-medium border-b border-white/8 flex items-center gap-2">
                    🔗 Il mio profilo pubblico
                  </a>
                  <button onClick={() => { onFeed?.(); setShowProfileMenu(false) }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 transition-colors font-medium border-b border-white/8 flex items-center justify-between"
                    style={{ color: 'rgba(255,255,255,0.7)' }}>
                    <span>🏛 Feed dibattiti</span>
                    {(unreadCount ?? 0) > 0 && (
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ backgroundColor: '#7C3AED' }}>{unreadCount}</span>
                    )}
                  </button>
                  <button onClick={() => { onCrea?.(); setShowProfileMenu(false) }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 transition-colors font-medium border-b border-white/8"
                    style={{ color: 'rgba(255,255,255,0.7)' }}>
                    ＋ Crea dibattito
                  </button>
                  {userPlan === 'admin' && (
                    <button onClick={() => window.location.href = '/admin'}
                      className="w-full px-4 py-3 text-left text-sm text-amber-400 hover:bg-white/5 transition-colors font-medium border-b border-white/8">
                      ⚙️ Pannello Admin
                    </button>
                  )}
                </>
              )}
              <button onClick={onSignOut}
                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-white/5 transition-colors font-medium">
                Esci dall'account
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Componente principale ─────────────────────────────────────────────────────
interface AigoraChatProps {
  allowedAis?: string[]
  userPlan?: string
  userName?: string
  userEmail?: string
}

export default function AigoraChat({ allowedAis, userPlan, userName: propUserName, userEmail }: AigoraChatProps) {
  const AI_ORDER = allowedAis?.length ? allowedAis : AI_ORDER_DEFAULT

  const [phase, setPhase] = useState<ChatPhase>('start')
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date()
    return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setCurrentTime(`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`)
    }
    const interval = setInterval(tick, 10000)
    return () => clearInterval(interval)
  }, [])
  const [question, setQuestion] = useState('')
  const [userName, setUserName] = useState(propUserName ?? '')
  const [nameConfirmed, setNameConfirmed] = useState(!!(propUserName?.trim()))
  const [nameInput, setNameInput] = useState('')
  const [inputText, setInputText] = useState('')
  const [bgPreset, setBgPreset] = useState(() => {
    // Usa il tema di sistema: scuro → Notte, chiaro → Crema
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return BG_PRESETS.find(p => p.label === 'Notte') ?? BG_PRESETS[0]
    }
    return BG_PRESETS.find(p => p.label === 'Crema') ?? BG_PRESETS[0]
  })
  const [messages, setMessages] = useState<Message[]>([])
  const [activeAi, setActiveAi] = useState<string | null>(null)
  const [thinkingAi, setThinkingAi] = useState<string | null>(null)
  const [synthesis, setSynthesis] = useState<string | null>(null)
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [showSynthesis, setShowSynthesis] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [portfolioSaved, setPortfolioSaved] = useState(false)
  const [userImage, setUserImage] = useState<string | null>(null)
  const [resolvedPlan, setResolvedPlan] = useState<string | null>(null)
  const [dbUserName, setDbUserName] = useState<string | null>(null)
  const [isBeta, setIsBeta] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showModeSelect, setShowModeSelect] = useState(false)
  const [show2v2Setup, setShow2v2Setup] = useState(false)
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null)
  const [twoVsTwoState, setTwoVsTwoState] = useState<TwoVsTwoState | null>(null)
  const [twoVsTwoLoading, setTwoVsTwoLoading] = useState(false)
  const [devilSession, setDevilSession] = useState<DevilSession | null>(null)
  const [devilLoading, setDevilLoading] = useState(false)
  const [selectedAiProfile, setSelectedAiProfile] = useState<string | null>(null)
  const [closingAiProfile, setClosingAiProfile] = useState(false)

  const closeAiProfile = () => {
    setClosingAiProfile(true)
    setTimeout(() => {
      setSelectedAiProfile(null)
      setClosingAiProfile(false)
    }, 280)
  }
  const [waitingForUser, setWaitingForUser] = useState(false)
  const [turnCount, setTurnCount] = useState(0)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [mobileFontSize, setMobileFontSize] = useState(14)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const listeningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopListening = useCallback(() => {
    if (listeningTimeoutRef.current) { clearTimeout(listeningTimeoutRef.current); listeningTimeoutRef.current = null }
    try { recognitionRef.current?.stop() } catch {}
    recognitionRef.current = null
    setIsListening(false)
  }, [])

  // Cleanup al dismount
  useEffect(() => { return () => { stopListening() } }, [stopListening])

  const startListening = useCallback(() => {
    // Se già in ascolto, ferma
    if (recognitionRef.current) { stopListening(); return }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) { alert('Il tuo browser non supporta il riconoscimento vocale.'); return }

    const rec = new SpeechRecognition()
    rec.lang = navigator.language || 'en-US'
    rec.continuous = false
    rec.interimResults = false
    rec.maxAlternatives = 1

    rec.onstart = () => {
      setIsListening(true)
      // Timeout di sicurezza: se dopo 10s non ha finito, forza lo stop
      listeningTimeoutRef.current = setTimeout(() => { stopListening() }, 10000)
    }

    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results as any[])
        .map((r: any) => r[0].transcript)
        .join('')
        .trim()
      if (transcript) setInputText(prev => prev ? prev + ' ' + transcript : transcript)
      stopListening()
    }

    rec.onerror = (e: any) => {
      // 'no-speech' è normale (silenzio), non mostrare errore
      if (e.error !== 'no-speech') console.warn('Speech recognition error:', e.error)
      stopListening()
    }

    rec.onend = () => { stopListening() }

    recognitionRef.current = rec
    try {
      rec.start()
    } catch {
      // Se start() fallisce (es. già in corso), resetta
      recognitionRef.current = null
      setIsListening(false)
    }
  }, [stopListening])
  const [showHistory, setShowHistory] = useState(false)
  const [bubbleTopics, setBubbleTopics] = useState(() => getRandomBubbleTopics())
  const usedBubbleTopicsRef = useRef(new Set(getRandomBubbleTopics()))

  const rotateBubble = useCallback((index: number) => {
    setBubbleTopics(prev => {
      const currentSet = new Set(prev)
      // Trova una domanda non usata attualmente
      const available = ALL_BUBBLE_TOPICS.filter(t => !currentSet.has(t))
      if (available.length === 0) {
        // Se le abbiamo usate tutte, ricomincia
        usedBubbleTopicsRef.current = new Set(prev)
        const fresh = ALL_BUBBLE_TOPICS.filter(t => !currentSet.has(t))
        if (fresh.length === 0) return prev
        const next = [...prev]
        next[index] = fresh[Math.floor(Math.random() * fresh.length)]
        return next
      }
      const newTopic = available[Math.floor(Math.random() * available.length)]
      const next = [...prev]
      next[index] = newTopic
      usedBubbleTopicsRef.current.add(newTopic)
      return next
    })
  }, [])
  const [savedChats, setSavedChats] = useState<{id:string; title:string; date:string; messages: Message[]; history: {name:string;content:string}[]}[]>([])
  const [socialTab, setSocialTab] = useState<'feed' | 'crea'>('feed')
  const [showSocialPanel, setShowSocialPanel] = useState(false)
  const [rooms, setRooms] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [createTopic, setCreateTopic] = useState('')
  const [createVisibility, setCreateVisibility] = useState<'public' | 'private'>('public')
  const [createAis, setCreateAis] = useState(['claude', 'gemini', 'perplexity', 'gpt'])
  const [createInvited, setCreateInvited] = useState<{id:string; name:string}[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState<any[]>([])
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [activeRoom, setActiveRoom] = useState<any>(null)
  const [myRoomRole, setMyRoomRole] = useState<'host' | 'participant' | 'spectator'>('spectator')
  const [showInvitePanel, setShowInvitePanel] = useState(false)
  const [inviteSearch, setInviteSearch] = useState('')
  const [inviteResults, setInviteResults] = useState<any[]>([])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [undoChat, setUndoChat] = useState<{ id: string; title: string } | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Real-time Ably ────────────────────────────────────────────────────────
  const handleRoomEvent = useCallback((event: RoomEvent) => {
    if (event.type === 'user_message') {
      // Messaggio di un altro utente nella room
      const msg: Message = {
        id: event.messageId,
        aiId: 'user',
        name: event.userName,
        content: event.content,
        isUser: true,
      }
      setMessages(prev => {
        // Evita duplicati
        if (prev.find(m => m.id === event.messageId)) return prev
        return [...prev, msg]
      })
    } else if (event.type === 'ai_chunk') {
      // Chunk streaming di una AI dalla room
      setMessages(prev => {
        const existing = prev.find(m => m.id === event.messageId)
        if (existing) {
          return prev.map(m => m.id === event.messageId
            ? { ...m, content: m.content + event.chunk, isStreaming: true }
            : m
          )
        }
        return [...prev, {
          id: event.messageId,
          aiId: event.aiId,
          name: event.aiName,
          content: event.chunk,
          isStreaming: true,
        }]
      })
    } else if (event.type === 'ai_done') {
      setMessages(prev => prev.map(m => m.id === event.messageId
        ? { ...m, content: event.fullText, isStreaming: false }
        : m
      ))
    } else if (event.type === 'presence') {
      setOnlineUsers(prev => {
        if (event.action === 'enter') return Array.from(new Set([...prev, event.userName]))
        return prev.filter(u => u !== event.userName)
      })
    }
  }, [])

  const { publish } = useAbly({
    roomId: activeRoom?.id ?? null,
    userId: userEmail ?? '',
    userName: userName.trim() || propUserName || userEmail?.split('@')[0] || '',
    onEvent: handleRoomEvent,
    enabled: !!activeRoom,
  })

  // Registra la sessione al mount
  useEffect(() => {
    fetch('/api/session', { method: 'POST' }).catch(() => {})
    // Controlla validità ogni 5 minuti — ma solo se esiste già il cookie
    const check = setInterval(() => {
      fetch('/api/session').then(r => r.json()).then(d => {
        // Invalida solo se esplicitamente invalid E il cookie esiste (evita falsi positivi al primo caricamento)
        if (d.valid === false && d.hasToken) {
          window.location.href = '/login?error=session_expired'
        }
      }).catch(() => {})
    }, 5 * 60_000)
    return () => clearInterval(check)
  }, [])

  // Risolve il piano reale dal DB (evita sfasamenti JWT)
  useEffect(() => {
    fetch('/api/user/me')
      .then(r => r.json())
      .then(d => {
        if (d.plan) setResolvedPlan(d.plan)
        if (d.image) setUserImage(d.image)
        if (d.name) {
          setDbUserName(d.name)
          setUserName(d.name)
          setNameConfirmed(true)
        } else {
          setNameConfirmed(false)
        }
        if (d.beta) setIsBeta(true)
      })
      .catch(() => {})
  }, [])

  // Piano effettivo — usa quello dal DB se disponibile
  const effectivePlan = resolvedPlan ?? userPlan ?? 'free'

  // Carica rooms e notifiche (solo admin)
  useEffect(() => {
    if (effectivePlan !== 'admin') return
    fetch('/api/rooms').then(r => r.json()).then(d => { if (d.rooms) setRooms(d.rooms) }).catch(() => {})
    fetch('/api/notifications').then(r => r.json()).then(d => {
      if (d.notifications) {
        setNotifications(d.notifications)
        setUnreadCount(d.notifications.filter((n: any) => !n.read).length)
      }
    }).catch(() => {})
  }, [userPlan])

  // Ricerca utenti con debounce (per crea room)
  useEffect(() => {
    if (userSearch.length < 2) { setUserResults([]); return }
    const t = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(userSearch)}`)
        .then(r => r.json()).then(d => setUserResults(d.users ?? [])).catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [userSearch])

  // Ricerca utenti per invito in chat
  useEffect(() => {
    if (inviteSearch.length < 2) { setInviteResults([]); return }
    const t = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(inviteSearch)}`)
        .then(r => r.json()).then(d => setInviteResults(d.users ?? [])).catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [inviteSearch])

  const handleCreateRoom = async () => {
    if (!createTopic.trim()) return
    setCreatingRoom(true)
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: createTopic,
          visibility: createVisibility,
          aiIds: createAis,
          invitedUserIds: createInvited.map(u => u.id),
        }),
      })
      const data = await res.json()
      if (data.room) {
        setRooms(prev => [data.room, ...prev])
        setCreateTopic('')
        setCreateInvited([])
        setSocialTab('feed')
        // Apri subito la room appena creata
        handleOpenRoom(data.room.id)
      }
    } catch {}
    setCreatingRoom(false)
  }

  const handleDeleteChat = (chatId: string, chatTitle: string, e: React.MouseEvent) => {
    e.stopPropagation()
    // Rimuovi subito dall'UI
    setSavedChats(prev => prev.filter(c => c.id !== chatId))
    // Mostra undo per 3 secondi
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoChat({ id: chatId, title: chatTitle })
    undoTimerRef.current = setTimeout(async () => {
      setUndoChat(null)
      // Soft delete sul server dopo 3 secondi
      await fetch(`/api/chats/${chatId}`, { method: 'DELETE' }).catch(() => {})
    }, 3000)
  }

  const handleUndoDelete = () => {
    if (!undoChat) return
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    // Ricarica le chat dal server per ripristinare
    fetch('/api/chats').then(r => r.json()).then(data => {
      if (data.chats) setSavedChats(data.chats.map((c: any) => ({
        id: c.id, title: c.title,
        date: new Date(c.updatedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        messages: c.messages, history: c.history,
      })))
    }).catch(() => {})
    setUndoChat(null)
  }

  const handleOpenRoom = async (roomId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`)
      const data = await res.json()
      if (data.room) {
        setActiveRoom(data.room)
        setMyRoomRole(data.myRole ?? 'spectator')
        // Avvia il dibattito con le AI della room usando il topic come domanda
        const aiIds: string[] = Array.isArray(data.room.aiIds) ? data.room.aiIds : ['claude', 'gemini', 'perplexity', 'gpt']
        handleStart(data.room.topic)
      }
    } catch {}
  }

  // Carica cronologia dal server
  useEffect(() => {
    fetch('/api/chats')
      .then(r => r.json())
      .then(data => {
        if (data.chats) {
          setSavedChats(data.chats.map((c: any) => ({
            id: c.id,
            title: c.title,
            date: new Date(c.updatedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
            messages: c.messages,
            history: c.history,
          })))
        }
      })
      .catch(() => {})
  }, [])

  const currentChatIdRef = useRef(`chat-${Date.now()}`)
  const chatTitleRef = useRef<string>('')

  const saveCurrentChat = useCallback(async () => {
    if (messagesRef.current.length < 2) return

    // Genera titolo contestuale la prima volta (quando abbiamo almeno 1 msg AI)
    const msgs = messagesRef.current
    const userMsg = msgs.find(m => m.isUser)?.content ?? ''
    const aiMsg = msgs.find(m => !m.isUser)?.content ?? ''

    if (!chatTitleRef.current && aiMsg) {
      try {
        const res = await fetch('/api/chats/title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: userMsg, firstReply: aiMsg }),
        })
        const data = await res.json()
        if (data.title) chatTitleRef.current = data.title
      } catch {}
    }

    const title = chatTitleRef.current || userMsg.slice(0, 60) || 'Chat'
    const chat = {
      id: currentChatIdRef.current,
      title,
      date: new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      messages: msgs,
      history: chatHistoryRef.current,
    }
    setSavedChats(prev => {
      const filtered = prev.filter(c => c.id !== currentChatIdRef.current)
      return [chat, ...filtered].slice(0, 50)
    })
    fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: chat.id, title: chat.title, messages: chat.messages, history: chat.history }),
    }).catch(() => {})
  }, [])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<Message[]>([])
  const chatHistoryRef = useRef<{ name: string; content: string }[]>([])
  const usedAisRef = useRef<string[]>([])
  const stopRequestedRef = useRef(false)
  const waitingForUserRef = useRef(false)   // ref speculare a waitingForUser
  const aiTurnCountRef = useRef(0)

  // Aggiorna tema se l'utente cambia dark/light mode mentre è nell'app
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      setBgPreset(e.matches
        ? (BG_PRESETS.find(p => p.label === 'Notte') ?? BG_PRESETS[3])
        : (BG_PRESETS.find(p => p.label === 'Crema') ?? BG_PRESETS[0])
      )
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const isDark = bgPreset.text === 'white'
  const displayName = userName.trim() || 'Tu'
  const historyName = userName.trim() || 'Utente'

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    messagesRef.current = messages
    scrollToBottom()
    if (messages.length >= 2) saveCurrentChat()
  }, [messages, thinkingAi, waitingForUser, scrollToBottom, saveCurrentChat])

  const wasDebatingRef = useRef(false) // stava girando il debate quando si è andati in cronologia

  // Stop loop quando si va in cronologia/profilo, riprende quando si torna in running
  useEffect(() => {
    if (phase === 'history' || phase === 'profile' || phase === 'new') {
      // Salva se stava girando (non in pausa per input utente)
      wasDebatingRef.current = !waitingForUserRef.current && !stopRequestedRef.current
      stopRequestedRef.current = true
      setActiveAi(null)
      setThinkingAi(null)
    } else if (phase === 'running') {
      stopRequestedRef.current = false
      // Se stava girando prima di andare in cronologia, riprende
      if (wasDebatingRef.current) {
        wasDebatingRef.current = false
        const lastAi = usedAisRef.current[usedAisRef.current.length - 1] || AI_ORDER[0]
        const nextAi = getDefaultNextAi(lastAi, [], AI_ORDER)
        setTimeout(() => runDebate(nextAi, debateModeRef.current), 300)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const typewriteText = useCallback((msgId: string, text: string): Promise<void> => {
    return new Promise(resolve => {
      let i = 0
      const iv = setInterval(() => {
        if (stopRequestedRef.current) {
          clearInterval(iv)
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: text } : m))
          resolve(); return
        }
        if (i >= text.length) { clearInterval(iv); resolve(); return }
        i++
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: text.slice(0, i) } : m))
        if (i % 14 === 0) scrollToBottom()
      }, TYPEWRITER_DELAY)
    })
  }, [scrollToBottom])

  const streamAiResponse = useCallback(async (aiId: string, isSynthesis = false): Promise<string | null> => {
    if (stopRequestedRef.current) return null
    setThinkingAi(aiId)
    setActiveAi(aiId)

    let fullText = ''
    const controller = new AbortController()
    // Timeout di sicurezza: se dopo 25s non arriva [DONE], abbandona
    const timeout = setTimeout(() => controller.abort(), 25000)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: chatHistoryRef.current, aiId, action: isSynthesis ? 'synthesize' : 'turn', needsWebSearch: needsWebSearchRef.current }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let done = false

      while (!done) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        // Tieni l'ultima riga incompleta nel buffer
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim()
          if (d === '[DONE]') { done = true; break }
          try { fullText += JSON.parse(d).text } catch {}
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('streamAiResponse error:', err)
      // Se abbiamo già del testo parziale, usalo — altrimenti messaggio di errore
      if (!fullText) fullText = '(Risposta interrotta)'
    } finally {
      clearTimeout(timeout)
    }

    setThinkingAi(null)
    if (stopRequestedRef.current) { setActiveAi(null); return null }

    const msgId = `${aiId}-${Date.now()}`
    setMessages(prev => [...prev, { id: msgId, aiId, name: AI_NAMES[aiId] || aiId, content: '', isStreaming: true, isSynthesis }])
    await typewriteText(msgId, fullText)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false, content: fullText } : m))
    setActiveAi(null)
    return fullText
  }, [typewriteText])

  const runFactCheck = useCallback(async (speakerAiId: string): Promise<void> => {
    if (stopRequestedRef.current) return
    // Scegli un interruptore diverso dal parlante E dalla prossima AI in lista
    const nextAiInLine = getDefaultNextAi(speakerAiId, usedAisRef.current, AI_ORDER)
    const others = AI_ORDER.filter(id => id !== speakerAiId && id !== nextAiInLine)
    // Se non ci sono candidati validi (solo 2 AI disponibili), salta il factcheck
    if (others.length === 0) return
    const interruptorId = others[Math.floor(Math.random() * others.length)]
    const interruptorName = AI_NAMES[interruptorId]
    const speakerName = AI_NAMES[speakerAiId]

    let fullText = ''
    const fcController = new AbortController()
    const fcTimeout = setTimeout(() => fcController.abort(), 15000)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: chatHistoryRef.current,
          aiId: interruptorId,
          action: 'factcheck',
          interruptorId,
          speakerName,
        }),
        signal: fcController.signal,
      })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = '', done = false
      while (!done) {
        const { done: sd, value } = await reader.read()
        if (sd) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim()
          if (d === '[DONE]') { done = true; break }
          try { fullText += JSON.parse(d).text } catch {}
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('factcheck error', err)
      return
    } finally {
      clearTimeout(fcTimeout)
    }

    // Se l'AI interruptore non ha trovato errori, non mostrare nulla
    const trimmed = fullText.trim()
    if (!trimmed || trimmed.toUpperCase().startsWith('PASS')) return

    // Mostra l'interruzione come messaggio nella chat
    const msgId = `interrupt-${Date.now()}`
    setMessages(prev => [...prev, {
      id: msgId,
      aiId: interruptorId,
      name: `${interruptorName} ✋`,
      content: '',
      isStreaming: true,
    }])
    // typewrite
    await new Promise<void>(resolve => {
      let i = 0
      const iv = setInterval(() => {
        if (stopRequestedRef.current) { clearInterval(iv); resolve(); return }
        if (i >= trimmed.length) { clearInterval(iv); resolve(); return }
        i++
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: trimmed.slice(0, i) } : m))
      }, 36)
    })
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false, content: trimmed } : m))
    chatHistoryRef.current.push({ name: `${interruptorName} (interruzione)`, content: trimmed })
  }, [AI_ORDER])

  const debateModeRef = useRef<'debate' | 'focused'>('debate')
  const needsWebSearchRef = useRef(false)

  const runDebate = useCallback(async (startAi: string, mode: 'debate' | 'focused' = 'debate') => {
    let currentAi = startAi
    stopRequestedRef.current = false
    debateModeRef.current = mode

    while (!stopRequestedRef.current) {
      const text = await streamAiResponse(currentAi)
      if (!text || stopRequestedRef.current) break

      chatHistoryRef.current.push({ name: AI_NAMES[currentAi], content: text })
      usedAisRef.current.push(currentAi)
      aiTurnCountRef.current += 1
      setTurnCount(aiTurnCountRef.current)

      // Fact-check ogni 3 turni (ridotto da 2 per meno interruzioni)
      if (aiTurnCountRef.current % 3 === 0 && !stopRequestedRef.current) {
        await runFactCheck(currentAi)
      }

      if (debateModeRef.current === 'focused') {
        // Modalità focused: dopo ogni risposta dell'AI principale, aspetta l'utente.
        // Ogni 3 turni lascia intervenire un'altra AI spontaneamente.
        if (aiTurnCountRef.current % 3 === 0 && !stopRequestedRef.current) {
          // Un'altra AI interviene brevemente
          const others = AI_ORDER.filter(id => id !== currentAi)
          const intruder = others[Math.floor(Math.random() * others.length)]
          await new Promise(r => setTimeout(r, 400))
          const intruderText = await streamAiResponse(intruder)
          if (intruderText && !stopRequestedRef.current) {
            chatHistoryRef.current.push({ name: AI_NAMES[intruder], content: intruderText })
          }
        }
        // Aspetta sempre l'utente dopo ogni turno
        waitingForUserRef.current = true
        setWaitingForUser(true)
        stopRequestedRef.current = true
        return
      } else {
        // Modalità debate: round-robin automatico, pausa ogni 4 turni
        const nextAi = getDefaultNextAi(currentAi, usedAisRef.current, AI_ORDER)

        if (aiTurnCountRef.current % 4 === 0) {
          waitingForUserRef.current = true
          setWaitingForUser(true)
          stopRequestedRef.current = true
          return
        }
        await new Promise(r => setTimeout(r, 320))
        currentAi = nextAi
      }
    }
  }, [streamAiResponse, runFactCheck, AI_ORDER])

  const handleStart = async (overrideQuestion?: string) => {
    const q = (overrideQuestion ?? question).trim()
    if (!q) return
    if (overrideQuestion) setQuestion(overrideQuestion)
    currentChatIdRef.current = `chat-${Date.now()}`
    chatTitleRef.current = ''
    chatHistoryRef.current = [{ name: historyName, content: q }]
    usedAisRef.current = []
    aiTurnCountRef.current = 0
    stopRequestedRef.current = false
    setMessages([{ id: 'user-0', aiId: 'user', name: displayName, content: q, isUser: true }])
    setTurnCount(0)
    setPhase('running')

    // AI iniziale: completamente random tra quelle disponibili
    const startAi = AI_ORDER[Math.floor(Math.random() * AI_ORDER.length)]

    // Routing intelligente solo per modalità e web search (in background)
    let mode: 'debate' | 'focused' = 'debate'
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'route', question: q, availableAis: AI_ORDER, history: [] }),
      })
      const data = await res.json()
      if (data.mode === 'focused') mode = 'focused'
      needsWebSearchRef.current = !!data.needsWebSearch
    } catch {}

    runDebate(startAi, mode)
  }

  const handleSendMessage = () => {
    if (!inputText.trim()) return
    const text = inputText.trim()
    setInputText('')
    const messageId = `user-${Date.now()}`
    const userMsg: Message = { id: messageId, aiId: 'user', name: displayName, content: text, isUser: true }
    chatHistoryRef.current.push({ name: historyName, content: text })
    setMessages(prev => [...prev, userMsg])

    // Pubblica su Ably se siamo in una room multiplayer
    if (activeRoom) {
      publish({
        type: 'user_message',
        userId: userEmail ?? '',
        userName: displayName,
        content: text,
        messageId,
      })
    }

    if (waitingForUserRef.current || stopRequestedRef.current) {
      waitingForUserRef.current = false
      setWaitingForUser(false)
      aiTurnCountRef.current = 0
      stopRequestedRef.current = false

      // Se l'utente menziona un'AI, quella risponde per prima ma poi il dibattito
      // riprende normalmente con tutte le AI (non rimane in botta e risposta)
      const mentioned = detectUserMention(text, AI_ORDER)
      const startAi = mentioned || (() => {
        const lastAi = usedAisRef.current[usedAisRef.current.length - 1] || 'claude'
        return getDefaultNextAi(lastAi, [], AI_ORDER)
      })()
      setTimeout(() => runDebate(startAi, 'debate'), 150)
    }
  }

  // ── Logica formati multiplayer ────────────────────────────────────────────
  const handleSelectMode = (mode: GameMode) => {
    setSelectedMode(mode)
    setShowModeSelect(false)
    if (mode === 'devil') {
      const pick = DEVIL_POSITIONS[Math.floor(Math.random() * DEVIL_POSITIONS.length)]
      setDevilSession({ position: pick.position, side: pick.side, round: 1, score: 5.0, messages: [] })
      setPhase('running')
    } else if (mode === '2v2') {
      setShow2v2Setup(true)
    } else if (mode === 'classico') {
      // Torna alla chat normale (fase new → l'utente inserisce topic)
      setSelectedMode(null)
      setPhase('new')
    }
  }

  const handle2v2Start = (config: TwoVsTwoConfig & { roomCode?: string; roomId?: string }) => {
    setShow2v2Setup(false)
    setTwoVsTwoState({
      config,
      messages: [],
      currentTurn: 'A',
      round: 1,
      maxRounds: 4,
      messagesThisTurn: 0,
      maxMessagesPerTurn: 3,
      scoreA: 0,
      scoreB: 0,
      ended: false,
      verdict: null,
      waitingForOpponent: !!config.roomCode,
    })
    setPhase('running')
  }

  const handle2v2AIResponse = async (team: 'A' | 'B', trigger: string): Promise<void> => {
    if (!twoVsTwoState) return
    setTwoVsTwoLoading(true)
    const state = twoVsTwoState
    const { config } = state
    const aiId = team === 'A' ? config.teamA.aiId : config.teamB.aiId
    const aiName = AI_NAMES[aiId]
    const history = state.messages.map(m => ({ name: m.isAI ? AI_NAMES[m.aiId ?? ''] ?? m.author : m.author, content: m.content }))

    // Aggiungi placeholder con streaming (mostra i tre puntini finché content è vuoto)
    setTwoVsTwoState(prev => prev ? {
      ...prev,
      messages: [...prev.messages, { team, isAI: true, aiId, author: aiName, content: '', streaming: true }]
    } : prev)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'turn', aiId,
          history: [
            { name: 'Sistema', content: `Sei ${aiName}, membro della Squadra ${team} nel dibattito su: "${config.topic}". Supporta la tua squadra con argomenti forti e diretti. 2-3 frasi.` },
            ...history,
            { name: 'Sistema', content: `Rispondi a: "${trigger}"` }
          ],
          needsWebSearch: false
        }),
      })
      if (!res.ok || !res.body) throw new Error()
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = '', aiText = '', done = false
      while (!done) {
        const { done: sd, value } = await reader.read(); if (sd) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim(); if (d === '[DONE]') { done = true; break }
          try { aiText += JSON.parse(d).text } catch {}
          setTwoVsTwoState(prev => {
            if (!prev) return prev
            const msgs = [...prev.messages]
            msgs[msgs.length - 1] = { team, isAI: true, aiId, author: aiName, content: aiText, streaming: true }
            return { ...prev, messages: msgs }
          })
        }
      }
      // Finalizza messaggio
      setTwoVsTwoState(prev => {
        if (!prev) return prev
        const msgs = [...prev.messages]
        msgs[msgs.length - 1] = { team, isAI: true, aiId, author: aiName, content: aiText, streaming: false }
        return { ...prev, messages: msgs }
      })
    } catch {
      // Rimuovi placeholder in caso di errore
      setTwoVsTwoState(prev => prev ? { ...prev, messages: prev.messages.slice(0, -1) } : prev)
    }
    setTwoVsTwoLoading(false)
  }

  const handle2v2HumanMessage = async (text: string) => {
    if (!twoVsTwoState || twoVsTwoLoading) return
    const { config, currentTurn, messagesThisTurn, maxMessagesPerTurn, round, maxRounds } = twoVsTwoState
    const author = currentTurn === 'A' ? config.teamA.humanName : config.teamB.humanName

    // Aggiungi messaggio umano
    const newCount = messagesThisTurn + 1
    setTwoVsTwoState(prev => prev ? {
      ...prev,
      messages: [...prev.messages, { team: currentTurn, isAI: false, author, content: text }],
      messagesThisTurn: newCount,
    } : prev)

    // AI alleata della squadra corrente risponde
    await handle2v2AIResponse(currentTurn, text)

    // Calcola se il turno è esaurito (umano + AI = 2 messaggi per slot, max 3 slot = 6 msg)
    const slotsDone = newCount >= maxMessagesPerTurn
    if (slotsDone) {
      const nextTurn: 'A' | 'B' = currentTurn === 'A' ? 'B' : 'A'
      const nextRound = currentTurn === 'B' ? round + 1 : round

      if (nextRound > maxRounds) {
        await handle2v2Verdict()
        return
      }

      // Passa il turno
      setTwoVsTwoState(prev => prev ? {
        ...prev,
        currentTurn: nextTurn,
        round: nextRound,
        messagesThisTurn: 0,
      } : prev)

      // Se il prossimo è B (solo AI, nessun umano reale) → B risponde automaticamente dopo 1s
      if (nextTurn === 'B') {
        setTimeout(async () => {
          const lastHumanMsg = text
          // Prima il messaggio "umano" di B (AI che simula l'avversario umano)
          const bHumanName = twoVsTwoState.config.teamB.humanName
          const bAiIdForHuman = twoVsTwoState.config.teamB.aiId
          setTwoVsTwoState(prev => prev ? {
            ...prev,
            messages: [...prev.messages, { team: 'B' as const, isAI: false, author: bHumanName, content: '…', streaming: false }],
          } : prev)
          await new Promise(r => setTimeout(r, 800))

          // Poi l'AI di B risponde
          await handle2v2AIResponse('B', `Contro-argomenta questa posizione: "${lastHumanMsg}"`)

          // Poi torna ad A
          setTwoVsTwoState(prev => prev ? {
            ...prev,
            currentTurn: 'A',
            messagesThisTurn: 0,
          } : prev)
        }, 1000)
      }
    }
  }

  const handle2v2Verdict = async () => {
    if (!twoVsTwoState) return
    setTwoVsTwoLoading(true)
    const { config } = twoVsTwoState
    const arbId = config.arbiterAiId; const arbName = AI_NAMES[arbId]
    const history = twoVsTwoState.messages.map(m => ({ name: m.isAI ? AI_NAMES[m.aiId ?? ''] ?? m.author : m.author, content: m.content }))
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'turn', aiId: arbId, history: [{ name: 'Sistema', content: `Sei ${arbName}, arbitro del dibattito su: "${config.topic}". Squadra A: ${config.teamA.humanName} + ${AI_NAMES[config.teamA.aiId]}. Squadra B: ${config.teamB.humanName} + ${AI_NAMES[config.teamB.aiId]}. Pronuncia il verdetto finale. Alla fine scrivi SEMPRE su una riga separata il punteggio nel formato esatto: PUNTEGGIO: A=X B=Y (dove X e Y sono numeri interi da 0 a 10). Poi spiega chi ha vinto e perché in 2-3 frasi.` }, ...history], needsWebSearch: false }),
      })
      if (!res.ok || !res.body) throw new Error()
      const reader = res.body.getReader(); const decoder = new TextDecoder()
      let buffer = '', verdict = '', done = false
      setTwoVsTwoState(prev => prev ? { ...prev, messages: [...prev.messages, { team: 'arbiter' as const, isAI: true, aiId: arbId, author: arbName, content: '', streaming: true }], ended: true } : prev)
      while (!done) {
        const { done: sd, value } = await reader.read(); if (sd) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim(); if (d === '[DONE]') { done = true; break }
          try { verdict += JSON.parse(d).text } catch {}
          setTwoVsTwoState(prev => { if (!prev) return prev; const msgs = [...prev.messages]; msgs[msgs.length-1] = { team: 'arbiter' as const, isAI: true, aiId: arbId, author: arbName, content: verdict, streaming: true }; return { ...prev, messages: msgs, verdict } })
        }
      }
      // Estrai punteggio dal verdetto
      const scoreMatch = verdict.match(/PUNTEGGIO:\s*A=(\d+)\s*B=(\d+)/i)
      const sA = scoreMatch ? parseInt(scoreMatch[1]) : 0
      const sB = scoreMatch ? parseInt(scoreMatch[2]) : 0
      // Rimuovi la riga del punteggio dal testo mostrato
      const cleanVerdict = verdict.replace(/PUNTEGGIO:\s*A=\d+\s*B=\d+/i, '').trim()
      setTwoVsTwoState(prev => {
        if (!prev) return prev
        const msgs = [...prev.messages]
        msgs[msgs.length-1] = { ...msgs[msgs.length-1], content: cleanVerdict, streaming: false }
        return { ...prev, messages: msgs, scoreA: sA, scoreB: sB }
      })
    } catch {}
    setTwoVsTwoLoading(false)
  }

  const handleDevilMessage = async (text: string) => {
    if (!devilSession) return
    setDevilLoading(true)
    const updatedMsgs = [...devilSession.messages, { role: 'user' as const, content: text }]
    setDevilSession(prev => prev ? { ...prev, messages: updatedMsgs } : prev)
    try {
      const attackerIds = ['claude', 'gpt', 'gemini']; const attackerId = attackerIds[devilSession.round % attackerIds.length]
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'turn', aiId: attackerId, history: [{ name: 'Sistema', content: `Sei ${AI_NAMES[attackerId]} in un Devil's Advocate. L'utente difende: "${devilSession.position}". Attaccala con argomenti forti. 2-3 frasi.` }, ...updatedMsgs.map(m => ({ name: m.role === 'user' ? 'Utente' : 'AI', content: m.content }))], needsWebSearch: false }),
      })
      if (!res.ok || !res.body) throw new Error()
      const reader = res.body.getReader(); const decoder = new TextDecoder()
      let buffer = '', aiText = '', done = false
      setDevilSession(prev => prev ? { ...prev, messages: [...updatedMsgs, { role: 'ai' as const, aiId: attackerId, content: '' }] } : prev)
      while (!done) {
        const { done: sd, value } = await reader.read(); if (sd) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim(); if (d === '[DONE]') { done = true; break }
          try { aiText += JSON.parse(d).text } catch {}
          setDevilSession(prev => { if (!prev) return prev; const msgs = [...prev.messages]; msgs[msgs.length-1] = { role: 'ai', aiId: attackerId, content: aiText }; return { ...prev, messages: msgs } })
        }
      }
      const argStrength = Math.min(text.length / 20, 3) + (text.includes('perché') || text.includes('quindi') || text.includes('infatti') ? 1 : 0)
      setDevilSession(prev => prev ? { ...prev, score: Math.min(10, Math.max(0, prev.score + (argStrength > 2 ? 0.3 : -0.2))) } : prev)
    } catch {}
    setDevilLoading(false)
  }

  const handleDevilEndTurn = async () => {
    if (!devilSession) return
    const newRound = devilSession.round + 1
    if (newRound > 4) {
      setDevilLoading(true)
      try {
        const res = await fetch('/api/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'turn', aiId: 'claude', history: [{ name: 'Sistema', content: `Sei un giudice. L'utente ha difeso: "${devilSession.position}". Dai un verdetto: punteggio 0-10, punto più forte, punto più debole. Sii conciso.` }, ...devilSession.messages.map(m => ({ name: m.role === 'user' ? 'Utente' : 'AI', content: m.content }))], needsWebSearch: false }),
        })
        if (res.ok && res.body) {
          const reader = res.body.getReader(); const decoder = new TextDecoder()
          let buffer = '', verdict = '', done = false
          setDevilSession(prev => prev ? { ...prev, messages: [...prev.messages, { role: 'ai' as const, aiId: 'claude', content: '⚖️ Verdetto:\n' }], round: newRound } : prev)
          while (!done) {
            const { done: sd, value } = await reader.read(); if (sd) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n'); buffer = lines.pop() ?? ''
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const d = line.slice(6).trim(); if (d === '[DONE]') { done = true; break }
              try { verdict += JSON.parse(d).text } catch {}
              setDevilSession(prev => { if (!prev) return prev; const msgs = [...prev.messages]; msgs[msgs.length-1] = { role: 'ai', aiId: 'claude', content: '⚖️ Verdetto:\n' + verdict }; return { ...prev, messages: msgs } })
            }
          }
        }
      } catch {}
      setDevilLoading(false)
    } else {
      setDevilSession(prev => prev ? { ...prev, round: newRound } : prev)
    }
  }

  const handleTogglePortfolio = async () => {
    const newValue = !isPublic
    setIsPublic(newValue)
    setPortfolioSaved(false)
    try {
      await fetch('/api/chats/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: currentChatIdRef.current, isPublic: newValue }),
      })
      setPortfolioSaved(true)
      setTimeout(() => setPortfolioSaved(false), 2000)
    } catch {}
  }

  const handleSynthesize = async () => {
    setIsSynthesizing(true)
    setShowSynthesis(true)
    stopRequestedRef.current = true
    setThinkingAi(null); setActiveAi(null); setWaitingForUser(false)
    await new Promise(r => setTimeout(r, 200))
    stopRequestedRef.current = false
    let fullText = ''
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: chatHistoryRef.current, aiId: 'claude', action: 'synthesize' }),
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (line.startsWith('data: ')) {
            const d = line.slice(6).trim()
            if (d === '[DONE]') break
            try { fullText += JSON.parse(d).text; setSynthesis(fullText) } catch {}
          }
        }
      }
    } catch { fullText = 'Errore nella sintesi.' }
    setSynthesis(fullText)
    setIsSynthesizing(false)
    setPhase('done')
    saveCurrentChat()
  }

  const handleReset = () => {
    stopRequestedRef.current = true
    waitingForUserRef.current = false
    setMessages([]); setQuestion(''); setInputText(''); setUserName('')
    setPhase('start'); setActiveAi(null); setThinkingAi(null)
    setSynthesis(null); setShowSynthesis(false); setWaitingForUser(false)
    setIsPublic(false); setPortfolioSaved(false)
    setActiveRoom(null); setMyRoomRole('spectator')
    setTurnCount(0)
    chatHistoryRef.current = []; usedAisRef.current = []
    aiTurnCountRef.current = 0
    setShowModeSelect(false); setSelectedMode(null)
    setShow2v2Setup(false); setTwoVsTwoState(null)
    setDevilSession(null)
  }

  // ── SCHERMATA NOME ────────────────────────────────────────────────────────────
  const navbarProps = {
    onCronologia: () => setShowHistory(true),
    onFeed: () => { setSocialTab('feed'); setShowSocialPanel(true) },
    onCrea: () => { setSocialTab('crea'); setShowSocialPanel(true) },
    onNewChat: () => { handleReset(); setPhase('new') },
    onMultiplayer: () => setShowModeSelect(true),
    displayName,
    userEmail,
    userPlan: effectivePlan,
    showProfileMenu,
    setShowProfileMenu,
    onSignOut: () => signOut({ callbackUrl: '/login' }),
    unreadCount,
    dbUserName,
    isBeta,
  }

  if (!nameConfirmed) {
    return (
      <div className="desktop-bg min-h-screen flex flex-col items-center justify-center px-4">

        {/* Card nome centrale */}
        <div className="glass rounded-3xl p-8 w-full max-w-sm scale-in text-center">
          <div className="text-5xl mb-4">👋</div>
          <h2 className="text-2xl font-black text-white mb-2">Come ti chiami?</h2>
          <p className="text-white/50 text-sm mb-8">Il tuo nome apparirà nel dibattito tra le AI</p>
          <input
            autoFocus
            type="text"
            placeholder="Il tuo nome…"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && nameInput.trim()) {
                const n = nameInput.trim()
                setUserName(n)
                setNameConfirmed(true)
                fetch('/api/user/name', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: n }) }).catch(() => {})
              }
            }}
            className="w-full px-4 py-3 rounded-xl bg-white/5 text-white placeholder-white/25 border border-white/10 focus:outline-none focus:border-purple-400/50 focus:ring-2 focus:ring-purple-500/10 text-sm mb-4 transition-all duration-200"
          />
          <button
            onClick={() => {
              if (nameInput.trim()) {
                const n = nameInput.trim()
                setUserName(n)
                setNameConfirmed(true)
                fetch('/api/user/name', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: n }) }).catch(() => {})
              }
            }}
            disabled={!nameInput.trim()}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: nameInput.trim() ? 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)' : '#333', boxShadow: nameInput.trim() ? '0 4px 20px rgba(124, 58, 237, 0.35)' : undefined }}>
            Entra nel dibattito →
          </button>
        </div>
      </div>
    )
  }

  // ── SCHERMATA INIZIALE ────────────────────────────────────────────────────────
  if (phase === 'start') {
    return (
      <>
      <div className="desktop-bg relative overflow-hidden"
        style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Pannello cronologia (disponibile anche dalla start) ── */}
        <div className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 ease-out ${showHistory ? 'w-72' : 'w-0'} overflow-hidden`}>
          <div className="w-72 h-full flex flex-col" style={{ backgroundColor: 'rgba(10,10,18,0.97)', borderRight: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <span className="text-white font-bold text-sm">Cronologia</span>
              <div className="flex items-center gap-3">
                <button onClick={() => { handleReset(); setPhase('new'); setShowHistory(false) }}
                  className="text-purple-400 hover:text-purple-300 text-xs font-semibold transition-colors">
                  + Nuova
                </button>
                <button onClick={() => setShowHistory(false)} className="text-white/40 hover:text-white text-xl leading-none transition-colors">×</button>
              </div>
            </div>
            {/* Undo banner */}
            {undoChat && (
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
                <span className="text-white/60 text-xs truncate mr-2">"{undoChat.title}" eliminata · rimossa entro 30gg</span>
                <button onClick={handleUndoDelete} className="text-red-400 text-xs font-bold flex-shrink-0 hover:text-red-300 transition-colors">Annulla</button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto py-2">
              {savedChats.length === 0 ? (
                <p className="text-white/25 text-xs text-center mt-8 px-4">Nessuna chat salvata.</p>
              ) : (
                savedChats.map(chat => (
                  <SwipeableChatRow
                    key={chat.id}
                    chat={chat}
                    onOpen={() => { setMessages(chat.messages); chatHistoryRef.current = chat.history; setPhase('running'); setShowHistory(false) }}
                    onDelete={(e) => handleDeleteChat(chat.id, chat.title, e)}
                    bgColor="rgba(10,10,18,0.97)"
                  />
                ))
              )}
            </div>
          </div>
        </div>
        {showHistory && <div className="fixed inset-0 z-[39]" onClick={() => setShowHistory(false)} />}

        {/* ── Navbar desktop ── */}
        <div className="hidden lg:block flex-shrink-0">
          <Navbar {...navbarProps} />
        </div>

        {/* ── Bubble fluttuanti (solo desktop xl+) — 12 bolle ── */}
        {[
          { top: '180px', left: 'calc(50% - 560px)', delay: '-2s',   dur: '14s', anim: 'float-1' },
          { top: '320px', left: 'calc(50% - 550px)', delay: '-7s',   dur: '13s', anim: 'float-3' },
          { top: '460px', left: 'calc(50% - 560px)', delay: '-4s',   dur: '15s', anim: 'float-2' },
          { top: '600px', left: 'calc(50% - 545px)', delay: '-9s',   dur: '12s', anim: 'float-4' },
          { top: '720px', left: 'calc(50% - 555px)', delay: '-5s',   dur: '14s', anim: 'float-1' },
          { top: '840px', left: 'calc(50% - 545px)', delay: '-11s',  dur: '13s', anim: 'float-3' },
          { top: '180px', right: 'calc(50% - 560px)', delay: '-3s',  dur: '13s', anim: 'float-2' },
          { top: '320px', right: 'calc(50% - 550px)', delay: '-8s',  dur: '15s', anim: 'float-4' },
          { top: '460px', right: 'calc(50% - 560px)', delay: '-6s',  dur: '12s', anim: 'float-1' },
          { top: '600px', right: 'calc(50% - 545px)', delay: '-1s',  dur: '14s', anim: 'float-3' },
          { top: '720px', right: 'calc(50% - 555px)', delay: '-10s', dur: '13s', anim: 'float-2' },
          { top: '840px', right: 'calc(50% - 545px)', delay: '-4.5s',dur: '15s', anim: 'float-4' },
        ].map(({ top, left, right, delay, dur, anim }: any, i) => (
          <button key={i}
            className="absolute hidden lg:block px-4 py-2 rounded-full text-[11px] cursor-pointer transition-all hover:scale-105 hover:brightness-125"
            onAnimationIteration={() => rotateBubble(i)}
            onClick={() => handleStart(bubbleTopics[i])}
            style={{
              top, left, right,
              color: 'rgba(255,255,255,0.5)',
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(6px)',
              maxWidth: '160px',
              textAlign: 'center',
              lineHeight: 1.4,
              animation: `${anim} ${dur} ease-in-out infinite`,
              animationDelay: delay,
              zIndex: 20,
              pointerEvents: 'auto',
            }}>
            {bubbleTopics[i]}
          </button>
        ))}

        {/* ── Contenuto principale — occupa tutto lo spazio rimanente ── */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 scale-in"
          style={{
            paddingLeft: '20px',
            paddingRight: '20px',
            paddingTop: 'max(env(safe-area-inset-top), 16px)',
            paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
            gap: '0',
            overflow: 'hidden',
          }}>

          <div className="w-full max-w-lg flex flex-col" style={{ gap: '14px' }}>

            {/* ── HERO ── */}
            <div className="text-center">
              {/* Badge — nascosto su mobile piccolo per risparmiare spazio */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-[11px] font-medium text-purple-300 border border-purple-500/30"
                style={{ backgroundColor: 'rgba(124,58,237,0.12)' }}>
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
                4 intelligenze artificiali · dibattito in tempo reale
              </div>
              {/* Logo */}
              <h1 className="font-black tracking-tight leading-none"
                style={{ fontSize: 'clamp(2.8rem, 14vw, 4rem)', marginBottom: '8px' }}>
                <span className="text-white">Ai</span>
                <span style={{ color: '#A78BFA' }}>GORÀ</span>
              </h1>
              {/* Sottotitolo */}
              <p className="text-white/50 leading-relaxed mx-auto"
                style={{ fontSize: 'clamp(0.75rem, 3.5vw, 0.875rem)', maxWidth: '340px' }}>
                Poni una domanda e assisti al dibattito in tempo reale tra le quattro principali intelligenze artificiali
              </p>
            </div>

            {/* ── AI cards ── */}
            <div className="grid grid-cols-4 gap-2">
              {AI_ORDER.map(id => (
                <div key={id} className="glass rounded-2xl flex flex-col items-center text-center"
                  style={{ padding: '10px 4px', gap: '6px' }}>
                  <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{
                      width: 'clamp(32px, 9vw, 44px)',
                      height: 'clamp(32px, 9vw, 44px)',
                      fontSize: 'clamp(9px, 2.5vw, 13px)',
                      backgroundColor: AI_COLOR[id],
                      boxShadow: `0 4px 16px ${AI_COLOR[id]}60`,
                    }}>
                    {id === 'gemini' ? 'Ge' : AI_NAMES[id][0]}
                  </div>
                  <div>
                    <div className="text-white font-semibold leading-tight"
                      style={{ fontSize: 'clamp(9px, 2.8vw, 12px)' }}>
                      {AI_NAMES[id]}
                    </div>
                    <div className="text-white/35 leading-tight mt-0.5"
                      style={{ fontSize: 'clamp(7px, 2vw, 9px)' }}>
                      {AI_DESC[id]}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Form domanda ── */}
            <div className="glass rounded-3xl" style={{ padding: '12px' }}>
              <textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleStart() } }}
                placeholder="Poni una domanda alle AI…"
                rows={3}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-purple-500/50 placeholder:text-white/20 resize-none leading-relaxed transition-colors"
                style={{ fontSize: 'clamp(13px, 3.5vw, 15px)', marginBottom: '8px' }}
              />
              <div className="lg:hidden">
                <RotatingTopics onSelect={setQuestion} />
              </div>
              <button
                onClick={() => handleStart()}
                disabled={!question.trim()}
                className="w-full rounded-xl font-semibold text-white transition-all disabled:opacity-25 disabled:cursor-not-allowed active:scale-[0.98]"
                style={{
                  padding: '13px',
                  fontSize: 'clamp(13px, 3.5vw, 15px)',
                  background: question.trim() ? 'linear-gradient(135deg, #7C3AED, #5B21B6)' : '#333',
                  boxShadow: question.trim() ? '0 4px 24px rgba(124,58,237,0.45)' : undefined,
                }}>
                Avvia il dibattito →
              </button>
            </div>

            {/* ── TAB FEED ── */}
            {(effectivePlan === 'admin' || isBeta) && socialTab === 'feed' && (
              <div className="flex flex-col gap-3">
                {/* Notifiche pendenti */}
                {notifications.filter(n => !n.read).map((n: any) => (
                  <div key={n.id} className="glass rounded-2xl p-4" style={{ borderColor: 'rgba(124,58,237,0.3)', backgroundColor: 'rgba(124,58,237,0.07)' }}>
                    <div className="text-sm text-white/80 mb-2">
                      {n.type === 'room_invite' && <span><strong className="text-white">{n.fromName}</strong> ti ha invitato: <em className="text-white/70">"{n.roomTopic}"</em></span>}
                      {n.type === 'follow' && <span><strong className="text-white">{n.fromName}</strong> ha iniziato a seguirti</span>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={async () => {
                        if (n.roomId) await fetch(`/api/rooms/${n.roomId}/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'accept' }) })
                        else await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificationId: n.id }) })
                        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
                        setUnreadCount(c => Math.max(0, c - 1))
                        if (n.roomId) { await fetch('/api/rooms').then(r => r.json()).then(d => { if (d.rooms) setRooms(d.rooms) }) }
                      }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)' }}>
                        Accetta
                      </button>
                      <button onClick={async () => {
                        if (n.roomId) await fetch(`/api/rooms/${n.roomId}/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject' }) })
                        else await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificationId: n.id }) })
                        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
                        setUnreadCount(c => Math.max(0, c - 1))
                      }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white/40" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                        Rifiuta
                      </button>
                    </div>
                  </div>
                ))}

                {/* Lista room */}
                {rooms.length === 0 ? (
                  <div className="text-center py-8 text-white/25 text-sm">Nessun dibattito ancora.</div>
                ) : rooms.map((room: any) => {
                  const aiColors: Record<string,string> = { claude:'#7C3AED', gpt:'#10A37F', gemini:'#1A73E8', perplexity:'#FF6B2B' }
                  const aiNames: Record<string,string> = { claude:'Claude', gpt:'GPT', gemini:'Gemini', perplexity:'Perplexity' }
                  const ais: string[] = Array.isArray(room.aiIds) ? room.aiIds : []
                  return (
                    <div key={room.id} className="glass rounded-2xl p-4 active:scale-[0.99] transition-transform" style={{ cursor: 'pointer' }} onClick={() => handleOpenRoom(room.id)}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {room.status === 'live' ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ backgroundColor:'rgba(239,68,68,0.15)', color:'#f87171', border:'1px solid rgba(239,68,68,0.25)' }}>
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />LIVE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-white/30" style={{ backgroundColor:'rgba(255,255,255,0.06)' }}>CONCLUSO</span>
                          )}
                          {room.visibility === 'private' && <span className="text-[10px] text-white/30">🔒</span>}
                        </div>
                        <span className="text-[10px] text-white/25">{new Date(room.createdAt).toLocaleDateString('it-IT', { day:'2-digit', month:'short' })}</span>
                      </div>
                      <div className="text-sm font-bold text-white mb-2 leading-snug">{room.topic}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex">
                          {room.participants?.slice(0,5).map((p: any, i: number) => (
                            <div key={p.id} className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white border border-black/30"
                              style={{ backgroundColor:'#F59E0B', marginLeft: i > 0 ? '-5px' : '0' }}>
                              {(p.user?.name || '?')[0].toUpperCase()}
                            </div>
                          ))}
                        </div>
                        <span className="text-[10px] text-white/30">{room.participants?.length} {room.participants?.length === 1 ? 'umano' : 'umani'}</span>
                        <div className="flex gap-1">
                          {ais.map(id => (
                            <span key={id} className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                              style={{ backgroundColor:`${aiColors[id]}22`, color: aiColors[id] }}>
                              {aiNames[id]}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── TAB CREA ── */}
            {(effectivePlan === 'admin' || isBeta) && socialTab === 'crea' && (
              <div className="glass rounded-3xl p-4 flex flex-col gap-3">
                <div className="text-xs font-bold text-white/40 uppercase tracking-wide">Tema del dibattito</div>
                <textarea
                  value={createTopic}
                  onChange={e => setCreateTopic(e.target.value)}
                  placeholder="Es. L'IA sostituirà i lavori creativi?"
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-500/50 placeholder:text-white/20 resize-none"
                />

                {/* Visibilità */}
                <div>
                  <div className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">Visibilità</div>
                  <div className="flex gap-2">
                    {(['public','private'] as const).map(v => (
                      <button key={v} onClick={() => setCreateVisibility(v)}
                        className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                        style={{
                          backgroundColor: createVisibility === v ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)',
                          border: createVisibility === v ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.1)',
                          color: createVisibility === v ? '#A78BFA' : 'rgba(255,255,255,0.35)',
                        }}>
                        {v === 'public' ? '🌍 Pubblico' : '🔒 Privato'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI */}
                <div>
                  <div className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">AI partecipanti</div>
                  <div className="flex gap-2 flex-wrap">
                    {[['claude','Claude','#7C3AED'],['gemini','Gemini','#1A73E8'],['perplexity','Perplexity','#FF6B2B'],['gpt','GPT','#10A37F']].map(([id,name,color]) => {
                      const active = createAis.includes(id)
                      return (
                        <button key={id} onClick={() => setCreateAis(prev => active ? prev.filter(a => a !== id) : [...prev, id])}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                          style={{
                            backgroundColor: active ? `${color}25` : 'rgba(255,255,255,0.05)',
                            border: active ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.1)',
                            color: active ? color : 'rgba(255,255,255,0.35)',
                          }}>
                          {name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Invita */}
                <div>
                  <div className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">Invita amici (max 4)</div>
                  <input
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Cerca per nome…"
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-500/50 placeholder:text-white/20 mb-2"
                  />
                  {userResults.length > 0 && (
                    <div className="flex flex-col gap-1 mb-2">
                      {userResults.filter(u => !createInvited.find(i => i.id === u.id)).map((u: any) => (
                        <button key={u.id} onClick={() => { if (createInvited.length < 4) { setCreateInvited(prev => [...prev, { id: u.id, name: u.name || u.email }]); setUserSearch(''); setUserResults([]) } }}
                          className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 transition-colors text-left">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor:'#7C3AED' }}>
                            {(u.name || u.email || '?')[0].toUpperCase()}
                          </div>
                          <span className="text-sm text-white/70">{u.name || u.email}</span>
                          <span className="ml-auto text-[10px] text-purple-400">+ aggiungi</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {createInvited.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {createInvited.map(u => (
                        <span key={u.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ backgroundColor:'rgba(124,58,237,0.15)', border:'1px solid rgba(124,58,237,0.3)', color:'#A78BFA' }}>
                          {u.name}
                          <button onClick={() => setCreateInvited(prev => prev.filter(i => i.id !== u.id))} className="opacity-50 hover:opacity-100 ml-0.5">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={handleCreateRoom} disabled={!createTopic.trim() || creatingRoom}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-30"
                  style={{ background:'linear-gradient(135deg,#7C3AED,#5B21B6)', boxShadow:'0 4px 20px rgba(124,58,237,0.4)' }}>
                  {creatingRoom ? 'Creazione…' : 'Lancia il dibattito →'}
                </button>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* ── SELEZIONE FORMATO MULTIPLAYER (dalla start) ── */}
      {showModeSelect && typeof window !== 'undefined' && createPortal(
        <ModeSelect
          onSelect={handleSelectMode}
          onClose={() => setShowModeSelect(false)}
        />,
        document.body
      )}

      {/* ── SETUP 2 vs 2 (dalla start) ── */}
      {show2v2Setup && typeof window !== 'undefined' && createPortal(
        <TwoVsTwoSetup
          onStart={handle2v2Start}
          onBack={() => { setShow2v2Setup(false); setSelectedMode(null) }}
          currentUserName={displayName !== 'Tu' ? displayName : ''}
        />,
        document.body
      )}

      {/* ── SCHERMATA 2v2 (dalla start, via portal) ── */}
      {selectedMode === '2v2' && twoVsTwoState && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999]" style={{ background: '#0d0d14' }}>
          <TwoVsTwoScreen
            state={twoVsTwoState}
            onHumanMessage={handle2v2HumanMessage}
            onRequestAI={(team) => handle2v2AIResponse(team, 'Supporta la squadra con un argomento forte.')}
            loading={twoVsTwoLoading}
            myTeam="A"
            onBack={() => { setSelectedMode(null); setTwoVsTwoState(null); setPhase('start') }}
          />
        </div>,
        document.body
      )}
      </>
    )
  }

  // ── SCHERMATA CHAT ────────────────────────────────────────────────────────────
  return (
    <div className="desktop-bg min-h-screen flex items-center justify-center pt-14 p-6 gap-6 chat-layout relative">

      {/* ── Bubble fluttuanti desktop — solo quando non ci sono messaggi ── */}
      {messages.length === 0 && [
        { top: '180px', left: 'calc(50% - 560px)', delay: '-2s',   dur: '14s', anim: 'float-1' },
        { top: '320px', left: 'calc(50% - 550px)', delay: '-7s',   dur: '13s', anim: 'float-3' },
        { top: '460px', left: 'calc(50% - 560px)', delay: '-4s',   dur: '15s', anim: 'float-2' },
        { top: '600px', left: 'calc(50% - 545px)', delay: '-9s',   dur: '12s', anim: 'float-4' },
        { top: '720px', left: 'calc(50% - 555px)', delay: '-5s',   dur: '14s', anim: 'float-1' },
        { top: '840px', left: 'calc(50% - 545px)', delay: '-11s',  dur: '13s', anim: 'float-3' },
        { top: '180px', right: 'calc(50% - 560px)', delay: '-3s',  dur: '13s', anim: 'float-2' },
        { top: '320px', right: 'calc(50% - 550px)', delay: '-8s',  dur: '15s', anim: 'float-4' },
        { top: '460px', right: 'calc(50% - 560px)', delay: '-6s',  dur: '12s', anim: 'float-1' },
        { top: '600px', right: 'calc(50% - 545px)', delay: '-1s',  dur: '14s', anim: 'float-3' },
        { top: '720px', right: 'calc(50% - 555px)', delay: '-10s', dur: '13s', anim: 'float-2' },
        { top: '840px', right: 'calc(50% - 545px)', delay: '-4.5s',dur: '15s', anim: 'float-4' },
      ].map(({ top, left, right, delay, dur, anim }: any, i) => (
        <button key={i}
          className="absolute hidden lg:block px-4 py-2 rounded-full text-[11px] cursor-pointer transition-all hover:scale-105 hover:brightness-125"
          onAnimationIteration={() => rotateBubble(i)}
          onClick={() => handleStart(bubbleTopics[i] ?? bubbleTopics[0])}
          style={{
            top, left, right,
            color: 'rgba(255,255,255,0.5)',
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(6px)',
            maxWidth: '160px',
            textAlign: 'center',
            lineHeight: 1.4,
            animation: `${anim} ${dur} ease-in-out infinite`,
            animationDelay: delay,
            zIndex: 5,
            pointerEvents: 'auto',
          }}>
          {bubbleTopics[i] ?? bubbleTopics[0]}
        </button>
      ))}

      {/* Pannello cronologia */}
      <div className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 ease-out ${showHistory ? 'w-72' : 'w-0'} overflow-hidden`}>
        <div className="w-72 h-full flex flex-col" style={{ backgroundColor: 'rgba(10,10,18,0.97)', borderRight: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <span className="text-white font-bold text-sm">Cronologia</span>
            <button onClick={() => setShowHistory(false)} className="text-white/40 hover:text-white text-xl leading-none transition-colors">×</button>
          </div>
          {/* Undo banner */}
          {undoChat && (
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
              <span className="text-white/60 text-xs truncate mr-2">"{undoChat.title}" eliminata</span>
              <button onClick={handleUndoDelete} className="text-red-400 text-xs font-bold flex-shrink-0 hover:text-red-300 transition-colors">Annulla</button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto py-2">
            {savedChats.length === 0 ? (
              <p className="text-white/25 text-xs text-center mt-8 px-4">Nessuna chat salvata.<br />Le chat vengono salvate dopo la sintesi.</p>
            ) : (
              savedChats.map(chat => (
                <div key={chat.id} className="flex items-center group border-b border-white/5 hover:bg-white/5 transition-colors">
                  <button onClick={() => { setMessages(chat.messages); chatHistoryRef.current = chat.history; setPhase('running'); setShowHistory(false) }}
                    className="flex-1 text-left px-5 py-3 min-w-0">
                    <div className="text-white/80 text-xs font-medium truncate">{chat.title}</div>
                    <div className="text-white/30 text-[10px] mt-0.5">{chat.date}</div>
                  </button>
                  <button onClick={(e) => handleDeleteChat(chat.id, chat.title, e)}
                    className="flex-shrink-0 mr-3 w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: '#ef4444' }}>
                    <svg width="10" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="px-5 py-4 border-t border-white/8">
            <button onClick={() => {
              setSavedChats([])
            }} className="text-red-400/60 hover:text-red-400 text-xs transition-colors">
              Cancella cronologia
            </button>
          </div>
        </div>
      </div>

      {/* Overlay chiusura pannello cronologia */}
      {showHistory && <div className="fixed inset-0 z-[39]" onClick={() => setShowHistory(false)} />}

      {/* ── PANNELLO SOCIAL ── */}
      {(effectivePlan === 'admin' || isBeta) && (
        <>
          <div className={`fixed top-0 right-0 h-full z-50 transition-all duration-300 ease-out ${showSocialPanel ? 'w-80' : 'w-0'} overflow-hidden`}>
            <div className="w-80 h-full flex flex-col" style={{ backgroundColor: 'rgba(10,10,18,0.97)', borderLeft: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <div className="flex gap-1">
                  {(['feed', 'crea'] as const).map(tab => (
                    <button key={tab} onClick={() => setSocialTab(tab)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                      style={{
                        backgroundColor: socialTab === tab ? 'rgba(124,58,237,0.3)' : 'transparent',
                        color: socialTab === tab ? '#A78BFA' : 'rgba(255,255,255,0.4)',
                      }}>
                      {tab === 'feed' ? '🏛 Feed' : '＋ Crea'}
                      {tab === 'feed' && unreadCount > 0 && (
                        <span className="ml-1 px-1 py-0.5 rounded-full text-[9px] font-black" style={{ backgroundColor: '#7C3AED', color: 'white' }}>{unreadCount}</span>
                      )}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowSocialPanel(false)} className="text-white/40 hover:text-white text-xl leading-none transition-colors">×</button>
              </div>

              {/* Contenuto */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">

                {/* FEED */}
                {socialTab === 'feed' && (
                  <>
                    {notifications.filter(n => !n.read).map((n: any) => (
                      <div key={n.id} className="rounded-2xl p-4" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)' }}>
                        <div className="text-sm text-white/80 mb-2">
                          {n.type === 'room_invite' && <span><strong className="text-white">{n.fromName}</strong> ti ha invitato: <em className="text-white/70">"{n.roomTopic}"</em></span>}
                          {n.type === 'follow' && <span><strong className="text-white">{n.fromName}</strong> ha iniziato a seguirti</span>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={async () => {
                            await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificationId: n.id }) })
                            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
                            setUnreadCount(c => Math.max(0, c - 1))
                          }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)' }}>
                            Accetta
                          </button>
                          <button onClick={async () => {
                            await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificationId: n.id }) })
                            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
                            setUnreadCount(c => Math.max(0, c - 1))
                          }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white/40" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                            Rifiuta
                          </button>
                        </div>
                      </div>
                    ))}
                    {rooms.length === 0 ? (
                      <div className="text-center py-8 text-white/25 text-sm">Nessun dibattito ancora.</div>
                    ) : rooms.map((room: any) => {
                      const aiColors: Record<string,string> = { claude:'#7C3AED', gpt:'#10A37F', gemini:'#1A73E8', perplexity:'#FF6B2B' }
                      const aiNames: Record<string,string> = { claude:'Claude', gpt:'GPT', gemini:'Gemini', perplexity:'Perplexity' }
                      const ais: string[] = Array.isArray(room.aiIds) ? room.aiIds : []
                      return (
                        <div key={room.id} className="rounded-2xl p-4 transition-all cursor-pointer hover:bg-white/5"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                          onClick={() => { handleOpenRoom(room.id); setShowSocialPanel(false) }}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {room.status === 'live' ? (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ backgroundColor:'rgba(239,68,68,0.15)', color:'#f87171', border:'1px solid rgba(239,68,68,0.25)' }}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />LIVE
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-white/30" style={{ backgroundColor:'rgba(255,255,255,0.06)' }}>CONCLUSO</span>
                              )}
                              {room.visibility === 'private' && <span className="text-[10px] text-white/30">🔒</span>}
                            </div>
                            <span className="text-[10px] text-white/25">{new Date(room.createdAt).toLocaleDateString('it-IT', { day:'2-digit', month:'short' })}</span>
                          </div>
                          <div className="text-sm font-bold text-white mb-2 leading-snug">{room.topic}</div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex">
                              {room.participants?.slice(0,5).map((p: any, i: number) => (
                                <div key={p.id} className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                                  style={{ backgroundColor:'#F59E0B', marginLeft: i > 0 ? '-5px' : '0', border: '1.5px solid rgba(10,10,18,1)' }}>
                                  {(p.user?.name || '?')[0].toUpperCase()}
                                </div>
                              ))}
                            </div>
                            <span className="text-[10px] text-white/30">{room.participants?.length} umani</span>
                            <div className="flex gap-1 ml-auto">
                              {ais.map(id => (
                                <span key={id} className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                                  style={{ backgroundColor:`${aiColors[id]}22`, color: aiColors[id] }}>
                                  {aiNames[id]}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}

                {/* CREA */}
                {socialTab === 'crea' && (
                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">Tema</div>
                      <textarea value={createTopic} onChange={e => setCreateTopic(e.target.value)}
                        placeholder="Es. L'IA sostituirà i lavori creativi?"
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-500/50 placeholder:text-white/20 resize-none"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">Visibilità</div>
                      <div className="flex gap-2">
                        {(['public','private'] as const).map(v => (
                          <button key={v} onClick={() => setCreateVisibility(v)}
                            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                            style={{ backgroundColor: createVisibility === v ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)', border: createVisibility === v ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.1)', color: createVisibility === v ? '#A78BFA' : 'rgba(255,255,255,0.35)' }}>
                            {v === 'public' ? '🌍 Pubblico' : '🔒 Privato'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">AI</div>
                      <div className="flex gap-2 flex-wrap">
                        {[['claude','Claude','#7C3AED'],['gemini','Gemini','#1A73E8'],['perplexity','Perplexity','#FF6B2B'],['gpt','GPT','#10A37F']].map(([id,name,color]) => {
                          const active = createAis.includes(id)
                          return (
                            <button key={id} onClick={() => setCreateAis(prev => active ? prev.filter(a => a !== id) : [...prev, id])}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                              style={{ backgroundColor: active ? `${color}25` : 'rgba(255,255,255,0.05)', border: active ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.1)', color: active ? color : 'rgba(255,255,255,0.35)' }}>
                              {name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">Invita amici (max 4)</div>
                      <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                        placeholder="Cerca per nome…"
                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-500/50 placeholder:text-white/20 mb-2"
                      />
                      {userResults.length > 0 && (
                        <div className="flex flex-col gap-1 mb-2">
                          {userResults.filter(u => !createInvited.find(i => i.id === u.id)).map((u: any) => (
                            <button key={u.id} onClick={() => { if (createInvited.length < 4) { setCreateInvited(prev => [...prev, { id: u.id, name: u.name || u.email }]); setUserSearch(''); setUserResults([]) } }}
                              className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 transition-colors text-left">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor:'#7C3AED' }}>
                                {(u.name || u.email || '?')[0].toUpperCase()}
                              </div>
                              <span className="text-sm text-white/70">{u.name || u.email}</span>
                              <span className="ml-auto text-[10px] text-purple-400">+ aggiungi</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {createInvited.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {createInvited.map(u => (
                            <span key={u.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                              style={{ backgroundColor:'rgba(124,58,237,0.15)', border:'1px solid rgba(124,58,237,0.3)', color:'#A78BFA' }}>
                              {u.name}
                              <button onClick={() => setCreateInvited(prev => prev.filter(i => i.id !== u.id))} className="opacity-50 hover:opacity-100 ml-0.5">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={handleCreateRoom} disabled={!createTopic.trim() || creatingRoom}
                      className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-30"
                      style={{ background:'linear-gradient(135deg,#7C3AED,#5B21B6)', boxShadow:'0 4px 20px rgba(124,58,237,0.4)' }}>
                      {creatingRoom ? 'Creazione…' : 'Lancia il dibattito →'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {showSocialPanel && <div className="fixed inset-0 z-[49]" onClick={() => setShowSocialPanel(false)} />}
        </>
      )}

      <Navbar {...navbarProps} />

      {/* ── TELEFONO (desktop) ── */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
      {/* Titolo sopra il telefono — solo in 2v2 */}
      {phase === 'running' && selectedMode === '2v2' && twoVsTwoState && (
        <div className="text-xs font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
          2 vs 2
        </div>
      )}
      <div className="phone-shell relative scale-in" style={{ width: 390, height: 790 }}>

        {/* Cornice */}
        <div className="absolute inset-0 rounded-[50px] bg-[#1c1c1e]"
          style={{ boxShadow: '0 0 0 1.5px #3a3a3c, 0 40px 100px rgba(0,0,0,0.8), 0 0 0 0.5px #555 inset' }} />

        {/* Glare */}
        <div className="phone-glare" />

        {/* Schermo desktop */}
        <div className="absolute rounded-[44px] overflow-hidden flex flex-col"
          style={{ top: 9, left: 9, right: 9, bottom: 9, backgroundColor: bgPreset.value }}>

          {/* Status bar */}
          <div className="flex-shrink-0 flex items-center justify-between px-5 pt-3 pb-1.5" style={{ backgroundColor: bgPreset.header }}>
            <span className="text-[11px] font-semibold tabular-nums" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>{currentTime}</span>
            <div className="w-[72px] h-[18px] bg-[#1c1c1e] rounded-full absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-[#333] rounded-full" />
            </div>
            <div className="flex items-center gap-1">
              <svg width="15" height="11" viewBox="0 0 15 11" fill={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}><rect x="0" y="4" width="3" height="7" rx="0.5"/><rect x="4" y="2.5" width="3" height="8.5" rx="0.5"/><rect x="8" y="1" width="3" height="10" rx="0.5"/><rect x="12" y="0" width="3" height="11" rx="0.5"/></svg>
              <svg width="12" height="9" viewBox="0 0 24 18" fill="none" stroke={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'} strokeWidth="2"><path d="M1 5.5C4.5 2 8.5 0 12 0s7.5 2 11 5.5"/><path d="M4.5 9C7 6.5 9.5 5 12 5s5 1.5 7.5 4"/><path d="M8 12.5C9.5 11 10.75 10 12 10s2.5 1 4 2.5"/><circle cx="12" cy="16" r="2" fill={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'} stroke="none"/></svg>
              <div className="flex items-center gap-0.5">
                <div className="w-5 h-2.5 rounded-sm border" style={{ borderColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)' }}>
                  <div className="h-full w-3/4 rounded-sm ml-0.5" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Chat header — 2v2 o normale */}
          {phase === 'running' && selectedMode === '2v2' && twoVsTwoState ? (
            <div className="flex-shrink-0" style={{ background: '#0d0d14' }}>
              {/* Riga 1: back + badge A — score — badge B */}
              <div className="flex items-center justify-between px-2 py-1.5" style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={() => { setSelectedMode(null); setTwoVsTwoState(null); setPhase('start') }}
                  className="w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <div className="flex items-center gap-2">
                  <div className="text-[8px] font-black px-2 py-0.5 rounded" style={{ color: '#3b82f6', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>SQUADRA A</div>
                  <div className="text-base font-black text-white">{twoVsTwoState.scoreA} — {twoVsTwoState.scoreB}</div>
                  <div className="text-[8px] font-black px-2 py-0.5 rounded" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>SQUADRA B</div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: twoVsTwoState.currentTurn === 'A' ? '#3b82f6' : '#ef4444' }} />
                  <span className="text-[8px] font-black" style={{ color: twoVsTwoState.currentTurn === 'A' ? '#3b82f6' : '#ef4444' }}>R{twoVsTwoState.round}/{twoVsTwoState.maxRounds}</span>
                </div>
              </div>
              {/* Riga 2: barra membri squadre */}
              <div className="flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Squadra A */}
                <div className="flex-1 flex flex-col gap-1 px-2 py-1.5" style={{ background: 'rgba(59,130,246,0.05)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                  {[
                    { name: twoVsTwoState.config.teamA.humanName, color: '#F59E0B', isAI: false },
                    { name: AI_NAMES[twoVsTwoState.config.teamA.aiId], color: AI_COLOR[twoVsTwoState.config.teamA.aiId], isAI: true },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ fontSize: 5, background: m.color }}>{m.name[0]}</div>
                      <div className="text-[8px] font-semibold" style={{ color: '#60a5fa' }}>{m.name}</div>
                    </div>
                  ))}
                </div>
                {/* Squadra B — solo AI */}
                <div className="flex-1 flex flex-col justify-center gap-1 px-2 py-1.5" style={{ background: 'rgba(239,68,68,0.05)' }}>
                  {[
                    { name: AI_NAMES[twoVsTwoState.config.teamB.aiId], color: AI_COLOR[twoVsTwoState.config.teamB.aiId] },
                    { name: AI_NAMES[twoVsTwoState.config.arbiterAiId], color: '#A78BFA' },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ fontSize: 5, background: m.color }}>{m.name[0]}</div>
                      <div className="text-[8px] font-semibold" style={{ color: i === 0 ? '#f87171' : '#A78BFA' }}>
                        {m.name}{i === 1 && <span className="ml-1 opacity-50">⚖️</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
          <div className="flex-shrink-0 flex items-center gap-2.5 px-3 py-2" style={{ backgroundColor: bgPreset.header, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
            {/* Avatar sovrapposti */}
            <div className="flex -space-x-2 flex-shrink-0">
              {AI_ORDER.map(id => (
                <div key={id} className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold ring-1"
                  style={{ backgroundColor: AI_COLOR[id], ['--tw-ring-color' as string]: bgPreset.header }}>
                  {AI_NAMES[id][0]}
                </div>
              ))}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[13px] leading-none" style={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>
                {activeRoom ? activeRoom.topic : 'AiGORÀ'}
              </div>
              <div className="text-[10px] mt-0.5 truncate" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                {activeAi
                  ? `${AI_NAMES[activeAi]} sta scrivendo…`
                  : activeRoom
                    ? `${onlineUsers.length + 1} online · ${myRoomRole === 'spectator' ? 'Spettatore' : 'Partecipante'}`
                    : `Turno ${turnCount + 1} · 4 AI`
                }
              </div>
            </div>

            {/* Invita (solo admin/beta) */}
            {(effectivePlan === 'admin' || isBeta) && (
              <button onClick={() => setShowInvitePanel(true)} title="Invita amici"
                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all hover:scale-105"
                style={{ backgroundColor: isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.1)', color: '#A78BFA' }}>
                👥
              </button>
            )}

            {/* Picker colori — drawer */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowColorPicker(p => !p)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105 border-2"
                style={{
                  backgroundColor: bgPreset.value,
                  borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                }}
                title="Cambia sfondo"
              />
              {showColorPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
                  <div className="absolute right-0 top-9 z-50 flex gap-1.5 p-2 rounded-2xl shadow-2xl"
                    style={{ backgroundColor: isDark ? 'rgba(12,12,20,0.97)' : 'rgba(255,255,255,0.97)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
                    {BG_PRESETS.map(p => (
                      <button key={p.value} onClick={() => { setBgPreset(p); setShowColorPicker(false) }}
                        title={p.label}
                        className="w-6 h-6 rounded-full transition-all hover:scale-110"
                        style={{
                          backgroundColor: p.value,
                          outline: bgPreset.value === p.value ? `2px solid ${isDark ? '#fff' : '#000'}` : '2px solid transparent',
                          outlineOffset: '2px',
                          border: '1px solid rgba(0,0,0,0.1)',
                        }} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Sintesi */}
            <button onClick={handleSynthesize} title="Sintetizza"
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all hover:scale-105"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }}>
              📋
            </button>
          </div>
          )}{/* fine else header normale */}

          {/* Avatar bar — solo chat normale */}
          {!(phase === 'running' && selectedMode === '2v2') && (
            <PhoneAvatarBar activeAi={activeAi} bgColor={bgPreset.header} isDark={isDark} aiOrder={AI_ORDER} onAiClick={setSelectedAiProfile} />
          )}

          {/* Messaggi — 2v2 o normale */}
          <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-1" style={{ backgroundColor: phase === 'running' && selectedMode === '2v2' ? '#0d0d14' : bgPreset.value }}>
            {phase === 'running' && selectedMode === '2v2' && twoVsTwoState ? (
              <>
                {twoVsTwoState.messages.map((msg, i) => {
                  const isArbiter = msg.team === 'arbiter'
                  const isA = msg.team === 'A'
                  const teamColor = isA ? '#3b82f6' : '#ef4444'
                  const aiColor = AI_COLOR[msg.aiId ?? ''] ?? teamColor
                  if (isArbiter) return (
                    <div key={i} className="mx-3 my-2 rounded-2xl p-3" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
                      <div className="text-[8px] font-black uppercase mb-1" style={{ color: '#A78BFA' }}>⚖️ {AI_NAMES[twoVsTwoState.config.arbiterAiId]} — Verdetto</div>
                      <div className="text-xs text-white/80 leading-relaxed">{msg.content}</div>
                    </div>
                  )
                  const alignRight = !isA
                  const msgBg = isA ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)'
                  const msgColor = isA ? '#93c5fd' : '#fca5a5'
                  const borderR = isA ? '3px 8px 8px 8px' : '8px 3px 8px 8px'
                  return (
                    <div key={i} className={`flex flex-col px-2 py-0.5 max-w-[85%] ${alignRight ? 'items-end self-end' : 'items-start'}`}>
                      <div className="text-[7px] font-semibold mb-0.5 px-1" style={{ color: msg.isAI ? aiColor : teamColor }}>
                        {msg.author}{msg.isAI && <span className="ml-1 opacity-50">AI</span>}
                      </div>
                      <div className="px-2 py-1.5 text-[9px] leading-[1.4]"
                        style={{ background: msg.isAI ? `${aiColor}20` : msgBg, color: msgColor, borderRadius: borderR }}>
                        {msg.streaming && !msg.content
                          ? <span className="flex gap-1 items-center py-0.5">{[0,150,300].map(d=><span key={d} className="w-1 h-1 rounded-full bg-white/40 animate-bounce" style={{animationDelay:`${d}ms`}}/>)}</span>
                          : <>{msg.content}{msg.streaming && <span className="typewriter-cursor" />}</>
                        }
                      </div>
                    </div>
                  )
                })}
                {twoVsTwoLoading && (
                  <div className="flex items-center gap-2 px-4 py-2">
                    <div className="flex gap-1">{[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</div>
                    <span className="text-[10px] text-white/30">L'AI sta pensando…</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            ) : (
              <>
                {messages.map(msg => <MessageBubble key={msg.id} message={msg} bgTheme={isDark ? 'white' : 'black'} />)}
                {thinkingAi && <ThinkingBubble aiId={thinkingAi} isDark={isDark} />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input bar — 2v2 o normale */}
          {phase === 'running' && selectedMode === '2v2' && twoVsTwoState ? (() => {
            const isMyTurn = twoVsTwoState.currentTurn === 'A' && !twoVsTwoLoading && !twoVsTwoState.ended
            const myColor = '#3b82f6'
            const myAiId = twoVsTwoState.config.teamA.aiId
            return (
              <div className="flex-shrink-0" style={{ background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="px-3 pt-1.5 pb-1">
                  <div className="text-[8px] text-center font-bold" style={{ color: isMyTurn ? myColor : 'rgba(255,255,255,0.3)' }}>
                    {isMyTurn ? `Il tuo turno · ${twoVsTwoState.messagesThisTurn}/${twoVsTwoState.maxMessagesPerTurn}` : `Turno Squadra ${twoVsTwoState.currentTurn}…`}
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 pb-2">
                  <input value={inputText} onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && inputText.trim() && isMyTurn) { handle2v2HumanMessage(inputText.trim()); setInputText('') } }}
                    disabled={!isMyTurn || twoVsTwoLoading}
                    placeholder={isMyTurn ? 'Il tuo argomento…' : 'Attendi il tuo turno…'}
                    className="flex-1 rounded-full px-3.5 py-2 text-[12px] outline-none"
                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', border: `1px solid ${isMyTurn ? `${myColor}50` : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')}`, color: isDark ? '#f0f0f0' : '#111', opacity: isMyTurn ? 1 : 0.4 }}
                  />
                  <button onClick={() => { if (inputText.trim() && isMyTurn) { handle2v2HumanMessage(inputText.trim()); setInputText('') } }}
                    disabled={!inputText.trim() || !isMyTurn || twoVsTwoLoading}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white disabled:opacity-30"
                    style={{ background: `linear-gradient(135deg, ${myColor}, #1d4ed8)` }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                  </button>
                </div>
                {isMyTurn && (
                  <div className="px-3 pb-2">
                    <button onClick={() => handle2v2AIResponse('A', 'Supporta con un argomento forte.')} disabled={twoVsTwoLoading}
                      className="w-full py-1.5 rounded-xl text-[10px] font-bold disabled:opacity-40"
                      style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }}>
                      Chiedi supporto a {AI_NAMES[myAiId]} →
                    </button>
                  </div>
                )}
              </div>
            )
          })() : (
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5" style={{
            backgroundColor: bgPreset.header,
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          }}>
            <input
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendMessage() }}
              placeholder='Scrivi un messaggio…'
              className={`flex-1 rounded-full px-3.5 py-2 text-[12px] outline-none transition-all${waitingForUser ? ' input-waiting' : ''}`}
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                color: isDark ? '#f0f0f0' : '#111',
                boxShadow: waitingForUser ? (isDark ? '0 0 0 2px rgba(196,181,253,0.15)' : '0 0 0 2px rgba(109,40,217,0.1)') : undefined,
              }}
            />
            <button onClick={isListening ? stopListening : startListening}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{ backgroundColor: isListening ? '#ef4444' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'), boxShadow: isListening ? '0 0 10px rgba(239,68,68,0.5)' : undefined }}>
              <svg width="12" height="14" viewBox="0 0 24 28" fill={isListening ? 'white' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)')}>
                <rect x="8" y="0" width="8" height="16" rx="4"/>
                <path d="M4 12a8 8 0 0 0 16 0" stroke={isListening ? 'white' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)')} strokeWidth="2" fill="none"/>
                <line x1="12" y1="20" x2="12" y2="24" stroke={isListening ? 'white' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)')} strokeWidth="2"/>
                <line x1="8" y1="24" x2="16" y2="24" stroke={isListening ? 'white' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)')} strokeWidth="2"/>
              </svg>
            </button>
            <button onClick={handleSendMessage} disabled={!inputText.trim()}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-30 hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #10A37F, #0d8c6d)', boxShadow: inputText.trim() ? '0 2px 10px rgba(16,163,127,0.4)' : undefined }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
            </button>
          </div>
          )}

          {/* Home indicator */}
          <div className="flex-shrink-0 flex justify-center py-2" style={{ backgroundColor: bgPreset.header }}>
            <div className="w-28 h-1 rounded-full" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)' }} />
          </div>

          {/* Pannello profilo AI — dentro la cornice iPhone desktop */}
          {selectedAiProfile && AI_PROFILES[selectedAiProfile] && (() => {
            const ai = AI_PROFILES[selectedAiProfile]
            const color = AI_COLOR[selectedAiProfile]
            const name = AI_NAMES[selectedAiProfile]
            return (
              <div className={`absolute inset-0 z-50 flex flex-col ${closingAiProfile ? 'slide-to-right' : 'slide-from-right'} rounded-[44px] overflow-hidden`}
                style={{ backgroundColor: bgPreset.value }}>
                <div className="flex-shrink-0 flex items-center gap-3 px-4 border-b"
                  style={{ paddingTop: '16px', paddingBottom: '12px', backgroundColor: bgPreset.header, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                  <button onClick={() => closeAiProfile()} className="flex items-center active:opacity-60 transition-opacity" style={{ color }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{ backgroundColor: color }}>{ai.initials}</div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: isDark ? '#fff' : '#111' }}>{name}</div>
                    <div className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{ai.tagline}</div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="flex flex-col items-center pt-6 pb-5 px-5" style={{ backgroundColor: bgPreset.header, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                    <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-white mb-3" style={{ backgroundColor: color, boxShadow: `0 0 0 5px ${color}25, 0 8px 30px ${color}55` }}>{ai.initials}</div>
                    <div className="text-xl font-black mb-1" style={{ color: isDark ? '#fff' : '#111' }}>{name}</div>
                    <div className="text-[10px] font-semibold px-3 py-1 rounded-full mt-1" style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}30` }}>{ai.tagline}</div>
                  </div>
                  <div className="px-4 py-4 flex flex-col gap-4" style={{ paddingBottom: '16px' }}>
                    {[{ label: 'Chi sono', text: ai.chi }, { label: 'Come mi comporto', text: ai.carattere }, { label: 'Con le altre AI', text: ai.relazioni }].map(({ label, text }) => (
                      <div key={label} className="rounded-2xl p-3" style={{ backgroundColor: `${color}10`, border: `1px solid ${color}25` }}>
                        <div className="text-[9px] font-black uppercase tracking-widest mb-1.5" style={{ color }}>{label}</div>
                        <p className="text-[13px] leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.85)' }}>{text}</p>
                      </div>
                    ))}
                    <div className="rounded-2xl p-3" style={{ backgroundColor: `${color}10`, border: `1px solid ${color}25` }}>
                      <div className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color }}>Cosa so fare meglio</div>
                      <div className="flex flex-wrap gap-1.5">
                        {ai.forza.split(', ').map(f => (
                          <span key={f} className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}>{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

        </div>

        {/* Tasti fisici */}
        <div className="absolute -left-[5px] top-28  w-[3px] h-8  bg-[#2a2a2a] rounded-l-sm" />
        <div className="absolute -left-[5px] top-44  w-[3px] h-14 bg-[#2a2a2a] rounded-l-sm" />
        <div className="absolute -left-[5px] top-64  w-[3px] h-14 bg-[#2a2a2a] rounded-l-sm" />
        <div className="absolute -right-[5px] top-48 w-[3px] h-20 bg-[#2a2a2a] rounded-r-sm" />
      </div>

      {/* ── SCHERMO NATIVO MOBILE ── */}
      <div className="phone-screen-mobile hidden flex-col" style={{ backgroundColor: bgPreset.value, height: '100dvh', overflow: 'hidden' }}
        ref={el => { if (el) document.body.style.backgroundColor = bgPreset.value }}>

        {/* Schermata cronologia mobile */}
        {phase === 'history' && (
          <div className="flex flex-col h-full" style={{ backgroundColor: bgPreset.value }}>
            {/* Header cronologia */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 pb-4 border-b"
              style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', backgroundColor: bgPreset.header, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
              <button onClick={() => setPhase(messages.length > 0 ? 'running' : 'start')}
                className="w-9 h-9 flex items-center justify-center rounded-full"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? 'white' : '#111'} strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span className="font-bold text-lg flex-1" style={{ color: isDark ? '#fff' : '#111' }}>Conversazioni</span>
              <button onClick={() => {
                handleReset()
                setPhase('new')
              }}
                className="text-[13px] font-semibold" style={{ color: '#A78BFA' }}>
                + Nuova
              </button>
            </div>
            {/* Lista chat */}
            <div className="flex-1 overflow-y-auto">
              {savedChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="text-white/20 text-4xl">💬</div>
                  <p className="text-white/30 text-sm text-center px-8">Nessuna conversazione salvata.<br/>Le chat vengono salvate automaticamente.</p>
                </div>
              ) : savedChats.map((chat) => (
                <SwipeableChatRow
                  key={chat.id}
                  chat={chat}
                  onOpen={() => { setMessages(chat.messages); chatHistoryRef.current = chat.history; setPhase('running') }}
                  onDelete={(e) => handleDeleteChat(chat.id, chat.title, e)}
                  bgColor={bgPreset.value}
                />
              ))}
            </div>
          </div>
        )}

        {/* Schermata 2 vs 2 */}
        {phase === 'running' && selectedMode === '2v2' && twoVsTwoState && (
          <TwoVsTwoScreen
            state={twoVsTwoState}
            onHumanMessage={handle2v2HumanMessage}
            onRequestAI={(team) => handle2v2AIResponse(team, 'Supporta la squadra con un argomento forte.')}
            loading={twoVsTwoLoading}
            myTeam="A"
            onBack={() => { setSelectedMode(null); setTwoVsTwoState(null); setPhase('start') }}
          />
        )}

        {/* Schermata Devil's Advocate mobile */}
        {phase === 'running' && selectedMode === 'devil' && devilSession && (
          <DevilsAdvocateScreen
            session={devilSession}
            onMessage={handleDevilMessage}
            onEndTurn={handleDevilEndTurn}
            loading={devilLoading}
            isDark={isDark}
            bgPreset={bgPreset}
            onBack={() => { setSelectedMode(null); setDevilSession(null); setPhase('start') }}
          />
        )}

        {/* Schermata Devil's Advocate mobile */}
        {phase === 'running' && selectedMode === 'devil' && devilSession && (
          <DevilsAdvocateScreen
            session={devilSession}
            onMessage={handleDevilMessage}
            onEndTurn={handleDevilEndTurn}
            loading={devilLoading}
            isDark={isDark}
            bgPreset={bgPreset}
            onBack={() => { setSelectedMode(null); setDevilSession(null); setPhase('start') }}
          />
        )}

        {/* Schermata profilo mobile */}
        {phase === 'profile' && (
          <ProfileScreen
            displayName={displayName}
            userEmail={userEmail}
            userPlan={effectivePlan}
            savedChats={savedChats}
            bgPreset={bgPreset}
            isDark={isDark}
            onBack={() => setPhase(messages.length > 0 ? 'running' : 'start')}
            onSignOut={() => signOut({ callbackUrl: '/login' })}
            userImage={userImage}
            onImageChange={setUserImage}
            dbUserName={dbUserName}
          />
        )}

        {/* Schermata 'new' — chat vuota con bubble e input */}
        {phase === 'new' && (
          <div className="flex flex-col h-full relative overflow-hidden" style={{ backgroundColor: bgPreset.value }}>
            {/* Header */}
            <div className="flex-shrink-0 flex items-center gap-2 px-3 pb-3 border-b"
              style={{ backgroundColor: bgPreset.header, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
              <button onClick={() => setPhase('history')}
                className="w-9 h-9 flex items-center justify-center flex-shrink-0 rounded-full active:scale-95"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'} strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div className="flex-1 min-w-0 text-center">
                <div className="font-bold text-[14px]" style={{ color: isDark ? '#fff' : '#111' }}>
                  <span style={{ color: isDark ? '#fff' : '#111' }}>Ai</span>
                  <span style={{ color: '#A78BFA' }}>GORÀ</span>
                </div>
                <div className="text-[11px]" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Nuova conversazione</div>
              </div>
              <div className="w-9" />
            </div>

            {/* Area centrale */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
              {/* Avatar AI */}
              <div className="flex justify-center gap-5">
                {AI_ORDER.map(id => (
                  <div key={id} className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: AI_COLOR[id] + '60', border: `2px solid ${AI_COLOR[id]}80` }}>
                      {id === 'gemini' ? 'Ge' : AI_NAMES[id][0]}
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }}>{AI_NAMES[id]}</span>
                  </div>
                ))}
              </div>
              <p className="text-center text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)', maxWidth: '240px', lineHeight: 1.5 }}>
                Scrivi una domanda per avviare il dibattito
              </p>
            </div>

            {/* Input bar — uguale alla chat */}
            <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5" style={{
              backgroundColor: bgPreset.header,
              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
            }}>
              <input
                autoFocus
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && question.trim()) { handleStart(question) } }}
                placeholder="Poni una domanda alle AI…"
                className="flex-1 rounded-full px-3.5 py-2 text-[13px] outline-none"
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                  color: isDark ? '#f0f0f0' : '#111',
                }}
              />
              <button onClick={() => { if (question.trim()) handleStart(question) }} disabled={!question.trim()}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-30"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', boxShadow: question.trim() ? '0 2px 10px rgba(124,58,237,0.4)' : undefined }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
              </button>
            </div>
          </div>
        )}

        {/* Schermata chat mobile */}
        {phase !== 'history' && phase !== 'profile' && phase !== 'new' && <>

          {/* Header mobile */}
          <div className="flex-shrink-0 flex items-center gap-2 px-3 pb-3 border-b"
            style={{ backgroundColor: bgPreset.header, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            {/* < Cronologia */}
            <button onClick={() => setPhase('history')}
              className="w-9 h-9 flex items-center justify-center flex-shrink-0 rounded-full active:scale-95"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'} strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>

            {/* Titolo centrale */}
            <div className="flex-1 min-w-0 text-center">
              <div className="font-bold text-[14px]" style={{ color: isDark ? '#fff' : '#111' }}>AiGORÀ</div>
              <div className="text-[11px]" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                {activeAi ? `${AI_NAMES[activeAi]} sta scrivendo…` : `Turno ${turnCount + 1}`}
              </div>
            </div>

            {/* Font size + Colori + Sintesi + Profilo */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Font - + */}
              <div className="flex items-center rounded-full overflow-hidden" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }}>
                <button onClick={() => setMobileFontSize(s => Math.max(12, s - 1))}
                  className="w-8 h-8 flex items-center justify-center text-base font-bold active:scale-95"
                  style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>−</button>
                <button onClick={() => setMobileFontSize(s => Math.min(20, s + 1))}
                  className="w-8 h-8 flex items-center justify-center text-base font-bold active:scale-95"
                  style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>+</button>
              </div>
              {/* Picker colori — stesso drawer del desktop */}
              <div className="relative">
                <button onClick={() => setShowColorPicker(p => !p)}
                  className="w-8 h-8 rounded-full border-2 active:scale-95 transition-transform"
                  style={{ backgroundColor: bgPreset.value, borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }} />
                {showColorPicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
                    <div className="absolute right-0 top-10 z-50 flex gap-1.5 p-2 rounded-2xl shadow-2xl"
                      style={{ backgroundColor: isDark ? 'rgba(12,12,20,0.97)' : 'rgba(255,255,255,0.97)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
                      {BG_PRESETS.map(p => (
                        <button key={p.value} onClick={() => { setBgPreset(p); setShowColorPicker(false) }}
                          className="w-7 h-7 rounded-full transition-all active:scale-110"
                          style={{ backgroundColor: p.value, outline: bgPreset.value === p.value ? `2px solid ${isDark ? '#fff' : '#000'}` : '2px solid transparent', outlineOffset: '2px', border: '1px solid rgba(0,0,0,0.1)' }} />
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button onClick={handleSynthesize}
                className="w-9 h-9 flex items-center justify-center rounded-full active:scale-95 text-base"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }}>
                📋
              </button>
              {(() => {
                const pc: Record<string,string> = { admin:'#F59E0B', max:'#FF6B2B', pro:'#A78BFA', starter:'#1A73E8', free:'#10A37F', none:'#6B7280' }
                const c = pc[effectivePlan ?? 'free'] ?? '#6B7280'
                return (
                  <button onClick={() => setPhase('profile')}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: c }}>
                    {(userName.trim() || userEmail || '?')[0].toUpperCase()}
                  </button>
                )
              })()}
            </div>
          </div>

          {/* Pannello profilo AI — slide da destra, fullscreen */}
          {selectedAiProfile && AI_PROFILES[selectedAiProfile] && (() => {
            const ai = AI_PROFILES[selectedAiProfile]
            const color = AI_COLOR[selectedAiProfile]
            const name = AI_NAMES[selectedAiProfile]
            return (
              <div className={`fixed inset-0 z-[60] flex flex-col ${closingAiProfile ? 'slide-to-right' : 'slide-from-right'}`}
                style={{ backgroundColor: bgPreset.value }}>
                {/* Header stile WhatsApp */}
                <div className="flex-shrink-0 flex items-center gap-3 px-4 border-b"
                  style={{
                    paddingTop: 'max(14px, env(safe-area-inset-top))',
                    paddingBottom: '12px',
                    backgroundColor: bgPreset.header,
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  }}>
                  <button onClick={() => closeAiProfile()}
                    className="flex items-center active:opacity-60 transition-opacity"
                    style={{ color }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                    style={{ backgroundColor: color }}>
                    {ai.initials}
                  </div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: isDark ? '#fff' : '#111' }}>{name}</div>
                    <div className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{ai.tagline}</div>
                  </div>
                </div>

                {/* Contenuto scrollabile */}
                <div className="flex-1 overflow-y-auto">
                  {/* Hero avatar */}
                  <div className="flex flex-col items-center pt-8 pb-6 px-6"
                    style={{ backgroundColor: bgPreset.header, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                    <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black text-white mb-4"
                      style={{ backgroundColor: color, boxShadow: `0 0 0 6px ${color}25, 0 12px 40px ${color}55` }}>
                      {ai.initials}
                    </div>
                    <div className="text-2xl font-black mb-1" style={{ color: isDark ? '#fff' : '#111' }}>{name}</div>
                    <div className="text-xs font-semibold px-3 py-1.5 rounded-full mt-1"
                      style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}30` }}>
                      {ai.tagline}
                    </div>
                  </div>

                  <div className="px-5 py-5 flex flex-col gap-6"
                    style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>
                    {[
                      { label: 'Chi sono', text: ai.chi },
                      { label: 'Come mi comporto', text: ai.carattere },
                      { label: 'Con le altre AI', text: ai.relazioni },
                    ].map(({ label, text }) => (
                      <div key={label} className="rounded-2xl p-4"
                        style={{ backgroundColor: `${color}10`, border: `1px solid ${color}25` }}>
                        <div className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color }}>{label}</div>
                        <p className="text-[15px] leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.85)' }}>{text}</p>
                      </div>
                    ))}
                    <div className="rounded-2xl p-4"
                      style={{ backgroundColor: `${color}10`, border: `1px solid ${color}25` }}>
                      <div className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color }}>Cosa so fare meglio</div>
                      <div className="flex flex-wrap gap-2">
                        {ai.forza.split(', ').map(f => (
                          <span key={f} className="px-3 py-1.5 rounded-full text-sm font-semibold"
                            style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Pannello invita amici */}
          {showInvitePanel && (
            <div className="absolute inset-0 z-50 flex flex-col" style={{ backgroundColor: bgPreset.value }}>
              <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b"
                style={{ backgroundColor: bgPreset.header, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
                <button onClick={() => { setShowInvitePanel(false); setInviteSearch(''); setInviteResults([]) }}
                  className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDark ? 'white' : '#111'} strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <span className="font-bold text-base" style={{ color: isDark ? '#fff' : '#111' }}>Invita al dibattito</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <p className="text-xs mb-4" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                  L'amico riceverà una notifica e potrà unirsi al dibattito in corso.
                </p>
                <input
                  value={inviteSearch}
                  onChange={e => setInviteSearch(e.target.value)}
                  placeholder="Cerca per nome…"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none mb-3"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                    color: isDark ? '#f0f0f0' : '#111',
                  }}
                />
                {inviteResults.map((u: any) => (
                  <button key={u.id}
                    onClick={async () => {
                      // Crea una room con questo utente se non esiste, oppure manda notifica
                      await fetch('/api/rooms', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          topic: question || messages.find((m: any) => m.isUser)?.content || 'Dibattito',
                          visibility: 'private',
                          aiIds: AI_ORDER,
                          invitedUserIds: [u.id],
                        }),
                      })
                      setShowInvitePanel(false)
                      setInviteSearch('')
                      setInviteResults([])
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl mb-2 transition-colors text-left"
                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: '#7C3AED' }}>
                      {(u.name || u.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate" style={{ color: isDark ? '#fff' : '#111' }}>{u.name || u.email}</div>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: '#A78BFA' }}>Invita →</span>
                  </button>
                ))}
                {inviteSearch.length >= 2 && inviteResults.length === 0 && (
                  <div className="text-center py-6 text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)' }}>Nessun utente trovato</div>
                )}
              </div>
            </div>
          )}

          {/* Banner spettatore */}
          {activeRoom && myRoomRole === 'spectator' && (
            <div className="flex-shrink-0 flex items-center justify-center gap-2 py-1.5 text-[11px] font-semibold"
              style={{ backgroundColor: 'rgba(124,58,237,0.15)', color: '#A78BFA', borderBottom: '1px solid rgba(124,58,237,0.2)' }}>
              👁 Stai guardando come spettatore
            </div>
          )}

          {/* Avatar bar mobile */}
          <PhoneAvatarBar activeAi={activeAi} bgColor={bgPreset.header} isDark={isDark} aiOrder={AI_ORDER} onAiClick={setSelectedAiProfile} />

          {/* Messaggi mobile */}
          <div className="flex-1 overflow-y-auto py-3" style={{ backgroundColor: bgPreset.value }}>
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} bgTheme={isDark ? 'white' : 'black'} fontSize={mobileFontSize} />)}
            {thinkingAi && <ThinkingBubble aiId={thinkingAi} isDark={isDark} />}
            <div ref={messagesEndRef} />
          </div>

          {/* Pannello sintesi mobile — slide da destra */}
          {showSynthesis && (
            <div className="absolute inset-0 z-50 flex flex-col" style={{ backgroundColor: bgPreset.value }}>
              <div className="flex-shrink-0 flex items-center gap-3 px-4 pb-4 border-b"
                style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', backgroundColor: bgPreset.header, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                <button onClick={() => setShowSynthesis(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-full"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? 'white' : '#111'} strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <div>
                  <div className="font-bold text-base" style={{ color: isDark ? '#fff' : '#111' }}>Sintesi</div>
                  <div className="text-[11px]" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>{messages.filter(m => !m.isUser).length} messaggi analizzati</div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {isSynthesizing && !synthesis && (
                  <div className="flex gap-2 items-center mt-8">
                    {[0,150,300].map(d => <span key={d} className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                  </div>
                )}
                {synthesis && <p className="text-white/80 text-[14px] leading-[1.8] whitespace-pre-wrap">{synthesis}</p>}
              </div>
              {phase === 'done' && !isSynthesizing && (
                <div className="p-4 border-t border-white/8 space-y-2">
                  {/* Portfolio — solo admin */}
                  {effectivePlan === 'admin' && (
                    <button onClick={handleTogglePortfolio}
                      className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{
                        backgroundColor: isPublic ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                        border: isPublic ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.1)',
                        color: isPublic ? '#A78BFA' : 'rgba(255,255,255,0.4)',
                      }}>
                      {portfolioSaved ? '✓ Salvato!' : isPublic ? '📂 Nel portfolio · rimuovi' : '📂 Aggiungi al portfolio'}
                    </button>
                  )}
                  <button onClick={handleReset}
                    className="w-full py-3 rounded-xl text-white/60 text-sm font-medium"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    🔄 Nuovo dibattito
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Input bar mobile — nascosta per gli spettatori */}
          {activeRoom && myRoomRole === 'spectator' ? (
            <div className="flex-shrink-0 flex items-center justify-center py-3 text-xs"
              style={{ backgroundColor: bgPreset.header, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
              Solo i partecipanti possono scrivere
            </div>
          ) : (
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-3" style={{
            backgroundColor: bgPreset.header,
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          }}>
            <input
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendMessage() }}
              placeholder='Scrivi un messaggio…'
              className={`flex-1 rounded-full px-4 py-2.5 text-[14px] outline-none transition-all${waitingForUser ? ' input-waiting' : ''}`}
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                color: isDark ? '#f0f0f0' : '#111',
              }}
            />
            <button onClick={isListening ? stopListening : startListening}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
              style={{ backgroundColor: isListening ? '#ef4444' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'), boxShadow: isListening ? '0 0 12px rgba(239,68,68,0.5)' : undefined }}>
              <svg width="14" height="16" viewBox="0 0 24 28" fill={isListening ? 'white' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)')}>
                <rect x="8" y="0" width="8" height="16" rx="4"/>
                <path d="M4 12a8 8 0 0 0 16 0" stroke={isListening ? 'white' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)')} strokeWidth="2" fill="none"/>
                <line x1="12" y1="20" x2="12" y2="24" stroke={isListening ? 'white' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)')} strokeWidth="2"/>
                <line x1="8" y1="24" x2="16" y2="24" stroke={isListening ? 'white' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)')} strokeWidth="2"/>
              </svg>
            </button>
            <button onClick={handleSendMessage} disabled={!inputText.trim()}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-30 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #10A37F, #0d8c6d)', boxShadow: inputText.trim() ? '0 2px 10px rgba(16,163,127,0.4)' : undefined }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
            </button>
          </div>
          )}
        </>}
      </div>
      </div>{/* fine flex-col wrapper telefono */}

      {/* ── PANNELLO SINTESI ── */}
      <div className={`flex-shrink-0 transition-all duration-500 ease-out${showSynthesis ? ' synthesis-panel-mobile' : ''}`}
        style={{ width: showSynthesis ? 340 : 0, opacity: showSynthesis ? 1 : 0, overflow: 'hidden' }}>
        <div style={{ width: 340 }}>
          <div className="glass-dark rounded-3xl overflow-hidden slide-in-right" style={{ height: 790 }}>

            {/* Header pannello */}
            <div className="px-5 py-4 border-b border-white/8 flex items-start justify-between">
              <div>
                <div className="text-white font-bold text-base">Sintesi</div>
                <div className="text-white/40 text-[11px] mt-0.5">Generata da Claude · {messages.filter(m => !m.isUser).length} messaggi analizzati</div>
              </div>
              <button onClick={() => setShowSynthesis(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all text-lg leading-none">×</button>
            </div>

            {/* Corpo */}
            <div className="p-5 overflow-y-auto" style={{ height: 'calc(100% - 68px)' }}>
              {isSynthesizing && !synthesis && (
                <div className="flex gap-1.5 items-center mt-6">
                  {[0, 150, 300].map(d => <span key={d} className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                </div>
              )}
              {synthesis && (
                <>
                  <p className="text-white/80 text-[13px] leading-[1.75] whitespace-pre-wrap">
                    {synthesis}
                    {isSynthesizing && <span className="typewriter-cursor" />}
                  </p>

                  {/* Partecipanti citati */}
                  {!isSynthesizing && (
                    <div className="mt-6 pt-4 border-t border-white/8">
                      <div className="text-white/30 text-[10px] uppercase tracking-wider mb-3">Partecipanti</div>
                      <div className="flex flex-wrap gap-2">
                        {AI_ORDER.map(id => (
                          <div key={id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: AI_COLOR[id] + '22', border: `1px solid ${AI_COLOR[id]}44` }}>
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: AI_COLOR[id] }} />
                            <span className="text-[11px] font-medium" style={{ color: AI_COLOR[id] }}>{AI_NAMES[id]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {phase === 'done' && !isSynthesizing && (
                <div className="mt-6 space-y-2">
                  {/* Portfolio — solo admin */}
                  {effectivePlan === 'admin' && (
                    <button onClick={handleTogglePortfolio}
                      className="w-full rounded-xl py-3 text-sm font-medium transition-all"
                      style={{
                        backgroundColor: isPublic ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                        border: isPublic ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.12)',
                        color: isPublic ? '#A78BFA' : 'rgba(255,255,255,0.45)',
                      }}>
                      {portfolioSaved ? '✓ Salvato!' : isPublic ? '📂 Nel portfolio · rimuovi' : '📂 Aggiungi al portfolio'}
                    </button>
                  )}
                  <button onClick={handleReset}
                    className="w-full glass rounded-xl py-3 text-white/60 hover:text-white text-sm font-medium transition-all hover:bg-white/10">
                    🔄 Nuovo dibattito
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SETUP 2 vs 2 ── */}
      {show2v2Setup && typeof window !== 'undefined' && createPortal(
        <TwoVsTwoSetup
          onStart={handle2v2Start}
          onBack={() => { setShow2v2Setup(false); setSelectedMode(null) }}
          currentUserName={displayName !== 'Tu' ? displayName : ''}
        />,
        document.body
      )}

      {/* ── SELEZIONE FORMATO MULTIPLAYER ── */}
      {showModeSelect && typeof window !== 'undefined' && createPortal(
        <ModeSelect
          onSelect={handleSelectMode}
          onClose={() => setShowModeSelect(false)}
        />,
        document.body
      )}

    </div>
  )
}
