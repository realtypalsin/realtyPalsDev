# Health Checks API Reference

Four endpoints for system health monitoring.

## Endpoints

### GET /health

**Quick health check** — used by load balancers to determine if pod is healthy.

**Response:**
- `200 OK` — system healthy, ready to serve requests
- `503 Service Unavailable` — database unhealthy, do not route requests

```json
{
  "status": "healthy",
  "service": "realtypals-backend",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Latency:** < 100ms (queries database only)

**Use case:** Kubernetes liveness probe, load balancer health checks

---

### GET /health/deep

**Deep health check** — detailed component status for monitoring dashboards.

**Response:**
- `200 OK` — system healthy or degraded (but serving requests)
- `503 Service Unavailable` — system unhealthy, investigate immediately

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": {
    "status": "healthy",
    "latencyMs": 45,
    "lastError": null
  },
  "redis": {
    "status": "healthy",
    "latencyMs": 12,
    "lastError": null
  },
  "llm": {
    "status": "healthy",
    "latencyMs": 89,
    "lastError": null
  },
  "responseTime": {
    "totalMs": 200,
    "databaseMs": 45,
    "redisMs": 12,
    "llmMs": 89
  }
}
```

**Status values:**
- `"healthy"` — component responding normally
- `"degraded"` — component slow but functional
- `"unhealthy"` — component not responding or erroring

**Latency thresholds:**
- Database: healthy < 500ms, degraded 500-1000ms, unhealthy > 1000ms
- Redis: healthy < 200ms, degraded 200-500ms, unhealthy > 500ms
- LLM: healthy < 1000ms, degraded 1000-2000ms, unhealthy > 2000ms

**Latency:** < 3 seconds (worst-case parallel queries + timeouts)

**Use case:** Grafana dashboards, monitoring platforms, ops investigation

---

### GET /health/ready

**Readiness check** — Kubernetes readiness probe. Pod is ready to serve traffic.

**Response:**
- `200 OK` — ready to serve
- `503 Service Unavailable` — not ready (draining traffic)

```json
{
  "ready": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Condition:** ready = true if database is healthy

**Use case:** Kubernetes readiness probe (drains traffic from unhealthy pods)

**Note:** Pod stays running (doesn't restart) if /ready returns 503. Use /live for restarts.

---

### GET /health/live

**Liveness check** — Kubernetes liveness probe. Pod process is alive.

**Response:**
- `200 OK` — process running

```json
{
  "alive": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Condition:** Always true (process-level check only)

**Use case:** Kubernetes liveness probe (restarts pod if unresponsive)

---

## Which Endpoint to Use?

| Scenario | Endpoint | Expectation |
|----------|----------|-------------|
| Load balancer routing decisions | `/health` | 200 or 503 within 100ms |
| Kubernetes readiness | `/health/ready` | 200 (ready) or 503 (draining) |
| Kubernetes liveness | `/health/live` | 200 (alive) |
| Ops dashboard/investigation | `/health/deep` | Detailed component status |
| Custom monitoring script | `/health/deep` | Poll every 60s, alert on unhealthy |

---

## Kubernetes Configuration

### Liveness Probe (restarts pod if dead)

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3  # Restart after 3 failures (30s)
```

### Readiness Probe (drains traffic if not ready)

```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 5
  failureThreshold: 2  # Drain traffic after 2 failures (10s)
```

### Startup Probe (optional, for slow startup)

```yaml
startupProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 0
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 30  # Wait up to 300s for startup
```

---

## Monitoring & Alerting

### Poll Interval

- Load balancer: 10-30s (default)
- Kubernetes liveness: 10s (default)
- Custom monitoring: 60s recommended
  - Allows transient failures to self-heal
  - Reduces false positives

### Alert Rules

Create alerts when:

| Condition | Severity | Action |
|-----------|----------|--------|
| Database unhealthy | P1 Critical | Page on-call, investigation |
| Database latency > 1000ms | P2 High | Check logs, query performance |
| Redis unhealthy | P2 High | Check Redis service, memory |
| LLM latency > 2000ms | P3 Medium | Monitor LLM API, fallbacks working |
| All components degraded | P2 High | Possible performance issue, scale |

### Sample Monitoring Script

```bash
#!/bin/bash

check_health() {
  local url="$1"
  local response=$(curl -s -w "\n%{http_code}" "$url")
  local body=$(echo "$response" | head -n -1)
  local status=$(echo "$response" | tail -n 1)

  if [ "$status" != "200" ]; then
    echo "ALERT: Health check failed at $url (HTTP $status)"
    return 1
  fi

  # Parse JSON response
  local db_status=$(echo "$body" | jq -r '.database.status')
  if [ "$db_status" = "unhealthy" ]; then
    echo "ALERT: Database unhealthy"
    return 1
  fi

  echo "OK: $url healthy"
  return 0
}

# Run check every 60s
while true; do
  check_health "http://api.realtypals.com/health/deep"
  sleep 60
done
```

---

## Troubleshooting

### Health check returns 503

1. Check database: `psql $DATABASE_URL -c "SELECT 1"`
2. Check Redis: `redis-cli PING`
3. Check logs: `tail -100 /var/log/realtypals/api.log | grep ERROR`

### Database unhealthy but app seems ok

1. Database connection pool exhausted: Check `SELECT * FROM pg_stat_activity`
2. Query hanging: Run `SELECT * FROM pg_stat_statements WHERE state = 'active'`
3. Restart service: `systemctl restart realtypals-api` (to clear pool)

### Redis unhealthy but data cached correctly

1. Redis memory issue: `redis-cli INFO memory | grep used_memory_human`
2. Connection limit: `redis-cli CLIENT LIST | wc -l`
3. Restart Redis: `systemctl restart redis`

### LLM check slow (> 2000ms)

1. Check Groq API status: `curl https://api.groq.com/status`
2. Check network: `curl -v -w "Time: %{time_total}s\n" https://api.groq.com/health`
3. This is expected during peak hours; doesn't block requests (LLM is optional)

---

## Metrics to Track

From `/health/deep` responses, track:

```
health_check_total_ms (histogram)
health_database_ms (histogram)
health_redis_ms (histogram)
health_llm_ms (histogram)
health_status (gauge: healthy=1, degraded=0.5, unhealthy=0)
```

Example Prometheus scrape:

```yaml
scrape_configs:
  - job_name: 'realtypals-health'
    static_configs:
      - targets: ['api.realtypals.com']
    metrics_path: '/health/deep'
    scrape_interval: 60s
```

---

## Related Docs

- [Monitoring & Analytics](./MONITORING.md) — Full monitoring setup
- [Operations Manual](./OPERATIONS_MANUAL.md) — Troubleshooting procedures
- [Deployment Runbook](./DEPLOYMENT_RUNBOOK.md) — Health checks in deployment
