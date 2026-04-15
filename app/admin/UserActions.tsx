'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UserActions({ userId, blocked, beta }: { userId: string; blocked: boolean; beta: boolean }) {
  const [loading, setLoading] = useState(false)
  const [isBlocked, setIsBlocked] = useState(blocked)
  const [isBeta, setIsBeta] = useState(beta)
  const router = useRouter()

  const handleAction = async (action: string) => {
    setLoading(true)
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      if (action === 'block') setIsBlocked(true)
      if (action === 'unblock') setIsBlocked(false)
      if (action === 'beta') setIsBeta(true)
      if (action === 'unbeta') setIsBeta(false)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo utente? L\'azione è irreversibile.')) return
    setLoading(true)
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {/* Beta tester toggle */}
      <button onClick={() => handleAction(isBeta ? 'unbeta' : 'beta')} disabled={loading}
        className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50"
        style={{
          backgroundColor: isBeta ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.06)',
          color: isBeta ? '#A78BFA' : 'rgba(255,255,255,0.4)',
          border: `1px solid ${isBeta ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.1)'}`,
        }}>
        {isBeta ? '✦ Beta' : 'Beta'}
      </button>
      {/* Blocca/Sblocca */}
      <button onClick={() => handleAction(isBlocked ? 'unblock' : 'block')} disabled={loading}
        className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50"
        style={{
          backgroundColor: isBlocked ? 'rgba(16,163,127,0.15)' : 'rgba(245,158,11,0.15)',
          color: isBlocked ? '#10A37F' : '#F59E0B',
          border: `1px solid ${isBlocked ? 'rgba(16,163,127,0.3)' : 'rgba(245,158,11,0.3)'}`,
        }}>
        {isBlocked ? '✓ Sblocca' : '⊘ Blocca'}
      </button>
      {/* Elimina */}
      <button onClick={handleDelete} disabled={loading}
        className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50"
        style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
        🗑
      </button>
    </div>
  )
}
