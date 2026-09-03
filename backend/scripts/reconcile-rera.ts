#!/usr/bin/env node
/**
 * Gather evidence on which project each shared registration number belongs to.
 *
 * `npm run reconcile:rera`               evidence report
 * `npm run reconcile:rera -- --json`     machine-readable, for a spreadsheet
 *
 * **This script writes nothing, and that is deliberate.**
 *
 * 18 registration numbers are shared across 39 projects. The chat withholds an
 * ambiguous number (see reraIntegrity.ts), which is safe but is not the fix —
 * the fix is knowing which project owns which number.
 *
 * A web search is evidence, not authority. The authority is the UP-RERA record,
 * and the harm being prevented is precisely a confidently wrong registration
 * number: writing a number this script inferred would substitute one guess for
 * another while making it look resolved. So it produces a work list with the
 * evidence attached, ranked by how safe each cluster is to act on, and a human
 * decides.
 *
 * Two kinds of cluster need two different fixes, and the script labels them:
 *
 *   DUPLICATE ROW — the same project entered twice. Merge and repoint the
 *                   foreign keys. No number is in doubt.
 *   COLLISION     — different projects, one number. At most one of them is
 *                   right, and possibly neither.
 */
import { prisma } from '../src/lib/db'
import { tavilySearch } from '../src/lib/ai/tavily'
import { normalizeRera } from '../src/lib/reraIntegrity'

interface Candidate {
  id: string
  name: string
  slug: string
  sector: string
  builder: string | null
  /** How many times the web evidence mentions this project alongside the number. */
  mentions: number
}

interface Cluster {
  rera: string
  kind: 'DUPLICATE ROW' | 'COLLISION'
  candidates: Candidate[]
  evidence: string[]
  /** The candidate the evidence points at, when it points at exactly one. */
  suggested: string | null
  confidence: 'none' | 'weak' | 'clear'
}

/** Distinctive words of a project name, for matching against a web snippet. */
function keywords(name: string): string[] {
  const GENERIC = /^(the|and|of|phase|sector|noida|greater|west|city|county|park|greens?|heights?|towers?|estate|residency|apartments?|homes?|group|project)$/i
  return name
    .split(/[^A-Za-z0-9]+/)
    .filter((w) => w.length >= 4 && !GENERIC.test(w))
    .map((w) => w.toLowerCase())
}

async function main(): Promise<void> {
  const asJson = process.argv.includes('--json')

  const rows = await prisma.project.findMany({
    select: { id: true, name: true, slug: true, sector: true, rera_number: true, builder: { select: { name: true } } },
    orderBy: { name: 'asc' },
  })

  const byRera = new Map<string, typeof rows>()
  for (const r of rows) {
    const key = normalizeRera(r.rera_number)
    if (!key) continue
    byRera.set(key, [...(byRera.get(key) ?? []), r])
  }

  const shared = [...byRera.entries()].filter(([, v]) => v.length > 1)
  if (shared.length === 0) {
    console.log('No shared registration numbers. Nothing to reconcile.')
    return
  }

  const clusters: Cluster[] = []

  for (const [rera, group] of shared) {
    /**
     * A duplicate row is not always a byte-identical name.
     *
     * "ATS Happy Trails" and "ATS Homekraft Happy Trails" — same builder, same
     * sector, one name a substring of the other — is one project entered twice,
     * and the first version of this script filed it as a COLLISION because the
     * strings differ. That put a safe merge in the pile that needs the
     * authority record, which is the pile nobody can clear from here.
     */
    const names = group.map((g) => g.name.toLowerCase().trim())
    const distinctNames = new Set(names)
    const sameBuilderAndSector =
      new Set(group.map((g) => `${g.builder?.name ?? '?'}|${g.sector}`)).size === 1
    /**
     * Word subset, not substring.
     *
     * "ATS Happy Trails" and "ATS Homekraft Happy Trails" are the same project,
     * and neither string contains the other — the extra word sits in the
     * middle. Substring containment missed it and filed a safe merge into the
     * pile that needs the authority record.
     */
    const wordSets = names.map((n) => new Set(n.split(/[^a-z0-9]+/).filter(Boolean)))
    const oneNameContainsTheOthers = wordSets.every((a) =>
      wordSets.some(
        (b) => a !== b && ([...a].every((w) => b.has(w)) || [...b].every((w) => a.has(w))),
      ),
    )
    const kind: Cluster['kind'] =
      distinctNames.size === 1 || (sameBuilderAndSector && oneNameContainsTheOthers)
        ? 'DUPLICATE ROW'
        : 'COLLISION'

    const candidates: Candidate[] = group.map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      sector: g.sector,
      builder: g.builder?.name ?? null,
      mentions: 0,
    }))

    const evidence: string[] = []

    // A duplicate row needs no external evidence — the number is not in doubt,
    // only which of two identical rows survives. Don't spend a search on it.
    if (kind === 'COLLISION') {
      try {
        const { answer, results } = await tavilySearch(`"${rera}" UP RERA Noida project`, 5)

        /**
         * Only count a keyword that appears in a passage which also names the
         * registration number.
         *
         * The first version scored keywords against every snippet the search
         * returned, and the search returns generic UP-RERA news. "Mahagun
         * Manorialle" scored a hit because an Economic Times piece about a
         * different stalled project contained the word "Greens"; three
         * clusters were reported as "weak evidence" on exactly that basis.
         *
         * Evidence that does not mention the number is not evidence about the
         * number. Scoring it produced a confident-looking arrow pointing at a
         * project for no reason, which in a reconciliation tool for the
         * highest-trust field in the product is worse than reporting nothing.
         */
        const relevant = [answer, ...results.map((r) => `${r.title} ${r.content}`)]
          .filter((passage) => passage && passage.toUpperCase().includes(rera))
        const haystack = relevant.join(' ').toLowerCase()

        for (const c of candidates) {
          const words = keywords(c.name)
          c.mentions = words.filter((w) => haystack.includes(w)).length
        }

        if (relevant.length === 0) {
          evidence.push('no returned passage mentions this registration number')
        }
        if (answer && answer.toUpperCase().includes(rera)) evidence.push(`answer: ${answer.slice(0, 220)}`)
        for (const r of results.filter((r) => `${r.title} ${r.content}`.toUpperCase().includes(rera)).slice(0, 3)) {
          evidence.push(`${r.title} — ${r.url}`)
        }
      } catch (e) {
        evidence.push(`search failed: ${(e as Error).message}`)
      }
    }

    const ranked = [...candidates].sort((a, b) => b.mentions - a.mentions)
    const top = ranked[0]
    const second = ranked[1]
    let confidence: Cluster['confidence'] = 'none'
    let suggested: string | null = null
    if (kind === 'COLLISION' && top && top.mentions > 0) {
      // "Clear" only when one candidate is mentioned and the others are not at
      // all. Anything less is a hint for a human, not an answer.
      const clear = top.mentions >= 2 && (!second || second.mentions === 0)
      confidence = clear ? 'clear' : 'weak'
      suggested = top.name
    }

    clusters.push({ rera, kind, candidates, evidence, suggested, confidence })
  }

  if (asJson) {
    console.log(JSON.stringify(clusters, null, 2))
    return
  }

  const dupes = clusters.filter((c) => c.kind === 'DUPLICATE ROW')
  const collisions = clusters.filter((c) => c.kind === 'COLLISION')
  const affected = clusters.reduce((n, c) => n + c.candidates.length, 0)

  console.log(`${rows.length} projects · ${clusters.length} shared registration numbers · ${affected} projects affected`)
  console.log(`  duplicate rows: ${dupes.length}   collisions: ${collisions.length}\n`)

  console.log('── DUPLICATE ROWS — merge, no number in doubt ' + '─'.repeat(28))
  for (const c of dupes) {
    console.log(`\n${c.rera}`)
    for (const cand of c.candidates) console.log(`   ${cand.name} — ${cand.builder ?? 'no builder'} — ${cand.sector} — ${cand.slug}`)
  }

  console.log('\n\n── COLLISIONS — at most one of these owns the number ' + '─'.repeat(21))
  const order = { clear: 0, weak: 1, none: 2 } as const
  for (const c of [...collisions].sort((a, b) => order[a.confidence] - order[b.confidence])) {
    console.log(`\n${c.rera}   [evidence: ${c.confidence}]`)
    for (const cand of [...c.candidates].sort((a, b) => b.mentions - a.mentions)) {
      const mark = c.suggested === cand.name && c.confidence !== 'none' ? '->' : '  '
      console.log(`   ${mark} ${cand.name} — ${cand.builder ?? 'no builder'} — ${cand.sector}   (${cand.mentions} keyword hits)`)
    }
    for (const e of c.evidence.slice(0, 3)) console.log(`      ${e.slice(0, 120)}`)
  }

  const clear = collisions.filter((c) => c.confidence === 'clear').length
  console.log(`\n\n${clear} of ${collisions.length} collisions have clear web evidence.`)
  console.log('Web evidence is not the authority. Confirm each against the UP-RERA record before')
  console.log('editing a row: a confidently wrong registration number is the harm this avoids.')
  console.log('\nUntil a row is corrected the chat withholds that number and says why, so no')
  console.log('buyer is shown one — this list is the work, not a blocker.')
}

main().finally(() => prisma.$disconnect())
