'use client'
import { AI_COLOR, AI_NAMES } from '@/app/lib/aiProfiles'

export default function ThinkingBubble({ aiId, isDark, align = 'left' }: {
  aiId: string
  isDark: boolean
  align?: 'left' | 'right'
}) {
  const color = AI_COLOR[aiId] || '#6B7280'
  const dotColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'
  const bubbleBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
  const isRight = align === 'right'
  return (
    <div className={`flex items-end gap-2 px-3 mb-2 message-enter${isRight ? ' flex-row-reverse self-end' : ''}`}>
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mb-0.5" style={{ backgroundColor: color }}>
        {AI_NAMES[aiId]?.[0]}
      </div>
      <div className={`rounded-2xl px-4 py-3${isRight ? ' rounded-br-sm' : ' rounded-bl-sm'}`} style={{ backgroundColor: bubbleBg }}>
        <div className="flex gap-1.5 items-center h-3">
          {[0, 180, 360].map(d => (
            <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: dotColor, animationDelay: `${d}ms`, animationDuration: '1s' }} />
          ))}
        </div>
      </div>
    </div>
  )
}
