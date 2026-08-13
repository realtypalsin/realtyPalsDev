import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url } } });

async function main() {
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, slug: true, rera_number: true, sector: true, city: true }
  });

  console.log(`Total DB projects: ${projects.length}`);

  const targetGroups = [
    { label: 'AIMS / Golf Avenue', pattern: /aims|golf avenue/i },
    { label: 'Gardenia Golf City', pattern: /gardenia golf/i },
    { label: 'Maxblis White House', pattern: /maxblis/i },
    { label: 'Apex Athena', pattern: /apex athena/i },
    { label: 'Antriksh Golf View', pattern: /antriksh golf view/i },
    { label: 'Nimbus Hyde Park', pattern: /hyde park/i },
    { label: 'Lotus Arena', pattern: /lotus.*arena/i },
    { label: 'Hilston', pattern: /hilston/i },
    { label: 'Gaur Yamuna City', pattern: /gaur yamuna/i }
  ];

  for (const group of targetGroups) {
    console.log(`\n--- ${group.label} ---`);
    const matches = projects.filter(p => group.pattern.test(p.name) || group.pattern.test(p.slug));
    matches.forEach(m => {
      console.log(`  ID: ${m.id} | Slug: ${m.slug} | Name: "${m.name}" | RERA: "${m.rera_number || 'N/A'}" | Sector: "${m.sector}"`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
