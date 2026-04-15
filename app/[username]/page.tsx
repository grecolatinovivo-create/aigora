import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import AvatarUpload from './AvatarUpload'

const AI_COLOR: Record<string, string> = {
  claude: '#7C3AED',
  gpt: '#10A37F',
  gemini: '#1A73E8',
  perplexity: '#FF6B2B',
}
const AI_NAMES: Record<string, string> = {
  claude: 'Claude',
  gpt: 'GPT',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
}

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const user = await prisma.user.findFirst({ where: { name: { equals: params.username, mode: 'insensitive' } } })
  if (!user) return { title: 'Utente non trovato — AiGORÀ' }
  return {
    title: `${user.name} — AiGORÀ`,
    description: `I dibattiti pubblici di ${user.name} su AiGORÀ`,
  }
}

export default async function UserProfilePage({ params }: { params: { username: string } }) {
  const [user, session] = await Promise.all([
    prisma.user.findFirst({ where: { name: { equals: params.username, mode: 'insensitive' } } }),
    getServerSession(authOptions),
  ])
  if (!user) notFound()

  const isOwner = session?.user?.email === user.email

  const publicChats = await prisma.chat.findMany({
    where: { userId: user.id, isPublic: true },
    orderBy: { updatedAt: 'desc' },
  })

  const initial = (user.name || '?')[0].toUpperCase()
  const planColors: Record<string, string> = {
    max: '#FF6B2B', pro: '#7C3AED', starter: '#1A73E8',
    free: '#10A37F', admin: '#F59E0B', none: '#6B7280',
  }
  const planColor = planColors[user.plan ?? 'none'] ?? '#6B7280'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07070f',
      backgroundImage: `
        radial-gradient(ellipse 80% 60% at 20% 10%, rgba(124,58,237,0.18) 0%, transparent 60%),
        radial-gradient(ellipse 60% 50% at 80% 80%, rgba(16,163,127,0.12) 0%, transparent 60%)
      `,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#f0f0f0',
    }}>

      {/* Navbar — identica alla chat */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
        height: '56px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 24px',
        backgroundColor: 'rgba(7,7,15,0.4)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(24px)',
      }}>
        {/* Sinistra — torna indietro */}
        <a href="/" style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.45)',
          textDecoration: 'none',
        }}>
          ← Torna ai dibattiti
        </a>
        {/* Centro — Logo */}
        <span style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: '18px', fontWeight: 900, letterSpacing: '-0.5px',
        }}>
          <span style={{ color: 'white' }}>Ai</span>
          <span style={{ color: '#A78BFA' }}>GORÀ</span>
        </span>
        {/* Destra — CTA */}
        <a href="/" style={{
          fontSize: '12px', color: 'rgba(255,255,255,0.4)',
          textDecoration: 'none', padding: '6px 14px',
          borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)',
        }}>
          Entra nel dibattito →
        </a>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '80px 20px 60px' }}>

        {/* Profilo header */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px', padding: '28px',
          marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '20px',
        }}>
          <AvatarUpload
            initial={initial}
            planColor={planColor}
            initialImage={user.image ?? null}
            isOwner={isOwner}
          />
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800 }}>{user.name}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '3px' }}>
              Membro da {new Date(user.createdAt).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              marginTop: '8px', padding: '3px 10px', borderRadius: '10px',
              fontSize: '10px', fontWeight: 700,
              backgroundColor: `${planColor}20`, color: planColor,
              border: `1px solid ${planColor}40`,
            }}>
              {(user.plan ?? 'free').toUpperCase()}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: '28px', fontWeight: 800 }}>{publicChats.length}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
              {publicChats.length === 1 ? 'dibattito' : 'dibattiti'}
            </div>
          </div>
        </div>

        {/* Lista dibattiti pubblici */}
        {publicChats.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            color: 'rgba(255,255,255,0.2)', fontSize: '14px',
          }}>
            Nessun dibattito pubblico ancora.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {publicChats.map(chat => {
              const messages = chat.messages as any[]
              const aiIds = Array.from(new Set(
                (Array.isArray(messages) ? messages : [])
                  .filter((m: any) => !m.isUser && m.aiId)
                  .map((m: any) => m.aiId)
              )) as string[]
              const msgCount = Array.isArray(messages) ? messages.length : 0
              const date = new Date(chat.updatedAt).toLocaleDateString('it-IT', {
                day: '2-digit', month: 'short', year: 'numeric',
              })

              return (
                <div key={chat.id} style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '20px', padding: '18px 20px',
                }}>
                  <div style={{
                    fontSize: '15px', fontWeight: 700,
                    marginBottom: '10px', lineHeight: 1.4,
                  }}>
                    {chat.title}
                  </div>
                  <div style={{ display: 'flex', gap: '5px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    {aiIds.map(id => (
                      <span key={id} style={{
                        padding: '2px 8px', borderRadius: '8px',
                        fontSize: '10px', fontWeight: 700,
                        backgroundColor: `${AI_COLOR[id] ?? '#6B7280'}25`,
                        color: AI_COLOR[id] ?? '#6B7280',
                        border: `1px solid ${AI_COLOR[id] ?? '#6B7280'}40`,
                      }}>
                        {AI_NAMES[id] ?? id}
                      </span>
                    ))}
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    fontSize: '11px', color: 'rgba(255,255,255,0.3)',
                  }}>
                    <span>{msgCount} messaggi</span>
                    <span>·</span>
                    <span>{date}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
