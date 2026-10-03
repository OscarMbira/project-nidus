/**
 * Persona widget registries (v982 Phase 5 — Role-Aware Home Pages).
 * Each array is a plain, declarative composition — no logic, no role branching — consumed by
 * DashboardFramework via a persona's home page component. Adding/removing a widget from a
 * persona's home is a one-line change here, never a change to the framework itself.
 *
 * All 5 personas from the plan's original sequencing are now migrated (v982 Phase 5 follow-up
 * closes out Portfolio/Programme Manager Home and PMO Admin Home — see the plan file's Review
 * section for full detail):
 *   - PROJECT_MANAGER_HOME_WIDGETS — full parity with the pre-v982 PMDashboard.jsx content.
 *   - FREELANCER_HOME_WIDGETS — a deliberately lighter subset (proves the framework composes
 *     DIFFERENT widget sets per persona from the same pool, not just one persona reusing
 *     everything) — a solo/individual account has no formal governance-document workflow to
 *     reference, so those two widgets are omitted here but still available in the pool.
 *   - PORTFOLIO_MANAGER_HOME_WIDGETS / PROGRAMME_MANAGER_HOME_WIDGETS — new widgets built from
 *     existing rollup data (portfolios' own pre-computed health columns, programme_rollup_view)
 *     rather than inventing new aggregation queries.
 *   - PMO_ADMIN_HOME_WIDGETS — one cohesive widget (PmoAdminOverviewWidget) wrapping the exact
 *     pre-v982 Dashboard.jsx PMO Executive Summary content/fetch orchestration, deliberately NOT
 *     split into several independently-fetching widgets (rule 66 — see PmoAdminOverviewWidget.jsx's
 *     own header for why), plus a small, genuinely independent quick-links widget. Serves BOTH
 *     Account Owner and PMO Admin — they already share this exact view today (account_owner is
 *     already a PMO_LAYOUT_ROLES member in menuLayoutUtils.js), so no separate Account-Owner-only
 *     composition was built — see the plan file's Review section for the full reasoning.
 */
import PmStatsCardsWidget from './widgets/PmStatsCardsWidget'
import PmQuickActionsWidget from './widgets/PmQuickActionsWidget'
import PmHealthSummaryWidget from './widgets/PmHealthSummaryWidget'
import PmMilestonesWidget from './widgets/PmMilestonesWidget'
import PmUpcomingActionsWidget from './widgets/PmUpcomingActionsWidget'
import PortfolioHealthWidget from './widgets/PortfolioHealthWidget'
import PortfolioProjectsWidget from './widgets/PortfolioProjectsWidget'
import ProgrammeHealthWidget from './widgets/ProgrammeHealthWidget'
import ProgrammeProjectsWidget from './widgets/ProgrammeProjectsWidget'
import PmoAdminOverviewWidget from './widgets/PmoAdminOverviewWidget'
import PmoQuickLinksWidget from './widgets/PmoQuickLinksWidget'

export const PROJECT_MANAGER_HOME_WIDGETS = [
  // v966/taxonomy §3 Dashboard — health-at-a-glance leads, ahead of raw stat counts and quick
  // actions (2026-09-08 user decision, live-use finding: Open Risks/Open Issues below duplicated
  // this widget's RAID Summary card once it existed — see PmStatsCardsWidget for the dedup).
  { id: 'pm-health-summary', title: 'Project Health & Summaries', component: PmHealthSummaryWidget, requiredScope: ['projectId'], span: 3 },
  { id: 'pm-stats-cards', title: 'Delivery Stats', component: PmStatsCardsWidget, requiredScope: ['projectId'], span: 3 },
  { id: 'pm-quick-actions', title: 'Quick Actions', component: PmQuickActionsWidget, requiredScope: ['projectId'], span: 3 },
  { id: 'pm-milestones', title: 'Milestones', component: PmMilestonesWidget, requiredScope: ['projectId'], span: 3 },
  { id: 'pm-upcoming-actions', title: 'Upcoming Actions', component: PmUpcomingActionsWidget, requiredScope: ['projectId'], span: 3 },
]

export const FREELANCER_HOME_WIDGETS = [
  { id: 'pm-stats-cards', title: 'Delivery Stats', component: PmStatsCardsWidget, requiredScope: ['projectId'], span: 3 },
  { id: 'pm-quick-actions', title: 'Quick Actions', component: PmQuickActionsWidget, requiredScope: ['projectId'], span: 3 },
  { id: 'pm-milestones', title: 'Milestones', component: PmMilestonesWidget, requiredScope: ['projectId'], span: 3 },
]

export const PORTFOLIO_MANAGER_HOME_WIDGETS = [
  { id: 'portfolio-health', title: 'Portfolio Health', component: PortfolioHealthWidget, requiredScope: ['portfolioId'], span: 3 },
  { id: 'portfolio-projects', title: 'Portfolio Projects', component: PortfolioProjectsWidget, requiredScope: ['portfolioId'], span: 3 },
]

export const PROGRAMME_MANAGER_HOME_WIDGETS = [
  { id: 'programme-health', title: 'Programme Health', component: ProgrammeHealthWidget, requiredScope: ['programmeId'], span: 3 },
  { id: 'programme-projects', title: 'Programme Projects', component: ProgrammeProjectsWidget, requiredScope: ['programmeId'], span: 3 },
]

export const PMO_ADMIN_HOME_WIDGETS = [
  { id: 'pmo-admin-overview', title: 'PMO Overview', component: PmoAdminOverviewWidget, requiredRole: ['pmo_admin', 'system_admin', 'account_owner', 'super_admin', 'org_admin'], requiredScope: ['accountId'], span: 3 },
  { id: 'pmo-quick-links', title: 'Configuration Shortcuts', component: PmoQuickLinksWidget, requiredRole: ['pmo_admin', 'system_admin', 'account_owner', 'super_admin', 'org_admin'], span: 3 },
]
