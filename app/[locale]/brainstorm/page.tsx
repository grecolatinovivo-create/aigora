import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { normalizePlan } from '@/lib/plans'
import BrainstormerClient from './BrainstormerClient'

export default async function BrainstormPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/login')

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  const plan = user?.email === process.env.ADMIN_EMAIL ? 'admin' : normalizePlan(user?.plan)

  // Solo utenti con piano a pagamento possono usare il Brainstormer
  if (!['pro', 'premium', 'admin', 'freemium'].includes(plan)) redirect('/pricing')

  return (
    <BrainstormerClient
      userEmail={session.user.email}
      userName={user?.name ?? session.user.name ?? ''}
      userPlan={plan}
    />
  )
}

