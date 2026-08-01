# Project Summary

## One-Sentence Value Proposition
**Our product is an AI-driven virtual real-estate consultant that instantly translates a home-buyer's spoken or typed wish-list into trustworthy, side-by-side property recommendations — complete with transparent trade-offs, builder-credibility scores, and a single-click hand-off to a human sales agent.**

---

## Core User Flow

Buyer states their need in plain language (e.g., "3 BHK near a metro in Noida") → AI parses intent (budget, configuration, location, lifestyle preferences) → Platform runs a fast database search on verified projects combined with vector-similarity matching on the natural-language query → A curated shortlist is ranked by how well each project fits the buyer's stated needs, with each result showing the price fit, distance to metro, builder score, and a key trade-off → Buyer explores an interactive UI with a side-by-side comparison table, EMI and stamp-duty calculator, and a map of nearby schools and hospitals → When ready, buyer clicks the WhatsApp Handoff button and a qualified lead is sent to the sales team along with the full conversation context.

---

## Feature Breakdown

**AI Conversational Engine**
The platform routes buyer queries through a multi-model AI pipeline (Claude, Groq) depending on query complexity and availability. Every AI response is structured as deterministic JSON — meaning the platform always returns consistent, machine-readable recommendations rather than unpredictable free-form text. This guarantees the UI always knows exactly what to display, regardless of which AI model answered.

**Data Source & Inventory**
The database is built on PostgreSQL (managed via Prisma ORM) and contains verified housing project records for Noida. Each project stores geospatial coordinates, letting the platform instantly calculate real distances to the nearest metro station, schools, and hospitals without relying on generic estimates. Builder trust scores are derived directly from the data we store: their historical delivery record, RERA compliance status, active litigation count, and reported financial health.

**Recommendation Logic**
Recommendations are ranked by how well each project matches the buyer's stated needs. Budget alignment is the primary factor — a project outside a buyer's stated budget is deprioritized regardless of how strong it is on other dimensions. Location proximity, builder reputation, and buyer-stated lifestyle preferences (e.g., green space, school quality) layer on top of that. The output is a curated shortlist, not an exhaustive list — the AI deliberately limits results to the strongest matches to avoid overwhelming the buyer.

**Trade-off Transparency**
Every recommendation surfaces at least one verified downside — possession date, construction stage, average historical delay for that builder, nearby infrastructure gaps, or any active RERA flag. This is enforced at the prompt level: the AI is instructed never to present a property without also stating its primary trade-off. The goal is to build trust, not to push a sale.

**Comparison UI**
Buyers can select multiple projects and view them side-by-side across all major attributes — price per square foot, total land acreage, open green space percentage, available configurations (BHK types), listed amenities, and estimated commute times. This removes the need for a buyer to juggle multiple browser tabs or rely on a broker's selective presentation.

**Financial Calculators**
The calculator panel auto-fills values from the selected project's live database record (price range, city, registration costs). It computes monthly home loan EMI across different tenures and interest rates, state-specific stamp duty, applicable GST, and any documented additional charges (floor rise, club membership, car parking). The buyer sees the true all-in cost, not just the headline price.

**Lead Handoff**
When a buyer is ready to talk to someone, a single button generates a WhatsApp deep-link that opens a chat with the sales team. The message sent automatically includes the buyer's original query, the AI-generated shortlist they were shown, and the full conversation transcript. The sales rep receives a complete picture of buyer intent before the first word is exchanged.

**Analytics**
Buyer behaviour is tracked through a PostHog event pipeline. Key events include: when a chat session starts, when a recommendation is generated, when a specific property is viewed, when the comparison tool is used, and when a lead is created. This data is used to understand which properties attract the most genuine interest, where buyers drop off, and which queries the AI handles well or poorly.

**Security & Compliance**
All API keys, AI system prompts, and database credentials are server-side only — never exposed to the browser. Authentication is handled via server-side session checks. Every user action that touches sensitive data (saving a property, requesting a callback, accessing a builder's phone number) requires a verified session.

---

## Target Personas

**First-Time Buyer**
Buyers purchasing their first home, typically navigating EMI, loan eligibility, and area safety for the first time. They need hand-holding through the financial side of the decision and benefit most from the cost calculator and the builder delay score — tools that translate complex information into clear, actionable signals.

**Family-Upgrade Buyer**
Families moving from a smaller home into a larger one, prioritizing school quality, metro connectivity, green open space, and project size. They use the nearby-infrastructure map and comparison table heavily to evaluate trade-offs across multiple shortlisted projects before committing.

**NRI Investor**
Buyers based outside India who cannot visit properties in person. They rely on RERA registry status, legal flag summaries, and builder credibility scores to verify project legitimacy remotely. The WhatsApp handoff feature is critical for this persona — it bridges them into a human advisor who can coordinate physical verification on their behalf.

---

## Why This Isn't Just Another Listing Site

**Conversation-First:** The primary entry point is a chat interface, not a filter panel. Buyers describe what they want in natural language and the AI interprets their intent rather than forcing them into pre-set dropdown categories. This reduces friction significantly for buyers who don't know exact sector names or price-per-sqft benchmarks.

**Honest Trade-Offs:** The platform is architecturally designed to surface negatives. The AI system prompt explicitly prohibits describing any property as uniformly positive. Every shortlisted project comes with its most significant verified downside — ensuring buyers are informed, not just impressed.

**Builder Credibility Score:** Each builder in the database carries a composite score built from data we hold: how many projects they have delivered vs. launched, average possession delay in months, active litigation count, RERA compliance rating, construction quality feedback, and whether they have any insolvency history. This gives buyers a comparable, data-grounded view of builder reliability that doesn't exist on traditional portals.

**AI-Generated Lead Qualification:** Leads are only handed off to the sales team after the buyer has demonstrated genuine intent — they have saved a property, requested a callback, asked for a site visit, or explicitly asked for builder contact. This means the sales team receives a warm, context-rich lead rather than a cold enquiry form submission.

**One-Click Human Handoff:** The transition from AI to human is frictionless and context-preserving. The sales representative receives the buyer's full conversation before the call or chat begins, enabling a personalized conversation from the first message rather than starting from scratch.

---

## Quick-Read TL;DR

1. **You tell the AI what you want** — in plain language, no forms.
2. **The AI instantly pulls verified projects** that match your wish-list from a curated database.
3. **Each suggestion shows the good and the bad** — price, location, builder's delivery record, any legal flags.
4. **You can compare shortlisted homes side-by-side** and see the true all-in loan cost instantly.
5. **When you're ready, one click** hands you off to a real sales person on WhatsApp — with your entire conversation forwarded so you never repeat yourself.
