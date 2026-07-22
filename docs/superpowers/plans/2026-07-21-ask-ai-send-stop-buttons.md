# Implementation Plan — Send/Stop Button + Ask AI Button

**Date:** 2026-07-21
**Status:** Ready to implement
**Audience:** Any engineer or coding model. Every file path, line anchor, and exact code is given. Follow top to bottom.

---

## 0. Context (read before touching anything)

Four UI upgrades, independent of each other. Do them in any order. All frontend-only. No DB, no schema, no new dependencies. (Feature C reads the existing `/projects/:slug` API for share metadata but does not change the backend.)

**Feature A — Morphing Send/Stop button.** Today the chat input has a Send button (only when text is present) and a Mic button (when empty), plus a *separate* floating "Stop" pill that appears above the bar during streaming. We unify them: one button slot that morphs between **Stop → Send → Mic** based on state.

**Feature B — Ask AI prompt menu.** Today the "Ask AI" button on a project card prefills one generic sentence. We make it open a small menu of smart, property-specific prompts that auto-send.

**Feature C — Share button.** Today the shared link has no rich preview (client-only page, no Open Graph) and the card Share button is a no-op in chat. We add server-side metadata + a branded dynamic OG image so links unfurl beautifully, and make the card Share button use the native share sheet.

**Feature D — Contact / Call button.** Today the card Phone button is a no-op in chat. We wire it to the existing signup-gated `CallbackModal` (lead capture → sales handoff) and track the intent.

### Files involved

| File | Role |
|---|---|
| `frontend/components/DiscoveryContent.tsx` | Chat page. Holds input bar, Send/Stop/Mic buttons, the `realtypals:ask-ai` event listener, `dispatchAction` (send), `abortControllerRef` (stop), `isSubmitting` (streaming flag). |
| `frontend/components/ProjectCard.tsx` | Project card. Holds the "Ask AI" button (~line 285-298) and `onAskAI` prop. |
| `frontend/components/chat/MessageBubble.tsx` | Renders `ProjectCard` and defines the `onAskAI` handler that fires the CustomEvent (~line 684 and ~724). |
| `frontend/lib/analytics.ts` | `EventName` union. Already has `ask_ai_tapped`. |

### Key facts you must not break
- Every clickable inside the card **must call `e.stopPropagation()`** — the whole card is clickable (`onClick={handleCardClick}` opens the detail panel). Forgetting this opens the panel instead of the menu.
- The card is used in a responsive grid. The menu **must work on tap (mobile), not hover-only.**
- Sending is always `dispatchAction({ type: 'TEXT_MESSAGE', payload: { text } })`. Never call `fetch` directly.
- Stopping is always `abortControllerRef.current?.abort()`.

---

## FEATURE A — Morphing Send/Stop button

### A.1 Goal
One button in the input bar. Three states, in priority order:
1. **Streaming** (`isSubmitting === true`) → **Stop** button: red, filled square icon. Clicking aborts.
2. **Has text** (`chatInput.trim()` truthy) → **Send** button: dark pill, `ArrowUp` icon. Clicking sends.
3. **Empty & idle** → **Mic** button: existing voice input (unchanged behaviour).

Remove the separate floating "Stop" pill.

### A.2 Exact edit

File: `frontend/components/DiscoveryContent.tsx`

**Step 1 — Delete the floating Stop pill.** Find this block (currently ~line 1188-1199):

```tsx
        {isSubmitting && (
          <div className="flex items-center justify-end mb-4 px-2">
            <button
              type="button"
              onClick={() => abortControllerRef.current?.abort()}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 border border-gray-300 dark:border-gray-600 rounded-full transition-all shadow-sm"
            >
              <div className="w-2 h-2 bg-current rounded-sm" />
              Stop
            </button>
          </div>
        )}
```

**Delete the entire block.** (The `{rateLimitUntil && (...)}` block just above it stays.)

**Step 2 — Replace the button slot.** Find this block (currently ~line 1226-1255), which starts at the comment `{/* Send button when text present, Voice button when empty */}` and is the `{chatInput.trim() ? (...) : (...)}` ternary. Replace the **whole ternary** with a three-way conditional:

```tsx
          {/* Morphing action button: Stop while streaming → Send with text → Mic when empty */}
          {isSubmitting ? (
            <button
              type="button"
              onClick={() => abortControllerRef.current?.abort()}
              className="w-[36px] h-[36px] shrink-0 rounded-full flex items-center justify-center transition-all duration-300 bg-red-500 text-white shadow-[0_2px_8px_rgba(239,68,68,0.35)] hover:bg-red-600 hover:scale-105 active:scale-95 mb-0.5"
              title="Stop generating"
              aria-label="Stop generating"
            >
              <span className="w-3 h-3 rounded-[3px] bg-current" />
            </button>
          ) : chatInput.trim() ? (
            <button
              type="button"
              onClick={() => dispatchAction({ type: 'TEXT_MESSAGE', payload: { text: chatInput.trim() } })}
              className="w-[36px] h-[36px] shrink-0 rounded-full flex items-center justify-center transition-all duration-300 bg-black dark:bg-white text-white dark:text-black shadow-[0_2px_8px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 mb-0.5"
              title="Send"
              aria-label="Send message"
            >
              <ArrowUp size={18} className="text-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`w-[36px] h-[36px] shrink-0 rounded-full flex items-center justify-center transition-all duration-300 mb-0.5 ${isListening
                ? 'text-red-500 animate-pulse scale-105 bg-red-50 border border-red-200 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              title="Voice Input"
              aria-label="Voice input"
            >
              {isListening ? (
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 -m-1 rounded-full bg-red-100 animate-ping opacity-50" />
                  <Mic size={20} className="relative text-red-500 fill-current" />
                </div>
              ) : (
                <Mic size={20} />
              )}
            </button>
          )}
```

Notes:
- The Send and Mic branches are copied verbatim from the current code — only the Stop branch is new and the outer condition changed from 2-way to 3-way. `ArrowUp` and `Mic` are already imported; no new imports.
- The Stop icon is a CSS square (`<span>` with `rounded-[3px]`), matching the old pill's square glyph. No new icon import needed.
- Same `36px` size and `mb-0.5` keep vertical alignment identical.

**Step 3 — Do NOT change `disabled={isSubmitting}` on `PlaceholdersAndVanishInput`.** The textarea stays disabled during streaming (correct — user can't type mid-stream), and the Stop button sits outside it so it stays clickable.

### A.3 Verify Feature A
- Type text → dark Send (ArrowUp) shows. Click → message sends, input clears.
- While AI streams → button is red with a square. Click → stream stops (console logs `[CHAT:ABORT] stream aborted by user`).
- Empty + idle → Mic shows, voice input still works.
- No floating "Stop" pill appears above the bar anymore.

---

## FEATURE B — Ask AI prompt menu

### B.1 Goal
Tapping "Ask AI" on a card opens a compact popover of 4-5 property-specific prompts. Tapping a preset prompt **auto-sends** it to the chat. A final "Ask something else…" option just focuses the input without sending.

### B.2 Extend the CustomEvent contract (add `autoSend`)

Today `onAskAI` fires `realtypals:ask-ai` with `{ text }`. We add an optional `autoSend` flag so preset prompts send immediately while "Ask something else…" only prefills.

File: `frontend/components/DiscoveryContent.tsx` — the listener at ~line 421-430.

Replace:

```tsx
  // ── "Ask AI" button on PropertyCard injects text via CustomEvent ──
  useEffect(() => {
    const handler = (e: Event) => {
      const { text } = (e as CustomEvent<{ text: string }>).detail;
      setChatInput(text);
      setTimeout(() => chatInputRef.current?.focus(), 50);
    };
    window.addEventListener('realtypals:ask-ai', handler);
    return () => window.removeEventListener('realtypals:ask-ai', handler);
  }, []);
```

With:

```tsx
  // ── "Ask AI" button on PropertyCard injects text via CustomEvent ──
  // detail: { text: string; autoSend?: boolean }
  // autoSend true  → send immediately (preset smart prompts)
  // autoSend false → prefill + focus so the user can edit ("Ask something else…")
  useEffect(() => {
    const handler = (e: Event) => {
      const { text, autoSend } = (e as CustomEvent<{ text: string; autoSend?: boolean }>).detail;
      if (autoSend && !isSubmitting) {
        dispatchAction({ type: 'TEXT_MESSAGE', payload: { text } });
      } else {
        setChatInput(text);
        setTimeout(() => chatInputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('realtypals:ask-ai', handler);
    return () => window.removeEventListener('realtypals:ask-ai', handler);
  }, [dispatchAction, isSubmitting]);
```

Note: `dispatchAction` and `isSubmitting` are in scope (defined earlier in the same component). Adding them to the dependency array is correct.

### B.3 Build the prompt menu inside ProjectCard

File: `frontend/components/ProjectCard.tsx`

**Step 1 — Add a `menuOpen` state.** After the existing `useState` lines (~line 62), add:

```tsx
  const [askMenuOpen, setAskMenuOpen] = useState(false)
```

**Step 2 — Define the prompts.** The prompts reference `project` fields already available (`name`, `sector`, `builder.name`). The AI answers from the full project record server-side, so prompts may ask about data (payment plans, price trend) not present on the card itself.

Add this just inside the component body, after the `bhkGroups` computation (~line 82), before `handleSave`:

```tsx
  // Smart, property-specific prompts. `autoSend: true` sends immediately.
  const askPrompts: Array<{ icon: React.ElementType; label: string; text: string; type: string }> = [
    { icon: CurrencyInr, label: 'Payment plans & offers',        text: `What are the payment plans and current offers for ${project.name}?`,               type: 'payment' },
    { icon: MapPin,      label: "What's around it?",             text: `What's around ${project.name} in ${project.sector}? Metro, schools, malls, hospitals.`, type: 'vicinity' },
    { icon: TrendUp,     label: 'Price trend, last 12 months',   text: `How has the price of ${project.name} changed over the last 12 months?`,             type: 'price_trend' },
    { icon: Scales,      label: 'Compare with nearby projects',  text: `Compare ${project.name} with similar nearby projects in ${project.sector}.`,        type: 'compare' },
  ]
  // Conditional: only offer "concerns" when the card actually carries concerns.
  if (project.concerns && project.concerns.length > 0) {
    askPrompts.push({ icon: Warning, label: 'Any concerns?', text: `What are the concerns or red flags with ${project.name}?`, type: 'concerns' })
  }
```

**Step 3 — Add the icon imports.** At the top of the file, the existing `@phosphor-icons/react` import block (~line 5-14) already imports many icons. Add these four/five names to that same import (do not create a second import line): `CurrencyInr`, `MapPin`, `TrendUp`, `Scales`, `Warning`.

Resulting import line additions (append to the existing destructured list):

```tsx
  CurrencyInr, MapPin, TrendUp, Scales, Warning,
```

> If any of these names does not exist in the installed `@phosphor-icons/react` version, substitute a close match already used in the repo. Safe fallbacks: `CurrencyInr`→`Coins`, `MapPin`→`MapPinLine`, `TrendUp`→`ChartLineUp`, `Scales`→`Scales` (stable), `Warning`→`WarningCircle`. Verify by checking the icon renders in dev; a missing export throws at build.

**Step 4 — Replace the Ask AI button with a button + popover.**

Find the current block (~line 286-298):

```tsx
          {onAskAI ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                trackPropertyEvent(project.id, 'ask_ai', undefined, userId).catch(() => {})
                onAskAI(project)
              }}
              ...className (ccr-collapsed)...
            >
              <Sparkle size={14} weight="fill" />
              Ask AI
            </button>
          ) : (
            <div className="flex-1" />
          )}
```

Replace the whole `{onAskAI ? (...) : (...)}` expression with:

```tsx
          {onAskAI ? (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setAskMenuOpen((v) => !v)
                }}
                className="flex items-center gap-1.5 px-3.5 h-10 rounded-full bg-blue-600 text-white text-[13px] font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.25)] hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all"
                title="Ask AI about this project"
                aria-haspopup="menu"
                aria-expanded={askMenuOpen}
              >
                <Sparkle size={14} weight="fill" />
                Ask AI
              </button>

              {askMenuOpen && (
                <>
                  {/* Click-away backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => { e.stopPropagation(); setAskMenuOpen(false) }}
                  />
                  <div
                    role="menu"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-full left-0 mb-2 z-50 w-64 rounded-2xl bg-white dark:bg-[#1a1a1a] ring-1 ring-black/10 dark:ring-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.15)] p-1.5 origin-bottom-left animate-[fadeIn_0.12s_ease-out]"
                  >
                    {askPrompts.map((p) => (
                      <button
                        key={p.type}
                        role="menuitem"
                        onClick={(e) => {
                          e.stopPropagation()
                          setAskMenuOpen(false)
                          track('ask_ai_tapped', { project_slug: project.slug, prompt_type: p.type })
                          trackPropertyEvent(project.id, 'ask_ai', undefined, userId).catch(() => {})
                          window.dispatchEvent(
                            new CustomEvent('realtypals:ask-ai', { detail: { text: p.text, autoSend: true } }),
                          )
                          onAskAI(project)
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-[13px] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                      >
                        <p.icon size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="truncate">{p.label}</span>
                      </button>
                    ))}

                    {/* Free-form: prefill only, no auto-send */}
                    <button
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation()
                        setAskMenuOpen(false)
                        track('ask_ai_tapped', { project_slug: project.slug, prompt_type: 'freeform' })
                        window.dispatchEvent(
                          new CustomEvent('realtypals:ask-ai', { detail: { text: `Tell me more about ${project.name}`, autoSend: false } }),
                        )
                        onAskAI(project)
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 mt-1 rounded-xl text-left text-[13px] font-medium text-gray-500 dark:text-gray-400 border-t border-black/5 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    >
                      <PencilSimple size={16} className="shrink-0" />
                      <span>Ask something else…</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex-1" />
          )}
```

Add `PencilSimple` to the same phosphor import (fallback: `Pencil`).

**Step 5 — Confirm `track` is imported.** `ProjectCard.tsx` already imports `track` (line 16: `import { track, trackPropertyEvent } from '@/lib/analytics'`). No change.

**Step 6 — MessageBubble already forwards `onAskAI`.** No change needed there. The card fires its own CustomEvent; `onAskAI(project)` still runs the parent's handler (which re-dispatches a generic event). To avoid a double event, see B.4.

### B.4 Avoid the double-dispatch

`MessageBubble.tsx` passes an `onAskAI` that *also* dispatches `realtypals:ask-ai` with the generic "Tell me more about" text. If we keep calling `onAskAI(project)` from the card menu, two events fire.

Fix: in `MessageBubble.tsx`, change the two `onAskAI` handlers (~line 684 and ~724) to a no-op, because the card now dispatches its own event with the chosen prompt.

Replace both occurrences of:

```tsx
                            onAskAI={(p) => {
                              window.dispatchEvent(
                                new CustomEvent('realtypals:ask-ai', {
                                  detail: { text: `Tell me more about ${p.name}` },
                                }),
                              )
                            }}
```

With:

```tsx
                            onAskAI={() => { /* card dispatches its own realtypals:ask-ai */ }}
```

Keep the `onAskAI` prop present (the card renders the button only when `onAskAI` is truthy). A no-op keeps the button visible while letting the card own the event.

Then in `ProjectCard.tsx` menu handlers, you may **remove the `onAskAI(project)` call** (it now does nothing). Safe to leave it — it's a no-op — but removing is cleaner. Your choice; leaving it in is lower-risk.

### B.5 Add the `fadeIn` keyframe (if not present)

The menu uses `animate-[fadeIn_0.12s_ease-out]`. Check `frontend/app/globals.css` (or the Tailwind config) for an existing `fadeIn` keyframe. If absent, add to `globals.css`:

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
```

If you'd rather not touch CSS, delete `animate-[fadeIn_0.12s_ease-out]` from the menu `className` — the menu still works, just without the entrance animation.

### B.6 Analytics

`ask_ai_tapped` is already in the `EventName` union (`frontend/lib/analytics.ts`). We pass a new `prompt_type` prop (`payment` | `vicinity` | `price_trend` | `compare` | `concerns` | `freeform`). Props are free-form on `track`, so no type change is required. If `track`'s signature restricts props, verify it accepts an arbitrary props object; it does today.

### B.7 Verify Feature B
- Tap "Ask AI" → popover opens above the button with 4 prompts (5 if the card has `concerns`) plus "Ask something else…".
- Tap a preset → popover closes, the exact question appears in chat **and sends automatically** (AI starts streaming).
- Tap "Ask something else…" → popover closes, input prefills `Tell me more about {name}` and focuses, does **not** send.
- Tap outside the popover → it closes, card detail panel does **not** open.
- Tapping the "Ask AI" button never opens the card detail panel (stopPropagation working).
- Only one `realtypals:ask-ai` event fires per click (check via a temporary `console.log` in the listener; remove after).

---

## FEATURE C — Share button (rich unfurl + working card action)

### C.1 The two problems
1. **The shared link has no rich preview.** `frontend/app/property/[slug]/page.tsx` is a client component (`'use client'`) with no `generateMetadata` and no Open Graph tags. When a user pastes the link into WhatsApp / iMessage / Instagram DM / LinkedIn, it unfurls as a bare grey URL — no image, no title, no price. This is the biggest lever: a beautiful unfurl card is what makes people tap. Fix = add server-side metadata + a branded dynamic OG image.
2. **The card Share button does nothing in chat.** `ProjectCard` calls `onShare?.(project)`, but `MessageBubble` never passes `onShare`, so it's a no-op. Fix = make the card share itself (native share sheet + clipboard fallback).

Marketing/UX intent:
- The **preview** (unfurl) must look premium and clean: hero image, project name, price, sector, RERA tick, RealtyPals brand. This is the "shared screen" people see before clicking.
- The **recipient landing** must drop them exactly on that property's detail — which `/property/[slug]` already does — with a subtle "shared with you" signal and correct analytics attribution.

### C.2 Part 1 — Rich unfurl (server metadata + OG image)

We add metadata **without** converting the existing client page. Next.js App Router lets a route-segment `layout.tsx` (server component) export `generateMetadata`, and an `opengraph-image.tsx` file auto-generates the share image.

**Step 1 — Create `frontend/app/property/[slug]/layout.tsx`** (new file, server component):

```tsx
import type { Metadata } from 'next'
import { API_BASE } from '@/lib/env'

type Params = { slug: string }

async function fetchProject(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/projects/${slug}`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    const data = await res.json()
    return data.project ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const p = await fetchProject(slug)

  if (!p) {
    return {
      title: 'Property on RealtyPals',
      description: 'AI-guided home buying in Noida. Compare projects, see RERA status, get honest trade-offs.',
    }
  }

  const title = `${p.name}${p.sector ? ` · ${p.sector}` : ''} — ${p.price_range_label ?? ''}`.trim()
  const description =
    p.tagline?.trim() ||
    `${p.name} by ${p.builder?.name ?? 'a verified builder'} in ${p.sector ?? 'Noida'}. ${p.price_range_label ?? ''}${p.possession_label ? ` · Possession ${p.possession_label}` : ''}. Reviewed with RealtyPal AI.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'RealtyPals',
      // og:image is auto-injected by opengraph-image.tsx (Step 2)
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default function PropertyLayout({ children }: { children: React.ReactNode }) {
  return children
}
```

> Notes for the implementer:
> - `params` is a `Promise` in current Next.js App Router — the `await params` is required. If this project is on an older Next.js where `params` is a plain object, drop the `Promise<>` wrapper and the `await`. Check `frontend/package.json` `next` version; Next 15+ uses the Promise form.
> - `generateMetadata` must never throw — `fetchProject` swallows errors and returns `null`, and we return safe defaults. Do not remove the try/catch.
> - `revalidate: 300` caches the metadata fetch for 5 min so crawlers don't hammer the API.

**Step 2 — Create `frontend/app/property/[slug]/opengraph-image.tsx`** (new file — Next.js auto-wires this as `og:image` and `twitter:image`):

```tsx
import { ImageResponse } from 'next/og'
import { API_BASE } from '@/lib/env'

export const runtime = 'edge'
export const alt = 'Property on RealtyPals'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let p: any = null
  try {
    const res = await fetch(`${API_BASE}/projects/${slug}`, { next: { revalidate: 300 } })
    if (res.ok) p = (await res.json()).project ?? null
  } catch {
    p = null
  }

  const name = p?.name ?? 'RealtyPals'
  const price = p?.price_range_label ?? ''
  const sector = p?.sector ?? 'Noida'
  const builder = p?.builder?.name ?? ''
  const hero = p?.hero_image_url || (p?.images?.[0]?.url ?? null)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          backgroundColor: '#0b0b0f',
          backgroundImage: hero ? `url(${hero})` : 'linear-gradient(135deg,#1d4ed8,#4338ca)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Dark gradient scrim for legibility */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            padding: '56px',
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 70%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.9)', color: 'white', padding: '6px 14px', borderRadius: 999, fontSize: 24, fontWeight: 600 }}>
              ✓ RERA
            </div>
            {builder ? (
              <div style={{ display: 'flex', color: 'rgba(255,255,255,0.85)', fontSize: 26 }}>{builder}</div>
            ) : null}
          </div>
          <div style={{ display: 'flex', color: 'white', fontSize: 64, fontWeight: 700, lineHeight: 1.05 }}>{name}</div>
          <div style={{ display: 'flex', color: 'rgba(255,255,255,0.85)', fontSize: 34, marginTop: 8 }}>{sector}</div>
          {price ? (
            <div style={{ display: 'flex', color: 'white', fontSize: 44, fontWeight: 600, marginTop: 16 }}>{price}</div>
          ) : null}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 28, color: 'rgba(255,255,255,0.7)', fontSize: 26 }}>
            Reviewed with RealtyPal AI
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
```

> Notes:
> - `next/og`'s `ImageResponse` supports only a flexbox subset of CSS. Every `<div>` with children needs `display: 'flex'` (already set). Do not add unsupported CSS (grid, floats).
> - If `runtime = 'edge'` causes an issue reaching `API_BASE` (e.g. API is on a private network), change to `export const runtime = 'nodejs'`.
> - If the hero image host is not allowed by Next image fetching, `ImageResponse` fetches it as a raw URL (not via next/image), so it usually works; if it 403s, the gradient fallback still renders a clean branded card.
> - Emoji (✓) render in `ImageResponse`. If it shows as tofu, replace with the text `RERA` only.

**Step 3 — Verify the unfurl.** After deploy (OG scrapers need a public URL):
- Paste a property URL into https://www.opengraph.xyz/ or the WhatsApp/iMessage compose box.
- Expect: large image card with hero, name, price, sector, RERA tick, "Reviewed with RealtyPal AI".
- Locally you can hit `/property/<slug>/opengraph-image` in the browser to see the raw PNG.

### C.3 Part 2 — The card Share action (self-contained, no parent prop needed)

File: `frontend/components/ProjectCard.tsx`

The Share button currently calls `onShare?.(project)` which is undefined in chat. Make the button share itself via the Web Share API (native sheet on mobile — best UX) with a clipboard + toast fallback on desktop.

**Step 1 — Add a share handler** inside the component body (near `handleSave`, ~line 122):

```tsx
  const handleShareProject = async (e: React.MouseEvent) => {
    e.stopPropagation()
    track('share_tapped', { project_slug: project.slug, project_name: project.name })
    const url = `${window.location.origin}/property/${project.slug}?ref=share`
    const text = `${project.name} · ${project.sector} — ${project.price_range_label}. Reviewed with RealtyPal AI:`
    try {
      if (navigator.share) {
        await navigator.share({ title: project.name, text, url })
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        onToast?.('Link copied ✓')
      }
    } catch {
      // user cancelled the native sheet — do nothing
    }
    // keep the parent hook working if a parent ever passes onShare
    onShare?.(project)
  }
```

`track` and `onToast` are already available in this component. No new import.

**Step 2 — Wire the button.** Replace the existing Share button block (currently ~line 314-324):

```tsx
            <button
              onClick={(e) => {
                e.stopPropagation()
                onShare?.(project)
              }}
              className="w-10 h-10 rounded-full bg-transparent text-gray-700 dark:text-gray-300 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
              title="Share project"
            >
              <ShareNetwork size={16} className="text-gray-500 dark:text-gray-400" />
            </button>
```

With:

```tsx
            <button
              onClick={handleShareProject}
              className="w-10 h-10 rounded-full bg-transparent text-gray-700 dark:text-gray-300 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
              title="Share project"
            >
              <ShareNetwork size={16} className="text-gray-500 dark:text-gray-400" />
            </button>
```

### C.4 Recipient landing attribution (optional, low effort)
The share URL carries `?ref=share`. To measure shares-that-convert, in `frontend/app/property/[slug]/page.tsx` read the param and fire an analytics event once on mount:

```tsx
  // near the top of PropertyDetailPage, after existing hooks
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('ref') === 'share') {
      import('@/lib/analytics').then(({ track }) => track('property_viewed', { source: 'share', slug }))
    }
  }, [slug])
```

Skip this if you want the minimum; the unfurl + card action are the core.

### C.5 Known pre-existing bug to note (do not silently fix elsewhere)
`frontend/components/ShareCard.tsx` builds its URL as `/property/${property.id}` (property **id**), while the detail route resolves by **slug** (`/projects/{slug}`). If the backend `/projects/:slug` does not also accept an id, ShareCard's link 404s. `ShareCard` is a separate modal (Property-typed) not used by the project-card Share button, so this plan does not touch it — but flag it to the team. Verify whether `GET /projects/:param` accepts both id and slug before relying on either.

### C.6 Verify Feature C
- **Card action:** tap Share on a card → mobile shows the native share sheet with name/price/link; desktop copies link + shows "Link copied ✓" toast. Card detail panel does not open (stopPropagation).
- **Unfurl:** paste a property link in WhatsApp → rich card with image, name, price, RERA tick.
- Link opens `/property/<slug>?ref=share` and lands on the correct property detail.

---

## FEATURE D — Contact / Call button

### D.1 The problem
The card Phone button (`title="Call builder"`) calls `onCall?.(project)`, which is **never passed in chat** → dead button. Also, the card has no builder phone number (phone lives on `ProjectDetail.builder.phone`, not on the card), and per product rules **builder phone access is a signup-gated, high-intent lead event**. So a raw `tel:` link from the card is both impossible (no number) and against the product's lead flow.

### D.2 Goal
The Phone button becomes **"Request a call"** — it opens the existing signup-gated `CallbackModal`, which captures the lead and hands off to sales (the product's canonical flow: AI → lead → WhatsApp handoff → sales). This reuses working, gated infrastructure and fires the `call_tapped` + lead events.

### D.3 Exact edits

**Step 1 — Reuse the existing callback flow.** `MessageBubble` already receives `onCallback` (wired to `setCallbackProject` in `DiscoveryContent.tsx:1471`, which opens `CallbackModal`). Pass it to the card as `onCall`.

File: `frontend/components/chat/MessageBubble.tsx` — the two `ProjectCard` render sites (~line 678 and ~718). Add `onCall={onCallback}` to **both**:

```tsx
                          <ProjectCard
                            project={property}
                            userId={userId}
                            index={pi}
                            onDetailOpen={onDetailOpen}
                            onToast={onToast}
                            onAskAI={() => { /* card dispatches its own realtypals:ask-ai */ }}
                            onSetSiteVisit={onSetSiteVisit}
                            onCall={onCallback}
                          />
```

(Only the added `onCall={onCallback}` line is new; the `onAskAI` no-op is from Feature B. Do the same for the nearby-results `ProjectCard` at ~line 718.)

**Step 2 — Track the intent + relabel.** File: `frontend/components/ProjectCard.tsx`. The Phone button already calls `trackPropertyEvent(project.id, 'call', ...)`. Add the analytics `track('call_tapped', ...)` and fix the tooltip to reflect the real behaviour. Replace the Phone button block (~line 303-313):

```tsx
            <button
              onClick={(e) => {
                e.stopPropagation()
                trackPropertyEvent(project.id, 'call', undefined, userId).catch(() => {})
                onCall?.(project)
              }}
              className="w-10 h-10 rounded-full bg-transparent text-gray-700 dark:text-gray-300 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
              title="Call builder"
            >
              <Phone size={16} className="text-gray-500 dark:text-gray-400" />
            </button>
```

With:

```tsx
            <button
              onClick={(e) => {
                e.stopPropagation()
                track('call_tapped', { project_slug: project.slug, project_name: project.name })
                trackPropertyEvent(project.id, 'call', undefined, userId).catch(() => {})
                onCall?.(project)
              }}
              className="w-10 h-10 rounded-full bg-transparent text-gray-700 dark:text-gray-300 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
              title="Request a call"
            >
              <Phone size={16} className="text-gray-500 dark:text-gray-400" />
            </button>
```

`track` and `call_tapped` are already available/defined; no import or type change.

### D.4 Optional enhancement — Call choice popover
If you want to offer both "Request a callback" and "WhatsApp our advisor" (only when `NEXT_PUBLIC_WHATSAPP_NUMBER` is set), replace the single Phone button with a small popover identical in structure to the Ask AI menu (Feature B, Step 4): a `callMenuOpen` state, a click-away backdrop, two menu items — one calls `onCall?.(project)`, the other opens `https://wa.me/<number>?text=...`. Keep it out of V1 unless asked; the single-button callback is the lazy correct default.

### D.5 Verify Feature D
- Tap Phone on a card → `CallbackModal` opens (or sign-in prompt if not authenticated, per existing modal gating).
- `call_tapped` fires (check analytics/network).
- Card detail panel does not open (stopPropagation).

---

## 3. Test files to update

Two test files are already modified in the working tree and reference these components:
- `frontend/components/chat/MessageBubble.test.tsx`
- `frontend/__tests__/ProjectCard.test.tsx`

After the change, run the frontend test suite. Expect failures where a test asserts the old single-click Ask AI behaviour or the old floating Stop pill. Update those assertions:
- Ask AI test: assert that clicking the button opens a menu (`role="menu"` visible), and clicking a menu item dispatches `realtypals:ask-ai` with `autoSend: true`.
- Send/Stop test (if any): assert the button shows a stop control when `isSubmitting` is simulated. `isSubmitting` is internal state driven by `dispatchAction`; testing it may require mocking the stream. If too costly, cover the Stop branch with a shallow render assertion or skip with a `// TODO` note — do not delete unrelated assertions.

---

## 4. Completion checklist (run before declaring done)

```bash
cd frontend
npm run lint          # no new errors
npx tsc --noEmit      # TypeScript passes (strict mode, no `any`)
npm test              # update the two affected specs; rest stay green
npm run build         # production build passes
```

Manual smoke:
1. Start a chat, send a message, confirm Send→Stop morph and abort works.
2. Get property cards to render, tap Ask AI, run every prompt, confirm auto-send.
3. Toggle dark mode — check menu, Send, and Stop colors in both themes.
4. Mobile viewport (DevTools) — popover opens on tap, is fully on-screen, closes on outside tap.
5. Tap Share on a card → native sheet (mobile) or "Link copied ✓" toast (desktop).
6. Visit `/property/<slug>/opengraph-image` in the browser → branded PNG renders. Paste a property URL in WhatsApp/opengraph.xyz → rich unfurl.
7. Tap the Phone button → `CallbackModal` opens (or sign-in prompt), `call_tapped` fires.

New files created (Feature C):
- `frontend/app/property/[slug]/layout.tsx` — server metadata (`generateMetadata`).
- `frontend/app/property/[slug]/opengraph-image.tsx` — dynamic branded OG image.

---

## 5. Scope guard (do NOT do)
- Do not restyle the card layout, input bar shape, or chat bubbles beyond the four buttons in scope.
- Do not add new dependencies. (`next/og` ships with Next.js — not a new dependency.)
- Do not change the send/stream backend, `dispatchAction` internals, or the abort logic.
- Do not touch admin components or unrelated cards (`PropertyCard.tsx` is a different component — leave it).
- Do not modify `ShareCard.tsx` / `ShareShortlistModal.tsx` (the id-vs-slug issue in C.5 is a flag, not a task).
- Do not change the backend `/projects/:slug` handler; the metadata + OG image only read it.

---

## 6. Rollback
Each feature is a self-contained diff.
- **A** — restore the original ternary + floating Stop pill in `DiscoveryContent.tsx`.
- **B** — restore the single Ask AI button in `ProjectCard.tsx`, the original listener in `DiscoveryContent.tsx`, and the two `onAskAI` handlers in `MessageBubble.tsx`.
- **C** — delete `layout.tsx` and `opengraph-image.tsx` under `frontend/app/property/[slug]/`; restore the original Share button in `ProjectCard.tsx`. (Unfurl reverts to a bare link; nothing else breaks.)
- **D** — remove `onCall={onCallback}` from the two `MessageBubble` card sites and restore the original Phone button in `ProjectCard.tsx`.
