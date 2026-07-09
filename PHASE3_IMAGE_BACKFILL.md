# Phase 3.4: Image Backfill

**Status:** Deferred (requires Supabase asset inventory audit)

## Problem
- ~2/3 of projects have `hero_image_url` that is stale or missing actual assets
- JSON-seeded projects (irish-platinum, lotus-arena, godrej-majesty) have `hero_image_url: ""` + zero `project_images` rows
- Frontend already prefers `project_images[]` (see: `usePreferredImages` hook in Phase 5.1)

## Solution Steps
1. **Audit Supabase assets**: Query `property-images` bucket to list all project logo/hero paths
2. **Identify mapping**: Cross-reference `hero_image_url` values with actual assets in Supabase
3. **Backfill project_images**: For each project with missing/stale hero_image_url:
   ```sql
   INSERT INTO project_images (project_id, image_url, image_type, created_at)
   SELECT id, <asset-url>, 'hero', NOW()
   FROM projects
   WHERE hero_image_url IS NULL OR hero_image_url = ''
   AND <condition: asset exists in Supabase>;
   ```
4. **Verify**: Frontend components using `usePreferredImages` should auto-fallback gracefully

## Blockers
- Requires Supabase bucket inventory (storage console or API query)
- No automated way to map hero_image_url → actual assets without manual audit

## Note
Frontend already handles missing images gracefully:
- `MessageBubble.tsx:449-455` fallback on onError
- `usePreferredImages` hook checks images[] first, then hero_image_url
- So backfill is optional for MVP, critical for data completeness

See also: Phase 5.1 (usePreferredImages) which makes this backfill leveraged across UI.
