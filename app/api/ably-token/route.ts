import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Ably from 'ably'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  const client = new Ably.Rest(process.env.ABLY_API_KEY!)
  const tokenRequest = await client.auth.createTokenRequest({
    clientId: session.user.email,
  })

  return NextResponse.json(tokenRequest)
}
