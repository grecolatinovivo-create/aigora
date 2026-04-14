import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const plan = (session.user as any)?.plan
  if (plan !== 'admin') redirect('/')

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      chats: {
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, updatedAt: true, messages: true },
      },
    },
  })

  return (
    <div className="desktop-bg min-h-screen px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-1">
            <span style={{ color: '#A78BFA' }}>A</span>
            <span className="text-white">i</span>
            <span style={{ color: '#A78BFA' }}>GORÀ</span>
            <span className="text-white/40 text-xl font-normal ml-3">Admin</span>
          </h1>
          <p className="text-white/40 text-sm">{users.length} utenti registrati</p>
        </div>

        <div className="space-y-4">
          {users.map(user => {
            const totalMessages = user.chats.reduce((acc, chat) => {
              const msgs = chat.messages as any[]
              return acc + (Array.isArray(msgs) ? msgs.filter((m: any) => m.isUser).length : 0)
            }, 0)

            return (
              <details key={user.id} className="glass rounded-2xl overflow-hidden">
                <summary className="flex items-center gap-4 px-5 py-4 cursor-pointer list-none hover:bg-white/5 transition-colors">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: user.plan === 'admin' ? '#F59E0B' : user.plan === 'max' ? '#FF6B2B' : user.plan === 'pro' ? '#7C3AED' : '#1A73E8' }}>
                    {(user.name || user.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">{user.email}</div>
                    <div className="text-white/40 text-xs mt-0.5">
                      {user.name && <span className="mr-3">{user.name}</span>}
                      Iscritto {new Date(user.createdAt).toLocaleDateString('it-IT')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.25)' }}>
                      {(user.plan || 'none').toUpperCase()}
                    </span>
                    <span className="text-white/30 text-xs">{user.chats.length} chat · {totalMessages} domande</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
                  </div>
                </summary>

                {/* Chat dell'utente */}
                <div className="border-t border-white/8">
                  {user.chats.length === 0 ? (
                    <p className="text-white/25 text-sm px-5 py-4">Nessuna chat salvata.</p>
                  ) : (
                    user.chats.map(chat => {
                      const msgs = chat.messages as any[]
                      const userMsgs = Array.isArray(msgs) ? msgs.filter((m: any) => m.isUser) : []
                      return (
                        <details key={chat.id} className="border-b border-white/5 last:border-0">
                          <summary className="flex items-center gap-3 px-5 py-3 cursor-pointer list-none hover:bg-white/5 transition-colors">
                            <div className="w-2 h-2 rounded-full bg-purple-400/50 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-white/70 text-[13px] truncate">{chat.title}</div>
                              <div className="text-white/30 text-[11px]">
                                {new Date(chat.updatedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                {' · '}{userMsgs.length} messaggi utente
                              </div>
                            </div>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
                          </summary>
                          {/* Messaggi dell'utente */}
                          <div className="px-5 pb-4 pt-2 space-y-2 bg-black/20">
                            {userMsgs.map((msg: any, i: number) => (
                              <div key={i} className="text-[12px] text-white/60 bg-white/5 rounded-xl px-3 py-2">
                                {msg.content}
                              </div>
                            ))}
                          </div>
                        </details>
                      )
                    })
                  )}
                </div>
              </details>
            )
          })}
        </div>
      </div>
    </div>
  )
}
