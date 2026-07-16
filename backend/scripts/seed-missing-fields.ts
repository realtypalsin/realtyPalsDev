import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Missing Fields ---');
  
  const jsonPath = path.join(__dirname, '../../docs/missingFields.json');
  let content = readFileSync(jsonPath, 'utf8');
  
  // Extract JSON from markdown
  const startIndex = content.indexOf('```json');
  const endIndex = content.lastIndexOf('```');
  
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    content = content.substring(startIndex + 7, endIndex).trim();
  }
  
  const data = JSON.parse(content);
  
  for (const sectorKey of Object.keys(data)) {
    const projects = data[sectorKey];
    for (const item of projects) {
      const slug = item.slug;
      const project = await prisma.project.findUnique({
        where: { slug },
        include: { builder: true, decision_profile: true }
      });
      
      if (!project) {
        console.log(`[NOT FOUND] Project with slug: ${slug}`);
        continue;
      }

      console.log(`Processing: ${slug}`);
      
      // Update Project
      if (item.project && item.project.marketing_claims) {
        await prisma.project.update({
          where: { slug },
          data: {
            marketing_claims: item.project.marketing_claims
          }
        });
        console.log(`  - Updated marketing_claims`);
      }
      
      // Update Builder
      if (item.builder && project.builder) {
        const builderUpdates: any = {};
        if (item.builder.company_overview) builderUpdates.company_overview = item.builder.company_overview;
        if (item.builder.delivered_units) builderUpdates.delivered_units = item.builder.delivered_units;
        if (item.builder.founded_year) builderUpdates.founded_year = item.builder.founded_year;
        
        if (Object.keys(builderUpdates).length > 0) {
          await prisma.builder.update({
            where: { id: project.builder.id },
            data: builderUpdates
          });
          console.log(`  - Updated Builder: ${Object.keys(builderUpdates).join(', ')}`);
        }
      }
      
      // Update Decision Profile
      if (item.decision_profile && item.decision_profile.decision_thesis) {
        if (project.decision_profile) {
          await prisma.decisionProfile.update({
            where: { id: project.decision_profile.id },
            data: { decision_thesis: item.decision_profile.decision_thesis }
          });
        } else {
          await prisma.decisionProfile.create({
            data: {
              decision_thesis: item.decision_profile.decision_thesis,
              project: { connect: { id: project.id } }
            }
          });
        }
        console.log(`  - Updated Decision Profile`);
      }
    }
  }
  
  console.log('--- Seeding Complete ---');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
