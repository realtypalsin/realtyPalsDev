# Phase 4 Implementation Plan — DB-Driven Config + Progressive Chips

**Status:** Planning
**Target:** Dynamic chip options from real database inventory, centralized config module

## Overview

**Goal:** Replace 8 hardcoded lists with database-driven aggregates; centralize scattered config settings.

**Files to Create:**
- `backend/src/lib/config.ts` (NEW)
- `backend/src/lib/discovery/chipInventory.ts` (NEW)

**Files to Modify:**
- `backend/src/lib/discovery/conversationEngine.ts` - getDiscoveryChips, getClarifyingChips
- `backend/src/lib/discovery/confidence.ts` - buildClarificationOptions
- `backend/src/lib/ai/prompts/base.ts` - blocked builders injection
- `backend/src/routes/chat.ts` - call getChipInventory in prompt context
- `backend/src/lib/discovery/constants.ts` - keep SECTOR_ADJACENCY, add city dimension

---

## 4.1: Create Config Module

**File:** `backend/src/lib/config.ts`

Centralize all scattered config values into one module. Env-overridable.

```typescript
// AI Models
export const MODELS = {
  MAIN: process.env.AI_MAIN_MODEL || 'gpt-4o',
  FALLBACK: process.env.AI_FALLBACK_MODEL || 'gpt-4o-mini',
  GROQ_SMART: process.env.GROQ_SMART_MODEL || 'mixtral-8x7b-32768',
}

// Financial
export const FINANCIAL = {
  EMI_RATE: parseFloat(process.env.EMI_RATE || '8.75'),
  LOAN_TENURE_YEARS: parseInt(process.env.LOAN_TENURE || '20', 10),
}

// Discovery
export const DISCOVERY = {
  DEFAULT_CITY: process.env.DEFAULT_CITY || 'Noida',
  SAFE_TOKEN_CEILING: parseInt(process.env.SAFE_TOKEN_CEILING || '2000', 10),
  MAX_TOKENS_RESPONSE: parseInt(process.env.MAX_TOKENS_RESPONSE || '1500', 10),
  CHIP_INVENTORY_CACHE_MINUTES: 10,
}
```

**Exports:**
- Replaces hardcoded values currently in:
  - `backend/src/lib/ai/intent.ts:100` (gpt-4o)
  - `backend/src/lib/ai/openai.ts:247` (gpt-4o-mini)
  - `backend/src/lib/ai/groq.ts:24,95` (groq model + mixtral)
  - `backend/src/routes/chat.ts:614` (EMI 8.75%)
  - `backend/src/lib/ai/openai.ts:169` (EMI 8.75%)
  - `backend/src/lib/ai/prompts/base.ts:215` (tenure 20)

---

## 4.2: Create Chip Inventory Module

**File:** `backend/src/lib/discovery/chipInventory.ts`

Query database for real inventory. Cache 10 min.

```typescript
export interface ChipInventory {
  sectors: string[] // top sectors by project count
  budgetBuckets: BudgetBucket[] // quartile-based buckets
  bhkOptions: number[] // distinct BHK values
}

export interface BudgetBucket {
  label: string // "Under ₹1.5 Cr", "₹1.5–2.5 Cr", etc
  min?: number
  max?: number
}

export async function getChipInventory(city: string = 'Noida'): Promise<ChipInventory> {
  // Check cache first (10-minute TTL)
  
  // Query 1: Top sectors by project count
  const sectors = await prisma.project.findMany({
    where: { city: { equals: city, mode: 'insensitive' } },
    select: { sector: true },
    distinct: ['sector'],
  })
  // Group by sector, count, sort desc, take top 5
  
  // Query 2: Price distribution from unit_types
  const prices = await prisma.unitType.findMany({
    where: { project: { city: { equals: city, mode: 'insensitive' } } },
    select: { price_min_cr: true },
  })
  // Compute quartiles, build budget labels
  
  // Query 3: Distinct BHK values
  const bhk = await prisma.unitType.findMany({
    where: { project: { city: { equals: city, mode: 'insensitive' } } },
    select: { bhk: true },
    distinct: ['bhk'],
  })
  // Sort numerically, return [2, 3, 4] or whatever exists
  
  // Cache and return
}
```

---

## 4.3: Update Conversation Engine

**File:** `backend/src/lib/discovery/conversationEngine.ts`

Remove static lists. Call `getChipInventory()` in `getDiscoveryChips()`.

**Changes:**

1. Delete lines 125-136 (static lists)
2. Update `getDiscoveryChips()` (currently returns []):
   ```typescript
   async function getDiscoveryChips(intent: Intent, city: string = 'Noida'): ChipAction[] {
     const inventory = await getChipInventory(city)
     const chips: ChipAction[] = []
     
     // Heading: "Popular sectors in Noida"
     const sectorGroup: ChipGroup = { 
       id: 'popular_sectors', 
       label: `Popular sectors in ${city}`,
       order: 0, 
       emphasis: 'primary' 
     }
     
     for (const sector of inventory.sectors.slice(0, 3)) {
       const projectCount = /* query count */ 
       chips.push(chip(
         `sector_${sector.replace(/\s/g, '_')}`,
         'INTENT_PATCH', `${sector} (${projectCount} projects)`, '📍',
         { patch: { sector }, label: sector },
         1,
         sectorGroup
       ))
     }
     
     // Similar for budget and BHK groups
     
     // Journey starters
     return chips
   }
   ```
3. Update `getClarifyingChips()` to call `getChipInventory()` for BHK/budget/sector options instead of static lists.

**Signature Change:**
```typescript
async function getClarifyingChips(
  intent: Intent,
  missingFields: string[],
  results: ScoredProject[],
  chatHistory: ...,
  city: string = 'Noida'
): Promise<ChipAction[]> {
  // Now async, needs city
}
```

---

## 4.4: Update Confidence Module

**File:** `backend/src/lib/discovery/confidence.ts`

Replace hardcoded chip lists with dynamic ones from inventory.

**Changes:**

1. Delete lines 27-63 (all static chip lists)
2. Update `buildClarificationOptions()` to accept `city` parameter
3. Call `getChipInventory(city)` to get real options
4. Build chips dynamically from inventory

---

## 4.5: Update Blocked Builders

**File:** `backend/src/lib/ai/prompts/base.ts`

Query database instead of hardcoding.

**Current (line 112):**
```
BLOCKED BUILDERS ... Supertech Limited, Amrapali Group, Unitech Group, Wave Infratech
```

**New approach:**
1. At prompt-build time (before injecting base.ts), query:
   ```sql
   SELECT name, legal_flag FROM builders WHERE legal_flag IS NOT NULL
   ```
2. Inject into prompt:
   ```
   BLOCKED BUILDERS (from database):
   {{#blockedBuilders}}
   - {{name}}: {{legal_flag}}
   {{/blockedBuilders}}
   ```
3. Remove hardcoded list from base.ts

**Where to wire:** `backend/src/routes/chat.ts:420-450` (prompt context build)

---

## 4.6: Update Chat Route

**File:** `backend/src/routes/chat.ts`

Wire `getChipInventory()` into conversation flow.

**Changes:**

1. At response build time (before calling conversationEngine):
   ```typescript
   const inventory = await getChipInventory(discoveryResult.city || 'Noida')
   // Pass to conversationEngine
   ```

2. Pass city throughout:
   ```typescript
   const conversationState = computeConversationState(
     intent,
     intentState,
     discoveryResult,
     { chips: await getDiscoveryChips(intent, city) },
     city
   )
   ```

---

## 4.7: Multi-City Prep

**Files:** `backend/src/lib/discovery/constants.ts`, `backend/src/lib/discovery/types.ts`

**Changes:**

1. Keep `SECTOR_ADJACENCY` as is (Noida sectors only for now)
2. In code comments, mark the one place city defaults to 'Noida': `backend/src/lib/config.ts`
3. Add TODO: "Restructure SECTOR_ADJACENCY to Record<city, adjacencyMap> when scaling to city #2"
4. Ensure all discovery functions accept city parameter (done in phases 1-3)

---

## Implementation Order

1. Create `config.ts` — centralizes model IDs, EMI, tenure
2. Create `chipInventory.ts` — database-driven options
3. Update `conversationEngine.ts` — wire getChipInventory
4. Update `confidence.ts` — dynamic chip options
5. Update `base.ts` + `chat.ts` — blocked builders from DB
6. Test end-to-end

---

## Verification Checklist

- [ ] Chips returned by API match live DB counts (spot-check)
- [ ] "Show me sector 10" returns disambiguation chips with real project counts
- [ ] Budget chips reflect actual price distribution in DB
- [ ] BHK chips reflect actual distinct BHK values in DB
- [ ] Blocked builders list pulled from `legal_flag` in DB
- [ ] Build + TypeScript clean
- [ ] Env overrides work (AI_MAIN_MODEL, EMI_RATE, etc)

---

## Open Questions

- Cache invalidation: invalidate on project upsert or let 10-min TTL handle it?
- Budget buckets: quartiles or fixed ranges? Proposed: detect from live data
- Journey starters: "Ready-to-move options", "Best under ₹2 Cr", "Top builders in Sector 75" — all from real inventory?
