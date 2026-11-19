# v1344 — Project Setup forms: logical fields, Audit tabs, and sample data — PRD

**Status:** Decisions confirmed 2026-11-15 (audit + interview). See **Amendments** below, which override earlier rows / stories where they differ. Scope from the red-circled Project Setup sidebar.  
**Apps:** Platform + Simulator practice where the surface already exists (rule 34.1). Admin: no change unless ID Generation rules are needed for new identifiable columns (rule 16.2).  
**Related:** `Documentation/Core_PM_Fields_and_Sample_Data_Audit.md`; seed baseline `SQL/v1436_core_pm_wave1_project_setup_seed.sql`, `v636`/`v637`, `v834`, `v1355`; Audit tab rules 63 / 63.1; register vs hand-built rule 74; multi-line / table fields rules 67 / 67.1; success modal rule 16; theme rule 28.1.

## a) Problem statement

Under **Project Setup**, the circled forms (Project Details, Delivery Overview, Mandate, Brief, Charter, Business Case, PIDs, Benefits Review Plans, Project Team) are the first place operators capture why a project exists and how it will be run. Today several of them are too thin for SaaS users with little training:

| Gap | Effect |
|---|---|
| Project Details shows Overview / Objectives / Success Criteria plus a few flags, but not dates, people, priority, or status context on the same page | Operators bounce between pages or leave fields blank |
| Initiation documents (Mandate, Brief/Charter, Business Case, PID, BRP) have uneven field coverage vs structured-PM practice | Incomplete initiation packs; weak demos |
| Audit details missing or incomplete on some views (e.g. Benefits Review **view**) | Rule 63.1 not met everywhere |
| Sample data is sparse (often **0–1** row per document type on demo projects; PID/BRP children thin) | Hard to train or screenshot the product |
| Delivery Overview is industry-register only; Project Team is multi-page with uneven seeds/Audit | Circled “Project Setup” journey feels unfinished |

The older field audit doc is also **stale** in places (e.g. it still says Brief/BC lack Audit / Mandate samples missing) after `v1436` and later work.

## b) Solution

A single Project Setup enrichment programme that:

1. **Keeps hand-built** Mandate / Brief / Charter / Business Case / PID / Benefits Review Plan / Project Details / Project Team (rule 74 — workflows, relational team data, project row). **Leaves Delivery Overview on the register engine** (industry slot); enrich fields via register SQL when gaps are confirmed, do not invent a second Core “Delivery Overview” page.  
2. Adds **logical fields** (best-practice PM initiation + project identity) and groups them into **logical tabs** where the form is already multi-section.  
3. Completes **Audit details** (Identity / Classification / Record history) on every create/edit/**view** surface in scope (rule 63.1), including BRP view.  
4. Seeds **demo data** so each list-capable entity has **at least 10 records** across the demo portfolio (not 10 live Mandates on one project). Document types stay **one current version per project** + child rows; Project Details is enriched fields on existing projects, not a 10-row list.  
5. Applies **Platform–Simulator parity** for practice mirrors of the same documents.  
6. Refreshes `Documentation/Core_PM_Fields_and_Sample_Data_Audit.md` in the same delivery.

### In-scope surfaces (red-circled)

| # | Surface | Approach |
|---|---|---|
| 1 | Project Details | Hand-built field + tab enrichment on `projects` |
| 2 | Delivery Overview | Register-engine field/tab gaps only (existing industry registers) |
| 3 | Project Mandate | Hand-built fields/tabs + seed |
| 4 | Project Brief | Hand-built fields/tabs + seed |
| 5 | Project Charter | Same record as Brief (terminology only) — inherits Brief work |
| 6 | Business Case | Hand-built fields/tabs + seed |
| 7 | Project Initiation Documents (PIDs) | Hand-built fields/tabs + seed |
| 8 | Benefits Review Plans | Hand-built fields/tabs + Audit on **view** + seed |
| 9 | Project Team | Targeted: Members, Roles & Skills, RACI, Contact Directory (Team Structure remains visual; Signatory only if already under the circled Team group in product IA) |

## c) User stories

### Cross-cutting

1. As a PM, every in-scope create/edit/**view** form shows an **Audit details** tab with Identity, Classification, and Record history (placeholder text before first save on create).  
2. As a PM, Audit never shows a Technical reference card of raw UUIDs as the primary content (rule 63).  
3. As a PM, new/amended dropdowns with long option lists use searchable selects (rule 69); short enums stay native.  
4. As a PM, multi-line list fields use `MultiLineListInput` (rule 67); splittable multi-value fields use table columns (rule 67.1).  
5. As a PM, successful create/update uses `useSuccessModal` when that save flow is touched (rule 16, opportunistic).  
6. As a demo user, the seed portfolio has **≥ 10** sample rows for each list entity in scope (contacts, teams/members as applicable, Delivery Overview register rows, etc.), and **≥ 10 projects** each carrying a coherent Mandate / Brief / Business Case / PID / BRP set where those tables are project-scoped.  
7. As a Simulator learner on a practice project, the same fields/tabs/Audit behaviour appear where the practice surface exists.  
8. As an operator, light/dark and mobile layouts remain readable (rules 28.1, 29).

### 1 — Project Details

9. As a PM, Project Details has logical tabs, for example: **Overview** · **Objectives & Success** · **Classification & Delivery** · **Dates & People** · **Audit details**.  
10. As a PM, I can capture (where columns already exist or are added): project name/description, objectives, success criteria, classification, methodology (seeded dropdown — v1470), billing type, **planned start/end**, **priority**, **health/status (read or link)**, **project manager**, **sponsor / senior user (where modelled)**, budget currency (existing), industries (read-only summary).  
11. As a PM, I do not lose existing Overview / Objectives / Success Criteria / Methodology behaviour.

### 2 — Delivery Overview

12. As a PM on an industry project that has Delivery Overview, I see complete register tabs (Details, Governance, Scope, Delivery Shape, Health, Dependencies/Risks, Team & Investment) with any missing best-practice fields added via register SQL — not a new Core duplicate page.  
13. As a demo user, Delivery Overview has **≥ 10** sample register records (extend `v1355`-style seeds if below 10).

### 3 — Project Mandate

14. As a PM, Mandate fields cover purpose, background, scope in/out, objectives, constraints, assumptions, outline business case / funding hint, proposed executive and PM, key deliverables, dependencies, risks/issues outline, and approval status — grouped in logical tabs (e.g. Purpose · Scope · People · Outline case · Deliverables & deps · Approval · Audit).  
15. As a demo user, Mandates exist for **≥ 10** demo projects (one current mandate each), with child deliverables/deps populated.

### 4 / 5 — Project Brief / Charter

16. As a PM, Brief/Charter remains **one record** (`project_briefs`); Charter is labelling only.  
17. As a PM, tabs cover definition, scope, tolerances, organisation/parties, interfaces, outline business case, product description, approach, team outline, high-level **milestones** (taxonomy gap), references, and Audit.  
18. As a demo user, Briefs exist for **≥ 10** demo projects with representative child rows.

### 6 — Business Case

19. As a PM, Business Case tabs cover executive summary, reasons, options (table), costs/benefits (including simple investment measures where columns exist or are added: e.g. expected benefit, cost, payback/ROI fields if modelled), timescale, risks, dis-benefits, and Audit.  
20. As a demo user, Business Cases exist for **≥ 10** demo projects with options/benefits children.

### 7 — PIDs

21. As a PM, PID tabs cover overview/definition, objectives, interfaces, dependencies, approach, team, tolerances, reporting, controls, plans summary, and Audit.  
22. As a demo user, PIDs exist for **≥ 10** demo projects; child sections are not empty shells.

### 8 — Benefits Review Plans

23. As a PM, BRP **view** has the same Audit tab pattern as the form.  
24. As a PM, tabs cover plan header, scope of review, accountability, measurement approach, resources, baseline, performance reviews, dis-benefits, and Audit.  
25. As a demo user, BRPs exist for **≥ 10** demo projects with schedule/coverage children where the schema supports them.

### 9 — Project Team

26. As a PM, Team Members / Roles & Skills / RACI / Contact Directory keep hand-built behaviour; Audit tabs are present on record forms/views when amended.  
27. As a demo user, Contact Directory has **≥ 10** contacts (already seeded on SEED334 — extend if other demo projects are empty); teams/members and RACI samples are enough to demonstrate the pages (≥ 10 RACI rows or matrices as fits the model).

## d) Implementation decisions

| # | Decision | Outcome |
|---|---|---|
| D1 | Scope | All nine red-circled Project Setup surfaces in **one PRD**, delivered as **vertical slices** (Details → Mandate → Brief/Charter → Business Case → PID → BRP → Team → Delivery Overview). **Recommended / assumed.** |
| D2 | Engine vs hand-built | Do **not** migrate initiation docs or Project Details to the register engine. Delivery Overview stays register. **Confirmed (rule 74).** |
| D3 | Charter | Remains Brief alias; no separate `project_charters` table. **Confirmed.** |
| D4 | Tabs | Multi-section forms use `DetailAuditTabList` (or existing tab chrome) with Audit always last; content tabs named by work, not by table. **Recommended.** |
| D5 | Audit | Mandatory on create/edit/**view** for every record surface touched; fix BRP view in the BRP slice. **Confirmed (rule 63.1).** |
| D6 | Seed cardinality | **≥ 10 demo projects** each with one current Mandate, Brief, Business Case, PID, BRP (idempotent seeds, blank display IDs + Admin triggers — rule 16.2). List entities (contacts, Delivery Overview rows, etc.) **≥ 10 rows**. Not 10 concurrent Mandates on a single project. **Recommended (owner “≥10 records” interpreted for demo portfolio).** |
| D7 | Field source | Prefer columns that already exist on the tables; add SQL columns only when a best-practice field is missing and cannot map to an existing column. No hard-coded option lists (rule 25.1) — reuse/extend lookups (e.g. v1470 methodology). **Recommended.** |
| D8 | Custom Fields tab | Out of Phase 1 unless a surface already has the engine hook; do not invent a parallel custom-field system on hand-built docs in this PRD. **Recommended.** |
| D9 | Simulator | Mirror field/tab/Audit/seed for practice tables that already exist; do not invent Simulator Project Details in this PRD unless a practice project-details route is added as an explicit slice. **Recommended.** |
| D10 | Documentation | Update `Core_PM_Fields_and_Sample_Data_Audit.md` and any taxonomy notes only if menu paths change (rules 70/75 — menus unchanged expected). **Confirmed.** |
| D11 | Exports | When a record export builder is next touched for these docs, adopt tabular export layout (rule 38.1) opportunistically in the same slice. **Recommended.** |

### Suggested field packs (plan will map column-by-column)

**Project Details — Dates & People / Classification tabs**  
Planned start · Planned end · Priority · Project manager · Sponsor (if column/link exists) · Classification · Methodology · Billing type · Status (display) · Industries (display) · Currency.

**Mandate**  
Background · Objectives · Scope in/out · Constraints · Assumptions · Outline funding/BC · Proposed executive · Proposed PM · Deliverables · Dependencies · Outline risks · Approval.

**Brief/Charter**  
Existing tab set + high-level milestones (new child or table field) + any missing tolerances/parties fields already in schema but hidden.

**Business Case**  
Reasons · Options · Costs · Benefits · Timescale · Risks · Dis-benefits · simple investment summary fields if present/added.

**PID**  
Definition · Approach · Team · Tolerances · Controls · Reporting · Plan references · Interfaces · Dependencies.

**BRP**  
Accountability · Measurement · Baseline · Review schedule · Resources · Dis-benefits · link to benefits register where modelled.

Exact column lists are an **implementation-plan** deliverable after a schema census (do not invent UI-only fields without SQL).

### Amendments (audit + interview 2026-11-15)

The audit of this PRD and plan found gaps (plan §1). These owner decisions override the rows and stories above where they differ.

| # | Decision | Outcome |
|---|---|---|
| A1 | Project Details vs the project wizard (overrides stories 9–10 "capture") | Project Details becomes a **read-only summary** in tabs: Overview · Objectives & Success · Classification & Delivery · Dates & People · Audit. An **Edit** button opens the existing project wizard on the matching tab. The wizard stays the only editor, so no field has two editors. The existing Objectives / Success Criteria editing on Project Details moves behind the same Edit link. |
| A2 | Project Manager and Priority | Shown on Project Details. Edited in the wizard: **Priority** by anyone who may edit the project; **Project Manager** only by PMO Admin / organisation admins, enforced in the database. The current PM cannot hand over alone. Changes appear in the project's audit history. |
| A3 | Sponsor | **Sponsor = Executive** (`executive_user_id`), shown as "Executive (Sponsor)". `projects.sponsor_user_id` stays unused (candidate for removal later). |
| A4 | Health | `projects.health_status` is shown **read-only** on Project Details. No editing in v1344. |
| A5 | Brief / Charter milestones | The Brief's Milestones tab **lists the project's Milestones register** (`project_milestones`), read-only, with a link to manage them. No new storage. Brief exports include the list. |
| A6 | Demo projects | Rich samples on **SEED334-PRJ-01 … PRJ-10**. The seed also **tags each with an industry** from the organisation's list: a spread across Banking, IT, Construction, NGO and others, with **PRJ-08 = Information Technology** so its existing ICT samples become visible (D18). Other projects are untouched. |
| A7 | Seed document status | **Realistic mix** across the ten: most documents Approved, a few Draft, one or two Submitted / awaiting approval, so every state (including the rule-53 field lock) can be demonstrated. |
| A8 | Simulator samples (refines D9) | Fields / tabs / Audit mirror on the existing practice pages. **One demo practice project** is seeded with a full rich set (Mandate, Brief, Business Case, PID, BRP), owned by the **Account Owner of the organisation that owns the SEED334 projects** (looked up in SQL; no names or emails in files). |
| A9 | Remaining recommendations | **Confirmed:** D1 (one programme, slice order Details → Mandate → Brief/Charter → Business Case → PID → BRP → Team → Delivery Overview), D4, D8, D11. Every amended form also adopts the unsaved-changes guard (52), Display IDs in URLs (16.1), searchable person pickers (69), the approval field lock (53) and a performance pass (66); hold / draft (37) only where the form already has it. |
| A10 | Out of date items | The Project Administrator functional role exists (v1343): Team slice drops it. Team / member seeds follow the v1472 invite rules. SQL numbering starts at **v1477**. Delivery Overview's 10 samples are on PRJ-08 and become visible through A6. |

## e) Testing decisions

- **Schema census:** per-table column inventory vs UI before each slice (no blind ALTER).  
- **Unit:** tab visibility; Audit placeholder on unsaved create; methodology/options loaders; seed idempotency helpers if any.  
- **SQL:** seed scripts re-runnable; counts ≥ 10 for agreed entities; display IDs blank on insert (rule 16.2).  
- **Manual smoke (Platform + Simulator practice):** each surface — create/edit/view, Audit tab, light/dark, one export if touched.  
- **Done:** every in-scope surface has agreed fields/tabs; Audit on all views; seed thresholds met; audit doc updated; no register migration of initiation docs.

## f) Out of scope

- Migrating Mandate/Brief/BC/PID/BRP to Local Registers.  
- A Core PM “Delivery Overview” page separate from the industry register slot.  
- Splitting Charter into a separate table.  
- Full Team Members modal → routed pages conversion (rule 65) except if a slice already amends that CRUD (then adopt opportunistically).  
- Governance Setup bodies (Board, Steering, etc.) — not in the red circle set.  
- Project Administrator Support role (v1343) — separate PRD.  
- Merged Environments (v1342) — separate.  
- Admin UI redesign.

## g) Further notes

- Prefer **tracer-bullet slices** (one document type end-to-end: SQL → service → form tabs → Audit → seed → sim parity → tests) over a big-bang UI rewrite.  
- Reuse existing child tables (mandate deliverables, BC options, etc.) before adding new ones.  
- Supabase editor: no “into” in SQL comments/seed text; no `SELECT INTO`.  
- Next step: the rewritten plan `projectplan/v1344_project_setup_forms_fields_audit_seed_plan.md` (amendments A1–A10) for owner approval. **No coding until the plan is approved.**
