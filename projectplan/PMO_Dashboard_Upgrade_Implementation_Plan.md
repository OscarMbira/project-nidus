# PMO Dashboard Upgrade Implementation Plan

## Document Information
- **Date**: 2026-01-08
- **Version**: 1.0
- **Purpose**: Comprehensive plan to upgrade PMO Dashboard based on PRD requirements
- **Estimated Effort**: 8-10 development days (broken into incremental commits)

---

## Executive Summary

This plan outlines the implementation of PMO Dashboard enhancements per the PRD. The existing `/platform/dashboard` has basic features (Executive Summary, KPIs, charts, quick actions). We will **incrementally add** PMO-specific governance controls while maintaining strict role separation (PMO-only features).

**Key Deliverables:**
1. PMO Control Strip (intervention signals)
2. Programme Management (create, assign, roll-ups)
3. PM Capacity Control (max 2 active projects, hard-enforced)
4. Stage/Phase Gate Oversight
5. Risk & Exception Monitoring
6. Benefits Realisation with roll-ups
7. Enhanced KPIs with trend indicators
8. PMO-only Quick Actions
9. Comprehensive Audit Logging

---

## Current State Assessment

### ✅ What Exists
| Component | Status | Location |
|-----------|--------|----------|
| Platform Dashboard | ✅ Active | `/platform/dashboard` → `src/pages/platform-app/Dashboard.jsx` |
| Executive Summary | ✅ Implemented | `src/components/app/dashboard/ExecutiveSummary.jsx` |
| KPI Cards | ✅ Implemented | `src/components/app/dashboard/KPICards.jsx` |
| Quick Actions | ✅ Implemented | `src/components/app/dashboard/QuickActions.jsx` |
| Project Health Chart | ✅ Implemented | `src/components/app/dashboard/ProjectHealthChart.jsx` |
| Risk Heat Map | ✅ Implemented | `src/components/app/dashboard/RiskHeatMap.jsx` |
| Activity Feed | ✅ Implemented | `src/components/app/dashboard/ActivityFeed.jsx` |
| Dashboard Service | ✅ Implemented | `src/services/dashboardService.js` |
| Programme Tables | ✅ Created | `SQL/v37_programme_management.sql` |
| Projects Table | ✅ Created | `SQL/v04_project_core_tables.sql` |
| Role-Based Auth | ✅ Implemented | Uses RLS + permissions |

### ❌ What's Missing (Per PRD)
| Feature | Status | Priority |
|---------|--------|----------|
| PMO Control Strip | ❌ Not Implemented | **HIGH** |
| Programme Management UI | ❌ Not Implemented | **HIGH** |
| PM Capacity Control | ❌ Not Implemented | **HIGH** |
| Stage/Phase Gate Oversight | ❌ Not Implemented | **HIGH** |
| Exception Management | ❌ Not Implemented | **HIGH** |
| Benefits Roll-ups | ❌ Not Implemented | **MEDIUM** |
| Project Assignments (Exec/PM/Board) | ❌ Not Implemented | **HIGH** |
| Audit Logging for PMO actions | ❌ Not Implemented | **HIGH** |
| KPI Trend Indicators | ❌ Not Implemented | **MEDIUM** |
| PMO-specific Quick Actions | ⚠️ Partial | **HIGH** |

---

## Gap Analysis

### Database Schema Gaps

| Required Table | Exists? | Action Needed |
|----------------|---------|---------------|
| `programmes` | ✅ Yes | Add missing columns (rag_status, owner_user_id) |
| `programme_projects` | ✅ Yes | Verify structure, add indexes |
| `project_assignments` | ❌ No | **CREATE** - Store Executive/PM/Board assignments |
| `stage_gates` | ⚠️ Partial | Enhance with PMO oversight fields |
| `exceptions` | ❌ No | **CREATE** - Project exception tracking |
| `benefits` | ⚠️ Partial | Enhance with programme/portfolio roll-ups |
| `pmo_audit_log` | ❌ No | **CREATE** - PMO action audit trail |
| `pm_capacity_tracking` | ❌ No | **CREATE VIEW** - Real-time PM capacity calculation |

### Service Layer Gaps

| Required Service | Exists? | Action Needed |
|------------------|---------|---------------|
| `pmoAdminService.js` | ✅ Exists | Enhance with new PMO functions |
| `programmeService.js` | ❌ No | **CREATE** - Programme CRUD + roll-ups |
| `stageGateService.js` | ❌ No | **CREATE** - Stage gate management |
| `exceptionService.js` | ❌ No | **CREATE** - Exception raising/tracking |
| `pmCapacityService.js` | ❌ No | **CREATE** - PM capacity calculations |
| `auditService.js` | ❌ No | **CREATE** - Audit log recording |
| `benefitsService.js` | ✅ Exists | Enhance with roll-up calculations |

### UI Component Gaps

| Required Component | Exists? | Action Needed |
|--------------------|---------|---------------|
| PMO Control Strip | ❌ No | **CREATE** - High-visibility alert banner |
| Programme Management Panel | ❌ No | **CREATE** - Programme overview + drill-down |
| PM Capacity Widget | ❌ No | **CREATE** - PM capacity status table |
| Stage Gate Oversight Table | ❌ No | **CREATE** - Gate status + overdue alerts |
| Exception Management Panel | ❌ No | **CREATE** - Active exceptions list |
| Benefits Roll-up Dashboard | ❌ No | **CREATE** - Benefits tracking with roll-ups |
| PMO Quick Actions (Enhanced) | ⚠️ Partial | **ENHANCE** - Add PMO-specific actions |
| KPI Cards with Trends | ⚠️ Partial | **ENHANCE** - Add trend arrows/indicators |

---

## Implementation Strategy

### Principles
1. **Incremental delivery** - Each phase is independently committable
2. **Database-first** - Establish schema + RLS before UI
3. **Role separation** - PMO features strictly gated by `org.admin` permission
4. **Performance-first** - Use views/RPCs for aggregations
5. **Audit everything** - Every PMO action logged
6. **Test as we go** - Manual testing after each phase

### Phased Approach

```
Phase 1: Database Foundation (1 day)
├── Create missing tables (project_assignments, exceptions, pmo_audit_log)
├── Create views (pm_capacity_view, programme_rollup_view)
├── Add RLS policies
├── Create database functions (audit triggers, capacity checks)
└── Seed lookup data

Phase 2: Service Layer (1.5 days)
├── programmeService.js - Programme CRUD + roll-ups
├── stageGateService.js - Gate management
├── exceptionService.js - Exception raising/escalation
├── pmCapacityService.js - Capacity calculations
├── auditService.js - Audit logging wrapper
└── Enhance pmoAdminService.js

Phase 3: PMO Control Strip (1 day)
├── Create PMOControlStrip.jsx component
├── Implement 5 intervention signals
├── Add drill-down modals
└── Integrate into Platform Dashboard

Phase 4: Programme Management UI (1.5 days)
├── Create ProgrammeOverview.jsx component
├── Add programme creation modal
├── Implement programme roll-up display
└── Add project assignment to programmes

Phase 5: PM Capacity Control (1 day)
├── Create PMCapacityWidget.jsx component
├── Display PM capacity status
├── Add reassignment action
└── Enforce 2-project limit in UI + DB

Phase 6: Stage Gate & Exception Management (1.5 days)
├── Create StageGateOversight.jsx component
├── Create ExceptionManagement.jsx component
├── Add "Raise Exception" quick action
└── Add escalation workflows

Phase 7: Benefits Roll-ups & KPI Enhancements (1 day)
├── Create BenefitsRollup.jsx component
├── Enhance KPICards with trend indicators
├── Add project→programme→portfolio roll-ups
└── Add drill-down navigation

Phase 8: PMO Quick Actions Enhancement (0.5 days)
├── Enhance QuickActions.jsx with PMO-specific actions
├── Add role-based filtering
├── Wire audit logging
└── Add confirmation dialogs

Phase 9: Integration & Polish (1 day)
├── Wire all components into Platform Dashboard
├── Add role-based rendering
├── Performance optimization
├── Error handling
└── Loading states
```

---

## Detailed Implementation Plan

## Phase 1: Database Foundation

### 1.1 Create Migration File: `v145_pmo_dashboard_enhancements.sql`

#### Tables to Create

**1.1.1 `project_assignments` - Track Executive/PM/Board assignments**
```sql
CREATE TABLE project_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_type VARCHAR(50) NOT NULL, -- 'EXECUTIVE', 'PROJECT_MANAGER', 'BOARD_MEMBER'
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,

  CONSTRAINT uq_project_assignment UNIQUE (project_id, user_id, assignment_type, is_active)
);

CREATE INDEX idx_project_assignments_project ON project_assignments(project_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_project_assignments_user ON project_assignments(user_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_project_assignments_type ON project_assignments(assignment_type) WHERE is_deleted = FALSE;
```

**1.1.2 `exceptions` - Track project exceptions**
```sql
CREATE TABLE exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  exception_reason TEXT NOT NULL,
  exception_level VARCHAR(50) NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  exception_status VARCHAR(50) DEFAULT 'OPEN', -- 'OPEN', 'ESCALATED', 'RESOLVED', 'CLOSED'
  raised_by UUID REFERENCES users(id),
  raised_at TIMESTAMP DEFAULT NOW(),
  escalated_to UUID REFERENCES users(id),
  escalated_at TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_exceptions_project ON exceptions(project_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_exceptions_status ON exceptions(exception_status) WHERE is_deleted = FALSE;
CREATE INDEX idx_exceptions_raised_by ON exceptions(raised_by) WHERE is_deleted = FALSE;
```

**1.1.3 `pmo_audit_log` - Audit trail for PMO actions**
```sql
CREATE TABLE pmo_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- 'CREATE_PROJECT', 'ASSIGN_PM', 'RAISE_EXCEPTION', 'SUSPEND_PROJECT', etc.
  entity_type VARCHAR(50) NOT NULL, -- 'PROJECT', 'PROGRAMME', 'STAGE_GATE', 'EXCEPTION', etc.
  entity_id UUID NOT NULL,
  payload JSONB, -- Store action details
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pmo_audit_log_actor ON pmo_audit_log(actor_user_id);
CREATE INDEX idx_pmo_audit_log_action ON pmo_audit_log(action);
CREATE INDEX idx_pmo_audit_log_entity ON pmo_audit_log(entity_type, entity_id);
CREATE INDEX idx_pmo_audit_log_created ON pmo_audit_log(created_at DESC);
```

#### Views to Create

**1.1.4 `pm_capacity_view` - Real-time PM capacity**
```sql
CREATE OR REPLACE VIEW pm_capacity_view AS
SELECT
  u.id AS pm_user_id,
  u.full_name AS pm_name,
  COUNT(DISTINCT p.id) FILTER (WHERE ps.status_name IN ('Active', 'In Progress')) AS active_projects_count,
  COUNT(DISTINCT r.id) FILTER (WHERE r.risk_status IN ('Open', 'Active')) AS active_risks_count,
  CASE
    WHEN COUNT(DISTINCT p.id) FILTER (WHERE ps.status_name IN ('Active', 'In Progress')) > 2 THEN 'BREACH'
    WHEN COUNT(DISTINCT p.id) FILTER (WHERE ps.status_name IN ('Active', 'In Progress')) = 2 THEN 'AT_CAPACITY'
    ELSE 'AVAILABLE'
  END AS capacity_status,
  ARRAY_AGG(DISTINCT p.id) FILTER (WHERE ps.status_name IN ('Active', 'In Progress')) AS active_project_ids,
  ARRAY_AGG(DISTINCT p.project_name) FILTER (WHERE ps.status_name IN ('Active', 'In Progress')) AS active_project_names
FROM users u
LEFT JOIN project_assignments pa ON pa.user_id = u.id AND pa.assignment_type = 'PROJECT_MANAGER' AND pa.is_active = TRUE AND pa.is_deleted = FALSE
LEFT JOIN projects p ON p.id = pa.project_id AND p.is_deleted = FALSE
LEFT JOIN project_statuses ps ON ps.id = p.status_id
LEFT JOIN risks r ON r.project_id = p.id AND r.is_deleted = FALSE
WHERE u.is_deleted = FALSE
GROUP BY u.id, u.full_name;
```

**1.1.5 `programme_rollup_view` - Programme aggregations**
```sql
CREATE OR REPLACE VIEW programme_rollup_view AS
SELECT
  prog.id AS programme_id,
  prog.programme_name,
  prog.programme_status,
  COUNT(DISTINCT pp.project_id) AS total_projects,
  COUNT(DISTINCT pp.project_id) FILTER (WHERE ps.status_name = 'Active') AS active_projects,
  COUNT(DISTINCT pp.project_id) FILTER (WHERE ps.status_name = 'Completed') AS completed_projects,
  COUNT(DISTINCT pp.project_id) FILTER (WHERE ps.status_name = 'On Hold') AS onhold_projects,
  -- RAG Status Counts
  COUNT(DISTINCT pp.project_id) FILTER (WHERE p.health_status IN ('green', 'Green')) AS green_projects,
  COUNT(DISTINCT pp.project_id) FILTER (WHERE p.health_status IN ('amber', 'yellow', 'Amber', 'Yellow')) AS amber_projects,
  COUNT(DISTINCT pp.project_id) FILTER (WHERE p.health_status IN ('red', 'Red')) AS red_projects,
  -- Budget Roll-up
  SUM(p.budget_amount) AS total_budget,
  SUM(p.actual_cost) AS total_spent,
  -- Benefits Roll-up (from programme_benefits table)
  SUM(pb.planned_value) AS total_planned_benefits,
  SUM(pb.forecast_value) AS total_forecast_benefits,
  SUM(pb.realised_value) AS total_realised_benefits
FROM programmes prog
LEFT JOIN programme_projects pp ON pp.programme_id = prog.id
LEFT JOIN projects p ON p.id = pp.project_id AND p.is_deleted = FALSE
LEFT JOIN project_statuses ps ON ps.id = p.status_id
LEFT JOIN programme_benefits pb ON pb.programme_id = prog.id AND pb.is_deleted = FALSE
WHERE prog.is_deleted = FALSE
GROUP BY prog.id, prog.programme_name, prog.programme_status;
```

#### Database Functions

**1.1.6 Function: `check_pm_capacity()` - Enforce 2-project limit**
```sql
CREATE OR REPLACE FUNCTION check_pm_capacity()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  -- Only check if assigning a PROJECT_MANAGER to an active project
  IF NEW.assignment_type = 'PROJECT_MANAGER' AND NEW.is_active = TRUE THEN
    -- Count active projects for this PM
    SELECT COUNT(DISTINCT pa.project_id) INTO active_count
    FROM project_assignments pa
    JOIN projects p ON p.id = pa.project_id
    JOIN project_statuses ps ON ps.id = p.status_id
    WHERE pa.user_id = NEW.user_id
      AND pa.assignment_type = 'PROJECT_MANAGER'
      AND pa.is_active = TRUE
      AND pa.is_deleted = FALSE
      AND p.is_deleted = FALSE
      AND ps.status_name IN ('Active', 'In Progress');

    -- Enforce limit of 2 active projects
    IF active_count >= 2 THEN
      RAISE EXCEPTION 'PM Capacity Breach: User % already has % active projects. Maximum is 2.',
        NEW.user_id, active_count;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_pm_capacity
  BEFORE INSERT OR UPDATE ON project_assignments
  FOR EACH ROW
  EXECUTE FUNCTION check_pm_capacity();
```

**1.1.7 Function: `log_pmo_action()` - Auto-log PMO actions**
```sql
CREATE OR REPLACE FUNCTION log_pmo_action(
  p_actor_user_id UUID,
  p_action VARCHAR(100),
  p_entity_type VARCHAR(50),
  p_entity_id UUID,
  p_payload JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO pmo_audit_log (actor_user_id, action, entity_type, entity_id, payload)
  VALUES (p_actor_user_id, p_action, p_entity_type, p_entity_id, p_payload)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;
```

#### RLS Policies

**1.1.8 RLS for new tables**
```sql
-- project_assignments RLS
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow PMO admin full access to project_assignments"
ON project_assignments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND p.permission_code = 'org.admin'
      AND ur.is_active = TRUE
      AND rp.is_active = TRUE
  )
);

CREATE POLICY "Allow users to view their own project assignments"
ON project_assignments FOR SELECT
USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- exceptions RLS
ALTER TABLE exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow PMO admin full access to exceptions"
ON exceptions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND p.permission_code = 'org.admin'
      AND ur.is_active = TRUE
      AND rp.is_active = TRUE
  )
);

-- pmo_audit_log RLS
ALTER TABLE pmo_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow PMO admin to view audit log"
ON pmo_audit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND p.permission_code = 'org.admin'
      AND ur.is_active = TRUE
      AND rp.is_active = TRUE
  )
);
```

#### Enhancements to Existing Tables

**1.1.9 Add columns to `programmes` table**
```sql
-- Add RAG status if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='programmes' AND column_name='rag_status') THEN
    ALTER TABLE programmes ADD COLUMN rag_status VARCHAR(20) DEFAULT 'green';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='programmes' AND column_name='owner_user_id') THEN
    ALTER TABLE programmes ADD COLUMN owner_user_id UUID REFERENCES users(id);
  END IF;
END $$;
```

**1.1.10 Add columns to `stage_gates` table (if exists)**
```sql
-- Enhance stage_gates table with PMO oversight fields
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='stage_gates') THEN
    -- Add PMO oversight fields if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stage_gates' AND column_name='gate_status') THEN
      ALTER TABLE stage_gates ADD COLUMN gate_status VARCHAR(50) DEFAULT 'PENDING';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stage_gates' AND column_name='gate_owner_user_id') THEN
      ALTER TABLE stage_gates ADD COLUMN gate_owner_user_id UUID REFERENCES users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stage_gates' AND column_name='is_overdue') THEN
      ALTER TABLE stage_gates ADD COLUMN is_overdue BOOLEAN DEFAULT FALSE;
    END IF;
  END IF;
END $$;
```

### 1.2 Register Tables in `database_tables`
```sql
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('project_assignments', 'Tracks Executive, PM, and Board member assignments to projects', false, true),
  ('exceptions', 'Project exception tracking for PMO intervention', false, true),
  ('pmo_audit_log', 'Audit trail for all PMO governance actions', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();
```

---

## Phase 2: Service Layer

### 2.1 Create `programmeService.js`

**Location**: `src/services/programmeService.js`

**Functions**:
- `getAllProgrammes(accountId)` - Get all programmes for account
- `getProgrammeById(programmeId)` - Get single programme with roll-ups
- `createProgramme(programmeData)` - Create new programme (with audit log)
- `updateProgramme(programmeId, updates)` - Update programme
- `deleteProgramme(programmeId)` - Soft delete programme
- `assignProjectToProgramme(programmeId, projectId)` - Assign project
- `removeProjectFromProgramme(programmeId, projectId)` - Remove project
- `getProgrammeRollups(programmeId)` - Get aggregated metrics (from view)
- `getProgrammeProjects(programmeId)` - Get all projects in programme

### 2.2 Create `stageGateService.js`

**Location**: `src/services/stageGateService.js`

**Functions**:
- `getStageGates(accountId, filters)` - Get all stage gates with filters
- `getOverdueGates(accountId)` - Get overdue gates
- `createStageGate(gateData)` - Create gate
- `updateStageGate(gateId, updates)` - Update gate
- `approveStageGate(gateId, userId)` - PMO approve gate (with audit)
- `rejectStageGate(gateId, userId, reason)` - PMO reject gate (with audit)
- `flagOverdueGate(gateId, userId)` - Flag gate as overdue (with audit)
- `escalateGate(gateId, userId, escalationNotes)` - Escalate gate (with audit)

### 2.3 Create `exceptionService.js`

**Location**: `src/services/exceptionService.js`

**Functions**:
- `getAllExceptions(accountId, filters)` - Get all exceptions with filters
- `getExceptionById(exceptionId)` - Get single exception
- `raiseException(exceptionData)` - Raise new exception (with audit)
- `escalateException(exceptionId, escalationData)` - Escalate exception (with audit)
- `resolveException(exceptionId, resolutionData)` - Resolve exception (with audit)
- `closeException(exceptionId, userId)` - Close exception (with audit)
- `getProjectsInException(accountId)` - Get all projects with open exceptions

### 2.4 Create `pmCapacityService.js`

**Location**: `src/services/pmCapacityService.js`

**Functions**:
- `getPMCapacityStatus(accountId)` - Get capacity for all PMs (from view)
- `getPMCapacityByUserId(userId)` - Get capacity for specific PM
- `getPMsInBreach(accountId)` - Get PMs exceeding 2-project limit
- `reassignPM(projectId, oldPMId, newPMId, userId)` - Reassign PM (with capacity check + audit)
- `checkCapacityBeforeAssignment(userId, projectId)` - Validate capacity

### 2.5 Create `auditService.js`

**Location**: `src/services/auditService.js`

**Functions**:
- `logAction(actorUserId, action, entityType, entityId, payload)` - Log PMO action
- `getAuditLog(filters)` - Get audit log with filters
- `getActionsByUser(userId, limit)` - Get actions by user
- `getActionsByEntity(entityType, entityId)` - Get actions for entity

### 2.6 Enhance `benefitsService.js`

**Add functions**:
- `getBenefitsRollup(programmeId)` - Roll up benefits for programme
- `getPortfolioBenefitsRollup(portfolioId)` - Roll up benefits for portfolio
- `getBenefitsAtRisk(accountId)` - Get benefits at risk

### 2.7 Enhance `pmoAdminService.js`

**Add functions**:
- `assignExecutive(projectId, executiveUserId, userId)` - Assign Executive (with audit)
- `assignProjectManager(projectId, pmUserId, userId)` - Assign PM with capacity check (with audit)
- `assignBoardMember(projectId, boardMemberUserId, userId)` - Assign Board Member (with audit)
- `suspendProject(projectId, reason, userId)` - Suspend project (with audit)
- `getPMODashboardData(accountId)` - Get all PMO dashboard metrics in one call

---

## Phase 3: PMO Control Strip Component

### 3.1 Create `PMOControlStrip.jsx`

**Location**: `src/components/app/dashboard/PMOControlStrip.jsx`

**Structure**:
```jsx
PMOControlStrip
├── 5 Alert Tiles (clickable)
│   ├── Projects Requiring Attention (RAG ≠ Green)
│   ├── Projects in Exception
│   ├── Overdue Stage/Phase Gates
│   ├── PM Capacity Breaches
│   └── Orphan Projects (no programme/no board)
└── Drill-down Modal (on click)
    ├── Filtered project list
    ├── Action buttons
    └── Quick navigation
```

**Features**:
- High-visibility red/amber/green color coding
- Real-time counts
- Click to drill down into filtered lists
- Quick action buttons per signal type

### 3.2 Integrate into Platform Dashboard

**Modify**: `src/pages/platform-app/Dashboard.jsx`

Add PMO Control Strip at top (before Executive Summary) - visible only to PMO admins.

---

## Phase 4: Programme Management UI

### 4.1 Create `ProgrammeOverview.jsx`

**Location**: `src/components/app/dashboard/ProgrammeOverview.jsx`

**Features**:
- Grid of programme cards
- Programme RAG status visual
- Programme metrics (# projects, budget, benefits)
- "Create Programme" button
- Click to view programme details

### 4.2 Create `ProgrammeDetailModal.jsx`

**Location**: `src/components/app/dashboard/ProgrammeDetailModal.jsx`

**Features**:
- Programme info
- Roll-up metrics (from `programme_rollup_view`)
- List of assigned projects
- "Assign Project" action
- "Remove Project" action
- Benefits roll-up display

### 4.3 Create `CreateProgrammeModal.jsx`

**Location**: `src/components/app/dashboard/CreateProgrammeModal.jsx`

**Features**:
- Programme name, description
- Programme owner selection
- Programme manager selection
- Start/end dates
- Goals and success criteria

---

## Phase 5: PM Capacity Control

### 5.1 Create `PMCapacityWidget.jsx`

**Location**: `src/components/app/dashboard/PMCapacityWidget.jsx`

**Features**:
- Table of all PMs
- Active project count
- Capacity status (Available / At Capacity / BREACH)
- Visual indicators (🟢🟡🔴)
- "Reassign PM" button for breached PMs
- List of active projects per PM

### 5.2 Create `ReassignPMModal.jsx`

**Location**: `src/components/app/dashboard/ReassignPMModal.jsx`

**Features**:
- Select project to reassign
- Select new PM (with capacity check)
- Reason for reassignment
- Audit log entry on confirm

---

## Phase 6: Stage Gate & Exception Management

### 6.1 Create `StageGateOversight.jsx`

**Location**: `src/components/app/dashboard/StageGateOversight.jsx`

**Features**:
- Table of all upcoming/overdue gates
- Current stage, next gate date, approval status, gate owner
- Overdue flag (red highlight)
- "Flag Overdue" action
- "Escalate" action
- Filter by status (pending/approved/rejected/overdue)

### 6.2 Create `ExceptionManagement.jsx`

**Location**: `src/components/app/dashboard/ExceptionManagement.jsx`

**Features**:
- List of projects in exception
- Exception reason, level, status
- "Raise Exception" button (in Quick Actions)
- "Escalate Exception" action
- "Resolve Exception" action
- Visual indicators by level (low/medium/high/critical)

### 6.3 Create `RaiseExceptionModal.jsx`

**Location**: `src/components/app/dashboard/RaiseExceptionModal.jsx`

**Features**:
- Select project
- Exception reason (textarea)
- Exception level (dropdown)
- Submit (logs audit entry)

---

## Phase 7: Benefits Roll-ups & KPI Enhancements

### 7.1 Create `BenefitsRollup.jsx`

**Location**: `src/components/app/dashboard/BenefitsRollup.jsx`

**Features**:
- Three-tier roll-up display: Project → Programme → Portfolio
- Planned vs Forecast vs Realised benefits
- Benefits at risk indicator
- Drill-down by level
- Visual charts (bar chart or stacked area chart)

### 7.2 Enhance `KPICards.jsx`

**Modifications**: `src/components/app/dashboard/KPICards.jsx`

**Add**:
- Trend indicators (⬆️ Improving, ➡️ Stable, ⬇️ Deteriorating)
- Historical comparison (vs last month/quarter)
- Sparkline mini-charts
- Click to drill down into detail view

---

## Phase 8: PMO Quick Actions Enhancement

### 8.1 Enhance `QuickActions.jsx`

**Modifications**: `src/components/app/dashboard/QuickActions.jsx`

**Add PMO-specific actions**:
- Create Project
- Create Programme
- Assign Executive/PM
- Raise Exception
- Suspend Project
- Reassign PM
- Approve/Reject Stage Gate

**Role-based filtering**:
- Show PMO-only actions only to PMO admins
- Regular users see limited actions

---

## Phase 9: Integration & Polish

### 9.1 Wire All Components into Platform Dashboard

**Modify**: `src/pages/platform-app/Dashboard.jsx`

**Final Dashboard Structure**:
```jsx
Platform Dashboard (PMO View)
├── Header (with PMO Admin badge)
├── PMO Control Strip (Phase 3) ⭐ NEW
├── Executive Summary (Existing)
├── Quick Actions (Enhanced - Phase 8) ⭐ ENHANCED
├── Programme Overview (Phase 4) ⭐ NEW
├── PM Capacity Widget (Phase 5) ⭐ NEW
├── Stage Gate Oversight (Phase 6) ⭐ NEW
├── Exception Management (Phase 6) ⭐ NEW
├── Benefits Roll-up (Phase 7) ⭐ NEW
├── KPI Cards (Enhanced - Phase 7) ⭐ ENHANCED
├── Project Health Chart (Existing)
├── Budget Burn Rate (Existing)
├── Risk Heat Map (Existing)
├── Resource Allocation (Existing)
└── Activity Feed (Existing)
```

### 9.2 Role-Based Rendering

**Add conditional rendering**:
```jsx
{isOrgAdmin && (
  <>
    <PMOControlStrip organizationId={organizationId} />
    <ProgrammeOverview organizationId={organizationId} />
    <PMCapacityWidget organizationId={organizationId} />
    <StageGateOversight organizationId={organizationId} />
    <ExceptionManagement organizationId={organizationId} />
  </>
)}
```

### 9.3 Performance Optimization

- Use React.memo for expensive components
- Implement data caching (React Query or SWR)
- Lazy load drill-down modals
- Use database views for aggregations
- Batch API calls where possible
- Add loading skeletons

### 9.4 Error Handling

- Add error boundaries for each major section
- Graceful degradation if services fail
- Toast notifications for user actions
- Retry logic for failed API calls

### 9.5 Testing Checklist

- [ ] PMO Control Strip displays correct counts
- [ ] Programme creation works end-to-end
- [ ] PM capacity enforcement works (2-project limit)
- [ ] Stage gate approval logs audit entry
- [ ] Exception raising logs audit entry
- [ ] Benefits roll-up calculations are correct
- [ ] KPI trend indicators show correctly
- [ ] Role-based access control works (PMO-only features hidden from non-PMO)
- [ ] All modals open/close correctly
- [ ] All drill-downs navigate correctly
- [ ] Performance: Dashboard loads in < 2s
- [ ] Mobile responsiveness (PWA)

---

## Technical Implementation Details

### API Structure

**Base URL**: Uses Supabase RPC functions where appropriate

**Example Service Call**:
```javascript
// programmeService.js
export async function getProgrammeRollups(programmeId) {
  try {
    const { data, error } = await platformDb
      .from('programme_rollup_view')
      .select('*')
      .eq('programme_id', programmeId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error getting programme rollups:', error);
    return { success: false, error: error.message };
  }
}
```

### Audit Logging Pattern

**Every PMO action must log**:
```javascript
import { logAction } from '../services/auditService';

// Example: After assigning PM
await assignProjectManager(projectId, pmUserId, currentUserId);
await logAction(currentUserId, 'ASSIGN_PM', 'PROJECT', projectId, {
  pm_user_id: pmUserId,
  project_id: projectId
});
```

### Component Pattern

**Use consistent structure**:
```jsx
import { useState, useEffect } from 'react';
import { platformDb } from '../../services/supabase/supabaseClient';
import { serviceName } from '../../services/serviceName';

export default function ComponentName({ organizationId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [organizationId]);

  const loadData = async () => {
    setLoading(true);
    const result = await serviceName.getData(organizationId);
    if (result.success) {
      setData(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      {/* Component content */}
    </div>
  );
}
```

---

## Acceptance Criteria

### Functional Requirements

- [ ] **PMO Control Strip**
  - [ ] Displays 5 intervention signals with correct counts
  - [ ] Signals are clickable and drill down to filtered lists
  - [ ] Updates in real-time (or on refresh)

- [ ] **Programme Management**
  - [ ] PMO can create programmes
  - [ ] PMO can assign projects to programmes
  - [ ] Programme roll-ups show correct aggregated metrics
  - [ ] Programme dashboard displays RAG status, budget, benefits

- [ ] **PM Capacity Control**
  - [ ] System enforces max 2 active projects per PM (database trigger)
  - [ ] Dashboard displays PM capacity status
  - [ ] PMO can reassign PM from one project to another
  - [ ] Capacity widget shows visual indicators (green/amber/red)

- [ ] **Stage Gate Oversight**
  - [ ] Dashboard shows all upcoming and overdue gates
  - [ ] PMO can flag overdue gates
  - [ ] PMO can escalate gates
  - [ ] PMO can approve/reject gates (recorded in audit log)

- [ ] **Exception Management**
  - [ ] PMO can raise exceptions against projects
  - [ ] Exceptions display with level and status
  - [ ] PMO can escalate exceptions
  - [ ] PMO can resolve exceptions
  - [ ] Projects in exception are flagged in Control Strip

- [ ] **Benefits Realisation**
  - [ ] Benefits roll up from Project → Programme → Portfolio
  - [ ] Dashboard shows Planned/Forecast/Realised benefits
  - [ ] Benefits at risk are highlighted
  - [ ] Drill-down navigation works

- [ ] **KPI Enhancements**
  - [ ] KPIs show trend indicators (improving/stable/deteriorating)
  - [ ] Historical comparison data displayed
  - [ ] Sparkline charts render correctly

- [ ] **Audit Logging**
  - [ ] All PMO actions are logged to `pmo_audit_log`
  - [ ] Audit log includes actor, action, entity, timestamp
  - [ ] Audit log is queryable by PMO admins

### Non-Functional Requirements

- [ ] **Performance**
  - [ ] Dashboard loads in < 2 seconds
  - [ ] No N+1 query issues
  - [ ] Database views used for aggregations

- [ ] **Security**
  - [ ] PMO-only features gated by `org.admin` permission
  - [ ] RLS policies enforce data access control
  - [ ] No PMO controls visible to non-PMO users
  - [ ] Audit log is read-only (no updates/deletes)

- [ ] **UX**
  - [ ] Dark theme consistent throughout
  - [ ] Responsive layout (desktop + mobile PWA)
  - [ ] Loading states for all async operations
  - [ ] Error messages are user-friendly
  - [ ] Success confirmations for all actions

- [ ] **Code Quality**
  - [ ] Services follow consistent patterns
  - [ ] Components use React.memo where appropriate
  - [ ] No console errors or warnings
  - [ ] Code is well-commented
  - [ ] No hardcoded values (use constants/config)

---

## Todo List

### Phase 1: Database Foundation
- [ ] Create `v145_pmo_dashboard_enhancements.sql` migration file
- [ ] Create `project_assignments` table
- [ ] Create `exceptions` table
- [ ] Create `pmo_audit_log` table
- [ ] Create `pm_capacity_view` view
- [ ] Create `programme_rollup_view` view
- [ ] Create `check_pm_capacity()` function
- [ ] Create `log_pmo_action()` function
- [ ] Add RLS policies for new tables
- [ ] Enhance `programmes` table with missing columns
- [ ] Enhance `stage_gates` table (if exists)
- [ ] Register tables in `database_tables`
- [ ] Test migration on dev database
- [ ] Commit Phase 1

### Phase 2: Service Layer
- [ ] Create `src/services/programmeService.js`
  - [ ] `getAllProgrammes()`
  - [ ] `getProgrammeById()`
  - [ ] `createProgramme()`
  - [ ] `updateProgramme()`
  - [ ] `deleteProgramme()`
  - [ ] `assignProjectToProgramme()`
  - [ ] `removeProjectFromProgramme()`
  - [ ] `getProgrammeRollups()`
  - [ ] `getProgrammeProjects()`
- [ ] Create `src/services/stageGateService.js`
  - [ ] `getStageGates()`
  - [ ] `getOverdueGates()`
  - [ ] `createStageGate()`
  - [ ] `updateStageGate()`
  - [ ] `approveStageGate()`
  - [ ] `rejectStageGate()`
  - [ ] `flagOverdueGate()`
  - [ ] `escalateGate()`
- [ ] Create `src/services/exceptionService.js`
  - [ ] `getAllExceptions()`
  - [ ] `getExceptionById()`
  - [ ] `raiseException()`
  - [ ] `escalateException()`
  - [ ] `resolveException()`
  - [ ] `closeException()`
  - [ ] `getProjectsInException()`
- [ ] Create `src/services/pmCapacityService.js`
  - [ ] `getPMCapacityStatus()`
  - [ ] `getPMCapacityByUserId()`
  - [ ] `getPMsInBreach()`
  - [ ] `reassignPM()`
  - [ ] `checkCapacityBeforeAssignment()`
- [ ] Create `src/services/auditService.js`
  - [ ] `logAction()`
  - [ ] `getAuditLog()`
  - [ ] `getActionsByUser()`
  - [ ] `getActionsByEntity()`
- [ ] Enhance `src/services/benefitsService.js`
  - [ ] `getBenefitsRollup()`
  - [ ] `getPortfolioBenefitsRollup()`
  - [ ] `getBenefitsAtRisk()`
- [ ] Enhance `src/services/pmoAdminService.js`
  - [ ] `assignExecutive()`
  - [ ] `assignProjectManager()`
  - [ ] `assignBoardMember()`
  - [ ] `suspendProject()`
  - [ ] `getPMODashboardData()`
- [ ] Test all service functions
- [ ] Commit Phase 2

### Phase 3: PMO Control Strip
- [ ] Create `src/components/app/dashboard/PMOControlStrip.jsx`
- [ ] Implement 5 alert tiles
- [ ] Add drill-down modal component
- [ ] Add click handlers and navigation
- [ ] Style with dark theme
- [ ] Test real-time data updates
- [ ] Integrate into Platform Dashboard
- [ ] Commit Phase 3

### Phase 4: Programme Management UI
- [ ] Create `src/components/app/dashboard/ProgrammeOverview.jsx`
- [ ] Create `src/components/app/dashboard/ProgrammeDetailModal.jsx`
- [ ] Create `src/components/app/dashboard/CreateProgrammeModal.jsx`
- [ ] Wire programme creation flow
- [ ] Wire project assignment flow
- [ ] Test programme roll-ups display
- [ ] Commit Phase 4

### Phase 5: PM Capacity Control
- [ ] Create `src/components/app/dashboard/PMCapacityWidget.jsx`
- [ ] Create `src/components/app/dashboard/ReassignPMModal.jsx`
- [ ] Wire capacity status display
- [ ] Wire PM reassignment flow
- [ ] Test 2-project limit enforcement
- [ ] Test audit logging for reassignments
- [ ] Commit Phase 5

### Phase 6: Stage Gate & Exception Management
- [ ] Create `src/components/app/dashboard/StageGateOversight.jsx`
- [ ] Create `src/components/app/dashboard/ExceptionManagement.jsx`
- [ ] Create `src/components/app/dashboard/RaiseExceptionModal.jsx`
- [ ] Wire stage gate approval flow
- [ ] Wire exception raising flow
- [ ] Test escalation workflows
- [ ] Test audit logging
- [ ] Commit Phase 6

### Phase 7: Benefits Roll-ups & KPI Enhancements
- [ ] Create `src/components/app/dashboard/BenefitsRollup.jsx`
- [ ] Enhance `src/components/app/dashboard/KPICards.jsx` with trends
- [ ] Add sparkline charts
- [ ] Test roll-up calculations
- [ ] Test trend indicators
- [ ] Commit Phase 7

### Phase 8: PMO Quick Actions Enhancement
- [ ] Enhance `src/components/app/dashboard/QuickActions.jsx`
- [ ] Add PMO-specific actions
- [ ] Add role-based filtering
- [ ] Wire all action modals
- [ ] Test audit logging for actions
- [ ] Commit Phase 8

### Phase 9: Integration & Polish
- [ ] Wire all components into Platform Dashboard
- [ ] Add role-based rendering logic
- [ ] Implement performance optimizations (React.memo, caching)
- [ ] Add error boundaries
- [ ] Add loading skeletons
- [ ] Test complete PMO workflow end-to-end
- [ ] Test performance (< 2s load time)
- [ ] Test mobile responsiveness
- [ ] Run full acceptance criteria checklist
- [ ] Write user documentation
- [ ] Commit Phase 9
- [ ] Create pull request

---

## Documentation Requirements

### 1. User Guide: `PMO_Dashboard_User_Guide.md`
- Overview of PMO Dashboard
- PMO Control Strip usage
- Programme Management workflows
- PM Capacity Management
- Stage Gate oversight
- Exception handling
- Benefits tracking

### 2. Technical Documentation: `PMO_Dashboard_Technical_Guide.md`
- Database schema changes
- Service layer architecture
- Component structure
- API endpoints
- RLS policies
- Audit logging

### 3. Deployment Checklist: `PMO_Dashboard_Deployment.md`
- Database migration steps
- Environment variables
- Testing procedures
- Rollback procedures

---

## Review Section

### Post-Implementation Summary
*(To be completed after implementation)*

**Changes Made**:
- [ ] Database tables created: `project_assignments`, `exceptions`, `pmo_audit_log`
- [ ] Database views created: `pm_capacity_view`, `programme_rollup_view`
- [ ] Services created: 5 new services, 2 enhanced services
- [ ] Components created: 10+ new dashboard components
- [ ] RLS policies: 15+ new policies
- [ ] Audit logging: Integrated across all PMO actions

**Challenges Encountered**:
*(To be filled during implementation)*

**Performance Metrics**:
- Dashboard load time: ___ seconds
- Database query performance: ___ ms avg
- User feedback: ___

**Future Enhancements**:
1. AI-driven risk prediction
2. Executive Dashboard (separate)
3. Project Manager Dashboard (separate)
4. Real-time notifications
5. Advanced analytics

---

## End of Plan

**Plan Status**: ✅ Ready for Approval
**Next Step**: Await user approval before starting Phase 1

