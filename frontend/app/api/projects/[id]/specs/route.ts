import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { headers } from 'next/headers'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // Basic auth check (admin endpoint)
  const authHeader = headers().get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projectId = params.id

  try {
    const { specs } = await request.json()

    if (!Array.isArray(specs)) {
      return NextResponse.json({ error: 'Invalid specs format' }, { status: 400 })
    }

    // Delete existing specs
    await prisma.projectSpecItem.deleteMany({
      where: { project_id: projectId },
    })

    // Create new specs
    const created = await Promise.all(
      specs.map(spec =>
        prisma.projectSpecItem.create({
          data: {
            project_id: projectId,
            unit_type_id: spec.unit_type_id || null,
            category: spec.category,
            label: spec.label,
            value: spec.value,
            brand: spec.brand || null,
            tier: spec.tier || null,
            is_highlight: spec.is_highlight || false,
            sort_order: specs.indexOf(spec),
          },
        })
      )
    )

    return NextResponse.json({ specs: created })
  } catch (error) {
    console.error('Error saving specs:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save specs' },
      { status: 500 }
    )
  }
}
