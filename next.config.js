const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Forza la chiusura della connessione dopo ogni risposta.
          // Risolve il problema di Starlink CGNAT che rompe silenziosamente
          // le connessioni HTTP/2 persistenti di Vercel, causando il blocco
          // del sito per gli utenti Starlink.
          { key: 'Connection', value: 'keep-alive' },
          { key: 'Keep-Alive', value: 'timeout=5, max=100' },
        ],
      },
    ]
  },
}

module.exports = withNextIntl(nextConfig)
