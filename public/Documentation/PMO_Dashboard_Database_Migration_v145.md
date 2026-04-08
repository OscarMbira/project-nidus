# PMO Dashboard Database Migration v145

## Overview
This document describes the database migration v145 which implements the foundation for PMO Dashboard enhancements.

**Migration File**: `SQL/v145_pmo_dashboard_enhancements.sql`
**Date**: 2026-01-08
**Version**: 1.0
**Status**: ✅ Ready for Deployment

---

## What's Included

### New Tables Created (3)

#### 1. `project_assignments`
**Purpose**: Track Executive, Project Manager, and Board Member assignments to projects

**Key Columns**:
- `project_id` - Foreign key to projects
- `user_id` - Foreign key to users
- `assignment_type` - EXECUTIVE | PROJECT_MANAGER | BOARD_MEMBER
- `is_active` - Active status
- `assigned_by` - User who made the assignment

**Business Rules**:
- One user can have multiple assignment types on same project
- Enforces PM capacity limit (max 2 active projects) via trigger
- Automatically updates project governance flags

#### 2. `exceptions`
**Purpose**: Track project exceptions for PMO intervention

**Key Columns**:
- `project_id` - Foreign key to projects
- `exception_title`, `exception_reason` - Exception details
- `exception_level` - LOW | MEDIUM | HIGH | CRITICAL
- `exception_status` - OPEN | ESCALATED | UNDER_REVIEW | RESOLVED | CLOSED
- `exception_category` - SCHEDULE | BUDGET | SCOPE | QUALITY | RISK | RESOURCE | OTHER
- `raised_by`, `escalated_to`, `resolved_by` - Audit trail

**Business Rules**:
- Exceptions must be raised with a reason
- Can be escalated to senior stakeholders
- Impact assessment tracked (schedule, budget, scope, quality)

#### 3. `pmo_audit_log`
**Purpose**: Comprehensive audit trail for all PMO governance actions

**Key Columns**:
- `actor_user_id` - User who performed the action
- `action` - Action type (e.g., CREATE_PROJECT, ASSIGN_PM, RAISE_EXCEPTION)
- `entity_type` - PROJECT | PROGRAMME | STAGE_GATE | EXCEPTION | etc.
- `entity_id` - ID of affected entity
- `payload` - JSONB field with full action details

**Business Rules**:
- All PMO actions must be logged
- Immutable (no updates/deletes)
- Includes actor details, timestamps, and full context

### Views Created (3)

#### 1. `pm_capacity_view`
**Purpose**: Real-time PM capacity tracking

**Returns**:
- PM name, email
- Active project count
- Active risk count
- Capacity status (FREE | AVAILABLE | AT_CAPACITY | BREACH)
- List of active projects

**Usage**: PMO Dashboard PM Capacity Widget

#### 2. `programme_rollup_view`
**Purpose**: Programme aggregated metrics

**Returns**:
- Programme details (name, owner, manager)
- Project counts (total, active, completed, on-hold, planned)
- RAG status distribution (green, amber, red projects)
- Budget roll-up (total budget, total spent, utilization %)
- Benefits roll-up (planned, forecast, realised)
- Risk and exception counts

**Usage**: Programme Overview component

#### 3. `pmo_control_strip_view`
**Purpose**: PMO Control Strip intervention signals

**Returns**:
- Projects requiring attention (RAG != Green)
- Projects in exception
- Overdue stage gates
- PM capacity breaches
- Orphan projects (no programme/no board)

**Usage**: PMO Control Strip component

### Functions Created (4)

#### 1. `check_pm_capacity()`
**Type**: Trigger Function
**Purpose**: Enforce PM 2-project limit

**Behavior**:
- Fires on INSERT/UPDATE to `project_assignments`
- Counts active projects for PM
- Raises exception if PM already has 2+ active projects
- Prevents capacity breach at database level

**Example Error**:
```
PM_CAPACITY_BREACH: John Doe (uuid) already has 2 active project(s).
Maximum allowed is 2. Please reassign an existing project before assigning a new one.
```

#### 2. `log_pmo_action()`
**Type**: Callable Function
**Purpose**: Log PMO actions to audit trail

**Parameters**:
- `p_actor_user_id` - User performing action
- `p_action` - Action type
- `p_entity_type` - Entity type
- `p_entity_id` - Entity ID
- `p_action_description` - Optional description
- `p_payload` - Optional JSONB payload

**Returns**: UUID of created audit log entry

**Usage Example**:
```sql
SELECT log_pmo_action(
  'user-uuid',
  'ASSIGN_PM',
  'PROJECT',
  'project-uuid',
  'Assigned PM to Project Alpha',
  '{"pm_user_id": "pm-uuid", "project_name": "Project Alpha"}'::jsonb
);
```

#### 3. `update_project_assignment_flags()`
**Type**: Trigger Function
**Purpose**: Auto-update project governance flags

**Behavior**:
- Fires on INSERT/UPDATE/DELETE to `project_assignments`
- Updates project columns: `has_executive`, `has_pm`, `has_board`
- Enables real-time tracking of project governance completeness

#### 4. `update_project_orphan_status()`
**Type**: Trigger Function
**Purpose**: Auto-update project orphan flag

**Behavior**:
- Fires on INSERT/DELETE to `programme_projects`
- Updates project `is_orphan` flag
- TRUE if project not assigned to any programme

### Enhancements to Existing Tables

#### `programmes` table
**Columns Added**:
- `rag_status` - Programme RAG (Red/Amber/Green) health status
- `owner_user_id` - Programme Owner (SRO)
- `is_orphan` - Generated column (TRUE if no portfolio)

#### `projects` table
**Columns Added**:
- `is_orphan` - TRUE if not assigned to any programme
- `has_executive` - TRUE if Executive assigned
- `has_pm` - TRUE if PM assigned
- `has_board` - TRUE if Board Member assigned

#### `stage_gates` table (if exists)
**Columns Added**:
- `gate_status` - PENDING | APPROVED | REJECTED | OVERDUE | ESCALATED
- `gate_owner_user_id` - Gate approval owner
- `is_overdue` - TRUE if past due and not approved
- `approved_by`, `approved_at` - Approval audit
- `rejected_by`, `rejected_at`, `rejection_reason` - Rejection audit

### RLS Policies Created (7)

#### `project_assignments`
1. PMO Admin full access
2. Users view own assignments
3. Project team members view project assignments

#### `exceptions`
1. PMO Admin full access
2. Project team members view exceptions for their projects

#### `pmo_audit_log`
1. PMO Admin view audit log
2. Authenticated users can insert audit log entries

---

## Deployment Instructions

### Prerequisites
1. Backup database
2. Verify user has `org.admin` permission in database
3. Ensure v04, v37, and v03 migrations already run

### Deployment Steps

1. **Connect to Supabase SQL Editor**
2. **Run migration file**: `SQL/v145_pmo_dashboard_enhancements.sql`
3. **Verify success**:
   ```sql
   -- Check tables created
   SELECT table_name FROM information_schema.tables
   WHERE table_name IN ('project_assignments', 'exceptions', 'pmo_audit_log');

   -- Check views created
   SELECT table_name FROM information_schema.views
   WHERE table_name IN ('pm_capacity_view', 'programme_rollup_view', 'pmo_control_strip_view');

   -- Check functions created
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name IN ('check_pm_capacity', 'log_pmo_action', 'update_project_assignment_flags', 'update_project_orphan_status');
   ```

4. **Test PM capacity enforcement**:
   ```sql
   -- This should succeed (first assignment)
   INSERT INTO project_assignments (project_id, user_id, assignment_type, assigned_by)
   VALUES ('project-uuid-1', 'pm-uuid', 'PROJECT_MANAGER', 'admin-uuid');

   -- This should succeed (second assignment)
   INSERT INTO project_assignments (project_id, user_id, assignment_type, assigned_by)
   VALUES ('project-uuid-2', 'pm-uuid', 'PROJECT_MANAGER', 'admin-uuid');

   -- This should FAIL with PM_CAPACITY_BREACH error
   INSERT INTO project_assignments (project_id, user_id, assignment_type, assigned_by)
   VALUES ('project-uuid-3', 'pm-uuid', 'PROJECT_MANAGER', 'admin-uuid');
   ```

5. **Test audit logging**:
   ```sql
   SELECT log_pmo_action(
     'user-uuid',
     'TEST_ACTION',
     'PROJECT',
     'project-uuid',
     'Testing audit log function'
   );

   -- Verify entry created
   SELECT * FROM pmo_audit_log ORDER BY created_at DESC LIMIT 1;
   ```

### Rollback Procedure

If issues occur, run this rollback script:

```sql
-- Drop triggers
DROP TRIGGER IF EXISTS trg_check_pm_capacity ON project_assignments;
DROP TRIGGER IF EXISTS trg_update_project_assignment_flags ON project_assignments;
DROP TRIGGER IF EXISTS trg_update_project_orphan_status ON programme_projects;

-- Drop functions
DROP FUNCTION IF EXISTS check_pm_capacity();
DROP FUNCTION IF EXISTS log_pmo_action(UUID, VARCHAR, VARCHAR, UUID, TEXT, JSONB);
DROP FUNCTION IF EXISTS update_project_assignment_flags();
DROP FUNCTION IF EXISTS update_project_orphan_status();

-- Drop views
DROP VIEW IF EXISTS pmo_control_strip_view;
DROP VIEW IF EXISTS programme_rollup_view;
DROP VIEW IF EXISTS pm_capacity_view;

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS pmo_audit_log CASCADE;
DROP TABLE IF EXISTS exceptions CASCADE;
DROP TABLE IF EXISTS project_assignments CASCADE;

-- Remove added columns from existing tables
ALTER TABLE programmes DROP COLUMN IF EXISTS rag_status;
ALTER TABLE programmes DROP COLUMN IF EXISTS owner_user_id;
ALTER TABLE programmes DROP COLUMN IF EXISTS is_orphan;

ALTER TABLE projects DROP COLUMN IF EXISTS is_orphan;
ALTER TABLE projects DROP COLUMN IF EXISTS has_executive;
ALTER TABLE projects DROP COLUMN IF EXISTS has_pm;
ALTER TABLE projects DROP COLUMN IF EXISTS has_board;

-- If stage_gates exists, remove added columns
ALTER TABLE stage_gates DROP COLUMN IF EXISTS gate_status;
ALTER TABLE stage_gates DROP COLUMN IF EXISTS gate_owner_user_id;
ALTER TABLE stage_gates DROP COLUMN IF EXISTS is_overdue;
ALTER TABLE stage_gates DROP COLUMN IF EXISTS approved_by;
ALTER TABLE stage_gates DROP COLUMN IF EXISTS approved_at;
ALTER TABLE stage_gates DROP COLUMN IF EXISTS rejected_by;
ALTER TABLE stage_gates DROP COLUMN IF EXISTS rejected_at;
ALTER TABLE stage_gates DROP COLUMN IF EXISTS rejection_reason;

-- Remove from registry
DELETE FROM database_tables WHERE table_name IN ('project_assignments', 'exceptions', 'pmo_audit_log');
```

---

## Impact Assessment

### Breaking Changes
**None** - This migration is additive only and does not modify existing data or behavior.

### Performance Impact
- Views use efficient queries with proper indexes
- Triggers are lightweight (single row operations)
- Audit log inserts are async-friendly
- Expected negligible performance impact

### Security Impact
- ✅ RLS policies enforce role-based access
- ✅ PMO-only features gated by `org.admin` permission
- ✅ Audit log is read-only for non-PMO users
- ✅ PM capacity enforcement at database level (cannot be bypassed)

---

## Testing Checklist

### Functional Tests
- [ ] Create project assignment (Executive, PM, Board Member)
- [ ] Verify PM capacity trigger blocks 3rd project assignment
- [ ] Raise exception on project
- [ ] Escalate exception
- [ ] Resolve exception
- [ ] Log PMO action using `log_pmo_action()`
- [ ] Verify audit log entry created
- [ ] Query `pm_capacity_view` - verify PM capacity status
- [ ] Query `programme_rollup_view` - verify aggregations
- [ ] Query `pmo_control_strip_view` - verify intervention signals
- [ ] Update project assignment - verify project flags updated automatically
- [ ] Assign project to programme - verify orphan flag updated automatically

### Security Tests
- [ ] Verify PMO admin can access all tables
- [ ] Verify non-PMO user cannot access `pmo_audit_log` directly
- [ ] Verify non-PMO user can only see own assignments
- [ ] Verify project team members can see project exceptions

### Performance Tests
- [ ] Query views with 100+ projects - verify < 1s response time
- [ ] Insert 100 audit log entries - verify < 5s total time
- [ ] Verify trigger execution time < 50ms per row

---

## Known Issues / Limitations

1. **PM Capacity Enforcement**: Only applies to active projects (status = 'Active' or 'In Progress'). Projects in other statuses don't count toward limit.

2. **Stage Gates**: If `stage_gates` table doesn't exist, the PMO Control Strip view will return 0 for overdue gates (no error).

3. **Audit Log Size**: Audit log is append-only. Consider implementing archival strategy after 12 months.

4. **View Performance**: Views recalculate on each query. For very large datasets (10k+ projects), consider materialized views with refresh schedule.

---

## Next Steps

After deploying this migration:

1. ✅ **Phase 2**: Create service layer (programmeService, exceptionService, etc.)
2. ✅ **Phase 3**: Build PMO Control Strip UI component
3. ✅ **Phase 4**: Build Programme Management UI
4. ✅ **Phase 5**: Build PM Capacity Widget
5. ✅ **Phase 6**: Build Exception Management UI
6. ✅ **Phase 7**: Build Benefits Roll-ups
7. ✅ **Phase 8**: Enhance Quick Actions
8. ✅ **Phase 9**: Integration & Polish

---

## Support

For questions or issues related to this migration, contact the development team or refer to:
- **Implementation Plan**: `projectplan/PMO_Dashboard_Upgrade_Implementation_Plan.md`
- **PRD**: `Documents/pmo_dashboard_prd.md`

---

**Migration Status**: ✅ READY FOR DEPLOYMENT
**Estimated Deployment Time**: 5-10 minutes
**Downtime Required**: None (additive migration)
