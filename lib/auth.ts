import { NextAuthOptions, getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const PLANS = {
  starter: { label: 'Starter', price: 6.99, priceId: process.env.STRIPE_PRICE_STARTER ?? '', ais: ['claude', 'gemini'], color: '#1A73E8' },
  pro:     { label: 'Pro',     price: 8.99, priceId: process.env.STRIPE_PRICE_PRO ?? '',     ais: ['claude', 'gemini', 'perplexity'], color: '#7C3AED' },
  max:     { label: 'Max',     price: 9.99, priceId: process.env.STRIPE_PRICE_MAX ?? '',     ais: ['claude', 'gemini', 'perplexity', 'gpt'], color: '#FF6B2B' },
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
        ;(session.user as any).plan = dbUser?.plan ?? 'none'
        if (dbUser?.email === process.env.ADMIN_EMAIL) {
          ;(session.user as any).plan = 'admin'
        }
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export const auth = () => getServerSession(authOptions)
