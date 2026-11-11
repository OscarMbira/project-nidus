# v1339 — Banking & Financial Services: Change Management and Training workstreams — Implementation Plan

**PRD:** `projectprd/v1339_fin_change_management_and_training_workstreams_PRD.md` (approved 2026-11-11; decisions D1–D10 settled)
**Status:** Implemented 2026-11-11 (owner approved the plan, including one strategy per project). The owner runs the SQL — see Review.
**Approach:**
- Thin vertical slices, test first for the one engine change.
- Everything else is register definitions, menus, access and sample data in SQL, generated from one definition per area (the same generator used for v1394–v1402).
- SQL numbers are taken from the folder immediately before each file is created (rule 18.0). The owner runs all SQL.

## Settled decisions this plan implements

| # | Decision |
|---|---|
| D1 | The two new sidebar sections go after **Testing & Assurance**: Change Management, then Training, then Cutover. Categories move as follows: Change Management 604, Training 605; Cutover 604 → 606, Operational Readiness 605 → 607, Go-Live 606 → 608, Hypercare 607 → 609. |
| D2 | **Operational Readiness → Training** stays as it is, as the per-course readiness view. The guides explain the split. |
| D3 | A separate **Change Communications & Engagement** register. |
| D4 | No new role. Existing roles only. |
| D5 | **Adoption Tracking** goes in Change Management. |
| D6 | Readiness score = average of the 5 dimension scores (1–5), shown as a % and worked out on save. This needs a new engine calculation type, **`average`**. |
| D7 | Attendance & Assessment: one record per **session** (counts and a follow-up table), not per learner. |
| D8 | Both strategies also ship as **system templates**, with a vendor-neutral content check. |
| D9 | Mixed dating. Everything is consistent with today (11 Nov 2026), except Adoption Tracking and post-go-live Training Effectiveness, which are simulated after the April 2027 go-live. |
| D10 | Extra menu roles beyond the delivery-team group: project_sponsor, project_board_member, financial_programme_manager, pm_project_assurance, internal_auditor, risk_compliance_manager, pm_team_member, learning_development_specialist. |

**One additional design point, flagged for approval:** both strategy registers are document registers. They get `is_document` and the document status workflow, and, like the Data Migration Strategy (v1339 SQL), `one_record_per_project = TRUE` and `versioned = TRUE`. This enforces "one current document per project" and keeps a content history.

## Modules touched

| Area | Change |
|---|---|
| `packages/shared/src/utils/registerCalculations.js` | New calculation type **`average`**: `{ op: 'average', fields: [...], of?: number, decimals?, display? }`. It averages the fields that have a number. With `of`, the result is shown as a % of that maximum, so 3.8 of 5 shows as 76. It is empty when no field has a value. Used by any register. |
| `packages/shared/src/utils/__tests__/registerRunbookEngine.test.js` (or a new `registerCalculations.average.test.js`) | Tests, written first. |
| SQL (monorepo) | 1. Change Management: 8 registers, fields and tabs, statuses, document switch, menus, pack links, role access. 2. Its sample data. 3. Training: 10 registers, same structure. 4. Its sample data. 5. Category sort-order move (D1). 6. The two system templates. Exact file split and numbers are set at build time. |
| Admin repo | Nothing. ID Generation already covers `public.local_register_records`, and the LREG rule handles numbers past 999 since Admin v247. |
| Docs | `Documentation/FIN_Change_Management_Registers_Guide.md` and `Documentation/FIN_Training_Registers_Guide.md` (generated from the same definitions); additive lines in `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` (rule 70). |
| App UI | No change expected. If a form or export gap appears, it is fixed in `packages/*` with tests, and Platform and Simulator get it together. |

## Registers

IDs: `00000000-0000-4000-9001-000000000044` onwards, all checked unused on 2026-11-11.

**Change Management** (`fin_cat_change_management`, register menus sorted from 720)
| ID | register_key | Label | Kind |
|---|---|---|---|
| …044 | fin_change_strategy | Change Management Strategy | document |
| …045 | fin_change_impacts | Change Impact Assessment | register |
| …046 | fin_change_readiness | Change Readiness | register (average score, D6) |
| …047 | fin_change_network | Change Network | register |
| …048 | fin_change_communications | Change Communications & Engagement | register |
| …049 | fin_change_resistance | Resistance & Concerns | register |
| …04a | fin_change_adoption | Adoption Tracking | register (simulated post-go-live readings, D9) |
| …04b | fin_change_sign_off | Change Sign-Off | register |

**Training** (`fin_cat_training`, register menus sorted from 730)
| ID | register_key | Label | Kind |
|---|---|---|---|
| …04c | fin_training_strategy | Training Strategy | document |
| …04d | fin_training_needs | Training Needs Analysis | register |
| …04e | fin_training_curriculum | Curriculum | register |
| …04f | fin_training_materials | Training Materials | register |
| …050 | fin_training_trainers | Trainers | register |
| …051 | fin_training_sessions | Training Sessions | register (duration, fill rate) |
| …052 | fin_training_attendance | Attendance & Assessment | register (per session, D7, pass rate) |
| …053 | fin_training_environment | Training Environment | register |
| …054 | fin_training_effectiveness | Training Effectiveness | register (part simulated post-go-live, D9) |
| …055 | fin_training_sign_off | Training Sign-Off | register |

Sample ID prefixes: `b044`–`b055`, matching the register IDs and all checked unused. Template IDs are taken from an unused `b339-…` range, checked at build time.

## Todo

### Slice 1 — Engine: `average` calculation (D6), test first
- [x] 1.1 Write the failing tests:
  - averages the given fields;
  - ignores empty values;
  - empty when none are set;
  - with `of: 5` and `display: 'percent'`, 3.8 shows as 76%;
  - `decimals` respected;
  - works in field order after other calculations.
- [x] 1.2 Add `average` to `evaluateCalculation`, which is enough to pass. Re-run the shared suite and the register tests in both apps (rule 43).
- [x] 1.3 Add `average` to the register engine notes in the guides. The seed generator mirrors the rule.

### Slice 2 — Change Management section (registers, menus, access)
- [x] 2.1 Definitions file: 8 registers with fields, tabs, tables (rule 67.1), calculated fields and statuses. The strategy reuses the standard document field set (Document Control, Glossary & Appendices, Version History as tables).
- [x] 2.2 SQL:
  - registers (`is_system_defined`, `scope_level = 'project'`), fields, and the document switch for the strategy;
  - category and register menu items;
  - `local_register_industry_packs` and `industry_pack_menu_items`;
  - `grant_menu_role_group('fin_cat_%')` and `('fin_reg_%')`, plus the D10 role grants in the v1343 style;
  - `database_tables` is not affected, because no new table is created.
- [x] 2.3 Check queries: fields and tabs per register, menu items, and roles per menu.

### Slice 3 — Change Management sample data
- [x] 3.1 10 records per register and one complete Draft strategy document, for SEED334-PRJ-08, consistent with today. Adoption readings are simulated after go-live (D9).
- [x] 3.2 The generator validates every value and refuses "into" and stray `;`. Display IDs are left blank. ID ranges were checked free immediately before writing.

### Slice 4 — Training section (registers, menus, access)
- [x] 4.1 Definitions file: 10 registers. Calculated fields: session duration and fill rate, pass rate, and the completion and score percentages.
- [x] 4.2 SQL and check queries, as in 2.2–2.3.

### Slice 5 — Training sample data
- [x] 5.1 10 records per register and one Draft Training Strategy. Sessions run January–March 2027, and part of the effectiveness data is simulated after go-live (D9).

### Slice 6 — Sidebar order (D1)
- [x] 6.1 Move the category `sort_order` values (604–609). Check that no other pack's level-1 categories use 604–609 for the same layout; none were found on 2026-11-11.

### Slice 7 — System templates (D8)
- [x] 7.1 Template content modules for both strategies, plus a content check (no vendor, product, trademarked method or person names).
- [x] 7.2 Template SQL (`local_register_templates`, `template_scope = 'system'`), upserted by fixed ID, with a version bump when content changes (the v1378 pattern).

### Slice 8 — Close-out
- [x] 8.1 Guides (generated) and taxonomy lines (additive, marked "(v1339)").
- [x] 8.2 Retest suites (shared, ui, both apps' register tests), lint, and the shared-drift check.
- [x] 8.3 REVIEW.md checks, a review section in this plan, and memory. Ask before committing or pushing.

## SQL run order (owner)
1. Change Management registers
2. Change Management sample data
3. Training registers
4. Training sample data
5. Sidebar order
6. System templates

Exact file names are set at build time and listed in the review.

## Risks
- **Sidebar order:** moving the Banking categories (D1) changes the existing order. Only the Banking pack's level-1 categories are touched. Mitigation: a check query lists the order before and after.
- **Engine change:** `average` adds a calculation type to every register form. It is additive, and the existing calculation tests and new tests cover it.
- **Supabase editor traps:** no "into" in the text and no SELECT … INTO, enforced by the generator. LREG IDs past 999 are fixed by Admin v247, which has already run.
- **Overlap with Operational Readiness → Training (D2):** users may not know which register to use. Mitigation: the guides and register descriptions spell out the split (design and delivery vs readiness view).
- **Simulator:** no Banking menu exists in the Simulator, the same as all FIN registers (PRD out of scope).

## Review

### Review Summary
- Change: two new Banking & Financial Services workstreams.
  - Change Management: 8 registers.
  - Training: 10 registers.
  - Each has menus, role access, sample data, 2 system templates and the engine `average` calculation.
- PRD: `projectprd/v1339_fin_change_management_and_training_workstreams_PRD.md`
- Implementation plan: this file.
- Roadmap area: Banking & Financial Services industry pack. No strategic change.
- Review mode: STANDARD
- Decision: **PASS WITH CONDITIONS.** The owner runs the SQL and checks the pages in the browser.
- Highest severity: LOW
- Regression risk: LOW.
  - The engine change is additive (`average`). `difference` is now rounded to 6 places, which leaves whole numbers unchanged.
  - The sidebar order of the Banking sections changes by design (D1).
- Database impact: LOW. Only rows change (registers, fields, menus, grants, sample data, templates); there are no new tables, columns or policies.
- Security impact: LOW.
  - Menu grants only show pages. Data access is still limited by project membership (RLS) and sign-off rules.
  - No RLS, function or policy changes.

### SQL — run in this order (all in `E:\project-nidus\SQL\`)
1. `v1403_fin_change_management_registers.sql`:
   - 8 registers (…044–…04b) with fields and tabs;
   - the strategy as a document register (one per project, versioned);
   - the Change Management section (sort 604) and its menus (720–727);
   - pack links, `grant_menu_role_group`, and the D10 extra roles.
2. `v1404_fin_change_management_seed.sql`: 71 sample records (1 strategy plus 10 per register), IDs b044–b04b.
3. `v1405_fin_training_registers.sql`: 10 registers (…04c–…055) and the Training section (605) with its menus (730–739).
4. `v1406_fin_training_seed.sql`: 91 sample records, IDs b04c–b055.
5. `v1407_fin_sidebar_order_change_training.sql`: Banking section order. Change Management 604 and Training 605; Cutover, Operational Readiness, Go-Live and Hypercare move to 606–609.
6. `v1408_fin_change_training_strategy_system_templates.sql`: the 2 system templates (b339-…001 and …002).

Each file ends with a check query.

### Code
- `packages/shared/src/utils/registerCalculations.js`:
  - new **`average`** calculation `{ op: 'average', fields, of?, decimals? }`, which averages the fields that have a number; with `of`, the result is a % of that maximum;
  - **`difference`** is now rounded (`decimals`, default 6), so 3.4 − 4 gives −0.6 instead of −0.6000000000000001. This was a bug users could see.
- Test: `packages/shared/src/utils/__tests__/registerCalculations.average.test.js` (7 tests, written first).
- The sample data was calculated with the app's own `registerCalculations.js`, imported directly by the generator.

### Changes from the plan
- **Elapsed time.** The session duration field is labelled "Elapsed Time": a multi-day course shows the time from first start to last end.
- **Total training hours dropped.** The engine has no multiply, so Training Needs Analysis keeps hours per person only.
- **Template content.** In the system templates, person names become [Name], dates are blank, bank, release and document references become [placeholders], and the audience "People" columns become [Number].

### Findings
- **[LOW] Hypercare samples show old floating-point noise.** v1402 stored two variance values with noise: −0.199… on PM-02 and 0.599… on PM-04. They correct themselves when those records are next saved. No action is needed.

### Validation Evidence
- Type/lint: ESLint shows no errors on the changed engine and test files. The shared-drift check reports 0 overrides and 0 shadow files.
- Unit:
  - `packages/shared`: 1126 passed, 6 failed. The 6 were already failing and are unrelated: checkpointReportExport ×4, ianaTimezoneOptions, queryRouter. The new `average` and `difference` tests pass.
  - `packages/ui`: 265 / 265.
  - Platform register pages: 22 / 22.
  - Simulator register pages: 10 / 10.
- SQL:
  - the libpg-query parse check passes on v1403–v1408;
  - the generator validated every sample value against its field definition;
  - no bare "into" (Supabase editor trap) and no stray `;` in the seeds;
  - register IDs, seed prefixes, template IDs and menu sort orders were checked unused before writing.
- Integration / E2E / Build: not run. No app routes or components changed.
- Manual: not done. Owner check in the browser below.

### Not Verified
- The SQL has not been run against the database. The owner runs it.
- The pages have not been seen in the browser: the sidebar sections, tabs, document sign-off, templates and exports for the new registers.

### Remaining Risks
- **Sidebar order.** The Banking section order changes (D1). The v1407 check query lists the final order.
- **Who can see the menus.** Visibility depends on the `delivery_team` role group and the D10 roles existing as global roles. The v1403 and v1405 check queries show how many roles can see each menu.
- **Overlap with Operational Readiness → Training (D2).** The guide explains the split.
- **Simulator.** There is no Banking menu in the Simulator, the same as for all FIN registers.

### Final Decision
PASS WITH CONDITIONS. Run v1403–v1408 in order, then check in the browser:
1. Both sections appear between Testing & Assurance and Cutover.
2. Each register shows its tabs and 10 records.
3. A Change Readiness record shows its score as a percentage.
4. New → From template offers the two strategy templates.
5. The strategy documents can start sign-off.
