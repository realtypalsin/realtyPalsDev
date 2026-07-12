import { supabaseAdmin } from './supabase'
import { prisma } from './db'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vbpprdxvvwhgmhjgsvqb.supabase.co'

export async function validateImageUrl(url: string): Promise<boolean> {
  if (!url) return false

  try {
    const pathMatch = url.match(/property-images\/(.+)$/)
    if (!pathMatch) return false

    const { data } = await supabaseAdmin.storage.from('property-images').list('', { limit: 1000 })
    return data?.some(f => `${SUPABASE_URL}/storage/v1/object/public/property-images/${f.name}` === url) ?? false
  } catch (err) {
    console.error('[IMAGE_VALIDATE] Error checking URL:', err)
    return false
  }
}

export async function validateSeedImages(projects: any[]): Promise<Array<{ project: string; url: string }>> {
  const invalid: Array<{ project: string; url: string }> = []

  for (const project of projects) {
    if (project.project_images?.length) {
      for (const img of project.project_images) {
        if (!await validateImageUrl(img.url)) {
          invalid.push({ project: project.name, url: img.url })
        }
      }
    }
  }

  return invalid
}

export async function cleanupOrphanedImages(dryRun = false): Promise<{ cleaned: number; errors: number }> {
  let cleaned = 0
  let errors = 0

  try {
    const { data: supabaseFiles } = await supabaseAdmin.storage.from('property-images').list('', { limit: 1000 })

    if (!supabaseFiles?.length) {
      console.log('[CLEANUP] No files in Supabase bucket')
      return { cleaned: 0, errors: 0 }
    }

    const dbImages = await prisma.projectImage.findMany({ select: { url: true } })
    const validUrls = new Set(dbImages.map(img => img.url))

    const orphaned = supabaseFiles.filter(f => {
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/property-images/${f.name}`
      return !validUrls.has(publicUrl)
    })

    console.log(`[CLEANUP] Found ${orphaned.length} orphaned files in Supabase`)

    if (orphaned.length > 0 && !dryRun) {
      const toDelete = orphaned.map(f => f.name)
      const { error } = await supabaseAdmin.storage.from('property-images').remove(toDelete)

      if (error) {
        console.error('[CLEANUP] Supabase delete error:', error)
        errors = orphaned.length
      } else {
        cleaned = orphaned.length
        console.log(`[CLEANUP] Deleted ${cleaned} orphaned files from Supabase`)
      }
    }

    return { cleaned, errors }
  } catch (err) {
    console.error('[CLEANUP_ERROR]', err)
    return { cleaned, errors: 1 }
  }
}

export async function getImageStats(): Promise<{
  totalDbImages: number
  seedImages: number
  adminImages: number
  supabaseFileCount: number
  orphanedCount: number
  invalidUrls: number
}> {
  try {
    const [totalDb, seedCount, adminCount] = await Promise.all([
      prisma.projectImage.count(),
      prisma.projectImage.count({ where: { source: 'seed' } }),
      prisma.projectImage.count({ where: { source: 'admin' } }),
    ])

    const { data: supabaseFiles } = await supabaseAdmin.storage.from('property-images').list('', { limit: 1000 })
    const supabaseCount = supabaseFiles?.length ?? 0

    const dbImages = await prisma.projectImage.findMany({ select: { url: true } })
    const validUrls = new Set(dbImages.map(img => img.url))

    const orphanedCount = supabaseFiles?.filter(f => {
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/property-images/${f.name}`
      return !validUrls.has(publicUrl)
    }).length ?? 0

    const invalid = await prisma.projectImage.count({
      where: {
        url: {
          notIn: Array.from(validUrls),
        },
      },
    })

    return {
      totalDbImages: totalDb,
      seedImages: seedCount,
      adminImages: adminCount,
      supabaseFileCount: supabaseCount,
      orphanedCount,
      invalidUrls: invalid,
    }
  } catch (err) {
    console.error('[IMAGE_STATS_ERROR]', err)
    return { totalDbImages: 0, seedImages: 0, adminImages: 0, supabaseFileCount: 0, orphanedCount: 0, invalidUrls: 0 }
  }
}
