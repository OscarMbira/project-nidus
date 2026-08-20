# Process Template Document Attachments (v867)

Lets PMO, Portfolio/Programme/Project Managers, and Team Members/Leads attach images or supporting files to a process-template document (Project Charter, Business Case, PID, and the other 22 governance document types) — not to be confused with [Form Field Image & File Attachments (v863)](./Form_Field_Attachments_v863_Guide.md), a **separate system**.

For formal sign-off on these same documents (not just attaching files), see [Process Template Document Signatories (v868)](./Process_Template_Document_Signatories_v868_Guide.md) — a sibling feature on the same document, same linking pattern.

## Why two guides — read this before touching either

The monorepo has two independent template/document systems that happen to share overlapping document names (both have a "Project Charter," for example). They share **no data path** — confirmed structurally disjoint via `pm_template_nodes.domain`'s CHECK constraint.

| | **process_templates** (this guide) | **Dynamic Form Engine** ([v863 guide](./Form_Field_Attachments_v863_Guide.md)) |
|---|---|---|
| Data model | 24 tables, each a freeform `document_data` JSONB blob — **no field-type concept at all** | Versioned, schema-driven, field-typed (`form_templates`) |
| Rendered by | `OrganisationalTemplateDetailPage.jsx` (pmo-module / sim-pmo-module) | `FormNew.jsx` / `FormEdit.jsx` / `FormView.jsx` |
| Reached via | Sidebar "Templates" tabs, "Project Documents" register | Sidebar "Forms" tabs |
| Attachment granularity | **Document-level** — one gallery per document | **Field-level** — a specific field can be type "Attachment" |

A prior decision (`projectprd/v849_project_actual_data_register_PRD.md`) explicitly declined to unify these two systems ("no functional gain" for the cost). That decision was revisited and reaffirmed when this feature was scoped — see `projectprd/v867_process_template_document_attachments_prd.md` §a for the full reasoning.

## What it is

Since process_templates has no field concept (confirmed: no "add a field" capability exists anywhere in its UI or service layer — `projectplan/v805_global_vs_organisational_template_libraries_plan.md` decision 4 calls this "a v1 simplification, not a gap to silently accept forever"), attachments here are **document-level**: one "Attachments" panel per document, not tied to any specific `document_data` key. This mirrors how instance-level `form_attachments` worked in the Dynamic Form Engine before v863 added field-level attachments.

Capture methods (identical to v863): file picker, drag-and-drop, clipboard paste, mobile camera. Same versioning model: replace = new version (old kept), restore a prior version, delete = soft-delete all versions. Same 10MB/file, 10-file default limits.

## Data model

- `pm_template_nodes.id` is the single linking key — a document is identified by its **node**, not by which of the 24 content tables backs it. This avoids a 24-way polymorphic reference.
- Table: `process_template_attachments` (`public` + `sim`, `SQL/v866_process_template_attachments_table.sql`). Same versioning columns as `form_field_attachments` minus `field_key`.
- Bucket: `process-template-attachments` (private, 10MB/file). **Created manually** — SQL only sets RLS (`SQL/v866b`).
- Display ID: `DAT-0001` (Platform) / `SDAT-0001` (Simulator) via Admin ID Generation (`E:\project-nidus-admin\SQL\v203_process_template_attachments_id_generation_seed.sql`; prefers DAT/SDAT — PTA was already taken), same "assigned once, copied forward" pattern as v863.

## Permissions

For **project-scoped** documents, write access matches project membership via `public.auth_user_can_access_project` / `sim.auth_user_can_access_practice_project` (same helpers as form-field attachments / v841) — **not** a raw `user_projects.user_id = auth.uid()` check (that compares the wrong id and caused storage 403 / RLS failures). Non-project scopes still use `can_manage_pm_template_node()`. PMO Admin retains full storage access. See `SQL/v866d_process_template_attachments_rls_fix.sql` if you already applied an earlier v866/v866b.

## Where it lives (both apps)

| Piece | Platform | Simulator |
|---|---|---|
| Service (single shared file, no per-app copy) | `packages/shared/src/services/processTemplateAttachmentService.js` | same |
| Panel component | `apps/platform/src/components/ui/DocumentAttachmentsPanel.jsx` | `apps/simulator/src/components/ui/DocumentAttachmentsPanel.jsx` |
| Wired into | `packages/modules/pmo-module/src/pages/OrganisationalTemplateDetailPage.jsx` | `packages/modules/sim-pmo-module/src/pages/OrganisationalTemplateDetailPage.jsx` |

The service lives in `packages/shared/src/services/` (not duplicated) because `@nidus/shared/services/*` is **not** one of the paths any app's Vite config aliases away to a local folder — unlike `@nidus/ui` and `@nidus/shared/utils|hooks|context|constants`, which are (see the callout in the v863 guide). Components still need per-app copies because `@nidus/ui` *is* aliased per-app.

## Export

`OrganisationalTemplateDetailPage.jsx` already had `ExportRecordMenu` wired in for its other fields. This feature adds one synthetic "Attachments" entry to its `sections`/`record`, reusing the exact same `attachmentAssets` embedding mechanism built in v863 — **no changes to `exportUtils.js` were needed**, since that mechanism was already generic (keyed by field `key`, not specifically tied to Dynamic Form Engine data). Word/PowerPoint/PDF/Print embed images; Excel/CSV/XML/JSON show filename + link.

## Apply order

1. `E:\project-nidus\SQL\v866_process_template_attachments_table.sql`
2. Create the `process-template-attachments` Storage bucket manually (Dashboard or JS API) — **or** skip this and apply `v866e` which creates the bucket via SQL.
3. `E:\project-nidus\SQL\v866b_process_template_attachments_storage_rls.sql`
4. `E:\project-nidus-admin\SQL\v203_process_template_attachments_id_generation_seed.sql`
5. `E:\project-nidus\SQL\v866c_process_template_attachments_display_id_trigger.sql` (depends on step 4)
6. **If you already applied v866/v866b before the auth_user fix:** `E:\project-nidus\SQL\v866d_process_template_attachments_rls_fix.sql`
7. **Required if uploads still return 400 / RLS on storage:** `E:\project-nidus\SQL\v866e_process_template_attachments_bucket_and_rls.sql` — creates the bucket if missing and installs SECURITY DEFINER helpers + FOR ALL storage policies.

### Confirmed out of scope

Consolidating process_templates onto the Dynamic Form Engine (explicitly declined — see PRD §a); per-document configurability of accept-type/max-files (no builder exists here); auditing the retired "Process Templates Hub"'s potential orphaned rows (a separate, already-flagged open item, unrelated to attachments); attachments on the unrelated "Document Governance"/"Programme Documents" compliance system.
