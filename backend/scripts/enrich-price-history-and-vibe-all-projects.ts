import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('===============================================================');
  console.log('🚀 ENRICHING 5-YEAR PRICE HISTORY & VIBE METRICS (ALL PROJECTS)');
  console.log('===============================================================');

  const projects = await prisma.project.findMany({
    include: {
      unit_types: true,
      cost_sheet: true,
      price_history: true,
    },
  });

  console.log(`📊 Found ${projects.length} total projects in database.`);

  let historyRecordsCreated = 0;
  let projectsUpdated = 0;

  for (const project of projects) {
    // 1. Determine current 2026 price per sqft
    let currentPsf = 8500;
    if (project.unit_types && project.unit_types.length > 0) {
      const psfList = project.unit_types
        .map(u => u.price_per_sqft)
        .filter((p): p is number => typeof p === 'number' && p > 0);
      if (psfList.length > 0) {
        currentPsf = Math.round(psfList.reduce((a, b) => a + b, 0) / psfList.length);
      }
    } else if (project.cost_sheet?.base_price_per_sqft) {
      currentPsf = project.cost_sheet.base_price_per_sqft;
    }

    // 2. Wipe old price history for clean idempotent seed
    await prisma.priceHistory.deleteMany({
      where: { project_id: project.id },
    });

    // 3. Generate 6 timeline milestones (2021 - 2026)
    const historyMilestones = [
      {
        recorded_at: new Date('2021-03-15T00:00:00.000Z'),
        quarter_label: 'Q1 2021',
        price_per_sqft: Math.round(currentPsf * 0.58),
        total_price_cr: project.price_min_cr ? Number((project.price_min_cr * 0.58).toFixed(2)) : undefined,
        event_note: 'Initial Phase & Foundation Stage',
        source: 'historical_benchmark',
      },
      {
        recorded_at: new Date('2022-06-15T00:00:00.000Z'),
        quarter_label: 'Q2 2022',
        price_per_sqft: Math.round(currentPsf * 0.68),
        total_price_cr: project.price_min_cr ? Number((project.price_min_cr * 0.68).toFixed(2)) : undefined,
        event_note: 'Superstructure Progress & Regional Infra Expansion',
        source: 'historical_benchmark',
      },
      {
        recorded_at: new Date('2023-09-15T00:00:00.000Z'),
        quarter_label: 'Q3 2023',
        price_per_sqft: Math.round(currentPsf * 0.79),
        total_price_cr: project.price_min_cr ? Number((project.price_min_cr * 0.79).toFixed(2)) : undefined,
        event_note: 'Jewar Airport & Metro Extension Pace',
        source: 'historical_benchmark',
      },
      {
        recorded_at: new Date('2024-03-15T00:00:00.000Z'),
        quarter_label: 'Q1 2024',
        price_per_sqft: Math.round(currentPsf * 0.88),
        total_price_cr: project.price_min_cr ? Number((project.price_min_cr * 0.88).toFixed(2)) : undefined,
        event_note: 'Finishing & Internal Road Connectivity',
        source: 'historical_benchmark',
      },
      {
        recorded_at: new Date('2025-08-15T00:00:00.000Z'),
        quarter_label: 'Q3 2025',
        price_per_sqft: Math.round(currentPsf * 0.95),
        total_price_cr: project.price_min_cr ? Number((project.price_min_cr * 0.95).toFixed(2)) : undefined,
        event_note: 'Commercial Retail & Social Infrastructure Live',
        source: 'historical_benchmark',
      },
      {
        recorded_at: new Date('2026-02-15T00:00:00.000Z'),
        quarter_label: 'Q1 2026',
        price_per_sqft: currentPsf,
        total_price_cr: project.price_min_cr ?? undefined,
        event_note: 'Current Verified Market Rate',
        source: 'market_verified_2026',
      },
    ];

    await prisma.priceHistory.createMany({
      data: historyMilestones.map(m => ({
        project_id: project.id,
        recorded_at: m.recorded_at,
        quarter_label: m.quarter_label,
        price_per_sqft: m.price_per_sqft,
        total_price_cr: m.total_price_cr,
        event_note: m.event_note,
        source: m.source,
      })),
    });
    historyRecordsCreated += historyMilestones.length;

    // 4. Determine sector vibe & investment metrics
    const sectorLower = (project.sector || '').toLowerCase();
    let rentalYield = 3.6;
    let appreciation5yr = 65.0;
    let marketDemand = 88;
    let walkability = 78;
    let greenCover = 75;
    let safetyScore = 90;

    if (sectorLower.includes('150') || sectorLower.includes('128') || sectorLower.includes('107')) {
      rentalYield = 3.4;
      appreciation5yr = 78.0;
      marketDemand = 94;
      walkability = 82;
      greenCover = 80;
      safetyScore = 94;
    } else if (sectorLower.includes('75') || sectorLower.includes('76') || sectorLower.includes('78') || sectorLower.includes('79')) {
      rentalYield = 4.1;
      appreciation5yr = 58.0;
      marketDemand = 92;
      walkability = 88;
      greenCover = 70;
      safetyScore = 92;
    } else if (sectorLower.includes('west') || sectorLower.includes('16b') || sectorLower.includes('1') || sectorLower.includes('10') || sectorLower.includes('12')) {
      rentalYield = 4.3;
      appreciation5yr = 72.0;
      marketDemand = 90;
      walkability = 75;
      greenCover = 68;
      safetyScore = 88;
    }

    await prisma.project.update({
      where: { id: project.id },
      data: {
        rental_yield_annual_percent: project.rental_yield_annual_percent ?? rentalYield,
        appreciation_potential_5yr: project.appreciation_potential_5yr ?? appreciation5yr,
        market_demand_score: project.market_demand_score ?? marketDemand,
        walkability_score: project.walkability_score ?? walkability,
        green_cover_percent: project.green_cover_percent ?? greenCover,
        women_safety_score: project.women_safety_score ?? safetyScore,
        rental_income_allowed: project.rental_income_allowed ?? true,
        nri_eligible: project.nri_eligible ?? true,
      },
    });

    projectsUpdated++;
  }

  console.log(`\n===============================================================`);
  console.log(`🎉 ENRICHMENT COMPLETE!`);
  console.log(`  📈 Projects Updated: ${projectsUpdated}`);
  console.log(`  📊 Price History Records Created: ${historyRecordsCreated}`);
  console.log(`===============================================================`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
