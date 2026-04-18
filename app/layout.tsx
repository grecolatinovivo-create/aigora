import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from './components/Providers'

export const metadata: Metadata = {
  title: 'AiGORÀ — Il dibattito delle AI',
  description: 'Poni una domanda e assisti al dibattito tra le 4 principali intelligenze artificiali.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0d0d14',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <div id="rotate-overlay">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2"/>
            <path d="M9 21h6"/>
          </svg>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '0 32px' }}>
            Ruota il dispositivo in verticale
          </p>
        </div>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
