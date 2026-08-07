# RealtyPals — Launch Readiness Audit (Brutal Honesty Edition)

**Date:** 2026-08-07
**Branch:** feature/overview-tab-rebuild
**Scope:** Full stack — database, security, frontend/backend/Prisma sync, performance, adversarial break-testing, code quality, component-by-component rating.
**Mandate:** Nothing held back. Every finding has file:line, exact failure mode, and a fix.

---

## THE ONE THING TO READ FIRST

**The property-detail tabs fabricate data and present it with the same trust signals as verified data.** `BuilderTab.tsx`, `OverviewTab.tsx`, `LocationTab.tsx`, `IntelligenceTab.tsx`, `ConstructionTimeline.tsx` all have fallback code paths that invent fake builder names, fake phone numbers, fake RERA registration IDs, fake awards, fake construction milestones with specific dates, and a "Risk & Compliance Check" that defaults every unchecked item to a green "Clear" — visually identical to an actually-verified pass.

RealtyPals's entire pitch is "trust over listing volume." Right now, the product actively works against its own mission the moment a project record is incomplete. This is not a polish issue. This is the #1 blocker, full stop, before anything else on this list matters.

---

## SEVERITY LEGEND

🔴 CRITICAL — blocks launch, fix before anyone sees this app
🟠 HIGH — fix before real user traffic, exploitable/costly/embarrassing
🟡 MEDIUM — fix in first week post-launch
🟢 LOW — backlog, hygiene

---

## 1. DATA INTEGRITY — "NEVER INVENT DATA" VIOLATIONS 🔴

This is pulled out as its own top-level section because it's the most consequential finding in the entire audit and spans multiple components.

| # | File:Line | What's fabricated | Shown as |
|---|---|---|---|
| 1 | `BuilderTab.tsx:40-46` | 5 fake channel partner companies (Anarock, Square Yards, PropTiger, InvestoX, IPC) with fake phone numbers + fake RERA IDs (`UPRERAAGT10283` etc.) | "✓ Verified RERA" badge, callable phone number |
| 2 | `OverviewTab.tsx:170-175` | A **second, different** set of fake channel partners for the same project — contradicts BuilderTab's fake set in the same session | Same badge |
| 3 | `BuilderTab.tsx:60-64` | 3 fake "Featured Projects" generated from the real builder's name (`${builderName} Golf Greens`, etc.) | Real project history |
| 4 | `BuilderTab.tsx:79-88` | Fake awards ("Luxury Project of the Year 2023") and fake media mentions (Economic Times, Forbes, CNBC) | Real accolades |
| 5 | `BuilderTab.tsx:166-172` | Static "18,000+ Happy Families" / "22.4M+ Sq. Ft. Delivered" shown **unconditionally**, not gated on real data at all | Real builder metrics |
| 6 | `LocationTab.tsx:45-51` | Hardcoded fake nearby-connectivity rows with specific fake distances/times | Real proximity data |
| 7 | `LocationTab.tsx:75-83` | "Commute Calculator" does `.includes('airport')` string matching and returns a **hardcoded fake travel time** — no API call at all | A live calculated result |
| 8 | `ResidencesTab.tsx:411-414` | Fake "Type C"/"Type D" floor plans with computed fake price deltas | Real unit inventory |
| 9 | `ConstructionTimeline.tsx:40-140` | Two complete fake milestone timelines with specific fabricated dates ("2024-03-31", "Fire NOC issued and verified") | Real construction progress |
| 10 | `ConstructionTimeline.tsx:329` | "Independent RERA Audit Verified • Physical Inspection Velocity Score: 9.4/10" — invented number, no data source | A real audit score |
| 11 | `PricingTab.tsx:453-477` | Fixed fake price/badge numbers ("3.2% vs last month") never computed from real trends | Real market movement |
| 12 | `IntelligenceTab.tsx:44-46` | `projectCagr = sectorCagr + 1.2` where `sectorCagr` itself defaults to hardcoded `12` — invented number derived from another invented number | A precise growth chart with tooltips |
| 13 | `IntelligenceTab.tsx:216-218` | "Absorption Rate"/"Unsold Inventory" default to `'7.8 Months'` unconditionally | Real market intelligence |
| 14 | **`IntelligenceTab.tsx:710-714`** | **"Risk & Compliance Check" defaults every check (Legal Due Diligence, Encumbrance, Approvals) to green "Clear" when no data exists — identical to an actually-passed check** | **A verified legal clearance** |
| 15 | `IntelligenceTab.tsx:740` | Generic "strong buy" advisor text when no real thesis exists — no negative framing at all | An honest recommendation |
| 16 | `ProjectDetailPanel.tsx:596-597` | Fake "21+ Yrs Experience", "3,000+ Units" in builder hover popover | Real builder stats |
| 17 | `CompletenessBar.tsx:21` | Unset completeness score defaults to fabricated **85%** ("High Data Quality") — could mislead an *admin* into thinking an empty listing is launch-ready | Real data quality score |

**Fix pattern (copy this — `PartnersTab.tsx` already does it right):** every one of these must replace its fake fallback with an honest "Not yet available" / "Not yet verified" neutral state. #14 is the highest priority single fix in this entire report — a gray "Not yet verified" is categorically different from a green "Clear," and right now users cannot tell the difference. Fix effort: a few hours total across all 17, this is conditional-rendering work, not a rewrite.

---

## 2. SECURITY

### 🔴 CRITICAL: No rate limiting on admin login
`backend/src/routes/admin.ts:34` (`POST /admin/auth`) has **zero rate limiting**. Password comparison is timing-safe (`passwordMatches`, line 26-31 — good), but nothing stops unlimited password guesses against the single shared `ADMIN_PASSWORD`. One password, no lockout, no throttle = brute-forceable given enough time, and it's the key to every project/builder/lead record in the system.
**Fix:** apply the same `checkRateLimit` used elsewhere (e.g. 5 attempts/15min per IP) to this route specifically.

### 🟠 HIGH: Guest sessions have no daily AI-cost ceiling
`backend/src/routes/chat.ts:339` — `isOverDailyBudget` checks are keyed by `userId`, which is `null` for guests. Guests get only the 20/min identity + 40/min IP throttle (`chat.ts:324-336`), no daily cap. A single-IP script sending 20 msgs/min continuously = ~28,800 AI calls/day/IP with no ceiling, against metered Groq/OpenAI/Claude/Gemini billing.
**Fix:** apply `isOverDailyBudget` to `guestToken` too, not just `userId`. Consider a lightweight bot-check (Turnstile) before first guest message.

### 🟠 HIGH: Duplicate leads from double-click / no idempotency
`backend/src/routes/leads.ts` — `/leads/callback` and `/leads/site-visit` are rate-limited (5/hour) but not deduped. Two rapid clicks within the rate window both create a `callbackRequest`/`siteVisitRequest` row, a `builderLead` row, **and fire the outbound webhook twice.** Directly pollutes the sales pipeline — CLAUDE.md names lead quality as a core success metric.
**Fix:** reject if an identical `(userId/guestToken, project_slug, visit_date)` request was created in the last N seconds, or use a client-generated idempotency key with a unique DB constraint.

### 🟠 HIGH: Unguarded `JSON.parse` on AI model output (3 backend + 1 frontend site)
- `backend/src/lib/ai/intent.ts:76` — bare `JSON.parse(str)` before `safeParse`. If the model returns malformed (not just wrong-shaped) JSON, this throws synchronously, Zod never gets a chance to reject gracefully.
- `backend/src/lib/ai/prompts/chips.ts:30` — same, unguarded.
- `backend/src/lib/ai/contextBuilder.ts:153` — same, unguarded.
- `frontend/lib/backend-api.ts:163` — SSE data line parse, not confirmed wrapped; a malformed chunk here can kill a stream mid-response.
**Fix:** wrap all four in try/catch with the existing "extraction failed" fallback path. Cheapest, highest-value fix in the whole audit — under an hour of work.

### 🟠 HIGH: Missing required env vars don't fail boot
`backend/src/lib/config.ts` (AI provider keys: `GEMINI_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`) and Supabase/admin secrets are **not** covered by the Zod-validated `EnvSchema` in `backend/src/lib/env.ts` — only `PORT`, `NODE_ENV`, webhook/WhatsApp/Twilio/Resend vars are enforced. If all AI keys are missing/typo'd, the server boots clean, logs a boolean at `info` level (easy to miss), and **the first real user's chat message is the first thing that fails.**
**Fix:** extend boot-time validation to hard-fail (`process.exit(1)`) in production if no AI provider key is present, or if `ADMIN_PASSWORD`/`SUPABASE_SERVICE_ROLE_KEY` are missing.

### 🟡 MEDIUM: RERA validation is format-only, not registry-verified
`backend/src/lib/rera.ts:35,76` — current check is regex format validation with an explicit `TODO(production): Integrate with state RERA registries`. If the UI ever implies "RERA verified" rather than "RERA format valid" anywhere, that's a trust violation against CLAUDE.md's own rules. Cross-reference against Section 1 above — the fake RERA IDs shown are a much bigger version of this same problem.
**Fix:** ensure all UI copy says "RERA format verified" not "RERA verified," until real registry integration exists.

### ✅ Confirmed SAFE (no action needed)
- SQL injection: not exploitable — all DB access goes through Prisma's parameterized query builder.
- CORS: correctly allowlisted (`index.ts:72-89`), not wildcard.
- Admin route auth: `requireAdmin` middleware correctly gates all admin mutation routes (`documents.ts`, `builderApplications.ts`, `admin.ts`) — timing-safe password comparison, Redis-backed session with in-memory fallback.
- XSS: React 18 default escaping, no `dangerouslySetInnerHTML` found.
- File upload: `uploadValidator.ts` exists and is wired into the document upload route.

### Explicit answer: can bots/scrapers/attackers exploit these endpoints?
- **Chat endpoint:** rate-limited per identity+IP but no daily cost cap for guests → **yes, cost-abuse exploitable.**
- **Leads (callback/site-visit):** rate-limited but not deduped → **yes, spam/duplicate exploitable, not data-breach exploitable.**
- **Admin login:** no rate limit on a single shared password → **yes, brute-force exploitable given time/automation.**
- **Builder registration:** validated client + presumably server-side (not independently verified this pass) — flagged as **not fully verified**, recommend a follow-up check specifically on `builderRegistration.ts` server-side validation depth.

---

## 3. DATABASE & SCALABILITY

### 🔴 CRITICAL: Schema drift across 3 Prisma schema files, confirmed and quantified
`schema.simplified.prisma` is missing **19 real models** (`AiUsageEvent`, `BuilderAccount`, `ChannelPartner`, `UnitInventory`, `SectorIntelligence`, and 14 more). `schema.prisma.backup` is missing **7 models**. Both sit inside `prisma/` — the exact directory Prisma tooling globs by convention. No build/CI script points at either today, but a bare `prisma generate` run by a rushed dev or an AI coding agent picking the wrong file generates a client silently missing 19 models.
**Fix:** delete both, or move out of `prisma/` entirely. 5-minute fix, do it now.

### 🔴 CRITICAL: `queryOptimizer.ts` is dead code that doesn't match the schema at all
`backend/src/lib/queryOptimizer.ts:21-166` (`getOptimizedProjectSelect`) references relation/field names that don't exist: `cost_sheet` (real: `CostSheet`), `price_history` with `price_cr`/`recorded_date` (real: `PriceHistory.total_price_cr`/`recorded_at`), `construction_status` (no such relation — real: `construction_milestones`), `coordinates` (real: `lat`/`lng`), `founding_year`, `delivery_score` (doesn't exist on `Builder` at all). Currently unused anywhere — but it has JSDoc and cost estimates, reads as production-ready, and the moment someone wires it in under load, every call throws `PrismaClientValidationError`.
**Fix:** delete the file, or rewrite against real relation names before it's ever called.

### 🟠 HIGH: `queryPlanner.ts` — the highest-frequency query in the app is also the least optimized, and it's a correctness bug, not just perf
`backend/src/lib/discovery/queryPlanner.ts:237-249` (`extractProjectIds`) runs `prisma.project.findMany({ take: 100 })` **on every single chat message from every user**, uncached, then loops all 100 rows building a `new RegExp` per project against the message text. The `take: 100` cap means **projects beyond row 100 (no `orderBy`, so arbitrary order) can never be matched by name** — the assistant will wrongly report "project not found" for a real project the moment the catalog crosses 100 live entries. That's a realistic V1 number for Noida alone, not a hypothetical. This directly produces a false negative — exactly the kind of wrong-confidence answer CLAUDE.md bans.
Separately, `checkDataAvailability` (`queryPlanner.ts:360-362`) fetches full project rows (including large JSON/vector columns) just to check two booleans — no `select` clause.
**Fix:** filter in SQL (`WHERE name ILIKE`), drop the blanket `take: 100` fetch-everything pattern, add a 5-10 min cache since the catalog changes rarely, add `select: { id: true, status: true }` to the availability check.

### 🟠 HIGH: Case-insensitive search bypasses indexes — sequential scan on every sector/name filter
`backend/src/lib/discovery/projects.ts` (multiple sites: `:166-167, 200-230, 620-628, 721-723, 880, 907, 936`) uses Prisma's `mode: 'insensitive'`, which compiles to `ILIKE` on Postgres — the existing `@@index([city, sector])` btree index **cannot serve this**. Invisible today at hundreds of rows; at 10k-100k+ rows (multi-city future) this becomes a full table scan on every chat message that resolves a sector or project name.
**Fix:** `CREATE EXTENSION pg_trgm` + GIN trigram indexes on `sector`/`name`. Not urgent for single-city V1 launch, but must be tracked and done before any multi-city rollout — don't let this get forgotten.

### 🟠 HIGH: Connection pooling under serverless — unconfirmed, launch-blocking unknown
Both `backend/src/lib/db.ts` and `frontend/lib/db.ts`/`prisma.ts` correctly use the singleton-client pattern (no new `PrismaClient` per request). `schema.prisma:5-9` correctly defines separate `url` (pooled) and `directUrl` (migrations) — the schema is set up right. **What's unconfirmed: whether the actual `DATABASE_URL` value goes through a real pooler (Supabase pgbouncer endpoint) in production.** If backend is serverless and isn't pooled, each cold instance opens its own ~9-13 connection pool; 10 concurrent instances = 90-130 connections, exceeding most managed Postgres `max_connections` (100) tiers — the server falls over at the exact moment traffic spikes from 10 users to 10,000.
**Fix:** this needs one direct answer from whoever owns hosting config, not more code reading. Confirm `DATABASE_URL` has `?pgbouncer=true&connection_limit=1`, `directUrl` stays unpooled for migrations only. **Do not launch without confirming this explicitly.**

### 🟡 MEDIUM: No index on `Project.rera_number`, a trust-critical field
`schema.prisma:97` — `rera_number String?` has no index, no uniqueness check. Nothing stops two projects being entered with the same RERA number (a real duplicate/bad-data signal), and admin RERA lookups have no index to use.
**Fix:** `@@index([rera_number])` at minimum.

### 🟡 MEDIUM: `ChatSession.focus_project_id` has no FK — deleting a project leaves a dangling live-conversation pointer
Unlike most of the schema (which correctly cascades), `ChatSession.focus_project_id` and some analytics tables (`PropertyEvent.project_id`) are bare indexed strings with no `@relation`. For analytics tables this is a defensible denormalized-audit-trail pattern; for `ChatSession.focus_project_id` it's not — a deleted project leaves live chat sessions pointing at a dead ID.
**Fix:** add `@relation(fields: [focus_project_id], references: [id], onDelete: SetNull)` specifically for `ChatSession`.

### 🟡 MEDIUM: Cache invalidation on admin writes — not confirmed
Redis rate limiting fails closed correctly (falls back to in-memory if Redis is down — good). But no `deleteCached` call was found tied to project/price mutations. Search results cache 5 min, project repository cache 30 min. If unconfirmed and missing: an admin fixing a wrong price or possession date leaves users seeing the stale wrong value for up to 30 minutes — a real trust violation for a product built on honest data, not just a UX nit.
**Fix:** verify admin write routes call `deleteCached` on the relevant keys after every mutation; add it if missing.

### Explicit answer: Can this DB handle 10,000 users instead of 10?

| Query path | Verdict |
|---|---|
| Main search (`discovery/projects.ts`, paginated, indexed, cached) | **Yes**, for V1's single-city/hundreds-of-projects scale |
| Per-message project extraction (`queryPlanner.ts`) | **No** — uncached, and the 100-row cap is a correctness bug today, not a future scale problem |
| Frontend search (`projectRepository.ts`) | **Yes** — cached, properly indexed |
| Project detail fetch (`projectDataGateway.ts`) | **Yes** — parallel fetchers, single indexed lookup, no N+1 |
| Connection pooling under concurrent load | **Unconfirmed — could be a hard No** if serverless without a pooler. This is the one binary yes/no answer that needs checking hosting config directly, today, before launch. |

**Bottom line:** the data model and main search path genuinely hold up at 10k users on V1's actual catalog size. The two real risks are (a) `queryPlanner.ts`'s per-message full-table-fetch-with-100-row-cap, which breaks correctness at ~100 projects — a number V1 will hit — and (b) unconfirmed connection pooling, which is a yes/no fact-check, not a code problem.

### Summary Table

| Component | Rating /10 | Why | Fix Priority |
|---|---|---|---|
| Schema file hygiene | 3 | Two dead, diverged schema files inside the directory Prisma scans | 🔴 P0, 5-min fix |
| `queryOptimizer.ts` | 1 | Entirely broken against real schema, currently dead but landmine-ready | 🔴 P0, delete now |
| `queryPlanner.ts` message-time extraction | 4 | Highest-frequency query in the app, least hardened, real correctness cliff at ~100 projects | 🔴 P0 |
| Indexes on core Project/UnitType | 6 | Solid on primary filter path; gap on case-insensitive search + rera_number | 🟡 P2 (pg_trgm before multi-city) |
| Main search flow (`discovery/projects.ts`) | 7 | Real pagination, real caching, real indexes | ✅ for V1 |
| Project detail fetch | 7 | Parallel, indexed, no N+1 | ✅ |
| Migration safety (3 reviewed) | 8 | All use safe patterns, no lock risk found | ✅ |
| FK/cascade integrity | 6 | Mostly correct; `ChatSession.focus_project_id` gap | 🟡 P2 |
| Connection pooling | **unconfirmed** | Schema is set up correctly; actual `DATABASE_URL` config unverified | 🔴 **P0 — confirm before launch, binary fact-check** |
| Cache invalidation on writes | **unconfirmed** | Rate limiter is correct; write-path invalidation not verified | 🟡 P1 — verify |

---

## 4. FRONTEND-BACKEND-PRISMA SYNC

### 🔴 CRITICAL: Admin Intelligence save routes don't exist
`frontend/components/admin/IntelligenceWorkspace.tsx` (lines 441, 446, 463, 478) calls four `PATCH` routes (`/dna`, `/decision-profile`, `/persona-profile`, `/recommendation-profile`) that **do not exist anywhere in `backend/src/routes/admin.ts`.** Every save in the DNA/Decision/Persona/Recommendation sections of the admin Intelligence Workspace 404s. The generic error handler shows a 4-second toast with no detail — easy to miss.
**Impact:** admins cannot populate the exact data (`DecisionProfile`, `PersonaProfile`, `RecommendationProfile`) that backs the product's core differentiator per CLAUDE.md. Any current-looking data was written directly to Postgres, not through this tool.
**Fix:** add the four missing `PATCH` routes, mirroring the existing `/milestones`/`/channel-partners` pattern.

### 🔴 CRITICAL: Frontend types reference 6 fields deleted by migration `20260801170000`
Schema comment (`schema.prisma:289`) literally says these were deleted: `end_use_thesis`, `investment_thesis`, `family_thesis`, `investor_thesis`, `luxury_thesis`, `risk_thesis`. But `frontend/types/project.ts:266-280` still declares all six, `IntelligenceWorkspace.tsx` still reads/writes them, and `ComparisonTable.tsx:185,1164` still reads them directly.
**Impact:** even after fixing the routes above, any PATCH containing these keys throws a Prisma validation error; on read, the comparison table permanently renders blank for these fields with zero error.
**Fix:** delete the 6 fields from `RecommendationProfilePublic` and `IntelligenceWorkspace.tsx`'s state; repoint `ComparisonTable.tsx` at `primary_thesis`.

### 🟠 HIGH: Dead route + unmounted router (`useIntelligence.ts` / `intelligence.ts`)
`frontend/hooks/useIntelligence.ts:32` calls a Next.js path that doesn't exist; the matching Express `intelligence.ts` router is a real file but **never mounted** in `backend/src/index.ts`. Currently dead (no component calls this hook) but a landmine for whoever wires it next — silent empty-state, no surfaced error.
**Fix:** delete both, or mount the router and repoint the hook.

### 🟠 HIGH: `getInvestmentIntelligence` return type includes phantom fields
`frontend/lib/backend-api.ts:252-266` types `investment_thesis`/`investor_thesis` as returned — the actual route (`backend/src/routes/projects.ts:256-305`) never sends them (consistent with the deleted-fields finding above). Any consumer trusting the TS type gets silent `undefined`.
**Fix:** correct the return type to match the route's real `res.json()` shape.

### 🟡 MEDIUM: Duplicate dead route registration
`backend/src/routes/admin.ts` registers `/projects/:id/milestones` GET+PUT **twice** (lines 386/412 and again 1094/1109+). Express matches in registration order — the second block is permanently unreachable dead code.
**Fix:** delete the second block.

### 🟡 MEDIUM: Legal/trust fields unreachable in admin UI
~25 schema fields tied directly to the trust mission (`legal_flag`, `registry_status`, `escrow_verified`, `nclt_moratorium_active`, `oc_obtained*`, `rera_valid_until`, `location_advantages/concerns`, `walkability_score`, `aqi_annual_avg`, etc.) are **not present anywhere in `ProjectForm.tsx`.** They're optional at the DB level, so records can save, but every new project silently launches without the exact data CLAUDE.md says must never be guessed or omitted.
**Fix:** audit whether another admin surface sets these; if not, add them to `ProjectForm.tsx`.

### ✅ Confirmed healthy
Enum/status literal consistency (`ProjectStatus`, `IntelligenceStatus`, `LeadStatus`, `ConstructionStatus`) — no drift found. Discovery response shape (`decisionIntelligence`, `whyNot`, `intelligenceCompleteness`) — correctly wired end-to-end. Prisma schema file selection in build/CI — no wiring risk found.

---

## 5. PERFORMANCE & BREAK-IT (ADVERSARIAL)

### 🔴 CRITICAL: Duplicate leads on double-click (see Security section — same root cause, listed there too since it's both a cost and security issue)

### 🟠 HIGH: `ProjectCard` re-renders on every streamed AI token
`DiscoveryContent.tsx`'s SSE `token` handler calls `setChatHistory(prev => prev.map(...))` on every streamed token (potentially hundreds per response). `ProjectCard.tsx` is **not memoized** (confirmed via grep — only `MessageBubble.tsx`/`ComponentRenderer.tsx` use `React.memo`), so every property card in view re-renders on every token tick, wrapped in framer-motion, wasting layout/paint on every keystroke-speed update. Visible as jank on lower-end phones during long responses.
**Fix:** wrap `ProjectCard` in `React.memo`; separate streaming-text state from the `properties` array being diffed.

### 🟡 MEDIUM: Empty search results render nothing
`PropertyCardsDisplay.tsx:40` — `if (!properties.length) return null`. When the backend explicitly sends `exactResults: []` (with a comment saying this is "meaningful, triggers empty state UI" — `chat.ts:954-955`), the component renders **literally nothing.** The "no results" messaging is entirely dependent on the LLM remembering to say something helpful in its text response — no deterministic UI fallback.
**Fix:** add a real empty state (icon + "no exact matches, here's what's close" + retry/broaden-search CTA) instead of `return null`.

### 🟡 MEDIUM: No conflict detection on concurrent admin edits
`ProjectForm.tsx` — zero `updated_at`/version/`If-Match` check. Two admins editing the same project simultaneously silently overwrite each other, last-write-wins.
**Fix:** one-column `WHERE id = ? AND updated_at = ?` check, 409 on mismatch — cheap, not a locking framework.

### 🟢 LOW: Dead performance scaffolding gives false confidence
`frontend/lib/streamingOptimization.ts` (`IncrementalRenderer`, `StreamDebouncer`, `VirtualScroller`, `SSEOptimizer`) — 285 lines, **zero usages anywhere.** Misleading to a reviewer who assumes streaming is throttled/virtualized because the file exists. Same pattern as the dead `projectDataGateway.cache.ts` in Section 3.
**Fix:** delete, or actually wire in.

### ✅ Confirmed strong
- AI provider fallback chain (Gemini→OpenAI→Groq) correctly distinguishes pre-first-token failure (safe silent retry) from mid-stream stall (refuses to double-respond, persists partial message) — above-average error handling.
- SSE stream stall guard (20s race timeout) prevents infinite hang.
- Large result sets are server-capped (`MAX_RESULTS`/`RESULTS_PER_PAGE`) before reaching the client — 500+ project sectors don't freeze the browser.
- Malformed/oversized/emoji-only chat input is handled gracefully (truncated at 2000 chars, no crash) — though empty messages silently skip intent extraction and waste an AI call cycle (`chat.ts` `BodySchema` has no `.min(1)` on text field — cheap fix).

---

## 6. CODE QUALITY & TECHNICAL DEBT

### 🟠 HIGH: Repo-root scratch scripts with direct unguarded DB access
`check-existing.js`, `check-existing-proper.js`, `check-sector12.js`, `check-sector75-db.js`, `precise-sector75-check.js`, `precise-sector76-check.js`, `final-sector75-check.js`, `test-google-apis.mjs`, `test-keys.mjs` at repo root — not referenced by any `package.json` script, several connect directly to `PrismaClient()` with **no `NODE_ENV` guard, no dry-run flag.** Whatever `DATABASE_URL` is active in the shell gets hit. Currently read-only in the ones inspected, but the copy-paste pattern means a future variant could add a `.update()`/`.delete()` unnoticed.
**Fix:** move to a `.gitignore`'d `scripts/adhoc/` or delete outright (git history preserves them).

### 🟠 HIGH: `docs/` vs `docssss/` — 9 of 10 shared files have silently drifted content
Byte-diffed every shared filename: `PRODUCTION_READINESS_AUDIT.md`, `ADMIN_DATA_FIX_PLAN.md`, `IMPLEMENTATION_SUMMARY.md`, and 6 others all differ between the two folders, with `docssss/` consistently the larger/later-edited copy. **`docs/` — the directory a founder or new engineer would open first — is stale.** `docssss/` also has documents with no `docs/` counterpart at all (`SECURITY_AUDIT.md`, `DEPLOYMENT_RUNBOOK.md`, `LAUNCH_CHECKLIST.md`).
**Fix:** ~30-minute cleanup — diff, keep the newer/complete version (likely `docssss/`), merge unique `docs/` content in, delete the loser, rename the survivor to `docs/`.

### 🟠 HIGH: Zero test coverage on admin mutation routes
`backend/src/routes/admin.ts` has 16 mutating endpoints (projects, builders, leads, news, milestones, channel-partners, updates) gated only by `requireAdmin` — **no `admin.test.ts` exists.** Only the middleware itself is unit-tested (`adminAuth.test.ts`), not that these specific routes reject malformed input or actually enforce the gate.
**Fix:** minimum viable — one test per route asserting 401 without session, 200/correct-shape with session, and rejection of malformed body.

### 🟡 MEDIUM: Two independent chat-message classifiers running per request
`chat.ts:458` calls `classifyQuery()` (7-category taxonomy) AND `chat.ts:535` calls `classifyIntent()` (4-category taxonomy) — both on the same message, same request, with a code comment in `intentClassifier.ts` calling itself "legacy." Wasted latency against the <3s AI-response target; a future bug fix risks being applied to only one of the two systems.
**Fix:** confirm with whoever owns this which is authoritative (ask, don't assume — per CLAUDE.md), migrate/delete accordingly.

### 🟡 MEDIUM: Two independent scoring systems with no consistency check
`discovery/rankingProfiles.ts` (search-time ranking weights) and `recommendation/score.ts` (detail-page DNA score) are separately hand-tuned with different weight formulas for "what makes a project good." A user asking "best value" gets one ranking; the same project's detail page shows a different Value score from a different formula. No test asserts they agree.
**Fix:** either unify, or explicitly document the intentional split so nobody "fixes" one without the other.

### 🟡 MEDIUM: `as any` used 184 times against a stated "no `any`" standard
82 backend + 102 frontend occurrences, concentrated in `admin.ts` (17), `discovery/projects.ts` (11), `chat.ts` (11), `DiscoveryContent.tsx` (10), and especially the property-detail tabs (`ResidencesTab.tsx` 13, `OverviewTab.tsx` 11, `ProjectDetailPanel.tsx` 15) — `PricingTab.tsx`/`ResidencesTab.tsx` even have `/* eslint-disable no-explicit-any */` at the file top, an explicit opt-out.
**Fix:** not a pre-launch blocker on its own, but exactly the boundary where a malformed AI/Prisma-JSON shape becomes a runtime crash instead of a compile error. Prioritize typing `admin.ts` and the AI-facing routes first.

### 🟢 LOW: 15+ one-off seed scripts, no naming discipline
`frontend/scripts/seed-3c-lotus-300.ts` through `seed-irish-platinum.ts` etc. — one-shot per-project patches, dead per the code graph, no way to tell which is safe to re-run.
**Fix:** consolidate into one idempotent `scripts/seed/` runner keyed by slug.

### ✅ Confirmed healthy
Core chat/lead flow test coverage is genuinely good (leads.ts, calculators on both sides, chat integration tests, intent-extraction tests). No stub/`not implemented` route handlers found. DB-boot health check (`SELECT 1`, fail-fast) is correctly implemented.

---

## 7. COMPONENT-BY-COMPONENT RATINGS

| Component | Category | Rating /10 | Top Issue | Fix Priority |
|---|---|---|---|---|
| **BuilderTab.tsx** | Product alignment | **1** | Fabricates entire builder history — fake channel partners, phone numbers, RERA IDs, awards, "18,000+ Happy Families" | 🔴 P0 |
| **IntelligenceTab.tsx** | Product alignment | **1** | Fake "Clear" risk checks indistinguishable from real verification | 🔴 P0 |
| **IntelligenceManager.tsx** | Finished vs scaffold | 1 | Dead code hitting a nonexistent endpoint pattern, superseded by `IntelligenceWorkspace.tsx` | 🟢 delete |
| **OverviewTab.tsx** | Product alignment | 2 | Second, contradicting set of fake channel partners | 🔴 P0 |
| **LocationTab.tsx** | Product alignment | 2 | Fake connectivity list + entirely fake commute calculator | 🔴 P0 |
| **ConstructionTimeline.tsx** | Product alignment | 2 | Fake milestone dates + invented "9.4/10" audit score | 🔴 P0 |
| **PricingTab.tsx** | Product alignment | 3 | Fixed fake pricing-trend badges | 🟠 P1 |
| **CompletenessBar.tsx** | Product alignment | 3 | Fabricated 85% default score, misleads admins | 🟠 P1 |
| **ResidencesTab.tsx** | Product alignment | 4 | Fake "Type C/D" variants with computed fake prices | 🟠 P1 |
| **DiscoveryContent.tsx** | Code quality | 4 | 1692 lines, ~150 lines of prod-shipping debug console.log, duplicated auth logic vs sibling page | 🟠 P1 |
| **DiscoveryContent.tsx** | Product alignment | 4 | No signup gate before opening callback/site-visit modals for guests | 🟠 P1 |
| **MessageBubble.tsx + chat group** | Code quality | 4 | 1123-line god component, 3 competing chip-render implementations (2 dead) | 🟡 P2 |
| **OverviewTab.tsx** | Code quality | 4 | `any` casts throughout | 🟡 P2 |
| **PricingTab/ResidencesTab** | Code quality | 4 | `eslint-disable no-explicit-any` at file top | 🟡 P2 |
| **admin/projects/[id]/page.tsx** | Code quality | 6 | Fragile triple-cast Next.js params-unwrapping hack | 🟡 P2 |
| **IntelligenceWorkspace.tsx** | Code quality | 6 | 1293 lines, heavy `any`, but functionally coherent (autosave, real completion scoring) | 🟡 P2 |
| **ProjectDetailPanel.tsx** | Code quality | 6 | Correctly distinguishes builder/project entities; renders the broken children above | 🟡 P2 |
| **ComponentRenderer.tsx** | Code quality | 7 | Clean defensive dispatch; numeric fields default to 0 instead of "N/A" | 🟢 P3 |
| **Sidebar.tsx** | Code quality | 7 | Clean; honestly hides unbuilt nav items with a comment | ✅ |
| **BuilderRegistrationForm.tsx** | Code quality | 7 | Real CIN/phone/email validation; logo stored as base64 instead of Supabase Storage | 🟢 P3 |
| **admin/page.tsx (dashboard)** | Code quality | 7 | Real charts, real data-quality alerts | ✅ |
| **CallbackModal.tsx** | Code quality + alignment | 8 | Real API, real consent gate, real analytics tracking | ✅ |
| **SiteVisitScheduler.tsx** | Code quality | 8 | Clean wizard, real backend calls | ✅ |
| **LeadSuccessModal.tsx** | Code quality | 8 | Simple, correct, well-scoped | ✅ |
| **CommuteCalculator.tsx** (real, lead-flow version) | Product alignment | 8 | Real API, real loading/error states — **note: distinct from LocationTab's fake one** | ✅ |
| **admin/projects/page.tsx** | Code quality | 8 | Real search/filter, keyboard nav, real health score | ✅ |
| **app/page.tsx (landing)** | Code + alignment | 8 | Clean, honest, on-brand trust copy | ✅ |
| **app/auth/page.tsx** | Code + alignment | 8 | Real Supabase calls, specific error mapping, guest-migration fallback | ✅ |
| **PartnersTab.tsx** | Product alignment | **8** | **The one tab that does it right** — honest empty state instead of fabricating | ✅ template for all others |
| **StatCard.tsx** | Code quality | 8 | Small, clean, correctly typed | ✅ |

---

## 8. LAUNCH BLOCKER PRIORITY LIST

### Must fix before ANY real user sees this (🔴 P0 — days, not weeks)
1. Remove all 17 fake-data fallbacks in Section 1 (BuilderTab, OverviewTab, LocationTab, IntelligenceTab, ConstructionTimeline, ProjectDetailPanel, CompletenessBar) — replace with `PartnersTab.tsx`'s honest empty-state pattern
2. Add the 4 missing admin Intelligence PATCH routes (or the Intelligence Workspace is decorative)
3. Remove the 6 deleted RecommendationProfile fields from frontend types/UI
4. Rate-limit `/admin/auth` login
5. Add idempotency to `/leads/callback` and `/leads/site-visit`
6. Apply daily AI-cost cap to guest tokens, not just logged-in users
7. Wrap the 3 backend + 1 frontend unguarded `JSON.parse` calls on AI/stream output
8. Hard-fail server boot if AI provider keys / ADMIN_PASSWORD / Supabase service key are missing in production
9. Delete `schema.simplified.prisma`, `schema.prisma.backup`, and `queryOptimizer.ts` — dead, diverged, and landmine-ready
10. Fix `queryPlanner.ts extractProjectIds` — the 100-row cap causes real "project not found" false negatives at V1's realistic catalog size, not just a future problem
11. **Confirm connection pooling** — check the actual `DATABASE_URL` value has `pgbouncer=true&connection_limit=1` if backend is serverless. This is a 5-minute fact-check with launch-blocking consequences if wrong.

### Fix in week one (🟠 P1)
- Memoize `ProjectCard`, decouple streaming text from card re-renders
- Real empty state for zero search results (not `return null`)
- Optimistic-concurrency check on `ProjectForm.tsx`
- Move root-level scratch scripts out of repo root
- Reconcile `docs/` vs `docssss/`
- Write tests for the 16 untested admin mutation routes
- Decide guest-token vs signup gate policy for callback/site-visit, enforce it

### Backlog (🟡🟢 P2/P3)
- Reconcile the two chat classifiers, the two scoring systems
- Type-clean `admin.ts` and AI-facing routes (184 `as any` occurrences)
- Delete dead code: `IntelligenceManager.tsx`, `useIntelligence.ts`/`intelligence.ts`, `ChipPicker.tsx`/`ChipsSection.tsx`, `projectDataGateway.cache.ts`, `streamingOptimization.ts`
- Consolidate 15+ one-off seed scripts

---

## FINAL VERDICT

**The engineering fundamentals are sound.** Lead capture, auth, AI fallback chains, rate limiting infrastructure, and the core chat flow are built by someone who understands production systems. This is not a codebase in crisis.

**The product's core promise is currently broken by its own UI.** Every fake data point in Section 1 is a live landmine — not a bug that crashes the app, but one that erodes the exact trust the product is built to sell. A user who happens to click into an incomplete project sees fabricated builder credentials with a verification checkmark. That's worse than a bug; a real buyer could act on it.

**Ship readiness: NOT YET.** Fix the P0 list — it's days of conditional-rendering and routing work, not a rewrite — then re-run this audit's DB section, then launch.
