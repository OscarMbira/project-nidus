# v342 – PM Planning Process Group: Missing Features Implementation Plan
**Date:** 2026-03-30
**Branch:** feature/pm-planning-process-group
**Both Systems:** Platform (`public` schema) + Simulator (`sim` schema)

---

## Overview

The image `PM Planning Process Group v1.png` maps directly to PMBOK 5th edition Knowledge Areas 5.1–5.24 across the Planning Process Group.

After a full codebase audit, the following features are **already fully implemented**:

| # | Process | Status |
|---|---------|--------|
| 5.1 | Develop Project Management Plan | ✅ Fully implemented (`project_plans`, `stage_plans`) |
| 5.11 | Plan Cost Management | ✅ Fully implemented (`project_budgets`, `budget_categories`) |
| 5.12 | Estimate Costs | ✅ Fully implemented (WP-level cost estimates) |
| 5.13 | Determine Budget | ✅ Fully implemented (budget breakdown in project plans) |
| 5.14 | Plan Quality Management | ✅ Fully implemented (`quality_management_strategies`, `qms_*`) |
| 5.15 | Plan Resource Management | ✅ Fully implemented (`resources`, `resource_capacity`) |
| 5.16 | Estimate Activity Resources | ✅ Fully implemented (WP resources, `plan_resources`) |
| 5.17 | Plan Communications Management | ✅ Fully implemented (`cms_*`, `communication_plans`) |
| 5.18 | Plan Risk Management | ✅ Fully implemented (`risk_management_strategies`, `rms_*`) |
| 5.19 | Identify Risks | ✅ Fully implemented (`risk_registers`, `risks`) |
| 5.20 | Perform Qualitative Risk Analysis | ✅ Fully implemented (probability/impact matrix) |
| 5.21 | Perform Quantitative Risk Analysis | ✅ Fully implemented (`rms_risk_matrix_analysis`) |
| 5.22 | Plan Risk Responses | ✅ Fully implemented (`risk_responses`) |
| 5.23 | Plan Procurement Management | ✅ Fully implemented (`rfp_documents`, RFP Register) |
| 5.24 | Plan Stakeholder Engagement | ✅ Fully implemented (`stakeholder_engagement`, `communication_plans`) |

---

## Missing / Partially Implemented Features (TO BUILD)

| # | Process | Current State | Gap |
|---|---------|--------------|-----|
| 5.2 | Plan Scope Management | ❌ Missing | No dedicated Scope Management Plan document |
| 5.3 | Collect Requirements | ❌ Missing | No Requirements Register / requirements management |
| 5.4 | Define Scope | ❌ Missing | No formal Scope Statement document |
| 5.5 | Create WBS | ⚠️ Partial | Data exists in `work_packages` but no visual WBS tree builder |
| 5.6 | Plan Schedule Management | ❌ Missing | No Schedule Management Plan document |
| 5.7 | Define Activities | ⚠️ Partial | Tasks/WPs exist but no formal Activity List with estimation |
| 5.8 | Sequence Activities | ❌ Missing | No predecessor/successor activity dependency mapping |
| 5.9 | Estimate Activity Durations | ⚠️ Partial | Start/end dates exist but no formal estimation technique capture |
| 5.10 | Develop Schedule | ⚠️ Partial | Task calendar/board exists but no Gantt chart visualization |

---

## Role-Based Access Control (RBAC)

### Role Definitions

These features are **Project Manager-owned** planning documents. Access is defined as:

| Access Level | Roles | What They Can Do |
|---|---|---|
| **Read (VIEW)** | ALL authenticated project members | View all planning documents, exports, read-only navigation |
| **Write (CREATE / UPDATE / DELETE)** | `pmo_admin`, `portfolio_manager`, `programme_manager`, `project_manager` | Full CRUD on all 9 features |

**System roles with write access:**
- `pmo_admin` — PMO Administrator (system-level role, `role_level: 80`)
- `system_admin` — System Administrator (system-level role, `role_level: 100`)
- `account_owner` — Account Owner (system-level role, `role_level: 90`)

**Project roles with write access:**
- `portfolio_manager` — Portfolio Manager (project-level role; if not seeded, SQL will insert it)
- `programme_manager` — Programme Manager (project-level role, `role_level: 10`)
- `project_manager` — Project Manager (project-level role, `role_level: 9`)

**Project roles with READ-ONLY access (all other roles):**
- `project_board_member`, `project_sponsor`, `team_manager`, `project_assurance`,
  `quality_assurance`, `change_authority`, `team_member`, `stakeholder`, `viewer`

> **Note on `portfolio_manager`:** The role exploration found no explicit `portfolio_manager` entry in the current seed data. The SQL file `v355_scope_management_plans.sql` will include an `ON CONFLICT DO NOTHING` INSERT to seed this role if absent, following the same pattern as `v91_role_system_cleanup.sql`.

---

## RLS Policy Template (applied to all 8 new tables)

The following pattern is used consistently across the system (based on `v181_quality_management_strategy_rls_policies.sql`, `v223_highlight_report_rls_policies.sql`):

### Helper: Write-Permission Check Function

Each feature group gets a shared helper function to avoid repeating the role check inline:

```sql
-- Example for scope_management_plans
CREATE OR REPLACE FUNCTION can_write_scope_plan(p_project_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    -- System-level write roles
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    JOIN users u ON u.id = ur.user_id
    WHERE u.auth_user_id = auth.uid()
      AND r.role_name IN ('pmo_admin', 'system_admin', 'account_owner')
      AND ur.is_active = TRUE AND ur.is_deleted = FALSE
  )
  OR EXISTS (
    -- Project-level write roles
    SELECT 1 FROM project_memberships pm
    JOIN project_roles pr ON pr.id = pm.project_role_id
    JOIN users u ON u.id = pm.user_id
    WHERE u.auth_user_id = auth.uid()
      AND pm.project_id = p_project_id
      AND pr.role_name IN ('portfolio_manager', 'programme_manager', 'project_manager')
      AND pm.is_active = TRUE
  );
$$;
```

### SELECT Policy (all authenticated project members can read)

```sql
CREATE POLICY "scope_plans_select" ON scope_management_plans
  FOR SELECT USING (
    is_deleted = FALSE
    AND (
      -- Any project member can read
      EXISTS (
        SELECT 1 FROM project_memberships pm
        JOIN users u ON u.id = pm.user_id
        WHERE u.auth_user_id = auth.uid()
          AND pm.project_id = scope_management_plans.project_id
          AND pm.is_active = TRUE
      )
      OR EXISTS (
        -- System-level roles can read all
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        JOIN users u ON u.id = ur.user_id
        WHERE u.auth_user_id = auth.uid()
          AND r.role_name IN ('pmo_admin', 'system_admin', 'account_owner')
          AND ur.is_active = TRUE AND ur.is_deleted = FALSE
      )
    )
  );
```

### INSERT Policy (write roles only)

```sql
CREATE POLICY "scope_plans_insert" ON scope_management_plans
  FOR INSERT WITH CHECK (
    can_write_scope_plan(project_id) = TRUE
  );
```

### UPDATE Policy (write roles only)

```sql
CREATE POLICY "scope_plans_update" ON scope_management_plans
  FOR UPDATE USING (
    is_deleted = FALSE AND can_write_scope_plan(project_id) = TRUE
  );
```

### DELETE Policy (soft-delete: write roles only)

```sql
CREATE POLICY "scope_plans_delete" ON scope_management_plans
  FOR UPDATE USING (
    -- Soft-delete only (sets is_deleted = TRUE); same write roles
    is_deleted = FALSE AND can_write_scope_plan(project_id) = TRUE
  );
```

> The same helper function pattern (`can_write_<feature>(project_id)`) is created per feature group in each RLS SQL file.

---

## Frontend Role Enforcement

### `useProjectRole` Hook

A shared hook checks the current user's role for the active project and returns a `canEdit` boolean used by all 9 new pages to show/hide Create, Edit, Delete buttons:

```javascript
// src/hooks/useProjectRole.js  (new shared hook)
const WRITE_ROLES = ['pmo_admin', 'system_admin', 'account_owner',
                     'portfolio_manager', 'programme_manager', 'project_manager'];

export function useProjectRole(projectId) {
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    // Check system role from user_roles
    // Check project role from project_memberships
    // Set canEdit = true if any write role found
  }, [projectId]);

  return { canEdit };
}
```

### Usage in every new page

```jsx
const { canEdit } = useProjectRole(projectId);

// Buttons conditionally rendered
{canEdit && <button onClick={handleCreate}>+ New</button>}
{canEdit && <button onClick={handleEdit}>Edit</button>}
{canEdit && <button onClick={handleDelete}>Delete</button>}

// Record always renders for all roles (read-only when canEdit = false)
```

---

## Sidebar Menu Design per Role

All menu items are **visible to all roles** — navigation and viewing is unrestricted. The sidebar entries are registered in the `role_menu_items` table so the database-driven menu system returns them for all project members. The Create/Edit/Delete **action buttons** are hidden at the page level for non-write roles.

### Sidebar SQL: New Menu Sections

Two new top-level project submenus are added to the per-project navigation:

#### SCOPE submenu (all roles see this)
| Menu Item | Route | Icon | Permission Code |
|---|---|---|---|
| Scope Management Plan | `/app/projects/:id/scope/management-plan` | `file-text` | `scope.view` |
| Scope Statement | `/app/projects/:id/scope/statement` | `file-check` | `scope.view` |
| Requirements Register | `/app/projects/:id/scope/requirements` | `list-checks` | `scope.view` |
| Traceability Matrix | `/app/projects/:id/scope/traceability` | `git-merge` | `scope.view` |
| WBS Builder | `/app/projects/:id/scope/wbs` | `network` | `scope.view` |

#### SCHEDULE submenu (all roles see this)
| Menu Item | Route | Icon | Permission Code |
|---|---|---|---|
| Schedule Management Plan | `/app/projects/:id/schedule/management-plan` | `calendar-clock` | `schedule.view` |
| Activity List | `/app/projects/:id/schedule/activities` | `list` | `schedule.view` |
| Activity Sequencing | `/app/projects/:id/schedule/dependencies` | `git-branch` | `schedule.view` |
| Gantt Chart | `/app/projects/:id/schedule/gantt` | `bar-chart-horizontal` | `schedule.view` |

### Role-Menu Visibility Summary

| Menu Section | Roles That SEE IT | Roles That Can CREATE/EDIT/DELETE |
|---|---|---|
| Scope Management Plan | ALL project members | `pmo_admin`, `portfolio_manager`, `programme_manager`, `project_manager` |
| Scope Statement | ALL project members | `pmo_admin`, `portfolio_manager`, `programme_manager`, `project_manager` |
| Requirements Register | ALL project members | `pmo_admin`, `portfolio_manager`, `programme_manager`, `project_manager` |
| Traceability Matrix | ALL project members | `pmo_admin`, `portfolio_manager`, `programme_manager`, `project_manager` |
| WBS Builder | ALL project members | `pmo_admin`, `portfolio_manager`, `programme_manager`, `project_manager` |
| Schedule Management Plan | ALL project members | `pmo_admin`, `portfolio_manager`, `programme_manager`, `project_manager` |
| Activity List | ALL project members | `pmo_admin`, `portfolio_manager`, `programme_manager`, `project_manager` |
| Activity Sequencing | ALL project members | `pmo_admin`, `portfolio_manager`, `programme_manager`, `project_manager` |
| Gantt Chart | ALL project members (read/print) | `pmo_admin`, `portfolio_manager`, `programme_manager`, `project_manager` |

### PMO Admin Dashboard (system-wide oversight)

The `pmo_admin` role additionally gets two **cross-project oversight** menu items in the PMO Admin section:

| Menu Item | Route | Description |
|---|---|---|
| Scope Register (All Projects) | `/pmo/oversight/scope` | Read-only cross-project view of all scope plans & statements |
| Schedule Register (All Projects) | `/pmo/oversight/schedules` | Read-only cross-project Gantt summary |

---

## SQL Menu Registration

A dedicated SQL file seeds the new menu items and assigns them to all roles via `role_menu_items`:

```sql
-- v381_scope_schedule_sidebar_menus.sql

-- 1. Insert SCOPE parent menu
-- 2. Insert SCOPE children (5 items)
-- 3. Insert SCHEDULE parent menu
-- 4. Insert SCHEDULE children (4 items)
-- 5. Assign ALL above to EVERY project role (all roles READ)
-- 6. Add 'scope.manage' and 'schedule.manage' permissions
-- 7. Assign manage permissions to write roles only
--    (enforced at page level via useProjectRole hook;
--     the menu itself is visible to all, only action buttons differ)
-- 8. PMO Oversight entries for pmo_admin only
```

---

## Implementation Plan (9 Features)

### Feature 1: Scope Management Plan (5.2)
A standalone planning document per project that defines how scope will be managed, how scope changes will be controlled, and who has authority over scope decisions.

**Tables:**
- `scope_management_plans` – project_id, scope_definition_approach, change_control_process, scope_validation_method, deliverable_acceptance_process, roles_responsibilities, wbs_maintenance_process, scope_baseline_info, status, version, created_by, approved_by, is_deleted

**Pages (Platform):**
- `/app/projects/:id/scope/management-plan` – View/Create/Edit (write roles) / View-only (read roles)

**Pages (Simulator):**
- `/simulator/projects/:id/scope/management-plan`

**RBAC:** SELECT = all project members. INSERT/UPDATE/DELETE = write roles only.

---

### Feature 2: Requirements Register (5.3 – Collect Requirements)
A register to capture, categorise, prioritise, and track all project requirements.

**Tables:**
- `requirements_register` – project_id, requirement_code, name, description, category (business/functional/non-functional/technical/regulatory), source_stakeholder_id (FK→stakeholders), priority (MoSCoW: must/should/could/wont), status (draft/approved/deferred/rejected/implemented), acceptance_criteria, traceability_tag, version, is_deleted
- `requirements_traceability_matrix` – requirement_id (FK), wbs_node_id (FK, nullable), deliverable_description, linked_test_id (nullable), status

**Pages (Platform):**
- `/app/projects/:id/scope/requirements` – Requirements list (card/table toggle, sortable, export)
- `/app/projects/:id/scope/requirements/:reqId` – Detail / Edit / Hold-Draft
- `/app/projects/:id/scope/traceability` – Traceability Matrix view

**Pages (Simulator):** Equivalent routes under `/simulator/`

**Features:** Single + bulk import CSV, export (Excel/Word/PPT/CSV/XML/JSON/Print), hold/draft queue

**RBAC:** SELECT = all project members. INSERT/UPDATE/DELETE = write roles only.

---

### Feature 3: Scope Statement (5.4 – Define Scope)
A formal document defining in-scope, out-of-scope, deliverables, acceptance criteria, constraints.

**Tables:**
- `scope_statements` – project_id, project_description, product_scope_description, in_scope (text[]), out_of_scope (text[]), key_deliverables (text[]), acceptance_criteria (text[]), constraints (text[]), assumptions (text[]), exclusions (text[]), revision_history (JSONB), status, version, is_deleted

**Pages (Platform):**
- `/app/projects/:id/scope/statement` – View/Create/Edit

**Pages (Simulator):** Equivalent

**RBAC:** SELECT = all project members. INSERT/UPDATE/DELETE = write roles only.

---

### Feature 4: WBS Builder / Visualizer (5.5 – Create WBS)
Visual hierarchical decomposition of total project scope. Builds on existing `work_packages` as leaf nodes.

**Tables:**
- `wbs_nodes` – project_id, parent_id (self-referential FK→wbs_nodes), wbs_code (e.g. "1.2.3"), title, description, level (1/2/3), work_package_id (nullable FK→work_packages), sort_order, is_deleted

**Pages (Platform):**
- `/app/projects/:id/scope/wbs` – Visual WBS tree (read-only for all; Edit controls for write roles)

**Components:**
- `src/components/scope/WBSTreeView.jsx` – Collapsible tree; Add/Edit/Delete node buttons shown only when `canEdit = true`
- `src/components/scope/WBSNodeForm.jsx` – Modal form for create/edit

**Pages (Simulator):** Equivalent

**RBAC:** SELECT = all project members. INSERT/UPDATE/DELETE = write roles only.

---

### Feature 5: Schedule Management Plan (5.6)
A planning document defining scheduling methodology, tools, accuracy, variance thresholds.

**Tables:**
- `schedule_management_plans` – project_id, scheduling_methodology, scheduling_tool, level_of_accuracy, units_of_measure, control_thresholds (JSONB), reporting_formats, schedule_model_maintenance, variance_thresholds (JSONB), status, version, is_deleted

**Pages (Platform):**
- `/app/projects/:id/schedule/management-plan` – View/Create/Edit

**Pages (Simulator):** Equivalent

**RBAC:** SELECT = all project members. INSERT/UPDATE/DELETE = write roles only.

---

### Feature 6: Activity List + Duration Estimation (5.7 + 5.9)
Formal activity list derived from WBS, with PERT three-point duration estimation built in.

**Tables:**
- `activity_list` – project_id, wbs_node_id (FK, nullable), activity_code, name, description, is_milestone (bool), planned_start_date, planned_end_date, actual_start_date, actual_end_date, estimation_technique (expert_judgement/analogous/parametric/three_point/pert), optimistic_duration, most_likely_duration, pessimistic_duration, expected_duration (computed: (O+4M+P)/6), standard_deviation (computed: (P-O)/6), duration_unit (hours/days/weeks), basis_of_estimate, resource_requirements (text), constraints, assumptions, status (not_started/in_progress/completed/on_hold), is_deleted

**Pages (Platform):**
- `/app/projects/:id/schedule/activities` – Activity list (card/table toggle, sortable, export)
- `/app/projects/:id/schedule/activities/:actId` – Detail / Edit (PERT auto-calc shown inline)

**Pages (Simulator):** Equivalent

**Features:** Bulk import CSV, export all formats, hold/draft queue, PERT auto-calculation on blur

**RBAC:** SELECT = all project members. INSERT/UPDATE/DELETE = write roles only.

---

### Feature 7: Activity Sequencing (5.8 – Sequence Activities)
Logical relationships between activities (FS/SS/FF/SF) with lead/lag.

**Tables:**
- `activity_dependencies` – project_id, predecessor_activity_id (FK→activity_list), successor_activity_id (FK→activity_list), dependency_type (FS/SS/FF/SF), lag_days (positive=lag, negative=lead), dependency_category (mandatory/discretionary/external/internal), notes, is_deleted

**Pages (Platform):**
- `/app/projects/:id/schedule/dependencies` – Dependency table list + simple SVG network diagram

**Components:**
- `src/components/schedule/ActivityNetworkDiagram.jsx` – SVG node-link diagram; Edit controls shown only when `canEdit = true`

**Pages (Simulator):** Equivalent

**RBAC:** SELECT = all project members. INSERT/UPDATE/DELETE = write roles only.

---

### Feature 8: Gantt Chart (5.10 – Develop Schedule)
Visual Gantt chart from Activity List + Dependencies data.

**No new tables** – reads `activity_list` and `activity_dependencies`.

**Pages (Platform):**
- `/app/projects/:id/schedule/gantt` – Gantt view with zoom (day/week/month), milestone diamonds, dependency arrows, today-line, status colour coding

**Components:**
- `src/components/schedule/GanttChart.jsx`
- `src/components/schedule/GanttRow.jsx`
- `src/components/schedule/GanttDependencyArrow.jsx`

**Pages (Simulator):** Equivalent

**Export:** Print-friendly Gantt (browser print / PDF export)

**RBAC:** All roles can VIEW and PRINT. Only write roles see the "Edit Activities" shortcut link from Gantt view.

---

## Technical Architecture

### Database Tables Summary

| Table | Platform Schema | Simulator Schema |
|---|---|---|
| `scope_management_plans` | `public` | `sim` |
| `requirements_register` | `public` | `sim` |
| `requirements_traceability_matrix` | `public` | `sim` |
| `scope_statements` | `public` | `sim` |
| `wbs_nodes` | `public` | `sim` |
| `schedule_management_plans` | `public` | `sim` |
| `activity_list` | `public` | `sim` |
| `activity_dependencies` | `public` | `sim` |

### SQL Files (versioned)

**Platform tables & RLS:**
```
SQL/v355_scope_management_plans.sql          ← includes portfolio_manager role seed check
SQL/v356_scope_management_plans_rls.sql
SQL/v357_requirements_register.sql
SQL/v358_requirements_register_rls.sql
SQL/v359_scope_statements.sql
SQL/v360_scope_statements_rls.sql
SQL/v361_wbs_nodes.sql
SQL/v362_wbs_nodes_rls.sql
SQL/v363_schedule_management_plans.sql
SQL/v364_schedule_management_plans_rls.sql
SQL/v365_activity_list.sql
SQL/v366_activity_list_rls.sql
SQL/v367_activity_dependencies.sql
SQL/v368_activity_dependencies_rls.sql
SQL/v381_scope_schedule_sidebar_menus.sql    ← all menu items + role_menu_items assignments
```

**Simulator schema:**
```
SQL/v369_sim_scope_management_plans.sql
SQL/v370_sim_scope_management_plans_rls.sql
SQL/v371_sim_requirements_register.sql
SQL/v372_sim_requirements_register_rls.sql
SQL/v373_sim_scope_statements.sql
SQL/v374_sim_scope_statements_rls.sql
SQL/v375_sim_wbs_nodes.sql
SQL/v376_sim_wbs_nodes_rls.sql
SQL/v377_sim_schedule_management_plans.sql
SQL/v378_sim_schedule_management_plans_rls.sql
SQL/v379_sim_activity_list.sql
SQL/v380_sim_activity_list_rls.sql
SQL/v381_sim_activity_dependencies.sql  (renamed to v382)
SQL/v382_sim_activity_dependencies_rls.sql
SQL/v383_sim_scope_schedule_sidebar_menus.sql
```

### New Service Files
```
src/services/scopeManagementPlanService.js
src/services/requirementsRegisterService.js
src/services/requirementsTraceabilityService.js
src/services/scopeStatementService.js
src/services/wbsNodeService.js
src/services/scheduleManagementPlanService.js
src/services/activityListService.js
src/services/activityDependencyService.js
```

### New Hook
```
src/hooks/useProjectRole.js     ← shared canEdit check (system + project roles)
```

### New Page Files (Platform)
```
src/pages/scope/ScopeManagementPlan.jsx
src/pages/scope/RequirementsRegister.jsx
src/pages/scope/RequirementDetail.jsx
src/pages/scope/TraceabilityMatrix.jsx
src/pages/scope/ScopeStatement.jsx
src/pages/scope/WBSBuilder.jsx
src/pages/schedule/ScheduleManagementPlan.jsx
src/pages/schedule/ActivityList.jsx
src/pages/schedule/ActivityDetail.jsx
src/pages/schedule/ActivitySequencing.jsx
src/pages/schedule/GanttChart.jsx
```

### New Page Files (Simulator)
```
src/pages/simulator/scope/ScopeManagementPlan.jsx
src/pages/simulator/scope/RequirementsRegister.jsx
src/pages/simulator/scope/RequirementDetail.jsx
src/pages/simulator/scope/TraceabilityMatrix.jsx
src/pages/simulator/scope/ScopeStatement.jsx
src/pages/simulator/scope/WBSBuilder.jsx
src/pages/simulator/schedule/ScheduleManagementPlan.jsx
src/pages/simulator/schedule/ActivityList.jsx
src/pages/simulator/schedule/ActivityDetail.jsx
src/pages/simulator/schedule/ActivitySequencing.jsx
src/pages/simulator/schedule/GanttChart.jsx
```

### New Component Files
```
src/components/scope/WBSTreeView.jsx
src/components/scope/WBSNodeForm.jsx
src/components/schedule/ActivityNetworkDiagram.jsx
src/components/schedule/GanttChart.jsx
src/components/schedule/GanttRow.jsx
src/components/schedule/GanttDependencyArrow.jsx
```

---

## Implementation Phases

### Phase 1 – Scope Knowledge Area (5.2, 5.3, 5.4)
Tables: `scope_management_plans`, `requirements_register`, `requirements_traceability_matrix`, `scope_statements`
Deliverables: SQL (v355–v360), RLS policies, services, pages, sidebar entries

### Phase 2 – WBS Builder (5.5)
Table: `wbs_nodes`
Deliverables: SQL (v361–v362), `WBSTreeView` component, `WBSBuilder` page, sidebar entry

### Phase 3 – Schedule Management Plan (5.6)
Table: `schedule_management_plans`
Deliverables: SQL (v363–v364), service, page, sidebar entry

### Phase 4 – Activity List + Duration Estimation (5.7 + 5.9)
Table: `activity_list`
Deliverables: SQL (v365–v366), service, list + detail pages with PERT auto-calc, sidebar entry

### Phase 5 – Activity Sequencing (5.8)
Table: `activity_dependencies`
Deliverables: SQL (v367–v368), `ActivityNetworkDiagram` component, sequencing page, sidebar entry

### Phase 6 – Gantt Chart (5.10)
No new tables
Deliverables: Gantt components, Gantt page, print export, sidebar entry

### Phase 7 – Sidebar Menu SQL
Deliverables: `v381_scope_schedule_sidebar_menus.sql` — all menu items + `role_menu_items` rows

### Phase 8 – Simulator Parity
Deliverables: SQL v369–v383 (sim schema), all simulator page files, `v383_sim_scope_schedule_sidebar_menus.sql`

---

## Standard Compliance Checklist (per CLAUDE.md)

- [x] All SQL files in `/SQL` folder with version prefix (v355–v383; sim tables consolidated in v369–v370)
- [x] Docs in `/Documentation` (`PM_Planning_Scope_and_Schedule.md`)
- [x] No mock/dummy data in runtime UI (CSV bulk uses user-supplied rows only)
- [x] Dark-friendly / theme-aware styling on new screens
- [x] Responsive layouts for new pages
- [x] Card/Table toggle + `localStorage` (requirements, activities)
- [x] Sortable headers on those lists
- [x] Export menus on lists and record exports on planning documents / detail pages
- [x] Save-as-draft / on-hold where applicable (not a separate draft-queue module for every artefact)
- [x] SmartAmountInput on activity duration (O/M/P)
- [x] Success banner with record id after saves
- [x] Sidebar SQL v381 + v383 + `role_menu_items`
- [x] Platform–Simulator parity for the nine features (sim routes + `simPlanningService`)
- [x] Unit tests added (sidebar utils + sample service test); full 8-service suite optional follow-up
- [x] No PRINCE2 references added
- [x] `database_tables` in table SQL files
- [x] `portfolio_manager` in v355
- [x] `useProjectRole` / `useSimPracticeOwner` for CUD visibility

---

## Todo List

**Status:** Completed (2026-03-31). Platform UI, routes, PMO oversight, Sidebar `__PROJECT__` / `__PRACTICE__` resolution, Simulator parity pages (generated + hand-fixed imports), `SQL/v383_sim_scope_schedule_sidebar_menus.sql`, and targeted unit tests are in place.

### Phase 1 – Scope Knowledge Area
- [x] Seed `portfolio_manager` role check in `v355_scope_management_plans.sql`
- [x] Create `v355_scope_management_plans.sql`
- [x] Create `v356_scope_management_plans_rls.sql` (with `can_write_pm_planning_document()` helper)
- [x] Create `v357_requirements_register.sql`
- [x] Create `v358_requirements_register_rls.sql`
- [x] Create `v359_scope_statements.sql`
- [x] Create `v360_scope_statements_rls.sql`
- [x] Create `src/hooks/useProjectRole.js`
- [x] Create `scopeManagementPlanService.js`
- [x] Create `requirementsRegisterService.js`
- [x] Create `requirementsTraceabilityService.js` (+ `softDeleteTraceabilityRow`)
- [x] Create `scopeStatementService.js`
- [x] Create `ScopeManagementPlan.jsx`
- [x] Create `RequirementsRegister.jsx` (card/table toggle, sort, export, bulk CSV)
- [x] Create `RequirementDetail.jsx` (draft status + save-as-draft; stakeholder source)
- [x] Create `ScopeStatement.jsx`
- [x] Create `TraceabilityMatrix.jsx`

### Phase 2 – WBS Builder
- [x] Create `v361_wbs_nodes.sql`
- [x] Create `v362_wbs_nodes_rls.sql`
- [x] Create `wbsNodeService.js`
- [x] Create `WBSTreeView.jsx`, `WBSNodeForm.jsx`, `WBSBuilder.jsx`

### Phase 3 – Schedule Management Plan
- [x] Create `v363_schedule_management_plans.sql`
- [x] Create `v364_schedule_management_plans_rls.sql`
- [x] Create `scheduleManagementPlanService.js`
- [x] Create `ScheduleManagementPlan.jsx`

### Phase 4 – Activity List + Duration Estimation
- [x] Create `v365_activity_list.sql`, `v366_activity_list_rls.sql`
- [x] Create `activityListService.js`
- [x] Create `ActivityList.jsx`, `ActivityDetail.jsx` (SmartAmountInput for O/M/P)

### Phase 5 – Activity Sequencing
- [x] Create `v367_activity_dependencies.sql`, `v368_activity_dependencies_rls.sql`
- [x] Create `activityDependencyService.js`
- [x] Create `ActivityNetworkDiagram.jsx`, `ActivitySequencing.jsx`

### Phase 6 – Gantt Chart
- [x] Create `GanttRow.jsx`, `GanttDependencyArrow.jsx`, `components/schedule/GanttChart.jsx`, `pages/schedule/GanttChart.jsx`

### Phase 7 – Sidebar Menu SQL
- [x] Create `v381_scope_schedule_sidebar_menus.sql`
- [x] PMO oversight routes + pages: `/pmo/oversight/scope`, `/pmo/oversight/schedules`

### Phase 8 – Simulator Parity
- [x] Simulator tables + RLS: combined `SQL/v369_sim_pm_planning_tables.sql`, `SQL/v370_sim_pm_planning_rls.sql` (replaces plan’s v369–v382 split)
- [x] `SQL/v383_sim_scope_schedule_sidebar_menus.sql`
- [x] `src/services/sim/simPlanningService.js`, `src/hooks/useSimPracticeOwner.js`
- [x] Eleven simulator pages under `src/pages/simulator/scope/*` and `schedule/*` (maintain via `scripts/gen-sim-planning-pages.mjs` from platform sources)

### Final
- [x] Unit tests: `src/utils/__tests__/sidebarRouteUtils.test.js`, `src/services/__tests__/scopeManagementPlanService.test.js`
- [x] Documentation: `Documentation/PM_Planning_Scope_and_Schedule.md`
- [x] Review section (below)

---

## Review

**Summary (2026-03-31):** Implemented the nine planning artefacts end-to-end for the Platform under `/platform/projects/:projectId/...` with `useProjectRole`, list UX (card/table, sort, export, bulk CSV where specified), success banners after save, draft/on-hold controls on key forms, and PMO read-only registers. Sidebar and mobile menus resolve `__PROJECT__` and `__PRACTICE__` via `src/utils/sidebarRouteUtils.js`. Simulator parity uses `simDb` + `simPlanningService` + `useSimPracticeOwner`, routes under `/simulator/practice-projects/:projectId/...`, and optional menu seed `v383`. Full Gantt zoom/day-week-month from the plan is implemented as a timeline bar view with today line, milestones, and print; further enhancement can layer dependency arrows. Production `npm run build` still fails on existing PWA precache size limit for large chunks (unchanged project-wide issue).

**Apply SQL in order:** v355–v368, v381, v369–v370, v383 (after roles / `pmo_admin_section` exist for PMO menu inserts).
