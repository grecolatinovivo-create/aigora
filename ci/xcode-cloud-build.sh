#!/bin/sh
# ──────────────────────────────────────────────────────────────────────────────
# Xcode Cloud — Script post-clone
#
# Questo script viene eseguito da Xcode Cloud DOPO il clone del repo e
# PRIMA della build Xcode. Prepara l'ambiente Node/npm necessario a Capacitor.
#
# Come configurarlo:
#   1. Vai su appstoreconnect.apple.com → Xcode Cloud → il tuo workflow
#   2. Nella sezione "Environment" → "Custom Script"
#   3. Seleziona "Post-clone" e incolla il path: ci/xcode-cloud-build.sh
# ──────────────────────────────────────────────────────────────────────────────

set -e  # Interrompi al primo errore

echo "🔧 AiGORÀ — Xcode Cloud pre-build"
echo "Node: $(node --version 2>/dev/null || echo 'non trovato')"

# ── Installa Node.js se non presente (Xcode Cloud usa macOS Ventura+) ──────────
if ! command -v node &> /dev/null; then
  echo "📦 Installo Node.js via Homebrew..."
  brew install node@20
  export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
fi

# ── Installa dipendenze npm ────────────────────────────────────────────────────
echo "📦 npm ci..."
npm ci

# ── Sincronizza plugins Capacitor nel progetto iOS ─────────────────────────────
echo "⚡ cap sync ios..."
npx cap sync ios

# ── CocoaPods ─────────────────────────────────────────────────────────────────
echo "🍫 pod install..."
cd ios/App
pod install --repo-update
cd ../..

echo "✅ Pre-build completato. Xcode Cloud può procedere con la build."
