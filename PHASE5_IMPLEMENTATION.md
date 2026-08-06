# Phase 5: Ranking Implementation Summary

## Overview
Phase 5 implements deterministic ranking profiles, data-driven sector tiers, market tier segmentation, and curated ranking helpers for the RealtyPals discovery engine. Builds on Phase 0 (query classification) where `queryKind=RANKING` is now available.

## Files Created

### 1. `backend/src/lib/discovery/rankingProfiles.ts`
- **Ranking Profiles**: 6 deterministic profiles (overall, value, trust, speed, premium, family)
- **Profile Definition**: scoreWeights, sort order, filters
- **Phrasing Parsing**: `inferRankingProfile()` detects user intent from message text
- **Basis Statement**: `getRankingBasis()` provides human-readable explanation for each profile

**Key Functions:**
```typescript
inferRankingProfile(userMessage)      // Parse phrasing → profile
getRankingBasis(profile)              // Return ranking explanation
```

**Patterns Detected:**
- Value: "best value", "budget friendly", "best deal", "affordable"
- Speed: "fastest", "quickest", "possession", "ready soon"
- Trust: "safest", "trusted", "credai", "builder track record"
- Family: "families", "schools", "children", "family-friendly"
- Premium: "luxury", "premium", "high-end", "expensive"
- Overall: "best", "top", "highest" (default)

---

### 2. `backend/src/lib/discovery/sectorTiers.ts`
- **Data-Driven Tier Computation**: Based on sector_intelligence
- **Tier Logic**:
  - **Tier 1 (Premium)**: Established + price_5yr_cagr_pct ≥ 5%
  - **Tier 2 (Growth)**: Developing + price_5yr_cagr_pct ≥ 3%
  - **Tier 3 (Budget)**: Everything else
- **Tier Boost**: Applied in scoreProject() (+10pts T1, +5pts T2, 0pts T3)

**Key Functions:**
```typescript
computeSectorTier(sectorIntelligence)  // → tier, label, reasons
getTierBoost(tier)                     // → points (10|5|0)
```

**Output Example:**
```json
{
  "city": "Noida",
  "sector": "Sector 150",
  "tier": "tier1",
  "label": "Premium",
  "reasons": ["Established sector with strong price appreciation (≥5% CAGR)"],
  "sector_stage": "established",
  "price_5yr_cagr_pct": 6
}
```

---

### 3. `backend/src/lib/discovery/marketTiers.ts`
- **Market Tier Segmentation** by project price range:
  - Budget: ₹0–50L
  - Mid: ₹50L–1.5Cr
  - Premium: ₹1.5–4Cr
  - Luxury: ₹4Cr+
- **Market Bias**: When user provides budget, bias to matching tier (+20pts exact, +5pts adjacent)
- **Visible on Results**: market_tier tag included in ScoredProject

**Key Functions:**
```typescript
getMarketTier(lowestPriceCr)           // → tier
getMarketTierBias(projectTier, budget) // → points (20|5|0)
getMarketTierLabel(tier)               // → "Budget" | "Mid-range" | etc.
getMarketTierRange(tier)               // → "₹0–50L" | etc.
```

---

## Files Modified

### 1. `backend/src/lib/discovery/queryClassifier.ts`
**Changes:**
- Extended RANKING detection pattern to include value/trust/speed/family keywords
- Added `rankingProfile?` field to QueryClassification interface
- Call `inferRankingProfile()` when queryKind=RANKING to populate the profile

**Result:**
```typescript
{
  queryKind: 'RANKING',
  rankingProfile: 'value', // inferred from phrasing
  confidence: 'HIGH',
  reason: 'Superlative + scope pattern'
}
```

### 2. `backend/src/lib/discovery/scoring.ts`
**Changes:**
- Added `sectorTier?: SectorTier` parameter to scoreProject()
- Import getTierBoost() and getMarketTier/Bias functions
- Apply sector tier boost before final budget penalty
- Apply market tier bias when budgetMax is set

**New Logic:**
```typescript
// Sector tier boost (data-driven)
if (sectorTier) {
  score += getTierBoost(sectorTier) // +10|+5|0
}

// Market tier bias (when budget given)
if (intent.budgetMax) {
  const projectTier = getMarketTier(lowestPrice)
  const bias = getMarketTierBias(projectTier, intent.budgetMax)
  score += bias // +20|+5|0
}
```

### 3. `backend/src/lib/discovery/projects.ts`
**Changes:**
- Modified mapToScored() to compute sectorTier and marketTier
- Added dynamic sector_intelligence lookup for tier computation
- Include market_tier in returned ScoredProject
- Added 3 curated ranking helper functions:
  - `bestValueProjects(sector, budgetMaxCr)` — sort by headroom + amenity_depth
  - `fastestPossessionProjects(sector, budgetMaxCr)` — possession_date asc, filter >36mo
  - `bestForFamiliesProjects(sector, budgetMaxCr)` — amenity + school count

**Helper Function Example:**
```typescript
export async function bestValueProjects(
  sector: string,
  budgetMaxCr?: number
): Promise<ScoredProject[]> {
  // Query projects in sector
  // Sort by (headroom + amenity_depth)
  // Return top 10
}
```

### 4. `backend/src/lib/discovery/types.ts`
**Changes:**
- Added `market_tier?: 'budget' | 'mid' | 'premium' | 'luxury'` to ScoredProject interface

### 5. `backend/src/lib/ai/toolRegistry.ts`
**Changes:**
- Registered 3 new ranking helper tools:
  - `best_value_projects` — triggers on "best value", "value for money", "budget"
  - `fastest_possession_projects` — triggers on "fastest", "quickest", "possession"
  - `best_for_families_projects` — triggers on "families", "schools", "children"

### 6. `backend/src/lib/ai/tools.ts`
**Changes:**
- Added NeutralTool definitions for the 3 curated ranking helpers
- Each tool accepts sector (required) and budget_max_cr (optional)
- Tools available when queryKind=RANKING is detected

### 7. `backend/src/routes/admin.ts`
**Changes:**
- Added `GET /api/v1/admin/sector-tiers` endpoint
- Computes sector tiers for all sectors in a city
- Returns grouped by tier with complete metadata
- Used for debugging and admin oversight

**Response Example:**
```json
{
  "city": "Noida",
  "tier1": [
    {
      "sector": "Sector 150",
      "tier": "tier1",
      "label": "Premium",
      "reasons": [...]
    }
  ],
  "tier2": [...],
  "tier3": [...],
  "total": 25
}
```

### 8. `backend/src/lib/ai/prompts/base.ts`
**Changes:**
- Added RANKING QUERY routing rules (section B)
- Required statement: "Always state how results are ranked"
- Provides examples of ranking basis statements

**Updated Rules:**
```
**B. RANKING QUERY** — queryKind=RANKING — Use RANKING FORMAT.
Phase 5: Always state how results are ranked. Examples:
- "Ranked by our verified project score (builder, location, quality, legal, amenities, possession)"
- "Ranked by value — price position relative to location weighted by amenities"
- "Ranked by possession timeline — fastest first"
Ranking basis must be stated BEFORE the project list.
```

---

## Test Coverage

### Phase 5 Tests: `backend/src/lib/discovery/phase5.test.ts`
- ✅ Ranking profile inference (value, speed, trust, family, premium, overall)
- ✅ Ranking basis statement generation
- ✅ Sector tier computation (T1, T2, T3 classification)
- ✅ Tier boost points calculation
- ✅ Market tier classification by price range
- ✅ Market tier bias scoring
- ✅ Market tier labels and ranges

**Test Results:** 19/19 passing ✓

---

## How It Works: End-to-End

### User Query: "Show me the best value projects in Sector 150"

**Step 1: Query Classification (Phase 0)**
```
Input: "Show me the best value projects in Sector 150"
Output: queryKind = RANKING, rankingProfile = 'value'
```

**Step 2: Ranking Profile Applied**
- Profile: "best value" (price_score=0.5, amenity_score=0.5)
- Sort by: (matchScore desc)

**Step 3: Sector Tier Lookup**
```
Sector Intelligence for "Sector 150":
- sector_stage: "established"
- price_5yr_cagr_pct: 6

Result: Tier 1 → +10 bonus points
```

**Step 4: Project Scoring**
```
For each project in Sector 150:
1. Calculate base score (possession, headroom, area, etc.) = 45pts
2. Add sector tier boost +10pts = 55pts
3. Add market tier bias (if budget provided) = +20pts (exact match) = 75pts
4. Apply budget penalty (if over) = -5pts = 70pts
5. Final score: 70pts
```

**Step 5: Results Ranked**
- Projects sorted by matchScore (descending)
- Top 10 returned with market_tier visible

**Step 6: Response to User**
```
"Ranked by value — price position relative to location weighted by amenities.

1. [Project A] — Best headroom within budget, 3 key amenities
2. [Project B] — Strong location + parking + gym
3. [Project C] — ...
```

---

## Score Impact Summary

| Signal | Points | Applied When |
|--------|--------|--------------|
| Sector Tier 1 | +10 | Project in Established+High CAGR sector |
| Sector Tier 2 | +5 | Project in Developing+Mid CAGR sector |
| Market Tier Exact | +20 | Project price matches user budget tier |
| Market Tier Adjacent | +5 | Project price 1 tier away from budget |
| Budget Slightly Over | -5 | Price 0–10% above budget |
| Budget Over | -10 | Price >10% above budget |

---

## Honesty & Transparency

Every ranking response states **how results are ranked**:
```
getRankingBasis('value')  
→ "Ranked by value — price position relative to location weighted by amenities"
```

Ensures:
- No hidden ranking algorithms
- Users understand what "top" means
- Trust preserved through clarity
- Project_DNA scores (admin-curated) visible on detail pages

---

## Backwards Compatibility

- ✅ Phase 5 is non-breaking
- ✅ queryKind=DISCOVERY still works (existing behavior)
- ✅ scoreProject() accepts optional sectorTier parameter
- ✅ market_tier is optional in ScoredProject
- ✅ Curated ranking helpers only available when queryKind=RANKING

---

## Next Steps (Future Phases)

- **Phase 6**: Cross-sector ranking (apply sector tiers across multiple sectors)
- **Phase 7**: User preference learning (track which ranking profile user favors)
- **Phase 8**: Dynamic ranking profiles (compute profiles from usage patterns)

---

## Code Quality

- ✅ TypeScript strict mode
- ✅ All imports correct
- ✅ Build passes (tsc)
- ✅ Tests pass (19/19)
- ✅ No breaking changes
- ✅ Well-documented

---

## Files Summary

| File | Type | Changes | Status |
|------|------|---------|--------|
| rankingProfiles.ts | NEW | 157 lines | ✅ |
| sectorTiers.ts | NEW | 99 lines | ✅ |
| marketTiers.ts | NEW | 96 lines | ✅ |
| queryClassifier.ts | MODIFIED | +3 imports, +rankingProfile field, +inference logic | ✅ |
| scoring.ts | MODIFIED | +2 imports, +sectorTier param, +tier logic | ✅ |
| projects.ts | MODIFIED | +sector tier lookup, +3 helper functions | ✅ |
| types.ts | MODIFIED | +market_tier field | ✅ |
| tools.ts | MODIFIED | +3 tool definitions | ✅ |
| toolRegistry.ts | MODIFIED | +3 tool registrations | ✅ |
| admin.ts | MODIFIED | +/admin/sector-tiers endpoint | ✅ |
| prompts/base.ts | MODIFIED | +RANKING routing rules | ✅ |
| phase5.test.ts | NEW | 146 lines (tests) | ✅ |

**Total**: 11 files modified, 3 files created, ~800 lines of code added

---

## Verification Checklist

- ✅ Code compiles (tsc)
- ✅ Tests pass (19/19 Phase 5 tests)
- ✅ Ranking profiles properly defined
- ✅ Sector tiers data-driven (no hardcoding)
- ✅ Market tiers visible in ScoredProject
- ✅ Curated helpers available as tools
- ✅ Ranking basis always stated
- ✅ Backwards compatible
- ✅ No breaking changes
- ✅ Documentation complete
