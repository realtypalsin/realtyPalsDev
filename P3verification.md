PHASE 3 VERIFICATION STEPS

A. Code Verification

3.1 Canonical Sector + City

# Check normalize.ts exists with required functions
grep -c "canonicalSector\|canonicalCity\|normalizeLocation" backend/src/lib/discovery/normalize.ts
# Expected: 3 (each function defined)

# Check admin.ts uses normalize on create
grep "canonicalSector\|canonicalCity" backend/src/routes/admin.ts
# Expected: found in POST and PATCH handlers

# Check discovery functions support city parameter
grep "city.*=.*'Noida'" backend/src/lib/discovery/sectors.ts
# Expected: found in getSectorContext() and getAllSectorsOverview()

3.2 Prisma Baseline

# Check baseline migration exists
ls -la backend/prisma/migrations/0_baseline/migration.sql
# Expected: file exists with comment about pgvector

# Check documentation file exists
ls -la PHASE3_IMAGE_BACKFILL.md
# Expected: file exists

3.3 Price/Label Hygiene

# Check null price handling added
grep -A 5 "price_min_cr: null" backend/src/lib/discovery/projects.ts
# Expected: OR clause with null price included

# Check no hardcoded price defaults
grep "price.*default\|price.*\|\|" backend/src/lib/discovery/projects.ts | grep -v "price_min_cr\|price_max_cr"
# Expected: minimal matches (only expected defaults)

B. Logic Verification

3.1 Migration Script Available

# Check migration script created
ls -la frontend/scripts/normalize-locations.ts
# Expected: file exists with DRY_RUN logic

# Inspect script structure
head -30 frontend/scripts/normalize-locations.ts | grep -E "DRY_RUN|normalizeLocation|dry-run"
# Expected: DRY_RUN flag, normalization calls, preview mode

3.3 Null Price Handling

-- Verify projects with NULL price_min_cr are NOT filtered out by budget query
-- Create test: run discovery with budgetMax but include project with NULL price_min_cr

SELECT COUNT(*) as total_projects FROM projects;
SELECT COUNT(*) as priced_projects FROM projects WHERE EXISTS (
  SELECT 1 FROM unit_types WHERE project_id = projects.id AND price_min_cr IS NOT NULL
);
-- Expected: some projects have NULL price_min_cr (unpriced)

C. Runtime Checks

3.1 Canonical Format

# Check sector/city normalization works
cd frontend && npm run build 2>&1 | grep -i "error.*sector\|error.*city" | head -5
# Expected: no sector/city related build errors

# TypeScript should pass
npx tsc --noEmit
# Expected: 0 errors

3.3 Budget Filter

After merge to main, test with live chat:
# Send chat query with budget filter (e.g., "under 1.5 Cr")
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"projects under 1.5 Cr", "sessionId":"test"}' | jq '.blocks[] | select(.type=="properties")'
# Expected: results include both priced AND unpriced projects

---
Remaining Phase 3 Items

⏸ Image Backfill (3.4) — Deferred pending:
- Supabase asset inventory audit
- Confirmation of which projects have missing images
- Target: Phase 5.1 when usePreferredImages hook is extracted