import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSpecs() {
  const totalProjects = await prisma.project.count();
  const projectsWithSpecs = await prisma.project.count({
    where: { spec_items: { some: {} } }
  });
  console.log(`📊 Total Projects in DB: ${totalProjects}`);
  console.log(`📊 Projects with spec_items: ${projectsWithSpecs}`);
}

checkSpecs().finally(() => prisma.$disconnect());
