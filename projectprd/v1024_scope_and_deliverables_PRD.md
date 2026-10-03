# v1024 — Scope & Deliverables (Project Manager) PRD

## a) Problem statement

Taxonomy §3 defines a **Scope & Deliverables** group for Core PM. Live menus scatter
Scope Statement and WBS under Planning; PBS UI is read-only; Control Accounts and a
first-class Deliverable Register do not exist. Nested taxonomy bullets must not become
extra sidebar links.

## b) Solution

DB-driven **Scope & Deliverables** group with **four** leaves (no hardcoded menu tree):

1. **Scope Statement** — one page; In/Out/Boundaries/Constraints as sections  
2. **Product Breakdown Structure** — upgrade `plan_pbs_nodes` to full CRUD; surface Product Descriptions / AC via tabs/links  
3. **Work Breakdown Structure** — hub tabs: Hierarchy (existing WBS), Dictionary (`wbs_dictionary_entries`), lean Control Accounts, link-out to Work Packages  
4. **Deliverable Register** — new table/UI with status tabs Planned / Submitted / Accepted / Rework; PSA left separate  

Move Scope Statement + WBS out of Planning. Leave Work Packages / Product Descriptions menus; surface from hubs. Platform + Simulator parity.

## c) User stories

1. As a PM, I see Scope & Deliverables with exactly four children from the DB.  
2. As a PM, I edit Scope Statement sections including Boundaries (exclusions field).  
3. As a PM, I create/edit/delete PBS nodes.  
4. As a PM, I use WBS hub tabs for hierarchy, dictionary, and lean control accounts.  
5. As a PM, I CRUD deliverables and filter by Planned/Submitted/Accepted/Rework.  
6. As a Simulator user, I get the same four capabilities under practice projects.  
7. Menus/labels never come from hardcoded React nav trees.

## d) Implementation decisions (interview)

1. Four sidebar leaves only (nested bullets = sections/tabs).  
2. Control Accounts included now (lean).  
3. New Deliverable Register (not PSA reuse).  
4. Platform + Simulator.  
5. Move Scope Statement / WBS from Planning.  
6. Leave WP / Product Descriptions; surface in hubs.  
7. Upgrade `plan_pbs_nodes` (no new PBS table).  
8. Reuse `wbs_dictionary_entries`.  
9. Independent deliverable rows; optional PBS/PD links.  
10. Lean CA: name/code, WBS/WP links, owner, budget, status, notes.  
11. **No menu hardcoding** — `menu_items` / `role_menu_items` only.

## e) Testing

- Unit: services for control accounts + deliverable register; PBS create/update.  
- Manual: run SQL → hard refresh → four leaves → CRUD smoke.

## f) Out of scope

- Full EVM (PV/EV/AC, SPI/CPI).  
- Replacing Product Status Accounts.  
- Moving WP / Product Description sidebar leaves.  
- Hardcoded sidebar labels/trees.

## g) Further notes

Menu codes: `plat_pm_scope_deliverables` + moved `plat_pm_planning_scope_statement` /
`plat_pm_planning_wbs` + new `plat_pm_sd_pbs` / `plat_pm_sd_deliverable_register`.
Sim mirror under `sim_pm_scope_deliverables`.
