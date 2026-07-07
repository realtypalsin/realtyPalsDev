import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function patch() {
  const jsonPath = 'C:\\Users\\Furqan\\Downloads\\realtypals-intelligence-patch.json';
  if (!fs.existsSync(jsonPath)) {
    console.error(`File not found: ${jsonPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw);

  // Map JSON slugs to correct database slugs
  const slugMapping: Record<string, string> = {
    'gardenia-golf-city-sector-75-noida': 'aims-max-gardenia-golf-city-sector-75-noida',
    'nimbus-hyde-park-sector-78-noida': 'iitl-nimbus-the-hyde-park-sector-78-noida',
    'gaur-sports-city-sector-79-noida': 'gaur-sportswood-sector-79-noida',
  };

  console.log(`Loaded patch file containing ${data.projects?.length || 0} projects.`);

  for (const proj of data.projects) {
    let { slug, intelligence_data, cost_sheet } = proj;

    // Apply slug mapping if present
    if (slugMapping[slug]) {
      console.log(`Mapping slug "${slug}" -> "${slugMapping[slug]}"`);
      slug = slugMapping[slug];
    }

    // 1. Find the project
    const project = await prisma.project.findUnique({
      where: { slug },
    });

    if (!project) {
      console.warn(`[WARN] Project not found in database for slug: "${slug}". Skipping...`);
      continue;
    }

    console.log(`Patching project: ${project.name} (${slug})...`);

    // 2. Patch DecisionProfile
    if (intelligence_data) {
      const existingProfile = await prisma.decisionProfile.findUnique({
        where: { project_id: project.id },
      });

      await prisma.decisionProfile.upsert({
        where: { project_id: project.id },
        create: {
          project_id: project.id,
          status: 'PUBLISHED',
          intelligence_data: intelligence_data,
        },
        update: {
          status: 'PUBLISHED',
          intelligence_data: intelligence_data,
        },
      });
      console.log(` - Patched DecisionProfile.intelligence_data`);
    }

    // 3. Patch CostSheet
    if (cost_sheet && cost_sheet.other_charges) {
      const existingCostSheet = await prisma.costSheet.findUnique({
        where: { project_id: project.id },
      });

      if (existingCostSheet) {
        await prisma.costSheet.update({
          where: { project_id: project.id },
          data: {
            other_charges: cost_sheet.other_charges,
          },
        });
        console.log(` - Patched CostSheet.other_charges`);
      } else {
        await prisma.costSheet.create({
          data: {
            project_id: project.id,
            other_charges: cost_sheet.other_charges,
            gst_rate_pct: project.status === 'ready_to_move' ? 0.0 : 5.0,
            stamp_duty_pct: 6.0,
            registration_pct: 1.0,
            assumptions: ['Prices subject to change without notice'],
          },
        });
        console.log(` - Created new CostSheet with other_charges`);
      }
    }
  }

  console.log('Seeding/Patching completed successfully!');
}

patch()
  .catch((err) => {
    console.error('Patch execution failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
