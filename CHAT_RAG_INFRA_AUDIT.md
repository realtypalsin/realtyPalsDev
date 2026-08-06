# RealtyPals — Chat/RAG/Infra Audit

Date: 2026-08-06
Scope: chat pipeline, retrieval ("RAG"), summarization, DB scalability, security, performance, monitoring, reliability.
Method: static code audit only (read-only). No load testing, no penetration testing, no production telemetry pulled. Every finding below has a file:line source; nothing here is guessed.

No changes have been made to the codebase. This is a report only.

---

## 0. Overall Rating

| Dimension | Score /10 | Why |
|---|---|---|
| Anti-hallucination discipline (chat) | 8 | Sentinel contracts, confidence floor, output guardrail, tool-based fact fetching. Best-built part of the system. |
| Anti-hallucination discipline (whole product) | 4 | Undermined by `IntelligenceTab.tsx` inventing numbers outside chat (prior audit finding #1) — one weak link breaks the trust story. |
| Retrieval quality ("RAG") | 5 | Solid deterministic SQL retrieval + real scoring model. Not actually RAG — no semantic/vector search, so natural-language queries that don't hit keyword/ILIKE matches will under-retrieve. |
| Summarization | 6 | Real rolling 3-topic summarizer exists and is wired in. Missing: no per-property mention/interaction counts feed into it, despite the raw data existing one table away. |
| Database scalability | 4 | Indexes mostly fine on core tables, but unbounded analytics aggregation + zero connection-pool tuning + zero query observability. Will degrade quietly, not crash immediately — worse, because no one will notice until it's bad. |
| Security | 5 | Good: admin auth, CORS scoping, secrets not hardcoded, most routes Zod-validated. Bad: admin mass-assignment PATCH, admin login unrate-limited, analytics endpoint open to spam, zero bot/CAPTCHA protection anywhere. |
| Monitoring | 6 | Sentry + PostHog + pino all genuinely wired (better than most seed-stage apps). Undercut by admin routes bypassing structured logging entirely and a richer health-check module that isn't actually mounted. |
| Reliability/Recovery | 3 | No rollback tooling, no backup script, no documented recovery path in-repo. May exist at infra/platform level — unverifiable from source. |

**Composite: functionally closer to a well-architected v1 than a hobby project, but with 3 silent-failure-shaped gaps (frontend fabrication, unbounded analytics query, no cache invalidation on admin edits) that will each eventually produce a "why is this wrong/slow" incident that's hard to trace, because nothing logs or alerts on them today.**

---

## 1. Is this "RAG"? — Ground truth

**No embeddings, no vector search, no semantic retrieval anywhere in the live code path.**

- `Project.embedding` exists as a dormant `Unsupported("vector")?` column (`docs/dbStructure.sql:90`, generated Prisma client schema). It is **never read, written, or queried** — confirmed zero hits for `embedding` in `backend/src`.
- No pgvector extension usage, no `<->`/`<=>` distance operators, no `$queryRaw` vector query, no ANN index.
- What actually happens: `backend/src/lib/discovery/projects.ts` runs a 4-branch waterfall of plain Postgres `WHERE` filters (exact/ILIKE string matching on name/sector/builder, `unit_types.some()` for BHK+budget), paginated at 20 rows/branch, then `scoring.ts` ranks the candidate rows with a hand-written point system, then the top N are JSON-injected into the LLM prompt.
- This is **retrieval + generation**, correctly separated and well-engineered — but it is keyword/structured retrieval, not semantic retrieval. Call it what it is internally so future decisions aren't made assuming embedding-based recall exists.

**Practical consequence:** a user asking something that doesn't match your ILIKE/sector-keyword vocabulary (paraphrase, typo, "family-friendly place near good schools" with no sector named) gets weaker recall than a system with actual semantic search. Your discovery/scoring logic is good at ranking what it finds — the gap is in *finding* the right candidate pool when the query doesn't line up with literal DB text.

### Retrieval pipeline detail (confirmed)

4 branches in `discoverProjects()`:
1. Explicit project name match (ILIKE, `take: 50`, no scoring — `matchScore: 100` hardcoded).
2. Hard-filter (sector + BHK + budget + builder), paginated 20/page, with same-branch fallback to sector-only if 0 rows.
3. Nearby-sector expansion, same pagination.
4. City-wide fallback ordered by `created_at desc`.

No Postgres full-text search (`tsvector`/`to_tsquery`) anywhere — confirmed absent. All matching is `ILIKE`-equivalent substring/prefix/suffix.

Each branch has its own 5-minute cache (`getCached`/`setCached`, SHA-256 key of `{intent, offset}`).

### Cache staleness — no invalidation on admin edits

- Discovery cache: 5 min TTL.
- Gateway cache (`projectDataGateway.cache.ts`): 1h TTL for builder/details intents, 30min for timeline/investment.
- **`admin.ts` has zero cache-invalidation calls** — confirmed via full grep for `cache`/`Cache`/`getCached`/`setCached`/`redis` across all 1030 lines. An admin correcting a wrong price or possession date has no guarantee chat reflects it for up to 5 min (discovery) to 1h (gateway), whichever cache layer served the stale read last.

---

## 2. Chat summarization — current state + property-mention-count design notes

### What already exists (working, not a stub)

`backend/src/lib/chat/summaryCompression.ts`:
- Triggers past 14 messages; keeps last 8 verbatim, compresses the rest.
- Produces **3 separate topic summaries** (location, financial, timeline), each capped 250 chars, each with its own prompt telling the model to ignore the other two topics.
- Model fallback: Gemini → OpenAI/Azure → Groq, returns `null` on total failure (not a fabricated summary).
- Wired into `chat.ts`: prior summaries pulled from session, new ones computed, persisted back.
- ⚠️ Discrepancy found: `chat.ts` reads/writes `summary_location`/`summary_financial`/`summary_timeline` fields on the session, but the generated Prisma schema snapshot inspected only shows a single `summary String?` column on `ChatSession`. Either the schema file inspected was stale/wrong source-of-truth, or these writes are silently no-ops/erroring. **Needs a direct check against the actual live schema before relying on this feature** — flagging as unverified, not confirmed broken.

### What you asked for — "summary weighted by how many times user asked about each property" — feasibility check

**The raw data for this already exists, one hop away, unused for this purpose:**

- `PropertyEvent` table: `session_id, user_id, guest_token, project_id, action, created_at` — one row per event (view/save/compare/share/brochure/gallery/location/call/whatsapp/site_visit/remove_saved), indexed on session_id/project_id/user_id/action/created_at.
- `backend/src/lib/chat/propertyEngagement.ts` **already computes exactly this shape of aggregate**: `scorePropertyEngagement(sessionId)` groups `PropertyEvent` by `project_id`, returns `{ projectId, weight, count, lastEngagedAt }` per project, with weighted scoring (named mention=1, view=1, detail=3, drilldown=3, saved=5, callback=10, site_visit=10). It also merges in raw "named mentions" from `intent_snapshot`.
- **This is not currently exposed to the user** — it's used internally (engagement scoring, DRILLDOWN resolution in `anchorResolution.ts`), not surfaced in any "you asked about Project X 4 times" summary.
- **Gap for a mention-count-aware summary feature**: `ChatMessage` has **no direct FK to `project_id`** — project references on the message side live only in untyped `Json?` columns (`intent_snapshot` per-message, `last_projects` per-session). The queryable, indexable, aggregatable source of truth for "how many times per property" is `PropertyEvent`, not the message table itself.

**Design note (not implementation) for when you build this:** the count you want is almost certainly `scorePropertyEngagement()`'s `count` field, keyed by `project_id`, scoped to the session (or user, if you want cross-session history via `user_id`/`guest_token`). The summarization prompt would need each topic's compression call fed a `{projectName, count}` list so it can phrase "we've looked at Prestige Park 4 times, mostly comparing prices" rather than the model guessing frequency from raw message text (which it currently has no reliable way to count — LLMs are bad at counting occurrences in their own context). This is a data-plumbing task, not a prompt-engineering task — the counting must happen in code (SQL groupBy on `PropertyEvent`) and be handed to the model as a fact, exactly like `projectFacts.ts` hands over verified facts today. Same architecture pattern you already use elsewhere — extend it, don't invent a new one.

---

## 3. Database & Scalability

**Schema source-of-truth note:** `backend/prisma/` has no real `schema.prisma` — only a 10-line migration stub. The actual schema lives at `frontend/prisma/schema.prisma`, referenced explicitly in `backend/package.json`'s `prisma.schema` config. `docs/dbStructure.sql` is a secondary manual reference not read by tooling and can drift. Worth knowing which file to trust when making schema changes.

### Indexes
- Core hot paths (Project by sector/city/status/possession_date/builder_id, UnitType by project_id, ChatMessage by session_id+created_at, ChatSession by user_id/guest_token, PropertyEvent by session/project/user/action/created_at, BuilderLead by builder/status/created_at) — **all indexed correctly.**
- **Missing:** `CallbackRequest.status` and `SiteVisitRequest.status` — both are unindexed despite being the columns admin dashboards filter/group by. Every admin status-filtered query on these two tables is a full table scan today. Low pain now (small tables), will start showing up in `EXPLAIN ANALYZE` once leads accumulate into the thousands.
- No `User` table exists — user identity is an ad hoc `user_id: String?` (Supabase auth ID) scattered across models. Nothing more to index there; noting as a schema-shape observation, not a defect.

### N+1 queries
**None found.** Checked `discovery/projects.ts`, `projectFacts.ts`, `admin.ts`, `analytics.ts`, `commute.ts`, `ai/tools.ts` — every loop either operates on already-fetched in-memory arrays or is a static config iteration. Builder lookups are correctly batched (`findMany({ where: { id: { in: [...] } } })`). This is a genuinely clean result — most codebases at this stage have at least one N+1.

### Pagination
Correctly paginated: admin callback list, admin project/builder/news lists, `builderApplications.ts`, `builders.ts`, `projects.ts` list route.

**Unbounded, no `take`:**
- `admin.ts:735-737` and `admin.ts:912-914` — fallback path loads **entire projects table** just to count sectors in JS, when the primary groupBy returns nothing.
- `admin.ts:958-961` — `propertyEvent.groupBy(['project_id','action'])` with **no `where`, no `take`** — aggregates the entire, ever-growing analytics event table on every call to this admin endpoint. This is the one that will get measurably slower every month in production, silently, with no alert to tell you it's happening.
- `admin.ts:997-999` (sectorIntelligence), `marketComparison.ts:42-54`, `priceAlerts.ts:60-67` — technically unbounded but naturally small/scoped today; lower urgency.

### Connection pooling / query timeouts
**None configured anywhere.** `backend/src/lib/db.ts` only sets Prisma log levels. No `connection_limit`, `pool_timeout`, `statement_timeout` in code or in the `DATABASE_URL` connection string. Prisma is running on defaults (`num_cpus * 2 + 1` connections, no statement timeout). At 10 users this is invisible. At 10,000 concurrent, an unbounded slow query (see above) can exhaust the default pool and start queuing/timing out unrelated requests — this is exactly the "slow database destroys the app" scenario the brief warned about, and today there is no configured ceiling to contain it.

### Query observability
**None.** No `EXPLAIN ANALYZE` usage, no slow-query threshold logging, no `pg_stat_statements`. The one test file named for performance/load testing (`spec30-performance-load.test.ts`) contains only `assert(true)` stubs — it runs green but tests nothing. This means: if the DB gets slow in production, you will find out from user complaints, not from your own instrumentation.

---

## 4. Security

### Good
- Secrets loaded from env only, zero hardcoded key material found (grepped for key-shaped patterns across backend+frontend).
- `.gitignore` correctly excludes all `.env*` variants.
- Boot-time fail-fast if `ADMIN_PASSWORD`/`DATABASE_URL`/AI keys missing.
- CORS restricted to a single configured origin (not wildcard), `credentials: true` scoped to it.
- Admin auth: Redis-backed session tokens, constant-time password compare (`timingSafeEqual`), `requireAdmin` applied to every admin route except login.
- Zod validation present on the large majority of routes (chat, analytics, commute, leads, saved, share, documents, builder registration, market comparison, price alerts, registry prices, builder reputation).

### Gaps
- **`admin.ts` PATCH endpoints for projects and builders do unvalidated mass-assignment** — `req.body` minus a short deny-list gets spread directly into `prisma.update()`. No Zod schema, no shape/type check. Anyone with a valid admin session (or a stolen one) can write arbitrary matching-name columns.
- **Admin login has no dedicated rate limit** — only the blanket global 100 req/60s/IP applies. A single shared `ADMIN_PASSWORD` with no per-attempt lockout and a 100/min ceiling is weak against credential stuffing.
- **`analytics.ts` POST endpoints have zero rate limiting** — open to unlimited unauthenticated writes bar the global IP limit. This is a public write endpoint with no volume control — spam/DB-fill risk, and it directly feeds the `PropertyEvent` table that's already flagged as an unbounded-growth risk above (§3) — these two issues compound.
- **No CAPTCHA/bot-detection anywhere.** Rate limiting throttles volume from one IP but does nothing against distributed or low-and-slow scraping — chat, project search, and analytics endpoints are all exposed to bot traffic with no detection layer at all.
- `intelligence.ts`/`admin-intelligence.ts` have zero auth despite "admin only" comments — currently dead code (not mounted in `index.ts`), so not a live vuln, but a landmine if someone re-mounts them later without re-adding auth.
- `registryPrices.ts` imports `checkRateLimit` but never calls it — a rate limit that looks present in the import list but isn't actually applied.

**Net: the admin surface is the weakest link** — well-authenticated, but once authenticated (or if that single password leaks), there's no validation or throttling standing between an admin session and arbitrary data corruption.

---

## 5. Performance & Caching

- Discovery results cached 5 min, gateway facts cached 30min-1h — reasonable TTLs for a real-estate dataset that doesn't change minute-to-minute.
- **But**: three separate hand-rolled in-memory Map caches (Gateway/QueryPlanner/LLMResponse) exist alongside a Redis instance the app already pays for and uses elsewhere (chat.ts rate limiting, admin sessions). In-memory caches vanish on every deploy and don't share state if you ever run multiple backend instances — inconsistent infra usage once you're not a single always-on process.
- `LLMResponseCache.set()` has a bug (from prior audit) where TTL-timestamp attachment silently no-ops on a string primitive — cached advisory summaries may not expire on schedule as written.
- No CDN/edge-caching signals investigated (out of scope for this pass — frontend delivery wasn't audited here).

---

## 6. Monitoring & Logs

### Real, not just planned
- **Sentry**: fully wired both backend and frontend, error capture on the global Express error handler and in chat.ts specifically. (Note: the file that shows "deleted" in git status is a stray duplicate at repo-root; the real active config at `backend/src/sentry.server.config.ts` is untouched — Sentry is not disabled.)
- **PostHog**: fully implemented (not just planned per CLAUDE.md's roadmap language) — init, event tracking, user properties, used live in chat.ts and wrapped around the frontend app.
- **pino** structured JSON logging, used consistently in `index.ts` lifecycle events, dev-only pretty-printing.
- `morgan('combined')` HTTP access logging.
- Health checks exist for DB/Redis/LLM (`healthChecks.ts`).

### Gaps
- **The richer 3-component health check module (`healthChecks.ts`) is not the one actually mounted** — `index.ts`'s live `/api/v1/health` endpoint has its own simpler inline DB+Redis check, skipping the LLM/Groq check entirely. There's unused, more-complete monitoring code sitting next to a simpler one actually serving traffic.
- **Admin routes bypass structured logging entirely** — every single catch block in `admin.ts` (~20 instances) uses `console.error` instead of the pino `logger`. The most sensitive route surface in the app has the weakest logging discipline. If something goes wrong on an admin write, you get unstructured console noise instead of a queryable, alertable log entry.
- No alerting layer verified beyond whatever Sentry's default issue-notification does — no explicit alert-on-threshold config found (e.g. alert if error rate spikes, alert if health check degrades for N minutes).

---

## 7. Reliability & Recovery

- No backup script, no migration rollback tooling, no restore procedure found anywhere in-repo.
- `vercel.json` configures frontend deploy only; no backend deploy config (no Dockerfile/compose/railway config) found in-repo — backend deploy/rollback mechanics live outside version control, unverifiable from source.
- CI workflows exist (`ci.yml`, `test.yml`) but are test/lint automation, not deploy/rollback/backup jobs.
- **This entire section may be fully handled at the infra/DB-provider level** (managed Postgres point-in-time recovery, Vercel's own rollback UI, etc.) — the honest finding here is "not visible from source," not "doesn't exist." Worth a direct conversation about what your DB host and deploy platform actually guarantee, since this audit can't see past the repo boundary.

---

## 8. What "beat ChatGPT/Claude/Gemini at chat" actually requires from here

Given everything above, the gap between "solidly engineered v1" and "feels like a frontier chat product" is not a model problem — it's these five things, in priority order:

1. **Kill the one place that fabricates data** (`IntelligenceTab.tsx`, prior audit finding #1). Every other trust mechanism you've built is worthless if a user hits one screen that lies with a straight face. This is the highest-leverage single fix available.
2. **Make the "asked about X, Y times" feature real** using `PropertyEvent`/`propertyEngagement.ts` data that already exists — this is a genuinely differentiated feature no consumer AI chat product does natively, because they have no persistent per-entity interaction history. You already have the substrate; it's unused.
3. **Add cache invalidation on admin writes.** An advisor that gives stale prices/possession dates because an internal cache didn't expire yet is a silent trust leak — the kind of bug that erodes confidence without ever producing an error.
4. **Close the retrieval gap for paraphrased/natural queries** — either broaden the ILIKE/synonym matching or (bigger lift) add real semantic search using the dormant embedding column. This directly serves your "conversation first, not filter-forms" product principle — right now, retrieval quality is only as good as the user's word choice matching your DB's literal text.
5. **Instrument what you can't see today**: query performance (slow-query threshold logging), the unbounded analytics aggregation, and route admin.ts through the structured logger. None of this is user-visible, but it's the difference between finding out about a production problem from a graph vs. from an angry user.

None of this requires a different LLM provider. It requires closing gaps in the plumbing around the LLM — which is exactly where "feels like Claude" or "feels like a toy" gets decided.

---

## 9. Explicitly out of scope for this pass (not investigated)

- `backend/src/lib/discovery/projects.ts`'s full 959 lines were read for branch logic but not stress-tested against real query volume.
- Frontend delivery/CDN/edge caching performance.
- Actual production latency numbers (this was a structural/static audit, not a profiled one).
- Whatever backup/rollback exists at the hosting/DB-provider level outside this repo.
- Penetration testing of the admin auth/session mechanism itself (reviewed for presence and correctness of the mechanism, not attacked).
