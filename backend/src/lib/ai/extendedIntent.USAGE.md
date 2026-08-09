# Phase 1: Extended Intent Extraction — Usage Guide

## Quick Start

```typescript
import { extractExtendedIntent, mapExtendedIntentToLegacy } from './extendedIntent'

// Single turn: parse user message
const result = await extractExtendedIntent({
  userMessage: "I need a 3BHK near metro for my family under 2 crore"
})

const extendedIntent = result.intent
console.log(extendedIntent.bhk)  // [3]
console.log(extendedIntent.budgetMax)  // 2
console.log(extendedIntent.familyStage)  // 'young_family'
console.log(extendedIntent.metroDistance)  // undefined (not specified)
console.log(extendedIntent._meta?.specsConfidence)  // 100 (explicitly stated)

// Multi-turn: pass conversation history
const result2 = await extractExtendedIntent({
  userMessage: "What about 2BHK instead?",
  previousIntent: result.intent
})
// BHK updated to [2], budget retained from previous turn
```

## Structure: 11 Buyer Decision Dimensions

### 1. FINANCIAL
- `budgetMin`: crore (e.g., 1.5)
- `budgetMax`: crore
- `emiCapacity`: monthly EMI in lakhs
- `investmentVsPersonal`: 100_investment|80_20|60_40|40_60|20_80|100_personal
- `expectedROI`: annual % (for investments)

### 2. LOCATION
- `sectorPreference`: Sector 150, Sector 75, etc.
- `metroDistance`: km from metro
- `commuteTo`: "office at Sector 62", "work in Delhi"
- `schoolPriority`: boolean
- `hospitalNeed`: boolean
- `shopNeed`: boolean
- `parkNeed`: boolean
- `airQualityPriority`: critical|high|moderate|low
- `noiseTolerance`: very_low|low|moderate|high

### 3. TIMELINE
- `possessionUrgency`: immediate|flexible|6months|1year|18months|2years|3years
- `constructionStagePreference`: pre_launch|under_construction|nearing_completion|ready_to_move|any
- `delayTolerance`: none|low|moderate|high (can tolerate construction delays?)

### 4. SPECS
- `bhk`: [2, 3, 4] (array of options)
- `carpetAreaMin`/`Max`: sqft
- `superAreaMin`/`Max`: sqft
- `balconyPreference`: must_have|preferred|nice_to_have|not_needed
- `parkingNeeded`: not_needed|one_space|two_spaces|multiple_spaces|flex
- `orientationPreference`: north|south|east|west|flexible

### 5. BUILDER
- `builderReputationImportance`: critical|high|moderate|low
- `onTimeDeliveryRequired`: boolean
- `litigationTolerance`: zero|minimal|some|flexible

### 6. LEGAL
- `reraComplianceMust`: boolean
- `litigationMustBe0`: boolean (no builder disputes)
- `nriEligible`: boolean

### 7. AMENITIES
- `poolWanted`: boolean
- `gymWanted`: boolean
- `clubhouseWanted`: boolean
- `gatedPreference`: must_have|preferred|neutral|not_needed
- `maintenanceCostTolerance`: minimal|moderate|high|any

### 8. PRICING
- `pricePerSqftMin`/`Max`: Rs/sqft
- `competitionAwareness`: boolean (user knows market rates?)

### 9. PERSONAL
- `familyStage`: single|couple|young_family|growing_family|established_family|elderly_support|multigenerational
- `workLocation`: "Sector 62", "Delhi"
- `lifestylePriority`: sustainability|community|wellness|luxury|practicality|family

### 10. DECISION
- `primaryMotivation`: live_in|investment|wealth_preservation|resale_potential|rental_income|tax_benefits|family_obligation
- `dealBreakers`: ["no legal issues", "no construction delays"]
- `riskTolerance`: very_conservative|conservative|moderate|aggressive
- `decisionTimeline`: urgent|1month|3months|6months|flexible

### 11. GAPS
- `resaleLockInTolerance`: years (willing to wait before resale?)
- `rentalRestrictionTolerance`: boolean (OK with rental restrictions?)
- `vastuPreference`: boolean

## Confidence Scoring

Every extraction includes `_meta` with confidence scores (0-100):

```typescript
const intent = result.intent

console.log(intent._meta?.budgetConfidence)  // 100 = explicitly stated
console.log(intent._meta?.locationConfidence)  // 0 = not mentioned
console.log(intent._meta?.specsConfidence)  // 50 = partially stated
console.log(intent._meta?.extractionModel)  // 'openai' or 'groq'
```

Use confidence to:
1. **Guide clarification prompts**: Ask about dimensions with 0 confidence
2. **Rank search results**: Dimensions with high confidence matter more
3. **Debug intent parsing**: Track which model produced the extraction

## Fallback Behavior

```typescript
const result = await extractExtendedIntent({
  userMessage: "show me some 3BHK"
})

if (result.degraded) {
  console.log("All LLM providers failed, using previous intent as fallback")
  // In production: consider asking user to clarify or retry
}
```

## Backward Compatibility: Map to Legacy Intent

```typescript
import { mapExtendedIntentToLegacy } from './extendedIntent'

const extendedIntent = result.intent
const legacyIntent = mapExtendedIntentToLegacy(extendedIntent)

// Now compatible with existing discovery code:
// - executeSearch(legacyIntent)
// - rankProperties(legacyIntent)
// - etc.
```

## Error Handling

- **Schema mismatch**: Logs warning, returns previous intent
- **JSON parse failure**: Logs warning, returns previous intent
- **Both providers fail**: Returns previous intent with `degraded: true`
- **No previous intent**: Returns empty `{}` object

## Integration with Chat.ts

```typescript
import { extractExtendedIntent, mapExtendedIntentToLegacy } from './ai/extendedIntent'

export async function chatHandler(req: Request) {
  const { message, conversationId } = await req.json()

  // Extract extended intent
  const previousIntent = /* fetch from DB or session */
  const { intent, degraded } = await extractExtendedIntent({
    userMessage: message,
    previousIntent
  })

  // Store intent for multi-turn context
  // await saveIntent(conversationId, intent)

  // For backward compatibility with search:
  const legacyIntent = mapExtendedIntentToLegacy(intent)

  // Proceed with discovery/ranking as before
  // const results = await executeSearch(legacyIntent)
}
```

## Examples

### Example 1: First-time Buyer
```
User: "First time buyer, need a 2BHK near school for my family, budget around 1.2 crore"

Extracted:
- bhk: [2]
- budgetMax: 1.2
- familyStage: 'young_family'
- schoolPriority: true
- investmentVsPersonal: '100_personal'
- riskProfile: 'risk_averse'
- carpetAreaMin: undefined (not mentioned)
- _meta.specsConfidence: 100
- _meta.locationConfidence: 100
- _meta.personalConfidence: 100
- _meta.pricingConfidence: 100
- _meta.gapConfidence: 0 (no gaps mentioned)
```

### Example 2: NRI Investor
```
User: "NRI in Dubai, investing 1.5-2 crore in Noida, want 8% annual returns, RERA compliant only"

Extracted:
- budgetMin: 1.5
- budgetMax: 2
- investmentVsPersonal: '100_investment'
- expectedROI: 8
- reraComplianceMust: true
- primaryMotivation: 'rental_income'
- nriEligible: true
- _meta.budgetConfidence: 100
- _meta.decisionConfidence: 100
- _meta.legalConfidence: 100
```

### Example 3: Off-Topic
```
User: "What is stamp duty calculation?"

Extracted: {} (empty object, not intent-related)
result.degraded: false (recognized as off-topic, not LLM failure)
```

## Next Steps (Phase 2+)

This Phase 1 extracts intent dimensions. Future phases will:

- **Phase 2**: Build scorers that rank properties along these 11 dimensions
- **Phase 3**: Build multi-dimensional comparisons
- **Phase 4**: Build recommendation reasoning based on dimension priorities
- **Phase 5**: Store extended intent in database for long-term memory

For now, Phase 1 focuses on accurate extraction with confidence scoring.
