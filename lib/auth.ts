import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { NextAuthOptions, getServerSession } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from './prisma'

export const PLANS = {
  starter: { label: 'Starter', price: 6.99, priceId: process.env.STRIPE_PRICE_STARTER!, ais: ['claude', 'gemini'], color: '#1A73E8' },
  pro:     { label: 'Pro',     price: 8.99, priceId: process.env.STRIPE_PRICE_PRO!,     ais: ['claude', 'gemini', 'perplexity'], color: '#7C3AED' },
  max:     { label: 'Max',     price: 9.99, priceId: process.env.STRIPE_PRICE_MAX!,     ais: ['claude', 'gemini', 'perplexity', 'gpt'], color: '#FF6B2B' },
} as const

export type PlanKey = keyof typeof PLANS

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  pages: { signIn: '/login', error: '/login' },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id
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
        await prisma.user.update({ where: { id: user.id }, data: { plan: 'admin', subStatus: 'active' } })
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export const auth = () => getServerSession(authOptions)
