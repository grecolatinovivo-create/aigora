import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['it', 'en'],
  defaultLocale: 'it',
  // Il locale non appare mai nell'URL.
  // Il middleware lo rileva da Accept-Language del browser e lo salva in cookie.
  // /pricing, /login, /brainstorm ecc. funzionano uguali per tutti.
  localePrefix: 'never',
})
