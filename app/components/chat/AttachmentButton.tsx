'use client'
import { useRef } from 'react'

export interface ChatAttachment {
  type: 'image' | 'pdf' | 'text'
  mimeType: string
  data: string      // base64 per image/pdf, testo raw per txt/md
  name: string
  size: number      // bytes originali
}

const MAX_SIZE = 4 * 1024 * 1024  // 4 MB
const ACCEPTED = '.jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.md'

const TYPE_ICONS: Record<ChatAttachment['type'], string> = {
  image: '🖼',
  pdf:   '📄',
  text:  '📝',
}

interface AttachmentButtonProps {
  attachment: ChatAttachment | null
  onAttachment: (a: ChatAttachment) => void
  onRemove: () => void
  isDark: boolean
  size?: 'sm' | 'md'
}

export default function AttachmentButton({
  attachment,
  onAttachment,
  onRemove,
  isDark,
  size = 'md',
}: AttachmentButtonProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const dim = size === 'sm' ? 32 : 40
  const iconSz = size === 'sm' ? 14 : 16

  const handleFile = async (file: File) => {
    if (file.size > MAX_SIZE) {
      alert(`File troppo grande (max 4 MB). Il file selezionato è ${(file.size / 1024 / 1024).toFixed(1)} MB.`)
      return
    }

    let type: ChatAttachment['type'] = 'text'
    if (file.type.startsWith('image/')) type = 'image'
    else if (file.type === 'application/pdf') type = 'pdf'

    if (type === 'text') {
      // Leggi come testo
      const data = await file.text()
      onAttachment({ type, mimeType: file.type || 'text/plain', data, name: file.name, size: file.size })
    } else {
      // Leggi come base64
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        // Strip "data:mime;base64," prefix
        const base64 = result.split(',')[1] ?? ''
        onAttachment({ type, mimeType: file.type, data: base64, name: file.name, size: file.size })
      }
      reader.readAsDataURL(file)
    }

    // Reset input so the same file can be re-selected
    if (fileRef.current) fileRef.current.value = ''
  }

  if (attachment) {
    // Chip preview
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium flex-shrink-0"
        style={{
          backgroundColor: isDark ? 'rgba(167,139,250,0.15)' : 'rgba(124,58,237,0.1)',
          border: `1px solid ${isDark ? 'rgba(167,139,250,0.3)' : 'rgba(124,58,237,0.2)'}`,
          color: isDark ? '#c4b5fd' : '#7C3AED',
          maxWidth: 160,
        }}
      >
        <span style={{ fontSize: 13 }}>{TYPE_ICONS[attachment.type]}</span>
        <span className="truncate" style={{ maxWidth: 80 }}>{attachment.name}</span>
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
          style={{ lineHeight: 1 }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    )
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        title="Allega file (immagine, PDF, testo)"
        className="flex items-center justify-center rounded-full flex-shrink-0 transition-all hover:scale-105 active:scale-95"
        style={{
          width: dim,
          height: dim,
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
        }}
      >
        <svg width={iconSz} height={iconSz} viewBox="0 0 24 24" fill="none"
          stroke={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
        </svg>
      </button>
    </>
  )
}

// ── Thumbnail allegato nel bubble utente ─────────────────────────────────────
export function AttachmentChip({ attachment }: { attachment: ChatAttachment }) {
  const isImage = attachment.type === 'image'

  if (isImage) {
    // Mostra miniatura immagine
    return (
      <div className="mb-1.5 rounded-xl overflow-hidden" style={{ maxWidth: 180, maxHeight: 120 }}>
        <img
          src={`data:${attachment.mimeType};base64,${attachment.data}`}
          alt={attachment.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-2 mb-1.5 px-3 py-2 rounded-xl text-xs"
      style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' }}
    >
      <span style={{ fontSize: 14 }}>{TYPE_ICONS[attachment.type]}</span>
      <div className="flex flex-col">
        <span className="font-medium truncate" style={{ maxWidth: 120 }}>{attachment.name}</span>
        <span style={{ opacity: 0.6 }}>{(attachment.size / 1024).toFixed(0)} KB</span>
      </div>
    </div>
  )
}
