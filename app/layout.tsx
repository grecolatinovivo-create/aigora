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
  colorScheme: 'dark light',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
