# Banking Data Migration — Migration Strategy & Product Takeover (v1316–v1317)

Banking & Financial Services → **Data Migration** menu (Platform). Both registers use the Local
Register Engine (tabs come from `local_register_fields.field_group`).

## How the two registers work together

| Register | Holds | One record per |
|---|---|---|
| **Migration Strategy** (`fin_migration_strategy`) | The strategy document: summary, scope, approach, cutover, data takeover overview, products in scope, data quality, accounting & reconciliation, risks, roles, sign-off, glossary | Strategy document (version) |
| **Data Scope** (`fin_data_scope`) | The detailed takeover rules for one product or data area | Product / data area (e.g. Customer Accounts) |

The strategy lists the products in scope (searchable multi-select). Each product's detailed rules —
scope criteria (e.g. category ranges), inclusions, exclusions, numbering/key rules, freeze rules,
cut-off, uncleared items, accounting entries, reconciliation and sign-off — are a Data Scope record.
This keeps the strategy short when 30+ products are involved; the Data Scope list gives one row
per product to filter and export.

Each Data Scope record carries a **Migration Strategy Reference** text field (the engine has no
record-link field type yet).

## Flexibility

No vendor, product or module names (rule 26). Product options use neutral banking names (e.g.
"Current & savings accounts", "Letters of credit (issued & advised)", "Securities custody
accounts"), so the forms work with any core banking system. The strategy form itself also works
for non-banking migrations (system category, generic data categories, free lists).

## Data Scope tabs

- **Details:** Product / Data Area*, legacy source module, target module, owner, strategy reference, wave
- **Scope & Rules:** scope criteria, inclusion rules, exclusion rules, numbering & key rules, restrictions carried over, special conditions
- **Prerequisites & Steps:** target setup required first, freeze/blackout rules, migration steps, dependencies
- **Volumes & Balances:** record count, balance total, balance cut-off rule, uncleared items / value dates, accounting entries
- **Reconciliation & Sign-Off:** reconciliation checks, balance reconciliation required, product owner signed off, sign-off date, open issues
- **Notes**

Statuses: Draft → In Scope → Rules Approved → Migrated → Reconciled & Signed Off, or Out of Scope.

## SQL

- `SQL/v1316_fin_migration_strategy_fields.sql` — strategy form (58 fields), `long_text` field type, document statuses
- `SQL/v1317_fin_product_takeover.sql` — Product Takeover tab, accounting/IFRS 9 fields (65 fields, 15 tabs), Data Scope fields (27) and statuses

## Later: document features (v1318)

Migration Strategy is a document register: in-app sign-off, attachments as annexures and the complete
Word/PDF document export — see `Documentation/Register_Documents_v1318_Guide.md`. Its free-text Approvals
field was removed (v1321); Version History now sits on a Document Control tab.

## Source Systems form (v1344)

The Source Systems register (Data Migration) now records each legacy source in full, in tabs:

| Tab | Fields |
|---|---|
| Details | System type, vendor / product, version, entities or branches covered, business and technical owners, migration criticality, migration wave |
| Technical & Access | Hosting, database / platform, extraction method, extract file format, who extracts, access status, access reference (never passwords) |
| Data Profile | Data domains held, key tables / files, record count, data volume (GB), history available, data quality rating, known data issues |
| Extraction & Cutover | Extraction runs (table: run, planned / actual date, records, status), data freeze date, final extract date, extract duration, control totals source, dependencies |
| Retirement | After go-live (decommission, read-only, archive, keep in use), decommission date, read-only access until, regulatory retention, archive approach |
| Notes | Open issues, notes |

Statuses: Identified → Profiled → Connected → Extracted → Reconciled → Retired. All fields are optional.
SQL: `SQL/v1344_fin_source_systems_fields.sql`, then the sample values `SQL/v1345_fin_source_systems_seed.sql`
(10 sample records on SEED334-PRJ-08; existing values are kept).

## Data Mapping form (v1348)

Each Data Mapping record is one data mapping sheet (DMS) for one data object, in tabs:

| Tab | Fields |
|---|---|
| Details | DMS reference, data object, product / data area (same list as Data Scope), mapping version, load type (reference, static, financial, delta), load sequence, migration wave, business owner, mapping analyst |
| Source & Target | Source system, source tables / files, **Load Steps** (v1351/v1353 — one row per load: extract file, target module ▾, load step ▾, target table ▾, activity, load method ▾), record key / alternate key rule |
| Field Mappings | Field mapping table (target field, source field(s), transformation rule, mandatory, default value), code / lookup value mappings, mapping completeness % |
| Rules & Validation | Selection and exclusion criteria, general transformation rules, validation rules before load, known data quality issues, open questions |
| Load & Reconciliation | Expected record count, load results per run (expected, loaded, rejected, result), reconciliation keys and control totals, reconciliation report reference |
| Approval | Business and technical reviewers with sign-off dates |
| Notes | Change history, notes |

Statuses: Draft → Reviewed → Approved → Tested in Mock → Baselined for Go-Live. All fields are optional.
SQL: `SQL/v1348_fin_data_mapping_fields.sql`, then the sample values `SQL/v1349_fin_data_mapping_seed.sql`
(10 sample mapping sheets on SEED334-PRJ-08; existing values are kept).

## Target Module list and Load Steps (v1351)

- **Target Module** is one shared list of 20 vendor-neutral modules (Customer, Accounts, Deposits,
  Lending, Limits, Collateral, Trade Finance, Treasury, Securities, Cards, Payments and Transfers,
  Cheques, General Ledger, Internal Accounts, Teller and Cash, Imaging and Documents, Delivery and
  Messaging, Users and Security, Reference Data and Parameters, Other). Data Scope's Target System
  Module is now a dropdown on it; existing text was converted (unrecognised text is kept as it was).
- **Load Steps** (Data Mapping → Source & Target) replaces the separate Extract File Name, Target
  Module, Target Table / Load Activity and Load Method fields, because one mapping sheet often has
  several loads. Target Module, Load Step (Create / takeover, Capture balances, Adjust balance,
  Capture bills, Journal / data capture, Update / amend) and Load Method are dropdowns; the
  product-specific table or activity name stays free text. Existing values moved into row 1.
- Table fields can now have dropdown columns (`type: 'select'` with `options` in the column
  definition); the cell stores the option label, so views and exports show it as text.

SQL: `SQL/v1351_fin_target_module_list_and_load_steps.sql` (after v1348–v1350; do not re-run v1348 afterwards).

### Target Table list (v1353)

The Load Steps "Target Table / Activity" column was split: **Target Table** is a dropdown of 47
vendor-neutral tables labelled "<Target Module> – <Table>" (e.g. "Lending – Loan bills", "Accounts –
Account arrangement"), and **Activity** stays free text (e.g. "Capture overdue and due bills with
ageing"). Existing text moved to Activity; the 10 sample sheets got their Target Table.
SQL: `SQL/v1353_fin_data_mapping_target_table_list.sql` (after v1351). To add tables, extend the list in
that file and re-run it.

## Data Cleansing form (v1356)

Each Data Cleansing record is one data quality issue and the work to fix it before migration, in tabs:

| Tab | Fields |
|---|---|
| Details | Issue reference, product / data area (Data Scope list), data object, source system, issue category, severity, blocks migration, found during, business data owner, cleansing lead |
| Impact & Scope | Records checked, records affected, value affected, detection rule / query, impact if not fixed, affected mapping sheets (DMS) |
| Cleansing Approach | Cleansing method (fix at source, transformation rule in staging, fix after migration, exclude, close / archive first, accept as is), responsible team, cleansing rules / steps, customer consent or approval needed |
| Progress | Target and actual completion dates, records corrected, progress %, target quality %, progress log (date, corrected, remaining, comment) |
| Verification | Verification method, verified in, verified by, verification date, residual exceptions, residual risk accepted |
| Notes | Open issues, notes |

Statuses: Not Started → In Progress → On Hold → Complete → Verified → Closed – Risk Accepted. All fields are optional.
SQL: `SQL/v1356_fin_data_cleansing_fields.sql`, then the sample values `SQL/v1357_fin_data_cleansing_seed.sql`
(10 sample issues on SEED334-PRJ-08; existing values are kept).

## Transformation, Rules, Mocks, Reconciliations, Defects and Sign-Off forms (v1359)

| Register | Tabs (key fields) | Statuses |
|---|---|---|
| Data Transformation | Details (reference, type, product area, data objects, DMS, owner, developer) · Transformation Logic (source / target fields, logic, examples table, exceptions) · Build & Test (implemented in, script, unit tested, last tested in, records transformed, exceptions) · Approval · Notes | Not Started → In Progress → In Test → Complete |
| Migration Rules | Details (reference, category, applies to products, owner, source) · Rule Detail (statement, rationale, scenarios table, exceptions) · Enforcement (enforced by, enforcement point, compliance check, breaches last run) · Approval (approved by / date, applies from, review date) · Notes | Draft → In Review → Approved → Retired |
| Mock Migrations | Details (round, window, environment, planned / actual dates, lead) · Scope & Data · Execution (durations, records, success rate, load results table) · Results & Issues (reconciliation result, defects, lessons, runbook changes) · Exit & Sign-Off (exit criteria, met, decision, signed off by / date) · Notes | Planned → In Progress → Complete → Repeat Required |
| Reconciliations | Details (type, run, product area, data object, level, reconciler, date) · Figures (source / target / rejected counts, source / target values, difference, tolerance) · Method & Evidence · Exceptions (summary, root cause, linked defects, action owner / due) · Sign-Off · Notes | Open → In Progress → Reconciled → Exception → Signed Off |
| Migration Defects | Details (reference, severity, priority, category, found in, product area, data object, raised by / date) · Analysis (records affected, evidence, root cause, DMS) · Resolution (assigned to, resolving party, fix type, fix, target / fixed date) · Retest (retest in, result, date, closed by) · Notes | Open → In Progress → Resolved → Closed → Deferred / Accepted |
| Migration Sign-Off | Details (reference, type, run, products covered, coordinator, requested / due date) · Approvers (table: department, name, role, decision, date) · Evidence (evidence, reconciliation references, open defects, conditions) · Decision · Notes | Pending → Signed Off → Signed Off with Conditions → Withheld |

Existing status keys are kept; Mock Round gains Mock 3. All fields are optional.
SQL: `SQL/v1359_fin_migration_registers_fields.sql`, then the sample values `SQL/v1360_fin_migration_registers_seed.sql`
(10 sample records per register on SEED334-PRJ-08; existing values are kept).
