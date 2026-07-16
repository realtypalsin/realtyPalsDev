import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.findUnique({
    where: { slug: 'ivy-county-sector-75-noida' },
    include: { builder: true }
  });
  console.log('Project builder details:', project?.builder);
}

main().finally(() => prisma.$disconnect());
