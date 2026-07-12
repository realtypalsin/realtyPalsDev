#!/usr/bin/env npx ts-node

import { cleanupOrphanedImages, getImageStats } from '../src/lib/images'

async function main() {
  console.log('\n=== IMAGE CLEANUP ===\n')

  const dryRun = process.argv.includes('--dry-run')
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be deleted\n')
  }

  const stats = await getImageStats()
  console.log('📊 Current Stats:')
  console.log(`  Total DB images: ${stats.totalDbImages}`)
  console.log(`  Seed images: ${stats.seedImages}`)
  console.log(`  Admin images: ${stats.adminImages}`)
  console.log(`  Supabase files: ${stats.supabaseFileCount}`)
  console.log(`  Orphaned files: ${stats.orphanedCount}`)
  console.log(`  Invalid URLs: ${stats.invalidUrls}`)

  if (stats.orphanedCount === 0) {
    console.log('\n✅ No orphaned files found.')
    return
  }

  const result = await cleanupOrphanedImages(dryRun)
  console.log(`\n🧹 Cleanup Complete:`)
  console.log(`  Cleaned: ${result.cleaned}`)
  console.log(`  Errors: ${result.errors}`)

  if (dryRun) {
    console.log('\n💡 Run without --dry-run to actually delete files')
  }
}

main().catch(err => {
  console.error('❌ Cleanup failed:', err)
  process.exit(1)
})
