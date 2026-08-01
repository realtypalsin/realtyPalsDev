# RealtyPals — Production Readiness Audit & Fix Plan

**Generated:** 2026-07-19
**Author:** Senior engineering audit (fresh code verification against current `main`)
**Method:** 5 parallel deep-dives (security, chat/AI, backend/DB, frontend/perf/deploy, prior-doc digest) + direct config inspection. Every finding below is tagged:

- `✅ VERIFIED` — confirmed against current source this audit (file:line quoted).
- `⚠️ FROM PRIOR DOCS` — claimed by `NewPlan.md`/`Audit/NewAudit*.md`, **not re-confirmed this pass**. Verify before fixing (marked "VERIFY FIRST").
- `🟢 ALREADY DONE` — prior audits flagged it; it is now fixed in code.

---

## 0. How to use this document (read first — written for the implementer)

This doc is a work order. Each task is self-contained: it names the **file**, the **exact line region**, the **problem**, the **exact change**, and a **DONE test** you can run to prove it works. Do them **top to bottom within each priority band**. Do not skip the DONE test.

**Ground rules (from `CLAUDE.md`, non-negotiable):**
1. **One task = one commit.** Format: `fix(scope): short description`. Never `git add -A`; stage only the files the task names.
2. **No migrations, no deploys, no external API calls without the owner saying "yes" in the same message.** Tasks that need a migration or an env change are marked `⛔ OWNER GATE`.
3. **Don't touch unrelated code.** If you notice something else broken, add a line to the "Discovered during work" section at the bottom — do not fix it inline.
4. **After each task:** run the DONE test. If it fails, keep the task open. Never mark done on a failing test.
5. **Verify-first tasks** (`⚠️ FROM PRIOR DOCS`): the first step is to open the file at the given line and confirm the problem still exists. If it's already fixed, mark the task `🟢 already resolved` and move on — do not "fix" working code.

**Architecture reality (this matters — earlier audit docs got it wrong):**
> The API is an **Express backend at `backend/src/`** (deployed to Render). The **Next.js frontend at `frontend/`** has **NO `app/api` route handlers** — it proxies `/api/*` to the Express backend via rewrites (`frontend/next.config.js`, `frontend/vercel.json`). The Prisma schema is the shared source of truth at `frontend/prisma/schema.prisma`; the backend migrates against it.
>
> **Any task in `Audit/NewAudit2.md`, `NewAudit4.md`, `NewAudit6.md` that references `frontend/app/api/v1/chat/route.ts` or `UiRealtyPals\...` paths is pointing at files that do not exist. Ignore those paths. This document already corrects them.**

---

## 1. VERDICT

**Not ready for FULL public production — but close. ~1–2 focused days of P0 work stands between you and a safe launch.**

The foundation is genuinely solid and much better than the older audit docs suggest — most of the scary items (auth backdoor, `x-user-id` spoof, SQL injection, secrets in git, missing indexes, no connection pooling) are **already fixed**. What remains is a small set of **real launch blockers**, concentrated in two areas:

1. **The lead pipeline can silently break AND be abused** — leads are your revenue event, and today they can be (a) dropped without error due to an env-var name mismatch, and (b) flooded by an unauthenticated attacker. This is the single most important cluster to fix.
2. **A deploy-config/env footgun** — the backend `.env.example` omits variables the server hard-requires to boot, so a clean deploy following the docs can produce a backend that won't start or that silently misbehaves.

Everything else is P1/P2 hardening and polish. There is also a **data-integrity trust risk** (fabricated numbers rendered as if real) claimed by `NewPlan.md` that you must verify — because per your own product rules ("never invent data, trust first"), shipping fabricated figures is a launch blocker if it's still present.

**Readiness by dimension:**

| Dimension | Score | State |
|---|---|---|
| Auth / identity / IDOR | 9/10 | ✅ Strong. Backdoors removed, ownership scoped, timing-safe admin. |
| Secrets / env hygiene | 7/10 | ✅ No leaks. ⚠️ `.env.example` incomplete → deploy footgun. |
| Security headers / CSP | 8/10 | ✅ Full set + helmet + HSTS. Minor CSP `unsafe-inline`. |
| Rate limiting | 7/10 | ✅ Fails closed. ❌ Leads webhook excluded + fail-open. |
| Lead pipeline (revenue) | 4/10 | ❌ Env mismatch drops leads; webhook abusable. |
| Chat / AI correctness | 8/10 | ✅ History, orphans, caching, hallucination guards all fixed. |
| AI cost observability | 3/10 | ❌ Zero token/cost telemetry on the biggest cost center. |
| DB schema / indexes / pooling | 9/10 | ✅ Indexed, pooled (`directUrl`), migrations on deploy. |
| Backend query bounds | 8/10 | ✅ VERIFIED — builders/admin lists paginated; only a 50k `propertyEvent` analytics scan remains. |
| Response compression | 4/10 | ❌ Express serves all JSON uncompressed. |
| Frontend perf / bundle | 7/10 | ✅ Heavy libs lazy-loaded. Minor: `react-scan` in prod deps. |
| Observability (errors/analytics) | 8/10 | ✅ Sentry + PostHog + pino + health. One double-init bug. |
| Data integrity / "no fabrication" | 8/10 | ✅ VERIFIED — fabricated widgets/routes deleted; only 1 stale fallback + 1 label overstatement remain (LOW). |
| Deploy config correctness | 6/10 | ✅ Migrate + node pinned. ⚠️ Doc/env-name drift. |

---

## 2. What's already good — DO NOT TOUCH

These were flagged by older audits and are now confirmed fixed. Leave them alone.

- **`x-user-id` spoof — FIXED.** `frontend/middleware.ts:9` deletes the header; identity comes only from the verified Supabase cookie; backend `verifyUser` (`backend/src/lib/auth.ts:34-64`) validates the bearer token against Supabase `/auth/v1/user`. Cannot forge identity.
- **Auth backdoor — REMOVED.** `backend/src/lib/auth.ts:15` "Insecure backdoors have been permanently removed." No `ALLOW_INSECURE`, no dev bypass. Fails closed.
- **No SQL injection.** Only `$queryRaw` uses are `SELECT 1` health probes. No `$queryRawUnsafe` anywhere.
- **No secrets in git.** Only `.env.example` files tracked. No `NEXT_PUBLIC_` secret misuse.
- **IDOR-safe.** Saved properties, price alerts, sessions all scope Prisma `where` by verified `user_id`.
- **DB indexes + pooling.** 54 `@@index`/`@@unique` incl. `add_performance_indexes` migration; `directUrl` set for pooled+direct connections; `prisma migrate deploy` runs on backend start.
- **Chat correctness.** History loads 50 most-recent then reverses (`chat.ts:356,375`); user+assistant persisted together (no orphans); property search cached in Redis 10min; provider fallback OpenAI→Groq.
- **Hallucination guards.** Multi-layer: input sanitize + injection patterns, DB-only prompt with `sanitizeForPrompt`, live RAG-leak stream filter, output guardrail blocking fabricated RERA/prices/names (blocking mode is LIVE).
- **Optimistic UI.** Save/unsave is optimistic with rollback + toast (`ProjectCard.tsx:90-121`).
- **Image fallback.** Per-URL failure tracking exists (`usePreferredImages.ts:75`), `/placeholder.png` fallback, stale `hero_image_url` handled.
- **Observability.** Sentry (client+server+edge), PostHog with the CLAUDE.md analytics events firing, pino structured logging, `/api/v1/health` probing DB+Redis (503 on DB fail).
- **External-call resilience.** Tavily 5s, Wikipedia 4s, Maps 5s, Jina 12s timeouts, all behind an SSRF guard; Redis fails closed to in-memory; lead webhook has 1 retry + 5s timeout.

---

## 3. P0 — LAUNCH BLOCKERS (fix before full production)

### P0-1 — Leads webhook fails open (unauthenticated + unthrottled) `✅ VERIFIED` — SECURITY/ABUSE (HIGH)

**Files:** `backend/src/routes/leads.ts:175-184`, `backend/src/lib/env.ts:6`, `backend/src/index.ts:84`

**Problem:** The webhook secret check returns `true` when no secret is configured, and `WEBHOOK_SECRET` defaults to `''`:
```ts
// leads.ts:175-184
function verifySecret(req: Request): boolean {
  if (!env.WEBHOOK_SECRET) return true          // ← open endpoint when unset
  const header = req.headers['x-webhook-secret']
  return header === env.WEBHOOK_SECRET            // ← also not timing-safe
}
// env.ts:6
WEBHOOK_SECRET: z.string().optional().default(''),   // ← defaults empty
```
`POST /api/v1/leads/webhook` is **also excluded from the global rate limiter** (`index.ts:84`). If `WEBHOOK_SECRET` is unset in prod (it's `sync:false` in `render.yaml` — easy to forget), anyone can flood `notifyLead` → unbounded WhatsApp/email spam to your sales team + fake-lead injection + cost abuse.

**Exploit:** `curl -X POST https://<backend>/api/v1/leads/webhook -H 'content-type: application/json' -d '{"type":"callback","name":"x","phone":"9999999999","timestamp":"..."}'` on repeat — no auth, no throttle.

**Fix (3 parts):**
1. `env.ts` — make the secret required in production. Replace the default with a refinement:
```ts
WEBHOOK_SECRET: z.string().optional().default(''),
// after env parse, add:
if (process.env.NODE_ENV === 'production' && !env.WEBHOOK_SECRET) {
  throw new Error('WEBHOOK_SECRET is required in production')
}
```
2. `leads.ts:175-184` — fail closed and use timing-safe compare:
```ts
import { timingSafeEqual } from 'crypto'
function verifySecret(req: Request): boolean {
  const secret = env.WEBHOOK_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production' // closed in prod
  const header = String(req.headers['x-webhook-secret'] ?? '')
  const a = Buffer.from(header); const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}
```
3. `index.ts:84` — remove the webhook from the rate-limit exclusion, OR add a dedicated per-IP limit on the route (e.g. `checkRateLimit(ip, 'lead-webhook', 30, 60)`).

**DONE test:** With `NODE_ENV=production` and `WEBHOOK_SECRET` set: `curl` without the header → `401`/`403`. With the correct header → `200`. Backend refuses to boot in prod if the secret is unset.

---

### P0-2 — Leads silently dropped: `WEBHOOK_URL` vs `LEAD_WEBHOOK_URL` mismatch `✅ VERIFIED` — REVENUE (HIGH)

**Files:** `backend/src/routes/leads.ts:139-140`, `render.yaml`, `backend/.env.example`, `DEPLOY.md:124`

**Problem:** `leads.ts:139` reads `process.env.WEBHOOK_URL` and **returns early (drops the lead) if unset** (`:140`). But `render.yaml` defines only `WEBHOOK_SECRET` (no `WEBHOOK_URL`), and `DEPLOY.md:124` documents a *different* name, `LEAD_WEBHOOK_URL` (a frontend var). Net: in prod `WEBHOOK_URL` is undefined → **every callback / site-visit lead is dropped with no error, no log surfaced to ops.** Your sales pipeline receives nothing.

**Fix:**
1. Pick ONE canonical name. Recommend `WEBHOOK_URL` (matches the code). 
2. Add it to `render.yaml` envVars (`sync: false`) and to `backend/.env.example`.
3. Update `DEPLOY.md` to use the same name and set it to the deployed backend's own `/api/v1/leads/webhook` (or the external CRM endpoint, whichever `notifyLead` targets — confirm the intended target).
4. `leads.ts:140` — when unset, `console.error` (structured) instead of silently returning, so a misconfig is visible.

**DONE test:** Submit a callback request end-to-end on a deploy preview → the webhook target receives the payload; if `WEBHOOK_URL` is unset, an error is logged (not silent).

---

### P0-3 — `backend/.env.example` omits variables the server hard-requires `✅ VERIFIED` — DEPLOY FOOTGUN (HIGH)

**Files:** `backend/.env.example`, cross-ref `backend/src/index.ts:44-53`, `backend/src/lib/config.ts:5-16`, `backend/src/lib/env.ts`

**Problem:** `index.ts:44-53` **exits the process** if `ADMIN_PASSWORD` or `DATABASE_URL` is missing, and requires one of `OPENAI_API_KEY`/`GROQ_API_KEY`. **None of these are in `backend/.env.example`.** Also used-but-undocumented: `DIRECT_URL`, `SENTRY_DSN`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_MAPS_API_KEY`, `TAVILY_API_KEY`, `JINA_API_KEY`, and knobs `AI_MAIN_MODEL`, `AI_FALLBACK_MODEL`, `GROQ_FAST_MODEL`, `GROQ_SMART_MODEL`, `EMI_RATE`, `LOG_LEVEL`. Anyone onboarding from the example builds a backend that refuses to start.

**Fix:** Rewrite `backend/.env.example` to list **every** variable read anywhere in `backend/src` (grep `process.env\.` + `env\.` across `backend/src`), grouped: Required-to-boot / AI providers / Data & cache / Observability / Integrations (WhatsApp, email, maps) / Tunables. Mark each Required or Optional with a one-line comment. Do the same sanity pass on the root and `frontend/.env.example`.

**DONE test:** `grep -rhoE 'env\.[A-Z_]+|process\.env\.[A-Z_]+' backend/src | sort -u` — every name appears in `backend/.env.example`.

---

### P0-4 — No gzip/brotli compression on the Express backend `✅ VERIFIED` — PERF (HIGH; user-requested tip #01)

**Files:** `backend/src/index.ts:60-79`, `backend/package.json`

**Problem:** The backend registers `helmet`, `cors`, `express.json`, `cookieParser`, `morgan` but **no `compression` middleware**, and `compression` is not a dependency. Render does **not** auto-compress (unlike Vercel). Every JSON body from `/api/v1/projects`, `/saved`, `/builders`, `/market-comparison`, etc. ships uncompressed — these are your largest payloads (nested unit/pricing data). Directly hits your `<1s` API and `<2s` page targets, worst on mobile/NRI users.

**Fix:**
```bash
cd backend && npm i compression && npm i -D @types/compression
```
In `index.ts`, before route registration:
```ts
import compression from 'compression'
app.use(compression({
  filter: (req, res) => {
    if (res.getHeader('Content-Type')?.toString().includes('text/event-stream')) return false
    return compression.filter(req, res)  // never compress the SSE chat stream
  },
}))
```
(SSE must not be buffered/compressed or streaming breaks.)

**DONE test:** `curl -s -H 'Accept-Encoding: gzip,br' -D - https://<backend>/api/v1/projects -o /dev/null` shows `Content-Encoding: gzip` (or `br`) and a much smaller `Content-Length` vs uncompressed; the chat SSE endpoint still streams token-by-token.

---

### P0-5 — Admin session token handed to JS (not an httpOnly cookie) `✅ VERIFIED` — SECURITY (MEDIUM→treat as P0 for admin)

**Files:** `backend/src/routes/admin.ts:71-72`, `backend/src/lib/adminAuth.ts:66-77`

**Problem:** Admin login returns the session token in the JSON body (`admin.ts:72: res.json({ ok: true, token })`), so the admin panel stores a **7-day admin session where JS can read it** (localStorage). Any XSS on the admin origin → full admin takeover for a week. Line 71 even computes `const isProduction = ...` then never uses it — a leftover from an intended (never-wired) `res.cookie(...)`.

**Fix:** Issue the session as an httpOnly cookie and have `requireAdmin` read it (cookie-parser is already mounted):
```ts
// admin.ts login success:
res.cookie('admin_session', token, {
  httpOnly: true, secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict', maxAge: 7 * 24 * 3600 * 1000, path: '/',
})
res.json({ ok: true })
// adminAuth.ts requireAdmin: read req.cookies.admin_session (fallback to Bearer during migration)
```
Because it becomes a cookie, add double-submit CSRF protection on admin mutations. Also fix logout to actually clear the cookie + invalidate the server session (see P1-9, the current logout no-ops).

**DONE test:** After login, the token is set as an httpOnly cookie (not in the JSON body / not in localStorage); admin API calls succeed via the cookie; `document.cookie` in the admin panel does NOT expose `admin_session`; logout clears it and a subsequent admin call returns 401.

---

### P0-6 — Data fabrication rendered as real `✅ VERIFIED — LARGELY RESOLVED` (downgraded from blocker to P2)

**Source:** `NewPlan.md` Phase A (NP-5/15/18/21/25). **Re-verified 2026-07-19 — mostly already fixed.**

**Verification result:** The fabricated widgets and broken pages NewPlan flagged have been **deleted or made DB-driven** since that doc was written:
- `PriceTimeline.tsx`, `SectorHeatmap.tsx`, `AIScoreBadge`, `generateRadarScores` → **files no longer exist.**
- `value-estimator`, `sector/[id]`, `experiment`, `market-intelligence`, `lead-snapshot` pages → **deleted** (no files found).
- `MarketComparison.tsx` → **NOT fabricating.** Its bell curve smooths REAL API data (`data.min_price_sqft`/`avg`/`max`), returns empty when data absent, shows "No market data available." Only the label "Real-time localized market positioning" (`:140`) overstates — cosmetic.
- Remaining `G+26` / `Sector 150` string matches are admin-form **placeholders** (`ProjectForm.tsx:419`), SEO keywords, real map coordinates, and tests — not rendered as data.

**Residual (LOW, moved to P2):**
- `ShareCard.tsx:18` — `property.sector?.name ?? 'Sector 150'` invents a sector name when absent. Fix: render "Noida" or hide, never a fake sector. → **P2-20**
- `MarketComparison.tsx:140` — soften/remove the "Real-time" label since the curve is a synthetic distribution shape (real min/avg/max, synthetic spread). → **P2-21**

**DONE test:** `cd frontend && grep -rniE "sector 150|G\+26|SECTOR_150|generateRadarScores" app components lib | grep -v test` returns only placeholders/coords/dynamic code (currently true). No widget renders an invented figure.

---

### P0-7 — Committed merge-conflict markers in `frontend/.gitignore` `✅ VERIFIED` — CORRECTNESS (LOW effort, do now)

**File:** `frontend/.gitignore`

**Problem:** The file contains unresolved conflict markers:
```
.env
<<<<<<< HEAD
.tokensave/*.db*
=======
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
```
`.env` (first line) still ignores correctly so no secret leak today, but the file is broken and any tool that parses it strictly will choke.
**Fix:** Resolve the conflict — keep `.env` and `.tokensave/*.db*`, delete the three marker lines.

**DONE test:** `git grep -nE "^(<<<<<<<|=======|>>>>>>>)" -- '.gitignore' 'frontend/.gitignore'` returns nothing.

---

## 4. P1 — Fix before scale / within the first week

### P1-1 — No AI token/cost telemetry `✅ VERIFIED` — OPS (HIGH)
**Files:** `backend/src/lib/ai/openai.ts:276-287`, `groq.ts:91-102`
Streaming calls omit `stream_options: { include_usage: true }`; `usage` is never captured. You have **zero visibility on spend** on your single largest cost center. Add `stream_options: { include_usage: true }`, read the final usage chunk, and log `{ model, prompt_tokens, completion_tokens, sessionId }` via pino (and optionally a running per-day counter in Redis). **DONE:** every chat turn logs token counts; you can sum daily spend from logs.

### P1-2 — No absolute per-turn wall-clock cap `✅ VERIFIED` — RELIABILITY (MEDIUM)
**File:** `openai.ts:254-261` (and `groq.ts`)
Only a per-chunk-reset 60s inactivity timer exists (comment wrongly says "30 seconds", `openai.ts:68-70`). A slow-dribbling model across 3 tool cycles has unbounded total duration. Add a turn deadline (`const deadline = Date.now() + 120_000`) checked each cycle in `runCompletion`; abort the whole turn past it and stream the existing truncation notice. Fix the stale comment. **DONE:** a turn cannot exceed ~120s wall-clock.

### P1-3 — Live RAG-leak filter is post-hoc `✅ VERIFIED` — SECURITY (MEDIUM)
**Files:** `openai.ts:321-336`, `groq.ts:129-143`
The leak regex trips on accumulated text and `break`s **after** offending tokens were already streamed char-by-char to the client. Buffer a small trailing window (e.g. hold back the last N chars until the next chunk confirms no policy-marker prefix) before flushing to the client, so a leak is caught before it's visible. **DONE:** an intentional policy-marker leak in a test prompt is never visible in the streamed output.

### P1-4 — Weak price/name hallucination heuristics `✅ VERIFIED` — TRUST (MEDIUM)
**File:** `backend/src/lib/ai/guardrails.ts:170-184`
Price check only flags `priceNum.length <= 5` and does a naive `systemPrompt.includes(priceNum)` substring test → false negatives/positives. Tighten: parse numeric prices from the response, compare against the actual project price fields present in the prompt context (structured, not substring), and block/replace on mismatch. **DONE:** an injected fake price ("₹45 lakh" for a project priced ₹1.5cr) is blocked; real prices pass.

### P1-5 — Memory fields not run through `sanitizeForPrompt` `✅ VERIFIED` — DEFENSE-IN-DEPTH (LOW-MEDIUM)
**Files:** `backend/src/lib/ai/context.ts:52-59`, `blocks.ts:369-388`
`sector_preference`/`purpose` are injected verbatim. Write-time whitelist (`memory.ts:48`, `/^Sector \d{1,3}$/`) already blocks the obvious vector, but pass memory strings through the existing `sanitizeForPrompt` helper for defense-in-depth. **DONE:** memory injection points call `sanitizeForPrompt`.

### P1-6 — 50k-row analytics scan `✅ VERIFIED OPEN` — PERF (MEDIUM)
**File:** `backend/src/routes/admin.ts:1455` — `propertyEvent.findMany({ ... take: 50000 })`.
Verification: the rest of the admin surface is already fine — builders list `take:20/50` (`builders.ts`), admin projects/builders `take: limit`, top-sectors/builders use `groupBy` (`admin.ts:1344,1352,1423`), clicks use `.count()` (`:1410`). The one remaining problem is the 50k `propertyEvent.findMany` at `:1455` (+ the `project.findMany` right after at `:1461`). Add a rolling window filter (`where: { created_at: { gte: <30d ago> } }`) and replace the load-then-count with `groupBy`/`count` where possible. **DONE:** the analytics endpoint no longer loads 50k rows into memory.
_(NP-27 builders-unbounded, NP-28 sectors, NP-37 admin pagination: VERIFIED already resolved — do not re-fix.)_

### P1-7 — Image over-fetch `🟢 ALREADY DONE` (no action)
Verified: `backend/src/lib/discovery/projects.ts:52` already caps `images: { take: 3 }` in the shared `PROJECT_INCLUDE`, and admin image include uses `take: 3` (`admin.ts:441`). NewAudit4 A4-13 is stale. **No action** — the propertyEvent scan (now P1-6) is the only real query-bounds item left.

### P1-8 — Backend robustness gaps `✅ VERIFIED` (mostly resolved; 1 minor)
- `index.ts` startup raw-SQL schema mutation (NP-32) → **GONE.** Only `SELECT 1` health probes remain (`:109,:175`). No action.
- `aqi.ts` (NP-30) → **FINE.** Has `AbortSignal.timeout(4000)` (`:42`), degrades to `{aqi:null}`; no Tailwind-class leak found. Optional: log the swallowed error at `:72`. LOW.
- `builderRegistration.ts` webhook (NP-29) → **MINOR OPEN.** Outbound POST (`:203`) is fire-and-forget with an error-log catch (`:176`) but no `AbortSignal.timeout`. Add `AbortSignal.timeout(5000)` so a hung provider can't leak a socket. LOW. **DONE:** webhook POST has a timeout.

### P1-9 — Admin logout no-ops ⚠️ FROM PRIOR DOCS (VERIFY) — SECURITY (MEDIUM)
**Source:** NewPlan NP-36. File `admin.ts:78`. Logout reads a cookie but the token is a Bearer → session stays valid 7 days. Fold into P0-5's cookie migration: logout must delete the cookie AND invalidate the server-side session record. **DONE:** post-logout, the old token/cookie returns 401.

### P1-10 — Unauthenticated builder-applications endpoint `🟢 VERIFIED RESOLVED` (no action)
NewPlan NP-26 claimed `builderApplications.ts` was unauthenticated (PII leak + unauth Builder creation). **Verified false:** all three routes — `GET /` (`:11`), `GET /:id` (`:46`), `PATCH /:id` (`:70`) — are wrapped in `requireAdmin`. The contradiction is resolved in the security agent's favor. **No action.**

### P1-11 — Per-route limits on cost-bearing GETs `✅ VERIFIED` — COST (MEDIUM)
**Files:** `backend/src/routes/commute.ts`, `aqi.ts`. Google Maps + WAQI calls are only globally rate-limited (100/min/IP) → 100 req/min/IP can drain paid quotas. Add a modest per-route `checkRateLimit` (e.g. 15/min). **DONE:** exceeding the per-route limit returns 429 before hitting the paid API.

### P1-12 — Anonymous site-visit leads contradict signup rule `✅ VERIFIED` — PRODUCT/ABUSE (MEDIUM)
**File:** `leads.ts:86`. `POST /leads/site-visit` has no `verifyUser` and fires webhooks from name+phone only. Per `CLAUDE.md`, site-visit requires signup. Add `verifyUser` (or an equivalent gate) + throttle. **DONE:** anonymous site-visit POST is rejected; authenticated one works.

### P1-13 — Double Sentry client init `✅ VERIFIED` — OBSERVABILITY (MEDIUM)
**Files:** `sentry.client.config.ts:3`, `instrumentation-client.ts:4`. Both call `Sentry.init` with the same DSN on the client → "Multiple instances" risk; `instrumentation-client.ts:9-14` adds `replayIntegration()` that `sentry.client.config.ts:9` warns crashes. Under Next 14 `instrumentationHook`, keep `instrumentation-client.ts` and delete/neutralize `sentry.client.config.ts` after confirming which one actually runs. **DONE:** exactly one client Sentry init; test error appears once in Sentry.

### P1-14 — Backend blind spots: verify pino coverage + startup log noise `✅ VERIFIED` (partial)
`middleware.ts:34` logs `[mw] METHOD path auth=...` on every `/api/*` request in prod → noise + minor info exposure. Remove or gate to dev. Also trim verbose admin-login logging (`admin.ts:39,50`). **DONE:** no per-request auth log in prod.

---

## 5. P2 — Polish / tech debt (post-launch, first month)

| ID | Finding | File(s) | Fix | Verified |
|----|---------|---------|-----|----------|
| P2-1 | `react-scan` (dev profiler) in prod `dependencies` | `frontend/package.json:64` | Move to `devDependencies` or remove | ✅ |
| P2-2 | `framer-motion` maybe in initial bundle | import sites | Audit; lazy-load below-the-fold usages | ✅ (needs site check) |
| P2-3 | 203 `any`/`as any` in `frontend/{app,lib,components,types}` | many | Burn down, prioritize `as any` on project/lead objects; add `no-explicit-any: warn` | ✅ |
| P2-4 | AVIF not enabled | `next.config.js` images | Add `formats: ['image/avif','image/webp']` | ✅ |
| P2-5 | CSP `script-src` has `unsafe-inline`/`unsafe-eval` | `next.config.js headers()` | Tighten with nonces later | ✅ |
| P2-6 | `isSafeUrl` incomplete (no DNS resolve, IPv6) | `web.ts:18-37` | Mitigated (Jina proxy, no direct socket). Harden only if any code fetches user/AI URLs directly | ✅ |
| P2-7 | Public analytics ingest trusts client identity | `analytics.ts:99-114` | Accept, or de-dupe/validate; impact = data pollution only | ✅ |
| P2-8 | Re-enable lint rules (any/unused/exhaustive-deps) | `.eslintrc.json:10-12` | Un-mask, fix fallout | ⚠️ NewPlan NP-11 |
| P2-9 | Dead chip code no longer reached | `conversationEngine.ts:361-454` | Delete `getResearchChips/getComparingChips/getDecidingChips` | ✅ |
| P2-10 | ~~Chip repetition (Date.now IDs, 50-cap)~~ | — | 🟢 **RESOLVED** — chip IDs no longer embed timestamps (regression test `chips.test.ts:248` guards it); chips are DB-driven. Only cosmetic: delete dead chip fns (P2-9) | 🟢 VERIFIED |
| P2-11 | ~~Broken/stub buyer routes~~ | — | 🟢 **RESOLVED** — value-estimator, sector/[id], experiment, market-intelligence, lead-snapshot pages all **deleted** (no files) | 🟢 VERIFIED |
| P2-12 | ~~Guest-token key mismatch~~ | `compare/page.tsx:18` | 🟢 **RESOLVED** — unified to `realtypals_guest_token` with old-key migration. (Still confirm the token is a random UUID on generation — LOW) | 🟢 VERIFIED |
| P2-13 | ~~Admin editors 401~~ / peer-wipe of `intelligence_data` | `admin.ts:688` | 🟢 editors 401 **RESOLVED** (`InvestmentInsightsEditor` uses `adminAuthHeaders()`). Peer-wipe: `:688` does field-scoped merge `{...existingData, investment_insights: req.body}` — correct, but the `req.body` half is unvalidated (see P2-15) | 🟢 VERIFIED |
| P2-14 | Detail-panel Pricing/Residences tabs | `ProjectDetailPanel.tsx` | Tabs exist and render (`PricingTab.tsx`, `ResidencesTab.tsx`). Gate-string bug not reproduced this pass — VERIFY by clicking both tabs on a project with pricing data | ⚠️ VERIFY (low) |
| P2-15 | Zod missing on 3 admin PATCH (raw `req.body` spread) | `admin.ts:650,668,688` | ✅ **CONFIRMED OPEN** — payment-plan/cost-sheet/investment-insights PATCH spread raw body. Add Zod schemas (admin-only so MEDIUM) | ✅ VERIFIED OPEN |
| P2-20 | `ShareCard` invents a sector name when absent | `ShareCard.tsx:18` | `?? 'Sector 150'` → render "Noida" or hide, never a fake sector | ✅ VERIFIED OPEN |
| P2-21 | `MarketComparison` "Real-time" label overstates synthetic curve | `MarketComparison.tsx:140` | Curve is synthetic spread over real min/avg/max; soften label to "Sector price distribution" | ✅ VERIFIED OPEN |
| P2-16 | Root clutter + stale UiRealtyPals build artifacts | root, `frontend/` | Move one-off scripts to `scripts/archived/`, gitignore logs, delete stale `build-errors.txt`/`eslint-results.json`/`lint.log` | ⚠️ NewAudit4 A4-21 |
| P2-17 | a11y gaps (aria-labels, skip link, role=checkbox, pinch-zoom) | `DiscoveryContent`, `Sidebar`, `layout.tsx:47` | Add labels; remove `maximumScale:1` | ⚠️ NewPlan NP-44 |
| P2-18 | Sidebar hardcoded "F" avatar not real identity | `Sidebar.tsx:404` | Use real user identity | ⚠️ NewPlan NP-51 |
| P2-19 | DEPLOY.md / render.yaml / env-name drift | `DEPLOY.md`, `render.yaml`, `.env.example` | Sync backend build cmd; standardize `UPSTASH_REDIS_REST_*`; remove stale `maxDuration` refs | ✅ |

---

## 6. The 5 performance tips you pasted — reality check

| # | Tip | Status in RealtyPals | Action |
|---|-----|----------------------|--------|
| 01 | Compress API responses (gzip/brotli) | ❌ **Missing on Express backend** (Vercel/frontend is fine) | **P0-4** — real gap, do it |
| 02 | Batch inserts/updates | 🟢 Already done — `createMany` used (16 sites); seed scripts batch | No action (spot-check enrich scripts for any stray per-row loop) |
| 03 | Circuit breaker for slow deps | 🟡 Partial — timeouts + Redis fail-closed + provider fallback exist; no formal breaker | Optional P1: add breaker for Maps/Supabase (+ their timeouts). Not a blocker |
| 04 | Optimistic UI updates | 🟢 Already done — save/unsave optimistic with rollback | No action |
| 05 | Cache rendered pages/fragments | 🟡 N/A as written — it's a client-rendered SPA; no SSR pages to cache. Caching lives at the **API layer** (Redis `routeCache.ts`) | Add route-level Redis cache to more GET endpoints (P1-6 area) + single-flight to avoid thundering herd (NewPlan NP-41) |

**Bottom line on the tips:** only #01 (compression) is a genuine missing win. #02 and #04 are already done. #03 and #05 are partially covered and belong in P1/P2, not launch blockers.

---

## 6.5 Your 6-point security checklist — verified against live code

Each item below was checked this audit. Verdict + evidence + where any residual gap maps in this doc.

### 1. Authentication & Authorization — ✅ PASS (one gap → P0-1)
- **Admin APIs are protected.** `requireAdmin` guards every admin route and all of `builderApplications.ts` (`:11,:46,:70`). A normal user cannot reach admin APIs — the admin session is a separate server-side token, not the Supabase user identity.
- **User routes require a verified user.** `saved`, `price-alerts`, `sessions`, `chat` call `verifyUser` (validates the Supabase JWT against `/auth/v1/user`) and 401 when absent. No `x-user-id` trust (middleware strips it).
- **Ownership enforced (no IDOR).** Every user-scoped Prisma query filters by the verified `user_id` (`saved.ts`, `priceAlerts.ts:77`, `sessions.ts:40`).
- **Only gap:** the leads **webhook** accepts unauthenticated POSTs when `WEBHOOK_SECRET` is unset (fails open) → **P0-1**.

### 2. Input Validation — ✅ MOSTLY PASS (one gap → P2-15)
- Zod validates bodies across chat, leads, saved, price-alerts, documents, analytics, transcribe, uploads, and most admin routes (`ProjectSchema`, `BuilderSchema`, `UnitCreateSchema`, etc., all `safeParse(req.body)`). Body size capped at 100kb.
- Upload files are validated by **magic bytes** (`lib/uploadValidator.ts`), not just MIME header.
- **Only gap:** 3 admin PATCH routes spread raw `req.body` with no schema (`admin.ts:650,668,688`) → **P2-15**. Admin-only, so MEDIUM.

### 3. Secrets & Environment Variables — ✅ PASS (hygiene gap → P0-3)
- **No secrets in git.** Only `.env.example` files are tracked; `.env`/`.env.local` are gitignored; no hardcoded keys/tokens/connection strings in tracked source.
- **No client leakage.** `SUPABASE_SERVICE_ROLE_KEY` is server-only; no server secret carries a `NEXT_PUBLIC_` prefix.
- **Only gap (not a leak, a footgun):** `backend/.env.example` omits vars the server hard-requires → **P0-3**. Fix so a clean deploy documents every secret.

### 4. SQL / NoSQL Injection — ✅ PASS
- All DB access goes through Prisma's parameterized query builder. The only raw SQL is `$queryRaw\`SELECT 1\`` health probes (`index.ts:109,175`). **No `$queryRawUnsafe`/`$executeRawUnsafe` anywhere.** User input is never string-concatenated into a query. No injection surface.

### 5. CORS & Security Headers — ✅ PASS (minor → P2-5)
- **CORS is single-origin**, not wildcard: `cors({ origin: FRONTEND_URL, credentials: true })` (`index.ts:69-72`). Fails safe (localhost) if `FRONTEND_URL` unset.
- **Full header set** via `next.config.js headers()` + backend `helmet()`: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `HSTS` (2yr+preload), `CSP` with `frame-ancestors 'none'`. Source maps hidden in prod.
- **Minor:** CSP `script-src` allows `'unsafe-inline'/'unsafe-eval'` (common with Next; tighten with nonces later) → **P2-5**.

### 6. Rate Limiting & Abuse Protection — ✅ MOSTLY PASS (gaps → P0-1, P1-11)
- **Global 100/min per IP**, and it **fails closed** (in-memory bucket when Redis is down — never waves requests through). IP is unspoofable: `trust proxy: 1` + `req.ip`.
- **Per-route AI-cost limits:** chat 40/min IP + 20/min user, transcribe 15/min, documents/ask 20/min, builder-register 5/hr, admin-login 5/15min (timing-safe compare).
- **Gaps:** leads webhook is **excluded** from the limiter → **P0-1**; `commute.ts`/`aqi.ts` (paid Google/WAQI calls) have no per-route limit → **P1-11**.

**Net on your 6 points: 4 clean passes, 2 with narrow gaps already tracked as P0-1, P1-11, P2-15, and the P0-3 env-hygiene footgun. Nothing new to add — all gaps are already in this plan.**

---

## 6.6 Further optimization opportunities (beyond the blockers)

Verified-real perf/cost wins, ranked by leverage. None are launch blockers.

1. **Compression (P0-4)** — biggest single win, already a blocker. Do it first.
2. **AI prompt weight** — search-turn system prompt is ~5–6.5k tokens and re-sent per tool cycle (up to 3×). Two levers: (a) enable **provider prompt-caching** if the provider supports it (cache the static base prompt); (b) trim conditional blocks harder. Pair with **P1-1 token telemetry** so you can measure before/after. Expect a meaningful input-token cut.
3. **50k analytics scan (P1-6)** — add the 30-day window; removes a memory spike on the admin dashboard.
4. **API GET cache headers** — public GET endpoints (`/projects`, `/builders`) already have Redis route caching; also send `Cache-Control: public, max-age=60, stale-while-revalidate=300` so Vercel's edge/CDN can serve repeats without hitting Render. Cheap latency win for anonymous browsing.
5. **`framer-motion` lazy-load (P2-2)** — confirm its import sites; lazy-load below-the-fold usages to shrink the initial `/discover` bundle.
6. **AVIF (P2-4)** — one-line `images.formats` addition, ~20–30% smaller images.
7. **`react-scan` out of prod deps (P2-1)** — remove the footgun; not in the bundle today but one stray import would bloat prod.

**Already optimized — no work needed:** batch DB writes (`createMany`), connection pooling (`directUrl` + Supabase transaction pooler), DB indexes (54, incl. a perf-index migration), optimistic UI, image over-fetch (`take:3`), heavy-lib lazy-loading (leaflet/recharts/modals), Redis search-result caching (10min), external-call timeouts.

---

## 7. Pre-launch verification gate (must all pass before flipping to full production)

Run in order. **Do not launch until every box is green.**

1. **Builds clean.** `cd backend && npm run check-all` and `cd frontend && npm run check-all` both pass (typecheck + lint + build). No `ignoreBuildErrors` shortcuts.
2. **Tests green.** `cd backend && npm test` (guardrails, sanitize, adminAuth, conversationEngine, intent, calculators) and `cd frontend && npm test` both pass.
3. **Health.** Deploy preview `/api/v1/health` returns `200` with `db: ok` and `redis: ok`.
4. **Lead pipeline works AND is protected** (P0-1, P0-2): a real callback submission reaches the webhook target; an unauthenticated/unthrottled webhook flood is rejected.
5. **Backend boots from `.env.example`** (P0-3): a fresh env built only from `backend/.env.example` starts the server (with real secret values filled in).
6. **Compression on** (P0-4): `Content-Encoding: gzip`/`br` on `/api/v1/projects`; SSE chat still streams.
7. **Admin session is httpOnly** (P0-5): token not in JS-reachable storage; logout invalidates.
8. **No fabricated data** (P0-6): the grep returns only tests/dynamic code; widgets show empty states when data is absent.
9. **Adversarial chat pass:** prompt-injection, fabricated RERA/price/name, poisoned web page, jailbreak variants are all blocked; legitimate queries still answer.
10. **Sentry receives a test exception** from both frontend and backend; token/cost logging (P1-1) appears for a chat turn.
11. **Env vars set** in Render + Vercel dashboards per the corrected lists (⛔ OWNER GATE — you set these, not the AI).

---

## 8. Suggested execution order (fastest safe path to launch)

**Day 1 — revenue + deploy safety (P0-1, P0-2, P0-3, P0-7, P0-4):** the lead-pipeline cluster + env completeness + compression + gitignore. All backend, mostly one file each. Ship each as its own commit.

**Day 2 — admin (P0-5):** admin httpOnly cookie migration (with logout fix P1-9). _(P0-6 fabricated-data is already verified resolved — only the two LOW residuals P2-20/P2-21 remain.)_

**Then P1 in listed order** (token telemetry first — you want cost visibility the moment you have real traffic), **then P2** as normal backlog.

⛔ **OWNER GATES (need your explicit "yes" in-session):** any `prisma migrate`, any deploy, setting Render/Vercel env vars, and P1-8's removal of the boot-time schema mutation (confirm no prod DB depends on it first).

---

## 9. Honest uncertainty / what this audit did NOT fully verify

Per `CLAUDE.md` ("flag uncertainty explicitly"). **Update 2026-07-19:** the `⚠️ FROM PRIOR DOCS` items have now been re-verified against live code (see the 🟢 RESOLVED / ✅ VERIFIED OPEN tags throughout). Summary of what verification changed:

**Confirmed RESOLVED since NewPlan (do NOT re-fix):** builderApplications auth (P1-10), fabricated widgets + broken buyer routes deleted (P0-6), builders/admin pagination (P1-6 partial), image over-fetch (P1-7), startup schema mutation gone (P1-8), chip Date.now IDs (P2-10), guest-token key (P2-12), admin editors 401 (P2-13). NewPlan (2026-07-12) was largely overtaken by fixes landed since.

**Confirmed STILL OPEN (real work):** all P0 items, P1-1→P1-5, P1-6 (50k scan only), P1-8 (webhook timeout only), P1-11→P1-14, P2-15 (3 admin PATCH raw body), P2-20 (ShareCard fallback), P2-21 (MarketComparison label), and the P2 hygiene items (`.eslintrc no-explicit-any: off` confirmed at `:10`, 203 anys, react-scan, AVIF, DEPLOY.md drift).

**Still genuinely unverified (small, low-risk):**
- **P2-14 detail tabs:** tabs exist and render; the specific gate-string bug wasn't reproduced. Click both Pricing/Residences tabs on a project with pricing data to confirm.
- **Data completeness** (~120 records missing unit types/carpet area/price per NewAudit7): not re-counted here. Run `frontend/scripts/audit-completeness.ts` and enforce the `CLAUDE.md` rule "no property visible if critical fields missing" via a query filter, not manual cleanup.
- Exact `framer-motion` import sites (P2-2); whether `googleMaps.ts`/`supabase.ts` have timeouts (chat agent confirmed Maps has 5s in `web.ts`, but the standalone commute path is unverified); whether `sentry.client.config.ts` vs `instrumentation-client.ts` double-runs (P1-13).

---

## 10. Discovered during work (implementer: append here, do not fix inline)

- _(add anything you find while executing the tasks above)_


┌──────────────┬───────────┬───────────────────────────────────────────────────────────────────────┐
│   Category   │  Status   │                                Details                                │
├──────────────┼───────────┼───────────────────────────────────────────────────────────────────────┤
│ P0 Blockers  │ ✅ 6/6    │ Webhook security, env vars, compression, admin auth, .gitignore       │
├──────────────┼───────────┼───────────────────────────────────────────────────────────────────────┤
│ P1 Hardening │ ✅ 10/10  │ Telemetry, deadline, sanitization, analytics, rate limits, auth gates │
├──────────────┼───────────┼───────────────────────────────────────────────────────────────────────┤
│ P2 Polish    │ ✅ 7/7    │ Deps, AVIF, dead code, validation, docs, honesty fixes                │
├──────────────┼───────────┼───────────────────────────────────────────────────────────────────────┤
│ Type Safety  │ ✅ Clean  │ Backend: no errors. Frontend: no errors.                              │
├──────────────┼───────────┼───────────────────────────────────────────────────────────────────────┤
│ Secrets      │ ✅ Safe   │ No API keys in git history.                                           │
├──────────────┼───────────┼───────────────────────────────────────────────────────────────────────┤
│ Commits      │ ✅ Atomic │ All signed, each commit is a single fix.                              │
└──────────────┴───────────┴───────────────────────────────────────────────────────────────────────┘