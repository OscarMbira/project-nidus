# v667 — PMO Sidebar Admin Restore (Review)

**Date:** 2026-05-28  
**Trigger:** PMO Administration section showing only 3 items (Project Types, Local Data Extensions, Role Menu Access) after v664 DB-only migration.

---

## Root cause

| Layer | Issue |
|-------|--------|
| **DB** | Platform PMO admin leaves (Form Templates, Org Settings, Users, Funding, Subscription, Branding) were never seeded in `menu_items` — only `sim_pmo_admin_*` rows exist in v659. Items lived in legacy `sidebar_config` or static `pmoMenuConfig.js`. |
| **v664** | Removed JS virtual injection from `useMenu.js` — correct for DB-only, but exposed missing DB rows. |
| **useMenu.js** | `isAllowedAdminItem` / `isAllowedInitiationItem` / `isAllowedGovernanceItem` whitelists dropped legitimate DB rows whose `menu_code` did not match (e.g. `local_data_extensions`, `pmo_role_menu_access`). |
| **v660** | Incorrectly deactivated `pmo_admin_project_types` (only platform copy, not a duplicate). |

---

## Changes made

### 1. `src/hooks/useMenu.js` (cache `v34`)

- Removed runtime **whitelists** for admin, initiation, and governance buckets.
- Added **admin pollution denylist** only (v660 deactivated codes, system-admin leaves, legacy section headers).
- Expanded `matchCategory()` for LDE, form templates, role menu access, funding/budget, project statuses.
- Fixed **Project Statuses** misrouting to Project Oversight (label substring `project status`).

### 2. `SQL/v667_pmo_sidebar_admin_restore.sql`

- Upserts all 13 PMO Administration leaves under `pmo_admin_section`.
- Reparents `local_data_extensions` + LDE children under PMO Admin.
- Reactivates `pmo_admin_project_types`.
- Reparents integrations + PMIS gap admin items.
- Hides legacy `organisation_settings` top-level section (replaced by `pmo_admin_*` rows).
- Comprehensive `role_menu_items` grants for `pmo_admin` / `system_admin` / `super_admin` across admin, initiation, governance, process templates, knowledge, system admin, workflows, reporting, email, teams, stakeholders, oversight.

---

## Deployment checklist

1. Run SQL on Supabase **in order**: `v663` → `v664` → `v665` → `v666` → **`v667`**
2. Hard refresh browser (menu cache key is now `nidus_menu_v34_`)
3. Verify PMO Administration shows ~13 items per v660 plan
4. Spot-check Process Templates, Governance, Email & Notifications sections

---

## Expected PMO Administration (after v667)

1. Local Data Extensions  
2. Form Templates  
3. Organisation Settings  
4. User Management  
5. Role Menu Access  
6. Project Types  
7. Project Statuses  
8. Funding Sources  
9. Budget Categories  
10. Subscription  
11. Branding (+ Identity / History leaves)  
12. Integrations Hub  

---

## Review

- **Status:** Code + SQL ready; requires Supabase migration run by user.
- **v668 follow-up:** `matchCategory` in `useMenu.js` (cache v35) misrouted `/platform/templates*` and `pmo_pt_*` to Projects — fixed with early PT classification + relocate safety net. Run `v668_process_templates_matchcategory_fix_grants.sql` if v666 not applied.
- **Platform–Simulator parity:** Simulator admin items remain in `sim_pmo_admin_*` (v659); Platform now has equivalent `pmo_admin_*` rows.
- **Tests:** Run `npm run validate:menus` after deploy.
