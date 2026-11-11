# IT Requirements Specification (v1338) — Guide

**PRD:** `projectprd/v1338_ict_requirements_specification_PRD.md` · **Plan:** `projectplan/v1338_ict_requirements_specification_plan.md`
**Apps:** Platform and Simulator · **Menu:** Information Technology → Requirements

## What it is

IT and banking projects need a signed **Business Requirements Document (BRD)** or **Functional
Requirements Specification (FRS)** before design, testing and change control start. Project Nidus now has
one, without typing requirements twice:

* **Requirements Specification** — one signed document per BRD or FRS (choose the *Document Type*). It has
  an Introduction (purpose, overview, in and out of scope), a Summary (summary, assumptions, constraints,
  dependencies), a Glossary, Appendices and Document Control, like the other IT documents.
* Its **Business, Functional, Non-Functional and Other Requirements** chapters are filled from the
  project's **Requirements register** — they are not typed into the document. Non-functional requirements
  are grouped by area (Volumes, Performance, Security, Migration, Data Requirements, Data Protection &
  Privacy, Enquiry & Reports, Availability & Recovery, Usability & Accessibility, Audit & Logging). A
  chapter only appears in the exported document when it has requirements.
* Its **Use Cases** chapter shows the project's **Use Cases** records.

## The menu

| Item | Opens |
|---|---|
| Requirements Specification | The BRD / FRS documents |
| All Requirements | The Requirements register |
| Business / Functional / Non-Functional Requirements | The same register, already filtered to that category |
| Use Cases | The Use Cases register |
| Traceability | The traceability matrix for the current project |
| Requirement Changes | Change requests linked to requirements |

The old *Technology Delivery → Requirements* link is gone; everything is under *Requirements*.

## Capturing requirements

Each requirement now also records:

* **Owner** — who is accountable for it.
* **Rationale** — why it is needed.
* **Verification method** — Test, Inspection, Demonstration or Analysis (on the *Acceptance* tab).
* **Non-functional area** — shown only when the category is *Non-functional*; the specification groups by it.

The register list has a **category filter**, and Owner and Area columns; exports include the new fields.

## Use cases

One record per use case: Use Case ID, primary and secondary actors, priority, frequency, trigger, pre- and
postconditions, business rules, related requirements and related screens or reports. **Main Flow** and
**Alternative / Exception Flows** are step tables (Step | Actor | Action) — searchable, sortable, and
exported as tables.

## Signing a specification

On the *Sign-off* tab the specification suggests **Business Owner, IT / Solution Lead and Project
Manager**. Remove any that do not apply, choose the people, and start sign-off. If your organisation has
set its own roles on the *Document Signatory* page, those are used instead.

## Templates

Two system templates help you start: **Business Requirements Document** and **Functional Requirements
Specification**. They contain standard wording with [placeholders]. Requirements and use cases always come
from the registers of the project you create the document in.

## Functional Design

Functional Design no longer has typed *Business Requirements* and *Functional Requirements* lists — it
shows the same read-only view of the Requirements register. Anything typed there before is kept in
**Requirements Notes (legacy)**.

## Requirement changes

A change request can list the **Related requirements** it adds, alters or removes. *Requirement Changes*
opens the change register showing only those; *Show all changes* clears the filter.

## Sample data

Project **SEED334-PRJ-08** (Platform) and practice project **SEED592-PP-01** (Simulator): 60 requirements
(12 business, 22 functional, 20 non-functional — two in each area — 2 technical, 3 regulatory, 1 other),
10 use cases and 10 specifications (one per delivery slice, BRD and FRS alternating).

## Running the SQL (owner)

The app hides the new fields until their columns exist, so nothing breaks before the SQL is run. Run in
this order in the Supabase SQL editor:

1. Templates, if not yet applied: `SQL/v1336_register_templates_schema.sql`, `SQL/v1337_register_templates_functions.sql`
2. `SQL/v1384_requirements_register_owner_rationale_area.sql`
3. `SQL/v1385_ict_requirements_menu.sql`
4. `SQL/v1386_ict_use_cases_register.sql`
5. `SQL/v1387_ict_requirements_specification_register.sql`
6. `SQL/v1388_local_register_suggested_signatories.sql`
7. `SQL/v1389_ict_functional_design_linked_requirements.sql`
8. `SQL/v1390_change_requests_related_requirements.sql`
9. `SQL/v1391_ict_requirements_specification_templates.sql`
10. Admin repo: `E:\project-nidus-admin\SQL\v245_sim_requirements_register_id_generation_seed.sql`
11. `SQL/v1392_sim_requirements_register_id_generation.sql`
12. `SQL/v1393_ict_requirements_seed.sql`
13. Re-run `SQL/v1251_planner_table_wall.sql` (new table `requirement_nfr_areas`).

Re-running `SQL/v949` or `SQL/v1324` later would undo parts of this (the old menu link; Functional Design's
text fields) — re-run v1385 / v1389 afterwards.

## For the blog

*"Requirements, written once."* Most teams keep requirements in two places: a spreadsheet the testers use
and a Word document the sponsor signs. They drift. In Project Nidus the requirement lives in one register;
the signed BRD or FRS shows it, grouped the way a specification is read — business, functional, and
non-functional by area — with use cases as step-by-step tables. Change a requirement and the next export of
the document shows the change; link a change request to it and it appears under *Requirement Changes*.

## Engine additions (for developers)

* **Core linked source** — a `linked_records` field whose option value starts with `core:` reads a core
  table. `core:requirements` reads `requirements_register` (public or sim) for the record's project, with
  optional `category` (one or a comma list) and `group_by: "nfr_area_key"`. It returns prebuilt blocks
  (one requirements table per category or area) that the record page, record exports (rule 38.1) and the
  complete document draw unchanged. Code: `packages/shared/src/utils/coreLinkedSource.js`,
  `services/coreLinkedSourceService.js`, `hooks/useLinkedRecordsData.js` (also gives the Simulator record
  page linked-records support).
* **Suggested signatory roles** — `local_registers.suggested_signatory_roles`; used by
  `resolveRegisterSignatorySlots` only when the organisation has no Document Signatory configuration.
* **Column checks** — `requirementExtrasAvailable` / `isColumnAvailable` keep forms from sending columns
  that are not on the database yet.
