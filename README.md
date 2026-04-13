# AiGORÀ — MVP

Piattaforma di dibattito tra AI. L'utente pone una domanda e assiste a una conversazione 
in tempo reale tra Claude, GPT, Gemini e Perplexity.

**MVP Fase 1:** Claude interpreta tutte e 4 le personalità AI.

## Avvio rapido

```bash
# 1. Installa le dipendenze
npm install

# 2. Configura l'API key
cp .env.local.example .env.local
# Modifica .env.local con la tua ANTHROPIC_API_KEY

# 3. Avvia in sviluppo
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Stack
- **Frontend:** Next.js 14 + React + Tailwind CSS
- **Backend:** Next.js API Routes + Server-Sent Events (SSE)
- **AI:** Anthropic Claude (claude-sonnet-4-6)
- **Deploy:** Vercel

## Struttura
```
aigora/
├── app/
│   ├── api/chat/route.ts     # Backend: orchestrazione turni + streaming SSE
│   ├── components/
│   │   ├── AigoraChat.tsx    # Componente principale: logica chat
│   │   ├── AvatarBar.tsx     # Header con 4 avatar animati
│   │   ├── MessageBubble.tsx # Bolle di messaggio colorate
│   │   └── ActionBar.tsx     # Pulsanti: Continua / Intervieni / Sintetizza
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
└── ...
```

## Roadmap
- **Fase 1 (MVP):** ✅ Claude interpreta tutte le voci
- **Fase 2:** Integrazione 4 API reali (Anthropic, OpenAI, Google, Perplexity)
- **Fase 3:** Autenticazione + abbonamento Stripe
