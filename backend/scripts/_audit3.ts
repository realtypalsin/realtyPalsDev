import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // 1. Airport: do we hold BOTH? What columns exist?
  const p = await prisma.project.findFirst({ select: { airport_distance_km: true, commute_matrix: true, name: true } })
  console.log('=== airport columns on Project ===')
  console.log('airport_distance_km:', p?.airport_distance_km, ' commute_matrix sample:', JSON.stringify(p?.commute_matrix)?.slice(0, 200))
  const si = await prisma.sectorIntelligence.findFirst()
  console.log('SectorIntelligence airport_distance_km:', si?.airport_distance_km, '| flood_waterlogging_risk:', si?.flood_waterlogging_risk, '| aqi:', si?.aqi_annual_avg)
  const siCount = await prisma.sectorIntelligence.count()
  const siFlood = await prisma.sectorIntelligence.findMany({ select: { sector: true, flood_waterlogging_risk: true, flood_zone_description: true, drainage_network_quality: true } })
  const floodVals = new Map<string, number>()
  for (const s of siFlood) { const k = String(s.flood_waterlogging_risk); floodVals.set(k, (floodVals.get(k) ?? 0) + 1) }
  console.log(`\n=== SectorIntelligence: ${siCount} sectors ===`)
  console.log('flood_waterlogging_risk distribution:', [...floodVals.entries()].map(([k, n]) => `${k}×${n}`).join('  '))
  console.log('with a flood_zone_description:', siFlood.filter(s => s.flood_zone_description).length)
  console.log('with drainage quality:', siFlood.filter(s => s.drainage_network_quality).length)

  // 2. Duplicate builders — same CIN or same rera id on different rows
  const builders = await prisma.builder.findMany({
    select: { id: true, name: true, cin: true, rera_promoter_id: true, founded_year: true,
      delayed_projects_count: true, average_delay_months: true, insolvency_history: true, legal_flag: true,
      _count: { select: { projects: true } } },
    orderBy: { name: 'asc' },
  })
  const byCin = new Map<string, typeof builders>()
  for (const b of builders) { if (!b.cin) continue; const l = byCin.get(b.cin) ?? []; l.push(b); byCin.set(b.cin, l) }
  const dupes = [...byCin.entries()].filter(([, l]) => l.length > 1)
  console.log(`\n=== ${dupes.length} CINs shared by more than one builder row ===`)
  for (const [cin, list] of dupes) {
    console.log(`\n  ${cin}`)
    for (const b of list) {
      console.log(`    ${b.name.padEnd(38)} projects=${String(b._count.projects).padStart(2)} founded=${b.founded_year} delayed=${b.delayed_projects_count} avgDelay=${b.average_delay_months} insolvency=${b.insolvency_history} flag=${b.legal_flag ?? '-'}`)
    }
  }
  const totalDupRows = dupes.reduce((s, [, l]) => s + l.length, 0)
  console.log(`\n  ${totalDupRows} rows involved; ${totalDupRows - dupes.length} are redundant.`)
}
main().catch(e => { console.error(e); process.exitCode = 1 }).finally(() => prisma.$disconnect())
