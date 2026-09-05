# External Integrations

**Analysis Date:** 2026-06-14

## APIs & External Services

**AI / LLM Providers:**
- Groq (primary LLM) — chat inference via `llama-3.3-70b-versatile`
  - SDK: `@ai-sdk/groq` + `groq-sdk`
  - Auth: `GROQ_API_KEY`
  - Usage: `frontend/app/api/v1/chat/route.ts`, `frontend/lib/ai/groq.ts`
- Cerebras (alternative LLM, drop-in replacement) — `llama-3.3-70b` at higher throughput
  - SDK: `groq-sdk` with custom `baseURL: https://api.cerebras.ai/v1`
  - Auth: `CEREBRAS_API_KEY`
  - Usage: `frontend/lib/ai/cerebras.ts`; activated via `CHAT_PROVIDER=cerebras`
- Anthropic Claude (provider adapter, not primary)
  - SDK: `@ai-sdk/anthropic`
  - Auth: (standard Anthropic API key env var)
- AWS Bedrock (provider adapter, available)
  - SDK: `@ai-sdk/amazon-bedrock`
  - Auth: AWS credentials (standard env vars)
  - Script: `frontend/scripts/test-bedrock.ts`
- OpenAI-compatible (adapter available)
  - SDK: `@ai-sdk/openai`

**AI Utility Services:**
- Jina AI — embeddings (1024-dim) and reranking (primary reranker)
  - Auth: `JINA_API_KEY`
  - Endpoints: `https://api.jina.ai/v1/embeddings`, `https://api.jina.ai/v1/rerank`
  - Usage: `frontend/lib/ai/jina.ts`
- Cohere — multilingual reranking (`rerank-multilingual-v3.0`); fallback when Jina unavailable
  - SDK: `cohere-ai`
  - Auth: `COHERE_API_KEY`
  - Usage: `frontend/lib/ai/cohere.ts`
- Tavily — AI web search with content extraction (primary web search tool)
  - Auth: `TAVILY_API_KEY`
  - Endpoint: `https://api.tavily.com/search`
  - Usage: `frontend/lib/ai/tavily.ts`
- Serper — Google Search API fallback (when Tavily fails or quota exhausted)
  - Auth: `SERPER_API_KEY` (inferred from code in `frontend/lib/ai/tavily.ts`)
  - Usage: `frontend/lib/ai/tavily.ts`
- Jina Reader — web page content extraction
  - Auth: `JINA_API_KEY`
  - Endpoint: `https://r.jina.ai/{url}`
  - Usage: `frontend/lib/ai/jina.ts`

**Maps & Location:**
- Google Maps Platform — Distance Matrix API (commute times), Places API (nearby POIs), Geocoding
  - Auth: `GOOGLE_MAPS_API_KEY`
  - Client-side: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
  - Usage: `frontend/lib/google-maps.ts`
  - Next.js image domain: `maps.googleapis.com`

**Air Quality:**
- WAQI (World Air Quality Index) — AQI data for property areas
  - Auth: `WAQI_API_KEY` (supports `demo` token for testing)
  - Endpoint: `https://api.waqi.info/`
  - Usage: `frontend/lib/waqi.ts`

**Content / Research:**
- Wikipedia REST API — area information for property context
  - Auth: None (public API)
  - Usage: `frontend/lib/wikipedia.ts`

## Data Storage

**Databases:**
- PostgreSQL (primary relational store)
  - Connection: `DATABASE_URL` (pooled), `DIRECT_URL` (direct; required for Prisma migrations)
  - ORM: Prisma 5.20.x
  - Schema: `prisma/schema.prisma`
  - Client output: `frontend/node_modules/.prisma/client`
  - DB client singleton: `frontend/lib/db.ts`

**File Storage:**
- Supabase Storage
  - Next.js image domains: `*.supabase.co`, `*.supabase.in`
  - Used for property images, builder logos
  - Script: `frontend/scripts/seed-images.ts`

**Caching:**
- Upstash Redis (serverless HTTP Redis)
  - Auth: `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`
  - Client: `@upstash/redis`
  - Usage: `frontend/lib/redis.ts`
  - Purposes: Rate limiting (15 req/60s per user), session list cache, general key-value cache
  - Fallback: In-process `Map` when Redis is unavailable

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
  - Client SDK: `@supabase/supabase-js` 2.46.x, `@supabase/ssr` 0.5.x
  - Browser client: `frontend/lib/supabase.ts` via `createBrowserClient`
  - Auth: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or fallback `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
  - Session cookie: `sb-eargxntetfmtdpwedjbd-auth-token` (JWT parsed in middleware)
  - Google OAuth: Supported (Google user photos from `lh3.googleusercontent.com` whitelisted)
  - Routes: `frontend/app/auth/` directory

**Admin Auth:**
- Custom token-based admin auth
  - Implementation: `frontend/lib/adminToken.ts`
  - Cookie: `admin_token`
  - Protected: all `/api/v1/admin/*` routes except `/api/v1/admin/auth`
  - Middleware: `frontend/middleware.ts`

## Monitoring & Observability

**Error Tracking:**
- Sentry (`@sentry/nextjs` 10.56.x)
  - DSN: `NEXT_PUBLIC_SENTRY_DSN`
  - Org: `propfyndr`, Project: `propfyndr-sentry`
  - Config: `frontend/sentry.client.config.ts`, `frontend/sentry.server.config.ts`, `frontend/sentry.edge.config.ts`
  - Session replay: 5% sessions, 100% on error
  - Trace sampling: 20% in production, 100% in development
  - Source maps hidden in production

**Analytics:**
- PostHog (`posthog-js` 1.379.x)
  - Auth: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (standard PostHog env vars)
  - Client: `frontend/lib/analytics.ts`
  - Events tracked: `chat_started`, `recommendation_generated`, `property_viewed`, `property_saved`, `comparison_used`, `callback_requested`, `site_visit_requested`, `signup_started`, `signup_completed`, `whatsapp_handoff`, `lead_created`

**Logging:**
- `console.log` / `console.error` / `console.warn` (structured where possible)
- OpenTelemetry API (`@opentelemetry/api` 1.9.x) — instrumentation hook in `frontend/instrumentation.ts`

## CI/CD & Deployment

**Hosting:**
- Vercel (Next.js-native deployment)

**CI Pipeline:**
- Not detected (no `.github/workflows/` or similar)

## Webhooks & Callbacks

**Outgoing:**
- Lead webhook — fires on callback requests and site visit requests
  - Auth: none (URL-based)
  - Env var: `LEAD_WEBHOOK_URL`
  - Implementation: `frontend/lib/leadNotify.ts`
  - Retry: 3 attempts (immediate, 2s, 5s)
  - Fallback: persists failed webhooks to `FailedWebhook` Prisma model

**Incoming:**
- None detected

## Messaging

**WhatsApp:**
- Pre-filled `wa.me` deep links (no WhatsApp Business API)
- Phone number: `NEXT_PUBLIC_WHATSAPP_NUMBER`
- Implementation: `frontend/lib/whatsapp.ts`
- Used for lead handoff from property cards and detail panels

## Environment Configuration

**Required env vars (critical — app will not function without these):**
- `DATABASE_URL` — PostgreSQL connection string (pooled)
- `DIRECT_URL` — PostgreSQL direct connection (Prisma migrations)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `NEXT_PUBLIC_API_URL` — API base path (throws at startup if missing; typically `/api/v1`)
- `GROQ_API_KEY` — Chat LLM (logs error on startup if missing)
- `UPSTASH_REDIS_URL` + `UPSTASH_REDIS_TOKEN` — Redis (degrades gracefully without it)

**Optional env vars (features degrade without these):**
- `GOOGLE_MAPS_API_KEY` — Commute/distance calculations
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Client-side maps
- `JINA_API_KEY` — Embeddings and reranking
- `COHERE_API_KEY` — Fallback reranking
- `TAVILY_API_KEY` — Web search tool in chat
- `SERPER_API_KEY` — Fallback web search
- `WAQI_API_KEY` — Air quality data
- `CEREBRAS_API_KEY` — Alternative LLM provider
- `NEXT_PUBLIC_WHATSAPP_NUMBER` — WhatsApp handoff links
- `LEAD_WEBHOOK_URL` — Lead notification webhook
- `NEXT_PUBLIC_SENTRY_DSN` — Error tracking
- `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` — Analytics

**Secrets location:**
- `frontend/.env` (local; not committed)

---

*Integration audit: 2026-06-14*
