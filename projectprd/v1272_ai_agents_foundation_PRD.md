# v1272 — AI agents foundation (Phases 0–3) — PRD

**Status:** Decision interview complete (2026-10-19). All decisions D1–D27, including D12a, D16a and D22a, agreed with the owner. PRD confirmed by the owner 2026-10-19. Implementation plan `projectplan/v1272_ai_agents_foundation_plan.md` awaiting approval. No implementation before that.
**Apps:** Platform (`public`), Simulator (`sim`), Admin (`admin`, separate repo `E:\project-nidus-admin`). Project Planner edition: see section d, decision D16.
**Roadmap links:** Product Vision ("AI-assisted planning, diagnostics, and decision support"), R8 (Simulator: AI events), R9 (Admin governance), R10 (reporting and executive decision support), R12 (enterprise hardening).
**Builds on:** v321–v330 AI tables (`ai_conversations`, `ai_messages`, `ai_feedback`, `ai_settings`, `ai_insights_cache`, and the `sim.*` equivalents), the AI Assistant (`aiAssistantService.js`), the edge functions `ai-chat`, `ai-data-summary`, `ai-docs`, `ai-knowledge`, `ai-simulator-hint`, `ai-simulator-debrief`, `meeting-ai-extract`, `plan-ai-generate` and `whisper-transcribe`, the Report Builder (`ReportBuilder.jsx`, `report_templates`), and `public.search_index` (v643).

---

## a) Problem statement

Project Nidus has about ten AI features. Each is a single prompt in and a single answer out. None can look something up, take a step and check the result, so there are no **agents**. The current setup has these problems:

1. **Users can't query their organisation's data freely.**
   - The AI Assistant guesses which modules a question is about from keywords (`detectModules`) and pastes a capped set of rows into a prompt.
   - Questions outside the recognised modules, or ones that need counts, totals or grouping across many rows, get wrong or partial answers. The prompt already has to work around "showing X of Y".
2. **The AI endpoints are open and uncapped.**
   - The AI edge functions don't check who is calling (CORS `*`, and the client sends no `Authorization` header).
   - Anyone who finds a URL can spend the API budget. No usage is metered per organisation or plan.
3. **Three model providers, with old model IDs.** Gemini, Anthropic and OpenAI are called with old model IDs (`gemini-1.5-flash`, `claude-3-5-haiku-20241022`) that will stop working.
   - The Simulator event generators (`openaiService.js`, `aiEventGeneratorService.js`) read `VITE_OPENAI_API_KEY` in the browser. That's the same pattern that got the Gemini key revoked on 2026-09-11.
4. **Admin has no control over AI.**
   - There's no per-tenant enable/disable, quota, model setting, kill switch or usage dashboard.
   - So AI can't be packaged or priced per plan.
5. **Time-consuming PM work is still manual even though the data exists:**
   - writing status/highlight reports
   - filing meeting outcomes into the RAID registers
   - mapping messy import files
6. **Simulator AI is shallow.** NPC events come from templates, coaching is a single hint or debrief, and there's no AI-backed assessment. That limits the Simulator's main point of difference.

## b) Solution

Four phases, each shipping a usable vertical slice:

- **Phase 0 — Hardening and AI governance.** All AI edge functions require a signed-in user. Consolidate on one model provider. Move browser-side keys to the server. Add the agent audit tables, the Admin AI console (per-tenant enable, quotas per plan, model routing, kill switch, usage), and organisation consent.
- **Phase 1 — Agent runtime, "Ask Nidus" and the Status Report agent.**
  - One shared agent runtime: an edge function running a tool-use loop.
  - A curated **data catalogue** and a **safe query runner** (read-only, runs as the user, RLS enforced) so users can ask open-ended questions across every catalogued module.
  - Every answer can be saved as a Report Builder report.
  - The first task agent drafts a status/highlight report for PM review.
- **Phase 2 — Agents that write drafts.**
  - **Meeting-to-Register agent:** turns transcript extracts into draft actions, risks, issues and decisions linked to the right registers.
  - **Bulk Import Mapper:** maps unfamiliar spreadsheet/export columns onto Nidus import templates.
  - Agents never save governed records directly. Every output is a draft the user approves (rules 37 and 53).
  - **Phase 2b — Meaning search (vector search).** This is the last slice of Phase 2:
    - add `pgvector` embeddings to `public.search_index` / its `sim` equivalent, so they inherit the same account/project scoping
    - embed free-text content (risk/issue descriptions, lessons, meeting summaries, daily logs)
    - add hybrid search (keyword + meaning)
    - use it for Meeting-to-Register duplicate detection, for Ask Nidus "find similar…" questions, and for lessons search

    No separate vector database.
- **Phase 3 — Simulator AI.**
  - **AI stakeholders:** sponsor, supplier and team-member NPCs that remember earlier decisions.
  - An **adaptive scenario agent** that adjusts difficulty.
  - An **AI Assessor** that scores decisions against a rubric.
  - **Practice mode**, so learners use the Phase 1–2 agents against `sim` data.

Every phase is built for Platform and Simulator together through the same runtime, with the schema chosen from `useAppConfig().db`.

## c) User stories

### Phase 0 — Hardening and governance
1. As the owner, every AI edge function rejects requests without a valid signed-in user's JWT, so the API budget can't be spent anonymously.
2. As the owner, all text-generation AI calls go through one provider and one shared server-side model client, so retired models and keys are managed in one place.
3. As the owner, no AI provider key is ever read in browser code. The Simulator event generators call a server-side function instead.
4. As a security reviewer, every agent run is recorded (who, organisation, project, agent, model, tokens in/out, cost estimate, tools called, outcome, duration) in `agent_runs` / `agent_steps` in the matching schema.
5. As an Admin operator, I can turn AI on or off per organisation and globally (kill switch). The change takes effect within one minute without a deploy.
6. As an Admin operator, I can set a monthly AI allowance per subscription plan and override it per organisation.
7. As an Admin operator, I can choose which model handles each kind of work (routing, quick answers, agent work) from a list of approved models, without a code change.
8. As an Admin operator, I see a usage dashboard: runs, tokens and estimated cost by organisation, agent, model and day, with clickable cards (rule 64).
9. As an organisation's Account Owner / PMO Admin, I must accept the AI data-processing notice before AI features work for my organisation. Acceptance is recorded with who and when (`ai_settings.data_privacy_accepted_at` exists).
10. As a user, I'm warned when my organisation reaches 80% of its monthly allowance. At 100% I get a clear message instead of an error. Behaviour at the limit: decision D6.
11. As a user, if AI is off for my organisation or my role, AI entry points are hidden or clearly disabled, never broken.

### Phase 1 — Runtime, Ask Nidus and the Status Report agent
12. As a user, I ask questions in plain English ("Which projects have more than 5 open high risks, sorted by budget?") and get an answer drawn from my organisation's data.
13. As a user, the answer shows a short explanation of what was queried (source, filters, grouping) so I can check it.
14. As a user, I can see only data I already have access to. The query runner runs as me and RLS applies (rule 42).
15. As a user, answers that list records include a table with row numbers (rule 44), friendly IDs that link to each record (rule 16.1), and the standard export menu (rule 38).
16. As a user, I can click **Save as report** on any answer to save its query as a Report Builder template and re-run it later.
17. As a user, counts, totals, averages, minimums, maximums and group-bys are calculated in the database, not estimated from a sample, so the numbers match the registers.
18. As a user, if my question needs data that isn't in the catalogue, I'm told "that data isn't available to Ask Nidus" instead of getting a guess.
19. As a user, follow-up questions ("of those, which are overdue?") use the conversation's earlier context.
20. As a user, I can do a keyword search across records ("find anything mentioning vendor contract") through `search_index`. This needs the indexing gap fixed; see section g.
21. As a user, I see progress while the agent works ("Querying risks…", "Grouping by project…"), and long answers stream in.
22. As a user, I can rate an answer (thumbs up/down, `ai_feedback` exists) to feed quality review.
23. As an Admin operator, I control which tables and fields are in the data catalogue, with friendly names, descriptions, which fields can be filtered or totalled, and allowed links between tables.
24. As a Report Builder user, manual reports use the same server-side query runner, so they gain grouping and totals and match Ask Nidus.
25. As a PM, I click **Draft status report** on a project and get a draft highlight report built from the period's schedule progress, RAID changes, financials and change requests, which I edit before saving.
26. As a PM, every statement in the drafted report points to the records it came from, so I can check it before submitting.
27. As a PM, the drafted report goes into the existing highlight report flow as a draft (rule 37) and through its normal approval. The agent never submits or approves.
27a. As a PMO Admin / Account Owner, I can customise the highlight report layout: add or remove sections, add custom sections and fields, reorder them, choose which fields appear, and give each section an AI drafting instruction. The layout is a template a project inherits (D12a).
27b. As a PM, when I click "Draft with AI", the agent drafts exactly the sections and fields in my project's layout, including custom ones, and leaves sections it can't fill from data clearly marked "needs your input".
27c. As a PM, if my PMO allows it, I can choose a different layout or remove optional sections for my project's reports, without affecting other projects.
27d. As a Project Planner user, I can use Ask Nidus to ask questions about my schedule, resources and dependencies ("which tasks drive the finish date?", "who is over-allocated next month?", "what depends on the design sign-off?") and get answers drawn from my plan.
27e. As a Project Planner user, if I ask about data outside the Planner's scope (risks, budgets, changes), I'm told it isn't available in the Planner edition, with a short note on what the full Platform offers.
28. As a Simulator learner, the Simulator offers Ask Nidus and the Status Report agent against `sim` data, with identical behaviour.

### Phase 2 — Agents that write drafts
29. As a PM, after a meeting is transcribed and extracted, I click **File to registers**. The agent proposes draft actions, risks, issues and decisions, each matched to the project and checked against existing records to avoid duplicates.
30. As a PM, I review the proposals in a checklist (accept / edit / reject each), then the accepted ones are created as draft records in their registers. The success modal lists their display IDs (rule 16).
31. As a PM, a proposal that looks like an existing record is shown as "possible duplicate of RSK-0042", with the option to add the meeting note to that record instead. Until Phase 2b ships, matching is keyword-based. From Phase 2b it uses meaning search (story 37).
32. As a user doing a bulk upload, if my file's columns don't match the template, the Import Mapper suggests a mapping from each of my columns to template fields, with a confidence level and value conversions (e.g. "High/Med/Low" → the register's values).
33. As a user, I confirm or change the mapping before anything is imported. The import then runs through the existing bulk-upload validation and confirmation steps.
34. As a user, I can save a confirmed mapping for reuse on the next file from the same source.
35. As a Simulator learner, both Phase 2 agents work in practice mode against `sim` data.

### Phase 2b — Meaning search (vector search)
36. As a user, I can ask Ask Nidus "find risks similar to supplier delays" or "what lessons do we have about data migration?" and get records that match by meaning even when the wording differs. Results are ranked and link to each record.
37. As a PM, Meeting-to-Register duplicate detection finds existing risks, issues and actions that mean the same thing as a proposal, not just ones with the same words, and shows a similarity indicator.
38. As a user, meaning search returns only records I'm allowed to see. Results are filtered by the same account/project scoping and RLS as `search_index`, before ranking.
39. As a user, when I create or edit a record covered by meaning search, it becomes findable by meaning within a few minutes, with no manual re-index. Deleted and soft-deleted records drop out of results.
40. As a user, search combines keyword and meaning matches (hybrid), so exact references ("RSK-0042", a supplier's name) still rank first when I type them.
41. As an Admin operator, I can see how many records are waiting to be embedded and any failures in the Admin AI console, and I can trigger a re-embed for an organisation.
42. As a Simulator learner, meaning search works the same against `sim` data.

### Phase 3 — Simulator AI
43. As a learner, I interact with AI stakeholders (sponsor, supplier, team member) who each have a defined persona and goals and respond in character.
44. As a learner, stakeholders remember what I decided earlier in the run and react accordingly (a sponsor whose budget concern I ignored becomes less supportive).
45. As a learner, the scenario agent adjusts event difficulty and timing to my performance within limits set by the scenario author.
46. As a learner, the AI Assessor scores each key decision against the scenario's rubric and explains why. The score feeds `sim.module_scores` as decided in D14.
47. As a scenario author, I define stakeholder personas, rubric criteria and difficulty limits per scenario without a code change.
48. As a learner, every AI-generated event, message and score is recorded in the run history so it can be replayed and audited.
49. As the owner, Simulator AI features follow the plan's packaging (free tier limited, premium full) through the Phase 0 quota system.

## d) Implementation decisions

Decisions marked **(Agreed)** were confirmed by the owner in the 2026-10-19 interview. Settled facts from the codebase are marked **(Fact)**.

**Architecture**
- **D1 Model provider (Agreed 2026-10-19):** Anthropic only for text generation. Haiku 5.5 for routing, classification and simple answers; Sonnet 5.5 for multi-step agent work and drafting. Whisper stays for transcription. Gemini functions are retired once migrated.
- **D2 Agent runtime (Agreed 2026-10-19):** one Supabase Edge Function `agent-run`, using the official Anthropic TypeScript SDK tool runner. The agent loop and all data access stay in our infrastructure, and tools run with the caller's JWT. Managed Agents isn't used, because tools must run inside our RLS boundary.
- **D3 Tools (Agreed 2026-10-19):** read freely within the user's RLS scope, draft-only writes. Agents never update existing records, submit, approve, reject or delete.
  - **Tool registry:** in `packages/shared`, holding schemas plus metadata (read vs draft-write, catalogue entity, schema binding).
  - **Handlers:** tool handlers run in the edge function using supabase-js with the user's JWT.
  - **Draft-write tools** create rows in a draft/hold state only.
- **D4 Query runner (Agreed 2026-10-19):** a Postgres function `ai_run_query(spec jsonb)` (`SECURITY INVOKER`, so RLS applies) in `public` and `sim`. It accepts a structured query description (source, fields, filters, group-by, aggregates, sort, limit), checks every identifier against the data catalogue, builds SQL with `format('%I')` and bound values only, and runs read-only with `statement_timeout` and a row cap. The model never writes raw SQL.
- **D5 Data catalogue (Agreed 2026-10-19):** dedicated tables `ai_catalogue_entities` and `ai_catalogue_fields` in **both** `public` and `sim`, so the query runner never reads `admin` (rule 34.5).
  - `ai_catalogue_entities` holds the friendly name, description, default display field and on/off switch.
  - `ai_catalogue_fields` holds the label, description, data type, filterable / groupable / summable flags, allowed values and links to other entities.
  - Seeded by SQL for the Phase 1 entities (D9). Admin edits it only through permission-gated, audited `SECURITY DEFINER` RPCs. This is a **new narrow Admin→public/sim write exception** to be added to CLAUDE.md rule 34.5 (same pattern as v225/v227).
  - `database_tables` is unchanged. The model sees only the catalogue, never the raw schema.
- **D6 Quotas (Agreed 2026-10-19):** a monthly allowance in **AI credits** per subscription plan.
  - 1 credit is a fixed cost unit (e.g. $0.001 of model cost). Each run deducts credits from its actual tokens and model.
  - The allowance is set per plan in Admin (linked to `subscription_plans`), with per-organisation overrides and one-off top-ups.
  - At 80%, Account Owners / PMO Admins are warned in-app and by email.
  - At 100% it's a hard stop: new runs are blocked with a clear message and an upgrade/contact link. A run already in progress finishes, and non-AI features are unaffected.
  - Allowances reset on the organisation's billing-cycle date.
- **D7 Consent (Agreed 2026-10-19):** AI is **off** until an Account Owner / PMO Admin accepts the AI data-processing notice for the organisation.
  - The notice says what's sent (the question plus the query results needed to answer it), that data isn't used for training, and the retention period (D8).
  - Acceptance is recorded with who and when in `ai_settings.data_privacy_accepted_at`, plus an "accepted by" column.
  - Other users see who to ask. The organisation can switch AI off again in its settings. Admin's kill switch overrides everything.
  - The existing `ai_settings.ai_enabled DEFAULT TRUE` changes so that AI only runs once consent is recorded.
- **D8 Retention (Agreed 2026-10-19, fully configurable):**
  - **Defaults:** conversations (`ai_conversations` / `ai_messages`, question and answer text) are kept 12 months. Agent run audit rows (`agent_runs` / `agent_steps`) are kept 24 months **without** question/answer text, which is removed when the conversation is deleted or purged. A scheduled job purges expired rows.
  - **Configurable at three levels; nothing is hard-coded (rule 25.1):**
    1. **Admin global defaults:** the default periods for new organisations, plus the allowed minimum and maximum (e.g. 1–60 months), set in the Admin AI console.
    2. **Organisation setting:** an Account Owner / PMO Admin can change their organisation's two periods within the Admin min/max, in organisation AI settings. Changes are audited, and the success modal confirms them (rule 16).
    3. **Admin per-organisation override:** Admin can set any value, including outside the min/max, for contractual or legal-hold cases.
  - Shortening a period applies at the next purge run. The settings page warns how many conversations will be deleted before the change is saved.
  - Users can delete their own conversations at any time. Drafts an agent created follow their own register's lifecycle, not AI retention.

**Phase 1 scope**
- **D9 Catalogue entities for Phase 1 (Agreed 2026-10-19). Further modules are added later as Admin catalogue entries, with no code change:** projects, tasks/schedule, milestones, risks, issues, change requests, actions, decisions, lessons, stakeholders, budget/cost summaries, resources. Same set in `sim`.
- **D10 Ask Nidus UI (Agreed 2026-10-19):** upgrade both existing surfaces in place and rename them "Ask Nidus".
  - The floating `AIChatWidget` (mounted in `Layout.jsx`) handles quick questions and is aware of the current project.
  - The full-page `AIWorkspace` handles history, wide tables and charts, Save as report and export.
  - Both share `ai_conversations` / `ai_messages`, with an "Open in workspace" handoff.
  - The identical per-app copies (`apps/*/src/components/ai/`, `apps/*/src/pages/platform-app/AIWorkspace.jsx`) are merged into one shared copy (`components/shared-app/` per v1240), differing only in the `public`/`sim` service binding.
  - `SimAIWorkspace` keeps its learner-coaching role and adds Ask Nidus practice mode.
- **D11 Report Builder (Agreed 2026-10-19):** Report Builder moves onto the data catalogue and `ai_run_query`.
  - **Today:** Platform `/reports/builder` builds a browser-side `select('*')` with filters and sort only, and saves `grouping_config` but never applies it. Simulator's identical `ReportBuilder.jsx` is imported but not mounted in `simulatorRoutes.jsx`, and uses the generic `supabase` client.
  - **Change:**
    - Data sources come from the catalogue (friendly names; no raw system tables).
    - Grouping and totals (count, sum, average, minimum, maximum) are calculated in the database.
    - Ask Nidus "Save as report" writes a normal `report_templates` row that opens in Report Builder.
    - Report Builder is mounted in Simulator, bound to `sim` through one shared component.
  - Existing templates whose source isn't in the catalogue show a "not available — ask your admin" message instead of running.
- **D12 Status report target (Agreed 2026-10-19):** the agent drafts a **highlight report** (`public` v222 / `sim` v236 tables) for a chosen project and period.
  - **Content:**
    - narrative sections, each statement linked to its source records
    - proposed RAG values for time, cost and quality, each with a one-line reason the PM accepts or changes
    - child tables (risks, issues, change requests, decisions) pre-filled as links to existing records, not copies
  - **Lifecycle:** saved as a draft (rule 37). The PM edits and submits through normal approval (rule 53).
  - **Period:** defaults to the time since the last highlight report (or 14 days), and can be changed.
  - **Entry points:** "Draft with AI" on the highlight report page, or Ask Nidus.
  - Checkpoint reports are out of scope for Phase 1.
  - **Customisable layouts (owner requirement):** sections and fields can be added or removed to produce customised reports. The agent drafts whatever the applicable layout contains. Mechanism: D12a.
- **D12a Customisable report layouts (Agreed 2026-10-19). Versioning, publish, audit and Admin Global Template distribution come with the existing system, and checkpoint / end-stage reports can use the same pattern later:** reuse the existing template system instead of building a new one.
  - **Existing pieces:** the `pm_template_nodes` tiered library (pmo → portfolio → sub_portfolio → programme → project) and `form_templates` with per-organisation `form_template_field_additions` / `_overrides` / `_defaults`.
  - **New pieces:** a "Highlight report layout" template type in that library. A layout lists its sections (built-in or custom), their order, which fields are shown, and for each section an optional **AI drafting instruction** (e.g. "summarise supplier performance in 3 bullet points").
  - **Which layout applies:** inherited down the tiers (PMO default → programme → project), so the most specific layout wins.
  - **Custom fields:** custom sections and fields are stored with the report as values against the layout's section/field keys, so no table changes are needed per customisation.
  - **Editors:** PMO Admins / Account Owners edit organisation and PMO layouts. PMs can choose or adjust a layout for their project only if the PMO allows it.
  - **Parity:** the same in `sim`.

**Phase 2 scope**
- **D13 Meeting-to-Register (Agreed 2026-10-19):** extend the existing v409 staging tables and review queue (`comm_meeting_extracted_risks` / `_issues`, `comm_meeting_action_items`, in public + sim, statuses `pending_review → approved/rejected/enriched → created`). Don't replace them.
  - **Agent enrichment:**
    - duplicate check, which sets `risk_id` / `issue_id` and flags "possible duplicate of RSK-0042". Keyword-based until Phase 2b, then meaning-based.
    - suggested owner, from participants and project team
    - suggested due date for actions
    - register values mapped to the organisation's own lookups (rule 25.1)
  - **New table:** `comm_meeting_extracted_decisions` (public + sim), feeding `project_decisions`.
  - **Review screen:** one checklist per meeting (Actions / Risks / Issues / Decisions). Each item can be Accept / Edit / Reject, or "Add as update to existing record" for duplicates, which appends the note and source quote to that record's history.
  - Accepted items become **draft** records (D3). The success modal lists their display IDs, and each record links back to "raised in meeting X on date Y".

- **D26 Bulk Import Mapper (Agreed 2026-10-19):**
  - **Today:** about 20 separate bulk-upload flows exist, with no shared import component. Each template carries a rule 71 data dictionary (name, required, type, allowed values, aliases), which the mapper uses as its description of the target.
  - **Shared pieces:**
    - a `suggest_column_mapping` agent tool, given the target's data dictionary plus the source headers and **the first 20 rows only**
    - a shared `ColumnMappingStep` component in `@nidus/ui`
  - **Mapping table:** source column → suggested target field, with High/Medium/Low confidence, sample values, value conversions (e.g. "H/M/L" → the organisation's lookup values, date formats), and flags for required fields with no match.
  - **Confirmation:** the user confirms or changes every mapping before anything imports. The flow then continues into that page's existing validation and confirmation steps unchanged.
  - **Saved mappings:** stored per organisation and source in `import_column_mappings` (public + sim) and offered automatically when the same headers appear again.
  - **Pilot flows (Phase 2):** Stakeholders, Project Contacts, Test cases (bulk upload wizard), Schedule/task import. Other flows adopt it when next touched. No universal-wizard refactor.

**Phase 2b scope (vector search)**
- **D20 Where vector search sits (Agreed 2026-10-19):** a dedicated Phase 2b slice at the end of Phase 2. Not in Phase 1, not deferred to Phase 4. Phase 2a duplicate detection uses keyword matching until 2b ships.
- **D21 Storage (Agreed 2026-10-19):** the `pgvector` extension in the existing Supabase database. An `embedding vector(n)` column, plus content hash and embedded-at columns, on `public.search_index` and its `sim` equivalent, with an HNSW index. No separate vector database, because tenant isolation stays in Postgres RLS.
- **D22 Embeddings provider (Agreed 2026-10-19):** Supabase's built-in edge-runtime embedding model (`gte-small`, 384 dimensions). The model name and dimension are stored with each embedding so the model can be swapped later through a background re-embed.
  - *For:* no extra provider, no extra API key, no per-call cost, and text never leaves our infrastructure.
  - *Against:* English only, and lower quality than commercial models. That's acceptable for duplicate detection and lessons search in English (D18).
  - *Alternative:* a commercial embeddings API (e.g. Voyage AI). Better quality, but a fourth provider, a small per-token cost, and text leaves our infrastructure.
- **D22a Multilingual meaning search (Agreed 2026-10-19):** Phase 2b launches on `gte-small` (English). Phase 2b also includes a **feasibility spike**: an open multilingual embedding model (e.g. the multilingual-e5 family) run inside Supabase edge functions, measured for quality on the translated near-duplicate set, speed and memory limits.
  - **If the spike passes:** switch models through the background re-embed (D22/D24). Same single provider, no per-call cost, data stays in-house.
  - **If it fails:** the owner chooses between a commercial multilingual embeddings API (which would require a D7 consent-notice update) or staying English-only.
  - Until then, non-English records remain findable by keyword search. The Admin console shows each organisation's share of non-English content.
- **D23 Content embedded in 2b (Agreed 2026-10-19):** 9 record types in public + sim. Each `search_index` row embeds one combined text, not every column:
  1. Risks: title + description + cause/effect
  2. Issues: title + description
  3. Actions: title + description
  4. Decisions: title + rationale
  5. Lessons: title + description + recommendation
  6. Meeting summaries: summary text only. Full transcripts are excluded.
  7. Daily log entries: entry text
  8. **Delay log** (`project_delays`): title + description + `delay_cause` + `impact_scope` + `responsible_party` + `resolution_plan`. Supports "similar past delays" and lessons-style questions.
  9. **Schedule tasks** (`tasks`): `task_name` + `task_description` + `notes` + the task's **outline path** (e.g. "Delivery > Data migration > Load test data"). The path gives short, repetitive task names enough context to be meaningful. Volume (hundreds of tasks per imported plan) is handled by the background queue (D24) and costs nothing extra with `gte-small`. Structured schedule questions (late, critical, % complete) still go to the query runner.
- **D24 Embedding pipeline (Agreed 2026-10-19):**
  1. Record changes update `search_index` (Phase 1 triggers).
  2. A content-hash change marks the row for embedding.
  3. A scheduled edge function (every ~2 minutes) embeds waiting rows in batches.
  4. Failures retry up to 3 times, then show in the Admin console.

  Embedding never blocks a user's save.
- **D25 Ranking (Agreed 2026-10-19):** hybrid ranking that merges full-text and vector results with reciprocal rank fusion, after the access filter has been applied.

**Phase 3 scope**
- **D14 AI Assessor (Agreed 2026-10-19):** advisory first, then it counts once calibrated.
  - **Rubrics:** scenario authors define criteria (weight + descriptor per score level) per scenario or module.
  - **Scoring:** Sonnet 5.5 scores the learner's actual artefacts and messages at key decision points and at run end, with evidence-linked reasons.
  - **Storage:** a new `sim.ai_assessments` table, separate from `sim.module_scores`. It's shown as "AI Assessor feedback" beside the existing score, and the `ai-simulator-debrief` function is upgraded to use it.
  - **Calibration:** per scenario, over e.g. 30 runs, authors compare AI scores with their own judgement in an author view. The agreement threshold is set in the plan.
  - **Switch-over:** once calibrated, an author can switch a scenario to "Assessor counts toward score" with a weight (e.g. 30%). Certificates use AI scores only for switched-over scenarios.
  - **Learner flags:** learners can flag assessments they disagree with, and flags feed calibration.
- **D15 AI stakeholders (Agreed 2026-10-19):** extend the existing NPC tables (`sim.npc_characters`, `npc_run_assignments`, `npc_user_messages`, `npc_autonomous_actions`, `npc_event_templates`).
  - **Persona:** `npc_characters` gains goals, concerns, priorities and red lines, editable by scenario authors.
  - **Memory:** a new `sim.npc_run_memory` table (per NPC per run) holds the trust score (−100 to +100), a running summary and remembered key decisions linked to the learner's artefacts. It's updated after each interaction. No cross-run memory.
  - **Replies:** Haiku 5.5 writes in-character replies from persona + memory + run state into `npc_response`.
  - **Deterministic engine:** event selection, timing, escalation and health impacts stay rule/template driven. AI wording never changes run numbers.
  - **Consequences:** low trust speeds up escalation through the existing `escalation_template_code` path.
- **D27 Adaptive scenario agent (Agreed 2026-10-19):** difficulty is **rule-based**.
  - A performance band (struggling / on track / excelling) is calculated from health, module scores, trust (D15) and Assessor results (D14).
  - The band adjusts the existing template controls (`weight`, severity cap, `cooldown_days`, escalation speed), always within the scenario author's min/max difficulty.
  - Haiku 5.5 only rewrites the chosen template's title/description to reference the learner's actual run artefacts. Options, impacts and scoring are never changed.
  - Every adjustment is logged in the run history with its reason.
  - The browser-side `openaiService.js` / `aiEventGeneratorService.js` free-form event generation is retired.

**Cross-cutting**
- **D16 Project Planner edition (Agreed 2026-10-19):** **full Ask Nidus in the Planner, limited to schedule, resources and dependencies**, delivered in Phase 1 alongside Platform/Simulator.
  - **Catalogue scope:** a per-entity edition flag on `ai_catalogue_entities` (e.g. `editions TEXT[]` = `{platform,planner}`). Planner sessions see only:
    - schedule: `tasks`, milestones, `project_baselines`
    - resources: `resources`, `resource_assignments`, `task_assignments`
    - dependencies: `task_dependencies`
    - the project record itself, for context

    `ai_run_query` rejects any other entity when the account's `product_edition = 'planner'`, enforced server-side, not just hidden in the UI.
  - **Database wall:** the AI tables Ask Nidus needs (`ai_conversations` / `ai_messages` / `ai_feedback`, `ai_settings`, `agent_runs` / `agent_steps`, the catalogue tables, the credit ledger) are added to the Planner allow-list by regenerating it (`scripts/generate-planner-table-allowlist.mjs --write`), then re-running `v1251_planner_table_wall.sql`. Every other new AI table stays walled (fail-closed).
  - **UI:** the shared Ask Nidus widget and workspace (D10) are mounted in `apps/planner`. Save as report, the Status Report agent, Meeting-to-Register and meaning search are **not** in the Planner for Phases 0–3.
  - **Quotas and consent:** see D16a. `planner_plan_limits` already has `max_ai_drafts` (NULL = fair use).
- **D16a Planner AI allowance and consent (Agreed 2026-10-19):** the same AI credit system as D6.
  - `planner_plan_limits` gains `monthly_ai_credits`, editable in Admin and shown on the public pricing page. `max_ai_drafts` is retired after a one-time mapping. Admin per-account overrides and top-ups work as in D6.
  - **Trial:** a small fixed allowance for the 14-day trial (e.g. about 100 questions). After expiry, Ask Nidus goes read-only with the account: history stays visible, and new questions show an upgrade prompt.
  - **Paid:** credits **per seat, pooled at account level** (allowance = credits per seat × paid seats), so the allowance grows with revenue. 80% warning and hard stop at 100% as in D6.
  - **Consent:** the Planner account owner accepts the AI notice once, as in D7. Invited users see "ask your account owner".
- **D17 Admin AI console (Agreed 2026-10-19):** a new federated Admin module `modules/ai`, "AI Centre" (rule 34.5), not a tab in an existing module.
  - **Pages:**
    - Overview: usage and cost dashboard with clickable cards (rule 64)
    - Organisations: enablement, overrides, top-ups, retention overrides
    - Plans & Credits: Platform and Planner plans
    - Models & Routing
    - Data Catalogue
    - Meaning Search: queue, failures, re-embed
    - Assessor Calibration oversight
    - Settings: kill switch, retention defaults and min/max
  - **Setup:** scaffolded from `modules/_template`, with its own CI workflow (`.github/workflows/admin-ai.yml`), a unique port, a `DEV_MODULES.md` row, registration in `shell/src/moduleConfig.js`, a `<ModuleErrorBoundary>` and an Admin menu entry.
- **D18 Language (Agreed 2026-10-19): several named languages supported for AI answers from Phase 1.**
  - **Language list comes from the database:** supported AI languages are the active rows in the existing `public.languages` / `sim.languages` tables (today: English US/UK, French, Spanish, German, Portuguese (Brazil), Italian) with a new `ai_supported` flag that Admin can toggle (rule 25.1). Nothing is hard-coded.
  - **Answer language:**
    - Ask Nidus answers in the language of the question.
    - When unclear (e.g. a one-word question), it uses the user's saved `users.language_code`, which the header language switcher already writes.
    - Agent drafts (status reports, meeting proposals, NPC replies) use the user's saved language. A report draft can also follow the organisation's default report language if one is set.
  - **Data stays as entered:** record content is never machine-translated in the database. Answers quote record text in its original language.
  - **Catalogue:** descriptions are written in English. The model uses them to answer questions in any supported language, so no per-language catalogue is needed.
  - **UI chrome stays English:** full UI translation remains deferred and separate (2026-09-30 decision). Only AI-generated text is multilingual. Fixed AI UI messages ("AI isn't enabled…", quota warnings) are translated through the same DB-driven approach as v762 form-label translations.
  - **Testing:** the core eval set (about 50 English questions) gains a translated subset (about 15 questions per supported language), with a per-language pass threshold set in the plan.
  - **Conflict with D22:** `gte-small` embeddings are English-only, so Phase 2b meaning search would not cover the other languages. Resolution: D22a.
- **D19 Menus and entry points (Agreed 2026-10-19):** all menu changes are made by SQL (rule 25.1).
  - **Rename:** Simulator's `sim_pm_ai` / `sim_learner_ai` "AI Workspace" (`/simulator/ai-workspace`) becomes **"Ask Nidus"**. Platform gets an equivalent DB menu row for `/ai` if missing, granted to the roles that have the AI Assistant today (rule 13).
  - **Planner:** the Ask Nidus item is added to `planner_menu_allowlist`, and the floating widget is mounted in `apps/planner`.
  - **Agents are in-page buttons, not menus:**
    - "Draft with AI" on the highlight report page
    - "File to registers" on the meeting page
    - "Suggest mapping" in the 4 pilot bulk-upload flows
    - "Ask Nidus about this" on register pages, which opens the widget scoped to that register and project
  - **AI Settings** (consent, on/off, retention within limits, usage meter): a new page under the existing Account / Organisation Settings menu, for Account Owner / PMO Admin.
  - **Highlight report layouts** (D12a): inside the existing template library menus.
  - **Admin:** an "AI Centre" menu entry (D17).
  - **Taxonomy:** additive lines only, "Ask Nidus (v1272)" and "AI Settings (v1272)", with existing entries untouched (rule 70).
- **Version numbering (Fact):** this initiative is **v1272**. Later SQL files take the next free numbers in run order (memory: one version per SQL file). Admin SQL starts after Admin `v234`.

## e) Testing decisions

- **Query runner (main seam):** SQL tests in `SQL/v12xx_*_tests.sql`, same style as `v1265_*_tests.sql`, prove:
  - RLS isolation: user A can't see organisation B's rows through `ai_run_query`
  - identifiers not in the catalogue are rejected
  - injection attempts in values and identifiers fail safely
  - row cap and timeout are enforced
  - aggregates match direct SQL
- **Tool registry:** Vitest unit tests for each tool's input validation and its mapping to `ai_run_query` specs.
- **Agent runtime:** tests with a fake model client that replays scripted tool calls, so loop, quota, audit-row writing, kill switch and error paths are tested without paying for model calls.
- **Answer quality (eval set):** a fixed set of about 50 representative questions with expected query descriptions and answers against seeded demo data (rule 18.2 seed), run before each release. The pass threshold is set in the plan.
- **Draft-only guarantee:** tests asserting Phase 2 tools can create only draft-state rows and never change records in the `approved` state.
- **Quotas:** tests for the 80% warning, the 100% block and Admin top-ups.
- **Meaning search (2b):** SQL tests proving:
  - organisation isolation: user A never gets organisation B's rows from a similarity query
  - deleted records drop out of results
  - an exact reference match ranks first in hybrid results
  - a changed content hash puts the row back in the embedding queue

  Plus a small labelled set of near-duplicate pairs (e.g. "supplier delay" vs "vendor late delivery") with a recall threshold set in the plan, and a test that a failed embedding is retried and shown in the Admin console.
- **Parity:** every test runs against both `public` and `sim` bindings.
- **Security review:** `REVIEW.md` security gate on each phase, with particular focus on edge function auth and the query runner.
- **Done means:** each phase's user stories pass, the eval set passes its threshold, the security gate passes, and usage is visible in the Admin console.

## f) Out of scope

- Phase 4 proactive/scheduled agents (RAID Watch, Portfolio Analyst, Stage Gate Readiness, Change Impact). These are a later PRD.
- Meaning search over content beyond D23 (e.g. full document/attachment text, PDF contents, task notes). Possible later extensions of Phase 2b.
- Cross-organisation or global semantic search (e.g. lessons shared across tenants).
- Raw-SQL access for the model or for users.
- Agents that approve, submit or delete records.
- Automatic actions without a user present (all Phase 0–3 runs are started by a user).
- Admin-side internal agents (support triage, error triage, content). Only the Admin AI governance console is in scope.
- Full UI chrome translation (still deferred). AI-generated text is multilingual per D18.
- In the Project Planner edition: everything except Ask Nidus over schedule, resources and dependencies (D16). That includes catalogue entities outside that scope, Save as report, Status Report, Meeting-to-Register, the Import Mapper and meaning search.
- Billing integration for buying AI credit top-ups through Paynow. Phase 0 provides allowances and Admin-granted top-ups only.

## g) Further notes

- **Known gap — `search_index` isn't populated.** The v643 table and its `tsvector` trigger exist, but no SQL inserts entity rows into it. Story 20 depends on adding index triggers or backfill for the Phase 1 entities. That's a scoped sub-slice in the plan. Phase 2b also depends on it, because embeddings are stored on the same rows.
- **Phase 2b dependency chain:** Phase 1 `search_index` population → Phase 2b embedding column and pipeline → hybrid search tool in the agent registry → Meeting-to-Register switches from keyword to meaning matching. Confirm during planning that `pgvector` is enabled on the Supabase project (`CREATE EXTENSION IF NOT EXISTS vector`).
- **Simulator Report Builder (confirmed):** imported but not mounted in `simulatorRoutes.jsx`. Mounting it is part of D11.
- **Pre-existing security findings to close in Phase 0:** unauthenticated AI edge functions; browser-side `VITE_OPENAI_API_KEY` references (no key currently set, so those paths fall back to templates).
- **Cost model (estimates, to be replaced by Phase 0 measurements):**
  - about $0.001 per simple question (Haiku 5.5)
  - about $0.03 per multi-step question (Sonnet 5.5)
  - about $0.10–0.15 per status report draft
  - about $1–7 per heavy user per month
  - Prices as of 2026-10-06 (Haiku 5.5 $0.10/$0.50, Sonnet 5.5 $2/$10 per 1M tokens in/out). Prompt caching and the Batch API reduce this.
- **Selling points this enables:**
  - "Ask any question about your portfolio, then save it as a report."
  - "AI drafts, you approve: AI with governance."
  - "A flight simulator for project managers, with AI stakeholders."
- **Naming:** agent and feature names must avoid trademarked terms (rules 26–27).
- **Rules this work must apply:** 16/16.1 (success modal, display IDs), 25/25.1 (no hardcoded menus or options; catalogue and model lists come from the DB), 28.1 (theme-aware), 34.x (three-app parity), 37 (drafts), 38 (exports), 42 (RLS), 53 (approvals), 63.1 (Audit tab on new record forms such as catalogue entries), 64 (clickable usage cards), 65 (routed pages, not modals, for new record surfaces), 66 (performance), 70 (taxonomy).
