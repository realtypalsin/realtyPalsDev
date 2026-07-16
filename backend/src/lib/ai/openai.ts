import OpenAI from 'openai';
import { MODELS, FINANCIAL } from '../config'

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

// ── Tool safety ───────────────────────────────────────────────────────────────
// Max chars for string args passed to each tool. Prevents the model from passing
// arbitrarily large strings that waste tokens or reach external services.
const TOOL_ARG_LIMITS: Record<string, Record<string, number>> = {
  web_search:     { query: 200 },
  builder_lookup: { name: 100 },
  area_info:      { sector: 100, city: 50 },
  rera_check:     { rera_number: 50, rera_url: 200 },
  commute:        { origin: 200, destination: 200 },
}

function validateToolArgs(name: string, args: Record<string, unknown>): Record<string, unknown> {
  const limits = TOOL_ARG_LIMITS[name]
  if (!limits) return args
  const validated = { ...args }
  for (const [field, maxLen] of Object.entries(limits)) {
    if (typeof validated[field] === 'string' && (validated[field] as string).length > maxLen) {
      console.warn('[openai] tool arg truncated', { tool: name, field, originalLength: (validated[field] as string).length })
      validated[field] = (validated[field] as string).slice(0, maxLen)
    }
  }
  return validated
}

// Cap tool result size before injecting into the message history.
// Prevents a large web search or RERA page crawl from blowing the context window.
const TOOL_RESULT_MAX_CHARS = 6000

function capToolResult(result: unknown, toolName: string): string {
  const str = typeof result === 'string' ? result : JSON.stringify(result)
  if (str.length <= TOOL_RESULT_MAX_CHARS) return str
  console.warn('[openai] tool result truncated', { tool: toolName, originalLength: str.length })
  return str.slice(0, TOOL_RESULT_MAX_CHARS) + '…[truncated for token budget]'
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
): Promise<string> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://models.inference.ai.azure.com',
    // No SDK-level timeout — inactivity timer owns all phases including body reads.
    // No retries — a retry on a stalled stream extends the hang; inactivity timer handles it.
    maxRetries: 0,
  });

  const msgs: any[] = [
    { role: 'system', content: system },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'builder_lookup',
        description: 'Look up VERIFIED facts about a builder from the RealtyPals database — founding year, delivered units, projects, RERA, CREDAI membership, awards. Use when the user asks about a builder\'s reputation, track record, or projects. Never invent builder stats; use this.',
        parameters: {
          type: 'object',
          properties: { name: { type: 'string', description: 'Builder name, e.g. "Godrej", "ATS", "Gaur"' } },
          required: ['name'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Search the live web for current information: builder news/controversies, RERA status, market/price trends, metro expansion, school/hospital quality, or anything time-sensitive RealtyPals does not store. Returns source-attributed snippets. Cite sources in your answer.',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string', description: 'Specific search query, e.g. "ATS Noida delivery track record complaints 2025"' } },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'area_info',
        description: 'Get background information about a Noida/Greater Noida sector or area from Wikipedia. Use for "tell me about Sector 150", "how is this area".',
        parameters: {
          type: 'object',
          properties: {
            sector: { type: 'string', description: 'Sector or area name, e.g. "Sector 150"' },
            city: { type: 'string', description: 'City, e.g. "Noida"' },
          },
          required: ['sector', 'city'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'rera_check',
        description: 'Fetch live RERA registration details from the UP-RERA portal. Use to verify a project\'s RERA status when asked.',
        parameters: {
          type: 'object',
          properties: {
            rera_number: { type: 'string', description: 'RERA registration number e.g. UPRERAPRJ12345' },
            rera_url: { type: 'string', description: 'Direct RERA project URL if known' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'commute',
        description: 'Calculate driving time and distance between two places in India. Use for "how far is X from Y", "commute to office/metro/airport".',
        parameters: {
          type: 'object',
          properties: {
            origin: { type: 'string', description: 'Start address/location' },
            destination: { type: 'string', description: 'Destination address/location' },
          },
          required: ['origin', 'destination'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'calculate_emi',
        description: 'Calculate monthly home-loan EMI, total payment and total interest. Use for EMI / affordability questions.',
        parameters: {
          type: 'object',
          properties: {
            principalCr: { type: 'number', description: 'Loan amount in crore' },
            annualRate: { type: 'number', description: `Annual interest rate %, defaults to ${FINANCIAL.EMI_RATE}` },
            tenureYears: { type: 'number', description: `Tenure in years, defaults to ${FINANCIAL.LOAN_TENURE_YEARS}` },
          },
          required: ['principalCr'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'calculate_stamp_duty',
        description: 'Calculate UP/Noida stamp duty + registration charges. Rate depends on buyer gender.',
        parameters: {
          type: 'object',
          properties: {
            priceCr: { type: 'number', description: 'Property price in crore' },
            gender: { type: 'string', description: 'male, female, or joint' },
          },
          required: ['priceCr'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'calculate_gst',
        description: 'Calculate GST on a property purchase. 5% for under-construction, 0% for ready-to-move, 1% for affordable.',
        parameters: {
          type: 'object',
          properties: {
            priceCr: { type: 'number', description: 'Property price in crore' },
            status: { type: 'string', description: 'under_construction or ready_to_move' },
            carpetSqm: { type: 'number', description: 'Carpet area in sqm (for affordable-housing check)' },
          },
          required: ['priceCr', 'status'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'project_competitors',
        description: 'Get competitor comparisons for a specific project. Use when the user asks how a project compares to others, or asks for alternatives.',
        parameters: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'The internal project ID (must be from the properties data)' },
          },
          required: ['project_id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'project_documents',
        description: 'Get text extracted from project brochures and documents. Use to find highly specific details like floor plans, specifications, or marketing claims not present in the main data block.',
        parameters: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'The internal project ID (must be from the properties data)' },
          },
          required: ['project_id'],
        },
      },
    },
  ];

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

    let stream: Awaited<ReturnType<typeof client.chat.completions.create>>;
    try {
      // Use MAIN model when tools needed (larger context window for gpt-4o vs gpt-4o-mini 8KB limit)
      const model = allowTools ? MODELS.MAIN : MODELS.FALLBACK;
      stream = await client.chat.completions.create(
        {
          model,
          messages: currentMsgs as any,
          ...(allowTools ? { tools } : {}),
          stream: true,
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

    try {
      for await (const chunk of stream) {
        // Each chunk resets the inactivity timer — only a genuine silence triggers abort.
        resetInactivity();
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
