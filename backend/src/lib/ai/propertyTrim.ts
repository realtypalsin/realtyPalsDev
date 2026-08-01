/**
 * Trim property objects to only essential fields for AI prompts.
 * Reduces input tokens by 30-40% without losing decision-making context.
 *
 * Keep: id, name, price, sector, possession date, concerns, payment_plan, cost_sheet
 * Drop: full images, amenities lists, floor plans, regulatory docs (available via RAG)
 */

export interface TrimmedProperty {
  id: string;
  name: string;
  price_range_label?: string | null;
  sector?: { name: string } | null;
  possession_status?: string | null;
  possession_label?: string | null;
  concerns?: string[] | null;
  bhk?: number | null;
  builder?: { name: string } | null;
  payment_plans?: {
    plan_type?: string | null;
    plan_name?: string | null;
    milestones?: unknown;
    notes?: string | null;
  }[] | null;
  cost_sheet?: {
    base_price_per_sqft?: number | null;
    gst_rate_pct?: number | null;
    stamp_duty_pct?: number | null;
    registration_pct?: number | null;
  } | null;
}

function normalisePaymentPlans(project: any): any[] {
  if (Array.isArray(project.payment_plans)) return project.payment_plans;
  if (project.payment_plan) return [project.payment_plan];
  return [];
}

export function trimPropertyForPrompt(project: any): TrimmedProperty {
  return {
    id: project.id,
    name: project.name,
    price_range_label: project.price_range_label,
    sector: project.sector ? { name: typeof project.sector === 'string' ? project.sector : project.sector.name } : null,
    possession_status: project.possession_status,
    possession_label: project.possession_label,
    concerns: project.concerns,
    bhk: project.bhk,
    builder: project.builder ? { name: typeof project.builder === 'string' ? project.builder : project.builder.name } : null,
    // Accepts either the new payment_plans array or a legacy single payment_plan.
    payment_plans: normalisePaymentPlans(project).map((p: any) => ({
      plan_type: p.plan_type ?? null,
      plan_name: p.plan_name ?? null,
      milestones: p.milestones,
      notes: p.notes ?? null,
    })),
    cost_sheet: project.cost_sheet ? {
      base_price_per_sqft: project.cost_sheet.base_price_per_sqft,
      gst_rate_pct: project.cost_sheet.gst_rate_pct,
      stamp_duty_pct: project.cost_sheet.stamp_duty_pct,
      registration_pct: project.cost_sheet.registration_pct,
    } : null,
  };
}

export function trimPropertiesForPrompt(projects: any[]): TrimmedProperty[] {
  return projects.map(trimPropertyForPrompt);
}
