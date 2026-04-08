# AI Assistant — Blog / Release Notes

## v227 — NotebookLM-Style AI (No Ollama)

**Release focus:** Fast, reliable answers from your data and docs, without waiting for a local model.

### What changed

- **Ollama removed** — No more 5–10 minute cold start. All data and doc answers are either instant (template) or a few seconds (Claude/Gemini via Supabase).
- **NotebookLM-style data path** — Your question is classified (data vs docs vs general). For data, we query your Supabase tables (RLS applied), then show **Sources** (the actual records) and optionally a short AI summary. The records *are* the answer; the AI only summarises.
- **Dual surface** — **Quick Ask** widget (bottom-right) for quick questions; **AI Workspace** (`/platform/ai`) for full conversations, all sources, filter, and export.
- **Documentation answers** — Ask “How do I submit a mandate?” or “What fields are on the quality register?” and the AI answers from indexed Documentation content, with a source link to the doc.
- **Org controls** — Admins choose: template-only (no data sent out), Claude Haiku (rich summary), or Gemini Flash (short summary). Privacy notice and first-time acceptance for external modes.
- **Proactive insights** — Dashboard “Today’s Insights” cards from rule-based checks (e.g. risks with no owner, mandates pending >7 days). Optional Gemini narrative. “Ask about this” opens the widget with that context.
- **Simulator parity** — AI Coach hints (Gemini) and post-run debrief (Claude) via Edge Functions. Simulator AI Workspace at `/simulator/ai` for debriefs, module scores, and run comparison.

### How to try it

1. Open any Platform page and click the **AI** button (bottom-right).
2. Ask: “Show me high-severity risks” or “Which mandates are pending approval?”
3. Check the **Sources** in the answer; click **Open in AI Workspace →** to see all sources and export.
4. In the AI Workspace, click a message that has sources — the right panel shows filter, CSV/Print export, and “Open record” links.

### For admins

- Configure **AI Data Answer Mode** and **Proactive insights** under **Organization Admin → Settings**.
- Deploy Supabase Edge Functions and set `ANTHROPIC_API_KEY` and `GEMINI_API_KEY` in project secrets.
- Run SQL migrations (v330, v331, v332, v333) and, for docs search, run `npm run seed:ai-docs` after adding Documentation files.
