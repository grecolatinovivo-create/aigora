'use client'
import { createContext, useContext, useEffect, useState } from 'react'

// ─── Context ──────────────────────────────────────────────────────────────────
interface CapCtxType {
  isNative: boolean
  isOffline: boolean
}
const CapCtx = createContext<CapCtxType>({ isNative: false, isOffline: false })
export const useIsNative = () => useContext(CapCtx).isNative
export const useIsOffline = () => useContext(CapCtx).isOffline

// ─── Provider ─────────────────────────────────────────────────────────────────
export default function CapacitorProvider({ children }: { children: React.ReactNode }) {
  const [isNative, setIsNative] = useState(false)
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core')
        if (!Capacitor.isNativePlatform()) return

        // Marca l'app come "native" — usato dal CSS e dalla BottomTabBar
        setIsNative(true)
        document.documentElement.classList.add('is-native')

        // ── Status Bar ────────────────────────────────────────────
        try {
          const { StatusBar, Style } = await import('@capacitor/status-bar')
          await StatusBar.setStyle({ style: Style.Dark })
          if (Capacitor.getPlatform() === 'android') {
            await StatusBar.setBackgroundColor({ color: '#07070f' })
          }
        } catch { /* plugin non disponibile in dev */ }

        // ── Splash Screen ──────────────────────────────────────────
        try {
          const { SplashScreen } = await import('@capacitor/splash-screen')
          await SplashScreen.hide({ fadeOutDuration: 350 })
        } catch { /* plugin non disponibile in dev */ }

        // ── Network — rileva connessione offline ───────────────────
        try {
          const { Network } = await import('@capacitor/network')
          const status = await Network.getStatus()
          setIsOffline(!status.connected)
          Network.addListener('networkStatusChange', (s) => {
            setIsOffline(!s.connected)
          })
        } catch { /* plugin non disponibile in dev */ }

        // ── Android back button ────────────────────────────────────
        // Gestione manuale: back naviga nella history web;
        // se non c'è history, chiude l'app (non la lascia su uno schermo vuoto).
        try {
          const { App } = await import('@capacitor/app')
          App.addListener('backButton', ({ canGoBack }) => {
            if (canGoBack) {
              window.history.back()
            } else {
              App.exitApp()
            }
          })
        } catch { /* plugin non disponibile in dev */ }

      } catch {
        // Non siamo in un contesto nativo — web normale
      }
    }

    init()
  }, [])

  return (
    <CapCtx.Provider value={{ isNative, isOffline }}>
      {children}
      {isNative && isOffline && <OfflineBanner />}
    </CapCtx.Provider>
  )
}

// ─── Banner offline ────────────────────────────────────────────────────────────
function OfflineBanner() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99998,
        paddingTop: 'calc(env(safe-area-inset-top) + 10px)',
        paddingBottom: '10px',
        paddingLeft: '16px',
        paddingRight: '16px',
        backgroundColor: 'rgba(15, 5, 5, 0.97)',
        borderBottom: '1px solid rgba(239,68,68,0.25)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        color: '#f87171',
        fontSize: '13px',
        fontWeight: 600,
        letterSpacing: '0.01em',
      }}
    >
      {/* Icona wifi-off */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
      Nessuna connessione internet
    </div>
  )
}
