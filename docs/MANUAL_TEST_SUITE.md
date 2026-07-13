# RealtyPals Manual Test Suite
## Stress Test & Edge Case Coverage

**Purpose**: Push chatbot boundaries, identify loopholes, verify error handling.
**Format**: Each test has intent, expected behavior, and failure mode.
**Run on**: Local dev environment with backend logging visible.

---

## SECTION 1: Intent Extraction Edge Cases

### 1.1 Incomplete Intent Handling
**Test**: Say only "Sector 10"
```
User: "Sector 10"
Expected: Clarification chip asking for BHK/config
Expected response: "Sector 10 noted. What configuration are you looking for?"
Failure mode: Proceeds to search with incomplete intent → wrong results
```

**Test**: Say only "3 BHK"
```
User: "3 BHK"
Expected: Clarification asking for sector/area
Expected response: "3 BHK noted. Which sector or area are you considering?"
Failure mode: Returns 3BHK results from all sectors (too broad)
```

**Test**: No sector, no BHK, just budget
```
User: "Show me properties under 1.5 Cr"
Expected: Asks for sector AND BHK
Expected response: "Budget noted. Which sector and configuration?"
Failure mode: Returns irrelevant results (Sector 1, 1BHK, etc.)
```

### 1.2 Context Preservation (Critical for session continuity)
**Test**: Multi-turn context preservation
```
User 1: "Sector 10"
Bot: "What configuration?" (clarification)

User 2: "3 BHK"
Bot: Should show Sector 10, 3BHK results
Expected: Both parameters remembered
Failure mode: "I've temporarily hit capacity limits" OR sector forgotten (re-asks)
```

**Test**: Follow-up after results without re-specifying
```
User 1: "Best 3BHK in Sector 10"
Bot: Shows results

User 2: "Tell me more about the first one"
Expected: Knows you mean Sector 10, 3BHK context from turn 1
Failure mode: "Which sector?" (context lost)
```

**Test**: Project name lookup preserves sector context
```
User 1: "Sector 10, 3BHK"
Bot: Shows 2 results

User 2: "Show me Elite X"
Expected: Looks up Elite X (doesn't re-ask sector)
Expected response: "Elite X is in [details]. (note: outside Sector 10)"
Failure mode: "3BHK noted. Which sector or area?" (lost Sector 10)
```

### 1.3 Typos & Partial Names
**Test**: Typo in project name
```
User: "Show me ats homekraft"
Expected: Finds "ATS Homekraft Happy Trails" (fuzzy/case-insensitive)
Failure mode: "No projects found"
```

**Test**: Partial project name
```
User: "Show me ATS"
Expected: Finds "ATS Homekraft Happy Trails" (substring match)
Failure mode: "Multiple matches" OR "Not found"
```

**Test**: Wrong sector name
```
User: "Sector 99"
Expected: "Sector 99 not found. Did you mean Sector 10, 11, 13?"
Failure mode: Returns results from wrong sector OR "No projects found"
```

---

## SECTION 2: Discovery & Search Boundaries

### 2.1 Empty Result Handling
**Test**: Search with impossible criteria
```
User: "10 BHK in Sector 10, budget ₹50 L"
Expected: "No projects match (10 BHK not available in this sector)" + alternatives
Failure mode: "No results" (no explanation) OR hangs
```

**Test**: Sector with 0 projects
```
User: "Show me projects in Sector 50"
Expected: "Sector 50 doesn't have projects in our database. Showing nearby sectors: [list]"
Failure mode: Blank response OR 500 error
```

**Test**: Budget too low for sector
```
User: "Sector 10, budget ₹25 L"
Expected: "No 3BHK under ₹25L in Sector 10. Closest options: [list] ₹30L+"
Failure mode: Returns unrelated/wrong-sector results
```

### 2.2 Score Floor Enforcement (Phase 5.5)
**Test**: Low-relevance fallback
```
User: "3BHK luxury penthouse with waterfall, Sector 10"
Expected: Returns 2-3 closest matches, labels low confidence
Failure mode: Returns irrelevant projects with high confidence score
```

**Test**: Zero-relevance query
```
User: "Show me igloos in Sector 10"
Expected: "No results match that description. Here are 3BHK in Sector 10 instead:"
Failure mode: Returns real estate projects (no filter)
```

### 2.3 Rate Limiting & Capacity
**Test**: Rapid consecutive queries
```
User: 5 queries in 10 seconds
Expected: Graceful handling, possibly brief "Let me think..." delays
Failure mode: "Capacity limit" OR 429 error message to user
```

**Test**: Long complex query
```
User: "Show me all 3BHK 4BHK luxury spacious modern properties ready to move near metro station with gym swimming pool yoga studio concierge in Sector 10 under ₹2 crore with RERA number"
Expected: Parses correctly, returns relevant results
Failure mode: 413 token limit error OR truncated response
```

**Test**: Multiple rapid clarifications
```
User 1: "Sector 10"
User 2: "3 BHK" (immediate)
User 3: "Under 1.5 Cr" (immediate)
Expected: Completes intent, shows results in 1 response
Failure mode: Returns partial results OR "Capacity" error
```

---

## SECTION 3: Comparison & Analysis Features

### 3.1 Comparison Queries
**Test**: Explicit comparison
```
User: "Compare ATS Homekraft vs Arihant Abode"
Expected: Side-by-side price, amenities, BHK, possession, RERA
Failure mode: Shows details sequentially (not comparative)
```

**Test**: Comparison with criteria
```
User: "Compare best 3BHK in Sector 10, by price"
Expected: Ranks 2-3 projects by price, highlights differences
Failure mode: Shows unranked results OR wrong property type
```

**Test**: Follow-up comparison
```
User 1: "Sector 10, 3BHK"
User 2: "Compare them"
Expected: Compares the 2-3 results shown
Failure mode: "Compare what?" (no context)
```

### 3.2 Recommendation Confidence
**Test**: Low-confidence recommendation
```
User: "What's the best property for me?" (no criteria)
Expected: "I need more info. Sector? Budget? Possession timeline?"
Failure mode: Returns recommendation anyway (misleading)
```

**Test**: Conflicting criteria
```
User: "Luxury budget properties, Sector 10, ₹50 L"
Expected: "Those criteria conflict (luxury + ₹50L). Do you mean ₹1.5 Cr?"
Failure mode: Returns wrong results without flagging conflict
```

---

## SECTION 4: Error Handling & Edge Cases

### 4.1 Fallback Behavior
**Test**: All images failed in project card
```
User: Opens project detail, all images fail to load
Expected: Shows "Images unavailable" placeholder with details still visible
Failure mode: Blank card OR missing project info
```

**Test**: Chart data missing
```
User: Views comparison chart with null JSON
Expected: "Chart unavailable" message (per Phase 5.5)
Failure mode: Blank chart OR error message
```

### 4.2 Admin Lead Status Errors
**Test**: Update lead status fails
```
Admin: Changes lead status, backend fails
Expected: Toast showing "Failed to update: [error]"
Failure mode: Silent failure (status unchanged, no feedback)
```

**Test**: Rapid status changes
```
Admin: Click status button 5 times quickly
Expected: Queues/throttles requests, shows final state
Failure mode: Inconsistent UI state OR multiple requests sent
```

### 4.3 Authentication & Authorization
**Test**: Expired token
```
Session: Runs >1 hour, then query
Expected: "Session expired. Please log in again."
Failure mode: 401 error OR silent failure
```

**Test**: Unauthorized sector access
```
User: Attempts to access restricted sector
Expected: "You don't have access to this sector."
Failure mode: Returns data anyway (IDOR vulnerability)
```

**Test**: Save to favorites without auth
```
User (not logged in): Clicks save button
Expected: "Sign in to save properties"
Failure mode: 500 error OR saves anyway
```

---

## SECTION 5: Data Integrity & Validation

### 5.1 Price Formatting
**Test**: Extreme budget values
```
User: "Budget ₹0"
Expected: Rejected/clarified
Failure mode: Returns results or crashes
```

**Test**: Negative budget
```
User: "Budget -₹1 Cr"
Expected: Treated as invalid input
Failure mode: Returns results anyway
```

**Test**: Budget > 100 Cr
```
User: "Budget ₹1000 Cr"
Expected: Searches successfully (no hard limit)
Failure mode: Returns "Budget too high"
```

### 5.2 Project Data Validation
**Test**: Project with null hero_image_url
```
Expected: Falls back to images array OR placeholder
Failure mode: Broken image link OR missing visual
```

**Test**: Project with missing unit_types
```
Expected: Shows "Configuration details unavailable"
Failure mode: Blank BHK section OR 500 error
```

**Test**: Project with > 100 images
```
Expected: Carousel handles all, or shows "100+ images"
Failure mode: Hangs OR shows only first 5
```

### 5.3 RERA Validation
**Test**: Invalid RERA number
```
User: Searches for projects with invalid RERA
Expected: No false positives (doesn't show unregistered)
Failure mode: Shows unverified projects with RERA badge
```

---

## SECTION 6: Stress & Load Tests

### 6.1 Large Result Sets
**Test**: Sector with 100+ matching projects
```
User: Broad query (e.g., "any property in Noida")
Expected: Shows top 5-10 ranked, "view more" option
Failure mode: Hangs OR shows all 100+
```

**Test**: Large filter combinations
```
User: Sector + 5 BHK options + budget range + 10 amenities
Expected: Handles gracefully, returns ranked results
Failure mode: 413 token error OR times out
```

### 6.2 Session Persistence
**Test**: 50+ turn conversation
```
User: Continues chatting, changing criteria repeatedly
Expected: Context preserved, no memory leaks
Failure mode: Performance degradation OR "capacity" errors
```

**Test**: Large conversation history compression
```
Session: Hits 14+ message history threshold
Expected: Compresses past turns, recent context preserved
Failure mode: Truncates context OR memory exhausted
```

---

## SECTION 7: UX & Clarity

### 7.1 Ambiguous Input
**Test**: Homonym sector/builder names
```
User: "Show me Prime in Sector 10"
Expected: Asks "Did you mean builder Prime or project Prime?"
Failure mode: Returns wrong results
```

**Test**: Vague pronouns
```
User: "Which is better, that or this?"
Expected: "I don't have visual context. Can you name the projects?"
Failure mode: Returns arbitrary result
```

### 7.2 Answer Clarity
**Test**: Recommendation without reasoning
```
User: "What should I buy?"
Expected: Shows top option WITH reason ("Best price/config match")
Failure mode: Recommendation lacks justification
```

**Test**: Missing confidence labels
```
Expected: Every price/recommendation shows confidence
Failure mode: Shows "₹1.2 Cr" without "based on [source]"
```

---

## SECTION 8: Exploit & Loophole Tests

### 8.1 Injection Attempts
**Test**: SQL-like injection
```
User: "Sector 10'; DROP TABLE projects;--"
Expected: Treated as literal search (no results)
Failure mode: Database error message OR success
```

**Test**: XSS payload in project name
```
User: "Show me <script>alert('xss')</script>"
Expected: Rendered as text, no script execution
Failure mode: Alert fires OR HTML renders
```

### 8.2 Authorization Bypass
**Test**: Manipulate saved properties list
```
User: Directly POSTs to /api/saved with another user's ID
Expected: 403 Forbidden
Failure mode: Saves to another user's account
```

**Test**: View deleted session data
```
User: Tries to access archived chat history from another user
Expected: 403 Forbidden
Failure mode: Returns other user's chat
```

### 8.3 Logic Bypass
**Test**: Skip clarification by naming projects first
```
User: "Compare ATS and Arihant"
Expected: Asks "From which sector?", then compares
Failure mode: Assumes Sector 10 (hardcoded default)
```

**Test**: Force search with single parameter
```
User: Sends raw API call with only { sector: "Sector 10" }
Expected: Returns clarification, not results
Failure mode: Returns full result set (bypassed intent gate)
```

---

## SECTION 9: Recovery & Resilience

### 9.1 Graceful Degradation
**Test**: 1 LLM provider fails (OpenAI → Groq fallback)
```
Backend: OpenAI unavailable
Expected: Switches to Groq, user sees normal response
Failure mode: Returns error message OR timeout
```

**Test**: Both LLM providers fail
```
Backend: OpenAI AND Groq unavailable
Expected: "All AI services temporarily unavailable. Try again in 30s."
Failure mode: 500 error OR incomplete response
```

### 9.2 Partial Data Availability
**Test**: Database slow/partial response
```
Backend: Project DB returns 1/2 results before timeout
Expected: Shows available results, notes "Some projects loading..."
Failure mode: Shows only 1 OR returns none
```

**Test**: Missing builder intelligence
```
Project: Builder record exists, intelligence missing
Expected: Shows project details without recommendations
Failure mode: 500 error OR blank cards
```

---

## SECTION 10: Comprehensive Flow Tests

### 10.1 Full Happy Path
```
1. User: "Sector 10"
   Bot: Clarifies config
2. User: "3 BHK"
   Bot: Shows 2-3 projects with full details
3. User: "Tell me about the first one"
   Bot: Shows detailed panel with images, amenities, price breakdown
4. User: "Save this"
   Bot: ✓ Saved. Still logged in? If not, redirects to login
5. User: "Show me something cheaper"
   Bot: Shows alternatives, compares price
```

**Expected**: Smooth, context-aware, zero errors
**Failure mode**: Any break in flow = test failed

### 10.2 Edge Case Flow
```
1. User: "Sector 99"
   Bot: "Not found. Showing Sector 10:"
2. User: "3 BHK"
   Bot: Shows results, but: "Note: Sector 99 not available"
3. User: "Compare them"
   Bot: Compares correctly
4. User: (Logs out) "Show more"
   Bot: "Showing more. Sign in to save."
```

**Expected**: Graceful fallback, no confusion
**Failure mode**: Inconsistent state OR error

---

## Test Execution Checklist

Run tests in this order:
- [ ] SECTION 1: Intent extraction (10 min)
- [ ] SECTION 2: Discovery (15 min)
- [ ] SECTION 3: Comparisons (5 min)
- [ ] SECTION 4: Error handling (10 min)
- [ ] SECTION 5: Data validation (10 min)
- [ ] SECTION 6: Stress (15 min)
- [ ] SECTION 7: UX clarity (10 min)
- [ ] SECTION 8: Exploits (5 min)
- [ ] SECTION 9: Recovery (10 min)
- [ ] SECTION 10: Full flows (10 min)

**Total time**: ~90 minutes

## Issues Found Log

Record each issue:
```
ID: [test section].[test number]
Severity: Critical / High / Medium / Low
Test: [description]
Observed: [what happened]
Expected: [what should happen]
Reproduction steps: [exact steps]
Status: Open / Fixed / Deferred
```

---

## Post-Test Actions

1. **Critical issues** (data loss, IDOR, crash): Fix before shipping
2. **High issues** (wrong results, UX broken): Fix in next sprint
3. **Medium issues** (cosmetic errors, edge cases): Backlog
4. **Low issues** (rare edge cases): Document, backlog
