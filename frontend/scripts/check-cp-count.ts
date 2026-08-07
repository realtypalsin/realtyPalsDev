import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const count = await prisma.projectChannelPartner.count()
  console.log(`\n✅ Total active project channel partner links in DB: ${count}\n`)
}

main().finally(() => prisma.$disconnect())
