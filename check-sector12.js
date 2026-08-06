const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

const data = JSON.parse(fs.readFileSync('./newProj/75/realtypals_sector12_master_data.json', 'utf-8'));
const projectNames = data.map(p => p.project.name);

(async () => {
  try {
    const existing = await prisma.project.findMany({
      where: { 
        OR: projectNames.map(name => ({ name: { contains: name.split(' ')[0] } }))
      },
      select: { id: true, slug: true, name: true, sector: true }
    });
    
    console.log(`Found ${existing.length} projects in DB:`);
    existing.forEach(p => console.log(`  ✓ ${p.name} (sector: ${p.sector}, slug: ${p.slug})`));
    
    const missing = projectNames.filter(n => !existing.find(e => e.name.includes(n.split(' ')[0])));
    console.log(`\nNew projects to add: ${missing.length}`);
    missing.forEach(m => console.log(`  - ${m}`));
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
