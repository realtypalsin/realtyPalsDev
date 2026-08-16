import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_LIST: Record<string, string[]> = {
  'Zone 1: Greater Noida Core': [
    'Jaypee Greens Golf Course Residences',
    'Purvanchal Royal City',
    'Godrej Golf Links & The Crest',
    'ATS Dolce',
    'Nimbus Express Park View',
    'Eldeco Green Meadows',
    'Stellar MI City Homes',
    'Migsun Ultimo'
  ],
  'Zone 2: Noida Expressway Super-Luxury': [
    'Supertech Supernova',
    'ATS Knightsbridge',
    'Jaypee Greens Wish Town Klassic',
    'Jaypee Greens Kalypso Court',
    'Jaypee Greens Pavilion Court',
    'Jaypee Greens Kosmos',
    'Jaypee Greens Aman',
    'Gulshan Dynasty',
    'Godrej Tropical Isle',
    'Ace Starlit',
    'Eldeco Live By The Greens',
    'Paras Tierea',
    'Paras Seasons'
  ],
  'Zone 3: Noida Central Established Belt': [
    'Mahagun Moderne',
    'Amrapali Eden Park',
    'ATS One Hamlet',
    'Lotus Boulevard',
    'Lotus 300',
    'ABA Cleo County',
    'Prateek Fedicia',
    'Amrapali Zodiac',
    'Amrapali Silicon City',
    'Antriksh Golf View'
  ],
  'Zone 4: Greater Noida West High-Density': [
    'Eros Sampoornam',
    'Nirala Aspire',
    'Nirala Estate Phase 2',
    'Spring Meadows',
    'Stellar Jeevan',
    'Supertech Eco Village 1',
    'Supertech Eco Village 2',
    'Supertech Eco Village 3',
    'RG Luxury Homes',
    'Hawelia Valencia Homes',
    'Trident Embassy'
  ],
  'Zone 5: Yamuna Expressway & Jewar Corridor': [
    'Gaur Yamuna City (7th Parkview)',
    'Gaur Yamuna City (16th Parkview)',
    'Gaur Yamuna City (32nd Parkview)',
    'Gaur Yamuna City (Victorian Villas)',
    'Supertech Upcountry (Golf Village)',
    'ATS Allure',
    'Orris Greenbay Golf Homes',
    'Supertech Golf Country',
    'Jaypee Sports City (Kassia)'
  ]
};

async function auditTargetList() {
  console.log('========================================================================');
  console.log('📋 AUDITING TARGET PROJECT LIST AGAINST DATABASE');
  console.log('========================================================================\n');

  const allDbProjects = await prisma.project.findMany({
    select: { id: true, name: true, slug: true, sector: true, city: true }
  });

  const dbNames = allDbProjects.map(p => p.name.toLowerCase());
  const dbSlugs = allDbProjects.map(p => p.slug.toLowerCase());

  let totalTarget = 0;
  let totalFound = 0;
  let totalMissing = 0;

  for (const [zone, projects] of Object.entries(TARGET_LIST)) {
    console.log(`\n📍 ${zone} (${projects.length} targets):`);
    for (const target of projects) {
      totalTarget++;
      const matched = allDbProjects.find(p => 
        p.name.toLowerCase().includes(target.toLowerCase().split('(')[0].trim()) ||
        target.toLowerCase().includes(p.name.toLowerCase()) ||
        p.slug.toLowerCase().includes(target.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15))
      );

      if (matched) {
        totalFound++;
        console.log(`  ✅ [FOUND] ${target.padEnd(40)} -> DB: "${matched.name}" (${matched.sector}, ${matched.city})`);
      } else {
        totalMissing++;
        console.log(`  ❌ [MISSING] ${target}`);
      }
    }
  }

  console.log('\n------------------------------------------------------------------------');
  console.log(`📊 TOTAL TARGET PROJECTS AUDITED : ${totalTarget}`);
  console.log(`✅ ALREADY IN DATABASE          : ${totalFound} (${Math.round((totalFound/totalTarget)*100)}%)`);
  console.log(`❌ REMAINING TO SEED            : ${totalMissing}`);
  console.log('------------------------------------------------------------------------');
}

auditTargetList()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
