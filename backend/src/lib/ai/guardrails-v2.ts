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

export function extractFactsFromPrompt(systemPrompt: string): FactMap {
  const facts: FactMap = {
    projectNames: new Set(),
    projectPrices: new Map(),
    sectors: new Set(),
    possessionDates: new Set(),
    reraNumbers: new Set(),
    builders: new Set(),
  }

  // Extract any explicitly mentioned sectors from prompt text (e.g. Sector 10, Sector 78)
  const textSectorMatches = systemPrompt.matchAll(/(?:sector|area)\s+(\d+[a-z]*)/gi)
  for (const m of textSectorMatches) {
    facts.sectors.add(`Sector ${m[1]}`)
  }

  // Extract any project names mentioned anywhere in systemPrompt (including user comparison queries & disclaimers)
  const allPromptNameMatches = systemPrompt.matchAll(/(?:compare|with|for|project|about)\s+([A-Z][A-Za-z0-9\s&]+?)(?=\s+(?:with|and|in|for|sector|\n|$))/gi)
  for (const m of allPromptNameMatches) {
    if (m[1] && m[1].trim().length >= 3) {
      facts.projectNames.add(m[1].trim())
    }
  }

  const jsonMatch = systemPrompt.match(/Verified facts:\s*({[\s\S]*?})\s*(?=\n\n|$)/)
  if (!jsonMatch) return facts

  try {
    const json = JSON.parse(jsonMatch[1])
    if (Array.isArray(json.projects)) {
      json.projects.forEach((p: any) => {
        if (p.name) facts.projectNames.add(p.name)
        if (p.price_min_cr) {
          const min = p.price_min_cr
          const max = p.price_max_cr || min * 1.5
          facts.projectPrices.set(p.name, { min, max })
        }
        if (p.sector) {
          facts.sectors.add(p.sector)
          const m = p.sector.match(/(?:sector|area)\s+(\d+[a-z]*)/i)
          if (m) facts.sectors.add(`Sector ${m[1]}`)
        }
        if (p.possession_date) facts.possessionDates.add(p.possession_date)
        if (p.rera_number) facts.reraNumbers.add(p.rera_number)
        if (p.builder?.name) facts.builders.add(p.builder.name)
      })
    }
  } catch {
    // graceful fallback: if JSON parse fails, continue with text facts
  }
  return facts
}

export function validateAgainstFactsSync(
  response: string,
  systemPrompt?: string,
): GuardrailResult {
  const violations: GuardrailViolation[] = []

  if (!systemPrompt) {
    return { blocked: false, confidence: 0, violations: [] }
  }

  // Exempt explicit advisory / external market responses containing advisory disclaimer
  if (
    response.includes('Market Advisory Note') ||
    response.includes('This estimate is based on general market indicators') ||
    response.includes('not verified RERA database records')
  ) {
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

  const GENERIC_WORDS = new Set(['offers', 'features', 'provides', 'includes', 'has', 'luxury', 'modern', 'spacious', 'premium', 'residential', 'upcoming', 'completed', 'various', 'several', 'these', 'those'])

  for (const name of namesInResponse) {
    // Strip leading generic words (e.g., "offers luxury Apartments" -> "Apartments")
    const cleanedName = name.split(/\s+/).filter(w => !GENERIC_WORDS.has(w.toLowerCase())).join(' ').trim()
    if (!cleanedName || cleanedName.length < 3) continue

    const knownLower = Array.from(facts.projectNames).map(n => n.toLowerCase())
    const isKnownName = knownLower.some(k => k.includes(name.toLowerCase()) || name.toLowerCase().includes(k) || (cleanedName && k.includes(cleanedName.toLowerCase())))
    if (!isKnownName) {
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
    // Ignore budget ceiling figures or context phrases like "under ₹1.5 Cr", "budget of 1.5 Cr", "up to 1.5 Cr"
    const isBudgetMention = new RegExp(`(?:budget|under|below|ceiling|up to|max|approx)\\s*(?:of\\s*)?₹?\\s*${priceStr}`, 'i').test(response)
    if (isBudgetMention) continue

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

  // Extract sectors from response (ignore landmark references like "Jaypee Hospital (Sector 128)" or "Sector 51 Metro Station")
  const sectorPattern = /(?:sector|area|locality)\s+(\d+[a-z]*)/gi
  const sectorsInResponse = new Set<string>()
  while ((match = sectorPattern.exec(response)) !== null) {
    const start = Math.max(0, match.index - 40)
    const end = Math.min(response.length, match.index + 50)
    const contextSnippet = response.slice(start, end).toLowerCase()

    if (/(?:metro|station|expressway|highway|interchange|road|bus|hospital|school|college|university|mall|market|plaza|park|hub|institute|campus)/.test(contextSnippet)) {
      continue
    }
    sectorsInResponse.add(`Sector ${match[1]}`)
  }

  for (const sector of sectorsInResponse) {
    const isKnownSector = Array.from(facts.sectors).some(s => s.toLowerCase().includes(sector.toLowerCase()) || sector.toLowerCase().includes(s.toLowerCase()))
    if (!isKnownSector) {
      violations.push({
        type: 'sector_fabrication',
        detail: `sector "${sector}" not in verified facts`,
      })
    }
  }

  // RERA number validation (allow optional slash date suffix like UPRERAPRJ916631/02/2024)
  const reraPattern = /UPRERAPRJ[\w\/]+/gi
  const rerasInResponse = new Set<string>()
  while ((match = reraPattern.exec(response)) !== null) {
    rerasInResponse.add(match[0].toUpperCase())
  }

  for (const rera of rerasInResponse) {
    // Check if rera matches fully or as prefix of any verified RERA number
    const isKnownRera = Array.from(facts.reraNumbers).some(
      (verified) => verified.toUpperCase().startsWith(rera) || rera.startsWith(verified.toUpperCase())
    )
    if (!isKnownRera) {
      violations.push({
        type: 'upreraprj_hallucination',
        detail: `${rera} not in verified facts`,
      })
    }
  }

  if (violations.length === 0) {
    return { blocked: false, confidence: 0, violations: [] }
  }

  // Observe mode: violations are logged with CRITICAL/WARNING telemetry, but responses are not blocked.
  // Set GUARDRAILS_V2_OBSERVE_MODE=false to enable active blocking once fact markers are fully populated.
  const observeMode = process.env.GUARDRAILS_V2_OBSERVE_MODE !== 'false'

  return {
    blocked: observeMode ? false : true,
    confidence: 0.95,
    violations,
  }
}

export async function validateAgainstFacts(
  response: string,
  systemPrompt?: string,
): Promise<GuardrailResult> {
  return validateAgainstFactsSync(response, systemPrompt)
}
