// backend/src/lib/chat/coverageAnswer.ts

import { prisma } from '../db'

export interface CoverageAnswer {
  text: string
  /** Projects to render, when the builder IS one we hold. */
  projects?: Array<{ name: string; sector: string | null; price_min_cr: number | null; status: string | null; builder: { name: string } | null }>
  /** Drives the chips shown alongside. */
  kind: 'builder_absent' | 'builder_held' | 'sector_thin' | 'sector_absent'
  /** Names worth offering as the next step. */
  alternatives: string[]
}

/** Brand-shaped tokens in a builder question. */
/** Case-insensitive: real queries arrive as "godrej properties in noida", and a capitals-only rule matched none of them. */
const BUILDER_QUESTION =
  /\b([a-z][a-z&.]{2,}(?:\s+[a-z][a-z&.]{2,})?)\s+(?:properties|projects|group|builders?|developers?|homes|infra|realty)\b/i

/** Words that look like a brand but are ours, generic, or a place. */
const NOT_A_BUILDER =
  /^(the|new|best|top|all|any|noida|greater|delhi|ncr|sector|realtypals|ready|under|luxury|premium|residential|commercial|upcoming|verified|bhk|flat|flats|apartment|apartments|house|home|homes|good|cheap|affordable|these|those|such|more|other)$/i

function normalise(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
}

/** A builder named in the message that we hold no projects for. */
export async function builderCoverage(message: string): Promise<CoverageAnswer | null> {
  const match = message.match(BUILDER_QUESTION)
  if (!match) return null

  const raw = match[1].trim()
  const first = raw.split(/\s+/)[0]
  if (NOT_A_BUILDER.test(first)) return null

  const wanted = normalise(raw)
  // Four characters minimum: three-letter tokens are almost all generic.
  if (wanted.length < 4) return null

  try {
    const builders = await prisma.builder.findMany({ select: { name: true } })
    // Word-boundary match, not substring. "best 3 bhk projects" captured "bhk",
    // which is a substring of "Shubhkamna" — so a routine sector question was
    // answered as a question about a builder nobody had named.
    const held = builders.find((b) => {
      const words = normalise(b.name).split(' ')
      return words.includes(wanted) || wanted.split(' ').every((w) => words.includes(w))
    })

    // We hold this builder. Answering with a city rate table that never names
    // them — which is what happened for "godrej properties in noida" — is worse
    // than saying nothing: eight Godrej projects sat in the same database.
    if (held) {
      const projects = await prisma.project.findMany({
        where: { builder: { name: { equals: held.name } } },
        select: {
          name: true,
          sector: true,
          price_min_cr: true,
          status: true,
          builder: { select: { name: true } },
        },
        orderBy: { price_min_cr: 'asc' },
        take: 8,
      })
      if (projects.length === 0) return null
      return {
        kind: 'builder_held',
        alternatives: [],
        projects,
        text:
          `We track ${projects.length} ${held.name} ${projects.length === 1 ? 'project' : 'projects'} ` +
          `across Noida and Greater Noida. Tell me your budget or the configuration you need and I can ` +
          `narrow these down and tell you which one actually fits.`,
      }
    }

    const alternatives = await prisma.builder.findMany({
      where: { delivery_score: { gt: 0 } },
      orderBy: { delivery_score: 'desc' },
      take: 3,
      select: { name: true },
    })

    const names = alternatives.map((b) => b.name)
    const suffix = names.length
      ? ` The developers we do track most closely in Noida and Greater Noida are ${names.join(', ')}.`
      : ''

    return {
      kind: 'builder_absent',
      alternatives: names,
      text:
        `We do not hold any projects from ${raw} in Noida or Greater Noida, so there is nothing ` +
        `verified for me to show you about them. That is a gap in our coverage rather than a ` +
        `judgement on the developer.${suffix}`,
    }
  } catch {
    return null
  }
}

/** A sector with too little inventory to describe as a market. */
export async function sectorCoverage(sector: string): Promise<CoverageAnswer | null> {
  if (!sector) return null

  try {
    // Intent carries "Sector 75, Noida"; the column holds "Sector 75". An exact
    // match therefore found nothing and reported that we do not track a sector
    // the very same answer went on to recommend.
    const bare = sector.split(',')[0].trim()
    const held = await prisma.project.findMany({
      where: { sector: { equals: bare, mode: 'insensitive' } },
      select: { name: true, price_min_cr: true },
      take: 3,
    })

    if (held.length >= 2) return null

    const neighbours = await prisma.project.groupBy({
      by: ['sector'],
      _count: { _all: true },
      orderBy: { _count: { sector: 'desc' } },
      take: 4,
    })
    const alternatives = neighbours
      .map((n) => n.sector)
      .filter((s): s is string => Boolean(s) && s.toLowerCase() !== sector.toLowerCase())
      .slice(0, 3)

    const offer = alternatives.length
      ? ` The sectors we cover in most depth are ${alternatives.join(', ')} — I can compare any of those properly.`
      : ''

    if (held.length === 0) {
      return {
        kind: 'sector_absent',
        alternatives,
        text: `We do not currently track any projects in ${bare}, so I have nothing verified to tell you about it.${offer}`,
      }
    }

    const only = held[0]
    const price = only.price_min_cr ? `, from around ₹${only.price_min_cr} Cr` : ''
    return {
      kind: 'sector_thin',
      alternatives,
      text:
        `We hold one project in ${bare} — ${only.name}${price}. One project is not enough for me ` +
        `to tell you what the sector is like to live in or how it is priced against its neighbours; ` +
        `I would be generalising from a single listing.${offer}`,
    }
  } catch {
    return null
  }
}
