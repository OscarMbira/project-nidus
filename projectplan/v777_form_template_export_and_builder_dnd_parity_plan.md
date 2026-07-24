# v777 — Platform & Simulator: Form Template Builder Row Reordering + Export Parity

**Repo:** `E:\project-nidus` (Platform + Simulator monorepo)
**Related plans:** `E:\project-nidus-admin\projectplans\v174_form_template_export_plain_completed_plan.md` (Admin), `E:\project-nidus\projectplan\v776_admin_form_instance_read_access_plan.md` (Admin→Platform/Sim read RPCs), `v780` (offline guidance on Plain/Sample export)
**Status:** ✅ 100% Complete (Part A + Part B)

## Why this plan exists

Admin's Global Template Library editor (`FormTemplatePayloadEditor.jsx`) gained Card/Table toggle, DnD, and Plain/Completed Template export. Per rule 34.1, Platform/Simulator's local `FormTemplateBuilder.jsx` needed the matching authoring/export capabilities.

## Part A — Field (row) drag-and-drop reordering — ✅ Complete

- [x] `@dnd-kit` sortable field cards with grip handle in Platform + Simulator builders.
- [x] Reorder within section only; safe for standard/in-use fields.
- [x] Column reordering **not** ported (no table view on builder — intentional scope note).

## Part B — Export parity — ✅ Complete

- [x] `exportRecordToPDF` + `blankPlaceholder` on all `exportRecordTo*` in `@nidus/shared/utils/exportUtils` (and app copies).
- [x] PDF option added to `ExportRecordMenu` / `ExportRecordButtons` (benefits all record pages using the menu).
- [x] Plain + Sample template export on `FormTemplateBuilder` via `FormTemplateExportMenu` (shipped under **v780**, including org guidance merge).
- [x] **Completed (Real)** export on `FormEdit` + `FormView`: `getFormInstance` now returns `schema` + `template` meta; pages wire `ExportRecordMenu` with live values.
- [x] Sample decision: Platform/Simulator use org **Default Content** (`default_value` / `guidance_text`) for Sample/Plain guidance — not a new schema `sample` attribute (Admin Global Templates keep payload `sample`/`help`). See v780.
- [x] Platform + Simulator parity.
- [x] Unit tests for export helpers (`formTemplateExportUtils.test.js`).

## Testing

- [x] Unit tests for merge / schema export helpers (v780).
- [x] Form-engine pages wired; manual drag-reorder already verified in Part A.

## Review

### What shipped (Part B)
| Artifact | Purpose |
|----------|---------|
| `packages/shared/.../exportUtils.js` | PDF + blankPlaceholder + guidance rendering |
| `packages/ui/ExportRecordMenu.jsx` | PDF (all fields) for ~all record export UIs |
| `FormTemplateExportMenu` + Builder wiring | Plain / Sample (v780) |
| `getFormInstance` (+ FormEdit/FormView) | Schema + real values export |
| `Documentation/Form_Template_Guidance_And_Sample_Defaults.md` | Offline export merge rules |

### Relationship
- Complements Admin **v174** / monorepo **v776** (Admin exports real submissions via RPCs).
- Offline guidance polish tracked in **v780** (complete).

### Not in scope
- Card/Table column reorder on Platform FormTemplateBuilder (separate follow-up if wanted).
- Full FormView history/audit data (stubs remain; export/renderer now work).
