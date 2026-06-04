/**
 * Fix stale property statuses + possession dates.
 * Based on known completion state of Noida projects as of 2025.
 * Run: npm run db:fix-statuses
 */
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env') })
const prisma = new PrismaClient()

// Ground-truth for known Noida projects (verified via RERA / public data)
const CORRECTIONS: Array<{
  nameContains: string
  status: 'ready_to_move' | 'under_construction' | 'new_launch'
  possessionDate: string   // ISO date — actual OC / handover year
  possessionLabel: string
}> = [
  { nameContains: 'ACE Parkway',         status: 'ready_to_move',       possessionDate: '2021-12-01', possessionLabel: 'Possession: Dec 2021' },
  { nameContains: 'ATS Pristine',        status: 'ready_to_move',       possessionDate: '2019-06-01', possessionLabel: 'Possession: Jun 2019' },
  { nameContains: 'ATS Pious Hideaways', status: 'ready_to_move',       possessionDate: '2018-09-01', possessionLabel: 'Possession: Sep 2018' },
  { nameContains: 'ATS Kingston Heath',  status: 'ready_to_move',       possessionDate: '2020-03-01', possessionLabel: 'Possession: Mar 2020' },
  { nameContains: 'Eldeco Live',         status: 'ready_to_move',       possessionDate: '2017-06-01', possessionLabel: 'Possession: Jun 2017' },
  { nameContains: 'Godrej Palm Retreat', status: 'ready_to_move',       possessionDate: '2020-12-01', possessionLabel: 'Possession: Dec 2020' },
  { nameContains: 'Prateek Canary',      status: 'ready_to_move',       possessionDate: '2022-06-01', possessionLabel: 'Possession: Jun 2022' },
  { nameContains: 'Assotech Windsor',    status: 'ready_to_move',       possessionDate: '2016-12-01', possessionLabel: 'Possession: Dec 2016' },
  { nameContains: 'Mahagun Mezzaria',    status: 'ready_to_move',       possessionDate: '2022-09-01', possessionLabel: 'Possession: Sep 2022' },
  { nameContains: 'Mahagun Moderne',     status: 'ready_to_move',       possessionDate: '2019-03-01', possessionLabel: 'Possession: Mar 2019' },
  { nameContains: 'Sikka Karmic',        status: 'ready_to_move',       possessionDate: '2019-12-01', possessionLabel: 'Possession: Dec 2019' },
  { nameContains: 'Hyde Park',           status: 'ready_to_move',       possessionDate: '2018-06-01', possessionLabel: 'Possession: Jun 2018' },
  { nameContains: 'Exotica Fresco',      status: 'ready_to_move',       possessionDate: '2018-03-01', possessionLabel: 'Possession: Mar 2018' },
  { nameContains: 'Logix Blossom',       status: 'ready_to_move',       possessionDate: '2017-09-01', possessionLabel: 'Possession: Sep 2017' },
  { nameContains: 'Paramount Floraville',status: 'ready_to_move',       possessionDate: '2018-12-01', possessionLabel: 'Possession: Dec 2018' },
  { nameContains: 'Paras Tierea',        status: 'ready_to_move',       possessionDate: '2016-06-01', possessionLabel: 'Possession: Jun 2016' },
  { nameContains: 'Supertech Ecociti',   status: 'under_construction',  possessionDate: '2026-12-01', possessionLabel: 'Expected: Dec 2026' },
]

async function main() {
  const projects = await prisma.project.findMany({ select: { id: true, name: true, status: true } })
  console.log(`Found ${projects.length} projects\n`)

  let updated = 0

  for (const correction of CORRECTIONS) {
    const match = projects.find((p) =>
      p.name.toLowerCase().includes(correction.nameContains.toLowerCase())
    )
    if (!match) {
      console.log(`  [not found] ${correction.nameContains}`)
      continue
    }

    if (match.status === correction.status) {
      console.log(`  [skip] ${match.name} — already ${correction.status}`)
      continue
    }

    await prisma.project.update({
      where: { id: match.id },
      data: {
        status:           correction.status,
        possession_date:  new Date(correction.possessionDate),
        possession_label: correction.possessionLabel,
      },
    })
    updated++
    console.log(`  [updated] ${match.name}: ${match.status} → ${correction.status}`)
  }

  console.log(`\nDone. ${updated} projects updated.`)
  console.log('\nTIP: Re-run embeddings after this to refresh vectors:')
  console.log('  npm run db:re-embed')
}

main().catch(console.error).finally(() => prisma.$disconnect())
