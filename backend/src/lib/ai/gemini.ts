// backend/src/lib/ai/gemini.ts
import { GoogleGenAI } from '@google/genai'
import { MODELS } from '../config'
import { toGeminiTools, validateToolArgs, capToolResult } from './tools'
import { INFERENCE_DEFAULTS, type InferenceConfig } from './openai'

type Message = { role: 'system' | 'user' | 'assistant' | 'tool'; content: string | null }
type SendFn = (event: string, data: Record<string, unknown>) => void
type ToolCallFn = (name: string, args: Record<string, unknown>) => Promise<unknown>

const MAX_TOOL_CYCLES = 3

// Matches openai.ts's INACTIVITY_MS: generous enough for a slow tool call,
// tight enough to fail-fast on a genuine stall.
const INACTIVITY_MS = 60_000

// Thrown when the stream stalls (no chunk for INACTIVITY_MS) or produces nothing.
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

// Gemini's `contents` shape only knows 'user' and 'model' roles — system prompt
// goes in systemInstruction separately, and our 'tool' role turns are injected
// directly as functionResponse parts by the tool-call cycle below, not via this map.
export function toGeminiContents(messages: Message[]) {
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
): Promise<string> {
  const apiKey = apiKeyOverride ?? process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('No GEMINI_API_KEY configured')
  const client = new GoogleGenAI({ apiKey, httpOptions: { timeout: INACTIVITY_MS } })
  const contents: any[] = toGeminiContents(messages)
  let fullText = ''

  async function runCycle(cycle: number): Promise<string> {
    if (cycle >= MAX_TOOL_CYCLES) return fullText

    let tokensSentThisCycle = false
    let sawAnyChunk = false
    let stalled = false
    let inactivityTimer: NodeJS.Timeout | null = null

    const resetInactivity = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(() => {
        stalled = true
        console.warn('[gemini] inactivity timeout cycle=' + cycle + ' tokensSent=' + tokensSentThisCycle)
      }, INACTIVITY_MS)
    }
    resetInactivity()

    let functionCall: { name: string; args: Record<string, unknown> } | null = null

    try {
      const genConfig: any = {
        systemInstruction: system,
        maxOutputTokens: config.maxTokens,
      }

      // Only attach tools if explicitly requested and no functionCall cycles have occurred yet
      if (cycle === 0 && process.env.ENABLE_GEMINI_TOOLS === 'true') {
        genConfig.tools = toGeminiTools()
      }

      const stream = await client.models.generateContentStream({
        model: MODELS.GEMINI_MAIN,
        contents,
        config: genConfig,
      })

      for await (const chunk of stream) {
        sawAnyChunk = true
        resetInactivity()
        if (stalled) break

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
    } finally {
      if (inactivityTimer) clearTimeout(inactivityTimer)
    }

    if (stalled) {
      throw new GeminiStreamStallError('Gemini stream stalled — no chunk for ' + INACTIVITY_MS + 'ms', tokensSentThisCycle)
    }
    if (!sawAnyChunk) {
      throw new GeminiStreamStallError('Gemini stream produced no chunks', false)
    }

    if (functionCall) {
      const validatedArgs = validateToolArgs(functionCall.name, functionCall.args)
      const result = await onToolCall(functionCall.name, validatedArgs)
      const capped = capToolResult(result, functionCall.name)

      contents.push({ role: 'model', parts: [{ functionCall: { name: functionCall.name, args: functionCall.args } }] })
      contents.push({ role: 'user', parts: [{ functionResponse: { name: functionCall.name, response: { result: capped } } }] })

      return runCycle(cycle + 1)
    }

    return fullText
  }

  return runCycle(0)
}
