# RealtyPals

AI-powered real estate advisor for Indian home buyers.

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
