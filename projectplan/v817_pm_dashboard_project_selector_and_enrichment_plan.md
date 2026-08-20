# v817 — PM Dashboard: Current-Project Selector + Real Stats

## Goal
"Enrich" `/pm/dashboard` per user request. Investigation (Explore agent) found the real
blocker isn't just missing stat data — the entire `/pm/*` area has **no "current project"
concept**: `usePlatformProjectId()` only resolves from a route path param, but none of the
`/pm/*` routes carry one. Today, Open Risks (16)/Open Issues (10) silently aggregate across
**every** project the RLS policy lets the user see (not "this project"), and every Quick
Action link (Work Packages, Quality Register, Checkpoint Reports, Lessons Log) lands on a
page that renders blank because it can't resolve a project. User confirmed via clarifying
question: fix this properly with a project selector, not just patch the counts.

## Research (Explore agent findings, verified)
- `work_packages` (`project_id`, `status`, `is_deleted`) — "active" = `in_progress` (or
  `['authorized','accepted','in_progress']`). Pattern: `controllingStageService.js:10-19`.
- Quality: `quality_activities_view` (unified read view over `quality_register`/
  `quality_reviews`/`quality_inspections`), fetched via `getQualityActivities(projectId)`
  (`qualityManagementService.js:651`).
- `checkpoint_reports` (`project_id`, `work_package_id`, `status`: draft/submitted/approved).
  "Pending" = not yet `approved`. `checkpointReportService.js` has `getCheckpointReportsByProject`.
- Lessons: `lessons_learned` (`project_id`, `status`, `is_deleted`), `lessonService.js:14`
  (`getLessonsByProject`).
- `risks`/`issues` both have `project_id` (confirmed: `riskService.js:21`) — PMDashboard's
  current queries just never filter on it.
- `project_milestones` (`project_id`, `milestone_date`, `is_deleted`) via
  `fetchProjectMilestones()` (`ganttService.js:444`) — good source for an "Upcoming
  Deadlines" widget, a standard PM-dashboard element not present today.
- `getUserProjectRoles(authUserId)` (`roleService.js:348`, already used for the header's
  "My Roles" badge this session) already returns exactly the project list + role needed to
  populate a selector: `{ project_id, projects: { project_name, project_code }, ... }`.
- `usePlatformProjectId()` (`packages/shared/src/hooks/usePlatformProjectId.js`) is used by
  114 files, all via route path params (`/platform/projects/:projectId/...`). Adding a
  **fallback** to a query-string `?projectId=` (only when no path param exists at all) is
  additive and can't change behaviour for any existing caller.
- `ProgrammeDashboard.jsx` (lines 77-140) already has a clean RAG-status stat-card pattern
  worth mirroring here rather than inventing a new visual language.

## Design decisions
1. **New `CurrentProjectContext`** (`packages/shared/src/context/CurrentProjectContext.jsx`):
   loads the PM's project list via `getUserProjectRoles` once, restores the last-selected
   project id from `localStorage` (per-user key) if still in the list, else defaults to the
   first project. Exposes `{ currentProjectId, currentProjectName, projects, setCurrentProject, loading }`.
2. **Selector lives in `PMLayout`**, not just the dashboard — a compact dropdown in the header
   area, visible on every `/pm/*` page, so switching project also fixes navigation deeper into
   the area (Risk Register, etc.), not just the dashboard's own stat cards.
3. **`usePlatformProjectId()` gets one additive fallback**: when there's no `params.projectId`
   and no `params.id`, check `useSearchParams().get('projectId')` before falling back to the
   `CurrentProjectContext` value. Path param still wins when present (zero behaviour change for
   the 114 existing callers on project-scoped routes).
4. **PMDashboard**: all 6 stat queries scoped by `.eq('project_id', currentProjectId)`
   (fixes the two that already existed silently aggregating, plus wires the 4 that were
   hardcoded `0`). Quick Action `Link`s append `?projectId=${currentProjectId}`. Cards render
   a "Select a project" empty state when `currentProjectId` is null (e.g. brand-new PM with no
   project memberships yet) instead of querying with a null id.
5. **New "Upcoming Deadlines" widget**: next 5 non-deleted `project_milestones` for the current
   project ordered by `milestone_date`, mirroring the existing Governance Reference / Initiation
   Documents card styling — the one net-new "best practice" addition beyond fixing what's broken,
   kept small and scoped rather than adding multiple new widgets at once.
6. **Simulator parity (rule 34.1)**: same pattern against `sim` schema — needs its own quick
   table-name check (`practice_risks`/`practice_issues`/`practice_work_packages` etc., following
   the `practice_*` naming convention already confirmed elsewhere this session) before mirroring.

## Explicitly out of scope
- RAG/health-score visual treatment (ProgrammeDashboard's pattern) — noted as a good future
  addition, not bundled into this pass to keep the change reviewable.
- Fixing `PMControlsQualityRegister.jsx` (mounts `QualityRegister` with no props) and
  `CheckpointReportList.jsx` (keyed on the wrong param) beyond what the new `?projectId=`
  fallback naturally fixes — if either still doesn't render correctly after the hook fix, that's
  a follow-up, not blocking this plan.
- Any change to Admin app.

## Todo
- [x] `CurrentProjectContext` + provider (Platform)
- [x] `usePlatformProjectId()` search-param fallback (shared, both apps read same file)
- [x] Project selector UI in `PMLayout.jsx` (Platform)
- [x] `PMDashboard.jsx`: scope existing 2 stats + wire 4 missing stats + Quick Action links (Platform)
- [x] Upcoming Deadlines widget (Platform)
- [x] Simulator parity (table-name check confirmed no divergence needed — see Review)
- [ ] Manual verification in browser (no automated test harness for this page today — left for user)

## Review

**Status: code complete, pending browser verification.**

**Simulator table-name check (decision 6) — result: no divergence needed.** Simulator's
`services/supabaseClient.js` exports `supabase = platformDb` (confirmed via
`packages/supabase/src/index.js:115`) — i.e. the `/pm/*` area in Simulator already queries the
same **public-schema** tables as Platform (`risks`, `issues`, `work_packages`,
`quality_activities_view`, `checkpoint_reports`, `lessons_learned`, `project_milestones`), not
`sim`-schema `practice_*` tables. Simulator's pre-existing `PMDashboard.jsx` and `PMLayout.jsx`
were already byte-identical to Platform's pre-change originals, confirming this is a genuinely
shared, non-simulation "PM Dashboard" surface in both apps. All new files were copied verbatim
rather than adapted — verified byte-identical across every touched file.

**What shipped:**
- `packages/shared/src/utils/currentProjectStorage.js` (new) — the single localStorage key
  (`nidus_pm_current_project_id`) both the context and the shared hook agree on.
- `packages/shared/src/hooks/usePlatformProjectId.js` — additive 3-step fallback chain (path
  param → `?projectId=` query param → PM area's last-selected project via localStorage). Zero
  behaviour change for its 114 existing callers, all of which have a real path param.
- `apps/{platform,simulator}/src/context/CurrentProjectContext.jsx` (new) — loads the PM's
  project list via the existing `getUserProjectRoles`, restores/persists the selection.
- `apps/{platform,simulator}/src/components/pm/PMProjectSelector.jsx` (new) — the header
  dropdown, mounted inside `PMLayout.jsx`'s `<main>` (not between header and the flex row —
  `Sidebar` is `fixed top-14/16`, independent of document flow, so it had to go inside the
  already-correctly-offset `<main>` rather than as a sibling row).
- `apps/{platform,simulator}/src/pages/pm/PMDashboard.jsx` — all 6 stat cards now scoped by
  `project_id` (fixes 2 that were silently aggregating across every visible project) and the
  4 that were hardcoded `0` (Active Work Packages, Quality Activities, Pending Reports, Lessons
  Logged) now wired to real tables; Quick Action + reference-doc links carry `?projectId=`;
  new "Upcoming Deadlines" widget (next 5 milestones via existing `fetchProjectMilestones`);
  empty state when the PM has no project memberships yet.

**Verified:** all new/edited files pass an esbuild syntax check; `diff` confirms every
Platform/Simulator pair is byte-identical.

**Explicitly left as pre-existing, unaddressed gaps** (per plan's "out of scope" section):
`PMControlsQualityRegister.jsx` (mounts `QualityRegister` with no props) and
`CheckpointReportList.jsx` (keyed on a route param that still doesn't exist) may still not
render correctly even with `projectId` now resolvable — the `?projectId=` fallback fixes
*resolution*, not those two pages' own prop-wiring bugs. Worth a fast follow-up if noticed
during manual testing.

**Post-review fix:** `apps/{platform,simulator}/vite.config.js` alias `@nidus/shared/utils`,
`@nidus/shared/hooks`, and `@nidus/shared/context` **directly to each app's own local folder**
(`src/utils`, `src/hooks`, `src/context`), bypassing `packages/shared` entirely for those three
subpaths. `currentProjectStorage.js` had only been created in `packages/shared/src/utils/`, and
the `usePlatformProjectId()` fallback-chain edit had only been made in
`packages/shared/src/hooks/` — neither ever reached the code the running app actually serves,
causing a resolve error then a 500. Fixed by shadow-copying both into
`apps/{platform,simulator}/src/{utils,hooks}/`, matching the convention every other file in this
plan already followed correctly.

**Left for the user:** exercise `/pm/dashboard` in the browser — pick a project in the new
selector, confirm the 6 stat cards show real (non-zero, project-scoped) numbers, confirm Quick
Actions land on populated (not blank) pages, and confirm the Upcoming Deadlines widget shows
real milestones. No automated test harness covers this page today.
