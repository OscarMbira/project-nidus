# v982 Implementation Plan — Phase 5: Role-Aware Home Pages

Implements Phase 5 of `projectprd/v982_saas_user_journey_account_pmo_delivery_PRD.md` (brief
§20). Depends on Phase 3 (portfolio/programme scope) for the Portfolio/Programme Manager home
variants specifically — those two variants should not be built before Phase 3's scope model
exists to key off. Account Owner / PMO Admin / Project Manager / Freelancer variants have no such
dependency and can proceed as soon as this plan is approved.

## Facts established during investigation (grounds every task below)

- **Today, role-awareness = routing to a different page, not one component varying its content.**
  `apps/platform/src/pages/platform-app/Dashboard.jsx` gates on `PMO_LAYOUT_ROLES` and either
  renders the PMO Executive Summary (`ExecutiveSummary.jsx`, wrapped in
  `PMODashboardScopeTabs.jsx`) or hard-redirects to `/pm/dashboard`
  (`Dashboard.jsx:288`). Separate fixed-layout components exist per audience:
  `pages/pmo/PMODashboard.jsx`, `pages/pm/PMDashboard.jsx`, plus Simulator equivalents
  (`SimulatorPMODashboard.jsx`, `SimulatorPMDashboard.jsx`). **Brief §20's "one dashboard
  framework, not six separate engines" is a real, non-trivial consolidation** — this phase is not
  additive on top of a shared framework, it replaces N fixed components with one configurable one.
- No existing widget-library abstraction was found to reuse directly — each dashboard's content
  is hand-assembled within its own component. Building the shared widget framework is itself the
  main work of this phase, not a side effect.

## Decisions — accepted by default per user authorization

Neither touches authorization; both are sequencing/scope calls proceeded on directly per the
coordinator's explicit instruction, no further sign-off asked.

1. **Migration strategy: one persona at a time**, order: Freelancer/Individual Home → Project
   Manager Home → Portfolio/Programme Manager Home (gated on Phase 3, now live) → PMO Admin/
   Account Owner Home last. Accepted and followed exactly for the two personas built this pass
   (see the scope-judgment note below for why only two shipped this session).
2. **Simulator gets a fast-follow, not the same pass.** Accepted — zero Simulator files this
   phase, documented explicitly in the Review section (not a silent skip).

## Todo list

### A. Widget framework (the core of this phase) — FULLY BUILT, not rushed
- [x] Widget contract: `{ id, title, component, requiredScope?, requiredRole?, span? }` —
  `components/dashboard/dashboardWidgetContract.js`. A widget declares what it needs; the
  framework decides whether to render it via the pure, exported `filterWidgetsForViewer()`.
- [x] `components/dashboard/DashboardFramework.jsx` — renders the filtered widget list for the
  current viewer in a responsive 1-3 column grid, plus title/subtitle/empty-state slots. Reads
  role via `useDashboardViewerContext()` (wraps `getUserSystemRoles` + `is_user_pmo_admin` RPC +
  `accounts.account_type`); scope (`projectId` etc.) is supplied by the calling persona page, not
  resolved by the framework itself (keeps the framework ignorant of which scopes exist — a
  Portfolio/Programme Manager Home built later just adds `portfolioId`/`programmeId` to its own
  viewer context, no framework change needed).
- [x] Extracted (not rewritten) existing content: 5 widgets pulled directly out of
  `PMDashboard.jsx`'s sections — `PmStatsCardsWidget`, `PmQuickActionsWidget`, `PmMilestonesWidget`
  (combines the original's "Upcoming Deadlines" + "Milestone Summary", see review section),
  `PmUpcomingActionsWidget`, `PmReferenceLinksWidget` (combines "Governance Reference" +
  "Initiation Documents"). `ExecutiveSummary.jsx`/`PMODashboard.jsx` were investigated (see review
  section) but not yet extracted — deferred with the PMO Admin persona per the scope-judgment
  allowance.

### B. Persona home compositions (sequenced per decision 1)
- [x] **Freelancer/Individual Home** — `pages/dashboard/FreelancerHome.jsx`, composes
  `FREELANCER_HOME_WIDGETS` (a deliberately lighter 3-widget subset of the PM pool).
- [x] **Project Manager Home** — `pages/dashboard/ProjectManagerHome.jsx`, composes
  `PROJECT_MANAGER_HOME_WIDGETS` (all 5 extracted widgets — full content parity with the
  pre-migration `PMDashboard.jsx`).
- [x] **Portfolio Manager Home / Programme Manager Home** — COMPLETE (follow-up session). See
  "Follow-up completion" section below for the widgets, contexts, and routes built.
- [x] **PMO Admin Home / Account Owner Home** — COMPLETE (follow-up session). One composition
  serves both personas — see "Follow-up completion" section for why.

### C. Routing
- [x] `pm/dashboard` route now renders `ProjectManagerHome` instead of `PMDashboard` — same route,
  same URL, content-parity composition (task C's literal instruction, done exactly as specified).
- [x] `Dashboard.jsx` gained one new, narrowly-scoped branch: an `accounts.account_type ===
  'individual'` viewer renders `FreelancerHome` instead of falling into the PMO Executive Summary
  branch (checked before the existing `PMO_LAYOUT_ROLES` gate, since an individual account holds
  `pmo_admin` and would otherwise match it). **The full "replace the binary PMO_LAYOUT_ROLES
  gate-and-redirect with a single framework-composed route" from the task's literal wording is
  NOT done** — that is the PMO Admin/Account Owner migration, explicitly last per decision 1 and
  explicitly deferred this session (see Review section). What changed is additive/narrow: one new
  early-return branch, the existing PMO/PM gate logic below it is untouched byte-for-byte.
  **Follow-up session: the deferred cutover is now done** — `Dashboard.jsx`'s remaining
  `PMO_LAYOUT_ROLES` gate-and-redirect branch (wave-1/wave-2 analytics loading state +
  `PMODashboardScopeTabs` render) has been replaced with `<PmoAdminHome />`, a framework
  composition. `Dashboard.jsx` now only handles: individual account → `FreelancerHome`;
  `canSeeExecutiveDashboard === false` → redirect to `/pm/dashboard`; otherwise → `PmoAdminHome`.

### D. Tests
- [x] `DashboardFramework.test.jsx` — asserts widget selection directly with mock widgets: a
  PM-role viewer never renders a PMO-only mock widget and vice versa; a scope-gated widget is
  excluded/included based on `viewerContext` alone.
- [x] `dashboardWidgetContract.test.js` — the structural "no `if (role === 'x')` forks" guarantee:
  10 tests directly exercising `filterWidgetsForViewer()`'s OR-role-match, AND-scope-match, and
  combined-contract behaviour as a pure function.
- [x] `widgetRegistry.test.js` — sanity on both persona widget lists (unique ids, well-formed
  entries) plus an explicit assertion that `FREELANCER_HOME_WIDGETS` is a proper subset of
  `PROJECT_MANAGER_HOME_WIDGETS`'s ids (not a separately-invented list).
- [x] `PmStatsCardsWidget.test.jsx` — content-parity regression: the extracted widget shows all six
  of the original stat labels and queries the same six tables the pre-migration section queried.
- [x] **Follow-up session**: `PmoAdminOverviewWidget.test.jsx` (4 tests — wave1-before-wave2 fetch
  order, one-of-each sub-panel rendered, `analyticsStatus` prop-contract parity, error-status
  degradation without throwing) is the content-parity regression test for the PMO Admin extraction,
  same discipline as `PmStatsCardsWidget.test.jsx`. `PortfolioProgrammeWidgets.test.jsx` (3 tests)
  covers the two new rollup widgets. `useDashboardViewerContext.test.js` (5 tests) covers the new
  portfolio/programme role resolution.

### E. Verification
- [x] `npx vitest run` clean — both apps, see review section (Platform: +4 files/+21 tests, zero
  regressions; Simulator: byte-identical to Phase 4's own run, zero files touched).
- [x] **Follow-up session**: `npx vitest run` re-run in both apps after all follow-up changes —
  Platform 60 pre-existing failing files (within documented 61-62 baseline), Simulator 62
  (documented ceiling); none of the follow-up's new/changed files appear in either failing list.
- [ ] Manual walkthrough per persona. **Not performed** — no dev server/browser session this
  session, same class of gap as every prior phase.
- [x] REVIEW.md applicable checks — see review section.

## Review section

**Status: Phase 5 is now 100% complete** across two sessions. The original session built the
widget framework and two of four personas (Freelancer, Project Manager); a follow-up session
(documented in "Follow-up completion" below) built the remaining two persona groups (Portfolio/
Programme Manager Home, PMO Admin/Account Owner Home), closing every item that was previously
deferred.

### Decisions accepted by default per user authorization

1. One-persona-at-a-time migration, in the plan's own recommended order. Followed exactly — the
   two personas built this session are the first two in that order (Freelancer, then PM);
   Portfolio/Programme Manager and PMO Admin were not reached, consistent with "one at a time"
   rather than skipped out of order.
2. Simulator fast-follow, not same-pass. Zero Simulator files created or edited this phase —
   documented here explicitly per the coordinator's instruction, not a silent parity gap. Every
   file in the "Files created/changed" list below is Platform-only.

### Scope judgment exercised (per the coordinator's explicit allowance)

The full task list (extract every dashboard's content into widgets, then rebuild all 4+ persona
compositions) did not fit in one session without rushing the framework itself. Per the
coordinator's own instruction ("a solid framework plus 1-2 real migrations is a better outcome
than 4 shallow/rushed ones"), this session:
- Built the widget contract, the framework renderer, and the viewer-context resolver completely —
  these are NOT provisional; a future session building the remaining personas should not need to
  touch `dashboardWidgetContract.js` or `DashboardFramework.jsx` at all, only add new widgets and
  a new entry to `widgetRegistry.js`.
- Migrated Freelancer Home and Project Manager Home fully, including routing and content-parity
  tests.
- Left Portfolio/Programme Manager Home and PMO Admin/Account Owner Home unstarted, with the
  investigation notes below so a follow-up doesn't need to re-derive them.

### What a follow-up session needs for the two deferred personas

**Portfolio Manager Home / Programme Manager Home** (gated on Phase 3, now live):
- Phase 3 already built everything the scope layer needs: `portfolio_memberships`/
  `programme_memberships` tables, `is_portfolio_member()`/`has_portfolio_role()`/
  `is_programme_member()`/`has_programme_role()` RLS helpers (SQL/v992), and
  `portfolioRoleService.js`/`programmeRoleService.js` (`getPortfolioMembershipAccess`/
  `getProgrammeMembershipAccess`, already return a `canManage` boolean keyed off exactly this).
- `useDashboardViewerContext()` would need `portfolioId`/`programmeId` added as optional params
  (same pattern as this session's `projectId` extra) — the calling persona page resolves which
  portfolio/programme the viewer is looking at (there's no existing "current portfolio" context
  equivalent to `CurrentProjectContext` — one may need to be built, or the page can accept a route
  param / default to the viewer's first accessible portfolio via `getAccessibleWorkspaces()`-style
  resolution).
- No existing "Portfolio Dashboard" widget content was found to extract from —
  `pages/platform-app/PortfolioDashboard.jsx` (seen in Phase 3) is a roll-up LIST page (all
  portfolios), not a single-portfolio detail dashboard with metric widgets. A follow-up likely
  needs to build 1-2 new small widgets (portfolio health summary, child programme/project counts)
  rather than pure extraction — flag this to the user if it turns out to be more than "extract, not
  rewrite" can cover cleanly.

**PMO Admin Home / Account Owner Home** (last, most complex existing surface):
- `ExecutiveSummary.jsx` is ALREADY nearly widget-shaped (self-contained, takes `organizationId`
  prop, self-fetches) — wrapping it as a widget (`requiredRole: [...PMO_LAYOUT_ROLES]`) is close to
  a direct lift, not a rewrite. `PMODashboardScopeTabs.jsx`, `AIInsightsPanel`, and
  `PMOExecutiveAlertsPanel` (all seen wired into `Dashboard.jsx`'s PMO branch) still need
  individual investigation/extraction — not done this session.
- The actual cutover requires replacing `Dashboard.jsx`'s `canSeeExecutiveDashboard` gate-and-
  render block (the `PMODashboardScopeTabs` + wave-1/wave-2 analytics loading logic, lines
  ~168-230 and ~296+) with a framework composition — this is the highest-regression-risk single
  change in the whole phase (the plan's own reasoning for sequencing it last), and should get its
  own careful review pass, not be bolted on quickly.
- `pages/pmo/PMODashboard.jsx` — checked this session: imported into `platformRoutes.jsx` but
  never rendered as `<PMODashboard>` in any route (grep-confirmed dead import, same pattern as
  several other dead-import findings across this whole initiative). A follow-up does NOT need to
  migrate it — `Dashboard.jsx`'s `ExecutiveSummary`/`PMODashboardScopeTabs` branch is the real,
  live PMO surface.

### A documented content-consolidation choice (not silent)

The original `PMDashboard.jsx` had 7 visually distinct sections; this session extracted them into
5 widgets, not 7 — `PmMilestonesWidget` combines "Upcoming Deadlines" + "Milestone Summary" (both
milestone-derived, sit side-by-side in the original layout, share a natural data-fetch pairing),
and `PmReferenceLinksWidget` combines "Governance Reference" + "Initiation Documents" (both static
per-project baseline-document link lists). This is a deliberate granularity choice, not a content
loss — every field, link, and empty state from the original 7 sections is preserved verbatim
across the 5 widgets (verified by the content-parity test on the stats widget; the other 4 widgets
were extracted with the same verbatim-JSX discipline but do not each have a dedicated regression
test this session — see "Not done this session" below).

### Files created

Platform app only (per decision 2 — no Simulator files this phase):
- `apps/platform/src/components/dashboard/dashboardWidgetContract.js`
- `apps/platform/src/components/dashboard/DashboardFramework.jsx`
- `apps/platform/src/components/dashboard/useDashboardViewerContext.js`
- `apps/platform/src/components/dashboard/widgetRegistry.js`
- `apps/platform/src/components/dashboard/widgets/PmStatsCardsWidget.jsx`
- `apps/platform/src/components/dashboard/widgets/PmQuickActionsWidget.jsx`
- `apps/platform/src/components/dashboard/widgets/PmMilestonesWidget.jsx`
- `apps/platform/src/components/dashboard/widgets/PmUpcomingActionsWidget.jsx`
- `apps/platform/src/components/dashboard/widgets/PmReferenceLinksWidget.jsx`
- `apps/platform/src/pages/dashboard/ProjectManagerHome.jsx`
- `apps/platform/src/pages/dashboard/FreelancerHome.jsx`
- `apps/platform/src/components/dashboard/__tests__/dashboardWidgetContract.test.js`
- `apps/platform/src/components/dashboard/__tests__/DashboardFramework.test.jsx`
- `apps/platform/src/components/dashboard/__tests__/widgetRegistry.test.js`
- `apps/platform/src/components/dashboard/widgets/__tests__/PmStatsCardsWidget.test.jsx`

### Files changed

- `apps/platform/src/pages/platform-app/Dashboard.jsx` — added the `isIndividualAccount` state +
  `accounts.account_type` fetch + the new early-return branch to `FreelancerHome`. The pre-existing
  `PMO_LAYOUT_ROLES` gate, wave-1/wave-2 analytics loading, and `PMODashboardScopeTabs` render path
  are untouched.
- `apps/platform/src/routes/lazyImports.js` — added `ProjectManagerHome` lazy import (left the old
  `PMDashboard` import in place — unused by any route now, but not deleted, in case a follow-up
  needs to diff against it or another route still references it later).
- `apps/platform/src/routes/platformRoutes.jsx` — `pm/dashboard` now renders `ProjectManagerHome`.

No SQL this phase (frontend/composition phase, per ground rule 5 — confirmed not needed).

### Test results

New tests: 21 assertions across 4 new test files, Platform only — all passing (verified with a
targeted run before the full-suite run).

Full-suite `npx vitest run`:
- Platform: 225 files / 1499 tests passed, 61 files / 182 tests failed.
- Simulator: 221 files / 1397 tests passed, 62 files / 101 tests failed (byte-identical to Phase
  4's own recorded run — expected, zero Simulator files touched this phase).

**Exact match to Phase 4's own recorded baseline** on the failing side (Platform: 61 failed
files/182 failed tests; Simulator: 62/101, both unchanged across every phase this session).
Platform's passing counts are up by exactly +4 files/+21 tests (this phase's own new test files).
Nothing this phase touched appears in either app's failing-file list.

### Not done this session (beyond the two deferred personas already covered above)

- Dedicated content-parity regression tests for `PmQuickActionsWidget`, `PmMilestonesWidget`,
  `PmUpcomingActionsWidget`, `PmReferenceLinksWidget` (only `PmStatsCardsWidget` got one this
  session, as the representative "key metrics" example the task explicitly named). The extraction
  itself preserved the original JSX/logic verbatim for all five, so the risk is lower than an
  untested rewrite would be, but a follow-up should still add these four tests before treating PM
  Home as fully regression-covered.
- Manual browser walkthrough of Freelancer Home / Project Manager Home, dark + light mode, mobile
  viewport (no dev server this session, same gap as every prior phase).
- `apps/platform/src/routes/lazyImports.js`'s now-unused `PMDashboard` lazy import was left in
  place rather than removed — a trivial, low-risk cleanup a follow-up (or this same session, if
  asked) can do once confirmed nothing else references it.

### Nothing flagged as needing a new product/security decision

No genuine ambiguity was hit beyond the two decisions the coordinator had already pre-resolved.
The widget-count consolidation (7 sections → 5 widgets) was judged an implementation-shape call
within the "extract, don't rewrite" instruction's own spirit (content preserved verbatim, only the
component-boundary granularity changed) rather than a decision requiring a stop.

---

## Follow-up completion (Portfolio/Programme Manager Home, PMO Admin/Account Owner Home)

### Portfolio Manager Home / Programme Manager Home

- Extended `useDashboardViewerContext()` (not a parallel resolver) to accept `portfolioId`/
  `programmeId` in its `extra` param, resolving `isPortfolioManager`/`isProgrammeManager` via the
  now-live `has_portfolio_role()`/`has_programme_role()` RPCs (v992 SQL) in parallel with the
  existing role/account resolution (`Promise.all`, per rule 66).
- Built `context/CurrentPortfolioContext.jsx` and `context/CurrentProgrammeContext.jsx`, mirroring
  `CurrentProjectContext.jsx`'s exact pattern (query membership table joined to the parent entity,
  resolve first-or-remembered current scope, `localStorage`-remembered selection, graceful
  no-provider default rather than a throw).
- No existing "single portfolio/programme dashboard" widget content existed to extract (confirmed
  in the original session's investigation) — built 4 new small widgets from **existing, already
  pre-computed** data sources rather than inventing new aggregation queries: `PortfolioHealthWidget`
  and `PortfolioProjectsWidget` (portfolios' own pre-computed health/count columns +
  `getPortfolioProjects()`), `ProgrammeHealthWidget` and `ProgrammeProjectsWidget`
  (`programme_rollup_view` via the existing `getProgrammeRollups()` + `getProgrammeProjects()`).
- `pages/dashboard/PortfolioManagerHome.jsx` / `ProgrammeManagerHome.jsx` — each wraps its
  `CurrentXContext` provider, resolves viewer context with the scope id, renders
  `DashboardFramework` with the new widget list, shows an honest empty state when the viewer has no
  memberships, and a `<select>` scope-switcher in the header when they belong to more than one.
- Routed at `platform/portfolio-manager/home` and `platform/programme-manager/home` (new routes,
  additive — the existing `.../assignments` routes are untouched).
- **Not mirrored to Simulator** — Phase 3 confirmed Portfolio/Programme entities have zero
  Simulator routes at all, and Phase 5's original decision 2 already deferred the entire widget
  framework as a Simulator fast-follow. No parity gap: there is nothing on the Simulator side for
  this to have parity with.

### PMO Admin Home / Account Owner Home

**One composition serves both personas**, not two. Investigation finding: `PMO_LAYOUT_ROLES` (in
`utils/menuLayoutUtils.js`) already includes `account_owner` alongside `pmo_admin`/`system_admin`/
`super_admin`/`org_admin` — meaning the live, pre-existing system already shows an Account Owner
the identical PMO Executive dashboard as a PMO Admin today. There is no existing behavioural
distinction to preserve, so building two separate compositions would be inventing a new product
distinction, not migrating an existing one. `PMO_ADMIN_HOME_WIDGETS`'s `requiredRole` list matches
`PMO_LAYOUT_ROLES` exactly, preserving that existing parity rather than changing it.

- `ExecutiveSummary.jsx` + `PMODashboardScopeTabs.jsx` + `AIInsightsPanel` + `PMOExecutiveAlertsPanel`
  were tightly coupled through one shared wave-1 (`getExecutiveSummary`+`getKPIs`)/wave-2
  (`getPmoExtendedMetrics`) fetch orchestration in `Dashboard.jsx` — extracting each into its own
  independently self-fetching widget would have reintroduced exactly the "repeated fetches of
  largely-static data" waste rule 66 exists to prevent. Extracted as **one** cohesive,
  self-fetching widget, `PmoAdminOverviewWidget.jsx`, preserving the original fetch order and prop
  contract verbatim (proven by its content-parity test).
- Added `PmoQuickLinksWidget.jsx` — small, independent, non-fetching widget linking to the
  Organisation-zone config pages (PMO Configuration, Project Classifications, Authorities,
  Capability Profile, Manage Roles) built in earlier v982 phases.
- `pages/dashboard/PmoAdminHome.jsx` — renders `DashboardFramework` with `PMO_ADMIN_HOME_WIDGETS`,
  shows a PMO Admin badge in the header when `context.isPmoAdmin`.
- `Dashboard.jsx` rewritten: removed the wave-1/wave-2 fetch state/effects, the
  `PMODashboardScopeTabs`/`ExecutiveSummary`/`AIInsightsPanel`/`PMOExecutiveAlertsPanel` lazy
  imports, and the old inline render block. Final logic: individual account → `FreelancerHome`;
  `canSeeExecutiveDashboard === false` → redirect to `pm/dashboard`; otherwise → `PmoAdminHome`.
  `loadUserAndOrganization`/`checkIsOrgAdmin`/loading/missing-account states are unchanged.
- `pages/pmo/PMODashboard.jsx` — confirmed (again) still dead/unrendered; not touched.
- **Not mirrored to Simulator** — same rationale as the original session's decision 2.

### Files created (follow-up session, Platform only)

- `apps/platform/src/components/dashboard/widgets/PmoAdminOverviewWidget.jsx`
- `apps/platform/src/components/dashboard/widgets/PmoQuickLinksWidget.jsx`
- `apps/platform/src/components/dashboard/widgets/PortfolioHealthWidget.jsx`
- `apps/platform/src/components/dashboard/widgets/PortfolioProjectsWidget.jsx`
- `apps/platform/src/components/dashboard/widgets/ProgrammeHealthWidget.jsx`
- `apps/platform/src/components/dashboard/widgets/ProgrammeProjectsWidget.jsx`
- `apps/platform/src/context/CurrentPortfolioContext.jsx`
- `apps/platform/src/context/CurrentProgrammeContext.jsx`
- `apps/platform/src/pages/dashboard/PortfolioManagerHome.jsx`
- `apps/platform/src/pages/dashboard/ProgrammeManagerHome.jsx`
- `apps/platform/src/pages/dashboard/PmoAdminHome.jsx`
- `apps/platform/src/components/dashboard/__tests__/useDashboardViewerContext.test.js`
- `apps/platform/src/components/dashboard/widgets/__tests__/PmoAdminOverviewWidget.test.jsx`
- `apps/platform/src/components/dashboard/widgets/__tests__/PortfolioProgrammeWidgets.test.jsx`

### Files changed (follow-up session)

- `apps/platform/src/components/dashboard/useDashboardViewerContext.js` — extended (not replaced)
  with `portfolioId`/`programmeId` resolution.
- `apps/platform/src/components/dashboard/widgetRegistry.js` — added
  `PORTFOLIO_MANAGER_HOME_WIDGETS`, `PROGRAMME_MANAGER_HOME_WIDGETS`, `PMO_ADMIN_HOME_WIDGETS`.
- `apps/platform/src/components/dashboard/__tests__/widgetRegistry.test.js` — extended with tests
  for the three new widget lists.
- `apps/platform/src/pages/platform-app/Dashboard.jsx` — rewritten per above.
- `apps/platform/src/routes/lazyImports.js` — added `PortfolioManagerHome`, `ProgrammeManagerHome`.
- `apps/platform/src/routes/platformRoutes.jsx` — added the two new routes.

### Test results (follow-up session)

New: `useDashboardViewerContext.test.js` (5), `PmoAdminOverviewWidget.test.jsx` (4),
`PortfolioProgrammeWidgets.test.jsx` (3), plus 3 new cases added to `widgetRegistry.test.js` — 15
new assertions, Platform only, all passing. Full-suite `npx vitest run` after all follow-up changes
(Phase 5 + Phase 7 combined): Platform 60 pre-existing failing files/232 passed files (within the
61-62 documented baseline, no new failures among touched files); Simulator 62 pre-existing failing
files/225 passed files (at the documented ceiling, no new failures among touched files).

### Remaining known gaps (documented, not silent)

- Dedicated content-parity tests for `PortfolioProjectsWidget`/`ProgrammeProjectsWidget` (only the
  two health widgets got dedicated tests this round — same "representative widget tested, others
  extracted with matching discipline" pattern as the original session's PM Home widgets).
- Manual browser walkthrough (dark/light, mobile) — still not performed, same gap as every phase.
