# v1272 — AI agents foundation (Phases 0–3) — Implementation plan

**PRD:** `projectprd/v1272_ai_agents_foundation_PRD.md` (decisions D1–D27 agreed 2026-10-19)
**Status:** approved and in build. Phase 0–1 code complete (audited 2026-10-19, see "Build audit" below); Phase 2, 2b and 3 in progress. **No SQL has been run yet** — every phase gate still needs the owner to run the SQL and try the slice.
**Apps:**
- Platform (`public`) and Simulator (`sim`): same change in the same slice (rule 34.1).
- Project Planner: Ask Nidus only (D16).
- Admin (`E:\project-nidus-admin`): new `modules/ai` "AI Centre" (D17).

**Principle:** thin vertical slices. Each slice is tested and usable end-to-end before the next one starts. Each phase ends with an owner check-in (run the SQL, try the slice, approve the next phase).

---

## Files

### Edge functions (`supabase/functions/`)
| File | Change |
|---|---|
| `_shared/auth.ts` (new) | Verify the caller's JWT and build a supabase client **as that user** (RLS applies). Reject with 401 otherwise. Replaces CORS `*` with the app origins. |
| `_shared/anthropic.ts` (new) | One Anthropic client (official TS SDK). Reads model routing (routing / quick / agent) from `ai_platform_settings`, so there are no model IDs in code. Prompt caching on system prompt + tools. Refusal handling. |
| `_shared/aiGate.ts` (new) | Before every run: kill switch → organisation consent/enabled → edition scope → credit balance (D6/D16a). After every run: write `agent_runs` / `agent_steps` and deduct credits. |
| `_shared/ai/tools/*` (new) | Tool registry (D3): `query_records` (→ `ai_run_query`), `search_records` (keyword, later hybrid), `get_record`, `draft_highlight_report`, `propose_meeting_items`, `suggest_column_mapping`. Each tool has a JSON schema, a read/draft-write flag and a `public`/`sim` binding. |
| `agent-run/` (new) | The agent loop: SDK tool runner, streaming progress events, conversation history from `ai_messages`. |
| `ai-chat`, `ai-data-summary`, `ai-docs`, `ai-knowledge` | Phase 0: auth + Anthropic. Phase 1: folded into `agent-run`, then deleted. |
| `ai-simulator-hint`, `ai-simulator-debrief`, `meeting-ai-extract`, `plan-ai-generate` | Phase 0: auth + Anthropic. Debrief is upgraded in S3.3. |
| `ai-embed/` (new, 2b) | Cron batch embedding with Supabase built-in `gte-small` (D22/D24). |
| `sim-ai-npc/` (new, P3) | NPC replies, memory update and event text personalisation (D15/D27). |
| `sim-ai-assess/` (new, P3) | Rubric scoring (D14). |

### SQL — monorepo `SQL/`, explicit run order
Each file gets its own number (memory: SQL file versioning). `_tests` / `_rollback` / `_seed` companions share their migration's number. Numbers are re-checked against the highest existing file before each is written.

| # | File | Contents (both `public` and `sim` unless stated) |
|---|---|---|
| 1 | `v1272_ai_governance_core.sql` + `_tests` | **Tables:**<br>• `agent_runs`, `agent_steps`<br>• `ai_credit_ledger` (allowance, top-up and usage rows)<br>• `ai_platform_settings` (singleton: kill switch, model routing, credit unit, retention defaults and min/max)<br><br>**Column additions:**<br>• `ai_settings`: `accepted_by`, `conversation_retention_months`, `audit_retention_months`, `report_language_code`, admin override columns<br>• `ai_enabled` now only counts once consent is recorded<br>• `subscription_plans.monthly_ai_credits`<br>• `planner_plan_limits.monthly_ai_credits` (public only)<br>• `languages.ai_supported`<br><br>**Functions:** `ai_org_status()` (enabled / consent / balance / warning level) and `ai_record_usage()`.<br><br>**Also:** RLS, `database_tables` rows, re-run of the Planner wall. |
| 2 | `v1273_ai_retention_purge.sql` | `ai_purge_expired()` + pg_cron daily job. Uses each org's periods, nulls question/answer text on retained audit rows. |
| 3 | `v1274_ai_catalogue.sql` + `_tests` | `ai_catalogue_entities` (incl. `editions TEXT[]`), `ai_catalogue_fields`. RLS: read for authenticated; writes only via Admin RPCs. |
| 4 | `v1275_ai_catalogue_seed.sql` | Required config: the 12 D9 entities and their fields. Planner editions on schedule/resource/dependency entities. |
| 5 | `v1276_ai_run_query.sql` + `_tests` | `ai_run_query(spec jsonb)` `SECURITY INVOKER`. Catalogue-checked identifiers, `format('%I')`, bound values, `SET LOCAL statement_timeout`, read-only, row cap, edition check (D4/D16). Tests: RLS isolation, injection, unknown identifiers, caps, aggregates = direct SQL, Planner scope. |
| 6 | `v1277_search_index_population.sql` + `_tests` | Triggers upserting `search_index` rows for the D9 entities + delay log + daily log, plus a backfill. Creates `sim.search_index` if it doesn't exist (verify first). |
| 7 | `v1278_report_templates_query_spec.sql` | `report_templates.query_spec jsonb` (both schemas; create `sim.report_templates` if missing) for Save as report and Report Builder. |
| 8 | `v1279_highlight_report_layouts.sql` | "Highlight report layout" template type in the template library (D12a). `highlight_reports.layout_node_id`, `custom_values jsonb`, `ai_provenance jsonb` (statement → source records), `ai_proposed_rag jsonb`. PMO switch "projects may adjust layout". |
| 9 | `v1280_ask_nidus_menus.sql` + `_rollback` | Rename `sim_pm_ai` / `sim_learner_ai` → "Ask Nidus". Platform `/ai` menu row + role grants. AI Settings page menu row (Account/Organisation Settings). `planner_menu_allowlist` row. |
| 10 | `v1281_meeting_register_agent.sql` + `_tests` | `comm_meeting_extracted_decisions`. Enrichment columns on the v409 staging tables (`duplicate_of_id`, `duplicate_score`, `suggested_owner_id`, `suggested_due_date`, `mapped_values jsonb`). Draft-only promotion RPC. |
| 11 | `v1282_import_column_mappings.sql` | `import_column_mappings` (org, source signature, target template, mapping jsonb). |
| 12 | `v1283_search_index_embeddings.sql` + `_tests` | `CREATE EXTENSION IF NOT EXISTS vector`. `embedding vector(384)`, `content_hash`, `embedding_model`, `embedded_at`, `embed_attempts`, `embed_error`. HNSW index. `ai_hybrid_search()` (access filter first, then RRF). Text builders for the 9 D23 types (task outline path included). |
| 13 | `v1284_ai_embed_cron.sql` | pg_cron every 2 minutes → `ai-embed`. |
| 14 | `v1285_sim_npc_ai.sql` | `sim` only: persona columns on `npc_characters`, `npc_run_memory`. |
| 15 | `v1286_sim_ai_assessor.sql` + `_tests` | `sim` only: `scenario_rubrics`, `ai_assessments`, `ai_assessment_flags`, `ai_assessment_calibration`, scenario `assessor_counts` + `assessor_weight`. |
| 16 | `v1287_sim_adaptive_difficulty.sql` | `sim` only: scenario min/max difficulty, `run_difficulty_log`. |
| 17 | `v1288_sim_ai_plan_credits.sql` | Added in build (S3.4): `public.ai_simulator_plan_credits`; `ai_account_allowance` also reads the owner's Simulator plan. |
| — | `v1281_*_rollback.sql`, `v1283_*_tests.sql` | Companions added in build. |

No new table exposes a human-readable reference column, so no Admin ID Generation rules are needed (rule 16.2). If one is added during build, the rule 16.2 checklist applies.

### SQL — Admin `E:\project-nidus-admin\SQL\`
| # | File | Contents |
|---|---|---|
| A1 | `v235_ai_centre_nav_permissions.sql` | `ai.*` permissions, `admin.nav_nodes` entries for AI Centre pages, role grants. |
| A2 | `v236_ai_centre_admin_rpc.sql` | `public.admin_ai_*` / `sim.admin_ai_*` `SECURITY DEFINER` RPCs covering:<br>• kill switch, routing, retention defaults<br>• plan credits, org overrides, top-ups<br>• the usage read views<br><br>Each RPC is gated by `admin.check_admin_permission()` and logged via `admin.log_admin_action()`. |
| A3 | `v237_ai_catalogue_admin_rpc.sql` | Catalogue edit RPCs (D5). |
| A4 | `v238_ai_embedding_admin_rpc.sql` | Queue stats, failures, re-embed per org (2b). |
| A5 | `v239_sim_ai_authoring_admin_rpc.sql` | Added in build (P3): rubrics, scenario AI settings (switch-over gated on calibration), calibration, flag review, personas; permission `ai.simulator.author`; nav "Stakeholder Personas". |
| A6 | `v240_ai_simulator_plan_credits_admin_rpc.sql` | Added in build (S3.4): Simulator plan credits; `admin_ai_list_plans` returns them. |

### Frontend
| Area | File(s) | Change |
|---|---|---|
| Shared logic | `packages/shared/src/ai/` (new) | Streaming client for `agent-run`, answer/result types, `useAiStatus` reader (pure part), language resolution. |
| Shared UI | `packages/ui/src/ai/` (new) | `AiResultTable` (row numbers, display-ID links, `ExportListMenu`), `AiQueryExplanation`, `AiProgress`, `AiQuotaBanner`, `ColumnMappingStep`. |
| App UI (both apps, identical) | `apps/*/src/components/shared-app/ai/` | `AskNidusWidget`, `AskNidusWorkspace`, merged from the duplicate `components/ai/*` and `pages/platform-app/AIWorkspace.jsx`. App binding in `apps/*/src/lib/aiService.js`. Old copies removed. |
| AI Settings | routed page in both apps (rule 65) | Consent, on/off, retention within min/max (with deletion-count warning), usage meter, success modal, Audit tab (rule 63.1). |
| Report Builder | shared component in `apps/*/src/components/shared-app/reports/` | Catalogue sources, `ai_run_query` run, grouping/totals. Mounted in `simulatorRoutes.jsx`. |
| Highlight report | existing highlight report page (locate in Platform + Simulator) | "Draft with AI", period picker, per-section provenance, RAG proposals, layout-driven sections. |
| Layout editor | existing template library | "Highlight report layout" type editor: sections, fields, order, AI instruction. |
| Meetings | `communications-module` meeting page | "File to registers" + review checklist. |
| Bulk upload | Stakeholders, Project Contacts, Test bulk upload wizard, Schedule import | `ColumnMappingStep` before existing validation. |
| Planner | `apps/planner` | Mount the widget and workspace. Edition-scoped catalogue. |
| Simulator | NPC message UI, run history, debrief, scenario authoring (locate) | Persona/memory replies, trust indicator, Assessor feedback, flags, calibration view, rubric + difficulty authoring. |
| Admin | `E:\project-nidus-admin\modules\ai\` (new, port **5199**) | Overview, Organisations, Plans & Credits, Models & Routing, Data Catalogue, Meaning Search, Assessor Calibration, Settings. `.github/workflows/admin-ai.yml`, `DEV_MODULES.md`, `shell/src/moduleConfig.js`, `<ModuleErrorBoundary>`. |

### Docs and control files
- `Documentation/AI_Agents_v1272_Guide.md`: user + admin guide and a blog summary per phase (rules 21–22).
- `E:\project-nidus-admin\Documentation\AI_Centre_v1272_Guide.md`
- `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md`: additive lines only (rule 70).
- `CLAUDE.md` rule 34.5: new narrow write exception for the A2–A4 RPCs, and the same note in the Admin `CLAUDE.md`.
- `ROADMAP.md`: milestone status at the end of each phase (strategic change).

---

## Tasks

### Phase 0 — Hardening and governance
- [x] **S0.1 Locked-down AI calls (tracer: `ai-chat`).**
  - [x] Build `_shared/auth.ts` + `_shared/anthropic.ts` (plus `_shared/http.ts`: CORS from the `ALLOWED_ORIGINS` secret).
  - [x] Move `ai-chat` to the signed-in user + Anthropic. The client sends the session JWT. (`ai-chat` was then folded into `agent-run` in S1.2.)
  - [x] Unsigned requests get a 401 (`requireUser()`).
  - [x] Repeat for the other 7 text functions (`ai-simulator-hint`, `ai-simulator-debrief`, `meeting-ai-extract`, `plan-ai-generate`, `whisper-transcribe`, new `ai-insights`, new `status-report-agent`). No Gemini code is left in `supabase/functions`.
  - [x] Remove the browser `VITE_OPENAI_API_KEY` code paths: `openaiService.js` and `aiEventGeneratorService.js` deleted in both apps; `eventEngineService.js`, `HintsPanel.jsx` and `SimulationRunEnhanced.jsx` now use templates only until S3.2.
  - [x] Unit tests for the gate and credit logic (`_shared/ai/__tests__/credits.test.js`). Auth rejection itself is a Deno-only path; covered by the REVIEW.md security check at the gate.
- [x] **S0.2 Governance core.**
  - [x] SQL #1 (`v1272_ai_governance_core.sql` + `_tests`). Also fixes two existing `ai_settings` RLS bugs.
  - [x] Gate wired into every AI function through `_shared/aiRun.ts` (`startAiRun` → `finish`), which replaces the planned `aiGate.ts`: kill switch, consent, credits, `agent_runs` / `agent_steps` rows, ledger deduction.
  - [x] Fake-model tests (`agentLoop.test.js`, `credits.test.js`): blocked states, 80% warning, ledger maths.
- [x] **S0.3 Organisation AI Settings page** (both apps + Planner). `@nidus/ui/ai/AiSettingsPage.jsx`, routed at `/platform/organisation/ai-settings`, `/simulator/organisation/ai-settings`, `/app/settings/ai`. Consent, on/off, retention with deletion-count warning (`ai_purge_preview`), usage meter, success modal, Audit tab. `AiAccessNotice` (the planned `AiQuotaBanner`) shows the "ask your Account Owner" / credits / kill-switch states in every Ask Nidus surface.
- [x] **S0.4 Admin AI Centre skeleton.** `modules/ai` (port 5199; `_template` moved to 5299 so `dev:full` doesn't clash), A1 + A2 SQL, shell registration (routes, remotes, moduleConfig, moduleRegistry), `DEV_MODULES.md`, `.github/workflows/admin-ai.yml`, `kill-dev-ports.js`. Pages: Overview (clickable count cards → Runs / Organisations), Runs, Organisations + organisation detail (overrides, retention override, top-ups, Audit tab), Plans & Credits (Platform per organisation, Planner per seat), Models & Routing, Settings (kill switch, credits, retention defaults and min/max, safety limits, Audit tab). Services: `packages/shared/src/aiCentreServices.js` (+ 12 tests). Admin `AdminCard`, `inputClass`, `AdminField` and the confirm-reason box are now theme-aware (dark look unchanged).
- [x] **S0.5 Retention and notices.**
  - [x] SQL #2 (`v1273_ai_retention_purge.sql`, pg_cron 02:30 UTC).
  - [x] 80% warning email via `send-email`, once per billing period (`aiRun.ts` → `maybeSendWarning`).
  - [x] Translated fixed AI messages in `public.ai_ui_messages` (v762-style, DB-driven).
- [ ] **Phase 0 gate.** Owner runs SQL #1–2 and A1–A2, sets plan credit allowances in Admin, accepts consent for a test org, and confirms.

### Phase 1 — Runtime, Ask Nidus, Report Builder, Planner, Status Report
- [x] **S1.1 Catalogue + query runner (no UI).**
  - [x] SQL #3–5 with tests (`v1274`, `v1275`, `v1276` + `_tests`). Registers are exposed through curated `security_invoker` views (`ai_v_*`) so RLS still applies.
  - [x] A3 (`v237_ai_catalogue_admin_rpc.sql`) + Admin Data Catalogue pages (register list with AI-language switches, register editor with field editing and Audit tab).
  - [x] **Verified:** edge functions only bundle code inside `supabase/functions`, so the tool registry is in `supabase/functions/_shared/ai/tools.js`, not `packages/shared` (deviation from D3's location, noted in the file header).
- [x] **S1.2 Ask Nidus workspace.**
  - [x] `agent-run` with `query_records`, `search_records` and `search_help_docs`, plus the merged `AskNidusWorkspace` (`@nidus/ui/ai`, used by all three apps).
  - [x] Results: streaming progress, query explanation, `AiResultTable` with export, row numbers and display-ID links.
  - [x] All 12 D9 entities (+ baselines and task dependencies for D16; delay log seeded off).
  - [x] Follow-up questions (last 10 turns of history) and thumbs up/down feedback.
  - [x] Retired `ai-chat` / `ai-data-summary` / `ai-docs` / `ai-knowledge` (deleted, with the old per-app `components/ai/*`, `AIWorkspace.jsx`, `aiAssistantService.js`, `aiSettingsService.js` and their tests).
  - Deviation: the loop is a manual Messages API loop (`_shared/ai/agentLoop.js`) rather than the SDK tool runner (D2), so every step can be audited, checked and streamed.
- [x] **S1.3 Widget + shortcuts.**
  - [x] Merged `AskNidusWidget`: project-aware, conversation history, "Open in workspace".
  - [x] "Ask Nidus about this" (`@nidus/ui/ai/AskNidusAboutButton.jsx`) on the Risk, Issue, Stakeholder and Decision register pages, both apps (+ test).
  - [x] Save as report (SQL #7, `v1278`; also turns on RLS for `report_templates`, which had none).
- [x] **S1.4 Report Builder on the runner.** `@nidus/ui/reports/CatalogueReportBuilder.jsx` replaces both apps' `ReportBuilder.jsx`; catalogue sources, grouping/totals in the database, "not available" state, Audit tab; mounted at `/simulator/reports/builder`.
- [x] **S1.5 Keyword search.** SQL #6 (`v1277`: triggers, backfill, `sim.search_index`, `ai_search_records`) and the `search_records` tool. Also fixes the v643 read policy that let every user read every tenant's index rows.
- [x] **S1.6 Planner Ask Nidus.**
  - [x] Edition scope enforced in `ai_run_query` (`AIQ_EDITION`) and in `toolsFor('planner')`.
  - [x] Planner allow-list regenerated (`--write`, 2026-10-19: +12 AI tables); owner re-runs `v1251` at the gate.
  - [x] Planner credits (`planner_plan_limits.monthly_ai_credits`, per seat pooled, trial credits) and account-owner consent in SQL #1.
  - [x] Widget and workspace mounted in `apps/planner` (`/app/ask`, `/app/settings/ai`).
  - [x] Out-of-scope answer (`NOT_IN_EDITION` tool result → short explanation).
- [x] **S1.7 Highlight layouts + Status Report agent.**
  - [x] SQL #8 (`v1279`) and the layout pages (`ReportLayoutsPage`, `ReportLayoutEditor`, both apps).
  - [x] `status-report-agent` + `DraftWithAiButton` on the Platform highlight report create page and the Simulator practice highlight report page: period, layout sections, provenance, RAG proposals, "needs your input".
  - [x] Saves a draft only.
- [x] **S1.8 Languages, menus, eval.**
  - [x] Answer-language resolution (question language, else `users.language_code`, from `languages`).
  - [x] SQL #9 (`v1280` + rollback) + taxonomy section 24.
  - [x] Eval set `scripts/ai-eval/askNidusEvalSet.json`: 50 English questions (incl. out-of-catalogue and 2 prompt-injection cases) + 15 per other AI language (fr, es, de, pt-BR, it). Ground truth is computed by running each question's expected spec through `ai_run_query` as the eval user, so it works on any seeded demo data. Runner `scripts/ai-eval/run-ask-nidus-eval.mjs`; scoring `evalScoring.mjs` (+ 12 tests).
  - [ ] **Run the eval** (needs deployed functions + a demo org): ≥ 90% English, ≥ 85% per other language. Owner task at the Phase 1 gate.
- [ ] **Phase 1 gate.** Owner runs SQL #3–9, A3 and the Planner wall. Owner tries Ask Nidus in all three apps and a status report draft, runs the eval, and confirms.

### Phase 2 — Agents that write drafts
- [x] **S2.1 Meeting-to-Register.**
  - [x] SQL #10 (`v1281_meeting_register_agent.sql` + `_tests` + `_rollback`): `comm_meeting_extracted_decisions`, enrichment columns on all staging tables, `comm_meeting_record_updates`, `comm_user_can_file_meeting(_sim)`. Filing is no longer organiser-only: participants and people with access to the meeting's project (Simulator: the run owner) can file.
  - [x] Edge function `meeting-register-agent`: stages items from the transcript (or pasted notes) when nothing is staged yet, then suggests owners (participants + project team), due dates, the organisation's own category/priority values (taken from what its registers already use — nothing hard-coded) and keyword duplicates. Writes staging rows only. Extraction prompt shared with `meeting-ai-extract`.
  - [x] Decisions extraction (from the transcript's key decisions).
  - [x] Review checklist (`pages/comms/MeetingExtractionReview.jsx`, both apps) with Create draft / Add to existing record / Set aside / Decide later per item, editable title, owner and due date, possible-duplicate banner with keyword match %. "File to registers" button on the meeting detail page.
  - [x] Drafts via the existing create paths (risks/issues `draft`, decisions `proposed` — the decision log has no draft state —, actions as open daily-log actions) + success modal listing display IDs. "Add to existing record" writes `comm_meeting_record_updates` and, for Platform risks/issues, a comment on the record; it never changes the record's fields.
  - [x] Draft-only tests: `meetingRegister.test.js` (the agent can only write the meeting staging tables) and `meetingFilingService.test.js` (both apps).
  - Deviation: promotion runs through the apps' existing, tested create services instead of a new SQL promotion RPC (re-implementing each register's insert rules in SQL without a database to test against was the riskier option). The draft-only guarantee is enforced in the agent's table allow-list.
  - Known gap: the "raised in meeting X" link is stored on the staging row and in `comm_meeting_record_updates`; record detail pages don't show it yet (Simulator registers and decisions/actions have no comment stream).
- [x] **S2.2 Import Mapper.**
  - [x] SQL #11 (`v1282_import_column_mappings.sql`, public + sim, per organisation).
  - [x] `import-mapper` edge function (the `suggest_column_mapping` tool; headers + first 20 rows only, enforced server-side) and `@nidus/ui/ai/ColumnMappingStep.jsx`: per-column "goes to" choice, sample values, confidence, value conversions for fixed-value fields, required-field check. Helpers in `@nidus/shared/utils/importMapping.js`, client in `@nidus/shared/services/importMappingService.js`.
  - [x] Saved mappings, offered automatically when the same headers appear again.
  - [x] Pilot flows: Stakeholders (`StakeholderImportModal`, both apps; its CSV template now has a rule 71 data dictionary) → Project Contacts (Platform only; there is no Simulator contacts upload) → Test bulk upload wizard (both apps; dark-only classes fixed) → Schedule import (`packages/planning`, Platform + Simulator; skipped in the Planner per D16).
  - Tests: `importMapper.test.js`, `importMapping.test.js`, `columnMappingStep.test.jsx`.
  - Planner allow-list regenerated again: `import_column_mappings` is now listed because the shared schedule screen imports the mapper, though the Planner never shows it.
- [ ] **Phase 2a gate.** Owner runs SQL #10–11 (+ `_tests`) and re-runs `v1251`, deploys `meeting-register-agent` and `import-mapper`, files a test meeting and maps a test file.

### Phase 2b — Meaning search
- [x] **S2b.1 Embeddings + hybrid search.**
  - [x] SQL #12 (`v1283_search_index_embeddings.sql` + `_tests`): pgvector (created in `extensions`, type resolved wherever it lives), embedding columns + HNSW index on `public` and `sim` `search_index`, the 9 D23 text builders (`ai_embed_text`; task outline path walked up `parent_task_id`), `ai_search_touch` re-queues on a content-hash change, queue RPCs (`ai_embed_pending` / `_store` / `_failed`, service role only), `ai_hybrid_search` (RLS access filter first, then RRF; exact reference first).
  - [x] SQL #13 (`v1284_ai_embed_cron.sql`): `ai_embed_kick()` + pg_cron every 2 minutes via pg_net, using `ai_job_config`; does nothing until configured, when nothing waits, or under the kill switch.
  - [x] `ai-embed` edge function (`--no-verify-jwt`, cron secret) with Supabase's built-in `gte-small`; `_shared/embed.ts`; pure helpers `_shared/ai/embedding.js` (+ tests).
  - [x] SQL tests: isolation, deletes, exact reference first, re-queue on change, retry + failure state (data-changing checks roll themselves back).
  - [ ] **Run the recall check** (needs the deployed function): `node scripts/ai-eval/run-meaning-search-eval.mjs` on `scripts/ai-eval/nearDuplicateSet.json` (30 English pairs + 10 distractors) — target recall@5 ≥ 80%. Owner task at the gate.
- [x] **S2b.2 Use it everywhere.**
  - [x] `search_records` is hybrid when an embedding is available (falls back to keywords), and Ask Nidus marks "similar meaning" hits.
  - [x] Meeting-to-Register duplicates use hybrid search; meaning-only matches need ≥ 0.86 similarity (gte-small scores unrelated text fairly high); the checklist shows "NN% similar".
  - [x] A4 (`v238_ai_embedding_admin_rpc.sql`) + Admin Meaning Search page: queue per app and record type, failures (no record text shown), per-organisation table with non-English share, re-embed per organisation / all / failed only (audited).
- [ ] **S2b.3 Multilingual spike (D22a).** Harness ready: `ai-embed` eval mode can run `multilingual-e5-small` through transformers.js (eval only, never stored), and `run-meaning-search-eval.mjs --model multilingual-e5-small` reports recall per language (fr, es, de, pt-BR, it sets of 10 pairs), time per text and memory. **Needs a deployed run, then the result goes to the owner for a decision.** No switch without approval.
- [ ] **Phase 2b gate.** Owner enables `vector`, `pg_cron`, `pg_net`; runs SQL #12–13 (+ tests) and A4; sets `ai_job_config` and the `AI_CRON_SECRET` secret; deploys `ai-embed`; runs both eval commands.

### Phase 3 — Simulator AI (`sim` only)
Located during build: scenario authoring for the built-in (global) scenarios is done by platform staff in the Admin app, so rubric, difficulty, calibration and persona authoring are in Admin → AI Centre (Admin SQL v239), not in the Simulator app. The NPC engine runs in the browser (`apps/simulator/src/services/sim/simNPCEngineService.js`). Phase 3 changes are in the Simulator app only; the unmounted copies under `apps/platform/src/pages/simulator` were left alone.
- [x] **S3.1 AI stakeholders.** SQL #14 (`v1285_sim_npc_ai.sql`: persona columns, `sim.npc_run_memory` written only by the function, reply columns). `sim-ai-npc` (`reply` with memory and ±10 trust per message; `event_outcome` = rule-based trust after decisions, no model/credits). Persona authoring: Admin → AI Centre → Stakeholder Personas (multi-line lists, Audit tab). Trust badge + in-place messaging on the run dashboard (`SimNPCTeamView`, `SimNPCMessageComposer`, theme-aware now); the old acknowledgement is kept as the no-AI reply. Low trust (< −30) shortens the event response time, so the existing escalation path fires sooner.
- [x] **S3.2 Adaptive difficulty.** SQL #16 (`v1287_sim_adaptive_difficulty.sql`). `@nidus/shared/utils/simAdaptiveDifficulty.js` (band from health, recent event scores, module %, trust, Assessor; one step a day within the author's min/max; level → severity cap, weights, cooldowns, response time; deterministic selection — the engine used to take the first N templates). Wired into `tickSimulationClock` / `generateNextEvents`. Event text personalisation via `sim-ai-npc` `personalise_event` (options and impacts untouched; originals kept in `event_data`). Changes logged in `sim.run_difficulty_log` and shown on the debrief.
- [x] **S3.3 AI Assessor.**
  - [x] SQL #15 (`v1286_sim_ai_assessor.sql` + `_tests`) + rubric authoring in Admin (Assessor Calibration → scenario → Rubric).
  - [x] `sim-ai-assess` after each decision (Event inbox) and at run end (debrief "Assess my run"); the debrief passes Assessor results to `ai-simulator-debrief`.
  - [x] Learner flags ("I disagree with this" on `AiAssessmentCard`); Admin uphold/dismiss with a note.
  - [x] Calibration view (author scores each criterion; agreement ±1 computed per assessment) + Admin oversight list with clickable cards.
  - [x] Author switch "counts toward score" with a weight; `sim.ai_run_score()` blends only for switched-over scenarios and certificate eligibility now uses it.
  - [x] **Calibration threshold enforced in SQL:** ≥ 30 author-scored assessments with ≥ 80% agreement before the switch can be turned on (`admin_sim_ai_update_scenario`).
- [x] **S3.4 Practice mode + packaging.** Phase 1–2 agents already bind to `sim` through `useAppConfig().db`: Ask Nidus (`/simulator/ai-workspace`), Status Report on the practice highlight report, Meeting-to-Register and the Import Mapper (Simulator copies). Packaging: Simulator plans live in `sim.simulator_subscriptions`, which the Phase 0 allowance ignored → new SQL `v1288_sim_ai_plan_credits.sql` (per-plan credits, allowance uses the owner's Simulator plan) + Admin `v240` + a "Simulator plans" table on Plans & Credits. Free tier = whatever Admin sets on the `free` row (else the no-paid-plan allowance).
- Tests: `simAi.test.js` (trust, replies, Assessor validation/agreement), `simAdaptiveDifficulty.test.js`, Admin `validateRubricCriterion`. Pre-existing, unrelated failures seen while running the Simulator suite: 2 in `simRecordLifecycleService.test.js` (`simDb.rpc` missing from its mock).
- [ ] **Phase 3 gate.** Owner runs SQL #14–16 (+ v1286 tests) and v1288, Admin v239–v240; deploys `sim-ai-npc` and `sim-ai-assess`; writes a rubric and personas for one scenario; plays a run.

### Finish
- [x] `REVIEW.md` code review (security gate: edge auth, query runner, prompt injection, cross-schema RPCs) — see Review below. The per-phase gate reviews against a running database are still owner tasks.
- [x] Docs: `Documentation/AI_Agents_v1272_Guide.md` (users, Account Owners, owner setup/run order/deploy/evals, blog summaries); Admin `Documentation/AI_Centre_v1272_Guide.md` + `modules/ai/docs/AI_Centre_Guide.md` + Admin `v241_ai_centre_docs_seed.sql`. Taxonomy section 24 (Phase 1; Phases 2–3 added no menus). CLAUDE.md 34.5 exception (both repos). ROADMAP R8/R9/R10 areas + change log.
- [ ] Push to GitHub (rule 20) — not done: needs the owner's go-ahead to commit.
- [x] Review section below.

---

## Owner run order (per phase gate) — full list in `Documentation/AI_Agents_v1272_Guide.md` §3
1. Admin SQL for that phase (A-files) in number order.
2. Monorepo SQL for that phase in number order, each `_tests.sql` straight after its migration.
3. Phase 1 only: `node scripts/generate-planner-table-allowlist.mjs --write`, then re-run `SQL/v1251_planner_table_wall.sql`.
4. Deploy changed edge functions and set the `ANTHROPIC_API_KEY` secret. Remove `GEMINI_API_KEY` after Phase 1.
5. Restart dev servers and try the slice.

## Facts to confirm during build (no decisions involved)
- [x] `sim.search_index` and `sim.report_templates` did not exist — created in v1277 / v1278.
- [x] Highlight report pages: `apps/platform/src/pages/structured/HighlightReportCreate.jsx`, `apps/simulator/src/pages/simulator/PracticeHighlightReportCreate.jsx`. Organisation settings: `pages/platform-app/OrganizationAdmin.jsx` (now links to the AI Settings page). Scenario authoring for built-in scenarios: Admin app Simulator module → AI authoring placed in the AI Centre.
- [ ] `pgvector`, `pg_cron`, `pg_net` enabled on the Supabase project — owner (v1283/v1284 report clearly if missing).
- [ ] `gte-small` within edge memory limits — confirmed by the first `ai-embed` run / meaning-search eval.
- [x] Edge functions cannot rely on bundling `packages/shared` — registry kept in `supabase/functions/_shared/ai`.

## Risks
| Risk | Mitigation |
|---|---|
| Prompt injection through record text, e.g. a risk description saying "ignore instructions" | Tool results are passed as data. No tool can update, submit or delete (D3). Drafts need a person to save them. Injection cases are in the eval set. |
| Runaway cost | Gate before every run, hard stop at 100%, row caps keep tool results small, prompt caching, kill switch. |
| Catalogue drift when tables change | CI/SQL test comparing catalogue fields to `information_schema`. The runner rejects unknown columns instead of failing silently. |
| Edge function time limits | Questions and drafts are short. Embedding runs in batches on a cron. |
| Planner wall breakage | Regenerate the allow-list in the same slice. CI `app-planner.yml` catches a stale list. |
| Admin → public/sim write surface grows | Only the listed RPCs, permission-gated and audited, documented in rule 34.5. |

## Review

### Build audit (2026-10-19)
The plan file had not been ticked although most of Phases 0–1 was already in the working tree. Audit result before continuing:
- Built and verified by reading the code and running its tests: S0.1 (except the browser OpenAI paths), S0.2, S0.3, S0.5, S1.1 (except the Admin page), S1.2, S1.3 (except "Ask Nidus about this"), S1.4–S1.7, S1.8 (except the eval set); Admin SQL A1–A3.
- Missing and then built in this session: browser OpenAI removal, the Admin AI Centre module and pages, "Ask Nidus about this", the eval set and runner, Planner allow-list regeneration; then all of Phases 2, 2b and 3.
- Deviations from the plan, each noted where it applies: tool registry in `supabase/functions/_shared/ai` (edge bundling); manual Messages API loop instead of the SDK tool runner (auditing/streaming); `_shared/aiRun.ts` instead of `aiGate.ts`; shared Ask Nidus UI in `@nidus/ui/ai` (no app binding needed beyond `useAppConfig().db`); meeting drafts created through the apps' existing create services instead of a SQL promotion RPC; extra SQL v1288 and Admin A5/A6/v241.

### Review Summary
- Change: v1272 AI agents foundation, Phases 0–3 (Platform, Simulator, Planner, Admin)
- PRD: `projectprd/v1272_ai_agents_foundation_PRD.md` · Plan: this file · Roadmap: R8, R9, R10
- Review mode: STANDARD (code review; no database or deployed functions were available)
- Decision: **PASS WITH CONDITIONS** — conditions are the phase gates (run SQL + `_tests`, deploy, evals, manual try-out)
- Highest severity found: MEDIUM (fixed) · Regression risk: MEDIUM · Database impact: HIGH (17 monorepo + 7 Admin SQL files, none run yet) · Security impact: HIGH (new data paths), reviewed below

### Findings
- **[MEDIUM, fixed] Learner could farm NPC trust.** `sim-ai-npc` `event_outcome` added trust every time it was called for the same event, and `reply` re-rolled trust (and spent credits) on an already-answered message. Fixed: `npc_run_memory.counted_events` (each decision counts once) and already-answered replies are returned as they are. Tests added.
- **[LOW, fixed] Blended run score mixed scales.** `sim.ai_run_score` blended the raw `total_score` with a 0–100 Assessor score; it now uses the run's percentage.
- **[LOW, fixed] Wrong label.** Admin showed `default_trial_credits` as the Planner trial; it is the allowance for organisations without a paid plan.
- **[LOW, fixed] Light-mode contrast** on OrganizationAdmin (white text on light grey), and dark-only Admin `AdminCard` / `inputClass` / `AdminField` / confirm box and the Test bulk upload wizard.
- **[LOW, open] Learner-writable run metadata.** `simulation_runs.difficulty_level` and `run_difficulty_log` are written by the browser engine under the run owner's RLS, so a learner could alter their own difficulty history. Same trust model as the existing client-side engine; scores and Assessor results are not writable by learners.
- **[LOW, open] "Raised in meeting" link not shown on record pages** (stored on staging rows / `comm_meeting_record_updates`; Platform risks/issues also get a comment).

Security gate (§11), by data path:
- Edge functions: every AI function calls `requireUser()` (401 without a valid JWT) through `startAiRun`; `ai-embed` uses the cron secret and refuses when it is unset. Service-role clients are used only for audit rows, the ledger, NPC memory and Assessor results, and only after the run/record was read as the user.
- Query runner: catalogue-checked identifiers, `%I` quoting, bound values, `SECURITY INVOKER` over `security_invoker` views, timeout and row cap; Planner edition enforced server-side.
- Search: `ai_hybrid_search` is `SECURITY INVOKER` on the RLS-protected index and re-checks each hit against its view; queue RPCs are service-role only. The v643 "everyone reads every tenant's index" policy was replaced (v1277).
- Prompt injection: every prompt states that record/transcript/file text is data; tools are read-only; agents write only staging/draft rows (allow-list tested); the model never writes SQL.
- Cross-schema: all Admin writes go through permission-gated, audited RPCs that take the admin from the session; documented in both CLAUDE.md files.
- Also fixed earlier in this initiative: `ai_settings` RLS bugs (v1272), `report_templates` had no RLS (v1278).

### Validation Evidence
- Unit (run 2026-10-19): edge-function modules 62/62; `scripts/ai-eval` 14/14; `@nidus/ui` 204/204; Admin `aiCentreServices` 14/14; `meetingFilingService` 6/6 in each app; Ask Nidus service 7/7; `importMapping` 7/7; `simAdaptiveDifficulty` 5/5; planning schedule screens 35/35; Simulator inbox 2/2.
- Build: Admin `modules/ai` `vite build` passes; changed JSX syntax-checked with esbuild.
- Planner allow-list: `--check` up to date (86 tables).
- Not run: SQL and `_tests.sql` (no database here), edge functions (no Deno/Supabase here), evals, E2E, manual try-out.
- Pre-existing failures seen while running suites (not caused by this work): `simRecordLifecycleService.test.js` (2), `SimulationSetup.test.jsx` (1), `packages/shared` `checkpointReportExport` (4), `ianaTimezoneOptions` (1), `queryRouter` (1), Admin `shared.test.js` import path and `documentationContentUtils` (1).

### Remaining risks
- All SQL is unexecuted: the first run may surface column-name mismatches against the live schema (each file is idempotent and has tests to show this quickly).
- Model quality is unmeasured until the Ask Nidus eval, meaning-search recall check and the D22a spike are run.
- `gte-small` similarity scores for duplicates (threshold 0.86) should be checked against real data after Phase 2b.
