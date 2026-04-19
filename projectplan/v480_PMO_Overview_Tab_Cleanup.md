# v480 — PMO Overview tab cleanup

## Goal

On `/platform/dashboard` **Overview**, show only the section title **Executive Summary**, **Today’s AI Insights**, and **Executive alerts**. Remove duplicate content that already appears on other scope tabs or admin widgets stacked below.

## Done

- `ExecutiveSummary.jsx`: added `showEntityCards` (default `true`). When `false`, renders the **Executive Summary** heading only; no fetch and no five entity cards.
- `Dashboard.jsx` (platform-app): Overview uses full `<ExecutiveSummary />` again (wave-1 `initialSummary` from bundle) so the five entity cards show under the heading. Removed from Overview (unchanged): `PMOScopeOverviewMetrics`, `PMOControlStrip`, `DocumentComplianceWidget`, `ProgrammeOverview`, `PMCapacityWidget`, `StageGateOversight`, `ExceptionManagement`, `BenefitsRollup`.
- Portfolio / Programmes / Projects / Alerts / Governance tabs unchanged (`PMODashboardScopeTabs` still loads scope metrics and alerts/governance as before).

## Review

| Area | Notes |
|------|--------|
| Analytics bundle | Wave 1 + 2 fetches unchanged; other tabs still need `pmoAnalyticsBundle`. |
| Simulator | No parallel PMO Overview; no change. |

### Follow-up (insights rail on `/platform/dashboard`)

`PmoDashboardInsightsSection` (Risk Heat Map, Resource Allocation, Recent Activity) is rendered on **Portfolio / Programmes / Projects** tabs below `PMOScopeOverviewMetrics` (`PMODashboardScopeTabs.jsx`). It is **not** on **Overview** (`Dashboard.jsx`) so Overview stays Executive Summary → AI Insights → Executive alerts only.
