import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Missing Fields ---');
  
  const jsonPath = path.join(__dirname, '../../docs/missingFields.json');
  const missingData = JSON.parse(readFileSync(jsonPath, 'utf8'));

  for (const region of Object.keys(missingData)) {
    console.log(`Processing region: ${region}`);
    const items = missingData[region];

    for (const item of items) {
      const { slug, project, builder, decision_profile } = item;
      console.log(`> Updating project with slug: ${slug}`);

      const dbProject = await prisma.project.findUnique({
        where: { slug }
      });

      if (!dbProject) {
        console.warn(`⚠️ Project with slug "${slug}" not found in database! Skipping.`);
        continue;
      }

      // Update Project
      if (project) {
        await prisma.project.update({
          where: { id: dbProject.id },
          data: project
        });
        console.log(`  Updated project fields.`);
      }

      // Update Builder (ignore logo_url changes per user request)
      if (builder) {
        const updateData = { ...builder };
        delete updateData.logo_url; // Exclude logo_url as per request

        await prisma.builder.update({
          where: { id: dbProject.builder_id },
          data: updateData
        });
        console.log(`  Updated builder fields (excluding logo_url).`);
      }

      // Update/Upsert Decision Profile
      if (decision_profile) {
        await prisma.decisionProfile.upsert({
          where: { project_id: dbProject.id },
          update: decision_profile,
          create: {
            project_id: dbProject.id,
            ...decision_profile
          }
        });
        console.log(`  Updated/Upserted decision profile.`);
      }
    }
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch(e => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
