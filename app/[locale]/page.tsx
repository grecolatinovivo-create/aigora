import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { normalizePlan } from '@/lib/plans'
import AigoraChat from '../components/AigoraChat'
import LandingPage from '../components/landing/LandingPage'

export default async function Home({
  searchParams,
}: {
  searchParams?: { resume?: string; start?: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session) return <LandingPage />

  const plan = normalizePlan((session.user as any)?.plan)
  const ALL_AIS = ['claude', 'gemini', 'perplexity', 'gpt']

  return (
    <AigoraChat
      allowedAis={ALL_AIS}
      userPlan={plan}
      userName={session.user?.name ?? ''}
      userEmail={session.user?.email ?? ''}
      resumeChatId={searchParams?.resume}
      startMode={searchParams?.start}
    />
  )
}
