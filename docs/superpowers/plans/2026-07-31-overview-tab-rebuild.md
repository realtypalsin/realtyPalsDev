# Overview Tab Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the project-detail Overview tab's backend so every number on it (AI Verdict, price trend, live activity, construction progress, on-time delivery %) is computed from real database facts, with weak/empty numbers hidden instead of shown — then wire the frontend to render it, hiding cleanly since the database starts empty.

**Architecture:** Reuse the existing `computeRecommendationScore` engine (already real, formula-based) rather than inventing a second verdict system — extend it with a confidence/basis-count so callers can hide it below threshold. Add three new Prisma models for genuinely new data (price history, construction milestones, builder delivery records) plus two scalability columns on `Project`. Expose it all through one new per-tab route, `GET /projects/:slug/overview`, following the existing pattern (`/:slug/documents`, `/:slug/payment-plan`, `/:slug/cost-sheet`, `/:slug/investment`). Frontend sections each independently hide when their data is null/empty — same idiom `AlternativesCard` in `OverviewTab.tsx` already uses.

**Tech Stack:** Express + Prisma (PostgreSQL) backend, Next.js/React frontend, `node:test` for backend unit tests.

## Global Constraints

- Never fabricate a score or count. Every number traces to a real DB field or a documented formula over real DB fields.
- Any number below a meaningful threshold (rating < 1, count = 0, confidence too low) is omitted from the API response entirely (`null`), not sent as 0 — the frontend's job is only "render if present," never "decide whether to fake it."
- Schema changes are additive only (new tables, new nullable columns) — no destructive changes to existing tables.
- New `Project` fields `state` and `country` default to the current single-market values (`"Uttar Pradesh"`, `"India"`) so existing rows and code keep working unchanged — this is what makes city → state → country → global expansion later a data-fill exercise, not a schema rewrite.
- Match existing code conventions exactly: Express `Router`, `prisma` singleton from `../lib/db`, `routeCache(seconds)` on cacheable GETs, `node:test` + `assert/strict` for backend tests, `'use client'` + hide-if-empty components on the frontend.

---

### Task 1: Schema — scalability columns + three new tables

**Files:**
- Modify: `frontend/prisma/schema.prisma`

**Interfaces:**
- Produces: `Project.state`, `Project.country` (String, defaulted); `PriceHistory` model (`project_id`, `recorded_at`, `price_per_sqft`, `total_price_cr`, `source`); `ConstructionMilestone` model (`project_id`, `name`, `status`, `completed_at`, `photo_urls`, `sort_order`); `BuilderDeliveryRecord` model (`builder_id`, `project_name`, `promised_date`, `actual_date`).

- [ ] **Step 1: Add scalability columns to `Project`**

In `frontend/prisma/schema.prisma`, inside `model Project { ... }`, add after the existing `city` line:

```prisma
  city                     String                 @default("Noida")
  state                    String                 @default("Uttar Pradesh")
  country                  String                 @default("India")
```

- [ ] **Step 2: Add `PriceHistory` model**

Add after the `UnitType` model block:

```prisma
model PriceHistory {
  id             String   @id @default(uuid())
  project_id     String
  recorded_at    DateTime @default(now())
  price_per_sqft Float?
  total_price_cr Float?
  source         String   @default("monthly_auto_snapshot") // "admin_update" | "monthly_auto_snapshot"
  project        Project  @relation(fields: [project_id], references: [id], onDelete: Cascade)

  @@index([project_id, recorded_at])
  @@map("price_history")
}
```

- [ ] **Step 3: Add `ConstructionMilestone` model**

```prisma
model ConstructionMilestone {
  id           String    @id @default(uuid())
  project_id   String
  name         String
  status       ConstructionStatus @default(upcoming)
  completed_at DateTime?
  photo_urls   String[]  @default([])
  sort_order   Int       @default(0)
  created_at   DateTime  @default(now())
  updated_at   DateTime  @updatedAt
  project      Project   @relation(fields: [project_id], references: [id], onDelete: Cascade)

  @@index([project_id, sort_order])
  @@map("construction_milestones")
}

enum ConstructionStatus {
  completed
  in_progress
  upcoming
}
```

- [ ] **Step 4: Add `BuilderDeliveryRecord` model**

```prisma
model BuilderDeliveryRecord {
  id            String    @id @default(uuid())
  builder_id    String
  project_name  String
  promised_date DateTime
  actual_date   DateTime?
  created_at    DateTime  @default(now())
  builder       Builder   @relation(fields: [builder_id], references: [id], onDelete: Cascade)

  @@index([builder_id])
  @@map("builder_delivery_records")
}
```

- [ ] **Step 5: Wire the reverse relations**

In `model Project { ... }`, add to the relations block (near `unit_types UnitType[]`):

```prisma
  price_history            PriceHistory[]
  construction_milestones  ConstructionMilestone[]
```

In `model Builder { ... }`, add to the relations block (near `projects Project[]`):

```prisma
  delivery_records   BuilderDeliveryRecord[]
```

- [ ] **Step 6: Generate and run the migration**

Run: `cd frontend && npx prisma migrate dev --name overview_tab_v2`
Expected: migration created under `frontend/prisma/migrations/`, applies cleanly, `Project`/`Builder` existing rows get the new defaulted columns with no data loss.

- [ ] **Step 7: Regenerate the Prisma client**

Run: `cd frontend && npx prisma generate`
Expected: no errors; `PriceHistory`, `ConstructionMilestone`, `BuilderDeliveryRecord` types now available from `@prisma/client`.

- [ ] **Step 8: Commit**

```bash
git add frontend/prisma/schema.prisma frontend/prisma/migrations
git commit -m "feat(db): add price history, construction milestones, builder delivery records, and state/country columns"
```

---

### Task 2: Verdict confidence — extend the existing scoring engine

**Files:**
- Modify: `backend/src/lib/recommendation/score.ts`
- Test: `backend/src/lib/recommendation/score.test.ts` (new)

**Interfaces:**
- Consumes: `ScoreInput` (existing, unchanged shape).
- Produces: `RecommendationScore.confidence: number` (0–100), `RecommendationScore.basis_count: number` (0–6) — additive fields, existing consumers (`backend/src/routes/projects.ts`) keep working unchanged since they only read `.total`/`.tier`/`.dimensions`.

- [ ] **Step 1: Write the failing test**

Create `backend/src/lib/recommendation/score.test.ts`:

```typescript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeRecommendationScore } from './score'

const baseInput = {
  status: 'under_construction' as const,
  possession_date: null,
  project_risk_flag: null,
  builder: { legal_flag: null },
}

describe('computeRecommendationScore confidence', () => {
  it('reports 0 basis and 0 confidence when dna is null', () => {
    const result = computeRecommendationScore({ ...baseInput, dna: null })
    assert.equal(result.basis_count, 0)
    assert.equal(result.confidence, 0)
  })

  it('reports full basis and confidence when all 6 dna scores are present', () => {
    const result = computeRecommendationScore({
      ...baseInput,
      dna: {
        builder_track_record_score: 90,
        price_position_score: 80,
        locality_score: 85,
        rera_compliance_score: 100,
        amenity_depth_score: 70,
        possession_certainty_score: 75,
      },
    })
    assert.equal(result.basis_count, 6)
    assert.equal(result.confidence, 100)
  })

  it('reports partial basis when only some dna scores are present', () => {
    const result = computeRecommendationScore({
      ...baseInput,
      dna: {
        builder_track_record_score: 90,
        price_position_score: 80,
        locality_score: null,
        rera_compliance_score: null,
        amenity_depth_score: null,
        possession_certainty_score: null,
      },
    })
    assert.equal(result.basis_count, 2)
    assert.equal(result.confidence, Math.round((2 / 6) * 100))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx tsx --test src/lib/recommendation/score.test.ts`
Expected: FAIL — `basis_count` and `confidence` are `undefined` on the returned object.

- [ ] **Step 3: Implement the minimal change**

In `backend/src/lib/recommendation/score.ts`, update the `RecommendationScore` interface (after `dimensions: ScoreDimension[]`):

```typescript
export interface RecommendationScore {
  total:       number
  tier:        string
  dimensions:  ScoreDimension[]
  basis_count: number   // 0-6, how many of the 6 DNA scores were real (non-null)
  confidence:  number   // 0-100, basis_count / 6 as a percentage
}
```

Then in `computeRecommendationScore`, after the `const d = input.dna` line, add:

```typescript
  const dnaFields = [
    d?.builder_track_record_score,
    d?.price_position_score,
    d?.locality_score,
    d?.rera_compliance_score,
    d?.amenity_depth_score,
    d?.possession_certainty_score,
  ]
  const basis_count = dnaFields.filter((v) => v != null).length
  const confidence = Math.round((basis_count / 6) * 100)
```

And add `basis_count` and `confidence` to the returned object at the end of the function:

```typescript
  return {
    total: rounded,
    tier,
    basis_count,
    confidence,
    dimensions: [
```
*(keep the existing `dimensions: [...]` array exactly as-is, just add the two new keys alongside it)*

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx tsx --test src/lib/recommendation/score.test.ts`
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/recommendation/score.ts backend/src/lib/recommendation/score.test.ts
git commit -m "feat(scoring): add confidence and basis_count to recommendation score"
```

---

### Task 3: Live activity engine

**Files:**
- Create: `backend/src/lib/liveActivity.ts`
- Test: `backend/src/lib/liveActivity.test.ts`

**Interfaces:**
- Consumes: `prisma` client (`../lib/db`), a `project_id: string`.
- Produces: `computeLiveActivity(projectId: string): Promise<LiveActivity>` where `LiveActivity = { viewing_now: number | null; visits_booked_last_hour: number | null; units_left: number | null }`. Each field is `null` (hidden) below its threshold.

- [ ] **Step 1: Write the failing test**

Create `backend/src/lib/liveActivity.test.ts`:

```typescript
import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'

describe('applyActivityThresholds', () => {
  it('hides viewing_now below the minimum of 2', async () => {
    const { applyActivityThresholds } = await import('./liveActivity')
    assert.equal(applyActivityThresholds(0, 0, 0).viewing_now, null)
    assert.equal(applyActivityThresholds(1, 0, 0).viewing_now, null)
    assert.equal(applyActivityThresholds(2, 0, 0).viewing_now, 2)
  })

  it('hides visits_booked_last_hour when 0', async () => {
    const { applyActivityThresholds } = await import('./liveActivity')
    assert.equal(applyActivityThresholds(0, 0, 0).visits_booked_last_hour, null)
    assert.equal(applyActivityThresholds(0, 1, 0).visits_booked_last_hour, 1)
  })

  it('hides units_left when 0 or null, shows otherwise', async () => {
    const { applyActivityThresholds } = await import('./liveActivity')
    assert.equal(applyActivityThresholds(0, 0, 0).units_left, null)
    assert.equal(applyActivityThresholds(0, 0, null).units_left, null)
    assert.equal(applyActivityThresholds(0, 0, 5).units_left, 5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx tsx --test src/lib/liveActivity.test.ts`
Expected: FAIL — `./liveActivity` module does not exist.

- [ ] **Step 3: Implement**

Create `backend/src/lib/liveActivity.ts`:

```typescript
// Live activity strip for a project's Overview tab.
// Every number here is a real-time count from actual events — never simulated.
// Numbers below their threshold are hidden (null) rather than shown as a weak/zero value.

import { prisma } from './db'

export interface LiveActivity {
  viewing_now: number | null
  visits_booked_last_hour: number | null
  units_left: number | null
}

const VIEWING_NOW_WINDOW_MINUTES = 15
const VIEWING_NOW_MIN_TO_SHOW = 2       // "1 person viewing" reads as empty, not exciting
const VISITS_MIN_TO_SHOW = 1
const UNITS_LEFT_MIN_TO_SHOW = 1

export function applyActivityThresholds(
  viewingNowRaw: number,
  visitsBookedRaw: number,
  unitsLeftRaw: number | null,
): LiveActivity {
  return {
    viewing_now: viewingNowRaw >= VIEWING_NOW_MIN_TO_SHOW ? viewingNowRaw : null,
    visits_booked_last_hour: visitsBookedRaw >= VISITS_MIN_TO_SHOW ? visitsBookedRaw : null,
    units_left: unitsLeftRaw != null && unitsLeftRaw >= UNITS_LEFT_MIN_TO_SHOW ? unitsLeftRaw : null,
  }
}

export async function computeLiveActivity(projectId: string): Promise<LiveActivity> {
  const windowStart = new Date(Date.now() - VIEWING_NOW_WINDOW_MINUTES * 60 * 1000)
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)

  const [viewingSessions, visitsBooked, unitTypes] = await Promise.all([
    prisma.propertyEvent.findMany({
      where: { project_id: projectId, action: 'view', created_at: { gte: windowStart } },
      select: { session_id: true },
      distinct: ['session_id'],
    }),
    prisma.siteVisitRequest.count({
      where: { project_id: projectId, created_at: { gte: hourAgo } },
    }),
    prisma.unitType.findMany({
      where: { project_id: projectId },
      select: { inventory_left: true },
    }),
  ])

  const unitsLeftTotal = unitTypes.some((u) => u.inventory_left != null)
    ? unitTypes.reduce((sum, u) => sum + (u.inventory_left ?? 0), 0)
    : null

  return applyActivityThresholds(viewingSessions.length, visitsBooked, unitsLeftTotal)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx tsx --test src/lib/liveActivity.test.ts`
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/liveActivity.ts backend/src/lib/liveActivity.test.ts
git commit -m "feat(overview): add real-time live activity engine with hide-below-threshold rule"
```

---

### Task 4: Builder on-time delivery %

**Files:**
- Create: `backend/src/lib/builderDelivery.ts`
- Test: `backend/src/lib/builderDelivery.test.ts`

**Interfaces:**
- Produces: `computeOnTimeDeliveryPct(records: { promised_date: Date; actual_date: Date | null }[]): number | null` — pure function, `null` if fewer than `MIN_RECORDS_TO_SHOW` delivered records exist.

- [ ] **Step 1: Write the failing test**

Create `backend/src/lib/builderDelivery.test.ts`:

```typescript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeOnTimeDeliveryPct } from './builderDelivery'

describe('computeOnTimeDeliveryPct', () => {
  it('returns null when there are no delivered records', () => {
    assert.equal(computeOnTimeDeliveryPct([]), null)
  })

  it('returns null when fewer than 3 records exist (not enough basis)', () => {
    const records = [
      { promised_date: new Date('2020-01-01'), actual_date: new Date('2020-01-01') },
      { promised_date: new Date('2021-01-01'), actual_date: new Date('2021-01-01') },
    ]
    assert.equal(computeOnTimeDeliveryPct(records), null)
  })

  it('computes the on-time percentage from actual vs promised dates', () => {
    const records = [
      { promised_date: new Date('2020-01-01'), actual_date: new Date('2020-01-01') }, // on time
      { promised_date: new Date('2021-01-01'), actual_date: new Date('2020-12-15') }, // early = on time
      { promised_date: new Date('2022-01-01'), actual_date: new Date('2022-06-01') }, // late
      { promised_date: new Date('2023-01-01'), actual_date: null },                   // still undelivered, excluded
    ]
    assert.equal(computeOnTimeDeliveryPct(records), 67) // 2 of 3 delivered records were on time
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx tsx --test src/lib/builderDelivery.test.ts`
Expected: FAIL — `./builderDelivery` module does not exist.

- [ ] **Step 3: Implement**

Create `backend/src/lib/builderDelivery.ts`:

```typescript
// On-time delivery % for a builder, computed only from real promised-vs-actual
// delivery dates. Never shown below a minimum sample size — a builder with
// one delivered project doesn't get a "100% on-time" badge.

export interface DeliveryRecord {
  promised_date: Date
  actual_date: Date | null
}

const MIN_RECORDS_TO_SHOW = 3

export function computeOnTimeDeliveryPct(records: DeliveryRecord[]): number | null {
  const delivered = records.filter((r) => r.actual_date != null)
  if (delivered.length < MIN_RECORDS_TO_SHOW) return null

  const onTime = delivered.filter((r) => r.actual_date! <= r.promised_date).length
  return Math.round((onTime / delivered.length) * 100)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx tsx --test src/lib/builderDelivery.test.ts`
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/builderDelivery.ts backend/src/lib/builderDelivery.test.ts
git commit -m "feat(overview): add builder on-time-delivery percentage engine"
```

---

### Task 5: `GET /projects/:slug/overview` route

**Files:**
- Modify: `backend/src/routes/projects.ts`

**Interfaces:**
- Consumes: `computeRecommendationScore` (Task 2, now with `confidence`/`basis_count`), `computeLiveActivity` (Task 3), `computeOnTimeDeliveryPct` (Task 4), Prisma models `PriceHistory`/`ConstructionMilestone`/`BuilderDeliveryRecord` (Task 1).
- Produces: `GET /projects/:slug/overview` → `{ available: true, verdict, live_activity, price_history, construction_milestones, on_time_delivery_pct }` or `{ available: false, error }` on 404.

- [ ] **Step 1: Add the route**

In `backend/src/routes/projects.ts`, add the imports at the top:

```typescript
import { computeLiveActivity } from '../lib/liveActivity'
import { computeOnTimeDeliveryPct } from '../lib/builderDelivery'
```

Add this route after the existing `router.get('/:slug/investment', ...)` block, before `export default router`:

```typescript
router.get('/:slug/overview', async (req: Request, res: Response) => {
  const project = await prisma.project.findUnique({
    where: { slug: req.params.slug },
    select: {
      id: true,
      status: true,
      possession_date: true,
      project_risk_flag: true,
      builder: { select: { id: true, legal_flag: true } },
      dna: {
        select: {
          builder_track_record_score: true,
          price_position_score:       true,
          locality_score:             true,
          rera_compliance_score:      true,
          amenity_depth_score:        true,
          possession_certainty_score: true,
        },
      },
    },
  })
  if (!project) { res.status(404).json({ error: 'Not found' }); return }

  const fiveYearsAgo = new Date()
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)

  const [liveActivity, priceHistory, milestones, deliveryRecords] = await Promise.all([
    computeLiveActivity(project.id),
    prisma.priceHistory.findMany({
      where: { project_id: project.id, recorded_at: { gte: fiveYearsAgo } },
      select: { recorded_at: true, price_per_sqft: true, total_price_cr: true },
      orderBy: { recorded_at: 'asc' },
    }),
    prisma.constructionMilestone.findMany({
      where: { project_id: project.id },
      select: { name: true, status: true, completed_at: true, photo_urls: true },
      orderBy: { sort_order: 'asc' },
    }),
    prisma.builderDeliveryRecord.findMany({
      where: { builder_id: project.builder.id },
      select: { promised_date: true, actual_date: true },
    }),
  ])

  const verdict = computeRecommendationScore({
    dna: project.dna,
    status: project.status as 'under_construction' | 'ready_to_move' | 'new_launch',
    possession_date: project.possession_date,
    project_risk_flag: project.project_risk_flag,
    builder: { legal_flag: project.builder.legal_flag },
  })

  res.json({
    available: true,
    // Hide the whole verdict badge when fewer than half the DNA dimensions have real data.
    verdict: verdict.basis_count >= 3 ? verdict : null,
    live_activity: liveActivity,
    price_history: priceHistory.length > 0 ? priceHistory : null,
    construction_milestones: milestones.length > 0 ? milestones : null,
    on_time_delivery_pct: computeOnTimeDeliveryPct(deliveryRecords),
  })
})
```

- [ ] **Step 2: Verify manually**

Run: `cd backend && npm run dev` (or the project's existing dev script), then in another terminal:
`curl http://localhost:3001/projects/<any-existing-slug>/overview`
Expected: JSON with `available: true`, `verdict: null` (no DNA data seeded yet), `live_activity` all fields `null`, `price_history: null`, `construction_milestones: null`, `on_time_delivery_pct: null`. This is correct — the database is empty, everything honestly hides.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/projects.ts
git commit -m "feat(overview): add GET /projects/:slug/overview aggregating verdict, live activity, price history, construction progress"
```

---

### Task 6: Frontend wiring — hide-if-empty sections

**Files:**
- Modify: `frontend/lib/backend-api.ts`
- Modify: `frontend/components/property-detail/OverviewTab.tsx`

**Interfaces:**
- Consumes: `GET /projects/:slug/overview` (Task 5).
- Produces: `fetchProjectOverview(slug: string): Promise<ProjectOverviewData>` in `backend-api.ts`; `<VerdictBadge>`, `<LiveActivityStrip>`, `<ConstructionTimeline>` components in `OverviewTab.tsx`, each returning `null` when their data is absent — same idiom as the existing `AlternativesCard`.

- [ ] **Step 1: Add the API client function**

In `frontend/lib/backend-api.ts`, add near the other fetch functions (after the `ScoredProject` interface block):

```typescript
export interface ProjectOverviewData {
  available: boolean
  verdict: {
    total: number
    tier: string
    confidence: number
  } | null
  live_activity: {
    viewing_now: number | null
    visits_booked_last_hour: number | null
    units_left: number | null
  }
  price_history: Array<{ recorded_at: string; price_per_sqft: number | null; total_price_cr: number | null }> | null
  construction_milestones: Array<{ name: string; status: string; completed_at: string | null; photo_urls: string[] }> | null
  on_time_delivery_pct: number | null
}

export async function fetchProjectOverview(slug: string): Promise<ProjectOverviewData> {
  const res = await fetch(`${BACKEND}/projects/${slug}/overview`)
  if (!res.ok) {
    return {
      available: false,
      verdict: null,
      live_activity: { viewing_now: null, visits_booked_last_hour: null, units_left: null },
      price_history: null,
      construction_milestones: null,
      on_time_delivery_pct: null,
    }
  }
  return res.json()
}
```

- [ ] **Step 2: Add the hide-if-empty section components**

In `frontend/components/property-detail/OverviewTab.tsx`, add after the existing `AlternativesCard` function:

```typescript
function VerdictBadge({ verdict }: { verdict: { total: number; tier: string; confidence: number } | null }) {
  if (!verdict) return null
  const tierLabel: Record<string, string> = {
    STRONG_BUY: 'Strong Buy', BUY: 'Buy', HOLD: 'Hold', WATCH: 'Watch', AVOID: 'Avoid',
  }
  return (
    <div className="rounded-3xl border border-gray-100 dark:border-gray-800/40 bg-white dark:bg-[#171412] p-4 flex items-center gap-3">
      <div className="text-2xl font-extrabold text-gray-900 dark:text-white">{Math.round(verdict.total)}<span className="text-sm text-gray-400">/100</span></div>
      <div>
        <div className="text-[15px] font-bold text-green-700 dark:text-green-400">{tierLabel[verdict.tier] ?? verdict.tier}</div>
        <div className="text-xs text-gray-500">{verdict.confidence}% confidence</div>
      </div>
    </div>
  )
}

function LiveActivityStrip({ activity }: { activity: { viewing_now: number | null; visits_booked_last_hour: number | null; units_left: number | null } }) {
  const items = [
    activity.viewing_now != null ? { label: 'People viewing this property now', value: activity.viewing_now } : null,
    activity.visits_booked_last_hour != null ? { label: 'Site visits booked in last hour', value: activity.visits_booked_last_hour } : null,
    activity.units_left != null ? { label: 'Units left in this phase', value: activity.units_left } : null,
  ].filter((x): x is { label: string; value: number } => x !== null)

  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap gap-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-sm">
          <span className="font-extrabold text-gray-900 dark:text-white">{item.value}</span>
          <span className="text-gray-500">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

function ConstructionTimeline({ milestones }: { milestones: Array<{ name: string; status: string; completed_at: string | null }> | null }) {
  if (!milestones || milestones.length === 0) return null
  return (
    <div className="space-y-3">
      <h2 className="text-[16px] font-extrabold text-gray-900 dark:text-white tracking-tight">Construction Updates</h2>
      <div className="flex gap-4 overflow-x-auto">
        {milestones.map((m) => (
          <div key={m.name} className="flex flex-col items-center gap-1 min-w-[90px]">
            <div className={`w-3 h-3 rounded-full ${m.status === 'completed' ? 'bg-green-500' : m.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-300'}`} />
            <div className="text-xs text-center text-gray-700 dark:text-gray-300">{m.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Fetch and render in the tab**

Find where `OverviewTab` component body starts consuming `project`/`detail` props (the exported function using `OverviewTabProps`). Add a `useState`/`useEffect` fetch keyed on the project slug, and render the three new components in the section order matching the mockup (verdict near the top price block, activity strip near the hero, construction timeline lower down):

```typescript
const [overview, setOverview] = useState<ProjectOverviewData | null>(null)

useEffect(() => {
  const slug = detail?.slug ?? project?.slug
  if (!slug) return
  fetchProjectOverview(slug).then(setOverview)
}, [detail?.slug, project?.slug])
```
*(add `fetchProjectOverview` and `ProjectOverviewData` to the existing import from `@/lib/backend-api`, and `useEffect` to the existing `useState` import from `'react'`)*

Then render, wherever the price/possession summary block currently sits:

```tsx
<VerdictBadge verdict={overview?.verdict ?? null} />
<LiveActivityStrip activity={overview?.live_activity ?? { viewing_now: null, visits_booked_last_hour: null, units_left: null }} />
```

And lower in the page, near where `AlternativesCard` is rendered:

```tsx
<ConstructionTimeline milestones={overview?.construction_milestones ?? null} />
```

- [ ] **Step 4: Verify manually**

Run the frontend dev server, open any project detail page. Expected: no visual change from today (all three new sections render `null` since the database has no verdict/activity/milestone data yet), no console errors, network tab shows a successful `GET /projects/<slug>/overview` call.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/backend-api.ts frontend/components/property-detail/OverviewTab.tsx
git commit -m "feat(overview): wire verdict, live activity, and construction timeline sections (hide when no data)"
```

---

## Self-Review

**Spec coverage:** scalability columns (Task 1), 5-year price history (Task 1 + 5), AI Verdict with confidence/hide-threshold (Task 2 + 5), live activity counters (Task 3), on-time delivery % (Task 4), construction updates (Task 1 + 5 + 6), frontend wiring with hide-if-empty (Task 6). Google Reviews and Verified Channel Partners are intentionally excluded — still pending your decision from the data dictionary doc; add as Task 7/8 once decided.

**Type consistency:** `LiveActivity` (Task 3) matches the `live_activity` shape consumed in Task 5's route and Task 6's `ProjectOverviewData`. `computeOnTimeDeliveryPct` (Task 4) input shape matches the `select` fields pulled for `deliveryRecords` in Task 5.
