# AI Assistant — Technical Guide

## Architecture (v227)

The AI Assistant uses a **NotebookLM-style** data path: user questions are classified, then answered from Supabase data, indexed documentation, or a generic LLM. **Ollama has been removed**; all external AI calls go through Supabase Edge Functions.

### Classification and routing

1. **queryRouter.js** — Classifies each question as:
   - `data` — about project/portfolio data (risks, issues, mandates, etc.)
   - `docs` — “how do I”, “how does”, system documentation
   - `generic` — general PM knowledge

2. **intentDetector.js** — Maps keywords to DB modules (risks, issues, project_mandates, stakeholders, portfolio, programme, quality, benefits, tasks).

3. **contextFetcher.js** — `fetchContextStructured(userId, orgId, projectId, modules)` runs RLS-scoped Supabase queries and returns `{ formattedText, structured: { moduleName: [rows] } }`.

4. **docFetcher.js** — For `docs` queries, searches `ai_docs_index` (keyword array overlap) and returns matching chunks + `formattedText`.

### Data answer path

- **Template mode:** `dataAnswerTemplates.js` builds a short count-based summary; no external API.
- **Claude / Gemini mode:** Formatted text + question sent to Edge Function **ai-data-summary** (Claude Haiku or Gemini Flash). Response is the answer text; `structured_data` is stored on the message.

### Docs answer path

- Chunks from `docFetcher` + question → Edge Function **ai-docs** (Claude Haiku). Answer from doc content only. `structured_data.modules.docs` holds doc metadata for the Sources block.

### Generic path

- Question only → Edge Function **ai-knowledge** (Gemini 1.5 Flash). No project data.

### Edge Functions (Supabase)

| Function | Purpose | Secrets |
|----------|---------|--------|
| ai-data-summary | Data summary (Claude or Gemini) | ANTHROPIC_API_KEY, GEMINI_API_KEY |
| ai-knowledge | Generic PM knowledge | GEMINI_API_KEY |
| ai-docs | Documentation Q&A | ANTHROPIC_API_KEY |
| ai-simulator-hint | Simulator coaching hints | GEMINI_API_KEY |
| ai-simulator-debrief | Post-run debrief | ANTHROPIC_API_KEY |

### Database (Platform)

- **ai_conversations** — Per-user, per-domain (platform/simulator); `is_active`, `project_id`.
- **ai_messages** — Role, content, `processed_by` (data | docs | external), `structured_data` (JSONB for Sources).
- **ai_settings** — Org-level: `data_answer_mode`, `data_privacy_accepted_at`, `insights_enabled`, `insights_mode`.
- **ai_insights_cache** — Cached dashboard insights (24h TTL).
- **ai_docs_index** — Chunked documentation; `keywords` (TEXT[]), `doc_route`, etc.
- **ai_feedback** — Thumbs up/down on messages.

### Simulator (sim schema)

- **sim.ai_debriefs** — Post-run debrief content (JSONB).
- **sim.ai_coach_events** — Hint events per run.
- **sim.ai_settings** — Parity with platform (data_answer_mode, insights_enabled, coach_hints_enabled).

### Frontend

- **AIChatWidget.jsx** — Floating widget; listens for `ai-widget-prefill` for “Ask about this” from insights.
- **AIWorkspace.jsx** — Platform workspace at `/platform/ai`; three panels (history, chat, sources); mobile tabs; `selectedMessageId` drives Sources panel.
- **AIWorkspaceSources.jsx** — Right panel: filter by module, export CSV/Print, record links (module → route map).
- **SimAIWorkspace.jsx** — Simulator workspace at `/simulator/ai`; debriefs, scores, compare runs.

### Documentation indexing

- Run `npm run seed:ai-docs` after adding or changing files in `Documentation/`. Script: `scripts/seed_docs_index.js`; reads `.md` files, chunks, extracts keywords, upserts into `ai_docs_index`. See `Documentation/AI_Docs_Index_Seed_Guide.md`.
