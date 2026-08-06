# Remaining Work — Implementation Plan

**Generated:** 2026-07-25
**Audience:** Any model, including Haiku 4.5. Every task gives the exact file, the exact anchor line, copy-paste code, and a runnable verify step. Do tasks in order inside each phase.
**Method:** every claim below was verified against live code on 2026-07-25 (greps + `tsc` + `jest` runs quoted in the audit section).

---

## RULES FOR THE EXECUTOR — READ FIRST

1. **One task = one commit.** Format `fix(scope): description`. Stage only the files the task names. Never `git add -A`.
2. **Never run a migration, a deploy, or a destructive command.** Tasks marked `⛔ OWNER GATE` stop and ask. Do not proceed past them on your own.
3. **Do not touch styling.** Chip/loader/chat visuals are finalized per CLAUDE.md. Every visual change in this plan is a bug fix with an explicit anchor; nothing else may change.
4. **Do not refactor unrelated code.** Find something else broken → append it to §7 "Discovered during work". Do not fix it inline.
5. **Run the Verify step after every task.** If Verify fails, the task stays open. Never mark done on a failing check.
6. **If an anchor line does not match what this plan quotes, STOP and report.** Do not guess. The file may have moved on.

---

## 0. AUDIT — WHAT IS ALREADY DONE (DO NOT REDO ANY OF THIS)

Verified against live code. **Do not re-implement these. Do not "improve" them.**

| Source plan | Item | Verified evidence |
|---|---|---|
| PRODUCTION_READINESS_AUDIT | P0-1 webhook fail-closed | `leads.ts:291-299` — fails closed in prod + `timingSafeEqual` |
| " | P0-4 compression | `backend/package.json:27` + `index.ts:91` `app.use(compression(...))` |
| " | P0-5 admin httpOnly cookie | `adminAuth.ts:67-71` reads cookie first, Bearer fallback |
| " | P0-7 gitignore conflict markers | 0 matches in `frontend/.gitignore` |
| " | P1-1 AI token telemetry | `openai.ts:290` `stream_options:{include_usage:true}`, `recordUsage` at `openai.ts:385` / `groq.ts:169` |
| IMPLEMENTATION_SUMMARY | swagger + 7 admin routes | `swagger.json` = **55 paths** (plan targeted 48–49) |
| OPTIMIZATION Part 1 | intent-leak remount nonce | `app/discover/page.tsx:132` `key={\`new-${newChatNonce}\`}` |
| OPTIMIZATION Part 2/3 | UniversalLoader + dead-code delete | `components/ui/universal-loader.tsx` exists; `ChatLoader.tsx` + `AIThinkingIndicator.tsx` deleted |
| OPTIMIZATION 4a/8a | adminFetch wiring | 12 admin files import it, 36 call sites; 1 raw fetch left = `admin/login` (intentional) |
| OPTIMIZATION 7a | console gating | `DEBUG` flag live, e.g. `DiscoveryContent.tsx:541` |
| OPTIMIZATION 7b | welcome constant | `WELCOME_MESSAGE` used, 2 sites |
| OPTIMIZATION 7c | LRU session cache | `lib/sessionCache.ts` typed `LRUSessionCache` |
| OPTIMIZATION 8c | dead SkeletonRow | 0 matches in both admin pages |
| CHIP_HARDENING Part A | `session_id` crash | `chat.ts:892` uses `currentSessionId`; 0 matches for `, session_id)` |
| CHIP_HARDENING B1/B3 | dedupe + NaN-safe sort | `ChipPicker.tsx:22-35` |
| CHIP_HARDENING B2/B5 | truncate + empty-label guard | `SuggestionChip.tsx:61` guard, `:96` `truncate` |
| CHIP_HARDENING B7 | dropdown outside-click/Escape | `CardSelectorChip.tsx:3` imports `useRef, useEffect` |
| CHIP_HARDENING Part C/D | stress test suite | `npx jest components/chat` → **PASS 40 / FAIL 0** |
| ADMIN_DATA_FIX | route + frontend code | `backend/src/routes/admin.ts`, `leads.ts`, `builderApplications.ts`, 3 admin pages all updated |

**Backend `npx tsc --noEmit` → clean.** **Frontend `npx tsc --noEmit` → 1 error (Phase 1 Task 1.1 below).**

Everything not in the table above is in this plan.

---

## 1. PHASE 1 — BLOCKERS (do first, ~25 min)

### Task 1.1 — Fix the one frontend TypeScript error

**Why:** frontend `tsc --noEmit` is not clean, so no later task can use "tsc is clean" as its Verify signal.

**File:** `frontend/components/chat/MessageBubble.tsx`, line **378**.

Exact current line:
```tsx
                  const { label, sublabel } = buildAdaptiveThinkingLabel(message.content, intent, phase)
```

`intent` is `Record<string, unknown> | null | undefined` (from `ChatMessage.streamingIntent`, `types/property.ts:100`); `buildAdaptiveThinkingLabel` takes `| null`. Coerce at the call site:

```tsx
                  const { label, sublabel } = buildAdaptiveThinkingLabel(message.content, intent ?? null, phase)
```

Change nothing else. Do **not** widen the function signature — the call site is the narrower fix.

**Verify:** `cd frontend && npx tsc --noEmit` → `No errors found`.

---

### Task 1.2 — `⛔ OWNER GATE` Apply the admin data migration

**Do not run this yourself. Print this block and stop.**

The migration file `frontend/prisma/migrations/20260725120000_admin_data_reconcile/migration.sql` is written but **not applied**. It is additive only (no `DROP`, no type change): adds `project_documents.file_size_bytes`, the `shared_shortlists` table, and 10 lead-qualification columns on `callback_requests`.

Until it is applied, these stay broken at runtime: `documents.ts:99`, `projects.ts:151`, `chat.ts:856` (every `prisma.projectDocument` query throws), `share.ts` (no `shared_shortlists` table), and all lead-tier reporting.

Owner runs:
```bash
cd frontend && npx prisma migrate deploy
npx prisma generate
cd ../backend && npx tsc --noEmit
```
Then restart the backend dev server.

**Verify (after owner confirms):** `cd backend && npx tsc --noEmit` clean, and `GET /api/v1/admin/stats` returns non-zero `lead_tier` counts instead of throwing.

---

## 2. PHASE 2 — CHIPS ALWAYS RENDER (the live user-facing bug, ~2h)

### The bug, stated precisely

User asked *"Show me fully completed homes in central Noida that I can move into today."* The AI named three real projects in prose (Panchsheel Hynish / Exotica Elegance / Sikka Karmic Greens) and rendered **zero chips**.

Root cause is not one bug. **Six filters run in series and every one is subtractive; none can add.** Chain today:

```
engine builds candidates
  → filterByHistory            (conversationEngine.ts:339)  can empty
  → capChips                   (conversationEngine.ts:362)  can empty
  → filterNewChips             (chat.ts:641)                can empty
  → SuggestionChipGroups dedup (MessageBubble.tsx:173)      can shrink
  → .slice(0, 4)               (MessageBubble.tsx:178)      can shrink
  → isLast gate                (MessageBubble.tsx:822)      can hide
```

The eight verified causes, each mapped to the task that fixes it:

| ID | Cause | Anchor | Fixed by |
|---|---|---|---|
| RC-1 | Session dedup burns chips permanently — deterministic IDs + `markChipShown` on every emit means a chip shown once can never return | `chat.ts:641-642` | 2.1 |
| RC-2 | History filter includes **assistant** messages, so the AI's own answer deletes the matching chips | `chipProvider.ts:115`, `conversationEngine.ts:217,340` | 2.2 |
| RC-3 | Text-only answers are structurally chip-less — `generateDynamicChips` needs `results.length > 0` to be reached at all | `conversationEngine.ts:74-75,441-449` | 2.5 |
| RC-4 | `capChips` discards `priority >= 4` even when slots remain; can return `[]` | `conversationEngine.ts:362-370` | 2.3 |
| RC-5 | `chipInventory: null` silently zeroes DISCOVERY and the BHK/budget clarify branches | `conversationEngine.ts:155,244,257` | 2.4 |
| RC-6 | Chips are one global transient value; only `isLast` renders | `DiscoveryContent.tsx:1524`, `MessageBubble.tsx:822` | 2.6, 2.7 |
| RC-7 | No floor — nothing guarantees ≥1 chip survives | whole chain | 2.4 |
| RC-8 | Project names in prose are inert text | — | Phase 4 |

**Design principle for this phase: chips may be re-ranked or suppressed, but the pipeline must never emit zero when candidates existed.**

---

### Task 2.1 — Make session dedup soft instead of destructive (RC-1)

**File:** `backend/src/lib/discovery/chipDedup.ts`. Append at end of file:

```typescript
/**
 * Soft dedup: prefer unseen chips, but never starve the UI.
 * If filtering leaves fewer than `floor` chips, return the original set —
 * a repeated chip is strictly better than a dead chip row.
 */
export function filterNewChipsWithFloor<T extends { id: string }>(
  sessionId: string,
  chips: T[],
  floor = 2,
): T[] {
  if (chips.length === 0) return chips
  const fresh = filterNewChips(sessionId, chips)
  if (fresh.length >= Math.min(floor, chips.length)) return fresh
  return chips
}
```

**File:** `backend/src/routes/chat.ts`.

Import — find the existing `chipDedup` import and add the new name to it. It currently reads (near the top with the other `lib/discovery` imports):
```typescript
import { filterNewChips, markChipShown, hydrateFromDb } from '../lib/discovery/chipDedup'
```
Add `filterNewChipsWithFloor`:
```typescript
import { filterNewChips, filterNewChipsWithFloor, markChipShown, hydrateFromDb } from '../lib/discovery/chipDedup'
```
> If the existing import line names a different set of symbols, keep them all and just add `filterNewChipsWithFloor`.

Post-search call site, line **641**:
```typescript
// BEFORE
  const postChips = filterNewChips(currentSessionId, postSearchUiState.chips)
// AFTER
  const postChips = filterNewChipsWithFloor(currentSessionId, postSearchUiState.chips, 2)
```

Pre-search call site, line **470**, same swap:
```typescript
// BEFORE
    preChips = filterNewChips(currentSessionId, preSearchUiState.chips)
// AFTER
    preChips = filterNewChipsWithFloor(currentSessionId, preSearchUiState.chips, 2)
```

Leave lines 471 and 642 (`markChipShown`) exactly as they are — still record what was shown.

**Verify:** `cd backend && npx tsc --noEmit` clean. Then send the same query twice in one session; the second turn must still return a non-empty `chips` array in the `ui_state` SSE event.

---

### Task 2.2 — Filter history on user turns only (RC-2) — biggest single win

**Why:** `historyText` is built from *all* messages including the assistant's. When the AI writes "Sector 75 … green living … amenities", the sector chips, the amenities chip and the connectivity chip are all deleted as "already discussed". The intent was "don't re-offer what the **user** already asked" — a project the AI just named is exactly what deserves a button.

Three call sites. In each, restrict to `role === 'user'`.

**File 1:** `backend/src/lib/db/chipProvider.ts`, line **115**:
```typescript
// BEFORE
  const historyText = chatHistory.map((m: any) => m.content.toLowerCase()).join(' ')
// AFTER — only what the USER said counts as "already discussed"
  const historyText = chatHistory
    .filter((m: any) => m?.role === 'user')
    .map((m: any) => String(m.content ?? '').toLowerCase())
    .join(' ')
```

**File 2:** `backend/src/lib/discovery/conversationEngine.ts`, line **217** (inside `getClarifyingChips`):
```typescript
// BEFORE
  const historyText = chatHistory.map(m => m.content.toLowerCase()).join(' ')
// AFTER
  const historyText = chatHistory
    .filter(m => m.role === 'user')
    .map(m => String(m.content ?? '').toLowerCase())
    .join(' ')
```

**File 3:** `backend/src/lib/discovery/conversationEngine.ts`, line **340** (inside `filterByHistory`):
```typescript
// BEFORE
  const historyText = chatHistory.map(m => m.content.toLowerCase()).join(' ')
// AFTER
  const historyText = chatHistory
    .filter((m: any) => m?.role === 'user')
    .map((m: any) => String(m.content ?? '').toLowerCase())
    .join(' ')
```

Change nothing else in those functions.

**Verify:** `cd backend && npx tsc --noEmit` clean, `npm test` in `backend` still green. Then: ask a question whose answer mentions a sector name; chips referencing that sector must now survive.

---

### Task 2.3 — Stop `capChips` from discarding chips while slots remain (RC-4)

**Why:** `chipProvider.ts` assigns `priority = coreChips.length + 1` → 1,2,3,4,5,6. `capChips` keeps only `priority <= 2` (max 2) and `priority === 3` (max 2), so priority 4+ is dropped even when fewer than 4 chips were selected. If every candidate is priority 4+, it returns `[]`.

**File:** `backend/src/lib/discovery/conversationEngine.ts`, lines **362-370**. Replace the whole function:

```typescript
// BEFORE
function capChips(candidates: ChipAction[]): ChipAction[] {
  const hasGroups = candidates.some(c => c.group)
  if (!hasGroups && candidates.length > 4) {
    const critical = candidates.filter(c => c.priority <= 2).slice(0, 2)
    const secondary = candidates.filter(c => c.priority > 2 && c.priority <= 3).slice(0, 2)
    return [...critical, ...secondary].slice(0, 4)
  }
  return candidates.slice(0, 4)
}

// AFTER — same ranking preference, but always fill up to 4 from what's left
function capChips(candidates: ChipAction[]): ChipAction[] {
  if (candidates.length <= 4) return candidates
  const hasGroups = candidates.some(c => c.group)
  if (hasGroups) return candidates.slice(0, 4)

  const picked: ChipAction[] = []
  const take = (pool: ChipAction[], n: number) => {
    for (const c of pool) {
      if (picked.length >= n) break
      if (!picked.includes(c)) picked.push(c)
    }
  }
  take(candidates.filter(c => c.priority <= 2), 2)              // critical first
  take(candidates.filter(c => c.priority === 3), 4)             // then high-value
  take(candidates, 4)                                          // then anything left — never waste a slot
  return picked.slice(0, 4)
}
```

**Verify:** `cd backend && npm test` green. Add no new test here — Task 2.8 covers this with an explicit case.

---

### Task 2.4 — Guarantee a floor at the engine exit (RC-5, RC-7)

**Why:** the single change that makes "zero chips" structurally impossible. Every earlier filter may subtract; this adds back.

**File:** `backend/src/lib/discovery/conversationEngine.ts`. Add this function immediately **above** `capChips` (i.e. just before line 362):

```typescript
/**
 * Last-resort chips. Only used when every other path produced nothing.
 * Deliberately generic and DB-safe: asks the assistant a question rather than
 * asserting any fact, so it can never fabricate inventory (CLAUDE.md: never invent data).
 */
function getFloorChips(intent: Intent, results: ScoredProject[]): ChipAction[] {
  // If we do have results, offer actions grounded in them.
  if (results.length > 0) {
    const projects = results.slice(0, 4).map(r => ({ id: r.id, name: r.name }))
    const pIds = projects.map(p => p.id).join(':')
    const out: ChipAction[] = [
      chip(`TEXT_MESSAGE:floor_tradeoffs:${pIds}`, 'TEXT_MESSAGE', 'What are the trade-offs?', '',
        { actionPrefix: 'What are the main trade-offs and risks of', projects, actionSuffix: '?' }, 1),
      chip(`TEXT_MESSAGE:floor_tell_more:${pIds}`, 'TEXT_MESSAGE', 'Tell me more', '',
        { actionPrefix: 'Tell me more about', projects }, 2),
    ]
    if (results.length >= 2) {
      out.push(chip(`COMPARE_PROPERTIES:floor_compare:${pIds}`, 'COMPARE_PROPERTIES',
        `Compare these ${Math.min(results.length, 3)}`, '', { mode: 'multi', projects }, 3))
    }
    return out
  }

  // No results: safe, always-answerable questions. No invented inventory.
  const sectorBit = intent.sector ? ` in ${intent.sector}` : ' in Noida'
  return [
    chip('TEXT_MESSAGE:floor_ready_to_move', 'TEXT_MESSAGE', 'Ready-to-move homes', '',
      { text: `Show me ready-to-move projects${sectorBit}.` }, 1),
    chip('TEXT_MESSAGE:floor_buying_guide', 'TEXT_MESSAGE', 'What should I check first?', '',
      { text: 'What should I check before buying a property in Noida?' }, 2),
    chip('TEXT_MESSAGE:floor_budget_help', 'TEXT_MESSAGE', 'Help me set a budget', '',
      { text: 'Help me work out a realistic budget and EMI.' }, 3),
  ]
}
```

Then in `computeConversationState`, **replace lines 470-474** (the block that ends with the `return`):

```typescript
// BEFORE
  const hasGroups = chips.some(c => c.group)
  const preCapChips = chips.length
  chips = capChips(chips)
  if (stage === 'CLARIFYING') console.log('[CONV_ENGINE] CLARIFYING stage:', { missingFields, preCapChips, postCapChips: chips.length, labels: chips.map(c => c.label) })
  return { stage, thinking, chips, missingFields, confidence }

// AFTER
  const preCapChips = chips.length
  chips = capChips(chips)

  // FLOOR: the pipeline must never hand the UI an empty chip row.
  // Every filter above is subtractive; this is the only additive step.
  if (chips.length === 0) {
    chips = capChips(getFloorChips(intent, results))
    console.warn('[CONV_ENGINE] chip floor engaged', { stage, preCapChips, emitted: chips.length })
  }

  if (stage === 'CLARIFYING') console.log('[CONV_ENGINE] CLARIFYING stage:', { missingFields, preCapChips, postCapChips: chips.length, labels: chips.map(c => c.label) })
  return { stage, thinking, chips, missingFields, confidence }
```

> `hasGroups` on line 470 is dead (assigned, never read) — that is why it is dropped above. If `tsc` reports it used elsewhere, keep it.

Note the floor runs **before** `filterNewChipsWithFloor` in `chat.ts`, and 2.1 guarantees that call cannot empty a non-empty input. So a non-empty engine result always reaches the client.

**Verify:** `cd backend && npx tsc --noEmit` clean, `npm test` green.

---

### Task 2.5 — Emit chips for text-only answers (RC-3) — fixes the reported case directly

**Why:** the AI named three real projects in prose but `results.length === 0`, so `computeStage` never reached `RESEARCH` and the project-aware chips never ran. Fix: after the answer text exists, match prose against real DB project names and emit a third `ui_state` with grounded, project-specific chips.

Grounding is mandatory — chips are built **only** from names that exist in the database. Nothing invented.

**Step 1 — new helper file** `backend/src/lib/discovery/proseEntities.ts`:

```typescript
import { prisma } from '../db'
import { ChipAction, chip } from './conversationEngine'

/**
 * Find projects that the assistant named in prose.
 * DB-grounded: a name only counts if a Project row actually matches it,
 * so a hallucinated name can never become a chip (CLAUDE.md: never invent data).
 */
export async function findProjectsMentioned(
  text: string,
  city: string,
  limit = 4,
): Promise<Array<{ id: string; name: string }>> {
  if (!text || text.length < 10) return []
  try {
    const candidates = await prisma.project.findMany({
      where: { city },
      select: { id: true, name: true },
    })
    const haystack = text.toLowerCase()
    const hits: Array<{ id: string; name: string }> = []
    for (const p of candidates) {
      if (!p.name || p.name.length < 4) continue
      if (haystack.includes(p.name.toLowerCase())) hits.push({ id: p.id, name: p.name })
      if (hits.length >= limit) break
    }
    return hits
  } catch (e) {
    console.warn('[proseEntities] project match failed', e)
    return []
  }
}

/** Zero-typing actions for projects the assistant named but did not return as cards. */
export function buildProseChips(projects: Array<{ id: string; name: string }>): ChipAction[] {
  if (projects.length === 0) return []
  const pIds = projects.map(p => p.id).join(':')
  const out: ChipAction[] = []

  if (projects.length >= 2) {
    out.push(chip(`COMPARE_PROPERTIES:prose_compare:${pIds}`, 'COMPARE_PROPERTIES',
      `Compare these ${projects.length}`, '', { mode: 'multi', projects }, 1))
  }
  out.push(
    chip(`TEXT_MESSAGE:prose_tradeoffs:${pIds}`, 'TEXT_MESSAGE', 'What are the trade-offs?', '',
      { actionPrefix: 'What are the main trade-offs, risks and downsides of', projects, actionSuffix: '?' }, 2),
    chip(`CALCULATE_EMI:prose_emi:${pIds}`, 'CALCULATE_EMI', 'Calculate EMI', '',
      { projects }, 3),
    chip(`TEXT_MESSAGE:prose_rera:${pIds}`, 'TEXT_MESSAGE', 'Check RERA status', '',
      { actionPrefix: 'Show the RERA registration and legal standing of', projects }, 4),
  )
  return out
}
```

**Step 2 — wire it in** `backend/src/routes/chat.ts`.

Add the import beside the other `lib/discovery` imports at the top:
```typescript
import { findProjectsMentioned, buildProseChips } from '../lib/discovery/proseEntities'
```

Find the point where `fullText` is complete and the stream is about to close — the site that persists the assistant message. Search for the **first** `prisma.chatMessage.create` or `createMany` that writes the assistant turn after streaming. Insert this block **immediately before** that persistence call, and after `fullText` is final:

```typescript
  // ── Prose-entity chips ──────────────────────────────────────────────
  // The model can name real projects in prose without the search tool returning
  // cards. Without this, that turn renders zero chips (verified user report).
  // Only DB-matched names become chips, so nothing is invented.
  try {
    if (fullText && projects.length === 0) {
      const mentioned = await findProjectsMentioned(fullText, DEFAULT_CITY)
      const proseChips = buildProseChips(mentioned)
      if (proseChips.length > 0) {
        const emitted = filterNewChipsWithFloor(currentSessionId, proseChips, 2)
        emitted.forEach(c => markChipShown(currentSessionId, c.id))
        send('ui_state', {
          stage: 'RESEARCH',
          thinking: '',
          chips: emitted,
          missingFields: [],
          confidence: 'MEDIUM',
        } as unknown as Record<string, unknown>)
      }
    }
  } catch (e) {
    console.warn('[CHAT] prose chip emit failed (non-fatal)', e)
  }
```

Guards that matter and must stay: `projects.length === 0` (don't override real card chips), `try/catch` (a chip failure must never break the stream), and emitting **after** `fullText` is final (before it, there is no prose to scan).

**Verify:** `cd backend && npx tsc --noEmit` clean. Then send exactly *"Show me fully completed homes in central Noida that I can move into today."* The final `ui_state` event must carry ≥2 chips naming the projects from the answer. Confirm no chip names a project absent from the DB.

---

### Task 2.6 — Persist chips onto the message (RC-6, frontend)

**Why:** `chips={conversationState?.chips ?? []}` (`DiscoveryContent.tsx:1524`) is one global value shared by every bubble, and each new `ui_state` overwrites it. Scroll back → no chips. Attaching chips to the message fixes it with **no schema change**.

**Step 1 —** `frontend/types/property.ts`, inside `interface ChatMessage` (starts line 77). Add after the `suggestedChips?: ...` line:

```typescript
  /** Chips captured from the ui_state event for THIS turn, so scrollback keeps them. */
  chips?: import('@/components/chat/types').ChipAction[];
```

**Step 2 —** `frontend/components/DiscoveryContent.tsx`, the `ui_state` handler at line **539**. It currently does `setConversationState({ ... chips: event.chips ... })`. Keep that, and **additionally** stamp the chips onto the last AI message. Insert right after the existing `setConversationState({...})` call inside that branch:

```typescript
        // Persist chips on the message itself so scrollback and re-render keep them.
        if (Array.isArray(event.chips) && event.chips.length > 0) {
          setChatHistory(prev => {
            if (prev.length === 0) return prev
            const lastIdx = prev.length - 1
            if (prev[lastIdx]?.type !== 'ai') return prev
            const next = [...prev]
            next[lastIdx] = { ...next[lastIdx], chips: event.chips as never }
            return next
          })
        }
```

**Step 3 —** `frontend/components/DiscoveryContent.tsx`, line **1524**. Prefer the message's own chips, fall back to live state:

```tsx
// BEFORE
                      chips={conversationState?.chips ?? []}
// AFTER
                      chips={message.chips ?? (actualIndex === chatHistory.length - 1 ? conversationState?.chips ?? [] : [])}
```

**Verify:** `cd frontend && npx tsc --noEmit` clean. Then: send two messages that both produce chips, scroll up — the **first** AI message must still show its own chips, and they must differ from the second's.

---

### Task 2.7 — Let non-last messages render their persisted chips (RC-6)

**File:** `frontend/components/chat/MessageBubble.tsx`, line **822**.

```tsx
// BEFORE
        const shouldShow = message.type === 'ai' && displayContent && isLast && !isSubmitting && combinedChips.length > 0;
// AFTER — historical messages may show their OWN persisted chips; live state stays last-only
        const hasOwnChips = Array.isArray(message.chips) && message.chips.length > 0;
        const shouldShow = message.type === 'ai' && displayContent && combinedChips.length > 0
          && (isLast ? !isSubmitting : hasOwnChips);
```

Also update the memo comparator so a chip change on a non-last message actually re-renders. `MessageBubble.tsx:272-282`, add one line inside the `return (`:

```tsx
    prev.chips === next.chips &&
    prev.message.chips === next.message.chips
```
> Put `prev.message.chips === next.message.chips` as the final comparison and make sure the line before it ends with `&&`.

**Verify:** `cd frontend && npx tsc --noEmit` clean; `npx jest components/chat` → still 40 passing. Manually: chips visible on older AI messages, and clicking one still dispatches.

---

### Task 2.8 — Regression tests for the floor guarantee

**File:** `backend/src/lib/discovery/__tests__/chips.test.ts` (exists — **append**, do not rewrite).

Add one describe block. Match the file's existing import style and helper names; if a helper differs, adapt rather than inventing a new fixture file.

```typescript
describe('chip pipeline: never emits zero (regression)', () => {
  it('emits floor chips when no candidates survive filtering', async () => {
    // COLD intent, no results, no inventory — every normal path returns []
    const state = await computeConversationState(
      {} as never, 'COLD' as never, [], false, [], undefined, undefined, undefined, null, true,
    )
    expect(state.chips.length).toBeGreaterThan(0)
  })

  it('emits grounded chips when results exist but history mentions every label', async () => {
    const results = [
      { id: 'p1', name: 'Alpha Heights', sector: 'Sector 75' },
      { id: 'p2', name: 'Beta Greens', sector: 'Sector 79' },
    ] as never
    const history = [{ role: 'assistant', content: 'amenities connectivity payment plans RERA legal exit strategy' }]
    const state = await computeConversationState(
      {} as never, 'READY_TO_SEARCH' as never, results, false, history, undefined, undefined, undefined, null, true,
    )
    // assistant-only history must NOT starve the row (Task 2.2 + 2.4)
    expect(state.chips.length).toBeGreaterThan(0)
  })

  it('capChips fills all four slots even when every priority is >= 4', async () => {
    const results = Array.from({ length: 8 }, (_, i) => ({
      id: `p${i}`, name: `Project ${i}`, sector: 'Sector 75', price_min_cr: 1.5,
    })) as never
    const state = await computeConversationState(
      { sector: 'Sector 75' } as never, 'READY_TO_SEARCH' as never, results, false, [],
      undefined, undefined, undefined, null, true,
    )
    expect(state.chips.length).toBeGreaterThan(0)
    expect(state.chips.length).toBeLessThanOrEqual(4)
  })
})
```

Add a soft-dedup test to the same file:

```typescript
describe('filterNewChipsWithFloor', () => {
  it('returns the original set rather than starving the row', () => {
    const chips = [{ id: 'a' }, { id: 'b' }]
    markChipShown('sess-floor', 'a')
    markChipShown('sess-floor', 'b')
    expect(filterNewChipsWithFloor('sess-floor', chips, 2)).toHaveLength(2)
  })

  it('still prefers fresh chips when enough exist', () => {
    const chips = [{ id: 'x' }, { id: 'y' }, { id: 'z' }]
    markChipShown('sess-fresh', 'x')
    expect(filterNewChipsWithFloor('sess-fresh', chips, 2).map(c => c.id)).toEqual(['y', 'z'])
  })
})
```

**Verify:** `cd backend && npm test` — all green, including the pre-existing suites.

---

### Phase 2 exit gate

- [ ] `cd backend && npx tsc --noEmit` clean; `npm test` green
- [ ] `cd frontend && npx tsc --noEmit` clean; `npx jest components/chat` ≥ 40 passing
- [ ] The reported query returns ≥2 project-named chips
- [ ] Same query twice in one session → chips both times
- [ ] Scroll back two turns → each AI message keeps its own chips
- [ ] No chip names a project that is not in the database

---

## 3. PHASE 3 — DATA INTEGRITY (~1h)

### Task 3.1 — Diagnose why `chat_sessions` has 0 rows `⚠️ INVESTIGATE, DO NOT GUESS`

**Why it matters:** `chat_sessions` = 0 while `user_memory` = 12 rows, even though `chat.ts:1012`, `:1333` and `:1446` all call `prisma.chatSession.create`. Downstream damage: every analytics chart is empty, `hydrateFromDb` (`chipDedup.ts:41`) can never restore chip state, and session restore silently falls back to cache.

This is a **diagnosis task**. Produce a written finding; do not apply a speculative fix.

Steps:
1. Read each of the three `chatSession.create` call sites and record the exact condition guarding it.
2. Check whether each is inside a `try` whose `catch` swallows the error — grep for `catch` within ~15 lines after each.
3. Confirm the `ChatSession` model's required fields (`frontend/prisma/schema.prisma`, model `ChatSession` near line 377) all get values at every call site. A missing required field throws, and a swallowed throw looks exactly like "not persisting".
4. Confirm whether `user_id` is required — if it is non-nullable, **guest sessions can never persist**, which alone explains a zero count.

Write findings to §7 of this document with the root cause and the proposed one-line fix. Stop there and report. **Do not change auth or session semantics on your own.**

**Verify:** §7 contains a named root cause with file:line evidence.

---

### Task 3.2 — Fix the dead news create/update path

**Why:** `frontend/app/admin/news/page.tsx:254` posts to `/api/builder/news`. `frontend/app/api/builder/` does not exist and the backend has no `POST /news` route (verified: 0 matches for `router.post('/news'`). Every create and edit fails silently. Listing and archive already work through `adminFetch`.

Two backend routes, then one frontend swap.

**Step 1 —** `backend/src/routes/admin.ts`. Add beside the existing `GET /news` and `DELETE /news/:id` handlers. Match their exact style, `requireAdmin`, and error shape:

```typescript
// POST /api/v1/admin/news — create a news item
router.post('/news', requireAdmin, async (req: Request, res: Response) => {
  const { title, content, builder_id, link_type, link_target, status } = req.body ?? {}
  if (!title || !content) {
    res.status(400).json({ error: 'title and content are required' })
    return
  }
  try {
    const created = await prisma.builderNews.create({
      data: {
        title: String(title),
        content: String(content),
        builder_id: builder_id ? String(builder_id) : null,
        link_type: link_type ? String(link_type) : null,
        link_target: link_target ? String(link_target) : null,
        status: status ? String(status) : 'draft',
      } as never,
    })
    res.json(created)
  } catch (err) {
    console.error('[admin] news create failed:', err)
    res.status(500).json({ error: 'Failed to create news' })
  }
})

// PATCH /api/v1/admin/news/:id — update a news item
router.patch('/news/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const { title, content, builder_id, link_type, link_target, status } = req.body ?? {}
  try {
    const updated = await prisma.builderNews.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: String(title) } : {}),
        ...(content !== undefined ? { content: String(content) } : {}),
        ...(builder_id !== undefined ? { builder_id: builder_id ? String(builder_id) : null } : {}),
        ...(link_type !== undefined ? { link_type: link_type ? String(link_type) : null } : {}),
        ...(link_target !== undefined ? { link_target: link_target ? String(link_target) : null } : {}),
        ...(status !== undefined ? { status: String(status) } : {}),
      } as never,
    })
    res.json(updated)
  } catch (err) {
    console.error('[admin] news update failed:', err)
    res.status(500).json({ error: 'Failed to update news' })
  }
})
```

**Before writing this:** open the `BuilderNews` model in `frontend/prisma/schema.prisma` and confirm every field name above exists and every required field is supplied. If a field is missing or named differently, **use the schema's names** — do not keep this plan's guess. If `status` is an enum, the only legal values are `draft, pending_approval, published, archived, rejected` (verified against the live DB) — `approved` does not exist.

**Step 2 —** `frontend/app/admin/news/page.tsx:252-254`:

```tsx
// BEFORE
      const url = newsId ? `/api/builder/news/${newsId}` : '/api/builder/news'
      const method = newsId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
// AFTER
      const url = newsId ? `/admin/news/${newsId}` : '/admin/news'
      const method = newsId ? 'PATCH' : 'POST'

      const res = await adminFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
```
`adminFetch` is already imported at line 7.

**Verify:** `cd backend && npx tsc --noEmit` and `cd frontend && npx tsc --noEmit` both clean. Then create a news item in the admin panel and confirm it appears in the list after reload; edit it and confirm the change persists.

---

### Task 3.3 — Metro walk-time honesty check `⚠️ REPORT, THEN FIX ONLY IF CONFIRMED`

**Why:** a chat reply asserted *"10-minute walk to Sector 76 metro station"*, but `model Connectivity` has `distance_km` and **no** walk-minutes column. If that figure is derived and presented as fact, it breaks CLAUDE.md's "never invent data".

Steps:
1. Grep the backend for where walk minutes are produced: `grep -rn "walk\|minute" backend/src/lib/ai/prompts/ backend/src/lib/discovery/`.
2. Determine whether the number comes from a DB column, a hardcoded conversion (e.g. `km * 12`), or the model inventing it.
3. **If it is a hardcoded conversion:** label it as derived, not measured. Change the prompt/label to `~{n} min walk (est. from {distance_km} km)`. Do not remove the datum — make its provenance explicit.
4. **If the model invents it:** add "metro walk times" to the guardrail's fabrication list in `backend/src/lib/ai/guardrails.ts` and instruct the prompt to cite `distance_km` only.
5. **If it comes from a real column:** no action. Record that in §7.

**Verify:** no chat reply asserts a walk time as measured fact unless a DB column backs it.

---

## 4. PHASE 4 — UX REFINEMENTS (optional, only after Phases 1-3 are green)

### Task 4.1 — Inline clickable project names (RC-8)

Turn project names inside AI prose into clickable elements that inject `"Tell me more about <name>"`. Removes typing entirely.

Reuse `findProjectsMentioned` from Task 2.5 — do not write a second matcher. Emit the matched `{id, name}` list on the existing `ui_state` event as a new `entities` field, then in the frontend markdown renderer wrap each occurrence in a button that calls the existing `onAction` with a `TEXT_MESSAGE` chip.

**Constraints:** no new dependency; must not alter chip styling; must not break text selection or copy; must degrade to plain text when `entities` is absent.

**Skipped deliberately:** a floating quick-action bar above the input (duplicates the chip row in a second location, and the chat UI is finalized per CLAUDE.md) and a client-side intent parser (splits chip intelligence across two codebases and cannot ground names against the DB — Task 2.5 covers the same need server-side, grounded).

### Task 4.2 — `⛔ OWNER GATE` Delete the orphan `prisma/` directory

`prisma/schema.prisma` (26.6 KB) plus `prisma/migrations/` is dead: nothing reads it. `backend/package.json` pins `"prisma": { "schema": "../frontend/prisma/schema.prisma" }` and every root script `cd frontend` first. **Editing this orphan instead of the canonical schema is the exact reason the admin panel silently showed empty graphs.** It will cause the same failure again.

Needs an explicit owner "yes" before deletion — it is a delete of tracked files, including a migration directory (`20260722200000_add_shared_shortlist`) that was never applied anywhere.

```bash
git rm -r prisma/
```

**Verify (after owner confirms):** `cd frontend && npx prisma validate` passes; `cd backend && npx tsc --noEmit` clean; `npm run build` in `frontend` exits 0.

### Task 4.3 — Admin logout hits a non-existent route (report only)

`frontend/app/admin/layout.tsx:90` calls `DELETE /admin/auth`; `backend/src/routes/admin.ts` has only `POST /auth`. The call 404s. Logout still works because localStorage is cleared client-side, but **the server-side session stays valid for its full 7 days** — which matters now that Task 0's audit confirms the token is also accepted as a cookie.

Two options; do not pick one unilaterally, it is auth behavior:
- (a) add `router.delete('/auth')` that clears the cookie and invalidates the stored session, or
- (b) drop the network call and accept client-only logout.

Recommend (a). Flag to the owner.

---

## 5. EXECUTION ORDER

| # | Task | Files | Est | Risk |
|---|------|-------|-----|------|
| 1 | 1.1 TS error | 1 | 2m | none |
| 2 | 1.2 migration | ⛔ gate | — | owner |
| 3 | 2.1 soft dedup | 2 | 15m | low |
| 4 | 2.2 user-only history | 2 | 10m | low |
| 5 | 2.3 capChips fill | 1 | 10m | low |
| 6 | 2.4 chip floor | 1 | 25m | low |
| 7 | 2.5 prose chips | 2 (+1 new) | 40m | medium |
| 8 | 2.6 persist chips | 3 | 20m | low |
| 9 | 2.7 render gate | 1 | 10m | low |
| 10 | 2.8 regression tests | 1 | 25m | none |
| 11 | 3.1 chat_sessions diagnosis | report | 30m | none |
| 12 | 3.2 news routes | 2 | 30m | low |
| 13 | 3.3 walk-time honesty | report→1 | 20m | low |
| 14 | 4.x refinements | — | — | optional |

**Total for Phases 1-3: ~4h, ~15 files.**

Tasks 2.1-2.4 are independent of each other and each is individually shippable. **2.5 depends on 2.1** (it calls `filterNewChipsWithFloor`). **2.7 depends on 2.6** (it reads `message.chips`).

---

## 6. FINAL VERIFICATION GATE

```bash
cd backend && npx tsc --noEmit && npm test
cd ../frontend && npx tsc --noEmit && npx jest && npm run build
node -e "const s=require('./swagger.json'); console.log('paths:', Object.keys(s.paths).length)"
```

- [ ] Backend `tsc` clean, `npm test` green
- [ ] Frontend `tsc` clean, `jest` green (≥40 chip tests), `npm run build` exits 0
- [ ] Reported query → ≥2 project-named chips
- [ ] Repeat query in same session → chips still render
- [ ] Scrollback → each AI message keeps its own chips
- [ ] No chip references a project absent from the DB
- [ ] Admin news create + edit persist
- [ ] `chat_sessions` root cause documented in §7
- [ ] Chip visuals unchanged in light and dark mode (visual diff, not just "it compiles")

---

## 7. DISCOVERED DURING WORK

_Executor: append findings here. Do not fix inline._

- **(Task 3.1 finding — fill in):** root cause of `chat_sessions` = 0, with file:line.
- **(Task 3.3 finding — fill in):** where metro walk minutes originate.
- Analytics tables `query_metrics` and `property_events` are both empty. Almost certainly downstream of Task 3.1, since both are written from the chat path. Re-check after 3.1 lands before treating as a separate bug.
