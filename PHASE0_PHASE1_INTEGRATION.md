# Phase 0 + Phase 1 Integration Guide

⚠️ **READ THIS BEFORE MODIFYING chat.ts**

## What Changed

- Schema: Added `SessionMemory` and `ResponseGrade` models
- New files: `sessionMemory.ts`, `responseGrader.ts`
- Integration points in `backend/src/routes/chat.ts`

## Database Safety

✅ All reads are safe (no data loss)
✅ Writes are UPSERT (safe insert-or-update)
✅ Grading runs async in background (no blocking)
✅ No deletions or truncations

## Migration Steps (In Order)

### Step 1: Back up database (optional but recommended)
```bash
# Connect to your DB and export a snapshot
# e.g., pg_dump production_db > backup_before_phase0.sql
```

### Step 2: Run migrations
```bash
cd backend
npx prisma migrate dev --name phase0_conversation_memory
# Or use deploy if in production:
# npx prisma migrate deploy
```

### Step 3: Verify schema
```bash
npx prisma generate
# Check that SessionMemory and ResponseGrade appear in Prisma Client
```

## Code Integration Points

### In `backend/src/routes/chat.ts`:

#### At the top (imports):
```typescript
import { hydrateIntentFromMemory, persistIntentToMemory, trackPropertyReaction } from '../lib/ai/sessionMemory'
import { gradeResponseAsync } from '../lib/ai/responseGrader'
```

#### In the chat POST handler, after extracting intent:
```typescript
// Phase 0: Hydrate intent from prior conversation
const hydratedIntent = await hydrateIntentFromMemory(sessionId, intent)
// Use hydratedIntent for rest of the flow

// ... search results, build response ...

// Phase 1: Grade response async (after streaming to client)
const streamFinished = new Promise<string>((resolve) => {
  const chunks: string[] = []
  // ... stream logic ...
  response.on('end', () => {
    const fullResponse = chunks.join('')
    resolve(fullResponse)
  })
})

// After response streams:
streamFinished.then((fullResponse) => {
  gradeResponseAsync(
    sessionId,
    messageId,
    userMessage,
    fullResponse,
    {
      propertiesShown: results.length,
      propertyNames: results.map(r => r.name),
    }
  )
})

// Phase 0: Persist intent after turn
await persistIntentToMemory(sessionId, userId, hydratedIntent)
```

#### When user saves a property (in your existing save handler):
```typescript
await trackPropertyReaction(sessionId, projectId, 'interested', ['saved'])
```

#### When user asks follow-up (detect via intent):
```typescript
if (intent.sector === hydratedIntent.sector && userMessage.includes('compare')) {
  await trackPropertyReaction(sessionId, previousProjectId, 'interested', ['comparison_asked'])
}
```

## Testing (Without Mutations)

### Verify reads work:
```typescript
const memory = await prisma.sessionMemory.findUnique({
  where: { session_id: 'test-session-id' }
})
console.log(memory) // Should be null or populated
```

### Verify writes are safe:
```typescript
// This is safe — Prisma UPSERT will not delete anything
await prisma.sessionMemory.upsert({
  where: { session_id: 'test' },
  create: { session_id: 'test', user_id: 'user1', extracted_intent: {} },
  update: { extracted_intent: {} }
})
```

## Rollback Plan (If Needed)

If something goes wrong:

```bash
# List migrations:
npx prisma migrate status

# Rollback last migration (if hasn't been deployed):
npx prisma migrate resolve --rolled-back phase0_conversation_memory

# Or keep tables, just don't use them in chat.ts
```

## Monitoring

Check grades are being recorded:
```sql
SELECT session_id, COUNT(*), AVG(grade_score), MAX(created_at)
FROM response_grades
GROUP BY session_id
ORDER BY MAX(created_at) DESC
LIMIT 10;
```

Check memory is persisting:
```sql
SELECT session_id, user_id, updated_at
FROM session_memory
ORDER BY updated_at DESC
LIMIT 10;
```

## Next: Phase 1 Retry Logic

After grading runs, you can add retry:

```typescript
// In chat.ts, after streaming response:
const grade = await getMessageGrade(messageId)
if (grade?.should_retry && grade.retry_count < grade.max_retries) {
  // Re-run prompt with feedback: "Previous response scored {grade.grade_score}. {reason}. Rewrite."
  // Stream new version
  // Grade again
}
```

---

**Questions?**
- Check sessionMemory.ts for memory ops
- Check responseGrader.ts for grading ops
- Test in dev first with small changes
