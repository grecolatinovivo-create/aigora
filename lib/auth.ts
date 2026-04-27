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
        if (user.blocked) return null  // utente bloccato

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 24 * 60 * 60 }, // token scade ogni 24h
  pages: { signIn: '/login', error: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        const { prisma } = require('./prisma')
        ;(session.user as any).id = token.id as string
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } })

        // Admin override
        if (dbUser?.email === process.env.ADMIN_EMAIL) {
          ;(session.user as any).plan = 'admin'
        } else {
          // Normalizza valori legacy (starter→free, max→premium, ecc.)
          ;(session.user as any).plan = normalizePlan(dbUser?.plan)
        }
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export const auth = () => getServerSession(authOptions)
