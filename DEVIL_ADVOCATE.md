# Devil's Advocate — Analisi e roadmap

## Com'è adesso

### Flusso
1. L'utente sceglie "Devil's Advocate" dal selettore modalità
2. Il sistema pesca una posizione random da `DEVIL_POSITIONS` (8 posizioni fisse, tutte `side: 'defend'`)
3. L'utente **deve difendere** quella posizione contro le AI che la attaccano
4. Ci sono **4 turni** massimi. Ogni turno l'utente scrive argomenti, poi clicca "Fine turno"
5. Al turno 5 (dopo `round > 4`) Claude genera un verdetto testuale
6. Punteggio 0–10 mostrato in tempo reale nell'header, parte da 5.0

### Logica del punteggio (attuale)
Il punteggio è rudimentale:
- Viene calcolato **solo lato client** dopo ogni messaggio dell'utente
- `argStrength = min(lunghezza_testo / 20, 3) + (contiene "perché"/"quindi"/"infatti" ? 1 : 0)`
- Se `argStrength > 2`: `+0.3` punti
- Altrimenti: `-0.2` punti
- Range bloccato tra 0 e 10

### AI attaccanti
Le AI ruotano in modo fisso: `['claude', 'gpt', 'gemini', 'perplexity'][round % 4]`
- Round 1 → Claude attacca
- Round 2 → GPT attacca
- Round 3 → Gemini attacca
- Round 4 → Perplexity attacca

### Stato (`DevilSession`)
```ts
{
  position: string       // posizione assegnata
  side: 'defend'         // sempre defend per ora
  round: number          // 1–4+
  score: number          // 0.0–10.0, parte da 5.0
  messages: { role: 'user' | 'ai'; aiId?: string; content: string }[]
}
```

### Problemi evidenti
- **Punteggio euristico**: il punteggio viene calcolato lato client con euristiche semplici (lunghezza testo + parole chiave), non con una vera valutazione AI.
- **Solo 8 posizioni fisse**: tutte `side: 'defend'`, nessuna varietà tematica, nessuna modalità "smonta".
- **Nessuna schermata intro**: la partita parte subito senza mostrare la posizione assegnata o spiegare le regole; l'utente non può ri-pescare.
- **Verdetto non coerente col punteggio**: il prompt del verdetto finale non riceve il `score`, quindi Claude non può commentarlo in modo coerente.
- **Nessuna modalità "attack"**: `side: 'attack'` è nel tipo ma non implementato — il prompt AI è sempre uguale.

---

## Cosa migliorare

### Priorità alta

**1. Punteggio reale via AI**
Invece di calcolarlo lato client con euristiche, dopo ogni risposta dell'utente si chiede a Claude di valutare l'argomento (1–10) con una chiamata leggera. Il delta aggiorna lo score visibile. Costo: una chiamata extra per messaggio, ma piccola (prompt corto).

**2. Posizioni dinamiche / personalizzate**
- Aggiungere un bottone "Altra posizione" prima di iniziare
- Permettere all'utente di inserire una posizione propria
- Generare posizioni con AI su un tema scelto dall'utente

**3. Coerenza verdetto–punteggio**
Passare il `score` corrente nel prompt del verdetto finale così Claude può commentarlo in modo coerente ("Hai raggiunto 7.2/10 — difesa solida ma con lacune su X").

**4. Intro della posizione**
Schermata intermedia prima di iniziare: mostra la posizione, spiega le regole, chiede conferma. L'utente può ri-pescare se la posizione è troppo lontana dal suo mondo.

### Priorità media

**5. Modalità "attack"**
Attivare `side: 'attack'`: l'utente deve **smontare** una posizione invece di difenderla. Prompt AI diverso, logica speculare.

**6. AI attaccante variabile**
Invece di ruotare in modo fisso, scegliere l'AI in base alla posizione (es. Gemini su temi scientifici, Perplexity su notizie recenti).

**7. Feedback turno per turno**
Dopo ogni "Fine turno" mostrare una micro-valutazione: "Argomento forte ✓" / "Troppo vago, sviluppa meglio". Aiuta l'utente a migliorare nel turno successivo.

**8. Salvataggio della sessione**
Attualmente il devil non viene salvato in cronologia. Aggiungere salvataggio come tipo speciale di chat.

### Priorità bassa

**9. Più round configurabili**
Permettere 2, 4 o 6 round invece di fisso a 4.

**10. Modalità "Allenamento"**
Stessa cosa ma con suggerimenti visibili: l'AI aiuta l'utente a costruire l'argomento invece di solo attaccarlo.

---

## Struttura file attuale

| File | Ruolo |
|------|-------|
| `app/components/devil/DevilsAdvocateScreen.tsx` | UI: header, messaggi, input, bottone fine turno |
| `app/components/AigoraChat.tsx` | Stato (`devilSession`), logica `handleDevilMessage`, `handleDevilEndTurn` |
| `app/types/aigora.ts` | Tipo `DevilSession` |
| `app/lib/aiProfiles.ts` | Costante `DEVIL_POSITIONS` (8 voci) |
| `app/api/chat/route.ts` | Endpoint usato per le risposte AI (stesso del classico) |

---

## Note implementative

- Il Devil non usa un endpoint dedicato (`/api/2v2` non è coinvolto) — usa `/api/chat` con `action: 'turn'` come il dibattito classico
- Lo streaming funziona correttamente
- `handleDevilEndTurn` al turno 5 genera il verdetto **e** incrementa il round — ma poi il bottone resta disabilitato (`session.round >= 4`) anche se round è diventato 5, quindi l'UI si blocca correttamente
- Reset: `setDevilSession(null)` in `handleReset` — nessun problema di stato residuo
