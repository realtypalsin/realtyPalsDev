import { encodingForModel } from 'js-tiktoken'

const ENCODING = encodingForModel('gpt-4')
const TOKEN_BUFFER = 500 // 500-token safety margin

export function estimateTokensReal(text: string): number {
  try {
    return ENCODING.encode(text).length
  } catch {
    // Fallback for edge cases
    return Math.ceil(text.length / 4)
  }
}

export function estimateTokensWithBuffer(text: string): number {
  return estimateTokensReal(text) + TOKEN_BUFFER
}

export function getTokenBudget(safeTokenCeiling: number): {
  systemPromptBudget: number
  messageBudget: number
  totalAvailable: number
} {
  return {
    systemPromptBudget: Math.floor(safeTokenCeiling * 0.4),
    messageBudget: Math.floor(safeTokenCeiling * 0.6),
    totalAvailable: safeTokenCeiling,
  }
}
