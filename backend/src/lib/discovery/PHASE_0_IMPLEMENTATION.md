# Phase 0: Query Classification & Conversation Anchor

## Overview
Foundational RAG phase implementing:
1. **Query Classification Taxonomy** — Deterministic + LLM fallback
2. **Conversation Anchor** — Resolve pronouns via focus_project_id
3. **Render-Target Mapping** — Control frontend output format

## Files Created

### 1. `queryClassifier.ts`
Classifies user queries into semantic categories for routing and rendering.

**Query Kinds:**
- `DISCOVERY` — User searching for properties (default fallback)
- `DRILLDOWN` — User wants details on specific project/attribute
- `RANKING` — Comparison/ranking of options ("best in sector 62")
- `COMPARISON` — Compare 2+ named projects ("Compare X vs Y")
- `SUMMARY` — High-level overview ("Tell me about sector 62")
- `ADVISORY` — Ask for advice/opinion ("Should I buy this?")
- `CLARIFY` — Bot needs clarification before proceeding

**Deterministic Pre-pass:**
- COMPARISON: Explicit compare patterns + 2+ project names
- DRILLDOWN: Attribute keywords (payment, cost, carpet, etc.) + no new projects
- RANKING: Superlatives (best, top) + scope (in, under, sector)
- SUMMARY: Overview keywords (summary, overview, brief, gist)
- ADVISORY: Advice keywords + project reference

**LLM Fallback:**
- `queryKind` folded into existing intent extraction schema
- No extra round-trip (single inference)
- Defaults to DISCOVERY if unspecified (fail-open)

**Render Targets:**
- DISCOVERY → `cards` (property cards)
- DRILLDOWN, SUMMARY, ADVISORY, CLARIFY → `text` (prose response)
- COMPARISON, RANKING → `both` (cards + analysis)

### 2. `anchorResolution.ts`
Resolves pronouns ("its", "that one") by tracking focus project in session.

**Anchor Rules:**
- **SET** when: discovery returns exactly 1 exact match (auto-focus)
- **CHANGE** when: user names a different project
- **CLEAR** when: new discovery with multiple results (no explicit name)
- **KEEP** when: no change criteria met
- **NEED_CLARIFICATION** when: detail query with no project in focus

**Resolution Chain (for DRILLDOWN):**
1. Explicit project name in message
2. Current focus_project_id from session
3. Most recent property_event view in session
4. Ask which project

**Entry Point:** `resolveAnchor()` called after discovery, updates session with new focus.

### 3. `queryClassifier.test.ts`
Unit tests for deterministic classification and fallback behavior.

## Schema Changes

### `schema.prisma` – ChatSession Model
Added two fields:
```prisma
focus_project_id  String?    // FK to projects.id (nullable)
focus_set_at      DateTime?  // When focus was set
```

No foreign key constraint (projects may be deleted, focus may be stale).

### Migration: `20260802_add_focus_project.sql`
- Adds columns to `chat_sessions` table
- Creates index on `focus_project_id`
- No data loss (columns are nullable)

## Type Updates

### `types.ts` – Intent Interface
Added optional field:
```typescript
queryKind?: 'DISCOVERY' | 'DRILLDOWN' | 'RANKING' | 'COMPARISON' | 'SUMMARY' | 'ADVISORY' | 'CLARIFY'
```

### `intent.ts` – IntentSchema (Zod)
Updated to accept queryKind in validation:
```typescript
queryKind: z.enum([...]).nullable().optional()
```

## Integration Points

### `chat.ts` Changes

1. **Import Phase 0 modules** (line ~12):
   ```typescript
   import { classifyQuery } from '../lib/discovery/queryClassifier'
   import { resolveAnchor } from '../lib/discovery/anchorResolution'
   ```

2. **Declare renderTarget variable** (line ~363):
   ```typescript
   let renderTarget: 'cards' | 'text' | 'both' = 'text'
   ```

3. **Call query classifier after intent extraction** (line ~451):
   ```typescript
   const queryClassification = classifyQuery(message, intent)
   intent.queryKind = queryClassification.queryKind
   renderTarget = queryClassification.renderTarget
   ```

4. **Call anchor resolution after discovery** (line ~878):
   ```typescript
   const anchorResolution = await resolveAnchor(
     currentSessionId,
     message,
     intent.projectNames,
     projects,
     nearbyProjects,
     (intent.queryKind as any) ?? 'DISCOVERY'
   )
   ```

5. **Include renderTarget in properties events** (lines ~848, ~903):
   ```typescript
   send('properties', {
     exactResults: projects,
     nearbyResults: nearbyProjects,
     expansion: discoveryExpansion ?? null,
     renderTarget,  // Phase 0 addition
   })
   ```

## Testing

### To Run Tests:
```bash
npm test -- queryClassifier.test.ts
```

### Manual Testing:
1. **COMPARISON detection:**
   ```
   User: "Compare Pristine vs Godrej Green Glades"
   Expected: queryKind=COMPARISON, renderTarget=both
   ```

2. **DRILLDOWN with focus resolution:**
   ```
   Turn 1: User discovers "Pristine" → focus_project_id set
   Turn 2: User: "What's the payment plan for it?"
   Expected: queryKind=DRILLDOWN, resolves "it" to Pristine via focus
   ```

3. **RANKING detection:**
   ```
   User: "What are the best projects under 1.5cr in Sector 62?"
   Expected: queryKind=RANKING, renderTarget=both
   ```

## Verification Checklist

- [x] queryClassifier.ts compiles
- [x] anchorResolution.ts compiles
- [x] schema.prisma updated with focus fields
- [x] migration file created
- [x] Intent type includes queryKind
- [x] IntentSchema validation updated
- [x] chat.ts imports Phase 0 modules
- [x] Query classification called after intent extraction
- [x] Anchor resolution called after discovery
- [x] renderTarget passed to properties events
- [x] Export from discovery/index.ts added
- [x] Tests written
- [x] No breaking changes to existing code

## Future Phases

This Phase 0 foundation enables:
- **Phase 1:** Enhanced DRILLDOWN routing with queryKind
- **Phase 2:** Render-target driven UI optimization
- **Phase 3+:** Specialized handlers per queryKind

## Known Limitations

1. **Deterministic classifier coverage:** ~70% of queries (common patterns)
2. **Focus staleness:** focus_project_id not auto-cleared on deletion
3. **Pronoun resolution:** Limited to current session only
4. **No LLM tuning yet:** queryKind accuracy depends on prompt engineering

## Migration Steps

```bash
# 1. Deploy code with new files
git add backend/src/lib/discovery/queryClassifier.ts
git add backend/src/lib/discovery/anchorResolution.ts
git add backend/src/lib/discovery/PHASE_0_IMPLEMENTATION.md
git commit -m "feat(phase-0): query classification and conversation anchor"

# 2. Run migration
npx prisma migrate deploy

# 3. Verify in logs:
# - "[CHAT] Query classification" events appear
# - "[ANCHOR]" events appear
# - "renderTarget" in properties events
```

## Files Modified

- `backend/src/routes/chat.ts` — Integration points
- `backend/src/lib/discovery/types.ts` — Intent.queryKind
- `backend/src/lib/discovery/intent.ts` — IntentSchema
- `backend/src/lib/discovery/index.ts` — Exports
- `frontend/prisma/schema.prisma` — ChatSession fields
- `frontend/prisma/migrations/20260802_add_focus_project.sql` — Migration

## Files Created

- `backend/src/lib/discovery/queryClassifier.ts`
- `backend/src/lib/discovery/anchorResolution.ts`
- `backend/src/lib/discovery/queryClassifier.test.ts`
- `backend/src/lib/discovery/PHASE_0_IMPLEMENTATION.md` (this file)
