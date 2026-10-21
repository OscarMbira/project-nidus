# v1311 — Organisation custom fields on Local Registers (implementation plan)

**PRD:** `projectprd/v1311_local_register_custom_fields_PRD.md` (decisions D1–D15)
**Admin plan:** `E:\project-nidus-admin\projectplans\v216_local_register_custom_field_limit_admin_plan.md`
**Status:** Approved 2026-10-21 · Implemented 2026-10-22 · SQL not yet run (owner runs after completion)

## Design summary

- **Definitions** = LDE (`custom_field_definitions`, `custom_field_options`, `custom_field_screen_map`, `system_screens`), account-scoped, `published` on creation.
- **Register ↔ fields** = `custom_field_screen_map` rows against a per-register `system_screens` row (`local_register:<register id>`, module `local_registers`), created on first use.
- **Values** = the record's `field_values` under `cf__<definition id>` (D13). No change to LDE value tables.
- **Writes by non-admins** = SECURITY DEFINER RPCs only (D14); LDE RLS unchanged.
- **Limit** = `public.local_register_custom_field_settings` (single row, default 30) + `public.local_register_custom_field_limit_overrides` (account_id → limit); Admin writes via audited RPCs (D15).

## SQL (monorepo `SQL/`)

| File | Contents |
|---|---|
| `v1311_local_register_custom_fields_schema.sql` | Add `multi_line` to LDE `field_type` CHECK (public + sim). Unique normalised label per account on `custom_field_definitions` (public + sim, active rows only). `local_registers` system module (public + sim). Settings + override tables with RLS (read for authenticated, no client writes), `database_tables` registration, Planner wall note. Helper `local_register_custom_field_limit(account)`. |
| `v1312_local_register_custom_fields_rpc.sql` | `public.local_register_custom_fields(p_register_id)` → attached published fields for caller's account (with options, required, type). `public.local_register_custom_field_library(p_register_id)` → org library + where used. `public.local_register_add_custom_field(p_register_id, p_label, p_type, p_options, p_required)` and `public.local_register_attach_custom_field(p_register_id, p_definition_id)` — membership, register access (`has_local_register_scope_access` / register edit rights), duplicate, limit checks; create screen row lazily. `sim.*` equivalents against `sim.local_registers` / `sim.custom_field_*`. |
| `v1313_local_register_custom_fields_tests.sql` | SQL tests for the RPC rules (PRD §e). |

Admin repo SQL: `v242_local_register_custom_field_limit_admin_rpc.sql` (see Admin plan).

## Code

| Area | Change |
|---|---|
| `packages/shared/src/utils/registerCustomFields.js` (new) | `customFieldKey(id)`, `normaliseFieldName`, `findSimilarFieldNames`, `customFieldToRegisterField(def)` (maps LDE def → register field shape so the existing `FieldInput`/`MultiSelectDropdown`/`MultiLineListInput` render it), value text for list/export. + tests. |
| `apps/*/src/services/localRegisterCustomFieldService.js` (new, per app) | Wraps the RPCs (public vs sim binding). |
| `apps/*/src/pages/localRegisters/RegisterCustomFieldsTab.jsx` (new, per app) | Tab body: renders custom fields with existing inputs; "+ Add custom field" opens dialog; empty state. |
| `apps/*/src/pages/localRegisters/AddCustomFieldDialog.jsx` (new, per app) | Library search + attach, create form (name, type, options via `SelectOptionsEditor` or simple list, Required), exact-duplicate block, similar-name warning, limit message, success modal. |
| `LocalRegisterForm.jsx` (both apps) | Load custom fields with the register; add "Custom Fields" tab before Audit; values in `fieldValues` under `cf__` keys so they save with the record; include in required check. |
| `LocalRegisterDetailPage.jsx` (both apps) | Custom Fields tab (read-only display). |
| `LocalRegisterListPage.jsx` (both apps) | Custom columns after built-in ones; search includes custom values; export columns/rows include them. |
| `packages/shared/src/utils/registerFieldGroups.js` | `buildRegisterTabs(groups, { custom: true })` inserts Custom Fields before Audit. |
| `Documentation/Local_Register_Custom_Fields_v1311_Guide.md` | User + admin guide. |

## Vertical slices (each ends demoable + tested)

- [x] **S1 Tracer — create & use a field (Platform):** v1311/v1312 public parts; shared util; service; Custom Fields tab on form with a minimal "Add" (text type only); value saves with record and shows on view page.
- [x] **S2 Full add dialog:** all 9 types, options, Required, library search + attach, duplicate block, similar warning, limit message.
- [x] **S3 List, search, export:** custom columns, search, export merge.
- [x] **S4 Limit from Admin:** settings/override tables + limit enforcement in RPC; Admin RPCs + page (Admin plan v216); CLAUDE.md exception lines in both repos.
- [x] **S5 PMO governance:** confirm LDE Field Definitions / Screen Mapping pages handle register fields (rename, options, required, retire, detach); add a "Manage custom fields" link on the tab for PMO admins; hide retired/detached fields everywhere.
- [x] **S6 Simulator parity:** sim SQL parts; sim service binding; same components in Simulator app.
- [x] **S7 Hardening:** SQL tests (v1313), component tests, light/dark + mobile check, docs, REVIEW.md checks, review section below.

## Risks / checks during build

- Confirm Simulator register records' account ownership resolves for sim LDE definitions (account_id) before S6.
- `has_local_register_scope_access` is the access check used by record RLS — reuse it for "can edit register" (D2).
- Keep `cf__` keys out of built-in field logic (tabs, required) except where intended.
- LDE pages may assume project-scoped values (FieldAuditHistory, export merge) — register values won't appear there; documented, not a regression.

## Review (2026-10-22)

### What was built
| Slice | Result |
|---|---|
| S1–S2 | `SQL/v1311` (LDE `multi_line` type, `local_registers` module, limit tables + `local_register_custom_field_limit()`), `SQL/v1312` (list / library / add / attach RPCs, `public` + `sim`). Shared `@nidus/shared/utils/registerCustomFields.js`; `@nidus/ui` `RegisterFieldInput` (moved from both forms; adds Notes + Link), `RegisterCustomFieldsHeader`, `AddRegisterCustomFieldDialog`. Per-app `services/localRegisterCustomFieldService.js` + `lib/useRegisterCustomFields.js`. Form: Custom Fields tab, values under `cf__<id>`, required check, add/attach with success modal. |
| S3 | List: custom columns, search over title / display ID / all field values, exports include custom fields with readable values (option labels, Yes/No, one item per line — also improves built-in fields). View page: Custom Fields tab, links and long text rendered. |
| S4 | Admin v242 + page (see Admin plan v216); `CLAUDE.md` exception in both repos. |
| S5 | LDE `fieldTypeRegistry` + `CustomFieldInput` (both apps) know `multi_line`, so PMO edits in Field Definitions keep the type. "Manage fields" link shown only to PMO admins (same rule as LDE edit RLS). |
| S6 | Simulator: `sim.*` RPCs; identical service/hook bound to `simDb`; same pages. |
| S7 | Tests, docs (`Documentation/Local_Register_Custom_Fields_v1311_Guide.md`), this review. |

### Validation
- Unit/component tests: shared 10 (`registerCustomFields`) + 5 (`registerFieldGroups`); UI 5 (`AddRegisterCustomFieldDialog`); Platform local registers 10 (incl. 2 new custom-field form tests + 3 delete tests); Simulator local registers 7 (incl. the same 2 form tests); Platform LDE 22 — all pass.
- All changed/new JS/JSX compile (esbuild); ESLint: no new errors (two pre-existing "memoization" errors on the list pages' export memo remain).
- `node scripts/check-shared-drift.mjs --enforce` clean; Planner allow-list up to date.
- SQL v1311/v1312/v1313 and Admin v242 parse with the PostgreSQL parser (libpg-query). PL/pgSQL bodies were reviewed by hand (no PL/pgSQL parser available).

### Review findings fixed during build
- "Manage fields" originally used `is_pmo_admin_or_owner_for_account`; LDE's edit RLS uses `is_pmo_admin_user()` — aligned so the link never leads to a page the user cannot edit.
- Helper functions (`lr_cf_*`) revoked from `anon`/`authenticated` as well as PUBLIC (Supabase default privileges grant both), so field labels cannot be read by id across organisations.
- Two new "setState in effect" lint errors removed (hook keyed by register id; dialog mounts only while open).

### Not verified
- SQL not executed — owner runs v1311 → v1312 → v1313 (tests; leaves no data) → re-run v1251 → Admin v242. v1313 is the database-level test of the RPC rules.
- Not exercised in a browser (light/dark, mobile) or against live RLS.

### Remaining risks / notes
- A custom field marked **Required** blocks saving older records in that register until filled (by design, D9; explained in the add dialog).
- Retiring/detaching a field hides it but keeps its `cf__` values on records; re-attaching shows them again.
- LDE's own value-based pages (Field Audit History per value, LDE export merge) do not see register values, which live on the record (D13).
