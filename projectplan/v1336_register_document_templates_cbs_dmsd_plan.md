# v1336 — Register Document Templates + CBS DMSD Template — Implementation Plan

**PRD:** `projectprd/v1336_register_document_templates_cbs_dmsd_PRD.md`
**Status:** Approved 2026-10-24 · code complete 2026-10-25 · SQL not yet run (owner runs, see Review).
**Approach:** vertical slices, test-first (App_Guide); Platform and Simulator together (rule 34).
The owner runs all SQL.

## Modules touched

| Area | Files (new ★ / changed ✎) |
|---|---|
| SQL (monorepo) | ★ v1336 templates schema (3 tables public + sim, register switches, provenance columns, bucket + storage rules, RLS, registry) · ★ v1337 template functions (create record, save, customise, update, archive, add annexure) · ★ v1338 Sample v2 additions (PRD d.6) · ★ v1339 one-per-project + version history · ★ v1340 SQL tests · ★ v1341 CBS DMSD system template content (strategy + 33 product children) · ★ v1342 replace LREG-2026-105 from the template · ★ v1343 Data Migration menu grants per role · re-run v1326, v1251 |
| SQL (Admin repo) | ★ v244 ID Generation rule for `local_register_templates` (public + sim) |
| Seed files | ★ `scripts/seed-cbs-dmsd-template-annexures.mjs` (generic annexures → template bucket) · ★ `scripts/check-cbs-dmsd-template.mjs` (content check) · ✎ `scripts/seed-data-migration-strategy-annexures.mjs` (neutral files, removes old files) · ★ `Design Images/seed/cbs-dmsd-template/*.png`, `Documents/seed/cbs-dmsd-template/*.docx|xlsx` (no bank / vendor names) |
| Shared | ★ `packages/shared/src/services/localRegisterTemplateService.js` · ★ `packages/shared/src/utils/registerPlaceholders.js` |
| UI (`@nidus/ui`) | ★ `RegisterTemplatePicker.jsx` (New → Blank / From template) · ★ `RegisterTemplatesTab.jsx` (Card/Table list) · ★ `SaveAsTemplateDialog.jsx` · ★ `PlaceholderBanner.jsx` |
| Pages (both apps) | ✎ `LocalRegisterListPage.jsx` (New choice, Templates tab) · ✎ `LocalRegisterDetailPage.jsx` (Save as template, placeholder banner, provenance on Audit) · ✎ `LocalRegisterForm.jsx` (template mode) · ✎ routes (`…/templates/:templateId/edit`) |
| Docs | ★ `Documentation/Register_Document_Templates_v1336_Guide.md` · ✎ v1318 guide (link) |

## Todo

### Slice 0 — Prep
- [x] 0.1 Confirm current Migration Strategy + Data Scope field keys/types (post v1316–v1333) and the seed record's children.
- [x] 0.2 Confirm how list pages resolve the project scope and the PMO Admin / PM role checks used elsewhere.

### Slice 1 — Engine: system template → New from template (both apps)
- [x] 1.1 SQL v1336 schema + v1337 create-record function + v1340 tests.
- [x] 1.2 Admin v244 ID rule.
- [x] 1.3 `localRegisterTemplateService` (list, get, create record, copy annexure files) + unit tests.
- [x] 1.4 `RegisterTemplatePicker` + list page New choice; opens the new record. Tests.
- [x] 1.5 Provenance on the Audit tab; complete-document preview of a template.

### Slice 1b — Sample v2 additions (PRD d.6)
- [x] 1b.1 SQL v1338: strategy fields A1–A11, options B1–B2, Sign-Off Department column (B3); Data Scope C1–C6 (Migration Steps → table, existing lines kept). Parse-check, field/tab counts.
- [x] 1b.2 Retest register pages, document export (new tables render).

### Slice 2 — CBS DMSD content
- [x] 2.1 Generic content authoring from both samples (superset, placeholders, vendor-neutral) → v1341.
- [x] 2.2 33 Data Scope children with generic per-product rules.
- [x] 2.3 Generic annexures (diagrams/forms without bank names) + upload script.
- [x] 2.4 Content check script (banned names, product ↔ child coverage).

### Slice 3 — Placeholders
- [x] 3.1 `registerPlaceholders` util + `PlaceholderBanner` on view/edit pages. Tests.

### Slice 4 — Organisation templates
- [x] 4.1 v1337 save / customise / archive functions + tests (role checks, account isolation).
- [x] 4.2 `SaveAsTemplateDialog` on records; `RegisterTemplatesTab` (Preview, Use, Customise, Edit, Archive).
- [x] 4.3 Template edit page (form in template mode, children and annexures).

### Slice 4b — One strategy per project + version history
- [x] 4b.1 SQL: register switches, one-per-project trigger, `local_register_record_versions` + versioning trigger (public + sim), append-only RLS; switch on for fin_migration_strategy; drop Superseded from its workflow; tests.
- [x] 4b.2 New / New from template refuse a second strategy ("open existing").
- [x] 4b.3 "Version N" on the record; Audit tab version list with old → new per field (both apps). Tests.

### Slice 5 — Seed alignment
- [x] 5.1 v1342: remove LREG-2026-105 + its Data Scope records + annexure rows; re-create from the template (same project); annexure files via script.

### Slice 6 — Close-out
- [x] 6.1 Retest suites, lint, drift check; Simulator check.
- [x] 6.2 REVIEW.md checks; guide; review section; ask before commit/push.

## Risks
- Content volume (strategy 71 fields + 33 products) — generated from one authoring module, checked by `scripts/check-cbs-dmsd-template.mjs`.
- Storage copy between buckets needs both read and write rights — covered by storage rules + tests.
- Replacing the seed record removes the current example's edits — owner decision 7.

## Review

**Delivered (2026-10-25).** All slices code-complete; the owner runs the SQL.

| Slice | Result |
|---|---|
| 1 Engine | v1336 / v1337 (public + sim), Admin v244 (RTPL / SRTP). `localRegisterTemplateService`; New → Blank / From template; complete-document preview of a template; provenance on the Audit tab. |
| 1b Sample v2 | v1338: 12 strategy fields (A1–A11), Staging environment, Raw data / Functional reconciliation, Sign-Off Department column; Data Scope Migration Method, Responsible Party, pre / post actions, manual updates, Migration Steps as a table, Nostro / vostro product. |
| 2 Content | v1341: CBS DMSD system template — 71 strategy fields, 33 Data Scope children (one per product, steps / rules / accounting / checks), 38 distinct placeholders, generic annexures A–D (`seed-cbs-dmsd-template-annexures.mjs`). `check-cbs-dmsd-template.mjs` passes (no bank, vendor, product or people names; every selected product has a child). |
| 3 Placeholders | `registerPlaceholders` + `PlaceholderBanner` on view and edit. |
| 4 Organisation templates | Save as template, Templates tab (Preview, Use, Customise, Edit, Archive), template edit route in both apps. |
| 4b One per project + versions | v1339 trigger + `local_register_record_versions`; "Open …" instead of New; "Version N"; version list (before → after) on the Audit tab. |
| 5 Seed | v1342 re-creates LREG-2026-105 (same id and display ID) and 33 Data Scope records from the template; the record annexure script now attaches the neutral files and deletes the old ones. The old sample annexures (vendor product names in the diagrams, form and RACI) were removed from the repo. |
| Menus | v1343 grants the Data Migration menus to 10 finance, assurance and data roles. No menu structure change, so the taxonomy is unchanged. |

**Tests.** `@nidus/ui` 247 passed. `@nidus/shared` utils + services: 948 passed, 6 failed — all in `checkpointReportExport`, `ianaTimezoneOptions` and `queryRouter`, unchanged since July and not using any changed file (jsdom / `Intl` environment; not from this work). Platform local registers 21 passed, Simulator 9 passed. SQL tests: v1340 (T1–T9), run by the owner. All new SQL parses (`libpg-query` 16, PL/pgSQL 17); the parser checks syntax, not column names, so the first live run is the real check.

**Checks.** Shared drift check clean. ESLint on the new scripts: only `console` / `fetch` / `URL` no-undef, which every existing script in `scripts/` also gets (the ESLint config has no Node globals for that folder).

**SQL run order (owner).** v1318–v1335 first, then: v1336 → Admin v244 → v1337 → v1338 → v1339 → v1340 (tests) → v1341 → `node scripts/seed-cbs-dmsd-template-annexures.mjs` → v1342 → `node scripts/seed-data-migration-strategy-annexures.mjs` → v1343 → re-run v1326 → re-run v1251. Do not re-run v1329–v1331 after v1342.

**Remaining risks.** (1) Nothing is verified against the live database until the SQL is run. (2) Simulator users see the system template through the public schema; Simulator has no FIN menus, so it is reachable only where a Simulator document register exists. (3) Template content is a starting point — legal / regulatory wording must be reviewed by each organisation.

Guide: `Documentation/Register_Document_Templates_v1336_Guide.md`.
