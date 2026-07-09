REVISED AUDIT — RealtyPals Production Readiness

Test Suite Correction: 6 actual test files exist:
- calculators.test.ts (17 tests, EMI/pricing math — running)
- intent-extraction.test.ts (backend, 28+ tests — running)
- MessageBubble.test.tsx (user/assistant messages, streaming indicator)
- ProjectCard.test.tsx (render, RTM tag, BHK rows)
- ProjectDetailPanel.test.tsx (tab switching, close action)
- Sidebar.test.tsx (session list, new chat, rename)
- OverviewTab.test.tsx (builder details loading, skeleton)

All import-clean. Coverage gaps remain: chip generation, discovery filters, auth/authz, most frontend hooks.

DB Structure note: schema is thorough — has decision_profiles, recommendation_profiles, project_dna, persona_profiles (table names are explicit). intelligence_data is jsonb on decision_profiles (line 324). The hardcoded Elite-X numbers in IntelligenceTab.tsx contradict this structure — data exists in DB but component ignores it.

---
🔥 SENIOR DEV + SENIOR MARKETING BRUTAL ROAST

🔴 CRITICAL (BLOCKS SHIP)

1. LLM Output Unpredictable — No Structured Schema

Dev angle: Backend prompt returns untyped markdown. Frontend regex-parses it into blocks. One typo in the prompt (🏗️ vs 🌟, "Why X?" vs "Why X?") and the parser silently degrades to raw markdown — user sees broken cards. Blocks.ts has 300+ lines of free-text instructions; one prompt update breaks the contract.

Marketing angle: User gets inconsistent formatting across chats. One session shows "Coverage Status" card, next shows bare | Sector | Best | … | table (no renderer exists). Feels broken/unprofessional.

Fix: Emit JSON, not markdown. Or: add regression test that runs the LLM, parses output, asserts known block types render correctly.

---
2. Sector Disambiguation Wired But Dead (Your #1 Case)

Dev: discoverProjects (projects.ts:513) computes sectorDisambiguation. Chat route (chat.ts:503) destructures disambiguation (only), never reads sectorDisambiguation. Local var at line 298 declared but never assigned.

User journey: "Show me Sector 10" → matches 3 sectors (Noida, GN West, GN East) → should ask "Did you mean…?" → instead returns empty results silently. User thinks there are no projects in Sector 10.

Marketing: User frustration. Broken UX. Defeats the "progressive clarification" feature you wanted.

---
3. Fabricated Intelligence Data Shown as Real

Dev: IntelligenceTab.tsx:50-127. getDefaultIntel() hardcodes Elite-X's exact numbers (score 88, rent ₹28-34k, "2100+ units delivered", "Mivan tech", "mini-golf", appreciation 12-16%, ROI 6.5-7.5%). Spread-merged under real DB data via {...defaultIntel, ...rawIntel} — any missing field renders Elite-X as the fallback.

Example: project XYZ has no intelligence_data in DB → entire analysis tab shows Elite-X facts labeled as XYZ's data. RERA fabrication + trust violation.

Marketing: Buyer reads "2100+ units delivered, confidence high" and thinks it's about the actual project. It's not. Legal/compliance risk.

Test: OverviewTab.test.tsx mocks MarketComparison and never tests the actual intelligence merge. Mutation testing would catch this in seconds.

---
4. LocationTab Hardcoded POI Markers

Dev: LocationTab.tsx:55-64. Markers are fixed (Gaur Chowk, DPS Noida, KP Office Corridor) + hero fallback "Sector 10, Greater Noida West"/"Elite X". No relation to actual project city/sector.

User journey: User looking at a Gurgaon/DLF Phase II project sees "Gaur Chowk nearby" (20km away). Looks fabricated.

Marketing: Undermines credibility. User assumes all data is hardcoded guesses.

---
5. Enum Case Mismatches = Silent Feature Death

Dev:
- scoring.ts:302: status === 'READY_TO_MOVE' but DB is ready_to_move → RTM boost never fires.
- sectors.ts:34-46: type === 'METRO'|'HIGHWAY' but enum is metro|road|expressway → metro/road/landmarks aggregation always empty.

User impact: "Ready to move" projects ranked 20 spots lower than they should be. Sector context missing → buyer doesn't see nearby metro/hospitals.

Marketing: Wrong projects shown first. Buyers click competitors instead.

---
6. Sector Format Chaos Across Seeds/Data

Dev: DB has "10", "Sector 10", "Sector 10 Greater Noida West" for the same place (from seed scripts). getSectorContext does exact match, getNearbySectors does regex — same sector splits into 3 in aggregations. Prices/counts are wildly off.

Example: Budget filter looks for price_min_cr <= 2.5, scopes to sector "10" → finds 5 projects. Then user clarifies "Sector 10" → scopes to "Sector 10" (different string) → finds 12 projects. Same sector, different results.

Marketing: Inconsistent inventory counts shatter buyer confidence.

---
7. Groq Fallback Can Still Crash

Dev: chat.ts:676. OpenAI fails → calls streamWithGroq() inside catch block. Groq throws GroqStreamStallError (groq.ts:35) → never caught (not imported in chat.ts). Error propagates to user.

User journey: OpenAI quota hit at peak traffic → fallback supposed to handle it → crashes instead.

---
8. Admin/Builder Auth is Two Systems Glued Together

Dev: Express password-cookie auth for /api/v1/admin/* (backend/lib/adminAuth.ts). Supabase token + ADMIN_USER_IDS hardcoded list for /api/admin/promotions/* (frontend). Admin leads/news pages call /api/builder/leads (wrong endpoint, wrong auth model) → 401.

User journey: Admin logs in via password → goes to /admin/leads → page calls /api/builder/leads?page=1 → 401 (expects Supabase builder token) → page is broken.

Risk: If ADMIN_USER_IDS is empty, every logged-in Supabase user becomes admin. Fail-open.

---
9. Builder IDOR — Any Builder Edits Any Leads/News

Dev:
- builder/leads/[id]/route.ts:30-37: update by params.id, verify caller has "a builder account", no scope to caller's builder_id.
- builder/news/[id]/route.ts:25,55: delete/update by id, no ownership check at all.

Exploit: Builder A posts as Builder B's account, deletes Builder B's news, reassigns leads.

---
10. Logo Upload 413 Error

Dev: index.ts:59 express.json() defaults 100kb. Form allows 2MB base64 logos → payload is ~2.7MB → 413 Payload Too Large.

User journey: Builder uploads logo → silent failure (no error toast) → form looks broken → bounces.

---
11. Chips Are Half-Baked

Dev: RESEARCH/COMPARING/DECIDING chips are dynamic (good). CLARIFYING sector chips hardcoded (confidence.ts:27-63) — will drift from DB. Budget chips fully static (BUDGET_OPTIONS const). Homepage chips dead (return [] always).

User journey: "Show me budget options under 2 Cr" → hardcoded "1.5/2.5/3.5 Cr" chips don't include "2 Cr" → confusion.

Marketing: Chips should feel intelligent and responsive. Instead, feel generic/canned.

---
12. Builder Onboarding: Account Created But Unreachable

Dev: builderRegistration.ts:115-132 creates BuilderAccount with user_id: null, auth_method: 'magic_link' (text), reviewed_by: 'admin' (hardcoded). No magic link issued. Approved builders can't log in.

User journey: Admin approves builder → builder tries to log in → fails (user_id is null) → no builder dashboard access.

---
13. GATHERING Loop Fabricates Constraints

Dev: chat.ts:384. After 2 intent-gathering turns, silently injects budgetMax: 1.5, bhk: [3] the user never stated.

User: "Help me find a 4 BHK" → on turn 3, constraints flip to 3 BHK only without asking → user sees wrong results → frustrated.

---
14. Migration History Cannot Recreate DB

Dev: Schema was applied via prisma db push before migrations. Only 3 migration files exist. prisma migrate deploy on a fresh DB cannot recreate the real schema.

Ops impact: Docker builds with fresh DB → missing tables → production breaks.

---
15. Output Guardrail is Observe-Only + Post-Stream

Dev: guardrails.ts:15 OUTPUT_OBSERVE_MODE=true. Guardrail runs after tokens streamed (chat.ts:686). RERA fabrication is logged but never blocked or redacted.

Legal risk: Fabricated "UPRERA12345" numbers shown to users, guardrail only logs it.

---
🟠 HIGH (BREAKS TRUST / UX CREDIBILITY)

16. Null-Safety Gaps Across Components

- ComparisonTable.tsx:405,423: reads project.status/project.name unguarded (never checks project prop itself is non-null).
- MessageBubble.tsx:449: no onError handler on carousel images → 2/3 stale hero URLs render broken images in chat.
- ProjectCard.tsx:80-119: repeated hero-image fallback logic (copy-pasted 5 times) — one fix needed in 5 places, bugs compound.

---
17. Price Filtering Silently Drops Projects

Dev: projects.ts:156-165. buildHardFilters has unit_types.some.price_min_cr <= budgetMax*tol. Prisma NULL rows are dropped — any project with unpriced units vanishes from budget filters.

User journey: "Show me 3BHK under 2 Cr" → project has 1 unpriced unit + 1 unit priced 1.5 Cr → filter drops entire project (because price_min_cr is NULL on that unit type).

---
18. Discovery Threshold Fallback Too Weak

Dev: scoreAndSort (projects.ts:354-360). No matches above SCORE_THRESHOLD=20 → falls back to score > 0 → returns semi-relevant projects as "matches".

User journey: Typo in query → LLM can't match → fallback returns noise → user sees wrong projects labeled as "matches".

---
19. Chat Image Fallback is Missing

Dev: MessageBubble.tsx:449-455. Image tags have no onError callback. With ~2/3 stale hero_image_url, chat session shows broken images.

User impact: Broken images = website looks dead/unmaintained.

---
20. No Error Recovery / Silent Failures Everywhere

- Session list returns {sessions: []} on DB error (chat.ts:934,966) — looks like "no sessions" not "error".
- Admin lead status change swallows errors, no toast, no rollback (app/admin/leads/page.ts:36).
- RealtyChart silently returns null on JSON parse failure (:15), no error boundary.

User frustration: "Why did my action vanish?" No feedback.

---
21. Rate Limiting Absent

Dev: Public POST endpoints have no rate limit:
- Builder registration (builderRegistration.ts:76).
- Callback requests (callback route).
- Site visit requests.

Risk: Spam, DDoS, email bombing.

---
22. Hardcoded Blocked Builders in Prompt (+ Duplication)

Dev: Supertech/Amrapali/Unitech/Wave/Jaypee hardcoded verbatim in base.ts:112 and again in chat.ts:147 (Groq suffix). Two copies → legal rules drift.

Marketing: If legal wants to block/unblock a builder, code + prompt need updating.

---
23. Model Names Scattered (5+ Places)

Dev: gpt-4o (intent.ts:100), gpt-4o-mini (openai.ts:247), llama-3.3-70b-versatile (intent.ts:72, groq.ts:25,95), llama-3.1-8b-instant (groq.ts:24). GROQ_FAST/GROQ_SMART consts defined but ignored (groq.ts:24-25), hardcoded literal inlined (groq.ts:95).

Ops: Switching to a new model = grep + edit 5 files.

---
24. Hardcoded Noida Assumption

Dev:
- Prompt identity "focused on Noida and GN" (base.ts:23).
- OUT-OF-SCOPE CITY rule (base.ts:80).
- 40+ few-shot examples are all Noida.
- city ?? 'Noida' defaults (chat.ts:593).
- SECTOR_ADJACENCY hardcoded (constants.ts:37-87) only Noida/GN.

Scaling: Adding Mumbai/Bangalore later = 3-week refactor (city as first-class intent, per-city adjacency, re-prompting).

---
🟡 MEDIUM (Professional Debt)

25. Code Duplication

- ~80 lines prompt policy (tool unavailability rules) duplicated between base.ts + chat.ts Groq suffix.
- Sector aggregation logic duplicated (getSectorContext vs getAllSectorsOverview).
- Hero-image selection copy-pasted in 5 components (ProjectCard, DetailPanel, Comparison, etc.) → one format bug compounds.
- 3 price formatters (formatPriceCr, formatInr, formatBudget) + 26 inline toFixed//10000000 across components.
- Save-project fetch logic copy-pasted in ProjectCard + DetailPanel.
- Session ownership check duplicated in GET/PATCH/DELETE routes (chat.ts:1076-1078 vs 1118-1120).
- Status enums scattered ('new'|'approved'… at builderApplications.ts:65, builderRegistration.ts:116, builder/leads/route.ts:13).
- CIN/phone regexes in form (BuilderRegistrationForm.tsx:65-74) vs Zod schema (builderRegistration.ts:12-14).

---
26. Dead Code & TODOs

- getDiscoveryChips() returns [] always (conversationEngine.ts:158-160), yet called on DISCOVERY stage.
- needsPurposeClarification hardcoded false (chat.ts:432) — never toggles.
- Commented-out Claude/Anthropic path (intent.ts:2,118-130).
- HomeComponent.ts — unused import, unreferenced route.
- Untracked backend/test_intent.ts, backend/test_discovery.ts (scratch scripts).
- Repo-root litter: pdp_f2e7f8f.tsx, pdp*.diff, ProjectDetailPanel.old.tsx, OverviewTab.old.tsx, Junk/, eslint-results.json.
- elitex_website_downloader/ (12MB, committed node_modules).

---
27. No Sentry / Error Tracking

Dev: Silent failures logged nowhere. Guardrail observe-mode logs to console only (no external service). User reports "I got blank results for Sector 10" → no way to trace root cause.

---
28. Frontend Testing Sparse

Dev: 6 test files exist but zero component integration tests. MessageBubble tests don't verify carousel, image error, chip rendering. ProjectDetailPanel tests mock all tab content. OverviewTab never tests the intelligence merge (the Elite-X hardcoding bug).

Gap: Discovery filters, chip generation, image fallback, null-safety, auth flows — all untested.

---
29. Database Consistency Issues

- Sector values: "10", "Sector 10", "Sector 10 Greater Noida West" for same place (split across 3 seed scripts).
- City values: "Greater Noida West", "Greater Noida", "Noida" (inconsistent capitalization).
- Price units: ifms = 50 (unclear: absolute or per-sqft? dbSample suggests ₹/sqft but value implausible).
- price_label free-text — "₹1.85 Cr" vs "Rs 1.70 Cr - 2.07 Cr" (inconsistent currency glyph, spacing).
- booking_amount_pct referenced in UI but absent from PaymentPlan schema.

---
MARKETING ROAST — Language & Tone

30. LLM Output Tone Inconsistent

- Problem: Prompt doesn't enforce voice/register. Model sometimes sounds like a bot ("The cost breakdown is as follows:"), sometimes overly casual ("Hey, this project is pretty cool!").
- Buyer impact: Feels disjointed. Loses trust mid-chat.
- Fix: Explicit tone/register constraints in prompt ("Always sound professional but conversational, like a knowledgeable friend").

---
31. Jargon Without Context

- "RERA compliance" used without explaining what it means to a first-time buyer.
- "Ready to move vs under construction" not explained.
- "OC" (Occupancy Certificate) appears in copy without definition.
- "Appreciation" thrown at non-investor personas (family buyers don't care about 12% price appreciation).

---
32. Hardcoded Messaging Doesn't Match Intent

- Fallback message "options available in Noida under 2 crore" appears even if user asked for "budget flexibility".
- Error messages generic ("No results found") don't hint at clarification needed.
- Sector chips always show "Sector N, Sector M+1, Sector M+2" regardless of whether they're actually available.

---
33. User Type Segmentation is Non-Existent

Current state: One LLM voice for:
- 25-year-old first-time buyer (wants hand-holding, simple language).
- 45-year-old investor (wants ROI, appreciation %, tax benefits).
- Relocating family (wants schools, parks, commute).
- Luxury buyer (wants exclusivity, finishes, amenities).

Result: None of them feel spoken to. All get the same generic "here are projects" response.

Fix needed:
- Detect persona early: "Are you buying for self-use or investment?"
- Tailor copy: 1st-timer → explain possession timelines. Investor → lead with ROI.
- Adapt complexity: Family → simple language. Investor → financial metrics.

---
34. Confidence Claims Without Sourcing

- "Confidence: Highly Reliable" hardcoded in IntelligenceTab (it's elite-X data).
- "Score: 88" shows without explaining what it measures (price positioning? builder strength? macro?).
- "Tier: Strong Buy" appears without stating why.

Buyer skepticism: "How do you know this?"

---
35. Missing Edge Case Copy

- No messaging for "we don't have data on this sector yet" → falls back to empty results.
- No messaging for "project matches but outside budget" → silence.
- No messaging for "RERA status unclear" → shows anyway.

---
36. Mobile UX Tone Issues

- Chat bubbles truncate long sentences mid-word on mobile (no soft-wrap logic in MessageBubble).
- Response blocks stack weirdly on small screens (responsive design exists but tone/spacing breaks readability).
- Sector advisory table on mobile = unreadable, no fallback to card view.

---
37. Call-to-Action Copy is Weak

- "View Details" button appears on projects not available in builder's inventory (builder registration incomplete).
- "Schedule Site Visit" doesn't hint at response time SLA.
- "Save Property" succeeds silently (no toast) — user unsure if it worked.

---
38. Contradictory Messaging

- Prompt says "use only injected data, don't fabricate" but IntelligenceTab shows Elite-X facts as fallback.
- Builder can see "This is your property" (MyBuilderDashboard) but can't edit inventory (feature unfinished).
- Admin sees "2 new leads" but clicking shows 0 (leads table broken).

---
Edge Cases That Will Break Testing

39. Ambiguous Sector Queries

- "Show me Sector 10" (3 matches: Noida, GN West, GN East) → should ask, returns empty (P0 #5).
- "Sector 10, Greater Noida" (still ambiguous if multiple projects in same sector) → no clarification.
- "Sector" (typo, matches nothing) → silent empty results.

---
40. Budget Edge Cases

- Budget = 0 (user testing) → division by zero risk in EMI calculations.
- Budget > 10 Cr (luxury) → no luxury-specific filters, returns same results.
- Budget "under 1 Cr" + "3 BHK" → 0 results (valid, but should say "no affordable 3BHK" not silence).

---
41. Project Lifecycle Edge Cases

- Project launched 1 hour ago (not indexed yet) → user can't find it.
- Project delisted but cached in browser → click → 404.
- Project status flipped mid-conversation (was "UC", now "RTM") → old messages show stale status.

---
42. Concurrent Mutations

- User saves same project twice in quick succession → race condition, saved_properties duplicates (no unique constraint).
- Admin + Builder both edit same lead simultaneously → last-write-wins, no conflict resolution.

---
43. Image Fallback Cascade

- hero_image_url broken → falls back to images[0] → also broken → no fallback → renders /placeholder.png (good). But chat carousel breaks silently (no onError).

---
44. Session Timeout Edge Cases

- User mid-chat, session expires → refresh → chat history loads but session ownership check fails → shows "no sessions".
- Guest token expires → user can view saved properties but can't save new ones (confusing).

---
45. Builder Flow is Unfinished

- Builder can register, but onboarding doesn't issue login credentials.
- Builder sees leads in API but no UI to respond/manage them.
- Builder theme/branding endpoints exist but no UI to set them.

---
REVISED PLAN (Phases 1-5, Now with Priority)

Phase 1: Security + Correctness Hotfixes (3 days)

1. IDOR fixes (P0 #9): scope leads/news by builder_id.
2. Fail-open admin (P0 #3): require ADMIN_USER_IDS non-empty, deny if missing.
3. Sector disambiguation wire (P0 #2): assign sectorDisambiguation and short-circuit.
4. Enum case fixes (P0 #5): 'ready_to_move', 'metro'/'road'/'expressway'.
5. Groq error catch (P0 #7): wrap in try/catch.
6. Logo upload limit (P0 #10): express.json({ limit: '5mb' }).
7. Rate limit (P0 #21): add checkRateLimit to public POSTs.
8. Migrations baseline (P0 #14): prisma migrate diff --from-empty > baseline.sql.

---
Phase 2: Kill Fabrication + Guardrails (2 days)

1. IntelligenceTab null-states (P0 #3, P1 #16): replace Elite-X defaults with "Data unavailable" UI, fetch from DB.
2. LocationTab hardcoding (P0 #4): source POIs from connectivity table or hide.
3. Output guardrail pre-stream (P0 #15): move RERA check before streaming, reject/redact.
4. Builder onboarding (P0 #12): issue magic link, set user_id.

---
Phase 3: Data Consistency + Normalization (2 days)

1. Sector/City canonicalization: seed script + ingest layer enforce Sector N format, controlled city vocab.
2. Backfill images: migrate stale hero_image_url to project_images where available.
3. Price label: derive from min/max, stop storing free-text.
4. IFMS unit verification: clarify intent (absolute vs per-sqft).

---
Phase 4: DB-Driven Config + Smart Chips (3 days)

1. Chip options from DB: getAllSectorsOverview, getPriceBuckets → derive chips live.
2. Blocked builders table: move from prompt hardcode to legal_flags lookup.
3. Model names config: centralize in env/constants.
4. Magic numbers module: EMI rate, thresholds, token limits.
5. City-scoped aggregations: key by city+sector, not just sector.

---
Phase 5: Testing + Cleanup (3 days)

1. Test dedup (P2 #28): keep intent-extraction.test.ts (assertive), port routing-validation.ts unique cases, delete scripts.
2. Component integration tests: MessageBubble image fallback, ProjectDetail tab switching, chip rendering.
3. Discovery filter tests: budget range, sector match, nearby expansion.
4. Auth tests: IDOR fix, fail-open admin, rate limit.
5. Code dedup:
  - Extract usePreferredImages hook (5 components).
  - Consolidate price formatters.
  - Extract useSaveProject hook.
  - Centralize status enums.
6. Cleanup: delete elitex_website_downloader/, old files, test scripts, litter.
7. CI setup: npm test root script → fan out frontend + backend tests.

---
Production Readiness Checklist

Must-haves:
- [ ] IDOR fixed + authz tested.
- [ ] Guardrail pre-stream (RERA).
- [ ] Sector disambiguation wired + tested.
- [ ] Data not fabricated (IntelligenceTab, LocationTab).
- [ ] Migrations baseline + fresh DB can build.
- [ ] Sentry or equivalent error tracking.
- [ ] Rate limiting on public endpoints.
- [ ] No silent failures (every error → user feedback).

Nice-haves (ship after MVP):
- [ ] Persona-aware messaging.
- [ ] Builder dashboard UI.
- [ ] Per-city expansion.

---
Questions for You

1. Phase order: Security hotfixes first (Day 1-3), or do you want sector disambiguation + fabrication killed simultaneously?
2. Sentry vs DIY: Self-hosted error logging (Sentry) or webhook to a Slack channel?
3. Persona segmentation: MVP with generic messaging, or iterate messaging as you scale (post-launch)?
4. Builder dashboard: Finish now (API → UI), or gate behind feature flag for v1.1?
5. Data backfill: Run migration script on launch, or one-time manual cleanup?
