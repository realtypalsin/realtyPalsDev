import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const totalProjects = await prisma.project.count();
  const projectsWithSpecs = await prisma.project.count({
    where: { spec_items: { some: {} } }
  });
  const totalSpecs = await prisma.projectSpecItem.count();
  
  console.log(`=== DATABASE SPEC INVENTORY ===`);
  console.log(`Total Projects in DB: ${totalProjects}`);
  console.log(`Projects with Spec Items: ${projectsWithSpecs}`);
  console.log(`Total Spec Items in DB: ${totalSpecs}`);

  // Check Master JSON files in newProj/75/
  const masterJsonDir = path.join(__dirname, '../../newProj/75');
  let masterJsonFiles: string[] = [];
  let masterProjectsCount = 0;
  let masterProjectsWithSpecs = 0;
  let masterTotalSpecs = 0;

  if (fs.existsSync(masterJsonDir)) {
    masterJsonFiles = fs.readdirSync(masterJsonDir).filter(f => f.endsWith('.json'));
    for (const file of masterJsonFiles) {
      try {
        const raw = fs.readFileSync(path.join(masterJsonDir, file), 'utf8');
        const data = JSON.parse(raw);
        const list = Array.isArray(data) ? data : [data];
        masterProjectsCount += list.length;
        for (const p of list) {
          if (p.spec_items && p.spec_items.length > 0) {
            masterProjectsWithSpecs++;
            masterTotalSpecs += p.spec_items.length;
          }
        }
      } catch (err) {}
    }
  }

  console.log(`\n=== MASTER JSON BACKUP INVENTORY (newProj/75/) ===`);
  console.log(`Master JSON Files Count: ${masterJsonFiles.length}`);
  console.log(`Total Projects in Master JSON: ${masterProjectsCount}`);
  console.log(`Projects with Spec Items in Master JSON: ${masterProjectsWithSpecs}`);
  console.log(`Total Spec Items in Master JSON: ${masterTotalSpecs}`);

  // Inspect sample project
  const sample = await prisma.project.findFirst({
    where: { spec_items: { some: {} } },
    include: { spec_items: true, price_history: true }
  });
  if (sample) {
    console.log(`\nSample Enriched Project: ${sample.name}`);
    console.log(`  - Spec Items: ${sample.spec_items.length}`);
    console.log(`  - Price History Points: ${sample.price_history.length}`);
    console.log(`  - Walkability: ${sample.walkability_score}, Green Cover: ${sample.green_cover_percent}%, Rental Yield: ${sample.rental_yield_annual_percent}%`);
  }

  // Check if any projects lack specs
  const projectsWithoutSpecs = await prisma.project.findMany({
    where: { spec_items: { none: {} } },
    select: { id: true, name: true, sector: true }
  });
  console.log(`\nProjects without specs count: ${projectsWithoutSpecs.length}`);
  if (projectsWithoutSpecs.length > 0) {
    console.log(`First 5 projects without specs:`, projectsWithoutSpecs.slice(0, 5));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
