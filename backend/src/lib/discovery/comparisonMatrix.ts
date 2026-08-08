import type { ConversationMemory, ComparisonMatrix } from './types'

export interface PaymentPlanData {
  id: string
  plan_type: string
  down_payment_pct?: number | null
  duration_months?: number | null
  monthly_emi?: number | null
}

export interface RankingResult {
  matrix: ComparisonMatrix
  winner: string
  reason: string
}

export function rankPaymentPlans(
  plans: PaymentPlanData[],
  memory: Partial<ConversationMemory>
): RankingResult {
  // Infer priority from memory
  const hasBudgetConstraint = memory.user_budget_min_cr && memory.user_budget_max_cr
  const hasTimelineConcern = memory.user_pain_points?.some(p =>
    /timeline|flexibility|long|short/.test(p.toLowerCase())
  )
  const hasTrustConcern = memory.user_pain_points?.some(p =>
    /trust|builder|confidence|delay/.test(p.toLowerCase())
  )

  // Score each plan
  const scored = plans.map((plan, idx) => {
    let score = 0
    const planName = plan.plan_type || `Plan ${idx + 1}`

    // Budget-first: lower down_payment = higher score
    if (hasBudgetConstraint && plan.down_payment_pct != null) {
      score += Math.max(0, 100 - plan.down_payment_pct * 2)
    }

    // Flexibility-first: flexible (null duration) > fixed duration
    if (hasTimelineConcern) {
      if (plan.duration_months === null) {
        score += 75 // Flexible plans score high
      } else if (plan.duration_months > 60) {
        score += 25 // Long duration = less flexible
      } else {
        score += 50 // Standard duration
      }
    }

    // Trust-first: construction-linked (builder owns risk) scores higher
    if (hasTrustConcern && plan.plan_type === 'construction_linked') {
      score += 50
    }

    return { ...plan, _score: score, _index: idx, _displayName: planName }
  })

  // Sort by score descending
  const sorted = scored.sort((a, b) => b._score - a._score)
  const winner = sorted[0]._displayName

  // Build reason
  let reason = `Based on your `
  const reasons: string[] = []

  if (hasBudgetConstraint) {
    reasons.push(`budget of ₹${memory.user_budget_min_cr}-${memory.user_budget_max_cr}Cr`)
  }
  if (hasTimelineConcern) {
    reasons.push(`timeline flexibility`)
  }
  if (hasTrustConcern) {
    reasons.push(`builder reliability`)
  }

  reason += reasons.join(', ')
  reason += `, **${winner}** offers the best fit.`

  // Build matrix
  const matrix: ComparisonMatrix = {
    dimensions: [
      { name: 'Down Payment', format: 'percentage' },
      { name: 'Duration (months)', format: 'number' },
      { name: 'Monthly EMI', format: 'currency' }
    ],
    rows: sorted.slice(0, 3).map((plan) => ({
      name: plan._displayName,
      values: [
        plan.down_payment_pct ?? 0,
        plan.duration_months ?? 0,
        plan.monthly_emi ?? 0
      ]
    }))
  }

  return { matrix, winner, reason }
}
