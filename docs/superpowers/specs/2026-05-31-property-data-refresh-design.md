# Sprint B: Property Data Full Refresh

**Date:** 2026-05-31  
**Status:** Approved  
**Scope:** Research and update all 17 property `.md` files with accurate, current data

---

## Goal

All 17 property `.md` files in `Projects/Noida/` contain stale or null data — particularly `projectStatus` (defaulting to "Under Construction" even for completed projects), missing `reraNumber`/`reraUrl`, incomplete pricing, null developer fields, and missing coordinates. This spec defines a parallel research sweep to correct all of this.

---

## Properties In Scope

### Sector 78 (5 properties)
- `SikkaKarmicGreens.md`
- `MahagunModerne.md`
- `MahagunMezzaria.md`
- `TheHydePark.md`
- `AssotechWindsorCourt.md`

### Sector 137 (5 properties)
- `ExoticaFresco.md`
- `LogixBlossomCounty.md`
- `ParamountFloraville.md`
- `ParasTierea.md`
- `SupertechEcociti.md`

### Sector 150 (7 properties)
- `AceParkway.md`
- `AtsKingstonHeath.md`
- `AtsPiousHideaways.md`
- `AtsPristine.md`
- `PrateekCanary.md`
- `GodrejPalmRetreat.md`
- `EldecoLiveByTheGreens.md`

---

## Fields to Update Per Property

Every JSON block in each `.md` file should be reviewed and updated. Priority fields:

| Field | Section | Source Priority |
|-------|---------|----------------|
| `projectStatus` | Section 1 | RERA portal → web (99acres, MagicBricks) |
| `possessionDate` | Section 1 | RERA portal → developer site → web |
| `launchDate` | Section 1 | Web |
| `reraNumber` | Section 1 | RERA UP portal (`rera.up.gov.in`) |
| `reraUrl` | Section 1 | RERA UP portal — direct project URL |
| Price ranges (header) | File header | Web listings (99acres, MagicBricks, Housing.com) |
| `numberOfUnits` | Section 4 | Web |
| `numberOfFloors` | Section 4 | Web |
| `openAreaPercentage` | Section 4 | Brochure/web |
| `latitude`, `longitude` | Section 3 | Google Maps |
| `developerFoundedYear` | Section 2 | Developer website |
| `completedProjects` | Section 2 | Developer website |
| `ongoingProjects` | Section 2 | Developer website |
| `credaiMembership` | Section 2 | CREDAI website |
| `awards` | Section 2 | Developer website |
| `salesNumber`, `email` | Section 17 | Developer website |
| Connectivity distances | Section 13 | Google Maps / web |

---

## Research Approach

### Method
3 parallel agents, one per sector, each researching all properties in that sector.

**Per-agent workflow:**
1. Read all `.md` files for the sector
2. For each property:
   a. Search UP RERA portal for RERA registration (primary source for possession dates and status)
   b. Search `[property name] Noida current status 2025 2026` for possession/handover updates
   c. Search 99acres / MagicBricks for current pricing and unit count
   d. Search developer website for company info, completed projects, contacts
   e. Search Google Maps for coordinates
3. Update `.md` files in-place with verified data
4. Add `_research_confidence` field in each JSON block: `"high"` (RERA/official), `"medium"` (web listings), `"low"` (inferred)

### Status Mapping
| Research Finding | `projectStatus` value |
|---|---|
| RERA shows OC received / possession given | `"ready_to_move"` |
| Possession started / handover in progress | `"ready_to_move"` |
| Possession expected within 12 months | `"under_construction"` |
| Possession 12+ months away | `"under_construction"` |
| Project just launched / pre-launch | `"new_launch"` |

---

## Output Format

Each `.md` file is updated in-place. For each JSON block, updated values are written directly. A `_research_notes` field is added to each block:

```json
{
  "projectStatus": "ready_to_move",
  "possessionDate": "2023-12-31",
  "reraNumber": "UPRERAPRJ123456",
  "reraUrl": "https://rera.up.gov.in/...",
  "_research_notes": {
    "confidence": "high",
    "sources": ["rera.up.gov.in", "99acres.com"],
    "verified_date": "2026-05-31",
    "unverified_fields": ["numberOfUnits"]
  }
}
```

---

## Success Criteria

- [ ] All 17 `.md` files updated with at minimum: `projectStatus`, `possessionDate`, `reraNumber`
- [ ] `reraUrl` populated wherever RERA number exists (enables clickable RERA button in Sprint A)
- [ ] Price ranges in file headers corrected to current market rates
- [ ] No property incorrectly shows "Under Construction" if it is ready to move
- [ ] Each updated block has `_research_confidence` attached

---

## What This Enables

- **Sprint A:** RERA button becomes clickable once `reraUrl` is populated
- **Sprint A:** Accurate status badges (Ready to Move / Under Construction / New Launch) in UI
- **Advisor accuracy:** AI recommendations cite correct possession timelines
- **Trust:** Users see truthful data, not stale "Under Construction" labels

---

## Constraints

- Do not invent data — if a field cannot be verified, leave it as `null` and note in `_research_notes`
- Do not update pricing with data older than 6 months
- RERA portal is authoritative for possession dates; web listings are secondary
- Coordinates must be for the actual project site, not sector centroid
