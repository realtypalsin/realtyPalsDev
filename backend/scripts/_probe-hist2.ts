import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const rows = await prisma.priceHistory.findMany({
    where: { price_per_sqft: { not: null } },
    select: { project_id: true, source: true, quarter_label: true, price_per_sqft: true, recorded_at: true, project: { select: { name: true, sector: true } } },
    orderBy: { recorded_at: 'asc' },
  })
  const OBS = new Set(['market_verified_2026','active_market_listing','admin_update'])
  const byProj = new Map<string, typeof rows>()
  for (const r of rows) { const a = byProj.get(r.project_id) ?? []; a.push(r); byProj.set(r.project_id, a as any) }
  let multiObs = 0
  const dist = new Map<number, number>()
  for (const [, rs] of byProj) {
    const n = rs.filter(r => OBS.has(r.source)).length
    dist.set(n, (dist.get(n) ?? 0) + 1)
    if (n >= 2) multiObs++
  }
  console.log('projects with price_history:', byProj.size, 'observed-count distribution:', [...dist.entries()])
  console.log('projects with >=2 observed:', multiObs)
  const sample = [...byProj.values()][0]
  console.log(sample.map(r => `${r.quarter_label} ${r.source} ${r.price_per_sqft}`).join('\n'))
}
main().finally(()=>prisma.$disconnect())
