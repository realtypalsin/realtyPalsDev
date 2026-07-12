# Architecture Guidelines

## Stack
*   **Frontend:** Next.js, React, strict TypeScript, Tailwind CSS.
*   **Backend:** Node.js, Express.
*   **Database:** PostgreSQL accessed strictly via Prisma.
*   **AI Routing:** OpenAI (Main Chat) -> Groq (Fallback) -> Cohere.
*   **APIs:** Google Maps (Location/Distance).
*   **Auth:** OTP & Google Login.
*   **Hosting:** Vercel (Frontend), Render (Backend/DB).

## Engineering Principles
*   **Simplicity:** Write the dumbest code that works perfectly. No premature abstractions.
*   **Type Safety:** `any` is strictly forbidden. 
*   **Validation:** All external data and API inputs MUST be validated via Zod.
*   **Performance:** AI responses must resolve in <3 seconds. Optimize API latency.