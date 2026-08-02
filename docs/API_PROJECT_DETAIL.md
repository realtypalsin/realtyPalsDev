# Project Detail API Documentation

## Overview

The Project Detail Pipeline is a verified-data system that answers specific questions about properties (EMI, investment potential, location, timeline, builder information) using database facts instead of LLM hallucination.

**Design principle:** Database is single source of truth. LLM reasons over verified facts only.

## Architecture

```
User Message
    ↓
Intent Classification (project_detail + payment/investment/location/timeline/builder/details)
    ↓
Query Planner (extract intent, identify project, map required fields)
    ↓
Data Gateway (fetch facts from DB with confidence scores)
    ↓
Confidence Validation (≥0.65 threshold)
    ↓
LLM Reasoning (brief summary from facts only)
    ↓
Component Specs (JSON for frontend to render)
    ↓
SSE Response (streaming to client)
```

## Intent Types

### payment
User asking: "How much EMI?", "What's the cost breakdown?", "GST and stamp duty?"

Required fields:
- `price_min_cr` (database)
- `gst_rate_pct` (database)
- `stamp_duty_pct` (database)

Components rendered:
- emi-calculator (computes actual EMI)
- payment-breakdown (price + taxes)

Cache TTL: 1 hour (stable data)

### investment
User asking: "Is this a good investment?", "Price appreciation?", "ROI potential?"

Required fields:
- `price_min_cr` (database)
- `price_cagr_pct` (database)
- `construction_progress_pct` (database)

Components rendered:
- investment-score
- price-chart (historical)

Cache TTL: 30 minutes (time-sensitive)

### location
User asking: "How far is metro?", "What schools nearby?", "Connectivity?"

Required fields:
- `connectivity_count` (database)
- `amenity_count` (database)

Components rendered:
- map-view
- connectivity-list
- location-scorecard

Cache TTL: 1 hour (stable)

### timeline
User asking: "When ready?", "Possession date?", "Completion?"

Required fields:
- `possession_date` (database)
- `project_status` (database)
- `construction_progress_pct` (database)

Components rendered:
- timeline (milestones)
- possession-timeline

Cache TTL: 30 minutes (subject to delays)

### builder
User asking: "Tell me about builder", "Track record?", "Credibility?"

Required fields:
- `builder_name` (database)
- `builder_delivery_score` (database)
- `total_projects_count` (database)

Components rendered:
- builder-card

Cache TTL: 1 hour (stable)

### details
User asking: "Tell me about project", "What amenities?", "Configuration?"

Required fields:
- `floor_plan_count` (database)
- `project_status` (database)
- `amenity_count` (database)
- `possession_date` (database)
- `price_min_cr` (database)

Components rendered:
- property-card
- amenities-grid
- floor-plan-gallery
- builder-card

Cache TTL: 30 minutes

## Confidence Scoring

Each fact wrapped in FactValidation:

```typescript
{
  fact: "description",
  value: unknown,
  source: "database" | "google_maps" | "calculator" | "estimated" | "derived",
  confidence: 0.0 to 1.0,
  validated: boolean,
  reason?: "why confidence < 1",
  dataAge?: number,
  lastVerifiedAt?: "ISO date"
}
```

Confidence by source:
- **database**: 0.98 (verified)
- **google_maps**: 0.92 (external API)
- **calculator**: 0.95 (deterministic)
- **derived**: 0.85 (computed)
- **estimated**: 0.65 (guessed)

Final response confidence = geometric mean of all facts

Threshold: ≥0.65 to render components. <0.65 shows "contact team" message.

## Data Completeness

```typescript
{
  complete: boolean,           // all critical fields present
  coverage: 0.0 to 1.0,       // % of expected fields present
  missing: string[],           // missing field names
  missingByImportance: {
    critical: string[],
    optional: string[]
  }
}
```

Response only sent if:
- `completeness.complete === true` OR
- `confidence >= 0.65`

Otherwise user sees: "I have partial data. Please contact our team."

## SSE Events

### intent
```json
{
  "type": "intent",
  "intent": { "bhk": [3], "sector": "Sector 62", "budgetMax": 5.0 },
  "intentState": "READY_TO_SEARCH"
}
```

### components
```json
{
  "type": "components",
  "response": {
    "summary": "Based on verified data...",
    "confidence": 0.92,
    "components": [
      {
        "type": "emi-calculator",
        "props": { "principal": 5000000, "ratePercentage": 7.5, "tenure": 20 }
      }
    ],
    "sources": ["database", "calculator"],
    "intent": "payment",
    "projectId": "ats-pristine"
  }
}
```

### token
```json
{
  "type": "token",
  "token": "The monthly EMI would be approximately ₹35,000..."
}
```

### done
```json
{
  "type": "done",
  "sessionId": "session-123",
  "intentState": "SHORTLISTED",
  "responseMode": "components"
}
```

### error
```json
{
  "type": "error",
  "message": "I need a project name to answer that."
}
```

## Error Handling

### Input Validation (queryPlanner.guards.ts)
- Message length: 3-2000 characters
- Special char ratio: < 50%
- Spam detection: no 10+ repeated chars
- Returns: "Which project are you asking about?"

### Missing Project
- If projectIds.length === 0 after parsing
- Returns: "Did you mean [detected projects]?"

### Missing Required Fields
- If critical fields not in database
- Returns: "I have partial data. Missing: [fields]. Contact team."

### Low Confidence
- If final confidence < 0.65
- Returns: "Data incomplete. Contact team."

### LLM Timeout
- If LLM call times out after 3s
- Falls back to: "Based on verified data: [top 3 facts]"

### Database Error
- Connection error: "Please try again" (recoverable)
- Timeout: "Please try again" (recoverable)
- Constraint: "Contact support" (non-recoverable)

## Rate Limiting

- 1 request per project per second minimum
- Burst limit: 5 concurrent requests per user
- Exceeding returns: "Please try again in Xs" with countdown

## Caching

### Gateway Cache
- Key: `{projectId}:{intent}:{fieldsSorted}`
- TTL: 1 hour (stable) / 30 min (time-sensitive)
- Auto-cleanup every 5 minutes
- Evicts expired entries

### Query Planner Cache
- Key: normalized message (lowercase, trimmed)
- TTL: 30 minutes
- Prevents re-planning similar queries

### LLM Response Cache
- Key: `{intent}:{factKeysSorted}`
- TTL: 2 hours
- Avoids redundant summarization

## Performance Targets

- Intent classification: < 50ms
- Query planning: < 100ms
- Data gateway: < 150ms (payment) to 250ms (details)
- LLM reasoning: < 1000ms
- Component building: < 50ms
- **Total: < 2 seconds for end-to-end**

## Monitoring

### Key Metrics
```
request_duration_ms: histogram
cache_hit_rate: gauge
confidence_score: histogram
completeness_coverage: histogram
component_render_time_ms: histogram
llm_token_count: counter
```

### Alerts
- Confidence < 0.65 for 5+ consecutive requests
- Cache hit rate drops below 40%
- Request latency > 3 seconds
- LLM timeout rate > 5%
- Database error rate > 1%

## Example: Payment Query

```
User: "How much EMI for ATS Pristine?"

1. classifyIntent() → category: "project_detail", detailType: "payment"
2. planProjectDetailQuery() → intent: "payment", projectIds: ["ats-pristine"], requiredFields: ["price_min_cr", "gst_rate_pct", "stamp_duty_pct"]
3. getProjectDataForQuery() → facts: { price: 0.98, gst: 0.98, stampDuty: 0.98 }
4. computeResponseConfidence() → 0.98 (all DB sources)
5. LLM: "The monthly EMI would be approximately ₹35,000 for a ₹5Cr property at 7.5% over 20 years."
6. buildComponentResponse() → [emi-calculator, payment-breakdown]
7. Send SSE: components event with summary + specs
```

## Testing

See `/backend/src/lib/discovery/queryPlanner.test.ts` and related test files for:
- Intent detection patterns
- Field mapping per intent
- Confidence scoring
- Error handling
- Component selection

Run: `npm test -- queryPlanner`
