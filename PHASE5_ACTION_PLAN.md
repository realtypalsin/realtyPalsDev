# PHASE 5 COMPLETION ACTION PLAN

**Status**: Phase 5.1 DONE + Critical fixes in progress
**Commits**: 3475cef + bd2c276 + f20bc9b (token budget) + adbc403 (intent preservation)

---

## IMMEDIATE WINS (30 mins each, 3-4 commits)

### 5.3 Price Formatter Consolidation ⚡
**Files**: frontend/lib/format.ts, calculators.ts, utils/formatters.ts
**Work**:
- Keep formatPriceCr as base
- Fold formatInr + formatBudget into format.ts
- Replace 26 components with centralized formatter
- 1 commit: consolidate + verify usage

### 5.4 Test Cleanup ⚡
**Files**: package.json scripts, test files
**Work**:
- DELETE: backend/test_intent.ts, backend/test_discovery.ts, frontend/test_query.js
- UPDATE: package.json test script → single `--test "src/**/__tests__/*.test.ts"`
- KEEP: existing __tests__/ structure
- 1 commit: cleanup + script fix

### 5.5 Final Fixes (PARTIALLY DONE)
✅ Token budget trimmed (committed)
✅ Intent preservation fixed (committed)
**Remaining**:
- Score floor validation: projects.ts:354-360 add min score ≥10
- Error visibility: admin/leads/page.tsx toast on status change
- RealtyChart.tsx null JSON → "chart unavailable" fallback
- 2-3 commits: one per fix

### 5.6 Repo Cleanup ⚡
**Files**: .gitignore, project root
**Work**:
- DELETE: elitex_website_downloader/, *.old.tsx, pdp*.diff, old.txt
- UPDATE: .gitignore (logs/, *.log)
- Verify: no unintended deletes
- 1 commit: clean slate

---

## TEST SUITE FRAMEWORK (Priority for user)

### What to test (per user's "test each section independently"):

#### Frontend Tests
```
frontend/__tests__/
  ├── hooks/
  │   └── usePreferredImages.test.ts (NEW)
  │       ├── Image selection (hero/exterior preference)
  │       ├── Failed URL tracking & rotation
  │       ├── Auto-rotate on hover behavior
  │       └── Fallback to hero_image_url
  ├── discovery/
  │   └── intent-extraction.test.ts (ENHANCE)
  │       ├── Sector + BHK + project names + budget parsing
  │       ├── Context preservation (sector not cleared)
  │       ├── Comparison query detection
  │       └── Edge cases: typos, partial names
  └── integration/
      └── discovery-flow.test.ts (NEW)
          ├── User message → clarification → results → follow-up
          ├── Sector selection → BHK selection → results display
          └── Project comparison workflow
```

#### Backend Tests
```
backend/src/lib/__tests__/
  ├── discovery/
  │   ├── projects.test.ts (NEW - enhance existing)
  │   │   ├── Project scoring logic
  │   │   ├── Nearby sector expansion
  │   │   └── Score threshold filtering
  │   ├── confidence.test.ts (NEW)
  │   │   ├── Clarification chip generation
  │   │   ├── Dynamic chip inventory
  │   │   └── Confidence computation
  │   └── routing-validation.ts (KEEP + expand)
  ├── ai/
  │   ├── intent-extraction.test.ts (KEEP + expand)
  │   │   ├── Each LLM extraction path
  │   │   ├── Intent merge logic
  │   │   └── Context preservation
  │   ├── compression.test.ts (NEW)
  │   │   ├── Message compression threshold
  │   │   └── Summary sanitization
  │   └── prompts/
  │       └── base-prompt.test.ts (NEW)
  │           ├── Blocked builders injection
  │           ├── Token budget compliance
  │           └── State-aware prompt trimming
  └── config.test.ts (NEW)
      ├── MODELS constants
      ├── FINANCIAL calculations
      └── DISCOVERY configuration
```

#### E2E Tests
```
e2e/
  ├── discovery.e2e.ts (NEW)
  │   ├── "Show me best 3BHK in Sector 10"
  │   ├── Handle rate limiting gracefully
  │   └── Capacity error recovery
  ├── chat-flow.e2e.ts (NEW)
  │   ├── Intent clarification → results
  │   ├── Follow-up questions
  │   └── Comparison requests
  └── edge-cases.e2e.ts (NEW)
      ├── "Show me elite x" → project lookup
      ├── Sector context persistence
      └── Multiple rapid requests (rate limit)
```

---

## EXECUTION ORDER (10 commits remaining)

1. **5.3** Price formatter consolidation (1)
2. **5.5.1** Score floor validation (1)
3. **5.5.2** Error visibility toast (1)
4. **5.5.3** Chart fallback UI (1)
5. **5.4** Test cleanup (1)
6. **5.6** Repo cleanup (1)
7. **TEST SETUP** Frontend hooks test (1)
8. **TEST SETUP** Backend discovery test (1)
9. **TEST SETUP** Intent extraction test (1)
10. **TEST SETUP** E2E discovery flow (1)

---

## VERIFICATION CHECKLIST (before marking complete)

- [ ] TypeScript: `npx tsc --noEmit` = 0 errors
- [ ] Frontend: `npm test` = all pass
- [ ] Manual: "Show me 3BHK Sector 10" → works, no capacity error
- [ ] Manual: "Show me elite x" (no re-ask for sector)
- [ ] Manual: Follow-up question after results loads
- [ ] Rate limit: Handled gracefully (no 500 error)
- [ ] Token budget: No 413 errors on large result sets
- [ ] Tests: All test suites pass
- [ ] Git: clean history, no unintended files

---

## NOTES FOR USER

**What still needs manual review**:
- Gray-on-color contrast fixes (3 files flagged by design hook)
- Payment plan / cost sheet handling (Phase 1.12 deferred)
- Builder dashboard UI (deferred, behind feature flag option)

**Caveats**:
- Groq rate limit is external (12k TPM free tier). Need to either:
  - Switch fallback model (gpt-4o-mini has 8k limit, Groq free is 12k TPM)
  - Or implement request queuing/backoff
  - Or upgrade Groq tier
- Test suites require Node test runner configuration (currently Jest)

---

**Ready to execute? Y/N**
