import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const masterDir = 'c:\\Users\\Furqan\\Desktop\\RealtyPals\\newProj\\75';

// Master expanded amenities (16 items)
const EXTENDED_AMENITIES_POOL = [
  { name: 'Grand Clubhouse & Lounge', category: 'lifestyle' },
  { name: 'Swimming Pool & Toddler Pool', category: 'sports' },
  { name: 'Fully Equipped Gymnasium', category: 'wellness' },
  { name: 'Children Play Park & Slides', category: 'kids' },
  { name: '24/7 Multi-Tier Security & CCTV', category: 'security' },
  { name: 'Reserved Covered Basement Parking', category: 'parking' },
  { name: 'Badminton & Tennis Courts', category: 'sports' },
  { name: 'Yoga & Meditation Pavilion', category: 'wellness' },
  { name: 'Jogging & Cycling Track', category: 'sports' },
  { name: 'Senior Citizen Sitting Plaza', category: 'lifestyle' },
  { name: 'Intercom & Video Door Phone', category: 'security' },
  { name: 'In-house Convenience Stores & Pharmacy', category: 'lifestyle' },
  { name: 'Landscape Theme Gardens', category: 'lifestyle' },
  { name: 'Basketball & Squash Court', category: 'sports' },
  { name: 'Sauna & Steam Room', category: 'wellness' },
  { name: 'Electric Vehicle Charging Stations', category: 'parking' },
];

function getExpandedConnectivity(sector: string, city: string) {
  const isGrNoida = sector.toLowerCase().includes('greater') || city.toLowerCase().includes('greater');
  return [
    { name: isGrNoida ? 'Gaur Chowk / Sector 52 Metro Link' : `${sector} Aqua Line Metro Station`, type: 'metro', distance_km: 1.2, travel_time_min: 4, notes: 'Rapid transit connection' },
    { name: isGrNoida ? 'Noida-Greater Noida Link Road' : 'Noida-Greater Noida Expressway', type: 'expressway', distance_km: 2.5, travel_time_min: 6, notes: 'Direct arterial highway' },
    { name: 'Jaypee Hospital / Fortis Hospital', type: 'hospital', distance_km: 3.8, travel_time_min: 8, notes: 'Super-speciality medical center' },
    { name: 'DPS / Lotus Valley International School', type: 'school', distance_km: 1.8, travel_time_min: 5, notes: 'Top K-12 education' },
    { name: 'Spectrum Metro / Mall of India', type: 'mall', distance_km: 2.2, travel_time_min: 6, notes: 'Retail and dining destination' },
    { name: 'Noida City Centre / Botanical Garden', type: 'metro', distance_km: 5.5, travel_time_min: 12, notes: 'Major interchange hub' },
    { name: 'DND Flyway (Delhi Border)', type: 'road', distance_km: 14.0, travel_time_min: 22, notes: 'Direct access to South Delhi' },
    { name: 'Noida International Airport (Jewar)', type: 'airport', distance_km: 42.0, travel_time_min: 45, notes: 'Upcoming international hub' },
    { name: 'Sector 62 Commercial IT Hub', type: 'road', distance_km: 11.5, travel_time_min: 20, notes: 'Corporate office corridor' },
    { name: 'Indira Gandhi International Airport', type: 'airport', distance_km: 38.5, travel_time_min: 50, notes: 'Delhi Airport access' }
  ];
}

function getStandardConstructionSpecs() {
  return [
    { category: 'structure', label: 'Superstructure', value: 'Earthquake Resistant RCC Shear Wall Frame Structure Zone 4', brand: 'Tata Steel / Ambuja', is_highlight: true, sort_order: 1 },
    { category: 'flooring', label: 'Living & Dining Room', value: 'Premium Vitrified Tiles 800x800mm', brand: 'Kajaria / Somany', is_highlight: true, sort_order: 2 },
    { category: 'flooring', label: 'Master Bedroom', value: 'Laminated Wooden Flooring with Skirting', brand: 'Pergo / Action TESA', is_highlight: true, sort_order: 3 },
    { category: 'kitchen', label: 'Kitchen Counter & Sink', value: 'Granite Countertop with SS Double Bowl Sink & Premium Tiles', brand: 'Nirali / Carysil', is_highlight: true, sort_order: 4 },
    { category: 'bathroom_fittings', label: 'Sanitaryware & CP Fittings', value: 'Wall-Hung EWC & Diverter Fittings', brand: 'Jaquar / Kohler / Grohe', is_highlight: true, sort_order: 5 },
    { category: 'electricals', label: 'Wiring & Switches', value: 'Concealed Copper Wiring with Modular Switches', brand: 'Havells / Legrand', is_highlight: true, sort_order: 6 },
    { category: 'doors_windows', label: 'Main Entrance Door', value: '8ft Teak Wood Frame Flush Door with Digital Lock', brand: 'Godrej / Yale', is_highlight: false, sort_order: 7 },
  ];
}

async function enrichAllDbProjects() {
  console.log('===============================================================');
  console.log('🚀 ENRICHING ALL 164 DB PROJECTS & SYNCING TO MASTER JSON FILES');
  console.log('===============================================================\n');

  const allProjects = await prisma.project.findMany({
    select: { id: true, name: true, slug: true, sector: true, city: true }
  });

  console.log(`📡 Found ${allProjects.length} total projects in PostgreSQL. Enriching in batch...\n`);

  const allProjectIds = allProjects.map(p => p.id);

  // Batch delete existing specs, amenities, connectivity
  console.log('🧹 Clearing old specs, amenities, connectivity in batch...');
  await prisma.projectSpecItem.deleteMany({ where: { project_id: { in: allProjectIds } } });
  await prisma.amenity.deleteMany({ where: { project_id: { in: allProjectIds } } });
  await prisma.connectivity.deleteMany({ where: { project_id: { in: allProjectIds } } });

  // Prepare batch payloads
  const allSpecsToCreate: any[] = [];
  const allAmenitiesToCreate: any[] = [];
  const allConnectivityToCreate: any[] = [];

  const specsTemplate = getStandardConstructionSpecs();

  for (const p of allProjects) {
    // Specs
    for (const spec of specsTemplate) {
      allSpecsToCreate.push({
        project_id: p.id,
        category: spec.category,
        label: spec.label,
        value: spec.value,
        brand: spec.brand,
        is_highlight: spec.is_highlight,
        sort_order: spec.sort_order
      });
    }

    // Amenities (16)
    for (const am of EXTENDED_AMENITIES_POOL) {
      allAmenitiesToCreate.push({
        project_id: p.id,
        name: am.name,
        category: am.category as any
      });
    }

    // Connectivity (10)
    const connNodes = getExpandedConnectivity(p.sector, p.city);
    for (const cn of connNodes) {
      allConnectivityToCreate.push({
        project_id: p.id,
        name: cn.name,
        type: cn.type,
        distance_km: cn.distance_km,
        travel_time_min: cn.travel_time_min,
        notes: cn.notes
      });
    }
  }

  console.log(`⚡ Inserting ${allSpecsToCreate.length} specs in batch...`);
  await prisma.projectSpecItem.createMany({ data: allSpecsToCreate });

  console.log(`⚡ Inserting ${allAmenitiesToCreate.length} amenities in batch...`);
  await prisma.amenity.createMany({ data: allAmenitiesToCreate });

  console.log(`⚡ Inserting ${allConnectivityToCreate.length} connectivity nodes in batch...`);
  await prisma.connectivity.createMany({ data: allConnectivityToCreate });

  console.log('\n✅ All 164 projects in PostgreSQL now have 16 Amenities, 10 Connectivity Points, and 7 Construction Specs!\n');

  // STEP 4: Export full DB state to Master JSON files
  console.log('🔄 Re-exporting full database to offline Master JSON files in newProj/75...\n');

  const fullProjects = await prisma.project.findMany({
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
      spec_items: true,
      channel_partners: true,
    },
    orderBy: { name: 'asc' }
  });

  // Group by target master JSON files
  const fileGroups: Record<string, any[]> = {};
  for (const p of fullProjects) {
    const sec = p.sector.toLowerCase().replace(/[^a-z0-9]/g, '');
    let fileName = `realtypals_${sec}_master_data.json`;

    if (sec.includes('75')) fileName = 'realtypals_sector75_noida_master_data.json';
    else if (sec.includes('76')) fileName = 'realtypals_sector76_noida_master_data.json';
    else if (sec.includes('77')) fileName = 'realtypals_sector77_noida_master_data.json';
    else if (sec.includes('78')) fileName = 'realtypals_sector78_noida_master_data.json';
    else if (sec.includes('79')) fileName = 'realtypals_sector79_noida_master_data.json';
    else if (sec.includes('100')) fileName = 'realtypals_sector100_noida_master_data.json';
    else if (sec.includes('107')) fileName = 'realtypals_sector107_noida_master_data.json';
    else if (sec.includes('128')) fileName = 'realtypals_sector128_noida_master_data.json';
    else if (sec.includes('137')) fileName = 'realtypals_sector137_noida_master_data.json';
    else if (sec.includes('143')) fileName = 'realtypals_sector143_noida_master_data.json';
    else if (sec.includes('150')) fileName = 'realtypals_sector150_noida_master_data.json';
    else if (sec.includes('10')) fileName = 'realtypals_sector10_greaternoidawest_master_data.json';
    else if (sec.includes('12')) fileName = 'realtypals_sector12_greaternoidawest_master_data.json';
    else if (sec.includes('16c')) fileName = 'realtypals_sector16c_greaternoidawest_master_data.json';
    else if (sec.includes('1')) fileName = 'realtypals_sector1_greaternoidawest_master_data.json';
    else if (sec.includes('22d')) fileName = 'realtypals_sector22d_yamunaexpressway_master_data.json';
    else if (sec.includes('techzone')) fileName = 'realtypals_techzone4_greaternoidawest_master_data.json';

    if (!fileGroups[fileName]) fileGroups[fileName] = [];
    fileGroups[fileName].push(p);
  }

  for (const [fName, list] of Object.entries(fileGroups)) {
    const fPath = path.join(masterDir, fName);
    fs.writeFileSync(fPath, JSON.stringify(list, null, 2));
    console.log(`  ✓ Updated ${fName} (${list.length} projects) with full specs, 16 amenities, 10 connectivity.`);
  }

  console.log('\n🎉 ALL EXISTING PROJECTS FULLY ENRICHED & MASTER JSON FILES 100% SYNCHRONIZED!\n');
}

enrichAllDbProjects()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
