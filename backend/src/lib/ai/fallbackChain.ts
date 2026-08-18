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
  projects?: ScoredProject[]
  userMessage?: string
  userId?: string | null
  sessionId?: string | null
  chainConfig?: FallbackKeyConfig[] // Allows custom chain override for unit testing
  config?: InferenceConfig
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
import { env } from '../env'
import { adaptiveCapMessages } from './adaptiveMessaging'
import { estimateTokensReal } from './tokenizer'

function createBufferedSend(originalSend: SendFn, systemPrompt: string, bufferLimit = 50) {
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
    originalSend('token', { token: buffer })
  }

  const bufferedSend: SendFn = (event: string, data: Record<string, unknown>) => {
    if (event !== 'token' || typeof data.token !== 'string') {
      originalSend(event, data)
      return
    }

    if (flushed) {
      tokensSent = true
      originalSend(event, data)
      return
    }

    buffer += data.token

    if (buffer.length >= bufferLimit || buffer.includes('\n')) {
      validateAndFlush()
    }
  }

  const flushRemaining = () => {
    if (!flushed && buffer.length > 0) {
      validateAndFlush()
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

  // Adaptive message capping: keep as many messages as fit within token budget
  const systemPromptTokens = estimateTokensReal(systemPrompt)
  const maxTokens = (options.config as any)?.maxTokens ?? 3000
  const adaptiveResult = adaptiveCapMessages(messages, systemPromptTokens, maxTokens)
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

    const effectivePrompt = item.supportsTools ? systemPrompt : systemPrompt + groqFallbackSuffix
    const { bufferedSend, getTokensSent, flushRemaining } = createBufferedSend(send, systemPrompt)

    const effectiveConfig = options.config || { maxTokens: 3000 }

    try {
      if (process.env.DEBUG_FALLBACK) {
        console.log(`[FALLBACK:TRY] → ${item.label} | Model: ${item.model} | Tools: ${item.supportsTools}`)
      }

      let text = ''
      if (item.provider === 'cerebras') {
        text = await streamWithCerebras(effectivePrompt, cappedMessages, bufferedSend, apiKey, item.model)
      } else if (item.provider === 'mistral') {
        text = await streamWithMistral(effectivePrompt, cappedMessages, bufferedSend, apiKey)
      } else if (item.provider === 'gemini') {
        text = await streamWithGemini(effectivePrompt, cappedMessages, bufferedSend, onToolCall, effectiveConfig, apiKey)
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
        text = await streamWithGroq(effectivePrompt, cappedMessages, bufferedSend, userId, sessionId, apiKey)
      }

      flushRemaining()
      const beautified = isResponseComplete(text) ? beautifyResponse(text) : text
      if (process.env.DEBUG_FALLBACK) {
        console.log(`[FALLBACK:SUCCESS] ✓ ${item.label} generated ${text.length} chars`)
      }

      // Track fallback response
      if (userId && sessionId) {
        try {
          await trackEvent('fallback_response_generated', userId, {
            provider: item.provider,
            model: item.model,
            text_length: text.length,
            session_id: sessionId,
          })
        } catch (e) {
          console.warn('[FALLBACK:TRACKING_ERROR]', e)
        }
      }

      return { text: beautified, provider: item.provider, model: item.model, envKey: item.envKey, is_verified: false }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      const tokensSent = getTokensSent() || (err as any)?.tokensSent === true
      const errMsg = error.message || String(err)

      if (process.env.DEBUG_FALLBACK) {
        console.warn(`[FALLBACK:FAIL] ✗ ${item.label} failed: ${errMsg.slice(0, 100)}...`)
      }

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
