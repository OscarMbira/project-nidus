# Work Authorisation System — Technical Runbook

## SQL deployment order

Run on Supabase (PostgreSQL 15+) in this order:

1. `SQL/v489_work_authorisation_public.sql` — public tables, RLS, RPC `work_authorisation_transition`, helper `work_authorisation_has_approved_action`, `database_tables` registry.
2. `SQL/v490_work_authorisation_sim.sql` — `sim` schema tables, RLS, RPC `sim.work_authorisation_transition`, helpers.
3. `SQL/v491_work_authorisation_permissions_menu.sql` — permissions, `role_permissions`, `menu_items`, `role_menu_items`.

Scripts are idempotent where possible (`IF NOT EXISTS`, `ON CONFLICT`, `DROP POLICY IF EXISTS`).

## Rollback

- Drop policies and tables in reverse dependency order: history → steps → work_authorisations.
- Remove menu rows for `platform_work_authorisation*`, `sim_pm_controls_work_authorisation*`.
- Remove permissions `work_authorisation.*` and related `role_permissions` (coordinate with any custom role assignments).

## Permission mapping

| Code | Purpose |
|------|---------|
| `work_authorisation.view` | View lists and records |
| `work_authorisation.request` | Create, submit, execute, close, cancel (requestor rules in RPC) |
| `work_authorisation.review` | Review queue (UI; align with approve where used) |
| `work_authorisation.approve` | Approve, reject, defer |
| `work_authorisation.suspend` | Suspend / resume |
| `work_authorisation.audit` | Extended audit visibility (seeded for admin roles) |

RPC `work_authorisation_transition` enforces `has_project_permission` for Platform.

## Notifications

In-app rows are inserted into `public.notifications` after successful transitions (Platform and Simulator).

## Deployment checklist

- [ ] Run v489 → v490 → v491 on dev.
- [ ] Smoke-test Platform routes under `/platform/work-authorisations/*`.
- [ ] Smoke-test Simulator routes under `/simulator/pm/controls/work-authorisations/*`.
- [ ] Verify sidebar entries for a test user per role.
- [ ] Repeat on staging, then production.
