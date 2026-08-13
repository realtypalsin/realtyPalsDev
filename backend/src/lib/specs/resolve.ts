import { ProjectSpecItem } from '@prisma/client'

export interface ResolvedSpec extends ProjectSpecItem {
  isOverride: boolean
}

/**
 * Merge project-level and unit-type-level specs.
 * Unit-type specs override project specs on matching label.
 * Project specs are the base set.
 */
export function resolveSpecs(
  projectSpecs: ProjectSpecItem[],
  unitTypeSpecs: ProjectSpecItem[] | undefined,
  unitTypeId?: string
): ResolvedSpec[] {
  const baseSpecs = projectSpecs.filter(s => !s.unit_type_id)
  const unitOverrides = unitTypeSpecs?.filter(s => s.unit_type_id === unitTypeId) || []

  const overriddenLabels = new Set(unitOverrides.map(s => s.label))

  // Project specs not overridden + unit overrides
  const resolved: ResolvedSpec[] = [
    ...baseSpecs.filter(s => !overriddenLabels.has(s.label)).map(s => ({
      ...s,
      isOverride: false,
    })),
    ...unitOverrides.map(s => ({
      ...s,
      isOverride: true,
    })),
  ]

  // Sort by category, then by sort_order
  return resolved.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category)
    return (a.sort_order || 0) - (b.sort_order || 0)
  })
}

/**
 * Get highlight specs only (for showcase grid and AI inclusion).
 */
export function getHighlightSpecs(specs: ResolvedSpec[]): ResolvedSpec[] {
  return specs.filter(s => s.is_highlight).slice(0, 12)
}

/**
 * Group specs by category for rendering.
 */
export function groupByCategory(
  specs: ResolvedSpec[]
): Record<string, ResolvedSpec[]> {
  return specs.reduce((acc, spec) => {
    if (!acc[spec.category]) acc[spec.category] = []
    acc[spec.category].push(spec)
    return acc
  }, {} as Record<string, ResolvedSpec[]>)
}
