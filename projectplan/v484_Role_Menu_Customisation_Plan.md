# v484 – Role Sidebar Menu Customisation (Admin & PMO)

## Overview
Allow **System Admin** and **PMO Admin** roles to customise which sidebar menu items each role can see (`can_view`) and use (`can_use`) — directly from the UI, without SQL. Changes write to the existing `role_menu_items` table and are immediately reflected in affected users' sidebars after their cache expires (5 minutes) or on re-login.

---

## Current State

| Item | Status |
|------|--------|
| `menu_items` table | ✓ Exists — all menu entries |
| `role_menu_items` table | ✓ Exists — `can_view`, `can_use`, `is_active` per role/menu pair |
| `roles` table | ✓ Exists — role hierarchy, `role_level`, `is_system_role` |
| `useMenu` hook | ✓ Reads `role_menu_items` — changes reflect within 5 min |
| Menu management UI | ✓ `RoleMenuCustomiser` + PMO/Admin pages |
| RLS on `role_menu_items` | ✓ `v484_role_menu_items_rls.sql` — authenticated INSERT/UPDATE with policies |
| PMO sidebar entry | ✓ `v485_role_menu_customisation_menu_items.sql` |

---

## Goals
1. **PMO Admin** accesses via their sidebar: *Administration → Role Menu Access*
2. **System Admin** accesses via admin area: *Admin → Role Menu Access*
3. UI shows all roles — select a role to see its full menu tree
4. Each menu item shows `can_view` (visible) and `can_use` (clickable) toggles
5. Unsaved changes are tracked visually; a **Save** button commits them as a batch
6. System-protected menus (e.g. own role's menus, system_admin menus) are locked/read-only
7. Changes reflected in users' sidebars within 5 minutes (cache TTL)

---

## Todo List

### Phase 1 – SQL
- [x] 1.1 `SQL/v484_role_menu_items_rls.sql` — GRANT SELECT/INSERT/UPDATE to `authenticated`; RLS SELECT (all authenticated); RLS INSERT/UPDATE (pmo_admin + System Admin only)
- [x] 1.2 `SQL/v485_role_menu_customisation_menu_items.sql` — Insert sidebar entries for PMO Admin (under PMO Administration section) and System Admin (under Admin section)

### Phase 2 – Service
- [x] 2.1 `src/services/menuManagementService.js`
  - `fetchAllRoles()` — all active, non-deleted roles ordered by `role_level`
  - `fetchFullMenuTree()` — **ALL** rows from `menu_items` where `is_active=true` AND `is_deleted=false` AND `is_visible=true`, filtered to platform routes (`/platform`, `/pmo`, `/pm`, or empty `route_path` for parent sections). This is the exact same source the sidebar reads from — not filtered by any role or existing grants.
  - `fetchRoleMenuAccess(roleId)` — all `role_menu_items` rows for the role (keyed by `menu_item_id`). Used as an **overlay** on top of the full tree. Menu items with no entry default to `{ can_view: false, can_use: false }`.
  - `saveRoleMenuAccess(roleId, changes[])` — batch upsert: INSERT for new entries, UPDATE for existing ones. Never deletes rows.

### Phase 3 – Shared UI Component
- [x] 3.1 `src/components/admin/RoleMenuCustomiser.jsx`
  - **Role selector** — dropdown/pill list of all roles (excluding system_admin from edit by PMO)
  - **Menu tree — sourced from `menu_items` table (full list):**
    - Loads all platform menu items via `fetchFullMenuTree()` — same items the sidebar renders
    - Overlays current grants from `fetchRoleMenuAccess(roleId)`
    - Items with no existing `role_menu_items` entry show as OFF (no access granted yet)
    - Grouped by parent section; children indented
    - Each item shows: icon, label, route path (small/muted)
  - **Two toggles per item** — `can_view` 👁 (item appears in sidebar) and `can_use` 🖱 (item is clickable vs greyed out)
  - **Rule: if `can_use` is turned on, `can_view` is automatically also turned on**
  - **Rule: if `can_view` is turned off, `can_use` is automatically also turned off**
  - **Pending change indicator** — rows with unsaved changes highlighted amber; badge shows count
  - **Save / Discard buttons** — batch commit or rollback all pending changes
  - **Lock indicator 🔒** — `is_system_menu=true` items are read-only for all; `System Admin` role rows are read-only for PMO editors
  - **Search/filter bar** — filters menu item list by label in real time
  - Dark/light theme aware

### Phase 4 – Pages
- [x] 4.1 `src/pages/pmo/PMORoleMenuManagement.jsx` — PMO-facing page wrapper (restricts editable roles to non-system roles)
- [x] 4.2 `src/pages/admin/AdminRoleMenuManagement.jsx` — Admin-facing page wrapper (full access to all roles)

### Phase 5 – Routing
- [x] 5.1 `src/App.jsx` — add lazy imports + routes:
  - `platform/pmo/role-menu-access` → `PMORoleMenuManagement`
  - `platform/admin/role-menu-access` → `AdminRoleMenuManagement`

### Phase 6 – Unit Tests
- [x] 6.1 `src/services/__tests__/menuManagementService.test.js`

---

## UX Design

```
┌─────────────────────────────────────────────────────────────────┐
│  Role Menu Access Control                           [Save] [Discard] │
│                                                                   │
│  Role:  [Project Manager ▼]    Filter: [🔍 Search menu items…]   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  📁 Dashboard                            👁 Visible  🖱 Use  │ │
│  │     ── Platform Dashboard                  ✅          ✅    │ │
│  │  📁 Projects                               ✅          ✅    │ │
│  │     ── Project List                        ✅          ✅    │ │
│  │     ── Create Project                      ✅          ✅    │ │
│  │  📁 Change Management          [amber – unsaved change]      │ │
│  │     ── Change Requests                     ✅          🔄    │ │  ← pending
│  │     ── Change Request Log                  ✅          ✅    │ │
│  │  📁 Admin (🔒 locked – system protected)                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Rules (enforced in both SQL RLS and UI)

| Rule | Detail |
|------|--------|
| PMO Admin cannot edit `System Admin` role | Locked in UI + RLS blocks write |
| PMO Admin cannot edit roles with higher `role_level` than their own | UI lock + service validation |
| System Admin can edit all roles | No restriction |
| Neither can delete `is_system_menu = TRUE` items | Locked read-only |
| Changes only affect `can_view` and `can_use` — never delete `menu_items` rows | Service layer enforces this |

---

## File Inventory

| File | Action |
|------|--------|
| `SQL/v484_role_menu_items_rls.sql` | **Create** |
| `SQL/v485_role_menu_customisation_menu_items.sql` | **Create** |
| `src/services/menuManagementService.js` | **Create** |
| `src/components/admin/RoleMenuCustomiser.jsx` | **Create** |
| `src/pages/pmo/PMORoleMenuManagement.jsx` | **Create** |
| `src/pages/admin/AdminRoleMenuManagement.jsx` | **Create** |
| `src/App.jsx` | **Update** (2 routes) |
| `src/services/__tests__/menuManagementService.test.js` | **Create** |

---

## Key Design Decisions

1. **Full menu_items table as source of truth** — `fetchFullMenuTree()` reads directly from `menu_items` (same source as the sidebar's `useMenu` hook) using identical filters: `is_active=true`, `is_deleted=false`, `is_visible=true`, platform routes only. This guarantees the customiser always shows the same complete menu the sidebar would render — no divergence.
2. **role_menu_items as an overlay** — `fetchRoleMenuAccess(roleId)` loads what a role currently has. Menu items not yet in this table are treated as `can_view=false, can_use=false` (no access). Saving an "off" item that had no prior row creates a new row; saving an "on" item that had no prior row also creates a new row.
3. **Single shared component** (`RoleMenuCustomiser`) used by both PMO and Admin pages — the page wrapper controls which roles are editable (PMO sees non-system roles only; Admin sees all)
4. **Batch save** not auto-save — prevents accidental half-saves; user sees all pending changes before committing
5. **Upsert not delete** — saving always upserts `role_menu_items`; never deletes rows
6. **Cache bust on save** — after successful save, clear `sessionStorage` menu cache keys so the editor's own sidebar refreshes immediately; affected users see the change within 5 minutes (cache TTL)
7. **PMO sidebar entry** is added under the PMO Administration section in the PMO menu

---

## Out of Scope
- Per-project menu overrides (this is per-role, not per-project/role combination)
- Creating or deleting `menu_items` rows (that remains SQL-only)
- Simulator sidebar (simulator uses static config; separate task if needed)

---

## Review Section

**Implemented (2026-04-19):** Apply `SQL/v484_role_menu_items_rls.sql` and `SQL/v485_role_menu_customisation_menu_items.sql` in Supabase. Routes: `/platform/pmo/role-menu-access` (PMO Admin + System Admin), `/platform/admin/role-menu-access` (System Admin only). Sidebar menu cache clears on successful save for the current user; other users follow the existing `useMenu` 5-minute TTL.

**Notes:** RLS uses `can_manage_role_menu_target(role_id)` so PMO editors cannot write rows for the System Admin role or for roles above the PMO Admin role level; `is_system_menu` menu rows are blocked server-side. The UI mirrors the same rules for early validation and read-only states.
