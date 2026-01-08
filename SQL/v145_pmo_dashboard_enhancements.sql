-- ================================================
-- File: v145_pmo_dashboard_enhancements.sql
-- Description: PMO Dashboard Enhancement tables, views, and functions
-- Version: 1.0
-- Date: 2026-01-08
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v04_project_core_tables.sql must be run first (projects table)
-- - v37_programme_management.sql must be run first (programmes table)
-- - v03_user_access_tables.sql must be run first (users table)

-- Purpose:
-- Implements PMO Dashboard features per PRD:
-- 1. Project assignments (Executive/PM/Board tracking)
-- 2. Exception management
-- 3. PMO audit logging
-- 4. PM capacity view (real-time capacity tracking)
-- 5. Programme rollup view (aggregated metrics)
-- 6. Database functions for capacity enforcement and audit logging
-- 7. RLS policies for security
-- 8. Enhancements to existing tables

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- SECTION 1: CREATE NEW TABLES
-- ================================================

-- ================================================
-- TABLE 1: project_assignments
-- Description: Tracks Executive, PM, and Board member assignments to projects
-- Category: project
-- ================================================

CREATE TABLE IF NOT EXISTS project_assignments (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign Keys
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Assignment Information
    assignment_type VARCHAR(50) NOT NULL, -- 'EXECUTIVE', 'PROJECT_MANAGER', 'BOARD_MEMBER'
    assignment_role_description TEXT, -- Optional detailed role description

    -- Assignment Dates
    assigned_at TIMESTAMP DEFAULT NOW(),
    assignment_start_date DATE,
    assignment_end_date DATE,

    -- Assignment Status
    is_active BOOLEAN DEFAULT TRUE,
    is_primary BOOLEAN DEFAULT FALSE, -- For cases where there might be primary/secondary PMs

    -- Audit Fields
    assigned_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT chk_assignment_type CHECK (assignment_type IN ('EXECUTIVE', 'PROJECT_MANAGER', 'BOARD_MEMBER')),
    CONSTRAINT uq_project_assignment UNIQUE (project_id, user_id, assignment_type)
);

-- Indexes
CREATE INDEX idx_project_assignments_project ON project_assignments(project_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_project_assignments_user ON project_assignments(user_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_project_assignments_type ON project_assignments(assignment_type) WHERE is_deleted = FALSE;
CREATE INDEX idx_project_assignments_active ON project_assignments(is_active) WHERE is_deleted = FALSE AND is_active = TRUE;
CREATE INDEX idx_project_assignments_pm ON project_assignments(user_id, assignment_type) WHERE assignment_type = 'PROJECT_MANAGER' AND is_deleted = FALSE AND is_active = TRUE;

-- Comments
COMMENT ON TABLE project_assignments IS 'Tracks Executive, Project Manager, and Board member assignments to projects for PMO governance';
COMMENT ON COLUMN project_assignments.assignment_type IS 'Type of assignment: EXECUTIVE (project sponsor), PROJECT_MANAGER (PM), or BOARD_MEMBER (governance board)';
COMMENT ON COLUMN project_assignments.is_primary IS 'Indicates if this is the primary assignment (useful for multiple PMs on large projects)';

-- ================================================
-- TABLE 2: exceptions
-- Description: Project exception tracking for PMO intervention
-- Category: project
-- ================================================

CREATE TABLE IF NOT EXISTS exceptions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign Keys
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Exception Information
    exception_title VARCHAR(255) NOT NULL,
    exception_reason TEXT NOT NULL,
    exception_description TEXT,
    exception_level VARCHAR(50) NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    exception_category VARCHAR(100), -- 'SCHEDULE', 'BUDGET', 'SCOPE', 'QUALITY', 'RISK', 'RESOURCE', 'OTHER'

    -- Exception Status
    exception_status VARCHAR(50) DEFAULT 'OPEN', -- 'OPEN', 'ESCALATED', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'

    -- Exception Lifecycle
    raised_by UUID REFERENCES users(id),
    raised_at TIMESTAMP DEFAULT NOW(),
    escalated_to UUID REFERENCES users(id),
    escalated_at TIMESTAMP,
    escalation_notes TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    closed_by UUID REFERENCES users(id),
    closed_at TIMESTAMP,

    -- Impact Assessment
    impact_on_schedule BOOLEAN DEFAULT FALSE,
    impact_on_budget BOOLEAN DEFAULT FALSE,
    impact_on_scope BOOLEAN DEFAULT FALSE,
    impact_on_quality BOOLEAN DEFAULT FALSE,
    estimated_delay_days INTEGER,
    estimated_cost_impact DECIMAL(15,2),

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT chk_exception_level CHECK (exception_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT chk_exception_status CHECK (exception_status IN ('OPEN', 'ESCALATED', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED')),
    CONSTRAINT chk_exception_category CHECK (exception_category IN ('SCHEDULE', 'BUDGET', 'SCOPE', 'QUALITY', 'RISK', 'RESOURCE', 'STAKEHOLDER', 'OTHER'))
);

-- Indexes
CREATE INDEX idx_exceptions_project ON exceptions(project_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_exceptions_status ON exceptions(exception_status) WHERE is_deleted = FALSE;
CREATE INDEX idx_exceptions_level ON exceptions(exception_level) WHERE is_deleted = FALSE;
CREATE INDEX idx_exceptions_raised_by ON exceptions(raised_by) WHERE is_deleted = FALSE;
CREATE INDEX idx_exceptions_open ON exceptions(exception_status) WHERE exception_status IN ('OPEN', 'ESCALATED', 'UNDER_REVIEW') AND is_deleted = FALSE;

-- Comments
COMMENT ON TABLE exceptions IS 'Tracks project exceptions for PMO intervention and escalation';
COMMENT ON COLUMN exceptions.exception_level IS 'Severity level: LOW (minor issue), MEDIUM (notable concern), HIGH (significant problem), CRITICAL (project-threatening)';
COMMENT ON COLUMN exceptions.exception_status IS 'Exception lifecycle: OPEN (newly raised), ESCALATED (escalated to governance), UNDER_REVIEW (being investigated), RESOLVED (solution implemented), CLOSED (completed)';
COMMENT ON COLUMN exceptions.exception_category IS 'Type of exception: SCHEDULE (timeline issues), BUDGET (cost overruns), SCOPE (scope creep), QUALITY (deliverable issues), RISK (unmitigated risks), RESOURCE (staffing issues), STAKEHOLDER (stakeholder conflicts), OTHER';

-- ================================================
-- TABLE 3: pmo_audit_log
-- Description: Comprehensive audit trail for all PMO governance actions
-- Category: audit
-- ================================================

CREATE TABLE IF NOT EXISTS pmo_audit_log (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Actor Information
    actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_name VARCHAR(255), -- Cached for reporting
    actor_email VARCHAR(255), -- Cached for reporting

    -- Action Information
    action VARCHAR(100) NOT NULL, -- e.g., 'CREATE_PROJECT', 'ASSIGN_PM', 'RAISE_EXCEPTION', 'SUSPEND_PROJECT', 'APPROVE_GATE'
    action_description TEXT, -- Human-readable description
    action_category VARCHAR(50), -- 'PROJECT', 'PROGRAMME', 'RESOURCE', 'GOVERNANCE', 'EXCEPTION', 'STAGE_GATE', 'ASSIGNMENT'

    -- Entity Information
    entity_type VARCHAR(50) NOT NULL, -- 'PROJECT', 'PROGRAMME', 'STAGE_GATE', 'EXCEPTION', 'ASSIGNMENT', 'BENEFIT'
    entity_id UUID NOT NULL, -- ID of the affected entity
    entity_name VARCHAR(255), -- Cached entity name for reporting

    -- Additional Context
    payload JSONB, -- Store full action details (before/after values, etc.)
    ip_address VARCHAR(45), -- Optional IP tracking
    user_agent TEXT, -- Optional user agent tracking

    -- Audit Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pmo_audit_log_actor ON pmo_audit_log(actor_user_id);
CREATE INDEX idx_pmo_audit_log_action ON pmo_audit_log(action);
CREATE INDEX idx_pmo_audit_log_action_category ON pmo_audit_log(action_category);
CREATE INDEX idx_pmo_audit_log_entity ON pmo_audit_log(entity_type, entity_id);
CREATE INDEX idx_pmo_audit_log_created ON pmo_audit_log(created_at DESC);
CREATE INDEX idx_pmo_audit_log_payload_gin ON pmo_audit_log USING GIN(payload); -- For JSONB queries

-- Comments
COMMENT ON TABLE pmo_audit_log IS 'Comprehensive audit trail for all PMO governance actions - provides full traceability for compliance and oversight';
COMMENT ON COLUMN pmo_audit_log.action IS 'Action performed (e.g., CREATE_PROJECT, ASSIGN_PM, RAISE_EXCEPTION, SUSPEND_PROJECT, APPROVE_GATE, REASSIGN_PM)';
COMMENT ON COLUMN pmo_audit_log.payload IS 'JSONB field containing full action context including before/after values, reason for action, additional metadata';

-- ================================================
-- SECTION 2: ENHANCE EXISTING TABLES
-- ================================================

-- Add columns to programmes table if they don't exist
DO $$
BEGIN
  -- Add rag_status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='programmes' AND column_name='rag_status') THEN
    ALTER TABLE programmes ADD COLUMN rag_status VARCHAR(20) DEFAULT 'green';
    COMMENT ON COLUMN programmes.rag_status IS 'Programme RAG (Red/Amber/Green) health status';
  END IF;

  -- Add owner_user_id if not present (might already exist from v37)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='programmes' AND column_name='owner_user_id') THEN
    ALTER TABLE programmes ADD COLUMN owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    COMMENT ON COLUMN programmes.owner_user_id IS 'Programme Owner (senior responsible owner)';
  END IF;

  -- Add is_orphan flag for programmes without portfolio
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='programmes' AND column_name='is_orphan') THEN
    ALTER TABLE programmes ADD COLUMN is_orphan BOOLEAN GENERATED ALWAYS AS (portfolio_id IS NULL) STORED;
    COMMENT ON COLUMN programmes.is_orphan IS 'Auto-calculated: TRUE if programme is not assigned to any portfolio';
  END IF;
END $$;

-- Enhance projects table with governance flags
DO $$
BEGIN
  -- Add is_orphan flag for projects not in any programme
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='is_orphan') THEN
    ALTER TABLE projects ADD COLUMN is_orphan BOOLEAN DEFAULT TRUE;
    COMMENT ON COLUMN projects.is_orphan IS 'TRUE if project is not assigned to any programme (updated via trigger)';
  END IF;

  -- Add has_executive, has_pm, has_board flags
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='has_executive') THEN
    ALTER TABLE projects ADD COLUMN has_executive BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN projects.has_executive IS 'TRUE if project has an Executive assigned (updated via trigger)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='has_pm') THEN
    ALTER TABLE projects ADD COLUMN has_pm BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN projects.has_pm IS 'TRUE if project has a Project Manager assigned (updated via trigger)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='has_board') THEN
    ALTER TABLE projects ADD COLUMN has_board BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN projects.has_board IS 'TRUE if project has at least one Board Member assigned (updated via trigger)';
  END IF;
END $$;

-- Enhance stage_boundaries table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='stage_boundaries') THEN
    -- Add is_overdue if not exists (regular column, updated via trigger)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stage_boundaries' AND column_name='is_overdue') THEN
      ALTER TABLE stage_boundaries ADD COLUMN is_overdue BOOLEAN DEFAULT FALSE;
      COMMENT ON COLUMN stage_boundaries.is_overdue IS 'TRUE if gate is past due date and not approved (updated via trigger)';
    END IF;

    -- Add gate_owner_user_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stage_boundaries' AND column_name='gate_owner_user_id') THEN
      ALTER TABLE stage_boundaries ADD COLUMN gate_owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
      COMMENT ON COLUMN stage_boundaries.gate_owner_user_id IS 'User responsible for gate approval';
    END IF;
  END IF;
END $$;

-- Create function to update is_overdue (must be outside DO block)
CREATE OR REPLACE FUNCTION update_stage_boundary_overdue()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_overdue := (
    NEW.planned_date IS NOT NULL 
    AND NEW.planned_date < CURRENT_DATE 
    AND NEW.status NOT IN ('approved', 'rejected')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger and initialize data (back in DO block)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='stage_boundaries') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stage_boundaries' AND column_name='is_overdue') THEN
      -- Create trigger to update is_overdue
      DROP TRIGGER IF EXISTS trg_update_stage_boundary_overdue ON stage_boundaries;
      CREATE TRIGGER trg_update_stage_boundary_overdue
        BEFORE INSERT OR UPDATE OF planned_date, status ON stage_boundaries
        FOR EACH ROW
        EXECUTE FUNCTION update_stage_boundary_overdue();
      
      -- Initialize is_overdue for existing records
      UPDATE stage_boundaries
      SET is_overdue = (
        planned_date IS NOT NULL 
        AND planned_date < CURRENT_DATE 
        AND status NOT IN ('approved', 'rejected')
      )
      WHERE is_deleted = FALSE;
    END IF;

    -- Add gate_owner_user_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stage_boundaries' AND column_name='gate_owner_user_id') THEN
      ALTER TABLE stage_boundaries ADD COLUMN gate_owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
      COMMENT ON COLUMN stage_boundaries.gate_owner_user_id IS 'User responsible for gate approval';
    END IF;
  END IF;
END $$;

-- ================================================
-- SECTION 3: CREATE VIEWS
-- ================================================

-- ================================================
-- VIEW 1: pm_capacity_view
-- Description: Real-time PM capacity tracking
-- ================================================

CREATE OR REPLACE VIEW pm_capacity_view AS
SELECT
  u.id AS pm_user_id,
  u.full_name AS pm_name,
  u.email AS pm_email,
  COUNT(DISTINCT p.id) FILTER (WHERE ps.status_name IN ('Active', 'In Progress', 'active', 'in progress', 'in_progress')) AS active_projects_count,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status IN ('identified', 'assessed', 'mitigated', 'monitored')) AS active_risks_count,
  COUNT(DISTINCT CASE WHEN r.status IN ('identified', 'assessed', 'mitigated', 'monitored') AND (r.probability >= 4 OR r.impact >= 4) THEN r.id END) AS high_risk_count,
  CASE
    WHEN COUNT(DISTINCT p.id) FILTER (WHERE ps.status_name IN ('Active', 'In Progress', 'active', 'in progress', 'in_progress')) > 2 THEN 'BREACH'
    WHEN COUNT(DISTINCT p.id) FILTER (WHERE ps.status_name IN ('Active', 'In Progress', 'active', 'in progress', 'in_progress')) = 2 THEN 'AT_CAPACITY'
    WHEN COUNT(DISTINCT p.id) FILTER (WHERE ps.status_name IN ('Active', 'In Progress', 'active', 'in progress', 'in_progress')) = 1 THEN 'AVAILABLE'
    ELSE 'FREE'
  END AS capacity_status,
  ARRAY_AGG(DISTINCT p.id) FILTER (WHERE ps.status_name IN ('Active', 'In Progress', 'active', 'in progress', 'in_progress')) AS active_project_ids,
  ARRAY_AGG(DISTINCT p.project_name) FILTER (WHERE ps.status_name IN ('Active', 'In Progress', 'active', 'in progress', 'in_progress')) AS active_project_names,
  u.is_active AS pm_is_active,
  u.is_deleted AS pm_is_deleted
FROM users u
LEFT JOIN project_assignments pa ON pa.user_id = u.id AND pa.assignment_type = 'PROJECT_MANAGER' AND pa.is_active = TRUE AND pa.is_deleted = FALSE
LEFT JOIN projects p ON p.id = pa.project_id AND p.is_deleted = FALSE
LEFT JOIN project_statuses ps ON ps.id = p.status_id
LEFT JOIN risks r ON r.project_id = p.id AND r.is_deleted = FALSE
WHERE u.is_deleted = FALSE
GROUP BY u.id, u.full_name, u.email, u.is_active, u.is_deleted;

COMMENT ON VIEW pm_capacity_view IS 'Real-time Project Manager capacity tracking - shows active project count and capacity status for PMO oversight';

-- ================================================
-- VIEW 2: programme_rollup_view
-- Description: Programme aggregated metrics
-- ================================================

CREATE OR REPLACE VIEW programme_rollup_view AS
SELECT
  prog.id AS programme_id,
  prog.programme_name,
  prog.programme_code,
  prog.programme_status,
  prog.rag_status AS programme_rag_status,
  prog.owner_user_id AS programme_owner_id,
  owner.full_name AS programme_owner_name,
  prog.programme_manager_user_id,
  manager.full_name AS programme_manager_name,
  prog.portfolio_id,

  -- Project Counts
  COUNT(DISTINCT pp.project_id) AS total_projects,
  COUNT(DISTINCT pp.project_id) FILTER (WHERE ps.status_name IN ('Active', 'In Progress', 'active', 'in progress')) AS active_projects,
  COUNT(DISTINCT pp.project_id) FILTER (WHERE ps.status_name IN ('Completed', 'completed', 'Done', 'done')) AS completed_projects,
  COUNT(DISTINCT pp.project_id) FILTER (WHERE ps.status_name IN ('On Hold', 'on hold', 'Paused', 'paused')) AS onhold_projects,
  COUNT(DISTINCT pp.project_id) FILTER (WHERE ps.status_name IN ('Planned', 'planned', 'Not Started', 'not started')) AS planned_projects,

  -- RAG Status Counts
  COUNT(DISTINCT pp.project_id) FILTER (WHERE p.health_status IN ('green', 'Green')) AS green_projects,
  COUNT(DISTINCT pp.project_id) FILTER (WHERE p.health_status IN ('amber', 'yellow', 'Amber', 'Yellow')) AS amber_projects,
  COUNT(DISTINCT pp.project_id) FILTER (WHERE p.health_status IN ('red', 'Red')) AS red_projects,

  -- Budget Roll-up
  COALESCE(SUM(p.budget_amount), 0) AS total_budget,
  COALESCE(SUM(p.actual_cost), 0) AS total_spent,
  CASE
    WHEN SUM(p.budget_amount) > 0 THEN ROUND((SUM(p.actual_cost) / SUM(p.budget_amount) * 100)::numeric, 2)
    ELSE 0
  END AS budget_utilization_percentage,

  -- Progress Roll-up
  CASE
    WHEN COUNT(DISTINCT pp.project_id) > 0 THEN ROUND(AVG(p.percentage_complete)::numeric, 2)
    ELSE 0
  END AS average_progress_percentage,

  -- Benefits Roll-up (from programme_benefits table if exists)
  COALESCE(SUM(pb.target_value), 0) AS total_planned_benefits,
  COALESCE(SUM(pb.current_value), 0) AS total_forecast_benefits,
  COALESCE(SUM(pb.realized_value), 0) AS total_realised_benefits,

  -- Risk Counts
  COUNT(DISTINCT r.id) FILTER (WHERE r.status IN ('identified', 'assessed', 'mitigated', 'monitored')) AS active_risks_count,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status IN ('identified', 'assessed', 'mitigated', 'monitored') AND (r.probability >= 4 OR r.impact >= 4)) AS high_risks_count,

  -- Exception Counts
  COUNT(DISTINCT e.id) FILTER (WHERE e.exception_status IN ('OPEN', 'ESCALATED', 'UNDER_REVIEW')) AS active_exceptions_count,

  -- Programme Metadata
  prog.programme_start_date,
  prog.programme_end_date,
  prog.is_deleted AS programme_is_deleted

FROM programmes prog
LEFT JOIN users owner ON owner.id = prog.owner_user_id
LEFT JOIN users manager ON manager.id = prog.programme_manager_user_id
LEFT JOIN programme_projects pp ON pp.programme_id = prog.id
LEFT JOIN projects p ON p.id = pp.project_id AND p.is_deleted = FALSE
LEFT JOIN project_statuses ps ON ps.id = p.status_id
LEFT JOIN programme_benefits pb ON pb.programme_id = prog.id AND pb.is_deleted = FALSE
LEFT JOIN risks r ON r.project_id = p.id AND r.is_deleted = FALSE
LEFT JOIN exceptions e ON e.project_id = p.id AND e.is_deleted = FALSE
WHERE prog.is_deleted = FALSE
GROUP BY
  prog.id, prog.programme_name, prog.programme_code, prog.programme_status, prog.rag_status,
  prog.owner_user_id, owner.full_name, prog.programme_manager_user_id, manager.full_name,
  prog.portfolio_id, prog.programme_start_date, prog.programme_end_date, prog.is_deleted;

COMMENT ON VIEW programme_rollup_view IS 'Programme aggregated metrics - rolls up project health, budget, benefits, risks, and exceptions for PMO oversight';

-- ================================================
-- VIEW 3: pmo_control_strip_view
-- Description: PMO Control Strip intervention signals
-- ================================================

CREATE OR REPLACE VIEW pmo_control_strip_view AS
SELECT
  -- Projects Requiring Attention (RAG != Green)
  COUNT(DISTINCT p.id) FILTER (WHERE p.health_status IN ('red', 'Red', 'amber', 'yellow', 'Amber', 'Yellow') AND ps.status_name IN ('Active', 'In Progress', 'active', 'in progress')) AS projects_requiring_attention,

  -- Projects in Exception
  COUNT(DISTINCT e.project_id) FILTER (WHERE e.exception_status IN ('OPEN', 'ESCALATED', 'UNDER_REVIEW')) AS projects_in_exception,

  -- Overdue Stage Gates (counts gates past planned_date that aren't approved/rejected)
  (
    SELECT COUNT(DISTINCT sb.id)::integer 
    FROM stage_boundaries sb 
    WHERE sb.is_deleted = FALSE
      AND sb.status NOT IN ('approved', 'rejected')
      AND sb.planned_date IS NOT NULL 
      AND sb.planned_date < CURRENT_DATE
  ) AS overdue_stage_gates,

  -- PM Capacity Breaches
  COUNT(DISTINCT pmc.pm_user_id) FILTER (WHERE pmc.capacity_status = 'BREACH') AS pm_capacity_breaches,

  -- Orphan Projects (no programme assignment OR no board assignment for governance projects)
  COUNT(DISTINCT p.id) FILTER (
    WHERE (
      NOT EXISTS (SELECT 1 FROM programme_projects pp WHERE pp.project_id = p.id)
      OR p.has_board = FALSE
    )
    AND ps.status_name IN ('Active', 'In Progress', 'active', 'in progress')
    AND p.is_deleted = FALSE
  ) AS orphan_projects

FROM projects p
LEFT JOIN project_statuses ps ON ps.id = p.status_id
LEFT JOIN exceptions e ON e.project_id = p.id AND e.is_deleted = FALSE
LEFT JOIN pm_capacity_view pmc ON TRUE
WHERE p.is_deleted = FALSE;

COMMENT ON VIEW pmo_control_strip_view IS 'PMO Control Strip intervention signals - aggregates key alerts for PMO dashboard';

-- ================================================
-- SECTION 4: CREATE FUNCTIONS
-- ================================================

-- ================================================
-- FUNCTION 1: check_pm_capacity()
-- Description: Enforce PM 2-project limit
-- ================================================

CREATE OR REPLACE FUNCTION check_pm_capacity()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
  pm_name VARCHAR(255);
BEGIN
  -- Only check if assigning a PROJECT_MANAGER to an active project
  IF NEW.assignment_type = 'PROJECT_MANAGER' AND NEW.is_active = TRUE AND NEW.is_deleted = FALSE THEN

    -- Count active projects for this PM (excluding the current assignment if it's an update)
    SELECT COUNT(DISTINCT pa.project_id) INTO active_count
    FROM project_assignments pa
    JOIN projects p ON p.id = pa.project_id
    JOIN project_statuses ps ON ps.id = p.status_id
    WHERE pa.user_id = NEW.user_id
      AND pa.assignment_type = 'PROJECT_MANAGER'
      AND pa.is_active = TRUE
      AND pa.is_deleted = FALSE
      AND p.is_deleted = FALSE
      AND ps.status_name IN ('Active', 'In Progress', 'active', 'in progress', 'in_progress')
      AND (TG_OP = 'INSERT' OR pa.id != NEW.id); -- Exclude current record on UPDATE

    -- Enforce limit of 2 active projects
    IF active_count >= 2 THEN
      -- Get PM name for error message
      SELECT full_name INTO pm_name FROM users WHERE id = NEW.user_id;

      RAISE EXCEPTION 'PM_CAPACITY_BREACH: % (%) already has % active project(s). Maximum allowed is 2. Please reassign an existing project before assigning a new one.',
        pm_name, NEW.user_id, active_count
        USING HINT = 'Use the PMO Dashboard to reassign one of the existing projects to another PM first.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_check_pm_capacity ON project_assignments;
CREATE TRIGGER trg_check_pm_capacity
  BEFORE INSERT OR UPDATE ON project_assignments
  FOR EACH ROW
  EXECUTE FUNCTION check_pm_capacity();

COMMENT ON FUNCTION check_pm_capacity() IS 'Enforces hard limit of 2 active projects per Project Manager - prevents capacity breaches at database level';

-- ================================================
-- FUNCTION 2: log_pmo_action()
-- Description: Log PMO actions to audit trail
-- ================================================

CREATE OR REPLACE FUNCTION log_pmo_action(
  p_actor_user_id UUID,
  p_action VARCHAR(100),
  p_entity_type VARCHAR(50),
  p_entity_id UUID,
  p_action_description TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_actor_name VARCHAR(255);
  v_actor_email VARCHAR(255);
  v_entity_name VARCHAR(255);
  v_action_category VARCHAR(50);
BEGIN
  -- Get actor details
  SELECT full_name, email INTO v_actor_name, v_actor_email
  FROM users WHERE id = p_actor_user_id;

  -- Determine action category based on action prefix
  v_action_category := CASE
    WHEN p_action LIKE 'CREATE_PROJECT%' OR p_action LIKE 'UPDATE_PROJECT%' OR p_action LIKE 'SUSPEND_PROJECT%' THEN 'PROJECT'
    WHEN p_action LIKE '%PROGRAMME%' THEN 'PROGRAMME'
    WHEN p_action LIKE 'ASSIGN_%' OR p_action LIKE 'REASSIGN_%' THEN 'ASSIGNMENT'
    WHEN p_action LIKE '%EXCEPTION%' THEN 'EXCEPTION'
    WHEN p_action LIKE '%GATE%' THEN 'STAGE_GATE'
    WHEN p_action LIKE '%BENEFIT%' THEN 'BENEFIT'
    ELSE 'GOVERNANCE'
  END;

  -- Try to get entity name based on entity type
  v_entity_name := CASE p_entity_type
    WHEN 'PROJECT' THEN (SELECT project_name FROM projects WHERE id = p_entity_id)
    WHEN 'PROGRAMME' THEN (SELECT programme_name FROM programmes WHERE id = p_entity_id)
    WHEN 'EXCEPTION' THEN (SELECT exception_title FROM exceptions WHERE id = p_entity_id)
    WHEN 'STAGE_GATE' THEN (SELECT stage_name FROM stage_gates WHERE id = p_entity_id)
    ELSE NULL
  END;

  -- Insert audit log entry
  INSERT INTO pmo_audit_log (
    actor_user_id,
    actor_name,
    actor_email,
    action,
    action_description,
    action_category,
    entity_type,
    entity_id,
    entity_name,
    payload
  )
  VALUES (
    p_actor_user_id,
    v_actor_name,
    v_actor_email,
    p_action,
    p_action_description,
    v_action_category,
    p_entity_type,
    p_entity_id,
    v_entity_name,
    p_payload
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_pmo_action IS 'Records PMO governance actions to audit log - automatically categorizes and enriches log entries';

-- ================================================
-- FUNCTION 3: update_project_assignment_flags()
-- Description: Update project flags when assignments change
-- ================================================

CREATE OR REPLACE FUNCTION update_project_assignment_flags()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Determine which project to update
  IF TG_OP = 'DELETE' THEN
    v_project_id := OLD.project_id;
  ELSE
    v_project_id := NEW.project_id;
  END IF;

  -- Update project flags
  UPDATE projects SET
    has_executive = EXISTS (
      SELECT 1 FROM project_assignments
      WHERE project_id = v_project_id
        AND assignment_type = 'EXECUTIVE'
        AND is_active = TRUE
        AND is_deleted = FALSE
    ),
    has_pm = EXISTS (
      SELECT 1 FROM project_assignments
      WHERE project_id = v_project_id
        AND assignment_type = 'PROJECT_MANAGER'
        AND is_active = TRUE
        AND is_deleted = FALSE
    ),
    has_board = EXISTS (
      SELECT 1 FROM project_assignments
      WHERE project_id = v_project_id
        AND assignment_type = 'BOARD_MEMBER'
        AND is_active = TRUE
        AND is_deleted = FALSE
    )
  WHERE id = v_project_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_update_project_assignment_flags ON project_assignments;
CREATE TRIGGER trg_update_project_assignment_flags
  AFTER INSERT OR UPDATE OR DELETE ON project_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_project_assignment_flags();

COMMENT ON FUNCTION update_project_assignment_flags() IS 'Auto-updates project governance flags (has_executive, has_pm, has_board) when assignments change';

-- ================================================
-- FUNCTION 4: update_project_orphan_status()
-- Description: Update project orphan flag when programme assignments change
-- ================================================

CREATE OR REPLACE FUNCTION update_project_orphan_status()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Determine which project to update
  IF TG_OP = 'DELETE' THEN
    v_project_id := OLD.project_id;
  ELSE
    v_project_id := NEW.project_id;
  END IF;

  -- Update project orphan flag
  UPDATE projects SET
    is_orphan = NOT EXISTS (
      SELECT 1 FROM programme_projects
      WHERE project_id = v_project_id
    )
  WHERE id = v_project_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on programme_projects
DROP TRIGGER IF EXISTS trg_update_project_orphan_status ON programme_projects;
CREATE TRIGGER trg_update_project_orphan_status
  AFTER INSERT OR DELETE ON programme_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_project_orphan_status();

COMMENT ON FUNCTION update_project_orphan_status() IS 'Auto-updates project is_orphan flag when programme assignments change';

-- ================================================
-- SECTION 5: CREATE RLS POLICIES
-- ================================================

-- ================================================
-- RLS POLICIES: project_assignments
-- ================================================

-- Enable RLS
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;

-- Policy 1: PMO Admin full access
DROP POLICY IF EXISTS "pmo_admin_full_access_project_assignments" ON project_assignments;
CREATE POLICY "pmo_admin_full_access_project_assignments"
ON project_assignments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE u.auth_user_id = auth.uid()
      AND p.permission_code = 'org.admin'
      AND ur.is_active = TRUE
      AND ur.is_deleted = FALSE
      AND rp.is_active = TRUE
      AND rp.is_deleted = FALSE
      AND p.is_active = TRUE
      AND p.is_deleted = FALSE
  )
);

-- Policy 2: Users can view their own assignments
DROP POLICY IF EXISTS "users_view_own_assignments" ON project_assignments;
CREATE POLICY "users_view_own_assignments"
ON project_assignments FOR SELECT
USING (
  user_id IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
);

-- Policy 3: Project team members can view project assignments
DROP POLICY IF EXISTS "project_team_view_assignments" ON project_assignments;
CREATE POLICY "project_team_view_assignments"
ON project_assignments FOR SELECT
USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN user_projects up ON up.project_id = p.id
    JOIN users u ON u.id = up.user_id
    WHERE u.auth_user_id = auth.uid()
      AND up.is_active = TRUE
      AND up.is_deleted = FALSE
  )
);

-- ================================================
-- RLS POLICIES: exceptions
-- ================================================

-- Enable RLS
ALTER TABLE exceptions ENABLE ROW LEVEL SECURITY;

-- Policy 1: PMO Admin full access
DROP POLICY IF EXISTS "pmo_admin_full_access_exceptions" ON exceptions;
CREATE POLICY "pmo_admin_full_access_exceptions"
ON exceptions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE u.auth_user_id = auth.uid()
      AND p.permission_code = 'org.admin'
      AND ur.is_active = TRUE
      AND ur.is_deleted = FALSE
      AND rp.is_active = TRUE
      AND rp.is_deleted = FALSE
      AND p.is_active = TRUE
      AND p.is_deleted = FALSE
  )
);

-- Policy 2: Project team members can view exceptions for their projects
DROP POLICY IF EXISTS "project_team_view_exceptions" ON exceptions;
CREATE POLICY "project_team_view_exceptions"
ON exceptions FOR SELECT
USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN user_projects up ON up.project_id = p.id
    JOIN users u ON u.id = up.user_id
    WHERE u.auth_user_id = auth.uid()
      AND up.is_active = TRUE
      AND up.is_deleted = FALSE
  )
);

-- ================================================
-- RLS POLICIES: pmo_audit_log
-- ================================================

-- Enable RLS
ALTER TABLE pmo_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy 1: PMO Admin can view audit log
DROP POLICY IF EXISTS "pmo_admin_view_audit_log" ON pmo_audit_log;
CREATE POLICY "pmo_admin_view_audit_log"
ON pmo_audit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE u.auth_user_id = auth.uid()
      AND p.permission_code = 'org.admin'
      AND ur.is_active = TRUE
      AND ur.is_deleted = FALSE
      AND rp.is_active = TRUE
      AND rp.is_deleted = FALSE
      AND p.is_active = TRUE
      AND p.is_deleted = FALSE
  )
);

-- Policy 2: Allow INSERT for audit logging (all authenticated users can log actions)
DROP POLICY IF EXISTS "authenticated_insert_audit_log" ON pmo_audit_log;
CREATE POLICY "authenticated_insert_audit_log"
ON pmo_audit_log FOR INSERT
WITH CHECK (
  actor_user_id IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
);

-- ================================================
-- SECTION 6: REGISTER TABLES
-- ================================================

-- Register new tables in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('project_assignments', 'Tracks Executive, PM, and Board member assignments to projects for PMO governance', false, true, 'project'),
  ('exceptions', 'Project exception tracking for PMO intervention and escalation', false, true, 'project'),
  ('pmo_audit_log', 'Comprehensive audit trail for all PMO governance actions', true, true, 'audit')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  table_category = EXCLUDED.table_category,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ================================================
-- SECTION 7: INITIALIZATION
-- ================================================

-- Initialize project orphan flags for existing projects
UPDATE projects p
SET is_orphan = NOT EXISTS (
  SELECT 1 FROM programme_projects pp WHERE pp.project_id = p.id
)
WHERE p.is_deleted = FALSE;

-- Initialize project assignment flags for existing projects
UPDATE projects p
SET
  has_executive = EXISTS (
    SELECT 1 FROM project_assignments pa
    WHERE pa.project_id = p.id
      AND pa.assignment_type = 'EXECUTIVE'
      AND pa.is_active = TRUE
      AND pa.is_deleted = FALSE
  ),
  has_pm = EXISTS (
    SELECT 1 FROM project_assignments pa
    WHERE pa.project_id = p.id
      AND pa.assignment_type = 'PROJECT_MANAGER'
      AND pa.is_active = TRUE
      AND pa.is_deleted = FALSE
  ),
  has_board = EXISTS (
    SELECT 1 FROM project_assignments pa
    WHERE pa.project_id = p.id
      AND pa.assignment_type = 'BOARD_MEMBER'
      AND pa.is_active = TRUE
      AND pa.is_deleted = FALSE
  )
WHERE p.is_deleted = FALSE;

-- ================================================
-- END OF MIGRATION
-- ================================================

-- Display summary
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PMO Dashboard Enhancement Migration v145 Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables Created:';
  RAISE NOTICE '  - project_assignments';
  RAISE NOTICE '  - exceptions';
  RAISE NOTICE '  - pmo_audit_log';
  RAISE NOTICE '';
  RAISE NOTICE 'Views Created:';
  RAISE NOTICE '  - pm_capacity_view';
  RAISE NOTICE '  - programme_rollup_view';
  RAISE NOTICE '  - pmo_control_strip_view';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions Created:';
  RAISE NOTICE '  - check_pm_capacity()';
  RAISE NOTICE '  - log_pmo_action()';
  RAISE NOTICE '  - update_project_assignment_flags()';
  RAISE NOTICE '  - update_project_orphan_status()';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Policies Applied: 7 policies';
  RAISE NOTICE '========================================';
END $$;
