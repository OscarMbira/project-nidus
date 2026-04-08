# v346 — Enterprise Environment Factors (EEF) & Organisational Process Assets (OPA)
## Implementation Plan

**Date:** 2026-04-07  
**Author:** Project Nidus Team  
**Scope:** Platform (public schema) + Simulator (sim schema)  
**SQL Versions:** `v400_eef_opa_tables.sql`, `v401_eef_opa_menu_seed.sql` *(sequenced after existing migrations; original plan referenced v100/v101 — use v400/v401 in repo.)*

---

## Overview

Implement two new knowledge-capture modules accessible to **all roles**:

1. **Enterprise Environment Factors (EEFs)** — Conditions/forces that influence but are not controlled by the project team (e.g., organisational culture, regulatory environment, market conditions, infrastructure).
2. **Organisational Process Assets (OPAs)** — Plans, processes, policies, procedures, templates, and knowledge bases specific to the performing organisation.

Both modules apply equally to **Platform** (real projects) and **Simulator** (simulation scenarios).

---

## Roles & Access

| Role | EEF | OPA |
|------|-----|-----|
| system_admin | Full CRUD + manage categories | Full CRUD + manage categories |
| pmo_admin | Full CRUD + manage categories | Full CRUD + manage categories |
| project_manager | Full CRUD | Full CRUD |
| team_lead | Full CRUD | Full CRUD |
| team_member | Create + Read + Edit own | Create + Read + Edit own |
| stakeholder | Create + Read | Create + Read |
| viewer | Read only | Read only |

---

## Database Schema

### Platform (public schema) — SQL file: `SQL/v400_eef_opa_tables.sql`

**Tables:**
1. `eef_categories` — lookup for EEF categories (Internal/External types)
2. `enterprise_environment_factors` — main EEF records
3. `opa_categories` — lookup for OPA categories
4. `organisational_process_assets` — main OPA records

**Simulator (sim schema)** — included in `v400_eef_opa_tables.sql`  
Mirror tables; `related_simulation_run_id` → `sim.simulation_runs` (platform uses `related_project_id` → `projects`).

### Permissions — in `v400_eef_opa_tables.sql`

**Permission codes:** `eef.create`, `eef.read`, `eef.update`, `eef.delete`, `eef.export`, `opa.create`, `opa.read`, `opa.update`, `opa.delete`, `opa.export`

---

## Menu Structure — SQL file: `SQL/v401_eef_opa_menu_seed.sql`

New top-level menu: **"Org Knowledge"** (icon: `book-open`, colour: `#0EA5E9`)

**Application routes:** `/platform/org-knowledge`, `/platform/eef`, `/platform/opa`, etc. (see `App.jsx`).

Sub-items include bulk upload and drafts; **viewer** receives hub + list routes only.

---

## Frontend — Platform

### Services
- `src/services/eefService.js` — CRUD, on-hold, bulk import, export-oriented list helpers
- `src/services/opaService.js` — CRUD, on-hold, bulk import
- `src/utils/accountResolution.js` — `getCurrentUserAccountId()`

### Pages — `src/pages/eef/`, `src/pages/opa/`, `src/pages/org-knowledge/OrgKnowledgeHub.jsx`

### Routes — nested under `platform/*` in `src/App.jsx`

---

## Frontend — Simulator

### Services
- `src/services/sim/simEEFService.js`
- `src/services/sim/simOPAService.js`

### Pages — `src/pages/simulator/eef/`, `src/pages/simulator/opa/`

### Simulator menu — `src/config/simulatorMenuConfig.js` + `book-open` icon in `SimulatorLayout.jsx`

---

## Unit Tests

Located next to services (Vitest):

- `src/services/eefService.test.js`
- `src/services/opaService.test.js`
- `src/services/sim/simEEFService.test.js`
- `src/services/sim/simOPAService.test.js`

---

## Documentation

- `Documentation/EEF_OPA_User_Guide.md`
- `Documentation/EEF_OPA_Blog_Post.md`

---

## TODO Checklist

### Phase 1 — Database (SQL)
- [x] Create `SQL/v400_eef_opa_tables.sql`
  - [x] `eef_categories` table (Platform + Sim)
  - [x] `enterprise_environment_factors` table (Platform + Sim)
  - [x] `opa_categories` table (Platform + Sim)
  - [x] `organisational_process_assets` table (Platform + Sim)
  - [x] RLS policies for all 4 tables (Platform)
  - [x] RLS policies for all 4 tables (Simulator)
  - [x] Seed default EEF categories
  - [x] Seed default OPA categories
  - [x] Insert EEF + OPA permissions
  - [x] Assign permissions to roles
  - [x] Register all new tables in `database_tables`
- [x] Create `SQL/v401_eef_opa_menu_seed.sql`
  - [x] Insert "Org Knowledge" parent menu item
  - [x] Insert EEF sub-menu items (list, new, drafts, bulk-upload)
  - [x] Insert OPA sub-menu items (list, new, drafts, bulk-upload)
  - [x] Assign menus to all 7 roles (viewer: read-only subset)

### Phase 2 — Platform Services
- [x] Create `src/services/eefService.js`
- [x] Create `src/services/opaService.js`

### Phase 3 — Platform Pages (EEF)
- [x] `src/pages/eef/EEFList.jsx`
- [x] `src/pages/eef/EEFCreate.jsx`
- [x] `src/pages/eef/EEFDetail.jsx`
- [x] `src/pages/eef/EEFEdit.jsx`
- [x] `src/pages/eef/EEFOnHold.jsx`
- [x] `src/pages/eef/EEFBulkUpload.jsx`

### Phase 4 — Platform Pages (OPA)
- [x] `src/pages/opa/OPAList.jsx`
- [x] `src/pages/opa/OPACreate.jsx`
- [x] `src/pages/opa/OPADetail.jsx`
- [x] `src/pages/opa/OPAEdit.jsx`
- [x] `src/pages/opa/OPAOnHold.jsx`
- [x] `src/pages/opa/OPABulkUpload.jsx`

### Phase 5 — Simulator Services
- [x] Create `src/services/sim/simEEFService.js`
- [x] Create `src/services/sim/simOPAService.js`

### Phase 6 — Simulator Pages (EEF)
- [x] `src/pages/simulator/eef/SimEEFList.jsx`
- [x] `src/pages/simulator/eef/SimEEFCreate.jsx`
- [x] `src/pages/simulator/eef/SimEEFDetail.jsx`
- [x] `src/pages/simulator/eef/SimEEFEdit.jsx`
- [x] `src/pages/simulator/eef/SimEEFOnHold.jsx`
- [x] `src/pages/simulator/eef/SimEEFBulkUpload.jsx`

### Phase 7 — Simulator Pages (OPA)
- [x] `src/pages/simulator/opa/SimOPAList.jsx`
- [x] `src/pages/simulator/opa/SimOPACreate.jsx`
- [x] `src/pages/simulator/opa/SimOPADetail.jsx`
- [x] `src/pages/simulator/opa/SimOPAEdit.jsx`
- [x] `src/pages/simulator/opa/SimOPAOnHold.jsx`
- [x] `src/pages/simulator/opa/SimOPABulkUpload.jsx`

### Phase 8 — Routing
- [x] Add Platform EEF + OPA lazy imports to `src/App.jsx`
- [x] Add Platform EEF + OPA routes to `src/App.jsx` (`platform/*`)
- [x] Add Simulator EEF + OPA lazy imports to `src/App.jsx`
- [x] Add Simulator EEF + OPA routes to `src/App.jsx`

### Phase 9 — Tests & Docs
- [x] `src/services/eefService.test.js`
- [x] `src/services/opaService.test.js`
- [x] `src/services/sim/simEEFService.test.js`
- [x] `src/services/sim/simOPAService.test.js`
- [x] `Documentation/EEF_OPA_User_Guide.md`
- [x] `Documentation/EEF_OPA_Blog_Post.md`

---

## Review

**Completed:** 2026-04-07

### Summary

| Area | What was delivered |
|------|---------------------|
| **SQL** | `v400_eef_opa_tables.sql`: tables + helpers `user_has_access_to_account`, `user_has_permission_for_account`, `user_has_eef_opa_full_edit_role`; RLS for Platform and Sim; permissions; role-permission grants; global category seeds; `database_tables` registration. `v401_eef_opa_menu_seed.sql`: Org Knowledge menu tree + `role_menu_items` (viewer limited to hub + lists). |
| **Platform UI** | Hub, EEF/OPA CRUD, on-hold queues, bulk CSV, list/table toggle, sortable columns, `ExportListMenu` / `ExportRecordMenu`, success confirmations with record id, routes under `/platform/...`. |
| **Simulator UI** | Parity routes under `/simulator/eef` and `/simulator/opa`; `simulatorMenuConfig` + `book-open` icon; sim services use `simDb` and `related_simulation_run_id` where applicable. |
| **Tests** | Vitest unit tests for EEF/OPA sim + platform services (organisation guard + basic mocked CRUD). |
| **Docs** | User guide + blog draft in `Documentation/`. |

### Notes for deployment

1. Apply **`v400`** then **`v401`** on Supabase (PostgreSQL 15).  
2. Confirm `is_pmo_admin_user()` exists (from earlier RFP migrations) — category admin policies depend on it.  
3. Menu routes use **`/platform/...`** (canonical URLs); update any bookmarks if you had drafted `/eef` without prefix.  

### Optional follow-ups

- Harden `ExportRecordMenu` sections with richer field labels for OPA tags array in exports.  
- Add integration tests against a test Supabase project.  
