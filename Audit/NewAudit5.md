# RealtyPals — Production Readiness Plan
_Generated 2026-07-12. Source: deep audit of chat/AI pipeline (complete) + prior session findings. Backend-API, frontend-perf, and config-sync audits were interrupted by token limits — resume them in Phase 5._

## The Roast (short version)
- Your "AI advisor" ships a spoofable identity header: send `x-user-id: <anyone>` with no cookie and the middleware waves you through. Anyone can read/wipe another user's chats. That's not an auth system, it's a suggestion box.
- The chatbot has goldfish memory by design: it loads the **oldest** 8 messages of a session, so the longer someone talks, the dumber it gets.
- The "smart suggestion chips" are three hardcoded arrays and a regex. Zero AI, zero context. ADVISOR phase dumps 8 chips + parse chips = the 9-10 chip spam you saw. One chip even lies — "Show properties" secretly sends "3BHK in Sector 150" the user never asked for.
- Every user message re-sends a ~3k-token system prompt (stamp duty tables for 7 states, bank rates, legal checklists) up to 5 times per message. 60-70% of your AI bill is boilerplate the model mostly ignores.
- CLAUDE.md still describes a `backend/src/lib/ai/` architecture that doesn't exist. Docs lying to the AI that maintains the code — bold strategy.

## Ratings (audited areas)
| Area | Score | Verdict |
|---|---|---|
| Chat security (identity) | 2/10 | Header-trust bypass = critical |
| Chat correctness | 5/10 | Wrong history order, orphaned turns, 30s hard abort |
| Chips UX | 3/10 | Hardcoded, context-blind, spammy |
| AI cost/latency | 4/10 | Bloated prompt × 5 steps, no result caching |
| Chat route hygiene (validation, tool safety) | 7/10 | Zod everywhere, parallel fetches, host-pinned RERA, untrusted-data wrapping — genuinely good |
| Backend API/DB, Frontend perf, Contract sync | TBD | Audits pending (Phase 5) |

## What's already good (keep)
- Zod validation on body + all tool inputs (`frontend/app/api/v1/chat/route.ts:31-34,61-64`)
- Session ownership via `findFirst({ id, user_id })` — correct once identity is fixed
- Web results wrapped as "[Untrusted reference data]"; RERA URL host-pinned to `www.up-rera.in`
- Rate-limit/session/memory fetches parallelized (`Promise.all`); persists parallelized at end
- Redis caching for web search (24h), area info (24h), commute (6h)

---

## Fix Plan (in order — each phase shippable alone)

### Phase 0 — SECURITY HOTFIX (do first, ~1 file)
**P0.1 `frontend/middleware.ts:24-47` — kill the `x-user-id` bypass.**
Problem: header verified against Supabase JWT only if cookie exists; no cookie → header passes through. Affects chat, chat/intent DELETE (memory wipe), session/list, saved, price-alerts.
Fix: strip any inbound `x-user-id`; derive userId ONLY from the verified cookie; no cookie → treat as guest (guestToken), never trust the header. 401 on mismatch.
Test: curl with forged header + no cookie → must NOT access another user's sessions.

### Phase 1 — Chat correctness (~1 file)
**P1.1 `route.ts:74,91` — history order.** `orderBy: created_at desc, take: 8`, then `.reverse()`. Fixes "forgets recent context".
**P1.2 `route.ts:412-414` — orphaned user turns.** Persist user message together with assistant reply after stream completes (or mark/clean orphans) so aborts don't pollute history.
**P1.3 `route.ts:29,121-125` — timeout.** Raise `REQUEST_TIMEOUT_MS` 30s → 50s (maxDuration is 60) AND send an SSE `truncated` event on abort so UI can say "response cut short".

### Phase 2 — Chips redesign: progressive disclosure (~3 files)
Current: 3 independent client-side sources — `SUGGESTION_POOL` (DiscoveryContent.tsx:69-80, 10 mixed strings), `getFollowUpChips` (:29-67, fixed 8-chip ADVISOR block rendered under every AI message), `ChatLoader.parseQuery` regex chips (:15-37). No cap, no context.
New design:
1. Server emits at most ONE `missing_dimension` per turn in the existing `done` SSE payload (derive from the intent/filters the route already has — no extra LLM call; cheap heuristic: which of budget/BHK/location is unset, in that priority order).
2. Client renders only that dimension's options, max 4-5 chips: budget first → then BHK → then location.
3. Action chips (EMI, site visit, compare, callback) render ONLY after a search returned results **in the current thread** — never from a restored session's persisted `phase: 'ADVISOR'`.
4. Delete `ChatLoader.parseQuery` echo chips and the lying "Show properties" chip (DiscoveryContent.tsx:60) — chips must send exactly the text they show.
5. Welcome screen: keep 4 starter chips max, one per dimension.

### Phase 3 — AI cost + latency (~2 files)
**P3.1 Slim the system prompt (`frontend/lib/ai/prompts.ts:10-191`), ~3k → ~1k tokens.** Move stamp-duty tables, bank-rate tables, legal checklists OUT of the prompt and INTO the existing calculator tools (return the table data from the tool when asked). Saves ~2k tokens × up to 5 steps per message = 60-70% input-token cut.
**P3.2 Cache property search.** `search_properties` (route.ts:161-202) hits Postgres + re-ranks every call. Add short-TTL (5-10 min) Redis cache keyed on normalized filters; reuse `session.last_projects` for follow-up/reasoning turns instead of re-searching (fix backlog for this already exists in session memory: cache-reuse decision `canReuseCache`, budget-only filtering, cacheSource tagging).
**P3.3 Sanitize memory before prompt injection.** `buildMemorySection` (prompts.ts:193-222) injects stored `sector_preference` verbatim → persistent cross-session prompt-injection channel. Whitelist on store: `^Sector \d{1,3}$`, cap lengths.
**P3.4 Consider `stepCountIs(5)` → 3.** Five sequential 70B calls is the latency ceiling; most turns need ≤2.

### Phase 4 — Hygiene (small, batchable)
- **P4.1** Swallowed errors → structured `console.error` with tool name (route.ts:132,219-221,245-246,375).
- **P4.2** CLAUDE.md folder-structure section is stale (`backend/src/lib/ai/` doesn't exist; live chat = Next route). Update it.
- **P4.3** Duplication: `backend/src/routes/leads.ts` vs `frontend/lib/leadNotify.ts` — pick one, delete other (backend/ now only has health.ts + leads.ts).
- **P4.4** Repo: gitignore `.tokensave/*.db*`; decide fate of untracked `dbStructure.sql` (manual dump = schema-drift risk vs Prisma migrations — delete or move to docs).

### Phase 5 — Finish the audit (after token reset)
Three auditors were interrupted; resume when budget allows:
- **Backend API/DB**: per-route Zod/auth/pagination table, admin auth (cookie flags, timing-safe compare), Prisma indexes, N+1s, rate limiting.
- **Frontend perf**: server/client component split, SSE render perf, image fallback state (known: stale `hero_image_url` for ~2/3 projects — prefer `images[]` + per-URL failure tracking), memoization, bundle.
- **Contract sync**: `types/project.ts` vs prisma schema vs actual API payloads — field-by-field mismatch table.
Then run: `cd frontend && npx tsc --noEmit` + lint as the gate.

## Suggested execution order
Phase 0 today (tiny, critical). Phases 1+4 together (one route file + chores). Phase 2 next session (UX-visible). Phase 3 after (measure token usage before/after). Phase 5 when weekly tokens reset.
