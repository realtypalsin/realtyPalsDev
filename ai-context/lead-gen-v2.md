# Lead-Gen v2 — refinements beyond the CallbackRequest → ChatSession link

Moved out of CLAUDE.md on 2026-08-27. None of this is V1. It was ~20 lines of
roadmap in a document whose job is to be read at the start of every session.


**Further Lead-Gen Refinements (v2, beyond the FK link):**

1. **Talk-track auto-draft.** At callback creation, generate one AI line the sales rep can open the call with — "Ask about their 3BHK timeline, they've viewed 2 similar projects and flagged possession delay as a concern." Saves the rep from reading a full transcript cold. Cheap once `chat_session_id` exists — one LLM call over the linked summaries.
2. **Duplicate-lead detection.** Same phone number across multiple `ChatSession`s should merge into one lead with combined history, not spawn disconnected rows. Check phone before insert; attach new session to existing lead if found.
3. **Lead-source attribution.** Record which message/question triggered the callback CTA — tells sales *why* the person converted, not just *that* they did.
4. **Soft re-engagement signal.** Users who decline the callback CTA but keep chatting are still high-intent — surface as a lower-urgency follow-up queue instead of losing them once they say no to the form.
5. **Urgency surfacing, not just tier.** HOT/WARM/COLD is a snapshot; add a lightweight recency signal ("active in chat 4 minutes ago") so sales calls while intent is fresh.

None of this needs new infrastructure — all extend `CallbackRequest`/`ChatSession` once the FK link lands. Sequence: FK link → talk-track draft → dedup → attribution → re-engagement queue. Each independently shippable.
