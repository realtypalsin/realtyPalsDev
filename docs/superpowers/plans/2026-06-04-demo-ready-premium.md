# Demo-Ready Fixes & Premium UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical bugs (session switching, encoding, out-of-scope areas, map crash, panel spring) and elevate the UI to partner-demo-ready quality with enhanced commute, icon system, and premium micro-interactions.

**Architecture:** Surgical file-by-file changes — no structural refactors. New `MapErrorBoundary` component for map crash safety. System prompt + tool description updated for out-of-scope city handling. Commute enhanced with localStorage persistence. Icons standardized to Phosphor (already installed), greyscale treatment throughout.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Framer Motion, Phosphor Icons (`@phosphor-icons/react`), Lucide (secondary), Groq AI SDK streaming

---

## File Map

**Modified:**
- `frontend/components/DiscoveryContent.tsx` — session switching fix + encoding fix
- `frontend/lib/ai/prompts.ts` — out-of-scope city system prompt
- `frontend/app/api/v1/chat/route.ts` — search_properties tool description
- `frontend/components/SectorMap.tsx` — wrap with error boundary
- `frontend/components/ProjectDetailPanel.tsx` — animation tween + skeleton + icon greyscale
- `frontend/components/ProjectCard.tsx` — builder trust badge + unique icons
- `frontend/components/ComparisonTable.tsx` — diff cell highlight + more rows
- `frontend/components/CommuteCalculator.tsx` — localStorage persistence + premium UI
- `frontend/components/chat/MessageBubble.tsx` — staggered card animation

**Created:**
- `frontend/components/MapErrorBoundary.tsx` — React class error boundary

---

## Task 1: Fix Session Switching + Encoding Bugs (1A + 1B)

**Files:**
- Modify: `frontend/components/DiscoveryContent.tsx`

**Root cause:** The session restore `useEffect` guards on `isInitialized === true`, so clicking a different session from the sidebar while on `/discover` does nothing — the effect exits early. Encoding bug: `â€"` in welcome strings is a UTF-8 double-encoded em dash.

- [ ] **Step 1: Fix encoding — replace all malformed em dashes**

In `DiscoveryContent.tsx`, find and replace all 3 occurrences (in `performReset` and the session restore fallback branches) of:
```
"Hi! I'm RealtyPal â€" your AI advisor for Noida real estate. What are you looking for?"
```
with:
```tsx
"Hi! I'm RealtyPal — your AI advisor for Noida real estate. What are you looking for?"
```

Also fix in the `RateLimitBanner` text: `"Sending too fast â€" wait"` → `"Sending too fast — wait"`
And any other `â€"` occurrences in the file (search for `â€"`).

- [ ] **Step 2: Add session tracking ref**

After the `const [sessionId, setSessionId] = useState<string | null>(null)` declaration, add:
```tsx
// Tracks which session URL param has been fully restored — prevents re-init loops
const lastRestoredSessionParamRef = useRef<string | null>(null)
```

- [ ] **Step 3: Add session-switching effect (runs AFTER init)**

Add this new `useEffect` AFTER the existing session restore `useEffect` (around line 435):
```tsx
// When user clicks a different session from sidebar while already initialized
useEffect(() => {
  const urlSession = searchParams.get('session')
  if (!userId || !isInitialized) return
  if (!urlSession) return
  if (urlSession === lastRestoredSessionParamRef.current) return
  // Different session requested — trigger re-initialization
  setChatHistory([])
  setLastShortlist([])
  setShowRecommendations(false)
  setChatPhase('DISCOVERY')
  setChatTurnCount(0)
  setExpandedShortlists(new Set())
  setIsInitialized(false)
}, [userId, isInitialized, searchParams])
```

- [ ] **Step 4: Track restored session param inside the init effect**

Inside the existing session restore `useEffect`, after the line `router.replace('/discover', { scroll: false })` (inside `if (searchParams.get('session')) { ... }`), add:
```tsx
lastRestoredSessionParamRef.current = searchParams.get('session')
```

Also add this tracking for the case when no `?session=` param exists (fresh init):
```tsx
// At the very start of the try block inside the async IIFE, before the fetch:
if (!searchParams.get('session')) {
  lastRestoredSessionParamRef.current = null
}
```

- [ ] **Step 5: Verify it works**

Manual test:
1. Open `/discover`, chat a few messages (Session A)
2. Click a different session from the sidebar "Recent" list
3. Expected: chat clears, new session messages load, URL shows `/discover` (param cleaned)
4. Click another session → same clean switch
5. Click "New Chat" → welcome message shows

- [ ] **Step 6: Commit**

```bash
git add frontend/components/DiscoveryContent.tsx
git commit -m "fix: session switching from sidebar + UTF-8 em dash encoding"
```

---

## Task 2: Out-of-Scope City Handling — Approach B (1C)

**Files:**
- Modify: `frontend/lib/ai/prompts.ts`
- Modify: `frontend/app/api/v1/chat/route.ts`

**Approach B:** When user asks about Gurgaon/Mumbai/etc., the AI uses `search_web` to get real estate market context for that city, presents it (price ranges, key localities, market overview), then bridges to: "My live inventory focuses on Noida — want to see comparable options there?"

- [ ] **Step 1: Update search_properties tool description**

In `frontend/app/api/v1/chat/route.ts`, find the `search_properties` tool description:
```ts
description: 'Search the RealtyPals property database. Call ONLY when the user has explicitly named a city or sector in this conversation. NEVER call without a confirmed location.',
```
Replace with:
```ts
description: 'Search the RealtyPals property database. The database covers Noida and Greater Noida only. Call ONLY when the user has explicitly named a Noida sector or Greater Noida location. For other cities (Gurgaon, Delhi, Mumbai, Bangalore, etc.) do NOT call this — instead use search_web to get market context for that city, then bridge to Noida.',
```

- [ ] **Step 2: Add out-of-scope handling rule to system prompt**

In `frontend/lib/ai/prompts.ts`, find the `## Conversation Rules` section and add rule 13 after rule 12:

```ts
// Find this block:
`13. For builder queries ("tell me about XYZ builder") → use search_web to find current info
14. For non-real-estate questions → answer directly from knowledge. You are a helpful general assistant too.\``

// Replace with:
`13. **Out-of-scope city requests (Gurgaon, Delhi, Mumbai, Bangalore, Hyderabad, etc.):**
   - DO NOT call search_properties — database is Noida/Greater Noida only
   - FIRST: use search_web to get current real estate market context for the requested city (price ranges, key micro-markets, market sentiment, average psf rates)
   - THEN: present that market info helpfully (2-3 key facts about their requested area)
   - FINALLY: bridge naturally — "My live inventory is focused on Noida right now. Interestingly, Noida's [comparable sector] offers similar [X factor] at [comparison]. Want me to show you what's available there?"
   - Make the bridge feel like advice, not a redirect. Be genuinely helpful about their actual city of interest.
14. For builder queries ("tell me about XYZ builder") → use search_web to find current info
15. For non-real-estate questions → answer directly from knowledge. You are a helpful general assistant too.\``
```

- [ ] **Step 3: Verify the fix**

Test in the chat UI:
1. Type "Show me 3BHK in DLF Phase 1 Gurgaon"
2. Expected: AI uses search_web → presents Gurgaon market snapshot (price range, micro-markets) → bridges to Noida naturally
3. Should NOT show "I'm having trouble right now" error
4. Should NOT show infinite loading

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/ai/prompts.ts frontend/app/api/v1/chat/route.ts
git commit -m "feat: graceful out-of-scope city handling with market context bridge"
```

---

## Task 3: Map Error Boundary (1D)

**Files:**
- Create: `frontend/components/MapErrorBoundary.tsx`
- Modify: `frontend/components/SectorMap.tsx`

**Root cause:** When Leaflet fails to initialize (timing, SSR hydration, missing container), the unhandled error propagates up and can crash the entire chat UI. React error boundaries catch render errors in their subtree and show a fallback.

- [ ] **Step 1: Create MapErrorBoundary component**

Create `frontend/components/MapErrorBoundary.tsx`:
```tsx
'use client'

import { Component, type ReactNode } from 'react'
import { MapTrifold } from '@phosphor-icons/react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[MapErrorBoundary] Map failed to render:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[280px] rounded-2xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center gap-2 text-gray-400">
          <MapTrifold size={28} weight="duotone" className="text-gray-300" />
          <p className="text-[12px] font-medium">Map unavailable</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-[11px] text-blue-500 hover:underline"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

- [ ] **Step 2: Wrap SectorMap inner with error boundary**

In `frontend/components/SectorMap.tsx`, update to wrap the dynamic import:
```tsx
'use client'

import dynamic from 'next/dynamic'
import type { ProjectCard } from '@/types/project'
import MapErrorBoundary from './MapErrorBoundary'

export const SECTOR_CENTROIDS: Record<string, [number, number]> = {
  // ... keep all existing centroids unchanged
}

export const NOIDA_CENTER: [number, number] = [28.535, 77.391]

interface Props {
  properties: ProjectCard[]
}

const MapInner = dynamic(() => import('./SectorMapInner'), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
    </div>
  ),
})

export default function SectorMap({ properties }: Props) {
  if (!properties.length) return null
  return (
    <MapErrorBoundary>
      <MapInner properties={properties} />
    </MapErrorBoundary>
  )
}
```

- [ ] **Step 3: Fix divIcon creation in SectorMapInner**

In `frontend/components/SectorMapInner.tsx`, move `bluePin` creation inside `useMemo` to prevent Leaflet initialization order issues:
```tsx
// Add useMemo to existing imports: import { useEffect, useMemo } from 'react'

// Replace the bare const bluePin = L.divIcon({...}) at component top level with:
const bluePin = useMemo(() => L.divIcon({
  className: '',
  html: `<div style="width:22px;height:22px;background:#374151;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
  popupAnchor: [0, -24],
}), [])
```
Note: changed pin color from `#2563EB` (blue) to `#374151` (gray-700) for greyscale consistency.

- [ ] **Step 4: Verify**

1. Open the chat, search for properties in Noida Sector 150
2. Click "View on map" — map should render
3. In browser console, manually throw an error in the MapInner render (or test with a bad property slug)
4. Expected: shows "Map unavailable" fallback with "Try again" button, not a white-screen crash

- [ ] **Step 5: Commit**

```bash
git add frontend/components/MapErrorBoundary.tsx frontend/components/SectorMap.tsx frontend/components/SectorMapInner.tsx
git commit -m "fix: map error boundary prevents chat crash + greyscale map pin"
```

---

## Task 4: Detail Panel — Animation + Skeleton (1E)

**Files:**
- Modify: `frontend/components/ProjectDetailPanel.tsx`

- [ ] **Step 1: Fix spring animation → smooth tween**

In `ProjectDetailPanel.tsx`, find the `PanelWrapper` for the non-inline case:
```tsx
transition={{ type: 'spring', damping: 28, stiffness: 260 }}
```
Replace with:
```tsx
transition={{ type: 'tween', ease: 'easeOut', duration: 0.28 }}
```

- [ ] **Step 2: Replace loading spinner with skeleton**

Find the loading state in the panel body:
```tsx
{loading && (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>
)}
```
Replace with:
```tsx
{loading && (
  <div className="p-5 space-y-4 animate-pulse">
    {/* Hero skeleton */}
    <div className="h-4 bg-gray-100 rounded-xl w-3/4" />
    <div className="h-3 bg-gray-100 rounded-xl w-1/2" />
    {/* Stats skeleton */}
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-100 rounded-2xl h-20" />
      ))}
    </div>
    {/* Connectivity skeleton */}
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 py-1.5">
          <div className="w-7 h-7 bg-gray-100 rounded-lg flex-shrink-0" />
          <div className="h-3 bg-gray-100 rounded flex-1" />
          <div className="h-3 bg-gray-100 rounded w-12" />
        </div>
      ))}
    </div>
    {/* Description skeleton */}
    <div className="space-y-2">
      <div className="h-3 bg-gray-100 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-4/5" />
      <div className="h-3 bg-gray-100 rounded w-3/5" />
    </div>
  </div>
)}
```

- [ ] **Step 3: Verify**

1. Click any property card to open detail panel
2. Expected: panel slides in smoothly without bounce/spring
3. While loading: see animated skeleton placeholders that match the panel layout
4. After load: content replaces skeleton without layout jump

- [ ] **Step 4: Commit**

```bash
git add frontend/components/ProjectDetailPanel.tsx
git commit -m "fix: detail panel easeOut animation + skeleton loader replaces spinner"
```

---

## Task 5: Icon System — Phosphor Greyscale + Unique Icons

**Files:**
- Modify: `frontend/components/ProjectCard.tsx`
- Modify: `frontend/components/ProjectDetailPanel.tsx`

**Rule:** One icon per semantic meaning. All icon colors → `text-gray-400` or `text-gray-500`. No two categories share the same icon.

- [ ] **Step 1: Fix ProjectCard AMENITY_ICONS — unique icon per category**

In `ProjectCard.tsx`, update the `@phosphor-icons/react` import line (keep existing icons, add new ones):
```tsx
import {
  ClockCountdown, CheckCircle, SealCheck,
  Subway, AirplaneTakeoff, Path,
  SoccerBall, Leaf, Baby, Heart, Tree,
  MapPin, ArrowRight, Sparkle, BookmarkSimple,
  CaretLeft, CaretRight, Phone,
  Car, GraduationCap, ShoppingBag, Bank, BookOpen,
  Dumbbell, Star,
} from '@phosphor-icons/react'
```

Update `AMENITY_ICONS`:
```tsx
const AMENITY_ICONS: Record<AmenitySummary['category'], React.ElementType> = {
  sports:    Dumbbell,    // was SoccerBall — gym/fitness is more universal than soccer
  lifestyle: Star,        // was Buildings — star = premium lifestyle
  wellness:  Leaf,        // keep
  kids:      Baby,        // keep
  security:  SealCheck,   // keep
  parking:   Car,         // was Buildings — car unambiguously = parking
}
```

Update `CONN_ICONS`:
```tsx
const CONN_ICONS: Record<ConnSummary['type'], React.ElementType> = {
  metro:      Subway,          // keep
  airport:    AirplaneTakeoff, // keep
  road:       Path,            // keep
  school:     GraduationCap,   // was Buildings
  hospital:   Heart,           // keep
  mall:       ShoppingBag,     // was Buildings
  landmark:   Bank,            // was Tree (landmark = monument/building)
  university: BookOpen,        // was Buildings
}
```

- [ ] **Step 2: Ensure all icon uses in ProjectCard are greyscale**

The amenity icons are already in `text-gray-500` via parent. No changes needed there.

The connectivity icons `<Icon size={12} weight="duotone" />` inherit `text-gray-400` from parent. Verify this by checking the parent span class: `"text-gray-400 dark:text-gray-500"` — already greyscale. ✓

- [ ] **Step 3: Fix ProjectDetailPanel AMENITY_COLORS — greyscale icons, keep background tints**

In `ProjectDetailPanel.tsx`, update `AMENITY_COLORS`:
```tsx
const AMENITY_COLORS: Record<string, string> = {
  sports:    'bg-gray-50 text-gray-500 border-gray-200',
  lifestyle: 'bg-gray-50 text-gray-500 border-gray-200',
  wellness:  'bg-gray-50 text-gray-500 border-gray-200',
  kids:      'bg-gray-50 text-gray-500 border-gray-200',
  security:  'bg-gray-50 text-gray-500 border-gray-200',
  parking:   'bg-gray-50 text-gray-500 border-gray-200',
}
```

Update `AMENITY_ICONS` in ProjectDetailPanel.tsx to match ProjectCard.tsx:
```tsx
const AMENITY_ICONS: Record<string, React.ElementType> = {
  sports:    Dumbbell,
  lifestyle: Star,
  wellness:  Leaf,
  kids:      Baby,
  security:  SealCheck,
  parking:   Car,
}
```

Add to imports in `ProjectDetailPanel.tsx` (merge into existing `@phosphor-icons/react` import):
```tsx
import { Car, GraduationCap, ShoppingBag, Bank, BookOpen, Dumbbell, Star } from '@phosphor-icons/react'
```

Also update `CONN_ICONS` in ProjectDetailPanel.tsx to match:
```tsx
const CONN_ICONS: Record<string, React.ElementType> = {
  metro:      Subway,
  airport:    AirplaneTakeoff,
  road:       Path,
  school:     GraduationCap,
  hospital:   Heart,
  mall:       ShoppingBag,
  landmark:   Bank,
  university: BookOpen,
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/ProjectCard.tsx frontend/components/ProjectDetailPanel.tsx
git commit -m "feat: unique Phosphor icons per semantic category + greyscale treatment"
```

---

## Task 6: Builder Trust Signals on ProjectCard

**Files:**
- Modify: `frontend/components/ProjectCard.tsx`

**Note:** `ProjectCard.builder` type only has `{ name, slug }` — no delivery data. Use RERA presence as the trust signal (RERA-registered = legally verified project). Also surface the RERA badge in the card body (not just as an overlay) for prominence.

- [ ] **Step 1: Add RERA trust signal in card body**

In `ProjectCard.tsx`, find the price section bottom with the BHK/status badges:
```tsx
<div className="flex items-center gap-2 flex-wrap mt-1.5">
  <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">{uniqueBhk.join(' · ')}</span>
  {isRTM ? (
    ...
  ) : project.possession_label ? (
    ...
  ) : null}
</div>
```
Add RERA badge as a third item in that flex row, after the possession badge:
```tsx
<div className="flex items-center gap-2 flex-wrap mt-1.5">
  <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">{uniqueBhk.join(' · ')}</span>
  {isRTM ? (
    <span className="flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 px-2 py-0.5 rounded-full">
      <CheckCircle size={9} weight="fill" />
      Ready Now
    </span>
  ) : project.possession_label ? (
    <span className="flex items-center gap-1 text-[10.5px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 px-2 py-0.5 rounded-full">
      <ClockCountdown size={9} weight="fill" />
      {project.possession_label}
    </span>
  ) : null}
  {project.rera_number && (
    <span className="flex items-center gap-1 text-[10.5px] font-semibold text-gray-500 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-full">
      <SealCheck size={9} weight="fill" />
      RERA Verified
    </span>
  )}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/ProjectCard.tsx
git commit -m "feat: RERA verified trust badge in property card body"
```

---

## Task 7: Comparison Table — Diff Highlighting + More Rows

**Files:**
- Modify: `frontend/components/ComparisonTable.tsx`

Add cell background highlight (green for winner, subtle red-tint for loser), and add price-per-sqft row for richer comparison.

- [ ] **Step 1: Add price-per-sqft row to buildRows**

In `ComparisonTable.tsx`, add to `buildRows` after the existing RERA row:

```tsx
// Price per sqft comparison
const lSqft = left.unit_types.find(u => u.price_min_cr && u.super_area_sqft)
const rSqft = right.unit_types.find(u => u.price_min_cr && u.super_area_sqft)
if (lSqft && rSqft && lSqft.super_area_sqft && rSqft.super_area_sqft) {
  const lPsf = Math.round((lSqft.price_min_cr! * 1e7) / lSqft.super_area_sqft)
  const rPsf = Math.round((rSqft.price_min_cr! * 1e7) / rSqft.super_area_sqft)
  rows.push({
    label: '₹/sqft',
    leftVal: `₹${(lPsf / 1000).toFixed(1)}K`,
    rightVal: `₹${(rPsf / 1000).toFixed(1)}K`,
    leftWins: lPsf < rPsf,
    rightWins: rPsf < lPsf,
  })
}
```

- [ ] **Step 2: Update row rendering to highlight winner/loser**

Find the row rendering in `ComparisonTable.tsx`:
```tsx
<div key={row.label} className="bg-white rounded-xl p-3 flex items-center gap-2">
  <span className="text-[10px] font-semibold text-gray-400 w-20 flex-shrink-0">{row.label}</span>
  <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
    <span className={`text-[11px] font-bold flex-1 text-left truncate ${row.leftWins ? 'text-emerald-600' : 'text-gray-700'}`}>
      {row.leftWins && <span className="mr-1">✓</span>}
      {row.leftVal}
    </span>
    <span className="text-gray-200 text-xs flex-shrink-0">|</span>
    <span className={`text-[11px] font-bold flex-1 text-right truncate ${row.rightWins ? 'text-emerald-600' : 'text-gray-700'}`}>
      {row.rightVal}
      {row.rightWins && <span className="ml-1">✓</span>}
    </span>
  </div>
</div>
```
Replace with:
```tsx
<div key={row.label} className="rounded-xl overflow-hidden flex items-stretch">
  <div className={`flex-1 px-3 py-2.5 flex items-center gap-2 ${
    row.leftWins ? 'bg-emerald-50 dark:bg-emerald-900/20' : row.rightWins ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'
  }`}>
    {row.leftWins && <span className="text-emerald-500 text-[10px] flex-shrink-0">✓</span>}
    <span className={`text-[11px] font-bold truncate ${row.leftWins ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
      {row.leftVal}
    </span>
  </div>
  <div className="flex items-center justify-center px-2 bg-gray-50 dark:bg-gray-900 border-x border-gray-100 dark:border-gray-700">
    <span className="text-[9px] font-bold text-gray-300 dark:text-gray-600 uppercase">{row.label}</span>
  </div>
  <div className={`flex-1 px-3 py-2.5 flex items-center justify-end gap-2 ${
    row.rightWins ? 'bg-emerald-50 dark:bg-emerald-900/20' : row.leftWins ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'
  }`}>
    <span className={`text-[11px] font-bold truncate ${row.rightWins ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
      {row.rightVal}
    </span>
    {row.rightWins && <span className="text-emerald-500 text-[10px] flex-shrink-0">✓</span>}
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/ComparisonTable.tsx
git commit -m "feat: comparison table diff highlighting + price-per-sqft row"
```

---

## Task 8: Staggered Property Card Animation

**Files:**
- Modify: `frontend/components/chat/MessageBubble.tsx`

Wrap each property card in a motion div with staggered delay so cards cascade in instead of appearing all at once.

- [ ] **Step 1: Wrap cards in staggered motion**

In `MessageBubble.tsx`, find the property card grid render. There are two locations — the `isLastProperties` true branch and the expanded branch. Update the inner mapping in BOTH places:

```tsx
// OLD (in both locations):
{message.properties.map((property, pi) => (
  <div key={property.id} className="min-w-[85vw] sm:min-w-0 snap-center flex-shrink-0 sm:flex-shrink">
    <ProjectCard project={property} userId={userId} index={pi} onDetailOpen={onDetailOpen} onCallback={onCallback} onToast={onToast} />
  </div>
))}

// NEW:
{message.properties.map((property, pi) => (
  <motion.div
    key={property.id}
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: pi * 0.07, ease: 'easeOut' }}
    className="min-w-[85vw] sm:min-w-0 snap-center flex-shrink-0 sm:flex-shrink"
  >
    <ProjectCard project={property} userId={userId} index={pi} onDetailOpen={onDetailOpen} onCallback={onCallback} onToast={onToast} />
  </motion.div>
))}
```

`motion` is already imported from `framer-motion` in this file.

- [ ] **Step 2: Commit**

```bash
git add frontend/components/chat/MessageBubble.tsx
git commit -m "feat: staggered property card fade-in animation"
```

---

## Task 9: Smart Contextual Follow-Up Chips

**Files:**
- Modify: `frontend/components/DiscoveryContent.tsx`

Add status-aware chips: under-construction projects get builder risk chip, ready-to-move gets "Why is it still available?" chip.

- [ ] **Step 1: Update getFollowUpChips to be context-aware**

In `DiscoveryContent.tsx`, update the `getFollowUpChips` function signature and body:

```tsx
function getFollowUpChips(
  phase: 'DISCOVERY' | 'ADVISOR',
  shortlist: ProjectCardType[],
  turnCount: number,
): Chip[] {
  if (phase === 'ADVISOR' && shortlist.length > 0) {
    const hasUnderConstruction = shortlist.some(p => p.status === 'under_construction' || p.status === 'new_launch')
    const hasRTM = shortlist.some(p => p.status === 'ready_to_move')
    const topProject = shortlist[0]

    return [
      { emoji: '📅', label: 'Book Site Visit',   picker: 'single', pickerAction: 'site_visit', pickerModal: true },
      { emoji: '📞', label: 'Get Callback',       picker: 'single', pickerAction: 'callback',   pickerModal: true },
      { emoji: '📊', label: 'Calculate EMI',      picker: 'single', pickerAction: 'emi' },
      ...(shortlist.length >= 2 ? [{ emoji: '⚖️', label: 'Compare', picker: 'multi' as const, pickerAction: 'compare' }] : []),
      ...(hasUnderConstruction ? [{ emoji: '🏗️', label: 'Builder delivery risk?', picker: 'single' as const, pickerAction: 'risks' }] : []),
      ...(hasRTM ? [{ emoji: '🔑', label: 'Why still available?', msg: `Why is ${topProject.name} still available as ready-to-move? Is there a catch?` }] : []),
      { emoji: '🏗️', label: 'Builder track record', picker: 'single', pickerAction: 'builder' },
      { emoji: '📍', label: 'Area overview',      picker: 'single', pickerAction: 'area' },
    ]
  }
  if (phase === 'DISCOVERY' && turnCount >= 2) {
    return [
      { emoji: '🏠', label: 'Show properties',  msg: 'Show me available 3BHK properties in Noida Sector 150' },
      { emoji: '📊', label: 'EMI calculator',    msg: 'How do I calculate EMI for a 1.5 Cr flat?' },
      { emoji: '🏆', label: 'Best sectors',       msg: 'Which sectors in Noida have the best appreciation right now?' },
      { emoji: '📋', label: 'RERA explained',     msg: 'What is RERA and how does it protect home buyers?' },
    ]
  }
  return []
}
```

Note: The `risks` pickerAction already has a handler in `buildPickerMessage` in `MessageBubble.tsx`. Verify it's handled there:
```tsx
case 'risks':
  return `What are the main risks and concerns I should know about ${names[0]}?`
```
This is already in `MessageBubble.tsx` line ~75. ✓

- [ ] **Step 2: Commit**

```bash
git add frontend/components/DiscoveryContent.tsx
git commit -m "feat: smart contextual chips based on property status"
```

---

## Task 10: Enhanced Commute Calculator

**Files:**
- Modify: `frontend/components/CommuteCalculator.tsx`

Add localStorage persistence for office address, auto-populate on mount, and a polished premium UI with result cards that feel more premium.

- [ ] **Step 1: Add localStorage persistence**

Replace the entire `CommuteCalculator.tsx` with:
```tsx
'use client'

import { useState, useEffect } from 'react'
import { Navigation, MapPin, Loader2, Clock } from 'lucide-react'
import { Car, Train, Path, ArrowRight, Subway } from '@phosphor-icons/react'
import { API_BASE } from '@/lib/env'
import PlacesAutocomplete from '@/components/PlacesAutocomplete'

const OFFICE_STORAGE_KEY = 'rp_office_address'

interface CommuteResult {
  drive:   { drive_text: string; drive_min: number; distance_text: string } | null
  transit: { transit_text: string; transit_min: number } | null
  nearby_metro: Array<{ name: string; vicinity?: string }>
}

interface Props {
  projectAddress: string
}

export default function CommuteCalculator({ projectAddress }: Props) {
  const [destination, setDestination] = useState('')
  const [result, setResult] = useState<CommuteResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedOffice, setSavedOffice] = useState<string | null>(null)

  // Load saved office on mount
  useEffect(() => {
    const saved = localStorage.getItem(OFFICE_STORAGE_KEY)
    if (saved) setSavedOffice(saved)
  }, [])

  async function calculate(dest?: string) {
    const target = (dest ?? destination).trim()
    if (!target) return
    setLoading(true)
    setError(null)
    setResult(null)

    // Persist the office address
    localStorage.setItem(OFFICE_STORAGE_KEY, target)
    setSavedOffice(target)

    try {
      const params = new URLSearchParams({ origin: projectAddress, destination: target })
      const res = await fetch(`${API_BASE}/commute?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not calculate commute')
      setResult(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Input card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <Path size={14} weight="duotone" className="text-gray-500" />
          </div>
          <p className="text-[12px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Commute Calculator</p>
        </div>

        {/* Origin (property) */}
        <div className="flex items-center gap-2.5 mb-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <MapPin size={13} weight="fill" className="text-gray-400 flex-shrink-0" />
          <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{projectAddress}</span>
        </div>

        {/* Connector */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 ml-[22px]" />
        </div>

        {/* Saved office quick-select */}
        {savedOffice && savedOffice !== destination && (
          <button
            onClick={() => { setDestination(savedOffice); calculate(savedOffice) }}
            className="w-full mb-2 flex items-center gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-left hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <Clock size={12} className="text-blue-400 flex-shrink-0" />
            <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300 truncate">{savedOffice}</span>
            <span className="ml-auto text-[10px] text-blue-400">Saved office</span>
            <ArrowRight size={12} className="text-blue-400 flex-shrink-0" />
          </button>
        )}

        {/* Destination input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin size={13} weight="fill" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <PlacesAutocomplete
              value={destination}
              onChange={setDestination}
              placeholder="Your office / destination..."
              className="w-full text-[12px] border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl pl-8 pr-3 py-2.5 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 text-gray-900 dark:text-white placeholder-gray-400 transition-all"
              onEnter={() => calculate()}
            />
          </div>
          <button
            onClick={() => calculate()}
            disabled={!destination.trim() || loading}
            className="px-4 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[12px] font-bold rounded-xl disabled:opacity-40 flex items-center gap-1.5 hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
            {!loading && 'Calculate'}
          </button>
        </div>

        {error && (
          <p className="text-[11px] text-red-500 mt-2 flex items-center gap-1">
            <span>⚠</span> {error}
          </p>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-2.5">
          {result.drive && (
            <div className="flex items-center gap-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
                <Car size={18} weight="duotone" className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-gray-900 dark:text-white">By Car</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{result.drive.distance_text}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[22px] font-black text-gray-900 dark:text-white leading-none">{result.drive.drive_min}</p>
                <p className="text-[10px] text-gray-400 font-medium">mins</p>
              </div>
            </div>
          )}

          {result.transit && (
            <div className="flex items-center gap-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
                <Train size={18} weight="duotone" className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-gray-900 dark:text-white">By Metro / Transit</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{result.transit.transit_text}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[22px] font-black text-gray-900 dark:text-white leading-none">{result.transit.transit_min}</p>
                <p className="text-[10px] text-gray-400 font-medium">mins</p>
              </div>
            </div>
          )}

          {result.nearby_metro.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Nearby Metro Stations</p>
              <div className="space-y-2">
                {result.nearby_metro.slice(0, 3).map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Subway size={12} weight="duotone" className="text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-gray-700 dark:text-gray-300 truncate">{m.name}</p>
                      {m.vicinity && <p className="text-[10px] text-gray-400 truncate">{m.vicinity}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-gray-400 text-center">
            Estimates via Google Maps. Actual commute may vary with traffic.
          </p>
        </div>
      )}
    </div>
  )
}
```

Note: `Train` and `Route` are from `@phosphor-icons/react`. `Navigation`, `MapPin`, `Loader2`, `Clock` remain from `lucide-react`. Verify `Car`, `Train`, `Route`, `ArrowRight`, `Subway` are exported from `@phosphor-icons/react` (they are — these are core Phosphor icons).

- [ ] **Step 2: Verify**

1. Open a property detail panel → go to Commute tab
2. Type an office address → select from autocomplete → click Calculate
3. Expected: results shown cleanly
4. Close panel, open same panel again → office address auto-suggests as "Saved office" pill
5. Click "Saved office" pill → auto-calculates commute instantly

- [ ] **Step 3: Commit**

```bash
git add frontend/components/CommuteCalculator.tsx
git commit -m "feat: commute calculator with saved office persistence + premium UI"
```

---

## Task 11: Final Polish Pass — Verify All Flows

**No code changes — verification only**

- [ ] **Step 1: Session flow**
  - Fresh user: welcome screen shows, suggestion chips work, submitting starts chat
  - Return user: existing session restores, can continue chatting
  - Sidebar → click different session → clean switch, correct messages load
  - Sidebar → click "New Chat" → welcome screen, empty chat

- [ ] **Step 2: Chat flow**
  - Search Noida Sector 150 → property cards appear with stagger animation
  - Click "View on map" → map renders, no crash, greyscale pins
  - Click property card → panel slides in smooth (no spring bounce), skeleton shows during load
  - Open Commute tab → enter office address → results appear cleanly
  - Compare two properties → comparison table shows with green highlights on winner cells

- [ ] **Step 3: Out-of-scope flow**
  - Type "Show 3BHK in Gurgaon Sector 56" → AI presents Gurgaon market context + bridges to Noida
  - No "I'm having trouble right now" error
  - No infinite loading state

- [ ] **Step 4: Follow-up chips**
  - After getting under-construction results → "Builder delivery risk?" chip appears
  - After getting RTM results → "Why still available?" chip appears
  - Chips work and submit correct messages

- [ ] **Step 5: Mobile flow (resize to 375px)**
  - Welcome screen centered properly
  - Chat messages readable
  - Property cards swipeable in horizontal scroll
  - Input bar fixed at bottom, doesn't jump

- [ ] **Step 6: Commit (tag as demo-ready)**

```bash
git add -A
git commit -m "chore: demo-ready verification pass complete"
git tag demo-ready-v1
```
