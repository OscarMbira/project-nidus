-- ================================================
-- File: v23_structured_pm_cs.sql
-- Description: Structured PM Controlling a Stage (CS) module tables
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v22 must be run first (all core tables must exist)
-- - projects table must exist
-- - stage_boundaries table must exist (from v10_stage_gates_tables.sql)
-- - users table must exist

-- Purpose:
-- Creates tables for Structured PM Controlling a Stage module:
-- 1. work_packages - Work packages for stage execution
-- 2. stage_progress - Stage progress tracking
-- 3. checkpoint_reports - Checkpoint reports during stage execution
-- 4. highlight_reports - Highlight reports for Project Board
-- 5. stage_tolerances - Stage tolerance monitoring

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- TABLE 1: work_packages
-- Description: Work packages for stage execution
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS work_packages (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage_boundary_id UUID REFERENCES stage_boundaries(id) ON DELETE SET NULL,  -- Optional: link to stage gate
    assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- Team Manager/Lead

    -- Work Package Information
    work_package_name VARCHAR(200) NOT NULL,
    work_package_description TEXT,
    work_package_code VARCHAR(50),  -- Unique code for the work package
    
    -- Work Package Details
    objectives TEXT,  -- What needs to be achieved
    products_deliverables TEXT[],  -- List of products/deliverables
    quality_criteria TEXT,  -- Quality requirements
    acceptance_criteria TEXT,  -- Acceptance criteria
    
    -- Dates
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft',  -- 'draft', 'authorized', 'accepted', 'in_progress', 'completed', 'closed', 'cancelled'
    authorization_date DATE,
    authorization_by UUID REFERENCES users(id),
    acceptance_date DATE,
    acceptance_by UUID REFERENCES users(id),
    
    -- Progress
    progress_percentage DECIMAL(5,2) DEFAULT 0,  -- 0-100
    completion_date DATE,
    
    -- Budget/Cost
    estimated_cost DECIMAL(12,2),
    actual_cost DECIMAL(12,2),
    
    -- Notes
    notes TEXT,
    closure_notes TEXT,

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
CREATE INDEX IF NOT EXISTS idx_work_packages_project_id ON work_packages(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_work_packages_stage_boundary_id ON work_packages(stage_boundary_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_work_packages_assigned_to ON work_packages(assigned_to_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_work_packages_status ON work_packages(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_work_packages_code ON work_packages(work_package_code) WHERE is_deleted = FALSE AND work_package_code IS NOT NULL;

-- Unique constraint for work package code per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_work_packages_code_unique 
ON work_packages(project_id, work_package_code) 
WHERE is_deleted = FALSE AND work_package_code IS NOT NULL;

-- Triggers
DROP TRIGGER IF EXISTS trg_work_packages_before_insert ON work_packages;
CREATE TRIGGER trg_work_packages_before_insert
    BEFORE INSERT ON work_packages
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_work_packages_before_update ON work_packages;
CREATE TRIGGER trg_work_packages_before_update
    BEFORE UPDATE ON work_packages
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE work_packages IS 'Work packages for Structured PM stage execution';
COMMENT ON COLUMN work_packages.status IS 'Status: draft, authorized, accepted, in_progress, completed, closed, cancelled';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('work_packages', 'Work packages for Structured PM stage execution', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 2: stage_progress
-- Description: Stage progress tracking
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS stage_progress (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage_boundary_id UUID REFERENCES stage_boundaries(id) ON DELETE SET NULL,
    work_package_id UUID REFERENCES work_packages(id) ON DELETE SET NULL,  -- Optional: specific work package

    -- Progress Date
    progress_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Progress Metrics
    overall_progress_percentage DECIMAL(5,2) DEFAULT 0,  -- Overall stage progress
    work_packages_total INTEGER DEFAULT 0,
    work_packages_completed INTEGER DEFAULT 0,
    work_packages_in_progress INTEGER DEFAULT 0,
    
    -- Budget/Cost
    budget_used DECIMAL(12,2) DEFAULT 0,
    budget_remaining DECIMAL(12,2),
    cost_variance DECIMAL(12,2),  -- Actual vs Planned
    
    -- Schedule
    schedule_variance_days INTEGER,  -- Days ahead/behind schedule
    on_schedule BOOLEAN DEFAULT TRUE,
    
    -- Quality
    quality_issues_count INTEGER DEFAULT 0,
    quality_issues_resolved INTEGER DEFAULT 0,
    
    -- Risks/Issues
    open_risks_count INTEGER DEFAULT 0,
    open_issues_count INTEGER DEFAULT 0,
    
    -- Notes
    progress_notes TEXT,
    concerns TEXT,
    next_steps TEXT,

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
CREATE INDEX IF NOT EXISTS idx_stage_progress_project_id ON stage_progress(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_progress_stage_boundary_id ON stage_progress(stage_boundary_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_progress_work_package_id ON stage_progress(work_package_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_progress_date ON stage_progress(progress_date) WHERE is_deleted = FALSE;

-- Unique constraint: one progress record per project/stage/work package per date
CREATE UNIQUE INDEX IF NOT EXISTS idx_stage_progress_unique 
ON stage_progress(project_id, COALESCE(stage_boundary_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(work_package_id, '00000000-0000-0000-0000-000000000000'::uuid), progress_date) 
WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_stage_progress_before_insert ON stage_progress;
CREATE TRIGGER trg_stage_progress_before_insert
    BEFORE INSERT ON stage_progress
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_stage_progress_before_update ON stage_progress;
CREATE TRIGGER trg_stage_progress_before_update
    BEFORE UPDATE ON stage_progress
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE stage_progress IS 'Stage progress tracking for Structured PM';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('stage_progress', 'Stage progress tracking for Structured PM', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 3: checkpoint_reports
-- Description: Checkpoint reports during stage execution
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS checkpoint_reports (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage_boundary_id UUID REFERENCES stage_boundaries(id) ON DELETE SET NULL,
    work_package_id UUID REFERENCES work_packages(id) ON DELETE SET NULL,  -- Optional: specific work package
    reported_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Report Information
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    checkpoint_date DATE NOT NULL,  -- Date of the checkpoint
    report_title VARCHAR(200),
    report_summary TEXT,
    
    -- Progress Summary
    progress_summary TEXT,
    completed_work TEXT,
    work_in_progress TEXT,
    planned_work TEXT,
    
    -- Issues and Risks
    issues_summary TEXT,
    risks_summary TEXT,
    changes_summary TEXT,
    
    -- Quality
    quality_status TEXT,
    quality_concerns TEXT,
    
    -- Budget/Schedule
    budget_status TEXT,
    schedule_status TEXT,
    variance_analysis TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft',  -- 'draft', 'submitted', 'reviewed', 'approved'
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    
    -- Approval
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    approval_notes TEXT,

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
CREATE INDEX IF NOT EXISTS idx_checkpoint_reports_project_id ON checkpoint_reports(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_checkpoint_reports_stage_boundary_id ON checkpoint_reports(stage_boundary_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_checkpoint_reports_work_package_id ON checkpoint_reports(work_package_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_checkpoint_reports_date ON checkpoint_reports(checkpoint_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_checkpoint_reports_status ON checkpoint_reports(status) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_checkpoint_reports_before_insert ON checkpoint_reports;
CREATE TRIGGER trg_checkpoint_reports_before_insert
    BEFORE INSERT ON checkpoint_reports
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_checkpoint_reports_before_update ON checkpoint_reports;
CREATE TRIGGER trg_checkpoint_reports_before_update
    BEFORE UPDATE ON checkpoint_reports
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE checkpoint_reports IS 'Checkpoint reports during Structured PM stage execution';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('checkpoint_reports', 'Checkpoint reports during Structured PM stage execution', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 4: highlight_reports
-- Description: Highlight reports for Project Board
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS highlight_reports (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage_boundary_id UUID REFERENCES stage_boundaries(id) ON DELETE SET NULL,
    prepared_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Report Information
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reporting_period_start DATE NOT NULL,
    reporting_period_end DATE NOT NULL,
    report_title VARCHAR(200) DEFAULT 'Highlight Report',
    
    -- Executive Summary
    executive_summary TEXT,
    
    -- Status Summary
    stage_status VARCHAR(50),  -- 'on_track', 'at_risk', 'off_track', 'exception'
    overall_status_summary TEXT,
    
    -- Progress
    progress_summary TEXT,
    completed_this_period TEXT,
    planned_next_period TEXT,
    
    -- Budget
    budget_status TEXT,
    budget_variance DECIMAL(12,2),
    budget_forecast TEXT,
    
    -- Schedule
    schedule_status TEXT,
    schedule_variance_days INTEGER,
    schedule_forecast TEXT,
    
    -- Quality
    quality_status TEXT,
    quality_issues TEXT,
    
    -- Risks
    risks_summary TEXT,
    top_risks TEXT,
    risk_mitigation_status TEXT,
    
    -- Issues
    issues_summary TEXT,
    top_issues TEXT,
    issue_resolution_status TEXT,
    
    -- Changes
    changes_summary TEXT,
    approved_changes TEXT,
    pending_changes TEXT,
    
    -- Decisions Required
    decisions_required TEXT,
    recommendations TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft',  -- 'draft', 'submitted', 'reviewed', 'approved'
    submitted_at TIMESTAMP,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,

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
CREATE INDEX IF NOT EXISTS idx_highlight_reports_project_id ON highlight_reports(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_highlight_reports_stage_boundary_id ON highlight_reports(stage_boundary_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_highlight_reports_date ON highlight_reports(report_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_highlight_reports_status ON highlight_reports(status) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_highlight_reports_before_insert ON highlight_reports;
CREATE TRIGGER trg_highlight_reports_before_insert
    BEFORE INSERT ON highlight_reports
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_highlight_reports_before_update ON highlight_reports;
CREATE TRIGGER trg_highlight_reports_before_update
    BEFORE UPDATE ON highlight_reports
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE highlight_reports IS 'Highlight reports for Project Board in Structured PM';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('highlight_reports', 'Highlight reports for Project Board in Structured PM', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 5: stage_tolerances
-- Description: Stage tolerance monitoring
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS stage_tolerances (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage_boundary_id UUID REFERENCES stage_boundaries(id) ON DELETE SET NULL,

    -- Tolerance Type
    tolerance_type VARCHAR(50) NOT NULL,  -- 'time', 'cost', 'scope', 'quality', 'risk', 'benefits'
    
    -- Tolerance Limits
    tolerance_limit_value DECIMAL(12,2),  -- The limit value
    tolerance_limit_unit VARCHAR(50),  -- 'days', 'currency', 'percentage', etc.
    current_value DECIMAL(12,2) DEFAULT 0,  -- Current actual value
    baseline_value DECIMAL(12,2) DEFAULT 0,  -- Baseline/planned value
    
    -- Variance
    variance DECIMAL(12,2) DEFAULT 0,  -- Current - Baseline
    variance_percentage DECIMAL(5,2),  -- (Variance / Baseline) * 100
    
    -- Status
    status VARCHAR(50) DEFAULT 'within_tolerance',  -- 'within_tolerance', 'approaching_tolerance', 'exceeded_tolerance', 'exception'
    status_date DATE DEFAULT CURRENT_DATE,
    
    -- Thresholds
    warning_threshold_percentage DECIMAL(5,2) DEFAULT 80,  -- Warning at 80% of tolerance
    exception_threshold_percentage DECIMAL(5,2) DEFAULT 100,  -- Exception at 100% of tolerance
    
    -- Monitoring
    last_checked_at TIMESTAMP DEFAULT NOW(),
    checked_by UUID REFERENCES users(id),
    monitoring_frequency VARCHAR(50) DEFAULT 'weekly',  -- 'daily', 'weekly', 'monthly'
    
    -- Notes
    notes TEXT,
    mitigation_actions TEXT,

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
CREATE INDEX IF NOT EXISTS idx_stage_tolerances_project_id ON stage_tolerances(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_tolerances_stage_boundary_id ON stage_tolerances(stage_boundary_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_tolerances_type ON stage_tolerances(tolerance_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_tolerances_status ON stage_tolerances(status) WHERE is_deleted = FALSE;

-- Unique constraint: one tolerance record per project/stage/tolerance type
CREATE UNIQUE INDEX IF NOT EXISTS idx_stage_tolerances_unique 
ON stage_tolerances(project_id, COALESCE(stage_boundary_id, '00000000-0000-0000-0000-000000000000'::uuid), tolerance_type) 
WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_stage_tolerances_before_insert ON stage_tolerances;
CREATE TRIGGER trg_stage_tolerances_before_insert
    BEFORE INSERT ON stage_tolerances
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_stage_tolerances_before_update ON stage_tolerances;
CREATE TRIGGER trg_stage_tolerances_before_update
    BEFORE UPDATE ON stage_tolerances
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE stage_tolerances IS 'Stage tolerance monitoring for Structured PM';
COMMENT ON COLUMN stage_tolerances.tolerance_type IS 'Type: time, cost, scope, quality, risk, benefits';
COMMENT ON COLUMN stage_tolerances.status IS 'Status: within_tolerance, approaching_tolerance, exceeded_tolerance, exception';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('stage_tolerances', 'Stage tolerance monitoring for Structured PM', false, true, 'structured')
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
    -- Count Controlling a Stage tables
    SELECT COUNT(*)
    INTO v_tables_count
    FROM database_tables
    WHERE table_category = 'structured'
      AND table_name IN (
          'work_packages',
          'stage_progress',
          'checkpoint_reports',
          'highlight_reports',
          'stage_tolerances'
      )
      AND is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Controlling a Stage Tables Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'CS Tables Created: %', v_tables_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v23_structured_pm_cs.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

