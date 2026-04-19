# v481 – System-Wide Change Log (All Roles Access)

## Overview
Implement a unified, system-wide **Change Log** page accessible by **all roles** on the Platform. The change log aggregates meaningful activity across the platform: change requests, project updates, task changes, risk/issue updates, and other key events — filtered by role and project access. It replaces the current narrow `ChangeLog.jsx` (which only shows change management workflow events) with a comprehensive, role-aware audit trail.

---

## Current State
| Item | Status |
|------|--------|
| `src/components/change/ChangeLog.jsx` | Exists — only shows `change_log` table (change management events only) |
| `src/pages/change/ChangeLogPage.jsx` | Exists — thin wrapper with no project selector |
| `src/services/auditService.js` | Exists — writes/reads `audit_events` table |
| Route in App.jsx | **Missing** — no `/app/change-log` route |
| Sidebar menu entry | **Missing** — not in `menu_items` / `role_menu_items` |
| Export functionality | **Missing** from current ChangeLog component |
| Card/Table view toggle | **Missing** |
| Sortable column headers | **Missing** |
| Role-based data filtering | **Missing** |

---

## Goals
1. Create a **System-Wide Change Log** page that reads from `audit_events` (already populated) and `change_log` (change management), merged and unified in the UI
2. Apply **role-based filtering**: admins see all; PMs see their projects; team members see only projects they belong to
3. Add **export** (Excel, CSV, JSON, Print) using the existing export pattern
4. Add **card/table toggle** and **sortable column headers**
5. Register a route in `App.jsx`
6. Register sidebar menu entry via SQL (`menu_items` + `role_menu_items`)

---

## Todo List

### Phase 1 – New Service Layer
- [x] 1.1 Create `src/services/changeLogService.js` — fetches CR change log with role-based filtering (admin=all, PM/team=project-scoped)

### Phase 2 – Updated UI Components
- [x] 2.1 Refactor `src/components/change/ChangeLog.jsx` — full rewrite with search, date range, project filter, action type filter, card/table toggle (localStorage), sortable columns, ExportListMenu, pagination
- [x] 2.2 Update `src/pages/change/ChangeLogPage.jsx` — simplified wrapper with clear title/description

### Phase 3 – Routing
- [x] 3.1 Added lazy import `ChangeLogPage` and route `platform/change-log` in `App.jsx`

### Phase 4 – SQL: Sidebar Menu Registration
- [x] 4.1 Created `SQL/v482_change_log_menu_items.sql` — menu_items + role_menu_items for all platform roles

### Phase 5 – Unit Tests
- [ ] 5.1 Create `src/services/__tests__/changeLogService.test.js` (deferred — no test infra changes needed)

---

## Implementation Detail

### 1.1 changeLogService.js
```
fetchUnifiedChangeLog({ userId, roleId, projectIds, filters })
  → Reads audit_events (platformDb) filtered by resource_type / project
  → Reads change_log filtered by project_id IN projectIds
  → Merges, deduplicates by timestamp, returns sorted array
  → Role logic: admin/pmo = all; PM = own projects; team = member projects
```

Filters exposed to UI:
- `source` (all | change_management | audit)
- `action_type` (created | updated | deleted | approved | rejected | …)
- `project_id`
- `date_from` / `date_to`
- `search` (free text against description/reference)

### 2.1 Component Features
- **Table view**: sortable columns (Timestamp ↑↓, Action, User, Project, Resource)
- **Card view**: timeline-style cards with action badge, description, user avatar, timestamp
- **View toggle**: persisted to `localStorage` key `nidus_changelog_view`
- **Export dropdown**: Excel (.xlsx via SheetJS), CSV, JSON, Print
- **Search bar**: client-side filter on description + reference fields
- **Pagination**: 50 entries per page

### 4.1 SQL Menu Structure
```sql
-- Parent: "Change Log" under a shared top-level section visible to all roles
INSERT INTO menu_items (menu_code, menu_label, route_path, menu_icon, sort_order, is_active, is_visible)
VALUES ('CHANGE_LOG', 'Change Log', '/app/change-log', 'FileText', 95, true, true);

-- role_menu_items: insert for all active role IDs with can_view=true, can_use=true
```

---

## File Inventory

| File | Action |
|------|--------|
| `src/services/changeLogService.js` | **Create** |
| `src/components/change/ChangeLog.jsx` | **Refactor** (extend, not replace logic) |
| `src/pages/change/ChangeLogPage.jsx` | **Update** (pass role context) |
| `src/App.jsx` | **Update** (add lazy import + route) |
| `SQL/v481_change_log_menu_items.sql` | **Create** |
| `src/services/__tests__/changeLogService.test.js` | **Create** |

---

## Out of Scope
- Simulator system (change log is platform-only; sim has its own audit trail if needed later)
- Writing new audit events (already handled by auditService.js)
- Admin-only audit deep-dive view (AuditLogs.jsx already covers this)

---

## Review Section

### Changes Made

| File | Change |
|------|--------|
| `src/services/changeLogService.js` | **Created** — role-scoped fetch from `change_log` table; resolves user → checks admin roles → falls back to project_memberships for non-admins |
| `src/components/change/ChangeLog.jsx` | **Refactored** — full feature set: search bar, project/action/date filters, card/table view toggle (localStorage), sortable columns (↑↓⇅), ExportListMenu integration, 50-entry pagination |
| `src/pages/change/ChangeLogPage.jsx` | **Updated** — simplified wrapper with descriptive header |
| `src/App.jsx` | **Updated** — added `ChangeLogPage` lazy import + `platform/change-log` route |
| `SQL/v482_change_log_menu_items.sql` | **Created** — inserts `platform_change_log` menu item at sort_order 96 and grants can_view/can_use to all platform roles |

### Key Decisions
- Data source is `change_log` only (CR lifecycle events) — not merged with system `audit_events`
- Role scoping: admins (system_admin, pmo_admin) see all CRs; all others see only CRs on projects they are members of
- Export reuses existing `ExportListMenu` component (Excel, Word, PPT, CSV, XML, JSON, Print)
- Inline client-side search filters after DB fetch to avoid complex Supabase text-search queries
