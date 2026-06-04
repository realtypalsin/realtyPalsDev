// Cerebras — Llama 3.3 70B at 2000+ tok/s (vs Groq's ~500)
// Same OpenAI-compatible API as Groq. Drop-in via CHAT_PROVIDER=cerebras.
// Free tier available. Key: https://cloud.cerebras.ai

import Groq from 'groq-sdk'

export const CEREBRAS_BASE_URL = 'https://api.cerebras.ai/v1'
export const CEREBRAS_SMART = 'llama-3.3-70b'

// Re-uses Groq SDK with Cerebras base URL (both are OpenAI-compatible)
export const cerebras = process.env.CEREBRAS_API_KEY
  ? new Groq({
      apiKey: process.env.CEREBRAS_API_KEY,
      baseURL: CEREBRAS_BASE_URL,
    })
  : null
