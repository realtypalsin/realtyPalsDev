import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const bySource = await prisma.priceHistory.groupBy({ by: ['source'], _count: true })
  console.log('sources:', JSON.stringify(bySource))
  const obs = await prisma.priceHistory.findMany({
    where: { source: { in: ['market_verified_2026', 'active_market_listing', 'admin_update'] }, price_per_sqft: { not: null } },
    select: { project: { select: { sector: true, city: true, name: true } }, quarter_label: true, price_per_sqft: true, recorded_at: true },
  })
  console.log('observed rows:', obs.length)
  const bySector = new Map<string, number>()
  for (const r of obs) {
    const k = `${r.project.city} / ${r.project.sector}`
    bySector.set(k, (bySector.get(k) ?? 0) + 1)
  }
  console.log([...bySector.entries()].sort((a,b)=>b[1]-a[1]).slice(0,15))
  const q = await prisma.priceHistory.groupBy({ by: ['quarter_label'], _count: true, orderBy: { quarter_label: 'asc' } })
  console.log('quarters:', q.map(x=>`${x.quarter_label}:${x._count}`).join(' '))
}
main().finally(()=>prisma.$disconnect())
