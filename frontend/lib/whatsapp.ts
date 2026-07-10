export interface WhatsAppProject {
  name: string
  builder: { name: string }
  sector: string
  price_range_label: string
  status: string
  rera_number?: string | null
  unit_types: Array<{ bhk: number }>
}

/**
 * Build a pre-filled WhatsApp URL for a project enquiry.
 * variant 'card'  — used in ProjectCard (short intro)
 * variant 'panel' — used in ProjectDetailPanel (detail view intro)
 */
export function buildWhatsAppUrl(
  project: WhatsAppProject | Record<string, unknown>,
  variant: 'card' | 'panel' = 'card',
): string | null {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  if (!number) return null

  const projectTyped = project as WhatsAppProject
  const bhkList = [...new Set(projectTyped.unit_types.map((u) => `${u.bhk}BHK`))].join(' / ')
  const statusLabel =
    projectTyped.status === 'ready_to_move' ? 'Ready to Move'
    : projectTyped.status === 'new_launch' ? 'New Launch'
    : 'Under Construction'

  const lines =
    variant === 'panel'
      ? [
          `Hi! I came across *${projectTyped.name}* on RealtyPal and I'm interested.`,
          ``,
          `📍 ${projectTyped.sector}, Noida — ${projectTyped.builder.name}`,
          `🏠 ${bhkList} · ${projectTyped.price_range_label}`,
          `📋 ${statusLabel}`,
          ...(projectTyped.rera_number ? [`✅ RERA: ${projectTyped.rera_number}`] : []),
          ``,
          `Could you share more details and help me book a site visit?`,
        ]
      : [
          `Hi! I'm interested in *${projectTyped.name}* by ${projectTyped.builder.name} in ${projectTyped.sector}, Noida.`,
          ``,
          `Configuration: ${bhkList}`,
          `Price: ${projectTyped.price_range_label}`,
          `Status: ${statusLabel}`,
          ...(projectTyped.rera_number ? [`RERA: ${projectTyped.rera_number}`] : []),
          ``,
          `Could you help me with more details and a site visit?`,
        ]

  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`
}
