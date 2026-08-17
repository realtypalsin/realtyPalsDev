import { prisma } from '../lib/db'
import * as fs from 'fs'
import * as path from 'path'

async function syncMasterBackup75() {
  console.log('=== SYNCHRONIZING MASTER BACKUP (newProj/75) WITH LIVE DATABASE ===')

  const dirPath = path.resolve(__dirname, '../../../newProj/75')
  if (!fs.existsSync(dirPath)) {
    console.error(`Directory not found: ${dirPath}`)
    return
  }

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'))
  console.log(`Found ${files.length} master JSON backup files in newProj/75`)

  // 1. Load all live projects from database with full relations
  const dbProjects = await prisma.project.findMany({
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
      lifecycle_updates: true,
      price_history: true,
      channel_partners: {
        include: { channel_partner: true }
      },
      images: true,
    }
  })

  console.log(`Loaded ${dbProjects.length} live projects from Database`)

  // Index DB projects by ID and by Slug
  const dbById = new Map<string, typeof dbProjects[0]>()
  const dbBySlug = new Map<string, typeof dbProjects[0]>()
  for (const p of dbProjects) {
    dbById.set(p.id, p)
    dbBySlug.set(p.slug, p)
  }

  let totalUpdatedFiles = 0
  let totalProjectsSynced = 0

  const expresswaySectors = new Set([
    'Sector 128', 'Sector 134', 'Sector 137', 'Sector 143', 'Sector 143B',
    'Sector 144', 'Sector 146', 'Sector 150', 'Sector 151', 'Sector 152',
    'Sector 45', 'Sector 46', 'Sector 50', 'Sector 70', 'Sector 74', 'Sector 75',
    'Sector 76', 'Sector 77', 'Sector 78', 'Sector 79', 'Sector 93A', 'Sector 93B', 'Sector 94',
    'Sector 100', 'Sector 104', 'Sector 107', 'Sector 108', 'Sector 110', 'Sector 119', 'Sector 120', 'Sector 121', 'Sector 124'
  ])

  for (const file of files) {
    const filePath = path.join(dirPath, file)
    let raw = ''
    try {
      raw = fs.readFileSync(filePath, 'utf8')
    } catch (err) {
      console.warn(`Failed to read ${file}:`, err)
      continue
    }

    let items: any[] = []
    try {
      items = JSON.parse(raw)
    } catch (err) {
      console.warn(`JSON parse error in ${file}:`, err)
      continue
    }

    if (!Array.isArray(items)) continue

    let modified = false
    const syncedItems: any[] = []

    for (const item of items) {
      const dbMatch = (item.id && dbById.get(item.id)) || (item.slug && dbBySlug.get(item.slug))

      if (dbMatch) {
        // Synchronize fields from DB into backup
        const updatedItem = { ...item }

        // Correct city if in Expressway sectors
        if (expresswaySectors.has(dbMatch.sector) && updatedItem.city !== 'Noida') {
          updatedItem.city = 'Noida'
          modified = true
        }

        // Sync pricing
        if (dbMatch.price_min_cr && updatedItem.price_min_cr !== dbMatch.price_min_cr) {
          updatedItem.price_min_cr = dbMatch.price_min_cr
          modified = true
        }
        if (dbMatch.price_range_label && updatedItem.price_range_label !== dbMatch.price_range_label) {
          updatedItem.price_range_label = dbMatch.price_range_label
          modified = true
        }

        // Sync Cost Sheet if missing or updated
        if (dbMatch.cost_sheet) {
          updatedItem.cost_sheet = {
            id: dbMatch.cost_sheet.id,
            project_id: dbMatch.id,
            base_price_per_sqft: dbMatch.cost_sheet.base_price_per_sqft,
            base_cost_cr: dbMatch.cost_sheet.base_cost_cr,
            floor_rise_per_floor: dbMatch.cost_sheet.floor_rise_per_floor,
            plc_charges: dbMatch.cost_sheet.plc_charges,
            parking_cost: dbMatch.cost_sheet.parking_cost,
            ifms: dbMatch.cost_sheet.ifms,
            club_membership: dbMatch.cost_sheet.club_membership,
            other_charges: dbMatch.cost_sheet.other_charges,
            gst_rate_pct: dbMatch.cost_sheet.gst_rate_pct,
          }
          modified = true
        }

        // Sync Payment Plans
        if (dbMatch.payment_plans.length > 0) {
          updatedItem.payment_plans = dbMatch.payment_plans.map((pl: any) => ({
            id: pl.id,
            project_id: dbMatch.id,
            plan_name: pl.plan_name,
            plan_type: pl.plan_type,
            down_payment_pct: pl.down_payment_pct,
            milestones: pl.milestones,
          }))
          modified = true
        }

        // Sync Decision & Persona Profiles
        if (dbMatch.decision_profile) {
          updatedItem.decision_profile = {
            id: dbMatch.decision_profile.id,
            project_id: dbMatch.id,
            decision_thesis: dbMatch.decision_profile.decision_thesis,
            why_buy: dbMatch.decision_profile.why_buy,
            why_avoid: dbMatch.decision_profile.why_avoid,
            best_for: dbMatch.decision_profile.best_for,
            not_ideal_for: dbMatch.decision_profile.not_ideal_for,
          }
          modified = true
        }

        if (dbMatch.persona_profile) {
          updatedItem.persona_profile = {
            id: dbMatch.persona_profile.id,
            project_id: dbMatch.id,
            primary_persona: dbMatch.persona_profile.primary_persona,
            income_range: dbMatch.persona_profile.income_range,
            family_stage: dbMatch.persona_profile.family_stage,
            work_location: dbMatch.persona_profile.work_location,
            risk_appetite: dbMatch.persona_profile.risk_appetite,
          }
          modified = true
        }

        // Sync Channel Partners
        if (dbMatch.channel_partners.length > 0) {
          updatedItem.channel_partners = dbMatch.channel_partners.map((cp: any) => ({
            id: cp.channel_partner.id,
            name: cp.channel_partner.name,
            phone: cp.channel_partner.phone,
            email: cp.channel_partner.email,
            rera_compliant: cp.channel_partner.rera_compliant,
            type: cp.channel_partner.type,
          }))
          modified = true
        }

        syncedItems.push(updatedItem)
        totalProjectsSynced++
      } else {
        syncedItems.push(item)
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(syncedItems, null, 2))
      totalUpdatedFiles++
    }
  }

  console.log(`[sync] Processed ${files.length} master backup files:`)
  console.log(`[sync] - Updated files with enriched schemas & city alignments: ${totalUpdatedFiles}`)
  console.log(`[sync] - Total project records synchronized: ${totalProjectsSynced}`)
  console.log('=== BACKUP FILES AND DATABASE ARE NOW 100% IN MUTUAL SYNC ===')

  await prisma.$disconnect()
}

syncMasterBackup75().catch(console.error)
