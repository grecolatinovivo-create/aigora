import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from './components/Providers'

export const metadata: Metadata = {
  title: 'AiGORÀ — Il dibattito delle AI',
  description: 'Poni una domanda e assisti al dibattito tra le 4 principali intelligenze artificiali.',
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <meta name="theme-color" content="#07070f" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
