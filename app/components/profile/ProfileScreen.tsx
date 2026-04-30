'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { loadUserTraits } from '@/app/components/AINameScreen'

async function compressImage(file: File, maxW: number, maxH: number): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let w = img.naturalWidth, h = img.naturalHeight
      // Scala proporzionalmente
      if (w > h) { if (w > maxW) { h = Math.round(h * maxW / w); w = maxW } }
      else { if (h > maxH) { w = Math.round(w * maxH / h); h = maxH } }
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(blob => {
        resolve(new File([blob!], 'avatar.jpg', { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.7)
    }
    img.src = url
  })
}

export default function ProfileScreen({ displayName, userEmail, userPlan, savedChats, bgPreset, isDark, onBack, onSignOut, onMultiplayer, userImage, onImageChange, dbUserName }: {
  displayName: string
  userEmail?: string
  userPlan?: string
  savedChats: any[]
  bgPreset: { value: string; header: string; text: 'black' | 'white' }
  isDark: boolean
  onBack: () => void
  onSignOut: () => void
  onMultiplayer?: () => void
  userImage?: string | null
  onImageChange?: (img: string | null) => void
  dbUserName?: string | null
  isBeta?: boolean
}) {
  const [following, setFollowing] = useState<any[]>([])
  const [followers, setFollowers] = useState<any[]>([])
  const [profileTab, setProfileTab] = useState<'chat' | 'following' | 'followers'>('chat')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const planColors: Record<string, string> = { max:'#FF6B2B', pro:'#7C3AED', starter:'#1A73E8', free:'#10A37F', admin:'#F59E0B', none:'#6B7280' }
  const planLabels: Record<string, string> = { max:'MAX', pro:'PRO', starter:'STARTER', free:'FREE', admin:'ADMIN', none:'OSPITE' }

  // Traits utente da localStorage (raccolte in AINameScreen)
  const traits = useMemo(() => loadUserTraits(), [])
  const TRAIT_LABELS: Record<string, Record<string, string>> = {
    style: { logica:'🧠 Logica', passione:'🔥 Passione', ironia:'😏 Ironia', creatività:'🎨 Creatività' },
    weapon: { dati:'📊 Dati', controesempi:'🔁 Controesempi', domande:'❓ Domande', paradossi:'💥 Paradossi' },
    weakness: { emozione:'🌪️ Emotivo', lentezza:'🐢 Lento', ascolto:'🪞 Empatico', direttezza:'🎯 Diretto' },
  }
  // Il piano 'admin' viene impostato dal session callback — usiamo direttamente userPlan
  const effectivePlan = userPlan ?? 'none'
  const planColor = planColors[effectivePlan] ?? '#6B7280'
  const publicChats = savedChats.filter((c: any) => c.isPublic)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    // Ridimensiona sul client prima di inviare
    const compressed = await compressImage(file, 80, 80)
    const form = new FormData()
    form.append('avatar', compressed)
    try {
      const res = await fetch('/api/user/avatar', { method: 'POST', body: form })
      const data = await res.json()
      if (data.image) onImageChange?.(data.image)
    } catch {}
    setUploadingAvatar(false)
  }

  useEffect(() => {
    fetch('/api/follow').then(r => r.json()).then(d => {
      setFollowing(d.following ?? [])
      setFollowers(d.followers ?? [])
    }).catch(() => {})
  }, [])

  const handleUnfollow = async (targetId: string) => {
    await fetch('/api/follow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUserId: targetId }) })
    setFollowing(prev => prev.filter(u => u.id !== targetId))
  }

  const textColor = isDark ? '#fff' : '#111'
  const subColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: bgPreset.value }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 pb-4 border-b"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', backgroundColor: bgPreset.header, borderColor }}>
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full"
          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span className="font-bold text-lg" style={{ color: textColor }}>Profilo</span>
        {/* Link profilo pubblico */}
        <a href={`/${encodeURIComponent(dbUserName || (displayName !== 'Tu' ? displayName : (userEmail || ''))  )}`} target="_blank" rel="noopener noreferrer"
          className="ml-auto text-[11px] font-semibold flex items-center gap-1"
          style={{ color: '#A78BFA' }}>
          🔗 Profilo pubblico
        </a>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Avatar + info */}
        <div className="flex items-center gap-4 px-5 pt-6 pb-5" style={{ backgroundColor: bgPreset.header, borderBottom: `1px solid ${borderColor}` }}>
          {/* Avatar cliccabile per cambio foto */}
          <div className="relative flex-shrink-0 cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
            <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-2xl font-black text-white"
              style={{ backgroundColor: planColor, boxShadow: `0 0 0 3px ${planColor}30` }}>
              {userImage
                ? <img src={userImage} alt="avatar" className="w-full h-full object-cover" />
                : (displayName || '?')[0].toUpperCase()
              }
            </div>
            {/* Overlay modifica */}
            <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              {uploadingAvatar
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
              }
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg truncate" style={{ color: textColor }}>{displayName}</div>
            <div className="text-xs truncate" style={{ color: subColor }}>{userEmail}</div>
            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
              style={{ backgroundColor: `${planColor}20`, color: planColor, border: `1px solid ${planColor}40` }}>
              {planLabels[effectivePlan] ?? effectivePlan.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Traits combattente — visibili solo se esistono */}
        {traits && (traits.style || traits.weapon || traits.weakness) && (
          <div className="px-5 py-4 border-b" style={{ borderColor, backgroundColor: bgPreset.header }}>
            <div className="text-[10px] font-bold mb-3 tracking-widest uppercase" style={{ color: 'rgba(167,139,250,0.7)' }}>
              Il tuo stile da combattente
            </div>
            <div className="flex flex-wrap gap-2">
              {traits.style && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                  style={{ background: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.2)' }}>
                  {TRAIT_LABELS.style[traits.style] ?? traits.style}
                </span>
              )}
              {traits.weapon && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                  style={{ background: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}>
                  {TRAIT_LABELS.weapon[traits.weapon] ?? traits.weapon}
                </span>
              )}
              {traits.weakness && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                  style={{ background: 'rgba(248,113,113,0.08)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                  {TRAIT_LABELS.weakness[traits.weakness] ?? traits.weakness}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex border-b" style={{ borderColor, backgroundColor: bgPreset.header }}>
          {[
            ['Dibattiti', savedChats.length],
            ['Seguiti', following.length],
            ['Seguaci', followers.length],
          ].map(([label, count]) => (
            <div key={label as string} className="flex-1 text-center py-3">
              <div className="text-xl font-black" style={{ color: textColor }}>{count}</div>
              <div className="text-[10px]" style={{ color: subColor }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Multiplayer card + Esci */}
        <div className="px-4 pt-6 pb-8 flex flex-col gap-3">
          {onMultiplayer && (
            <button onClick={onMultiplayer}
              className="w-full flex flex-col items-center gap-2 px-5 py-5 rounded-3xl active:scale-[0.98] transition-transform"
              style={{
                background: 'linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)',
                boxShadow: '0 4px 24px rgba(109,40,217,0.45)',
              }}>
              <div className="text-2xl font-black text-white">⚔ Multiplayer</div>
              <div className="text-[12px] text-center" style={{ color: 'rgba(255,255,255,0.65)' }}>Sfida un altro utente con le AI al tuo fianco</div>
            </button>
          )}
          <button onClick={onSignOut}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold text-red-500 active:scale-[0.98] transition-transform"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: `1px solid ${borderColor}` }}>
            Esci dall'account
          </button>
        </div>
      </div>
    </div>
  )
}
