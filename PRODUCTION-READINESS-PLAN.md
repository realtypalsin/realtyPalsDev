# RealtyPals — Production Readiness Plan (Noida Pilot)

> Audit date: 2026-07-10. Branch: `Admin-BuilderRegisterPanel`.
> This document is implementation-ready: every item has file:line + exact fix. Work top-down — phases are ordered by launch risk.
> Product rules that govern every fix: DB is the ONLY source of truth (never invent prices/listings/RERA data); pilot = Noida + Greater Noida but architecture must scale to other cities; chatbot must never crash on any input; UI/UX design is finalized — functional fixes only, no restyling.

---

## PHASE 0 — LAUNCH BLOCKERS (fix before any demo)

### 0.1 [CRITICAL] LLM-fabricated registry prices served as fact
- **File:** `backend/src/routes/registryPrices.ts:76-91`
- **Problem:** Route prompts Groq to *generate* circle-rate/registry price data from model memory ("If data is unavailable, use appropriate placeholder text"), caches it under `registry:${city}:${sector}`, and serves it to buyers as factual registry data. Direct violation of "never invent prices."
- **Fix:** Remove the Groq generation path entirely. If a real circle-rate DB table exists, query it; if not, return `{ available: false, message: 'Registry price data for this sector is being verified. Coming soon.' }`. Do NOT LLM-generate any price figure. Frontend consumer must render the unavailable state as `--` / "Coming soon".

### 0.2 [CRITICAL] XSS via unsanitized LLM HTML
- **File:** `frontend/components/response/ResponseBlockRenderer.tsx:214`
- **Problem:** `rehypePlugins={[rehypeRaw]}` with no sanitizer on LLM output. Raw HTML in model output (`<img src=x onerror=...>`) executes — prompt-injection / stored XSS vector via ingested project/builder data or echoed user text.
- **Fix:** Add `rehype-sanitize` after `rehypeRaw` with a custom schema extending the default: allow only `realty-chart` and `realty-box` elements plus their specific data attributes (inspect `RealtyChart.tsx` / `RealtyBox.tsx` for the attribute list). Everything else stripped. Verify charts/boxes still render after adding the sanitizer.

### 0.3 [CRITICAL] Unprotected paid-LLM public route (cost drain)
- **File:** `backend/src/routes/registryPrices.ts:1-91`
- **Problem:** No auth, no rate limit; cache key is attacker-controlled (`sector` string) so iterating sector strings bypasses cache and drains the Groq budget.
- **Fix:** Largely resolved by 0.1 (removing the LLM call). Additionally add per-IP `checkRateLimit` (reuse the helper used in `chat.ts:266-274`) and validate `sector` against known sectors from the DB before any processing.

### 0.4 [HIGH] Amenities/connectivity sections silently broken (field-name mismatch)
- **Files:** `backend/src/routes/projects.ts:143`, `frontend/types/project.ts:202-203`, `frontend/components/property-detail/OverviewTab.tsx:664,667,1011`, `PricingTab.tsx:511`, `ResidencesTab.tsx:521,549`
- **Problem:** Backend detail response spreads raw Prisma relations (`amenities`, `connectivity`) but the frontend `ProjectDetail` type declares `all_amenities` / `all_connectivity` — which the backend NEVER produces. Result: connectivity section in OverviewTab is always hidden (`hasConnectivity` gate at :1011 always false), amenity strips in PricingTab/ResidencesTab always empty, OverviewTab amenities only works by accident via an `as any` fallback.
- **Fix (backend, one line):** In `backend/src/routes/projects.ts:143`, add mapped keys to the response:
  ```ts
  res.json({ project: { ...project, builder_detail: project.builder, dna: publicDna, recommendation_score, reportUrl,
    all_amenities: project.amenities, all_connectivity: project.connectivity } })
  ```
- **Then (frontend):** Remove the `as any` fallbacks at `OverviewTab.tsx:664` (`detail?.all_amenities ?? []` suffices) and `LocationTab.tsx:55` (use `detail?.all_connectivity ?? []`). Verify the connectivity section now appears for a project with connectivity rows in DB.

### 0.5 [HIGH] Stale "possession by 2025" placeholder (it's mid-2026)
- **File:** `frontend/components/DiscoveryContent.tsx:1106`
- **Fix:** Replace `'Properties with possession by 2025...'` with `'Ready-to-move or possession by 2027...'`

### 0.6 [HIGH] Stuck-forever spinner on clean SSE close
- **Files:** `frontend/lib/backend-api.ts:132-153`, `frontend/components/DiscoveryContent.tsx:880-899`
- **Problem:** If the SSE stream closes without emitting `token`/`error`/`done` (backend crash after headers, proxy timeout), the AI placeholder stays at `content:''` with `streamingPhase:'extracting'` → "Understanding your request…" spinner forever, no Stop, no retry.
- **Fix:** In the `onDone` handler in DiscoveryContent, if the streaming message still has empty content and was not user-aborted, replace it with an error message: `"I couldn't complete that. Please resend your message — your conversation is saved."` (matches copy in 3.6).

### 0.7 [HIGH] Unguarded SSE `properties` event crashes stream handler
- **File:** `frontend/components/DiscoveryContent.tsx:771-774`
- **Problem:** `const exact = event.exactResults as unknown as ProjectCardType[]` then `.length` with no null guard — a `properties` event missing either array throws, killing the handler; bubble stuck on skeleton.
- **Fix:** `const exact = (event.exactResults ?? []) as unknown as ProjectCardType[]` and same for `nearby`.

### 0.8 [HIGH] Unvalidated chip payloads crash turn processing
- **File:** `backend/src/routes/chat.ts:250, 310-312`
- **Problem:** `action.payload.text as string` and `action.payload.patch as Record<string, unknown>` are blind casts on `z.record(z.unknown())`. Non-string `text` reaches `message.slice(0,60)` at :807 and throws (turn lost, session not persisted); missing `patch` throws in `mergeIntent`.
- **Fix:** Make `BodySchema`'s action a zod discriminated union on `actionType`: `TEXT_MESSAGE` → `{ text: z.string().min(1).max(2000) }`; `INTENT_PATCH` → `{ patch: z.record(z.unknown()) }`; `REMOVE_FILTER` → `{ field: z.string() }`; others → passthrough record. Return 400 on parse failure.

### 0.9 [HIGH] Session route handlers without try/catch (unhandled rejections)
- **File:** `backend/src/routes/chat.ts:1027-1110, 1113-1152, 1155-1188, 1192-1203`
- **Problem:** GET `/session`, PATCH/DELETE `/session/:id`, DELETE `/intent` — any Prisma error becomes an unhandled promise rejection; request hangs, process can die. Also `last_projects` JSON cast to `ScoredProject[]` unchecked at :355-357 and :962 — non-array value throws.
- **Fix:** (a) Add an `asyncHandler(fn)` wrapper (try/catch → `res.status(500).json({ error: 'Internal error' })`) and apply to these four handlers, or add a global Express error middleware that handles async. (b) Guard both `last_projects` reads: `Array.isArray(sessionData.last_projects) ? sessionData.last_projects : null`.

### 0.10 [HIGH] Pin exact out-of-scope-city wording (Gurgaon demo question is a dice roll)
- **File:** `backend/src/lib/ai/prompts/base.ts:82` (Rule I)
- **Fix:** Replace Rule I with required verbatim response:
  `**I. OUT-OF-SCOPE CITY** — Delhi, Gurgaon, Mumbai, etc. → say exactly: "Right now we cover Noida and Greater Noida in depth — verified projects, RERA data, and builder records. We're expanding to [city] soon. I can still help with general questions on home-buying, RERA, loans, or taxes for [city] — or show you what a similar budget gets in Noida." Then stop; do not invent [city] listings.`

---

## PHASE 1 — ROBUSTNESS (chatbot must never break)

### 1.1 [MEDIUM] Unhandled chip actionType fall-through
- **File:** `frontend/components/DiscoveryContent.tsx:939-993`
- **Problem:** CALCULATE_EMI/BOOK_VISIT chips with `payload.mode !== 'single'`, and COMPARE_PROPERTIES `mode:'direct'` with <2 resolvable slugs, fall through to a raw POST of the action type to `/api/v1/chat` → orphan spinner bubble resolving into a generic reply.
- **Fix:** Exhaustive `switch (action.actionType)` in `handleChipAction`; route unmatched EMI/VISIT modes to their picker/tool UI, unmatched COMPARE to the compare picker. Add `default:` exhaustiveness check (`const _: never = action.actionType`).

### 1.2 [MEDIUM] Stale shortlist in compare chips
- **File:** `frontend/components/DiscoveryContent.tsx:942,993`
- **Fix:** `handleChipAction` dep array uses `lastShortlist.length` — change to `lastShortlist`.

### 1.3 [MEDIUM] Signed-out user: all inputs silently dead
- **File:** `frontend/components/DiscoveryContent.tsx:701`
- **Problem:** `!userId && !guestToken` → `dispatchAction` returns silently; send button + every chip appear broken.
- **Fix:** Show a toast/banner: "Sign in or continue as guest to start chatting" with link to `/auth`. (Guest token should normally exist — investigate why it can be absent and fix root cause if it's a init-order bug.)

### 1.4 [MEDIUM] Chips not disabled while streaming
- **Files:** `frontend/components/chat/SuggestionChip.tsx`, `MessageBubble.tsx:115` (chip row), DiscoveryContent (isSubmitting)
- **Fix:** Thread `disabled={isSubmitting}` to SuggestionChip; apply `opacity-50 pointer-events-none` when disabled. No visual redesign.

### 1.5 [MEDIUM] Guest session routes lack rate limit
- **File:** `backend/src/routes/chat.ts:970, 1027`
- **Fix:** Apply per-IP `checkRateLimit` (same helper as POST /chat) to GET `/session/list` and GET `/session`.

### 1.6 [MEDIUM] Unbounded Prisma queries
- **File:** `backend/src/lib/discovery/projects.ts:509` (Branch 2, no `take`, `{}` where possible), `:445` (name contains), `:524` (sector fallback), `:595` (nearby-sector expansion)
- **Fix:** Add `take: 200` to Branch 2 (pre-score cap) and require at least one hard filter or city before running it; `take: 50` on the other three; in Branch 1 require extracted name length ≥ 3.

### 1.7 [MEDIUM] Output guardrail observe-only
- **File:** `backend/src/routes/chat.ts:739-753`
- **Problem:** `outputGuardrail` runs after the full response streamed; violations only logged.
- **Fix (minimum viable for pilot):** On violation, flag the persisted message (`guardrail_violation: true` in session data) and fire a PostHog event `guardrail_violation` so the team reviews them daily. Full buffered-blocking is post-pilot.

### 1.8 [LOW] Misc crash-hygiene
- `frontend/components/chat/MessageBubble.tsx:29-30` — `typeof intent.budgetMax === 'number'` passes `NaN` → "under ₹NaNCr". Use `Number.isFinite`.
- `MessageBubble.tsx:733` — `p.price_range_label · p.sector` unguarded → "undefined · undefined". Fallback each to `''` and skip separator when either missing.
- `backend/src/routes/chat.ts:631,636,651` — tool-failure fallbacks tell model to "answer from general knowledge". For commute (numbers read as facts): change fallback to "Tell the user commute data is temporarily unavailable" instead.

### 1.9 [MEDIUM] Mobile overflow (360px)
- `frontend/components/chat/SuggestionChip.tsx:34-45` — `whitespace-nowrap` + long labels ("Compare Godrej Woods vs others") force horizontal page overflow. Add `max-w-full` on the button and `truncate min-w-0` on the label span.
- `frontend/components/chat/MessageBubble.tsx:294` — markdown tables in prose path have no `overflow-x-auto` wrapper. Add custom `table` renderer wrapping in `<div className="overflow-x-auto">` (copy the pattern from ResponseBlockRenderer's WhyWinsCard at :129).

---

## PHASE 2 — SCALE-OUT READINESS (crack Noida → expand cleanly)

Goal: one config change (or DB rows) adds a new city. No code hunt.

### 2.1 [HIGH] Centralize city configuration
Create `backend/src/lib/config/cities.ts`:
```ts
export const SUPPORTED_CITIES = ['Noida', 'Greater Noida', 'Greater Noida West'] as const
export const DEFAULT_CITY = 'Noida'
export const PILOT_SCOPE_LABEL = 'Noida & Greater Noida'
```
(Post-pilot: back with a DB table. For now a single module is enough.)
Then replace every hardcoded reference:
- `backend/src/lib/discovery/normalize.ts:7` — `VALID_CITIES` → import from config.
- `backend/src/routes/chat.ts:413, 965` — `getChipInventory('Noida')` → `getChipInventory(intent.city ?? DEFAULT_CITY)`.
- `backend/src/routes/chat.ts:635` — `args.city ?? 'Noida'` → `?? DEFAULT_CITY`.
- `backend/src/routes/chat.ts:287` — guardrail refusal text: build from `PILOT_SCOPE_LABEL`.
- `backend/src/routes/registryPrices.ts:15` — `city.default('Noida')` → `DEFAULT_CITY`.
- `backend/src/lib/discovery/projects.ts:136` — `cityTerms` → derive from `SUPPORTED_CITIES`.

### 2.2 [MEDIUM] Prompt templating for city/state
- `backend/src/lib/ai/prompts/base.ts:25, 82, 229` — "Noida and Greater Noida" scope + UP stamp-duty rules hardwired. Make the prompt builder accept `{ cityScope, stateFiscalRules }` params sourced from config. Keep current Noida/UP values as the config entries — behavior unchanged for pilot.
- `backend/src/lib/ai/openai.ts:112, 121, 126, 181` — tool descriptions mention "Noida/Greater Noida sector", "UP/Noida stamp duty" → interpolate from config.
- `backend/src/lib/ai/prompts/intent-extraction.ts:55-128` and `blocks.ts:302, 361` — Noida-specific few-shots/advisory. For pilot, leave content as-is but move behind a `getCityPromptPack(city)` function so a new city means adding a pack, not editing core prompts.

---

## PHASE 3 — COPY & POSITIONING (buyers + builders)

All replacements verbatim — implement exactly.

### 3.1 Landing page (`frontend/app/page.tsx`)
- `:69` headline → **"Buy the right home in Noida. Not the one someone's paid to sell you."**
- `:77` sub → **"Research RERA-verified projects, compare builders and prices in ₹ Lakh/Cr, and get straight answers — no listings spam, no broker calls."**
- `:86` CTA `"Enter Discovery"` → **"Ask about a property →"**
- `:99` chips: `'Predictive ROI Models'` → **`'Honest Tradeoffs, Every Time'`** (ROI prediction violates no-fabricated-scores rule); `'RERA-Verified Intelligence'` → **`'RERA-Checked Data'`**. Keep `'Hyperlocal Noida Expertise'`.
- **Add builder footer strip** below feature chips, linking to `/builder-register`: **"Are you a builder? Showcase your RERA-registered projects to serious Noida buyers — verified profiles, qualified leads, zero spam. → List with RealtyPals"**

### 3.2 Auth (`frontend/app/auth/page.tsx`)
- `:126` → **"Unbiased property guidance for Noida & Greater Noida"**
- `:183` → **"Password (6+ characters)"**
- Add trust line under card: **"Free for buyers. We never sell your number to brokers."** (Verify operationally true before shipping.)

### 3.3 Chat welcome + empty state (`frontend/components/DiscoveryContent.tsx`)
- `:474` welcome → **"Hi, I'm RealtyPal — your advisor for Noida & Greater Noida. Ask me anything: budgets in ₹ Lakh/Cr, RERA status, builder track records, or which sector fits your family. I'll give you straight answers, tradeoffs included."**
- `:1268-1270` under "Buy Better." add sub-line: **"AI property advisor · Noida & Greater Noida"**
- `:820` error → **"I couldn't complete that. Please resend your message — your conversation is saved."**
- `:1329` long-convo → **"This chat is getting long — starting a fresh one keeps my answers sharp. Your saved properties carry over."** (only if carry-over is true — verify; otherwise drop last sentence)
- `:1190-1198` — hide the dead "Star / Coming soon" menu item entirely for pilot.

### 3.4 AI persona (`backend/src/lib/ai/prompts/base.ts`)
- `:25` → `"You are RealtyPal — a candid, expert AI real estate advisor for Noida and Greater Noida, India."` (drop unverifiable "India's most trusted")
- `:43` → `"Speak as a trusted senior advisor to a first-time or upgrade buyer — respectful, plain, never salesy."`

### 3.5 Builder funnel
- `frontend/components/BuilderRegistrationForm.tsx:153-155` → **"Showcase your projects to serious Noida & Greater Noida buyers. Verified builder profiles, direct qualified leads, no broker middle layer. Verification typically takes 2–3 business days."**
- `BuilderRegistrationForm.tsx:120` → **"Our verification team is reviewing your profile — expect a response within 2–3 business days at your registered email."**
- `frontend/app/get-listed/page.tsx:21` → **"Submit your project details. Our verification team reviews every listing against RERA records before it goes live — buyers only see verified projects."** (standardize "verification team" everywhere — remove "intelligence team"/"diligence team")
- Add 3 value bullets in BuilderRegistrationForm sidebar under the description (:155): **"• Buyers who've already shortlisted — not cold enquiries • Your RERA-verified profile, presented professionally • Leads with name, phone, and the exact project they asked about"**

### 3.6 Chips copy
- `backend/src/lib/discovery/conversationEngine.ts:182` — `'Configurations'` → **"BHK"** (buyer language, not builder jargon).

### 3.7 Misc
- `frontend/app/discover/page.tsx:101` — `Loading...` → **"Opening your advisor…"**
- `frontend/components/DiscoveryContent.tsx:1576` callback modal promises "within 2 hours" — verify ops can honor during pilot; else → **"We'll call the same business day."**

---

## PHASE 4 — PROJECT DETAIL CARD (DB-only truth, `--` for missing)

### 4.1 Type-safety cleanup (`as any` inventory — resolve each)
After fix 0.4, resolve remaining casts. Rule: if the field exists in the API response → add it to the type and drop the cast; if it doesn't → the UI must render `--`/hide, never fabricate.
- `OverviewTab.tsx:663` — `(d as any)?.marketing_claims`: `marketing_claims` IS in `ProjectCard` type; drop the cast, use `detail?.marketing_claims ?? d?.marketing_claims ?? []`.
- `OverviewTab.tsx:664` — fixed by 0.4.
- `LocationTab.tsx:55` — fixed by 0.4.
- `LocationTab.tsx:33`, `ProjectPricingTab.tsx:80` — `buildWhatsAppUrl(d as any, ...)`: widen `buildWhatsAppUrl` param type to accept `ProjectCard | ProjectDetail` instead of casting.
- `ProjectPricingTab.tsx:96,105,110,114,158` — `payment_plan`/`cost_sheet` ARE merged by `ProjectDetailPanel.tsx:317`. Formalize: add to `frontend/types/project.ts` an extended type `ProjectDetailWithPricing = ProjectDetail & { payment_plan: PaymentPlan | null; cost_sheet: CostSheet | null }` (define `PaymentPlan`/`CostSheet` interfaces matching the backend response at `backend/src/routes/projects.ts:157-236`), type the prop, drop all five casts.
- `IntelligenceTab.tsx:59,358,359` — `decision_profile.intelligence_data` is typed `any` in `DecisionProfilePublic`. Define an `IntelligenceData` interface with the actual keys used (`investment_insights`, `social_proof`, `transparency_checks_additions`, etc. — grep usages), type the field, drop casts.
- `PricingTab.tsx:498` — `other_charges as any[]`: type as `Array<{ label: string; amount: number }>` per cost-sheet schema.

### 4.2 Missing-data pass (every tab)
For each of the 8 tabs (`OverviewTab, LocationTab, IntelligenceTab, PricingTab, ProjectPricingTab, ResidencesTab, DocumentsTab, SocialProofAndTransparency`), verify per rendered field: null/undefined → renders `--` (inline stat) or the row/section is cleanly hidden (lists). Specifically verify:
- No `undefined`, `null`, `NaN`, `₹NaN`, `Invalid Date` ever reaches the DOM. Known patterns to check: `new Date(x).toLocaleDateString` when `x` invalid; `toLocaleString('en-IN')` on null; division for `/sqft` when area 0 (already guarded at ProjectPricingTab:91 — replicate the `> 0` guard pattern anywhere division occurs).
- Sections backed by intelligence tables (`dna`, `decision_profile`, `recommendation_profile`, `persona_profile`, `competitors`) — when null (project has no published intelligence), the section must show a single tasteful placeholder: **"Intelligence report in progress — we only publish verified analysis."** rather than an empty grid or invented content.
- Empty payment plan / cost sheet already have honest backend messages (`projects.ts:171, 197`) — ensure the tab surfaces those messages verbatim rather than a generic empty box.

### 4.3 Images
- Per-URL failure tracking exists (`ProjectCard.tsx:134` `markImageFailed`). Verify the same fallback logic is used in the detail-panel carousel (`ProjectDetailPanel.tsx:206+`): prefer `images[]` (hero/exterior first), treat legacy `hero_image_url` as last resort (stale for ~2/3 projects), and on total failure show the branded placeholder — never a broken-image icon.

---

## PHASE 5 — ANALYTICS & FEEDBACK (pilot measurement)

- **[HIGH] `message_sent` event** — in `handleChatSubmit` (DiscoveryContent): `track('message_sent', { session_id, turn })`. Currently only `chat_started` at turn 0 (:724) — blind on conversation depth otherwise.
- **[HIGH] `chip_clicked` event** — in `handleChipAction`: `track('chip_clicked', { chip_id: action.id, action_type: action.actionType, label: action.label })`. Backend already emits `analyticsId` (conversationEngine.ts:135) — use it.
- **[HIGH] Answer feedback 👍/👎** — add to AI message bubbles (MessageBubble footer, minimal icons consistent with existing action-icon row): `track('answer_feedback', { helpful: boolean, session_id })`. PostHog-only for pilot; no backend table needed.
- **[LOW] PII:** `auth/page.tsx:79` — remove raw email from `signup_completed` event props (`identifyUser` already carries it).
- **[MEDIUM] Ops check (no code):** leads land in `/admin/leads` — confirm the manual relay loop to builders before demoing "qualified leads".

---

## PHASE 6 — CHIPS: PREDICTIVE POLISH (already 80% there)

Current state (post-2026-07-09 commit `9c28df4`): max 4 chips, priority-ranked (critical clarifications → secondary), city-disambiguation chips, unified NotebookLM dark-surface style. Remaining refinements:
1. **Stage-aware prediction** (conversationEngine.ts): chip set should follow the buyer journey — after results shown, prioritize `Compare top 2`, `EMI for #1`, `Book visit`; after a single project discussed, prioritize `vs competitors`, `Payment plan`, `Locality report`. Verify each stage emits its most-likely-next action first (priority 1).
2. **Label quality:** every chip label ≤ 24 chars, action-verb-first, no jargon (see 3.6). Audit all `chip(...)` calls in conversationEngine.ts.
3. **Disabled state while streaming** (1.4) and **truncation at 360px** (1.9) make chips feel solid.
4. **Never show an empty chip row:** if 0 chips generated, hide the container entirely (verify MessageBubble:115 renders nothing when `chips.length === 0`).

---

## EXECUTION ORDER FOR IMPLEMENTING AGENT

1. Phase 0 (all 10 items) — blockers, each independently committable.
2. Phase 1 items 1.1-1.9 — robustness.
3. Phase 3 — copy (pure string replacements, fast).
4. Phase 4 — detail card type-safety + missing-data pass.
5. Phase 2 — city config centralization (mechanical refactor, do after functional fixes to avoid conflicts).
6. Phase 5 — analytics.
7. Phase 6 — chip polish.

After each phase: `npm run build` in frontend + `tsc --noEmit` in backend must pass. Do not restyle any component — functional and copy changes only. Commit per phase with descriptive messages.

## VERIFICATION CHECKLIST (end-to-end, after all phases)
- [ ] "Sector 10" → city disambiguation chips → BHK question → results (progressive flow)
- [ ] "flats in Gurgaon" → exact pinned out-of-scope response, no invented listings
- [ ] Gibberish / emoji / 2000-char message / Hinglish → graceful reply, no crash
- [ ] Kill backend mid-stream → error bubble with retry, no infinite spinner
- [ ] Project with no intelligence data → detail card shows `--`/"in progress" placeholders, nothing invented
- [ ] Project with connectivity + amenities in DB → both sections visible in detail card
- [ ] Chips: max 4, disabled while streaming, no overflow at 360px, every tap does something visible
- [ ] Registry prices endpoint returns `available:false` when no DB data (no LLM figures)
- [ ] `<img src=x onerror=alert(1)>` injected into a chat reply renders inert
- [ ] PostHog: message_sent, chip_clicked, answer_feedback events firing
