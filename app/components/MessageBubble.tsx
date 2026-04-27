'use client'
import { AttachmentChip } from './chat/AttachmentButton'
import type { ChatAttachment } from './chat/AttachmentButton'

export type { ChatAttachment }

export interface Message {
  id: string
  aiId: string
  name: string
  content: string
  isStreaming?: boolean
  isUser?: boolean
  isSynthesis?: boolean
  realModel?: string
  attachment?: ChatAttachment
}

const AI_BUBBLE_LIGHT: Record<string, { bg: string; nameColor: string; textColor: string }> = {
  claude:     { bg: '#e8e0f8', nameColor: '#6d28d9', textColor: '#1a1a2e' },
  gpt:        { bg: '#d4f5e9', nameColor: '#065f46', textColor: '#0a2a1e' },
  gemini:     { bg: '#dbeafe', nameColor: '#1d4ed8', textColor: '#0a1a3e' },
  perplexity: { bg: '#ffe8d6', nameColor: '#c2410c', textColor: '#2e1406' },
}

const AI_BUBBLE_DARK: Record<string, { bg: string; nameColor: string; textColor: string }> = {
  claude:     { bg: '#2D1B69', nameColor: '#c4b5fd', textColor: '#ede8ff' },
  gpt:        { bg: '#0a2e22', nameColor: '#6ee7b7', textColor: '#d4f5e9' },
  gemini:     { bg: '#0a1f4a', nameColor: '#93c5fd', textColor: '#dbeafe' },
  perplexity: { bg: '#2e1406', nameColor: '#fdba74', textColor: '#ffe8d6' },
}

const AI_AVATAR: Record<string, string> = {
  claude:     '#7C3AED',
  gpt:        '#10A37F',
  gemini:     '#1A73E8',
  perplexity: '#FF6B2B',
}

function renderText(text: string, isStreaming: boolean) {
  if (!text) return isStreaming ? <span className="typewriter-cursor">&nbsp;</span> : <span>…</span>
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/)
  const nodes = parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*')) return <strong key={i}>{part.slice(1, -1)}</strong>
    if (part.startsWith('_') && part.endsWith('_')) return <em key={i}>{part.slice(1, -1)}</em>
    return <span key={i}>{part}</span>
  })
  return <span className={isStreaming ? 'typewriter-cursor' : ''}>{nodes}</span>
}

interface MessageBubbleProps {
  message: Message
  bgTheme?: 'black' | 'white'
  fontSize?: number
  isAdmin?: boolean
}

export default function MessageBubble({ message, bgTheme = 'black', fontSize = 13, isAdmin = false }: MessageBubbleProps) {
  const isDark = bgTheme === 'white'

  if (message.isUser) {
    return (
      <div className="flex justify-end px-3 mb-1 message-enter">
        <div style={{ maxWidth: '78%', minWidth: 0 }}>
          {message.attachment && <AttachmentChip attachment={message.attachment} />}
          <div className="rounded-2xl rounded-br-sm px-3 py-2 leading-relaxed text-white"
            style={{
              backgroundColor: '#005c4b',
              fontSize,
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              whiteSpace: 'pre-wrap',
            }}>
            {message.content}
          </div>
        </div>
      </div>
    )
  }

  const bubbleMap = isDark ? AI_BUBBLE_DARK : AI_BUBBLE_LIGHT
  const bubble = bubbleMap[message.aiId] || bubbleMap['claude']
  const avatarColor = AI_AVATAR[message.aiId] || '#6B7280'

  return (
    <div className="flex items-end gap-2 px-3 mb-1 message-enter" style={{ minWidth: 0 }}>
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mb-0.5"
        style={{ backgroundColor: avatarColor }}>
        {message.name[0]}
      </div>
      <div style={{ maxWidth: '78%', minWidth: 0, flex: '0 1 auto' }}>
        <div className="text-[11px] font-semibold mb-0.5 ml-1" style={{ color: bubble.nameColor }}>
          {isAdmin && message.aiId === 'perplexity' && message.realModel ? message.realModel : message.name}{isAdmin && message.realModel && message.aiId !== 'perplexity' && message.realModel !== message.name ? <span style={{ opacity: 0.5, fontWeight: 400, fontSize: 10 }}> ({message.realModel})</span> : null}
        </div>
        <div className="rounded-2xl rounded-bl-sm px-3 py-2 leading-relaxed"
          style={{
            backgroundColor: bubble.bg,
            color: bubble.textColor,
            fontSize,
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            whiteSpace: 'pre-wrap',
          }}>
          {renderText(message.content, !!message.isStreaming)}
        </div>
      </div>
    </div>
  )
}
