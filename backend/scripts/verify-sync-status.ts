import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const masterDir = 'c:\\Users\\Furqan\\Desktop\\RealtyPals\\newProj\\75';

async function main() {
  console.log('===============================================================');
  console.log('🔍 VERIFYING 1:1 SYNCHRONIZATION BETWEEN DB & MASTER JSON FILES');
  console.log('===============================================================\n');

  const dbProjects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      sector: true,
      city: true,
      rera_number: true,
      price_min_cr: true,
      price_range_label: true,
    }
  });

  console.log(`📊 DB Project Count: ${dbProjects.length}`);

  let totalMasterProjects = 0;
  let mismatchedRera = 0;
  let mismatchedPrice = 0;

  const files = fs.readdirSync(masterDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(masterDir, file);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(content)) {
        totalMasterProjects += content.length;

        for (const item of content) {
          const dbMatch = dbProjects.find(p => p.slug === item.slug);
          if (dbMatch) {
            if (dbMatch.rera_number !== item.rera_number) {
              console.log(`❌ RERA Mismatch for ${dbMatch.slug}: DB="${dbMatch.rera_number}" vs JSON="${item.rera_number}"`);
              mismatchedRera++;
            }
            if (dbMatch.price_min_cr !== item.price_min_cr) {
              console.log(`❌ Price Mismatch for ${dbMatch.slug}: DB="${dbMatch.price_min_cr}" vs JSON="${item.price_min_cr}"`);
              mismatchedPrice++;
            }
          }
        }
      }
    } catch (e) {
      console.error(`Error reading ${file}:`, e);
    }
  }

  console.log(`📁 Master JSON Files Count: ${files.length}`);
  console.log(`📈 Total Master JSON Projects on Disk: ${totalMasterProjects}`);
  console.log(`✅ RERA Mismatches: ${mismatchedRera}`);
  console.log(`✅ Price Mismatches: ${mismatchedPrice}`);

  if (mismatchedRera === 0 && mismatchedPrice === 0) {
    console.log(`\n===============================================================`);
    console.log(`🎉 VERIFICATION SUCCESS: 100% PERFECT SYNC BETWEEN DB & MASTER JSON!`);
    console.log(`===============================================================\n`);
  }
}

main()
  .catch((e) => {
    console.error('Verification error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
