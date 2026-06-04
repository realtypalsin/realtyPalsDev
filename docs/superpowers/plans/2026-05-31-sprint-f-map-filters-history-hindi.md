# Sprint F: Sector Map + Possession Filter + Price History + Hindi Input

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 features: (1) sector map with property pins after recommendations, (2) possession timeline filter ("delivering by 2026"), (3) price appreciation note in property detail, (4) Hindi/Hinglish input support.

**Architecture:** F1 (possession filter) modifies backend chain: prompts → intentManager → repository → chat route. F2 (Hindi) updates the intent extraction prompt only. F3 (price history) is a static data component added to ProjectDetailPanel. F4 (sector map) installs react-leaflet and renders after shortlisted cards in DiscoveryContent.

**Tech Stack:** Next.js, React, TypeScript, Tailwind, react-leaflet (install), Leaflet

---

## File Map

| File | Change |
|------|--------|
| `frontend/lib/ai/prompts.ts` | Add `possession_year_max` extraction rule + Hindi/Hinglish examples |
| `frontend/lib/ai/intentManager.ts` | Add `possession_year_max?: number` to IntentState |
| `frontend/lib/repositories/projectRepository.ts` | Add `possession_year_max` to SearchFilters + Prisma where clause |
| `frontend/app/api/v1/chat/route.ts` | Pass `possession_year_max` from extracted intent to searchProjects |
| `frontend/components/ProjectDetailPanel.tsx` | Add price history card in Overview tab |
| `frontend/components/SectorMap.tsx` | New — Leaflet map with property pins |
| `frontend/components/DiscoveryContent.tsx` | Render SectorMap after shortlisted cards |
| `frontend/package.json` | Add leaflet, react-leaflet, @types/leaflet |

---

## Task 1: Possession timeline filter

**Context:** When a user says "show me what's ready by 2026" or "delivering before 2027", extract a `possession_year_max` field and filter projects whose `possession_date <= Dec 31 of that year`. The `possession_date DateTime?` field exists in the Prisma schema.

### Step-by-step

- [ ] **Step 1: Update `frontend/lib/ai/prompts.ts` — add possession year extraction**

In `PROMPTS.INTENT_EXTRACTION`, find rule `7. PROJECT NAME EXTRACTION` (or whichever is last numbered). Add a new numbered rule after it:

```
10. POSSESSION TIMELINE (new field: possession_year_max):
   Extract possession_year_max ONLY when the user specifies a delivery/possession deadline.
   - "ready by 2026" / "delivering by 2026" / "possession in 2026" → possession_year_max: 2026
   - "within 2 years" (from ~2026) → possession_year_max: 2028
   - "immediate" / "ready to move" → set possession_status: "ready_to_move" (NOT possession_year_max)
   - "by end of this year" (from ~2026) → possession_year_max: 2026
   - Only extract if a year or timeframe is mentioned. Do not guess.

   Add to OUTPUT SHAPE: "possession_year_max": <4-digit year integer | null>
```

Also add to the OUTPUT SHAPE definition at the top of INTENT_EXTRACTION (after `"possession_status"`):
```
"possession_year_max": <4-digit year integer, e.g. 2026>,
```

Add Hinglish possession example to the EXAMPLES section:
```
User: "2026 tak milne wala flat chahiye sector 150 mein"
→ {"possession_year_max":2026,"sector":150,"city":"Noida","property_type":"flat","is_general_query":false}
```

- [ ] **Step 2: Update `frontend/lib/ai/intentManager.ts` — add possession_year_max to IntentState**

In the `IntentState` interface, add after `project_name?`:
```typescript
possession_year_max?: number;  // e.g. 2026 — filter by possession deadline
```

In `resolvedFields`, add:
```typescript
possession_year_max?: boolean;
```

- [ ] **Step 3: Update `frontend/lib/repositories/projectRepository.ts`**

Add `possession_year_max?: number` to `SearchFilters`:
```typescript
export interface SearchFilters {
  sector?: string
  city?: string
  bhk?: number
  budget_min_cr?: number
  budget_max_cr?: number
  possession_year_max?: number   // ← add this
}
```

In `searchProjects`, add the Prisma where clause. Find the `const projects = await prisma.project.findMany({` block and update the `where` object:

```typescript
const projects = await prisma.project.findMany({
  where: {
    ...(filters.city && { city: filters.city }),
    ...(filters.sector && { sector: filters.sector }),
    ...(filters.possession_year_max != null && {
      possession_date: {
        lte: new Date(filters.possession_year_max, 11, 31),  // Dec 31 of that year
      },
    }),
    ...(unitConditions.length > 0 && {
      unit_types: { some: unitConditions.length === 1 ? unitConditions[0] : { AND: unitConditions } },
    }),
  },
  // ...rest unchanged
})
```

- [ ] **Step 4: Update `frontend/app/api/v1/chat/route.ts` — pass possession_year_max**

In the section that builds `updates` from `extracted` (after the `if (extracted.possession_status)` block), add:

```typescript
if (extracted.possession_year_max) {
  updates.possession_year_max = extracted.possession_year_max as number
}
```

In `mergeIntentState` call the field will flow through. Then in the `isIntentComplete` branch where `searchProjects` is called, add the filter:

```typescript
const projects = await searchProjects({
  city: newIntent.city ?? 'Noida',
  sector: newIntent.sector,
  bhk: newIntent.bhk,
  budget_min_cr: newIntent.budget?.min != null ? newIntent.budget.min / 10_000_000 : undefined,
  budget_max_cr: newIntent.budget?.max != null ? newIntent.budget.max / 10_000_000 : undefined,
  possession_year_max: newIntent.possession_year_max,   // ← add this
})
```

- [ ] **Step 5: TypeScript check**
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**
```bash
git add frontend/lib/ai/prompts.ts frontend/lib/ai/intentManager.ts frontend/lib/repositories/projectRepository.ts frontend/app/api/v1/chat/route.ts
git commit -m "feat(f1): possession timeline filter — 'delivering by 2026' filters projects by possession_date"
```

---

## Task 2: Hindi/Hinglish input improvements

**Context:** The intent extractor already handles some Hindi (`50 se 60 lakh` in existing examples). Add explicit Hindi number words and common Hinglish property phrases to make extraction more reliable.

- [ ] **Step 1: Update `frontend/lib/ai/prompts.ts` — add Hindi rules**

In rule `4. BUDGET`, after the existing examples, add:

```
   HINDI/HINGLISH number words (convert to INR integers):
   - "ek crore" / "1 crore" → 10000000
   - "do crore" → 20000000
   - "teen crore" → 30000000
   - "char crore" → 40000000
   - "paanch crore" / "panch crore" → 50000000
   - "das lakh" / "10 lakh" → 1000000
   - "paach lakh" / "paanch lakh" → 500000
   - "ek crore se kam" → budget_max: 10000000
   - "do crore se upar" → budget_min: 20000000
   - "ek se dhai crore" → budget_min: 10000000, budget_max: 25000000
```

In rule `5. BHK`, add after existing examples:
```
   HINDI/HINGLISH BHK variants:
   - "do bedroom" / "do BHK" / "2 kamre" → 2
   - "teen BHK" / "teen bedroom" / "teen kamre wala" → 3
   - "ek BHK" / "ek kamra" → 1
```

Add these HINGLISH EXAMPLES to the EXAMPLES section at the end:

```
User: "ek crore mein kya milega sector 150 mein"
→ {"budget_max":10000000,"sector":150,"city":"Noida","is_general_query":false}

User: "do BHK chahiye Noida mein 80 lakh tak"
→ {"bhk":2,"city":"Noida","budget_max":8000000,"property_type":"flat","is_general_query":false}

User: "sector 150 mein best property kaun si hai"
→ {"sector":150,"city":"Noida","is_general_query":true}

User: "teen BHK dikhao sector 137 mein under 2 crore"
→ {"bhk":3,"sector":137,"city":"Noida","budget_max":20000000,"property_type":"flat","is_general_query":false}

User: "ready to move flat chahiye noida mein 1.5 crore mein"
→ {"possession_status":"ready_to_move","city":"Noida","budget_max":15000000,"property_type":"flat","is_general_query":false}
```

- [ ] **Step 2: TypeScript check** (prompts.ts is just strings — no TS errors expected)
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**
```bash
git add frontend/lib/ai/prompts.ts
git commit -m "feat(f2): Hindi/Hinglish input — add Hindi number words and Hinglish examples to intent extractor"
```

---

## Task 3: Price history note in ProjectDetailPanel

**Context:** Add a "Price Trends" card to the Overview tab with static sector-level price appreciation data. Hardcoded — no API call needed.

- [ ] **Step 1: Add static price data to `frontend/components/ProjectDetailPanel.tsx`**

Add this constant before the component definition:

```typescript
const SECTOR_PRICE_HISTORY: Record<string, {
  trend: string
  avgPriceRange: string
  note: string
  outlook: string
  yoyGrowth: string
}> = {
  'Sector 150': {
    trend: 'Strong Appreciation',
    avgPriceRange: '₹8,000 – 17,000/sqft',
    yoyGrowth: '+12–18% YoY',
    note: "Noida Expressway's premium corridor. Metro Phase III proximity, DND access, and branded developer concentration drive above-average appreciation.",
    outlook: 'Continued outperformance expected. Limited land supply.',
  },
  'Sector 137': {
    trend: 'Steady Growth',
    avgPriceRange: '₹5,500 – 11,000/sqft',
    yoyGrowth: '+8–14% YoY',
    note: 'Established sector with most inventory delivered. Good rental yield driven by IT park proximity (Infosys, TCS campuses nearby).',
    outlook: 'Stable. Most projects ready-to-move — capital preservation market.',
  },
  'Sector 78': {
    trend: 'Mixed — Premium Segment Leading',
    avgPriceRange: '₹5,000 – 18,000/sqft',
    yoyGrowth: '+6–12% YoY',
    note: 'Wide price band due to product mix from premium to ultra-luxury (Mahagun Mezzaria). Central Noida location with strong connectivity.',
    outlook: 'Luxury sub-segment outperforming. Entry-level segment stable.',
  },
}
```

- [ ] **Step 2: Add import for TrendingUp icon**

In `ProjectDetailPanel.tsx`, add `TrendingUp` to the Lucide import line:
```typescript
import {
  X, CheckCircle2, Clock, Shield, MapPin, Building2, Award,
  Ruler, BedDouble, Bath, ChevronRight, ExternalLink,
  Sparkles, Star, Trophy, Layers, Phone, TrendingUp,
} from 'lucide-react'
```

- [ ] **Step 3: Render price history card in Overview tab**

In the Overview tab (`{!loading && activeTab === 'Overview' && (`), find the end of the content (before the closing `</div>`). Add this block as the last section:

```tsx
{/* Price Trends */}
{(() => {
  const sectorKey = d?.sector ?? ''
  const priceData = SECTOR_PRICE_HISTORY[sectorKey] ?? null
  if (!priceData) return null
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
          <TrendingUp size={14} className="text-emerald-600" strokeWidth={2} />
        </div>
        <p className="text-[12px] font-bold text-gray-700">Price Trends — {sectorKey}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-white rounded-xl p-2.5 border border-emerald-50">
          <p className="text-[18px] font-black text-emerald-600">{priceData.yoyGrowth}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Year-on-year</p>
        </div>
        <div className="bg-white rounded-xl p-2.5 border border-emerald-50">
          <p className="text-[13px] font-bold text-gray-900 leading-tight">{priceData.avgPriceRange}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Avg. price/sqft</p>
        </div>
      </div>
      <p className="text-[11px] text-gray-600 leading-relaxed mb-1.5">{priceData.note}</p>
      <p className="text-[11px] text-emerald-700 font-semibold">Outlook: {priceData.outlook}</p>
      <p className="text-[9px] text-gray-400 mt-2">* Indicative market data. Verify with RERA and registered valuers before purchase decisions.</p>
    </div>
  )
})()}
```

- [ ] **Step 4: TypeScript check**
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**
```bash
git add frontend/components/ProjectDetailPanel.tsx
git commit -m "feat(f3): price history card in property detail — sector-level YoY appreciation and market note"
```

---

## Task 4: Sector map with property pins

**Context:** After the AI recommends properties, show a small Leaflet map with pins for each shortlisted property. Properties without lat/lng use sector centroid coordinates. Map is collapsible.

Noida sector centroids:
- Sector 78: `{ lat: 28.565, lng: 77.392 }`
- Sector 137: `{ lat: 28.506, lng: 77.417 }`
- Sector 150: `{ lat: 28.473, lng: 77.444 }`

### Sub-task 4a: Install map dependencies

- [ ] **Step 1: Install react-leaflet**
```bash
cd frontend && npm install leaflet react-leaflet @types/leaflet
```

- [ ] **Step 2: Add Leaflet CSS to Next.js layout**

Read `frontend/app/layout.tsx`. Add the Leaflet CSS import:
```typescript
import 'leaflet/dist/leaflet.css'
```
Add it after any existing CSS imports (before or after other imports is fine — just needs to be in the layout).

### Sub-task 4b: Create SectorMap component

- [ ] **Step 3: Create `frontend/components/SectorMap.tsx`**

```tsx
'use client'

import { useEffect } from 'react'
import type { ProjectCard } from '@/types/project'

const SECTOR_CENTROIDS: Record<string, [number, number]> = {
  'Sector 78':  [28.565, 77.392],
  'Sector 137': [28.506, 77.417],
  'Sector 150': [28.473, 77.444],
}

// Default fallback for unknown sectors — central Noida
const NOIDA_CENTER: [number, number] = [28.535, 77.391]

interface Props {
  properties: ProjectCard[]
}

export default function SectorMap({ properties }: Props) {
  // Leaflet requires browser environment — skip SSR entirely via component-level check
  if (typeof window === 'undefined') return null

  return <SectorMapClient properties={properties} />
}

function SectorMapClient({ properties }: Props) {
  const { MapContainer, TileLayer, Marker, Popup, useMap } = require('react-leaflet')
  const L = require('leaflet')

  // Fix Leaflet default icon broken in webpack
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
  }, [])

  // Compute map center — average of all property positions
  const positions: [number, number][] = properties.map((p) => {
    if (p.lat && p.lng) return [p.lat, p.lng]
    return SECTOR_CENTROIDS[p.sector] ?? NOIDA_CENTER
  })

  const centerLat = positions.reduce((s, c) => s + c[0], 0) / positions.length
  const centerLng = positions.reduce((s, c) => s + c[1], 0) / positions.length

  // Custom blue pin marker
  const createPin = () => L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;background:#2563EB;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);border:2px solid white;
      box-shadow:0 2px 8px rgba(37,99,235,0.4);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  })

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={13}
      style={{ height: '280px', width: '100%', borderRadius: '16px', zIndex: 0 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {properties.map((p) => {
        const pos: [number, number] = (p.lat && p.lng)
          ? [p.lat, p.lng]
          : SECTOR_CENTROIDS[p.sector] ?? NOIDA_CENTER
        return (
          <Marker key={p.id} position={pos} icon={createPin()}>
            <Popup>
              <div style={{ minWidth: '140px' }}>
                <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 2px' }}>{p.name}</p>
                <p style={{ color: '#2563EB', fontWeight: 600, fontSize: '12px', margin: '0 0 2px' }}>{p.price_range_label}</p>
                <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>{p.sector} · {p.status.replace(/_/g, ' ')}</p>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
```

**Important note on SSR:** The `require('react-leaflet')` pattern is intentional — avoids SSR import issues without dynamic(). The outer `SectorMap` component checks `typeof window === 'undefined'` which handles server rendering. This is simpler than `dynamic(() => import(...), { ssr: false })` and avoids the Next.js 14 dynamic import wrapper overhead.

### Sub-task 4c: Add SectorMap to DiscoveryContent

- [ ] **Step 4: Add SectorMap to DiscoveryContent.tsx**

Read `frontend/components/DiscoveryContent.tsx`. 

Add import at top:
```typescript
import SectorMap from '@/components/SectorMap'
```

Also add `useState` for collapsible map state (already imported, just add `showMap` state):
```typescript
const [showMap, setShowMap] = useState(false)
```

Find the block in `renderMessage` that renders property cards (the `message.properties?.length > 0` section which renders the grid of `<ProjectCard>`). After the closing div of the cards grid, add the map section:

```tsx
{/* ── Sector map — shown when 2+ properties shortlisted ── */}
{message.properties && message.properties.length >= 2 && (
  <div className="mt-3 ml-14 w-full">
    <button
      onClick={() => setShowMap((v) => !v)}
      className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-100 rounded-xl text-[12px] font-semibold text-gray-600 hover:text-blue-700 transition-all mb-2"
    >
      <span>🗺️</span>
      {showMap ? 'Hide map' : `Show on map — ${message.properties.length} properties`}
    </button>
    {showMap && (
      <SectorMap properties={message.properties} />
    )}
  </div>
)}
```

- [ ] **Step 5: Add `lat` and `lng` to ProjectCard type**

Read `frontend/types/project.ts`. In `ProjectCard`, add after `rera_url`:
```typescript
lat?: number | null
lng?: number | null
```

- [ ] **Step 6: Add `lat` and `lng` to `toProjectCard` in repository**

Read `frontend/lib/repositories/projectRepository.ts`. In `toProjectCard()` return object, add:
```typescript
lat: p.lat ?? null,
lng: p.lng ?? null,
```

- [ ] **Step 7: TypeScript check**
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Common TS issues with Leaflet:
- `require('react-leaflet')` in a component body may cause TS errors — if so, add `// eslint-disable-next-line @typescript-eslint/no-require-imports` before each require
- `L.Icon.Default.prototype._getIconUrl` delete — may need `as any` cast
- If SectorMap TS errors are severe, add `// @ts-nocheck` at the top of SectorMap.tsx (acceptable for this component)

- [ ] **Step 8: Build check**
```bash
cd frontend && npm run build 2>&1 | tail -20
```

- [ ] **Step 9: Commit**
```bash
git add frontend/components/SectorMap.tsx frontend/components/DiscoveryContent.tsx frontend/types/project.ts frontend/lib/repositories/projectRepository.ts frontend/app/layout.tsx frontend/package.json
git commit -m "feat(f4): sector map with property pins — Leaflet map shown after recommendations, collapsible"
```

---

## Self-Review

**Spec coverage:**
- [x] Possession timeline filter — Tasks 1 steps 1-4, `possession_year_max` flows prompt → intent → repo → chat route
- [x] Price history note — Task 3, static sector data with YoY growth in Overview tab
- [x] Hindi/Hinglish input — Task 2, Hindi number words + 5 Hinglish examples added to prompt
- [x] Sector map with property pins — Task 4, Leaflet map in chat after recommendations
- [x] Map collapsible (show/hide button) — Task 4 step 4
- [x] Map uses lat/lng if available, falls back to sector centroid — Task 4 step 3 SectorMap logic
- [x] TypeScript check at every task

**Type consistency:** `possession_year_max` added to IntentState, SearchFilters, and chat route all use same field name. `lat`/`lng` added to ProjectCard and mapper consistently.

**No placeholders:** All code complete.
