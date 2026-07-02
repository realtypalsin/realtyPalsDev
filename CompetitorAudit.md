# RealtyPals — Competitor & Chatbot Feature Audit

**Date:** 2026-06-18
**Note on sourcing:** The background web-research agent hit a session limit before completing. This audit is written from general product knowledge of these platforms (accurate as of ~2024-2025) and is **not freshly web-verified** — treat specific numbers/feature claims as directional, and run a live research pass before quoting them externally.

---

## 1. Property platforms — what they do well / where they fail

| Platform | Standout features | Trust signals | Top user complaints (what we beat) |
|---|---|---|---|
| **99acres** | Huge inventory, filters, locality pages, price trends | Verified tag, RERA on some | Stale/fake listings, broker spam after enquiry, outdated prices |
| **Housing.com** | Clean map search, 3D/video, locality reviews, "Housing Edge" services | Verified photos, RERA | Lead sold to many brokers, calls flood, listings not live |
| **MagicBricks** | Largest reach, price trends, "PropWorth" estimate, advice content | RERA, owner/agent tags | Spam calls, duplicate listings, aggressive upsell |
| **NoBroker** | Broker-free (owner-direct), rent agreements, packers, home services | Owner-verified | Limited new-launch inventory, paywall for contacts |
| **Square Yards** | New-launch focus, NRI desk, mortgage + post-sale services | Developer tie-ups | Salesy/push, acts like a broker, follow-up pressure |
| **Zillow (US, best-in-class)** | Zestimate (price estimate), map-first search, 3D Home tours, mortgage pre-qual, "what you can afford", saved-search alerts, school ratings, commute, climate risk | Transparent price history, days-on-market | (US-only; reference for UX, not market) |

**The universal Indian-platform complaint = trust:** fake/stale listings, broker spam, hidden charges, no honest trade-offs, push to convert. **This is exactly RealtyPals' wedge** — advisor-first, honest trade-offs, no spam, real data + cited web sources.

---

## 2. Chatbots — smooth-UX patterns to copy

| Product | Pattern | Apply to RealtyPals |
|---|---|---|
| **ChatGPT** | Instant token streaming, stop/regenerate, suggested follow-ups, memory | We stream already; add suggested follow-up chips + stop button |
| **Claude** | Artifacts (side panel for rich output), honest "I'm not sure" | Render property cards/compare tables as a side artifact, not inline noise |
| **Gemini** | Inline sources, multimodal (image in) | Cite web sources (we have it); allow uploading a brochure/photo |
| **DeepSeek** | Visible reasoning/steps | Our StatusSteps ("extracting → searching → generating") already mirrors this — keep it |
| **Onyx** | Citations bound to real doc IDs *before* LLM runs; collapsible tool timeline; opt-in sources | Already adopting: builder_lookup/web_search grounding. Add a collapsible "what I checked" timeline + clickable source chips |

**Smoothness tricks worth stealing:** optimistic UI (show user msg instantly — we do), skeleton cards while searching, suggested-prompt chips, persistent input with stop/regenerate, sub-second first token (keep model warm / paid key in prod).

---

## 3. "Steal-these" features — ranked (impact / effort)

1. **Saved-search + price/possession alerts** (Zillow/99acres) — buyers track 3-5 projects. *PriceAlert model already exists; wire notifications.* M. **Demo-relevant.**
2. **Honest "Buyer Snapshot" report** — one-page PDF: price fit, trade-offs, RERA, builder record, commute, AQI. Nobody does this honestly. M. **Demo-relevant.**
3. **Suggested follow-up chips after each answer** (ChatGPT) — guides shortlisting without pushing. S. **Demo-relevant.**
4. **Side-panel "compare" artifact** (Claude) — compare 2-3 projects cleanly. S-M.
5. **Locality liveability score** (Housing) — AQI + commute + schools + hospitals + safety into one score. M.
6. **Price-trend / appreciation chart per sector** (MagicBricks PropWorth, Zillow) — M (needs data/scraping).
7. **Owner/RERA-verified badge + "last updated" on every card** — directly kills the stale-listing complaint. S.
8. **Brochure/photo upload → AI explains it** (Gemini multimodal) — DocumentQA exists; expose it in chat. M.
9. **"What can I afford?" reverse search** (Zillow) — enter income/down-payment → EMI → matching inventory. M.
10. **No-spam promise + single advisor handoff** (anti-NoBroker-paywall, anti-99acres-spam) — one WhatsApp advisor, not 10 broker calls. S (product/positioning).

---

## 4. Problems to solve (and how we beat each)

- **Fake/stale listings** → only curated DB inventory + "last verified" date + RERA link. No open broker uploads.
- **Broker spam after enquiry** → single qualified handoff to one advisor; never sell the lead to many brokers.
- **Outdated prices** → price shown with source + date; web_search for current trend.
- **Hidden charges** → calculators surface stamp duty + GST + registration up front.
- **No honest downside** → prompt mandates one real trade-off per recommendation.
- **Push to convert** → advisory tone; recommend "wait/broaden" over a bad fit.

---

## 5. Decision sources beyond the ~100 listing variables

Buyers weigh far more than specs. Sources to surface (✅ = tool already wired in our Express chat):
- ✅ **Builder track record** (`builder_lookup` — real DB) + ✅ **web news/controversies** (`web_search`).
- ✅ **RERA status** (`rera_check` — UP-RERA live read).
- ✅ **Commute** (`commute` — Google Maps) and ✅ **area background** (`area_info` — Wikipedia).
- ✅ **AQI** (waqi lib exists) — wire into the liveability score.
- **Net-new (recommend adding):** sector price-trend/appreciation, school/hospital ratings (Google Places — key is in env), crime/safety, water/power reliability, resale liquidity, legal-title check, loan eligibility/pre-approval, flood/climate risk, GIS/master-plan overlays.

---

## 6. Top recommendations to be smoother + more complete than all of them

1. ✅ *(done)* Honest advisor with real tools (builder/web/RERA/commute/area/finance) — our core differentiator.
2. Suggested follow-up chips + stop/regenerate in chat. **Demo.** S.
3. Buyer Snapshot PDF (honest one-pager). **Demo.** M.
4. Saved-search + price/possession alerts (PriceAlert exists). M.
5. Liveability score (AQI + commute + schools + safety). M.
6. "Last verified" + RERA-verified badge on every card. S. **Demo.**
7. Side-panel compare artifact. S-M.
8. Brochure/photo upload → AI Q&A in chat (DocumentQA exists). M.
9. "What can I afford?" reverse search. M.
10. Sector price-trend chart. M-L (data).
11. One-advisor no-spam handoff (WhatsApp). S. **Demo positioning.**
12. Sub-second first token in prod (paid key, warm model). Env/infra.
13. School/hospital ratings via Google Places (key already in env). M.
14. Map-first browse mode (Zillow-style) as an alternate view. M-L.
15. Multilingual (Hindi/Hinglish) — prompt already supports; surface a toggle. S.

**Bottom line:** our moat is *honest, grounded, conversational advice + curated trustworthy inventory* — beating the spam/fake-listing/push problems that plague 99acres/Housing/MagicBricks, while matching Zillow-class UX and ChatGPT-class chat smoothness.
