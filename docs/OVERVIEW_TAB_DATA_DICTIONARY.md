# Overview Tab — What Data We Need (Plain-English Guide)

Purpose: hand this to anyone filling in project data. For every piece of information on the new Overview screen, this tells you: what it is, what kind of value it is, and where it comes from.

**Two kinds of data — this matters:**
- 🖊️ **FACT** — a real-world detail a person types in (a price, a date, a distance). You are responsible for these being true.
- ⚙️ **COMPUTED** — the app calculates this automatically from facts already in the database. Nobody types these in directly, and nobody should — that's how we guarantee every score is real, not made up.

**Hiding rule:** any number that would look weak, empty, or embarrassing (a 0, a rating below 1, a "2 people viewing" that's actually 0) is automatically hidden instead of shown. You never need to fill in a fake number to avoid a blank space — leave it empty and the app hides that piece cleanly.

Already-built pieces are marked ✅ **HAVE**. New pieces needed are marked 🆕 **NEW**.

---

## 1. Project Basics ✅ HAVE
*(Example: Elite X)*

| Field | Type | Example | Notes |
|---|---|---|---|
| Project name | Text | "Elite X" | |
| Tagline | Text | "Luxury 3 & 4 BHK Residences Above the Green Belt" | |
| Builder | Link to Builder record | "Elite Group" | |
| Sector / Address | Text | "Sector 10, Greater Noida West" | |
| RERA number | Text, fixed format | "UPRERAPRJ123456" | 🖊️ FACT — must match the real UP-RERA registry |
| Status | One of: Under Construction / Ready to Move / New Launch | | |
| Price range | Number (₹ Crore, 2 decimals) | 2.01 – 3.13 | |
| Possession date | Date | Dec 2028 | |
| Open space % | Whole number (0–100) | 69 | |
| Nearest metro + distance | Text + Number (km, 1 decimal) | Aqua Line Metro, 1.5 km | |
| Green certification | Text | "IGBC Gold" | |
| Hero photo + gallery count | Image + Number | 24 photos | |

---

## 2. Builder Snapshot ✅ HAVE (mostly)

| Field | Type | Example | Notes |
|---|---|---|---|
| Builder name, rating | Text, Decimal (1 place) | Elite Group, 4.8 | |
| Years of experience | Whole number | 16 | |
| Homes delivered | Whole number | 3,500 | |
| On-time delivery % | ⚙️ COMPUTED | 95% | Calculated from delivered-projects' promised-date vs actual-date. 🆕 Needs each delivered project's promised vs actual possession date logged — currently we only store a delayed-projects count, not per-project dates. |

---

## 3. Price History — 🆕 NEW (5-year tracking)

One new table. A row is added automatically every time a project's price changes (admin edits it), plus a monthly automatic snapshot even if nothing changed — so the trend line is never empty.

| Field | Type | Example |
|---|---|---|
| Project | Link | Elite X |
| Date recorded | Date | 2026-05-01 |
| Price per sqft (₹) | Number | 12,968 |
| Total price (₹ Cr) | Decimal | 2.01 |
| Source | One of: admin update / monthly auto-snapshot | admin update |

We start recording from the day this ships. We do **not** fabricate 5 years of history that doesn't exist — the chart honestly shows "tracked since [date]" until 5 years of real data accumulates. If you have real historical price records (old brochures, price lists) you can backdate entries manually.

---

## 4. AI Verdict & Decision Score ✅ HAVE the ingredients, 🆕 NEW the roll-up

Already in the database per project (`ProjectDna` table), admin-entered by whoever reviews the project — **not typed by AI, not guessed**:

| Field | Type | Example |
|---|---|---|
| Builder track record score | 0–100 | 96 |
| Price position score | 0–100 | 89 |
| Locality score | 0–100 | 94 |
| RERA compliance score | 0–100 | 100 |
| Amenity depth score | 0–100 | 97 |
| Possession certainty score | 0–100 | 88 |
| Who verified it, when | Text + Date | |

🆕 **NEW**: one formula that averages these into the single "86/100 — Strong Buy" badge, plus a confidence % based on how many of the 6 scores are actually filled in (skip empty ones honestly rather than treating blank as zero). If fewer than 3 of the 6 are filled in, the whole verdict badge hides — not enough basis to show a number.

Why-buy / why-avoid bullets, and the persona-specific summaries ("AI Summary For You — Investor") — **already exist** in `RecommendationProfile` and `DecisionProfile`. This is the same data the personalization plan uses; same fields, two places they show up.

---

## 5. Construction Updates — 🆕 NEW

One row per milestone, per project.

| Field | Type | Example |
|---|---|---|
| Milestone name | Text | "Tower A — 18th Floor Slab" |
| Status | One of: Completed / In Progress / Upcoming | In Progress |
| Date completed (if done) | Date | 2026-05-12 |
| Photo(s) | Image, up to 5 | |
| Order shown | Whole number | 4 |

Admin adds a new row whenever there's real progress to report. If no milestones are entered yet, the whole section hides — no placeholder "coming soon."

---

## 6. Google Reviews — ⚠️ needs your decision, 🆕 NEW either way

Two ways to do this — pick one before I build it:
- **A. Manual**: your team pastes in real reviews they've collected (from Google Business Profile, WhatsApp feedback, etc.) — a simple table (reviewer name, star rating 1–5, text, date). Zero ongoing cost, but someone has to keep it updated.
- **B. Live API pull**: connect to Google Business Profile API, always current, zero manual work — but needs the project's Google listing to exist and be claimed, plus API setup cost.

Either way: rating average and count are ⚙️ COMPUTED from the individual review rows, never typed in directly as a lump number.

---

## 7. Verified Channel Partners — ⚠️ needs your decision, 🆕 NEW

Only build this if these are real broker/partner relationships you have contracts with. If yes:

| Field | Type | Example |
|---|---|---|
| Partner name | Text | "ABC Realtors" |
| Rating | Decimal | 4.9 |
| Review count | Whole number | 230 |
| Tier | Text | "Platinum Partner" |
| Contact method | Text/Link | |

If this isn't real yet, we drop this section from Overview until it is — showing fake partners is exactly the kind of thing your trust rules forbid.

---

## 8. What's Nearby ✅ HAVE
Metro, malls, sectors, schools, hospitals — already modeled (`Connectivity` table). Nothing new.

---

## 9. Live Activity — ⚙️ ALL COMPUTED, no new tables

| Shown as | Computed from |
|---|---|
| "12 people viewing this property now" | Count of distinct sessions with a "view" event on this project in the last 15 minutes |
| "3 site visits booked in last hour" | Count of `SiteVisitRequest` rows for this project created in the last hour |
| "18 units left in this phase" | Sum of `inventory_left` across this project's unit types |

Every one of these hides itself below a threshold (e.g. fewer than 2 concurrent viewers doesn't get shown as "1 person viewing" — that reads as empty, not exciting). None of these are ever simulated or seeded.

---

## 10. Compare Alternatives ✅ HAVE
Already modeled (`ProjectCompetitor`). Nothing new.

## 11. Resources & Documents ✅ HAVE
Already modeled (`ProjectDocument`). Nothing new.

---

## Summary: what's actually new to build

| New table | Why |
|---|---|
| `PriceHistory` | 5-year price trend — nothing tracks this today |
| `ConstructionMilestone` | Live progress timeline |
| `Review` (if you pick manual) | Google Reviews section |
| `ChannelPartner` (if real) | Verified partners section |
| One new field: per-delivered-project promised vs actual date | Powers the on-time-delivery % honestly |

Everything else on the Overview screen already has a home in the database — this phase is mostly wiring it up and computing the roll-ups, not building the whole thing from zero.
