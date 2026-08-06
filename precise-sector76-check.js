const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

const sector76Data = JSON.parse(fs.readFileSync('./newProj/75/realtypals_sector76_master_data.json', 'utf-8'));

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('SECTOR 76 - PRECISE EXISTING PROJECT MATCH');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const results = { update: [], create: [] };
  
  for (const item of sector76Data) {
    const projName = item.project.name;
    const builder = item.builder.name;
    
    console.log(`\n🔍 Checking: ${projName} (Builder: ${builder})`);
    
    // 1. EXACT NAME + SECTOR 76
    const exact76 = await prisma.project.findFirst({
      where: {
        AND: [
          { name: { mode: 'insensitive', equals: projName } },
          { sector: { contains: '76' } }
        ]
      },
      select: { id: true, slug: true, name: true, sector: true }
    });
    
    if (exact76) {
      console.log(`   ✅ FOUND (exact match, Sector 76): "${exact76.name}"`);
      results.update.push({ project: projName, match: exact76.name, sector: exact76.sector, type: 'EXACT' });
      continue;
    }
    
    // 2. ANY SECTOR WITH EXACT NAME
    const exactAny = await prisma.project.findFirst({
      where: { name: { mode: 'insensitive', equals: projName } },
      select: { id: true, slug: true, name: true, sector: true }
    });
    
    if (exactAny) {
      console.log(`   ⚠️  FOUND (exact name, different sector): "${exactAny.name}" in ${exactAny.sector}`);
      results.update.push({ project: projName, match: exactAny.name, sector: exactAny.sector, type: 'DIFFERENT_SECTOR' });
      continue;
    }
    
    // 3. BROAD SEARCH (first word)
    const firstWord = projName.split(' ')[0];
    const broad = await prisma.project.findMany({
      where: { name: { contains: firstWord, mode: 'insensitive' } },
      select: { id: true, slug: true, name: true, sector: true }
    });
    
    if (broad.length > 0) {
      console.log(`   🔔 SIMILAR (contains "${firstWord}"):`);
      broad.forEach(b => console.log(`      - "${b.name}" in ${b.sector}`));
      results.update.push({ project: projName, similar: broad.map(b => b.name), type: 'PARTIAL_MATCH' });
      continue;
    }
    
    // 4. NO MATCH
    console.log(`   ✨ NEW (no existing match)`);
    results.create.push(projName);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('FINAL MAPPING\n');
  
  console.log(`UPDATE (${results.update.length}):`);
  results.update.forEach(r => {
    if (r.type === 'EXACT') {
      console.log(`  ✅ ${r.project} → Existing: "${r.match}" (${r.sector})`);
    } else if (r.type === 'DIFFERENT_SECTOR') {
      console.log(`  ⚠️  ${r.project} → Existing: "${r.match}" (${r.sector}) [DIFF SECTOR]`);
    } else {
      console.log(`  🔔 ${r.project} → Similar: ${r.similar.join(', ')}`);
    }
  });
  
  console.log(`\nCREATE (${results.create.length}):`);
  results.create.forEach(p => console.log(`  ✨ ${p}`));
  
  console.log(`\nTOTAL: ${results.update.length + results.create.length}`);
  console.log(`  UPDATE: ${results.update.length}`);
  console.log(`  CREATE: ${results.create.length}`);
  
  await prisma.$disconnect();
})();
