import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Scanning DB for Hardcoded/Empty Fields (Specific Sectors) ---');

  // Normalize locations
  const allowedCities = ['noida', 'greater noida', 'greater noida west', 'noida extension', 'gaur city'];
  
  const allProjects = await prisma.project.findMany({
    include: {
      builder: true,
      unit_types: true,
      decision_profile: true,
      competitors: true,
    }
  });

  const targetProjects = allProjects.filter(p => {
    const city = (p.city || '').toLowerCase();
    const sector = (p.sector || '').toLowerCase();
    
    // Check if city matches any allowed variations
    const isTargetCity = allowedCities.some(c => city.includes(c));
    if (!isTargetCity) return false;

    // Noida sectors
    if (city.includes('noida') && !city.includes('greater') && !city.includes('extension') && !city.includes('gaur')) {
      if (['75', '76', '77', '78', '79', 'sector 75', 'sector 76', 'sector 77', 'sector 78', 'sector 79'].includes(sector)) {
        return true;
      }
    }
    
    // Greater Noida sectors
    if (city.includes('greater') || city.includes('extension') || city.includes('gaur')) {
      if (['10', '12', 'sector 10', 'sector 12'].includes(sector)) {
        return true;
      }
    }

    return false;
  });

  const reportData: any = [];

  for (const p of targetProjects) {
    const missing = {
      project_name: p.name,
      slug: p.slug,
      sector: p.sector,
      city: p.city,
      missing_project_fields: [] as string[],
      missing_builder_fields: [] as string[],
      missing_decision_fields: [] as string[],
      unit_types_missing_fields: [] as any[],
      has_competitors: p.competitors.length > 0
    };

    if (!p.description) missing.missing_project_fields.push('description');
    if (!p.hero_image_url) missing.missing_project_fields.push('hero_image_url');
    if (!p.marketing_claims || p.marketing_claims.length === 0) missing.missing_project_fields.push('marketing_claims');

    if (p.builder) {
      if (!p.builder.company_overview) missing.missing_builder_fields.push('company_overview');
      if (!p.builder.logo_url) missing.missing_builder_fields.push('logo_url');
      if (p.builder.delivered_units == null) missing.missing_builder_fields.push('delivered_units');
      if (!p.builder.founded_year) missing.missing_builder_fields.push('founded_year');
    } else {
      missing.missing_builder_fields.push('NO_BUILDER_LINKED');
    }

    if (p.decision_profile) {
      if (!p.decision_profile.decision_thesis) missing.missing_decision_fields.push('decision_thesis');
      if (!p.decision_profile.why_buy) missing.missing_decision_fields.push('why_buy');
      if (!p.decision_profile.intelligence_data) missing.missing_decision_fields.push('intelligence_data');
    } else {
      missing.missing_decision_fields.push('NO_DECISION_PROFILE');
    }

    for (const u of p.unit_types) {
      const uMissing = [];
      if (!u.bhk) uMissing.push('bhk');
      if (!u.carpet_area_sqft && !u.super_area_sqft) uMissing.push('area_sqft');
      if (u.price_min_cr == null) uMissing.push('price_min_cr');
      
      if (uMissing.length > 0) {
        missing.unit_types_missing_fields.push({ id: u.id, name: u.name, missing: uMissing });
      }
    }

    reportData.push(missing);
  }

  const outPath = `${process.cwd()}/missing_fields_report_noida.json`;
  writeFileSync(outPath, JSON.stringify(reportData, null, 2));
  console.log(`\n✅ Analyzed ${targetProjects.length} projects. Report written to ${outPath}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
