import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const masterDir = 'c:\\Users\\Furqan\\Desktop\\RealtyPals\\newProj\\75';

async function findExtraDbProjects() {
  const jsonFiles = fs.readdirSync(masterDir).filter(f => f.endsWith('.json'));
  const jsonSlugs = new Set<string>();
  const jsonNames = new Set<string>();

  for (const f of jsonFiles) {
    const list = JSON.parse(fs.readFileSync(path.join(masterDir, f), 'utf8'));
    for (const item of list) {
      const p = item.project || item;
      if (p.slug) jsonSlugs.add(p.slug.toLowerCase().trim());
      if (p.name) jsonNames.add(p.name.toLowerCase().trim());
    }
  }

  const allDbProjects = await prisma.project.findMany({
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
    }
  });

  const extras: any[] = [];
  for (const p of allDbProjects) {
    const s = p.slug.toLowerCase().trim();
    const n = p.name.toLowerCase().trim();
    if (!jsonSlugs.has(s) && !jsonNames.has(n)) {
      extras.push(p);
    }
  }

  console.log(`\n🔍 Found ${extras.length} DB projects not present in newProj/75 JSON files:`);
  for (const e of extras) {
    console.log(`- ${e.name} (${e.slug}) | Sector: ${e.sector} | City: ${e.city} | Status: ${e.status}`);
  }

  // Save the full project details for these extras so we can export them into master JSON
  fs.writeFileSync('c:\\Users\\Furqan\\Desktop\\RealtyPals\\scratch\\extra_db_projects.json', JSON.stringify(extras, null, 2));
}

findExtraDbProjects()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
