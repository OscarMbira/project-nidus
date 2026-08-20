# v862 — Organisational / Project Templates Multi-Select Bulk Actions — Plan

**Repo:** `E:\project-nidus`  
**PRD:** `projectprd/v862_org_templates_multi_select_bulk_actions_PRD.md`  
**Status:** Implemented.

---

## Goal

Let users select multiple (or all) currently filtered Organisational / Project template rows and run **Copy down** and/or **Retire** in bulk, on Platform and Simulator, in both table and card views.

---

## Approach (keep it simple)

1. Extract small pure helpers (eligibility + select-all toggle) next to the page or under a tiny util/testable module used by both shells.
2. Add `selectedIds` (`Set`) state on `OrganisationalTemplatesPage`; clear when `filtered` identity changes enough that selected ids vanish, and always clear after bulk success.
3. UI: checkbox column before `#`; header checkbox for select-all filtered; selection toolbar with counts; mirror checkboxes on cards.
4. Bulk handlers loop existing single-row service calls; aggregate success/skip/fail into one toast.
5. Mirror the same changes in `sim-pmo-module` (or shared helper + identical UI wiring).

---

## Todos

- [x] Add eligibility / selection helpers + unit tests
- [x] Platform `OrganisationalTemplatesPage`: selection state, checkboxes (list + card), bulk toolbar, bulk copy/retire handlers
- [x] Simulator `OrganisationalTemplatesPage`: same behaviour (parity)
- [x] Manual smoke notes in Review section after implementation

---

## Files (expected)

| Area | Path |
|------|------|
| Helpers | `packages/shared/src/utils/orgTemplateBulkSelection.js` |
| Tests | `packages/shared/src/utils/__tests__/orgTemplateBulkSelection.test.js` (+ vitest include) |
| Platform page | `packages/modules/pmo-module/src/pages/OrganisationalTemplatesPage.jsx` |
| Simulator page | `packages/modules/sim-pmo-module/src/pages/OrganisationalTemplatesPage.jsx` |

---

## Review

### What shipped
- Shared helpers for copy/retire eligibility, select-all / prune selection, partition, and toast summary.
- Platform + Simulator Organisational / Project Templates lists: row + select-all checkboxes (table and card), bulk toolbar with **Copy down selected (N)** / **Retire selected (N)** / Clear selection.
- Bulk Copy: no confirm; skips ineligible / already-copied; summary toast; clears selection; reloads.
- Bulk Retire: one `window.confirm`; skips ineligible; summary toast; clears selection; reloads.
- Single-row actions unchanged aside from sharing eligibility helpers and respecting `bulkBusy`.

### Tests
- `pnpm exec vitest run src/utils/__tests__/orgTemplateBulkSelection.test.js` in `packages/shared` — 8 passed.

### Manual UAT (suggested)
1. Project-scoped Organisational Templates → filter → Select all → Copy down selected.
2. Project Templates → select rows → Retire selected (confirm once).
3. Toggle Card view; selection persists; Clear selection works.
4. Repeat smoke on Simulator.
