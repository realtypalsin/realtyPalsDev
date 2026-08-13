import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url } } });

const masterDir = 'c:\\Users\\Furqan\\Desktop\\RealtyPals\\newProj\\75';

async function main() {
  console.log('=== STEP 1: AUDITING AND UPDATING MASTER JSON FILES ===');
  const files = fs.readdirSync(masterDir).filter(f => f.endsWith('.json'));

  let updatedFilesCount = 0;
  let totalMasterProjects = 0;

  for (const file of files) {
    const filePath = path.join(masterDir, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    if (!Array.isArray(data)) continue;

    let fileUpdated = false;
    const seenSlugs = new Set<string>();
    const cleanedData: any[] = [];

    for (const item of data) {
      totalMasterProjects++;
      let s = (item.sector || '').trim();
      let c = (item.city || '').trim();

      // Normalize sector (strip trailing city/region suffixes)
      const cleanSector = s
        .replace(/\s+(Greater\s+Noida\s+West|Greater\s+Noida|Noida\s+Extension|Noida)$/i, '')
        .trim();

      if (cleanSector !== s) {
        item.sector = cleanSector;
        fileUpdated = true;
      }

      // Normalize city
      const isGnw = /sector\s*(1|2|3|4|10|12|16c|22d)|techzone\s*4|knowledge\s*park\s*v/i.test(item.sector) ||
                    file.includes('greaternoidawest') ||
                    /greater noida west|noida extension/i.test(s) ||
                    /greater noida west|noida extension/i.test(c);

      if (isGnw) {
        if (item.city !== 'Greater Noida West') {
          item.city = 'Greater Noida West';
          fileUpdated = true;
        }
      } else if (/sector\s*(128|107|100|137|143|150|75|76|77|78|79)/i.test(item.sector) || file.includes('noida_master')) {
        if (item.city !== 'Noida') {
          item.city = 'Noida';
          fileUpdated = true;
        }
      }

      // Deduplicate inside master file by slug
      if (!seenSlugs.has(item.slug)) {
        seenSlugs.add(item.slug);
        cleanedData.push(item);
      } else {
        console.log(`  Removing duplicate slug "${item.slug}" from ${file}`);
        fileUpdated = true;
      }
    }

    if (fileUpdated) {
      fs.writeFileSync(filePath, JSON.stringify(cleanedData, null, 2), 'utf-8');
      updatedFilesCount++;
      console.log(`  Updated master file: ${file} (${cleanedData.length} projects)`);
    }
  }

  console.log(`\nUpdated ${updatedFilesCount} of ${files.length} master JSON files.`);

  console.log('\n=== STEP 2: FETCHING ALL DATABASE PROJECTS ===');
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      sector: true,
      status: true,
      price_min_cr: true,
      builder: { select: { name: true } },
    },
    orderBy: [{ city: 'asc' }, { sector: 'asc' }, { name: 'asc' }],
  });

  console.log(`Total active projects in database: ${projects.length}`);

  // Group by City -> Sector -> List of projects
  const grouped: Record<string, Record<string, typeof projects>> = {};

  for (const p of projects) {
    const cityKey = p.city || 'Noida';
    const sectorKey = p.sector || 'Unassigned';

    if (!grouped[cityKey]) grouped[cityKey] = {};
    if (!grouped[cityKey][sectorKey]) grouped[cityKey][sectorKey] = [];

    grouped[cityKey][sectorKey].push(p);
  }

  const outReport = {
    totalProjects: projects.length,
    grouped,
    projectsList: projects.map(p => ({
      name: p.name,
      builder: p.builder?.name,
      city: p.city,
      sector: p.sector,
      status: p.status,
      slug: p.slug,
    }))
  };

  fs.writeFileSync('scripts/db_projects_list.json', JSON.stringify(outReport, null, 2));
  console.log('Saved DB projects list to scripts/db_projects_list.json');
}

main().catch(console.error).finally(() => prisma.$disconnect());
