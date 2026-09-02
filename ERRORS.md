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


## Session 2026-09-02

### Fixing "general queries fail" by editing prompts and regexes
**What Didn't Work:** Several rounds of adding a regex or softening prompt
wording for each failing query. Every fix collided with the next: a new pattern
in one lane's matcher stole turns from another lane, and a softened refusal
string still sat behind an early `return`, so the model was never asked. The
loop is inherent to the shape — the pipeline is ~40 sequential gates each of
which returns the turn, so a per-query fix is a per-query gate.
**What Worked:** Three structural changes instead. (1) One general-answer floor
(`answerAsGeneralQuestion`) that every dead end hands off to, so no lane may
refuse. (2) DISCOVERY requires a property-search signal rather than a sentence
shape, so non-shopping turns stop getting cards. (3) DRILLDOWN requires a
project in scope, so the ~30 attribute keywords stop claiming Noida-wide
questions.
**Note For Next Time:** When the same class of query keeps failing after two
targeted fixes, the routing is the bug, not the pattern. Look for the gate that
returns before the code that could answer — grep for `res.end()` and early
`return` in the lane, not for the regex.

### Assuming a refusal came from the model
**What Didn't Work:** Reading refusals ("I need a project name", "we don't have
this in our database", "being updated by our verified data team") as prompt or
model-quality problems.
**What Worked:** They were hardcoded strings returned before any LLM call —
`unknownProject.ts`, `chat-service.ts`, `coverageGap.ts`, and the project-detail
lane's own branches. Grepping the refusal text found each one in seconds.
**Note For Next Time:** Grep the exact user-visible sentence first. If it is in
the source, no amount of prompt work will change it.

### Trusting that a documented fix stayed fixed
**What Didn't Work:** Assuming the fabrication defaults recorded as removed in
comments were actually gone. `projectDataGateway` has a comment block listing
`delivery_score ?? 85` and friends as removed, and 60 lines below it
`delivery_score ?? 90` had come back. `totalOutflow`'s file header describes
inventing one base price as the bug it fixed; its no-project branch had grown
three. `sanitizeOutput.normalizeCitations` contradicted its own doc comment.
**What Worked:** Running the guard tests that already existed
(`noAssertedVerification`, `marketTable`, `sanitizeOutput`) and reading their
assertion messages, then grepping for `?? <literal>` and `|| '<literal>'` across
the data layer.
**Note For Next Time:** A comment saying a bug was fixed is evidence about the
past, not the present. The guard test is the evidence. When a test in a
safety-critical area is red, read the assertion before assuming test drift —
9 of the 13 red tests here were the code being wrong, not the test.

### Weakening a guard test to make it pass
**What Didn't Work:** Two invariants had legitimate new exceptions
(`chatFieldCoverage` requires every exposed field to reach the prompt;
`topicLaneCards` forbids handlers emitting their own cards). Deleting or
loosening the assertion was the quick path.
**What Worked:** A named allowlist with a stated reason per entry, plus a test
asserting each reason exists — the pattern `chatFieldCoverage` already used for
`NOT_BUYER_FACTS`. The invariant stays sharp for every future field.
**Note For Next Time:** An exception belongs in a declared list with a reason,
not in a relaxed assertion. Make "add it to the exclusions" something someone
has to argue for.
---

## Past Sessions
(Archive here as sessions complete)

---
