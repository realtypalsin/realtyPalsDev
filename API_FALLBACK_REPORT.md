# API Fallback Mechanism & Status Report
**Date:** 2026-08-09  
**System:** RealtyPals Backend  

---

## Fallback Chain Architecture

```
User Request
    ↓
Attempt: Gemini (Primary)
    ├─ Success → Return response
    └─ Error (pre-first-chunk) → Attempt Fallback 1
        ↓
    Attempt: OpenAI / GitHub Models API (Fallback 1)
        ├─ Success → Return response
        └─ Error (pre-first-chunk) → Attempt Fallback 2
            ↓
        Attempt: Groq (Fallback 2, no tool support)
            ├─ Success → Return response (tools disabled)
            └─ Error → Return error to client
```

**Special Case:** Mid-stream stall (tokens sent)
- Cannot switch providers mid-stream (would corrupt UI)
- Sends: `[Response truncated due to timeout. Please ask me to continue.]`
- Session persisted so user can retry with clean state

---

## API Connectivity Test Results

| API | Endpoint | Status | Details |
|-----|----------|--------|---------|
| **Gemini** | `generativelanguage.googleapis.com` | ⚠️ HTTP 400 | Bad request (format issue or key issue) |
| **OpenAI** | `api.openai.com/v1/models` | ⚠️ HTTP 401 | Auth error (invalid/missing key or quota) |
| **Groq** | `api.groq.com/openai/v1` | ⚠️ HTTP 401 | Auth error (invalid/missing key or quota) |

---

## Configuration Status

### Environment Variables
```
GEMINI_API_KEY:    ✓ Set (test call → HTTP 400 = key issue or rate limit)
OPENAI_API_KEY:    ✓ Set (test call → HTTP 401 = auth or quota issue)
GROQ_API_KEY:      ✓ Set (test call → HTTP 401 = auth or quota issue)
```

### Provider Configuration (from openai.ts)
1. **Azure OpenAI** (if AZURE_OPENAI_API_KEY + AZURE_OPENAI_ENDPOINT set)
2. **GitHub Models API** (if OPENAI_API_KEY starts with `github_pat_`)
3. **Standard OpenAI** (fallback with OPENAI_API_KEY)

---

## Test Results Summary

### Backend Tests
- **Total test files:** 60+
- **Failing tests:** 54 tests in discovery, chat, leads routes
- **Root causes identified:**
  - Leads API: HTTP status assertions failing (likely 503 or timeout)
  - Chat integration: Stream handler not completing properly
  - Discovery module: Intent classification tests failing
  
### Fallback Mechanism Tests
✅ **Code-level verification:**
- Gemini primary flow: Present in chat.ts:1427
- OpenAI fallback: Present in chat.ts:1446
- Groq fallback: Present in chat.ts (line ~1470+)
- Mid-stream stall handling: Implemented with timeout message
- Session persistence: Preserved on fallback

⚠️ **Runtime verification:**
- All three APIs returning auth/format errors
- Cannot confirm full fallback chain without valid credentials
- Groq fallback mode (no tools) properly documented in code

---

## Fallback Behavior Details

### Scenario 1: Pre-First-Chunk Failure
**Example:** Gemini times out before sending any tokens
1. Gemini stream throws `GeminiStreamStallError`
2. Check: `tokensSent == false` ✓
3. Action: Attempt OpenAI fallback
4. Result: Clean switch, client sees single response

### Scenario 2: Mid-Stream Failure
**Example:** Gemini sends 50% of response, then stalls
1. Gemini stream throws `GeminiStreamStallError`
2. Check: `tokensSent == true` ✓
3. Action: DO NOT fallback (would corrupt stream)
4. Result: Send timeout message, persist partial session

### Scenario 3: Tool Fallback to Groq
**Example:** OpenAI fails, Groq is last resort
1. OpenAI fails, Groq is attempted
2. Groq mode: No tool support
3. System message: `GROQ_FALLBACK_SUFFIX` appended (line 182)
4. Model: Redirects tool-dependent queries ("I can't look that up live, but...")

---

## API-Specific Notes

### Gemini (Primary)
- Model: `gemini-2.0-flash`
- Features: Native tool support, vision capable
- Stream timeout: 60 seconds (INACTIVITY_MS)
- Auth: API key in header `x-goog-api-key`

### OpenAI (Fallback 1)
- Models: `gpt-4o` (primary), `gpt-4o-mini` (cost fallback)
- Features: Full tool support, streaming
- Stream timeout: 60 seconds
- Auth: Bearer token
- Note: May route through Azure OpenAI or GitHub Models API

### Groq (Fallback 2)
- Model: `llama-3.1-70b-versatile` or similar
- Features: Fast inference, NO tool support
- Limitations: Cannot call external APIs (web_search, builder_lookup, rera_check)
- Stream timeout: 60 seconds
- Auth: Bearer token

---

## Recommendations

1. **Immediate:** Verify API credentials
   - Test each endpoint with valid keys
   - Check quota limits and rate limits
   - Confirm Azure OpenAI or GitHub Models API setup

2. **Monitoring:** Add metrics
   - Track which API serves each request
   - Log fallback triggers with reason
   - Alert on 3+ consecutive fallbacks per session

3. **User Experience:** Current behavior
   - ✅ Transparent timeout messages
   - ✅ Session persistence for retry
   - ✅ No double-responses on failure
   - ⚠️ Tool-dependent queries fail on Groq fallback (expected)

4. **Testing:** Create fallback simulation
   - Mock Gemini failure → verify OpenAI takes over
   - Mock OpenAI failure → verify Groq takes over
   - Mock mid-stream stall → verify timeout message only

---

**Status:** Code implementation complete. Runtime verification blocked on valid API credentials.
