import { NextAuthOptions, getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { normalizePlan } from './plans'

// Piani Stripe (usati nel checkout) — i priceId vengono da Vercel env vars
export const PLANS = {
  pro: {
    label: 'Pro',
    price: 9.99,
    priceId: process.env.STRIPE_PRICE_PRO ?? '',
    color: '#A78BFA',
  },
  premium: {
    label: 'Premium',
    price: 19.99,
    priceId: process.env.STRIPE_PRICE_MAX ?? '',
    color: '#FF6B2B',
  },
} as const

export type PlanKey = keyof typeof PLANS

// Intervallo di refresh del piano nel JWT (5 minuti)
const PLAN_REFRESH_INTERVAL = 5 * 60

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const { prisma } = require('./prisma')
        const bcrypt = require('bcryptjs')

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password) return null
        if (user.blocked) return null

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],

  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 giorni

  pages: { signIn: '/login', error: '/login' },

  callbacks: {
    /**
     * jwt — viene chiamato solo al login e quando il token deve essere
     * aggiornato. Qui risolviamo il piano dal DB e lo salviamo nel token.
     * Il DB viene interrogato solo al login + ogni PLAN_REFRESH_INTERVAL secondi,
     * non ad ogni singolo caricamento di pagina.
     */
    async jwt({ token, user }) {
      const now = Math.floor(Date.now() / 1000)

      // Primo login: salva l'id e forza il refresh del piano
      if (user) {
        token.id = user.id
        token.planUpdatedAt = 0
      }

      // Refresh piano: solo al login o dopo 5 minuti dall'ultimo aggiornamento
      const lastUpdate = (token.planUpdatedAt as number) ?? 0
      if (now - lastUpdate > PLAN_REFRESH_INTERVAL) {
        try {
          const { prisma } = require('./prisma')
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { email: true, plan: true, blocked: true, beta: true },
          })
          if (dbUser) {
            token.plan = dbUser.email === process.env.ADMIN_EMAIL
              ? 'admin'
              : normalizePlan(dbUser.plan)
            token.blocked = dbUser.blocked
            token.beta = dbUser.beta
            token.planUpdatedAt = now
          }
        } catch {
          // Se il DB non risponde, mantieni il piano già nel token
        }
      }

      return token
    },

    /**
     * session — legge solo dal token JWT, zero query al DB.
     * Questo elimina il bottleneck che causava problemi su connessioni lente.
     */
    async session({ session, token }) {
      if (session.user && token) {
        ;(session.user as any).id = token.id
        ;(session.user as any).plan = token.plan ?? 'free'
        ;(session.user as any).beta = token.beta ?? false
      }
      return session
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
}

export const auth = () => getServerSession(authOptions)
