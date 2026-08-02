/**
 * Query Planner Examples — How planning works in practice
 */

import {
  planProjectDetailQuery,
  isActionable,
  getClarificationMessage,
  explainPlan,
} from './queryPlanner'
import { getProjectDataForQuery } from '../projectDataGateway'

// ─────────────────────────────────────────────────────────────────────────────
// Example 1: Payment Query (Simple & Actionable)
// ─────────────────────────────────────────────────────────────────────────────

async function examplePaymentQuery() {
  const plan = await planProjectDetailQuery({
    userMessage: "How much EMI for ATS Pristine?",
  })

  console.log(explainPlan(plan))
  // Output:
  // Intent: payment (95% sure)
  // Projects: ats-pristine
  // Needs: price_min_cr, base_price_per_sqft, gst_rate_pct, stamp_duty_pct
  // Optional: parking_cost_lakh, ifms_lakh, registration_pct
  // Tools: calculator, db
  // Tabs: pricing
  // Reason: Keywords: EMI, cost, charges, affordability

  if (isActionable(plan)) {
    // Plan is good — fetch data
    if (plan.intent === 'payment' || plan.intent === 'investment' || plan.intent === 'location' || plan.intent === 'timeline' || plan.intent === 'builder' || plan.intent === 'compare' || plan.intent === 'details') {
      const gatewayResponse = await getProjectDataForQuery({
        projectId: plan.projectIds[0],
        intent: plan.intent,
        requiredFields: plan.requiredFields,
      })

      console.log('Confidence:', gatewayResponse.data && Object.keys(gatewayResponse.data).length)
      // Frontend: Use calculators to show EMI breakdown
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 2: Investment Query (Actionable)
// ─────────────────────────────────────────────────────────────────────────────

async function exampleInvestmentQuery() {
  const plan = await planProjectDetailQuery({
    userMessage: "Is ATS Pristine a good investment?",
  })

  if (isActionable(plan)) {
    if (plan.intent === 'payment' || plan.intent === 'investment' || plan.intent === 'location' || plan.intent === 'timeline' || plan.intent === 'builder' || plan.intent === 'compare' || plan.intent === 'details') {
      const gatewayResponse = await getProjectDataForQuery({
        projectId: plan.projectIds[0],
        intent: plan.intent,
        requiredFields: plan.requiredFields,
      })

      // LLM gets: price history, CAGR, decision thesis, builder track
      // Returns: structured recommendation with confidence
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 3: Ambiguous Query (Needs Clarification)
// ─────────────────────────────────────────────────────────────────────────────

async function exampleAmbiguousQuery() {
  const plan = await planProjectDetailQuery({
    userMessage: "How much does it cost?",
  })

  console.log(explainPlan(plan))
  // Output:
  // Intent: payment (95% sure)
  // Projects: None identified  ← Problem!
  // Needs: price_min_cr, ...
  // Reason: Keywords: EMI, cost, charges, affordability
  // Need clarification:
  // I need to know which project you're asking about.
  // Which project are you asking about? (e.g., "ATS Pristine", "Godrej")

  if (!isActionable(plan)) {
    // Ask user for more info
    const msg = getClarificationMessage(plan)
    console.log('Chat response:', msg)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 4: Compare Query (Multiple Projects)
// ─────────────────────────────────────────────────────────────────────────────

async function exampleCompareQuery() {
  const plan = await planProjectDetailQuery({
    userMessage: "Compare ATS Pristine vs Godrej in Sector 150",
  })

  console.log(explainPlan(plan))
  // Intent: compare (96% sure)
  // Projects: ats-pristine, godrej-sector-150
  // Needs: floor_plan_count, price_min_cr, construction_progress_pct, amenity_count, possession_date
  // Optional: price_cagr_pct, builder_delivery_score
  // Tools: db, analyzer
  // Tabs: overview, pricing, analysis

  if (isActionable(plan)) {
    // Fetch both projects' data
    if (plan.intent === 'payment' || plan.intent === 'investment' || plan.intent === 'location' || plan.intent === 'timeline' || plan.intent === 'builder' || plan.intent === 'compare' || plan.intent === 'details') {
      const [resp1, resp2] = await Promise.all([
        getProjectDataForQuery({
          projectId: plan.projectIds[0],
          intent: plan.intent,
          requiredFields: plan.requiredFields,
        }),
        getProjectDataForQuery({
          projectId: plan.projectIds[1],
          intent: plan.intent,
          requiredFields: plan.requiredFields,
        }),
      ])

      // LLM gets both projects' facts
      // Renders: comparison table, side-by-side metrics
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 5: Context-Aware Query (Using Conversation State)
// ─────────────────────────────────────────────────────────────────────────────

async function exampleContextAwareQuery() {
  // Assume user previously discussed "ATS Pristine"
  const conversationContext = {
    activeProjects: ['ats-pristine'],
  }

  const plan = await planProjectDetailQuery({
    userMessage: "What about the EMI?",
    conversationContext,
  })

  console.log(explainPlan(plan))
  // Intent: payment (95% sure)
  // Projects: ats-pristine  ← Resolved from context, not message!
  // Needs: price_min_cr, base_price_per_sqft, gst_rate_pct, stamp_duty_pct

  // No clarification needed because context provided project
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 6: Cross-Tab Query (Multiple Detail Sections)
// ─────────────────────────────────────────────────────────────────────────────

async function exampleCrossTabQuery() {
  const plan = await planProjectDetailQuery({
    userMessage: "Compare EMI vs price appreciation for ATS Pristine",
  })

  console.log(explainPlan(plan))
  // Intent: compare (high confidence)
  // Tabs: pricing, analysis  ← Two different tabs!
  // Needs from pricing: price_min_cr, base_price_per_sqft, gst_rate_pct
  // Needs from analysis: price_cagr_pct, price_direction

  // Frontend: Fetch data from 2 tabs, render side-by-side
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration with Chat Route
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Flow in routes/chat.ts:
 *
 * 1. User message received
 *    "How much EMI for ATS Pristine?"
 *
 * 2. Create plan
 *    plan = await planProjectDetailQuery({ userMessage })
 *
 * 3. Check if actionable
 *    if (!isActionable(plan)) {
 *      return { type: 'clarification', message: getClarificationMessage(plan) }
 *    }
 *
 * 4. Fetch data
 *    gateway = await getProjectDataForQuery({
 *      projectId: plan.projectIds[0],
 *      intent: plan.intent,
 *      requiredFields: plan.requiredFields
 *    })
 *
 * 5. Validate completeness
 *    if (!gateway.completeness.complete) {
 *      return { type: 'partial', message: 'Some data is missing...' }
 *    }
 *
 * 6. Send to LLM with confidence
 *    llm_response = await sendToLLM({
 *      facts: gateway.data,
 *      confidence: computeResponseConfidence(gateway.data),
 *      intent: plan.intent,
 *      tools: plan.tools
 *    })
 *
 * 7. Render components
 *    frontend renders: llm_response.components
 */

// ─────────────────────────────────────────────────────────────────────────────
// Key Patterns
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pattern: Validate before fetching
 *
 * ✓ DO:
 *   const plan = await planProjectDetailQuery({ ... })
 *   if (!isActionable(plan)) return clarify()
 *   const data = await getProjectDataForQuery({ ... })
 *
 * ✗ DON'T:
 *   Fetch data blindly, hope LLM invents missing facts
 */

/**
 * Pattern: Use conversation context for pronouns
 *
 * ✓ DO:
 *   planProjectDetailQuery({
 *     userMessage: "What about the EMI?",
 *     conversationContext: { activeProjects: ['ats-pristine'] }
 *   })
 *
 * ✗ DON'T:
 *   Ask LLM to guess which project the user meant
 */

/**
 * Pattern: Check cross-tabs before rendering
 *
 * ✓ DO:
 *   const tabs = plan.crossTab  // ['pricing', 'analysis']
 *   Fetch data from both tabs
 *   Render both in UI
 *
 * ✗ DON'T:
 *   Just fetch "general" data, miss relevant context
 */
