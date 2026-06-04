import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { searchProjects } from '@/lib/repositories/projectRepository'

const QuerySchema = z.object({
  sector: z.string().optional(),
  bhk: z.coerce.number().int().min(1).max(5).optional(),
  min_price: z.coerce.number().nonnegative().optional(),
  max_price: z.coerce.number().nonnegative().optional(),
})

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query params', details: parsed.error.flatten() }, { status: 400 })
  }
  const { sector, bhk, min_price, max_price } = parsed.data

  try {
    const projects = await searchProjects({
      city: 'Noida',
      sector: sector,
      bhk,
      budget_min_cr: min_price != null ? min_price / 10_000_000 : undefined,
      budget_max_cr: max_price != null ? max_price / 10_000_000 : undefined,
    })
    return NextResponse.json({ projects })
  } catch (err) {
    console.error('[GET /api/v1/projects]', err)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}
