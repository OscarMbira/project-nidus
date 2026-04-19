# v475 — PMO Dashboard Executive Metrics Upgrade

## Source
`Documents/PMO_dashboard_metrics.md` — Executive Dashboard Metrics Recommendations

## Goal
Transform the Platform dashboard from a count display into an **executive decision cockpit** by adding:
- RAG health indices for Portfolio, Programmes, and Projects
- An Executive Alerts Panel (top of Overview tab)
- Enhanced KPI tiles across all three scope tabs
- New **Alerts** and **Governance** tabs (from Section 7 of the spec)

---

## Current State (already built)

| Pillar | Existing Metrics |
|---|---|
| Portfolio | Total, Active, Programmes with/without portfolio, Coverage % |
| Programmes | Total, Active, Planning, On Hold, Linked/Unlinked to portfolio, Projects on programmes |
| Projects | Total, Active, Planned, Completed, Health Index %, Healthy/At Risk/Critical counts, On-time %, Budget variance %, Total budget, Actual spend, Unlinked |

### EVM Infrastructure (already built, not yet on dashboard)
- **`project_evm_snapshots` table** — per-project, per-period: PV, EV, AC
- **`evmService.js` → `computeEvmMetrics(snapshot, bac)`** — computes SV, CV, CPI, SPI, EAC, ETC, VAC, TCPI
- **Dedicated EVM pages** exist: `ProjectEVMPage`, `ProgrammeEVMPage`, `PortfolioEVMPage`
- **`simEvmService.js`** — Simulator parity already in place

EVM metrics are **not yet surfaced on the PMO dashboard** — this plan adds them.

---

## Gaps vs. Spec (Priority Order from Section 6)

| Priority | Metric | Level | Gap |
|---:|---|---|---|
| 1 | Health Index / RAG Status | Portfolio, Programme | Missing at Portfolio & Programme level |
| 2 | Critical Alerts Count | All | Missing entirely |
| 3 | Pending Decisions | All | Missing (needs approvals/governance data) |
| 4 | Budget Utilization % | Portfolio, Programme | Missing |
| 5 | Schedule Variance | Programme, Project | Missing |
| 6 | Benefits Realization % | Portfolio, Programme | Missing |
| 7 | Governance Compliance % | All | Missing |
| 8 | Dependency Blockers | Programme, Project | Missing |
| 9 | No Recent Update count | Programme, Project | Missing |

---

## Implementation Phases

### Phase 1 — Executive Alerts Panel (Overview tab)
**New component:** `PMOExecutiveAlertsPanel.jsx`
**New service function:** `getExecutiveAlerts(organizationId)`

Alerts to surface (from Section 5):
- Projects behind schedule
- Critical risks open
- Budget exceptions (projects over budget)
- Projects without baseline
- Projects / programmes with no recent update (>14 days)
- Unlinked programmes (no portfolio)
- Unlinked projects (no programme or portfolio)
- Governance documents missing

DB queries needed (all lightweight COUNT queries):
- `projects` table: count where `end_date < today AND status != completed`
- `risks` table: count `severity = 'critical' AND status = 'open'`
- `projects` table: budget_used > budget_allocated
- `projects` table: baseline_start IS NULL
- `projects/programmes` table: updated_at < NOW() - interval '14 days'

### Phase 2 — Enhanced Portfolio Metrics
**Modify:** `PMOScopeOverviewMetrics.jsx` (portfolio section)
**Modify:** `dashboardService.js` → `buildPmoOverviewMetricsFromSummaries`

New tiles to add:
- Budget Utilization % (total_budget_used / total_budget_allocated across portfolios)
- Portfolio Health Index (derived from linked programme/project health avg)
- Governance Compliance % (governance documents filed vs required)
- Benefits Realization % (realized vs planned benefits)

### Phase 3 — Enhanced Programme Metrics
**Modify:** `PMOScopeOverviewMetrics.jsx` (programmes section)
**Modify:** `dashboardService.js`

New tiles to add:
- Delivery Progress % (avg % complete across projects in programmes)
- Schedule Variance (count programmes with projects behind end_date)
- Budget Utilization % (total cost entries vs budget across programme projects)
- Benefits Progress % (benefits realization for programmes)
- Blocked Dependencies count
- Milestone Achievement Rate %
- Resource Conflicts count (over-allocated team members)

### Phase 4 — Enhanced Project Metrics
**Modify:** `PMOScopeOverviewMetrics.jsx` (projects section)
**Modify:** `dashboardService.js`

New tiles to add:
- Schedule Status RAG (count: on track / delayed / critical)
- Open Risks count (high + critical)
- Open Issues count
- Overdue Tasks count
- Change Requests Pending
- Document Compliance %
- Avg Task Completion %

### Phase 4b — EVM Aggregated Metrics (Projects, Programmes, Portfolio)
**Source:** `project_evm_snapshots` — latest snapshot per project (MAX period_date)
**Modify:** `dashboardService.js` — add `getAggregatedEvmMetrics(organizationId)`
**Modify:** `PMOScopeOverviewMetrics.jsx` — add EVM band per relevant scope

#### Projects Tab — EVM Summary Band
| Tile | Value | Source |
|---|---|---|
| BAC | Total Budget at Completion | SUM(project budget_allocated) |
| EV | Earned Value | SUM(latest snapshot earned_value) |
| PV | Planned Value | SUM(latest snapshot planned_value) |
| AC | Actual Cost | SUM(latest snapshot actual_cost) |
| CV | Cost Variance (EV − AC) | Positive = under budget |
| SV | Schedule Variance (EV − PV) | Positive = ahead of schedule |
| CPI | Cost Performance Index (EV/AC) | <1 = over-spending |
| SPI | Schedule Performance Index (EV/PV) | <1 = behind schedule |
| EAC | Estimate at Completion (BAC/CPI) | Forecast final cost |
| VAC | Variance at Completion (BAC − EAC) | Positive = savings |
| Projects CPI < 1 | Count of cost-overrun projects | Alert tile |
| Projects SPI < 1 | Count of schedule-lagging projects | Alert tile |

RAG for CPI/SPI: Green ≥1.0, Amber 0.85–0.99, Red <0.85

#### Programmes Tab — EVM Rollup Band
Aggregate EVM snapshots for all projects within each programme, then show:
- Programme-level CPI, SPI, CV, SV
- Count of programmes with CPI < 1 or SPI < 1

#### Portfolio Tab — EVM Rollup Band
Aggregate EVM across all org projects:
- Portfolio BAC, EV, PV, AC, CPI, SPI
- Link to `PortfolioEVMPage` for full drill-down

#### EVM Alerts (add to Phase 1 Alerts Panel)
- Projects with CPI < 0.85 (serious cost overrun)
- Projects with SPI < 0.85 (seriously behind schedule)
- Projects with no EVM data recorded

### Phase 4c — Critical Path Activities & Deliverables
**Source:** `cpmCalculator.js` (`getCriticalPathTasks`, `calculateCPM`) + existing `tasks` + `task_dependencies` tables
**DB function:** `get_task_dependencies(project_id)` already exists in `v19_cpm_functions.sql`
**Modify:** `dashboardService.js` — add `getCriticalPathSummary(organizationId)`
**Modify:** `PMOScopeOverviewMetrics.jsx` — add Critical Path band to Projects tab

#### Approach
Running full CPM per project on every dashboard load is too expensive. Use a lightweight server-side approach:
- Query tasks with `is_deleted=false` where `end_date < NOW()` AND the task has a `task_dependencies` predecessor (proxy for critical path tasks without recalculating)
- For deep drill-down, reuse existing `calculateCPM()` per project on the project-level tab only

#### Projects Tab — Critical Path Summary Band
| Tile | Value | Source |
|---|---|---|
| Critical Path Tasks | Total count of `isCritical` tasks across active projects | CPM calculation on tasks + dependencies |
| CP Tasks Overdue | Critical path tasks where `end_date < today` and not complete | Tasks table |
| CP Tasks Blocked | Critical tasks with open blockers or predecessor not complete | Task dependencies |
| Projects with CP Delay | Count of active projects where any CP task is overdue | Aggregated per project |
| Avg CP Delay (days) | Average days slipped on overdue CP tasks | end_date vs today |
| CP Deliverables At Risk | Milestones/deliverables on CP that are not yet accepted | Tasks where is_milestone=true |

#### Critical Path Alerts (add to Phase 1 Alerts Panel)
- Projects with 1+ overdue critical path task
- Critical deliverables (milestones) past due date
- Blocked critical path tasks (predecessor incomplete)

#### Notes
- `cpmCalculator.js` is client-side only; for the dashboard aggregate, query tasks where `slack = 0` if stored, or use `end_date` proximity as a lightweight proxy
- Full per-project CPM recalculation available as drill-down via existing `ProjectEVMPage` / Gantt links
- Check if `tasks` table has a stored `is_critical` or `slack` column before deciding server vs client computation

### Phase 4d — Overdue & Critical Risks, Issues, and Change Requests

**Sources (all already built):**
- `riskService.js` / `riskAnalyticsService.js` — `risks` table: `status_enum`, `pre_risk_score`, `proximity`, `escalateRiskToIssue()`
- `issueAnalyticsService.js` / `issueService.js` — `issues` table + `issue_actions.target_date`; `get_issue_summary()` RPC returns `overdue_actions`, `critical_issues`
- `changeManagementService.js` — `change_requests` table: `status`, `priority`, `submission_date`

**Modify:** `dashboardService.js` — add `getRiskIssueSummary(organizationId)`
**Modify:** `PMOScopeOverviewMetrics.jsx` — add Risk & Issue band to Projects (and Programmes) tabs

---

#### Risk Metrics (Projects tab — Risk Band)

| Tile | Value | DB Source |
|---|---|---|
| Open Risks | Total unresolved risks across active projects | `risks WHERE status_enum != 'closed'` |
| Critical Risks | Risks with `pre_risk_score = 'critical'` or `'high'` and open | `risks WHERE status_enum = 'open' AND pre_risk_score IN ('critical','high')` |
| Imminent Risks | Risks with `proximity = 'imminent'` and open | `proximity = 'imminent'` |
| Overdue Risk Reviews | Risks where `review_date < today` and not closed | `review_date < NOW()` |
| Unmitigated Critical Risks | Critical risks with no response action recorded | Join `risk_responses` — no linked response |
| Risks Escalated to Issues | Risks that triggered issue escalation | `escalated_to_issue_id IS NOT NULL` |
| Risks with No Owner | Risks where `risk_owner_id IS NULL` | `risk_owner_id IS NULL` |

RAG for Risk Band: Green = 0 critical open, Amber = 1–3, Red = 4+

---

#### Issue Metrics (Projects tab — Issues Band)

| Tile | Value | DB Source |
|---|---|---|
| Open Issues | Total open issues across active projects | `issues WHERE status NOT IN ('closed','cancelled')` |
| Critical Issues | Issues with `priority = 'critical'` or `severity = 'critical'` | Existing filter in `issueService.js` |
| Overdue Issue Actions | Issue actions where `target_date < today` and not complete | `issue_actions.target_date < NOW()` (already in `issueAnalyticsService`) |
| By Type: RFCs | Open Requests for Change | `issue_type = 'request_for_change'` |
| By Type: Off-Specs | Open Off-Specification items | `issue_type = 'off_specification'` |
| By Type: Problems | Open Problem/Concern items | `issue_type = 'problem_concern'` |
| High-Age Issues | Issues open > 30 days not yet resolved | `date_raised < NOW() - 30 days AND status = 'open'` |
| Issues with No Owner | Issues where `owner_id IS NULL` | `owner_id IS NULL` |
| Escalated from Risks | Issues raised via risk escalation | `escalated_from_risk_id IS NOT NULL` |

---

#### Change Request Metrics (Projects tab — Changes Band)

| Tile | Value | DB Source |
|---|---|---|
| Pending Approval | CRs awaiting decision | `status = 'pending-approval'` |
| Under Assessment | CRs being evaluated | `status = 'under-assessment'` |
| Critical / Urgent CRs | CRs with `priority = 'critical'` or `'urgent'` | Already in `changeManagementService` |
| Total Open CRs | Not yet implemented or rejected | Exclude `implemented`, `rejected` |

---

#### Additional Alerts for Phase 1 Panel (from these sources)
- Unmitigated critical risks (count > 0)
- Overdue issue actions (count > 0)
- Issues open > 30 days without resolution
- Change requests pending approval > 7 days

### Phase 5 — New Dashboard Tabs: Alerts + Governance
**Modify:** `PMODashboardScopeTabs.jsx` — add `alerts` and `governance` tabs
**New components:**
- `PMOAlertsTab.jsx` — expanded view of all exception alerts with drill-down links
- `PMOGovernanceTab.jsx` — governance compliance per project/programme/portfolio

---

## Todo List

- [x] **P1** Create `SQL/v475_pmo_dashboard_metrics_reference.sql` — reference DDL (no new tables; documents sources; supersedes optional `v475_dashboard_alert_queries.sql` idea)
- [x] **P1** Add `getExecutiveAlerts(organizationId)` to `dashboardService.js`
- [x] **P1** Create `PMOExecutiveAlertsPanel.jsx` — alert panel for Overview tab
- [x] **P1** Wire alerts panel into `Dashboard.jsx` (above scope tabs, Overview only)
- [x] **P2** Add portfolio budget utilization + health index to `dashboardService.js`
- [x] **P2** Add new portfolio metric tiles to `PMOScopeOverviewMetrics.jsx`
- [x] **P3** Add programme delivery progress, schedule variance, budget utilization to service
- [x] **P3** Add new programme metric tiles to `PMOScopeOverviewMetrics.jsx`
- [x] **P4** Add project open risks, issues, overdue tasks, schedule RAG to service
- [x] **P4** Add new project metric tiles to `PMOScopeOverviewMetrics.jsx`
- [x] **P4b** Add `getAggregatedEvmMetrics(organizationId)` to `dashboardService.js` (query latest EVM snapshot per project via `project_evm_snapshots`)
- [x] **P4b** Add EVM summary band (BAC, EV, PV, AC, CV, SV, CPI, SPI, EAC, VAC) to Projects tab in `PMOScopeOverviewMetrics.jsx`
- [x] **P4b** Add programme-level EVM rollup band to Programmes tab
- [x] **P4b** Add portfolio-level EVM rollup band to Portfolio tab
- [x] **P4b** Add EVM alert tiles (CPI < 0.85, SPI < 0.85, no EVM data) to `PMOExecutiveAlertsPanel.jsx`
- [x] **P4c** Check `tasks` table for stored `is_critical` / `slack` columns; if absent, add lightweight SQL query for CP proxy
- [x] **P4c** Add `getCriticalPathSummary(organizationId)` to `dashboardService.js`
- [x] **P4c** Add Critical Path summary band (CP tasks, overdue CP tasks, CP tasks blocked, projects with CP delay, avg delay days, CP deliverables at risk) to Projects tab in `PMOScopeOverviewMetrics.jsx`
- [x] **P4c** Add CP alert tiles (projects with overdue CP task, blocked CP tasks, overdue CP milestones) to `PMOExecutiveAlertsPanel.jsx`
- [x] **P4d** Add `getRiskIssueSummary(organizationId)` to `dashboardService.js` (open/critical/imminent/overdue/unmitigated/no-owner risks; open/critical/overdue-actions/type-breakdown/high-age/no-owner issues; pending/critical CRs)
- [x] **P4d** Add Risk Band to Projects tab in `PMOScopeOverviewMetrics.jsx` (open, critical, imminent, overdue reviews, unmitigated, escalated, no owner)
- [x] **P4d** Add Issues Band to Projects tab (open, critical, overdue actions, by type RFC/Off-Spec/Problem, high-age, no owner, escalated from risk)
- [x] **P4d** Add Change Requests Band to Projects tab (pending approval, under assessment, critical/urgent, total open)
- [x] **P4d** Add Risk/Issue alert tiles to `PMOExecutiveAlertsPanel.jsx` (unmitigated critical risks, overdue actions, issues >30 days, CRs pending >7 days)
- [x] **P5** Add `alerts` and `governance` tabs to `PMODashboardScopeTabs.jsx`
- [x] **P5** Create `PMOAlertsTab.jsx`
- [x] **P5** Create `PMOGovernanceTab.jsx`
- [x] Write unit tests for new service functions
- [x] Add documentation file

---

## Key Design Decisions

1. **No new DB tables** — all metrics derived from existing tables (projects, risks, issues, tasks, programmes, portfolios, governance docs, benefits, `project_evm_snapshots`).
2. **Application-layer aggregation** — counts run via `platformDb` so existing RLS on projects and related tables applies. Reference SQL documents sources (`SQL/v475_pmo_dashboard_metrics_reference.sql`).
3. **RAG thresholds** per spec Section 8: Green ≥80%, Amber 60–79%, Red <60%.
4. **Lazy-loaded** — alert panel and new tab content use `Suspense`, same pattern as existing tabs.
5. **Phase 1 first** — alerts panel is highest executive value, minimal DB change.
6. **Files touched (v475 implementation):** `dashboardService.js`, `PMOScopeOverviewMetrics.jsx`, `PMODashboardScopeTabs.jsx`, `Dashboard.jsx`, `utils/pmoDashboardTabs.js`, plus new components `PMOExecutiveAlertsPanel.jsx`, `PMOAlertsTab.jsx`, `PMOGovernanceTab.jsx`, tests, `Documentation/v475_PMO_Dashboard_Executive_Metrics.md`.

---

## Review (v475 — completed)

**Summary of delivery**

- Extended the dashboard bundle with `getPmoExtendedMetrics` (parallel with executive summary + KPIs), merging into `buildPmoOverviewMetricsFromSummaries(..., extended)`.
- Added `getExecutiveAlerts`, `getAggregatedEvmMetrics`, `getCriticalPathSummary`, `getRiskIssueSummary` in `dashboardService.js`; default export updated.
- Overview: `PMOExecutiveAlertsPanel` shows non-zero exception tiles; scope metrics include portfolio/programme/project bands (EVM, CP proxy, risk/issue/CR).
- New tabs `?tab=alerts` and `?tab=governance` with `PMOAlertsTab` and `PMOGovernanceTab` (governance loads `pmo_document_compliance_view` per org projects).
- SQL reference file and user documentation added under `SQL/` and `Documentation/`; unit tests for extended merge and existing PMO overview tests updated.

**Notes**

- Critical path uses `tasks.is_critical_path` (from gantt migrations) plus `task_dependencies` and blocked flags — not full CPM on every load.
- Programme benefits use `programme_benefits` linked via programmes tied to org projects (`programme_projects`).
- `getPmoOverviewMetrics` logs a warning and returns partial metrics if `getPmoExtendedMetrics` fails but executive + KPI succeed.
