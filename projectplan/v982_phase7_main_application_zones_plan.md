# v982 Implementation Plan — Phase 7: Main Application Zones

Implements Phase 7 of `projectprd/v982_saas_user_journey_account_pmo_delivery_PRD.md` (brief
§21) — My Work / Delivery / Organisation / Account top-level navigation restructure. This is the
outermost layer of the whole PRD: it sits on top of everything Phases 1-6 build underneath it, and
should be planned last and implemented last, once those phases have proven their pieces
individually (a role-aware dashboard framework, a workspace switcher, a scoped authority model, a
fuller PMO configuration zone). Attempting Phase 7 before those exist would mean restructuring
navigation around capabilities that don't exist yet.

## Facts established during investigation (grounds every task below)

- **The real production nav tree is `apps/platform/src/components/Sidebar.jsx`**, driven by
  `useMenu()` (`@nidus/shared/hooks/useMenu`) and the industry-pack/role-filtered menu config.
  `apps/platform/src/components/pmo/PMOSidebar.jsx` (reading `@nidus/config/pmoMenuConfig`)
  appears to be a legacy/unused alternate implementation — **confirm it's genuinely dead before
  Phase 7 touches anything**, since this repo has a known history of dead shadow-copy files (see
  memory: `pmoMenuHierarchyUtils` dead shadow copy, `apps/simulator/src/routes/
  platformRoutes.jsx` dead route tree) causing wasted effort when treated as live.
- **Account/Settings currently live outside the main sidebar tree entirely** — in
  `SystemHeader.jsx`'s "User Profile Menu" dropdown (`SystemHeader.jsx:512-583`: Profile /
  Settings / PWA Settings / Sign Out). This is a real architectural decision Phase 7 must make
  explicitly, not just execute: does "Account" become a sidebar zone (absorbing what's currently
  in the header dropdown), or does the header dropdown remain and only "My Work / Delivery /
  Organisation" become sidebar zones with "Account" staying header-level? See decision 1.
- This phase directly touches `pmoMenuHierarchyUtils.js` and the sidebar-cache-version pipeline
  that has already caused real, confirmed regressions this session (the PM→PMO cross-layout leak
  bug, the shared "Core Project Management" label ambiguity) — the harness-verification discipline
  established during that work (before/after comparison against live data, full test suite,
  explicit `SIDEBAR_CACHE_VERSION` bump with a dated changelog comment) is not optional process
  ceremony for this phase, it's the specific safeguard that already caught two real bugs in this
  exact code path.

## Decisions — accepted by default per user authorization

None touch authorization; all are UI/IA calls proceeded on directly per the coordinator's explicit
instruction.

1. **Account stays in the header dropdown** (`SystemHeader.jsx`'s "User Profile Menu"), not a 4th
   sidebar zone. Implemented exactly as recommended — `ZoneTabs.jsx` renders exactly 3 tabs,
   tested explicitly (`ZoneTabs.test.jsx`: "never renders a 4th Account tab").
2. **Zones are mutually exclusive tabs** a user switches between, generalizing today's PM-layout
   vs PMO-layout distinction into three. Implemented exactly as recommended — and, per the
   investigation below, this distinction turned out to be even more directly reusable than the
   plan anticipated (see "A finding that simplified the implementation" below).
3. **Today's rationalised Core PM taxonomy becomes the Delivery zone's content largely as-is; My
   Work is new, narrower content; Organisation absorbs `pmo-admin/*` + Phase 2's configuration
   zone + Phase 3's portfolio/programme management.** Implemented exactly as recommended.

## Todo list

### A. Investigation-first tasks (confirm before any code change)
- [x] `PMOSidebar.jsx`/`SimulatorPMOSidebar.jsx`/`pmoMenuConfig.js`/`simulatorPMOMenuConfig.js`
  confirmed genuinely dead in both apps — zero `<PMOSidebar`/`<SimulatorPMOSidebar` usages
  anywhere outside their own recursive self-reference, and `menuRegistry.js` (which IS live —
  imported by `useMenu.js`) carries its own explicit `@deprecated-runtime pmoMenuConfig.js,
  pmDashboardMenuConfig.js — registry only after v638` comment, confirming this in the codebase's
  own words. Not touched/deleted (out of scope — a separate cleanup task, not requested).
- [x] Full route-to-zone mapping table — see the Review section below.

### B. Backend/config — DELIBERATELY NOT TOUCHED, see "A finding that simplified the implementation"
- [x] `packages/config/src/pmoSidebarCategories.js` — **not extended**. Investigation found
  `reorganizeMenuRoots(roots, layout)` (`pmoMenuHierarchyUtils.js:1248`) already takes a `layout`
  parameter indexing `LAYOUT_CONFIG` (`'pmo' | 'pm' | 'tm' | 'sim_pmo' | 'sim_pm'`) — today's PM-
  layout-vs-PMO-layout split (decision 2's own reuse target) already IS this parameter, just not
  exposed as an explicit tab. "Delivery" and "Organisation" map 1:1 onto the existing `'pm'`/`'tm'`
  and `'pmo'` layouts with zero new category-def work.
- [x] `reorganizeMenuRoots()`/`groupMenuTreeByIndustryPack()` — **not touched**. See below for the
  full reasoning; this is the single most consequential implementation decision this phase made.

### C. Frontend
- [x] `Sidebar.jsx` restructure — added a `ZoneTabs` bar (3 tabs: My Work / Delivery /
  Organisation) rendered above the existing menu tree, purely derived from `location.pathname` +
  the already-resolved `layoutHint.layout` (no new state). Clicking a tab navigates to that zone's
  landing route; `useMenu()`'s own existing pathname-based layout inference then resolves the
  correct layout automatically, exactly as it already does today for direct navigation.
- [x] "My Work" zone content — `MyWorkHome.jsx` (new, both apps): every project the signed-in user
  has an active role on, de-duped, with role label(s), linking into that project's Delivery-zone
  dashboard. **Follow-up session**: extended with an "Assigned to You" section covering open
  risks/assumptions/issues/dependencies via the `raid_log` view — governance actions and task
  assignments remain documented gaps (no cross-project query exists for either yet), see
  "Follow-up completion" below.
- [x] `SIDEBAR_CACHE_VERSION` bumped in both apps' `menuCacheUtils.js` (Platform 65→66, Simulator
  56→57) with dated changelog comments, done last, after full verification — explicitly a
  defensive bump (this phase's change doesn't alter the cached data shape at all, see below), kept
  per the codebase's own established convention of bumping for any Sidebar.jsx-rendering change.

### D. Tests
- [x] Harness verification, adapted to what actually changed: since `pmoMenuHierarchyUtils.js` was
  not modified, there is no per-role menu-CONTENT before/after diff to produce — the content is
  byte-identical by construction. What was verified instead: the existing
  `pmoMenuHierarchyUtils.test.js` suite (36/36) and `useMenu.test.js` both pass unchanged, proving
  zero regression to the exact code path with a documented history of real bugs. New
  `ZoneTabs.test.jsx` (10 tests) proves zone selection is a pure, data-driven function of
  route+layout, the same "not eyeballed" discipline Phase 5 applied to widget selection.
- [x] Full `npx vitest run` — see Review section. `pmoMenuHierarchyUtils.test.js` unaffected
  (36/36, unchanged file). One pre-existing failure (`useMenuMethodology.test.js`, 2 tests) traced
  to already-uncommitted, pre-session WIP in `useMenu.js` (confirmed via `git diff`, not something
  this phase touched or introduced) — part of the same pre-existing baseline every prior phase in
  this session has documented.

### E. Verification
- [ ] Manual walkthrough of all three zones across multiple roles. **Not performed** — no dev
  server/browser session or live database this session, same class of gap as every prior phase.
- [x] REVIEW.md applicable checks — see Review section, extra scrutiny applied given this phase's
  history.

## Review section

**Status: Phase 7 is now complete to the extent practical in one initiative** — the zone-switching
mechanism, Delivery zone, and Organisation zone were complete and low-risk from the original
session; a follow-up session (documented in "Follow-up completion" below) resolved all three
previously-deferred items: My Work's cross-record "assigned to you" content (scoped to what's
cheaply queryable today — RAID items; governance actions and tasks remain documented gaps, not a
retroactive claim of full coverage), Simulator's `practice-projects/*` zone mapping, and the
Organisation-zone category-quality polish. Given this phase's explicit regression history, the
review below leads with the single most important design decision before anything else.

### A finding that simplified the implementation (read this first)

Investigation (task A) found that `reorganizeMenuRoots(roots, layout)` and the surrounding
`pmoMenuHierarchyUtils.js` machinery **already generalize cleanly across layouts via a string
key** (`LAYOUT_CONFIG['pmo' | 'pm' | 'tm' | 'sim_pmo' | 'sim_pm']`), and that `useMenu()`'s own
`resolveMenuLayoutScope(layoutPreference, pathname, roleNames)` already resolves which layout to
render **from the current route**, not from any hardcoded binary switch. In other words: today's
"PM-layout vs PMO-layout" distinction (decision 2's explicit generalization target) is not a
special-cased pair of code paths that needs to be widened into three — it is already a
data-driven, parameterized mechanism that a third value would fit into structurally identically to
the existing two.

Given that, and given this exact file has TWO confirmed real regressions this session already
(the PM/PMO cross-layout leak bug, the shared-label ambiguity bug) — both only ever caught via
live-data harness verification this session does not have access to (no dev server, no DB
connection, confirmed unavailable in every phase's own Review section) — the safest and most
correct implementation was judged to be: **build "Delivery" and "Organisation" as pure navigation
onto the EXISTING, already-tested `'pm'` and `'pmo'` layouts, and touch zero lines of
`reorganizeMenuRoots()`/`groupMenuTreeByIndustryPack()`/`pmoSidebarCategories.js`.** A `ZoneTabs`
bar renders above the existing sidebar tree; clicking a tab is pure `navigate()` to that zone's
landing route; the existing pathname-based layout inference does the rest, exactly as it already
does today for any direct navigation or deep link. This is not a scope cut — it is a *more*
conservative interpretation of decision 2's own "generalize the existing PM/PMO distinction"
framing than a rewrite would have been, and it means this phase's harness verification could
legitimately consist of "confirm the untouched file's existing test suite still passes" rather
than needing to construct a new live-data before/after comparison this session has no way to run
safely. This is flagged prominently, not buried, because it is a genuine judgment call the
plan's own task B wording didn't anticipate — but it does not make any of the three accepted
decisions look wrong; if anything it fulfills decision 2 more literally (reusing the existing
distinction, not building a parallel one).

### Full route-to-zone mapping table (task A deliverable)

| Route prefix | Current content | Zone |
|---|---|---|
| `/pm/*` (dashboard, delivery, controls, governance, initiation, reporting, team-members, profile, industry-templates, portfolio-manager/programme-manager assignments) | Today's rationalised Core PM taxonomy (v966 work) | **Delivery** |
| `/platform/dashboard` (PMO Executive Summary / `ExecutiveSummary.jsx` + `PMODashboardScopeTabs.jsx`) | Org-wide portfolios/programmes/projects/tasks/teams roll-up | **Organisation** (except: an `account_type='individual'` viewer is routed to `FreelancerHome` here instead, per Phase 5 — a pre-existing, deliberate carve-out this phase did not change) |
| `/platform/portfolio*`, `/platform/programme*` (incl. Phase 3's `:id/members` pages) | Portfolio/Programme management | **Organisation** (per decision 3's explicit instruction) |
| `/platform/pmo-admin/*` (pre-existing reference-data pages + Phase 2's `configuration`/`project-classifications`/`authorities`/`approval-chains`/`roles-responsibilities` + Phase 6's `capability-profile`) | PMO configuration zone | **Organisation** |
| `/platform/admin/*` (`manage-roles`, `manage-menu-bundles`, `organisation-industries`, `send-role-invites`, etc.) | Organisation-wide admin | **Organisation** |
| `/pmo/*` (governance, mandates, forms, process-templates, testing-centre, field-templates, template-library) | PMO governance/template authoring | **Organisation** |
| `/platform/my-work` (new, this phase) | Cross-project "your work" landing | **My Work** |
| `/platform/subscription`, `/platform/profile`, `/platform/settings`, sign-out | Account-level actions | **Account** (header dropdown, decision 1 — NOT a sidebar zone) |
| Phase 4's workspace switcher (header) | Multi-org switching | Orthogonal to zones — stays header-level, same tier as Account |
| `/onboarding/*`, `/auth/*`, `/login`, `/register` | Pre-authentication / setup | Outside the zone model entirely (`Sidebar.jsx` already returns `null` on these routes) |
| **Simulator**: `/simulator/pm/*` | Mirror of `/pm/*` | **Delivery** |
| **Simulator**: `/simulator/pmo/*` | Mirror of `/platform/pmo-admin/*` + `/pmo/*` + `/platform/dashboard` | **Organisation** |
| **Simulator**: `/simulator/my-work` (new, this phase) | Mirror of `/platform/my-work` | **My Work** |
| **Simulator**: `/simulator/practice-projects/*` | Scenario/training practice-project play — confirmed LIVE (extensive routing in `simulatorRoutes.jsx`: scope/schedule/industry-plan sub-areas; `simulator/scenarios` redirects here), not a dead shadow copy | **Delivery** (follow-up session — mirrors how Platform's real project routes map to Delivery; see "Follow-up completion" below) |

### What's complete vs. deferred, and why

**Complete, fully correct, harness-verified:**
- The zone-switching mechanism itself (`ZoneTabs.jsx` + its two pure, tested functions).
- The **Delivery** zone (`'pm'`/`'tm'` layout, reused unchanged).
- The **Organisation** zone (`'pmo'` layout, reused unchanged — already includes every Phase 2/3/6
  addition, since those phases wired their own menu items into the existing `'pmo'` layout at the
  time they were built, not into anything Phase 7 needed to newly connect).
- Account-stays-in-header (decision 1) — no change needed, already true; verified by the explicit
  "never renders a 4th Account tab" test.

**Resolved in a follow-up session — see "Follow-up completion" below for full detail:**
1. **My Work's fuller content** — partially extended (RAID items via the `raid_log` view now
   covered; governance actions and task assignments remain genuine gaps, documented, not silently
   declared covered).
2. **Simulator's `practice-projects/*` route tree** — confirmed live, mapped to **Delivery**.
3. **Category-quality polish inside the Organisation zone** — 5 registry entries added for Phase
   2's top-level menu codes; see below for where the fix actually needed to land.

### Files created

Platform app:
- `apps/platform/src/components/ZoneTabs.jsx`
- `apps/platform/src/pages/dashboard/MyWorkHome.jsx`
- `apps/platform/src/components/__tests__/ZoneTabs.test.jsx`
- `apps/platform/src/pages/dashboard/__tests__/MyWorkHome.test.jsx`

Simulator app (mirrors of the above, route paths adjusted per the established pattern):
- `apps/simulator/src/components/ZoneTabs.jsx`
- `apps/simulator/src/pages/dashboard/MyWorkHome.jsx`
- `apps/simulator/src/components/__tests__/ZoneTabs.test.jsx`
- `apps/simulator/src/pages/dashboard/__tests__/MyWorkHome.test.jsx`

No SQL this phase (frontend/config, confirmed — ground rule 2).

### Files changed

- `apps/platform/src/components/Sidebar.jsx` / `apps/simulator/src/components/Sidebar.jsx`
  (confirmed byte-identical pre-edit, edited identically) — mounted `<ZoneTabs>` above the
  existing menu tree; added `activeZone`/`handleZoneSelect`, both purely derived, no new state.
- `apps/platform/src/routes/lazyImports.js` + `platformRoutes.jsx` — `my-work` route
  (`/platform/my-work`).
- `apps/simulator/src/routes/lazyImports.js` + `simulatorRoutes.jsx` — `simulator/my-work` route.
- `apps/platform/src/utils/menuCacheUtils.js` (65→66) / `apps/simulator/src/utils/
  menuCacheUtils.js` (56→57) — version bump + dated changelog, done last.
  `packages/shared/src/utils/menuCacheUtils.js` (currently at v49, already 16+ versions behind
  both live app-local copies — confirmed stale/non-live per this session's established shadow-copy
  pattern) was deliberately NOT bumped, to avoid implying it's part of the live cache-invalidation
  path when it isn't.

### Test results

New tests: 14 assertions per app (10 `ZoneTabs.test.jsx` + 4 `MyWorkHome.test.jsx`), 28 total —
all passing, verified with targeted runs before the full-suite run. Existing suites specifically
re-verified as unaffected: `pmoMenuHierarchyUtils.test.js` (36/36), `menuCacheUtils.test.js`
(3/3, both apps, re-run after the version bump specifically).

Full-suite `npx vitest run`:
- Platform: 228 files / 1520 tests passed, 61 files / 182 tests failed.
- Simulator: 224 files / 1418 tests passed, 62 files / 101 tests failed.

**Exact match to Phase 6's own recorded baseline** on the failing side (61/182 Platform, 62/101
Simulator — unchanged across all 7 phases this session) — passing counts up by exactly +2 files/
+14 tests in each app. One failure inside that unchanged baseline
(`useMenuMethodology.test.js`, 2 tests) was specifically traced via `git diff` to already-
uncommitted, pre-session WIP changes to `useMenu.js` (not touched by this phase, or any phase this
session) — confirmed pre-existing, not a regression this phase introduced.

**Follow-up session re-run** (after My Work extension + `ZoneTabs` practice-projects mapping +
`menuRegistry.js` polish, combined with Phase 5's follow-up in the same pass): Platform 60 failing
files/232 passing files (within the 61-62 documented baseline — one previously-failing file's count
shifted by the ambient `useMenuMethodology.test.js` pre-existing WIP noted above, not a new
regression); Simulator 62 failing files/225 passing files (at the documented ceiling). None of the
follow-up's touched/created files (`MyWorkHome.jsx`, `myWorkService.js`, `ZoneTabs.jsx`,
`menuRegistry.js`, `pmoMenuHierarchyUtils.test.js`) appear in either failing list — confirmed by
name-matching the full failing-file list, and by a dedicated `packages/config` suite run (101/101
passing, including `menuRegistry.test.js` and `pmoMenuHierarchyUtils.test.js`).

### Manual verification not performed

No dev server, browser session, or live database this session — consistent with every prior
phase. Recommend, given this phase's regression history specifically: a manual walkthrough
switching between all three zones for at least an Account Owner, a PMO Admin, and a Project
Manager test user, confirming (a) the correct tab highlights on direct navigation to each zone's
existing routes, (b) clicking each tab lands on the right layout with the full expected menu tree
(not a shortened/leaked one), (c) dark + light mode, (d) mobile viewport (the `ZoneTabs` bar's
`flex-1` buttons should remain tappable at narrow widths — not manually verified in-browser this
session).

### Nothing flagged as needing a further product/security decision

The three pre-resolved decisions covered the shape of this phase; the one thing genuinely not
anticipated by the plan (Simulator's `practice-projects/*` zone placement) is documented above as
deferred rather than guessed at, per the coordinator's own instruction to flag rather than push
through when the mapping table surfaces something the plan didn't anticipate.

---

## Follow-up completion (My Work fuller vision, Simulator practice-projects mapping, category polish)

**Status: all three deferred items addressed** — item 1 to the extent cheaply queryable in
aggregate today (documented scope, not silently declared 100%), items 2 and 3 fully resolved.

### 1. My Work's fuller vision — partially extended, scope documented

Extended `MyWorkHome.jsx` (both apps) with a new "Assigned to You" section, built on the
pre-existing `raid_log` SQL VIEW (`SQL/v26_risk_management.sql`) — a `UNION ALL` across
risks/assumptions/issues/dependencies_register already sharing common `owner_user_id`, `raid_type`,
`status`, `title` columns. New `services/myWorkService.js` (both apps) queries this view filtered
by the viewer's own `owner_user_id`, then client-side filters to each record type's own "open"
status vocabulary (risk: identified/assessed/mitigated/monitored; issue: new/assigned/in_progress/
reopened; assumption: unvalidated/validated; dependency: identified/in_progress/at_risk — these
differ per type, so a single `status != 'closed'` filter would not have been correct).

**What's covered**: risks, assumptions, issues, dependencies assigned to the viewer, across every
project, in one aggregate query — this was cheap because `raid_log` already unifies the four
record types with a common owner column; no new SQL was needed.

**What's still NOT covered** (documented, not silently declared done): governance actions
(`getGovernanceActions()` is project-scoped only — no cross-project "assigned to me" query exists
for these yet) and task assignments (no unified "my tasks across every project" view/query was
found anywhere in the codebase). A follow-up wanting these would need to either build a new
cross-project view (governance actions) or determine whether a unified task-assignment concept
exists at all before querying it (tasks) — both are new work, not extensions of something already
half-built.

### 2. Simulator's `practice-projects/*` route tree — confirmed live, mapped to Delivery

Investigated before mapping anywhere, per the coordinator's own instruction not to assume. Grepped
`apps/simulator/src/routes/simulatorRoutes.jsx` and found extensive, actively-registered routing
under `simulator/practice-projects/*` (scope, schedule, industry-plan sub-areas), plus
`simulator/scenarios` redirecting into it — this is a large, live route tree, not a dead shadow
copy (unlike some other Simulator files found earlier in this initiative).

Mapped to **Delivery**, mirroring how Platform's real project routes (`/pm/*`) map to Delivery —
practice-project play is Simulator's equivalent of "doing project work," just against training
data instead of `public.projects`. Implemented as a targeted, additive pathname check directly in
`ZoneTabs.jsx`'s own `resolveActiveZone()` function: `/^\/simulator\/practice-projects(\/|$)/` →
`'delivery'`, checked before the layout-based branches, since `inferLayoutScopeFromPathname()` (in
`menuLayoutUtils.js`) has no explicit branch for this path and would otherwise fall through to an
ambiguous role-based default. Deliberately did NOT touch `menuLayoutUtils.js` or
`pmoMenuHierarchyUtils.js` — both are the historically regression-prone files this whole initiative
has repeatedly flagged extra caution around; `ZoneTabs.jsx`'s own resolver was a safe, isolated
extension point instead.

### 3. Organisation-zone category-quality polish — light pass, correct file identified

Investigated the safest extension point rather than editing `inferPlatformCategoryId()`'s long
regex chain: `pmoMenuHierarchyUtils.js` builds a `REGISTRY_PLATFORM` map from `MENU_REGISTRY` (in
`menuRegistry.js`) and checks it before falling through to the regex heuristics — an explicit,
additive registry entry is a safer way to fix one category than touching shared regex logic used
by every other orphan leaf.

Added 5 entries to `MENU_REGISTRY` for Phase 2's top-level menu codes (`pmo_configuration_home`,
`pmo_project_classifications`, `pmo_organisation_authorities`, `pmo_approval_chains`,
`pmo_roles_responsibilities`), each `category: 'pmo-cat-admin'` (matching the existing
`pmo_admin_project_statuses` entry's category, the closest existing analogue), `domain: 'platform'`
(these are Platform-only routes under `/platform/pmo-admin/*` — no Simulator-domain entries were
added since Simulator has no equivalent routes for these specific menu codes).

**Important correction made mid-task**: this repo has a documented shadow-copy trap (`packages/
config/src/pmoMenuHierarchyUtils.js` is the live hierarchy file; the app-local
`apps/*/src/config/pmoMenuHierarchyUtils.js` copies are dead — see this project's own persisted
memory note). The same trap applies to `menuRegistry.js` specifically: `packages/config/src/
menuRegistry.js` is genuinely divergent content (not just a line-ending difference) from the
app-local copies, and import-chain tracing confirmed the live `packages/config/src/
pmoMenuHierarchyUtils.js` imports `MENU_REGISTRY` from its own local `./menuRegistry` — i.e.
`packages/config/src/menuRegistry.js` — not the app-local files. `apps/platform/src/config/
menuRegistryUtils.js` and `apps/platform/src/config/pmoMenuHierarchyUtils.js` also import their own
app-local `menuRegistry.js`, but both of those consumers are themselves confirmed-dead shadow
copies (nothing outside their own co-located tests imports them by relative path; the live
`useMenu.js` reaches the registry exclusively via the `@nidus/config` package alias, which
resolves to `packages/config/src/menuRegistryUtils.js` → `packages/config/src/menuRegistry.js`).

**Net effect**: the 5-entry addition was applied to **`packages/config/src/menuRegistry.js`** (the
file that actually matters for category resolution) as well as to the app-local
`apps/platform/src/config/menuRegistry.js` copy (left in place for cross-copy consistency, per this
session's established convention of keeping known shadow-copy trios aligned even when one copy is
inert) — Simulator's app-local copy was left unedited, since the 5 menu codes in question are
Platform-only. Verified via `packages/config`'s own test suite (101/101 passing, including
`menuRegistry.test.js` at 68 tests covering exactly this file) and a duplicate-`menu_code` scan (0
collisions across 196 total entries).

### Files created (follow-up session — combined with Phase 5's follow-up work, deduplicated here to just this phase's own scope)

- `apps/platform/src/services/myWorkService.js`
- `apps/simulator/src/services/myWorkService.js`
- `apps/platform/src/services/__tests__/myWorkService.test.js`
- `apps/simulator/src/services/__tests__/myWorkService.test.js`

### Files changed (follow-up session)

- `apps/platform/src/pages/dashboard/MyWorkHome.jsx` / `apps/simulator/src/pages/dashboard/
  MyWorkHome.jsx` — added the "Assigned to You" RAID section; also dropped an unused `Link` import
  left over from an earlier draft (both apps).
- `apps/platform/src/pages/dashboard/__tests__/MyWorkHome.test.jsx` / `apps/simulator/...` — added
  2 tests for the new section.
- `apps/platform/src/components/ZoneTabs.jsx` / `apps/simulator/src/components/ZoneTabs.jsx`
  (confirmed byte-identical, edited identically) — added the `/simulator/practice-projects/*` →
  `'delivery'` pathname check.
- `apps/platform/src/components/__tests__/ZoneTabs.test.jsx` / `apps/simulator/...` — added 1 test.
- `packages/config/src/menuRegistry.js` — added 5 registry entries (the file that actually matters
  — see investigation above).
- `apps/platform/src/config/menuRegistry.js` — added the same 5 entries, for cross-copy consistency
  with a confirmed-dead consumer chain (documented above, not silently left divergent).

### Test results (follow-up session, this item's own scope)

`myWorkService.test.js` (5 tests/app, 10 total), `MyWorkHome.test.jsx`'s new describe block (2
tests/app, 4 total), `ZoneTabs.test.jsx`'s new test (1/app, 2 total) — 16 new assertions across both
apps, all passing. `packages/config` full suite re-run: 101/101 passing (7 files), including the
68-test `menuRegistry.test.js`/`pmoMenuHierarchyUtils.test.js` pair specifically re-verified after
the registry edit.

### Nothing flagged as needing a further product/security decision

The `menuRegistry.js` shadow-copy investigation was a factual question (which file does the
runtime actually read), resolved by tracing imports rather than guessing — not a product decision.
No new ambiguity was hit in any of the three items.

---

## Closing note — all v982 SQL files across Phases 1-7, in run order

Every SQL file created across this session's full v982 initiative (Phases 1-6 — Phase 7 needed
none). None have been executed against the live database by this session; run them in this exact
order (later files depend on earlier ones within their own phase, per each phase's own Review
section):

**Phase 1:**
1. `SQL/v982_pending_invitation_lookup.sql`

**Phase 2:**
2. `SQL/v983_project_classifications.sql`
3. `SQL/v984_pmo_industry_template_governance.sql`
4. `SQL/v985_pmo_approval_chain_templates.sql`
5. `SQL/v986_organisation_authorities.sql`
6. `SQL/v987_pmo_role_responsibilities_raci.sql`
7. `SQL/v988_phase2_pmo_configuration_menu_items.sql`

**Phase 3:**
8. `SQL/v989_portfolio_programme_account_scoping.sql`
9. `SQL/v990_portfolio_roles_and_memberships.sql`
10. `SQL/v991_programme_roles_and_memberships.sql`
11. `SQL/v992_portfolio_programme_rls_helpers.sql`
12. `SQL/v993_supersede_portfolio_programme_mgr_rls.sql`
13. `SQL/v994_fix_portfolios_programmes_rls_scoping.sql`

**Phase 4:**
14. `SQL/v995_active_workspace_selection.sql`

**Phase 5:** none.

**Phase 6:**
15. `SQL/v996_capability_profiles.sql`
16. `SQL/v997_capability_profile_menu_items_seed.sql` — **review the per-tier table in the Phase 6
    plan file's Review section first**; this is the one file in the whole list whose CONTENT
    (which menu items land in which tier) was explicitly flagged as a draft for product review,
    not a settled engineering decision.

**Phase 7:** none.

**Dependencies to respect**: within Phase 2, run in the listed order (984 needs 983's table;
985 attaches a deferred FK onto 984). Within Phase 3, the order is strict end to end (992 needs
both 990 and 991; 993 and 994 both need 992; 993 additionally needs 990/991's seeded roles).
Phase 6's v997 needs v996's tier rows to exist. No file in any later phase has a hard dependency on
an earlier phase's SQL (each phase's schema is additive and independent), so phases could in
principle be run out of order relative to each other — but running them in Phase 1→7 order, as
listed above, is simplest and matches how they were designed and tested.
