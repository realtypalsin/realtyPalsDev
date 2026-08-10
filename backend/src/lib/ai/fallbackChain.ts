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
}

export interface FallbackChainResult {
  text: string
  provider: string // Provider that succeeded (e.g. 'cerebras', 'mistral', 'groq', 'openai', 'gemini')
  model: string
  envKey: string
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

  // Log chain initiation with context summary
  console.log(`[FALLBACK:INIT] Starting fallback chain with ${chainConfig.length} providers`)
  console.log(`[FALLBACK:CONTEXT] Messages: ${messages.length}, SystemPrompt: ${systemPrompt.slice(0, 50)}...`)
  console.log(`[FALLBACK:CONTEXT] UserMessage: "${userMessage.slice(0, 60)}..."`)

  for (const item of chainConfig) {
    const apiKey = process.env[item.envKey]
    if (!apiKey) {
      console.log(`[FALLBACK:SKIP] ${item.label} (${item.envKey}) — no API key configured`)
      continue
    }

    const effectivePrompt = item.supportsTools ? systemPrompt : systemPrompt + groqFallbackSuffix

    try {
      console.log(`[FALLBACK:TRY] → ${item.label} | Model: ${item.model} | Tools: ${item.supportsTools}`)
      console.log(`[FALLBACK:DATA] Passing ${messages.length} messages + ${systemPrompt.length} char prompt`)

      if (item.provider === 'cerebras') {
        const text = await streamWithCerebras(effectivePrompt, messages, send, apiKey)
        const beautified = isResponseComplete(text) ? beautifyResponse(text) : text
        console.log(`[FALLBACK:SUCCESS] ✓ ${item.label} generated ${text.length} chars`)
        return { text: beautified, provider: item.provider, model: item.model, envKey: item.envKey }
      }

      if (item.provider === 'mistral') {
        const text = await streamWithMistral(effectivePrompt, messages, send, apiKey)
        const beautified = isResponseComplete(text) ? beautifyResponse(text) : text
        console.log(`[FALLBACK:SUCCESS] ✓ ${item.label} generated ${text.length} chars`)
        return { text: beautified, provider: item.provider, model: item.model, envKey: item.envKey }
      }

      if (item.provider === 'gemini') {
        const text = await streamWithGemini(effectivePrompt, messages, send, onToolCall, undefined, apiKey)
        const beautified = isResponseComplete(text) ? beautifyResponse(text) : text
        console.log(`[FALLBACK:SUCCESS] ✓ ${item.label} generated ${text.length} chars`)
        return { text: beautified, provider: item.provider, model: item.model, envKey: item.envKey }
      }

      if (item.provider === 'openai') {
        const text = await streamWithOpenAI(
          effectivePrompt,
          messages,
          send,
          onToolCall,
          undefined,
          userId,
          sessionId,
          apiKey,
        )
        const beautified = isResponseComplete(text) ? beautifyResponse(text) : text
        console.log(`[FALLBACK:SUCCESS] ✓ ${item.label} generated ${text.length} chars`)
        return { text: beautified, provider: item.provider, model: item.model, envKey: item.envKey }
      }

      if (item.provider === 'groq') {
        const text = await streamWithGroq(effectivePrompt, messages, send, userId, sessionId, apiKey)
        const beautified = isResponseComplete(text) ? beautifyResponse(text) : text
        console.log(`[FALLBACK:SUCCESS] ✓ ${item.label} generated ${text.length} chars`)
        return { text: beautified, provider: item.provider, model: item.model, envKey: item.envKey }
      }
    } catch (err: any) {
      const tokensSent = err?.tokensSent === true
      const errMsg = err?.message || String(err)

      console.warn(`[FALLBACK:FAIL] ✗ ${item.label} failed: ${errMsg.slice(0, 100)}...`)

      // Mid-stream stall: partial tokens were already sent to the SSE client.
      // Cannot switch providers mid-stream without duplicating output/headers.
      // Close cleanly with truncation notice.
      if (tokensSent) {
        console.error(`[FALLBACK:MID_STREAM_STALL] ${item.label} stalled mid-stream after tokens sent`)
        console.error(`[FALLBACK:MID_STREAM_STALL] Cannot switch providers — context ${messages.length} msgs + prompt already streamed`)
        const truncationNotice = '\n\n[Response truncated due to high traffic. Please ask me to continue.]'
        send('token', { token: truncationNotice })
        return { text: truncationNotice, provider: 'database', model: 'fallback', envKey: 'FALLBACK_MODE' }
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
  return { text: fallbackMessage, provider: 'database', model: 'fallback', envKey: 'FALLBACK_MODE' }
}
