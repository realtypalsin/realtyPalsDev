/**
 * Component Spec Examples — How component selection & rendering works
 */

import {
  selectComponents,
  buildComponentProps,
  buildComponentResponse,
  type ComponentResponse,
  type FactValidation,
} from './componentSpec'

// ─────────────────────────────────────────────────────────────────────────────
// Example 1: Payment Query → EMI Calculator
// ─────────────────────────────────────────────────────────────────────────────

async function examplePaymentComponents() {
  // Facts from projectDataGateway
  const facts: Record<string, FactValidation> = {
    price_min_cr: {
      fact: 'Minimum price',
      value: 2.1,
      source: 'database',
      confidence: 1.0,
      validated: true,
    },
    gst_rate_pct: {
      fact: 'GST rate',
      value: 5,
      source: 'database',
      confidence: 0.98,
      validated: true,
    },
    stamp_duty_pct: {
      fact: 'Stamp duty rate',
      value: 5,
      source: 'database',
      confidence: 0.98,
      validated: true,
    },
    parking_cost_lakh: {
      fact: 'Parking cost',
      value: 8.5,
      source: 'database',
      confidence: 0.95,
      validated: true,
    },
    project_status: {
      fact: 'Project status',
      value: 'under_construction',
      source: 'database',
      confidence: 1.0,
      validated: true,
    },
  }

  // Select components
  const components = selectComponents({
    facts,
    intent: 'payment',
    confidence: 0.95,
    projectId: 'ats-pristine-sector-150',
  })

  console.log('Selected components:', components)
  // Output: ['confidence-badge', 'property-card', 'emi-calculator', 'payment-breakdown']

  // Build final response
  const response = buildComponentResponse({
    summary: 'EMI for ATS Pristine 2.1Cr property with 75% financing would be ₹10,526/month.',
    confidence: 0.95,
    facts,
    intent: 'payment',
    projectId: 'ats-pristine-sector-150',
    sources: ['database', 'calculator'],
  })

  console.log('Response components:', response.components.length)
  // Output: 4 components ready to render

  return response
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 2: Investment Query → Multiple Intelligence Components
// ─────────────────────────────────────────────────────────────────────────────

async function exampleInvestmentComponents() {
  const facts: Record<string, FactValidation> = {
    price_min_cr: {
      fact: 'Starting price',
      value: 2.1,
      source: 'database',
      confidence: 1.0,
      validated: true,
    },
    price_cagr_pct: {
      fact: 'Price CAGR',
      value: 8.4,
      source: 'derived',
      confidence: 0.95,
      validated: true,
    },
    price_direction: {
      fact: 'Price trend',
      value: 'upward',
      source: 'derived',
      confidence: 0.94,
      validated: true,
    },
    builder_name: {
      fact: 'Builder',
      value: 'ATS',
      source: 'database',
      confidence: 1.0,
      validated: true,
    },
    builder_delivery_score: {
      fact: 'Delivery score',
      value: 92,
      source: 'database',
      confidence: 0.95,
      validated: true,
    },
    decision_thesis: {
      fact: 'Investment thesis',
      value: 'Strong entry with high builder credibility and appreciation trend',
      source: 'database',
      confidence: 0.9,
      validated: true,
    },
    rental_yield_pct: {
      fact: 'Rental yield',
      value: 3.9,
      source: 'database',
      confidence: 0.75,
      validated: true,
    },
    project_status: {
      fact: 'Status',
      value: 'under_construction',
      source: 'database',
      confidence: 1.0,
      validated: true,
    },
  }

  const components = selectComponents({
    facts,
    intent: 'investment',
    confidence: 0.88,
    projectId: 'ats-pristine-sector-150',
  })

  console.log('Investment components:', components)
  // Output: [
  //   'confidence-badge',
  //   'property-card',
  //   'price-chart',
  //   'investment-score',
  //   'rental-yield-card',
  //   'builder-card'
  // ]

  const response = buildComponentResponse({
    summary:
      'ATS Pristine shows strong investment potential with 8.4% historical CAGR and 92/100 builder delivery score. Rental yield of 3.9% provides income upside.',
    confidence: 0.88,
    facts,
    intent: 'investment',
    projectId: 'ats-pristine-sector-150',
    sources: ['database', 'analyzer'],
  })

  return response
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 3: Location Query → Map + Connectivity + Amenities
// ─────────────────────────────────────────────────────────────────────────────

async function exampleLocationComponents() {
  const facts: Record<string, FactValidation> = {
    project_lat: {
      fact: 'Latitude',
      value: 28.54,
      source: 'database',
      confidence: 1.0,
      validated: true,
    },
    project_lng: {
      fact: 'Longitude',
      value: 77.39,
      source: 'database',
      confidence: 1.0,
      validated: true,
    },
    connectivity_count: {
      fact: 'Nearby places',
      value: 12,
      source: 'database',
      confidence: 0.95,
      validated: true,
    },
    amenity_count: {
      fact: 'Amenities',
      value: 24,
      source: 'database',
      confidence: 0.98,
      validated: true,
    },
    commute_time_morning: {
      fact: 'Morning commute',
      value: '22 mins to Sector 62 IT Park',
      source: 'google_maps',
      confidence: 0.92,
      validated: true,
    },
    project_status: {
      fact: 'Status',
      value: 'under_construction',
      source: 'database',
      confidence: 1.0,
      validated: true,
    },
  }

  const components = selectComponents({
    facts,
    intent: 'location',
    confidence: 0.90,
    projectId: 'ats-pristine-sector-150',
  })

  console.log('Location components:', components)
  // Output: [
  //   'confidence-badge',
  //   'property-card',
  //   'map-view',
  //   'connectivity-list',
  //   'amenities-grid',
  //   'commute-card'
  // ]

  const response = buildComponentResponse({
    summary:
      'Sector 150 is well-connected with metro access, 12 nearby facilities, and 22-min commute to major IT parks.',
    confidence: 0.90,
    facts,
    intent: 'location',
    projectId: 'ats-pristine-sector-150',
    sources: ['database', 'google_maps'],
  })

  return response
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 4: Comparison → Side-by-Side Components
// ─────────────────────────────────────────────────────────────────────────────

async function exampleComparisonComponents() {
  const facts: Record<string, FactValidation> = {
    floor_plan_count: {
      fact: 'Floor plans',
      value: 4,
      source: 'database',
      confidence: 0.98,
      validated: true,
    },
    price_min_cr: {
      fact: 'Starting price',
      value: 2.1,
      source: 'database',
      confidence: 1.0,
      validated: true,
    },
    construction_progress_pct: {
      fact: 'Construction progress',
      value: 62,
      source: 'database',
      confidence: 0.95,
      validated: true,
    },
    amenity_count: {
      fact: 'Amenities',
      value: 24,
      source: 'database',
      confidence: 0.98,
      validated: true,
    },
    builder_delivery_score: {
      fact: 'Builder delivery',
      value: 92,
      source: 'database',
      confidence: 0.95,
      validated: true,
    },
    price_cagr_pct: {
      fact: 'Price CAGR',
      value: 8.4,
      source: 'derived',
      confidence: 0.93,
      validated: true,
    },
    project_status: {
      fact: 'Status',
      value: 'under_construction',
      source: 'database',
      confidence: 1.0,
      validated: true,
    },
  }

  const components = selectComponents({
    facts,
    intent: 'compare',
    confidence: 0.91,
    projectId: 'ats-pristine-sector-150',
  })

  console.log('Comparison components:', components)
  // Output: [
  //   'confidence-badge',
  //   'property-card',
  //   'comparison-table',
  //   'price-chart'
  // ]

  const response = buildComponentResponse({
    summary:
      'ATS Pristine edges out Godrej on price appreciation and builder track record. Both offer comparable amenities.',
    confidence: 0.91,
    facts,
    intent: 'compare',
    projectId: 'ats-pristine-sector-150',
    sources: ['database', 'analyzer'],
  })

  return response
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration in Chat Flow
// ─────────────────────────────────────────────────────────────────────────────

/**
 * How components fit into the chat response flow:
 *
 * 1. Get facts from gateway
 *    facts = await getProjectDataForQuery(...)
 *
 * 2. Send facts to LLM for reasoning
 *    llm_output = await LLM({
 *      facts: facts,
 *      prompt: "Summarize investment potential..."
 *    })
 *
 * 3. Build component response
 *    response = buildComponentResponse({
 *      summary: llm_output.summary,
 *      confidence: computeResponseConfidence(facts),
 *      facts: facts,
 *      intent: plan.intent,
 *      projectId: plan.projectIds[0],
 *      sources: gateway_response.sources
 *    })
 *
 * 4. Send to frontend
 *    return { type: 'components', payload: response }
 *
 * 5. Frontend renders
 *    response.components.map(spec => {
 *      if (spec.type === 'emi-calculator') return <EMICalculator {...spec.props} />
 *      if (spec.type === 'price-chart') return <PriceChart {...spec.props} />
 *      ...
 *    })
 */

// ─────────────────────────────────────────────────────────────────────────────
// Key Rules
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ✓ DO:
 * - Only select components when required fields are present
 * - Pass props from validated facts only
 * - Include confidence-badge always
 * - Include property-card for context
 * - Let intent drive component selection
 *
 * ✗ DON'T:
 * - Select components with missing critical data
 * - Make up props
 * - Let LLM choose components (AI selects from what's available)
 * - Mix component types (one response = one intent focus)
 */
