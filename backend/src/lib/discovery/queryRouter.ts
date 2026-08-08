export interface RouteDecision {
  primary_table: 'PaymentPlan' | 'CostSheet' | 'Builder' | 'Project'
  weight: number
  secondary_tables: string[]
  fetch_fields: string[]
  confidence_base: number
}

const ROUTE_MAP: Record<string, RouteDecision> = {
  PAYMENT_PLANS: {
    primary_table: 'PaymentPlan',
    weight: 100,
    secondary_tables: ['CostSheet', 'Project'],
    fetch_fields: ['plan_type', 'down_payment_pct', 'total_duration_months', 'milestones', 'best_for', 'watch_out'],
    confidence_base: 95
  },
  COSTS: {
    primary_table: 'CostSheet',
    weight: 100,
    secondary_tables: ['Project'],
    fetch_fields: ['base_price_per_sqft', 'parking_cost', 'ifms', 'club_membership', 'gst_rate', 'stamp_duty_pct'],
    confidence_base: 90
  },
  BUILDER_HISTORY: {
    primary_table: 'Builder',
    weight: 100,
    secondary_tables: [],
    fetch_fields: ['delivery_score', 'projects_delivered_count', 'delayed_projects_count', 'average_delay_months', 'buyer_satisfaction_score'],
    confidence_base: 85
  },
  LOCATION: {
    primary_table: 'Project',
    weight: 100,
    secondary_tables: [],
    fetch_fields: ['location_advantages', 'commute_matrix', 'walkability_score'],
    confidence_base: 75
  },
  POSSESSION_TIMELINE: {
    primary_table: 'Project',
    weight: 100,
    secondary_tables: [],
    fetch_fields: ['possession_date', 'possession_confidence', 'oc_obtained', 'legal_flag', 'litigation_count'],
    confidence_base: 80
  }
}

export function routeQuery(intentType: string, userMessage: string): RouteDecision {
  const route = ROUTE_MAP[intentType]
  if (!route) {
    return {
      primary_table: 'Project',
      weight: 0,
      secondary_tables: [],
      fetch_fields: [],
      confidence_base: 50
    }
  }
  return route
}
