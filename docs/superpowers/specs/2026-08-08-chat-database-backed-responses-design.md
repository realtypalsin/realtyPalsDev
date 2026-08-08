# Database-Backed Chat Responses with Progressive Chips

**Date:** 2026-08-08  
**Phase:** 1 (MVP)  
**Status:** Design Review

---

## Overview

Transform chat responses from generic LLM suggestions into database-backed, intelligently formatted answers with adaptive chips. User queries route to relevant database tables, get processed through LLM for formatting/creativity, and return as beautifully structured responses with contextual next-step actions.

**Phase 1 scope:** Payment plans, costs, builder history, location advantages, possession timeline, confidence scoring, comparison framework.

---

## Architecture

```
User Query + Conversation Context
    ↓
Intent Detector (existing chat logic)
    ↓
Query Router (maps intent → DB tables + weight)
    ↓
Smart Cache Layer (hot queries: payment plans, builder scores)
    ↓
Weighted Data Fetcher (fetch relevant rows, confidence scores)
    ↓
LLM Formatter
    ├─ Beautify with user tone/context
    ├─ Flag uncertain/missing data transparently
    └─ Generate confidence-aware chips
    ↓
Response Object {message, chips, confidence, comparison}
    ↓
Frontend renders with visual hierarchy
```

### Key Design Decisions

1. **80% DB, 20% LLM:** Raw data from DB, LLM only transforms/beautifies. No invented data.
2. **Query-type routing:** Payment queries → DB-driven; generic discovery → LLM fallback.
3. **User intent reconstruction:** Clarify what user REALLY wants before data-dump.
4. **Decision frameworks, not facts:** Help user think through tradeoffs, not memorize specs.
5. **Transparent confidence:** Every data point stamped with confidence level + freshness.

---

## Phase 1 Data Types

### 1. Payment Plans (`PaymentPlan` model)
- **Fetch logic:** `SELECT * FROM payment_plans WHERE project_id = ? ORDER BY sort_order`
- **Data:** plan_type, down_payment_pct, total_duration_months, milestones, booking_amount_lakh, best_for, watch_out
- **LLM task:** Format as decision framework with EMI math, tradeoffs per plan
- **Confidence:** 95% if verified < 7 days ago; -5% per week old

### 2. Costs (`CostSheet` model)
- **Fetch logic:** `SELECT * FROM cost_sheets WHERE project_id = ?`
- **Data:** base_price_per_sqft, parking_cost, IFMS, club_membership, GST rate, stamp_duty, registration
- **LLM task:** Breakdown total cost, flag what's included vs extra, compare to market
- **Confidence:** 90% if verified; -10% if > 4 weeks old

### 3. Builder History (`Builder` model)
- **Fetch logic:** `SELECT delivery_score, projects_delivered_count, delayed_projects_count, average_delay_months, buyer_satisfaction_score FROM builders WHERE id = ?`
- **Data:** delivery track record, satisfaction scores, delays
- **LLM task:** Narrative: "Builder X delivered 7 projects, 95% on-time, avg 2mo delay when late"
- **Confidence:** `delivery_score * sample_size_factor(projects_delivered) * recency_factor(last_project_year)`

### 4. Location Advantages (`Project.location_advantages` JSON)
- **Fetch logic:** `SELECT location_advantages, commute_matrix FROM projects WHERE id = ?`
- **Data:** proximity to metro, schools, hospitals; walkability_score; future infra catalysts
- **LLM task:** Highlight location as decision factor, compare to sector averages
- **Confidence:** 80% (market data always approximate)

### 5. Possession Timeline (`Project` model)
- **Fetch logic:** `SELECT possession_date, possession_confidence, oc_obtained, legal_flag, litigation_count FROM projects WHERE id = ?`
- **Data:** expected date, confidence level (very_likely|likely|at_risk|uncertain), OC status, legal flags
- **LLM task:** "Likely Q2 2027 (95% confidence). OC status: [obtained|pending]. Legal: 1 active litigation (typical for sector)."
- **Confidence:** `possession_confidence_score ± legal_adjustments ± oc_adjustments`

---

## Memory Threading (Conversation Context)

Track per conversation session:

```typescript
ConversationMemory = {
  // Explicitly stated by user
  user_budget_min_cr?: number        // "My budget is 50-75 crore"
  user_budget_max_cr?: number
  user_timeline?: string             // "5-year horizon"
  user_pain_points: string[]         // ["want flexibility", "concerned about delays"]
  
  // Inferred from question patterns
  user_priorities: string[]          // ["affordability", "possession_certainty", "builder_trust"]
  
  // Conversation state
  projects_discussed: string[]       // ["Kingston", "Godrej"]
  stage: "CLARIFYING" | "SEARCHING" | "COMPARING" | "DECIDING"
  
  // What was confident vs assumed
  confident_facts: {
    [field: string]: {value, source, confidence_score}
  }
}
```

**Extraction rules:**
- Budget: grep for numbers + "crore" / "lakh" + context
- Timeline: grep for "year" / "month" / "when" question
- Pain points: "concerned", "want", "worried", "important", "prefer"
- Priorities: order of questions asked

**Usage in response:**
```
"Given your ₹50-75Cr budget (mentioned earlier) and preference for flexibility,
 here's my recommendation..."
```

---

## Confidence Scoring Rules

Every data point scored 0-100:

```typescript
confidence(data_point, source) {
  const base = BASE_CONFIDENCE[source]  // payment_plans: 95, builder: 85, location: 75
  const freshness = 95 - (days_old / 7 * 5)  // -5% per week old
  const verification_boost = verified_by_user ? +10 : 0
  const sample_size = source === "builder" ? builder_sample_factor() : 0
  const legal_adjustments = has_litigation ? -20 : 0
  
  return clamp(base * freshness_factor + verification_boost, 0, 100)
}
```

**Display format:**
```
Payment Plans: 95% (verified 3 days ago)
Builder Track Record: 92% (7 projects, 95% on-time)
Possession Timeline: 80% (likely, but OC pending)
Overall Assessment: 89%
```

---

## Comparison Framework

When user asks to compare payment plans or needs decision help:

```typescript
ComparisonMatrix = {
  dimensions: [
    {name: "Monthly EMI", weight: user_priority[0], format: "currency", better_is: "lower"},
    {name: "Total Cost", weight: user_priority[1], format: "currency", better_is: "lower"},
    {name: "Timeline Certainty", weight: user_priority[2], format: "%", better_is: "higher"},
    {name: "Flexibility", weight: user_priority[3], format: "months", better_is: "higher"}
  ],
  
  rows: [
    {name: "Construction-Linked", values: [92000, 5520000, 95, 0]},
    {name: "Flexi Plan", values: [85000, 5100000, 90, 6]},
    {name: "Possession-Linked", values: [70000, 5040000, 80, 12]}
  ],
  
  weighted_rank: [1, 2, 3]  // Ranked by user priorities, not absolute
}
```

**Rendered as:**
```
COMPARISON (Ranked by YOUR priorities):

Rank  Plan                   Monthly   Total Cost   Certainty   Flexibility
─────────────────────────────────────────────────────────────────────────
 1✓   Construction-Linked    ₹92K      ₹55.2L       95%         None
 2    Flexi Plan             ₹85K      ₹51L         90%         ±6mo
 3    Possession-Linked      ₹70K      ₹50.4L       80%         ±12mo

Why #1? Matches YOUR priorities:
  • Lowest monthly EMI (your #1 concern)
  • Highest possession certainty (95%)
  • Trade-off: Zero flexibility
```

---

## Response Structure (Backend → Frontend)

```typescript
type ChatResponse = {
  // Main conversational message (Claude-style, formatted)
  message: string
  
  // User context (for threading in subsequent responses)
  memory_context: {
    user_stated_facts: Record<string, {value, source, confidence}>
    inferred_preferences: string[]
    open_questions: string[]
  }
  
  // Structured comparison (if applicable)
  comparison?: {
    matrix: ComparisonMatrix
    winner: string
    reason: string
  }
  
  // Data confidence scores
  confidence: {
    payment_plans: number
    builder_history: number
    location: number
    possession: number
    overall: number
  }
  
  // Progressive chips (evaluated server-side, only relevant ones sent)
  chips: ChipAction[]
  
  // Data freshness (transparency)
  data_freshness: {
    [source: string]: string  // "verified 3 days ago" | "last updated 2 weeks ago"
  }
  missing_data: string[]  // ["construction_updates"] — what we don't have
}
```

---

## Chip Generation (Phase 1)

Chips are contextual next-steps, not generic questions.

**Payment plan query example:**

Primary chip (immediate):
```
{
  label: "Calculate your EMI",
  action: "CALCULATE_EMI",
  payload: {
    selected_plan_type: "construction_linked",
    project_id: "...",
    user_stated_budget: 50_000_000,
  },
  context: "Based on {plan}, your EMI is {amount}/month (fits {ratio}% of stated income)"
}
```

Secondary chips (after user engagement):
```
{
  label: "What if possession delays 6 months?",
  action: "SCENARIO_ANALYSIS",
  showIf: () => possession_confidence < 85,
  payload: {delay_months: 6}
},
{
  label: "Compare with competitors in this sector",
  action: "COMPARISON_MATRIX",
  showIf: () => competitor_projects.length > 2,
  payload: {competitor_ids: [...]}
}
```

Fallback chip (if data incomplete):
```
{
  label: "Chat with our sales team",
  action: "REQUEST_CALLBACK",
  context: "For detailed payment plans or custom scenarios"
}
```

---

## Implementation Files (Phase 1)

**Backend:**
- `backend/src/routes/chat.ts` — integrate QueryRouter, DataFetcher calls
- `backend/src/lib/discovery/queryRouter.ts` — NEW: intent → DB table mapper
- `backend/src/lib/discovery/dataFetcher.ts` — NEW: weighted data fetching with confidence
- `backend/src/lib/discovery/memoryExtractor.ts` — NEW: extract budget, timeline, priorities from chat
- `backend/src/lib/ai/prompts/responseFormatter.ts` — NEW: LLM prompt for beautifying data
- `backend/src/lib/ai/prompts/index.ts` — update buildAdvisorSystemPrompt to include formatted data

**Frontend:**
- `frontend/components/chat/MessageBubble.tsx` — render confidence scores, comparison matrix
- `frontend/components/chat/SuggestionChip.tsx` — update for response-aware chips

---

## Success Criteria (Phase 1)

✓ User queries for payment plans return formatted breakdown (not raw DB rows)  
✓ Comparison matrix appears when user asks to compare  
✓ Confidence scores visible for all data  
✓ Chips reference conversation history (memory threading works)  
✓ Data freshness footer shows in response  
✓ Fallback to "chat with team" when data incomplete (< 60% confidence)  
✓ Builder history presented as narrative (not bullet points)  
✓ EMI calculation integrates user's stated budget

---

## Phase 2 (Future)

- Scenario modeling (what if possession delays, interest rates rise)
- Conflict detection (user wants low EMI + flexibility → show pareto frontier)
- Feedback loop (track chip engagement, optimize)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| LLM formats data wrong | Use structured prompt, validate JSON output, fall back to plain text |
| Missing data in DB | Check confident_facts for missing fields, surface fallback chip |
| Conversation memory extraction incorrect | Confidence score inferred fields at 60-70%, not 95+ |
| Comparison matrix overwhelms user | Show only top 3 plans, collapse low-scoring options |
| Freshness data misleading | Always show age ("verified 3 days ago"), not just date |

---

## Open Questions Resolved in Design

1. **Query-type routing?** Yes — intent → DB tables + LLM fallback (80/20 split)
2. **Raw data to frontend?** No — LLM beautifies everything before sending
3. **Chip scope for Phase 1?** Payment plans, costs, builder, location, possession
4. **How to handle conflicting user goals?** Phase 2 (conflict detection)
5. **Scenario modeling?** Phase 2

---

## Next: Implementation Planning

Ready to invoke `writing-plans` skill to break Phase 1 into tasks.
