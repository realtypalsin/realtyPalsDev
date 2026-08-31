import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const rows = await prisma.sectorIntelligence.findMany({
    select: { city: true, sector: true, avg_price_per_sqft: true, price_5yr_cagr_pct: true, rental_yield_pct: true, avg_rent_3bhk_monthly: true, infrastructure_pipeline: true, last_verified_at: true, verified_by: true },
  })
  console.log('sectors:', rows.length)
  console.log('with cagr:', rows.filter(r => r.price_5yr_cagr_pct != null).length)
  console.log('distinct cagr:', [...new Set(rows.map(r=>r.price_5yr_cagr_pct))].sort())
  console.log('with infra pipeline:', rows.filter(r => r.infrastructure_pipeline != null).length)
  console.log('with rental_yield_pct:', rows.filter(r => r.rental_yield_pct != null).length, 'distinct:', [...new Set(rows.map(r=>r.rental_yield_pct))].sort().slice(0,20))
  console.log('verified_by:', [...new Set(rows.map(r=>r.verified_by))])
  const s = rows.find(r => r.sector === 'Sector 150')
  console.log('S150:', JSON.stringify(s).slice(0, 900))
}
main().finally(()=>prisma.$disconnect())
