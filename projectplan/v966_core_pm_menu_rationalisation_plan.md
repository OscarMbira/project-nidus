# v966 — Core PM Menu Rationalisation — Implementation Plan

See `projectprd/v966_core_pm_menu_rationalisation_PRD.md` for the problem statement, user
stories, and the interview decisions this plan implements. See
`projectplan/v966_core_pm_menu_rationalisation_mapping_audit.md` (first-pass, `plat_sec_*` only)
and `projectplan/v966_full_three_layout_menu_audit.md` (complete, all 333 root-level menu_items
rows across Platform/PMO/PM) for the audits this plan is built from.

**Ready to implement — audits complete, all decisions resolved.** The complete audit's headline
finding: only `plat_sec_*` (Platform's original generation) is actually live — 79% of its nodes
are reachable by some role. Every other generation is 87-99% dead (0 role_menu_items grants,
unreachable by anyone): `platform_section_*` (10 roots), `tm_section_*` (10 roots), PMO's
`pmo_section_*`/most of `pmo-cat-*`, and PM's `pm_section_*`. Per the final interview decision,
**all fully-dead generations are deleted outright** (Phase 0 below) — this plan's remaining
phases work exclusively within the live `plat_sec_*` tree. PMO and PM layouts are NOT
independently rationalised by this plan (their live content is either dead — deleted — or
orphan-bucketed in from `plat_sec_*` already, per the audit's §0/§5/§6 findings); if either needs
its own dedicated pass later, that is separate, follow-on work.

**Standard pattern applies throughout** (per CLAUDE.md): dedicated routed pages (rule 65),
icon-only row actions (rule 61), sortable Table-List/Card views with row numbers (rules 40/41/44),
Audit details tabs (rule 63.1), shared success modal (rule 16), unsaved-changes guard (rule 52),
export menus (rule 38), theme-aware styling (rule 28.1), Platform–Simulator parity (rule 34.1).
All SQL is written as versioned files under `SQL/v966*` — **not run by the assistant**; the user
runs them manually, per the same standing instruction as v963.

---

## Phase 0 — Delete fully-dead menu generations ✅ SQL WRITTEN

- [x] SQL: `SQL/v966a_phase0_delete_dead_menu_generations.sql` — deactivates 300 menu_items rows
      (Platform's dead `platform_section_*`/`tm_section_*`/flat `platform_*` singletons: 87
      codes; PM's dead `pm_section_*`/`pm_*`: 142 codes; PMO's dead `pmo_section_*`/`pmo_calendar`/
      `pmo_planning`: 71 codes), each individually cross-checked against a fresh live
      `role_menu_items` query and confirmed to have **zero active grants to any of the 111
      roles** in the database. Deactivate, not delete (v965 pattern).
- [x] Three rows found WITH live grants during verification were deliberately excluded from
      deletion, to be handled by later phases instead: `platform_timesheet_approval_settings` (5
      roles → Phase 4 retargets its grants onto the canonical Timesheets/Approvals row),
      `pm_project_calendar`/`pm_project_calendar_exceptions` (both granted → Phase 5 folds this
      into the canonical schedule calendar).
- [x] `pmo-cat-*` (16 roots, 367 nodes) deliberately NOT touched in this phase — some of its ids
      are live category anchors `inferCategoryId()`/orphan-bucketing targets by menu_code even
      though almost none of their own direct children carry grants; needs a code-level check
      before any of these are safe to deactivate. Left for a later phase.
      `pmo_admin_local_registers` also NOT touched — confirmed real, live, granted "Manage Local
      Registers" entry point, not part of the dead family despite the prefix match.
- [x] `role_menu_items` cleanup included in the same SQL file (defensive no-op given the
      verification above, but included for completeness).
- [x] SQL run by user — confirmed applied successfully (along with the entire v966a-ab batch).

## Phase 1 — New "Platform" top-level section (non-PM infrastructure) ✅ DONE (5 of 7 candidate codes now in "Platform"; 2 confirmed inert, not achievable without a deeper code change — see below)

- [x] **Critical finding (supersedes this phase's original "pure SQL" framing):** the
      "Core Project Management" top-level wrapper is NOT a DB row — it's a synthetic node
      generated at render time by `groupMenuTreeByIndustryPack()`
      (`apps/platform/src/config/pmoMenuHierarchyUtils.js`, v930), which wraps *every* top-level
      node of the already-built sidebar tree that isn't owned by an industry pack. Creating a
      new top-level `menu_items` root (as this phase originally specified) would do nothing
      visible — it would just get folded into the same "Core Project Management" wrapper as
      everything else, since the wrapper logic had no second bucket. The real fix had to be a
      small code change, not a DB row.
- [x] **Code change:** `groupMenuTreeByIndustryPack()` now takes a `PLATFORM_INFRA_TOP_LEVEL_CODES`
      set and splits matching top-level nodes into a second synthetic "Platform" wrapper,
      rendered as a sibling of "Core Project Management" and any industry-pack section — before
      the existing pack-pruning logic runs, so it doesn't interact with industry-pack membership
      at all. Deliberately scoped to just the two already-root, already-populated codes
      `plat_sec_system_admin` (System Administration) and `plat_sec_account` (Account &
      Subscription) — see the code comment for why the other five PRD-decision-3 items were left
      out.
      **Post-run correction:** the agent that implemented this wrote the change into
      `apps/platform/src/config/pmoMenuHierarchyUtils.js`, which is a dead shadow copy — nothing
      in the app imports it (`@nidus/config/pmoMenuHierarchyUtils` resolves via
      `packages/config/package.json`'s `exports` map straight to `packages/config/src/
      pmoMenuHierarchyUtils.js`, with no vite alias override, unlike `@nidus/shared`'s
      utils/hooks/context/constants subpaths). The change was inert until manually ported to the
      real `packages/config/src/pmoMenuHierarchyUtils.js` file after this run — verified via
      `esbuild.transformSync`. See `Documentation/` memory note on this trap for future sessions.
      Simulator's own dead shadow copy (`apps/simulator/src/config/pmoMenuHierarchyUtils.js`) was
      NOT touched by this change (its diff predates this run — leftover from an earlier session's
      fix) and Simulator parity remains deferred to Phase 14 as intended.
- [x] **7th run (2026-08-24) — the 4 remaining items resolved via a rebuilt harness (not live UI
      testing, which remained unavailable, but an equivalent deterministic simulation — see
      "Harness" subsection under Phase 9 for the method).** Investigated one item at a time, per
      this run's brief. Live-data correction to this phase's original framing: Email &
      Notifications and Administration (`plat_sec_email`/`plat_sec_admin`) were ALREADY resolved
      by a prior run (confirmed empty stubs, deactivated by Phase 10 — no action needed, and this
      phase's own "5 remaining items" framing above was itself stale; only 4 items were actually
      still open).
      **Root-cause finding (the actual mechanism, more precise than "risk of re-parenting"):**
      `groupMenuTreeByIndustryPack()` only inspects the FIRST level of the already-built,
      already-classified sidebar tree. A re-parented row only reaches that first level if it
      survives `reorganizeMenuRoots()`'s v946 "childful orphan" rule — which bypasses
      `inferPlatformCategoryId()`/`inferPmPlatformCategoryId()` entirely, but ONLY for a root that
      has its own real DB children. A childLESS leaf is always individually classified by those
      functions' route/label regexes (PMO layout) or the explicit `PM_TRACK_AND_GROUP_CODE_
      TARGETS` map (PM layout) into whatever category its own identity matches, regardless of
      where its DB parent points — so re-parenting a leaf is confirmed INERT, not merely risky.
      **Result: 3 of the 4 are childful groups — safe, re-parented + added to
      `PLATFORM_INFRA_TOP_LEVEL_CODES`.** Template Library (`plat_grp_template_library`, 4
      children, 12 grants), Strategy & OKRs' GROUP variant (`plat_grp_okr`, 4 children, 3 grants —
      **live-data correction**: its real DB parent is `plat_sec_knowledge`, NOT
      `plat_sec_cross_fw` as this phase originally assumed), and Process Group Forms
      (`plat_grp_process_groups`, 8 children, 12 grants). Harness-confirmed: each moves cleanly
      from its old nested position to the new "Platform" wrapper for every one of its granted
      roles at PMO layout, zero code loss/duplication across all 111 roles at both PMO and PM
      layouts (PM layout: confirmed absent from the rendered tree both before AND after for all 3
      — a separate, pre-existing, unrelated gap, not caused or fixed by this change — see Phase
      9's "pre-existing bug" notes for the same class of issue). SQL:
      `SQL/v966aj_phase1_platform_infra_reparent.sql`. Matching JS change already applied to the
      REAL `packages/config/src/pmoMenuHierarchyUtils.js` (verified via the file-location trap
      grep — not the dead `apps/platform`/`apps/simulator` shadow copies).
      **The other 2 are childLESS leaves — confirmed inert, deliberately NOT touched.**
      Strategy & OKRs' LEAF variant (`plat_xf_okr`, route `/pmo/okr`, 22 grants including many
      PM-layout roles) — harness-simulated re-parent + JS Set addition produced a byte-for-byte
      identical rendered tree before/after, for every layout and every granted role; it stays
      nested under "Cross-Framework" (PM layout, via the explicit
      `PM_TRACK_AND_GROUP_CODE_TARGETS['plat_xf_okr'] = 'plat_sec_cross_fw'` map entry) and under
      "Knowledge & Assets" (PMO layout, via `inferPlatformCategoryId()`'s own `/pmo\/okr/` route
      regex) exactly as before. Integrations (`plat_xf_integrations`, route
      `/platform/integrations`, 12 grants) — harness confirms this row is **completely absent**
      from the PMO-layout sidebar today, not merely mis-nested (a real, pre-existing, unrelated
      bug — `inferPlatformCategoryId()` has no "integrations" regex match at all, falls through to
      the `pmo-cat-admin` default, then is dropped by that category's v671 subsection
      restructuring since a DIFFERENT row, `pmo-admin-integrations`, already occupies the
      "Integrations" slot under PMO Administration > Extensions & Integrations); the simulated
      re-parent + Set addition reproduced the identical still-absent result. Both are named,
      not vaguely deferred — see the updated comment block above `PLATFORM_INFRA_TOP_LEVEL_CODES`
      in `pmoMenuHierarchyUtils.js` for the full per-item mechanism citation, and
      `SQL/v966aj`'s own header for the same detail in SQL-file form. Flagged as follow-up bug
      tickets (same class as the already-documented Timesheets/`plat_tm_lesson_actions`
      orphan-visibility bug in Phase 9) — fixing either would need a code change to
      `inferPlatformCategoryId()`/`inferPmPlatformCategoryId()` itself, not a menu-data change,
      and is out of this phase's scope.
- [ ] Simulator equivalent — deferred to Phase 14 per this run's explicit scope (not attempted
      alongside a still-verifying Platform structure). Note: since `PLATFORM_INFRA_TOP_LEVEL_CODES`
      lives in the SHARED `packages/config/src/pmoMenuHierarchyUtils.js` (imported by both apps'
      `useMenu.js`/`useSimMenu.js` via `@nidus/config`), this run's JS edit is technically visible
      to Simulator's code path too — but confirmed inert in practice, since `sim.menu_items` has
      no rows with any of the 3 newly-added `plat_grp_*` codes (Simulator's own menu generation
      uses `sim_*`-prefixed codes throughout), so no Simulator-visible change actually occurs.

## Phase 2 — Consolidate RAID duplicates (Risk/Issue/Dependency) ✅ DONE

- [x] SQL: `SQL/v966b_phase2_raid_consolidation.sql`. Risk Register: kept `plat_pm_risk_reg`
      (`/pm/controls/risk-register`, 23 grants) canonical; deactivated `plat_tl_controls`
      (legacy `/platform/risks` `<Risks/>` component, Team Management track), migrating its one
      unique grant (`pm_team_manager`) onto the canonical row first. `plat_oversight_risk`
      (`/pmo/oversight/risk-register`, a genuinely different component `PMOOversightRiskRegister`
      — confirmed via `platformRoutes.jsx`) confirmed a deliberate PMO cross-project rollup
      (v879 Pattern A), left untouched. Issue Register: no `plat_tl_*`-style duplicate existed;
      nothing to do. Dependencies: confirmed every `dependencies*` menu row has 0 grants (a real
      gap, not a duplicate) — wired a new `plat_pm_dependencies_reg` leaf under RAID's Core
      Controls group, granted the same role set as Risk Register. A second "Planning >
      Dependencies" location is deferred to Phase 9 (no Planning group exists yet).

## Phase 3 — Consolidate Change Control duplicates ✅ DONE

- [x] SQL: `SQL/v966c_phase3_change_control_consolidation.sql`. Canonical `plat_pm_change_log`
      (`/platform/change`, 23 grants). Deactivated `plat_oversight_change`
      (`/pmo/registers/changes`) per this phase's explicit instruction — confirmed via fresh
      query it had 0 grants not already on the canonical row, so no visibility lost.

## Phase 4 — Consolidate Resources duplicates ✅ DONE

- [x] SQL: `SQL/v966d_phase4_resources_consolidation.sql`. Work Packages: kept
      `plat_pm_s_work_packages` (12 grants, broadest) canonical, deactivated the other 3
      (`plat_tl_work_packages`, `plat_tm_s_work_packages_ro`, `plat_tm_work_packages`),
      migrating their unique grants (`pm_team_manager`, `pm_team_member`) first. Capacity: kept
      `plat_pm_capacity` canonical, deactivated `plat_tl_capacity`, migrating its one unique
      grant first.
      **Post-run fix**: the user hit `ERROR 21000: ON CONFLICT DO UPDATE command cannot affect
      row a second time` running this file. Root cause: Work Packages' grant-migration INSERT
      joined `role_menu_items` to 3 loser `menu_code`s via one `IN (...)`, so any role granted on
      more than one of the 3 produced duplicate `(role_id, keeper.id)` output rows within the same
      INSERT — `ON CONFLICT DO UPDATE` can only resolve conflicts against pre-existing rows, not
      duplicates within the same command. Fixed by deduping `role_id` in a subquery
      (`SELECT DISTINCT src.role_id ...`) before joining to the single keeper row. Capacity's
      block only ever had one loser row, so it was never affected by this bug.
- [x] Timesheets/Approvals retarget — **done, Phase 9 Run 7 (`SQL/v966ag`)**: not by fixing the
      original dead `platform_timesheet_approval_settings`/`pmo_timesheet_approval_settings`
      routes (those remain genuinely dead, unbuilt, unrelated feature — still flagged for a
      dedicated follow-up if ever needed) — instead the real, live `plat_tm_timesheets`
      ("Time Entry")/`plat_tl_timesheet_mgmt` ("Approvals") rows were re-parented into the new
      `plat_pm_resources` group, which is what taxonomy §3's "Resources > Timesheets" actually
      needed. Also fixed a stale `route_path` on `plat_tm_timesheets` as part of the same change.
      See Phase 9's Run 7 write-up.
- [x] Assignments regroup — **done, Phase 9 Run 7 (`SQL/v966ah`)**: the UX decision was made
      (ProjectUsers/`plat_pm_manage_members` is the sole Resources > Assignments anchor;
      ManagerAssignments/AppointmentDashboard deliberately stay untouched as PMO-admin-scoped
      tools, not folded into PM-layout Resources) — its duplicate pair (`plat_members_roles`)
      was consolidated onto it first. See Phase 9's Run 7 write-up.

## Phase 5 — Consolidate Calendars ✅ DONE (reframed, Phase 9 Run 7)

- [x] SQL: `SQL/v966e_phase5_calendar_rescue.sql`. Found and fixed a real bug introduced by
      Phase 0: `pm_project_calendar`/`pm_project_calendar_exceptions` (the canonical schedule
      calendar per decision 6, deliberately excluded from Phase 0's deletion because they carry
      real grants) had their DB parent `pm_schedule_group` deactivated by Phase 0 anyway —
      leaving them structurally orphaned even though still active/granted. Re-parented under the
      live `plat_grp_pm_projects` group so they render again.
- [x] "Retiring the generic team calendar / v963 Universal Calendar into the schedule calendar" —
      **the live feature-by-feature comparison this bullet was waiting on was finally performed
      (Phase 9 Run 7) and found the original premise wrong**: `pm_project_calendar` is a
      per-project working-days/hours settings FORM, not an events calendar — it has zero concept
      of dated items, so redirecting Universal/Team Calendar's due-date-list functionality into
      it would be a straight functional regression, not a safe retirement. The real duplication
      was never against the schedule calendar; it was 8 menu rows referring to just 2 actual
      pages (Universal Calendar at `/platform/calendar`, Task Calendar at
      `/platform/tasks/calendar`). Resolved instead via `SQL/v966ae` — a same-page duplicate
      consolidation (Pattern-B, same mechanics as Risk Register/Work Packages), not a
      cross-feature merge. `calendar_event_overrides` (already schema-ready for org-wide,
      nullable-`project_id` events) remains a real, unused capability that could eventually let
      the schedule calendar absorb an "events" tab — noted as a future option, not attempted
      here. See Phase 9's Run 7 write-up and `SQL/v966ad`/`v966ae`'s own file headers.

## Phase 6 — Wire already-built, currently-unlinked pages into Core PM ✅ DONE (all items resolved — 5 wired this run, 3 wired in prior runs, 1 confirmed intentional non-gap)

- [x] SQL: `SQL/v966f_phase6_wire_unlinked_pages.sql`. Three items wired, each with its target
      route individually confirmed registered before touching menu data:
      RACI Matrix (GAP-10, reactivated `platform_raci_matrix` — deactivated by Phase 0 when it
      had 0 grants — re-parented under Teams, granted to match sibling Skill Matrix);
      Team Charter (re-parented existing `plat_tl_charter` from the Team Management track into
      Teams, grants broadened additively to match Skill Matrix); S-Curve & Baselines (GAP-14,
      re-parented existing `plat_pm_a_scurve` out of the Agile-only Planning Tools group into
      Reporting & Analytics, `methodology` changed from `agile` to `universal`, no grant change).
- [x] Skills Matrix (GAP-11) — turned out to be **already wired** (`plat_pm_skill_matrix`, 12
      grants, live under Teams) — the original plan's premise that it needed wiring was stale;
      no action needed (it just needs a Phase 9 relabel to its exact taxonomy location).
- [x] Activity Register / Gantt / Network-Dependencies — done, Run 5 (`SQL/v966v`, see Phase 9's
      table row 13) — resolved the route-param-substitution question this bullet originally
      flagged.
- [x] **8th run (2026-08-24) — the final 5 items (Scope Statement, WBS Builder, Schedule
      Management Plan, Quality Reviews, Testing Centre dashboard) all resolved.** SQL:
      `SQL/v966ak_phase6_remaining_leaves_wire.sql`. Live-data correction to this bullet's
      original framing: all 5 already have a real, live-registered `<Route>` in
      `apps/platform/src/routes/platformRoutes.jsx` today (confirmed via direct grep, not assumed
      from audit docs) — the ":id vs :projectId substitution unconfirmed" concern turned out to be
      moot for these 5 specifically, since all 3 project-scoped routes among them
      (Scope Statement/WBS Builder/Schedule Management Plan) use the `:projectId` token, which
      `sidebarRouteUtils.js`'s `resolveMenuRoutePath()` substitutes directly
      (`.replaceAll(':projectId', platformPid)`) — the OTHER already-confirmed-working convention
      from `v966v`'s own investigation, not a new unverified one. No `routeCommon.jsx` re-export
      gap found for any of the 5.
      - **Scope Statement** (`plat_pm_planning_scope_statement`, route
        `/platform/projects/:projectId/scope/statement`) and **WBS Builder**
        (`plat_pm_planning_wbs`, route `/platform/projects/:projectId/scope/wbs`) — wired as new
        direct children of `plat_pm_planning` (NOT the `plat_pm_planning_schedule` sub-group —
        both routes live under a `/scope/` URL segment and are scope-definition artefacts, not
        schedule artefacts; same placement tier as existing siblings S-Curve & Baselines and
        Planning Assumptions). Confirmed neither page has any project-methodology-track gating
        (grepped both `.jsx` files for "methodology" — no match), so this does not risk the
        Structured-track visibility-broadening problem documented in Phase 9's "systemic
        blocker" finding. Grants copied from `plat_pm_a_scurve` (12 roles), same source Run 5/6
        used for this group's other additions.
      - **Schedule Management Plan** (`plat_pm_planning_schedule_mgmt_plan`, route
        `/platform/projects/:projectId/schedule/management-plan`) — wired INSIDE the
        `plat_pm_planning_schedule` sub-group (alongside Activity Register/Gantt/
        Network-Dependencies) — its own URL segment IS `/schedule/`, and its content
        (`scheduling_methodology`/`scheduling_tool`/`level_of_accuracy` fields) is genuinely a
        schedule-management planning artefact, the same discipline as its 3 new siblings. Grants
        copied from `plat_pm_planning_activities` (12 roles).
      - **Quality Reviews** (`plat_pm_quality_reviews`, route `/platform/quality/reviews`) — wired
        as a new child of `plat_pm_quality`, alongside its existing sole child Quality Register.
        Confirmed a genuinely separate CRUD surface (different service —
        `qualityManagementService`'s `getQualityReviews`/`deleteQualityReview`, filtered by
        `quality_register_id` — reviews belong to register entries, not a duplicate of the
        register). Grants copied from `plat_pm_quality_reg` (12 roles).
      - **Testing Centre dashboard** — resolved definitively, NOT a same-page-different-path
        question. `apps/platform/src/pages/testingCentre/*` (route `/platform/testing-centre`,
        `TestingCentreRoutes.jsx`) is confirmed a genuinely DIFFERENT, materially richer page from
        the already-live "Testing" entry (`plat_pm_quality_testing`, route `/platform/testing`,
        `TestDashboard.jsx`) — different source files, different service layer
        (`testingCentreService`, mode-aware platform/sim, vs `testSuiteService`/`testCaseService`/
        `testRunService`/`defectService`), and materially richer scope (adds diagnostics, defects,
        evidence, environments, automated scripts, settings on top of suites/cases/runs/defects —
        the same finding already flagged as judgment call #9 in this plan's Review section).
        3 dead legacy rows exist at this exact route (`testing_diagnostics_dashboard`/
        `testing_qa_dashboard`/`pm_testing_dashboard`, all `is_deleted = true`, 0 grants each) —
        NOT reactivated, per the standing convention; a fresh `plat_pm_testing_centre` row was
        created instead, wired as a new `plat_pm_quality` child alongside Quality Register/Quality
        Reviews. Grants copied from `plat_pm_quality_reg` (12 roles).
        **RESOLVED (PRD decision 14, 2026-08-24):** Testing Centre and "Testing" coexist
        permanently, under clearly distinct labels — no consolidation planned. They are genuinely
        different in scope (Testing Centre adds diagnostics, defects, evidence, environments, and
        automated scripts on top of what Testing covers). This makes a fully-built-but-previously-
        completely-unreachable capability (0 grants on all 3 of its dead legacy rows) reachable
        for the first time.
      No JS/`inferPmPlatformCategoryId` change needed for any of the 5 — all nest under DB parents
      that are already-recognised `plat_pm_*` categories from prior Phase 9 runs, so no
      orphan-bucketing involvement. Dedupe-collision check: no semantic key exists for any of the
      5 items' labels/codes in `pmoMenuSemanticDedupe.js`. `apps/platform/src/utils/
      menuCacheUtils.js`'s `SIDEBAR_CACHE_VERSION` bumped 61→62 (same deploy as this run's Phase 1
      bump, 60→61) to cover both this run's changes in one cache-invalidating deploy.
      Simulator parity: not attempted — none of these 5 pages have a Simulator counterpart to
      begin with (Platform-only features), and Simulator's Phase 9-equivalent taxonomy groups
      (`plat_pm_planning`/`plat_pm_quality` mirrors) remain deferred to Phase 14 regardless.
- [x] Executive Dashboard — confirmed **intentionally** orphaned by existing code
      (`PMO_ONLY_PM_LAYOUT_DROP_CODES` treats it as an org-wide exec page, not a project-scoped
      sidebar child). Not a gap; no action taken.

## Phase 7 — Wire Assumptions Register into both taxonomy locations ✅ DONE

- [x] Done as part of `v966m`'s Planning group build (PRD decision 7) — the Planning group now
      exists and Assumptions Register is wired into it as the second location, alongside RAID's
      existing Assumptions entry. See Phase 9's write-up.

## Phase 8 — Project Charter nesting ✅ CLOSED — not applicable (PRD decision 12)

- [x] Closed, not blocked: this depended on "Project Setup" existing as a taxonomy group, which
      PRD decision 12 (2026-08-23) settled as explicitly out of scope for this PRD — see Phase 9's
      "DECISION RECORDED" subsection. Project Brief and PID stay exactly where they already are
      per PRD decision 8 (both preserved as separate Structured-track artefacts, not merged), so
      there is no remaining "Project Charter nesting" action to take.

## Phase 9 — Rebuild the full Core PM top-level structure ✅ DONE (14 of 14 in-scope groups + 2 finishing touches + 1 sub-group wire + 6 further sub-leaf wires done; Project Setup, Scope & Deliverables settled OUT OF SCOPE 2026-08-23, not remaining work; across 6 runs)

**6th Phase 9 run (2026-08-24) closes out Planning and Resources.** Planning's 4 remaining
sub-leaves (Dependencies 2nd location, Calendars 2nd location, Scenario Planning, plus the
generic-calendar duplicate cleanup) and Resources' 2 remaining sub-leaves (Timesheets,
Assignments) are wired by `SQL/v966ac`-`v966ai` (7 files) below. Planning and Resources are now
both taxonomy-complete for every sub-leaf that has a confirmed, live, reachable page — the only
remaining gaps (Planning > Schedule's Critical Path / Look-Ahead Plan / Schedule Variance) are
genuine no-page-exists content gaps, not scope or mapping ambiguity, same as already documented
for Project Closure's Final Acceptance/Archive and Governance's Stage Gates/Meetings. This
brings Phase 9 to 14 of 14 in-scope taxonomy groups complete (RAID, Benefits, Change Control,
Governance, Cost Management, Planning, Resources, Quality, Testing, Documents, Reports, Project
Closure, plus the 2 settled-out-of-scope groups excluded from the 16-group original count).

**Scope decision made this run: PM_CATEGORY_DEFS only, not PMO_CATEGORY_DEFS.** The prior run's
finding (below, kept for context) was correct that both `PM_CATEGORY_DEFS` and
`PMO_CATEGORY_DEFS` are hardcoded whitelists. But PRD decision 11 ("PMO and PM layouts are not
independently rationalised by this PRD — their only live content either gets deleted or already
renders via orphan-bucketing from `plat_sec_*`") means this PRD's Phase 9 only covers the
PM-layout tree (`PM_CATEGORY_DEFS`, the "Core Project Management" sidebar taxonomy §3 targets).
`PMO_CATEGORY_DEFS` is a *different* design lineage (v681/v930, its own PRD decision explicitly
preserves "Portfolio & Delivery, Workflows & Governance, People & Resources..." as-is) and
rebuilding it to taxonomy §3 shape was never a decided scope item — attempting it here would be
re-litigating a settled decision, not executing one. Left untouched, exactly as before.

**Verification method used (solves the prior run's stated blocker):** a Node harness script
(kept at the session scratchpad, not committed — see "Harness" below for how to rebuild it) that:
1. Pulls real `menu_items` (2,058 rows) and `role_menu_items` (9,076 rows, paginated past
   PostgREST's 1000-row cap) directly from Supabase via PostgREST + the service-role key in `.env`.
2. Bundles the **real, unmodified** `packages/config/src/pmoMenuHierarchyUtils.js` /
   `pmoSidebarCategories.js` / `methodologyMenuUtils.js` / `menuDbOnlyUtils.js` /
   `pmoMenuSemanticDedupe.js` with esbuild (needed because these files use extensionless relative
   imports, which Node's own ESM resolver rejects but esbuild's bundler resolution accepts —
   `import ... from 'E:/.../pmoMenuHierarchyUtils.js'` as a **static** top-level import, not a
   dynamic `import()`, so esbuild can trace the whole graph and inline it into one runnable file).
3. Replicates `useMenu.js`'s exact PM-layout pipeline (`buildHierarchy` → ancestor hydration →
   `reorganizeMenuRoots('pm')` → `applyCategorySortOrders` → `applyPmLayoutSanitization` →
   `filterPmLayoutMenuItems` → `applyCategoryPresentationLabels` →
   `applyTrackCategoryPresentationLabels` → `wrapPmoMenuWithMethodologyTracks` →
   `filterMenuTreeByVisibleTracks` → `filterMenuByPmProfile` → `dedupePmoMenuTree`) against the
   real snapshot, for any role by name (`node harness.bundle.mjs <roleName> [roleName2] ...`).
4. Prints the rendered tree (labels, routes, nesting) for one or more roles.

Each SQL migration's effect was simulated on a local COPY of the `menu_items` snapshot (mutated
in-memory exactly per the SQL's own `UPDATE`/`INSERT` statements — a small `apply_v966*.mjs`
script per file), then the harness ran **before vs after across all 111 live roles** and the
diff was inspected. This is not a substitute for the user's own manual UI walkthrough (PRD
testing decision), but it is a faithful, deterministic substitute for "did anything silently
disappear or move somewhere wrong" — the actual production code path, actual production data,
zero guessing about what a role can see.

**3rd Phase 9 run (this run, 2026-08-23):** rebuilt the harness fully fresh (re-fetched
`menu_items`/`role_menu_items`/`roles` live, since the prior run's snapshot was 10 groups stale;
re-bundled `packages/config/src/*` with esbuild against the current code) rather than trusting
the previous run's cached data. Verification for this run's 4 changes went one step further than
prior runs' label-diff inspection alone: an explicit per-role **menu_code presence/duplicate
scan** (not just a line-text diff) across all 111 roles' full rendered trees, confirming zero
codes silently disappeared (beyond the one expected — `plat_grp_pm_auth`, now permanently empty)
and zero new duplicate entries were introduced anywhere — this is what caught the Resource
Directory/orphan-dedupe interaction (see `v966t`'s table entry above) before it was written into
final SQL, the same way the 2nd run's harness caught the equivalent Capacity/orphan issue. After
applying the JS code changes for real (not just simulating them), the harness was re-run once
more directly against the real, modified `packages/config/src/*` files and produced **byte-
identical output** to the simulated result — confirming the simulation faithfully predicted the
real code's behaviour, not just a hand-written approximation of it.

### What was completed (harness-verified, SQL written but NOT run)

Working one taxonomy group at a time, smallest/least-ambiguous first, each verified in isolation
before moving to the next (per this run's explicit brief) — not the original phase's "one big
pass" framing, which this run's own instructions superseded:

| # | Group | SQL file | Change | Roles affected | Harness diff |
|---|-------|----------|--------|-----------------|--------------|
| 1 | **RAID** | `v966h` | New `plat_pm_raid` root; re-parent Risk/Assumptions/Issue/Dependency registers + combined RAID Log out of Controls & Registers | 23 roles | Isolated to exactly the 5 moved leaves + the new group + Controls&Registers/Core Controls disappearing for the 1 role whose only Controls grants were these items (correct — no other content left to show) |
| 2 | **Benefits** | `v966i` | New `plat_pm_benefits` root; re-parent Benefits Register out of Controls & Registers > Scope & Value | 12 roles | Isolated to the 1 moved leaf + new group |
| 3 | **Change Control** | `v966j` | New `plat_pm_change_control` root; re-parent Change Log out of Controls & Registers > Core Controls | 23 roles (22 rendered — 1 pre-existing pmProfile exclusion, identical before/after, not caused by this change) | Isolated to the 1 moved leaf + new group |
| 4 | **Governance** | `v966k` | New `plat_pm_governance` root; re-parent Decision Log out of Controls & Registers > Knowledge & Governance. Deliberately does NOT fold in the existing "Authorisation" group (taxonomy's Governance>Approvals) — see file header for why that's a separate, more invasive follow-up | 18 roles (17 rendered — same kind of pre-existing exclusion) | Isolated to the 1 moved leaf + new group + Knowledge & Governance disappearing for the 1 role with no other content there |
| 5 | **Cost Management** | `v966l` | Pure relabel — `plat_grp_pm_financial`'s `menu_label` changes from "Financial" to "Cost Management"; menu_code/id/children untouched (the group's existing content — My Expenses, Expense Approvals, Financial Reports — already IS cost-management content end to end, so no re-parenting needed) | All roles with any Financial-group grant | Isolated to the single label string |
| 6 | **Planning** (partial) | `v966m` | New `plat_pm_planning` root; re-parent S-Curve & Baselines out of Reporting & Analytics; **new** `plat_pm_planning_assumptions` leaf (2nd location for the shared Assumptions Register, PRD decision 7) with grants copied from `plat_pm_assumptions_reg`. Schedule/Milestones/Dependencies/Calendars/Scenario Planning sub-groups deliberately NOT touched (see file header) | S-Curve: 12 roles. Planning Assumptions: same role set as RAID's Assumptions Register (copied grants) | Isolated to the 2 leaves + new group; confirmed `/platform/assumptions` now legitimately renders twice (RAID + Planning) for the roles granted it — by design |
| 7 | **Resources** (partial) | `v966n` | New `plat_pm_resources` root; re-parent Capacity Planning out of Teams. Resource Directory/Manage Roles/Skill Matrix/Leave Calendar/Team Charter deliberately stay under Teams; Timesheets investigated and NOT moved — see below | 13 roles (`plat_pm_capacity`) | Required a matching `inferPmPlatformCategoryId` regex split (see below) to keep the `pmo-people-team-capacity` orphan row deduping correctly against its new sibling — harness-verified `pmo_admin` (granted both) still sees exactly one "Team Capacity" entry post-move, same as pre-move |
| 8 | **Quality** (partial) | `v966o` | New `plat_pm_quality` root; re-parent Quality Register out of Controls & Registers > Quality & Configuration. The combined "Quality & Testing" dashboard (`plat_pm_quality_testing`, one page/route) is deliberately NOT split — no separate Quality-only or Testing-only page exists to split it into | 12 roles | Isolated to the 1 moved leaf + new group |
| 9 | **Reports** (relabel) | `v966p` | Pure relabel — `plat_grp_pm_reporting`'s `menu_label` changes from "Reporting & Analytics" to "Reports"; menu_code/id/children untouched. Only safe because `v966m` (this same run) already moved S-Curve & Baselines out first — see file header | All roles with any Reporting-group grant | Isolated to the single label string (post-`v966m`, the group's remaining content — Report Library/Builder, Analytics Dashboards, Custom Metrics — is Reports-shaped end to end) |
| 10 | **Project Closure** (partial) | `v966q` | New `plat_pm_project_closure` root; re-parent Lessons Log out of Controls & Registers > Knowledge & Governance (which becomes empty and stops rendering). Closure Checklist/Final Acceptance/Outstanding Items/Handover/Benefits Transition/Archive/Closure Report each need a content-mapping decision not made this pass — see file header for the specific reason per item (Archive found genuinely ambiguous: 2 different "archive" concepts exist; Closure Report's closest match is Structured-track-wrapped, not a simple universal leaf) | 18 roles | Isolated to the 1 moved leaf + new group + Knowledge & Governance disappearing for roles with no other content there |
| 11 | **Testing** (relabel) | `v966r` | Pure relabel — `plat_pm_quality_testing`'s `menu_label` changes from "Quality & Testing" to "Testing"; menu_code/id/route/children untouched. Resolves the "does the combined dashboard need splitting" question left open by 2 prior runs: investigated the actual page (`TestDashboard.jsx`) and found it is Testing-only content (suites/cases/runs/defects, zero quality content) — the old label was simply wrong, not a genuine two-discipline page | 14 roles | Isolated to the single label string |
| 12 | **Documents** (relabel) | `v966s` | Pure relabel — `plat_pm_project_documents`'s `menu_label` changes from "Project Documents" to "Documents"; already a top-level `PM_CATEGORY_DEFS` row with no re-parenting needed at all (unlike every other group in this table) | 22 roles | Isolated to the single label string |
| — | **Resources** (finishing touch) | `v966t` | Re-parent Resource Directory (`plat_pm_resource_dir`) out of Teams into the existing `plat_pm_resources` group (from `v966n`), alongside Capacity. Required a matching `inferPmPlatformCategoryId` regex split (mirroring `v966n`'s Capacity fix) so the orphan row `pmo-people-resource-directory` stays a sibling and continues deduping correctly — a bare SQL-only simulation (no JS fix) produced a visible duplicate for every role granted both, caught by the harness before being finalised | 12 roles | Isolated to the moved leaf; explicit per-role menu_code presence/duplicate scan confirms zero missing codes and zero new duplicates anywhere in the tree for any of the 111 roles |
| — | **Governance > Approvals** (finishing touch) | `v966u` | Re-parent all 3 children of the "Authorisation" group (`plat_pm_pending_approval`, `plat_pm_submitted`, `plat_pm_approval_chains` — Pending My Approval / My Submitted Records / Approval Chains, all already universal methodology) into the existing `plat_pm_governance` group (from `v966k`, previously Decision Log only). `plat_grp_pm_auth` ("Authorisation") becomes permanently empty and is deliberately left in `PM_CATEGORY_DEFS` — `filterPmLayoutMenuItems()` already strips any route-less, childless node, so it silently stops rendering with no JS cleanup needed. Two prior runs deferred this as "bigger, more invasive"; investigation this run found the code-path risk (`PM_PLATFORM_SEC_TARGETS`'s 2 legacy mapping entries) was already inert (both source rows deactivated by `v966g`), and `inferPmPlatformCategoryId`'s "authorisation" orphan-fallback never fires for a row that keeps a real DB parent — so the move was safe after all | 30 roles | Isolated to `plat_grp_pm_auth` disappearing (correct, now permanently empty) + its 3 children reappearing unchanged under Governance; explicit per-role menu_code presence/duplicate scan confirms zero unexpected losses and zero new duplicates |
| 13 | **Planning > Schedule** (sub-group wire) | `v966v` | New `plat_pm_planning_schedule` sub-group under the existing `plat_pm_planning` (from `v966m`); 3 new leaf rows — Activity Register (`plat_pm_planning_activities`, `/platform/projects/:id/schedule/activities` → `ActivityListPage`), Gantt (`plat_pm_planning_gantt`, `/platform/projects/:id/schedule/gantt` → `GanttChartPage`), Network / Dependencies (`plat_pm_planning_sequencing`, `/platform/projects/:id/schedule/dependencies` → `ActivitySequencingPage`). Resolves the "route-param substitution unconfirmed" blocker 2 prior runs (Phase 6, then `v966m`) left open: `apps/platform/src/utils/sidebarRouteUtils.js`'s `resolveMenuRoutePath()` was read directly and confirmed it substitutes BOTH `:projectId` and `/:id/` tokens once a route matches `/platform/projects/`, so the `:id`-token route_path (matching the still-live `pm_project_calendar` precedent) resolves correctly. The old dead `pm_activity_list`/`pm_gantt_chart`/`pm_activity_sequencing` generation (same routes, `:id` token) was confirmed genuinely dead — `is_deleted = true` since June 2026, unrelated to this initiative, not reactivated; new `plat_pm_*`-prefixed rows created instead, matching every other Phase 9 file's convention. No dedupe-collision risk (verified via grep of `pmoMenuSemanticDedupe.js`: no semantic key exists for gantt/activity-register/activity-sequencing/network-dependencies, and no other live or orphan row shares these exact 3 routes) — no matching `inferPmPlatformCategoryId` fix needed, unlike `v966n`/`v966t`. Grants copied from `plat_pm_a_scurve` (S-Curve & Baselines, the direct Planning sibling, 12 roles) — same grant-copy pattern as `v966m`/`v966f`. Taxonomy's remaining 3 Schedule sub-leaves (Critical Path / Look-Ahead Plan / Schedule Variance) have no confirmed page anywhere in the codebase; left as genuine gaps, not built | 12 roles (copied grant set) | Isolated to exactly the 4 new codes appearing for the 12 granted roles; zero codes lost anywhere across all 111 roles; zero new duplicates. Verified against a **freshly re-fetched** live snapshot (not reused from the 3rd run's cache — see below) |
| — | **Planning > Dependencies** (2nd location, finishing touch) | `v966ac` | New `plat_pm_planning_dependencies` leaf under `plat_pm_planning`, same route as RAID's `plat_pm_dependencies_reg` (`/platform/dependencies`) — resolves v966m's own deferred bullet ("no explicit user decision authorises a second menu location for it"). Grants copied (not migrated) from `plat_pm_dependencies_reg`, same dual-location pattern as `v966m`'s Planning Assumptions leaf. No dedupe risk — different parents (RAID vs. Planning), no semantic key for "dependencies" in `pmoMenuSemanticDedupe.js` | 24 roles (copied grant set; live-verified, matches brief's ~24 estimate) | Additive-only; isolated to the 1 new code |
| — | **Planning > Calendars** (2nd location, finishing touch) | `v966ad` | New `plat_pm_planning_calendar` leaf under `plat_pm_planning`, same route as the canonical project schedule calendar `pm_project_calendar` (`/platform/projects/:id/schedule/calendar`). Grants copied from `pm_project_calendar`. Distinct from `v966ae`'s generic-calendar consolidation (different route entirely) | 4 roles (copied grant set; live-verified, matches brief's ~4 estimate) | Additive-only; isolated to the 1 new code |
| — | **Calendar consolidation** (2 clusters) | `v966ae` | Cluster A (route `/platform/calendar`): kept `plat_pm_calendar` (12 grants, correctly labeled) canonical; deactivated `plat_pm_leave_cal` (12 grants, mislabeled "Leave Calendar" but same generic calendar page), `plat_tm_calendar` (5 grants), `plat_tm_team_calendar` (5 grants) — migrated their unique grants first via the `SELECT DISTINCT src.role_id` pattern (3 losers combined, same `v966d` "ON CONFLICT DO UPDATE cannot affect row a second time" precaution). Cluster B (route `/platform/tasks/calendar`): kept `plat_pm_task_calendar` (12 grants) canonical; deactivated `plat_tm_task_calendar` (5 grants). **Deliberately did NOT touch** `mkt_reuse_calendar`/`mkt_reuse_campaign_schedule` (Marketing industry-pack rows sharing Cluster B's route — industry packs are out of this PRD's scope) | Cluster A: 5 roles migrated onto the keeper (from the 3 losers' combined unique grant set). Cluster B: 0 additional roles needed (loser's 5 grants were a subset of the keeper's 12) | All 4 loser rows deactivated, zero grant loss for any role — verified all 4 grant counts live before writing (12/12/5/5 and 12/5), exact match to the brief's estimates |
| — | **Planning > Scenario Planning** | `v966af` | New `plat_pm_planning_scenarios` leaf under `plat_pm_planning`, route `/pm/planning/scenarios` — corrects `v966m`'s original "no confirmed page exists" assumption; a real registered page (`ScenarioList.jsx`, mounted via `apps/platform/src/routes/fallback/planningHubRoutes.jsx` at the `pm/planning/*` prefix) was found this run. 2 dead historical rows at this same route (`planning_scenarios`, `pm_planning_scenarios`, both `is_deleted=true`) deliberately NOT reactivated — new `plat_pm_*`-prefixed row created instead, same convention as `v966v`. Grants copied from `plat_pm_a_scurve` | 12 roles (copied grant set; live-verified, matches brief's ~12 estimate) | Additive-only; isolated to the 1 new code |
| 14 | **Resources > Timesheets** (finishing touch) | `v966ag` | Bundles 2 fixes on `plat_tm_timesheets` in one `UPDATE`: re-parent out of the dead legacy `plat_sec_personal` shell into `plat_pm_resources` (fixes the pre-existing "silently invisible in PM layout" bug `v966n`'s own header flagged and deliberately left unfixed — `plat_sec_personal` explodes via `flattenLegacyCategoryShells()` into orphan roots that `inferPmPlatformCategoryId()` has no "timesheet" branch for), relabel "Timesheets" → "Time Entry", **and** correct `route_path` from the stale `/platform/timesheets/my` to the actually-registered `/platform/timesheets` (confirmed via fresh grep of `platformRoutes.jsx` — serves `MyTimesheetsPage`). Also re-parents `plat_tl_timesheet_mgmt` into the same group as sibling "Approvals" (relabeled from "Timesheet Management"), route `/platform/timesheets/team` already correct, no route fix needed. Both re-parents keep their existing `menu_items.id` — no grant migration. No dedupe risk (no semantic key for "timesheet", no orphan `pmo-people-*` row exists for it) | Timesheets: 5 roles. Approvals: 4 roles (both carry over automatically, same-id re-parent; live-verified, exact match to brief's ~5/~4 estimates) | Isolated to the 2 re-parented codes; the orphan-visibility bug fix means both codes now actually render in the PM-layout sidebar for the first time |
| 14 | **Resources > Assignments** | `v966ah` | Resolves Phase 4's deferred "Assignments regroup... needs a UX decision" bullet — user decision: ProjectUsers is the sole anchor. Consolidated the duplicate pair sharing route `/platform/project-users`: kept `plat_pm_manage_members` (21 grants, broadest) canonical, deactivated `plat_members_roles` (12 grants), migrating its unique grants first. Then re-parented the keeper (same id) into `plat_pm_resources`, relabeled "Manage Members" → "Assignments". **Deliberately did NOT touch** `plat_tl_assignments` (ManagerAssignments, PMO-admin-scoped) or the orphan `pmo-people-manager-assignments`/`pmo-people-appointment-tracker` rows, per the user's explicit decision to keep those PMO-admin-scoped tools separate from PM-layout Resources | 21 roles on the keeper post-consolidation (0 additional migrated — loser's 12 grants were already a subset of the keeper's 21; live-verified, exact match to brief's ~21/~12 estimates) | Consolidation + re-parent isolated to the 1 surviving code; no dedupe risk confirmed (no semantic-key or orphan-route overlap) |
| — | **Project Closure > Closing a Project** (hub) | `v966ai` | New `plat_pm_project_closure_closing` leaf under `plat_pm_project_closure`, covering Closure Checklist / Outstanding Items / Handover / Benefits Transition as ONE combined link (all 4 confirmed live as sections of the single `ClosingProject.jsx` page, not independently routable). **Live-data correction vs. the task brief**: the actual registered route is `/platform/projects/:projectId/closure` (confirmed via grep of `platformRoutes.jsx` — `<Route path="projects/:projectId/closure" element={<ClosingProject />} />` inside the `platform/*` prefix), NOT `/platform/projects/:projectId/structured/closing` as originally assumed — that path is not registered anywhere and is exactly why the old dead `governance_closing` row (same assumed route, `is_deleted=true`) was never reachable even before this initiative. `governance_closing` deliberately NOT reactivated. `methodology='structured'` set as a metadata-only tag — confirmed via grep that `packages/config/src/*` never reads a `menu_items` row's own `methodology` field for sidebar rendering (only `annotateTemplateRowsByMethodology()` reads it, for unrelated Template Library rows), and `plat_pm_project_closure` is not a member of any `TRACK_CHILD_CATEGORY_IDS` list, so it is not track-wrapped — zero visibility effect, confirmed not assumed. Final Acceptance and Archive remain documented gaps (Archive already settled ambiguous by `v966q`; Final Acceptance has no matching code anywhere). Grants copied from `plat_pm_lessons_ctrl` | 12 roles (copied grant set) | **Live-data correction**: the Phase 9 table's original `v966q` entry (row 10 above) stated Project Closure was "18 roles" — a fresh count this run found `plat_pm_lessons_ctrl` now has 12 active/granted roles (ordinary grant-set drift between runs, same class of drift the Run 5 harness notes already documented for `role_menu_items` growing 9,080→10,972 rows). The grant-copy INSERT reads live data at run time regardless, so this is a documentation correction only, not a SQL defect |

Every file follows the established SQL pattern (deactivate-never-delete is N/A here since these
are additive/re-parent, not deletions; `WHERE NOT EXISTS` guards on the INSERT; `COALESCE(is_
deleted, FALSE) = FALSE` guards throughout). **Critically, every re-parent keeps the leaf's
existing `menu_items.id`** — `role_menu_items` grants are keyed by `menu_item_id`, so no grant
migration INSERT is needed anywhere in `v966h`-`v966l`/`v966m`-`v966o`/`v966q` (unlike Phases
2-6's consolidations, which merged two *different* ids and therefore needed grant migration).
`v966m`'s Planning Assumptions leaf is the one exception — a genuinely **new**, deliberately
dual-location row, so it needed a grant-copy INSERT (same pattern as Phase 2's Dependency
Register), not a migration. This is a materially lower-risk category of change than the earlier
phases.

### A real pre-existing bug found while verifying Resources/Capacity (not fixed, not in scope)

Tracing why `pmo_admin` (granted both `plat_pm_capacity` and the orphan row
`pmo-people-team-capacity`) only ever showed ONE "Capacity" entry led to discovering
`pmoMenuSemanticDedupe.js`'s `peopleLeafSemanticKey()` treats `resources/capacity` and
`teams/capacity` as the same concept — sibling-only dedupe, so moving `plat_pm_capacity` to a new
DB parent without also redirecting the orphan's fallback target would have silently produced a
**visible duplicate** for every role granted both (a real risk the harness caught before writing
any SQL). Fixed via a regex split in `inferPmPlatformCategoryId` (see `v966n`'s header).

While tracing this, a **second, genuinely pre-existing, unrelated bug** was found and explicitly
NOT fixed this run: `plat_tm_timesheets` (the "Time Entry" leaf, taxonomy §3 Resources >
Timesheets) lives under the legacy `plat_sec_personal` ("Personal Workspace") DB shell, which
`flattenLegacyCategoryShells()` explodes into individual orphan roots for PM-layout rendering —
and `inferPmPlatformCategoryId()` has no matching branch for "timesheet" text/codes at all (that
branch only exists in the **Simulator** PM-layout inference function). Result: `plat_tm_timesheets`
silently disappears from the PM-layout sidebar for every role that has it granted, including
`pmo_admin` — confirmed via the harness (`grep -i timesheet` on the rendered tree for every tested
role returns nothing, despite `pmo_admin`/`pm_team_manager`/`pm_team_member`/`account_owner`/
`system_admin` all being granted it in `role_menu_items`). This is unrelated to this migration
(it predates it) and was left unfixed — silently fixing it as a side effect of a menu-taxonomy
relabel would hide a real UX regression fix inside an unrelated change; flagged here as a
follow-up bug ticket instead. "My Lesson Actions" (`plat_tm_lesson_actions`) has the identical
root cause.

`packages/config/src/pmoSidebarCategories.js` (`PM_CATEGORY_DEFS`) and `packages/config/src/
pmoMenuHierarchyUtils.js` (`inferPmPlatformCategoryId`, defensive orphan-routing only — none of
the 5 moved leaves are actually orphans post-migration, since they get real DB parents) were
both updated in the same run, in the **real** file (`packages/config/src/*`, confirmed via a
whole-repo import grep — see "file location trap" note below). Full `packages/config` test suite
(101 tests, 7 files) passes. `apps/platform`'s `useMenu.test.js`/`useMenuMethodology.test.js`
were also run: 2 pre-existing failures in `useMenuMethodology.test.js` were confirmed via `git
stash`/re-run to fail identically with this run's changes fully reverted — pre-existing, not a
regression from this work (not investigated further; out of this phase's scope).

### File-location trap (re-verified per this run's own brief)

Grepped the whole repo for every import of `pmoMenuHierarchyUtils`/`pmoSidebarCategories`. All
five real call sites (`apps/platform/src/hooks/useMenu.js`, `apps/platform/src/hooks/
useSimMenu.js`, `apps/simulator/src/hooks/useMenu.js`, `apps/simulator/src/hooks/useSimMenu.js`,
`packages/shared/src/hooks/useMenu.js`) import via `@nidus/config/pmoMenuHierarchyUtils`, which
resolves to `packages/config/src/pmoMenuHierarchyUtils.js` — confirmed the only file edited. The
three dead shadow copies (`apps/platform/src/config/*`, `apps/simulator/src/config/*`, bare
`src/config/*`) were left untouched.

**3rd run:** re-confirmed the same way (both edited files this run — `pmoMenuHierarchyUtils.js`'s
`inferPmPlatformCategoryId` and `pmoSidebarCategories.js`'s `PM_CATEGORY_DEFS` — are the real
`packages/config/src/*` copies) and additionally confirmed via `esbuild.transformSync`-equivalent
(a full `esbuild --bundle` compile of `pmoMenuHierarchyUtils.js` with `--outfile=/dev/null`) that
both files parse/bundle cleanly with no syntax errors before being treated as done.

### 4th Phase 9 run (this run, 2026-08-23 continued) — data freshness, Planning > Schedule wired, Project Setup/Scope & Deliverables investigation resolved

**Data freshness note (a real gap found in the prior run's own harness, corrected here):** the
prior run's cached `menu_items.json` snapshot omitted the `is_deleted` column entirely (its
`SELECT` clause never asked for it), so its harness's ancestor-hydration filter
(`row.is_deleted !== true`) silently treated every row as non-deleted regardless of the DB's
actual value. This never affected any of the 12 completed groups (none of them touch a
genuinely soft-deleted row), but it would have been a real correctness gap for this run's own
work (see below — several candidate rows for Planning > Schedule turned out to be exactly this
kind of soft-deleted row). Fixed by re-fetching `menu_items`/`role_menu_items`/`roles` fully
fresh via PostgREST with `select=*` (not a curated column list) and full `Range`-header
pagination immediately before starting work. Also caught a real, larger drift while doing this:
live `role_menu_items` had grown from 9,080 rows (prior run's cache) to 10,972 (fresh fetch) —
~1,900 new grants added to the live DB between the prior run ending and this run starting,
unrelated to this initiative (ordinary production usage/provisioning). Re-fetching instead of
reusing the cache was the only way to catch this; the harness would have produced a stale
diff against the prior snapshot otherwise.

**Planning > Schedule wired (`v966v`)** — see the table above (row 13). Resolves the "route-param
substitution unconfirmed" concern 2 prior runs (Phase 6, then `v966m`) explicitly left open as
the reason Activity Register/Gantt/Network-Dependencies weren't wired: reading
`apps/platform/src/utils/sidebarRouteUtils.js`'s `resolveMenuRoutePath()` directly confirms it
substitutes both `:projectId` and the `/:id/` token style once a route matches
`/platform/projects/` (`.replaceAll(':projectId', platformPid)` and
`.replaceAll('/:id/', ...)` both present, lines 50-55) — so there was never a real ambiguity,
just an unverified assumption. New `plat_pm_*`-prefixed rows were created (not a reactivation of
the old dead `pm_activity_list`/`pm_gantt_chart`/`pm_activity_sequencing` generation, confirmed
`is_deleted = true` since June 2026 via the freshly-fetched data above — unrelated to this
initiative). Harness-verified clean (see table).

**Project Setup / Scope & Deliverables — the recommended track-scoped-group approach was
investigated and does NOT check out.** This run's primary task was to check whether "Project
Setup" (and/or "Scope & Deliverables") could be built as a methodology-track-scoped top-level
group using the *same* mechanism that already makes "Structured"/"Standards-Based"/"Agile" their
own visible-or-not headers, rather than inventing new per-leaf visibility architecture. Three
independent lines of evidence, gathered this run, all point the same way:

1. **Code structure is hardcoded to exactly one header per track, not one per taxonomy group.**
   `METHODOLOGY_TRACK_DEFS` (`packages/config/src/methodologyMenuUtils.js`) is a fixed 3-entry
   array (`structured` → "Structured", `standards_based` → "Standards-Based", `agile` → "Agile").
   `wrapPmoMenuWithMethodologyTracks()` buckets every `trackCategoryNode` by
   `categoryMethodologyTrack()` and merges ALL matching nodes into the ONE header for that track —
   there is no mechanism today for two independently-named top-level groups ("Project Setup" and
   "Governance", say) to both be gated on the same `structured` track without collapsing into a
   single shared header. Building that would mean extending `METHODOLOGY_TRACK_DEFS` to support
   multiple headers per track — a real code change, not a reuse of the existing mechanism as-is.
2. **Live DB content confirms the "Structured" wrapper is a genuine grab-bag, not a
   Project-Setup-shaped bucket.** A fresh query of `plat_grp_pm_pre_project` /
   `plat_grp_pm_proj_controls` / `plat_grp_pm_del_reporting` / `plat_grp_pm_gov_standards` (the 3
   DB groups that all bucket into the Structured wrapper via
   `PM_TRACK_AND_GROUP_CODE_TARGETS`) shows their combined children span **4 different taxonomy
   destinations at once**: Project Setup (Business Case, Project Brief, Project Mandate, PID),
   Scope & Deliverables (Work Packages, Product Descriptions, Project Product Description),
   Reports/Project Closure (Checkpoint/Highlight/Issue/Exception/End Stage/End Project Reports),
   and Governance (Communication/Configuration/Quality/Risk Mgmt Strategy, Document Governance,
   Governance Framework, Policies & Compliance, Stage Gate Reviews, Work Authorisations). There
   was never a clean 1:1 "Structured wrapper = Project Setup" mapping to begin with — a bare
   relabel (the pattern used for Cost Management/Reports/Testing/Documents) was never viable here.
3. **Harness-confirmed actual behaviour matches the code-structure prediction.** Running the real
   `wrapPmoMenuWithMethodologyTracks`/`filterMenuTreeByVisibleTracks` against a live snapshot for
   `pmo_admin` (the broadest-granted role) under 3 scenarios — Structured-only visible,
   Agile-only visible, all tracks visible — confirms: the "Structured" header disappears entirely
   under Agile-only visibility (track gating itself works correctly), but whenever it IS visible,
   it always bundles "Initiation Hub" (Project Setup-shaped) and "Governance & Standards"
   (Governance-shaped) together as children of the SAME single node — there is no scenario, no
   matter how `visibleTracks` is set, where "Project Setup" content renders as its own distinct
   top-level entry separate from "Structured".

**Conclusion: leave deferred, per the brief's own instructions for a "does not check out"
result.** Building "Project Setup"/"Scope & Deliverables" as track-scoped top-level groups is not
achievable by reusing the existing mechanism as-is — it would require either (a) extending
`METHODOLOGY_TRACK_DEFS` to support multiple headers per track (new visibility architecture,
explicitly out of this pass's scope per the brief), or (b) a deliberate, separately-decided
visibility-broadening choice per leaf (the `v966m` S-Curve pattern) that the PRD's own decision 8
("Project Charter... methodology variants preserved... not forced onto a single generic form")
suggests the user does NOT want applied blanket across Business Case/Mandate/Brief/PID/End
Project Report the way it was fine for the genuinely methodology-neutral S-Curve. Neither is a
"pick one, they're equivalent" choice this pass should make unilaterally. **New finding this
run, extending the same root cause**: Project Closure's still-open "Handover"/"Closure Checklist"
sub-leaves have the identical problem, not just Closure Report. `apps/platform/src/pages/
structured/ClosingProject.jsx` (route `/platform/projects/:projectId/structured/closing`, whose
one live-but-`is_deleted=true` menu row `governance_closing` confirms it was never wired at all)
is a combined PRINCE2 "Closing a Project" page with genuine Handover-checklist content
(`handover_status`, `documentation_complete`, `training_complete`,
`knowledge_transfer_complete`, `support_arrangements`) — but it lives in the `structured/` route
family alongside Checkpoint/End Project Reports, strongly suggesting the same Structured-track
visibility question applies. Not independently re-investigated in depth (would need its own
menu_items/methodology trace to confirm for certain), but flagged so a future run doesn't
mistake it for an independent, more-tractable gap — it's very likely the same systemic blocker,
not a separate one.

**Another pre-existing, unrelated bug found while harness-verifying `v966v` (not fixed, not in
scope):** the per-role menu_code duplicate scan flagged `pmo-cat-standards-based` (the
"Standards-Based" `[P]` track header's own category id) appearing twice in the rendered tree for
12 broadly-granted roles (`account_owner`, `pmo_admin`, `system_admin`, `project_manager`, and 8
others — exactly the same 12-role set as `plat_pm_a_scurve`'s grants, coincidentally, since these
are simply the system's "sees almost everything" roles). Confirmed present in BOTH the before-`
v966v` and after-`v966v` snapshots identically — genuinely pre-existing, not caused or worsened
by this run's change. Not investigated further (root cause not traced) and not fixed, per the
same "flag, don't silently fix unrelated bugs inside a taxonomy-migration pass" discipline used
for the Timesheets and `plat_pm_quality_testing` route-mismatch bugs found by prior runs — worth
a dedicated look in a future pass.

**DECISION RECORDED (2026-08-23) — Project Setup / Scope & Deliverables are now SETTLED OUT OF
SCOPE for this PRD, not deferred pending investigation.** Presented with the finding above, the
user was offered the choice between (a) building new per-leaf methodology visibility logic to
make these two groups real, or (c) leaving them out of the rationalised sidebar entirely. The
user initially chose (a); before any pipeline code was touched (only read-only investigation of
`wrapPmoMenuWithMethodologyTracks()`/`filterMenuTreeByVisibleTracks()` had happened), the user
reversed to **(c)**. Recorded as PRD decision 12 (see
`projectprd/v966_core_pm_menu_rationalisation_PRD.md`). Concretely this means:
- No `plat_pm_project_setup` / `plat_pm_scope_deliverables` category rows are created.
- None of Business Case, Mandate, Project Brief, PID, or Work Packages are re-parented — they
  stay exactly where they are today, inside the Structured track wrapper (`plat_grp_pm_pre_
  project` / `plat_grp_pm_proj_controls`), unchanged.
- This closes out 2 of the previously-"remaining 4 of 16" taxonomy groups — not by building them,
  but by a deliberate scope decision. Phase 9's effective target is now 14 groups (16 minus these
  2), of which 12 are done and 2 (Planning, Resources) remain partially open on their own
  unrelated sub-leaves (see below) — unrelated to the methodology-track-lock issue.
- **Does not extend to Closure Report / Handover / Closure Checklist** — those are suspected
  (not confirmed) to share the same Structured-track-lock root cause, but they weren't part of
  this specific (a)/(c) question and remain open, unresolved items within the still-partial
  Project Closure group. If/when they're investigated and confirmed to have the identical
  blocker, the natural default is the same (c)-style answer, but that has not been asked/decided
  yet and should be confirmed with the user rather than assumed.
- If a genuine per-leaf visibility build is ever wanted later, `menu_items.methodology` already
  exists as a per-row column and is the natural starting point — noted for a future pass, not
  attempted here.

### What was deliberately NOT attempted this run, and why

This run (3rd Phase 9 pass) completed 2 more full taxonomy groups by relabel (Testing, Documents,
both pure `menu_label` UPDATEs — see table above), plus 2 finishing touches on already-partial
groups (Resources > Resource Directory, Governance > Approvals fold-in). It also **investigated**,
rather than just re-deferred, every item the brief flagged as "needs investigation, not definitely
blocked": the Quality/Testing split (resolved — see Testing row above), Project Closure's Archive
ambiguity (investigated, genuinely confirmed ambiguous — see below), and Closure Report's
Structured-track-wrapper risk (investigated, confirmed a real, more general blocker — see below).

**Remaining 4 of 16 groups (Project Setup, Scope & Deliverables — 0% started; Planning, Resources
— partially done, remaining sub-leaves blocked) share ONE root cause, found this run:**

The methodology-track wrapping mechanism (`wrapPmoMenuWithMethodologyTracks` /
`filterMenuTreeByVisibleTracks` / `categoryMethodologyTrack` in `packages/config/src/
methodologyMenuUtils.js` and `pmoMenuHierarchyUtils.js`) operates at **category (level-2 group)
granularity only** — it wraps and filters whole top-level groups tagged as `trackCodes`-member
categories (e.g. the "Structured" track's `plat_sec_structured` and its direct children like
`plat_grp_pm_pre_project`, `plat_grp_pm_proj_controls`, `plat_grp_pm_del_reporting`). It does
**not** filter by an individual leaf row's own `methodology` field. Confirmed by grep: `node.
methodology` / `item.methodology` is never read anywhere in the actual rendering pipeline —
only `categoryMethodologyTrack(catId)` on a node's own `menu_code`.

Every candidate for Project Setup's content (Business Case `plat_pm_s_business_case`, 29 grants;
Mandate `plat_pm_s_mandate`, 27 grants; Project Brief `plat_pm_s_brief`, 28 grants; PID
`plat_pm_s_pid`, 19 grants) and Scope & Deliverables' main candidate (Work Packages
`plat_pm_s_work_packages`, 14 grants) are **all** `methodology: 'structured'` leaves nested
inside the Structured track wrapper today. Re-parenting any of them into a new universal
"Project Setup" or "Scope & Deliverables" group would silently **broaden their visibility to
Agile-track users** — the category-level wrap that currently keeps them Structured-only would no
longer apply, since the new parent isn't a track category. This is a real regression risk, not a
hypothetical one, and it's a bigger problem than Phase 8's already-known Project Charter case —
it affects essentially all of Project Setup's and half of Scope & Deliverables' natural content,
not just one leaf. **Closure Report's** closest match (`plat_pm_s_end_project`, "End Project
Report", 20 grants) has the exact same problem — it is one of 6 PRINCE2-style Structured-track
report artefacts (Checkpoint/Highlight/Issue/Exception/End Stage/End Project Reports) sharing a
`plat_grp_pm_del_reporting` track-category parent; there is no Agile-track equivalent to pair it
with, so forcing it into the universal Project Closure group would show a Structured-only PRINCE2
report to Agile projects with no corresponding artefact of their own.

**Recommendation for whoever attempts these next**: this isn't solvable by re-parenting alone.
Either (a) extend the track-wrapping mechanism to also respect a leaf's own `methodology` field
when its parent is a universal category (a real code change, needs its own design/testing pass),
or (b) accept the visibility broadening deliberately for specific leaves the way `v966m` did for
S-Curve & Baselines (methodology changed from `agile` to `universal` — but S-Curve is a genuinely
methodology-neutral technique; Business Case/Mandate/Brief/PID/End Project Report are not, by
design, per PRD decision 8's explicit intent to preserve methodology variants). Do not attempt a
plain re-parent without one of these decisions being made first.

- **Project Closure's Archive** — investigated, genuinely confirmed ambiguous (not merely
  unexplored): the live DB has exactly 2 different "archive" concepts and neither is a clean
  taxonomy match. `plat_archived_projects` ("Archived Projects", 12 grants, `/platform/projects/
  archived`) is a **Projects-list filter view** (an archived-state filter on the whole project
  list), not a per-project Closure workflow step. `plat_lc_vault`/`plat_lc_retention` ("Archive
  Vault"/"Archive Retention Rules", 3 grants each, `/pmo/authorisation/archive*`) is a
  **records-retention/compliance vault** feature, PMO/lifecycle-governance scoped, not a
  per-project closure artefact either. (A third row, `plat_pm_archives` "Archives / On Hold", 12
  grants, is actually the on-hold/draft queue — mislabeled, unrelated to either archive concept,
  left untouched — out of this investigation's scope.) Forcing either of the 2 real archive
  concepts into Project Closure > Archive would misrepresent what the feature actually does.
  Left deferred, same as the prior 2 runs, but now with a concrete "these are the 2 concepts and
  neither fits" answer instead of an open question.
- **Governance's remaining sub-leaves** (Stage Gates, Meetings) — no existing capability found
  for either during this run's investigation; genuine gaps, not mapping ambiguity. Actions was
  not investigated this run (Governance Action Register is Phase 12, a new-capability build, not
  a Phase 9 relabel/regroup candidate). **CORRECTED, 9th run (2026-08-24, content-gap follow-up
  pass) — this "no existing capability" claim was stale/wrong for both, never actually
  re-verified by any prior run despite being repeated across several.** Fresh investigation found:
  **Meetings** — a real, fully-built Comms Hub / Meetings feature exists
  (`apps/platform/src/pages/comms/{MeetingList,MeetingDetail,MeetingSchedule,MeetingRoom,
  MeetingSummaryView,MeetingExtractionReview}.jsx`, routed at `platformRoutes.jsx:1379`,
  `/platform/comms/meetings`) — wired mechanically, see `SQL/v966al` and its own detailed header.
  **Stage Gates** — also a real, fully-built page (`StageGateList/Form/View.jsx`, routed
  `/platform/stage-gates*`, menu row `plat_pm_s_stage_gates`, 18 grants) — found, but NOT wired:
  it is `methodology='structured'`, nested inside `plat_grp_pm_gov_standards`, one of the same 4
  Structured-track-locked groups (`plat_grp_pm_pre_project`/`plat_grp_pm_proj_controls`/
  `plat_grp_pm_del_reporting`/`plat_grp_pm_gov_standards`) documented in this section's own
  "systemic blocker" finding above for Business Case/Mandate/Brief/PID/End Project Report.
  Re-parenting it into the universal `plat_pm_governance` group would silently broaden its
  visibility to Agile-track users — the same regression risk PRD decision 12 exists to avoid.
  **RESOLVED (PRD decision 13, 2026-08-24): leave it out**, same as Project Setup/Scope &
  Deliverables — no re-parent, no new visibility architecture. Content stays reachable exactly
  where it already lives, under the Structured track.
- **PMO_CATEGORY_DEFS rebuild** — out of this PRD's decided scope per decision 11 (see above),
  not merely deferred for lack of time.
- **Simulator parity** — explicitly still deferred to Phase 14, unchanged from this plan's
  existing decision; not attempted alongside a still-partial Platform structure.

**4th-run update to the above**: Planning's "Schedule" sub-leaf (listed above as one of the
still-blocked Planning items) turned out NOT to share the Structured-track root cause — it was
simply the same "route-param substitution unconfirmed" class of gap as Phase 6's leftovers, now
resolved and wired via `v966v` (see the new subsection above and the completed-groups table's
row 13). Planning's remaining sub-leaves (Milestones/Dependencies/Calendars/Scenario Planning)
are still open for the reasons already stated. Resources' remaining sub-leaves
(Assignments/Timesheets) are unchanged — still blocked on a UX decision and a deliberately
unfixed pre-existing bug, respectively, per this same section's original text above.

### Harness (how to rebuild it — not committed to the repo)

The harness lived at the session scratchpad (`harness.mjs` + `apply_v966*.mjs` helper scripts +
cached `menu_items.json`/`role_menu_items.json`/`roles.json`), not committed as a repo file,
since the raw data snapshot goes stale the moment any SQL actually runs. To rebuild for the next
taxonomy group: (1) re-fetch fresh `menu_items`/`role_menu_items`/`roles` via PostgREST with
`Range` header pagination (1000-row cap applies to both tables); (2) write a harness script with
**static** top-level imports of the real `packages/config/src/*.js` files (dynamic `import()`
defeats esbuild's bundler tracing — Node's own resolver then fails on the extensionless internal
imports those files use); (3) bundle with `esbuild --bundle --platform=node --format=esm`;
(4) replicate `applyRoleSidebarRevamp`'s exact 'pm'-layout call sequence from `apps/platform/src/
hooks/useMenu.js` (given in the table above); (5) for each candidate SQL file, write a matching
`apply_v966*.mjs` that mutates a JSON copy the same way the SQL would, then diff harness output
across all live roles before/after.

The consolidating groundwork (Phases 1-8) is what made these 5 groups possible starting points —
RAID/Benefits/Change Control/Governance were each previously de-duplicated content with a single
canonical id, not multiple competing rows, so this phase was purely "which taxonomy bucket does
this already-canonical id belong in," not a re-run of the earlier consolidation work.

## Phase 10 — Remove empty stubs and superseded duplicates ✅ DONE (both bullets)

- [x] SQL: `SQL/v966g_phase10_remove_empty_stubs.sql`. All 8 empty `plat_sec_*` stub roots
      (Communication & Reporting, Quality & Testing, Quality & Assurance, Approvals &
      Reporting, Reporting & Controls, Approvals & Governance, Email & Notifications,
      Administration) freshly re-verified still childless (Phase 1 deliberately did not
      re-parent anything under Email & Notifications/Administration — see Phase 1 notes) and
      deactivated, along with their `role_menu_items` grants.
- [x] Duplicate rows that lost out to their canonical counterpart in Phases 2-5 were already
      deactivated directly inside `v966b`/`v966c`/`v966d`'s own statements at the time each
      phase ran — no separate action needed here.

## Phase 11 — Build Milestone Register (new capability) ✅ DONE (Platform sidebar wiring; Simulator sidebar deferred to Phase 14)

**Post-run fixes found during independent review (both apply to Phase 11 and 12 together):**
1. `SQL/v966z_phase12_governance_actions_view.sql` referenced `lessons.lesson_title` for the
   Lesson-actions source — the real column is `lessons.title` (confirmed via live PostgREST
   query: `lessons.lesson_title` returns `ERROR 42703 column does not exist`). The view would have
   failed to even `CREATE OR REPLACE` when run. Fixed. (Simulator's `v966aa` correctly used
   `practice_lesson_entries.lesson_title` — that table genuinely has a column by that name, per
   `SQL/v235_sim_daily_log_lessons.sql`'s own `CREATE TABLE`; only the Platform-side name was
   wrong.)
2. **`MilestonesListPage`/`MilestoneDetailPage`/`MilestoneForm`/`GovernanceActionsRegisterPage`
   were added to both apps' `lazyImports.js` and correctly used in `platformRoutes.jsx`/
   `simulatorRoutes.jsx`, but never added to `routeCommon.jsx`'s `const { ... } = LP`
   destructuring or its `export { ... }` block** — the same "missing from the `routeCommon.jsx`
   re-export chain" class of bug already hit twice earlier this session (Integrations, Project
   Calendar, Assumptions, Cost Actuals). Would have thrown `ReferenceError: <PageName> is not
   defined` at runtime for all 4 pages, in both apps. Fixed in both apps' `routeCommon.jsx`;
   confirmed via a full cross-reference audit (every JSX-used component now traced back to a real
   import) that no other pages were missed.
   Both fixes verified: `esbuild.transformSync` on every touched file, and the 4 new page files'
   `milestoneService`/`governanceActionService` test suites re-run independently (23 Platform + 15
   Simulator = 38 tests, matching the implementing agent's own count).

- [x] SQL: `SQL/v966w_phase11_milestones_schema.sql` — `public.milestones` + `sim.milestones`
      (`milestone_name`, `description`, `target_date` NOT NULL, `forecast_date`, `actual_date`,
      `status` CHECK IN planned/at_risk/achieved/missed/slipped, `owner_user_id`,
      `sequence_order`, `notes`, standard audit/soft-delete columns), plus `database_tables`
      registry rows for both. No display_id / Admin ID Generation (rule 16.2) — documented in the
      file header as the rule 16.3 UUID-in-URL exception, same call already made for Assumptions
      (`v963b`): a project-scoped internal register with no natural human-readable reference
      column, only ever opened from inside its own project's Planning menu.
- [x] SQL: `SQL/v966x_phase11_milestones_rls.sql` — `public.milestones` RLS copies
      `SQL/v366_activity_list_rls.sql`'s exact shape (project_memberships-or-admin-role SELECT;
      INSERT/UPDATE via the existing `public.can_write_pm_planning_document(project_id)` helper
      from `v356`, not redefined). `sim.milestones` RLS copies `v963b`'s `sim.assumptions` shape
      (practice_projects owner OR active `sim.practice_project_memberships` row, matched directly
      against `auth.uid()`).
- [x] SQL: `SQL/v966y_phase11_milestones_sidebar_wire.sql` — new `plat_pm_planning_milestones`
      ("Milestones") leaf under `plat_pm_planning` (from `v966m`), grants copied from the direct
      Planning sibling `plat_pm_a_scurve` (12 roles), same grant-copy pattern as `v966m`/`v966v`.
      **Platform sidebar only** — Simulator has no live `plat_pm_planning`-equivalent taxonomy
      group yet (Phase 9's Simulator mirror is still deferred to Phase 14), so no Simulator
      sidebar row was created; the Simulator CRUD capability itself is still fully built (see
      below) for rule 34.1 parity, just not yet reachable from the Simulator sidebar tree.
- [x] Service: `apps/platform/src/services/milestoneService.js` and
      `apps/simulator/src/services/milestoneService.js` — `listMilestones`, `getMilestone`,
      `createMilestone`, `updateMilestone`, `deleteMilestone` (soft), `getMilestoneSummary`
      (counts-by-status), `getUpcomingMilestones` (not-yet-achieved, nearest target date first).
      Unit tests: `apps/platform/src/services/__tests__/milestoneService.test.js` (10 tests) and
      `apps/simulator/src/services/__tests__/milestoneService.test.js` (8 tests) — both passing.
- [x] Pages, both apps, routed per rule 65 (no modal): `MilestonesListPage.jsx` (Table-List/Card
      toggle default Table-List, row numbers, sortable headers, search + status filter, export
      menu, icon-only View/Edit/Delete row actions via `RowActionButton`), `MilestoneForm.jsx`
      (create/edit, `useSuccessModal()` on save, `useUnsavedChangesGuard()`), `MilestoneDetailPage
      .jsx` (Details/Audit tabs via `DetailAuditTabList`, Identity/Classification/Record history
      audit cards). Platform: flat `/platform/milestones` route + `?projectId=` query param
      (`usePlatformProjectId()`, rule 16.1) — matches Assumptions/RAID's existing convention in
      this same taxonomy group. Simulator: `simulator/practice-projects/:projectId/milestones`
      path-segment convention (matches Assumptions' existing Simulator pattern exactly, including
      the bare-route inline project picker for when no `:projectId` is present). Theme-aware
      throughout (rule 28.1). Wired into `lazyImports.js` and `platformRoutes.jsx`/
      `simulatorRoutes.jsx` in both apps.
- [x] Dashboard widget: "Milestone Summary" — Platform's live `PMDashboard.jsx`
      (`apps/platform/src/pages/pm/PMDashboard.jsx`) gained 3 clickable stat tiles (Total / At
      Risk / Achieved, per rule 64) linking to `/platform/milestones` with the matching
      `?status=` filter, fetched in the same `Promise.allSettled` batch as the page's existing
      stats (rule 66 — no extra waterfall). Simulator's live dashboard is
      `SimulatorPMDashboard.jsx` (`apps/simulator/src/pages/simulator/pm/`) — **not**
      `apps/simulator/src/pages/pm/PMDashboard.jsx`, which mirrors the v882 "dead route tree" trap
      (imported in `simulatorRoutes.jsx` but never rendered in any `<Route>`, confirmed via grep
      before editing anything). `SimulatorPMDashboard.jsx` has no per-project context of its own
      (its existing risks/issues counts are already global, not project-scoped), so its new
      Milestone Summary tile is a global count-by-status card in the same style, linking to the
      bare Milestones list route.
- [x] Admin ID Generation (rule 16.2) — evaluated and explicitly not applied; see the schema SQL
      file's header for the rule 16.3 reasoning.

## Phase 12 — Build unified Governance Action Register (new capability) ✅ DONE (VIEW approach; Platform sidebar wiring; Simulator sidebar deferred to Phase 14)

**Judgment call — VIEW over table:** evaluated both options per the plan's own stub. A read-only
rollup VIEW (mirroring `SQL/v964a_unified_approvals_view.sql`'s precedent exactly) was chosen over
a new `governance_actions` table because the three source domains (Quality/Issue/Lesson actions)
are already real, live, independently-maintained tables with their own create/complete/cancel
flows on their own pages (`MyQualityActions.jsx`, `MyIssueActions.jsx`/`issue_actions` service,
`MyLessonActions.jsx`/`lesson_actions` service) — a synced table would either duplicate that
metadata (drift risk) or need trigger-sync logic that's nontrivial and different per source shape
(a polymorphic `activity_type`/`activity_id` link for Quality vs. direct FKs for Issue/Lesson). A
view can never drift stale relative to its sources and inherits each source table's RLS
automatically. Same reasoning v964a already used for Approvals; this is the second application of
that precedent, not a new pattern.

- [x] SQL: `SQL/v966z_phase12_governance_actions_view.sql` — `public.unified_governance_actions_v`,
      `UNION ALL` of `quality_activity_actions` (LEFT JOINed to `quality_reviews`/
      `quality_inspections` to resolve `project_id` through the polymorphic `activity_type`/
      `activity_id` link — `audit`/`test` activity types have no backing table in this codebase
      today and resolve to a NULL project, documented as a known gap in the file header, not
      silently worked around), `issue_actions` (joined to `issues`), and `lesson_actions` (joined
      to `lessons` → `lessons_logs` for `project_id`). `status` is normalised to a
      pending/resolved/cancelled bucket per source; `raw_status` preserves the literal value.
      READ-ONLY — no create/complete/cancel exposed here.
- [x] SQL: `SQL/v966aa_phase12_sim_governance_actions_view.sql` — `sim.unified_governance_actions_v`.
      **Not a blind mirror of the 3 Platform sources** — investigated first (same discipline
      `v964b` used for Simulator Approvals) and found: (a) `sim.practice_issue_actions`
      (`v233`) is a real, directly-comparable action table, used as-is; (b) **no Quality-action
      equivalent exists** — `sim.practice_quality_activities` (`v234`) models the activity itself
      (a review/inspection/testing/approval/audit event), not a corrective/preventive action
      arising from one, so Quality is **omitted from the sim view entirely** rather than mapping
      activities that were never actions — documented in the file header as a real content gap;
      (c) **no dedicated Lesson-action sub-table exists either** — `sim.practice_lesson_entries`
      (`v235`) carries `action_required`/`action_taken` as real status values on the lesson entry
      itself, so a lesson entry in either state is treated as one action row (coarser grain, but
      honest — not invented data); no assignee field exists at this grain, so `assigned_to` is
      NULL for every lesson-sourced row rather than guessed at from `identified_by_user_id` (a
      different concept).
- [x] SQL: `SQL/v966ab_phase12_governance_actions_sidebar_wire.sql` — new
      `plat_pm_governance_actions` ("Actions") leaf under `plat_pm_governance` (from `v966k`,
      extended by `v966u`'s Approvals fold-in), grants copied from the direct Governance sibling
      `plat_pm_s_decision_log` (Decision Log, 18 roles). **Platform sidebar only**, same
      Simulator-deferral rationale as Phase 11's `v966y`.
- [x] Service: `apps/platform/src/services/governanceActionService.js` and
      `apps/simulator/src/services/governanceActionService.js` — `getGovernanceActions({
      actionType, status, projectId, search, limit })` (mirrors `unifiedApprovalsService.js`'s
      shape exactly, including client-side search-by-label and a `resolveUserNames()` batch
      lookup), `buildActionViewPath()` (Platform: routes back to each domain's own "My Actions"
      page — `/platform/my-quality-actions`, `/platform/issues/my-actions`,
      `/platform/lessons/my-actions`; Simulator: routes back to
      `/simulator/practice-issue-register/:id` / `/simulator/practice-lessons-log/:id`, the real
      routed practice pages — **not** `MyQualityActions`/`MyIssueActions`/`MyLessonActions`, which
      are the same v882-style dead-import trap as `PMDashboard.jsx` above: imported in
      `simulatorRoutes.jsx` but never mounted in any `<Route>`, confirmed via grep). No
      create/complete/cancel — read-only, exactly like `unifiedApprovalsService.js`. Unit tests:
      13 tests (Platform) + 7 tests (Simulator), both passing.
- [x] Pages, both apps: `GovernanceActionsRegisterPage.jsx` — read-only filterable list (type +
      status + search), no create route, "View" navigates to `view_path` (same pattern as
      `UnifiedApprovalsRegisterPage.jsx`, which this file closely follows). Table-List/Card
      toggle, row numbers, sortable headers, export menu, theme-aware. Platform route:
      `/platform/governance-actions` (flat, global rollup — same shape as the existing Approvals
      register at `/pmo/approvals/register`, not project-scoped). Simulator route:
      `simulator/pmo/governance-actions/register` (mirrors Simulator's own Approvals register
      route shape). Wired into `lazyImports.js` and both route files.
- [x] Dashboard widget: "Upcoming Actions" — Platform's `PMDashboard.jsx` gained a 5-item pending-
      actions list (project-scoped via the view's `project_id` column, fetched in the same
      `Promise.allSettled` batch, rule 66), each item linking to its own `view_path`. Simulator's
      `SimulatorPMDashboard.jsx` gained a single global pending-count tile (matching its existing
      global-count widget style — no per-project context exists on that dashboard), counting
      `sim.practice_issue_actions` rows in pending/in_progress (Quality/Lesson omitted from this
      specific tile's count for simplicity — the full breakdown is one click away on the register
      page itself).

**Both phases:** `apps/platform/src/utils/menuCacheUtils.js`'s `SIDEBAR_CACHE_VERSION` bumped
58→59 in one change, covering both new Platform sidebar leaves (Milestones + Actions) together.
All new/modified JS/JSX files (18 total) were syntax-checked with `esbuild.transformSync` before
being treated as done — see Review section.

## Phase 13 — Verify/extend "Extend"-classified items ⏸️ NOT ATTEMPTED (lowest priority, per run scope)

Not attempted — explicitly lowest priority in this run's scope, and several of its candidate
items surfaced organically during Phases 4/6 instead (Timesheet Approval Settings' two dead
routes; the Testing Centre same-vs-different-page question) — see those phases' deferred notes.

## Post-close fixes (2026-08-25, after live use began) — 2 items, both PRD decisions 16-17

**1. "Project Setup" reversal (PRD decision 16).** Live use surfaced real findability friction:
Project Mandate/Brief/Business Case/Governance Framework/PIDs were reachable but buried under
"Structured" (decision 12's original resolution). Shown the tradeoff, the user chose to build
"Project Setup" as a real universal top-level group after all — `SQL/v981` re-parents these 5
already-live, already-granted leaves out of the Structured-track-locked `plat_grp_pm_pre_project`/
`plat_grp_gov_standards` groups into a new `plat_pm_project_setup` root (added to
`PM_CATEGORY_DEFS`, `packages/config/src/pmoSidebarCategories.js`). Same-id re-parents, no grant
migration. Scope & Deliverables, Closure Report, and Stage Gates are explicitly NOT reopened by
this — only Project Setup was reported as a problem.

**2. Cross-layout leak bug fix (PRD decision 17) — a genuine bug, not a decision.**
`reorganizeMenuRoots()`'s "surface new top-level categories" sweep
(`packages/config/src/pmoMenuHierarchyUtils.js`, the function shared by both PM and PMO layout
rendering) excluded non-`plat_pm_*` codes from the PM layout but had no mirror rule excluding
`plat_pm_*` codes from the PMO layout — so every Phase 9 top-level root (RAID, Governance,
Planning, etc., all literal DB orphans by design) was leaking into the PMO Admin's own dashboard
sidebar alongside `PMO_CATEGORY_DEFS`'s own, separately-maintained categories, producing the
confusing mixed/duplicated view the user reported (misdiagnosed at first as a stale-cache issue —
a hard refresh DID fix an actual separate stale-cache instance earlier in the same conversation,
which is what made the real bug harder to isolate). Fixed with a symmetric one-line exclusion;
verified via the full `packages/config` test suite (101/101 passing) and a live-data simulation
(built a throwaway harness bundling the real, patched file with esbuild against a live snapshot)
confirming zero `plat_pm_*` codes reach the PMO layout's rendered output.

**User's broader concern, addressed but not fixed today:** the user separately noted that
`PM_CATEGORY_DEFS`/`PMO_CATEGORY_DEFS` being hardcoded JS arrays at all conflicts with CLAUDE.md
rule 25.1 ("no hardcoding... sidebar/menu labels and hierarchy... prefer DB"). This is a valid,
standing architectural concern — the category-definition layer (unlike leaf-level menu_items,
which ARE fully DB-driven) has been hardcoded since long before this initiative. Fully eliminating
it (moving ~30 category definitions into a DB table, rewriting `reorganizeMenuRoots()` to read
from DB, re-testing both layouts end to end) is a substantial, separate architectural change — not
something to rush reactively mid-bug-fix. Recommended as a candidate for its own scoped PRD/
initiative; not started.

`SIDEBAR_CACHE_VERSION` bump still required for `v981` + the JS fix — see the running comment log
in `apps/platform/src/utils/menuCacheUtils.js` (bump to be applied alongside this file's write-up).

## Phase 14 — Simulator parity ✅ CLOSED FOR THIS PRD (PRD decision 15, 2026-08-24) — 2 low-risk
wins wired; full 14-group mirror deferred to a future initiative, not this plan's scope

**Investigated first, per this run's brief, before writing anything.** Read
`apps/simulator/src/hooks/useSimMenu.js` and `apps/simulator/src/hooks/useMenu.js` in full (these
are the real Simulator sidebar pipeline — `useSimMenu` reuses `useMenu.js`'s
`fetchMenuFromDBShared`/`applySimulatorMenuTransform`, which filters the SAME `public.menu_items`/
`public.role_menu_items` tables Platform uses down to `sim_pmo`/`sim_pm`-coded or
`/simulator/pmo/`- or `/simulator/pm/`-routed nodes — **there is no separate `sim.menu_items`
table**; confirmed directly via PostgREST, e.g. `sim_tm_comms`/`sim_pm_*` codes live in
`public.menu_items` alongside every `plat_*` code).

**Headline finding: Simulator's PM/PMO-layout taxonomy is a fundamentally different, and much
less mature, mechanism than what Phase 9 built for Platform — not a lagging mirror of it.**
- `SIM_PM_CATEGORY_DEFS`/`SIM_PMO_CATEGORY_DEFS` (`packages/config/src/pmoMenuHierarchyUtils.js`,
  lines 348-370) are each a small, coarse, fixed list — 8 and 10 buckets respectively (e.g.
  `sim_pm_cat_controls` = "Practice Controls & Registers", a single undifferentiated bucket) —
  matching Platform's *pre-v966* shape (before RAID/Benefits/Change Control/Governance/Quality/
  Project Closure were split out of one "Controls & Registers" catch-all), not the 14-group
  rationalised shape Phase 9 built.
- **Every one of these category ids is a synthetic, JS-only shell with zero backing `menu_items`
  row** — confirmed via a live query (`menu_code like 'sim_p%cat%'` returns nothing). This is the
  opposite of Platform's Phase 9 groups (`plat_pm_governance`, `plat_pm_planning`, etc.), which
  are all real DB rows a leaf can be given as a literal `parent_menu_id`. Every Simulator PM/PMO
  leaf without a real, already-resolvable DB parent is instead placed via `inferSimPmCategoryId()`/
  `inferSimPmoCategoryId()` — route/label regex matching on orphan nodes, the same *mechanism*
  Platform's orphan-bucketing uses, but here it is the ONLY mechanism, not a defensive fallback
  around a mostly-real DB hierarchy.
- Simulator does still have some genuine, real, DB-backed sub-groups from its own
  pre-rationalisation structure — e.g. `sim_grp_pm_controls` ("Practice Controls & Registers") >
  `sim_pm_ctrl_core` ("Core Controls"), which already holds Risk Register/Issue Register/Delay
  Register/Change Log/Assumptions Register as real children, exactly mirroring what Platform's own
  "Controls & Registers > Core Controls" held before Phase 2/9 rebuilt it. This is a genuine,
  usable anchor point for a handful of specific new leaves — not a foundation for a full 14-group
  mirror without further work.

**Conclusion (per this run's own explicit stop condition — "if it turns out to be far bigger than
expected... e.g. Simulator's sidebar architecture is structurally very different and a full
mirror would mean redesigning significant JS pipeline logic, not just writing SQL, STOP"): this
condition is confirmed true.** A full mirror of all 14 Platform taxonomy groups (RAID, Benefits,
Change Control, Governance, Cost Management, Planning, Resources, Quality, Testing, Documents,
Reports, Project Closure, plus Phase 1's Platform/Core-PM split and Phase 6's 5 leaves) into
Simulator would require inventing 12+ new `SIM_PM_CATEGORY_DEFS`/`SIM_PMO_CATEGORY_DEFS` entries
and matching `inferSimPmCategoryId`/`inferSimPmoCategoryId` regex branches for each, careful
ordering/testing against Simulator's ~121 existing `sim_pm_*` rows (which render correctly today
under the current 8-bucket scheme) to avoid regressing them, and its own harness-equivalent
verification pass. This is real, standalone JS pipeline design work — comparable in size to the
original Phase 9 effort itself, not a "wire it in" pass — and is **NOT attempted in this run**.
**Recommendation: scope it as its own dedicated follow-up initiative** (its own plan file,
`v967`-or-later), not a Phase 14 checkbox inside this PRD. It should decide, as a first design
question, whether Simulator's taxonomy should even MATCH Platform's 14-group shape 1:1, or
whether a coarser Simulator-appropriate taxonomy is intentional (Simulator's practice-scope
sidebar has historically been simpler than Platform's, e.g. `sim_pm_cat_controls` bundling what
Platform now splits 6 ways) — that is a product decision for the user, not something to infer
from Platform's shape alone.

**What WAS safely wired this run (small, low-risk, SQL-mostly, matching the brief's item 3 — "a
capability genuinely exists in Simulator but isn't wired... mirror as closely as Simulator's
actual architecture allows"):** the 2 new-capability registers Phase 11/12 explicitly built for
BOTH apps but left Simulator-sidebar-unwired pending this phase.
- **Milestone Register** — `SQL/v966am` — new `sim_pm_milestones` leaf under the already-real
  `sim_pm_ctrl_core` ("Core Controls") group, alongside the existing `sim_pm_assumptions_reg`.
  Zero JS change needed (a real DB parent bypasses orphan/inference classification entirely).
  Grants copied from `sim_pm_assumptions_reg` (3 roles).
- **Governance Action Register** — `SQL/v966an` — new `sim_governance_actions_register` root
  orphan row (PMO-scoped route `/simulator/pmo/governance-actions/register`, mirroring Simulator's
  existing "Approvals Register" route shape), landed under "Practice Workflows & Governance" via
  ONE new, small, precedented regex branch (`/governance action/`) added to
  `inferSimPmoCategoryId()` in `packages/config/src/pmoMenuHierarchyUtils.js` — the same size/class
  of fix already made 3 times earlier in this initiative for Capacity/Resource Directory/
  Timesheets (`v966n`/`v966t`/`v966ag`). Grants copied from `sim_unified_approvals_register`
  (7 roles). This is a single targeted classification fix, not a taxonomy redesign — it does not
  reopen the "full mirror is out of scope" conclusion above.
- Both changes verified: `esbuild --bundle` on the modified `pmoMenuHierarchyUtils.js` (clean, no
  errors) and the full `packages/config` test suite (101/101 passing, unchanged). No interactive
  browser/harness session was available this run (same constraint noted by the 6th run for
  `v966ac`-`v966ai`) — verification is direct live-data reasoning about the specific, narrow code
  paths touched (confirmed via reading `reorganizeMenuRoots`/`inferSimPmCategoryId`/
  `inferSimPmoCategoryId` directly, not assumed from this file's own prior summaries), not a full
  before/after harness diff across all Simulator roles. The user's own UI walkthrough (PRD testing
  decision) should still confirm both new entries render correctly before treating this as fully
  verified in production.
- `apps/simulator/src/utils/menuCacheUtils.js`'s `SIDEBAR_CACHE_VERSION` bumped 54→55 to cover
  both new leaves in one deploy.

**What was explicitly NOT attempted, and why:** Phase 1's Platform/Core-PM top-level split,
Phase 6's 5 leaves, and all 14 of Phase 9's rationalised taxonomy groups — none of these have a
Simulator-side equivalent wired, and none are attempted here, per the scoping conclusion above.
This is the accurate status: **Phase 14 is not "not attempted"** (2 real gaps are now closed) **and
not "done"** (the vast majority of what Phases 1/6/9/11/12 built on Platform has no Simulator
sidebar equivalent yet) — it is a scoped, partial pass with an explicit recommendation to treat
the remainder as separate, dedicated follow-up work.

## Phase 15 — Final review ⚠️ PARTIALLY DONE (for what was actually completed this run)

- [x] Sidebar audit for what changed: every SQL file above was verified against a fresh
      PostgREST query immediately before being written (menu_code, parent, route, live grant
      count), and every route touched was cross-checked against the actual `<Route>`
      registrations in `apps/platform/src/routes/` (not assumed from the audit documents alone)
      — per this task's own instruction to re-verify rather than copy stale audit data. Full
      cross-app sidebar walkthrough by a logged-in PMO Admin / Structured PM / Agile PM / Team
      Member account (the PRD's testing-decisions requirement) was **not** performed — this
      session had no interactive browser session available; the user should do this pass before
      treating Phases 1-10 as fully verified in production.
- [x] Confirmed no dangling references were introduced: every deactivation in v966b-v966g was
      paired with a grant migration where a live grant existed, and every re-parent target
      (`plat_grp_pm_teams`, `plat_grp_pm_reporting`, `plat_grp_pm_projects`, `plat_pm_ctrl_core`)
      was confirmed live and active immediately before use.
- [ ] `Documentation/` guide for the rationalised structure — not written this run; recommend
      writing it once Phase 9 (the actual full structure) is done, since a guide written now
      would describe an intermediate, partially-rationalised state.
- [x] Review section — see below.

---

## Content-Gap Follow-Up Run (2026-08-24, 9th run) — Part A (6 items) + Phase 14 scoping/wiring

This run's brief was two-part: (A) resolve the remaining documented content gaps from prior runs
(re-verifying each fresh, not trusting stale claims), and (B) attempt Phase 14 (Simulator sidebar
parity for what v966 built on Platform). Full Phase 14 write-up is in its own section above; this
section is Part A's per-item outcome, precise status for each of the 6 items.

1. **Planning > Schedule's 3 sub-leaves (Critical Path, Look-Ahead Plan, Schedule Variance) —
   CONFIRMED GENUINE GAPS, unchanged from prior runs.** Fresh search (grep across both apps'
   `src/`, fresh PostgREST query for any matching `menu_items` row): zero matches anywhere for
   "Look-Ahead Plan" or "Schedule Variance" as a standalone page/route/concept. "Critical Path"
   DOES exist, but only as an in-Gantt highlighting feature/toggle (`cpmCalculator.js`,
   `GanttChart.jsx`'s `showCriticalPath`/`is_critical_path`), not a standalone routable page —
   it is already reachable today via the already-wired Gantt leaf
   (`plat_pm_planning_gantt`, `v966v`), so there is no separate capability to wire a distinct
   sidebar leaf to. No SQL written for any of the 3.

2. **Project Closure > Final Acceptance — CONFIRMED GENUINE GAP, unchanged.** Fresh grep (both
   apps, "final acceptance"/"client acceptance"/"acceptance sign-off" family) and a fresh
   `menu_items` query (`menu_label ilike '%acceptance%'`) both return zero matches. No SQL
   written.

3. **Project Closure > Archive — CONFIRMED GENUINELY AMBIGUOUS, unchanged, still requires a user
   decision.** Fresh query of every live, non-deleted `menu_items` row with "archiv" in its label
   reproduces exactly the same 2 unrelated concepts a prior run found: `plat_archived_projects`
   ("Archived Projects", `/platform/projects/archived`) is a Projects-list archived-state filter,
   not a per-project Closure workflow step; `plat_lc_vault`/`plat_lc_retention` ("Archive
   Vault"/"Archive Retention", `/pmo/authorisation/archive*`) is a records-retention/compliance
   vault, PMO/lifecycle-governance-scoped. (`plat_pm_archives`, "Archives / On Hold", is
   confirmed unrelated — the on-hold/draft queue, mislabeled — same finding as before, left
   untouched.) Neither maps cleanly to taxonomy's per-project Closure > Archive. **Left
   deliberately unresolved — not unilaterally picked** — this run did not find a new fact that
   changes the prior conclusion, so per this run's own constraint it is flagged, not decided.

4. **Project Closure > Closure Report — LEFT OUT, by analogy to PRD decision 12 — CONFIRMED by the
   user (PRD decision 13, 2026-08-24).** Re-confirmed:
   its content lives at `plat_pm_s_end_project` ("End Project Report"), `methodology='structured'`,
   nested inside `plat_grp_pm_del_reporting`, one of the 4 groups Phase 9's own "systemic blocker"
   finding already established are Structured-track-locked (re-parenting into a universal group
   broadens visibility to Agile-track users — a real regression, not hypothetical, per the
   documented mechanism trace). No Agile-track equivalent artefact exists to pair it with. This is
   the exact same category of decision the user already made once, for Project Setup/Scope &
   Deliverables (PRD decision 12: leave out of the rationalised sidebar rather than build new
   per-leaf methodology-visibility architecture). Per this run's explicit brief, that same
   resolution is applied here: Closure Report stays out of the rationalised Project Closure group,
   its content stays reachable exactly where it already is (under the Structured track). **Flagged
   distinctly in the final report, per the brief's own instruction, as a decision extended by
   analogy, not a fact this run discovered independently** — the user should confirm or correct it.
   No SQL written (no re-parent attempted). Content stays reachable exactly where it already is.

5. **Governance's remaining sub-leaves (Stage Gates, Meetings) — BOTH INVESTIGATED FRESH FOR THE
   FIRST TIME (prior runs' "no capability found"/"unclear, needs investigation" status was never
   actually re-verified despite being repeated); found DIFFERENT outcomes for each.**
   - **Meetings — DONE.** A real, fully-built Comms Hub / Meetings feature was found
     (`apps/platform/src/pages/comms/Meeting*.jsx`, live route `/platform/comms/meetings`). Two
     live menu rows existed for it — a genuine same-page duplicate pair, consolidated and
     re-parented the same way every other Phase 9 duplicate was handled. See `SQL/v966al` for full
     detail (methodology confirmed `universal` on both sides — no Structured-track-lock risk,
     unlike item 4/Stage Gates below).
   - **Stage Gates — FOUND, BLOCKED, RESOLVED (PRD decision 13, 2026-08-24).** A real, fully-built
     page also exists (`StageGateList/Form/View.jsx`, live route `/platform/stage-gates*`,
     `plat_pm_s_stage_gates`, 18 grants) — but it is `methodology='structured'`, nested inside
     `plat_grp_pm_gov_standards`, the 4th of the same 4 Structured-track-locked groups named in
     item 4 above. Re-parenting it into `plat_pm_governance` carries the identical visibility-
     broadening risk. The user confirmed the same decision-12-style resolution as Closure Report:
     leave it out, reachable exactly where it already is under the Structured track. No SQL
     written for Stage Gates.
   - "Actions" (Governance Action Register) was correctly out of this item's scope — it is Phase
     12's new-capability build, not a Phase 9 relabel/regroup candidate, and is already done.

6. **Quality's combined Quality & Testing dashboard — RE-CONFIRMED NOT A GAP, no action needed.**
   No separate Quality-only page exists to split the combined dashboard into (same finding as
   `v966o`/`v966r` — `TestDashboard.jsx` is Testing-only content, and no distinct Quality-only
   dashboard component exists anywhere in the codebase). Nothing to do; matches the prior
   confirmed conclusion exactly.

**Files written this run:** `SQL/v966al_phase9_governance_meetings.sql` (item 5, Meetings),
`SQL/v966am_phase14_sim_milestones_sidebar_wire.sql` and
`SQL/v966an_phase14_sim_governance_actions_sidebar_wire.sql` (Phase 14, see its own section
above). One small JS change: `packages/config/src/pmoMenuHierarchyUtils.js`'s
`inferSimPmoCategoryId()` gained a `/governance action/` regex branch (paired with `v966an`).
`apps/platform/src/utils/menuCacheUtils.js` bumped 62→63 (Meetings);
`apps/simulator/src/utils/menuCacheUtils.js` bumped 54→55 (both Phase 14 leaves). All verified via
`esbuild --bundle` (clean) and the full `packages/config` test suite (101/101 passing, unchanged)
— no interactive browser/harness session was available this run, same constraint the 6th run
already noted for `v966ac`-`v966ai`; verification here is direct code/live-data reasoning about
the specific narrow paths touched, not a full before/after diff across all roles. The user's own
UI walkthrough should still confirm all 4 new/changed entries (Meetings' new location, Simulator
Milestones, Simulator Governance Actions) before treating this batch as production-verified.

**Items needing the user's decision — RESOLVED (2026-08-24):**
- **Stage Gates (item 5)** — **decided: leave out**, same as decision 12 (PRD decision 13). No
  SQL written; content stays reachable under the Structured track, unchanged.
- **Closure Report (item 4)** — **confirmed: leave out** (PRD decision 13). The decision-12-by-
  analogy resolution this run applied is now an explicit user decision, not just a judgment call.
- **Testing Centre vs. Testing** — **decided: coexist permanently** (PRD decision 14). No
  consolidation planned; both stay as separate Quality-group leaves.

- **Phase 14's full scope** — **decided (PRD decision 15): scope as its own future initiative**,
  not part of this PRD. v966 closes with only the 2 lowest-risk Simulator wins wired (Milestones,
  Governance Actions). The remaining 12 taxonomy groups, and whether Simulator should even match
  Platform's 14-group shape 1:1, are deferred to a future `v967`-or-later PRD/interview.

**Still open, not forced to a decision:**
- **Project Closure > Archive (item 3)** — still 2 unrelated concepts, neither a clean fit; no
  new information this run to force a pick. Remains a documented, deliberately-unresolved
  ambiguity — no SQL, no menu leaf. Not blocking v966's closure.

---

## Review — cumulative state across all runs to date

**Completed and SQL-written (v966a run and confirmed by the user; v966b-q written, not yet run):**
- Phase 0 — `SQL/v966a_phase0_delete_dead_menu_generations.sql` — **confirmed run successfully.**
- **Phase 1 — DONE (8th run closes it out).** Code change (`groupMenuTreeByIndustryPack()` in
  `packages/config/src/pmoMenuHierarchyUtils.js`, the REAL file — see the file-location trap note
  above) splits top-level infra codes into a separate "Platform" sidebar wrapper, sibling to
  "Core Project Management". Now covers 5 codes: `plat_sec_system_admin`/`plat_sec_account`
  (original run) plus `plat_grp_template_library`/`plat_grp_okr`/`plat_grp_process_groups`
  (8th run, re-parented via `SQL/v966aj`). 2 remaining candidates (`plat_xf_okr`,
  `plat_xf_integrations`) confirmed harness-inert, deliberately not added. Simulator equivalent
  deliberately deferred to Phase 14.
- Phase 2 — `SQL/v966b_phase2_raid_consolidation.sql`
- Phase 3 — `SQL/v966c_phase3_change_control_consolidation.sql`
- Phase 4 (partial) — `SQL/v966d_phase4_resources_consolidation.sql` (**post-run fix applied**:
  the Work Packages grant-migration INSERT originally hit `ERROR 21000: ON CONFLICT DO UPDATE
  command cannot affect row a second time` — 3 loser rows combined via one `IN(...)` could
  produce duplicate `(role_id, keeper.id)` pairs for any role granted more than one; fixed by
  deduping `role_id` in a subquery before the join. Corrected file is what's listed below.)
- Phase 5 (partial) — `SQL/v966e_phase5_calendar_rescue.sql`
- **Phase 6 — DONE (8th run closes it out).** `SQL/v966f_phase6_wire_unlinked_pages.sql` (RACI
  Matrix, Team Charter, S-Curve & Baselines), plus `SQL/v966v` (Activity Register/Gantt/
  Network-Dependencies, Run 5) and `SQL/v966ak` (8th run — Scope Statement, WBS Builder, Schedule
  Management Plan, Quality Reviews, Testing Centre).
- Phase 10 (both bullets) — `SQL/v966g_phase10_remove_empty_stubs.sql`
- **Phase 9 — 14 of 14 in-scope taxonomy groups + 2 finishing touches + 2 sub-group wires + 6
  further sub-leaf wires, across six runs (Phase 9's own run count — see Phase 9's "6th Phase 9
  run" subsection above; this is the same work as the Review section's global "Run 7", below):**
  - Run 2: RAID (`v966h`), Benefits (`v966i`), Change Control (`v966j`), Governance (`v966k`),
    Cost Management relabel (`v966l`).
  - Run 3: Planning partial (`v966m`), Resources partial (`v966n`), Quality partial (`v966o`),
    Reports relabel (`v966p`), Project Closure partial (`v966q`).
  - Run 4: Testing relabel (`v966r`), Documents relabel (`v966s`), Resources
    finishing — Resource Directory (`v966t`), Governance > Approvals fold-in (`v966u`).
  - Run 5: Planning > Schedule sub-group wired (`v966v` — Activity Register / Gantt /
    Network-Dependencies). Also investigated (and confirmed does NOT check out, see Phase 9's new
    subsection above) the recommended track-scoped-group approach for Project Setup / Scope &
    Deliverables.
  - Run 6 (this run, global "Run 7" — see Review section below): Planning's Dependencies 2nd
    location (`v966ac`), Calendars 2nd location (`v966ad`), Scenario Planning (`v966af`);
    generic Calendar duplicate-cluster consolidation (`v966ae`); Resources' Timesheets
    (`v966ag`) and Assignments (`v966ah`); Project Closure's combined "Closing a Project" hub
    (`v966ai`). This closes out Planning and Resources as fully taxonomy-complete. Verified via
    direct live PostgREST re-query of every referenced menu_code/route/grant-count immediately
    before writing each file (no harness/interactive browser session was available this run —
    see each file's own header for its specific live-data checks and the 2 live-data corrections
    found: `plat_pm_lessons_ctrl`'s grant count had drifted from the Phase 9 table's recorded 18
    to a fresh 12, and the Closure hub's real registered route is
    `/platform/projects/:projectId/closure`, not the originally-assumed `.../structured/closing`).
  - All 15 runs-1-through-5 files harness-verified (before/after diff across all 111 live roles, using the real
    `packages/config/src/*` functions bundled with esbuild against a live data snapshot — full
    method in Phase 9's own section above). All were independently re-reviewed by hand after each
    run (SQL correctness, live-DB cross-check of every referenced menu_code, `esbuild` compile
    check on both modified JS files, full `packages/config` test suite — 101/101 passing every
    time) — this is not solely the implementing agent's own self-report. Run 4 additionally
    re-verified the real (not simulated) JS changes produce byte-identical harness output to the
    simulation, across all 111 roles. Run 5 re-fetched `menu_items`/`role_menu_items`/`roles`
    fully fresh (not reused from Run 4's cache — see Phase 9's data-freshness note) before
    harness-verifying `v966v`.
  - Matching `PM_CATEGORY_DEFS` / `inferPmPlatformCategoryId` JS changes are in the real
    `packages/config/src/pmoSidebarCategories.js` / `pmoMenuHierarchyUtils.js`. Run 5 made no JS
    changes — `v966v`'s new Schedule sub-group nests under the already-recognised `plat_pm_planning`
    category, so no new `PM_CATEGORY_DEFS` entry or `inferPmPlatformCategoryId` fix was needed.
  - `apps/platform/src/utils/menuCacheUtils.js`'s `SIDEBAR_CACHE_VERSION` bumped four times to
    cover Phase 9 work: 54→55 (first 5 groups), 55→56 (second 5 groups), 56→57 (Testing/Documents
    relabels + Resources/Governance finishing touches), 57→58 (Planning > Schedule wire). Run 6
    (Phase 11/12) bumped it once more, 58→**59**, covering both new Platform sidebar
    leaves (Milestones under Planning, Actions under Governance) in one deploy. Without this, any
    browser with an already-cached sidebar tree keeps showing the pre-change shape for up to 10
    minutes (the cache TTL) regardless of the DB/JS changes underneath.
  - **Run 7 (this run) did NOT bump `SIDEBAR_CACHE_VERSION`** — this run's task was scoped as
    SQL-file-writing only (no JS edits), and none of the 7 new leaves needed a matching
    `inferPmPlatformCategoryId`/`PM_CATEGORY_DEFS` fix (each file's dedupe check confirmed no
    orphan-bucketing collision). Flagged rather than made unilaterally, since it was outside that
    run's SQL-only scope. **Applied during independent re-verification of this run's SQL**:
    `apps/platform/src/utils/menuCacheUtils.js`'s `SIDEBAR_CACHE_VERSION` bumped 59→**60**,
    covering all 7 new/changed Platform sidebar leaves in this batch (Planning's Dependencies/
    Calendars/Scenario Planning leaves, the calendar consolidation, Resources' Time Entry/
    Approvals relabels, the Assignments re-parent, and the new "Closing a Project" hub) in one
    deploy — a JS-only change, no SQL involved, so it did not need to go through the
    user-runs-every-SQL-file constraint.

- **Run 6 (this run, Phase 11/12 — new capabilities, not menu reorganisation):** built the
  Milestone Register and unified Governance Action Register as real new capabilities per PRD
  decision 5. Full detail in Phase 11/12's own sections above; summary:
  - Milestone Register: `public.milestones`/`sim.milestones` (`v966w` schema, `v966x` RLS,
    `v966y` Platform sidebar wire), `milestoneService.js` (both apps, 18 unit tests total),
    List/Form/Detail pages (both apps, rule 65/61/40/41/44/63.1/16/52/38/28.1 throughout),
    "Milestone Summary" dashboard widget (both apps' live PM dashboards).
  - Governance Action Register: chose a read-only rollup VIEW over a new table (judgment call,
    reasoning in Phase 12's section above) — `public.unified_governance_actions_v` (`v966z`),
    `sim.unified_governance_actions_v` (`v966aa`, Issue + Lesson actions only — no sim-side
    Quality-action table exists, documented gap), Platform sidebar wire (`v966ab`),
    `governanceActionService.js` (both apps, 20 unit tests total), read-only filterable list page
    (both apps), "Upcoming Actions" dashboard widget (both apps).
  - **Both new sidebar leaves are Platform-only** — Simulator has no live Phase-9-equivalent
    taxonomy groups (`plat_pm_planning`/`plat_pm_governance`) yet, since Phase 9's Simulator
    mirror remains deferred to Phase 14. Simulator's own CRUD/register capability is fully built
    for rule 34.1 parity regardless — just not yet reachable from the Simulator sidebar tree.
  - Two dead-import traps found and avoided (same v882 pattern already documented in this
    codebase's memory notes): `apps/simulator/src/pages/pm/PMDashboard.jsx` and
    `MyQualityActions`/`MyIssueActions`/`MyLessonActions` are all imported in
    `simulatorRoutes.jsx` but never mounted in any `<Route>` — confirmed via grep before treating
    either as a real integration point. The dashboard widget went into the actually-mounted
    `SimulatorPMDashboard.jsx` instead; the Simulator `governanceActionService`'s `view_path`
    routes to the real mounted practice pages (`practice-issue-register`/`practice-lessons-log`)
    instead.
  - All 18 new/modified JS/JSX files syntax-checked with `esbuild.transformSync` (zero errors).
    `packages/config` test suite re-run and confirmed still 101/101 (untouched by this run — no
    `packages/config/src/*` files were edited in Phase 11/12). New service test files: 10 + 8
    (milestoneService, Platform + Simulator) + 13 + 7 (governanceActionService, Platform +
    Simulator) = 38 new tests, all passing.

**SQL files the user needs to run, in order** (each is idempotent/guarded where it inserts new
rows, and only deactivates — never hard-deletes — existing rows):
1. ~~`SQL/v966a_phase0_delete_dead_menu_generations.sql`~~ — **already run.**
2. `SQL/v966b_phase2_raid_consolidation.sql`
3. `SQL/v966c_phase3_change_control_consolidation.sql`
4. `SQL/v966d_phase4_resources_consolidation.sql` (corrected version — see fix note above)
5. `SQL/v966e_phase5_calendar_rescue.sql`
6. `SQL/v966f_phase6_wire_unlinked_pages.sql`
7. `SQL/v966g_phase10_remove_empty_stubs.sql`
8. `SQL/v966h_phase9_raid_taxonomy_group.sql`
9. `SQL/v966i_phase9_benefits_taxonomy_group.sql`
10. `SQL/v966j_phase9_change_control_taxonomy_group.sql`
11. `SQL/v966k_phase9_governance_taxonomy_group.sql`
12. `SQL/v966l_phase9_cost_management_relabel.sql`
13. `SQL/v966m_phase9_planning_taxonomy_group.sql`
14. `SQL/v966n_phase9_resources_taxonomy_group.sql`
15. `SQL/v966o_phase9_quality_taxonomy_group.sql`
16. `SQL/v966p_phase9_reports_relabel.sql` — **must run after `v966m`** (relies on S-Curve &
    Baselines already having moved out of the Reporting group; harmless either order in practice
    since it's a label-only UPDATE, but keep this order to match each file's own stated
    precondition).
17. `SQL/v966q_phase9_project_closure_taxonomy_group.sql`
18. `SQL/v966r_phase9_testing_relabel.sql`
19. `SQL/v966s_phase9_documents_relabel.sql`
20. `SQL/v966t_phase9_resources_finishing_resource_directory.sql` — **must run after `v966n`**
    (relies on `plat_pm_resources` already existing).
21. `SQL/v966u_phase9_governance_approvals_foldin.sql` — **must run after `v966k`** (relies on
    `plat_pm_governance` already existing).
22. `SQL/v966v_phase9_planning_schedule_wire.sql` — **must run after `v966m`** (relies on
    `plat_pm_planning` already existing). No JS deploy dependency (see Run 5 note above — no JS
    changes were needed for this file).
23. `SQL/v966w_phase11_milestones_schema.sql` (Phase 11 — new `public.milestones`/`sim.milestones`
    tables, no dependency on any other `v966*` file).
24. `SQL/v966x_phase11_milestones_rls.sql` — **must run after `v966w`** (relies on `public.
    milestones`/`sim.milestones` existing) **and after `SQL/v356_scope_management_plans_rls.sql`**
    (relies on `public.can_write_pm_planning_document` already existing — this is a pre-existing
    base-schema file, not part of this initiative, so only relevant if running against a fresh DB).
25. `SQL/v966y_phase11_milestones_sidebar_wire.sql` — **must run after `v966m`** (relies on
    `plat_pm_planning` existing) **and after `v966w`/`v966x`** (the table this menu item points
    at). No JS deploy dependency — `plat_pm_planning` is already a recognised `PM_CATEGORY_DEFS`
    category from `v966m`, so this new leaf nests under it with no further JS change needed.
26. `SQL/v966z_phase12_governance_actions_view.sql` (Phase 12 — new `public.
    unified_governance_actions_v` view, no dependency on any other `v966*` file).
27. `SQL/v966aa_phase12_sim_governance_actions_view.sql` (Phase 12 Simulator mirror — independent
    of `v966z`, no dependency on any other `v966*` file).
28. `SQL/v966ab_phase12_governance_actions_sidebar_wire.sql` — **must run after `v966k`** (relies
    on `plat_pm_governance` existing) **and after `v966z`** (the view this menu item points at).
    No JS deploy dependency, same reasoning as `v966y`.
29. `SQL/v966ac_phase9_planning_dependencies_second_location.sql` — **must run after `v966m`**
    (relies on `plat_pm_planning` existing) **and after `v966b`** (relies on
    `plat_pm_dependencies_reg` existing, the grant-copy source). No JS deploy dependency.
30. `SQL/v966ad_phase9_planning_calendar_second_location.sql` — **must run after `v966m`** (relies
    on `plat_pm_planning` existing) **and after `v966e`** (relies on `pm_project_calendar`
    existing/live, the grant-copy source). No JS deploy dependency.
31. `SQL/v966ae_phase9_calendar_consolidation.sql` — independent of every other `v966*` file (all
    4 rows it touches — `plat_pm_calendar`/`plat_pm_leave_cal`/`plat_tm_calendar`/
    `plat_tm_team_calendar`/`plat_pm_task_calendar`/`plat_tm_task_calendar` — already exist
    outside this initiative's new rows). No JS deploy dependency.
32. `SQL/v966af_phase9_planning_scenario_planning.sql` — **must run after `v966m`** (relies on
    `plat_pm_planning` existing) **and after `v966m`'s own S-Curve step** (relies on
    `plat_pm_a_scurve` being live, the grant-copy source — already true once `v966m` is run). No
    JS deploy dependency.
33. `SQL/v966ag_phase9_resources_timesheets.sql` — **must run after `v966n`** (relies on
    `plat_pm_resources` existing). No JS deploy dependency — no matching `inferPmPlatformCategoryId`
    fix is needed for either re-parented row (see file header's dedupe check).
34. `SQL/v966ah_phase9_resources_assignments.sql` — **must run after `v966n`** (relies on
    `plat_pm_resources` existing). No JS deploy dependency, same reasoning as `v966ag`.
35. `SQL/v966ai_phase9_project_closure_closing_hub.sql` — **must run after `v966q`** (relies on
    `plat_pm_project_closure` existing) **and after `v966q`'s own Lessons Log step** (relies on
    `plat_pm_lessons_ctrl` being live, the grant-copy source — already true once `v966q` is run).
    No JS deploy dependency.
36. `SQL/v966aj_phase1_platform_infra_reparent.sql` (8th run, Phase 1's 4 remaining items) —
    independent of every other `v966*` file (re-parents 3 already-existing rows —
    `plat_grp_template_library`/`plat_grp_okr`/`plat_grp_process_groups` — no new rows inserted).
    **Must run only once the matching JS change is deployed**
    (`PLATFORM_INFRA_TOP_LEVEL_CODES` in `packages/config/src/pmoMenuHierarchyUtils.js` gaining
    those 3 codes — already applied in the working tree as of this run, not yet deployed/committed).
37. `SQL/v966ak_phase6_remaining_leaves_wire.sql` (8th run, Phase 6's final 5 items) — **must run
    after `v966m`** (relies on `plat_pm_planning` existing, the parent for Scope Statement/WBS
    Builder) **and after `v966v`** (relies on `plat_pm_planning_schedule` existing, the parent for
    Schedule Management Plan) **and after `v966o`** (relies on `plat_pm_quality` existing, the
    parent for Quality Reviews/Testing Centre). No JS deploy dependency — all 5 new leaves nest
    under already-recognised `plat_pm_*` categories, same reasoning as `v966ac`/`v966ad`/`v966af`.
38. `SQL/v966al_phase9_governance_meetings.sql` (9th run, content-gap follow-up — Governance >
    Meetings) — **must run after `v966k`/`v966u`** (relies on `plat_pm_governance` existing). No
    JS deploy dependency — `plat_tm_meetings` is re-parented onto an already-recognised
    `plat_pm_*` category, same reasoning as `v966ag`/`v966ah`.
39. `SQL/v966am_phase14_sim_milestones_sidebar_wire.sql` (9th run, Phase 14 partial) — **must run
    after `v966w`** (relies on `sim.milestones` existing) — independent of every other `v966*`
    file otherwise (`sim_pm_ctrl_core` is a pre-existing row, not created by this initiative). No
    JS deploy dependency.
40. `SQL/v966an_phase14_sim_governance_actions_sidebar_wire.sql` (9th run, Phase 14 partial) —
    **must run after `v966aa`** (relies on `sim.unified_governance_actions_v` existing) **and
    after the matching JS change is deployed** (`inferSimPmoCategoryId`'s new
    `/governance action/` branch in `packages/config/src/pmoMenuHierarchyUtils.js`, already
    applied in the working tree as of this run, not yet deployed/committed) — otherwise the new
    row still renders, just under the generic default bucket instead of alongside Approvals
    Register.

~~**All of `v966h`-`v966v` should be run only once the corresponding JS changes are deployed.**~~
**Confirmed: the user has run the entire `v966a`-`v966ab` batch successfully.** Two real bugs were
found and fixed by independent review *after* the implementing agents' own reports but *before*
this run — see the "Post-run fixes found during independent review" note under Phase 11's header
(the `lessons.lesson_title` → `lessons.title` column-name bug in `v966z`, and the
`routeCommon.jsx` missing-re-export bug affecting all 4 new Milestone/Governance-Action pages in
both apps). Both were fixed in place before the user ran anything, so the batch that was actually
run already includes both fixes.

**Confirmed: the user has run `v966ac`-`v966ai` successfully** — a post-run live re-query
confirmed all 4 new leaves (Planning's Dependencies/Calendars/Scenario Planning, Project Closure's
Closing a Project hub) active with correct parents and exact expected grant counts, both calendar-
cluster losers and the Assignments duplicate correctly deactivated, both keepers active.

**Confirmed: the user has run `v966ak` successfully (with an in-flight rewrite — see below).**
`v966aj` is still newly written and NOT yet run — it depends on the matching JS change
(`PLATFORM_INFRA_TOP_LEVEL_CODES`, already applied in the working tree) being deployed first.

**Confirmed: the user has run `v966al`/`v966am`/`v966an` successfully** — a post-run live
re-query confirmed: `plat_tm_meetings` active, correctly re-parented under `plat_pm_governance`,
route fixed to `/platform/comms/meetings`, 6 grants unchanged; `pmo-comms-meetings` correctly
deactivated; `sim_pm_milestones` active under `sim_pm_ctrl_core` with 3 grants; `sim_governance_
actions_register` active (orphan-classified via the new `inferSimPmoCategoryId` regex branch, as
designed) with 7 grants. Every value matches the file headers' claims exactly.

**Tooling note, not a SQL defect (2026-08-24):** while running `v966ak`, Supabase Studio's SQL
Editor reproducibly threw `ERROR: 42P01: relation "a" does not exist` on several of the file's
statements — including, after bisection, a single standalone `INSERT ... SELECT` with zero joins
and zero aliases, which cannot genuinely produce that error from valid SQL (no `a` identifier
existed anywhere in the file). The pattern (first query in a browser session succeeds, everything
after fails identically regardless of content) pointed at a client-side quirk in Studio's editor,
not the database or the SQL. Rather than keep fighting Studio's internals, `v966ak` was rewritten
from `INSERT INTO ... SELECT (scalar subquery in the SELECT list) ... WHERE NOT EXISTS (...) AND
EXISTS (...)` to an equivalent `WITH parent AS (...) INSERT INTO ... SELECT ... FROM parent WHERE
NOT EXISTS (...)` form for all 5 items — semantically identical (a missing parent still yields
zero rows, so the insert is still safely skipped), but resolves the parent lookup via a normal
`FROM` instead of a subquery nested in the SELECT list. The rewritten form ran cleanly for all 5
items. **Applies as a general pattern for any future `v966*` file**: if Studio's SQL Editor throws
an unexplained `relation "<single-letter>" does not exist` error on SQL that's independently
verified clean, try restructuring a scalar-subquery-in-SELECT-list shape into a CTE before
assuming the SQL itself is wrong.

**Deferred, with reasons (see each phase's section above for full detail):**
- **Phase 1 — now fully resolved, 8th run.** Email & Notifications/Administration were already
  resolved by an earlier run (confirmed empty stubs, deactivated by Phase 10). Of the other 4:
  Template Library, Strategy & OKRs' GROUP variant (`plat_grp_okr`), and Process Group Forms are
  now re-parented and promoted into "Platform" (`SQL/v966aj`) — harness-confirmed safe, zero
  loss/duplication across all 111 roles at both PMO and PM layouts. Strategy & OKRs' LEAF variant
  (`plat_xf_okr`) and Integrations (`plat_xf_integrations`) are confirmed **inert** (not merely
  risky) — both are childless leaves individually reclassified by
  `inferPlatformCategoryId()`/`inferPmPlatformCategoryId()` before ever reaching the top level
  `groupMenuTreeByIndustryPack()` checks, so re-parenting them has zero rendering effect; named,
  not vaguely deferred — see Phase 1's own section above and the code comment above
  `PLATFORM_INFRA_TOP_LEVEL_CODES` for the exact mechanism per item. Integrations is additionally
  flagged as a genuine, pre-existing, unrelated bug (completely absent from the PMO sidebar today
  despite 12 live grants) worth its own follow-up fix.
- Phase 4's Timesheets/Approvals retarget — **now done, 6th run**: not the original dead
  `platform_timesheet_approval_settings`/`pmo_timesheet_approval_settings` routes (those remain
  genuinely dead, unrelated feature, still not built) — instead `SQL/v966ag` re-parents the real,
  live `plat_tm_timesheets`/`plat_tl_timesheet_mgmt` rows into Resources, which is what taxonomy
  §3's "Resources > Timesheets" actually needed. Phase 4's Assignments regroup — **now done, 6th
  run**: `SQL/v966ah`, user decision resolved the UX question (ProjectUsers is the sole anchor,
  ManagerAssignments/Appointments stay separate) — see Phase 9's new table rows above.
- Phase 5's calendar retirement — **now done, 6th run (reframed)**: the feature comparison this
  bullet was waiting on found the "retire into schedule calendar" premise itself was wrong (an
  events calendar vs. a working-hours settings form — not a safe merge); resolved instead as a
  same-page duplicate consolidation (`SQL/v966ae`) plus a Planning > Calendars 2nd-location leaf
  (`SQL/v966ad`) — see Phase 5's own section above.
- **Phase 6 — now fully resolved, 8th run.** Activity Register/Gantt/Network-Dependencies were
  already done (`v966v`, Planning > Schedule sub-group, Run 5). The final 5 (Scope Statement, WBS
  Builder, Schedule Management Plan, Quality Reviews, Testing Centre dashboard) are now wired
  (`SQL/v966ak`) — all 5 turned out to already have live, registered routes (the route-param and
  same-vs-different-page questions this bullet was waiting on both resolved cleanly, see Phase 6's
  own section above for the full per-item detail). Testing Centre's placement carries one
  **NEEDS USER CONFIRMATION** product decision (coexist with vs. eventually replace the existing
  "Testing" entry) — the safe additive-coexistence default was applied, not silently assumed as
  final; see Phase 6's section above.
- Phases 7 and 8 — Phase 7 (Assumptions dual-location) is now **done** as part of `v966m`'s
  Planning group (PRD decision 7 — see Phase 9's write-up). Phase 8 (Project Charter nesting)
  is now **closed as not applicable**, not blocked — it depended on "Project Setup" existing as
  a taxonomy group, which PRD decision 12 (2026-08-23) settled as explicitly out of scope; Project
  Brief/PID stay exactly where they already are per decision 8 (both preserved as separate
  Structured-track artefacts, not merged).
- **Phase 9 — 14 of 14 in-scope taxonomy groups + 2 finishing touches + 2 sub-group wires + 6
  further sub-leaf wires done** (RAID, Benefits, Change Control, Governance [+ Approvals
  fold-in + Actions], Cost Management, **Planning [now complete — Schedule, Baselines, Planning
  Assumptions, Milestones, Dependencies 2nd location, Calendars 2nd location, Scenario Planning
  all wired]**, **Resources [now complete — Capacity, Resource Directory, Timesheets,
  Assignments all wired]**, Quality [partial — combined dashboard not split], Testing [relabel],
  Documents [relabel], Reports [relabel], Project Closure [Lessons Log + the new Closing a
  Project hub — Final Acceptance/Archive/Closure Report remain genuine gaps, see below]),
  harness-verified for runs 1-5 across all 111 live roles; the 6th run's 7 new files
  (`v966ac`-`v966ai`) were live-verified via direct PostgREST re-query of every referenced
  menu_code/route/grant-count rather than the harness (no interactive session available this
  run; same "re-verify against fresh live data" discipline, different verification method — see
  each file's own header for its specific live-data checks). **Confirmed: the user has run
  `v966ac`-`v966ai` successfully — a post-run live re-query confirms all 4 new leaves
  (`plat_pm_planning_dependencies`/`plat_pm_planning_calendar`/`plat_pm_planning_scenarios`
  under `plat_pm_planning`; `plat_pm_project_closure_closing` under `plat_pm_project_closure`)
  are active with the correct parent and exact expected grant counts (24/4/12/12), both
  calendar-cluster losers and the `plat_members_roles`/Assignments loser are correctly
  deactivated, and both keepers (`plat_pm_calendar`, `plat_pm_task_calendar`,
  `plat_pm_manage_members` relabeled "Assignments") remain active.** **`Project
  Setup` and `Scope & Deliverables` are SETTLED OUT OF SCOPE (decision recorded 2026-08-23, PRD
  decision 12)** — not deferred, not blocked, a deliberate user decision after the
  track-scoped-group approach was investigated and found not to check out (see the systemic
  Structured-track-lock finding below): their content stays where it already lives today, under
  the existing "Structured" methodology-track section, unchanged.
  Planning's only remaining gap is 3 Schedule sub-leaves with no confirmed page anywhere in the
  codebase (Critical Path / Look-Ahead Plan / Schedule Variance) — a genuine content gap, not a
  taxonomy-wiring gap. Project Closure's remaining sub-leaves (Final Acceptance/Archive/Closure
  Report) and Governance's remaining sub-leaves (Stage Gates/Meetings) are also still open —
  Closure Report still suspected (not confirmed) to share the Structured-track-lock root cause;
  **this is now confirmed NOT to extend to Closure Checklist/Outstanding Items/Handover/Benefits
  Transition**, since the 6th run's `v966ai` successfully wired all 4 as a combined "Closing a
  Project" hub leaf under the plain-universal `plat_pm_project_closure` category (not
  track-wrapped) with zero visibility-broadening risk — only Closure Report's own closest match
  (End Project Report) remains genuinely trapped inside the Structured track wrapper, since that
  content lives on a *different* page than `ClosingProject.jsx`. `PMO_CATEGORY_DEFS` remains
  explicitly out of scope per PRD decision 11 (a settled decision, not a time constraint).
- **New this run — a systemic blocker found, not just isolated ambiguity**: Project Setup, Scope
  & Deliverables, and Project Closure's Closure Report all share one root cause. The
  methodology-track visibility mechanism (`wrapPmoMenuWithMethodologyTracks` /
  `filterMenuTreeByVisibleTracks`) filters at **category (level-2 group) granularity only**, not
  by an individual leaf's own `methodology` field — confirmed by grep, that field is never read
  in the actual rendering pipeline. Every natural content candidate for Project Setup (Business
  Case, Mandate, Project Brief, PID) and half of Scope & Deliverables' (Work Packages) is a
  `methodology: 'structured'` leaf living inside the Structured track wrapper; re-parenting any
  of them into a universal group would silently broaden their visibility to Agile-track users —
  a real regression, not a hypothetical one. Closure Report's closest match (End Project Report)
  has the identical problem with no Agile-track equivalent to pair it with. See Phase 9's "what
  was deliberately NOT attempted" section above for the full finding and a recommendation for
  whoever attempts these next (either extend the track mechanism to respect leaf-level
  `methodology`, or make a deliberate per-leaf visibility-broadening decision the way `v966m` did
  for S-Curve — do not attempt a plain re-parent without one of these first).
  **Run 5 update**: this run's specific task was to check whether the SAME mechanism that makes
  "Structured"/"Standards-Based"/"Agile" their own track-scoped top-level groups could be reused
  for "Project Setup"/"Scope & Deliverables" (a track-scoped-GROUP approach, not option (a)/(b)
  above). Investigated with 3 independent lines of evidence (code structure, live DB content
  composition, harness-confirmed rendering behaviour — full detail in Phase 9's new subsection) —
  confirmed it does NOT check out: `METHODOLOGY_TRACK_DEFS` supports exactly one header per
  track, and the "Structured" wrapper's actual content spans 4 different taxonomy destinations at
  once (Project Setup + Scope & Deliverables + Reports/Closure + Governance), so there is no way
  to isolate "Project Setup" as its own track-gated top-level group without the same kind of new
  visibility architecture options (a)/(b) above already describe. **Decision recorded 2026-08-23
  (PRD decision 12): the user chose to leave Project Setup / Scope & Deliverables out of the
  rationalised sidebar entirely rather than build the new per-leaf visibility architecture — see
  Phase 9's "DECISION RECORDED" subsection above for the full write-up.** This closes the
  question for these 2 groups specifically; it does not extend to Closure Report/Handover/Closure
  Checklist, which still newly suspect (not confirmed) that they share this same root cause,
  based on `ClosingProject.jsx` living in the same `structured/` route family as Closure Report's
  page — that remains an open, separate question.
- **Project Closure's Archive** — investigated this run (previously just flagged "ambiguous"),
  now confirmed: genuinely 2 different, real "archive" concepts exist in the live DB (a
  Projects-list archived-state filter, and a records-retention/compliance vault), neither maps
  cleanly to taxonomy's per-project Closure > Archive. Left deferred with a concrete answer
  instead of an open question.
- A **pre-existing, unrelated bug** was found (not fixed, flagged as follow-up): `plat_tm_timesheets`
  ("Time Entry") and `plat_tm_lesson_actions` ("My Lesson Actions") silently disappear from the
  live PM-layout sidebar for every role granted them (including `pmo_admin`) — they live under
  the legacy `plat_sec_personal` shell, which explodes into orphan roots that
  `inferPmPlatformCategoryId()` has no matching branch for (that branch only exists in
  Simulator's equivalent function). Predates this initiative entirely; worth its own fix.
- **Phases 11-12 (new Milestone Register / Governance Action Register) — DONE (Run 6)**: full
  detail in each phase's own section above. Both new sidebar leaves are Platform-only (Simulator's
  Phase-9-equivalent taxonomy groups don't exist yet, still Phase 14's job); both apps' CRUD/
  register capability and dashboard widgets are complete regardless, per rule 34.1.
- Phase 13 — lowest priority; several of its candidates surfaced anyway during Phases 4/6/9 (see
  those phases' notes).
- Phase 14 (Simulator parity) — explicitly deferred until Platform's structure is verified.

**Judgment calls made across all runs (things the user should sanity-check):**
1. Phase 1's SQL-only premise turned out to be wrong for creating a genuinely new top-level
   section — the fix required a small JS code change instead of (or in addition to) a new
   `menu_items` root. Only the safe half was implemented.
2. Where a "duplicate" turned out to be a deliberate PMO-oversight cross-project variant
   (Pattern A, e.g. `plat_oversight_risk`) rather than an accidental duplicate (Pattern B), it
   was left untouched even though its route/label superficially resembles the canonical row —
   confirmed via actual component names in `platformRoutes.jsx`, not just menu labels.
3. Several "gap" items the plan listed for Phase 6 turned out to already be live (Skills Matrix)
   or were routes that don't actually exist yet (RACI Matrix's route DID exist, just in a
   module route file the first grep pass missed — worth remembering that this codebase splits
   routes across `platformRoutes.jsx` AND per-module route files like `PmisGapRoutes.jsx`).
4. Grant migrations always used a live subquery against `role_menu_items` at the time each SQL
   file is *run* (not a hardcoded role-name list frozen at audit time), so they'll pick up
   whatever the canonical row's grants actually are when the user runs the file.
5. The first Phase 9 run (5 groups) correctly identified that `PM_CATEGORY_DEFS`/
   `PMO_CATEGORY_DEFS` are hardcoded JS whitelists, but incorrectly concluded this made Phase 9
   impossible to verify safely without a live browser session. The second Phase 9 run solved this
   by building a Node harness that bundles the real transform functions with esbuild and runs
   them against a live data snapshot — a faithful, deterministic substitute that both subsequent
   runs used for every group, and that this reviewer independently re-checked via direct
   PostgREST queries and `esbuild`/test-suite runs rather than trusting the harness's own report
   alone.
6. Every re-parent in Phase 9 keeps the leaf's existing `menu_items.id`, so `role_menu_items`
   grants carry over automatically with zero migration risk — the one exception is `v966m`'s new
   `plat_pm_planning_assumptions` row (a genuinely new, deliberately dual-location leaf per PRD
   decision 7), which needed a grant-copy INSERT, same pattern as Phase 2's Dependency Register.
7. A real bug (dedupe interaction between `plat_pm_capacity` and the orphan
   `pmo-people-team-capacity` row) was caught by the harness *before* being written into SQL, not
   after — the fix (a matching `inferPmPlatformCategoryId` regex split, `v966n`) was verified to
   keep the two rows deduping as one visible entry, exactly as before the move.
8. (4th run) The identical dedupe-interaction bug class recurred for Resource Directory vs. the
   orphan `pmo-people-resource-directory` row — same root cause as #7 (both were siblings under
   Teams pre-move, sharing a `peopleLeafSemanticKey()` dedupe bucket), same fix shape (a matching
   `inferPmPlatformCategoryId` regex split, `v966t`), caught the same way (harness before/after,
   before finalising SQL). Worth remembering as a standing checklist item for any future Teams-
   group leaf move: check `pmoMenuSemanticDedupe.js`'s `peopleLeafSemanticKey()` for an orphan
   sibling BEFORE writing the re-parent SQL, not after.
9. (4th run) A previously-unrecorded, fully-dead menu generation was found while investigating the
   Quality/Testing split: the "Testing Centre" feature (`apps/platform/src/pages/testingCentre/*`,
   routes at `/platform/testing-centre/*`) is a materially richer, more complete Testing
   implementation than the currently-live `TestDashboard.jsx` (`/platform/testing`) — but every
   menu row across all of its generations (`testing_qa_*`, `testing_diagnostics_*`, `pm_testing_*`)
   has zero `role_menu_items` grants, i.e. it is fully built but completely unreachable today. Not
   touched by this run (swapping the canonical Testing implementation is a bigger, separately-
   decided product choice, not a menu-label fix) — flagged in `SQL/v966r`'s header as a follow-up,
   and worth a dedicated look given how much more capable it is than what's currently live.
10. (4th run) `plat_pm_quality_testing`'s own stored `route_path`
    (`/platform/testing/dashboard`) does not match any registered route — the real route is
    `/platform/testing` (no `/dashboard` suffix). This is a genuine, pre-existing dead link,
    unrelated to the relabel in `v966r`; flagged there rather than silently fixed, per the same
    discipline used for the Timesheets/Approvals dead links found in Phase 4.
11. (5th run) The 4th run's cached data snapshot had a latent gap: its `menu_items` fetch never
    selected the `is_deleted` column, so its harness's hydration filter silently treated every
    row as non-deleted regardless of the DB's real value. This never affected any of the 12
    completed groups, but would have mattered for this run's own work — several candidate rows
    for Planning > Schedule turned out to be genuinely soft-deleted. Always re-fetch with
    `select=*` (or at minimum include `is_deleted`), not a curated column list, when rebuilding
    the harness snapshot for a new run.
12. (5th run) Re-fetching fresh also caught real production drift unrelated to this initiative:
    live `role_menu_items` had grown from 9,080 rows (4th run's cache) to 10,972 (fresh fetch)
    between runs — ordinary usage/provisioning, not caused by this work, but a reminder that
    reusing a prior run's cached snapshot without re-fetching risks a stale diff.
13. (5th run) A second pre-existing, unrelated bug was found via the per-role duplicate scan:
    `pmo-cat-standards-based` (the "Standards-Based" `[P]` track header) renders twice for 12
    broadly-granted roles, confirmed present identically before and after `v966v` — not caused by
    this run, not investigated further, flagged as a follow-up.

---

## Notes

- Every phase's SQL migration file uses the next available `v966x`-style suffix in sequence as
  it's actually written, per the established versioning convention.
- Phases 2-8 (consolidation/wiring) carry the least risk — they touch menu_items rows and
  existing working pages, not new code. Phases 11-12 (new registers) carry the most — genuinely
  new tables/RLS/services/pages, both apps.
- Given the "collapse to one tree" decision (PRD decision 1) removes the role-track/methodology-
  track split as a *menu structure* mechanism, verify during Phase 2 onward that role-based
  *visibility* (who can see/use each canonical item) is preserved via `role_menu_items` grants
  matching what each duplicate row previously granted — collapsing the tree must not silently
  broaden or narrow anyone's access. This is a "match existing sibling grant pattern" exercise
  (same principle already used in v879), not a permissions redesign.
