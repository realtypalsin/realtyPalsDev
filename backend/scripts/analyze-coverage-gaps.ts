import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeCoverage() {
  console.log('========================================================================');
  console.log('🗺️ NOIDA & GREATER NOIDA REGIONAL COVERAGE GAP ANALYSIS');
  console.log('========================================================================\n');

  const projects = await prisma.project.findMany({
    select: { id: true, name: true, sector: true, city: true, status: true, price_min_cr: true },
  });

  const sectorGroups: Record<string, { city: string; count: number; projects: string[] }> = {};

  projects.forEach((p) => {
    const key = `${p.city} — ${p.sector}`;
    if (!sectorGroups[key]) {
      sectorGroups[key] = { city: p.city, count: 0, projects: [] };
    }
    sectorGroups[key].count++;
    sectorGroups[key].projects.push(p.name);
  });

  console.log(`📊 TOTAL ACTIVE PROJECTS IN DB: ${projects.length}`);
  console.log(`📍 TOTAL UNIQUE SECTOR HUBS COVERED: ${Object.keys(sectorGroups).length}\n`);

  console.log('--- CURRENT ACTIVE SECTORS IN DATABASE ---');
  Object.entries(sectorGroups)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([sec, data], idx) => {
      console.log(`[${idx + 1}] ${sec.padEnd(45)} : ${data.count} projects`);
    });
}

analyzeCoverage()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
