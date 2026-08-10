import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n💳 Wave 5: Enriching Possession-Linked & NRI Payment Plans across all Projects...\n')

  const projects = await prisma.project.findMany({ select: { id: true, name: true, price_min_cr: true } })

  let totalPlansCreated = 0

  for (const p of projects) {
    const basePrice = p.price_min_cr || 1.2

    // 1. Possession Linked Plan (PLP 20:80)
    const plpMilestones = [
      { milestone: 'At the time of Booking & Allotment', pct: 20, amt: `₹${(basePrice * 0.2).toFixed(2)} Cr`, due: 'Immediate', done: true },
      { milestone: 'On Completion of Superstructure Slab', pct: 10, amt: `₹${(basePrice * 0.1).toFixed(2)} Cr`, due: 'Superstructure', done: false },
      { milestone: 'At the time of Offer of Possession', pct: 70, amt: `₹${(basePrice * 0.7).toFixed(2)} Cr`, due: 'Offer of Possession', done: false }
    ]

    await prisma.paymentPlan.upsert({
      where: { project_id_plan_type: { project_id: p.id, plan_type: 'possession_linked' } },
      create: {
        project_id: p.id,
        plan_type: 'possession_linked',
        plan_name: 'Possession Linked Plan (20:80 PLP)',
        description: 'Pay 20% now and 80% on offer of possession upon structural handover.',
        milestones: plpMilestones,
        down_payment_pct: 20,
        booking_amount_lakh: Number((basePrice * 20).toFixed(1)),
        total_duration_months: 30,
        discount_offered_pct: 0,
        best_for: 'Buyers wanting minimal cash outflow during construction phase.',
        watch_out: 'Requires home loan sanction letter pre-approved at booking.'
      },
      update: {
        plan_name: 'Possession Linked Plan (20:80 PLP)',
        description: 'Pay 20% now and 80% on offer of possession upon structural handover.',
        milestones: plpMilestones,
        down_payment_pct: 20,
        booking_amount_lakh: Number((basePrice * 20).toFixed(1)),
        total_duration_months: 30,
        best_for: 'Buyers wanting minimal cash outflow during construction phase.',
        watch_out: 'Requires home loan sanction letter pre-approved at booking.'
      }
    })
    totalPlansCreated++

    // 2. NRI Remittance Special Plan
    const nriMilestones = [
      { milestone: 'Booking via Foreign Currency Remittance (NRE/NRO)', pct: 15, amt: `₹${(basePrice * 0.15).toFixed(2)} Cr`, due: 'Immediate', done: true },
      { milestone: 'Within 90 Days of RERA Agreement Execution', pct: 35, amt: `₹${(basePrice * 0.35).toFixed(2)} Cr`, due: 'Day 90', done: false },
      { milestone: 'At 18 Months / Halfway Construction Stage', pct: 30, amt: `₹${(basePrice * 0.30).toFixed(2)} Cr`, due: 'Month 18', done: false },
      { milestone: 'At the time of Final Key Handover & Registration', pct: 20, amt: `₹${(basePrice * 0.20).toFixed(2)} Cr`, due: 'Possession', done: false }
    ]

    await prisma.paymentPlan.upsert({
      where: { project_id_plan_type: { project_id: p.id, plan_type: 'nri' } },
      create: {
        project_id: p.id,
        plan_type: 'nri',
        plan_name: 'NRI Special Remittance Plan (15:35:30:20)',
        description: 'Tailored payment schedule compliant with RBI FERA/FEMA norms for NRI NRE/NRO accounts.',
        milestones: nriMilestones,
        down_payment_pct: 15,
        booking_amount_lakh: Number((basePrice * 15).toFixed(1)),
        total_duration_months: 36,
        discount_offered_pct: 4,
        best_for: 'NRI investors seeking USD/AED/GBP remittance-aligned payment tranches.',
        watch_out: 'NRO/NRE bank remittance certificates required for tax pass-through.'
      },
      update: {
        plan_name: 'NRI Special Remittance Plan (15:35:30:20)',
        description: 'Tailored payment schedule compliant with RBI FERA/FEMA norms for NRI NRE/NRO accounts.',
        milestones: nriMilestones,
        down_payment_pct: 15,
        booking_amount_lakh: Number((basePrice * 15).toFixed(1)),
        total_duration_months: 36,
        discount_offered_pct: 4,
        best_for: 'NRI investors seeking USD/AED/GBP remittance-aligned payment tranches.',
        watch_out: 'NRO/NRE bank remittance certificates required for tax pass-through.'
      }
    })
    totalPlansCreated++
  }

  console.log(`✅ Wave 5 complete! Created/updated ${totalPlansCreated} extended payment plans across all ${projects.length} projects.`)
}

main().finally(() => prisma.$disconnect())
