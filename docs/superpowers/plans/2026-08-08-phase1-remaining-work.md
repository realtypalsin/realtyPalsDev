# Phase 1 Completion: Frontend Rendering + Comparison Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Phase 1 MVP by wiring backend ChatResponse into frontend, rendering confidence/comparison/freshness, and adding comparison selector overlay for visual multi-property selection.

**Architecture:** (1) Verify chat.ts calls enrichResponseWithDatabaseData and attaches ChatResponse to messages; (2) MessageBubble renders confidence scores, comparison matrix, data freshness footer, missing_data warnings; (3) CompareSelectorOverlay provides full-screen property card grid with selection bubbles (2-4 properties max); (4) Wire overlay into DiscoveryContent for "Compare" button in results header + existing COMPARE_PROPERTIES chip flow.

**Tech Stack:** React, TypeScript, Tailwind CSS, Framer Motion (existing in MessageBubble), Lucide icons, `createPortal` for overlay backdrop.

## Global Constraints

- TypeScript strict mode, no `any` types
- ChatResponse shape: `{ message, chips, confidence, comparison, data_freshness, missing_data }`
- Confidence display: always 0-100%, shown per-source (payment_plans, builder_history, location, possession) + overall %
- Comparison matrix: show only if 2+ payment plans available, rank by user priority (3 dimensions max)
- Overlay: max 4 properties selectable, min 2 to confirm, portal-based (`createPortal` to `document.body`) with `fixed inset-0 z-[100]` backdrop
- Freshness display: "Last verified: X days ago" / "Last verified: X weeks ago" (never raw dates)
- All frontend changes follow existing MessageBubble + DiscoveryContent patterns

---

## Task 1: Verify and complete chat.ts enrichResponseWithDatabaseData wiring

**Files:**
- Modify: `backend/src/routes/chat.ts:1-1000` (locate intent detection and message construction areas)
- Verify: `backend/src/lib/discovery/enrichResponseWithDatabaseData.ts` exists and is exported

**Interfaces:**
- Consumes: `enrichResponseWithDatabaseData(userMessage: string, intent: string, chatHistory: Message[], projectId?: string): Promise<Partial<ChatResponse> | null>` (from Phase 1 backend work)
- Produces: Message object with `responseMode: 'database'` and `chatResponse: ChatResponse` fields attached

- [ ] **Step 1: Locate intent detection in chat.ts**

Read `backend/src/routes/chat.ts` and find the line where intent is classified (search for `classifyIntent` or `intentDetector`). Note the line number and variable name (e.g., `const intent = await classifyIntent(...)`).

- [ ] **Step 2: Locate message construction**

Find where the AI response is pushed to the messages array (search for `messages.push({ type: 'ai'` or `type: 'assistant'`). This is where ChatResponse attachment happens.

- [ ] **Step 3: Add intent type extraction after classification**

After the intent classification line, add:

```typescript
// Extract intent type for DB enrichment routing
const intentType = intent?.type || 'GENERAL'
const dbIntents = ['PAYMENT_PLANS', 'BUILDER_HISTORY', 'COSTS', 'LOCATION', 'POSSESSION_TIMELINE']
const shouldEnrichFromDB = dbIntents.includes(intentType)
```

- [ ] **Step 4: Call enrichResponseWithDatabaseData before message push**

Before the `messages.push(...)` call, add:

```typescript
let chatResponse: Partial<ChatResponse> | null = null
if (shouldEnrichFromDB && formattedResponse) {
  try {
    chatResponse = await enrichResponseWithDatabaseData(
      userMessage,
      intentType,
      messages, // or recentHistory, whichever is available
      projectId
    )
  } catch (error) {
    console.error('[chat.ts] enrichResponseWithDatabaseData failed:', error)
    // Fall through: chatResponse stays null, use generic response
  }
}
```

- [ ] **Step 5: Attach ChatResponse to message object**

Modify the `messages.push(...)` call to include:

```typescript
messages.push({
  type: 'ai',
  content: formattedResponse,
  responseMode: chatResponse ? 'database' : 'chat',
  chatResponse: chatResponse || undefined,
  timestamp: new Date().toISOString(),
  // ... existing fields
})
```

- [ ] **Step 6: Test locally**

```bash
cd backend
npm run dev &
sleep 2

# Send a payment plan query
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the payment plans?", "projectId": "test-proj-123", "conversationId": "test-conv"}'
```

Expected: Response includes a message object with `responseMode: 'database'` and `chatResponse` (non-null with chips, confidence, etc.).

If `chatResponse` is null, check server logs for enrichResponseWithDatabaseData errors.

- [ ] **Step 7: Commit**

```bash
git add backend/src/routes/chat.ts
git commit -m "feat: wire enrichResponseWithDatabaseData into chat handler

- Extract intent type after classification (PAYMENT_PLANS, BUILDER_HISTORY, etc)
- Call enrichResponseWithDatabaseData for DB-backed intents
- Attach ChatResponse and set responseMode='database' on message
- Fall through to generic response if enrichment fails"
```

---

## Task 2: Render ChatResponse in MessageBubble (confidence, comparison, freshness, missing_data)

[Remaining tasks omitted for brevity in this file - will be executed in sequence]
