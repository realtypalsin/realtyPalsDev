import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function auditFullDbGaps() {
  console.log('===============================================================');
  console.log('🔍 FULL DATABASE COMPREHENSIVE GAPS AUDIT');
  console.log('===============================================================\n');

  const allProjects = await prisma.project.findMany({
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

  let totalProjects = allProjects.length;
  let missingSpecs = 0;
  let lessThan15Amenities = 0;
  let lessThan10Connectivity = 0;
  let missingPriceHistory = 0;
  let missingChannelPartners = 0;
  let missingCostSheet = 0;

  const gapsReport: any[] = [];

  for (const p of allProjects) {
    const gaps: string[] = [];

    if (!p.spec_items || p.spec_items.length < 3) {
      gaps.push(`Construction Specs (currently ${p.spec_items?.length || 0})`);
      missingSpecs++;
    }
    if (!p.amenities || p.amenities.length < 15) {
      gaps.push(`Amenities < 15 (currently ${p.amenities?.length || 0})`);
      lessThan15Amenities++;
    }
    if (!p.connectivity || p.connectivity.length < 10) {
      gaps.push(`Connectivity < 10 (currently ${p.connectivity?.length || 0})`);
      lessThan10Connectivity++;
    }
    if (!p.price_history || p.price_history.length < 4) {
      gaps.push(`Price History < 4 (currently ${p.price_history?.length || 0})`);
      missingPriceHistory++;
    }
    if (!p.channel_partners || p.channel_partners.length === 0) {
      gaps.push(`Channel Partners (currently 0)`);
      missingChannelPartners++;
    }
    if (!p.cost_sheet) {
      gaps.push(`Cost Sheet`);
      missingCostSheet++;
    }

    if (gaps.length > 0) {
      gapsReport.push({ name: p.name, slug: p.slug, sector: p.sector, gaps });
    }
  }

  console.log(`📊 TOTAL DB PROJECTS: ${totalProjects}`);
  console.log(`---------------------------------------------------------------`);
  console.log(`❌ Projects missing Construction Specs: ${missingSpecs}/${totalProjects}`);
  console.log(`⚠️ Projects with Amenities < 15: ${lessThan15Amenities}/${totalProjects}`);
  console.log(`⚠️ Projects with Connectivity < 10: ${lessThan10Connectivity}/${totalProjects}`);
  console.log(`⚠️ Projects with Price History < 4 Quarters: ${missingPriceHistory}/${totalProjects}`);
  console.log(`⚠️ Projects with Channel Partners = 0: ${missingChannelPartners}/${totalProjects}`);
  console.log(`⚠️ Projects missing Cost Sheet: ${missingCostSheet}/${totalProjects}`);
  console.log(`===============================================================\n`);
}

auditFullDbGaps()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
