-- ================================================
-- File: v31_change_management.sql
-- Description: Change Management module tables
-- Version: 1.1 (Added cleanup statements for idempotency)
-- Date: 2025-01-17
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v30 must be run first (all core tables must exist)
-- - projects table must exist
-- - users table must exist
-- - tasks table must exist (optional)

-- Purpose:
-- Creates tables for Change Management module:
-- 1. change_requests - Change request submissions
-- 2. change_assessments - Impact assessment for change requests
-- 3. change_approvals - Approval workflow for changes
-- 4. change_board - Change Board/Change Authority configuration
-- 5. change_board_members - Change Board membership
-- 6. change_impacts - Detailed impact analysis records

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- CLEANUP: Drop existing tables if they exist (in reverse dependency order)
-- ================================================

DROP TABLE IF EXISTS change_log CASCADE;
DROP TABLE IF EXISTS change_implementations CASCADE;
DROP TABLE IF EXISTS change_approvals CASCADE;
DROP TABLE IF EXISTS change_assessments CASCADE;
DROP TABLE IF EXISTS change_requests CASCADE;
DROP TABLE IF EXISTS change_board_members CASCADE;
DROP TABLE IF EXISTS change_board CASCADE;

-- Drop views
DROP VIEW IF EXISTS change_request_summary CASCADE;

-- ================================================
-- TABLE 1: change_board
-- Description: Change Board/Change Authority configuration
-- Category: governance
-- ================================================

CREATE TABLE IF NOT EXISTS change_board (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID, -- For organization-level change boards

    -- Board Information
    board_name VARCHAR(200) NOT NULL,
    board_description TEXT,
    board_level VARCHAR(50) DEFAULT 'project', -- 'project', 'portfolio', 'organization'

    -- Configuration
    meeting_frequency VARCHAR(50), -- 'weekly', 'bi-weekly', 'as-needed'
    quorum_required INTEGER DEFAULT 3,
    approval_threshold_percentage DECIMAL(5,2) DEFAULT 50.00,

    -- Thresholds for automatic routing
    cost_threshold_low DECIMAL(15,2), -- Below this = auto-approve
    cost_threshold_high DECIMAL(15,2), -- Above this = escalate
    schedule_threshold_days INTEGER, -- Schedule impact threshold

    -- Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive'
    established_date DATE NOT NULL,

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
CREATE INDEX IF NOT EXISTS idx_change_board_project_id ON change_board(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_change_board_level ON change_board(board_level) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_change_board_status ON change_board(status) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_change_board_updated_at ON change_board;
CREATE TRIGGER trg_change_board_updated_at
    BEFORE UPDATE ON change_board
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 2: change_board_members
-- Description: Change Board membership
-- Category: governance
-- ================================================

CREATE TABLE IF NOT EXISTS change_board_members (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    board_id UUID NOT NULL REFERENCES change_board(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Member Role
    member_role VARCHAR(100), -- 'Chair', 'Member', 'Secretary', 'Technical Advisor'
    authority_level VARCHAR(50) DEFAULT 'member', -- 'chair', 'decision-maker', 'advisor', 'observer'

    -- Permissions
    can_approve_changes BOOLEAN DEFAULT TRUE,
    approval_limit_amount DECIMAL(15,2), -- Max value they can approve alone

    -- Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive'
    appointment_date DATE NOT NULL,
    removal_date DATE,

    -- Notes
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT change_board_members_unique UNIQUE (board_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_change_board_members_board_id ON change_board_members(board_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_change_board_members_user_id ON change_board_members(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_change_board_members_status ON change_board_members(status) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_change_board_members_updated_at ON change_board_members;
CREATE TRIGGER trg_change_board_members_updated_at
    BEFORE UPDATE ON change_board_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 3: change_requests
-- Description: Change request submissions
-- Category: governance
-- ================================================

CREATE TABLE IF NOT EXISTS change_requests (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    change_board_id UUID REFERENCES change_board(id) ON DELETE SET NULL,

    -- Request Information
    change_reference VARCHAR(100) UNIQUE,
    change_title VARCHAR(200) NOT NULL,
    change_description TEXT NOT NULL,
    change_category VARCHAR(100), -- 'scope', 'schedule', 'budget', 'quality', 'resource', 'risk', 'technical', 'other'
    change_type VARCHAR(50), -- 'corrective', 'preventive', 'enhancement', 'defect-fix', 'regulatory'

    -- Submitter
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    submission_date DATE NOT NULL,
    requestor_name VARCHAR(200), -- If not a system user
    requestor_organization VARCHAR(200),

    -- Change Details
    reason_for_change TEXT NOT NULL,
    current_situation TEXT,
    proposed_solution TEXT NOT NULL,
    alternative_solutions TEXT,

    -- Priority
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent', 'critical'
    urgency VARCHAR(50), -- 'immediate', 'high', 'medium', 'low'
    business_criticality VARCHAR(50), -- 'critical', 'high', 'medium', 'low'

    -- Status
    status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'under-assessment', 'pending-approval', 'approved', 'rejected', 'deferred', 'implemented', 'cancelled'
    status_reason TEXT,

    -- Workflow
    current_approver_user_id UUID REFERENCES users(id),
    approval_required_by_date DATE,

    -- Linked Items
    related_task_ids UUID[],
    related_risk_ids UUID[],
    related_issue_ids UUID[],
    related_change_ids UUID[], -- Related/dependent change requests

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
CREATE INDEX IF NOT EXISTS idx_change_requests_project_id ON change_requests(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_change_requests_board_id ON change_requests(change_board_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_change_requests_priority ON change_requests(priority) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_change_requests_category ON change_requests(change_category) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_change_requests_reference ON change_requests(change_reference) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_change_requests_submitted_by ON change_requests(submitted_by) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_change_requests_submission_date ON change_requests(submission_date) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_change_requests_updated_at ON change_requests;
CREATE TRIGGER trg_change_requests_updated_at
    BEFORE UPDATE ON change_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 4: change_assessments
-- Description: Impact assessment for change requests
-- Category: governance
-- ================================================

CREATE TABLE IF NOT EXISTS change_assessments (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    change_request_id UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Assessment Information
    assessment_reference VARCHAR(100),
    assessment_date DATE NOT NULL,
    assessed_by UUID REFERENCES users(id),

    -- Impact Analysis
    impact_summary TEXT,
    impact_level VARCHAR(50) DEFAULT 'medium', -- 'negligible', 'low', 'medium', 'high', 'critical'

    -- Schedule Impact
    schedule_impact_description TEXT,
    schedule_impact_days INTEGER DEFAULT 0,
    schedule_impact_level VARCHAR(50), -- 'none', 'low', 'medium', 'high', 'critical'
    affected_milestones TEXT[],
    new_completion_date DATE,

    -- Cost Impact
    cost_impact_description TEXT,
    cost_impact_amount DECIMAL(15,2) DEFAULT 0,
    cost_impact_level VARCHAR(50), -- 'none', 'low', 'medium', 'high', 'critical'
    cost_breakdown TEXT,
    funding_source VARCHAR(200),

    -- Scope Impact
    scope_impact_description TEXT,
    scope_impact_level VARCHAR(50), -- 'none', 'low', 'medium', 'high', 'critical'
    scope_baseline_affected BOOLEAN DEFAULT FALSE,
    new_deliverables TEXT[],
    removed_deliverables TEXT[],

    -- Quality Impact
    quality_impact_description TEXT,
    quality_impact_level VARCHAR(50), -- 'none', 'low', 'medium', 'high', 'critical'
    quality_criteria_affected TEXT[],

    -- Resource Impact
    resource_impact_description TEXT,
    resource_impact_level VARCHAR(50), -- 'none', 'low', 'medium', 'high', 'critical'
    additional_resources_required TEXT,
    resource_hours_required DECIMAL(10,2),

    -- Risk Impact
    risk_impact_description TEXT,
    new_risks_introduced TEXT[],
    existing_risks_affected TEXT[],
    risk_mitigation_required BOOLEAN DEFAULT FALSE,

    -- Benefits Impact
    benefits_impact_description TEXT,
    benefits_impact_level VARCHAR(50), -- 'positive', 'neutral', 'negative'
    benefits_affected TEXT,

    -- Stakeholder Impact
    stakeholder_impact_description TEXT,
    affected_stakeholders TEXT[],
    stakeholder_communication_required BOOLEAN DEFAULT FALSE,

    -- Technical Impact
    technical_impact_description TEXT,
    technical_complexity VARCHAR(50), -- 'low', 'medium', 'high', 'very-high'
    technical_risks TEXT,
    dependencies_affected TEXT[],

    -- Feasibility
    feasibility_assessment TEXT,
    feasibility_rating VARCHAR(50), -- 'feasible', 'challenging', 'difficult', 'not-feasible'
    constraints TEXT,

    -- Recommendation
    recommendation VARCHAR(50), -- 'approve', 'approve-with-conditions', 'reject', 'defer', 'request-more-info'
    recommendation_rationale TEXT,
    conditions TEXT,

    -- Implementation Effort
    estimated_effort_hours DECIMAL(10,2),
    estimated_duration_days INTEGER,
    implementation_complexity VARCHAR(50), -- 'low', 'medium', 'high', 'very-high'

    -- Documents
    assessment_document_url TEXT,
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
CREATE INDEX IF NOT EXISTS idx_change_assessments_change_request_id ON change_assessments(change_request_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_change_assessments_project_id ON change_assessments(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_change_assessments_assessed_by ON change_assessments(assessed_by) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_change_assessments_impact_level ON change_assessments(impact_level) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_change_assessments_recommendation ON change_assessments(recommendation) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_change_assessments_updated_at ON change_assessments;
CREATE TRIGGER trg_change_assessments_updated_at
    BEFORE UPDATE ON change_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 5: change_approvals
-- Description: Approval workflow for changes
-- Category: governance
-- ================================================

CREATE TABLE IF NOT EXISTS change_approvals (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    change_request_id UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
    change_assessment_id UUID REFERENCES change_assessments(id) ON DELETE SET NULL,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Approval Information
    approval_reference VARCHAR(100),
    approval_level VARCHAR(50), -- 'project-manager', 'change-board', 'project-board', 'sponsor'
    approval_type VARCHAR(50), -- 'technical', 'financial', 'business', 'final'

    -- Approver
    approver_user_id UUID REFERENCES users(id),
    approver_role VARCHAR(100),
    delegated_from_user_id UUID REFERENCES users(id),

    -- Request
    requested_date DATE NOT NULL,
    due_date DATE,

    -- Decision
    decision VARCHAR(50), -- 'pending', 'approved', 'approved-with-conditions', 'rejected', 'deferred', 'escalated'
    decision_date DATE,
    decision_rationale TEXT,
    conditions TEXT,

    -- Escalation
    escalated BOOLEAN DEFAULT FALSE,
    escalated_to_user_id UUID REFERENCES users(id),
    escalation_reason TEXT,

    -- Voting (for board approvals)
    requires_voting BOOLEAN DEFAULT FALSE,
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    votes_abstain INTEGER DEFAULT 0,

    -- Delegation
    can_be_delegated BOOLEAN DEFAULT TRUE,

    -- Notifications
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_sent_date TIMESTAMP,
    reminder_sent_count INTEGER DEFAULT 0,

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
CREATE INDEX IF NOT EXISTS idx_change_approvals_change_request_id ON change_approvals(change_request_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_change_approvals_project_id ON change_approvals(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_change_approvals_approver ON change_approvals(approver_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_change_approvals_decision ON change_approvals(decision) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_change_approvals_level ON change_approvals(approval_level) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_change_approvals_updated_at ON change_approvals;
CREATE TRIGGER trg_change_approvals_updated_at
    BEFORE UPDATE ON change_approvals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 6: change_implementations
-- Description: Implementation tracking for approved changes
-- Category: governance
-- ================================================

CREATE TABLE IF NOT EXISTS change_implementations (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    change_request_id UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Implementation Information
    implementation_reference VARCHAR(100),
    implementation_plan TEXT,

    -- Schedule
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,

    -- Resources
    implementation_owner_user_id UUID REFERENCES users(id),
    team_members UUID[],

    -- Status
    status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'in-progress', 'completed', 'on-hold', 'cancelled'
    progress_percentage DECIMAL(5,2) DEFAULT 0,

    -- Verification
    verification_required BOOLEAN DEFAULT TRUE,
    verification_criteria TEXT,
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    verification_date DATE,
    verification_notes TEXT,

    -- Rollback Plan
    rollback_plan TEXT,
    rollback_required BOOLEAN DEFAULT FALSE,
    rollback_executed BOOLEAN DEFAULT FALSE,
    rollback_date DATE,
    rollback_notes TEXT,

    -- Lessons Learned
    lessons_learned TEXT,
    challenges_encountered TEXT,
    success_factors TEXT,

    -- Documents
    implementation_document_url TEXT,
    test_results_urls TEXT[],

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
CREATE INDEX IF NOT EXISTS idx_change_implementations_change_request_id ON change_implementations(change_request_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_change_implementations_project_id ON change_implementations(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_change_implementations_owner ON change_implementations(implementation_owner_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_change_implementations_status ON change_implementations(status) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_change_implementations_updated_at ON change_implementations;
CREATE TRIGGER trg_change_implementations_updated_at
    BEFORE UPDATE ON change_implementations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 7: change_log
-- Description: Complete audit trail of all change activities
-- Category: governance
-- ================================================

CREATE TABLE IF NOT EXISTS change_log (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    change_request_id UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Log Entry
    log_date TIMESTAMP DEFAULT NOW(),
    log_type VARCHAR(50), -- 'status-change', 'comment', 'assessment', 'approval', 'implementation', 'other'
    action VARCHAR(100) NOT NULL, -- 'submitted', 'assessed', 'approved', 'rejected', 'implemented', etc.

    -- Actor
    performed_by UUID REFERENCES users(id),
    performed_by_role VARCHAR(100),

    -- Details
    old_value TEXT,
    new_value TEXT,
    description TEXT,
    comments TEXT,

    -- System Info
    ip_address VARCHAR(50),
    user_agent TEXT,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_change_log_change_request_id ON change_log(change_request_id);
CREATE INDEX IF NOT EXISTS idx_change_log_project_id ON change_log(project_id);
CREATE INDEX IF NOT EXISTS idx_change_log_date ON change_log(log_date);
CREATE INDEX IF NOT EXISTS idx_change_log_type ON change_log(log_type);
CREATE INDEX IF NOT EXISTS idx_change_log_performed_by ON change_log(performed_by);

-- ================================================
-- VIEW: change_request_summary
-- Description: Summary view of change requests with assessment and approval info
-- ================================================

CREATE OR REPLACE VIEW change_request_summary AS
SELECT
    cr.id,
    cr.change_reference,
    cr.change_title,
    cr.change_category,
    cr.priority,
    cr.status,
    cr.submission_date,
    cr.project_id,
    p.project_name,
    u.email as submitted_by_email,
    ca.impact_level,
    ca.cost_impact_amount,
    ca.schedule_impact_days,
    ca.recommendation,
    COUNT(DISTINCT cap.id) as approval_count,
    SUM(CASE WHEN cap.decision = 'approved' THEN 1 ELSE 0 END) as approvals_received,
    ci.status as implementation_status,
    ci.progress_percentage as implementation_progress
FROM change_requests cr
LEFT JOIN projects p ON cr.project_id = p.id
LEFT JOIN users u ON cr.submitted_by = u.id
LEFT JOIN change_assessments ca ON cr.id = ca.change_request_id
LEFT JOIN change_approvals cap ON cr.id = cap.change_request_id
LEFT JOIN change_implementations ci ON cr.id = ci.change_request_id
WHERE cr.is_deleted = FALSE
GROUP BY cr.id, cr.change_reference, cr.change_title, cr.change_category,
         cr.priority, cr.status, cr.submission_date, cr.project_id,
         p.project_name, u.email, ca.impact_level, ca.cost_impact_amount,
         ca.schedule_impact_days, ca.recommendation, ci.status, ci.progress_percentage;

-- ================================================
-- Register Tables in database_tables Registry
-- ================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('change_board', 'Change Board/Change Authority configuration and setup', false, true),
  ('change_board_members', 'Change Board membership and authority levels', false, true),
  ('change_requests', 'Change request submissions and tracking', false, true),
  ('change_assessments', 'Impact assessments for change requests', false, true),
  ('change_approvals', 'Approval workflow and decision tracking for changes', false, true),
  ('change_implementations', 'Implementation tracking for approved changes', false, true),
  ('change_log', 'Complete audit trail of all change management activities', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ================================================
-- End of v31_change_management.sql
-- ================================================
