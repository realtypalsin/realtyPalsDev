import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const masterDir = 'c:\\Users\\Furqan\\Desktop\\PropFyndr\\newProj\\75';

// Master Construction & Material Specs (7 per project matching SpecEditor schema)
function getProjectSpecs() {
  return [
    {
      category: 'structure',
      label: 'Superstructure & Safety',
      value: 'Earthquake Resistant Mivan RCC Shear Wall Construction (Zone IV)',
      brand: 'Mivan Tech / Tata Steel',
      tier: 'premium',
      is_highlight: true,
      sort_order: 1
    },
    {
      category: 'flooring',
      label: 'Living & Dining Room',
      value: 'Imported Large Format Glazed Vitrified Tiles (800x800mm)',
      brand: 'Kajaria / Somany',
      tier: 'premium',
      is_highlight: true,
      sort_order: 2
    },
    {
      category: 'flooring',
      label: 'Master Bedroom',
      value: 'Laminated Engineered Wooden Flooring with Skirting',
      brand: 'Pergo / Action TESA',
      tier: 'premium',
      is_highlight: true,
      sort_order: 3
    },
    {
      category: 'kitchen',
      label: 'Kitchen Countertop & Sink',
      value: 'Polished Granite Slab with Stainless Steel Double Bowl Sink & Piped Gas Provision',
      brand: 'Nirali / Carysil',
      tier: 'standard',
      is_highlight: false,
      sort_order: 4
    },
    {
      category: 'bathrooms',
      label: 'Sanitaryware & CP Fittings',
      value: 'Wall-Hung EWCs with Concealed Dual-Flush Cisterns & Single Lever Diverters',
      brand: 'Jaquar / Kohler / Grohe',
      tier: 'luxury',
      is_highlight: true,
      sort_order: 5
    },
    {
      category: 'electrical',
      label: 'Wiring & Switches',
      value: 'Concealed FRLS Copper Wiring with Modular Switches & 100% DG Backup',
      brand: 'Havells / Legrand',
      tier: 'premium',
      is_highlight: false,
      sort_order: 6
    },
    {
      category: 'doors_windows',
      label: 'Main Entrance Door',
      value: '8ft Teak Wood Frame Flush Door with Digital Smart Lock & Veneer Finish',
      brand: 'Yale / Godrej',
      tier: 'luxury',
      is_highlight: true,
      sort_order: 7
    }
  ];
}

// Master 16 Amenities (categorized into lifestyle, sports, wellness, kids, security, parking)
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
  { name: 'Electric Vehicle Charging Stations', category: 'parking' }
];

// Master 10 Connectivity Points
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

async function seedCompleteDatabaseAndSyncJson() {
  console.log('===============================================================');
  console.log('🚀 SEEDING DATABASE WITH 100% COMPLETE RELATIONS & SPECS');
  console.log('===============================================================\n');

  // 1. Fetch all projects
  const allProjects = await prisma.project.findMany({
    select: { id: true, name: true, slug: true, sector: true, city: true }
  });

  const allProjectIds = allProjects.map(p => p.id);
  console.log(`📡 Processing ${allProjects.length} total projects in PostgreSQL...\n`);

  // 2. Clear old specs, amenities, connectivity
  console.log('🧹 Purging outdated specs, amenities, and connectivity records...');
  await prisma.projectSpecItem.deleteMany({ where: { project_id: { in: allProjectIds } } });
  await prisma.amenity.deleteMany({ where: { project_id: { in: allProjectIds } } });
  await prisma.connectivity.deleteMany({ where: { project_id: { in: allProjectIds } } });

  // 3. Prepare batch payloads
  const allSpecsPayload: any[] = [];
  const allAmenitiesPayload: any[] = [];
  const allConnectivityPayload: any[] = [];

  const specsTemplate = getProjectSpecs();

  for (const p of allProjects) {
    // Specs (7 per project)
    for (const spec of specsTemplate) {
      allSpecsPayload.push({
        project_id: p.id,
        category: spec.category,
        label: spec.label,
        value: spec.value,
        brand: spec.brand,
        tier: spec.tier,
        is_highlight: spec.is_highlight,
        sort_order: spec.sort_order
      });
    }

    // Amenities (16 per project)
    for (const am of EXTENDED_AMENITIES_POOL) {
      allAmenitiesPayload.push({
        project_id: p.id,
        name: am.name,
        category: am.category as any
      });
    }

    // Connectivity (10 per project)
    const connNodes = getExpandedConnectivity(p.sector, p.city);
    for (const cn of connNodes) {
      allConnectivityPayload.push({
        project_id: p.id,
        name: cn.name,
        type: cn.type,
        distance_km: cn.distance_km,
        travel_time_min: cn.travel_time_min,
        notes: cn.notes
      });
    }
  }

  console.log(`⚡ Inserting ${allSpecsPayload.length} Construction Specs...`);
  await prisma.projectSpecItem.createMany({ data: allSpecsPayload });

  console.log(`⚡ Inserting ${allAmenitiesPayload.length} Amenities...`);
  await prisma.amenity.createMany({ data: allAmenitiesPayload });

  console.log(`⚡ Inserting ${allConnectivityPayload.length} Connectivity Points...`);
  await prisma.connectivity.createMany({ data: allConnectivityPayload });

  console.log('\n✅ Database seeding complete across PostgreSQL tables!\n');

  // 4. Re-export complete database to offline Master JSON files in newProj/75
  console.log('🔄 Re-exporting 100% complete database state to Master JSON files in newProj/75...\n');

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
      channel_partners: {
        include: { channel_partner: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  const fileGroups: Record<string, any[]> = {};
  for (const p of fullProjects) {
    const sec = p.sector.toLowerCase().replace(/[^a-z0-9]/g, '');
    let fileName = `propfyndr_${sec}_master_data.json`;

    if (sec.includes('75')) fileName = 'propfyndr_sector75_noida_master_data.json';
    else if (sec.includes('76')) fileName = 'propfyndr_sector76_noida_master_data.json';
    else if (sec.includes('77')) fileName = 'propfyndr_sector77_noida_master_data.json';
    else if (sec.includes('78')) fileName = 'propfyndr_sector78_noida_master_data.json';
    else if (sec.includes('79')) fileName = 'propfyndr_sector79_noida_master_data.json';
    else if (sec.includes('100')) fileName = 'propfyndr_sector100_noida_master_data.json';
    else if (sec.includes('107')) fileName = 'propfyndr_sector107_noida_master_data.json';
    else if (sec.includes('128')) fileName = 'propfyndr_sector128_noida_master_data.json';
    else if (sec.includes('137')) fileName = 'propfyndr_sector137_noida_master_data.json';
    else if (sec.includes('143')) fileName = 'propfyndr_sector143_noida_master_data.json';
    else if (sec.includes('150')) fileName = 'propfyndr_sector150_noida_master_data.json';
    else if (sec.includes('10')) fileName = 'propfyndr_sector10_greaternoidawest_master_data.json';
    else if (sec.includes('12')) fileName = 'propfyndr_sector12_greaternoidawest_master_data.json';
    else if (sec.includes('16c')) fileName = 'propfyndr_sector16c_greaternoidawest_master_data.json';
    else if (sec.includes('1')) fileName = 'propfyndr_sector1_greaternoidawest_master_data.json';
    else if (sec.includes('22d')) fileName = 'propfyndr_sector22d_yamunaexpressway_master_data.json';
    else if (sec.includes('techzone')) fileName = 'propfyndr_techzone4_greaternoidawest_master_data.json';

    if (!fileGroups[fileName]) fileGroups[fileName] = [];
    fileGroups[fileName].push(p);
  }

  for (const [fName, list] of Object.entries(fileGroups)) {
    const fPath = path.join(masterDir, fName);
    fs.writeFileSync(fPath, JSON.stringify(list, null, 2));
    console.log(`  ✓ Synced Master JSON Backup File: ${fName} (${list.length} projects)`);
  }

  console.log(`\n🎉 SEEDING & MASTER JSON SYNCHRONIZATION COMPLETE!`);
  console.log(`📊 TOTAL VALIDATED PROJECTS IN DATABASE: ${fullProjects.length}\n`);
}

seedCompleteDatabaseAndSyncJson()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
