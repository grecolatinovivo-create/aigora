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

const USD_TO_EUR = 0.92

function formatCost(usd: number): string {
  const eur = usd * USD_TO_EUR
  if (eur === 0) return '€0.000000'
  if (eur >= 1) return `€${eur.toFixed(4)}`
  if (eur >= 0.0001) return `€${eur.toFixed(6)}`
  return `€${eur.toExponential(2)}`
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

  // Costi API
  const usageRaw = await prisma.apiUsage.findMany({ orderBy: { createdAt: 'desc' } })
  const usageByProvider: Record<string, { calls: number; cost: number; inputTokens: number; outputTokens: number }> = {}
  let totalCost = 0
  for (const u of usageRaw) {
    if (!usageByProvider[u.provider]) usageByProvider[u.provider] = { calls: 0, cost: 0, inputTokens: 0, outputTokens: 0 }
    usageByProvider[u.provider].calls++
    usageByProvider[u.provider].cost += u.costUsd
    usageByProvider[u.provider].inputTokens += u.inputTokens
    usageByProvider[u.provider].outputTokens += u.outputTokens
    totalCost += u.costUsd
  }

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

        {/* Widget costi API */}
        <div className="glass rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-bold text-base">Costi API</h2>
              <div className="text-white/25 text-[10px] mt-0.5">tasso indicativo 1 USD = {USD_TO_EUR} EUR</div>
            </div>
            <span className="text-2xl font-black" style={{ color: totalCost * USD_TO_EUR > 10 ? '#FF6B2B' : '#10A37F' }}>
              {formatCost(totalCost)}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { key: 'anthropic', label: 'Claude', color: '#7C3AED' },
              { key: 'openai',    label: 'GPT',    color: '#10A37F' },
              { key: 'google',    label: 'Gemini', color: '#1A73E8' },
              { key: 'perplexity',label: 'Perplexity', color: '#FF6B2B' },
            ].map(({ key, label, color }) => {
              const u = usageByProvider[key]
              return (
                <div key={key} className="rounded-xl p-3" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                  <div className="text-xs font-bold mb-1" style={{ color }}>{label}</div>
                  <div className="text-white font-bold text-lg">{formatCost(u?.cost ?? 0)}</div>
                  <div className="text-white/40 text-[10px] mt-1">
                    {u?.calls ?? 0} chiamate · {((u?.inputTokens ?? 0) + (u?.outputTokens ?? 0)).toLocaleString()} token
                  </div>
                </div>
              )
            })}
          </div>
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
