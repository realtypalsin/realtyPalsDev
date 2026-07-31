import OpenAI from 'openai';
import { MODELS } from '../config'
import { recordUsage } from './cost'
import { toOpenAITools, validateToolArgs, capToolResult } from './tools'

type Message = { role: 'system' | 'user' | 'assistant' | 'tool'; content: string | null; name?: string; tool_calls?: any[], tool_call_id?: string };
type SendFn = (event: string, data: Record<string, unknown>) => void;

const MAX_TOOL_CYCLES = 3;

// ── Inference configuration ───────────────────────────────────────────────────
// Centralise token limits so they can vary per request type without touching
// inference logic. All response types RealtyPals generates fit within 1500 tokens;
// the cap prevents runaway generation and unexpected billing surprises.
export interface InferenceConfig {
  maxTokens: number
}

export const INFERENCE_DEFAULTS: InferenceConfig = {
  maxTokens: 1500,
}

// Thrown when the stream stalls (no chunk for INACTIVITY_MS) or headers never arrive.
// tokensSent indicates whether partial content was already sent to the SSE client.
// Callers use this to decide: clean Groq fallback (false) vs error-and-close (true).
export class StreamStallError extends Error {
  readonly tokensSent: boolean
  constructor(tokensSent: boolean) {
    super('OpenAI stream stalled')
    this.name = 'StreamStallError'
    this.tokensSent = tokensSent
  }
}

// 30 seconds: generous enough for a slow tool call response, tight enough
// to fail-fast on a genuine GitHub Models body stall.
const INACTIVITY_MS = 60_000;

export async function streamWithOpenAI(
  system: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  send: SendFn,
  onToolCall: (name: string, args: any) => Promise<any>,
  config: InferenceConfig = INFERENCE_DEFAULTS,
  userId?: string | null,
  sessionId?: string | null,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const isGitHubPat = apiKey?.startsWith('github_pat_');
  const baseURL = process.env.OPENAI_BASE_URL || (isGitHubPat ? 'https://models.inference.ai.azure.com' : undefined);

  const client = new OpenAI({
    apiKey,
    baseURL,
    // No SDK-level timeout — inactivity timer owns all phases including body reads.
    // No retries — a retry on a stalled stream extends the hang; inactivity timer handles it.
    maxRetries: 0,
  });

  const msgs: any[] = [
    { role: 'system', content: system },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = toOpenAITools();

  let fullText = '';
  // Tracks whether any token has been sent to the SSE client in this call.
  // Used by StreamStallError so the caller knows whether a clean Groq fallback
  // is possible (false) or whether partial content was already sent (true).
  let anyTokenSent = false;

  async function runCompletion(currentMsgs: Message[], cycle: number): Promise<string> {
    const allowTools = cycle < MAX_TOOL_CYCLES;

    // Per-cycle inactivity controller. Covers both the header phase (create() await)
    // and the body/chunk phase (for-await loop). A single timer reset on each chunk
    // ensures a stall at any point — pre-first-chunk or mid-stream — is caught.
    const inactivityController = new AbortController();
    let inactivityFired = false;
    let inactivityTimer: NodeJS.Timeout | null = null;

    const resetInactivity = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        inactivityFired = true;
        console.warn('[openai] inactivity timeout cycle=' + cycle + ' anyTokenSent=' + anyTokenSent);
        inactivityController.abort();
      }, INACTIVITY_MS);
    };

    const clearInactivity = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
    };

    // Start the timer before create() — covers header stall on GitHub Models.
    resetInactivity();

    console.log('[OPENAI] START create() cycle=' + cycle, Date.now(), { allowTools, msgCount: currentMsgs.length });

    // Use MAIN model when tools needed (larger context window for gpt-4o vs gpt-4o-mini 8KB limit)
    const model = allowTools ? MODELS.MAIN : MODELS.FALLBACK;

    // Absolute wall-clock deadline for the entire turn (120s max)
    const turnDeadline = Date.now() + 120_000;
    let deadlineExceeded = false;

    let stream: Awaited<ReturnType<typeof client.chat.completions.create>>;
    try {
      stream = await client.chat.completions.create(
        {
          model,
          messages: currentMsgs as any,
          ...(allowTools ? { tools } : {}),
          stream: true,
          stream_options: { include_usage: true },
          max_tokens: config.maxTokens,
        },
        // Signal threads through fetchWithTimeout AND the response body/stream.
        // Aborting it terminates both connection phase and in-progress chunk reads.
        { signal: inactivityController.signal },
      );
    } catch (err) {
      clearInactivity();
      if (inactivityFired || inactivityController.signal.aborted) {
        throw new StreamStallError(anyTokenSent);
      }
      throw err;
    }

    console.log('[OPENAI] END create() — stream object received cycle=' + cycle, Date.now());

    // Reset after headers arrive — now tracking body/chunk phase.
    resetInactivity();

    let toolCallName = '';
    let toolCallArgs = '';
    let toolCallId = '';
    let chunkCount = 0;
    let usage: { prompt_tokens?: number; completion_tokens?: number } | undefined;

    try {
      for await (const chunk of stream) {
        // Each chunk resets the inactivity timer — only a genuine silence triggers abort.
        resetInactivity();

        // Absolute deadline check — abort if turn exceeds 120s wall-clock
        if (Date.now() > turnDeadline) {
          console.warn('[OPENAI] Turn deadline exceeded (>120s). Aborting.');
          deadlineExceeded = true;
          inactivityController.abort();
          break;
        }

        chunkCount++;

        if (chunkCount === 1) {
          console.log('[OPENAI] FIRST chunk received cycle=' + cycle, Date.now());
        }
        if (chunkCount % 10 === 0) {
          console.log('[OPENAI] chunk #' + chunkCount + ' cycle=' + cycle, Date.now(), { fullTextLen: fullText.length });
        }

        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          fullText += delta.content;
          anyTokenSent = true;
          
          if (
            /realtypals (ai |data |behavior |communication )/i.test(fullText) ||
            /hard rule|strong rule/i.test(fullText) ||
            /fallback mode/i.test(fullText) ||
            /prohibited|never invent|never share/i.test(fullText)
          ) {
            console.warn('[OPENAI] Active Stream Filter: RAG Leak detected. Aborting.');
            send('token', { token: '\n\n[Response blocked by security policy]' });
            break;
          }

          send('token', { token: delta.content });
        }

        if (delta?.tool_calls) {
          const tc = delta.tool_calls[0];
          if (tc.id) toolCallId = tc.id;
          if (tc.function?.name) toolCallName = tc.function.name;
          if (tc.function?.arguments) toolCallArgs += tc.function.arguments;
        }

        if (chunk.usage) {
          usage = { prompt_tokens: chunk.usage.prompt_tokens, completion_tokens: chunk.usage.completion_tokens };
        }
      }
    } catch (err) {
      clearInactivity();
      // Distinguish our abort from external errors (API errors, network failures).
      // If the inactivity timer fired — or the signal was already aborted — this
      // is a stall, not a transient error.
      if (inactivityFired || inactivityController.signal.aborted) {
        throw new StreamStallError(anyTokenSent);
      }
      throw err;
    }

    clearInactivity();
    console.log('[OPENAI] stream complete cycle=' + cycle, Date.now(), { chunkCount, fullTextLen: fullText.length, toolCallName: toolCallName || null });

    if (usage) {
      console.log('[OPENAI] tokens', { model, prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens });
      await recordUsage({
        provider: 'openai',
        model,
        promptTokens: usage.prompt_tokens ?? 0,
        completionTokens: usage.completion_tokens ?? 0,
        endpoint: 'chat.stream',
        userId,
        sessionId,
      })
    }

    if (deadlineExceeded) {
      send('token', { token: '\n\n[Response truncated: 120-second turn limit reached]' });
    }

    if (toolCallName && allowTools) {
      send('searching', { tool: toolCallName });

      let argsObj: Record<string, unknown> = {};
      try { argsObj = JSON.parse(toolCallArgs); } catch { /* tolerate partial/empty args */ }

      const validatedArgs = validateToolArgs(toolCallName, argsObj);
      console.log('[OPENAI] START onToolCall', Date.now(), { toolCallName, args: validatedArgs });
      const result = await onToolCall(toolCallName, validatedArgs);
      console.log('[OPENAI] END onToolCall', Date.now(), { toolCallName });

      currentMsgs.push({
        role: 'assistant',
        content: null,
        tool_calls: [{ id: toolCallId, type: 'function', function: { name: toolCallName, arguments: toolCallArgs } }],
      });
      currentMsgs.push({
        role: 'tool',
        tool_call_id: toolCallId,
        content: capToolResult(result, toolCallName),
      });

      return runCompletion(currentMsgs, cycle + 1);
    }

    return fullText;
  }

  return runCompletion(msgs, 0);
}
