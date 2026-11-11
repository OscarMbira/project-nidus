# Register Document Templates and the Core Banking DMSD Template (v1336)

**PRD:** `projectprd/v1336_register_document_templates_cbs_dmsd_PRD.md` ·
**Plan:** `projectplan/v1336_register_document_templates_cbs_dmsd_plan.md` ·
**Builds on:** [Register Documents (v1318)](Register_Documents_v1318_Guide.md)

## What it is

A **template** is a pre-filled record of a document register, saved with its linked child records and
annexure files. Starting a new record from a template copies all of it into the project, so the user
fills in the gaps instead of writing the document from scratch. Copies are independent of the template:
later template changes do not touch records already created.

Available on every document register (Platform and Simulator). The first shipped template is the
**Core Banking System Data Migration Strategy (DMSD)**, for the Banking & Financial Services pack.

| Template kind | Who creates it | Who can use it |
|---|---|---|
| System (shipped) | Project Nidus (SQL v1341) | Everyone with access to the register; read-only |
| Organisation | PMO Admin tier, Account Owner, Project / Programme / Portfolio / Financial Programme Manager | Members of the organisation |

## Using a template

1. Open the register (e.g. **Banking & Financial Services → Data Migration → Data Migration Strategy**) inside a project.
2. Click **New Data Migration Strategy** and choose **Blank** or a template on the **New …** page (its own address, `…/local-registers/<register>/new` — not a popup, v1361). **Preview** shows the complete document.
3. Give the record a title and click **Create from template**. The strategy, one Data Scope record per
   product area and the annexures are created in the project, and the new record opens.
4. A yellow banner lists the **[placeholders]** still to fill (e.g. `[Bank Name]`,
   `[Legacy Core Banking System]`) and the tabs they sit on. It disappears once none remain.
5. Remove the product areas that do not apply: untick them in **Products in Scope** and delete their
   Data Scope records.

## Organisation templates

- **Templates tab** (on the register list): every template, A→Z, with Preview / Use, and — for managers —
  **Customise** (copy a system template into the organisation), **Edit** and **Archive / Restore**.
- **Save as template** (on a record): saves the record, its child records and annexures as a new
  organisation template, or replaces an existing one (its version goes up by one).
- Editing a template uses the normal record form in template mode
  (`…/local-registers/<register>/templates/<template id>/edit`).

## One strategy per project, with version history (v1339)

The Data Migration Strategy register allows **one live record per project** (an organisation can have
many — one per project). **New** turns into **Open Data Migration Strategy** when the project already
has one; creating a second from a template opens the existing one instead.

Every save creates a new **version**: the record header shows **Version N**, and the **Audit details** tab
lists each version with who, when and every changed field (before → after). History is append-only.
The register's workflow is Draft → In Review → Approved (Superseded was removed).

## The CBS DMSD template content

A generic, vendor-neutral superset of two sample bank strategies (no bank, vendor or product names —
rule 26):

- **Strategy** — every tab filled: purpose, scope, assumptions and constraints; big bang vs phased
  approach and single vs multi-window cutover; stage responsibilities, load error ownership, runbooks;
  services impacted, notifications, go / no-go decision points, rollback; data standards and load file
  conventions; migration accounting with worked examples (loans, overdue bills, suspended interest,
  amortised fees, deposits, account balances, lowest-balance split, P&L, internal accounts); IFRS 9;
  reconciliation (raw data and functional); pre / post-migration tasks; risks; participants, roles and
  environments; glossary (31 terms); 13 appendices; sign-off by department.
- **Data Scope** — 33 product areas, each with its migration method, responsible party, load steps
  (table: step, what is loaded, mapping sheet, applies when), rules, accounting entries and checks.
- **Annexures** — A and B cutover timelines (single window, multi-window), C data hand-off control form
  (Word), D RACI matrix (Excel).

Check the content after any edit: `node scripts/check-cbs-dmsd-template.mjs` (banned names,
placeholder format, product ↔ Data Scope coverage).

## SQL and scripts (run in order)

Prerequisite: v1318–v1335 already run.

| Step | File | Purpose |
|---|---|---|
| 1 | `SQL/v1336_register_templates_schema.sql` | Template tables (public + sim), switches, provenance, bucket and storage rules |
| 2 | `E:\project-nidus-admin\SQL\v244_local_register_templates_id_generation_seed.sql` | Display IDs RTPL / SRTP |
| 3 | `SQL/v1337_register_templates_functions.sql` | Create from template, save, customise, update, archive |
| 4 | `SQL/v1338_fin_migration_strategy_sample_v2_additions.sql` | Fields and options added from the second sample |
| 5 | `SQL/v1339_register_one_per_project_and_versions.sql` | One strategy per project, version history |
| 6 | `SQL/v1340_register_templates_and_versions_tests.sql` | Tests — shows a pass/fail table; everything it creates is rolled back |
| 7 | `SQL/v1341_fin_cbs_dmsd_system_template.sql` | The CBS DMSD system template |
| 8 | `node scripts/seed-cbs-dmsd-template-annexures.mjs` | Template annexure files |
| 9 | `SQL/v1342_fin_data_migration_seed_from_cbs_template.sql` | Sample record LREG-2026-105 re-created from the template |
| 10 | `node scripts/seed-data-migration-strategy-annexures.mjs` | Sample record annexures |
| 11 | `SQL/v1343_fin_data_migration_menu_role_access.sql` | Data Migration menus for the finance, assurance and data roles |
| 12 | `SQL/v1326_local_register_table_field_type.sql` (re-run) | Table columns after v1338 |
| 13 | `SQL/v1251_planner_table_wall.sql` (re-run) | Planner wall for the new public tables |

Do not re-run v1329–v1331 after v1342: they would overwrite the sample with the old content.

## Where it lives

- Service: `packages/shared/src/services/localRegisterTemplateService.js`
- Placeholders: `packages/shared/src/utils/registerPlaceholders.js`
- UI (`@nidus/ui`): `RegisterTemplatePicker`, `RegisterTemplatesTab`, `SaveAsTemplateDialog`,
  `PlaceholderBanner`, `RegisterVersionHistory`
- App hook (identical per app, different database client): `apps/*/src/lib/useRegisterTemplates.jsx`
- Pages: `apps/*/src/pages/localRegisters/LocalRegister{ListPage,DetailPage,Form,AuditPanel}.jsx`
- Annexure files: `Design Images/seed/cbs-dmsd-template/`, `Documents/seed/cbs-dmsd-template/`
