import { NextAuthOptions, getServerSession } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export const PLANS = {
  starter: { label: 'Starter', price: 6.99, priceId: process.env.STRIPE_PRICE_STARTER ?? '', ais: ['claude', 'gemini'], color: '#1A73E8' },
  pro:     { label: 'Pro',     price: 8.99, priceId: process.env.STRIPE_PRICE_PRO ?? '',     ais: ['claude', 'gemini', 'perplexity'], color: '#7C3AED' },
  max:     { label: 'Max',     price: 9.99, priceId: process.env.STRIPE_PRICE_MAX ?? '',     ais: ['claude', 'gemini', 'perplexity', 'gpt'], color: '#FF6B2B' },
} as const

export type PlanKey = keyof typeof PLANS

export const authOptions: NextAuthOptions = {
  get adapter() {
    const { PrismaAdapter } = require('@next-auth/prisma-adapter')
    const { prisma } = require('./prisma')
    return PrismaAdapter(prisma)
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? 'placeholder',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? 'placeholder',
    }),
  ],
  pages: { signIn: '/login', error: '/login' },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        const { prisma } = require('./prisma')
        ;(session.user as any).id = user.id
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
        ;(session.user as any).plan = dbUser?.plan ?? 'none'
        if (dbUser?.email === process.env.ADMIN_EMAIL) {
          ;(session.user as any).plan = 'admin'
        }
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      if (user.email === process.env.ADMIN_EMAIL) {
        const { prisma } = require('./prisma')
        await prisma.user.update({ where: { id: user.id }, data: { plan: 'admin', subStatus: 'active' } })
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET ?? 'fallback-secret',
}

export const auth = () => getServerSession(authOptions)
