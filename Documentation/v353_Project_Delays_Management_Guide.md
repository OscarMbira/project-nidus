# Project Delays Management (v353)

**Date:** 2026-04-11  

This guide describes the **Project Delay Register**, **PMO delay templates**, auto-linking from overdue issues/risks/defects, and ownership history.

## Database (run in order)

| File | Purpose |
|------|---------|
| `SQL/v444_project_delays.sql` | `delay_templates`, `project_delays`, `project_delay_owner_history`, RLS, reference trigger |
| `SQL/v445_sim_project_delays.sql` | Simulator mirror in `sim` schema |
| `SQL/v446_project_delays_menu_items.sql` | Permissions and menu assignments |
| `SQL/v447_delay_auto_link_triggers.sql` | Platform auto-link + `sync_overdue_delays` RPC |
| `SQL/v448_sim_delay_auto_link_triggers.sql` | Simulator auto-link + `sim.sync_overdue_delays` RPC |

## Application routes

| Area | Path |
|------|------|
| PM Dashboard | `/pm/delays`, `/pm/delays/drafts` |
| Platform | `/platform/delays`, `/platform/delays/drafts` |
| PMO oversight | `/pmo/oversight/delays` |
| PMO templates | `/pmo/delays/templates` |
| Simulator | `/simulator/delays`, `/simulator/pm/delays`, `/simulator/pmo/oversight/delays`, `/simulator/pmo/delays/templates` |

## Permissions

- `delay.view`, `delay.create`, `delay.edit`, `delay.delete`, `delay.copy`
- `delay_template.*` for PMO template CRUD

## Behaviour summary

1. **Templates** — PMO maintains org-level `delay_templates`; project teams use **Use template** to pre-fill a delay (`source_type = from_template`).
2. **Auto-link** — Triggers on `issues`, `risks`, and `defects` create/update `auto_*` delays when items are overdue; resolving the source resolves the linked delay (record retained).
3. **Sync** — **Sync overdue** calls `sync_overdue_delays` / `sim.sync_overdue_delays` to backfill after imports or deployment.
4. **Ownership** — Changes to `resolution_owner_id` append rows to `project_delay_owner_history` (append-only).

## Frontend modules

- Services: `src/services/delayService.js`, `src/services/sim/simDelayService.js`
- Pages: `src/pages/delays/DelayRegister.jsx`, `src/pages/delays/DelayForm.jsx`, `src/pages/pmo/DelayTemplates.jsx`, `src/pages/pmo/DelayTemplateForm.jsx`
- Components: `src/components/delays/*`

## Tests

- `src/services/__tests__/delayService.test.js`
- `src/services/__tests__/simDelayService.test.js`
