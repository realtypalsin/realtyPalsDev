"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeCompress = maybeCompress;
// backend/src/lib/ai/compression.ts
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const openai_1 = __importDefault(require("openai"));
const COMPRESSION_THRESHOLD = 14;
const KEEP_RECENT = 8;
const MAX_SUMMARY_CHARS = 500;
const COMPRESSION_PROMPT = `Summarize this conversation in 3-4 sentences. Focus on:
1. What property criteria the user mentioned (BHK, budget, sector, timeline)
2. Any properties they reacted to positively or negatively
3. Any decisions or preferences expressed
Be factual, no filler. This summary replaces the full history for context efficiency.`;
// Cap and sanitize LLM-generated summaries before DB storage.
// Strips markdown section headers that could confuse the system prompt structure.
// Keeps the most recent content when truncation is required.
function sanitizeSummary(text) {
    const cleaned = text.replace(/^#{1,6}\s+.*/gm, '').trim();
    return cleaned.length > MAX_SUMMARY_CHARS
        ? cleaned.slice(cleaned.length - MAX_SUMMARY_CHARS) // keep most recent
        : cleaned;
}
async function maybeCompress(messages, existingSummary) {
    if (messages.length <= COMPRESSION_THRESHOLD) {
        return { messages, newSummary: null };
    }
    const toCompress = messages.slice(0, messages.length - KEEP_RECENT);
    const recent = messages.slice(messages.length - KEEP_RECENT);
    if (!process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY) {
        return { messages: recent, newSummary: existingSummary ?? null };
    }
    const context = toCompress.map((m) => `${m.role}: ${m.content}`).join('\n');
    try {
        if (process.env.OPENAI_API_KEY) {
            const client = new openai_1.default({
                apiKey: process.env.OPENAI_API_KEY,
                baseURL: 'https://models.inference.ai.azure.com',
            });
            const res = await client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: COMPRESSION_PROMPT },
                    { role: 'user', content: context },
                ],
                max_tokens: 256,
                temperature: 0.1,
            });
            const rawSummary = res.choices[0]?.message?.content?.trim() ?? '';
            const combined = existingSummary ? `${existingSummary}\n\n${rawSummary}` : rawSummary;
            return { messages: recent, newSummary: sanitizeSummary(combined) };
        }
    }
    catch (err) {
        console.warn('[compression] OpenAI failed, trying Groq:', err.message);
    }
    try {
        if (process.env.GROQ_API_KEY) {
            const groq = new groq_sdk_1.default({ apiKey: process.env.GROQ_API_KEY });
            const res = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: COMPRESSION_PROMPT },
                    { role: 'user', content: context },
                ],
                max_tokens: 256,
                temperature: 0.1,
            });
            const rawSummary = res.choices[0]?.message?.content?.trim() ?? '';
            const combined = existingSummary ? `${existingSummary}\n\n${rawSummary}` : rawSummary;
            return { messages: recent, newSummary: sanitizeSummary(combined) };
        }
    }
    catch (err) {
        console.warn('[compression] Groq failed:', err.message);
    }
    return { messages: recent, newSummary: existingSummary ?? null };
}
