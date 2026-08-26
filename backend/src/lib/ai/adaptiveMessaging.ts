// Adaptive message capping: keep messages until approaching token ceiling
import { estimateTokensReal } from './tokenizer'

/**
 * Total input context window we are willing to fill on any provider.
 * This is an INPUT ceiling. Do not confuse it with an output `maxTokens`
 * (see DISCOVERY.MAX_TOKENS_RESPONSE) — mixing the two collapses history.
 */
export const CONTEXT_TOKEN_CEILING = 100_000

export interface AdaptiveCapResult {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  messageCount: number
  estimatedTokens: number
  cappedAt: number
}

export function adaptiveCapMessages(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPromptTokens: number,
  /**
   * Total INPUT context window to fit inside — NOT the output `maxTokens`.
   * Passing an output limit here (e.g. 3000) makes messageBudget negative and
   * silently collapses every request to the last 2 messages.
   */
  contextTokenCeiling: number,
  /** Output tokens to reserve for the model's reply. */
  responseTokenReserve: number = 3000,
  projectContextTokens: number = 500 // rough estimate for project data
): AdaptiveCapResult {
  const messageBudget = contextTokenCeiling - systemPromptTokens - projectContextTokens - responseTokenReserve

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
