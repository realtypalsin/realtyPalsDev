"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeIntent = mergeIntent;
exports.parseIntentJson = parseIntentJson;
exports.extractIntent = extractIntent;
// backend/src/lib/ai/intent.ts
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const openai_1 = __importDefault(require("openai"));
// import Anthropic from '@anthropic-ai/sdk'
const zod_1 = require("zod");
const index_1 = require("./prompts/index");
const IntentSchema = zod_1.z.object({
    bhk: zod_1.z.array(zod_1.z.number()).optional(),
    budgetMin: zod_1.z.number().optional(),
    budgetMax: zod_1.z.number().optional(),
    possession: zod_1.z.enum(['immediate', '1year', '2year', '3year+']).optional(),
    sector: zod_1.z.string().optional(),
    areaMin: zod_1.z.number().optional(),
    areaMax: zod_1.z.number().optional(),
    purpose: zod_1.z.enum(['endUse', 'investment']).optional(),
    builderName: zod_1.z.string().optional(),
    lifestyleKeywords: zod_1.z.array(zod_1.z.string()).optional(),
    projectNames: zod_1.z.array(zod_1.z.string()).optional(),
    riskProfile: zod_1.z.enum(['nri', 'retiree', 'risk_averse', 'first_time_buyer']).optional(),
    is_comparison_query: zod_1.z.boolean().optional(),
});
function mergeIntent(previous, update) {
    // projectNames and is_comparison_query are per-turn signals — they reflect the
    // CURRENT message only. Never inherit from previous turns: a search query after a
    // comparison would otherwise see stale projectNames and wrongly enter comparison mode.
    const freshProjectLookup = (update.projectNames?.length ?? 0) > 0 && update.sector === undefined;
    const result = {
        ...previous,
        projectNames: undefined, // reset — only populated if this turn names projects
        is_comparison_query: undefined, // reset — only populated if this turn is a compare request
        ...(freshProjectLookup ? { sector: undefined, lifestyleKeywords: undefined } : {}),
        ...Object.fromEntries(Object.entries(update).filter(([, v]) => v !== undefined)),
    };
    console.log('[INTENT:MERGE]', JSON.stringify({
        previous,
        update,
        freshProjectLookup,
        result,
    }));
    return result;
}
/** Exported for unit testing only. Parses raw LLM JSON output into a merged Intent. */
function parseIntentJson(raw, previous) {
    const match = raw.match(/\{[\s\S]*\}/);
    const str = match ? match[0] : '{}';
    try {
        const result = IntentSchema.safeParse(JSON.parse(str));
        if (!result.success) {
            console.warn('[intent] schema mismatch:', result.error.message);
            return previous;
        }
        return mergeIntent(previous, result.data);
    }
    catch {
        return previous;
    }
}
async function extractWithGroq(msg, prev) {
    console.log('[INTENT] START extractWithGroq', Date.now());
    // 15s timeout — Groq is fast; this guards against unexpected Groq slowdowns.
    const groq = new groq_sdk_1.default({ apiKey: process.env.GROQ_API_KEY, timeout: 15000 });
    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: index_1.INTENT_EXTRACTION_PROMPT },
            { role: 'user', content: `Previous intent: ${JSON.stringify(prev)}\n\nUser message: ${msg}` },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 256,
        temperature: 0.1,
    });
    console.log('[INTENT] END extractWithGroq', Date.now());
    const raw = completion.choices[0]?.message?.content ?? '{}';
    return parseIntentJson(raw, prev);
}
// signal is the AbortSignal from the 8-second wall-clock in extractIntent.
// Passing it per-request wires it to the underlying fetch — including the body
// read — so aborting it terminates both header and body phases cleanly.
async function extractWithOpenAI(msg, prev, signal) {
    console.log('[INTENT] START extractWithOpenAI', Date.now());
    const client = new openai_1.default({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: 'https://models.inference.ai.azure.com',
        // No SDK-level timeout — the external AbortSignal owns the wall-clock.
        // No retries — a retry would extend past our 8s budget; let Groq handle failures.
        maxRetries: 0,
    });
    const completion = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: index_1.INTENT_EXTRACTION_PROMPT },
            { role: 'user', content: `Previous intent: ${JSON.stringify(prev)}\n\nUser message: ${msg}` },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 256,
        temperature: 0.1,
    }, 
    // Per-request signal: threads through fetchWithTimeout AND response body read.
    // When the signal fires, both the fetch and any in-progress response.json() abort.
    { signal });
    console.log('[INTENT] END extractWithOpenAI', Date.now());
    const raw = completion.choices[0]?.message?.content ?? '{}';
    return parseIntentJson(raw, prev);
}
async function extractIntent(message, previousIntent) {
    if (process.env.OPENAI_API_KEY) {
        // Hard wall-clock: 8 seconds from call to result, covering headers + body.
        // When the timer fires, the AbortController cancels the in-flight request
        // including any stalled body read. The catch block is guaranteed to execute.
        const controller = new AbortController();
        const timer = setTimeout(() => {
            console.warn('[intent] 8s wall-clock expired — aborting OpenAI, switching to Groq');
            controller.abort();
        }, 8000);
        try {
            console.log('[INTENT] trying OpenAI path', Date.now());
            const result = await extractWithOpenAI(message, previousIntent, controller.signal);
            console.log('[INTENT] OpenAI path succeeded', Date.now(), { result });
            clearTimeout(timer);
            return { intent: result, degraded: false };
        }
        catch (err) {
            clearTimeout(timer);
            console.warn('[intent] OpenAI failed, trying Groq:', err.message);
        }
    }
    if (process.env.GROQ_API_KEY) {
        try {
            console.log('[INTENT] trying Groq path', Date.now());
            const result = await extractWithGroq(message, previousIntent);
            console.log('[INTENT] Groq path succeeded', Date.now(), { result });
            return { intent: result, degraded: false };
        }
        catch (err) {
            console.warn('[intent] Groq failed:', err.message);
        }
    }
    console.error('[intent] all providers failed — returning previous intent (degraded)');
    return { intent: previousIntent, degraded: true };
}
