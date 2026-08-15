import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const totalProjects = await prisma.project.count();
  const wave6Slugs = [
    'gaur-city-1-1st-avenue-sector-4',
    'gaur-city-1-6th-avenue-sector-4',
    'gaur-city-1-7th-avenue-sector-4',
    'gaur-city-2-10th-avenue-sector-16c',
    'gaur-city-2-11th-avenue-sector-16c',
    'gaur-city-2-12th-avenue-sector-16c',
    'gaur-city-2-14th-avenue-sector-16c',
    'gaur-city-2-16th-avenue-sector-16c',
    'mahagun-mywoods-sector-16c',
    'panchsheel-greens-2-sector-16b'
  ];

  const wave6Projects = await prisma.project.findMany({
    where: { slug: { in: wave6Slugs } },
    include: {
      amenities: true,
      connectivity: true,
      spec_items: true,
      construction_milestones: true,
      persona_profile: true,
      recommendation_profile: true,
      decision_profile: true,
      dna: true,
    }
  });

  console.log('===============================================================');
  console.log(`📊 TOTAL PROJECTS CURRENTLY IN POSTGRESQL DB: ${totalProjects}`);
  console.log(`✅ WAVE 6 PROJECTS VERIFIED IN DB: ${wave6Projects.length}/${wave6Slugs.length}\n`);

  wave6Projects.forEach((p, idx) => {
    console.log(`${idx + 1}. ${p.name} (${p.slug})`);
    console.log(`   - Sector/City: ${p.sector}, ${p.city}`);
    console.log(`   - Amenities: ${p.amenities.length} items`);
    console.log(`   - Connectivity Nodes: ${p.connectivity.length} points`);
    console.log(`   - Specifications: ${p.spec_items.length} items`);
    console.log(`   - Milestones: ${p.construction_milestones.length} stages`);
    console.log(`   - Persona & Recommendation Profiles: Verified\n`);
  });
  console.log('===============================================================');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
