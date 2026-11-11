# v1337 — CBS Data Migration Runbook — Implementation Plan

**PRD:** `projectprd/v1337_cbs_data_migration_runbook_PRD.md` (decisions D1–D9)
**Status:** Implemented 2026-11-09 (owner approved; owner runs the SQL — see Review).
**Approach:** thin vertical slices, test first; Platform and Simulator together (rule 34.1) — the engine
lives in `packages/*` and both apps' register pages. SQL numbers are taken from the folder immediately
before each file is created (rule 18.0); the owner runs all SQL.

## Modules touched

| Area | Change |
|---|---|
| SQL — engine | Field-type check constraint: `datetime`, `record_ref` (public + sim); field `calculation` JSONB for calculated fields; template create function substitutes the new parent record id into child records (`{{parent}}` token) |
| SQL — registers | `fin_migration_runbook`, `fin_runbook_steps` (public system registers): fields, tabs, statuses, conditional fields (v1346), record refs, menu items under Data Migration + role grants (as v1343), taxonomy line |
| SQL — content | CBS Data Migration Runbook system template (≈110 steps, vendor-neutral) + content check script |
| SQL — seed | 10 runbooks on SEED334-PRJ-08 (linked to Mock Migrations); full steps with actuals for 3 runs (ID ranges checked free first) |
| Shared utils | `registerDateTime.js` (parse / format / Now, regional settings), `registerCalculations.js` (rules + evaluation), `registerRecordRef.js` (load options, labels), `runbookSequencing.js` (warning rules), `runbookSummary.js` (totals) |
| UI (`@nidus/ui`) | `DateTimeInput` (with Now), `RecordRefInput` (searchable, single / multiple), `SequenceWarningDialog`, `RunbookSummaryPanel`, `RunbookStepList` (grouped by window / batch) |
| Pages (both apps) | `RegisterFieldInput` / form: new field types; save path computes calculated fields and runs sequencing checks; detail page: summary panel + grouped step list for the runbook, runbook progress on Mock Migrations |
| Exports / document | Datetime, calculated and record-ref values readable in lists, record exports and documents |
| Docs | `Documentation/FIN_Data_Migration_Runbook_v1337_Guide.md`; taxonomy (rule 70) |

## Todo

### Slice 1 — Date & Time field type (D8)
- [x] 1.1 SQL: allow `datetime` (public + sim check constraints).
- [x] 1.2 `registerDateTime` util (store ISO with offset; show in organisation time zone and date / time format) + tests.
- [x] 1.3 `DateTimeInput` with Now; wire into the register form, view, list and exports (both apps) + tests.

### Slice 2 — Record-reference field type (D9)
- [x] 2.1 SQL: allow `record_ref`; options `{ register_key, multiple, label_field }`; same-project scope.
- [x] 2.2 `registerRecordRef` util + `RecordRefInput` (searchable, rule 69) + view / export labels (display IDs, rule 16.1) + tests.

### Slice 3 — Calculated fields (D4)
- [x] 3.1 SQL: `local_register_fields.calculation` JSONB (public + sim).
- [x] 3.2 `registerCalculations`: difference, percentage, duration between date-times, rate per second, budget variance; evaluated on save (stored), read-only in the form + tests.

### Slice 4 — Runbook registers + menus (D1, D2, D3, D7)
- [x] 4.1 SQL: `fin_migration_runbook` (Details · Windows & Budgets · Checkpoints · Go / No-Go · Notes) and `fin_runbook_steps` (Details · Load Figures · Timing · Control · Defects · Notes), step types, statuses, conditional fields, calculated fields, record refs; registry; menu items + grants; taxonomy.
- [x] 4.2 `runbookSequencing` + `SequenceWarningDialog` (reason stored on the step) + tests.
- [x] 4.3 `runbookSummary` + `RunbookSummaryPanel` + grouped `RunbookStepList` on the runbook view; progress on the Mock Migrations view + tests.

### Slice 5 — Template (D5)
- [x] 5.1 Template create function: `{{parent}}` substitution so steps link to the new runbook + SQL test.
- [x] 5.2 CBS Data Migration Runbook system template (≈110 steps, both windows, six batches, control steps) generated from a content module; content check (no product / bank / person names; every step valid).

### Slice 6 — Samples (D6)
- [x] 6.1 Seed: 10 runbooks linked to the Mock Migrations records; full steps with actual figures for Mock 1 static, Mock 1 rerun, Mock 2 static (running); planned runs header and budgets only. Final query shows counts per runbook.

### Slice 7 — Close-out
- [x] 7.1 Retest suites (shared, ui, both apps), lint, drift check.
- [x] 7.2 REVIEW.md checks; guide; review section below; ask before commit / push.

## Risks
- Engine changes touch every register form: covered by existing register tests plus new ones per type.
- Time zones: values stored with offset and shown in the organisation time zone (rule 68); tested across a date change at midnight.
- ≈330 seeded step records: generated and validated by script; IDs checked free before use.

## Review

**Done 2026-11-09.** Every slice is implemented. No SQL has been run yet (the owner runs it), and nothing is committed.

### SQL — run in this order
1. `SQL/v1375_register_runbook_engine.sql` — engine changes (public + sim):
   - the `datetime` and `record_ref` field types;
   - `local_register_fields.calculation` and `local_registers.behaviour`;
   - template create with `{{parent}}` / `{{parent_label}}` substitution;
   - a 5-argument snapshot that also keeps record-reference children (the 4-argument form still works);
   - template save passes the record to the new snapshot.
2. `SQL/v1376_fin_migration_runbook_registers.sql` — the registers and menus:
   - the two registers (9001-…042 and …043), with fields, tabs, conditional and calculated fields, and record references;
   - behaviour set to runbook / runbook_steps, plus `runbook_progress` on Mock Migrations;
   - pack link and menus 638 and 639 (Reconciliations, Migration Defects and Migration Sign-Off move to 640–642);
   - `grant_menu_role_group('fin_reg_%')` and the v1343 role grants.
3. `SQL/v1378_fin_cbs_runbook_system_template.sql` — the system template (b337-…001) with 153 steps.
4. `SQL/v1379_fin_migration_runbook_seed.sql` — 10 runbooks (b042) and 249 steps (b043). Both ranges were checked free on the live database first.
5. `SQL/v1380_register_runbook_template_tests.sql` — tests R1–R6, all rolled back. Expect PASS on every test.

6. `SQL/v1381_fin_runbook_step_list_columns.sql` (amendment) — the Steps list on the runbook page shows the workbook columns. Which columns appear, their order, headings, display format and red highlights are stored in `behaviour.list_columns` on Runbook Steps (rule 25.1). They're read by `resolveListColumns` / `formatListCell` (`packages/shared/src/utils/registerListColumns.js`, with tests). Columns share fixed widths, so every window/batch group lines up. Re-run after any re-run of v1376.
7. `SQL/v1382_fin_runbook_step_list_budget_variance.sql` (amendment) — adds the signed **Over / Under** column (`budget_variance_minutes`, with `signed: true` and `warn_when`). The Steps list now shows one tab per window · batch (pill tabs with step counts) instead of stacked tables.
8. `SQL/v1383_fin_runbook_steps_multi_value_fields.sql` (amendment) — three step fields become multi-valued:
   - `depends_on` and `decision_notes` become `multi_line`.
   - `sequence_override_reason` becomes a `table` with columns When (UTC) | By | Reason (rule 67.1), and existing "… UTC – by: reason" lines are converted to rows.
   - `appendOverrideReason` now writes tab-separated rows.
   - The v1376 definitions and the v1379 sample row are updated to match, so re-runs stay consistent.

v1374 and v1377 were taken by other work while this was being built.

### Changes from the plan
- **More steps:** the template has 153 steps, not about 110. Each control row in the workbook is its own step: suspense-category changes, backups, checkpoints and end of day.
- **Four seeded runs, not three:** "full steps for started runs" covers four runs, so the seed is Mock 1 static (48 steps), Mock 1 financial (105), the Mock 1 rerun (48) and Mock 2 static (48, in progress at step 31). That's 249 steps rather than about 330.
- **`show_fields`, not `label_field`:** record-reference options use `show_fields`, which lists the target fields to show (for example the expected record count). The label is always "display ID – title".
- **Templates without sign-off:** templates were only available on document registers. A new `behaviour.templates` flag turns on New → From template for the runbook without making it a sign-off document. It is checked in `useRegisterTemplates` and `LocalRegisterNewPage` in both apps.
- **Panels in the app, not `@nidus/ui`:** the runbook panels on the record page live in `apps/*/src/components/shared-app/RunbookRecordPanels.jsx` (identical in both apps, rule 34.3), because they call the app's register services. The display components are in `@nidus/ui`.

### Validation
- **New tests, all passing:**
  - `registerRunbookEngine.test.js` (10);
  - `runbookSequencing.test.js` (7, including the summary);
  - `RegisterRunbookInputs.test.jsx` (5);
  - `RunbookPanels.test.jsx` (3).
- **Full suites:**
  - `packages/ui`: 258 / 258 pass.
  - `packages/shared`: 1089 / 1095 pass. The 6 failures were already there and are unrelated: checkpointReportExport, ianaTimezoneOptions and queryRouter.
  - Both apps (localRegisters, lib, shared-app): all pass except 2 `useMenuMethodology` tests, which fail the same way in both apps. They were already failing: they test menu ordering, and `useMenu` hasn't changed since 2026-10-12.
- **Other checks:**
  - Lint: 0 errors on the changed files.
  - Shared-drift check: 0 overrides.
  - libpg-query parse check passes on every new SQL file.
  - The template content check (`node scripts/build-cbs-runbook-template.mjs --check`) passes: no vendor, product code, routine or person names.

### Not verified
- The SQL has not been run against the database, and the pages have not been tried in a browser.
- The Simulator has no FIN Data Migration menu (same as the other FIN registers). Its register pages share the same code, so the runbook works there if someone opens it.

### Remaining risks
- A step from an organisation template keeps references to defects and mapping sheets in the project the template was saved from. They show as links that may not open in another project.
