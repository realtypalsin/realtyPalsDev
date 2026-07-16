// backend/src/lib/ai/sanitize.ts
// Protects against prompt injection attacks (OWASP LLM01).
// Filters known jailbreak patterns before messages reach the LLM.

import { INJECTION_PATTERNS } from './patterns'

const MAX_MESSAGE_LENGTH = 2000

/**
 * Sanitizes a user message before it is sent to the LLM.
 * - Removes jailbreak patterns
 * - Caps message length
 * Returns the sanitized message, or a safe placeholder if the message was blocked.
 */
export function sanitizeUserMessage(message: string): { safe: string; blocked: boolean } {
  // Step 1: Normalize unicode to NFC to catch homoglyph attacks
  // This converts ᵢɡnore → ignore so our patterns work correctly
  const normalized = message.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  
  // Step 2: Remove zero-width characters used to break pattern detection
  const cleaned = normalized.replace(/[\u200B-\u200D\uFEFF\u2060]/g, '')
  
  const trimmed = cleaned.trim().slice(0, MAX_MESSAGE_LENGTH)

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      console.warn('[sanitize] Blocked potential jailbreak attempt:', trimmed.slice(0, 100))
      return {
        safe: "[Message filtered: Please ask about properties, builders, or real estate in India.]",
        blocked: true,
      }
    }
  }

  return { safe: trimmed, blocked: false }
}
