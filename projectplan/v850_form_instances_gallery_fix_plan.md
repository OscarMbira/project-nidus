# v850 — Project Forms Register (form_template): Upgrade FormsGallery to Full CRUD Register

PRD: `projectprd/v849_project_actual_data_register_PRD.md` (shared with [[v849]]) — see the
"Architecture note" section for why Forms keep their existing override-table tier-customisation
system (v808/v812/v815/v847) untouched, and why this register is built on Forms' actual data
model (blank-first capture, multiple instances allowed) rather than mirrored 1:1 off the
Templates register.

## Goal
`FormsGallery.jsx` is already the correct, already-linked entry point for Forms data
(`/platform/projects/:projectId/forms`, in the PM sidebar today) — it doesn't need a new page
the way Templates did. It needs to become a real register: every instance across every form
template used in this project, not just drafts, with working view/edit/delete, built to the same
list standard (sortable, row numbers, Card/Table toggle, search, export) as
[[v849]]'s Project Documents Register.

## Confirmed by code research — do not change
- `form_template`'s tier customisation (Org/Portfolio/Programme/Project field overrides via
  `TierFormPolicyPanel.jsx` + `form_template_field_overrides`/`additions`) is untouched by this
  plan. Not a node-fork system, not being converted to one (architecture decision, see PRD).
- `FormNew.jsx` already resolves the full tiered schema correctly via
  `resolveEntityPolicyChain('project', projectId)` + `applyTieredSchemaFieldOverrides` —
  capture is already tier-aware. No change needed here.
- No uniqueness constraint blocks multiple instances (`SQL/v502_form_engine_tables.sql`) — no
  schema change needed; multiple instances per template per project stay allowed.
- `archiveForm(formInstanceId, mode)` in `formEngineService.js` already implements the archive
  transition correctly — just never called from any component today.

## Todo

### 1. Register list — Platform
- [x] `apps/platform/src/pages/forms/FormsGallery.jsx`: alongside the existing
  `FormTemplateGallery` ("start a new one" picker, unchanged) and `DraftFormQueue` (kept as the
  "My Drafts" quick-access view, unchanged), add a full **All Records** table/list section
  sourced from the `getFormsByProject(projectId, {}, mode)` call already made (currently
  discarding non-draft results — stop discarding, render them):
  - Table-list default (rule 41), sortable columns (rule 40: Template name, Status, Last
    updated), row numbers (rule 44), Card/Table toggle
    (`useViewMode('project-forms-register', 'list')`), search bar, theme-aware (rule 28.1).
  - Status badge per row (draft/submitted/approved/rejected/archived).
  - Row actions (icon-only `RowActionButton`, rule 61): View → `FormView.jsx`; Edit → `FormEdit.jsx`
    (only while status permits edits — reuse whatever status-gate `FormEdit.jsx` already
    enforces); Delete/Archive → new action, see Todo 2.
  - Export menu (rule 38) across the full record set.
- [x] Status filter includes "Archived" as an explicit filter option (not hard-hidden) rather
  than only ever appearing via direct link.

### 2. Wire up Delete/Archive
- [x] Add the Delete row action calling the existing `archiveForm(formInstanceId, mode)`.
  Enabled for `draft`/`submitted`/`rejected`; disabled (with an explanatory tooltip, rule 61)
  once `status === 'approved'`.
  Note: engine status for submitted work is `in_review` (see v779) — treated as submitted for
  archive/edit gates.
- [x] Confirm archived instances default out of the "All Records" view unless the Archived
  filter is explicitly selected.

### 3. Simulator parity
- [x] Mirror the same upgrade into `apps/simulator/src/pages/forms/FormsGallery.jsx`.

### 4. Verification
- [ ] Browser: submit a form, confirm it appears in All Records outside the draft queue, with
  correct status badge.
- [ ] Browser: create two instances of the same template for one project (e.g. Lessons Log
  twice), confirm both list independently — multi-instance behaviour preserved, not capped.
- [ ] Browser: delete a draft and a submitted instance, confirm both move to Archived and drop
  out of the default view; confirm Delete is disabled/hidden on an approved instance.
- [ ] Browser: confirm Portfolio/Programme/Project field-override customisation
  (`TierFormPolicyPanel`) still works unchanged — this plan must not regress v808–v847.
- [ ] Browser: Simulator parity pass.

## Explicitly out of scope
- Any change to the tier-customisation architecture itself (`form_template_field_overrides`,
  `TierFormPolicyPanel`, `resolveEntityPolicyChain`) — confirmed working, not being touched.
- Any schema change — `form_instances` already supports everything this plan needs.
- Hard delete.
- A new page or new sidebar menu entry — `FormsGallery` is already correctly positioned and
  linked.
- Any change to `process_template` — see `v849_project_documents_register_plan.md`.

## Review

### Summary
v850 upgrades the existing Forms gallery into a Project Forms **All Records** register without
new routes, menus, or schema. Tier override customisation (v808–v847) is untouched.

### Delivered
1. **All Records** section on Platform + Simulator `FormsGallery.jsx` — sort, row numbers,
   Card/Table toggle (`project-forms-register`), search, export, status badges.
2. **Archive** wired to existing `archiveForm()`; disabled for approved (tooltip); default list
   excludes archived; filter option **Archived**.
3. **Edit** shown for draft / in_review / rejected; View for all.
4. **`getFormsByProject`** joins `form_templates` for name/code (Platform + Simulator services).
5. **Shared helpers** — `packages/shared/src/utils/formInstanceRegisterUtils.js` + unit tests.
6. **Docs** — `Documentation/Project_Forms_Register_v850.md`.

### Status note
DB/engine uses `in_review` (not a separate `submitted` value). UI labels it “In review”; archive
gates treat `in_review` as the plan’s “submitted”.

### Browser verification (Todo 4)
Left for manual QA after deploy — multi-instance, archive, approved disabled, Simulator parity,
and TierFormPolicyPanel regression check.
