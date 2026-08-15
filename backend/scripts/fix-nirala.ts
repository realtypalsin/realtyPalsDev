import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixNirala() {
  const p = await prisma.project.findFirst({ where: { name: { contains: 'Nirala Diadem', mode: 'insensitive' } } });
  if (p) {
    await prisma.projectDna.upsert({
      where: { project_id: p.id },
      update: { builder_score: 91, price_score: 89, location_score: 93, legal_score: 96, amenity_score: 90, possession_score: 94 },
      create: { project_id: p.id, builder_score: 91, price_score: 89, location_score: 93, legal_score: 96, amenity_score: 90, possession_score: 94 }
    });
    console.log('✓ Fixed Nirala Diadem DNA');
  }
}
fixNirala().finally(() => prisma.$disconnect());
