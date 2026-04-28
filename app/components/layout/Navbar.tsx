'use client'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

export default function Navbar({ onCronologia, onFeed, onCrea, onNewChat, onMultiplayer, displayName, userEmail, userPlan, showProfileMenu, setShowProfileMenu, onSignOut, unreadCount, dbUserName, isBeta, show2v2Label, twoVsTwoTopic, hideCronologia }: {
  onCronologia: () => void
  hideCronologia?: boolean
  onFeed?: () => void
  onCrea?: () => void
  onNewChat?: () => void
  onMultiplayer?: () => void
  dbUserName?: string | null
  isBeta?: boolean
  displayName: string
  userEmail?: string
  userPlan?: string
  showProfileMenu: boolean
  setShowProfileMenu: (v: boolean | ((p: boolean) => boolean)) => void
  onSignOut: () => void
  unreadCount?: number
  show2v2Label?: 'title' | 'topic' | null
  twoVsTwoTopic?: string
}) {
  const t = useTranslations('nav')
  const tChat = useTranslations('chat')
  const router = useRouter()

  const planColors: Record<string, string> = {
    admin: '#F59E0B', freemium: '#22D3EE', max: '#FF6B2B', premium: '#FF6B2B',
    pro: '#A78BFA', starter: '#1A73E8', free: '#10A37F', none: '#6B7280',
  }

  // Gli utenti con piano avanzato possono usare tutte le modalità
  const isPaid = ['pro', 'premium', 'admin', 'freemium', 'max'].includes(userPlan ?? '')
  const pc = planColors[userPlan ?? 'free'] ?? '#6B7280'

  const close = () => setShowProfileMenu(false)

  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 h-14"
      style={{ backgroundColor: 'rgba(7,7,15,0.4)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)' }}>

      {/* Sinistra — Cronologia */}
      {!hideCronologia ? (
        <button onClick={onCronologia}
          className="flex items-center gap-2 text-sm font-medium transition-all hover:text-white"
          style={{ color: 'rgba(255,255,255,0.45)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 18 0A9 9 0 0 0 3 12z"/><path d="M12 7v5l3 3"/>
          </svg>
          {t('history')}
        </button>
      ) : (
        <div style={{ width: '100px' }} />
      )}

      {/* Centro — Logo o Label 2v2 */}
      <button onClick={onNewChat}
        className="absolute left-1/2 -translate-x-1/2 font-black text-lg tracking-tight hover:opacity-80 active:scale-95 transition-all text-center">
        {show2v2Label === 'topic' && twoVsTwoTopic ? (
          <span className="text-white text-sm font-bold max-w-[200px] truncate block">{twoVsTwoTopic}</span>
        ) : (
          <>
            <span className="text-white">Ai</span>
            <span style={{ color: '#A78BFA' }}>GORÀ</span>
          </>
        )}
      </button>

      {/* Destra — Profilo */}
      <div className="flex items-center gap-3">
        <div className="relative">
          {/* Avatar */}
          <button onClick={() => setShowProfileMenu(p => !p)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white transition-transform hover:scale-110"
            style={{ backgroundColor: pc, boxShadow: `0 2px 10px ${pc}55` }}>
            {(displayName !== 'Tu' ? displayName : (userEmail || '?'))[0].toUpperCase()}
          </button>

          {/* Badge notifiche */}
          {(unreadCount ?? 0) > 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white pointer-events-none"
              style={{ backgroundColor: '#7C3AED' }}>
              {unreadCount}
            </div>
          )}

          {/* Dropdown menu */}
          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={close} />
              <div className="absolute right-0 top-11 w-60 rounded-2xl overflow-hidden shadow-2xl z-50"
                style={{ backgroundColor: 'rgba(12,12,20,0.97)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>

                {/* ── Header utente ── */}
                <div className="px-4 py-3 border-b border-white/8">
                  <div className="text-white font-semibold text-sm truncate">{displayName || '—'}</div>
                  <div className="text-white/40 text-[11px] truncate mt-0.5">{userEmail}</div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: `${pc}20`, color: pc, border: `1px solid ${pc}40` }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pc }} />
                      {(userPlan ?? 'free').toUpperCase()}
                    </div>
                    {isBeta && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                        style={{ backgroundColor: 'rgba(124,58,237,0.2)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.4)' }}>
                        ✦ Beta Tester
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Modalità ── */}
                {/* Dibattito — tutti */}
                <button onClick={() => { onNewChat?.(); close() }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors font-medium border-b border-white/8 flex items-center gap-2.5"
                  style={{ color: 'rgba(255,255,255,0.75)' }}>
                  Dibattito
                </button>

                {/* Brainstormer — pro+ o lock */}
                <button
                  onClick={() => { close(); if (isPaid) window.location.href = '/brainstorm'; else router.push('/pricing') }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors font-medium border-b border-white/8 flex items-center justify-between"
                  style={{ color: isPaid ? '#86EFAC' : 'rgba(255,255,255,0.3)' }}>
                  <div className="flex items-center gap-2.5">
                    Brainstormer
                  </div>
                  {!isPaid && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.3)' }}>
                      PRO
                    </span>
                  )}
                </button>

                {/* 2v2 + Devil — pro+ o lock */}
                <button
                  onClick={() => { close(); if (isPaid) onMultiplayer?.(); else router.push('/pricing') }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors font-medium border-b border-white/8 flex items-center justify-between"
                  style={{ color: isPaid ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)' }}>
                  <div className="flex items-center gap-2.5">
                    <span>2v2 · Avvocato del Diavolo</span>
                  </div>
                  {!isPaid && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.3)' }}>
                      PRO
                    </span>
                  )}
                </button>

                {/* Upgrade — solo per utenti free */}
                {!isPaid && (
                  <button onClick={() => { close(); router.push('/pricing') }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors font-medium border-b border-white/8 flex items-center gap-2.5"
                    style={{ color: '#A78BFA' }}>
                    Upgrade a Pro →
                  </button>
                )}

                {/* Prezzi — solo per utenti free */}
                {!isPaid && (
                  <button onClick={() => { close(); router.push('/pricing') }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors font-medium border-b border-white/8 flex items-center gap-2.5"
                    style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <span style={{ fontSize: 13 }}>💳</span>
                    Piani e prezzi
                  </button>
                )}

                {/* ── Funzioni social — admin/beta ── */}
                {(userPlan === 'admin' || isBeta) && (
                  <>
                    <a href={`/${encodeURIComponent(dbUserName || displayName !== 'Tu' ? (dbUserName || displayName) : (userEmail || ''))}`}
                      className="w-full px-4 py-2.5 text-left text-sm text-purple-400 hover:bg-white/5 transition-colors font-medium border-b border-white/8 flex items-center gap-2.5">
                      <span style={{ fontSize: 13 }}>👤</span>
                      {tChat('ai.chiSono').includes('Who') ? 'My public profile' : 'Il mio profilo pubblico'}
                    </a>
                    <button onClick={() => { onFeed?.(); close() }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors font-medium border-b border-white/8 flex items-center justify-between"
                      style={{ color: 'rgba(255,255,255,0.6)' }}>
                      <div className="flex items-center gap-2.5">
                        <span style={{ fontSize: 13 }}>📡</span>
                        Feed dibattiti
                      </div>
                      {(unreadCount ?? 0) > 0 && (
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ backgroundColor: '#7C3AED' }}>{unreadCount}</span>
                      )}
                    </button>
                    <button onClick={() => { onCrea?.(); close() }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors font-medium border-b border-white/8 flex items-center gap-2.5"
                      style={{ color: 'rgba(255,255,255,0.6)' }}>
                      <span style={{ fontSize: 13 }}>➕</span>
                      Crea dibattito
                    </button>
                  </>
                )}

                {/* ── Admin panel ── */}
                {userPlan === 'admin' && (
                  <button onClick={() => { close(); window.location.href = '/admin' }}
                    className="w-full px-4 py-2.5 text-left text-sm text-amber-400 hover:bg-white/5 transition-colors font-medium border-b border-white/8 flex items-center gap-2.5">
                    <span style={{ fontSize: 13 }}>⚙️</span>
                    Pannello Admin
                  </button>
                )}

                {/* ── Sign out ── */}
                <button onClick={onSignOut}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-white/5 transition-colors font-medium flex items-center gap-2.5">
                  <span style={{ fontSize: 13 }}>↩</span>
                  {t('signOut')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
