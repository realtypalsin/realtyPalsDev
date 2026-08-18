// Adaptive message capping: keep messages until approaching token ceiling
import { estimateTokensReal } from './tokenizer'

export interface AdaptiveCapResult {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  messageCount: number
  estimatedTokens: number
  cappedAt: number
}

export function adaptiveCapMessages(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPromptTokens: number,
  safeTokenCeiling: number,
  projectContextTokens: number = 500 // rough estimate for project data
): AdaptiveCapResult {
  const messageBudget = safeTokenCeiling - systemPromptTokens - projectContextTokens - 300 // 300 for response buffer

  let accumulatedTokens = 0
  let keepFromIndex = messages.length // start from end

  // Walk backwards from most recent message, accumulate tokens until budget exceeded
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokensReal(messages[i].content)
    if (accumulatedTokens + msgTokens <= messageBudget) {
      accumulatedTokens += msgTokens
      keepFromIndex = i
    } else {
      break
    }
  }

  // Ensure we keep at least 2 messages (1 dialogue turn) for context
  if (keepFromIndex > messages.length - 2) {
    keepFromIndex = Math.max(0, messages.length - 2)
  }

  const cappedMessages = messages.slice(keepFromIndex)

  return {
    messages: cappedMessages,
    messageCount: cappedMessages.length,
    estimatedTokens: accumulatedTokens,
    cappedAt: keepFromIndex,
  }
}
