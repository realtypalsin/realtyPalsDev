import { prisma } from './db'

export interface LeadProfile {
  budget_cr?: { min: number | null; max: number | null }
  bhk?: number | null
  purpose?: string | null
  possession_pref?: string | null
  timeline?: string | null
  loan_pre_approved?: boolean | null
  preferred_sector?: string | null
  work_location?: string | null
  engagement?: { projects_viewed: number; projects_saved: number }
  ai_summary?: string | null
}

export async function loadLeadProfile(
  userId?: string | null,
  guestToken?: string | null,
): Promise<LeadProfile> {
  if (!userId && !guestToken) return {}
  const mem = await prisma.userMemory.findFirst({
    where: userId ? { user_id: userId } : { guest_token: guestToken! },
  }).catch(() => null)
  if (!mem) return {}
  return {
    budget_cr: { min: mem.budget_min_cr ?? null, max: mem.budget_max_cr ?? null },
    bhk: mem.bhk_preference ?? null,
    purpose: mem.purpose ?? null,
    possession_pref: mem.possession_pref ?? null,
    timeline: mem.timeline_months ? `${mem.timeline_months}m` : null,
    loan_pre_approved: mem.home_loan_pre_approved ?? null,
    preferred_sector: mem.sector_preference ?? null,
    work_location: mem.work_location ?? null,
    engagement: {
      projects_viewed: mem.viewed_slugs?.length ?? 0,
      projects_saved: mem.saved_slugs?.length ?? 0,
    },
    ai_summary: mem.summary_text ?? null,
  }
}

export function scoreLead(args: {
  loanPreApproved?: boolean | null
  intentTier?: string | null
  projectFitsBudget?: boolean
  savedCount?: number
  viewedCount?: number
  sectorMatches?: boolean
}): { score: number; tier: 'HOT' | 'WARM' | 'COLD' } {
  let s = 0
  if (args.loanPreApproved) s += 30
  if (args.intentTier === 'immediate') s += 25
  else if (args.intentTier === '1-3-months') s += 15
  if (args.projectFitsBudget) s += 20
  if ((args.savedCount ?? 0) >= 2 && (args.viewedCount ?? 0) >= 3) s += 15
  else s += Math.min(15, (args.savedCount ?? 0) * 5)
  if (args.sectorMatches) s += 10
  const tier = s >= 70 ? 'HOT' : s >= 40 ? 'WARM' : 'COLD'
  return { score: s, tier }
}
