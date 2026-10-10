# v1201 — Project Planner implementation plan

Source PRD: `projectprd/v1200_project_planner_standalone_PRD.md` (approved).
Status: **SUPERSEDED (2026-10-10)** by `projectplan/v1239_dual_mode_planning_product_plan.md`. Never started. Kept as history.

## Approach

Test-first vertical slices (projectplan/App_Guide.md). Each slice cuts through the database, shared
core, the Planner app and tests. For each behaviour: write the failing test, then the smallest code
to pass it, then refactor. Each slice ends with the retest suite (rule 43) and a short note of what
changed (rule 5 of the workflow).

## Shape of the work

- **New app:** `apps/planner/` in the monorepo, deployable on its own. Local dev port 5176
  (5173 Platform, 5174 Simulator, 5175 Admin, 5180–5192 modules are taken or reserved).
- **Shared core:** the PM features (tasks, timeline, timesheets, work-plan comparison) are used from
  `packages/*`. Where they live inside `apps/platform` today, extract only what Planner needs.
  Platform must keep working after every extraction (rule 32).
- **Database:** new SQL migrations under `SQL/` starting at v1202. Each new table is registered in
  `database_tables` (rule 16.2). Seeds are companion files (rule 18.2). Every migration ends with
  `NOTIFY pgrst, 'reload schema'`.
- **Access control:** entitlement and allow-list are enforced by row-level security using
  SECURITY DEFINER helpers, not by the app (PRD decision 3; project memory on RLS).

## Slices

### Slice 0 — Entitlement and allow-list foundation
- [ ] Test: an entitlement resolves to the Planner or Platform allow-list; excluded items are hidden.
- [ ] Test: Planner session cannot read a Platform-only menu row (RLS).
- [ ] SQL v1202: `account_entitlements` table, `planner_menu_allowlist` table, helper `auth_user_entitlement()`.
- [ ] Shared gate function `resolveVisibleMenuItems(entitlement, items)` in `packages/shared`.
- [ ] Seed: Planner allow-list (companion seed file v1203).

### Slice 1 — Sign-up, trial and read-only transition
- [ ] Test: a new account gets a 14-day trial with no card.
- [ ] Test: trial days remaining is computed correctly, including at day 0 and day 14.
- [ ] Test: after day 14 the account is read-only; reads still work, writes are refused.
- [ ] Planner sign-up and sign-in pages (routed, theme-aware, PWA — rules 28.1, 39).
- [ ] Trial header showing days remaining.

### Slice 2 — First project and tasks
- [ ] Test: first sign-in shows "Create your first project" when the user has no projects.
- [ ] Test: create a project with name, start date and end date.
- [ ] Test: add, edit and delete a task with name, start, end and duration.
- [ ] Routed create and edit pages with unsaved-changes guard (rules 65, 52) and draft queue (rule 37).
- [ ] Task table with row numbers and sortable headers (rules 44, 40).

### Slice 3 — Dependencies and timeline
- [ ] Test: a finish-to-start link between two tasks is stored and read back.
- [ ] Test: the timeline draws the link; a cycle is refused with a clear message.
- [ ] Timeline view with a card/table toggle (rule 41).

### Slice 4 — Timesheets and work-plan comparison
- [ ] Test: timesheet hours entered against a task for a day are saved and totalled per week.
- [ ] Test: the week comparison reports planned vs logged, reusing the existing comparison function.
- [ ] Reuse existing timesheet and work-plan services; extract only what Planner needs.

### Slice 5 — Planner invitations and membership
- [ ] Test: a Planner invitation creates membership inside Planner and does not create a Platform account.
- [ ] Test: a Platform invitation does not create or change a Planner account.
- [ ] Test: removing a member removes their access to the project.
- [ ] Invitation accept page and member management in Planner.

### Slice 6 — Upgrade and downgrade
- [ ] Test: upgrading Planner to Platform keeps the project, task, timesheet and membership counts identical.
- [ ] Test: downgrade shows the warning and keeps all data.
- [ ] Entitlement change endpoint (RPC, rule 42-compliant) and the warning dialog.

### Slice 7 — Route guard and hardening
- [ ] Test: a Planner user typing a Platform-only address is redirected to the Planner home (story 17).
- [ ] Test: each allowed route renders; each excluded route redirects.
- [ ] Retest suite green in Planner, Platform and Simulator (rule 43).

## Decisions still needed before Slice 0

1. Port 5176 for the Planner app: confirm.
2. Whether Simulator parity applies to the Planner features (PRD says Planner is separate; rule 34
   says check). Recommended: no Simulator parity for Planner, recorded here.
3. Billing provider: the PRD defers it; Slice 1 needs a trial record only, with payment added later.

## Review (filled in after implementation)

Not started.
