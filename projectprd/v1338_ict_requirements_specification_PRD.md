# v1338 — IT Requirements Specification (Business & Functional Requirements) (PRD)

**Status:** Approved and implemented 2026-11-09 (SQL run by the owner — see the plan's Review) · **Owner decisions:** interview 2026-11-09 (D1–D12 below, all decided)
**Pack / menu:** Information Technology → Requirements (new category)
**Source material:** owner screenshots 2026-11-09 — a Functional Requirements Specification table of
contents (Purpose; Overview / Scope of Functional Requirements: Requirements Overview, In Scope, Out of
Scope, Summary of Requirements, Assumptions; Detailed Description of Functional Requirements; Detailed
Description of Non-Functional Requirements: Volumes, Performance, Security, Migration, Data Requirements,
data protection, Enquiry and Reports; Use Cases; Glossary) and the Information Technology menu (Design
expanded: Functional, Technical, UX / UI, Data, Integration Design — no requirements capture).

## a) Problem statement

An IT or banking delivery needs a **signed Business Requirements Document (BRD) / Functional Requirements
Specification (FRS)** before design, UAT scoping and change control can start. Project Nidus has no such
document in the Information Technology pack. An audit (2026-11-09) found only fragments:

| Exists | Where | Gap |
|---|---|---|
| Requirements register — one row per requirement: code, name, description, category (business / functional / non-functional / technical / regulatory / other), MoSCoW priority, source stakeholder, acceptance criteria, traceability tag, status, version | Core PM: `public.requirements_register` / `sim.requirements_register` (v357, v369, v877); pages `projects/:projectId/scope/requirements` (+ `/new`, `/:reqId`) | A list, not a document: no purpose, scope, assumptions, use cases, glossary, sign-off or specification-shaped export. No owner, rationale, verification method or non-functional area. |
| IT menu link to that register | IT → Technology Delivery → **Requirements** (`ict_reuse_requirements`, v949 "reuse link", PRD v946 decision 6) | Hidden under Technology Delivery; the taxonomy's IT **Requirements** category (Business, Functional, Non-Functional, User Stories, Acceptance Criteria, Traceability, Requirement Changes — `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` §6) was never built. |
| Traceability matrix (requirement → WBS node / deliverable / test) | `requirements_traceability_matrix` (public + sim); page `projects/:projectId/scope/traceability` | Not reachable from the IT pack. |
| "Requirements Documentation" process template (`requirements_documentation`, free-form `document_data`) | Core PM process templates (`/pm/process-templates/t/requirements-documentation`) | Generic PM template; not part of the IT pack; not linked to the register; not on the register-document engine. Left unchanged (D8). |
| Business / Functional Requirements as text lines | IT → Design → **Functional Design** (`ict_functional_design`, v1324) | A design document. Typing requirements here duplicates the register and drifts from what testing and traceability use. |
| "Linked records" field (show another register's records for the same project inside a document) | Register engine (v1332), e.g. Delivery Overview → Related | Reads **local registers only**; cannot show rows of the core `requirements_register`. |
| Document sign-off | Register-document engine (v1318 / v1319) | Signatories are picked by hand each time; no suggested roles per register. |

Teams therefore write the BRD / FRS in a word processor, outside the audit trail, with requirements
copied by hand and no sign-off in the system.

## b) Solution

A new **Requirements** category in the Information Technology pack (after Technology Delivery, before
Architecture) with:

* **Requirements Specification** — one document register with a **Document Type** (Business
  Requirements Document / Functional Requirements Specification), on the register-document engine: tabs,
  sign-off (with suggested signatory roles), complete-document Word / PDF with cover, document control and
  contents page, templates, Audit tab, Card / Table-List views, exports. Sections follow the source table of
  contents. The detailed requirements are **not retyped**: the Business, Functional and Non-Functional
  chapters show this project's rows from the core Requirements register — non-functional ones grouped by
  **Area** — and the Use Cases chapter shows this project's Use Cases records.
* **Use Cases** — a new register (one record per use case) with actors, trigger, pre- / postconditions,
  main and alternative flows as step tables, business rules, priority, frequency, related requirements and
  screens / reports.
* **Requirements register** — gains **Owner**, **Rationale**, **Verification Method** and
  **Non-Functional Area**; and filtered views (Business / Functional / Non-Functional) from the menu.
* **Traceability** and **Requirement Changes** reachable from the same category; the old Technology
  Delivery → Requirements link is removed.
* **Functional Design** shows the same read-only requirements view instead of its typed requirement lists.

Engine additions (usable by any register): a **core-table source for "linked records"** (first source:
the core Requirements register, grouped by category / area) and **suggested signatory roles** per register.

## c) User stories

**Requirements Specification**
1. As a business analyst, I can create a Requirements Specification from IT → Requirements → Requirements Specification.
2. I choose the Document Type: Business Requirements Document or Functional Requirements Specification; the type prints on the cover.
3. I can capture Purpose, Requirements Overview, In Scope, Out of Scope, Summary of Requirements and Assumptions.
4. The Business Requirements and Functional Requirements chapters show this project's requirements of that category from the Requirements register (code, name, priority, status, owner, verification method, acceptance criteria) without retyping them.
5. The Non-Functional Requirements chapter shows this project's non-functional requirements grouped by Area, one sub-section per Area that has requirements (Volumes, Performance, Security, Migration, Data Requirements, Data Protection & Privacy, Enquiry & Reports, Availability & Recovery, Usability & Accessibility, Audit & Logging).
6. The Use Cases chapter shows this project's Use Cases records.
7. From each chapter I can open the Requirements register / Use Cases (already filtered) to add or change items.
8. I maintain a glossary, appendices, version history and related documents (document engine).
9. When I start sign-off, Business Owner, IT / Solution Lead and Project Manager are suggested as signatory roles; I can change them. The document locks while under sign-off.
10. I can export the complete document (Word / PDF) with cover, document control, contents page, numbered chapters, requirements and use cases as real tables (rule 38.1), and the record exports (Excel, CSV, XML, JSON, Print).
11. I can start a specification from a system template: Business Requirements Document or Functional Requirements Specification (vendor-neutral, [placeholders]).
12. A specification exported or viewed later shows the requirements as they are now in the register (the document's version history records when it was signed).

**Requirements register**
13. A requirement records its Owner, Rationale and Verification Method (Test / Inspection / Demonstration / Analysis).
14. A non-functional requirement records its Area, chosen from the database list (rule 25.1); Area shows only when the category is Non-functional.
15. IT → Requirements → Business / Functional / Non-Functional Requirements open the register already filtered to that category; All Requirements opens it unfiltered.
16. The register list, detail page and exports show the new columns (Platform and Simulator).

**Use Cases**
17. I can create, view, edit and delete use cases (Use Case ID, Primary Actor, Secondary Actors, Trigger, Preconditions, Postconditions, Main Flow, Alternative / Exception Flows, Business Rules, Priority, Frequency of Use, Related Requirements, Related Screens / Reports).
18. Main Flow and Alternative / Exception Flows are step tables (Step | Actor | Action), searchable and sortable, and export as numbered steps.
19. Related Requirements lists requirement codes from this project's Requirements register.

**Navigation and related**
20. IT → Requirements contains: Requirements Specification · All Requirements · Business Requirements · Functional Requirements · Non-Functional Requirements · Use Cases · Traceability · Requirement Changes.
21. Traceability opens the existing traceability matrix for the current project.
22. Requirement Changes opens change control filtered to changes that affect requirements (the filter is added if change control has none).
23. The old IT → Technology Delivery → Requirements item no longer shows.
24. Functional Design shows a read-only "Requirements" section from the register in place of its typed Business / Functional Requirements lists; any text already typed is kept as "Requirements Notes (legacy)".
25. The demo project SEED334-PRJ-08 has 10 specifications, ~60 requirements covering every category and all 10 areas, and 10 use cases (Platform and Simulator).
26. The same roles that see the other IT menus can see and use the new items.
27. Platform and Simulator behave the same (rule 34.1).

## d) Implementation decisions (owner, 2026-11-09)

| # | Decision |
|---|---|
| D1 | **One register** — Requirements Specification with a **Document Type** (Business Requirements Document / Functional Requirements Specification). **D1b:** both types show every requirement chapter (Business, Functional, Non-Functional, Use Cases), each only when it has items; the two templates differ in starting wording only. |
| D2 | **Single source** — detailed requirements are shown from the core Requirements register, not typed into the document. |
| D3 | **Engine** — extend "linked records" with a **core-table source**; first source: `requirements_register` (public / sim), filtered by project and category (and grouped by Area for non-functional). Read-only in the document. (Follows from D2.) |
| D4 | **Register columns** — add **Owner**, **Rationale**, **Verification Method** (Test / Inspection / Demonstration / Analysis) to `public.requirements_register` and `sim.requirements_register`. Source reference is **not** added. |
| D5 | **Non-functional requirements** stay in the register (category Non-functional) with a new **Area** pick-list; the document groups them by Area. **D5b — 10 areas:** Volumes, Performance, Security, Migration, Data Requirements, Data Protection & Privacy, Enquiry & Reports, Availability & Recovery, Usability & Accessibility, Audit & Logging — database reference data, not hard-coded (rule 25.1). A sub-section shows only when it has requirements. |
| D6 | **Use Cases** — their own register (local register), shown in the specification's Use Cases chapter via linked records. **D6b fields:** Use Case ID; Primary Actor; Secondary Actors; Trigger; Preconditions; Postconditions; Main Flow and Alternative / Exception Flows as step tables (Step \| Actor \| Action); Business Rules; Priority (MoSCoW); Frequency of Use; Related Requirements (codes from the Requirements register); Related Screens / Reports. No diagram attachment field. |
| D7 | **Menu** — new IT → **Requirements** category after Technology Delivery, before Architecture: Requirements Specification · All Requirements · Business / Functional / Non-Functional Requirements (filtered views) · Use Cases · Traceability (existing matrix) · Requirement Changes (change control filtered to requirements; add the filter if missing). Remove the Technology Delivery → Requirements link. Taxonomy updated in the same change (rule 70). Role grants as the other IT menus. |
| D8 | Core PM **"Requirements Documentation"** process template — **left unchanged**. |
| D9 | **Functional Design** — Business Requirements and Functional Requirements text fields are replaced by the read-only linked requirements view; any existing text is kept in a renamed **"Requirements Notes (legacy)"** field. |
| D10 | **Templates** — two vendor-neutral system templates: **Business Requirements Document** and **Functional Requirements Specification** ([placeholders] for organisation-specific text; document text only). Dependency: the template tables (SQL v1336 / v1337) are not yet on the live database and must be run first. |
| D11 | **Samples** — SEED334-PRJ-08: 10 specifications (one per delivery slice, mixed BRD / FRS), ~60 requirements (every category, all 10 areas), 10 use cases — Platform and Simulator. Existing requirement rows are never overwritten; new columns are filled only where blank. |
| D12 | **Sign-off** — suggest **Business Owner, IT / Solution Lead, Project Manager** as signatory roles (editable per document). Engine addition: a per-register list of suggested signatory roles that pre-fills the Sign-off tab. |

## e) Testing decisions

* **Unit:** core-table linked-records source (load by project + category, group by Area, labels for
  priority / status / verification / area, empty state, sim vs public client); suggested signatory roles
  (pre-fill, editable, no effect on registers without the setting); export model for the specification
  (requirements and use cases as table blocks — rule 38.1); Use Case step tables (parse / join / export).
* **Component:** specification form and detail page (tabs, linked chapters, filtered "open register"
  links); requirement form with the new fields and conditional Area; register list filtered by category
  from the URL; Use Cases form; Functional Design linked section; both apps.
* **SQL (temporary-function tests, as v1340):** new columns exist in both schemas with RLS unchanged;
  Area reference data present; new registers and fields pass the field-type check; menu items exist under
  the new category with role grants and the old link hidden; template creates a record with every section.
* **Seed check:** every sample value valid for its field; sample ID ranges confirmed free before use.
* **Done** = every story demonstrable on SEED334-PRJ-08 in both apps; tests green; lint and drift clean.

## f) Out of scope

* Per-requirement baselining / versioning (the specification's own version history covers sign-off points).
* Automatic test-case generation from requirements or use cases.
* Editing requirements inside the specification (it shows them; edits happen in the register — D2).
* Changes to the Core PM "Requirements Documentation" process template (D8).
* A Source Reference column on requirements (D4).
* Diagram attachments on use cases (D6b).
* Rebuilding the traceability matrix page (only linked from the new menu).

## g) Further notes

* Vendor-neutral throughout (rule 26); "Data Protection & Privacy" is used instead of a named regulation.
* The core-table linked-records source and suggested signatory roles are generic engine additions; other
  registers may adopt them later (e.g. Technical Design showing non-functional requirements).
* The register columns are a schema change in both schemas; they cannot be applied from the agent session
  (no database password) — the owner runs the migration in the Supabase SQL editor.
* SQL and plan numbers are chosen at write time under rule 18.0; this PRD is v1338 (next free PRD / plan
  number). Tracer-bullet issues follow in the plan (rule 17.2).
