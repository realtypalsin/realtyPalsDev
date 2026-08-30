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

/**
 * Words that look like a brand but are ours, generic, a place, or English.
 *
 * Checked against EVERY word of the captured phrase, not just the first. That
 * was the bug: "are all properties in noida leasehold" captures "are all", the
 * check looked only at "are", and the buyer was told "We do not hold any
 * projects from **are all** in Noida". Five of the fifty demand-weighted
 * queries came back that way on 30 Aug — including a due-diligence question
 * about an unknown developer, answered as though "relatively unknown" were the
 * developer's name.
 *
 * A builder name is an open class: "sarthi" has to pass even though we hold
 * nothing for it, so there is no allowlist to check against. What can be
 * enumerated is the closed class this phrase must NOT be made of — function
 * words, quantifiers and comparatives. That is a much smaller set than the
 * open-ended heading vocabulary a blocklist usually fails on.
 */
const NOT_A_BUILDER =
  /^(the|a|an|new|best|top|all|any|some|many|few|most|least|one|two|three|both|each|every|no|not|very|quite|this|that|these|those|my|your|our|their|its|is|are|was|were|be|been|being|do|does|did|has|have|had|can|could|should|would|will|shall|may|might|must|if|than|then|when|where|which|what|who|how|why|about|from|with|for|and|or|but|noida|greater|delhi|ncr|gurgaon|sector|realtypals|ready|under|luxury|premium|residential|commercial|upcoming|verified|bhk|flat|flats|apartment|apartments|house|home|homes|good|cheap|affordable|expensive|such|more|other|another|same|similar|comparable|different|unknown|reputed|reputable|reliable|trusted|small|big|large|local|nearby|near)$/i

/** An adverb is never part of a builder's name — "relatively unknown builder". */
const ADVERB = /ly$/i

function normalise(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * A project we hold whose full name appears in the message.
 *
 * The match is the whole name as a contiguous run of words, not any word of it.
 * "county 107 by county group" contains "county 107" and must never be answered
 * as a coverage gap — we hold that project, built by ABA Corp, and the buyer
 * was told we had nothing. But "amaatra homes" must still miss: matching on the
 * loose word "homes" would find Amrapali Crystal Homes and answer a question
 * about a different building entirely.
 */
async function namedProjectInMessage(message: string): Promise<{ name: string; builder: string | null } | null> {
  const haystack = ` ${normalise(message)} `
  const projects = await prisma.project.findMany({
    select: { name: true, builder: { select: { name: true } } },
  })
  // Longest first: "ABA Cleo County" should win over "Cleo County".
  const hit = projects
    .map((p) => ({ p, n: normalise(p.name) }))
    .filter(({ n }) => n.length >= 6 && haystack.includes(` ${n} `))
    .sort((a, b) => b.n.length - a.n.length)[0]
  return hit ? { name: hit.p.name, builder: hit.p.builder?.name ?? null } : null
}

/**
 * The postal code of a sector, read from the addresses of projects standing in it.
 *
 * No column holds a PIN, so the model was inventing one: "sector 10 noida
 * extension pin code" came back 201306 on one run and 201301 on the next, and
 * neither is what our own rows say. The addresses do carry it — twelve of the
 * fifteen projects in Sector 10, Greater Noida West read 203207 — so this is a
 * fact we hold, just not in a field anyone had looked in.
 *
 * Where the addresses disagree the disagreement is reported rather than
 * averaged away. A postal code is looked up to be used, and a confidently wrong
 * one is worse than a qualified one.
 */
export async function sectorPinCode(
  message: string,
  sectors: string[],
): Promise<CoverageAnswer | null> {
  if (!/\b(pin ?code|postal code|pincode|zip)\b/i.test(message)) return null
  const sector = sectors[0]
  if (!sector) return null

  const rows = await prisma.project.findMany({
    where: { sector: { equals: sector, mode: 'insensitive' } },
    select: { address: true, city: true },
  })
  const counts = new Map<string, number>()
  for (const r of rows) {
    const m = /\b(\d{6})\b/.exec(r.address ?? '')
    if (m) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1)
  }
  if (counts.size === 0) return null

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const [pin, n] = ranked[0]
  const total = ranked.reduce((s, [, c]) => s + c, 0)
  const city = rows[0]?.city ?? ''
  const others = ranked.slice(1)

  return {
    kind: 'sector_thin',
    alternatives: [],
    text:
      `${sector}${city ? `, ${city}` : ''} reads **${pin}** on ${n} of the ${total} project addresses we hold there.` +
      (others.length
        ? ` ${others.length === 1 ? 'One other code appears' : 'Other codes appear'} in our records too — ` +
          `${others.map(([p, c]) => `${p} on ${c}`).join(', ')} — so confirm it against the specific project's ` +
          `registered address before you use it on anything official.`
        : ''),
  }
}

/** A builder named in the message that we hold no projects for. */
export async function builderCoverage(message: string): Promise<CoverageAnswer | null> {
  const match = message.match(BUILDER_QUESTION)
  if (!match) return null

  const raw = match[1].trim()
  // EVERY word, not just the first. See NOT_A_BUILDER.
  const tokens = raw.split(/\s+/)
  if (tokens.some((w) => NOT_A_BUILDER.test(w) || ADVERB.test(w))) return null

  // The message names a project we hold. Whatever the buyer believes about who
  // built it, the project is ours to answer about — so hand the turn back to
  // the normal path rather than reporting a coverage gap over the top of it.
  const named = await namedProjectInMessage(message)
  if (named) return null

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
