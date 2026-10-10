# v1239 — Dual-mode Planning product: implementation plan

**Source PRDs:** `projectprd/v1239_dual_mode_planning_product_PRD.md` (governing scope and decisions) ·
`projectprd/Project_Planning_Module_PRD_for_Claude.md` (generic brief, supplies the extra plan sections) ·
`projectprd/v1200_project_planner_standalone_PRD.md` (history; commercial rules carried by v1239).
**Supersedes:** `projectplan/v1201_project_planner_standalone_plan.md` (never started).
**Depends on:** `projectplan/v1240_shared_package_consolidation_plan.md` — **must be complete before Slice 1 starts** (owner decision 2026-10-10: separate plans, run one after the other).
**Related:** `projectplan/v1241_nidus_brand_site_plan.md` (single Nidus landing page linking Platform, Simulator and Planner).
**Status:** DRAFT. Decision interview complete (2026-10-10). **Waiting for approval. No code or SQL until approved.**

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
- [ ] Record the current Platform and Simulator retest suite results on HEAD (v1206 noted that a baseline was never taken).
- [ ] Discovery SQL, read-only: counts of `activity_list` rows with no matching `tasks` per account and schema. Check whether every `timesheet_entries.task_id` resolves to `tasks.id` (Q3).
- [ ] Confirm v1240 is complete: no `@nidus/ui` / `@nidus/shared/*` alias overrides remain in `apps/platform` / `apps/simulator` `vite.config.js`, and the drift check is green.

### Slice 1 — Shared planning package (Platform first, no visible change)
- [ ] 1.1 Scaffold `packages/planning` (`@nidus/planning`): `PlanningDbProvider`, `usePlanningDb`, `usePlanningBasePath`. Test: a dummy screen reads the injected client.
- [ ] 1.2 CI (D20): add `packages/planning/**` to the trigger paths of `module-planning-hub.yml` and `module-sim-planning-module.yml` (and `app-planner.yml` when it is created in 5.1). Test: a dry-run workflow change shows all three jobs triggered by a `packages/planning` edit.
- [ ] 1.3 Move the hub services (`plan*.js`, `microPlanService.js`) into `packages/planning/services`. Swap `platformDb` for an injected client parameter. Each Platform service file becomes a re-export so other callers keep working (rule 32).
- [ ] 1.4 Move the 16 hub pages + `PlanningHub.jsx` into `packages/planning/screens/hub`:
  - Remove the `/simulator/` path sniff.
  - Replace the `bg-gray-950` shell with inherited app chrome (v1239 D14).
  - Add a back button (rule 73).
- [ ] 1.5 `planning-hub/src/routes.jsx` renders `@nidus/planning` routes inside `PlanningDbProvider(platformDb, '/pm/planning')`. Test: no `@platform/` import remains (lint rule + test).
- [ ] 1.6 Embedded smoke: `pm/planning/*` and `pmo/planning/*` render every hub route.

### Slice 2 — `sim` parity, schema client, `tasks` as canonical
- [ ] 2.1 **SQL v1242** `sim_planning_parity_tables.sql`: `sim` twins of `tasks`, `task_dependencies`, `task_statuses` (if missing), `project_baselines`, `baseline_snapshots`, `project_milestones`, `inter_project_dependencies`, `dependency_resolutions`, `dependency_impacts`, `dependency_critical_paths`, `gantt_settings`. Includes RLS mirroring `public`, `database_tables` rows, and display-ID triggers where reference columns exist. Admin ID rules go in **Admin SQL v226** if missing. Ends with `NOTIFY pgrst`.
- [ ] 2.2 **SQL v1243** `tasks_row_version_and_activity_link.sql`: `tasks.row_version` + bump trigger, `tasks.schedule_mode`, `constraint_type`, `constraint_date`, `activity_list.task_id` (both schemas).
- [ ] 2.3 **SQL v1244** `activity_list_to_tasks_backfill.sql`:
  - Snapshot tables, a batch id, then insert tasks and dependencies for unlinked rows and set `activity_list.task_id`.
  - Reconciliation counts are emitted as a NOTICE.
  - Rollback script: `v1242r_…_rollback.sql`.
- [ ] 2.4 `sim-planning-module/src/routes.jsx` renders `@nidus/planning` routes with `PlanningDbProvider(simDb, '/simulator/pm/planning')`. Simulator `/simulator/pm/planning/*` routes point at the module.
- [ ] 2.5 Fix the Simulator `activityListService` → `simDb` (bug).
- [ ] 2.6 Screen contract test: each hub screen with the public client and the sim client.

### Slice 3 — Schedule screens on `tasks` + scheduling engine
- [ ] 3.1 Move the schedule screens into `packages/planning/screens/schedule` on `tasks`:
  - Grid
  - Gantt: consolidated onto `components/gantt/*`. The other two Gantt files are retired once their routes point to the shared one.
  - Network (`ActivityNetworkDiagram`)
  - Critical path, look-ahead, variance
  - Milestones (`MilestoneManager`)
  - Dependencies (internal/external)
  - Calendars + exceptions
  - Baselines
- [ ] 3.2 `engine/schedule.js`: working-calendar-aware wrapper over `cpmCalculator`. Unit tests cover weekends and holidays, all four dependency types, lag, and the manual/auto modes.
- [ ] 3.3 **SQL v1245** `recalculate_project_schedule_rpc.sql`: calendar-aware RPC + `row_version` conflict check (both schemas).
- [ ] 3.4 Conflict UX test: a stale save is rejected and the reload prompt is shown.
- [ ] 3.5 Platform routes in v1239 D8 (`schedule/*`, `planning/*`, `projects/:projectId/schedule/*`) and the Simulator `practice-projects/:projectId/schedule/*` routes render the shared screens. The PMBOK estimating pages (`ActivityDetail`, `ScheduleManagementPlan`) stay app-local.

### Slice 4 — Board, calendar, workload, timesheets, import/export
- [ ] 4.1 `TasksBoard` and `TasksCalendar` → shared screens (Platform routes unchanged).
- [ ] 4.2 New **Workload** screen: assigned estimated hours per person per week vs capacity (from the resource calendar where present). Card/table toggle, exports, tests.
  - New menu items `plat_pm_planning_workload` and `sim_pm_planning_workload`, granted to the same roles as the existing planning menus (**SQL v1246**, + seed).
  - `Core_PM_and_Industry_Menu_Taxonomy.md` updated (rule 70).
- [ ] 4.3 Timesheet entry against a task + the work-plan comparison. Shared wrappers around `WeeklyTimesheetGrid`, `WorkPlanGrid` and `projectWorkPlanService`, scoped to planning-only use.
- [ ] 4.4 Schedule import/export:
  - Move `msProjectService` → `packages/planning/services/scheduleExchangeService.js` (injected client).
  - XML + XLSX import with preview/confirm steps.
  - Export to XML/XLSX/CSV with legend sheets and a CSV `#` dictionary (rule 71).
  - Neutral UI names.

### Slice 5 — Planner app shell and landing page
- [ ] 5.1 `apps/planner`:
  - Vite on port 5176, no `@nidus/*` alias overrides.
  - ESLint `no-restricted-imports` for `apps/*`.
  - Turbo filter `@nidus/planner-app`.
  - CI workflow `.github/workflows/app-planner.yml`, triggered on `apps/planner/**`, `packages/planning/**`, `packages/ui|shared|supabase|config/**` (D20).
  - `DEV_MODULES.md`-style `apps/planner/DEV_APP.md`.
- [ ] 5.2 Lean `PlannerShell` in `packages/ui`: header with trial badge, sidebar from the database allow-list, PWA manifest + service worker.
- [ ] 5.2a **Planner sidebar menus (D19).** **SQL v1254** `planner_menu_items.sql` + **v1255** seed. Creates the `pln_` menu tree in `menu_items` with `/app/...` route paths, in this sidebar order:
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
- [ ] 5.3 Public pages: `/`, `/pricing`, `/login`, `/signup`, `/verify`, `/reset-password`. The landing page mounts the shared `NidusFamilyBar` (v1241) with `currentSlug="planner"`.
- [ ] 5.4 `/app/*` routes = the `@nidus/planning` route table + Home, Projects, Members, Settings, Billing, Upgrade. Unknown → `/app`. Test: allow-listed routes render; others redirect.
- [ ] 5.5 Home empty state "Create your first project" / "Import a schedule" (stories 7–8).

### Slice 6 — Edition, trial, limits, database wall
- [ ] 6.1 **SQL v1247** `product_edition_and_planner_trial.sql`:
  - `accounts.product_edition` (default `'platform'`).
  - `'planner'` added to the `user_platform_access` / `platform_subscriptions` checks.
  - `plan_type 'planner'`, `auth_user_account_edition()`, `auth_user_account_can_write()`, limit triggers.
  - `change_account_edition()` RPC.
- [ ] 6.2 **SQL v1248** seed: planner subscription plan rows + limits (trial and paid).
- [ ] 6.3 **SQL v1249** `planner_menu_allowlist.sql`: allow-list table + the fail-closed branch in `get_account_available_menu_item_ids()`. **v1250** is the companion seed listing the `pln_` menu codes from 5.2a (planner rows only; `plat_`/`sim_` rows are never allow-listed).
- [ ] 6.4 **SQL v1251** `planner_table_wall.sql`: `planner_table_allowlist` (generated list) + the restrictive policy loop + the read-only-on-expiry write policy on planning tables.
- [ ] 6.5 Planner sign-up flow:
  - Email + name → existing auth → `createOrganisation()` with a default name (renameable) → `product_edition='planner'` → trial subscription row → global template sync (existing hook).
  - Email verification is still required before creating projects.
- [ ] 6.6 Tests:
  - Trial days remaining (day 0/13/14/15), read-only at expiry.
  - Limit triggers.
  - RLS integration (§6 strategy).
  - Generated-allowlist drift test.
  - Platform-edition regression.

### Slice 7 — Roles and planner invitations
- [ ] 7.1 **SQL v1252** `plan_viewer_role.sql`: new system role + `role_menu_items` grants (read-only planning menus). The role is read-only through the existing role permission model.
- [ ] 7.2 Planner invite/remove-member flow on the existing project-invitation tables (`v85`), with its own planner email template and accept page (`/app/invite/:token`). It does not call the Platform invite path.
- [ ] 7.3 Tests:
  - A planner invite creates membership only.
  - A Platform invite never creates or changes a planner account.
  - A removed member loses access.
  - A team member can edit only their own assigned tasks' progress.

### Slice 8 — Upgrade, downgrade, billing, Admin
- [ ] 8.1 `/app/upgrade` + `/app/billing` → existing Paynow initiation. The webhook (Edge Function) calls `change_account_edition` after hash verification.
- [ ] 8.2 Success page → "Open full PMIS" link to `platform.<domain>`. On Platform, a planner-edition sign-in shows the upgrade page instead of the PMIS.
- [ ] 8.3 Downgrade (account owner, in Platform settings): a warning lists the menus that will be hidden. Data is kept.
- [ ] 8.4 **Admin** (`E:\project-nidus-admin`, plan **v211**, SQL **v227–v228**):
  - Edition badge + filter on Accounts.
  - Audited "Change edition" action (reason required) via an Admin RPC wrapper.
  - "Available in Planner" toggle on menu items (writes `planner_menu_allowlist` through a narrow SECURITY DEFINER RPC, documented like the v765/v779 exceptions).
  - Planner plan pricing in the subscription catalog.
- [ ] 8.5 Tests: project, task, baseline, hub-record, timesheet and membership counts are identical before and after upgrade and downgrade on a seeded account (**v1253** seed: planner demo account, blank display IDs, rule 16.2).

### Slice 9 — Embedded regression and launch gates
- [ ] 9.1 Smoke run of every v1239 D8 Platform route, every Simulator practice planning route, and every planner route.
- [ ] 9.2 Performance checks:
  - Gantt first paint < 2 s at 1,000 tasks; usable at 5,000.
  - Client recalc < 150 ms at 1,000 tasks.
  - Server recalc < 1 s at 1,000 tasks.
- [ ] 9.3 Security review (`REVIEW.md` gates + `/security-review`): wall coverage, edition RPC, webhook hash.
- [ ] 9.4 Documentation:
  - `Documentation/Project_Planner_v1239_Guide.md` (user guide + operator guide + support runbook).
  - Blog note (rule 22).
  - Taxonomy update.
  - CLAUDE.md addendum for D4 (planner org/trial exception) and the wall re-run step in the new-table checklist.
- [ ] 9.5 ROADMAP.md: add Project Planner as a product line with its status.
- [ ] 9.6 Go/no-go (§10) → enable `planner_public_signup`.

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

## 15. Review (filled in after implementation)

Not started.
