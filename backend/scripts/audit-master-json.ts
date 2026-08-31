// backend/scripts/audit-master-json.ts
//
//   npx tsx scripts/audit-master-json.ts
//
// Does the database match the master JSON files it was seeded from?
//
// `newProj/75/*.json` is the offline record. If a project exists there and not
// in the database, the chat cannot answer about it — and nobody finds out until
// a buyer asks. If it exists in the database and not there, the offline backup
// is no longer a backup.

import 'dotenv/config'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DIR = join(__dirname, '..', '..', 'newProj', '75')
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

async function main() {
  const inJson = new Map<string, string>()
  let files = 0
  for (const f of readdirSync(DIR)) {
    if (!f.endsWith('.json')) continue
    files++
    let parsed: unknown
    try { parsed = JSON.parse(readFileSync(join(DIR, f), 'utf8')) } catch { console.log(`  ⚠ unparseable: ${f}`); continue }
    const records = Array.isArray(parsed) ? parsed : Object.values(parsed as Record<string, unknown>)
    for (const r of records) {
      const name = (r as { name?: string; project_name?: string })?.name
        ?? (r as { project_name?: string })?.project_name
      if (typeof name === 'string' && name.trim()) inJson.set(norm(name), name.trim())
    }
  }

  const dbRows = await prisma.project.findMany({ select: { name: true, sector: true } })
  const inDb = new Map(dbRows.map((p) => [norm(p.name), p]))

  const missingFromDb = [...inJson.entries()].filter(([k]) => !inDb.has(k))
  const missingFromJson = [...inDb.entries()].filter(([k]) => !inJson.has(k))

  console.log(`\n${'='.repeat(66)}\nMASTER JSON vs DATABASE\n${'='.repeat(66)}`)
  console.log(`\n  ${files} JSON files hold ${inJson.size} distinct project names`)
  console.log(`  database holds ${inDb.size}`)
  console.log(`  in BOTH: ${inJson.size - missingFromDb.length}`)

  console.log(`\n  ${missingFromDb.length} in JSON but NOT in the database`)
  console.log('  (a buyer asking about these gets "not in our records")')
  missingFromDb.slice(0, 25).forEach(([, n]) => console.log(`    ${n}`))
  if (missingFromDb.length > 25) console.log(`    …and ${missingFromDb.length - 25} more`)

  console.log(`\n  ${missingFromJson.length} in the database but NOT in any JSON`)
  console.log('  (these exist only in Postgres — the offline copy would not restore them)')
  missingFromJson.slice(0, 15).forEach(([, p]) => console.log(`    ${p.name} [${p.sector}]`))
  if (missingFromJson.length > 15) console.log(`    …and ${missingFromJson.length - 15} more`)
  console.log('')
}

main().catch((e) => { console.error(e); process.exitCode = 1 }).finally(() => prisma.$disconnect())
