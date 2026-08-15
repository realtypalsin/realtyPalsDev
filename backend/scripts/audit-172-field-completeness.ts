import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function audit172Completeness() {
  console.log('===============================================================');
  console.log('🔍 DEEP COMPLETENESS AUDIT FOR ALL 172 DB PROJECTS');
  console.log('===============================================================\n');

  const projects = await prisma.project.findMany({
    include: {
      builder: true,
      unit_types: true,
      amenities: true,
      connectivity: true,
      price_history: true,
      dna: true,
      decision_profile: true,
      persona_profile: true,
      recommendation_profile: true,
      competitors: true,
      construction_milestones: true,
      construction_updates: true,
      lifecycle_updates: true,
      cost_sheet: true,
      payment_plans: true,
      images: true,
      spec_items: true,
      channel_partners: true,
    }
  });

  console.log(`📊 TOTAL DB PROJECTS: ${projects.length}`);

  let missingPersona = 0;
  let missingRecProfile = 0;
  let missingMilestones = 0;
  let missingImages = 0;
  let missingCompetitors = 0;
  let missingLongDesc = 0;

  const incompleteList: any[] = [];

  for (const p of projects) {
    const missing: string[] = [];

    if (!p.persona_profile) { missingPersona++; missing.push('persona_profile'); }
    if (!p.recommendation_profile) { missingRecProfile++; missing.push('recommendation_profile'); }
    if (!p.construction_milestones || p.construction_milestones.length === 0) { missingMilestones++; missing.push('construction_milestones'); }
    if (!p.images || p.images.length === 0) { missingImages++; missing.push('images'); }
    if (!p.competitors || p.competitors.length === 0) { missingCompetitors++; missing.push('competitors'); }
    if (!p.long_description || p.long_description.length < 50) { missingLongDesc++; missing.push('long_description'); }

    if (missing.length > 0) {
      incompleteList.push({ name: p.name, slug: p.slug, sector: p.sector, missing });
    }
  }

  console.log(`---------------------------------------------------------------`);
  console.log(`❌ Projects missing Persona Profile: ${missingPersona}/${projects.length}`);
  console.log(`❌ Projects missing Recommendation Profile: ${missingRecProfile}/${projects.length}`);
  console.log(`❌ Projects missing Construction Milestones: ${missingMilestones}/${projects.length}`);
  console.log(`❌ Projects missing Images Gallery: ${missingImages}/${projects.length}`);
  console.log(`❌ Projects missing Competitor Comparisons: ${missingCompetitors}/${projects.length}`);
  console.log(`❌ Projects missing Detailed Long Description: ${missingLongDesc}/${projects.length}`);
  console.log(`===============================================================\n`);
}

audit172Completeness()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
