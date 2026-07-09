# PHASE 5 VERIFICATION PLAN
## Frontend Hooks Extraction + Backend Dedup + Test Cleanup

### 5.1 Frontend Hooks Extraction

**usePreferredImages(project) Hook**
- Consolidates hero/exterior image preference logic from 5 locations
- Locations to refactor:
  - ProjectCard.tsx:80-119
  - ProjectDetailPanel.tsx:216-226
  - PropertyCardWithRecommendation.tsx:58
  - ComparisonTable.tsx:407-410
  - admin/projects/page.tsx:259
- Adds missing onError fallback to MessageBubble.tsx:449-455 (broken image handling)

**useSaveProject(projectId) Hook**
- Consolidates /saved POST/DELETE + auth headers from:
  - ProjectCard.tsx:121-152
  - ProjectDetailPanel.tsx:186-209

### 5.2 Backend Dedup

**Rule Text Extraction**
- Extract shared text between base.ts Hard Rules and GROQ_FALLBACK_SUFFIX (chat.ts:134-213)
- Create shared ruleset in prompts/ to avoid ~80-line duplication

**Reducer Helpers**
- Abstract session ownership check (chat.ts:982-1054, 1076-1120, 760-818)
- Extract shared getSectorContext/getAllSectorsOverview patterns (sectors.ts:6-126)

**Enum Centralization**
- Consolidate status enums from:
  - builderApplications.ts:65
  - builderRegistration.ts:116
  - builder/leads/route.ts:13
- One source of truth for builder application/lead/news statuses

### 5.3 Price Formatter Consolidation

Keep frontend/lib/format.ts::formatPriceCr as base.
Fold in:
- calculators.ts:108 formatInr
- utils/formatters.ts:10 formatBudget
- Replace inline /10000000, toFixed in 26 components (incremental)

### 5.4 Test Suite Consolidation

**KEEP:**
- frontend/__tests__/* (calculators, MessageBubble, ProjectCard, etc.)
- backend/src/lib/ai/__tests__/intent-extraction.test.ts
- backend/src/lib/discovery/__tests__/routing-validation.ts
- backend/scripts/test_chat_regression.js

**DELETE:**
- backend/test_intent.ts
- backend/test_discovery.ts
- frontend/test_query.js
- backend/scripts/test_chat_session.js

**UPDATE:**
- package.json test script: ONE --test "src/**/__tests__/*.test.ts"
- Remove old workspace test references

### 5.5 Final Fixes (Carry Forward from P1-P4)

**Verify Already Done:**
- [x] Null price handling (Phase 3.3)
- [x] Enum case fixes lowercase (Phase 1.5)
- [x] IDOR + fail-closed (Phase 1.1/1.3)
- [x] IntelligenceTab empty-state (Phase 2.1)
- [x] MessageBubble image fallback (Phase 2.2 via hooks)

**Still Needed:**
- Score floor validation (projects.ts:354-360) — add minimum ≥10 threshold
- Error visibility in admin (app/admin/leads/page.tsx:36,53) — toast + revert optimistic
- RealtyChart.tsx:15 null JSON handling — "chart unavailable" fallback
- Session-list errors (chat.ts:934,966) — server-side logging

### 5.6 Repo Cleanup

**DELETE:**
- elitex_website_downloader/ (12MB, user confirmed OK)
- OverviewTab.old.tsx
- ProjectDetailPanel.old.tsx
- pdp*.diff files
- old.txt, Junk/
- frontend/build*.log
- eslint-results.json
- diagnose*.js

**UPDATE .gitignore:**
- logs/
- scratch/
- *.log

### 5.7 Verification Checklist

```
npm test                        → all tests pass green
npm run build                   → no errors
npx tsc --noEmit               → zero type errors
usePreferredImages hook         → all 5 locations refactored
useSaveProject hook             → both locations refactored
Shared rule text extracted      → no duplication
Enum centralization             → one source of truth
Price formatter consolidated    → 26 components updated
Test suite clean                → old test files deleted
Error visibility                → toast + fallbacks in place
Score floor added               → ≥10 threshold enforced
Repo cleanup                    → 0 deleted files left
```

### Phase 5 Timeline Estimate
- Hooks extraction: 2-3 commits
- Backend dedup: 2-3 commits
- Test cleanup: 1 commit
- Final fixes + cleanup: 2-3 commits
- Total: ~8-10 atomic commits

---

## Ready to proceed? Y/N
