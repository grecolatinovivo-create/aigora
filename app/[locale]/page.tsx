import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { normalizePlan } from '@/lib/plans'
import AigoraChat from '../components/AigoraChat'
import LandingPage from '../components/landing/LandingPage'

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session) return <LandingPage />

  const plan = normalizePlan((session.user as any)?.plan)

  const ALL_AIS = ['claude', 'gemini', 'perplexity', 'gpt']
  const allowedAis = ALL_AIS // tutti i tier vedono le stesse AI nel dibattito

  return (
    <AigoraChat
      allowedAis={allowedAis}
      userPlan={plan}
      userName={session.user?.name ?? ''}
      userEmail={session.user?.email ?? ''}
    />
  )
}
