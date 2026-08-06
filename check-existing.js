const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const slugs = [
  'irish-platinum-sector-10',
  'elite-x-sector-10',
  'godrej-majesty-sector-12',
  'renox-thrive-sector-10',
  'ats-happy-trails-sector-10',
  'arihant-abode-sector-10',
  'trinity-primus-sector-10',
  'coco-county-sector-10',
  'sikka-kaamya-greens-sector-10',
  'mahagun-mantraa-sector-10',
  'sindhuja-greens-sector-10',
  'ibp-windsor-valley-sector-10',
  'ambr-mangolia-sector-10',
  'ambr-aspire-sector-10'
];

(async () => {
  try {
    const existing = await prisma.project.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true, name: true }
    });
    
    console.log(`Found ${existing.length} existing projects:`);
    existing.forEach(p => console.log(`  ✓ ${p.slug} (${p.name})`));
    
    const missing = slugs.filter(s => !existing.find(e => e.slug === s));
    console.log(`\nWill create ${missing.length} new projects`);
    
  } catch (e) {
    console.error('DB error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
