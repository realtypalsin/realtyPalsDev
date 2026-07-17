import { INJECTION_PATTERNS, COMPETITOR_PATTERNS } from './patterns'

export interface GuardrailViolation {
  type: 'prompt_injection' | 'competitor_mention' | 'upreraprj_hallucination' | 'investment_claim' | 'price_fabrication' | 'name_fabrication'
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
  if (INJECTION_PATTERNS.some(p => p.test(message))) {
    return {
      blocked: true,
      reason: 'prompt_injection',
      confidence: 1.0,
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
  /\b\d{1,3}%?\s*(?:returns?|cagr|roi|appreciation)\b/i,
  /\b(?:double|triple)\s+your\s+money\b/i,
  /\b(?:guaranteed|assured)\s+returns?\b/i,
]

const EXTERNAL_URL_PATTERNS = [
  /https?:\/\/(?![\w-]+\.uirealtypals\.com|uirealtypals\.com|[\w-]+\.up-rera\.in|up-rera\.in)[^\s"]+/i,
  /www\.(?!uirealtypals\.com|up-rera\.in)[^\s"]+/i
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
  for (const { pattern, name } of COMPETITOR_PATTERNS) {
    if (pattern.test(response)) {
      violations.push({ type: 'competitor_mention', detail: `competitor "${name}" appeared in response` })
    }
  }

  // Block responses containing external real estate portal URLs
  const EXTERNAL_URL_PATTERNS = [
    /https?:\/\/(?!realtypals\.in)[a-z0-9-]+\.(in|com)\/[\w-/]+/i,
  ]
  for (const p of EXTERNAL_URL_PATTERNS) {
    if (p.test(response)) {
      violations.push({ type: 'competitor_mention', detail: 'external URL in response' })
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

  // Price/name fact-check gate: extract project-name-like phrases and ₹/price figures.
  // Only validate against systemPrompt context (verified DB data). Allowlist approach:
  // any project name or price not present in the prompt is flagged as fabrication.
  if (systemPrompt) {
    // Extract project names (capitalized phrases, often in quotes or after "project")
    const projectNamePattern = /(?:(?:project|properties?|developments?)\s+(?:called\s+)?)?["']?([A-Z][A-Za-z0-9\s&-]*(?:(?:Heights|Towers|City|Plaza|Square|Park|Garden|Grove|Residence|Residences|Court|Manor|Enclave|Hub|Complex|Villas|Apartments|Suites)))["']?/g
    const namesInResponse = new Set<string>()
    let match
    while ((match = projectNamePattern.exec(response)) !== null) {
      namesInResponse.add(match[1].trim())
    }

    // Extract prices: ₹XXL, ₹XX Cr, ₹XX Lakh, XXL, XX Cr patterns
    const pricePattern = /₹?\s*(\d+(?:\.\d+)?)\s*(?:crore|cr|lakh|l|lacks)(?:\s*(?:rupees?|inr))?/gi
    const pricesInResponse = new Set<string>()
    while ((match = pricePattern.exec(response)) !== null) {
      pricesInResponse.add(match[0].trim())
    }

    // Extract BHK patterns: "4BHK", "3 BHK", etc.
    const bhkPattern = /(\d)\s*(?:BHK|bhk|bed\s*room|bedroom)/gi
    const bhksInResponse = new Set<string>()
    while ((match = bhkPattern.exec(response)) !== null) {
      bhksInResponse.add(match[0].trim())
    }

    // Check if extracted values are in the systemPrompt (allowlist)
    for (const name of namesInResponse) {
      if (systemPrompt.length > 0 && !systemPrompt.toUpperCase().includes(name.toUpperCase())) {
        violations.push({
          type: 'name_fabrication',
          detail: `project name "${name}" appears in response but not in verified context`,
        })
      }
    }

    // Check prices similarly (more lenient: accept if format is seen, even if exact price varies slightly)
    for (const price of pricesInResponse) {
      // Only flag if the response mentions a very specific price point that wasn't in the prompt
      const priceNum = price.match(/\d+(?:\.\d+)?/)?.join('')
      if (priceNum && systemPrompt.length > 0 && !systemPrompt.includes(priceNum)) {
        // Be conservative: only flag obvious fabrications (e.g., "₹50L in Sector 150" where 50L doesn't exist)
        // Allow generic price advice without exact numbers
        const isGenericAdvice = /around|approximately|typically|generally|usually|roughly|estimate|ballpark/i.test(response)
        if (!isGenericAdvice && priceNum.length <= 2) { // likely a specific crore/lakh claim
          violations.push({
            type: 'price_fabrication',
            detail: `price point "${price}" appears in response but not in verified context`,
          })
        }
      }
    }
  }

  if (violations.length === 0) {
    // Check for external URLs separately
    for (const pattern of EXTERNAL_URL_PATTERNS) {
      if (pattern.test(response)) {
        violations.push({
          type: 'prompt_injection', // Or a new type 'external_link' if preferred, using prompt_injection to block it
          detail: `blocked external URL`,
        })
        break
      }
    }
  }

  if (violations.length === 0) {
    return { blocked: false, confidence: 0, violations: [] }
  }

  // In observe mode: log everything, block nothing.
  // Block violations: prompt_injection (always), competitor_mention (when not observe mode),
  // upreraprj_hallucination (always), price_fabrication (always), name_fabrication (always)
  const blocked = OUTPUT_OBSERVE_MODE
    ? false
    : violations.some(v =>
        v.type === 'prompt_injection' ||
        v.type === 'competitor_mention' ||
        v.type === 'upreraprj_hallucination' ||
        v.type === 'price_fabrication' ||
        v.type === 'name_fabrication'
      )

  return {
    blocked,
    reason: violations[0].type,
    confidence: 0.9,
    violations,
  }
}
