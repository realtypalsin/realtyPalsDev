"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamWithClaude = streamWithClaude;
// backend/src/lib/ai/claude.ts
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
async function streamWithClaude(system, messages, send) {
    const client = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
    const stream = await client.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system,
        messages,
    });
    let fullText = '';
    for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            fullText += chunk.delta.text;
            send('token', { token: chunk.delta.text });
        }
    }
    return fullText;
}
