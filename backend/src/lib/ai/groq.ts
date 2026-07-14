// backend/src/lib/ai/groq.ts
import Groq from 'groq-sdk'
import { MODELS } from '../config'

// ── Singleton (shared across routes) ──────────────────────────────────────────

let _groq: Groq | null = null

export function getGroq(): Groq {
  if (!_groq) {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set')
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY, maxRetries: 0 })
  }
  return _groq
}

// Proxy-based named export for callers that destructure `groq.chat.completions…`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const groq: Groq = new Proxy({} as Groq, {
  get(_target, prop) {
    return (getGroq() as any)[prop]
  },
})

type Message = { role: 'system' | 'user' | 'assistant'; content: string }
type SendFn = (event: string, data: Record<string, unknown>) => void

// Thrown when the Groq stream stalls (no chunk for INACTIVITY_MS) or headers
// never arrive. Parallel to StreamStallError in openai.ts.
// tokensSent: false  → clean error, no partial content in the SSE stream.
// tokensSent: true   → partial content already sent; outer catch must close
//                      cleanly (error event replaces partial text in the UI).
export class GroqStreamStallError extends Error {
  readonly tokensSent: boolean
  constructor(tokensSent: boolean) {
    super('Groq stream stalled')
    this.name = 'GroqStreamStallError'
    this.tokensSent = tokensSent
  }
}

// 60 seconds: same budget as OpenAI. Generous enough for a slow Llama 70b
// first-token latency; tight enough to fail-fast on a genuine stall.
const INACTIVITY_MS = 60_000

export async function streamWithGroq(
  system: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  send: SendFn
): Promise<string> {
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
    // No retries — inactivity timer owns all phases. A retry on a stalled
    // stream would only extend the hang before the timer fires.
    maxRetries: 0,
  })

  const msgs: Message[] = [
    { role: 'system', content: system },
    ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]

  // Per-request inactivity controller. Covers both the header phase (create() await)
  // and the body/chunk phase (for-await loop). Aborting it terminates the
  // underlying fetch connection, causing the SDK to throw in whichever phase is active.
  const inactivityController = new AbortController()
  let inactivityFired = false
  let inactivityTimer: NodeJS.Timeout | null = null
  let anyTokenSent = false

  const resetInactivity = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer)
    inactivityTimer = setTimeout(() => {
      inactivityFired = true
      console.warn('[groq] inactivity timeout anyTokenSent=' + anyTokenSent)
      inactivityController.abort()
    }, INACTIVITY_MS)
  }

  const clearInactivity = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer)
  }

  // Arm the timer before create() so a header stall is caught too.
  resetInactivity()

  console.log('[GROQ] START create()', Date.now(), { msgCount: msgs.length })

  let stream: Awaited<ReturnType<typeof groq.chat.completions.create>>
  try {
    stream = await groq.chat.completions.create(
      {
        model: MODELS.GROQ_SMART,
        messages: msgs,
        stream: true,
        max_tokens: 1024,
        temperature: 0.7,
      },
      // signal threads through the Groq SDK fetch — terminates connection AND
      // body reads when the inactivity timer fires.
      { signal: inactivityController.signal },
    )
  } catch (err) {
    clearInactivity()
    if (inactivityFired || inactivityController.signal.aborted) {
      throw new GroqStreamStallError(anyTokenSent)
    }
    throw err
  }

  console.log('[GROQ] END create() — stream object received', Date.now())

  // Headers received — reset timer to track body/chunk phase.
  resetInactivity()

  let fullText = ''
  let chunkCount = 0
  try {
    for await (const chunk of stream) {
      // Each chunk resets the timer — only a genuine silence triggers abort.
      resetInactivity()
      chunkCount++

      if (chunkCount === 1) {
        console.log('[GROQ] FIRST chunk received', Date.now())
      }

      const token = chunk.choices[0]?.delta?.content
      if (token) {
        fullText += token
        anyTokenSent = true
        
        if (
          /realtypals (ai |data |behavior |communication )/i.test(fullText) ||
          /hard rule|strong rule/i.test(fullText) ||
          /fallback mode/i.test(fullText) ||
          /prohibited|never invent|never share/i.test(fullText)
        ) {
          console.warn('[GROQ] Active Stream Filter: RAG Leak detected. Aborting.');
          send('token', { token: '\n\n[Response blocked by security policy]' });
          break;
        }

        send('token', { token })
      }
    }
  } catch (err) {
    clearInactivity()
    if (inactivityFired || inactivityController.signal.aborted) {
      throw new GroqStreamStallError(anyTokenSent)
    }
    throw err
  }

  clearInactivity()
  console.log('[GROQ] stream complete', Date.now(), { chunkCount, fullTextLen: fullText.length })
  return fullText
}
