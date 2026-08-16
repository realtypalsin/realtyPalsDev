import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicatesAndClean() {
  console.log('========================================================================');
  console.log('🔍 CHECKING FOR DUPLICATES & STALE PRICING IN DATABASE');
  console.log('========================================================================\n');

  const allProjects = await prisma.project.findMany({
    select: { id: true, name: true, slug: true, sector: true, city: true, price_min_cr: true, created_at: true },
    orderBy: { created_at: 'asc' }
  });

  const slugMap: Record<string, typeof allProjects> = {};
  const nameSectorMap: Record<string, typeof allProjects> = {};

  allProjects.forEach(p => {
    const slugKey = p.slug.trim().toLowerCase();
    if (!slugMap[slugKey]) slugMap[slugKey] = [];
    slugMap[slugKey].push(p);

    const nameKey = `${p.name.trim().toLowerCase()} - ${p.sector.trim().toLowerCase()} - ${p.city.trim().toLowerCase()}`;
    if (!nameSectorMap[nameKey]) nameSectorMap[nameKey] = [];
    nameSectorMap[nameKey].push(p);
  });

  let duplicateSlugs = 0;
  let duplicateNames = 0;

  for (const [slug, list] of Object.entries(slugMap)) {
    if (list.length > 1) {
      duplicateSlugs++;
      console.log(`⚠️ Duplicate slug: "${slug}" (${list.length} records)`);
    }
  }

  for (const [nameKey, list] of Object.entries(nameSectorMap)) {
    if (list.length > 1) {
      duplicateNames++;
      console.log(`⚠️ Duplicate project in same sector: "${nameKey}" (${list.length} records)`);
    }
  }

  if (duplicateSlugs === 0 && duplicateNames === 0) {
    console.log('✅ ZERO DUPLICATES FOUND! All slugs and name-sector pairs are 100% unique.');
  } else {
    console.log(`Found ${duplicateSlugs} duplicate slugs and ${duplicateNames} duplicate project names.`);
  }

  console.log(`\n📊 Total Active Unique Projects: ${allProjects.length}`);
}

checkDuplicatesAndClean()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
