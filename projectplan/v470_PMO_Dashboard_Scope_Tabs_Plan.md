# v470 — PMO Platform Dashboard scope tabs

## Goal
Add **Overview | Portfolio | Programmes | Projects** tabs on `/platform/dashboard` with URL sync (`?tab=`), loading real data via existing services.

## Status
- [x] `pmoDashboardTabs.js` — `normalizeDashboardTab`
- [x] `PMODashboardEntityPanels.jsx` — list panels + search + sort + export
- [x] `PMODashboardScopeTabs.jsx` — tab UI + `useSearchParams`
- [x] `Dashboard.jsx` — wrap overview content in tabs
- [x] Unit tests for tab normalizer
- [x] Documentation

## Review
Implemented April 2026: tabs default to Overview; entity tabs query `getPortfolios`, `getProgrammesForList`, `getAllProjects(organizationId)`; links to full module pages and open/edit routes.

**Update (April 2026):** Overview **Executive Summary** now includes **Portfolios** and **Programmes** metric cards (`dashboardService.js` + `ExecutiveSummary.jsx`), with unit tests for `bucketPmLifecycle` in `src/services/__tests__/dashboardService.lifecycleBucket.test.js`.

**Update (April 2026 — metrics accuracy):** Project status breakdown uses full `project_statuses` lookup + `bucketProjectExecutiveKey` (Draft → Planned, etc.). **SQL/v471_programme_projects_rls_select.sql** adds missing `programme_projects` SELECT policy so programme counts match DB links.

**Update (April 2026 — RPC):** **`SQL/v472_executive_summary_pm_scope_rpc.sql`** defines `get_executive_summary_pm_scope(account_id)` (SECURITY DEFINER) for server-side aggregation when needed. Projects card label **Draft / Planning** clarifies the bucket that includes Draft status.

**Update (April 2026 — tab parity):** Executive Summary portfolio/programme counts use **all** non-deleted `portfolios` / `programmes` (same scope as dashboard **Portfolio** / **Programmes** tabs), replacing project-link-only aggregation that capped metrics at assignment counts.

**Update (April 2026 — linked rows):** Programmes card adds **Linked to portfolios** (`programmes.portfolio_id`). Projects card adds **Linked to programmes** and **Linked to portfolios** (distinct org `project_id` in `programme_projects` / `portfolio_projects`).

**Update (April 2026 — link overlap):** Projects card adds **Linked to both**, **Programme link only**, **Portfolio link only** so equal totals for programme vs portfolio links are explained (distinct junction sets).

**Update (April 2026):** Removed **Linked to programmes (any)** and **Linked to portfolios (any)** rows from the Projects card (overlap rows retained).

**Update (April 2026 — performance):** `/platform/dashboard` — `getExecutiveSummary` runs projects + `project_statuses` + portfolio/programme lists in parallel; tasks query selects `status_id` only; chart grid deferred via `DeferredDashboardCharts` (IntersectionObserver + timeout); tab changes use `startTransition`.

**Update (April 2026 — unlinked rows):** Programmes card **Unlinked (no portfolio)**; Projects card **Unlinked (no programme / portfolio)**. (Portfolios “unlinked” row removed as low value.)
