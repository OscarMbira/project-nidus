# v1239 — Dual-mode Planning product: implementation plan

**Source PRDs:** `projectprd/v1239_dual_mode_planning_product_PRD.md` (governing scope and decisions) ·
`projectprd/Project_Planning_Module_PRD_for_Claude.md` (generic brief, supplies the extra plan sections) ·
`projectprd/v1200_project_planner_standalone_PRD.md` (history; commercial rules carried by v1239).
**Supersedes:** `projectplan/v1201_project_planner_standalone_plan.md` (never started).
**Depends on:** `projectplan/v1240_shared_package_consolidation_plan.md` — **must be complete before Slice 1 starts** (owner decision 2026-10-10: separate plans, run one after the other).
**Related:** `projectplan/v1241_nidus_brand_site_plan.md` (single Nidus landing page linking Platform, Simulator and Planner).
**Status:** APPROVED 2026-10-11 — implemented 2026-10-11; owner test pass, SQL run and launch (9.6) pending.

Product name used in this plan: **Project Planner** (no third-party product names, rules 26–27).

---

## 0. Restated understanding

Planning ships twice from one implementation:

- **Embedded.** Platform (`public`) and Simulator (`sim`) keep planning inside their shells.
- **Independent.** A fourth app, `apps/planner`, with its own landing page at `planner.<domain>`. It reads and writes the
  same `public` project and task rows as Platform. An account's `product_edition` decides what it can see and touch.
  Upgrading flips that value. No row moves.

The planning screens and services move out of `apps/platform` into one shared package, `packages/planning`.
Platform, the Simulator and the planner all run that same code. Each shell supplies the database client (`platformDb` or `simDb`).

---

## 1. Decision log

| # | Decision | Chosen | Notes |
|---|---|---|---|
| D1 | Governing brief | v1239 + generic PRD | v1201 marked superseded. v1200's narrow ceiling no longer applies. |
| D2 | Canonical activity model | **`tasks` + `task_dependencies`** | `activity_list` stays for Platform's estimating/process forms, linked by a new nullable `activity_list.task_id`. |
| D3 | Simulator gaps | **Create `sim` twins** for every table the shared screens need | Also fixes the existing bug: Simulator `activityListService` writes to `public`. |
| D4 | Sign-up/trial vs CLAUDE.md org-first rule | **Auto-created organisation + account-level trial** | Sign-up asks for email + name only. The system creates a renameable organisation and still sends email verification. Trial: 14 days on the account from sign-up, no card, read-only afterwards. **Documented exception to CLAUDE.md conventions 31–35 for the planner. Add to CLAUDE.md on approval.** |
| D5 | Entitlement storage | **`accounts.product_edition`** (`'platform'` default \| `'planner'`) | Trial and billing reuse `platform_subscriptions` with `plan_type = 'planner'`. `user_platform_access.platform` gains `'planner'`. |
| D6 | Database wall | **AS RESTRICTIVE policy loop** on every `public` table not in `planner_table_allowlist` | Fail-closed. Re-run step goes into the new-table checklist. |
| D7 | Scheduling engine | **Client preview + database authority** | Calendar-aware critical-path calculation in `packages/shared` for instant feedback. A calendar-aware RPC recomputes and persists on save. Optimistic concurrency via `tasks.row_version`. Per-task auto/manual schedule mode. |
| D8 | Import/export | **Project-XML exchange format + XLSX/CSV** | Harden the existing (unmounted) `msProjectService`, rename the UI to neutral "Schedule import/export". `.mpp` deferred. |
| D9 | `@nidus/*` resolution | **Real `packages/*` in every app** | ~~Planner only, Platform/Simulator keep aliases~~ — **replaced 2026-10-10**: v1240 removes the app-local shadow copies and aliases for Platform and Simulator first, so a shared UI/util/hook fix is made once for all apps. The planner simply has no aliases from day one. |
| D10 | URL / port | **`planner.<domain>`, dev port 5176** | `/` landing, `/pricing`, `/signup`, `/login`, `/app/*` signed-in. |
| D11 | Roles | **Reuse account_owner, project_manager, team_member + new `plan_viewer`** | Grants = `role_menu_items` ∩ planner allow-list. pmo_admin is not offered in the planner. |
| D12 | Limits | **Trial: 3 projects, 5 members, 500 tasks/project, 20 AI drafts. Paid: per seat, unlimited projects, 5,000 tasks/project, fair-use AI** | Stored as data (rule 25.1) and enforced by database checks. |
| D13 | Admin scope | **Edition badge/filter + audited edition change + planner toggle on menu items + planner plan in subscription catalog** | No other planner screens in Admin. |
| D14 | Upgrade & sign-in | **Pay → webhook flips edition → "Open full PMIS" → sign in on Platform** | Cross-subdomain single sign-on deferred to Release 2. |
| D15 | Extra MVP views | **Board, calendar, resource workload** | Board/calendar reuse `TasksBoard`/`TasksCalendar`. Workload is new. |
| D16 | `activity_list` data | **Backfill into `tasks` + link** | Re-runnable, batch-tagged, reconciled, reversible. Both schemas. |
| D17 | Packaging | **`packages/planning` (`@nidus/planning`) bundled into the planner; federated `planning-hub` / `sim-planning-module` become thin wrappers** | Planner shell is a lean shell in `packages/ui`, not Platform's `AppShell`. |
| D18 | Release | **Big launch** (owner's choice) | No pilot. Compensated by hard go/no-go gates (§10) and a sign-up kill switch (`admin.feature_flags.planner_public_signup`). |
| D19 | Planner sidebar menus | **Own `pln_` menu set** in `menu_items` with `/app/...` route paths | Existing `plat_pm_planning_*` / `sim_pm_planning_*` rows carry Platform/Simulator addresses, so they cannot be reused as planner links. `pln_` rows are granted per role via `role_menu_items`; the planner allow-list holds `pln_` rows only. `reorganizeMenuRoots()` / `useMenu` app-prefix filters learn `pln_` so planner rows never leak into Platform/Simulator sidebars (memory: shared-table cross-app leak) and vice versa. |
| D20 | One fix, one trigger | **CI path triggers on `packages/planning/**`** | `module-planning-hub.yml`, `module-sim-planning-module.yml` and the new `app-planner.yml` all trigger on `packages/planning/**` (plus `packages/ui|shared|supabase|config`, as the module workflows already do). One merge rebuilds and deploys all three consumers. |
| D21 | Public front door | **Nidus brand site (v1241)** at the apex domain links to each product landing page | The planner landing page (Slice 5.3) stays as the planner's own product page + sign-in; it links back to the brand site. |

### Questions still open (defaults assumed)

| # | Question | Default used in this plan |
|---|---|---|
| Q1 | Planner price per seat (monthly/annual) | Set in Admin subscription catalog; annual ≈ 2 months free (v1200 D9). |
| Q2 | Final production domain name | `planner.<domain>` placeholder. |
| Q3 | Does `timesheet_entries.task_id` always reference `tasks.id`? (no FK today) | Verified in Slice 0. If mixed, add an FK only after cleanup. |
| Q4 | Should a planner user also be able to use the Simulator? | Out of scope. Separate product, separate sign-up. |

---

## 2. Codebase facts this plan starts from (verified 2026-10-10)

- `packages/modules/planning-hub/src/routes.jsx` lazy-loads 16 pages from `@platform/pages/planning/...`. Platform mounts it at
  `pm/planning/*` and `pmo/planning/*` through `apps/platform/src/routes/PlanningFederatedOutlet.jsx`.
- `packages/modules/sim-planning-module/src/routes.jsx` renders only `ModuleHome`.
- Every planning service in `apps/platform/src/services/plan*.js`, `microPlanService.js`, `ganttService.js`, `activityListService.js` and `activityDependencyService.js` imports `platformDb` directly.
- **Two activity models:**
  - `tasks`/`task_dependencies` (v06) are used by about 36 files: Hub, `ganttService`, intelligence, governance, AI, `TasksBoard`, `TasksCalendar`, `msProjectService`, integrations. `tasks` already has `parent_task_id`, assignee, `% complete`, early/late start and finish, `slack_days`, `is_critical_path` and baseline dates.
  - `activity_list`/`activity_dependencies` (v365) are used by the schedule pages in `apps/platform/src/pages/schedule/` (GanttChart, CriticalPathPage, LookAheadPlanPage, ScheduleVariancePage, ActivityList, ActivitySequencing).
- **Three Gantt implementations:** `components/gantt/GanttChart.jsx` (tasks), `components/schedule/GanttChart.jsx` (activity_list) and `pages/schedule/GanttChart.jsx`.
- **Critical-path code exists twice:** `packages/shared/src/utils/cpmCalculator.js` (all four dependency types plus lag, calendar days only) and `SQL/v19_cpm_functions.sql` (forward pass, backward pass and critical path on `tasks`).
- **`sim` schema missing:** `tasks`, `task_dependencies`, `project_baselines`, `baseline_snapshots`, `project_milestones`, `inter_project_dependencies`, `dependency_resolutions`, `dependency_impacts`, `dependency_critical_paths`, `gantt_settings`. `sim` already has `activity_list`, `activity_dependencies`, all `plan_*`, `micro_plan*`, `project_calendars` and `timesheet_entries`.
- **Simulator bug:** `apps/simulator/src/services/activityListService.js` uses `platformDb`.
- **PlanningHub schema sniffing:** `PlanningHub.jsx` sniffs `/simulator/` in the path and skips loading. It is a dark-only `bg-gray-950` shell.
- **Baselines** are stored in `project_baselines` + `baseline_snapshots` through the generic `gapDataService`.
- **Menu availability:** `get_account_available_menu_item_ids()` (v1019) is account-level and fail-open for unclassified items.
- **Trial machinery:** `platform_subscriptions` (per user: `trial_start/end`, `plan_type`, `max_*`), `trial_project_tracking`, `subscription_plans`, `trialService.js`. Paynow is the payment provider.
- **Package aliases:** `apps/platform/vite.config.js:34-38` aliases `@nidus/ui` and `@nidus/shared/{utils,hooks,context,constants}` to app-local copies (project memory: shadow copies).
- **v1206 unified app shell** is in progress. Its `AppShell` currently lives in `apps/platform/src/components/Layout.jsx`, not in `packages/ui`.
- **Ports in use:** 5173, 5174, 5175 (Admin), 5180–5192 (Admin modules), 5201–5216, 5301+. 5176 is free.

---

## 3. Target architecture

```
                 planner.<domain>         platform.<domain>          simulator.<domain>
                 apps/planner (5176)      apps/platform (5173)        apps/simulator (5174)
                 landing + lean shell     AppShell (v1206)            AppShell (v1206)
                        │                        │                           │
                        │ bundles                │ federated remote          │ federated remote
                        │                 packages/modules/planning-hub  packages/modules/sim-planning-module
                        │                   (thin wrapper, platformDb)     (thin wrapper, simDb)
                        └──────────────┬─────────┴───────────────────────────┘
                                       ▼
                         packages/planning  (@nidus/planning)
                         ├─ context/PlanningDbProvider   ← shell injects platformDb | simDb + basePath
                         ├─ services/*  (tasks, deps, calendars, baselines, hub, timesheets, import/export)
                         ├─ engine/    (calendar-aware scheduling — wraps packages/shared cpmCalculator)
                         ├─ screens/*  (Hub areas, grid, Gantt, network, CPM, look-ahead, variance,
                         │              milestones, calendars, baselines, board, calendar, workload, timesheets)
                         └─ routes/PlanningRoutes.jsx  (one route table, relative paths)
                                       │ imports
                         packages/ui · packages/shared · packages/supabase
                                       │
                         Supabase: public (Platform + planner)  ·  sim (Simulator)
```

**Dependency direction.** Apps depend on `packages/planning`. `packages/planning` depends on `ui`, `shared` and `supabase`. Nothing in `packages/*` imports from `apps/*` (rule 46, enforced by ESLint).

**Rejected alternatives:**
- A separate planner repository or database. Rejected because it duplicates data and breaks upgrade continuity.
- A planner route inside Platform. Rejected because the product needs its own landing page and deploy.
- Microservices. Rejected because a modular monolith on Supabase is enough.
- Iframe embedding. Rejected for security and UX.
- Runtime federation into the planner. Rejected because it adds deploy complexity for a standalone product.

### Shared screen contract

Every screen in `packages/planning`:
- Takes its client from `usePlanningDb()`, never from a direct `platformDb`/`simDb` import.
- Builds links from `usePlanningBasePath()`.
- Reads the project through the shell's project context (`usePlatformProjectId` in Platform and the planner; the Simulator equivalent in Simulator).

The screen contract test runs each screen with both clients (v1239 §e).

---

## 4. Domain ownership matrix

| Area | Owner | Tables / code | Planner access |
|---|---|---|---|
| Identity, accounts, organisations | Core (Platform) | `accounts`, `organisations`, `users`, `user_platform_access` | Read own, limited write (profile) |
| Entitlement | Core | `accounts.product_edition`, `platform_subscriptions`, `subscription_plans` | Read own; write only via RPC |
| Menus | Core | `menu_items`, `role_menu_items`, **`planner_menu_allowlist`** (new) | Read |
| Project master | Core | `projects`, project members/invitations (`v85`) | Read/write within edition rules |
| Plan / schedule | **Planning** | `tasks`, `task_dependencies`, `task_statuses`, `project_milestones`, `project_calendars`, `project_calendar_exceptions`, `project_baselines`, `baseline_snapshots`, `gantt_settings`, `inter_project_dependencies`, `dependency_*` | Full |
| Planning Hub | **Planning** | `plan_*` (scenarios, PBS/PFD, intelligence, health, confidence, recovery, AI sessions, governance findings/rules, collision alerts), `project_micro_plans`, `micro_plan_*` | Full |
| Estimating forms | Platform | `activity_list`, `activity_dependencies` (linked to tasks by `task_id`) | Blocked by wall |
| Timesheets / work plans | Shared (Platform owns) | `timesheet_entries`, `timesheet_periods`, work-plan tables used by `projectWorkPlanService` | Entry + comparison only |
| Import/export | **Planning** | `ms_project_field_mappings` + import/export history (renamed in UI only) | Full |
| Everything else (risks, benefits, quality, procurement, governance, industry packs, PMO…) | Platform | — | **Blocked by restrictive policy** |
| Admin config | Admin | `admin.*` | None (rule 34.5) |

**Write-boundary rule:** only `packages/planning` services write planning tables. Platform modules that need schedule data (e.g. risk impact on dates) read through exported planning service functions, not raw table writes.

---

## 5. Scheduling engine and consistency rules

- **Recalculation inputs:** tasks (duration, schedule mode `auto|manual`, constraint type `asap|snet|fnlt|mso`, constraint date), dependencies (FS/SS/FF/SF + lag), and the project working calendar (`project_calendars` working days + `project_calendar_exceptions`).
- **Client.** `packages/planning/engine/schedule.js` wraps `cpmCalculator` with a working-day date function. It recomputes on each Gantt edit for instant preview (target < 150 ms for 1,000 tasks).
- **Server.** RPC `recalculate_project_schedule(p_project_id, p_expected_versions jsonb)`, built from the v19 functions and made calendar-aware:
  - It is SECURITY DEFINER with an explicit project-access check.
  - It locks the project's tasks (`FOR UPDATE`), rejects the save if any `row_version` differs, then writes the early/late dates, slack, `is_critical_path` and planned dates for auto tasks, all in one transaction.
  - It writes one activity/audit row per recalculation.
- **Concurrency.** `tasks.row_version int` is bumped by a trigger. A stale save returns a conflict; the UI shows "This plan changed — reload" and keeps the user's unsaved edit visible.
- **Cycles.** Refused on both sides (`hasCircularDependency` client-side + existing `has_circular_dependency` SQL).
- **Baselines.** Saving a baseline copies task dates into `baseline_snapshots` and stamps `tasks.baseline_*`. Variance = current − baseline.
- **Deferred:** resource levelling, multiple assignees per task, effort-driven scheduling.

---

## 6. Security and tenancy plan (Supabase)

1. **Edition helper.** `public.auth_user_account_edition()` is SECURITY DEFINER, `SET row_security = off`, STABLE, and returns the caller's account edition. This follows the project-memory pattern for avoiding RLS HTTP-500s. Policies always call it as `(select public.auth_user_account_edition())` so it is evaluated once per statement.
2. **Restrictive wall.** `planner_table_allowlist(table_name)` plus a re-runnable `DO` loop. The loop adds `planner_edition_wall` AS RESTRICTIVE FOR ALL to every `public` table with RLS enabled that is not on the list. The loop reports tables without RLS so they can be fixed, not silently skipped.
3. **Building the allowlist.** It is generated, not hand-written. A script lists every `.from('…')` and `.rpc('…')` in `packages/planning`, `apps/planner` and the shared shell code. An integration test fails if the planner touches a table missing from the allowlist, or if the allowlist names a table that doesn't exist.
4. **Menu narrowing.** `get_account_available_menu_item_ids()` gains one fail-closed branch: when the edition is `planner`, intersect with `planner_menu_allowlist`. The existing behaviour is unchanged for `platform`.
5. **Route guard.** `apps/planner` only registers allow-listed routes. Unknown paths go to `/app` home (story 35). Platform also redirects planner-edition users who sign in there to an "Upgrade to open the full PMIS" page.
6. **Read-only trial expiry.** A restrictive write policy on planning tables: `USING/WITH CHECK (public.auth_user_account_can_write())`. This returns false when the planner trial has expired and there is no active paid subscription. Reads are unaffected.
7. **Limits.** `BEFORE INSERT` triggers on `projects`, `tasks` and project membership check the plan limits from `subscription_plans.features`/limits for the account's edition.
8. **Edition changes** only go through `change_account_edition(p_account_id, p_edition, p_reason)`. It is SECURITY DEFINER and callable from the Paynow webhook (service role) and the Admin RPC wrapper. Every change is written to the audit trail with the actor and reason.
9. **Simulator isolation is unchanged.** `sim` twins carry their own RLS mirroring `public`. Planner sessions never receive `simDb`.
10. **Support access.** Admin staff act only through Admin RPCs. There is no impersonation in MVP.
11. **Data export, deletion and GDPR.** Reuse `gdprService.js`. The planner account-deletion path is the same as Platform's.

**RLS test strategy.** These run with real `authenticated` JWTs against a seeded database:
- Planner user A reads and writes their own tasks.
- A cannot read B's tasks.
- A gets zero rows or an error on a Platform-only table (for example `risks`, `benefits`).
- An expired trial can read but not write.
- A platform-edition user is unaffected (regression).

---

## 7. Landing page and go-to-market requirements

**Location:** `apps/planner/src/pages/public/PlannerHomepage.jsx`, following the structure of `PlatformHomepage.jsx`/`SimulatorHomepage.jsx`, theme-aware and PWA-ready.

**Page sections:**
1. Hero: value proposition plus "Start 14-day free trial — no card".
2. What you can do: Gantt, critical path, baselines, Hub intelligence, timesheets.
3. Screenshots: light and dark.
4. "Grows with you": upgrade to the full PMIS keeps every project.
5. Pricing teaser that links to `/pricing`.
6. Import from your desktop scheduler (XML/XLSX).
7. FAQ.
8. Footer with links to the Platform and Simulator homepages.

**Conversion paths:**
- Landing → `/signup` → verify email → `/app` (empty "Create your first project" with "Import a schedule" as the second option) → first task.
- Trial banner (days left) → `/app/billing` → Paynow.
- Read-only banner → `/app/billing`.
- "Need risks, benefits, governance?" card on the Planner home → `/app/upgrade`, which explains the full PMIS and goes to Paynow.

**Content source.** Marketing copy and pricing come from the database (rule 25.1). Copy uses the existing homepage content mechanism if one exists; otherwise a `planner_landing_content` table. Slice 4 confirms which before creating anything.

---

## 8. UX information architecture

**Planner (signed in, `/app`):**
- Home: my projects, trial status, and a "Create first project" prompt.
- Projects list → project workspace tabs:
  - Plan grid
  - Gantt
  - Board
  - Calendar
  - Network
  - Critical path
  - Look-ahead
  - Variance
  - Milestones
  - Baselines
- Project setup: calendars and exceptions, dependencies (internal/external), members and invitations.
- Planning Hub: intelligence, scenarios, PBS, health, AI draft, executive, recovery, confidence, governance gates, micro-plans, and portfolio collisions when the account has 2+ projects.
- Workload
- Timesheets: my week entry, plus the work-plan vs logged comparison.
- Import / export
- Settings (account owner): members/roles, intelligence rules, governance-gate rules, billing/upgrade, regional settings (v1062).

**Embedded.** No change to Platform/Simulator navigation. The same menu codes (`plat_pm_planning_*`, `planning_*`) point to routes that now render `@nidus/planning` screens. The new Workload menu item is added to Platform's PM planning group too (rule 34), plus Simulator parity, plus the taxonomy update (rule 70).

**Every moved or new screen** follows these rules: 28.1 theme, 40/40.1 sorting, 41 views, 44 row numbers, 52 unsaved-changes guard, 61 icon actions, 63.1 audit tab, 65 routed forms, 67 multi-line lists, 69 searchable selects, 73 back button, 16 success modal, 38 exports, 37 drafts, 39 PWA.

---

## 9. Vertical slices (todo list)

Each slice is test-first (`projectplan/App_Guide.md`): failing test → minimal code → refactor → retest suite in Platform and Simulator (rule 43). For every slice, the note names the Platform file, the Simulator file and the planner route it touches. **SQL numbering starts at v1242** (highest existing is v1238). **Admin SQL starts at v226, Admin plan v211.**

### Slice 0 — Baseline and discovery (no behaviour change)
- [x] Record the current Platform and Simulator retest suite results on HEAD (v1206 noted that a baseline was never taken).
  - *Done 2026-10-11.* The v1239 baseline is the v1240 final run (snapshot `5d99fab`, worktree `E:\nidus-v1240`), compared with the clean `633d34e` baseline in v1240's Review.
- [~] Discovery SQL, read-only: counts of `activity_list` rows with no matching `tasks` per account and schema. Check whether every `timesheet_entries.task_id` resolves to `tasks.id` (Q3).
  - *Written; the owner runs it:* `SQL/v1239_discovery_readonly.sql`. Query 3 lists projects that use both `tasks` and `activity_list`, which shaped a safer backfill (see 2.3).
- [x] Confirm v1240 is complete: no `@nidus/ui` / `@nidus/shared/*` alias overrides remain in `apps/platform` / `apps/simulator` `vite.config.js`, and the drift check is green.
  - *Confirmed:* `check-shared-drift.mjs --enforce` passes.

### Slice 1 — Shared planning package (Platform first, no visible change)
- [x] 1.1 Scaffold `packages/planning` (`@nidus/planning`): `PlanningDbProvider`, `usePlanningDb`, `usePlanningBasePath`. Test: a dummy screen reads the injected client.
  - *Done, refined.* The Simulator services differ from the Platform ones in more than the client (they use `practice_project_id`, and some compute differently), so an injected client was not enough. Instead:
    - `PlanningProvider({ mode, basePath, ProjectBar })` + `usePlanning()` + `planningPath()`.
    - Screens keep their existing Platform/Simulator branches but take `isSim` and `basePath` from the shell, not the URL.
    - `ProjectBar` is injected because each app's picker uses that app's project service, and it is used widely outside planning.
    - 6 tests.
- [x] 1.2 CI (D20): add `packages/planning/**` to the trigger paths of `module-planning-hub.yml` and `module-sim-planning-module.yml` (and `app-planner.yml` when it is created in 5.1). Test: a dry-run workflow change shows all three jobs triggered by a `packages/planning` edit.
  - *Done:* `packages/planning/**` added to both module workflows. `app-planner.yml` gets it in 5.1.
- [x] 1.3 Move the hub services (`plan*.js`, `microPlanService.js`) into `packages/planning/services`. Swap `platformDb` for an injected client parameter. Each Platform service file becomes a re-export so other callers keep working (rule 32).
  - *Done:* 10 Platform + 10 Simulator services moved to `packages/planning/src/services/{platform,sim}` (both app copies were identical; the Simulator duplicates were deleted). Their imports now use `@nidus/supabase`.
  - Only 3 other callers existed (`GanttChart`, `ProjectPlanningOverview`, `WorkPackageView`), so they were repointed instead of adding shims.
  - The service tests moved too: 17/17 pass.
- [x] 1.4 Move the 16 hub pages + `PlanningHub.jsx` into `packages/planning/screens/hub`:
  - Remove the `/simulator/` path sniff.
  - Replace the `bg-gray-950` shell with inherited app chrome (v1239 D14).
  - Add a back button (rule 73).
  - *Done:* 18 screens moved (identical in both apps; the Simulator copies were deleted).
    - URL sniffing replaced by `usePlanning()`.
    - Full-page `bg-gray-950` shells removed, and 95 dark-only class strings given light pairs. Body `text-white` became `text-gray-900 dark:text-white`; solid buttons kept white text.
    - Back button added on Portfolio Collisions; the other screens are sidebar destinations (rule 73 exempts them).
    - Collisions tile: `/pmo/planning/collisions` on Platform, `${base}/collisions` elsewhere.
    - `PlanHealthScoreCard` moved to the package; a shared `usePlanningProjectId` hook added, which the app pickers re-export.
  - Shared route table: `packages/planning/src/routes/PlanningHubRoutes.jsx`.
  - Each app's `App.jsx` mounts `<PlanningProvider>` (Platform: platform, `/pm/planning`; Simulator: simulator, `/simulator/pm/planning`) with a lazy app `PlanningProjectBar`. The PMO mount nests a provider with `/pmo/planning`.
  - Both apps' CSS scans `packages/planning/src` (`@source`).
  - Federation: `PLANNING_FEDERATION_SHARED` shares `@nidus/planning/context/PlanningContext.jsx` as a singleton, for the shells and the two planning modules only. Screens import it by package id so a remote uses the shell's instance.
  - Bugs caught by the new tests and lint during the move (the build passed with them):
    - 12 screens used `<ProjectBar>` without declaring it;
    - two PBS screens had the `usePlanning` import inside their header comment.
    - All fixed. `no-undef` across the package is now 0.
- [x] 1.5 `planning-hub/src/routes.jsx` renders `@nidus/planning` routes inside `PlanningDbProvider(platformDb, '/pm/planning')`. Test: no `@platform/` import remains (lint rule + test).
  - *Done:* the module and the Platform bundled fallback render `PlanningHubRoutes`. Guard test `packages/planning/src/__tests__/noAppImports.test.js` covers the package and both planning modules. Both module dev shells are wrapped in a provider.
- [~] 1.6 Embedded smoke: `pm/planning/*` and `pmo/planning/*` render every hub route.
  - All 31 build tasks pass. The browser smoke test is in the owner test pass.

### Slice 2 — `sim` parity, schema client, `tasks` as canonical
- [x] 2.1 **SQL v1242** `sim_planning_parity_tables.sql`: `sim` twins of `tasks`, `task_dependencies`, `task_statuses` (if missing), `project_baselines`, `baseline_snapshots`, `project_milestones`, `inter_project_dependencies`, `dependency_resolutions`, `dependency_impacts`, `dependency_critical_paths`, `gantt_settings`. Includes RLS mirroring `public`, `database_tables` rows, and display-ID triggers where reference columns exist. Admin ID rules go in **Admin SQL v226** if missing. Ends with `NOTIFY pgrst`.
  - *Written:* `SQL/v1242_sim_planning_parity_tables.sql`.
    - Uses `LIKE public.x INCLUDING ALL`, so live columns are included.
    - `project_id` becomes `practice_project_id`; foreign keys between the twins are re-created.
    - RLS uses `sim.auth_user_can_access_practice_project()`.
    - `task_statuses` is not twinned: `sim.tasks` references the public lookup.
  - Admin: `E:\project-nidus-admin\SQL\v226_sim_inter_project_dependencies_id_generation_seed.sql`.
  - *Owner runs both.*
- [x] 2.2 **SQL v1243** `tasks_row_version_and_activity_link.sql`: `tasks.row_version` + bump trigger, `tasks.schedule_mode`, `constraint_type`, `constraint_date`, `activity_list.task_id` (both schemas).
  - *Written:* `SQL/v1243_tasks_row_version_and_activity_link.sql` (check constraints, `public.bump_task_row_version()` trigger on both schemas).
- [x] 2.3 **SQL v1244** `activity_list_to_tasks_backfill.sql`:
  - Snapshot tables, a batch id, then insert tasks and dependencies for unlinked rows and set `activity_list.task_id`.
  - Reconciliation counts are emitted as a NOTICE.
  - Rollback script: `v1242r_…_rollback.sql`.
  - *Written:* `SQL/v1244_activity_list_to_tasks_backfill.sql` + `SQL/v1244r_activity_list_to_tasks_backfill_rollback.sql`.
    - Batch tag in `tasks.custom_fields` plus `public.v1244_backfill_log`.
    - **Safer than planned:** projects that already schedule in `tasks` are skipped, to avoid duplicating the same work. They are listed by discovery query 3 for review.
- [x] 2.4 `sim-planning-module/src/routes.jsx` renders `@nidus/planning` routes with `PlanningDbProvider(simDb, '/simulator/pm/planning')`. Simulator `/simulator/pm/planning/*` routes point at the module.
  - *Done:* the module renders `PlanningHubRoutes`. The Simulator's existing `/simulator/pm/planning/*` routes render the shared screens through its lazy imports, under the app-level provider in `simulator` mode, so they read `sim` data. The old `ModuleHome` stub was deleted.
- [x] 2.5 Fix the Simulator `activityListService` → `simDb` (bug).
  - *Resolved by deletion.* The four Simulator pages using it (`pages/schedule/ActivityList|ActivityDetail|ActivitySequencing|GanttChart`) were **never rendered**: the live routes use `pages/simulator/schedule/*`, which run on the `sim` service. So no practice data was ever written to `public`. The dead pages, `activityListService.js` and `activityDependencyService.js` (Simulator app), and their route-list entries were deleted.
- [x] 2.6 Screen contract test: each hub screen with the public client and the sim client.
  - *Done:* `packages/planning/src/screens/__tests__/screenContract.test.jsx`.
    - Static checks: no screen reads the URL for its mode; every `isSim` comes from `usePlanning()`.
    - Behaviour (Plan Health): Simulator mode calls only the sim service; Platform and Planner modes call only the public one.
  - Package: 22/22 tests pass.

### Slice 3 — Schedule screens on `tasks` + scheduling engine
- [x] 3.1 Move the schedule screens into `packages/planning/screens/schedule` on `tasks`:
  - Grid
  - Gantt: consolidated onto `components/gantt/*`. The other two Gantt files are retired once their routes point to the shared one.
  - Network (`ActivityNetworkDiagram`)
  - Critical path, look-ahead, variance
  - Milestones (`MilestoneManager`)
  - Dependencies (internal/external)
  - Calendars + exceptions
  - Baselines
  - *Done 2026-10-11.* New in `packages/planning/src`:
    - `services/scheduleData.js`: one mode-aware service (public/`project_id` or sim/`practice_project_id`) for tasks, links, external links, calendar + exceptions, recalculate and baselines. Saves send `row_version`; a stale save raises `ScheduleConflictError`. A link that would make a loop is refused before it is written.
    - `hooks/useSchedule.js`: `useScheduleProjectId` (Platform/Planner use `usePlatformProjectId`; Simulator uses the practice-project route param), `useSchedule` (loads tasks, links and calendar in parallel; recalculate; conflict state) and `useScheduleLinks` (links keep each shell's prefix).
    - `components/PlanningTable.jsx` (search, sort, Table/Card toggle, `#` numbers, export, icon actions), `ScheduleLayout.jsx` (title, project picker, schedule tabs, Recalculate, conflict banner) and `ScheduleGanttChart.jsx`.
    - Screens: Tasks grid, routed task page (Details / Links / Audit tabs, unsaved guard, "Keep for later" draft), Gantt, Network, Critical path / Milestones / Look-ahead / Variance (one screen, four presets), Dependencies (this project + other projects), Calendar + routed exception page, Baselines.
    - `routes/ScheduleRoutes.jsx`.
  - **Deviation:** the Gantt is a new lightweight DOM/SVG chart, not the frappe wrapper. The wrapper reads frappe 0.x date internals that changed in the installed 1.2.2, and a plain chart prints and tests cleanly. `components/gantt/*` stays for the Platform project page that still uses it.
  - Network and Milestones are tabs in the schedule sub-navigation (Level 4), so no new sidebar items were needed.
  - Schedule baselines (task dates) are new. Scope/cost baselines and approval stay on the Platform's Planning > Baselines page.
- [x] 3.2 `engine/schedule.js`: working-calendar-aware wrapper over `cpmCalculator`. Unit tests cover weekends and holidays, all four dependency types, lag, and the manual/auto modes.
  - *Done:* 16 engine tests (weekends, holidays, extra working days, FS/SS/FF/SF, lag, manual, SNET/MSO/FNLT, milestones, cycles, 1,000 tasks under 150 ms).
- [x] 3.3 **SQL v1245** `recalculate_project_schedule_rpc.sql`: calendar-aware RPC + `row_version` conflict check (both schemas).
  - *Written:* `SQL/v1245_recalculate_project_schedule_rpc.sql` + `SQL/v1245_schedule_engine_test_vectors.sql` (the same cases as the JS tests). *Owner runs both.*
- [x] 3.4 Conflict UX test: a stale save is rejected and the reload prompt is shown.
  - *Done:* `screens/schedule/__tests__/scheduleScreens.test.jsx`. A stale task save shows "This plan changed since you opened it" with Reload plan, does not recalculate, and Reload fetches the task again; a stale Recalculate on the grid shows the same prompt. Also covered: Simulator mode reads the practice project, link building per shell, and a contract that no schedule screen uses Supabase directly or ships a dark-only surface. 30 new tests pass.
- [x] 3.5 Platform routes in v1239 D8 (`schedule/*`, `planning/*`, `projects/:projectId/schedule/*`) and the Simulator `practice-projects/:projectId/schedule/*` routes render the shared screens. The PMBOK estimating pages (`ActivityDetail`, `ScheduleManagementPlan`) stay app-local.
  - *Done:*
    - Platform: `schedule/*` and `projects/:projectId/schedule/*` render `ScheduleRoutes`. `planning/dependencies` and `planning/calendars` render the shared screens. The estimating routes (`management-plan`, `activities/new`, `activities/:actId`) keep their explicit routes, which rank above the splat.
    - Simulator: `simulator/practice-projects/:projectId/schedule/*` renders `ScheduleRoutes` in sim mode, with the same estimating exceptions.
    - Replaced pages deleted: 11 Platform (`schedule/ActivityList|ActivitySequencing|GanttChart|CriticalPathPage|LookAheadPlanPage|ScheduleVariancePage|ProjectCalendar*`, `planning/PlanningDependenciesPage|PlanningCalendarsPage`) and 6 Simulator. Both apps' `projectCalendarService` (+ tests) were deleted; nothing else used them.
    - Both app builds pass.
    - Note for the owner test: the Tasks grid now lists `tasks`. Activities appear there after `SQL/v1244` backfills them.

### Slice 4 — Board, calendar, workload, timesheets, import/export
- [x] 4.1 `TasksBoard` and `TasksCalendar` → shared screens (Platform routes unchanged).
  - *Done:* moved to `packages/planning/src/screens/tasks/`. `hooks/useTaskSource.js` picks public/`project_id`/`projects` or sim/`practice_project_id`/`practice_projects`. In sim mode there are no cross-schema embeds: statuses are attached from the public lookup.
    - Platform `/platform/tasks/board` and `/tasks/calendar` are unchanged and now load the package screens.
    - The same screens are schedule tabs (`schedule/board`, `schedule/due-dates`) in every shell. Inside a schedule mount, cards open the shared task page.
    - Both apps' page copies were deleted. The Simulator's copies were unrouted, and they read `public` data.
- [x] 4.2 New **Workload** screen: assigned estimated hours per person per week vs capacity (from the resource calendar where present). Card/table toggle, exports, tests.
  - New menu items `plat_pm_planning_workload` and `sim_pm_planning_workload`, granted to the same roles as the existing planning menus (**SQL v1246**, + seed).
  - `Core_PM_and_Industry_Menu_Taxonomy.md` updated (rule 70).
  - *Done:*
    - `services/workload.js`: hours are spread over each task's working days. Capacity comes from the resource calendar entry, then the resource default × %, then the project calendar hours per day. The Simulator has no resource tables, so it uses the project calendar.
    - `screens/schedule/ScheduleWorkloadScreen.jsx`: 4/8/12 weeks, red when over capacity, export, Table/Card toggle.
    - The task page gained **Assigned to** (active project members; `scheduleData.listTeam`).
    - `SQL/v1246_planning_workload_menus.sql`: Platform grants are copied from `plat_pm_planning_gantt`, Simulator grants from `sim_pm_planning_health`.
    - Taxonomy: added "Workload (v1239)" under Planning > Schedule (additive; only the previous last line's tree glyph changed from └ to ├).
    - No seed file: Workload has no table of its own.
    - 7 tests.
- [x] 4.3 Timesheet entry against a task + the work-plan comparison. Shared wrappers around `WeeklyTimesheetGrid`, `WorkPlanGrid` and `projectWorkPlanService`, scoped to planning-only use.
  - *Done, simplified.* The 1,700-line `WeeklyTimesheetGrid` / `WorkPlanGrid` / `projectWorkPlanService` stay in each app's Timesheets module (approval, cadence, work-plan lifecycle). Wrapping them would drag that whole module into the package.
    - Instead, a small shared **My time** screen (`schedule/time`) logs hours against your tasks for a week. It writes draft `timesheet_entries` (public or sim twin), and "Submit week" hands them to the existing approval flow.
    - The comparison is logged-to-date against each task's estimated hours.
    - Submitted or approved days are read-only.
    - `services/timeData.js` + 6 tests.
- [x] 4.4 Schedule import/export:
  - Move `msProjectService` → `packages/planning/services/scheduleExchangeService.js` (injected client).
  - XML + XLSX import with preview/confirm steps.
  - Export to XML/XLSX/CSV with legend sheets and a CSV `#` dictionary (rule 71).
  - Neutral UI names.
  - *Done:* `services/scheduleExchangeService.js` (pure readers/writers) + `scheduleData.importPlan` + `screens/schedule/ScheduleExchangeScreen.jsx` (`schedule/exchange`).
    - Import has three steps: choose file → check preview (row-by-row problems, warnings) → confirm.
    - A loop in the file's links is refused before anything is written.
    - Tasks and links go in as two bulk inserts, tagged with `custom_fields.import_batch`, then the plan is recalculated.
    - Export: XLSX (Instructions + Legend + Tasks sheets), CSV (`#` DATA DICTIONARY block) and XML (field-explaining comment).
    - Templates are offered in XLSX and CSV, each with its legend (rule 71).
    - `msProjectService.js` was never imported, so it was deleted rather than moved (both apps). `ms_project_*` tables are untouched.
    - 13 tests, including an XML round trip.

- Slice 4 check: package 94/94 tests; both app builds pass.

### Slice 5 — Planner app shell and landing page
- [x] 5.1 `apps/planner`:
  - Vite on port 5176, no `@nidus/*` alias overrides.
  - ESLint `no-restricted-imports` for `apps/*`.
  - Turbo filter `@nidus/planner-app`.
  - CI workflow `.github/workflows/app-planner.yml`, triggered on `apps/planner/**`, `packages/planning/**`, `packages/ui|shared|supabase|config/**` (D20).
  - `DEV_MODULES.md`-style `apps/planner/DEV_APP.md`.
  - *Done:* `apps/planner` (`@nidus/planner-app`, port 5176) on the shared `vite.base.config.js` (PWA manifest + service worker), with no alias overrides.
    - ESLint boundary block for `apps/planner`.
    - `.github/workflows/app-planner.yml` triggers on `apps/planner/**` and `packages/planning|ui|shared|supabase|config/**`. It runs the allow-list check, tests and build, then deploys.
    - `apps/planner/DEV_APP.md`. Build passes.
- [x] 5.2 Lean `PlannerShell` in `packages/ui`: header with trial badge, sidebar from the database allow-list, PWA manifest + service worker.
  - *Done:* `packages/ui/src/PlannerShell.jsx`: header with a `TrialBadge` (days left / read-only / hidden when paid), DB-driven sidebar, mobile drawer, theme toggle. Presentational; the app passes the menu tree and status.
- [x] 5.2a **Planner sidebar menus (D19).** **SQL v1254** `planner_menu_items.sql` + **v1255** seed. Creates the `pln_` menu tree in `menu_items` with `/app/...` route paths, in this sidebar order:
  - **Home** (`pln_home`), **Projects** (`pln_projects`)
  - **Schedule**: Plan grid, Gantt, Board, Calendar, Network, Critical path, Look-ahead, Variance, Milestones, Baselines
  - **Project setup**: Calendars & exceptions, Dependencies, Members & invitations
  - **Planning Hub**: Overview, Intelligence, Scenarios, Product breakdown, Plan health, AI plan draft, Executive view, Recovery, Confidence forecast, Governance gates, Micro-plans, Portfolio collisions
  - **Workload**, **Timesheets** (My week, Planned vs logged), **Import / export**
  - **Settings** (account owner): Members & roles, Intelligence rules, Governance-gate rules, Regional settings, Billing, Upgrade
  - Role grants in `role_menu_items`:
    - `account_owner` gets everything.
    - `project_manager` gets everything except Billing, Upgrade and the two rules screens.
    - `team_member` gets Home, Projects, Schedule (read), Workload, Timesheets.
    - `plan_viewer` gets Home, Projects, Schedule (read), Planning Hub (read).
  - All `pln_` rows are seeded into `planner_menu_allowlist` (6.3).
  - `reorganizeMenuRoots()` in `packages/config/src/pmoMenuHierarchyUtils.js` and the app-prefix check in `useMenu` handle `pln_`. Tests: no `pln_` row reaches a Platform or Simulator sidebar, and no `plat_`/`sim_` row reaches the planner sidebar.
  - `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` gains a **Project Planner** section (rule 70).
  - *Done:* `SQL/v1254_planner_menu_items.sql` (46 `pln_` rows) + `SQL/v1255_planner_menu_grants_seed.sql` (grants as listed).
    - The sidebar comes from the new `planner_menu()` RPC (v1256): role grants ∩ allow-list ∩ `pln_`.
    - Leak guards in both directions:
      - `stripPlannerMenuNodes()` in `reorganizeMenuRoots()`;
      - both apps' `useMenu` drop `pln_` rows;
      - the Platform branch of `get_account_available_menu_item_ids()` excludes `pln_`;
      - the Planner's `buildMenuTree()` keeps `pln_` only.
    - Tests: `packages/config/src/__tests__/plannerMenuIsolation.test.js` + planner app test.
    - Taxonomy: new section 23 "Project Planner" (additive).
    - **Deviations:**
      - Timesheets has one item, "My week": planned-vs-logged is a column on it.
      - "Members & roles" is listed once.
      - "Regional settings" is not in the Planner yet (that screen is Platform-bound).
- [x] 5.3 Public pages: `/`, `/pricing`, `/login`, `/signup`, `/verify`, `/reset-password`. The landing page mounts the shared `NidusFamilyBar` (v1241) with `currentSlug="planner"`.
  - *Done:* `apps/planner/src/pages/public/`:
    - Landing (with `NidusFamilyBar currentSlug="planner"`).
    - Pricing: from `subscription_plans` + `planner_plan_limits`, nothing hard-coded; shows only the trial until priced plans are active.
    - Login, Sign-up (name, email, password; follows the kill switch, except for invitees), Verify, Reset password.
- [x] 5.4 `/app/*` routes = the `@nidus/planning` route table + Home, Projects, Members, Settings, Billing, Upgrade. Unknown → `/app`. Test: allow-listed routes render; others redirect.
  - *Done:* `apps/planner/src/App.jsx`: `/app` = Home, Projects (list + routed "New project" via `planner_create_project`), `schedule/*` (ScheduleRoutes), `planning/*` (PlanningHubRoutes), Members, Settings, Billing, Upgrade, invite.
    - `routeGuard.js` redirects sections the user's menu does not grant. Home, invite and upgrade are always reachable.
    - Shell data comes from one `planner_context()` call, then menu + projects in parallel (rule 66).
    - Tested.
- [x] 5.5 Home empty state "Create your first project" / "Import a schedule" (stories 7–8).

  - *Done:* `HomePage.jsx` empty state with "Create your first project" and "Import a schedule" (the latter creates the project, then opens Import / export).
### Slice 6 — Edition, trial, limits, database wall
- [x] 6.1 **SQL v1247** `product_edition_and_planner_trial.sql`:
  - `accounts.product_edition` (default `'platform'`).
  - `'planner'` added to the `user_platform_access` / `platform_subscriptions` checks.
  - `plan_type 'planner'`, `auth_user_account_edition()`, `auth_user_account_can_write()`, limit triggers.
  - `change_account_edition()` RPC.
  - *Written:* `SQL/v1247_product_edition_and_planner_trial.sql`.
    - Edition column; `planner` added to the live CHECK lists; `planner_plan_limits`.
    - `account_planner_status()`, `auth_user_current_account_id()`, `auth_user_account_edition()`, `auth_user_account_can_write()`.
    - Limit triggers on projects, tasks and memberships.
    - `apply_account_edition()` (internal, service role only) + `change_account_edition()` (API: service role, or owner downgrade only).
    - `planner_create_account()` (sign-up; fail-closed behind `planner_public_signup`) and `planner_signup_open()`.
    - **Fixed during review:** the first draft trusted `current_user` inside a SECURITY DEFINER function, which is always the owner, so anyone could have upgraded. Replaced by the internal/public split.
- [x] 6.2 **SQL v1248** seed: planner subscription plan rows + limits (trial and paid).
  - *Written:* `SQL/v1248_planner_plans_and_limits_seed.sql`. Limits per D12. Two planner catalog rows (monthly/yearly per seat) are inserted **inactive at price 0**: prices were never decided, so the owner sets them in Admin before launch. `catalog_scope = platform`. Platform/Simulator pricing queries now skip `plan_type = 'planner'`.
- [x] 6.3 **SQL v1249** `planner_menu_allowlist.sql`: allow-list table + the fail-closed branch in `get_account_available_menu_item_ids()`. **v1250** is the companion seed listing the `pln_` menu codes from 5.2a (planner rows only; `plat_`/`sim_` rows are never allow-listed).
  - *Written:* `SQL/v1249_planner_menu_allowlist.sql` (table with a `pln_`-only CHECK; fail-closed planner branch) + `SQL/v1250_planner_menu_allowlist_seed.sql` (run after v1254).
- [x] 6.4 **SQL v1251** `planner_table_wall.sql`: `planner_table_allowlist` (generated list) + the restrictive policy loop + the read-only-on-expiry write policy on planning tables.
  - *Written:* `SQL/v1251_planner_table_wall.sql` + `v1251r` rollback.
    - The allow-list is **generated** from the Planner's import graph by `scripts/generate-planner-table-allowlist.mjs` (71 tables) and committed as `packages/planning/planner-table-allowlist.json`.
    - Restrictive `planner_wall` on every other RLS-enabled public table; restrictive write guards (read-only trial) on allow-listed tables.
    - Tables without RLS are reported in a WARNING (the wall cannot cover them).
    - Also the 7.3 task trigger.
- [x] 6.5 Planner sign-up flow:
  - Email + name → existing auth → `createOrganisation()` with a default name (renameable) → `product_edition='planner'` → trial subscription row → global template sync (existing hook).
  - Email verification is still required before creating projects.
  - *Done:* sign-up → email confirmation → first `/app` load calls `planner_create_account` (auto-named, renameable workspace via `planner_rename_account`; trial subscription; template sync).
    - Invitees are detected (link or remembered token) and never get their own workspace.
    - `organisation_verified` is set TRUE because the auth email confirmation already verified the address.
- [~] 6.6 Tests:
  - Trial days remaining (day 0/13/14/15), read-only at expiry.
  - Limit triggers.
  - RLS integration (§6 strategy).
  - Generated-allowlist drift test.
  - Platform-edition regression.

  - *Written; the owner runs the SQL parts:* `SQL/v1258_planner_edition_db_tests.sql` (rolled back). It covers:
    - trial day 0/13/14/15 and read-only;
    - the paid plan;
    - the project limit;
    - a simulated planner JWT against a walled table and an allowed table;
    - an expired trial being read-only;
    - team-member progress only.
    - Drift test: `scripts/__tests__/generate-planner-table-allowlist.test.mjs` (4 pass; also in CI).
    - Platform-edition regression: the final regression run below.
### Slice 7 — Roles and planner invitations
- [x] 7.1 **SQL v1252** `plan_viewer_role.sql`: new system role + `role_menu_items` grants (read-only planning menus). The role is read-only through the existing role permission model.
  - *Written:* `SQL/v1252_plan_viewer_role.sql` (system role + project-role template). Grants are in v1255 (view only, `can_use = false`).
- [x] 7.2 Planner invite/remove-member flow on the existing project-invitation tables (`v85`), with its own planner email template and accept page (`/app/invite/:token`). It does not call the Platform invite path.
  - *Done:* `SQL/v1257_planner_invitations.sql`.
    - RPCs: invite (owner/PM, seat limit, 7-day token), context, accept (membership + project-scoped role, no new account), list, remove, cancel. They refuse Platform-edition projects.
    - App: `MembersPage.jsx`, `InviteAcceptPage.jsx`, a planner-only email template (`inviteEmail.js`, through `send-email`) and a pending-invite carry-over through sign-up.
- [~] 7.3 Tests:
  - A planner invite creates membership only.
  - A Platform invite never creates or changes a planner account.
  - A removed member loses access.
  - A team member can edit only their own assigned tasks' progress.

  - *Covered by:* v1258 test 5 (team member: progress only) and the planner app tests (email, token carry-over).
    - "A Platform invite never creates or changes a planner account" is enforced in SQL: the planner RPCs reject Platform-edition projects, and the Platform path never calls them. Owner to confirm in the test pass.
### Slice 8 — Upgrade, downgrade, billing, Admin
- [x] 8.1 `/app/upgrade` + `/app/billing` → existing Paynow initiation. The webhook (Edge Function) calls `change_account_edition` after hash verification.
  - *Done:* `UpgradePage.jsx` / `BillingPage.jsx` + `billingApi.js` → `paynow-initiate`. `paynow-initiate` now stamps `initiated_by_auth_user_id` server-side.
    - `paynow-webhook` has a Planner branch that runs only if the **hash is verified**, the payer **owns the account** and the amount **covers the catalog price** (× seats).
    - It then creates the per-seat subscription, or calls `change_account_edition` + creates the PMIS subscription. Idempotent on the Paynow reference.
- [x] 8.2 Success page → "Open full PMIS" link to `platform.<domain>`. On Platform, a planner-edition sign-in shows the upgrade page instead of the PMIS.
  - *Done:* the Upgrade page shows "Open full PMIS" once the edition is `platform`. Platform `ProtectedRoute` sends a planner-edition session to `VITE_PLANNER_URL/app/upgrade` (skipped if the RPC is not installed).
- [x] 8.3 Downgrade (account owner, in Platform settings): a warning lists the menus that will be hidden. Data is kept.
  - *Done:* `apps/platform/src/pages/subscription/SwitchEditionPage.jsx` (`/platform/subscription/edition`, linked from Subscription & Billing).
    - Owner only; the warning lists what stays visible (the allow-list); reason + typed confirmation; audited.
    - Simulator: not applicable (editions are a Platform account setting).
- [x] 8.4 **Admin** (`E:\project-nidus-admin`, plan **v211**, SQL **v227–v228**):
  - Edition badge + filter on Accounts.
  - Audited "Change edition" action (reason required) via an Admin RPC wrapper.
  - "Available in Planner" toggle on menu items (writes `planner_menu_allowlist` through a narrow SECURITY DEFINER RPC, documented like the v765/v779 exceptions).
  - Planner plan pricing in the subscription catalog.
  - *Done:* Admin plan `projectplans/v211_planner_edition_admin_plan.md`, `SQL/v227` (permissions, edition RPC, menu-availability RPCs, sign-up flag **off**) + `SQL/v228` (nav node).
    - Edition column, filter and "Change edition" on Organisations.
    - Planner Menu Availability page.
    - `planner` plan type in the Plan Catalog.
    - Admin test 3/3; both Admin module builds pass.
    - Exception documented in both CLAUDE.md files.
- [~] 8.5 Tests: project, task, baseline, hub-record, timesheet and membership counts are identical before and after upgrade and downgrade on a seeded account (**v1253** seed: planner demo account, blank display IDs, rule 16.2).

  - *Written:* `SQL/v1253_planner_demo_seed_and_continuity_check.sql`:
    - Part A: demo plan in an existing planner workspace (blank display IDs).
    - Part B: counts projects, tasks, links, baselines, hub scenarios, timesheets and members; switches the edition both ways; raises on any difference. Rolled back. *Owner runs it.*
### Slice 9 — Embedded regression and launch gates
- [~] 9.1 Smoke run of every v1239 D8 Platform route, every Simulator practice planning route, and every planner route.
  - *Automated part done:* all builds and test suites (see Review). The browser smoke run of every route is in the owner test pass.
- [x] 9.2 Performance checks:
  - Gantt first paint < 2 s at 1,000 tasks; usable at 5,000.
  - Client recalc < 150 ms at 1,000 tasks.
  - Server recalc < 1 s at 1,000 tasks.
  - *Done:*
    - Gantt 1,000 tasks renders in jsdom well under 2 s, and 5,000-task layout is under 0.5 s (`ScheduleGanttChart.perf.test.jsx`).
    - Client recalculation of 1,000 tasks is under 150 ms (engine test).
    - The server 1,000-task check was added to `SQL/v1245_schedule_engine_test_vectors.sql` (target < 1 s; owner runs it).
- [x] 9.3 Security review (`REVIEW.md` gates + `/security-review`): wall coverage, edition RPC, webhook hash.
  - *Done:* see the Review section "Security review".
- [x] 9.4 Documentation:
  - `Documentation/Project_Planner_v1239_Guide.md` (user guide + operator guide + support runbook).
  - Blog note (rule 22).
  - Taxonomy update.
  - CLAUDE.md addendum for D4 (planner org/trial exception) and the wall re-run step in the new-table checklist.
  - *Done:* `Documentation/Project_Planner_v1239_Guide.md` (users, operators with SQL run order, support runbook), `Documentation/Project_Planner_v1239_Blog_Post.md`, taxonomy section 23 + Workload line, CLAUDE.md addenda (35a D4 exception; new-table step 6: re-run the wall).
- [x] 9.5 ROADMAP.md: add Project Planner as a product line with its status.
  - *Done:* ROADMAP.md: Project Planner and Nidus brand site product lines (IN REVIEW), R3 progress, risks RR-008/RR-009, change log.
- [ ] 9.6 Go/no-go (§10) → enable `planner_public_signup`.

  - *Owner:* after the test pass, set prices + activate the planner catalog rows, then turn on `planner_public_signup` and the Planner site card.
---

## 10. Release plan (big launch, D18)

- **Environments:** local → staging Supabase branch with all migrations + seeds → production.
- **Order:** Slices 0–4 can merge to production first. They change nothing visible except the Workload menu and fix the Simulator planning data bug. Slices 5–8 deploy with `planner_public_signup = false`. Launch = flip the flag and set the Planner row in `site_products` to active (v1241).
- **Go/no-go gates (all required):**
  - Zero failures in the RLS integration suite.
  - Zero allowlist-drift failures.
  - Upgrade/downgrade counts identical.
  - Platform and Simulator retest suites no worse than the Slice 0 baseline.
  - Performance targets in 9.2 met.
  - A Paynow sandbox payment completes end to end.
  - Backfill reconciliation counts match.
- **Kill switch:** flipping `planner_public_signup` off hides sign-up within one page load. Existing planner users are unaffected.
- **Rollback:**
  - Each app and module deploys independently (rule 47).
  - The wall migration has a drop-policies script (`v1251r`).
  - The backfill has its rollback script.
  - The edition column defaults to `platform`, so dropping planner behaviour never affects Platform accounts.
- **Telemetry:** sign-ups, verified, first project created, first task, time-to-first-plan, imports, baselines saved, weekly active planners, upgrade clicks, conversions, errors per screen.
- **Support runbook:** in the guide (9.4). Covers edition change, trial extension (Admin), wall troubleshooting (which table blocked), and backfill reconciliation.

---

## 11. Non-functional targets

| Area | Target |
|---|---|
| Plan size | 5,000 tasks/project (paid), 500 (trial); 20 concurrent editors per project |
| Performance | Gantt p95 first paint < 2 s @1,000 tasks; import of 2,000-task XML < 20 s; bulk update of 200 tasks < 3 s |
| Availability | Inherits Supabase project SLA; RPO ≤ 24 h (daily backup), RTO ≤ 4 h |
| Accessibility | WCAG 2.1 AA for new and moved screens; keyboard navigation in the grid |
| Browsers | Last 2 versions of Chrome, Edge, Firefox, Safari; mobile PWA for read and update-progress |
| Localisation | Dates, numbers and currency through resolved regional settings (rule 68); time zone per project calendar |
| Security | No Platform-only table readable by a planner session; webhook hash verified; rate limit on sign-up and invites (existing Edge Function limits) |

---

## 12. Success measures

| Measure | Target | Instrumented by |
|---|---|---|
| Trial → active workspace (≥ 1 project with ≥ 10 tasks in 7 days) | 40% | Sign-up + task events |
| Time to first usable plan | < 15 min median | Sign-up → 10th task timestamp |
| Weekly active planners | Tracked, 60% of paid seats | Session events |
| Trial → paid | 10% | Subscription rows |
| Planner → Platform upgrade | 5% of paid accounts / year | Edition change audit |
| Upgrade data-continuity incidents | **0** | Count test + support tickets |
| Import error rate | < 5% of imports | Import history |

---

## 13. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Restrictive wall blocks a table the planner actually needs (blank screens) | High | Generated allowlist + drift test + full route smoke before launch; kill switch |
| Moving screens breaks embedded Platform/Simulator planning | High | Re-export shims, slice-by-slice smoke, Slice 0 baseline comparison |
| Backfill duplicates or mislinks tasks | Medium | Batch-tagged, idempotent, reconciliation counts, rollback script, snapshot first |
| Shared UI/util copies drift again after consolidation | Medium | Solved upstream by v1240 (aliases removed, app copies deleted, CI drift check) |
| Big launch with no pilot surfaces issues publicly | Medium | Hard go/no-go gates + kill switch + staged deploy of slices 0–4 first |
| Calendar-aware recalc diverges between client and server | Medium | Shared test vectors run against both the JS engine and the SQL RPC |
| Auto-created organisation conflicts with org-first assumptions elsewhere | Medium | Uses the real `createOrganisation()`; organisation still verified; CLAUDE.md addendum |
| Third-party naming (existing `MSProject*` files) | Low | New/moved code uses neutral names; old files retired when moved |
| AI plan draft cost on trials | Low | 20-draft trial cap (D12) |
| v1206 shell work in flight conflicts with route changes | Medium | Planner uses its own lean shell; Platform route edits only touch the element inside the existing wrappers |

---

## 14. Out of scope (Release 2+)

- `.mpp` import.
- Cross-subdomain single sign-on.
- Resource levelling.
- Multiple assignees per task.
- Saved views, undo/redo.
- Comments/@mentions in the planner.
- Planner-only custom roles.
- Planner use of Simulator.
- Offline/desktop clients.
- Industry packs, PMO, governance, procurement.
- Planner screens in Admin beyond D13.

---

## 15. Review

**Implemented 2026-10-11.** All slices are coded. The owner still needs to run the SQL, do the browser test pass, set prices and make the launch decision (9.6).

### What was built
- **Shared planning package (`packages/planning`).**
  - Hub screens (Slices 1–2).
  - Schedule screens on `tasks` for every product (Slice 3): grid, routed task page, Gantt, network, critical path, milestones, look-ahead, variance, dependencies, calendar + exception page, baselines.
  - Board, due-date calendar, Workload, My time and Import / export (Slice 4).
  - One mode-aware data service (`scheduleData.js`) and a calendar-aware engine. The engine has a database twin (v1245) checked by shared test vectors.
- **Platform and Simulator.**
  - Schedule routes render the shared screens.
  - 17 replaced page copies and 2 unused calendar services were deleted.
  - The Simulator's board/calendar copies were deleted: they were unrouted and read `public`.
  - The unused `msProjectService` was deleted in both apps.
- **Project Planner app (`apps/planner`, port 5176).**
  - Public pages, sign-up/verify/reset, the `/app` shell (`PlannerShell` in `packages/ui`) and a database-driven `pln_` sidebar.
  - Projects, members/invitations, settings, upgrade/billing.
  - PWA, CI workflow, ESLint boundary.
- **Database:** v1246–v1258 (see the guide for the run order). The wall's table allow-list is generated from the code and checked in CI.
- **Payments:** Planner branch in `paynow-webhook`; `paynow-initiate` stamps the payer.
- **Admin (separate repo):** plan v211, SQL v227–v228, edition column/filter/action on Organisations, Planner Menu Availability page, `planner` plan type.
- **Documentation:** guide, blog post, taxonomy section 23 + Workload, CLAUDE.md addenda (both repos), ROADMAP.

### Deviations from the plan (all recorded at their items)
1. **Gantt:** a new lightweight chart instead of the frappe wrapper (frappe 1.x internals changed).
2. **Timesheets:** a small shared **My time** screen instead of wrapping the 1,700-line Timesheets module, which stays in each app.
3. **Planner menus:**
   - Timesheets has a single "My week" item.
   - "Regional settings" is not in the Planner yet.
   - "Members & roles" is listed once.
4. **Baselines:** schedule baselines are shared; scope/cost baselines and approval stay on the Platform page.
5. **Planner catalog rows** are inserted inactive at price 0, because prices were never decided.
6. **Workload capacity:** the Simulator uses the project calendar only (no resource tables in `sim`).

### Security review (9.3, REVIEW.md gates)
**Fixed in this change**
- `change_account_edition` first trusted `current_user`, which is always the owner inside SECURITY DEFINER, so any user could have upgraded their own account.
  - Fix: split into `apply_account_edition` (no client grant) and `change_account_edition` (service role, or owner **downgrade** only, via `auth.role()`).
  - The Admin wrapper calls the internal function after its own permission check.
- Planner payments are applied only when all three checks pass:
  - the Paynow **hash is present and valid**;
  - the payer (stamped server-side) **owns the account**;
  - the amount **covers the catalog price** × seats.
  - Idempotent on the Paynow reference.
- Every new SECURITY DEFINER function sets `search_path` and does its own access check: owner / project manager / `auth_user_can_access_project`.
- Invitation tokens are 2 × `gen_random_uuid()`, expire after 7 days, and can only be accepted by the invited email.
- Sign-up is fail-closed behind `planner_public_signup`.

**Wall coverage**
- Restrictive policies apply only to RLS-enabled tables. v1251 prints a WARNING listing any `public` table without RLS; the owner must review that list.
- The allow-list over-includes some tables reachable through `@nidus/ui`'s index export, which errs towards access. It never under-includes, so screens are not blanked.

**Pre-existing issues — not changed here; recommend separate fixes**
- `paynow-webhook`'s generic (non-Planner) branch skips hash verification when the `hash` field is missing.
- `paynow-initiate` trusts the client-sent amount.
- The `send-email` Edge Function accepts any recipient and HTML from an anonymous caller (open relay risk).
- Admin SQL: 276 call sites use `COALESCE(p_admin_user_id, admin.current_admin_user_id())`, so a caller could act as another admin (reported earlier; Admin plan v210).

### Tests (automated, this session)
- `@nidus/planning`: 96 tests (engine, services, schedule screens incl. the conflict UX, workload, time, import/export, Gantt performance).
- `@nidus/planner-app`: 11.
- `@nidus/config`: 115 (incl. menu isolation).
- Allow-list drift: 4 (`node --test`).
- Admin shared: 3.
- **Builds:** Platform, Simulator, Planner, planning-hub and sim-planning-module all pass (12/12 turbo tasks).
- **Regression against the v1240 final run:** suites run one at a time, then compared test by test. **0 regressions.**

| Suite | Passing now | Passing in v1240 run |
|---|---|---|
| Platform | 1,519/1,665 | 1,538/1,684 |
| Simulator | 1,277/1,398 | 1,296/1,417 |
| ui | 182/182 | 167/167 |
| shared | 902/908 | 898/904 |
| config | 115/115 | 115/115 |

  - The 19 tests per app no longer in the app suites are the hub service tests that moved to `packages/planning` (passing there) and the tests of the deleted calendar services (that code is now covered by `scheduleData` tests).
  - Remaining failures in the app suites are the same ones as in the baseline.
- **Timing checks:** these fail only under parallel CPU load, so they run separately with `pnpm --filter @nidus/planning test:perf` (96/96 pass). The default run skips them.

### Owner steps
- Run the SQL in the guide's order. The `v1258` tests and `v1253` part B must print PASS; `v1245` perf must be < 1 s.
- Browser test pass: every Platform `schedule/*`, `planning/*` and `projects/:projectId/schedule/*` route, the Simulator `practice-projects/:projectId/schedule/*` routes, and every Planner route, in light and dark mode.
- Environment variables: `VITE_PLANNER_URL` (Platform) and `VITE_PLATFORM_URL` (Planner). Secret: `PLANNER_VERCEL_PROJECT_ID`.
- Redeploy the `paynow-initiate` / `paynow-webhook` Edge Functions; `PAYNOW_INTEGRATION_KEY` must be set.
- Set and activate the Planner prices, then flip `planner_public_signup` and the Planner site card at launch.
