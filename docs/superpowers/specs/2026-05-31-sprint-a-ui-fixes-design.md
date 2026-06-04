# Sprint A: Amenity Icons + RERA Link + Sidebar Chats

**Date:** 2026-05-31  
**Status:** Approved (user confirmed "go ahead" after Sprint B)

---

## Problem 1 — Amenity Icons (all show same icon)

**Root cause A:** `AMENITY_MAP` in `AmenityIcon.tsx` uses snake_case keys (`tennis_court`) but the database passes human-readable strings (`"Tennis Court"`). Every amenity falls through to the `Home` icon fallback.

**Root cause B:** `AmenityGrid` component has a bug — it calls `getMappedAmenities(amenities, max)` but then renders `amenities.slice(0, max)` (raw input), not the `mapped` result. The deduplication is computed but thrown away.

**Root cause C:** `ProjectDetailPanel` amenities tab renders by category (one icon per category like `sports: SoccerBall`), not per individual amenity. So cricket, tennis, jogging, badminton all get the same `SoccerBall`.

**Fix:**
1. Add normalization function: `normalizeAmenityKey(name: string): string` — converts "Tennis Court" → "tennis_court", "Jogging Track" → "jogging_track", handles case, spaces → underscores, special chars stripped.
2. Update `getAmenityMeta` to normalize the key before lookup.
3. Fix `AmenityGrid` to render `mapped` not `amenities.slice`.
4. Update `ProjectDetailPanel` amenities tab to render individual `<AmenityIcon>` per amenity name inside each category group, instead of just a text pill with a category icon.
5. Expand `AMENITY_MAP` with Phosphor icons (already installed) for sport amenities that need distinct visual treatment. Use Lucide for non-sport amenities.

**New icons needed (Phosphor):**
- `jogging_track`, `running_track` → `PersonSimpleRun`
- `cricket_pitch`, `cricket_stadium`, `cricket_net` → `Cricket` (Phosphor has this)
- `tennis_court` → `Tennis` (Phosphor)
- `basketball_court` → `Basketball` (Phosphor)
- `swimming_pool`, `lap_pool` → `Drop` or keep Lucide `Waves`
- `football_ground`, `soccer` → `SoccerBall` (Phosphor, already used)
- `badminton_court` → keep `Volleyball` (no Phosphor badminton)
- `cycling_track`, `bicycle_track` → `Bicycle` (Phosphor)
- `squash_court` → `Racquet` (Phosphor)

**Icon type unification:** `AmenityMeta.lucideIcon` is too narrow. Rename to `icon` typed as `React.ElementType` — works for both Lucide and Phosphor since both export React components.

---

## Problem 2 — RERA Badge Not Clickable

**Current:** Line 130–135 in `ProjectDetailPanel.tsx` is a `<div>`. The `rera_url`/`reraUrl` field is not in the `ProjectCard` TypeScript type.

**Fix:**
1. Add `rera_url?: string` to `ProjectCard` type in `frontend/types/project.ts`.
2. Check if the backend `toProjectCard()` already returns `rera_url` — if not, add it.
3. Change the RERA `<div>` to `<a href={d.rera_url} target="_blank" rel="noopener noreferrer">` when `rera_url` is present. Keep as non-clickable badge when no URL.
4. Add visual affordance: `cursor-pointer` + subtle hover state + `ExternalLink` icon next to RERA number.

---

## Problem 3 — Sidebar Recent Chats (static placeholders)

**Current:** `Sidebar.tsx` lines 49–53 — static array `recentChats`, no API call, shown as disabled items with "Soon" badge.

**Fix:**
1. Add `GET /api/v1/chat-sessions` route to backend (or use existing `chatSession.ts` route if it exists).
2. In `Sidebar.tsx`, fetch recent sessions on mount using `userId` prop. Show last 5 sessions by `updated_at` desc.
3. Each session becomes a clickable link: clicking navigates to `/discover?session={id}` which restores that conversation.
4. Show session label: use `title` field if present, else first 40 chars of first user message, else "Chat {date}".
5. Loading state: skeleton shimmer while fetching.
6. If user is not logged in (`userId` is null): hide the Recent section entirely.

---

## Files Touched

| File | Change |
|------|--------|
| `frontend/components/AmenityIcon.tsx` | Normalize lookup, fix AmenityGrid bug, expand icon map with Phosphor, rename `lucideIcon` → `icon` |
| `frontend/components/ProjectDetailPanel.tsx` | Amenities tab: render AmenityIcon per item; RERA div → clickable link |
| `frontend/types/project.ts` | Add `rera_url?: string` to `ProjectCard` |
| `backend/src/repositories/projectRepository.ts` | Add `rera_url` to `toProjectCard()` output |
| `backend/src/routes/chatSession.ts` | Verify/add GET list endpoint |
| `frontend/components/Sidebar.tsx` | Fetch real sessions, render as links, skeleton loading |

---

## Success Criteria
- [ ] All amenity icons are distinct — jogging ≠ tennis ≠ cricket ≠ badminton
- [ ] Amenity lookup works for human-readable strings ("Tennis Court", "Jogging Track")
- [ ] AmenityGrid renders the deduplicated `mapped` list, not raw array
- [ ] ProjectDetailPanel amenities tab shows per-amenity icons, not category-level only
- [ ] RERA badge is a clickable external link when `rera_url` is set, non-clickable otherwise
- [ ] Sidebar shows last 5 real chat sessions for logged-in users
- [ ] Sidebar hides Recent section for anonymous users
- [ ] No TypeScript errors (`npm run build` passes)
