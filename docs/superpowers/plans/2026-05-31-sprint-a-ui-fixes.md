# Sprint A: Amenity Icons + RERA Link + Sidebar Chats — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix amenity icons (all showing same icon), make RERA badge a clickable external link, and wire the sidebar Recent section to real chat sessions from the database.

**Architecture:** Three independent frontend changes + one small backend addition. No schema migrations needed. Amenity fix is entirely in `AmenityIcon.tsx` + `ProjectDetailPanel.tsx`. RERA fix adds one field to the type and backend mapper. Sidebar change adds a backend list endpoint and frontend fetch.

**Tech Stack:** Next.js, React, TypeScript, Tailwind, Lucide icons, `@phosphor-icons/react` (already installed), Express (backend routes)

---

## File Map

| File | What changes |
|------|-------------|
| `frontend/components/AmenityIcon.tsx` | Add `normalizeAmenityKey()`, fix `AmenityGrid` bug, rename `lucideIcon`→`icon`, add Phosphor sport icons |
| `frontend/components/ProjectDetailPanel.tsx` | Amenities tab renders `<AmenityIcon>` per item; RERA div→link |
| `frontend/types/project.ts` | Add `rera_url?: string \| null` to `ProjectCard` |
| `backend/src/repositories/projectRepository.ts` | Add `rera_url: p.rera_url` in `toProjectCard()` |
| `backend/src/routes/chatSession.ts` | Add `GET /list` returning last 5 sessions |
| `frontend/components/Sidebar.tsx` | Fetch real sessions, render as links, skeleton loading |

---

## Task 1: Fix AmenityIcon — normalization, bug fix, better icons

**Files:**
- Modify: `frontend/components/AmenityIcon.tsx`

### Context
Current bugs:
1. `AMENITY_MAP` keys are snake_case (`tennis_court`) but DB sends human-readable strings (`"Tennis Court"`) → all fall to `Home` icon fallback
2. `AmenityGrid` renders `amenities.slice(0, max)` (raw input) instead of the computed `mapped` array — deduplication is wasted
3. Tennis, cricket, jogging, badminton all share `Volleyball` or `Trophy` — no visual distinction

`@phosphor-icons/react` is already installed (used in `ProjectDetailPanel.tsx`). Use Phosphor for sport-specific icons that Lucide doesn't cover well.

- [ ] **Step 1: Add `normalizeAmenityKey` function**

Replace the file's imports section and add the function. The full updated file (keep all existing AMENITY_MAP entries, add new ones, fix types):

```typescript
'use client';

import {
  Dumbbell, Car, ShieldCheck, Trees, Flame, Waves, Trophy, Baby,
  Clapperboard, ShoppingCart, Zap, ArrowUpDown, Lightbulb, Heart,
  Home, Flower2, Wind, Mountain, PartyPopper, IceCreamCone,
  Binoculars, Coffee, CloudSun, Droplets, ThermometerSun, Sparkles,
  Sofa, TreePine, Sprout, type LucideIcon,
} from 'lucide-react';
import {
  PersonSimpleRun, Cricket, Basketball, Tennis, SoccerBall,
  Bicycle, Barbell, PersonSimpleSwim, Waves as PhWaves,
} from '@phosphor-icons/react';

export interface AmenityMeta {
  icon: React.ElementType;
  label: string;
  color: string;
}
```

- [ ] **Step 2: Add `normalizeAmenityKey` and update `AMENITY_MAP`**

Add after imports:

```typescript
/**
 * Converts "Tennis Court" → "tennis_court", "Jogging Track" → "jogging_track"
 * Handles extra spaces, special chars, mixed case.
 */
export function normalizeAmenityKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_');
}
```

Then rewrite the `AMENITY_MAP` constant — rename `lucideIcon` → `icon` on every entry, and replace sports icons with Phosphor where appropriate:

```typescript
const AMENITY_MAP: Record<string, AmenityMeta> = {
  // ─── Pool / Water ───
  swimming_pool:                  { icon: Waves,            label: 'Swimming Pool',       color: 'bg-blue-50' },
  lap_pool:                       { icon: Waves,            label: 'Lap Pool',             color: 'bg-blue-50' },
  kids_pool:                      { icon: PersonSimpleSwim, label: 'Kids Pool',            color: 'bg-blue-50' },
  hydrotherapy:                   { icon: Droplets,         label: 'Hydrotherapy',         color: 'bg-blue-50' },
  private_pool:                   { icon: Waves,            label: 'Private Pool',         color: 'bg-blue-50' },
  infinity_pool:                  { icon: Waves,            label: 'Infinity Pool',        color: 'bg-blue-50' },
  temperature_controlled_pool:    { icon: ThermometerSun,   label: 'Temperature Pool',     color: 'bg-blue-50' },
  steam_sauna:                    { icon: Flame,            label: 'Steam & Sauna',        color: 'bg-orange-50' },
  jacuzzi:                        { icon: Droplets,         label: 'Jacuzzi',              color: 'bg-blue-50' },
  spa:                            { icon: Sparkles,         label: 'Spa',                  color: 'bg-purple-50' },
  health_club:                    { icon: Heart,            label: 'Health Club',          color: 'bg-red-50' },

  // ─── Fitness ───
  gym:                            { icon: Dumbbell,         label: 'Gym & Fitness',        color: 'bg-violet-50' },
  gymnasium:                      { icon: Dumbbell,         label: 'Gymnasium',            color: 'bg-violet-50' },
  yoga_area:                      { icon: Sparkles,         label: 'Yoga Area',            color: 'bg-purple-50' },
  yoga_room:                      { icon: Sparkles,         label: 'Yoga Room',            color: 'bg-purple-50' },
  yoga_deck:                      { icon: Sparkles,         label: 'Yoga Deck',            color: 'bg-purple-50' },
  yoga_center:                    { icon: Sparkles,         label: 'Yoga Center',          color: 'bg-purple-50' },
  meditation_pavilion:            { icon: Sparkles,         label: 'Meditation',           color: 'bg-purple-50' },
  meditation_garden:              { icon: Sparkles,         label: 'Meditation Garden',    color: 'bg-purple-50' },

  // ─── Sports — distinct icons ───
  jogging_track:                  { icon: PersonSimpleRun,  label: 'Jogging Track',        color: 'bg-green-50' },
  running_track:                  { icon: PersonSimpleRun,  label: 'Running Track',        color: 'bg-green-50' },
  cycling_track:                  { icon: Bicycle,          label: 'Cycling Track',        color: 'bg-green-50' },
  bicycle_track:                  { icon: Bicycle,          label: 'Bicycle Track',        color: 'bg-green-50' },
  cricket_pitch:                  { icon: Cricket,          label: 'Cricket Pitch',        color: 'bg-green-50' },
  cricket_stadium:                { icon: Cricket,          label: 'Cricket Stadium',      color: 'bg-green-50' },
  cricket_net:                    { icon: Cricket,          label: 'Cricket Nets',         color: 'bg-green-50' },
  cricket_academy:                { icon: Cricket,          label: 'Cricket Academy',      color: 'bg-green-50' },
  tennis_court:                   { icon: Tennis,           label: 'Tennis Court',         color: 'bg-yellow-50' },
  lawn_tennis:                    { icon: Tennis,           label: 'Lawn Tennis',          color: 'bg-yellow-50' },
  basketball_court:               { icon: Basketball,       label: 'Basketball Court',     color: 'bg-orange-50' },
  football_ground:                { icon: SoccerBall,       label: 'Football Ground',      color: 'bg-green-50' },
  badminton_court:                { icon: Dumbbell,         label: 'Badminton Court',      color: 'bg-green-50' },
  squash_court:                   { icon: Trophy,           label: 'Squash Court',         color: 'bg-green-50' },
  skating_rink:                   { icon: IceCreamCone,     label: 'Skating Rink',         color: 'bg-purple-50' },
  sports_courts:                  { icon: Trophy,           label: 'Sports Courts',        color: 'bg-green-50' },
  multipurpose_sports:            { icon: Trophy,           label: 'Sports Area',          color: 'bg-green-50' },

  // ─── Clubhouse / Lounge ───
  resort_style_clubhouse:         { icon: Sofa,             label: 'Resort Clubhouse',     color: 'bg-amber-50' },
  clubhouse:                      { icon: Sofa,             label: 'Clubhouse',            color: 'bg-amber-50' },
  club_house:                     { icon: Sofa,             label: 'Club House',           color: 'bg-amber-50' },
  luxury_club:                    { icon: Sparkles,         label: 'Luxury Club',          color: 'bg-amber-50' },
  luxury_lobby:                   { icon: Sparkles,         label: 'Luxury Lobby',         color: 'bg-amber-50' },
  sky_lounge:                     { icon: CloudSun,         label: 'Sky Lounge',           color: 'bg-sky-50' },

  // ─── Entertainment ───
  floating_restaurant:            { icon: Coffee,           label: 'Restaurant',           color: 'bg-rose-50' },
  amphitheatre:                   { icon: Clapperboard,     label: 'Amphitheatre',         color: 'bg-purple-50' },
  mini_theater:                   { icon: Clapperboard,     label: 'Mini Theater',         color: 'bg-purple-50' },
  cafe:                           { icon: Coffee,           label: 'Café & Lounge',        color: 'bg-rose-50' },
  multipurpose_hall:              { icon: PartyPopper,      label: 'Multipurpose Hall',    color: 'bg-pink-50' },
  party_hall:                     { icon: PartyPopper,      label: 'Party Hall',           color: 'bg-pink-50' },

  // ─── Kids / Family ───
  kids_play_area:                 { icon: Baby,             label: 'Kids Play Area',       color: 'bg-pink-50' },
  children_play_area:             { icon: Baby,             label: 'Kids Play Area',       color: 'bg-pink-50' },
  child_development_center:       { icon: Baby,             label: 'Kids Center',          color: 'bg-pink-50' },
  landscaped_play_zones:          { icon: Baby,             label: 'Play Zones',           color: 'bg-pink-50' },
  private_party_deck:             { icon: PartyPopper,      label: 'Party Deck',           color: 'bg-pink-50' },

  // ─── Shopping ───
  shopping_center:                { icon: ShoppingCart,     label: 'Shopping Center',      color: 'bg-teal-50' },
  shopping_arcade:                { icon: ShoppingCart,     label: 'Shopping Arcade',      color: 'bg-teal-50' },
  convenience_store:              { icon: ShoppingCart,     label: 'Convenience Store',    color: 'bg-teal-50' },
  convenient_shopping:            { icon: ShoppingCart,     label: 'Shopping',             color: 'bg-teal-50' },
  feature_mall:                   { icon: ShoppingCart,     label: 'Feature Mall',         color: 'bg-teal-50' },

  // ─── Security / Service ───
  security:                       { icon: ShieldCheck,      label: '24/7 Security',        color: 'bg-slate-50' },
  concierge:                      { icon: ShieldCheck,      label: 'Concierge',            color: 'bg-slate-50' },
  concierge_service:              { icon: ShieldCheck,      label: 'Concierge Service',    color: 'bg-slate-50' },
  smart_home_automation:          { icon: Lightbulb,        label: 'Smart Home',           color: 'bg-indigo-50' },

  // ─── Tech / Infra ───
  power_backup:                   { icon: Zap,              label: 'Power Backup',         color: 'bg-yellow-50' },
  private_elevator:               { icon: ArrowUpDown,      label: 'Private Elevator',     color: 'bg-slate-50' },
  automated_lighting:             { icon: Lightbulb,        label: 'Smart Lighting',       color: 'bg-yellow-50' },
  high_speed_lifts:               { icon: ArrowUpDown,      label: 'High-Speed Lifts',     color: 'bg-slate-50' },
  health_wellness_clinic:         { icon: Heart,            label: 'Wellness Clinic',      color: 'bg-red-50' },
  electric_charging_station:      { icon: Zap,              label: 'EV Charging',          color: 'bg-yellow-50' },

  // ─── Parking ───
  parking:                        { icon: Car,              label: 'Parking',              color: 'bg-gray-50' },
  dedicated_parking:              { icon: Car,              label: 'Dedicated Parking',    color: 'bg-gray-50' },

  // ─── Golf / Garden ───
  golf_course:                    { icon: TreePine,         label: 'Golf Course',          color: 'bg-emerald-50' },
  golf_facing:                    { icon: TreePine,         label: 'Golf View',            color: 'bg-emerald-50' },
  golf_course_access:             { icon: TreePine,         label: 'Golf Access',          color: 'bg-emerald-50' },
  golf_view:                      { icon: TreePine,         label: 'Golf View',            color: 'bg-emerald-50' },
  pitch_and_putt_golf:            { icon: TreePine,         label: 'Golf',                 color: 'bg-emerald-50' },
  organic_garden:                 { icon: Sprout,           label: 'Organic Garden',       color: 'bg-emerald-50' },
  private_garden:                 { icon: Sprout,           label: 'Private Garden',       color: 'bg-emerald-50' },
  orchard_gardens:                { icon: Trees,            label: 'Orchard Gardens',      color: 'bg-emerald-50' },

  // ─── Outdoor / View ───
  forest_groves:                  { icon: Trees,            label: 'Forest Grove',         color: 'bg-emerald-50' },
  sculpture_garden:               { icon: Flower2,          label: 'Sculpture Garden',     color: 'bg-emerald-50' },
  panoramic_view:                 { icon: Binoculars,       label: 'Panoramic View',       color: 'bg-sky-50' },
  three_side_open:                { icon: Wind,             label: 'Three-Side Open',      color: 'bg-sky-50' },
  private_terrace:                { icon: CloudSun,         label: 'Private Terrace',      color: 'bg-sky-50' },
  low_density:                    { icon: Mountain,         label: 'Low Density',          color: 'bg-emerald-50' },
  sitting_plaza:                  { icon: Sofa,             label: 'Sitting Plaza',        color: 'bg-amber-50' },

  // ─── Interior / Luxury ───
  marazzo_flooring:               { icon: Home,             label: 'Premium Flooring',     color: 'bg-amber-50' },
  luxury_interiors:               { icon: Home,             label: 'Luxury Interiors',     color: 'bg-amber-50' },
  ac_units:                       { icon: Wind,             label: 'AC Units',             color: 'bg-sky-50' },
  modular_kitchen:                { icon: Home,             label: 'Modular Kitchen',      color: 'bg-amber-50' },
  vitrified_tiles:                { icon: Home,             label: 'Premium Flooring',     color: 'bg-amber-50' },
};
```

- [ ] **Step 3: Update `getAmenityMeta` to use normalization**

```typescript
export function getAmenityMeta(amenityKey: string): AmenityMeta {
  const normalized = normalizeAmenityKey(amenityKey);
  if (AMENITY_MAP[normalized]) return AMENITY_MAP[normalized];
  // Also try the raw key (in case it's already snake_case)
  if (AMENITY_MAP[amenityKey]) return AMENITY_MAP[amenityKey];

  const label = amenityKey
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return { icon: Home, label, color: 'bg-gray-50' };
}
```

- [ ] **Step 4: Fix `getMappedAmenities` — remove `lucideIcon` reference**

The deduplication uses `meta.lucideIcon?.displayName` which no longer exists. Update to use `meta.label` for deduplication (simpler and correct):

```typescript
export function getMappedAmenities(amenities: string[], max = 6): AmenityMeta[] {
  const seen = new Set<string>();
  return amenities
    .map((a) => getAmenityMeta(a))
    .filter((meta) => {
      if (seen.has(meta.label)) return false;
      seen.add(meta.label);
      return true;
    })
    .slice(0, max);
}
```

- [ ] **Step 5: Fix `AmenityIcon` component — use `icon` not `lucideIcon`**

```typescript
export default function AmenityIcon({ amenity, size = 'md', showLabel = true }: AmenityIconProps) {
  const meta = getAmenityMeta(amenity);
  const s = sizeMap[size];
  const IconComp = meta.icon;

  return (
    <div className="flex flex-col items-center gap-1" title={meta.label}>
      <div className={`${s.tile} ${meta.color} rounded-xl flex items-center justify-center transition-colors hover:brightness-95`}>
        {IconComp ? (
          <IconComp size={s.lucide} className="text-gray-600" strokeWidth={1.8} weight="duotone" />
        ) : (
          <span className="text-gray-400 text-xs">•</span>
        )}
      </div>
      {showLabel && (
        <span className={`${s.label} text-gray-500 text-center leading-tight max-w-[4.5rem] truncate`}>
          {meta.label}
        </span>
      )}
    </div>
  );
}
```

Note: `weight="duotone"` is a Phosphor prop — Lucide ignores unknown props, so this is safe to pass to both.

- [ ] **Step 6: Fix `AmenityGrid` — render `mapped` not `amenities.slice`**

```typescript
export function AmenityGrid({
  amenities,
  max = 6,
  size = 'md',
  showLabel = true,
  cols = 'grid-cols-3 sm:grid-cols-6',
}: {
  amenities: string[];
  max?: number;
  size?: AmenitySize;
  showLabel?: boolean;
  cols?: string;
}) {
  const mapped = getMappedAmenities(amenities, max);
  if (mapped.length === 0) return null;

  return (
    <div className={`grid ${cols} gap-3`}>
      {mapped.map((meta, idx) => {
        const IconComp = meta.icon;
        const s = sizeMap[size];
        return (
          <div key={idx} className="flex flex-col items-center gap-1" title={meta.label}>
            <div className={`${s.tile} ${meta.color} rounded-xl flex items-center justify-center hover:brightness-95 transition-colors`}>
              <IconComp size={s.lucide} className="text-gray-600" strokeWidth={1.8} weight="duotone" />
            </div>
            {showLabel && (
              <span className={`${s.label} text-gray-500 text-center leading-tight max-w-[4.5rem] truncate`}>
                {meta.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 7: Verify Phosphor icon imports exist**

Run in the frontend directory:
```bash
cd frontend && node -e "const p = require('@phosphor-icons/react'); console.log(!!p.Cricket, !!p.Tennis, !!p.Basketball, !!p.PersonSimpleRun, !!p.Bicycle, !!p.SoccerBall, !!p.PersonSimpleSwim);"
```

Expected output: `true true true true true true true`

If any icon is `false` (not available in installed version), substitute:
- Missing `Cricket` → use `Trophy`
- Missing `Tennis` → use `Circle` from Lucide
- Missing `Basketball` → use `Circle`
- Missing `PersonSimpleRun` → use `Dumbbell`
- Missing `Bicycle` → use `Dumbbell`
- Missing `PersonSimpleSwim` → use `Waves`

- [ ] **Step 8: Check TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `AmenityIcon.tsx`. Fix any type errors before proceeding.

- [ ] **Step 9: Commit**

```bash
git add frontend/components/AmenityIcon.tsx
git commit -m "feat: fix amenity icons — normalize lookup, distinct sport icons, fix AmenityGrid bug"
```

---

## Task 2: Update ProjectDetailPanel — amenities tab + RERA link

**Files:**
- Modify: `frontend/components/ProjectDetailPanel.tsx`

### Context
Two independent changes in the same file:
1. **Amenities tab** (lines 319–349): currently renders one icon per CATEGORY with amenity names as text pills. Change to render `<AmenityIcon>` per individual amenity inside each category section.
2. **RERA badge** (lines 130–135): currently a `<div>`. Make it an `<a>` when `rera_url`/`rera_number` is available.

The `rera_url` field won't be in the `ProjectCard` type until Task 3. For now, we can use `(d as any).rera_url` as a temporary measure, or do Task 3 first. **Do Task 3 first (type + backend), then this task.** But if running in parallel, use `(d as any).rera_url ?? null`.

- [ ] **Step 1: Add AmenityIcon import**

At the top of `ProjectDetailPanel.tsx`, add:
```typescript
import AmenityIcon from '@/components/AmenityIcon'
```

- [ ] **Step 2: Update amenities tab render**

Find the `{!loading && activeTab === 'Amenities' && (` block (around line 319). Replace the inner map to render per-amenity icons instead of just text pills:

```typescript
{!loading && activeTab === 'Amenities' && (
  <div className="p-5">
    {Object.entries(
      ((detail?.all_amenities ?? d?.top_amenities ?? []) as { name: string; category: string }[]).reduce(
        (acc, a) => { (acc[a.category] = acc[a.category] ?? []).push(a.name); return acc },
        {} as Record<string, string[]>
      )
    ).map(([cat, names]) => {
      const Icon = AMENITY_ICONS[cat] ?? Buildings
      const colorClass = AMENITY_COLORS[cat] ?? 'bg-gray-50 text-gray-600 border-gray-100'
      const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1)
      return (
        <div key={cat} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${colorClass}`}>
              <Icon size={13} weight="duotone" />
            </div>
            <p className="text-[12px] font-bold text-gray-700 uppercase tracking-wider">{catLabel}</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {(names as string[]).map((name: string) => (
              <AmenityIcon key={name} amenity={name} size="md" showLabel={true} />
            ))}
          </div>
        </div>
      )
    })}
  </div>
)}
```

- [ ] **Step 3: Make RERA badge clickable**

Find the RERA badge around line 130–135:
```typescript
{d?.rera_number && (
  <div className="absolute top-3 right-12 flex items-center gap-1 text-[10px] font-bold text-white bg-blue-600/90 backdrop-blur-sm px-2 py-1 rounded-lg">
    <Shield size={10} />
    RERA {d.rera_number}
  </div>
)}
```

Replace with:
```typescript
{d?.rera_number && (() => {
  const reraUrl = (d as any).rera_url ?? null
  const content = (
    <>
      <Shield size={10} />
      RERA {d.rera_number}
      {reraUrl && <ExternalLink size={8} className="ml-0.5 opacity-80" />}
    </>
  )
  return reraUrl ? (
    <a
      href={reraUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="absolute top-3 right-12 flex items-center gap-1 text-[10px] font-bold text-white bg-blue-600/90 backdrop-blur-sm px-2 py-1 rounded-lg hover:bg-blue-500/90 transition-colors cursor-pointer"
      onClick={(e) => e.stopPropagation()}
    >
      {content}
    </a>
  ) : (
    <div className="absolute top-3 right-12 flex items-center gap-1 text-[10px] font-bold text-white bg-blue-600/90 backdrop-blur-sm px-2 py-1 rounded-lg">
      {content}
    </div>
  )
})()}
```

Note: `ExternalLink` is already imported in this file.

- [ ] **Step 4: Check TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. If `(d as any).rera_url` causes lint warnings, they're fine until Task 3 adds the proper type.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/ProjectDetailPanel.tsx
git commit -m "feat: amenities tab shows per-item icons, RERA badge is clickable external link"
```

---

## Task 3: Add rera_url to type + backend mapper

**Files:**
- Modify: `frontend/types/project.ts`
- Modify: `backend/src/repositories/projectRepository.ts`

### Context
`ProjectCard` type is missing `rera_url`. The `toProjectCard()` function in the repository doesn't include it. The Prisma `Project` model should already have `rera_url` — verify with the schema. If it doesn't exist in the schema, we only add it to the mapper with a fallback.

- [ ] **Step 1: Add `rera_url` to `ProjectCard` type**

In `frontend/types/project.ts`, add after `rera_number`:
```typescript
export interface ProjectCard {
  // ...existing fields...
  rera_number?: string | null
  rera_url?: string | null        // ← add this line
  sector: string
  // ...rest unchanged...
}
```

- [ ] **Step 2: Check if `rera_url` exists in Prisma schema**

```bash
grep -n "rera_url" prisma/schema.prisma
```

- If found: proceed to Step 3
- If not found: the field doesn't exist in DB — skip adding it to the mapper and add a TODO comment. The RERA URL can be constructed from the RERA number as a fallback in the frontend for now.

- [ ] **Step 3: Add `rera_url` to `toProjectCard()` return**

In `backend/src/repositories/projectRepository.ts`, inside the `return { ... }` of `toProjectCard()`, add after `rera_number`:

```typescript
rera_number: p.rera_number,
rera_url: p.rera_url ?? null,    // ← add this line
```

- [ ] **Step 4: Verify TypeScript in both frontend and backend**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
cd ../backend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Remove `(d as any).rera_url` cast in ProjectDetailPanel**

Now that the type exists, update `ProjectDetailPanel.tsx` line from:
```typescript
const reraUrl = (d as any).rera_url ?? null
```
to:
```typescript
const reraUrl = d?.rera_url ?? null
```

- [ ] **Step 6: Commit**

```bash
git add frontend/types/project.ts backend/src/repositories/projectRepository.ts frontend/components/ProjectDetailPanel.tsx
git commit -m "feat: add rera_url to ProjectCard type and backend mapper"
```

---

## Task 4: Wire sidebar recent chats

**Files:**
- Modify: `backend/src/routes/chatSession.ts`
- Modify: `frontend/components/Sidebar.tsx`

### Context
`chatSession.ts` has one route (`GET /`) that returns/creates a single session. We need a second route (`GET /list`) that returns the last 5 sessions for a user.

`Sidebar.tsx` currently has static placeholder `recentChats` array. It needs to fetch from the API on mount.

The `userId` prop is already passed to `Sidebar` — it comes from Supabase auth in `discover/page.tsx`.

- [ ] **Step 1: Add `GET /list` to chatSession route**

In `backend/src/routes/chatSession.ts`, add after the existing `router.get('/', ...)`:

```typescript
// GET /api/v1/chat-sessions/list — returns last 5 sessions with first user message as label
router.get('/list', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string | undefined
  if (!userId) {
    res.status(400).json({ error: 'X-User-Id header required' })
    return
  }

  const sessions = await prisma.chatSession.findMany({
    where: { user_id: userId },
    orderBy: { last_active: 'desc' },
    take: 5,
    include: {
      messages: {
        where: { role: 'user' },
        orderBy: { created_at: 'asc' },
        take: 1,
      },
    },
  })

  res.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      label: s.messages[0]?.content
        ? s.messages[0].content.slice(0, 45) + (s.messages[0].content.length > 45 ? '…' : '')
        : `Chat ${new Date(s.last_active).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
      last_active: s.last_active,
    })),
  })
})
```

- [ ] **Step 2: Verify the route is mounted in `index.ts`**

```bash
grep -n "chatSession" backend/src/index.ts
```

Expected: something like `app.use('/api/v1/chat-sessions', chatSessionRouter)`. If the route prefix includes `/chat-sessions`, then the new route is accessible at `/api/v1/chat-sessions/list`.

- [ ] **Step 3: Update `Sidebar.tsx` — fetch real sessions**

Replace the static `recentChats` array and add a fetch hook. Here is the full updated section of `Sidebar.tsx`:

Add to imports:
```typescript
import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/env';
```

Replace the static `recentChats` constant with a state + effect:
```typescript
// Remove: const recentChats = [ ... ]

// Add inside the component, after existing state declarations:
const [recentSessions, setRecentSessions] = useState<{ id: string; label: string }[]>([]);
const [sessionsLoading, setSessionsLoading] = useState(false);

useEffect(() => {
  if (!userId) return;
  setSessionsLoading(true);
  fetch(`${API_BASE}/chat-sessions/list`, {
    headers: { 'X-User-Id': userId },
  })
    .then((r) => r.json())
    .then((data) => setRecentSessions(data.sessions ?? []))
    .catch(() => setRecentSessions([]))
    .finally(() => setSessionsLoading(false));
}, [userId]);
```

- [ ] **Step 4: Update the Recent section render**

Find the "Recent Section" block (around line 174–192) and replace:

```typescript
{/* Recent Section — live chat history */}
{userId && (
  <div className="mb-6">
    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-4 font-medium">Recent</div>
    <div className="space-y-1">
      {sessionsLoading ? (
        // Skeleton
        [1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg">
            <div className="w-5 h-5 bg-gray-200 rounded animate-pulse flex-shrink-0" />
            <div className="h-3 bg-gray-200 rounded animate-pulse flex-1" />
          </div>
        ))
      ) : recentSessions.length === 0 ? (
        <div className="px-4 py-2 text-[12px] text-gray-400">No chats yet</div>
      ) : (
        recentSessions.map((session) => (
          <Link
            key={session.id}
            href={`/discover?session=${session.id}`}
            onClick={closeMobile}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-white/80 hover:text-blue-600 border border-transparent hover:border-blue-100 transition-all duration-200 group"
          >
            <Image
              src="/images/icons/recent.svg"
              alt=""
              width={18}
              height={18}
              className="flex-shrink-0 grayscale group-hover:grayscale-0 opacity-60 group-hover:opacity-100 transition-all"
            />
            <span className="text-sm truncate">{session.label}</span>
          </Link>
        ))
      )}
    </div>
  </div>
)}
```

- [ ] **Step 5: Check TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
cd ../backend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/chatSession.ts frontend/components/Sidebar.tsx
git commit -m "feat: sidebar shows real recent chat sessions from DB, skeleton loading, hides for anon users"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Amenity normalization (`normalizeAmenityKey`) — Task 1 Step 2
- [x] AmenityGrid bug fix — Task 1 Step 6
- [x] Distinct sport icons (cricket, tennis, basketball, jogging) — Task 1 Step 2 (AMENITY_MAP)
- [x] ProjectDetailPanel amenities tab: per-item icons — Task 2 Step 2
- [x] RERA badge → clickable link when `rera_url` set — Task 2 Step 3
- [x] `rera_url` in type and backend — Task 3
- [x] Sidebar `GET /list` backend route — Task 4 Step 1
- [x] Sidebar fetches real sessions — Task 4 Step 3
- [x] Sidebar shows skeleton loading — Task 4 Step 4
- [x] Sidebar hides Recent for anonymous — Task 4 Step 4 (`{userId && (`)
- [x] TypeScript check after every task — each task has tsc step

**No placeholders:** All steps include actual code.

**Type consistency:** `AmenityMeta.icon` typed as `React.ElementType` throughout — consistent across AMENITY_MAP, `getAmenityMeta`, `AmenityGrid`, `AmenityIcon` component.

**Execution order:** Task 2 uses `(d as any).rera_url` until Task 3 adds the proper type, then Step 5 of Task 3 removes the cast. Tasks can run in order 1 → 2 → 3 → 4 or 1 → 3 → 2 → 4.
