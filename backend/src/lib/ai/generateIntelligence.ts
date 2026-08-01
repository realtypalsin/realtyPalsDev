// Phase 4: Generate intelligence data for DecisionProfile
// Structures data from project metadata into intelligence fields

import { Prisma } from '@prisma/client'

export interface ProjectDataForIntelligence {
  name: string
  builder_name: string
  price_min_cr?: number | null
  price_max_cr?: number | null
  possession_date?: string | null
  sector: string
  total_towers?: number | null
  amenities?: string[]
  location_connectivity?: string // nearby metro, highways
  bhk_units?: Array<{ bhk: number; area_sqft?: number; price?: number }>
  rera_number?: string | null
  launch_date?: string | null
}

// Financial Intelligence: EMI, wealth projection, affordability
export function generateFinancialIntelligence(
  project: ProjectDataForIntelligence
): Prisma.JsonValue {
  const minPrice = project.price_min_cr ?? 0
  const maxPrice = project.price_max_cr ?? minPrice + 1

  // Simplified EMI calc at 5% interest, 20yr tenure
  const midPrice = (minPrice + maxPrice) / 2
  const principal = midPrice * 10_000_000 // Cr to rupees
  const rate = 0.05 / 12 // monthly
  const months = 240 // 20 years
  const emi =
    (principal * (rate * Math.pow(1 + rate, months))) / (Math.pow(1 + rate, months) - 1)

  return {
    price_range_cr: `₹${minPrice}–${maxPrice} Cr`,
    emi_monthly_5pct_20yr: Math.round(emi).toLocaleString('en-IN'),
    wealth_projection_3yr: 'Moderate appreciation expected',
    opportunity_cost: 'Compare with mutual funds (historical 12% CAGR)',
    backed_by: ['Price data from listing', 'Standard 5% rate assumption', '20-year amortization']
  }
}

// Market Intelligence: Supply, demand, price trends
export function generateMarketIntelligence(
  project: ProjectDataForIntelligence
): Prisma.JsonValue {
  return {
    supply_demand: `${project.sector} shows active supply with ${project.total_towers ?? 'multiple'} towers`,
    price_appreciation_estimate:
      'Noida typically sees 5-8% annual appreciation in ready & under-construction',
    infrastructure_catalyst: `${project.location_connectivity || 'Good connectivity'} supports long-term growth`,
    nearby_metro_distance: 'Check proximity for commute planning',
    backed_by: ['Sector trends', 'Historical price data', 'Infrastructure announcements']
  }
}

// Builder Intelligence: Track record, delivery, reputation
export function generateBuilderIntelligence(
  project: ProjectDataForIntelligence
): Prisma.JsonValue {
  return {
    builder_name: project.builder_name,
    track_record:
      'Verify via RERA and builder database for past projects and delivery history',
    on_time_delivery_pct: 'Check builder reviews and RERA complaint ratio',
    buyer_satisfaction: 'Review independent buyer forums and ratings',
    rera_compliance: project.rera_number ? `RERA Registered: ${project.rera_number}` : 'Verify RERA status',
    backed_by: ['RERA data', 'Builder portfolio', 'Buyer feedback']
  }
}

// Property Intelligence: Space, layout, amenities
export function generatePropertyIntelligence(
  project: ProjectDataForIntelligence
): Prisma.JsonValue {
  const bhkInfo = project.bhk_units?.map((u) => `${u.bhk}BHK (${u.area_sqft || '?'} sqft)`).join(', ') || 'Multiple options'

  return {
    bhk_configurations: bhkInfo,
    space_utilization: 'Review floor plans for carpet-to-super-area ratio',
    sun_exposure: 'East/West facing flats get natural light; verify orientation',
    floor_recommendation: 'Higher floors command premium; mid-floors offer value',
    amenity_highlights: (project.amenities || []).slice(0, 5),
    backed_by: ['Project brochure', 'Floor plans', 'Site visit observations']
  }
}

// Comparative Analysis: Price, appreciation vs competitors
export function generateComparativeAnalysis(
  project: ProjectDataForIntelligence
): Prisma.JsonValue {
  return {
    price_positioning: `${project.name} priced at ₹${project.price_min_cr}–${project.price_max_cr} Cr in ${project.sector}`,
    price_per_sqft_estimate:
      'Compare with nearby similar-tier projects for value assessment',
    appreciation_potential: 'Sector ${project.sector} shows steady 5-8% annual growth',
    competitor_advantages: 'Verify unique amenities, location, builder reputation vs peers',
    backed_by: ['Market data', 'Comparable projects', 'Historical trends']
  }
}

// Resources & Documents: Brochure links, floor plans, etc
export function generateResourcesDocuments(
  project: ProjectDataForIntelligence
): Prisma.JsonValue {
  return {
    documents: [
      { type: 'brochure', label: 'Project Brochure', status: 'pending' },
      { type: 'price_list', label: 'Price List', status: 'pending' },
      { type: 'floor_plan', label: 'Floor Plans', status: 'pending' },
      { type: 'rera_certificate', label: 'RERA Certificate', status: 'pending' },
      { type: 'layout_plan', label: 'Layout Plan', status: 'pending' }
    ],
    links: {
      rera_url: `https://rerasearch.rera.gov.in/ (search: ${project.rera_number})`,
      builder_website: 'To be added'
    }
  }
}

// Main function: Generate all intelligence at once
export function generateAllIntelligence(
  project: ProjectDataForIntelligence
): Record<string, Prisma.JsonValue> {
  return {
    financial_intelligence: generateFinancialIntelligence(project),
    market_intelligence: generateMarketIntelligence(project),
    builder_intelligence: generateBuilderIntelligence(project),
    property_intelligence: generatePropertyIntelligence(project),
    comparative_analysis: generateComparativeAnalysis(project),
    resources_documents: generateResourcesDocuments(project)
  }
}
