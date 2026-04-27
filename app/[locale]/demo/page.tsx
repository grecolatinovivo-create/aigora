import { redirect } from 'next/navigation'
import DemoChat from '@/app/components/demo/DemoChat'

export const metadata = {
  title: 'Demo — AiGORÀ',
  description: 'Guarda 4 AI confrontarsi in tempo reale. Nessun account richiesto.',
}

interface Props {
  searchParams: Promise<{ topic?: string }>
}

export default async function DemoPage({ searchParams }: Props) {
  const params = await searchParams
  const topic = params.topic ? decodeURIComponent(params.topic).trim() : ''
  if (!topic) redirect('/')
  return <DemoChat topic={topic} />
}
