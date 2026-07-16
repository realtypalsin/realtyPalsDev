import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();

const placeholder = (label: string) => `TODO: provide ${label}`;

async function main() {
  const reportPath = `${process.cwd()}/missing_fields_report.json`;
  const { missingProjects, missingBuilders, missingUnitTypes } = JSON.parse(readFileSync(reportPath, 'utf-8'));

  for (const p of missingProjects) {
    await prisma.project.update({
      where: { id: p.id },
      data: {
        name: p.name ?? placeholder('project name'),
        slug: p.slug ?? placeholder('project slug'),
        description: p.description ?? placeholder('project description'),
        sector: p.sector ?? placeholder('sector'),
        status: p.status ?? placeholder('status'),
      },
    });
  }

  for (const b of missingBuilders) {
    await prisma.builder.update({
      where: { id: b.id },
      data: {
        name: b.name ?? placeholder('builder name'),
        slug: b.slug ?? placeholder('builder slug'),
        description: b.description ?? placeholder('builder description'),
      },
    });
  }

  for (const u of missingUnitTypes) {
    await prisma.unitType.update({
      where: { id: u.id },
      data: {
        bhk: u.bhk ?? 2,
        carpet_area_sqft: u.carpet_area_sqft ?? 1200,
        price_min_cr: u.price_min_cr ?? 1.5,
      },
    });
  }

  console.log('✅ Seeding of missing fields complete.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
