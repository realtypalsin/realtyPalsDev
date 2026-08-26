import { prisma } from '../db'
import { ChipAction, chip } from './conversationEngine'

/**
 * Find projects that the assistant named in prose.
 * DB-grounded: a name only counts if a Project row actually matches it,
 * so a hallucinated name can never become a chip (CLAUDE.md: never invent data).
 */
export async function findProjectsMentioned(
  text: string,
  city: string,
  limit = 4,
): Promise<Array<{ id: string; name: string }>> {
  if (!text || text.length < 10) return []
  try {
    const candidates = await prisma.project.findMany({
      where: { city },
      select: { id: true, name: true },
    })
    const haystack = text.toLowerCase()
    const hits: Array<{ id: string; name: string }> = []
    for (const p of candidates) {
      if (!p.name || p.name.length < 4) continue
      if (haystack.includes(p.name.toLowerCase())) hits.push({ id: p.id, name: p.name })
      if (hits.length >= limit) break
    }
    return hits
  } catch (e) {
    console.warn('[proseEntities] project match failed', e)
    return []
  }
}

/**
 * Which of the extractor's guessed project names correspond to a real row.
 *
 * `intent.projectNames` is an LLM guess, not a verified reference. Any capitalised
 * noun phrase can land there — a brokerage ("Wealth Clinic"), a bank, a person.
 * Treating that guess as a project reference sent those queries into the project
 * detail pipeline, which found nothing and offered inventory in an unrelated
 * sector. Callers should verify before routing on it.
 */
export async function resolveProjectNames(
  names: string[] | undefined,
  city: string,
): Promise<string[]> {
  if (!names?.length) return []
  try {
    const rows = await prisma.project.findMany({
      where: {
        city,
        OR: names.map((n) => ({ name: { contains: n, mode: 'insensitive' as const } })),
      },
      select: { name: true },
    })
    if (rows.length === 0) return []
    const found = rows.map((r) => r.name.toLowerCase())
    return names.filter((n) =>
      found.some((f) => f.includes(n.toLowerCase()) || n.toLowerCase().includes(f)),
    )
  } catch (e) {
    console.warn('[proseEntities] project name resolution failed', e)
    // Fail closed: an unverifiable name is treated as unverified, so the query
    // routes to the open lane (which can ask) rather than the detail pipeline
    // (which pushes inventory).
    return []
  }
}

/** Escape a project name before it goes into a RegExp — names carry '&', '(', '.', '-'. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Turn every DB-matched project name in the text into a clickable entity link.
 *
 * Skips names already linked, so it is safe to run over text that went through
 * this once. `alreadyCarded` holds ids rendered as cards on the same turn — those
 * names are left as plain text, since a link next to the card is noise.
 */
export function linkProjectNames(
  text: string,
  mentioned: Array<{ id: string; name: string }>,
  alreadyCarded: Set<string> = new Set(),
): string {
  let out = text
  for (const entity of mentioned) {
    if (alreadyCarded.has(entity.id)) continue
    if (out.includes(`](#entity:${entity.id})`)) continue
    // Explicit boundaries rather than \b: a name ending in a non-word character
    // ("M3M (Phase 1)") has no word boundary after it, so \b never matches and the
    // name silently stays unlinked.
    const pattern = new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(entity.name)}(?![A-Za-z0-9])`, 'g')
    out = out.replace(pattern, `[${entity.name}](#entity:${entity.id})`)
  }
  return out
}

/** Sectors the assistant named, in the order they appear. */
export function findSectorsMentioned(text: string, limit = 3): string[] {
  const hits = text.match(/\bSector\s+\d+[A-Za-z]?\b/gi) ?? []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of hits) {
    const normalized = raw.replace(/\s+/g, ' ').trim()
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(normalized)
    if (out.length >= limit) break
  }
  return out
}

/**
 * Chips for an answer that returned no cards, built from what the answer actually
 * said. A generic "show projects there" is dead weight when the reply named no
 * place; a chip naming the sector the user just read about is one tap from cards.
 */
export function buildOpenAnswerChips(
  projects: Array<{ id: string; name: string }>,
  sectors: string[],
): ChipAction[] {
  const out: ChipAction[] = []
  let priority = 1

  for (const sector of sectors.slice(0, 2)) {
    out.push(chip(
      `TEXT_MESSAGE:open_sector:${sector.replace(/\s+/g, '_')}`,
      'TEXT_MESSAGE', `Projects in ${sector}`,
      { text: `Show me projects in ${sector}` },
      priority++,
    ))
  }

  if (projects.length >= 2) {
    out.push(chip(
      `COMPARE_PROPERTIES:open_compare:${projects.map(p => p.id).join(':')}`,
      'COMPARE_PROPERTIES', `Compare these ${projects.length}`,
      { mode: 'multi', projects },
      priority++,
    ))
  } else if (projects.length === 1) {
    out.push(chip(
      `TEXT_MESSAGE:open_project:${projects[0].id}`,
      'TEXT_MESSAGE', `About ${projects[0].name}`,
      { text: `Tell me about ${projects[0].name}` },
      priority++,
    ))
  }

  if (sectors.length >= 2) {
    out.push(chip(
      `TEXT_MESSAGE:open_sector_compare:${sectors.slice(0, 2).join('_').replace(/\s+/g, '_')}`,
      'TEXT_MESSAGE', `${sectors[0]} vs ${sectors[1]}`,
      { text: `Compare ${sectors[0]} with ${sectors[1]}` },
      priority++,
    ))
  }

  return out
}

/** Zero-typing actions for projects the assistant named but did not return as cards. */
export function buildProseChips(projects: Array<{ id: string; name: string }>): ChipAction[] {
  if (projects.length === 0) return []
  const pIds = projects.map(p => p.id).join(':')
  const out: ChipAction[] = []

  if (projects.length >= 2) {
    out.push(chip(`COMPARE_PROPERTIES:prose_compare:${pIds}`, 'COMPARE_PROPERTIES',
      `Compare these ${projects.length}`, { mode: 'multi', projects }, 1))
  }
  out.push(
    chip(`TEXT_MESSAGE:prose_tradeoffs:${pIds}`, 'TEXT_MESSAGE', 'What are the trade-offs?',
      { actionPrefix: 'What are the main trade-offs, risks and downsides of', projects, actionSuffix: '?' }, 2),
    chip(`CALCULATE_EMI:prose_emi:${pIds}`, 'CALCULATE_EMI', 'Calculate EMI',
      { projects }, 3),
    chip(`TEXT_MESSAGE:prose_rera:${pIds}`, 'TEXT_MESSAGE', 'Check RERA status',
      { actionPrefix: 'Show the RERA registration and legal standing of', projects }, 4),
  )
  return out
}
