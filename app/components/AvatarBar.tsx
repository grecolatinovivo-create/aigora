'use client'

interface AvatarBarProps {
  activeAi: string | null
}

const AIS = [
  { id: 'claude', name: 'Claude', color: '#7C3AED', initials: 'C', ring: 'ring-purple-500' },
  { id: 'gpt', name: 'GPT', color: '#10A37F', initials: 'G', ring: 'ring-emerald-500' },
  { id: 'gemini', name: 'Gemini', color: '#1A73E8', initials: 'Ge', ring: 'ring-blue-500' },
  { id: 'perplexity', name: 'Perplexity', color: '#FF6B2B', initials: 'P', ring: 'ring-orange-500' },
]

export default function AvatarBar({ activeAi }: AvatarBarProps) {
  return (
    <div className="flex items-center justify-center gap-6 px-4 py-4 bg-[#0f0f13] border-b border-white/10">
      {AIS.map((ai) => {
        const isActive = activeAi === ai.id
        return (
          <div key={ai.id} className="flex flex-col items-center gap-1.5">
            <div
              className={`relative w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm ring-2 transition-all duration-300 ${
                isActive ? `${ai.ring} shadow-lg scale-110` : 'ring-transparent'
              }`}
              style={{
                backgroundColor: isActive ? ai.color : ai.color + '55',
                boxShadow: isActive ? `0 0 18px 4px ${ai.color}88` : undefined,
                animation: isActive ? 'avatar-glow 1.2s ease-in-out infinite' : undefined,
              }}
            >
              {ai.initials}
              {isActive && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[#0f0f13]" />
              )}
            </div>
            <span className={`text-xs font-medium transition-colors duration-300 ${isActive ? 'text-white' : 'text-white/35'}`}>
              {ai.name}
            </span>
          </div>
        )
      })}
    </div>
  )
}
