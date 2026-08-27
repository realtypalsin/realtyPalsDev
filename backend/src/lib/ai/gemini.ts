// backend/src/lib/ai/gemini.ts
import { GoogleGenAI } from '@google/genai'
import { MODELS, GEMINI_TOOLS_ENABLED } from '../config'
import { toGeminiTools, validateToolArgs, capToolResult } from './tools'
import { INFERENCE_DEFAULTS, type InferenceConfig } from './openai'
import { recordUsage } from './cost'

type Message = { role: 'system' | 'user' | 'assistant' | 'tool'; content: string | null }
type SendFn = (event: string, data: Record<string, unknown>) => void
type ToolCallFn = (name: string, args: Record<string, unknown>) => Promise<unknown>

const MAX_TOOL_CYCLES = 3

// Tight initial timeout for fast rollover if provider is stalled/rate-limited,
// and reasonable stream inactivity timeout between chunks.
const INITIAL_TOKEN_TIMEOUT_MS = 8_000
const STREAM_INACTIVITY_MS = 15_000

// Thrown when the stream stalls (no chunk within timeout) or produces nothing.
// tokensSent indicates whether partial content was already sent to the SSE client —
// callers use this the same way as openai.ts's StreamStallError: clean fallback
// to the next provider (false) vs error-and-close (true).
export class GeminiStreamStallError extends Error {
  tokensSent: boolean
  constructor(message: string, tokensSent: boolean) {
    super(message)
    this.name = 'GeminiStreamStallError'
    this.tokensSent = tokensSent
  }
}

// Accumulated token usage across all tool cycles of one streamWithGemini call.
// Gemini reports usageMetadata on stream chunks (populated on the final chunk);
// promptTokenCount already INCLUDES cachedContentTokenCount, so the uncached
// billable input is promptTokenCount - cachedContentTokenCount.
interface GeminiUsage {
  promptTokens: number
  completionTokens: number
  cachedTokens: number
}

// Gemini's `contents` shape only knows 'user' and 'model' roles — system prompt
// goes in systemInstruction separately, and our 'tool' role turns are injected
// directly as functionResponse parts by the tool-call cycle below, not via this map.
interface GeminiContent {
  role: 'user' | 'model'
  parts: Array<{ text?: string; functionCall?: any; functionResponse?: any }>
}

export function toGeminiContents(messages: Message[]): GeminiContent[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content ?? '' }],
    }))
}

export async function streamWithGemini(
  system: string,
  messages: Message[],
  send: SendFn,
  onToolCall: ToolCallFn,
  config: InferenceConfig = INFERENCE_DEFAULTS,
  apiKeyOverride?: string,
  userId?: string | null,
  sessionId?: string | null,
): Promise<string> {
  const apiKey = apiKeyOverride ?? process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('No GEMINI_API_KEY configured')
  const client = new GoogleGenAI({ apiKey, httpOptions: { timeout: STREAM_INACTIVITY_MS } })
  const contents: GeminiContent[] = toGeminiContents(messages)
  let fullText = ''
  const usage: GeminiUsage = { promptTokens: 0, completionTokens: 0, cachedTokens: 0 }
  let billedModel = config.model || MODELS.GEMINI_MAIN

  async function runCycle(cycle: number): Promise<string> {
    if (cycle >= MAX_TOOL_CYCLES) return fullText

    let tokensSentThisCycle = false
    let sawAnyChunk = false
    let stalled = false
    let inactivityTimer: NodeJS.Timeout | null = null
    const cycleUsage: GeminiUsage = { promptTokens: 0, completionTokens: 0, cachedTokens: 0 }

    // The timer must abort the request, not just flip a flag: the flag was only
    // read inside the `for await` loop, which is exactly what is blocked when no
    // chunk arrives. That made the 8s initial deadline unreachable — failover
    // waited on the 15s transport timeout instead.
    const abortController = new AbortController()

    const resetInactivity = (isStreaming = false) => {
      if (inactivityTimer) clearTimeout(inactivityTimer)
      const timeoutMs = isStreaming ? STREAM_INACTIVITY_MS : INITIAL_TOKEN_TIMEOUT_MS
      inactivityTimer = setTimeout(() => {
        stalled = true
        console.warn(`[gemini] inactivity timeout cycle=${cycle} tokensSent=${tokensSentThisCycle} (after ${timeoutMs}ms)`)
        abortController.abort()
      }, timeoutMs)
    }
    resetInactivity(false)

    let functionCall: { name: string; args: Record<string, unknown> } | null = null

    try {
      const genConfig: any = {
        systemInstruction: system,
        maxOutputTokens: config.maxTokens,
        abortSignal: abortController.signal,
      }

      // Reads the same constant FALLBACK_CHAIN uses for supportsTools, so the tool
      // definitions and the system prompt can never disagree about whether tools exist.
      //
      // Tools stay attached across cycles rather than only the first. Attaching
      // them on cycle 0 alone capped a turn at exactly one lookup, so "compare the
      // payment plans and the cost sheet" could answer only half the question and
      // had to guess or decline the rest. The cycle ceiling prevents a runaway
      // loop; withholding the tools was never the right mechanism for that.
      //
      // The LAST allowed cycle is deliberately tool-free. runCycle returns early
      // at MAX_TOOL_CYCLES, so a tool call made on the final cycle would be
      // executed and then thrown away without ever reaching the model — the
      // buyer would wait for a lookup whose result was silently discarded.
      if (cycle < MAX_TOOL_CYCLES - 1 && GEMINI_TOOLS_ENABLED) {
        genConfig.tools = toGeminiTools()
      }

      const targetModel = config.model || MODELS.GEMINI_MAIN
      if (process.env.DEBUG_FALLBACK) {
        console.log(`[gemini] requesting model=${targetModel}`)
      }
      let stream: any
      try {
        stream = await client.models.generateContentStream({
          model: targetModel,
          contents,
          config: genConfig,
        })
      } catch (err: any) {
        if (stalled) throw err
        const errMsg = err?.message || String(err)
        if (errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('no longer available')) {
          const fallbackModel = targetModel === 'gemini-3.5-flash-lite' ? 'gemini-3.6-flash' : 'gemini-3.5-flash-lite'
          console.warn(`[gemini] Model '${targetModel}' failed (${errMsg.slice(0, 120)}...). Retrying with '${fallbackModel}'...`)
          // Restart the first-token clock: the retry is a fresh request, and the
          // dead model's latency should not be charged against its deadline.
          resetInactivity(false)
          stream = await client.models.generateContentStream({
            model: fallbackModel,
            contents,
            config: genConfig,
          })
          billedModel = fallbackModel
        } else {
          throw err
        }
      }

      for await (const chunk of stream) {
        sawAnyChunk = true
        resetInactivity(true)
        if (stalled) break

        // usageMetadata is populated on the final chunk; later chunks supersede
        // earlier ones for the same cycle, so overwrite-then-accumulate per cycle.
        const um = chunk.usageMetadata
        if (um) {
          cycleUsage.promptTokens = um.promptTokenCount ?? 0
          cycleUsage.completionTokens = um.candidatesTokenCount ?? 0
          cycleUsage.cachedTokens = um.cachedContentTokenCount ?? 0
        }

        if (chunk.text) {
          fullText += chunk.text
          tokensSentThisCycle = true
          send('token', { token: chunk.text })
        }

        const calls = chunk.functionCalls
        if (calls && calls.length > 0 && !functionCall) {
          functionCall = { name: calls[0].name!, args: (calls[0].args as Record<string, unknown>) ?? {} }
        }
      }
    } catch (err) {
      // Our own timeout aborted the request — report it as a stall so callers
      // roll over to the next provider instead of treating it as a hard error.
      if (!stalled) throw err
    } finally {
      if (inactivityTimer) clearTimeout(inactivityTimer)
      // Each tool cycle is a separate billed request — sum them.
      usage.promptTokens += cycleUsage.promptTokens
      usage.completionTokens += cycleUsage.completionTokens
      usage.cachedTokens += cycleUsage.cachedTokens
    }

    if (stalled) {
      throw new GeminiStreamStallError(`Gemini stream stalled — no chunk within timeout (${tokensSentThisCycle ? STREAM_INACTIVITY_MS : INITIAL_TOKEN_TIMEOUT_MS}ms)`, tokensSentThisCycle)
    }
    if (!sawAnyChunk) {
      throw new GeminiStreamStallError('Gemini stream produced no chunks', false)
    }

    // Mirrors the attach condition above: a call can only arrive on a cycle that
    // was given tools, and its result must have a later cycle to be read in.
    if (functionCall && cycle < MAX_TOOL_CYCLES - 1) {
      const validatedArgs = validateToolArgs(functionCall.name, functionCall.args)
      const result = await onToolCall(functionCall.name, validatedArgs)
      const capped = capToolResult(result, functionCall.name)

      contents.push({ role: 'model', parts: [{ functionCall: { name: functionCall.name, args: functionCall.args } }] })
      contents.push({ role: 'user', parts: [{ functionResponse: { name: functionCall.name, response: { result: capped } } }] })

      return runCycle(cycle + 1)
    }

    return fullText
  }

  try {
    return await runCycle(0)
  } finally {
    // Gemini is the paid primary — without this, recordUsage only ever saw
    // Groq/OpenAI traffic and isOverDailyBudget read $0 for every Gemini user.
    // Recorded in `finally` so a mid-stream stall still bills what was consumed.
    if (usage.promptTokens > 0 || usage.completionTokens > 0) {
      const uncachedPromptTokens = Math.max(0, usage.promptTokens - usage.cachedTokens)
      if (usage.cachedTokens > 0) {
        const pct = ((usage.cachedTokens / usage.promptTokens) * 100).toFixed(1)
        console.log(`[gemini:cache] ${usage.cachedTokens}/${usage.promptTokens} prompt tokens served from cache (${pct}%)`)
      } else {
        console.log(`[gemini:cache] no cache hit — ${usage.promptTokens} prompt tokens billed at full rate`)
      }
      void recordUsage({
        provider: 'gemini',
        model: billedModel,
        // Cached input tokens bill at a discount; charge them at 25% by
        // folding the discounted remainder into the uncached count.
        promptTokens: uncachedPromptTokens + Math.round(usage.cachedTokens * 0.25),
        completionTokens: usage.completionTokens,
        endpoint: 'chat',
        userId,
        sessionId,
      })
    }
  }
}
