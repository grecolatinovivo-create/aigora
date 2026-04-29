import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'eu.aigora.app',
  appName: 'AiGORÀ',

  // Il contenuto viene servito DIRETTAMENTE dal sito live.
  // Nessuna build statica necessaria — aggiornare il sito = aggiornare l'app.
  webDir: 'public',
  server: {
    url: 'https://app.aigora.eu',
    cleartext: false,
    androidScheme: 'https',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#07070f',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#07070f',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },

  ios: {
    contentInset: 'always',
    scrollEnabled: false,
    backgroundColor: '#07070f',
    // Permette la navigazione solo verso il dominio dell'app
    allowsLinkPreview: false,
  },

  android: {
    backgroundColor: '#07070f',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // true solo in sviluppo
  },
}

export default config
