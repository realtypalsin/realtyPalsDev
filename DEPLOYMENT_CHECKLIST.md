# Multi-Dimensional System - Deployment & Operations Checklist

**Status**: Ready for Staging → Production
**Last Updated**: 2026-08-09
**Owner**: Engineering Team

---

## Pre-Deployment Verification

### Code Quality ✅
- [ ] TypeScript compilation: `npx tsc --noEmit` (MUST PASS)
- [ ] Linting: `npm run lint` (NO ERRORS)
- [ ] All imports resolve correctly
- [ ] No `any` types in new code
- [ ] No console.logs in production code
- [ ] No hardcoded secrets/API keys

### Unit Tests ✅
- [ ] Phase 1 (Intent Extraction): 5/5 tests
- [ ] Phase 2 (Scoring Engine): 4/4 tests
- [ ] Phase 4 (Ranking Formatter): 19/19 tests
- [ ] Phase 5 (Integration): 12/12 tests
- [ ] Coverage: >80% on new code
- [ ] Run: `npm run test -- multiDimensional`

### Integration Tests ✅
- [ ] End-to-end pipeline: Intent → Score → Rank → Format
- [ ] Fallback paths: All 3 LLM providers tested
- [ ] Error handling: No unhandled exceptions
- [ ] Edge cases: Empty input, missing data, null metadata

### Performance Tests ✅
- [ ] Intent extraction: <500ms (target: 200-300ms)
- [ ] Query + scoring: <500ms (target: <300ms)
- [ ] Formatting: <100ms (target: <50ms)
- [ ] Total per-message: <1 second
- [ ] No memory leaks (monitor heap)
- [ ] Concurrency: 10 simultaneous requests (no race conditions)

---

## Deployment Steps

### Phase 1: Database Migration
```bash
# 1. Backup production database
pg_dump -h aws-1-ap-south-1.pooler.supabase.com -U postgres dbname > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Test migration locally
cd backend
npx prisma migrate deploy

# 3. Verify schema
psql -h aws-1-ap-south-1.pooler.supabase.com -U postgres -c "\d Project" | grep -E "resale_lock_in|nri_eligible|women_safety"

# 4. If migration fails, restore backup immediately
```

### Phase 2: Backend Deployment
```bash
# 1. Stage environment
git checkout feature/overview-tab-rebuild
npm ci
npm run build

# 2. Run final tests
npm run test -- multiDimensional

# 3. Deploy to staging
npm run deploy:staging

# 4. Health check
curl -s https://staging-api.realtypals.com/health | jq .

# 5. Monitor logs
tail -f /var/log/realtypals/api.log | grep -E "ERROR|WARN|MULTI_DIM"
```

### Phase 3: Frontend Deployment
```bash
# 1. Build frontend
cd frontend
npm run build

# 2. Run react-doctor
npx react-doctor@latest --verbose --scope changed

# 3. Deploy to staging
npm run deploy:staging

# 4. Lighthouse audit
lighthouse https://staging.realtypals.com --output=html > lighthouse_report.html
```

### Phase 4: Staging QA (Full Test Suite)

#### 4.1 Intent Extraction Tests
```
✓ User Query: "I need a 3BHK near metro, under 1.5 crore"
  Expected: All 11 dimensions extracted
  Verify: Budget, location, specs all present
  
✓ User Query: "Good schools for my kids, ready in 6 months"
  Expected: Family stage + timeline extracted
  Verify: school_priority=true, possession_urgency=high
  
✓ User Query: "No litigation, RERA compliant only"
  Expected: Legal constraints extracted
  Verify: legal.reraComplianceMust=true, legal.litigationMustBe0=true
```

#### 4.2 Discovery & Ranking Tests
```
✓ Scenario: Budget Filter
  Input: budgetMax=1.5Cr
  Expected: Only projects ≤1.5Cr returned
  Verify: All results satisfy constraint
  
✓ Scenario: Multi-Project Ranking
  Input: 3 properties discovered
  Expected: All scored, ranked by final score
  Verify: Score1 >= Score2 >= Score3
  
✓ Scenario: Deal-Breaker Detection
  Input: Property with litigation
  Expected: Score=0, flagged as deal-breaker
  Verify: Project filtered or warned
```

#### 4.3 Chat Integration Tests
```
✓ Test: Dimension Explanations Appended
  Send: "I need a 3BHK near metro"
  Expected: Response includes dimension scores
  Verify: "✅ Budget", "✅ Location", "⚠️ Timeline" etc.
  
✓ Test: Comparison Matrix Generated
  Send: "Compare Sector 62 and Sector 63 projects"
  Expected: Side-by-side comparison table
  Verify: Table has 11 dimensions, all projects included
  
✓ Test: Trade-offs Detected
  Send: "What about properties far from metro?"
  Expected: Trade-off explanation
  Verify: "Long commute vs. lower price" or similar
```

#### 4.4 Regression Tests (Existing Features)
```
✓ Chat Streaming: Messages stream correctly (no buffering)
✓ Project Discovery: Existing queries still work
✓ Property Detail: Detail pages load correctly
✓ Saved Projects: Save/unsave still works
✓ Builder Info: Builder data displays correctly
✓ Calculators: EMI, GST, stamp duty all work
```

#### 4.5 Performance & Load Tests
```
✓ Single Query: <1 second response
✓ 5 Concurrent: All return <2 seconds
✓ 10 Concurrent: No timeouts, all succeed
✓ Memory: Heap stays <200MB (no leaks)
✓ CPU: <50% spike on single query
```

#### 4.6 Error Recovery Tests
```
✓ LLM Failure: Groq fallback triggers correctly
✓ DB Timeout: Graceful error message shown
✓ Missing Data: Scorer handles nulls without crashing
✓ Invalid Input: Malformed queries don't crash system
✓ Partial Results: Missing projects still ranked
```

---

## Production Deployment

### Pre-Production Checklist
- [ ] All staging QA tests PASSED
- [ ] No regressions detected in existing features
- [ ] Load test: 50 concurrent users, <3 second response
- [ ] Security audit: No exposed secrets
- [ ] Backup verified and restorable
- [ ] Rollback plan documented and tested
- [ ] Team trained on monitoring new metrics

### Production Deployment Commands
```bash
# 1. Final verification
git log --oneline feature/overview-tab-rebuild ^main | head -10
npm run build && npm run test

# 2. Create production tag
git tag -a v2.0.0-multidim -m "Multi-dimensional intent & ranking system"

# 3. Merge to main
git checkout main
git pull origin main
git merge feature/overview-tab-rebuild
git push origin main
git push origin v2.0.0-multidim

# 4. Deploy to production
npm run deploy:prod

# 5. Verify production health
curl -s https://api.realtypals.com/health | jq .

# 6. Start monitoring
./monitor-production.sh
```

### Monitoring & Alerting

#### Key Metrics
```
Real-time Dashboard (Datadog/New Relic):
- Multi-dimensional intent extraction: success rate (target: >99%)
- Recommendation confidence: distribution (target: avg >75)
- Scoring latency: p50/p95/p99 (target: p50<300ms, p99<1s)
- Chat response time: p95 (target: <2s)
- Error rate: (target: <0.1%)
- Recommendation acceptance: % save/visit
```

#### Alerts (PagerDuty)
```
CRITICAL:
- Error rate > 1% for 5 min
- Intent extraction fails > 10 in 1 min
- API response time p99 > 3s
- Database connection errors > 5 in 5 min

HIGH:
- Recommendation confidence < 50 (avg)
- Scoring latency p95 > 1s for 10 min
- Intent degradation > 50% for 15 min

MEDIUM:
- Memory usage > 80% for 5 min
- CPU > 70% for 10 min
```

#### Log Monitoring
```bash
# Tail multi-dimensional logs
tail -f /var/log/realtypals/api.log | grep MULTI_DIM

# Alert on errors
tail -f /var/log/realtypals/api.log | grep -E "\[ERROR\].*MULTI_DIM|WARN.*MULTI_DIM"

# Monitor scoring performance
tail -f /var/log/realtypals/api.log | grep "MULTI_DIM.*Phase" | awk '{print $(NF-1), $NF}'
```

---

## Rollback Plan

### If Critical Issue Found
```bash
# 1. Immediate action
git revert HEAD
npm run deploy:prod

# 2. Restore from backup if needed
pg_restore -h aws-1-ap-south-1.pooler.supabase.com -U postgres -d postgres backup_20260809_120000.sql

# 3. Notify team
#slack #engineering "Rolled back multi-dimensional system due to [reason]"

# 4. Root cause analysis
# Post in #incidents channel
```

### Quick Disable (if just frontend issue)
```bash
# Disable multi-dimensional enhancement in chat.ts
# Change line ~975: `if (false && (projects.length > 0...))` 
# This skips enhancement without redeploying

git commit -am "Disable multi-dim enhancement pending investigation"
git push origin main
```

---

## Post-Deployment (Week 1)

### Day 1: Monitoring
- [ ] All alerts green
- [ ] No error spikes
- [ ] Response times normal
- [ ] User feedback channel open

### Day 2-3: Data Quality
- [ ] Sample 100 recommendations for accuracy
- [ ] Check dimension extraction correctness
- [ ] Verify scoring makes sense
- [ ] Review user feedback

### Day 4-5: Metrics Collection
- [ ] Confidence score distribution stabilized
- [ ] Recommendation acceptance rate measured
- [ ] Performance metrics at baseline
- [ ] Security audit clean

### Day 6-7: Team Retrospective
- [ ] What went well
- [ ] What we'd do differently
- [ ] Data backfill priority
- [ ] Phase 6 planning

---

## Data Backfill Timeline

**Week 1-2 (High Priority)**:
- women_safety_score (affects location recommendations)
- air_quality_index_avg (affects environmental fit)
- ongoing_litigation_count (affects legal scoring)

**Week 3-4 (Medium Priority)**:
- construction_quality_rating
- resale_lock_in_months
- nri_eligible flags

**Week 5+ (Nice-to-have)**:
- All remaining 33 fields

---

## Success Criteria

✅ **Launch Success**:
- [ ] Zero critical errors in first 24 hours
- [ ] >95% intent extraction success
- [ ] Average recommendation confidence >70
- [ ] Chat response time p95 <2s
- [ ] Zero regressions in existing features

✅ **Week 1 Success**:
- [ ] Recommendation acceptance >20%
- [ ] User feedback positive
- [ ] Confidence trending upward
- [ ] No scaling issues

✅ **Month 1 Success**:
- [ ] Confidence stabilized >75
- [ ] Conversion rate improves 10-15%
- [ ] Data quality at >80%
- [ ] Ready for Phase 6 (feedback loop)

---

## Contact & Escalation

**On-Call Engineer**: [TBD]
**Slack Channel**: #realtypals-multidim
**Issue Tracking**: GitHub Issues
**Escalation**: [CTO]

**If you see**: Take action:
- Error rate spike → Page on-call, check logs
- Confidence < 50 → Check LLM API status
- User complaints → Collect feedback, create issues
- Performance regression → Check database load

---

**Status**: Ready to deploy to staging immediately.
**Estimated Deployment Time**: 2 hours
**Estimated QA Duration**: 6-8 hours
**Go-Live Window**: Any time (no maintenance required)
