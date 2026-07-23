# RealtyPals — Chat, Share & Security Hardening Audit

**Version:** 1.0
**Date:** 2026-07-22
**Auditor lens:** senior developer + senior marketing + PM + category manager + cost engineer
**Who runs the fixes:** any coding model, including small ones (Haiku). Every task card is self-contained: VERIFY FIRST → exact change → DONE test → rollback.

> **Golden rule:** every task starts with a `VERIFY FIRST` grep. If real output does not match, **STOP** and log under "Discovered drift". The code may have changed since this was written.

---

## 0. What was already verified DONE (do not touch)

Confirmed by reading live code on 2026-07-22:

| Area | Status | Evidence |
|---|---|---|
| Prompt-injection filter | ✅ DONE | `sanitize.ts` — NFKD normalize, zero-width strip, pattern block, 2000-char cap |
| SSE error mapping | ✅ DONE | `backend-api.ts:114-126` maps 429/401/403 to friendly copy |
| SSE parse safety | ✅ DONE | `backend-api.ts:150` swallows parse errors, never crashes UI |
| Chip dedup | ✅ DONE | `MessageBubble.tsx:122-129` normalizes label, caps at 4 |
| AI cost persistence | ✅ DONE | `AiUsageEvent` table + `cost.ts recordUsage()` (migration deployed) |
| Per-user daily budget | ✅ DONE | `chat.ts` 429 guard via `isOverDailyBudget()`, `$0.50/day` default |
| Lead enrichment | ✅ DONE | `leadProfile.ts` — all UserMemory fields verified present in schema |
| Webhook signing + retry | ✅ DONE | `leads.ts:181-198` HMAC-SHA256, 1 retry, 5s timeout |
| Secret-in-logs | ✅ DONE | grep clean — only presence booleans logged, never values |

**Bottom line:** the backend is genuinely solid. The real remaining risk is on the **frontend render path** (one XSS vector) and **share** (a broken link + a missing growth feature).

---

## 1. Findings (ranked)

| # | Severity | Area | Problem | Task |
|---|---|---|---|---|
| 1 | **P0** | Chat render | AI markdown rendered with `rehypeRaw` and **no sanitizer** — raw HTML executes. A poisoned property description echoed by the model = stored XSS. | [TASK A](#task-a) |
| 2 | **P1** | Share | `ShareCard.tsx:22` builds the URL from `property.id`, but the route resolves by **slug** → every ShareCard link 404s / OG unfurl fails. | [TASK B](#task-b) |
| 3 | **P1** | Chat reliability | No client-side stall watchdog. If the server hangs mid-stream, the streaming cursor spins **forever** with no error or retry. | [TASK C](#task-c) |
| 4 | **P1** | Leads / auth | `/callback` requires **no auth**, but CLAUDE.md says callback needs signup, and `/site-visit` **does** enforce it. Inconsistent + spammable. | [TASK D](#task-d) |
| 5 | **P1** | Share (growth) | You can only share **plain text**. No shareable link that renders a preview and lets the receiver **continue exploring**. This is the single biggest growth gap. | [TASK E](#task-e) |
| 6 | **P2** | Data hygiene | `MessageBubble.tsx:796` ships a `console.log('[CHIPS_RENDER]'...)` to production on every AI message — leaks internal state to the browser console. | [TASK F](#task-f) |
| 7 | **P2** | Robustness | `ShareShortlistModal.tsx:66` clipboard write has **no catch** → button stuck if clipboard denied. `price_range_label`/`size_sqft` can render `undefined`. | [TASK G](#task-g) |

---

## 2. Executable task cards

<a name="task-a"></a>
### TASK A — Sanitize AI-rendered HTML (kill the XSS vector) `P0`

**Why:** `MessageBubble.tsx` renders the streaming AI response with `ReactMarkdown` + `rehypeRaw`. `rehypeRaw` turns raw HTML strings into live DOM. The model's context includes property descriptions, builder blurbs, and web-search snippets — any of which could contain `<img src=x onerror="fetch('/api/steal?c='+document.cookie)">`. Top AI providers (ChatGPT, Claude, Gemini) all sanitize rendered markdown. We must too.

**VERIFY FIRST:**
```bash
grep -n "rehypeRaw\|rehype-raw\|rehype-sanitize" frontend/components/chat/MessageBubble.tsx
# EXPECT: rehypeRaw imported (line ~19) and used in rehypePlugins (line ~408). No rehype-sanitize.
# If rehype-sanitize is already present, STOP — this is done.
```

**Step 1 — install the sanitizer:**
```bash
cd frontend && npm install rehype-sanitize
```

**Step 2 — import it.** In `frontend/components/chat/MessageBubble.tsx`, next to the `rehypeRaw` import (line ~19):
```ts
import rehypeRaw from 'rehype-raw'
```
add below it:
```ts
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'

// Allow our custom render tags + table markup, block everything else (scripts, event handlers, iframes).
const REALTY_SCHEMA = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), 'realty-chart', 'realty-box'],
  attributes: {
    ...defaultSchema.attributes,
    'realty-chart': ['type', 'data', 'title'],
    'realty-box': ['type', 'title'],
  },
}
```

**Step 3 — add sanitize AFTER raw in the plugin chain.** Find (line ~407-408):
```tsx
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
```
replace with:
```tsx
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, [rehypeSanitize, REALTY_SCHEMA]]}
```
Order matters: `rehypeRaw` parses the HTML, then `rehypeSanitize` strips anything dangerous. Sanitize must come **second**.

**DONE test:**
```bash
cd frontend && npx tsc --noEmit   # EXPECT: clean
grep -n "rehypeSanitize" frontend/components/chat/MessageBubble.tsx   # EXPECT: import + in rehypePlugins
```
Functional: send a chat message and confirm a normal AI reply (with **bold**, tables, a realty-box) still renders. Charts/boxes must still appear.

**Rollback:** revert the two edits, `npm uninstall rehype-sanitize`.

---

<a name="task-b"></a>
### TASK B — Fix ShareCard link (id → slug) `P1`

**Why:** the property page route is `/property/[slug]` and the page fetches `${API_BASE}/projects/${slug}`. `ShareCard.tsx:22` builds the URL with `property.id`, so every link it produces points at a non-existent slug → 404 + no OG preview. `ProjectCard.tsx:139` already uses `project.slug` correctly — copy that.

**VERIFY FIRST:**
```bash
grep -n "property/\${property.id}\|property/\${property.slug}" frontend/components/ShareCard.tsx
# EXPECT: line ~22 uses property.id. If it already uses slug, STOP.
grep -n "slug" frontend/types/property.ts
# EXPECT: Property type has a slug field. If NOT, log under Discovered drift and STOP (needs a type change first).
```

**Change.** In `frontend/components/ShareCard.tsx`, line ~22:
```ts
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/property/${property.id}` : '';
```
to:
```ts
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/property/${property.slug}?ref=share` : '';
```

**DONE test:**
```bash
cd frontend && npx tsc --noEmit   # EXPECT: clean (fails if Property has no slug — then STOP, log drift)
```
Functional: open ShareCard on a property, copy link, paste in a new tab → the property page loads (not 404).

**Rollback:** revert the one line.

---

<a name="task-c"></a>
### TASK C — Client-side stream stall watchdog `P1`

**Why:** the backend has `GroqStreamStallError`, but the **client** has none. If the connection silently stalls after headers (proxy drop, server GC pause, mobile network flap), `reader.read()` never resolves — the user watches a blinking cursor forever. A watchdog that aborts after N seconds of silence and surfaces a retry is what makes it feel "never breaks".

**VERIFY FIRST:**
```bash
grep -n "getReader\|setTimeout\|watchdog\|inactivity" frontend/lib/backend-api.ts
# EXPECT: getReader present (~line 128), NO inactivity timer. If a watchdog already exists, STOP.
```

**Change.** In `frontend/lib/backend-api.ts`, inside the streaming `.then(async (res) => {` block, replace the read loop (lines ~128-153):
```ts
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      ...
    }
    options.onDone?.()
```
Wrap each read in a timeout race. Replace the `while (true) { const { done, value } = await reader.read(); if (done) break; ... }` header with:
```ts
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const STALL_MS = 20000 // no bytes for 20s = dead stream

    while (true) {
      let readResult: ReadableStreamReadResult<Uint8Array>
      try {
        readResult = await Promise.race([
          reader.read(),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error('STALL')), STALL_MS)),
        ])
      } catch {
        reader.cancel().catch(() => {})
        options.onEvent({ type: 'error', message: 'The advisor stopped responding. Please try again.' })
        break
      }
      const { done, value } = readResult
      if (done) break
      // ...keep the existing buffer/parse body unchanged...
    }
    options.onDone?.()
```
Keep the existing buffer-split/parse logic (lines ~136-151) exactly as-is inside the loop.

**DONE test:**
```bash
cd frontend && npx tsc --noEmit   # EXPECT: clean
```
Functional (optional): throttle network to offline mid-stream in devtools → within 20s you see "The advisor stopped responding" instead of an endless cursor.

**Rollback:** restore the original read loop.

---

<a name="task-d"></a>
### TASK D — Enforce auth on /callback (consistency + anti-spam) `P1`

**Why:** CLAUDE.md: "Signup Required For: Callback request." `/site-visit` enforces it (`leads.ts:116`), `/callback` does not — anyone can POST unlimited fake callbacks. Either enforce auth **or** consciously decide callbacks stay anonymous for conversion. **Ask the product owner which** — do not assume. If anonymous is intended, at minimum add rate limiting.

**⚠️ This changes product behavior. Confirm intent before editing.**

**VERIFY FIRST:**
```bash
sed -n '49,64p' backend/src/routes/leads.ts
# EXPECT: /callback handler resolves userId but does NOT 401 when absent, and has no checkRateLimit.
```

**Option 1 (enforce auth) — if product says callback needs signup:** mirror `/site-visit`. After `const userId = (await verifyUser(req)) ?? undefined` add:
```ts
  if (!userId) { res.status(401).json({ error: 'Please sign in to request a callback.' }); return }
  const rl = await checkRateLimit(`callback:${userId}`, 5, 3600)
  if (rl.remaining <= 0) { res.status(429).json({ error: 'Too many requests' }); return }
```

**Option 2 (keep anonymous, add throttle) — if product wants friction-free leads:** rate-limit by IP instead:
```ts
  const rl = await checkRateLimit(`callback:${clientIp(req)}`, 5, 3600)
  if (rl.remaining <= 0) { res.status(429).json({ error: 'Too many requests' }); return }
```
(import `clientIp` from `../lib/request` and `checkRateLimit` is already imported).

**DONE test:** `cd backend && npx tsc --noEmit` clean; a 6th callback within an hour returns 429.

**Rollback:** remove the added guard.

---

<a name="task-e"></a>
### TASK E — Shareable shortlist/conversation link (growth) `P1` `~3–4 h`

**Why (marketing):** share is how the product spreads. Today the user can only copy **plain text** ("1. Godrej Woods — ₹1.2Cr"). The receiver gets no clickable link, no preview card, no way to open it and keep exploring. Every top consumer product (Spotify, Notion, Airbnb) shares a **link that unfurls into a rich card and drops the receiver into a live view**. That is the loop we're missing.

**The target experience:**
1. User taps "Share shortlist" → we persist the shortlist under a short id and copy a link like `realtypals.com/s/AB12CD`.
2. The link unfurls in WhatsApp/iMessage with an OG card ("Rahul's 3-property shortlist in Noida · via RealtyPal AI").
3. Receiver opens it → sees the 3 properties as cards + a one-tap **"Ask RealtyPal about these"** CTA that starts their own chat seeded with the shortlist.

**This is a feature, not a patch — scope it as its own phase.** Minimum lazy version that still delivers the loop:

- **Backend:** one table `SharedShortlist { id (short), slugs String[], created_at }` + `POST /api/v1/share` (returns short id) + `GET /api/v1/share/:id`. (⛔ migration — human gate.)
- **Frontend route:** `app/s/[id]/page.tsx` that fetches the shortlist, renders the property cards, and has the "Ask RealtyPal about these" button. Add `app/s/[id]/opengraph-image.tsx` mirroring the existing property OG image for the unfurl.
- **Wire:** `ShareShortlistModal` calls `POST /api/v1/share`, then copies the returned link instead of plain text.

**Do NOT gate the receiver view behind signup** — that kills the viral loop. Signup only when the receiver takes a high-intent action (save/callback), per CLAUDE.md.

**Ship note:** this reuses the existing OG-image pattern (`property/[slug]/opengraph-image.tsx`) and card components — no new rendering stack. Estimate 3–4h. Full task breakdown belongs in a dedicated plan; flag it to the human before building.

---

<a name="task-f"></a>
### TASK F — Remove production debug log `P2`

**VERIFY FIRST:**
```bash
grep -n "CHIPS_RENDER" frontend/components/chat/MessageBubble.tsx
# EXPECT: one console.log around line 796. If gone, STOP.
```
**Change.** In `MessageBubble.tsx`, the IIFE around line 794-797:
```tsx
      {(() => {
        const shouldShow = message.type === 'ai' && displayContent && isLast && !isSubmitting && combinedChips.length > 0;
        if (message.type === 'ai' && isLast) console.log('[CHIPS_RENDER]', { messageType: message.type, displayContent: !!displayContent, isLast, isSubmitting, chipsLen: combinedChips.length, shouldShow });
        return shouldShow;
      })() && (
```
Delete the `console.log` line only:
```tsx
      {(() => {
        const shouldShow = message.type === 'ai' && displayContent && isLast && !isSubmitting && combinedChips.length > 0;
        return shouldShow;
      })() && (
```
**DONE test:** `grep -n "CHIPS_RENDER" frontend/components/chat/MessageBubble.tsx` → no matches. `npx tsc --noEmit` clean.

**Rollback:** re-add the line.

---

<a name="task-g"></a>
### TASK G — Share modal resilience `P2`

**VERIFY FIRST:**
```bash
grep -n "clipboard.writeText" frontend/components/ShareShortlistModal.tsx
# EXPECT: line ~66, a .then() with no .catch().
```
**Change.** In `ShareShortlistModal.tsx` line ~65-67:
```tsx
              onClick={() => {
                navigator.clipboard.writeText(shortlistText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
              }}
```
to:
```tsx
              onClick={() => {
                navigator.clipboard.writeText(shortlistText)
                  .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
                  .catch(() => { /* clipboard blocked (non-HTTPS / perms) — leave button state unchanged */ })
              }}
```
Also guard the `undefined` render (line ~19 and ~46): change `${p.price_range_label} (${p.sector})` to `${p.price_range_label ?? 'Price on request'} (${p.sector ?? 'Noida'})` in both the string builder and the JSX.

**DONE test:** `npx tsc --noEmit` clean; a property with no price label shows "Price on request", not "undefined".

**Rollback:** revert.

---

## 3. The five lenses (roast + ratings)

Scored 1–10, blunt.

| Thing | Score | Verdict |
|---|---|---|
| **Chat render pipeline** | 6/10 | Beautiful UI, staged loading, streaming cursor — genuinely premium. But `rehypeRaw` with no sanitizer is a real XSS hole. Fix TASK A and this jumps to 9. |
| **Chat reliability** | 7/10 | SSE error mapping is professional. Missing only a client stall watchdog (TASK C). Once added, this handles failure like the big providers. |
| **Chips / bubbles** | 8/10 | Dedup, card-selector, picker modal, long-press context menu — thoughtful. One stray debug log. Solid. |
| **Callback flow** | 7/10 | Enrichment + scoring is a genuine edge over portals. The no-auth `/callback` inconsistency (TASK D) is the weak spot. |
| **Share** | 4/10 | Property share works (after TASK B). But "share = plain text" is a decade behind. No link unfurl for shortlists, no receiver continuation. This is where growth leaks out. TASK E is the highest-leverage build. |
| **Backend security** | 9/10 | Prompt-injection filter, HMAC webhooks, secret hygiene, cost caps. Boringly correct. Leave it. |
| **Cost guardrails** | 8/10 | Per-call token log + per-user daily cap now live. Add: route factual lookups to the cheap model, trim property JSON in prompts (both P2, measure first). |
| **Layman usability** | 6/10 | A power user thrives. A scared first-timer still faces a blank box. Persona opening chips ("I'm buying my first home" / "I'm upgrading" / "I'm investing") would lower the floor cheaply. |

**Overall: 7/10 — close to production.** One P0 (XSS) and one broken link (share id) are the only true blockers. Everything else is polish or growth.

---

## 4. Strategic read (PM + category manager)

**Will it win in India?** Yes, conditionally. The wedge is real: incumbents (99acres, MagicBricks, Housing) are ad-revenue listing dumps buyers are exhausted by. An honest AI advisor that narrows 100 → 5 with trade-offs is a genuine trust play. The chat UX already feels better than any Indian portal.

**Three lines to hold (unchanged from prior audit, still true):**
1. **Possession honesty** — show delivery track record; buyers forgive a 2027 date they chose, never one you hid.
2. **RERA verification, not just a badge** — verify numbers against the state registry on ingest. One fake listing reaching a buyer kills the brand.
3. **Noida density before geographic spread** — own one city completely before looking thin across five.

**The one thing that turns this from "nice demo" to "business":** instrument the lead funnel end-to-end (sent → builder-accepted → site-visit → closed). Without that number you cannot price the product to builders or prove value. The enrichment work already lays the data foundation — now surface it.

**Revenue model:** pure per-lead is a race to the bottom. The durable model is **exclusivity retainers** with 3–5 premium builders per city, where the qualified-lead tiering (HOT/WARM/COLD, already built) is the precondition that makes "we send you only serious buyers" sellable.

---

## 5. Launch checklist

```
[ ] TASK A — sanitize rehypeRaw (P0, XSS)          ← blocker
[ ] TASK B — ShareCard slug fix (P1)               ← blocker (broken links)
[ ] TASK C — client stall watchdog (P1)
[ ] TASK D — /callback auth decision (P1, ask product owner first)
[ ] TASK F — remove CHIPS_RENDER log (P2)
[ ] TASK G — share modal resilience (P2)
[ ] cd frontend && npx tsc --noEmit    # clean
[ ] cd frontend && npm run build       # passes
[ ] cd backend  && npx tsc --noEmit    # clean
```

**First week (growth):**
```
[ ] TASK E — shareable shortlist link + OG unfurl + receiver continuation (⛔ migration)
[ ] Persona opening chips (layman on-ramp)
[ ] Lead funnel dashboard (sent → accepted → site-visit)
[ ] Cheap-model routing for factual asks; trim property JSON in prompts
```

---

## Discovered Drift
_(If any VERIFY FIRST didn't match, log it here — file:line + one line. Do not fix inline.)_

- _(none yet)_

---

**Doc version 1.0 — chat/share/security audit, verified against live code 2026-07-22.**
**Fix the P0 (XSS) and the broken share link, add the stall watchdog, then build shareable links — that's the growth engine.**
