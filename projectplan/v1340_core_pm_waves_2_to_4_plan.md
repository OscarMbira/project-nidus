# v1340 — Core PM waves 2–4 — implementation plan

**PRD:** `projectprd/v1340_core_pm_waves_2_to_4_PRD.md` · **Audit:** `Documentation/Core_PM_Fields_and_Sample_Data_Audit.md`
**Status:** Code complete 2026-11-12. SQL v1443–v1446 written, not run (owner runs at the end).

## Todo

### Wave 2a — Audit details tab (rule 63.1)
- [x] Contact Directory edit form (`pages/projectSetup/ProjectContactsPage.jsx`) — Platform + Simulator
- [x] Governance members (`components/governance/GovernanceMembersPanel.jsx`) — Platform + Simulator
- [x] Control accounts (`pages/scope/WBSBuilder.jsx`) — Platform + Simulator
- [x] ~~Project role create~~ — excluded: a bulk picker, and the create page already has its tabs (see Review)
- [x] OKR objective + cycle forms (`pages/okr/OkrObjectiveForm.jsx`, `OkrCycleForm.jsx`) — Platform + Simulator
- [x] Custom metrics (`pages/analytics/CustomMetricsPage.jsx`) — Platform + Simulator
- [x] ~~Baselines~~ — excluded: a create-only snapshot with no single-record view (see Review)
- [x] Test: one form shows placeholder before save and cards after

### Wave 2b — Custom Fields (Local Data Extensions)
- [x] SQL: register screens (public + sim) for assumption, constraint, milestone, deliverable, decision, delay, stakeholder, benefit, lesson, stage gate
- [x] Mount `CustomFieldRenderer` on each detail page — Platform + Simulator where the same page exists
- [x] Test: renderer mounted with the right screen code / entity

### Wave 3 — Policies & Compliance → register engine
- [x] SQL: system register `core_policies_compliance` (scope `organisation`, D4 amended) with fields, tabs, statuses — v1444 + v1445
- [x] SQL: copy rows to their organisation; tighten the old table's read policy
- [x] SQL: repoint the Policies & Compliance menu (Platform; Simulator if a menu exists)
- [x] Guide

### Wave 4 — expose stored-but-hidden fields
- [x] Project closure form (closure, finance, resources, documentation)
- [x] Lessons learned form
- [x] Follow-on action form
- [x] Stakeholder communication form
- [x] Stakeholder engagement + analysis forms
- [x] Change request: approval required by
- [ ] Mandate dependency: impact during / after — **not done**: no capture screen exists (see Review)
- [x] Assumption: impact if invalid (validated by left out — see Review)
- [x] Issue: estimated resolution date
- [x] Simulator parity where the same component/table is used; gaps listed in Review

### Close-out
- [x] Re-run affected test suites, lint, shared drift check
- [x] Parse-check all SQL; "into" trap check
- [x] Update audit doc progress, menu taxonomy (if menus change), memory
- [x] Review section below

## Review

**Done 2026-11-12. Code complete; SQL written, not run.**

### SQL run order
1. `SQL/v1443_core_pm_custom_field_screens.sql`: 10 public + 4 sim custom-field screens.
2. `SQL/v1444_local_register_organisation_scope_and_isolation.sql`: new scope `organisation`, membership helper `auth_user_is_account_member`, account backfill, RESTRICTIVE isolation policy on PMO / organisation register records.
3. `SQL/v1445_core_policies_compliance_register.sql`: Policies register (26 fields, 4 tabs), copies the old rows, repoints the menu, makes the old table's policies creator-only.
4. `SQL/v1446_sim_assumptions_impact_if_invalid.sql`: Simulator column for the new assumption field.

### Wave 2a: Audit tab
- New shared `packages/ui/src/RecordAuditDetails.jsx` (Identity / Classification / Record history cards, with an "appears after this … is saved" placeholder). Exported from `@nidus/ui`, tested.
- Added to: Contact Directory and governance members (Platform only; no Simulator copy), WBS control accounts (Platform; the Simulator has no control-account UI), OKR objective and cycle forms, and Custom Metrics (both apps). Custom Metrics was also rewritten with light and dark theme, row numbers and icon actions.
- Excluded: Project role "from library" (a bulk picker; the create page already has tabs) and Baselines (create-only snapshot).
- Most detail forms in the audit's "74 missing" list already had the tab. That count came from list pages.

### Wave 2b: Custom fields
- `components/shared-app/RecordCustomFields.jsx` in each app wraps `useCustomFields` + `CustomFieldRenderer` and renders nothing until fields are published.
- Mounted on: assumptions, constraints, milestones, delays (both apps); deliverables, decisions, benefits, stage gates, stakeholders, lessons (Platform).
- **Parity gap (existing, not fixed):** the Simulator copies of DecisionLogDetail, BenefitDetailPage, DeliverableRegisterFormPage and StageGateView read **public** tables through `platformDb`, so they got no sim custom-field screens. Recommend separate scoped work.

### Wave 3: Policies & Compliance → register engine
- **D4 amended:** scope `organisation`, not `pmo`. `pmo` would have hidden policies from members who are not PMO admins, who can read them today.
- **Security fixes:**
  - `public.policies_compliance` let every organisation read and change every policy. Its policies are now creator-only, and the data lives in the register.
  - PMO-scope register records were readable by PMO admins of other organisations. They are now isolated by organisation (v1444).
- The membership helper covers owners, accepted invitations and project roles, the same sources as `get_user_accounts`. The older `auth_user_can_access_account` (v1016) misses invited members.
- Manage Local Registers shows the new scope label "Organisation" (both apps).
- Guide: `Documentation/Policies_and_Compliance_Register_v1445_Guide.md`. Taxonomy line added (additive).

### Wave 4: hidden fields
- **Project closure:** success rating; benefits realised; final budget / actual cost (SmartAmountInput) / variance (calculated); accounts closed and date; resources released, date and outstanding commitments. New Documentation section: archived, location, retention, closure document link, special considerations. Export field list extended. Both apps.
- **Lessons:** new tab "Good practice & follow-up": what worked well, best practices, evidence, follow-up action / due date / status, shared with organisation and date. Both apps.
- **Follow-on actions:** team, start date, rationale, expected outcome, required resources, handover to operations with operational owner. Both apps; test added.
- **Stakeholder analysis:** why this power / interest level, two dependency flags, attitude notes, reasons for support, objections, influence strategy, engagement approach.
- **Engagement plan:**
  - Approach tab: meeting type, information sensitivity, information needs.
  - New "Relationship health" tab: trust, status, period, barriers, actions.
- **Communication log:** summary, meeting length, confidential, response required / due by, feedback received, follow-up date.
- **Change request:** "Decision needed by".
- **Assumption:** "Impact if this assumption proves wrong" (Simulator column added in v1446). "Validated by" was not added; validation is tracked by the status.
- **Issue:** estimated resolution date.
- All stakeholder, closure, lesson and follow-on tables are `public` in both apps. The Simulator copies already read the public tables (an existing pattern), so they got the same fields.
- **Not done:** mandate dependencies. `mandate_dependencies` has service functions but no screen anywhere, so its two flags can't be exposed without building a dependencies section. Left for a later PRD.
- Deliberately not exposed (system- or URL-array columns): reference / usage counters, `*_urls` arrays, `depends_on_action_ids`, `engagement_tactics` arrays, recipients lists.

### Validation
- Affected suites in both apps: all tests on changed components pass, including new tests (RecordCustomFields 2, follow-on wave 4 save 1, RecordAuditDetails 2).
- **Existing failures, unrelated, in files not touched:**
  - `issueService`, `stakeholderService`, `okrService`, `localRegisterService` and `draftQueueStakeholder` service tests (stale mocks).
  - `DecisionLogPage.pendingActions` (needs AppConfigProvider, v1272).
  - `BenefitsRollup` / `StageGateOversight` (import a removed file).
- ESLint: no new unused-variable, import, undefined or restricted-import findings in changed files. Shared drift check: 0.
- SQL: all four files parse (libpg-query). No "into" outside `INSERT INTO`, no SELECT INTO.

## Amendment A (2026-11-12): the two gaps left open

The owner ran v1443–v1446 and asked for the two items left open in the Review to be built.

### Todo
- [x] Mandate dependencies: shared `@nidus/ui` `MandateDependenciesSection` (table/card toggle, search, sortable columns, row numbers, icon edit/delete, confirm before delete, success modal); impact during project / after implementation exposed
- [x] Platform: mandate edit page (add / edit / delete) and view page (read-only); the Simulator's unused copies of the same pages kept in sync
- [x] Simulator: new `sim.mandate_dependencies` (practice mandate owner only) + service functions + section on `SimMandateView` (the Simulator has no mandate edit route; read-only once approved or archived)
- [x] Mandate export: new section "13. Dependencies" as a real table (rule 38.1); flat exports one line per dependency
- [x] SQL v1447: `public.mandate_dependencies` policies follow the mandate (closes a cross-organisation read and a cross-organisation PMO write), `sim.mandate_dependencies` created
- [x] Simulator Decision Log moved to `sim.project_decisions` (practice projects): pages use `services/sim/simDecisionService.js` + new `lib/usePracticeProjectParam.js` + the practice project picker (`PlanningProjectBar isSim`); same addresses, so menu and AI links keep working
- [x] Simulator decision detail: custom fields (`decision_detail` sim screen)
- [x] SQL v1448 + Admin v248: `updated_by`, Admin ID Generation for Decision IDs (SDEC), owner/member-only access (was any signed-in user), sim screen
- [x] Tests: MandateDependenciesSection (4), mandate export dependencies (3), simDecisionService (4)

### Review
**SQL run order:** Admin `E:\project-nidus-admin\SQL\v248_sim_project_decisions_id_generation_seed.sql` → `SQL/v1447_mandate_dependencies_access_and_sim_table.sql` → `SQL/v1448_sim_decision_log_practice_projects.sql`.

**Decisions taken while building (owner to confirm):**
- Simulator decisions saved earlier through the Simulator stay in `public.project_decisions`. They belong to Platform projects, so they still show in the Platform Decision Log and are not copied.
- The Simulator Decision Log keeps its addresses (`/simulator/governance/decisions…`). `?projectId=` now names a practice project, chosen with the practice project picker at the top of the list.
- Dependency columns `related_project_id` / `related_programme_id` are not shown (the Simulator table leaves them out). Description, type, status and the two impact flags are shown.

**Still open (not in this amendment):**
- The Simulator's benefit, stage gate and deliverable register detail pages named in the Review are **not mounted** in `simulatorRoutes.jsx` (benefits redirect to the practice benefits pages; stage gates and the deliverable register use the practice pages). They are unused code, so nothing to fix there.
- The Simulator's authorisation queue (record lifecycle module) still reads Platform lifecycle tables. A decision opened from that queue in the Simulator now shows "Decision not found", because the Simulator decision pages read the sim schema. Moving the Simulator lifecycle module to the sim schema is separate work.

**Validation:** new tests pass (11). Existing decision log, meeting filing and mandate suites pass in both apps. The only failure, `projectMandateService.test.js` (`jest is not defined`), was already failing and that service is unchanged. ESLint shows no new import or undefined-variable errors in changed files.
