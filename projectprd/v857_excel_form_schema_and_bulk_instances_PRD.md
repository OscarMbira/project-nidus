# v857 — Excel → Form Schema + Bulk Draft Instances — PRD

**Repo:** `E:\project-nidus` (Platform + Simulator monorepo). No Admin-app SQL expected (no new tables / ID rules unless discovery proves otherwise).
**Companion plan:** `projectplan/v857_excel_form_schema_and_bulk_instances_plan.md`
**Status:** Approved & implemented (see plan review).

---

## a) Problem statement

Project Managers often already hold operational inventories in Excel (e.g. application/database server lists with columns such as Physical Location, Environment, APP Server Name, App IP, CPU Cores, Memory, Usage, plus yellow banner rows like **APPLICATION SERVERS** / **DATABASE SERVERS**).

Today, turning that into a Nidus form means hand-building fields in Form Template Builder, then re-keying every row as a form instance. That is slow, error-prone, and blocks adoption of blank local forms (v852) for real inventory-style work.

Missing capabilities:
1. Import **column structure** from Excel/CSV into a form template’s field catalog (with sensible type inference).
2. Represent **banner/category rows** as a first-class field value on each data row (not as separate form sections).
3. Bulk-create **draft form instances** from data rows against that template for a project.

---

## b) Solution

Add a two-step Excel import journey (decision Q2-A):

1. **Schema import** inside **Form Template Builder** — upload `.xlsx`/`.csv`, detect headers + banner rows, infer field types, let the user map/edit, then **merge** fields into the in-memory builder catalog (user still Save template to publish a new version).
2. **Bulk row upload** on **Project Forms / FormsGallery** for a chosen template — upload the same style of sheet, map columns to saved fields (including Category), preview up to the soft cap, then create one **draft** `form_instances` row per data row (insert-only, no dedupe).

Reuse existing SheetJS parse paths and RFP-style column-mapper UX; do not invent a parallel spreadsheet stack.

---

## c) User stories

1. As a form author (PMO Admin or local-form creator with builder access), I can click **Import from Excel** in Form Template Builder and upload an `.xlsx` or `.csv`.
2. As a form author, the system detects the header row and proposes one field per column (label from header; key slugified).
3. As a form author, banner/merged category rows (e.g. APPLICATION SERVERS, DATABASE SERVERS) produce an auto field **Category** (`select`) whose options are the distinct banner labels; each data row inherits the nearest banner above it as its Category value during instance import (not during schema-only apply beyond defining the field + options).
4. As a form author, field types are inferred from sample cells (`number`, `money`, `date`, `textarea`, `select` where clear); otherwise **text**.
5. As a form author, I can remap, rename, change type, skip columns, and edit Category options before applying.
6. As a form author, applying schema **merges** into existing fields (match by key/label); existing fields are never deleted automatically.
7. As a form author, after merge I still use **Save template** to persist a new `form_template_versions` row (existing versioning).
8. As a Project Manager (or user who can create form drafts on the project), I can open Project Forms for a template and click **Bulk upload rows**, upload Excel/CSV, confirm column→field mapping, and see a preview count.
9. As that user, confirming creates one **draft** form instance per data row (≤ **500** per upload), with values filled from cells + Category from banners.
10. As that user, re-uploading the same file creates additional drafts (insert-only; no dedupe in this release).
11. As a Simulator user, I have the same schema import + bulk draft upload at Simulator project scope (parity).
12. As any user, if the file exceeds 500 data rows, I am told to split the file; no partial silent truncate without messaging.

---

## d) Implementation decisions

**D1 — Scope of import (Q1-C):** Schema from columns **and** bulk draft instances from data rows.

**D2 — Product placement (Q2-A):**  
- Schema: `FormTemplateBuilder` (Platform + Simulator).  
- Instances: `FormsGallery` / Project Forms register for the current `projectId` + selected `templateCode`.

**D3 — Column & banner model (Q3-A + refinement):**  
- Header row → fields.  
- Banner rows → not sections; auto field **Category** (`select`, options from distinct banners).  
- Nearest-banner-above applies when creating instances from data rows.  
- Blank separator rows skipped.

**D4 — Instance status (Q4-A):** Always **draft**.

**D5 — Schema merge (Q5-A):** Merge only; no silent delete/replace.

**D6 — Duplicates (Q6-A):** Insert-only; no unique-key dedupe this release.

**D7 — Category type (Q7-A):** `select` with options from banners.

**D8 — Soft cap (Q8-A):** 500 data rows per bulk upload.

**D9 — Parity (Q9-A):** Platform + Simulator.

**D10 — Type inference:** Sample cells under each column; default `text`. Map only to builder `FIELD_TYPES`: `text` | `textarea` | `date` | `number` | `money` | `select`.

**D11 — Persistence:** No new tables required for v1. Schema lands via existing save path; instances via existing create-draft APIs. Optional later: persist last column map in `localStorage` keyed by template_code (nice-to-have, not required for MVP).

**D12 — Permissions:** Schema import follows Form Template Builder write-gate (PMO Admin or creator of account-scoped template — v852). Bulk instance create follows existing form draft create RLS for the project.

**D13 — Files:** `.xlsx` and `.csv` via existing SheetJS / PapaParse helpers (`parseTabularFile` or RFP parse twins).

---

## e) Testing decisions

- Unit: header detection; banner detection; Category option extraction; nearest-banner assignment; type inference fixtures (numbers, dates, mixed → text); slugify key uniqueness; merge-without-delete; 500-row cap messaging.
- Unit: mapper produce `schemaFromForm`-compatible sections/fields.
- Service/integration (mocked db): bulk draft create maps cell values to `form_instance_values` (or equivalent path used by gallery “start form”).
- UI: Import modal / wizard steps theme-aware (rule 28.1); Platform + Simulator entry points.
- Manual: upload the Environment Resources–style sheet → schema merge → save → bulk upload → N drafts visible in Project Forms.

**Done bar:** User can build “Environment Resources” fields from Excel (including Category select) and upload the sheet’s data rows as draft instances on a project, on Platform and Simulator.

---

## f) Out-of-scope items

- **O1 — Auto-dedupe / upsert** by unique column.
- **O2 — Creating submitted/approved instances** from Excel.
- **O3 — Multi-sheet workbooks** beyond “pick one sheet” (MVP: first sheet or simple sheet picker; complex multi-sheet merge out of scope).
- **O4 — Preserving Excel styling** (colours, red text) as form metadata.
- **O5 — New DB tables** for import jobs / mapping history (unless implementation proves unavoidable).
- **O6 — Admin app** changes.
- **O7 — GitHub tracer-bullet issue breakdown** (rule 17.2) unless requested separately.

---

## g) Further notes

- Banner → Category field keeps one flat section (or user’s existing sections) while still capturing APPLICATION SERVERS vs DATABASE SERVERS on every instance — matches the attached inventory sheet.
- Soft cap 500 is a product guardrail, not a hard DB limit; raise later if needed.
- Version **v857** chosen because `v853` is taken by record-view document preview; SQL monorepo already used through `v856` for local-forms fixes.
