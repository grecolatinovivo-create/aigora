import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

const PLAN_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  admin:      { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.35)'  },
  max:        { color: '#FF6B2B', bg: 'rgba(255,107,43,0.15)',  border: 'rgba(255,107,43,0.35)'  },
  pro:        { color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.35)' },
  starter:    { color: '#1A73E8', bg: 'rgba(26,115,232,0.15)',  border: 'rgba(26,115,232,0.35)'  },
  free:       { color: '#10A37F', bg: 'rgba(16,163,127,0.15)',  border: 'rgba(16,163,127,0.35)'  },
  none:       { color: '#6B7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.35)' },
}

const AI_COLOR: Record<string, string> = {
  claude: '#7C3AED',
  gpt: '#10A37F',
  gemini: '#1A73E8',
  perplexity: '#FF6B2B',
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const plan = (session.user as any)?.plan
  if (plan !== 'admin') redirect('/')

  const adminEmail = process.env.ADMIN_EMAIL

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      chats: {
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, createdAt: true, updatedAt: true, messages: true },
      },
    },
  })

  const totalChats = users.reduce((acc, u) => acc + u.chats.length, 0)
  const totalMessages = users.reduce((acc, u) =>
    acc + u.chats.reduce((a, c) => a + (Array.isArray(c.messages) ? (c.messages as any[]).length : 0), 0), 0)

  return (
    <div className="desktop-bg min-h-screen px-6 py-10">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black mb-1">
              <span style={{ color: '#A78BFA' }}>A</span>
              <span className="text-white">i</span>
              <span style={{ color: '#A78BFA' }}>GORÀ</span>
              <span className="text-white/40 text-xl font-normal ml-3">Admin</span>
            </h1>
            <div className="flex gap-4 mt-2 text-sm text-white/40">
              <span>{users.length} utenti</span>
              <span>{totalChats} conversazioni</span>
              <span>{totalMessages} messaggi totali</span>
            </div>
          </div>
          <a href="/" className="text-white/30 text-sm hover:text-white transition-colors">← Torna all'app</a>
        </div>

        {/* Utenti */}
        <div className="space-y-4">
          {users.map(user => {
            const effectivePlan = user.email === adminEmail ? 'admin' : (user.plan || 'none')
            const userMsgCount = user.chats.reduce((acc, chat) => {
              const msgs = chat.messages as any[]
              return acc + (Array.isArray(msgs) ? msgs.filter((m: any) => m.isUser).length : 0)
            }, 0)
            const aiMsgCount = user.chats.reduce((acc, chat) => {
              const msgs = chat.messages as any[]
              return acc + (Array.isArray(msgs) ? msgs.filter((m: any) => !m.isUser).length : 0)
            }, 0)

            return (
              <details key={user.id} className="glass rounded-2xl overflow-hidden">
                <summary className="flex items-center gap-4 px-5 py-4 cursor-pointer list-none hover:bg-white/5 transition-colors">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: PLAN_STYLE[effectivePlan]?.color || '#6B7280' }}>
                    {(user.name || user.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">{user.email}</div>
                    <div className="text-white/40 text-xs mt-0.5">
                      {user.name && <span className="mr-2">{user.name}</span>}
                      Iscritto {new Date(user.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 text-right">
                    <div>
                      {(() => {
                        const s = PLAN_STYLE[effectivePlan] || PLAN_STYLE['none']
                        return (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full inline-block mb-1"
                            style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                            {effectivePlan.toUpperCase()}
                          </span>
                        )
                      })()}
                      <br/>
                      <span className="text-white/30 text-[10px]">
                        {user.chats.length} chat · {userMsgCount} domande · {aiMsgCount} risposte AI
                      </span>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
                  </div>
                </summary>

                {/* Chat dell'utente */}
                <div className="border-t border-white/8">
                  {user.chats.length === 0 ? (
                    <p className="text-white/25 text-sm px-5 py-4">Nessuna conversazione salvata.</p>
                  ) : user.chats.map(chat => {
                    const msgs = chat.messages as any[]
                    const allMsgs = Array.isArray(msgs) ? msgs : []
                    const duration = allMsgs.length > 1
                      ? `${allMsgs.length} messaggi`
                      : '1 messaggio'

                    return (
                      <details key={chat.id} className="border-b border-white/5 last:border-0">
                        <summary className="flex items-center gap-3 px-5 py-3 cursor-pointer list-none hover:bg-white/5 transition-colors">
                          <div className="w-2 h-2 rounded-full bg-purple-400/50 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-white/75 text-[13px] font-medium truncate">{chat.title}</div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-white/30 text-[11px]">
                                {new Date(chat.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-white/20 text-[11px]">·</span>
                              <span className="text-white/30 text-[11px]">{duration}</span>
                              <span className="text-white/20 text-[11px]">·</span>
                              <span className="text-white/30 text-[11px]">
                                Ultima modifica: {new Date(chat.updatedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
                        </summary>

                        {/* Trascrizione completa */}
                        <div className="px-5 pb-4 pt-2 space-y-2 bg-black/20">
                          {allMsgs.map((msg: any, i: number) => (
                            <div key={i} className={`flex gap-2.5 ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                              {!msg.isUser && (
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0 mt-0.5"
                                  style={{ backgroundColor: AI_COLOR[msg.aiId] || '#6B7280' }}>
                                  {(msg.name?.[0] || '?').toUpperCase()}
                                </div>
                              )}
                              <div className={`max-w-[75%] rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
                                msg.isUser
                                  ? 'text-white'
                                  : 'text-white/75'
                              }`} style={{
                                backgroundColor: msg.isUser
                                  ? 'rgba(124,58,237,0.4)'
                                  : `${AI_COLOR[msg.aiId] || '#6B7280'}18`,
                                border: msg.isUser ? 'none' : `1px solid ${AI_COLOR[msg.aiId] || '#6B7280'}30`,
                              }}>
                                {!msg.isUser && (
                                  <div className="text-[10px] font-bold mb-1" style={{ color: AI_COLOR[msg.aiId] || '#A78BFA' }}>
                                    {msg.name}
                                  </div>
                                )}
                                {msg.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )
                  })}
                </div>
              </details>
            )
          })}
        </div>
      </div>
    </div>
  )
}
