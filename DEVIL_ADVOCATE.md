# Devil's Advocate — Design document e roadmap

---

## Filosofia della modalità

Devil's Advocate è la modalità più solitaria e oppressiva di AiGORÀ.

Non è un dibattito tra pari. Non c'è un alleato. Non si sceglie la propria posizione.
Il sistema ti assegna una tesi — spesso scomoda, quasi sempre contro la tua opinione naturale — e devi difenderla contro quattro AI che la smontano in modo aggressivo, turno dopo turno, senza pietà.

L'obiettivo non è vincere. È resistere.

**Differenza chiave rispetto alle altre modalità:**
- **Classico**: conversazione libera, nessun conflitto forzato, nessun punteggio
- **2v2**: competizione sociale, hai un alleato AI, c'è una squadra avversaria — è teso ma non sei solo
- **Devil's Advocate**: sei solo contro quattro. La tesi non l'hai scelta tu. Non puoi cambiarla. Puoi solo difenderla.

---

## Regole

- L'utente **sceglie prima la difficoltà** (Facile / Media / Impossibile)
- L'AI **genera la posizione sul momento** — tema e contenuto scelti in autonomia, sempre indifendibile per definizione
- L'utente riceve la posizione e la vede nel **reveal flip card**
- Deve **difenderla** (modalità "difendi" — non esiste "smonta" nel Devil's Advocate per definizione)
- Può **ripescare una sola volta** — bottone visibile nell'intro, poi scompare per sempre. La seconda posizione è già pre-generata (stessa difficoltà), il ripesca è istantaneo
- I round sono **illimitati** — l'utente decide quando arrendersi cliccando "Mi arrendo"
- Ogni round: l'utente scrive i suoi argomenti, poi clicca "Fine turno" → l'AI di quel round attacca
- Il **punteggio** (0–10) è sempre visibile nell'header e si aggiorna con animazione dopo ogni "Fine turno", prima che l'AI risponda
- Alla fine: **tutte e 4 le AI** danno un giudizio breve + voto → punteggio aggregato finale
- L'utente può scrivere **una risposta finale** al verdetto, poi la sessione si chiude
- La sessione viene **sempre salvata in cronologia** come tipo speciale, con punteggio e verdetto

---

## UX — Flusso completo

### 1. Selezione modalità
L'utente sceglie "Devil's Advocate" dal selettore modalità.
Il tono visivo cambia subito: sfondo scuro, rosso dominante, emoji 😈.

### 2. Scelta difficoltà
Prima di generare la posizione, l'utente sceglie il livello di difficoltà:

| Livello | Descrizione |
|---|---|
| 🟢 Facile | Posizione scomoda ma difendibile con buona logica |
| 🟡 Media | Posizione controversa, richiede argomenti solidi |
| 🔴 Impossibile | Posizione quasi indifendibile — solo per masochisti |

Il livello scelto guida la generazione AI e resta visibile nell'header durante tutta la partita.

### 3. Generazione posizione
L'AI genera la posizione sul momento — nessun preset fisso. All'avvio vengono generate **2 posizioni** in anticipo (stessa difficoltà): la prima viene mostrata, la seconda è il ripesca. Così il ripesca è istantaneo e non richiede un'altra chiamata.

La posizione è sempre:
- Indifendibile di default (è l'Avvocato del Diavolo)
- Su qualsiasi tema — l'AI sceglie il tema in autonomia, sorpresa totale
- Formulata come affermazione netta, senza sfumature

### 4. Schermata intro — il "reveal"
La posizione assegnata appare con un'**animazione flip** (carta che si gira), come se ti stessero consegnando una condanna.

Elementi visibili:
- Badge difficoltà (🟢 / 🟡 / 🔴) + badge "DIFENDI" in rosso
- La posizione in grande, tra virgolette
- Descrizione breve: "Devi sostenere questa posizione contro le AI che la attaccheranno. Anche se non ci credi."
- Le regole sintetiche (round illimitati, punteggio, 4 giudici finali)
- **Bottone primario**: "Accetta la sfida →"
- **Bottone secondario** (visibile una sola volta, poi scompare): "🎲 Ripesca posizione"

Dopo il ripesca, il bottone scompare permanentemente — non si può usare una seconda volta.

### 3. Partita

**Layout:**
- Header: emoji 😈 + "Devil's Advocate" + round corrente + punteggio (sempre visibile)
- Banner posizione sempre visibile sotto l'header (piccolo, come reminder)
- Area messaggi: alternanza messaggi utente (destra, rosso tenue) e AI attaccante (sinistra, colore AI)
- Input + bottone "Fine turno" in basso

**Atmosfera progressiva:**
Lo sfondo diventa progressivamente più scuro man mano che i round avanzano. Round 1 è dark ma vivibile. Round 5+ tende al nero puro. L'oppressione cresce visivamente.

**Flusso per turno:**
1. L'utente scrive i suoi argomenti e manda (anche più messaggi nello stesso turno)
2. Clicca "Fine turno"
3. Il **punteggio si aggiorna con animazione** (salita o discesa visibile) — pausa drammatica
4. L'AI del round corrente attacca
5. Il round avanza, il bottone "Fine turno" si riattiva

**AI attaccanti — rotazione:**
`['claude', 'gpt', 'gemini', 'perplexity'][round % 4]`
- Round 1 → Claude
- Round 2 → GPT
- Round 3 → Gemini
- Round 4 → Perplexity
- Round 5 → Claude di nuovo, ecc.

**Tono delle AI:** aggressivo e personale. Non sono giudici neutrali — sono avvocati avversari che vogliono smontarti. Il linguaggio è diretto, tagliente, senza diplomatismi. Esempi: "Questo argomento è circolare e dimostra esattamente il contrario di quello che intendi." / "Stai confondendo correlazione e causalità — un errore elementare."

### 4. Resa

L'utente clicca "Mi arrendo" in qualsiasi momento.
Questo chiude la fase di dibattito e avvia il verdetto.

### 5. Verdetto — 4 giudici

**Fase 1 — Consultazione.**
Appare una schermata intermedia con un conto alla rovescia (3–5 secondi) e la scritta "Le AI si stanno consultando…". Suspense pura. Nessun contenuto visibile finché il timer non scade.

**Fase 2 — I voti.**
I 4 voti numerici appaiono uno alla volta con animazione — prima i numeri, poi il commento. L'ordine è **dal più clemente al più duro**: si parte dal voto più alto, si chiude con quello più basso. Il colpo finale è sempre il peggiore.

Ogni AI: 2–3 righe secche + voto (es. `6.5 / 10`).

**Personalità nel verdetto** — ogni AI mantiene il suo carattere anche da giudice:
- **Claude**: riflessivo, quasi malinconico. Riconosce la complessità della posizione.
- **GPT**: diretto e secco. Nessuna filosofia — dice cosa ha funzionato e cosa no, punto.
- **Gemini**: pedante sui dati. Cita strutture logiche, errori di ragionamento, fonti mancanti.
- **Perplexity**: trionfante se l'utente ha fatto male, quasi rispettoso se ha fatto bene.

**Riferimenti agli argomenti** — ogni AI cita argomenti specifici usati dall'utente. Il verdetto non è generico: fa riferimento a passaggi precisi del dibattito. Questo richiede che l'intera cronologia dei messaggi sia passata nel prompt del verdetto.

**Il tono dipende da tre fattori:**
1. **Punteggio accumulato**: alto (≥ 7) → rispettoso ma non caldo; medio (4–7) → misto; basso (< 4) → nessuna pietà
2. **Round giocati**: resa dopo 1–2 round → le AI lo notano esplicitamente e sanzionano la fuga nel tono
3. **Difficoltà scelta**: il verdetto contestualizza sempre — "Considerando che era Impossibile, 5.5 è un risultato dignitoso" — ma non modifica il voto numerico (il punteggio è assoluto)

**Fase 3 — Punteggio finale.**
Dopo i 4 voti, la media viene calcolata con animazione visibile: i 4 numeri si sommano a schermo, poi appare il **risultato finale** in grande con una label testuale:

| Punteggio | Label |
|---|---|
| 8.5–10 | "Difesa leggendaria" |
| 7–8.4 | "Difesa solida" |
| 5–6.9 | "Hai resistito" |
| 3–4.9 | "Difesa fragile" |
| < 3 | "Capitolazione totale" |

### 6. Risposta finale

Dopo il verdetto, l'utente può scrivere una **replica al giudizio** — contesta, ammette, difende ancora. Non cambia il punteggio. È un momento catartico opzionale.

**Struttura:**
- Input libero con placeholder "Hai qualcosa da dire al verdetto?"
- Bottone "Invia replica" + bottone "Salta" (chiude senza scrivere)
- Nessun limite di lunghezza — l'utente scrive quanto vuole

**Dopo l'invio:**
Claude legge la replica e risponde con **un'ultima parola** — breve, 2–3 righe. Il tono dipende dalla qualità della replica:
- Replica forte, argomentata → Claude la riconosce, magari concede qualcosa
- Replica debole, emotiva o ripetitiva → Claude la demolisce con garbo

Claude chiude sempre lui — è il più adatto: riflessivo, calibrato, non esagera mai in nessuna direzione.

**Dopo l'ultima parola di Claude**, la sessione si chiude definitivamente. Tutto viene salvato in cronologia: posizione, difficoltà, punteggio finale, verdetti, replica dell'utente, ultima parola di Claude.

---

## UI — Scelte visive

| Elemento | Scelta |
|---|---|
| Colore dominante | Rosso (`#ef4444`) e varianti |
| Sfondo intro | Gradiente scuro `#0d0005 → #1a0008` |
| Sfondo partita | Evolve progressivamente con i round (vedi sezione Atmosfera) |
| Punteggio | Sempre visibile, colore dinamico (verde > 7, giallo 5–7, rosso < 5) |
| Avatar AI | Colore AI corrispondente (`AI_COLOR`) |
| Messaggi utente | Bolla destra, rosso tenue |
| Messaggi AI | Bolla sinistra, colore AI |
| Animazione reveal posizione | Flip card |
| Animazione punteggio | Slide su/giù con numero che cambia prima dell'attacco AI |
| Banner posizione | Sempre visibile, sempre uguale — reminder costante |

---

## Atmosfera visiva — progressione per round

La pressione cresce visivamente ad ogni round. Ogni elemento si adatta in modo autonomo in base a `session.round`.

### Sfondo
Parte da un dark neutro (`#0d0d14`). Ad ogni round si intensifica una **texture a grana** sovrapposta — come carta consumata, rumore visivo, superficie che si deteriora. Il buio non cambia di colore, ma diventa "sporco". Round 1 è quasi pulito. Round 6+ è visivamente logorato.

Implementazione suggerita: overlay `radial-gradient` noise con opacità che scala linearmente con `round`, sovrapposto allo sfondo base.

### Punteggio nell'header
Quando il punteggio **scende** dopo un turno: il numero pulsa di rosso (breve animazione `pulse` con `color: #ef4444`). Quando sale: nessuna animazione — il sollievo deve essere silenzioso.

### Placeholder dell'input
Il testo dell'input cambia ad ogni round, diventando progressivamente più pressante:

| Round | Placeholder |
|---|---|
| 1 | "Difendi la tua posizione…" |
| 2 | "Continua a difendere…" |
| 3 | "Resisti…" |
| 4 | "Tieni duro…" |
| 5 | "Non mollare…" |
| 6+ | "Fino in fondo…" |

### Cosa NON cambia
- Il banner della posizione assegnata: rimane uguale e visibile sempre — è la condanna che non sparisce
- Il layout generale: stessa struttura dall'inizio alla fine
- I colori delle bolle di messaggio: la storia del dibattito non si altera visivamente

---

## Differenze rispetto al 2v2

| Aspetto | 2v2 | Devil's Advocate |
|---|---|---|
| Alleati | Hai un'AI alleata | Sei solo |
| Posizione | La scegli tu (il topic) | Te la assegna il sistema |
| Avversari | Una squadra di 2 AI | 4 AI in sequenza |
| Round | Fissi (configurabili) | Illimitati, finisce quando ti arrendi |
| Punteggio | Squadre (A vs B) | Personale (0–10) |
| Verdetto | Un'AI arbitra | Tutte e 4 giudicano |
| Tono AI | Competitivo ma equilibrato | Aggressivo e personale |
| Salvataggio | Non salvato (attuale) | Sempre salvato con punteggio e verdetto |
| Risposta post-verdetto | No | Sì — risposta finale dell'utente |
| Atmosfera visiva | Stabile | Progressivamente più opprimente |

---

## Stato attuale del codice

### Flusso (com'è ora)
1. L'utente sceglie "Devil's Advocate" dal selettore modalità
2. Il sistema pesca una posizione random da `DEVIL_POSITIONS` (8 posizioni fisse, tutte `side: 'defend'`)
3. La partita inizia **subito**, senza schermata intro
4. Ci sono **4 turni** massimi — non illimitati
5. Al turno 5 (dopo `round > 4`) Claude genera un verdetto (solo Claude, non tutte e 4)
6. Punteggio 0–10 mostrato in tempo reale nell'header, parte da 5.0

### Logica del punteggio (attuale — da sostituire)
Calcolato lato client con euristiche:
- `argStrength = min(lunghezza_testo / 20, 3) + (contiene "perché"/"quindi"/"infatti" ? 1 : 0)`
- Se `argStrength > 2`: `+0.3` punti
- Altrimenti: `-0.2` punti

### AI attaccanti (attuale)
Rotazione fissa: `['claude', 'gpt', 'gemini', 'perplexity'][round % 4]` ✅ già corretto

### Problemi evidenti
- **Punteggio euristico**: calcolato lato client, non è una vera valutazione AI
- **Solo 8 posizioni fisse**: poche, non tutte scomode, nessuna varietà tematica
- **Nessuna schermata intro**: la partita parte subito, no flip card, no ripesca
- **Round fissi a 4**: invece di illimitati con "Mi arrendo"
- **Verdetto solo Claude**: invece di tutte e 4 le AI
- **Verdetto non include il punteggio**: Claude non sa il voto che ha accumulato l'utente
- **Nessuna risposta finale**: la sessione si chiude senza dare voce all'utente
- **Nessuna progressione atmosferica**: lo sfondo non cambia
- **Punteggio non animato**: cambia in tempo reale ma senza animazione post-turno
- **Non salvato in cronologia**

---

## Struttura file attuale

| File | Ruolo |
|---|---|
| `app/components/devil/DevilsAdvocateScreen.tsx` | UI: header, messaggi, input, bottone fine turno |
| `app/components/AigoraChat.tsx` | Stato (`devilSession`), logica `handleDevilMessage`, `handleDevilEndTurn` |
| `app/types/aigora.ts` | Tipo `DevilSession` |
| `app/lib/aiProfiles.ts` | Costante `DEVIL_POSITIONS` (8 voci) |
| `app/api/chat/route.ts` | Endpoint AI (stesso del classico) |

---

## Note tecniche

### Generazione posizioni
Serve un endpoint dedicato (es. `/api/devil/generate`) separato da `/api/chat`. Riceve la difficoltà scelta e restituisce 2 posizioni in una sola chiamata — quella mostrata e il ripesca. Nessuno streaming necessario: risposta JSON semplice. La difficoltà va nel prompt come istruzione esplicita al modello.

### Punteggio reale
Dopo ogni "Fine turno", prima che l'AI attacchi, una chiamata leggera chiede a Claude di valutare gli argomenti dell'utente (1–10). Prompt corto, nessuno streaming. Il delta aggiorna lo score con animazione, poi parte l'attacco dell'AI di quel round. Due chiamate per turno: prima la valutazione, poi l'attacco.

### Verdetto — 4 chiamate in sequenza
Il verdetto richiede 4 chiamate separate, una per AI, in streaming. Ogni AI riceve: la posizione, il livello di difficoltà, il punteggio finale, il numero di round giocati, e l'intera cronologia dei messaggi. Le chiamate partono in sequenza (non in parallelo) per mantenere l'ordine dal più clemente al più duro. L'ordine viene determinato confrontando i punteggi: prima si fa una chiamata leggera per i 4 voti numerici, poi si ordinano, poi si fa lo streaming dei commenti.

### Risposta finale — ultima parola di Claude
Una singola chiamata a Claude con: la replica dell'utente + il verdetto completo già generato. Claude risponde in streaming. Nessuna logica speciale — il tono dipende dal prompt, non da codice.

### Progressione atmosferica
Gestita interamente in CSS/JS lato client — nessuna chiamata API. Una funzione mappa `session.round` su valori di opacità per la texture noise overlay. Zero costo server.

### Salvataggio sessione
La sessione Devil va salvata su DB con un tipo speciale (es. `type: 'devil'`). Campi aggiuntivi rispetto a una chat classica: `position`, `difficulty`, `finalScore`, `verdict` (testo aggregato), `userReply`, `claudeClosing`. Usa la stessa tabella `Chat` con un campo JSON per i dati extra.

### Cosa rimane invariato
- Endpoint `/api/chat` per gli attacchi AI durante la partita — nessuna modifica
- Streaming dei messaggi — funziona già correttamente
- Reset: `setDevilSession(null)` — nessun problema di stato residuo
