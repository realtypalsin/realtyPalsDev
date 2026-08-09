# Phase 4: Ranking & Explanation Generator

## Overview

Phase 4 takes the Phase 3 multi-dimensional ranking results and transforms them into human-readable recommendations with:
- Dimension-by-dimension explanations with emoji indicators
- Trade-off analysis (high scores paired with low scores)
- Deal-breaker flagging with alternative suggestions
- Ranked recommendations with percentile scores
- Comparison matrices for multi-project views
- Context-aware next steps

## Main Entry Point

```typescript
export function formatRankedResults(
  rankedResults: Array<RankingResult & { projectId: string; projectName: string }>,
  projects: ProjectWithMetadata[],
  intent: Intent,
  topN: number = 3,
  includeComparison: boolean = true
): FormattedRecommendation[]
```

### Parameters
- **rankedResults**: Phase 3 scoring output (11 dimension scores + final composite)
- **projects**: Original project metadata (for builder names, amenities, etc.)
- **intent**: User intent/preferences (for weight computation and context)
- **topN**: Return top N recommendations (default 3, capped at 10)
- **includeComparison**: Include comparison matrix if topN > 1

### Returns
Array of `FormattedRecommendation` objects with:
- **finalScore**: 0-100 composite score
- **scorePercentile**: "Top 5% match" / "Top 25% match" etc.
- **summary**: 1-line why-we-recommend-this explanation
- **whyMatch**: Array of top 3 matching dimensions with emoji
- **tradeOffs**: Array of dimension trade-offs (positive vs. negative)
- **dealBreakers**: Array of critical issues with suggestions
- **dimensionExplanations**: All 11 dimensions with emoji, score, weight
- **nextSteps**: 4-5 action items for the user
- **comparisonMatrix**: Dimension-by-dimension comparison (optional, multi-project)

## Usage Example

```typescript
import { rankProjects } from './scoringEngine'
import { formatRankedResults } from './rankingFormatter'

// Phase 3: Score projects
const rankedResults = rankProjects(intent, projects, metadata)

// Phase 4: Format for display
const recommendations = formatRankedResults(
  rankedResults,
  projects,
  intent,
  topN = 3,
  includeComparison = true
)

// Display to user
recommendations.forEach((rec) => {
  console.log(`🏆 ${rec.projectName} — ${rec.finalScore}/100 (${rec.scorePercentile})`)
  console.log(`   ${rec.summary}`)
  console.log(`   Why: ${rec.whyMatch.join(', ')}`)
  rec.tradeOffs.forEach((t) => {
    console.log(`   Trade-off: ${t.positive} vs ${t.negative}`)
  })
  rec.nextSteps.forEach((s) => {
    console.log(`   → ${s}`)
  })
})
```

## Emoji Mapping

All dimension explanations use a consistent emoji system:
- **✅ (Green)**: Score >= 80 — Strong match
- **⚠️ (Yellow)**: Score 50-79 — Acceptable but flag for review
- **❌ (Red)**: Score < 50 — Weak match or deal-breaker

## 11 Dimension Explanations

Each dimension is converted to human-readable text:

| Dimension | Label | Example |
|-----------|-------|---------|
| budget | Budget fit | ✅ ₹1.35Cr within ₹1-1.5Cr range |
| location | Location | ✅ Sector 62 metro 800m (12min walk) |
| timeline | Possession timeline | ⚠️ Dec 2027 (2.5yr wait), builder avg +6mo delay |
| specs | Property specs | ✅ 3BHK match, 72% carpet ratio |
| builder | Builder track record | ✅ 85% on-time delivery, 0 litigation, RERA-compliant |
| legal | Legal & compliance | ✅ No flags, occupancy cert expected 2027 |
| amenities | Amenities | ✅ Pool + gym, ₹3/sqft/month |
| pricing | Price position | ⚠️ ₹6.5k/sqft (2% above sector avg) |
| personal | Personal fit | ✅ 2.2km to top-rated schools |
| drivers | Decision drivers | ✅ Strong investment potential |
| gaps | Critical gaps | ✅ No critical gaps identified |

## Deal-Breaker Handling

Deal-breakers are identified from Phase 3 scores and classified:

### Severity Levels
- **Critical**: Litigation, no RERA, insolvency risk → Filter out for risk-averse users
- **High**: Major compliance gaps, unresolved disputes
- **Medium**: Minor documentation issues

### Default Behavior
- **risk_averse**: Filter out critical deal-breakers from results
- **nri**: Surface deal-breakers but suggest FEMA/RERA-compliant alternatives
- **Other users**: Show deal-breakers with context and alternatives

Example:
```
❌ Deal-breaker: Project has pending litigation
   Severity: Critical
   Suggested alternative: Sector 62 Alternative X (similar budget, no legal issues)
```

## Trade-Off Detection

Pairs high-scoring dimensions with low-scoring ones to surface trade-offs:

```
Positive: ✅ Builder track record: 85% on-time delivery, 0 litigation
Negative: ⚠️ Possession timeline: 2.5-year wait, builder historically +6mo late
Reasoning: Strong builder reputation vs. long possession timeline
```

Trade-offs are limited to top 2 to avoid overwhelming the user.

## Score Percentile Calculation

Percentiles are based on final score ranges:

| Score Range | Percentile |
|-------------|-----------|
| 90-100 | Top 5% match |
| 85-89 | Top 10% match |
| 80-84 | Top 15% match |
| 75-79 | Top 20% match |
| 70-74 | Top 30% match |
| 65-69 | Top 40% match |
| < 65 | Moderate match |

## Comparison Matrix

When `includeComparison=true` and multiple projects are returned, a comparison matrix is generated with:
- **Rows**: All 11 dimensions
- **Columns**: Each project's score + emoji
- **Weights**: Dimension weights based on intent

Useful for side-by-side comparison in UI.

## Next Steps Generation

Context-aware action items based on dimension scores and deal-breakers:

### Budget Dimension
- If score >= 80: "Confirm all additional costs (registration, stamp duty, maintenance)"

### Timeline Dimension
- If score < 70: "Clarify possession timeline and builder's historical delay patterns"

### Legal Dimension
- If score < 80: "Verify RERA registration and check for pending litigation online"

### Gaps Dimension
- If score < 80: "Check resale restrictions and lock-in terms in agreement"

### Default
- Always include: "Schedule site visit to validate construction quality and on-ground situation"

Capped at 4-5 next steps to keep recommendations actionable.

## Chat Integration

For quick chat display, use the summary function:

```typescript
import { generateRecommendationSummary } from './rankingFormatter'

const chatText = generateRecommendationSummary(recommendations)
// "🏆 **Project X** is our top match (85/100)..."
```

Returns 1-2 paragraphs suitable for real-time chat.

## Phase Dependencies

- **Upstream**: Phase 3 (scoringEngine) provides RankingResult with dimension scores
- **Downstream**: Phase 5 (rankingProfiles) may apply additional sorting/filtering based on user ranking preference
- **Data**: ProjectWithMetadata and Intent flow through unchanged

## Type Definitions

### FormattedRecommendation
```typescript
interface FormattedRecommendation {
  projectId: string
  projectName: string
  builderName?: string
  finalScore: number
  scorePercentile: string

  summary: string
  whyMatch: string[]
  tradeOffs: TradeOff[]
  dealBreakers: DealBreakerInfo[]

  dimensionExplanations: DimensionExplanation[]
  nextSteps: string[]
  comparisonMatrix?: ComparisonRow[]
}
```

### DimensionExplanation
```typescript
interface DimensionExplanation {
  emoji: string // ✅, ⚠️, ❌
  label: string
  explanation: string
  score: number
  weight: number
}
```

### TradeOff
```typescript
interface TradeOff {
  positive: string // High-scoring dimension with emoji
  negative: string // Low-scoring dimension with emoji
  reasoning?: string
}
```

## Testing

Tests in `rankingFormatter.test.ts` cover:
- ✅ Dimension explanations generation
- ✅ Emoji mapping by score
- ✅ Summary generation
- ✅ Trade-off detection
- ✅ Deal-breaker handling
- ✅ Next steps generation
- ✅ Score percentile calculation
- ✅ Sorting by finalScore
- ✅ topN limit enforcement
- ✅ Comparison matrix generation
- ✅ Empty input handling
- ✅ Risk-averse filtering

## Performance Notes

- Synchronous function (no async I/O)
- O(n) where n = topN (typically 3-10)
- Dimension explanation generation is O(1) per dimension
- Trade-off detection is O(d²) where d = 11 dimensions
- Comparison matrix generation is O(n × d)
- Overall: < 10ms for typical usage

## Localization

Numbers are formatted for Indian market:
- Currency: ₹X,XX,XXX format (e.g., ₹1,35,00,000)
- Distance: km (e.g., 2.2km)
- Time: months/years (e.g., "Dec 2027", "2.5-year wait")
- Percentages: % symbol (e.g., "85%")

## Future Enhancements

- Multi-language support (Hindi, regional languages)
- Custom emoji preferences
- Animated explanation cards
- Voice/audio explanations
- Video property walkthroughs linked from recommendations
- Machine-generated chatbot follow-ups per recommendation
- A/B testing different explanation styles
- User feedback loop to improve explanations
