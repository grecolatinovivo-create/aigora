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

  return (
    <BrainstormerClient
      userEmail={session.user.email}
      userName={user?.name ?? session.user.name ?? ''}
      userPlan={plan}
    />
  )
}

