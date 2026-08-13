import { PrismaClient } from '@prisma/client';
import { computeCompleteness } from '../src/lib/completeness';

const prisma = new PrismaClient();

async function verify() {
  console.log('\n📊 Verifying Project Completeness Scores across Database...\n');

  const projects = await prisma.project.findMany({
    include: {
      builder: { select: { id: true, name: true } },
      unit_types: true,
      images: true,
      amenities: true,
      connectivity: true,
      dna: true,
      decision_profile: true,
      persona_profile: true,
      recommendation_profile: true,
      competitors: true,
      cost_sheet: true,
      payment_plans: true,
      construction_milestones: true,
      construction_updates: true,
      lifecycle_updates: true,
      price_history: true,
      channel_partners: true,
    },
    take: 5,
  });

  for (const p of projects) {
    const res = computeCompleteness(p as any);
    console.log(`🏠 Project: ${p.name} (${p.sector})`);
    console.log(`   Overall Health Score: ${res.totalScore}%`);
    console.log(`   Tab Breakdown:`, res.tabScores);
    console.log(`   Missing Items:`, res.missing);
    console.log('---');
  }

  await prisma.$disconnect();
}

verify();
