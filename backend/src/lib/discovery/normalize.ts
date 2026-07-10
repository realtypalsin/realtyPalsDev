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

  // Strip city suffixes: "Sector 10 Greater Noida West" → "Sector 10"
  const stripped = trimmed.replace(CITY_LEVEL_TERMS, '')

  // Extract number: "Sector 10" or "10" → "10"
  const match = stripped.match(/\d+/)
  if (!match) return null

  const sectorNum = match[0]
  return `Sector ${sectorNum}`
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
