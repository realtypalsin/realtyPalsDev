# Sprint C: WhatsApp Handoff + Smart Chips + Comparison Table

**Date:** 2026-05-31  
**Status:** Approved

---

## Feature 1 — WhatsApp Handoff

**Where:** `ProjectCard.tsx` action row + `ProjectDetailPanel.tsx` footer

**What:** Green WhatsApp button that opens `wa.me` with a prefilled message containing property details. No backend needed — pure frontend URL generation.

**Message format:**
```
Hi! I'm interested in *{Property Name}* by {Builder} in {Sector}, Noida.

Configuration: {BHK types joined by " / "}
Price: {price_range_label}
Status: {Ready to Move / Under Construction / New Launch}
RERA: {rera_number if present}

Could you help me with more details and a site visit?
```

**URL:** `https://wa.me/{NEXT_PUBLIC_WHATSAPP_NUMBER}?text={encodeURIComponent(message)}`

**Env var:** `NEXT_PUBLIC_WHATSAPP_NUMBER` — sales team WhatsApp number (digits only, with country code, e.g. `919876543210`). Fallback: hide button if var not set.

**ProjectCard:** Add WhatsApp button in the bottom actions row (between "Ask AI" and "View Details"), green icon, `whatsapp.onClick` stops propagation so card doesn't open detail panel.

**ProjectDetailPanel:** Replace or augment footer. Add a second CTA button: "WhatsApp Us" in green alongside the existing "Request Site Visit" blue button. Full-width split layout.

---

## Feature 2 — Smart Follow-up Chips (ADVISOR mode)

**Where:** `DiscoveryContent.tsx` — after the last AI message when `chatPhase === 'ADVISOR'` and `lastShortlist.length > 0`

**What:** 3 contextual chip buttons shown below the latest ADVISOR message (not on every message — only on the most recent one). Each chip submits a prefilled message to the chat.

**Chips:**
| Chip label | Submitted message |
|---|---|
| `Calculate EMI` | `Calculate EMI for {lastShortlist[0].name} at {lastShortlist[0].price_min_cr} Cr with 20% down payment` |
| `Compare {prop1} vs {prop2}` | `Compare {lastShortlist[0].name} vs {lastShortlist[1].name} side by side` (only if `lastShortlist.length >= 2`) OR `Compare these properties` if only 1 |
| `Request site visit` | `I'd like to schedule a site visit for {lastShortlist[0].name}` |

**Placement:** Below the collapsible shortlist toggle, only on the LAST AI message when in ADVISOR phase.

**Styling:** Horizontal row of pill buttons, distinct colors per chip:
- EMI → indigo pill
- Compare → blue pill  
- Site visit → green pill

---

## Feature 3 — Inline Comparison Table

**Trigger:** When user clicks "Compare X vs Y" chip OR when the user types a comparison query and the AI responds while `lastShortlist.length >= 2`.

**What:** A `ComparisonTable` component rendered inline in the chat feed (after the AI text response) that shows a structured side-by-side table of 2 properties from `lastShortlist`.

**Data source:** `lastShortlist[0]` and `lastShortlist[1]` — no backend call needed, all data is already in state.

**Rows to compare:**
| Row | Source field |
|---|---|
| Builder | `builder.name` |
| Sector | `sector` |
| Price Range | `price_range_label` |
| Status | `status` |
| Configurations | unit_types BHK list |
| RERA | `rera_number` or "—" |
| Top Amenities | `top_amenities[0..2].name` |
| Metro / Connectivity | `top_connectivity[0].name + distance` |

**Trigger logic in `DiscoveryContent`:** When a message is submitted and it contains "compare" keyword AND `lastShortlist.length >= 2`, set a `showComparisonTable` state flag. The table renders as a special message type in the chat feed.

**New component:** `frontend/components/ComparisonTable.tsx`

---

## Files Touched

| File | Change |
|------|--------|
| `frontend/components/ProjectCard.tsx` | Add WhatsApp button in actions row |
| `frontend/components/ProjectDetailPanel.tsx` | Add WhatsApp button in footer |
| `frontend/components/DiscoveryContent.tsx` | Add smart chips after ADVISOR AI message; trigger ComparisonTable on compare queries |
| `frontend/components/ComparisonTable.tsx` | New — side-by-side property comparison component |
| `frontend/.env.local` | Add `NEXT_PUBLIC_WHATSAPP_NUMBER` (document, don't commit) |

---

## Success Criteria
- [ ] WhatsApp button appears on every property card and detail panel
- [ ] Clicking WhatsApp opens `wa.me` with prefilled message containing correct property details
- [ ] Button hidden if `NEXT_PUBLIC_WHATSAPP_NUMBER` not configured
- [ ] Smart chips appear after ADVISOR phase AI responses with shortlisted properties
- [ ] "Compare" chip uses actual property names from `lastShortlist`
- [ ] "Calculate EMI" chip prefills with first shortlisted property price
- [ ] Clicking any chip submits the prefilled message to the AI
- [ ] Comparison table renders side-by-side when compare intent detected with 2 shortlisted properties
- [ ] No TypeScript errors (`npm run build` passes)
