# RealtyPals Demo-Ready: Complete Bug Fix + Polish + Demo Features

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every identified bug, eliminate all crashes, add skeleton loaders + smooth UX, and ship 4 high-impact demo features that make partners say "this is production-ready."

**Architecture:** Bug fixes are surgical 1-3 line changes. UX polish uses existing Framer Motion + Tailwind patterns already in the codebase. Demo features add new files/components following exact existing patterns (ProjectDetailPanel, DiscoveryContent, etc). No new dependencies.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Tailwind CSS, Framer Motion, Prisma, Supabase, shadcn/ui, Phosphor Icons + Lucide Icons

---

## File Map

**Modified:**
- `frontend/app/api/v1/site-visit/route.ts` — add try-catch around Prisma create
- `frontend/app/api/v1/projects/route.ts` — remove hardcoded Sector 150 fallback
- `frontend/lib/cache.ts` — add max-size LRU eviction
- `frontend/lib/redis.ts` — add local fallback rate limiter when Redis down
- `frontend/app/discover/page.tsx` — add .catch on getSession, fix silent auth error
- `frontend/app/saved/page.tsx` — add error toast + skeleton loader
- `frontend/components/ProjectCard.tsx` — add save feedback toast, fix silent save error
- `frontend/components/ComparisonTable.tsx` — full visual side-by-side redesign
- `frontend/components/Sidebar.tsx` — add leads captured badge for demo

**Created:**
- `frontend/app/property/[slug]/page.tsx` — full property detail page
- `frontend/components/PropertyDetailPage.tsx` — content component for property detail
- `frontend/components/LeadSuccessModal.tsx` — animated lead capture confirmation
- `frontend/components/SkeletonCard.tsx` — reusable skeleton loader for property cards

---

## Phase 1: Critical Bug Fixes

### Task 1: Add try-catch to site-visit POST route

**Files:**
- Modify: `frontend/app/api/v1/site-visit/route.ts:31-44`

The Prisma create on line 32 has no try-catch. If the DB is unavailable or FK constraint fails, this throws a raw 500 with no structured error. Partners booking a site visit will see a broken modal.

- [ ] **Step 1: Read the file**

Read `frontend/app/api/v1/site-visit/route.ts` in full.

- [ ] **Step 2: Wrap Prisma create in try-catch**

Replace lines 31-57 of `frontend/app/api/v1/site-visit/route.ts`:

```typescript
  let visit: { id: string }
  try {
    visit = await prisma.siteVisitRequest.create({
      data: {
        project_id:   d.project_id,
        project_slug: d.project_slug,
        project_name: d.project_name,
        name:         d.name,
        phone:        d.phone,
        email:        d.email,
        visit_date:   new Date(d.visit_date),
        time_slot:    d.time_slot,
        message:      d.message,
      },
    })
  } catch (err) {
    console.error('[site-visit] ❌ DB create failed:', err)
    return Response.json({ error: 'Failed to save site visit request. Please try again.' }, { status: 500 })
  }

  notifyLead({
    type: 'site_visit',
    name: d.name,
    phone: d.phone,
    project_name: d.project_name,
    project_slug: d.project_slug,
    visit_date: d.visit_date,
    time_slot: d.time_slot,
    message: d.message ?? undefined,
    timestamp: new Date().toISOString(),
  }).catch(() => {})
  return Response.json({ success: true, id: visit.id }, { status: 201 })
```

- [ ] **Step 3: Also wrap the GET handler's Prisma call**

In the GET handler (lines 60-70), wrap `prisma.siteVisitRequest.findMany` in try-catch:

```typescript
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  if (!slug) return Response.json({ error: 'slug required' }, { status: 400 })

  try {
    const visits = await prisma.siteVisitRequest.findMany({
      where: { project_slug: slug },
      orderBy: { visit_date: 'asc' },
      select: { visit_date: true, time_slot: true, status: true },
    })
    return Response.json({ visits })
  } catch (err) {
    console.error('[site-visit GET] ❌', err)
    return Response.json({ error: 'Failed to fetch visits' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/api/v1/site-visit/route.ts
git commit -m "fix: add try-catch to site-visit POST and GET handlers"
```

---

### Task 2: Fix discover page silent auth error

**Files:**
- Modify: `frontend/app/discover/page.tsx:27-37`

`supabase.auth.getSession()` has no `.catch()`. If Supabase is briefly unavailable, the promise rejects and the user sees a stuck spinner forever. Also, `setChecking(false)` is never called in the error case.

- [ ] **Step 1: Read the file**

Read `frontend/app/discover/page.tsx`.

- [ ] **Step 2: Add .catch to getSession call**

Replace lines 27-37 with:

```typescript
    supabase.auth.getSession()
      .then(({ data }) => {
        if (!data.session?.user) {
          localStorage.removeItem('user_id');
          router.replace('/auth');
          return;
        }
        const uid = data.session.user.id;
        localStorage.setItem('user_id', uid);
        setUserId(uid);
        setChecking(false);
      })
      .catch((err) => {
        console.error('[discover] getSession failed:', err);
        // If we have a cached userId, trust it and continue
        const cachedId = localStorage.getItem('user_id');
        if (!cachedId) router.replace('/auth');
        setChecking(false);
      });
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/discover/page.tsx
git commit -m "fix: handle getSession error in discover page, prevent stuck spinner"
```

---

### Task 3: Fix saved page silent error + add error state

**Files:**
- Modify: `frontend/app/saved/page.tsx:25-29`

The fetch silently fails with `.catch(() => {})`. Partners who have a network hiccup will see empty saved properties with no indication of error.

- [ ] **Step 1: Read the file**

Read `frontend/app/saved/page.tsx`.

- [ ] **Step 2: Add error state and replace silent catch**

Add `const [error, setError] = useState(false);` to state declarations, then replace the fetch block:

```typescript
  const [error, setError] = useState(false);

  useEffect(() => {
    const uid = localStorage.getItem('user_id');
    if (!uid) { router.replace('/auth'); return; }
    setUserId(uid);
    fetch(`${API_BASE}/saved`, { headers: { 'X-User-Id': uid } })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setProjects(d.projects ?? []))
      .catch((err) => {
        console.error('[saved] fetch failed:', err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);
```

- [ ] **Step 3: Add error UI before the loading check**

After the `{loading ? (` block, add an error branch:

```typescript
          {error ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
                <span className="text-3xl">⚠️</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Couldn't load saved properties</h2>
              <p className="text-gray-500 max-w-sm">Check your connection and try again.</p>
              <button
                onClick={() => { setError(false); setLoading(true); window.location.reload(); }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold text-sm transition-all"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/saved/page.tsx
git commit -m "fix: show error state when saved properties fail to load"
```

---

### Task 4: Add LRU eviction to TTLCache

**Files:**
- Modify: `frontend/lib/cache.ts`

The cache grows unbounded. On a loaded server with many slug lookups, this leaks memory indefinitely. Cap at 500 entries with LRU eviction.

- [ ] **Step 1: Read the file**

Read `frontend/lib/cache.ts`.

- [ ] **Step 2: Rewrite TTLCache with max-size LRU**

Replace the entire file content:

```typescript
interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class TTLCache<T> {
  private store = new Map<string, CacheEntry<T>>()
  private readonly ttlMs: number
  private readonly maxSize: number

  constructor(ttlMs: number, maxSize = 500) {
    this.ttlMs = ttlMs
    this.maxSize = maxSize
  }

  get(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    // LRU: re-insert to move to end
    this.store.delete(key)
    this.store.set(key, entry)
    return entry.value
  }

  set(key: string, value: T): void {
    // Evict oldest entry if at capacity
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      const oldest = this.store.keys().next().value
      if (oldest) this.store.delete(oldest)
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs })
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  size(): number {
    return this.store.size
  }
}

const globalForCaches = global as unknown as {
  projectDetailCache: TTLCache<unknown>
}

export const projectDetailCache: TTLCache<unknown> =
  globalForCaches.projectDetailCache ??
  new TTLCache(5 * 60 * 1000, 200)

if (process.env.NODE_ENV !== 'production') {
  globalForCaches.projectDetailCache = projectDetailCache
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/cache.ts
git commit -m "fix: add LRU eviction to TTLCache, cap at 200 entries"
```

---

### Task 5: Fix Redis fail-open rate limiter

**Files:**
- Modify: `frontend/lib/redis.ts:19-33`

When Redis is unavailable, `checkRateLimit` returns `{ allowed: true }` — disabling all rate limiting. Replace with an in-process fallback Map that enforces limits even without Redis.

- [ ] **Step 1: Read the file**

Read `frontend/lib/redis.ts`.

- [ ] **Step 2: Add in-process fallback rate limiter**

Replace the `checkRateLimit` function:

```typescript
// In-process fallback when Redis is unavailable — expires entries after window
const localRl = new Map<string, { count: number; resetAt: number }>()

export async function checkRateLimit(
  userId: string,
  windowSec = 60,
  maxReqs = 15,
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const redis = getClient()
    const key = `rl:chat:${userId}`
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, windowSec)
    return { allowed: count <= maxReqs, remaining: Math.max(0, maxReqs - count) }
  } catch {
    // Redis unavailable — use in-process fallback (fail-closed, not fail-open)
    const now = Date.now()
    const windowMs = windowSec * 1000
    const entry = localRl.get(userId)
    if (!entry || now > entry.resetAt) {
      localRl.set(userId, { count: 1, resetAt: now + windowMs })
      return { allowed: true, remaining: maxReqs - 1 }
    }
    entry.count++
    return { allowed: entry.count <= maxReqs, remaining: Math.max(0, maxReqs - entry.count) }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/redis.ts
git commit -m "fix: in-process rate limit fallback when Redis is unavailable"
```

---

### Task 6: Remove hardcoded Sector 150 fallback from projects API

**Files:**
- Modify: `frontend/app/api/v1/projects/route.ts:21-28`

`sector: sector ?? 'Sector 150'` silently returns Sector 150 data for all queries that don't specify a sector. Remove the hardcoded default — return all Noida projects when no sector is specified.

- [ ] **Step 1: Read the file**

Read `frontend/app/api/v1/projects/route.ts`.

- [ ] **Step 2: Remove hardcoded fallback**

Replace the `searchProjects` call:

```typescript
  try {
    const projects = await searchProjects({
      city: 'Noida',
      sector: sector,
      bhk,
      budget_min_cr: min_price != null ? min_price / 10_000_000 : undefined,
      budget_max_cr: max_price != null ? max_price / 10_000_000 : undefined,
    })
    return NextResponse.json({ projects })
  } catch (err) {
    console.error('[GET /api/v1/projects]', err)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/v1/projects/route.ts
git commit -m "fix: remove hardcoded Sector 150 fallback from projects API"
```

---

## Phase 2: UX Smoothness

### Task 7: Skeleton loader for property cards

**Files:**
- Create: `frontend/components/SkeletonCard.tsx`
- Modify: `frontend/app/saved/page.tsx`

Replace the spinner on Saved Properties with skeleton cards that match the real card layout.

- [ ] **Step 1: Create SkeletonCard component**

Create `frontend/components/SkeletonCard.tsx`:

```tsx
'use client'

export default function SkeletonCard() {
  return (
    <div className="w-full rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm animate-pulse">
      <div className="h-[220px] bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-gray-200 rounded-lg w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-8 bg-gray-200 rounded-lg w-1/3 mt-2" />
        <div className="flex gap-1.5 mt-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-5 bg-gray-100 rounded-full w-16" />
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <div className="flex-1 h-10 bg-gray-200 rounded-xl" />
          <div className="w-10 h-10 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Use SkeletonCard in saved page loading state**

In `frontend/app/saved/page.tsx`, import `SkeletonCard` and replace the spinner:

```tsx
import SkeletonCard from '@/components/SkeletonCard';

// Replace the loading spinner:
          {loading ? (
            <div className="max-w-5xl mx-auto">
              <div className="h-4 bg-gray-200 rounded w-32 mb-4 animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3].map(i => <SkeletonCard key={i} />)}
              </div>
            </div>
          ) : error ? (
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/SkeletonCard.tsx frontend/app/saved/page.tsx
git commit -m "feat: skeleton card loader for saved properties page"
```

---

### Task 8: Fix ProjectCard save action — add toast feedback

**Files:**
- Modify: `frontend/components/ProjectCard.tsx:123-147`

`handleSave` catches errors silently. If save fails, the button optimistically flips then silently reverts — confusing. Add proper error feedback. Also the `ProjectCard` needs an `onToast` prop added.

- [ ] **Step 1: Read ProjectCard.tsx**

Read `frontend/components/ProjectCard.tsx`.

- [ ] **Step 2: Add onToast prop and error feedback**

Update the Props interface:

```typescript
interface Props {
  project: ProjectCardType
  userId: string | null
  index?: number
  onDetailOpen?: (project: ProjectCardType) => void
  onCallback?: (project: ProjectCardType) => void
  onToast?: (message: string) => void
}
```

Update function signature: `export default function ProjectCard({ project, userId, index = 0, onDetailOpen, onCallback, onToast }: Props)`

Replace `handleSave`:

```typescript
  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!userId || saving) return
    setSaving(true)
    const wassaved = saved
    setSaved(!wasaved) // optimistic
    try {
      if (wasaved) {
        const res = await fetch(`${API_BASE}/saved/${project.id}`, {
          method: 'DELETE',
          headers: { 'X-User-Id': userId },
        })
        if (!res.ok) throw new Error('Delete failed')
        onToast?.('Removed from saved')
      } else {
        const res = await fetch(`${API_BASE}/saved`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
          body: JSON.stringify({ project_id: project.id }),
        })
        if (!res.ok) throw new Error('Save failed')
        onToast?.('Property saved!')
      }
    } catch (err) {
      console.error('[ProjectCard] save failed:', err)
      setSaved(wasaved) // revert on error
      onToast?.('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }
```

- [ ] **Step 3: Pass onToast from DiscoveryContent and saved page**

In `frontend/components/DiscoveryContent.tsx`, find all `<ProjectCard` usages and add `onToast={(msg) => setToast({ message: msg })}`.

In `frontend/app/saved/page.tsx`, add `onToast={(msg) => setToast(msg)}` to `<ProjectCard`.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/ProjectCard.tsx frontend/components/DiscoveryContent.tsx frontend/app/saved/page.tsx
git commit -m "fix: ProjectCard save action - add toast feedback and proper error revert"
```

---

### Task 9: Smooth page navigation — no flash on page transitions

**Files:**
- Modify: `frontend/app/compare/page.tsx`
- Modify: `frontend/app/saved/page.tsx`

Both pages do `localStorage.getItem` in useEffect which causes a flash of content before auth is resolved. Add the same optimistic-render pattern from `discover/page.tsx`.

- [ ] **Step 1: Fix compare page auth**

In `frontend/app/compare/page.tsx`, replace the useEffect:

```typescript
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id');
    if (!storedUserId) { router.replace('/auth'); return; }
    setUserId(storedUserId);
    setChecking(false);
  }, [router]);

  if (checking && !userId) return null; // prevent flash
```

- [ ] **Step 2: Ensure saved page has same pattern**

In `frontend/app/saved/page.tsx`, verify the `loading` state prevents flash. The current code already sets `userId` synchronously from localStorage, so no flash occurs. Just verify.

- [ ] **Step 3: Add page-level fade-in to compare and saved pages**

In both `compare/page.tsx` and `saved/page.tsx`, wrap the return JSX main content in:

```tsx
<motion.div
  initial={{ opacity: 0, y: 4 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2 }}
  className="flex-1 flex flex-col min-h-0 overflow-hidden"
>
  {/* existing main content */}
</motion.div>
```

Import: `import { motion } from 'framer-motion';`

- [ ] **Step 4: Commit**

```bash
git add frontend/app/compare/page.tsx frontend/app/saved/page.tsx
git commit -m "feat: smooth fade-in transitions on compare and saved pages"
```

---

## Phase 3: Demo Features

### Task 10: Property detail page

**Files:**
- Create: `frontend/app/property/[slug]/page.tsx`
- Create: `frontend/components/PropertyDetailPage.tsx`

Partners will click "View Details" on property cards and expect a full property page. Currently `ProjectDetailPanel` opens as a slide-over which is good for chat context, but the standalone page gives a more credible "this is production software" impression for the demo. The "View Details" button in `ProjectCard` currently calls `onDetailOpen` (opens slide-over) — we keep that behavior. The new page is navigated to when partners manually visit or are linked.

This page fetches from the existing `/api/v1/projects/[slug]` endpoint.

- [ ] **Step 1: Read ProjectDetailPanel.tsx fully**

Read `frontend/components/ProjectDetailPanel.tsx` (full file) to understand the existing detail layout.

- [ ] **Step 2: Create the property detail page**

Create `frontend/app/property/[slug]/page.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { API_BASE } from '@/lib/env'
import type { ProjectCard as ProjectCardType } from '@/types/project'
import ProjectDetailPanel from '@/components/ProjectDetailPanel'
import SkeletonCard from '@/components/SkeletonCard'

export default function PropertyDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [project, setProject] = useState<ProjectCardType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!slug) return
    fetch(`${API_BASE}/projects/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(d => setProject(d.project))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [slug])

  return (
    <div className="min-h-screen bg-[#E6E6E6]">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">Property not found.</p>
            <button
              onClick={() => router.push('/discover')}
              className="px-6 py-3 bg-blue-600 text-white rounded-full text-sm font-semibold"
            >
              Explore properties
            </button>
          </div>
        )}

        {project && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Render the full detail panel inline (not as slide-over) */}
            <ProjectDetailPanel project={project} onClose={() => router.back()} inline />
          </motion.div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add `inline` prop to ProjectDetailPanel**

Read the full `ProjectDetailPanel.tsx`. Add `inline?: boolean` to its Props interface. When `inline` is true, render without the fixed overlay wrapper — just render the panel content div directly. Find the outer `<AnimatePresence>` + `motion.div` overlay and conditionally skip it:

```typescript
interface Props {
  project: ProjectCardType | null
  onClose: () => void
  inline?: boolean
}

export default function ProjectDetailPanel({ project, onClose, inline }: Props) {
  // ... existing state ...

  if (inline && project) {
    return <PanelContent project={project} onClose={onClose} /* pass all state */ />
  }

  return (
    <AnimatePresence>
      {project && (
        // ... existing overlay + slide-over render ...
      )}
    </AnimatePresence>
  )
}
```

Note: Extract the inner content into a local `PanelContent` sub-component or just duplicate the content render under the inline condition. Prefer the approach that changes the least existing code: add `inline` branch at the top that returns the content div without the fixed overlay.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/property/[slug]/page.tsx frontend/components/ProjectDetailPanel.tsx
git commit -m "feat: property detail page at /property/[slug] with skeleton loader"
```

---

### Task 11: Visual side-by-side comparison panel

**Files:**
- Modify: `frontend/components/ComparisonTable.tsx`

The current ComparisonTable is an inline component. Upgrade it to a proper visual side-by-side card comparison that's impressive for demo purposes. Show: image, name, price, status, possession, top 4 amenities, top 2 connectivity, RERA badge, and a winner badge per row.

- [ ] **Step 1: Read the current ComparisonTable.tsx**

Read `frontend/components/ComparisonTable.tsx` in full.

- [ ] **Step 2: Rewrite the comparison table**

Replace the full content of `frontend/components/ComparisonTable.tsx`:

```tsx
'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, Shield, Trophy, Wifi, MapPin } from 'lucide-react'
import { SealCheck, Buildings } from '@phosphor-icons/react'
import type { ProjectCard } from '@/types/project'

interface Props {
  left: ProjectCard
  right: ProjectCard
}

function formatCr(cr: number) {
  return `₹${cr.toFixed(2)}Cr`
}

interface CompRow {
  label: string
  leftVal: string
  rightVal: string
  leftWins?: boolean
  rightWins?: boolean
}

function buildRows(left: ProjectCard, right: ProjectCard): CompRow[] {
  const rows: CompRow[] = []

  // Price
  const lPrice = left.price_min_cr ?? 0
  const rPrice = right.price_min_cr ?? 0
  rows.push({
    label: 'Starting Price',
    leftVal: left.price_range_label,
    rightVal: right.price_range_label,
    leftWins: lPrice <= rPrice,
    rightWins: rPrice < lPrice,
  })

  // Status
  const statusLabel = (s: string) =>
    s === 'ready_to_move' ? 'Ready to Move' : s === 'new_launch' ? 'New Launch' : 'Under Construction'
  rows.push({
    label: 'Status',
    leftVal: statusLabel(left.status),
    rightVal: statusLabel(right.status),
    leftWins: left.status === 'ready_to_move',
    rightWins: right.status === 'ready_to_move' && left.status !== 'ready_to_move',
  })

  // Possession
  rows.push({
    label: 'Possession',
    leftVal: left.possession_label ?? 'N/A',
    rightVal: right.possession_label ?? 'N/A',
  })

  // RERA
  rows.push({
    label: 'RERA Registered',
    leftVal: left.rera_number ? '✓ Verified' : '—',
    rightVal: right.rera_number ? '✓ Verified' : '—',
    leftWins: !!left.rera_number,
    rightWins: !!right.rera_number && !left.rera_number,
  })

  // Amenities count
  rows.push({
    label: 'Amenities',
    leftVal: `${left.top_amenities.length} key features`,
    rightVal: `${right.top_amenities.length} key features`,
    leftWins: left.top_amenities.length >= right.top_amenities.length,
    rightWins: right.top_amenities.length > left.top_amenities.length,
  })

  return rows
}

export default function ComparisonTable({ left, right }: Props) {
  const rows = buildRows(left, right)

  const Card = ({ project, side }: { project: ProjectCard; side: 'left' | 'right' }) => (
    <div className="flex-1 min-w-0">
      <div className="relative rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
        {/* Hero image */}
        <div className="relative h-36 bg-gray-100">
          {project.hero_image_url ? (
            <Image src={project.hero_image_url} alt={project.name} fill unoptimized className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
              <Buildings size={32} className="text-blue-200" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          {project.rera_number && (
            <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-white bg-blue-600/90 backdrop-blur-sm px-2 py-1 rounded-lg">
              <SealCheck size={10} weight="fill" />
              RERA
            </div>
          )}
          <div className={`absolute bottom-2 left-2 text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm ${
            project.status === 'ready_to_move' ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white'
          }`}>
            {project.status === 'ready_to_move' ? '✓ Ready' : project.possession_label ?? 'Under Construction'}
          </div>
        </div>

        <div className="p-4">
          <h4 className="text-[14px] font-bold text-gray-900 leading-snug line-clamp-1">{project.name}</h4>
          <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
            <MapPin size={9} />
            {project.builder.name} · {project.sector}
          </p>
          <p className="text-[18px] font-black text-gray-900 mt-2 leading-none">{project.price_range_label}</p>
        </div>
      </div>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full rounded-2xl border border-blue-100 bg-blue-50/30 p-4 space-y-4"
    >
      <div className="flex items-center gap-2 mb-1">
        <Trophy size={14} className="text-amber-500" />
        <span className="text-[12px] font-bold text-gray-700 uppercase tracking-wide">Property Comparison</span>
      </div>

      {/* Side-by-side cards */}
      <div className="flex gap-3">
        <Card project={left} side="left" />
        <div className="flex items-center justify-center w-8 flex-shrink-0">
          <span className="text-[11px] font-black text-gray-300">VS</span>
        </div>
        <Card project={right} side="right" />
      </div>

      {/* Comparison rows */}
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="bg-white rounded-xl p-3 flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-400 w-24 flex-shrink-0">{row.label}</span>
            <div className="flex-1 flex items-center justify-between gap-2">
              <span className={`text-[12px] font-bold flex-1 text-left ${row.leftWins ? 'text-emerald-600' : 'text-gray-700'}`}>
                {row.leftWins && <span className="mr-1">✓</span>}
                {row.leftVal}
              </span>
              <span className="text-gray-200 text-xs">|</span>
              <span className={`text-[12px] font-bold flex-1 text-right ${row.rightWins ? 'text-emerald-600' : 'text-gray-700'}`}>
                {row.rightVal}
                {row.rightWins && <span className="ml-1">✓</span>}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Amenities side by side */}
      <div className="flex gap-3">
        <div className="flex-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Top Amenities</p>
          <div className="flex flex-wrap gap-1">
            {left.top_amenities.slice(0, 4).map(a => (
              <span key={a.name} className="text-[10px] bg-white border border-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a.name}</span>
            ))}
          </div>
        </div>
        <div className="w-px bg-gray-100" />
        <div className="flex-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Top Amenities</p>
          <div className="flex flex-wrap gap-1 justify-end">
            {right.top_amenities.slice(0, 4).map(a => (
              <span key={a.name} className="text-[10px] bg-white border border-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a.name}</span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/ComparisonTable.tsx
git commit -m "feat: visual side-by-side comparison panel with winner indicators"
```

---

### Task 12: Animated lead success modal

**Files:**
- Create: `frontend/components/LeadSuccessModal.tsx`
- Modify: `frontend/components/SiteVisitScheduler.tsx`

After a site visit or callback is booked, show a full-screen animated success modal instead of just a state change. This is the moment partners will experience — make it feel premium.

- [ ] **Step 1: Create LeadSuccessModal**

Create `frontend/components/LeadSuccessModal.tsx`:

```tsx
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Calendar, Phone, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  type: 'site_visit' | 'callback'
  projectName: string
  name: string
  visitDate?: string
  timeSlot?: string
  onClose: () => void
}

export default function LeadSuccessModal({ type, projectName, name, visitDate, timeSlot, onClose }: Props) {
  const router = useRouter()

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
        >
          {/* Animated checkmark */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', damping: 15, stiffness: 300 }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center"
          >
            <CheckCircle2 size={40} className="text-emerald-500" strokeWidth={2} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-black text-gray-900 mb-1">
              {type === 'site_visit' ? 'Visit Booked!' : 'Request Sent!'}
            </h2>
            <p className="text-gray-500 text-sm mb-5">
              {type === 'site_visit'
                ? `Your site visit for ${projectName} is confirmed.`
                : `Our team will call ${name} within 2 hours.`}
            </p>

            {type === 'site_visit' && visitDate && (
              <div className="bg-blue-50 rounded-2xl p-4 mb-5 text-left space-y-2">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <Calendar size={14} className="flex-shrink-0" />
                  <span className="font-semibold">{visitDate}</span>
                </div>
                {timeSlot && (
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <span className="ml-5">🕐 {timeSlot}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <span className="ml-5">📍 {projectName}</span>
                </div>
              </div>
            )}

            {type === 'callback' && (
              <div className="bg-emerald-50 rounded-2xl p-4 mb-5 text-left">
                <div className="flex items-center gap-2 text-sm text-emerald-800">
                  <Phone size={14} />
                  <span>Calling {name} within <strong>2 business hours</strong></span>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 mb-5">You'll receive a confirmation shortly</p>

            <div className="flex flex-col gap-2">
              <button
                onClick={onClose}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                Continue exploring
                <ArrowRight size={14} />
              </button>
              <button
                onClick={() => { onClose(); router.push('/saved') }}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors text-sm"
              >
                View saved properties
              </button>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Integrate LeadSuccessModal into SiteVisitScheduler**

Read `frontend/components/SiteVisitScheduler.tsx` in full, then:
- Import `LeadSuccessModal`
- Replace the current success state (`onClose()` on success) with showing `LeadSuccessModal`
- Pass `type="site_visit"`, `projectName`, `name` (from form state), `visitDate`, `timeSlot`

- [ ] **Step 3: Integrate LeadSuccessModal into callback modal in DiscoveryContent**

In `frontend/components/DiscoveryContent.tsx`, find the `callbackDone` state block (around line 1431). Replace the inline success div with:

```tsx
import LeadSuccessModal from '@/components/LeadSuccessModal'

// Replace callbackDone block:
{callbackDone && callbackProject && (
  <LeadSuccessModal
    type="callback"
    projectName={callbackProject.name}
    name={callbackForm.name}
    onClose={() => { setCallbackProject(null); setCallbackDone(false) }}
  />
)}
```

Remove the callbackDone JSX from inside the callback modal — render LeadSuccessModal as a sibling instead (outside the AnimatePresence block for callback modal).

- [ ] **Step 4: Commit**

```bash
git add frontend/components/LeadSuccessModal.tsx frontend/components/SiteVisitScheduler.tsx frontend/components/DiscoveryContent.tsx
git commit -m "feat: animated lead success modal for site visits and callbacks"
```

---

### Task 13: Live leads counter in Sidebar for demo

**Files:**
- Modify: `frontend/components/Sidebar.tsx`
- Create: `frontend/app/api/v1/leads/count/route.ts`

During the demo, partners will see a live "leads captured today" count in the sidebar. This shows the product is collecting real intent signals. Fetches from a lightweight API that counts today's SiteVisitRequests + callbacks.

- [ ] **Step 1: Create the leads count API**

Create `frontend/app/api/v1/leads/count/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest) {
  try {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const count = await prisma.siteVisitRequest.count({
      where: {
        created_at: { gte: startOfDay },
      },
    })

    return NextResponse.json({ count })
  } catch (err) {
    console.error('[leads/count]', err)
    return NextResponse.json({ count: 0 })
  }
}
```

- [ ] **Step 2: Read Sidebar.tsx**

Read `frontend/components/Sidebar.tsx` in full.

- [ ] **Step 3: Add leads counter to Sidebar**

Add state and fetch in Sidebar:

```typescript
  const [leadsToday, setLeadsToday] = useState<number | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/leads/count`)
      .then(r => r.json())
      .then(d => setLeadsToday(d.count ?? null))
      .catch(() => {})
  }, [])
```

Add the badge in the sidebar footer/bottom area (above the logout button or in a footer section):

```tsx
{leadsToday !== null && leadsToday > 0 && (
  <div className="mx-3 mb-3 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 flex items-center gap-2">
    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
      {leadsToday} lead{leadsToday !== 1 ? 's' : ''} captured today
    </span>
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/api/v1/leads/count/route.ts frontend/components/Sidebar.tsx
git commit -m "feat: live leads-today counter in sidebar for demo"
```

---

### Task 14: Builder reputation display on property detail

**Files:**
- Modify: `frontend/components/BuilderReputationCard.tsx`

Read `BuilderReputationCard.tsx`. Ensure it renders cleanly with: builder name, founding year, delivered projects count, ongoing projects count, and a simple trust score display. If any field is null, show placeholder text instead of crashing.

- [ ] **Step 1: Read BuilderReputationCard.tsx**

Read `frontend/components/BuilderReputationCard.tsx` in full.

- [ ] **Step 2: Add null guards to all fields**

Identify every place a builder field is rendered without null check. Wrap all optional fields:

```tsx
{builder.founding_year && (
  <span>Est. {builder.founding_year}</span>
)}

{builder.delivered_projects != null && (
  <span>{builder.delivered_projects} delivered</span>
)}

{builder.ongoing_projects != null && (
  <span>{builder.ongoing_projects} ongoing</span>
)}
```

If `builder` prop itself can be null, add a null guard at the top:

```tsx
if (!builder) return (
  <div className="rounded-xl border border-gray-100 p-4 text-sm text-gray-400">
    Builder information not available
  </div>
)
```

- [ ] **Step 3: Add RERA verification section**

If `project.rera_number` is passed as a prop or accessible, add a prominent RERA section:

```tsx
{reraNumber && (
  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl mt-3">
    <SealCheck size={14} className="text-blue-600" weight="fill" />
    <div>
      <p className="text-[10px] font-semibold text-blue-400 uppercase">RERA Registered</p>
      <p className="text-[12px] font-bold text-blue-700 font-mono">{reraNumber}</p>
    </div>
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/BuilderReputationCard.tsx
git commit -m "fix: null guards in BuilderReputationCard, add RERA section"
```

---

## Phase 4: Final QA Pass

### Task 15: End-to-end demo flow verification

- [ ] **Step 1: Verify property cards render without errors**

Run `cd frontend && npm run build` and confirm 0 TypeScript errors.

- [ ] **Step 2: Manual demo flow walkthrough**

Walk through this exact demo path:
1. Load `/discover` — verify no flicker, shows welcome screen
2. Type "Show me 3BHK in Sector 150 under 3 Cr" — verify cards appear, map toggle works
3. Click "View Details" on a card — verify slide-over opens fully
4. Navigate to `/property/[slug]` directly — verify page loads with skeleton then content
5. Click "Book Site Visit" — verify modal opens, fill form, submit — verify LeadSuccessModal shows
6. Click "Get Callback" — verify modal, submit — verify LeadSuccessModal shows
7. Click "Calculate EMI" chip — verify calculator opens
8. Click "Compare" chip with 2 properties selected — verify ComparisonTable renders
9. Navigate to `/saved` — verify skeleton shows then content (or empty state)
10. Check Sidebar for leads counter

- [ ] **Step 3: Commit any final fixes found during walkthrough**

Fix any issues found and commit individually.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: demo-ready final QA pass"
```

---

## Demo Talking Points (for partners meet)

**What to show:**
1. **AI advisor** — chat naturally, get ranked property cards instantly
2. **RERA verification** — every card shows RERA badge, ask AI to "check RERA status" live
3. **Lead capture** — book a site visit, show the animated success, then show Sidebar counter increment
4. **Comparison** — select 2 properties via Compare chip, show visual side-by-side
5. **Session persistence** — refresh the page, chat history restores
6. **Voice input** — tap mic, speak in Hindi or English
7. **WhatsApp handoff** — click WhatsApp button on a card, show the pre-filled message

**What to avoid showing:**
- Market Intelligence page (placeholder)
- Value Estimator (only works for Sector 150)
- Admin panel (not styled for demo)
