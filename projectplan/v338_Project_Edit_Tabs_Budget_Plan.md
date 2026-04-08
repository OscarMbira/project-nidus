# v338 — Edit Project: tabs + multi-line budget

## Goal
Match portfolio-style editing: tabbed sections on Edit Project, with Budget tab supporting multiple category lines via existing `FinancialControlsSection` and `project_budget_categories`.

## Todos
- [x] Add `ProjectEditFormTabs` (Details, Timeline, Budget)
- [x] Extend `ProjectsEdit` state/load/save for `budget_currency`, `budget_type`, `budget_approval_status`, `budget_categories`
- [x] Load/save lines with `getByProjectId` / `saveForProject`; set `budget_amount` as sum of lines
- [x] Persist dates as `planned_start_date` / `planned_end_date` and amounts as `budget_amount` (with legacy read fallbacks)

## Review
- **Tabs:** New `ProjectEditFormTabs` component (Details, Timeline, Budget) using the same bottom-border tab pattern as `PortfolioForm`.
- **Budget:** Reused `FinancialControlsSection` for currency, budget type, multi-row categories (PMO Budget Categories + Funding Sources), approval status, and live total. Lines load from `project_budget_categories` via `getByProjectId` and save with `saveForProject` after the project row is updated.
- **Legacy budget:** If there are no category rows but `budget_amount` (or legacy `budget`) is set, the editor opens one line with that amount so the value is not lost.
- **DB alignment:** Updates now use `planned_start_date`, `planned_end_date`, and `budget_amount` (with read fallbacks for older column names). `budget_currency`, `budget_type`, and `budget_approval_status` are persisted on `projects` when present.
- **Tests:** `src/components/project/__tests__/ProjectEditFormTabs.test.jsx` (Vitest).

### Follow-up (save hanging)
- **Cause:** `project_methodologies` uses a **unique `project_id`**; soft-deleting then **inserting a second row** for the same project violated the constraint / left the client waiting on bad server behaviour. `updated_by` also pointed at **auth user id** while the FK expects **`users.id`**.
- **Fix:** Update the existing methodology row in place (reactivate + set `methodology_id`), insert only when no row exists; resolve internal user id for `updated_by`; optional timeouts on `getUser` and `saveForProject`; clearer submit error parsing.
