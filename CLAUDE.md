# CLAUDE.md — Istruzioni permanenti per AiGORÀ

> Questo file viene letto automaticamente all'inizio di ogni sessione.
> Seguire queste istruzioni in modo preciso e completo, sempre.

---

## 1. Metodo di lavoro: Round Table Multi-Agent

**OGNI decisione significativa** (UX, feature, architettura, copy, colori, animazioni)
deve passare per un round table di 5 esperti interni. Non implementare mai nulla
di rilevante senza prima aver fatto parlare tutti e cinque.

### I 5 Esperti

| Persona | Ruolo | Focus principale |
|---------|-------|-----------------|
| **Senior Dev** | Ingegnere capo | Architettura, performance, scalabilità, errori tecnici |
| **UX/UI Designer** | Designer senior | Gerarchia visiva, interazioni, pattern mobile nativi, accessibilità |
| **Neuromarketing Expert** | Scienza cognitiva | Carico cognitivo, dopamina, trigger emotivi, attenzione e memoria |
| **Senior Marketer** | Strategia brand | Posizionamento, differenziazione competitiva, acquisizione, ritenzione |
| **Senior Auditor** | Controllo qualità | Doppio controllo di ogni decisione, coerenza, errori nascosti |

### Protocollo del round table

1. **Presentazione** — descrivi il problema/feature al tavolo
2. **Giro di parola** — ogni esperto parla dalla propria prospettiva (nessuno si ripete)
3. **Dibattito** — eventuali obiezioni e risposte
4. **Consenso** — si implementa solo dopo accordo unanime (o maggioranza con nota del dissenso)
5. **Implementazione** — Senior Dev guida il codice, Auditor fa il check finale

**Non saltare mai questo processo** per decisioni di UX, visual design, o feature nuove.
Per bugfix tecnici minori il round table è opzionale.

---

## 2. Visione del prodotto

### Identità
- **Nome:** AiGORÀ
- **Tagline:** "L'arena delle idee"
- **App ID:** `eu.aigora.app`
- **URL live:** `https://app.aigora.eu`
- **Colore base:** `#07070f` (nero quasi puro)

### Palette colori per funzione
| Feature | Colore | Hex |
|---------|--------|-----|
| Arena (debate classico) | Viola | `#A78BFA` |
| 2 vs 2 | Sky blue | `#38BDF8` |
| Devil's Advocate | Rosso | `#F87171` |
| Brainstorm | Giallo | `#FCD34D` |
| Profilo / neutro | Viola | `#A78BFA` |

### Standard qualitativo
> "Voglio un'esperienza premium di app, deve superare tutto quello che è stato
> fatto fino ad ora nel campo."
> — Giampiero, proprietario del prodotto

Ogni scelta va misurata su questo standard. Se non è world-class, non va in produzione.

---

## 3. Architettura tecnica (non modificare senza round table)

### Stack
- **Frontend:** Next.js 14 App Router + TypeScript + Tailwind
- **Native:** Capacitor 6 (WebView → `https://app.aigora.eu`)
- **Database:** Neon (PostgreSQL serverless) + Prisma
- **Auth:** NextAuth v4 + Prisma adapter
- **AI:** Anthropic Claude, OpenAI GPT, Google Gemini, Perplexity
- **Realtime:** Ably
- **Pagamenti:** Stripe
- **Email:** Resend
- **Analytics:** Vercel Analytics

### Capacitor — regola fondamentale
Il Capacitor WebView punta all'URL live (`https://app.aigora.eu`).
**Non serve un build statico** per la shell nativa. `webDir: 'public'` esiste
solo per icone e assets dello splash nativo.

### CI/CD
- **Android:** GitHub Actions (`build-android.yml`) — push su `main` → AAB firmato
- **iOS:** Xcode Cloud (`ci/xcode-cloud-build.sh`) — post-clone script

---

## 4. Native UX — stato e roadmap

### Completato ✅
| Componente | File | Note |
|-----------|------|-------|
| Capacitor config | `capacitor.config.ts` | Server URL, splash, status bar |
| CapacitorProvider | `app/components/native/CapacitorProvider.tsx` | Init nativo, back button, network, status bar |
| BottomTabBar | `app/components/native/BottomTabBar.tsx` | **RIFONDATO** — 4 tab: Arena→`/`, 2v2, Brainstorm, Profilo. Devil rimosso. |
| SplashOverlay | `app/components/native/SplashOverlay.tsx` | Particelle → logo → glow → fade |
| Safe area CSS | `app/globals.css` | `env(safe-area-inset-*)`, `is-native` class |
| Android CI | `.github/workflows/build-android.yml` | Node 24, Java 17, AAB firmato |
| iOS CI | `ci/xcode-cloud-build.sh` | Post-clone Xcode Cloud |
| **Block 1 UX fix** | vari | SOON cards rimossi (ModeSelect + ArenaPublic), 2v2 `#38BDF8` ovunque |

### In coda — decisione round table necessaria ⏳
1. **Transizioni di pagina** — animazioni tra le route (slide, fade, spring)
2. **Haptic feedback** — su tap CTA principali (Capacitor Haptics plugin)
3. **Schermata offline brandizzata** — sostituisce il banner minimalista attuale
4. **Onboarding nativo** — prima apertura app, tour delle funzionalità
5. **Push notifications** — già scaffoldata in CapacitorProvider, da collegare al backend

### Splash screen — dettagli implementativi
**Timeline:** 56 particelle radiali convergono (950ms, ease cubic) →
logo spring-in con blur (1050ms) → separatore (1200ms) → tagline (1460ms) →
glow pulse triplo (1750ms) → fade-out (2650ms) → unmount (3250ms).

**Si attiva su:** Capacitor nativo + PWA standalone (display-mode: standalone).
**z-index:** 99997 (sotto rotate-overlay 99999 e offline-banner 99998).

---

## 5. Regole di codice

- **TypeScript strict** — zero errori `tsc --noEmit` prima di ogni commit
- **No librerie esterne per animazioni** — CSS + Canvas + RAF puri (performance mobile)
- **Safe area sempre** — ogni elemento fixed/sticky usa `env(safe-area-inset-*)`
- **`is-native` class** — tutti gli stili specifici native usano `html.is-native`
- **Lazy import Capacitor** — sempre `await import('@capacitor/...')` dentro try/catch
- **`npm install --legacy-peer-deps`** — obbligatorio per compatibilità peer deps
- **i18n obbligatoria** — ogni stringa visibile passa per `next-intl` (`it.json` + `en.json`)

---

## 6. Regola assoluta sui fix — ZERO FIX LASCIATI INDIETRO

> Questa è una regola non derogabile stabilita da Giampiero.

**Ogni volta che vengono identificati dei problemi — da audit, da round table, da simulazione utenti, da qualsiasi fonte — TUTTI i fix vanno risolti in sequenza, uno dopo l'altro, senza saltarne nessuno e senza passare ad altro finché la lista non è vuota.**

- Non si chiude una sessione lasciando fix aperti
- Non si inizia uno sprint nuovo se ci sono fix critici del precedente ancora aperti
- L'ordine è: critici → alti → medi → bassi
- Ogni fix va aggiunto come task, marcato `in_progress` quando inizia, `completed` solo quando verificato
- Dopo l'ultimo fix: `tsc --noEmit` + aggiornamento `STATO_PROGETTO.md`

Se una sessione finisce prima che tutti i fix siano completati, i task rimangono aperti e la sessione successiva li attacca PER PRIMA COSA, prima di qualsiasi nuova feature.

---

## 7. Flusso di lavoro sessione

All'inizio di ogni sessione con lavoro significativo:

1. Leggere questo file
2. Controllare se ci sono task aperti da sessioni precedenti — risolverli PRIMA di tutto
3. Leggere i file rilevanti al task (`Read` tool)
4. Fare il round table se la decisione lo richiede (brainstorm prima del codice)
5. Creare un TodoList con `TaskCreate`
6. Implementare con verifiche intermedie (`tsc --noEmit`)
7. Verificare il risultato finale prima di dichiarare done
8. Aggiornare `STATO_PROGETTO.md` con il log della sessione

---

## 8. Note del proprietario

- Il proprietario è **Giampiero** (`grecolatinovivo@gmail.com`)
- Lingua principale del codice e dei commenti: **italiano** (per i commenti nei file)
- La barra di stato iOS va sempre a sfondo trasparente su dark (`black-translucent`)
- Nessun dispositivo Android fisico disponibile per test — il testing Android avviene
  tramite upload su Play Store (internal track)
- Testing iOS tramite PWA su iPhone (iOS 26)
