# v1342 — One Environments form — Implementation plan

**PRD:** `projectprd/v1342_merged_environments_register_PRD.md` (D1–D10 confirmed 2026-11-14)
**Status:** Approved 2026-11-14 — in progress.
**Apps:** Platform + Simulator (rule 34.1). Admin: none.
**SQL:** next free numbers at creation time (rule 18.0). Expected v1467–v1469. The owner runs all SQL.

## Facts from the codebase (no need to ask)

- **Register records:** live in `public.local_register_records` (`register_id`, `display_id`, `title`, `description`, `status`, `field_values`, `account_id`, `project_id`, `record_project_id`). Display IDs come from one engine-wide Admin rule (`trg_local_register_records_admin_display_id`, LREG-…), so no new Admin `id_generation_rules` row is needed. The Simulator uses `sim.local_register_records` (`is_system_register`, `record_project_id`) against the public system definitions.
- **Pattern:** the v1445 Policies & Compliance move is the model for "thin hand-built page → core system register". Core register id block `00000000-0000-4000-9100-…`; `…001` is taken, `…002` is free.
- **Field conditions:** `isFieldVisible` / `groupRegisterFields` (`packages/shared/src/utils/registerFieldGroups.js`). Used by both apps' `LocalRegisterForm.jsx` / `LocalRegisterDetailPage.jsx`, `registerRecordExport.js`, `registerDocumentModel.js` and `registerPlaceholders.js`.
- **Test suites:** `test_suites.environment_ids` (JSONB array of `test_environments.id`). Picker: `TestSuiteForm.jsx` + `testEnvironmentService.js` / `practiceTestEnvironmentService.js` (both apps).
- **Project industries:** `project_industries` (`added_at`), else `projects.industry_category_id`. Simulator: `sim.practice_project_industries`. The loader exists (`loadProjectMenuContext`).

## Key design choices (within the approved decisions)

1. **Same ids, so no link remap.**
   - Core `test_environments` rows are copied to the register with the same `id`, as v1445 did. `test_suites.environment_ids` keeps working unchanged.
   - Banking and IT records are re-pointed (`register_id` updated), not copied, so their id, display ID, documents, links and audit history stay as they are.
   - Each moved record keeps `field_values._moved_from` (old register key or table) so the move can be reversed (story 17).
2. **Description, not a Purpose field (clarifies D5).** The engine already has a built-in Description. Core Description and IT Purpose both go there, so the form does not show Description and Purpose side by side (rule 62).
3. **Environment Owner** stays a person picker (Banking). *Found at implementation:* the engine's person picker stores plain names (v1), and both the Banking and IT samples hold names, so owners carry across unchanged and no mapping is needed.
4. **Industry tab condition (D9):** `visible_when: { project_industry: ['Banking & Financial Services'] }`, matched on `industry_categories.name`, which is stable and readable. The form, record view, export and document all receive the open project's industry names. Without a project context (e.g. organisation scope), industry fields stay hidden.

## Merged field set (D3) — tabs

- **Details:** Environment Type (union of the Banking and IT types), Environment Code, Used By, Hosting Model, Data Centre / Site (non-cloud / hybrid), Environment Owner.
- **Cloud Setup** (cloud / hybrid): from Banking. "Connectivity to the Bank" becomes "Connectivity to the organisation".
- **Cloud Compliance** (cloud / hybrid): from Banking, neutral wording ("Organisation-managed keys", "Organisation hardware security module").
- **Infrastructure** (non-cloud / hybrid): from Banking.
- **Connection Details:** host, IP address, mount point, ports, URL.
- **Database:** from Banking, including managed service.
- **Availability & Refresh:** requested, provisioned, available from / to, needed by, ready date, refresh frequency, last refresh, deployed build / release, application version, test data.
- **Access & Bookings:** teams / users with access, access approver, named users, bookings table.
- **Health & Issues:** availability target %, monthly running cost, issues table, components table (from IT).
- **Banking** (Banking projects only): Banking Component.
- **Notes.**

**Statuses (D6):** Not Provisioned · Provisioned · Ready · In Use · Issue · Decommissioned.

## Slices (tracer bullets — each one usable end to end)

### Slice 1 — Engine: industry-only fields (both apps)
- [x] `isFieldVisible(field, values, ctx)` / `groupRegisterFields(fields, values, ctx)` accept `ctx.projectIndustries` (names) and handle `visible_when.project_industry`. Existing field-value rules are unchanged.
- [x] A small hook `useRegisterProjectIndustries(projectId)` in `@nidus/shared` (app read from AppConfigContext) returns the record's project industry names, cached per project (rule 66). The cache is cleared when Project Edit saves industries.
- [x] Instead of passing a context into every builder: `registerForProjectIndustries(register, names)` filters the definition once in `LocalRegisterForm` and `LocalRegisterDetailPage` (both apps). The tabs, exports, document and placeholders built from it follow automatically. Template editing shows all fields.
- [x] Tests: hidden without the industry, shown with it, composite, combined with the hosting condition, no context → hidden.

### Slice 2 — SQL: the Environments register (v1467)
- [x] Register `core_environments` (`…9100-…002`), scope `project`, statuses as above, the fields and tabs above. The Banking tab field carries the industry condition.
- [x] Register in `database_tables` is not needed (no new table).
- [x] Check query: field and tab counts.

### Slice 3 — SQL: move the records (v1468)
- [x] Core `public.test_environments` → register records, same id. Active → Ready, inactive → Decommissioned. Name → Title, Description → Description, audit columns kept.
- [x] Banking (`fin_core_banking_environments`) and IT (`ict_environments`) records: `register_id` → the new register. Field keys mapped (e.g. Banking `environment` / IT `environment_type` → `environment_type`; IT `hosting` → `hosting_model`; IT `purpose` → Description when empty; Banking `component` → `banking_component`). `_moved_from` stored.
- [x] Simulator: `sim.practice_test_environments` → `sim.local_register_records` (same id, `is_system_register = TRUE`). Same re-point for sim Banking / IT records.
- [x] Old Banking and IT environment registers set `is_active = FALSE`. Old tables kept, comment added. Nothing deleted.
- [x] Self-check query: per project, old core + Banking + IT = merged count; every `environment_ids` entry resolves; nothing left on the old registers.

### Slice 4 — Test suites read the register (both apps)
- [x] `fetchEnvironments` in both apps' environment services reads the register's records for the project, leaving out Decommissioned (same `{ id, name }` shape, so `TestSuiteForm` is unchanged).
- [x] The "manage environments" links keep their old addresses, which now redirect to the register (slice 5). Test runs use the same list function, so they read the register too.
- [x] Tests for both services.

### Slice 5 — Menus and old addresses (v1469 + routes)
- [x] `plat_pm_testing_environments` route → the register. The Simulator has no Environments menu item (practice testing pages link to it), so only the redirect applies there. Roles that only had an industry Environments page (Team Lead / Team Manager) get the core entry plus its grant.
- [x] Banking / IT environment menu items and placements off. The `environments` slot is off again. The IT Environments category placement is off.
- [x] Routes: `/platform/testing/environments…` and the Simulator equivalent redirect to the register (`navigate(replace)`). A switched-off register key that has a `moved_to` register redirects too: the register list / detail pages check `local_registers.moved_to_register_id`, a new nullable column, added and set in v1468 (with the switch-off).
- [x] Taxonomy (rule 70, additive line). Placement note in the v1341 plan. `Consolidated_Role_Menus_Proposal.md` is **not** edited (owner instruction) — the plan review notes the placement instead.
- [ ] Audit: re-run `SQL/v1452` (A–D) and `SQL/v1465` (C: no same-name pair left) — owner, after running v1467–v1469.

### Slice 6 — Review and docs
- [x] `Documentation/Merged_Environments_Register_v1342_Guide.md` (user guide + rollback steps).
- [ ] REVIEW.md checks; retest suite (rule 43); review section added here.

## Risks

- **Field-key mapping errors on moved records:** the self-check query compares counts and lists unmapped keys. `_moved_from` allows reversal.
- **The hand-built core page still imported elsewhere** (e.g. a Testing Centre summary): grep for `testEnvironmentService` use before switching. Readers move to the register in slice 4.
- **The Supabase editor "into" trap:** no SELECT INTO / RETURNING INTO / temp tables. Keep "into" out of the comment text.

## Review

**Implemented 2026-11-14** (Platform + Simulator).

**Code**
- **Engine:**
  - `registerFieldGroups.js`: `filterFieldsForProjectIndustries` / `registerForProjectIndustries`.
  - New hook `@nidus/shared/hooks/useRegisterProjectIndustries`.
  - `LocalRegisterForm` / `LocalRegisterDetailPage` (both apps) filter the definition by the record's project industries.
  - List / record / form pages redirect a retired register (`moved_to_register_id`) to its successor.
  - `ProjectsEdit` clears the industry cache on save.
- **Environments:**
  - `@nidus/shared/utils/environmentRegister.js`: register id, record → environment shape, old-address mapping.
  - `getTestEnvironments` / `getPracticeTestEnvironments` (both apps) read the register, keeping the same shape and ids. Test suites and runs are unchanged.
  - `@nidus/ui/EnvironmentsRegisterRedirect` replaces the old core Environments routes in both apps.
- **Fixed on the way (v1341):** `loadProjectMenuContext` read a missing column (`project_industries.created_at`).

**SQL** (owner run)
- v1467: the register, 59 fields, 10 tabs.
- v1468: record move, `moved_to_register_id`, self-check.
- v1469: menus, grants, slot off. Run 2026-11-14: core entry under Project Settings for pm, portfolio, programme and team; no slot; no retired item left on.

**Tests**
- Shared: registerFieldGroups 13, environmentRegister 9, useRegisterProjectIndustries 4, consolidatedMenuData 12.
- Config: consolidatedMenu 34.
- App services: 4 + 4.
- Regression: Platform testing + local registers 72, Simulator 29.
- Lint: no new errors. Remaining errors are old ones in `ProjectsEdit` and `LocalRegisterListPage`.

**Open (owner)**
- v1468 self-check results (A counts, B unresolved suite links — expect none, C left behind — expect 0).
- `SQL/v1452` and `SQL/v1465` audits.
- Smoke test per the PRD: untagged, Construction, Banking, Banking + IT and Simulator projects; test suite picker; an old bookmark.

**Notes**
- `Consolidated_Role_Menus_Proposal.md` was not edited (owner instruction 2026-11-13). The placement is recorded here and in the taxonomy.
- v1466 (the Environments tab strip) is superseded by v1469. The engine support it added (slots inside a sub-menu, industry-named tabs, register-key aliases) stays and is used by other slots.
