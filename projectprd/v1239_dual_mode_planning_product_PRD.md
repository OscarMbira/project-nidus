# v1239 — Dual-mode Planning product

Status: DRAFT — scope and shape confirmed. This document is the brief for a later implementation plan. It does not authorise coding.

Plan: `projectplan/v1239_dual_mode_planning_product_plan.md` (decision interview 2026-10-10; decisions D1–D18 recorded there).

Feed this file to the planning pass. That pass must write a versioned plan under `projectplan/` and stop for approval before any code or SQL is written. Follow `projectplan/App_Guide.md` and `CLAUDE.md` when writing that plan.

## Relationship to v1200

[projectprd/v1200_project_planner_standalone_PRD.md](v1200_project_planner_standalone_PRD.md) stays as history. Keep its commercial rules:

- One database and one account/project model. Products differ by entitlement, not by a second copy of the data.
- Row-level security enforces access. The app hiding a menu is not enough.
- The planner has its own invitation flow. A Platform invitation does not create or invite a planner account.
- Sign-up is an email address. One 14-day trial, no card. When the trial ends the account is read-only, not deleted.
- Upgrade and downgrade change the entitlement only. Projects, tasks, memberships, and the rest of the planning rows stay in place.
- Planner menus come from a database allow-list. Anything not on the list stays hidden, including features added to Platform later.
- Pricing is a single per-user monthly price, with an annual option at about two months free. Payment-provider detail stays in the billing work, not in this PRD.

This PRD replaces v1200's feature ceiling. The planner is no longer a task list, a simple timeline, and timesheets. It is the full Planning Hub plus the schedule surfaces listed below. v1200's exclusion of critical path, baselines, and plan governance no longer applies. Timesheet entry against a task, and the comparison of planned work with logged hours, stay in.

## a) Problem statement

Some customers need to plan a project and do not want the rest of the PMIS: benefits, quality, procurement, industry packs, or the wider governance menus. Today the only front door is the full Platform. The planning screens already exist, but they are embedded inside Platform and copied again for Simulator, and the federated Planning Hub loads those Platform pages directly. There is no planning product with its own landing page that can run on its own.

The same customer may later want the full PMIS. Re-keying the plan into another database would throw away the reason the three systems share tables. The planner and the embedded planning screens must be the same files, reading and writing the same project rows.

## b) Solution

Deliver planning twice from one implementation.

1. **Embedded.** Platform keeps planning inside the signed-in PMIS, on `public` tables. Simulator keeps practice planning inside the Simulator app, on `sim` tables. Both shells render the same pages and services.
2. **Independent.** A fourth app in this monorepo, `apps/planner`, with its own public landing page and its own signed-in shell. It uses the same Supabase project and the same `public` project and task rows as Platform. A planner entitlement shows only the planning allow-list. Upgrading that account to Platform reveals the rest of the PMIS on the next sign-in. Nothing is copied across.

The planner is a working planning product on its own: the Planning Hub and the schedule tools. It is not a second PMIS with the other menus hidden in name only.

Admin does not grow planner screens. It continues to administer entitlements, feature flags, and ID-generation rules.

## c) User stories

Landing, trial, and entitlement

1. As a visitor, I can open a public landing page that belongs to the planner, separate from the Platform homepage and the Simulator homepage.
2. As a visitor, I can see that this product is for planning, and that moving to the full PMIS later keeps the projects I create here.
3. As a new visitor, I can sign up with an email address and start a 14-day trial without entering a card.
4. As a trial user, I see the number of days left in the header.
5. As a trial user whose trial has ended, I can still open and read my projects, but I cannot create or edit anything.
6. As a trial or read-only user, I can choose the planner plan and pay without losing any data.

First project and schedule

7. As a new user with no projects, I see a prompt to create the first project instead of an empty grid.
8. As a user, I can create a project with a name, a start date, and an end date.
9. As a user, I can add, edit, and delete activities with a name, start, end, and duration.
10. As a user, I can link an activity to one or more predecessors, and the Gantt shows the link.
11. As a user, I can open the activity register, the Gantt, the dependency network, the critical path, the look-ahead plan, and the schedule variance for the current project.
12. As a user, I can keep milestones, with key dates, forecast, and slippage.
13. As a user, I can set the project calendar, working days, and exceptions such as public holidays.
14. As a user, I can save a schedule baseline, see baseline history, and compare the current schedule with that baseline.
15. As a user, I can record planning dependencies that are internal or external, with an owner and dates.
16. As a user, I can enter timesheet hours against an activity for a given day, and compare planned work for a week with the hours logged.

Planning Hub

17. As a user, I can open the Planning Hub for the current project and move to each of its areas: plan intelligence, scenarios, product breakdown, plan health, AI plan draft, executive view, recovery planning, confidence forecast, governance gates, and team micro-plans.
18. As a user with more than one project on the account, I can open portfolio collision alerts for those projects.
19. As a user, I can run a plan-intelligence scan and see open findings for the project.
20. As a user, I can create a what-if scenario, compare it with the current plan, and archive it.
21. As a user, I can build the product breakdown for the project.
22. As a user, I can see the latest plan-health score for the project.
23. As a user, I can generate a draft plan with the AI plan flow and keep or discard the draft.
24. As a user, I can open the executive summary of the plan.
25. As a user, I can record a recovery approach when the schedule has slipped.
26. As a user, I can record a confidence forecast using three-point estimates.
27. As a user, I can work a governance-gate checklist for the plan and see pending or non-compliant items.
28. As a user, I can create and open team micro-plans, including drafts waiting to be finished.
29. As an account operator on the planner entitlement, I can maintain the intelligence rules and the governance-gate rules that those screens use.

Invitations

30. As a project manager in the planner, I can invite a person to a project by email. The invitation is sent and accepted in the planner.
31. As an invited planner user, I can accept the invitation and see that project in my list.
32. As a project manager, I can remove a member from a project, and that member loses access to it.
33. A Platform invitation never creates or changes a planner account.

Menus and access

34. As a planner user, I see only the menu items on the planner allow-list.
35. As a planner user, I cannot open a Platform-only page by typing its address. I am returned to the planner home.
36. As an operator, I can change the allow-list in the database without a code deploy.

Same screens, two shells

37. As a Platform user, I open the same planning screens the planner app uses. There is not a second copy of the page for Platform.
38. As a Simulator user, I open those same screens for a practice project. They read and write `sim` rows, not `public` rows.
39. As a maintainer, a fix to a shared planning screen is made once and is what Platform, Simulator, and the planner app all run.

Upgrade and downgrade

40. As a planner user, I can upgrade to Platform, and every project, activity, baseline, hub record, timesheet, and membership is still there afterwards.
41. As a Platform user who downgrades to the planner, I see a warning listing what I will lose access to, and I keep all data.
42. After an upgrade, Platform menus appear on my next sign-in, without re-entering any data.

## d) Implementation decisions

1. **Fourth app.** Create `apps/planner` in this monorepo. It has its own public landing page, its own sign-in shell, and its own dev port. It is not a route inside Platform and not a separate repository.
2. **Same database.** Real planner data uses the existing `public` tables (`projects`, activities/tasks, dependencies, calendars, baselines, and the tables the Planning Hub already reads). Do not create a planner schema and do not copy rows on upgrade.
3. **Entitlement.** A planner account and a Platform account differ by entitlement. Each app shows only what that entitlement allows. RLS must reject a planner session that reads or writes a table outside the planning set.
4. **Allow-list.** The planner menu is a database allow-list (rule 25.1). The list covers the hub areas in story 17, portfolio collisions (story 18), the schedule surfaces in stories 11–15, timesheets (story 16), and the two rules screens in story 29. New Platform menus stay off the list until someone adds them.
5. **One implementation.** Planning pages and their services live in shared packages that Platform, Simulator, and `apps/planner` import. Do not copy a page into `apps/planner`. Do not add new planning pages under the legacy `src/pages/planning/` tree.
6. **Invert the current hub coupling.** `packages/modules/planning-hub/src/routes.jsx` currently lazy-loads `@platform/pages/planning/...`. The plan must move those pages out of the Platform app so the hub remote, the Platform shell, the Simulator shell, and the planner app all import the shared package. `packages/modules/sim-planning-module` is only a stub home page today (`ModuleHome` on every route). It must render the same shared screens against the `sim` schema, not grow a second UI.
7. **Schema selection.** Shared screens take the database client from the shell: `platformDb` (`public`) in Platform and in the planner app, `simDb` (`sim`) in Simulator. A screen must not decide the schema by sniffing the URL path as its long-term design. `PlanningHub.jsx` does that today (`pathname` contains `/simulator/`) and then skips loading when it thinks it is the simulator. The extraction removes that skip so practice planning actually loads `sim` data.
8. **Embedded routes stay.** Platform routes that already exist keep working after extraction, including `pm/planning/*` (`PmPlanningFederated`), `pmo/planning/*` (`PmoPlanningFederated`), `schedule/activities`, `schedule/dependencies`, `schedule/gantt`, `schedule/critical-path`, `schedule/look-ahead`, `schedule/variance`, `planning/dependencies`, `planning/calendars`, and `planning/baselines`, plus the project-scoped `projects/:projectId/schedule/...` twins. The planner app exposes the same screens under its own prefix.
9. **Simulator is not a fourth product.** Practice planning stays inside the Simulator app. The planner app does not host a practice mode and does not write `sim` rows.
10. **Admin.** No planner UI in `E:\project-nidus-admin`. If a new identifiable table is truly required, register it and add the Admin ID-generation rule in the admin repo (rule 16.2). Prefer tables that already exist.
11. **Invitations.** Planner invitations are the planner's own project-member flow. They do not call the Platform invite path, and the Platform invite path does not create planner accounts.
12. **Trial and price.** Unchanged from v1200 decisions 6 and 9: 14 days from sign-up, no card, read-only after expiry, one per-user monthly price with an annual option at about two months free.
13. **Landing page.** The planner homepage follows the public-page pattern of `apps/platform/src/pages/PlatformHomepage.jsx` and `apps/platform/src/pages/SimulatorHomepage.jsx`: a marketing page before sign-in, then the app shell after sign-in. It is not the in-app Planning Hub.
14. **Theme and shell rules apply when the shared pages are moved.** `PlanningHub.jsx` is still a dark-only `min-h-screen bg-gray-950` shell. Extraction must make those pages inherit the app chrome (no full-page near-black shell) and satisfy the usual form, list, and back-button rules. Do that as part of the move, not as a separate visual project.
15. **Cross-app imports.** `apps/planner` must not import from `apps/platform` or `apps/simulator`. Shared code goes through `packages/*` (rule 46).

## e) Testing decisions

Seams to test at

- **Entitlement gate (unit).** Given an entitlement and a menu item, the gate returns visible or hidden. Cover every allow-list entry and a sample of excluded PMIS items (benefits, quality, procurement, decision log, meetings, stage gates).
- **Allow-list (integration, against the database).** A planner session cannot read or write a Platform-only table. RLS blocks the query, not only the UI (rule 42).
- **Trial state (unit).** Days remaining, read-only at day 14, and conversion that keeps the same account and project ids.
- **Shared module (unit).** A planning screen resolves the database client it was given. The same test runs once with the public client and once with the sim client.
- **Upgrade and downgrade (integration).** Project count, activity count, baseline count, hub-record count, timesheet count, and membership count are identical before and after each change.
- **Invitations (integration).** A Platform invite does not create a planner account. A planner invite creates membership only for the planner entitlement.
- **Routes (smoke).** Each allow-listed route renders in the planner app and in Platform. Each excluded route in the planner app redirects to the planner home. The Simulator route for the same screen reads `sim` data.

Done means

- Stories 1–42 each have at least one automated test at the seam above.
- Platform and Simulator retest suites pass after each slice (rule 43).
- A seeded test account (rule 18.2) shows unchanged row counts across upgrade and downgrade.
- No planning page remains imported from `apps/platform` by `packages/modules/planning-hub`.

## f) Out of scope

- The rest of the PMIS: benefits, quality, procurement, cost registers, the decision log, meetings, stage gates, industry packs, and the wider Platform Governance menu. Plan governance gates (story 27) stay in. Platform Governance stays out.
- Scope-management pages that are not the schedule: scope statement, requirements register, and traceability. The work breakdown used by the schedule is in scope only where the activity plan already depends on it. Do not pull the whole scope area into the planner.
- A separate database, a planner schema, or a row-copy on upgrade.
- A second public product for practice planning. Simulator stays the practice shell.
- Planner screens inside the Admin app.
- Cross-product invitations (a Platform user inviting a planner-only user, or the reverse).
- Desktop or offline clients.
- Payment-provider integration detail.
- Rewriting planning behaviour that already works, except where extraction requires a shared client or a theme fix (decision 14).

## g) Further notes

### Facts the plan must start from

- Hub tiles today, in `apps/platform/src/pages/planning/PlanningHub.jsx`: plan intelligence, scenarios, product breakdown, plan health, AI plan generator, executive view, recovery planning, confidence forecast, governance gates, team micro-plans, and (when not in Simulator) portfolio collisions. The same file exists under `apps/simulator/src/pages/planning/`. The hub links use `/pm/planning` on Platform and `/simulator/pm/planning` when the path contains `/simulator/`. On that simulator path the hub currently clears its counts and does not load.
- Federated hub routes: `packages/modules/planning-hub/src/routes.jsx` imports those Platform pages. Registry entry `planning_hub` in `packages/modules/registry.js` (port 5201, route prefix `/app/planning`). Platform mounts it at `pm/planning/*` and `pmo/planning/*`.
- Simulator federation remote `packages/modules/sim-planning-module/src/routes.jsx` renders only `ModuleHome`. Registry port 5301, route prefix `/simulator/planning`.
- Schedule screens already routed in `apps/platform/src/routes/platformRoutes.jsx` and named in decision 8. Gantt components live under `apps/platform/src/components/gantt/` and `apps/platform/src/components/schedule/`. Treat them as part of the shared extraction, not as a new scheduler.
- Rules screens already routed: `pmo/planning/intelligence-rules`, `pmo/planning/governance-rules`.
- Public homepages to mirror in structure: `apps/platform/src/pages/PlatformHomepage.jsx`, `apps/platform/src/pages/SimulatorHomepage.jsx`.
- Duplicate legacy pages under `src/pages/planning/` are not the source of truth.

### What the implementation plan must contain

Write `projectplan/v1239_dual_mode_planning_product_plan.md` (or the next free version if 1239 is taken). Do not start implementation from this PRD alone.

The plan is a list of vertical slices. Each slice cuts through the shared package, the shell that needs it, and a test. Each slice must leave both the embedded screens and the planner app working for the behaviour it touches. Minimum slices, in this order:

1. **Shared planning package.** Move the hub pages, schedule pages, and their services into `packages/` so Platform and the planner app import them. Point `planning-hub` and `sim-planning-module` at that package. Delete no user-facing route. Stop importing `@platform/pages/planning` from the hub remote.
2. **Schema client.** Shared screens use the client the shell passes. Simulator loads `sim` data. Platform and the planner app load `public` data. Remove the hub's simulator early-return that leaves practice planning empty.
3. **Planner app shell and landing page.** `apps/planner`, public homepage, sign-in, and a signed-in shell whose menu is the database allow-list. Direct navigation to anything off the list returns to the planner home.
4. **Trial, entitlement, and RLS.** 14-day trial, read-only after expiry, planner-only table access enforced in the database, upgrade and downgrade that do not move rows.
5. **Planner invitations.** The planner's own invite and remove-member flow, proven not to cross with Platform invites.
6. **Embedded regression.** Platform `pm/planning/*`, the schedule routes in decision 8, and the Simulator practice routes still open the shared screens after the move.

The plan's todo list is those slices, broken further only where a slice cannot be reviewed on its own. Every slice names the Platform file, the Simulator file, and the planner route it affects. Where a screen exists only on Platform today, the slice adds the Simulator path in the same change (rule 34.1) by sharing the file, not by copying it.

### Rules the plan must not waive

- No third-party product names in app, package, or component names (rules 26 and 27).
- Menus and the allow-list come from the database (rule 25.1). Update `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` in the same change as any menu edit (rule 70).
- New identifiable tables use Admin ID generation (rule 16.2). Seeds leave display ids blank.
- Theme, lists, forms, exports, and back buttons follow the existing rules when a page is moved or created (rules 28.1, 40, 40.1, 41, 44, 52, 61, 63.1, 65, 73).
- Do not bypass RLS (rule 42).

### Open only if the plan discovers a missing table

If a hub or schedule story has no table to read, the plan must name the table, say whether `public` and `sim` both need it, and stop for a decision before inventing a store. Do not design a parallel planner data model to get around a missing column.
