# Process Template Document Signatories (v868)

**PRD:** `projectprd/v868_process_template_document_signatories_PRD.md`  
**Plan:** `projectplan/v868_process_template_document_signatories_plan.md`  
**Later:** v873 mandatory/optional · **v880 scoped Org / Portfolio / Programme / Project** (`projectprd/v880_scoped_document_signatory_requirements_PRD.md`)  
**Precedent:** `Documentation/Process_Template_Document_Attachments_v867_Guide.md`

## What this is

A document-level, sequential, multi-signatory sign-off workflow for `process_templates` documents (Project Charter, Business Case, Project Management Plan, and the other 21 formal governance document types). Managers configure which role-slots must sign a document type (e.g. "Project Manager", "Sponsor"); the person preparing an actual document picks which project team member fills each slot; signatories sign in order by uploading a signature image; once every **mandatory** slot is signed (v873), the document locks read-only.

This is **not** an e-signature product (no legal/cryptographic guarantees) — it's an internal sign-off tracking feature, deliberately scoped that way (see the PRD's Out-of-scope section).

## Scoped requirements (v880)

Configuration is no longer organisation-only:

| Scope | Who may edit | Behaviour |
|--------|----------------|-----------|
| Organisation | PMO Admin | Default list per document type |
| Portfolio / Programme / Project | Named manager (+ PMO; higher managers may edit lower scopes they manage) | **Use parent** (inherit) · **No signatories** · **Custom** (full replace) |

**Resolve at signing:** Project → Programme → Portfolio → Organisation. Org-library documents with no project use Organisation only. Effective slots are **snapshotted** when a signing round starts.

**UI:** Document Signatory page — Scope control + optional entity picker + mode radios + source banner. Deep-link with `?scopeType=project&scopeId=<uuid>`. First custom list defaults to a copy of the effective parent (Start blank available).

**SQL:** `SQL/v880_scoped_signatory_requirements.sql` · `SQL/v880b_scoped_signatory_menu_grants.sql`.

## How it relates to v863 and v867

| | v863 (Form Field Attachments) | v867 (Document Attachments) | v868 (Document Signatories) |
|---|---|---|---|
| System | Dynamic Form Engine | process_templates | process_templates |
| Granularity | Per field | Per document | Per document |
| Linked via | `form_instance_id` + `field_key` | `pm_template_nodes.id` | `pm_template_nodes.id` |
| Purpose | Capture an image/file as field data | Attach supporting files to a document | Formal sign-off with named signatories |

If you're looking for "how do I attach a diagram to this document," that's v867 (Attachments tab). If you're looking for "how do I get the PM and Sponsor to formally sign this," that's v868 (Signatories tab).

## Data model

1. **`process_template_signatory_requirements`** (public + sim) — config slots. Keyed by `(account_id, scope_type, scope_id, document_table, slot_order)` after v880 (`scope_type` default `organisation`, `scope_id` null for org). Includes `is_mandatory` (v873).

2. **`process_template_signatory_scope_policies`** (public + sim, v880) — for portfolio/programme/project only: `mode` = `custom` | `none`. **No row = inherit parent.**

3. **`process_template_document_signatories`** (public + sim) — per-document signing instances (append-only rounds).

4. **`user_signature_images`** (public only) — personal saved signature asset.

## RLS notes

- **Assigning** slots: project membership helpers / `can_manage_pm_template_node`.
- **Signing/declining:** only the assigned signatory; sequential turn order (mandatory-only blocking after v873).
- **v880 requirements write:** `can_manage_signatory_requirements(account, scope_type, scope_id)` — PMO Admin, or portfolio/programme/project manager (with parent-manager rights on lower scopes). Organisation scope remains PMO Admin only.

See earlier v868 plan Review for storage buckets, notifications, and lock behaviour.
