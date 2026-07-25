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

/** Zero-typing actions for projects the assistant named but did not return as cards. */
export function buildProseChips(projects: Array<{ id: string; name: string }>): ChipAction[] {
  if (projects.length === 0) return []
  const pIds = projects.map(p => p.id).join(':')
  const out: ChipAction[] = []

  if (projects.length >= 2) {
    out.push(chip(`COMPARE_PROPERTIES:prose_compare:${pIds}`, 'COMPARE_PROPERTIES',
      `Compare these ${projects.length}`, '', { mode: 'multi', projects }, 1))
  }
  out.push(
    chip(`TEXT_MESSAGE:prose_tradeoffs:${pIds}`, 'TEXT_MESSAGE', 'What are the trade-offs?', '',
      { actionPrefix: 'What are the main trade-offs, risks and downsides of', projects, actionSuffix: '?' }, 2),
    chip(`CALCULATE_EMI:prose_emi:${pIds}`, 'CALCULATE_EMI', 'Calculate EMI', '',
      { projects }, 3),
    chip(`TEXT_MESSAGE:prose_rera:${pIds}`, 'TEXT_MESSAGE', 'Check RERA status', '',
      { actionPrefix: 'Show the RERA registration and legal standing of', projects }, 4),
  )
  return out
}
