// backend/src/lib/ai/fallbackChain.ts
import { FALLBACK_CHAIN, FallbackKeyConfig } from '../config'
import { streamWithGemini } from './gemini'
import { streamWithOpenAI } from './openai'
import { streamWithGroq } from './groq'
import { streamWithCerebras } from './cerebras'
import { streamWithMistral } from './mistral'
import { beautifyResponse, isResponseComplete } from './responseBeautifier'
import type { ScoredProject } from '../discovery'

type Message = { role: 'user' | 'assistant'; content: string }
type SendFn = (event: string, data: Record<string, unknown>) => void
type ToolCallFn = (name: string, args: Record<string, unknown>) => Promise<unknown>

import type { InferenceConfig } from './openai'

export interface FallbackChainOptions {
  systemPrompt: string
  messages: Message[]
  send: SendFn
  onToolCall: ToolCallFn
  groqFallbackSuffix: string
  /** Builds the system prompt for a provider given whether it can call tools. */
  buildSystemPrompt?: (supportsTools: boolean) => string
  projects?: ScoredProject[]
  userMessage?: string
  userId?: string | null
  sessionId?: string | null
  chainConfig?: FallbackKeyConfig[] // Allows custom chain override for unit testing
  config?: InferenceConfig
  /** Drop any markdown table the model emits. */
  suppressTables?: boolean
}

export interface FallbackChainResult {
  text: string
  provider: string // Provider that succeeded (e.g. 'cerebras', 'mistral', 'groq', 'openai', 'gemini', 'database')
  model: string
  envKey: string
  is_verified: boolean // true if from verified database, false if from AI provider
}

import { validateAgainstFactsSync } from './guardrails-v2'
import { trackEvent } from '../monitoring/posthog'
import { isCoolingDown, cooldownReason, recordFailure, recordSuccess } from './providerCooldown'
import { env } from '../env'
import { adaptiveCapMessages, CONTEXT_TOKEN_CEILING } from './adaptiveMessaging'
import { STATIC_PREFIX_MARKER } from './systemPromptCache'
import { estimateTokensReal } from './tokenizer'
import { createTableStripper, stripTables } from './stripTables'
import { sanitizeOutput } from './sanitizeOutput'

/** Remove the prefix sentinel — it must never reach a provider. */
function stripMarker(prompt: string): string {
  return prompt.replace(`\n${STATIC_PREFIX_MARKER}\n`, '\n')
}

/** Splice the no-tools block into the stable prefix rather than appending it */
function applyNoToolsBlock(prompt: string, block: string): string {
  if (!block) return stripMarker(prompt)
  const token = `\n${STATIC_PREFIX_MARKER}\n`
  if (!prompt.includes(token)) return prompt + block
  return prompt.replace(token, `\n${block}\n`)
}

/** How much of the answer is held back before the first token reaches the buyer. */
const STREAM_BUFFER_CHARS = Number(process.env.STREAM_BUFFER_CHARS ?? 250)

/** Reply ceiling on a free-tier leg. */
const FREE_TIER_MAX_TOKENS = Number(process.env.FREE_TIER_MAX_TOKENS ?? 900)

function createBufferedSend(
  originalSend: SendFn,
  systemPrompt: string,
  bufferLimit = STREAM_BUFFER_CHARS,
  suppressTables = false,
) {
  // Sits between the buffer and the client, so it sees whole chunks and can
  // reassemble the lines a table is made of.
  const stripper = suppressTables
    ? createTableStripper((text) => originalSend('token', { token: text }))
    : null
  const forwardToken = (token: string) => {
    if (stripper) stripper.write(token)
    else originalSend('token', { token })
  }
  let buffer = ''
  let flushed = false
  let tokensSent = false

  const validateAndFlush = (forceFlush = false) => {
    if (!buffer.length) return
    const check = validateAgainstFactsSync(buffer, systemPrompt)
    if (check.blocked) {
      console.warn('[GUARDRAIL:PRE_FLUSH_PREVENTED_LEAK]', check.violations)
    }
    flushed = true
    tokensSent = true
    forwardToken(buffer)
  }

  const bufferedSend: SendFn = (event: string, data: Record<string, unknown>) => {
    if (event !== 'token' || typeof data.token !== 'string') {
      originalSend(event, data)
      return
    }

    if (flushed) {
      tokensSent = true
      forwardToken(data.token)
      return
    }

    buffer += data.token

    // Length only. The newline trigger that used to sit here closed the
    // failover window on the first line of every markdown answer.
    if (buffer.length >= bufferLimit) {
      validateAndFlush()
    }
  }

  const flushRemaining = () => {
    if (!flushed && buffer.length > 0) {
      validateAndFlush()
    }
    // The stripper holds a partial line, and possibly a heading it has not yet
    // decided about. Without this they never reach the buyer at all.
    if (stripper) {
      stripper.end()
      if (stripper.droppedAnything()) {
        console.log('[CHAT:TABLE_SUPPRESSED] model drew a table we had already rendered')
      }
    }
  }

  return { bufferedSend, getTokensSent: () => tokensSent, flushRemaining }
}

export async function executeWithFallbackChain(options: FallbackChainOptions): Promise<FallbackChainResult> {
  const {
    systemPrompt,
    messages,
    send,
    onToolCall,
    groqFallbackSuffix,
    projects = [],
    userMessage = '',
    userId,
    sessionId,
    chainConfig = FALLBACK_CHAIN,
  } = options

  // Feature flag: disable Gemini fallback if disabled (defaults to enabled)
  const enableGeminiFallback = env.ENABLE_GEMINI_FALLBACK === 'true'
  const effectiveChainConfig = enableGeminiFallback
    ? chainConfig
    : chainConfig.filter(item => item.provider !== 'gemini')

  // Adaptive message capping: keep as many messages as fit within the INPUT
  const systemPromptTokens = estimateTokensReal(systemPrompt)
  const responseReserve = options.config?.maxTokens ?? 3000
  const adaptiveResult = adaptiveCapMessages(
    messages,
    systemPromptTokens,
    CONTEXT_TOKEN_CEILING,
    responseReserve,
  )
  const cappedMessages = adaptiveResult.messages

  // Log chain initiation at info level
  if (process.env.DEBUG_FALLBACK) {
    console.log(`[FALLBACK:INIT] Starting fallback chain with ${effectiveChainConfig.length} providers`)
    console.log(`[FALLBACK:CONTEXT] Messages: ${adaptiveResult.messageCount}/${messages.length} (adaptive, ${adaptiveResult.estimatedTokens} tokens), SystemPrompt: ${systemPrompt.slice(0, 50)}...`)
    if (!enableGeminiFallback) console.log(`[FALLBACK:FEATURE_FLAG] Gemini fallback disabled`)
  }

  for (const item of effectiveChainConfig) {
    const apiKey = process.env[item.envKey]
    if (!apiKey) {
      console.log(`[FALLBACK:SKIP] ${item.label} (${item.envKey}) — no API key configured`)
      continue
    }

    // Skip a leg that recently failed for a reason retrying cannot fix — an
    const cooldownKey = `${item.envKey}:${item.model}`
    if (isCoolingDown(cooldownKey)) {
      console.log(`[FALLBACK:COOLDOWN] ${item.label} — skipping: ${cooldownReason(cooldownKey)}`)
      continue
    }

    const effectivePrompt = options.buildSystemPrompt
      ? stripMarker(options.buildSystemPrompt(item.supportsTools))
      : item.supportsTools
        ? stripMarker(systemPrompt)
        : applyNoToolsBlock(systemPrompt, groqFallbackSuffix)
    // Validate against the prompt this provider actually received, not the
    // pre-variant one — otherwise the fact-check reads a different tool section.
    const { bufferedSend, getTokensSent, flushRemaining } = createBufferedSend(send, effectivePrompt, undefined, options.suppressTables === true)

    const effectiveConfig = options.config || { maxTokens: 3000 }
    // Gemini ignores its FALLBACK_CHAIN item.model unless we thread it through here — without
    const legMaxTokens =
      item.tier === 'free'
        ? Math.min(effectiveConfig.maxTokens ?? 1500, FREE_TIER_MAX_TOKENS)
        : effectiveConfig.maxTokens

    const geminiConfig = {
      ...effectiveConfig,
      model: effectiveConfig.model ?? item.model,
      ...(item.apiVersion ? { apiVersion: item.apiVersion } : {}),
    }

    // A free-tier key is limited by tokens per minute and requests per day, not
    if (item.tier === 'free') {
      geminiConfig.thinkingBudget = 0
      geminiConfig.maxTokens = Math.min(geminiConfig.maxTokens ?? 1500, FREE_TIER_MAX_TOKENS)
    }

    try {
      if (process.env.DEBUG_FALLBACK) {
        const effectiveModel = item.provider === 'gemini' ? geminiConfig.model : item.model
        console.log(`[FALLBACK:TRY] → ${item.label} | Model: ${effectiveModel} | Tools: ${item.supportsTools}`)
      }

      let text = ''
      if (item.provider === 'cerebras') {
        text = await streamWithCerebras(effectivePrompt, cappedMessages, bufferedSend, apiKey, item.model, userId, sessionId, legMaxTokens)
      } else if (item.provider === 'mistral') {
        text = await streamWithMistral(effectivePrompt, cappedMessages, bufferedSend, apiKey, userId, sessionId, legMaxTokens)
      } else if (item.provider === 'gemini') {
        text = await streamWithGemini(effectivePrompt, cappedMessages, bufferedSend, onToolCall, geminiConfig, apiKey, userId, sessionId)
      } else if (item.provider === 'openai') {
        text = await streamWithOpenAI(
          effectivePrompt,
          cappedMessages,
          bufferedSend,
          onToolCall,
          effectiveConfig,
          userId,
          sessionId,
          apiKey,
        )
      } else if (item.provider === 'groq') {
        text = await streamWithGroq(effectivePrompt, cappedMessages, bufferedSend, userId, sessionId, apiKey, legMaxTokens)
      }

      flushRemaining()

      // An empty string is a failed turn, not a successful one.
      if (!text.trim() && !getTokensSent()) {
        throw new Error(`${item.label} returned no text`)
      }

      // The buyer saw the stripped stream, so the returned copy has to match:
      if (options.suppressTables) text = stripTables(text)
      // The buyer read the sanitised stream; the transcript and cache must match.
      text = sanitizeOutput(text).text

      const beautified = isResponseComplete(text) ? beautifyResponse(text) : text
      if (process.env.DEBUG_FALLBACK) {
        console.log(`[FALLBACK:SUCCESS] ✓ ${item.label} generated ${text.length} chars`)
      }

      // Track fallback response
      if (userId && sessionId) {
        try {
          // Signature is trackEvent(userId, event, properties) — these two were
          // swapped, so the event landed in PostHog with distinctId
          // "fallback_response_generated" and the user id as the event name.
          trackEvent(userId, 'fallback_response_generated', {
            provider: item.provider,
            model: item.model,
            text_length: text.length,
            session_id: sessionId,
          })
        } catch (e) {
          console.warn('[FALLBACK:TRACKING_ERROR]', e)
        }
      }

            // Answered — trust this leg again immediately, in case an earlier
      // durable failure was resolved (billing topped up, quota window reset).
      recordSuccess(cooldownKey)
      return { text: beautified, provider: item.provider, model: item.model, envKey: item.envKey, is_verified: false }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      const tokensSent = getTokensSent() || (err as any)?.tokensSent === true
      const errMsg = error.message || String(err)

      // Start a cooldown only when retrying cannot help. A timeout, a stall or a
      // 500 is exactly the case where the next turn should try this leg again —
      // cooling it down would remove capacity during the outage it should survive.
      const failureKind = recordFailure(cooldownKey, error)
      if (failureKind === 'durable') {
        console.warn(`[FALLBACK:DURABLE] ${item.label} — cooling down: ${errMsg.slice(0, 120)}`)
      }

      // Always logged, not gated on DEBUG_FALLBACK.
      console.warn(`[FALLBACK:FAIL] ✗ ${item.label} failed: ${errMsg.slice(0, 300)}`)

      // Mid-stream stall: partial tokens were already sent to the SSE client.
      // Cannot switch providers mid-stream without duplicating output/headers.
      // Close cleanly with truncation notice.
      if (tokensSent) {
        console.error(`[FALLBACK:MID_STREAM_STALL] ${item.label} stalled mid-stream after tokens sent`)
        console.error(`[FALLBACK:MID_STREAM_STALL] Cannot switch providers — context ${messages.length} msgs + prompt already streamed`)
        const truncationNotice = '\n\n[Response truncated due to high traffic. Please ask me to continue.]'
        send('token', { token: truncationNotice })
        return { text: truncationNotice, provider: 'database', model: 'fallback', envKey: 'FALLBACK_MODE', is_verified: true }
      }

      // Pre-first-token failure: seamless rollover to next provider with same context.
      // All data (messages, systemPrompt, userMessage) flows unchanged.
      console.log(`[FALLBACK:ROLLOVER] ${item.label} pre-token failure → transferring context to next provider`)
      console.log(`[FALLBACK:ROLLOVER] Context preserved: ${messages.length} msgs, ${userMessage.length} char user input`)
    }
  }

  // All providers failed or unconfigured — fallback to database response
  console.error('[FALLBACK:EXHAUSTED] All fallback chain providers exhausted or misconfigured')
  console.error(`[FALLBACK:EXHAUSTED] Total providers tried: ${chainConfig.length}, context: ${messages.length} messages`)

  let fallbackMessage = ''
  if (projects.length > 0) {
    const p = projects[0]
    if (userMessage.toLowerCase().includes('payment') || userMessage.toLowerCase().includes('plan')) {
      fallbackMessage = `Payment plan details for **${p.name}** are available on request. Flexible payment structures (including CLP and Down Payment) can be configured with our team. Connect with our RealtyPals team via **Book Site Visit** for custom payment slabs.\n\n*(Note: Our AI services are currently experiencing high traffic or are out of service. Please try your request again shortly or connect directly with our sales team.)*`
    } else {
      fallbackMessage = `Here are the verified details for **${p.name}** in ${p.sector}: Price range is ${p.price_range_label || 'available on request'}. Please review the property card.\n\n*(Note: Our AI services are currently experiencing high traffic or are out of service. Please try your request again shortly or connect directly with our team.)*`
    }
  } else {
    fallbackMessage = 'Our AI services are currently experiencing high traffic or are out of service. Please check back shortly or connect with our RealtyPals team directly via **Book Site Visit** or **Callback**.'
  }

  send('token', { token: fallbackMessage })
  return { text: fallbackMessage, provider: 'database', model: 'fallback', envKey: 'FALLBACK_MODE', is_verified: true }
}
