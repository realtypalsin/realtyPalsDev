# Phase 2 Regression Testing Checklist

This checklist documents what should be verified after Phase 2 implementation to ensure no regressions were introduced.

## Task 2.1: Soft dedup with floor guarantee
- [ ] Chat starts a new session without errors
- [ ] Chips are shown on initial response (≥2 if available)
- [ ] Repeated chips don't show in same session (dedup works)
- [ ] When all new chips are deduplicated, floor kicks in and original set shows (prevents starvation)

## Task 2.2: History filter on user messages only
- [ ] AI names an entity (e.g., "Sector 75") without returning it as structured result
- [ ] Chips for that entity are NOT deleted from future suggestions
- [ ] Chips for previously-discussed user topics ARE still deleted (history filter working)
- [ ] Verify in chipProvider.ts (line 115), conversationEngine.ts (lines 217, 340)

## Task 2.3: capChips fill guarantee
- [ ] Results return chips with mixed priorities (1-4+)
- [ ] Priority 1-2 chips fill slots first
- [ ] If priority buckets don't fill 4 slots, full set is returned (no empty slots)
- [ ] Verify capChips function at conversationEngine.ts line 368

## Task 2.4: getFloorChips function
- [ ] Function exists and compiles
- [ ] Infrastructure in place to call it at engine exit
- [ ] No immediate behavior change (noop for now)

## Task 2.5: Prose entity extraction
- [ ] AI provides text-only answer describing known sectors/projects
- [ ] Sector names (e.g., "Sector 75") are extracted and matched to database
- [ ] Project names mentioned in prose are extracted and matched
- [ ] Chips are generated for matched entities
- [ ] Chips appear in the UI even though no structured results were returned
- [ ] Verify generateProseEntityChips in chips.ts and fallback in conversationEngine.ts

## Task 2.6: Persist chips onto message
- [ ] Migration script created (frontend/prisma/migrations)
- [ ] Schema updated with chips Json field
- [ ] No TypeScript errors on schema changes
- [ ] Database migration can be applied (when DB issues resolved)

## Task 2.7: Render chips on all messages
- [ ] Non-last messages with persisted chips render those chips
- [ ] Chips are clickable on older messages
- [ ] Last message still uses conversationState chips if no persisted chips
- [ ] Remove isLast condition from MessageBubble successful
- [ ] DiscoveryContent passes message.chips correctly

## Overall Regression Tests
- [ ] Chat flow completes without errors
- [ ] No broken imports or type errors (`npx tsc --noEmit`)
- [ ] Chips render for structured search results
- [ ] Chips render for text-only AI responses
- [ ] No chip starvation (always ≥1 chip if any exist)
- [ ] Dedup doesn't permanently block repeated chips across turns
- [ ] Admin panel (if accessed) shows no new errors

## Known Issues to Avoid
- **RC-1 (Session dedup too aggressive)**: Fixed with filterNewChipsWithFloor
- **RC-2 (History includes assistant messages)**: Fixed by filtering on user messages only
- **RC-3 (Text-only answers emit no chips)**: Fixed with prose entity extraction
- **RC-4 (capChips discards priority 4+)**: Fixed with capChips floor guarantee
- **RC-5 (Engine exit doesn't guarantee floor)**: Infrastructure added (getFloorChips)

## Testing Notes
- These regressions require running the actual app (browser/UI testing)
- Automated tests for chip dedup/floor logic should be added to the test suite
- End-to-end tests should cover: search flow → text response → chips; search → structured results → chips

## Sign-Off
After completing all items in this checklist, Phase 2 is ready for:
- [ ] Code review
- [ ] QA testing
- [ ] Merge to main
