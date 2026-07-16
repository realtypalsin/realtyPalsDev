import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Scanning DB for Hardcoded/Empty Fields ---');

  // ---- Projects -----------------------------------------------------------
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, slug: true, description: true, sector: true, status: true }
  });
  const missingProjects = projects.filter(p => !p.name || !p.slug || !p.sector || !p.status || !p.description);

  // ---- Builders -----------------------------------------------------------
  const builders = await prisma.builder.findMany({
    select: { id: true, name: true, slug: true, description: true }
  });
  const missingBuilders = builders.filter(b => !b.name || !b.slug || !b.description);

  // ---- Unit Types ----------------------------------------------------------
  const unitTypes = await prisma.unitType.findMany({
    select: { id: true, project_id: true, bhk: true, carpet_area_sqft: true, price_min_cr: true }
  });
  const missingUnitTypes = unitTypes.filter(u => !u.bhk || !u.carpet_area_sqft || u.price_min_cr == null);

  // ---- Build final report --------------------------------------------------
  const report = {
    timestamp: new Date().toISOString(),
    missingProjects,
    missingBuilders,
    missingUnitTypes,
  };
  const outPath = `${process.cwd()}/missing_fields_report.json`;
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Report written to ${outPath}`);

  // ---- Human-readable console output ---------------------------
  if (missingProjects.length) console.log(`\n❌ ${missingProjects.length} projects missing fields`);
  if (missingBuilders.length) console.log(`\n❌ ${missingBuilders.length} builders missing fields`);
  if (missingUnitTypes.length) console.log(`\n❌ ${missingUnitTypes.length} unit types missing fields`);
  if (!missingProjects.length && !missingBuilders.length && !missingUnitTypes.length) console.log('\n✅ All records are complete.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
