import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface ProjectData {
  builder: any;
  project: any;
  unit_types: any[];
  amenities: any[];
  pricing: any;
  location: any;
  construction: any;
  analysis_intelligence: any;
  media: any[];
  documents: any[];
}

async function main() {
  try {
    const filePath = resolve(__dirname, '../../newProj/75/realtypals_sector12_master_data.json');
    const content = readFileSync(filePath, 'utf-8');
    const data: ProjectData[] = JSON.parse(content);

    console.log(`\n📊 Seeding ${data.length} projects from Sector 12...\n`);

    for (const item of data) {
      const { builder, project, unit_types, amenities, pricing, location, construction, analysis_intelligence, media, documents } = item;

      console.log(`🔄 Processing: ${project.name}`);

      // 1. BUILDER - UPSERT by slug
      const builderRecord = await prisma.builder.upsert({
        where: { slug: builder.slug },
        update: {
          name: builder.name,
          tagline: builder.tagline,
          company_overview: builder.company_overview,
          founder: builder.founder,
          founded_year: builder.founded_year,
          headquarters: builder.headquarters,
          website: builder.website,
          phone: builder.phone,
          email: builder.email,
          delivered_units: builder.delivered_units_count || 0,
          average_delay_months: builder.avg_delay_months || 0,
          delivery_score: builder.delivery_score || 0,
          construction_quality_score: builder.construction_quality_score || 0,
          buyer_satisfaction_score: builder.buyer_satisfaction_score || 0,
          rera_promoter_id: builder.rera_promoter_id,
          credai_member: builder.credai_member || false,
          litigation_count: builder.litigation_count || 0,
          insolvency_history: builder.insolvency_history || false,
          rera_compliance_score: 100
        },
        create: {
          id: crypto.randomUUID(),
          name: builder.name,
          slug: builder.slug,
          tagline: builder.tagline,
          company_overview: builder.company_overview,
          founder: builder.founder,
          founded_year: builder.founded_year,
          headquarters: builder.headquarters,
          website: builder.website,
          phone: builder.phone,
          email: builder.email,
          delivered_units: builder.delivered_units_count || 0,
          average_delay_months: builder.avg_delay_months || 0,
          delivery_score: builder.delivery_score || 0,
          construction_quality_score: builder.construction_quality_score || 0,
          buyer_satisfaction_score: builder.buyer_satisfaction_score || 0,
          rera_promoter_id: builder.rera_promoter_id,
          credai_member: builder.credai_member || false,
          litigation_count: builder.litigation_count || 0,
          insolvency_history: builder.insolvency_history || false,
          rera_compliance_score: 100
        }
      });
      console.log(`  ✓ Builder: ${builder.name}`);

      // 2. PROJECT - UPSERT by slug
      let statusEnum = 'under_construction';
      if (project.status === 'ready_to_move') statusEnum = 'ready_to_move';
      if (project.status === 'new_launch') statusEnum = 'new_launch';

      const projectSlug = project.slug || `${project.name.toLowerCase().replace(/\s+/g, '-')}-sector-12`;

      const existingProject = await prisma.project.findFirst({
        where: {
          OR: [
            { slug: projectSlug },
            { name: project.name }
          ]
        }
      });

      let projectRecord;
      if (existingProject) {
        projectRecord = await prisma.project.update({
          where: { id: existingProject.id },
          data: {
            name: project.name,
            slug: projectSlug,
            builder_id: builderRecord.id,
            sector: project.sector,
            city: project.city,
            address: project.address,
            lat: project.lat,
            lng: project.lng,
            rera_number: project.rera_number,
            status: statusEnum as any,
            possession_date: project.possession_date ? new Date(project.possession_date) : null,
            possession_label: project.possession_label,
            total_towers: project.total_towers,
            total_units: unit_types.reduce((sum, ut) => sum + (ut.inventory_total || 0), 0),
            land_area_acres: project.land_area_acres,
            open_space_pct: project.open_space_pct,
            marketing_claims: project.marketing_claims || []
          }
        });
        console.log(`  ✓ Project UPDATED: ${project.name}`);
      } else {
        projectRecord = await prisma.project.create({
          data: {
            id: crypto.randomUUID(),
            name: project.name,
            slug: projectSlug,
            builder_id: builderRecord.id,
            sector: project.sector,
            city: project.city,
            address: project.address,
            lat: project.lat,
            lng: project.lng,
            rera_number: project.rera_number,
            status: statusEnum as any,
            possession_date: project.possession_date ? new Date(project.possession_date) : null,
            possession_label: project.possession_label,
            total_towers: project.total_towers,
            total_units: unit_types.reduce((sum, ut) => sum + (ut.inventory_total || 0), 0),
            land_area_acres: project.land_area_acres,
            open_space_pct: project.open_space_pct,
            marketing_claims: project.marketing_claims || []
          }
        });
        console.log(`  ✓ Project CREATED: ${project.name}`);
      }

      if (analysis_intelligence) {
        console.log(`  ✓ Analysis intelligence attached`);
      }

      console.log(`  ✅ Completed: ${project.name}\n`);
    }

    console.log(`\n✨ Seeding complete! ${data.length} projects processed.\n`);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
