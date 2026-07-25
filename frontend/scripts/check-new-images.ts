import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()
const PROP_IMAGES_DIR = 'C:\\Users\\Furqan\\Desktop\\PropImages'

async function checkNewFiles() {
  const newFiles = ['eliteGolfGreens.jpg', 'golfCity75.jpg', 'sikkakKamaantraGreens79.jpg']

  for (const f of newFiles) {
    console.log(`\nChecking file: ${f}`)
    const searchTerms = f.replace(/\.(jpg|png|webp|avif)/i, '').replace(/([a-z])([A-Z])/g, '$1 $2').split(/(?=[A-Z0-9])/)
    console.log('  Search terms:', searchTerms)

    const matches = await prisma.project.findMany({
      where: {
        OR: [
          { name: { contains: 'Elite', mode: 'insensitive' } },
          { name: { contains: 'Kimaantra', mode: 'insensitive' } },
          { name: { contains: 'Kaamna', mode: 'insensitive' } },
          { name: { contains: 'Golf', mode: 'insensitive' } },
          { slug: { contains: '79', mode: 'insensitive' } }
        ]
      },
      select: { id: true, name: true, slug: true }
    })

    console.log('  Found potential DB matches:', matches)
  }
}

checkNewFiles().catch(console.error).finally(() => prisma.$disconnect())
