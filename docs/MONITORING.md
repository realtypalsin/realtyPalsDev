# Monitoring & Analytics Setup

Phase 11: Hybrid monitoring stack — PostHog (analytics) + Sentry (errors) + custom health checks.

## Overview

**PostHog:** User behavior tracking, intent distribution, confidence scores, component usage
**Sentry:** Error aggregation, performance monitoring, Source Maps
**Health Checks:** Database, Redis, LLM connectivity + response times

## Environment Variables

```bash
# PostHog
POSTHOG_API_KEY=phc_xxxxx
POSTHOG_HOST=https://us.posthog.com
NEXT_PUBLIC_POSTHOG_API_KEY=phc_xxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.posthog.com

# Sentry
SENTRY_DSN=https://xxx@sentry.io/123456
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/123456
SENTRY_ORG=realtypals
SENTRY_PROJECT=backend
```

## Backend Setup

### PostHog Events Tracked

Intent & Query:
- `intent_classified` — user intent + confidence score
- `query_planned` — query plan details
- `project_found` / `project_not_found` — search result

Data & Confidence:
- `data_fetched` — gateway response metrics
- `confidence_computed` — final confidence score
- `low_confidence` — < 0.65 threshold
- `missing_fields` — required fields not available

Components:
- `components_rendered` — component specs sent to frontend
- `component_error` — rendering failed

LLM:
- `llm_called` — LLM invoked with facts
- `llm_timeout` — LLM timeout fallback
- `llm_error` — LLM error details

Cache:
- `cache_hit` / `cache_miss` — cache performance

Errors:
- `api_error` — validation/processing errors
- `database_error` — connection/query errors
- `validation_error` — input validation failures

Performance:
- `request_completed` — end-to-end latency
- `request_slow` — latency > 3s

### Sentry Instrumentation

```typescript
import { captureException, setSentryUser, addBreadcrumb } from '@/sentry.server.config'

// Set user context
setSentryUser(userId, email, username)

// Log breadcrumbs for tracing
addBreadcrumb('data_gateway', 'Fetching project data', 'info', { projectId, intent })

// Capture errors with context
captureException(err, { stage: 'query_planning', intent })
```

### Initialization

In `server.ts`:

```typescript
import { initSentryServer, sentryRequestHandler, sentryErrorHandler } from '@/sentry.server.config'
import { initPostHog } from '@/lib/monitoring/posthog'
import { initRedisForHealth } from '@/lib/monitoring/healthChecks'

// Initialize monitoring
initSentryServer()
const posthog = initPostHog()

// Register Sentry middleware
app.use(sentryRequestHandler())
// ... routes ...
app.use(sentryErrorHandler())

// Health check init
initRedisForHealth(process.env.REDIS_URL)

// Graceful shutdown
process.on('SIGTERM', async () => {
  await posthog.flush()
  await flushSentry()
})
```

## Frontend Setup

### PostHog Events Tracked

Navigation:
- `page_viewed` — route changed
- `search_started` — user begins property search
- `property_clicked` — property card clicked
- `property_saved` / `property_removed_from_saved`
- `comparison_started` — comparison view entered
- `comparison_added_property` — property added to comparison

Chat:
- `chat_message_sent` — user sends message
- `chat_confidence_badge_viewed` — confidence badge shown
- `components_rendered` — components display count
- `component_interacted` — user clicked component (EMI calc, map, etc.)

Forms:
- `callback_request_started` / `submitted`
- `site_visit_request_started` / `submitted`

Performance:
- `component_render_time` — per-component render latency
- `page_load_time` — route load time
- `api_latency` — backend response time

Errors:
- `error_occurred` — frontend error caught

### Initialization

In `layout.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { initPostHog, identifyUser } from '@/lib/monitoring/posthog'
import { initSentryClient, setSentryUser } from '@/sentry.client.config'
import { useSession } from 'better-auth/react'

export default function RootLayout({ children }) {
  const { data: session } = useSession()

  useEffect(() => {
    initPostHog()
    initSentryClient()

    // Identify user
    if (session?.user) {
      identifyUser(session.user.id, {
        email: session.user.email,
        createdAt: session.user.createdAt,
      })
      setSentryUser(session.user.id, session.user.email)
    }
  }, [session])

  return ...
}
```

### Example Event Tracking

```typescript
import { trackEvent, FRONTEND_EVENTS } from '@/lib/monitoring/posthog'

// Track intent
trackEvent(FRONTEND_EVENTS.CHAT_MESSAGE_SENT, {
  messageLength: message.length,
  intent: 'payment',
})

// Track component interaction
trackEvent(FRONTEND_EVENTS.COMPONENT_INTERACTED, {
  componentType: 'emi-calculator',
  projectId: 'ats-pristine',
  duration: 4500, // ms in calculator
})
```

## Health Checks

### Endpoints

- `GET /health` — quick check (200 or 503)
- `GET /health/deep` — detailed component health
- `GET /health/ready` — Kubernetes readiness
- `GET /health/live` — Kubernetes liveness

### Response Format

```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": {
    "status": "healthy",
    "latencyMs": 45
  },
  "redis": {
    "status": "healthy",
    "latencyMs": 12
  },
  "llm": {
    "status": "healthy",
    "latencyMs": 89
  },
  "responseTime": {
    "totalMs": 200,
    "databaseMs": 45,
    "redisMs": 12,
    "llmMs": 89
  }
}
```

### Degradation Thresholds

- **Database:** > 1000ms = degraded, error = unhealthy
- **Redis:** > 500ms = degraded, error = unhealthy
- **LLM:** > 2000ms = degraded, error = unhealthy

## Dashboards

### PostHog Dashboard

#### Intent Distribution
- Chart: intent types over time
- Breakdown: payment / investment / location / timeline / builder / details
- Filter: date range, intent type

#### Confidence Scores
- Histogram: confidence distribution
- Breakdown: by intent type
- Alerts: < 0.65 threshold rate

#### Component Usage
- Table: component render counts
- Trending: which components most used
- Performance: avg render time per type

#### Cache Hit Rate
- Gauge: overall hit rate target > 70%
- Breakdown: by cache layer (gateway/planner/llm)
- Trends: hit rate over time

### Sentry Dashboard

#### Error Rate
- Time series: errors/sec
- Breakdown: by error type
- Top errors: most frequent (last 24h, 7d)

#### Performance
- Latency: p50, p95, p99
- Slowest transactions: queries/LLM/gateway
- Trending: response time over time

#### Release Tracking
- Errors by release (compare v1.0.0 vs v1.0.1)
- Regression detection: new errors in release

## Alerting

### PostHog Alerts

None (PostHog insights are reactive, not real-time)

### Sentry Alerts

Create alerts in Sentry for:
- Error rate > 1% (5min window)
- New issue (first occurrence)
- Issue regression (same error, after resolved)
- High velocity issues (10+ errors/min)
- Slow transactions (p95 latency > 5s)

### Health Check Alerts

Kubernetes will restart pod if:
- `/health/ready` returns 503 for 3 consecutive checks (30s)
- `/health/live` unresponsive for 60s

For external alerting (PagerDuty):
- Poll `/health/deep` every 60s
- Alert if status = "unhealthy" or database latency > 1000ms

## Best Practices

1. **User Identification:** Always track userId when available
2. **Breadcrumbs:** Add breadcrumbs in critical paths (data gateway, LLM) for debugging
3. **Sampling:** Production = 10% traces (tracesSampleRate: 0.1)
4. **Performance:** Track component render times, not just errors
5. **Context:** Add structured context to errors (stage, intent, projectId)
6. **Privacy:** Never track PII beyond email; use aliases for privacy
7. **Cleanup:** Remove console.logs before production deployment

## Performance Targets

- Health check total: < 500ms
- Database check: < 100ms
- Redis check: < 50ms
- LLM check: < 300ms (lightweight list endpoint)

## Related Docs

- [Operations Manual](./OPERATIONS_MANUAL.md) — Monitoring thresholds and runbooks
- [Health Checks API](./HEALTH_CHECKS.md) — Detailed endpoint reference
- [Alerts Configuration](./ALERTS.md) — Alert rules and escalation
