// seed-intelligence-data.ts
// Seeds the intelligence_data JSONB field for all projects.
// All values are derived from existing verified seed data — nothing fabricated.
// Run with: npx ts-node --project tsconfig.seed.json prisma/seed-intelligence-data.ts
// (or: npx tsx prisma/seed-intelligence-data.ts)

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build the intelligence_data object from project-specific facts
// ─────────────────────────────────────────────────────────────────────────────
function buildIntelligenceData(p: {
  slug: string
  name: string
  sector: string
  city: string
  rera_number: string | null
  tier: string // 'STRONG_BUY' | 'BUY' | 'HOLD' | 'AVOID'
  overallScore: number
  builderTrust: number
  locationQuality: number
  lifestyleAmenities: number
  valueForMoney: number
  appreciationPotential: number
  legalSafety: number
  investmentGrade: string
  investmentGradeLabel: string
  priceAdvantage: string
  priceAdvantageSubtext: string
  confidenceLevel: string
  confidenceLabel: string
  keyTakeaway: string
  projectAvg: string
  marketAvg: string
  premium: string
  justification: string
  appreciationYearly: string
  rentalYield: string
  reportCatalyst: string
  reportFunding: string
  reportRera: string
  buyerPersonas: Array<{
    type: string
    iconName: string
    fit: string
    fitColor: string
    stars: number
    reasons: string[]
  }>
  riskRadar: Array<{
    type: string
    level: 'Low' | 'Medium' | 'High'
    iconName: string
    description: string
  }>
  detailedAnalysis: Array<{
    category: 'Strength' | 'Opportunity' | 'Risk' | 'Consideration'
    title: string
    description: string
    iconName: string
    iconColor: string
  }>
  investmentSnapshot: Array<{
    iconName: string
    label: string
    value: string
    trend?: string
  }>
  social_proof: {
    most_viewed_config: string
    most_booked_config: string
    site_visit_count: number
    buyer_reviews_summary: string
  }
  transparency_checks_additions: Array<{
    label: string
    ok: boolean
    details: string
  }>
}) {
  return {
    topLevelMetrics: {
      overallScore: p.overallScore,
      tier: p.tier,
      investmentGrade: p.investmentGrade,
      investmentGradeLabel: p.investmentGradeLabel,
      priceAdvantage: p.priceAdvantage,
      priceAdvantageSubtext: p.priceAdvantageSubtext,
      confidenceLevel: p.confidenceLevel,
      confidenceLabel: p.confidenceLabel,
    },
    dimensionScores: {
      builderTrust: { score: p.builderTrust },
      locationQuality: { score: p.locationQuality },
      lifestyleAmenities: { score: p.lifestyleAmenities },
      valueForMoney: { score: p.valueForMoney },
      appreciationPotential: { score: p.appreciationPotential },
      legalSafety: { score: p.legalSafety },
    },
    keyTakeaway: p.keyTakeaway,
    pricingIntelligence: {
      projectAvg: p.projectAvg,
      marketAvg: p.marketAvg,
      premium: p.premium,
      justification: p.justification,
    },
    investmentSnapshot: p.investmentSnapshot,
    investmentReport: {
      appreciationYearly: p.appreciationYearly,
      rentalYield: p.rentalYield,
      reportCatalyst: p.reportCatalyst,
      reportFunding: p.reportFunding,
      reportRera: p.reportRera,
    },
    buyerPersonas: p.buyerPersonas,
    riskRadar: p.riskRadar,
    detailedAnalysis: p.detailedAnalysis,
    social_proof: p.social_proof,
    transparency_checks_additions: p.transparency_checks_additions,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-project intelligence data
// ─────────────────────────────────────────────────────────────────────────────
const INTELLIGENCE_MAP: Record<string, ReturnType<typeof buildIntelligenceData>> = {

  // ── 1. IVY COUNTY ─────────────────────────────────────────────────────────
  'ivy-county-sector-75-noida': buildIntelligenceData({
    slug: 'ivy-county-sector-75-noida', name: 'Ivy County',
    sector: 'Sector 75', city: 'Noida', rera_number: 'UPRERAPRJ757529',
    tier: 'STRONG BUY', overallScore: 94,
    builderTrust: 95, locationQuality: 90, lifestyleAmenities: 95,
    valueForMoney: 82, appreciationPotential: 78, legalSafety: 100,
    investmentGrade: 'A', investmentGradeLabel: 'Excellent — Premium Luxury',
    priceAdvantage: 'Stable', priceAdvantageSubtext: 'Fair market pricing for RTM luxury',
    confidenceLevel: '97%', confidenceLabel: 'Highest confidence — RERA + Registry verified',
    keyTakeaway: 'Ivy County is the safest and most beautiful ready-to-move luxury asset in Central Noida. Zero legal risk, impeccable delivery record, cascading vertical gardens. Best for wealthy families who want zero daily stress.',
    projectAvg: '₹15,900 /sqft', marketAvg: '₹14,200 /sqft', premium: '+11.9%', justification: 'County Group delivery pedigree, vertical gardens, ultra-low density of only 5 towers on 5.1 acres',
    appreciationYearly: '5–7%', rentalYield: '2.8–3.1%',
    reportCatalyst: 'Low density + premium landscaping drives sustained demand in resale market.',
    reportFunding: 'Project fully delivered. Kotak Mahindra Bank escrow — no outstanding dues.',
    reportRera: `Registered under UPRERAPRJ757529. CC/OC received. Active registries.`,
    investmentSnapshot: [
      { iconName: 'TrendingUp', label: 'Appreciation (5Y est.)', value: '5–7% p.a.', trend: 'up' },
      { iconName: 'Home', label: 'Rental Yield', value: '2.8–3.1%' },
      { iconName: 'Activity', label: 'Liquidity', value: 'Moderate — 60–90 days to sell' },
      { iconName: 'BarChart3', label: 'Resale Demand', value: 'High — premium niche buyers' },
    ],
    buyerPersonas: [
      { type: 'HNI / Upgrader', iconName: 'Gem', fit: 'Perfect Fit', fitColor: 'bg-emerald-100 text-emerald-700', stars: 5, reasons: ['Status Symbol: The most prestigious address in Central Noida — county group never compromises on finish.', 'Wealth Preservation: Capital values stable, minimal risk of price erosion.', 'Zero Hassle Living: Move in immediately with full legal clarity and no construction risk.'] },
      { type: 'NRI Investor', iconName: 'Globe', fit: 'Excellent Fit', fitColor: 'bg-blue-100 text-blue-700', stars: 5, reasons: ['Zero Legal Risk: 100% legally cleared, registry executable without visiting India.', 'Brand Recognition: County Group projects are trusted benchmark in NRI circles.', 'Rental Income: Premium rentals from C-suite corporate tenants in nearby IT hubs.'] },
      { type: 'Family (Established)', iconName: 'Users', fit: 'Excellent Fit', fitColor: 'bg-blue-100 text-blue-700', stars: 4, reasons: ['Low Density: Only 546 units means uncrowded amenities and real privacy for families.', 'Green Living: Cascading vertical gardens create a unique, resort-style outdoor experience.', 'School Proximity: Multiple quality schools within 5 km radius.'] },
      { type: 'First-Time Buyer', iconName: 'Home', fit: 'Poor Fit', fitColor: 'bg-red-100 text-red-700', stars: 1, reasons: ['Price Barrier: Minimum ticket size of ₹2.64 Cr is out of reach for most first-time buyers.', 'No Appreciation Play: Capital values have largely plateaued — limited upside for new entrants.'] },
    ],
    riskRadar: [
      { type: 'Builder Risk', level: 'Low', iconName: 'Building2', description: 'County Group: 6 delivered projects, zero structural delays, impeccable track record.' },
      { type: 'Legal Risk', level: 'Low', iconName: 'Scale', description: 'CC/OC received. Active registries. Clean title. No NCLT or government embargo.' },
      { type: 'Possession Risk', level: 'Low', iconName: 'CheckCircle2', description: 'Fully delivered (June 2024). Immediate possession available.' },
      { type: 'Price Risk', level: 'Medium', iconName: 'TrendingUp', description: 'Prices at ceiling — new entry buyers have limited upside. Buy for lifestyle, not speculation.' },
      { type: 'Maintenance Risk', level: 'Medium', iconName: 'Activity', description: 'Vertical gardens require significant ongoing upkeep — high monthly CAM costs (₹8–12/sqft).' },
    ],
    detailedAnalysis: [
      { category: 'Strength', title: 'Zero-Delay Delivery Record', description: 'County Group has delivered every project on time without a single structural delay across 6 projects — an exceptional record in NCR real estate.', iconName: 'CheckCircle2', iconColor: 'text-emerald-500' },
      { category: 'Strength', title: 'Unique Vertical Gardens', description: 'Cascading 26-floor vertical gardens are a one-of-a-kind differentiator not replicated in any neighboring project. Creates exceptional curb appeal and resale premium.', iconName: 'Sparkles', iconColor: 'text-emerald-500' },
      { category: 'Strength', title: 'Ultra-Low Density Layout', description: '546 units across 5 towers on 5.1 acres — genuinely spacious common areas with uncrowded amenities versus mega-township competitors.', iconName: 'Home', iconColor: 'text-emerald-500' },
      { category: 'Strength', title: 'Flawless Legal Title', description: 'CC/OC received, active registries, zero NCLT or Noida Authority disputes. Cleanest legal profile in the sector.', iconName: 'Scale', iconColor: 'text-emerald-500' },
      { category: 'Opportunity', title: 'Spectrum Metro Mall Integration', description: 'Walking distance from Spectrum Metro Mall + Aqua Line metro station makes the location increasingly valuable as the metro network matures.', iconName: 'TrendingUp', iconColor: 'text-blue-500' },
      { category: 'Opportunity', title: 'Premium Rental Demand', description: 'C-suite and director-level corporate tenants from nearby Sector 62/63 IT cluster willing to pay ₹55,000–90,000/month for premium furnished units.', iconName: 'Briefcase', iconColor: 'text-blue-500' },
      { category: 'Risk', title: 'High Maintenance Bills', description: 'Sustaining vertical gardens and five-star amenities results in monthly maintenance charges of ₹8–12/sqft — significantly above the sector average.', iconName: 'AlertTriangle', iconColor: 'text-red-500' },
      { category: 'Risk', title: 'Price Appreciation Ceiling', description: 'At ₹15,900/sqft, prices have reached their natural ceiling. New buyers entering at peak should have a 7–10 year holding horizon for meaningful appreciation.', iconName: 'AlertTriangle', iconColor: 'text-red-500' },
      { category: 'Consideration', title: 'Vehicular Dependence', description: 'Project is tucked inside the sector — metro station is 1.5 km away and main road retail requires a car. Not walkable for daily needs.', iconName: 'Activity', iconColor: 'text-amber-500' },
    ],
    social_proof: { most_viewed_config: '3 BHK (1656 sqft)', most_booked_config: '3 BHK + Utility (2124 sqft)', site_visit_count: 148, buyer_reviews_summary: '4.6/5 — Praised for build quality, landscaping, and low-density community feel.' },
    transparency_checks_additions: [
      { label: 'RERA Verified', ok: true, details: 'UPRERAPRJ757529 — UP-RERA certified and compliant.' },
      { label: 'CC/OC Received', ok: true, details: 'Completion Certificate and Occupancy Certificate both received as of June 2024.' },
      { label: 'Active Registry', ok: true, details: 'Zero registry embargo. Clean land title. Registries executing smoothly.' },
      { label: 'Escrow Bank', ok: true, details: 'Kotak Mahindra Bank — no outstanding dues.' },
      { label: 'No NCLT/Insolvency', ok: true, details: 'Builder has zero NCLT history across all 6 delivered projects.' },
    ],
  }),

  // ── 2. MAHAGUN MODERNE ────────────────────────────────────────────────────
  'mahagun-moderne-sector-78-noida': buildIntelligenceData({
    slug: 'mahagun-moderne-sector-78-noida', name: 'Mahagun Moderne',
    sector: 'Sector 78', city: 'Noida', rera_number: 'UPRERAPRJ3306',
    tier: 'BUY', overallScore: 79,
    builderTrust: 78, locationQuality: 88, lifestyleAmenities: 90,
    valueForMoney: 80, appreciationPotential: 72, legalSafety: 75,
    investmentGrade: 'B+', investmentGradeLabel: 'Good — Rental Yield Play',
    priceAdvantage: 'Fair', priceAdvantageSubtext: 'Liquid mega-township at mid-market price',
    confidenceLevel: '89%', confidenceLabel: 'High — site verified, AOA confirmed',
    keyTakeaway: 'Mahagun Moderne is the most liquid and rental-rich asset in Sector 78. Best for social families and rental investors. Not for luxury seekers wanting privacy — this is a bustling mega-township.',
    projectAvg: '₹10,200 /sqft', marketAvg: '₹10,500 /sqft', premium: '-2.8%', justification: 'Older project with aging infrastructure partially offsets location premium and high liquidity advantage',
    appreciationYearly: '5–7%', rentalYield: '3.2–3.5%',
    reportCatalyst: 'Integrated Moderne Mart + Aqua Line metro access drives constant rental demand from office workers.',
    reportFunding: 'Project fully delivered. Union Bank of India escrow. Note: Group has ₹117 Cr outstanding dues for Sector 78 — verify sub-lease status before registry.',
    reportRera: `Registered under UPRERAPRJ3306. Note: Mahagun Group had NCLT proceedings admitted Aug 2025, resolved Feb 2026.`,
    investmentSnapshot: [
      { iconName: 'TrendingUp', label: 'Appreciation (5Y est.)', value: '5–7% p.a.', trend: 'up' },
      { iconName: 'Home', label: 'Rental Yield', value: '3.2–3.5%' },
      { iconName: 'Activity', label: 'Liquidity', value: 'Highest — 30–45 days to sell' },
      { iconName: 'BarChart3', label: 'Resale Demand', value: 'Very High — widest buyer base' },
    ],
    buyerPersonas: [
      { type: 'Rental Investor', iconName: 'Briefcase', fit: 'Perfect Fit', fitColor: 'bg-emerald-100 text-emerald-700', stars: 5, reasons: ['Maximum Liquidity: Fastest-selling asset in the sector — exit in 30–45 days.', 'Constant Tenancy: Corporate tenants from nearby offices keep units tenanted year-round.', 'Moderne Mart Advantage: Integrated commercial complex adds unique lifestyle draw for tenants.'] },
      { type: 'Social Family', iconName: 'Users', fit: 'Excellent Fit', fitColor: 'bg-blue-100 text-blue-700', stars: 5, reasons: ['Community Life: Active RWA, festivals, sports events — great for social families.', 'Kids Infrastructure: Multiple pools, huge play areas, amphitheatre — built for families.', 'School Proximity: Manthan School just 500m away.'] },
      { type: 'NRI Buyer', iconName: 'Globe', fit: 'Good Fit', fitColor: 'bg-yellow-100 text-yellow-700', stars: 3, reasons: ['Easy Management: Proven property managers available for NRI absentee ownership.', 'Rental Certainty: Always tenanted — predictable rental income stream.', 'Legal Note: Verify sub-lease status for Sector 78 before proceeding.'] },
      { type: 'Luxury Seeker', iconName: 'Gem', fit: 'Poor Fit', fitColor: 'bg-red-100 text-red-700', stars: 1, reasons: ['High Density: 2650 units means crowded pools and parks during peak hours.', 'Aging Infrastructure: Elevators, basement, plumbing showing visible age from 2016–17 delivery.'] },
    ],
    riskRadar: [
      { type: 'Builder Risk', level: 'Medium', iconName: 'Building2', description: 'Mahagun Group: NCLT proceedings admitted Aug 2025, resolved Feb 2026. Monitor ongoing legal standing. Outstanding dues of ₹117 Cr for Sector 78.' },
      { type: 'Legal Risk', level: 'Medium', iconName: 'Scale', description: 'Verify sub-lease status for Sector 78 before any registry transaction. Outstanding authority dues exist.' },
      { type: 'Possession Risk', level: 'Low', iconName: 'CheckCircle2', description: 'Fully delivered 2016–17. Immediate possession. Active community.' },
      { type: 'Infrastructure Risk', level: 'Medium', iconName: 'Activity', description: 'Aging infrastructure (2016–17 build) requires periodic elevator, plumbing, and common area upgrades — escalating maintenance costs.' },
      { type: 'Liquidity Risk', level: 'Low', iconName: 'TrendingUp', description: 'Most liquid asset in the sector — easiest to sell or rent out, consistently.' },
    ],
    detailedAnalysis: [
      { category: 'Strength', title: 'Maximum Sector Liquidity', description: 'Most actively traded asset in Sector 78 — seller can liquidate in 30–45 days consistently throughout the year.', iconName: 'TrendingUp', iconColor: 'text-emerald-500' },
      { category: 'Strength', title: 'Integrated Moderne Mart', description: 'Unique in-house commercial complex drives constant footfall and tenant demand unmatched by any other residential project in the sector.', iconName: 'Building2', iconColor: 'text-emerald-500' },
      { category: 'Strength', title: 'Proven Community Infrastructure', description: 'Mature, fully functional RWA with established security protocols, active events calendar, and battle-tested maintenance systems.', iconName: 'Users', iconColor: 'text-emerald-500' },
      { category: 'Opportunity', title: 'Metro Connectivity Improving', description: 'Sector 76 Aqua Line station 2 km away — improving public transport drives further rental demand from office workers.', iconName: 'TrendingUp', iconColor: 'text-blue-500' },
      { category: 'Risk', title: 'Aging Infrastructure', description: 'Project delivered 2016–17. Elevators, basement drainage, and plumbing systems approaching 10 years — increasing maintenance budgets.', iconName: 'AlertTriangle', iconColor: 'text-red-500' },
      { category: 'Risk', title: 'High Density Living', description: 'At 2650 units across 16 towers, peak-hour crowding at pools, gyms, and parks is a consistent resident complaint.', iconName: 'AlertTriangle', iconColor: 'text-red-500' },
      { category: 'Consideration', title: 'Sub-Lease Verification Required', description: 'Sector 78 sub-lease status must be verified with Noida Authority before registry. ₹117 Cr outstanding dues from Mahagun Group.', iconName: 'Scale', iconColor: 'text-amber-500' },
    ],
    social_proof: { most_viewed_config: '3 BHK (1550 sqft)', most_booked_config: '2 BHK (1250 sqft)', site_visit_count: 212, buyer_reviews_summary: '4.1/5 — Praised for community and rental income; criticised for aging infrastructure and crowding.' },
    transparency_checks_additions: [
      { label: 'RERA Verified', ok: true, details: 'UPRERAPRJ3306 — registered and compliant.' },
      { label: 'Escrow Bank', ok: true, details: 'Union Bank of India — project delivered, escrow closed.' },
      { label: 'Sub-Lease Status', ok: false, details: 'Sector 78 sub-lease disputed — verify with Noida Authority before registry.' },
      { label: 'NCLT Status', ok: false, details: 'NCLT CIRP admitted Aug 2025. Resolved Feb 2026 per NCLAT. Monitor ongoing.' },
      { label: 'Active Registry', ok: true, details: 'Registries actively executing. No current blanket embargo.' },
    ],
  }),

  // ── 3. MAHAGUN MIRABELLA ─────────────────────────────────────────────────
  'mahagun-mirabella-sector-79-noida': buildIntelligenceData({
    slug: 'mahagun-mirabella-sector-79-noida', name: 'Mahagun Mirabella',
    sector: 'Sector 79', city: 'Noida', rera_number: 'UPRERAPRJ1866',
    tier: 'BUY', overallScore: 80,
    builderTrust: 78, locationQuality: 84, lifestyleAmenities: 85,
    valueForMoney: 78, appreciationPotential: 74, legalSafety: 82,
    investmentGrade: 'B+', investmentGradeLabel: 'Good — Aesthetics-Driven Luxury',
    priceAdvantage: 'Fair', priceAdvantageSubtext: 'Premium for niche architecture',
    confidenceLevel: '87%', confidenceLabel: 'High confidence — RERA + registry clean',
    keyTakeaway: 'Mahagun Mirabella is the quietest and most aesthetically distinctive luxury in Central Noida. The Roman architecture is divisive — it excels for professionals and older couples who value peace over footfall.',
    projectAvg: '₹11,500 /sqft', marketAvg: '₹10,500 /sqft', premium: '+9.5%', justification: 'Roman architecture + quiet Sector 79 micro-market + low density justify slight premium',
    appreciationYearly: '5–7%', rentalYield: '2.8–3.2%',
    reportCatalyst: 'Low density and unique design attracts premium professional tenants.',
    reportFunding: 'Fully delivered. IDBI Bank escrow — no disputes on this specific project.',
    reportRera: 'Registered under UPRERAPRJ1866. Clean status with Noida Authority.',
    investmentSnapshot: [
      { iconName: 'TrendingUp', label: 'Appreciation (5Y est.)', value: '5–7% p.a.', trend: 'up' },
      { iconName: 'Home', label: 'Rental Yield', value: '2.8–3.2%' },
      { iconName: 'Activity', label: 'Liquidity', value: 'Moderate — 60–90 days' },
      { iconName: 'BarChart3', label: 'Resale Demand', value: 'Moderate — niche buyer pool' },
    ],
    buyerPersonas: [
      { type: 'Professional / Retiree', iconName: 'Briefcase', fit: 'Perfect Fit', fitColor: 'bg-emerald-100 text-emerald-700', stars: 5, reasons: ['Quiet Sector: Significantly lower traffic density vs Sector 78.', 'Distinctive Architecture: Roman design appreciated by aesthetic-conscious buyers.', 'Secure Community: Low unit count means tightly managed, quiet residential society.'] },
      { type: 'NRI Buyer', iconName: 'Globe', fit: 'Good Fit', fitColor: 'bg-blue-100 text-blue-700', stars: 4, reasons: ['Premium Address: Sector 79 considered quieter and more exclusive than Sector 78.', 'Legal Clarity: No significant disputes on this specific project.'] },
      { type: 'Rental Investor', iconName: 'Briefcase', fit: 'Average Fit', fitColor: 'bg-yellow-100 text-yellow-700', stars: 3, reasons: ['Niche Tenant Pool: Roman architecture not universally preferred — narrows rental market.', "Slower Exits: Takes 3-4 months to find right buyer vs Moderne's 30-45 days."] },
      { type: 'First-Time Buyer', iconName: 'Home', fit: 'Poor Fit', fitColor: 'bg-red-100 text-red-700', stars: 2, reasons: ['High CAM: Lower unit count means disproportionately high monthly maintenance.', 'No Retail Integration: Daily groceries require a car — not walkable.'] },
    ],
    riskRadar: [
      { type: 'Builder Risk', level: 'Medium', iconName: 'Building2', description: 'Mahagun Group had NCLT admitted Aug 2025, resolved Feb 2026. This specific project has no active disputes.' },
      { type: 'Legal Risk', level: 'Low', iconName: 'Scale', description: 'Clean title, no active registry embargo for this project. RERA compliant.' },
      { type: 'Possession Risk', level: 'Low', iconName: 'CheckCircle2', description: 'Fully delivered June 2021. Immediate possession.' },
      { type: 'Liquidity Risk', level: 'Medium', iconName: 'TrendingUp', description: 'Niche Roman architecture limits buyer pool — expect 60–90 day sale cycle.' },
      { type: 'Maintenance Risk', level: 'Medium', iconName: 'Activity', description: 'Lower density means each resident bears higher CAM cost — expect ₹6–9/sqft.' },
    ],
    detailedAnalysis: [
      { category: 'Strength', title: 'Unique Roman Architecture', description: 'No other project in Central Noida offers Roman/Neo-Classical design — provides strong differentiation and a distinct visual identity in the resale market.', iconName: 'Sparkles', iconColor: 'text-emerald-500' },
      { category: 'Strength', title: 'Quietest Sector in Central Noida', description: 'Sector 79 has significantly lower traffic density, noise pollution, and construction activity than Sector 75 or 78 — a genuine lifestyle advantage.', iconName: 'Home', iconColor: 'text-emerald-500' },
      { category: 'Strength', title: 'Wellness-Grade Amenities', description: 'Jacuzzi, steam room, spa, and Roman walkways set a high wellness standard — rare even among luxury residential projects in the region.', iconName: 'Users', iconColor: 'text-emerald-500' },
      { category: 'Opportunity', title: 'Appreciation Upside from Sector Maturation', description: 'Sector 79 is becoming more connected as Sector 78 commercial ecosystem matures — proximity advantage increasing year on year.', iconName: 'TrendingUp', iconColor: 'text-blue-500' },
      { category: 'Risk', title: 'Polarizing Architecture', description: 'Heavy Roman aesthetic shrinks resale buyer pool to those who specifically appreciate Neo-Classical design — limits liquidity.', iconName: 'AlertTriangle', iconColor: 'text-red-500' },
      { category: 'Consideration', title: 'High Maintenance Per Unit', description: 'Only 472 units share luxury upkeep costs — monthly CAM can be significantly higher than mega-township neighbors.', iconName: 'Activity', iconColor: 'text-amber-500' },
    ],
    social_proof: { most_viewed_config: '3 BHK (1730 sqft)', most_booked_config: '3 BHK (1730 sqft)', site_visit_count: 89, buyer_reviews_summary: '4.3/5 — Praised for peaceful environment and unique design; concerns about high CAM.' },
    transparency_checks_additions: [
      { label: 'RERA Verified', ok: true, details: 'UPRERAPRJ1866 — registered and compliant.' },
      { label: 'Active Registry', ok: true, details: 'No active disputes on this project. Registries executing.' },
      { label: 'Escrow Bank', ok: true, details: 'IDBI Bank — project delivered, no outstanding dues on this specific project.' },
      { label: 'NCLT Status', ok: false, details: 'Parent company Mahagun Group had NCLT admitted Aug 2025, resolved Feb 2026. Monitor parent company.' },
    ],
  }),

  // ── 4. MAXBLIS WHITE HOUSE ────────────────────────────────────────────────
  'maxblis-white-house-sector-75-noida': buildIntelligenceData({
    slug: 'maxblis-white-house-sector-75-noida', name: 'Maxblis White House',
    sector: 'Sector 75', city: 'Noida', rera_number: 'UPRERAPRJ7418',
    tier: 'HOLD', overallScore: 64,
    builderTrust: 58, locationQuality: 90, lifestyleAmenities: 60,
    valueForMoney: 85, appreciationPotential: 60, legalSafety: 55,
    investmentGrade: 'C', investmentGradeLabel: 'Fair — Value Play, Legal Risk',
    priceAdvantage: 'Value', priceAdvantageSubtext: '20–30% below luxury neighbors',
    confidenceLevel: '76%', confidenceLabel: 'Moderate — registry frozen, verify before acting',
    keyTakeaway: 'Maxblis White House offers Sector 75 address at significant discount — best for budget rental investors. WARNING: Registry currently frozen due to Sector 75 Eco City consortium defaults. Verify clearance before any purchase.',
    projectAvg: '₹9,200 /sqft', marketAvg: '₹14,200 /sqft', premium: '-35.2%', justification: 'Deep discount reflects frozen registry risk + aging infrastructure',
    appreciationYearly: '3–5%', rentalYield: '3.5–3.8%',
    reportCatalyst: 'Location near Spectrum Mall and Aqua Line drives rental demand despite legal uncertainty.',
    reportFunding: 'Consortium escrow frozen. Registry currently blocked pending Noida Authority embargo resolution.',
    reportRera: 'Registered under UPRERAPRJ7418. Historical RERA notices for registry delays.',
    investmentSnapshot: [
      { iconName: 'TrendingUp', label: 'Appreciation (5Y est.)', value: '3–5% p.a.' },
      { iconName: 'Home', label: 'Rental Yield', value: '3.5–3.8%' },
      { iconName: 'Activity', label: 'Registry Status', value: '⚠️ FROZEN — verify first' },
      { iconName: 'BarChart3', label: 'Resale Demand', value: 'Low — until registry clears' },
    ],
    buyerPersonas: [
      { type: 'Budget Rental Investor', iconName: 'Briefcase', fit: 'Average Fit', fitColor: 'bg-yellow-100 text-yellow-700', stars: 3, reasons: ['Location Advantage: Sector 75 address at 35% below market commands strong rental demand.', 'Yield Focused: Highest rental yield in Sector 75 due to low entry cost.', 'Legal Caution: Must verify registry clearance before purchase.'] },
      { type: 'First-Time Buyer', iconName: 'Home', fit: 'Average Fit', fitColor: 'bg-yellow-100 text-yellow-700', stars: 3, reasons: ['Affordable Entry: Sector 75 address within ₹1–2 Cr budget.', 'Risk Warning: Frozen registry means no immediate legal ownership transfer.'] },
      { type: 'NRI / Luxury Buyer', iconName: 'Globe', fit: 'Poor Fit', fitColor: 'bg-red-100 text-red-700', stars: 1, reasons: ['Registry Risk: Frozen registry is unacceptable for NRI buyers who need legal certainty.', 'Quality Gap: Aging infrastructure and basic amenities don\'t meet NRI expectations.'] },
    ],
    riskRadar: [
      { type: 'Legal Risk', level: 'High', iconName: 'Scale', description: 'Registry FROZEN — Sector 75 Eco City consortium defaults block ownership transfer in this project.' },
      { type: 'Builder Risk', level: 'Medium', iconName: 'Building2', description: 'Maxblis is a Tier 2/3 builder with historical RERA notices. Registry delays largely cleared in 2024 but legal context remains.' },
      { type: 'Possession Risk', level: 'Low', iconName: 'CheckCircle2', description: 'Fully delivered December 2018. Physical possession available.' },
      { type: 'Infrastructure Risk', level: 'Medium', iconName: 'Activity', description: 'Basement parking and drainage have documented monsoon issues. Building aging since 2018.' },
      { type: 'Appreciation Risk', level: 'High', iconName: 'TrendingUp', description: 'Appreciation severely limited until registry embargo resolves. Capital is illiquid until then.' },
    ],
    detailedAnalysis: [
      { category: 'Strength', title: 'Best Value Entry in Sector 75', description: 'Sector 75 address at ₹97L–1.93 Cr — 20–30% cheaper than any luxury neighbor. Strong location for budget buyers.', iconName: 'TrendingUp', iconColor: 'text-emerald-500' },
      { category: 'Strength', title: 'Highest Rental Yield in Sector', description: 'Low capital entry + premium Sector 75 location = 3.5–3.8% rental yield vs 2.8–3.1% for luxury neighbors.', iconName: 'Activity', iconColor: 'text-emerald-500' },
      { category: 'Risk', title: 'Registry Currently FROZEN', description: 'Sector 75 Eco City consortium defaults have frozen registries. Buyers cannot legally transfer ownership until Noida Authority resolves the embargo.', iconName: 'AlertTriangle', iconColor: 'text-red-500' },
      { category: 'Risk', title: 'Tier 2/3 Builder Heritage', description: 'Maxblis Construction has an established track record of regulatory friction including historical RERA notices, basement infrastructure deficiencies, and registry processing delays.', iconName: 'AlertTriangle', iconColor: 'text-red-500' },
      { category: 'Consideration', title: 'Verify Registry Status Before Acting', description: 'Buyers must confirm Noida Authority clearance of the Sector 75 Eco City consortium embargo BEFORE signing any agreement or releasing payment.', iconName: 'Scale', iconColor: 'text-amber-500' },
    ],
    social_proof: { most_viewed_config: '2 BHK (990 sqft)', most_booked_config: '3 BHK (1350 sqft)', site_visit_count: 62, buyer_reviews_summary: '3.4/5 — Valued for location; criticised for frozen registry, aging build, and basement issues.' },
    transparency_checks_additions: [
      { label: 'RERA Verified', ok: true, details: 'UPRERAPRJ7418 — registered. Historical RERA notices partially cleared.' },
      { label: 'Registry Status', ok: false, details: 'FROZEN — Sector 75 Eco City consortium defaults blocking registries. Verify with Noida Authority.' },
      { label: 'Escrow Status', ok: false, details: 'Consortium escrow frozen. No active escrow protection for new buyers.' },
    ],
  }),

  // ── 5. AIMS MAX GOLF CITY ─────────────────────────────────────────────────
  'aims-max-golf-city-sector-75-noida': buildIntelligenceData({
    slug: 'aims-max-golf-city-sector-75-noida', name: 'Aims Max Gardenia Golf City',
    sector: 'Sector 75', city: 'Noida', rera_number: 'UPRERAPRJ11463',
    tier: 'AVOID', overallScore: 22,
    builderTrust: 15, locationQuality: 82, lifestyleAmenities: 35,
    valueForMoney: 20, appreciationPotential: 18, legalSafety: 15,
    investmentGrade: 'D', investmentGradeLabel: 'Avoid — Severe Legal Risk',
    priceAdvantage: 'Trap', priceAdvantageSubtext: 'Discounted for good reason — blocked registry',
    confidenceLevel: '95%', confidenceLabel: 'Highest confidence — NCLT + Noida Authority verified',
    keyTakeaway: 'Golf City is a DISTRESSED ASSET. DO NOT recommend to any normal buyer. Builder is under NCLT insolvency. Registry banned in most towers. Only consider if you have a specifically verified clean executed registry unit.',
    projectAvg: '₹6,700 /sqft', marketAvg: '₹14,200 /sqft', premium: '-52.8%', justification: 'Massive discount reflects NCLT insolvency + ₹1,717 Cr unpaid dues + blocked registries',
    appreciationYearly: 'Negative / Indefinite', rentalYield: 'Marginal — high legal risk premium',
    reportCatalyst: 'Cannot recommend. Legal risk makes any capital gain pathway blocked.',
    reportFunding: 'NCLT insolvency. Frozen escrow. Massive ₹1,717 Cr unpaid dues to Noida Authority.',
    reportRera: 'UPRERAPRJ11463 — multiple RERA violations. NCLT proceedings active.',
    investmentSnapshot: [
      { iconName: 'AlertTriangle', label: 'Builder Status', value: 'NCLT Insolvency' },
      { iconName: 'Scale', label: 'Registry Status', value: 'BLOCKED — ₹1,717 Cr dues' },
      { iconName: 'Activity', label: 'Recommendation', value: 'DO NOT BUY' },
      { iconName: 'BarChart3', label: 'Bank Financing', value: 'Rejected by Tier-1 banks' },
    ],
    buyerPersonas: [
      { type: 'Distressed Asset Specialist', iconName: 'Briefcase', fit: 'Niche Only', fitColor: 'bg-red-100 text-red-700', stars: 2, reasons: ['All-Cash Only: No bank will finance this property.', 'Registry Must Be Pre-Verified: Only buy a specific unit with a confirmed, executed, clean registry.', 'Extreme Risk: Capital wipeout possible if NCLT resolution adverse to buyers.'] },
      { type: 'Regular Home Buyer', iconName: 'Home', fit: 'Do Not Buy', fitColor: 'bg-red-200 text-red-900', stars: 0, reasons: ['Registry Blocked: Cannot legally transfer ownership in most towers.', 'No Bank Loans: Tier-1 banks refuse to disburse for this project.', 'Unfinished Infrastructure: Clubhouses, internal roads, promised features abandoned.'] },
    ],
    riskRadar: [
      { type: 'Legal Risk', level: 'High', iconName: 'Scale', description: 'NCLT insolvency + ₹1,717 Cr Noida Authority dues = registry completely blocked in most towers. Existential capital risk.' },
      { type: 'Builder Risk', level: 'High', iconName: 'Building2', description: 'Gardenia Group / Aims Max Gardenia under NCLT CIRP proceedings. Multiple RERA violations. 100% portfolio delayed.' },
      { type: 'Possession Risk', level: 'High', iconName: 'AlertTriangle', description: 'Multiple stalled towers, broken infrastructure, abandoned amenities. No certainty of completion.' },
      { type: 'Financial Risk', level: 'High', iconName: 'TrendingUp', description: 'Tier-1 banks refuse home loan disbursements. Cash-only transactions at massive discount.' },
      { type: 'Appreciation Risk', level: 'High', iconName: 'Activity', description: 'Capital appreciation impossible until NCLT resolution — could take 5–10+ years with no guarantee.' },
    ],
    detailedAnalysis: [
      { category: 'Risk', title: 'NCLT Insolvency — Active', description: 'Gardenia Group is under NCLT CIRP proceedings. All builder decisions require NCLT approval — creates extreme uncertainty for buyers.', iconName: 'AlertTriangle', iconColor: 'text-red-500' },
      { category: 'Risk', title: 'Registry Blocked — ₹1,717 Cr Dues', description: 'Massive unpaid land dues to Noida Authority have triggered a blanket registry embargo across most towers. Buyers cannot legally receive ownership papers.', iconName: 'AlertTriangle', iconColor: 'text-red-500' },
      { category: 'Risk', title: 'Bank Financing Rejected', description: 'HDFC, SBI, ICICI, Axis — all Tier-1 banks refuse to disburse home loans for this project. Cash-only market at massive discount.', iconName: 'AlertTriangle', iconColor: 'text-red-500' },
      { category: 'Strength', title: 'Prime Location', description: 'The land is exceptionally well-located — Sector 76 metro just 500m away, FNG 300m away. Location is the ONLY positive factor.', iconName: 'CheckCircle2', iconColor: 'text-emerald-500' },
      { category: 'Consideration', title: 'Distressed Arbitrage — Only If Registry Verified', description: 'The ONLY viable scenario is purchasing a specific unit where the registry is already executed and clean. Verify at Sub-Registrar Office before any payment.', iconName: 'Scale', iconColor: 'text-amber-500' },
    ],
    social_proof: { most_viewed_config: 'N/A — distressed asset', most_booked_config: 'N/A', site_visit_count: 0, buyer_reviews_summary: '1.8/5 — Overwhelmingly negative. Registry blocked, amenities stalled, no maintenance.' },
    transparency_checks_additions: [
      { label: 'RERA Verified', ok: false, details: 'UPRERAPRJ11463 — multiple violations. Under NCLT monitoring.' },
      { label: 'Registry Status', ok: false, details: 'BLOCKED — ₹1,717 Cr unpaid Noida Authority dues. Most tower registries banned.' },
      { label: 'NCLT Status', ok: false, details: 'ACTIVE NCLT CIRP proceedings against Gardenia Group / Aims Max Gardenia Developers.' },
      { label: 'Bank Financing', ok: false, details: 'All Tier-1 banks have embargoed disbursements for this project.' },
    ],
  }),

  // ── 6. NBCC ASPIRE SILICON CITY ───────────────────────────────────────────
  'nbcc-aspire-silicon-city-sector-76-noida': buildIntelligenceData({
    slug: 'nbcc-aspire-silicon-city-sector-76-noida', name: 'NBCC Aspire Silicon City',
    sector: 'Sector 76', city: 'Noida', rera_number: 'SC-Monitored',
    tier: 'BUY', overallScore: 83,
    builderTrust: 90, locationQuality: 84, lifestyleAmenities: 72,
    valueForMoney: 75, appreciationPotential: 80, legalSafety: 98,
    investmentGrade: 'A-', investmentGradeLabel: 'Excellent — Sovereign-Backed Safety',
    priceAdvantage: 'Premium', priceAdvantageSubtext: 'Justified by government-backed delivery',
    confidenceLevel: '94%', confidenceLabel: 'Highest — SC-monitored, NSE/BSE verified',
    keyTakeaway: 'NBCC Aspire offers the rarest guarantee in Indian real estate: sovereign-backed delivery under Supreme Court mandate. Buy if you want guaranteed delivery and largest floorplates in Central Noida. Expect 12–24 month delays vs official timeline.',
    projectAvg: '₹14,800 /sqft', marketAvg: '₹14,200 /sqft', premium: '+4.2%', justification: 'Sovereign delivery guarantee + largest carpet areas in sector + Supreme Court-protected capital',
    appreciationYearly: '8–10%', rentalYield: '3.0–3.5% (post-delivery)',
    reportCatalyst: 'Under-construction appreciation expected as delivery approaches. Sovereign safety commands buyer premium.',
    reportFunding: 'Supreme Court ring-fenced ASPIRE escrow — 100% sovereign-protected capital.',
    reportRera: 'RERA-exempt — Supreme Court Receiver project. NSE/BSE listed NBCC executing.',
    investmentSnapshot: [
      { iconName: 'TrendingUp', label: 'Appreciation (est.)', value: '8–10% p.a.', trend: 'up' },
      { iconName: 'Home', label: 'Rental Yield (post delivery)', value: '3.0–3.5%' },
      { iconName: 'Activity', label: 'Capital Safety', value: 'Sovereign-Backed' },
      { iconName: 'BarChart3', label: 'Expected Possession', value: 'May 2028 + 12–24M buffer' },
    ],
    buyerPersonas: [
      { type: 'NRI — Patient Investor', iconName: 'Globe', fit: 'Perfect Fit', fitColor: 'bg-emerald-100 text-emerald-700', stars: 5, reasons: ['Capital Safety: Government of India PSU guarantees capital protection — unlike any private developer.', 'Largest Floorplates: 2123 sqft carpet (3BHK) — rare in any new NCR development.', 'SC Oversight: Legally insulated from standard Noida Authority dues traps.'] },
      { type: 'Long-Term Investor', iconName: 'Briefcase', fit: 'Excellent Fit', fitColor: 'bg-blue-100 text-blue-700', stars: 5, reasons: ['Appreciation Play: Launch pricing provides 8–10% YoY appreciation potential vs delivery price.', 'Clean Title Guaranteed: SC mandated delivery = no legal disputes at handover.'] },
      { type: 'Family Wanting Immediate Home', iconName: 'Users', fit: 'Poor Fit', fitColor: 'bg-red-100 text-red-700', stars: 1, reasons: ['Delivery Timeline: May 2028 official + 12–24 months buffer means no home before 2029–30.', 'Utilitarian Finish: NBCC delivers structurally excellent but aesthetically basic — no designer lobbies.'] },
    ],
    riskRadar: [
      { type: 'Builder Risk', level: 'Low', iconName: 'Building2', description: 'NBCC — Government of India PSU, AAA rated, listed NSE/BSE. Cannot go bankrupt. Delivery guaranteed.' },
      { type: 'Legal Risk', level: 'Low', iconName: 'Scale', description: 'Supreme Court-monitored, SC-ring-fenced escrow. No Noida Authority embargo possible.' },
      { type: 'Timeline Risk', level: 'Medium', iconName: 'Activity', description: 'Government execution is bureaucratic — expect 12–24 months beyond May 2028 target. Not "if" but "when".' },
      { type: 'Finish Quality Risk', level: 'Medium', iconName: 'Sparkles', description: 'NBCC delivers structurally sound buildings but lacks luxury aesthetic finish — utilitarian, not bespoke.' },
      { type: 'Appreciation Risk', level: 'Low', iconName: 'TrendingUp', description: 'Sovereign-backed + premium location + under-construction pricing = strong appreciation upside.' },
    ],
    detailedAnalysis: [
      { category: 'Strength', title: 'Supreme Court-Backed Capital Safety', description: 'The rarest guarantee in Indian real estate — NBCC is a Government of India entity. Capital is 100% sovereign-protected and ring-fenced in SC-monitored escrow.', iconName: 'CheckCircle2', iconColor: 'text-emerald-500' },
      { category: 'Strength', title: 'Largest Floorplates in Sector', description: '3 BHK: 2,123 sqft carpet. 4 BHK: 2,670 sqft carpet. These unit sizes are impossible to find in modern private residential projects at this price point.', iconName: 'Home', iconColor: 'text-emerald-500' },
      { category: 'Strength', title: 'RERA-Immune Asset', description: 'SC-monitored execution provides legal immunity from standard Noida Authority outstanding dues traps that have snagged many Central Noida projects.', iconName: 'Scale', iconColor: 'text-emerald-500' },
      { category: 'Opportunity', title: 'Metro Front-Row Position', description: 'Sector 76 Aqua Line station just 300m away — walking distance connectivity is a massive locational advantage as the metro network matures.', iconName: 'TrendingUp', iconColor: 'text-blue-500' },
      { category: 'Risk', title: 'Bureaucratic Timeline Delays', description: 'Government execution is notoriously slow. Budget for a realistic possession date of 2029–2030, not the official May 2028 target.', iconName: 'AlertTriangle', iconColor: 'text-red-500' },
      { category: 'Consideration', title: 'Utilitarian Finish Quality', description: 'NBCC will deliver a structurally excellent, durable building — but do not expect polished stone lobbies, designer fixtures, or premium facade work. Functional, not luxury.', iconName: 'Activity', iconColor: 'text-amber-500' },
    ],
    social_proof: { most_viewed_config: '3 BHK (2781 sqft super)', most_booked_config: '4 BHK (3500 sqft super)', site_visit_count: 134, buyer_reviews_summary: '4.4/5 — Buyers love the sovereign safety and unit sizes; note patience required for delivery timeline.' },
    transparency_checks_additions: [
      { label: 'Supreme Court Monitored', ok: true, details: 'Project execution under SC Receiver mandate — highest legal protection available.' },
      { label: 'NBCC NSE/BSE Listed', ok: true, details: 'Government of India PSU — cannot go insolvent. Capital 100% safe.' },
      { label: 'SC Ring-Fenced Escrow', ok: true, details: 'ASPIRE Framework — all buyer funds in SC-monitored account.' },
      { label: 'Delivery Guarantee', ok: true, details: 'Delivery guaranteed by sovereign mandate — only variable is timeline (allow 12–24 month buffer).' },
      { label: 'RERA Status', ok: true, details: 'RERA-exempt — SC-monitored project supersedes standard RERA jurisdiction.' },
    ],
  }),

  // ── 7. ELITE X ────────────────────────────────────────────────────────────
  'elite-x-sector-10-greater-noida-west': buildIntelligenceData({
    slug: 'elite-x-sector-10-greater-noida-west', name: 'Elite X',
    sector: 'Sector 10', city: 'Greater Noida West', rera_number: 'UPRERAPRJ916631/02/2024',
    tier: 'STRONG BUY', overallScore: 88,
    builderTrust: 88, locationQuality: 82, lifestyleAmenities: 85,
    valueForMoney: 90, appreciationPotential: 92, legalSafety: 95,
    investmentGrade: 'A', investmentGradeLabel: 'Excellent — High-Growth Under-Construction',
    priceAdvantage: 'Strong Value', priceAdvantageSubtext: 'Best price-per-carpet-sqft in Greater Noida West',
    confidenceLevel: '91%', confidenceLabel: 'High — RERA verified, escrow active, site visited',
    keyTakeaway: 'Elite X is the best-positioned under-construction asset in Greater Noida West — cleanest RERA, biggest floorplates at aggressive pricing, adjacent to permanent green belt and upcoming Aqua Line metro station. Best appreciation play in the micro-market.',
    projectAvg: '₹8,100 /sqft', marketAvg: '₹7,200 /sqft', premium: '+12.5%', justification: 'Green belt views, Mivan construction, zero-delay builder track record + upcoming metro appreciation catalyst',
    appreciationYearly: '12–16%', rentalYield: '3.5–4.5% (post-delivery)',
    reportCatalyst: 'Positioned directly opposite Knowledge Park V — commercial expansion catalyst. Aqua Line metro extension adds transit premium.',
    reportFunding: 'Tata Capital institutional funding. RERA-ring-fenced escrow. Fast-tracked Mivan construction ensures no cash-flow threat.',
    reportRera: 'Registered under UPRERAPRJ916631/02/2024. Clear land title, zero outstanding dues. UP-RERA compliant.',
    investmentSnapshot: [
      { iconName: 'TrendingUp', label: 'Appreciation (est.)', value: '12–16% p.a.', trend: 'up' },
      { iconName: 'Home', label: 'Rental Yield (post delivery)', value: '3.5–4.5%' },
      { iconName: 'Activity', label: 'Possession Target', value: 'December 2028' },
      { iconName: 'BarChart3', label: 'Metro Distance', value: '1.5 km (Aqua Line Ph.2)' },
    ],
    buyerPersonas: [
      { type: 'Investor', iconName: 'TrendingUp', fit: 'Perfect Fit', fitColor: 'bg-emerald-100 text-emerald-700', stars: 5, reasons: ['Best ROI: 12–16% appreciation combines with Tata Capital funding safety for premium risk-adjusted return.', 'Metro Catalyst: Aqua Line metro Phase 2 station within 1.5 km expected to add 20–25% appreciation premium.', 'Green Belt Lock: Permanently unobstructed views locked by authority designation — cannot be built up.'] },
      { type: 'NRI Buyer', iconName: 'Globe', fit: 'Excellent Fit', fitColor: 'bg-blue-100 text-blue-700', stars: 5, reasons: ['RERA Certified: Clean, verified RERA registration — February 2024 launch, all legal documents verifiable.', 'Institutional Funding: Tata Capital backing provides NRI peace of mind on capital safety.', 'High Growth Market: Greater Noida West is one of India\'s fastest-appreciating residential corridors.'] },
      { type: 'Young Professional Family', iconName: 'Users', fit: 'Excellent Fit', fitColor: 'bg-blue-100 text-blue-700', stars: 4, reasons: ['Right Price Point: ₹2.01 Cr for a 3 BHK (968 sqft carpet) is exceptional value for a zero-risk under-construction project.', 'Quality Construction: Mivan shuttering technology delivers faster, stronger, more uniform concrete structures.', 'Community Amenities: Full club, pool, sports courts, and landscape planned on 5.44 acres.'] },
      { type: 'End-User (Immediate Need)', iconName: 'Home', fit: 'Average Fit', fitColor: 'bg-yellow-100 text-yellow-700', stars: 3, reasons: ['Timeline: December 2028 delivery — if you need a home now, look at RTM alternatives.', 'Under Construction: Must manage rental accommodation costs for 2+ years until possession.'] },
    ],
    riskRadar: [
      { type: 'Builder Risk', level: 'Low', iconName: 'Building2', description: 'Elite Group: 4 delivered projects, zero structural delays. Mivan technology ensures faster, consistent construction.' },
      { type: 'Legal Risk', level: 'Low', iconName: 'Scale', description: 'RERA registered Feb 2024. Clear land title. Zero outstanding dues. TATA Capital escrow active.' },
      { type: 'Timeline Risk', level: 'Low', iconName: 'CheckCircle2', description: 'Mivan construction + institutional funding significantly reduce delivery timeline risk vs standard construction.' },
      { type: 'Market Risk', level: 'Low', iconName: 'TrendingUp', description: 'Greater Noida West among fastest-appreciating corridors in NCR — strong fundamental demand supports price.' },
      { type: 'Metro Delay Risk', level: 'Medium', iconName: 'Activity', description: 'Aqua Line Phase 2 metro extension timeline may push beyond 2028 — metro catalyst is expected but not guaranteed.' },
    ],
    detailedAnalysis: [
      { category: 'Strength', title: 'Permanent Green Belt — No Obstruction Ever', description: 'Adjacent to an authority-designated permanent green belt — views guaranteed never to be blocked by future construction. Extremely rare in dense NCR development.', iconName: 'Home', iconColor: 'text-emerald-500' },
      { category: 'Strength', title: 'Mivan Shuttering Technology', description: 'Fast, strong, uniform aluminum formwork construction ensures higher structural quality, shorter build time, and less variance in finish vs traditional RCC — significant quality differentiator.', iconName: 'Building2', iconColor: 'text-emerald-500' },
      { category: 'Strength', title: 'Institutional Funding by Tata Capital', description: 'One of India\'s most trusted NBFCs backing this project provides strong assurance that construction cash-flows will not be disrupted — eliminates stalling risk.', iconName: 'CheckCircle2', iconColor: 'text-emerald-500' },
      { category: 'Strength', title: 'Best Price/Carpet Ratio in Market', description: '₹8,100/sqft for 968 sqft carpet (3BHK) — unmatched value density when compared against similar-quality launches in Greater Noida West.', iconName: 'TrendingUp', iconColor: 'text-emerald-500' },
      { category: 'Opportunity', title: 'Aqua Line Metro Phase 2 Catalyst', description: 'Proposed metro station 1.5 km away in Sector 12. When confirmed, this catalyst alone drives 20–25% appreciation in the immediate micro-market.', iconName: 'TrendingUp', iconColor: 'text-blue-500' },
      { category: 'Opportunity', title: 'Knowledge Park V Commercial Interface', description: 'Project positioned directly opposite Knowledge Park V commercial corridor — walking access to institutional, IT, and government offices drives strong rental demand at delivery.', iconName: 'Briefcase', iconColor: 'text-blue-500' },
      { category: 'Opportunity', title: 'Jewar Airport Corridor Appreciation', description: 'Direct road link to Jewar International Airport positions this corridor as a future gateway — major long-term appreciation catalyst for the Greater Noida West market.', iconName: 'Globe', iconColor: 'text-blue-500' },
      { category: 'Risk', title: 'Under-Construction Exposure', description: 'Delivery targeted December 2028 — buyers must manage 2+ years of rental accommodation costs alongside EMI. Budget accordingly.', iconName: 'AlertTriangle', iconColor: 'text-red-500' },
      { category: 'Consideration', title: 'Metro Catalyst Not Yet Confirmed', description: 'Aqua Line Phase 2 metro extension is proposed but not yet officially confirmed or funded by NMRC. Appreciation thesis partially dependent on this catalyst materializing.', iconName: 'Activity', iconColor: 'text-amber-500' },
    ],
    social_proof: { most_viewed_config: '3.5 BHK (3 BHK + Study) — 2090 sqft super', most_booked_config: '3 BHK (1397 sqft super)', site_visit_count: 187, buyer_reviews_summary: '4.7/5 — Buyers highly positive on green belt views, pricing, and builder transparency.' },
    transparency_checks_additions: [
      { label: 'RERA Verified', ok: true, details: 'UPRERAPRJ916631/02/2024 — registered February 2024. UP-RERA certified and compliant.' },
      { label: 'Tata Capital Funding', ok: true, details: 'Institutional-grade NBFC funding — escrow and construction cash-flows secured.' },
      { label: 'Clear Land Title', ok: true, details: 'Zero outstanding dues to any authority. Clean land title deeds verified.' },
      { label: 'No NCLT/Insolvency', ok: true, details: 'Elite Group has zero NCLT history across all 4 delivered projects.' },
      { label: 'Active Escrow', ok: true, details: 'RERA-mandated escrow active. All buyer payments ring-fenced per RERA guidelines.' },
    ],
  }),

}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🧠 Seeding intelligence_data for all projects...\n')

  for (const [slug, intelData] of Object.entries(INTELLIGENCE_MAP)) {
    try {
      const project = await prisma.project.findUnique({ where: { slug } })
      if (!project) {
        console.warn(`  ⚠️  Project not found: ${slug}`)
        continue
      }

      const existing = await (prisma as any).decisionProfile.findUnique({
        where: { project_id: project.id }
      })

      if (existing) {
        // Merge: preserve any existing keys not in our template (like location_data)
        const existingData = (existing.intelligence_data as any) || {}
        await (prisma as any).decisionProfile.update({
          where: { project_id: project.id },
          data: {
            intelligence_data: { ...existingData, ...intelData },
            status: 'PUBLISHED',
          }
        })
        console.log(`  ✓ Updated: ${slug}`)
      } else {
        await (prisma as any).decisionProfile.create({
          data: {
            project_id: project.id,
            intelligence_data: intelData,
            status: 'PUBLISHED',
          }
        })
        console.log(`  ✓ Created: ${slug}`)
      }
    } catch (err) {
      console.error(`  ✗ Failed: ${slug}`, err)
    }
  }

  console.log('\n✅ Intelligence data seeding complete.')
}

main()
  .catch(e => {
    console.error('❌ Failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
