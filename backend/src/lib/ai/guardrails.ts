export interface GuardrailViolation {
  type: 'prompt_injection' | 'competitor_mention' | 'upreraprj_hallucination' | 'investment_claim'
  detail: string
}

export interface GuardrailResult {
  blocked: boolean
  reason?: string
  confidence: number
  violations: GuardrailViolation[]
}

// Observe mode: violations are logged but responses are never blocked.
// Flip to false only after false-positive rate is confirmed acceptable in production.
const OUTPUT_OBSERVE_MODE = false

export async function inputGuardrail(message: string): Promise<GuardrailResult> {
  const injectionPatterns = [
    /ignore (the )?(previous|above|all|prior) (instructions|prompts?|rules)/i,
    /disregard (the )?(previous|above|all|prior)/i,
    /you are now (a|an|the)?/i,
    /(reveal|print|show|repeat|output|quote) (your|the|entire) (system )?(prompt|instructions|document|context)/i,
    /quote (the )?entire document/i,
    /print.{0,100}(first|last|entire).{0,50}(lines|section|document)/i,
    /print.{0,100}(context|document|system prompt|instructions)/i,
    /forget (everything|all|your instructions)/i,
    /pretend (you are|to be)/i,
    /what (is|was|did you use) (the|your) (context|document|system prompt|instructions)/i,
  ]

  if (injectionPatterns.some(p => p.test(message))) {
    return {
      blocked: true,
      reason: 'prompt_injection',
      confidence: 0.9,
      violations: [{ type: 'prompt_injection', detail: 'injection pattern matched in user message' }],
    }
  }

  // NOTE: We intentionally do NOT block on PII-shaped patterns (Aadhaar/PAN/phone).
  // A buyer pasting a phone number, a budget like "1.5", or any 12-digit string is
  // legitimate; hard-blocking it dead-ends real conversations. PII handling belongs
  // in log redaction, not in a user-facing block.
  return { blocked: false, confidence: 0, violations: [] }
}

// Extract UPRERAPRJ registration numbers from arbitrary text.
function extractReraNumbers(text: string): Set<string> {
  const matches = text.match(/UPRERAPRJ\d+/gi) ?? []
  return new Set(matches.map(m => m.toUpperCase()))
}

// Patterns indicating fabricated investment return claims.
// Designed to avoid false positives on legitimate advice (stamp duty %, GST %, EMI rates).
const INVESTMENT_CLAIM_PATTERNS = [
  /\d+(\.\d+)?%\s*(appreciation|returns?|yield|CAGR|growth rate)/i,
  /CAGR\s+(of\s+)?\d+(\.\d+)?%?/i,
  /double[sd]?\s+(in\s+)?\d+\s*years?/i,
  /appreciat(es?|ed|ion)\s+(by\s+)?\d+(\.\d+)?%/i,
  /\d+(\.\d+)?%\s*ROI/i,
  /returns?\s+of\s+\d+(\.\d+)?%/i,
]

/**
 * Checks AI response for policy violations.
 *
 * @param response - The AI-generated response text.
 * @param systemPrompt - The system prompt sent to the model. Used for UPRERAPRJ cross-check.
 *
 * OUTPUT_OBSERVE_MODE = true: all violations are logged, none block the response.
 * When observe mode is disabled, competitor_mention becomes a blocking violation.
 */
export async function outputGuardrail(
  response: string,
  systemPrompt?: string,
): Promise<GuardrailResult> {
  const violations: GuardrailViolation[] = []

  // Check if response is leaking system prompt/context (fallback protection)
  if (systemPrompt) {
    const keyMarkers = [
      /realtypals (ai |data |behavior |communication )/i,
      /hard rule|strong rule/i,
      /fallback mode/i,
      /prohibited|never invent|never share/i,
    ]
    for (const marker of keyMarkers) {
      if (marker.test(response) && marker.test(systemPrompt)) {
        violations.push({
          type: 'prompt_injection',
          detail: 'response contains system prompt content — blocked',
        })
        break
      }
    }
  }

  // Competitor mention check
  const competitorPatterns: Array<{ pattern: RegExp; name: string }> = [
    { pattern: /magicbricks/i, name: 'MagicBricks' },
    { pattern: /99acres/i, name: '99acres' },
    { pattern: /housing\.com/i, name: 'Housing.com' },
    { pattern: /nobroker/i, name: 'NoBroker' },
  ]
  for (const { pattern, name } of competitorPatterns) {
    if (pattern.test(response)) {
      violations.push({ type: 'competitor_mention', detail: `competitor "${name}" appeared in response` })
    }
  }

  // UPRERAPRJ hallucination check — any RERA number in the response must have been
  // present in the system prompt block. Numbers not injected from the DB are fabrications.
  if (systemPrompt) {
    const inResponse = extractReraNumbers(response)
    const inPrompt   = extractReraNumbers(systemPrompt)
    for (const num of inResponse) {
      if (!inPrompt.has(num)) {
        violations.push({
          type: 'upreraprj_hallucination',
          detail: `${num} appears in response but was not in system prompt — possible fabrication`,
        })
      }
    }
  }

  // Investment return claim check (observe only — false positive risk on edge cases).
  // Patterns target explicit percentage claims, CAGR, and doubling-time assertions.
  for (const pattern of INVESTMENT_CLAIM_PATTERNS) {
    if (pattern.test(response)) {
      violations.push({
        type: 'investment_claim',
        detail: `investment return pattern matched: ${pattern.source.slice(0, 80)}`,
      })
      break // one violation per category is enough
    }
  }

  if (violations.length === 0) {
    return { blocked: false, confidence: 0, violations: [] }
  }

  // In observe mode: log everything, block nothing.
  // Block violations: prompt_injection (always), competitor_mention (when not observe mode)
  const blocked = OUTPUT_OBSERVE_MODE
    ? false
    : violations.some(v => v.type === 'prompt_injection' || v.type === 'competitor_mention')

  return {
    blocked,
    reason: violations[0].type,
    confidence: 0.9,
    violations,
  }
}
