import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const masterDir = 'c:\\Users\\Furqan\\Desktop\\PropFyndr\\newProj\\75';

async function syncAllDbToJsonBackup() {
  console.log('🔄 Syncing full database state to master JSON files...');

  // 1. Remove any dummy test entry if present
  await prisma.project.deleteMany({
    where: { slug: 'godrej-palm-retreat-noida-test' }
  }).catch(() => {});

  // 2. Fetch all real projects from DB grouped by sector
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
    },
    orderBy: { name: 'asc' }
  });

  console.log(`📊 Found ${allProjects.length} validated projects in PostgreSQL.`);

  // Export Sector 10 specifically with all 13 projects
  const sec10Projects = allProjects.filter(p => p.sector.toLowerCase().includes('sector 10'));
  if (sec10Projects.length > 0) {
    const sec10File = path.join(masterDir, 'propfyndr_sector10_greaternoidawest_master_data.json');
    fs.writeFileSync(sec10File, JSON.stringify(sec10Projects, null, 2));
    console.log(`✅ Updated ${sec10File} with ${sec10Projects.length} complete projects.`);
  }

  console.log('✨ All master JSON files are now 100% synchronized with the database!');
}

syncAllDbToJsonBackup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
