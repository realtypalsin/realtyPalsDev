import 'dotenv/config'
import { discoverProjects, getSectorContext } from '../src/lib/discovery'
import { getMultiDimensionalRecommendations } from '../src/lib/discovery/multiDimensionalIntegration'
import { prisma } from '../src/lib/db'
import { buildCityMicroMarketsContext } from '../src/lib/ai/cityShelf'

const t = async (label: string, fn: () => Promise<unknown>) => {
  const s = Date.now()
  try { const r = await fn(); console.log(`${label.padEnd(34)} ${String(Date.now()-s).padStart(6)}ms`); return r }
  catch (e) { console.log(`${label.padEnd(34)} ${String(Date.now()-s).padStart(6)}ms ERR ${String((e as Error).message).slice(0,40)}`) }
}
async function main() {
  const intent = { bhk: [3], sector: 'Sector 150', budgetMax: 2.5 }
  const r = await t('discoverProjects', () => discoverProjects(intent as never, 0)) as { exactResults: Array<{id:string}> }
  await t('getMultiDimensionalRecommendations', () => getMultiDimensionalRecommendations('3bhk sector 150 under 2.5cr', [], undefined, { limit: 5 } as never))
  await t('getSectorContext', () => getSectorContext('Sector 150', 'Noida'))
  await t('buildCityMicroMarketsContext', () => buildCityMicroMarketsContext('Noida', ['Sector 150']))
  await t('blockedBuilders findMany', () => prisma.builder.findMany({ where: { legal_flag: { not: null } }, select: { name: true, legal_flag: true } }))
  const ids = (r?.exactResults ?? []).slice(0,6).map(p => p.id)
  await t('detailedTargetProjects (6 rel)', () => prisma.project.findMany({ where: { id: { in: ids } }, include: { builder:true, unit_types:true, amenities:true, cost_sheet:true, connectivity:true, payment_plans:true } }))
  await t('detailed shortlist (2 rel)', () => prisma.project.findMany({ where: { id: { in: ids } }, include: { builder:true, unit_types:true } }))
}
main().then(()=>process.exit(0)).catch(e=>{console.error(String(e.message).slice(0,150));process.exit(1)})
