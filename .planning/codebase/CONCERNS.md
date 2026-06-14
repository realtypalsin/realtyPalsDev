# Codebase Concerns

**Analysis Date:** 2026-06-14

---

## Tech Debt

### Callback uses SiteVisitRequest table as a hack
- Issue: Callback requests are stored in `SiteVisitRequest` using sentinel values (`project_id: 'callback'`, `time_slot: '__callback__'`) to avoid creating a dedicated table.
- Files: `frontend/app/api/v1/callback/route.ts` (lines 30–43)
- Impact: Queries on `SiteVisitRequest` are polluted with fake records; any analytics or admin UI that counts or filters site visits will return inflated/incorrect counts. The `leads/count` API (`frontend/app/api/v1/leads/count/route.ts`) counts all `SiteVisitRequest` rows including callback sentinel rows, making the count misleading.
- Fix approach: Add a dedicated `CallbackRequest` model to the Prisma schema (`prisma/schema.prisma`) and migrate existing sentinel records.

### `toProjectCard` accepts `any` type — no Prisma type safety
- Issue: `toProjectCard` in `frontend/lib/repositories/projectRepository.ts` is typed `(p: any): ProjectCard`. Multiple `(project as any).field` casts appear throughout to access fields that exist on the Prisma model but are not in the current TypeScript type.
- Files: `frontend/lib/repositories/projectRepository.ts` (lines 87, 206–209, 230, 249)
- Impact: Compiler cannot catch schema-type mismatches. Breakage only surfaces at runtime.
- Fix approach: Replace the `any` parameter with the inferred Prisma `Project` + relations type using `Prisma.ProjectGetPayload<{include: {...}}>`.

### Global window side-channel for chat reset
- Issue: `DiscoveryContent.tsx` registers `window.__resetDiscoveryChat` as a global function; `Sidebar.tsx` reads and calls it directly. This is an imperative DOM side-channel instead of a proper state-lifting or context pattern.
- Files: `frontend/components/DiscoveryContent.tsx` (lines 483–487), `frontend/components/Sidebar.tsx` (lines 135–136, 161–162)
- Impact: Brittle; depends on component mount order; invisible to React DevTools; will silently fail if component unmounts.
- Fix approach: Lift reset state to a shared context/provider or use a URL-driven mechanism (query param change triggers reset via `useEffect`).

### `IntentManager` is built but mostly unused
- Issue: `frontend/lib/ai/intentManager.ts` (356 lines) implements a full intent state machine with completeness scoring and field resolution. The main chat route (`frontend/app/api/v1/chat/route.ts`) does not import or use it — intent is inferred entirely by the LLM through tool selection.
- Files: `frontend/lib/ai/intentManager.ts`, `frontend/app/api/v1/chat/intent/route.ts`
- Impact: Dead code adds maintenance surface. The `/api/v1/chat/intent` route exists but is not called by the main chat flow.
- Fix approach: Either wire `IntentManager` into the main chat route for structured slot-filling, or delete both files.

### `PropertyCard.tsx` has dual-type field access
- Issue: `frontend/components/PropertyCard.tsx` uses `(property as any).images`, `(property as any).tier`, `(property as any).address`, `(property as any).minPrice`, etc. These are legacy field names from an older data model that no longer matches the current `ProjectCard` type.
- Files: `frontend/components/PropertyCard.tsx` (lines 31–32, 98–99, 126–127, 137–138)
- Impact: Silent `undefined` values when the old field names are absent. Two separate `ProjectCard`-like components exist (`PropertyCard.tsx` and `ProjectCard.tsx`) — unclear which is canonical.
- Fix approach: Audit which component is actually rendered in production, delete the other, and replace `as any` casts with proper typed access.

### Search query cached with user query string as key component
- Issue: `searchProjects` in `frontend/lib/repositories/projectRepository.ts` includes the first 60 chars of `userQuery` in the Redis cache key. The same structured filters with slightly different natural language phrasing will produce different cache misses.
- Files: `frontend/lib/repositories/projectRepository.ts` (lines 112–123)
- Impact: Cache hit rate is lower than it could be for semantically identical queries phrased differently.
- Fix approach: Normalize query to extracted structured filters only for cache keying; use the raw query only for scoring, not caching.

---

## Security Considerations

### `x-user-id` header is caller-controlled — no session verification
- Risk: All user-scoped API routes (`/api/v1/chat`, `/api/v1/saved`, `/api/v1/chat/session`, `/api/v1/price-alerts`) trust the `X-User-Id` header sent by the client. Any caller can set an arbitrary UUID and read or write data as any user.
- Files: `frontend/app/api/v1/chat/route.ts` (line 34–36), `frontend/app/api/v1/saved/route.ts` (lines 6–8), `frontend/app/api/v1/chat/session/route.ts` (lines 6–8), `frontend/app/api/v1/price-alerts/route.ts` (line 36)
- Current mitigation: None. The header is accepted at face value with no token/session validation.
- Recommendations: Integrate Better Auth (already in the stack per CLAUDE.md) so that the user ID is extracted from a verified server-side session/cookie, not a client-supplied header. Until then, any user can impersonate any other user ID.

### Admin auth uses SHA-256(password + secret) — no timing-safe comparison
- Risk: `validateAdminToken` in `frontend/lib/adminToken.ts` compares token strings with JavaScript `===`. String equality in JS is not guaranteed to be constant-time, opening a theoretical timing side-channel.
- Files: `frontend/lib/adminToken.ts` (lines 18–22)
- Current mitigation: SHA-256 hash comparison reduces practical exploitability. Cookie is HttpOnly + SameSite=Strict.
- Recommendations: Use `crypto.timingSafeEqual` (Node.js) or a constant-time comparison utility for the token check.

### Admin image upload falls back to publishable key if service role key is absent
- Risk: `frontend/app/api/v1/admin/upload-image/route.ts` uses `SUPABASE_SERVICE_ROLE_KEY || NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — if the service role key is not set, storage uploads proceed with the public anon key, which bypasses the intent of the RLS bypass.
- Files: `frontend/app/api/v1/admin/upload-image/route.ts` (lines 10–11)
- Current mitigation: Admin route is guarded by admin token check.
- Recommendations: Throw an explicit error if `SUPABASE_SERVICE_ROLE_KEY` is absent rather than silently falling back.

### Non-null assertions on env vars will crash at runtime silently
- Risk: `frontend/lib/redis.ts` uses `process.env.UPSTASH_REDIS_URL!` and `UPSTASH_REDIS_TOKEN!`. `frontend/lib/supabase.ts` uses `NEXT_PUBLIC_SUPABASE_URL!` and `NEXT_PUBLIC_SUPABASE_ANON_KEY!`. Missing env vars produce `undefined` passed into constructors, causing confusing runtime errors rather than clear startup failures.
- Files: `frontend/lib/redis.ts` (lines 8–9), `frontend/lib/supabase.ts` (lines 4, 7)
- Current mitigation: Redis client has a fallback in-process rate limiter; Supabase client fails at first call.
- Recommendations: Add explicit startup checks (similar to `frontend/lib/adminToken.ts` pattern) or use a typed env validation library (e.g., `t3-env`).

### Transcription endpoint has no authentication
- Risk: `/api/v1/transcribe` accepts audio uploads and calls Groq Whisper with no auth, rate limiting, or user check. Any anonymous client can send audio to drain Groq API quota.
- Files: `frontend/app/api/v1/transcribe/route.ts`
- Current mitigation: 25MB file size limit only.
- Recommendations: Add `X-User-Id` validation and apply the existing Redis rate limiter.

### Document QA endpoint (`/api/v1/documents/ask`) has no authentication
- Risk: Anyone knowing a valid `document_id` UUID can query document contents via AI without being the owner or an authenticated user.
- Files: `frontend/app/api/v1/documents/ask/route.ts`
- Current mitigation: Requires a valid UUID; documents are not publicly listed.
- Recommendations: Require user authentication and verify document ownership before answering.

---

## Performance Bottlenecks

### `searchProjects` always fetches up to 15 full project rows including all relations
- Problem: Every search query fetches up to 15 projects each with `unit_types`, `amenities`, `connectivity`, and `images` included. For large result sets this is a wide join.
- Files: `frontend/lib/repositories/projectRepository.ts` (lines 144–166)
- Cause: No field selection on amenities/connectivity; full relation trees returned.
- Improvement path: Use Prisma `select` to limit fields on amenities/connectivity to only what `toProjectCard` uses, or implement cursor-based pagination.

### `DiscoveryContent.tsx` is 1181 lines — large component with multiple concerns
- Problem: A single client component handles chat SSE streaming, speech recognition, chip pickers, site visit modal, calculator panel, property display, session management, and URL sync.
- Files: `frontend/components/DiscoveryContent.tsx`
- Cause: Incremental feature additions without decomposition.
- Improvement path: Extract custom hooks (`useChatStream`, `useSpeechInput`, `useSessionSync`) and sub-components for each modal.

### `ProjectDetailPanel.tsx` is 762 lines — no code splitting
- Problem: Full component is loaded even when the panel is not open. It includes heavy logic for commute calculation, document Q&A, comparison, and RERA display.
- Files: `frontend/components/ProjectDetailPanel.tsx`
- Cause: No dynamic import wrapper.
- Improvement path: Wrap in `dynamic(() => import(...), { ssr: false })` (matching the pattern already used for `SiteVisitScheduler` and `CalculatorPanel` in `DiscoveryContent.tsx`).

### Redis rate limiter can produce two round trips per chat request
- Problem: `checkRateLimit` calls `redis.incr` then conditionally `redis.expire` in separate commands. Under high concurrency this is not atomic.
- Files: `frontend/lib/redis.ts` (lines 30–31)
- Cause: Separate INCR and EXPIRE calls instead of a Lua script or a single `SET ... EX ... NX`.
- Improvement path: Replace with a Lua script or use Upstash's native sliding window rate limit.

---

## Fragile Areas

### Chat SSE stream closes silently on `try {}` empty catch
- Files: `frontend/app/api/v1/chat/route.ts` (line 130)
- Why fragile: `controller.enqueue` errors are caught with an empty catch block. If the stream is in an invalid state and encoding fails, the error is silently dropped and the client receives no indication.
- Safe modification: Log the error before swallowing it so monitoring can detect delivery failures.
- Test coverage: None — the SSE streaming path has no tests.

### `AbortSignal.any` is only available in Node 20+
- Files: `frontend/app/api/v1/chat/route.ts` (lines 121–123)
- Why fragile: `AbortSignal.any` is guarded by a truthiness check (`AbortSignal.any ? ... : timeoutController.signal`), meaning on older Node versions the client disconnect signal is silently ignored and only the hard timeout applies.
- Safe modification: Document the Node 20 minimum runtime requirement; set it in `package.json` `engines` field.
- Test coverage: None.

### `failed_webhooks` table has no retry mechanism
- Files: `frontend/lib/leadNotify.ts` (lines 69–81)
- Why fragile: Failed webhook payloads are persisted to `FailedWebhook` but there is no background job, cron, or admin UI to retry them. Records sit in the table indefinitely unless manually resolved.
- Safe modification: Add an admin UI in `frontend/app/admin/` to list and retry `resolved=false` records, or a Vercel cron job.
- Test coverage: None.

### Session creation race condition
- Files: `frontend/app/api/v1/chat/route.ts` (lines 86–91)
- Why fragile: When `session_id` is absent, the code creates a new session. If two concurrent requests arrive with no session ID from the same user, two sessions can be created. No uniqueness constraint prevents this.
- Safe modification: Add a unique constraint on `(user_id, created_at)` or use an upsert pattern keyed on a client-provided idempotency token.

---

## Test Coverage Gaps

### Chat route has zero test coverage
- What's not tested: The entire SSE streaming pipeline, tool execution, memory update logic, rate limiting behavior, session creation, and message persistence.
- Files: `frontend/app/api/v1/chat/route.ts`
- Risk: A regression in tool selection or memory update logic would ship silently.
- Priority: High

### All API routes except calculators are untested
- What's not tested: Admin auth, project CRUD, saved properties, callback/site-visit lead capture, document Q&A, commute, registry prices.
- Files: All files under `frontend/app/api/v1/` except covered indirectly via `frontend/__tests__/calculators.test.ts`
- Risk: Regressions in lead capture (business-critical) would not be caught.
- Priority: High for `callback/route.ts`, `site-visit/route.ts`; Medium for others.

### Repository layer (`projectRepository.ts`) has no tests
- What's not tested: `searchProjects` filter logic, `scoreAndRankProjects` ranking algorithm, `toProjectCard` mapping.
- Files: `frontend/lib/repositories/projectRepository.ts`
- Risk: Scoring bugs (e.g. wrong budget headroom calculation) silently degrade recommendation quality.
- Priority: High

### No end-to-end or integration tests
- What's not tested: Full user flows (search → EMI → callback, or save → site visit).
- Risk: Cross-layer regressions are invisible.
- Priority: Medium

---

## Scaling Limits

### In-process rate limiter fallback does not scale horizontally
- Current capacity: Works correctly on a single Vercel function instance.
- Limit: When Vercel scales to multiple instances, the `localRl` Map in `frontend/lib/redis.ts` is per-process. A user can exceed the rate limit on one instance and be admitted on another.
- Scaling path: Ensure Redis (Upstash) is always available; treat Redis failure as a hard service failure rather than falling back to per-process state.

### `searchProjects` result cap at 15 is hardcoded
- Current capacity: Returns at most 15 projects.
- Limit: As inventory grows beyond ~100 projects the fixed-15 cap without full-text or semantic search will produce poor recall for niche queries.
- Scaling path: Add `ai_search_keywords` full-text indexing (field already exists in schema) or integrate pgvector for semantic search.

---

## Missing Critical Features

### No authentication actually enforced — Better Auth is declared but not wired
- Problem: CLAUDE.md declares Better Auth as the auth stack. No API routes verify a signed session. User identity is entirely client-supplied via `X-User-Id` header.
- Blocks: Saved properties, price alerts, and session history are trivially accessible cross-user. Signup gates described in CLAUDE.md (save, callback, site visit) are not enforced server-side.

### No admin protection on the leads count API
- Problem: `frontend/app/api/v1/leads/count/route.ts` has no auth check — anyone can query today's lead count.
- Blocks: Sensitive business metric is publicly readable.

### `FailedWebhook` records are never retried or surfaced
- Problem: The admin UI at `frontend/app/admin/` shows builders and projects but has no view for `FailedWebhook` records. Lead data that failed delivery is invisible to ops.
- Blocks: Lost leads go unnoticed without a database query.

---

*Concerns audit: 2026-06-14*
