import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const masterDir = 'c:\\Users\\Furqan\\Desktop\\RealtyPals\\newProj\\75';

const targetFiles = [
  { label: 'Sector 12 (Gr Noida West)', file: 'realtypals_sector12_greaternoidawest_master_data.json' },
  { label: 'Sector 75 (Noida)', file: 'realtypals_sector75_noida_master_data.json' },
  { label: 'Sector 77 (Noida)', file: 'realtypals_sector77_noida_master_data.json' },
  { label: 'Sector 78 (Noida)', file: 'realtypals_sector78_noida_master_data.json' },
  { label: 'Sector 79 (Noida)', file: 'realtypals_sector79_noida_master_data.json' },
  { label: 'Sector 10 (Gr Noida West)', file: 'realtypals_sector10_greaternoidawest_master_data.json' },
  { label: 'Sector 16C (Gr Noida West)', file: 'realtypals_sector16c_greaternoidawest_master_data.json' },
  { label: 'Sector 1 (Gr Noida West)', file: 'realtypals_sector1_greaternoidawest_master_data.json' },
  { label: 'Techzone 4 (Gr Noida West)', file: 'realtypals_techzone4_greaternoidawest_master_data.json' },
  { label: 'Sector 22D (Yamuna Exp)', file: 'realtypals_sector22d_yamunaexpressway_master_data.json' },
  { label: 'Sector 100 (Noida)', file: 'realtypals_sector100_noida_master_data.json' },
  { label: 'Sector 107 (Noida)', file: 'realtypals_sector107_noida_master_data.json' },
  { label: 'Sector 128 (Noida)', file: 'realtypals_sector128_noida_master_data.json' },
  { label: 'Sector 137 (Noida)', file: 'realtypals_sector137_noida_master_data.json' },
  { label: 'Sector 143 (Noida)', file: 'realtypals_sector143_noida_master_data.json' },
  { label: 'Sector 150 (Noida)', file: 'realtypals_sector150_noida_master_data.json' },
  { label: 'Sector 76 (Noida)', file: 'realtypals_sector76_noida_master_data.json' },
];

async function runAudit() {
  console.log('===============================================================');
  console.log('🔍 AUDITING MASTER JSON FILES VS POSTGRESQL / PRISMA DATABASE');
  console.log('===============================================================\n');

  console.log('📡 Fetching all database records in batch...');
  const allDbProjects: any[] = await prisma.project.findMany({
    include: {
      builder: true,
      unit_types: true,
      amenities: true,
      connectivity: true,
      price_history: true,
      dna: true,
      decision_profile: true,
      persona_profile: true,
      recommendation_profile: true,
      competitors: true,
      construction_milestones: true,
      construction_updates: true,
      lifecycle_updates: true,
      cost_sheet: true,
      payment_plans: true,
      images: true,
    }
  });

  const dbMap = new Map<string, any>();
  for (const p of allDbProjects) {
    dbMap.set(p.slug.toLowerCase().trim(), p);
    // also map by name lowercased
    dbMap.set(p.name.toLowerCase().trim(), p);
  }

  console.log(`✅ Loaded ${allDbProjects.length} total projects from PostgreSQL.\n`);

  let totalJsonProjects = 0;
  let totalMatched = 0;
  let totalMissingInDb = 0;
  const sectorSummaries: any[] = [];

  for (const item of targetFiles) {
    const filePath = path.join(masterDir, item.file);
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${item.file}`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const jsonProjects = JSON.parse(content);
    totalJsonProjects += jsonProjects.length;

    const sectorDetail: any = {
      label: item.label,
      file: item.file,
      totalInJson: jsonProjects.length,
      matchedInDb: 0,
      missingInDb: [],
      projectsWithMissingRelations: [],
      projectsList: []
    };

    for (const p of jsonProjects) {
      const proj = p.project || p;
      const slug = (proj.slug || '').toLowerCase().trim();
      const name = (proj.name || '').toLowerCase().trim();

      const dbProj = dbMap.get(slug) || dbMap.get(name);

      if (!dbProj) {
        sectorDetail.missingInDb.push({ name: proj.name, slug: proj.slug });
        totalMissingInDb++;
      } else {
        sectorDetail.matchedInDb++;
        totalMatched++;

        const missingRels: string[] = [];
        if (!dbProj.unit_types || dbProj.unit_types.length === 0) missingRels.push('unit_types');
        if (!dbProj.amenities || dbProj.amenities.length === 0) missingRels.push('amenities');
        if (!dbProj.connectivity || dbProj.connectivity.length === 0) missingRels.push('connectivity');
        if (!dbProj.cost_sheet) missingRels.push('cost_sheet');
        if (!dbProj.payment_plans || dbProj.payment_plans.length === 0) missingRels.push('payment_plans');
        if (!dbProj.dna) missingRels.push('project_dna');
        if (!dbProj.decision_profile) missingRels.push('decision_profile');
        if (!dbProj.persona_profile) missingRels.push('persona_profile');
        if (!dbProj.recommendation_profile) missingRels.push('recommendation_profile');
        if (!dbProj.price_history || dbProj.price_history.length === 0) missingRels.push('price_history');
        if (!dbProj.construction_milestones || dbProj.construction_milestones.length === 0) missingRels.push('construction_milestones');

        sectorDetail.projectsList.push({
          name: dbProj.name,
          slug: dbProj.slug,
          sector: dbProj.sector,
          status: dbProj.status,
          price_min_cr: dbProj.price_min_cr,
          units_count: dbProj.unit_types ? dbProj.unit_types.length : 0,
          amenities_count: dbProj.amenities ? dbProj.amenities.length : 0,
          connectivity_count: dbProj.connectivity ? dbProj.connectivity.length : 0,
          has_dna: !!dbProj.dna,
          has_cost_sheet: !!dbProj.cost_sheet,
          has_decision_profile: !!dbProj.decision_profile,
          has_persona_profile: !!dbProj.persona_profile,
          has_recommendation_profile: !!dbProj.recommendation_profile,
          missingRels
        });

        if (missingRels.length > 0) {
          sectorDetail.projectsWithMissingRelations.push({ name: dbProj.name, slug: dbProj.slug, missingRels });
        }
      }
    }

    sectorSummaries.push(sectorDetail);
  }

  // Print summary report
  for (const s of sectorSummaries) {
    console.log(`📁 ${s.label} (${s.file})`);
    console.log(`   Projects in JSON: ${s.totalInJson} | Matched in DB: ${s.matchedInDb}`);
    if (s.missingInDb.length > 0) {
      console.log(`   ❌ Missing in DB (${s.missingInDb.length}):`, s.missingInDb.map((m: any) => `${m.name} (${m.slug})`).join(', '));
    }
    if (s.projectsWithMissingRelations.length > 0) {
      console.log(`   ⚠️ Projects with missing relations (${s.projectsWithMissingRelations.length}):`);
      for (const p of s.projectsWithMissingRelations) {
        console.log(`      - ${p.name}: missing [${p.missingRels.join(', ')}]`);
      }
    }
    if (s.missingInDb.length === 0 && s.projectsWithMissingRelations.length === 0) {
      console.log(`   ✅ 100% COMPLETE & VERIFIED in DB with all relations!`);
    }
    console.log('');
  }

  console.log('===============================================================');
  console.log(`TOTAL AUDIT RESULT:`);
  console.log(`- Total Projects in JSON Files: ${totalJsonProjects}`);
  console.log(`- Total Matched in DB: ${totalMatched}`);
  console.log(`- Total Missing in DB: ${totalMissingInDb}`);
  console.log(`- Total Projects in DB Overall: ${allDbProjects.length}`);
  console.log('===============================================================');
}

runAudit()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
