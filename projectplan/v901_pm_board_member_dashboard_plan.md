# v901 — Project Board Member Dashboard

## Problem

`/pm/dashboard` (Platform) and its Simulator counterpart always rendered the
operational "Project Manager Dashboard" — work packages, daily log, quality
activities — regardless of the signed-in user's actual role on the current
project. A user whose only role on a project is **Project Board Member**
(governance/oversight, `project_roles.role_name = 'project_board_member'`,
per `SQL/v91_role_system_cleanup.sql`) saw the same execution-focused tools
as a PM, which don't match their role.

## Solution

`PMDashboard.jsx` now checks the signed-in user's role(s) for the *current*
project (via `CurrentProjectContext`) and renders a new `PMBoardMemberDashboard`
instead when every role held on that project is governance-only. A user who
is Board Member on one project and PM on another sees the right dashboard on
each, since the check is scoped to `currentProjectId`, not global.

## Todo

- [x] `CurrentProjectContext.jsx` (Platform + Simulator): now also collects
      raw `project_roles.role_name` values per project (`roleKeys`), not just
      the human-readable `roleDisplayName` string — needed a value safe to
      compare for exact-match branching (roleDisplayName merges multiple
      roles with " / ", which is not reliable to test against).
- [x] `packages/shared/src/utils/projectRoleDashboardUtils.js` (new): shared
      `BOARD_ONLY_ROLE_KEYS` set + `isBoardMemberOnlyRole(roleKeys)` pure
      helper, single source of truth for both apps.
- [x] `PMBoardMemberDashboard.jsx` (new, Platform + Simulator, styled to each
      app's existing card convention — Platform's already uses the shared
      `DashboardStatCard`, Simulator's still hand-rolls `<Link>` cards, so the
      new page matches whichever pattern its own app already had rather than
      introducing an inconsistent partial refactor):
      - Stat cards: **Decisions Pending** (`getPendingDecisions()` —
        `highlight_report_decisions` status pending/acknowledged), **Reports
        Awaiting Review** (`highlight_reports.approval_workflow_status IN
        (submitted, distributed)`), **Open Exceptions** (`exceptions.status
        IN (OPEN, ESCALATED, UNDER_REVIEW)`), **Open Risks**, **Open Issues**,
        **Active Work Packages** (visibility only, board doesn't manage them).
      - Quick actions: Highlight Reports, Exception Reports, Risk Register,
        Issue Register, Business Case, PID — all read/oversight surfaces.
        Deliberately excludes Daily Log / Work Packages / Checkpoint Reports
        management actions (PM's operational tools, not the board's).
      - Reuses Upcoming Deadlines / Governance Reference / Initiation
        Documents sections from the PM dashboard — relevant to both roles.
- [x] `PMDashboard.jsx` (Platform + Simulator): computes
      `isBoardMemberOnlyRole(currentProject?.roleKeys)`; when true, skips its
      own operational data fetch entirely (no wasted queries) and renders
      `<PMBoardMemberDashboard />` instead of its own JSX.
- [x] Unit test: `projectRoleDashboardUtils.test.js` (5 cases) — covers no
      roles, board-only, operational-only, and the mixed-role case (board +
      an operational role still gets the operational dashboard).
- [ ] Manual verification: confirm in a running dev server that a
      Project-Board-Member-only user now sees the new dashboard, and that a
      user with an additional operational role still sees the original one.

## Out of scope

- An "Approvals Pending" card sourced from `recordLifecycleService.getAuthorisationQueue`
  — that queue is user-scoped and spans every governed table account-wide,
  not cleanly project-scoped, so it was left out rather than force-fit.

## v902 follow-up — two real bugs found from live testing

1. **Missing local-duplicate files broke the build.** `apps/platform/vite.config.js`
   / `apps/simulator/vite.config.js` alias `@nidus/shared/utils` (and `/hooks`,
   `/context`, `/constants`, plus `@nidus/ui`) to each app's own local folder,
   not to `packages/shared`/`packages/ui` — a repo convention documented in
   v894's plan but missed here initially. `projectRoleDashboardUtils.js` only
   existed in the canonical `packages/shared` location, so
   `@nidus/shared/utils/projectRoleDashboardUtils` failed to resolve at
   runtime. Fixed by creating the local duplicates in both apps. Same gap
   caught and fixed for the unrelated `invitationInviteeFormat.js` priority
   fix from the same session (its local duplicates were never actually synced,
   so that specific fix had never taken effect at runtime either — the
   `full_name` display issue was fully resolved by the separate SQL fix
   instead).
2. **Governance-role scope was too narrow.** Live testing surfaced a second
   role, **Project Sponsor/Executive** (`project_roles.role_name =
   'project_sponsor'`, role_level 11, permissions `strategic.approve` /
   `budget.approve` / `reports.view` — no delivery-execution permissions,
   same shape as `project_board_member`), still landing on the operational
   dashboard. `BOARD_ONLY_ROLE_KEYS`/`isBoardMemberOnlyRole` renamed to
   `GOVERNANCE_ONLY_ROLE_KEYS`/`isGovernanceOnlyRole` and extended to include
   `project_sponsor`. The dashboard's `<h1>` is now built from
   `currentProject.roleDisplayName` (`"${roleDisplayName} Dashboard"`)
   instead of a hardcoded "Project Board Member Dashboard" string, so it
   correctly reads "Project Sponsor/Executive Dashboard" for that role without
   per-role hardcoding. Other project roles checked against the v91 seed's
   permission sets (Programme Manager, Project Assurance, Change Authority,
   etc.) were deliberately left on the operational dashboard — each carries
   at least one delivery/execution permission, unlike these two pure-oversight
   roles.
3. Tests updated: `projectRoleDashboardUtils.test.js` renamed/extended (7
   cases, was 5). Full `packages/shared` suite: 58 files / 505 tests passing.
