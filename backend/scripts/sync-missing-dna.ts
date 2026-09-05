import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const masterDir = 'c:\\Users\\Furqan\\Desktop\\PropFyndr\\newProj\\75';

async function syncAllMissingDna() {
  console.log('Syncing all DNA records...');
  const files = fs.readdirSync(masterDir).filter(f => f.endsWith('.json'));

  for (const f of files) {
    const list = JSON.parse(fs.readFileSync(path.join(masterDir, f), 'utf8'));
    for (const item of list) {
      const proj = item.project || item;
      const slug = proj.slug;
      if (!slug) continue;

      const dbProj = await prisma.project.findUnique({ where: { slug }, include: { dna: true } });
      if (dbProj && !dbProj.dna) {
        const dnaData = proj.project_dna || proj.dna || {};
        await prisma.projectDna.create({
          data: {
            project_id: dbProj.id,
            builder_score: dnaData.builder_track_record_score || dnaData.luxury_score || 90,
            price_score: dnaData.price_position_score || dnaData.connectivity_score || 88,
            location_score: dnaData.locality_score || dnaData.greenery_score || 92,
            legal_score: dnaData.rera_compliance_score || dnaData.safety_score || 96,
            amenity_score: dnaData.amenity_depth_score || dnaData.luxury_score || 90,
            possession_score: dnaData.possession_certainty_score || 95,
          }
        });
        console.log(`✓ Added DNA for ${dbProj.name}`);
      }
    }
  }
  console.log('✅ Done syncing all DNA!');
}

syncAllMissingDna()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
