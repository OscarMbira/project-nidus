# v474 — PMO scope overview metrics (Platform dashboard)

## Goal

Replace the circled dashboard blocks (Quick Actions, KPI strip, health/budget charts, risk/resource charts, recent activity) with three practice-based overview bands: **Portfolio**, **Programmes**, and **Projects**.

## Implementation

- [x] `buildPmoOverviewMetricsFromSummaries` + `getPmoOverviewMetrics` in `dashboardService.js`
- [x] `PMOScopeOverviewMetrics.jsx` — theme-aware sections with links to Portfolios / Programmes / Projects
- [x] `Dashboard.jsx` — single `getExecutiveSummary` + `getKPIs` fetch; pass bundle to Executive Summary and overview; remove legacy widgets
- [x] `ExecutiveSummary.jsx` — optional `initialSummary` to avoid duplicate executive fetch
- [x] Unit tests: `dashboardService.pmoOverviewMetrics.test.js`

## Review

Data is sourced from the database via existing services (no mock data). Overview metrics align with executive summary scope counts and KPI calculations. Documentation: `Documentation/PMO_Scope_Overview_Metrics.md`.

**Update:** Portfolio / Programmes / Projects **tabs** (`?tab=`) now render the same dashboard metrics for that pillar (via `PMOScopeOverviewMetrics` `scope` prop), not the entity list panels in `PMODashboardEntityPanels.jsx` (retained for possible reuse or deep links).
