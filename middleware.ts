import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// Il middleware legge automaticamente l'header Accept-Language del browser
// e serve la lingua corrispondente senza che l'utente faccia nulla.
// Italiano = default, nessun prefisso URL (/pricing, /login, ...)
// Inglese  = prefisso /en (/en/pricing, /en/login, ...)
export default createMiddleware(routing)

export const config = {
  // Escludi API routes, _next, file statici
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
