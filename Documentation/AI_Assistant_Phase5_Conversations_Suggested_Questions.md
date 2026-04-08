# AI Assistant — Phase 5: Persistent Conversations and Suggested Questions

**Plan:** v227 AI Assistant Final Merged Plan  
**Completed:** 2026-03-15

## Summary

Phase 5 completes conversation persistence (last 10 messages as context, auto-title from first message), suggested question chips aligned to the plan’s 7 pages, thumbs up/down and Copy on both surfaces, and Clear conversation on widget and workspace.

## Deliverables

1. **5.1 — Last 10 messages as context**  
   Widget and workspace pass `messages.slice(-10)` as `history` to `sendMessage`. Active conversation is loaded on widget open and workspace load (existing behaviour).

2. **5.2 — Conversation auto-title**  
   First user message sets the conversation title to that message truncated to 50 characters. Implemented via `updateConversationTitle(conversationId, title)` in `aiAssistantService.js`, called from widget and workspace when `messages.length === 0` before sending. `saveMessage` also sets title (50 chars) when role is user and title is null.

3. **5.3 — AISuggestedQuestions (7 pages + programme/tasks)**  
   Plan wording used for: Dashboard, Risks, Issues, Mandates, Stakeholders, Quality, Portfolio. Programme and Tasks pages kept. Wording aligned (e.g. “Summarise this project’s mandate”, “Who has low engagement?”, “Which programmes are behind?”).

4. **5.4 — Workspace conversation history**  
   Left panel with conversation list and “+ New chat” (Phase 3) — no change.

5. **5.5 — Thumbs up/down → ai_feedback**  
   `AIChatMessage` already has ThumbsUp/ThumbsDown and calls `saveMessageFeedback(messageId, authUserId, rating)`. Both widget and workspace use `AIChatMessage`, so both surfaces persist feedback to `ai_feedback`. Copy response button already on each assistant message.

6. **5.6 — Clear conversation and Copy response**  
   - **Copy response:** On each assistant message in `AIChatMessage` (both surfaces).  
   - **Clear conversation:** Widget: “Clear conversation” link in footer + Plus icon in header (new conversation). Workspace: “+ New chat” in left panel with tooltip “Clear conversation and start a new chat”.

7. **5.7 — Unit tests**  
   - `aiAssistantServicePhase5.test.js`: `updateConversationTitle` truncates to 50 chars, no-op when conversationId or title is null/empty; `saveMessageFeedback` returns true on success.  
   - `AISuggestedQuestions.test.jsx`: Renders dashboard/risks/mandates/stakeholders plan wording; `onSelect` called with question text.

## Files Created/Updated

| File | Change |
|------|--------|
| `src/services/aiAssistantService.js` | Added `updateConversationTitle`; `saveMessage` auto-title uses 50 chars. |
| `src/components/ai/AIChatWidget.jsx` | History `slice(-10)`; call `updateConversationTitle` on first message; “Clear conversation” in footer. |
| `src/pages/platform-app/AIWorkspace.jsx` | History `slice(-10)`; call `updateConversationTitle` on first message; tooltip on New chat. |
| `src/components/ai/AISuggestedQuestions.jsx` | Plan wording for 7 pages + programme/tasks. |
| `src/services/__tests__/aiAssistantServicePhase5.test.js` | **New.** Auto-title and feedback tests. |
| `src/components/ai/__tests__/AISuggestedQuestions.test.jsx` | **New.** Suggested questions and onSelect. |
| `projectplan/v227_AI_Assistant_Final_Merged_Plan.md` | Phase 5 tasks marked complete; review updated. |

## User flow

- User opens widget or workspace → last active conversation loads; messages loaded from DB.  
- User sends first message → conversation title becomes first message (max 50 chars).  
- User sends further messages → last 10 messages sent as context to the AI.  
- User can tap “Clear conversation” (widget) or “+ New chat” (workspace) to start a new conversation.  
- User can copy any assistant response or give thumbs up/down (persisted to `ai_feedback`).  
- Suggested question chips update by route (dashboard, risks, issues, mandates, stakeholders, quality, portfolio, programme, tasks) with plan wording.
