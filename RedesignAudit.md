7.2 / 10. Architecture is solid, but you're sitting on a 9/10 dataset and using maybe 60% of it. Here's the brutal summary:

What's genuinely good
The system prompt discipline is unusual. Sentinel patterns (PROJECT_NOT_FOUND, SECTOR_NOT_COVERED), the investment rule, the possession certainty ladder, the streaming intent machine — these are real engineering, not boilerplate. Most competitors hallucinate freely; this doesn't.

10 critical failures, in order of impact:
Intelligence data is invisible on the card. You seeded recommendation_tier, decision_thesis, best_for for every project. None of it shows on the property card. A STRONG_BUY and an AVOID project look identical until you click in. That's the whole UX payoff being skipped.

The AI cannot answer ~40% of real buyer questions. The prompt has 10 routing branches (A–J). Missing: negotiation advice, distressed project legal status, possession-in-6-months urgency filtering, bank loan eligibility by builder, GST cancellation refund, school proximity filtering. These fall into J. GENERAL and get generic answers.

GATHERING state loops on vague input. "Reasonable budget" or "not too expensive" doesn't extract — AI asks budget again forever. User drops off. Needs a gathering_loop_count + default proposal after 2 failed extractions.

Compare table ignores the intelligence layer. walk_away_conditions, negotiation_leverage, riskRadar, transparency_checks are in the DB and in the detail panel — none of them are in the comparison view.

Welcome message does zero work. "Research properties, compare options, decide confidently" tells the user nothing actionable. Three example prompts would immediately convert more first-time users.

No routing for "Is this project safe?" project_risk_flag, nclt_moratorium_active, registry_status are all in the DB. The AI only uses them reactively (when a flagged project appears in search results) — there's no proactive legal-status routing.

transparency_checks, riskRadar, investment_insights not serialized to AI. These are the most differentiated fields you seeded. They're sitting in the DB, rendered in the detail panel, but never injected into the chat prompt where the AI could use them.

No multi-turn memory of currently viewed properties. User opens Panchsheel in the detail panel, goes back and asks "how does this compare?" — AI has no idea what "this" is. viewed_slugs exists in the memory builder but only for past sessions.

Search response word budget too restrictive. 35 words max breaks when disclosure is mandatory (AVOID project in results, budget exceeded, sector expansion). Needs a disclosure override budget.

Compare overflow (>4 projects) is a silent failure. No message, no UX, just truncation. User has no idea why 2 of their projects disappeared.


# RealtyPals Chat Flow — Brutal Audit
*Rated against Karpathy principles and Fable-style AI prompt craft*

---

## Overall Score: 7.2 / 10

The architecture is genuinely sophisticated. The intent state machine, project serializer, streaming infrastructure, and data fidelity rules are all above average for a domain-specific AI product. But there are real gaps in question handling, UI feedback, compare UX, and prompt completeness that will cause visible failures on 30–40% of real user queries.

---

## What is Actually Good (Don't Touch These)

**The system prompt is unusually well-disciplined.** The hard rules, sentinel patterns (`PROJECT_NOT_FOUND`, `SECTOR_NOT_COVERED`), the investment rule, and the possession certainty ladder are rare quality. Most AI real estate products hallucinate freely — this one has guardrails that would survive a serious adversarial test.

**The intent state machine is real.** `COLD → GATHERING → READY_TO_SEARCH → SHORTLISTED` is a correct model of a property search conversation. The streaming architecture that shows `extracting → searching → generating` phases gives the user visible progress, which is the right UX call.

**Data serializer injects the right intelligence.** `recommendation_tier`, `decision_thesis`, `why_buy`, `why_avoid`, `persona_profile`, `walk_away_conditions`, `vs_competitors` — all of this is being injected into the prompt correctly. The data model investment is actually being used.

**Voice input fallback chain** (SpeechRecognition → MediaRecorder → Whisper) is a well-thought-out graceful degradation for an Indian audience on mobile.

---

## Critical Failures (Fix These First)

### 1. The AI Cannot Answer the 20 Most Common Real Estate Questions

The prompt defines only 10 routing branches (A through J). But a real buyer asks questions that fall into none of these cleanly. Here is what the AI cannot currently handle well:

| Question type | Current handling | What happens |
|:---|:---|:---|
| "Is this a good time to buy?" | J. GENERAL → domain knowledge | Answers generically, no DB context injected |
| "How much loan will I get on ₹18L income?" | E. CALCULATION | Answers — this works |
| "Which sector is best for schools?" | B. SECTOR ADVISORY | Works if sector intent exists — breaks if the user gives no sector |
| "What is the maintenance charge here?" | NOT_IN_DATABASE rule fires | Correct refusal, but abrupt |
| "Are there any new launches under 80L?" | Query executes | Works if budget is extracted correctly |
| "What happened to Amrapali?" | Rule 6c hardcoded | Correct answer delivered |
| "Can I get GST refund on cancellation?" | J. GENERAL | Answers from training memory — no domain rule exists for this |
| "What is the carpet-to-super area ratio here?" | Calculation implied | Correctly avoids if not in block — but gives no guidance on where to find it |
| "What should I negotiate on?" | No routing match | Falls to J.GENERAL, answer will be generic |
| "Which projects allow home loans easily?" | No routing match | Falls to J.GENERAL — builder loan approval linkages not in DB |
| "Is the builder blacklisted by any bank?" | No routing match | Falls to builder_lookup, which doesn't have bank blacklist data |
| "My budget is ₹85L for 3BHK in Noida" | GATHERING state | Triggers one question, which is correct — but if user says budget twice and AI misses it, loop gets stuck |
| "I need possession in 6 months" | Extraction works | But `possession` field in intent is a string, not a date comparison — projects returned may not actually be deliverable in 6 months |
| "Compare 5 projects at once" | Breaks at 4 | Silent limit — user gets no explanation |
| "Show me all projects by Mahagun" | builder_lookup + search | Works, but builder filter in search is not verified — may return wrong results |

**Fix:** Add explicit routing rules (K through S) covering negotiation, maintenance cost, possession urgency, bank loan eligibility, GST edge cases, builder bank blacklisting, and comparison overflow.

---

### 2. The Property Card Shows Nothing About Intelligence Data

You have seeded rich data — `decision_thesis`, `why_buy`, `risk_thesis`, `persona_profile`, `recommendation_tier`. None of this surfaces on the card itself. The user sees a title, price, beds, sqft, and a star. They have no idea there is a written verdict behind it until they open the full detail panel.

**What this costs you:** Users make the open/skip decision on the card. If the card shows the same information for an AVOID project and a STRONG_BUY project, users will open or skip both at the same rate. The entire intelligence investment is invisible at the point of discovery.

**Fix:**
- Add a one-line verdict pill on every card pulled from `decision_thesis` (first 8 words)
- Add a recommendation badge: `STRONG BUY`, `BUY WITH CAUTION`, `AVOID` — with matching colours (green, amber, red)
- Add a single `Best For` tag pulled from `best_for`

---

### 3. The Compare Table Is Structurally Incomplete

The AI response for comparisons says *"See the comparison dashboard below"* — but the dashboard only renders what the serialized project card has in it. The fields missing from the compare table:

- `walk_away_conditions` — never shown
- `negotiation_leverage` — never shown
- `decision_thesis` vs `decision_thesis` side by side — not rendered
- `vs_competitors` — data is there in DB but not in compare UI
- Risk radar (`riskRadar` from `intelligence_data.riskRadar`) — not in compare view

The compare table is good for basic specs but it is doing nothing with the intelligence layer you spent weeks building.

**Fix:** Add a second section to the compare table: "Advisor Take" — one row per intelligence field, side by side. Make it collapsible if you're worried about information overload.

---

### 4. GATHERING State Gets Stuck in a Loop on Ambiguous Input

The prompt says: ask one question at a time, in priority order: BHK → Budget → Sector. This is correct. The problem is the state machine doesn't detect when the user has answered the same question twice or given an implicit answer.

**Example failure loop:**
```
User:  "3 bhk"
AI:    "Budget range kya hai?"
User:  "reasonable"
AI:    "Budget range kya hai?" (still GATHERING — "reasonable" didn't extract)
User:  "not too expensive"
AI:    "Budget range kya hai?" (loop continues)
```

The user gives up. This is a real failure mode. `"reasonable"`, `"affordable"`, `"mid-range"`, `"under ₹1 crore"`, `"below 80"` — these are all valid budget signals that your intent extractor needs to handle, or else you need a fallback that after 2 failed extractions proposes a default: *"Shall I search within ₹80L–₹1.5Cr to start?"*

**Fix:** Add a `gathering_loop_count` to the intent object. After 2 turns without extraction progress, inject a suggested default value and ask for confirmation instead of re-asking.

---

### 5. The Welcome Message Is Doing No Work

```
"Hi, I'm RealtyPal. Research properties, compare options, and decide confidently."
```

This is a placeholder. It does not tell the user what to say, what the AI can do, or give any entry point. A new user reads this and types something generic like "I want to buy a flat" — which triggers GATHERING, which then asks "Kitne BHK chahiye?" — which is fine, but the first impression is wasted.

Compare to what it could be:
```
"Hi! I cover 50+ verified projects across Noida and Greater Noida — with legal flags, 
builder track records, and honest buy/avoid verdicts built in. Try: 
• '3BHK under ₹1.5Cr in Sector 75' 
• 'Compare Mahagun vs Panchsheel'
• 'Which Noida sector is best for families?'"
```

Three example prompts turns a blank input box into an immediate action for any user.

---

### 6. No Handling for "Distressed Project" Questions

You have `project_risk_flag` and `nclt_moratorium_active` in the DB. Gardenia Gateway, Amrapali projects are explicitly in your database as AVOID projects. But there is no routing for:

- "Is Gardenia Gateway safe to buy?"
- "What is the legal status of Amrapali Silicon City?"
- "Which projects have registry problems?"

The prompt handles `project_risk_flag` only when it is present in the results block — meaning it only works if the user is comparing or searching and the project appears. There is no proactive distressed-asset routing.

**Fix:** Add routing rule K: If user asks about legal risk, registry status, or safety of a specific project → call project DB first, check `project_risk_flag`, `registry_status`, `nclt_moratorium_active` → answer using `walk_away_conditions` and `risk_thesis` verbatim. This is genuinely valuable and a differentiator from any other portal.

---

### 7. Intelligence Data in the DB Is Not Fully Used in Chat Responses

You have `intelligence_data.riskRadar`, `investment_insights`, `quick_commutes`, `nearby_essentials`, `neighborhood_advantages`, and `transparency_checks` all seeded into the DB and rendered in the detail panel. None of this is serialized into the project block that goes to the AI.

The AI only gets: `recommendation_tier`, `decision_thesis`, `why_buy/avoid`, `persona_profile`, `DNA labels`, `decision intelligence`. The `investment_insights.rental_yield`, `riskRadar`, and `transparency_checks` are sitting in the DB unused by the AI.

**Fix:**
- Add `rental_yield` and `appreciation_annual` from `investment_insights` to the serializer (but restrict to macro context per the investment rule)
- Add `transparency_checks` (the 5 boolean checks: RERA, OC, Registry, Escrow, NCLT) to the serializer — the AI can reference these directly when a user asks about legal safety
- Add `riskRadar` entries to the serializer for comparison and risk routing

---

### 8. No Multi-Turn Memory of Viewed Properties

If a user views Panchsheel Pratishtha in the detail panel, then goes back to chat and asks "how does this compare to others?" — the AI has no idea what "this" refers to. The `viewed_slugs` field exists in `buildMemorySummary()` but it only stores past sessions, not the current session's viewed projects.

**Fix:** When the user opens a property detail panel (`openDetailProject`), push that slug and name into a `currentSession.viewedProjects` array. Inject this as a context block: `"User recently viewed: Panchsheel Pratishtha (ready-to-move, Sector 75)"`. The AI can then resolve "this" and "that one" correctly.

---

### 9. The Prompt Word Budget for Search Results Is Too Restrictive

```
Search results: 35 words (target 20–30)
```

This is correct for the happy path — where the cards already carry full context. But it breaks on edge cases:

- AVOID project returned in results → disclosure + explanation easily exceeds 35 words
- Budget exceeded → must disclose + explain → exceeds 35 words  
- Sector expansion triggered → must explain + show alternate sectors → exceeds 35 words

The prompt should allow a "disclosure override" budget: *"If any of the following conditions are true [project_risk_flag, budget_exceeded, expansion], the word limit is 80 words."*

---

### 10. Compare Overflow (>4 Projects) Has No UX Handling

The prompt says max 4 builder_lookup calls per turn. But if the user says "compare these 5 projects", the system silently truncates or errors. There is no frontend message, no AI acknowledgment of the limit, and no guidance on how to split the comparison.

**Fix:** When `comparisonProjects.length > 4`, inject a message: *"I can compare up to 4 projects at once. I'll compare [1], [2], [3], [4] — want me to swap any of them for [5]?"*

---

## What to Add to Make This Comprehensive

These are features the DB data supports right now but the chat doesn't use:

| Feature | DB data available | Effort |
|:---|:---|:---|
| "Show me only legally safe projects" | `registry_status`, `nclt_moratorium_active` | Low — add filter to search |
| "What can I negotiate on?" | `negotiation_leverage` (in recommendation_profile) | Low — add routing rule |
| "Who is the best builder?" | `builder_track_record_score`, `delivery_score`, `litigation_count` | Medium — requires builder ranking prompt |
| "Find me something like Panchsheel Pratishtha" | `persona_profile`, `sector`, `price_min_cr` | Medium — similarity search |
| "What projects are near Sector 50 metro?" | `connectivity` data in DB | Medium — requires proximity search |
| "Show resale only" | `status = ready_to_move` filter | Low — intent extraction |
| "Which projects have swimming pool?" | `amenities` table in DB | Low — lifestyle keyword → amenity filter |
| "What is the total cost with all charges?" | `cost_sheet` (stamp duty, GST, IFMS, parking) | Low — calculation route |
| "What floor rises apply here?" | `cost_sheet.floor_rise_per_floor` | Low — calculation route |
| "Show me the payment plan" | `payment_plan.milestones` | Low — add to detail panel chat |

---

## Priority Order for Fixes

1. **Card intelligence badges** (recommendation_tier + one-line verdict + best_for on card) — highest ROI, purely visual
2. **Welcome message with 3 example prompts** — zero engineering, massive first-impression improvement
3. **GATHERING loop detector** — prevents the most common abandonment scenario
4. **Multi-turn viewed property memory** — unlocks "compare to what I just saw" 
5. **Routing for distressed/legal questions** — differentiates you from every other portal
6. **transparency_checks in serializer** — AI can answer "is this project legally clean?" directly
7. **Compare table intelligence section** — uses the data you already have
8. **Compare overflow UX message** — small fix, removes silent failure
9. **Disclosure budget override** — prompt change only
10. **Negotiation leverage routing** — unique feature no Indian property portal has

---

## Final Verdict

The prompt is disciplined and the infrastructure is solid. The investment you made in seeding structured intelligence (decision_thesis, walk_away_conditions, risk_radar, transparency_checks) is real and valuable — but most of it is either not reaching the AI, not reaching the card, or not reachable through the chat routing. You have a 7/10 product with 9/10 data sitting unused. The fixes above are primarily prompt changes, card UI additions, and routing expansions — not architectural rewrites.

