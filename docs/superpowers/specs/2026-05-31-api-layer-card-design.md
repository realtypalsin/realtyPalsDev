# API Layer + ProjectCard Design
**Date:** 2026-05-31  
**Status:** Approved  
**Scope:** Wire the app end-to-end — API routes, chat engine, ProjectCard component, type alignment

---

## Problem

The frontend is fully built. The database is seeded with 7 Sector 150 projects. The app is dead because zero API routes exist. The frontend calls `/api/v1/chat`, `/api/v1/projects`, `/api/v1/sectors`, and `/api/v1/chat/intent` — none of which exist. `types/property.ts` is misaligned with the new normalized schema. `lib/ai/propertyMatcher.ts` calls `prisma.property` which no longer exists. `NEXT_PUBLIC_API_URL` is missing from `.env`.

---

## What We're Building

1. **4 API routes** that power the entire app
2. **1 repository** for DB queries (`server/repositories/projectRepository.ts`)
3. **1 new type file** (`types/project.ts`) aligned with the normalized schema
4. **1 new component** (`components/ProjectCard.tsx`) — Card C editorial style, Phosphor Duotone icons
5. **Stale code fixes** — propertyMatcher, env.ts, suggestion chips, .env
6. **1 package install** — `@phosphor-icons/react`

---

## Architecture

```
Browser (DiscoveryContent)
  │
  ├─ POST /api/v1/chat          ← main chat loop
  ├─ DELETE /api/v1/chat/intent ← reset session
  ├─ GET  /api/v1/projects      ← search projects
  └─ GET  /api/v1/sectors       ← list sectors (static V1)
         │
         ├─ lib/db.ts           ← Prisma singleton
         ├─ lib/ai/groq.ts      ← GROQ client singleton
         ├─ lib/ai/prompts.ts   ← existing prompts (unchanged)
         ├─ lib/ai/intentManager.ts ← existing (unchanged)
         └─ server/repositories/projectRepository.ts ← DB queries
```

---

## API Routes

### `POST /api/v1/chat`

**Request:**
```typescript
{
  message: string
  quickReply?: { field: string; value: string }
}
// Header: X-User-Id: string
```

**Response:**
```typescript
{
  message: string                  // AI text response
  showRecommendations: boolean
  projects?: ProjectCard[]         // populated when showRecommendations = true
  chatPhase: 'DISCOVERY' | 'SHORTLIST' | 'ADVISOR'
  next_expected_field?: string
  resolvedFields?: Record<string, boolean>
  intent?: {
    completenessScore: number
    bhk?: number
    budget?: { min?: number; max?: number }
    purpose?: string
    is_general_query?: boolean
  }
}
```

**Flow:**
1. Read `X-User-Id` header (required — 400 if missing)
2. Upsert `UserMemory` row for user (load existing intent fields)
3. Call GROQ with `INTENT_EXTRACTION` prompt → parse JSON
4. Merge extracted intent with stored intent via `mergeIntentState()`
5. Save merged intent back to `UserMemory`
6. Decide path:
   - `is_general_query: true` → call GROQ with `GENERAL_QUERY` prompt, no DB query
   - `is_general_query: false` + `completenessScore >= 50` + sector known → query DB → call GROQ with `ADVISOR_MODE` prompt
   - Otherwise → call GROQ with `QUESTION_GENERATION` prompt
7. Return structured response

**Intent → DB mapping:**
- `intent.sector` (number e.g. `150`) → `project.sector = "Sector 150"`
- `intent.city` → `project.city` (default `"Noida"` for V1)
- `intent.bhk` → `unit_types.some({ bhk: intent.bhk })`
- `intent.budget.max` (INR) → `unit_types.some({ price_min_cr: { lte: budget.max / 10_000_000 } })`
- `intent.budget.min` (INR) → `unit_types.some({ price_max_cr: { gte: budget.min / 10_000_000 } })`

---

### `DELETE /api/v1/chat/intent`

Deletes the `UserMemory` row for the given `X-User-Id`. Returns `{ ok: true }`. Used by "New Chat" reset flow.

---

### `GET /api/v1/projects`

**Query params:** `sector?`, `bhk?`, `min_price?`, `max_price?`  
**Response:** `{ projects: ProjectCard[] }`

Calls `projectRepository.searchProjects()`. Used by the discover page's `loadProperties()` flow.

---

### `GET /api/v1/sectors`

**Response:**
```typescript
{ sectors: [{ name: "Sector 150", city: "Noida" }] }
```

Static for V1. No DB query. Exists so the frontend `loadSectors()` call doesn't 404.

---

## Repository — `server/repositories/projectRepository.ts`

Single function: `searchProjects(filters)` — queries `projects` with `builder`, `unit_types`, `amenities`, `connectivity` included. Transforms the Prisma result into `ProjectCard[]`.

**Computed fields on `ProjectCard`:**
- `price_min_cr` = min of `unit_types[].price_min_cr` (ignoring nulls)
- `price_max_cr` = max of `unit_types[].price_max_cr` (ignoring nulls)
- `price_range_label` = e.g. `"₹1.52 – 4.82 Cr"` (formatted)
- `top_amenities` = first 6 amenities ordered by category priority: sports → lifestyle → wellness → kids
- `top_connectivity` = metro + airport + road entries only (max 3)

---

## Types — `types/project.ts`

```typescript
export interface ProjectCard {
  id: string
  slug: string
  name: string
  tagline?: string | null
  builder: { name: string; slug: string }
  rera_number?: string | null
  sector: string
  city: string
  address?: string | null
  land_area_acres?: number | null
  total_towers?: number | null
  status: 'under_construction' | 'ready_to_move' | 'new_launch'
  possession_label?: string | null
  architect?: string | null
  interior_designer?: string | null
  design_theme?: string | null
  marketing_claims: string[]
  hero_image_url?: string | null
  price_min_cr?: number | null
  price_max_cr?: number | null
  price_range_label: string         // "₹1.52 – 4.82 Cr" or "Price on request"
  unit_types: UnitTypeSummary[]
  top_amenities: AmenitySummary[]   // max 6, shown as tags
  top_connectivity: ConnSummary[]   // max 3, shown in footer
}

export interface UnitTypeSummary {
  name: string
  bhk: number
  super_area_sqft?: number | null
  carpet_area_sqft?: number | null
  price_min_cr?: number | null
  price_max_cr?: number | null
  price_label?: string | null
}

export interface AmenitySummary {
  name: string
  category: 'sports' | 'lifestyle' | 'wellness' | 'kids' | 'security' | 'parking'
}

export interface ConnSummary {
  type: 'metro' | 'road' | 'school' | 'hospital' | 'mall' | 'landmark' | 'airport' | 'university'
  name: string
  distance_km?: number | null
}
```

The existing `types/property.ts` is left in place but `DiscoveryContent` is updated to accept `ProjectCard[]` instead of `Property[]` for the `properties` prop. It renders `<ProjectCard>` instead of `<PropertyCard>`. The old `PropertyCard` component is not deleted — it stays for any other consumer — but is no longer rendered in the main chat flow.

---

## Component — `components/ProjectCard.tsx`

**Props:** `{ project: ProjectCard; userId: string | null }`

**Layout (Card C, dark editorial):**

```
┌──────────────────────────────────────┐
│  [Hero image / dark gradient fallback]│
│  [Under Construction badge TL]        │
└──────────────────────────────────────┘
  Header row: [Project Name]   [RERA chip]
  Builder · Sector · City
  [Architect credit line — only if present]
  
  ₹X.XX – Y.YY Cr                       ← price-value (28px bold)
  2BHK · 3BHK · 4BHK                    ← configs line (11px muted)
  
  ── divider ──
  
  [tag] [tag] [tag] [tag] [tag] [tag]    ← top_amenities as pills
  
  🚇 Metro name   ✈ Airport   🛣️ Road   ← top_connectivity
```

**Icon mapping (Phosphor Duotone):**

| Context | Icon |
|---|---|
| Under Construction | `ph-duotone ph-clock-countdown` |
| Ready to Move | `ph-duotone ph-check-circle` |
| RERA | `ph-duotone ph-seal-check` |
| Metro | `ph-duotone ph-train-subway` |
| Airport | `ph-duotone ph-airplane-takeoff` |
| Road/Expressway | `ph-duotone ph-path` |
| Sports | `ph-duotone ph-soccer-ball` |
| Pool/Lifestyle | `ph-duotone ph-swimming-pool` |
| Wellness | `ph-duotone ph-heart` |
| Green/Nature | `ph-duotone ph-tree` |
| Golf | `ph-duotone ph-golf` |
| Kids | `ph-duotone ph-baby` |
| Architect | `ph-duotone ph-paint-brush-broad` |

**Amenity category → icon:** sports → `soccer-ball`, lifestyle → `buildings`, wellness → `leaf`, kids → `baby`

**States:**
- Default: dark card, `#0f0f0f` background, `#191919` border
- Hover: `translateY(-5px)`, deeper shadow
- No saved/shortlist state in V1 (per CLAUDE.md — requires auth)

---

## Stale Code Fixes

### 1. `lib/db.ts` (new file)
Prisma singleton to prevent connection pool exhaustion in Next.js dev mode.

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### 2. `lib/ai/groq.ts` (new file)
Groq client singleton.

```typescript
import Groq from 'groq-sdk'
export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
```

### 3. `.env` additions
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

### 4. `lib/ai/propertyMatcher.ts`
Replace `prisma.property` with `prisma.project`. Update return type to `ProjectCard`. This file becomes a thin wrapper calling `projectRepository.searchProjects()`.

### 5. `components/DiscoveryContent.tsx` — suggestion chips
Replace Gurgaon/Greater Noida chips with Sector 150-specific ones:
```
'Show me 3BHK apartments in Sector 150'
'Best luxury projects under 3 Crore'
'Compare ATS vs Godrej in Sector 150'
'Which projects have golf course views?'
```

---

## Package to Install

```bash
npm install @phosphor-icons/react
```

---

## What Is NOT Built

- Authentication (Better Auth) — future phase
- Save property (requires auth)
- Callback / site visit requests
- PostHog analytics events
- `app/compare`, `app/saved`, `app/value-estimator` pages — stubs remain
- Multi-city support (Gurgaon, Bangalore)
- pgvector / embeddings search

---

## Success Criteria

1. User opens `/discover`, types "3BHK in Sector 150 under 3 crore" → sees ProjectCard results
2. Chat correctly extracts intent, stores in `UserMemory`, queries DB
3. All 7 seeded projects are searchable
4. ProjectCard shows: name, builder, price range, configs line, top 6 amenity tags, top 3 connectivity items with Phosphor Duotone icons
5. "New Chat" resets the intent in DB
6. `/api/v1/sectors` returns Sector 150 (no 404)
7. No `prisma.property` references remain
8. `npm run dev` starts without `NEXT_PUBLIC_API_URL` error
