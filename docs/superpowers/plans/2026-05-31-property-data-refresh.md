# Property Data Full Refresh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update all 17 property `.md` files in `Projects/Noida/` with accurate, current data by researching UP RERA portal, listing sites, and developer websites.

**Architecture:** Three independent research tasks (one per sector) that can be executed in parallel. Each task reads the current `.md` files, searches for accurate data across multiple sources, and updates the files in-place. A final validation task commits everything.

**Tech Stack:** Web search (99acres, MagicBricks, Housing.com, rera.up.gov.in, developer websites), file read/write tools.

---

## Schema Note

**Two `.md` formats exist in this repo — match the format already in the file, do not convert:**

| Format A (old brochure format) | Format B (new DB-ready format) |
|---|---|
| `projectName`, `projectStatus`, `possessionDate` | `name`, `status`, `possession_date` |
| Used in: Sector 78 files, Sector 137 files | Used in: Sector 150 files |
| Example: `SikkaKarmicGreens.md` | Example: `AceParkway.md` |

**For every file:** add `_research_notes` object alongside updated fields with keys: `confidence` (`"high"` / `"medium"` / `"low"`), `sources` (array of URLs used), `verified_date` (`"2026-05-31"`), `unverified_fields` (array of field names that could not be confirmed).

**Status values to use:**
- Format A: `"Under Construction"` / `"Ready to Move"` / `"Delivered"` / `"New Launch"`
- Format B: `"under_construction"` / `"ready_to_move"` / `"new_launch"`

**RERA URL format for UP projects:** `https://rera.up.gov.in/` — search by project name or RERA number. If a direct project link exists (e.g. project detail page), use it. Otherwise use `"https://rera.up.gov.in/"` as the base. Always include the RERA number if found.

---

## Task 1: Sector 150 Research (7 Properties)

**Files to modify:**
- `Projects/Noida/Sector150/AceParkway.md`
- `Projects/Noida/Sector150/AtsKingstonHeath.md`
- `Projects/Noida/Sector150/AtsPiousHideaways.md`
- `Projects/Noida/Sector150/AtsPristine.md`
- `Projects/Noida/Sector150/PrateekCanary.md`
- `Projects/Noida/Sector150/GodrejPalmRetreat.md`
- `Projects/Noida/Sector150/EldecoLiveByTheGreens.md`

---

### 1.1 — ACE Parkway

- [ ] **Read current file**
  Read `Projects/Noida/Sector150/AceParkway.md` to understand current state.

- [ ] **Search RERA status**
  Search: `"ACE Parkway" "Sector 150" Noida RERA possession 2024 2025`
  Also search: `site:rera.up.gov.in "ACE Parkway"` or `UPRERAPRJ4514 RERA UP`
  Expected: ACE Parkway is a completed luxury project — likely Ready to Move.

- [ ] **Search current pricing**
  Search: `"ACE Parkway" sector 150 noida price 2025 2bhk 3bhk`
  Sources: 99acres.com, magicbricks.com, housing.com

- [ ] **Search developer info**
  Search: `ACE Group developer Noida completed projects founded year`
  Source: acegroup.in or acegroups.in

- [ ] **Search coordinates**
  Search: `ACE Parkway Sector 150 Noida coordinates` or use Maps API to find lat/lng for this specific project.

- [ ] **Update file**
  Update `Projects/Noida/Sector150/AceParkway.md` with all verified fields. Key fields to set:
  ```json
  {
    "status": "ready_to_move",
    "possession_date": "<verified date or null if unknown>",
    "rera_number": "UPRERAPRJ4514",
    "rera_url": "<direct RERA link if found, else https://rera.up.gov.in/>",
    "lat": "<verified>",
    "lng": "<verified>",
    "_research_notes": {
      "confidence": "high",
      "sources": ["<url1>", "<url2>"],
      "verified_date": "2026-05-31",
      "unverified_fields": []
    }
  }
  ```
  Also update header price line if pricing has changed significantly.

---

### 1.2 — ATS Kingston Heath

- [ ] **Read current file**
  Read `Projects/Noida/Sector150/AtsKingstonHeath.md`.

- [ ] **Search RERA + status**
  Search: `"ATS Kingston Heath" sector 150 noida possession ready to move 2024 2025`
  Search: `"ATS Kingston Heath" RERA number UP`
  ATS is a reputed builder — Kingston Heath in Sector 150 is likely delivered.

- [ ] **Search pricing**
  Search: `"ATS Kingston Heath" noida price per sqft 2025 resale`

- [ ] **Search developer info**
  Search: `ATS Group developer founded year completed projects noida`
  Source: atsgroup.com

- [ ] **Search coordinates**
  Search: `ATS Kingston Heath Sector 150 Noida location coordinates`

- [ ] **Update file** with all verified data, same structure as 1.1. Match Format B schema.

---

### 1.3 — ATS Pious Hideaways

- [ ] **Read current file**
  Read `Projects/Noida/Sector150/AtsPiousHideaways.md`.

- [ ] **Search RERA + status**
  Search: `"ATS Pious Hideaways" sector 150 noida possession date RERA 2024 2025`
  Note: Pious Hideaways is ultra-luxury — verify whether delivered or near-possession.

- [ ] **Search pricing**
  Search: `"ATS Pious Hideaways" price 2025 noida luxury apartment`

- [ ] **Search developer info** — same ATS Group as above; reuse if already fetched.

- [ ] **Search coordinates**
  Search: `ATS Pious Hideaways Sector 150 Noida coordinates`

- [ ] **Update file** with all verified data.

---

### 1.4 — ATS Pristine

- [ ] **Read current file**
  Read `Projects/Noida/Sector150/AtsPristine.md`.

- [ ] **Search RERA + status**
  Search: `"ATS Pristine" sector 150 noida possession delivered RERA`
  ATS Pristine is an older ATS project in Sector 150 — likely delivered/ready.

- [ ] **Search pricing**
  Search: `"ATS Pristine" noida current price 2025`

- [ ] **Search coordinates**
  Search: `ATS Pristine Sector 150 Noida location`

- [ ] **Update file** with all verified data.

---

### 1.5 — Prateek Canary

- [ ] **Read current file**
  Read `Projects/Noida/Sector150/PrateekCanary.md`.

- [ ] **Search RERA + status**
  Search: `"Prateek Canary" sector 150 noida possession RERA 2024 2025`
  Search: `"Prateek Canary" ready to move delivered handover`

- [ ] **Search pricing**
  Search: `"Prateek Canary" noida price 2bhk 3bhk 2025`

- [ ] **Search developer info**
  Search: `Prateek Group developer Noida founded completed projects`
  Source: prateekgroup.com

- [ ] **Search coordinates**
  Search: `Prateek Canary Sector 150 Noida coordinates`

- [ ] **Update file** with all verified data.

---

### 1.6 — Godrej Palm Retreat

- [ ] **Read current file**
  Read `Projects/Noida/Sector150/GodrejPalmRetreat.md`.

- [ ] **Search RERA + status**
  Search: `"Godrej Palm Retreat" sector 150 noida RERA possession 2024 2025`
  Godrej Properties is publicly listed — RERA data should be cleanly available.

- [ ] **Search pricing**
  Search: `"Godrej Palm Retreat" noida price 2025 resale 3bhk 4bhk`

- [ ] **Search developer info**
  Search: `Godrej Properties founded year total delivered projects 2025`
  Source: godrejproperties.com

- [ ] **Search coordinates**
  Search: `Godrej Palm Retreat Sector 150 Noida GPS coordinates`

- [ ] **Update file** with all verified data.

---

### 1.7 — Eldeco Live By The Greens

- [ ] **Read current file**
  Read `Projects/Noida/Sector150/EldecoLiveByTheGreens.md`.

- [ ] **Search RERA + status**
  Search: `"Eldeco Live By The Greens" sector 150 noida RERA possession 2024 2025`

- [ ] **Search pricing**
  Search: `"Eldeco Live By The Greens" noida price 2025`

- [ ] **Search developer info**
  Search: `Eldeco Group developer founded year delivered projects noida`
  Source: eldeco.com

- [ ] **Search coordinates**
  Search: `Eldeco Live By The Greens Sector 150 Noida location`

- [ ] **Update file** with all verified data.

- [ ] **Commit Sector 150 updates**
  ```bash
  git add Projects/Noida/Sector150/
  git commit -m "data: update Sector 150 property data with verified 2025 status, RERA, pricing"
  ```

---

## Task 2: Sector 137 Research (5 Properties)

**Files to modify:**
- `Projects/Noida/Sector137/ExoticaFresco.md`
- `Projects/Noida/Sector137/LogixBlossomCounty.md`
- `Projects/Noida/Sector137/ParamountFloraville.md`
- `Projects/Noida/Sector137/ParasTierea.md`
- `Projects/Noida/Sector137/SupertechEcociti.md`

Note: These files use **Format A** (old brochure schema). Use `projectStatus`, `possessionDate`, `reraNumber`, `reraUrl` field names.

---

### 2.1 — Exotica Fresco

- [ ] **Read current file**
  Read `Projects/Noida/Sector137/ExoticaFresco.md`. Current status: `"Delivered"`.

- [ ] **Verify delivery + RERA**
  Search: `"Exotica Fresco" sector 137 noida delivered possession RERA number`
  Search: `"Exotica Fresco" Noida OC occupancy certificate`
  Expected: Already delivered — confirm and add RERA number + URL.

- [ ] **Search possession date**
  Search: `"Exotica Fresco" noida possession date year`

- [ ] **Search pricing**
  Search: `"Exotica Fresco" sector 137 noida price 2025 resale`

- [ ] **Search developer info**
  Search: `Exotica Housing developer Noida founded year completed projects`
  Source: exoticahousing.com

- [ ] **Search coordinates**
  Search: `Exotica Fresco Sector 137 Noida Expressway coordinates`

- [ ] **Search contacts**
  Search: `Exotica Housing sales contact number email Noida`

- [ ] **Update file** — use Format A field names:
  ```json
  {
    "projectStatus": "Delivered",
    "possessionDate": "<verified>",
    "launchDate": "<if found>",
    "reraNumber": "<verified>",
    "reraUrl": "<RERA project URL>",
    "_research_notes": {
      "confidence": "high",
      "sources": ["<url1>", "<url2>"],
      "verified_date": "2026-05-31",
      "unverified_fields": ["<any fields that couldn't be confirmed>"]
    }
  }
  ```

---

### 2.2 — Logix Blossom County

- [ ] **Read current file**
  Read `Projects/Noida/Sector137/LogixBlossomCounty.md`.

- [ ] **Search RERA + status**
  Search: `"Logix Blossom County" sector 137 noida possession RERA 2024 2025`
  Search: `"Logix Blossom County" ready to move delivered`

- [ ] **Search pricing**
  Search: `"Logix Blossom County" noida price 2025 2bhk 3bhk resale`

- [ ] **Search developer info**
  Search: `Logix Group developer Noida founded year projects delivered`
  Source: logixgroup.in

- [ ] **Search coordinates**
  Search: `Logix Blossom County Sector 137 Noida coordinates`

- [ ] **Search contacts**
  Search: `Logix Group sales number email`

- [ ] **Update file** with all verified data (Format A schema).

---

### 2.3 — Paramount Floraville

- [ ] **Read current file**
  Read `Projects/Noida/Sector137/ParamountFloraville.md`.

- [ ] **Search RERA + status**
  Search: `"Paramount Floraville" sector 137 noida possession RERA number 2024 2025`
  Note: Paramount Developers has had delivery delays historically — verify carefully.

- [ ] **Search pricing**
  Search: `"Paramount Floraville" noida price 2025`

- [ ] **Search developer info**
  Search: `Paramount Developers Noida founded year delivered projects`
  Source: paramountdevelopers.com or similar

- [ ] **Search coordinates**
  Search: `Paramount Floraville Sector 137 Noida location coordinates`

- [ ] **Update file** with all verified data (Format A).
  If project has delivery delays, set `projectStatus: "Under Construction"` and note in `_research_notes`.

---

### 2.4 — Paras Tierea

- [ ] **Read current file**
  Read `Projects/Noida/Sector137/ParasTierea.md`.

- [ ] **Search RERA + status**
  Search: `"Paras Tierea" sector 137 noida possession RERA 2024 2025`
  Search: `"Paras Tierea" possession date handover completed`
  Note: Paras Buildtech has been involved in RERA disputes — verify status carefully.

- [ ] **Search RERA disputes or delays**
  Search: `"Paras Tierea" RERA complaint delay possession`

- [ ] **Search pricing**
  Search: `"Paras Tierea" noida price 2025`

- [ ] **Search developer info**
  Search: `Paras Buildtech Noida founded year delivered projects`

- [ ] **Search coordinates**
  Search: `Paras Tierea Sector 137 Noida coordinates`

- [ ] **Update file** (Format A). If there are verified RERA disputes or delays, add `"note": "RERA dispute reported — verify before recommending"` in `_research_notes`.

---

### 2.5 — Supertech Ecociti

- [ ] **Read current file**
  Read `Projects/Noida/Sector137/SupertechEcociti.md`.

- [ ] **Search RERA + insolvency status**
  Search: `"Supertech Ecociti" sector 137 noida possession RERA 2024 2025`
  Search: `Supertech insolvency NCLT 2022 Ecociti Noida`
  **IMPORTANT:** Supertech is under NCLT insolvency proceedings. Verify if Ecociti specifically is affected and what the current possession status is.

- [ ] **Search IRP / receiver status**
  Search: `Supertech NCLT receiver Ecociti possession status 2025`

- [ ] **Search pricing**
  Search: `"Supertech Ecociti" sector 137 noida price 2025`

- [ ] **Search coordinates**
  Search: `Supertech Ecociti Sector 137 Noida coordinates`

- [ ] **Update file** (Format A). Given Supertech insolvency, set appropriate status and add prominent note:
  ```json
  {
    "_research_notes": {
      "confidence": "medium",
      "sources": ["<sources>"],
      "verified_date": "2026-05-31",
      "unverified_fields": [],
      "risk_note": "Supertech is under NCLT insolvency. Verify project-specific possession status before recommending to buyers."
    }
  }
  ```

- [ ] **Commit Sector 137 updates**
  ```bash
  git add Projects/Noida/Sector137/
  git commit -m "data: update Sector 137 property data with verified 2025 status, RERA, notes"
  ```

---

## Task 3: Sector 78 Research (5 Properties)

**Files to modify:**
- `Projects/Noida/Sector78/SikkaKarmicGreens.md`
- `Projects/Noida/Sector78/MahagunModerne.md`
- `Projects/Noida/Sector78/MahagunMezzaria.md`
- `Projects/Noida/Sector78/TheHydePark.md`
- `Projects/Noida/Sector78/AssotechWindsorCourt.md`

Note: These files use **Format A** schema.

---

### 3.1 — Sikka Karmic Greens

- [ ] **Read current file**
  Read `Projects/Noida/Sector78/SikkaKarmicGreens.md`. Current: `projectStatus: null`, no RERA, no possession date.

- [ ] **Search RERA + status**
  Search: `"Sikka Karmic Greens" sector 78 noida possession RERA 2024 2025`
  Search: `"Sikka Karmic Greens" ready to move delivered handover`

- [ ] **Search Sikka Group legal status**
  Search: `Sikka Group Noida RERA disputes complaints 2024`
  Note: Verify whether Sikka Group has delivery issues before recommending.

- [ ] **Search pricing**
  Search: `"Sikka Karmic Greens" noida price 2025 1bhk 2bhk 3bhk`

- [ ] **Search developer info**
  Search: `Sikka Group founded year completed projects Noida headquarters`
  Source: sikkagroup.com

- [ ] **Search contacts**
  Search: `Sikka Group sales contact number email Noida`

- [ ] **Search coordinates**
  Search: `Sikka Karmic Greens Sector 78 Noida coordinates latitude longitude`

- [ ] **Update file** with all verified data (Format A).

---

### 3.2 — Mahagun Moderne

- [ ] **Read current file**
  Read `Projects/Noida/Sector78/MahagunModerne.md`.

- [ ] **Search RERA + status**
  Search: `"Mahagun Moderne" sector 78 noida possession RERA 2024 2025`
  Search: `"Mahagun Moderne" ready to move delivered`
  Note: Mahagun has been involved in RERA disputes — verify.

- [ ] **Search RERA disputes**
  Search: `Mahagun Moderne RERA complaint delay 2023 2024`

- [ ] **Search pricing**
  Search: `"Mahagun Moderne" noida price 2025 2bhk 3bhk`

- [ ] **Search developer info**
  Search: `Mahagun Group founded year completed projects Noida`
  Source: mahagun.in

- [ ] **Search coordinates**
  Search: `Mahagun Moderne Sector 78 Noida coordinates`

- [ ] **Update file** (Format A). Add any known dispute notes to `_research_notes`.

---

### 3.3 — Mahagun Mezzaria

- [ ] **Read current file**
  Read `Projects/Noida/Sector78/MahagunMezzaria.md`.

- [ ] **Search RERA + status**
  Search: `"Mahagun Mezzaria" sector 78 noida possession RERA 2024 2025`

- [ ] **Search pricing**
  Search: `"Mahagun Mezzaria" noida price 2025 luxury 4bhk penthouses`
  Note: Mezzaria is the ultra-luxury Mahagun project — pricing will be significantly higher.

- [ ] **Search coordinates**
  Search: `Mahagun Mezzaria Sector 78 Noida coordinates`

- [ ] **Update file** (Format A). Reuse Mahagun developer info from 3.2.

---

### 3.4 — The Hyde Park

- [ ] **Read current file**
  Read `Projects/Noida/Sector78/TheHydePark.md`.

- [ ] **Search RERA + status**
  Search: `"Hyde Park" sector 78 noida possession RERA 2024 2025`
  Search: `"The Hyde Park" noida developer builder ready to move`

- [ ] **Identify developer**
  Search: `"The Hyde Park" sector 78 noida developer builder name`
  This step is needed because the developer may not be immediately obvious.

- [ ] **Search pricing**
  Search: `"The Hyde Park" sector 78 noida price 2025`

- [ ] **Search coordinates**
  Search: `The Hyde Park Sector 78 Noida coordinates`

- [ ] **Search developer info**
  Once developer is identified, search: `[Developer] Noida founded year completed projects`

- [ ] **Update file** (Format A).

---

### 3.5 — Assotech Windsor Court

- [ ] **Read current file**
  Read `Projects/Noida/Sector78/AssotechWindsorCourt.md`.

- [ ] **Search RERA + status**
  Search: `"Assotech Windsor Court" sector 78 noida possession RERA 2024 2025`
  Search: `"Assotech Windsor Court" ready to move delivered`

- [ ] **Search developer legal status**
  Search: `Assotech Realty RERA disputes Noida 2023 2024`
  Note: Verify if Assotech has any insolvency or delivery issues.

- [ ] **Search pricing**
  Search: `"Assotech Windsor Court" noida price 2025`

- [ ] **Search developer info**
  Search: `Assotech Realty founded year completed projects Noida`
  Source: assotechrealty.com or similar

- [ ] **Search coordinates**
  Search: `Assotech Windsor Court Sector 78 Noida coordinates`

- [ ] **Update file** (Format A). Add any developer risk notes.

- [ ] **Commit Sector 78 updates**
  ```bash
  git add Projects/Noida/Sector78/
  git commit -m "data: update Sector 78 property data with verified 2025 status, RERA, risk notes"
  ```

---

## Task 4: Validate All Changes

- [ ] **Read all 17 updated files**
  Quick scan of every updated `.md` to verify:
  - No property incorrectly shows "Under Construction" for a completed project
  - Every file has `_research_notes` attached
  - No file has both `null` RERA number and `null` possession date without explanation in `_research_notes`
  - `reraUrl` is populated wherever `reraNumber` is populated

- [ ] **Check status distribution**
  Count properties by status:
  - Ready to Move / Delivered: expect 8-12 (most Sector 150 + Sector 137 mature projects)
  - Under Construction: expect 3-6 (newer or delayed projects)
  - New Launch: expect 0-2

  If all 17 still show "Under Construction" or "Under Construction" equivalent — something went wrong. Re-run research for those specific properties.

- [ ] **Verify RERA URL format**
  Every `reraUrl` that is not `null` must start with `https://rera.up.gov.in/` — not a Google search link, not a 99acres page.

- [ ] **Final commit**
  ```bash
  git add Projects/Noida/
  git commit -m "data: Sprint B complete — all 17 properties refreshed with verified possession status, RERA, pricing"
  ```

---

## Self-Review Checklist

**Spec coverage:**
- [x] All 17 properties have individual research steps
- [x] All target fields covered: status, possessionDate, reraNumber, reraUrl, pricing, coordinates, developer info, contacts
- [x] Both Format A and Format B schema accounted for
- [x] Risk cases handled: Supertech NCLT, Mahagun disputes, Paras RERA issues, Sikka verification
- [x] Validation task ensures no file left in broken state
- [x] `_research_notes` with confidence levels specified in every update step

**Gaps (none):** All spec requirements map to a task.

**No placeholders:** All steps include actual search queries and the exact JSON structure to write.
