# Form Field Image & File Attachments (v863)

Lets PMO, Portfolio/Programme/Project Managers, and Team Members/Leaders capture, attach, and paste images (e.g. process-flow diagrams) or documents directly onto a specific field of a Dynamic Form Engine form — not just onto the form instance as a whole. Companion to [PM Local Forms v852 Guide](./PM_Local_Forms_v852_Guide.md) (both share `form_templates`/`form_template_versions`/`form_instances`; a local form gets the Attachment field type automatically).

PRD: `projectprd/v863_form_field_attachments_prd.md` · Plan: `projectplan/v863_form_field_attachments_plan.md`.

**Not the same system as [Process Template Document Attachments (v867)](./Process_Template_Document_Attachments_v867_Guide.md)** — that guide covers the separate process_templates system (Project Charter, Business Case, etc. rendered by `OrganisationalTemplateDetailPage.jsx`), which has no field concept and got document-level attachments instead. If a field you configured here isn't showing up on a document you're editing, you're very likely looking at the other system — see the v867 guide's comparison table.

## What it is

A new **Attachment** field type in the Form Template Builder's field catalog, alongside Text/Textarea/Date/Number/Money/Select. A template author sets, per field:

- **Accepted files:** Images only, or Any file (images + PDF/Word/Excel/PowerPoint).
- **Max files:** up to 10 per field (builder-configurable ceiling).

Filling out the field, a user can:

1. **Browse** — click "Add file".
2. **Drag and drop** a file onto the field.
3. **Paste** (Ctrl+V) a copied/screenshotted image directly into the field.
4. **Camera** — on mobile, opens the device camera.

Each attachment shows as a thumbnail (images) or a file icon (documents), with an optional caption, a "vN (current)" version indicator, and Replace/Delete controls.

## Versioning

Replacing a file does **not** overwrite it — it inserts a new version and keeps the old one:

- `attachment_group_id` identifies the logical attachment across all its versions.
- `version_number` + `is_current` track history; only one row per group can be `is_current = true`.
- **Delete** soft-deletes the whole group (all versions) — there is no per-version delete.
- **Restore** (from the version-history dropdown) appends a **new** current version carrying an older version's file forward — it never renumbers or resurrects the old row in place.
- `display_id` (e.g. `IMG-0001`) is assigned once, on the first version, by the Admin ID Generation trigger; later versions copy it forward so the human-readable code stays stable across replace/restore.

## Storage

- Table: `public.form_field_attachments` / `sim.form_field_attachments` (`SQL/v861`, `v862`) — one row per version, FK'd to `form_instance_id` + `field_key`.
- Bucket: `form-field-attachments` (shared by Platform and Simulator, path-scoped: `{platform|sim}/{form_instance_id}/{field_key}/{group_id}-v{n}-{filename}`). **Must be created manually** via Supabase Dashboard/API — SQL only sets RLS (`SQL/v863b`). Private, 10MB/file limit.
- Limits: 10MB per file; up to 10 files per field.
- Allowed types: `image/png, image/jpeg, image/gif, image/svg+xml, image/webp` (images) plus `pdf, doc(x), xls(x), ppt(x)` (documents) — see `IMAGE_MIME_TYPES`/`DOCUMENT_MIME_TYPES` in `formFieldAttachmentService.js`.

## Permissions

Anyone with existing edit access to the form field can attach, replace, or delete (matches the field's normal edit-permission model — no special-casing by uploader identity). RLS on `form_field_attachments` and the storage bucket both key off `auth_user_can_access_project` / `auth_user_can_access_practice_project`, the same helper `form_instances` itself uses (`SQL/v858` pattern).

## Where it lives (both apps, mirrored per parity rule 34)

| Piece | Platform | Simulator |
|---|---|---|
| Service | `apps/platform/src/services/formFieldAttachmentService.js` | `apps/simulator/src/services/formFieldAttachmentService.js` |
| Field UI | `apps/platform/src/components/forms/AttachmentField.jsx` | `apps/simulator/src/components/forms/AttachmentField.jsx` |
| Field type registry (Form Template Builder) | `apps/platform/src/pages/forms/FormTemplateBuilder.jsx` `FIELD_TYPES` | `apps/simulator/...` (identical copy) |
| Field type registry (tier customisation panel) | `apps/platform/src/components/ui/TierFormPolicyPanel.jsx` `FIELD_TYPES` | `apps/simulator/...` (identical copy) |
| Field type registry (Excel schema import) | `apps/platform/src/components/forms/FormExcelSchemaImportModal.jsx` `FIELD_TYPE_OPTIONS` + `apps/platform/src/utils/formExcelImportUtils.js` `FIELD_TYPE_SET` | `apps/simulator/...` (identical copies) |
| Renderer | `FormFieldRenderer.jsx` → `attachment` branch | same |
| Fill/View pages | `FormNew.jsx`, `FormEdit.jsx`, `FormView.jsx` | same |
| Exports | `apps/platform/src/utils/exportUtils.js`, `apps/platform/src/components/ui/ExportRecordMenu.jsx` | `apps/simulator/...` (identical copies) |

Note: attachments become available **after** a form's first save ("Create Draft") — `FormNew.jsx` doesn't have a `form_instance_id` yet, so the Attachment field shows "Save this form first to enable attachments" until the draft exists. This matches the engine's existing create-then-edit flow (values live in local state until `createFormInstance` runs); once on `FormEdit.jsx`/`FormView.jsx` the field is fully live.

### ⚠️ Import-resolution gotcha (read before touching any `@nidus/ui` / `@nidus/shared/utils` file for this feature)

`apps/platform/vite.config.js` and `apps/simulator/vite.config.js` each alias `@nidus/ui` and `@nidus/shared/utils|hooks|context|constants` to that **app's own local `src/components/ui` / `src/utils` folder** — not to `packages/ui`/`packages/shared`. This contradicts CLAUDE.md's stated "packages/\* is the single source of truth" architecture and looks like uncleaned debt from the pre-v730 migration, but it is what actually ships. Practical effect: `packages/ui/src/ExportRecordMenu.jsx`, `packages/ui/src/TierFormPolicyPanel.jsx`, and `packages/shared/src/utils/exportUtils.js` / `formExcelImportUtils.js` are **not loaded by either app** — they're kept in sync for consistency, but the real edits belong in the `apps/platform/...` / `apps/simulator/...` paths listed in the table above. If a future change to any of these files "does nothing" in the browser, check this alias first.

## Exports

Per format:

| Format | Behaviour |
|---|---|
| Word, PowerPoint, PDF, Print | Image attachments **embedded inline** (fetched via signed URL, sized to fit); non-image files shown as filename + caption. |
| Excel, CSV, XML, JSON | Filename + caption + size + signed download link, one line per file (existing multi-value "one per line" convention — no new export code needed for these formats). |

Implementation: `resolveAttachmentFieldsForExport(schema, values, mode)` (in `formFieldAttachmentService.js`) resolves each attachment field's current attachments + signed URLs into two parallel structures — a plain-text version merged into the `record` object (drives Excel/CSV/XML/JSON and the non-image fallback everywhere), and an `assets` map passed as `ExportRecordMenu`'s new (optional, backward-compatible) `attachmentAssets` prop, which `exportRecordToWord`/`PPT`/`Print`/`PDF` use to embed images. `FormEdit.jsx`/`FormView.jsx` re-resolve only when an attachment field's own value changes (not on every keystroke in unrelated fields) and build a **separate** `exportRecord` object for the export menu — the real `values` state used by `updateFormValues` is never touched, so export resolution can't corrupt the saved attachment references.

**Known scope limit:** the in-app "View" preview modal (`RecordPreviewModal`) still shows the plain-text fallback for attachment fields rather than embedded images — only the seven direct export formats embed. Extending the preview modal is a small follow-up, not done here to avoid widening the change to a component shared by many unrelated record types.

## Apply order

1. `E:\project-nidus\SQL\v861_form_field_attachments_table.sql`
2. `E:\project-nidus\SQL\v862_form_field_attachments_sim.sql`
3. Create the `form-field-attachments` Storage bucket manually (Dashboard or JS API — see header of v863b).
4. `E:\project-nidus\SQL\v863b_form_field_attachments_storage_rls.sql`
5. `E:\project-nidus-admin\SQL\v202_form_field_attachments_id_generation_seed.sql`
6. `E:\project-nidus\SQL\v864_form_field_attachments_display_id_trigger.sql` (depends on step 5 — the seed rule must exist before this trigger's first fire)

### Confirmed out of scope (see PRD §f)

Image editing/annotation, virus/malware scanning, OCR/text extraction, a generic cross-entity attachment field (beyond forms), and migrating legacy `form_attachments` (instance-level) rows into this field-scoped table.
