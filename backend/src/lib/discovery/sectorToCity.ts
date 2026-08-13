/**
 * Map sectors to their canonical cities with full qualification.
 * Ensures "Sector 10" becomes "Sector 10, Greater Noida West" not just "Sector 10".
 */

export type CityRegion = 'noida' | 'greater_noida' | 'greater_noida_west'

export interface SectorLocation {
  sector: string
  city: string        // e.g. "Greater Noida West" for UI display
  region: CityRegion  // canonical internal key
}

// Sector to canonical city mapping.
// Numeric sectors and named sectors mapped to their actual locations.
const SECTOR_CITY_MAP: Record<string, SectorLocation> = {
  // Central Noida (75–100)
  'Sector 75': { sector: 'Sector 75', city: 'Noida', region: 'noida' },
  'Sector 76': { sector: 'Sector 76', city: 'Noida', region: 'noida' },
  'Sector 77': { sector: 'Sector 77', city: 'Noida', region: 'noida' },
  'Sector 78': { sector: 'Sector 78', city: 'Noida', region: 'noida' },
  'Sector 79': { sector: 'Sector 79', city: 'Noida', region: 'noida' },
  'Sector 82': { sector: 'Sector 82', city: 'Noida', region: 'noida' },
  'Sector 96': { sector: 'Sector 96', city: 'Noida', region: 'noida' },
  'Sector 97': { sector: 'Sector 97', city: 'Noida', region: 'noida' },
  'Sector 100': { sector: 'Sector 100', city: 'Noida', region: 'noida' },
  'Sector 104': { sector: 'Sector 104', city: 'Noida', region: 'noida' },

  // Noida Expressway (128–158)
  'Sector 128': { sector: 'Sector 128', city: 'Noida', region: 'noida' },
  'Sector 129': { sector: 'Sector 129', city: 'Noida', region: 'noida' },
  'Sector 134': { sector: 'Sector 134', city: 'Noida', region: 'noida' },
  'Sector 135': { sector: 'Sector 135', city: 'Noida', region: 'noida' },
  'Sector 136': { sector: 'Sector 136', city: 'Noida', region: 'noida' },
  'Sector 137': { sector: 'Sector 137', city: 'Noida', region: 'noida' },
  'Sector 138': { sector: 'Sector 138', city: 'Noida', region: 'noida' },
  'Sector 142': { sector: 'Sector 142', city: 'Noida', region: 'noida' },
  'Sector 143': { sector: 'Sector 143', city: 'Noida', region: 'noida' },
  'Sector 144': { sector: 'Sector 144', city: 'Noida', region: 'noida' },
  'Sector 148': { sector: 'Sector 148', city: 'Noida', region: 'noida' },
  'Sector 149': { sector: 'Sector 149', city: 'Noida', region: 'noida' },
  'Sector 150': { sector: 'Sector 150', city: 'Noida', region: 'noida' },
  'Sector 151': { sector: 'Sector 151', city: 'Noida', region: 'noida' },
  'Sector 152': { sector: 'Sector 152', city: 'Noida', region: 'noida' },

  // Older Noida (44–62)
  'Sector 44': { sector: 'Sector 44', city: 'Noida', region: 'noida' },
  'Sector 45': { sector: 'Sector 45', city: 'Noida', region: 'noida' },
  'Sector 46': { sector: 'Sector 46', city: 'Noida', region: 'noida' },
  'Sector 50': { sector: 'Sector 50', city: 'Noida', region: 'noida' },
  'Sector 61': { sector: 'Sector 61', city: 'Noida', region: 'noida' },
  'Sector 62': { sector: 'Sector 62', city: 'Noida', region: 'noida' },

  // Greater Noida (Alpha/Beta/Gamma/etc)
  'Alpha I': { sector: 'Alpha I', city: 'Greater Noida', region: 'greater_noida' },
  'Alpha II': { sector: 'Alpha II', city: 'Greater Noida', region: 'greater_noida' },
  'Beta I': { sector: 'Beta I', city: 'Greater Noida', region: 'greater_noida' },
  'Beta II': { sector: 'Beta II', city: 'Greater Noida', region: 'greater_noida' },
  'Gamma I': { sector: 'Gamma I', city: 'Greater Noida', region: 'greater_noida' },
  'Gamma II': { sector: 'Gamma II', city: 'Greater Noida', region: 'greater_noida' },
  'Delta I': { sector: 'Delta I', city: 'Greater Noida', region: 'greater_noida' },
  'Omega I': { sector: 'Omega I', city: 'Greater Noida', region: 'greater_noida' },
  'Omega II': { sector: 'Omega II', city: 'Greater Noida', region: 'greater_noida' },
  'Zeta I': { sector: 'Zeta I', city: 'Greater Noida', region: 'greater_noida' },
  'Zeta II': { sector: 'Zeta II', city: 'Greater Noida', region: 'greater_noida' },

  // Greater Noida West (sectors with GNW / Noida Extension designation)
  'Sector 1': { sector: 'Sector 1', city: 'Greater Noida West', region: 'greater_noida_west' },
  'Sector 2': { sector: 'Sector 2', city: 'Greater Noida West', region: 'greater_noida_west' },
  'Sector 3': { sector: 'Sector 3', city: 'Greater Noida West', region: 'greater_noida_west' },
  'Sector 4': { sector: 'Sector 4', city: 'Greater Noida West', region: 'greater_noida_west' },
  'Sector 10': { sector: 'Sector 10', city: 'Greater Noida West', region: 'greater_noida_west' },
  'Sector 12': { sector: 'Sector 12', city: 'Greater Noida West', region: 'greater_noida_west' },
  'Sector 16': { sector: 'Sector 16', city: 'Greater Noida West', region: 'greater_noida_west' },
  'Sector 16B': { sector: 'Sector 16B', city: 'Greater Noida West', region: 'greater_noida_west' },
  'Sector 16C': { sector: 'Sector 16C', city: 'Greater Noida West', region: 'greater_noida_west' },
  'Sector 22D': { sector: 'Sector 22D', city: 'Greater Noida West', region: 'greater_noida_west' },
  'Techzone 4': { sector: 'Techzone 4', city: 'Greater Noida West', region: 'greater_noida_west' },
  'Knowledge Park V': { sector: 'Knowledge Park V', city: 'Greater Noida West', region: 'greater_noida_west' },
}

export function getSectorLocation(sectorName: string | null | undefined): SectorLocation | null {
  if (!sectorName) return null
  const cleaned = sectorName
    .replace(/,\s*(greater noida west|greater noida|noida extension|noida|up|uttar pradesh)$/i, '')
    .replace(/\s+(greater noida west|greater noida|noida extension|noida|up|uttar pradesh)$/i, '')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim()
  return SECTOR_CITY_MAP[cleaned] || null
}

// Get qualified sector string for display: "Sector 10, Greater Noida West"
export function getQualifiedSector(sectorName: string | null | undefined): string | null {
  const loc = getSectorLocation(sectorName)
  return loc ? `${loc.sector}, ${loc.city}` : null
}

// For internal use: get the region key to normalize intent storage
export function getSectorRegion(sectorName: string | null | undefined): CityRegion | null {
  const loc = getSectorLocation(sectorName)
  return loc?.region || null
}

// Reverse lookup: given a qualified string, extract the base sector
export function extractSectorFromQualified(qualified: string | null | undefined): string | null {
  if (!qualified) return null
  // "Sector 10, Greater Noida West" → "Sector 10"
  const match = qualified.match(/^([^,]+)/)
  return match ? match[1].trim() : null
}
