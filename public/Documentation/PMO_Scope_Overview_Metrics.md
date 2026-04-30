# PMO scope overview metrics (Platform dashboard)

## Purpose

On **Overview** (`/platform/dashboard`), the former Quick Actions, KPI row, chart grid (project health, budget burn, risk heat map, resource allocation), and deferred activity feed are replaced by **three bands**:

1. **Portfolio overview** — portfolio counts, programmes aligned to a portfolio vs without, programme coverage %.
2. **Programmes overview** — programme lifecycle counts, portfolio linkage, distinct projects linked via programmes.
3. **Projects overview** — project counts, health index and RAG-style counts, on-time delivery, budget variance and spend, linkage to programme/portfolio.

## Tab behaviour (`?tab=`)

- **Overview** — Full dashboard (control strip, executive summary, insights, admin widgets, then the **three** PMO scope bands).
- **Portfolio / Programmes / Projects** — **Scope quick actions** (pillar-specific shortcuts) appear at the top; below that, the same metric tiles as the corresponding band, expanded as **dashboard details** (not the searchable record tables). A link to the **module register** (full list) appears at the bottom of each metrics card. PMO admins also see an extra Portfolio action (portfolio categories).

## Visual distinction

On the Overview (and scope tabs), the three bands use **different accent palettes**: **emerald** (Portfolio), **sky** (Programmes), **violet** (Projects)—panel borders/tints, titles, links, and metric tiles (including emphasised “attention” tiles) follow each palette in light and dark mode.

## Technical notes

- Metrics are built in `buildPmoOverviewMetricsFromSummaries()` from the same payloads as **Executive Summary** and **KPIs** (`getExecutiveSummary`, `getKPIs`).
- The dashboard loads **one** combined analytics bundle and passes it to `ExecutiveSummary` (`initialSummary`), `PMODashboardScopeTabs` (for non-overview tabs), and `PMOScopeOverviewMetrics` on Overview (`analyticsBundle`) to avoid duplicate requests.
- If that bundle fails, components fall back to their own requests where implemented.

## Files

- `src/services/dashboardService.js` — builder + `getPmoOverviewMetrics`
- `src/components/app/dashboard/PMOScopeOverviewMetrics.jsx`
- `src/pages/platform-app/Dashboard.jsx`
- `src/services/__tests__/dashboardService.pmoOverviewMetrics.test.js`
