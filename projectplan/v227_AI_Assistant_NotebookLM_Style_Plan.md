# v227 — AI Assistant: NotebookLM-Style (NL → Supabase, No Ollama)

**Feature:** Fast, DB-backed natural language query and interrogation — no local model load  
**Date:** 2026-03-15  
**Status:** Pending Approval  
**Replaces / complements:** v226 (Ollama + Gemini hybrid) — use this plan when Ollama load time (5–10 min) and performance are unacceptable.

---

## 1. Problem with v226 (Ollama-Based)

- Ollama + Llama 3.1 8B takes **5–10 minutes** to load on first use.
- Poor UX: long "Waiting for AI…" with no response until the model is ready.
- No way to interrogate the system/DB quickly without running a heavy local process.

---

## 2. Proposed Approach: NotebookLM-Style

**Idea:** User asks in **natural language** → the system **interrogates your DB and app (Supabase)** via existing RLS-scoped queries → returns **structured results** (“sources”) plus a **short answer**. No local LLM required for the data path.

| Aspect | v226 (Ollama) | v227 (This plan) |
|--------|----------------|-------------------|
| Data queries | Ollama + injected context (slow, model load) | Supabase only (intent → contextFetcher) → instant |
| “Answer” | Ollama generates prose | Template-based **or** one fast Gemini call (optional) |
| Generic PM knowledge | Gemini | Gemini (unchanged) |
| Cold start | 5–10 min (Ollama) | **None** |
| User experience | Wait for model | **Immediate** results from DB + optional 2–5 s summary |

---

## 3. How It Works (NotebookLM-Style)

```
User: "Show me high-severity risks on Project Alpha"
           │
           ▼
   queryRouter → data query → intentDetector → [risks]
           │
           ▼
   contextFetcher (Supabase, RLS) → structured rows + formatted text
           │
           ├──► UI: "Sources" (cards / table of actual DB rows)
           │
           └──► "Answer":
                 Option A — Template: "Found 3 high-severity risks. See below."
                 Option B — One Gemini call with result text → 1–2 sentence summary (fast)
           │
           ▼
   AIChatMessage shows: [Answer] + [Sources: R-001, R-005, R-012 with details]
```

- **Interrogate DB / system:** All data comes from **Supabase** (existing `contextFetcher` + optional new structured response shape).
- **Natural language:** Same as today — keywords drive `intentDetector` → modules → `contextFetcher`; no NL→SQL needed for V1; we use predefined module queries.
- **Optional later:** Add a small “NL → query params” step (e.g. “last 7 days” → date filter) still using Supabase, not Ollama.

---

## 4. Architecture (No Ollama in Critical Path)

### 4.1 Data query path (replaces Ollama for “local” data questions)

1. **queryRouter** — unchanged; data-style questions still classified as `engine: 'local'`.
2. **intentDetector** — unchanged; maps question → modules (risks, issues, mandates, etc.).
3. **contextFetcher** — extend to return:
   - **Formatted text** (current): for optional Gemini summary and for fallback.
   - **Structured result** (new): e.g. `{ modules: { risks: [...rows], issues: [...rows] } }` so the UI can render “Sources” as cards/tables.
4. **Answer for data query:**
   - **Option A (default, 100% private):** Template from code, e.g. “Found 3 risks. See details below.” No external API.
   - **Option B (optional, org setting):** One **non-streaming** Gemini call with the fetched text only: “Summarise this in one sentence for the user.” Fast (~2–5 s), no model load; privacy: result snippet is sent to Google.
5. **UI:** Show in each data response:
   - The short answer (template or Gemini).
   - A “Sources” block: the actual records (e.g. risk cards, issue list) so the user can interrogate the data. Export/expand as needed.

### 4.2 Generic PM knowledge

- Unchanged: **Gemini only**, no project data. Same as v226.

### 4.3 Simulator (real-time hints + debrief)

- **Real-time hints:** Use **Gemini** (fast) with minimal context (e.g. “User is on Risk module, score 45%”) — no Ollama.
- **Post-run debrief:** Use **Gemini** with run summary data (scores, decisions) — no Ollama.
- If you need 100% on-prem later, you can add an optional Ollama-on-VPS path and route hints/debrief there.

### 4.4 Proactive dashboard insights

- **Option A:** Rule-based only: run existing (or new) Supabase queries, build template sentences (“You have 2 risks with no owner”) — no LLM.
- **Option B:** One Gemini call per refresh with aggregated, anonymised summary text — fast; document that this data is sent to Gemini.

---

## 5. Implementation Phases

### Phase 1 — Data path without Ollama (core NotebookLM-style behaviour)

- [ ] 1.1 **Refactor data response:** For `engine === 'local'`, do **not** call Ollama.
  - Call `intentDetector` + `contextFetcher` as today.
  - Add `contextFetcher.fetchContextStructured()` (or extend return) to return both:
    - `formattedText` (current string for prompts/display)
    - `structured: { moduleName: [rows] }` for UI “Sources”.
- [ ] 1.2 **Template answer (default):** Add `dataAnswerTemplates.js` (or similar): given modules + row counts (and maybe first few titles), return a single sentence, e.g. “Found 3 high-severity risks. See details below.”
- [ ] 1.3 **UI — Sources block:** In `AIChatMessage.jsx`, when the response includes `structured` data, render a “Sources” section (cards or compact table) below the answer text. Theme-aware, PWA-friendly.
- [ ] 1.4 **Pipeline:** In `aiAssistantService.sendMessage`, for `engine === 'local'`:
  - Fetch context (and structured result).
  - If no context or error, return a short “No data found” message.
  - Otherwise: set answer = template answer (Option A); do **not** call Ollama.
  - Save to `ai_messages` with `processed_by: 'local'` (or new value e.g. `'data'` if you want to distinguish).
  - Return `{ content, engine, modules, structured }` so the UI can show Sources.
- [ ] 1.5 **Remove Ollama dependency from data path:** Remove `checkOllamaStatus`, `warmupOllama`, and `streamOllama` from the data-query flow. Keep Gemini for generic only.
- [ ] 1.6 **Optional — Gemini summary for data (Option B):** Org setting e.g. `ai_settings.use_ai_summary_for_data = true`. When true, after fetching context, call Gemini once (non-streaming) with prompt: “Based only on the following data, write one short sentence answering the user’s question.” Pass only `formattedText`. Document in UI that “AI summary uses Google Gemini; data snippet is sent.”
- [ ] 1.7 **Unit tests:** For template answer, for `fetchContextStructured`, and for the new sendMessage data path (no Ollama).

**Deliverable:** User asks “Show me high-severity risks” → immediate Supabase-backed results + template (or optional Gemini) answer + “Sources” in the chat. No Ollama, no 5–10 min wait.

---

### Phase 2 — Simulator and insights without Ollama

- [ ] 2.1 **Simulator hints:** In `simAICoachService`, replace Ollama with **Gemini**: build a short prompt (stage, score, trigger reason), call Gemini, return hint text. Rate-limit as today.
- [ ] 2.2 **Simulator debrief:** In `simAICoachService`, replace Ollama with **Gemini** for `generateDebrief`: send run summary (scores, key decisions), get narrative. Store in `sim.ai_debriefs` as today.
- [ ] 2.3 **Dashboard insights:** In `aiInsightsService`, either (a) keep rule-based only and build template insight strings from Supabase queries, or (b) use one Gemini call per refresh with aggregated data; document privacy. No Ollama.
- [ ] 2.4 **Unit tests** for simulator AI and insights path.

**Deliverable:** Simulator coaching and dashboard insights work with fast Gemini (or rules-only); no Ollama dependency.

---

### Phase 3 — Polish and configuration

- [ ] 3.1 **Settings:** Org-level toggles: “Use AI summary for data answers” (Option B); “Use AI for proactive insights” (if Gemini used). Document in UI.
- [ ] 3.2 **Chat widget:** Remove or hide “Ollama status” / “Starting AI…” related to local model. Show “Answered from your data” badge for data responses.
- [ ] 3.3 **Docs:** Update any docs that referenced Ollama as required for data queries. Add a short “NotebookLM-style” user guide: you can ask in natural language and interrogate your DB; answers come from your data + optional AI summary.
- [ ] 3.4 **Platform–Simulator parity:** Apply same “data = Supabase + template/Gemini, no Ollama” behaviour in Simulator chat if it shares the same service; otherwise mirror the pattern.

**Deliverable:** Clear UX, no references to starting Ollama for normal use; optional AI summary and insights documented.

---

## 6. Alternative: Fast AI Chatbot (If You Want One “Real” Chatbot)

If you still want a **single conversational AI** that can reason over your data (not just NotebookLM-style retrieval + template/Gemini summary):

| Option | Pros | Cons |
|--------|------|------|
| **Gemini with DB context** | Fast, no local setup; same API as generic. | Project data sent to Google; document and get consent. |
| **Ollama on always-on VPS** | Data stays on your infra; no cold start for users. | Cost (~$15–20/mo); you maintain the VPS and model. |
| **Supabase Edge + external fast API** | Server-side, can enforce RLS. | Same privacy as that API (e.g. OpenAI/Gemini). |

Recommendation: Use **v227 (this plan)** for the main product — fast, predictable, “interrogate your DB in natural language.” If you add a “full AI chat” later, do it via Gemini-with-context (with clear disclosure) or Ollama-on-VPS, and keep the NotebookLM-style path as the default for data questions.

---

## 7. File and Config Changes (Summary)

| Area | Change |
|------|--------|
| `aiAssistantService.js` | For `engine === 'local'`: drop Ollama; use contextFetcher + template (or Gemini summary); return `structured` for UI. Remove/hide Ollama warmup and status for data path. |
| `contextFetcher.js` | Add (or extend) to return structured `{ moduleName: [rows] }` alongside formatted text. |
| New (e.g. `utils/dataAnswerTemplates.js`) | Template sentences from module + counts/titles. |
| `AIChatMessage.jsx` | Render “Sources” from `structured` when present; theme-aware. |
| `simAICoachService.js` | Hints and debrief via Gemini instead of Ollama. |
| `aiInsightsService.js` | Insights via rules and/or Gemini; no Ollama. |
| `ai_settings` (DB) | Optional: `use_ai_summary_for_data`, `use_ai_for_insights`. |
| Docs | Document NotebookLM-style behaviour; remove “Ollama required” for data; document Option B privacy. |

---

## 8. Dependencies

- Existing: `queryRouter`, `intentDetector`, `contextFetcher`, `ai_conversations`, `ai_messages`, RLS.
- New: structured return from context fetchers; template module; optional Gemini summary and org settings.
- No new infrastructure: Supabase only for data; Gemini for generic and optional summary/hints/debrief.

---

## 9. Review Section (to complete after implementation)

- Summary of changes: …
- Breaking changes vs v226: Ollama no longer used for data path; optional Gemini summary for data.
- Performance: Data answers immediate (Supabase + template) or 2–5 s (with Gemini summary). No 5–10 min wait.

---

## 10. Relation to v226

- **v226:** Hybrid Ollama (data) + Gemini (generic). Good for full data-aware prose; bad for cold start and performance.
- **v227 (this plan):** NotebookLM-style: NL → Supabase only for data; answer = template or one Gemini call; no Ollama. Use v227 when performance and UX are priority; keep v226 as reference if you later add an optional “full LLM over data” (e.g. Gemini-with-context or Ollama-on-VPS).
