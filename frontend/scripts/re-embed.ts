/**
 * Clear all embeddings and regenerate from scratch.
 * Run after bulk data changes (status fixes, description updates, etc.)
 * Run: npm run db:re-embed
 */
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { execSync } from 'child_process'

dotenv.config({ path: path.join(__dirname, '../.env') })
const prisma = new PrismaClient()

async function main() {
  console.log('Clearing all embeddings...')
  await prisma.$executeRaw`UPDATE projects SET embedding = NULL`
  const count = await prisma.project.count()
  console.log(`Cleared embeddings for ${count} projects.`)
  console.log('Re-running generate-embeddings...\n')
  execSync('tsx scripts/generate-embeddings.ts', { stdio: 'inherit', cwd: path.join(__dirname, '..') })
}

main().catch(console.error).finally(() => prisma.$disconnect())
