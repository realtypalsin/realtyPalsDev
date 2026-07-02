# RealtyPals — Production Readiness Audit
Branch: `feat/backend-consolidation` · Build: ✅ backend tsc clean, ✅ frontend tsc clean, ✅ `next build` 0 errors (203 lint warnings)

---

## Critical

### C1. "Request a callback" and "Schedule a site visit" are broken — wrong URL
- **Location:** `frontend/components/DiscoveryContent.tsx:1400` → `fetch(`${API_BASE}/callback`)`; `frontend/components/SiteVisitScheduler.tsx:58` same pattern.
- **Root cause:** Backend mounts leads at `/api/v1/leads` (`backend/src/index.ts:89`), route is `/callback` (`backend/src/routes/leads.ts:41`) → real path `/api/v1/leads/callback`. Frontend omits the `/leads` segment.
- **Impact:** Every callback request and site-visit booking 404s. Silent lead loss — a core conversion action is completely dead.
- **Fix:** Prepend `/leads` to both URLs.

### C2. Several components fetch relative paths that never reach the Express backend
- **Location:** `CommuteCalculator.tsx:46`, `MarketComparison.tsx:47`, `DocumentQA.tsx:54,81`, `BuilderReputationCard.tsx:63`, `lib/waqi.ts:18`, `DiscoveryContent.tsx:266` (voice transcription), `app/property/[slug]/page.tsx:20`.
- **Root cause:** These call `fetch('/api/v1/...')` (same-origin, hits Next.js) instead of `fetch(`${API_BASE}/...`)`. Confirmed no Next.js rewrite exists (`next.config.js` has no `rewrites()`), and the old Next.js API routes at those paths were deleted in the T8 commit. Backend does mount `/api/v1/commute`, `/api/v1/documents`, `/api/v1/market-comparison` correctly — the bug is purely the frontend not prefixing with the backend origin.
- **Impact:** Commute calculator, market comparison, document Q&A, builder reputation card, AQI display, voice-to-text, and the standalone `/property/[slug]` page all 404 in any deployment where frontend and backend are different origins (which consolidation explicitly moved to). The `DiscoveryContent.tsx:266` case fails inside an empty catch block, so voice input silently does nothing.
- **Fix:** Route all seven call sites through the shared `API_BASE` client.

### C3. Clarification chip UI is dead — backend never emits the `clarification` SSE event
- **Location:** `backend/src/routes/chat.ts:522` streams clarification text via a plain `send('token', {token: fullText})`. Frontend still has a live handler for a dedicated `clarification` event with `options` at `DiscoveryContent.tsx:727-740`, and `backend-api.ts:82` still declares the event type.
- **Root cause:** Refactor moved clarification text into the normal token stream but didn't remove/replace the frontend chip-rendering path, and didn't add back a structured event.
- **Impact:** Every clarification question (e.g. "buying to live in or invest?", disambiguation between builder/project) now renders as plain prose instead of tappable chips. This is a live UX regression, not just latent risk — verified against current `chat.ts` and `DiscoveryContent.tsx`.
- **Fix:** Either restore a `send('clarification', {question, options})` event in chat.ts alongside/instead of the token stream, or remove the now-dead chip-handling code from the frontend if plain-text clarification is the intended design — confirm which with the user before choosing.

### C4. `/value-estimator` page calls three backend routes that don't exist
- **Location:** `frontend/app/value-estimator/page.tsx:150,166,251` → `${API_BASE}/sectors`, `${API_BASE}/properties/:id`, `${API_BASE}/value-check`. None of these match any mounted route in `backend/src/index.ts` (confirmed against the full route list).
- **Impact:** Entire page is non-functional — orphaned from an earlier architecture.
- **Fix:** Either wire it to real endpoints or remove the page/nav entry if it's not part of the current product surface.

---

## High

### H1. Admin project delete doesn't check response status before updating UI
- **Location:** `frontend/app/admin/projects/page.tsx` delete handler.
- **Root cause:** No `res.ok` check after the delete `fetch` — the row is removed from local state unconditionally.
- **Impact:** A failed delete (403 from an expired admin session, 500 from a DB constraint) shows the admin a project as deleted when it still exists in the DB — a trust/data-integrity issue for the person managing listings.
- **Fix:** Only remove from state on `res.ok`; show an error toast otherwise.

### H2. Admin list pages have no error handling — infinite spinner on failure
- **Location:** `app/admin/projects/page.tsx` `load()`, `app/admin/projects/[id]/page.tsx` `loadProject()` (3 parallel fetches, no `res.ok` checks), `app/admin/builders/page.tsx` list fetch (no `.catch`, no builder-delete feature at all).
- **Impact:** Any transient network failure or 401 leaves the admin looking at a permanent loading spinner with no way to know something failed.
- **Fix:** Wrap in try/catch, check `res.ok`, show an error state.

### H3. `documents.ts` read endpoints are unauthenticated
- **Location:** `backend/src/routes/documents.ts:32` (`POST /ask`, IP-rate-limited only) and `:90` (`GET /`, no auth at all).
- **Root cause:** `POST /` (upload) correctly requires admin; the read paths were not given the same gate.
- **Impact:** Anyone with a project slug can list all uploaded documents and run unlimited Q&A against them — inconsistent with the write path's access control, and a real exposure if documents contain unpublished legal/RERA content.
- **Fix:** Apply `requireAdmin` (or a scoped read policy, if documents are meant to be buyer-facing) to both routes — clarify intended visibility first.

### H4. Divergent confidence scoring — two implementations can disagree
- **Location:** `backend/src/lib/discovery/confidence.ts` (`computeConfidence`, 0.30–0.95, drives clarification text) vs. `backend/src/lib/discovery/conversationEngine.ts:81-89` (`computeConfidenceLevel`, coarse HIGH/MEDIUM/LOW, drives the UI confidence chip).
- **Impact:** For the same turn, the confidence shown to the user can contradict the confidence that actually decided whether to ask a clarifying question — undermines the CLAUDE.md rule against presenting inconsistent/fake confidence signals.
- **Fix:** Single source of truth; derive the UI-facing level from the same numeric score used for the clarification decision.

---

## Medium

### M1. ContextRibbon reads fields that no longer exist on `Intent`
- **Location:** `frontend/components/chat/ContextRibbon.tsx:16` destructures `propertyType` and `status` — `backend/src/lib/discovery/types.ts` has no such fields (actual: `possession`, `builderName`, `projectNames`, `riskProfile`, `purpose`, `lifestyleKeywords`).
- **Impact:** Degrades silently (no crash) but the ribbon never surfaces active builder-name/possession/lifestyle filters, so users can't see or clear them. Likely fallout from the DNA-field rename in the presentation-layer work.
- **Fix:** Update ContextRibbon to read the current field names.

### M2. `getSessions` response shape mismatch
- **Location:** frontend expects `{title, chat_phase, message_count, last_active}` (`backend-api.ts:169-172`); backend's `formatSessionList` returns `{id, label, last_active}` (`chat.ts:848-856`).
- **Impact:** Sidebar session metadata (title, phase, message count) renders as `undefined`.
- **Fix:** Align one side to the other — recommend backend adds the missing fields since the sidebar UI depends on them.

### M3. `PropertyDetailView.tsx` has no image-fallback handling
- **Location:** All three `<Image>` usages (floor-plan, gallery, fullscreen modal) lack the `onError`→fallback pattern that `ProjectCard.tsx` and `PropertyCard.tsx` already implement correctly.
- **Impact:** A broken/404 image shows the browser's native broken-image icon instead of the app's fallback icon — inconsistent polish, not a functional break.
- **Fix:** Apply the same `imgFailed` pattern used elsewhere.

### M4. SSE stream not aborted on "New Chat" reset
- **Location:** `performReset` in `DiscoveryContent.tsx:373-413`.
- **Impact:** If a user starts a new chat while a previous response is still streaming, the stale response can land in the freshly-reset conversation.
- **Fix:** Call the existing `AbortController` before resetting state.

### M5. `Date.now()` called directly in render inside `SessionItem.tsx`
- **Location:** `frontend/components/Sidebar/SessionItem.tsx:7,164` (`timeAgo()`).
- **Impact:** Rendered on nearly every page via the sidebar — causes a hydration mismatch and a visible flip of the "time ago" label right after hydration.
- **Fix:** Compute in `useEffect`/`useState`, not directly during render.

### M6. Admin image upload lacks validation present elsewhere
- **Location:** `backend/src/routes/admin.ts:1044-1071` (`POST /upload-image`) — no zod validation on `slug` (interpolated into storage path), no MIME allowlist, unlike `documents.ts` which has `ALLOWED_MIME`.
- **Impact:** Lower exploitability since it's behind `requireAdmin`, but inconsistent hardening and a path-interpolation smell.
- **Fix:** Validate slug format and add a MIME allowlist to match `documents.ts`.

### M7. Session-create race can silently fork a conversation
- **Location:** `chat.ts:720-760` — concurrent no-`sessionId` requests each mint a new UUID and create separate sessions (e.g. double-submit from a slow network).
- **Impact:** Rare but real — user sees a duplicated/forked conversation. `last_projects` is also overwritten (not merged) on concurrent updates to the same session, so simultaneous tabs can race.
- **Fix:** Debounce/idempotency-key the first message, or dedupe on the client before the request fires.

### M8. `ComparisonTable.tsx` has a latent crash if called with <2 projects
- **Location:** `ComparisonTable.tsx:526` — `isMulti = projects.length > 2` branch unconditionally dereferences `projects[0]`/`projects[1]`.
- **Impact:** Not reachable via the current UI (gated at `>= 2` upstream) but crashes if any future caller skips that gate.
- **Fix:** Add an explicit guard/early-return for `< 2` projects.

---

## Low

- **`needsPurposeClarification` hardcoded to `false`** in `chat.ts:402` — dead code from an earlier iteration, never gates anything now. Remove.
- **Dead commented-out Groq/Claude round-robin block** in `chat.ts:527-555`, referencing an unused `streamWithClaude` import also dead in `ai/intent.ts:117-129`. Remove.
- **`(prisma as any).paymentPlan` / `.costSheet` casts** in `projects.ts:161,187` — verified both models exist in `frontend/prisma/schema.prisma` and the generated client resolves them correctly at runtime (confirmed via a direct Node require check), so these routes work; the `as any` is unnecessary leftover typing debt, not a functional bug as initially suspected. Remove the cast.
- **Duplicated session-ownership check logic** in `chat.ts` `PATCH/DELETE /session/:id` — correct today, but hand-rolled per-route instead of a shared `assertSessionOwnership()` helper; a future route could forget it (IDOR risk if copied wrong).
- **Frontend re-derives intent stage** (`DiscoveryContent.tsx:685-687`) duplicating logic the backend's `conversationEngine.ts` already resolves into `ui_state`. No bug today, but will silently drift if backend states change.
- **Missing `React.Fragment key=`** in `app/admin/builders/page.tsx:239` — shorthand fragment in a `.map()` has no key, React will warn.
- **`ThemeToggle.tsx`** applies dark mode post-mount → brief light-mode flash on load (FOUC).
- **Missing startup validation for Supabase/Upstash env vars** — `index.ts:26-38` only hard-fails on `ADMIN_PASSWORD`/`DATABASE_URL`/AI key; missing Supabase env silently downgrades all users to unauthenticated (`verifyUser()` returns `null`, logged but non-fatal) instead of failing loudly at boot.
- **No P2002 (unique constraint) handling anywhere** in the codebase, only P2025 (not-found) is guarded. Low risk today since no code path relies on catching duplicate-create races.
- **Builder/project entity classification has no real validation layer** — `isGenericName()` in `discovery/projects.ts:367-382` filters obviously-generic phrases but doesn't cross-check names against real builder/sector data. A misclassified builder name (e.g. "Godrej" landing in `projectNames` instead of `builderName`) triggers an ILIKE substring search across all matching projects with a hardcoded `matchScore: 100` and `matchReason: 'Directly requested'` — presented as a confident direct match rather than triggering clarification. This is the one finding that directly touches the CLAUDE.md-mandated RERA-style entity validation requirement; recommend addressing before the other Low items.
- **Confidence scores in `confidence.ts`** are fixed constants selected by boolean signal count (0.95/0.90/0.88/0.72/0.60/0.30), not statistically derived — currently only feeds internal logging, so low risk, but would violate the "no fake confidence scores" rule if ever surfaced to users.
- **ESLint: 208 warnings frontend / 8 backend** — overwhelmingly `no-unused-vars` and `no-explicit-any`, concentrated in `ProjectDetailPanel.tsx`, `DiscoveryContent.tsx`, `AmenityIcon.tsx`. No errors, but worth a cleanup pass.

---

## Needs Verification

- Whether a free-text clarification reply (user types "Sector 150" instead of tapping a chip) can cause the same clarification question to repeat if LLM re-extraction fails mid-turn — plausible from reading `mergeIntent`'s merge-on-defined-fields behavior, but not reproduced in this pass. Recommend a manual regression test.
- Whether `backend-api.ts`'s consumer-facing calls intentionally use Bearer-token auth while all admin fetches use `credentials: 'include'` cookie auth — looks architecturally deliberate (two different user classes) but wasn't confirmed against an explicit design doc.
- `saved.ts:36` casts `s.project` to `any` for `toProjectCard` — shape compatibility with `projectRepository.ts` wasn't traced.

---

## Bottom line

**Not production-ready as-is.** Build and typecheck are clean, but four Critical, user-facing regressions were found and confirmed by reading current code (not just the prior planning memos, which were independently verified as partially stale): two broken lead-capture paths (C1), seven components hitting the wrong origin post-consolidation (C2), a dead clarification-chip UX regression (C3), and one fully orphaned page (C4). These are the kind of bugs that are invisible in `tsc`/`next build` because they're runtime string mismatches, not type errors — they'd only surface in manual click-through testing or with the app pointed at a genuinely separate frontend/backend deployment.

Fix C1–C4 and H1–H3 before shipping; the Medium/Low items are real but non-blocking. Recommend a manual click-through of: callback/site-visit forms, commute calculator, document Q&A, market comparison, standalone property page, and every clarification prompt in a fresh chat — these are exactly the paths static analysis can't catch and where this audit found real breaks.
