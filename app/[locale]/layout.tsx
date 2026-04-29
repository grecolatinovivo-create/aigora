import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { getMessages } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import type { Metadata, Viewport } from 'next'
import '../globals.css'
import Providers from '../components/Providers'
import { Analytics } from '@vercel/analytics/next'
import CapacitorProvider from '../components/native/CapacitorProvider'
import BottomTabBar from '../components/native/BottomTabBar'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0d0d14',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const messages = await getMessages()
  const m = (messages as any).meta
  return {
    title: m?.title ?? 'AiGORÀ',
    description: m?.description ?? '',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: m?.title ?? 'AiGORÀ',
    },
  }
}

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body>
        <div id="rotate-overlay">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <path d="M9 21h6" />
          </svg>
          <p
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              textAlign: 'center',
              padding: '0 32px',
            }}
          >
            {locale === 'it' ? 'Ruota il dispositivo in verticale' : 'Rotate your device to portrait'}
          </p>
        </div>
        <NextIntlClientProvider messages={messages}>
          <CapacitorProvider>
            <Providers>{children}</Providers>
            <BottomTabBar />
          </CapacitorProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  )
}
