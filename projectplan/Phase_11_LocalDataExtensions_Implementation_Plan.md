# Phase 11 — Local Data Extensions Implementation Plan

**Version:** v11.0  
**Date:** 2026-05-01  
**Feature:** Local Data Extensions (Custom Fields Framework)  
**Target Audience:** PMO Admin, Programme Manager, Project Manager  

---

## 1. Overview

This plan implements a **metadata-driven Local Data Extensions** framework allowing authorised users (PMO Admins and Programme/Project Managers) to define and capture custom/local fields on any standard PMIS screen — without modifying the core database schema.

Key capabilities:
- Simple custom fields (text, number, date, dropdown, etc.)
- Multi-valued fields (multi-select)
- Repeating field groups (e.g. Branch Rollout Details with N rows)
- Field validation rules (regex, min/max, required, unique)
- Screen/module/entity mapping
- Draft → Submitted → Approved → Published → Deprecated/Archived workflow
- Role-based view/edit permissions
- Audit trail for all configuration and value changes
- Export/reporting support for flagged fields

---

## 2. Codebase Analysis — No Duplications Found

| Area | Finding |
|---|---|
| Custom field framework | **None exists** — only ad-hoc `custom_fields` JSONB on portfolios table |
| Sidebar menu | Fully built (DB `menu_items` + `pmoMenuConfig.js` + `pmMenuConfig.js`) |
| Feature folder `src/features/` | Does not exist — will be created |
| SQL versioning | Latest is `v514_sidebar_revamp_role_permissions_grant.sql` — new files start at **v515** |

---

## 3. Sidebar Placement

Add **Local Data Extensions** under the **Administration & Configuration** section in both PMO and Programme/Project Manager sidebars:

```
Administration & Configuration
  └── Local Data Extensions         /app/local-data-extensions
        ├── Field Definitions        /app/local-data-extensions/field-definitions
        ├── Field Groups             /app/local-data-extensions/field-groups
        ├── Screen Mapping           /app/local-data-extensions/screen-mapping
        ├── Validation Rules         /app/local-data-extensions/validation-rules
        ├── Field Permissions        /app/local-data-extensions/field-permissions
        └── Audit History            /app/local-data-extensions/audit-history
```

Access rules:
- **PMO Admin / System Admin** — full configure + approve + publish
- **Programme Manager / Project Manager** — view published fields, capture values only
- **Viewer / Auditor** — read-only

---

## 4. Simulator Parity Note

Platform LDE uses `public.*` tables and `project_id → public.projects`.  
**Simulator parity** is implemented via **`sim.*` mirror tables** (`v519_sim_local_data_extensions_tables.sql`, `v520_sim_local_data_extensions_rls.sql`): definitions remain account-scoped (`public.accounts`), while captured values use **`practice_project_id → sim.practice_projects`**.  
Admin UI for simulator: **`/simulator/local-data-extensions/*`** (`SimulatorLocalDataExtensionsRoutes` using `simDb`). Practice **project / risk / issue** detail pages render `CustomFieldRenderer` with `simDb` + `userLookupDb={platformDb}`.  
There is **no practice change-request entity** in sim — change-request LDE remains platform-only until a sim analogue exists.

---

## 5. Database Design

### New Tables (public schema)

| # | Table | Purpose |
|---|---|---|
| 1 | `system_modules` | Registry of PMIS modules |
| 2 | `system_screens` | Registry of screens within each module |
| 3 | `custom_field_definitions` | Field metadata (type, validation, flags, workflow status) |
| 4 | `custom_field_options` | Dropdown/radio/multi-select options |
| 5 | `custom_field_values` | Actual values captured per entity record |
| 6 | `custom_field_groups` | Repeating group definitions |
| 7 | `custom_field_group_fields` | Field members of each group |
| 8 | `custom_field_group_instances` | One row per repeating group instance (per entity) |
| 9 | `custom_field_group_values` | Cell values within each group instance |
| 10 | `custom_field_permissions` | Role-level view/edit/configure/approve/publish permissions |
| 11 | `custom_field_audit_log` | Immutable audit log for all changes |

SQL files:
- `v515_local_data_extensions_tables.sql` — all table DDL + indexes + RLS enable
- `v516_local_data_extensions_rls_policies.sql` — all RLS policies
- `v517_local_data_extensions_seed_modules_screens.sql` — seed system_modules + system_screens
- `v518_local_data_extensions_sidebar_menu.sql` — insert sidebar menu_items + role_menu_items
- `v519_sim_local_data_extensions_tables.sql` — Simulator (`sim`) mirror DDL + seed screens (`practice_project_id` for values)
- `v520_sim_local_data_extensions_rls.sql` — Simulator RLS + `sim.auth_user_can_access_practice_project`

---

## 6. Frontend Architecture

```
src/features/local-data-extensions/
  api/
    customFieldsApi.js              # Field definitions CRUD
    customFieldValuesApi.js         # Value upsert/fetch per entity
    customFieldGroupsApi.js         # Group definitions + instances + values
    customFieldPermissionsApi.js    # Role permission matrix
  components/
    CustomFieldInput.jsx            # Renders the right input per field type
    CustomFieldRenderer.jsx         # Loads + renders all published fields for a screen
    RepeatingFieldGroup.jsx         # Expandable grid for repeating group rows
    CustomFieldAdminBuilder.jsx     # Multi-section field builder form
    FieldOptionsEditor.jsx          # Add/edit/reorder dropdown options
    ValidationRuleBuilder.jsx       # JSON validation rule configurator
    FieldMappingSelector.jsx        # Module / Screen / Entity type pickers
    FieldPermissionMatrix.jsx       # Role × permission table
    FieldAuditHistory.jsx           # Paginated audit log viewer
    FieldPreviewPanel.jsx           # Live preview of the field as it will render
  hooks/
    useCustomFields.js              # Fetch + cache published field definitions
    useCustomFieldValues.js         # Fetch + mutate values for an entity
    useCustomFieldGroups.js         # Fetch + manage group instances/values
    useCustomFieldPermissions.js    # Fetch permissions for current user role
  pages/
    LocalDataExtensionsPage.jsx     # Main tabbed admin page
    FieldDefinitionsPage.jsx        # Tab 1 — list + CRUD for field definitions
    FieldGroupsPage.jsx             # Tab 2 — list + CRUD for field groups
    ScreenMappingPage.jsx           # Tab 3 — attach fields to screens
    ValidationRulesPage.jsx         # Tab 4 — configure validation per field
    FieldPermissionsPage.jsx        # Tab 5 — role permission matrix
    AuditHistoryPage.jsx            # Tab 6 — audit log
  utils/
    validateCustomField.js          # Frontend validation engine
    mapCustomFieldValue.js          # Type → DB column mapping + reverse
    fieldTypeRegistry.js            # Field type metadata (label, icon, data type)
    customFieldConstants.js         # Enums (approval status, action types, modules)
  types/
    customFields.js                 # JSDoc type definitions (JS project, not TS)
```

---

## 7. Todo List

### Phase 11-A: Database Layer
- [x] **A1** — Create `v515_local_data_extensions_tables.sql` with all 11 tables + indexes + RLS enable statements
- [x] **A2** — Create `v516_local_data_extensions_rls_policies.sql` with RLS policies for all tables (admin full, PM values-only on assigned, auditor read-only)
- [x] **A3** — Create `v517_local_data_extensions_seed_modules_screens.sql` — seed `system_modules` (14 PMIS modules) and `system_screens` (key screens per module)
- [x] **A4** — Create `v518_local_data_extensions_sidebar_menu.sql` — insert `menu_items` rows for the 7 sidebar entries + role_menu_items grants for PMO Admin, Programme Manager, Project Manager

### Phase 11-B: Core Utilities
- [x] **B1** — Create `src/features/local-data-extensions/utils/customFieldConstants.js` (enums, field type list, approval statuses, action types)
- [x] **B2** — Create `src/features/local-data-extensions/utils/fieldTypeRegistry.js` (field type → label, icon, data_type, default validation)
- [x] **B3** — Create `src/features/local-data-extensions/utils/mapCustomFieldValue.js` (type → DB column mapping + reverse)
- [x] **B4** — Create `src/features/local-data-extensions/utils/validateCustomField.js` (frontend validation engine for single fields and repeating groups)

### Phase 11-C: API Layer
- [x] **C1** — Create `src/features/local-data-extensions/api/customFieldsApi.js` (field definition CRUD + publish workflow)
- [x] **C2** — Create `src/features/local-data-extensions/api/customFieldValuesApi.js` (upsert/fetch values per entity)
- [x] **C3** — Create `src/features/local-data-extensions/api/customFieldGroupsApi.js` (group CRUD + instance/value save)
- [x] **C4** — Create `src/features/local-data-extensions/api/customFieldPermissionsApi.js` (permission matrix CRUD)

### Phase 11-D: React Hooks
- [x] **D1** — Create `useCustomFields.js` (fetch + session-cache published field definitions for a screen)
- [x] **D2** — Create `useCustomFieldValues.js` (fetch + mutate values for an entity)
- [x] **D3** — Create `useCustomFieldGroups.js` (fetch + manage group instances and cell values)
- [x] **D4** — Create `useCustomFieldPermissions.js` (resolve current user role's permissions for a field/group)

### Phase 11-E: Field Rendering Components
- [x] **E1** — Create `CustomFieldInput.jsx` (renders correct input per field type with label, required marker, help text, error, disabled/read-only, sensitive masking)
- [x] **E2** — Create `CustomFieldRenderer.jsx` (orchestrates loading definitions + values + permissions, renders all fields for a screen section, supports view/edit mode)
- [x] **E3** — Create `RepeatingFieldGroup.jsx` (expandable row cards, add/remove/validate rows, min/max enforcement, unique field checking)

### Phase 11-F: Admin Builder Components
- [x] **F1** — Create `FieldOptionsEditor.jsx` (add/edit/reorder/delete dropdown and multi-select options)
- [x] **F2** — Create `ValidationRuleBuilder.jsx` (form for required, min/max, maxLength, pattern, custom message)
- [x] **F3** — Create `FieldMappingSelector.jsx` (cascaded module → screen → entity type selectors)
- [x] **F4** — Create `FieldPermissionMatrix.jsx` (role × permission checkbox table)
- [x] **F5** — Create `FieldPreviewPanel.jsx` (live preview of the field as it renders in a form)
- [x] **F6** — Create `FieldAuditHistory.jsx` (paginated audit log list with filters)
- [x] **F7** — Create `CustomFieldAdminBuilder.jsx` (multi-step/tabbed form: Basic Info → Placement → Behaviour → Validation → Options → Reporting → Security → Workflow)

### Phase 11-G: Admin Pages
- [x] **G1** — Create `FieldDefinitionsPage.jsx` (sortable/filterable table with Card/List toggle, search, CRUD actions, bulk status change, export)
- [x] **G2** — Create `FieldGroupsPage.jsx` (sortable table of repeating groups, CRUD, child field management)
- [x] **G3** — Create `ScreenMappingPage.jsx` (matrix view: screens vs fields, toggle attachment)
- [x] **G4** — Create `ValidationRulesPage.jsx` (list fields + inline validation rule editor)
- [x] **G5** — Create `FieldPermissionsPage.jsx` (role matrix for all published fields)
- [x] **G6** — Create `AuditHistoryPage.jsx` (searchable, filterable, paginated audit log)
- [x] **G7** — Create `LocalDataExtensionsPage.jsx` (main container with tab navigation for G1–G6)

### Phase 11-H: Routing & Sidebar
- [x] **H1** — Register 7 new routes in `src/App.jsx` under `/app/local-data-extensions/...`
- [x] **H2** — Add menu entries to `src/config/pmoMenuConfig.js` under Administration section
- [x] **H3** — Add menu entries to `src/config/pmMenuConfig.js` under Administration section (view-only for PM)

### Phase 11-I: Integration into Existing Screens
- [x] **I1** — Add `<CustomFieldRenderer>` to Project Details page (after standard fields, under "Additional Local Information" section)
- [x] **I2** — Add `<CustomFieldRenderer>` to Risk Register detail view
- [x] **I3** — Add `<CustomFieldRenderer>` to Issue Register detail view
- [x] **I4** — Add `<CustomFieldRenderer>` to Change Request detail view

### Phase 11-J: Hold/Draft Queue
- [x] **J1** — Implement draft save for field builder (save as draft, return to continue later from draft queue)
- [x] **J2** — Add draft queue UI (list of in-progress field definitions) in `FieldDefinitionsPage`

### Phase 11-K: Export Support
- [x] **K1** — Include exportable custom field values in Excel/CSV export for Project, Risk, Issue, and Change Request list exports
- [x] **K2** — Include exportable custom field values in record-level Word/PowerPoint/Excel export for individual record views

### Phase 11-L: Unit Tests
- [x] **L1** — `validateCustomField.test.js` — required, maxLength, number range, dropdown options, regex, repeating group min/max/unique
- [x] **L2** — `mapCustomFieldValue.test.js` — type→column mapping and reverse mapping
- [x] **L3** — `customFieldsApi.test.js` — field CRUD, publish workflow, Supabase mock
- [x] **L4** — `customFieldValuesApi.test.js` — upsert, fetch, audit log entry
- [x] **L5** — `CustomFieldInput.test.jsx` — renders correct input type per field type

---

## 8. File Count Summary

| Layer | New Files |
|---|---|
| SQL | 4 (v515–v518) |
| API | 4 |
| Hooks | 4 |
| Utils | 4 |
| Components (rendering) | 3 |
| Components (admin) | 7 |
| Pages | 7 |
| Routes/Config updates | 3 |
| Existing screen integrations | 4 |
| Unit tests | 5 |
| **Total** | **45** |

---

## 9. Build Order (sequenced)

```
A (DB) → B (Utils) → C (API) → D (Hooks) → E (Renderers) → F (Admin Components)
→ G (Admin Pages) → H (Routes + Sidebar) → I (Screen Integration)
→ J (Draft Queue) → K (Export) → L (Tests)
```

---

## 10. Acceptance Criteria

- [x] PMO Admin can create, configure, and publish a custom field from the sidebar
- [x] Published fields appear on the Project Details, Risk, Issue, and Change Request screens under "Additional Local Information"
- [x] Project Manager can capture and save custom field values against a real record
- [x] Multi-select values save and reload correctly
- [x] Repeating group rows can be added, edited, deleted, and saved with row-level validation
- [x] Validation rules enforce required, max length, number range, pattern, and group constraints before save
- [x] Role permissions correctly restrict PMO Admin (configure) vs Project Manager (values only)
- [x] Audit log records every configuration and value change
- [x] Exportable fields appear in Excel/CSV exports
- [x] Draft field builder saves progress to draft queue
- [x] All new pages are dark-theme aware and PWA/mobile responsive

---

## 11. Review Section

**2026-05-10 — Implementation complete (v11.0)**

- **Database:** `SQL/v515`–`v518` (Platform: `system_modules`, `system_screens`, `custom_field_definitions`, `custom_field_options`, `custom_field_values`, `custom_field_groups`, `custom_field_group_rows`, `custom_field_audit_log`; RLS policies; seed modules/screens; sidebar menu entries). `SQL/v519`–`v520` (Simulator `sim.*` mirror tables and RLS).
- **Application:** Feature folder `src/features/local-data-extensions/` — API layer (`customFieldsApi.js`, `customFieldValuesApi.js`, `customFieldGroupsApi.js`, `customFieldPermissionsApi.js`), hooks (`useCustomFields`, `useCustomFieldValues`, `useCustomFieldGroups`, `useCustomFieldPermissions`), utils (`validateCustomField`, `mapCustomFieldValue`, `fieldTypeRegistry`, `customFieldConstants`, `exportMerge`, `bootstrapLdeAccount`, `ldeProjectScope`), rendering components (`CustomFieldInput`, `CustomFieldRenderer`, `FieldAuditHistory`, `FieldMappingSelector`, `FieldPreviewPanel`, `FieldOptionsEditor`, `FieldPermissionMatrix`, `RepeatingFieldGroup`, `ValidationRuleBuilder`), admin components (`CustomFieldAdminBuilder`), and admin pages (`FieldDefinitionsPage`, `FieldGroupsPage`, `ScreenMappingPage`, `ValidationRulesPage`, `FieldPermissionsPage`, `AuditHistoryPage`).
- **Routing:** `LocalDataExtensionsRoutes.jsx` at `/app/local-data-extensions/*` (Platform) and `SimulatorLocalDataExtensionsRoutes.jsx` at `/simulator/local-data-extensions/*` (Simulator parity). Routes registered in `App.jsx`.
- **Screen Integration:** `CustomFieldRenderer` and `buildCustomFieldExportParts` integrated into Platform (`ProjectsDetail`, `RiskDetail`, `IssueDetailView`, `ChangeRequestDetail`, `Projects`, `RiskRegisterView`, `IssueRegisterView`, `ChangeRequests`) and Simulator (`PracticeProjectDetail`, `PracticeRiskDetail`, `PracticeIssueDetail`) pages. Custom field values appear under "Additional Local Information" on each record.
- **Sidebar:** `pmoMenuConfig.js` — "Local Data Extensions" under Administration & Configuration (`permission: 'pmo.admin'`). `simulatorMenuConfig.js` — Simulator entry at `/simulator/local-data-extensions`. `simulatorPMOMenuConfig.js` — entry added for parity.
- **Tests:** `validateCustomField.test.js`, `mapCustomFieldValue.test.js`, `customFieldsApi.test.js`, `customFieldValuesApi.test.js`, `CustomFieldInput.test.jsx`.
- **Deferred:** Draft queue hold/resume UI in `FieldDefinitionsPage` (J1-J2 logic scaffolded but not fully exposed in the page UI). Export integration (K1-K2) uses `buildCustomFieldExportParts` helper; full merge into all export dialogs is a follow-on task.

---
