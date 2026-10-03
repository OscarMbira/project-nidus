# v1024 — Scope & Deliverables Implementation Plan

## Todos

- [x] SQL menu group + re-parent Scope Statement / WBS; add PBS + Deliverable Register leaves; grants (public + sim)
- [x] SQL `control_accounts` + `deliverable_register` (+ sim) RLS, `database_tables`, display_id triggers
- [x] `PM_CATEGORY_DEFS` + sidebar cache bump (fallback label only when DB label missing)
- [x] Scope Statement: Boundaries label; `usePlatformProjectId`; flat route
- [x] PBS Builder: full CRUD + Descriptions tab links; theme fix
- [x] WBS hub: tabs Hierarchy / Dictionary / Control Accounts / Work Packages link
- [x] Deliverable Register list/form/detail CRUD + status tabs
- [x] Platform + Simulator routes/services/parity (PBS dual-mode; sim menu + tables; sim PBS route)
- [x] Unit tests for new services
- [x] Plan review section after implementation

## Menu (DB only)

| menu_code | Label | Route |
|-----------|-------|-------|
| `plat_pm_scope_deliverables` | Scope & Deliverables | (category) |
| `plat_pm_planning_scope_statement` | Scope Statement | `/platform/scope/statement` |
| `plat_pm_sd_pbs` | Product Breakdown Structure | `/platform/scope/pbs` |
| `plat_pm_planning_wbs` | Work Breakdown Structure | `/platform/scope/wbs` |
| `plat_pm_sd_deliverable_register` | Deliverable Register | `/platform/deliverable-register` |

Sim: `sim_pm_scope_deliverables` + practice-project routes.

## SQL files

- `SQL/v1024_scope_deliverables_menu_group.sql`
- `SQL/v1025_control_accounts_and_deliverable_register.sql`
- `SQL/v1026_sim_scope_deliverables_parity.sql`
- Admin: `E:\project-nidus-admin\SQL\v220_scope_deliverables_id_generation_rules_seed.sql`

## Review

Implemented Scope & Deliverables as a DB-driven PM taxonomy group (no hardcoded menu tree).
Moved Scope Statement + WBS from Planning; added PBS + Deliverable Register leaves with role
grants. New tables: `control_accounts`, `deliverable_register` (+ sim). PBS upgraded to full
CRUD; WBS hub tabs include Dictionary (reuse), lean Control Accounts, Work Packages link-out.
Deliverable Register has status filter tabs and routed CRUD. Simulator menu/tables/PBS route
wired. Unit tests for both new services passed (5/5).

**Apply on Platform Supabase (in order):** v1024 → v1025 → v1026, then Admin v220, then hard-refresh.
