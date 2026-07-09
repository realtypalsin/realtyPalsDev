# How to Test Image Management Implementation

## Prerequisites

- Admin panel access (ADMIN_PASSWORD configured)
- Backend running (npm run dev)
- Frontend running (npm run dev)
- Database connection working
- Supabase credentials configured

## Test Flow

### Test 1: Verify Admin Images Persist After Seed

**Steps:**
1. Login to admin panel at `http://localhost:3000/admin`
2. Upload image for a project
   - Click project → Images tab
   - Upload image file
   - Verify image appears in list
   - Note the image ID
3. Run database seed:
   ```bash
   cd frontend && npm run db:seed
   ```
4. Refresh admin panel image list for same project
5. **Expected Result:** Admin-uploaded image should STILL be there

**What's tested:**
- `source: 'admin'` marking in database
- Seed script only deletes `source: 'seed'` images
- Admin images survive re-seeds

### Test 2: Verify Image Deletion Cleans Both DB and Supabase

**Steps:**
1. Upload image to project (if not already done)
2. Delete image via admin panel
   - Click trash icon next to image
   - Confirm deletion
3. Run audit script:
   ```bash
   cd backend && npx ts-node scripts/audit-images.ts
   ```
4. Check image count decreased
5. Check Supabase bucket (via Supabase dashboard):
   - Open storage/property-images
   - Verify deleted image file is gone (or not listed)

**What's tested:**
- DELETE endpoint cleans Supabase
- DELETE endpoint removes from database
- Image stats accurate

### Test 3: Cleanup Orphaned Files

**Steps:**
1. Run audit to see current state:
   ```bash
   cd backend && npx ts-node scripts/audit-images.ts
   ```
   Note: orphaned files count
2. Run cleanup dry-run (preview what will be deleted):
   ```bash
   cd backend && npx ts-node scripts/cleanup-orphaned-images.ts --dry-run
   ```
3. Run actual cleanup:
   ```bash
   cd backend && npx ts-node scripts/cleanup-orphaned-images.ts
   ```
4. Run audit again:
   ```bash
   cd backend && npx ts-node scripts/audit-images.ts
   ```
5. **Expected Result:** Orphaned files count should be 0

**What's tested:**
- Cleanup script identifies orphaned files
- Dry-run doesn't delete anything
- Actual cleanup removes files from Supabase
- Stats update correctly

### Test 4: Validate Seed Data Images

**Steps:**
1. Before seeding, add invalid image URL to seed data (for testing):
   - Edit `frontend/prisma/data/seed-data.ts`
   - In a project's `project_images`, change URL to `https://invalid-url.example.com/nonexistent.jpg`
2. Run seed:
   ```bash
   cd frontend && npm run db:seed
   ```
3. Seed should complete (warning logged about invalid URL, not fatal)
4. Check console for `[IMAGE_VALIDATE] Error` or similar warnings
5. **Expected Result:** Seed completes but logs warning about invalid URLs

**What's tested:**
- Image URL validation works
- Invalid URLs don't stop seed
- Warnings logged for visibility

### Test 5: Source Field Tracking

**Steps:**
1. Query database to verify source field:
   ```sql
   SELECT id, url, source FROM project_images LIMIT 10;
   ```
2. After seeding:
   ```sql
   SELECT source, COUNT(*) as count FROM project_images GROUP BY source;
   ```
3. **Expected Result:**
   - Seed images have `source: 'seed'`
   - Admin images have `source: 'admin'`

**What's tested:**
- Schema migration applied
- Seed marks images correctly
- Field is queryable

## Expected Outputs

### Audit Script Output (Test 3, Step 1):
```
=== IMAGE AUDIT ===

📊 Statistics:
  Total DB images: 45
  Seed images: 32
  Admin images: 13
  Supabase files: 48
  Orphaned files: 3
  Invalid URLs: 0

⚠️  Projects without hero_image_url: 12

📸 Images by type and source:
  hero (seed): 12
  hero (admin): 8
  exterior (seed): 20
  ...

✅ Audit complete.
```

### Cleanup Script Output (Test 3, Step 3):
```
=== IMAGE CLEANUP ===

📊 Current Stats:
  Total DB images: 45
  Seed images: 32
  Admin images: 13
  Supabase files: 48
  Orphaned files: 3
  Invalid URLs: 0

[CLEANUP] Found 3 orphaned files in Supabase
🧹 Cleanup Complete:
  Cleaned: 3
  Errors: 0
```

## Troubleshooting

### Issue: "Supabase error: invalid token"
- Check `SUPABASE_SERVICE_ROLE_KEY` is set in `.env`
- Verify key is correct (copy from Supabase dashboard)

### Issue: "Images still orphaned after cleanup"
- Run audit script again: `npx ts-node scripts/audit-images.ts`
- If still orphaned, may be recently deleted files not yet synced
- Try again after 5 minutes

### Issue: "Admin images disappeared after seed"
- Verify image.source is 'admin' in database
- Check seed.ts line 91 has `source: 'seed'` in insert
- Run audit: `npx ts-node scripts/audit-images.ts`

### Issue: "Cannot find module images.ts"
- Ensure file exists: `backend/src/lib/images.ts`
- Check TypeScript: `cd backend && npx tsc --noEmit src/lib/images.ts`
- Regenerate Prisma: `cd frontend && npx prisma generate`

## Success Criteria

✅ Admin images survive seed cycle
✅ Deleted images cleaned from Supabase
✅ Orphaned files can be cleaned
✅ Image stats are accurate
✅ No errors in console during operations
✅ Source field properly tracks image origin

## Production Deployment

Before deploying to production:

1. Run audit on current database:
   ```bash
   npx ts-node scripts/audit-images.ts
   ```

2. Run cleanup to clear orphaned files:
   ```bash
   npx ts-node scripts/cleanup-orphaned-images.ts
   ```

3. Verify no invalid URLs:
   ```sql
   SELECT COUNT(*) FROM project_images 
   WHERE url IS NULL OR url = '';
   ```

4. Backup Supabase bucket before first production seed

5. Monitor logs during first production seed for warnings

All tests should pass before marking as production-ready.
