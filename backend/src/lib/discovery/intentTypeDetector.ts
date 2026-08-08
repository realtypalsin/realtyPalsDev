// Detect specific database query intent from user message
export type DatabaseIntentType = 'PAYMENT_PLANS' | 'COSTS' | 'BUILDER_HISTORY' | 'LOCATION' | 'POSSESSION_TIMELINE' | 'GENERAL'

export function detectDatabaseIntent(userMessage: string): DatabaseIntentType {
  const msg = userMessage.toLowerCase()

  // Payment plans: EMI, installments, construction linked, possession linked, flexibility
  if (/payment\s+plan|emi|installment|construction.{0,10}linked|possession.{0,10}linked|how\s+to\s+pay|flexibility\s+in\s+payment/.test(msg)) {
    return 'PAYMENT_PLANS'
  }

  // Costs: price, cost, total, registration, stamp duty, GST, expense, budget calculation
  if (/cost|price|total|registration|stamp\s+duty|gst|expense|how\s+much|what.{0,10}price|pricing/.test(msg)) {
    return 'COSTS'
  }

  // Builder history: track record, delivery, delays, complaints, reputation, trust, RERA, litigation
  if (/builder|track\s+record|delivery|delay|complaint|reputation|trust|rera|litigation|history|past\s+project/.test(msg)) {
    return 'BUILDER_HISTORY'
  }

  // Location: area, proximity, metro, connectivity, nearby, amenities, commute, walkability, infrastructure
  if (/location|area|proximity|metro|connectivity|nearby|amenity|commute|walkability|infrastructure|distance|zone/.test(msg)) {
    return 'LOCATION'
  }

  // Possession: possession date, timeline, OC, occupancy, ready, when, expected, launch
  if (/possession|timeline|oc|occupancy|ready|when|expected|launch|available|move\s+in/.test(msg)) {
    return 'POSSESSION_TIMELINE'
  }

  return 'GENERAL'
}
