# Test Execution Guide

## Automated Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
# Frontend hooks
npm test -- usePreferredImages.test.ts

# Backend discovery
npm test -- projects.test.ts

# Backend intent extraction
npm test -- intent-extraction-advanced.test.ts
```

### Watch Mode (auto-rerun on changes)
```bash
npm test -- --watch
```

### Generate Coverage Report
```bash
npm test -- --coverage
```

**Expected**: All tests PASS ✓ (35 total)

---

## Manual Test Suite

### Prerequisites
1. Backend running: `npm run dev:backend` (port 3002)
2. Frontend running: `npm run dev:frontend` (port 3000)
3. Open browser: http://localhost:3000
4. Open backend logs in terminal (watch for [CHAT], [INTENT], [DISCOVERY] tags)

### Test Sections (90 minutes total)

**Section 1: Intent Extraction (10 min)**
- [ ] Test 1.1 "Sector 10" alone → expects clarification
- [ ] Test 1.2 "Sector 10" then "3 BHK" → preserves context
- [ ] Test 1.3 "Show me elite x" → doesn't re-ask sector
- [ ] Test 1.4 "3bhk sector10" (typo) → corrects/finds anyway
- [ ] Log check: [INTENT:MERGE] should show sector preserved

**Section 2: Discovery (15 min)**
- [ ] Test 2.1 Impossible criteria → graceful "no results" with explanation
- [ ] Test 2.2 Sector 10, budget ₹25L → shows alternatives
- [ ] Test 2.3 5 rapid queries → no "capacity limit" error
- [ ] Test 2.4 Long complex query → parses without 413 error
- [ ] Log check: [DISCOVERY:SCORED] shows score ≥ 10 only

**Section 3: Comparisons (5 min)**
- [ ] Test 3.1 "Compare ATS vs Arihant" → side-by-side
- [ ] Test 3.2 "Compare them" (after results) → remembers context
- [ ] Log check: Sector context preserved in intent

**Section 4: Error Handling (10 min)**
- [ ] Test 4.1 Open project, wait for image load failure → shows "Image unavailable"
- [ ] Test 4.2 View comparison chart with missing data → shows "Chart unavailable"
- [ ] Test 4.3 (Admin) Change lead status, watch for toast notification
- [ ] Log check: No 500 errors, graceful fallbacks used

**Section 5: Data Validation (10 min)**
- [ ] Test 5.1 Budget ₹0 → rejected/clarified
- [ ] Test 5.2 Budget ₹100 Cr → processes normally (no hard limit)
- [ ] Test 5.3 Project with null hero_image_url → falls back correctly
- [ ] Test 5.4 Project with no unit_types → shows "Configuration unavailable"
- [ ] Log check: No null dereference errors

**Section 6: Stress (15 min)**
- [ ] Test 6.1 Search broad query (100+ results) → shows top 5-10 only
- [ ] Test 6.2 Complex multi-filter query → completes in <3s
- [ ] Test 6.3 Run 50-turn conversation → no performance degradation
- [ ] Log check: No token budget errors, memory stable

**Section 7: UX & Clarity (10 min)**
- [ ] Test 7.1 Ambiguous input (e.g., "Prime") → asks for clarification
- [ ] Test 7.2 Recommendation shows reasoning ("Best price match for [criteria]")
- [ ] Test 7.3 Every price includes confidence ("Based on [source]")
- [ ] Log check: No misleading recommendations

**Section 8: Exploits (5 min)**
- [ ] Test 8.1 SQL-like injection in search → treated as text, no results
- [ ] Test 8.2 XSS payload in query → rendered as text, no script execution
- [ ] Test 8.3 Try to IDOR another user's saved list → 403 Forbidden
- [ ] Log check: No database errors, no XSS, no IDOR vulnerabilities

**Section 9: Recovery (10 min)**
- [ ] Test 9.1 Kill OpenAI, try query → falls back to Groq, works normally
- [ ] Test 9.2 Slow database (simulate delay) → shows "Loading..." or partial results
- [ ] Test 9.3 Both LLM providers fail (simulate) → shows "All services unavailable" message
- [ ] Log check: Graceful fallback to Groq, proper error messages

**Section 10: Full Flow (10 min)**
- [ ] Test 10.1 Happy path: Sector → Config → Results → Details → Save → Compare
- [ ] Test 10.2 Edge flow: Invalid sector → fallback → correct sector → results
- [ ] Test 10.3 Session expires mid-query → "Please sign in again"
- [ ] Log check: Full context preserved throughout flow

---

## Issue Recording Template

For each failed test, record:

```
ID: [SECTION].[TEST_NUMBER]
Severity: Critical / High / Medium / Low
Test: [description]
Expected: [what should happen]
Observed: [what actually happened]
Steps to reproduce:
  1. [step]
  2. [step]
  3. [step]
Backend logs: [copy relevant log lines]
Status: Open / In-Progress / Fixed / Deferred
```

**Example**:
```
ID: 1.2
Severity: Critical
Test: Context preservation (Sector 10 → 3 BHK → results)
Expected: Shows Sector 10, 3BHK results, sector remembered
Observed: "3BHK noted. Which sector?" (sector lost)
Steps to reproduce:
  1. User: "Sector 10"
  2. Bot responds with config chips
  3. User: "3 BHK"
  4. Bot re-asks for sector (BUG)
Backend logs:
  [INTENT:MERGE] {"previous":{"sector":"Sector 10",...},"update":{"bhk":[3]},"result":{"bhk":[3]}} // sector missing!
Status: Fixed in adbc403
```

---

## Success Criteria

**Automated Tests**:
- [ ] All 35 tests pass
- [ ] 0 errors, 0 warnings
- [ ] Coverage > 70%

**Manual Tests**:
- [ ] All 10 sections completed
- [ ] < 5 issues found
- [ ] 0 Critical severity issues
- [ ] All High issues marked "Fixed"

**Overall**:
- [ ] No 413 token errors
- [ ] No "capacity limit" messages
- [ ] Context preserved across all flows
- [ ] Graceful error handling everywhere
- [ ] Zero exploits successful

---

## Common Issues & Fixes

### "All AI services temporarily unavailable"
**Cause**: Both OpenAI and Groq rate limited
**Fix**: Wait 30s, or upgrade Groq tier, or add delay between requests

### "I've temporarily hit capacity limits"
**Cause**: Token budget exceeded on gpt-4o-mini OR Groq rate limit
**Fix**: System trims prompts for SHORTLISTED state (committed in f20bc9b)

### "3BHK noted. Which sector?" (sector context lost)
**Cause**: Intent merge clearing sector on project extraction
**Fix**: Preserve prior context when only projectNames updated (committed in adbc403)

### Image carousel shows blank
**Cause**: All URLs failed to load
**Fix**: Shows "Images unavailable" fallback now

### Chart missing data
**Cause**: Null JSON passed to chart
**Fix**: Shows "Chart data unavailable" fallback (Phase 5.5)

---

## Performance Baselines

Set these during successful run to measure regressions:

- [ ] Single query response time: < 3s
- [ ] 50-turn conversation: < 500MB memory
- [ ] Image carousel: < 1s to switch images
- [ ] Comparison render: < 2s

---

## Next Steps After Testing

1. **Critical issues**: Fix immediately
2. **High issues**: Schedule for next sprint
3. **Medium/Low issues**: Create backlog tickets
4. **Zero issues found**: Ship! 🚀
5. **Run automated suite again** before deployment
