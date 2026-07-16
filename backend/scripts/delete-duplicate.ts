import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const duplicateSlug = 'the-hyde-park-sector-78-noida';
  
  console.log(`Checking for duplicate project: ${duplicateSlug}`);
  const project = await prisma.project.findUnique({
    where: { slug: duplicateSlug }
  });
  
  if (project) {
    console.log(`Deleting project: ${duplicateSlug}...`);
    // Delete cascading requires deleting relations first if not configured with onDelete: Cascade
    // Just directly deleting the project.
    await prisma.project.delete({
      where: { id: project.id }
    });
    console.log(`Successfully deleted duplicate project: ${duplicateSlug}`);
  } else {
    console.log(`Project ${duplicateSlug} not found.`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
