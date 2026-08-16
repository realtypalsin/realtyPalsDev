# ERRORS.md

## Failed Approaches & Learnings
When an approach takes >2 attempts, log it here: What didn't work / What worked instead / Note for next time.

---

## Current Session (2026-08-16)

### CLAUDE.md Session Start Protocol
**What Didn't Work:** Mandated loading `.claude/COMMON_MISTAKES.md`, `.claude/QUICK_START.md`, `.claude/ARCHITECTURE_MAP.md` at session start. Files didn't exist.
**What Worked:** Removed dead links from session start protocol. Created MEMORY.md/ERRORS.md instead for actual context persistence.
**Note For Next Time:** Check that linked files exist before mandating their use. Test the protocol with a fresh clone.

### Better Auth Integration
**What Didn't Work:** CLAUDE.md documented "Authentication: Better Auth" but codebase uses Supabase.
**What Worked:** Verified actual auth in `frontend/lib/auth.ts` and `frontend/app/auth/` — all Supabase-based.
**Note For Next Time:** Always check live code state before documenting external libraries. Better Auth was planned but never implemented.

---

## Past Sessions
(Archive here as sessions complete)

---
