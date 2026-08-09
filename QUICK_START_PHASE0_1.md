# Quick Start: Phase 0 + Phase 1 Wiring

**Use this after migration is done and schema is ready.**

## 1. Backup (5 minutes)

```bash
pg_dump -U $USER -h localhost realtypals > backup_before_phase0_$(date +%s).sql
ls -lh backup_before_phase0_*.sql  # Should be >1MB
```

## 2. Run Migration (2 minutes)

```bash
cd backend
npx prisma migrate deploy
# Or dev:
# npx prisma migrate dev --name phase0_conversation_memory
```

Verify:
```bash
npx prisma studio
# Open http://localhost:5555 → Should see SessionMemory and ResponseGrade tables (empty)
```

## 3. Add Imports to chat.ts (1 minute)

At the top of `backend/src/routes/chat.ts`:

```typescript
import { hydrateIntentFromMemory, persistIntentToMemory, trackPropertyReaction } from '../lib/ai/sessionMemory'
import { gradeResponseAsync } from '../lib/ai/responseGrader'
```

## 4. Wire Session Memory (5 minutes)

Find this section in chat POST handler (around line 150-200):

```typescript
// BEFORE:
const intent = await extractIntent(...)

// AFTER:
const intent = await extractIntent(...)
const hydratedIntent = await hydrateIntentFromMemory(session.id, intent)
// Use hydratedIntent from here on instead of intent
```

Later, after response is built:

```typescript
// BEFORE: (at end of handler)
return res.json({ ... })

// AFTER: (add this before return or after stream ends)
await persistIntentToMemory(session.id, session.user_id, hydratedIntent)
```

## 5. Wire Grading (5 minutes)

After you stream response to client:

```typescript
// After streaming finishes, call:
gradeResponseAsync(
  session.id,
  messageId,
  userMessage,
  aiResponse,  // The full response text
  {
    propertiesShown: searchResults.length,
    propertyNames: searchResults.map(r => r.name),
  }
)
// This runs async in background — doesn't block
```

## 6. Test (10 minutes)

```bash
# Build
npm run build
# Should pass with no errors

# Run server
npm run dev

# In chat:
# 1. Ask "I need 3BHK near metro"
# 2. Refresh page (same session)
# 3. Ask "show me options"
# → Should remember "3BHK" from prior turn ✅
```

Check database:
```bash
# Terminal:
psql -U $USER -h localhost realtypals

# In psql:
SELECT COUNT(*) FROM session_memory;
SELECT COUNT(*) FROM response_grades;
# Should have records if you chatted
```

## 7. Monitor (Ongoing)

Every day, check:
```bash
SELECT 
  AVG(grade_score) as avg_score,
  COUNT(*) as total_graded,
  MAX(created_at) as last_grade
FROM response_grades;
# Expect: avg_score 60-80, gradual increase over time
```

## 8. Iterate

If scores low (<50):
1. Check `grading_reason` column in response_grades
2. Adjust prompt in `responseGrader.ts` function `buildGradePrompt()`
3. Test with fresh session

---

## Common Issues

### "migration not found"
```bash
cd backend && npx prisma migrate status
# If phase0_conversation_memory shows "Pending", run:
npx prisma migrate dev
```

### "SessionMemory is not exported"
```bash
cd backend && npx prisma generate
# Rebuilds Prisma Client
```

### "grades not appearing"
```bash
# 1. Check gradeResponseAsync was called
# 2. Wait 5 seconds
# 3. Query: SELECT * FROM response_grades ORDER BY created_at DESC LIMIT 5;
# 4. Check logs for errors: grep GRADER logs/app.log
```

### "intent not hydrating"
```bash
# 1. Verify persistIntentToMemory was called in chat.ts
# 2. Check: SELECT * FROM session_memory WHERE session_id='<session_id>';
# 3. Confirm extracted_intent column has JSON (not null)
```

---

## Commit Messages

After each section:

```bash
# Phase 0 complete:
git commit -m "feat: add session memory hydration (Phase 0)

- hydrateIntentFromMemory: restore user intent on session load
- persistIntentToMemory: save intent after each turn
- trackPropertyReaction: log user interest signals"

# Phase 1 complete:
git commit -m "feat: add response grading engine (Phase 1)

- gradeResponseAsync: async quality scoring
- Score responses on directness, properties shown, trade-offs, guidance
- Runs in background, no blocking"
```

---

## Rollback (If Needed)

Before pushing to production:
```bash
npx prisma migrate resolve --rolled-back phase0_conversation_memory
git revert <commit>
```

After pushing:
```typescript
// In chat.ts, comment out:
// const hydratedIntent = await hydrateIntentFromMemory(...)
// await persistIntentToMemory(...)
// gradeResponseAsync(...)
// No data lost, just not used
```

---

**Done!** You now have persistent conversation memory + AI-graded responses.

Next: Monitor for a week, then add retry logic for low-scoring responses.
