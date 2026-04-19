# PMO Platform Dashboard — scope tabs

## Location
- Route: `/platform/dashboard`
- Optional query: `?tab=overview|portfolio|programmes|projects`  
  - Alias: `programs` → `programmes`
  - Omitted or invalid `tab` → **Overview**

## Behaviour
- **Overview**: Existing dashboard (executive summary, AI insights, PMO widgets, charts, activity feed).
  - **Executive Summary** includes **Portfolios** and **Programmes** cards (in addition to Projects, Tasks, Teams). Totals match the **Portfolio** and **Programmes** dashboard tabs: all non-deleted `portfolios` / `programmes` rows (same as `getPortfolios({})` and `getProgrammesForList({})` under RLS), not only records linked via `portfolio_projects` / `programme_projects`. Status breakdowns use `portfolio_status` / `programme_status` (`dashboardService.getExecutiveSummary`).
  - **Linked** rows: **Programmes** shows count with `portfolio_id` set (linked to a portfolio). **Projects** shows distinct org projects in `programme_projects` / `portfolio_projects` (scoped to `projects.account_id`), plus **Linked to both**, **Programme link only**, and **Portfolio link only** so totals like 13/13 are not mistaken for duplicate metrics (sets can differ while sizes match).
  - **Unlinked**: **Programmes** — `unlinkedNoPortfolio` (no `portfolio_id`). **Projects** — `unlinkedNoProgrammeOrPortfolio` (no `programme_projects` nor `portfolio_projects` row for that org project).
  - **Project** KPI rows use `project_statuses.status_code` via `bucketProjectExecutiveKey` so statuses such as **Draft** map to the **Draft / Planning** bucket (so Active/Completed/On Hold can be zero when every project is still Draft). **`SQL/v471_programme_projects_rls_select.sql`** / **`SQL/v472_executive_summary_pm_scope_rpc.sql`** remain for other features that read `programme_projects` or need server-side aggregation.
- **Portfolio**: Searchable, sortable table from `getPortfolios`; actions link to portfolio edit (view) and full Portfolio module.
- **Programmes**: Same pattern via `getProgrammesForList`; links to programme detail and full Programme module.
- **Projects**: `getAllProjects(organisation account id)`; links via `platformProjectPath`; full Projects list link.

## Export
Each entity tab includes **Export** (existing `ExportListMenu`) for CSV/XML/JSON/etc. per app standards.

## Files
- `src/utils/pmoDashboardTabs.js`
- `src/components/app/dashboard/PMODashboardScopeTabs.jsx`
- `src/components/app/dashboard/PMODashboardEntityPanels.jsx`
- `src/pages/platform-app/Dashboard.jsx`
