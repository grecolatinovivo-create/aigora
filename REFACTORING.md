# Piano di Refactoring — AigoraChat

## Obiettivo

Spezzare `app/components/AigoraChat.tsx` (5548 righe) in file più piccoli e manutenibili, senza rompere nulla. Il refactoring avviene **per fasi incrementali**: ogni fase si chiude con un commit funzionante e verificato manualmente nel browser.

**Regola d'oro**: mai fare due cose insieme. Una fase alla volta, un commit alla volta.

---

## Struttura target

```
app/
  components/
    AigoraChat.tsx              ← componente principale ridotto (~500 righe)
    chat/
      MessageBubble.tsx         ← già esiste, verificare se usato
      ThinkingBubble.tsx        ← da estrarre (riga 2093)
      UserTurnPrompt.tsx        ← da estrarre (riga 2116)
      ActionBar.tsx             ← già esiste, verificare se usato
    layout/
      Navbar.tsx                ← da estrarre (riga 2131)
      PhoneAvatarBar.tsx        ← da estrarre (riga 2060)
    modes/
      ModeSelect.tsx            ← da estrarre (riga 428)
      RouletteScreen.tsx        ← da estrarre (riga 735)
      SlotReel.tsx              ← da estrarre (riga 671)
    2v2/
      TwoVsTwoSetup.tsx         ← da estrarre (riga 833)
      TwoVsTwoScreen.tsx        ← da estrarre (riga 1294)
    devil/
      DevilsAdvocateScreen.tsx  ← da estrarre (riga 1744)
    profile/
      ProfileScreen.tsx         ← da estrarre (riga 1913)
      SwipeableChatRow.tsx      ← da estrarre (riga 327)
    shared/
      RotatingTopics.tsx        ← da estrarre (riga 1856)

  hooks/
    use2v2Game.ts               ← logica handle2v2* (righe 3190–3600)
    useDebate.ts                ← logica runDebate, streamAiResponse (righe 2878–3099)
    useChatSave.ts              ← logica saveCurrentChat, delete, undo (righe 2687–2760)
    useAudioEngine.ts           ← wrapper per audioEngine

  lib/
    audioEngine.ts              ← da estrarre (righe 9–275)
    aiProfiles.ts               ← costanti AI_NAMES, AI_PROFILES, AI_COLORS (sparse nel file)

  types/
    aigora.ts                   ← tutte le interfacce e tipi (TwoVsTwoConfig, TwoVsTwoState, DevilSession, ecc.)
```

---

## Fasi

### FASE 0 — Preparazione ✅ (da fare prima di tutto)
- [ ] Assicurarsi che l'app funzioni e fare un commit pulito su GitHub Desktop
- [ ] Creare le cartelle vuote: `app/components/chat/`, `app/components/layout/`, `app/components/modes/`, `app/components/2v2/`, `app/components/devil/`, `app/components/profile/`, `app/components/shared/`, `app/hooks/`, `app/types/`
- [ ] Verificare cosa c'è già in `app/components/` (ActionBar.tsx, AvatarBar.tsx, MessageBubble.tsx — capire se sono già usati o duplicati)

---

### FASE 1 — Tipi e costanti
**File da creare**: `app/types/aigora.ts`, `app/lib/aiProfiles.ts`

Estrarre da AigoraChat.tsx:
- Tutti i tipi e interfacce: `ChatPhase`, `GameMode`, `Team`, `DevilSession`, `TwoVsTwoConfig`, `TwoVsTwoState`, `AigoraChatProps`
- Costanti: `AI_NAMES`, `AI_COLORS`, `AI_PROFILES`, `TYPEWRITER_DELAY`

**Rischio**: basso. Sono solo tipi e costanti, non logica.  
**Verifica**: il progetto compila senza errori TypeScript.  
**Commit**: "refactor: estrai tipi e costanti AI in file dedicati"

---

### FASE 2 — Audio engine
**File da creare**: `app/lib/audioEngine.ts`

Estrarre righe 9–275: tutto il sistema audio sintetico (Web Audio API). È completamente indipendente dal resto, non ha dipendenze React.

**Rischio**: molto basso. È codice puro, nessuna dipendenza React.  
**Verifica**: i suoni funzionano ancora nell'app (dado, click, gong, ecc.).  
**Commit**: "refactor: estrai audioEngine in lib/audioEngine.ts"

---

### FASE 3 — Componenti puri semplici
**File da creare** (uno alla volta, un commit per ognuno):

1. `app/components/chat/ThinkingBubble.tsx` (riga 2093, ~22 righe)
2. `app/components/chat/UserTurnPrompt.tsx` (riga 2116, ~14 righe)
3. `app/components/shared/RotatingTopics.tsx` (riga 1856, ~32 righe)
4. `app/components/layout/PhoneAvatarBar.tsx` (riga 2060, ~32 righe)
5. `app/components/profile/SwipeableChatRow.tsx` (riga 327, ~100 righe)

**Rischio**: basso. Ricevono tutto via props, non toccano stato globale.  
**Verifica**: UI visivamente identica dopo ogni spostamento.  
**Commit**: uno per ogni componente estratto.

---

### FASE 4 — Componenti medi
**File da creare** (uno alla volta):

1. `app/components/modes/SlotReel.tsx` (riga 671, ~62 righe)
2. `app/components/modes/RouletteScreen.tsx` (riga 735, ~97 righe)
3. `app/components/modes/ModeSelect.tsx` (riga 428, ~211 righe)
4. `app/components/layout/Navbar.tsx` (riga 2131, ~132 righe)

**Rischio**: medio. Alcuni hanno useState/useEffect interni propri.  
**Verifica**: le schermate di selezione modalità e la navbar funzionano.  
**Commit**: uno per ogni componente.

---

### FASE 5 — Componenti grandi
**File da creare** (uno alla volta, con attenzione alle props):

1. `app/components/profile/ProfileScreen.tsx` (riga 1913, ~146 righe)
2. `app/components/devil/DevilsAdvocateScreen.tsx` (riga 1744, ~111 righe)
3. `app/components/2v2/TwoVsTwoScreen.tsx` (riga 1294, ~449 righe)
4. `app/components/2v2/TwoVsTwoSetup.tsx` (riga 833, ~460 righe)

**Rischio**: medio-alto. TwoVsTwoSetup e TwoVsTwoScreen sono grandi e hanno props complesse.  
**Strategia**: mappare tutte le props necessarie prima di spostare.  
**Verifica**: flusso 2v2 completo funzionante (setup → partita → verdetto).  
**Commit**: uno per ogni componente.

---

### FASE 6 — Hook custom (il lavoro più delicato)
**File da creare**:

1. `app/hooks/useChatSave.ts` — estrae: `saveCurrentChat`, `handleDeleteChat`, `handleUndoDelete`, stati relativi
2. `app/hooks/use2v2Game.ts` — estrae: `handle2v2Start`, `handle2v2AIResponse`, `handle2v2HumanMessage`, `handle2v2RoundVerdict`, `handle2v2Verdict`, `twoVsTwoState`, `twoVsTwoLoading`
3. `app/hooks/useDebate.ts` — estrae: `streamAiResponse`, `runFactCheck`, `runDebate`, stati relativi

**Rischio**: alto. Gli hook condividono stato con il componente padre. Richiede passare setState o usare pattern di callback.  
**Strategia**: iniziare da `useChatSave` (più isolato), poi `use2v2Game`, poi `useDebate`.  
**Verifica**: testare ogni flusso per intero dopo ogni hook estratto.  
**Commit**: uno per ogni hook.

---

### FASE 7 — Pulizia finale ✅
- [x] Rimossi import inutilizzati: `ARBITER_OPTIONS`, `TOPIC_SUGGESTIONS`, `MODE_INFO`, `Team`, `SlotReel`
- [x] Rimossa funzione morta `detectNextAi` (definita ma mai chiamata)
- [x] Rimossi commenti orfani
- [x] `npx tsc --noEmit` → 0 errori
- [ ] Verificare la build di produzione: `npm run build` (da eseguire in locale)
- [ ] Commit finale: "refactor: AigoraChat split completato"

---

## Regole durante il refactoring

1. **Una fase alla volta** — non iniziare la fase N+1 prima di aver fatto commit della fase N
2. **Sempre verificare nel browser** dopo ogni spostamento
3. **Non cambiare logica** durante il refactoring — solo spostare codice
4. **Se qualcosa si rompe**, tornare all'ultimo commit funzionante su GitHub Desktop (Discard Changes)
5. **Aggiornare questo file** segnando ✅ le fasi completate

---

## Stato attuale

- Fase 0: ✅ completata — cartelle create
- Fase 1: ✅ completata — `app/types/aigora.ts` + `app/lib/aiProfiles.ts`
- Fase 2: ✅ completata — `app/lib/audioEngine.ts`
- Fase 3: ✅ completata — ThinkingBubble, UserTurnPrompt, RotatingTopics, PhoneAvatarBar, SwipeableChatRow
- Fase 4: ✅ completata — SlotReel, RouletteScreen, ModeSelect→già estratto, Navbar
- Fase 5: ✅ completata — ModeSelect, TwoVsTwoSetup, TwoVsTwoScreen, DevilsAdvocateScreen, ProfileScreen
- Fase 6: ⏭ saltata — hook troppo accoppiati allo stato del componente (messagesRef, chatHistoryRef, setSavedChats, ecc.). Rischio alto, beneficio basso. Admin consapevole e concorde.
- Fase 7: ✅ completata — import inutilizzati rimossi, detectNextAi rimossa, build TypeScript pulita
