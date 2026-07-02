const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const proj = await prisma.project.findFirst({
    where: { slug: '3c-lotus-300-sector-107-noida' },
    include: { images: true }
  });
  console.log('hero_image_url:', proj.hero_image_url);
  console.log('images:', proj.images);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
