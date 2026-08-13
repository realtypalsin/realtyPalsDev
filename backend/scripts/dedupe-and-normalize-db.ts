import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== STEP 1: DEDUPLICATING PROJECTS ===');

  const allProjects = await prisma.project.findMany({
    include: {
      unit_types: true,
      images: true,
      amenities: true,
      connectivity: true,
    },
    orderBy: { name: 'asc' },
  });

  // Group projects by normalized project name
  const normMap = new Map<string, typeof allProjects>();
  for (const p of allProjects) {
    const cleanName = p.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normMap.has(cleanName)) normMap.set(cleanName, []);
    normMap.get(cleanName)!.push(p);
  }

  let deletedCount = 0;

  for (const [normName, list] of normMap.entries()) {
    if (list.length > 1) {
      console.log(`\nProcessing duplicate group: "${normName}" (${list.length} records)`);

      // Sort by richness of data (units + images + amenities count) descending
      list.sort((a, b) => {
        const scoreA = a.unit_types.length * 10 + a.images.length * 2 + a.amenities.length;
        const scoreB = b.unit_types.length * 10 + b.images.length * 2 + b.amenities.length;
        return scoreB - scoreA;
      });

      const primary = list[0];
      const duplicates = list.slice(1);

      console.log(`  Keeping primary: ${primary.id} | Slug: ${primary.slug} | Units: ${primary.unit_types.length}`);

      for (const dup of duplicates) {
        console.log(`  Deleting duplicate: ${dup.id} | Slug: ${dup.slug} | Units: ${dup.unit_types.length}`);

        // Relink any references in ProjectCompetitor before deleting
        await prisma.projectCompetitor.deleteMany({
          where: { competitor_project_id: dup.id },
        });

        // Delete the duplicate project record
        await prisma.project.delete({
          where: { id: dup.id },
        });
        deletedCount++;
      }
    }
  }

  console.log(`\nSuccessfully deleted ${deletedCount} duplicate projects.`);

  console.log('\n=== STEP 2: CANONICALIZING SECTOR & CITY STRINGS ===');

  const projectsToNormalize = await prisma.project.findMany();
  let updatedCount = 0;

  for (const p of projectsToNormalize) {
    let newSector = p.sector.trim();
    let newCity = p.city.trim();
    let updated = false;

    // Check if sector contains city/region terms
    // e.g. "Sector 10 Greater Noida West" -> "Sector 10"
    // "Sector 1 Greater Noida West" -> "Sector 1"
    const sectorMatch = newSector.match(/^(Sector\s+\d+[A-Z]?|Techzone\s+\d+|Knowledge\s+Park\s+\d+|Alpha\s+I+|Beta\s+I+|Gamma\s+I+|Delta\s+I+|Zeta\s+I+|Omega\s+I+)\s+(Greater\s+Noida(?:\s+West)?|Noida(?:\s+Extension)?)$/i);

    if (sectorMatch) {
      newSector = sectorMatch[1]; // e.g. "Sector 10"
      updated = true;
    } else {
      // Direct strip of trailing region names from sector
      const cleaned = newSector.replace(/\s+(Greater\s+Noida\s+West|Greater\s+Noida|Noida\s+Extension|Noida)$/i, '').trim();
      if (cleaned !== newSector) {
        newSector = cleaned;
        updated = true;
      }
    }

    // Ensure Sector 1, Sector 10, Sector 12, Techzone 4 in GNW are correctly set to city = "Greater Noida West"
    const isGnwSector = /^(Sector\s+(1|2|3|4|10|12|16C)|Techzone\s+4)$/i.test(newSector);
    if (isGnwSector && (p.sector.toLowerCase().includes('west') || p.city.toLowerCase().includes('greater noida'))) {
      if (newCity !== 'Greater Noida West') {
        newCity = 'Greater Noida West';
        updated = true;
      }
    }

    if (updated) {
      console.log(`  Updating project "${p.name}": sector ["${p.sector}" -> "${newSector}"], city ["${p.city}" -> "${newCity}"]`);
      await prisma.project.update({
        where: { id: p.id },
        data: { sector: newSector, city: newCity },
      });
      updatedCount++;
    }
  }

  console.log(`\nSuccessfully updated ${updatedCount} project location fields.`);
  console.log('\n=== DB DEDUPLICATION & NORMALIZATION COMPLETE ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
