import { prisma } from './db'

export async function getBuilderRecord(name: string): Promise<Record<string, unknown> | null> {
  const builder = await prisma.builder.findFirst({
    where: { name: { contains: name, mode: 'insensitive' } },
    include: {
      projects: {
        select: {
          name: true, sector: true, status: true,
          rera_number: true, possession_label: true,
        },
        take: 25,
      },
    },
  })
  if (!builder) return null

  const b = builder as any

  const dataGaps: string[] = []
  if (!builder.delivered_units) dataGaps.push('delivery count unverified')
  if (!b.delivery_score) dataGaps.push('delivery score unverified')
  if (!b.construction_quality_score) dataGaps.push('construction quality unverified')
  if (!b.rera_compliance_score) dataGaps.push('RERA compliance score unverified')
  if (b.litigation_count === null || b.litigation_count === undefined) dataGaps.push('litigation count unverified')

  return {
    // Identity
    name: builder.name,
    slug: builder.slug,
    tagline: builder.tagline,
    founder: b.founder ?? null,
    company_overview: b.company_overview ?? null,
    logo_url: b.logo_url ?? null,
    parent_group: builder.parent_group ?? null,
    founded_year: builder.founded_year ?? null,
    headquarters: builder.headquarters ?? null,
    website: builder.website ?? null,

    // Track Record
    total_projects_count: b.total_projects_count ?? null,
    delivered_units: builder.delivered_units ?? null,
    delivered_projects: builder.delivered_projects ?? [],
    ongoing_projects: builder.ongoing_projects ?? [],
    delayed_projects_count: b.delayed_projects_count ?? null,
    average_delay_months: b.average_delay_months ?? null,
    delivery_score: b.delivery_score ?? null,

    // Quality
    construction_quality_score: b.construction_quality_score ?? null,
    after_sales_score: b.after_sales_score ?? null,
    buyer_satisfaction_score: b.buyer_satisfaction_score ?? null,

    // Compliance
    rera_compliance_score: b.rera_compliance_score ?? null,
    litigation_count: b.litigation_count ?? null,
    insolvency_history: b.insolvency_history ?? false,
    legal_flag: b.legal_flag ?? null,

    // Market Position
    luxury_specialization: b.luxury_specialization ?? false,
    township_specialization: b.township_specialization ?? false,
    affordable_specialization: b.affordable_specialization ?? false,
    average_project_size: b.average_project_size ?? null,

    // Recognition
    awards: builder.awards ?? [],
    awards_count: builder.awards_count ?? null,
    certifications: b.certifications ?? [],
    credai_member: builder.credai_member,
    iso_certified: b.iso_certified ?? false,

    // Confidence
    verification_level: b.verification_level ?? 'unverified',
    last_verified_at: b.last_verified_at ?? null,
    data_source: b.data_source ?? null,
    intelligence_completeness: b.intelligence_completeness ?? null,

    // Live project list
    projects_in_db: builder.projects.map((p) => ({
      name: p.name,
      sector: p.sector,
      status: String(p.status),
      rera_number: p.rera_number,
      possession_claimed_by_builder: p.possession_label ?? null,
    })),

    data_gaps: dataGaps,
    note: 'Use ONLY the structured fields above. If legal_flag is non-null, it MUST be disclosed immediately — it represents a verified legal risk. Do not recommend this builder for new purchases if legal_flag is set. If a score is null, state "not yet verified" — do not infer scores from training memory. delivered_units is a total volume count, NOT a proxy for on-time delivery.',
  }
}
