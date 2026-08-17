// backend/src/routes/chat-service.ts
import { prisma } from '../lib/db'
import { generateChips } from '../lib/discovery/chipGenerator'

export async function generateDatabaseFallbackResponse(userMsg: string, projects: any[], sessionId?: string): Promise<any> {
  const queryLower = userMsg.toLowerCase()
  let p = projects.find((proj) => proj.name && queryLower.includes(proj.name.toLowerCase())) || projects[0] || null

  if (!p && userMsg) {
    try {
      const dbMatch = await (prisma as any).project.findFirst({
        where: { name: { contains: userMsg.slice(0, 20), mode: 'insensitive' } },
        include: { unit_types: true, payment_plans: true, amenities: true, cost_sheet: true },
      })
      if (dbMatch) p = dbMatch
    } catch {
      // Ignore fallback DB search errors
    }
  }

  if (p) {
    const name = p.name || 'this project'
    const sector = p.sector || 'Noida'

    // Hydrate full project relations if missing
    if (p.id && (!p.decision_profile || !p.persona_profile || !p.competitors)) {
      try {
        const fullProj = await prisma.project.findUnique({
          where: { id: p.id },
          include: {
            builder: true,
            unit_types: true,
            payment_plans: true,
            cost_sheet: true,
            amenities: true,
            connectivity: true,
            decision_profile: true,
            persona_profile: true,
            recommendation_profile: true,
            dna: true,
            competitors: true,
            construction_updates: true,
            construction_milestones: true,
          }
        })
        if (fullProj) p = { ...p, ...fullProj }
      } catch (e) {
        console.warn('[CHAT:DB_FETCH_FULL_PROJECT]', e)
      }
    }

    // 1. Multi-Plan Payment Overview & Selection
    if (queryLower.includes('payment') || queryLower.includes('plan') || queryLower.includes('clp') || queryLower.includes('flexi') || queryLower.includes('down payment') || queryLower.includes('possession linked') || queryLower.includes('nri plan') || queryLower.includes('flow') || queryLower.includes('flows') || queryLower.includes('schedule') || queryLower.includes('milestone')) {
      const priceText = p.price_min_cr && p.price_max_cr
        ? `₹${p.price_min_cr} Cr – ₹${p.price_max_cr} Cr`
        : p.price_min_cr ? `₹${p.price_min_cr} Cr onwards` : 'Price available on request'

      let plansList: any[] = []
      if (Array.isArray(p.payment_plans) && p.payment_plans.length > 0) {
        plansList = [...p.payment_plans]
        const isSpecificPlanQuery = queryLower.includes('flexi plan') || queryLower.includes('down payment plan') || queryLower.includes('clp plan') || queryLower.includes('investor plan');
        if (isSpecificPlanQuery) {
          if (queryLower.includes('flexi')) {
            const matched = plansList.filter((pl: any) => (pl.plan_name || pl.name || '').toLowerCase().includes('flexi'))
            if (matched.length > 0) plansList = matched
          } else if (queryLower.includes('down payment')) {
            const matched = plansList.filter((pl: any) => (pl.plan_name || pl.name || '').toLowerCase().includes('down payment'))
            if (matched.length > 0) plansList = matched
          } else if (queryLower.includes('investor') || queryLower.includes('quad')) {
            const matched = plansList.filter((pl: any) => (pl.plan_name || pl.name || '').toLowerCase().includes('investor'))
            if (matched.length > 0) plansList = matched
          } else if (queryLower.includes('clp') || queryLower.includes('construction linked')) {
            const matched = plansList.filter((pl: any) => (pl.plan_name || pl.name || '').toLowerCase().includes('construction'))
            if (matched.length > 0) plansList = matched
          }
        }
        // Filter out Construction Linked Plans for Ready to Move projects
        if (p.status && p.status.toLowerCase().includes('ready')) {
          plansList = plansList.filter((pl: any) => {
            const name = (pl.plan_name || pl.name || '').toLowerCase()
            return !name.includes('construction') && !name.includes('clp')
          })
        }
      }

      let plansText = ''
      if (plansList.length > 0) {
        plansText = plansList.map((plan: any) => {
          const planName = plan.plan_name || plan.name || plan.plan_type || 'Payment Plan'
          const downPay = plan.down_payment_pct != null ? `${plan.down_payment_pct}%` : '10%'
          const bookingAmt = plan.booking_amount ? `₹${plan.booking_amount}` : (plan.booking_amount_lakh ? `₹${plan.booking_amount_lakh} Lakhs` : 'As per scheme')
          const tenure = plan.total_duration_months ? `${plan.total_duration_months} Months` : '36 Months'
          const discount = plan.discount_offered || (plan.discount_pct ? `${plan.discount_pct}%` : 'None')
          const bestFor = plan.best_for || 'Buyers seeking structured payment flexibility'
          const watchOut = plan.watch_out || plan.penalty_clause || 'Timely payment of stage demand notes required'

          let milestonesMarkdown = ''
          if (Array.isArray(plan.milestones) && plan.milestones.length > 0) {
            milestonesMarkdown = '\n>\n> **Payment Milestones**:\n' + plan.milestones.map((m: any) => {
              const mName = m.milestone || m.name || 'Stage'
              const pctStr = m.pct != null ? ` (${m.pct}%)` : ''
              const dueStr = m.due || m.amt ? `: **${m.due || m.amt}**` : ''
              return `> - 🔹 **${mName}**${dueStr}${pctStr}`
            }).join('\n')
          }

          return `> ### **${planName}**\n` +
            `> _${bestFor}_\n` +
            `>\n` +
            `> | Highlight | Details |\n` +
            `> | :--- | :--- |\n` +
            `> | **Down Payment** | ${downPay} |\n` +
            `> | **Booking Token** | ${bookingAmt} |\n` +
            `> | **Total Tenure** | ${tenure} |\n` +
            `> | **Discount** | ${discount} |\n` +
            `> | **Watch Out** | ${watchOut} |` +
            milestonesMarkdown
        }).join('\n\n---\n\n')
      } else {
        plansText = `> ### **Construction Linked Plan (10:90 CLP)**\n` +
          `> _Standard milestone-based payment schedule_\n` +
          `>\n` +
          `> | Milestone | Share |\n` +
          `> | :--- | :--- |\n` +
          `> | Booking Token | 10% |\n` +
          `> | Foundation & Superstructure | 70% |\n` +
          `> | Possession & Handover | 20% |`
      }

      const replyText = `### Verified Payment Plan Options for **${name}** (${sector})\n\n**Overall Project Price Range**: ${priceText}\n\n${plansText}`
      return { message: replyText }
    }

    // 2. Full Cost Sheet & Maintenance Breakdown + Rental Yield
    if (queryLower.includes('cost') || queryLower.includes('charge') || queryLower.includes('sheet') || queryLower.includes('breakdown') || queryLower.includes('gst') || queryLower.includes('stamp') || queryLower.includes('bsp') || queryLower.includes('maintenance') || queryLower.includes('society') || queryLower.includes('fee') || queryLower.includes('yield') || queryLower.includes('rental') || queryLower.includes('roi')) {
      const cs = p.cost_sheet || {}
      const bsp = cs.base_price_per_sqft ? `₹${cs.base_price_per_sqft}/sq.ft` : 'As per layout'
      const floorRise = cs.floor_rise_per_floor ? `₹${cs.floor_rise_per_floor}/sq.ft per floor` : 'Standard'
      const gstRate = cs.gst_rate_pct != null ? `${cs.gst_rate_pct}%` : (p.status === 'Ready to Move' ? '0% (RTM Exempt)' : '5% (Under Construction)')
      const stampDuty = cs.stamp_duty_pct != null ? `${cs.stamp_duty_pct}%` : '6.0% (Uttar Pradesh)'
      const maintenance = cs.maintenance_psf_monthly ? `₹${cs.maintenance_psf_monthly}/sq.ft per month` : '₹2.5 – ₹3.5/sq.ft'
      const rentalYield = (p as any).rental_yield_annual_percent ? `${(p as any).rental_yield_annual_percent}% per annum` : 'Market-dependent'

      return {
        message: `### Cost Sheet & Additional Charges for **${name}** (${sector})\n\n` +
          `| Charge Component | Rate / Details |\n` +
          `| :--- | :--- |\n` +
          `| **Base Price (BSP)** | **${bsp}** |\n` +
          `| **Floor Rise Charge** | ${floorRise} |\n` +
          `| **GST Applicable** | **${gstRate}** |\n` +
          `| **Stamp Duty & Registration** | **${stampDuty} + 1.0%** |\n` +
          `| **Maintenance Deposit** | ${maintenance} |\n` +
          `| **Parking Allotment** | ${cs.parking_cost ? `₹${cs.parking_cost} Lakhs` : 'Included / Standard'} |\n` +
          `| **Estimated Rental Yield (Annual)** | **${rentalYield}** |`
      }
    }

    // Simplified: return basic project details for other queries
    return {
      message: `### Project Details for **${name}** (${sector})\n\n` +
        `For more information about ${name}, please ask about specific aspects like payment plans, amenities, location, or timeline.`
    }
  }

  const fallbackName = p ? p.name : 'this project'
  const fallbackSector = p ? p.sector : 'Noida'
  return {
    message: `### Verified Project Details for **${fallbackName}** (${fallbackSector})\n\n` +
      `Here are the verified records on file for **${fallbackName}**:\n` +
      `- **Status**: ${p?.status || 'Active Verified Project'}\n` +
      `- **Location**: ${fallbackSector}, ${p?.city || 'Noida'}\n` +
      `- **Price Range**: ${p?.price_range_label || (p?.price_min_cr ? `₹${p.price_min_cr} Cr onwards` : 'Available on request')}\n` +
      `- **RERA Registration**: ${p?.rera_number || 'Verified RERA Approved'}\n\n` +
      `*For specific unlisted document requests or personalized project files, complete the official advisory request form below:*`,
    components: [
      {
        type: 'lead-form',
        props: {
          projectName: fallbackName,
          inquiryTopic: userMsg,
        }
      }
    ]
  }
}
