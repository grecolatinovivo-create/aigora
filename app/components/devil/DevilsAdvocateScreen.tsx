'use client'
import { useState } from 'react'
import { AI_NAMES, AI_COLOR } from '@/app/lib/aiProfiles'
import type { DevilSession } from '@/app/types/aigora'

export default function DevilsAdvocateScreen({ session, onMessage, onEndTurn, loading, isDark, bgPreset, onBack }: {
  session: DevilSession
  onMessage: (text: string) => void
  onEndTurn: () => void
  loading: boolean
  isDark: boolean
  bgPreset: { value: string; header: string; text: 'black' | 'white' }
  onBack: () => void
}) {
  const [input, setInput] = useState('')
  const textColor = isDark ? '#fff' : '#111'
  const subColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'

  const scoreColor = session.score >= 7 ? '#10A37F' : session.score >= 5 ? '#F59E0B' : '#ef4444'

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: bgPreset.value }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 border-b"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: '10px', backgroundColor: bgPreset.header, borderColor }}>
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base">😈</span>
            <span className="font-bold text-sm truncate" style={{ color: textColor }}>Devil's Advocate</span>
          </div>
          <div className="text-[10px] truncate" style={{ color: '#ef4444' }}>Turno {session.round} · Difendi la tua posizione</div>
        </div>
        {/* Score */}
        <div className="flex flex-col items-end flex-shrink-0">
          <div className="text-xl font-black" style={{ color: scoreColor }}>{session.score.toFixed(1)}</div>
          <div className="text-[9px]" style={{ color: subColor }}>/ 10</div>
        </div>
      </div>

      {/* Posizione assegnata */}
      <div className="flex-shrink-0 px-4 py-3 border-b"
        style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' }}>
        <div className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: '#ef4444' }}>La tua posizione — devi difenderla</div>
        <div className="text-sm font-bold" style={{ color: textColor }}>"{session.position}"</div>
      </div>

      {/* Messaggi */}
      <div className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-3">
        {session.messages.map((msg, i) => (
          <div key={i}>
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-br-sm text-sm"
                  style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: isDark ? '#fca5a5' : '#b91c1c' }}>
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="flex items-end gap-2 max-w-[85%]">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                  style={{ backgroundColor: AI_COLOR[msg.aiId ?? 'claude'] }}>
                  {msg.aiId === 'gemini' ? 'Ge' : (AI_NAMES[msg.aiId ?? 'claude'] ?? 'C')[0]}
                </div>
                <div className="px-3 py-2 rounded-2xl rounded-bl-sm text-sm"
                  style={{ backgroundColor: isDark ? `${AI_COLOR[msg.aiId ?? 'claude']}18` : `${AI_COLOR[msg.aiId ?? 'claude']}15`, color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)' }}>
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-[9px] font-bold">C</div>
            <div className="flex gap-1">
              {[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
            </div>
          </div>
        )}
      </div>

      {/* Input + Fine turno */}
      <div className="flex-shrink-0 border-t" style={{ backgroundColor: bgPreset.header, borderColor, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-2 px-3 pt-2 pb-1">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && input.trim() && !loading) { onMessage(input.trim()); setInput('') } }}
            placeholder="Difendi la tua posizione…"
            disabled={loading}
            className="flex-1 rounded-full px-3 py-2 text-[12px] outline-none"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, color: isDark ? '#f0f0f0' : '#111' }}
          />
          <button onClick={() => { if (input.trim()) { onMessage(input.trim()); setInput('') } }} disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white disabled:opacity-30"
            style={{ background: 'rgba(239,68,68,0.6)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
          </button>
        </div>
        <div className="px-3 pb-1">
          <button onClick={onEndTurn} disabled={loading || session.round >= 4}
            className="w-full py-2 rounded-xl text-xs font-bold disabled:opacity-40 transition-all"
            style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
            {session.round >= 4 ? 'Attendi verdetto finale…' : `Fine turno → (${4 - session.round} rimasti)`}
          </button>
        </div>
      </div>
    </div>
  )
}
