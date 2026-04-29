// Shim temporaneo per i moduli Capacitor.
// Questi type stub vengono usati SOLO finché non si esegue `npm install`
// che installa i pacchetti @capacitor/* con i loro tipi reali.
// Una volta installati, i tipi reali hanno la precedenza.

declare module '@capacitor/core' {
  export const Capacitor: {
    isNativePlatform: () => boolean
    getPlatform: () => 'ios' | 'android' | 'web'
  }
}
declare module '@capacitor/app' {
  export const App: {
    addListener: (event: string, handler: (data: any) => void) => void
    exitApp: () => void
  }
}
declare module '@capacitor/network' {
  export const Network: {
    getStatus: () => Promise<{ connected: boolean; connectionType: string }>
    addListener: (event: string, handler: (status: { connected: boolean }) => void) => void
  }
}
declare module '@capacitor/status-bar' {
  export const StatusBar: {
    setStyle: (opts: { style: any }) => Promise<void>
    setBackgroundColor: (opts: { color: string }) => Promise<void>
  }
  export const Style: {
    Dark: string
    Light: string
    Default: string
  }
}
declare module '@capacitor/splash-screen' {
  export const SplashScreen: {
    hide: (opts?: { fadeOutDuration?: number }) => Promise<void>
  }
}
declare module '@capacitor/push-notifications' {
  export const PushNotifications: {
    requestPermissions: () => Promise<{ receive: string }>
    register: () => Promise<void>
    addListener: (event: string, handler: (data: any) => void) => void
  }
}
declare module '@capacitor/cli' {
  export interface CapacitorConfig {
    appId: string
    appName: string
    webDir?: string
    server?: {
      url?: string
      cleartext?: boolean
      androidScheme?: string
    }
    plugins?: Record<string, any>
    ios?: Record<string, any>
    android?: Record<string, any>
  }
}
