# Refinement Plan — 16 Surfaces

**Scope:** 400 findings audited 2026-07-28. Remediation prioritized by impact: P0 (blocks decision), P1 (major UX/trust), P2 (minor/polish), P3 (edge cases).

**Implementation:** Each surface is a standalone unit. No cross-surface dependencies. Fixes are applied per-surface atomically. Success = all P0s resolved, P1s cleared unless explicitly deferred, P2s assessed for scope.

---

## 1. Landing Page (`app/page.tsx`)

**Current:** 128 lines, hero + CTA + feature pills. Brand surface.

**Refine means:**
- Remove banned eyebrow pattern: `text-[10px] uppercase tracking-[0.1em]` on feature pills (line 106).
- Fix animation-gated content: `fade-in-up` with `forwards` only leaves blank on delay. Add `backwards` to both `animation` and `@media (prefers-reduced-motion)`.
- Contrast fixes: scrim `via-black/40` is weakest point (2.53:1). Raise to `via-black/75`. Subtitle `text-white/50` (4.88:1 bare; <2:1 over bright). Raise to `text-white/80`. Feature pill `text-white/40` (3.67:1; 4.5:1 required). Raise to `text-white/75`.
- Remove `mix-blend-screen` on hero photo (unpredictable compositing). Keep `opacity-40`.
- Add `<main id="main-content">` to outer div (skip link at layout.tsx:71 targets nonexistent anchor).
- A11Y: `animate-spin` loading spinner missing `role="status"` + `sr-only` label.

**Changed:** No structural change. All landing fixes are polish.

**Success criteria:**
- All contrast ratios ≥4.5:1 on body text, ≥3:1 on large/non-text.
- Eyebrows removed or restyled (13px normal-case, not 10px all-caps).
- No animation-gated blank on any element on load.
- `prefers-reduced-motion` guard in place globally.
- Skip link working (element has `id="main-content"`).

**Impeccable commands:** `/impeccable quieter app/page.tsx` (eyebrows, animations), `/impeccable typeset app/page.tsx` (contrast, hierarchy).

---

## 2. Signin/Signup (`app/auth/page.tsx`)

**Current:** 295 lines, two-tab form (login/register). Product surface at the password commitment point.

**Refine means:**
- A11Y labels: four inputs (name, email, password, password-toggle) with no `<label htmlFor>` or input `id`. Add programmatic association.
- A11Y focus ring: `focus:ring-1 focus:ring-white/20` (1.76:1 on dark field). Raise to `focus:ring-2 focus:ring-white/70`.
- Contrast: placeholders `text-white/30` (2.53:1). Raise to `text-white/60`. Inactive tabs `text-white/40` (3.39:1). Raise to `text-white/70`. Subhead `text-white/50` (4.9:1 best; <2:1 over bright). Raise to `text-white/80`. Back-link `text-white/50`. Raise to `text-white/85`. Field icons `text-white/30` (2.53:1). Raise to `text-white/55`. Divider "or" `text-white/20` (1.76:1). Raise to `text-white/60`. Signup cue `text-white/30`. Raise to `text-white/70`.
- Password toggle: add `aria-label`, `aria-pressed`, remove `tabIndex={-1}` (keyboard unreachable). Add `min-w-[44px] min-h-[44px]` (now 32px).
- Error state: missing `role="alert"` on error block + `aria-describedby` on inputs.
- Form validation: empty submit silently no-ops. Gate on validation message.
- Hard ban: decorative blur blobs at line 134-135 (two 500px `blur-[140px]` layers, zero info). Delete.
- Hard ban: glassmorphism card at line 159 (`bg-[#111111]/80 backdrop-blur-3xl` + fake inner highlight). Replace with opaque `bg-[#111111]`, drop `backdrop-blur-3xl`.
- Field backgrounds: raw `bg-[#000000]/60`/`bg-[#000000]/40` inset shadows. Use `bg-black/40`, drop insets.
- Copy: "100% Free for buyers..." (line 287) is marketing-badge voice. Restyle to plain text, copy: `"Free for buyers. We don't sell your details to brokers."`
- Pill overflow: 74-char string at 320px forces overflow. Add `max-w-[calc(100%-2rem)] mx-4 text-center`.
- Session check: no `.catch()` on promise chain (unlike page.tsx:23). Add error handler.
- Error messages: raw Supabase leaks ("AuthApiError: Password should be at least 6 characters"). Map known codes to user-facing strings.
- Register path: success shows "Account created! Please sign in." but confirmation email is required (line 58). Update message to name the step: `"Account created. Check your inbox to confirm your email, then sign in."`
- Analytics: `track('signup_started', { mode })` fires on *login* submits too (line 46). Move inside `else` (register) branch.
- Touch targets: tabs `py-2.5` (38px). Raise to `py-3.5`. Continue-as-guest `py-2.5`. Raise to `py-3`. Button text on loading: spinner-only, no accessible name, no `aria-busy`. Keep text, add `aria-busy={loading}`.
- Decorative images: `alt="background"` announces to screen readers. Change to `alt=""`.

**Changed:** No structural change.

**Success criteria:**
- All contrast ≥4.5:1 body, ≥3:1 large/UI.
- Every input has `<label>` and `id`.
- Focus rings visible (≥3:1) on all interactive elements.
- Error state announced to screen readers.
- All touch targets ≥44px.
- Validation messages appear before submit fails silently.
- Loading state shows accessible name.

**Impeccable commands:** `/impeccable audit app/auth/page.tsx` (a11y + contrast), `/impeccable clarify app/auth/page.tsx` (error copy, validation messages).

---

## 3. Builder Register (`app/builder-register/page.tsx`)

**Current:** 449 lines, 6-step form (builder identity, projects, executives, RERA, review, submit). Brand surface.

**Refine means:**
- Data loss on submit: `handleSubmit` calls **no API** (setTimeout 1500 then `setSubmitted`). User sees "Listing Submitted!" and "Our team will review..." with data discarded. This is dishonest UI. Gate `setSubmitted` on `response.ok`, or replace success view with disabled state until backend exists.
- A11Y labels: 11 `<label>`s with no `htmlFor`, no input `id`. Add programmatic pairing.
- Contrast: all placeholders `text-zinc-400` (2.44:1). Raise to `text-zinc-500` (4.6:1).
- Focus ring: `focus:ring-4 focus:ring-zinc-100` (1.05:1 on field). Raise to `focus:ring-2 focus:ring-blue-600/60`.
- Hard ban: tiny-uppercase eyebrow "Step {n} of {n}" in decorative pill. Replace with plain text: `text-[13px] text-zinc-600 Step {n} of {n}`.
- Hard ban: `text-[11px] font-semibold text-zinc-500 uppercase tracking-widest` reference labels at 152/157. Replace with `text-[12px] normal-case tracking-normal text-zinc-600`.
- Contrast: label `text-zinc-500` (4.22:1 light, 3.69:1 dark). Raise to `text-zinc-600 dark:text-zinc-300`.
- Validation: only on final step, surfaces as transient Toast. No field-level errors, no scroll-to-field. Add per-step validation, render messages under field with `aria-invalid` + `aria-describedby`.
- Scope: "e.g. Mumbai" / "e.g. Bandra West" (line 120/124) out of V1 scope (Noida only). Change to "e.g. Noida" / "e.g. Sector 150".
- Hard ban: glassmorphism card (line 55) `bg-white/70 backdrop-blur-2xl`. Replace with `bg-white`, drop blur.
- Copy: "Listing Submitted!" celebratory tone on compliance step. Change to "Listing submitted".
- Navigation: `window.location.href = '/'` forces full reload. Use `useRouter()` + `router.push('/')`.
- Progress bar: no `role="progressbar"`, `aria-valuenow`, `aria-valuemax`. Add all three. Spring animation missing `useReducedMotion()` gate.
- Framer motion: `initial/animate` do not auto-respect `prefers-reduced-motion`. Add `const reduce = useReducedMotion()` and skip animations when true.
- Overflow: `overflow-hidden` on step container with two-column `grid-cols-2` at 320px. Remove `overflow-hidden`, change grid to `grid-cols-1 sm:grid-cols-2`.
- Button loading state: spinner-only, no accessible name. Keep label, add `aria-busy={isSubmitting}`.
- Button icons: `<ArrowLeft/>` / `<ArrowRight/>` without `aria-hidden`. Add to both.
- Copy: "live on the marketplace" — PropFyndr not a marketplace (CLAUDE.md). Change to "live on PropFyndr".
- Price validation: `price_min`/`price_max` free-text ("e.g. 1.5 Cr") with no numeric parsing or min<max check. Use `type="number"` + Lakh|Cr select, reject `price_min > price_max` in `handleNext`.
- Decorative blurs (4 at line 114-115/177-178): `bg-blue-500/10 blur-[120px]`, `bg-indigo-500/10`, gradients. Delete all four (zero info, 50-80vw each, 6-step compliance form).
- Action bar: `bg-white/50 backdrop-blur-md` over solid card. Replace with `bg-white`, drop blur.
- Fixed height: `min-h-[720px] md:h-[780px]` on 375×667 phone causes overflow with `overflow-hidden`. Add `md:overflow-hidden` for mobile, delete fixed height at mobile, keep at desktop.
- Overflow review cards: `grid-cols-2` unconditional, card values `truncate` preventing verification. Change to `grid-cols-1 sm:grid-cols-2`, replace `truncate` with `break-words`.
- Error handling: `setApplicationId(data.application_id)` with no guard renders empty `<code>` if missing. Add check, fallback message.
- JSON parse error: `await response.json()` outside guard on failed response. Catch 502 errors that throw. Wrap in `.catch(() => ({}))`.
- Config: hardcoded `'http://localhost:3001'` fallback. Import shared `API_BASE` from `@/lib/env`.
- Data cleanup: `e.target.value.split(',')` submits spaces/empty strings. Use `.map(s=>s.trim()).filter(Boolean)`.
- Dead field: `executives[].experience_years` in state, sent to API, no input field. Drop from state + payload or add field.
- Touch targets: icon-only remove buttons `w-8 h-8` (32px). Raise to `w-11 h-11`. Same for info toggle button.
- A11Y tooltip: `div onMouseEnter/onClick` not focusable, no role, no `aria-describedby`. Change to `<button type="button" aria-label aria-expanded>`, add tooltip `role="tooltip"`, wire to input's `aria-describedby`.
- Upload field: `opacity-0` invisible button, no label, no focus ring. Add `id`, `aria-label`, `focus-visible:ring-2 focus-visible:ring-blue-600` on wrapper.
- Hardcoded surfaces: `bg-[#FAFAFA]` ×2 while `--color-surface-2` exists. Use token.
- Button color: raw hex `bg-[#18181B] hover:bg-[#27272A]` (zinc-900/800). Use tokens or `bg-zinc-900 hover:bg-zinc-800`.

**Changed:** No structural change; all refinements.

**Success criteria:**
- All contrast ≥4.5:1 / 3:1.
- Per-step validation with field-level error messages.
- All inputs programmatically labeled.
- All touch targets ≥44px.
- Loading states show accessible names.
- `prefers-reduced-motion` guarded animations.
- No decorative blur blobs.
- Copy aligns with PropFyndr product voice.

**Impeccable commands:** `/impeccable audit app/builder-register/page.tsx` (a11y + contrast), `/impeccable clarify` (copy, validation messages), `/impeccable adapt` (responsive grid).

---

## 4. Discovery (Chat) (`app/discover/page.tsx` + `/[sessionId]/page.tsx`)

**Current:** Two pages, 80–120 lines each. Primary product surface.

**Refine means:**
- A11Y streaming: `aria-live="polite" aria-relevant="additions text"` on scroll container re-announces every token chunk (hundreds per response). Move `aria-live` to isolated `<div role="status" aria-live="polite" className="sr-only">`, set once per state change to final message.
- A11Y `aria-busy`: no `aria-busy` during generation. Add to chat container.
- A11Y thinking state: `UniversalLoader` with label not announced. Wrap in `<div role="status">` or pass `aria-live="polite"` inside label.
- A11Y analyzing dots: `animate-bounce` + "Analyzing" with no `role="status"`, dots not `aria-hidden`. Add role, hide dots.
- A11Y typing caret: fake `<span>` animating pulse, unlabeled, in live region. Add `aria-hidden="true"`.
- Chat error state: `streamChatBackend` called with `onEvent` / `onDone` but **no `onError`** (backend-api.ts:97-99 undeclared). Network failures surface only as synthetic `{type:'error'}` event. Add proper error handling: map to message with `failed: true`, render retry row.
- Mid-stream failure: partial text with no error. Track `sawDoneEvent`; if `onDone` fires without it, append retry row `role="alert"`.
- Offline state: `navigator.onLine` never checked. Add online/offline banner, disable send while offline.
- Message retry: no "failed to send" state on user bubble. Add `message.failed` flag, render with red `!` + "Tap to retry".
- Error boundary: `Try again` only rerenders same children → usually re-throws. Bump a `key` to reset, offer "Reload page" fallback. Add `track('chat_error_boundary', {...})` telemetry (currently `console.error` only).
- Draft persistence: input preserved in `localStorage['propfyndr_draft']` ✓. Good.
- Scroll position: **not** restored. Debounce-persist `el.scrollTop` per `sessionId`, restore in layout effect after `chatHistory` hydrates.
- `visibleCount` windowing: resets on mount, forces "Load older messages" re-click after refresh. Persist alongside scroll position.
- Guest token key mismatch: `/discover` uses `'guest_token'`, `/discover/[sessionId]` uses `'propfyndr_guest_token'` and **deletes** the old key. Navigation loses all prior sessions. Extract `getOrCreateGuestToken()` to `lib/guestToken.ts`, use single key in both pages.
- Auth migration: `/discover/[sessionId]` reads old key (`'guest_token'`) while getter stores under `'propfyndr_guest_token'`. On sign-in, guest sessions **never migrated** (buyer's days of chat lost). Read same constant.
- New-chat remount: `key={`new-${newChatNonce}`}` remounts `DiscoveryContent` on every `propfyndr:new-chat` event, discarding draft. Call `performReset()` instead of remounting.
- `localStorage` error: raw `localStorage.getItem` with no `try/catch` on private-mode Safari. Wrap like page.tsx:36-49, set `setReady(true)` in catch.
- Debug logging: `console.log('[NAV] 3. page-mount…')` and `__navTimings` ship to production. Delete or gate behind `process.env.NODE_ENV !== 'production'`.

**Changed:** No structural change.

**Success criteria:**
- `aria-live` isolated to single status region, announced once per completion.
- `aria-busy` present during streaming.
- Network failures show clear retry option.
- Scroll position persists across sessions.
- Guest token unified, migration happens on sign-in.
- No debug console output in production.

**Impeccable commands:** `/impeccable audit app/discover` (a11y), `/impeccable clarify` (error messages).

---

## 5. Sidebar & Header (`components/Sidebar.tsx` + `components/Header.tsx`)

**Current:** Sidebar 450 lines, Header 50 lines. Product chrome.

**Refine means:**
- Sidebar collapse on mobile breaks phone state: `isCollapsed ? 'hidden md:flex' : ...` (desktop-only collapse, mobile sees `hidden`). Scope to desktop: `${isCollapsed ? 'flex w-64 md:w-[68px]' : 'w-64 md:w-[260px]'}`.
- Logout nested in button: `<button><SVG /></button>` + SVG has no label. Move to sibling `<button aria-label="Sign out">`.
- Expand sidebar hover-gated + inset overlay: button `opacity-0 group-hover:opacity-100` + `absolute inset-0` over logo — keyboard gets invisible control, touch has no hover. Add `focus-visible:opacity-100`, stop stacking.
- Collapsed tooltip clipped: `absolute left-full ... z-[100]` but container has `overflow-hidden`. Remove `overflow-hidden`, use `overflow-x-clip` on inner scroller.
- Account button no aria-label: collapsed letter avatar missing `aria-label` (unlike sibling buttons with `title`). Add `aria-label="My account"`.
- Mobile drawer issues: no `role="dialog"`, `aria-modal`, no Escape-to-close, body scroll not locked, no focus trap. Add all four.
- Sidebar not a landmark: bare `<div>` instead of `<nav>`. Change to `<nav aria-label="Main navigation">`.
- Active nav: state by colour only (`bg-blue-600 text-white`), no `aria-current`. Add `aria-current={isActive ? 'page' : undefined}`.
- Focus indicator: global rule strips outline from inputs (globals.css:408-410). Replace with `outline: 2px solid var(--color-primary); outline-offset: 0;` or ring-shadow.
- Rename input outline: `outline-none` with no ring on the only text-entry control in sidebar. Replace with `focus-visible:ring-2 focus-visible:ring-blue-500`.
- Global `prefers-reduced-motion` missing: `purple-hue-bg` (25s infinite), `shimmer-badge` (3s), `pulse-glow` (2s), animate-pulse dots at Header:23 / Sidebar:406. Add global guard.
- Keyboard shortcut hint: `<kbd>Ctrl + N</kbd>` shown (line 283) but no handler exists (only `Ctrl+K` in DiscoveryContent.tsx:415). Delete hint or register handler.
- Empty state: bare "No chats yet" teaches nothing. Replace with heading + body text + CTA reusing new-chat handler.
- Error state: "Couldn't load chats" with no retry. Add `<button onClick={refetch}>Try again</button>`.
- Hamburger touch target: `w-10 h-10` (40px). Raise to `w-11 h-11`. Top-left position hardest reach on phone. Add `touch-target-min` helper.
- Icon buttons: five buttons at `w-10 h-10` (line 222-233/247-255/261-274/417/443). Raise all to `w-11 h-11` or `min-w-[44px] min-h-[44px]`.
- Rename/delete buttons: `opacity-0 group-hover/session:opacity-100` + `p-1` (~19px, unreachable on touch) + `title` no `aria-label`. Add `focus-visible:opacity-100 group-focus-within/session:opacity-100 md:opacity-0 opacity-100` (show on touch), `aria-label`, `md:opacity-0 opacity-100` (visible on touch), bump to `p-2.5`.
- Rename via double-click only: no keyboard path. Make visible Pencil button primary, drop double-click reliance.
- Rename hint: `text-[9px] text-gray-400 opacity-70` (1.86:1 on light sidebar) at 9px. Delete (affordance should be visible button) or `text-[11px] text-gray-600 dark:text-gray-300` no opacity.
- Contrast labels: "Menu" / "Recent" `text-gray-400` (4.22:1 light, 3.69:1 dark). Raise to `text-gray-600 dark:text-gray-300`.
- Empty state contrast: `text-gray-400` (2.51:1 light). Raise to `text-gray-600 dark:text-gray-400`.
- Error contrast: `text-red-400 dark:text-red-500` (2.75:1 light). Swap: `text-red-600 dark:text-red-400` (7.0:1 / 5.3:1).
- Date-group headers: `text-[10px] text-gray-400 dark:text-gray-500` (2.51:1 / 3.69:1). Raise to `text-[11px] text-gray-600 dark:text-gray-400`.
- Timestamp: `text-[10px] text-gray-400 dark:text-gray-500` (2.51:1 / 3.69:1), `opacity-0` until hover (invisible on touch). Raise to `text-[11px] text-gray-500 dark:text-gray-400`, drop opacity on mobile.
- Keyboard hint contrast: `text-gray-400` on `bg-gray-100` (2.29:1). Raise to `text-gray-600 dark:text-gray-300`.
- Avatar hardcoded: shows "F" for every signed-in user. Derive from session: `{(user?.email ?? '?')[0].toUpperCase()}`.
- Header avatar non-interactive: `<div>` inside `group relative` with unused hook — no hover/click. Make it `<Link href="/account" aria-label="My account">` or remove wrapper.
- Header dead prop: `onToast?: (message: string) => void` declared, never destructured. Delete from `HeaderProps`.
- Header vs Sidebar consistency: Header `z-30`, hamburger `z-40`, overlay `z-40`, panel `z-50`, tooltip `z-[100]`. No semantic scale, overlay and hamburger tie (hamburger above scrim = re-firing `setMobileOpen(true)` is no-op). Define scale in tailwind.config, set hamburger below overlay.
- Header dot status: bare `animate-pulse` green dot, no label, colour-only affordance. Wrap in `<span role="status" aria-label="Connected">` or delete.
- Hard ban: decorative glassmorphism on nav `bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl` + border. Replace with opaque `bg-white dark:bg-gray-900`, drop blur.
- Hard ban: glass pill wrapping toggle `bg-gray-100/50 dark:bg-gray-800/50 ... border-gray-200/50 dark:border-gray-700/50`. Delete wrapper, render toggle directly.
- Theme toggle raw hex: `border-[#D0D0D0]`. Use `border-[color:var(--color-border-heavy)]`.
- Nav consistency: radii `rounded-xl` collapsed vs `rounded-[14px]` expanded. Standardise on `rounded-xl` (12px), delete arbitrary value.
- Icon sizes vary: `strokeWidth` 1.5 / 2 conditional on active, sizes 12/18/20. Fix `strokeWidth={1.5}` and `size={18}` for all.
- Account/sign-in button state missing: no `focus-visible`, no `hover` in collapsed branch (no `hover:bg-*`). Add `hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-500`.
- Nav links state: default/hover/active but no `active:` (pressed) and no `focus-visible`. Add both.
- Session item state: default/hover/active but no `active:` and no `focus-visible`, `isNavigating` uses `opacity-60 cursor-not-allowed` on `<a>` (still focusable). Add `active:scale-[0.99] focus-visible:ring-2`, mark `aria-disabled={isNavigating}`.
- Theme toggle size: `w-9 h-9` (36px) on mobile, only `hover:shadow-sm` feedback. Add `w-11 h-11 md:w-10 md:h-10 active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500`.
- Rename/delete buttons in modals: no `focus-visible`, no `aria-label`. Add both, `autoFocus` on the No button.
- Loading skeleton: three fixed rows with no date-group headers, layout jumps when real data lands. Render one group header skeleton + rows, or reserve height.
- Mobile swipe listeners: registered on `window` unconditionally, fire on desktop touchscreens and horizontal swipes anywhere (property carousel close). Guard both branches with `if (window.innerWidth >= 768) return;` and require `touchStartX < 30 || mobileOpen`.
- Code cleanup: `useEffect` closing `};` on line 160, next statement on same line. Put `const closeMobile` on own line.
- Types: `Record<string, any>` + casts violate no-`any` rule. Type as navigation state.
- Memory leak: `navigationTimeoutRef` never cleared on unmount. Add effect cleanup.

**Changed:** No structural change. All refinements.

**Success criteria:**
- All contrast ≥4.5:1 / 3:1.
- All touch targets ≥44px.
- Collapse scoped to desktop.
- Modal affordances (dialog role, trap, Escape, focus restore, scroll lock).
- Keyboard navigation complete (visible focus rings).
- `prefers-reduced-motion` guarded.
- Semantic z-index scale (no arbitrary 999/9999).

**Impeccable commands:** `/impeccable audit components/Sidebar.tsx components/Header.tsx` (a11y + contrast), `/impeccable adapt` (mobile touch targets).

---

## 6. Chat Surface (Streaming, Errors, State)

**Current:** `components/DiscoveryContent.tsx` (1280 lines), `components/chat/MessageBubble.tsx` (1060 lines), six satellite components. Core product.

**Refine means:**

### DiscoveryContent.tsx
- `aria-live` chattering: hundreds of re-announcements per response (polite with additions). Isolate to single `<div role="status" aria-live="polite" className="sr-only">` updated once per `onDone`.
- No `aria-busy`: add to chat container.
- Streaming error no handler: `onError` undeclared in backend-api.ts. Add handler mapping event to message with `failed: true`, render retry.
- Draft saved ✓. Scroll **not** persisted: debounce-save `scrollTop` per `sessionId`, restore in effect.
- `visibleCount` not persisted: resets on mount. Save alongside scroll.
- Guest token collision: `/discover` key vs `/discover/[sessionId]` key. Unified getter in shared file.
- Loading spinner no `role`: add `role="status" aria-label="Loading"`.
- Input container `transition-all duration-300`: scope to opacity/transform only, not all, reduce to 150ms.
- Send/stop buttons `transition-all duration-300`: change to `transition-colors duration-150`.

### MessageBubble.tsx (1060 lines — largest file, complex state)
- A11Y entity buttons: inline `<button>` with no `aria-label` / `focus-visible`. Add both.
- Carousel dots: `h-1 w-1.5` (6×4px), no handler. Wrap in `min-w-11 min-h-11` hit area, wire `onClick={() => setImgIdx(i)}`.
- A11Y thinking state: `UniversalLoader` not `role="status"`. Add.
- A11Y analyzing dots: `animate-bounce` + `<span className="...">Analyzing {count}</span>` with no `role="status"`, dots not `aria-hidden`. Add role, hide dots.
- A11Y fake caret: `<span className="w-0.5 h-[1em] animate-pulse">` in live region, no `aria-hidden`. Add it.
- Chip state missing: disabled rendered as `opacity-50 pointer-events-none` on `<button>` without the `disabled` attribute (still focusable). Add `disabled={disabled}`.
- Chip focus: `outline-none` with no `focus-visible:ring-2`. Add ring.
- Dropdown trigger: no `aria-expanded` / `aria-haspopup`, panel no `role="listbox"`, Escape doesn't close (only mousedown outside), no keyboard dismiss. Add attributes, add Escape handler.
- Recommendation card reasoning gap: `matchReason` or `decisionIntelligence.bottomLine` never rendered. Add visible WHY + PRIMARY TRADE-OFF line.
- Concerns never surfaced: `project.concerns` computed but only used in ask-AI prompt. Render visible trade-off: `{concerns[0]}` at 12px amber.
- No concern rendering: `const concerns = (project.concerns ?? []).slice(0, 2)` computed, never mapped. Add to verdict strip.
- Tier badge no justification: tier rendered without `headline || reasons.length > 0`. Gate on one existing.
- Pros/cons balance: `why_avoid` styled weaker (`text-gray-500`) than `why_buy` (`text-gray-700`). Use identical color.
- Comparison copy: `Buy {winner}` imperative sales copy. Change to `{winner} is stronger fit`, drop `font-black`.
- Signature/metadata missing: every signingLabel not paired with source or date. Either include basis or omit.
- Confidence/scores: match%, confidence%, rating% printed bare without methodology. Delete badges or render basis.
- Number formatting: `₹${intent.budgetMax}Cr` unformatted (₹0.85Cr bad, should be lakh). Extract `formatCrore(cr: number)` logic to `lib/format.ts`, reuse.
- Hardcoded defaults everywhere: `unit.inventory_left || 8` renders "Only 8 left" for unknown inventory (fabricated scarcity). Gate: `{unit.inventory_left != null && <banner/>}`.
- Marketing copy defaults: `'Premium configuration...'` fallback. Render nothing when null.
- Perfect-for invention: `perfectFor.push('Families','End Users')` hardcoded. Hide section when absent.
- Best-value invention: `unitTypes.find(u=>u.name.includes('Study')) || unitTypes[1]` surfaced as "Best Value" with badge. Delete or compute from ₹/sqft.
- Copy consistency: "Ranked by fit" vs "Ordered by..." (675/793); tier mismatch; eyebrows on every section. Use one labeling system.
- Touch target carousel prev/next: `w-7 h-7` (28px), hover-gated. Raise to `w-11 h-11`, always visible on mobile.
- Touch target dots: 6×4px. Wrap.
- Hard ban: gradient on user bubble `from-blue-600 to-blue-700`. Use flat `bg-blue-600 dark:bg-blue-500`.
- Hard ban: gradient on active chip `from-blue-600 to-indigo-600`. Use flat `bg-blue-600`.
- Hard ban: gradient on send/stop buttons `from-red-500 to-red-600` / `from-blue-600 to-blue-500`. Use flat colors.
- Hard ban: decorative blur orb behind every AI message. Delete element + `overflow-hidden` it requires.
- Hard ban: glassmorphism on chip `bg-white/90 backdrop-blur-md`. Use opaque `bg-white dark:bg-[#18181b]`.
- Hard ban: glass on context ribbon `bg-white/70 backdrop-blur-xl`. Use opaque.
- Hard ban: typewriter/shimmer/pulse fake-typing caret. Delete; rely on streaming text + role.
- Motion: message entrance spring on `x` + `scale: 0.95` (flashing during stream). Change to `opacity:0,y:4 → opacity:1,y:0` duration 150ms.
- Motion: property card stagger `delay: pi*0.07` (up to 650ms total). Remove delay.
- Motion: chip group stagger 0.15/0.2 + 300ms = 500ms before clickable. Remove delay, 150ms duration.
- Motion: chip picker `height: auto` + `marginTop` layout-animates (reflow). Animate `opacity` + `scaleY` only on fixed container.
- Motion: context-ribbon exit `width: 0` layout-animates. Use `opacity:0 scale:0.9` only.
- Global `prefers-reduced-motion` missing: add block to globals.css.

### Satellite components (Chips, StatusSteps, etc.)
- Chip toggle missing aria-pressed / role.
- StatusSteps no `role="status"`.
- PropertyQuickActions unused props (stage, onDetailOpen, etc). Delete from Props.
- Re-engagement banner: 5s auto-dismiss on high-value recovery. Change to `Infinity` + explicit dismiss, or render inline above input.
- MessageBubble re-renders: inline `components` object for ReactMarkdown recreated every token (destroys identity, forces re-parse). Hoist to module constant, memoize variant callbacks.
- Plugin arrays `remarkPlugins` / `rehypePlugins` new each render: same destroy. Hoist.
- `parseResponseBlocks` unmemoized on every non-stream render. Memoize.
- Streaming markdown re-parsed every token with no throttle. Throttle displayContent (~60ms).
- Array allocation: `const combinedChips = [...chips]` defeats identity check. Use `chips` directly.
- Sibling array literal: `chips={(message.chips as any) ?? (... ? ... ?? [] : [])}` fresh each render. Hoist `const NO_CHIPS = []`.
- Memo short-circuit: `if (prev.isLast || next.isLast) return false` forces re-render on every parent change. Compare actual fields.
- Prop identity: inline no-op arrow `onAskAI={() => {}}` on every ProjectCard. Hoist `const NOOP = () => {}`.
- JSX allocation: `quickActions={<PropertyQuickActions />}` per card. Pass props, let ProjectCard render, or memoize per `p.id`.
- Chips object array literal: four follow-up objects inline array literal. Hoist.
- Sort mutation: `deduped.sort(...)` mutates filtered output. Use `[...deduped].sort(...)`, guard `priority ?? 999`.
- Schema safety: `const safeDefaultSchema = defaultSchema || {}` — empty allows-all sanitizer silently. Fail loudly.
- Hard ban: rehypeRaw + custom schema without re-verifying `clobberPrefix` / `protocols`. Assert at module load that schema bars scripts.
- Duplicate logic: `buildPickerMessage` called with `[p]` and `multi-select selected`, but deref without guard on `selected[0]` (can be empty after filter). Add guard.
- Inverted expand flag: `const isOpen = isLastProperties ? !isExpanded : isExpanded` inverts flag for latest block. Use uniform logic, seed Set on results arrive.
- Dead code thinking label: `buildAdaptiveThinkingLabel(message.content ?? undefined, ...)` called inside `!message.content` branch (always empty). Should receive `message.userQuery`.
- Typo: `/invest|invest|appreciation|roi/` duplicates `invest`. Fix regex.
- Legacy field: persona chips gate on `message.properties?.length` (old field) instead of `exactResults + nearbyResults`. Update check.
- Same legacy: shortlist re-surface uses old field. Update.
- Chips not disabled during submit: `SuggestionChipGroups` rendered without `isDisabled` prop, stays clickable during `isSubmitting`. Pass flag.
- Dropdown debounce: 500ms click debounce via `lastClickRef` swallows second tap on different chip AND dropdown close. Skip debounce when `hasDropdown`.
- Icon library collision: `ChipPicker` imports `CaretDown` from `@phosphor-icons/react` (second library), rest use lucide. Use `ChevronDown` from lucide.
- Dead import: `ConversationState` unused at ContextRibbon:5. Delete.
- Dead props: `PropertyQuickActions` Props declares five unused fields (stage, onDetailOpen, etc.). Delete.
- A11Y label: `<button>` in `PropertyQuickActions` missing `aria-label` unlike siblings. Add.
- Motion: banner `duration-500` entry/hover. Change to 200ms.

**Changed:** Structural: extract `MessageBubble` into 12+ components (streaming render, content types, actions). Complexity rework, not UX change — all affordances stay the same.

**Success criteria:**
- Streaming announces once per completion, not per token.
- All contrast ≥4.5:1 / 3:1.
- Network failures show retry.
- Touch targets ≥44px.
- `prefers-reduced-motion` guarded globally.
- No hard bans (gradients, glass, blur, layout animations).
- Re-render optimized (memos, hoisted objects).
- Message reasoning + trade-off always visible.
- No fabricated confidence/scores without basis.

**Impeccable commands:** `/impeccable audit components/chat/` (a11y + contrast + motion), `/impeccable optimize` (re-renders + motion), `/impeccable clarify` (copy consistency).

---

## 7–13. Cards, Detail Panel, Modals (Grouped)

**Scope:** ProjectCard, PropertyCard, PropertyCardWithRecommendation, ProjectDetailPanel + 6 tabs, CallbackModal, SiteVisitScheduler, ShareShortlistModal, Modals summary.

Given space, these 8 units break into separate sections. Here, summary by category:

### Card Components (ProjectCard, PropertyCard, PropertyCardWithRecommendation)
- **Reasoning gaps:** `matchReason` / trade-off never rendered in three variants. Add visible WHY + one-line PRIMARY TRADE-OFF.
- **Fabricated precision:** match%, confidence%, rating% printed bare. Either delete badges or render methodology.
- **A11Y:** clickable `<div onClick>` not focusable, keyboard-unreachable. Change to `<Link>` or wrap in button.
- **Nested interactive elements:** save/Ask/call buttons inside click-handling card — invalid nesting. Move to sibling action bar.
- **Save button:** no `aria-pressed` / `aria-label`, state via icon weight alone. Add both.
- **Carousel:** prev/next/dots have no `aria-label`, dots not `onClick` — decorative controls that look interactive. Wire or hide.
- **Touch targets:** dots 6px, carousel prev/next 28px under 44px. Wrap/raise.
- **Hard bans:** nested cards (card-in-card), gradient text, glassmorphism, identical card grid, hero-metric template. Rewrite each.
- **Consistency:** ProjectCard vs PropertyCard vs PropertyCardWithRecommendation: radii vary, elevation varies, image ratio hardcoded three ways, dark-bg three ways, save icon three ways, RERA treatment three ways, status placement three ways, price font/size three ways. Extract one `<ReraBadge>`, one `<StatusPill>`, one carousel component; make `PropertyCardWithRecommendation` render `<ProjectCard variant="hero">`.
- **Duplicated logic:** `useBhkGroups`, `useSaveProject`, carousel logic identical in two files. Extract shared hooks + component.
- **Number formatting:** `price_range_label` rendered verbatim; no validation that it uses Indian grouping. Use shared formatter, fallback when absent.
- **Overflow:** long names truncated at 320px; two-column grid at mobile. Use `line-clamp-2` + `grid-cols-1 sm:grid-cols-2`.
- **Dead code:** `activeUrl` destructured, never used.
- **Comparison table:** `starsCount()` invents 3/5 for unknown labels (fallback 3). Delete; render label text, return `null` when absent. Same for `deriveRisk()` synthetic LOW/MED/HIGH.
- **Hard ban:** hero-metric header with solid color block + emoji chip + uppercase eyebrow. Replace with plain text: eyebrow at 11px, heading at 15px font-semibold.
- **Hardcoded promo:** unit "Best Value" / "Most Preferred" badges statically assigned. Delete or compute from data.

### ProjectDetailPanel + Tabs (8 files)
- **Trust surface:** RERA not shown as verifiable link; negatives hidden behind toggle; missing data shown as `—` (ambiguous: unknown vs. absent). Render RERA number + UP-RERA link always, show `why_avoid` adjacent to `why_buy`, replace `—` with "Not disclosed" + explanation.
- **Tab state:** not in URL, refresh lands on Overview always. Use `useSearchParams()` + `router.replace`, seed from URL.
- **Tab A11Y:** no `role="tablist"` / `role="tab"` / `aria-selected` / `aria-controls` / arrow-key nav. Add all, plus focus management on tab switch.
- **Tabs mobile:** tab buttons icon-only below 640px, no `aria-label`. Add labels.
- **A11Y modals:** detail modal no `role="dialog"` / `aria-modal` / focus trap / focus restore / Escape. Add all.
- **Tab skip:** on every tab switch, modal skips content to top but never moves focus. Add `panelRef.current?.focus()`.
- **Motion:** `AnimatePresence mode="wait"` unmounts/remounts every tab (re-parses intelligence data, re-runs dynamic import). Drop motion or keep mount + visibility-hide.
- **Nested cards:** outer card contains cards on every tab (card-in-card on desktop). Flatten: section with heading + `border-t` separators, no inner backgrounds/radius.
- **Hard bans:** gradient text (project name), glassmorphism, decorative blur blobs, identical card grids (4–6 tiles per section), hero-metric template (big number + label + stats).
- **State completeness:** loading skeleton not matching real layout; empty state missing explanation; error state absent (failed fetch → "No data" indistinguishably). Add skeleton per tab, empty prose, error banner + retry.
- **Fabricated precision:** `dbIntel.total || 0` renders dial at 0 when absent. Gate entire dial on `primary_thesis` present. Same: every "Intelligence" score hardcoded as "Verified" despite unverified basis; grading heuristic dressed as scale; confidence number with no stated basis.
- **Comparison table:** nested inside outer card; duplicate heading; project columns fixed `w-[160px]` (≠160px across files); Feature column unsorted; footer "Winner" has no semantics. Add `sticky left-0` first column, single `<th scope="col">` heading, semantic `<td>` vs winner marking.
- **Charts:** no accessible text alternative, no `aria-label`. Wrap in `<figure>` with `<figcaption>` + visually-hidden `<table>` of same data.
- **Form inputs:** no labels, no `autoComplete`, no validation, no field-level errors. Pair each with `<label>`, add auto-complete, gate submit on field-level pass.
- **Number formatting:** lakh/crore, per-sqft inconsistent (Western grouping, unrounded, `toLocaleString()` without `'en-IN'`, Y-axis thousands as `k` float). Use shared `inr()` formatter everywhere, axis as lakh.
- **Contrast:** `text-gray-400` on white = 2.54:1 everywhere (needs 4.5:1); `dark:` variants missing so dark-mode text is same gray on dark bg (3–4:1, fails). Raise all muted text to `text-gray-600 dark:text-gray-300`, timestamps/labels to `text-gray-500 dark:text-gray-400`.
- **Dark mode:** many components light-only (white card on white body = invisible in dark mode). Add `dark:` variants.
- **Invalid Tailwind:** `text-gray-650`, `text-gray-450`, `dark:border-gray-850` don't exist. Use real tokens.
- **Overflow mobile:** fixed `w-[150–220px]` horizontal scroll sections at 320px show overflow with no affordance. Add `snap-x snap-mandatory`, fade right edge, or reflow to full-width single column at mobile.
- **Text overflow:** `truncate` on long heading; two-column grid compresses to unreadable. Use `line-clamp-2` + `grid-cols-1 sm:grid-cols-2`.
- **Duplication:** PropertyDetailView (181 lines, zero importers, dead), CompetitorsTab (84 lines, zero importers, data never rendered), PricingTab (602 lines, ~95% clone of ResidencesTab with different fallbacks). Delete or consolidate.
- **Dead code:** `timelineAdvice`, `negotiationLeverage`, `walkAwayConditions`, `marketVisible` passed and declared but never destructured. Either render or remove.
- **Debug:** three `console.log` calls dump decision profile. Delete or gate.
- **Hardcoded data:** "Elite X" fallback builder name. Replace with generic.
- **Runtime errors:** `next/image` throws when src="", map render gated on presence. `project.lat || SECTOR_CENTROID...` pins map to hardcoded location when project has no location. Render "Not published" instead, or filter POIs to those with coordinates.

### Modals (CallbackModal, SiteVisitScheduler, ShareShortlistModal, LeadSuccessModal)
- **Modal semantics:** no `role="dialog"` / `aria-modal` / `aria-labelledby` anywhere. Add to all four.
- **Focus management:** focus never moved to modal on open; never restored on close. Add `ref + .focus()` on mount, store trigger element, restore on unmount.
- **Escape handler:** none on any modal. Add global listener, close on Escape.
- **Body scroll lock:** not locked on any modal. Add `document.body.style.overflow = 'hidden'` on mount, restore on unmount.
- **Focus trap:** none. Wrap in trap (react-focus-lock or manual cycle first/last-tabbable).
- **Backdrop click:** works on some (CallbackModal, ShareShortlistModal) but doesn't confirm if form dirty (discard filled form with no warning). Add check, warn if unsaved.
- **Close button:** icon-only `×` without aria-label (or missing entirely on LeadSuccessModal). Add `aria-label="Close"`, replace glyph with icon.
- **Form UX:** phone validation = submit-only, no field-level, no 10-digit check, no `+91` strip. Add `onChange` parsing: `phone: value.replace(/\D/g, '').slice(-10)`, gate on 10 digits + `[6-9]` first.
- **Error display:** raw backend strings leak ("AuthApiError..."). Map to user sentences, render under field with `role="alert"`.
- **Consent copy:** callback modal says who calls + when + retention only for callback. Site-visit missing all three. Add full consent block to both.
- **Copy tone:** "Guaranteed zero spam", "Priority line" (invented sales language); "Verified Lead" internal jargon (shows to user). Rewrite to advisor voice.
- **Copy button:** failure swallowed (clipboard blocked on iOS private-mode Safari). On catch, render fallback `<input readonly>` with copy-manually instruction.
- **Share flow:** no `navigator.share` path (WhatsApp is dominant India channel). Add: `if (navigator.share) { share(...) } else { clipboard fallback }`. WhatsApp button currently gated on env var (no value = button missing). Drop gate, always render.
- **Share success:** emoji-only announcement (✅ Link Copied!) inside button label, announced only if focus stays on button. Add `role="status" aria-live="polite"` sibling with text announcement.
- **Share preview:** shows raw text payload instead of OG card preview. Replace with card mockup: "They'll see a preview card on WhatsApp with project names and prices."
- **Touch targets:** form buttons `py-2.5` (38px), `py-1.5` (26px), icon-only buttons `size={12}` to `size={16}` (12–16px) all under 44px. Raise all to `min-h-11`, pad icons appropriately.
- **Hard bans:** glassmorphism backdrop blur on both modals; decorative glass pill; nested cards (property context + consent block inside modal panel).
- **A11Y inputs:** no `<label>` + `id` pairing; no `autoComplete`; no `inputMode` on phone (Android keyboard wrong type). Add all three.
- **A11Y controls:** chips/toggles no `aria-pressed`; tab/group controls no `role="radiogroup"` / `role="radio"` / arrow-key nav.
- **A11Y live regions:** success state not announced; error not announced; loading state shows spinner-only text.
- **Copy consistency:** three names for the same team ("verification team" vs "compliance team" vs "Our verification team"); two timelines ("within 2 hours" vs "within 2–3 business days"); success message has hyphen vs. en-dash inconsistency.
- **Contrast:** placeholders `text-gray-400` (2.54:1), trust footer `text-[11px] text-zinc-400` (2.6:1), disabled submit label `text-slate-400` (2.0:1 both modes). Raise all to 4.5:1 minimum + 11px minimum.
- **Numbers:** dates, times, counts not formatted Indian-style. Use shared formatter.
- **Duplication:** LeadSuccessModal + CallbackModal success views duplicated with contradicting promises ("within 2 hours" vs "within 2 business hours"). Consolidate to one message.
- **Modal-as-first-thought:** LeadSuccessModal stacked on SiteVisitScheduler (z-[60] → z-[70]). Replace with step inside existing panel (inline success view) like CallbackModal does.
- **Unresponsive:** fixed widths, horizontal scroll, tables with no overflow container.

**All surfaces changed:** structural refactors (extraction, consolidation), no UX change. Full a11y remediation, contrast pass, number formatting, consistency.

**Success criteria (grouped):**
- All cards show reasoning + primary trade-off.
- No fabricated scores without methodology.
- All modals semantic + focus-managed + escape-dismissible + scroll-locked.
- All forms: field-level validation, error announced, inputs labeled + auto-complete.
- Tabs: state in URL, arrow-key navigable, focus managed.
- Charts: accessible alternatives.
- Comparison table: single heading, sticky first column, semantic markup.
- All contrast ≥4.5:1 / 3:1, dark mode variants.
- All touch targets ≥44px.
- Number formatting unified to Indian grouping.
- No nested cards, hard bans, or dead imports.

**Impeccable commands:** `/impeccable audit components/` (a11y + contrast + modals), `/impeccable clarify` (copy + modal language), `/impeccable adapt` (responsive grids/overflow).

---

## Change vs. Refine Matrix

| # | Surface | File(s) | Component Type | Status | Scope | Rationale |
|---|---|---|---|---|---|---|
| 1 | Landing | `app/page.tsx` | Brand hero | **Refine** | A11y, contrast, eyebrow ban, animation-gating, skip-link | Decision stakes low; existing layout + messaging work; no UX pivot |
| 2 | Signin/Signup | `app/auth/page.tsx` | Product form | **Refine** | A11y labels, contrast, validation messages, form state, copy tone | Auth flow unchanged; refinements raise trust signal; password flow stays same |
| 3 | Builder Register | `app/builder-register/page.tsx` | Brand form | **Refine** | A11y, validation, copy, form UX, touch targets, decorative removal | 6-step flow unchanged; refinements move input from submit-only to per-step; honesty on data loss |
| 4 | Discovery (`/discover`) | `app/discover/page.tsx` + `[sessionId]` | Product chat | **Refine** | A11y streaming, error recovery, state persistence, guest-token unification | Conversation flow unchanged; persistence prevents data loss; no UI pivot |
| 5 | Sidebar | `components/Sidebar.tsx` | Product chrome | **Refine** | A11y nav, modal drawer, contrast, touch targets, mobile state | Navigation unchanged; refinements = accessibility + mobile readiness |
| 6 | Header | `components/Header.tsx` | Product chrome | **Refine** | A11y, z-index scale, theme toggle, touch targets, status dot | Chrome unchanged; refinements = focus + semantic z-levels |
| 7 | Chat Flow/Conversational | `components/DiscoveryContent.tsx` | Product logic | **Refine** | A11y streaming, draft/scroll persistence, guest-token fix, error handling | Conversation UX unchanged; fixes = state preservation + error clarity |
| 8 | Message Bubble | `components/chat/MessageBubble.tsx` | Product core | **Change** + **Refine** | Extract 12+ components, optimize re-renders, fix reasoning gaps, ban hard graphics | File at 1060 lines = architectural refactor needed; no UX change but structure fixes complexity debt |
| 9 | Chips & Picker | `components/chat/SuggestionChip.tsx` + `ChipPicker.tsx` | Product interactions | **Refine** | A11y focus + dropdowns, touch targets, motion gates, keyboard nav | Chip sending unchanged; refinements = keyboard access + touch friendliness |
| 10 | Project Cards | `ProjectCard`, `PropertyCard`, `PropertyCardWithRecommendation` | Product listing | **Change** + **Refine** | Consolidate to one component + slot system, add reasoning + trade-off rendering, ban nesting | Three variants with 120 duplicated lines; change = abstraction, refine = reasoning visibility |
| 11 | Detail Panel | `ProjectDetailPanel.tsx` + 6 tabs | Product deep-dive | **Change** + **Refine** | Tab state to URL, A11y dialog/tabs, RERA always visible + verifiable, flatten nested cards, add empty/error states | Panel structure + data integrity change = URL-driven tabs + RERA link always; refine = state + a11y |
| 12 | Modals | `CallbackModal`, `SiteVisitScheduler`, `ShareShortlistModal`, `LeadSuccessModal` | Product lead-capture | **Refine** | A11y dialog semantics, form validation, consent language, focus management, touch targets | Modal flows unchanged; refinements = accessibility + trust + mobile UX |
| 13 | Admin & Saved | `app/admin/*`, `app/saved/page.tsx`, `app/compare/page.tsx` | Product tools | **Refine** | A11y, contrast, dark mode, empty/error states, remove dead routes | Tool flows unchanged; refinements = A11y + completeness |

**Notes:**
- **Refine:** existing code + polish, no UX or architectural change.
- **Change:** structural refactor (MessageBubble extraction, card consolidation, detail tabs to URL, nested card flattening) — same UX, better arch.
- **Both:** 3 surfaces (ProjectCard, DetailPanel, chat surface) need both change (arch) and refine (a11y + polish).
- **No blocked dependencies:** surfaces are independent; refines can ship in any order, changes can be bundled by team.
