# v1336 — Register Document Templates + Core Banking System Data Migration Strategy (CBS DMSD) Template

**Status:** Draft — awaiting owner approval.
**Requested by:** Oscar Mbira, 2026-10-24.
**Related:** v931 Local Register Engine, v1316/v1317 Migration Strategy + Data Scope, v1318 document
registers (sign-off, annexures, complete document), v1326 table fields, v1332/v1333 linked product
sections, v1329–v1331 seed (LREG-2026-105). Rules 16.2, 25.1, 26, 34, 38, 41, 61, 63.1, 65, 67, 69.
**Source material:** `Documents/Data Migration Sample v1.docx`, `Documents/Data Migration Sample v2.docx`.

---

## a) Problem statement

Banks running a core banking replacement write a Data Migration Strategy Document (DMSD). The two
completed samples follow the same backbone — executive summary, glossary, migration rules and approach
options, data takeover per product, migration accounting, pre/post-migration tasks, reconciliation,
roles, environments, appendices — but every bank starts from a blank form today. The Local Register
Engine has **no templates and no copy feature**: a Banking & Financial Services organisation cannot
start a strategy from a proven, pre-filled document, and cannot keep its own customised version for
the next project.

## b) Solution

1. **Register record templates (engine feature, any register).** A template is a pre-filled record of
   a register, together with its linked child records (e.g. Data Scope products) and its annexure
   files. Two kinds: **System** (shipped with the product, read-only, visible wherever the register is
   available — i.e. every Banking & Financial Services account for the DMSD) and **Organisation**
   (created by a PMO Admin / Project Manager, visible across that organisation).
2. **New from template.** On a register's list page, **New** offers *Blank* or *From template*. The
   copy is an ordinary record in the chosen project: strategy (all tabs), one Data Scope record per
   product, and the annexures. Sign-off and audit history are never copied. The copy is a snapshot —
   later template changes never alter it — and records which template/version it came from.
3. **Save as template / Customise.** From any document record, or from a System template, a PMO Admin
   / Project Manager can save an Organisation template (name, description), edit it, archive it.
4. **CBS DMSD system template.** A generic, vendor-neutral Data Migration Strategy built from the
   best of both samples, with bracketed placeholders ([Bank Name], [Legacy Core System],
   [Target Core System], [Go-Live Date] …). The record shows "N placeholders still to fill" until none
   remain.
5. **One strategy per project, with version history (owner rule, 2026-10-24).** A project has at
   most one Data Migration Strategy record (an organisation can have many, one per project). Every
   save keeps the replaced field values as a history entry (old → new, who, when) and increases the
   record version; only the current version is live. Enforced by the database.
6. **Seed alignment.** The project's existing example (LREG-2026-105 and its Data Scope records) is
   replaced by a copy made from the template, so the sample data matches the template.

## c) User stories

1. As a member of a Banking & Financial Services organisation, on the Data Migration Strategy list I
   click **New** and choose **Blank** or **From template**.
2. … I see template cards (name, description, System / Organisation, products included, last updated)
   and can **Preview** a template as the complete document before using it.
3. … I pick the CBS DMSD, give a title and confirm the project; a new strategy is created with every
   tab filled, one Data Scope record per product in scope, and the annexures attached.
4. … the new record opens; a banner lists how many [placeholders] remain and on which tabs; it
   disappears when none remain.
5. As a user, the copy is fully editable; its sign-off starts empty; its Audit tab shows "Created from
   template CBS DMSD v1 on <date>".
6. As a PMO Admin / Project Manager, on any document record I choose **Save as template**, enter a name
   and description, and get an Organisation template that includes the record, its linked product
   records and its annexures.
7. … on the list's **Templates** tab I see System and Organisation templates; on a System template I
   choose **Customise** to make an Organisation copy I can edit.
8. … I can open an Organisation template, edit its fields, product records and annexures, rename it,
   or archive it. System templates are read-only.
9. As any organisation member, I see my organisation's templates and the System templates — never
   another organisation's.
10. As a user of an organisation without the Banking & Financial Services industry, I never see the
    CBS DMSD (the register itself is not available to me).
11. As a Simulator user, the same template features work for Simulator records of system registers.
12. As the product owner, the CBS DMSD contains no bank, vendor or product brand names (rule 26).
13. As a user, a project can hold only one Data Migration Strategy: New / New from template on a
    project that already has one is refused with "This project already has a Data Migration Strategy —
    open it" (an organisation keeps one per project across its projects).
14. As a user, each save of the strategy records the previous values of the changed fields as a
    version entry; the record shows "Version N"; the Audit tab lists every version with who, when and
    each field's old → new value.
15. As an auditor, history entries cannot be edited or deleted by anyone.
16. As a signatory, a signed (Approved) strategy can only change after Restart sign-off; that change
    becomes a new version and the signed version stays in history.

## d) Implementation decisions

### d.1 Owner decisions (interview 2026-10-24)
| # | Decision |
|---|---|
| 1 | Templates are a **register engine feature** (pre-filled records), not the Admin Global Template Library and not plain seed data |
| 2 | A copy includes **strategy + Data Scope product records + annexures**; never sign-off or audit history |
| 3 | Bank/vendor specifics become **bracketed placeholders** with a "still to fill" reminder |
| 4 | **PMO Admin / Project Manager** create Organisation templates (Save as template, Customise), visible organisation-wide; built now |
| 5 | Entry points: **New → Blank / From template** and a **Templates tab** on the register list; **Save as template** on records |
| 6 | Content: **best-of-both superset** of the two samples, generic wording |
| 7 | **Replace** LREG-2026-105 (and its Data Scope records) with a copy made from the template |
| 8 | Copies are **independent snapshots**; they record template id + version |
| 9 | **One Data Migration Strategy per project** (many per organisation); refused by the database |
| 10 | **Every save versions the record**: replaced field values move to an append-only history (old → new, who, when); only the current version is live |
| 11 | Per-register switches (`one_record_per_project`, `versioned`) — on for the Data Migration Strategy only; the "Superseded" status is removed from its workflow |
| 12 | Data Scope product records are **not** versioned (strategy record only) unless requested later |

### d.2 Data model (public + sim, rule 34)
- `local_register_templates` — `id`, `display_id` (Admin ID Generation, rule 16.2), `register_key`,
  `template_scope` (`system` | `organisation`), `account_id` (NULL for system), `name`, `description`,
  `version` (int, +1 on each save), `record_title`, `record_description`, `record_status`,
  `field_values` (jsonb), `source_template_id`, `is_archived`, audit columns.
- `local_register_template_children` — `template_id`, `link_field_key` (e.g. `product_takeover_details`),
  `register_key` (e.g. `fin_data_scope`), `sort_order`, `title`, `description`, `status`,
  `field_values`.
- `local_register_template_attachments` — `template_id`, `sort_order`, `annexure_title`, file columns;
  files in the private bucket `local-register-templates` (path `<template_id>/…`).
- `local_register_records`: `created_from_template_id`, `created_from_template_version`.
- `local_registers`: `one_record_per_project`, `versioned` (booleans). Partial unique index on
  (register_id, record_project_id) for live records of registers with `one_record_per_project`
  (enforced by a trigger, since the flag lives on the register).
- `local_register_record_versions` (public + sim) — `record_id`, `version_number`, `changed_by`,
  `changed_at`, `changes` (jsonb: field key → { label, old, new }, incl. title/description/status),
  `change_reason` (optional). Append-only: no client update/delete; written by a BEFORE UPDATE trigger
  on versioned registers, which also increments `record_version`.
- Registry rows (`database_tables`), Admin ID rule seed (Admin repo), Planner wall re-run (v1251).

### d.3 Behaviour
- **Visibility (RLS):** System templates readable by any signed-in user who can see the register;
  Organisation templates readable by members of `account_id`. Writes only through functions.
- **Functions (SECURITY DEFINER):** `local_register_template_create_record(template_id, project_id,
  title)` → new record + child records (status reset to the register's first status, values copied,
  placeholders kept, sign-off empty, provenance set); `local_register_template_save(record_id, name,
  description, template_id?)` → create / update an Organisation template from a record (+ its linked
  child records for the same project + attachment list); `local_register_template_customise(template_id,
  name)`; `local_register_template_archive(template_id)`. Organisation writes require PMO Admin tier or
  Project Manager role in the organisation.
- **Files:** the client copies annexure files with Storage `copy` (template bucket ↔ record attachments
  bucket) and inserts the attachment rows; Storage rules mirror the table rules.
- **Placeholders:** `[Text]` patterns (square brackets, 2–40 chars, capitalised) found in field values,
  title and description; banner on the record view/edit page with the count per tab.
- **UI:** New → modal choice is a small action dialog (allowed under rule 65); template preview reuses
  the complete-document PDF (v1318); Templates tab = Card/Table list (rules 40/41/44/61) with Preview,
  Use, Customise, Edit, Archive. Editing an Organisation template uses the normal register form in
  "template mode" (routed page `…/templates/:templateId/edit`, rule 65).

### d.4 CBS DMSD content (generic, superset of v1 + v2)
Placed into the existing Data Migration Strategy tabs (58+ fields) and Data Scope fields:
- **Executive Summary / Scope / Assumptions & Constraints:** introduction, purpose, objectives, in/out
  of scope, assumptions, constraints (generic, placeholders for bank, systems, entities, dates).
- **Migration Approach:** approach options (big bang, phased, parallel run), recommended approach
  rationale, migration activities, runbook and timing log, audit trail, stages in data transition,
  system parameterisation and readiness checks.
- **Cutover & Services:** migration windows (static data window, financial data window), services and
  channels impacted, customer communication, rollback approach.
- **Data Takeover / Product Takeover:** data categories, data objects, source systems, tool, volumes,
  mock runs, dress rehearsals; products in scope (all ~31 neutral product areas from both samples).
- **Data Scope (one template child per product, ~31):** for each product — description, legacy/target
  module placeholders, scope criteria, inclusion/exclusion rules, numbering/key rules, prerequisites,
  freeze rules, migration steps (process summaries for deposits, lending, accounts), cut-off and
  uncleared-items treatment, accounting entries, reconciliation checks.
- **Data Quality:** integrity rules, cleansing approach, data standards, quality target.
- **Migration Accounting & Reconciliation:** take-on balances, overdue bills, amortised fees, deposits,
  accrued interest, P&L and internal account balances, IFRS 9, holding/suspense accounts,
  reconciliation approach and levels.
- **Pre & Post Migration, Risks, Roles & Environments:** task lists, risks–mitigations, parties,
  RACI-style responsibilities, environments and environment management.
- **Glossary (table), Appendices (table), Version History (table: v0.1 template).**
- **Annexures:** generic cutover timeline diagrams (big bang, phased) and generic hand-off control form
  and RACI matrix (bank names removed; redrawn/edited copies of the sample artefacts).

### d.5 Integration with the existing record (owner reminder 2026-10-24)
The template fills the Data Migration Strategy **as it exists today** — no new tabs, no parallel
structure. Field keys, tabs, table fields (v1326), linked product sections (v1332/v1333), sign-off
(v1318), attachments, complete document export and custom fields are reused as they are.

| Existing tab / feature | What the template provides | New behaviour (this PRD) |
|---|---|---|
| Details | Document reference [DMS-REF], version 0.1, owner [Document Owner], migration type/approach, [Target Core System], [Go-Live Date] | Placeholder banner above the tabs |
| Executive Summary · Scope · Assumptions & Constraints | Generic introduction, purpose, objectives, in/out of scope, assumptions, constraints | — |
| Migration Approach | Approach options, recommended approach, activities, runbook/timing log, audit trail, stages, readiness | — |
| Cutover & Services | Migration windows, services/channels impacted, communication, rollback | — |
| Data Takeover | Data categories, objects, source systems, tools, volumes, mock runs, rehearsals | — |
| Product Takeover | Products in scope (~31) + approach; **Product Takeover Details** come from the copied Data Scope records (one per product) | Copy creates the Data Scope records in the same project |
| Data Quality · Migration Accounting & Reconciliation | Integrity, cleansing, standards; take-on balances, overdue bills, fees, deposits, accrued interest, P&L, internal accounts, IFRS 9, reconciliation | — |
| Pre & Post Migration · Risks · Roles & Environments | Task lists, risks–mitigations, parties, responsibilities, environments | — |
| Glossary & Appendices | Glossary table (generic terms), Appendices table | — |
| Notes | Empty | — |
| **Sign-Off** (approvals table, v1327) | Rows with placeholder names: [Name] · [Role] · date blank | — |
| Document Control | Version History table row "0.1 · Template" | Record version number shown here and on the header ("Version N") |
| Custom Fields | System template: none. Organisation templates: values of the organisation's own custom fields are kept | — |
| Attachments (annexures) | Generic annexures A–D | Copied as files into the new record |
| **Sign-off** (in-app signing, v1318) | — (never copied) | — |
| Audit details | — | "Created from template … v…" and the **version history** list (old → new per field) |
| Header buttons View · Export · Edit | Unchanged; View/Export show the complete document | New **Save as template** button (PMO Admin / PM) |
| List page | — | **New → Blank / From template**, **Templates** tab |

Both the Simulator and Platform copies of the list, view and form pages get the same changes (rule 34).

### d.6 Additions from Sample v2 (checked 2026-10-24, before execution)
The current form was built from Sample v1. Sample v2 adds the following; they are added to the
existing tabs (no new tabs) and filled in the template. All names vendor-neutral (rule 26).

**Strategy — new fields**
| # | Field (tab) | Type |
|---|---|---|
| A1 | Cutover Window Approach (Cutover & Services) | dropdown: Single window · Multi-window (static data early, delta on cutover weekend) |
| A2 | Data Loaded Before Cutover (Cutover & Services) | list |
| A3 | Migration Sequence by Entity / Instance (Migration Approach) | table: Entity · Approach · Window · Target date (date) |
| A4 | Runbooks (Migration Approach) | table: Runbook · Audience · Owner · Reference |
| A5 | Stage Responsibilities (Migration Approach) | table: Stage · What happens · Responsible |
| A6 | Load Error Ownership (Migration Approach) | table: Error cause · Who fixes |
| A7 | Load File Conventions (Data Quality) | table: Item · Standard |
| A8 | Migration Participants (Roles & Environments) | table: Participant · Organisation |
| A9 | Go / No-Go Decision Points (Cutover & Services) | table: Decision point · When · Sign-off by |
| A10 | Stakeholder & Regulator Notifications (Cutover & Services) | table: Stakeholder · What · When · Owner |
| A11 | Suspense Account Closure (days after go-live); Take-on Differences Account (Migration Accounting & Reconciliation) | number; text |

**Strategy — options / columns:** B1 Environments Used + "Staging (transformation)"; B2 Reconciliation
Levels + "Raw data (loaded vs extracted files)", "Functional (system reports)"; B3 Sign-Off table + a
Department column (first column).

**Data Scope — new fields:** C1 Migration Method (dropdown: Automated load (mapping sheet) · Standard
upload utility · Manual capture · Interface / API (no migration) · Not migrated); C2 Responsible Party
(dropdown: Bank · Migration partner · Target system vendor · Legacy system vendor · Shared); C3 Migration
Steps becomes a table (Step · What is loaded · Mapping sheet · Applies when — existing lines kept);
C4 Pre-Migration Actions, Post-Migration Actions (lists); C5 Fields Updated Manually After Migration
(list); C6 products + "Nostro / vostro accounts", images option relabelled "Customer images,
signatures, mandates & KYC documents" (stored values unchanged).

**Content (existing fields):** per-product load sequences (deposits 3 steps, lending 9 incl. repayment
holidays, manual suspension, amortised fees; accounts 5 incl. lowest-balance rule), takeover suspense
rules, accounting worked examples (loans, overdue bills, amortised fees, deposits, account balances,
accrued debit/credit interest, suspended interest, P&L mapping, internal accounts), IFRS 9 cashflow
classification at takeover, pre/post checklists, raw vs functional reconciliation, extra glossary terms,
generic appendices (load file naming convention, migration control matrix, business and technical
runbooks, schedule baseline, pre/post-migration checklists, manually updated attributes).

SQL: v1338 (fields/options/columns, Platform register definitions; Simulator reads the same system
register definitions). Field keys new; existing values preserved; complete document and template pick
them up automatically.

## e) Testing decisions
- **SQL tests (versioning):** second strategy in a project refused; first save writes version 1→2
  with only the changed fields; history rows cannot be updated or deleted by clients; sign-off lock
  still applies.
- **SQL tests:** create-from-template copies record + children, resets status/sign-off, sets
  provenance; organisation template visibility per account; system template read-only; only PMO Admin
  / PM can save; archive hides a template from New.
- **Unit:** placeholder detection; template card list (sorting, filters); New dialog; Save-as-template
  dialog; copy service (file copy + rows); Simulator parity.
- **Content check:** script asserting no banned names (KCB, CRDB, LISCO, T24, Transact, R14, R21,
  Temenos, …) in the template seed; every product in scope has a Data Scope child.
- **Manual:** create from template in a FIN project; complete document export of the copy (TOC,
  products, annexures); Save as template; Customise; Simulator.

## f) Out of scope
- Pulling later template changes into existing copies (decision 8).
- Restoring an older version in one click (history is for audit reference; a restore button can follow).
- Versioning Data Scope product records (decision 12).
- Templates for non-document registers in the UI (the engine supports them; only document registers
  get the New/Templates UI now).
- Admin-app management of system templates (system templates change through SQL seed files).
- Templates for the other 29 document registers' content (engine ready; content later, on request).
- Translating the template.

## g) Further notes
- The two sample documents are source material only; nothing bank-identifying is shipped.
- The replaced seed record keeps its LREG display ID if possible (re-created with the same id).
