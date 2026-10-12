# Nidus Project Planner — guide (v1239)

The Project Planner is a lighter edition of Nidus for teams that only need scheduling. It runs at `planner.<domain>` (local: `http://localhost:5176`). It uses the same database and the same planning screens as the Platform and the Simulator.

- **Fixes and changes:** planning screens are fixed once in `packages/planning`. One merge rebuilds all three products.
- **Data:** a Planner workspace keeps all its data if it upgrades to the full PMIS, or comes back down.

Contents: [For users](#for-users) · [For operators](#for-operators) · [Support runbook](#support-runbook)

---

## For users

### Getting started
1. Go to `/signup` and enter your name, work email and a password.
2. Open the link in the confirmation email. Your workspace is created automatically; you can rename it in **Settings → Workspace**.
3. On **Home**, choose **Create your first project** or **Import a schedule**.

The free trial lasts 14 days with no card. Trial limits are 3 projects, 5 members, 500 tasks per project and 20 AI plan drafts. The header shows the days left. When the trial ends the workspace becomes **read-only** until you upgrade, and nothing is deleted.

### Planning a project
Open **Schedule** for a project. The tabs across the top are the same in every Nidus product:

| Tab | What it is for |
|---|---|
| Tasks | The plan grid. **New task** opens the task page. |
| Board | Drag cards between statuses. |
| Gantt | Timeline; red bars are on the critical path. Zoom days/weeks/months; tick **Show baseline**. |
| Network | Tasks in columns by what must finish first. |
| Critical path | Tasks with no float: a delay to any of them delays the finish. |
| Milestones | Zero-length tasks. |
| Look-ahead | Unfinished work in the next 1–6 weeks. |
| Variance | Scheduled finish against the saved baseline. |
| Dependencies | Links within the project, and links to other projects. |
| Calendar | Working days, hours per day, holidays and extra working days. |
| Baselines | Save today's dates to measure progress against. |
| Workload | Hours assigned per person per week against their capacity; red means over capacity. |
| My time | Log hours against your tasks, then **Submit week**. |
| Import / export | Bring in an XML, Excel or CSV schedule (with a preview first), or export the plan. |
| Due dates | Tasks by due date on a calendar. |

**How dates are worked out.** Give each task a duration in working days and link the tasks. **Recalculate** then sets every date from the links, the lags and the project calendar.
- A task set to **Manual** keeps the dates you type.
- Date constraints (start no earlier than, must start on, finish no later than) are on the task page.
- A link that would make a loop is refused.

**When two people edit at once.** If someone saved first, you see *"This plan changed since you opened it"* with **Reload plan**. Reload, then apply your change again. Nothing is overwritten.

### Team members and roles
Invite people from **Project setup → Members & invitations**. Each invitation has one of three roles:

| Role | Can do |
|---|---|
| Project manager | Everything on the project, including inviting people. |
| Team member | See the plan and update progress (% done, actual dates, hours) on tasks assigned to them. |
| Viewer | Read-only: schedule views and the Planning Hub. |

### Upgrading
**Settings → Upgrade** (account owner) offers two options:
- **Keep the Planner:** pay per seat.
- **Upgrade to the full PMIS:** after payment, choose **Open full PMIS** and sign in on the Platform with the same email. All projects, tasks, baselines and timesheets are already there.

---

## For operators

### Database (run in this order)
1. v1241 site SQL (brand site), v1242, v1243, v1244 (+ verify counts), v1245 + test vectors.
2. `v1246_planning_workload_menus.sql`
3. `v1247_product_edition_and_planner_trial.sql`, then `v1248_planner_plans_and_limits_seed.sql`
4. `v1249_planner_menu_allowlist.sql`, `v1252_plan_viewer_role.sql`, `v1254_planner_menu_items.sql`, `v1255_planner_menu_grants_seed.sql`, `v1250_planner_menu_allowlist_seed.sql`
5. `v1256_planner_project_rpcs.sql`, `v1257_planner_invitations.sql`
6. `v1251_planner_table_wall.sql` (read the WARNING listing any public tables without RLS)
7. Admin: `v227_planner_edition_admin_rpc.sql`, `v228_planner_menu_availability_nav.sql`
8. Checks: `v1258_planner_edition_db_tests.sql` (rolled back; all PASS) and `v1253_planner_demo_seed_and_continuity_check.sql` part B (rolled back; PASS).

### Settings before launch
- **Prices:** set the per-seat price on the two inactive "Project Planner" rows in Admin → **Subscription & Billing → Subscriptions Catalog → Plan Catalog** (`http://localhost:5175/subscriptions/plan-catalog`), then activate them.
- **Environment variables:**
  - `VITE_PLANNER_URL` for the Platform (the planner-edition redirect and the downgrade page).
  - `VITE_PLATFORM_URL` for the Planner (the "Open full PMIS" link).
- **Deploy secret:** `PLANNER_VERCEL_PROJECT_ID` for `.github/workflows/app-planner.yml`.
- **Edge Functions:** redeploy `paynow-initiate` and `paynow-webhook`. The Planner branch requires `PAYNOW_INTEGRATION_KEY`, because unsigned callbacks are ignored.
- **Launch:** turn on `planner_public_signup` in Admin Feature Flags (no sidebar item: open `http://localhost:5175/system/feature-flags`), and set the Planner card active on the brand site (Admin → **Content & Localization → Content → Public Site Products**, `/content/public-site`).

### When the code changes
If a Planner screen starts using a new table:
1. Run `node scripts/generate-planner-table-allowlist.mjs --write`.
2. Re-run `SQL/v1251_planner_table_wall.sql`.

CI fails while the list is stale. Every new `public` table also needs v1251 re-run (CLAUDE.md, new-table checklist).

### Kill switch and rollback
- **Sign-up:** Admin Feature Flags (`/system/feature-flags`) → `planner_public_signup` off. Sign-up hides within one page load; existing users are unaffected.
- **Wall:** `SQL/v1251r_planner_table_wall_rollback.sql` removes the planner policies.
- **Backfill:** `SQL/v1244r_activity_list_to_tasks_backfill_rollback.sql`.

---

## Support runbook

| Situation | What to do |
|---|---|
| Change a workspace's edition | Admin → **Users & Organisations → Directory → Organisations** (`/users/org-list`) → Manage → **Change edition to …** (reason required, audited). |
| Extend a trial | Update the account's `platform_subscriptions` row (`plan_type = 'planner'`, `is_trial = true`): set `trial_end` and `expires_at` to the new date. The status function reads it straight away. |
| A Planner screen is blank or shows "permission denied" | A table the screen needs is walled. Run the allow-list generator and look for the table. If it is missing, the screen reads it in a way the generator cannot see (e.g. a dynamic table name): add it to `ALWAYS` in the script, regenerate, then re-run v1251. |
| A menu item is missing for everyone | Admin → **System & Security → System → Planner Menu Availability** (`/system/planner-menu`): check the item is **Available**, then check the role grant (v1255). |
| A payment did not unlock the workspace | Check `payment_transactions` for the reference.<br>• `paid` but no new `platform_subscriptions` row: the webhook refused it. Read the Edge Function log for "Planner payment ignored": unsigned, payer is not the owner, or amount below price.<br>• Fix the cause, then insert the subscription by hand or re-send the callback. |
| An invited person got their own trial workspace | They signed up without opening the invitation link first. In Admin, suspend the stray workspace; then they open the invitation link and accept it. |
| Duplicate tasks after the activity backfill | Use `v1244r` with the batch tag (see v1244), reconcile, then re-run v1244. |
