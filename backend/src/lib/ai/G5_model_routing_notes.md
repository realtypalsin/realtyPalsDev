# G5: Cheap-Model Routing (Deferred Post-Launch)

## Status
Implemented: Intent classifier (backend/src/lib/ai/intentClassifier.ts)
Pending: Wire routing into streamWithOpenAI

## Why Deferred
Current streamWithOpenAI hardcodes model selection:
```ts
const model = allowTools ? MODELS.MAIN : MODELS.FALLBACK;
```

To enable G5, need:
1. Add optional `model?: string` parameter to streamWithOpenAI
2. Pass classified intent from chat.ts to streamWithOpenAI
3. Use classified model if provided, else default to current logic

## Implementation Path (Post-Launch)

```ts
// In chat.ts, line ~690
const intentCategory = classifyIntent(message, intent)
const model = routeToModel(intentCategory)

await streamWithOpenAI(systemPrompt, messages, send, toolHandler, config, userId, sessionId, model)
```

## Cost Savings Estimate
- Factual queries: ~90% savings (llama-3.1-8b-instant vs gpt-4o)
- Expected 40-50% traffic reduction once deployed
- Combined with G6 (property trimming): 50-60% total cost reduction

## Safeguard
Default to 'advisory' (smart model) when intent is ambiguous.
Only route to cheap model with 2+ factual keyword matches.
