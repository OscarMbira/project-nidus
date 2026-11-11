# v1338 — IT Requirements Specification — Implementation Plan

**PRD:** `projectprd/v1338_ict_requirements_specification_PRD.md` (decisions D1–D12, owner 2026-11-09)
**Status:** Approved by the owner 2026-11-09 · Implemented (code + SQL files) 2026-11-09 — SQL to be run by the owner (see Review).
**Apps:** Platform + Simulator (rule 34.1). Admin: one ID Generation rule seed (Admin v245).
**SQL numbering:** each file takes max + 1 of `SQL/` at the moment it is written (rule 18.0) — numbers
below are placeholders (`vA`, `vB` …), not reservations.

---

## 1. Facts found in the codebase (2026-11-09)

| Area | Fact | Consequence |
|---|---|---|
| Requirements register | `public.requirements_register` (v357/v877) and `sim.requirements_register` (`practice_project_id`, v369). Columns: code, name, description, category (6 values), source stakeholder, MoSCoW priority, status, acceptance criteria, traceability tag, version. | New columns (D4/D5) go into **both** tables in one migration. Owner runs it in the Supabase SQL editor (no DB password in agent session). |
| Requirement pages | Platform + Simulator `pages/scope/RequirementsRegister.jsx`, `RequirementDetail.jsx`; services `requirementsRegisterService.js` (save sends explicit columns). Detail form already has tabs Details / Acceptance / Traceability / Audit (this session). | New fields added to the existing tabs; service payload extended **only after** the columns exist. |
| Register list filters | `RequirementsRegister.jsx` filters by status + search only; no category filter, no URL query. | Add category filter + `?category=` via `useInitialFilterFromQuery` (rule 64 pattern). |
| Traceability | `requirements_traceability_matrix` (public + sim); page `projects/:projectId/scope/traceability`. | Menu link only. |
| Change control | `change_requests` has `related_task_ids / risk / issue / change` UUID[] — **no requirement link**; `sim.change_requests` exists (v1135, v1137, v1138 add columns to both). Pages `pages/change/ChangeRequests.jsx` / `ChangeRequestDetail.jsx` in both apps. | "Requirement Changes" needs `related_requirement_ids UUID[]` (public + sim), a picker on the change form and a list filter. |
| Linked records | `linked_records` field reads **local registers only**: `getRegisterDefinition(linkedRegisterKey(f))` + `listRecords(...)` in `LocalRegisterDetailPage.jsx` (both apps); blocks built by `linkedRecordBlocks` (`registerDocumentModel.js`) for exports and the complete document. | D3 engine slice: a core-table source (`source: "core:requirements"`) resolved by a shared loader, returning the same `{ register, records }` shape so form, view, exports and document reuse the existing block code. |
| Sign-off | `RegisterSignoffPanel` slots come from the organisation's **Document Signatory** configuration (`process_template_signatory_requirements`, document type `local_register:<key>`), per account — no system defaults. | D12: register-level `suggested_signatory_roles` used **only when** the organisation has no configuration for that document type. |
| Templates | v1336 / v1337 (templates tables + functions) are **not on the live database**. | D10 templates ship as SQL; they appear only after the owner runs v1336 + v1337. |
| Lookup data | No generic lookup table; each list has its own table (e.g. `project_types`). | D5b: new small reference table for the 10 non-functional areas (public; Simulator reads the same reference rows). |
| IT menu | Categories `ict_cat_*` (v949, sort 900–910); reuse link `ict_reuse_requirements` under `ict_cat_delivery`; grants via `grant_menu_role_group('ict_re%')` / `('ict_cat_%')`. | New category `ict_cat_requirements` (sort between delivery and architecture); old link deactivated; taxonomy file updated (rule 70). |
| Functional Design | `ict_functional_design` fields `business_requirements`, `functional_requirements` (multi_line, v1324). | D9: replace with a linked core-requirements field; existing text moved to `requirements_notes_legacy`. |

---

## 2. Tracer-bullet slices (rule 17.2)

Each slice is end-to-end (SQL → service → UI both apps → export → tests) and independently shippable.

### Slice 0 — Owner prerequisites (no code)
- [ ] Owner runs `SQL/v1336_register_templates_schema.sql` and `SQL/v1337_register_templates_functions.sql` in the Supabase SQL editor (needed by Slice 9 only).
- [ ] Owner runs the SQL files listed in the Review (owner decision 2026-11-09: run all of them once the plan is complete).

### Slice 1 — Requirement owner, rationale, verification method, non-functional area (D4, D5, D5b)
- [x] `SQL/vA_requirements_register_owner_rationale_area.sql`:
  - `public.requirement_nfr_areas` (area_key PK slug, label, sort_order, is_active) + 10 rows (D5b) + RLS select for authenticated + `database_tables` row + re-run `v1251_planner_table_wall.sql` note (CLAUDE.md DB rule 6). Key is a fixed system slug, not a generated reference (rule 16.2 not applicable).
  - `ALTER TABLE public.requirements_register` and `sim.requirements_register` ADD `owner_name TEXT`, `rationale TEXT`, `verification_method TEXT CHECK (… IN ('test','inspection','demonstration','analysis'))`, `nfr_area_key TEXT REFERENCES public.requirement_nfr_areas(area_key)`.
  - Idempotent (`ADD COLUMN IF NOT EXISTS`, `ON CONFLICT`); RLS policies unchanged.
- [x] Shared loader `loadRequirementNfrAreas()` (packages/shared, sessionStorage cache — rule 66).
- [x] `requirementsRegisterService.js` (both apps): save + read the new columns.
- [x] `RequirementDetail.jsx` (both apps + the two practice copies): Owner + Rationale on Details; Verification Method on Acceptance; Area on Details shown only when Category = Non-functional (SelectField, options from the loader). Humanised option labels; values unchanged.
- [x] `RequirementsRegister.jsx` (both apps): Owner + Area columns, export columns.
- [x] Tests: service payload; form conditional Area; loader cache.

### Slice 2 — Filtered requirement lists (story 15)
- [x] `RequirementsRegister.jsx` (both apps): Category filter (dropdown) + `?category=` read on mount via `useInitialFilterFromQuery`; page title shows the filter ("Functional Requirements").
- [x] Tests: URL → filter; clearing returns to all.

### Slice 3 — IT → Requirements menu category (D7, part 1)
- [x] `SQL/vB_ict_requirements_menu.sql`: category `ict_cat_requirements` after Technology Delivery; items All Requirements · Business · Functional · Non-Functional (`/platform/scope/requirements?category=…`) · Traceability; grants as other ICT items; pack links; deactivate `ict_reuse_requirements`. Simulator mirror if the IT pack menus exist there (check `sim` menu seeds; same pattern as v949).
- [x] Traceability route that resolves the current project (wrapper like `SimRequirementsCurrentProjectRedirect` if the route needs `:projectId`).
- [x] `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` §6 updated (rule 70).
- [x] SQL test: items exist, granted, old link hidden.

### Slice 4 — Use Cases register (D6, D6b)
- [x] `SQL/vC_ict_use_cases_register.sql`: local register `ict_use_cases` (system, IT pack, project scope) + fields:
  Details — Use Case ID, Primary Actor, Priority (MoSCoW), Frequency of Use;
  Actors & Conditions — Secondary Actors, Trigger, Preconditions, Postconditions;
  Flows — Main Flow and Alternative / Exception Flows (`table`: Step | Actor | Action);
  Rules & Links — Business Rules, Related Requirements (codes; multi_line until a requirement picker exists — see Slice 5 note), Related Screens / Reports.
  Status workflow Draft / In Review / Approved / Retired. Menu item under `ict_cat_requirements`; grants; pack link; taxonomy line.
- [x] Engine check: first four fields are list columns (Use Case ID, Primary Actor, Priority, Frequency).
- [x] Tests: register fields pass the field-type check; step table export is numbered steps.

### Slice 5 — Core-table source for linked records (D3) + Requirements Specification register (D1, D1b, D2)
- [x] Engine (packages/shared): `linkedSourceOf(field)` → `{ kind: 'register', key }` | `{ kind: 'core', key: 'requirements', filter }` from `dropdown_options[0]` (`value: "core:requirements"`, optional `category`, `group_by: "nfr_area_key"`).
- [x] Shared loader `loadCoreLinkedSource(db, source, projectId)` returning `{ register, records }` in the local-register shape: a synthetic register definition (fields: Code, Priority, Status, Owner, Verification Method, Acceptance Criteria, Area) and records mapped from `requirements_register` (public: `project_id`; sim: `practice_project_id`).
- [x] Use it in `LocalRegisterDetailPage.jsx`, `LocalRegisterForm.jsx` (read-only section) and the export/document builders (both apps) wherever `getRegisterDefinition(linkedRegisterKey(f))` is used today.
- [x] Grouping for non-functional: one block group per Area (label from the areas table), only areas with items.
- [x] "Open in register" link per chapter → `/platform/scope/requirements?category=…` (sim equivalent).
- [x] `SQL/vD_ict_requirements_specification_register.sql`: document register `ict_requirements_specification` (`is_document = TRUE`) + fields:
  Details — Document Reference, Version, Owner, Next Review Date, **Document Type** (dropdown BRD / FRS);
  Introduction — Purpose, Requirements Overview, In Scope, Out of Scope;
  Summary — Summary of Requirements, Assumptions;
  Business Requirements — linked core (category business);
  Functional Requirements — linked core (category functional);
  Non-Functional Requirements — linked core (category non_functional, grouped by area);
  Use Cases — linked register `ict_use_cases`;
  Glossary & Appendices — Glossary (table), Appendices (table);
  Document Control — Version History (table), Related Documents.
  Standard document statuses; menu item first under `ict_cat_requirements`; grants; pack link; taxonomy line.
- [x] Export: requirements and use cases render as tables (rule 38.1) in PDF / Word / PowerPoint / Print and in the complete document.
- [x] Tests: loader (public vs sim, filter, grouping, empty), blocks, export model, form section read-only.

### Slice 6 — Suggested signatory roles (D12)
- [x] `SQL/vE_local_register_suggested_signatories.sql`: `local_registers.suggested_signatory_roles JSONB` (public + sim) + value on `ict_requirements_specification`: Business Owner, IT / Solution Lead, Project Manager.
- [x] `resolveRegisterSignatorySlots`: when the organisation configuration returns no slots, return the register's suggested roles (source `register_default`); panel text says they are suggestions and editable.
- [x] Tests: configured org wins; fallback used; registers without the setting unchanged.

### Slice 7 — Functional Design uses the linked requirements (D9)
- [x] `SQL/vF_ict_functional_design_linked_requirements.sql`: add `requirements_notes_legacy` (long_text) and copy any existing `business_requirements` / `functional_requirements` text into it (merge, existing wins); replace the two fields with one linked core field "Requirements" (business + functional). Note: re-run after v1324 if v1324 is re-applied.
- [x] Tests: legacy text preserved; section renders from the register.

### Slice 8 — Requirement Changes (D7, part 2)
- [x] `SQL/vG_change_requests_related_requirements.sql`: `related_requirement_ids UUID[]` on `public.change_requests` and `sim.change_requests` (pattern v1137 / v1138).
- [x] Change request form (both apps): "Related requirements" multi-select from this project's requirements; detail + exports show codes.
- [x] Change requests list (both apps): `?filter=requirements` (only changes with related requirements) via `useInitialFilterFromQuery`.
- [x] Menu item "Requirement Changes" under `ict_cat_requirements`; taxonomy line.
- [x] Tests: save/load array; filter.

### Slice 9 — System templates (D10)
- [x] `SQL/vH_ict_requirements_specification_templates.sql`: two system templates (Business Requirements Document, Functional Requirements Specification) on `ict_requirements_specification` — document text only, [placeholders], vendor-neutral (rule 26). Requires v1336 / v1337 (Slice 0).
- [x] SQL test (temporary function, as v1340): a record created from each template has every section.

### Slice 10 — Sample data (D11, rule 18.2)
- [x] `SQL/vI_ict_requirements_seed.sql` (public) + Simulator equivalent: SEED334-PRJ-08 — ~60 requirements (every category, all 10 areas, owner / rationale / verification filled), 10 use cases, 10 specifications (one per delivery slice, mixed BRD / FRS). Blank display IDs; existing rows never overwritten (merge / `ON CONFLICT DO NOTHING`); ID ranges checked free before use.
- [x] Seed check: every value valid for its field.

### Slice 11 — Review and close-out
- [x] Lint + drift (`node scripts/check-shared-drift.mjs --enforce`) clean; app tests green in both apps.
- [x] REVIEW.md checks; `Documentation/ICT_Requirements_Specification_v1338_Guide.md` (user guide + blog notes, rules 21–22).
- [x] Review section appended to this plan.

---

## 3. Order and dependencies

```
Slice 1 ──► Slice 2 ──► Slice 3 ──► Slice 4 ──► Slice 5 ──► Slice 6
                                   │            ├──► Slice 7
                                   │            ├──► Slice 9 (needs Slice 0)
                                   └──► Slice 8 └──► Slice 10 ──► Slice 11
```

Slice 1's migration must be run by the owner before Slice 1's service/UI changes are switched on
(the service sends the new columns only when they exist — detect once per session, as the templates
service does for missing tables).

## 4. Risks

| Risk | Mitigation |
|---|---|
| Schema migrations cannot be applied from the agent session | Owner runs each migration; UI degrades safely until then (no unknown-column saves). |
| Core-table source drifts from local-register behaviour | One loader returns the local-register shape; existing block / export code is reused, not forked. |
| v1324 re-run resets Functional Design fields | Slice 7 SQL header says to re-run it after v1324 (same as v1352 / v1377). |
| Templates invisible until v1336 / v1337 run | Slice 0 called out; templates SQL is idempotent and can be run any time after. |
| Simulator IT menus differ from Platform | Slice 3 checks the Simulator menu seeds first; mirror only where the IT pack exists there. |

## 5. Review (2026-11-09)

**Delivered** — all slices 1–11 in code and SQL files; nothing applied to the database (owner runs the SQL).

| Slice | SQL | Code |
|---|---|---|
| 1 Owner / rationale / verification / area | `v1384` (areas table + columns, public and sim) | `requirementExtrasService`, `useRequirementExtras`, `RequirementExtraFields` (packages); 4 detail pages, 4 list pages, 4 services |
| 2 Filtered lists | — | `requirementCategories` util; `?category=` + category filter on 4 list pages |
| 3 Menu | `v1385` | Traceability route `scope/traceability` + current-project fallback; taxonomy §6 |
| 4 Use Cases | `v1386` | (register engine) |
| 5 Core source + Specification | `v1387` | `coreLinkedSource`, `coreLinkedSourceService`, `useLinkedRecordsData` (Simulator record page gains linked records), `LinkedRecordsView` tables, `linkedBlocksForField` passes prebuilt blocks |
| 6 Suggested signatories | `v1388` | `resolveRegisterSignatorySlots` fallback + `RegisterSignoffPanel` (suggestion note, Remove) |
| 7 Functional Design | `v1389` | — |
| 8 Requirement Changes | `v1390` | `columnProbe`, `useRelatedRequirementOptions`, change form picker (both apps), `?filter=requirements` on Change Management (both), detail + export show linked requirements |
| 9 Templates | `v1391` | — |
| 10 Samples | Admin `v245`, `v1392`, `v1393` | — |
| 11 Docs | — | `Documentation/ICT_Requirements_Specification_v1338_Guide.md` |

**SQL run order (owner):** v1336 + v1337 (if not yet) → v1384 → v1385 → v1386 → v1387 → v1388 → v1389 →
v1390 → v1391 → Admin v245 → v1392 → v1393 → re-run v1251 (planner wall).

**Choices made during build**
* NFR grouping: the core source builds the tables itself (one per category / area) instead of one
  sub-section per requirement — the specification reads as tables (rule 38.1) and every existing export
  path draws them unchanged.
* An **Other Requirements** chapter (technical, regulatory, other) was added so no category is hidden (D1b).
* Simulator requirement codes: `sim.requirements_register` had no ID Generation trigger; Admin v245 +
  v1392 add it so seeds leave codes blank (rule 16.2).
* Use Cases "Related Requirements" holds requirement names (codes are only known after insert).
* The Simulator has no IT pack menu, so menu SQL is Platform-only; Simulator pages got the same fields,
  filters, linked records and change picker.
* Theme fixes on touched pages (Traceability matrix, practice requirement lists): removed `dark:bg-gray-950`
  shells and dark-only dialogs.

**Validation**
* New tests: `requirementExtrasService`, `requirementCategories`, `coreLinkedSource`, `coreLinkedSourceService`,
  `registerSuggestedSignatories`, `columnProbe` (shared); `RequirementExtraFields`, `LinkedRecordsView.coreBlocks`
  (ui). All pass.
* Shared suite: 1119 / 1125 pass; the 6 failures (`queryRouter`, `ianaTimezoneOptions`,
  `checkpointReportExport`) are in files this change did not touch.
* Platform register / requirement / change tests 22 / 22; Simulator 10 / 10; UI 16 / 16.
* Shared drift check clean. ESLint: no new errors in changed files (remaining `set-state-in-effect` /
  `immutability` errors are the pages' existing `load()` effects).

**Known limits / follow-ups**
* A specification shows all of the project's requirements in each category. With several specifications
  on one project (the samples have 10), each shows the same lists; filtering a specification to a subset
  (e.g. by traceability tag) would be a follow-up.
* Records already under sign-off keep their old Functional Design text keys (the sign-off lock refuses
  edits); the fields now show the register view.
* The change request list on `ChangeRequests.jsx` (cross-project) has no requirement filter; the menu link
  goes to the project change register (`/platform/change-requests`).
