'use client'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { useTransition } from 'react'

export default function LocaleSwitcher({ style }: { style?: React.CSSProperties }) {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function switchLocale(next: 'it' | 'en') {
    if (next === locale) return
    startTransition(() => {
      // Rimuovi il prefisso locale corrente e aggiungi il nuovo
      let newPath = pathname
      // Rimuovi prefisso /en se presente
      if (newPath.startsWith('/en')) {
        newPath = newPath.slice(3) || '/'
      }
      // Se destinazione è en, aggiungi prefisso
      if (next === 'en') {
        newPath = '/en' + (newPath === '/' ? '' : newPath)
      }
      router.push(newPath)
    })
  }

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.1)', ...style }}
    >
      {(['it', 'en'] as const).map(lang => (
        <button
          key={lang}
          onClick={() => switchLocale(lang)}
          disabled={isPending}
          className="px-2 py-1 text-[11px] font-bold uppercase transition-all disabled:opacity-50"
          style={{
            background: locale === lang ? 'rgba(167,139,250,0.25)' : 'transparent',
            color: locale === lang ? '#A78BFA' : 'rgba(255,255,255,0.35)',
            letterSpacing: '0.05em',
          }}
        >
          {lang}
        </button>
      ))}
    </div>
  )
}
