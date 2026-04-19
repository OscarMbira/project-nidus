# v475 — PMO Dashboard Executive Metrics

## Summary

The Platform dashboard (`/platform/dashboard`) loads an extended analytics bundle in parallel with the executive summary and KPIs:

- `getPmoExtendedMetrics(organizationId)` — aggregates alerts, EVM rollups, critical-path proxy, risk/issue/change-request metrics, and portfolio/programme/project tiles.
- `PMOExecutiveAlertsPanel` — shows non-zero exception counts on the Overview tab.
- New tabs: **Alerts** (`?tab=alerts`) and **Governance** (`?tab=governance`).

## Service entry points

| Function | Role |
|----------|------|
| `getExecutiveAlerts` | Returns `{ items }` from extended metrics (alerts payload). |
| `getAggregatedEvmMetrics` | Latest `project_evm_snapshots` row per project; portfolio and programme rollups. |
| `getCriticalPathSummary` | Tasks with `is_critical_path`, overdue and blocked proxies. |
| `getRiskIssueSummary` | Risk/issue/CR counts for org projects. |
| `getPmoExtendedMetrics` | Combines the above plus governance/benefits/utilization helpers. |
| `buildPmoOverviewMetricsFromSummaries` | Third argument `extended` merges v475 fields into scope objects. |

## SQL reference

See `SQL/v475_pmo_dashboard_metrics_reference.sql` for the list of database objects involved (no new DDL in v475).

## UI

- Overview: `PMOExecutiveAlertsPanel` then existing executive summary and scope overview metrics.
- Scope tabs: extended tiles and bands in `PMOScopeOverviewMetrics.jsx`.
- `?tab=alerts` / `?tab=governance`: `PMOAlertsTab.jsx`, `PMOGovernanceTab.jsx`.
