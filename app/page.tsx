import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AigoraChat from './components/AigoraChat'

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const plan = (session.user as any)?.plan ?? 'free'

  const AI_BY_PLAN: Record<string, string[]> = {
    free:    ['claude', 'gemini', 'perplexity', 'gpt'],
    starter: ['claude', 'gemini'],
    pro:     ['claude', 'gemini', 'perplexity'],
    max:     ['claude', 'gemini', 'perplexity', 'gpt'],
    admin:   ['claude', 'gemini', 'perplexity', 'gpt'],
  }
  const allowedAis = AI_BY_PLAN[plan] ?? AI_BY_PLAN['free']

  return <AigoraChat allowedAis={allowedAis} userPlan={plan} userName={session.user?.name ?? ''} userEmail={session.user?.email ?? ''} />
}
