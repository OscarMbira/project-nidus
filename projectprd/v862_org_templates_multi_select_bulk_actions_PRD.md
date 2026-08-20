# v862 — Organisational / Project Templates Multi-Select Bulk Copy & Retire — PRD

**Repo:** `E:\project-nidus` (Platform + Simulator monorepo).  
**Companion plan:** `projectplan/v862_org_templates_multi_select_bulk_actions_plan.md`  
**Status:** Approved & implemented (see plan review).

---

## a) Problem statement

On Organisational Templates (and Project Templates), users can only **Copy down** or **Retire** one row at a time. After searching/filtering (e.g. “Showing 3 of 46”), there is no way to select those visible rows and run the same actions in bulk. That slows onboarding of several templates into a project and retiring multiple project-owned copies.

---

## b) Solution

Add multi-select on the Organisational Templates / Project Templates list page (table **and** card views):

1. Per-row checkboxes + header **Select all** over the **current filtered/visible** set.
2. Toolbar when selection is non-empty: **Copy down selected (N)** and/or **Retire selected (N)**, enabled only when the selection includes eligible rows for that action.
3. Bulk Copy down: no confirm; process eligible rows; summary toast; clear selection.
4. Bulk Retire: one `window.confirm` for the whole selection; process eligible rows; summary toast; clear selection.
5. Platform + Simulator parity on the same page component(s).

Reuse existing `copyTemplateNodeForAccount`, `archiveTemplateNode`, and `archiveProcessTemplateNodeAndContent` — no new tables/RPCs.

---

## c) User stories

1. As a user on Organisational Templates or Project Templates, I can checkbox-select one or more **currently filtered/visible** rows (table or card view).
2. As a user, I can **Select all** / deselect all for the current filtered set (not the unfiltered library).
3. As a user with a project-scoped Organisational Templates view, I can **Copy down selected** for rows that are not already project-owned; already-owned / ineligible rows are skipped and counted in the summary.
4. As a user, I can **Retire selected** for rows I am allowed to customise/retire; ineligible rows are skipped and counted in the summary.
5. As a user, bulk Retire asks for **one** confirmation covering the selection before any retire runs.
6. As a user, bulk Copy down does **not** ask for confirmation.
7. As a user, after either bulk action I see a **summary toast** and the selection is **cleared**; the list reloads.
8. As a user, single-row Copy down / Retire / View / Edit behaviour is unchanged.
9. As a user, switching between Table-List and Card views keeps the same selection state.
10. Simulator mirrors the same behaviours.

---

## d) Implementation decisions (locked)

| # | Decision |
|---|----------|
| D1 | Bulk actions = **Copy down selected** + **Retire selected** (where allowed). |
| D2 | Select all = all rows in the **current filtered/visible** list. |
| D3 | Bulk Retire: one `window.confirm` for the batch; Bulk Copy: no confirm. |
| D4 | Checkboxes + bulk bar in **both** table and card views; shared selection state. |
| D5 | Apply to **both** list variants (Organisational Templates + Project Templates) and **Simulator**. |
| D6 | After bulk completes: clear selection; summary toast (not per-row success modal). |
| D7 | Eligibility mirrors existing row actions: `showCopyDown = isProjectScoped && !isAlreadyProjectOwn(row)`; `canCustomise = !isProjectScoped \|\| isAlreadyProjectOwn(row)` for Retire. |
| D8 | No new SQL / RPCs; reuse existing copy and archive services. |
| D9 | Ineligible selected rows are skipped (not errors); toast reports copied/retired vs skipped counts. |

---

## e) Testing decisions

- Unit tests for eligibility helpers and select-all over a filtered id set (pure helpers preferred so page stays thin).
- Manual UAT: filter to a few rows → select all → bulk copy; select project-owned → bulk retire with confirm; card view selection parity; Simulator smoke.

---

## f) Out of scope

- Pagination / “select all matching across pages” (list is not paginated today).
- Bulk Edit / bulk Export of selection (Export list already exports filtered data).
- Hard-delete (Retire remains archive).
- Admin-app changes.
- Changing single-row action UX (icon-only View/Edit/Delete; labelled Copy down).

---

## g) Further notes

- Pattern reference: `FormsGallery.jsx` / `DraftFormQueue.jsx` selection + bulk toolbar.
- Primary files: `packages/modules/pmo-module/src/pages/OrganisationalTemplatesPage.jsx` and `packages/modules/sim-pmo-module/src/pages/OrganisationalTemplatesPage.jsx`.
