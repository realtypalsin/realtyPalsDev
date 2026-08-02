# Load Testing Plan

Phase 12: Pre-launch performance validation.

## Goals

1. Verify system handles 100+ concurrent users
2. Confirm latency < 2s at p95, < 5s at p99
3. Error rate < 0.5% under load
4. Cache hit rate reaches > 60% after warm-up
5. Identify bottlenecks before production

---

## Test Scenarios

### Scenario 1: Normal Load (Baseline)

**Profile:** Typical user behavior
- 100 concurrent users
- Each user: 1 request every 10 seconds
- Message types: 50% payment queries, 30% investment, 20% builder
- Duration: 10 minutes

**Expected Results:**
- Throughput: ~10 req/s
- Latency p50: < 1s
- Latency p95: < 2s
- Latency p99: < 3s
- Error rate: < 0.1%
- Cache hit rate: 50-70% (by end)

**Pass Criteria:**
- All latencies within targets
- Error rate < 0.1%
- No timeouts

---

### Scenario 2: Peak Load

**Profile:** Peak usage hours (e.g., evening when people browse)
- 300 concurrent users (3× baseline)
- Each user: 1 request every 5 seconds
- Message types: mixed intent distribution
- Duration: 5 minutes

**Expected Results:**
- Throughput: ~60 req/s
- Latency p50: < 1.5s
- Latency p95: < 4s
- Latency p99: < 8s
- Error rate: < 0.5%

**Pass Criteria:**
- Latency p95 < 4s (acceptable under peak)
- Error rate < 0.5%
- System recovers after peak ends

---

### Scenario 3: Burst Load (Stress Test)

**Profile:** Unexpected spike (viral moment, marketing campaign)
- 1000 concurrent users (10× baseline)
- Each user: 1 request every 2 seconds
- Duration: 2 minutes

**Expected Results:**
- System degrades gracefully
- Latency p95: < 8s (degraded but functional)
- Error rate: < 2%
- Cache hit rate: > 40%

**Pass Criteria:**
- No crashes
- Database doesn't exceed 80 connections
- System recovers after spike

---

### Scenario 4: Cache Warm-up

**Profile:** Measure cache effectiveness
- 50 concurrent users
- Same 100 project IDs queried repeatedly
- Duration: 5 minutes

**Expected Results:**
- Latency improves as cache warms (first 2 min = slow, last 3 min = fast)
- Cache hit rate: starts 0%, reaches 70%+

**Pass Criteria:**
- Hit rate reaches 60%+ by minute 3

---

### Scenario 5: Error Recovery

**Profile:** System robustness
- 50 concurrent users
- 10% of requests to invalid projects (not found)
- Message validation errors (too short, too long, spam patterns)
- Duration: 5 minutes

**Expected Results:**
- Invalid requests handled gracefully
- Returns "Contact team" or clarification questions
- No 500 errors
- Error rate < 1%

**Pass Criteria:**
- All errors return user-friendly messages
- No unhandled exceptions in logs

---

## Test Tools

### Recommended: k6

**Why:** Modern, scriptable, JSON output for analysis

**Install:**
```bash
curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz | tar xz
sudo mv k6 /usr/local/bin/
```

**Script template (k6-scenario.js):**

```javascript
import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE_URL = 'http://api.realtypals.com'
const PROJECTS = ['ats-pristine', 'godrej-aqua', 'lodha-upper-crust', ...]

const INTENTS = [
  { message: 'How much EMI for {project}?', type: 'payment' },
  { message: 'Is {project} a good investment?', type: 'investment' },
  { message: 'Tell me about {project} builder', type: 'builder' },
]

export const options = {
  vus: 100,           // Virtual users
  duration: '10m',    // Test duration
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],  // Latency targets
    http_req_failed: ['rate<0.001'],                   // Error rate < 0.1%
  },
}

export default function () {
  // Pick random project and intent
  const project = PROJECTS[Math.floor(Math.random() * PROJECTS.length)]
  const intent = INTENTS[Math.floor(Math.random() * INTENTS.length)]
  const message = intent.message.replace('{project}', project)

  // Send request
  const payload = JSON.stringify({
    message: message,
    sessionId: `session-${__VU}-${__ITER}`,
  })

  const response = http.post(`${BASE_URL}/chat`, payload, {
    headers: { 'Content-Type': 'application/json' },
  })

  // Verify response
  check(response, {
    'status is 200': (r) => r.status === 200,
    'latency < 2s': (r) => r.timings.duration < 2000,
    'response has components': (r) => r.body.includes('components'),
  })

  sleep(10)  // Wait 10 seconds between requests
}
```

**Run:**
```bash
k6 run k6-scenario.js --out json=results.json
```

**Output:** `results.json` with detailed latency/error metrics

---

## Manual Testing Checklist

Even with k6, verify manually:

- [ ] Single user query: latency < 1s
- [ ] Payment intent: EMI calculator renders with correct math
- [ ] Investment intent: chart displays historical prices
- [ ] Location intent: map shows area, amenities list visible
- [ ] Timeline intent: possession date, milestones correct
- [ ] Builder intent: track record, credibility score accurate
- [ ] Low confidence: shows "Contact team" message (not error)
- [ ] Missing project: clarification question offered
- [ ] Invalid input (spam): friendly error message
- [ ] Concurrent users: no race conditions, consistent results
- [ ] Cache clear: after data update, response reflects change
- [ ] Error recovery: after temporary outage, system recovers

---

## Performance Profiling

### Database Query Performance

**Before load test:**
```bash
# Enable query logging
psql $DATABASE_URL -c "ALTER SYSTEM SET log_min_duration_statement = 100;"  # Log queries > 100ms

# After load test: check slow queries
psql $DATABASE_URL -c "
  SELECT query, calls, total_time, mean_time
  FROM pg_stat_statements
  WHERE mean_time > 100
  ORDER BY mean_time DESC
  LIMIT 20;
"
```

**Expected:** Top queries should be < 200ms average

**If slow queries found:**
1. Run EXPLAIN ANALYZE on slow query
2. Check if missing indices
3. Add index if needed
4. Re-run load test to verify improvement

### Frontend Performance

**Before load test:**
```bash
# Measure component render times
# (Uses streamingOptimization.ts RenderMetrics)
```

**Expected:** Most components < 100ms

### Cache Hit Rate

**Monitor during test:**
```bash
redis-cli INFO stats | grep "hits\|misses"
```

**Expected:**
- Start: 0% hit rate
- Minute 1-2: 30-50% hit rate (warming)
- Minute 3+: 60-80% hit rate (warm)

---

## Benchmark Results (Expected)

| Metric | Value | Target |
|--------|-------|--------|
| Throughput | 10 req/s | OK |
| Latency p50 | 900ms | < 1s ✓ |
| Latency p95 | 1800ms | < 2s ✓ |
| Latency p99 | 4200ms | < 5s ✓ |
| Error rate | 0.08% | < 0.1% ✓ |
| Cache hit rate | 72% | > 60% ✓ |

---

## Bottleneck Analysis

**If latency > 2s:**
1. Check database query times (EXPLAIN ANALYZE)
2. Check Redis connection times (`redis-cli PING`)
3. Check LLM API response times (Sentry traces)
4. Add indices to slow queries
5. Increase cache TTLs

**If error rate > 0.1%:**
1. Check Sentry error logs
2. Identify error type (timeout, validation, database, LLM)
3. Check resource exhaustion (DB connections, memory)
4. Fix root cause, retry load test

**If cache hit rate < 60%:**
1. Check cache key distribution (are queries diverse?)
2. Increase Redis memory if evictions happening
3. Extend TTLs for volatile data (30min → 1hr)

---

## Load Test Execution Timeline

**Day 1 (Scenario 1 & 2):**
- Run baseline (100 users, 10 min)
- Run peak load (300 users, 5 min)
- Analyze results, compare to targets
- Document any issues

**Day 2 (Scenario 3 & 4):**
- Run burst load stress test (1000 users, 2 min)
- Run cache warm-up test (50 users, 5 min)
- Confirm cache behavior

**Day 3 (Scenario 5 & Profiling):**
- Run error recovery test (50 users, 5 min)
- Profile database queries (EXPLAIN ANALYZE)
- Profile frontend component render times
- Final results summary

---

## Pass/Fail Criteria

**PASS (Ready for production):**
- Latency p95 < 2s in normal load
- Error rate < 0.1%
- Cache hit rate > 60%
- No unhandled errors (500s)
- System recovers after spikes

**FAIL (Fix before launching):**
- Latency p95 > 3s (indicates bottleneck)
- Error rate > 0.5%
- Unhandled exceptions in logs
- Database connections exceeded
- Memory leak or crash

---

## Sign-Off

**Load Testing Date:** ________________

**Scenarios Run:** 
- [ ] Baseline (100 users, 10 min)
- [ ] Peak (300 users, 5 min)
- [ ] Burst (1000 users, 2 min)
- [ ] Cache warm-up (50 users, 5 min)
- [ ] Error recovery (50 users, 5 min)

**Results:**
- Latency p95: _______ ms (target < 2000 ms)
- Error rate: _______ % (target < 0.1%)
- Cache hit rate: _______ % (target > 60%)

**Outcome:** PASS / FAIL

**Issues Found:** ________________________________________________________________

**Fixes Applied:** ________________________________________________________________

**Signed:** _________________________ Date: _____________

**Ready to deploy:** YES / NO (circle one)
