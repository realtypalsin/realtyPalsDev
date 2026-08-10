import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n💳 Enriching Multiple Payment Plans across all Database Projects...\n')

  const projects = await prisma.project.findMany({ select: { id: true, name: true, price_min_cr: true } })

  let totalPlansCreated = 0

  for (const p of projects) {
    const basePrice = p.price_min_cr || 1.2

    // 1. Construction Linked Plan (CLP)
    const clpMilestones = [
      { milestone: 'At the time of Booking', pct: 10, amt: `₹${(basePrice * 0.1).toFixed(2)} Cr`, due: 'Immediate', done: true },
      { milestone: 'On Commencement of Excavation', pct: 10, amt: `₹${(basePrice * 0.1).toFixed(2)} Cr`, due: 'Within 30 Days', done: true },
      { milestone: 'On Laying of Raft / Foundation', pct: 10, amt: `₹${(basePrice * 0.1).toFixed(2)} Cr`, due: 'Milestone 1', done: false },
      { milestone: 'On Casting of 5th Floor Slab', pct: 10, amt: `₹${(basePrice * 0.1).toFixed(2)} Cr`, due: 'Milestone 2', done: false },
      { milestone: 'On Casting of 10th Floor Slab', pct: 10, amt: `₹${(basePrice * 0.1).toFixed(2)} Cr`, due: 'Milestone 3', done: false },
      { milestone: 'On Casting of Top Floor Slab', pct: 10, amt: `₹${(basePrice * 0.1).toFixed(2)} Cr`, due: 'Milestone 4', done: false },
      { milestone: 'On Completion of Internal Plaster', pct: 10, amt: `₹${(basePrice * 0.1).toFixed(2)} Cr`, due: 'Milestone 5', done: false },
      { milestone: 'On Completion of Flooring & Tiling', pct: 10, amt: `₹${(basePrice * 0.1).toFixed(2)} Cr`, due: 'Milestone 6', done: false },
      { milestone: 'On Completion of External Paint & MEP', pct: 10, amt: `₹${(basePrice * 0.1).toFixed(2)} Cr`, due: 'Milestone 7', done: false },
      { milestone: 'At the time of Offer of Possession', pct: 10, amt: `₹${(basePrice * 0.1).toFixed(2)} Cr`, due: 'Handover', done: false }
    ]

    await prisma.paymentPlan.upsert({
      where: { project_id_plan_type: { project_id: p.id, plan_type: 'construction_linked' } },
      create: {
        project_id: p.id,
        plan_type: 'construction_linked',
        plan_name: 'Construction Linked Plan (10:90 CLP)',
        description: 'Standard RERA-compliant stage-by-stage construction linked schedule.',
        milestones: clpMilestones,
        down_payment_pct: 10,
        booking_amount_lakh: Number((basePrice * 10).toFixed(1)),
        total_duration_months: 36,
        discount_offered_pct: 0,
        best_for: 'End users looking for balanced, risk-mitigated payments tied to site progress.',
        watch_out: 'Late payment charges of SBI MCLR + 2% apply if stage demand notes are missed.'
      },
      update: {
        plan_name: 'Construction Linked Plan (10:90 CLP)',
        description: 'Standard RERA-compliant stage-by-stage construction linked schedule.',
        milestones: clpMilestones,
        down_payment_pct: 10,
        booking_amount_lakh: Number((basePrice * 10).toFixed(1)),
        total_duration_months: 36,
        best_for: 'End users looking for balanced, risk-mitigated payments tied to site progress.',
        watch_out: 'Late payment charges of SBI MCLR + 2% apply if stage demand notes are missed.'
      }
    })
    totalPlansCreated++

    // 2. Flexi Payment Plan (Flexi)
    const flexiMilestones = [
      { milestone: 'Booking Amount', pct: 20, amt: `₹${(basePrice * 0.2).toFixed(2)} Cr`, due: 'Immediate', done: true },
      { milestone: 'Within 60 Days of Allotment', pct: 20, amt: `₹${(basePrice * 0.2).toFixed(2)} Cr`, due: 'Day 60', done: false },
      { milestone: 'On Completion of Superstructure', pct: 30, amt: `₹${(basePrice * 0.3).toFixed(2)} Cr`, due: 'Superstructure', done: false },
      { milestone: 'On Completion of Internal Finishing', pct: 20, amt: `₹${(basePrice * 0.2).toFixed(2)} Cr`, due: 'Finishing', done: false },
      { milestone: 'On Offer of Possession', pct: 10, amt: `₹${(basePrice * 0.1).toFixed(2)} Cr`, due: 'Handover', done: false }
    ]

    await prisma.paymentPlan.upsert({
      where: { project_id_plan_type: { project_id: p.id, plan_type: 'flexi' } },
      create: {
        project_id: p.id,
        plan_type: 'flexi',
        plan_name: 'Flexi Payment Plan (20:20:30:20:10)',
        description: 'Flexible payment plan with reduced frequency of installment calls.',
        milestones: flexiMilestones,
        down_payment_pct: 20,
        booking_amount_lakh: Number((basePrice * 20).toFixed(1)),
        total_duration_months: 36,
        discount_offered_pct: 3,
        best_for: 'Salaried buyers wanting predictable, milestone-based cash outflows.',
        watch_out: 'Slightly higher upfront commitment (20%) compared to CLP.'
      },
      update: {
        plan_name: 'Flexi Payment Plan (20:20:30:20:10)',
        description: 'Flexible payment plan with reduced frequency of installment calls.',
        milestones: flexiMilestones,
        down_payment_pct: 20,
        booking_amount_lakh: Number((basePrice * 20).toFixed(1)),
        total_duration_months: 36,
        discount_offered_pct: 3,
        best_for: 'Salaried buyers wanting predictable, milestone-based cash outflows.',
        watch_out: 'Slightly higher upfront commitment (20%) compared to CLP.'
      }
    })
    totalPlansCreated++

    // 3. Down Payment Plan
    const dpMilestones = [
      { milestone: 'At the time of Booking', pct: 10, amt: `₹${(basePrice * 0.1).toFixed(2)} Cr`, due: 'Immediate', done: true },
      { milestone: 'Down Payment within 45 Days (Upfront Discount Applied)', pct: 80, amt: `₹${(basePrice * 0.736).toFixed(2)} Cr`, due: 'Day 45', done: false },
      { milestone: 'At the time of Offer of Possession', pct: 10, amt: `₹${(basePrice * 0.1).toFixed(2)} Cr`, due: 'Handover', done: false }
    ]

    await prisma.paymentPlan.upsert({
      where: { project_id_plan_type: { project_id: p.id, plan_type: 'down_payment' } },
      create: {
        project_id: p.id,
        plan_type: 'down_payment',
        plan_name: 'Down Payment Plan (8% Special Discount)',
        description: 'Pay 90% upfront within 45 days and get an attractive 8% flat discount on BSP.',
        milestones: dpMilestones,
        down_payment_pct: 90,
        booking_amount_lakh: Number((basePrice * 10).toFixed(1)),
        total_duration_months: 2,
        discount_offered_pct: 8,
        best_for: 'Self-funded buyers or high-liquidity investors seeking maximum BSP discount.',
        watch_out: 'Requires full capital commitment upfront regardless of construction pace.'
      },
      update: {
        plan_name: 'Down Payment Plan (8% Special Discount)',
        description: 'Pay 90% upfront within 45 days and get an attractive 8% flat discount on BSP.',
        milestones: dpMilestones,
        down_payment_pct: 90,
        booking_amount_lakh: Number((basePrice * 10).toFixed(1)),
        total_duration_months: 2,
        discount_offered_pct: 8,
        best_for: 'Self-funded buyers or high-liquidity investors seeking maximum BSP discount.',
        watch_out: 'Requires full capital commitment upfront regardless of construction pace.'
      }
    })
    totalPlansCreated++

    // 4. Investor Special Plan
    const investorMilestones = [
      { milestone: 'Booking & Initial Commitment', pct: 25, amt: `₹${(basePrice * 0.25).toFixed(2)} Cr`, due: 'Immediate', done: true },
      { milestone: 'At 12 Months from Booking', pct: 25, amt: `₹${(basePrice * 0.25).toFixed(2)} Cr`, due: 'Month 12', done: false },
      { milestone: 'On Completion of Superstructure', pct: 25, amt: `₹${(basePrice * 0.25).toFixed(2)} Cr`, due: 'Superstructure', done: false },
      { milestone: 'On Offer of Possession', pct: 25, amt: `₹${(basePrice * 0.25).toFixed(2)} Cr`, due: 'Handover', done: false }
    ]

    await prisma.paymentPlan.upsert({
      where: { project_id_plan_type: { project_id: p.id, plan_type: 'investor' } },
      create: {
        project_id: p.id,
        plan_type: 'investor',
        plan_name: 'Investor Special Plan (25:25:25:25 Quad-Pay)',
        description: 'Low-friction quarterly/annual payments tailored for capital appreciation investors.',
        milestones: investorMilestones,
        down_payment_pct: 25,
        booking_amount_lakh: Number((basePrice * 25).toFixed(1)),
        total_duration_months: 36,
        discount_offered_pct: 2,
        best_for: 'Property investors planning to exit or resell near completion.',
        watch_out: 'Resale lock-in period rules apply per builder NOC guidelines.'
      },
      update: {
        plan_name: 'Investor Special Plan (25:25:25:25 Quad-Pay)',
        description: 'Low-friction quarterly/annual payments tailored for capital appreciation investors.',
        milestones: investorMilestones,
        down_payment_pct: 25,
        booking_amount_lakh: Number((basePrice * 25).toFixed(1)),
        total_duration_months: 36,
        discount_offered_pct: 2,
        best_for: 'Property investors planning to exit or resell near completion.',
        watch_out: 'Resale lock-in period rules apply per builder NOC guidelines.'
      }
    })
    totalPlansCreated++
  }

  console.log(`✅ Payment Plans enrichment complete! Created/updated ${totalPlansCreated} payment plans across all ${projects.length} projects.`)
}

main().finally(() => prisma.$disconnect())
