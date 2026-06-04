# Sprint C: WhatsApp + Smart Chips + Comparison Table — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add WhatsApp lead handoff button to property cards and detail panels, show contextual smart chips after ADVISOR mode recommendations, and render an inline comparison table when user compares two shortlisted properties.

**Architecture:** Pure frontend — no backend changes. WhatsApp uses `wa.me` URL with `encodeURIComponent`. Smart chips read `lastShortlist` state already in `DiscoveryContent`. Comparison table is a new component fed from `lastShortlist`. Everything is additive — no existing code removed.

**Tech Stack:** Next.js, React, TypeScript, Tailwind, `@phosphor-icons/react` (WhatsApp icon via SVG or custom)

---

## File Map

| File | Change |
|------|--------|
| `frontend/components/ProjectCard.tsx` | WhatsApp button in actions row |
| `frontend/components/ProjectDetailPanel.tsx` | WhatsApp button in footer |
| `frontend/components/ComparisonTable.tsx` | New — side-by-side comparison |
| `frontend/components/DiscoveryContent.tsx` | Smart chips + comparison table trigger |

---

## Task 1: WhatsApp button — ProjectCard + ProjectDetailPanel

**Files:**
- Modify: `frontend/components/ProjectCard.tsx`
- Modify: `frontend/components/ProjectDetailPanel.tsx`

### Context

`ProjectCard.tsx` currently has two action buttons in a `flex gap-2 pt-3` row:
1. "View Details" (blue, flex-1)
2. "Ask AI" (gray icon button, px-3)

Add WhatsApp as a third icon button (green). The WhatsApp number comes from `process.env.NEXT_PUBLIC_WHATSAPP_NUMBER`. Hide the button if the env var is not set.

`ProjectDetailPanel.tsx` footer has one full-width "Request Site Visit" button. Change to a two-button split: Site Visit (blue, flex-1) + WhatsApp (green, flex-1).

**WhatsApp URL helper** — define once, use in both files (or inline — no abstraction needed):

```typescript
function buildWhatsAppUrl(project: {
  name: string
  builder: { name: string }
  sector: string
  price_range_label: string
  status: string
  rera_number?: string | null
  unit_types: Array<{ bhk: number }>
}): string | null {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  if (!number) return null

  const bhkList = [...new Set(project.unit_types.map((u) => `${u.bhk}BHK`))].join(' / ')
  const statusLabel =
    project.status === 'ready_to_move' ? 'Ready to Move'
    : project.status === 'new_launch' ? 'New Launch'
    : 'Under Construction'

  const msg = [
    `Hi! I'm interested in *${project.name}* by ${project.builder.name} in ${project.sector}, Noida.`,
    ``,
    `Configuration: ${bhkList}`,
    `Price: ${project.price_range_label}`,
    `Status: ${statusLabel}`,
    project.rera_number ? `RERA: ${project.rera_number}` : null,
    ``,
    `Could you help me with more details and a site visit?`,
  ].filter((l) => l !== null).join('\n')

  return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`
}
```

**WhatsApp SVG icon** (inline — no package needed):
```tsx
const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)
```

- [ ] **Step 1: Add WhatsApp button to ProjectCard.tsx**

Read `frontend/components/ProjectCard.tsx`. Add the `buildWhatsAppUrl` function and `WhatsAppIcon` component before the main component. Then update the actions div:

```tsx
{/* Actions */}
<div className="flex gap-2 pt-3">
  <button
    onClick={() => onDetailOpen?.(project)}
    className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-[12px] font-bold py-2.5 rounded-xl transition-colors"
  >
    View Details
    <ArrowRight size={12} weight="bold" />
  </button>

  {(() => {
    const waUrl = buildWhatsAppUrl(project)
    return waUrl ? (
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-center gap-1 bg-[#25D366] hover:bg-[#20ba59] text-white text-[11px] font-semibold px-3 py-2.5 rounded-xl transition-colors"
        title="WhatsApp enquiry"
      >
        <WhatsAppIcon size={15} />
      </a>
    ) : null
  })()}

  <button
    onClick={handleAskAI}
    className="flex items-center justify-center gap-1 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-gray-400 text-[11px] font-semibold px-3 py-2.5 rounded-xl transition-colors border border-gray-100 hover:border-blue-100"
    title="Ask AI about this"
  >
    <Sparkle size={14} weight="duotone" />
  </button>
</div>
```

- [ ] **Step 2: Add WhatsApp button to ProjectDetailPanel.tsx**

Read `frontend/components/ProjectDetailPanel.tsx`. Add `buildWhatsAppUrl` and `WhatsAppIcon` (same definitions). Update the footer CTA section. Find the footer div (has `Request Site Visit` button) and replace:

```tsx
{/* Footer CTA */}
<div className="flex-shrink-0 border-t border-gray-100 p-4 bg-white">
  <div className="flex gap-3">
    <button
      onClick={() => {
        window.dispatchEvent(new CustomEvent('realtypals:ask-ai', {
          detail: { text: `I want to schedule a site visit for ${d?.name}` },
        }))
        onClose()
      }}
      className="flex-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-4 rounded-2xl text-[14px] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
    >
      <MapTrifold size={16} weight="duotone" />
      Request Site Visit
    </button>

    {(() => {
      const waUrl = d ? buildWhatsAppUrl(d as any) : null
      return waUrl ? (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold py-4 rounded-2xl text-[14px] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
        >
          <WhatsAppIcon size={16} />
          WhatsApp Us
        </a>
      ) : null
    })()}
  </div>
</div>
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Fix any errors. Common: `project.unit_types` type mismatch — cast via `as any` if needed on the `d` object in `ProjectDetailPanel` since `d` can be `ProjectCard | ProjectDetail`.

- [ ] **Step 4: Check NEXT_PUBLIC_WHATSAPP_NUMBER in .env.local**

```bash
grep -n "WHATSAPP" frontend/.env.local 2>/dev/null || echo "NOT_SET"
```

If not set, add a placeholder:
```
NEXT_PUBLIC_WHATSAPP_NUMBER=919999999999
```
(User will replace with real number. The button shows only when this is set.)

- [ ] **Step 5: Commit**

```bash
git add frontend/components/ProjectCard.tsx frontend/components/ProjectDetailPanel.tsx frontend/.env.local
git commit -m "feat: WhatsApp handoff button on property cards and detail panel with prefilled property message"
```

---

## Task 2: Smart follow-up chips — ADVISOR mode

**Files:**
- Modify: `frontend/components/DiscoveryContent.tsx`

### Context

In `DiscoveryContent.tsx`, `chatPhase` tracks `'DISCOVERY' | 'ADVISOR'`. `lastShortlist` holds the current shortlisted properties. The `renderMessage` function renders each chat message.

Currently, after ADVISOR mode messages, there's already a collapsible shortlist button (lines ~752–783). We add the smart chips just below that.

The chips are rendered only on the LAST AI message (`index === chatHistory.length - 1`) when `chatPhase === 'ADVISOR'` and `lastShortlist.length > 0`.

Each chip calls `submitMessage(text)` — this function already exists in the component.

- [ ] **Step 1: Add ADVISOR chips to `renderMessage`**

Find the block after the collapsible shortlist (around line 783, after the closing `</div>` of the collapsible section). Add the chips block:

```tsx
{/* ── Smart follow-up chips — ADVISOR mode only, last message only ── */}
{message.type === 'ai' && chatPhase === 'ADVISOR' && lastShortlist.length > 0 && index === chatHistory.length - 1 && !isSubmitting && (
  <div className="mt-3 ml-14 flex flex-wrap gap-2">
    {/* EMI chip */}
    <button
      onClick={() => submitMessage(
        `Calculate EMI for ${lastShortlist[0].name} at ${lastShortlist[0].price_min_cr ?? lastShortlist[0].price_range_label} Cr with 20% down payment`
      )}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-full text-[11px] font-semibold text-indigo-700 transition-all"
    >
      <span>📊</span> Calculate EMI
    </button>

    {/* Compare chip — only if 2+ properties shortlisted */}
    {lastShortlist.length >= 2 ? (
      <button
        onClick={() => submitMessage(
          `Compare ${lastShortlist[0].name} vs ${lastShortlist[1].name} side by side`
        )}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-full text-[11px] font-semibold text-blue-700 transition-all"
      >
        <span>⚖️</span> Compare {lastShortlist[0].name.split(' ').slice(-1)[0]} vs {lastShortlist[1].name.split(' ').slice(-1)[0]}
      </button>
    ) : (
      <button
        onClick={() => submitMessage(`Compare these properties for me`)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-full text-[11px] font-semibold text-blue-700 transition-all"
      >
        <span>⚖️</span> Compare Properties
      </button>
    )}

    {/* Site visit chip */}
    <button
      onClick={() => submitMessage(
        `I'd like to schedule a site visit for ${lastShortlist[0].name}`
      )}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-100 rounded-full text-[11px] font-semibold text-green-700 transition-all"
    >
      <span>🏠</span> Request Site Visit
    </button>
  </div>
)}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

`lastShortlist[0].price_min_cr` may be `null` — the template literal handles it via `?? lastShortlist[0].price_range_label` fallback.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/DiscoveryContent.tsx
git commit -m "feat: smart follow-up chips in ADVISOR mode — Calculate EMI, Compare, Request Site Visit"
```

---

## Task 3: Inline comparison table

**Files:**
- Create: `frontend/components/ComparisonTable.tsx`
- Modify: `frontend/components/DiscoveryContent.tsx`

### Context

When the user clicks the "Compare X vs Y" chip (or types a comparison query) and `lastShortlist` has 2+ properties, render a structured side-by-side comparison table inline in the chat feed below the AI response.

The table uses data already in `lastShortlist[0]` and `lastShortlist[1]` — no API call needed.

The trigger: when a message submitted to the AI contains "compare" AND `lastShortlist.length >= 2`, set `showComparisonTable: true` in the corresponding AI message. The `renderMessage` function checks this flag and renders `<ComparisonTable>` below the message.

- [ ] **Step 1: Create ComparisonTable component**

Create `frontend/components/ComparisonTable.tsx`:

```tsx
'use client'

import type { ProjectCard } from '@/types/project'
import { CheckCircle, Clock, SealCheck } from '@phosphor-icons/react'

interface Props {
  left: ProjectCard
  right: ProjectCard
}

const statusLabel = (s: ProjectCard['status']) =>
  s === 'ready_to_move' ? 'Ready to Move' : s === 'new_launch' ? 'New Launch' : 'Under Construction'

const statusColor = (s: ProjectCard['status']) =>
  s === 'ready_to_move' ? 'text-emerald-600' : s === 'new_launch' ? 'text-blue-600' : 'text-amber-600'

function Row({ label, left, right, highlight }: { label: string; left: React.ReactNode; right: React.ReactNode; highlight?: boolean }) {
  return (
    <tr className={highlight ? 'bg-blue-50/50' : 'bg-white'}>
      <td className="py-2.5 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-r border-gray-100 w-28">{label}</td>
      <td className="py-2.5 px-4 text-[12px] text-gray-800 border-r border-gray-100 w-1/2">{left}</td>
      <td className="py-2.5 px-4 text-[12px] text-gray-800 w-1/2">{right}</td>
    </tr>
  )
}

export default function ComparisonTable({ left, right }: Props) {
  const leftBhk = [...new Set(left.unit_types.map((u) => `${u.bhk}BHK`))].join(', ')
  const rightBhk = [...new Set(right.unit_types.map((u) => `${u.bhk}BHK`))].join(', ')

  const leftAmenities = left.top_amenities.slice(0, 3).map((a) => a.name).join(', ') || '—'
  const rightAmenities = right.top_amenities.slice(0, 3).map((a) => a.name).join(', ') || '—'

  const leftConn = left.top_connectivity[0] ? `${left.top_connectivity[0].name}${left.top_connectivity[0].distance_km ? ` (${left.top_connectivity[0].distance_km}km)` : ''}` : '—'
  const rightConn = right.top_connectivity[0] ? `${right.top_connectivity[0].name}${right.top_connectivity[0].distance_km ? ` (${right.top_connectivity[0].distance_km}km)` : ''}` : '—'

  return (
    <div className="mt-3 rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="grid grid-cols-[7rem_1fr_1fr] bg-gray-900 text-white">
        <div className="py-3 px-3" />
        <div className="py-3 px-4 border-r border-white/10">
          <p className="text-[13px] font-bold truncate">{left.name}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{left.builder.name}</p>
        </div>
        <div className="py-3 px-4">
          <p className="text-[13px] font-bold truncate">{right.name}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{right.builder.name}</p>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse">
        <tbody className="divide-y divide-gray-100">
          <Row
            label="Price"
            left={<span className="font-bold text-gray-900">{left.price_range_label}</span>}
            right={<span className="font-bold text-gray-900">{right.price_range_label}</span>}
            highlight
          />
          <Row
            label="Config"
            left={leftBhk || '—'}
            right={rightBhk || '—'}
          />
          <Row
            label="Status"
            left={<span className={`font-semibold ${statusColor(left.status)}`}>{statusLabel(left.status)}</span>}
            right={<span className={`font-semibold ${statusColor(right.status)}`}>{statusLabel(right.status)}</span>}
          />
          <Row
            label="Sector"
            left={left.sector}
            right={right.sector}
          />
          <Row
            label="RERA"
            left={left.rera_number
              ? <span className="flex items-center gap-1 text-blue-600"><SealCheck size={11} weight="fill" />{left.rera_number}</span>
              : <span className="text-gray-400">—</span>}
            right={right.rera_number
              ? <span className="flex items-center gap-1 text-blue-600"><SealCheck size={11} weight="fill" />{right.rera_number}</span>
              : <span className="text-gray-400">—</span>}
            highlight
          />
          <Row
            label="Amenities"
            left={<span className="text-gray-600">{leftAmenities}</span>}
            right={<span className="text-gray-600">{rightAmenities}</span>}
          />
          <Row
            label="Nearest"
            left={<span className="text-gray-600">{leftConn}</span>}
            right={<span className="text-gray-600">{rightConn}</span>}
          />
          {(left.possession_label || right.possession_label) && (
            <Row
              label="Possession"
              left={left.possession_label ?? '—'}
              right={right.possession_label ?? '—'}
              highlight
            />
          )}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Add `showComparisonTable` flag to ChatMessage type**

In `frontend/types/property.ts`, find the `ChatMessage` interface. Add:
```typescript
showComparisonTable?: boolean
```

- [ ] **Step 3: Set the flag when a compare message is sent**

In `DiscoveryContent.tsx`, find the `handleChatSubmit` function. After receiving the AI response and before `setChatHistory`, check if the user message contained "compare" and shortlist has 2+ properties:

```typescript
// After: const aiMessage: ChatMessage = { ... }
// Add this property to aiMessage:
showComparisonTable: chatInput.toLowerCase().includes('compare') && lastShortlist.length >= 2,
```

Also do the same in `handleRegenerate` where the AI message is constructed.

- [ ] **Step 4: Render ComparisonTable in `renderMessage`**

In `DiscoveryContent.tsx`, add import at top:
```typescript
import ComparisonTable from '@/components/ComparisonTable'
```

In `renderMessage`, after the closing of the smart chips block (or near the end of the AI message render), add:

```tsx
{/* ── Inline comparison table ── */}
{message.type === 'ai' && message.showComparisonTable && lastShortlist.length >= 2 && (
  <div className="mt-3 ml-14 w-full">
    <ComparisonTable left={lastShortlist[0]} right={lastShortlist[1]} />
  </div>
)}
```

- [ ] **Step 5: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add frontend/components/ComparisonTable.tsx frontend/components/DiscoveryContent.tsx frontend/types/property.ts
git commit -m "feat: inline property comparison table rendered in chat when user compares two shortlisted properties"
```

---

## Self-Review

**Spec coverage:**
- [x] WhatsApp button on ProjectCard — Task 1 Step 1
- [x] WhatsApp button on ProjectDetailPanel — Task 1 Step 2  
- [x] Prefilled message with property name, builder, sector, BHK, price, status, RERA — `buildWhatsAppUrl()`
- [x] Button hidden when env var not set — `if (!number) return null`
- [x] Smart chips after ADVISOR AI message — Task 2 Step 1
- [x] "Compare" chip uses actual property names from lastShortlist — `lastShortlist[0].name`
- [x] "Calculate EMI" uses first shortlisted property price — `lastShortlist[0].price_min_cr`
- [x] "Request Site Visit" prefills message — Task 2 Step 1
- [x] ComparisonTable component — Task 3 Step 1
- [x] Triggered by "compare" keyword in user message — Task 3 Step 3
- [x] Shows 2 properties side-by-side — Task 3 Step 1
- [x] All rows: price, config, status, sector, RERA, amenities, connectivity, possession — Task 3 Step 1
- [x] TypeScript check in every task — each task has tsc step

**No placeholders:** All code is complete.

**Type note:** `buildWhatsAppUrl` takes a type with `status: string` — ProjectCard has `status: 'under_construction' | 'ready_to_move' | 'new_launch'` which is compatible. The `as any` cast on `d` in ProjectDetailPanel is intentional since `d` is `ProjectCard | ProjectDetail | null`.
