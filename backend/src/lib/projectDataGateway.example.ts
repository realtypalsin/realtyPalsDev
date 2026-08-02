/**
 * projectDataGateway Usage Examples
 *
 * Shows how to use the gateway in different scenarios.
 */

import {
  getAllProjectData,
  getProjectDataForQuery,
  computeResponseConfidence,
  type ProjectDataGatewayResponse,
} from './projectDataGateway'

// ─────────────────────────────────────────────────────────────────────────────
// Example 1: User asks general question about a project
// ─────────────────────────────────────────────────────────────────────────────

async function handleGeneralQuery(projectName: string, userQuestion: string) {
  // Fetch all available data
  const response = await getAllProjectData(projectName)

  if (!response.found) {
    return {
      status: 'not_found',
      message: response.message,
    }
  }

  // Calculate confidence
  const confidence = computeResponseConfidence(response.data || {})

  // Check completeness
  const { completeness } = response
  if (!completeness?.complete) {
    console.warn(`⚠️ Incomplete data:`, completeness?.missingByImportance.critical)
  }

  return {
    status: 'success',
    projectName: response.projectName,
    confidence: `${(confidence * 100).toFixed(0)}%`,
    dataCompleteness: completeness?.coverage,
    missingSources: completeness?.missingByImportance.critical,
    facts: response.data,
    // These facts + confidence go to LLM layer for reasoning
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 2: User asks about EMI (payment intent)
// ─────────────────────────────────────────────────────────────────────────────

async function handlePaymentQuery(projectName: string) {
  const response = await getProjectDataForQuery({
    projectId: projectName,
    intent: 'payment',
    requiredFields: ['base_price_per_sqft', 'gst_rate_pct', 'stamp_duty_pct', 'parking_cost_lakh'],
  })

  if (!response.found) {
    return { error: 'Project not found' }
  }

  const confidence = computeResponseConfidence(response.data || {})

  return {
    projectName: response.projectName,
    confidence: `${(confidence * 100).toFixed(0)}%`,
    facts: response.data,
    // Frontend EMI calculator consumes: price, gst, stamp_duty, parking
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 3: Compare two projects
// ─────────────────────────────────────────────────────────────────────────────

async function compareProjects(project1Name: string, project2Name: string) {
  const [resp1, resp2] = await Promise.all([
    getProjectDataForQuery({
      projectId: project1Name,
      intent: 'compare',
      requiredFields: [
        'floor_plan_count',
        'price_min_cr',
        'construction_progress_pct',
        'amenity_count',
        'price_cagr_pct',
      ],
    }),
    getProjectDataForQuery({
      projectId: project2Name,
      intent: 'compare',
      requiredFields: [
        'floor_plan_count',
        'price_min_cr',
        'construction_progress_pct',
        'amenity_count',
        'price_cagr_pct',
      ],
    }),
  ])

  if (!resp1.found || !resp2.found) {
    return { error: 'One or both projects not found' }
  }

  const conf1 = computeResponseConfidence(resp1.data || {})
  const conf2 = computeResponseConfidence(resp2.data || {})

  return {
    project1: {
      name: resp1.projectName,
      confidence: `${(conf1 * 100).toFixed(0)}%`,
      facts: resp1.data,
    },
    project2: {
      name: resp2.projectName,
      confidence: `${(conf2 * 100).toFixed(0)}%`,
      facts: resp2.data,
    },
    // LLM gets: both projects' facts + confidence for each
    // Then generates structured comparison (see componentSpec.ts)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 4: Check data quality before sending to LLM
// ─────────────────────────────────────────────────────────────────────────────

async function validateDataQuality(projectName: string): Promise<{
  canAnswer: boolean
  confidence: number
  gaps: string[]
  shouldAskForClarification: boolean
}> {
  const response = await getAllProjectData(projectName)

  if (!response.found) {
    return {
      canAnswer: false,
      confidence: 0,
      gaps: [],
      shouldAskForClarification: true,
    }
  }

  const confidence = computeResponseConfidence(response.data || {})
  const gaps = response.completeness?.missingByImportance.critical || []

  // Don't answer if critical data missing AND confidence too low
  const hasGaps = gaps.length > 0
  const confidenceTooLow = confidence < 0.65

  return {
    canAnswer: !hasGaps || confidence > 0.8,
    confidence,
    gaps,
    shouldAskForClarification: confidenceTooLow && hasGaps,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration with Chat Route
// ─────────────────────────────────────────────────────────────────────────────

/**
 * This is how it flows in routes/chat.ts:
 *
 * 1. User: "How much EMI for ATS Pristine?"
 * 2. Intent Classifier: intent = 'payment'
 * 3. Query Planner: requiredFields = ['price', 'gst', 'rate']
 * 4. Data Fetcher: response = await getProjectDataForQuery({ ... })
 * 5. Validate: Check response.completeness.complete
 * 6. LLM Layer: Pass facts only (no DB connection)
 * 7. Component Renderer: Frontend renders verified components
 */

/**
 * Before sending data to LLM, always:
 * ✓ Check completeness
 * ✓ Compute confidence
 * ✓ Validate critical fields present
 * ✓ Track sources
 * ✗ Never let AI invent missing data
 * ✗ Never mix unverified sources without disclosure
 */
