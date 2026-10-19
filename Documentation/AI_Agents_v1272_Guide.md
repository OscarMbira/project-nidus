# AI agents in Project Nidus (v1272)

PRD: `projectprd/v1272_ai_agents_foundation_PRD.md` · Plan: `projectplan/v1272_ai_agents_foundation_plan.md` · Admin guide: `E:\project-nidus-admin\Documentation\AI_Centre_v1272_Guide.md`

## 1. What users get

### Ask Nidus (Platform, Simulator, Project Planner)
Ask questions about your data in plain words — "Which projects have more than 5 open high risks, sorted by budget?" — from the floating Ask Nidus button on any page, or the full workspace (Platform: **Ask Nidus** in the menu; Simulator: **Ask Nidus**; Planner: **Ask Nidus**).

- Counts, totals, averages and groupings are worked out by the database, so the numbers match the registers.
- Every answer says what was queried (register, filters, grouping). Tables have row numbers, links to each record and the usual export menu.
- **Save as report** turns an answer into a Report Builder report you can run again.
- Follow-up questions use the conversation so far. Rate answers with thumbs up/down.
- You only ever see records you already have access to.
- "Find risks similar to supplier delays" finds records by meaning as well as by words.
- **Ask Nidus about this** on the Risk, Issue, Stakeholder and Decision registers opens Ask Nidus for that register.
- In the Project Planner, Ask Nidus covers the schedule, resources and dependencies only.
- Answers come in the language of your question (or your saved language). Record text is never translated.

### Draft with AI (highlight reports)
On the highlight report page, **Draft with AI** writes a draft from the period's schedule progress, RAID changes, budget and change requests, following your organisation's report layout. Each section lists the records it used, RAG values come with a reason, and sections the AI can't fill are marked "needs your input". It is saved as a draft: you edit and submit it through the normal approval. PMO Admins / Account Owners can customise layouts under **Highlight report layouts**.

### File to registers (meetings)
On a meeting, **File to registers** reads the transcript (or notes you paste) and proposes actions, risks, issues and decisions. For each one it suggests an owner, a due date and your organisation's own category/priority, and warns about possible duplicates ("Possible duplicate of RSK-0042 — 87% similar"). In the checklist you choose: create a draft, add it as an update to the existing record, set it aside, or decide later. Nothing reaches a register until you press **File selected items**; the confirmation lists the new records' IDs.

### Match my columns (bulk uploads)
When a file from another tool doesn't match the template (Stakeholders, Project Contacts, Test cases, Schedule import), a matching step suggests where each column goes, with a confidence level, and converts values such as "H/M/L" to your register's values. You confirm every column before the normal preview. Confirmed mappings can be saved and are offered automatically next time. Only your column names and the first 20 rows are sent to the AI.

### Simulator: AI stakeholders, adaptive difficulty, AI Assessor
- **Stakeholders** (sponsor, supplier, team members…) reply in character when you message them from the run dashboard, and remember what you decided. Ignore a stakeholder's concerns and their trust falls; low trust makes their escalations come sooner. The run's numbers (health, scores) stay rule-based.
- **Adaptive difficulty:** each simulated day the scenario looks at how you're doing and adjusts how many, how severe and how urgent new events are — within limits the scenario author set. Event wording may be tailored to your project; the options and their effects never change. The debrief shows each change and why.
- **AI Assessor:** after each decision and at the end of the run, the Assessor scores you against the scenario's rubric and explains why. It is advisory until the scenario has been calibrated by its authors; then it may count toward your score with a set weight. If you disagree, use **I disagree with this**.

## 2. For Account Owners / PMO Admins: AI Settings
Account / Organisation Settings → **AI Settings** (Simulator: PMO Admin → AI Settings; Planner: Settings → AI settings).

- AI is **off** until you accept the AI data-processing notice: what is sent (the question and the records needed to answer it), that data isn't used for training, and how long it's kept.
- Switch AI on or off for your organisation at any time.
- Choose how long conversations and usage records are kept, within the range Admin allows. Shortening shows how many conversations will be deleted.
- See this period's AI credit usage. You're warned in the app and by email at 80%; at 100% new AI requests stop until the allowance renews or Admin adds credits. Everything else keeps working.

## 3. Owner setup and run order

### Secrets (Supabase → Edge Functions → Secrets)
| Secret | Value |
|---|---|
| `ANTHROPIC_API_KEY` | The Anthropic API key. |
| `OPENAI_API_KEY` | Kept for meeting transcription (Whisper) only. |
| `AI_CRON_SECRET` | Any long random string; also stored in `public.ai_job_config.cron_secret`. |
| `ALLOWED_ORIGINS` | Optional, comma-separated app URLs to restrict CORS. |
| `GEMINI_API_KEY` | Remove after Phase 1 — no function uses it any more. |

### Extensions (Database → Extensions)
`vector` (meaning search), `pg_cron` and `pg_net` (background jobs).

### SQL, in order (each `_tests.sql` straight after its file)
1. Admin `v235`, `v236`, `v237`, `v238`, `v239`, `v240`, `v241` (E:\project-nidus-admin\SQL).
2. Monorepo `v1272` (+tests), `v1273`, `v1274`, `v1275`, `v1276` (+tests), `v1277` (+tests), `v1278`, `v1279`, `v1280`, `v1281` (+tests), `v1282`, `v1283` (+tests), `v1284`, `v1285`, `v1286` (+tests), `v1287`, `v1288`.
3. `node scripts/generate-planner-table-allowlist.mjs --write` (already up to date in the repo), then re-run `SQL/v1251_planner_table_wall.sql`.
4. `UPDATE public.ai_job_config SET functions_base_url = 'https://<project-ref>.supabase.co/functions/v1', cron_secret = '<AI_CRON_SECRET>', updated_at = NOW();`

### Deploy edge functions
```
supabase functions deploy agent-run status-report-agent ai-insights meeting-ai-extract meeting-register-agent import-mapper
supabase functions deploy ai-simulator-hint ai-simulator-debrief plan-ai-generate whisper-transcribe sim-ai-npc sim-ai-assess
supabase functions deploy ai-embed --no-verify-jwt
```
`ai-chat`, `ai-data-summary`, `ai-docs` and `ai-knowledge` were removed: delete them from the Supabase project.

### Then in Admin → AI Centre
Set plan credits (Plans & Credits), check model prices (Models & Routing), and for the Simulator write at least one scenario rubric and the stakeholder personas.

### Evals (after deploy)
- Ask Nidus: `SUPABASE_URL=… SUPABASE_ANON_KEY=… EVAL_EMAIL=… EVAL_PASSWORD=… EVAL_PROJECT_ID=… node scripts/ai-eval/run-ask-nidus-eval.mjs` — needs ≥ 90% (English) and ≥ 85% per other language. The eval user's organisation needs demo data, the AI notice accepted and credits.
- Meaning search: `SUPABASE_URL=… AI_CRON_SECRET=… node scripts/ai-eval/run-meaning-search-eval.mjs` — needs recall@5 ≥ 80% (English).
- Multilingual spike (decision D22a): add `--model multilingual-e5-small` and compare per-language recall, time per text and memory. The result goes to the owner; no model switch without approval.

## 4. How it is built (short)
- One Anthropic client (`supabase/functions/_shared/anthropic.ts`); model IDs and prices come from `public.ai_platform_settings`.
- Every AI call goes through `_shared/aiRun.ts`: signed-in user only, kill switch → organisation AI notice and on/off → credits; then an audit row in `agent_runs` / `agent_steps` and a credit deduction.
- Ask Nidus never writes SQL: it sends a structured query to `ai_run_query`, which checks every name against the data catalogue, binds values, runs read-only as the user (RLS) with a timeout and row cap.
- Agents only read records or write drafts/staging rows; they never update, submit, approve or delete records.
- Meaning search: `gte-small` embeddings in `search_index`, hybrid keyword + meaning ranking after the access filter.
- Simulator AI: personas and memory (`sim.npc_run_memory`), rule-based difficulty (`@nidus/shared/utils/simAdaptiveDifficulty.js`), Assessor (`sim.ai_assessments`) calibrated in Admin.

## 5. Blog summaries

**Phase 0 — AI you can govern.** Every AI request now needs a signed-in user, runs through one provider and is recorded. Organisations switch AI on by accepting a clear notice, see their monthly AI credits, and decide how long conversations are kept. Admin has a kill switch, per-plan credits and a usage dashboard.

**Phase 1 — Ask Nidus.** Ask anything about your projects in plain words and get exact numbers straight from the database, with a table you can export or save as a report. Project Planner users can ask about their schedule, resources and dependencies. And highlight reports can now be drafted for you, following your organisation's own layout — every statement linked to the records behind it.

**Phase 2 — Agents that do the paperwork.** File a meeting's actions, risks, issues and decisions into the registers in one checklist, with owners and duplicates spotted for you. Bring spreadsheets from other tools without reformatting them first: Nidus matches the columns and remembers how you mapped them.

**Phase 2b — Search by meaning.** "Anything about late supplier deliveries?" now finds the risk called "Vendor delay on structural steel". Meaning search also makes duplicate spotting smarter when you file a meeting.

**Phase 3 — A flight simulator for project managers.** Simulator stakeholders now have personalities, remember your decisions and react to them. Scenarios adapt to how you're doing, and an AI Assessor explains how you did against the scenario's rubric — advisory until each scenario's authors have checked it against their own judgement.
