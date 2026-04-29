# RIFONDAZIONE UX — AiGORÀ
*Documento prodotto dal round table dei 5 esperti — 29 aprile 2026*

---

## TL;DR — Cosa non va e cosa va fatto

### Bug critici da fixare SUBITO
| # | Problema | Fix |
|---|----------|-----|
| 1 | BottomTabBar "Arena" → `/arena` (pagina pubblica, non la home loggati) | Arena → `/[locale]` |
| 2 | BottomTabBar "Devil" → `/arena` (stessa route sbagliata) | Sostituire con Profilo |
| 3 | Colore 2v2 è `#FB923C` nel TabBar, `#38BDF8` ovunque altrove | Uniformare a `#38BDF8` |
| 4 | Card "Classico — SOON" nel ModeSelect (il classico ESISTE già) | Rimuovere |
| 5 | Card "Multiplayer — SOON" in ArenaPublic (placeholder vecchio) | Rimuovere o rendere reale |

### Problemi strutturali (prossima sessione)
| # | Problema | Fix pianificato |
|---|----------|-----------------|
| 6 | Nessuna "home screen" per utenti loggati — atterrano su textarea vuota | Creare HomeScreen con 4 modi |
| 7 | Dashboard `/dashboard` quasi vuota, non navigabile | Ridisegnare come hub |
| 8 | AigoraChat.tsx è 800+ righe con 40+ useState | Spezzare in moduli per modo |
| 9 | Tre selettori di modo diversi e inconsistenti | Unificare in componente unico |
| 10 | ArenaPublic mostra mockup iPhone su iPhone nativo | Usare card-only su nativo |

---

## Il problema principale: l'architettura informativa

L'app ha due "piani" che non comunicano tra loro:

```
PIANO MARKETING (non loggati)
  / → LandingPage
  /arena → ArenaPublic (selettore pubblico)

PIANO APP (loggati)
  / → AigoraChat (debate)
  /2v2 → TwoVsTwo
  /brainstorm → Brainstormer
  /dashboard → Dashboard
```

Il BottomTabBar è pensato per il **Piano App** ma le sue route puntano al **Piano Marketing**.

---

## Naming definitivo dei 4 modi (da usare ovunque, senza eccezioni)

| Modo | Nome ufficiale | Colore | Icona |
|------|---------------|--------|-------|
| Dibattito 4 AI | **Arena** | `#A78BFA` (viola) | chat bubble |
| Battaglia 2 vs 2 | **2v2** | `#38BDF8` (sky blue) | due persone |
| Devil's Advocate | **Devil** | `#F87171` (rosso) | fiamma |
| Brainstormer | **Brainstorm** | `#FCD34D` (giallo) | lampadina |

**Regola assoluta**: mai usare "Classico", "Dibattito", "Chat" per il modo Arena. Mai usare emoji 😈 o 🧠 come iconografia primaria.

---

## BottomTabBar — struttura corretta

```
Tab 1: Arena      → /[locale]        (home loggati = AigoraChat)
Tab 2: 2v2        → /[locale]/2v2
Tab 3: Brainstorm → /[locale]/brainstorm
Tab 4: Profilo    → /[locale]/dashboard
```

**Devil's Advocate** è un MODO dentro Arena, non una destinazione autonoma.
Si accede tramite il pulsante "Cambia modalità" già presente nell'UI di AigoraChat.
Il tab "Devil" viene rimosso e sostituito con "Profilo".

**Ragionamento**: Devil non ha una sua route (`/devil`). Brainstorm ce l'ha (`/brainstorm`), 2v2 ce l'ha (`/2v2`). Avere Devil nel tab bar crea un'aspettativa non soddisfatta.

---

## Home screen per utenti loggati (da costruire)

Oggi: utenti loggati atterrano su AigoraChat in fase "start" — textarea vuota.

**Obiettivo**: una home che mostri:
- I 4 modi come card cliccabili (identità visiva chiara, stesso sistema di colori)
- Le ultime sessioni dell'utente (1-2 righe)
- Un quick-start per il modo più usato

**Non è una pagina separata** — è la fase "start" di AigoraChat riscritta come HomeScreen.
Questo non richiede nuove route, solo ridisegno della fase iniziale.

---

## Priorità di esecuzione

### Sprint 1 (oggi — fix critici)
- [ ] Fix BottomTabBar routing (Arena → `/`, Profilo al posto di Devil)
- [ ] Fix colore 2v2 → `#38BDF8` ovunque
- [ ] Rimuovere "Classico SOON" da ModeSelect
- [ ] Rimuovere "Multiplayer SOON" da ArenaPublic (o lasciare solo 4 modi)

### Sprint 2 (prossima sessione — HomeScreen)
- [ ] Ridisegnare fase "start" di AigoraChat come HomeScreen con 4 card
- [ ] Ridisegnare Dashboard come hub di navigazione
- [ ] Unificare i tre selettori in un componente `ModeCard` riusabile

### Sprint 3 (medio termine — codice)
- [ ] Spezzare AigoraChat.tsx in: `DebateView`, `TwoVsTwoWrapper`, `DevilWrapper`, `HomeScreen`
- [ ] Tipo `ChatPhase` diventa router interno, ogni fase è un componente separato

---

## Note per le sessioni future

Quando si lavora su qualsiasi schermata, verificare sempre:
1. Il naming del modo è quello definitivo dalla tabella sopra?
2. Il colore è quello del sistema ufficiale?
3. La route è quella corretta (Piano App per loggati)?
4. L'icona è SVG vettoriale, non emoji?
