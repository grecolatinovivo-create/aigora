// ── Tipi e interfacce globali di AiGORÀ ──────────────────────────────────────

export type ChatPhase = 'start' | 'running' | 'done' | 'history' | 'profile' | 'new'
export type GameMode = 'classico' | '2v2' | 'devil'

export interface Team {
  name: string
  color: string
  members: { id: string; name: string; isAI: boolean; aiId?: string }[]
}

export type DevilDifficulty = 'easy' | 'medium' | 'impossible'
export type DevilPhase = 'playing' | 'consulting' | 'verdict' | 'score' | 'reply' | 'done'

export interface DevilVerdict {
  aiId: string
  score: number   // 0–10
  text: string
}

export interface DevilSession {
  position: string
  difficulty: DevilDifficulty
  side: 'defend'
  round: number          // inizia da 1, illimitato
  score: number          // 0.0–10.0, parte da 5.0
  rerollUsed: boolean
  phase: DevilPhase
  messages: { role: 'user' | 'ai'; aiId?: string; content: string }[]
  verdicts: DevilVerdict[]      // 4 verdetti, uno per AI
  finalScore: number | null
  userReply: string | null
  claudeClosing: string | null
}

export interface TwoVsTwoConfig {
  topic: string
  teamA: { humanName: string; aiId: string }
  teamB: { aiId1: string; aiId2: string }  // squadra B: 2 AI
  arbiterAiId: string  // 4a AI — non gioca mai
  maxRounds?: number
  roomCode?: string
  roomId?: string
  teamASide?: 'attack' | 'defend'  // ruolo squadra A: attack = smontare la tesi, defend = sostenere
}

export interface TwoVsTwoState {
  config: TwoVsTwoConfig
  messages: { team: 'A' | 'B' | 'arbiter'; isAI: boolean; aiId?: string; author: string; content: string; streaming?: boolean }[]
  currentTurn: 'A' | 'B'
  round: number
  maxRounds: number
  messagesThisTurn: number
  maxMessagesPerTurn: number
  scoreA: number
  scoreB: number
  roundScores: { round: number; winner: 'A' | 'B' | 'draw' }[]
  ended: boolean
  verdict: string | null
  waitingForOpponent?: boolean
  showScoreFlash?: 'A' | 'B' | null
  scoreFlashAt?: number
  roundProgress?: number | null  // 0..1 durante il conto alla rovescia post-round
}

export interface AigoraChatProps {
  allowedAis?: string[]
  userPlan?: string
  userName?: string
  userEmail?: string
}
