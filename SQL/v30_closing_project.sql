-- ================================================
-- File: v30_closing_project.sql
-- Description: Structured PM Closing a Project (CP) module tables
-- Version: 1.0
-- Date: 2025-01-17
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v29 must be run first (all core tables must exist)
-- - projects table must exist
-- - users table must exist
-- - project_boards table must exist (from v28)

-- Purpose:
-- Creates tables for Structured PM Closing a Project module:
-- 1. project_closures - Main project closure records
-- 2. end_project_reports - End Project Reports
-- 3. lessons_learned - Lessons learned database
-- 4. follow_on_actions - Post-project follow-on actions
-- 5. project_handover - Handover documentation and tracking
-- 6. closure_approvals - Project closure approval workflow

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- TABLE 1: project_closures
-- Description: Main project closure records
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS project_closures (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    board_id UUID REFERENCES project_boards(id) ON DELETE SET NULL,

    -- Closure Information
    closure_reference VARCHAR(100),
    closure_type VARCHAR(50) NOT NULL, -- 'normal-completion', 'early-termination', 'premature-closure', 'cancelled'
    closure_reason TEXT,

    -- Dates
    closure_initiated_date DATE NOT NULL,
    planned_closure_date DATE,
    actual_closure_date DATE,
    formal_closure_date DATE, -- Board approval date

    -- Closure Status
    closure_status VARCHAR(50) DEFAULT 'initiated', -- 'initiated', 'in-progress', 'pending-approval', 'approved', 'completed'
    closure_phase VARCHAR(100), -- 'preparation', 'execution', 'handover', 'review', 'sign-off', 'complete'

    -- Project Performance Summary
    project_objectives_met BOOLEAN,
    project_success_rating INTEGER, -- 1-5 scale
    overall_performance_summary TEXT,

    -- Benefits Realization
    benefits_realized BOOLEAN,
    benefits_realization_summary TEXT,
    benefits_measurement_plan_url TEXT,

    -- Final Deliverables
    deliverables_completed INTEGER,
    deliverables_total INTEGER,
    deliverables_acceptance_status VARCHAR(50), -- 'all-accepted', 'partially-accepted', 'pending'
    outstanding_deliverables TEXT,

    -- Financial Closure
    final_budget DECIMAL(15,2),
    final_actual_cost DECIMAL(15,2),
    final_cost_variance DECIMAL(15,2),
    financial_accounts_closed BOOLEAN DEFAULT FALSE,
    financial_closure_date DATE,

    -- Resource Release
    resources_released BOOLEAN DEFAULT FALSE,
    resources_release_date DATE,
    outstanding_resource_commitments TEXT,

    -- Documentation
    all_documentation_archived BOOLEAN DEFAULT FALSE,
    documentation_archive_location TEXT,
    documentation_retention_period VARCHAR(100),

    -- Closure Checklist
    closure_checklist_completed BOOLEAN DEFAULT FALSE,
    checklist_completion_percentage DECIMAL(5,2),

    -- Approvals
    prepared_by UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    board_approval_date DATE,

    -- Documents
    closure_document_url TEXT,
    supporting_documents_urls TEXT[],

    -- Notes
    notes TEXT,
    special_considerations TEXT,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT project_closures_unique_project UNIQUE (project_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_closures_project_id ON project_closures(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_closures_board_id ON project_closures(board_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_closures_status ON project_closures(closure_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_closures_type ON project_closures(closure_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_closures_reference ON project_closures(closure_reference) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_project_closures_updated_at ON project_closures;
CREATE TRIGGER trg_project_closures_updated_at
    BEFORE UPDATE ON project_closures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 2: end_project_reports
-- Description: End Project Reports (comprehensive final report)
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS end_project_reports (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    project_closure_id UUID REFERENCES project_closures(id) ON DELETE CASCADE,

    -- Report Information
    report_reference VARCHAR(100),
    report_title VARCHAR(200) NOT NULL,
    report_date DATE NOT NULL,
    reporting_period_start DATE,
    reporting_period_end DATE,

    -- Executive Summary
    executive_summary TEXT,
    project_overview TEXT,

    -- Objectives & Success Criteria
    original_objectives TEXT,
    objectives_achieved TEXT,
    success_criteria_met TEXT,
    overall_success_rating INTEGER, -- 1-5 scale

    -- Deliverables Summary
    planned_deliverables TEXT,
    delivered_products TEXT,
    acceptance_status_summary TEXT,
    quality_assessment TEXT,

    -- Performance - Schedule
    original_start_date DATE,
    actual_start_date DATE,
    original_end_date DATE,
    actual_end_date DATE,
    schedule_variance_days INTEGER,
    schedule_variance_percentage DECIMAL(5,2),
    schedule_performance_summary TEXT,

    -- Performance - Cost
    original_budget DECIMAL(15,2),
    approved_budget DECIMAL(15,2),
    actual_cost DECIMAL(15,2),
    cost_variance DECIMAL(15,2),
    cost_variance_percentage DECIMAL(5,2),
    cost_performance_summary TEXT,

    -- Performance - Scope
    scope_changes_count INTEGER DEFAULT 0,
    scope_variance_summary TEXT,

    -- Performance - Quality
    quality_targets_met INTEGER,
    quality_targets_total INTEGER,
    quality_performance_percentage DECIMAL(5,2),
    quality_performance_summary TEXT,

    -- Benefits Realization
    expected_benefits TEXT,
    realized_benefits TEXT,
    benefits_realization_assessment TEXT,
    benefits_realization_timeline TEXT,

    -- Risk Management Summary
    risks_identified INTEGER DEFAULT 0,
    risks_materialized INTEGER DEFAULT 0,
    risk_management_effectiveness TEXT,

    -- Issue Management Summary
    issues_raised INTEGER DEFAULT 0,
    issues_resolved INTEGER DEFAULT 0,
    issue_management_effectiveness TEXT,

    -- Change Management Summary
    change_requests_received INTEGER DEFAULT 0,
    change_requests_approved INTEGER DEFAULT 0,
    change_management_summary TEXT,

    -- Stakeholder Management
    stakeholder_satisfaction_rating DECIMAL(3,1), -- 1.0-5.0
    stakeholder_feedback_summary TEXT,

    -- Team Performance
    team_performance_summary TEXT,
    resource_utilization_summary TEXT,
    team_satisfaction_rating DECIMAL(3,1), -- 1.0-5.0

    -- Lessons Learned Summary
    key_lessons_learned TEXT,
    what_went_well TEXT,
    what_could_improve TEXT,
    recommendations_for_future TEXT,

    -- Follow-on Actions
    recommended_follow_on_actions TEXT,
    transition_to_operations TEXT,

    -- Approvals
    prepared_by UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approval_date DATE,
    approval_status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'submitted', 'under-review', 'approved', 'rejected'

    -- Documents
    report_document_url TEXT,
    supporting_documents_urls TEXT[],
    appendices_urls TEXT[],

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
CREATE INDEX IF NOT EXISTS idx_end_project_reports_project_id ON end_project_reports(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_end_project_reports_closure_id ON end_project_reports(project_closure_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_end_project_reports_date ON end_project_reports(report_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_end_project_reports_status ON end_project_reports(approval_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_end_project_reports_reference ON end_project_reports(report_reference) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_end_project_reports_updated_at ON end_project_reports;
CREATE TRIGGER trg_end_project_reports_updated_at
    BEFORE UPDATE ON end_project_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 3: lessons_learned
-- Description: Lessons learned database (organizational knowledge)
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS lessons_learned (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    project_closure_id UUID REFERENCES project_closures(id) ON DELETE SET NULL,

    -- Lesson Information
    lesson_reference VARCHAR(100),
    lesson_title VARCHAR(200) NOT NULL,
    lesson_date DATE NOT NULL,

    -- Categorization
    lesson_category VARCHAR(100), -- 'process', 'people', 'technology', 'planning', 'execution', 'risk', 'quality', 'stakeholder', 'other'
    lesson_type VARCHAR(50), -- 'success', 'challenge', 'improvement-opportunity', 'best-practice'
    project_phase VARCHAR(100), -- Which phase/stage the lesson relates to
    methodology VARCHAR(50), -- 'structured', 'scrum', 'kanban', 'agile', 'hybrid'

    -- Context
    situation_description TEXT NOT NULL,
    context TEXT,
    project_type VARCHAR(100),
    project_size VARCHAR(50), -- 'small', 'medium', 'large'

    -- Lesson Details
    what_happened TEXT NOT NULL,
    why_it_happened TEXT,
    impact_description TEXT,
    impact_level VARCHAR(50), -- 'low', 'medium', 'high', 'critical'

    -- Learning
    lesson_learned TEXT NOT NULL,
    what_worked_well TEXT,
    what_could_improve TEXT,
    root_cause_analysis TEXT,

    -- Recommendations
    recommendations TEXT NOT NULL,
    recommended_actions TEXT[],
    preventive_measures TEXT,
    best_practices TEXT,

    -- Applicability
    applicability_scope VARCHAR(100), -- 'project-specific', 'department', 'organization-wide', 'industry'
    applicable_to_methodologies TEXT[], -- Which methodologies this applies to
    applicable_to_project_types TEXT[],

    -- Evidence
    supporting_evidence TEXT,
    metrics_data TEXT,
    references_urls TEXT[],

    -- Knowledge Sharing
    shared_with_organization BOOLEAN DEFAULT FALSE,
    sharing_date DATE,
    shared_in_channels TEXT[], -- 'knowledge-base', 'newsletter', 'training', 'meetings'

    -- Follow-up
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_action TEXT,
    follow_up_owner_user_id UUID REFERENCES users(id),
    follow_up_due_date DATE,
    follow_up_status VARCHAR(50), -- 'pending', 'in-progress', 'completed'

    -- Validation
    validated BOOLEAN DEFAULT FALSE,
    validated_by UUID REFERENCES users(id),
    validation_date DATE,
    validation_notes TEXT,

    -- Contribution
    contributed_by UUID REFERENCES users(id),
    contribution_date DATE,

    -- Usage Tracking
    times_referenced INTEGER DEFAULT 0,
    last_referenced_date DATE,
    helpful_count INTEGER DEFAULT 0,

    -- Documents
    attachment_urls TEXT[],

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
CREATE INDEX IF NOT EXISTS idx_lessons_learned_project_id ON lessons_learned(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_lessons_learned_closure_id ON lessons_learned(project_closure_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_lessons_learned_category ON lessons_learned(lesson_category) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_lessons_learned_type ON lessons_learned(lesson_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_lessons_learned_methodology ON lessons_learned(methodology) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_lessons_learned_date ON lessons_learned(lesson_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_lessons_learned_validated ON lessons_learned(validated) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_lessons_learned_reference ON lessons_learned(lesson_reference) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_lessons_learned_updated_at ON lessons_learned;
CREATE TRIGGER trg_lessons_learned_updated_at
    BEFORE UPDATE ON lessons_learned
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 4: follow_on_actions
-- Description: Post-project follow-on actions and recommendations
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS follow_on_actions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    project_closure_id UUID REFERENCES project_closures(id) ON DELETE CASCADE,

    -- Action Information
    action_reference VARCHAR(100),
    action_title VARCHAR(200) NOT NULL,
    action_description TEXT NOT NULL,
    action_category VARCHAR(100), -- 'benefits-realization', 'support', 'maintenance', 'enhancement', 'documentation', 'training', 'other'

    -- Action Details
    action_rationale TEXT,
    expected_outcome TEXT,
    success_criteria TEXT,

    -- Assignment
    assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_team VARCHAR(200), -- Team or department name
    assigned_to_role VARCHAR(100),

    -- Timeline
    recommended_start_date DATE,
    recommended_completion_date DATE,
    actual_start_date DATE,
    actual_completion_date DATE,

    -- Priority
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    criticality VARCHAR(50), -- 'nice-to-have', 'important', 'critical'

    -- Resources
    estimated_effort_hours DECIMAL(10,2),
    estimated_cost DECIMAL(12,2),
    required_resources TEXT,

    -- Status
    status VARCHAR(50) DEFAULT 'recommended', -- 'recommended', 'approved', 'in-progress', 'on-hold', 'completed', 'cancelled'
    status_notes TEXT,

    -- Tracking
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    last_update_date DATE,
    last_update_notes TEXT,

    -- Transition to BAU
    transition_to_operations BOOLEAN DEFAULT FALSE,
    operational_owner_user_id UUID REFERENCES users(id),
    handover_date DATE,
    handover_notes TEXT,

    -- Approvals
    approval_required BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id),
    approval_date DATE,

    -- Dependencies
    depends_on_action_ids UUID[],
    blocking_action_ids UUID[],

    -- Documents
    action_document_url TEXT,
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
CREATE INDEX IF NOT EXISTS idx_follow_on_actions_project_id ON follow_on_actions(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_follow_on_actions_closure_id ON follow_on_actions(project_closure_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_follow_on_actions_assigned_to ON follow_on_actions(assigned_to_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_follow_on_actions_status ON follow_on_actions(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_follow_on_actions_priority ON follow_on_actions(priority) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_follow_on_actions_category ON follow_on_actions(action_category) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_follow_on_actions_reference ON follow_on_actions(action_reference) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_follow_on_actions_updated_at ON follow_on_actions;
CREATE TRIGGER trg_follow_on_actions_updated_at
    BEFORE UPDATE ON follow_on_actions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 5: project_handover
-- Description: Project handover to operations/support
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS project_handover (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    project_closure_id UUID REFERENCES project_closures(id) ON DELETE CASCADE,

    -- Handover Information
    handover_reference VARCHAR(100),
    handover_title VARCHAR(200) NOT NULL,
    handover_date DATE NOT NULL,

    -- Handover Type
    handover_type VARCHAR(100), -- 'operations', 'support', 'maintenance', 'business-unit', 'customer'
    handover_to_organization VARCHAR(200),
    handover_to_department VARCHAR(200),

    -- Parties
    handed_over_by UUID REFERENCES users(id),
    handed_over_to_user_id UUID REFERENCES users(id),
    receiving_team TEXT,

    -- Deliverables Handover
    deliverables_list TEXT[],
    deliverables_accepted BOOLEAN DEFAULT FALSE,
    deliverables_acceptance_date DATE,
    acceptance_criteria_met BOOLEAN,

    -- Documentation Handover
    documentation_provided TEXT[],
    documentation_location TEXT,
    documentation_format VARCHAR(100),
    documentation_complete BOOLEAN DEFAULT FALSE,

    -- Knowledge Transfer
    knowledge_transfer_sessions_count INTEGER DEFAULT 0,
    training_provided BOOLEAN DEFAULT FALSE,
    training_completion_date DATE,
    training_materials_urls TEXT[],

    -- Support Arrangements
    support_period_days INTEGER,
    support_period_start_date DATE,
    support_period_end_date DATE,
    support_contact_user_id UUID REFERENCES users(id),
    support_level VARCHAR(100), -- 'full-support', 'limited-support', 'consultation-only', 'none'

    -- Ongoing Responsibilities
    ongoing_responsibilities TEXT,
    maintenance_requirements TEXT,
    escalation_procedures TEXT,

    -- Assets & Resources
    assets_transferred TEXT[],
    resource_commitments TEXT,
    outstanding_dependencies TEXT,

    -- Financial
    ongoing_costs DECIMAL(12,2),
    budget_for_ongoing_support DECIMAL(12,2),
    cost_recovery_mechanism TEXT,

    -- Quality Assurance
    quality_checks_performed BOOLEAN DEFAULT FALSE,
    quality_check_results TEXT,
    defects_outstanding TEXT,

    -- Sign-off
    handover_checklist_completed BOOLEAN DEFAULT FALSE,
    signed_off_by_project BOOLEAN DEFAULT FALSE,
    project_signoff_date DATE,
    project_signoff_by UUID REFERENCES users(id),
    signed_off_by_receiver BOOLEAN DEFAULT FALSE,
    receiver_signoff_date DATE,
    receiver_signoff_by UUID REFERENCES users(id),

    -- Status
    handover_status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'in-progress', 'completed', 'on-hold'

    -- Documents
    handover_document_url TEXT,
    handover_checklist_url TEXT,
    supporting_documents_urls TEXT[],

    -- Notes
    notes TEXT,
    special_instructions TEXT,

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
CREATE INDEX IF NOT EXISTS idx_project_handover_project_id ON project_handover(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_handover_closure_id ON project_handover(project_closure_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_handover_date ON project_handover(handover_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_handover_type ON project_handover(handover_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_handover_status ON project_handover(handover_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_handover_reference ON project_handover(handover_reference) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_project_handover_updated_at ON project_handover;
CREATE TRIGGER trg_project_handover_updated_at
    BEFORE UPDATE ON project_handover
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 6: closure_approvals
-- Description: Project closure approval workflow
-- Category: structured
-- ================================================

CREATE TABLE IF NOT EXISTS closure_approvals (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    project_closure_id UUID NOT NULL REFERENCES project_closures(id) ON DELETE CASCADE,
    end_project_report_id UUID REFERENCES end_project_reports(id) ON DELETE SET NULL,

    -- Approval Information
    approval_reference VARCHAR(100),
    approval_type VARCHAR(100) NOT NULL, -- 'closure-initiation', 'end-project-report', 'handover', 'final-closure'

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

    -- Board Approval
    requires_board_approval BOOLEAN DEFAULT TRUE,
    board_meeting_id UUID REFERENCES board_meetings(id) ON DELETE SET NULL,
    board_approval_date DATE,
    board_decision VARCHAR(50),
    board_decision_notes TEXT,

    -- Checklist
    pre_approval_checklist_completed BOOLEAN DEFAULT FALSE,
    checklist_items_completed INTEGER DEFAULT 0,
    checklist_items_total INTEGER DEFAULT 0,

    -- Notifications
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_sent_date TIMESTAMP,

    -- Documents
    approval_document_url TEXT,
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
CREATE INDEX IF NOT EXISTS idx_closure_approvals_project_id ON closure_approvals(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_closure_approvals_closure_id ON closure_approvals(project_closure_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_closure_approvals_type ON closure_approvals(approval_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_closure_approvals_status ON closure_approvals(workflow_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_closure_approvals_submitted_by ON closure_approvals(submitted_by) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_closure_approvals_reviewer ON closure_approvals(reviewer_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_closure_approvals_approver ON closure_approvals(approver_user_id) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_closure_approvals_updated_at ON closure_approvals;
CREATE TRIGGER trg_closure_approvals_updated_at
    BEFORE UPDATE ON closure_approvals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- Register Tables in database_tables Registry
-- ================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('project_closures', 'Main project closure records and tracking', false, true),
  ('end_project_reports', 'Comprehensive end project reports with performance analysis', false, true),
  ('lessons_learned', 'Organizational lessons learned database for knowledge management', false, true),
  ('follow_on_actions', 'Post-project follow-on actions and recommendations', false, true),
  ('project_handover', 'Project handover to operations and support teams', false, true),
  ('closure_approvals', 'Project closure approval workflow and tracking', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ================================================
-- End of v30_closing_project.sql
-- ================================================
