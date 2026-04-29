# AiGORÀ — Guida deploy app mobile (iOS + Android)

> Tutto gira in cloud. Nessun emulatore locale. Nessun Android Studio o Xcode installato.

---

## Architettura

L'app è un **guscio nativo Capacitor** che carica `https://app.aigora.eu` in una WebView.
Aggiornare il sito = aggiornare l'app **senza passare per la review store**.

```
GitHub repo
├── android/        → progetto Android (generato da Capacitor)
├── ios/            → progetto iOS (generato da Capacitor)
├── capacitor.config.ts  → punta a app.aigora.eu
└── .github/workflows/
    ├── setup-native.yml    → genera android/ e ios/ (una volta sola)
    └── build-android.yml   → builda l'AAB per Google Play
```

---

## FASE 1 — Setup iniziale (una sola volta)

### 1.1 — Commita le modifiche

Assicurati che questi file siano committati e pushati su `main`:

```
capacitor.config.ts
package.json
app/components/native/CapacitorProvider.tsx
app/components/native/BottomTabBar.tsx
app/[locale]/layout.tsx
.github/workflows/setup-native.yml
.github/workflows/build-android.yml
ci/xcode-cloud-build.sh
```

### 1.2 — Genera i progetti nativi (workflow manuale)

1. Vai su **GitHub.com → il tuo repo → Actions**
2. Nella colonna sinistra clicca **"Setup Native (esegui una volta)"**
3. Clicca **"Run workflow"** → **"Run workflow"** (sul branch `main`)
4. Attendi ~5 minuti. Il workflow creerà `android/` e `ios/` e li committa automaticamente.

> Questo workflow va eseguito solo quando aggiungi nuovi plugin Capacitor.

---

## FASE 2 — Android (Google Play Store)

### 2.1 — Genera il keystore di firma

Sul tuo Mac, apri il terminale ed esegui:

```bash
keytool -genkey -v \
  -keystore aigora.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias aigora \
  -dname "CN=AiGORÀ, OU=Mobile, O=Aigora EU, L=Italia, S=IT, C=IT"
```

Ti chiede una password. **Salvala bene** — serve sempre.

### 2.2 — Codifica il keystore in base64

```bash
base64 -i aigora.jks | pbcopy   # copia negli appunti
```

### 2.3 — Aggiungi i Secrets su GitHub

Vai su **GitHub → il tuo repo → Settings → Secrets and variables → Actions** e aggiungi:

| Secret name          | Valore                                 |
|----------------------|----------------------------------------|
| `KEYSTORE_BASE64`    | (incolla dal punto 2.2)                |
| `KEY_STORE_PASSWORD` | la password scelta al punto 2.1        |
| `KEY_ALIAS`          | `aigora`                               |
| `KEY_PASSWORD`       | la password scelta al punto 2.1        |

### 2.4 — Prima build Android

1. Vai su **GitHub → Actions → "Build Android"**
2. Clicca **"Run workflow"**
3. Dopo ~10 minuti, trovi il file `aigora-release-X.aab` nella sezione **Artifacts**
4. Scaricalo — è pronto per essere caricato su Google Play Console

### 2.5 — Google Play Console

1. Vai su **play.google.com/console**
2. Crea una nuova app → Package name: `eu.aigora.app`
3. **Dashboard → Production** (o Internal testing per il primo upload)
4. Carica l'AAB
5. Compila i metadati richiesti (descrizione, screenshot, icona 512×512)
6. Pubblica

---

## FASE 3 — iOS (App Store)

### 3.1 — Prerequisiti

- Account Apple Developer attivo (99€/anno): [developer.apple.com](https://developer.apple.com)
- L'`ios/` folder deve essere committata (viene fatto dal workflow "Setup Native")

### 3.2 — Attiva Xcode Cloud da App Store Connect

1. Vai su **[appstoreconnect.apple.com](https://appstoreconnect.apple.com)**
2. Menu in alto → **Xcode Cloud**
3. Clicca **"Get Started"**
4. Seleziona il tuo account GitHub quando richiesto e autorizza l'accesso al repo AiGORÀ
5. Seleziona il progetto Xcode: `ios/App/App.xcodeproj`

### 3.3 — Configura il workflow Xcode Cloud

Nella configurazione del workflow:

- **Branch:** `main`
- **Start Condition:** "Changes to Branch" → `main`
- **Actions:** Build → Archive → TestFlight (o App Store)
- **Environment → Custom Script (Post-clone):** inserisci il path `ci/xcode-cloud-build.sh`

### 3.4 — Certificati e provisioning

Xcode Cloud gestisce automaticamente i certificati di firma se autorizzi l'integrazione con il tuo team Apple Developer. Nella sezione **"Signing & Capabilities"** del workflow Xcode Cloud, seleziona:

- **Automatically manage signing**
- Team: il tuo team Apple Developer

### 3.5 — Prima build iOS

1. Dal workflow Xcode Cloud, clicca **"Start Build"**
2. Attendi ~15-20 minuti
3. Il build appare in **TestFlight** → puoi installarlo su iPhone reale via app TestFlight

### 3.6 — Pubblica su App Store

1. In **App Store Connect → la tua app → App Store → + Version**
2. Seleziona il build da TestFlight
3. Compila i metadati (descrizione, screenshot iPhone/iPad, icona 1024×1024)
4. Invia per review → Apple risponde in 24-48 ore

---

## Test su dispositivo reale (senza store)

### Android — Test diretto

Nella build di GitHub Actions, il file `.aab` è per il Play Store.
Per testare su telefono fisico, modifica temporaneamente il workflow per produrre un `.apk`:

```yaml
# In build-android.yml, sostituisci bundleRelease con assembleDebug:
./gradlew assembleDebug
# Artifact path: android/app/build/outputs/apk/debug/app-debug.apk
```

Poi trasferisci l'APK sul telefono via email o USB e installalo (richiede "Sorgenti sconosciute" abilitato).

### iOS — TestFlight

Una volta configurato Xcode Cloud, ogni build va automaticamente su TestFlight.
Installa l'app **TestFlight** dall'App Store e usa l'email del tuo Apple Developer account per accedere al build.

---

## Aggiornare l'app

Poiché il contenuto è servito da `https://app.aigora.eu`:

- **Aggiornamenti del sito** → visibili nell'app immediatamente (nessuna nuova release)
- **Nuovi plugin Capacitor nativi** → ri-esegui "Setup Native" + nuova build
- **Cambiamenti di configurazione** (icone, splash, permessi) → nuova build store

---

## Icone e Splash Screen

Le icone vanno messe in:
- `resources/icon.png` — 1024×1024 px, sfondo `#07070f`, logo AiGORÀ centrato
- `resources/splash.png` — 2732×2732 px, sfondo `#07070f`, logo centrato

Poi esegui (richiede il workflow "Setup Native"):
```bash
npx capacitor-assets generate
```

---

## Troubleshooting

**Build Android fallisce con "Gradle error":**
- Controlla che i Secrets GitHub siano impostati correttamente
- Verifica che il keystore sia un file `.jks` valido

**Xcode Cloud non trova il progetto:**
- Assicurati che `ios/App/App.xcodeproj` esista nel repo (viene creato dal workflow "Setup Native")

**L'app mostra pagina bianca:**
- Verifica che `https://app.aigora.eu` sia raggiungibile
- Controlla `capacitor.config.ts` → `server.url`

**Apple rifiuta l'app (guideline 4.2):**
- L'app deve offrire un valore aggiunto rispetto al sito
- Assicurati che le push notification siano configurate e funzionanti
- Aggiungi nel messaggio di review: "L'app offre notifiche push native per debate updates e accesso offline-aware"
