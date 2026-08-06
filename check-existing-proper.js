const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const projectNames = [
  'Irish Platinum',
  'Elite X',
  'Godrej Majesty',
  'Renox Thrive',
  'ATS Happy Trails',
  'Arihant Abode',
  'Trinity Primus',
  'Coco County',
  'Sikka Kaamya Greens',
  'Mahagun Mantraa 1 & 2',
  'Sindhuja Greens',
  'IBP Windsor Valley',
  'Ambr Mangolia',
  'Ambr Aspire'
];

(async () => {
  try {
    const existing = await prisma.project.findMany({
      where: { 
        OR: projectNames.map(name => ({ name: { contains: name.split(' ')[0] } }))
      },
      select: { id: true, slug: true, name: true, status: true }
    });
    
    console.log(`Found ${existing.length} projects in DB:`);
    existing.forEach(p => console.log(`  ✓ ${p.name} (slug: ${p.slug})`));
    
    const missing = projectNames.filter(n => !existing.find(e => e.name.includes(n.split(' ')[0])));
    console.log(`\nNew projects to add: ${missing.length}`);
    missing.forEach(m => console.log(`  - ${m}`));
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
