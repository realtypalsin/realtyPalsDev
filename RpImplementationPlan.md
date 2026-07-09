# RealtyPals — Implementation Plan (Post-Audit)

**Source:** Full audit in `RpAudit.md`. DB schema in `dbStructure.sql`. Read both before starting.
**Branch:** work off `Admin-BuilderRegisterPanel` (current) or new branch from it.
**Golden rules (from CLAUDE.md):** never invent data; DB facts > model knowledge; UI/UX design is FINAL — do not restyle anything; simplest fix that works; verify with real data (curl/DB query) before claiming done; run build + typecheck before marking complete.

**Repo layout:** `frontend/` = Next.js App Router (also owns `prisma/schema.prisma`). `backend/` = Express API (`src/routes/`, `src/lib/ai/`, `src/lib/discovery/`). Backend default port 3001, frontend expects 3002 in one place (bug, Phase 1).

---

## PHASE 1 — Security + Correctness Hotfixes (do first, one commit per item)

### 1.1 IDOR: builder leads
`frontend/app/api/builder/leads/[id]/route.ts:30-37` — PATCH updates `builderLead` by `params.id` only. Fix: load caller's `BuilderAccount` by supabase user, then `prisma.builderLead.update({ where: { id: params.id, builder_id: account.builder_id } })` (or `updateMany` + count check → 404 if 0). Also zod-validate `body.status` against enum used in `builder/leads/route.ts:13`.

### 1.2 IDOR: builder news
`frontend/app/api/builder/news/[id]/route.ts:25,55` — PATCH/DELETE have NO ownership check. Fix: same pattern as 1.1 — resolve account, scope `where` by `builder_id`. Remove redundant re-check at `builder/news/route.ts:31-33` while there.

### 1.3 Fail-open admin
`frontend/lib/auth.ts:62` — empty `ADMIN_USER_IDS` ⇒ everyone is admin. Fix: `if (adminIds.length === 0) return false` (deny by default). Add startup warn log.

### 1.4 Sector disambiguation (highest-value UX fix)
`backend/src/routes/chat.ts` — local `sectorDisambiguation` declared line ~298, destructure at ~503-509 only reads `disambiguation`; `discoverProjects` DOES return `sectorDisambiguation` (`backend/src/lib/discovery/projects.ts:513`). Fix: assign it from discoveryResult, and when present short-circuit exactly like the project-disambiguation path: return clarification message + chips ("Sector 10 Noida (N projects)" / "Sector 10 Greater Noida West (M projects)") instead of running search. Chips must carry the full canonical sector string so next turn filters unambiguously. Verify: curl chat endpoint with "show me sector 10" → expect clarification chips, not empty results.

### 1.5 Enum case mismatches (dead features)
- `backend/src/lib/discovery/scoring.ts:302` — `'READY_TO_MOVE'` → `'ready_to_move'` (DB enum is lowercase; see seed + schema).
- `backend/src/lib/discovery/sectors.ts:34,39,46,101` — `'METRO'|'HIGHWAY'|'SCHOOL'|'HOSPITAL'|'MALL'` → lowercase; `HIGHWAY` doesn't exist — use `expressway` and `road` (ConnectivityType enum members: metro, road, expressway, school, hospital, mall — confirm in schema.prisma before editing).
Verify: query a sector with metro connectivity, confirm `metroStations` non-empty; confirm RTM projects get ranking boost.

### 1.6 Groq fallback crash
`backend/src/routes/chat.ts:676` — `streamWithGroq` inside OpenAI catch; `GroqStreamStallError` (`backend/src/lib/ai/groq.ts:35`) unhandled. Fix: import it, wrap Groq call in own try/catch, on stall send graceful "high load, please retry" message to stream instead of generic 500.

### 1.7 GATHERING loop fabricates filters
`backend/src/routes/chat.ts:384` — injects `budgetMax: 1.5, bhk: [3]` after 2 gathering turns. Fix: delete the injection; fall through to clarification chips (budget + BHK options) instead. Never invent constraints.

### 1.8 Logo upload 413
`backend/src/index.ts:59` — `express.json()` default 100kb vs 2MB base64 logos (`BuilderRegistrationForm.tsx:38`). Fix: `express.json({ limit: '5mb' })`.

### 1.9 Rate limit public POSTs
`backend/src/routes/builderRegistration.ts:76` (and callback/site-visit routes if unlimited) — reuse existing `checkRateLimit` helper (used at `backend/src/routes/admin.ts:37`) keyed by IP.

### 1.10 Upload validation
`builderRegistration.ts:44-69` — trusts client mime/ext/size on base64 upload to public bucket. Fix: allowlist ext (png/jpg/jpeg/svg/webp), decode + check byte length (≤2MB), sanitize filename, keep bucket path prefixed `builder-logos/`.

### 1.11 Admin pages call wrong API
`frontend/app/admin/leads/page.tsx:32,45` and `app/admin/news/page.tsx` fetch `/api/builder/*` (Supabase builder auth) but admin uses Express cookie auth. Fix: add/verify admin endpoints under backend `/api/v1/admin/leads` + `/admin/news` (behind existing `requireAdmin`, `backend/src/routes/admin.ts:93`) and point admin pages there. Include pagination params.

### 1.12 `booking_amount_pct` ghost field
`frontend/components/property-detail/ProjectPricingTab.tsx:109` reads field absent from `PaymentPlan` (schema.prisma:537-552, and `dbStructure.sql` payment_plans confirms). Fix: derive booking % from first milestone `pct` if present, else hide the row.

### 1.13 Backend port mismatch
`BuilderRegistrationForm.tsx:81` defaults `localhost:3002`; backend `index.ts:41` defaults 3001. Fix: use shared `NEXT_PUBLIC_BACKEND_URL` like other clients.

**Phase 1 verify:** `npm run build` + `tsc --noEmit` both workspaces; curl each fixed endpoint (wrong-owner mutation → 404/403; sector 10 → chips; oversized logo → clean 400).

---

## PHASE 2 — Kill Fabricated Data (trust-critical)

### 2.1 IntelligenceTab Elite-X leak (worst offender)
`frontend/components/property-detail/IntelligenceTab.tsx:50-127` — `getDefaultIntel()` hardcodes Elite-X facts (score 88, ₹28-34k rent, "2100+ units", "mini-golf", ROI 6.5-7.5%, appreciation 12-16%) merged via `{...defaultIntel, ...rawIntel}`. Also `:61-67,148-155` default dimension scores 88/92/95 with "Verified" badge, and `getDimensionSummary` (`:157-165`) fabricates builder facts from score alone.
Fix: delete `getDefaultIntel` entirely. Render only what exists in `decision_profiles.intelligence_data` (jsonb, dbStructure.sql:324). Every missing field → explicit "Data not verified yet" empty-state (small muted text, match existing tab styling — do NOT redesign). No default scores, no "Verified" badge without `last_verified_at`/`verified_by`. Dimension summary text: use real fields (builders.delivered_units, rera_compliance_score etc. if plumbed) or omit parenthetical.

### 2.2 LocationTab hardcoded POIs
`frontend/components/property-detail/LocationTab.tsx:55-64` — static Greater-Noida-West markers for every project; `:76,107` fallback "Elite X" / "Sector 10, Greater Noida West". Fix: build markers from `detail.connectivity` (connectivity table has type/name/distance_km); if no lat-per-POI available, show list without map pins. Fallback text → project's own `sector`/`city`, else hide.

### 2.3 Guardrail: pre-stream RERA check
`backend/src/lib/ai/guardrails.ts:15` observe-only + runs post-stream (`chat.ts:686`). Full pre-stream moderation would break streaming UX; pragmatic fix: keep observe mode for competitor mentions, but add a cheap regex scan on each flushed chunk buffer for RERA-pattern fabrication (`UPRERAPRJ\d+` not present in injected block data) → replace with "[RERA number withheld — verify on UP RERA portal]". Log all hits.

### 2.4 Prompt contradiction
`backend/src/lib/ai/prompts/blocks.ts:241-244` injects `rental_yield`/`appreciation_annual` while Hard Rule 20 (`blocks.ts:375`) + guardrail ban emitting appreciation %. Decide ONE: if these come from admin-verified `intelligence_data`, allow emission with "as per verified data" phrasing and drop the ban; otherwise stop injecting. Don't leave both.

### 2.5 Builder onboarding dead end
`backend/src/routes/builderApplications.ts:115-132` — approval creates `BuilderAccount{user_id:null, auth_method:'magic_link'}` but no link ever issued; `reviewed_by:'admin'` hardcoded. Fix: on approve, send Supabase magic-link/invite email to account email; on first login match by email → set `user_id`. Set `reviewed_by` from the authenticated admin session.

**Phase 2 verify:** open a project with no `intelligence_data` in DB → Analysis tab shows empty-states, zero Elite-X strings (grep rendered HTML for "2100", "mini-golf", "Mivan"). LocationTab of a non-GNW project shows no "Gaur Chowk".

---

## PHASE 3 — Data Normalization + Reproducibility

### 3.1 Canonical sector + city (blocks search correctness)
Three sector formats in DB for same place: `"10"` (seed-elite-x.ts:46), `"Sector 10"` (seed-irish-platinum.ts:46), `"Sector 10 Greater Noida West"` (irish-platinum.json). Cities: "Noida" / "Greater Noida" / "Greater Noida West".
Steps:
1. Write `backend/src/lib/discovery/normalize.ts`: `canonicalSector(raw) → "Sector N"` (strip city suffixes using `CITY_LEVEL_TERMS` from constants.ts, prefix bare numbers), `canonicalCity(raw)` → controlled vocab {Noida, Greater Noida, Greater Noida West}.
2. One-off migration script `frontend/scripts/normalize-locations.ts`: read all projects, rewrite sector/city via the helpers, log every change, dry-run flag. Run dry → review → run live.
3. Apply helpers on EVERY write path: seed scripts, seed-from-json, admin project mutations, builder flows.
4. Update `getSectorContext` (`sectors.ts:9`) + `getAllSectorsOverview` (`sectors.ts:73-78`) to key by `city+sector` (prep for multi-city).

### 3.2 Prisma migration baseline
Schema was `db push`-ed; only 3 migration files exist — fresh env cannot be built. Fix: `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > baseline.sql`, create baseline migration folder, `prisma migrate resolve --applied <name>` against prod DB. Document the `Unsupported("vector")` embedding column (schema.prisma:135) needs hand SQL (pgvector) in the baseline.

### 3.3 Price/label hygiene
- Budget filter drops null-priced projects: `projects.ts:156-165` — add `OR: [{ price_min_cr: null }]` inside the unit_types `some` so unpriced projects still appear (AI already says "pricing not disclosed").
- `price_label` free-text drift ("₹1.85 Cr" vs "Rs 1.70 Cr - 2.07 Cr") — derive display label from `price_min_cr`/`price_max_cr` via one formatter (Phase 5.3), stop trusting stored text.
- IFMS=50 in cost_sheets — ask user: absolute ₹ or ₹/sqft? Fix datum or add `ifms_unit` semantics. FLAG, don't guess.

### 3.4 Image backfill
`hero_image_url` ~2/3 stale; JSON-seeded projects (irish-platinum, lotus-arena, godrej-majesty) have `hero_image_url:""` + zero `project_images`. Backfill `project_images` rows where assets exist; frontend already prefers `images[]` in most components (memory: prefer images[], track per-URL failures).

**Phase 3 verify:** SQL: `SELECT DISTINCT sector, city FROM projects` → only canonical values. Fresh DB from migrations boots the app.

---

## PHASE 4 — DB-Driven Config + Progressive Chips

### 4.1 Dynamic chip options (user's core ask: predictive, conversational chips)
Kill static lists:
- `backend/src/lib/discovery/conversationEngine.ts:125-136` (`SECTOR_OPTIONS`/`BUDGET_OPTIONS`/`BHK_OPTIONS`)
- `backend/src/lib/discovery/confidence.ts:27-63` (`COVERED_SECTORS`/`SECTOR_CHIPS`/`BUDGET_SECTOR_CHIPS`), `:119-123` hardcoded budget chips, `:167` hardcoded fallback query.
Replace with cached DB aggregates: new `getChipInventory(city)` in discovery — top sectors by project count (`GROUP BY sector`), budget buckets from actual `price_min_cr` distribution (e.g. quartiles → "Under ₹1.5 Cr", "₹1.5–2.5 Cr", …), BHK options from distinct `unit_types.bhk`. Cache 10 min in-memory. Chips then always match real inventory.

### 4.2 Wire dead discovery chips
`getDiscoveryChips` returns `[]` (`conversationEngine.ts:158-160`) and `PRIMARY_GROUP`/`JOURNEY_GROUP`/`FILTER_GROUP` (:154-156) unused → homepage/DISCOVERY chips empty. Fix: return from `getChipInventory` + journey starters ("Ready-to-move options", "Best under ₹2 Cr", "Compare top builders in <top sector>"). Keep RESEARCH/COMPARING/DECIDING chips as-is (already dynamic, `conversationEngine.ts:222-288`).

### 4.3 Blocked builders → DB
`base.ts:112-114` + duplicate in `chat.ts:147-148` name Supertech/Amrapali/etc verbatim. `builders.legal_flag` column exists (dbStructure.sql:23). Fix: query flagged builders at prompt-build time (cache 10 min), inject list into prompt from DB. Single source.

### 4.4 Config module
New `backend/src/lib/config.ts`: model IDs (`gpt-4o` intent.ts:100, `gpt-4o-mini` openai.ts:247, groq models groq.ts:24-25 — make `streamWithGroq` actually use `GROQ_SMART` instead of inline literal at groq.ts:95), EMI rate 8.75 (chat.ts:614, openai.ts:169, base.ts:215), tenure 20, `SAFE_TOKEN_CEILING`, maxTokens. Env-overridable.

### 4.5 Multi-city prep (Noida now, scale later)
- City as first-class: intent already extracts city? confirm; default `'Noida'` stays for now but ONLY in one place (config).
- `SECTOR_ADJACENCY` (constants.ts:37-87) → keep as Noida map but restructure to `Record<city, adjacencyMap>` so city #2 is data-add, not refactor.
- All sector aggregations keyed `city+sector` (done in 3.1.4).
- Prompt: keep Noida identity for launch; note in code comment that few-shots need per-city variants later. Do NOT rewrite prompts now.

**Phase 4 verify:** chips returned by chat API match live DB counts (spot-check SQL); "show me sector 10" → disambiguation chips (from 1.4) with real project counts; add fake flagged builder in DB → appears in prompt.

---

## PHASE 5 — Dedup, Tests, CI, Cleanup

### 5.1 Frontend hooks extraction (fixes bugs + dedup together)
- `usePreferredImages(project)` — hero/exterior preference + per-URL failure set. Replaces copy-paste in `ProjectCard.tsx:80-119`, `ProjectDetailPanel.tsx:216-226`, `PropertyCardWithRecommendation.tsx:58`, `ComparisonTable.tsx:407-410`, `admin/projects/page.tsx:259`, AND adds the missing `onError` fallback in `MessageBubble.tsx:449-455` (chat carousel currently shows broken images).
- `useSaveProject(projectId)` — dedupe `/saved` POST/DELETE + authHeaders from `ProjectCard.tsx:121-152` / `ProjectDetailPanel.tsx:186-209`.

### 5.2 Backend dedup
- Extract shared rule text between `base.ts` Hard Rules and `GROQ_FALLBACK_SUFFIX` (`chat.ts:134-213`, ~80 dup lines).
- Shared reducer for `getSectorContext`/`getAllSectorsOverview` (`sectors.ts:6-126`).
- Session ownership check + message-persist blocks in chat.ts (982-1054, 1076-1120, 760-818) → helpers.
- Shared zod schema for builder form (client `BuilderRegistrationForm.tsx:65-74` re-implements server `builderRegistration.ts:12-14`); centralize status enums (`builderApplications.ts:65`, `builderRegistration.ts:116`, `builder/leads/route.ts:13`).

### 5.3 One price formatter
Keep `frontend/lib/format.ts` `formatPriceCr`; fold in `calculators.ts:108 formatInr` + `utils/formatters.ts:10 formatBudget`; replace inline `/10000000`/`toFixed` in the 26 components incrementally (at minimum: MessageBubble, ComparisonTable, ProjectPricingTab, ResidencesTab).

### 5.4 Tests — decisions (user-approved recommendations)
Existing REAL suites (keep all 7): `frontend/__tests__/{calculators,MessageBubble,ProjectCard,ProjectDetailPanel,Sidebar,OverviewTab}.test.{ts,tsx}` + `backend/src/lib/ai/__tests__/intent-extraction.test.ts`.
- KEEP `intent-extraction.test.ts`; port 3 unique lifestyle/city-level cases from `backend/src/lib/discovery/__tests__/routing-validation.ts`, then DELETE it.
- DELETE `backend/test_intent.ts`, `backend/test_discovery.ts`, `frontend/test_query.js` (scratch).
- KEEP `backend/scripts/test_chat_regression.js` (superset), DELETE `test_chat_session.js`. Move remaining live-server scripts to `backend/scripts/diagnostics/`.
- Backend `package.json` test script runs ONE hardcoded file → change to glob: `node --test "src/**/__tests__/*.test.ts"`.
- Root `package.json`: add `"test": "npm test -w frontend && npm test -w backend"` (or equivalent non-workspace chaining).

### 5.5 New tests (target the audit's bug classes)
- Discovery: `buildHardFilters` (budget tolerance, null-price inclusion from 3.3, sector whole-word), `scoreAndSort` threshold fallback, enum-case regressions (1.5).
- Chips: `getChipInventory` shapes, disambiguation chip payloads (1.4).
- Authz: builder lead/news ownership (1.1/1.2), admin fail-closed (1.3) — route-handler unit tests with mocked prisma.
- Frontend: IntelligenceTab empty-state (no Elite-X strings when intelligence_data null — direct regression for 2.1); MessageBubble image onError fallback.

### 5.6 Discovery threshold floor
`projects.ts:354-360` fallback surfaces any score>0 as "matches". Add minimum floor (e.g. score ≥ 10) + when using fallback, tell the model results are "closest available, not exact matches" so copy stays honest.

### 5.7 Repo cleanup
Delete/gitignore: `elitex_website_downloader/` (12MB, committed node_modules — user said delete OK? confirm before rm), `OverviewTab.old.tsx`, `ProjectDetailPanel.old.tsx` (root + frontend copies), `pdp*.diff`, `pdp_f2e7f8f*.tsx`, `old.txt`, `Junk/`, `frontend/build*.log`, `eslint-results.json`, `diagnose*.js`. Add `.gitignore` entries for logs/scratch.

### 5.8 Error visibility
- Admin lead status change swallows errors (`app/admin/leads/page.tsx:36,53`) → toast + revert optimistic state.
- `RealtyChart.tsx:15` silent null on bad JSON → render small "chart unavailable" fallback.
- Session-list `{sessions:[]}` on DB error (chat.ts:934,966) → add server-side error log at minimum.
- Recommend Sentry (frontend + backend) — ask user before adding the dependency.

**Phase 5 verify:** `npm test` at root runs everything green; build + typecheck clean.

---

## DEFERRED (do not build without user go-ahead)
- Builder dashboard UI (API routes exist: `/api/builder/{dashboard/stats,leads,news,theme,analytics}`; stats stubbed at `dashboard/stats/route.ts:36,50,52`). User to decide: build vs feature-flag.
- Persona-tailored chat copy (first-timer vs investor register). Post-launch.
- Structured JSON block contract replacing regex-over-markdown parser (`frontend/lib/responseParser.ts`). Big win, big change — separate project. Interim: fix `coverage_status` header conflict (`base.ts:192` "🏗️ Coverage Status" vs `blocks.ts:289` "🌟 Upcoming Expansion" — pick 🏗️ so parser matches) and add sector-advisory detectType (blocks.ts:52-59 table currently renders raw markdown). These two small fixes CAN go in Phase 4.
- Multi-city rollout (prep done in Phase 4.5).
- `quick_picks`/`single_project` dead renderers (`ResponseBlockRenderer.tsx:228-237`) — remove in Phase 5 cleanup or wire later.

## OPEN QUESTIONS FOR USER (blockers marked ⚠)
1. ⚠ IFMS=50 unit (3.3) — absolute or per-sqft?
2. ⚠ `elitex_website_downloader/` — delete entirely?
3. Prompt contradiction (2.4) — emit verified yield/appreciation, or stop injecting?
4. Sentry dependency OK?
5. Builder dashboard — build now or flag?

## WORKING AGREEMENT FOR NEXT AGENT
- One phase = one PR-sized unit; commit per numbered item where practical.
- After each fix: typecheck + build; for API fixes, curl with real payloads; for data fixes, run SQL spot-checks. Never claim done on code review alone.
- Don't touch visual design/styling. Don't add unrequested features. Ask when ambiguous (esp. ⚠ items).
