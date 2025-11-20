-- ================================================
-- File: v29_stage_boundaries_enhanced.sql
-- Description: Structured PM Managing Stage Boundaries (SB) module tables
-- Version: 1.0
-- Date: 2025-01-17
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v28 must be run first (all core tables must exist)
-- - projects table must exist
-- - stage_boundaries table must exist (from v10)
-- - users table must exist
-- - project_boards table must exist (from v28)

-- Purpose:
-- Creates enhanced tables for Structured PM Managing Stage Boundaries module:
-- 1. end_stage_reports - End Stage Reports for stage review
-- 2. stage_performance_reviews - Performance review data for each stage
-- 3. exception_plans - Exception plans for tolerance breaches
-- 4. next_stage_plans - Plans for the next stage
-- 5. stage_boundary_approvals - Approval workflow for stage transitions

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- TABLE 1: end_stage_reports
-- Description: End Stage Reports for stage completion review
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS end_stage_reports (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage_boundary_id UUID NOT NULL REFERENCES stage_boundaries(id) ON DELETE CASCADE,
    board_id UUID REFERENCES project_boards(id) ON DELETE SET NULL,

    -- Report Information
    report_reference VARCHAR(100),
    report_title VARCHAR(200) NOT NULL,
    report_date DATE NOT NULL,
    reporting_period_start DATE,
    reporting_period_end DATE,

    -- Stage Information
    stage_name VARCHAR(200),
    stage_number INTEGER,
    stage_status VARCHAR(50) DEFAULT 'completed', -- 'completed', 'terminated-early', 'extended'

    -- Performance Summary
    stage_objectives_summary TEXT,
    stage_objectives_met BOOLEAN,
    stage_deliverables_summary TEXT,
    deliverables_acceptance_status VARCHAR(50), -- 'all-accepted', 'partially-accepted', 'pending'

    -- Schedule Performance
    planned_start_date DATE,
    actual_start_date DATE,
    planned_end_date DATE,
    actual_end_date DATE,
    schedule_variance_days INTEGER,
    schedule_performance_index DECIMAL(5,2), -- SPI

    -- Cost Performance
    planned_budget DECIMAL(15,2),
    actual_cost DECIMAL(15,2),
    cost_variance DECIMAL(15,2),
    cost_performance_index DECIMAL(5,2), -- CPI

    -- Quality Performance
    quality_criteria_met INTEGER,
    quality_criteria_total INTEGER,
    quality_performance_percentage DECIMAL(5,2),
    quality_issues_summary TEXT,

    -- Risk & Issue Summary
    risks_closed INTEGER DEFAULT 0,
    risks_transferred_to_next_stage INTEGER DEFAULT 0,
    issues_closed INTEGER DEFAULT 0,
    issues_transferred_to_next_stage INTEGER DEFAULT 0,

    -- Lessons Learned
    lessons_learned TEXT,
    what_went_well TEXT,
    what_could_improve TEXT,
    recommendations TEXT,

    -- Forecast for Next Stage
    next_stage_forecast TEXT,
    anticipated_challenges TEXT,
    recommended_actions TEXT,

    -- Tolerances Review
    tolerance_breaches_occurred BOOLEAN DEFAULT FALSE,
    tolerance_breaches_details TEXT,

    -- Team Performance
    team_performance_summary TEXT,
    resource_utilization_summary TEXT,

    -- Approval
    prepared_by UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approval_date DATE,
    approval_status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'submitted', 'under-review', 'approved', 'rejected'

    -- Documents
    report_document_url TEXT,
    supporting_documents_urls TEXT[],

    -- Notes
    notes TEXT,

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
CREATE INDEX IF NOT EXISTS idx_end_stage_reports_project_id ON end_stage_reports(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_end_stage_reports_stage_boundary_id ON end_stage_reports(stage_boundary_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_end_stage_reports_board_id ON end_stage_reports(board_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_end_stage_reports_date ON end_stage_reports(report_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_end_stage_reports_status ON end_stage_reports(approval_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_end_stage_reports_reference ON end_stage_reports(report_reference) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_end_stage_reports_updated_at ON end_stage_reports;
CREATE TRIGGER trg_end_stage_reports_updated_at
    BEFORE UPDATE ON end_stage_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 2: exception_plans
-- Description: Exception plans for tolerance breaches
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS exception_plans (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage_boundary_id UUID REFERENCES stage_boundaries(id) ON DELETE SET NULL,
    board_id UUID REFERENCES project_boards(id) ON DELETE SET NULL,

    -- Exception Plan Information
    plan_reference VARCHAR(100),
    plan_title VARCHAR(200) NOT NULL,
    plan_date DATE NOT NULL,

    -- Exception Details
    exception_type VARCHAR(100) NOT NULL, -- 'budget', 'schedule', 'scope', 'quality', 'risk', 'combined'
    exception_description TEXT NOT NULL,
    exception_cause TEXT,
    exception_impact TEXT,

    -- Tolerance Breach Details
    tolerance_type VARCHAR(50), -- 'time', 'cost', 'scope', 'quality', 'benefit', 'risk'
    tolerance_threshold VARCHAR(100),
    actual_value VARCHAR(100),
    variance_amount VARCHAR(100),

    -- Current Situation
    current_status TEXT,
    affected_deliverables TEXT[],
    affected_work_packages TEXT[],

    -- Proposed Solution
    proposed_solution TEXT,
    solution_approach VARCHAR(100), -- 'recovery', 're-baseline', 'scope-reduction', 'other'
    recovery_actions TEXT,

    -- Impact Assessment
    impact_on_business_case TEXT,
    impact_on_project_objectives TEXT,
    impact_on_benefits TEXT,
    impact_on_risks TEXT,

    -- Revised Plan
    revised_schedule TEXT,
    revised_budget DECIMAL(15,2),
    revised_scope TEXT,
    revised_deliverables TEXT,

    -- Time Impact
    additional_time_required_days INTEGER,
    revised_completion_date DATE,

    -- Cost Impact
    additional_budget_required DECIMAL(15,2),
    revised_total_budget DECIMAL(15,2),
    funding_source TEXT,

    -- Options Analysis
    option_1_description TEXT,
    option_1_pros_cons TEXT,
    option_2_description TEXT,
    option_2_pros_cons TEXT,
    option_3_description TEXT,
    option_3_pros_cons TEXT,
    recommended_option INTEGER, -- 1, 2, or 3

    -- Authorization Request
    authorization_requested BOOLEAN DEFAULT FALSE,
    authorization_id UUID REFERENCES project_authorizations(id) ON DELETE SET NULL,

    -- Approval
    prepared_by UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approval_date DATE,
    approval_status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'submitted', 'under-review', 'approved', 'rejected', 'implemented'
    rejection_reason TEXT,

    -- Implementation
    implementation_status VARCHAR(50), -- 'not-started', 'in-progress', 'completed'
    implementation_start_date DATE,
    implementation_completion_date DATE,

    -- Documents
    plan_document_url TEXT,
    supporting_documents_urls TEXT[],

    -- Notes
    notes TEXT,

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
CREATE INDEX IF NOT EXISTS idx_exception_plans_project_id ON exception_plans(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_exception_plans_stage_boundary_id ON exception_plans(stage_boundary_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_exception_plans_board_id ON exception_plans(board_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_exception_plans_date ON exception_plans(plan_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_exception_plans_type ON exception_plans(exception_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_exception_plans_status ON exception_plans(approval_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_exception_plans_reference ON exception_plans(plan_reference) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_exception_plans_updated_at ON exception_plans;
CREATE TRIGGER trg_exception_plans_updated_at
    BEFORE UPDATE ON exception_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 3: next_stage_plans
-- Description: Plans for the next stage
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS next_stage_plans (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    current_stage_boundary_id UUID REFERENCES stage_boundaries(id) ON DELETE SET NULL,
    next_stage_boundary_id UUID REFERENCES stage_boundaries(id) ON DELETE SET NULL,

    -- Plan Information
    plan_reference VARCHAR(100),
    plan_title VARCHAR(200) NOT NULL,
    plan_date DATE NOT NULL,

    -- Next Stage Information
    next_stage_name VARCHAR(200) NOT NULL,
    next_stage_number INTEGER,
    next_stage_description TEXT,

    -- Objectives
    stage_objectives TEXT,
    stage_deliverables TEXT[],
    success_criteria TEXT,

    -- Schedule
    planned_start_date DATE,
    planned_end_date DATE,
    planned_duration_days INTEGER,
    key_milestones TEXT,

    -- Budget
    stage_budget DECIMAL(15,2),
    budget_breakdown TEXT,
    cost_estimate_basis TEXT,

    -- Scope
    scope_description TEXT,
    in_scope_items TEXT[],
    out_of_scope_items TEXT[],

    -- Resources
    resource_requirements TEXT,
    team_composition TEXT,
    key_roles_responsibilities TEXT,

    -- Quality
    quality_expectations TEXT,
    quality_criteria TEXT,
    acceptance_criteria TEXT,

    -- Risks
    identified_risks TEXT,
    risk_mitigation_plans TEXT,
    assumptions TEXT,
    dependencies TEXT,

    -- Communication
    stakeholder_engagement_plan TEXT,
    communication_plan TEXT,
    reporting_frequency VARCHAR(100),

    -- Tolerances
    time_tolerance_days INTEGER,
    cost_tolerance_amount DECIMAL(15,2),
    scope_tolerance TEXT,
    quality_tolerance TEXT,

    -- Controls
    stage_controls TEXT,
    governance_checkpoints TEXT,
    escalation_process TEXT,

    -- Lessons Applied
    lessons_from_previous_stage TEXT,
    improvements_implemented TEXT,

    -- Approval
    prepared_by UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approval_date DATE,
    approval_status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'submitted', 'under-review', 'approved', 'rejected'

    -- Documents
    plan_document_url TEXT,
    supporting_documents_urls TEXT[],

    -- Notes
    notes TEXT,

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
CREATE INDEX IF NOT EXISTS idx_next_stage_plans_project_id ON next_stage_plans(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_next_stage_plans_current_stage ON next_stage_plans(current_stage_boundary_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_next_stage_plans_next_stage ON next_stage_plans(next_stage_boundary_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_next_stage_plans_date ON next_stage_plans(plan_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_next_stage_plans_status ON next_stage_plans(approval_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_next_stage_plans_reference ON next_stage_plans(plan_reference) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_next_stage_plans_updated_at ON next_stage_plans;
CREATE TRIGGER trg_next_stage_plans_updated_at
    BEFORE UPDATE ON next_stage_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 4: stage_boundary_approvals
-- Description: Approval workflow tracking for stage transitions
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS stage_boundary_approvals (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage_boundary_id UUID NOT NULL REFERENCES stage_boundaries(id) ON DELETE CASCADE,
    end_stage_report_id UUID REFERENCES end_stage_reports(id) ON DELETE SET NULL,
    next_stage_plan_id UUID REFERENCES next_stage_plans(id) ON DELETE SET NULL,
    exception_plan_id UUID REFERENCES exception_plans(id) ON DELETE SET NULL,

    -- Approval Information
    approval_type VARCHAR(100) NOT NULL, -- 'stage-completion', 'next-stage', 'exception-plan', 'combined'
    approval_reference VARCHAR(100),

    -- Workflow
    workflow_step INTEGER DEFAULT 1,
    workflow_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in-review', 'approved', 'rejected', 'deferred'

    -- Submission
    submitted_by UUID REFERENCES users(id),
    submission_date DATE,
    submission_comments TEXT,

    -- Review
    reviewer_user_id UUID REFERENCES users(id),
    review_date DATE,
    review_comments TEXT,
    review_recommendation VARCHAR(50), -- 'approve', 'reject', 'defer', 'request-changes'

    -- Approval
    approver_user_id UUID REFERENCES users(id),
    approval_date DATE,
    approval_decision VARCHAR(50), -- 'approved', 'rejected', 'deferred', 'conditional'
    approval_comments TEXT,
    approval_conditions TEXT,

    -- Board Review
    board_meeting_id UUID REFERENCES board_meetings(id) ON DELETE SET NULL,
    board_review_date DATE,
    board_decision VARCHAR(50),
    board_decision_notes TEXT,

    -- Notifications
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_sent_date TIMESTAMP,

    -- Documents
    approval_document_url TEXT,

    -- Notes
    notes TEXT,

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
CREATE INDEX IF NOT EXISTS idx_stage_boundary_approvals_project_id ON stage_boundary_approvals(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_boundary_approvals_stage_id ON stage_boundary_approvals(stage_boundary_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_boundary_approvals_type ON stage_boundary_approvals(approval_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_boundary_approvals_status ON stage_boundary_approvals(workflow_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_boundary_approvals_submitted_by ON stage_boundary_approvals(submitted_by) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_boundary_approvals_reviewer ON stage_boundary_approvals(reviewer_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stage_boundary_approvals_approver ON stage_boundary_approvals(approver_user_id) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_stage_boundary_approvals_updated_at ON stage_boundary_approvals;
CREATE TRIGGER trg_stage_boundary_approvals_updated_at
    BEFORE UPDATE ON stage_boundary_approvals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- Register Tables in database_tables Registry
-- ================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('end_stage_reports', 'End Stage Reports for stage completion and performance review', false, true),
  ('exception_plans', 'Exception plans for managing tolerance breaches and recovery', false, true),
  ('next_stage_plans', 'Plans for upcoming project stages with objectives and resources', false, true),
  ('stage_boundary_approvals', 'Approval workflow tracking for stage transitions and gates', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ================================================
-- End of v29_stage_boundaries_enhanced.sql
-- ================================================
