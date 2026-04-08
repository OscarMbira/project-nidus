# Mandate List Performance Optimization Plan

## Overview
Optimize the `/platform/mandates/list` page (and shared mandate list queries) so that initial load and filter changes complete in **milliseconds** for typical dataset sizes, while keeping the implementation simple and low‑risk.

This plan focuses on:
- Tightening **Supabase queries** used by the mandate list
- Avoiding unnecessary joins and large payloads
- Preserving existing UX and behaviour

---

## Current Behaviour
- Page component: `src/pages/mandate/MandateList.jsx`
- Data service: `getAllMandates` and `getUnlinkedMandates` in `src/services/projectMandateService.js`
- Already uses:
  - Debounced search (300ms) for text filtering
  - `useMemo` for processed mandate items
  - `memo` for `MandateCard`
  - `useCallback` for handlers

**Likely bottlenecks:**
- `getAllMandates` selects `*` plus multiple joined relations for **every mandate**, even though the list uses a small subset of fields.
- `getUnlinkedMandates` also selects `*` plus joins, while the UI only needs a handful of columns.
- Larger mandates (long `purpose` / text fields) increase payload size unnecessarily when listing.

---

## Optimization Goals
- **G1 – Fast list fetch:** Initial mandate list query and filter changes should typically return in **< 200ms** under normal data volumes.
- **G2 – Minimal payload:** Only fetch fields actually needed for the list UIs.
- **G3 – Low risk / small surface area:** Limit changes to:
  - `MandateList.jsx`
  - `UnlinkedMandatesList.jsx` (shared list use)
  - `projectMandateService.js` (list query functions only)
- **G4 – No behaviour regressions:** Filters, search, navigation, and export must continue to behave exactly as before.

---

## Non‑Goals
- No changes to mandate **create/edit** flows.
- No changes to mandate **view** data loader (`getMandateViewData`).
- No pagination or infinite scroll for now (keep UX unchanged).
- No database schema changes.

---

## Implementation Steps

### 1. Introduce Lightweight List Column Selections
- **Service:** `src/services/projectMandateService.js`
- Add **constants** for list views, e.g.:
  - `MANDATE_LIST_COLUMNS` – minimal columns required by `MandateList`:
    - `id`, `mandate_reference`, `mandate_title`, `document_status`, `created_date`, `version_number`, `purpose`, `project_id`, `project:project_id (id, project_name, project_code)`
  - `UNLINKED_MANDATE_LIST_COLUMNS` – minimal columns required by `UnlinkedMandatesList`:
    - `mandate_id` (or `id` depending on existing schema), `mandate_reference`, `mandate_title`, `created_date`, `proposed_executive_name`, `proposed_pm_name`
- Ensure these selections **only include fields already used** by the two list components.

### 2. Update `getAllMandates` to Use List‑Optimized Select
- Replace `select('*', ...)` with `select(MANDATE_LIST_COLUMNS)`:
  - Keep existing filter logic (status, search, programme, project, etc.).
  - Preserve ordering by `created_date` (descending).
- Keep function signature unchanged so existing callers (currently `MandateList` only) continue working.

### 3. Update `getUnlinkedMandates` to Use List‑Optimized Select
- Replace `select('*', ...)` with `select(UNLINKED_MANDATE_LIST_COLUMNS)`.
- Keep existing filters:
  - `project_id IS NULL`
  - `document_status = 'approved'`
  - `is_deleted = false`
  - `is_active = true`
- Preserve ordering by `created_date` (descending).
- Verify that `UnlinkedMandatesList` still receives all required fields (`mandate_id`/`id`, reference, title, created_date, proposed names).

### 4. Small Frontend Micro‑Optimizations (If Needed)
- **MandateList.jsx**
  - Confirm dependency arrays on `useEffect` and `useMemo` are minimal and correct (already good, change only if an obvious redundancy is found).
  - Avoid recreating expensive objects in render; ensure any additional derived data is wrapped in `useMemo`.
- **UnlinkedMandatesList.jsx**
  - Confirm we are not triggering additional fetches unnecessarily (already single `useEffect` on mount).

*(No major structural changes or virtualization to keep scope small.)*

---

## Testing Plan

### 1. Functional Tests
- Verify `/platform/mandates/list`:
  - Loads mandates list without errors.
  - Search, status filter, and view mode (`all` / `unlinked`) still work.
  - Navigation:
    - Create mandate button
    - View / Edit actions still route correctly.
- Verify `/platform/mandates/unlinked`:
  - Still lists approved, unlinked mandates.
  - “View Mandate” and “Create Project from Mandate” actions work.

### 2. Performance Checks
- Use browser DevTools:
  - Measure network request time for the mandates list API calls **before vs after**.
  - Confirm response payload size is reduced (fewer columns / relations).
  - Confirm no additional unnecessary HTTP calls are being made on simple interactions.

### 3. Regression Checks
- Run existing mandate service tests (if present) to ensure no breakage.
- Sanity‑check other mandate‑related pages (view, edit, submit for approval) to ensure they still behave correctly.

---

## Documentation & Tracking
- Update `Pages_Optimization_Summary.md` with a brief section for `/platform/mandates/list`:
  - Describe the new list‑optimized service functions.
  - Record observed improvements (payload size / request time).

---

## TODO Checklist
- [ ] Implement list‑optimized column selections in `projectMandateService.js`.
- [ ] Wire `MandateList.jsx` and `UnlinkedMandatesList.jsx` to use the optimized queries (keeping existing signatures).
- [ ] Manually test `/platform/mandates/list` and `/platform/mandates/unlinked` for functionality and performance.
- [ ] Update `Pages_Optimization_Summary.md` with results and notes.

