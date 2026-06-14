<!-- refreshed: 2026-06-14 -->
# Architecture

**Analysis Date:** 2026-06-14

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser / Client                              │
│   Next.js App Router Pages (React, 'use client')                     │
│   `frontend/app/page.tsx`  `frontend/app/discover/`                  │
│   `frontend/app/compare/`  `frontend/app/saved/`                     │
│   `frontend/app/property/`  `frontend/app/admin/`                    │
└───────────────┬─────────────────────────┬───────────────────────────┘
                │  fetch / SSE stream       │  Supabase JS SDK (auth)
                ▼                          ▼
┌──────────────────────────────┐  ┌────────────────────────────────────┐
│  Next.js Middleware           │  │  Supabase Auth                     │
│  `frontend/middleware.ts`     │  │  (JWT verify, session cookie)      │
│  - Admin token gate           │  └────────────────────────────────────┘
│  - x-user-id JWT validation   │
│  - Request logging            │
└──────────────┬───────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    API Route Handlers (Edge/Node)                     │
│            `frontend/app/api/v1/`                                    │
│  chat/        callback/    site-visit/   saved/    leads/            │
│  projects/    admin/       documents/    commute/  transcribe/       │
│  builder-reputation/  market-comparison/  registry-prices/           │
└──────────┬───────────────────────────────────────────────────────────┘
           │
    ┌──────┴──────────────────────────────────────┐
    │                                              │
    ▼                                              ▼
┌─────────────────────────┐            ┌──────────────────────────────┐
│  AI / Tool Layer         │            │  Repository Layer             │
│  `frontend/lib/ai/`      │            │  `frontend/lib/repositories/ `│
│  prompts.ts (system)     │            │  projectRepository.ts         │
│  intentManager.ts        │            │  (search + scoring)           │
│  groq.ts / tavily.ts     │            └──────────────┬───────────────┘
│  jina.ts / cohere.ts     │                           │
│  builderReputation.ts    │                           ▼
└──────────────────────────┘            ┌──────────────────────────────┐
                                        │  Data Layer                  │
                                        │  `frontend/lib/db.ts`        │
                                        │  Prisma Client (singleton)   │
                                        │  `prisma/schema.prisma`      │
                                        └──────────────┬───────────────┘
                                                       │
                        ┌──────────────────────────────┤
                        │                              │
                        ▼                              ▼
            ┌──────────────────────┐    ┌─────────────────────────────┐
            │  PostgreSQL           │    │  Upstash Redis              │
            │  (via Supabase)       │    │  `frontend/lib/redis.ts`    │
            │  DATABASE_URL         │    │  - Rate limiting            │
            └──────────────────────┘    │  - Response caching         │
                                        └─────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Landing Page | Auth check + redirect to /discover or /auth | `frontend/app/page.tsx` |
| Discover Page | Main app shell — chat + property results | `frontend/app/discover/page.tsx` |
| Chat Route | Core AI endpoint — SSE streaming, tool calling | `frontend/app/api/v1/chat/route.ts` |
| Middleware | JWT validation, admin token gate, request logging | `frontend/middleware.ts` |
| Prompts | System prompt builder with user memory context | `frontend/lib/ai/prompts.ts` |
| Intent Manager | User intent state (BHK, budget, sector, purpose) | `frontend/lib/ai/intentManager.ts` |
| Project Repository | DB search + deterministic scoring/ranking | `frontend/lib/repositories/projectRepository.ts` |
| Prisma singleton | Database client with global hot-reload guard | `frontend/lib/db.ts` |
| Redis | Rate limiting + cache with in-process fallback | `frontend/lib/redis.ts` |
| Admin Pages | Builder/project CRUD, lead management | `frontend/app/admin/` |
| DiscoveryContent | Main UI panel (chat + cards side-by-side) | `frontend/components/DiscoveryContent.tsx` |
| Sidebar | Saved properties, session list, navigation | `frontend/components/Sidebar.tsx` |
| ProjectDetailPanel | Full property detail overlay | `frontend/components/ProjectDetailPanel.tsx` |

## Pattern Overview

**Overall:** Server-side AI orchestration via agentic tool-use, rendered in a Next.js App Router SPA

**Key Characteristics:**
- All AI logic runs server-side in a single Route Handler (`/api/v1/chat`); no AI calls from the browser
- Streaming responses use SSE (ReadableStream) with custom event types (`searching`, `text`, `projects`)
- Property data fetched by AI tools during inference — not pre-loaded by the page
- Supabase handles auth; `x-user-id` header carries the user ID; middleware validates JWT consistency
- Admin section is a separate gated UI under `frontend/app/admin/` protected by a cookie-based admin token

## Layers

**Presentation Layer:**
- Purpose: React pages and components that the user sees
- Location: `frontend/app/` (pages), `frontend/components/` (shared components)
- Contains: `'use client'` pages, UI components, shadcn/ui wrappers
- Depends on: API routes via fetch, Supabase JS SDK for auth
- Used by: Browser

**API Layer:**
- Purpose: Next.js Route Handlers — validate input, orchestrate services, return responses
- Location: `frontend/app/api/v1/`
- Contains: POST/GET handlers, Zod schema validation, rate limiting calls
- Depends on: AI layer, repository layer, lib utilities
- Used by: Presentation layer (client fetch)

**AI Layer:**
- Purpose: LLM prompt construction, tool definitions, external AI service clients
- Location: `frontend/lib/ai/`
- Contains: `prompts.ts` (system prompt), `intentManager.ts` (intent state types), `groq.ts`, `tavily.ts`, `jina.ts`, `cohere.ts`, `builderReputation.ts`
- Depends on: Repository layer for `search_properties` tool, external APIs (Groq, Tavily, Jina, Cohere)
- Used by: Chat route handler

**Repository Layer:**
- Purpose: Data access — query Prisma, apply filters, score/rank results
- Location: `frontend/lib/repositories/`
- Contains: `projectRepository.ts` with `searchProjects()` and `scoreAndRankProjects()`
- Depends on: Prisma client (`frontend/lib/db.ts`), Redis cache
- Used by: API layer (chat route `search_properties` tool, projects routes)

**Data Layer:**
- Purpose: Schema definition, database migrations
- Location: `prisma/schema.prisma`, `prisma/migrations/`
- Contains: Prisma schema for all models
- Depends on: PostgreSQL (via Supabase)
- Used by: Repository layer (generated Prisma client)

**Infrastructure / Utility Layer:**
- Purpose: Cross-cutting concerns — caching, formatting, calculators, external service clients
- Location: `frontend/lib/`
- Contains: `redis.ts`, `calculators.ts`, `google-maps.ts`, `whatsapp.ts`, `leadNotify.ts`, `normalize.ts`, `format.ts`, `supabase.ts`, `analytics.ts`, `waqi.ts`, `wikipedia.ts`
- Depends on: External services (Upstash Redis, Google Maps API, Twilio/WhatsApp, PostHog)
- Used by: API layer and AI layer

## Data Flow

### Primary Chat Request Path

1. User types message in `frontend/components/DiscoveryContent.tsx` → POST to `/api/v1/chat`
2. Middleware in `frontend/middleware.ts` validates `x-user-id` against Supabase JWT cookie
3. Route handler in `frontend/app/api/v1/chat/route.ts` validates body with Zod `BodySchema`
4. Rate limit checked via `checkRateLimit(userId)` in `frontend/lib/redis.ts`
5. Chat session loaded/created via `prisma.chatSession` (last 8 messages as history)
6. User memory loaded via `prisma.userMemory` for personalized context
7. System prompt built via `buildSystemPrompt(memoryCtx)` in `frontend/lib/ai/prompts.ts`
8. `streamText()` from Vercel AI SDK invoked with Groq `llama-3.3-70b-versatile` model
9. LLM decides which tools to call (up to 5 steps, 30s timeout):
   - `search_properties` → `searchProjects()` in `frontend/lib/repositories/projectRepository.ts` → Prisma → PostgreSQL → `scoreAndRankProjects()`
   - `search_web` → `frontend/lib/ai/tavily.ts`
   - `get_commute_time` → `frontend/lib/google-maps.ts`
   - `calculate_emi/stamp_duty/gst` → `frontend/lib/calculators.ts`
   - `get_area_info` → `frontend/lib/wikipedia.ts`
   - `read_rera_page` → `frontend/lib/ai/jina.ts`
10. SSE events streamed to client: `{type: 'searching'}`, `{type: 'text', delta}`, `{type: 'projects', data}`
11. After stream completes: messages saved to DB, user memory updated with extracted signals

### Admin Content Management Path

1. Admin logs in at `frontend/app/admin/login/` → receives `admin_token` cookie
2. Admin visits `frontend/app/admin/projects/` or `frontend/app/admin/builders/`
3. All admin API calls go through `/api/v1/admin/*` protected by `validateAdminToken()` in `frontend/lib/adminToken.ts`
4. Admin form submits → `frontend/app/api/v1/admin/projects/route.ts` → Prisma → DB

### Lead Capture Path

1. User triggers high-intent action (callback, site visit, save property)
2. Client calls `/api/v1/callback` or `/api/v1/site-visit` with `x-user-id` header
3. Route handler writes lead to DB via Prisma
4. `frontend/lib/leadNotify.ts` sends WhatsApp notification via `frontend/lib/whatsapp.ts`
5. Lead visible in admin dashboard at `frontend/app/admin/page.tsx`

**State Management:**
- Auth state: Supabase JS SDK + `localStorage` for cached `user_id`
- Chat session state: Server-side in PostgreSQL (`ChatSession`, `Message` models)
- User preferences/memory: `UserMemory` table in DB, loaded on each chat request
- UI state: React `useState` within page components (no global state library)

## Key Abstractions

**ProjectCard:**
- Purpose: Denormalized view type for AI responses and UI rendering
- Examples: `frontend/types/project.ts` (`ProjectCard`, `ProjectDetail`)
- Pattern: Flat shape constructed in `projectRepository.ts`, passed through AI tool result to LLM context and to client

**SearchFilters:**
- Purpose: Structured query parameters extracted from LLM tool calls
- Examples: `frontend/lib/repositories/projectRepository.ts` (`SearchFilters` interface)
- Pattern: LLM fills filter fields, repository applies them as Prisma `where` clauses

**UserMemoryContext:**
- Purpose: Persistent user preference signals injected into system prompt
- Examples: `frontend/lib/ai/prompts.ts` (`UserMemoryContext` interface)
- Pattern: Loaded from `UserMemory` DB row per request; updated post-stream from tool call args

**IntentState:**
- Purpose: Typed representation of buyer intent fields across a conversation
- Examples: `frontend/lib/ai/intentManager.ts` (`IntentState` interface, `calculateCompletenessScore()`)
- Pattern: Not persisted separately — derived from memory signals and conversation flow

## Entry Points

**Landing:**
- Location: `frontend/app/page.tsx`
- Triggers: Browser navigation to `/`
- Responsibilities: Supabase session check → redirect to `/discover` (authenticated) or show landing (anonymous)

**Main App:**
- Location: `frontend/app/discover/page.tsx`
- Triggers: Authenticated user navigates to `/discover`
- Responsibilities: Session validation, renders `<Sidebar>` + `<DiscoveryContent>` layout

**Chat API:**
- Location: `frontend/app/api/v1/chat/route.ts`
- Triggers: POST from `DiscoveryContent` component
- Responsibilities: Full chat turn — rate limit, history, LLM call, tool execution, DB persistence, SSE response

**Root Layout:**
- Location: `frontend/app/layout.tsx`
- Triggers: All page renders
- Responsibilities: Applies Outfit font, wraps app in `<PostHogProvider>` for analytics

## Architectural Constraints

- **Streaming:** Chat uses `ReadableStream` SSE — responses must not buffer; middleware passes through, no body buffering
- **Global state:** Prisma client is a module-level singleton in `frontend/lib/db.ts`; Redis client is a module-level singleton in `frontend/lib/redis.ts`
- **Edge vs Node:** `middleware.ts` runs on Edge runtime (no Node APIs — uses `atob` not `Buffer`); API routes use Node runtime by default
- **Prisma output path:** Schema in `prisma/schema.prisma` with `output = "../frontend/node_modules/.prisma/client"` — schema is at repo root, client generated into frontend
- **Auth:** No Better Auth yet despite being in CLAUDE.md; actual implementation uses Supabase JS SDK (`frontend/lib/supabase.ts`) for client auth and cookie-based JWT for API verification
- **AI model:** Groq `llama-3.3-70b-versatile` via `@ai-sdk/groq`; Vercel AI SDK `streamText` with tool use

## Anti-Patterns

### Client-side user ID trust with optimistic render

**What happens:** `frontend/app/discover/page.tsx` reads `userId` from `localStorage` before Supabase session validation completes (optimistic render)
**Why it's wrong:** A tampered `localStorage` value would render the authenticated UI before the server confirms the session
**Do this instead:** Session validation in middleware is the security gate; the optimistic render is only a UX optimization, but new features should not use `localStorage` user ID for security decisions — always read from validated server session

### Scoring logic embedded in repository

**What happens:** `scoreAndRankProjects()` lives inside `frontend/lib/repositories/projectRepository.ts` alongside DB queries
**Why it's wrong:** Business ranking logic is co-located with data access, making it hard to test or change independently
**Do this instead:** Consider moving scoring to a separate `frontend/lib/ai/scorer.ts` module; keep `projectRepository.ts` focused on data retrieval

## Error Handling

**Strategy:** Structured try/catch at route handler boundaries; non-fatal service errors (Redis, cache) are swallowed silently to avoid breaking primary flows

**Patterns:**
- Redis/cache failures: caught and ignored — in-process fallback used for rate limiting
- Stream errors: caught inside `ReadableStream.start()`, sent as `{type: 'error'}` SSE event, then stream closed
- Validation failures: Zod `safeParse` → immediate 400 response before any DB/AI calls
- Auth failures: middleware returns 401 before route handler executes

## Cross-Cutting Concerns

**Logging:** `console.log/error` with structured prefixes (`[chat]`, `[mw]`, `[leadNotify]`); Sentry SDK for error tracking (`frontend/sentry.*.config.ts`)
**Validation:** Zod schemas at all API entry points (`BodySchema` in chat route, custom schemas in other routes)
**Authentication:** Supabase JWT cookies verified in `frontend/middleware.ts`; admin routes use separate `admin_token` cookie via `frontend/lib/adminToken.ts`

---

*Architecture analysis: 2026-06-14*
