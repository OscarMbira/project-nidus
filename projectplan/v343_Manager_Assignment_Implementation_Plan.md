# v343 – Manager Assignment Implementation Plan
**Feature:** PMO Manager Assignment (Project Manager, Programme Manager, Portfolio Manager)
**Date:** 2026-04-05
**Branch:** feature/platform-terminology (current)

---

## Overview

Allow PMO users to:
1. **Assign a Project Manager** to any project (PM role)
2. **Assign a Programme Manager** to any programme
3. **Assign a Portfolio Manager** to any portfolio
4. **Set a system-wide limit** on the maximum number of concurrent assignments per manager (default = 5, configurable by PMO)

All three assignment types will be surfaced under a single **"Manager Assignments"** section in the PMO Admin sidebar.

---

## Current State

| Entity | Manager Field | Status |
|--------|--------------|--------|
| Projects | `project_manager_user_id` | Exists on table; no dedicated assignment UI |
| Programmes | `programme_manager_user_id` | Exists on table; only editable via main edit form |
| Portfolios | `portfolio_manager_user_id` | Exists on table; only editable via main edit form |
| Assignment Limit | — | No setting exists yet |

The `system_settings` table already exists and supports `setting_key / setting_value` with typed values — perfect for the limit setting.

---

## Architecture Decisions

1. **Single combined page** with three tabs: Portfolio, Programme, Project — avoids sidebar clutter and keeps the workflow unified.
2. **Direct field update** for portfolios (`portfolio_manager_user_id`) and programmes (`programme_manager_user_id`) — these columns already exist.
3. **Dual write for projects** — update `project_manager_user_id` on `projects` table AND upsert a `project_memberships` record with the `project_manager` role, keeping both systems consistent.
4. **System setting key** `pm_max_concurrent_assignments` stored in `system_settings` (default = 5). One setting governs all three types.
5. **Active-only assignment counting** — The limit only counts assignments where the entity is **active** (i.e. status is NOT `completed`, `cancelled`, or `archived`). Completed/cancelled portfolios, programmes, and projects do NOT count toward the limit. This applies both to limit enforcement and to the workload badge shown on each user in the assignment modal.
6. **Active-only entity listing** — The assignment page only lists entities that are currently **active** (status = `active` or `planning` or `on-hold`) — completed and cancelled entities are excluded from the assignment view since there is nothing to manage.
7. **Simulator parity** — The Simulator has sim.practice_projects, sim.programmes, sim.portfolios (or similar). A parallel simulator manager assignment page will be scoped out in a Phase 2 note since the Simulator uses separate sim-schema tables; this plan covers the Platform only.

---

## Todo List

### Phase 1 – SQL / Database
- [x] **1.1** Create `SQL/v384_manager_assignment_system_setting.sql`
  - Insert `pm_max_concurrent_assignments` (default 5, type number) into `system_settings`
- [x] **1.2** Create `SQL/v385_manager_assignment_sidebar_menu.sql`
  - Insert menu items for "Manager Assignments" under the PMO Admin section

### Phase 2 – Service Layer
- [x] **2.1** Create `src/services/managerAssignmentService.js`
  - `getSystemAssignmentLimit()` — read `pm_max_concurrent_assignments` from `system_settings`
  - `updateSystemAssignmentLimit(value)` — update the setting (PMO only)
  - `getUserActiveAssignmentCount(userId)` — count active assignments across projects + programmes + portfolios
  - `checkAssignmentLimit(userId)` — returns `{ allowed, current, limit }`
  - `assignProjectManager(projectId, userId)` — updates `projects.project_manager_user_id` + upserts `project_memberships`
  - `removeProjectManager(projectId)` — clears PM assignment
  - `assignProgrammeManager(programmeId, userId)` — updates `programmes.programme_manager_user_id`
  - `removeProgrammeManager(programmeId)` — clears programme manager
  - `assignPortfolioManager(portfolioId, userId)` — updates `portfolios.portfolio_manager_user_id`
  - `removePortfolioManager(portfolioId)` — clears portfolio manager
  - `getEligibleManagers()` — returns users who have PM/Programme Manager/Portfolio Manager system roles
  - `getAllAssignmentsSummary()` — returns all entities with their current manager + workload per manager

### Phase 3 – Frontend Pages
- [x] **3.1** Create `src/pages/pmo/ManagerAssignments.jsx`
  - Three tabs: **Portfolios | Programmes | Projects**
  - Each tab: table/card list of entities with current manager shown, assign/change/remove action
  - Assignment modal: searchable user dropdown (only eligible managers), shows current workload
  - Workload badge on each user option (e.g. "3 / 5 assignments")
  - Warning if selected user is at limit
  - Success/error toast on assignment
  - Sortable columns, search bar, card/list view toggle (per CLAUDE.md rules 40 & 41)
  - Export functionality (per CLAUDE.md rule 38)

- [x] **3.2** Create `src/components/pmo/AssignManagerModal.jsx`
  - Reusable modal for all three entity types
  - Props: `entityType` ('project' | 'programme' | 'portfolio'), `entityId`, `entityName`, `currentManagerId`
  - Searchable dropdown of eligible users
  - Workload counter per user
  - Confirm/Cancel buttons

- [x] **3.3** Create `src/pages/pmo/ManagerAssignmentSettings.jsx`
  - Simple settings card: "Maximum concurrent assignments per manager" with numeric input
  - Save button with confirmation dialog
  - Current value displayed prominently
  - Accessible from the same sidebar section as a child item

### Phase 4 – Sidebar Menu Registration
- [x] **4.1** Add route entries in `src/App.jsx`
  - `/platform/pmo-admin/manager-assignments` → `ManagerAssignments`
  - `/platform/pmo-admin/manager-assignment-settings` → `ManagerAssignmentSettings`

- [x] **4.2** Add menu entries in `src/config/pmMenuConfig.js`
  - Under PMO Admin section:
    - "Manager Assignments" (parent) with icon `UserCheck`
      - "Assign Managers" → `/platform/pmo-admin/manager-assignments`
      - "Assignment Settings" → `/platform/pmo-admin/manager-assignment-settings`

### Phase 5 – Theme & PWA
- [x] **5.1** All new components must respect dark/light theme via Tailwind dark: classes
- [x] **5.2** Ensure mobile-responsive layout for PWA usage

---

## SQL File Details

### v384_manager_assignment_system_setting.sql
```sql
-- Insert the system-wide PM assignment limit setting
INSERT INTO system_settings (setting_key, setting_name, setting_description,
  setting_value, setting_value_type, default_value, setting_category,
  is_public, is_editable, is_active)
VALUES (
  'pm_max_concurrent_assignments',
  'Maximum Concurrent Manager Assignments',
  'Maximum number of active projects, programmes, or portfolios a manager can be assigned to at any one time.',
  '5',
  'number',
  '5',
  'governance',
  false,
  true,
  true
)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  default_value = EXCLUDED.default_value,
  updated_at = NOW();
```

### v385_manager_assignment_sidebar_menu.sql
- Inserts `pmo_manager_assignments` (parent) and two children:
  - `pmo_assign_managers` → `/platform/pmo-admin/manager-assignments`
  - `pmo_assignment_settings` → `/platform/pmo-admin/manager-assignment-settings`
- Grants `can_view = true`, `can_use = true` to `pmo_admin` role

---

## Service Function Details

### `getUserActiveAssignmentCount(userId)`
Runs three counts in parallel — **active entities only** (excludes completed, cancelled, archived):
```sql
-- Projects: active statuses only
SELECT COUNT(*) FROM projects
WHERE project_manager_user_id = $userId
  AND is_deleted = false
  AND status NOT IN ('completed', 'cancelled', 'archived')

-- Programmes: active statuses only
SELECT COUNT(*) FROM programmes
WHERE programme_manager_user_id = $userId
  AND is_deleted = false
  AND programme_status NOT IN ('completed', 'cancelled', 'archived')

-- Portfolios: active statuses only
SELECT COUNT(*) FROM portfolios
WHERE portfolio_manager_user_id = $userId
  AND is_deleted = false
  AND portfolio_status NOT IN ('completed', 'cancelled', 'archived')
```
Returns total sum across all three.

> **Rule:** A manager who is assigned to 3 completed projects and 2 active projects has an active count of **2**, not 5.

### `assignProjectManager(projectId, userId)`
1. Call `checkAssignmentLimit(userId)` — throw error if at limit
2. `UPDATE projects SET project_manager_user_id = $userId WHERE id = $projectId`
3. Lookup `project_manager` role from `project_roles` template
4. Upsert into `project_memberships` with `invitation_status = 'accepted'`

---

## Page UI Sketch

```
┌─────────────────────────────────────────────────────────────┐
│  Manager Assignments                          [Settings ⚙]  │
│  ─────────────────────────────────────────────────────────  │
│  [ Portfolios ]  [ Programmes ]  [ Projects ]               │
│                                                             │
│  Search: [___________]  View: [⊞ Cards] [≡ Table]          │
│                                                             │
│  ┌──────────────────┬──────────────┬───────────┬────────┐  │
│  │ Project Name     │ Manager      │ Workload  │ Action │  │
│  ├──────────────────┼──────────────┼───────────┼────────┤  │
│  │ Alpha Project    │ Jane Smith   │ 3/5 ●●●○○ │ Change │  │
│  │ Beta Project     │ (unassigned) │ —         │ Assign │  │
│  │ Gamma Project    │ John Doe     │ 5/5 ●●●●● │ Change │  │
│  └──────────────────┴──────────────┴───────────┴────────┘  │
└─────────────────────────────────────────────────────────────┘

Assignment Modal:
┌───────────────────────────────┐
│  Assign Project Manager       │
│  Project: Alpha Project       │
│                               │
│  Select Manager:              │
│  [Search users...         ▼]  │
│   ● Jane Smith   (3/5)        │
│   ● John Doe     (5/5) ⚠ Full │
│   ● Mary Johnson (1/5)        │
│                               │
│  [ Cancel ]   [ Assign ]      │
└───────────────────────────────┘
```

---

## Files to Create / Modify

| Action | File |
|--------|------|
| CREATE | `SQL/v384_manager_assignment_system_setting.sql` |
| CREATE | `SQL/v385_manager_assignment_sidebar_menu.sql` |
| CREATE | `src/services/managerAssignmentService.js` |
| CREATE | `src/pages/pmo/ManagerAssignments.jsx` |
| CREATE | `src/pages/pmo/ManagerAssignmentSettings.jsx` |
| CREATE | `src/components/pmo/AssignManagerModal.jsx` |
| MODIFY | `src/App.jsx` — add two new routes |
| MODIFY | `src/config/pmMenuConfig.js` — add sidebar entries |

---

## Out of Scope (Phase 2)
- Simulator parity (sim schema) — tracked separately; `sim.` tables for projects/programmes/portfolios will need equivalent assignment fields verified first
- Email notifications to newly assigned managers — can be added as enhancement
- Assignment history/audit log page — current audit trail via `updated_by`/`updated_at` is sufficient for now
- Separate limits per entity type (e.g. max 3 projects + max 2 programmes separately) — single combined limit is sufficient for initial release

---

## Review Section
**Implemented 2026-04-05**

- **SQL:** `v384_manager_assignment_system_setting.sql` seeds `pm_max_concurrent_assignments`; `v385_manager_assignment_sidebar_menu.sql` adds PMO Admin parent `pmo_manager_assignments` with children and `pmo_admin` `role_menu_items` grants. Run both on Supabase in order after existing migrations.
- **Service:** `managerAssignmentService.js` implements limit read/update, active counts (projects use non-final `project_statuses`; programmes/portfolios use `planning` / `active` / `on-hold` plus `on_hold` alias), CRUD for three manager fields, project dual-write to `project_memberships` with `project_roles` template `project_manager`, and eligible users via `user_roles` + `roles` (`pmo_admin`, `project_manager`).
- **UI:** `ManagerAssignments.jsx` (tabs, search, sort, card/table + `localStorage`, export via `ExportListMenu`), `AssignManagerModal.jsx`, `ManagerAssignmentSettings.jsx`; routes `/platform/pmo-admin/manager-assignments` and `.../manager-assignment-settings`; `pmMenuConfig` nested “Manager Assignments”; Sidebar `user-check` icon for DB menus.
- **Tests:** `src/services/__tests__/managerAssignmentService.test.js` (Vitest) covers limit parsing/update validation.
- **Routes note:** Plan originally referenced `/app/pmo/...`; implementation follows existing platform convention `/platform/pmo-admin/...`.

---
