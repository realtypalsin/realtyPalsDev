// backend/src/lib/ai/sanitize.ts
// Protects against prompt injection attacks (OWASP LLM01).
// Filters known jailbreak patterns before messages reach the LLM.

const JAILBREAK_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+|previous\s+|your\s+)*(?:system\s+|prior\s+)?instructions/i,
  /you\s+are\s+now\s+(a\s+|an\s+)?(?!real estate|property|advisor)/i,
  /disregard\s+(your\s+|the\s+)?(system\s+|prior\s+|previous\s+)?prompt/i,
  /repeat\s+(the\s+|your\s+|above\s+|following\s+)(text|prompt|instructions)/i,
  /\bDAN\b|\bACT\s+AS\b/i,
  /pretend\s+you\s+(are|have\s+no)/i,
  /override\s+(your\s+)?(programming|training|instructions)/i,
  /what\s+(is|are)\s+your\s+system\s+prompt/i,
  /reveal\s+(your\s+)?(system|internal)\s+(prompt|instructions)/i,
]

const MAX_MESSAGE_LENGTH = 2000

/**
 * Sanitizes a user message before it is sent to the LLM.
 * - Removes jailbreak patterns
 * - Caps message length
 * Returns the sanitized message, or a safe placeholder if the message was blocked.
 */
export function sanitizeUserMessage(message: string): { safe: string; blocked: boolean } {
  const trimmed = message.trim().slice(0, MAX_MESSAGE_LENGTH)

  for (const pattern of JAILBREAK_PATTERNS) {
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
