"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroqStreamStallError = exports.GROQ_SMART = exports.GROQ_FAST = exports.groq = void 0;
exports.getGroq = getGroq;
exports.streamWithGroq = streamWithGroq;
// backend/src/lib/ai/groq.ts
const groq_sdk_1 = __importDefault(require("groq-sdk"));
// ── Singleton + model constants (shared across routes) ────────────────────────
let _groq = null;
function getGroq() {
    if (!_groq) {
        if (!process.env.GROQ_API_KEY)
            throw new Error('GROQ_API_KEY is not set');
        _groq = new groq_sdk_1.default({ apiKey: process.env.GROQ_API_KEY, maxRetries: 0 });
    }
    return _groq;
}
// Proxy-based named export for callers that destructure `groq.chat.completions…`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.groq = new Proxy({}, {
    get(_target, prop) {
        return getGroq()[prop];
    },
});
exports.GROQ_FAST = 'llama-3.1-8b-instant';
exports.GROQ_SMART = 'llama-3.3-70b-versatile';
// Thrown when the Groq stream stalls (no chunk for INACTIVITY_MS) or headers
// never arrive. Parallel to StreamStallError in openai.ts.
// tokensSent: false  → clean error, no partial content in the SSE stream.
// tokensSent: true   → partial content already sent; outer catch must close
//                      cleanly (error event replaces partial text in the UI).
class GroqStreamStallError extends Error {
    tokensSent;
    constructor(tokensSent) {
        super('Groq stream stalled');
        this.name = 'GroqStreamStallError';
        this.tokensSent = tokensSent;
    }
}
exports.GroqStreamStallError = GroqStreamStallError;
// 30 seconds: same budget as OpenAI. Generous enough for a slow Llama 70b
// first-token latency; tight enough to fail-fast on a genuine stall.
const INACTIVITY_MS = 30_000;
async function streamWithGroq(system, messages, send) {
    const groq = new groq_sdk_1.default({
        apiKey: process.env.GROQ_API_KEY,
        // No retries — inactivity timer owns all phases. A retry on a stalled
        // stream would only extend the hang before the timer fires.
        maxRetries: 0,
    });
    const msgs = [
        { role: 'system', content: system },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];
    // Per-request inactivity controller. Covers both the header phase (create() await)
    // and the body/chunk phase (for-await loop). Aborting it terminates the
    // underlying fetch connection, causing the SDK to throw in whichever phase is active.
    const inactivityController = new AbortController();
    let inactivityFired = false;
    let inactivityTimer = null;
    let anyTokenSent = false;
    const resetInactivity = () => {
        if (inactivityTimer)
            clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            inactivityFired = true;
            console.warn('[groq] inactivity timeout anyTokenSent=' + anyTokenSent);
            inactivityController.abort();
        }, INACTIVITY_MS);
    };
    const clearInactivity = () => {
        if (inactivityTimer)
            clearTimeout(inactivityTimer);
    };
    // Arm the timer before create() so a header stall is caught too.
    resetInactivity();
    console.log('[GROQ] START create()', Date.now(), { msgCount: msgs.length });
    let stream;
    try {
        stream = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: msgs,
            stream: true,
            max_tokens: 1024,
            temperature: 0.7,
        }, 
        // signal threads through the Groq SDK fetch — terminates connection AND
        // body reads when the inactivity timer fires.
        { signal: inactivityController.signal });
    }
    catch (err) {
        clearInactivity();
        if (inactivityFired || inactivityController.signal.aborted) {
            throw new GroqStreamStallError(anyTokenSent);
        }
        throw err;
    }
    console.log('[GROQ] END create() — stream object received', Date.now());
    // Headers received — reset timer to track body/chunk phase.
    resetInactivity();
    let fullText = '';
    let chunkCount = 0;
    try {
        for await (const chunk of stream) {
            // Each chunk resets the timer — only a genuine silence triggers abort.
            resetInactivity();
            chunkCount++;
            if (chunkCount === 1) {
                console.log('[GROQ] FIRST chunk received', Date.now());
            }
            const token = chunk.choices[0]?.delta?.content;
            if (token) {
                fullText += token;
                anyTokenSent = true;
                send('token', { token });
            }
        }
    }
    catch (err) {
        clearInactivity();
        if (inactivityFired || inactivityController.signal.aborted) {
            throw new GroqStreamStallError(anyTokenSent);
        }
        throw err;
    }
    clearInactivity();
    console.log('[GROQ] stream complete', Date.now(), { chunkCount, fullTextLen: fullText.length });
    return fullText;
}
