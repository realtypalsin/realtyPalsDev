# AI Thinking Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the AI thinking indicator with intent echo, result count, and phase-specific messaging — maximum perceived quality with minimum complexity.

**Architecture:** Upgrade `StatusSteps.tsx` to accept `intent` and `resultCount` props, render phase-specific rich content. One-line prop change in `DiscoveryContent.tsx` to pass the data. No new state, no new files.

**Tech Stack:** React, TypeScript, Tailwind CSS

## Global Constraints

- No new state variables in DiscoveryContent — data already exists (`currentIntent`, result counts from the `properties` event)
- No new files — modify existing `StatusSteps.tsx` only
- No new dependencies
- Must stay visually consistent with existing orb/pulse UI (blue-400/blue-600 palette)
- TypeScript must pass with no `any` escapes beyond what already exists
- No regressions to existing phase transitions (`extracting` → `searching` → `generating` → `null`)

---

### Task 1: Add `resultCount` state to DiscoveryContent and pass props to StatusSteps

**Files:**
- Modify: `frontend/components/DiscoveryContent.tsx` (lines 171–172 for state, line 577–601 for onEvent handler, line 766 for StatusSteps usage)
- Modify: `frontend/components/chat/StatusSteps.tsx`

**Interfaces:**
- Produces: `StatusSteps` props interface `{ phase, intent, resultCount }`
- `intent` type: `Record<string, unknown> | null` (already the type of `currentIntent`)
- `resultCount` type: `number | null`

- [ ] **Step 1: Add `resultCount` state to DiscoveryContent**

In `frontend/components/DiscoveryContent.tsx`, after line 172 (`const [currentIntent, ...`), add:

```tsx
const [resultCount, setResultCount] = useState<number | null>(null)
```

- [ ] **Step 2: Set resultCount when properties event fires**

In the `onEvent` handler (around line 581), inside the `else if (event.type === 'properties')` block, add `setResultCount` after `setStatusPhase('generating')`:

```tsx
} else if (event.type === 'properties') {
  const exact = event.exactResults as unknown as ProjectCardType[];
  const nearby = event.nearbyResults as unknown as ProjectCardType[];
  const expansion = event.expansion;
  const shortlist = exact.length > 0 ? exact : nearby;
  localProjects = shortlist;
  setStatusPhase('generating');
  setResultCount(shortlist.length);   // ← add this line
  setChatHistory(prev => prev.map(m =>
```

- [ ] **Step 3: Reset resultCount on done/error**

In `onDone` callback (around line 653), add reset:

```tsx
onDone: () => {
  setStatusPhase(null);
  setResultCount(null);   // ← add this line
  streamingMsgIdRef.current = null;
```

Also add inside the `error` event handler (around line 609):

```tsx
} else if (event.type === 'error') {
  setStatusPhase(null);
  setResultCount(null);   // ← add this line
```

- [ ] **Step 4: Pass props to StatusSteps (line 766)**

Change:

```tsx
<StatusSteps phase={statusPhase} />
```

To:

```tsx
<StatusSteps phase={statusPhase} intent={currentIntent} resultCount={resultCount} />
```

- [ ] **Step 5: Update StatusSteps props interface**

Replace the entire `frontend/components/chat/StatusSteps.tsx` with the enhanced version below.

The component must:
- **extracting phase**: show "Understanding your requirements..." (no extra data yet)
- **searching phase**: show intent echo — BHK + sector + budget parsed from `intent` prop
- **generating phase**: show result count — "Found N properties · Writing recommendation..."
- Fallback gracefully when intent fields are missing (partial intent, no sector, etc.)

```tsx
'use client';

interface Props {
  phase: 'extracting' | 'searching' | 'generating' | null;
  intent?: Record<string, unknown> | null;
  resultCount?: number | null;
}

function formatIntent(intent: Record<string, unknown> | null | undefined): string | null {
  if (!intent) return null;
  const parts: string[] = [];
  if (Array.isArray(intent.bhk) && intent.bhk.length > 0) {
    parts.push(`${(intent.bhk as number[]).join('/')} BHK`);
  }
  if (intent.sector && typeof intent.sector === 'string') {
    parts.push(intent.sector);
  }
  if (intent.budgetMax && typeof intent.budgetMax === 'number') {
    parts.push(`under ₹${intent.budgetMax}Cr`);
  } else if (intent.budgetMin && typeof intent.budgetMin === 'number') {
    parts.push(`from ₹${intent.budgetMin}Cr`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

const PHASE_CONTENT: Record<
  'extracting' | 'searching' | 'generating',
  { label: string; detail?: (intent: Record<string, unknown> | null | undefined, resultCount: number | null | undefined) => string | null }
> = {
  extracting: {
    label: 'Extracting intent',
    detail: () => 'Understanding your requirements...',
  },
  searching: {
    label: 'Searching properties',
    detail: (intent) => {
      const formatted = formatIntent(intent);
      return formatted ? `Looking for ${formatted}` : 'Scanning available projects...';
    },
  },
  generating: {
    label: 'Writing response',
    detail: (_, resultCount) => {
      if (resultCount == null) return 'Preparing recommendation...';
      if (resultCount === 0) return 'No exact matches · Suggesting alternatives...';
      return `Found ${resultCount} ${resultCount === 1 ? 'property' : 'properties'} · Writing recommendation...`;
    },
  },
};

const STEPS = ['extracting', 'searching', 'generating'] as const;

export default function StatusSteps({ phase, intent, resultCount }: Props) {
  if (!phase) return null;

  const activeIndex = STEPS.indexOf(phase);
  const content = PHASE_CONTENT[phase];
  const detail = content.detail?.(intent, resultCount);

  return (
    <div className="px-4 py-2 space-y-1.5">
      {/* Step rail */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {STEPS.map((step, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          return (
            <div key={step} className="flex items-center gap-1.5">
              <span
                className={[
                  'w-1.5 h-1.5 rounded-full transition-all',
                  done ? 'bg-green-400' : active ? 'bg-blue-400 animate-pulse' : 'bg-gray-200',
                ].join(' ')}
              />
              <span className={active ? 'text-blue-600 font-medium' : done ? 'text-green-600' : 'text-gray-300'}>
                {PHASE_CONTENT[step].label}
              </span>
              {i < STEPS.length - 1 && <span className="text-gray-200 mx-0.5">›</span>}
            </div>
          );
        })}
      </div>
      {/* Phase detail line */}
      {detail && (
        <p className="text-[11px] text-gray-400 font-mono pl-0.5 truncate">
          {detail}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 6: TypeScript check**

Run:
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero errors related to `StatusSteps` props or `resultCount`.

- [ ] **Step 7: Commit**

```bash
git add frontend/components/chat/StatusSteps.tsx frontend/components/DiscoveryContent.tsx
git commit -m "feat: AI thinking experience — intent echo, result count, phase detail"
```

---

## Self-Review

**Spec coverage:**
- Intent Echo ✓ — `formatIntent()` renders BHK/sector/budget during `searching` phase
- Searching State ✓ — detail line shows "Looking for X BHK · Sector · under ₹YCr"
- Result Count State ✓ — `resultCount` state passed from `properties` event, shown in `generating` phase
- Generating Recommendation State ✓ — "Found N properties · Writing recommendation..."

**Placeholders:** None — all code is complete and specific.

**Type consistency:**
- `resultCount: number | null` set in DiscoveryContent, passed as `resultCount?: number | null` in StatusSteps ✓
- `intent: Record<string, unknown> | null` already typed in DiscoveryContent, passed as `intent?: Record<string, unknown> | null` ✓
- `formatIntent` consumes `Record<string, unknown> | null | undefined` ✓

**Regressions:** Step rail visual unchanged — same dot colors, same `›` separators, same font sizes. Detail line is additive below. Null phase still returns null. ✓
