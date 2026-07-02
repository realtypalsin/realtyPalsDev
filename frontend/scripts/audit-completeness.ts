// scripts/audit-completeness.ts
// Read-only audit. Does not modify any data.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const projects = await prisma.project.findMany({
    orderBy: { name: 'asc' },
    include: {
      builder: { select: { name: true, slug: true, legal_flag: true } },
      unit_types: { select: { id: true, bhk: true, price_min_cr: true, carpet_area_sqft: true } },
      images: { select: { id: true, type: true } },
      amenities: { select: { id: true } },
      connectivity: { select: { id: true } },
      dna: { select: { id: true } },
      decision_profile: { select: { id: true, status: true } },
      persona_profile: { select: { id: true } },
      recommendation_profile: { select: { id: true, status: true, tier: true } },
      competitors: { select: { id: true, verdict: true } },
    },
  })

  // ProjectDocument has no @relation on Project model — query separately
  const allDocs = await prisma.projectDocument.findMany({
    select: { project_id: true, doc_type: true },
  })
  const docsByProject = new Map<string, { doc_type: string }[]>()
  allDocs.forEach(d => {
    const arr = docsByProject.get(d.project_id) ?? []
    arr.push({ doc_type: d.doc_type })
    docsByProject.set(d.project_id, arr)
  })

  // ── Per-project analysis ──────────────────────────────────────────────

  type ProjectRow = {
    name: string
    slug: string
    status: string
    overviewComplete: boolean
    unitsComplete: boolean
    unitCount: number
    unitsWithPrice: number
    imageCount: number
    floorPlanCount: number
    brochureCount: number
    amenityCount: number
    connectivityCount: number
    builderAssigned: boolean
    dnaProfile: boolean
    decisionProfile: boolean
    personaProfile: boolean
    recommendationProfile: boolean
    recommendationTier: string | null
    competitorCount: number
    competitorsWithVerdict: number
    overviewScore: number
    unitScore: number
    imageScore: number
    floorPlanScore: number
    brochureScore: number
    amenityScore: number
    connectivityScore: number
    builderScore: number
    intelligenceScore: number
    competitorScore: number
    totalScore: number
    totalMax: number
    pct: number
    canPublish: boolean
    blockers: string[]
  }

  const rows: ProjectRow[] = projects.map(p => {
    // Overview: name, status, possession_date, rera_number, description, hero_image_url
    const overviewFields = [
      !!p.name,
      !!p.status,
      !!p.possession_date,
      !!p.rera_number,
      !!p.description,
      !!p.hero_image_url,
    ]
    const overviewComplete = overviewFields.every(Boolean)
    const overviewMissing = ['name','status','possession_date','rera_number','description','hero_image_url']
      .filter((_, i) => !overviewFields[i])

    // Units
    const unitsWithPrice = p.unit_types.filter(u => u.price_min_cr !== null && u.carpet_area_sqft !== null).length
    const unitsComplete = p.unit_types.length > 0 && unitsWithPrice > 0

    // Images (non-floor-plan)
    const galleryImages = p.images.filter(i => i.type !== 'floor_plan')
    const floorPlanImages = p.images.filter(i => i.type === 'floor_plan')
    const imageTypes = new Set(galleryImages.map(i => i.type))
    const imagesComplete = galleryImages.length >= 4 && imageTypes.size >= 2

    // Brochures
    const projectDocs = docsByProject.get(p.id) ?? []
    const brochures = projectDocs.filter(d => d.doc_type === 'brochure')

    // Amenities
    // Connectivity

    // Intelligence
    const profileCount = [p.dna, p.decision_profile, p.persona_profile, p.recommendation_profile]
      .filter(Boolean).length

    // Scoring (88 max)
    const overviewScore = overviewComplete ? 10 : overviewMissing.length <= 2 ? 5 : 0
    const unitScore = p.unit_types.length === 0 ? 0 : unitsWithPrice > 0 ? 12 : 6
    const imageScore = imagesComplete ? 8 : galleryImages.length >= 1 ? 4 : 0
    const floorPlanScore = floorPlanImages.length >= 1 ? 8 : 0
    const brochureScore = brochures.length >= 1 ? 8 : 0
    const amenityScore = p.amenities.length >= 5 ? 6 : p.amenities.length >= 1 ? 3 : 0
    const connectivityScore = p.connectivity.length >= 3 ? 6 : p.connectivity.length >= 1 ? 3 : 0
    const builderScore = p.builder && p.builder.name ? 8 : 0
    const intelBaseScore = profileCount * 2  // 2 pts each, max 8
    const intelBonusScore = (p.decision_profile?.status === 'IN_REVIEW' || p.decision_profile?.status === 'PUBLISHED' ||
                             p.recommendation_profile?.status === 'IN_REVIEW' || p.recommendation_profile?.status === 'PUBLISHED') ? 6 : 0
    const intelligenceScore = intelBaseScore + intelBonusScore
    const competitorsWithVerdict = p.competitors.filter(c => c.verdict).length
    const competitorScore = competitorsWithVerdict >= 2 ? 8 : p.competitors.length >= 1 ? 4 : 0

    const totalScore = overviewScore + unitScore + imageScore + floorPlanScore + brochureScore +
                       amenityScore + connectivityScore + builderScore + intelligenceScore + competitorScore
    const totalMax = 88
    const pct = Math.round((totalScore / totalMax) * 100)

    // Publish blockers (required sections must pass)
    const blockers: string[] = []
    if (!overviewComplete) blockers.push(`Overview (missing: ${overviewMissing.join(', ')})`)
    if (p.unit_types.length === 0) blockers.push('Units (none)')
    else if (unitsWithPrice === 0) blockers.push('Units (no price set)')
    if (!p.builder) blockers.push('Builder (not assigned)')
    if (pct < 60) blockers.push(`Score below 60% (${pct}%)`)

    const canPublish = blockers.length === 0

    return {
      name: p.name,
      slug: p.slug,
      status: p.status,
      overviewComplete,
      unitsComplete,
      unitCount: p.unit_types.length,
      unitsWithPrice,
      imageCount: galleryImages.length,
      floorPlanCount: floorPlanImages.length,
      brochureCount: brochures.length,
      amenityCount: p.amenities.length,
      connectivityCount: p.connectivity.length,
      builderAssigned: !!p.builder,
      dnaProfile: !!p.dna,
      decisionProfile: !!p.decision_profile,
      personaProfile: !!p.persona_profile,
      recommendationProfile: !!p.recommendation_profile,
      recommendationTier: p.recommendation_profile?.tier ?? null,
      competitorCount: p.competitors.length,
      competitorsWithVerdict,
      overviewScore, unitScore, imageScore, floorPlanScore, brochureScore,
      amenityScore, connectivityScore, builderScore, intelligenceScore, competitorScore,
      totalScore, totalMax, pct, canPublish, blockers,
    }
  })

  // ── Output: full table ────────────────────────────────────────────────

  console.log('\n════════════════════════════════════════════════════════════════════')
  console.log('  REALTYPALS PROJECT COMPLETENESS AUDIT')
  console.log(`  ${projects.length} projects · ${new Date().toISOString().split('T')[0]}`)
  console.log('════════════════════════════════════════════════════════════════════\n')

  // Header
  const H = (s: string, w: number) => s.substring(0, w).padEnd(w)
  const N = (n: number | string, w: number) => String(n).padStart(w)

  console.log(
    H('Project', 32) +
    H('Status', 18) +
    N('Ov', 3) + N('Un', 3) + N('Im', 3) + N('FP', 3) + N('Br', 3) +
    N('Am', 3) + N('Cn', 3) + N('Bl', 3) +
    N('DNA', 4) + N('Dec', 4) + N('Per', 4) + N('Rec', 4) +
    N('Cp', 3) +
    N('%', 5) + '  ' + 'Publish'
  )
  console.log('─'.repeat(110))

  const yn = (b: boolean) => b ? ' Y' : ' N'
  const n0 = (n: number) => String(n).padStart(3)

  rows.forEach(r => {
    const pub = r.canPublish ? '✓ READY' : `✗ BLOCKED (${r.blockers.length} issue${r.blockers.length > 1 ? 's' : ''})`
    console.log(
      H(r.name, 32) +
      H(r.status, 18) +
      yn(r.overviewComplete) + yn(r.unitsComplete) +
      n0(r.imageCount) + n0(r.floorPlanCount) + n0(r.brochureCount) +
      n0(r.amenityCount) + n0(r.connectivityCount) +
      yn(r.builderAssigned) +
      yn(r.dnaProfile) + yn(r.decisionProfile) + yn(r.personaProfile) + yn(r.recommendationProfile) +
      n0(r.competitorCount) +
      N(`${r.pct}%`, 5) + '  ' + pub
    )
  })

  console.log('─'.repeat(110))
  console.log('  Ov=Overview  Un=Units  Im=Gallery Images  FP=Floor Plans  Br=Brochures')
  console.log('  Am=Amenities  Cn=Connectivity  Bl=Builder  DNA/Dec/Per/Rec=Intelligence profiles  Cp=Competitors')

  // ── Coverage percentages ──────────────────────────────────────────────

  const total = rows.length
  const pct = (n: number) => `${Math.round((n / total) * 100)}%  (${n}/${total})`

  console.log('\n════════════════════════════════════════════════════════════════════')
  console.log('  SECTION COVERAGE')
  console.log('════════════════════════════════════════════════════════════════════')
  console.log(`  Overview Complete      ${pct(rows.filter(r => r.overviewComplete).length)}`)
  console.log(`  Units (any)            ${pct(rows.filter(r => r.unitCount > 0).length)}`)
  console.log(`  Units (priced)         ${pct(rows.filter(r => r.unitsWithPrice > 0).length)}`)
  console.log(`  Gallery Images (≥4)    ${pct(rows.filter(r => r.imageCount >= 4).length)}`)
  console.log(`  Floor Plans (any)      ${pct(rows.filter(r => r.floorPlanCount > 0).length)}`)
  console.log(`  Brochures (any)        ${pct(rows.filter(r => r.brochureCount > 0).length)}`)
  console.log(`  Amenities (≥5)         ${pct(rows.filter(r => r.amenityCount >= 5).length)}`)
  console.log(`  Connectivity (≥3)      ${pct(rows.filter(r => r.connectivityCount >= 3).length)}`)
  console.log(`  Builder Assigned       ${pct(rows.filter(r => r.builderAssigned).length)}`)
  console.log(`  DNA Profile            ${pct(rows.filter(r => r.dnaProfile).length)}`)
  console.log(`  Decision Profile       ${pct(rows.filter(r => r.decisionProfile).length)}`)
  console.log(`  Persona Profile        ${pct(rows.filter(r => r.personaProfile).length)}`)
  console.log(`  Recommendation Profile ${pct(rows.filter(r => r.recommendationProfile).length)}`)
  console.log(`  Competitors (≥2)       ${pct(rows.filter(r => r.competitorCount >= 2).length)}`)

  // ── Score distribution ────────────────────────────────────────────────

  console.log('\n════════════════════════════════════════════════════════════════════')
  console.log('  SCORE DISTRIBUTION')
  console.log('════════════════════════════════════════════════════════════════════')
  const bands = [
    { label: '≥ 80%  (publish-ready)', min: 80 },
    { label: '60–79% (near threshold)', min: 60, max: 80 },
    { label: '40–59% (needs work)',     min: 40, max: 60 },
    { label: '< 40%  (incomplete)',     min: 0,  max: 40 },
  ]
  bands.forEach(b => {
    const count = rows.filter(r => r.pct >= b.min && (b.max === undefined || r.pct < b.max)).length
    const bar = '█'.repeat(count) + '░'.repeat(Math.max(0, total - count))
    console.log(`  ${b.label.padEnd(30)} ${String(count).padStart(3)} ${bar}`)
  })

  // ── Ready / Blocked ───────────────────────────────────────────────────

  const ready = rows.filter(r => r.canPublish)
  const blocked = rows.filter(r => !r.canPublish)

  console.log('\n════════════════════════════════════════════════════════════════════')
  console.log(`  READY FOR PUBLICATION  (${ready.length} projects)`)
  console.log('════════════════════════════════════════════════════════════════════')
  if (ready.length === 0) {
    console.log('  None.')
  } else {
    ready.forEach(r => console.log(`  ✓ ${r.name.padEnd(32)} ${r.pct}%  tier: ${r.recommendationTier ?? '—'}`))
  }

  console.log('\n════════════════════════════════════════════════════════════════════')
  console.log(`  BLOCKED FROM PUBLICATION  (${blocked.length} projects)`)
  console.log('════════════════════════════════════════════════════════════════════')
  blocked.forEach(r => {
    console.log(`  ✗ ${r.name}`)
    r.blockers.forEach(b => console.log(`      → ${b}`))
  })

  // ── Top missing categories ────────────────────────────────────────────

  console.log('\n════════════════════════════════════════════════════════════════════')
  console.log('  TOP MISSING DATA CATEGORIES')
  console.log('════════════════════════════════════════════════════════════════════')
  const missing = [
    { name: 'Floor Plans',            count: rows.filter(r => r.floorPlanCount === 0).length },
    { name: 'Brochures',              count: rows.filter(r => r.brochureCount === 0).length },
    { name: 'Competitors',            count: rows.filter(r => r.competitorCount === 0).length },
    { name: 'Recommendation Profile', count: rows.filter(r => !r.recommendationProfile).length },
    { name: 'Decision Profile',       count: rows.filter(r => !r.decisionProfile).length },
    { name: 'Persona Profile',        count: rows.filter(r => !r.personaProfile).length },
    { name: 'DNA Profile',            count: rows.filter(r => !r.dnaProfile).length },
    { name: 'Gallery Images (< 4)',   count: rows.filter(r => r.imageCount < 4).length },
    { name: 'Units Missing Price',    count: rows.filter(r => r.unitCount > 0 && r.unitsWithPrice === 0).length },
    { name: 'No Units At All',        count: rows.filter(r => r.unitCount === 0).length },
    { name: 'Amenities (< 5)',        count: rows.filter(r => r.amenityCount < 5).length },
    { name: 'Connectivity (< 3)',     count: rows.filter(r => r.connectivityCount < 3).length },
    { name: 'Overview Incomplete',    count: rows.filter(r => !r.overviewComplete).length },
  ].sort((a, b) => b.count - a.count)

  missing.forEach(m => {
    const bar = '█'.repeat(m.count)
    const pctStr = `${Math.round((m.count / total) * 100)}%`
    console.log(`  ${m.name.padEnd(28)} ${String(m.count).padStart(3)} projects  ${pctStr.padStart(5)}  ${bar}`)
  })

  // ── Raw data for assumptions review ──────────────────────────────────

  console.log('\n════════════════════════════════════════════════════════════════════')
  console.log('  RAW COUNTS (for workspace design assumptions review)')
  console.log('════════════════════════════════════════════════════════════════════')
  const avgImages = rows.reduce((s, r) => s + r.imageCount, 0) / total
  const avgAmenities = rows.reduce((s, r) => s + r.amenityCount, 0) / total
  const avgConn = rows.reduce((s, r) => s + r.connectivityCount, 0) / total
  const avgUnits = rows.reduce((s, r) => s + r.unitCount, 0) / total
  const avgCompetitors = rows.reduce((s, r) => s + r.competitorCount, 0) / total
  console.log(`  Total projects:          ${total}`)
  console.log(`  Avg gallery images:      ${avgImages.toFixed(1)}`)
  console.log(`  Avg amenities:           ${avgAmenities.toFixed(1)}`)
  console.log(`  Avg connectivity pts:    ${avgConn.toFixed(1)}`)
  console.log(`  Avg unit types:          ${avgUnits.toFixed(1)}`)
  console.log(`  Avg competitors:         ${avgCompetitors.toFixed(1)}`)
  console.log(`  Projects with 0 images:  ${rows.filter(r => r.imageCount === 0 && r.floorPlanCount === 0).length}`)
  console.log(`  Projects with hero only: ${rows.filter(r => r.imageCount === 0 && !!rows.find(x => x.slug === r.slug)).length}`)

  // Avg completeness score
  const avgPct = rows.reduce((s, r) => s + r.pct, 0) / total
  console.log(`  Avg completeness score:  ${avgPct.toFixed(1)}%`)
  console.log(`  Max score achieved:      ${Math.max(...rows.map(r => r.pct))}%`)
  console.log(`  Min score achieved:      ${Math.min(...rows.map(r => r.pct))}%`)

  console.log('\n')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
