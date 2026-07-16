import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Missing JSON ---');
  
  const jsonPath = path.join(__dirname, '../../docs/missing.json');
  const content = readFileSync(jsonPath, 'utf8');
  
  const data = JSON.parse(content);
  
  for (const item of data.projects) {
    const slug = item.slug;
    const project = await prisma.project.findUnique({
      where: { slug },
      include: { builder: true, decision_profile: true }
    });
    
    if (!project) {
      console.log(`[NOT FOUND] Project: ${slug}`);
      continue;
    }

    console.log(`Processing: ${slug}`);
    
    // Update Builder
    if (item.builder_details && project.builder) {
      const builderUpdates: any = {};
      if (item.builder_details.company_overview) builderUpdates.company_overview = item.builder_details.company_overview;
      if (item.builder_details.delivered_units) builderUpdates.delivered_units = item.builder_details.delivered_units;
      if (item.builder_details.founded_year) builderUpdates.founded_year = item.builder_details.founded_year;
      // Note: company_status might not exist on builder, we'll try adding it to company_overview if it exists
      if (item.builder_details.company_status) {
         builderUpdates.company_overview = (builderUpdates.company_overview || project.builder.company_overview || '') + ` (Status: ${item.builder_details.company_status})`;
      }
      
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

    // Update Project Features -> Marketing Claims
    if (item.project_features) {
      const claims = Object.entries(item.project_features).map(([k, v]) => {
        const readableKey = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return `${readableKey}: ${v}`;
      });

      const existingClaims = Array.isArray(project.marketing_claims) ? project.marketing_claims as string[] : [];
      const newClaims = [...existingClaims, ...claims];

      await prisma.project.update({
        where: { slug },
        data: {
          marketing_claims: Array.from(new Set(newClaims))
        }
      });
      console.log(`  - Updated marketing_claims with project_features`);
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
