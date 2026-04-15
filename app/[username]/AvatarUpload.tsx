'use client'
import { useRef, useState } from 'react'

async function compressImage(file: File, maxW: number, maxH: number): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let w = img.naturalWidth, h = img.naturalHeight
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

export default function AvatarUpload({
  initial,
  planColor,
  initialImage,
  isOwner,
}: {
  initial: string
  planColor: string
  initialImage: string | null
  isOwner: boolean
}) {
  const [image, setImage] = useState<string | null>(initialImage)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const compressed = await compressImage(file, 80, 80)
    const form = new FormData()
    form.append('avatar', compressed)
    try {
      const res = await fetch('/api/user/avatar', { method: 'POST', body: form })
      const data = await res.json()
      if (data.image) setImage(data.image)
    } catch {}
    setUploading(false)
  }

  return (
    <div
      style={{ position: 'relative', flexShrink: 0, cursor: isOwner ? 'pointer' : 'default' }}
      onClick={() => isOwner && inputRef.current?.click()}
    >
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%',
        backgroundColor: planColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '24px', fontWeight: 700, color: 'white',
        boxShadow: `0 0 0 4px ${planColor}30`,
        overflow: 'hidden',
      }}>
        {image
          ? <img src={image} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : initial
        }
      </div>

      {/* Overlay modifica — solo proprietario */}
      {isOwner && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          backgroundColor: 'rgba(0,0,0,0)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          transition: 'background-color 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.5)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0)')}>
          {uploading
            ? <div style={{ width: '20px', height: '20px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ opacity: 0 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
          }
        </div>
      )}

      {isOwner && (
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
