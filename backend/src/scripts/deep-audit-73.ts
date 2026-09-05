import { prisma } from '../lib/db'
import * as fs from 'fs'
import * as path from 'path'

async function deepAudit() {
  const jsonPath = path.resolve(__dirname, '../../../propfyndr-enrichment-73-projects.json')
  const raw = fs.readFileSync(jsonPath, 'utf8')
  const projectsList = JSON.parse(raw)
  const ids = projectsList.map((p: any) => p.id)

  console.log('=== DEEP AUDIT OF 73 PROJECTS & OVERALL DB ===')

  // 1. Channel Partners in DB
  const totalCPs = await prisma.channelPartner.findMany({ select: { id: true, name: true, phone: true, email: true, rera_compliant: true } })
  console.log(`Total Channel Partners registered in DB: ${totalCPs.length}`)
  console.log('Sample Channel Partners:', totalCPs.slice(0, 5))

  const projectCPs = await prisma.projectChannelPartner.findMany()
  console.log(`Total Project-ChannelPartner links in DB: ${projectCPs.length}`)

  // 2. Duplicates Check across all DB projects
  const allProjects = await prisma.project.findMany({
    select: { id: true, name: true, slug: true, sector: true, city: true, rera_number: true, builder_id: true, price_min_cr: true, status: true }
  })
  console.log(`Total projects in DB: ${allProjects.length}`)

  const slugMap = new Map<string, string[]>()
  const nameSectorMap = new Map<string, string[]>()
  const reraMap = new Map<string, string[]>()

  for (const p of allProjects) {
    // Slug dups
    if (!slugMap.has(p.slug)) slugMap.set(p.slug, [])
    slugMap.get(p.slug)!.push(p.id)

    // Name + Sector dups
    const key = `${p.name.toLowerCase().trim()}___${p.sector.toLowerCase().trim()}`
    if (!nameSectorMap.has(key)) nameSectorMap.set(key, [])
    nameSectorMap.get(key)!.push(p.id)

    // RERA dups
    if (p.rera_number && p.rera_number.trim().length > 3) {
      if (!reraMap.has(p.rera_number.trim())) reraMap.set(p.rera_number.trim(), [])
      reraMap.get(p.rera_number.trim())!.push(p.id)
    }
  }

  const dupSlugs = Array.from(slugMap.entries()).filter(([_, ids]) => ids.length > 1)
  const dupNames = Array.from(nameSectorMap.entries()).filter(([_, ids]) => ids.length > 1)
  const dupReras = Array.from(reraMap.entries()).filter(([_, ids]) => ids.length > 1)

  console.log(`Duplicate Slugs found: ${dupSlugs.length}`)
  if (dupSlugs.length) console.log(dupSlugs)

  console.log(`Duplicate Name+Sector found: ${dupNames.length}`)
  if (dupNames.length) console.log(dupNames)

  console.log(`Duplicate RERAs found: ${dupReras.length}`)
  if (dupReras.length) console.log(dupReras.slice(0, 5))

  // 3. Inspect the 73 projects details: Pricing, Units, Specs, Milestones, RERA
  const targetProjects = await prisma.project.findMany({
    where: { id: { in: ids } },
    include: {
      builder: true,
      unit_types: true,
      cost_sheet: true,
      payment_plans: true,
      decision_profile: true,
      persona_profile: true,
      recommendation_profile: true,
      spec_items: true,
      construction_milestones: true,
      dna: true,
    }
  })

  let zeroUnits = 0
  let zeroPrices = 0
  let missingRera = 0
  let missingSpecs = 0
  let missingMilestones = 0
  let missingDna = 0

  const pricingIssues: any[] = []

  for (const p of targetProjects) {
    if (p.unit_types.length === 0) zeroUnits++
    if (!p.price_min_cr || p.price_min_cr <= 0) {
      zeroPrices++
      pricingIssues.push({ name: p.name, slug: p.slug, price_min_cr: p.price_min_cr })
    }
    if (!p.rera_number || p.rera_number.trim() === '') missingRera++
    if (p.spec_items.length === 0) missingSpecs++
    if (p.construction_milestones.length === 0) missingMilestones++
    if (!p.dna) missingDna++
  }

  console.log('\n--- Deep Inspection of the 73 Projects ---')
  console.log(`Projects with 0 Unit Types: ${zeroUnits}`)
  console.log(`Projects with Missing/Zero price_min_cr: ${zeroPrices}`)
  console.log(`Projects Missing RERA Number: ${missingRera}`)
  console.log(`Projects Missing Spec Items: ${missingSpecs}`)
  console.log(`Projects Missing Construction Milestones: ${missingMilestones}`)
  console.log(`Projects Missing DNA profile: ${missingDna}`)

  if (pricingIssues.length > 0) {
    console.log('Sample pricing issues:', pricingIssues.slice(0, 5))
  }

  await prisma.$disconnect()
}

deepAudit().catch(err => {
  console.error(err)
  process.exit(1)
})
