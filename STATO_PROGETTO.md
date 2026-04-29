# STATO DEL PROGETTO — AiGORÀ
*Documento prodotto dal round table dei 5 esperti · 29 aprile 2026*
*Aggiornare questo file dopo ogni sessione significativa.*

---

## VISIONE E IDENTITÀ

**AiGORÀ** — "L'arena delle idee"
- App ID: `eu.aigora.app` · URL live: `https://app.aigora.eu`
- Standard: esperienza premium world-class, nessun compromesso

### Palette cromatica ufficiale (immutabile)
| Modo | Nome | Colore | Hex |
|------|------|--------|-----|
| Debate 4 AI | **Arena** | Viola | `#A78BFA` |
| Battaglia umano+AI | **2v2** | Sky blue | `#38BDF8` |
| Avvocato del diavolo | **Devil** | Rosso | `#F87171` |
| Concilio creativo | **Brainstorm** | Giallo | `#FCD34D` |
| Profilo / neutro | — | Viola | `#A78BFA` |
| Sfondo base | — | Nero | `#07070f` |

---

## STACK TECNICO

| Layer | Tecnologia |
|-------|-----------|
| Frontend | Next.js 14 App Router + TypeScript + Tailwind |
| Native | Capacitor 6 → WebView su `https://app.aigora.eu` |
| Database | Neon (PostgreSQL serverless) + Prisma ORM |
| Auth | NextAuth v4 + Prisma adapter |
| AI | Claude (Anthropic) · GPT (OpenAI) · Gemini (Google) · Perplexity |
| Realtime | Ably |
| Pagamenti | Stripe (Free / Pro €9.99 / Premium €19.99) |
| Email | Resend |
| i18n | next-intl — lingue: italiano + inglese |
| Analytics | Vercel Analytics |
| CI/CD Android | GitHub Actions → AAB firmato |
| CI/CD iOS | Xcode Cloud → post-clone script |

---

## COSA È GIÀ COSTRUITO ✅

### Funzionalità core

| Feature | File / Route | Stato |
|---------|-------------|-------|
| Arena (debate 4 AI) | `AigoraChat.tsx` + `/api/chat` | ✅ Completo |
| 2v2 Solo | `TwoVsTwoSetup/Screen.tsx` + `/api/2v2` | ✅ Completo |
| 2v2 Multiplayer (amico) | `TwoVsTwoSetup/Screen.tsx` + Ably | ✅ Completo |
| Devil's Advocate | `DevilsAdvocateScreen` + `/api/devil/generate` | ✅ Completo |
| Brainstorm | `/brainstorm` + `BrainstormerClient` + `/api/brainstorm/*` | ✅ Completo |
| Group Chat Room | `/room/[id]` + `GroupChatRoom` + Ably webhook | ✅ Completo |

### Infrastruttura

| Feature | File | Stato |
|---------|------|-------|
| Auth (login / register / reset pw) | `/api/auth/*` | ✅ Completo |
| Stripe checkout + webhook + portal | `/api/stripe/*` | ✅ Completo |
| Rate limiting su DB | `lib/rateLimit.ts` + Neon | ✅ Completo |
| Tier gating (Free/Pro/Premium) | `lib/plans.ts` + ogni API route | ✅ Completo |
| Upload allegati (vision + docs) | `AttachmentButton` + `/api/chat` | ✅ Completo |
| i18n next-intl (it + en) | `messages/it.json` + `en.json` | ✅ Completo |
| Cronologia sessioni (Pro+) | `SwipeableChatRow` + `/api/chats` | ✅ Completo |
| Profilo utente + avatar | `ProfileScreen` + `/api/user/*` | ✅ Completo |
| Admin panel | `/admin` + `/api/admin/*` | ✅ Completo |
| Landing page pubblica | `LandingPage.tsx` | ✅ Completo |
| Arena pubblica (no-login) | `ArenaPublic.tsx` + `/arena` | ✅ Completo |
| Login modal contestuale | `LoginModal.tsx` | ✅ Completo |

### Native UX (Capacitor)

| Componente | File | Stato |
|-----------|------|-------|
| Capacitor config | `capacitor.config.ts` | ✅ |
| Init nativo (back, network, statusbar) | `CapacitorProvider.tsx` | ✅ |
| BottomTabBar (4 tab, routing corretto) | `BottomTabBar.tsx` | ✅ Rifondato |
| SplashOverlay (56 particelle → logo) | `SplashOverlay.tsx` | ✅ |
| Safe area CSS + overscroll fix | `globals.css` | ✅ |
| Build Android CI | `build-android.yml` | ✅ |
| Build iOS CI | `xcode-cloud-build.sh` | ✅ |

---

## PROBLEMI APERTI 🔴

### Critici (bloccano l'esperienza)

| # | Problema | Impatto | File coinvolti |
|---|----------|---------|----------------|
| P1 | **Nessuna home screen loggati** — l'utente atterra su una textarea vuota, nessun orientamento | Alto | `AigoraChat.tsx` fase `start` |
| P2 | **Dashboard quasi vuota** — badge piano + 2 pulsanti. Non è una dashboard, è una ricevuta | Alto | `dashboard/page.tsx` |
| P3 | **Devil non ha una route propria** — accessibile solo tramite "Cambia modalità" dentro AigoraChat | Medio | `AigoraChat.tsx` |
| P4 | **AigoraChat.tsx è 4.175 righe** con 40+ `useState` — monolite ingestibile | Alto | `AigoraChat.tsx` |
| P5 | **Tre selettori di modo disconnessi** — `LandingPage`, `ArenaPublic`, `ModeSelect` hanno identità visiva diversa | Medio | 3 file separati |
| P6 | **Nessun loop di retention** — nessun hook che riporta l'utente il giorno dopo | Alto | Prodotto |

### Strutturali (da risolvere prossima fase)

| # | Problema | Note |
|---|----------|------|
| S1 | `GameMode` usa `'classico'` internamente, ma il nome pubblico è `'Arena'` | Discrepanza front/back |
| S2 | Nessun onboarding primo accesso | Utente nuovo non sa cosa fare |
| S3 | Nessun feedback visivo del limite tier quando Free prova Devil/Brainstorm | L'UpgradeWall esiste ma va verificata in tutti i punti di ingresso |
| S4 | Nessun sistema di notifiche wired (route `/api/notifications` esiste ma non è collegata) | Dipende da feature future |

### Debito tecnico

| # | Problema | Note |
|---|----------|------|
| D1 | `AigoraChat.tsx` — da spezzare in moduli | `DebateView`, `HomeScreen`, `DevilWrapper` ecc. |
| D2 | `ChatPhase` è un router interno senza URL — ogni "pagina" è uno stato React | Rende impossibile il deep linking |
| D3 | Componente `ModeCard` non esiste — ogni selettore ridisegna le card da zero | Duplicazione + incoerenza |

---

## ROADMAP — SPRINT PRIORITIZZATI

### 🟥 Sprint 2 — HomeScreen (prossima sessione)

**Obiettivo:** eliminare il problema P1 (la più critica) e P2.

**1. HomeScreen** — riscrivere la fase `'start'` di `AigoraChat` come schermata reale
- 4 card cliccabili con colori e icone ufficiali del sistema (Arena, 2v2, Devil, Brainstorm)
- Le card Free-gated (Devil, Brainstorm) mostrano un lucchetto + "Pro" invece di essere disabilitate
- Ultima sessione visibile in basso (1 riga, solo se esiste)
- Nessuna textarea al centro — quella appare solo DOPO che l'utente sceglie il modo

**2. Dashboard** — ridisegnare come hub di navigazione
- Sezione "Il tuo piano" (badge + progress verso il prossimo tier)
- Sezione "Le tue sessioni recenti" (3-5 righe linkabili)
- CTA per i 4 modi con accesso diretto
- Pulsante Stripe Portal visibile ma secondario

**File da modificare:**
- `app/components/AigoraChat.tsx` — fase `start` → chiama `<HomeScreen />`
- `app/[locale]/dashboard/page.tsx` — riscrivere completamente
- `app/components/HomeScreen.tsx` — NUOVO componente

---

### 🟧 Sprint 3 — ModeCard unificato + Devil route

**Obiettivo:** risolvere P3, P5, S1, D3.

**1. Componente `ModeCard`** — unico componente riusabile per rappresentare un modo
- Props: `mode`, `active`, `locked`, `onClick`
- Usato in: `HomeScreen`, `ArenaPublic`, `ModeSelect`, `LandingPage`

**2. Devil route propria** `/[locale]/devil`
- Stessa architettura di `/brainstorm`
- Deep linking funzionante
- Tab bar: valutare se aggiungere un 5° tab o lasciare Devil nella home

**3. Allineamento naming interno**
- `GameMode: 'classico'` → `GameMode: 'arena'`
- Aggiornare tutti i file che usano `'classico'`

**File da creare/modificare:**
- `app/components/shared/ModeCard.tsx` — NUOVO
- `app/[locale]/devil/page.tsx` — NUOVO
- `app/types/aigora.ts` — GameMode update
- `app/components/AigoraChat.tsx` — aggiornare riferimenti

---

### 🟨 Sprint 4 — Refactor AigoraChat

**Obiettivo:** risolvere P4, D1, D2.

**Architettura target:**
```
AigoraChat.tsx (shell, ~200 righe)
  ├── HomeScreen.tsx        — fase start
  ├── DebateView.tsx        — fase running/done/history (Arena classico)
  ├── TwoVsTwoWrapper.tsx   — delega a TwoVsTwoSetup/Screen
  ├── DevilWrapper.tsx      — delega a DevilDifficulty/Intro/Screen
  └── ProfileView.tsx       — fase profile
```

`ChatPhase` diventa un router interno tipizzato. Ogni view è un file separato.

---

### 🟩 Sprint 5 — Retention e Native polish

**Obiettivo:** risolvere P6, completare la lista Native UX in coda.

**Retention:**
- Sistema "streak" visibile in HomeScreen (x sessioni questa settimana)
- Badge e achievement minimali (prima sessione Devil, primo Brainstorm, ecc.)
- "Sfida amico" quick-CTA dalla HomeScreen

**Native UX — in coda (decisione round table prima di ognuno):**
1. Transizioni di pagina — slide/fade tra le route Capacitor
2. Haptic feedback — su tap CTA principali
3. Schermata offline brandizzata
4. Onboarding primo accesso (4 card → swipe intro)
5. Push notifications — già scaffoldata in CapacitorProvider

---

## REGOLE DI SISTEMA (non derogabili)

### Codice
- **TypeScript strict** — `tsc --noEmit` zero errori prima di ogni commit
- **No librerie esterne per animazioni** — CSS + Canvas + RAF
- **Safe area sempre** — ogni fixed/sticky usa `env(safe-area-inset-*)`
- **Lazy import Capacitor** — sempre `await import('@capacitor/...')` dentro try/catch
- **i18n obbligatoria** — ogni stringa visibile passa per `next-intl`
- **`npm install --legacy-peer-deps`** — obbligatorio

### Design
- Mai usare "Classico" o "Chat" per il modo Arena
- Mai usare emoji come iconografia primaria (solo SVG vettoriali)
- Il colore di un modo è sempre quello della tabella — mai inventarne di nuovi
- Ogni elemento fixed/sticky rispetta la safe area

### Processo
- Ogni decisione UX/visual/feature → round table 5 esperti prima dell'implementazione
- Bugfix tecnici minori → nessun round table necessario
- Questo file + `CLAUDE.md` si leggono all'inizio di ogni sessione

---

## LOG SESSIONI

| Data | Sprint | Cosa è stato fatto |
|------|--------|-------------------|
| 29 apr 2026 | Sprint 1 — Block 1 | Round table rifondazione UX. Fix BottomTabBar routing (Arena→`/`, Profilo al posto di Devil). Corretti colori 2v2→`#38BDF8`. Rimossi SOON cards da ModeSelect e ArenaPublic. Creata SplashOverlay 56-particelle. Creati CLAUDE.md e RIFONDAZIONE_UX.md. tsc: 0 errori. |
| 29 apr 2026 | Sprint 2 — HomeScreen + Dashboard | Round table brainstorm prima dell'implementazione. Creata `HomeScreen.tsx` (4 card: Arena full-width + espansione in-place, 2v2+Devil in riga, Brainstorm full-width; lock Pro per Devil/Brainstorm; saluto dinamico; ripresa ultima sessione). Integrata in `AigoraChat.tsx` — fase `start` da 4175 → 3842 righe. Riscritta `dashboard/page.tsx` come hub reale (piano attivo + barra tier, accesso rapido 4 modi, sessioni recenti da API). Aggiunte chiavi i18n `home.*` in it.json e en.json. tsc: 0 errori. |
| 29 apr 2026 | Sprint 2 — Fix 10 problemi (simulazione 100 utenti) | FIX-2: dashboard sessioni navigabili via `?resume=chatId` + auto-open in AigoraChat. FIX-1: Web Share API + clipboard fallback nel pannello post-sessione (mobile+desktop). FIX-3: "Argomento del giorno" deterministico (30 topic IT+EN, hash data) in HomeScreen — click pre-compila Arena. FIX-4: `/api/limits` endpoint read-only + barra avanzamento settimanale Free (X/3) in HomeScreen. FIX-5: avatar HomeScreen → Dashboard (non history). FIX-6: chips 2v2/Devil/Brainstorm post-sessione + "Nuova domanda". FIX-7: saluto senza nome usa `"Buonasera!"` (esclamativo). FIX-8: card Arena si apre al primo tap, si chiude solo con X esplicita. FIX-9: fontSize minimo 12px su HomeScreen e Dashboard. FIX-10: chip `modeLabel`/`modeLabelColor` nel Navbar — Brainstorm mostra badge giallo `#FCD34D`. tsc: 0 errori. |
| 29 apr 2026 | Sprint 3 — Audit UI/UX 32 bug (🔴C ×7, 🟠A ×14, 🟡M ×4 + extra) | **C1** `aigora.ts` + `AigoraChat`: prop `startMode` + `pendingStartModeRef` → avvio diretto 2v2 da Dashboard via `?start=2v2`. **C2** Dashboard: sezioni i18n (`t('yourPlan')`, `t('quickAccess')`, `t('recentSessions')`), skeleton loading, `paddingBottom: calc(72px + env(safe-area-inset-bottom,0px))`. **C3** BrainstormerClient: guard `isMobileChecked` elimina flash desktop prima del redirect mobile. **C4** BrainstormerClient: navigazioni `onCronologia`/`onNewChat`/`onSignOut` usano `/${locale}/` prefix. **C5** AigoraChat: banner riconnessione `bottom: calc(96px + env(safe-area-inset-bottom,0px))`. **C6** AigoraChat: `zoom` non-standard Firefox → `transform: scale()` + `transformOrigin` (2 occorrenze). **C7** BrainstormerClient: `alert()` → toast inline `portalError` con auto-dismiss 4 s + chiavi i18n `brainstorm.portalError`/`networkError`. **A1–A3** Dashboard: `formatDate` usa `locale` variabile; `'Sessione senza titolo'` → `t('untitledSession')`; MODES usa `descKey` con `t(mode.descKey)`. **A4** LandingPage mobile ModeSection wrapper: `display:flex` + `flexDirection:column` + `alignItems:center`. **A5** BottomTabBar: `useTranslations`, tab label i18n, `env(safe-area-inset-bottom,0px)` con fallback, `fontSize:'10px'`. **A6** Navbar: colore `starter` allineato a `#10A37F` (come Dashboard). **A7** ArenaPublic: tutte le stringhe mock (`chat1–4`, `brainstormResult`, `twoMsg1/2`, `judgeLabel`, `twoJudge`) → `t()` con chiavi in `arena.mock`. **A8** BrainstormerClient: font sizes `10px`/`11px` → `12px`; `'La tua idea'` hardcoded → `t('ideaLabel')`. **M1–M4** AigoraChat: `usedBubbleTopicsRef` inizializzato con `new Set<string>()` (non secondo `getRandomBubbleTopics()`) → niente bubble duplicate. Chiavi i18n aggiunte in `it.json` e `en.json`: `nav.*`, `dashboard.*`, `brainstorm.*`, `arena.mock.*`. tsc: 0 errori. |

---

*Prossima sessione: Sprint 4 — ModeCard unificato + route propria Devil*
