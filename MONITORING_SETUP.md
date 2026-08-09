# Multi-Dimensional System - Monitoring & Observability Setup

## Logging Strategy

### Structured Logging (Every Phase)

```typescript
// Phase 1: Intent Extraction
console.log('[MULTI_DIM:PHASE1:STARTED]', { messageLength: msg.length, timestamp: new Date() })
console.log('[MULTI_DIM:PHASE1:COMPLETE]', {
  budget: intent.financial?.budgetMin,
  sector: intent.location?.sectorPreference,
  confidenceAvg: avg(dimensionConfidences),
  degraded: intentDegraded,
  duration_ms: Date.now() - start
})

// Phase 2-3: Scoring & Query
console.log('[MULTI_DIM:PHASE2-3:STARTED]', { projectCount: projects.length })
console.log('[MULTI_DIM:PHASE2-3:COMPLETE]', {
  projectsScored: rankedProjects.length,
  avgScore: avg(scores),
  topScore: Math.max(...scores),
  duration_ms: Date.now() - start
})

// Phase 4: Formatting
console.log('[MULTI_DIM:PHASE4:STARTED]', { projectCount: rankedProjects.length })
console.log('[MULTI_DIM:PHASE4:COMPLETE]', {
  recommendationCount: recommendations.length,
  dealBreakersFound: dealBreakersDetected,
  duration_ms: Date.now() - start
})

// Integration
console.log('[MULTI_DIM:INTEGRATION:RESPONSE]', {
  intentConfidence: result.confidence.intentConfidence,
  rankingConfidence: result.confidence.rankingConfidence,
  overallConfidence: result.confidence.overallConfidence,
  totalDuration_ms: Date.now() - pipelineStart
})
```

### Dashboard Queries

**Datadog/New Relic**:
```
// Success Rate
avg:trace.multi_dim_phase1_complete{status:success} / avg:trace.multi_dim_phase1_started
avg:trace.multi_dim_integration_response{} 

// Latency
p50:trace.multi_dim_integration_response{duration_ms}
p95:trace.multi_dim_integration_response{duration_ms}
p99:trace.multi_dim_integration_response{duration_ms}

// Confidence Scores
avg:trace.multi_dim_integration_response{overall_confidence}
distribution:trace.multi_dim_integration_response{overall_confidence}

// Error Rate
count:trace.multi_dim_phase1_complete{status:error} / count:trace.multi_dim_integration_response
```

---

## Key Performance Indicators (KPIs)

### Real-Time Metrics

| Metric | Target | Alert Threshold | Check Frequency |
|--------|--------|-----------------|-----------------|
| Intent Extraction Success | >99% | <95% | Every 1 min |
| Avg Confidence Score | >75 | <60 | Every 5 min |
| P95 Response Time | <2s | >3s | Every 1 min |
| Error Rate | <0.1% | >1% | Every 1 min |
| Projects Scored | N/A | Monitor trend | Every 5 min |

### Business Metrics

| Metric | Baseline | Target | Check Frequency |
|--------|----------|--------|-----------------|
| Recommendation Acceptance | 0% (new) | >20% | Daily |
| Avg Confidence Trend | — | ↑ 75+ | Daily |
| Conversion Rate | TBD | +10-15% | Weekly |
| User Satisfaction | TBD | >4/5 stars | Weekly |

---

## Alert Rules

### CRITICAL - Page On-Call Immediately

```
1. Error Rate > 1% for 5 minutes
   Action: Check error logs, rollback if systemic
   
2. P99 Response Time > 3 seconds for 10 minutes
   Action: Check database load, scale if needed
   
3. Intent Extraction Success < 95% for 5 minutes
   Action: Check LLM API status, try fallback provider
   
4. All scoring scores = 0 (all projects filtered)
   Action: Check for database corruption, verify schema
```

### HIGH - Page On-Call Within 30 Minutes

```
5. Avg Confidence Score < 60
   Action: Review intent extraction quality, check data gaps
   
6. P95 Response Time > 1.5 seconds for 20 minutes
   Action: Optimize query, check cache hit rate
   
7. Recommendation Acceptance Rate < 15% after day 1
   Action: Review scoring weights, gather user feedback
```

### MEDIUM - Notify Team

```
8. Memory Usage > 80% for 10 minutes
   Action: Check for leaks, restart service if sustained
   
9. CPU > 70% for 20 minutes
   Action: Profile scoring bottleneck, optimize algorithm
   
10. Data Quality Degradation (>30% fields missing)
    Action: Check data source pipeline, prioritize backfill
```

---

## Health Check Endpoints

### API Health
```bash
# Every 30 seconds from load balancer
GET /api/health
Response: {
  "status": "healthy",
  "multi_dimensional": {
    "last_extraction_success": true,
    "avg_confidence": 76,
    "p95_latency_ms": 1240,
    "error_rate_percent": 0.02,
    "uptime_percent": 99.97
  }
}
```

### Database Health
```bash
# Every 5 minutes
SELECT 
  COUNT(*) as project_count,
  COUNT(CASE WHEN resale_lock_in_months IS NOT NULL THEN 1 END) as backfilled_fields,
  MAX(updated_at) as last_update
FROM "Project";
```

### Cache Health
```bash
# Every 1 minute
REDIS GET sector_stats_cache_hitrate
Expected: >80% hit rate for sector stats
```

---

## Debug Commands

### View Real-Time Logs
```bash
# All multi-dimensional logs
tail -f /var/log/realtypals/api.log | grep MULTI_DIM

# Errors only
tail -f /var/log/realtypals/api.log | grep -E "\[ERROR\].*MULTI_DIM"

# Performance logs
tail -f /var/log/realtypals/api.log | grep MULTI_DIM | grep -E "duration_ms|latency"
```

### Trace a Specific Request
```bash
# Find request ID
grep "user_message=.*3BHK" /var/log/realtypals/api.log

# Follow all logs for that request
grep "REQUEST_ID=abc123" /var/log/realtypals/api.log
```

### Check System Health
```bash
# Database connection pool
psql -h aws-1-ap-south-1.pooler.supabase.com -c "SELECT count(*) FROM pg_stat_activity;"

# Memory usage
free -h && ps aux | grep node | grep -v grep

# CPU usage
top -b -n 1 | head -20
```

---

## Weekly Review Process

### Monday Morning Standup
1. Check incidents from past week
2. Review KPI trends
3. Discuss user feedback
4. Plan any data backfill
5. Adjust alert thresholds if needed

### Weekly Metrics Report
```markdown
## Week of Aug 9, 2026

### System Health
- Uptime: 99.98%
- Error Rate: 0.08%
- Avg Response Time: 845ms

### Confidence Trends
- Day 1: 62 (new system, learning)
- Day 2: 68 (improving)
- Day 3: 71 (stabilizing)
- Day 4-5: 74-76 (mature)
- Day 6-7: 75-77 (stable)

### Business Metrics
- Recommendations made: 1,247
- Acceptance rate: 18% (target: 20%)
- Conversions: 44 leads (TBD baseline)
- User satisfaction: 4.2/5 stars (n=87)

### Data Quality
- Fields populated: 12/43
- Priority backfill complete: 4/4
- Schema validation: PASS

### Incidents
- None critical
- 1 high: p99 spike on day 2 (resolved)

### Action Items
- [ ] Backfill women_safety_score
- [ ] Review why acceptance < 20%
- [ ] Optimize dimension weights by user feedback
```

---

## Runbook: Common Issues

### Issue: Error Rate Spiking
```
1. Check logs: tail -f | grep ERROR
2. Is it LLM API? Check Gemini/OpenAI status
3. Is it Database? Check connections, query logs
4. Is it New Code? Git log to find recent changes
5. Rollback if needed: git revert HEAD && npm run deploy:prod
```

### Issue: Low Confidence Scores
```
1. Check intent extraction: Is it degraded (fallback)?
2. Check data quality: Are connectivity fields populated?
3. Check scoring weights: Are they tuned for user base?
4. Ask users: Are recommendations actually bad or scoring conservative?
5. Adjust threshold: May be OK at 60 if accuracy is good
```

### Issue: Slow Response Times
```
1. Check database: SELECT COUNT(*) FROM pg_stat_activity
2. Check query plan: EXPLAIN ANALYZE on the scoring query
3. Check cache: Is sector_stats_cache being used?
4. Scale: Add more connection pools or read replicas
5. Optimize: Pre-compute scores for common intents
```

### Issue: Memory Leak
```
1. Monitor: ps aux | grep node (is RSS growing?)
2. Check code: Any unbounded arrays or circular refs?
3. Check logs: Are objects being cached indefinitely?
4. Solution: Restart service (temporary), fix code (permanent)
5. Verify: Monitor RSS growth after fix
```

---

## Alerting Channels

**Production Alerts** → PagerDuty
**On-Call Rotation** → [TBD]
**Team Slack** → #realtypals-multidim
**Incident Channel** → #incidents
**User Feedback** → #customer-feedback

---

## Monthly Review & Optimization

**End of Month**:
- [ ] Compile all metrics
- [ ] Review all incidents
- [ ] Analyze user feedback
- [ ] Plan optimizations for next sprint
- [ ] Update alerting thresholds based on baseline
- [ ] Document lessons learned

---

**Status**: Ready to enable on production launch.
**Setup Effort**: 4-6 hours (Datadog/New Relic integration)
**Maintenance**: 30 min/day for first week, then 10 min/day
