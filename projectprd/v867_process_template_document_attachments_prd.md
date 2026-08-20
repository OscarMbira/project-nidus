# v867 — Process Template Document Attachments PRD

**Status:** ✅ Implemented — see `projectplan/v867_process_template_document_attachments_plan.md` Review section for the completion summary and remaining manual deployment steps.
**Scope:** Platform (`public` schema) and Simulator (`sim` schema), all 24 process-template document types, built simultaneously per parity rule 34.
**Relationship to v863:** Companion feature to `projectprd/v863_form_field_attachments_prd.md` (field-level attachments on the Dynamic Form Engine). This PRD covers the **separate** "process_templates" system, which has no field concept at all — see §a.

---

## a) Problem statement

The monorepo has two independent template/document systems (confirmed via research, not assumption):

1. **Dynamic Form Engine** (`form_templates`) — versioned, schema-driven, field-typed. Got field-level image/file attachments in v863.
2. **process_templates** — 24 tables (`project_charters`, `assumption_logs`, … `contract_closure_documents`), each storing a freeform, schema-less `document_data` JSONB blob, rendered generically by `OrganisationalTemplateDetailPage.jsx`. This system has **no field-type concept whatsoever** — confirmed by an explicit design comment ("generic editor... rather than 24 bespoke document forms," `projectplan/v805_global_vs_organisational_template_libraries_plan.md` decision 4) and confirmed there is no "add a field" capability anywhere in its UI or service layer.

A user tried to attach a process-flow image to a "Project Charter" document rendered by system 2 and found no way to do it — the v863 Attachment field type only exists in system 1, and these systems share no data path (confirmed structurally disjoint via `pm_template_nodes.domain` CHECK constraint).

**A prior decision already exists on unifying these systems**: `projectprd/v849_project_actual_data_register_PRD.md` explicitly decided *"do not unify these into one architecture — that would mean rebuilding a working, tested system for no functional gain."* That reasoning was weighed again for this PRD and reaffirmed by the user: attachment support alone doesn't justify a multi-week, high-risk migration of 24 tables of freeform governance-document data across two apps. **This PRD implements attachments as a standalone addition to process_templates instead**, not a consolidation.

## b) Solution

Since process_templates has no per-field concept, attachments here are **document-level**, not field-level: one "Attachments" panel per document (Project Charter, Business Case, etc.), not tied to any specific `document_data` key. This mirrors how the original `form_attachments` (instance-level) worked in the Dynamic Form Engine before v863 added the field-level version — process_templates only needs that simpler shape, because it only has "one document," never "one field within a document."

A new table `process_template_attachments` (public + sim) links to `pm_template_nodes.id` (the node identifying *which* document, regardless of which of the 24 content tables backs it) — a single real foreign key instead of a 24-way polymorphic reference. Versioning, replace/restore/delete semantics, storage bucket pattern, capture methods (picker/drag-drop/paste/camera), and export embedding all reuse the proven v863 design, adapted to drop the per-field dimension.

## c) User stories

1. As a PMO Admin, Portfolio/Programme/Project Manager, or Team Member/Lead with edit access to a process-template document (Project Charter, Business Case, PID, etc.), I can attach one or more images or files to that document via an "Attachments" panel.
2. As a user, I can capture via file picker, drag-and-drop, clipboard paste, or (on mobile) camera — same four methods as the Forms feature.
3. As a user, I see a thumbnail/icon gallery with optional captions, exactly like the Forms attachment field.
4. As a user, I can replace an attachment (creating a new version, old versions kept) and view/restore prior versions.
5. As a user, I can delete an attachment (all versions, soft-deleted).
6. As a user, this works identically across all 24 document types, and across Portfolio/Programme/Project/PMO tier scopes, and across both "Templates" and "Project Documents" surfaces (both render via the same `OrganisationalTemplateDetailPage.jsx`).
7. As a user exporting this document (Word/PowerPoint/PDF/Print), attached images appear embedded inline as an "Attachments" section; Excel/CSV/XML/JSON show filename + link, matching the same convention as v863.
8. As a Platform user and a Simulator user, this works identically in both apps.

## d) Implementation decisions

| # | Decision | Chosen approach |
|---|---|---|
| 1 | Attachment granularity | Document-level, not field-level (system has no field concept — see §a). |
| 2 | Linking key | `template_node_id` → `pm_template_nodes.id`. Real FK, single parent table. Avoids a 24-way polymorphic reference across the content tables. |
| 3 | New table | `process_template_attachments` (public + sim), same versioning shape as `form_field_attachments` minus `field_key` (`attachment_group_id`, `version_number`, `is_current`, soft-delete). |
| 4 | Storage bucket | New dedicated bucket `process-template-attachments` (private, 10MB/file, same MIME allowlist as v863). |
| 5 | Display ID | New Admin ID Generation abbreviation `DAT` (Platform) / `SDAT` (Simulator) — `PTA`/`SPTA` abandoned because `PTA` collides with an existing active rule. Same "assigned once on v1, copied forward on replace/restore" pattern as v863. |
| 6 | Capture methods | All four (picker, drag-drop, paste, camera) — same as v863. |
| 7 | Max files / size | 10MB/file, default max 10 files per document (not configurable per-document, since there's no builder to configure it — matches this system's existing "generic, not bespoke" design). |
| 8 | UI location | New "Attachments" panel on `OrganisationalTemplateDetailPage.jsx` (+ sim mirror), placed after the "Document data" section. |
| 9 | Component reuse | New component (`DocumentAttachmentsPanel.jsx`), not a direct reuse of `AttachmentField.jsx` (that component is wired to `formInstanceId`/`fieldKey`) — but shares the same UX and, where possible, the same underlying signed-URL/version-history logic pattern. |
| 10 | Export | `OrganisationalTemplateDetailPage.jsx` already uses `ExportRecordMenu` — inject one synthetic "Attachments" entry into its `sections`/`attachmentAssets`, reusing the exact embedding logic built in v863 (no changes needed to `exportUtils.js` itself). |
| 11 | Permissions | Same as whoever can already edit the document's title/description/document_data (no new permission model). |
| 12 | Availability timing | Since a process-template document row already exists before this panel could ever render (unlike Forms' `FormNew.jsx`, there's no "unsaved new document" state in this system — a row is created immediately on "Create" in `ProcessTemplateCreatePage.jsx`), there's no equivalent "save first" gap to solve here. |

## e) Testing decisions

- Unit tests for `processTemplateAttachmentService.js`: upload (v1), replace (new version + display_id copy-forward), delete (soft-delete all versions) — mirroring the v863 service test structure.
- Component tests for `DocumentAttachmentsPanel.jsx`: renders existing attachments, uploads via picker, rejects oversized files, deletes, hides controls when read-only.
- Manual QA: verify across at least 3 of the 24 document types (Project Charter, Business Case, a checklist-shaped one) and both "Templates" and "Project Documents" surfaces, in both apps, light/dark theme.

## f) Out of scope

- Any consolidation of process_templates onto the Dynamic Form Engine (explicitly declined — see §a).
- Per-document configurability of accept-type/max-files (no builder exists for this system; fixed defaults for all 24 types).
- Auditing/migrating the retired "Process Templates Hub"'s potential orphaned rows (flagged as an open, separate item in `v848`/`v849` — unrelated to attachments, not addressed here).
- Attachments on the unrelated "Document Governance"/"Programme Documents" compliance system (a different, file-storage-only system, confirmed structurally unrelated to process_templates in research).

## g) Further notes

Companion plan: `projectplan/v867_process_template_document_attachments_plan.md`. This feature intentionally does **not** touch `form_field_attachments`, `AttachmentField.jsx`, or any v863 file except `exportUtils.js`'s already-generic `attachmentAssets` mechanism, which is reused as-is (no v863 regression risk).
