# Phase 0/1 Database Safety Checklist

## ✅ What's Safe

- [x] **No schema destructive changes**: Only adding new tables (`SessionMemory`, `ResponseGrade`)
- [x] **Existing tables untouched**: All current tables (projects, builders, chat_sessions, etc.) have zero changes
- [x] **Relations are additive**: ChatSession gets new optional relations (not required, backwards compatible)
- [x] **No data migration logic**: No `UPDATE` or `DELETE` on existing rows
- [x] **New tables empty on deploy**: SessionMemory and ResponseGrade tables start empty
- [x] **All writes are UPSERT**: sessionMemory writes use `upsert()` — cannot delete data
- [x] **Grading is fire-and-forget**: Runs async in background, never blocks response stream
- [x] **No truncation scripts**: Nothing clears or resets tables

## ⚠️ What to Verify BEFORE Running Migration

### 1. Backup (Highly Recommended)
```bash
# If you have a backup system, use it
# Otherwise, export current schema:
pg_dump -U $USER -h localhost $DB_NAME > backup_$(date +%s).sql

# Verify backup size (should be >1MB if you have any data):
ls -lh backup_*.sql
```

### 2. Check Current Schema Version
```bash
cd backend
npx prisma migrate status
```
Expected: Shows all existing migrations, none pending

### 3. Test Migration Locally First
```bash
# If you have a local dev DB:
DATABASE_URL="postgres://user:pass@localhost/realtypals_dev" \
npx prisma migrate dev --name phase0_conversation_memory

# Verify tables created:
npx prisma studio
# Should show SessionMemory and ResponseGrade tables (empty)
```

### 4. Dry Run on Production (Optional)
```bash
# Check what the migration would do WITHOUT applying it:
npx prisma migrate status --verbose
```

### 5. Apply Migration (Only After All Above Checks Pass)
```bash
# Production:
DATABASE_URL="..." npx prisma migrate deploy

# OR dev:
npx prisma migrate dev --name phase0_conversation_memory
```

## ⛔ What NOT to Do

- ❌ **Do NOT delete migration files** after running
- ❌ **Do NOT modify `prisma/schema.prisma`** without understanding side effects
- ❌ **Do NOT run `prisma db push`** — it can damage production (use `migrate deploy` instead)
- ❌ **Do NOT import grading code into chat.ts yet** — just have the functions ready
- ❌ **Do NOT manually edit tables** using SQL until Phase 1 is tested

## 🚨 If Something Goes Wrong

### Option 1: Rollback (Before Production Deploy)
```bash
# Lists migrations:
npx prisma migrate status

# If migration hasn't shipped to production yet:
npx prisma migrate resolve --rolled-back phase0_conversation_memory
```

### Option 2: Keep Tables, Skip Usage
```bash
# Tables are there but not used
# In chat.ts, just don't call sessionMemory or gradeResponse functions
# No data is at risk
```

### Option 3: Full Restore
```bash
# If you took a backup:
psql -U $USER -h localhost $DB_NAME < backup_XXX.sql
# Back to original schema
```

## ✅ Final Verification After Migration

```bash
# 1. Tables exist
psql -U $USER -h localhost $DB_NAME -c "\dt session_memory response_grades"
# Expected: Two tables shown, both empty

# 2. Relations exist
npx prisma introspect
# Expected: SessionMemory and ResponseGrade in schema

# 3. Can query with Prisma Client
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.sessionMemory.findMany().then(x => console.log('OK:', x)).catch(e => console.error('FAIL:', e.message));
"
# Expected: "OK: []"
```

---

## Timeline

- **Before Migration**: Follow "What to Verify" checklist above
- **During Migration**: Run `npx prisma migrate deploy` (1-2 seconds typically)
- **After Migration**: Run Final Verification above
- **Week 1**: Test sessionMemory in dev (don't touch chat.ts yet)
- **Week 2**: Add gradeResponse calls to chat.ts (one function at a time)
- **Week 3+**: Monitor grades, add retry logic

## Support

- Schema changes: Check `backend/prisma/schema.prisma` (new models at end)
- Session memory code: `backend/src/lib/ai/sessionMemory.ts`
- Grading code: `backend/src/lib/ai/responseGrader.ts`
- Integration: `PHASE0_PHASE1_INTEGRATION.md`
