import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function PrivacyPage() {
  const t = useTranslations('legal')

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-16" style={{ background: '#07070f' }}>
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <Link href="/" className="font-black text-2xl tracking-tight mb-10 inline-block hover:opacity-80 transition-opacity">
          <span className="text-white">Ai</span>
          <span style={{ color: '#A78BFA' }}>GORÀ</span>
        </Link>

        <div
          className="rounded-3xl p-8 mt-8"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <h1 className="text-2xl font-black text-white mb-2">{t('privacy.title')}</h1>
          <p className="text-white/30 text-xs mb-8">
            {t('privacy.lastUpdated')} 2025
          </p>

          <p className="text-white/60 leading-relaxed mb-6">
            {t('privacy.placeholder')}
          </p>

          <p className="text-white/40 text-sm">
            {t('privacy.contact')}{' '}
            <a
              href="mailto:privacy@aigora.app"
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              privacy@aigora.app
            </a>
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-white/30 text-sm hover:text-white/60 transition-colors">
            {t('backHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}
