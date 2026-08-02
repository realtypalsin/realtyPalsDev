/**
 * Intent Classifier Examples — How classification works in practice
 */

import { classifyIntent, routeToModel, getModelName } from './intentClassifier'
import { planProjectDetailQuery } from '../discovery/queryPlanner'

// ─────────────────────────────────────────────────────────────────────────────
// Example 1: Payment Query (PROJECT_DETAIL)
// ─────────────────────────────────────────────────────────────────────────────

async function examplePaymentQuery() {
  const userMessage = "How much EMI for ATS Pristine?"

  // Step 1: Classify intent
  const classification = classifyIntent(userMessage)
  console.log(classification)
  // Output:
  // {
  //   category: 'project_detail',
  //   projectDetail: {
  //     type: 'project_detail',
  //     detailType: 'payment',
  //     projectIdentifier: 'ATS Pristine',
  //     confidence: 0.95,
  //     reason: 'Keywords: EMI, cost, charges, affordability'
  //   }
  // }

  // Step 2: Route to appropriate handler
  const route = routeToModel(classification)
  console.log(`Route: ${route}`) // Output: "query_planner"

  // Step 3: For PROJECT_DETAIL, use query planner instead of LLM
  if (route === 'query_planner') {
    const plan = await planProjectDetailQuery({
      userMessage,
    })

    console.log(`Plan intent: ${plan.intent}`) // Output: "payment"
    console.log(`Actionable: ${plan.intent === classification.projectDetail?.detailType}`) // true

    // Then proceed with plan-driven flow
    // → fetch data via gateway
    // → compute confidence
    // → return components (not prose)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 2: General Question (ADVISORY)
// ─────────────────────────────────────────────────────────────────────────────

async function exampleGeneralQuery() {
  const userMessage = "Is Noida a good investment?"

  const classification = classifyIntent(userMessage)
  console.log(classification)
  // Output:
  // {
  //   category: 'advisory',
  //   factualAdvisoryCategory: 'advisory'
  // }

  const route = routeToModel(classification)
  console.log(`Route: ${route}`) // Output: "smart"

  const modelName = getModelName(route)
  console.log(`Model: ${modelName}`) // Output: "gpt-4o"

  // Use smart model for reasoning
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 3: Factual Query (FACTUAL)
// ─────────────────────────────────────────────────────────────────────────────

async function exampleFactualQuery() {
  const userMessage = "What amenities does ATS Pristine have?"

  const classification = classifyIntent(userMessage)
  console.log(classification)
  // Output:
  // {
  //   category: 'factual',
  //   factualAdvisoryCategory: 'factual'
  // }

  const route = routeToModel(classification)
  console.log(`Route: ${route}`) // Output: "cheap"

  const modelName = getModelName(route)
  console.log(`Model: ${modelName}`) // Output: "llama-3.1-8b-instant" (cost optimized)

  // Use cheap model for factual questions
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 4: Investment Detail Query
// ─────────────────────────────────────────────────────────────────────────────

async function exampleInvestmentDetail() {
  const userMessage = "What's the investment potential of Godrej in Sector 150?"

  const classification = classifyIntent(userMessage)

  if (classification.category === 'project_detail') {
    console.log(`Detail type: ${classification.projectDetail?.detailType}`) // Output: "investment"
    console.log(`Project: ${classification.projectDetail?.projectIdentifier}`) // Output: "Godrej in Sector 150"
    console.log(`Confidence: ${classification.projectDetail?.confidence}`) // Output: 0.92

    // Route to query planner
    const route = routeToModel(classification)
    console.log(`Route: ${route}`) // Output: "query_planner"

    // Then fetch data and compute investment scores
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration in routes/chat.ts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * How classification fits into the chat flow:
 *
 * 1. User message
 *    "How much EMI for ATS Pristine?"
 *
 * 2. Classify intent
 *    classification = classifyIntent(userMessage)
 *    → category: 'project_detail', detailType: 'payment'
 *
 * 3. Route to handler
 *    route = routeToModel(classification)
 *    → 'query_planner'
 *
 * 4. For project_detail:
 *    ├─ planProjectDetailQuery(userMessage)
 *    ├─ getProjectDataForQuery(plan)
 *    ├─ computeResponseConfidence(data)
 *    ├─ Send to LLM (facts only)
 *    └─ Return component specs
 *
 * 5. For advisory (route='smart'):
 *    ├─ streamWithOpenAI(prompt, 'gpt-4o')
 *    └─ Return streamed text
 *
 * 6. For factual (route='cheap'):
 *    ├─ streamWithGroq(prompt, 'llama-3.1-8b-instant')
 *    └─ Return streamed text
 */

// ─────────────────────────────────────────────────────────────────────────────
// Key Patterns
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pattern: Always check category first
 *
 * ✓ DO:
 *   const classification = classifyIntent(userMessage)
 *   if (classification.category === 'project_detail') {
 *     // Use query planner
 *   } else {
 *     // Use traditional LLM routing
 *   }
 *
 * ✗ DON'T:
 *   Ignore category and always route to LLM
 */

/**
 * Pattern: project_detail goes through planner, not LLM
 *
 * ✓ DO:
 *   if (classification.category === 'project_detail') {
 *     plan = await planProjectDetailQuery(userMessage)
 *     data = await getProjectDataForQuery(plan)
 *     // LLM reasons over facts
 *   }
 *
 * ✗ DON'T:
 *   if (category === 'project_detail') {
 *     result = await LLM(userMessage)
 *   }
 */

/**
 * Pattern: Use routeToModel for legacy factual/advisory
 *
 * ✓ DO:
 *   if (classification.category === 'factual') {
 *     route = routeToModel(classification)
 *     model = getModelName(route) // 'llama-3.1-8b-instant'
 *   }
 */
