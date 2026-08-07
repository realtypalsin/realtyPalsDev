export type FactMap = {
  projectNames: Set<string>
  projectPrices: Map<string, { min: number; max: number }>
  sectors: Set<string>
  possessionDates: Set<string>
  reraNumbers: Set<string>
  builders: Set<string>
}

export interface GuardrailViolation {
  type: 'name_fabrication' | 'price_fabrication' | 'upreraprj_hallucination' | 'sector_fabrication'
  detail: string
}

export interface GuardrailResult {
  blocked: boolean
  confidence: number
  violations: GuardrailViolation[]
}

function extractFactsFromPrompt(systemPrompt: string): FactMap {
  const facts: FactMap = {
    projectNames: new Set(),
    projectPrices: new Map(),
    sectors: new Set(),
    possessionDates: new Set(),
    reraNumbers: new Set(),
    builders: new Set(),
  }

  const jsonMatch = systemPrompt.match(/Verified facts:\s*({[\s\S]*?})\s*(?=\n\n|$)/)
  if (!jsonMatch) return facts

  try {
    const json = JSON.parse(jsonMatch[1])
    if (Array.isArray(json.projects)) {
      json.projects.forEach((p: any) => {
        if (p.name) facts.projectNames.add(p.name)
        if (p.price_min_cr && p.price_max_cr) {
          facts.projectPrices.set(p.name, { min: p.price_min_cr, max: p.price_max_cr })
        }
        if (p.sector) facts.sectors.add(p.sector)
        if (p.possession_date) facts.possessionDates.add(p.possession_date)
        if (p.rera_number) facts.reraNumbers.add(p.rera_number)
        if (p.builder?.name) facts.builders.add(p.builder.name)
      })
    }
  } catch {
    // graceful fallback: if JSON parse fails, continue without facts
  }
  return facts
}

export async function validateAgainstFacts(
  response: string,
  systemPrompt?: string,
): Promise<GuardrailResult> {
  const violations: GuardrailViolation[] = []

  if (!systemPrompt) {
    return { blocked: false, confidence: 0, violations: [] }
  }

  const facts = extractFactsFromPrompt(systemPrompt)

  // Extract project names from response
  const projectNamePattern =
    /(?:project|properties?|developments?)\s+(?:called\s+)?["']?([A-Z][A-Za-z0-9\s&-]*(?:Heights|Towers|City|Plaza|Square|Park|Garden|Grove|Residence|Residences|Court|Manor|Enclave|Hub|Complex|Villas|Apartments|Suites))["']?/gi
  let match
  const namesInResponse = new Set<string>()
  while ((match = projectNamePattern.exec(response)) !== null) {
    namesInResponse.add(match[1].trim())
  }

  for (const name of namesInResponse) {
    if (!facts.projectNames.has(name)) {
      violations.push({
        type: 'name_fabrication',
        detail: `project name "${name}" not in verified facts`,
      })
    }
  }

  // Extract prices from response: ₹X Cr, X Cr, X Lakh
  const pricePattern = /₹?\s*(\d+(?:\.\d+)?)\s*(?:crore|cr)/gi
  const pricesInResponse = new Set<string>()
  while ((match = pricePattern.exec(response)) !== null) {
    pricesInResponse.add(match[1])
  }

  for (const priceStr of pricesInResponse) {
    const price = parseFloat(priceStr)
    // Check if this price appears in ANY known range
    const isKnown = Array.from(facts.projectPrices.values()).some(
      (r) => price >= r.min && price <= r.max
    )
    if (!isKnown && priceStr.length <= 5) {
      // only flag specific claims, not ranges
      violations.push({
        type: 'price_fabrication',
        detail: `price point ₹${priceStr} Cr not in verified ranges`,
      })
    }
  }

  // Extract sectors from response
  const sectorPattern = /(?:sector|area|locality)\s+(\d+[a-z]*)/gi
  const sectorsInResponse = new Set<string>()
  while ((match = sectorPattern.exec(response)) !== null) {
    sectorsInResponse.add(`Sector ${match[1]}`)
  }

  for (const sector of sectorsInResponse) {
    if (!facts.sectors.has(sector)) {
      violations.push({
        type: 'sector_fabrication',
        detail: `sector "${sector}" not in verified facts`,
      })
    }
  }

  // RERA number validation
  const reraPattern = /UPRERAPRJ\d+/gi
  const rerasInResponse = new Set<string>()
  while ((match = reraPattern.exec(response)) !== null) {
    rerasInResponse.add(match[0].toUpperCase())
  }

  for (const rera of rerasInResponse) {
    if (!facts.reraNumbers.has(rera)) {
      violations.push({
        type: 'upreraprj_hallucination',
        detail: `${rera} not in verified facts`,
      })
    }
  }

  if (violations.length === 0) {
    return { blocked: false, confidence: 0, violations: [] }
  }

  return {
    blocked: true,
    confidence: 0.95,
    violations,
  }
}
