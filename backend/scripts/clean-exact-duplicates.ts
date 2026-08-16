import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDuplicates() {
  console.log('🧹 Cleaning duplicate projects in database...');

  const allProjects = await prisma.project.findMany({
    select: { id: true, name: true, slug: true, sector: true, city: true, created_at: true },
    orderBy: { created_at: 'desc' }
  });

  const seen = new Set<string>();
  const toDelete: string[] = [];

  for (const p of allProjects) {
    const key = `${p.name.trim().toLowerCase()} - ${p.sector.trim().toLowerCase()} - ${p.city.trim().toLowerCase()}`;
    if (seen.has(key)) {
      console.log(`  🗑️ Deleting older duplicate: "${p.name}" (ID: ${p.id}, Slug: ${p.slug})`);
      toDelete.push(p.id);
    } else {
      seen.add(key);
    }
  }

  if (toDelete.length > 0) {
    await prisma.project.deleteMany({
      where: { id: { in: toDelete } }
    });
    console.log(`✅ Successfully deleted ${toDelete.length} duplicate project records!`);
  } else {
    console.log('✅ No duplicates found to delete.');
  }
}

cleanDuplicates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
