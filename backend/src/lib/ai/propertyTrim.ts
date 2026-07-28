/**
 * Trim property objects to only essential fields for AI prompts.
 * Reduces input tokens by 30-40% without losing decision-making context.
 *
 * Keep: id, name, price, sector, possession date, concerns
 * Drop: full images, amenities lists, floor plans, regulatory docs (available via RAG)
 */

export interface TrimmedProperty {
  id: string;
  name: string;
  price_range_label?: string | null;
  sector?: { name: string } | null;
  possession_status?: string | null;
  possession_label?: string | null;
  concerns?: string[] | null;
  bhk?: number | null;
  builder?: { name: string } | null;
}

export function trimPropertyForPrompt(project: any): TrimmedProperty {
  return {
    id: project.id,
    name: project.name,
    price_range_label: project.price_range_label,
    sector: project.sector ? { name: project.sector.name } : null,
    possession_status: project.possession_status,
    possession_label: project.possession_label,
    concerns: project.concerns,
    bhk: project.bhk,
    builder: project.builder ? { name: project.builder.name } : null,
  };
}

export function trimPropertiesForPrompt(projects: any[]): TrimmedProperty[] {
  return projects.map(trimPropertyForPrompt);
}
