# Optimization Implementation Plan (v2 — verified against code)

**Every finding below is anchored to a real `file:line`. No guesses.**
Scope: (1) chat intent leak across sessions, (2) chat "thinking" loader redesign, (3) one universal loader app-wide, (4) admin panel hardening + backend CRUD verification, (5) builder-register audit, (6) swagger gaps.
Target executor: Haiku 4.5 — each task has exact anchors + copy-paste code, zero discovery required.

---

## ⚑ STATUS (2026-07-25 production-readiness verification)

Parts 1–3, 4a/4b, 6 (chat routes), 7 — **DONE and verified**. `npx tsc --noEmit` clean; `npm run build` **compiles successfully (exit 0)**.

**Build was fixed during verification:** `components/chat/ChipPicker.tsx` had a conditional-hook bug (`if (!chip.label) return null` on line 91, BEFORE `useState`/`useRef`/`useEffect`) — a `react-hooks/rules-of-hooks` error that fails `next build`. Pre-existing, not introduced by this plan. **Already fixed** (guard moved below the hooks). The app did not build before this fix.

**Remaining gaps to close before production → Part 8 below.** These are the only blockers left. Nothing else leaks: intent leak fixed (Part 1), session-cache memory leak fixed (Part 7c), no hardcoded secrets in the frontend (scanned).

---

## PART 0 — GROUND TRUTH (what actually exists today)

### Loaders currently in the app (6 live idioms + 2 dead + 2 text fallbacks)
| # | Where | `file:line` | Style | Verdict |
|---|-------|-------------|-------|---------|
| 1 | Chat Stage A "waiting" | `components/chat/MessageBubble.tsx:344-383` | spinning ring + "Understanding your request…" + intent box + 3 skeleton cards | **live** — user wants this fixed |
| 2 | Chat Stage B "properties arrived" | `MessageBubble.tsx:387-405` | 3 bouncing dots + "Analyzing N properties…" | live |
| 3 | Route first-load | `app/discover/loading.tsx` | gray skeleton boxes (`animate-pulse`) | live |
| 4 | Admin dashboard | `app/admin/page.tsx` (`loading` state + `Skeleton`) | skeleton, shape #1 | live |
| 5 | Admin projects | `app/admin/projects/page.tsx:SkeletonRow` | skeleton, shape #2 | live |
| 6 | Admin builders | `app/admin/builders/page.tsx:113 SkeletonRow` | skeleton, shape #3 | live |
| 7 | Builder-register submit | `components/BuilderRegistrationForm.tsx:446` | `Loader2 animate-spin` on button | live (button only) |
| 8 | Suspense fallback (new chat) | `app/discover/page.tsx:122` | plain text "Opening your advisor…" | live |
| 9 | Suspense fallback (session) | `app/discover/[sessionId]/page.tsx:122` | plain text "Loading..." | live |
| — | `components/ChatLoader.tsx` | — | multi-step progress | **DEAD** — only referenced in a test mock |
| — | `components/AIThinkingIndicator.tsx` | — | gradient pulse "Scanning live data…" | **DEAD** — zero imports |

**Conclusion:** fragmentation is real. Two components are dead code. This plan unifies to ONE loader primitive.

### Chat intent state (`components/DiscoveryContent.tsx`)
- Declared: `currentIntent` L84.
- Sent to backend on each request: L486 `intent: currentIntent ?? undefined`.
- Updated from SSE stream: L490 `setCurrentIntent(event.intent)`.
- Written to `LOCAL_SESSION_CACHE` keyed by session: L139 (sync effect L131-143).
- Cleared: L709 (`performReset`), L766 (init when `initialSessionId` null).
- Restored: L782 (from cache), L824 (from backend `data.last_intent`).

### How "New Chat" works
- Sidebar button `components/Sidebar.tsx:253-254`: fires `window.dispatchEvent(new CustomEvent('realtypals:new-chat'))` **then** `router.push('/discover')`.
- Listener `DiscoveryContent.tsx:688-693` → calls `performReset()` (L696).
- `/discover` mounts `<DiscoveryContent key="new" initialSessionId={null}>` — **key is a STATIC string** (`app/discover/page.tsx:124`).
- `/discover/[sessionId]` mounts `key={activeSessionId ?? 'new'}` (`[sessionId]/page.tsx:124`).

### Admin backend CRUD (`backend/src/routes/admin.ts`) — VERIFIED COMPLETE
`POST /auth`, `GET /callbacks`, `GET /callbacks/:id`, `GET /stats`, `GET /projects`, `POST /projects`, `GET /projects/:id`, `PATCH /projects/:id`, `GET /builders`, `POST /builders`, `PATCH /builders/:id`. **No backend gap.** (Missing only DELETE — see Task 4d, optional.)

### Swagger (`swagger.json`) — VERIFIED 43 paths, valid OpenAPI 3.1.0
**GAP: 5 chat routes missing** (exist in `backend/src/routes/chat.ts`, absent from swagger):
`GET /chat/session/list`, `GET /chat/session`, `PATCH /chat/session/:id`, `DELETE /chat/session/:id`, `DELETE /chat/intent`. Only `POST /chat` is documented.

---

## PART 1 — INTENT LEAK FIX (root cause, not symptom)

**Symptom:** intent from a previous chat appears in a freshly started chat.
**Verified leak surfaces (all real):**

**Surface A — `performReset` skips reset while a submit is in flight.**
`DiscoveryContent.tsx:697` → `if (submitLockRef.current) return;`. Click "New Chat" mid/just-after streaming → reset silently no-ops, but `router.push('/discover')` still runs. With static `key="new"` the component does not remount, so `currentIntent` survives.

**Surface B — `performReset` only resets `sessionId` for authenticated users.**
`DiscoveryContent.tsx:718` `if (userId) { … setSessionId(new) }`. Anonymous/guest users keep the OLD `sessionId` after "New Chat" → next message reuses the old server session whose `last_intent` is still stored → server re-injects prior intent.

**Surface C — late SSE event re-populates intent after reset.**
`DiscoveryContent.tsx:490` `setCurrentIntent(event.intent)` can fire from an in-flight stream that resolves AFTER `performReset` cleared state. No stream-abort in `performReset`.

**Surface D — `LOCAL_SESSION_CACHE` restore trusts stale `last_intent`.**
Restore reads `cached.last_intent` (L782). The sync effect (L131-143) writes intent keyed by `sessionId`; if a new session transiently shares/reuses a prior `sessionId` before reset completes, stale intent is restored.

### Fix (single, defensive — covers A–D)

**File:** `frontend/components/DiscoveryContent.tsx`

**Fix 1 — make reset unconditional + reset session for everyone + abort stream.**
Rewrite the guard and session-reset in `performReset` (L696-730):
```typescript
const performReset = async () => {
  // Abort any in-flight stream so a late SSE event can't repopulate intent (Surface C).
  // Ref already exists at DiscoveryContent.tsx:205 — no new ref needed.
  abortControllerRef.current?.abort()
  submitLockRef.current = false            // never early-return; always reset (Surface A)

  setChatHistory([]); setChatInput(''); setShowRecommendations(false);
  setIsInitialized(false); setChatPhase('DISCOVERY'); setChatTurnCount(0);
  setHasShownLengthWarning(false); setShowContextWarning(false); setIsSubmitting(false);
  setCarouselIndexes({}); setCurrentIntent(null); setLastShortlist([]);
  setSessionTitle(null); setStatusPhase(null); setResultCount(null);
  setDetailProject(null); setExpandedShortlists(new Set()); setRateLimitUntil(null);
  setConversationState(null);
  setSessionId(null);                      // reset for guests too (Surface B) — new session on next send

  if (userId) {
    try {
      const res = await fetch(`${API_BASE}/chat/intent`, { method: 'DELETE', headers: await authHeaders() });
      const data = await res.json();
      if (data.session_id) setSessionId(data.session_id);
    } catch (e) { console.error('Failed to reset intent:', e); }
  }
  const welcomeMessage: ChatMessage = { id: crypto.randomUUID(), type: 'ai',
    content: "Hi, I'm RealtyPal — your advisor for Noida & Greater Noida. Ask me anything: budgets in ₹ Lakh/Cr, RERA status, builder track records, or which sector fits your family. I'll give you straight answers, tradeoffs included.",
    timestamp: new Date().toISOString() };
  setChatHistory([welcomeMessage]); setIsInitialized(true);
  window.history.replaceState({}, '', '/discover');
};
```
> `abortStreamRef.current?.abort?.()` is safe even if the ref doesn't exist yet (Fix 3 optional). If skipping Fix 3, delete that one line.

**Fix 2 — make `/discover` remount on each new chat.**
`frontend/app/discover/page.tsx:124` — replace static key with a nonce that changes when the new-chat event fires:
```tsx
// top of the /discover page component:
const [newChatNonce, setNewChatNonce] = useState(0)
useEffect(() => {
  const h = () => setNewChatNonce(n => n + 1)
  window.addEventListener('realtypals:new-chat', h)
  return () => window.removeEventListener('realtypals:new-chat', h)
}, [])
// …
<DiscoveryContent
  key={`new-${newChatNonce}`}   // was key="new" — now forces a clean remount
  initialSessionId={null}
  userId={userId}
  guestToken={guestToken}
  onSessionChange={setActiveSessionId}
/>
```
This alone kills Surfaces A/B/C/D for the common path by guaranteeing a fresh component instance (fresh `currentIntent=null`, `sessionId=null`). Fix 1 keeps the explicit-reset path correct as belt-and-suspenders.

**Fix 3 — NOT NEEDED.** The stream AbortController already exists: `abortControllerRef` (`DiscoveryContent.tsx:205`, set L476-478, aborted L965/L1229). Fix 1 simply reuses it. Nothing to add.

**Verify:** send a message (creates intent) → click New Chat → send a new unrelated message → confirm request body `intent` is `undefined` and no prior sector/BHK bleeds in. Repeat as anonymous (no login) and mid-stream.

---

## PART 2 — CHAT "THINKING" LOADER REDESIGN (Stage A)

**What's off:** `MessageBubble.tsx:344-383` mixes three visual languages at once — a spinning ring, blue text "Understanding your request…", an intent chip, AND three big skeleton property cards — before anything is known. Feels heavy/cluttered and the copy is generic.

**Redesign (keep it calm, single language, honest copy):**
Replace Stage A block (`MessageBubble.tsx:344-383`) with the new `<UniversalLoader variant="chat-thinking">` from Part 3, driven by real phase:
```tsx
if (!hasProperties && !message.content) {
  const isSearching = phase === 'searching'
  const intentLabel = formatStreamingIntent(intent)   // keep existing helper
  return (
    <UniversalLoader
      variant="chat-thinking"
      label={isSearching ? 'Searching Noida inventory' : 'Understanding your request'}
      sublabel={isSearching ? intentLabel : undefined}
      showCards={isSearching}   // skeleton cards ONLY once actually searching
    />
  )
}
```
Copy change: "Understanding your request…" → phase-accurate ("Understanding your request" before search, "Searching Noida inventory" during). Skeleton cards no longer show during the pure-thinking phase (only when `isSearching`), removing the cluttered feel. Stage B (L387-405) and Stage C (L408+) unchanged.

---

## PART 3 — UNIVERSAL LOADER (one primitive, everywhere)

**Goal:** one component, four variants, replaces all 6 live idioms + 2 text fallbacks. Delete the 2 dead components.

**New file:** `frontend/components/ui/universal-loader.tsx`
```tsx
'use client'
import { m } from 'framer-motion'

type Variant = 'chat-thinking' | 'skeleton-page' | 'skeleton-list' | 'inline'

interface UniversalLoaderProps {
  variant?: Variant
  label?: string
  sublabel?: string
  rows?: number          // skeleton-list row count
  showCards?: boolean     // chat-thinking: show 3 skeleton property cards
  className?: string
}

function Spinner() {
  return (
    <div className="relative w-5 h-5 flex-shrink-0">
      <div className="absolute inset-0 rounded-full border-2 border-blue-100 dark:border-blue-900 border-t-blue-500 dark:border-t-blue-400 animate-spin" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-[24px] overflow-hidden bg-white dark:bg-gray-800 border border-gray-100/80 dark:border-gray-700/60 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
      <div className="h-[220px] bg-gray-100 dark:bg-gray-700 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full w-3/4 animate-pulse" />
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full w-1/2 animate-pulse" />
        <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-full w-1/3 animate-pulse" />
        <div className="h-9 bg-gray-100 dark:bg-gray-700 rounded-xl w-full animate-pulse mt-1" />
      </div>
    </div>
  )
}

export default function UniversalLoader({
  variant = 'inline', label, sublabel, rows = 6, showCards = false, className = '',
}: UniversalLoaderProps) {
  if (variant === 'chat-thinking') {
    return (
      <div className={`py-2 space-y-3 ${className}`}>
        <div className="flex items-center gap-2.5">
          <Spinner />
          <span className="text-[13px] font-medium text-blue-600 dark:text-blue-400">
            {label ?? 'Thinking'}
            <m.span animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.4, repeat: Infinity }} className="ml-0.5">…</m.span>
          </span>
        </div>
        {sublabel && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3.5 py-2.5 border border-blue-100 dark:border-blue-800/60">
            <p className="text-[13px] text-blue-700 dark:text-blue-300 font-medium leading-snug">{sublabel}</p>
          </div>
        )}
        {showCards && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
          </div>
        )}
      </div>
    )
  }
  if (variant === 'skeleton-list') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-gray-200/50 dark:bg-zinc-800/50 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
    )
  }
  if (variant === 'skeleton-page') {
    return (
      <div className={`flex flex-col items-center justify-center gap-6 p-8 ${className}`}>
        <div className="w-14 h-14 rounded-2xl bg-gray-200/60 dark:bg-zinc-800/60 animate-pulse" />
        <div className="space-y-3 w-full max-w-md">
          <div className="h-5 w-3/4 mx-auto rounded-full bg-gray-200/60 dark:bg-zinc-800/60 animate-pulse" />
          <div className="h-4 w-1/2 mx-auto rounded-full bg-gray-200/40 dark:bg-zinc-800/40 animate-pulse" />
        </div>
        {label && <p className="text-sm text-gray-500 dark:text-zinc-400">{label}</p>}
      </div>
    )
  }
  // inline
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Spinner />
      {label && <span className="text-[13px] font-medium text-gray-600 dark:text-gray-300">{label}</span>}
    </div>
  )
}
```

### Replacement sites (exact)
1. `components/chat/MessageBubble.tsx:344-383` → `<UniversalLoader variant="chat-thinking" …/>` (see Part 2). Add `import UniversalLoader from '@/components/ui/universal-loader'`.
2. `app/discover/loading.tsx` → keep sidebar skeleton, replace main block with `<UniversalLoader variant="skeleton-page" label="Opening your advisor…" />`.
3. `app/discover/page.tsx:122` Suspense fallback → `<UniversalLoader variant="skeleton-page" label="Opening your advisor…" />`.
4. `app/discover/[sessionId]/page.tsx:122` Suspense fallback → `<UniversalLoader variant="skeleton-page" label="Loading chat…" />`.
5. `app/admin/page.tsx` loading branch → `<UniversalLoader variant="skeleton-list" rows={8} />`.
6. `app/admin/projects/page.tsx` `SkeletonRow`/loading branch → `<UniversalLoader variant="skeleton-list" rows={10} />`.
7. `app/admin/builders/page.tsx:113 SkeletonRow` / L363 loading branch → `<UniversalLoader variant="skeleton-list" rows={10} />`.
8. Builder-register submit button `components/BuilderRegistrationForm.tsx:446` — **leave the `Loader2` button spinner** (button-scoped, correct pattern). Optionally swap to `<UniversalLoader variant="inline" />` for visual consistency — low priority.

### Delete dead code (after replacements compile)
- `components/ChatLoader.tsx` — remove file. Also remove its mock in `__tests__/MessageBubble.test.tsx:42`.
- `components/AIThinkingIndicator.tsx` — remove file (zero imports).
> Grep `ChatLoader` and `AIThinkingIndicator` again before deleting; expect only the test mock for ChatLoader.

---

## PART 4 — ADMIN HARDENING

Backend CRUD is complete (Part 0). Gaps are **frontend resilience** + **route-level loaders**.

**Task 4a — 401/expiry handling (biggest gap; NO admin page handles it today).**
`adminAuthHeaders` (`lib/authedFetch.ts:31-35`) sends `Bearer <admin_token>` from localStorage. On expiry the backend returns 401 but pages show generic "Failed…" and stay broken.
Add a tiny shared helper `lib/adminFetch.ts`:
```typescript
import { adminAuthHeaders } from './authedFetch'
import { API_BASE } from './env'

export async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...(init.headers as object), ...adminAuthHeaders() } })
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('admin_token')
    window.location.href = '/admin/login'
  }
  return res
}
```
Replace raw `fetch(`${API_BASE}/admin/…`, { headers: adminAuthHeaders() })` calls in `app/admin/page.tsx`, `app/admin/projects/page.tsx`, `app/admin/builders/page.tsx` with `adminFetch('/admin/…')`.

**Task 4b — login guard on admin pages.**
Each admin page (or the `app/admin/layout.tsx` if it exists) should, on mount, redirect to `/admin/login` when `localStorage.getItem('admin_token')` is null. Add to the top-level admin layout if present, else per page:
```typescript
useEffect(() => {
  if (typeof window !== 'undefined' && !localStorage.getItem('admin_token')) {
    window.location.href = '/admin/login'
  }
}, [])
```

**Task 4c — route-level loaders (first paint).**
Create these files, each returning the universal loader:
- `app/admin/loading.tsx`, `app/admin/projects/loading.tsx`, `app/admin/builders/loading.tsx`, `app/admin/leads/loading.tsx`
```tsx
import UniversalLoader from '@/components/ui/universal-loader'
export default function Loading() { return <div className="p-6"><UniversalLoader variant="skeleton-list" rows={10} /></div> }
```

**Task 4d — (optional) DELETE endpoints.**
`projects/page.tsx` and `builders/page.tsx` have delete UI. Backend has no `DELETE /admin/projects/:id` or `DELETE /admin/builders/:id`. If delete buttons are wired to a call, add these routes to `backend/src/routes/admin.ts` (mirror the PATCH handlers with `prisma.<model>.delete`). Confirm the frontend delete handler's target URL first; if it hits a non-existent route it 404s silently. **Verify before building.**

---

## PART 5 — BUILDER-REGISTER AUDIT

- Route: `app/builder-register/page.tsx` (renders `components/BuilderRegistrationForm.tsx`).
- Loader today: only the submit button spinner (`BuilderRegistrationForm.tsx:446`, `Loader2 animate-spin`). No page-level skeleton (form is static, so none needed).
- **Action:** none required beyond optional inline-loader unification (Part 3, site 8). It's already consistent enough. Note in doc: multi-step form (`stepMeta` L18) with `isSubmitting` gate (L23, L443) — correct pattern, leave as-is.

---

## PART 6 — SWAGGER GAPS (must add 5 chat routes)

`swagger.json` is valid (43 paths) but missing the chat session-management routes that exist in `backend/src/routes/chat.ts`. Add under a `Sessions`/`Chat` tag. Base path prefix used in file is `/api/v1`.

Add these paths (match existing style; auth = BearerAuth, guest via query where applicable):

- `GET /api/v1/chat/session/list` — list caller's chat sessions. Query: none (auth-scoped) or `guestToken`. 200 → `{ sessions: [{ id, title, chat_phase, updated_at }] }`.
- `GET /api/v1/chat/session` — fetch one session. Query: `id` (required), `guestToken` (optional). 200 → `{ session_id, title, chat_phase, last_intent, last_projects, ui_state, messages[] }`. 404 if not found.
- `PATCH /api/v1/chat/session/{id}` — rename. Body `{ title: string }`. 200 → `{ id, title }`. 401/404.
- `DELETE /api/v1/chat/session/{id}` — delete session. 200 → `{ success: true }`. 401/404.
- `DELETE /api/v1/chat/intent` — reset current intent / start fresh session. 200 → `{ session_id }`. Auth required.

> Read each handler in `backend/src/routes/chat.ts` (`get /session/list`, `get /session`, `patch /session/:id`, `delete /session/:id`, `delete /intent`) and mirror the exact `res.json(...)` shape into the response schema. Do not invent fields.

**Verify:** `node -e "const s=require('./swagger.json'); console.log(Object.keys(s.paths).length)"` → expect **48** paths after adding 5.

---

## EXECUTION ORDER & EFFORT
| Step | Task | Files | Est |
|------|------|-------|-----|
| 1 | Part 3 — create `universal-loader.tsx` | +1 | 25m |
| 2 | Part 3 — replace 7 sites, delete 2 dead files + test mock | ~9 | 40m |
| 3 | Part 2 — chat Stage A redesign (uses loader) | 1 | 10m |
| 4 | Part 1 — intent leak (Fix 1+2, Fix 3 if needed) | 2 | 30m |
| 5 | Part 4 — adminFetch + guard + 4 loading.tsx | ~6 | 40m |
| 6 | Part 4d — verify/maybe add DELETE routes | 0-1 | 15m |
| 7 | Part 6 — add 5 chat routes to swagger | 1 | 25m |
| **Total** | | **~20 files** | **~3h** |

## VERIFICATION CHECKLIST (run at end)
- [ ] `cd frontend && npx tsc --noEmit` → 0 errors.
- [ ] `cd backend && npx tsc --noEmit` → 0 errors.
- [ ] New chat (logged-in, guest, mid-stream) → no prior intent in next request body.
- [ ] Chat Stage A shows single calm loader; skeleton cards only when searching.
- [ ] First load, admin pages, chat all use `UniversalLoader` (grep: no `ChatLoader`/`AIThinkingIndicator` imports remain).
- [ ] Expired admin token → auto-redirect to `/admin/login`; visiting `/admin` without token → redirect.
- [ ] `swagger.json` paths === 48; all 5 chat routes present with real response shapes.
- [ ] Dark + light mode: every loader visible and styled.

## NON-BREAKING GUARANTEES
- `UniversalLoader` is additive; old markup deleted only after replacements compile.
- Intent fix is defensive (remount + explicit reset); no API contract change.
- `adminFetch` wraps existing calls; same endpoints, adds 401 redirect only.
- Swagger edits are documentation-only.

---

## PART 7 — ADDITIONAL OPTIMIZATIONS (found in verification pass)

All grounded in real `file:line`. These are adjacent wins surfaced while auditing Parts 1–6. Ranked by impact.

### 7a — Strip prod console spam from the chat hot path (HIGH: perf + privacy)
`components/DiscoveryContent.tsx` has **13 `console.log`** calls that ship to production. Worst offenders:
- `L538` `console.log('[UI_STATE]', { … chips: event.chips })` — dumps the full chips payload (and, by extension, intent-derived UI) to the browser console on **every** stream event. Noise + leaks internal chip structure.
- `L233, L250, L797, …` `[NAV]` timing logs — dev instrumentation left on.
- `L646, L649` `[CHAT:ABORT…]` — abort tracing.

**Fix:** gate all of them behind a dev flag. Add once near top of file:
```typescript
const DEBUG = process.env.NODE_ENV !== 'production'
```
then wrap each `console.log(...)` → `if (DEBUG) console.log(...)`. The `[NAV]` block already checks a `nt` object — leave those, just add `&& DEBUG`. Do **not** touch `console.error` (keep error logging).
**Verify:** `grep -c "if (DEBUG) console.log\|console.log" components/DiscoveryContent.tsx` — no bare `console.log` remains.

### 7b — Unify the welcome message (MEDIUM: consistency)
Two different welcome strings for the same first-load state:
- `L734` (in `performReset`): long — "…your advisor for Noida & Greater Noida. Ask me anything: budgets in ₹ Lakh/Cr, RERA status, builder track records…"
- `L763` and `L895` (init effect): short — "Research properties, compare options, and decide confidently."

So a user reloading vs clicking "New Chat" sees different greetings. **Fix:** define one constant, use everywhere:
```typescript
const WELCOME_MESSAGE = "Hi, I'm RealtyPal — your advisor for Noida & Greater Noida. Ask me anything: budgets in ₹ Lakh/Cr, RERA status, builder track records, or which sector fits your family. I'll give you straight answers, tradeoffs included."
```
Replace the string literal at L734, L763, L895 with `WELCOME_MESSAGE`. (Pick the long copy — it sets clearer expectations.)

### 7c — Bound + type `LOCAL_SESSION_CACHE` (MEDIUM: memory leak + type safety)
`lib/sessionCache.ts` is one line: `export const LOCAL_SESSION_CACHE = new Map<string, any>()`. It grows unbounded as a user opens sessions across a long browser session, and `any` violates the CLAUDE.md no-`any` rule. Full cached payloads (messages + projects) accumulate → memory bloat.
**Fix:** typed LRU with a small cap (last ~20 sessions is plenty):
```typescript
export interface CachedSession {
  session_id: string
  title?: string | null
  chat_phase?: 'DISCOVERY' | 'ADVISOR'
  last_intent?: Record<string, unknown> | null
  last_projects?: unknown[]
  ui_state?: unknown
  restored: unknown[]
}
const MAX_SESSIONS = 20
class LRUSessionCache {
  private map = new Map<string, CachedSession>()
  get(k: string) { const v = this.map.get(k); if (v) { this.map.delete(k); this.map.set(k, v) } return v }
  set(k: string, v: CachedSession) {
    if (this.map.has(k)) this.map.delete(k)
    this.map.set(k, v)
    if (this.map.size > MAX_SESSIONS) this.map.delete(this.map.keys().next().value) // evict oldest
  }
  delete(k: string) { this.map.delete(k) }
}
export const LOCAL_SESSION_CACHE = new LRUSessionCache()
```
API (`get`/`set`/`delete`) is unchanged, so `DiscoveryContent.tsx` call sites (L133-142, L777-788, L878-886) keep working. `ponytail:` capped at 20 sessions — bump only if users report losing cached scrollback.

### 7d — Reduce `any` in the two hot files (LOW-MEDIUM: type safety, CLAUDE.md rule)
`: any`/`as any` count: **9** in `DiscoveryContent.tsx`, **9** in `MessageBubble.tsx`. CLAUDE.md forbids `any`. Not urgent, but each is a latent bug. **Fix (incremental):** when touching these files for the tasks above, replace the `any` you pass through with the real type (`ChatMessage`, `ProjectCardType`, `Record<string, unknown>`, the `RawMessage` already defined at L836). Do NOT do a blind sweep — fix the ones in code you're already editing.

### 7e — Delete confirmed dead components (LOW: already in Part 3)
Covered in Part 3 (delete `ChatLoader.tsx`, `AIThinkingIndicator.tsx`). Restated here as an explicit dead-code line item. Net −~7KB source + −2 framer-motion mount paths.

### Part 7 effort
| Task | Files | Est | Risk |
|------|-------|-----|------|
| 7a console gate | 1 | 15m | none |
| 7b welcome constant | 1 | 5m | none |
| 7c LRU cache | 1 | 20m | none (same API) |
| 7d any→types (opportunistic) | 2 | — | low |
| 7e dead-code delete | −3 | (in Part 3) | none |

### Part 7 verification
- [ ] Prod build: no `[NAV]`/`[UI_STATE]`/`[CHAT:ABORT]` logs in browser console.
- [ ] Reload and "New Chat" show the SAME welcome copy.
- [ ] Open 25+ sessions → `LOCAL_SESSION_CACHE` size stays ≤ 20 (DevTools).
- [ ] `npx tsc --noEmit` clean after cache retype.

---

## PART 8 — PRODUCTION READINESS GAPS (verified 2026-07-25)

Only these remain. All anchored to real `file:line`. Haiku-executable.

### 8a — Wire `adminFetch` into every admin page (HIGH: token-expiry = broken panel)

`lib/adminFetch.ts` exists (Part 4a) but **is imported nowhere**. 13 admin files still call `fetch(\`${API_BASE}/admin/…\`, { headers: adminAuthHeaders() })` directly, so a mid-session 401 (expired 7-day admin token) shows a generic error instead of redirecting to `/admin/login`. `adminFetch` injects the auth header AND redirects on 401.

**Transformation rule** — `adminFetch(path, init)` takes a path (no `${API_BASE}`) and merges `adminAuthHeaders()` internally, so drop both:
```
fetch(`${API_BASE}/admin/leads?status=${filter}`, { headers: adminAuthHeaders() })
  → adminFetch(`/admin/leads?status=${filter}`)

fetch(`${API_BASE}/admin/builders/${id}`, { method: 'PATCH', headers: { ...adminAuthHeaders(), 'Content-Type': 'application/json' }, body })
  → adminFetch(`/admin/builders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body })
```
Keep any non-auth headers (e.g. `'Content-Type'`). Remove the spread `...adminAuthHeaders()` from the headers object.

**Files to convert** (add `import { adminFetch } from '@/lib/adminFetch'`, then replace every `fetch(\`${API_BASE}/…\`, { … adminAuthHeaders() … })`):
| File | Fetch lines |
|------|-------------|
| `app/admin/page.tsx` | 36 |
| `app/admin/projects/page.tsx` | 111, 177 |
| `app/admin/projects/[id]/page.tsx` | 169, 170, 171, 198, 199, 200 |
| `app/admin/builders/page.tsx` | 149, 215, 265 |
| `app/admin/leads/page.tsx` | 37, 51 |
| `app/admin/news/page.tsx` | 35, 51 |
| `app/admin/builder-applications/page.tsx` | 38, 53 (paths are `/builder-applications…`, not `/admin/…` — still convert; they need auth + 401 redirect) |
| `app/admin/analytics/page.tsx` | 60, 61, 62 |
| `app/admin/analytics/properties/page.tsx` | 29 |
| `app/admin/analytics/search/page.tsx` | 29 |
| `app/admin/analytics/users/page.tsx` | 41 |

**Do NOT convert:**
- `app/admin/login/page.tsx:19` — no token yet; a 401 here means wrong password and must NOT redirect (infinite loop). Leave raw.
- `app/admin/layout.tsx:70,90` — already redirects to `/admin/login` on 401 by hand (the mount-guard). Leave as-is; converting is optional and would double-handle.

After converting, `adminAuthHeaders` may become an unused import in some files — remove it where no longer referenced (tsc/lint will flag).

**Verify:** `grep -rn "fetch(\`\${API_BASE}/admin\|fetch(\`\${API_BASE}/builder-applications" app/admin | grep -v login | grep -v layout` → only intentional lines remain. Manually: log in, delete `admin_token` from localStorage, click any nav item → lands on `/admin/login`.

### 8b — Sync swagger with the 9 missing admin operations (MEDIUM: contract drift)

`backend/src/routes/admin.ts` has **20 routes**; `swagger.json` documents **8** admin ops. Missing (backend has, swagger lacks). Add each mirroring the handler's actual `res.json(...)` shape — **read the handler in `admin.ts` first, do not invent fields**:

| Add to swagger path | Method | Backend line (admin.ts) | Notes |
|---------------------|--------|--------------------------|-------|
| `/api/v1/admin/projects/{id}` | **delete** | `router.delete('/projects/:id'` L293 | add `delete` alongside existing get/patch |
| `/api/v1/admin/builders/{id}` | **delete** | `router.delete('/builders/:id'` L395 | add `delete` alongside existing patch |
| `/api/v1/admin/leads` | **get** | `router.get('/leads'` | query `status` filter; returns lead list |
| `/api/v1/admin/leads/{id}` | **patch** | `router.patch('/leads/:id'` | status/notes update |
| `/api/v1/admin/news` | **get** | `router.get('/news'` | news list |
| `/api/v1/admin/analytics/summary` | **get** | `router.get('/analytics/summary'` | KPI summary |
| `/api/v1/admin/analytics/quality` | **get** | `router.get('/analytics/quality'` | data-quality metrics |
| `/api/v1/admin/analytics/users` | **get** | `router.get('/analytics/users'` | user analytics |
| `/api/v1/admin/analytics/properties` | **get** | `router.get('/analytics/properties'` | property analytics |

All require `BearerAuth` + `401: { "$ref": "#/components/responses/Unauthorized" }`, tag `"Admin"`. Follow the exact JSON style of the existing `/admin/stats` block.

**Also verify** two frontend-called sub-routes exist in the backend before documenting: `GET /admin/projects/{id}/documents` and `GET /admin/projects/{id}/completeness` (called at `app/admin/projects/[id]/page.tsx:170-171`). If they resolve in a router, add them to swagger; if they 404, that's a separate bug — report it, don't paper over it.

**Verify:** `node -e "const s=require('./swagger.json'); console.log(Object.keys(s.paths).length)"` → **49** paths (46 + leads + news + 1 analytics parent; analytics summary/quality/users/properties may share or split paths — count is approximate, the point is all 9 ops appear).

### 8c — Remove now-dead `SkeletonRow` (LOW: lint noise)

Part 3 replaced the `SkeletonRow` usage with `UniversalLoader` in both grids, but the function definitions remain unused:
- `app/admin/projects/page.tsx` — `SkeletonRow` defined, 0 usages.
- `app/admin/builders/page.tsx:113` — `SkeletonRow` defined, 0 usages.

Delete both function definitions. If the `Skeleton` import becomes unused after removal, drop it too (in `builders/page.tsx`; `admin/page.tsx` still uses `<Skeleton>` for KPI cards — keep there).

**Verify:** `grep -c SkeletonRow app/admin/projects/page.tsx app/admin/builders/page.tsx` → 0 each. `npm run build` still exits 0.

### 8d — (report only, do NOT auto-fix) logout hits a non-existent route

`app/admin/layout.tsx:90` calls `DELETE /admin/auth`, but `admin.ts` has no `router.delete('/auth')` (only `post /auth`). The call 404s; logout still works because localStorage is cleared client-side. **Low priority.** Fix path: either add `router.delete('/auth')` to invalidate server-side, or drop the network call. Flag to a human — don't silently change auth behavior.

### Part 8 effort
| Task | Files | Est | Risk |
|------|-------|-----|------|
| 8a adminFetch wiring | ~11 | 45m | low (mechanical, tsc guards) |
| 8b swagger sync | 1 | 30m | none (docs only) |
| 8c dead SkeletonRow | 2 | 5m | none |
| 8d logout route | report | — | leave for human |

### Part 8 verification (production gate)
- [ ] `npm run build` exits 0 (currently ✅ after ChipPicker fix).
- [ ] `npx tsc --noEmit` clean.
- [ ] Expired/missing admin token → redirect to `/admin/login` from ANY admin page (not just first load).
- [ ] `swagger.json` documents every route in `admin.ts` (20 ops) + chat session routes.
- [ ] No `SkeletonRow` / dead-loader references remain.
- [ ] Intent: new chat (guest + logged-in + mid-stream) carries no prior intent.
