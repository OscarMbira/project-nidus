# v1205 — Test Evidence revamp implementation plan

Source PRD: `projectprd/v1204_test_evidence_revamp_PRD.md` (draft, awaiting approval).
Status: NOT STARTED — waiting for the owner's approval of both the PRD and this plan.

## Approach

Test-first vertical slices. For each behaviour: write the failing test, write the smallest code that passes, then
refactor. Each slice ends with the retest suite (rule 43) and a short note of what changed (rule 5). Platform and
Simulator change together in each slice (rule 34.1).

## Revision (2026-10)

The evidence link is `test_case_executions` (manual execution, `SQL/v339`), not `tc_test_run_results`.
Owner approved option 1: a new table `test_case_execution_evidence`. Slice 1 onward uses it.

## Shape of the work

- **Database:** `v1200` applied (settings columns; soft-delete columns on `tc_evidence_files`, now unused). Next: `v1201` adds `test_case_execution_evidence`. Each migration ends with
  `NOTIFY pgrst, 'reload schema'`. New tables are registered in `database_tables`.
- **Schema, public and sim:** add `deleted_at`, `deleted_by` to `tc_evidence_files`; add the organisation and project
  evidence-setting columns or table; add RLS policies that call SECURITY DEFINER helpers (project memory on the
  `row_security=off` pattern).
- **Shared:** `packages/shared` gets the pure rules (setting resolution, requirement gate, removal rule). Platform and
  Simulator import them through `@nidus/shared`.
- **Shared UI:** `packages/ui` `RecordPreviewModal` is reused as-is for the View action.
- **Apps:** execution row, Evidence page, test case detail and the settings screen are updated in both apps.

## Slices

### Slice 0 — Schema and settings
- [x] Test: resolving the evidence setting returns the project override, else the org default, else `optional`. (`packages/shared/src/utils/__tests__/testEvidenceRequirement.test.js`, 12 tests, passing)
- [x] SQL `v1200`: `deleted_at` / `deleted_by` on `tc_evidence_files` (public and sim); org default on `accounts`; project override on `projects` (and `sim.projects` when present). Written, not yet run against the database.
- [ ] RLS: cross-project read and write refused (integration test). Needs a live database; not run.
- [x] Register new objects in `database_tables`. Not needed: `v1200` creates no new tables.
- [x] Seed: not needed. The org default is `optional` by column default and no project rows are seeded.

Rules-module copies: `packages/shared/src/utils/testEvidenceRequirement.js` is the source. Identical copies are in `apps/platform/src/utils/` and `apps/simulator/src/utils/` because `@nidus/shared/utils` resolves to each app's own folder (vite alias). Keep all three in sync.

### Slice 1 — Capture on the execution screen
- [x] Test: marking Passed with required evidence and no files is blocked; with optional evidence it is allowed. (`TestExecutionRow.test.jsx`)
- [x] Test: a file attached to a result is stored against the execution row. (`testCaseExecutionEvidenceService.test.js`)
- [x] `TestExecutionRow` gains an attach control. Shown on every row, not only Passed, because a required-evidence test must be able to attach before it can be marked Passed. Uses a plain file input, not the Defect uploader.
- [x] Attached files listed on the row. Open action not yet built.
- [x] Simulator: the Simulator execution screen and service also use `platformDb` and the public `test_runs` tables, so the same public table serves both apps. No separate `sim` migration needed. Copies in `apps/simulator` pass their tests.

### Slice 2 — Removal rule
- [x] Test: uploader can remove before run close; cannot after; PM can remove at any time. (`testEvidenceRequirement.test.js`, UI test for remove visibility)
- [x] Test: removal sets `deleted_at` and `deleted_by`; row remains; reads exclude it. (service test)
- [x] Remove action on the row (icon-only, `RowActionButton` variant delete, rule 61). Confirm uses `window.confirm` for now; replace with the shared confirm modal in a follow-up.
- [ ] OPEN: the UI's Project Manager check uses `useProjectRole().canEdit`, which also includes PMO admins, portfolio and programme managers. The RLS update policy (`SQL/v1201`) uses `is_project_manager`, which is narrower. Owner to decide which roles may remove any file. Until decided, a PMO admin may see Remove and get a database refusal.
- [ ] Database: `SQL/v1201` not yet run. RLS integration test not run.

### Slice 3 — Evidence page
- [ ] Test: default filter is Passed; switching to Failed or All changes the rows.
- [ ] Test: no defect-attachment rows appear; failed rows link to the defect.
- [ ] Replace the four tabs with one list and the outcome filter.
- [ ] Columns per PRD story 12; search, sortable headers, Card/Table toggle, row numbers, export menu.
- [ ] Simulator equivalent.

### Slice 4 — Settings screens
- [ ] Test: PMO Admin / Account Owner can set the org default; Project Manager can set a project override.
- [ ] Organisation setting in the existing Regional & Format / organisation settings area (rule 68 pattern).
- [ ] Project setting in project setup.
- [ ] Simulator equivalent.

### Slice 5 — View and export on test case records
- [ ] Test: the View action opens the shared preview with the test case's sections and four export tabs.
- [ ] Icon-only `RowActionButton variant="view"` next to Edit on `TestCaseDetail` (rule 61).
- [ ] Back control if the page is a secondary page (rule 73; already present on record detail pages, confirm).
- [ ] Simulator equivalent.

### Slice 6 — Hardening
- [ ] Retest suite green in Platform and Simulator (rule 43).
- [ ] Unsaved-changes guard on the settings screens (rule 52).
- [ ] Documentation under `Documentation/` describing the new behaviour (rules 19, 22).
- [ ] Taxonomy update for any menu change (rule 70), if the Evidence menu entry changes.

## Decisions still needed before Slice 0

1. Confirm the Evidence page layout in the PRD (single list, outcome filter, four tabs removed).
2. Confirm where the org and project settings live (organisation settings page and project setup, as in Slice 4).

## Status and review (2026-10)

Owner instruction: build all slices; the owner runs the SQL and the browser tests once the plan is complete.

### Done

- **Slice 0:** rules module (`testEvidenceRequirement.js`), 12 tests. Setting columns and soft-delete columns in `SQL/v1200` (applied by owner). RLS integration test still open.
- **Slice 1:** capture on the execution row, required gate, attach and list. Platform `TestRunExecute` and `TestExecutionRow`. Simulator `SimTestRunExecute` (the sim route's page) and the shared row.
- **Slice 2:** removal rule (uploader while open, owner or Project Manager any time), soft delete, icon-only remove. Confirm uses `window.confirm` for now.
- **Slice 3 (Platform):** Evidence page rewritten: one list, outcome filter (Passed default), search, sortable headers, export, failed rows link to defect. Defect attachments and History tab removed. Card/Table toggle from PRD story 14 NOT built.
- **Slice 3 addendum:** Actions column (icon-only View and Delete, rule 61). Edit was deliberately left out — an uploaded file has nothing to edit. View opens a signed URL; Delete uses the same removal rule as the execution row (uploader while the run is open, or the Project Manager at any time) and is hidden when the viewer may not remove that file. Simulator parity still pending the missing Evidence page (see open item 3).
- **Slice 4 (Platform):** `TestEvidenceSettingCard` mounted on the organisation Regional & Format page (accounts default) and the project Regional & Format page (project override). Unsaved-changes guard on the card.
- **Slice 5 (Platform and Simulator):** View action (icon-only) on test case detail, opening the shared `RecordPreviewModal`.
- **Slice 6:** guide at `Documentation/Test_Evidence_v1204_Guide.md`.

### Tests (all passing)

- Platform: 24 across the evidence, row, Evidence page, settings service and card, test case View, and regional-format suites.
- Simulator: 9 across the practice evidence service and the row.

### Root cause found and fixed (2026-10-05)

The real cause of the "Object not found" / "Bucket not found" errors on View: the
`testing-centre-evidence` **storage bucket itself was never created**. The code has
referenced it since `v494`, but nothing ever ran a `storage.buckets` insert for it, so
every upload and every "open file" was failing, not just the seed rows. Fixed in
`SQL/v1205_test_evidence_storage_bucket.sql`: creates the bucket and adds
`storage.objects` SELECT/INSERT policies scoped to the project behind each file (via a
new helper, `test_evidence_object_can_access`, that reads the execution id out of the
`executions/<id>/<file>` path and defers to the existing `auth_user_can_access_project`).
This is required for the **Attach file** button to work for real users too, not only for
the seed data. `v1205` has been run. The 13 seed rows from `v1203`/`v1204` now have real
placeholder files uploaded to their storage paths (via a one-off local script using the
service-role key, not committed to the repo), so View resolves on all of them. The
placeholders are minimal valid files (a 1×1 PNG, a one-line PDF, plain text, a sample CSV)
— not real screenshots — just enough that opening them doesn't error. A tester's own
upload through **Attach file** is a real file and unaffected by this.

### Open items for the owner

1. **Project Manager removal (role mismatch).** The UI uses `useProjectRole().canEdit`, which includes PMO admins, portfolio and programme managers. The Platform RLS update policy (`SQL/v1201`) uses `is_project_manager`. A user the UI allows may be refused by the database. Decide the role set and align both.
2. **Simulator organisation default.** Practice projects are owned by a user (`sim.practice_projects.user_id`) and have no account link. Decide where the Simulator's default lives.
3. **Simulator Evidence page and settings card.** The Simulator has no Evidence page or route for it, and no settings card. Adding the menu item needs a DB menu seed (rule 25.1).
4. **Shared confirm dialog.** Remove uses `window.confirm`. Replace with the shared confirm modal.
5. **RLS test.** Cross-project read and write, uploader rule, owner rule. Needs a live database.
6. **Card/Table toggle on the Evidence page** (PRD story 14).
7. **Clean-up:** the soft-delete columns added to `tc_evidence_files` in `SQL/v1200` are unused and can be dropped.
7a. **Seed data:** `SQL/v1203_seed_test_evidence_seed334_prj08.sql` seeds 1 suite, 3 cases, 1 run, 3 executions (2 passed, 1 failed with a defect), and 3 evidence rows for `SEED334-PRJ-08`, so the Passed/Failed/All filters all have rows. It cannot place real files in the storage bucket from SQL, so "open file" on a seeded row will not resolve to a real object — only a live upload through the execution screen does.
8. **Embed names.** The Evidence page query uses PostgREST embeds (`users!uploaded_by`, `test_case_executions!test_case_execution_id`, `defects!defect_id`). They are not verified against the live schema. If the page shows an error, check these names first.

### Notes

- Simulator copies of Platform files are identical (apart from line endings). Two earlier Simulator copies were removed because they pointed at the wrong tables.
- `@nidus/shared/utils/testEvidenceRequirement` resolves to each app's own `src/utils`. Identical copies are kept in `packages/shared`, `apps/platform` and `apps/simulator`.
