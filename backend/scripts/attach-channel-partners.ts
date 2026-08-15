import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function attachChannelPartners() {
  // Ensure default channel partner exists
  const partner = await prisma.channelPartner.upsert({
    where: { slug: 'realtypals-direct-partner-network' },
    update: {},
    create: {
      name: 'RealtyPals Verified Partner Network',
      slug: 'realtypals-direct-partner-network',
      type: 'agency',
      description: 'Official verified broker network for NCR developments.',
      operating_cities: ['Noida', 'Greater Noida'],
      is_verified: true,
      rera_compliant: true,
      credai_member: true
    }
  });

  const projectsWithoutCP = await prisma.project.findMany({
    where: { channel_partners: { none: {} } }
  });

  for (const p of projectsWithoutCP) {
    await prisma.projectChannelPartner.create({
      data: {
        project_id: p.id,
        channel_partner_id: partner.id,
        is_featured: true
      }
    });
  }

  console.log(`✅ Linked ${projectsWithoutCP.length} projects to official channel partner network.`);
}

attachChannelPartners()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
