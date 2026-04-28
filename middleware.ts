import createMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

// Wrappa next-intl aggiungendo Cache-Control: no-store su ogni risposta.
// Questo impedisce a Safari (e a Starlink CGNAT) di mettere in cache i
// redirect del middleware, che causerebbe loop di navigazione su connessioni
// che cambiano IP frequentemente.
export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request)
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  return response
}

export const config = {
  // Escludi API routes, _next, file statici
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
