import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding HNSW index on projects.embedding...')

  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`)

  // HNSW with cosine distance — matches the <=> operator used in searchProjects
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS projects_embedding_hnsw_idx
    ON projects
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
  `)

  console.log('✓ HNSW index created (or already exists)')

  const result = await prisma.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'projects' AND indexname = 'projects_embedding_hnsw_idx'
  `

  if (result.length > 0) {
    console.log('✓ Verified: index present in pg_indexes')
  } else {
    console.error('✗ Index NOT found — check pgvector version (requires ≥ 0.5.0)')
    process.exit(1)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
