import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Querying public tables...')
  
  // Get all table names in public schema dynamically
  const tables: Array<{ table_name: string }> = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name != '_prisma_migrations';
  `)

  if (tables.length > 0) {
    const tableNames = tables.map(t => `"${t.table_name}"`).join(', ')
    console.log(`Truncating tables: ${tableNames}`)
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`)
    console.log('✓ Database cleared.')
  } else {
    console.log('No tables to clear.')
  }

  console.log('🌱 Running main Prisma seed.ts...')
  try {
    execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' })
  } catch (err) {
    console.error('Failed to run prisma/seed.ts', err)
  }

  console.log('🌱 Seeding JSON files from Projects...')
  const projectsDir = path.resolve(__dirname, '../../Projects')
  
  function findJsonFiles(dir: string, fileList: string[] = []) {
    if (!fs.existsSync(dir)) return fileList
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const filePath = path.join(dir, file)
      if (fs.statSync(filePath).isDirectory()) {
        findJsonFiles(filePath, fileList)
      } else if (filePath.endsWith('.json')) {
        fileList.push(filePath)
      }
    }
    return fileList
  }

  const jsonFiles = findJsonFiles(projectsDir)
  for (const jsonFile of jsonFiles) {
    console.log(`Executing seed for: ${jsonFile}`)
    try {
      execSync(`npx tsx scripts/seed-from-json.ts "${jsonFile}"`, { stdio: 'inherit' })
    } catch (err) {
      console.error(`Failed to seed ${jsonFile}`, err)
    }
  }

  console.log('\n✅ Database fully re-seeded successfully!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
