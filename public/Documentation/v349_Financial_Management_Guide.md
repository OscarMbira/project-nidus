# Financial Management (v349) — User Guide

**Scope:** Platform (`/platform/...`) and Simulator (`/simulator/...`) where routes exist.

## Applying database changes

Run SQL scripts on Supabase in order:

1. `SQL/v416_financial_permissions.sql`
2. `SQL/v417_project_cost_entries_and_baselines.sql`
3. `SQL/v418_project_evm_snapshots.sql`
4. `SQL/v419_project_revenue_entries.sql`
5. `SQL/v420_project_expense_claims.sql`
6. `SQL/v421_sim_financial_tables.sql`
7. `SQL/v422_financial_menu_items.sql`
8. `SQL/v423_resolve_expense_approval_chain_full.sql` — full **`resolve_expense_approval_chain`** (Platform + Simulator)
9. `SQL/v424_programme_financial_rollups_view.sql` — view **`programme_financial_rollups`**
10. *(Optional dev/demo)* `SQL/v425_financial_management_seed_data.sql` — ≥22 tagged rows per financial table that **exists** (`FM-SEED v425` markers). Uses `to_regclass()` and **dynamic `EXECUTE`** for inserts and row counts so missing tables (e.g. **v420** expense tables) do not cause parse errors; run v417–v421 for full seed. Requires existing projects, users, and accounts. If there are no active `sim.practice_projects`, the script inserts one bootstrap row (`project_code` **FM-SEED-v425-PP**) with `user_id` = **`public.users.auth_user_id`** where that id still exists in **`auth.users`**. Safe re-run: deletes prior v425 seed rows first (bootstrap practice project is left in place).

Earlier planning documents referred to versions v293–v300; the repository ships the same logical content under **v416–v424** (plus optional **v425** seed) to avoid filename clashes.

## Main entry points

| Area | Platform | Simulator |
|------|----------|-------------|
| Financial reporting hub | `/platform/financial-reports` | `/simulator/financial-reports` |
| My expenses | `/platform/expenses/my` | `/simulator/expenses/my` |
| Expense approvals | `/platform/expenses/approvals` | `/simulator/expenses/approvals` |
| PMO expense thresholds | `/platform/pmo-admin/expense-thresholds` | `/simulator/pmo/expense-thresholds` |
| Portfolio EVM | `/platform/portfolio/evm` | `/simulator/practice-portfolio/evm` |

## Project-scoped routes

Replace `:projectId` with the project (or practice project) UUID.

| Feature | Platform | Simulator |
|---------|----------|-------------|
| Costs | `/platform/projects/:projectId/costs` | `/simulator/practice-projects/:projectId/costs` |
| Budget baseline | `/platform/projects/:projectId/budget-baseline` | `/simulator/practice-projects/:projectId/budget-baseline` |
| EVM | `/platform/projects/:projectId/evm` | `/simulator/practice-projects/:projectId/evm` |
| Profitability | `/platform/projects/:projectId/profitability` | `/simulator/practice-projects/:projectId/profitability` |

## Programme routes

Programme pages use the parameter name **`id`** (same as existing programme detail routes).

| Feature | Platform | Simulator |
|---------|----------|-------------|
| Programme EVM | `/platform/programme/:id/evm` | `/simulator/practice-programme/:programmeId/evm` |
| Programme financial dashboard | `/platform/programme/:id/financial` | `/simulator/practice-programme/:programmeId/financial` |

## Sidebar and roles

- **Platform:** Main sidebar items come from `menu_items` / `role_menu_items` (see `v422_financial_menu_items.sql`). PMO and PM specialist sidebars use `pmoMenuConfig.js` and `pmDashboardMenuConfig.js`.
- **Simulator:** `simulatorMenuConfig.js` includes a **Financial Management** group marked `premium` in the subscription filter; PMO/PM simulator sidebars include the same destinations under `simulatorPMOMenuConfig.js` and `simulatorPMMenuConfig.js`.

## Permissions

Financial permissions (`finance.view`, `finance.manage`, etc.) are defined in `v416_financial_permissions.sql`. UI behaviour also uses `useFinancialPermissions` for edit vs view-only controls.

## Expense approval chain

- On submit, **`public.resolve_expense_approval_chain`** (or **`sim.resolve_expense_approval_chain`** for practice projects) builds up to **three** approvers from assigned managers and **PMO** when account thresholds require it.
- **`ExpenseApproval`** lists claims where **you** are the current approver; **Mark paid** appears for **`canManageAll`** users when status is **`fully_approved`**.

---

*Guide version: aligns with project plan v349 — 2026-04-09.*
