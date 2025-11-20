-- ================================================
-- File: v10_stage_gates_tables.sql
-- Description: Stage boundaries and approval workflow tables for Structured PM
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v09 must be run first (all core tables must exist)
-- - projects table must exist
-- - users table must exist

-- Purpose:
-- Creates stage boundary and approval workflow tables:
-- 1. stage_boundaries - Stage boundary definitions and status
-- 2. stage_approvals - Approval requests and decisions
-- 3. stage_approval_checklists - Checklists for gate reviews

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- TABLE 1: stage_boundaries
-- Description: Stage boundaries (gates) for Structured PM projects
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS stage_boundaries (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Stage Information
    stage_number INTEGER NOT NULL,  -- Stage sequence number (1, 2, 3, etc.)
    stage_name VARCHAR(200) NOT NULL,
    stage_description TEXT,
    
    -- Gate Information
    gate_name VARCHAR(200) NOT NULL,  -- e.g., "Initiation Gate", "Stage 1 Gate"
    gate_type VARCHAR(50) NOT NULL DEFAULT 'stage_boundary',  -- 'stage_boundary', 'initiation', 'closure'
    gate_order INTEGER NOT NULL,  -- Order within project
    
    -- Status
    status VARCHAR(50) DEFAULT 'not_started',  -- 'not_started', 'in_preparation', 'submitted', 'under_review', 'approved', 'rejected', 'deferred'
    
    -- Dates
    planned_date DATE,
    submitted_date DATE,
    review_start_date DATE,
    review_end_date DATE,
    approved_date DATE,
    rejected_date DATE,
    
    -- Documents
    stage_end_report JSONB,  -- Stage end report content
    next_stage_plan JSONB,  -- Next stage plan content
    updated_project_plan JSONB,  -- Updated project plan
    updated_business_case JSONB,  -- Updated business case
    updated_risk_register JSONB,  -- Updated risk register
    
    -- Approval Requirements
    requires_project_board_approval BOOLEAN DEFAULT TRUE,
    requires_executive_approval BOOLEAN DEFAULT FALSE,
    requires_senior_user_approval BOOLEAN DEFAULT FALSE,
    requires_senior_supplier_approval BOOLEAN DEFAULT FALSE,
    
    -- Notes
    preparation_notes TEXT,
    review_notes TEXT,
    rejection_reason TEXT,
    deferral_reason TEXT,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT chk_stage_boundaries_status CHECK (status IN ('not_started', 'in_preparation', 'submitted', 'under_review', 'approved', 'rejected', 'deferred')),
    CONSTRAINT chk_stage_boundaries_gate_type CHECK (gate_type IN ('stage_boundary', 'initiation', 'closure'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stage_boundaries_project_id ON stage_boundaries(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_boundaries_status ON stage_boundaries(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_boundaries_stage_number ON stage_boundaries(project_id, stage_number) WHERE is_deleted = FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_stage_boundaries_project_stage_unique 
ON stage_boundaries(project_id, stage_number) 
WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_stage_boundaries_before_insert ON stage_boundaries;
CREATE TRIGGER trg_stage_boundaries_before_insert
    BEFORE INSERT ON stage_boundaries
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_stage_boundaries_before_update ON stage_boundaries;
CREATE TRIGGER trg_stage_boundaries_before_update
    BEFORE UPDATE ON stage_boundaries
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE stage_boundaries IS 'Stage boundaries (gates) for Structured PM projects';
COMMENT ON COLUMN stage_boundaries.gate_type IS 'Type of gate: stage_boundary (between stages), initiation (project start), closure (project end)';
COMMENT ON COLUMN stage_boundaries.status IS 'Gate status: not_started, in_preparation, submitted, under_review, approved, rejected, deferred';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('stage_boundaries', 'Stage boundaries (gates) for Structured PM projects', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 2: stage_approvals
-- Description: Approval requests and decisions for stage boundaries
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS stage_approvals (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    stage_boundary_id UUID NOT NULL REFERENCES stage_boundaries(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Approval Information
    approval_type VARCHAR(50) NOT NULL,  -- 'project_board', 'executive', 'senior_user', 'senior_supplier', 'project_manager'
    approval_role VARCHAR(100),  -- Role of approver (e.g., 'Executive', 'Senior User')
    
    -- Approver
    approver_user_id UUID REFERENCES users(id),  -- Specific user assigned to approve
    approver_role_id UUID REFERENCES roles(id),  -- Role that can approve
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'deferred', 'not_required'
    
    -- Decision
    decision_date TIMESTAMP,
    decision_notes TEXT,
    rejection_reason TEXT,
    deferral_reason TEXT,
    
    -- Priority
    priority VARCHAR(20) DEFAULT 'normal',  -- 'low', 'normal', 'high', 'urgent'
    due_date DATE,  -- When approval is due
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT chk_stage_approvals_status CHECK (status IN ('pending', 'approved', 'rejected', 'deferred', 'not_required')),
    CONSTRAINT chk_stage_approvals_approval_type CHECK (approval_type IN ('project_board', 'executive', 'senior_user', 'senior_supplier', 'project_manager')),
    CONSTRAINT chk_stage_approvals_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stage_approvals_stage_boundary_id ON stage_approvals(stage_boundary_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_approvals_project_id ON stage_approvals(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_approvals_status ON stage_approvals(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_approvals_approver_user_id ON stage_approvals(approver_user_id) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_stage_approvals_before_insert ON stage_approvals;
CREATE TRIGGER trg_stage_approvals_before_insert
    BEFORE INSERT ON stage_approvals
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_stage_approvals_before_update ON stage_approvals;
CREATE TRIGGER trg_stage_approvals_before_update
    BEFORE UPDATE ON stage_approvals
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE stage_approvals IS 'Approval requests and decisions for stage boundaries';
COMMENT ON COLUMN stage_approvals.approval_type IS 'Type of approval: project_board, executive, senior_user, senior_supplier, project_manager';
COMMENT ON COLUMN stage_approvals.status IS 'Approval status: pending, approved, rejected, deferred, not_required';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('stage_approvals', 'Approval requests and decisions for stage boundaries', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 3: stage_approval_checklists
-- Description: Checklists for stage gate reviews
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS stage_approval_checklists (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    stage_boundary_id UUID NOT NULL REFERENCES stage_boundaries(id) ON DELETE CASCADE,
    stage_approval_id UUID REFERENCES stage_approvals(id) ON DELETE CASCADE,  -- Optional: specific to an approval

    -- Checklist Item
    item_name VARCHAR(200) NOT NULL,
    item_description TEXT,
    item_category VARCHAR(100),  -- 'documentation', 'quality', 'compliance', 'deliverables', 'financial', 'risk'
    item_order INTEGER NOT NULL,
    
    -- Status
    is_required BOOLEAN DEFAULT TRUE,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    completed_by UUID REFERENCES users(id),
    
    -- Evidence
    evidence_description TEXT,
    evidence_attachment_url TEXT,
    
    -- Notes
    notes TEXT,
    reviewer_notes TEXT,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stage_approval_checklists_stage_boundary_id ON stage_approval_checklists(stage_boundary_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_approval_checklists_stage_approval_id ON stage_approval_checklists(stage_approval_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_approval_checklists_is_completed ON stage_approval_checklists(is_completed) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_stage_approval_checklists_before_insert ON stage_approval_checklists;
CREATE TRIGGER trg_stage_approval_checklists_before_insert
    BEFORE INSERT ON stage_approval_checklists
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_stage_approval_checklists_before_update ON stage_approval_checklists;
CREATE TRIGGER trg_stage_approval_checklists_before_update
    BEFORE UPDATE ON stage_approval_checklists
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE stage_approval_checklists IS 'Checklists for stage gate reviews';
COMMENT ON COLUMN stage_approval_checklists.item_category IS 'Category: documentation, quality, compliance, deliverables, financial, risk';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('stage_approval_checklists', 'Checklists for stage gate reviews', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_tables_count INTEGER;
BEGIN
    -- Count Stage Gate-related tables
    SELECT COUNT(*)
    INTO v_tables_count
    FROM database_tables
    WHERE table_category = 'structured'
      AND table_name IN ('stage_boundaries', 'stage_approvals', 'stage_approval_checklists')
      AND is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Stage Gate Tables Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Stage Gate Tables Created: %', v_tables_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v10_stage_gates_tables.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

