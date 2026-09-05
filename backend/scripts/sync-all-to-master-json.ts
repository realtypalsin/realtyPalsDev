import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const masterDir = 'c:\\Users\\Furqan\\Desktop\\PropFyndr\\newProj\\75';

async function main() {
  console.log('===============================================================');
  console.log('💾 CLEAN SYNCHRONIZATION: EXPORT ALL 210 DB PROJECTS TO MASTER JSON');
  console.log('===============================================================\n');

  // Fetch all projects with all relations from DB
  const projects = await prisma.project.findMany({
    include: {
      builder: true,
      unit_types: true,
      cost_sheet: true,
      payment_plans: true,
      price_history: true,
      construction_milestones: true,
      construction_updates: true,
      lifecycle_updates: true,
      images: true,
      amenities: true,
      connectivity: true,
      spec_items: true,
      persona_profile: true,
      recommendation_profile: true,
      decision_profile: true,
      dna: true,
      competitors: true,
      channel_partners: {
        include: {
          channel_partner: true
        }
      }
    } as any
  });

  console.log(`📊 DB Project Count: ${projects.length}`);

  // Group by clean sector filename
  const sectorFileMap = new Map<string, any[]>();

  for (const p of projects) {
    const rawSector = (p.sector || 'sector75').toLowerCase().replace(/[^a-z0-9]/g, '');
    const rawCity = (p.city || 'noida').toLowerCase().replace(/[^a-z0-9]/g, '');
    const filename = `propfyndr_${rawSector}_${rawCity}_master_data.json`;

    if (!sectorFileMap.has(filename)) {
      sectorFileMap.set(filename, []);
    }
    sectorFileMap.get(filename)!.push(p);
  }

  // Clear existing json files in masterDir to purge stale duplicate files
  const existingFiles = fs.readdirSync(masterDir).filter(f => f.endsWith('.json'));
  for (const f of existingFiles) {
    fs.unlinkSync(path.join(masterDir, f));
  }
  console.log(`🧹 Purged ${existingFiles.length} old/stale master JSON files on disk.`);

  // Write clean fresh files
  let totalFilesWritten = 0;
  let totalProjectsWritten = 0;

  for (const [filename, projArr] of sectorFileMap.entries()) {
    const filePath = path.join(masterDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(projArr, null, 2), 'utf8');
    totalFilesWritten++;
    totalProjectsWritten += projArr.length;
    console.log(`  💾 Wrote ${projArr.length} complete projects -> ${filename}`);
  }

  console.log(`\n===============================================================`);
  console.log(`🎉 MASTER JSON BACKUP SYNC COMPLETE!`);
  console.log(`📁 Wrote ${totalFilesWritten} clean master JSON files (${totalProjectsWritten} total projects) in newProj/75/`);
  console.log(`===============================================================\n`);
}

main()
  .catch((e) => {
    console.error('❌ Sync error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
