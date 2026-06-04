import { NextRequest, NextResponse } from 'next/server'
import { getProjectDetail } from '@/lib/repositories/projectRepository'
import { projectDetailCache } from '@/lib/cache'
import type { ProjectDetail } from '@/types/project'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const cached = projectDetailCache.get(params.slug) as ProjectDetail | null
    if (cached) {
      return NextResponse.json({ project: cached })
    }

    const project = await getProjectDetail(params.slug)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    projectDetailCache.set(params.slug, project)
    return NextResponse.json({ project })
  } catch (err) {
    console.error('[GET /api/v1/projects/:slug]', err)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}
