'use client'
import { AI_COLOR, AI_NAMES } from '@/app/lib/aiProfiles'

export default function PhoneAvatarBar({ activeAi, bgColor, isDark, aiOrder, onAiClick }: {
  activeAi: string | null
  bgColor: string
  isDark: boolean
  aiOrder: string[]
  onAiClick?: (id: string) => void
}) {
  return (
    <div className="flex items-center justify-around px-2 py-1.5" style={{
      backgroundColor: bgColor,
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
    }}>
      {aiOrder.map(id => {
        const isActive = activeAi === id
        const color = AI_COLOR[id]
        return (
          <button key={id} className="flex flex-col items-center gap-0.5 active:scale-95 transition-transform"
            onClick={() => onAiClick?.(id)}>
            <div className="relative w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold transition-all duration-300"
              style={{
                backgroundColor: isActive ? color : color + '40',
                boxShadow: isActive ? `0 0 12px 3px ${color}66` : undefined,
                transform: isActive ? 'scale(1.18)' : 'scale(1)',
                animation: isActive ? 'avatar-glow 1.2s ease-in-out infinite' : undefined,
              }}>
              {id === 'gemini' ? 'Ge' : AI_NAMES[id][0]}
              {isActive && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-white" />}
            </div>
            <span className="text-[8px] font-medium transition-colors" style={{ color: isActive ? (isDark ? '#fff' : '#111') : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)') }}>
              {AI_NAMES[id]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
