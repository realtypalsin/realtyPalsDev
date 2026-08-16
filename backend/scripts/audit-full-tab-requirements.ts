import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TabAuditReport {
  projectId: string;
  projectName: string;
  sector: string;
  city: string;
  missingOverview: string[];
  missingIntelligence: string[];
  missingResidences: string[];
  missingPricing: string[];
  missingLocation: string[];
  missingBuilder: string[];
}

async function auditAllTabs() {
  console.log('========================================================================');
  console.log('🔍 EXHAUSTIVE 6-TAB DATA COMPLETENESS AUDIT ACROSS ALL DB PROJECTS');
  console.log('========================================================================\n');

  const projects = await prisma.project.findMany({
    include: {
      builder: true,
      unit_types: true,
      amenities: true,
      connectivity: true,
      spec_items: true,
      images: true,
      construction_milestones: true,
      decision_profile: true,
      persona_profile: true,
      recommendation_profile: true,
      dna: true,
      competitors: true,
      price_history: true,
      payment_plans: true,
      cost_sheet: true,
      channel_partners: true,
    },
  });

  console.log(`📊 Analyzing ${projects.length} projects in PostgreSQL...\n`);

  const reports: TabAuditReport[] = [];
  let fullyCompleteCount = 0;

  const tabGaps = {
    overview: 0,
    intelligence: 0,
    residences: 0,
    pricing: 0,
    location: 0,
    builder: 0,
  };

  const fieldGapCounts: Record<string, number> = {};

  function recordGap(category: string, field: string) {
    fieldGapCounts[`[${category}] ${field}`] = (fieldGapCounts[`[${category}] ${field}`] || 0) + 1;
  }

  for (const p of projects) {
    const missingOverview: string[] = [];
    const missingIntelligence: string[] = [];
    const missingResidences: string[] = [];
    const missingPricing: string[] = [];
    const missingLocation: string[] = [];
    const missingBuilder: string[] = [];

    // ── 1. Overview Tab Audit ──
    if (!p.long_description || p.long_description.length < 30) {
      missingOverview.push('long_description');
      recordGap('Overview', 'long_description');
    }
    if (!p.rera_number) {
      missingOverview.push('rera_number');
      recordGap('Overview', 'rera_number');
    }
    if (!p.status) {
      missingOverview.push('status');
      recordGap('Overview', 'status');
    }
    if (!p.land_area_acres && !p.total_towers) {
      missingOverview.push('land_area/total_towers');
      recordGap('Overview', 'land_area/total_towers');
    }
    if (!p.amenities || p.amenities.length === 0) {
      missingOverview.push('amenities (empty)');
      recordGap('Overview', 'amenities (empty)');
    }
    if (!p.images || p.images.length === 0) {
      missingOverview.push('images (empty)');
      recordGap('Overview', 'images (empty)');
    }
    if (!p.spec_items || p.spec_items.length === 0) {
      missingOverview.push('spec_items (empty)');
      recordGap('Overview', 'spec_items (empty)');
    }
    if (!p.construction_milestones || p.construction_milestones.length === 0) {
      missingOverview.push('construction_milestones (empty)');
      recordGap('Overview', 'construction_milestones (empty)');
    }

    // ── 2. Intelligence / Analysis Tab Audit ──
    if (!p.decision_profile?.decision_thesis) {
      missingIntelligence.push('decision_thesis');
      recordGap('Intelligence', 'decision_thesis');
    }
    if (!p.decision_profile?.why_buy || (p.decision_profile.why_buy as any[]).length === 0) {
      missingIntelligence.push('why_buy');
      recordGap('Intelligence', 'why_buy');
    }
    if (!p.persona_profile?.primary_persona) {
      missingIntelligence.push('primary_persona');
      recordGap('Intelligence', 'primary_persona');
    }
    if (!p.recommendation_profile?.tier) {
      missingIntelligence.push('recommendation_tier');
      recordGap('Intelligence', 'recommendation_tier');
    }
    if (!p.dna) {
      missingIntelligence.push('dna');
      recordGap('Intelligence', 'dna');
    }

    // ── 3. Residences / Floor Plans Tab Audit ──
    if (!p.unit_types || p.unit_types.length === 0) {
      missingResidences.push('unit_types (empty)');
      recordGap('Residences', 'unit_types (empty)');
    } else {
      const hasMissingArea = p.unit_types.some(u => !u.super_area_sqft && !u.carpet_area_sqft);
      if (hasMissingArea) {
        missingResidences.push('unit_types (missing super/carpet area)');
        recordGap('Residences', 'unit_types (missing area)');
      }
    }

    // ── 4. Pricing & Investment Tab Audit ──
    if (!p.cost_sheet && (!p.unit_types || p.unit_types.length === 0)) {
      missingPricing.push('cost_sheet');
      recordGap('Pricing', 'cost_sheet');
    }
    if (!p.price_history || p.price_history.length === 0) {
      missingPricing.push('price_history (empty)');
      recordGap('Pricing', 'price_history (empty)');
    }
    if (p.appreciation_potential_5yr == null) {
      missingPricing.push('appreciation_potential_5yr');
      recordGap('Pricing', 'appreciation_potential_5yr');
    }
    if (p.rental_yield_annual_percent == null) {
      missingPricing.push('rental_yield_annual_percent');
      recordGap('Pricing', 'rental_yield_annual_percent');
    }

    // ── 5. Location Tab Audit ──
    if (p.lat == null || p.lng == null) {
      missingLocation.push('lat/lng coordinates');
      recordGap('Location', 'lat/lng');
    }
    if (!p.connectivity || p.connectivity.length === 0) {
      missingLocation.push('connectivity nodes (empty)');
      recordGap('Location', 'connectivity nodes (empty)');
    }
    if (p.green_cover_percent == null) {
      missingLocation.push('green_cover_percent');
      recordGap('Location', 'green_cover_percent');
    }
    if (p.walkability_score == null) {
      missingLocation.push('walkability_score');
      recordGap('Location', 'walkability_score');
    }

    // ── 6. Builder Tab Audit ──
    if (!p.builder) {
      missingBuilder.push('builder (missing link)');
      recordGap('Builder', 'builder link');
    } else {
      if (p.builder.delivery_score == null) {
        missingBuilder.push('builder.delivery_score');
        recordGap('Builder', 'builder.delivery_score');
      }
      if (p.builder.total_projects_count == null) {
        missingBuilder.push('builder.total_projects_count');
        recordGap('Builder', 'builder.total_projects_count');
      }
    }

    if (
      missingOverview.length > 0 ||
      missingIntelligence.length > 0 ||
      missingResidences.length > 0 ||
      missingPricing.length > 0 ||
      missingLocation.length > 0 ||
      missingBuilder.length > 0
    ) {
      if (missingOverview.length > 0) tabGaps.overview++;
      if (missingIntelligence.length > 0) tabGaps.intelligence++;
      if (missingResidences.length > 0) tabGaps.residences++;
      if (missingPricing.length > 0) tabGaps.pricing++;
      if (missingLocation.length > 0) tabGaps.location++;
      if (missingBuilder.length > 0) tabGaps.builder++;

      reports.push({
        projectId: p.id,
        projectName: p.name,
        sector: p.sector,
        city: p.city,
        missingOverview,
        missingIntelligence,
        missingResidences,
        missingPricing,
        missingLocation,
        missingBuilder,
      });
    } else {
      fullyCompleteCount++;
    }
  }

  console.log('------------------------------------------------------------------------');
  console.log(`📈 AUDIT SUMMARY ACROSS ALL ${projects.length} PROJECTS:`);
  console.log(`  🌟 100% Fully Complete Projects (Zero Gaps): ${fullyCompleteCount} / ${projects.length}`);
  console.log(`  ⚠️  Projects with Partial Data Gaps:         ${reports.length} / ${projects.length}`);
  console.log('------------------------------------------------------------------------\n');

  console.log('📊 TAB-BY-TAB HEALTH:');
  console.log(`  1. Overview Tab Gaps:     ${tabGaps.overview} / ${projects.length} projects`);
  console.log(`  2. Intelligence Tab Gaps: ${tabGaps.intelligence} / ${projects.length} projects`);
  console.log(`  3. Residences Tab Gaps:   ${tabGaps.residences} / ${projects.length} projects`);
  console.log(`  4. Pricing Tab Gaps:      ${tabGaps.pricing} / ${projects.length} projects`);
  console.log(`  5. Location Tab Gaps:     ${tabGaps.location} / ${projects.length} projects`);
  console.log(`  6. Builder Tab Gaps:      ${tabGaps.builder} / ${projects.length} projects\n`);

  console.log('📋 DETAILED FIELD-LEVEL GAP SUMMARY:');
  for (const [gapField, count] of Object.entries(fieldGapCounts)) {
    console.log(`  - ${gapField}: missing in ${count} projects`);
  }

  if (reports.length > 0) {
    console.log('\n🔍 SAMPLE OF PROJECTS WITH GAPS (First 10):');
    reports.slice(0, 10).forEach((r, idx) => {
      console.log(`\n[${idx + 1}] ${r.projectName} (${r.sector}, ${r.city})`);
      if (r.missingOverview.length) console.log(`   - Overview: ${r.missingOverview.join(', ')}`);
      if (r.missingIntelligence.length) console.log(`   - Intelligence: ${r.missingIntelligence.join(', ')}`);
      if (r.missingResidences.length) console.log(`   - Residences: ${r.missingResidences.join(', ')}`);
      if (r.missingPricing.length) console.log(`   - Pricing: ${r.missingPricing.join(', ')}`);
      if (r.missingLocation.length) console.log(`   - Location: ${r.missingLocation.join(', ')}`);
      if (r.missingBuilder.length) console.log(`   - Builder: ${r.missingBuilder.join(', ')}`);
    });
  } else {
    console.log('\n🎉 ALL 224 PROJECTS ARE 100% POPULATED ACROSS ALL 6 TABS WITH NO MISSING FIELDS!');
  }
}

auditAllTabs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
