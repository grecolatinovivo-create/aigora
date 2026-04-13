import type { Metadata } from 'next'
import './globals.css'
import Providers from './components/Providers'

export const metadata: Metadata = {
  title: 'AiGORÀ — Il dibattito delle AI',
  description: 'Poni una domanda e assisti al dibattito tra le 4 principali intelligenze artificiali.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
