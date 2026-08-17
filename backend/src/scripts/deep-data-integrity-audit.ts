import { prisma } from '../lib/db'

async function deepDataIntegrityAudit() {
  console.log('=== COMPREHENSIVE REALTIALS DATABASE DATA INTEGRITY AUDIT ===\n')

  const projects = await prisma.project.findMany({
    include: {
      builder: true,
      unit_types: true,
      cost_sheet: true,
      payment_plans: true,
      decision_profile: true,
      persona_profile: true,
      recommendation_profile: true,
      dna: true,
      spec_items: true,
      amenities: true,
      connectivity: true,
      construction_milestones: true,
      construction_updates: true,
      price_history: true,
      channel_partners: {
        include: { channel_partner: true }
      },
      images: true,
    }
  })

  console.log(`Total Projects in Database: ${projects.length}`)

  let issuesFound = 0
  const findings: {
    core: string[]
    pricing: string[]
    paymentPlans: string[]
    units: string[]
    specs: string[]
    intelligence: string[]
    partners: string[]
  } = {
    core: [],
    pricing: [],
    paymentPlans: [],
    units: [],
    specs: [],
    intelligence: [],
    partners: []
  }

  // 1. CORE INFO AUDIT
  for (const p of projects) {
    if (!p.name || p.name.trim().length === 0) {
      findings.core.push(`[${p.id}] Missing project name`)
      issuesFound++
    }
    if (!p.slug || p.slug.trim().length === 0) {
      findings.core.push(`[${p.name}] Missing slug`)
      issuesFound++
    }
    if (!p.sector || p.sector.trim().length === 0) {
      findings.core.push(`[${p.name}] Missing sector`)
      issuesFound++
    }
    if (!p.city || !['Noida', 'Greater Noida', 'Greater Noida West', 'Yamuna Expressway'].includes(p.city)) {
      findings.core.push(`[${p.name}] Irregular city value: "${p.city}"`)
      issuesFound++
    }
    if (!p.builder_id) {
      findings.core.push(`[${p.name}] Unlinked builder`)
      issuesFound++
    }

    // 2. PRICING & COST SHEETS AUDIT
    if (p.cost_sheet) {
      const bsp = p.cost_sheet.base_price_per_sqft
      if (bsp !== null && (bsp < 4000 || bsp > 45000)) {
        findings.pricing.push(`[${p.name}] Suspicious BSP per sqft: ₹${bsp}`)
        issuesFound++
      }
      if (p.cost_sheet.gst_rate_pct !== null && ![0, 5, 12, 18].includes(p.cost_sheet.gst_rate_pct)) {
        findings.pricing.push(`[${p.name}] Invalid GST rate: ${p.cost_sheet.gst_rate_pct}%`)
        issuesFound++
      }
    }

    // 3. PAYMENT PLANS AUDIT
    for (const plan of p.payment_plans) {
      if (Array.isArray(plan.milestones)) {
        const totalPct = plan.milestones.reduce((acc: number, m: any) => acc + (Number(m.pct) || 0), 0)
        if (totalPct !== 100 && totalPct !== 0) {
          findings.paymentPlans.push(`[${p.name}] Payment Plan "${plan.plan_name}" total percentage = ${totalPct}% (Expected 100%)`)
          issuesFound++
        }
      }
    }

    // 4. UNIT TYPES AUDIT
    for (const u of p.unit_types) {
      if (u.carpet_area_sqft && u.super_area_sqft && u.carpet_area_sqft > u.super_area_sqft) {
        findings.units.push(`[${p.name}] Unit "${u.name}" has carpet (${u.carpet_area_sqft}) > super area (${u.super_area_sqft})`)
        issuesFound++
      }
      if (u.price_min_cr && u.price_min_cr <= 0) {
        findings.units.push(`[${p.name}] Unit "${u.name}" has non-positive price: ₹${u.price_min_cr} Cr`)
        issuesFound++
      }
    }

    // 5. SPECIFICATIONS AUDIT
    for (const s of p.spec_items) {
      if (!s.label || !s.value) {
        findings.specs.push(`[${p.name}] Incomplete spec item: category=${s.category}`)
        issuesFound++
      }
    }

    // 6. CHANNEL PARTNERS AUDIT
    if (p.channel_partners.length === 0) {
      findings.partners.push(`[${p.name}] 0 Channel partners linked`)
      // Note: this may be expected for older projects not yet enriched
    }
  }

  console.log('--- AUDIT RESULTS SUMMARY ---')
  console.log(`Core Info Issues: ${findings.core.length}`)
  if (findings.core.length > 0) console.log(findings.core)

  console.log(`Pricing & Cost Sheet Issues: ${findings.pricing.length}`)
  if (findings.pricing.length > 0) console.log(findings.pricing)

  console.log(`Payment Plan Issues: ${findings.paymentPlans.length}`)
  if (findings.paymentPlans.length > 0) console.log(findings.paymentPlans)

  console.log(`Unit Types Issues: ${findings.units.length}`)
  if (findings.units.length > 0) console.log(findings.units)

  console.log(`Specification Issues: ${findings.specs.length}`)
  if (findings.specs.length > 0) console.log(findings.specs)

  console.log(`Channel Partners Coverage: ${projects.length - findings.partners.length} / ${projects.length} projects linked`)

  console.log(`\nTotal Critical Data Discrepancies Found: ${issuesFound}`)
  if (issuesFound === 0) {
    console.log('✅ ALL DATABASE DATA PASSES FACTUAL & STRUCTURAL INTEGRITY AUDIT!')
  }

  await prisma.$disconnect()
}

deepDataIntegrityAudit().catch(console.error)
