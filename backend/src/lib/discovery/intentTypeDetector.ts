// Detect specific database query intent from user message
export type DatabaseIntentType = 'PAYMENT_PLANS' | 'COSTS' | 'BUILDER_HISTORY' | 'LOCATION' | 'POSSESSION_TIMELINE' | 'GENERAL'

export function detectDatabaseIntent(userMessage: string): DatabaseIntentType {
  const msg = userMessage.toLowerCase()

  // Payment plans: EMI, installments, construction linked, possession linked, flexibility
  if (/\b(payment\s+plan|payment\s+plans|emi|installment|installments|construction\s+linked|possession\s+linked|how\s+to\s+pay|flexibility)\b/i.test(msg)) {
    return 'PAYMENT_PLANS'
  }

  // Location: location, area, proximity, metro, connectivity, nearby, amenities, commute, walkability, infrastructure
  if (/\b(location|where|area|proximity|metro|connectivity|nearby|amenity|amenities|commute|walkability|infrastructure|distance|zone)\b/i.test(msg)) {
    return 'LOCATION'
  }

  // Possession timeline: possession, timeline, OC, occupancy, move in, ready, completion, when, expected, delivery timeline
  if (/\b(possession|timeline|oc|occupancy|ready|move\s+in|when|completion|possession\s+date)\b/i.test(msg) || /delivery\s+timeline/i.test(msg)) {
    return 'POSSESSION_TIMELINE'
  }

  // Builder history: builder, track record, developer, delays, complaints, reputation, trust, rera, litigation
  if (/\b(builder|developer|track\s+record|delay|delays|complaint|complaints|reputation|trust|rera|litigation|history|past\s+project|delivered)\b/i.test(msg)) {
    return 'BUILDER_HISTORY'
  }

  // Costs: total price, cost, total, registration, stamp duty, GST, expense, budget calculation
  if (/\b(cost|costs|price|total|registration|stamp\s+duty|gst|expense|expense|pricing)\b/i.test(msg) || /how\s+much/i.test(msg)) {
    return 'COSTS'
  }

  return 'GENERAL'
}
