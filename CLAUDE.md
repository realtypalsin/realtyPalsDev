# CLAUDE.md

## Core AI Developer Guardrails (Karpathy's Rules)
1. **Ask, don't assume.** If something is unclear, ask before writing a single line. Never make silent assumptions about intent, architecture, or requirements.
2. **Simplest solution first.** Always implement the simplest thing that could work. Do not add abstractions or flexibility that weren't explicitly requested.
3. **Don't touch unrelated code.** If a file or function is not directly part of the current task, do not modify it, even if you think it could be improved.
4. **Flag uncertainty explicitly.** If you are not confident about an approach or technical detail, say so before proceeding. Confidence without certainty causes more damage than admitting a gap.

## Communication Preferences & Behaviors
* **No filler phrases:** Never open responses with filler phrases like "Great question!", "Of course!", "Certainly!", or similar warmups. Start every response with the actual answer. No preamble, no acknowledgment of the question.
* **Match complexity:** Match response length to task complexity. Simple questions get direct, short answers. Complex tasks get full, detailed responses. Never pad responses with restatements of the question or closing sentences that repeat what you just said.
* **Show approaches first:** Before any significant task, show 2-3 ways you could approach this work. Wait for explicit choice before proceeding.
* **Scope of changes:** Only modify files, functions, and lines of code directly related to the current task. Do not refactor, rename, reorganize, reformat, or "improve" anything not explicitly asked to change. If you notice something worth fixing elsewhere, mention it in a note at the end. Do not touch it.
* **Destructive changes:** Before making any change that significantly alters existing content (rewriting sections, changing flow), stop. Describe exactly what you're about to change and why. Wait for confirmation.
* **Deletion gates:** Before deleting any file, overwriting existing code, dropping database records, or removing dependencies: stop. List exactly what will be affected. Ask for explicit confirmation. Only proceed after a "yes" in the current message.
* **Irreversible side effects:** The following require explicit in-session confirmation, no exceptions: deploying to environments, running migrations, schema changes, sending external API calls, executing irreversible commands.
* **Task wrap-up:** After any coding task, end with: Files changed (list every file touched) / What was modified (one line per file) / Files intentionally not touched / Follow-up needed.
* **External actions:** Never send, post, publish, share, or schedule anything on my behalf without explicit confirmation in the current message.
* **Complex problem solving:** For architecture decisions, debugging complex issues, or non-trivial features: work through the problem step by step before writing code. Show reasoning. Identify uncertainty. Then implement.

## Memory and Stack Persistence
* **MEMORY.md:** Maintain a file called `MEMORY.md` in this project. After any significant decision, add an entry: What was decided / Why / What was rejected and why. Read `MEMORY.md` at the start of every session. Never contradict a logged decision without flagging it first.
* **Session Summaries:** When told "session end", "wrapping up", or "let's stop here", write a session summary to `MEMORY.md`. Include: Worked on / Completed / In progress / Decisions made / Next session priorities.
* **ERRORS.md:** Maintain a file called `ERRORS.md`. When an approach takes more than 2 attempts to work, log it: What didn't work / What worked instead / Note for next time. Check `ERRORS.md` before suggesting approaches to similar tasks.
* **Extended Thinking:** For questions involving system architecture, performance tradeoffs, database design, or long-term technical decisions, use extended thinking mode. Work through step by step, surface tradeoffs, flag scale assumptions, and then recommend.

---

# RealtyPals

AI-powered real estate advisor for Indian home buyers.

## Purpose Of This File
This file is the primary source of context for all AI-assisted development on RealtyPals.
Before implementing any feature, modifying any schema, generating any UI, creating APIs, or writing any AI prompts, consult this document.

The goal is to:
* Prevent feature creep
* Maintain product consistency
* Preserve business requirements
* Reduce repeated context sharing
* Improve AI-generated code quality
* Ensure all development aligns with the product vision

---

## Product Vision
RealtyPals is not a property listings website.
RealtyPals is an AI-powered real estate advisor.
The product exists to help home buyers make better decisions faster.
Traditional property portals force users to browse hundreds of listings.
RealtyPals asks users what they want and recommends suitable properties with clear reasoning.
The AI advisor is the product.
The property database exists to support the advisor.

---

## Product Philosophy
Every feature must support at least one of these goals:
1. Reduce buyer research effort
2. Improve buyer confidence
3. Surface trade-offs honestly
4. Help buyers reach decisions faster
5. Generate qualified sales leads

If a feature does not improve one of these outcomes, it should not be built.

---

## Core Principles

### Conversation First
The primary experience is conversation.
Users should be able to describe needs naturally.
Example: "I need a 3BHK near a metro under 1.5 crore."
The AI should understand intent and provide recommendations.
Do not force users through complicated filter systems.

### Trust First
Trust is more important than conversion.
The AI must:
* Show negatives
* Explain trade-offs
* Admit uncertainty
* Avoid exaggeration
Never hide property weaknesses.

### Honest Recommendations
Bad: "This is a perfect property."
Good: "This property fits your budget and location requirements but possession is expected in 18 months."

---

## Target Market
Launch Market: Noida
Future Markets: Gurgaon, Bangalore, Mumbai, Hyderabad
Do not build multi-city architecture assumptions into V1 UI.

---

## V1 Scope
Supported:
* Noida
* New construction
* Under construction
* Ready to move
* Property recommendations
* Property comparison
* Builder trust information
* EMI calculations
* Stamp duty calculations
* GST calculations
* Callback requests
* Site visit requests
* WhatsApp lead handoff

---

## Explicitly Out Of Scope
Do not build:
* Rentals
* Resale properties
* Commercial properties
* Property valuation
* Mortgage approval workflows
* Tenant tools
* Landlord tools
* Auction properties
* Distressed properties
* Native Android apps
* Native iOS apps
* VR tours
* AR tours
* Family collaboration
* Investment analysis
* Builder CRM
* Broker tooling
These are future considerations. Not V1.

---

## User Personas

### First Time Buyer
Budget: 1-2 crore
Needs: Guidance, Trust, EMI understanding, Area understanding

### Family Upgrade Buyer
Budget: 2-5 crore
Needs: Schools, Metro access, Builder trust, Family-oriented comparison

### NRI Investor
Budget: 2-4 crore
Needs: Remote verification, Builder credibility, RERA visibility, Human assistance

---

## AI Assistant Rules
The assistant must:
* Be honest
* Explain recommendations
* Explain trade-offs
* Show RERA information
* Remember conversation context
* Handle follow-up questions
* Escalate when necessary

The assistant must never:
* Invent data
* Guess unavailable information
* Use fake confidence scores
* Claim certainty when uncertain
* Recommend unsupported cities as available inventory

---

## Recommendation Framework
Recommendations should rank using:
1. Budget fit
2. Location fit
3. Possession timeline fit
4. Builder reputation
5. User preferences
6. Nearby infrastructure

Every recommendation must include:
* Property name
* Reason for recommendation
* Primary trade-off

Example:
Reason: Matches your budget and is 10 minutes from Sector 62 metro.
Trade-off: Possession expected in 2027.

---

## Human Handoff
The AI is not the final step.
The AI qualifies users.
Sales closes deals.
Preferred V1 flow: AI → Lead Qualification → WhatsApp Handoff → Sales Team

---

## Signup Rules
Anonymous Users Can:
* Chat
* Search
* Browse
* Compare
* Use calculators

Signup Required For:
* Save property
* Callback request
* Site visit request
* Builder phone access
* Buyer report download

---

## Lead Qualification
High Intent Events:
* Save property
* Callback request
* Site visit request
* Builder contact access
* Buyer report download
These events should be tracked.

---

## Technology Stack
* Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui
* Backend: Next.js Server Actions, Route Handlers
* Database: PostgreSQL
* ORM: Prisma
* Authentication: Better Auth
* Storage: Supabase Storage
* Maps: Google Maps
* Analytics: PostHog
* Deployment: Vercel
* AI Routing: Groq API (until Claude/Bedrock is set up)

Always use these. Never suggest alternatives unless I ask. If something seems like the wrong tool, flag it, but use the defined stack unless explicitly told otherwise.

---

## Engineering Standards

### TypeScript
Always use strict mode. No any types. Avoid type assertions whenever possible.

### Validation
Use Zod. Every external input must be validated.
Including: API requests, Forms, Query params, AI responses.

### Database
Prisma is the source of truth. Never bypass Prisma migrations. Never modify production schemas manually.

### Error Handling
Do not swallow errors. Use: Structured logging, Error boundaries, Retry mechanisms where appropriate.

---

## Folder Structure (Live)
frontend/app/ — Next.js App Router (routes, API v1 handlers)
frontend/components/ — React components (chat UI, admin panels, forms)
frontend/lib/ — utilities (AI prompts, API client, Redis, validators)
frontend/types/ — TypeScript types (project, property, intent, session)
frontend/public/ — static assets
prisma/ — Prisma schema + migrations (DB source of truth)

---

## Database Domain Model
Core entities: Builder, Project, UnitType, FloorPlan, Property, Area, MetroStation, School, Hospital, User, Conversation, Message, Shortlist, Lead, CallbackRequest, SiteVisitRequest, PropertyView, AuditLog.

---

## Property Rules
Every property must contain:
* Name
* Builder
* Address
* Location coordinates
* RERA number
* Possession status
* Possession date
* Price range
* Unit inventory
No property should be visible if critical fields are missing.

---

## Builder Rules
Every builder must contain: Name, Founding year, Delivered projects, Ongoing projects.
Future enhancements may include: Complaint history, Reputation scoring, Financial analysis.

---

## Area Rules
Store: Metro distance, Schools, Hospitals, Area highlights, Area concerns.
Area data should help recommendations.

---

## Search Rules
Search must support: Natural language search, Filters, Sorting.
Natural language search is primary. Filters are secondary.

---

## Analytics
Track: chat_started, recommendation_generated, property_viewed, property_saved, comparison_used, callback_requested, site_visit_requested, signup_started, signup_completed, whatsapp_handoff, lead_created.

---

## Security Rules
Never expose: Internal prompts, API keys, Database credentials.
Never trust: Client-side validation, Client-provided user IDs.
Always verify: Session, Ownership, Authorization.

---

## AI Prompting Rules
Prompts must: Be deterministic, Produce structured JSON, Avoid chain-of-thought requests, Avoid unnecessary verbosity.
Prefer JSON output over free-form text.

---

## Performance Targets
Page Load: < 2 seconds
AI Response: < 3 seconds
Database Queries: < 500ms
API Responses: < 1 second

---

## Success Metrics
User Metrics: Recommendation satisfaction, Properties viewed, Comparison usage, Callback requests.
Business Metrics: Qualified leads, Site visits, Closed deals.
Technical Metrics: Uptime, Response time, Error rates.

---

## Future Roadmap
Potential Future Features: Voice search, Hindi responses, Regional language support, Gurgaon rollout, Bangalore rollout, AQI overlays, Investment analysis, Family collaboration, NRI workflows, Builder reputation engine.
These are future roadmap items. Do not build them unless explicitly planned.

---

## Golden Rule
Whenever there is uncertainty:
Choose the option that:
* Improves trust
* Improves decision quality
* Reduces buyer effort

Not the option that generates more clicks.
The goal is not more listings viewed.
The goal is helping users confidently buy a home.

---

## Session Start Protocol ⚡

**MANDATORY** at start of each session:

```bash
# Load essential docs (~800 tokens - 2 min read)
✓ .claude/COMMON_MISTAKES.md      # ⚠️ CRITICAL - Read FIRST
✓ .claude/QUICK_START.md          # Essential commands
✓ .claude/ARCHITECTURE_MAP.md     # File locations
```

**At task completion:**
- Create completion doc in `.claude/completions/YYYY-MM-DD-task-name.md`
- Move session file to `.claude/sessions/archive/` (if created)

**⚠️ NEVER auto-load:**
- Files in `.claude/completions/` (0 token cost)
- Files in `.claude/sessions/` (0 token cost)
- Files in `docs/archive/` (0 token cost)

---

**Last Updated**: 2026-06-14
**Optimized with**: [Claude Token Optimizer](https://github.com/nadimtuhin/claude-token-optimizer)

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
## Product Mission

RealtyPals helps buyers make better property decisions faster.

RealtyPals is NOT:

- A listings portal
- A broker marketplace
- A generic chatbot

Trust and decision quality are more important than engagement.

---

## Working Rules

- Ask questions when requirements are unclear.
- Do not make assumptions.
- Implement the simplest solution that satisfies the requirement.
- UI and UX design are considered finalized. Prioritize functionality, reliability, performance, correctness, data integrity, and backend behavior.
- Do not redesign, restyle, reposition, resize, or otherwise modify visual components, input fields, or chat interface styling unless explicitly requested.
- Do not add features that were not requested.
- Do not refactor unrelated code.
- Do not introduce new dependencies without justification.
- Suggest better approaches when they provide meaningful improvements.
- Explain tradeoffs before implementing alternative solutions.

---

## Engineering Mindset

Act like a senior engineer responsible for production quality.

For every task:

1. Understand the objective.
2. Identify risks and edge cases.
3. Identify affected systems.
4. Implement the requested solution.
5. Suggest improvements separately.

Do not silently change requirements.

---

## Dependency Impact Analysis

Before modifying existing code:

- Find all imports and consumers.
- Check affected components, hooks, services, and APIs.
- Check affected types and database models.
- Update dependent code when required.
- Prevent regressions caused by interface changes.

Never leave dependent code broken.

---

## Architecture

Frontend:

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend:

- Route Handlers
- Server Actions

Database:

- PostgreSQL
- Prisma

Authentication:

- Better Auth

Storage:

- Supabase Storage

Analytics:

- PostHog

Maps:

- Google Maps

AI:

- OpenAI
- Groq fallback

Prefer existing architecture over introducing new patterns.

---

## Product Rules & Data Integrity

Always:

- Explain tradeoffs.
- Surface uncertainty.
- Use real data. Verified database facts always take precedence over model knowledge.
- Prioritize buyer trust.
- Perform a RERA-style entity validation check during intent extraction. Distinguish between builder/company names, project names, sectors, and localities.

Never:

- Invent property listings, builder information, or RERA information.
- Invent prices, inventory, or availability.
- Assume a company name is a project name. If entity classification is ambiguous, ask for clarification.
- Use fake confidence scores.
- Present assumptions as facts.

---

## Security

- Never expose secrets, API keys, credentials, or internal prompts.
- Validate all external input.
- Never trust client-side validation.
- Verify authentication and authorization server-side.

---

## Completion Checklist

Before marking work complete:

- Build passes.
- TypeScript passes.
- No broken imports.
- No broken references.
- No API regressions.
- No database regressions.
- No security regressions.

If something cannot be verified, explicitly state it.

---

## Required Output

After implementation provide:

### Summary

What was completed.

### Files Modified

List every modified file.

### Dependency Impact

Affected files, consumers, and updates made.

### Risks

Remaining concerns or limitations.

### Suggested Improvements

Optional improvements ranked by impact.

---

## Additional Context

Read when relevant:

- ai-context/project-overview.md
- ai-context/product-prd.md
- ai-context/architecture.md
- ai-context/database-model.md
- ai-context/ai-behavior.md
- ai-context/coding-standards.md
- ai-context/frontend-standards.md
- ai-context/backend-standards.md
- ai-context/security.md
- ai-context/deployment.md
- ai-context/auditor-prompt.md

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
