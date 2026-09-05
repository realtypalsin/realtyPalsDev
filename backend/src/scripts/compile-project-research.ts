import { prisma } from '../lib/db'
import * as fs from 'fs'
import * as path from 'path'

async function compileProjectResearch() {
  const jsonPath = path.resolve(__dirname, '../../../propfyndr-enrichment-73-projects.json')
  const raw = fs.readFileSync(jsonPath, 'utf8')
  const projectsList = JSON.parse(raw)
  const ids = projectsList.map((p: any) => p.id)

  const dbProjects = await prisma.project.findMany({
    where: { id: { in: ids } },
    include: {
      builder: true,
      unit_types: true,
      cost_sheet: true,
      payment_plans: true,
      decision_profile: true,
      persona_profile: true,
      recommendation_profile: true,
      channel_partners: {
        include: { channel_partner: true }
      },
      spec_items: true,
      construction_milestones: true,
    },
    orderBy: [{ city: 'asc' }, { sector: 'asc' }, { name: 'asc' }]
  })

  console.log(`Analyzing ${dbProjects.length} projects...`)

  const compiledData = dbProjects.map(p => {
    const minPrice = p.price_min_cr || (p.unit_types.length ? Math.min(...p.unit_types.map(u => u.price_min_cr || 0).filter(v => v > 0)) : 0)
    const unitConfigs = p.unit_types.map(u => `${u.bhk}BHK (${u.super_area_sqft || u.carpet_area_sqft || 0} sqft @ ₹${u.price_min_cr || 0}Cr)`).join(', ')

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      builder: p.builder?.name || 'Unknown',
      sector: p.sector,
      city: p.city,
      status: p.status,
      possession_date: p.possession_date,
      possession_label: p.possession_label,
      rera_number: p.rera_number,
      price_min_cr: minPrice,
      price_range_label: p.price_range_label,
      units: unitConfigs,
      unit_count: p.unit_types.length,
      has_cost_sheet: !!p.cost_sheet,
      bsp_psf: p.cost_sheet?.base_price_per_sqft || 0,
      edc_idc_psf: p.cost_sheet?.other_charges || 0,
      parking_cost_lakh: p.cost_sheet?.parking_cost ? p.cost_sheet.parking_cost * 100 : 0,
      has_payment_plans: p.payment_plans.length > 0,
      plan_names: p.payment_plans.map(pl => pl.plan_name).join(', '),
      has_decision_profile: !!p.decision_profile,
      decision_thesis: p.decision_profile?.decision_thesis || '',
      has_persona_profile: !!p.persona_profile,
      target_persona: p.persona_profile?.primary_persona || '',
      channel_partner_count: p.channel_partners.length,
      current_partners: p.channel_partners.map(cp => cp.channel_partner?.name).join(', '),
    }
  })

  const outputPath = path.resolve(__dirname, '../../../scratch/compiled-73-projects-research.json')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify(compiledData, null, 2))
  console.log(`Saved comprehensive compiled data to ${outputPath}`)

  // Also print high level summary table
  console.log('\n--- Regional Breakdown of 73 Projects ---')
  const byRegion: Record<string, number> = {}
  compiledData.forEach(p => {
    const key = `${p.city} - ${p.sector}`
    byRegion[key] = (byRegion[key] || 0) + 1
  })
  console.log(byRegion)

  await prisma.$disconnect()
}

compileProjectResearch().catch(console.error)
