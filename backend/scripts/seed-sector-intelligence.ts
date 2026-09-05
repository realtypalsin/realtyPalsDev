// backend/scripts/seed-sector-intelligence.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface SectorData {
  city: string
  sector: string
  micro_market: string
  sector_stage: string
  dominant_segment: string
  avg_price_per_sqft: number
  price_5yr_cagr_pct: number
  rental_yield_pct: number
  avg_rent_3bhk_monthly: number
  lifestyle_tags: string[]
  sector_strengths: string[]
  sector_weaknesses: string[]
  who_should_buy: string
  who_should_avoid: string
  commute_anchors: Record<string, number>
  utilities_profile: Record<string, unknown>
  statutory_rates: Record<string, unknown>
  infrastructure_pipeline: Record<string, unknown>
}

const SECTORS_DATA: SectorData[] = [
  // ─── NOIDA EXPRESSWAY (LUXURY & GREEN HUB) ──────────────────────────────────
  {
    city: 'Noida',
    sector: 'Sector 150',
    micro_market: 'Noida Expressway',
    sector_stage: 'developing',
    dominant_segment: 'Luxury & Low Density',
    avg_price_per_sqft: 11500,
    price_5yr_cagr_pct: 18.5,
    rental_yield_pct: 3.2,
    avg_rent_3bhk_monthly: 48000,
    lifestyle_tags: ['Green / 70% Open Space', 'Low Density', 'Sports City', 'Golf Facing', 'Jewar Airport Access'],
    sector_strengths: ['80% green cover policy', 'Low density master plan (2 units/floor common)', 'Direct signal-free connectivity to Jewar Airport', 'No overhead wiring / underground cabling'],
    sector_weaknesses: ['Limited retail walking distance currently', 'School buses take 15-20 mins from Central Noida'],
    who_should_buy: 'IT executives, corporate leaders, and NRIs seeking peaceful, low-density luxury with long-term capital growth.',
    who_should_avoid: 'Buyers seeking immediate bustling high-street retail outside their gate.',
    commute_anchors: { 'Advant Navis / Sec 137 IT Hub': 12, 'Jewar International Airport': 30, 'South Delhi (Ashram)': 35, 'Cyber City Gurugram': 60 },
    utilities_profile: { water_source: 'Ganga Pipeline (Augmented)', tds_ppm: 200, power_grid: 'PVVNL Dedicated Substation', dg_cost_unit: 17, grid_unit_cost: 6.0 },
    statutory_rates: { circle_rate_sqm: 54000, amenity_surcharge_pct: 3, floor_relief_pct: 2, stamp_duty_male_pct: 7, stamp_duty_female_pct: 6, registration_pct: 1 },
    infrastructure_pipeline: { projects: ['Sector 148 Aqua Line Metro operational', 'Noida-Greater Noida Link Flyover', 'Shaheed Bhagat Singh Park'] }
  },
  {
    city: 'Noida',
    sector: 'Sector 137',
    micro_market: 'Noida Expressway',
    sector_stage: 'established',
    dominant_segment: 'IT Corridor & Rental High-Rise',
    avg_price_per_sqft: 9800,
    price_5yr_cagr_pct: 14.2,
    rental_yield_pct: 4.1,
    avg_rent_3bhk_monthly: 42000,
    lifestyle_tags: ['IT Hub Adjacent', 'Aqua Line Metro', 'Walk-to-Work', 'High Rental Demand'],
    sector_strengths: ['Walking distance to Advant Navis & corporate parks', 'Operational Aqua Line Metro station', 'Felix Hospital and vibrant local markets'],
    sector_weaknesses: ['Higher density living compared to Sector 150', 'Peak hour metro parking rush'],
    who_should_buy: 'Tech professionals working along the Expressway, young couples, and rental yield investors.',
    who_should_avoid: 'Ultra-luxury seekers looking for expansive single-floor private penthouses.',
    commute_anchors: { 'Advant Navis IT Park': 3, 'Sector 62 IT Hub': 20, 'Connaught Place Delhi': 40, 'Jewar Airport': 42 },
    utilities_profile: { water_source: 'Ganga Water + Society RO', tds_ppm: 350, power_grid: 'PVVNL', dg_cost_unit: 17, grid_unit_cost: 6.0 },
    statutory_rates: { circle_rate_sqm: 52000, amenity_surcharge_pct: 3, floor_relief_pct: 2, stamp_duty_male_pct: 7, stamp_duty_female_pct: 6, registration_pct: 1 },
    infrastructure_pipeline: { projects: ['Expressway underpass connectivity', 'Faridabad-Noida-Ghaziabad (FNG) corridor link'] }
  },
  {
    city: 'Noida',
    sector: 'Sector 128',
    micro_market: 'Noida Expressway',
    sector_stage: 'established',
    dominant_segment: 'Ultra Luxury & Golf Township',
    avg_price_per_sqft: 15500,
    price_5yr_cagr_pct: 19.8,
    rental_yield_pct: 2.8,
    avg_rent_3bhk_monthly: 85000,
    lifestyle_tags: ['Jaypee Wish Town', '18-Hole Golf Course', 'Jaypee Hospital', 'Ultra-Luxury'],
    sector_strengths: ['Integrated mega-township living', 'Direct access to Jaypee Multi-Speciality Hospital and schools', 'Expansive golf views'],
    sector_weaknesses: ['Higher maintenance costs due to extensive landscaping and golf upkeep'],
    who_should_buy: 'CXOs, industrialists, and high-net-worth families looking for an exclusive lifestyle.',
    who_should_avoid: 'Budget buyers seeking sub-₹1.5 Cr ticket sizes.',
    commute_anchors: { 'Mahamaya Flyover / Delhi Border': 8, 'Sector 135 IT SEZ': 7, 'South Delhi': 20, 'Jewar Airport': 45 },
    utilities_profile: { water_source: 'Dedicated Township RO + Ganga Feed', tds_ppm: 180, power_grid: 'Township Captive & PVVNL', dg_cost_unit: 18, grid_unit_cost: 6.0 },
    statutory_rates: { circle_rate_sqm: 68000, amenity_surcharge_pct: 3, floor_relief_pct: 2, stamp_duty_male_pct: 7, stamp_duty_female_pct: 6, registration_pct: 1 },
    infrastructure_pipeline: { projects: ['Wish Town internal commercial hubs', 'Noida-Greater Noida Expressway lane widening'] }
  },

  // ─── CENTRAL NOIDA (7X FAMILY & METRO BELT) ───────────────────────────────────
  {
    city: 'Noida',
    sector: 'Sector 75',
    micro_market: 'Central Noida 7X',
    sector_stage: 'established',
    dominant_segment: 'Premium Family & High-Street Retail',
    avg_price_per_sqft: 13700,
    price_5yr_cagr_pct: 12.5,
    rental_yield_pct: 3.1,
    avg_rent_3bhk_monthly: 45000,
    lifestyle_tags: ['Spectrum Metro Mall', 'Aqua Line Sector 50 Metro', 'Established Retail', 'Family Living'],
    sector_strengths: ['Spectrum Metro high-street mall with 10+ screen multiplex and dining', 'Direct Aqua Line Sector 50 station access', 'High density of premium preschools and daycare'],
    sector_weaknesses: ['Premium price per sqft (₹13.7k vs ₹10.8k in Sec 76)', 'High-street traffic during weekend evenings'],
    who_should_buy: 'Families who want everything (groceries, dining, metro, clinics) within 2 minutes walk.',
    who_should_avoid: 'Value buyers with tight budgets under ₹1.5 Cr looking for 3BHKs.',
    commute_anchors: { 'Sector 50 Metro Station': 2, 'Sector 62 IT Hub': 15, 'Botanical Garden (Blue/Magenta interchange)': 15, 'Connaught Place': 35 },
    utilities_profile: { water_source: 'Ganga Water Supply', tds_ppm: 220, power_grid: 'PVVNL Substation', dg_cost_unit: 17, grid_unit_cost: 6.0 },
    statutory_rates: { circle_rate_sqm: 58000, amenity_surcharge_pct: 3, floor_relief_pct: 2, stamp_duty_male_pct: 7, stamp_duty_female_pct: 6, registration_pct: 1 },
    infrastructure_pipeline: { projects: ['Sector 75-76 commercial plaza extension', 'Underground power cabling'] }
  },
  {
    city: 'Noida',
    sector: 'Sector 76',
    micro_market: 'Central Noida 7X',
    sector_stage: 'established',
    dominant_segment: 'Spacious Family Living & High Value',
    avg_price_per_sqft: 10800,
    price_5yr_cagr_pct: 26.0,
    rental_yield_pct: 3.5,
    avg_rent_3bhk_monthly: 38000,
    lifestyle_tags: ['Aqua Line Metro', '40 MLD Ganga Water', 'Family Value', 'Top Schools Nearby'],
    sector_strengths: ['₹2,900/sqft price arbitrage vs Sector 75 (1,300-1,400 sqft 3BHK for ₹1.3-1.5 Cr)', '40 MLD dedicated Ganga water pipeline connection (active late 2025)', 'Direct Sector 76 Aqua Line Metro station'],
    sector_weaknesses: ['Higher society unit count than luxury low-density belts'],
    who_should_buy: 'Upwardly mobile young families wanting maximum usable carpet area and clean water for their budget.',
    who_should_avoid: 'Buyers demanding golf courses and sub-50 unit boutique towers.',
    commute_anchors: { 'Sector 76 Metro': 2, 'Sector 62 IT Hub': 16, 'Botanical Garden': 15, 'South Delhi': 30 },
    utilities_profile: { water_source: '40 MLD Ganga Pipeline (New late 2025)', tds_ppm: 210, power_grid: 'PVVNL', dg_cost_unit: 17, grid_unit_cost: 6.0 },
    statutory_rates: { circle_rate_sqm: 52500, amenity_surcharge_pct: 3, floor_relief_pct: 2, stamp_duty_male_pct: 7, stamp_duty_female_pct: 6, registration_pct: 1 },
    infrastructure_pipeline: { projects: ['Ganga water secondary feeder network', 'Internal sector green belt development'] }
  },
  {
    city: 'Noida',
    sector: 'Sector 79',
    micro_market: 'Central Noida 7X',
    sector_stage: 'developing',
    dominant_segment: 'Modern Low-Density Luxury',
    avg_price_per_sqft: 14400,
    price_5yr_cagr_pct: 17.5,
    rental_yield_pct: 2.9,
    avg_rent_3bhk_monthly: 52000,
    lifestyle_tags: ['Sports Complex Adjacent', 'Low Density High-Rise', 'RERA Form-7 Compliant Hub', 'Modern Luxury'],
    sector_strengths: ['Newer construction inventory (2022-2027 delivery)', 'Broad 45-meter sector roads', 'Adjacent to upcoming Sports Complex in Sector 79/101'],
    sector_weaknesses: ['Internal commercial retail still maturing, relies on Sector 75/76 for daily markets'],
    who_should_buy: 'NRI investors, upgrade buyers moving from older 2BHKs, and buyers prioritizing modern clubhouse amenities.',
    who_should_avoid: 'Buyers seeking sub-₹1 Cr ticket sizes.',
    commute_anchors: { 'Sector 101 Metro': 4, 'Advant Navis': 15, 'Botanical Garden': 18, 'Jewar Airport': 40 },
    utilities_profile: { water_source: 'Ganga Water Network', tds_ppm: 215, power_grid: 'PVVNL', dg_cost_unit: 17, grid_unit_cost: 6.0 },
    statutory_rates: { circle_rate_sqm: 60400, amenity_surcharge_pct: 3, floor_relief_pct: 2, stamp_duty_male_pct: 7, stamp_duty_female_pct: 6, registration_pct: 1 },
    infrastructure_pipeline: { projects: ['Sector 79 sports hub integration', 'Direct signal-free connection to FNG Expressway'] }
  },

  // ─── GREATER NOIDA WEST (VALUE & SPACE CORRIDOR) ─────────────────────────────
  {
    city: 'Greater Noida West',
    sector: 'Sector 1',
    micro_market: 'Greater Noida West',
    sector_stage: 'developing',
    dominant_segment: 'High Value Gated Communities',
    avg_price_per_sqft: 7500,
    price_5yr_cagr_pct: 22.0,
    rental_yield_pct: 3.8,
    avg_rent_3bhk_monthly: 26000,
    lifestyle_tags: ['Maximum Space per Rupee', 'FNG Link', 'Gated Societies', 'Rapid Infrastructure'],
    sector_strengths: ['Entry point to Greater Noida West from Noida Sector 78/79 bridge', 'Wide 60m sector master roads', 'High appreciation trajectory as metro extension breaks ground'],
    sector_weaknesses: ['Public transport currently dependent on autos/cabs pending metro line completion'],
    who_should_buy: 'First-time buyers looking for 3BHKs under ₹1.1-1.3 Cr and long-term capital allocators.',
    who_should_avoid: 'Daily Delhi commuters who refuse to drive across the Hindon bridge.',
    commute_anchors: { 'Sector 76 Noida': 8, 'Sector 62 IT SEZ': 18, 'Anand Vihar ISBT': 30, 'Connaught Place': 45 },
    utilities_profile: { water_source: 'Authority Ganga Feed + Groundwater RO', tds_ppm: 400, power_grid: 'NPCL', dg_cost_unit: 18, grid_unit_cost: 6.5 },
    statutory_rates: { circle_rate_sqm: 42000, amenity_surcharge_pct: 3, floor_relief_pct: 2, stamp_duty_male_pct: 7, stamp_duty_female_pct: 6, registration_pct: 1 },
    infrastructure_pipeline: { projects: ['Greater Noida West Metro Extension (Sector 51 to Knowledge Park V)', 'Hindon Elevated Bridge expansion'] }
  },
  {
    city: 'Greater Noida West',
    sector: 'Sector 10',
    micro_market: 'Greater Noida West',
    sector_stage: 'developing',
    dominant_segment: 'Modern Master Planned Expansion',
    avg_price_per_sqft: 6800,
    price_5yr_cagr_pct: 24.5,
    rental_yield_pct: 3.9,
    avg_rent_3bhk_monthly: 24000,
    lifestyle_tags: ['Affordable Luxury', 'Spacious Layouts', 'High Future Appreciation', 'Institutional Presence'],
    sector_strengths: ['Spacious 3 & 4 BHK layouts under ₹1.5 Cr', 'Large green parks planned by GNIDA Authority', 'Modern construction by top-tier regional builders'],
    sector_weaknesses: ['Emerging social infra; retail markets are developing rapidly'],
    who_should_buy: 'Young professionals with hybrid/remote work models seeking large 3-4 BHK homes.',
    who_should_avoid: 'Buyers wanting ready-to-walk bustling nightlife outside their gates.',
    commute_anchors: { 'Pari Chowk': 15, 'Noida City Centre': 25, 'Sector 62 Noida': 22, 'Jewar Airport': 45 },
    utilities_profile: { water_source: 'GNIDA Supply + Society RO', tds_ppm: 380, power_grid: 'NPCL Dedicated Feeder', dg_cost_unit: 18, grid_unit_cost: 6.5 },
    statutory_rates: { circle_rate_sqm: 38000, amenity_surcharge_pct: 3, floor_relief_pct: 2, stamp_duty_male_pct: 7, stamp_duty_female_pct: 6, registration_pct: 1 },
    infrastructure_pipeline: { projects: ['Sector 10 commercial civic centre', 'Direct link road to NH-24 / Delhi-Meerut Expressway'] }
  },

  // ─── YAMUNA EXPRESSWAY (THE INFRASTRUCTURE BET) ──────────────────────────────
  {
    city: 'Yamuna Expressway',
    sector: 'Sector 22D',
    micro_market: 'Yamuna Expressway',
    sector_stage: 'emerging',
    dominant_segment: 'Airport Catalyst & High-Growth Horizon',
    avg_price_per_sqft: 6200,
    price_5yr_cagr_pct: 31.0,
    rental_yield_pct: 2.2,
    avg_rent_3bhk_monthly: 18000,
    lifestyle_tags: ['Jewar International Airport (2026)', 'Formula 1 Track', 'Film City', 'Olympic Park', 'Multi-Bagger Growth'],
    sector_strengths: ['15 mins from Noida International Airport at Jewar', 'Upcoming International Film City & Medical Device Park', '120m wide 8-lane expressway connectivity'],
    sector_weaknesses: ['Longer horizon (4-7 years) for full residential density'],
    who_should_buy: 'Long-term wealth creators, NRIs, and investors seeking maximum capital appreciation multiples.',
    who_should_avoid: 'Immediate end-users with school-going kids needing schools within 5 minutes.',
    commute_anchors: { 'Jewar International Airport': 15, 'Formula 1 Buddh Circuit': 5, 'Sector 150 Noida': 20, 'South Delhi': 50 },
    utilities_profile: { water_source: 'YEIDA Master Pipeline', tds_ppm: 300, power_grid: 'YEIDA / NPCL', dg_cost_unit: 18, grid_unit_cost: 6.5 },
    statutory_rates: { circle_rate_sqm: 32000, amenity_surcharge_pct: 3, floor_relief_pct: 2, stamp_duty_male_pct: 7, stamp_duty_female_pct: 6, registration_pct: 1 },
    infrastructure_pipeline: { projects: ['Jewar Airport Flight Operations (Commercial 2026)', 'YEIDA Pod Taxi Network', 'Delhi-Varanasi Bullet Train Halt'] }
  }
]

async function main() {
  console.log('[SEED] Ensuring columns in sector_intelligence table...')
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "sector_intelligence" 
    ADD COLUMN IF NOT EXISTS "micro_market" TEXT,
    ADD COLUMN IF NOT EXISTS "lifestyle_tags" TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS "commute_anchors" JSONB,
    ADD COLUMN IF NOT EXISTS "utilities_profile" JSONB,
    ADD COLUMN IF NOT EXISTS "statutory_rates" JSONB;
  `)

  console.log('[SEED] Seeding enriched SectorIntelligence via SQL...')
  for (const s of SECTORS_DATA) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "sector_intelligence" (
        "id", "city", "sector", "micro_market", "sector_stage", "dominant_segment",
        "avg_price_per_sqft", "price_5yr_cagr_pct", "rental_yield_pct", "avg_rent_3bhk_monthly",
        "lifestyle_tags", "sector_strengths", "sector_weaknesses", "who_should_buy", "who_should_avoid",
        "commute_anchors", "utilities_profile", "statutory_rates", "infrastructure_pipeline",
        "last_verified_at", "verified_by", "created_at", "updated_at"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15::jsonb, $16::jsonb, $17::jsonb, $18::jsonb,
        NOW(), 'PropFyndr Research Desk', NOW(), NOW()
      )
      ON CONFLICT ("city", "sector") DO UPDATE SET
        "micro_market" = EXCLUDED."micro_market",
        "sector_stage" = EXCLUDED."sector_stage",
        "dominant_segment" = EXCLUDED."dominant_segment",
        "avg_price_per_sqft" = EXCLUDED."avg_price_per_sqft",
        "price_5yr_cagr_pct" = EXCLUDED."price_5yr_cagr_pct",
        "rental_yield_pct" = EXCLUDED."rental_yield_pct",
        "avg_rent_3bhk_monthly" = EXCLUDED."avg_rent_3bhk_monthly",
        "lifestyle_tags" = EXCLUDED."lifestyle_tags",
        "sector_strengths" = EXCLUDED."sector_strengths",
        "sector_weaknesses" = EXCLUDED."sector_weaknesses",
        "who_should_buy" = EXCLUDED."who_should_buy",
        "who_should_avoid" = EXCLUDED."who_should_avoid",
        "commute_anchors" = EXCLUDED."commute_anchors",
        "utilities_profile" = EXCLUDED."utilities_profile",
        "statutory_rates" = EXCLUDED."statutory_rates",
        "infrastructure_pipeline" = EXCLUDED."infrastructure_pipeline",
        "last_verified_at" = NOW(),
        "updated_at" = NOW();
    `,
      s.city,
      s.sector,
      s.micro_market,
      s.sector_stage,
      s.dominant_segment,
      s.avg_price_per_sqft,
      s.price_5yr_cagr_pct,
      s.rental_yield_pct,
      s.avg_rent_3bhk_monthly,
      s.lifestyle_tags,
      s.sector_strengths,
      s.sector_weaknesses,
      s.who_should_buy,
      s.who_should_avoid,
      JSON.stringify(s.commute_anchors),
      JSON.stringify(s.utilities_profile),
      JSON.stringify(s.statutory_rates),
      JSON.stringify(s.infrastructure_pipeline)
    )
    console.log(`[SEED] Upserted: ${s.city} - ${s.sector} (${s.micro_market})`)
  }
  console.log('[SEED] Completed successfully.')
}

main()
  .catch(e => {
    console.error('[SEED:ERROR]', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
