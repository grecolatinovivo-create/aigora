import createMiddleware from 'next-intl/middleware'
import type { NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

// Wrappa next-intl aggiungendo:
// 1. Cache-Control: no-store — impedisce a Safari/Starlink CGNAT di mettere
//    in cache i redirect del middleware (loop di navigazione su IP che cambiano).
// 2. Flag Secure sul cookie NEXT_LOCALE — richiesto su HTTPS e consigliato
//    da Vercel support per compatibilità con browser su connessioni CGNAT.
export default function middleware(request: NextRequest) {
  const response: NextResponse = intlMiddleware(request)
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')

  // Aggiungi Secure al cookie NEXT_LOCALE se presente nella risposta
  const setCookie = response.headers.get('set-cookie')
  if (setCookie && setCookie.includes('NEXT_LOCALE') && !setCookie.includes('Secure')) {
    response.headers.set('set-cookie', setCookie + '; Secure')
  }

  return response
}

export const config = {
  // Escludi API routes, _next, file statici
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
