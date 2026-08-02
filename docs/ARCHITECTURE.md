# Project Detail Pipeline Architecture

## High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Client (Web Browser)                                        │
└──────────────┬──────────────────────────────────────────────┘
               │ SSE Stream
┌──────────────▼──────────────────────────────────────────────┐
│ Frontend (Next.js)                                          │
│ - DiscoveryContent (SSE event handler)                      │
│ - MessageBubble (renders 'components' event)                │
│ - ComponentRenderer (renders spec array)                    │
└──────────────┬──────────────────────────────────────────────┘
               │ /chat POST {message, sessionId}
┌──────────────▼──────────────────────────────────────────────┐
│ Backend (Node.js Express)                                   │
│ routes/chat.ts                                              │
│ ├─ classifyIntent() → category: 'project_detail'           │
│ ├─ planProjectDetailQuery() → QueryPlan                    │
│ ├─ getProjectDataForQuery() → FactValidation[]             │
│ ├─ LLM reasoning → summary                                 │
│ └─ buildComponentResponse() → ComponentResponse            │
└──────────────┬──────────────────────────────────────────────┘
               │
        ┌──────┴──────┬──────────────┬─────────────────┐
        │             │              │                 │
   ┌────▼────┐  ┌────▼────┐   ┌────▼────┐      ┌────▼────┐
   │PostgreSQL│  │ Redis   │   │ LLM API │      │ Maps API│
   │Database  │  │ Cache   │   │(Groq)   │      │(Google) │
   └──────────┘  └────┬────┘   └─────────┘      └─────────┘
                      │
              ┌───────┴────────────┐
              │ Cached Queries:    │
              │ - gateway:*:*      │
              │ - plan:*           │
              │ - llm:*            │
              └────────────────────┘
```

## Data Flow

### Intent Classification
```
User: "How much EMI for ATS Pristine?"
         ↓
classifyIntent(message)
         ↓
{
  category: 'project_detail',
  projectDetail: {
    type: 'project_detail',
    detailType: 'payment',
    projectIdentifier: 'ATS Pristine',
    confidence: 0.95
  }
}
```

### Query Planning
```
planProjectDetailQuery({userMessage})
         ↓
{
  intent: 'payment',
  projectIds: ['ats-pristine'],
  requiredFields: ['price_min_cr', 'gst_rate_pct', 'stamp_duty_pct'],
  optionalFields: ['parking_cost_lakh'],
  tools: ['calculator', 'db'],
  confidence: 0.95,
  clarificationNeeded: false
}
```

### Data Fetching
```
getProjectDataForQuery({projectId, intent, requiredFields})
         ↓
{
  projectId: 'ats-pristine',
  found: true,
  data: {
    price_min_cr: {
      fact: 'base_price',
      value: 5000000,
      source: 'database',
      confidence: 0.98,
      validated: true
    },
    gst_rate_pct: {...},
    stamp_duty_pct: {...}
  },
  completeness: {
    complete: true,
    coverage: 1.0,
    missing: [],
    missingByImportance: {critical: [], optional: []}
  }
}
```

### Confidence Validation
```
computeResponseConfidence(facts) = 0.98
         ↓
if (confidence >= 0.65) {
  proceed to LLM
} else {
  return "Contact our team"
}
```

### LLM Reasoning
```
System: "You are a real estate advisor..."
Facts: price_min_cr: 5Cr, gst: 5%, stamp_duty: 7%
         ↓
LLM streams: "The monthly EMI would be approximately ₹35,000..."
```

### Component Building
```
buildComponentResponse({
  summary,
  confidence,
  facts,
  intent: 'payment'
})
         ↓
{
  summary: "...",
  confidence: 0.98,
  components: [
    {type: 'emi-calculator', props: {...}},
    {type: 'payment-breakdown', props: {...}}
  ],
  sources: ['database', 'calculator']
}
```

## Directory Structure

```
backend/
├── src/
│   ├── routes/
│   │   └── chat.ts              # Main entry point
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── intentClassifier.ts
│   │   │   └── prompts/
│   │   ├── discovery/
│   │   │   ├── queryPlanner.ts
│   │   │   ├── queryPlanner.guards.ts
│   │   │   └── componentSpec.ts
│   │   ├── projectDataGateway.ts
│   │   ├── projectDataGateway.guards.ts
│   │   ├── projectDataGateway.cache.ts
│   │   ├── queryOptimizer.ts
│   │   └── db.ts
│   └── types/
│       └── property.ts
│
frontend/
├── components/
│   ├── chat/
│   │   ├── MessageBubble.tsx
│   │   └── DiscoveryContent.tsx
│   ├── ComponentRenderer.tsx
│   └── ComponentRenderer.guards.ts
├── lib/
│   ├── backend-api.ts
│   └── streamingOptimization.ts
└── types/
    └── property.ts
```

## Database Schema (Key Tables)

```sql
-- Projects
CREATE TABLE project (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  builder_id TEXT,
  status TEXT,
  price_min_cr DECIMAL,
  possession_date DATE,
  -- Many more fields...
);

-- Indices for optimization
CREATE INDEX idx_project_status ON project(status);
CREATE INDEX idx_project_price ON project(price_min_cr);
CREATE INDEX idx_project_builder ON project(builder_id);
```

## Caching Strategy

### 3-Tier Cache

1. **Gateway Cache** (in-memory, 1hr)
   - Key: `{projectId}:{intent}:{fields}`
   - TTL: 1hr (stable) / 30min (volatile)
   - Hit rate target: > 70%

2. **Query Planner Cache** (in-memory, 30min)
   - Key: normalized message
   - Prevents re-planning similar queries
   - Hit rate target: > 40%

3. **LLM Response Cache** (in-memory, 2hr)
   - Key: `{intent}:{factKeys}`
   - Avoids redundant summarization

### Cache Invalidation

```
Data Update → Invalidate Gateway Cache
  INVALID: {projectId}:*:*
  
Rare: FLUSH entire cache
  redis-cli FLUSHDB ASYNC
```

## Performance Tiers

| Component | Latency | Cacheable |
|-----------|---------|-----------|
| Intent Classification | < 50ms | No |
| Query Planning | < 100ms | Yes (30min) |
| Data Fetch | 150-250ms | Yes (1hr) |
| LLM Reasoning | < 1000ms | Yes (2hr) |
| Component Build | < 50ms | No |
| **Total** | **< 2000ms** | **✓** |

## Error Handling Strategy

```
User Input
  ↓ (validate)
Clarification Needed? → Return question
  ↓
Project Found? → Return suggestion
  ↓
Fields Available? → Return partial data notice
  ↓
Confidence ≥ 0.65? → Return contact message
  ↓
LLM Timeout? → Fallback summary
  ↓
Success → Components response
```

## Concurrency & Rate Limiting

- **Request Deduplication**: Multiple identical requests → single fetch
- **Query Batching**: Coalesce requests in 10ms windows
- **Rate Limiting**: 1 req/sec per project
- **Burst Limit**: 5 concurrent per user
- **Timeout**: 5s query, 1s LLM, 3s total

## Monitoring & Observability

### Instrumented Points

```
- Intent classification (latency, success rate)
- Query planning (latency, cache hit rate)
- Data fetching (latency, confidence score, completeness)
- LLM reasoning (latency, timeout rate, token count)
- Component rendering (latency per component type)
- Overall (end-to-end latency, error rate)
```

### Key Dashboards

1. **Latency Dashboard**
   - p50, p95, p99 per intent type
   - Identify slow intents

2. **Error Dashboard**
   - Error rate by type (missing project, low confidence, LLM timeout)
   - Identify failure patterns

3. **Cache Dashboard**
   - Hit rates per cache layer
   - Eviction patterns
   - Memory usage

4. **Confidence Dashboard**
   - Distribution of confidence scores
   - Identify data quality issues

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│ Load Balancer (Vercel / CloudFront)     │
└────────────┬────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼────┐      ┌────▼────┐
│API Pod1│      │API Pod2  │
└───┬────┘      └────┬─────┘
    │                │
    └────────┬───────┘
             │
        ┌────▼─────────────┐
        │PostgreSQL Master │
        │    (w/ replicas) │
        └──────────────────┘
             │
        ┌────▼──────┐
        │Redis (HA) │
        └───────────┘
```

## Related Docs
- [API Documentation](./API_PROJECT_DETAIL.md)
- [Deployment Runbook](./DEPLOYMENT_RUNBOOK.md)
- [Operations Manual](./OPERATIONS_MANUAL.md)
