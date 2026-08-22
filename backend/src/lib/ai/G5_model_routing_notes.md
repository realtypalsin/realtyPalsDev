# G5: Cheap-Model Routing

## Status
Implemented: Intent classifier (backend/src/lib/ai/intentClassifier.ts)
Implemented: Wired into the main chat path (backend/src/routes/chat-router.ts, around the
`executeWithFallbackChain` call for the general response) — since Gemini, not OpenAI, is
the primary provider, routing targets Gemini's model tier instead of streamWithOpenAI.

## How It Works Now
```ts
// chat-router.ts, main response path
const modelRoute = routeToModel(classification) // 'cheap' | 'smart' | 'query_planner'
fallbackResult = await executeWithFallbackChain({
  ...,
  config: modelRoute === 'cheap' ? { maxTokens: 1500, model: MODELS.GEMINI_LITE } : undefined,
})
```
`config.model` only affects the Gemini leg of the fallback chain (`streamWithGemini` uses
`config.model || MODELS.GEMINI_MAIN`). Deep-fallback providers (Groq/OpenAI) are unaffected —
they pick their own model internally and are rarely hit since Gemini is primary.

## Cost Savings Estimate
- Factual queries now use Gemini 3.5 Flash Lite instead of Gemini 3.6 Flash — roughly half
  the price per the pricing table in `cost.ts` (0.0375/0.15 vs 0.075/0.3 per 1M tokens).
- Advisory/reasoning queries and project_detail (query planner) are unaffected — same model
  as before.

## Safeguard
Default to 'advisory' (smart model) when intent is ambiguous.
Only route to cheap model with 2+ factual keyword matches, or an explicit comparison query.
