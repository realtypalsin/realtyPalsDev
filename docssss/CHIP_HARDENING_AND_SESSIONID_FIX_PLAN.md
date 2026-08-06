# Implementation Plan: Chip Hardening + session_id Bug Fix

**Audience:** Any model (including Haiku 4.5). Every step gives exact file, exact line, exact code, and a runnable check. Do the steps in order. Do NOT skip the "Verify" step after each part.

**Rule:** Change only what each step names. Do not refactor unrelated code. Do not restyle chips beyond the specific fixes listed (styling is finalized per CLAUDE.md — the visual fixes here are bug fixes, not redesigns).

---

## Background: what breaks today

Two problems.

**Problem 1 — Chat crashes with `session_id is not defined`.**
`backend/src/routes/chat.ts` declares the variable as `sessionId` (camelCase, line 260) but two function calls pass `session_id` (snake_case, lines 892 and 923). `session_id` does not exist in that scope, so Node throws `ReferenceError: session_id is not defined`. The OpenAI call crashes, the Groq fallback crashes the same way, and the user sees the generic "AI services experiencing high load" message. This is a typo, not an API/network/rate-limit issue.

**Problem 2 — Chips sometimes break.**
The chip system (`frontend/components/chat/ChipPicker.tsx`, `SuggestionChip.tsx`, `CardSelectorChip.tsx`) has several concrete fragility points found by reading the code:

| # | File / line | Break | Effect |
|---|---|---|---|
| B1 | `ChipPicker.tsx:40` | `AnimatePresence` key = all chip ids joined. Duplicate or unstable ids → key collision / full remount | Chips flicker, wrong chip disappears |
| B2 | `ChipPicker.tsx:143` (`ChipButton`) | `whitespace-nowrap` with NO `truncate` | Long labels overflow, break the row layout (SuggestionChip already truncates — inconsistent) |
| B3 | `ChipPicker.tsx:23` | `.sort((a,b) => a.priority - b.priority)` | If `priority` is undefined → `NaN` → jumbled, non-deterministic order |
| B4 | `DiscoveryContent.tsx:422` (`dispatchAction`) | `submitLockRef` silently drops a chip click if a stream is already in flight | Spamming chips → clicks do nothing, feels dead |
| B5 | `SuggestionChip.tsx:50`, `ChipButton` | Empty / whitespace-only `label` renders an empty pill | Blank clickable chip |
| B6 | `handleChipAction` default case (`DiscoveryContent.tsx:1112`) | Unknown `actionType` from backend → silent `console.error`, no user feedback | Dead chip, no recovery |
| B7 | `CardSelectorChip.tsx` | Dropdown has NO click-outside close and NO Escape key | Dropdown stuck open |

The goal: (a) fix the crash, (b) harden the chips against these, (c) add a stress-test suite that spams / overloads / fuzzes chips and proves they hold up.

---

## PART A — Fix the `session_id` crash (backend)

### Step A1 — Understand which value is correct

Do NOT blindly rename `session_id` → `sessionId`. Read this first:

- `sessionId` (line 260) is **optional** — it is `undefined` on the first message of a brand-new session.
- `currentSessionId` (line 397: `const currentSessionId = sessionId || randomUUID()`) is the **resolved** id — always defined.
- The parameter these calls feed is used by `recordUsage(...)` in `backend/src/lib/ai/openai.ts:392` and the Groq equivalent — it links token/cost analytics to the session.

If you pass `sessionId`, analytics linkage is **lost on the first turn of every new session** (it will be `undefined`). Passing `currentSessionId` keeps linkage correct AND fixes the crash. **Use `currentSessionId`.**

### Step A2 — Confirm `currentSessionId` is in scope at both call sites

Open `backend/src/routes/chat.ts`. Confirm:
- Line ~397: `const currentSessionId = sessionId || randomUUID()` is declared.
- Lines 892 and 923 are inside the same function, AFTER line 397 (so `currentSessionId` is in scope).

If either call site is NOT after line 397 or is in a different function, STOP and report — do not guess.

### Step A3 — Apply the two edits

**Edit 1 — line 892:**
```
// BEFORE
      }, undefined, userId, session_id);
// AFTER
      }, undefined, userId, currentSessionId);
```

**Edit 2 — line 923:**
```
// BEFORE
          fullText = await streamWithGroq(fallbackSystemPrompt, messages, send, userId, session_id);
// AFTER
          fullText = await streamWithGroq(fallbackSystemPrompt, messages, send, userId, currentSessionId);
```

Do NOT change lines 949, 1027, 1033, 1067, 1073, 1306, 1347, 1448 — those `session_id:` occurrences are **object property keys** (valid, intentional), not variable references.

### Step A4 — Verify

1. Type check: `cd backend && npx tsc --noEmit`. Must report **no new errors** about `session_id` or `currentSessionId`.
2. Grep check: `grep -n "session_id" backend/src/routes/chat.ts` — every remaining hit must be either an object key (`session_id:`) or a Zod/string, NOT a bare variable passed as an argument. There must be **zero** occurrences of `, session_id)` or `, session_id;`.
3. Manual smoke (if backend runnable): start backend, send one chat message with NO `sessionId` in the body (simulates a new session). Confirm the response streams normally and the log shows `[CHAT] END streamWithOpenAI` — NOT `session_id is not defined`.

**Part A done when:** tsc clean, grep clean, one new-session chat message streams without the ReferenceError.

---

## PART B — Harden the chips (frontend)

Each step is a small, isolated edit. Apply, then run the matching test from Part C.

### Step B1 — Stable, unique AnimatePresence key (fixes flicker / wrong-chip-removal)

File: `frontend/components/chat/ChipPicker.tsx`, line 40.

Problem: `key={sorted.map(c => c.id).join(',')}`. If any two chips share an `id`, or ids are regenerated each render, the whole row remounts and flickers.

Change the render to (a) de-duplicate chips by `id` before rendering, and (b) keep the key stable.

Replace line 23:
```
// BEFORE
  const sorted = [...chips].sort((a, b) => a.priority - b.priority)
// AFTER — dedupe by id (first wins), then sort with NaN-safe priority
  const deduped = useMemo(() => {
    const seen = new Set<string>()
    const out: ChipAction[] = []
    for (const c of chips) {
      if (!c || !c.id || seen.has(c.id)) continue
      seen.add(c.id)
      out.push(c)
    }
    return out
  }, [chips])
  const sorted = useMemo(
    () => [...deduped].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999)),
    [deduped]
  )
```
This also fixes **B3** (NaN-safe `?? 999`).

Note: `useMemo` is already imported (line 3). Leave line 40's `key` as-is — after dedupe the ids are guaranteed unique, so the joined key is now stable/collision-free.

### Step B2 — Truncate long labels in ChipButton (fixes layout overflow)

File: `frontend/components/chat/ChipPicker.tsx`, line 143 (`baseClass` in `ChipButton`).

Problem: `whitespace-nowrap` with no width cap → a long label pushes the row wider and breaks it.

Change `baseClass`:
```
// BEFORE
  const baseClass = 'flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[13px] transition-colors duration-200 cursor-pointer whitespace-nowrap select-none'
// AFTER — cap width and truncate the label span
  const baseClass = 'flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[13px] transition-colors duration-200 cursor-pointer select-none max-w-[240px]'
```
Then wrap the label span (line 167):
```
// BEFORE
        <span>{chip.label}</span>
// AFTER
        <span className="truncate">{chip.label}</span>
```
Keep the full text reachable: the button already has `title={chip.label}` (line 165) — leave it; that is the hover tooltip for the truncated text.

### Step B3 — (folded into B1 above; the `?? 999` already fixes it)

No separate edit. Confirm the `sorted` useMemo from B1 contains `?? 999`.

### Step B4 — Give dropped chip clicks user feedback (fixes "dead" feeling under spam)

File: `frontend/components/DiscoveryContent.tsx`, `dispatchAction`, line 422.

Problem: `if (submitLockRef.current) return;` silently drops the click.

Do NOT remove the lock (it prevents double-submits — that is correct). Instead give feedback:
```
// BEFORE
  const dispatchAction = useCallback((action: import('@/components/chat/types').ConversationAction): void => {
    if (submitLockRef.current) return;
// AFTER
  const dispatchAction = useCallback((action: import('@/components/chat/types').ConversationAction): void => {
    if (submitLockRef.current) {
      setToast({ message: 'One moment — still working on your last request.' });
      return;
    }
```
`setToast` is already used elsewhere in this file (e.g. line 428), so it is in scope. Do not add new state.

### Step B5 — Skip empty-label chips (fixes blank pills)

Two files.

`frontend/components/chat/SuggestionChip.tsx` — add a guard at the top of the component body (after line 20, before `return`):
```
  if (!chip.label || !chip.label.trim()) return null
```
`frontend/components/chat/ChipPicker.tsx` — in `ChipButton` (after line 84, before the `useEffect`):
```
  if (!chip.label || !chip.label.trim()) return null
```

### Step B6 — Surface unknown action types to the user (defensive)

File: `frontend/components/DiscoveryContent.tsx`, `handleChipAction` default case, line 1112.

```
// BEFORE
      default:
        const _: never = action.actionType;
        console.error('[CHIP:EXHAUSTIVE] unhandled action type:', _);
        return;
// AFTER
      default:
        console.error('[CHIP:EXHAUSTIVE] unhandled action type:', action.actionType);
        setToast({ message: 'That option isn’t available right now.' });
        return;
```
Note: the `const _: never` line is removed because it will fail to compile if the union is ever extended — but that compile-time guard is exactly what hides a runtime-unknown value coming off the wire. Runtime safety wins here.

### Step B7 — Close CardSelectorChip dropdown on outside click + Escape

File: `frontend/components/chat/CardSelectorChip.tsx`.

Problem: dropdown (`isOpen`) never closes except by selecting an item or toggling the same button. Add the same click-outside + Escape pattern that `ChipButton` already uses.

Add imports (line 3):
```
// BEFORE
import { useState } from 'react'
// AFTER
import { useState, useRef, useEffect } from 'react'
```
Add a ref and effect inside the component (after line 16 `const [isOpen, setIsOpen] = useState(false)`):
```
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!isOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen])
```
Attach the ref to the outer wrapper (line 28):
```
// BEFORE
    <div className="relative inline-block group">
// AFTER
    <div className="relative inline-block group" ref={containerRef}>
```

**Part B done when:** all seven edits applied and the Part C tests pass.

---

## PART C — Chip stress-test suite (frontend, jest)

**Framework:** jest + `@testing-library/react` + `@testing-library/user-event` + `jest-axe` (all already in `frontend/package.json`). Config: `frontend/jest.config.js`, setup: `frontend/jest.setup.js`.

**framer-motion note:** `ChipPicker`, `SuggestionChip`, `CardSelectorChip` import `m` and `AnimatePresence` from `framer-motion`. In jsdom these render fine as plain elements, but if a test throws on animation, add this mock at the TOP of the test file:
```
jest.mock('framer-motion', () => ({
  m: new Proxy({}, { get: (_t, tag: string) => (props: any) => {
    const { children, whileTap, whileHover, initial, animate, exit, transition, ...rest } = props
    const Tag = tag as any
    return <Tag {...rest}>{children}</Tag>
  }}),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))
```

Create **one** new file: `frontend/components/chat/__tests__/ChipStress.test.tsx`.

Use this exact structure. Each `describe` maps to a break point above so failures are traceable.

### Test data helper (top of file)
```
import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import ChipPicker from '../ChipPicker'
import { SuggestionChip } from '../SuggestionChip'
import type { ChipAction } from '../types'

function makeChip(over: Partial<ChipAction> = {}): ChipAction {
  return {
    id: over.id ?? `chip-${Math.random().toString(36).slice(2)}`,
    actionType: over.actionType ?? 'TEXT_MESSAGE',
    label: over.label ?? 'Show results',
    icon: over.icon ?? '🔍',
    analyticsId: over.analyticsId ?? 'a1',
    priority: over.priority ?? 1,
    payload: over.payload ?? { text: 'Show results' },
    group: over.group,
  } as ChipAction
}

// Deterministic id generator for spam tests (no Math.random in assertions)
function chips(n: number, over: (i: number) => Partial<ChipAction> = () => ({})): ChipAction[] {
  return Array.from({ length: n }, (_, i) => makeChip({ id: `c${i}`, label: `Chip ${i}`, ...over(i) }))
}
```

### Suite 1 — Volume / overload (targets B1, B2)
```
describe('ChipPicker: volume', () => {
  it('renders 100 chips without crashing', () => {
    const onAction = jest.fn()
    render(<ChipPicker chips={chips(100)} onAction={onAction} />)
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(100)
  })

  it('renders 0 chips as null (no empty container)', () => {
    const { container } = render(<ChipPicker chips={[]} onAction={jest.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('dedupes chips with identical ids (B1)', () => {
    const dup = [makeChip({ id: 'same', label: 'A' }), makeChip({ id: 'same', label: 'B' })]
    render(<ChipPicker chips={dup} onAction={jest.fn()} />)
    // only the first survives → exactly one button
    expect(screen.getAllByRole('button').length).toBe(1)
  })

  it('truncates a very long label without throwing (B2)', () => {
    const long = 'X'.repeat(500)
    render(<ChipPicker chips={[makeChip({ label: long })]} onAction={jest.fn()} />)
    const btn = screen.getByRole('button')
    expect(btn.getAttribute('title')).toBe(long) // full text preserved in tooltip
  })
})
```

### Suite 2 — Ordering fuzz (targets B3)
```
describe('ChipPicker: ordering', () => {
  it('handles undefined priority without NaN reordering (B3)', () => {
    const list = [
      makeChip({ id: 'p-undef', label: 'NoPri', priority: undefined as any }),
      makeChip({ id: 'p2', label: 'Two', priority: 2 }),
      makeChip({ id: 'p1', label: 'One', priority: 1 }),
    ]
    render(<ChipPicker chips={list} onAction={jest.fn()} />)
    const labels = screen.getAllByRole('button').map(b => b.textContent)
    // priority 1, then 2, then undefined (999) last — deterministic
    expect(labels[0]).toContain('One')
    expect(labels[labels.length - 1]).toContain('NoPri')
  })
})
```

### Suite 3 — Click spam / debounce (targets B4 at component level)
```
describe('ChipPicker: click spam', () => {
  it('debounces rapid clicks on the same single-project chip', async () => {
    const onAction = jest.fn()
    const chip = makeChip({ payload: { projects: [{ id: '1', name: 'Alpha' }] } })
    render(<ChipPicker chips={[chip]} onAction={onAction} />)
    const btn = screen.getByRole('button')
    // fire 10 clicks synchronously — debounce (500ms) must collapse to 1
    for (let i = 0; i < 10; i++) fireEvent.click(btn)
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('fires again after the debounce window', async () => {
    jest.useFakeTimers()
    const onAction = jest.fn()
    const chip = makeChip({ payload: { text: 'go' } })
    render(<ChipPicker chips={[chip]} onAction={onAction} />)
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    jest.advanceTimersByTime(600)
    fireEvent.click(btn)
    expect(onAction).toHaveBeenCalledTimes(2)
    jest.useRealTimers()
  })
})
```

### Suite 4 — Malformed / hostile payloads (targets B5, general robustness)
```
describe('ChipPicker: malformed input', () => {
  it('skips empty-label chips (B5)', () => {
    render(<ChipPicker chips={[makeChip({ label: '   ' }), makeChip({ label: 'Real' })]} onAction={jest.fn()} />)
    expect(screen.getAllByRole('button').length).toBe(1)
    expect(screen.getByText('Real')).toBeTruthy()
  })

  it('does not execute HTML in a label (XSS safety)', () => {
    const evil = '<img src=x onerror=alert(1)>'
    render(<ChipPicker chips={[makeChip({ label: evil })]} onAction={jest.fn()} />)
    // React escapes it → rendered as literal text, no <img> element
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByText(evil)).toBeTruthy()
  })

  it('survives a chip with an empty projects array', () => {
    const chip = makeChip({ payload: { projects: [] } })
    expect(() => render(<ChipPicker chips={[chip]} onAction={jest.fn()} />)).not.toThrow()
  })

  it('survives a chip whose payload is undefined', () => {
    const chip = makeChip({ payload: undefined as any })
    expect(() => render(<ChipPicker chips={[chip]} onAction={jest.fn()} />)).not.toThrow()
  })
})
```

### Suite 5 — Multi-project dropdown (targets B1 dropdown path)
```
describe('ChipPicker: multi-project dropdown', () => {
  it('opens a dropdown for a chip with >1 project', async () => {
    const user = userEvent.setup()
    const chip = makeChip({ payload: { projects: [{ id: '1', name: 'Alpha' }, { id: '2', name: 'Beta' }] } })
    render(<ChipPicker chips={[chip]} onAction={jest.fn()} />)
    await user.click(screen.getByRole('button', { name: chip.label }))
    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.getByText('Beta')).toBeTruthy()
  })

  it('selecting a project calls onAction exactly once with resolved text', async () => {
    const user = userEvent.setup()
    const onAction = jest.fn()
    const chip = makeChip({
      payload: { projects: [{ id: '1', name: 'Alpha' }, { id: '2', name: 'Beta' }], actionPrefix: 'Compare' },
    })
    render(<ChipPicker chips={[chip]} onAction={onAction} />)
    await user.click(screen.getByRole('button', { name: chip.label }))
    await user.click(screen.getByText('Beta'))
    expect(onAction).toHaveBeenCalledTimes(1)
    expect(onAction.mock.calls[0][0].payload.text).toBe('Compare Beta')
  })
})
```

### Suite 6 — Accessibility under load (jest-axe)
```
describe('ChipPicker: a11y', () => {
  it('has no axe violations with 20 chips', async () => {
    const { container } = render(<ChipPicker chips={chips(20)} onAction={jest.fn()} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```
`jest-axe` matcher setup: if `expect(results).toHaveNoViolations()` errors as "not a function", add to the TOP of the file:
```
import { toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)
```

### Suite 7 — SuggestionChip direct (targets B5 + existing behavior)
Keep the existing `SuggestionChip.test.tsx` — do NOT delete it. Add these to the new file:
```
describe('SuggestionChip: robustness', () => {
  it('returns null for whitespace label (B5)', () => {
    const { container } = render(
      <SuggestionChip chip={makeChip({ label: '  ' })} chipPicker={null} onSetChipPicker={jest.fn()} onAction={jest.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('does not fire onAction when disabled', async () => {
    const onAction = jest.fn()
    render(
      <SuggestionChip chip={makeChip()} chipPicker={null} onSetChipPicker={jest.fn()} onAction={onAction} disabled />
    )
    fireEvent.click(screen.getByRole('button'))
    expect(onAction).not.toHaveBeenCalled()
  })
})
```

---

## PART D — CardSelectorChip test (targets B7)

Add to the same new test file (or a sibling `CardSelectorChip.test.tsx`):
```
import { CardSelectorChip } from '../CardSelectorChip'

describe('CardSelectorChip: dropdown lifecycle (B7)', () => {
  const projects = [{ id: '1', name: 'Alpha' }, { id: '2', name: 'Beta' }]

  it('returns null with <=1 project', () => {
    const { container } = render(
      <CardSelectorChip chip={makeChip()} projects={[{ id: '1', name: 'Solo' }]} onSelect={jest.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('closes on Escape (B7)', async () => {
    const user = userEvent.setup()
    render(<CardSelectorChip chip={makeChip()} projects={projects} onSelect={jest.fn()} />)
    await user.click(screen.getByRole('button', { name: /Show results/ }))
    expect(screen.getByText('Alpha')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('Alpha')).toBeNull()
  })

  it('closes on outside click (B7)', async () => {
    const user = userEvent.setup()
    render(<div><CardSelectorChip chip={makeChip()} projects={projects} onSelect={jest.fn()} /><button>outside</button></div>)
    await user.click(screen.getByRole('button', { name: /Show results/ }))
    expect(screen.getByText('Alpha')).toBeTruthy()
    fireEvent.mouseDown(screen.getByText('outside'))
    expect(screen.queryByText('Alpha')).toBeNull()
  })

  it('onSelect fires once with the chosen project id', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    render(<CardSelectorChip chip={makeChip()} projects={projects} onSelect={onSelect} />)
    await user.click(screen.getByRole('button', { name: /Show results/ }))
    await user.click(screen.getByText('Beta'))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0][1]).toBe('2')
  })
})
```

---

## PART E — Run & verify everything

```
# Backend crash fix
cd backend && npx tsc --noEmit
grep -n ", session_id)" src/routes/chat.ts   # must return NOTHING
grep -n ", session_id;" src/routes/chat.ts   # must return NOTHING

# Frontend chip tests
cd ../frontend && npx jest components/chat        # all chip suites green
npx jest                                          # full frontend suite still green
```

**Whole task done when:**
1. `tsc --noEmit` clean in backend; the two grep checks return nothing.
2. A new-session chat message streams without `session_id is not defined`.
3. Every suite in `ChipStress.test.tsx` (and the CardSelectorChip suite) passes.
4. The pre-existing `SuggestionChip.test.tsx` still passes (no regression).
5. `npx jest` full frontend run has no NEW failures vs. before this change.

---

## Scope guard (do NOT do these)

- Do NOT change chip colors, radii, spacing, fonts, or animation timings beyond the exact `baseClass`/`truncate` edit in B2. Styling is finalized.
- Do NOT rename `sessionId` globally or touch the `session_id:` object keys.
- Do NOT remove the `submitLockRef` guard (B4 keeps it; only adds a toast).
- Do NOT add new dependencies — jest, testing-library, and jest-axe are already installed.
- Do NOT edit backend chip-generation logic; this task is frontend rendering + the one backend typo.

## Open question to confirm before starting (ask if unsure)

B6 removes the `const _: never` exhaustiveness check. If the team relies on that compile-time check to catch missing `actionType` handlers, an alternative is to KEEP the `never` check for the compiler but ALSO handle the runtime-unknown case above it. State which you want; default in this plan is runtime safety (remove the `never`).
