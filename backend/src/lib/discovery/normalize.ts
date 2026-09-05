/**
 * Data normalization for sector and city formats.
 * Ensures consistent canonical values across the DB.
 */

import { SUPPORTED_CITIES } from '../config/cities'

// Valid cities (controlled vocabulary)
const VALID_CITIES = new Set(SUPPORTED_CITIES)

// Terms that suffix sectors but should be stripped to get canonical sector number
const CITY_LEVEL_TERMS = /\s+(Noida|Greater\s+Noida(?:\s+West)?|UP|Uttar\s+Pradesh)$/i

/**
 * Normalize sector to "Sector N" format.
 * Handles: "10", "Sector 10", "Sector 10 Greater Noida West", etc.
 * Returns: "Sector 10" (canonical)
 */
export function canonicalSector(raw: string | null | undefined): string | null {
  if (!raw) return null

  const trimmed = String(raw).trim()
  if (!trimmed) return null

  // If the user inputs just a number, prefix it
  if (/^\d+[a-z]?$/i.test(trimmed)) {
    return `Sector ${trimmed.toUpperCase()}`
  }

  // Extract core sector number (e.g. "Sector 10" from "Sector 10 Greater Noida West" or "Sector 10 GN")
  const sectorMatch = trimmed.match(/^(?:sec|sector)\s*-?\s*(\d+[a-z]?)\b/i)
  if (sectorMatch) {
    const num = sectorMatch[1].toUpperCase()
    return `Sector ${num}`
  }

  // For non-numeric sectors like "Techzone 4" or "Knowledge Park 5", strip trailing city names
  const cleaned = trimmed.replace(CITY_LEVEL_TERMS, '').trim()
  return cleaned.replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * Normalize city to controlled vocabulary.
 * Handles: "Noida", "NOIDA", "Greater Noida", "GNW", "Greater Noida West", etc.
 * Returns: one of {Noida, Greater Noida, Greater Noida West} or null
 */
export function canonicalCity(raw: string | null | undefined): string | null {
  if (!raw) return null

  const normalized = String(raw).trim().toLowerCase()

  // Map variations to canonical values
  if (normalized === 'noida') return 'Noida'
  if (normalized === 'greater noida') return 'Greater Noida'
  if (
    normalized === 'greater noida west' ||
    normalized === 'gnw' ||
    normalized === 'gn west' ||
    normalized.includes('greater noida') && normalized.includes('west')
  ) {
    return 'Greater Noida West'
  }

  // If no match, return null (data needs review)
  return null
}

/**
 * Normalize both sector and city together.
 * Returns {sector, city} or {sector: null, city: null} if either fails.
 */
export function normalizeLocation(sector: any, city: any): { sector: string | null; city: string | null } {
  return {
    sector: canonicalSector(sector),
    city: canonicalCity(city),
  }
}

/**
 * Validate that location values are in canonical format.
 * Useful for assertions in migrations.
 */
export function isCanonical(sector: string | null, city: string | null): boolean {
  if (sector !== null && !sector.match(/^Sector \d+$/)) return false
  if (city !== null && !VALID_CITIES.has(city as any)) return false
  return true
}

/**
 * A Prisma `OR` clause that matches a sector as a whole word.
 *
 * `{ sector: { contains: '1' } }` is what four handlers were doing, and it
 * matches Sector 1, 10, 11, 12, 100, 128, 137, 150 and 16 alike. Measured in
 * production: a Sector 1 vs Sector 2 comparison reported 154 and 50 projects
 * against a 280-row table, and named landmark societies from neither sector.
 *
 * `discovery/projects.ts` already had the right predicate inline; this is the
 * same four clauses in one place so a fifth caller cannot get it wrong. The
 * column holds either "Sector 150" or "Sector 150 Greater Noida West", hence
 * the prefix/suffix/infix variants around a space-delimited token.
 */
export function sectorWhereClause(rawSector: string): Array<Record<string, unknown>> {
  const bare = String(rawSector ?? '')
    .replace(/,\s*(greater noida west|greater noida|noida extension|noida|up|uttar pradesh)\s*$/i, '')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim()
  const sector = /^\d+[a-z]?$/i.test(bare) ? `Sector ${bare.toUpperCase()}` : bare
  if (!sector) return []
  return [
    { sector: { equals: sector, mode: 'insensitive' } },
    { sector: { startsWith: `${sector} `, mode: 'insensitive' } },
    { sector: { endsWith: ` ${sector}`, mode: 'insensitive' } },
    { sector: { contains: ` ${sector} `, mode: 'insensitive' } },
  ]
}
