trust signals — this is your product's central pillar (Trust First) actively undermined by one tab.
- Confidence and hedging language actually reflecting real confidence, not binary found/not-found. Your data_gaps[] design is the right primitive — the "Claude" move is surfacing partial confidence in the copy itself ("we have pricing but not the RERA number yet") rather than all-or-nothing per field.
- Traceable model routing, so cheap/simple queries don't pay premium latency+cost, and you can reason about "why did this response take 4 seconds" without guessing. You have the classifier. It's disconnected.

Not investigated (would need separate pass)

- projects.ts (959 lines, not fully read by researcher) — DB query/mapping layer, likely fine but unverified.
- Whether sanitizeUserMessage/inputGuardrail (prompt injection defense) cover realistic jailbreak attempts vs just obvious ones — didn't stress-test.
- Actual latency numbers per pipeline branch — audit was structural, not perf-profiled.

No changes made. Say which of these you want tackled first — #1 (Intelligence tab fabrication) is the one I'd fix before anything else, it's the direct contradiction of your own product philosophy and it's silent to the user.
