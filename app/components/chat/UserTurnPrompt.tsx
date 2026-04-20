'use client'

export default function UserTurnPrompt({ name, isDark }: { name: string; isDark: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 my-3 message-enter">
      <div className="flex-1 h-px" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
      <div className="waiting-pulse flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
        style={{ backgroundColor: isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.12)', color: isDark ? '#c4b5fd' : '#6d28d9', border: `1px solid ${isDark ? 'rgba(196,181,253,0.25)' : 'rgba(109,40,217,0.2)'}` }}>
        <span>💬</span>
        <span>{name}, cosa ne pensi?</span>
      </div>
      <div className="flex-1 h-px" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
    </div>
  )
}
