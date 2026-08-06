const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

const data = JSON.parse(fs.readFileSync('./newProj/75/realtypals_sector75_master_data.json', 'utf-8'));
const projectNames = data.map(p => p.project.name);

(async () => {
  try {
    const existing = await prisma.project.findMany({
      where: { 
        OR: projectNames.map(name => ({ name: { contains: name.split(' ')[0] } }))
      },
      select: { id: true, slug: true, name: true, sector: true }
    });
    
    console.log(`\n=== SECTOR 75 DATABASE STATUS ===\n`);
    console.log(`Found ${existing.length} existing projects:\n`);
    existing.forEach(p => console.log(`  ✓ ${p.name} (sector: ${p.sector}, slug: ${p.slug})`));
    
    const missing = projectNames.filter(n => !existing.find(e => e.name.includes(n.split(' ')[0])));
    console.log(`\n${missing.length} new projects to create:\n`);
    missing.forEach(m => console.log(`  - ${m}`));
    
    console.log(`\n\nSUMMARY:`);
    console.log(`- EXISTING (to UPDATE): ${existing.length}`);
    console.log(`- NEW (to CREATE): ${missing.length}`);
    console.log(`- TOTAL: ${projectNames.length}`);
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
