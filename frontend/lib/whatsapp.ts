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
<<<<<<< HEAD
  project: WhatsAppProject,
=======
  project: WhatsAppProject | Record<string, unknown>,
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
  variant: 'card' | 'panel' = 'card',
): string | null {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  if (!number) return null

<<<<<<< HEAD
  const bhkList = [...new Set(project.unit_types.map((u) => `${u.bhk}BHK`))].join(' / ')
  const statusLabel =
    project.status === 'ready_to_move' ? 'Ready to Move'
    : project.status === 'new_launch' ? 'New Launch'
=======
  const projectTyped = project as WhatsAppProject
  const bhkList = [...new Set(projectTyped.unit_types.map((u) => `${u.bhk}BHK`))].join(' / ')
  const statusLabel =
    projectTyped.status === 'ready_to_move' ? 'Ready to Move'
    : projectTyped.status === 'new_launch' ? 'New Launch'
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
    : 'Under Construction'

  const lines =
    variant === 'panel'
      ? [
<<<<<<< HEAD
          `Hi! I came across *${project.name}* on RealtyPal and I'm interested.`,
          ``,
          `📍 ${project.sector}, Noida — ${project.builder.name}`,
          `🏠 ${bhkList} · ${project.price_range_label}`,
          `📋 ${statusLabel}`,
          ...(project.rera_number ? [`✅ RERA: ${project.rera_number}`] : []),
=======
          `Hi! I came across *${projectTyped.name}* on RealtyPal and I'm interested.`,
          ``,
          `📍 ${projectTyped.sector}, Noida — ${projectTyped.builder.name}`,
          `🏠 ${bhkList} · ${projectTyped.price_range_label}`,
          `📋 ${statusLabel}`,
          ...(projectTyped.rera_number ? [`✅ RERA: ${projectTyped.rera_number}`] : []),
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
          ``,
          `Could you share more details and help me book a site visit?`,
        ]
      : [
<<<<<<< HEAD
          `Hi! I'm interested in *${project.name}* by ${project.builder.name} in ${project.sector}, Noida.`,
          ``,
          `Configuration: ${bhkList}`,
          `Price: ${project.price_range_label}`,
          `Status: ${statusLabel}`,
          ...(project.rera_number ? [`RERA: ${project.rera_number}`] : []),
=======
          `Hi! I'm interested in *${projectTyped.name}* by ${projectTyped.builder.name} in ${projectTyped.sector}, Noida.`,
          ``,
          `Configuration: ${bhkList}`,
          `Price: ${projectTyped.price_range_label}`,
          `Status: ${statusLabel}`,
          ...(projectTyped.rera_number ? [`RERA: ${projectTyped.rera_number}`] : []),
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
          ``,
          `Could you help me with more details and a site visit?`,
        ]

  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`
}
