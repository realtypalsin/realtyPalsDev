const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

const sector75Data = JSON.parse(fs.readFileSync('./newProj/75/realtypals_sector75_master_data.json', 'utf-8'));

(async () => {
  console.log('\n=== PRECISE SECTOR 75 MAPPING ===\n');
  
  const results = { update: [], create: [] };
  
  for (const item of sector75Data) {
    const projName = item.project.name;
    
    // Search by exact name + sector
    const exact = await prisma.project.findFirst({
      where: { 
        AND: [
          { name: { equals: projName } },
          { sector: { contains: '75' } }
        ]
      },
      select: { id: true, slug: true, name: true, sector: true }
    });
    
    // Search by broad name match
    const broad = !exact ? await prisma.project.findFirst({
      where: { name: { contains: projName.split(' ')[0] } },
      select: { id: true, slug: true, name: true, sector: true }
    }) : null;
    
    const found = exact || broad;
    
    if (found) {
      results.update.push({ 
        project: projName, 
        existing: found.name, 
        sector: found.sector,
        slug: found.slug
      });
    } else {
      results.create.push(projName);
    }
  }
  
  console.log(`UPDATE (${results.update.length}):`);
  results.update.forEach(r => {
    console.log(`  ✓ ${r.project}`);
    console.log(`    → Existing: "${r.existing}" (${r.sector})`);
  });
  
  console.log(`\nCREATE (${results.create.length}):`);
  results.create.forEach(p => console.log(`  - ${p}`));
  
  console.log(`\nTOTAL: ${results.update.length + results.create.length}`);
  console.log(`  Update: ${results.update.length}`);
  console.log(`  Create: ${results.create.length}`);
  
  await prisma.$disconnect();
})();
