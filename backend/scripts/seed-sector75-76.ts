import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const filePath = require('path').resolve(__dirname, '../../Projects/sector75,76.json');
  let content = readFileSync(filePath, 'utf-8');
  
  const match = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (match && match[1]) {
    content = match[1];
  }

  const data = JSON.parse(content);
  
  for (const item of data) {
    const { project, unit_types, amenities, connectivity, project_dna } = item;

    console.log(`Seeding project: ${project.name}`);

    const builderSlug = project.builder_id.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let builder = await prisma.builder.findFirst({
      where: { name: project.builder_id }
    });

    if (!builder) {
      builder = await prisma.builder.upsert({
        where: { slug: builderSlug },
        update: {},
        create: {
          id: crypto.randomUUID(),
          name: project.builder_id,
          slug: builderSlug,
        }
      });
    }

    let statusEnum: any = 'under_construction';
    if (project.status === 'Ready to Move') statusEnum = 'ready_to_move';
    if (project.status === 'New Launch') statusEnum = 'new_launch';

    const p = await prisma.project.upsert({
      where: { slug: project.slug },
      update: {
        name: project.name,
        builder_id: builder.id,
        status: statusEnum,
        sector: project.sector,
        city: project.city,
        address: project.address,
        tagline: project.tagline,
        lat: project.lat,
        lng: project.lng,
        rera_number: project.rera_number,
        rera_url: project.rera_url,
        total_towers: project.total_towers,
        total_units: project.total_units,
        land_area_acres: project.land_area_acres,
        launch_date: project.launch_date ? new Date(project.launch_date) : null,
        possession_label: project.possession_label,
        possession_date: project.possession_date ? new Date(project.possession_date) : null,
        design_theme: project.design_theme,
        architect: project.architect || null,
        interior_designer: project.interior_designer || null,
        floors: project.floors,
        open_space_pct: project.open_space_pct,
        green_rating: project.green_rating || null,
        description: project.description,
        long_description: project.long_description,
        marketing_claims: project.marketing_claims || [],
        ai_search_keywords: project.ai_search_keywords || [],
        schools_nearby_count: project.schools_nearby_count || null,
        hospitals_nearby_count: project.hospitals_nearby_count || null,
        shopping_nearby_count: project.shopping_nearby_count || null,
        it_parks_nearby_count: project.it_parks_nearby_count || null,
        banks_nearby_count: project.banks_nearby_count || null,
        restaurants_nearby_count: project.restaurants_nearby_count || null,
        updated_at: new Date()
      },
      create: {
        id: crypto.randomUUID(),
        slug: project.slug,
        name: project.name,
        builder_id: builder.id,
        status: statusEnum,
        sector: project.sector,
        city: project.city,
        address: project.address,
        tagline: project.tagline,
        lat: project.lat,
        lng: project.lng,
        rera_number: project.rera_number,
        rera_url: project.rera_url,
        total_towers: project.total_towers,
        total_units: project.total_units,
        land_area_acres: project.land_area_acres,
        launch_date: project.launch_date ? new Date(project.launch_date) : null,
        possession_label: project.possession_label,
        possession_date: project.possession_date ? new Date(project.possession_date) : null,
        design_theme: project.design_theme,
        architect: project.architect || null,
        interior_designer: project.interior_designer || null,
        floors: project.floors,
        open_space_pct: project.open_space_pct,
        green_rating: project.green_rating || null,
        description: project.description,
        long_description: project.long_description,
        marketing_claims: project.marketing_claims || [],
        ai_search_keywords: project.ai_search_keywords || [],
        schools_nearby_count: project.schools_nearby_count || null,
        hospitals_nearby_count: project.hospitals_nearby_count || null,
        shopping_nearby_count: project.shopping_nearby_count || null,
        it_parks_nearby_count: project.it_parks_nearby_count || null,
        banks_nearby_count: project.banks_nearby_count || null,
        restaurants_nearby_count: project.restaurants_nearby_count || null,
        updated_at: new Date()
      }
    });

    if (unit_types) {
      await prisma.unitType.deleteMany({ where: { project_id: p.id } });
      for (const ut of unit_types) {
        await prisma.unitType.create({
          data: {
            id: crypto.randomUUID(),
            project_id: p.id,
            bhk: ut.bhk,
            name: ut.name,
            super_area_sqft: ut.super_area_sqft,
            carpet_area_sqft: ut.carpet_area_sqft,
            balcony_area_sqft: ut.balcony_area_sqft || null,
            bathrooms: ut.bathrooms,
            price_min_cr: ut.price_min_cr,
            price_max_cr: ut.price_max_cr,
            price_label: ut.price_label,
          }
        });
      }
    }

    if (amenities) {
      await prisma.amenity.deleteMany({ where: { project_id: p.id } });
      for (const am of amenities) {
        let cat = am.category.toLowerCase().replace(/ /g, '_');
        const validCategories = ['sports', 'lifestyle', 'wellness', 'kids', 'security', 'parking'];
        if (!validCategories.includes(cat)) {
          cat = 'lifestyle';
        }
        await prisma.amenity.create({
          data: {
            id: crypto.randomUUID(),
            project_id: p.id,
            name: am.name,
            category: cat as any
          }
        });
      }
    }

    if (connectivity) {
      await prisma.connectivity.deleteMany({ where: { project_id: p.id } });
      for (const conn of connectivity) {
        let cType = conn.type.toLowerCase();
        const validConn = ['metro', 'road', 'school', 'hospital', 'mall', 'landmark', 'airport', 'university', 'expressway'];
        if (!validConn.includes(cType)) {
          cType = 'landmark';
        }
        await prisma.connectivity.create({
          data: {
            id: crypto.randomUUID(),
            project_id: p.id,
            type: cType as any,
            name: conn.name,
            distance_km: conn.distance_km
          }
        });
      }
    }

    if (project_dna) {
      await prisma.projectDna.deleteMany({ where: { project_id: p.id } });
      await prisma.projectDna.create({
        data: {
          id: crypto.randomUUID(),
          project_id: p.id,
          builder_track_record_score: project_dna.builder_track_record_score,
          price_position_score: project_dna.price_position_score,
          locality_score: project_dna.locality_score,
          rera_compliance_score: project_dna.rera_compliance_score,
          amenity_depth_score: project_dna.amenity_depth_score,
          possession_certainty_score: project_dna.possession_certainty_score,
          verified_by: project_dna.verified_by,
          last_verified_at: project_dna.last_verified_at ? new Date(project_dna.last_verified_at) : null,
          updated_at: new Date()
        }
      });
    }

    console.log(`Successfully seeded ${project.name}`);
  }

  console.log('Finished seeding all projects.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
