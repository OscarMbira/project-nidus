# v863 — Form Field Image & File Attachments PRD

**Status:** ✅ Implemented — see `projectplan/v863_form_field_attachments_plan.md` Review section for the completion summary, deviations, and remaining manual deployment steps.
**Owner request:** PMO, Portfolio/Programme/Project Managers, and Team Members/Leaders need to capture/attach/paste images (and supporting files) as field-level data on templates/forms — e.g. a process-flow diagram attached to a specific field for clarity.
**Scope:** Platform (`public` schema) and Simulator (`sim` schema), built simultaneously per parity rule 34.

---

## a) Problem statement

The Dynamic Form Engine (`form_templates` / `form_template_versions` / `form_instances` / `form_instance_values`, shared by the general Process Group Forms system and the v852 "PM Local Forms" origin concept) only supports six field types today: `text`, `textarea`, `date`, `number`, `money`, `select` (`FIELD_TYPES` in `apps/platform/src/pages/forms/FormTemplateBuilder.jsx`, rendered by `FormFieldRenderer.jsx`). There is no way to attach an image or file to an individual field.

Instance-level attachments exist (`form_attachments` + `addFormAttachment()`), but they attach to the *whole form instance*, not to a specific field — so there's no way to say "this diagram belongs to the *Process Flow* field" as opposed to "this file is somewhere on this form." A PM capturing a process-flow diagram, a risk-register screenshot, or a site photo currently has no field-level home for it, and no preview experience tied to that specific field.

This gap blocks a common real-world need in PM tooling: illustrating a specific answer (a status update, a design decision, a risk) with a picture, inline, where it was asked for.

## b) Solution

Add a new **Attachment** field type to the existing Dynamic Form Engine (used by both the general form builder and PM Local Forms, since they share the same tables). A field of this type lets the user capture one or more images/files via file picker, drag-and-drop, clipboard paste, or (on mobile) device camera, see them as a thumbnail/icon gallery inline in the form, click through to a full preview (reusing the existing `DocumentPreview.jsx` viewer), and have those attachments participate in the form's existing save/approval/export/hold-draft lifecycle like any other field.

Files are stored in a new dedicated Supabase Storage bucket and tracked in a new field-scoped table (`form_field_attachments`, mirrored in `public` and `sim`) linked to `form_instance_id` + `field_key`. The field's value in `form_instance_values.field_value` (jsonb) stores the ordered array of attachment IDs for that field.

The form builder gains a per-field toggle to restrict a given Attachment field to images-only or any allowed file type, plus a configurable max-files-per-field ceiling.

## c) User stories

1. As a PM, I can add an "Attachment" field type to a form template in the Form Template Builder, alongside the existing text/date/number/select field types.
2. As a PM building a template, I can configure an Attachment field to accept "Images only" or "Any file", and set a max number of files (up to a builder-enforced ceiling).
3. As a Team Member filling in a form, I can click a button to browse and select one or more images/files for an Attachment field.
4. As a Team Member, I can drag a file from my desktop and drop it onto the Attachment field to upload it.
5. As a Team Member, I can copy a screenshot (e.g. Ctrl+C on a snipped image) and paste it (Ctrl+V) directly into the Attachment field to upload it, without saving it to disk first.
6. As a Team Member on a mobile device, tapping the Attachment field's camera option opens my device camera directly so I can photograph something and attach it immediately.
7. As any user filling a form, I can add an optional caption to each attached file (e.g. "Approval process flow v2").
8. As any user, I see uploaded images as thumbnails and non-image files as a labeled file icon, in a gallery under the field.
9. As any user, clicking a thumbnail/icon opens a full preview modal (zoom/pan/rotate for images; existing viewer behaviour for documents) without leaving the form.
10. As any user with edit access to the field, I can delete an attachment already on the field, or replace it — replacing creates a new version rather than destroying history.
10a. As any user, I can open an attachment's version history (e.g. "v3 (current)") and view or restore a prior version; restoring adds a new current version rather than silently rewriting history.
10b. As any user, an attachment's human-readable display ID (e.g. `IMG-0001`) stays the same across all its versions — it identifies the logical attachment, not a specific version.
11. As a PM/PMO, when a record's `record_status` is `unauthorised` (pending approval, rule 53), the Attachment field is read-only (no upload/delete) — same as every other field on that form, inside the existing `<fieldset disabled>` lock.
12. As a user, when I put a form on hold/draft (rule 37) and return to it later, my previously attached files are still there, correctly associated with their field.
13. As a user exporting a completed form to Word, PowerPoint, or Print/PDF, attached images appear embedded inline (with their captions) at the point of that field.
14. As a user exporting a completed form to Excel, CSV, XML, or JSON, attached files appear as a filename + signed download link (not embedded binary), since these are data formats.
15. As a user, non-image files (PDF, docx, etc.) always appear as filename + download link in every export format — never embedded as an image.
16. As a user, each uploaded image/file is validated against the field's allowed-type setting, and against a global max file size (10MB) and max file count (configurable ceiling, default cross-field maximum 10) before upload proceeds; violations show a clear inline error, not a silent failure.
17. As a PMO/DB admin, the new `form_field_attachments` table is registered in `database_tables` and has a human-readable display ID (e.g. `IMG-0001`) assigned via the existing Admin ID Generation trigger pattern, consistent with `form_templates`' `template_code`.
18. As a Platform user and a Simulator user, this feature works identically in both apps (parity rule 34) — same field type, same capture methods, same preview, same export behaviour, `sim` schema mirroring `public`.
19. As a mobile/PWA user, the Attachment field is fully usable on a touch device (rule 29/39) — file picker, camera capture, and thumbnail gallery all work at mobile viewport widths.

## d) Implementation decisions (settled)

| # | Decision | Chosen approach |
|---|---|---|
| 1 | Field scope | Broader **File/Attachment** field type — accepts images and non-image documents, not image-only. |
| 2 | Capture methods (v1) | All four: file picker/browse, drag-and-drop, clipboard paste (Ctrl+V), mobile camera capture. |
| 3 | Multiplicity | Multiple files per field, with a configurable max (builder-set per field, hard ceiling enforced app-wide). |
| 4 | Storage schema | New field-scoped table `form_field_attachments` (public + sim), FK'd to `form_instance_id` + `field_key`. `form_instance_values.field_value` stores the ordered array of attachment IDs. Table shape modeled on the richer `daily_log_attachments`/`change_log_attachments` pattern (mime type, size, uploaded_by, soft-delete), not the sparser `form_attachments` shape. |
| 5 | Storage bucket & limits | New dedicated bucket `form-field-attachments`. Images: png/jpg/jpeg/gif/svg/webp. Documents: reuse `documentStorageService.js`'s existing `ALLOWED_EXTENSIONS` (pdf/doc/docx/xls/xlsx/ppt/pptx). Max 10MB/file, default max 10 files/field (builder-configurable, capped at a hard ceiling). |
| 6 | Preview UX | Thumbnail grid (images) / file-type icon (documents) inline under the field; click opens the existing `DocumentPreview.jsx` in a modal (already supports image zoom/pan/rotate, PDF iframe, download fallback) — no new viewer built. |
| 7 | Export handling | Word/PowerPoint/Print(PDF): images embedded inline with captions. Excel/CSV/XML/JSON: filename + signed download link, never embedded binary. Non-image files: filename + link in every format, never embedded. |
| 8 | Captions | Optional per-file caption/description field, stored on `form_field_attachments.caption`, shown under the thumbnail and included in Word/PPT/Print export captions. |
| 9 | Display ID | Yes — human-readable ID (e.g. `IMG-0001`) via the existing Admin ID Generation trigger pattern (`trg_apply_admin_display_id`), requiring a new rule seeded in `E:\project-nidus-admin\SQL\` (next version `v202`). |
| 10 | Per-field type restriction | Builder-level toggle: "Accepted files: Images only / Any file", stored on the field's schema definition (e.g. `accept: 'image' \| 'any'`) inside `form_template_versions.schema`. |
| 11 | Delete/replace permission | Anyone with existing edit access to the field can delete/replace any attachment on it (matches the form's existing field-edit permission model) — no special-casing by uploader identity. |
| 12 | Approval-lock interaction | Attachment field participates in the existing rule-53 `<fieldset disabled>` lock while `record_status === 'unauthorised'` — no separate lock mechanism needed. |
| 13 | Upload success feedback | Per-file upload uses toast (consistent with existing `EntryAttachments.jsx`/`LessonAttachments.jsx` pattern) — an individual file attach is not itself a full record CRUD action under rule 16. The overall form Save still uses the existing blocking success-confirmation modal. |
| 14 | Platform/Simulator build order | Built simultaneously in both apps from the start (rule 34) — not Platform-first-then-follow-up. |
| 15 | Attachment versioning (added by user decision — see §f for what stayed out) | Each logical attachment can have multiple versions. "Replace" uploads a new file as a new version (new `version_number`, `is_current = true`) rather than overwriting; the previous version's `is_current` flips to `false` but its row and storage object are kept, not deleted. "Delete" removes the whole logical attachment (all versions soft-deleted together) — there is no per-version delete, to keep the UI simple (rule 62). "Restore" on a prior version creates a **new** current version carrying that version's file/metadata forward (append-only history), rather than resurrecting the old `version_number` in place. |
| 16 | Display ID stability across versions | `display_id` (e.g. `IMG-0001`) is assigned once, on the first version (`version_number = 1`), via the existing `trg_apply_admin_display_id` trigger. Every subsequent version row for the same logical attachment copies that same `display_id` forward at insert time (application-level, not re-triggered) — the trigger only fires meaningfully once per logical attachment, since it skips rows where the column is already non-blank. |

## e) Testing decisions

- **Unit tests** (rule 23): upload validation logic (file type/size/count limits), field-value serialization (attachment ID array in `form_instance_values`), caption save/update, delete/soft-delete behaviour, per-field `accept` restriction enforcement.
- **Integration tests**: full capture-to-preview flow for each capture method (picker, drag-drop, paste, camera-input fallback in jsdom/mocked), form save → reload → attachments still correctly associated with field, hold/draft → resume flow retains attachments, approval-lock disables upload/delete while `unauthorised`.
- **Export tests**: snapshot/structure assertions that Word/PPT/Print output contains an embedded image node for an image field, and that Excel/CSV/XML/JSON output contains filename + link (not binary) for the same field.
- **RLS tests**: confirm `form_field_attachments` storage and table RLS matches the field's existing edit-permission boundary (own-project scoping, PMO Admin full access), consistent with `SQL/v150_supabase_storage_setup.sql`'s pattern.
- **Manual QA**: verify in-browser on both Platform (5173) and Simulator (5174), light and dark theme, desktop drag-drop + paste, and a real mobile device/emulator for camera capture — per rule 8/28.1 (theme-aware) and rule 29/39 (PWA/mobile).
- **Done means**: a template author can add an Attachment field, a form filler can attach via all four capture methods, preview works inline, exports across all seven formats behave per the table in (d), Platform and Simulator are at parity, and RLS is verified not bypassed (rule 42).

## f) Out of scope (this PRD)

*(Reviewed and confirmed with the user — attachment versioning, originally listed here, was pulled into scope as decision #15/#16 above. The remaining five items were explicitly kept out.)*

- Image editing/annotation (crop, markup, arrows-on-diagram) — capture and preview only, no in-app editing. Confirmed as its own, materially larger canvas-editor build, not an extension of this feature.
- Virus/malware scanning of uploaded files — matches existing attachment tables' precedent (none scan today). Would need to apply to every upload path in the system to be meaningful, not just this field type — a separate infra-wide security initiative, not scoped here.
- OCR or automatic text extraction from attached images — a distinct AI feature.
- A generic reusable "Attachment field" outside the Dynamic Form Engine (e.g. attaching images to entities that aren't forms) — materially larger architectural scope; this PRD is scoped to form template/field attachments only. Candidate for its own future PRD.
- Migrating existing `form_attachments` (instance-level) data into the new field-scoped table — the two attachment concepts (instance-level vs field-level) coexist; no backfill, and no natural field-key mapping exists for old rows.

## g) Further notes

- Both the general Process Group Forms system and the v852 "PM Local Forms" concept share `form_templates`/`form_template_versions`/`form_instances`/`form_instance_values` — this feature lands once in the shared field-type registry and renderer, and both systems inherit it automatically. No separate PM-Local-Forms-specific work is needed.
- Cross-repo touchpoint: the Admin ID Generation rule seed for `form_field_attachments` display IDs lives in `E:\project-nidus-admin\SQL\v202_form_field_attachments_id_generation_seed.sql` (separate repo/PR from this monorepo's work), per the repo-scoped SQL rule.
- See companion plan: `projectplan/v863_form_field_attachments_plan.md` for the versioned implementation task list and SQL file sequence.
