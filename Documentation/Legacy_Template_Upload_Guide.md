# Legacy Template Upload Guide

**Plan:** `projectplan/v775_legacy_template_upload_plan.md` (SQL/UI implemented as **v776** / Admin **v173** — `v775` SQL was already used for the ICT industry seed)

## Overview

Three upload tracks turn existing organisation artefacts into reusable PM Template Hierarchy content:

| Track | Formats | Destination |
|-------|---------|-------------|
| **A — Schedule** | Excel, CSV, MSPDI XML (MS Project Save As → XML) | `pmo_industry_templates` + children via `replaceTemplateChildren` |
| **B — Reference document** | Word, PDF, PowerPoint (+ text extract via `officeparser`) | `pmo_legacy_document_templates` + `pm_template_nodes` (`domain=legacy_document`) |
| **C — Structured list** | Excel/CSV (multi-sheet RAID) | `pmo_legacy_structured_lists` + `pm_template_nodes` (`domain=structured_list`) |

**Parent model:** Admin Global Template Library remains the Global source of truth when content is authored there and **Published**. PMO uploads create PMO-tier masters for the account.

## Platform entry points

- PMO → Industry Templates → **Upload legacy template** (`/pmo/legacy-templates/upload`)
- PMO → **Reference templates** (`/pmo/legacy-templates`)
- PM Industry Template Browser → link to reference templates
- Portfolio / Programme detail → fork panels for industry plan, reference document, and structured list

## Admin entry points

- Global Templates → Library → **Upload legacy** (`/content/legacy-template-upload`)
- Apply monorepo `SQL/v776*` then Admin `SQL/v173_global_legacy_template_domains.sql` before publish

## SQL apply order (monorepo)

1. `v776_legacy_document_templates_tables.sql`
2. `v776b_legacy_document_templates_rls.sql`
3. `v776c_legacy_templates_storage.sql`
4. `v776f_legacy_structured_lists.sql`
5. `v776d_legacy_templates_database_tables_seed.sql`
6. `v776e_legacy_document_global_sync.sql`

Then Admin: `v173_global_legacy_template_domains.sql`

## Storage

- Bucket: `legacy-templates` (private, signed URL downloads)
- Path: `{account_id}/{template_id}/{filename}` (PMO) or `global/{id}/{filename}` (Admin)

## Track C canonical fields

- **risk_register / raid_log:** `item_type`, `title`, `description`, `category`, `likelihood`, `impact`, `owner`, `mitigation`, `status`
- **stakeholder_register:** `stakeholder_name`, `role_title`, `organisation`, `influence`, `interest`, `engagement_strategy`, `communication_preference`
- **budget:** `line_item`, `category`, `budgeted_amount`, `actual_amount`, `variance`, `notes`

## Converting an `.mpp` file

Raw Microsoft Project `.mpp` is **not** parsed in-app (native binary; Edge Functions cannot run `@byteink/mppjs`).

1. Preferred: In MS Project use **File → Save As → XML Format (MSPDI)** and upload the `.xml`.
2. Orphaned `.mpp`: run `@byteink/mppjs` locally once to produce MSPDI XML, then upload that XML on Track A.

## Optional Charter → Sample Default

MVP does **not** auto-map Charter text into F001 field-by-field. Use extracted text as a springboard document download; optional future bridge into `form_template_field_defaults` remains out of scope for this delivery.
