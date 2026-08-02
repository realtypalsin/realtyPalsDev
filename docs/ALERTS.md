# Alerts Configuration

Sentry alerts for error tracking, performance, and releases.

## Alert Rules

### Error Rate Spike

**When:** Error rate > 1% (5min window) OR > 0.5% (30min window)

**Condition:**
```
(error_count / total_requests) > 0.01 AND time_window = 5min
```

**Action:**
1. Page on-call engineer
2. Check `/health/deep` for component status
3. Review Sentry error list
4. Check recent deployments

**Runbook:** See OPERATIONS_MANUAL.md → Troubleshooting → High Error Rate

---

### New Issue

**When:** First error of a new type occurs

**Examples:**
- `TypeError: Cannot read property 'x' of undefined` (first time)
- `DatabaseError: Connection timeout` (new pattern)
- `APIError: 502 Bad Gateway` (new endpoint failure)

**Action:**
1. Sentry auto-creates issue + notification
2. Review stack trace
3. Assign to on-call engineer
4. Check if related to recent changes

**Frequency:** Often during active development, should be rare in production

---

### Issue Regression

**When:** Previously resolved error re-occurs in same version OR new version

**Example:**
- Fixed bug in v1.0.1, same error appears in v1.0.2 (regression)

**Action:**
1. Sentry marks issue as regressed
2. Page on-call engineer
3. Investigate: what changed between versions?
4. Possible: unrelated error, coincidence

---

### High Velocity Issues

**When:** > 10 errors/min for the same issue

**Condition:**
```
(error_count / time_period) > 10 errors/min
```

**Action:**
1. Immediate page to on-call
2. Check `/health/ready` → if 503, traffic still routing (scale down / disable)
3. Prepare rollback (previous working version)
4. Investigate root cause while users impacted

**Escalation:** If velocity continues after 5 min, escalate to engineering manager

---

### Slow Transactions

**When:** Transaction p95 latency > 5 seconds OR p99 > 10 seconds

**Condition:**
```
transaction_duration_ms { quantile="0.95" } > 5000
```

**Examples:**
- Chat endpoint consistently slow (> 5s)
- Data gateway queries timing out
- LLM responses delayed

**Action:**
1. Check `/health/deep` for component latency
2. Review slow queries: `SELECT query, calls, total_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10`
3. Check cache hit rate (POST ANALYTICS)
4. Monitor: if sustained, scale database or add indices

**Runbook:** See OPERATIONS_MANUAL.md → Troubleshooting → High Latency

---

## Sentry Alert Configuration

### Create Alert (Sentry UI)

1. Project → Alerts → Create Alert Rule
2. Name: "Error Rate Spike"
3. Conditions:
   - When: `error.value > 100` AND `event.environment equals production`
   - Time window: 5 minutes
4. Actions:
   - Send to: PagerDuty
   - Escalation: Critical

### Notification Destinations

| Alert Type | Destination | Escalation |
|------------|-------------|-----------|
| New issue | Slack #incidents | 30 min if unassigned |
| Error spike | PagerDuty (P1) | Immediate page |
| Slow transactions | Slack #performance | None (informational) |
| Release regression | Slack #deployments | 1hr if recent deploy |

### PagerDuty Integration

1. Sentry → Settings → Integrations → PagerDuty
2. Connect PagerDuty service
3. Map severity:
   - P1 Critical: Error rate spike, high velocity
   - P2 High: Database down, regression
   - P3 Medium: Slow transactions, new low-impact issues

---

## Health Check Alerts

### Kubernetes-Level Alerts

Handled by Kubernetes readiness/liveness probes (automatic restart).

### External Monitoring Alerts

Poll `/health/deep` every 60s:

```bash
#!/bin/bash
curl -s "http://api.realtypals.com/health/deep" | jq '
  if .status == "unhealthy" then
    "ALERT: System unhealthy (database)"
  elif .database.latencyMs > 1000 then
    "WARNING: Database slow (" + (.database.latencyMs | tostring) + "ms)"
  else
    "OK"
  end
'
```

Alert thresholds:

| Metric | Warning | Critical |
|--------|---------|----------|
| Database latency | > 500ms | > 1000ms |
| Redis latency | > 200ms | > 500ms |
| LLM latency | > 1000ms | > 2000ms |
| Any component unhealthy | - | Immediate |

---

## PostHog Analytics Alerts

No real-time alerts in PostHog (reactive dashboard only).

**Manual reviews (daily):**
- [ ] Confidence score average (target > 0.85)
- [ ] Cache hit rate (target > 70%)
- [ ] LLM error rate (target < 1%)
- [ ] Low confidence rate (target < 5%)

**Weekly review:**
- [ ] Most common errors
- [ ] Performance trends (latency improving/degrading?)
- [ ] Intent distribution (organic vs expected)
- [ ] Component usage (which are most valuable?)

---

## On-Call Procedures

### Page Received: "Error Rate Spike"

1. Acknowledge in PagerDuty (1 min)
2. Check Sentry dashboard: top errors
3. Check `/health/deep`: which component?
4. Check logs: any pattern?
5. If obvious: apply fix or rollback
6. If unclear: escalate to engineer on call

**Time to first response:** < 5 min

---

### Page Received: "New Issue"

1. Check Sentry: is this real or noise?
2. Reproduce: try to trigger locally
3. Assign to engineer
4. If blocking users: prepare rollback

**Time to first response:** < 15 min (next business day if off-hours and low-impact)

---

### Page Received: "Slow Transactions"

1. Check `/health/deep` → is database slow?
2. Run query analysis: `SELECT query FROM pg_stat_statements WHERE mean_time > 100 ORDER BY mean_time DESC`
3. Check cache hit rate
4. If transient: monitor for 5 min
5. If sustained: scale up or add index

**Time to first response:** < 10 min (informational, not critical)

---

## Escalation Paths

### Critical (P1)

- Error rate > 2%
- High velocity issue (> 100 errors/min)
- Database completely down
- Unable to serve requests

**Escalation:**
1. Page on-call engineer
2. If no response in 5 min: page on-call manager
3. If not resolved in 10 min: page engineering lead

---

### High (P2)

- Error rate > 0.5%
- Database latency > 1000ms
- Redis unavailable
- Recent regression

**Escalation:**
1. Page on-call engineer
2. If no response in 15 min: page on-call manager

---

### Medium (P3)

- Transaction latency > 5s but not > 10s
- New low-impact error
- Cache hit rate degraded

**Escalation:**
1. Slack #performance (non-urgent)
2. Review in next standup

---

## Testing Alerts

### Test Error Spike Alert

```bash
# Trigger many errors in short window
for i in {1..100}; do
  curl -X POST http://api.realtypals.com/chat \
    -H "Content-Type: application/json" \
    -d '{"message":"invalid {{{","sessionId":"test"}'
  sleep 0.1
done
```

### Test Health Check Alert

```bash
# Temporarily stop database
systemctl stop postgresql

# Check alert fires within 60s
# Resume database
systemctl start postgresql
```

### Test Slow Transaction Alert

```bash
# Trigger slow query (add sleep in query planner)
# Watch Sentry latency dashboard
# Verify alert fires when p95 > 5s
```

---

## Disabling Alerts

**Temporary (during maintenance):**

Sentry → Project Settings → Alerts → Disable for 1 hour

**Permanent (no longer needed):**

Sentry → Alerts → Delete rule

---

## Related Docs

- [Monitoring & Analytics](./MONITORING.md) — Setup guide
- [Operations Manual](./OPERATIONS_MANUAL.md) — Runbooks and procedures
- [Health Checks API](./HEALTH_CHECKS.md) — Health endpoint reference
