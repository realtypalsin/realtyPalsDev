# Production-Ready Image Management System

**Status:** CRITICAL - Must implement before Phase 4

## Problem Statement
- Admin-added images lost on re-seed (seed.ts deletes project_images table)
- Orphaned Supabase files accumulate with each seed cycle
- No validation that image URLs actually exist in Supabase
- Image deletions don't clean Supabase storage
- Inconsistent hero_image_url formats across seed data

## Solution Architecture

### 1. Separate Seed Data from Admin Data (HIGHEST PRIORITY)

**Schema Change:** Add `source` column to `ProjectImage`
```prisma
model ProjectImage {
  id String @id @default(cuid())
  project_id String
  url String
  type ImageType
  source String @default("admin")  // "seed" | "admin"
  // ... rest of fields
}
```

**Seed Script Change:**
```typescript
// In seed.ts, BEFORE deleteMany projectImages:
// 1. Delete only seed-sourced images
await prisma.projectImage.deleteMany({
  where: { source: "seed" }
})

// 2. When inserting seed images, mark source
await prisma.projectImage.createMany({
  data: seedImages.map(img => ({
    ...img,
    source: "seed"  // Mark all seed images
  }))
})
```

**Effect:** Admin images persist across re-seeds

### 2. Supabase Cleanup Script

**New Script:** `backend/scripts/cleanup-orphaned-images.ts`

```typescript
import { supabaseAdmin } from '../src/lib/supabase'
import { prisma } from '../src/lib/db'

async function cleanupOrphanedImages() {
  // 1. List all files in property-images bucket
  const { data: files } = await supabaseAdmin.storage
    .from('property-images')
    .list('', { limit: 1000 })

  // 2. Get all valid image URLs from DB
  const dbImages = await prisma.projectImage.findMany({
    select: { url: true }
  })
  const validUrls = new Set(dbImages.map(img => img.url))

  // 3. Identify orphaned files
  const orphaned = files?.filter(f => {
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/property-images/${f.name}`
    return !validUrls.has(publicUrl)
  })

  // 4. Clean up
  if (orphaned?.length) {
    await supabaseAdmin.storage
      .from('property-images')
      .remove(orphaned.map(f => f.name))
    console.log(`Cleaned ${orphaned.length} orphaned images`)
  }
}
```

**Run on:**
- Before production deploy
- After manual seed operations
- Weekly maintenance job

### 3. Image URL Validation

**New Function:** `backend/src/lib/images.ts`

```typescript
export async function validateImageUrl(url: string): Promise<boolean> {
  if (!url) return false
  
  // Extract path from public URL
  const match = url.match(/property-images\/(.+)$/)
  if (!match) return false
  
  // Check if file exists in Supabase
  const { data } = await supabaseAdmin.storage
    .from('property-images')
    .list('', { limit: 1000 })
  
  return data?.some(f => 
    `${SUPABASE_URL}/storage/v1/object/public/property-images/${f.name}` === url
  ) ?? false
}

export async function validateSeedImages(projects: any[]) {
  const invalid = []
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
```

**Use in seed.ts:**
```typescript
const invalidImages = await validateSeedImages(allProjects)
if (invalidImages.length) {
  console.warn('⚠️ Invalid image URLs in seed data:', invalidImages)
  // Option: throw error or log warning
}
```

### 4. Safe Image Deletion

**Update:** `backend/src/routes/admin.ts` DELETE `/admin/images/:imageId`

```typescript
router.delete('/images/:imageId', async (req: Request, res: Response) => {
  const image = await prisma.projectImage.findUnique({
    where: { id: req.params.imageId }
  })
  
  if (!image) {
    res.status(404).json({ error: 'Image not found' })
    return
  }

  try {
    // 1. Delete from Supabase if it's an admin image
    if (image.source === 'admin' && image.url) {
      const pathMatch = image.url.match(/property-images\/(.+)$/)
      if (pathMatch) {
        await supabaseAdmin.storage
          .from('property-images')
          .remove([pathMatch[1]])
      }
    }

    // 2. Delete from DB
    await prisma.projectImage.delete({
      where: { id: req.params.imageId }
    })

    // 3. Log deletion for audit
    console.log(`[IMAGE_DELETE] projectId=${image.project_id} url=${image.url} source=${image.source}`)

    res.json({ success: true })
  } catch (err) {
    console.error('[IMAGE_DELETE_ERROR]', err)
    res.status(500).json({ error: 'Failed to delete image' })
  }
})
```

### 5. Seed Data Standardization

**Audit Required:**
```sql
-- Find inconsistent hero_image_url formats
SELECT DISTINCT 
  SUBSTRING(hero_image_url, 1, 100) as url_prefix,
  COUNT(*) as count
FROM projects
WHERE hero_image_url IS NOT NULL AND hero_image_url != ''
GROUP BY SUBSTRING(hero_image_url, 1, 100)
ORDER BY count DESC;
```

**Fixes Needed:**
- Remove relative paths like `/images/properties/...` 
- Convert all to Supabase public URLs or empty
- For seed data: ensure ALL image URLs are in Supabase before committing

### 6. Image Audit Dashboard Script

**New Script:** `backend/scripts/audit-images.ts`

```typescript
async function auditImages() {
  console.log('\n=== IMAGE AUDIT ===\n')

  // 1. Projects with missing images
  const projectsWithoutHero = await prisma.project.count({
    where: { hero_image_url: { in: [null, ''] } }
  })
  console.log(`⚠️  Projects without hero_image_url: ${projectsWithoutHero}`)

  // 2. Orphaned Supabase files
  const { data: supabaseFiles } = await supabaseAdmin.storage
    .from('property-images')
    .list('')
  const dbUrls = new Set((await prisma.projectImage.findMany({
    select: { url: true }
  })).map(img => img.url))
  const orphaned = supabaseFiles?.filter(f => 
    !dbUrls.has(`${SUPABASE_URL}/storage/v1/object/public/property-images/${f.name}`)
  ).length ?? 0
  console.log(`🗑️  Orphaned Supabase files: ${orphaned}`)

  // 3. Invalid image URLs
  const invalidCount = (await validateSeedImages(allProjects)).length
  console.log(`❌ Invalid image URLs in DB: ${invalidCount}`)

  // 4. Images by source
  const bySeed = await prisma.projectImage.count({ where: { source: 'seed' } })
  const byAdmin = await prisma.projectImage.count({ where: { source: 'admin' } })
  console.log(`📊 Images by source: seed=${bySeed}, admin=${byAdmin}`)
}
```

**Run:** `npm run db:audit-images`

## Implementation Checklist

- [ ] Add `source` column to `ProjectImage` schema
- [ ] Run `prisma migrate dev` to apply schema
- [ ] Update seed.ts to:
  - Only delete seed-sourced images
  - Mark seed images with source='seed'
  - Validate image URLs before insert
- [ ] Create cleanup-orphaned-images.ts script
- [ ] Create audit-images.ts script
- [ ] Update admin DELETE image endpoint to clean Supabase
- [ ] Audit all seed data (3 files) for image URL consistency
- [ ] Add pre-deploy validation to CI/CD
- [ ] Document image management policy

## Production Safety Rules

1. **Before each re-seed:**
   - Run `npm run db:audit-images` 
   - Backup Supabase bucket (export file list)
   - Mark DB images with source='admin' if not already

2. **After each re-seed:**
   - Run cleanup-orphaned-images.ts
   - Verify no broken image URLs
   - Spot-check admin images still present

3. **Image deletion:**
   - ALWAYS use admin panel delete (not manual SQL)
   - Never manually delete Supabase files
   - Audit logs stored in `image_audit` table (optional)

4. **CI/CD Integration:**
   - Block deploy if orphaned files > threshold
   - Auto-cleanup before production seed
   - Alert on invalid URLs in seed data

## Timeline

**Week 1 (P0):**
- Add source column + migrate
- Update seed.ts
- Create cleanup script
- Test: re-seed multiple times, verify admin images persist

**Week 2 (P1):**
- Create audit script
- Update admin delete endpoint
- Audit seed data files
- Document procedures

**Week 3 (P2):**
- CI/CD integration
- Backup strategy
- Image lifecycle documentation
- Production deployment

## Related Issues

- Phase 3.4 Image Backfill (depends on this)
- Phase 5.1 usePreferredImages hook (uses cleaned image data)
- Production deployment readiness
