const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

const sector75Data = JSON.parse(fs.readFileSync('./newProj/75/realtypals_sector75_master_data.json', 'utf-8'));

(async () => {
  console.log('\n=== FINAL SECTOR 75 STATUS ===\n');
  
  const update = [];
  const create = [];
  
  for (const item of sector75Data) {
    const projName = item.project.name;
    
    // Case-insensitive exact name match in Sector 75
    const found = await prisma.project.findFirst({
      where: { 
        AND: [
          { name: { mode: 'insensitive', equals: projName } },
          { sector: { contains: '75' } }
        ]
      },
      select: { id: true, slug: true, name: true, sector: true }
    });
    
    if (found) {
      update.push({ 
        project: projName, 
        existing: found.name, 
        sector: found.sector
      });
    } else {
      create.push(projName);
    }
  }
  
  console.log(`✅ UPDATE (${update.length}):`);
  update.forEach(r => {
    const match = r.project === r.existing ? '(exact)' : '(variant)';
    console.log(`  ✓ ${r.project} ${match}`);
  });
  
  console.log(`\n❌ CREATE (${create.length}):`);
  create.forEach(p => console.log(`  - ${p}`));
  
  console.log(`\n📊 TOTAL: ${update.length + create.length}`);
  console.log(`   Update: ${update.length}`);
  console.log(`   Create: ${create.length}`);
  
  await prisma.$disconnect();
})();
