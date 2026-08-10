import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n💰 Enriching Complete CostSheets across all Database Projects...\n')

  const projects = await prisma.project.findMany({
    include: {
      cost_sheet: true,
      unit_types: true
    }
  })

  let updatedCount = 0

  for (const p of projects) {
    const minPrice = p.unit_types.length > 0
      ? Math.min(...p.unit_types.map(u => u.price_per_sqft).filter((v): v is number => v !== null && v > 0))
      : 6500

    const bsp = isFinite(minPrice) ? minPrice : 6500
    const baseCostCr = p.price_min_cr || (bsp * 1200) / 1e7

    const parkingCost = p.cost_sheet?.parking_cost || 400000
    const clubMembership = p.cost_sheet?.club_membership || 250000
    const ifms = p.cost_sheet?.ifms || 50000
    const electricityConnection = p.cost_sheet?.electricity_connection || 35000
    const waterSewerConnection = p.cost_sheet?.water_sewer_connection || 25000
    const maintenancePsfMonthly = p.cost_sheet?.maintenance_psf_monthly || 3.5

    const gstRatePct = p.cost_sheet?.gst_rate_pct ?? (p.status === 'ready_to_move' ? 0.0 : 5.0)
    const gstNote = p.status === 'ready_to_move'
      ? '0% GST applicable as Occupancy Certificate (OC) is received.'
      : '5% GST applicable on under-construction residential properties without ITC.'

    const stampDutyPct = p.cost_sheet?.stamp_duty_pct || 6.0
    const registrationPct = p.cost_sheet?.registration_pct || 1.0
    const floorRisePerFloor = p.cost_sheet?.floor_rise_per_floor || 25.0

    const plcCharges = p.cost_sheet?.plc_charges && (p.cost_sheet.plc_charges as any[]).length > 0
      ? p.cost_sheet.plc_charges
      : [
          { label: 'Park / Green Facing', amount_per_sqft: 150 },
          { label: 'Corner / Dual Facing', amount_per_sqft: 100 },
          { label: 'Expressway / Main Road Facing', amount_per_sqft: 200 }
        ]

    const otherCharges = p.cost_sheet?.other_charges && (p.cost_sheet.other_charges as any[]).length > 0
      ? p.cost_sheet.other_charges
      : [
          { label: 'Power Backup (1 KVA)', description: 'Mandatory power backup installation', amount: 50000 },
          { label: 'Legal & Documentation Fee', description: 'Agreement drafting and verification', amount: 25000 }
        ]

    const assumptions = [
      'Basic Sales Price (BSP) subject to floor rise PLC starting from 2nd floor onwards.',
      'Possession charges (IFMS, Meter, Club) payable at the time of offer of possession.',
      'Stamp Duty and Registration charges calculated as per UP Govt norms at registration.',
      'Maintenance charges payable 1 year in advance upon handover.'
    ]

    const allInclusivePriceCr = Number((baseCostCr * (1 + gstRatePct / 100) + (parkingCost + clubMembership + ifms + electricityConnection + waterSewerConnection) / 1e7).toFixed(2))
    const allInclusivePerSqft = Math.round(bsp * (1 + gstRatePct / 100) + (parkingCost + clubMembership + ifms) / 1200)

    await prisma.costSheet.upsert({
      where: { project_id: p.id },
      create: {
        project_id: p.id,
        base_price_per_sqft: bsp,
        base_cost_cr: baseCostCr,
        floor_rise_per_floor: floorRisePerFloor,
        gst_applicable: gstRatePct > 0,
        gst_rate_pct: gstRatePct,
        gst_note: gstNote,
        stamp_duty_pct: stampDutyPct,
        registration_pct: registrationPct,
        parking_cost: parkingCost,
        club_membership: clubMembership,
        ifms: ifms,
        electricity_connection: electricityConnection,
        water_sewer_connection: waterSewerConnection,
        maintenance_psf_monthly: maintenancePsfMonthly,
        plc_charges: plcCharges,
        other_charges: otherCharges,
        all_inclusive_price_cr: allInclusivePriceCr,
        all_inclusive_per_sqft: allInclusivePerSqft,
        assumptions: assumptions
      },
      update: {
        base_price_per_sqft: bsp,
        base_cost_cr: baseCostCr,
        floor_rise_per_floor: floorRisePerFloor,
        gst_applicable: gstRatePct > 0,
        gst_rate_pct: gstRatePct,
        gst_note: gstNote,
        stamp_duty_pct: stampDutyPct,
        registration_pct: registrationPct,
        parking_cost: parkingCost,
        club_membership: clubMembership,
        ifms: ifms,
        electricity_connection: electricityConnection,
        water_sewer_connection: waterSewerConnection,
        maintenance_psf_monthly: maintenancePsfMonthly,
        plc_charges: plcCharges,
        other_charges: otherCharges,
        all_inclusive_price_cr: allInclusivePriceCr,
        all_inclusive_per_sqft: allInclusivePerSqft,
        assumptions: assumptions
      }
    })

    updatedCount++
  }

  console.log(`✅ CostSheet enrichment complete! Populated 100% of fields for all ${updatedCount} projects.`)
}

main().finally(() => prisma.$disconnect())
